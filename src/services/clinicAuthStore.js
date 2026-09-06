/**
 * clinicAuthStore.js
 *
 * Client-side authentication and clinic session management for PreCare SaaS.
 * Manages active clinic profile and cryptographic Bearer session tokens.
 * Persists session safely across browser refreshes.
 * Never stores passwords or sensitive database credentials.
 */

import { safeFetch } from './apiClient.js';

const STORAGE_KEY = 'precare_active_clinic';
const TOKEN_KEY = 'precare_auth_token';
let _listeners = [];

function loadStoredClinic() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('[clinicAuthStore] Error loading clinic from storage:', e);
    return null;
  }
}

let _activeClinic = loadStoredClinic();

function notify() {
  const snapshot = _activeClinic ? { ..._activeClinic } : null;
  _listeners.forEach((fn) => fn(snapshot));
}

function setSession(clinic, token) {
  _activeClinic = clinic ? { ...clinic } : null;
  try {
    if (clinic) {
      const clinicStr = JSON.stringify(clinic);
      sessionStorage.setItem(STORAGE_KEY, clinicStr);
      localStorage.setItem(STORAGE_KEY, clinicStr);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    }

    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOKEN_KEY, token);
    } else if (clinic === null) {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) {
    console.error('[clinicAuthStore] Error updating storage:', e);
  }
  notify();
}

export const clinicAuthStore = {
  /**
   * Subscribe to clinic session changes (login, logout, profile updates).
   * @param {(clinic: Object|null) => void} fn
   * @returns {() => void} unsubscribe function
   */
  subscribe(fn) {
    _listeners.push(fn);
    fn(_activeClinic ? { ..._activeClinic } : null);
    return () => {
      _listeners = _listeners.filter((l) => l !== fn);
    };
  },

  /** Get snapshot of current active clinic */
  getCurrentClinic() {
    return _activeClinic ? { ..._activeClinic } : null;
  },

  /** Get the active authentication token (checked across session and local storage) */
  getToken() {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || '';
    } catch {
      return '';
    }
  },

  /** Helper to generate Authorization headers for authenticated requests */
  getAuthHeaders() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  /**
   * Register a new clinic account against the deployed backend.
   */
  async signup({ clinicName, doctorName, email, phone, password }) {
    const res = await safeFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ clinicName, doctorName, email, phone, password }),
    });

    if (!res.ok) {
      return { ok: false, error: res.error || 'Signup failed. Please try again.' };
    }

    setSession(res.clinic, res.token);
    return { ok: true, clinic: res.clinic, token: res.token };
  },

  /**
   * Log in to an existing clinic account against the deployed backend.
   */
  async login(email, password) {
    const res = await safeFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      return { ok: false, error: res.error || 'Invalid email or password.' };
    }

    setSession(res.clinic, res.token);
    return { ok: true, clinic: res.clinic, token: res.token };
  },

  /**
   * Update clinic profile (specialization, location, languages, etc.)
   */
  async updateClinic(clinicId, updates) {
    const res = await safeFetch(`/api/clinics/${clinicId}`, {
      method: 'PUT',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      if (res.status === 401) {
        this.handleAuthExpired();
      }
      return { ok: false, error: res.error || 'Failed to update clinic profile.' };
    }

    setSession(res.clinic);
    return { ok: true, clinic: res.clinic };
  },

  /**
   * Fetch public clinic information for patient intake header (public, no token needed).
   */
  async getClinicById(clinicId) {
    if (!clinicId) return null;

    const res = await safeFetch(`/api/clinics/${clinicId}`);
    if (res.ok && res.clinic) {
      return res.clinic;
    }

    // Fallback if local session matches
    if (_activeClinic && _activeClinic.id === clinicId) {
      return _activeClinic;
    }
    return null;
  },

  /** Handle session expiration */
  handleAuthExpired() {
    console.warn('[clinicAuthStore] Session expired or invalid. Logging out.');
    this.logout();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('precare:auth-expired'));
    }
  },

  /** Log out active clinic */
  logout() {
    setSession(null, null);
  },
};

export default clinicAuthStore;
