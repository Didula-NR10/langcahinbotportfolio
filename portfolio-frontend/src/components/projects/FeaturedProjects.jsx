import ContainerScrollAnimationDemo from '../container-scroll-animation-demo';
import './project-scroll.css';

export default function FeaturedProjects() {
  return <section className="project-scroll-section" id="projects" aria-labelledby="projects-title">
    <ContainerScrollAnimationDemo />
  </section>;
}
