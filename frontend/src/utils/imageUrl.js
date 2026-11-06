const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://f-rstudio-production.up.railway.app';
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '').replace(/\/api$/, '');

/**
 * Returns a fully qualified image URL.
 * Handles base64 data URLs, external HTTP(S) links, and relative server upload paths.
 * Safely handles missing/orphaned local filenames by returning the fallback.
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

  // If path is a bare orphaned filename without any path separator (e.g. "45144180c16c4838bbbd4a1cfacfd92e.jpg")
  if (!trimmed.includes('/') && !trimmed.includes('\\')) {
    return fallback;
  }

  return `${API_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

