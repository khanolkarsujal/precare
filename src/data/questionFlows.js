/**
 * Question flows and clinical category schemas for PreCare.
 * Each category defines priority fields, natural conversational prompts, and extraction heuristics.
 */

export const COMPLAINT_CATEGORIES = {
  ABDOMINAL_PAIN: 'abdominal_pain',
  HEADACHE: 'headache',
  FEVER: 'fever',
  CHEST_RESPIRATORY: 'chest_respiratory',
  GENERAL: 'general',
};

export const CATEGORY_KEYWORDS = {
  [COMPLAINT_CATEGORIES.ABDOMINAL_PAIN]: [
    'stomach', 'abdomen', 'abdominal', 'belly', 'tummy', 'gut', 'cramp', 'pet dard', 'digestive', 'navel', 'gastric'
  ],
  [COMPLAINT_CATEGORIES.HEADACHE]: [
    'headache', 'head ache', 'head pain', 'migraine', 'sar dard', 'throbbing head', 'temple'
  ],
  [COMPLAINT_CATEGORIES.FEVER]: [
    'fever', 'temperature', 'chills', 'bukhar', 'shivering', 'high temp', 'sweating fever'
  ],
  [COMPLAINT_CATEGORIES.CHEST_RESPIRATORY]: [
    'chest', 'breath', 'breathing', 'cough', 'shortness of breath', 'chhati', 'wheezing', 'phlegm'
  ],
};

/**
 * Priority question sequences by category.
 * Each field contains:
 * - prompt: The question to ask the patient.
 * - label: Friendly name for the Collected Information panel.
 * - type: 'text' | 'scale' | 'boolean_or_detail'
 * - isUrgentTrigger: Optional validator for potential red flags.
 */
export const CATEGORY_FLOWS = {
  [COMPLAINT_CATEGORIES.ABDOMINAL_PAIN]: {
    name: 'Abdominal Pain',
    fields: [
      {
        id: 'location',
        label: 'Pain Location',
        prompt: 'Where exactly do you feel the pain (such as upper stomach, lower right, or all over)?',
        priority: 1,
      },
      {
        id: 'duration',
        label: 'Duration',
        prompt: 'How long have you had this stomach pain?',
        priority: 2,
      },
      {
        id: 'severity',
        label: 'Severity (1-10)',
        prompt: 'How severe is the pain on a scale from 1 to 10 (where 10 is unbearable)?',
        priority: 3,
      },
      {
        id: 'vomiting_nausea',
        label: 'Nausea / Vomiting',
        prompt: 'Have you experienced any nausea or vomiting?',
        priority: 4,
      },
      {
        id: 'bowel_changes',
        label: 'Bowel Habits / Food Relation',
        prompt: 'Have you noticed loose stools, constipation, or does the pain change after eating?',
        priority: 5,
      },
      {
        id: 'fever',
        label: 'Associated Fever',
        prompt: 'Do you have any fever or chills accompanying the pain?',
        priority: 6,
      },
      {
        id: 'medical_history',
        label: 'Past Medical History',
        prompt: 'Do you have any existing medical conditions (like ulcers, diabetes, or gallstones), or had surgery before?',
        priority: 7,
      },
      {
        id: 'medications',
        label: 'Current Medications',
        prompt: 'Have you taken any medications or antacids for this pain?',
        priority: 8,
      },
    ],
  },

  [COMPLAINT_CATEGORIES.HEADACHE]: {
    name: 'Headache',
    fields: [
      {
        id: 'location',
        label: 'Headache Location',
        prompt: 'Where is the headache located (e.g. one side, forehead, back of head, or all over)?',
        priority: 1,
      },
      {
        id: 'duration',
        label: 'Duration',
        prompt: 'How long has this headache been bothering you, or when did it start?',
        priority: 2,
      },
      {
        id: 'severity',
        label: 'Severity (1-10)',
        prompt: 'How intense is the headache on a scale from 1 to 10?',
        priority: 3,
      },
      {
        id: 'onset',
        label: 'Onset Type',
        prompt: 'Did the headache begin suddenly within seconds (like a thunderclap) or did it build up gradually?',
        priority: 4,
      },
      {
        id: 'vision_dizziness',
        label: 'Vision Changes / Nausea',
        prompt: 'Are you experiencing any blurred vision, sensitivity to light, or nausea?',
        priority: 5,
      },
      {
        id: 'fever_neck',
        label: 'Fever or Neck Stiffness',
        prompt: 'Do you have any fever or stiffness when trying to bend your neck?',
        priority: 6,
      },
      {
        id: 'medical_history',
        label: 'Past History',
        prompt: 'Do you have a history of migraines, high blood pressure, or frequent headaches?',
        priority: 7,
      },
      {
        id: 'medications',
        label: 'Current Medications',
        prompt: 'Are you currently taking any painkillers or regular prescriptions?',
        priority: 8,
      },
    ],
  },

  [COMPLAINT_CATEGORIES.FEVER]: {
    name: 'Fever',
    fields: [
      {
        id: 'duration',
        label: 'Duration',
        prompt: 'How many days or hours have you had this fever?',
        priority: 1,
      },
      {
        id: 'temperature',
        label: 'Temperature / Chills',
        prompt: 'Have you checked your temperature with a thermometer, or do you have shivering and chills?',
        priority: 2,
      },
      {
        id: 'severity',
        label: 'Discomfort Level (1-10)',
        prompt: 'On a scale of 1 to 10, how severe is your weakness or discomfort?',
        priority: 3,
      },
      {
        id: 'cough_throat',
        label: 'Cough / Sore Throat',
        prompt: 'Do you have any cough, sore throat, or runny nose?',
        priority: 4,
      },
      {
        id: 'body_ache',
        label: 'Body Aches / Headache',
        prompt: 'Are you experiencing joint pains, body ache, or a severe headache?',
        priority: 5,
      },
      {
        id: 'rash_urination',
        label: 'Rash / Other Symptoms',
        prompt: 'Have you noticed any skin rash, vomiting, or burning sensation during urination?',
        priority: 6,
      },
      {
        id: 'medical_history',
        label: 'Medical History',
        prompt: 'Do you have any underlying conditions like diabetes, asthma, or heart issues?',
        priority: 7,
      },
      {
        id: 'medications',
        label: 'Current Medications',
        prompt: 'Have you taken paracetamol or any other fever medications recently?',
        priority: 8,
      },
    ],
  },

  [COMPLAINT_CATEGORIES.CHEST_RESPIRATORY]: {
    name: 'Chest / Respiratory Discomfort',
    fields: [
      {
        id: 'location',
        label: 'Description & Location',
        prompt: 'Where exactly do you feel the discomfort, and how does it feel (tightness, sharpness, or pressure)?',
        priority: 1,
      },
      {
        id: 'duration',
        label: 'Duration',
        prompt: 'When did this sensation start and how long has it lasted?',
        priority: 2,
      },
      {
        id: 'severity',
        label: 'Severity (1-10)',
        prompt: 'On a scale of 1 to 10, how severe is the discomfort?',
        priority: 3,
      },
      {
        id: 'radiation',
        label: 'Spread / Sweating',
        prompt: 'Does the discomfort spread to your left arm, neck, jaw, or back, and are you sweating?',
        priority: 4,
      },
      {
        id: 'breathing_cough',
        label: 'Breathing / Cough',
        prompt: 'Do you feel shortness of breath, or do you have a cough?',
        priority: 5,
      },
      {
        id: 'medical_history',
        label: 'Medical History',
        prompt: 'Do you have any history of heart issues, high blood pressure, or asthma?',
        priority: 6,
      },
      {
        id: 'medications',
        label: 'Current Medications',
        prompt: 'Are you taking any regular medications or inhalers?',
        priority: 7,
      },
    ],
  },

  [COMPLAINT_CATEGORIES.GENERAL]: {
    name: 'General Health Inquiry',
    fields: [
      {
        id: 'duration',
        label: 'Duration',
        prompt: 'How long have you been experiencing this health problem?',
        priority: 1,
      },
      {
        id: 'location',
        label: 'Location / Specific Area',
        prompt: 'Where specifically in your body do you notice this issue?',
        priority: 2,
      },
      {
        id: 'severity',
        label: 'Severity (1-10)',
        prompt: 'How much is this affecting your daily activities on a scale from 1 to 10?',
        priority: 3,
      },
      {
        id: 'triggers',
        label: 'Aggravating / Relieving Factors',
        prompt: 'Is there anything specific that makes your symptoms better or worse?',
        priority: 4,
      },
      {
        id: 'associated_symptoms',
        label: 'Associated Symptoms',
        prompt: 'Are you having any other symptoms such as fever, fatigue, or nausea?',
        priority: 5,
      },
      {
        id: 'medical_history',
        label: 'Medical History',
        prompt: 'Do you have any past medical conditions or chronic illnesses?',
        priority: 6,
      },
      {
        id: 'medications',
        label: 'Current Medications',
        prompt: 'Are you currently taking any prescribed medications or supplements?',
        priority: 7,
      },
    ],
  },
};

/**
 * Potential urgent red-flag triggers to highlight for the clinician.
 * NOTE: The assistant will NOT diagnose or panic the patient,
 * but will safely flag this internally in the structured history.
 */
export const URGENT_PATTERNS = [
  {
    regex: /(vomit(ing|ed)?\s+blood|blood\s+in\s+(stool|vomit|urine)|black\s+tarry)/i,
    reason: 'Reported gastrointestinal bleeding signs',
  },
  {
    regex: /(chest\s+pressure|radiating\s+to\s+(left\s+)?arm|crushing\s+chest)/i,
    reason: 'Potential acute cardiac / chest pressure symptoms',
  },
  {
    regex: /(thunderclap|worst\s+headache\s+of\s+(my\s+)?life|sudden\s+severe\s+headache)/i,
    reason: 'Sudden high-intensity headache reported',
  },
  {
    regex: /(cannot\s+breathe|gasping|severe\s+shortness\s+of\s+breath|blue\s+lips)/i,
    reason: 'Severe respiratory distress reported',
  },
  {
    regex: /(fainted|unconscious|passed\s+out|seizure|convulsion)/i,
    reason: 'Loss of consciousness or neurological event',
  },
];
