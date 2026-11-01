import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function ScrollTransition({ children }) {
  const scope = useRef(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const context = gsap.context(() => {
      gsap.to('.hero-content', { y: -75, opacity: 0.25, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 25%', scrub: true } });
      gsap.to('.singularity', { scale: 1.16, y: -35, opacity: 0.35, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 20%', scrub: true } });
      gsap.fromTo('.about-inner', { y: 65, opacity: 0 }, { y: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: '#about', start: 'top 90%', end: 'top 35%', scrub: true } });
    }, scope);
    return () => context.revert();
  }, []);
  return <div ref={scope}>{children}</div>;
}
