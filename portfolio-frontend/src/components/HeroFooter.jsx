import { ArrowUpRight, Github, Linkedin, Mail } from 'lucide-react';
import { socialLinks } from '../config';

function Social({ href, label, icon: Icon }) {
  if (!href) return <span className="social-unavailable" title={`${label} link coming soon`} aria-label={`${label} link coming soon`}><Icon size={15} strokeWidth={1.6} /><span>{label}</span></span>;
  return <a href={href} aria-label={label} target={href.startsWith('mailto:') ? undefined : '_blank'} rel={href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}><Icon size={15} strokeWidth={1.6} /><span>{label}</span><ArrowUpRight size={12} /></a>;
}

export default function HeroFooter() {
  return <div className="hero-footer reveal-late">
    <div className="footer-location"><span className="location-cross">✳</span><span>Based in Sri Lanka<small>Building for a connected world</small></span></div>
    <a className="scroll-cue" href="#about"><span className="scroll-track"><span /></span><span>SCROLL TO EXPLORE</span></a>
    <div className="footer-socials"><Social href={socialLinks.github} label="GitHub" icon={Github} /><Social href={socialLinks.linkedin} label="LinkedIn" icon={Linkedin} /><Social href={socialLinks.email ? `mailto:${socialLinks.email}` : ''} label="Email" icon={Mail} /></div>
  </div>;
}
