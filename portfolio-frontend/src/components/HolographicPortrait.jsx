import { useEffect, useRef, useState } from 'react';
import { UserRound, X } from 'lucide-react';
import { profileImageUrl } from '../config';

export default function HolographicPortrait() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'Tab') {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      triggerRef.current?.focus();
    };
  }, [open]);

  return <div className="hologram-shell">
    <button className="hologram-trigger" type="button" ref={triggerRef} onClick={() => setOpen(true)} aria-label="Open Didula profile details" aria-haspopup="dialog">
      <span className="hologram" aria-hidden="true">
        <span className="orbital-portrait-rings"><i /><i /><i /><b /><b /></span>
        <span className="hologram-photo-beam" />
        {profileImageUrl
          ? <img className="hologram-profile-photo" src={profileImageUrl} alt="" />
          : <span className="hologram-empty-portrait"><UserRound size={120} strokeWidth={1} /></span>}
        <span className="orbital-portrait-scan" />
        <img className="hologram-projector-base" src="/assets/projector-cup.png" alt="" />
      </span>
    </button>
    {open && <div className="identity-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="identity-dialog" role="dialog" aria-modal="true" aria-labelledby="identity-dialog-title">
        <button className="identity-dialog-close" type="button" ref={closeRef} onClick={() => setOpen(false)} aria-label="Close profile details"><X size={18} /></button>
        <p>// IDENTITY TRANSMISSION</p>
        <h2 id="identity-dialog-title">DIDULA</h2>
        <span>Software Developer</span>
        <div className="identity-dialog-rule" />
        <p>Exploring software engineering, cloud and enterprise architecture, artificial intelligence, cybersecurity, and scalable systems.</p>
        <small>SRI LANKA / EARTH</small>
      </div>
    </div>}
  </div>;
}
