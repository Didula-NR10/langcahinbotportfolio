import { useEffect, useRef, useState } from 'react';
import GooeyNav from './GooeyNav/GooeyNav';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme';

const items = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Education', href: '#education' },
  { label: 'Services', href: '#services' },
  { label: 'Projects', href: '#projects' }
];

export default function GalaxyNavigation({ page = 'home' }) {
  const { theme, setTheme } = useTheme();
  const [navigationColors, setNavigationColors] = useState({ primary: '#1C756C', accent: '#85D4C3', secondary: '#72AFA5' });
  const [notice, setNotice] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [homeSection, setHomeSection] = useState(0);
  const timeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);
  useEffect(() => {
    const updateColors = event => {
      const tokens = event.detail?.tokens;
      const next = tokens
        ? { primary: tokens['--theme-button'], accent: tokens['--theme-accent'], secondary: tokens['--palette-circuit-active'] }
        : { primary: '#1C756C', accent: '#85D4C3', secondary: '#72AFA5' };
      setNavigationColors(current => current.primary === next.primary && current.accent === next.accent && current.secondary === next.secondary ? current : next);
    };
    window.addEventListener('portfolio-palette-change', updateColors);
    const root = document.documentElement;
    if (root.dataset.palette) {
      const style = getComputedStyle(root);
      updateColors({ detail: { tokens: {
        '--theme-button': style.getPropertyValue('--theme-button').trim(),
        '--theme-accent': style.getPropertyValue('--theme-accent').trim(),
        '--palette-circuit-active': style.getPropertyValue('--palette-circuit-active').trim()
      } } });
    }
    return () => window.removeEventListener('portfolio-palette-change', updateColors);
  }, []);
  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > 32);
      if (page !== 'home') return;
      const position = window.scrollY + 2;
      const about = document.getElementById('about');
      const services = document.getElementById('services');
      const projects = document.getElementById('projects');
      const education = document.getElementById('education');
      const next = projects && position >= projects.offsetTop ? 4 : services && position >= services.offsetTop ? 3 : education && position >= education.offsetTop ? 2 : about && position >= about.offsetTop ? 1 : 0;
      setHomeSection(current => current === next ? current : next);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [page]);

  const handleChange = (_index, item) => {
    clearTimeout(timeoutRef.current);
    if (item.href) {
      setNotice('');
      return;
    }
    setNotice(`${item.label} is coming soon.`);
    timeoutRef.current = setTimeout(() => setNotice(''), 3000);
  };

  return (
    <header className={`galaxy-navigation${scrolled ? ' is-scrolled' : ''}`}>
      <a className="navigation-brand" href="#home" aria-label="Didula home">DIDULA<span>.</span></a>
      <GooeyNav
        items={items}
        initialActiveIndex={0}
        activeIndex={page === 'about' || page === 'journey' ? 1 : homeSection}
        onChange={handleChange}
        theme={theme}
        color={navigationColors.primary}
        activeTextColor="#F1F5F9"
        colors={[navigationColors.primary, navigationColors.accent, navigationColors.secondary]}
        size="md"
        frame
        particleCount={8}
        spread={34}
        animationTime={500}
        timeVariance={150}
        gooeyness={0.45}
        wobble={0.3}
        hoverEffect
      />
      <button className="navigation-theme-toggle" type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} aria-pressed={theme === 'light'} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}>
        {theme === 'dark' ? <Sun size={19} strokeWidth={1.8} aria-hidden="true" /> : <Moon size={19} strokeWidth={1.8} aria-hidden="true" />}
      </button>
      <p className="navigation-notice" aria-live="polite">{notice}</p>
    </header>
  );
}
