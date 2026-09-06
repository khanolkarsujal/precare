import {
  COMPLAINT_CATEGORIES,
  CATEGORY_KEYWORDS,
  CATEGORY_FLOWS,
} from '../data/questionFlows.js';

/**
 * Question Engine
 * Responsible for:
 * 1. Categorizing chief complaint.
 * 2. Evaluating which critical fields are collected vs missing.
 * 3. Selecting the next relevant adaptive question without repeating already-known details.
 * 4. Determining when minimum useful clinical history is complete.
 */

/**
 * Detect category from free-form complaint text.
 * @param {string} text
 * @returns {string} category identifier
 */
export function detectCategory(text) {
  if (!text || typeof text !== 'string') {
    return COMPLAINT_CATEGORIES.GENERAL;
  }

  const lower = text.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }

  return COMPLAINT_CATEGORIES.GENERAL;
}

/**
 * Get the flow configuration for a category.
 * @param {string} category
 */
export function getCategoryConfig(category) {
  return (
    CATEGORY_FLOWS[category] || CATEGORY_FLOWS[COMPLAINT_CATEGORIES.GENERAL]
  );
}

/**
 * Check if a specific field has already been collected in the history state.
 * @param {Object} history
 * @param {string} fieldId
 * @returns {boolean}
 */
export function isFieldCollected(history, fieldId) {
  if (!history) return false;

  // Direct top-level property
  if (history[fieldId] !== undefined && history[fieldId] !== null && history[fieldId] !== '') {
    return true;
  }

  // Nested associated symptoms
  if (
    history.associated_symptoms &&
    history.associated_symptoms[fieldId] !== undefined &&
    history.associated_symptoms[fieldId] !== null &&
    history.associated_symptoms[fieldId] !== ''
  ) {
    return true;
  }

  return false;
}

/**
 * Identify all missing fields for the active complaint category.
 * @param {Object} history
 * @returns {Array<Object>} list of missing field objects
 */
export function getMissingFields(history) {
  const category = history.category || detectCategory(history.chief_complaint);
  const flow = getCategoryConfig(category);

  return flow.fields.filter((field) => !isFieldCollected(history, field.id));
}

/**
 * Check if the minimum useful history for the doctor has been collected.
 * Minimum criteria:
 * - Chief complaint is present
 * - Duration is known
 * - Location or nature is known
 * - Severity is known
 * - At least 1 follow-up clinical inquiry completed
 * OR all category flow questions have been answered.
 *
 * @param {Object} history
 * @param {number} totalQuestionsAsked
 * @returns {boolean}
 */
export function isHistoryComplete(history, totalQuestionsAsked = 0) {
  const missing = getMissingFields(history);

  // If all fields for the category are answered
  if (missing.length === 0) {
    return true;
  }

  // Check core required attributes
  const hasCore =
    Boolean(history.chief_complaint) &&
    isFieldCollected(history, 'duration') &&
    isFieldCollected(history, 'location') &&
    isFieldCollected(history, 'severity');

  const hasBackground =
    isFieldCollected(history, 'medical_history') ||
    isFieldCollected(history, 'medications');

  // If core attributes and background are present and patient has answered 5+ questions
  if (hasCore && hasBackground && totalQuestionsAsked >= 5) {
    return true;
  }

  // Cap at 7 questions to avoid patient fatigue
  if (totalQuestionsAsked >= 7) {
    return true;
  }

  return false;
}

/**
 * Select the next relevant question to ask the patient.
 *
 * @param {Object} history - The current structured history state.
 * @param {number} totalQuestionsAsked - Number of interactive follow-ups asked so far.
 * @returns {{ isComplete: boolean, targetField: string|null, question: string }}
 */
export function getNextQuestion(history, totalQuestionsAsked = 0) {
  if (isHistoryComplete(history, totalQuestionsAsked)) {
    return {
      isComplete: true,
      targetField: null,
      question:
        'Thank you. Your health history is now complete and ready for your doctor to review.',
    };
  }

  const missing = getMissingFields(history);

  if (missing.length === 0) {
    return {
      isComplete: true,
      targetField: null,
      question:
        'Thank you. Your health history is now complete and ready for your doctor to review.',
    };
  }

  // Highest priority missing field
  const nextField = missing[0];

  return {
    isComplete: false,
    targetField: nextField.id,
    question: nextField.prompt,
    fieldLabel: nextField.label,
  };
}
