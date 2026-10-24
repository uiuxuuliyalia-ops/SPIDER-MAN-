/**
 * EnemiesManager: Combat system with 3 distinct player attack types:
 * 1. Martial arts 4-hit melee combo (LMB)
 * 2. Rapid-fire Web Pellets (F)
 * 3. Wide Web Cocoon Net blast (RMB)
 */

import * as THREE from 'three';
import { soundEngine } from './SoundEngine';

export interface BanditRig {
  spine: THREE.Group;
  head: THREE.Group;
  leftUpperArm: THREE.Group;
  leftForearm: THREE.Group;
  rightUpperArm: THREE.Group;
  rightForearm: THREE.Group;
  weapon: THREE.Group;
  leftThigh: THREE.Group;
  leftShin: THREE.Group;
  rightThigh: THREE.Group;
  rightShin: THREE.Group;
  walkPhase: number;
}

export type BanditArchetype = 'bruiser' | 'punk' | 'ninja' | 'merc';

export interface Bandit {
  id: number;
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  health: number;
  maxHealth: number;
  state: 'PATROL' | 'CHASE' | 'ATTACK_PREP' | 'ATTACK' | 'WEB_WRAPPED' | 'KNOCKED_OUT';
  webTimer: number;
  attackTimer: number;
  patrolAngle: number;
  spawnPoint: THREE.Vector3;
  healthBarMesh: THREE.Mesh;
  cocoonMesh: THREE.Mesh;
  archetype: BanditArchetype;
  rig: BanditRig;
  flinchTimer: number;
  hitCooldown: number;
  isAirborne: boolean;
  stumbleTimer: number;
  roofBounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export interface ComicPopup {
  mesh: THREE.Group;
  position: THREE.Vector3;
  timer: number;
  maxTime: number;
}

export interface WebPellet {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
}

export class EnemiesManager {
  public group: THREE.Group;
  public bandits: Bandit[] = [];
  public popups: ComicPopup[] = [];
  public pellets: WebPellet[] = [];
  private nextId = 1;
  private popupCanvasTextures: Map<string, THREE.CanvasTexture> = new Map();

  constructor() {
    this.group = new THREE.Group();
    this.prebakeComicWords();
  }

  private prebakeComicWords() {
    const words = ['THWIP!', 'BAM!', 'POW!', 'KAPOW!', 'WHAM!', 'CRACK!', 'WEB-TRAP!', 'BOOM!', 'SMASH!'];
    const colors = ['#f59e0b', '#ef4444', '#ec4899', '#3b82f6', '#10b981', '#f97316', '#06b6d4', '#e11d48', '#8b5cf6'];

    words.forEach((word, idx) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;

      // Starburst comic bubble
      ctx.fillStyle = colors[idx % colors.length];
      ctx.beginPath();
      const cx = 128;
      const cy = 64;
      const points = 14;

      for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? 56 : 32;
        const angle = (i * Math.PI) / points;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Bangers, Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5;
      ctx.strokeText(word, cx, cy);
      ctx.fillText(word, cx, cy);

      const tex = new THREE.CanvasTexture(canvas);
      this.popupCanvasTextures.set(word, tex);
    });
  }

  public spawnBandit(
    x: number,
    y: number,
    z: number,
    bounds?: { minX: number; maxX: number; minZ: number; maxZ: number }
  ): Bandit {
    const banditGroup = new THREE.Group();
    banditGroup.position.set(x, y, z);

    // Pick 1 of 4 Marvel Rogues Gallery Archetypes
    const archetypes: BanditArchetype[] = ['bruiser', 'punk', 'ninja', 'merc'];
    const archetype = archetypes[Math.floor(Math.random() * archetypes.length)];

    let maxHealth = 100;
    let vestColor = 0x334155;
    let pantsColor = 0x1e293b;
    let skinColor = 0xd97706;
    let scaleVal = 1.0;

    if (archetype === 'bruiser') {
      maxHealth = 180;
      vestColor = 0x18181b; // Heavy biker leather
      pantsColor = 0x27272a;
      skinColor = 0xf59e0b;
      scaleVal = 1.18; // Massive imposing frame
    } else if (archetype === 'punk') {
      maxHealth = 120;
      vestColor = 0x7c2d12; // Rust denim jacket
      pantsColor = 0x0f172a;
      skinColor = 0xfbbf24;
      scaleVal = 0.98;
    } else if (archetype === 'ninja') {
      maxHealth = 130;
      vestColor = 0x0f172a; // Midnight stealth gi
      pantsColor = 0x020617;
      skinColor = 0x1e293b; // Ninja cowl
      scaleVal = 0.95;
    } else {
      // merc (Tactical Sable/Roxxon contractor)
      maxHealth = 160;
      vestColor = 0x334155; // High-tech tactical Kevlar
      pantsColor = 0x1e293b;
      skinColor = 0xf59e0b;
      scaleVal = 1.05;
    }

    const vestMat = new THREE.MeshStandardMaterial({ color: vestColor, roughness: 0.65, metalness: 0.2 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.45 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.85 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.85 });

    // Hips Root
    const hips = new THREE.Group();
    hips.position.y = 0.88 * scaleVal;
    banditGroup.add(hips);

    // Spine & Torso
    const spine = new THREE.Group();
    hips.add(spine);

    const chestW = archetype === 'bruiser' ? 0.62 : 0.50;
    const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(chestW, 0.65, 0.34), vestMat);
    torsoMesh.position.y = 0.32;
    torsoMesh.castShadow = true;
    spine.add(torsoMesh);

    // Merc tactical chest plate or Bruiser belt buckle
    if (archetype === 'merc') {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.45, 0.08), metalMat);
      plate.position.set(0, 0.35, 0.16);
      spine.add(plate);
    } else if (archetype === 'bruiser') {
      const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.1, 10), metalMat);
      belt.position.y = 0.02;
      spine.add(belt);
    }

    // Anatomical Neck connecting into torso
    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.14, 8), skinMat);
    neckMesh.position.y = 0.58;
    spine.add(neckMesh);

    // Head Group & Sculpted Cranium
    const head = new THREE.Group();
    head.position.y = 0.70;
    spine.add(head);

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.165, 12, 12), skinMat);
    headMesh.scale.set(0.92, 1.08, 1.0);
    headMesh.castShadow = true;
    head.add(headMesh);

    // Sculpted superhero comic chin & jawline
    const chinMesh = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.13, 6), skinMat);
    chinMesh.rotation.x = Math.PI;
    chinMesh.position.set(0, -0.07, 0.05);
    head.add(chinMesh);

    // 3D FACIAL FEATURES: Eyes with white sclera, dark irises, and angry furrowed brows
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
    const browMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });

    for (const side of [-1, 1]) {
      // White eye sphere
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), eyeWhiteMat);
      eyeWhite.position.set(side * 0.065, 0.02, 0.145);
      head.add(eyeWhite);

      // Dark pupil / iris staring aggressively forward
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), pupilMat);
      pupil.position.set(side * 0.065, 0.02, 0.168);
      head.add(pupil);

      // Furrowed thick angry eyebrow angled down to center
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.022, 0.04), browMat);
      brow.position.set(side * 0.065, 0.055, 0.155);
      brow.rotation.z = side * -0.25;
      head.add(brow);

      // 3D Ear on left and right side of head
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.065, 0.04), skinMat);
      ear.position.set(side * 0.165, 0.01, 0);
      head.add(ear);
    }

    // 3D SCULPTED NOSE with bridge and nostril base
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.075, 4), skinMat);
    nose.rotation.x = -Math.PI / 2.3;
    nose.position.set(0, -0.01, 0.18);
    head.add(nose);

    // 3D SCULPTED MOUTH: Snarling grimace showing white clenched teeth line
    const mouthCavity = new THREE.Mesh(
      new THREE.BoxGeometry(0.085, 0.032, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x450a0a })
    );
    mouthCavity.position.set(0, -0.07, 0.152);
    head.add(mouthCavity);

    const teeth = new THREE.Mesh(
      new THREE.BoxGeometry(0.068, 0.015, 0.022),
      new THREE.MeshBasicMaterial({ color: 0xf8fafc })
    );
    teeth.position.set(0, -0.065, 0.156);
    head.add(teeth);

    // Archetype-specific headgear & face accessories
    if (archetype === 'bruiser') {
      // Shaved head with flat leather biker cap & heavy jaw stubble
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.08, 10), vestMat);
      cap.position.y = 0.15;
      head.add(cap);
    } else if (archetype === 'punk') {
      // Neon Magenta punk mohawk & red bandana
      const mohawk = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.18, 0.34),
        new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xbe185d, emissiveIntensity: 0.5 })
      );
      mohawk.position.set(0, 0.18, 0);
      head.add(mohawk);
      const bandana = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.22), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
      bandana.position.set(0, -0.08, 0.05);
      head.add(bandana);
    } else if (archetype === 'ninja') {
      // Ninja assassin cowl with glowing crimson ocular visor
      const cowl = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 10), vestMat);
      head.add(cowl);
      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.05, 0.04),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      visor.position.set(0, 0.02, 0.18);
      head.add(visor);
    } else {
      // Merc ballistic combat helmet with night-vision monocle
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 10), metalMat);
      helmet.position.y = 0.04;
      head.add(helmet);
      const optic = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8),
        new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
      );
      optic.rotation.x = Math.PI / 2;
      optic.position.set(0.08, 0.05, 0.22);
      head.add(optic);
    }

    // Left Arm Hierarchy with Shoulder & Elbow Cap
    const leftUpperArm = new THREE.Group();
    leftUpperArm.position.set(chestW * 0.55 + 0.04, 0.55, 0);
    spine.add(leftUpperArm);
    const lDeltoid = new THREE.Mesh(new THREE.SphereGeometry(0.088, 8, 8), vestMat);
    leftUpperArm.add(lDeltoid);
    const lBicep = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.26, 8), skinMat);
    lBicep.position.y = -0.13;
    leftUpperArm.add(lBicep);

    const lElbow = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 6), vestMat);
    lElbow.position.set(0, -0.26, -0.015);
    leftUpperArm.add(lElbow);

    const leftForearm = new THREE.Group();
    leftForearm.position.y = -0.26;
    leftUpperArm.add(leftForearm);
    const lForearmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.24, 8), skinMat);
    lForearmMesh.position.y = -0.12;
    leftForearm.add(lForearmMesh);

    // Fist with individual thumb and knuckles
    const lFist = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), metalMat);
    lFist.position.y = -0.25;
    leftForearm.add(lFist);
    const lThumb = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.015, 0.06, 6), skinMat);
    lThumb.position.set(0.045, -0.24, 0.02);
    lThumb.rotation.z = 0.55;
    leftForearm.add(lThumb);

    // Right Arm Hierarchy & Weapon
    const rightUpperArm = new THREE.Group();
    rightUpperArm.position.set(-(chestW * 0.55 + 0.04), 0.55, 0);
    spine.add(rightUpperArm);
    const rDeltoid = new THREE.Mesh(new THREE.SphereGeometry(0.088, 8, 8), vestMat);
    rightUpperArm.add(rDeltoid);
    const rBicep = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.26, 8), skinMat);
    rBicep.position.y = -0.13;
    rightUpperArm.add(rBicep);

    const rElbow = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 6), vestMat);
    rElbow.position.set(0, -0.26, -0.015);
    rightUpperArm.add(rElbow);

    const rightForearm = new THREE.Group();
    rightForearm.position.y = -0.26;
    rightUpperArm.add(rightForearm);
    const rForearmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.24, 8), skinMat);
    rForearmMesh.position.y = -0.12;
    rightForearm.add(rForearmMesh);

    // Right Hand & Weapon
    const weapon = new THREE.Group();
    weapon.position.y = -0.24;
    rightForearm.add(weapon);

    const rFist = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), metalMat);
    weapon.add(rFist);

    if (archetype === 'bruiser') {
      // Heavy spiked knuckle dusters
      const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), metalMat);
      weapon.add(knuckle);
    } else if (archetype === 'punk') {
      // Spiked baseball bat
      const bat = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.85, 8), new THREE.MeshStandardMaterial({ color: 0x92400e }));
      bat.rotation.x = Math.PI / 3;
      bat.position.set(0, 0.15, 0.25);
      weapon.add(bat);
    } else if (archetype === 'ninja') {
      // Ninja Ninjato Katana
      const swordHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 6), metalMat);
      weapon.add(swordHilt);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.75, 0.05), metalMat);
      blade.position.y = 0.42;
      weapon.add(blade);
    } else {
      // Merc Electric Stun Baton with neon glow
      const baton = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.65, 8), metalMat);
      baton.rotation.x = Math.PI / 4;
      baton.position.set(0, 0.1, 0.15);
      weapon.add(baton);
      const stunEmitter = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      stunEmitter.rotation.x = Math.PI / 4;
      stunEmitter.position.set(0, 0.25, 0.32);
      weapon.add(stunEmitter);
    }

    // Legs Rigging with Sculpted Knee Pads & Boots
    const legW = chestW * 0.28;
    const leftThigh = new THREE.Group();
    leftThigh.position.set(legW, 0, 0);
    hips.add(leftThigh);
    const lThighMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.38, 8), pantsMat);
    lThighMesh.position.y = -0.19;
    lThighMesh.castShadow = true;
    leftThigh.add(lThighMesh);

    const lKneePad = new THREE.Mesh(new THREE.SphereGeometry(0.082, 8, 8), vestMat);
    lKneePad.position.set(0, -0.38, 0.035);
    leftThigh.add(lKneePad);

    const leftShin = new THREE.Group();
    leftShin.position.y = -0.38;
    leftThigh.add(leftShin);
    const lShinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.36, 8), pantsMat);
    lShinMesh.position.y = -0.18;
    lShinMesh.castShadow = true;
    leftShin.add(lShinMesh);
    const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.22), bootMat);
    lBoot.position.set(0, -0.34, 0.04);
    leftShin.add(lBoot);
    const lSole = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.24), new THREE.MeshBasicMaterial({ color: 0x09090b }));
    lSole.position.set(0, -0.40, 0.04);
    leftShin.add(lSole);

    const rightThigh = new THREE.Group();
    rightThigh.position.set(-legW, 0, 0);
    hips.add(rightThigh);
    const rThighMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.38, 8), pantsMat);
    rThighMesh.position.y = -0.19;
    rThighMesh.castShadow = true;
    rightThigh.add(rThighMesh);

    const rKneePad = new THREE.Mesh(new THREE.SphereGeometry(0.082, 8, 8), vestMat);
    rKneePad.position.set(0, -0.38, 0.035);
    rightThigh.add(rKneePad);

    const rightShin = new THREE.Group();
    rightShin.position.y = -0.38;
    rightThigh.add(rightShin);
    const rShinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.36, 8), pantsMat);
    rShinMesh.position.y = -0.18;
    rShinMesh.castShadow = true;
    rightShin.add(rShinMesh);
    const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.22), bootMat);
    rBoot.position.set(0, -0.34, 0.04);
    rightShin.add(rBoot);
    const rSole = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.24), new THREE.MeshBasicMaterial({ color: 0x09090b }));
    rSole.position.set(0, -0.40, 0.04);
    rightShin.add(rSole);

    // Health Bar Billboard over head
    const hbCanvas = document.createElement('canvas');
    hbCanvas.width = 128;
    hbCanvas.height = 16;
    const hbCtx = hbCanvas.getContext('2d')!;
    hbCtx.fillStyle = '#dc2626';
    hbCtx.fillRect(0, 0, 128, 16);
    const hbTex = new THREE.CanvasTexture(hbCanvas);

    const healthBarMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.16),
      new THREE.MeshBasicMaterial({ map: hbTex, side: THREE.DoubleSide })
    );
    healthBarMesh.position.set(0, 1.95 * scaleVal, 0);
    banditGroup.add(healthBarMesh);

    // Web Cocoon Wrap Mesh
    const cocoonMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.9,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const cocoonMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.52 * scaleVal, 0.52 * scaleVal, 1.95 * scaleVal, 10), cocoonMat);
    cocoonMesh.position.set(0, 0.95 * scaleVal, 0);
    cocoonMesh.visible = false;
    banditGroup.add(cocoonMesh);

    this.group.add(banditGroup);

    const rig: BanditRig = {
      spine,
      head,
      leftUpperArm,
      leftForearm,
      rightUpperArm,
      rightForearm,
      weapon,
      leftThigh,
      leftShin,
      rightThigh,
      rightShin,
      walkPhase: Math.random() * Math.PI * 2,
    };

    const bandit: Bandit = {
      id: this.nextId++,
      mesh: banditGroup,
      position: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(),
      health: maxHealth,
      maxHealth,
      state: 'PATROL',
      webTimer: 0,
      attackTimer: 0,
      patrolAngle: Math.random() * Math.PI * 2,
      spawnPoint: new THREE.Vector3(x, y, z),
      healthBarMesh,
      cocoonMesh,
      archetype,
      rig,
      flinchTimer: 0,
      hitCooldown: 0,
      isAirborne: false,
      stumbleTimer: 0,
      roofBounds: bounds || { minX: x - 14, maxX: x + 14, minZ: z - 14, maxZ: z + 14 },
    };
    this.bandits.push(bandit);
    return bandit;
  }

  // --- TARGET ACQUISITION FOR WEB-STRIKE (RMB) ---
  public findBestTargetForWebStrike(
    origin: THREE.Vector3,
    lookDir: THREE.Vector3,
    maxDist = 38
  ): Bandit | null {
    let bestBandit: Bandit | null = null;
    let bestScore = -999;
    const normLook = lookDir.clone().normalize();

    for (const b of this.bandits) {
      if (b.state === 'KNOCKED_OUT') continue;
      const toBandit = b.position.clone().add(new THREE.Vector3(0, 1.2, 0)).sub(origin);
      const dist = toBandit.length();
      if (dist > maxDist || dist < 1.2) continue;

      toBandit.normalize();
      const dot = normLook.dot(toBandit);
      // Within forward 70-degree cone
      if (dot > 0.35) {
        const score = dot * 2.2 - dist / maxDist;
        if (score > bestScore) {
          bestScore = score;
          bestBandit = b;
        }
      }
    }
    return bestBandit;
  }

  // --- ATTACK 1: 4-HIT MARTIAL ARTS COMBO + AERIAL SLAM (LMB) ---
  public performMeleeCombo(
    playerPos: THREE.Vector3,
    playerAngle: number,
    comboIndex: number,
    isAirStrike = false
  ): { hitCount: number; defeatedCount: number } {
    let hitCount = 0;
    let defeatedCount = 0;

    // 4-step martial combo damage & comic words:
    // 0: Left Speed Jab (25 dmg, "BAM!")
    // 1: Right Spinning Elbow (35 dmg, "CRACK!")
    // 2: Flying Knee / Jump Kick (45 dmg, "WHAM!")
    // 3: Rising Uppercut Finisher (65 dmg, "KAPOW!")
    const damages = [25, 35, 45, 65];
    const hitWords = ['BAM!', 'CRACK!', 'WHAM!', 'KAPOW!'];
    const step = isAirStrike ? 99 : comboIndex % 4;
    const damage = isAirStrike ? 75 : damages[step];
    const word = isAirStrike ? 'SMASH!' : hitWords[step];
    const hitRadius = isAirStrike ? 5.2 : 3.8;

    for (const b of this.bandits) {
      if (b.state === 'KNOCKED_OUT') continue;
      const dist = playerPos.distanceTo(b.position);
      if (dist < hitRadius) {
        if (b.hitCooldown > 0) continue;
        b.hitCooldown = 0.22;

        hitCount++;
        // Anti-oneshot: cap per hit to at most 35% of maxHealth so minimum 3-4 hits are strictly required!
        const maxDamagePerHit = Math.floor(b.maxHealth * 0.35);
        const actualDamage = Math.min(damage, maxDamagePerHit);
        b.health -= actualDamage;

        b.flinchTimer = step === 3 ? 0.75 : 0.42;
        const rawKnock = b.position.clone().sub(playerPos);
        const horizDist = Math.max(0.1, Math.sqrt(rawKnock.x * rawKnock.x + rawKnock.z * rawKnock.z));
        const pushDir = new THREE.Vector3(rawKnock.x / horizDist, 0, rawKnock.z / horizDist);

        // Mass modifier: heavy bruisers are harder to push, nimble punks stagger easier
        const massMult = b.archetype === 'bruiser' ? 0.75 : b.archetype === 'punk' ? 1.15 : 1.0;

        if (isAirStrike) {
          // Seismic downward ground slam: pins enemy down to roof without launching into sky
          b.velocity.set(pushDir.x * 10 * massMult, -10.0, pushDir.z * 10 * massMult);
        } else if (step === 3) {
          // Strike 4: Hard knockdown - sweeps feet out, lifts only ~0.4m, heavy horizontal push
          b.velocity.set(pushDir.x * 12.5 * massMult, 3.2, pushDir.z * 12.5 * massMult);
        } else if (step === 2) {
          // Strike 3: Flying knee / roundhouse kick - horizontal stumble back, completely grounded
          b.velocity.set(pushDir.x * 9.5 * massMult, 0, pushDir.z * 9.5 * massMult);
        } else if (step === 1) {
          // Strike 2: Elbow rotational stagger - crisp horizontal push
          b.velocity.set(pushDir.x * 7.5 * massMult, 0, pushDir.z * 7.5 * massMult);
        } else {
          // Strike 1: Jab light stagger - fast horizontal nudge
          b.velocity.set(pushDir.x * 5.5 * massMult, 0, pushDir.z * 5.5 * massMult);
        }

        soundEngine.playPunch(isAirStrike ? 3 : (step % 3) + 1);
        this.spawnComicPopup(b.position, word);

        if (b.health <= 0) {
          b.health = 0;
          b.state = 'KNOCKED_OUT';
          defeatedCount++;
          soundEngine.playDefeat();
          b.mesh.rotation.x = Math.PI / 2;
          b.position.y = b.spawnPoint.y + 0.25;
          b.mesh.position.copy(b.position);
          b.healthBarMesh.visible = false;
        }
        this.updateBanditHealthBar(b);
      }
    }
    return { hitCount, defeatedCount };
  }

  // --- ATTACK 2: RAPID WEB PELLETS (F KEY) ---
  public shootWebPellet(origin: THREE.Vector3, direction: THREE.Vector3) {
    const geom = new THREE.SphereGeometry(0.24, 8, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x93c5fd,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(origin);
    this.group.add(mesh);

    this.pellets.push({
      mesh,
      position: origin.clone(),
      velocity: direction.clone().normalize().multiplyScalar(68), // High velocity
      life: 2.0,
    });

    soundEngine.playWebShoot();
    this.spawnComicPopup(origin.clone().add(direction.clone().multiplyScalar(1.5)), 'THWIP!');
  }

  // --- ATTACK 3: WEB COCOON NET (RMB / RIGHT CLICK) ---
  public shootWebCocoonNet(
    origin: THREE.Vector3,
    direction: THREE.Vector3
  ): { trappedCount: number } {
    let trappedCount = 0;
    const normDir = direction.clone().normalize();

    // Trap enemies in front 70-degree cone up to 18 meters
    for (const b of this.bandits) {
      if (b.state === 'KNOCKED_OUT') continue;
      const toBandit = b.position.clone().sub(origin);
      const dist = toBandit.length();

      if (dist < 18) {
        toBandit.normalize();
        const dot = normDir.dot(toBandit);

        // Within 70-degree cone
        if (dot > 0.45) {
          if (b.hitCooldown > 0) continue;
          b.hitCooldown = 0.25;

          trappedCount++;
          b.state = 'WEB_WRAPPED';
          b.webTimer = 5.0; // 5 full seconds immobilized
          b.cocoonMesh.visible = true;
          const maxDmg = Math.floor(b.maxHealth * 0.28);
          b.health -= Math.min(30, maxDmg);
          soundEngine.playWebWrap();
          this.spawnComicPopup(b.position, 'WEB-TRAP!');

          if (b.health <= 0) {
            b.health = 0;
            b.state = 'KNOCKED_OUT';
            soundEngine.playDefeat();
            b.mesh.rotation.x = Math.PI / 2;
          }
          this.updateBanditHealthBar(b);
        }
      }
    }
    soundEngine.playWebShoot();
    return { trappedCount };
  }

  /**
   * Find the best bandit target in front of the player for Web-Strike or aiming.
   */
  public findTargetEnemy(
    playerPos: THREE.Vector3,
    lookDir: THREE.Vector3,
    maxDist = 45,
    minDot = 0.55
  ): Bandit | null {
    let bestBandit: Bandit | null = null;
    let bestScore = -Infinity;
    const normLook = lookDir.clone().normalize();

    for (const b of this.bandits) {
      if (b.state === 'KNOCKED_OUT' || b.state === 'WEB_WRAPPED') continue;
      const toBandit = b.position.clone().sub(playerPos);
      const dist = toBandit.length();
      if (dist > maxDist || dist < 1.2) continue;

      toBandit.normalize();
      const dot = normLook.dot(toBandit);
      if (dot < minDot) continue;

      // Score prioritizing crosshair alignment and closeness
      const score = dot * 3.0 - (dist / maxDist);
      if (score > bestScore) {
        bestScore = score;
        bestBandit = b;
      }
    }
    return bestBandit;
  }

  public hitBanditAtPosition(
    targetPos: THREE.Vector3,
    radius = 4.5,
    damage = 50
  ): { hitCount: number; defeatedCount: number } {
    let hitCount = 0;
    let defeatedCount = 0;

    for (const b of this.bandits) {
      if (b.state === 'KNOCKED_OUT') continue;
      if (b.position.distanceTo(targetPos) <= radius) {
        if (b.hitCooldown > 0) continue;
        b.hitCooldown = 0.22;

        hitCount++;
        const maxDmg = Math.floor(b.maxHealth * 0.35);
        b.health -= Math.min(damage, maxDmg);
        const massMult = b.archetype === 'bruiser' ? 0.75 : 1.0;
        const rawKnock = b.position.clone().sub(targetPos);
        const horizDist = Math.max(0.1, Math.sqrt(rawKnock.x * rawKnock.x + rawKnock.z * rawKnock.z));
        b.velocity.set((rawKnock.x / horizDist) * 8.5 * massMult, 0.8, (rawKnock.z / horizDist) * 8.5 * massMult);
        soundEngine.playPunch(1);
        this.spawnComicPopup(b.position, 'KAPOW!');

        if (b.health <= 0) {
          b.health = 0;
          b.state = 'KNOCKED_OUT';
          defeatedCount++;
          soundEngine.playDefeat();
          b.mesh.rotation.x = Math.PI / 2;
          b.position.y = b.spawnPoint.y + 0.25;
          b.mesh.position.copy(b.position);
          b.healthBarMesh.visible = false;
        }
        this.updateBanditHealthBar(b);
      }
    }
    return { hitCount, defeatedCount };
  }

  private updateBanditHealthBar(b: Bandit) {
    const canvas = (b.healthBarMesh.material as THREE.MeshBasicMaterial).map?.image as
      | HTMLCanvasElement
      | undefined;
    const ctx = canvas?.getContext?.('2d');
    if (ctx) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 128, 16);
      ctx.fillStyle = b.health > 40 ? '#10b981' : '#ef4444';
      ctx.fillRect(0, 0, (b.health / b.maxHealth) * 128, 16);
      (b.healthBarMesh.material as THREE.MeshBasicMaterial).map!.needsUpdate = true;
    }
  }

  public spawnComicPopup(pos: THREE.Vector3, word: string) {
    const tex = this.popupCanvasTextures.get(word) || this.popupCanvasTextures.get('POW!')!;
    const geom = new THREE.PlaneGeometry(2.4, 1.2);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geom, mat);
    const group = new THREE.Group();
    group.add(mesh);
    group.position.copy(pos).add(new THREE.Vector3(0, 1.2, 0));
    this.group.add(group);

    this.popups.push({
      mesh: group,
      position: group.position,
      timer: 0.75,
      maxTime: 0.75,
    });
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    camera: THREE.Camera,
    onSpiderSense: (active: boolean) => void,
    onPlayerDamage: (dmg: number) => void
  ) {
    let dangerImminent = false;

    // UPDATE WEB PELLETS
    for (let i = this.pellets.length - 1; i >= 0; i--) {
      const p = this.pellets[i];
      p.life -= dt;
      p.position.addScaledVector(p.velocity, dt);
      p.mesh.position.copy(p.position);

      for (const b of this.bandits) {
        if (b.state === 'KNOCKED_OUT') continue;
        if (p.position.distanceTo(b.position.clone().add(new THREE.Vector3(0, 1, 0))) < 1.3) {
          if (b.hitCooldown > 0) continue;
          b.hitCooldown = 0.18;

          const maxDmg = Math.floor(b.maxHealth * 0.25);
          b.health -= Math.min(25, maxDmg);
          const pelDir = p.velocity.clone().normalize();
          b.velocity.set(pelDir.x * 6.5, 0, pelDir.z * 6.5); // Stagger backwards strictly horizontally
          soundEngine.playPunch(2);
          this.spawnComicPopup(b.position, 'CRACK!');

          if (b.health <= 0) {
            b.health = 0;
            b.state = 'KNOCKED_OUT';
            soundEngine.playDefeat();
            b.mesh.rotation.x = Math.PI / 2;
            b.position.y = b.spawnPoint.y + 0.25;
            b.mesh.position.copy(b.position);
            b.healthBarMesh.visible = false;
          }
          this.updateBanditHealthBar(b);
          p.life = 0;
          break;
        }
      }

      if (p.life <= 0) {
        this.group.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.pellets.splice(i, 1);
      }
    }

    // UPDATE BANDITS AI & ARTICULATED SKELETON
    for (const b of this.bandits) {
      if (b.state === 'KNOCKED_OUT') continue;
      b.healthBarMesh.quaternion.copy(camera.quaternion);

      if (b.hitCooldown > 0) {
        b.hitCooldown -= dt;
      }

      const r = b.rig;

      if (b.state === 'WEB_WRAPPED') {
        b.webTimer -= dt;
        b.mesh.rotation.y += Math.sin(b.webTimer * 20) * 0.04;
        if (r) {
          // Shivering struggles inside the sticky web cocoon
          r.leftUpperArm.rotation.x = THREE.MathUtils.damp(r.leftUpperArm.rotation.x, 0.2, 10, dt);
          r.rightUpperArm.rotation.x = THREE.MathUtils.damp(r.rightUpperArm.rotation.x, 0.2, 10, dt);
          r.leftForearm.rotation.x = THREE.MathUtils.damp(r.leftForearm.rotation.x, -1.4, 10, dt);
          r.rightForearm.rotation.x = THREE.MathUtils.damp(r.rightForearm.rotation.x, -1.4, 10, dt);
        }
        if (b.webTimer <= 0) {
          b.state = 'CHASE';
          b.cocoonMesh.visible = false;
        }
        continue;
      }

      // BANDIT FLINCH & STAGGER REACTION FROM PLAYER PUNCHES
      if (b.flinchTimer > 0) {
        b.flinchTimer -= dt;
        if (r) {
          r.head.rotation.x = THREE.MathUtils.damp(r.head.rotation.x, -0.65, 25, dt);
          r.spine.rotation.x = THREE.MathUtils.damp(r.spine.rotation.x, -0.45, 25, dt);
          r.leftUpperArm.rotation.x = THREE.MathUtils.damp(r.leftUpperArm.rotation.x, -1.3, 25, dt);
          r.rightUpperArm.rotation.x = THREE.MathUtils.damp(r.rightUpperArm.rotation.x, -1.3, 25, dt);
          r.leftForearm.rotation.x = THREE.MathUtils.damp(r.leftForearm.rotation.x, -0.9, 25, dt);
          r.rightForearm.rotation.x = THREE.MathUtils.damp(r.rightForearm.rotation.x, -0.9, 25, dt);
        }
      }

      const distToPlayer = b.position.distanceTo(playerPos);
      if (distToPlayer < 24) {
        const toPlayer = playerPos.clone().sub(b.position);
        toPlayer.y = 0;
        const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
        b.mesh.rotation.y = targetAngle;

        if (distToPlayer > 2.2) {
          b.state = 'CHASE';
          toPlayer.normalize();
          b.position.addScaledVector(toPlayer, 5.8 * dt);

          if (r) {
            r.walkPhase = (r.walkPhase + dt * 11) % (Math.PI * 2);
            const swing = Math.sin(r.walkPhase) * 0.7;
            r.rightThigh.rotation.x = swing;
            r.leftThigh.rotation.x = -swing;
            r.rightShin.rotation.x = Math.max(0, -swing);
            r.leftShin.rotation.x = Math.max(0, swing);
            r.rightUpperArm.rotation.x = -swing * 0.75;
            r.leftUpperArm.rotation.x = swing * 0.75;
            r.spine.rotation.x = 0.22; // Aggressive forward charge!
          }
        } else {
          b.state = 'ATTACK_PREP';
          b.attackTimer += dt;

          if (r) {
            // Weapon windup pose: arm raised high ready to smash
            const windup = Math.min(1.0, b.attackTimer / 0.8);
            r.rightUpperArm.rotation.x = THREE.MathUtils.damp(r.rightUpperArm.rotation.x, -1.9, 12, dt);
            r.rightForearm.rotation.x = THREE.MathUtils.damp(r.rightForearm.rotation.x, -0.6, 12, dt);
            r.leftUpperArm.rotation.x = THREE.MathUtils.damp(r.leftUpperArm.rotation.x, 0.4, 12, dt);
            r.spine.rotation.x = THREE.MathUtils.damp(r.spine.rotation.x, -0.25, 12, dt);
          }

          if (b.attackTimer > 0.4 && b.attackTimer < 1.1) {
            dangerImminent = true;
          }
          if (b.attackTimer >= 1.1) {
            b.attackTimer = 0;
            onPlayerDamage(16);
            soundEngine.playPunch(0);
            this.spawnComicPopup(playerPos, 'WHAM!');
            // Attack follow-through snap
            if (r) {
              r.rightUpperArm.rotation.x = 0.9;
              r.rightForearm.rotation.x = -0.2;
            }
          }
        }
      } else {
        b.state = 'PATROL';
        b.patrolAngle += 0.5 * dt;
        b.position.x = b.spawnPoint.x + Math.cos(b.patrolAngle) * 5;
        b.position.z = b.spawnPoint.z + Math.sin(b.patrolAngle) * 5;
        b.mesh.rotation.y = b.patrolAngle + Math.PI / 2;

        if (r) {
          r.walkPhase = (r.walkPhase + dt * 4.5) % (Math.PI * 2);
          const swing = Math.sin(r.walkPhase) * 0.4;
          r.rightThigh.rotation.x = swing;
          r.leftThigh.rotation.x = -swing;
          r.rightUpperArm.rotation.x = -swing * 0.5;
          r.leftUpperArm.rotation.x = swing * 0.5;
          r.spine.rotation.x = 0.05;
        }
      }

      // 1. Airborne check & Real Gravity (Pull bandits down to roof!)
      if (b.position.y > b.spawnPoint.y + 0.05 || b.velocity.y > 0.3) {
        b.isAirborne = true;
        b.velocity.y += -28.0 * dt; // Realistic downward gravity
        if (r) {
          r.spine.rotation.x = THREE.MathUtils.damp(r.spine.rotation.x, -0.4, 15, dt);
          r.leftUpperArm.rotation.x = THREE.MathUtils.damp(r.leftUpperArm.rotation.x, -2.1, 15, dt);
          r.rightUpperArm.rotation.x = THREE.MathUtils.damp(r.rightUpperArm.rotation.x, -2.1, 15, dt);
          r.leftThigh.rotation.x = THREE.MathUtils.damp(r.leftThigh.rotation.x, -0.8, 15, dt);
          r.rightThigh.rotation.x = THREE.MathUtils.damp(r.rightThigh.rotation.x, 0.4, 15, dt);
        }
      }

      // 2. Integrate velocity & apply air/ground drag
      b.position.addScaledVector(b.velocity, dt);
      const friction = b.isAirborne ? 0.94 : 0.80;
      b.velocity.x *= friction;
      b.velocity.z *= friction;

      // 3. Rooftop floor collision & touchdown impact
      if (b.position.y <= b.spawnPoint.y) {
        if (b.isAirborne) {
          b.isAirborne = false;
          b.stumbleTimer = 0.32; // Brief recovery stumble upon landing
          soundEngine.playPunch(0);
        }
        b.position.y = b.spawnPoint.y;
        b.velocity.y = 0;
      }

      // Stumble recovery animation upon landing
      if (b.stumbleTimer > 0) {
        b.stumbleTimer -= dt;
        if (r) {
          r.spine.rotation.x = THREE.MathUtils.damp(r.spine.rotation.x, 0.35, 18, dt);
          r.rightShin.rotation.x = THREE.MathUtils.damp(r.rightShin.rotation.x, 0.75, 18, dt);
          r.leftShin.rotation.x = THREE.MathUtils.damp(r.leftShin.rotation.x, 0.75, 18, dt);
        }
      }

      // 4. Hard rooftop perimeter boundary: keeps bandit strictly on the rooftop (rebounds off parapet)
      if (b.roofBounds) {
        const { minX, maxX, minZ, maxZ } = b.roofBounds;
        if (b.position.x < minX) {
          b.position.x = minX;
          if (b.velocity.x < 0) {
            b.velocity.x = -b.velocity.x * 0.4;
            this.spawnComicPopup(b.position, 'THUD!');
          }
        } else if (b.position.x > maxX) {
          b.position.x = maxX;
          if (b.velocity.x > 0) {
            b.velocity.x = -b.velocity.x * 0.4;
            this.spawnComicPopup(b.position, 'THUD!');
          }
        }
        if (b.position.z < minZ) {
          b.position.z = minZ;
          if (b.velocity.z < 0) {
            b.velocity.z = -b.velocity.z * 0.4;
            this.spawnComicPopup(b.position, 'THUD!');
          }
        } else if (b.position.z > maxZ) {
          b.position.z = maxZ;
          if (b.velocity.z > 0) {
            b.velocity.z = -b.velocity.z * 0.4;
            this.spawnComicPopup(b.position, 'THUD!');
          }
        }
      }

      b.mesh.position.copy(b.position);
    }

    onSpiderSense(dangerImminent);
    if (dangerImminent && Math.random() < 0.08) {
      soundEngine.playSpiderSense();
    }

    // UPDATE FLOATING POPUPS
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.timer -= dt;
      pop.position.y += 1.4 * dt;
      pop.mesh.quaternion.copy(camera.quaternion);
      const progress = pop.timer / pop.maxTime;
      const scale = Math.sin(progress * Math.PI) * 1.3;
      pop.mesh.scale.set(scale, scale, scale);

      if (pop.timer <= 0) {
        this.group.remove(pop.mesh);
        this.popups.splice(i, 1);
      }
    }
  }
}
