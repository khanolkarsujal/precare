/**
 * apiClient.js
 *
 * Centralized API client for PreCare SaaS.
 * All backend API requests must resolve to the deployed FastAPI backend:
 * https://precare-1.onrender.com
 *
 * Uses import.meta.env.VITE_API_URL when set, with a safe production fallback to
 * https://precare-1.onrender.com so deployed builds never make relative requests
 * to the Vercel static host (/api/...) which causes 405 Method Not Allowed.
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

/**
 * Reliable, production-hardened fetch wrapper.
 * - Always targets the correct API host.
 * - Validates response.ok and inspects Content-Type before parsing JSON.
 * - Handles 200, 201, 400, 401, 403, 404, 405, 422, 500, 502, 503 cleanly.
 * - Never exposes sensitive keys or credentials in error messages.
 *
 * @param {string} endpoint - e.g. '/api/auth/login'
 * @param {RequestInit} [options] - fetch options
 * @returns {Promise<{ ok: boolean, status: number, data?: any, error?: string, [key: string]: any }>}
 */
export async function safeFetch(endpoint, options = {}) {
  const targetUrl = apiUrl(endpoint);

  try {
    const res = await fetch(targetUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';
    let parsedData = null;

    if (contentType.includes('application/json')) {
      try {
        parsedData = await res.json();
      } catch {
        parsedData = null;
      }
    } else {
      const text = await res.text().catch(() => '');
      parsedData = text ? { raw: text } : null;
    }

    if (!res.ok) {
      let errorMessage = 'Request failed. Please try again.';

      if (parsedData) {
        if (typeof parsedData.detail === 'string') {
          errorMessage = parsedData.detail;
        } else if (parsedData.detail && typeof parsedData.detail.error === 'string') {
          errorMessage = parsedData.detail.error;
        } else if (typeof parsedData.error === 'string') {
          errorMessage = parsedData.error;
        } else if (parsedData.raw) {
          errorMessage = `Server response (${res.status}): ${parsedData.raw.slice(0, 100)}`;
        }
      } else if (res.status === 401) {
        errorMessage = 'Unauthorized: Session expired or invalid credentials.';
      } else if (res.status === 403) {
        errorMessage = 'Forbidden: You do not have permission to access this resource.';
      } else if (res.status === 404) {
        errorMessage = 'Requested resource not found.';
      } else if (res.status === 405) {
        errorMessage = 'Method Not Allowed. Verify backend endpoint URL.';
      } else if (res.status >= 500) {
        errorMessage = 'Server error. Please try again in a few moments.';
      }

      return {
        ok: false,
        status: res.status,
        error: errorMessage,
        data: parsedData,
      };
    }

    return {
      ok: true,
      status: res.status,
      ...(parsedData || {}),
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err.message || 'Network error. Could not connect to PreCare server.',
    };
  }
}

export default apiUrl;
