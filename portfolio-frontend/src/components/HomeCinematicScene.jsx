import { useEffect, useRef } from 'react';

function DesignWorkspace() {
  return <div className="cinema-workspace" aria-hidden="true">
    <div className="cinema-workspace-top"><span className="cinema-window-dots"><i /><i /><i /></span><span>DESIGN / ARTBOARD 01</span><span className="cinema-workspace-status" /></div>
    <div className="cinema-workspace-body">
      <div className="cinema-layer-rail"><i /><i /><i /><i /></div>
      <div className="cinema-artboard">
        <div className="cinema-artboard-guides" />
        <div className="cinema-artboard-image"><svg viewBox="0 0 92 58" preserveAspectRatio="none"><path d="M0 58 31 28 47 41 64 16 92 48V58Z" /><circle cx="69" cy="14" r="5" /></svg></div>
        <div className="cinema-artboard-copy"><i /><i /><i /></div>
        <div className="cinema-artboard-cta" />
        <div className="cinema-selection-handle cinema-selection-handle--one" /><div className="cinema-selection-handle cinema-selection-handle--two" /><div className="cinema-selection-handle cinema-selection-handle--three" /><div className="cinema-selection-handle cinema-selection-handle--four" />
      </div>
      <div className="cinema-workspace-tools"><span className="cinema-color-wheel" /><i /><i /></div>
    </div>
    <div className="cinema-workspace-bottom"><span>LAYERS <b>03</b></span><span>100%</span></div>
  </div>;
}

function SecurityShield() {
  return <svg className="cinema-shield" viewBox="0 0 126 150" role="presentation">
    <defs><clipPath id="cinema-shield-clip"><path d="M63 9 108 25v39c0 34-17 57-45 75C35 121 18 98 18 64V25Z" /></clipPath></defs>
    <path d="M63 9 108 25v39c0 34-17 57-45 75C35 121 18 98 18 64V25Z" fill="var(--scene-panel)" stroke="var(--scene-cyan)" strokeWidth="1.6" />
    <path d="M63 20 97 32v32c0 27-13 48-34 63C42 112 29 91 29 64V32Z" fill="none" stroke="var(--scene-cyan)" strokeWidth=".7" opacity=".38" />
    <g clipPath="url(#cinema-shield-clip)"><rect className="cinema-shield-scan" x="16" y="-25" width="96" height="25" fill="var(--scene-cyan)" opacity=".22" /></g>
    <path d="M52 69v-9a11 11 0 0 1 22 0v9m-26 0h30v27H48Z" fill="none" stroke="var(--scene-cyan)" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="63" cy="81" r="3" fill="var(--scene-cyan)" /><path d="M63 84v5" stroke="var(--scene-cyan)" strokeWidth="2" />
    <circle cx="9" cy="43" r="3" fill="var(--scene-cyan)" /><circle cx="117" cy="43" r="3" fill="var(--scene-cyan)" /><path d="M12 43h13m76 0h13" stroke="var(--scene-cyan)" opacity=".44" />
    <path className="cinema-shield-verify" d="m48 110 9 8 19-20" fill="none" stroke="var(--scene-cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function CloudTopology({ compact = false }) {
  return <div className={`cinema-cloud${compact ? ' cinema-cloud--compact' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 230 150" role="presentation">
      <path className="cinema-cloud-outline" d="M58 52c4-20 25-31 44-23 12-18 41-15 48 7 18-3 32 11 31 27-1 15-12 24-27 24H69c-22 0-31-14-25-27 2-4 7-7 14-8Z" />
      <path className="cinema-cloud-route" d="M114 88v20H52v17m62-17h64v17m-64-17v17" />
      <path className="cinema-cloud-signal" d="M114 88v20H52v17m62-17h64v17m-64-17v17" pathLength="400" />
      <path className="cinema-cloud-signal cinema-cloud-return" d="M114 88v20H52v17m62-17h64v17m-64-17v17" pathLength="400" />
      <rect x="36" y="125" width="32" height="19" rx="3" /><rect x="98" y="125" width="32" height="19" rx="3" /><rect x="162" y="125" width="32" height="19" rx="3" />
      <circle cx="45" cy="134" r="2" /><circle cx="107" cy="134" r="2" /><circle cx="171" cy="134" r="2" />
      <path d="M90 57h48m-48 10h31" className="cinema-cloud-glyph" />
    </svg>
    {!compact && <span className="cinema-cloud-label">CLOUD / SERVICES</span>}
  </div>;
}

function CodeEditor({ side }) {
  const design = side === 'left';
  return <div className={`cinema-code cinema-code--${side}`} aria-hidden="true">
    <div className="cinema-code-top"><span className="cinema-window-dots"><i /><i /><i /></span><span>{side === 'left' ? 'studio.tsx' : 'secure-cloud.ts'}</span><span className="cinema-code-live" /></div>
    <div className="cinema-code-body">
      {design ? <>
        <div className="cinema-code-line"><small>01</small><code><em>const</em> frame = <span>artboard</span>();</code></div>
        <div className="cinema-code-line"><small>02</small><code>frame.<span>align</span>(grid);</code></div>
        <div className="cinema-code-line cinema-code-line--typing"><small>03</small><code><em>return</em> frame.<span>ready</span>;</code></div>
      </> : <>
        <div className="cinema-code-line"><small>01</small><code><em>const</em> system = <b>await</b> connect();</code></div>
        <div className="cinema-code-line"><small>02</small><code>system.<span>verify</span>(identity);</code></div>
        <div className="cinema-code-line cinema-code-line--typing"><small>03</small><code><em>return</em> system.<span>ready</span>;</code></div>
      </>}
      <div className="cinema-code-success"><i /> {design ? 'ARTBOARD READY' : 'BUILD VERIFIED'}</div>
    </div>
  </div>;
}

function WorldNetwork() {
  return <svg className="cinema-world" viewBox="0 0 280 130" role="presentation">
    <path className="cinema-world-land" d="M16 39 29 31 42 36 46 26 63 22 77 30 73 43 61 46 57 60 43 65 39 81 25 72 27 54 16 50ZM91 73l16-8 22 6 9 16-9 25-13 12-9-9-2-20ZM147 30l16-10 23 5 9-8 20 5 21-4 20 11-2 13-18 4-4 13-17 2-10 12-23-10-13 5-9-13-16 1ZM190 80l17-6 15 9-4 18-16 10-13-8ZM229 91l21-4 16 11-7 16-27-3Z" />
    <path className="cinema-world-arc" d="M44 48Q112 -3 166 36M44 48Q157 121 240 103M166 36Q216 24 240 103M115 77Q176 48 240 103" />
    <path className="cinema-world-signal" d="M44 48Q112 -3 166 36" pathLength="400" />
    <path className="cinema-world-signal cinema-world-signal--two" d="M166 36Q216 24 240 103" pathLength="400" />
    <circle cx="44" cy="48" r="2" /><circle cx="166" cy="36" r="2" /><circle cx="115" cy="77" r="2" /><circle cx="240" cy="103" r="2" />
  </svg>;
}

export default function HomeCinematicScene() {
  const rootRef = useRef(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true;
    const update = () => root.classList.toggle('is-paused', motion.matches || document.hidden || !visible);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { rootMargin: '80px' });
    observer.observe(root);
    document.addEventListener('visibilitychange', update);
    motion.addEventListener('change', update);
    update();
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); motion.removeEventListener('change', update); };
  }, []);

  return <div ref={rootRef} className="home-cinematic-scene" aria-hidden="true">
    <DesignWorkspace />
    <SecurityShield />
    <CloudTopology />
    <img className="cinema-robot-cutout" src="/assets/home-cinematic-robot.png" alt="" width="1428" height="1080" decoding="async" />
    <CodeEditor side="left" />
    <CodeEditor side="right" />
    <div className="cinema-right-cloud"><CloudTopology compact /></div>
    <WorldNetwork />
  </div>;
}
