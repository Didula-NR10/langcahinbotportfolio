import { ArrowUpRight } from 'lucide-react';

const links = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Education', href: '#education' },
  { label: 'Services', href: '#services' },
  { label: 'Projects', href: '#projects' }
];

export default function PortfolioFooter() {
  return <footer className="portfolio-footer">
    <div className="portfolio-footer-inner">
      <div className="portfolio-footer-identity">
        <a href="#home" className="portfolio-footer-brand">DIDULA<span>.</span></a>
        <p>Software Developer &amp; Future Solutions Architect</p>
      </div>
      <nav aria-label="Footer navigation">
        {links.map(({ label, href }) => <a key={label} href={href}>{label}</a>)}
      </nav>
      <a className="portfolio-footer-top" href="#home">Back to top <ArrowUpRight size={16} aria-hidden="true" /></a>
    </div>
    <p className="portfolio-footer-copyright">© {new Date().getFullYear()} Didula. Built to explore what comes next.</p>
  </footer>;
}
