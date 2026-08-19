from flask import Flask, jsonify, request, render_template
import json
import os
import requests
import logging

app = Flask(__name__, template_folder='templates', static_folder='.')
MEMORY_FILE = os.path.expanduser("vai_memory.json")

# Basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_data():
    if os.path.exists(MEMORY_FILE):
        try:
            with open(MEMORY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict): return data
        except Exception as e:
            logger.warning("Could not read memory file: %s", e)
    return {"projects": {"Geral": []}}

def _extract_gemini_text(resp_json):
    """Try several fallbacks to extract a text reply from Gemini-like responses."""
    try:
        # common structure used previously
        candidates = resp_json.get("candidates")
        if candidates and isinstance(candidates, list):
            first = candidates[0]
            content = first.get("content") if isinstance(first, dict) else None
            if content and isinstance(content, dict):
                parts = content.get("parts")
                if parts and isinstance(parts, list) and len(parts) > 0:
                    text = parts[0].get("text") if isinstance(parts[0], dict) else None
                    if text:
                        return text
        # alternative structures
        output = resp_json.get("output")
        if output and isinstance(output, list) and len(output) > 0:
            o0 = output[0]
            if isinstance(o0, dict):
                if "content" in o0:
                    # content may be a list of parts
                    cont = o0.get("content")
                    if isinstance(cont, list) and len(cont) > 0 and isinstance(cont[0], dict):
                        txt = cont[0].get("text") or cont[0].get("content")
                        if txt:
                            return txt
                if "text" in o0 and isinstance(o0.get("text"), str):
                    return o0.get("text")
        # last resort: top-level text
        if isinstance(resp_json.get("text"), str):
            return resp_json.get("text")
    except Exception:
        pass
    return None

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json() or {}
    proj = data.get("project", "Geral")
    msg = data.get("message", "").strip()
    if not msg: return jsonify({"reply": "System ready."})

    db = get_data()
    if "projects" not in db: db["projects"] = {"Geral": []}
    if proj not in db["projects"]: db["projects"][proj] = []

    cmd = msg.lower()
    reply = ""

    if "status" in cmd or "sistema" in cmd:
        reply = "📊 [VAI Cloud Core] Servidor Online 24/7 no Render. Operacional."
    else:
        # Tenta usar a API do Gemini se houver chave configurada, senão usa Groq ou modo local
        gemini_key = os.environ.get("GEMINI_API_KEY", "")
        groq_key = os.environ.get("GROQ_API_KEY", "")

        if gemini_key:
            try:
                # Use Authorization header (more secure than query param) but keep query param as fallback
                MODEL = "gemini-1.5-flash"
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
                payload = {"contents": [{"parts": [{"text": msg}]}]}
                headers = {"Content-Type": "application/json", "Authorization": f"Bearer {gemini_key}"}
                # First try with Authorization header
                res = requests.post(url, json=payload, headers=headers, timeout=15)
                if res.status_code == 401:
                    # maybe API key needs to be passed as query param
                    url_q = url + f"?key={gemini_key}"
                    res = requests.post(url_q, json=payload, timeout=15)

                try:
                    res.raise_for_status()
                except requests.RequestException as e:
                    logger.warning("Gemini API returned error status: %s", e)
                    reply = f"Erro na API Gemini ({res.status_code}). Mensagem salva localmente."
                else:
                    # parse json safely
                    try:
                        j = res.json()
                    except ValueError:
                        logger.exception("Gemini response was not valid JSON")
                        j = {}

                    text = _extract_gemini_text(j)
                    if text:
                        reply = text
                    else:
                        # fallback to raw text body
                        body = res.text
                        if body:
                            reply = body
                        else:
                            reply = "Resposta vazia da API Gemini. Mensagem salva localmente."
            except requests.RequestException as e:
                logger.exception("Network error when calling Gemini API: %s", e)
                reply = f"Erro de conexão com Gemini: {e}"
            except Exception as e:
                logger.exception("Unexpected error processing Gemini response: %s", e)
                reply = f"Erro ao processar resposta do Gemini: {e}"
        elif groq_key:
            try:
                headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
                payload = {"model": "llama3-70b-8192", "messages": [{"role": "user", "content": msg}]}
                res = requests.post("https://api.groq.com/openai/v1/chat/completions", json=payload, headers=headers, timeout=10)
                try:
                    res.raise_for_status()
                    reply = res.json().get("choices", [])[0].get("message", {}).get("content", "")
                except Exception:
                    logger.exception("Groq API error")
                    reply = f"Erro na API Groq. Mensagem processada localmente."
            except Exception:
                logger.exception("Groq request failed")
                reply = f"Processado pelo núcleo local: {msg}"
        else:
            reply = f"Cérebro Ativo: '{msg}' registrado com sucesso. (Adicione GEMINI_API_KEY ou GROQ_API_KEY nas variáveis do Render para respostas inteligentes)."

    db["projects"][proj].append({"u": msg, "a": reply})
    try:
        with open(MEMORY_FILE, "w", encoding="utf-8") as f:
            json.dump(db, f, ensure_ascii=False, indent=4)
    except Exception:
        logger.exception("Failed to write memory file")

    return jsonify({"reply": reply})

@app.route("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
