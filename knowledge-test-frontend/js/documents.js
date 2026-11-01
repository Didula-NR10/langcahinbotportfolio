import { api, listAllDocuments } from './api.js';
import { CONFIG } from './config.js';
import { getAuthEpoch } from './auth.js';

export const state = { documents: [], selectedFiles: [], page: 0, filter: '', search: '', busy: false };
export const $ = id => document.getElementById(id);
export const formatSize = bytes => Number.isFinite(bytes) ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : '—';
export const formatDate = value => value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export function el(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined && value !== null) node.textContent = String(value);
  return node;
}
export function badge(status) { return el('span', `badge ${status || 'uploaded'}`, status || '—'); }

export function stats() {
  const docs = state.documents;
  return {
    total: docs.length,
    indexed: docs.filter(doc => doc.status === 'indexed').length,
    processing: docs.filter(doc => doc.status === 'processing').length,
    queued: docs.filter(doc => doc.status === 'queued').length,
    failed: docs.filter(doc => doc.status === 'failed').length,
    chunks: docs.reduce((sum, doc) => sum + (Number(doc.chunk_count) || 0), 0),
  };
}

export function renderStats() {
  const values = stats();
  const cards = [
    ['Total documents', values.total, '◫', 'purple'], ['Indexed', values.indexed, '✓', 'green'],
    ['Processing', values.processing, '◷', 'orange'], ['Queued', values.queued, '↗', 'blue'],
    ['Failed', values.failed, '!', 'red'], ['Knowledge chunks', values.chunks, '▦', 'purple'],
  ];
  for (const id of ['dashboard-stats', 'statistics-stats']) {
    const target = $(id); target.replaceChildren();
    for (const [label, value, icon, color] of cards) {
      const card = el('div', 'stat-card');
      card.append(el('span', `stat-icon ${color}`, icon), el('strong', '', value), el('span', 'stat-label', label));
      target.append(card);
    }
  }
  const bars = $('status-bars'); bars.replaceChildren();
  for (const status of ['uploaded', 'queued', 'processing', 'indexed', 'failed', 'deleting']) {
    const count = state.documents.filter(doc => doc.status === status).length;
    const row = el('div', 'bar-row');
    row.append(el('span', '', status), el('div', 'bar-track'), el('strong', '', count));
    row.children[1].append(el('div', `bar-fill ${status}`));
    row.children[1].firstChild.style.width = `${values.total ? count / values.total * 100 : 0}%`;
    bars.append(row);
  }
}

export function renderRecent() {
  const target = $('recent-documents'); target.replaceChildren();
  if (!state.documents.length) { target.append(el('p', 'empty-state', 'No documents yet. Upload a PDF to begin.')); return; }
  for (const doc of state.documents.slice(0, 5)) {
    const row = el('div', 'recent-row');
    const info = el('div', 'recent-info'); info.append(el('span', 'file-icon', 'PDF'), el('span', 'recent-name', doc.title || doc.original_filename));
    row.append(info, badge(doc.status)); target.append(row);
  }
}

export function renderTable(onAction) {
  const target = $('document-rows'); target.replaceChildren();
  const search = state.search.toLowerCase();
  const filtered = state.documents.filter(doc => (!state.filter || doc.status === state.filter) &&
    [doc.original_filename, doc.title, doc.category].some(value => String(value || '').toLowerCase().includes(search)));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  state.page = Math.min(state.page, pages - 1);
  for (const doc of filtered.slice(state.page * 10, state.page * 10 + 10)) {
    const row = document.createElement('tr');
    const name = el('td'); const nameWrap = el('div', 'document-name'); nameWrap.append(el('span', 'file-icon', 'PDF'), el('span', '', doc.original_filename)); name.append(nameWrap);
    const status = el('td'); status.append(badge(doc.status));
    const actions = el('td'); const group = el('div', 'row-actions');
    for (const [action, title] of [['view', 'Details'], ['edit', 'Edit'], ['replace', 'Replace'], ['reindex', 'Reindex'], ['delete', 'Delete']]) {
      const button = el('button', `action-link ${action === 'delete' ? 'delete-link' : ''}`, title);
      button.type = 'button'; button.disabled = state.busy || (action === 'reindex' && ['queued', 'processing', 'deleting'].includes(doc.status));
      button.addEventListener('click', () => onAction(action, doc)); group.append(button);
    }
    actions.append(group);
    row.append(name, el('td', '', doc.category), el('td', '', formatSize(doc.file_size)), el('td', '', formatDate(doc.created_at)), status, actions);
    target.append(row);
  }
  $('document-empty').hidden = filtered.length !== 0;
  $('document-count').textContent = `${filtered.length} document${filtered.length === 1 ? '' : 's'} · Page ${state.page + 1} of ${pages}`;
  $('previous-page').disabled = state.page === 0;
  $('next-page').disabled = state.page >= pages - 1;
}

export async function refreshDocuments(onAction) {
  const epoch = getAuthEpoch();
  const documents = await listAllDocuments();
  if (epoch !== getAuthEpoch()) return state.documents;
  state.documents = documents;
  renderStats(); renderRecent(); renderTable(onAction);
  return state.documents;
}

export function validateFiles(files) {
  const selected = [...files];
  if (state.selectedFiles.length + selected.length > CONFIG.MAX_FILES) throw new Error(`Select at most ${CONFIG.MAX_FILES} PDF files.`);
  for (const file of selected) {
    if (!/\.pdf$/i.test(file.name)) throw new Error(`${file.name}: only PDF files are supported.`);
    if (!file.size || file.size > CONFIG.MAX_FILE_BYTES) throw new Error(`${file.name}: file must be under 15 MiB and not empty.`);
  }
  return selected;
}

export function renderSelected() {
  const target = $('selected-files'); target.replaceChildren();
  state.selectedFiles.forEach((file, index) => {
    const row = el('div', 'selected-row');
    row.append(el('span', 'file-icon', 'PDF'), el('span', 'selected-name', file.name), el('small', '', formatSize(file.size)));
    const remove = el('button', 'icon-button', '×'); remove.type = 'button'; remove.setAttribute('aria-label', `Remove ${file.name}`);
    remove.addEventListener('click', () => { state.selectedFiles.splice(index, 1); renderSelected(); }); row.append(remove); target.append(row);
  });
  $('upload-button').disabled = !state.selectedFiles.length || state.busy;
  $('upload-hint').textContent = state.selectedFiles.length ? `${state.selectedFiles.length} file${state.selectedFiles.length === 1 ? '' : 's'} selected` : 'Select one or more PDF files to begin.';
  $('upload-title').disabled = state.selectedFiles.length > 1;
  $('upload-description').disabled = state.selectedFiles.length > 1;
}

export async function uploadSelected() {
  const files = state.selectedFiles;
  const category = $('upload-category').value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{0,79}$/.test(category)) throw new Error('Enter a valid category (letters, numbers, spaces, underscores or hyphens).');
  const form = new FormData(); form.append('category', category);
  if (files.length === 1) {
    form.append('file', files[0]);
    if ($('upload-title').value.trim()) form.append('title', $('upload-title').value.trim());
    form.append('description', $('upload-description').value.trim());
    const doc = await api.upload(form); return [{ filename: files[0].name, status: doc.status, document: doc }];
  }
  files.forEach(file => form.append('files', file));
  const result = await api.uploadBatch(form);
  return result.results;
}

export function renderUploadResults(results) {
  const target = $('upload-results'); target.replaceChildren();
  for (const result of results) {
    const row = el('div', 'upload-result');
    row.append(el('strong', '', result.filename), badge(result.document?.status || result.status), el('span', '', result.error || 'Upload accepted; indexing status will update in Manage documents.'));
    target.append(row);
  }
}
