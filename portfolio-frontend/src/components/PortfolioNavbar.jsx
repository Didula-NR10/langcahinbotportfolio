import { useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';

const navItems = [
  ['Home', '#home'],
  ['About', '#about'],
  ['Tech Stack', '#tech-stack'],
  ['Projects', '#projects'],
  ['Architecture', '#architecture'],
  ['Journey', '#journey']
];

export default function PortfolioNavbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header reveal-nav">
      <nav className="nav-shell" aria-label="Main navigation">
        <a className="wordmark" href="#home" onClick={() => setOpen(false)} aria-label="Didula, home">
          <span className="wordmark-symbol" aria-hidden="true"><span /></span>
          <span>DIDULA<span className="wordmark-dot">.</span></span>
        </a>
        <div className={`nav-links${open ? ' is-open' : ''}`} id="nav-links">
          {navItems.map(([label, href], index) => <a key={label} className={index === 0 ? 'active' : ''} href={href} onClick={() => setOpen(false)}>{label}</a>)}
          <a className="mobile-talk" href="#contact" onClick={() => setOpen(false)}>Let's Talk <ArrowUpRight size={16} /></a>
        </div>
        <a className="nav-contact" href="#contact">Let's Talk <ArrowUpRight size={15} strokeWidth={1.8} /></a>
        <button type="button" className="menu-toggle" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="nav-links" onClick={() => setOpen(value => !value)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
      </nav>
    </header>
  );
}
