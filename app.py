from flask import Flask, jsonify, request, render_template
import json
import os

app = Flask(__name__, template_folder='templates', static_folder='.')

MEMORY_FILE = os.path.expanduser("~/VAI/vai_memory.json")

def get_data():
    if os.path.exists(MEMORY_FILE):
        try:
            with open(MEMORY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict) and "projects" in data:
                    return data
        except:
            pass
    return {"projects": {"Geral": []}}

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json() or {}
    proj = data.get("project", "Geral")
    msg = data.get("message", "").strip()
    
    if not msg:
        return jsonify({"reply": "System ready. Aguardando comando de engenharia."})

    db = get_data()
    if proj not in db["projects"]:
        db["projects"][proj] = []

    cmd = msg.lower()
    reply = ""

    if "status" in cmd or "bateria" in cmd or "sistema" in cmd:
        try:
            st = os.statvfs('/')
            free_gb = (st.f_bavail * st.f_frsize) / (1024**3)
            total_gb = (st.f_blocks * st.f_frsize) / (1024**3)
            used_gb = total_gb - free_gb
            reply = (
                f"📊 [VAI Engineering - System Telemetry]\n"
                f"• Armazenamento Total: {total_gb:.2f} GB\n"
                f"• Espaço Usado: {used_gb:.2f} GB\n"
                f"• Espaço Livre: {free_gb:.2f} GB"
            )
        except Exception as e:
            reply = f"Erro ao ler telemetria: {str(e)}"

    elif "limpar downloads" in cmd or "clean downloads" in cmd:
        download_path = os.path.expanduser("~/storage/shared/Download")
        count = 0
        deleted_size = 0
        
        if os.path.exists(download_path):
            try:
                # Varre todos os arquivos e subpastas na pasta Download
                for root, dirs, files in os.walk(download_path, topdown=False):
                    for file in files:
                        file_p = os.path.join(root, file)
                        try:
                            file_size = os.path.getsize(file_p)
                            os.remove(file_p)
                            count += 1
                            deleted_size += file_size
                        except:
                            pass
                
                size_mb = deleted_size / (1024**2)
                reply = f"🧹 [Varredura Profunda Concluída]: {count} arquivos eliminados de dentro de todas as pastas de Download. Espaço liberado: {size_mb:.2f} MB."
            except Exception as e:
                reply = f"Erro na varredura: {str(e)}"
        else:
            reply = "Caminho de Downloads não encontrado. Execute 'termux-setup-storage'."
    else:
        reply = f"Comando '{msg}' interpretado. Digite `limpar downloads` para executar a varredura profunda de arquivos ou `status` para checar a memória."

    db["projects"][proj].append({"u": msg, "a": reply})
    with open(MEMORY_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=4)

    return jsonify({"reply": reply})

@app.route("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
