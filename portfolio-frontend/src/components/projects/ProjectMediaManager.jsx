import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Trash2, X } from 'lucide-react';

const MAX_BYTES = 5 * 1024 * 1024;
const acceptedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/avif']);

async function hasValidImageSignature(file) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = (start, end) => String.fromCharCode(...bytes.slice(start, end));
  if (file.type === 'image/png') return bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  if (file.type === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (file.type === 'image/webp') return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
  if (file.type === 'image/avif') return ascii(4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(8, 12));
  return false;
}

export default function ProjectMediaManager({ projects, onUpdate, registerUrl, onClose }) {
  const [selectedId, setSelectedId] = useState(projects[0].id);
  const [mode, setMode] = useState('gallery');
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const closeRef = useRef(null);
  const selected = projects.find(project => project.id === selectedId);
  const images = selected ? [
    ...(selected.coverImage ? [{ ...selected.coverImage, kind: 'cover', galleryIndex: -1 }] : []),
    ...selected.gallery.map((image, galleryIndex) => ({ ...image, kind: 'gallery', galleryIndex }))
  ] : [];

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const prepareFile = async file => {
    if (!acceptedTypes.has(file.type) || !(await hasValidImageSignature(file))) {
      setError('Use a valid PNG, JPEG, WebP, or AVIF image.');
      return null;
    }
    if (file.size > MAX_BYTES) {
      setError('Each image must be 5 MB or smaller.');
      return null;
    }
    const src = URL.createObjectURL(file);
    registerUrl(src);
    return { src, alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '), caption: '', position: 'center', size: 'cover' };
  };

  const addFiles = async files => {
    if (!files?.length || !selected) return;
    setError('');
    const next = [];
    for (const file of files) {
      const image = await prepareFile(file);
      if (image) next.push(image);
    }
    if (next.length) onUpdate(selected.id, project => mode === 'cover'
      ? { ...project, coverImage: next[0], gallery: [...project.gallery, ...next.slice(1)] }
      : { ...project, gallery: [...project.gallery, ...next] });
    if (inputRef.current) inputRef.current.value = '';
  };

  const changeImage = (image, update) => onUpdate(selected.id, project => {
    if (image.kind === 'cover') return { ...project, coverImage: { ...project.coverImage, ...update } };
    const gallery = [...project.gallery];
    gallery[image.galleryIndex] = { ...gallery[image.galleryIndex], ...update };
    return { ...project, gallery };
  });

  const removeImage = image => onUpdate(selected.id, project => {
    if (image.kind === 'cover') return { ...project, coverImage: null };
    return { ...project, gallery: project.gallery.filter((_, galleryIndex) => galleryIndex !== image.galleryIndex) };
  });

  const moveImage = (image, direction) => onUpdate(selected.id, project => {
    const gallery = [...project.gallery];
    const from = image.galleryIndex;
    const to = from + direction;
    if (from < 0 || to < 0 || to >= gallery.length) return project;
    [gallery[from], gallery[to]] = [gallery[to], gallery[from]];
    return { ...project, gallery };
  });
  const replaceImage = async (image, file) => {
    if (!file) return;
    setError('');
    const replacement = await prepareFile(file);
    if (replacement) changeImage(image, { ...replacement, caption: image.caption || '', illustrative: false });
  };

  return <div className="project-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="project-modal project-media-manager" role="dialog" aria-modal="true" aria-labelledby="project-media-title">
      <button ref={closeRef} className="project-modal-close" type="button" aria-label="Close media manager" onClick={onClose}><X size={20} /></button>
      <p className="project-modal-kicker">DEVELOPMENT TOOL</p>
      <h2 id="project-media-title">Project media</h2>
      <p className="media-manager-warning">Changes here last only until this page reloads. To publish them, add image files under <code>public/assets/projects</code> and update <code>src/data/projects.js</code>. Permanent browser uploads require an authenticated backend.</p>
      <label className="media-manager-label">Project
        <select value={selectedId} onChange={event => setSelectedId(event.target.value)}>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select>
      </label>
      <div className="media-manager-upload" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); addFiles([...event.dataTransfer.files]); }}>
        <ImagePlus size={28} aria-hidden="true" />
        <span>Drop images here or select files</span>
        <div className="media-manager-controls">
          <select aria-label="Upload as" value={mode} onChange={event => setMode(event.target.value)}><option value="gallery">Add to gallery</option><option value="cover">Replace cover</option></select>
          <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg,.webp,.avif" multiple onChange={event => addFiles([...event.target.files])} aria-label="Select project images" />
        </div>
        <small>PNG, JPEG, WebP, AVIF · 5 MB each</small>
      </div>
      {error && <p className="media-manager-error" role="alert">{error}</p>}
      <div className="media-manager-list">
        {images.map((image, index) => <div className="media-manager-item" key={image.src + index}>
          <div className="media-manager-preview" role="img" aria-label={image.alt || 'Project image'} style={{ backgroundImage: `url("${image.src}")`, backgroundPosition: image.position || 'center', backgroundSize: image.size || 'cover' }} />
          <div className="media-manager-fields">
            <strong>{image.kind === 'cover' ? 'Cover' : `Gallery ${image.galleryIndex + 1}`}</strong>
            <input aria-label={`Alt text for image ${index + 1}`} value={image.alt || ''} placeholder="Alt text" onChange={event => changeImage(image, { alt: event.target.value })} />
            <input aria-label={`Caption for image ${index + 1}`} value={image.caption || ''} placeholder="Optional caption" onChange={event => changeImage(image, { caption: event.target.value })} />
            <select aria-label={`Position for image ${index + 1}`} value={image.position || 'center'} onChange={event => changeImage(image, { position: event.target.value })}>
              {['center', 'left', 'right', 'top', 'bottom', 'left top', 'right top', 'left bottom', 'right bottom'].map(position => <option key={position} value={position}>{position}</option>)}
            </select>
            <select aria-label={`Crop zoom for image ${index + 1}`} value={['cover', '120% auto', '140% auto'].includes(image.size) ? image.size : 'cover'} onChange={event => changeImage(image, { size: event.target.value })}>
              <option value="cover">Fill frame</option><option value="120% auto">Zoom 120%</option><option value="140% auto">Zoom 140%</option>
            </select>
            <div className="media-manager-item-actions">
              <label className="media-manager-replace">Replace<input type="file" accept=".png,.jpg,.jpeg,.webp,.avif" onChange={event => replaceImage(image, event.target.files?.[0])} /></label>
              {image.kind === 'gallery' && <button type="button" aria-label="Move image up" disabled={image.galleryIndex === 0} onClick={() => moveImage(image, -1)}><ArrowUp size={15} /></button>}
              {image.kind === 'gallery' && <button type="button" aria-label="Move image down" disabled={image.galleryIndex === selected.gallery.length - 1} onClick={() => moveImage(image, 1)}><ArrowDown size={15} /></button>}
              <button type="button" aria-label={`Remove image ${index + 1}`} onClick={() => removeImage(image)}><Trash2 size={15} /></button>
            </div>
          </div>
        </div>)}
      </div>
    </section>
  </div>;
}
