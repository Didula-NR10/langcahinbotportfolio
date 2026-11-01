import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// The rows trace the reference's stepped silhouette. Front, dark modules sit at z=0;
// the rear layer contains the brighter glass channel and cyan right-hand column.
const MODULE_LAYOUT = [
  { level: 2, depth: -2, cells: [[-1,'dark'],[0,'dark'],[1,'glass'],[2,'glass']] },
  { level: 2, depth: -1, cells: [[-2,'dark'],[-1,'dark'],[0,'dark'],[1,'glass'],[2,'glass'],[3,'glass']] },
  { level: 2, depth: 0, cells: [[-2,'blue'],[-1,'blue'],[0,'glass'],[1,'dark'],[2,'glass']] },
  { level: 1, depth: -2, cells: [[0,'dark'],[1,'glass'],[2,'glass'],[3,'glass']] },
  { level: 1, depth: -1, cells: [[-2,'blue'],[-1,'dark'],[0,'glass'],[1,'glass'],[2,'dark'],[3,'glass']] },
  { level: 1, depth: 0, cells: [[-2,'blue'],[-1,'blue'],[1,'glass'],[2,'dark']] },
  { level: 0, depth: -1, cells: [[-2,'dark'],[-1,'blue'],[0,'glass'],[1,'glass'],[2,'dark'],[3,'glass']] },
  { level: 0, depth: 0, cells: [[-2,'blue'],[-1,'blue'],[0,'blue'],[1,'glass'],[2,'blue']] },
  { level: -1, depth: -1, cells: [[-2,'blue'],[-1,'dark'],[0,'glass'],[1,'glass'],[2,'blue'],[3,'glass']] },
  { level: -1, depth: 0, cells: [[-2,'blue'],[-1,'blue'],[0,'blue'],[1,'glass'],[2,'dark']] },
  { level: -2, depth: -1, cells: [[-2,'blue'],[-1,'blue'],[0,'glass'],[1,'blue'],[2,'dark'],[3,'glass']] },
  { level: -2, depth: 0, cells: [[-2,'blue'],[-1,'blue'],[0,'blue'],[1,'blue'],[2,'dark']] }
];
const CONNECTORS = [
  { id: 'upper-left', from: [-1,2,0], to: [-1,2,-1], height: .88, bend: -.15 },
  { id: 'upper-right', from: [2,2,0], to: [2,2,-1], height: .65, bend: .1 },
  { id: 'lower-left', from: [-2,0,0], to: [-1,0,0], surface: 'front' },
  { id: 'lower-mid', from: [-1,-1,0], to: [0,-1,0], surface: 'front' }
];
const worldPosition = (x, level, depth) => [x * 1.035 + depth * .045, level * 1.04 - .52, depth * 1.045];
const MODULES = MODULE_LAYOUT.flatMap(({ level, depth, cells }) => cells.map(([x, material], index) => ({
  id: `${level}:${depth}:${x}`,
  position: worldPosition(x, level, depth),
  size: .965,
  material,
  illumination: material === 'glass' ? (x >= 2 ? 'cyan' : 'blue-cyan') : 'reflected',
  animationGroup: 2 - level,
  connectorRelationships: CONNECTORS.filter(c => [c.from, c.to].some(([cx, cy, cz]) => cx === x && cy === level && cz === depth)).map(c => c.id),
  index
})));

const ease = t => { const v = THREE.MathUtils.clamp(t, 0, 1); return v * v * (3 - 2 * v); };

function useMaterials() {
  const materials = useMemo(() => {
    const black = new THREE.MeshStandardMaterial({ color: '#05070E', metalness: .72, roughness: .16 });
    const blue = new THREE.MeshStandardMaterial({ color: '#123B9C', metalness: .66, roughness: .17 });
    const blueDark = new THREE.MeshStandardMaterial({ color: '#0A1F67', metalness: .68, roughness: .2 });
    const blueLight = new THREE.MeshStandardMaterial({ color: '#377BEE', metalness: .5, roughness: .16 });
    const cyan = new THREE.MeshStandardMaterial({ color: '#28DFFF', emissive: '#00B9FF', emissiveIntensity: 2, metalness: .26, roughness: .12, toneMapped: false });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#1A4168', metalness: .08, roughness: .06, transmission: .4, thickness: .3, ior: 1.45, transparent: true, opacity: .2, depthWrite: false });
    const glassFrame = new THREE.MeshStandardMaterial({ color: '#297CA8', emissive: '#087EAA', emissiveIntensity: .5, metalness: .64, roughness: .12 });
    const glassFacet = new THREE.MeshPhysicalMaterial({ color: '#238FC7', emissive: '#0869A8', emissiveIntensity: .7, metalness: .38, roughness: .09, transparent: true, opacity: .55, depthWrite: false });
    const innerDark = new THREE.MeshStandardMaterial({ color: '#07142B', metalness: .5, roughness: .14 });
    const connector = new THREE.MeshStandardMaterial({ color: '#101C35', metalness: .9, roughness: .17, emissive: '#061132', emissiveIntensity: .2, transparent: true, opacity: 1 });
    const edge = new THREE.LineBasicMaterial({ color: '#1E51AE', transparent: true, opacity: .62 });
    const led = Array.from({ length: 5 }, () => new THREE.MeshStandardMaterial({ color: '#37DFF9', emissive: '#059DFF', emissiveIntensity: 1.65, metalness: .16, roughness: .12, toneMapped: false }));
    return { black, blue, blueDark, blueLight, cyan, glass, glassFrame, glassFacet, innerDark, connector, edge, led,
      darkFaces: [blueDark, blue, black, blueDark, blue, blueDark],
      blueFaces: [blueLight, blue, black, blueDark, blue, blueDark] };
  }, []);
  useEffect(() => () => [...new Set(Object.values(materials).flat())].forEach(m => { if (m?.dispose) m.dispose(); }), [materials]);
  return materials;
}

function GlassModule({ materials, geometry, barGeometry, group }) {
  const bars = [];
  for (const y of [-.46, .46]) for (const z of [-.46, .46]) bars.push({ p: [0,y,z], s: [.95,.018,.018] });
  for (const y of [-.46, .46]) for (const x of [-.46, .46]) bars.push({ p: [x,y,0], s: [.018,.018,.95] });
  for (const x of [-.46, .46]) for (const z of [-.46, .46]) bars.push({ p: [x,0,z], s: [.018,.95,.018] });
  return <>
    <mesh geometry={geometry} material={materials.glass} />
    <mesh geometry={geometry} material={materials.innerDark} scale={[.58,.61,.58]} />
    <mesh geometry={geometry} material={materials.led[group]} position={[-.27,.04,.49]} scale={[.15,.68,.018]} />
    <mesh geometry={geometry} material={materials.cyan} position={[.25,-.13,.49]} scale={[.10,.52,.018]} />
    <mesh geometry={geometry} material={materials.glassFacet} position={[.04,-.12,.48]} scale={[.48,.28,.014]} />
    <mesh geometry={geometry} material={materials.glassFacet} position={[.48,.09,.12]} scale={[.014,.55,.36]} />
    <mesh geometry={geometry} material={materials.led[group]} position={[.49,.06,-.12]} scale={[.018,.7,.24]} />
    <mesh geometry={geometry} material={materials.cyan} position={[0,.49,-.14]} scale={[.72,.018,.15]} />
    {bars.map(({p,s},i) => <mesh key={i} geometry={barGeometry} material={i < 6 ? materials.glassFrame : materials.blueLight} position={p} scale={s} />)}
  </>;
}

function Cube({ module, materials, geometry, barGeometry, edgesGeometry, register, reducedMotion }) {
  const [x,y,z] = module.position;
  const start = reducedMotion ? module.position : [x+x*.035,y+.25+module.animationGroup*.04,z+.18];
  return <group ref={node => { register(module.id, node); }} position={start} scale={module.size*(reducedMotion ? 1 : .96)}>
    {module.material === 'glass'
      ? <GlassModule materials={materials} geometry={geometry} barGeometry={barGeometry} group={module.animationGroup} />
      : <><mesh geometry={geometry} material={module.material === 'dark' ? materials.darkFaces : materials.blueFaces} /><lineSegments geometry={edgesGeometry} material={materials.edge} scale={1.006}/></>}
  </group>;
}

function Connector({ config, material, index, register }) {
  const curve = useMemo(() => {
    const a = worldPosition(...config.from), b = worldPosition(...config.to);
    if (config.surface === 'front') {
      const za = a[2] + .49, zb = b[2] + .49;
      return new THREE.CatmullRomCurve3([
        new THREE.Vector3(a[0]-.24,a[1]+.02,za),
        new THREE.Vector3(a[0]-.44,a[1]-.15,za+.25),
        new THREE.Vector3((a[0]+b[0])*.5,a[1]-.31,za+.55),
        new THREE.Vector3(b[0]+.39,b[1]-.12,zb+.25),
        new THREE.Vector3(b[0]+.22,b[1]+.04,zb)
      ], false, 'centripetal');
    }
    const topA = new THREE.Vector3(a[0], a[1] + .48, a[2]);
    const topB = new THREE.Vector3(b[0], b[1] + .48, b[2]);
    const points = [topA, topA.clone().add(new THREE.Vector3(0,config.height*.55,0)),
      topA.clone().lerp(topB,.35).add(new THREE.Vector3(config.bend,config.height,0)),
      topA.clone().lerp(topB,.68).add(new THREE.Vector3(config.bend,config.height,0)),
      topB.clone().add(new THREE.Vector3(0,config.height*.55,0)), topB];
    return new THREE.CatmullRomCurve3(points, false, 'centripetal');
  }, [config]);
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 48, .045, 8, false), [curve]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <group ref={node => register(index, node, curve)}>
    <mesh geometry={geometry} material={material}/>
    <mesh visible={false}><sphereGeometry args={[.055,8,8]}/><meshBasicMaterial color="#43E6FF" toneMapped={false}/></mesh>
  </group>;
}

function CameraRig({ active, reducedMotion }) {
  const { camera, size, pointer, invalidate } = useThree();
  useEffect(() => {
    camera.position.set(9, 10, 11);
    camera.lookAt(.45, -.35, -.4);
    camera.zoom = Math.min(size.width / 8.7, size.height / 7.35);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  useFrame(() => {
    if (!active || reducedMotion) return;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, 9 + pointer.x*.28, .035);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 10 + pointer.y*.2, .035);
    camera.lookAt(.45, -.35, -.4);
  });
  return null;
}

function Sculpture({ active, reducedMotion }) {
  const { gl, scene } = useThree();
  const materials = useMaterials();
  const geometry = useMemo(() => new THREE.BoxGeometry(1,1,1), []);
  const barGeometry = useMemo(() => new THREE.BoxGeometry(1,1,1), []);
  const edgesGeometry = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);
  const cubes = useRef(new Map());
  const connectors = useRef([]);
  const elapsed = useRef(reducedMotion ? 10 : 0);
  const registerCube = (id,node) => { if (node) cubes.current.set(id,node); else cubes.current.delete(id); };
  const registerConnector = (index,node,curve) => { connectors.current[index] = node ? { node, curve } : null; };
  useEffect(() => () => { geometry.dispose(); barGeometry.dispose(); edgesGeometry.dispose(); }, [geometry,barGeometry,edgesGeometry]);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room).texture;
    scene.environment = environment;
    return () => { scene.environment = null; environment.dispose(); room.dispose(); pmrem.dispose(); };
  }, [gl,scene]);
  useFrame((_,dt) => {
    if (!active || reducedMotion) return;
    elapsed.current += Math.min(dt,.05);
    const t = elapsed.current;
    MODULES.forEach(module => {
      const cube = cubes.current.get(module.id);
      if (!cube) return;
      const progress = ease((t - module.animationGroup*.13) / 1.8);
      const [x,y,z] = module.position;
      const breathe = t > 2.5 && module.animationGroup === 1 ? Math.sin(t*.58)*.014 : 0;
      cube.position.set(x + (1-progress)*x*.035, y + (1-progress)*(.25+module.animationGroup*.04) + breathe, z + (1-progress)*.18);
      cube.scale.setScalar(module.size * (.96 + progress*.04));
    });
    materials.led.forEach((m,i) => { m.emissiveIntensity = t < 1.4 ? 0 : 1 + .48 * Math.max(0,Math.sin(t*1.6-i*.75)); });
    materials.connector.opacity = ease((t-1.1)/.7);
    connectors.current.forEach((entry,i) => {
      if (!entry) return;
      const orb = entry.node.children[1];
      orb.visible = t > 2;
      if (orb.visible) entry.curve.getPoint(((t-2)*.17 + i*.27) % 1, orb.position);
    });
  });
  return <>
    <CameraRig active={active} reducedMotion={reducedMotion}/>
    <ambientLight color="#15326E" intensity={.3}/>
    <hemisphereLight args={['#3A6DDE','#02030A',.64]}/>
    <directionalLight color="#559DFF" intensity={2.8} position={[3,8,7]}/>
    <pointLight color="#18D7FF" intensity={48} distance={9} decay={2} position={[4,3,3]}/>
    <pointLight color="#2545CE" intensity={35} distance={10} decay={2} position={[-4,2,-2]}/>
    <pointLight color="#A5DFFF" intensity={15} distance={9} decay={2} position={[1,6,-4]}/>
    {MODULES.map(module => <Cube key={module.id} module={module} materials={materials} geometry={geometry} barGeometry={barGeometry} edgesGeometry={edgesGeometry} register={registerCube} reducedMotion={reducedMotion}/>)}
    {CONNECTORS.map((config,index) => <Connector key={config.id} config={config} index={index} material={materials.connector} register={registerConnector}/>)}
  </>;
}

class SceneErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p className="reference-sculpture-fallback">The 3D sculpture could not load on this device.</p> : this.props.children; }
}

export default function ReferenceSculpture({ active }) {
  const [reducedMotion,setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible,setVisible] = useState(!document.hidden);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMedia = () => setReducedMotion(media.matches);
    const onVisibility = () => setVisible(!document.hidden);
    media.addEventListener('change',onMedia); document.addEventListener('visibilitychange',onVisibility);
    return () => { media.removeEventListener('change',onMedia); document.removeEventListener('visibilitychange',onVisibility); };
  }, []);
  return <SceneErrorBoundary><Canvas className="reference-sculpture-canvas" orthographic camera={{ position:[9,10,11], near:.1, far:100 }} dpr={[1, window.innerWidth < 700 ? 1.25 : 1.75]} frameloop={active && visible && !reducedMotion ? 'always' : 'demand'} gl={{ antialias:true, alpha:false, powerPreference:'high-performance' }} onCreated={({gl}) => { gl.setClearColor('#05060A'); gl.toneMappingExposure = 1.35; }}>
    <Sculpture active={active && visible} reducedMotion={reducedMotion}/>
  </Canvas></SceneErrorBoundary>;
}
