const API_URL = (import.meta.env.VITE_CHATBOT_API_URL || '').replace(/\/+$/, '');
const SESSION_ID = /^[A-Za-z0-9_-]{32,128}$/;
const MODES = new Set(['general', 'direct_context', 'rag']);

export class ChatApiError extends Error {
  constructor(message, code = 'CHAT_ERROR', status = 0) {
    super(message);
    this.name = 'ChatApiError';
    this.code = code;
    this.status = status;
  }

  get sessionExpired() {
    return this.code === 'SESSION_EXPIRED' || this.code === 'SESSION_NOT_FOUND';
  }
}

function errorMessage(status, code) {
  if (code === 'SESSION_EXPIRED' || code === 'SESSION_NOT_FOUND') return 'This conversation has ended. Start a new conversation to continue.';
  if (status === 429) return 'The assistant is receiving too many requests. Please try again shortly.';
  if (status === 504) return 'The assistant took too long to respond. Please retry.';
  if (status === 503) return 'The assistant is unavailable right now. Please try again later.';
  if (status === 502) return 'The assistant could not complete that request. Please retry.';
  if (status === 422) return 'That message could not be sent. Check its length and try again.';
  return 'Something went wrong. Please try again.';
}

function validateResponse(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)
    || typeof data.answer !== 'string' || !data.answer.trim()
    || typeof data.session_id !== 'string' || !SESSION_ID.test(data.session_id)
    || !MODES.has(data.mode) || !Array.isArray(data.sources)
    || !data.sources.every(source => source && typeof source.document === 'string' && typeof source.category === 'string')) {
    throw new ChatApiError('The assistant returned an unexpected response. Please try again.', 'INVALID_RESPONSE');
  }
  return {
    answer: data.answer,
    sessionId: data.session_id,
    mode: data.mode,
    sources: data.sources.map(({ document, category }) => ({ document, category }))
  };
}

export async function sendChat(message, sessionId = null, { signal, baseUrl = API_URL } = {}) {
  let response;
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_id: sessionId }),
      signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ChatApiError('Could not connect to the assistant. Check your connection and try again.', 'NETWORK_ERROR');
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new ChatApiError('The assistant returned an unreadable response. Please retry.', 'INVALID_RESPONSE', response.status);
  }
  if (!response.ok) {
    const code = typeof data?.error?.code === 'string' ? data.error.code : 'CHAT_ERROR';
    throw new ChatApiError(errorMessage(response.status, code), code, response.status);
  }
  return validateResponse(data);
}
