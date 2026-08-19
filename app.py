from flask import Flask, jsonify, request, render_template
import json
import os
import logging
import requests

app = Flask(__name__, template_folder='templates', static_folder='.')
MEMORY_FILE = os.path.expanduser("vai_memory.json")

# Basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import Google Generative AI SDK (optional). We'll fall back to HTTP if not available.
try:
    import google.generativeai as genai
    GENAI_SDK_AVAILABLE = True
    logger.info("google.generativeai SDK available")
except Exception:
    genai = None
    GENAI_SDK_AVAILABLE = False
    logger.info("google.generativeai SDK not available; will use HTTP fallback for Gemini")


def get_data():
    if os.path.exists(MEMORY_FILE):
        try:
            with open(MEMORY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except Exception as e:
            logger.warning("Could not read memory file: %s", e)
    return {"projects": {"Geral": []}}


def save_data(db):
    try:
        with open(MEMORY_FILE, "w", encoding="utf-8") as f:
            json.dump(db, f, ensure_ascii=False, indent=4)
    except Exception:
        logger.exception("Failed to write memory file")


def _extract_gemini_text(resp_json):
    """Try several fallbacks to extract a text reply from Gemini-like responses."""
    try:
        candidates = resp_json.get("candidates")
        if candidates and isinstance(candidates, list):
            first = candidates[0]
            if isinstance(first, dict):
                content = first.get("content")
                if isinstance(content, dict):
                    parts = content.get("parts")
                    if isinstance(parts, list) and len(parts) > 0 and isinstance(parts[0], dict):
                        txt = parts[0].get("text")
                        if txt:
                            return txt
        output = resp_json.get("output")
        if output and isinstance(output, list) and len(output) > 0:
            o0 = output[0]
            if isinstance(o0, dict):
                if "content" in o0 and isinstance(o0.get("content"), list):
                    cont = o0.get("content")
                    if len(cont) > 0 and isinstance(cont[0], dict):
                        txt = cont[0].get("text") or cont[0].get("content")
                        if txt:
                            return txt
                if "text" in o0 and isinstance(o0.get("text"), str):
                    return o0.get("text")
        if isinstance(resp_json.get("text"), str):
            return resp_json.get("text")
    except Exception:
        pass
    return None


# --- Provider implementations ---

def call_gemini_sdk(msg, gemini_key, model="gemini-1.5-flash"):
    """Call Gemini via google.generativeai SDK. Returns text or raises."""
    if not GENAI_SDK_AVAILABLE:
        raise RuntimeError("Generative AI SDK not available")

    try:
        # configure SDK
        genai.configure(api_key=gemini_key)

        # Try a few SDK interfaces depending on version
        # 1) newer SDKs expose a simple `generate_text` or `text` function
        if hasattr(genai, "generate_text"):
            # Example: resp = genai.generate_text(model=model, prompt=msg, max_output_tokens=512)
            resp = genai.generate_text(model=model, prompt=msg, max_output_tokens=512)
            # resp may have a 'text' attribute or be a dict
            if hasattr(resp, "text"):
                return resp.text
            if isinstance(resp, dict):
                return resp.get("text") or _extract_gemini_text(resp) or json.dumps(resp)

        # 2) chat/completions style
        if hasattr(genai, "chat") and hasattr(genai.chat, "completions"):
            # Example: genai.chat.completions.create(model=..., messages=[...])
            resp = genai.chat.completions.create(model=model, messages=[{"role": "user", "content": msg}])
            # try to extract text
            if hasattr(resp, "candidates"):
                c = resp.candidates
                if isinstance(c, list) and len(c) > 0 and hasattr(c[0], "content"):
                    parts = getattr(c[0].content, "parts", None)
                    if parts and len(parts) > 0:
                        return getattr(parts[0], "text", str(parts[0]))
            if isinstance(resp, dict):
                return _extract_gemini_text(resp) or json.dumps(resp)

        # 3) older or alternate sdk surface
        if hasattr(genai, "Client"):
            client = genai.Client(api_key=gemini_key)
            if hasattr(client, "generate_text"):
                resp = client.generate_text(model=model, prompt=msg)
                if isinstance(resp, dict):
                    return resp.get("text") or _extract_gemini_text(resp) or json.dumps(resp)
                if hasattr(resp, "text"):
                    return resp.text

        raise RuntimeError("Unsupported google.generativeai SDK interface")

    except Exception as e:
        logger.exception("Gemini SDK call failed: %s", e)
        raise


def call_gemini_http(msg, gemini_key, model="gemini-1.5-flash"):
    """Fallback HTTP call to Generative Language REST endpoint using Bearer first, then ?key="""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {"contents": [{"parts": [{"text": msg}]}]}
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {gemini_key}"}

    res = requests.post(url, json=payload, headers=headers, timeout=15)
    if res.status_code == 401:
        # try query param
        res = requests.post(url + f"?key={gemini_key}", json=payload, timeout=15)

    res.raise_for_status()
    try:
        j = res.json()
    except ValueError:
        logger.exception("Gemini HTTP response not JSON")
        return res.text

    text = _extract_gemini_text(j)
    if text:
        return text
    return res.text or json.dumps(j)


def call_groq(msg, groq_key):
    headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
    payload = {"model": "llama3-70b-8192", "messages": [{"role": "user", "content": msg}]}
    res = requests.post("https://api.groq.com/openai/v1/chat/completions", json=payload, headers=headers, timeout=10)
    res.raise_for_status()
    j = res.json()
    try:
        return j.get("choices", [])[0].get("message", {}).get("content", "")
    except Exception:
        return json.dumps(j)


def call_local(msg):
    return f"Cérebro Ativo: '{msg}' registrado com sucesso. (Adicione GEMINI_API_KEY ou GROQ_API_KEY nas variáveis do Render para respostas inteligentes)."


def call_multibrain(msg):
    """Call configured brains in order until one returns a non-empty reply."""
    # Determine configured brains order from env MULTIBRAINS (comma-separated) or default order
    configured = os.environ.get("MULTIBRAINS", "gemini,groq,local")
    brains = [b.strip().lower() for b in configured.split(",") if b.strip()]

    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    groq_key = os.environ.get("GROQ_API_KEY", "")

    last_error = None

    for brain in brains:
        try:
            if brain in ("gemini", "google", "genai") and gemini_key:
                # prefer SDK when available
                if GENAI_SDK_AVAILABLE:
                    try:
                        logger.info("Calling Gemini via SDK")
                        text = call_gemini_sdk(msg, gemini_key)
                    except Exception:
                        logger.info("Gemini SDK failed, falling back to HTTP")
                        text = call_gemini_http(msg, gemini_key)
                else:
                    logger.info("Calling Gemini via HTTP (SDK unavailable)")
                    text = call_gemini_http(msg, gemini_key)

                if text:
                    return text

            elif brain == "groq" and groq_key:
                logger.info("Calling Groq")
                text = call_groq(msg, groq_key)
                if text:
                    return text

            elif brain in ("local", "fallback"):
                return call_local(msg)

            else:
                logger.info("Unknown brain '%s' or missing key; skipping", brain)
        except Exception as e:
            logger.exception("Error calling brain %s: %s", brain, e)
            last_error = e
            continue

    # If none returned, either return last_error message or local fallback
    if last_error:
        logger.warning("All brains failed, returning error message")
        return f"Todas as tentativas falharam: {str(last_error)}"
    return call_local(msg)


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json() or {}
    proj = data.get("project", "Geral")
    msg = data.get("message", "").strip()
    if not msg:
        return jsonify({"reply": "System ready."})

    db = get_data()
    if "projects" not in db:
        db["projects"] = {"Geral": []}
    if proj not in db["projects"]:
        db["projects"][proj] = []

    cmd = msg.lower()
    reply = ""

    if "status" in cmd or "sistema" in cmd:
        reply = "📊 [VAI Cloud Core] Servidor Online 24/7 no Render. Operacional."
    else:
        try:
            reply = call_multibrain(msg)
        except Exception as e:
            logger.exception("Multibrain processing failed: %s", e)
            reply = f"Erro interno ao processar a mensagem: {e}"

    db["projects"][proj].append({"u": msg, "a": reply})
    save_data(db)

    return jsonify({"reply": reply})


@app.route("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    # Render sets the PORT env var; bind to 0.0.0.0 so it's reachable
    app.run(host="0.0.0.0", port=port)
