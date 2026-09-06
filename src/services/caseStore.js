/**
 * caseStore.js
 *
 * Manages patient cases with strict Multi-Tenant Clinic Isolation.
 * The deployed backend and PostgreSQL database are the single source of truth.
 *
 * Doctor operations (queue fetch and case updates) send cryptographic Bearer authentication.
 * Public patient intake submission remains accessible without doctor authentication.
 *
 * Case schema:
 * {
 *   id, clinicId, status, submittedAt, submittedTimeLabel, submittedDateLabel,
 *   patientData, history, conversation,
 *   doctorNotes: "",
 *   soap: { subjective, objective, assessment, plan },
 *   doctorEditedHistory: {}
 * }
 *
 * Status values: 'Waiting' | 'In Consultation' | 'Completed'
 */

import { safeFetch } from './apiClient.js';
import { clinicAuthStore } from './clinicAuthStore.js';

const LOCAL_STORAGE_CASES = 'precare_patient_cases';

function loadStoredCases() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CASES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[caseStore] Error reading local cases cache:', e);
    return [];
  }
}

let _cases = loadStoredCases();
let _listeners = [];

function persistCases() {
  try {
    localStorage.setItem(LOCAL_STORAGE_CASES, JSON.stringify(_cases));
  } catch (e) {
    console.error('[caseStore] Error persisting local cases cache:', e);
  }
}

function notify() {
  _listeners.forEach((fn) => fn([..._cases]));
}

/** Deep-clone a case object to prevent external mutation */
function cloneCase(c) {
  if (!c) return null;
  return {
    ...c,
    patientData: { ...(c.patientData || {}) },
    history: c.history ? { ...c.history } : null,
    conversation: Array.isArray(c.conversation) ? [...c.conversation] : [],
    soap: { ...(c.soap || {}) },
    doctorEditedHistory: { ...(c.doctorEditedHistory || {}) },
  };
}

/** Helper to send authenticated case updates to backend API */
async function sendCaseUpdate(caseId, payload) {
  const res = await safeFetch(`/api/cases/${caseId}`, {
    method: 'PUT',
    headers: {
      ...clinicAuthStore.getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    console.warn('[caseStore] 401 Unauthorized: Session expired.');
    clinicAuthStore.handleAuthExpired();
    return { ok: false, status: 401, error: 'Session expired' };
  }

  if (res.status === 403) {
    console.error('[caseStore] 403 Forbidden: You do not own this patient case.');
    return { ok: false, status: 403, error: 'Access denied' };
  }

  if (!res.ok) {
    console.warn('[caseStore] Case update warning:', res.error);
    return { ok: false, error: res.error || 'Update failed' };
  }

  return { ok: true, case: res.case };
}

export const caseStore = {
  /**
   * Subscribe to case list changes.
   * @param {(cases: Array) => void} fn
   * @returns {() => void} unsubscribe function
   */
  subscribe(fn) {
    _listeners.push(fn);
    fn(_cases.map(cloneCase));
    return () => {
      _listeners = _listeners.filter((l) => l !== fn);
    };
  },

  /**
   * Sync cases from PostgreSQL backend for a specific clinic using Bearer token authentication.
   */
  async syncClinicCases(clinicId) {
    if (!clinicId) return { ok: false, error: 'Missing clinic ID' };

    const res = await safeFetch(`/api/clinics/${clinicId}/cases`, {
      headers: {
        ...clinicAuthStore.getAuthHeaders(),
      },
    });

    if (res.status === 401) {
      console.warn('[caseStore] 401 Unauthorized: Session expired on cases sync.');
      clinicAuthStore.handleAuthExpired();
      return { ok: false, status: 401, error: 'Session expired. Please log in again.' };
    }

    if (res.status === 403) {
      console.error('[caseStore] 403 Forbidden: Access denied to this clinic queue.');
      return { ok: false, status: 403, error: 'Access denied to this clinic queue.' };
    }

    if (res.ok && Array.isArray(res.cases)) {
      // Keep cases from other clinics in local cache, replace current clinic cases with backend data
      const otherCases = _cases.filter((c) => c.clinicId !== clinicId);
      _cases = [...res.cases, ...otherCases];
      persistCases();
      notify();
      return { ok: true, count: res.cases.length, cases: res.cases };
    }

    return { ok: false, error: res.error || 'Failed to fetch queue' };
  },

  /**
   * Fetch a single case directly from the backend.
   */
  async fetchCaseById(caseId) {
    if (!caseId) return null;

    const res = await safeFetch(`/api/cases/${caseId}`, {
      headers: {
        ...clinicAuthStore.getAuthHeaders(),
      },
    });

    if (res.ok && res.case) {
      const idx = _cases.findIndex((c) => c.id === caseId);
      if (idx !== -1) {
        _cases[idx] = res.case;
      } else {
        _cases = [res.case, ..._cases];
      }
      persistCases();
      notify();
      return cloneCase(res.case);
    }

    return this.getCaseById(caseId);
  },

  /**
   * Get cases filtered by clinic ID (Clinic Isolation).
   * @param {string} [clinicId] - If provided, returns only cases for that clinic.
   */
  getCases(clinicId) {
    if (clinicId) {
      return _cases.filter((c) => c.clinicId === clinicId).map(cloneCase);
    }
    return _cases.map(cloneCase);
  },

  /** Get a single case by ID from cache. */
  getCaseById(id) {
    const c = _cases.find((c) => c.id === id);
    return c ? cloneCase(c) : undefined;
  },

  /**
   * Submit a completed patient case to a clinic's queue.
   * Public patient intake endpoint (does not require doctor authentication).
   *
   * @param {Object} patientData  - { name, age, gender, language, complaint }
   * @param {Object} history      - Structured health history from AI
   * @param {Array}  conversation - Array of { role, content, timestamp }
   * @param {string} [clinicId]   - ID of the clinic receiving this intake
   * @returns {Promise<Object>} The created case record
   */
  async submitCase(patientData, history, conversation, clinicId = 'default-clinic') {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateLabel = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

    const localCase = {
      id: `case-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      clinicId,
      status: 'Waiting',
      submittedAt: now.toISOString(),
      submittedTimeLabel: timeLabel,
      submittedDateLabel: dateLabel,
      patientData: { ...patientData },
      history: history ? { ...history } : null,
      conversation: Array.isArray(conversation) ? [...conversation] : [],
      doctorNotes: '',
      soap: { subjective: '', objective: '', assessment: '', plan: '' },
      doctorEditedHistory: {},
    };

    // Optimistic cache update
    _cases = [localCase, ..._cases];
    persistCases();
    notify();

    // Persist to FastAPI & PostgreSQL
    try {
      const res = await safeFetch('/api/cases', {
        method: 'POST',
        body: JSON.stringify({ clinicId, patientData, history, conversation }),
      });

      if (res.ok && res.case) {
        const idx = _cases.findIndex((c) => c.id === localCase.id);
        if (idx !== -1) {
          _cases[idx] = res.case;
          persistCases();
          notify();
        }
        return res.case;
      }
    } catch (e) {
      console.warn('[caseStore] Server sync notice:', e.message);
    }

    return localCase;
  },

  /**
   * Update the status of a case with Bearer authorization.
   */
  async updateStatus(caseId, status) {
    _cases = _cases.map((c) => (c.id === caseId ? { ...c, status } : c));
    persistCases();
    notify();

    return await sendCaseUpdate(caseId, { status });
  },

  /**
   * Start consultation — sets status to 'In Consultation' with Bearer authorization.
   */
  async startConsultation(caseId) {
    _cases = _cases.map((c) => {
      if (c.id !== caseId) return c;
      if (c.status === 'Completed') return c;
      return { ...c, status: 'In Consultation' };
    });
    persistCases();
    notify();

    return await sendCaseUpdate(caseId, { status: 'In Consultation' });
  },

  /**
   * Save doctor consultation data without changing status (auto-save).
   */
  async saveConsultation(caseId, { doctorNotes, soap, doctorEditedHistory }) {
    _cases = _cases.map((c) => {
      if (c.id !== caseId) return c;
      return {
        ...c,
        doctorNotes: doctorNotes ?? c.doctorNotes,
        soap: { ...(c.soap || {}), ...(soap || {}) },
        doctorEditedHistory: { ...(c.doctorEditedHistory || {}) },
      };
    });
    persistCases();
    notify();

    return await sendCaseUpdate(caseId, { doctorNotes, soap, doctorEditedHistory });
  },

  /**
   * Complete consultation — saves all data and sets status to 'Completed'.
   */
  async completeConsultation(caseId, { doctorNotes, soap, doctorEditedHistory }) {
    const completedAt = new Date().toISOString();
    _cases = _cases.map((c) => {
      if (c.id !== caseId) return c;
      return {
        ...c,
        status: 'Completed',
        doctorNotes: doctorNotes ?? c.doctorNotes,
        soap: { ...(c.soap || {}), ...(soap || {}) },
        doctorEditedHistory: { ...(c.doctorEditedHistory || {}) },
        completedAt,
      };
    });
    persistCases();
    notify();

    return await sendCaseUpdate(caseId, {
      status: 'Completed',
      doctorNotes,
      soap,
      doctorEditedHistory,
      completedAt,
    });
  },
};

export default caseStore;
