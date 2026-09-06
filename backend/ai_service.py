import os
import json
import logging
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger("precare.ai")

# -----------------------------------------------------------------------------
# AI Provider Configuration
# -----------------------------------------------------------------------------
# Supported: "ollama" (local dev default), "groq" (free tier online), "openai_compatible"
AI_PROVIDER = os.getenv("AI_PROVIDER", "ollama").lower()

# Local Ollama settings
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip('/')
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:8b")

# Free-Tier Online AI Settings (e.g. Groq free tier or OpenRouter free models)
AI_API_BASE = os.getenv("AI_API_BASE", "https://api.groq.com/openai/v1").rstrip('/')
AI_API_KEY = os.getenv("AI_API_KEY", "").strip()
AI_MODEL = os.getenv("AI_MODEL", "llama-3.1-8b-instant")


async def check_ai_status() -> Dict[str, Any]:
    """Check whether configured AI provider (local Ollama or online API) is operational."""
    if AI_PROVIDER == "ollama":
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
                if res.status_code != 200:
                    return {
                        "ok": False,
                        "error": "Local AI service is unavailable. Please make sure Ollama is running.",
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
                        "modelMissing": True,
                        "error": f"Model '{OLLAMA_MODEL}' is missing. Please run 'ollama pull {OLLAMA_MODEL}'.",
                        "availableModels": [m.get("name") for m in models],
                    }
                return {
                    "ok": True,
                    "provider": "ollama",
                    "model": OLLAMA_MODEL,
                    "server": OLLAMA_BASE_URL,
                }
        except Exception as e:
            logger.warning(f"Ollama status check failed: {e}")
            return {
                "ok": False,
                "provider": "ollama",
                "error": "Local AI service is unavailable. Please make sure Ollama is running.",
                "details": str(e),
            }

    # Free online AI provider (Groq / OpenRouter / OpenAI-compatible)
    if not AI_API_KEY:
        return {
            "ok": False,
            "provider": AI_PROVIDER,
            "error": f"AI_API_KEY environment variable is not set for provider '{AI_PROVIDER}'.",
        }
    
    return {
        "ok": True,
        "provider": AI_PROVIDER,
        "model": AI_MODEL,
        "server": AI_API_BASE,
    }


async def _execute_online_ai_call(task_name: str, messages: List[Dict[str, str]], max_tokens: int = 80) -> Optional[Dict[str, Any]]:
    """Execute JSON chat completion against free-tier online AI provider (e.g. Groq)."""
    if not AI_API_KEY:
        logger.warning(f"[{AI_PROVIDER}] AI_API_KEY not configured for online inference.")
        return None

    headers = {
        "Authorization": f"Bearer {AI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": AI_MODEL,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_object"},
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(f"{AI_API_BASE}/chat/completions", headers=headers, json=payload)
            if res.status_code != 200:
                logger.error(f"[{AI_PROVIDER}] Online AI failed: HTTP {res.status_code} - {res.text}")
                return None
            data = res.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
    except Exception as e:
        logger.error(f"[{AI_PROVIDER}] Error executing online call for {task_name}: {e}")
        return None


async def _execute_ollama_call(task_name: str, messages: List[Dict[str, str]], max_tokens: int = 80) -> Optional[Dict[str, Any]]:
    """Execute local Ollama call with think=False and token cap."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
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
            return json.loads(content)
    except Exception as e:
        logger.error(f"[OLLAMA] Error executing call for {task_name}: {e}")
        return None


async def execute_ai_call(task_name: str, messages: List[Dict[str, str]], max_tokens: int = 80) -> Optional[Dict[str, Any]]:
    """Route AI inference to either local Ollama or configured free online provider."""
    if AI_PROVIDER == "ollama":
        return await _execute_ollama_call(task_name, messages, max_tokens)
    else:
        return await _execute_online_ai_call(task_name, messages, max_tokens)


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
            "note": "Fallback heuristic used (AI offline)",
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
