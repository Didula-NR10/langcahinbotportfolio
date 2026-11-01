export default function CosmicSingularity() {
  return <div className="singularity" aria-hidden="true">
    <div className="singularity-aura" />
    <div className="singularity-disc" />
    <div className="singularity-ring singularity-ring-one" />
    <div className="singularity-ring singularity-ring-two" />
    <div className="singularity-ring singularity-ring-three" />
    <div className="singularity-core" />
    <div className="singularity-glint" />
    <span className="orbit-point orbit-point-one" /><span className="orbit-point orbit-point-two" />
    <span className="annotation annotation-top"><span className="annotation-rule" /> SYSTEM / ONLINE</span>
    <span className="annotation annotation-right">EXPLORATION / ACTIVE <span className="annotation-rule" /></span>
    <span className="annotation annotation-bottom">COORDINATES / UNKNOWN</span>
  </div>;
}
