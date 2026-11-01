import { ArrowLeft, Orbit } from 'lucide-react';
import GalaxyBackground from '../components/GalaxyBackground';
import GalaxyNavigation from '../components/GalaxyNavigation';
import PortfolioFooter from '../components/PortfolioFooter';

export default function JourneyGateway() {
  return <main className="galaxy-page journey-gateway">
    <GalaxyBackground />
    <GalaxyNavigation page="journey" />
    <div className="journey-gateway-content">
      <section className="journey-gateway-panel" aria-labelledby="journey-title">
        <Orbit size={35} strokeWidth={1} aria-hidden="true" />
        <p>// FLIGHT PATH</p>
        <h1 id="journey-title">The journey is being mapped.</h1>
        <span>The Flight Path experience is in progress. Explore the portfolio sections while this page takes shape.</span>
        <a href="#about"><ArrowLeft size={18} aria-hidden="true" /> BACK TO ABOUT</a>
      </section>
    </div>
    <PortfolioFooter />
  </main>;
}
