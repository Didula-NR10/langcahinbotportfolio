import { useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function ProjectImageGallery({ project, reducedMotion = false }) {
  const images = [project.coverImage, ...project.gallery].filter(Boolean);
  const [index, setIndex] = useState(0);
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { once: true, margin: '200px' });
  const selected = images[Math.min(index, images.length - 1)];

  return <div className="mission-media" ref={containerRef}>
    <AnimatePresence mode="wait">
      {selected && <motion.div
        key={selected.src + index}
        className="mission-media-image"
        role="img"
        aria-label={selected.alt || `${project.title} preview`}
        style={{
          backgroundImage: inView ? `url("${selected.src}")` : 'none',
          backgroundPosition: selected.position || 'center',
          backgroundSize: selected.size || 'cover'
        }}
        initial={reducedMotion ? false : { opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={reducedMotion ? undefined : { opacity: 0, x: -8 }}
        transition={{ duration: reducedMotion ? 0 : 0.28 }}
      />}
    </AnimatePresence>
    {!selected && <span className="mission-media-empty">Project image coming soon</span>}
    <span className="mission-media-shade" aria-hidden="true" />
    {selected?.illustrative && <span className="mission-media-note">Illustrative preview</span>}
    {selected?.caption && <span className="mission-media-caption">{selected.caption}</span>}
    {images.length > 1 && <div className="mission-gallery-controls" aria-label={`${project.title} image gallery`}>
      <button type="button" aria-label="Previous image" onClick={() => setIndex((index - 1 + images.length) % images.length)}><ChevronLeft size={17} /></button>
      <span>{index + 1} / {images.length}</span>
      <button type="button" aria-label="Next image" onClick={() => setIndex((index + 1) % images.length)}><ChevronRight size={17} /></button>
    </div>}
  </div>;
}
