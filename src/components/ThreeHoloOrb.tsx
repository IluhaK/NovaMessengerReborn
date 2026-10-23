import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export const ThreeHoloOrb: React.FC<{ size?: number; interactive?: boolean }> = ({
  size = 220,
  interactive = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 4.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Studio PBR Lighting
    const keyLight = new THREE.DirectionalLight(0x60a5fa, 3.5);
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xf43f5e, 2.0);
    fillLight.position.set(-3, -2, -2);
    scene.add(fillLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 1.5);
    scene.add(hemiLight);

    // Procedural canvas texture for subtle circuit grid
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = "#3b82f6";
      for (let i = 0; i < 128; i += 16) {
        ctx.fillRect(i, 0, 2, 128);
        ctx.fillRect(0, i, 128, 2);
      }
    }
    const gridTexture = new THREE.CanvasTexture(canvas);
    gridTexture.wrapS = THREE.RepeatWrapping;
    gridTexture.wrapT = THREE.RepeatWrapping;
    gridTexture.repeat.set(4, 4);

    // Composite 3-12 Part Model: Futuristic Nova Hologram Group
    const modelGroup = new THREE.Group();

    // 1. Central Core Icosahedron (translucent glowing crystal)
    const coreGeo = new THREE.IcosahedronGeometry(0.85, 2);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x3b82f6,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.35,
      metalness: 0.1,
      roughness: 0.15,
      transmission: 0.6,
      thickness: 1.2,
      map: gridTexture,
      wireframe: false,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    modelGroup.add(coreMesh);

    // 2. Inner Wireframe Geo
    const wireGeo = new THREE.IcosahedronGeometry(0.88, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    modelGroup.add(wireMesh);

    // 3. Equatorial Gyro Ring (Primary Ring)
    const ring1Geo = new THREE.TorusGeometry(1.25, 0.035, 16, 100);
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0x2563eb,
      emissiveIntensity: 0.4,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 3;
    modelGroup.add(ring1);

    // 4. Polar Gyro Ring (Secondary Ring)
    const ring2Geo = new THREE.TorusGeometry(1.4, 0.025, 16, 100);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0xdb2777,
      emissiveIntensity: 0.3,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.x = Math.PI / 6;
    modelGroup.add(ring2);

    // 5. Outer Beveled Track Ring (Accent Ring)
    const ring3Geo = new THREE.TorusGeometry(1.55, 0.015, 12, 100);
    const ring3Mat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      metalness: 0.8,
      roughness: 0.25,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.25,
    });
    const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
    ring3.rotation.z = Math.PI / 5;
    modelGroup.add(ring3);

    // 6-8. Orbiting Satellite Communication Nodes
    const satelliteCount = 3;
    const satellites: THREE.Mesh[] = [];
    const satGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const satMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
    });

    for (let i = 0; i < satelliteCount; i++) {
      const sat = new THREE.Mesh(satGeo, satMat);
      satellites.push(sat);
      modelGroup.add(sat);
    }

    scene.add(modelGroup);

    // Interaction & Animation
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onPointerMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetX = x * 0.8;
      targetY = y * 0.8;
    };

    window.addEventListener("pointermove", onPointerMove);

    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Exponential damping
      const k = 4.0;
      mouseX += (targetX - mouseX) * (1 - Math.exp(-k * dt));
      mouseY += (targetY - mouseY) * (1 - Math.exp(-k * dt));

      modelGroup.rotation.y += 0.45 * dt;
      modelGroup.rotation.x = mouseY * 0.5 + Math.sin(now * 0.001) * 0.1;
      modelGroup.rotation.z = mouseX * 0.4;

      ring1.rotation.z += 0.8 * dt;
      ring2.rotation.x -= 0.6 * dt;
      ring3.rotation.y += 1.0 * dt;

      // Orbit satellites around rings
      satellites.forEach((sat, index) => {
        const angle = now * 0.0015 * (index + 1) + (index * Math.PI * 2) / satelliteCount;
        const radius = 1.35 + index * 0.1;
        sat.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle * 0.8) * 0.4,
          Math.sin(angle) * radius
        );
      });

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("pointermove", onPointerMove);
      renderer.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      ring3Geo.dispose();
      ring3Mat.dispose();
      satGeo.dispose();
      satMat.dispose();
      gridTexture.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [size, interactive]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center cursor-grab active:cursor-grabbing"
      style={{ width: size, height: size }}
    />
  );
};
