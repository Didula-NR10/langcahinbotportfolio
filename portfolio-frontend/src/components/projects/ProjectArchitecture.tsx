import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { projects } from '../../data/projects';

type Project = typeof projects[number];

export default function ProjectArchitecture({ project, compact = false }: { project: Project; compact?: boolean }) {
  const [active, setActive] = useState(0);
  const nodes = project.architecture.nodes;
  const selected = nodes[active];

  return <div className={`project-architecture${compact ? ' project-architecture--compact' : ''}`}>
    <div className="project-architecture-rail" role="group" aria-label={`${project.title} architecture components`}>
      {nodes.map((node, index) => <div className="project-architecture-step" key={node.name}>
        <button type="button" className={index === active ? 'is-active' : ''} aria-pressed={index === active} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onClick={() => setActive(index)}>
          <small>{String(index + 1).padStart(2, '0')}</small>
          <strong>{node.name}</strong>
        </button>
        {index < nodes.length - 1 && <ArrowRight className="project-architecture-arrow" size={17} aria-hidden="true" />}
      </div>)}
    </div>
    {!compact && <div className="project-architecture-inspector" aria-live="polite">
      <span>COMPONENT {String(active + 1).padStart(2, '0')} / {String(nodes.length).padStart(2, '0')}</span>
      <h4>{selected.name}</h4>
      <p>{selected.role}</p>
      <dl><div><dt>Receives</dt><dd>{selected.receives}</dd></div><div><dt>Communicates with</dt><dd>{selected.connects}</dd></div></dl>
    </div>}
  </div>;
}
