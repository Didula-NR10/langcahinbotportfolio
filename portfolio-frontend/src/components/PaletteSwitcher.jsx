import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Heart, Palette, Search, X } from 'lucide-react';
import { originalPalette, paletteCategories, palettes, referencePalettes } from '../palette-config';
import { useTheme } from '../theme';

export default function PaletteSwitcher() {
  const { paletteId, favorites, selectPalette, toggleFavorite, previewPalette, restorePalette } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [previewId, setPreviewId] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const closeRef = useRef(null);

  const visible = useMemo(() => referencePalettes.filter(palette => {
    const categoryMatch = category === 'all' || (category === 'favorites' ? favorites.includes(palette.id) : palette.category === category);
    const searchMatch = `${palette.name} ${palette.category} ${palette.family || ''} ${palette.colors.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase());
    return categoryMatch && searchMatch;
  }), [category, favorites, query]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    searchRef.current?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') { closeRef.current?.(); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...panelRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled)')].filter(element => element.offsetParent !== null);
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = previousOverflow; triggerRef.current?.focus(); };
  }, [open]);

  const close = () => { setPreviewId(null); restorePalette(); setOpen(false); };
  closeRef.current = close;
  const choose = id => { selectPalette(id); setPreviewId(null); };
  const preview = id => { setPreviewId(id); previewPalette(id); };

  return <>
    <button ref={triggerRef} className="palette-trigger" type="button" onClick={() => setOpen(true)} aria-label="Customize Theme" aria-haspopup="dialog" aria-expanded={open} title="Customize Theme">
      <Palette size={22} strokeWidth={1.8} aria-hidden="true" />
    </button>
    {open && <div className="palette-overlay" onPointerDown={event => { if (event.target === event.currentTarget) close(); }}>
      <section ref={panelRef} className="palette-panel" role="dialog" aria-modal="true" aria-labelledby="palette-panel-title" aria-describedby="palette-panel-description">
        <div className="palette-panel-header">
          <div><span className="palette-panel-eyebrow">COLOUR STUDIO</span><h2 id="palette-panel-title">Personalize Your Experience</h2><p id="palette-panel-description">Choose a colour palette that matches your style.</p></div>
          <button type="button" className="palette-icon-button" onClick={close} aria-label="Close palette selector"><X size={20} /></button>
        </div>
        <div className="palette-current"><span>Current palette</span><strong>{palettes.find(palette => palette.id === paletteId)?.name || originalPalette.name}</strong></div>
        <label className="palette-search"><Search size={17} aria-hidden="true" /><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} type="search" placeholder="Search palettes or colours" aria-label="Search palettes or colours" /></label>
        <div className="palette-categories" role="group" aria-label="Palette categories">
          {paletteCategories.map(([id, label]) => <button key={id} type="button" className={category === id ? 'is-active' : ''} onClick={() => setCategory(id)} aria-pressed={category === id}>{label}</button>)}
        </div>
        <div className="palette-scroll-area">
          {visible.length ? <div className="palette-grid">{visible.map(palette => <div key={palette.id} className={`palette-card${paletteId === palette.id ? ' is-selected' : ''}`} onPointerEnter={event => { if (event.pointerType === 'mouse') preview(palette.id); }} onPointerLeave={event => { if (event.pointerType === 'mouse') { setPreviewId(null); restorePalette(); } }}>
            <div className="palette-card-actions"><button type="button" className="palette-card-pick" onClick={() => choose(palette.id)} aria-label={`Select ${palette.name}`} aria-pressed={paletteId === palette.id}>
              <span className="palette-strip" aria-hidden="true">{palette.colors.map((color, index) => <i key={`${color}-${index}`} style={{ backgroundColor: color }} />)}</span>
              <span className="palette-card-label"><span>{palette.name}</span>{paletteId === palette.id && <Check size={15} aria-hidden="true" />}</span>
              <small title={`Screenshot row ${palette.source.row}, column ${palette.source.column}. HEX values are approximate.`}>{palette.category} · approx.</small>
            </button><button type="button" className={`palette-favorite${favorites.includes(palette.id) ? ' is-favorite' : ''}`} onClick={() => toggleFavorite(palette.id)} aria-label={`${favorites.includes(palette.id) ? 'Remove' : 'Add'} ${palette.name} ${favorites.includes(palette.id) ? 'from' : 'to'} favourites`} aria-pressed={favorites.includes(palette.id)}><Heart size={16} fill={favorites.includes(palette.id) ? 'currentColor' : 'none'} /></button></div>
            <button type="button" className="palette-preview-button" onClick={() => previewId === palette.id ? (setPreviewId(null), restorePalette()) : preview(palette.id)} aria-pressed={previewId === palette.id}>{previewId === palette.id ? 'End preview' : 'Preview'}</button>
          </div>)}</div> : <p className="palette-empty">No palettes match your search.</p>}
        </div>
        <div className="palette-panel-footer"><span>{referencePalettes.length} reference palettes</span><button type="button" onClick={() => choose('original')}>Reset to Original Theme</button></div>
      </section>
    </div>}
  </>;
}
