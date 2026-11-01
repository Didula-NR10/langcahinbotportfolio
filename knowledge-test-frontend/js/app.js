import { CONFIG, settings, validateSettings } from './config.js';
import { api, ApiError } from './api.js';
import { signIn, signOut, clearSession, getEmail } from './auth.js';
import { $, el, state, formatDate, formatSize, badge, refreshDocuments, renderTable, renderSelected, renderUploadResults, uploadSelected, validateFiles } from './documents.js';
import { newConversation, sendMessage } from './chatbot.js';

let view = 'dashboard';
let pollTimer = null;
let activeDoc = null;
let replaceDoc = null;
let confirmAction = null;

function toast(message, error = false) {
  const node = $('toast'); node.textContent = message; node.classList.toggle('error', error); node.hidden = false;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => { node.hidden = true; }, 5000);
}
function handleError(error) {
  if (error instanceof ApiError && error.status === 401) {
    clearSession(); showLogin('Your admin session expired. Sign in again.'); return;
  }
  toast(error.message || 'Something went wrong.', true);
}
function showLogin(message = '') {
  stopPolling(); state.documents = []; newConversation(); $('app-view').hidden = true; $('login-view').hidden = false; $('login-error').textContent = message; $('login-error').hidden = !message;
  $('login-form').elements.password.value = '';
}
function showApp() {
  $('login-view').hidden = true; $('app-view').hidden = false; $('user-email').textContent = getEmail() || 'Admin'; navigate('dashboard');
}
function stopPolling() { if (pollTimer) clearInterval(pollTimer); pollTimer = null; }
function startPolling() {
  stopPolling();
  if (!['dashboard', 'documents', 'statistics'].includes(view) && !$('document-dialog').open) return;
  if (!state.documents.some(doc => ['queued', 'processing'].includes(doc.status))) return;
  pollTimer = setInterval(async () => {
    if (document.hidden) return;
    try {
      await refreshDocuments(onDocumentAction);
      if (activeDoc && $('document-dialog').open) await showDetails(activeDoc, false);
      if (!state.documents.some(doc => ['queued', 'processing'].includes(doc.status))) stopPolling();
    } catch (error) { stopPolling(); handleError(error); }
  }, CONFIG.POLL_INTERVAL_MS);
}
function navigate(next) {
  view = next; stopPolling();
  for (const section of document.querySelectorAll('.view')) section.hidden = section.id !== `${next}-section`;
  for (const button of document.querySelectorAll('.nav-item[data-view]')) button.classList.toggle('active', button.dataset.view === next);
  $('breadcrumb-current').textContent = ({ dashboard: 'Dashboard', upload: 'Upload documents', documents: 'Manage documents', statistics: 'Statistics', chat: 'Test chatbot' })[next];
  $('sidebar').classList.remove('open'); $('menu-button').setAttribute('aria-expanded', 'false');
  if (['dashboard', 'documents', 'statistics'].includes(next)) refreshDocuments(onDocumentAction).then(startPolling).catch(handleError);
}

function field(label, value) {
  const row = el('div', 'detail-field'); row.append(el('span', '', label), el('strong', '', value || '—')); return row;
}
async function showDetails(id, open = true) {
  const [doc, jobs] = await Promise.all([api.get(id), api.jobs(id)]);
  activeDoc = id; $('dialog-title').textContent = doc.title || doc.original_filename;
  const body = $('dialog-body'); body.replaceChildren();
  const status = el('div', 'detail-status'); status.append(badge(doc.status), el('span', '', `${doc.chunk_count} knowledge chunks`)); body.append(status);
  const grid = el('div', 'detail-grid');
  for (const [label, value] of [['Document ID', doc.id], ['Original filename', doc.original_filename], ['Title', doc.title], ['Category', doc.category], ['Description', doc.description], ['File size', formatSize(doc.file_size)], ['Uploaded', formatDate(doc.created_at)], ['Last indexed', formatDate(doc.indexed_at)], ['Updated', formatDate(doc.updated_at)], ['MIME type', doc.mime_type]]) grid.append(field(label, value));
  body.append(grid);
  if (doc.error_message) body.append(el('p', 'detail-error', doc.error_message));
  const jobSection = el('div', 'job-section'); jobSection.append(el('h3', '', 'Indexing jobs'));
  if (!jobs.length) jobSection.append(el('p', 'muted', 'No indexing jobs recorded.'));
  for (const job of jobs.slice(0, 8)) {
    const row = el('div', 'job-row'); row.append(badge(job.status), el('span', '', `Attempt ${job.attempt_count} · ${formatDate(job.created_at)}`));
    if (job.error_message) row.append(el('small', 'detail-error', job.error_message)); jobSection.append(row);
  }
  body.append(jobSection);
  const download = el('button', 'button secondary', 'Download PDF'); download.addEventListener('click', async () => {
    try {
      const blob = await api.download(id); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = doc.original_filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) { handleError(error); }
  }); body.append(download);
  if (open && !$('document-dialog').open) $('document-dialog').showModal();
  startPolling();
}
function showEdit(doc) {
  activeDoc = doc.id; $('dialog-title').textContent = `Edit ${doc.original_filename}`;
  const body = $('dialog-body'); body.replaceChildren();
  const form = el('form', 'stack');
  for (const [name, label, value, max] of [['title', 'Title', doc.title, 200], ['category', 'Category', doc.category, 80], ['description', 'Description', doc.description, 1000]]) {
    const wrapper = el('label', '', label); const input = name === 'description' ? document.createElement('textarea') : document.createElement('input');
    input.name = name; input.value = value || ''; input.maxLength = max; input.required = name !== 'description'; if (name === 'category') input.pattern = '[A-Za-z0-9][A-Za-z0-9 _-]*'; wrapper.append(input); form.append(wrapper);
  }
  const save = el('button', 'button primary', 'Save changes'); save.type = 'submit'; form.append(save);
  form.addEventListener('submit', async event => {
    event.preventDefault(); const data = Object.fromEntries(new FormData(form));
    data.title = data.title.trim(); data.category = data.category.trim(); data.description = data.description.trim();
    if (!data.title || !/^[A-Za-z0-9][A-Za-z0-9 _-]{0,79}$/.test(data.category)) { toast('Enter a title and valid category.', true); return; }
    save.disabled = true;
    try { await api.update(doc.id, data); $('document-dialog').close(); toast('Metadata updated.'); await refreshDocuments(onDocumentAction); startPolling(); }
    catch (error) { handleError(error); } finally { save.disabled = false; }
  });
  body.append(form); $('document-dialog').showModal();
}
function askConfirm(title, message, action, buttonText) {
  $('confirm-title').textContent = title; $('confirm-message').textContent = message; $('confirm-accept').textContent = buttonText; confirmAction = action; $('confirm-dialog').showModal();
}
async function onDocumentAction(action, doc) {
  try {
    if (action === 'view') return await showDetails(doc.id);
    if (action === 'edit') return showEdit(doc);
    if (action === 'replace') { replaceDoc = doc; $('replace-input').value = ''; $('replace-input').click(); return; }
    if (action === 'delete') return askConfirm('Delete document?', `Delete ${doc.original_filename} and its indexed knowledge? This cannot be undone.`, async () => { await api.remove(doc.id); toast('Document deleted.'); await refreshDocuments(onDocumentAction); startPolling(); }, 'Delete document');
    if (action === 'reindex') {
      state.busy = true; renderTable(onDocumentAction);
      try { const result = await api.reindex(doc.id); toast(`Reindex ${result.status}.`); await refreshDocuments(onDocumentAction); startPolling(); }
      finally { state.busy = false; renderTable(onDocumentAction); }
    }
  } catch (error) { handleError(error); }
}

$('api-url').value = settings.apiBaseUrl; $('supabase-url').value = settings.supabaseUrl; $('publishable-key').value = settings.publishableKey;
if (!settings.supabaseUrl || !settings.publishableKey) document.querySelector('.connection-settings').open = true;
$('login-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = $('login-button'); button.disabled = true; button.textContent = 'Signing in…'; $('login-error').hidden = true;
  try {
    validateSettings({ apiBaseUrl: $('api-url').value, supabaseUrl: $('supabase-url').value, publishableKey: $('publishable-key').value });
    await signIn(event.target.elements.email.value.trim(), event.target.elements.password.value);
    await api.list(1, 0); showApp();
  } catch (error) { clearSession(); $('login-error').textContent = error.status === 403 ? 'This account is not on the backend admin allowlist.' : error.message; $('login-error').hidden = false; }
  finally { button.disabled = false; button.textContent = 'Sign in ↗'; event.target.elements.password.value = ''; }
});
$('logout-button').addEventListener('click', async () => { await signOut(); showLogin(); });
for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click', () => navigate(button.dataset.view));
for (const button of document.querySelectorAll('[data-go]')) button.addEventListener('click', () => navigate(button.dataset.go));
$('refresh-button').addEventListener('click', () => { if (view === 'chat') return toast('Chat responses update when you send a message.'); refreshDocuments(onDocumentAction).then(() => { startPolling(); toast('Data refreshed.'); }).catch(handleError); });
$('menu-button').addEventListener('click', () => { const open = $('sidebar').classList.toggle('open'); $('menu-button').setAttribute('aria-expanded', String(open)); });
$('document-search').addEventListener('input', event => { state.search = event.target.value; state.page = 0; renderTable(onDocumentAction); });
$('status-filter').addEventListener('change', event => { state.filter = event.target.value; state.page = 0; renderTable(onDocumentAction); });
$('previous-page').addEventListener('click', () => { state.page--; renderTable(onDocumentAction); });
$('next-page').addEventListener('click', () => { state.page++; renderTable(onDocumentAction); });
$('dropzone').addEventListener('click', () => $('file-input').click());
$('dropzone').addEventListener('keydown', event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); $('file-input').click(); } });
$('dropzone').addEventListener('dragover', event => { event.preventDefault(); $('dropzone').classList.add('dragging'); });
$('dropzone').addEventListener('dragleave', () => $('dropzone').classList.remove('dragging'));
$('dropzone').addEventListener('drop', event => { event.preventDefault(); $('dropzone').classList.remove('dragging'); try { state.selectedFiles.push(...validateFiles(event.dataTransfer.files)); renderSelected(); } catch (error) { toast(error.message, true); } });
$('file-input').addEventListener('change', event => { try { state.selectedFiles.push(...validateFiles(event.target.files)); renderSelected(); } catch (error) { toast(error.message, true); } event.target.value = ''; });
$('upload-form').addEventListener('submit', async event => {
  event.preventDefault(); if (!state.selectedFiles.length) return;
  state.busy = true; renderSelected(); $('upload-hint').textContent = 'Uploading to FastAPI…';
  try {
    const results = await uploadSelected(); renderUploadResults(results);
    const accepted = results.filter(result => result.document);
    toast(`${accepted.length} of ${results.length} upload${results.length === 1 ? '' : 's'} accepted. Check indexing status in Manage documents.`, accepted.length !== results.length);
    state.selectedFiles = []; renderSelected(); await refreshDocuments(onDocumentAction);
  } catch (error) { handleError(error); }
  finally { state.busy = false; renderSelected(); }
});
$('dialog-close').addEventListener('click', () => $('document-dialog').close());
$('document-dialog').addEventListener('close', () => { activeDoc = null; startPolling(); });
$('confirm-cancel').addEventListener('click', () => $('confirm-dialog').close());
$('confirm-accept').addEventListener('click', async () => { const button = $('confirm-accept'); button.disabled = true; try { await confirmAction?.(); $('confirm-dialog').close(); } catch (error) { handleError(error); } finally { button.disabled = false; } });
$('replace-input').addEventListener('change', event => {
  const file = event.target.files[0]; if (!file || !replaceDoc) return;
  if (!/\.pdf$/i.test(file.name) || !file.size || file.size > CONFIG.MAX_FILE_BYTES) { toast('Choose a nonempty PDF under 15 MiB.', true); return; }
  const doc = replaceDoc;
  askConfirm('Replace PDF?', `Replace ${doc.original_filename} with ${file.name}? The backend will queue indexing again.`, async () => {
    const form = new FormData(); form.append('file', file); const updated = await api.replace(doc.id, form);
    toast(`Replacement accepted. Current status: ${updated.status}.`); await refreshDocuments(onDocumentAction); await showDetails(doc.id); startPolling();
  }, 'Replace PDF');
});
$('chat-form').addEventListener('submit', event => { event.preventDefault(); sendMessage(); });
$('chat-input').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); $('chat-form').requestSubmit(); } });
$('new-chat').addEventListener('click', newConversation);
window.addEventListener('pagehide', stopPolling);
