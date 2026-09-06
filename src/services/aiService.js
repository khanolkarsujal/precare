import { detectCategory, getNextQuestion } from './questionEngine.js';
import { URGENT_PATTERNS } from '../data/questionFlows.js';
import { apiUrl } from './apiClient.js';

/**
 * AI Service Layer connecting to Local Ollama with model `qwen3:8b`
 * via the application backend (/api/ollama/*).
 *
 * Performance Optimizations:
 * - Disabled Qwen3 extended thinking/reasoning mode (think: false)
 * - Concise, zero-preamble prompts
 * - Capped token generation (num_predict: 70-80)
 * - Exactly 1 Ollama call per patient interaction
 * - Detailed timing and size logging
 */

class AIService {
  constructor() {
    this.modelName = 'qwen3:8b';
  }

  /**
   * Check connection status to local Ollama via backend.
   * @returns {Promise<{ ok: boolean, model?: string, error?: string, modelMissing?: boolean }>}
   */
  async checkStatus() {
    try {
      const res = await fetch(apiUrl('/api/ollama/status'));
      const data = await res.json();
      return data;
    } catch (err) {
      return {
        ok: false,
        error: 'Local AI is unavailable. Please make sure Ollama is running.',
        details: err.message,
      };
    }
  }

  /**
   * Screen text for potential urgent red-flags.
   * @param {string} text
   * @returns {{ isUrgent: boolean, reason: string|null }}
   */
  screenUrgency(text) {
    if (!text || typeof text !== 'string') {
      return { isUrgent: false, reason: null };
    }

    for (const pattern of URGENT_PATTERNS) {
      if (pattern.regex.test(text)) {
        return {
          isUrgent: true,
          reason: `Potential urgent information — requires clinician review: (${pattern.reason})`,
        };
      }
    }

    return { isUrgent: false, reason: null };
  }

  /**
   * Analyze initial patient complaint using Ollama qwen3:8b.
   * Extracts category, chief complaint, and any inline duration or location already stated.
   *
   * @param {string} rawComplaint
   * @returns {Promise<Object>}
   */
  async analyzeInitialComplaint(rawComplaint) {
    const trimmed = rawComplaint.trim();
    const urgency = this.screenUrgency(trimmed);

    console.log(`[AI Client] LLM request started: analyze-complaint`);
    console.log(`[AI Client] Number of Ollama calls for this patient message: 1`);
    console.log(`[AI Client] Input prompt size: ${trimmed.length} characters`);

    const startTime = performance.now();
    let extractedData = null;

    try {
      const res = await fetch(apiUrl('/api/ollama/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaint: trimmed }),
      });

      const responseJson = await res.json();
      const elapsedSec = ((performance.now() - startTime) / 1000).toFixed(2);

      if (responseJson.ok && responseJson.data) {
        extractedData = responseJson.data;
        const respSize = JSON.stringify(extractedData).length;
        console.log(`[AI Client] LLM request completed: analyze-complaint`);
        console.log(`[AI Client] Total time: ${elapsedSec} seconds`);
        console.log(`[AI Client] Response size: ${respSize} characters`);
      } else {
        throw new Error(
          responseJson.error ||
          'Local AI is unavailable. Please make sure Ollama is running.'
        );
      }
    } catch (err) {
      console.warn('[AI Client] Ollama analysis warning:', err.message);
      if (
        err.message.includes('unavailable') ||
        err.message.includes('Ollama')
      ) {
        throw err;
      }
    }

    // Determine category with Ollama or fallback to category keywords
    const category =
      extractedData?.category || detectCategory(trimmed);

    const structured = {
      chief_complaint: trimmed,
      category: category,
      duration: extractedData?.duration || null,
      location: extractedData?.location || null,
      severity: extractedData?.severity || null,
      onset: null,
      symptoms: [trimmed],
      associated_symptoms: {},
      medical_history: null,
      medications: null,
      allergies: null,
      is_urgent: urgency.isUrgent,
      urgent_reason: urgency.reason,
      model: this.modelName,
    };

    return structured;
  }

  /**
   * Process patient's answer using Ollama qwen3:8b.
   * Updates the structured history state and generates a concise clinical acknowledgement.
   *
   * @param {string} patientAnswer
   * @param {string} targetField - The field ID currently queried
   * @param {Object} currentHistory - Current structured history
   * @returns {Promise<{ updatedHistory: Object, extractedValue: string, acknowledgement: string }>}
   */
  async processAnswer(patientAnswer, targetField, currentHistory) {
    const trimmed = patientAnswer.trim();
    const urgency = this.screenUrgency(trimmed);

    console.log(`[AI Client] LLM request started: extract-answer (${targetField})`);
    console.log(`[AI Client] Number of Ollama calls for this patient message: 1`);
    console.log(`[AI Client] Patient answer size: ${trimmed.length} characters`);

    const startTime = performance.now();
    let extractedValue = trimmed;
    let acknowledgement = 'Thank you, noted.';

    try {
      const res = await fetch(apiUrl('/api/ollama/extract'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientAnswer: trimmed,
          targetField,
        }),
      });

      const responseJson = await res.json();
      const elapsedSec = ((performance.now() - startTime) / 1000).toFixed(2);

      if (responseJson.ok && responseJson.data) {
        extractedValue = responseJson.data.extracted_value || trimmed;
        acknowledgement =
          responseJson.data.acknowledgement || 'Thank you, noted.';
        const respSize = (
          (responseJson.data.extracted_value || '') +
          (responseJson.data.acknowledgement || '')
        ).length;

        console.log(`[AI Client] LLM request completed: extract-answer (${targetField})`);
        console.log(`[AI Client] Total time: ${elapsedSec} seconds`);
        console.log(`[AI Client] Response size: ${respSize} characters`);
      } else {
        throw new Error(
          responseJson.error ||
          'Local AI is unavailable. Please make sure Ollama is running.'
        );
      }
    } catch (err) {
      console.warn('[AI Client] Ollama answer extraction warning:', err.message);
      if (
        err.message.includes('unavailable') ||
        err.message.includes('Ollama')
      ) {
        throw err;
      }
    }

    const updatedHistory = {
      ...currentHistory,
      associated_symptoms: { ...(currentHistory.associated_symptoms || {}) },
      is_urgent: currentHistory.is_urgent || urgency.isUrgent,
      urgent_reason: currentHistory.urgent_reason || urgency.reason,
    };

    // Store in appropriate location based on field type
    switch (targetField) {
      case 'severity':
        updatedHistory.severity = extractedValue;
        break;
      case 'duration':
        updatedHistory.duration = extractedValue;
        break;
      case 'location':
        updatedHistory.location = extractedValue;
        break;
      case 'medical_history':
        updatedHistory.medical_history = extractedValue;
        break;
      case 'medications':
        updatedHistory.medications = extractedValue;
        break;
      default:
        updatedHistory.associated_symptoms[targetField] = extractedValue;
        break;
    }

    return {
      updatedHistory,
      extractedValue,
      acknowledgement,
    };
  }

  /**
   * Generate next question from clinical question selection engine.
   *
   * @param {Object} historyState
   * @param {number} totalQuestionsAsked
   * @returns {Promise<{ question: string, targetField: string|null, isComplete: boolean }>}
   */
  async getNextQuestion(historyState, totalQuestionsAsked) {
    return getNextQuestion(historyState, totalQuestionsAsked);
  }
}

export const aiService = new AIService();
export default aiService;
