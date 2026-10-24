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
  const [trickBadge, setTrickBadge] = useState<string | null>(null);
  const [nearestTargetM, setNearestTargetM] = useState<number | null>(null);
  const trickTimeoutRef = useRef<number | null>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const triggerTrickBanner = (text: string) => {
    setTrickBadge(text);
    if (trickTimeoutRef.current) clearTimeout(trickTimeoutRef.current);
    trickTimeoutRef.current = window.setTimeout(() => {
      setTrickBadge(null);
    }, 1500);
  };

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
    crouch: false,
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

  const comboRef = useRef(0);
  const webFluidRef = useRef(6);
  const cameraModeRef = useRef<'dynamic' | 'cinematic'>('dynamic');
  const isMenuOpenRef = useRef(false);
  const currentSuitRef = useRef<SuitType>('classic');

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    isMenuOpenRef.current = isMenuOpen;
  }, [isMenuOpen]);

  useEffect(() => {
    currentSuitRef.current = currentSuit;
  }, [currentSuit]);

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
  const combatTimerRef = useRef<number>(0);
  const spiderSenseActiveRef = useRef<boolean>(false);
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
        comboRef.current = next;
        if (next >= 12) setComboRating('ULTIMATE SPIDER-MAN!');
        else if (next >= 8) setComboRating('SPECTACULAR!');
        else if (next >= 4) setComboRating('AMAZING!');
        else setComboRating('NICE HIT!');
        return next;
      });

      if (comboTimerRef.current) window.clearTimeout(comboTimerRef.current);
      comboTimerRef.current = window.setTimeout(() => {
        comboRef.current = 0;
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
      webFluidRef.current = 6;
      setWebFluid(6);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setWebFluid((f) => {
        const next = Math.min(6, f + 1);
        webFluidRef.current = next;
        return next;
      });
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
      const bounds = {
        minX: b.box.min.x + 1.5,
        maxX: b.box.max.x - 1.5,
        minZ: b.box.min.z + 1.5,
        maxZ: b.box.max.z - 1.5,
      };
      const spanX = Math.max(2, (bounds.maxX - bounds.minX) * 0.6);
      const spanZ = Math.max(2, (bounds.maxZ - bounds.minZ) * 0.6);
      enemies.spawnBandit(
        b.center.x + (Math.random() - 0.5) * spanX,
        b.roofY,
        b.center.z + (Math.random() - 0.5) * spanZ,
        bounds
      );
      enemies.spawnBandit(
        b.center.x + (Math.random() - 0.5) * spanX,
        b.roofY,
        b.center.z + (Math.random() - 0.5) * spanZ,
        bounds
      );
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
        inputRef.current = { forward: 0, strafe: 0, jump: false, sprint: false, webSwing: false, crouch: false };
        if (document.pointerLockElement) {
          document.exitPointerLock?.();
        }
        setIsMenuOpen((v) => {
          const next = !v;
          isMenuOpenRef.current = next;
          return next;
        });
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
          if (webFluidRef.current > 0) {
            webFluidRef.current = Math.max(0, webFluidRef.current - 1);
            setWebFluid(webFluidRef.current);
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
          // INSOMNIAC ACROBATIC COMBAT DODGE & EVASIVE COUNTER
          physics.releaseWeb(false);
          let dodgeDirName: 'left' | 'right' | 'back' | 'forward' = 'left';
          const forwardVec = new THREE.Vector3(-Math.sin(camAngleRef.current.yaw), 0, -Math.cos(camAngleRef.current.yaw));
          const rightVec = new THREE.Vector3(Math.cos(camAngleRef.current.yaw), 0, -Math.sin(camAngleRef.current.yaw));
          const dodgeVec = new THREE.Vector3();

          if (inputRef.current.strafe === -1) {
            dodgeVec.sub(rightVec);
            dodgeDirName = 'left';
          } else if (inputRef.current.strafe === 1) {
            dodgeVec.add(rightVec);
            dodgeDirName = 'right';
          } else if (inputRef.current.forward === 1) {
            dodgeVec.add(forwardVec);
            dodgeDirName = 'forward';
          } else if (inputRef.current.forward === -1) {
            dodgeVec.sub(forwardVec);
            dodgeDirName = 'back';
          } else {
            // Default evasive back-slip
            dodgeVec.sub(forwardVec);
            dodgeDirName = 'back';
          }

          physics.triggerDodge(dodgeVec);
          spiderman.triggerDodge(dodgeDirName);
          combatTimerRef.current = 4.0;

          // Check if dodging during Spider-Sense Danger Alert: PERFECT DODGE!
          if (spiderSenseActiveRef.current) {
            soundEngine.playWebWrap();
            triggerTrickBanner('⚡ PERFECT DODGE! +100');
            // Counter-shot webbing nearest attacking bandit
            const attackingBandit = enemies.bandits.find(
              (b) => (b.state === 'ATTACK_PREP' || b.state === 'CHASE') && b.position.distanceTo(physics.position) < 12
            );
            if (attackingBandit) {
              attackingBandit.state = 'WEB_WRAPPED';
              attackingBandit.webTimer = 4.0;
              attackingBandit.cocoonMesh.visible = true;
              attackingBandit.health = Math.max(0, attackingBandit.health - 25);
              enemies.spawnComicPopup(attackingBandit.position, 'WEB-TRAP!');
            }
            registerHit(1, 0);
          } else {
            triggerTrickBanner('💨 ACROBATIC DODGE');
          }
          break;
        }
        case 'KeyC':
        case 'ControlLeft':
        case 'ControlRight':
          inputRef.current.crouch = true;
          break;
        case 'KeyV':
          setCameraMode((m) => {
            const next = m === 'dynamic' ? 'cinematic' : 'dynamic';
            cameraModeRef.current = next;
            return next;
          });
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
        case 'KeyC':
        case 'ControlLeft':
        case 'ControlRight':
          inputRef.current.crouch = false;
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

    // --- MOUSE CLICK: ATTACK 1 (LMB) & SMART CONTEXTUAL RMB ---
    const onMouseDown = (e: MouseEvent) => {
      if (isMenuOpenRef.current) return;
      if (e.button === 0) {
        // LEFT CLICK: MARTIAL ARTS 6-HIT COMBO OR AERIAL WEB-SLAM
        if (document.pointerLockElement !== container) {
          container.requestPointerLock?.();
        }
        const aimAngle = Math.atan2(
          -Math.sin(camAngleRef.current.yaw),
          -Math.cos(camAngleRef.current.yaw)
        );
        physics.facingAngle = aimAngle;
        spiderman.mesh.rotation.y = aimAngle;

        const isAir = physics.state === 'AIR' || physics.isDiving;
        const currentComboStep = isAir ? 99 : comboRef.current % 4;

        if (isAir) {
          // Aerial web slam: plunge down with high kinetic punch!
          physics.velocity.y = -22;
          physics.isDiving = true;
          triggerTrickBanner('💥 AERIAL WEB-SLAM!');
        } else {
          // Kinetic martial arts step-in lunge forward
          const lunge = new THREE.Vector3(-Math.sin(aimAngle), 0, -Math.cos(aimAngle)).multiplyScalar(4.5);
          physics.velocity.add(lunge);
          if (currentComboStep === 3) {
            triggerTrickBanner('⚡ UPPERCUT FINISHER! +150');
          } else if (currentComboStep === 2) {
            triggerTrickBanner('💥 FLYING KNEE STRIKE!');
          } else if (currentComboStep === 1) {
            triggerTrickBanner('💥 ELBOW STRIKE!');
          }
        }

        spiderman.triggerMeleeCombo(currentComboStep);
        const { hitCount, defeatedCount } = enemies.performMeleeCombo(
          physics.position,
          physics.facingAngle,
          currentComboStep,
          isAir
        );
        registerHit(hitCount, defeatedCount);
      } else if (e.button === 2) {
        // RIGHT CLICK: SMART CONTEXTUAL WEB-STRIKE (COMBAT) / POINT-ZIP (PERCH) / AIR WEB-ZIP
        e.preventDefault();
        if (document.pointerLockElement !== container) {
          container.requestPointerLock?.();
        }

        const lookDir = new THREE.Vector3(
          -Math.sin(camAngleRef.current.yaw),
          Math.tan(-camAngleRef.current.pitch + 0.05),
          -Math.cos(camAngleRef.current.yaw)
        ).normalize();

        // 1. COMBAT PRIORITY: Web-Strike against targeted or nearest facing enemy
        const targetEnemy = enemies.findTargetEnemy(physics.position, lookDir, 45, 0.55);
        if (targetEnemy) {
          const aimAngle = Math.atan2(
            targetEnemy.position.x - physics.position.x,
            targetEnemy.position.z - physics.position.z
          );
          physics.facingAngle = aimAngle;
          spiderman.mesh.rotation.y = aimAngle;
          triggerTrickBanner('💥 WEB-STRIKE!');
          physics.startWebStrike(targetEnemy.position.clone().add(new THREE.Vector3(0, 0.9, 0)), () => {
            // When reaching enemy: deliver heavy flying impact!
            targetEnemy.health -= 65;
            targetEnemy.flinchTimer = 0.55;
            const knockDir = targetEnemy.position.clone().sub(physics.position).normalize();
            knockDir.y = 0.35;
            targetEnemy.velocity.addScaledVector(knockDir, 24);
            soundEngine.playPunch(3);
            enemies.spawnComicPopup(targetEnemy.position, 'KAPOW!');

            let defeated = 0;
            if (targetEnemy.health <= 0) {
              targetEnemy.health = 0;
              targetEnemy.state = 'KNOCKED_OUT';
              defeated = 1;
              soundEngine.playDefeat();
              targetEnemy.mesh.rotation.x = Math.PI / 2;
              targetEnemy.position.y = targetEnemy.spawnPoint.y + 0.25;
              targetEnemy.mesh.position.copy(targetEnemy.position);
              targetEnemy.healthBarMesh.visible = false;
            }
            registerHit(1, defeated);
          });
          return;
        }

        // 2. TRAVERSAL PRIORITY: Point-Zip to nearby building rooftop / wall perch (within 85m)
        const zipTarget = city.findZipTarget(physics.position, lookDir, 85);
        if (zipTarget) {
          const aimAngle = Math.atan2(
            zipTarget.point.x - physics.position.x,
            zipTarget.point.z - physics.position.z
          );
          physics.facingAngle = aimAngle;
          spiderman.mesh.rotation.y = aimAngle;
          physics.startZipToTarget(zipTarget, () => {
            const { hitCount, defeatedCount } = enemies.hitBanditAtPosition(zipTarget.point, 4.5, 30);
            registerHit(hitCount, defeatedCount);
          });
          spiderman.triggerWebPellet();
          triggerTrickBanner('⚡ POINT-ZIP!');
          return;
        }

        // 3. MID-AIR SLINGSHOT / AIR WEB-ZIP (When in mid-air with no target nearby)
        if (physics.state === 'AIR' || physics.state === 'SWINGING') {
          physics.releaseWeb(false);
          const zipDir = new THREE.Vector3(
            -Math.sin(camAngleRef.current.yaw),
            0.16,
            -Math.cos(camAngleRef.current.yaw)
          ).normalize();
          physics.velocity.copy(zipDir).multiplyScalar(32);
          physics.isAirTricking = true;
          spiderman.triggerWebPellet();
          soundEngine.playWebShoot();
          soundEngine.playJump();
          triggerTrickBanner('🕸️ AIR WEB-ZIP!');
          return;
        }

        // 4. GROUND FALLBACK: Web Cocoon blast / net
        if (webFluidRef.current >= 1) {
          webFluidRef.current = Math.max(0, webFluidRef.current - 1);
          setWebFluid(webFluidRef.current);
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
        inputRef.current = { forward: 0, strafe: 0, jump: false, sprint: false, webSwing: false, crouch: false };
      }
    };

    const onBlur = () => {
      inputRef.current = { forward: 0, strafe: 0, jump: false, sprint: false, webSwing: false, crouch: false };
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

      if (!isMenuOpenRef.current) {
        physics.update(dt, inputRef.current, camAngleRef.current.yaw, city);
        city.update(dt);
      }

      // Dynamic stunt banners
      if (physics.isPointLaunching && trickBadge !== '⚡ POINT LAUNCH') {
        triggerTrickBanner('⚡ POINT LAUNCH +100');
      } else if (physics.isDiving && trickBadge !== '🦅 SWAN DIVE') {
        triggerTrickBanner('🦅 SWAN DIVE');
      } else if (physics.isAirTricking && trickBadge !== '🌪️ AIR TRICK') {
        triggerTrickBanner('🌪️ AIR TRICK +50');
      }

      spiderman.mesh.position.copy(physics.position);

      // Smooth shortest-path angular rotation
      let diff = physics.facingAngle - spiderman.mesh.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      spiderman.mesh.rotation.y += diff * Math.min(1, dt * 18);

      // Dynamic body pitch (athletic lean into wall run, swan dive, or acrobatic tumble)
      let targetPitch = 0;
      if (physics.state === 'WALL_RUN') {
        targetPitch = 0.35; // Athletic forward lean against the wall facade
      } else if (physics.state === 'WALL_STICK') {
        targetPitch = 0.15; // 4-point spider cling
      } else if (physics.state === 'AIR') {
        if (physics.isDiving) {
          targetPitch = 0.68; // Swan-dive looking down towards the streets
        } else if (physics.isAirTricking) {
          targetPitch = Math.sin(physics.airTrickRotation) * 0.45;
        } else if (physics.isAcrobaticLeap) {
          targetPitch = -0.18; // Athletic forward leap launch angle
        } else {
          targetPitch = Math.max(-0.35, Math.min(0.35, -physics.velocity.y * 0.012));
        }
      }
      spiderman.mesh.rotation.x = THREE.MathUtils.damp(
        spiderman.mesh.rotation.x,
        targetPitch,
        18,
        dt
      );

      // Damp body roll: reset smoothly to 0 on jump / ground, bank into turns only during swinging
      const targetRoll = physics.state === 'SWINGING' ? physics.bankAngle : 0;
      spiderman.mesh.rotation.z = THREE.MathUtils.damp(
        spiderman.mesh.rotation.z,
        targetRoll,
        14,
        dt
      );

      const horizSpeed = Math.sqrt(
        physics.velocity.x * physics.velocity.x + physics.velocity.z * physics.velocity.z
      );
      const totalSpeed = physics.velocity.length();

      if (combatTimerRef.current > 0) {
        combatTimerRef.current -= dt;
      }
      const nearestActiveEnemy = enemies.bandits.find(
        (b) => b.state !== 'KNOCKED_OUT' && b.position.distanceTo(physics.position) < 18
      );
      const isInCombat = !!nearestActiveEnemy || combatTimerRef.current > 0;

      spiderman.update(
        dt,
        physics.state,
        horizSpeed,
        physics.isSprinting,
        physics.state === 'SWINGING',
        physics.state === 'WALL_RUN',
        physics.activeAnchorSide,
        physics.bankAngle,
        physics.superheroLandingTimer,
        physics.isDiving,
        physics.isAirTricking,
        physics.isCrouching,
        isInCombat,
        physics.isAcrobaticLeap
      );

      // VOLUMETRIC WEB CYLINDERS (Twin webs during Point-Zip & Web-Strike, single web during swing)
      const wristLeft = new THREE.Vector3();
      const wristRight = new THREE.Vector3();

      if (((physics.state === 'ZIP_TO_WALL' && physics.zipTarget) || (physics.state === 'WEB_STRIKE' && physics.webStrikeTarget)) && webMesh && webMesh2) {
        // TWIN-WEB POINT ZIP / WEB-STRIKE: Two parallel high-velocity webs stretch from wrists to target
        webMesh.visible = true;
        webMesh2.visible = true;

        spiderman.getLeftWristPosition(wristLeft);
        spiderman.getRightWristPosition(wristRight);
        const targetPt = physics.state === 'WEB_STRIKE' ? physics.webStrikeTarget! : physics.zipTarget!.point;

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

        // Reticle locks onto landing target or enemy in vibrant color
        reticleGroup.visible = true;
        reticleGroup.position.copy(targetPt);
        if (physics.state === 'ZIP_TO_WALL' && physics.zipTarget) {
          reticleGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), physics.zipTarget.normal);
        } else {
          reticleGroup.quaternion.copy(camera.quaternion);
        }
        reticleRing.scale.setScalar(1.25);
        (reticleRing.material as THREE.MeshBasicMaterial).color.setHex(physics.state === 'WEB_STRIKE' ? 0xef4444 : 0xf59e0b);
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

        // Prospective targeting: check Enemy Web-Strike (RMB), Point-Zip (RMB), or Web-Swing (E) anchors
        const lookDir = new THREE.Vector3(
          -Math.sin(camAngleRef.current.yaw),
          Math.tan(-camAngleRef.current.pitch + 0.05),
          -Math.cos(camAngleRef.current.yaw)
        ).normalize();

        const prospectiveEnemy = enemies.findTargetEnemy(physics.position, lookDir, 45, 0.55);
        const prospectiveZip = city.findZipTarget(physics.position, lookDir, 85);
        const prospectiveSwing = city.findBestWebAnchor(physics.position, lookDir, 160);

        if (prospectiveEnemy) {
          // Crimson combat targeting lock over bandit!
          reticleGroup.visible = true;
          reticleGroup.position.copy(prospectiveEnemy.position).add(new THREE.Vector3(0, 1.1, 0));
          reticleGroup.quaternion.copy(camera.quaternion);
          reticleRing.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 14) * 0.2);
          (reticleRing.material as THREE.MeshBasicMaterial).color.setHex(0xef4444);
        } else if (prospectiveZip && physics.state !== 'WALL_RUN' && physics.state !== 'WALL_STICK') {
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
      if (!isMenuOpenRef.current) {
        enemies.update(
          dt,
          physics.position,
          camera,
          (dangerAlert) => {
            spiderSenseActiveRef.current = dangerAlert;
            setSpiderSenseActive(dangerAlert);
            spiderman.setSpiderSense(dangerAlert);
            if (dangerAlert) combatTimerRef.current = 4.0;
          },
          (damage) => {
            if (physics.isDodging) return; // Invulnerable during acrobatic dodge!
            setHealth((h) => Math.max(0, h - damage));
            combatTimerRef.current = 4.0;
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
        cameraModeRef.current === 'cinematic' ? 8.5 : 6.2 + Math.min(totalSpeed * 0.08, 3.2);
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

      const diveFov = physics.isDiving ? 12 : 0;
      const launchFov = physics.isPointLaunching ? 15 : 0;
      const targetFov = 62 + Math.min(totalSpeed * 0.55, 24) + diveFov + launchFov;
      camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 9, dt);
      camera.updateProjectionMatrix();

      setSpeedKmh(Math.round(totalSpeed * 3.6));
      setAltitudeM(Math.round(physics.position.y));
      setIsSwinging(physics.state === 'SWINGING');
      setIsWallRunning(physics.state === 'WALL_RUN');

      // --- DYNAMIC ROTATING RADAR RENDERING (CAMERA-RELATIVE COORDS & LIVE DISTANCE) ---
      if (radarCanvasRef.current) {
        const cvs = radarCanvasRef.current;
        const ctx = cvs.getContext('2d');
        if (ctx) {
          const w = cvs.width;
          const h = cvs.height;
          const cx = w / 2;
          const cy = h / 2;
          const R = cx - 6;
          const maxRadarRange = 140; // 140 meters detection sphere

          ctx.clearRect(0, 0, w, h);

          // Circular clip
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, R, 0, Math.PI * 2);
          ctx.clip();

          // Dark radar grid background
          const bgGrad = ctx.createRadialGradient(cx, cy, 6, cx, cy, R);
          bgGrad.addColorStop(0, '#091528');
          bgGrad.addColorStop(0.85, '#030712');
          bgGrad.addColorStop(1, '#020617');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, w, h);

          // Range rings (35m, 70m, 105m, 140m)
          ctx.lineWidth = 1;
          for (const distM of [35, 70, 105, 140]) {
            const ringR = (distM / maxRadarRange) * (R - 2);
            ctx.beginPath();
            ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
            ctx.strokeStyle = distM === 140 ? 'rgba(56, 189, 248, 0.45)' : 'rgba(56, 189, 248, 0.16)';
            ctx.setLineDash(distM === 140 ? [] : [2, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Crosshairs
          ctx.beginPath();
          ctx.moveTo(cx, cy - R);
          ctx.lineTo(cx, cy + R);
          ctx.moveTo(cx - R, cy);
          ctx.lineTo(cx + R, cy);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
          ctx.stroke();

          // Forward Camera Vision Cone (translucent sector pointing forward/UP)
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, R, -Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42);
          ctx.closePath();
          ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
          ctx.fill();

          // Rotating radar sweep line
          const sweepAngle = ((clock.getElapsedTime() * 2.8) % (Math.PI * 2)) - Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(sweepAngle) * R, cy + Math.sin(sweepAngle) * R);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.40)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Camera yaw for orientation transform
          const camYaw = camAngleRef.current.yaw;
          const px = physics.position.x;
          const pz = physics.position.z;
          const py = physics.position.y;

          let nearestDist = Infinity;

          // Render live bandit blips
          for (const b of enemies.bandits) {
            if (b.state === 'KNOCKED_OUT') continue;

            const dx = b.position.x - px;
            const dz = b.position.z - pz;
            const dist = Math.hypot(dx, dz);
            const dy = b.position.y - py;

            if (dist < nearestDist) nearestDist = dist;

            // Transform into camera view space:
            // Camera forward in world: (-sin(camYaw), -cos(camYaw))
            // Camera right in world: (cos(camYaw), -sin(camYaw))
            const relX = dx * Math.cos(camYaw) - dz * Math.sin(camYaw);
            const relForward = -dx * Math.sin(camYaw) - dz * Math.cos(camYaw);

            // Scale to radar canvas coordinates
            const maxClamp = R - 8;
            const scale = (R - 10) / maxRadarRange;
            let bx = cx + relX * scale;
            let by = cy - relForward * scale;

            const isClamped = dist > maxRadarRange;
            if (isClamped) {
              const ang = Math.atan2(-relForward, relX);
              bx = cx + Math.cos(ang) * maxClamp;
              by = cy + Math.sin(ang) * maxClamp;
            }

            const isWebbed = b.state === 'WEB_WRAPPED';
            const isAlert = b.state === 'CHASE' || b.state === 'ATTACK_PREP' || b.state === 'ATTACK';

            // Draw Blip
            if (isWebbed) {
              ctx.fillStyle = '#38bdf8';
              ctx.beginPath();
              ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
              ctx.fill();
            } else if (isAlert) {
              const pulse = Math.sin(clock.getElapsedTime() * 12) * 1.5;
              ctx.fillStyle = '#ef4444';
              ctx.beginPath();
              ctx.arc(bx, by, 4.5 + pulse, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#fca5a5';
              ctx.lineWidth = 1.2;
              ctx.stroke();
            } else {
              ctx.fillStyle = '#ef4444';
              ctx.beginPath();
              ctx.arc(bx, by, 3.8, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#991b1b';
              ctx.lineWidth = 1;
              ctx.stroke();
            }

            // Elevation Indicator (▲ on roof, ▼ on street)
            if (dy > 4.5) {
              ctx.fillStyle = '#fca5a5';
              ctx.beginPath();
              ctx.moveTo(bx, by - 6.5);
              ctx.lineTo(bx - 3.5, by - 3);
              ctx.lineTo(bx + 3.5, by - 3);
              ctx.closePath();
              ctx.fill();
            } else if (dy < -4.5) {
              ctx.fillStyle = '#fca5a5';
              ctx.beginPath();
              ctx.moveTo(bx, by + 6.5);
              ctx.lineTo(bx - 3.5, by + 3);
              ctx.lineTo(bx + 3.5, by + 3);
              ctx.closePath();
              ctx.fill();
            }
          }

          // Center Spider-Man Chevron (Pointing UP towards camera look direction)
          ctx.fillStyle = '#38bdf8';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(cx, cy - 7);
          ctx.lineTo(cx - 5.5, cy + 5);
          ctx.lineTo(cx, cy + 2);
          ctx.lineTo(cx + 5.5, cy + 5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.restore();

          // Outer glowing radar bezel ring
          ctx.beginPath();
          ctx.arc(cx, cy, R, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Update nearest target distance readout
          if (nearestDist !== Infinity) {
            setNearestTargetM(Math.round(nearestDist));
          } else {
            setNearestTargetM(null);
          }
        }
      }

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
  }, [registerHit]);

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

      {/* Speedlines on High Speed Swings & Dives */}
      {speedKmh > 75 && (
        <div className="absolute inset-0 pointer-events-none z-10 bg-radial from-transparent via-transparent to-black/60 animate-speedlines" />
      )}

      {/* Acrobatic Parkour Stunt & Trick Banner */}
      {trickBadge && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-bounce">
          <div className="bg-gradient-to-r from-amber-500/90 via-red-600/95 to-amber-500/90 text-white font-comic text-xl px-5 py-1.5 rounded-2xl shadow-2xl border-2 border-yellow-300 tracking-wider flex items-center gap-2 backdrop-blur-md">
            <Zap className="w-5 h-5 text-yellow-300 animate-spin" />
            <span>{trickBadge}</span>
          </div>
        </div>
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

        {/* Rotating Micro Radar with View Direction & Accurate Proximity */}
        <div className="bg-black/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-2.5 shadow-2xl text-white flex flex-col items-center gap-1.5 w-36">
          <div className="flex items-center justify-between w-full text-[11px] font-bold text-slate-300 px-0.5">
            <span className="flex items-center gap-1 text-red-400">
              <Compass className="w-3.5 h-3.5 text-red-500 animate-spin" style={{ animationDuration: '8s' }} />
              {t.crimeRadar}
            </span>
            <span className="font-mono text-amber-400 font-extrabold text-xs">
              {banditsRemaining}
            </span>
          </div>

          {/* Active Canvas Radar View */}
          <div className="relative w-28 h-28 flex items-center justify-center">
            <canvas
              ref={radarCanvasRef}
              width={240}
              height={240}
              className="w-28 h-28 rounded-full border border-cyan-500/30 shadow-inner"
            />
          </div>

          {/* Proximity & Distance Telemetry */}
          <div className="flex flex-col w-full gap-0.5 pt-1 border-t border-white/10">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-400">Цель:</span>
              <span className="font-bold text-amber-400">
                {nearestTargetM !== null ? `${nearestTargetM}m` : '0'}
              </span>
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
                <span className="text-purple-200 text-[10px] font-semibold">{currentLang === 'ru' ? 'Паутинный удар / Зацеп' : 'Web-Strike / Point-Zip'}</span>
              </div>

              <div className="flex items-center gap-1 bg-amber-950/40 px-2 py-1 rounded-md border border-amber-500/30">
                <kbd className="px-1 py-0.2 bg-amber-600 rounded text-[10px] font-mono font-bold text-white">
                  ЛКМ (LMB)
                </kbd>
                <span className="text-amber-200 text-[10px] font-semibold">{currentLang === 'ru' ? 'Серия ударов руками / Слэм' : 'Punch Combo / Slam'}</span>
              </div>

              <div className="flex items-center gap-1 bg-cyan-950/40 px-2 py-1 rounded-md border border-cyan-500/30">
                <kbd className="px-1 py-0.2 bg-cyan-700 rounded text-[10px] font-mono font-bold text-white">
                  F
                </kbd>
                <span className="text-cyan-200 text-[10px] font-semibold">{currentLang === 'ru' ? 'Сгусток паутины' : 'Web Pellet'}</span>
              </div>

              <div className="flex items-center gap-1 bg-emerald-950/40 px-2 py-1 rounded-md border border-emerald-500/30">
                <kbd className="px-1 py-0.2 bg-emerald-700 rounded text-[10px] font-mono font-bold text-white">
                  C / Ctrl
                </kbd>
                <span className="text-emerald-200 text-[10px] font-semibold">{currentLang === 'ru' ? 'Приседание / Крадущийся шаг' : 'Crouch / Stealth Perch'}</span>
              </div>

              <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md border border-white/10">
                <kbd className="px-1 py-0.2 bg-white/10 rounded text-[10px] font-mono font-bold text-amber-300">
                  Shift
                </kbd>
                <span className="text-slate-300 text-[10px]">{currentLang === 'ru' ? 'Спринт / Бег по стене' : 'Sprint / Wall-Run'}</span>
              </div>

              <div className="flex items-center gap-1 bg-yellow-950/40 px-2 py-1 rounded-md border border-yellow-500/30">
                <kbd className="px-1 py-0.2 bg-yellow-600 rounded text-[10px] font-mono font-bold text-white">
                  Q
                </kbd>
                <span className="text-yellow-200 text-[10px] font-semibold">{currentLang === 'ru' ? 'Уклонение Insomniac (Контрудар)' : 'Insomniac Dodge (Counter)'}</span>
              </div>

              <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md border border-white/10">
                <kbd className="px-1 py-0.2 bg-white/10 rounded text-[10px] font-mono font-bold text-slate-300">
                  V
                </kbd>
                <span className="text-slate-400 text-[10px]">{currentLang === 'ru' ? 'Камера' : 'Camera'}</span>
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
