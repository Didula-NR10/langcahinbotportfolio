import CoderCircuitBackground from './CoderCircuitBackground';
import HomeCinematicScene from './HomeCinematicScene';
import '../home-cinematic.css';

export default function AnimatedHomeBackground() {
  return <div className="home-hero-background" aria-hidden="true">
    <CoderCircuitBackground />
    <HomeCinematicScene />
  </div>;
}
