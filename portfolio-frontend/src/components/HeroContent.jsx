import HeroActions from './HeroActions';

export default function HeroContent() {
  return <div className="hero-content" id="hero-content">
    <div className="eyebrow reveal-early"><span className="status-light" /> // INITIALIZING DIGITAL UNIVERSE <span className="eyebrow-index">001 / ∞</span></div>
    <h1 className="hero-title" id="hero-heading"><span className="title-line"><span>BEYOND CODE<span className="title-period">.</span></span></span><span className="title-line"><span>INTO THE <em>UNKNOWN.</em></span></span></h1>
    <p className="hero-identity reveal-mid">Software Engineer <span>·</span> Cloud &amp; Enterprise Architecture <span>·</span> AI &amp; Cybersecurity</p>
    <p className="hero-description reveal-late">I design and explore secure, scalable, and intelligent digital systems — turning complex ideas into meaningful technology.</p>
    <HeroActions />
  </div>;
}
