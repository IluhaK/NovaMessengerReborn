import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { X, Trophy, Sparkles, Volume2, VolumeX, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";

interface SpoonParkourProps {
  onClose: () => void;
}

export default function SpoonParkourGame({ onClose }: SpoonParkourProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem("spoon_parkour_high_score") || "0", 10);
  });
  const [distance, setDistance] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Audio Context for procedural sound effects
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSfx = (type: "jump" | "collect" | "bonus" | "gameover") => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "jump") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(580, now + 0.18);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === "collect") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(980, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === "bonus") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.08);
        osc.frequency.setValueAtTime(784, now + 0.16);
        osc.frequency.setValueAtTime(1046, now + 0.24);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === "gameover") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.4);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      }
    } catch (e) {
      // Audio autoplay policy catch
    }
  };

  // Keyboard input state
  const keysRef = useRef({
    left: false,
    right: false,
    jump: false,
  });

  const triggerJump = () => {
    keysRef.current.jump = true;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        keysRef.current.left = true;
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        keysRef.current.right = true;
      }
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        keysRef.current.jump = true;
      }
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        keysRef.current.left = false;
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        keysRef.current.right = false;
      }
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        keysRef.current.jump = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [onClose]);

  // Main Three.js Scene Setup & Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement("canvas").getContext("webgl2");
      if (!gl) return true;
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x181210);
    scene.fog = new THREE.FogExp2(0x181210, 0.018);

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    );
    camera.position.set(0, 5, 8);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: "high-performance",
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Reflection Environment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Studio Lighting
    const keyLight = new THREE.DirectionalLight(0xffeedd, 2.2);
    keyLight.position.set(12, 20, 10);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x332211, 0.9);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x77aaff, 1.2);
    rimLight.position.set(-10, 10, -15);
    scene.add(rimLight);

    // ==========================================
    // Procedural 3D Hero Spoon Character
    // ==========================================
    const spoonGroup = new THREE.Group();

    // Spoon Metal PBR Material
    const chromeMat = new THREE.MeshPhysicalMaterial({
      color: 0xeeeeee,
      metalness: 0.96,
      roughness: 0.12,
      clearcoat: 0.85,
      clearcoatRoughness: 0.1,
      reflectivity: 1.0,
    });

    // 1. Spoon Bowl (Primary silhouette)
    const bowlGeo = new THREE.SphereGeometry(0.7, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.45);
    bowlGeo.scale(1.0, 0.4, 1.4);
    bowlGeo.rotateX(Math.PI);
    const bowlMesh = new THREE.Mesh(bowlGeo, chromeMat);
    bowlMesh.castShadow = !isSoftwareGl;
    bowlMesh.position.set(0, 0.2, 0.7);
    spoonGroup.add(bowlMesh);

    // 2. Spoon Neck (Secondary transition)
    const neckGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.8, 16);
    neckGeo.rotateX(Math.PI / 2.3);
    const neckMesh = new THREE.Mesh(neckGeo, chromeMat);
    neckMesh.position.set(0, 0.25, -0.2);
    neckMesh.castShadow = !isSoftwareGl;
    spoonGroup.add(neckMesh);

    // 3. Spoon Handle (Grip with bevel)
    const handleGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.8, 16);
    handleGeo.rotateX(Math.PI / 2.1);
    handleGeo.scale(1.2, 1, 0.4);
    const handleMesh = new THREE.Mesh(handleGeo, chromeMat);
    handleMesh.position.set(0, 0.35, -1.3);
    handleMesh.castShadow = !isSoftwareGl;
    spoonGroup.add(handleMesh);

    // Subtle decorative ring on handle
    const ringGeo = new THREE.TorusGeometry(0.16, 0.03, 16, 24);
    ringGeo.rotateX(Math.PI / 2.1);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.2,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(0, 0.4, -1.9);
    spoonGroup.add(ringMesh);

    // Contact shadow beneath spoon
    const shadowGeo = new THREE.PlaneGeometry(1.6, 2.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.02;
    scene.add(contactShadow);

    scene.add(spoonGroup);

    // ==========================================
    // Procedural Kitchen Table Texture & Floor
    // ==========================================
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#3e2723";
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = "#4e342e";
      for (let i = 0; i < 512; i += 32) {
        ctx.fillRect(0, i, 512, 16);
      }
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      for (let j = 0; j < 512; j += 64) {
        ctx.fillRect(j, 0, 32, 512);
      }
    }
    const woodTexture = new THREE.CanvasTexture(canvas);
    woodTexture.wrapS = THREE.RepeatWrapping;
    woodTexture.wrapT = THREE.RepeatWrapping;
    woodTexture.repeat.set(12, 100);
    woodTexture.colorSpace = THREE.SRGBColorSpace;

    const tableGeo = new THREE.PlaneGeometry(18, 400);
    const tableMat = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.5,
      metalness: 0.1,
    });
    const tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.rotation.x = -Math.PI / 2;
    tableMesh.receiveShadow = !isSoftwareGl;
    scene.add(tableMesh);

    // ==========================================
    // Kitchen Props: Plates, Mugs, Donuts, Sugar
    // ==========================================
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0xfdfdfd,
      roughness: 0.25,
      metalness: 0.1,
    });
    const plateRimMat = new THREE.MeshStandardMaterial({
      color: 0xe6a117,
      roughness: 0.3,
      metalness: 0.8,
    });
    const mugMat = new THREE.MeshStandardMaterial({
      color: 0x1976d2,
      roughness: 0.3,
      metalness: 0.1,
    });
    const donutDoughMat = new THREE.MeshStandardMaterial({
      color: 0xd7995b,
      roughness: 0.7,
      metalness: 0.05,
    });
    const donutGlazeMat = new THREE.MeshStandardMaterial({
      color: 0xf06292,
      roughness: 0.2,
      metalness: 0.1,
    });
    const sugarMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.1,
      transmission: isSoftwareGl ? 0 : 0.8,
      transparent: true,
      opacity: isSoftwareGl ? 0.7 : 0.95,
      ior: 1.5,
    });

    interface PropItem {
      group: THREE.Group;
      type: "plate" | "mug" | "donut" | "sugar";
      x: number;
      z: number;
      radius: number;
      height: number;
      collected?: boolean;
    }

    const propsList: PropItem[] = [];

    // Helper to build a plate
    function createPlate(x: number, z: number): PropItem {
      const g = new THREE.Group();
      // Plate base
      const baseGeo = new THREE.CylinderGeometry(1.6, 1.4, 0.3, 32);
      const base = new THREE.Mesh(baseGeo, plateMat);
      base.castShadow = !isSoftwareGl;
      base.receiveShadow = !isSoftwareGl;
      base.position.y = 0.15;
      g.add(base);

      // Plate rim
      const rimGeo = new THREE.TorusGeometry(1.5, 0.08, 16, 32);
      rimGeo.rotateX(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, plateRimMat);
      rim.position.y = 0.3;
      g.add(rim);

      g.position.set(x, 0, z);
      scene.add(g);
      return { group: g, type: "plate", x, z, radius: 1.6, height: 0.3 };
    }

    // Helper to build a mug
    function createMug(x: number, z: number): PropItem {
      const g = new THREE.Group();
      // Mug body
      const bodyGeo = new THREE.CylinderGeometry(0.9, 0.9, 1.4, 24);
      const body = new THREE.Mesh(bodyGeo, mugMat);
      body.castShadow = !isSoftwareGl;
      body.position.y = 0.7;
      g.add(body);

      // Coffee surface
      const coffeeGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.1, 24);
      const coffeeMat = new THREE.MeshBasicMaterial({ color: 0x3e2010 });
      const coffee = new THREE.Mesh(coffeeGeo, coffeeMat);
      coffee.position.y = 1.35;
      g.add(coffee);

      // Mug handle
      const handleGeo = new THREE.TorusGeometry(0.45, 0.1, 12, 16, Math.PI);
      handleGeo.rotateZ(-Math.PI / 2);
      const handle = new THREE.Mesh(handleGeo, mugMat);
      handle.position.set(1.0, 0.7, 0);
      g.add(handle);

      g.position.set(x, 0, z);
      scene.add(g);
      return { group: g, type: "mug", x, z, radius: 1.1, height: 1.4 };
    }

    // Helper to build a giant donut
    function createDonut(x: number, z: number): PropItem {
      const g = new THREE.Group();
      // Dough
      const doughGeo = new THREE.TorusGeometry(1.2, 0.55, 16, 32);
      doughGeo.rotateX(Math.PI / 2);
      const dough = new THREE.Mesh(doughGeo, donutDoughMat);
      dough.castShadow = !isSoftwareGl;
      dough.position.y = 0.55;
      g.add(dough);

      // Pink glaze
      const glazeGeo = new THREE.TorusGeometry(1.2, 0.45, 16, 32, Math.PI);
      glazeGeo.rotateX(Math.PI / 2);
      const glaze = new THREE.Mesh(glazeGeo, donutGlazeMat);
      glaze.position.y = 0.68;
      g.add(glaze);

      g.position.set(x, 0, z);
      scene.add(g);
      return { group: g, type: "donut", x, z, radius: 1.7, height: 1.1 };
    }

    // Helper to build sugar cube collectible
    function createSugar(x: number, z: number): PropItem {
      const g = new THREE.Group();
      const sugarGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const sugarMesh = new THREE.Mesh(sugarGeo, sugarMat);
      sugarMesh.castShadow = !isSoftwareGl;
      sugarMesh.position.y = 0.7;
      g.add(sugarMesh);

      g.position.set(x, 0, z);
      scene.add(g);
      return { group: g, type: "sugar", x, z, radius: 0.6, height: 0.7 };
    }

    // Populate initial obstacles ahead
    for (let z = -15; z > -350; z -= 14) {
      const lane = (Math.random() - 0.5) * 8;
      const typeRoll = Math.random();
      if (typeRoll < 0.35) {
        propsList.push(createPlate(lane, z));
      } else if (typeRoll < 0.65) {
        propsList.push(createDonut(lane, z));
      } else if (typeRoll < 0.85) {
        propsList.push(createMug(lane, z));
      } else {
        propsList.push(createSugar(lane, z));
      }

      // Add guaranteed sugar cubes alongside
      if (Math.random() > 0.4) {
        propsList.push(createSugar(-lane * 0.7, z - 6));
      }
    }

    // ==========================================
    // Physics & Game Loop State
    // ==========================================
    let playerX = 0;
    let playerY = 0;
    let playerZ = 0;
    let velocityY = 0;
    let isGrounded = true;
    let speedZ = 0.28;
    let totalScore = 0;
    let traveledDist = 0;
    let isAlive = true;

    const gravity = 0.018;
    const jumpStrength = 0.38;

    let frameId = 0;

    const clock = new THREE.Clock();

    function animate() {
      if (!isAlive) return;

      const delta = Math.min(clock.getDelta(), 0.1);

      // Forward movement
      playerZ -= speedZ;
      traveledDist += speedZ;
      setDistance(Math.floor(traveledDist));

      // Gradual acceleration
      speedZ = Math.min(0.55, speedZ + 0.00005);

      // Left / Right movement
      if (keysRef.current.left) {
        playerX = Math.max(-7.5, playerX - 0.16);
      }
      if (keysRef.current.right) {
        playerX = Math.min(7.5, playerX + 0.16);
      }

      // Jump Trigger
      if (keysRef.current.jump && isGrounded) {
        velocityY = jumpStrength;
        isGrounded = false;
        keysRef.current.jump = false;
        playSfx("jump");
      }

      // Apply Gravity
      playerY += velocityY;
      velocityY -= gravity;

      // Check Table Ground
      let currentFloor = 0;

      // Platform check
      propsList.forEach((prop) => {
        const dx = playerX - prop.x;
        const dz = playerZ - prop.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Collectibles check (Sugar)
        if (prop.type === "sugar" && !prop.collected && dist < prop.radius + 0.5) {
          prop.collected = true;
          prop.group.visible = false;
          totalScore += 20;
          setScore(totalScore);
          playSfx("collect");
        }

        // Stepping on plates/donuts
        if (dist < prop.radius) {
          if (prop.type === "plate" || prop.type === "donut") {
            if (playerY >= prop.height - 0.2 && velocityY <= 0) {
              currentFloor = Math.max(currentFloor, prop.height);
            }
          }
        }
      });

      // Grounding logic
      if (playerY <= currentFloor) {
        playerY = currentFloor;
        velocityY = 0;
        isGrounded = true;
      } else {
        isGrounded = false;
      }

      // Check fall off edges (sides of table)
      if (Math.abs(playerX) > 8.5) {
        // Falling off table into abyss
        currentFloor = -100;
      }

      if (playerY < -5) {
        // Game Over
        isAlive = false;
        setGameOver(true);
        playSfx("gameover");
        if (totalScore > highScore) {
          setHighScore(totalScore);
          localStorage.setItem("spoon_parkour_high_score", totalScore.toString());
        }
        return;
      }

      // Rotate sugar cubes
      propsList.forEach((p) => {
        if (p.type === "sugar") {
          p.group.rotation.y += 0.04;
        }
      });

      // Update Spoon Position & Tilting Dynamics
      spoonGroup.position.set(playerX, playerY, playerZ);
      spoonGroup.rotation.z = keysRef.current.left
        ? 0.2
        : keysRef.current.right
          ? -0.2
          : 0;
      spoonGroup.rotation.x = isGrounded ? Math.sin(traveledDist * 1.5) * 0.08 : -0.2;

      // Contact shadow follows
      contactShadow.position.set(playerX, 0.02, playerZ);
      contactShadow.scale.setScalar(Math.max(0.3, 1 - playerY * 0.15));

      // Camera smoothly follows spoon from behind & slightly above
      camera.position.x = THREE.MathUtils.damp(camera.position.x, playerX * 0.5, 4, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, playerY + 3.8, 4, delta);
      camera.position.z = playerZ + 7.5;
      camera.lookAt(playerX * 0.3, playerY + 1.2, playerZ - 5);

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }

    frameId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      woodTexture.dispose();
      bowlGeo.dispose();
      neckGeo.dispose();
      handleGeo.dispose();
      chromeMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [highScore]);

  const restartGame = () => {
    setGameOver(false);
    setScore(0);
    setDistance(0);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/95 flex flex-col select-none overflow-hidden font-sans">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top HUD */}
      <div className="relative z-10 p-4 md:p-6 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-2xl">
            <span className="text-xl">🥄</span>
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-amber-400">
                Ложка-Паркур
              </p>
              <p className="text-xs font-semibold text-white/80">Кухонный стол</p>
            </div>
          </div>

          <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-2xl">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-black tabular-nums text-white">
                {score} очков
              </span>
            </div>
            <span className="text-white/20">|</span>
            <span className="text-xs font-bold tabular-nums text-sky-400">
              {distance} м
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="hidden md:flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-2 rounded-2xl text-xs font-bold text-amber-300">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Рекорд: {highScore}</span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 bg-black/60 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl text-white transition-all"
            title={soundEnabled ? "Выключить звук" : "Включить звук"}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-green-400" /> : <VolumeX className="w-5 h-5 text-red-400" />}
          </button>

          <button
            onClick={onClose}
            className="p-3 bg-rose-600/80 hover:bg-rose-500 backdrop-blur-md border border-rose-500/40 rounded-2xl text-white transition-all shadow-xl shadow-rose-600/30 flex items-center gap-2 font-bold text-xs"
            title="Закрыть игру (ESC)"
          >
            <X className="w-5 h-5" />
            <span className="hidden sm:inline">Закрыть</span>
          </button>
        </div>
      </div>

      {/* Game Over Modal */}
      {gameOver && (
        <div className="absolute inset-0 z-20 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900/90 border border-amber-500/30 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl relative">
            <div className="text-5xl mb-3">🥣💥</div>
            <h2 className="text-2xl font-black text-white tracking-tight mb-1">
              Ложка упала со стола!
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Вы собрали <span className="text-amber-400 font-bold">{score}</span> очков и пробежали{" "}
              <span className="text-sky-400 font-bold">{distance}</span> метров.
            </p>

            <div className="space-y-3">
              <button
                onClick={restartGame}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 text-white font-bold rounded-2xl text-sm shadow-xl shadow-orange-500/25 transition-all active:scale-98"
              >
                Прыгать снова
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-2xl text-xs transition-all"
              >
                Вернуться в настройки
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Touch / Mobile Controls & Instruction HUD */}
      <div className="relative z-10 mt-auto p-4 md:p-6 flex flex-col items-center gap-3 pointer-events-none">
        {/* Helper keys badge */}
        <div className="bg-black/50 backdrop-blur-sm border border-white/5 px-4 py-1.5 rounded-full text-[11px] font-medium text-white/70">
          Управление: <span className="text-amber-400 font-bold">A / D</span> (или стрелки) — влево/вправо ·{" "}
          <span className="text-sky-400 font-bold">Пробел</span> — прыжок
        </div>

        {/* On-screen buttons for touch / mobile */}
        <div className="flex items-center justify-center gap-4 pointer-events-auto">
          <button
            onPointerDown={() => { keysRef.current.left = true; }}
            onPointerUp={() => { keysRef.current.left = false; }}
            onPointerLeave={() => { keysRef.current.left = false; }}
            className="w-16 h-16 rounded-2xl bg-black/60 active:bg-blue-600/60 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-all shadow-xl"
          >
            <ArrowLeft className="w-7 h-7" />
          </button>

          <button
            onClick={triggerJump}
            className="w-24 h-16 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 active:scale-95 text-white font-black text-sm uppercase tracking-wider flex flex-col items-center justify-center shadow-xl shadow-blue-600/30 border border-white/20 transition-all"
          >
            <ArrowUp className="w-5 h-5 mb-0.5" />
            <span>Прыжок</span>
          </button>

          <button
            onPointerDown={() => { keysRef.current.right = true; }}
            onPointerUp={() => { keysRef.current.right = false; }}
            onPointerLeave={() => { keysRef.current.right = false; }}
            className="w-16 h-16 rounded-2xl bg-black/60 active:bg-blue-600/60 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-all shadow-xl"
          >
            <ArrowRight className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  );
}
