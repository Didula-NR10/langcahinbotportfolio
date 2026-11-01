import { useState } from 'react';
import { BrainCircuit, ChevronRight, Cloud, Code2, Layers3, MapPin, ShieldCheck, Target } from 'lucide-react';

const focusAreas = [
  {
    title: 'Cloud & Enterprise Architecture',
    subtitle: 'Scalable · Resilient · Modern',
    detail: 'Exploring distributed systems, cloud infrastructure, scalable architectures, and enterprise integration.',
    Icon: Cloud
  },
  {
    title: 'Artificial Intelligence',
    subtitle: 'Learn · Experiment · Integrate',
    detail: 'Learning how intelligent systems can support useful, responsible software experiences.',
    Icon: BrainCircuit
  },
  {
    title: 'Cybersecurity',
    subtitle: 'Secure · Monitor · Defend',
    detail: 'Building a stronger understanding of secure design, monitoring, and data protection.',
    Icon: ShieldCheck
  },
  {
    title: 'Software Engineering',
    subtitle: 'Clean · Performant · Maintainable',
    detail: 'Designing software with clear structure, readable code, and dependable behavior.',
    Icon: Code2
  },
  {
    title: 'Scalable Systems',
    subtitle: 'Design · Optimize · Grow',
    detail: 'Studying how systems evolve as their users, data, and demands grow.',
    Icon: Layers3
  }
];

export default function ProfileDetails() {
  const [expanded, setExpanded] = useState(null);

  return <aside className="orbital-side" aria-label="Focus and location">
    <section className="orbital-focus-panel" aria-labelledby="about-focus-title">
      <p className="orbital-panel-label" id="about-focus-title">// CORE FOCUS AREAS</p>
      <div className="orbital-focus-list">
        {focusAreas.map(({ title, subtitle, detail, Icon }, index) => <div className="orbital-focus-item" key={title}>
          <button type="button" aria-expanded={expanded === index} aria-controls={`about-focus-detail-${index}`} onClick={() => setExpanded(expanded === index ? null : index)}>
            <Icon className="orbital-focus-icon" size={27} strokeWidth={1.6} aria-hidden="true" />
            <span><strong>{title}</strong><small>{subtitle}</small></span>
            <ChevronRight className="orbital-focus-arrow" size={18} aria-hidden="true" />
          </button>
          <div className={`orbital-focus-detail${expanded === index ? ' is-open' : ''}`} id={`about-focus-detail-${index}`} aria-hidden={expanded !== index}><p>{detail}</p></div>
        </div>)}
      </div>
    </section>
    <section className="orbital-location-panel" aria-label="Location and mission">
      <p className="orbital-panel-label">// CURRENT LOCATION</p>
      <div className="orbital-location-row"><MapPin size={22} aria-hidden="true" /><strong>Sri Lanka</strong></div>
      <div className="orbital-mission-row"><Target size={22} aria-hidden="true" /><div><span>// CURRENT MISSION</span><strong>Learning <i /> Building <i /> Exploring</strong></div></div>
    </section>
  </aside>;
}
