import { useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { projects } from '../../data/projects';
import ProjectArchitecture from './ProjectArchitecture';

type Project = typeof projects[number];
type ProjectImage = {
  src: string;
  alt?: string;
  position?: string;
  size?: string;
  illustrative?: boolean;
  caption?: string;
};

export default function ProjectInterfacePreview({ project, large = false }: { project: Project; large?: boolean }) {
  const [index, setIndex] = useState(0);
  const images = ([project.coverImage, ...project.gallery] as unknown as (ProjectImage | null)[]).filter((image): image is ProjectImage => Boolean(image));
  const image = images[Math.min(index, images.length - 1)];

  return <figure className={`project-interface-preview${large ? ' project-interface-preview--large' : ''}`}>
    {image ? <div
      className="project-interface-preview-image"
      role="img"
      aria-label={image.alt || `${project.title} interface preview`}
      style={{
        backgroundImage: `url("${image.src}")`,
        backgroundPosition: image.position || 'center',
        backgroundSize: image.size || 'cover'
      }}
    /> : <div className="project-interface-preview-empty">
      <ProjectArchitecture project={project} compact />
      <span><ImageIcon size={14} aria-hidden="true" /> Genuine interface screenshots to be added</span>
    </div>}
    <figcaption className="project-interface-preview-caption">
      <span>{image ? (image.illustrative ? 'Illustrative preview' : image.caption || 'Project interface') : 'Interactive architecture preview'}</span>
      {images.length > 1 && <span className="project-interface-preview-controls">
        <button type="button" aria-label={`Previous ${project.title} image`} onClick={() => setIndex((index - 1 + images.length) % images.length)}><ChevronLeft size={16} aria-hidden="true" /></button>
        <small>{index + 1} / {images.length}</small>
        <button type="button" aria-label={`Next ${project.title} image`} onClick={() => setIndex((index + 1) % images.length)}><ChevronRight size={16} aria-hidden="true" /></button>
      </span>}
    </figcaption>
  </figure>;
}
