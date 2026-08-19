#!/usr/bin/env python3
"""
Termux agent (actions-only, human-in-the-loop, biometric MFA).
- Connects to backend WSS and executes only structured actions from ACTION_REGISTRY.
- Uses termux-fingerprint for biometric MFA and termux-dialog confirm for HITL.
- Enforces sandbox: only accesses files under WORKSPACE_DIR.
- Treats external text as passive parameters (no evaluation).
"""
import asyncio
import json
import os
import sys
import uuid
import subprocess
from urllib.parse import urlencode

try:
    import websockets
except Exception:
    print("Please install websockets: pip install websockets")
    raise

# Ensure repo root is importable for security modules if run from agents/
here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, here)

from security.crypto import load_shared_key, encrypt_message, decrypt_message
from security.action_registry import ACTION_REGISTRY, is_action_allowed, sanitize_params, check_sandbox_path

# Env / config
SERVER = os.environ.get('VAI_SERVER', 'ws://localhost:8765')
DEVICE_ID = os.environ.get('DEVICE_ID', '') or str(uuid.uuid4())
TOKEN = os.environ.get('TERMINAL_AGENT_TOKEN', '')
SHARED_KEY = load_shared_key()

INITIAL_DELAY = 1
MAX_DELAY = 60
WORKSPACE_DIR = os.path.expanduser(os.environ.get('VAI_WORKSPACE', '~/vereda_workspace'))

# ---- Utilities: termux dialogs and biometric ----

def termux_confirm_dialog(title: str, message: str, yes_label: str = "Yes", no_label: str = "No") -> bool:
    cmd = [
        "termux-dialog", "confirm",
        "-t", title,
        "-i", message,
        "-p", yes_label,
        "-n", no_label
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if proc.returncode != 0:
            return False
        try:
            outj = json.loads(proc.stdout)
            btn = outj.get("button", "").lower()
            return btn in ("positive", "yes", "ok", "confirm")
        except Exception:
            return False
    except Exception:
        return False


def require_biometric_auth(timeout_seconds: int = 30) -> (bool, str):
    """
    Invoke Termux fingerprint CLI to require biometric authentication.
    Returns (True, 'biometric_verified') on success.
    Returns (False, '<reason>') on failure (cancel, unavailable, timeout, error).
    """
    bin_name = "termux-fingerprint"

    # quick existence check
    try:
        which = subprocess.run(["which", bin_name], capture_output=True, text=True, timeout=3)
        if which.returncode != 0 or not which.stdout.strip():
            return False, "biometric_unavailable"
    except Exception:
        return False, "biometric_unavailable"

    # Call the fingerprint command
    try:
        proc = subprocess.run([bin_name], capture_output=True, text=True, timeout=timeout_seconds)
    except subprocess.TimeoutExpired:
        return False, "biometric_timeout"
    except Exception as e:
        return False, f"biometric_error:{str(e)}"

    # Interpret results:
    if proc.returncode == 0:
        out = (proc.stdout or "").strip()
        if out:
            try:
                j = json.loads(out)
                if isinstance(j, dict):
                    if j.get("status") in ("ok", "success", "verified") or j.get("verified") in (True, "true"):
                        return True, "biometric_verified"
            except Exception:
                return True, "biometric_verified"
        else:
            return True, "biometric_verified"

    stderr = (proc.stderr or "").lower()
    if "cancel" in stderr or "cancelled" in stderr:
        return False, "biometric_cancelled"
    return False, "biometric_failed"


# ---- Networking / agent loop ----
async def run_agent():
    delay = INITIAL_DELAY
    query = urlencode({'token': TOKEN, 'device_id': DEVICE_ID})
    url = f"{SERVER}?{query}"
    while True:
        try:
            async with websockets.connect(url) as ws:
                print('Connected to', url)
                delay = INITIAL_DELAY
                await listen(ws)
        except Exception as e:
            print('Connection error:', e)
            await asyncio.sleep(delay)
            delay = min(delay * 2, MAX_DELAY)


async def listen(ws):
    async for message in ws:
        try:
            if SHARED_KEY:
                try:
                    text = decrypt_message(message, SHARED_KEY)
                except Exception:
                    print("Failed decrypt; skipping message")
                    continue
            else:
                text = message

            data = json.loads(text)
            mid = data.get('id')
            action = data.get('action')
            params = data.get('params', {})

            if not mid or not action:
                await send(ws, {'id': mid or str(uuid.uuid4()), 'status': 'error', 'result': 'invalid_message_format'})
                continue

            if not is_action_allowed(action):
                await send(ws, {'id': mid, 'status': 'rejected', 'result': 'action_not_allowed'})
                continue

            # sanitize params and enforce sandbox
            try:
                params = sanitize_params(action, params)
                check_sandbox_path(params, base_dir=WORKSPACE_DIR)
            except Exception as e:
                await send(ws, {'id': mid, 'status': 'error', 'result': f'param_validation_failed: {str(e)}'})
                continue

            # action metadata
            action_meta = ACTION_REGISTRY.get(action, {})
            requires_auth_flag = bool(action_meta.get('requires_auth', False))
            requires_approval_flag = bool(action_meta.get('requires_approval', False))

            # Biometric auth if required
            if requires_auth_flag:
                ok_bio, bio_info = require_biometric_auth()
                if not ok_bio:
                    await send(ws, {'id': mid, 'status': 'rejected_by_biometric', 'result': bio_info})
                    continue

            # Human-in-the-loop dialog if required
            if requires_approval_flag:
                title = f"VAI solicita: {action}"
                safe_params = {k: (v if isinstance(v, (str, int, bool)) else str(v)) for k, v in params.items()}
                desc = f"Ação: {action}\nParâmetros: {json.dumps(safe_params, ensure_ascii=False)}\nAprovar?"
                ok = termux_confirm_dialog(title, desc)
                if not ok:
                    await send(ws, {'id': mid, 'status': 'rejected_by_user', 'result': 'user_denied'})
                    continue

            # Execute action implementation
            try:
                fn = ACTION_REGISTRY[action]['impl']
                result = fn(params, workspace=WORKSPACE_DIR)
                await send(ws, {'id': mid, 'status': 'approved', 'result': result})
            except Exception as e:
                await send(ws, {'id': mid, 'status': 'error', 'result': f'impl_error: {str(e)}'})
        except Exception as e:
            print('Failed processing message:', e)


async def send(ws, obj):
    text = json.dumps(obj, ensure_ascii=False)
    if SHARED_KEY:
        text = encrypt_message(text, SHARED_KEY)
    await ws.send(text)


if __name__ == '__main__':
    os.makedirs(WORKSPACE_DIR, exist_ok=True)
    asyncio.run(run_agent())
