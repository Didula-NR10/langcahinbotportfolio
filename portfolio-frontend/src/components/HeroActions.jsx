import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function HeroActions() {
  return <div className="hero-actions reveal-late">
    <a className="button button-primary" href="#about">Explore My Universe <ArrowDownRight size={18} strokeWidth={1.7} /></a>
    <a className="button button-secondary" href="#projects">Discover My Work <ArrowUpRight size={18} strokeWidth={1.7} /></a>
  </div>;
}
