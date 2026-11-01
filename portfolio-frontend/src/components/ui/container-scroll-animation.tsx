// Adapted from Aceternity UI's container-scroll-animation registry component.
// https://ui.aceternity.com/registry/container-scroll-animation.json
import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';

type ContainerScrollProps = {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
};

export function ContainerScroll({ titleComponent, children }: ContainerScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const reducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const rotate = useTransform(scrollYProgress, [0, 0.3, 1], isMobile ? [8, 0, 0] : [14, 0, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.3, 1], isMobile ? [0.96, 1, 1] : [0.94, 1, 1]);
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return <div className="container-scroll-stage" ref={containerRef}>
    <Header translate={translate} titleComponent={titleComponent} reducedMotion={!!reducedMotion} />
    <div className="container-scroll-perspective">
      <Card rotate={rotate} scale={scale} reducedMotion={!!reducedMotion}>{children}</Card>
    </div>
  </div>;
}

export function Header({ translate, titleComponent, reducedMotion }: {
  translate: MotionValue<number>;
  titleComponent: string | React.ReactNode;
  reducedMotion?: boolean;
}) {
  return <motion.div className="container-scroll-heading" style={reducedMotion ? undefined : { translateY: translate }}>
    {titleComponent}
  </motion.div>;
}

export function Card({ rotate, scale, children, reducedMotion }: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  children: React.ReactNode;
  reducedMotion?: boolean;
}) {
  return <motion.div
    className="container-scroll-card"
    style={reducedMotion ? undefined : { rotateX: rotate, scale }}
  >
    <span className="tablet-camera" aria-hidden="true" />
    <span className="tablet-side-button" aria-hidden="true" />
    <div className="container-scroll-screen">{children}</div>
    <span className="tablet-home-indicator" aria-hidden="true" />
  </motion.div>;
}
