import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { UserRound } from 'lucide-react';
import './references-section.css';

const ReferenceSculpture = lazy(() => import('./ReferenceSculpture'));

const references = [
  { number: '01', name: 'Name to be added', title: 'Title to be added', organization: 'Organization to be added' },
  { number: '02', name: 'Name to be added', title: 'Title to be added', organization: 'Organization to be added' }
];

export default function ReferencesSection() {
  const sceneRef = useRef(null);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [sceneActive, setSceneActive] = useState(false);
  useEffect(() => {
    if (!sceneRef.current) return;
    if (!('IntersectionObserver' in window)) { setSceneLoaded(true); setSceneActive(true); return; }
    const loadObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setSceneLoaded(true); loadObserver.disconnect(); }
    }, { rootMargin: '200px 0px', threshold: 0 });
    const visibilityObserver = new IntersectionObserver(([entry]) => setSceneActive(entry.isIntersecting), { threshold: 0 });
    loadObserver.observe(sceneRef.current);
    visibilityObserver.observe(sceneRef.current);
    return () => { loadObserver.disconnect(); visibilityObserver.disconnect(); };
  }, []);
  return (
    <section className="portfolio-references" id="references" aria-labelledby="references-title">
      <div className="portfolio-references-inner">
        <div className="portfolio-references-hero">
          <header className="portfolio-references-heading">
            <p className="portfolio-references-kicker"><span aria-hidden="true" /> REFERENCES / PROFESSIONAL CONNECTIONS</p>
            <h2 id="references-title">GROWTH IS NEVER<br /><em>A SOLO PROCESS.</em></h2>
            <p>Meaningful engineering grows through shared knowledge, collaboration, and the people who contribute to our journey.</p>
            <span className="portfolio-references-caption">THE PEOPLE BEHIND THE PROGRESS / 006</span>
          </header>
          <div className="portfolio-references-art" ref={sceneRef} role="img" aria-label="An animated three-dimensional sculpture of glossy blue cubes, illuminated glass modules, and curved metallic connections">
            {sceneLoaded && <Suspense fallback={<span className="portfolio-references-loading">Loading sculpture…</span>}><ReferenceSculpture active={sceneActive} /></Suspense>}
          </div>
        </div>
        <div className="portfolio-references-list-heading"><span>SELECTED CONNECTIONS</span><p>Professional references will be listed here once their details are confirmed.</p></div>
        <div className="portfolio-references-grid">
          {references.map(({ number, name, title, organization }) => (
            <article className="portfolio-reference-card" key={number}>
              <div className="portfolio-reference-card-top">
                <span>REFERENCE / {number}</span>
                <span className="portfolio-reference-icon"><UserRound size={22} strokeWidth={1.6} aria-hidden="true" /></span>
              </div>
              <div className="portfolio-reference-card-details">
                <h3>{name}</h3>
                <p>{title}</p>
                <p>{organization}</p>
              </div>
              <p className="portfolio-reference-status">Details coming soon</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
