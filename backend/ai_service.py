import os
import re
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path.cwd() / ".env")

logger = logging.getLogger("precare.ai")

# -----------------------------------------------------------------------------
# AI Provider Configuration
# -----------------------------------------------------------------------------
# Production default: "openrouter" (Online AI via OpenRouter)
# Developer/testing: "ollama" (Local Ollama instance)
#
# The provider is determined by the AI_PROVIDER environment variable.
# A runtime override can be set via the developer API for testing purposes.
# -----------------------------------------------------------------------------

# Read environment configuration
RAW_PROVIDER = (os.getenv("AI_PROVIDER") or "").strip().lower()
ENVIRONMENT = (os.getenv("ENVIRONMENT") or "development").strip().lower()

# Online API configuration (Accepts OPENROUTER_API_KEY or AI_API_KEY)
AI_API_BASE = (os.getenv("AI_API_BASE") or "https://openrouter.ai/api/v1").rstrip('/')
AI_API_KEY = (os.getenv("OPENROUTER_API_KEY") or os.getenv("AI_API_KEY") or "").strip()
AI_MODEL = (os.getenv("OPENROUTER_MODEL") or os.getenv("AI_MODEL") or "meta-llama/llama-3.1-8b-instruct").strip()

# Local Ollama configuration
OLLAMA_BASE_URL = (os.getenv("OLLAMA_BASE_URL") or "http://localhost:11434").rstrip('/')
OLLAMA_MODEL = (os.getenv("OLLAMA_MODEL") or "qwen3:8b").strip()

# Determine default provider from environment
if RAW_PROVIDER in ("ollama", "local"):
    _DEFAULT_PROVIDER = "local"
elif RAW_PROVIDER in ("openrouter", "api", "groq") or AI_API_KEY:
    _DEFAULT_PROVIDER = "openrouter"
else:
    # Production default: always use OpenRouter online
    _DEFAULT_PROVIDER = "openrouter"

# Runtime override (set via developer API, defaults to None = use _DEFAULT_PROVIDER)
_runtime_provider_override: Optional[str] = None


# -----------------------------------------------------------------------------
# Provider State Management (for developer testing)
# -----------------------------------------------------------------------------
def get_active_provider() -> str:
    """Return the currently active AI provider name ('openrouter' or 'local')."""
    if _runtime_provider_override is not None:
        return _runtime_provider_override
    return _DEFAULT_PROVIDER


def set_runtime_provider(provider: str) -> str:
    """
    Set a runtime provider override for developer testing.
    Valid values: 'openrouter', 'local' (ollama).
    Returns the new active provider name.
    """
    global _runtime_provider_override
    normalized = provider.strip().lower()
    if normalized in ("openrouter", "api", "online"):
        _runtime_provider_override = "openrouter"
    elif normalized in ("ollama", "local"):
        _runtime_provider_override = "local"
    else:
        raise ValueError(f"Unknown AI provider: '{provider}'. Use 'openrouter' or 'ollama'.")
    logger.info(f"[AI] Runtime provider override set to: {_runtime_provider_override}")
    return _runtime_provider_override


def reset_runtime_provider():
    """Clear the runtime override; revert to environment default."""
    global _runtime_provider_override
    _runtime_provider_override = None
    logger.info(f"[AI] Runtime provider override cleared. Using default: {_DEFAULT_PROVIDER}")


def _is_local_provider() -> bool:
    return get_active_provider() == "local"


def get_provider_info() -> Dict[str, Any]:
    """Return safe provider info for the developer panel (no secrets)."""
    active = get_active_provider()
    return {
        "active": active,
        "default": _DEFAULT_PROVIDER,
        "isOverridden": _runtime_provider_override is not None,
        "environment": ENVIRONMENT,
        "openrouter": {
            "configured": bool(AI_API_KEY),
            "model": AI_MODEL,
            # NEVER expose AI_API_KEY
        },
        "ollama": {
            "baseUrl": OLLAMA_BASE_URL,
            "model": OLLAMA_MODEL,
        },
    }


def _clean_json_content(raw: Optional[str]) -> str:
    """Strip markdown code blocks or conversational text to extract pure JSON."""
    if not raw:
        return "{}"
    raw = str(raw).strip()
    match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', raw)
    if match:
        raw = match.group(1).strip()
    # If not full JSON, search for the outer-most { ... }
    json_match = re.search(r'(\{[\s\S]*\})', raw)
    if json_match:
        return json_match.group(1).strip()
    return raw


# -----------------------------------------------------------------------------
# AI Status Check
# -----------------------------------------------------------------------------
async def check_ai_status() -> Dict[str, Any]:
    """Check status of the currently active AI provider."""
    if _is_local_provider():
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
                if res.status_code != 200:
                    return {
                        "ok": False,
                        "provider": "local (Ollama)",
                        "error": "Local Ollama service is unavailable. Please make sure Ollama is running.",
                    }
                data = res.json()
                models = data.get("models", [])
                has_model = any(
                    m.get("name") == OLLAMA_MODEL or m.get("name", "").startswith(f"{OLLAMA_MODEL}:")
                    for m in models
                )
                if not has_model:
                    return {
                        "ok": False,
                        "provider": "local (Ollama)",
                        "modelMissing": True,
                        "error": f"Model '{OLLAMA_MODEL}' is missing. Please run 'ollama pull {OLLAMA_MODEL}'.",
                        "availableModels": [m.get("name") for m in models],
                    }
                return {
                    "ok": True,
                    "provider": "local",
                    "model": OLLAMA_MODEL,
                    "server": OLLAMA_BASE_URL,
                }
        except Exception as e:
            logger.warning(f"Ollama status check failed: {e}")
            return {
                "ok": False,
                "provider": "local",
                "error": "Local Ollama service is unavailable. Ensure Ollama is started.",
                "details": str(e),
            }

    # Online API provider (OpenRouter)
    if not AI_API_KEY:
        return {
            "ok": False,
            "provider": "openrouter (Online)",
            "error": "OPENROUTER_API_KEY (or AI_API_KEY) environment variable is not set.",
        }

    return {
        "ok": True,
        "provider": "openrouter",
        "model": AI_MODEL,
        "server": AI_API_BASE,
    }


# -----------------------------------------------------------------------------
# OpenRouter Online API Call
# -----------------------------------------------------------------------------
async def _execute_online_api_call(task_name: str, messages: List[Dict[str, str]], max_tokens: int = 300) -> Optional[Dict[str, Any]]:
    """Execute JSON chat completion against OpenRouter API."""
    if not AI_API_KEY:
        logger.warning("[AI API] OPENROUTER_API_KEY is not configured.")
        return None

    headers = {
        "Authorization": f"Bearer {AI_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://precare.health",
        "X-Title": "PreCare Clinical Intake",
    }
    payload = {
        "model": AI_MODEL,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_object"},
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(f"{AI_API_BASE}/chat/completions", headers=headers, json=payload)
            if res.status_code != 200:
                logger.error(f"[AI API] Request failed: HTTP {res.status_code} - {res.text}")
                return None
            data = res.json()
            choice_msg = data.get("choices", [{}])[0].get("message", {})
            raw_content = choice_msg.get("content")
            if not raw_content and choice_msg.get("reasoning"):
                raw_content = choice_msg.get("reasoning")
            clean_content = _clean_json_content(raw_content)
            return json.loads(clean_content)
    except Exception as e:
        logger.error(f"[AI API] Error executing call for {task_name}: {e}")
        return None


# -----------------------------------------------------------------------------
# Local Ollama Call
# -----------------------------------------------------------------------------
async def _execute_ollama_call(task_name: str, messages: List[Dict[str, str]], max_tokens: int = 80) -> Optional[Dict[str, Any]]:
    """Execute local Ollama call with think=False and token cap."""
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            payload = {
                "model": OLLAMA_MODEL,
                "messages": messages,
                "stream": False,
                "format": "json",
                "think": False,
                "options": {
                    "num_predict": max_tokens,
                    "temperature": 0.1,
                    "top_p": 0.9,
                }
            }
            res = await client.post(f"{OLLAMA_BASE_URL}/api/chat", json=payload)
            if res.status_code != 200:
                logger.error(f"[OLLAMA] Request failed with status {res.status_code}")
                return None
            data = res.json()
            content = data.get("message", {}).get("content", "{}")
            clean_content = _clean_json_content(content)
            return json.loads(clean_content)
    except Exception as e:
        logger.error(f"[OLLAMA] Error executing call for {task_name}: {e}")
        return None


# -----------------------------------------------------------------------------
# Unified AI Call Router
# -----------------------------------------------------------------------------
async def execute_ai_call(task_name: str, messages: List[Dict[str, str]], max_tokens: int = 80) -> Optional[Dict[str, Any]]:
    """
    Route AI inference to the currently active provider.
    NO automatic fallback from OpenRouter → Ollama in production.
    If the active provider fails, return None (heuristic fallback handles it upstream).
    """
    if _is_local_provider():
        return await _execute_ollama_call(task_name, messages, max_tokens)
    else:
        return await _execute_online_api_call(task_name, messages, max_tokens)


# -----------------------------------------------------------------------------
# High-Level AI Functions (used by main.py endpoints)
# -----------------------------------------------------------------------------
def _heuristic_category(text: str) -> str:
    lower = text.lower()
    if any(w in lower for w in ["stomach", "abdom", "belly", "tummy", "cramp", "digest", "gut"]):
        return "abdominal_pain"
    if any(w in lower for w in ["head", "migraine"]):
        return "headache"
    if any(w in lower for w in ["fever", "temp", "chills", "sweat"]):
        return "fever"
    if any(w in lower for w in ["chest", "breath", "cough", "wheez", "lung", "throat"]):
        return "chest_respiratory"
    return "general"


def _heuristic_duration(text: str) -> Optional[str]:
    m = re.search(r'(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(days?|weeks?|months?|hours?|years?)', text, re.IGNORECASE)
    if m:
        num = m.group(1).lower()
        word_to_num = {'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10'}
        unit = m.group(2).lower()
        return f"{word_to_num.get(num, num)} {unit}"
    return None


async def analyze_complaint_with_ai(complaint: str) -> Dict[str, Any]:
    """Analyze initial complaint into category, duration, location, severity."""
    system_prompt = (
        "You are a clinical intake assistant. Extract the patient's complaint into JSON with keys:\n"
        '"category" (one of "abdominal_pain", "headache", "fever", "chest_respiratory", "general"),\n'
        '"duration" (string or null if not mentioned),\n'
        '"location" (string or null if not mentioned),\n'
        '"severity" (string or null if not mentioned).\n'
        "Do NOT provide explanations or reasoning. Do NOT diagnose."
    )
    user_prompt = f'Complaint: "{complaint}"'
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    parsed = await execute_ai_call("analyze-complaint", messages, 300)
    category = (parsed.get("category") if parsed else None) or _heuristic_category(complaint)
    duration = (parsed.get("duration") if parsed else None) or _heuristic_duration(complaint)
    location = parsed.get("location") if parsed else None
    severity = parsed.get("severity") if parsed else None

    return {
        "category": category,
        "duration": duration,
        "location": location,
        "severity": severity,
    }


async def extract_answer_with_ai(patient_answer: str, target_field: str) -> Dict[str, str]:
    """Extract patient answer into concise clinical attribute and short acknowledgement."""
    system_prompt = (
        "You are a clinical intake assistant. Extract the patient's answer into concise JSON:\n"
        '"extracted_value": concise clinical value (e.g. \'6/10\', \'Upper abdomen\', \'Denied (No)\', \'Uncertain / Patient unsure\'),\n'
        '"acknowledgement": short 1-sentence polite acknowledgement.\n'
        "Do NOT explain reasoning. Do NOT diagnose or prescribe treatment.\n"
        "If the patient denies or says 'no', use 'Denied (No)'.\n"
        "If the patient is unsure, use 'Uncertain / Patient unsure'."
    )
    user_prompt = f'Target attribute: {target_field}\nPatient answer: "{patient_answer}"'
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    parsed = await execute_ai_call("extract-answer", messages, 200)
    trimmed = patient_answer.strip()
    extracted_val = parsed.get("extracted_value") if parsed else None
    acknowledgement = (parsed.get("acknowledgement") if parsed else None) or "Thank you, noted."

    if not extracted_val or extracted_val == trimmed:
        if re.match(r'^(no|nope|not really|none|nil|negative|never)$', trimmed, re.IGNORECASE):
            extracted_val = "Denied (No)"
        elif re.match(r'^(yes|yeah|yep|sure|correct|true)$', trimmed, re.IGNORECASE):
            extracted_val = "Confirmed (Yes)"
        elif re.match(r'^\d+$', trimmed):
            extracted_val = f"{trimmed}/10"
        elif "don't know" in trimmed.lower() or "not sure" in trimmed.lower() or "unsure" in trimmed.lower():
            extracted_val = "Uncertain / Patient unsure"
        else:
            extracted_val = trimmed

    return {
        "extracted_value": extracted_val,
        "acknowledgement": acknowledgement,
    }

