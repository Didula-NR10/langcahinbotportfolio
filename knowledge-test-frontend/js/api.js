import { CONFIG, ENDPOINTS, settings } from './config.js';
import { getAccessToken, refreshSession } from './auth.js';

export class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.name = 'ApiError'; this.status = status; }
}

export async function request(path, { method = 'GET', body, publicRoute = false, responseType = 'json', retry = true } = {}) {
  const url = `${settings.apiBaseUrl}${CONFIG.API_PREFIX}${path}`;
  const headers = { Accept: responseType === 'blob' ? 'application/pdf' : 'application/json' };
  if (!publicRoute) {
    const token = getAccessToken();
    if (!token) throw new ApiError('Sign in to continue.', 401);
    headers.Authorization = `Bearer ${token}`;
  }
  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetch(url, { method, headers, body: payload, signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT_MS) });
  } catch (error) {
    throw new ApiError(error.name === 'TimeoutError' ? 'Request timed out. Try again.' : 'Cannot reach the API. Check that FastAPI is running and CORS allows this origin.');
  }
  if (response.status === 401 && !publicRoute && retry) {
    try {
      await refreshSession();
      return request(path, { method, body, publicRoute, responseType, retry: false });
    } catch { throw new ApiError('Your session expired. Sign in again.', 401); }
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const detail = data?.error?.message || data?.detail || data?.message;
    throw new ApiError(typeof detail === 'string' ? detail : `Request failed (${response.status}).`, response.status);
  }
  if (response.status === 204) return null;
  return responseType === 'blob' ? response.blob() : response.json();
}

export const api = {
  list: (limit = 100, offset = 0) => request(`${ENDPOINTS.documents}?limit=${limit}&offset=${offset}`),
  get: id => request(ENDPOINTS.document(id)),
  jobs: id => request(ENDPOINTS.jobs(id)),
  upload: form => request(ENDPOINTS.documents, { method: 'POST', body: form }),
  uploadBatch: form => request(ENDPOINTS.batch, { method: 'POST', body: form }),
  update: (id, data) => request(ENDPOINTS.document(id), { method: 'PATCH', body: data }),
  replace: (id, form) => request(ENDPOINTS.file(id), { method: 'PUT', body: form }),
  remove: id => request(ENDPOINTS.document(id), { method: 'DELETE' }),
  reindex: id => request(ENDPOINTS.reindex(id), { method: 'POST' }),
  download: id => request(ENDPOINTS.download(id), { responseType: 'blob' }),
  chat: (message, session_id) => request(ENDPOINTS.chat, { method: 'POST', body: { message, session_id }, publicRoute: true }),
};

export async function listAllDocuments() {
  const result = [];
  for (let offset = 0; ; offset += 100) {
    const page = await api.list(100, offset);
    if (!Array.isArray(page)) throw new ApiError('Unexpected document list response.');
    result.push(...page);
    if (page.length < 100) return result;
  }
}
