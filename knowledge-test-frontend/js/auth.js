import { settings } from './config.js';

let session = null;
let authEpoch = 0;

export function getAccessToken() { return session?.access_token || null; }
export function getEmail() { return session?.user?.email || ''; }
export function getAuthEpoch() { return authEpoch; }
export function clearSession() { session = null; authEpoch++; }

async function authRequest(path, body, token) {
  const headers = { apikey: settings.publishableKey, 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${settings.supabaseUrl}/auth/v1/${path}`, {
      method: 'POST', headers, body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    throw new Error(error.name === 'TimeoutError' ? 'Authentication timed out.' : 'Cannot reach Supabase Auth. Check the URL and network.');
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.msg || data.error_description || data.message || (typeof data.error === 'string' && data.error) || `Authentication failed (${response.status}).`);
  }
  return response.status === 204 ? null : response.json();
}

export async function signIn(email, password) {
  const result = await authRequest('token?grant_type=password', { email, password });
  if (!result?.access_token || !result?.refresh_token) throw new Error('Supabase did not return a session.');
  session = result;
  authEpoch++;
  return result;
}

export async function refreshSession() {
  if (!session?.refresh_token) throw new Error('No active session.');
  try {
    const result = await authRequest('token?grant_type=refresh_token', { refresh_token: session.refresh_token });
    if (!result?.access_token) throw new Error('Session refresh failed.');
    session = result;
    return result.access_token;
  } catch (error) {
    clearSession();
    throw error;
  }
}

export async function signOut() {
  const token = getAccessToken();
  clearSession();
  if (token) {
    try { await authRequest('logout', null, token); } catch { /* Local logout still succeeds. */ }
  }
}
