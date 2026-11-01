import { useEffect, useState } from 'react';
import Galaxy from './Galaxy/Galaxy';

export default function GalaxyBackground({ className = '', backgroundColor = '#111E23' }) {
  const [supported, setSupported] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    setSupported(Boolean(canvas.getContext('webgl2')));
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobile = window.matchMedia('(max-width: 700px)');
    const update = () => {
      setReducedMotion(motion.matches);
      setCompact(mobile.matches);
    };
    update();
    motion.addEventListener('change', update);
    mobile.addEventListener('change', update);
    return () => {
      motion.removeEventListener('change', update);
      mobile.removeEventListener('change', update);
    };
  }, []);

  return (
    <div className={`galaxy-background ${className}`} aria-hidden="true">
      {!supported && <div className="galaxy-fallback" style={{ backgroundColor }} />}
      {supported && <Galaxy
        starColors={['#F2F7F4', '#85D4C3', '#8AB9BE', '#F2F7F4']}
        density={compact ? 1.1 : 1.3}
        glowIntensity={0.24}
        starSize={0.82}
        flareIntensity={compact ? 0.35 : 0.7}
        twinkleIntensity={0.38}
        starSpeed={0.42}
        speed={0.8}
        rotationSpeed={0.008}
        layers={compact ? 2 : 3}
        direction="forward"
        mouseInteraction={false}
        mouseRepulsion={false}
        clickWarp={false}
        intro={false}
        disableAnimation={reducedMotion}
        transparent={false}
        backgroundColor={backgroundColor}
        opacity={0.85}
        dpr={compact ? 0.9 : 0.8}
      />}
    </div>
  );
}
