import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Github, X } from 'lucide-react';
import { projects } from '../../data/projects';
import ProjectArchitecture from './ProjectArchitecture';
import ProjectInterfacePreview from './ProjectInterfacePreview';

type Project = typeof projects[number];

function CaseSection({ number, title, children, id }: { number: string; title: string; children: React.ReactNode; id?: string }) {
  return <section className="project-case-section" id={id}>
    <div className="project-case-section-heading"><span>{number}</span><h3>{title}</h3></div>
    <div className="project-case-section-body">{children}</div>
  </section>;
}

export default function ProjectDetailsModal({ project, onClose, initialSection = 'top' }: { project: Project; onClose: () => void; initialSection?: 'top' | 'architecture' }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    if (initialSection === 'architecture') requestAnimationFrame(() => dialogRef.current?.querySelector('#project-case-architecture')?.scrollIntoView({ block: 'start' }));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKeyDown); };
  }, [onClose, initialSection]);

  return createPortal(<div className="project-case-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="project-case-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="project-case-header">
        <span>ENGINEERING CASE STUDY / {project.number} OF {String(projects.length).padStart(2, '0')}</span>
        <button type="button" ref={closeRef} onClick={onClose} aria-label="Close project case study"><X size={19} aria-hidden="true" /> Close</button>
      </header>
      <div className="project-case-content">
        <div className="project-case-intro">
          <p>{project.categoryLabel} / {project.architecture.label}</p>
          <h2 id={titleId}>{project.title}</h2>
          <strong>{project.subtitle}</strong>
          <span>{project.description}</span>
          <div className="project-case-intro-actions">
            {project.repositoryUrl && <a href={project.repositoryUrl} target="_blank" rel="noopener noreferrer"><Github size={17} aria-hidden="true" /> GitHub repository <ArrowUpRight size={15} aria-hidden="true" /></a>}
            {project.liveUrl && <a className="project-case-demo-button" href={project.liveUrl} target="_blank" rel="noopener noreferrer">Live demo <ArrowUpRight size={15} aria-hidden="true" /></a>}
          </div>
        </div>

        <div className="project-case-cover"><ProjectInterfacePreview project={project} large /></div>
        <div className="project-case-sections">
          <CaseSection number="01" title="Project introduction">
            <p>{project.overview}</p>
            <div className="project-case-fact-grid"><div><small>ARCHITECTURE</small><strong>{project.architecture.label}</strong><span>{project.architecture.subtitle}</span></div><div><small>PROJECT TYPE</small><strong>{project.categoryLabel}</strong><span>{project.subtitle}</span></div></div>
          </CaseSection>

          <CaseSection number="02" title="The problem & solution">
            <div className="project-case-two-col"><div><h4>The problem</h4><p>{project.problem}</p></div><div><h4>The solution</h4><p>{project.solution}</p></div></div>
          </CaseSection>

          <CaseSection number="03" title="Software architecture" id="project-case-architecture">
            <p>{project.architecture.summary}</p>
            <ProjectArchitecture project={project} />
            <div className="project-case-principles"><span>PRINCIPLES IN THIS IMPLEMENTATION</span><ul>{project.principles.map(item => <li key={item}>{item}</li>)}</ul></div>
          </CaseSection>

          <CaseSection number="04" title="Technology stack">
            <div className="project-case-stack-grid">{Object.entries(project.stack as unknown as Record<string, string[]>).map(([category, items]) => <div key={category}><h4>{category}</h4><ul>{items.map(item => <li key={item}>{item}</li>)}</ul></div>)}</div>
          </CaseSection>

          <CaseSection number="05" title="Core functionality">
            <div className="project-case-feature-grid">{project.features.map((feature, index) => <article key={feature.name}><small>{String(index + 1).padStart(2, '0')}</small><h4>{feature.name}</h4><p>{feature.detail}</p></article>)}</div>
          </CaseSection>

          <CaseSection number="06" title="Engineering decisions">
            {project.decisions.length ? <ol className="project-case-numbered">{project.decisions.map(item => <li key={item}>{item}</li>)}</ol> : <p>Specific internal decisions need repository evidence before they can be described here.</p>}
          </CaseSection>

          <CaseSection number="07" title="Data flow">
            <p className="project-case-flow">{project.dataFlow}</p>
          </CaseSection>

          {(project.security || project.challenges) && <CaseSection number="08" title="Security & challenges">
            <div className="project-case-two-col">{project.security && <div><h4>Security and data management</h4><p>{project.security}</p></div>}{project.challenges && <div><h4>Technical challenge</h4><p>{project.challenges}</p></div>}</div>
          </CaseSection>}

          <CaseSection number="09" title="My contribution">
            <p>{project.contribution}</p>
          </CaseSection>

          <CaseSection number="10" title="Gallery & source">
            <p className="project-case-gallery-note">Genuine interface screenshots and demonstrations can be added here. The visual above is an architecture preview, not an application screenshot.</p>
            <p className="project-case-source-note">{project.sourceNote}</p>
            <div className="project-case-source-links">
              {project.repositoryUrl ? <a href={project.repositoryUrl} target="_blank" rel="noopener noreferrer"><Github size={18} aria-hidden="true" /> View source code <ArrowUpRight size={16} aria-hidden="true" /></a> : <span>Repository link currently unavailable</span>}
              {project.liveUrl && <a className="project-case-demo-button" href={project.liveUrl} target="_blank" rel="noopener noreferrer">Live demo <ArrowUpRight size={16} aria-hidden="true" /></a>}
            </div>
          </CaseSection>
        </div>
      </div>
    </section>
  </div>, document.body);
}
