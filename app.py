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

# Environment API keys (do not log values)
ENV_KEYS = {
    "GEMINI": os.environ.get("GEMINI_API_KEY"),
    "GROQ": os.environ.get("GROQ_API_KEY"),
    "DEEPSEEK": os.environ.get("DEEPSEEK_API_KEY"),
    "OPENAI": os.environ.get("OPENAI_API_KEY"),
    "ANTHROPIC": os.environ.get("ANTHROPIC_API_KEY"),
}
for k, v in ENV_KEYS.items():
    if not v:
        logger.warning("%s_API_KEY not found in environment; %s provider will be disabled", k, k)

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


# Provider base class
class Provider:
    name = "base"

    def available(self):
        """Return True if provider is configured (key present)."""
        return False

    def call(self, message: str) -> str:
        """Call provider and return text. Should raise on failure."""
        raise NotImplementedError


# Gemini provider: uses google.generativeai SDK when available, otherwise HTTP
class GeminiProvider(Provider):
    name = "gemini"

    def __init__(self, api_key, model="gemini-1.5-flash"):
        self.api_key = api_key
        self.model = model

    def available(self):
        return bool(self.api_key)

    def call_sdk(self, message):
        # configure SDK
        if hasattr(genai, "configure"):
            genai.configure(api_key=self.api_key)
        else:
            try:
                setattr(genai, "api_key", self.api_key)
            except Exception:
                pass

        # try different SDK surfaces
        if hasattr(genai, "generate_text"):
            resp = genai.generate_text(model=self.model, prompt=message, max_output_tokens=512)
            if hasattr(resp, "text"):
                return resp.text
            if isinstance(resp, dict):
                return resp.get("text") or _extract_gemini_text(resp) or json.dumps(resp)

        if hasattr(genai, "chat") and hasattr(genai.chat, "completions"):
            resp = genai.chat.completions.create(model=self.model, messages=[{"role": "user", "content": message}])
            if hasattr(resp, "candidates"):
                c = resp.candidates
                if isinstance(c, list) and len(c) > 0 and hasattr(c[0], "content"):
                    parts = getattr(c[0].content, "parts", None)
                    if parts and len(parts) > 0:
                        return getattr(parts[0], "text", str(parts[0]))
            if isinstance(resp, dict):
                return _extract_gemini_text(resp) or json.dumps(resp)

        if hasattr(genai, "Client"):
            client = genai.Client(api_key=self.api_key)
            if hasattr(client, "generate_text"):
                resp = client.generate_text(model=self.model, prompt=message)
                if isinstance(resp, dict):
                    return resp.get("text") or _extract_gemini_text(resp) or json.dumps(resp)
                if hasattr(resp, "text"):
                    return resp.text

        raise RuntimeError("Unsupported google.generativeai SDK interface")

    def call_http(self, message):
        # Use a stable REST path and pass key only in headers
        url = f"https://generativelanguage.googleapis.com/v1beta2/models/{self.model}:generateMessage"
        payload = {"message": {"content": message, "author": "user"}}
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {self.api_key}"}
        res = requests.post(url, json=payload, headers=headers, timeout=15)
        try:
            res.raise_for_status()
        except Exception:
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

    def call(self, message: str) -> str:
        try:
            if GENAI_SDK_AVAILABLE:
                logger.info("GeminiProvider: using SDK surface")
                return self.call_sdk(message)
            else:
                logger.info("GeminiProvider: using HTTP fallback")
                return self.call_http(message)
        except Exception as e:
            logger.warning("GeminiProvider failed: %s", type(e).__name__)
            raise


# Groq provider
class GroqProvider(Provider):
    name = "groq"

    def __init__(self, api_key, model="llama-3.3-70b-versatile"):
        self.api_key = api_key
        self.model = model

    def available(self):
        return bool(self.api_key)

    def call(self, message: str) -> str:
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {"model": self.model, "messages": [{"role": "user", "content": message}]}
        res = requests.post("https://api.groq.com/openai/v1/chat/completions", json=payload, headers=headers, timeout=15)
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


# DeepSeek provider (generic HTTP wrapper) - requires DEEPSEEK_API_URL in env or uses a guessed base
class DeepSeekProvider(Provider):
    name = "deepseek"

    def __init__(self, api_key, api_url=None, model="deepseek-alpha"):
        self.api_key = api_key
        self.api_url = api_url or os.environ.get("DEEPSEEK_API_URL")
        self.model = model

    def available(self):
        return bool(self.api_key and self.api_url)

    def call(self, message: str) -> str:
        if not self.api_url:
            raise RuntimeError("DeepSeek API URL not configured")
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {"model": self.model, "input": message}
        res = requests.post(self.api_url, json=payload, headers=headers, timeout=15)
        try:
            res.raise_for_status()
        except Exception:
            logger.error("DeepSeek API error status=%s, body=%s", res.status_code, res.text[:1000])
            res.raise_for_status()
        try:
            j = res.json()
        except ValueError:
            return res.text
        # Attempt common shapes
        if isinstance(j, dict):
            return j.get("output") or j.get("text") or json.dumps(j)
        return str(j)


# OpenAI provider via REST
class OpenAIProvider(Provider):
    name = "openai"

    def __init__(self, api_key, model="gpt-4o-mini"):
        self.api_key = api_key
        self.model = model

    def available(self):
        return bool(self.api_key)

    def call(self, message: str) -> str:
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {"model": self.model, "messages": [{"role": "user", "content": message}], "temperature": 0.2}
        res = requests.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers, timeout=15)
        try:
            res.raise_for_status()
        except Exception:
            logger.error("OpenAI API error status=%s, body=%s", res.status_code, res.text[:1000])
            res.raise_for_status()
        j = res.json()
        try:
            return j.get("choices", [])[0].get("message", {}).get("content", "")
        except Exception:
            return json.dumps(j)


# Anthropic provider via REST
class AnthropicProvider(Provider):
    name = "anthropic"

    def __init__(self, api_key, model="claude-2.1"):
        self.api_key = api_key
        self.model = model

    def available(self):
        return bool(self.api_key)

    def call(self, message: str) -> str:
        headers = {"x-api-key": self.api_key, "Content-Type": "application/json"}
        payload = {"model": self.model, "prompt": message, "max_tokens": 500}
        # Note: Anthropic's API shapes vary; this generic wrapper attempts the common pattern
        res = requests.post("https://api.anthropic.com/v1/complete", json=payload, headers=headers, timeout=15)
        try:
            res.raise_for_status()
        except Exception:
            logger.error("Anthropic API error status=%s, body=%s", res.status_code, res.text[:1000])
            res.raise_for_status()
        j = res.json()
        # Attempt to extract text from known fields
        if isinstance(j, dict):
            return j.get("completion") or j.get("text") or j.get("output") or json.dumps(j)
        return str(j)


# Local fallback provider
class LocalProvider(Provider):
    name = "local"

    def available(self):
        return True

    def call(self, message: str) -> str:
        return f"Cérebro Local: '{message}' registrado com sucesso. (Configure chaves GEMINI/GROQ/OPENAI/ANTHROPIC/DEEPSEEK para respostas reais)."


class MultiBrainManager:
    """Manages an ordered list of AI providers and routes messages with resilient fallbacks.

    Priority order: Gemini -> DeepSeek -> Groq -> OpenAI -> Anthropic -> Local
    """

    def __init__(self):
        self.providers = []
        # Build providers in priority order, skip ones without keys/config
        gem_key = os.environ.get("GEMINI_API_KEY")
        if gem_key:
            self.providers.append(GeminiProvider(gem_key))

        deep_key = os.environ.get("DEEPSEEK_API_KEY")
        deep_url = os.environ.get("DEEPSEEK_API_URL")
        if deep_key and deep_url:
            self.providers.append(DeepSeekProvider(deep_key, api_url=deep_url))

        groq_key = os.environ.get("GROQ_API_KEY")
        if groq_key:
            self.providers.append(GroqProvider(groq_key))

        openai_key = os.environ.get("OPENAI_API_KEY")
        if openai_key:
            self.providers.append(OpenAIProvider(openai_key))

        anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
        if anthropic_key:
            self.providers.append(AnthropicProvider(anthropic_key))

        # Always add local fallback as last resort
        self.providers.append(LocalProvider())

        logger.info("MultiBrainManager initialized with providers: %s", [p.name for p in self.providers])

    def route(self, message: str) -> dict:
        """Try each available provider in order. Return unified response dict.

        Response format:
            {"response": "text", "provider_used": "name"}
        """
        attempted = []
        for provider in self.providers:
            if not provider.available():
                logger.debug("Provider %s not available; skipping", provider.name)
                continue
            try:
                logger.info("Attempting provider %s", provider.name)
                resp_text = provider.call(message)
                if resp_text:
                    # Normalize and return
                    return {"response": resp_text, "provider_used": provider.name}
                else:
                    logger.warning("Provider %s returned empty response; trying next", provider.name)
            except Exception as e:
                # Log the error type and message safely, continue to next provider
                logger.warning("Provider %s failed: %s", provider.name, type(e).__name__)
                attempted.append((provider.name, type(e).__name__))
                continue

        # If all providers exhausted without a non-empty response, return a graceful fallback
        logger.error("All providers exhausted or failed. Attempts: %s", attempted)
        fallback = LocalProvider()
        return {"response": fallback.call(message), "provider_used": fallback.name}


# Instantiate manager globally
manager = MultiBrainManager()


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json() or {}
    proj = data.get("project", "Geral")
    msg = data.get("message", "").strip()
    if not msg:
        return jsonify({"response": "System ready.", "provider_used": "none"})

    db = get_data()
    if "projects" not in db:
        db["projects"] = {"Geral": []}
    if proj not in db["projects"]:
        db["projects"][proj] = []

    cmd = msg.lower()

    if "status" in cmd or "sistema" in cmd:
        reply = {"response": "📊 [VAI Cloud Core] Servidor Online 24/7 no Render. Operacional.", "provider_used": "system"}
        db["projects"][proj].append({"u": msg, "a": reply["response"]})
        save_data(db)
        return jsonify(reply)

    try:
        result = manager.route(msg)
    except Exception as e:
        logger.exception("Unexpected error in MultiBrainManager: %s", type(e).__name__)
        return jsonify({"response": "Serviço temporariamente indisponível.", "provider_used": "none"}), 500

    db["projects"][proj].append({"u": msg, "a": result.get("response")})
    save_data(db)

    return jsonify(result)


@app.route("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    # Render sets the PORT env var; bind to 0.0.0.0 so it's reachable
    app.run(host="0.0.0.0", port=port)
