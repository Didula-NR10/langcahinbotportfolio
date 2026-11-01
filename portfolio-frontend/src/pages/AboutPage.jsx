import { useEffect, useRef } from 'react';
import { Github, Linkedin, Mail, Phone } from 'lucide-react';
import GalaxyNavigation from '../components/GalaxyNavigation';
import PortfolioFooter from '../components/PortfolioFooter';
import { profileImageUrl, socialLinks } from '../config';
import '../about-reconstruction.css';

const contactItems = [
  { label: 'Email', value: socialLinks.email || 'Email to add', href: socialLinks.email ? `mailto:${socialLinks.email}` : '', Icon: Mail },
  { label: 'Phone', value: 'Phone number to add', href: '', Icon: Phone },
  { label: 'LinkedIn', value: socialLinks.linkedin || 'Profile link to add', href: socialLinks.linkedin, Icon: Linkedin },
  { label: 'GitHub', value: socialLinks.github || 'Profile link to add', href: socialLinks.github, Icon: Github }
];

const technologies = [
  { name: 'PHP', mark: 'PHP', tone: 'php' },
  { name: 'JavaScript', mark: 'JS', tone: 'javascript' },
  { name: 'React', mark: 'Re', tone: 'react' },
  { name: 'Laravel', mark: 'L', tone: 'laravel' },
  { name: 'Node.js', mark: 'N', tone: 'node' },
  { name: 'MySQL', mark: 'My', tone: 'mysql' }
];

function ContactItem({ label, value, href, Icon }) {
  const detail = href
    ? <a href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel={href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}>{value}</a>
    : <span>{value}</span>;
  return <li className="about-contact-item" aria-label={`${label}: ${value}`}>
    <span className="about-contact-icon"><Icon size={19} strokeWidth={1.7} aria-hidden="true" /></span>
    <span className="about-contact-text">{detail}</span>
  </li>;
}

function AboutDecorations() {
  return <svg className="about-decorative-lines" viewBox="0 0 1200 1600" preserveAspectRatio="xMidYMin meet" aria-hidden="true">
    <path d="M 620 -35 C 640 75 700 85 713 165 C 728 247 676 304 733 384 C 787 458 847 456 900 505 C 985 580 985 653 1074 610 C 1130 583 1152 526 1230 560" />
    <path d="M 686 -45 C 674 65 648 123 670 167 C 697 219 766 208 839 236 C 952 281 1002 362 1019 481 C 1033 572 1001 639 917 613 C 837 589 840 515 783 476" />
    <path d="M 780 175 C 901 211 978 275 1002 381 C 1046 570 1030 625 1198 460" />
    <path d="M 1195 1115 C 1107 1134 1033 1194 1004 1292 C 974 1395 1033 1497 1075 1610" />
    <path d="M 1240 1180 C 1135 1215 1093 1280 1040 1375 C 994 1463 1008 1515 1014 1615" />
  </svg>;
}

export function AboutSection({ embedded = true }) {
  const sectionRef = useRef(null);
  const MainHeading = embedded ? 'h2' : 'h1';
  const DetailHeading = embedded ? 'h3' : 'h2';

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    const targets = section.querySelectorAll('.about-hero, .about-info-panel');
    targets.forEach(target => observer.observe(target));
    section.classList.add('about-can-reveal');
    return () => observer.disconnect();
  }, []);

  return <section className="about-reconstruction" id="about" ref={sectionRef} aria-labelledby="about-title">
    <AboutDecorations />
    <div className="about-hero">
      <MainHeading className="about-title-capsule" id="about-title">About me</MainHeading>
      <div className="about-hero-copy">
        <div className="about-introduction">
          <p className="about-greeting">Hi!</p>
          <p>I'm Didula, a Computer Science student and software developer focused on useful, well-designed systems.</p>
          <p>I explore AI engineering, cybersecurity engineering, and software and cloud architecture as I work toward becoming a software, cloud, or enterprise architect.</p>
        </div>
        <div className="about-contact" aria-labelledby="about-contact-title">
          <DetailHeading id="about-contact-title">Contact</DetailHeading>
          <ul>{contactItems.map(item => <ContactItem key={item.label} {...item} />)}</ul>
        </div>
      </div>
      <div className="about-portrait-area">
        <div className="about-portrait-light" aria-hidden="true" />
        <div className="about-portrait-frame">
          <img src={profileImageUrl} alt="Portrait of Didula" width="270" height="385" loading="eager" decoding="sync" fetchPriority="high" />
        </div>
      </div>
    </div>

    <div className="about-info-panel">
      <div className="about-info-grid">
        <div className="about-info-column">
          <section className="about-info-group about-info-education" aria-labelledby="about-education-title">
            <div className="about-info-heading-row"><DetailHeading id="about-education-title">Education</DetailHeading><span className="about-period-pill">2024–2026</span></div>
            <p>University of Bedfordshire · BSc (Hons) Computer Science · <strong className="about-education-honours">First Class</strong></p>
          </section>
          <section className="about-info-group about-info-technology" aria-labelledby="technologies-title">
            <DetailHeading id="technologies-title">Technical skill</DetailHeading>
            <ul className="about-technology-list" aria-label="Technologies used in portfolio projects">
              {technologies.map(({ name, mark, tone }) => <li key={name} aria-label={name}><span className={`about-technology-mark about-technology-mark--${tone}`} aria-hidden="true">{mark}</span></li>)}
            </ul>
          </section>
          <section className="about-info-group about-info-interest" aria-labelledby="areas-title">
            <DetailHeading id="areas-title">Interest</DetailHeading>
            <div className="about-inline-pair"><span>Artificial Intelligence</span><span>Cybersecurity &amp; Cloud</span></div>
          </section>
        </div>
        <div className="about-info-column">
          <section className="about-info-group about-info-soft" aria-labelledby="soft-skills-title">
            <DetailHeading id="soft-skills-title">Soft skill</DetailHeading>
            <div className="about-detail-columns"><div>Teamwork<br />Communication</div><div>Critical Thinking<br />Time Management</div></div>
          </section>
          <section className="about-info-group about-info-skills" aria-labelledby="competencies-title">
            <DetailHeading id="competencies-title">Skill set</DetailHeading>
            <div className="about-detail-columns"><div>Software design<br />Application development<br />Database design</div><div>Web development<br />System analysis<br />Security awareness</div></div>
          </section>
          <section className="about-info-group about-info-language" aria-labelledby="languages-title">
            <DetailHeading id="languages-title">Language</DetailHeading>
            <div className="about-inline-pair"><span>Languages to add</span></div>
          </section>
        </div>
      </div>
    </div>
  </section>;
}

export default function AboutPage() {
  return <main className="galaxy-page about-page-shell">
    <GalaxyNavigation page="about" />
    <AboutSection embedded={false} />
    <PortfolioFooter />
  </main>;
}
