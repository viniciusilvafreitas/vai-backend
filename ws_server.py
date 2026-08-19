"""WebSocket server (actions-only) for VAI agents.
- Auth via TERMINAL_AGENT_TOKEN (env) required as query param or header.
- Optional AES-256-GCM encryption using SHARED_KEY_BASE64 env var (base64-encoded 32 bytes).
- Maintains mapping of device_id -> websocket and allows sending structured action messages and awaiting responses.
"""
import asyncio
import json
import os
import logging
import uuid
from urllib.parse import urlparse, parse_qs

import websockets
from websockets.server import WebSocketServerProtocol

from security.crypto import encrypt_message, decrypt_message, load_shared_key

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

TERMINAL_AGENT_TOKEN = os.environ.get('TERMINAL_AGENT_TOKEN', '')
SHARED_KEY = load_shared_key()  # bytes or None

# Connected clients: device_id -> websocket protocol
clients = {}
# Pending responses: msg_id -> Future
pending_responses = {}

async def handler(ws: WebSocketServerProtocol, path):
    params = parse_qs(urlparse(path).query)
    token = params.get('token', [None])[0]
    device_id = params.get('device_id', [None])[0]
    if not token:
        token = ws.request_headers.get('Authorization')
        if token and token.lower().startswith('bearer '):
            token = token[7:]

    if TERMINAL_AGENT_TOKEN and token != TERMINAL_AGENT_TOKEN:
        logger.warning('Unauthorized websocket connection attempt')
        await ws.close(code=4001, reason='unauthorized')
        return

    if not device_id:
        device_id = str(uuid.uuid4())

    logger.info('Device connected: %s', device_id)
    clients[device_id] = ws

    try:
        async for message in ws:
            try:
                if SHARED_KEY:
                    # message is base64-encoded encrypted blob
                    try:
                        text = decrypt_message(message, SHARED_KEY)
                    except Exception:
                        # if decryption fails, try raw
                        text = message
                else:
                    text = message

                data = json.loads(text)
            except Exception as e:
                logger.exception('Failed to parse message from %s: %s', device_id, e)
                continue

            mid = data.get('id')
            if mid and mid in pending_responses:
                fut = pending_responses.pop(mid)
                fut.set_result(data)
            else:
                logger.info('Message from %s: %s', device_id, data)
    except websockets.exceptions.ConnectionClosed as e:
        logger.info('Connection closed for %s: %s', device_id, e)
    finally:
        if device_id in clients:
            del clients[device_id]


def start_ws_server(host='0.0.0.0', port=None):
    port = port or int(os.environ.get('WS_PORT', 8765))
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    server = websockets.serve(handler, host, port)
    logger.info('Starting websocket server on %s:%s', host, port)
    loop.run_until_complete(server)
    loop.run_forever()


def send_action_to_device(device_id: str, action_obj: dict, timeout: int = 60):
    """Send a structured action to a connected device and wait for response.
    action_obj must be JSON-serializable and include an 'id' field.
    Returns response dict or raises on timeout / missing device.
    """
    if device_id not in clients:
        raise RuntimeError('device not connected')

    ws = clients[device_id]
    loop = asyncio.get_event_loop()
    coro = _async_send_action(ws, action_obj, timeout)
    try:
        if loop.is_running():
            return asyncio.run_coroutine_threadsafe(coro, loop).result(timeout=timeout + 5)
        else:
            return loop.run_until_complete(coro)
    except Exception:
        raise


async def _async_send_action(ws: WebSocketServerProtocol, action_obj: dict, timeout: int = 60):
    # ensure id exists
    if 'id' not in action_obj:
        action_obj['id'] = str(uuid.uuid4())

    text = json.dumps(action_obj)
    if SHARED_KEY:
        text = encrypt_message(text, SHARED_KEY)

    fut = asyncio.get_event_loop().create_future()
    pending_responses[action_obj['id']] = fut
    await ws.send(text)

    try:
        res = await asyncio.wait_for(fut, timeout=timeout)
        return res
    except asyncio.TimeoutError:
        pending_responses.pop(action_obj['id'], None)
        raise RuntimeError('timeout waiting for device response')
