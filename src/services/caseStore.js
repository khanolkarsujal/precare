/**
 * caseStore.js
 *
 * Manages patient cases with strict Clinic Isolation.
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

import { apiUrl } from './apiClient.js';
import { clinicAuthStore } from './clinicAuthStore.js';

const LOCAL_STORAGE_CASES = 'precare_patient_cases';

function loadStoredCases() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CASES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[caseStore] Error reading local cases:', e);
    return [];
  }
}

let _cases = loadStoredCases();
let _listeners = [];

function persistCases() {
  try {
    localStorage.setItem(LOCAL_STORAGE_CASES, JSON.stringify(_cases));
  } catch (e) {
    console.error('[caseStore] Error persisting local cases:', e);
  }
}

function notify() {
  _listeners.forEach((fn) => fn([..._cases]));
}

/** Deep-clone a case object to prevent external mutation */
function cloneCase(c) {
  return {
    ...c,
    patientData: { ...c.patientData },
    history: c.history ? { ...c.history } : null,
    conversation: c.conversation ? [...c.conversation] : [],
    soap: { ...(c.soap || {}) },
    doctorEditedHistory: { ...(c.doctorEditedHistory || {}) },
  };
}

/** Helper to send authenticated case updates to backend API */
async function sendCaseUpdate(caseId, payload) {
  try {
    const res = await fetch(apiUrl(`/api/cases/${caseId}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
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
      const errData = await res.json().catch(() => ({}));
      console.warn('[caseStore] Case update warning:', errData);
      return { ok: false, error: errData.error || 'Update failed' };
    }

    return { ok: true };
  } catch (e) {
    console.warn('[caseStore] Network error updating case:', e.message);
    return { ok: false, error: e.message };
  }
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
   * Sync cases from server for a specific clinic using Bearer token authentication.
   */
  async syncClinicCases(clinicId) {
    if (!clinicId) return { ok: false, error: 'Missing clinic ID' };

    try {
      const res = await fetch(apiUrl(`/api/clinics/${clinicId}/cases`), {
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

      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.cases)) {
          // Keep cases from other clinics in local cache, replace current clinic cases
          const otherCases = _cases.filter((c) => c.clinicId !== clinicId);
          _cases = [...data.cases, ...otherCases];
          persistCases();
          notify();
          return { ok: true, count: data.cases.length };
        }
      }
      return { ok: false, error: 'Failed to fetch queue' };
    } catch (e) {
      console.warn('[caseStore] Could not sync cases from server:', e.message);
      return { ok: false, error: e.message };
    }
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

  /** Get a single case by ID. */
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

    const newCase = {
      id: `case-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      clinicId,
      status: 'Waiting',
      submittedAt: now.toISOString(),
      submittedTimeLabel: timeLabel,
      submittedDateLabel: dateLabel,
      patientData: { ...patientData },
      history: history ? { ...history } : null,
      conversation: conversation ? [...conversation] : [],
      doctorNotes: '',
      soap: { subjective: '', objective: '', assessment: '', plan: '' },
      doctorEditedHistory: {},
    };

    // Optimistic local update
    _cases = [newCase, ..._cases];
    persistCases();
    notify();

    // Async server persistence (Public patient submission)
    try {
      fetch(apiUrl('/api/cases'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId, patientData, history, conversation }),
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.case) {
            const idx = _cases.findIndex((c) => c.id === newCase.id);
            if (idx !== -1) {
              _cases[idx] = data.case;
              persistCases();
              notify();
            }
          }
        }
      }).catch((e) => console.warn('[caseStore] Server save background warning:', e.message));
    } catch (e) {
      console.warn('[caseStore] Sync attempt error:', e);
    }

    return newCase;
  },

  /**
   * Update the status of a case with Bearer authorization.
   */
  updateStatus(caseId, status) {
    _cases = _cases.map((c) => (c.id === caseId ? { ...c, status } : c));
    persistCases();
    notify();

    sendCaseUpdate(caseId, { status });
  },

  /**
   * Start consultation — sets status to 'In Consultation' with Bearer authorization.
   */
  startConsultation(caseId) {
    _cases = _cases.map((c) => {
      if (c.id !== caseId) return c;
      if (c.status === 'Completed') return c;
      return { ...c, status: 'In Consultation' };
    });
    persistCases();
    notify();

    sendCaseUpdate(caseId, { status: 'In Consultation' });
  },

  /**
   * Save doctor consultation data without changing status (auto-save).
   */
  saveConsultation(caseId, { doctorNotes, soap, doctorEditedHistory }) {
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

    sendCaseUpdate(caseId, { doctorNotes, soap, doctorEditedHistory });
  },

  /**
   * Complete consultation — saves all data and sets status to 'Completed'.
   */
  completeConsultation(caseId, { doctorNotes, soap, doctorEditedHistory }) {
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

    sendCaseUpdate(caseId, {
      status: 'Completed',
      doctorNotes,
      soap,
      doctorEditedHistory,
      completedAt,
    });
  },
};

export default caseStore;
