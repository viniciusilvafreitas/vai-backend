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

# Validate API keys at startup (log presence; do NOT log values)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not found in environment; Gemini won't be available")
if not GROQ_API_KEY:
    logger.warning("GROQ_API_KEY not found in environment; Groq won't be available")

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
        # configure SDK securely
        # genai.configure(api_key=...) is the recommended setup in many releases
        if hasattr(genai, "configure"):
            genai.configure(api_key=gemini_key)
        else:
            # some SDK versions accept setting api_key attribute
            try:
                setattr(genai, "api_key", gemini_key)
            except Exception:
                pass

        # Preferred: use the text generation surface if available
        if hasattr(genai, "generate_text"):
            resp = genai.generate_text(model=model, prompt=msg, max_output_tokens=512)
            if hasattr(resp, "text"):
                return resp.text
            if isinstance(resp, dict):
                return resp.get("text") or _extract_gemini_text(resp) or json.dumps(resp)

        # Chat/completions style
        if hasattr(genai, "chat") and hasattr(genai.chat, "completions"):
            resp = genai.chat.completions.create(model=model, messages=[{"role": "user", "content": msg}])
            if hasattr(resp, "candidates"):
                c = resp.candidates
                if isinstance(c, list) and len(c) > 0 and hasattr(c[0], "content"):
                    parts = getattr(c[0].content, "parts", None)
                    if parts and len(parts) > 0:
                        return getattr(parts[0], "text", str(parts[0]))
            if isinstance(resp, dict):
                return _extract_gemini_text(resp) or json.dumps(resp)

        # Older client style
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
        # Avoid logging sensitive values; log exception class and message only
        logger.exception("Gemini SDK call failed: %s", type(e).__name__)
        raise


def call_gemini_http(msg, gemini_key, model="gemini-1.5-flash"):
    """Fallback HTTP call to Generative Language REST endpoint using Bearer token in headers.
    NOTE: Use the SDK when possible. This endpoint path uses v1beta2 generate* surface which
    is consistent with the Generative Language REST surfaces. We do NOT append ?key=... to URLs.
    """
    # Prefer a stable generate endpoint. Use generateText/generateMessage surfaces where available.
    url = f"https://generativelanguage.googleapis.com/v1beta2/models/{model}:generateMessage"

    # Build a payload compatible with multiple possible REST shapes (try message-style)
    payload = {"message": {"content": msg, "author": "user"}}
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {gemini_key}"}

    try:
        res = requests.post(url, json=payload, headers=headers, timeout=15)
    except Exception as e:
        logger.exception("Gemini HTTP request failed: %s", type(e).__name__)
        raise

    # Do NOT ever append API keys to URL (avoid ?key=...)
    try:
        res.raise_for_status()
    except Exception:
        # Log status without sensitive info
        logger.error("Gemini HTTP error status=%s, body=%s", res.status_code, res.text[:1000])
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


def call_groq(msg, groq_key, model="llama-3.3-70b-versatile"):
    headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
    payload = {"model": model, "messages": [{"role": "user", "content": msg}]}
    try:
        res = requests.post("https://api.groq.com/openai/v1/chat/completions", json=payload, headers=headers, timeout=15)
    except Exception as e:
        logger.exception("Groq HTTP request failed: %s", type(e).__name__)
        raise

    try:
        res.raise_for_status()
    except Exception:
        logger.error("Groq API error status=%s, body=%s", res.status_code, res.text[:1000])
        res.raise_for_status()

    j = res.json()
    try:
        return j.get("choices", [])[0].get("message", {}).get("content", "")
    except Exception:
        return json.dumps(j)


def call_local(msg):
    return f"Cérebro Ativo: '{msg}' registrado com sucesso. (Adicione GEMINI_API_KEY ou GROQ_API_KEY nas variáveis do Render para respostas inteligentes)."


class MultiBrainError(RuntimeError):
    pass


def call_multibrain(msg):
    """Structured resilient brain: try Gemini first, then Groq, then local fallback.
    If both Gemini and Groq fail (when configured), raise MultiBrainError so the route can return 500.
    """
    last_exc = None

    # 1) Try Gemini
    if GEMINI_API_KEY:
        try:
            if GENAI_SDK_AVAILABLE:
                logger.info("Attempting Gemini via SDK")
                return call_gemini_sdk(msg, GEMINI_API_KEY)
            else:
                logger.info("Attempting Gemini via HTTP")
                return call_gemini_http(msg, GEMINI_API_KEY)
        except Exception as e:
            # Log reason safely and continue to Groq
            logger.warning("Gemini failed: %s", type(e).__name__)
            last_exc = e

    # 2) Try Groq
    if GROQ_API_KEY:
        try:
            logger.info("Attempting Groq")
            return call_groq(msg, GROQ_API_KEY)
        except Exception as e:
            logger.warning("Groq failed: %s", type(e).__name__)
            last_exc = e

    # 3) If neither provider returned, if we had keys missing, use local fallback;
    # if both providers were attempted and failed, raise an error to return 500.
    if not GEMINI_API_KEY and not GROQ_API_KEY:
        logger.info("No external providers configured, using local fallback")
        return call_local(msg)

    # If at least one provider was attempted and failed, raise
    raise MultiBrainError(f"All configured brains failed: {type(last_exc).__name__ if last_exc else 'no-provider'}")


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

    if "status" in cmd or "sistema" in cmd:
        reply = "📊 [VAI Cloud Core] Servidor Online 24/7 no Render. Operacional."
        db["projects"][proj].append({"u": msg, "a": reply})
        save_data(db)
        return jsonify({"reply": reply})

    try:
        reply = call_multibrain(msg)
    except MultiBrainError as mbe:
        # Graceful JSON 500 without exposing internal details
        logger.error("Multibrain processing failed: %s", type(mbe).__name__)
        return jsonify({"error": "Serviço temporariamente indisponível. Tente novamente mais tarde."}), 500
    except Exception as e:
        logger.exception("Unexpected error in multibrain: %s", type(e).__name__)
        return jsonify({"error": "Erro interno ao processar a mensagem."}), 500

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
