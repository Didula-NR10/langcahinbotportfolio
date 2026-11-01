// Browser-safe defaults. The login screen can override these for the current tab.
export const CONFIG = Object.freeze({
  API_BASE_URL: 'http://127.0.0.1:8000',
  API_PREFIX: '/api/v1',
  SUPABASE_URL: '',
  SUPABASE_PUBLISHABLE_KEY: '',
  MAX_FILE_BYTES: 15 * 1024 * 1024,
  MAX_FILES: 10,
  POLL_INTERVAL_MS: 4000,
  REQUEST_TIMEOUT_MS: 30000,
});

export const ENDPOINTS = Object.freeze({
  documents: '/admin/documents',
  batch: '/admin/documents/batch',
  document: id => `/admin/documents/${encodeURIComponent(id)}`,
  jobs: id => `/admin/documents/${encodeURIComponent(id)}/jobs`,
  file: id => `/admin/documents/${encodeURIComponent(id)}/file`,
  reindex: id => `/admin/documents/${encodeURIComponent(id)}/reindex`,
  download: id => `/admin/documents/${encodeURIComponent(id)}/download`,
  chat: '/chat',
});

export const settings = {
  apiBaseUrl: CONFIG.API_BASE_URL,
  supabaseUrl: CONFIG.SUPABASE_URL,
  publishableKey: CONFIG.SUPABASE_PUBLISHABLE_KEY,
};

export function validateSettings(input) {
  const api = new URL(input.apiBaseUrl);
  const supabase = new URL(input.supabaseUrl);
  const local = ['localhost', '127.0.0.1'].includes(api.hostname);
  if (!['http:', 'https:'].includes(api.protocol) || (!local && api.protocol !== 'https:')) {
    throw new Error('Use HTTPS for the API, or HTTP on localhost.');
  }
  if (supabase.protocol !== 'https:') throw new Error('Supabase URL must use HTTPS.');
  if (!input.publishableKey?.trim()) throw new Error('Enter the Supabase publishable or anon key.');
  settings.apiBaseUrl = api.origin;
  settings.supabaseUrl = supabase.origin;
  settings.publishableKey = input.publishableKey.trim();
}
