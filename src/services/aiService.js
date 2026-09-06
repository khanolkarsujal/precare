import { detectCategory, getNextQuestion } from './questionEngine.js';
import { URGENT_PATTERNS } from '../data/questionFlows.js';
import { safeFetch } from './apiClient.js';

/**
 * AI Service Layer connecting to PreCare Backend
 * Supports:
 *   - OpenRouter API (Default in Production)
 *   - Local Ollama with model `qwen3:8b` (Development option)
 *
 * Performance Optimizations:
 * - Direct JSON output
 * - Capped token generation
 * - 1 single AI call per patient turn
 * - Automatic rule-based fallback if AI is offline
 */

class AIService {
  constructor() {
    this.modelName = 'meta-llama/llama-3.1-8b-instruct';
  }

  /**
   * Check connection status of active AI service via backend.
   * @returns {Promise<{ ok: boolean, provider?: string, model?: string, error?: string }>}
   */
  async checkStatus() {
    const res = await safeFetch('/api/ai/status');
    if (res.ok) {
      return {
        ok: true,
        provider: res.provider,
        model: res.model,
        server: res.server,
      };
    }
    return {
      ok: false,
      error: res.error || 'AI service is currently unavailable.',
    };
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
   * Analyze initial patient complaint using PreCare AI backend.
   * Extracts category, chief complaint, and any inline duration or location already stated.
   *
   * @param {string} rawComplaint
   * @returns {Promise<Object>}
   */
  async analyzeInitialComplaint(rawComplaint) {
    const trimmed = rawComplaint.trim();
    const urgency = this.screenUrgency(trimmed);

    let extractedData = null;

    try {
      const res = await safeFetch('/api/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({ complaint: trimmed }),
      });

      if (res.ok && res.data) {
        extractedData = res.data;
      }
    } catch (err) {
      console.warn('[AI Client] Complaint analysis network notice:', err.message);
    }

    // Heuristic fallback if AI is unavailable
    if (!extractedData) {
      extractedData = {
        category: detectCategory(trimmed),
        duration: null,
        location: null,
        severity: null,
      };
    }

    const category = extractedData.category || detectCategory(trimmed);

    const history = {
      chief_complaint: trimmed,
      category,
      duration: extractedData.duration || 'Not reported',
      location: extractedData.location || 'Not reported',
      severity: extractedData.severity || 'Not reported',
      associated_symptoms: {},
      red_flags: urgency.isUrgent ? [urgency.reason] : [],
      extra_notes: '',
    };

    const firstQuestion = getNextQuestion(history, 0);

    return {
      history,
      urgency,
      category,
      firstQuestion,
    };
  }

  /**
   * Process patient's answer using PreCare AI backend.
   * Updates clinical history and generates next relevant question.
   *
   * @param {string} patientAnswer
   * @param {string} targetField
   * @param {Object} currentHistory
   * @returns {Promise<{ acknowledgement: string, nextQuestion: Object|null, updatedHistory: Object, urgency: Object }>}
   */
  async processAnswer(patientAnswer, targetField, currentHistory) {
    const trimmed = patientAnswer.trim();
    const urgency = this.screenUrgency(trimmed);

    let extractedValue = trimmed;
    let acknowledgement = 'Thank you, noted.';

    try {
      const res = await safeFetch('/api/ai/extract', {
        method: 'POST',
        body: JSON.stringify({
          patientAnswer: trimmed,
          targetField,
        }),
      });

      if (res.ok && res.data) {
        extractedValue = res.data.extracted_value || trimmed;
        acknowledgement = res.data.acknowledgement || 'Thank you, noted.';
      }
    } catch (err) {
      console.warn('[AI Client] Answer extraction notice:', err.message);
      if (
        /^(no|nope|not really|none|nil|negative|never)/i.test(trimmed)
      ) {
        extractedValue = 'Denied (No)';
      } else if (
        /^(yes|yeah|yep|sure|correct|true)/i.test(trimmed)
      ) {
        extractedValue = 'Confirmed (Yes)';
      }
    }

    const updatedHistory = {
      ...currentHistory,
      associated_symptoms: { ...(currentHistory.associated_symptoms || {}) },
      red_flags: [...(currentHistory.red_flags || [])],
    };

    if (urgency.isUrgent && !updatedHistory.red_flags.includes(urgency.reason)) {
      updatedHistory.red_flags.push(urgency.reason);
    }

    if (targetField && targetField !== 'open') {
      if (
        targetField.startsWith('associated_') ||
        ['fever', 'nausea', 'vomiting', 'photophobia', 'shortness_of_breath', 'chest_tightness'].includes(targetField)
      ) {
        updatedHistory.associated_symptoms[targetField] = extractedValue;
      } else if (targetField === 'onset_and_location') {
        if (!updatedHistory.duration || updatedHistory.duration === 'Not reported') {
          updatedHistory.duration = extractedValue;
        }
        if (!updatedHistory.location || updatedHistory.location === 'Not reported') {
          updatedHistory.location = extractedValue;
        }
      } else {
        updatedHistory[targetField] = extractedValue;
      }
    }

    const currentTurn =
      Object.keys(updatedHistory.associated_symptoms).length +
      (updatedHistory.severity !== 'Not reported' ? 1 : 0);

    const nextQuestion = getNextQuestion(updatedHistory, currentTurn);

    return {
      acknowledgement,
      nextQuestion,
      updatedHistory,
      urgency,
    };
  }
}

export const aiService = new AIService();
export default aiService;
