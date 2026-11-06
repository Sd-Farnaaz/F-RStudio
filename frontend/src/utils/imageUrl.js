const defaultBaseUrl = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
  ? window.location.origin
  : 'https://f-rstudio-production.up.railway.app';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || defaultBaseUrl;
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '').replace(/\/api$/, '');

/**
 * Returns a fully qualified image URL.
 * Handles base64 data URLs, external HTTP(S) links, and relative server upload paths.
 * Safely handles missing/orphaned local filenames by returning fallback or formatted url.
 * 
 * @param {string|null|undefined} path 
 * @param {string} fallback 
 * @returns {string}
 */
export function getImageUrl(path, fallback = '') {
  if (!path || typeof path !== 'string') return fallback;
  const trimmed = path.trim();
  if (!trimmed) return fallback;

  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // If path is a bare orphaned filename without any path separator
  if (!trimmed.includes('/') && !trimmed.includes('\\')) {
    return `${API_BASE_URL}/uploads/${trimmed}`;
  }

  return `${API_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}
