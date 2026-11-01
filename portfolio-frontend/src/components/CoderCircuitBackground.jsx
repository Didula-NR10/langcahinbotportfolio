import { useEffect, useRef } from 'react';

// Routes use only horizontal, vertical and 45-degree diagonal segments.
// The geometry is fixed; separate dash layers carry the moving signals.
const routePoints = [
  [[800, 56], [720, 56], [680, 96], [620, 96], [580, 136], [420, 136]],
  [[800, 88], [744, 88], [704, 128], [650, 128], [610, 168], [500, 168]],
  [[800, 126], [756, 126], [716, 166], [636, 166], [596, 206], [366, 206]],
  [[800, 160], [744, 160], [704, 200], [620, 200], [580, 240], [450, 240]],
  [[800, 215], [710, 215], [670, 255], [590, 255], [550, 295], [332, 295]],
  [[800, 253], [740, 253], [700, 293], [620, 293], [580, 333], [490, 333]],
  [[800, 370], [742, 370], [702, 330], [630, 330], [590, 290], [480, 290]],
  [[800, 405], [720, 405], [680, 365], [600, 365], [560, 325], [380, 325]],
  [[800, 454], [730, 454], [690, 414], [610, 414], [570, 374], [430, 374]],
  [[800, 490], [748, 490], [708, 450], [630, 450], [590, 410], [500, 410]],
  [[800, 570], [720, 570], [680, 530], [600, 530], [560, 490], [390, 490]],
  [[800, 605], [750, 605], [710, 565], [630, 565], [590, 525], [450, 525]],
  [[760, 0], [760, 150], [720, 190], [720, 310], [680, 350], [560, 350]],
  [[690, 0], [690, 120], [650, 160], [650, 280], [610, 320], [510, 320]],
  [[620, 0], [620, 85], [580, 125], [580, 225], [540, 265], [400, 265]],
  [[800, 15], [800, 145], [760, 185], [760, 270], [720, 310], [650, 310]],
  [[770, 700], [770, 565], [730, 525], [730, 440], [690, 400], [600, 400]],
  [[700, 700], [700, 605], [660, 565], [660, 470], [620, 430], [500, 430]],
  [[630, 700], [630, 615], [590, 575], [590, 505], [550, 465], [425, 465]],
  [[570, 700], [570, 620], [530, 580], [530, 515], [490, 475], [360, 475]],
  [[800, 305], [750, 305], [710, 345], [640, 345], [600, 385], [520, 385]],
  [[800, 338], [760, 338], [720, 378], [670, 378], [630, 418], [530, 418]],
  [[800, 640], [752, 640], [712, 600], [650, 600], [610, 560], [500, 560]],
  [[785, 0], [785, 85], [745, 125], [745, 230], [705, 270], [625, 270]],
  [[665, 0], [665, 70], [625, 110], [625, 215], [585, 255], [465, 255]],
  [[745, 700], [745, 640], [705, 600], [705, 500], [665, 460], [560, 460]],
  [[595, 700], [595, 655], [555, 615], [555, 550], [515, 510], [410, 510]],
  [[800, 535], [765, 535], [725, 495], [655, 495], [615, 455], [535, 455]]
];

const primaryRoutes = new Set([0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26]);

function halfway(points) {
  const lengths = points.slice(1).map(([x, y], index) => Math.hypot(x - points[index][0], y - points[index][1]));
  let remaining = lengths.reduce((sum, length) => sum + length, 0) / 2;
  for (let index = 0; index < lengths.length; index += 1) {
    if (remaining <= lengths[index]) {
      const amount = remaining / lengths[index];
      return [
        points[index][0] + (points[index + 1][0] - points[index][0]) * amount,
        points[index][1] + (points[index + 1][1] - points[index][1]) * amount
      ];
    }
    remaining -= lengths[index];
  }
  return points.at(-1);
}

const routes = routePoints.map((points, index) => ({
  id: index,
  path: points.map(([x, y], pointIndex) => `${pointIndex ? 'L' : 'M'} ${x} ${y}`).join(' '),
  terminal: halfway(points),
  primary: primaryRoutes.has(index),
  duration: `${(4.4 + (index % 6) * .43).toFixed(2)}s`,
  delay: `${(-.45 - index * .51).toFixed(2)}s`
}));

export default function CoderCircuitBackground() {
  const svgRef = useRef(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true;
    const update = () => {
      svg.classList.toggle('is-paused', motion.matches || document.hidden || !visible);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    }, { rootMargin: '80px' });
    observer.observe(svg);
    document.addEventListener('visibilitychange', update);
    motion.addEventListener('change', update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
      motion.removeEventListener('change', update);
    };
  }, []);

  return <svg ref={svgRef} className="home-coder-system" viewBox="0 0 800 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <filter id="home-pcb-soft-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
    </defs>
    {routes.map(route => <g
      key={route.id}
      className={`pcb-route${route.id >= 12 ? ' pcb-route--mobile-hidden' : ''}${route.id % 4 === 3 ? ' pcb-route--tablet-detail' : ''}`}
      style={{ '--flow-duration': route.duration, '--flow-delay': route.delay }}
    >
      <path className={`pcb-trace${route.primary ? ' pcb-trace--primary' : ' pcb-trace--secondary'}`} d={route.path} />
      {route.primary && <>
        <path className="pcb-signal pcb-signal--glow" d={route.path} pathLength="1000" />
        <path className="pcb-signal pcb-signal--body" d={route.path} pathLength="1000" />
        <path className="pcb-signal pcb-signal--head" d={route.path} pathLength="1000" />
        <circle className="pcb-terminal-base" cx={route.terminal[0]} cy={route.terminal[1]} r="3.1" />
        <circle className="pcb-terminal-ring" cx={route.terminal[0]} cy={route.terminal[1]} r="7.5" />
        <circle className="pcb-terminal-flash" cx={route.terminal[0]} cy={route.terminal[1]} r="4.7" />
      </>}
    </g>)}
  </svg>;
}
