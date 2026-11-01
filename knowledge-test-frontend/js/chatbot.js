import { api } from './api.js';
import { $, el } from './documents.js';

let sessionId = null;
let busy = false;

function addMessage(role, message, sources = [], mode = '') {
  const log = $('chat-messages'); log.querySelector('.chat-welcome')?.remove();
  const item = el('div', `message ${role}`);
  item.append(el('div', 'message-label', role === 'user' ? 'YOU' : `ASSISTANT${mode ? ` · ${mode.replaceAll('_', ' ')}` : ''}`), el('div', 'message-body', message));
  if (role === 'assistant' && sources.length) {
    const list = el('div', 'message-sources'); list.append(el('strong', '', 'Sources'));
    for (const source of sources) list.append(el('span', 'source-pill', `${source.document || 'Document'}${source.category ? ` · ${source.category}` : ''}`));
    item.append(list);
  }
  log.append(item); log.scrollTop = log.scrollHeight;
  return item;
}

export function newConversation() {
  sessionId = null;
  $('chat-messages').replaceChildren();
  const welcome = el('div', 'chat-welcome');
  welcome.append(el('span', '', '✦'), el('h2', '', 'Start a conversation'), el('p', '', 'Ask a question about an indexed project, skill, or experience. Source documents appear with the answer when the backend provides them.'));
  $('chat-messages').append(welcome);
}

export async function sendMessage() {
  if (busy) return;
  const input = $('chat-input'); const message = input.value.trim();
  if (!message) return;
  input.value = ''; addMessage('user', message);
  busy = true; $('chat-send').disabled = true; $('chat-send').textContent = 'Sending…';
  const pending = addMessage('assistant', 'Thinking…');
  try {
    const response = await api.chat(message, sessionId);
    if (!response?.answer || !response?.session_id) throw new Error('The chat API returned an incomplete response.');
    sessionId = response.session_id;
    pending.remove(); addMessage('assistant', response.answer, Array.isArray(response.sources) ? response.sources : [], response.mode);
  } catch (error) {
    pending.remove(); addMessage('assistant', `Request failed: ${error.message}`);
  } finally {
    busy = false; $('chat-send').disabled = false; $('chat-send').textContent = 'Send ↗'; input.focus();
  }
}
