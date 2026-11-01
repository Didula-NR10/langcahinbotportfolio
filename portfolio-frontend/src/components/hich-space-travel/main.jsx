import React, {useEffect,useMemo,useRef,useState,useCallback} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Html,Stars} from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

// Technology labels are suggested visual examples, not claims about Hi.Ch's deployed stack.
const TECH={
 ai:[['Python','python/python-original.svg'],['LangChain',null],['PyTorch','pytorch/pytorch-original.svg'],['TensorFlow','tensorflow/tensorflow-original.svg'],['OpenAI API',null],['RAG',null],['Node.js','nodejs/nodejs-original.svg'],['Docker','docker/docker-original.svg']],
 erp:[['Java','java/java-original.svg'],['Spring','spring/spring-original.svg'],['PostgreSQL','postgresql/postgresql-original.svg'],['MySQL','mysql/mysql-original.svg'],['Docker','docker/docker-original.svg'],['Redis','redis/redis-original.svg'],['PHP','php/php-original.svg'],['Laravel','laravel/laravel-original.svg']],
 pos:[['React','react/react-original.svg'],['Java','java/java-original.svg'],['Node.js','nodejs/nodejs-original.svg'],['MySQL','mysql/mysql-original.svg'],['PostgreSQL','postgresql/postgresql-original.svg'],['REST APIs',null],['TypeScript','typescript/typescript-original.svg']],
 mobile:[['Kotlin','kotlin/kotlin-original.svg'],['Flutter','flutter/flutter-original.svg'],['Dart','dart/dart-original.svg'],['Java','java/java-original.svg'],['React Native','react/react-original.svg'],['Swift','swift/swift-original.svg'],['Firebase','firebase/firebase-original.svg']],
 web:[['JavaScript','javascript/javascript-original.svg'],['React','react/react-original.svg'],['PHP','php/php-original.svg'],['Laravel','laravel/laravel-original.svg'],['Node.js','nodejs/nodejs-original.svg'],['TypeScript','typescript/typescript-original.svg'],['Next.js','nextjs/nextjs-original.svg'],['HTML5','html5/html5-original.svg'],['CSS3','css3/css3-original.svg']]
};
const DESTINATIONS=[
 {id:'ai',name:'AI Agents',type:'INTELLIGENT AUTOMATION',desc:'Autonomous assistants and intelligent workflows designed around your business.',position:[0,0,-27],color:'#67E8F9'},
 {id:'erp',name:'ERP Systems',type:'CONNECTED OPERATIONS',desc:'Purpose-built enterprise systems that bring business processes together.',position:[-24,8,-58],color:'#67E8F9'},
 {id:'pos',name:'POS Systems',type:'COMMERCE ENGINEERING',desc:'Modern point-of-sale solutions for streamlined daily operations.',position:[25,-6,-90],color:'#67E8F9'},
 {id:'mobile',name:'Mobile Apps',type:'DIGITAL EXPERIENCES',desc:'Responsive mobile experiences built for real-world use.',position:[-20,-4,-123],color:'#67E8F9'},
 {id:'web',name:'Web Applications',type:'CUSTOM PLATFORMS',desc:'Scalable web applications designed to solve complex challenges.',position:[19,8,-153],color:'#67E8F9'}
];
const HOME=new THREE.Vector3(0,2,15);
const ICON_BASE='https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/';
function TechLogo({name,path}){
 const [failed,setFailed]=useState(false);
 return <div className="tech-logo">{path&&!failed?<img src={ICON_BASE+path} alt="" loading="lazy" onError={()=>setFailed(true)}/>:<span className="tech-fallback">{name.slice(0,2).toUpperCase()}</span>}<span className="tech-name">{name}</span></div>;
}
function TechnologyConstellation({item,visible}){
 const orbit=useRef();
 const entries=useMemo(()=>TECH[item.id].map(([name,path],i)=>{
  const angle=i*2.39996323, radius=7.8+(i%3)*2.25;
  return {name,path,position:[Math.cos(angle)*radius,Math.sin(angle)*radius*.67,(i%4-1.5)*3.4]};
 }),[item.id]);
 useFrame((state,dt)=>{if(orbit.current)orbit.current.rotation.y+=dt*.013;});
 return <group ref={orbit} visible={visible}>{entries.map((t,i)=><group key={t.name} position={t.position}>
  <mesh><sphereGeometry args={[.095,8,8]}/><meshBasicMaterial color={i%3===0?'#F1F5F9':item.color}/></mesh>
  <pointLight color={item.color} intensity={.25} distance={2.5}/>
  <Html center transform distanceFactor={12} style={{pointerEvents:'none'}}><TechLogo name={t.name} path={t.path}/></Html>
 </group>)}</group>;
}
function Destination({item,active,onSelect,traveling}){
 const ref=useRef();const glow=useRef();
 useFrame((state,dt)=>{if(ref.current){ref.current.rotation.y+=dt*.13;ref.current.rotation.x=Math.sin(state.clock.elapsedTime*.3+item.position[0])*.065;}if(glow.current)glow.current.scale.setScalar(1+Math.sin(state.clock.elapsedTime*1.1)*.04)});
 return <group position={item.position}>
  <mesh ref={ref} onClick={e=>{e.stopPropagation();onSelect(item.id)}} onPointerOver={()=>document.body.style.cursor='pointer'} onPointerOut={()=>document.body.style.cursor='auto'}>
   <icosahedronGeometry args={[3.15,3]}/><meshStandardMaterial color="#050816" wireframe emissive={item.color} emissiveIntensity={active?.52:.19} transparent opacity={.85}/>
  </mesh>
  <mesh ref={glow}><sphereGeometry args={[2.5,24,24]}/><meshBasicMaterial color={item.color} transparent opacity={active?.07:.025} depthWrite={false}/></mesh>
  <mesh rotation={[1.1,.35,.3]}><torusGeometry args={[4.55,.016,3,150]}/><meshBasicMaterial color={item.color} transparent opacity={.57}/></mesh>
  <pointLight color={item.color} intensity={active?3.5:1.3} distance={21}/>
  {/* Technology badges are rendered in a screen-safe orbit overlay to prevent clipping. */}
  {!active&&<Html position={[0,-5.5,0]} center distanceFactor={17} style={{pointerEvents:'none'}}><span className="object-label">{item.name}</span></Html>}
 </group>;
}
// Camera-attached GPU star tunnel. Each star is a perspective streak, animated in shader space.
const warpVertex=`attribute float aSize;attribute float aSeed;uniform float uSpeed;uniform float uTime;varying float vBrightness;void main(){
 vec3 p=position;float travel=uTime*(4.0+uSpeed*165.0);p.z=mod(p.z+travel+aSeed*13.0+220.0,220.0)-220.0;
 vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;
 gl_PointSize=clamp(aSize*(1.0+uSpeed*2.2)*240.0/max(5.0,-mv.z),1.0,8.0);
 vBrightness=(.32+.68*fract(aSeed*17.0))*(.4+.6*uSpeed);
}`;
const warpFragment=`uniform float uSpeed;varying float vBrightness;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float core=1.0-smoothstep(.05,.5,d);float halo=exp(-d*9.0)*.35;float a=(core+halo)*(1.0-smoothstep(.43,.5,d))*vBrightness;vec3 col=mix(vec3(.945,.961,.976),vec3(.404,.91,.976),.35+uSpeed*.25);gl_FragColor=vec4(col,a);}`;
function WarpField({speed}){
 const {camera}=useThree();const group=useRef();const material=useRef();const time=useRef(0);
 const geo=useMemo(()=>{const count=3200;const p=new Float32Array(count*3),sizes=new Float32Array(count),seeds=new Float32Array(count);
  for(let i=0;i<count;i++){const angle=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*100+1;p[i*3]=Math.cos(angle)*r;p[i*3+1]=Math.sin(angle)*r;p[i*3+2]=-Math.random()*220;sizes[i]=.5+Math.random()*2.1;seeds[i]=Math.random();}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));g.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));return g;
 },[]);
 useEffect(()=>()=>geo.dispose(),[geo]);
 useFrame((_,dt)=>{time.current+=Math.min(dt,.05);if(group.current){group.current.position.copy(camera.position);group.current.quaternion.copy(camera.quaternion);}if(material.current){material.current.uniforms.uTime.value=time.current;material.current.uniforms.uSpeed.value=speed.current;}});
 return <group ref={group}><points geometry={geo} frustumCulled={false}><shaderMaterial ref={material} vertexShader={warpVertex} fragmentShader={warpFragment} transparent depthWrite={false} blending={THREE.AdditiveBlending} uniforms={{uTime:{value:0},uSpeed:{value:0}}}/></points></group>;
}
// Procedural nebula layers: wispy colored cloud banks, not flat galaxy photos.
const nebulaVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const nebulaFragment=`varying vec2 vUv;uniform float uTime;uniform float uSpeed;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.05;a*=.5;}return v;}
 void main(){vec2 uv=vUv;float t=uTime*.008;float n=fbm(uv*5.2+vec2(t,-t*.4));float cloud=smoothstep(.49,.83,n);float edge=pow(abs(uv.x-.5)*2.,.8);float haze=cloud*(.28+.72*edge);vec3 blue=vec3(.231,.51,.965),cyan=vec3(.404,.91,.976);vec3 col=mix(blue,cyan,smoothstep(.3,.9,uv.y));float alpha=haze*(.16+uSpeed*.18);gl_FragColor=vec4(col,alpha);}`;
function NebulaClouds({speed}){
 const {camera}=useThree();const group=useRef();const mat=useRef();const clock=useRef(0);
 useFrame((_,dt)=>{clock.current+=Math.min(dt,.05);if(group.current){group.current.position.copy(camera.position);group.current.quaternion.copy(camera.quaternion);}if(mat.current){mat.current.uniforms.uTime.value=clock.current;mat.current.uniforms.uSpeed.value=speed.current;}});
 return <group ref={group}><mesh position={[0,0,-95]} scale={[220,135,1]}><planeGeometry args={[1,1]}/><shaderMaterial ref={mat} vertexShader={nebulaVertex} fragmentShader={nebulaFragment} transparent depthWrite={false} side={THREE.DoubleSide} uniforms={{uTime:{value:0},uSpeed:{value:0}}}/></mesh></group>;
}
function FlightController({target,onArrive,onProgress,speed}){
 const {camera}=useThree();const tween=useRef();const look=useRef(new THREE.Vector3(0,0,-27));const initialized=useRef(false);
 useEffect(()=>{
  if(!initialized.current){initialized.current=true;camera.position.copy(HOME);camera.lookAt(look.current);onArrive();return;}
  tween.current?.kill();
  const end=target?new THREE.Vector3(...target.position).add(new THREE.Vector3(0,1,13)):HOME.clone();
  const focus=target?new THREE.Vector3(...target.position):new THREE.Vector3(0,0,-27);
  const start=camera.position.clone(),startLook=look.current.clone();const state={t:0};
  tween.current=gsap.to(state,{t:1,duration:3.25,ease:'power2.inOut',onUpdate:()=>{
   const t=state.t;camera.position.copy(start).lerp(end,t);look.current.copy(startLook).lerp(focus,t);camera.lookAt(look.current);
   const warp=Math.pow(Math.sin(Math.PI*t),1.8);speed.current=warp;onProgress(warp);
  },onComplete:()=>{speed.current=0;onProgress(0);onArrive();}});
  return ()=>{tween.current?.kill();speed.current=0;};
 },[target?.id]);return null;
}
function Universe({target,traveling,onArrive,onProgress}){
 const speed=useRef(0);
 return <Canvas camera={{position:[0,2,15],fov:64,near:.1,far:350}} dpr={[1,1.65]} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>gl.setClearColor('#050816')}>
  <ambientLight intensity={.35}/>{!traveling&&<Stars radius={200} depth={160} count={1800} factor={2.8} saturation={0} fade speed={.07}/>}
  <NebulaClouds speed={speed}/>{!traveling&&<WarpField speed={speed}/>}
  {DESTINATIONS.map(item=><Destination key={item.id} item={item} active={target?.id===item.id} traveling={traveling} onSelect={id=>window.dispatchEvent(new CustomEvent('hich-navigate',{detail:id}))}/>)}
  <FlightController target={target} onArrive={onArrive} onProgress={onProgress} speed={speed}/>
 </Canvas>;
}

// Screen-safe technology orbit. The orbit occupies only the middle column;
// its badges remain fully readable and never pass behind the left/right UI.
function TechnologyOrbit({item,visible}){
 const [paused,setPaused]=useState(false);
 if(!item)return null;
 const technologies=TECH[item.id];
 return <div className={'technology-orbit '+(visible?'is-visible':'')} aria-label={`${item.name} illustrative technologies`} onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}>
  <div className={'orbit-stage '+(paused?'orbit-paused':'')}>
   <div className="orbit-track orbit-track-one"/><div className="orbit-track orbit-track-two"/>
   {technologies.map(([name,path],i)=>{
    const angle=2*Math.PI*i/technologies.length-Math.PI/2;
    const x=50+43*Math.cos(angle), y=50+41*Math.sin(angle);
    return <div className="orbit-tech" key={name} style={{left:`${x}%`,top:`${y}%`,animationDelay:`${i*-.45}s`}} title={name}>
      <TechLogo name={name} path={path}/>
    </div>;
   })}
  </div>
 </div>;
}
// Fine streaks move outward during travel.
function HyperspaceOverlay({active,intensity}){
 const canvas=useRef(null);const value=useRef(0);
 useEffect(()=>{value.current=intensity},[intensity]);
 useEffect(()=>{
  if(!active||!canvas.current)return;
  const el=canvas.current,ctx=el.getContext('2d',{alpha:true});
  if(!ctx)return;
  let raf=0,w=0,h=0,dpr=1;
  const count=350;
  const stars=Array.from({length:count},()=>({a:Math.random()*Math.PI*2,r:Math.random()*.98+.015,z:Math.random(),tint:Math.random()}));
  const resize=()=>{dpr=Math.min(window.devicePixelRatio||1,2);w=window.innerWidth;h=window.innerHeight;el.width=Math.round(w*dpr);el.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)};
  resize();window.addEventListener('resize',resize);
  const draw=()=>{
   ctx.clearRect(0,0,w,h);
   const power=Math.max(.06,value.current),cx=w*.5,cy=h*.5,reach=Math.hypot(w,h)*.62;
   ctx.fillStyle=`rgba(5,8,22,${.08+power*.1})`;ctx.fillRect(0,0,w,h);
   stars.forEach(st=>{
    st.r+= (.0012+st.z*.005)*(.5+power*2.6);
    if(st.r>1.15){st.r=.006;st.a=Math.random()*Math.PI*2;st.z=Math.random()}
    const r=st.r*reach;
    const x=cx+Math.cos(st.a)*r,y=cy+Math.sin(st.a)*r*.73;
    const col=st.tint<.2?'103,232,249':st.tint<.35?'59,130,246':'241,245,249';
    const length=(3+st.r*30)*power*(.5+st.z);
    ctx.strokeStyle=`rgba(${col},${Math.min(.72,.18+st.z*.3+power*.22)})`;
    ctx.lineWidth=.7;
    ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(x-Math.cos(st.a)*length,y-Math.sin(st.a)*length*.73);ctx.lineTo(x,y);ctx.stroke();
   });
   raf=requestAnimationFrame(draw);
  };
  raf=requestAnimationFrame(draw);
  return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize)};
 },[active]);
 return <canvas ref={canvas} className={'hyperspace-overlay '+(active?'warp-visible':'')} aria-hidden="true"/>;
}

function App(){
 const [selected,setSelected]=useState(null),[traveling,setTraveling]=useState(false),[progress,setProgress]=useState(0),[arrived,setArrived]=useState(true);
 const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{const m=window.matchMedia('(prefers-reduced-motion: reduce)');const h=()=>setReduced(m.matches);m.addEventListener('change',h);return()=>m.removeEventListener('change',h)},[]);
 const target=DESTINATIONS.find(d=>d.id===selected)||null;
 const go=useCallback(id=>{if(id===selected)return;setArrived(false);setTraveling(!reduced);setSelected(id);if(reduced){setTimeout(()=>{setTraveling(false);setArrived(true)},50)}},[selected,reduced]);
 useEffect(()=>{const h=e=>go(e.detail);window.addEventListener('hich-navigate',h);return()=>window.removeEventListener('hich-navigate',h)},[go]);
 return <main className="app">
  <div className="universe"><Universe target={target} traveling={traveling} onArrive={()=>{setTraveling(false);setArrived(true)}} onProgress={setProgress}/></div>
  <TechnologyOrbit key={selected||"overview"} item={target} visible={Boolean(selected)&&arrived&&!traveling}/>
  <HyperspaceOverlay active={traveling&&!reduced} intensity={progress}/>
  <div className="side-index">EXPERIENCE / 001</div>
  <section className={'intro '+(selected?'hidden':'')}><div className="eyebrow"><span/> EXPLORE WHAT WE ENGINEER</div><h1>Ideas engineered.<br/><em>Possibilities explored.</em></h1><p>Navigate the Hi.Ch universe. Choose a destination and travel through our world of software engineering.</p><button className="primary" onClick={()=>go('ai')}>Explore AI Agents <span>↗</span></button><div className="proof"><strong>50+<small>Products delivered</small></strong><strong>30+<small>Clients served</small></strong></div></section>
  {selected&&<section className={'detail '+(arrived?'show':'')}><div className="eyebrow"><span/> DESTINATION / {String(DESTINATIONS.findIndex(d=>d.id===selected)+1).padStart(2,'0')}</div><div className="detail-type">{target.type}</div><h2>{target.name}<b>.</b></h2><p>{target.desc}</p><div className="tech-summary">TECHNOLOGY CONSTELLATION <span>ILLUSTRATIVE STACK</span></div><button className="primary" onClick={()=>go(DESTINATIONS[(DESTINATIONS.findIndex(d=>d.id===selected)+1)%DESTINATIONS.length].id)}>Next destination <span>↗</span></button><button className="quiet" onClick={()=>go(null)}>← Back to overview</button></section>}
  <aside className="destinations"><div className="dest-heading">DESTINATIONS <span>0{DESTINATIONS.length}</span></div>{DESTINATIONS.map((d,i)=><button key={d.id} className={'dest '+(selected===d.id?'active':'')} onClick={()=>go(d.id)} disabled={traveling}><span className="dest-number">0{i+1}</span><span>{d.name}</span><span className="dest-arrow">↗</span></button>)}</aside>
  <div className="status"><span className={'status-dot '+(traveling?'moving':'')}/>{traveling?'LIGHT-SPEED TRANSIT':selected?'DESTINATION REACHED':'SELECT A DESTINATION'}{traveling&&<div className="travel-progress"><div style={{width:`${Math.round(progress*100)}%`}}/></div>}</div>
  <footer className="foot">Hi.Ch / ENGINEERING WHAT'S NEXT <span>INTERACTIVE TECHNOLOGY UNIVERSE</span></footer>
 </main>;
}
export default App;
