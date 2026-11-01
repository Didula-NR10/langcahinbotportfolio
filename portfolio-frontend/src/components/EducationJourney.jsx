import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTheme } from '../theme';
import Galaxy from './Galaxy/Galaxy';
import './education-journey.css';

// All path points and milestone nodes use the same SVG coordinate system.
const layouts = {
  desktop: { height: 2100, points: [[500, 80], [290, 520], [710, 1090], [290, 1650], [500, 2020]] },
  tablet: { height: 2100, points: [[500, 80], [340, 520], [660, 1090], [340, 1650], [500, 2020]] },
  mobile: { height: 2100, points: [[500, 80], [95, 520], [275, 1090], [95, 1650], [500, 2020]] }
};

const milestones = [
  { number: '01', title: 'Bachelor of Science with Honours in Computer Science', details: ['University of Bedfordshire', '2024–2026'], achievement: 'First Class' },
  { number: '02', title: 'Higher National Diploma in IT', details: ['SLIIT City University (SCU)'] },
  { number: '03', title: 'G.C.E. O/L & A/L', qualifications: [
    { level: 'Ordinary Level (O/L)', school: 'Central College Kuliyapitiya', period: '2020 (2021)' },
    { level: 'Advanced Level (A/L)', school: 'Maliyadeva College, Kurunegala', stream: 'Science stream', period: '2023 (2024)' }
  ] }
];

function getLayout() {
  if (window.innerWidth < 768) return 'mobile';
  if (window.innerWidth < 1024) return 'tablet';
  return 'desktop';
}

function makePath(points, isMobile) {
  return points.reduce((path, [x, y], index) => {
    if (!index) return `M ${x} ${y}`;
    const [previousX, previousY] = points[index - 1];
    const midpointY = (previousY + y) / 2;
    // On mobile, finish the first bend early so it clears the first text block.
    const firstControlY = isMobile && index === 1 ? previousY + (y - previousY) * 0.18 : midpointY;
    const secondControlY = isMobile && index === 1 ? previousY + (y - previousY) * 0.45 : midpointY;
    return `${path} C ${previousX} ${firstControlY}, ${x} ${secondControlY}, ${x} ${y}`;
  }, '');
}

// The path's Y coordinate is monotonic, so this finds its exact length at a node.
function lengthAtY(path, targetY, totalLength) {
  let low = 0;
  let high = totalLength;
  for (let index = 0; index < 22; index += 1) {
    const middle = (low + high) / 2;
    if (path.getPointAtLength(middle).y < targetY) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

export default function EducationJourney() {
  const [layoutName, setLayoutName] = useState(getLayout);
  const { theme } = useTheme();
  const [dustColors, setDustColors] = useState(null);
  const sectionRef = useRef(null);
  const journeyRef = useRef(null);
  const pathRef = useRef(null);
  const nodeRefs = useRef([]);
  const contentRefs = useRef([]);
  const endRef = useRef(null);
  const layout = layouts[layoutName];
  const pathData = makePath(layout.points, layoutName === 'mobile');

  useEffect(() => {
    const sync = event => {
      const tokens = event?.detail?.tokens;
      if (tokens) setDustColors([tokens['--theme-text'], tokens['--theme-accent'], tokens['--palette-circuit-active'], tokens['--theme-accent']]);
      else if (document.documentElement.dataset.palette) {
        const style = getComputedStyle(document.documentElement);
        setDustColors(['--theme-text', '--theme-accent', '--palette-circuit-active', '--theme-accent'].map(name => style.getPropertyValue(name).trim()));
      } else setDustColors(null);
    };
    sync();
    window.addEventListener('portfolio-palette-change', sync);
    return () => window.removeEventListener('portfolio-palette-change', sync);
  }, []);

  useEffect(() => {
    const updateLayout = () => setLayoutName(current => {
      const next = getLayout();
      return next === current ? current : next;
    });
    window.addEventListener('resize', updateLayout, { passive: true });
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const journey = journeyRef.current;
    const path = pathRef.current;
    if (!section || !journey || !path) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let totalLength = 0;
    let startScroll = 0;
    let scrollDistance = 1;
    let thresholds = [];
    let hasUpdated = false;
    const pulseTimers = new Set();
    const active = Array(layout.points.length).fill(false);
    const revealed = Array(milestones.length).fill(false);

    const update = () => {
      frame = 0;
      if (reducedMotion.matches) return;
      const progress = Math.max(0, Math.min(1, (window.scrollY - startScroll) / scrollDistance));
      path.style.strokeDashoffset = String(totalLength * (1 - progress));

      nodeRefs.current.forEach((node, index) => {
        if (!node) return;
        const reached = index === 0 ? progress > 0 : progress >= thresholds[index];
        if (reached && !active[index]) {
          active[index] = true;
          node.classList.add('is-active');
          if (index > 0 && hasUpdated) {
            node.classList.add('is-pulsing');
            const timer = window.setTimeout(() => { node.classList.remove('is-pulsing'); pulseTimers.delete(timer); }, 700);
            pulseTimers.add(timer);
          }
        } else if (!reached && active[index] && progress < thresholds[index] - 0.006) {
          active[index] = false;
          node.classList.remove('is-active', 'is-pulsing');
        }
      });

      contentRefs.current.forEach((content, index) => {
        if (!content) return;
        const shouldReveal = progress >= thresholds[index + 1] - 0.025;
        if (shouldReveal !== revealed[index]) {
          revealed[index] = shouldReveal;
          content.classList.toggle('is-revealed', shouldReveal);
        }
      });
      endRef.current?.classList.toggle('is-revealed', progress >= 0.98);
      hasUpdated = true;
    };

    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const measure = () => {
      totalLength = path.getTotalLength();
      path.style.strokeDasharray = String(totalLength);
      thresholds = layout.points.map(([, y]) => lengthAtY(path, y, totalLength) / totalLength);
      const sectionTop = section.getBoundingClientRect().top + window.scrollY;
      const journeyTop = journey.getBoundingClientRect().top + window.scrollY;
      startScroll = sectionTop;
      scrollDistance = Math.max(1, journeyTop + layout.points.at(-1)[1] - window.innerHeight * 0.58 - startScroll);
      update();
    };

    const onMotionChange = () => {
      section.classList.toggle('is-motion-ready', !reducedMotion.matches);
      if (reducedMotion.matches) {
        path.style.strokeDashoffset = '0';
        nodeRefs.current.forEach(node => node?.classList.add('is-active'));
        contentRefs.current.forEach(content => content?.classList.add('is-revealed'));
        endRef.current?.classList.add('is-revealed');
      } else {
        hasUpdated = false;
        active.fill(false);
        revealed.fill(false);
        nodeRefs.current.forEach(node => node?.classList.remove('is-active', 'is-pulsing'));
        contentRefs.current.forEach(content => content?.classList.remove('is-revealed'));
        endRef.current?.classList.remove('is-revealed');
        measure();
      }
    };

    section.classList.add('is-measured');
    onMotionChange();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(journey);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    reducedMotion.addEventListener('change', onMotionChange);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', measure);
      reducedMotion.removeEventListener('change', onMotionChange);
      pulseTimers.forEach(timer => window.clearTimeout(timer));
    };
  }, [layoutName, layout]);

  return <section className="education-journey" id="education" ref={sectionRef} data-theme={theme} aria-labelledby="education-title">
    <div className="education-dust" aria-hidden="true">
      <Galaxy
        starColors={dustColors || (theme === 'light' ? ['#246e64', '#4e9b8c', '#678c91', '#377d70'] : ['#f2f7f4', '#85d4c3', '#8ab9be', '#f2f7f4'])}
        density={1.05}
        glowIntensity={0.18}
        starSize={0.68}
        flareIntensity={0.25}
        twinkleIntensity={0.25}
        starSpeed={0.32}
        speed={0.55}
        rotationSpeed={0.004}
        layers={2}
        direction="forward"
        mouseInteraction={false}
        mouseRepulsion={false}
        clickWarp={false}
        intro={false}
        transparent
        lightMode={theme === 'light'}
        opacity={theme === 'light' ? 0.38 : 0.6}
        dpr={0.65}
      />
    </div>
    <div className="education-journey-inner">
      <div className="education-journey-intro">
        <p className="education-journey-eyebrow">THE PATH SO FAR / 001—003</p>
        <h2 id="education-title">MY EDUCATIONAL<br /><span>JOURNEY</span></h2>
        <p>Three milestones, from degree to school qualifications.</p>
      </div>

      <div className="education-journey-canvas" ref={journeyRef} style={{ '--journey-height': `${layout.height}px` }}>
        <svg className="education-journey-svg" viewBox={`0 0 1000 ${layout.height}`} preserveAspectRatio="none" aria-hidden="true">
          <path className="education-path-halo" d={pathData} />
          <path className="education-path-base" d={pathData} />
          <path className="education-path-active" d={pathData} ref={pathRef} />
        </svg>
        {layout.points.map(([x, y], index) => <span
          className={`education-journey-node${index === 0 || index === layout.points.length - 1 ? ' education-journey-node--endpoint' : ''}`}
          key={index}
          ref={element => { nodeRefs.current[index] = element; }}
          style={{ left: `${x / 10}%`, top: `${y / layout.height * 100}%` }}
          aria-hidden="true"
        />)}
        {milestones.map((milestone, index) => {
          const [x, y] = layout.points[index + 1];
          return <article
            className={`education-milestone education-milestone--${index % 2 === 0 ? 'right' : 'left'}`}
            key={milestone.number}
            style={{ '--node-x': `${x / 10}%`, top: `${y / layout.height * 100}%` }}
          >
            <div className="education-milestone-content" ref={element => { contentRefs.current[index] = element; }}>
              <p className="education-milestone-number">{milestone.number} <span>/ 03</span></p>
              <h3>{milestone.title}</h3>
              {milestone.details && <ul>{milestone.details.map(detail => <li key={detail}>{detail}</li>)}</ul>}
              {milestone.achievement && <p className="education-milestone-achievement"><span>{milestone.achievement}</span></p>}
              {milestone.qualifications && <div className="education-school-qualifications">
                {milestone.qualifications.map(qualification => <div className="education-school-qualification" key={qualification.level}>
                  <h4>{qualification.level}</h4>
                  <p>{qualification.school}</p>
                  {qualification.stream && <p>{qualification.stream}</p>}
                  <time>{qualification.period}</time>
                </div>)}
              </div>}
            </div>
          </article>;
        })}
      </div>
      <div className="education-journey-ending" ref={endRef}>
        <p className="education-journey-eyebrow">THE NEXT CHAPTER</p>
        <p>Learning continues beyond the milestones.</p>
      </div>
    </div>
  </section>;
}
