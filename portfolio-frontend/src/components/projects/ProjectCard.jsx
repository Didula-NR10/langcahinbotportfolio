import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Factory, MapPin, Utensils } from 'lucide-react';
import ProjectImageGallery from './ProjectImageGallery';

const icons = { 'manufacturing-erp': Factory, 'smart-restaurant-360': Utensils, 'salesman-tracking': MapPin };

export default function ProjectCard({ project, onOpen, reducedMotion }) {
  const panelRef = useRef(null);
  const frameRef = useRef(0);
  const Icon = icons[project.id] || Factory;

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const onPointerMove = event => {
    if (reducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const panel = panelRef.current;
    if (!panel) return;
    const bounds = panel.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      panel.style.setProperty('--rotate-x', `${(0.5 - y) * 6}deg`);
      panel.style.setProperty('--rotate-y', `${(x - 0.5) * 8}deg`);
      panel.style.setProperty('--mouse-x', `${x * 100}%`);
      panel.style.setProperty('--mouse-y', `${y * 100}%`);
    });
  };

  const onPointerLeave = () => {
    cancelAnimationFrame(frameRef.current);
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.setProperty('--rotate-x', '0deg');
    panel.style.setProperty('--rotate-y', '0deg');
  };

  return <motion.article
    className="mission-card-wrap"
    layout
    initial={reducedMotion ? false : { opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    exit={reducedMotion ? undefined : { opacity: 0, y: 12 }}
    viewport={{ once: true, amount: 0.12 }}
    transition={{ duration: reducedMotion ? 0 : 0.48, ease: 'easeOut' }}
  >
    <div className="mission-card" ref={panelRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <div className="mission-card-top"><span className="mission-number">{project.number}</span>{project.featured && <span className="mission-featured">FEATURED ✦</span>}</div>
      <ProjectImageGallery project={project} reducedMotion={reducedMotion} />
      <div className="mission-card-body">
        <p className="mission-category"><Icon size={16} aria-hidden="true" /> {project.categoryLabel}</p>
        <h3>{project.title}</h3>
        <p className="mission-description">{project.description}</p>
        <div className="mission-tech" aria-label="Suggested technology stack">
          {project.technologies.slice(0, 4).map(technology => <span key={technology}>{technology}</span>)}
          {project.technologies.length > 4 && <span>+{project.technologies.length - 4} more</span>}
        </div>
        <div className="mission-actions">
          {project.caseStudyUrl
            ? <a className="mission-case-link" href={project.caseStudyUrl}>View Case Study <ArrowRight size={16} /></a>
            : <span className="mission-unavailable" title="Case study coming soon">Case study coming soon</span>}
          {project.liveUrl
            ? <a className="mission-live-link" href={project.liveUrl} target="_blank" rel="noopener noreferrer">Live Preview <ArrowUpRight size={15} /></a>
            : <span className="mission-unavailable mission-live-unavailable" title="Live preview unavailable">No live preview</span>}
          <button className="mission-open" type="button" aria-label={`View ${project.title} details`} onClick={() => onOpen(project)}><ArrowRight size={20} /></button>
        </div>
      </div>
    </div>
  </motion.article>;
}
