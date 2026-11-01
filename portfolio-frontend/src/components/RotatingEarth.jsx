import { useEffect, useRef } from 'react';

const DAY_TEXTURE = '/assets/earth-day.png';
const CLOUD_TEXTURE = '/assets/earth-clouds.jpg';

export default function RotatingEarth({ onReady, onUnavailable }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!host || motion.matches) return undefined;

    let renderer;
    let frame = 0;
    let disposed = false;
    let ready = false;
    let lastFrame = 0;
    let lastTick = performance.now();
    let earth;
    let clouds;
    let scene;
    let camera;
    let atmosphere;
    let THREE;
    const owned = [];

    const resize = () => {
      if (!renderer || !camera) return;
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      const compact = width < 700;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1 : 1.5));
      renderer.setSize(width, height, false);
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();

      // Match the immense curved horizon in the original 1916 x 821 observatory plate.
      const coverScale = Math.max(width / 1916, height / 821);
      const imageLeft = (width - 1916 * coverScale) / 2;
      const imageTop = (height - 821 * coverScale) / 2;
      const radius = 1940 * coverScale;
      const centerX = imageLeft + 1900 * coverScale;
      const centerY = imageTop + 2200 * coverScale;
      for (const mesh of [earth, clouds, atmosphere]) {
        mesh.position.set(centerX - width / 2, height / 2 - centerY, 0);
        mesh.scale.setScalar(radius * (mesh === atmosphere ? 1.014 : mesh === clouds ? 1.006 : 1));
      }
    };

    const animate = now => {
      if (disposed || !renderer) return;
      frame = requestAnimationFrame(animate);
      if (document.hidden || now - lastFrame < (window.innerWidth < 700 ? 40 : 30)) return;
      const elapsed = Math.min((now - lastTick) / 1000, 0.1);
      lastTick = now;
      lastFrame = now;
      if (!motion.matches) {
        earth.rotation.y += elapsed * (Math.PI * 2 / 300);
        clouds.rotation.y += elapsed * (Math.PI * 2 / 275);
      }
      renderer.render(scene, camera);
      if (!ready) {
        ready = true;
        onReady?.();
      }
    };

    const onVisibility = () => { lastTick = performance.now(); };
    const onContextLost = event => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      onUnavailable?.();
    };

    (async () => {
      try {
        THREE = await import('three');
        if (disposed) return;
        const loader = new THREE.TextureLoader();
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.95;
        renderer.domElement.setAttribute('aria-hidden', 'true');
        renderer.domElement.addEventListener('webglcontextlost', onContextLost);
        host.appendChild(renderer.domElement);
        const [dayMap, cloudMap] = await Promise.all([loader.loadAsync(DAY_TEXTURE), loader.loadAsync(CLOUD_TEXTURE)]);
        if (disposed) { dayMap.dispose(); cloudMap.dispose(); return; }
        dayMap.colorSpace = THREE.SRGBColorSpace;
        cloudMap.colorSpace = THREE.SRGBColorSpace;
        dayMap.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
        owned.push(dayMap, cloudMap);

        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 12000);
        camera.position.z = 5000;
        const geometry = new THREE.SphereGeometry(1, 64, 48);
        const cloudGeometry = new THREE.SphereGeometry(1, 64, 48);
        const atmosphereGeometry = new THREE.SphereGeometry(1, 64, 48);
        const surfaceMaterial = new THREE.MeshPhongMaterial({ map: dayMap, color: new THREE.Color('#93abc1'), shininess: 10, specular: new THREE.Color('#183f64') });
        const cloudMaterial = new THREE.MeshPhongMaterial({ map: cloudMap, transparent: true, opacity: 0.19, blending: THREE.AdditiveBlending, depthWrite: false });
        const atmosphereMaterial = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.FrontSide,
          vertexShader: 'varying vec3 vNormal; varying vec3 vView; void main(){ vec4 viewPos=modelViewMatrix*vec4(position,1.0); vNormal=normalize(normalMatrix*normal); vView=normalize(-viewPos.xyz); gl_Position=projectionMatrix*viewPos; }',
          fragmentShader: 'varying vec3 vNormal; varying vec3 vView; void main(){ float rim=pow(1.0-max(dot(normalize(vNormal),normalize(vView)),0.0),5.0); gl_FragColor=vec4(0.22,0.49,0.82,rim*0.23); }'
        });
        owned.push(geometry, cloudGeometry, atmosphereGeometry, surfaceMaterial, cloudMaterial, atmosphereMaterial);
        earth = new THREE.Mesh(geometry, surfaceMaterial);
        clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
        atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        earth.rotation.set(0.12, 2.3, -0.07);
        clouds.rotation.copy(earth.rotation);
        scene.add(earth, clouds, atmosphere);
        scene.add(new THREE.AmbientLight(0xa8c8ee, 0.38));
        const sunlight = new THREE.DirectionalLight(0xfff2db, 1.5);
        sunlight.position.set(-1500, 1900, 3400);
        scene.add(sunlight);
        resize();
        window.addEventListener('resize', resize);
        document.addEventListener('visibilitychange', onVisibility);
        frame = requestAnimationFrame(animate);
      } catch {
        if (!disposed) onUnavailable?.();
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      renderer?.domElement.removeEventListener('webglcontextlost', onContextLost);
      owned.forEach(resource => resource.dispose());
      renderer?.dispose();
      renderer?.domElement.remove();
    };
  }, [onReady, onUnavailable]);

  return <div className="rotating-earth" ref={hostRef} aria-hidden="true" />;
}
