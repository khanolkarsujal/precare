/**
 * ==============================================================================
 * [LEGACY PROTOTYPE] server/ollamaHandler.js
 * ==============================================================================
 * Notice: This handler was part of the initial Node.js prototype server.
 * AI inference is now managed by FastAPI in backend/ai_service.py and backend/main.py.
 * ==============================================================================
 */

/**
 * Server-side Ollama integration handler optimized for fast clinical intake.
 * Communicates directly with local Ollama at http://localhost:11434
 * Model: qwen3:8b
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = 'qwen3:8b';

/**
 * Check if local Ollama server is running and qwen3:8b is available.
 * @returns {Promise<{ ok: boolean, error?: string, model?: string }>}
 */
export async function checkOllamaStatus() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        ok: false,
        error: 'Local AI is unavailable. Please make sure Ollama is running.',
      };
    }

    const data = await response.json();
    const models = data.models || [];
    const hasTargetModel = models.some(
      (m) => m.name === OLLAMA_MODEL || m.name.startsWith(`${OLLAMA_MODEL}:`)
    );

    if (!hasTargetModel) {
      return {
        ok: false,
        modelMissing: true,
        error: `Model ${OLLAMA_MODEL} is unavailable. Please run 'ollama pull ${OLLAMA_MODEL}' in your terminal to install it.`,
        availableModels: models.map((m) => m.name),
      };
    }

    return {
      ok: true,
      model: OLLAMA_MODEL,
      server: OLLAMA_HOST,
    };
  } catch (err) {
    return {
      ok: false,
      error: 'Local AI is unavailable. Please make sure Ollama is running.',
      details: err.message,
    };
  }
}

/**
 * Execute an optimized, single Ollama call with performance logging and thinking disabled.
 *
 * @param {string} taskName
 * @param {Array<{ role: string, content: string }>} messages
 * @param {number} maxTokens
 * @returns {Promise<Object>} parsed JSON response
 */
async function executeOllamaCall(taskName, messages, maxTokens = 80) {
  const promptText = messages.map((m) => m.content).join(' ');
  const promptSize = promptText.length;

  console.log(`\n--------------------------------------------------`);
  console.log(`[OLLAMA] LLM request started: ${taskName}`);
  console.log(`[OLLAMA] Number of Ollama calls per patient message: 1`);
  console.log(`[OLLAMA] Prompt size: ${promptSize} characters`);
  console.log(`[OLLAMA] Extended thinking mode: DISABLED (think: false)`);
  console.log(`[OLLAMA] Max tokens (num_predict): ${maxTokens}`);

  const startTime = Date.now();

  const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      format: 'json',
      think: false, // Disables Qwen3 reasoning/thinking mode
      options: {
        num_predict: maxTokens,
        temperature: 0.1,
        top_p: 0.9,
      },
    }),
  });

  const durationMs = Date.now() - startTime;
  const durationSec = (durationMs / 1000).toFixed(2);

  if (!response.ok) {
    console.error(`[OLLAMA] LLM request failed with status: ${response.status}`);
    throw new Error(`Ollama returned status ${response.status}`);
  }

  const json = await response.json();
  const rawContent = json.message?.content || '{}';
  const responseSize = rawContent.length;

  console.log(`[OLLAMA] LLM request completed: ${taskName}`);
  console.log(`[OLLAMA] Total time: ${durationSec} seconds`);
  console.log(`[OLLAMA] Response size: ${responseSize} characters`);
  if (json.eval_count) {
    console.log(`[OLLAMA] Output tokens generated: ${json.eval_count} tokens`);
  }
  console.log(`--------------------------------------------------\n`);

  try {
    return JSON.parse(rawContent);
  } catch (err) {
    console.warn(`[OLLAMA] JSON parse fallback for ${taskName}:`, rawContent);
    return null;
  }
}

/**
 * Analyze initial patient complaint using Ollama qwen3:8b (1 single call, no thinking).
 * Extracts category, inline duration, and location in structured JSON.
 *
 * @param {string} complaint
 * @returns {Promise<Object>}
 */
export async function analyzeComplaintWithOllama(complaint) {
  const status = await checkOllamaStatus();
  if (!status.ok) {
    throw new Error(status.error);
  }

  // Concise, highly focused clinical system prompt (zero preamble)
  const systemPrompt = `You are a clinical intake assistant. Extract the patient's complaint into JSON with keys:
"category" (one of "abdominal_pain", "headache", "fever", "chest_respiratory", "general"),
"duration" (string or null if not mentioned),
"location" (string or null if not mentioned),
"severity" (string or null if not mentioned).
Do NOT provide explanations or reasoning. Do NOT diagnose.`;

  const userPrompt = `Complaint: "${complaint}"`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const parsed = await executeOllamaCall('analyze-complaint', messages, 80);

  return {
    category: parsed?.category || 'general',
    duration: parsed?.duration || null,
    location: parsed?.location || null,
    severity: parsed?.severity || null,
  };
}

/**
 * Extract patient's answer into a concise clinical attribute using Ollama qwen3:8b.
 * Exactly 1 single call per patient answer with thinking disabled.
 *
 * @param {Object} params
 * @param {string} params.patientAnswer
 * @param {string} params.targetField
 * @returns {Promise<{ extracted_value: string, acknowledgement: string }>}
 */
export async function extractAnswerWithOllama({ patientAnswer, targetField }) {
  const status = await checkOllamaStatus();
  if (!status.ok) {
    throw new Error(status.error);
  }

  // Concise, direct prompt avoiding conversational fluff or reasoning
  const systemPrompt = `You are a clinical intake assistant. Extract the patient's answer into concise JSON:
"extracted_value": concise clinical value (e.g. '6/10', 'Upper abdomen', 'Denied (No)', 'Uncertain / Patient unsure'),
"acknowledgement": short 1-sentence polite acknowledgement.
Do NOT explain reasoning. Do NOT diagnose or prescribe treatment.
If the patient denies or says 'no', use 'Denied (No)'.
If the patient is unsure, use 'Uncertain / Patient unsure'.`;

  const userPrompt = `Target attribute: ${targetField}
Patient answer: "${patientAnswer}"`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const parsed = await executeOllamaCall('extract-answer', messages, 70);

  return {
    extracted_value: parsed?.extracted_value || patientAnswer,
    acknowledgement: parsed?.acknowledgement || 'Thank you, noted.',
  };
}
