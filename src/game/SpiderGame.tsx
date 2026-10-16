/**
 * SpiderGame: Main 3D WebGL game loop, dynamic 3rd-person camera,
 * input bindings (LMB melee combo, F web pellets, RMB web cocoon),
 * anatomical Spidey rig, and luxury compact obsidian HUD.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { SpidermanCharacter, SuitType } from './SpidermanModel';
import { CityGenerator } from './CityGenerator';
import { SpiderPhysics } from './SpiderPhysics';
import { EnemiesManager } from './EnemiesManager';
import { soundEngine } from './SoundEngine';
import { GameMenu, TimeOfDay } from './GameMenu';
import { Language, translations } from './localization';
import {
  ShieldAlert,
  Zap,
  Volume2,
  VolumeX,
  Eye,
  RotateCcw,
  Compass,
  Crosshair,
  Sparkles,
  Sliders,
  Menu,
} from 'lucide-react';

export const SpiderGame: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Internationalization & Customization states
  const [currentLang, setCurrentLang] = useState<Language>(() => {
    return (localStorage.getItem('spidey_lang') as Language) || 'ru';
  });
  const [currentSuit, setCurrentSuit] = useState<SuitType>('classic');
  const [currentTimeOfDay, setCurrentTimeOfDay] = useState<TimeOfDay>('sunset');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Camera Settings states with localStorage persistence
  const [invertX, setInvertX] = useState<boolean>(() => {
    return localStorage.getItem('spidey_invert_x') === 'true';
  });
  const [invertY, setInvertY] = useState<boolean>(() => {
    return localStorage.getItem('spidey_invert_y') === 'true';
  });
  const [cameraSensitivity, setCameraSensitivity] = useState<number>(() => {
    const val = localStorage.getItem('spidey_cam_sens');
    return val ? parseFloat(val) : 1.0;
  });
  const [cameraSmoothing, setCameraSmoothing] = useState<boolean>(() => {
    const val = localStorage.getItem('spidey_cam_smooth');
    return val !== 'false';
  });

  // HUD States
  const [health, setHealth] = useState(100);
  const [webFluid, setWebFluid] = useState(6);
  const [combo, setCombo] = useState(0);
  const [comboRating, setComboRating] = useState('');
  const [speedKmh, setSpeedKmh] = useState(0);
  const [altitudeM, setAltitudeM] = useState(0);
  const [spiderSenseActive, setSpiderSenseActive] = useState(false);
  const [, setIsSwinging] = useState(false);
  const [, setIsWallRunning] = useState(false);
  const [banditsRemaining, setBanditsRemaining] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showControlsDock, setShowControlsDock] = useState(true);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [cameraMode, setCameraMode] = useState<'dynamic' | 'cinematic'>('dynamic');
  const [missionComplete, setMissionComplete] = useState(false);

  // References for render loop & 3D scene elements
  const spidermanRef = useRef<SpidermanCharacter | null>(null);
  const physicsRef = useRef<SpiderPhysics | null>(null);
  const cityRef = useRef<CityGenerator | null>(null);
  const enemiesRef = useRef<EnemiesManager | null>(null);
  const webMeshRef = useRef<THREE.Mesh | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const dustParticlesRef = useRef<THREE.Points | null>(null);

  // Input state
  const inputRef = useRef({
    forward: 0,
    strafe: 0,
    jump: false,
    sprint: false,
    webSwing: false,
  });

  // Camera angles & target angles for silky-smooth damping
  const camAngleRef = useRef({
    yaw: 0,
    pitch: 0.22,
    distance: 6.5,
  });

  const targetCamAngleRef = useRef({
    yaw: 0,
    pitch: 0.22,
  });

  // Hot reference for event listeners to avoid re-binding
  const cameraConfigRef = useRef({
    invertX,
    invertY,
    sensitivity: cameraSensitivity,
    smoothing: cameraSmoothing,
  });

  useEffect(() => {
    cameraConfigRef.current = {
      invertX,
      invertY,
      sensitivity: cameraSensitivity,
      smoothing: cameraSmoothing,
    };
  }, [invertX, invertY, cameraSensitivity, cameraSmoothing]);

  const toggleInvertX = () => {
    setInvertX((prev) => {
      const next = !prev;
      localStorage.setItem('spidey_invert_x', String(next));
      return next;
    });
  };

  const toggleInvertY = () => {
    setInvertY((prev) => {
      const next = !prev;
      localStorage.setItem('spidey_invert_y', String(next));
      return next;
    });
  };

  const handleSensitivityChange = (val: number) => {
    setCameraSensitivity(val);
    localStorage.setItem('spidey_cam_sens', String(val));
  };

  const toggleCameraSmoothing = () => {
    setCameraSmoothing((prev) => {
      const next = !prev;
      localStorage.setItem('spidey_cam_smooth', String(next));
      return next;
    });
  };

  const mouseDragRef = useRef({
    isDragging: false,
    lastX: 0,
    lastY: 0,
  });

  const comboTimerRef = useRef<number | null>(null);
  const t = translations[currentLang];

  const handleSelectLang = (lang: Language) => {
    setCurrentLang(lang);
    localStorage.setItem('spidey_lang', lang);
  };

  const handleSelectSuit = (suit: SuitType) => {
    setCurrentSuit(suit);
    if (spidermanRef.current) {
      spidermanRef.current.setSuit(suit);
    }
  };

  const handleSelectTimeOfDay = (time: TimeOfDay) => {
    setCurrentTimeOfDay(time);
    const scene = sceneRef.current;
    const sun = sunLightRef.current;
    const rim = rimLightRef.current;
    const ambient = ambientLightRef.current;
    if (!scene || !sun || !rim || !ambient) return;

    if (time === 'sunset') {
      scene.background = new THREE.Color(0xfb923c);
      if (scene.fog) scene.fog.color.setHex(0xf97316);
      sun.color.setHex(0xffedd5);
      sun.intensity = 2.0;
      sun.position.set(150, 90, 70);
      rim.color.setHex(0xf43f5e);
      rim.intensity = 1.1;
      ambient.color.setHex(0xfeb272);
      ambient.intensity = 0.65;
    } else if (time === 'day') {
      scene.background = new THREE.Color(0x38bdf8);
      if (scene.fog) scene.fog.color.setHex(0x38bdf8);
      sun.color.setHex(0xffffff);
      sun.intensity = 1.6;
      sun.position.set(70, 220, 70);
      rim.color.setHex(0x7dd3fc);
      rim.intensity = 0.8;
      ambient.color.setHex(0xffedd5);
      ambient.intensity = 0.7;
    } else {
      scene.background = new THREE.Color(0x050814);
      if (scene.fog) scene.fog.color.setHex(0x090d16);
      sun.color.setHex(0x93c5fd);
      sun.intensity = 0.8;
      sun.position.set(-80, 160, -80);
      rim.color.setHex(0x06b6d4);
      rim.intensity = 1.3;
      ambient.color.setHex(0x1e1b4b);
      ambient.intensity = 0.45;
    }
  };

  const registerHit = useCallback((count: number, defeated: number) => {
    if (count > 0) {
      setCombo((prev) => {
        const next = prev + count;
        if (next >= 12) setComboRating('ULTIMATE SPIDER-MAN!');
        else if (next >= 8) setComboRating('SPECTACULAR!');
        else if (next >= 4) setComboRating('AMAZING!');
        else setComboRating('NICE HIT!');
        return next;
      });

      if (comboTimerRef.current) window.clearTimeout(comboTimerRef.current);
      comboTimerRef.current = window.setTimeout(() => {
        setCombo(0);
        setComboRating('');
      }, 4000);
    }

    if (defeated > 0) {
      setBanditsRemaining((prev) => {
        const updated = Math.max(0, prev - defeated);
        if (updated === 0) setMissionComplete(true);
        return updated;
      });
      setWebFluid(6);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setWebFluid((f) => Math.min(6, f + 1));
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- THREE.JS SCENE SETUP ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xfb923c);
    scene.fog = new THREE.FogExp2(0xf97316, 0.0035);

    const camera = new THREE.PerspectiveCamera(
      62,
      container.clientWidth / container.clientHeight,
      0.1,
      900
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xfeb272, 0.65);
    ambientLightRef.current = ambientLight;
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffedd5, 2.0);
    sunLight.position.set(150, 90, 70);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 500;
    const d = 130;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0004;
    sunLightRef.current = sunLight;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xf43f5e, 1.1);
    rimLight.position.set(-100, 80, -100);
    rimLightRef.current = rimLight;
    scene.add(rimLight);

    // Dust particles
    const particleCount = 200;
    const particleGeom = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 80;
      particlePositions[i + 1] = Math.random() * 60;
      particlePositions[i + 2] = (Math.random() - 0.5) * 80;
    }
    particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.35,
      transparent: true,
      opacity: 0.65,
    });
    const dustPoints = new THREE.Points(particleGeom, particleMat);
    scene.add(dustPoints);
    dustParticlesRef.current = dustPoints;

    // City
    const city = new CityGenerator();
    cityRef.current = city;
    scene.add(city.cityGroup);

    // Spider-Man Character & Physics
    const spawnBuilding = city.buildings[Math.floor(city.buildings.length / 2)];
    const startY = spawnBuilding ? spawnBuilding.roofY : 40;
    const startX = spawnBuilding ? spawnBuilding.center.x : 0;
    const startZ = spawnBuilding ? spawnBuilding.center.z : 0;

    const physics = new SpiderPhysics(new THREE.Vector3(startX, startY, startZ));
    physicsRef.current = physics;

    const spiderman = new SpidermanCharacter();
    spidermanRef.current = spiderman;
    spiderman.setSuit(currentSuit);
    spiderman.mesh.position.set(startX, startY, startZ);
    spiderman.mesh.rotation.y = Math.PI;
    scene.add(spiderman.mesh);

    // Enemies
    const enemies = new EnemiesManager();
    enemiesRef.current = enemies;
    scene.add(enemies.group);

    const sampleBuildings = city.buildings.slice(0, 10);
    sampleBuildings.forEach((b) => {
      enemies.spawnBandit(b.center.x + (Math.random() - 0.5) * 12, b.roofY, b.center.z + (Math.random() - 0.5) * 12);
      enemies.spawnBandit(b.center.x + (Math.random() - 0.5) * 12, b.roofY, b.center.z + (Math.random() - 0.5) * 12);
    });
    setBanditsRemaining(enemies.bandits.length);

    // 3D Web Strand Cylinder
    // 3D Web Strand Cylinders (Twin-web support for Point-Zip and swinging)
    const webGeom = new THREE.CylinderGeometry(0.04, 0.04, 1, 6);
    const webMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xe0f2fe,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.1,
    });
    const webMesh = new THREE.Mesh(webGeom, webMat);
    webMesh.visible = false;
    scene.add(webMesh);
    webMeshRef.current = webMesh;

    const webMesh2 = new THREE.Mesh(webGeom, webMat.clone());
    webMesh2.visible = false;
    scene.add(webMesh2);

    // 3D Web Target Reticle (Insomniac Spider-Man style target anchor visualization)
    const reticleGroup = new THREE.Group();
    const reticleRing = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.1, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    reticleGroup.add(reticleRing);
    const reticleDot = new THREE.Mesh(
      new THREE.CircleGeometry(0.35, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    reticleGroup.add(reticleDot);
    reticleGroup.visible = false;
    scene.add(reticleGroup);

    // --- KEYBOARD LISTENERS ---
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        inputRef.current = { forward: 0, strafe: 0, jump: false, sprint: false, webSwing: false };
        if (document.pointerLockElement) {
          document.exitPointerLock?.();
        }
        setIsMenuOpen((v) => !v);
        return;
      }
      if (e.code === 'Space') e.preventDefault();

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          inputRef.current.forward = 1;
          break;
        case 'KeyS':
        case 'ArrowDown':
          inputRef.current.forward = -1;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          inputRef.current.strafe = -1;
          break;
        case 'KeyD':
        case 'ArrowRight':
          inputRef.current.strafe = 1;
          break;
        case 'Space':
          inputRef.current.jump = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          inputRef.current.sprint = true;
          break;
        case 'KeyE': {
          inputRef.current.webSwing = true;
          if (physics.state !== 'SWINGING') {
            const lookDir = new THREE.Vector3(
              -Math.sin(camAngleRef.current.yaw),
              Math.tan(-camAngleRef.current.pitch + 0.1),
              -Math.cos(camAngleRef.current.yaw)
            ).normalize();
            const attached = physics.attachWeb(physics.position, lookDir, city);
            if (attached) {
              spiderman.triggerWebPellet();
            }
          }
          break;
        }
        case 'KeyF': {
          // ATTACK 2: RAPID WEB PELLETS
          if (webFluid > 0) {
            setWebFluid((f) => Math.max(0, f - 1));
            const aimAngle = Math.atan2(
              -Math.sin(camAngleRef.current.yaw),
              -Math.cos(camAngleRef.current.yaw)
            );
            physics.facingAngle = aimAngle;
            spiderman.mesh.rotation.y = aimAngle;
            spiderman.triggerWebPellet();
            const wristPos = new THREE.Vector3();
            spiderman.getRightWristPosition(wristPos);
            const shootDir = new THREE.Vector3(
              -Math.sin(camAngleRef.current.yaw),
              Math.tan(-camAngleRef.current.pitch),
              -Math.cos(camAngleRef.current.yaw)
            ).normalize();
            enemies.shootWebPellet(wristPos, shootDir);
          }
          break;
        }
        case 'KeyQ': {
          const zipDir = new THREE.Vector3(
            -Math.sin(camAngleRef.current.yaw),
            0.2,
            -Math.cos(camAngleRef.current.yaw)
          ).normalize();
          physics.velocity.addScaledVector(zipDir, 28);
          physics.state = 'AIR';
          soundEngine.playWebShoot();
          soundEngine.playJump();
          spiderman.triggerWebPellet();
          break;
        }
        case 'KeyC':
          setCameraMode((m) => (m === 'dynamic' ? 'cinematic' : 'dynamic'));
          break;
        case 'KeyM':
          setIsMuted((m) => {
            soundEngine.setMuted(!m);
            return !m;
          });
          break;
        case 'KeyH':
          setShowControlsDock((v) => !v);
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          if (inputRef.current.forward === 1) inputRef.current.forward = 0;
          break;
        case 'KeyS':
        case 'ArrowDown':
          if (inputRef.current.forward === -1) inputRef.current.forward = 0;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          if (inputRef.current.strafe === -1) inputRef.current.strafe = 0;
          break;
        case 'KeyD':
        case 'ArrowRight':
          if (inputRef.current.strafe === 1) inputRef.current.strafe = 0;
          break;
        case 'Space':
          inputRef.current.jump = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          inputRef.current.sprint = false;
          break;
        case 'KeyE':
          inputRef.current.webSwing = false;
          physics.releaseWeb(false);
          break;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const cfg = cameraConfigRef.current;
      // Standard third-person camera look:
      // Moving mouse RIGHT turns view to the right
      // Moving mouse LEFT turns view to the left
      // Moving mouse UP tilts view upwards
      // Moving mouse DOWN tilts view downwards
      const sens = 0.0028 * cfg.sensitivity;
      const multX = cfg.invertX ? 1 : -1;
      const multY = cfg.invertY ? -1 : 1;

      if (document.pointerLockElement === container) {
        targetCamAngleRef.current.yaw += e.movementX * sens * multX;
        targetCamAngleRef.current.pitch = Math.max(
          -0.72,
          Math.min(0.92, targetCamAngleRef.current.pitch + e.movementY * sens * multY)
        );
      } else if (mouseDragRef.current.isDragging) {
        const dx = e.clientX - mouseDragRef.current.lastX;
        const dy = e.clientY - mouseDragRef.current.lastY;
        mouseDragRef.current.lastX = e.clientX;
        mouseDragRef.current.lastY = e.clientY;
        targetCamAngleRef.current.yaw += dx * sens * 1.5 * multX;
        targetCamAngleRef.current.pitch = Math.max(
          -0.72,
          Math.min(0.92, targetCamAngleRef.current.pitch + dy * sens * 1.5 * multY)
        );
      }
    };

    // --- MOUSE CLICK: ATTACK 1 (LMB) & ATTACK 3 (RMB) ---
    const onMouseDown = (e: MouseEvent) => {
      if (isMenuOpen) return;
      if (e.button === 0) {
        // LEFT CLICK: MARTIAL ARTS 4-HIT COMBO
        if (document.pointerLockElement !== container) {
          container.requestPointerLock?.();
        }
        const aimAngle = Math.atan2(
          -Math.sin(camAngleRef.current.yaw),
          -Math.cos(camAngleRef.current.yaw)
        );
        physics.facingAngle = aimAngle;
        spiderman.mesh.rotation.y = aimAngle;

        // Kinetic martial arts step-in lunge forward
        const lunge = new THREE.Vector3(-Math.sin(aimAngle), 0, -Math.cos(aimAngle)).multiplyScalar(4.2);
        physics.velocity.add(lunge);

        spiderman.triggerMeleeCombo(combo);
        const { hitCount, defeatedCount } = enemies.performMeleeCombo(
          physics.position,
          physics.facingAngle,
          combo
        );
        registerHit(hitCount, defeatedCount);
      } else if (e.button === 2) {
        // RIGHT CLICK: WEB-ZIP TO BUILDING ROOF / PERCH (OR WEB COCOON BLAST FALLBACK)
        e.preventDefault();
        if (document.pointerLockElement !== container) {
          container.requestPointerLock?.();
        }

        const lookDir = new THREE.Vector3(
          -Math.sin(camAngleRef.current.yaw),
          Math.tan(-camAngleRef.current.pitch + 0.05),
          -Math.cos(camAngleRef.current.yaw)
        ).normalize();

        const zipTarget = city.findZipTarget(physics.position, lookDir, 220);
        if (zipTarget) {
          // Point-Zip directly to the building rooftop or wall!
          const aimAngle = Math.atan2(
            zipTarget.point.x - physics.position.x,
            zipTarget.point.z - physics.position.z
          );
          physics.facingAngle = aimAngle;
          spiderman.mesh.rotation.y = aimAngle;
          physics.startZipToTarget(zipTarget);
          spiderman.triggerWebPellet();

          // Kinetic impact: knock back and defeat bandits situated right at the landing zone
          const { hitCount, defeatedCount } = enemies.hitBanditAtPosition(zipTarget.point, 4.5, 60);
          registerHit(hitCount, defeatedCount);
        } else if (webFluid >= 2) {
          // Combat fallback: shoot wide web cocoon net if aiming away from buildings
          setWebFluid((f) => Math.max(0, f - 2));
          const aimAngle = Math.atan2(
            -Math.sin(camAngleRef.current.yaw),
            -Math.cos(camAngleRef.current.yaw)
          );
          physics.facingAngle = aimAngle;
          spiderman.mesh.rotation.y = aimAngle;
          spiderman.triggerWebCocoonBlast();
          const wristPos = new THREE.Vector3();
          spiderman.getRightWristPosition(wristPos);
          const blastDir = new THREE.Vector3(
            -Math.sin(camAngleRef.current.yaw),
            Math.tan(-camAngleRef.current.pitch),
            -Math.cos(camAngleRef.current.yaw)
          ).normalize();
          const { trappedCount } = enemies.shootWebCocoonNet(wristPos, blastDir);
          registerHit(trappedCount, 0);
        }
      }

      mouseDragRef.current.isDragging = true;
      mouseDragRef.current.lastX = e.clientX;
      mouseDragRef.current.lastY = e.clientY;
    };

    const onMouseUp = () => {
      mouseDragRef.current.isDragging = false;
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Prevent native right-click menu
    };

    const onPointerLockChange = () => {
      const isLocked = document.pointerLockElement === container;
      setIsPointerLocked(isLocked);
      if (!isLocked) {
        inputRef.current = { forward: 0, strafe: 0, jump: false, sprint: false, webSwing: false };
      }
    };

    const onBlur = () => {
      inputRef.current = { forward: 0, strafe: 0, jump: false, sprint: false, webSwing: false };
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    window.addEventListener('blur', onBlur);

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // --- GAME LOOP ---
    const clock = new THREE.Clock();
    let animFrameId: number;
    const wristTemp = new THREE.Vector3();
    const camTarget = new THREE.Vector3();
    const webMid = new THREE.Vector3();
    const webDir = new THREE.Vector3();
    const upAxis = new THREE.Vector3(0, 1, 0);

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const dt = clock.getDelta();

      if (!isMenuOpen) {
        physics.update(dt, inputRef.current, camAngleRef.current.yaw, city);
      }

      spiderman.mesh.position.copy(physics.position);

      // Smooth shortest-path angular rotation
      let diff = physics.facingAngle - spiderman.mesh.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      spiderman.mesh.rotation.y += diff * Math.min(1, dt * 18);

      // Dynamic body pitch (athletic lean into wall run or aerodynamic air flight)
      let targetPitch = 0;
      if (physics.state === 'WALL_RUN') {
        targetPitch = 0.35; // Athletic forward lean against the wall facade
      } else if (physics.state === 'WALL_STICK') {
        targetPitch = 0.15; // 4-point spider cling
      } else if (physics.state === 'AIR') {
        targetPitch = Math.max(-0.4, Math.min(0.4, -physics.velocity.y * 0.012));
      }
      spiderman.mesh.rotation.x = THREE.MathUtils.damp(
        spiderman.mesh.rotation.x,
        targetPitch,
        14,
        dt
      );

      const horizSpeed = Math.sqrt(
        physics.velocity.x * physics.velocity.x + physics.velocity.z * physics.velocity.z
      );
      const totalSpeed = physics.velocity.length();

      spiderman.update(
        dt,
        physics.state,
        horizSpeed,
        physics.isSprinting,
        physics.state === 'SWINGING',
        physics.state === 'WALL_RUN',
        physics.activeAnchorSide,
        physics.bankAngle,
        physics.superheroLandingTimer
      );

      // VOLUMETRIC WEB CYLINDERS (Twin webs during Point-Zip, single dynamic web during swinging)
      const wristLeft = new THREE.Vector3();
      const wristRight = new THREE.Vector3();

      if (physics.state === 'ZIP_TO_WALL' && physics.zipTarget && webMesh && webMesh2) {
        // TWIN-WEB POINT ZIP: Two parallel high-velocity webs stretch from wrists to target building
        webMesh.visible = true;
        webMesh2.visible = true;

        spiderman.getLeftWristPosition(wristLeft);
        spiderman.getRightWristPosition(wristRight);
        const targetPt = physics.zipTarget.point;

        // Left web
        webMid.copy(wristLeft).add(targetPt).multiplyScalar(0.5);
        webDir.copy(targetPt).sub(wristLeft);
        const distL = webDir.length();
        webMesh.position.copy(webMid);
        webMesh.scale.set(1, distL, 1);
        webMesh.quaternion.setFromUnitVectors(upAxis, webDir.normalize());

        // Right web
        webMid.copy(wristRight).add(targetPt).multiplyScalar(0.5);
        webDir.copy(targetPt).sub(wristRight);
        const distR = webDir.length();
        webMesh2.position.copy(webMid);
        webMesh2.scale.set(1, distR, 1);
        webMesh2.quaternion.setFromUnitVectors(upAxis, webDir.normalize());

        // Reticle locks onto building landing target in vibrant gold
        reticleGroup.visible = true;
        reticleGroup.position.copy(targetPt);
        reticleGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), physics.zipTarget.normal);
        reticleRing.scale.setScalar(1.25);
        (reticleRing.material as THREE.MeshBasicMaterial).color.setHex(0xf59e0b);
      } else if (physics.state === 'SWINGING' && physics.activeAnchor && webMesh) {
        // SINGLE DYNAMIC WEB LINE FOR PENDULUM SWINGING
        webMesh.visible = true;
        if (webMesh2) webMesh2.visible = false;

        if (physics.activeAnchorSide === 'left') {
          spiderman.getLeftWristPosition(wristTemp);
        } else {
          spiderman.getRightWristPosition(wristTemp);
        }
        const anchor = physics.activeAnchor.point;
        webMid.copy(wristTemp).add(anchor).multiplyScalar(0.5);
        webDir.copy(anchor).sub(wristTemp);
        const dist = webDir.length();
        webMesh.position.copy(webMid);
        webMesh.scale.set(1, dist, 1);
        webMesh.quaternion.setFromUnitVectors(upAxis, webDir.normalize());

        // Reticle on active anchor
        reticleGroup.visible = true;
        reticleGroup.position.copy(anchor);
        reticleRing.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 12) * 0.15);
        (reticleRing.material as THREE.MeshBasicMaterial).color.setHex(0xf59e0b); // Gold active
      } else if (webMesh) {
        webMesh.visible = false;
        if (webMesh2) webMesh2.visible = false;

        // Prospective targeting: check Point-Zip (RMB) and Web-Swing (E) anchors
        const lookDir = new THREE.Vector3(
          -Math.sin(camAngleRef.current.yaw),
          Math.tan(-camAngleRef.current.pitch + 0.05),
          -Math.cos(camAngleRef.current.yaw)
        ).normalize();

        const prospectiveZip = city.findZipTarget(physics.position, lookDir, 220);
        const prospectiveSwing = city.findBestWebAnchor(physics.position, lookDir, 160);

        if (prospectiveZip && physics.state !== 'WALL_RUN' && physics.state !== 'WALL_STICK') {
          reticleGroup.visible = true;
          reticleGroup.position.copy(prospectiveZip.point);
          reticleGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), prospectiveZip.normal);
          reticleRing.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 8) * 0.12);
          (reticleRing.material as THREE.MeshBasicMaterial).color.setHex(
            prospectiveZip.isRoof ? 0xf59e0b : 0x38bdf8
          );
        } else if (prospectiveSwing && physics.state !== 'WALL_RUN') {
          reticleGroup.visible = true;
          reticleGroup.position.copy(prospectiveSwing.point);
          reticleGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), prospectiveSwing.normal);
          reticleRing.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 7) * 0.1);
          (reticleRing.material as THREE.MeshBasicMaterial).color.setHex(0x38bdf8);
        } else {
          reticleGroup.visible = false;
        }
      }

      // UPDATE BANDITS & COMBAT
      if (!isMenuOpen) {
        enemies.update(
          dt,
          physics.position,
          camera,
          (dangerAlert) => {
            setSpiderSenseActive(dangerAlert);
            spiderman.setSpiderSense(dangerAlert);
          },
          (damage) => {
            setHealth((h) => Math.max(0, h - damage));
          }
        );
      }

      // BEACONS & DUST MOTES
      const beaconTime = clock.getElapsedTime() * 4;
      city.beacons.forEach((b) => {
        b.visible = Math.sin(beaconTime) > 0;
      });

      if (dustPoints) {
        dustPoints.position.copy(physics.position);
        dustPoints.rotation.y += 0.05 * dt;
      }

      // SILKY-SMOOTH CAMERA ROTATION DAMPING
      if (cameraConfigRef.current.smoothing) {
        camAngleRef.current.yaw = THREE.MathUtils.damp(
          camAngleRef.current.yaw,
          targetCamAngleRef.current.yaw,
          32,
          dt
        );
        camAngleRef.current.pitch = THREE.MathUtils.damp(
          camAngleRef.current.pitch,
          targetCamAngleRef.current.pitch,
          32,
          dt
        );
      } else {
        camAngleRef.current.yaw = targetCamAngleRef.current.yaw;
        camAngleRef.current.pitch = targetCamAngleRef.current.pitch;
      }

      // CAMERA FOLLOW & BUILDING COLLISION AVOIDANCE
      const baseDist =
        cameraMode === 'cinematic' ? 8.5 : 6.2 + Math.min(totalSpeed * 0.08, 3.2);
      let targetDist = baseDist;

      // Prevent camera from clipping through nearby skyscraper walls
      const charHead = new THREE.Vector3(
        physics.position.x,
        physics.position.y + 1.4,
        physics.position.z
      );
      const camDirNorm = new THREE.Vector3(
        Math.sin(camAngleRef.current.yaw) * Math.cos(camAngleRef.current.pitch),
        Math.sin(camAngleRef.current.pitch),
        Math.cos(camAngleRef.current.yaw) * Math.cos(camAngleRef.current.pitch)
      ).normalize();

      for (const b of city.buildings) {
        if (Math.abs(b.center.x - charHead.x) > 28 || Math.abs(b.center.z - charHead.z) > 28) continue;
        for (let d = 2.0; d <= targetDist; d += 0.8) {
          const testPos = charHead.clone().addScaledVector(camDirNorm, d);
          if (
            testPos.x >= b.box.min.x - 0.4 &&
            testPos.x <= b.box.max.x + 0.4 &&
            testPos.z >= b.box.min.z - 0.4 &&
            testPos.z <= b.box.max.z + 0.4 &&
            testPos.y <= b.roofY &&
            testPos.y >= 0
          ) {
            targetDist = Math.max(1.8, d - 0.6);
            break;
          }
        }
      }

      camAngleRef.current.distance = THREE.MathUtils.damp(
        camAngleRef.current.distance,
        targetDist,
        14,
        dt
      );

      const camOffset = new THREE.Vector3(
        Math.sin(camAngleRef.current.yaw) *
          Math.cos(camAngleRef.current.pitch) *
          camAngleRef.current.distance,
        Math.sin(camAngleRef.current.pitch) * camAngleRef.current.distance + 1.8,
        Math.cos(camAngleRef.current.yaw) *
          Math.cos(camAngleRef.current.pitch) *
          camAngleRef.current.distance
      );

      const targetCamPos = physics.position.clone().add(camOffset);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamPos.x, 16, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamPos.y, 16, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamPos.z, 16, dt);

      camTarget.set(physics.position.x, physics.position.y + 1.2, physics.position.z);
      camera.lookAt(camTarget);

      const targetFov = 62 + Math.min(totalSpeed * 0.55, 24);
      camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 8, dt);
      camera.updateProjectionMatrix();

      setSpeedKmh(Math.round(totalSpeed * 3.6));
      setAltitudeM(Math.round(physics.position.y));
      setIsSwinging(physics.state === 'SWINGING');
      setIsWallRunning(physics.state === 'WALL_RUN');

      renderer.render(scene, camera);
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [registerHit, cameraMode, combo, webFluid, isMenuOpen, currentSuit]);

  const resetHeroPosition = () => {
    if (physicsRef.current && cityRef.current) {
      const b = cityRef.current.buildings[Math.floor(cityRef.current.buildings.length / 2)];
      physicsRef.current.position.set(b.center.x, b.roofY, b.center.z);
      physicsRef.current.prevPosition.set(b.center.x, b.roofY, b.center.z);
      physicsRef.current.velocity.set(0, 0, 0);
      physicsRef.current.state = 'GROUND';
      physicsRef.current.superheroLandingTimer = 0.28;
      physicsRef.current.facingAngle = Math.PI;
      camAngleRef.current.yaw = 0;
      camAngleRef.current.pitch = 0.22;
      targetCamAngleRef.current.yaw = 0;
      targetCamAngleRef.current.pitch = 0.22;
      if (spidermanRef.current) {
        spidermanRef.current.mesh.position.set(b.center.x, b.roofY, b.center.z);
        spidermanRef.current.mesh.rotation.y = Math.PI;
      }
      setHealth(100);
      setWebFluid(6);
      setIsMenuOpen(false);
    }
  };

  const getLocalizedState = () => {
    switch (physicsRef.current?.state) {
      case 'AIR':
        return t.stateAir;
      case 'SWINGING':
        return t.stateSwing;
      case 'WALL_RUN':
        return t.stateWall;
      case 'WALL_STICK':
        return t.stateWallStick;
      case 'ZIP_TO_WALL':
        return t.stateZip;
      default:
        return t.stateGround;
    }
  };

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-full h-screen overflow-hidden bg-slate-950 font-sans select-none"
    >
      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 cursor-crosshair z-0"
        title="Click to aim & swing"
      />

      {/* Spider-Sense Danger Halo Visual Ripple */}
      {spiderSenseActive && (
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          <div className="w-64 h-64 border-2 border-yellow-400 rounded-full animate-ping opacity-75" />
          <div className="absolute top-20 bg-black/85 backdrop-blur-md text-amber-300 font-comic text-lg px-4 py-1 rounded-xl shadow-xl border border-amber-400/40 tracking-wider animate-bounce flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500 animate-spin" />
            {t.spiderSenseAlert}
          </div>
        </div>
      )}

      {/* Speedlines on High Speed Swings */}
      {speedKmh > 75 && (
        <div className="absolute inset-0 pointer-events-none z-10 bg-radial from-transparent via-transparent to-black/60 animate-speedlines" />
      )}

      {/* Minimalist Micro Reticle */}
      <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
        <div className="relative flex items-center justify-center opacity-60">
          <Crosshair className="w-5 h-5 text-white/80 stroke-[1.5]" />
          <div className="absolute w-1 h-1 bg-red-500 rounded-full" />
        </div>
      </div>

      {/* TOP-LEFT: LUXURY COMPACT HERO BADGE */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-2.5 bg-black/75 backdrop-blur-2xl border border-white/10 rounded-xl px-3 py-2 shadow-2xl text-white min-w-[210px]">
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-red-600 to-blue-700 flex items-center justify-center border border-white/20 shadow-inner overflow-hidden shrink-0">
            <span className="font-comic text-xl text-white">🕷️</span>
          </div>

          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-comic tracking-wide text-red-400 text-sm">
                {currentSuit === 'symbiote' ? 'SYMBIOTE' : currentSuit === 'miles' ? 'MILES' : 'SPIDER-MAN'}
              </span>
              <span className="font-mono text-[11px] text-slate-300">
                {health}%
              </span>
            </div>

            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  health > 50
                    ? 'bg-emerald-400'
                    : health > 20
                    ? 'bg-amber-400'
                    : 'bg-red-500'
                }`}
                style={{ width: `${health}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                {t.webFluid}
              </span>
              <div className="flex items-center gap-0.5">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-1.5 rounded-xs transition-colors ${
                      i < webFluid
                        ? 'bg-cyan-400 shadow-xs shadow-cyan-400'
                        : 'bg-white/15'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Combo Pill */}
        {combo > 0 && (
          <div className="bg-black/80 backdrop-blur-md border border-amber-400/40 text-amber-300 font-comic px-3 py-1 rounded-lg shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span className="text-sm tracking-wider">
                {combo}x COMBO
              </span>
            </div>
            <span className="text-[11px] text-white/80 font-sans font-bold">
              {comboRating}
            </span>
          </div>
        )}
      </div>

      {/* TOP-RIGHT: LUXURY COMPACT BAR & MICRO RADAR */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-1 bg-black/75 backdrop-blur-2xl border border-white/10 rounded-xl p-1 shadow-2xl">
          <button
            onClick={() => setIsMenuOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors font-bold text-xs"
            title="Меню (Esc)"
          >
            <Menu className="w-3.5 h-3.5" />
            <span>{t.menu}</span>
          </button>

          <button
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              soundEngine.setMuted(next);
            }}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Звук (M)"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          <button
            onClick={() => setCameraMode((m) => (m === 'dynamic' ? 'cinematic' : 'dynamic'))}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-xs font-semibold"
            title="Камера (C)"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleInvertY}
            className={`px-2 py-1 rounded-lg transition-all text-[10px] font-mono font-bold flex items-center gap-1 border ${
              invertY
                ? 'bg-amber-600/30 text-amber-300 border-amber-500/40 hover:bg-amber-600/50'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
            }`}
            title="Быстрое переключение инверсии мыши по вертикали (Y)"
          >
            <Sliders className="w-3 h-3 text-purple-400" />
            <span>{invertY ? 'ИНВ. Y' : 'СТАНД.'}</span>
          </button>

          <button
            onClick={resetHeroPosition}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title={t.restartGame}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Compact Micro Radar */}
        <div className="bg-black/75 backdrop-blur-2xl border border-white/10 rounded-xl p-2 shadow-2xl text-white flex flex-col gap-1 w-36">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <span className="flex items-center gap-1 text-red-400">
              <Compass className="w-3 h-3 text-red-500 animate-pulse" />
              {t.crimeRadar}
            </span>
            <span className="font-mono text-amber-400">
              {banditsRemaining}
            </span>
          </div>

          <div className="relative w-full h-16 bg-black/60 rounded-lg border border-white/5 flex items-center justify-center overflow-hidden">
            <div className="absolute w-14 h-14 rounded-full border border-cyan-500/20" />
            <div className="absolute w-8 h-8 rounded-full border border-cyan-500/30" />
            <div className="w-2 h-2 bg-cyan-400 rounded-full border border-white shadow-xs shadow-cyan-400" />
            {banditsRemaining > 0 && (
              <>
                <div className="absolute top-2.5 right-4 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                <div className="absolute bottom-3 left-4 w-1.5 h-1.5 bg-red-500 rounded-full" />
                <div className="absolute top-5 left-6 w-1.5 h-1.5 bg-red-500 rounded-full" />
              </>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>{t.speed}:</span>
            <span className="text-white font-bold">{speedKmh} km/h</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>{t.altitude}:</span>
            <span className="text-white font-bold">{altitudeM} m</span>
          </div>
        </div>
      </div>

      {/* MISSION VICTORY BANNER */}
      {missionComplete && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl z-30 flex flex-col items-center justify-center p-4 text-white text-center">
          <div className="max-w-sm bg-slate-950 border border-amber-400/40 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3">
            <span className="font-comic text-4xl text-amber-400">
              {t.citySaved}
            </span>
            <p className="text-slate-300 text-xs leading-relaxed">
              {t.citySavedDesc}
            </p>
            <button
              onClick={() => {
                setMissionComplete(false);
                resetHeroPosition();
              }}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 font-comic text-lg text-white rounded-xl shadow-md transition-all hover:scale-105"
            >
              {t.patrolAgain}
            </button>
          </div>
        </div>
      )}

      {/* POINTER LOCK NOTIFICATION BADGE */}
      {!isPointerLocked && !missionComplete && !isMenuOpen && (
        <div className="absolute top-16 inset-x-0 mx-auto w-fit z-10 pointer-events-none bg-black/75 backdrop-blur-md border border-white/10 text-white text-[11px] px-3.5 py-1 rounded-full shadow-lg">
          {t.pointerLockTip}
        </div>
      )}

      {/* ULTRA-COMPACT LUXURY BOTTOM DOCK */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-[800px] pointer-events-auto">
        <div className="flex justify-center -mb-1.5">
          <button
            onClick={() => setShowControlsDock((v) => !v)}
            className="px-3 py-0.5 bg-black/80 hover:bg-black text-slate-400 hover:text-white text-[10px] font-semibold rounded-t-lg border-t border-x border-white/10 backdrop-blur-md transition-colors"
          >
            {showControlsDock ? `▲ ${t.hideControls}` : `▼ ${t.showControls}`}
          </button>
        </div>

        {showControlsDock && (
          <div className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-xl px-3 py-2 shadow-2xl text-white flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center flex-wrap gap-1.5 text-[11px]">
              <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md border border-white/10">
                <kbd className="px-1 py-0.2 bg-white/10 rounded text-[10px] font-mono font-bold text-amber-300">
                  W A S D
                </kbd>
                <span className="text-slate-300 text-[10px]">{currentLang === 'ru' ? 'Движение' : 'Move'}</span>
              </div>

              <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md border border-white/10">
                <kbd className="px-1 py-0.2 bg-white/10 rounded text-[10px] font-mono font-bold text-amber-300">
                  Space
                </kbd>
                <span className="text-slate-300 text-[10px]">{currentLang === 'ru' ? 'Прыжок' : 'Jump'}</span>
              </div>

              <div className="flex items-center gap-1 bg-red-950/40 px-2 py-1 rounded-md border border-red-500/30">
                <kbd className="px-1 py-0.2 bg-red-700 rounded text-[10px] font-mono font-bold text-white">
                  E
                </kbd>
                <span className="text-red-200 text-[10px] font-semibold">{currentLang === 'ru' ? 'Раскачка на паутине' : 'Web Swing'}</span>
              </div>

              <div className="flex items-center gap-1 bg-purple-950/40 px-2 py-1 rounded-md border border-purple-500/30">
                <kbd className="px-1 py-0.2 bg-purple-700 rounded text-[10px] font-mono font-bold text-white">
                  ПКМ (RMB)
                </kbd>
                <span className="text-purple-200 text-[10px] font-semibold">{currentLang === 'ru' ? 'Рывок на крышу (Point-Zip)' : 'Zip to Roof'}</span>
              </div>

              <div className="flex items-center gap-1 bg-amber-950/40 px-2 py-1 rounded-md border border-amber-500/30">
                <kbd className="px-1 py-0.2 bg-amber-600 rounded text-[10px] font-mono font-bold text-white">
                  ЛКМ (LMB)
                </kbd>
                <span className="text-amber-200 text-[10px] font-semibold">{currentLang === 'ru' ? 'Комбо ударов' : 'Melee Combo'}</span>
              </div>

              <div className="flex items-center gap-1 bg-cyan-950/40 px-2 py-1 rounded-md border border-cyan-500/30">
                <kbd className="px-1 py-0.2 bg-cyan-700 rounded text-[10px] font-mono font-bold text-white">
                  F
                </kbd>
                <span className="text-cyan-200 text-[10px] font-semibold">{currentLang === 'ru' ? 'Сгусток паутины' : 'Web Pellet'}</span>
              </div>

              <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md border border-white/10">
                <kbd className="px-1 py-0.2 bg-white/10 rounded text-[10px] font-mono font-bold text-amber-300">
                  Shift
                </kbd>
                <span className="text-slate-300 text-[10px]">{currentLang === 'ru' ? 'Спринт / Бег по стене' : 'Sprint / Wall-Run'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <Zap className="w-3 h-3" />
                {getLocalizedState()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* LUXURY GAME MENU MODAL */}
      <GameMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        currentLang={currentLang}
        onSelectLang={handleSelectLang}
        currentSuit={currentSuit}
        onSelectSuit={handleSelectSuit}
        currentTimeOfDay={currentTimeOfDay}
        onSelectTimeOfDay={handleSelectTimeOfDay}
        isMuted={isMuted}
        onToggleMute={() => {
          const next = !isMuted;
          setIsMuted(next);
          soundEngine.setMuted(next);
        }}
        onRestart={resetHeroPosition}
        invertX={invertX}
        onToggleInvertX={toggleInvertX}
        invertY={invertY}
        onToggleInvertY={toggleInvertY}
        cameraSensitivity={cameraSensitivity}
        onChangeSensitivity={handleSensitivityChange}
        cameraSmoothing={cameraSmoothing}
        onToggleSmoothing={toggleCameraSmoothing}
      />
    </div>
  );
};
