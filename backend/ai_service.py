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
# Options:
#   "openrouter" / "api" -> Cloud AI API via OpenRouter (DEFAULT)
#   "ollama" / "local"    -> Local Ollama instance (qwen3:8b)
RAW_PROVIDER = (os.getenv("AI_PROVIDER") or "").strip().lower()

# Online API configuration (Accepts OPENROUTER_API_KEY or AI_API_KEY)
AI_API_BASE = (os.getenv("AI_API_BASE") or "https://openrouter.ai/api/v1").rstrip('/')
AI_API_KEY = (os.getenv("OPENROUTER_API_KEY") or os.getenv("AI_API_KEY") or "").strip()
AI_MODEL = (os.getenv("OPENROUTER_MODEL") or os.getenv("AI_MODEL") or "meta-llama/llama-3.1-8b-instruct").strip()

# Local Ollama configuration
OLLAMA_BASE_URL = (os.getenv("OLLAMA_BASE_URL") or "http://localhost:11434").rstrip('/')
OLLAMA_MODEL = (os.getenv("OLLAMA_MODEL") or "qwen3:8b").strip()

# Determine active provider
if RAW_PROVIDER in ("ollama", "local"):
    AI_PROVIDER = "local"
elif RAW_PROVIDER in ("openrouter", "api", "groq") or AI_API_KEY:
    AI_PROVIDER = "openrouter"
else:
    AI_PROVIDER = "openrouter"


def _is_local_provider() -> bool:
    return AI_PROVIDER == "local"


def _clean_json_content(raw: str) -> str:
    """Strip markdown code blocks or conversational text to extract pure JSON."""
    raw = raw.strip()
    match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', raw)
    if match:
        return match.group(1).strip()
    return raw


async def check_ai_status() -> Dict[str, Any]:
    """Check status of either local Ollama or the online OpenRouter API."""
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


async def _execute_online_api_call(task_name: str, messages: List[Dict[str, str]], max_tokens: int = 80) -> Optional[Dict[str, Any]]:
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
        async with httpx.AsyncClient(timeout=12.0) as client:
            res = await client.post(f"{AI_API_BASE}/chat/completions", headers=headers, json=payload)
            if res.status_code != 200:
                logger.error(f"[AI API] Request failed: HTTP {res.status_code} - {res.text}")
                return None
            data = res.json()
            raw_content = data["choices"][0]["message"]["content"]
            clean_content = _clean_json_content(raw_content)
            return json.loads(clean_content)
    except Exception as e:
        logger.error(f"[AI API] Error executing call for {task_name}: {e}")
        return None


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


async def execute_ai_call(task_name: str, messages: List[Dict[str, str]], max_tokens: int = 80) -> Optional[Dict[str, Any]]:
    """Route AI inference to either local Ollama or OpenRouter online API."""
    if _is_local_provider():
        return await _execute_ollama_call(task_name, messages, max_tokens)
    else:
        return await _execute_online_api_call(task_name, messages, max_tokens)


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

    parsed = await execute_ai_call("analyze-complaint", messages, 80)
    if not parsed:
        # Heuristic fallback if AI service is offline
        return {
            "category": "general",
            "duration": None,
            "location": None,
            "severity": None,
            "note": "Fallback heuristic used",
        }

    return {
        "category": parsed.get("category", "general"),
        "duration": parsed.get("duration"),
        "location": parsed.get("location"),
        "severity": parsed.get("severity"),
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

    parsed = await execute_ai_call("extract-answer", messages, 70)
    if not parsed:
        return {
            "extracted_value": patient_answer,
            "acknowledgement": "Thank you, noted.",
        }

    return {
        "extracted_value": parsed.get("extracted_value", patient_answer),
        "acknowledgement": parsed.get("acknowledgement", "Thank you, noted."),
    }
