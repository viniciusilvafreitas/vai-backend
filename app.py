from flask import Flask, jsonify, request, render_template
import json
import os
import requests

app = Flask(__name__, template_folder='templates', static_folder='.')
MEMORY_FILE = os.path.expanduser("vai_memory.json")

def get_data():
    if os.path.exists(MEMORY_FILE):
        try:
            with open(MEMORY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict): return data
        except: pass
    return {"projects": {"Geral": []}}

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
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
                payload = {"contents": [{"parts": [{"text": msg}]}]}
                res = requests.post(url, json=payload, timeout=10)
                if res.status_code == 200:
                    reply = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                else:
                    reply = f"Erro na API Gemini ({res.status_code}). Mensagem salva localmente."
            except Exception as e:
                reply = f"Erro de conexão com Gemini: {str(e)}"
        elif groq_key:
            try:
                headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
                payload = {"model": "llama3-70b-8192", "messages": [{"role": "user", "content": msg}]}
                res = requests.post("https://api.groq.com/openai/v1/chat/completions", json=payload, headers=headers, timeout=10)
                if res.status_code == 200:
                    reply = res.json()["choices"][0]["message"]["content"]
                else:
                    reply = f"Erro na API Groq. Mensagem processada localmente."
            except:
                reply = f"Processado pelo núcleo local: {msg}"
        else:
            reply = f"Cérebro Ativo: '{msg}' registrado com sucesso. (Adicione GEMINI_API_KEY ou GROQ_API_KEY nas variáveis do Render para respostas inteligentes)."

    db["projects"][proj].append({"u": msg, "a": reply})
    try:
        with open(MEMORY_FILE, "w", encoding="utf-8") as f:
            json.dump(db, f, ensure_ascii=False, indent=4)
    except: pass

    return jsonify({"reply": reply})

@app.route("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
