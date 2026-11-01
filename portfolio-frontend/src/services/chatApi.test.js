import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatApiError, sendChat } from './chatApi';

const SESSION = 'a'.repeat(43);
const valid = { answer: 'A useful answer.', session_id: SESSION, mode: 'rag', sources: [{ document: 'projects.md', category: 'projects' }] };

afterEach(() => vi.unstubAllGlobals());

describe('sendChat', () => {
  it('posts to the versioned API and normalizes the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => valid });
    vi.stubGlobal('fetch', fetchMock);
    const result = await sendChat('What projects?', SESSION, { baseUrl: 'http://127.0.0.1:8000/' });
    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:8000/api/v1/chat', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ message: 'What projects?', session_id: SESSION })
    }));
    expect(result).toEqual({ answer: valid.answer, sessionId: SESSION, mode: 'rag', sources: valid.sources });
  });

  it('reports expired sessions without silently replacing them', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: { code: 'SESSION_EXPIRED', message: 'Expired.' } }) }));
    await expect(sendChat('Follow up', SESSION)).rejects.toMatchObject({ code: 'SESSION_EXPIRED', sessionExpired: true });
  });

  it('rejects malformed success responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ answer: 'Hello' }) }));
    await expect(sendChat('Hello')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('turns connection failures into readable errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network detail')));
    await expect(sendChat('Hello')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('preserves cancellation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')));
    await expect(sendChat('Hello')).rejects.toMatchObject({ name: 'AbortError' });
  });
});
