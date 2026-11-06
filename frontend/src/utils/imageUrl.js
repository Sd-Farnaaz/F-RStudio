const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://f-rstudio-production.up.railway.app';
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '').replace(/\/api$/, '');

/**
 * Returns a fully qualified image URL.
 * Handles base64 data URLs, external HTTP(S) links, and relative server upload paths.
 * 
 * @param {string|null|undefined} path 
 * @param {string} fallback 
 * @returns {string}
 */
export function getImageUrl(path, fallback = '') {
  if (!path) return fallback;
  if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
    return path;
  }
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}
