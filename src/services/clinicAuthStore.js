/**
 * clinicAuthStore.js
 *
 * Client-side authentication and clinic session management.
 * Manages active clinic profile and cryptographic Bearer session tokens in sessionStorage.
 * Never stores passwords or sensitive credentials.
 */

import { apiUrl } from './apiClient.js';

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
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(clinic));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clinic));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    }

    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else if (clinic === null) {
      sessionStorage.removeItem(TOKEN_KEY);
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

  /** Get the active authentication token from sessionStorage */
  getToken() {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || '';
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
   * Register a new clinic account.
   */
  async signup({ clinicName, doctorName, email, phone, password }) {
    try {
      const res = await fetch(apiUrl('/api/auth/signup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicName, doctorName, email, phone, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        return { ok: false, error: data.error || (data.detail && data.detail.error) || 'Signup failed. Please try again.' };
      }
      setSession(data.clinic, data.token);
      return { ok: true, clinic: data.clinic, token: data.token };
    } catch (err) {
      return { ok: false, error: err.message || 'Network error during signup.' };
    }
  },

  /**
   * Log in to an existing clinic account.
   */
  async login(email, password) {
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        return { ok: false, error: data.error || (data.detail && data.detail.error) || 'Invalid credentials.' };
      }
      setSession(data.clinic, data.token);
      return { ok: true, clinic: data.clinic, token: data.token };
    } catch (err) {
      return { ok: false, error: err.message || 'Network error during login.' };
    }
  },

  /**
   * Update clinic profile (specialization, location, languages, etc.)
   */
  async updateClinic(clinicId, updates) {
    try {
      const res = await fetch(apiUrl(`/api/clinics/${clinicId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (res.status === 401) {
          this.handleAuthExpired();
        }
        return { ok: false, error: data.error || (data.detail && data.detail.error) || 'Failed to update clinic profile.' };
      }
      setSession(data.clinic);
      return { ok: true, clinic: data.clinic };
    } catch (err) {
      return { ok: false, error: err.message || 'Network error during update.' };
    }
  },

  /**
   * Fetch public clinic information for patient intake header (public, no token needed).
   */
  async getClinicById(clinicId) {
    if (!clinicId) return null;
    try {
      const res = await fetch(apiUrl(`/api/clinics/${clinicId}`));
      const data = await res.json();
      if (res.ok && data.ok) {
        return data.clinic;
      }
    } catch (e) {
      console.warn('[clinicAuthStore] Error fetching clinic by ID:', e);
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
    window.dispatchEvent(new CustomEvent('precare:auth-expired'));
  },

  /** Log out active clinic */
  logout() {
    setSession(null, null);
  },
};

export default clinicAuthStore;
