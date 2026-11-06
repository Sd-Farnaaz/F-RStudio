const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://f-rstudio-production.up.railway.app';
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '').replace(/\/api$/, '');

/**
 * Returns a fully qualified image URL.
 * Handles base64 data URLs, external HTTP(S) links, and relative server upload paths.
 * Safely handles missing/orphaned local filenames by returning fallback.
 * 
 * @param {string|null|undefined} path 
 * @param {string} fallback 
 * @returns {string}
 */
export function getImageUrl(path, fallback = '') {
  if (!path || typeof path !== 'string') return fallback;
  const trimmed = path.trim();
  if (!trimmed) return fallback;

  // Base64 data URLs, absolute URLs, and object/blob URLs are valid as-is
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // If path is a bare orphaned filename without any path separator (e.g. "410d278085444ca09622136bdfa591a5.jpg")
  // it is a leftover artifact from old ephemeral container disk; return fallback so no 404 network request is fired
  if (!trimmed.includes('/') && !trimmed.includes('\\')) {
    return fallback;
  }

  return `${API_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}
