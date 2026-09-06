/**
 * apiClient.js
 *
 * Centralized API URL resolver for PreCare.
 * All backend API requests must resolve to the deployed FastAPI backend:
 * https://precare-1.onrender.com
 *
 * Reads import.meta.env.VITE_API_URL.
 * In production builds, if VITE_API_URL is omitted or unset, it safely falls back to:
 * https://precare-1.onrender.com
 * preventing any requests from hitting the Vercel frontend host (/api/...) which causes 405 Method Not Allowed.
 */

const FALLBACK_PRODUCTION_API = 'https://precare-1.onrender.com';

const RAW_BASE = (import.meta.env.VITE_API_URL || '').trim();

export const API_BASE_URL = RAW_BASE
  ? RAW_BASE.replace(/\/+$/, '')
  : (import.meta.env.DEV ? '' : FALLBACK_PRODUCTION_API);

/**
 * Constructs the absolute URL for any API endpoint.
 *
 * Examples:
 *   apiUrl('/api/auth/signup') -> 'https://precare-1.onrender.com/api/auth/signup'
 *   apiUrl('/api/auth/login')  -> 'https://precare-1.onrender.com/api/auth/login'
 *   apiUrl('/api/cases')       -> 'https://precare-1.onrender.com/api/cases'
 *
 * @param {string} endpoint
 * @returns {string} Fully qualified API URL
 */
export function apiUrl(endpoint) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (API_BASE_URL) {
    return `${API_BASE_URL}${cleanEndpoint}`;
  }

  // In local development with Vite dev server proxy
  return cleanEndpoint;
}

export default apiUrl;
