import { ArrowRight } from 'lucide-react';
import AnimatedHomeBackground from '../components/AnimatedHomeBackground';
import GalaxyNavigation from '../components/GalaxyNavigation';
import EducationJourney from '../components/EducationJourney';
import ServicesUniverse from '../components/ServicesUniverse';
import FeaturedProjects from '../components/projects/FeaturedProjects';
import PortfolioFooter from '../components/PortfolioFooter';
import { AboutSection } from './AboutPage';
import '../portfolio-home.css';

const scrollToSection = id => event => {
  event.preventDefault();
  window.history.replaceState(null, '', `#${id}`);
  document.title = id === 'projects' ? 'Projects | Didula' : id === 'education' ? 'Education | Didula' : 'Didula | Portfolio';
  document.getElementById(id)?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  });
};

export default function PortfolioHome() {
  return (
    <main className="galaxy-page portfolio-home" id="home" aria-label="Didula portfolio home">
      <GalaxyNavigation />

      <section className="home-hero" aria-labelledby="home-hero-title">
        <AnimatedHomeBackground />
        <div className="home-hero-inner">
          <div className="home-hero-copy home-hero-copy--designer">
            <p className="home-hero-eyebrow">THE CREATIVE SIDE</p>
            <h1 id="home-hero-title">designer<span>.</span></h1>
            <p>I design clear, thoughtful interfaces that make complex ideas feel simple and useful.</p>
          </div>
          <div className="home-hero-art">
            <img src="/assets/didula-split-hero-cutout.png" alt="Didula portrayed as an expressive ink illustration on one side and a digital engineer on the other" width="1024" height="1535" fetchPriority="high" />
          </div>
          <div className="home-hero-copy home-hero-copy--coder">
            <p className="home-hero-eyebrow">THE TECHNICAL SIDE</p>
            <h2>&lt;coder&gt;</h2>
            <p>I build secure, scalable software with a focus on AI, cloud engineering, and modern web experiences.</p>
          </div>
          <a className="home-hero-scroll" href="#projects" onClick={scrollToSection('projects')}>Explore my work <ArrowRight size={16} aria-hidden="true" /></a>
        </div>
      </section>

      <AboutSection />

      <EducationJourney />

      <ServicesUniverse />

      <FeaturedProjects />
      <PortfolioFooter />
    </main>
  );
}
