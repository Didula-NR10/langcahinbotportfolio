import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import OriginalServices from './hich-space-travel/main';
import originalStyles from './hich-space-travel/style.css?raw';
import themeStyles from './hich-space-travel/theme.css?raw';
import { useTheme } from '../theme';

const darkStyles = `
  :host { color: #f2f7f4; background: #111e23; }
  .app { background: #111e23; color: #f2f7f4; }
  .universe::after { background: linear-gradient(90deg, rgba(17,30,35,.86), rgba(17,30,35,.36) 62%, rgba(17,30,35,.18)), linear-gradient(0deg, #111e23, transparent 34%); }
  .nav, .foot, .dest-heading, .dest { border-color: rgba(132,210,193,.22); }
  .eyebrow span, .status-dot, .travel-progress > div { background: #2b9486; }
  h1 em, h2 b, .detail-type, .tech-summary, .dest-heading span, .dest-number, .dest-arrow, .tech-fallback, .quiet { color: #85d4c3; }
  .primary { background: #1c756c; color: #fff; box-shadow: 0 12px 28px rgba(8,67,61,.25); }
  .primary:hover { background: #27877b; }
  .nav-cta { background: rgba(91,181,165,.15); border-color: rgba(132,210,193,.38); color: #f2f7f4; }
  .dest.active { border-color: #74c1af; }
  .tech-logo, .orbit-tech .tech-logo { background: rgba(24,48,52,.9); border-color: rgba(132,210,193,.42); color: #f2f7f4; }
  .tech-name { color: #f2f7f4; text-shadow: none; }
  .orbit-track { border-color: rgba(132,210,193,.28); }
  .dest:focus-visible, .primary:focus-visible, .quiet:focus-visible { outline-color: #85d4c3; }
`;

const lightStyles = `
  :host { color: #203238; background: #f4f7f3; }
  .app { background: #f4f7f3; color: #203238; }
  .universe canvas { opacity: .24; }
  .universe::after { background: linear-gradient(90deg, rgba(244,247,243,.96), rgba(244,247,243,.73) 55%, rgba(244,247,243,.35)), linear-gradient(0deg, #f4f7f3, transparent 35%); }
  .nav, .foot, .dest-heading, .dest { border-color: rgba(42,113,103,.2); }
  .nav-label, .side-index, .dest-heading, .status, .foot, .proof small, .tech-summary span { color: #5a706d; }
  .eyebrow, .dest:hover, .dest.active { color: #203238; }
  .intro p, .detail p, .dest { color: #52666a; }
  .eyebrow span, .status-dot, .travel-progress > div { background: #1c756c; }
  h1 em, h2 b, .detail-type, .tech-summary, .dest-heading span, .dest-number, .dest-arrow, .quiet { color: #1c6b62; }
  .nav-cta, .tech-logo, .orbit-tech .tech-logo { background: rgba(255,255,255,.95); color: #1c6b62; border-color: rgba(42,113,103,.28); box-shadow: 0 10px 25px rgba(28,73,64,.09); }
  .tech-name { color: #203238; text-shadow: none; }
  .primary { background: #1b6b63; color: #fff; box-shadow: 0 12px 24px rgba(22,94,85,.18); }
  .primary:hover { background: #14584f; }
  .dest.active { border-color: #1c756c; }
  .orbit-track { border-color: rgba(42,113,103,.27); }
  .object-label { color: #fff; }
  .dest:focus-visible, .primary:focus-visible, .quiet:focus-visible { outline-color: #1b6b63; }
`;

const paletteStyles = `
  :host([data-palette]) { color: var(--theme-text); background: var(--theme-bg); }
  :host([data-palette]) .app { background: var(--theme-bg); color: var(--theme-text); }
  :host([data-palette]) .universe::after { background: linear-gradient(90deg, var(--theme-bg), transparent 78%), linear-gradient(0deg, var(--theme-bg), transparent 38%); }
  :host([data-palette]) .nav, :host([data-palette]) .foot, :host([data-palette]) .dest-heading, :host([data-palette]) .dest { border-color: var(--theme-border); }
  :host([data-palette]) .eyebrow span, :host([data-palette]) .status-dot, :host([data-palette]) .travel-progress > div { background: var(--theme-button); }
  :host([data-palette]) h1 em, :host([data-palette]) h2 b, :host([data-palette]) .detail-type, :host([data-palette]) .tech-summary, :host([data-palette]) .dest-heading span, :host([data-palette]) .dest-number, :host([data-palette]) .dest-arrow, :host([data-palette]) .quiet { color: var(--theme-accent); }
  :host([data-palette]) .primary { background: var(--theme-button); color: var(--theme-button-text); box-shadow: 0 12px 28px var(--theme-haze); }
  :host([data-palette]) .primary:hover { filter: brightness(1.12); }
  :host([data-palette]) .nav-cta, :host([data-palette]) .tech-logo, :host([data-palette]) .orbit-tech .tech-logo { background: var(--theme-surface); border-color: var(--theme-border); color: var(--theme-text); }
  :host([data-palette]) .tech-name { color: var(--theme-text); }
  :host([data-palette]) .dest, :host([data-palette]) .intro p, :host([data-palette]) .detail p { color: var(--theme-muted); }
  :host([data-palette]) .dest.active { border-color: var(--theme-accent); color: var(--theme-text); }
  :host([data-palette]) .orbit-track { border-color: var(--theme-border); }
  :host([data-palette]) .dest:focus-visible, :host([data-palette]) .primary:focus-visible, :host([data-palette]) .quiet:focus-visible { outline-color: var(--theme-accent); }
`;

export default function ServicesUniverse() {
  const { theme } = useTheme();
  const hostRef = useRef(null);
  const [shadowRoot, setShadowRoot] = useState(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (host && !host.shadowRoot) setShadowRoot(host.attachShadow({ mode: 'open' }));
  }, []);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const sync = () => {
      if (document.documentElement.dataset.palette) host.dataset.palette = document.documentElement.dataset.palette;
      else delete host.dataset.palette;
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-palette'] });
    return () => observer.disconnect();
  }, []);

  return <section id="services" ref={hostRef} aria-label="Services" style={{ display: 'block', minHeight: '100svh' }}>
    {shadowRoot && createPortal(<>
      <style>{`:host{display:block;font-family:Inter,Arial,sans-serif;color:#F1F5F9;background:#050816;font-synthesis:none}`}</style>
      <style>{originalStyles}</style>
      <style>{themeStyles}</style>
      <style>{darkStyles}</style>
      {theme === 'light' && <style>{lightStyles}</style>}
      <style>{paletteStyles}</style>
      <OriginalServices />
    </>, shadowRoot)}
  </section>;
}
