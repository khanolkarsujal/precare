/**
 * apiClient.js
 *
 * Centralized API URL resolver respecting the VITE_API_URL environment variable.
 * - In local dev or reverse-proxied production (where VITE_API_URL is empty), it uses relative URLs (/api/...).
 * - In distributed production (where frontend is on domain A and backend is on domain B),
 *   it prepends VITE_API_URL (e.g., https://api.precare.health/api/...).
 */

const RAW_BASE = import.meta.env.VITE_API_URL || '';
export const API_BASE_URL = RAW_BASE ? RAW_BASE.replace(/\/+$/, '') : '';

export function apiUrl(endpoint) {
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${clean}`;
}

export default apiUrl;
