import { motion, useReducedMotion, useScroll } from 'motion/react';
import { useRef, type ReactNode } from 'react';

export interface TimelineEntry {
  title: string;
  stage: string;
  content: ReactNode;
}

/** Education milestones with an SVG path drawn by scroll progress. */
export function Timeline({ data }: { data: TimelineEntry[] }) {
  const containerRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 60%', 'end 60%']
  });

  return (
    <section className="education-timeline" ref={containerRef} aria-label="Education timeline">
      <div className="education-timeline-items relative mx-auto w-full">
        {data.map((item, index) => (
          <div className="education-timeline-entry flex" key={`${item.title}-${index}`}>
            <div className="education-timeline-marker sticky self-start">
              <span className="education-timeline-dot" aria-hidden="true" />
              <div className="education-timeline-label">
                <span className="education-timeline-number">{String(index + 1).padStart(2, '0')}</span>
                <h3>{item.title}</h3>
                <span className="education-timeline-stage">{item.stage}</span>
              </div>
            </div>
            <div className="education-timeline-content">{item.content}</div>
          </div>
        ))}
        <svg className="education-timeline-track" viewBox="0 0 8 100" preserveAspectRatio="none" aria-hidden="true">
          <path className="education-timeline-track-base" d="M 4 0 V 100" pathLength={1} />
          <motion.path
            className="education-timeline-track-progress"
            d="M 4 0 V 100"
            style={{ pathLength: reducedMotion ? 1 : scrollYProgress }}
          />
        </svg>
      </div>
    </section>
  );
}
