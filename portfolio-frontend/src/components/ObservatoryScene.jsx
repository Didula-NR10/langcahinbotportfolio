import { useCallback, useEffect, useRef, useState } from 'react';
import RotatingEarth from './RotatingEarth';

export default function ObservatoryScene() {
  const sceneRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const onUnavailable = useCallback(() => { setUnavailable(true); setReady(false); }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !('IntersectionObserver' in window)) {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (!entry.isIntersecting) setReady(false);
    }, { rootMargin: '180px' });
    observer.observe(scene);
    return () => observer.disconnect();
  }, []);

  return <div className="observatory-scene" ref={sceneRef} aria-hidden="true">
    <div className="observatory-image" />
    <div className={`observatory-clean${ready ? ' is-ready' : ''}`} />
    {visible && !unavailable && <RotatingEarth onReady={onReady} onUnavailable={onUnavailable} />}
    <div className="observatory-shade" />
  </div>;
}
