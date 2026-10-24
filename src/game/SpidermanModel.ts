/**
 * SpidermanModel: Advanced anatomical skeletal rig for Spider-Man.
 * Features:
 * - Natural human joint kinematics (forearms flex forward, knees bend backward).
 * - Muscular chest pectorals, deltoids, and wrist web-shooter gauntlets with iconic 🤟 hand signs.
 * - Dynamic swing rigging supporting alternating left and right arm web grabs.
 * - Superhero 3-point landing crouch pose.
 * - Dynamic parkour banking and acrobatic air postures.
 * - Procedural suits (Classic, Symbiote, Miles Morales).
 */

import * as THREE from 'three';
import { soundEngine } from './SoundEngine';

export type SuitType = 'classic' | 'symbiote' | 'miles';

export interface SpidermanRig {
  group: THREE.Group;
  hips: THREE.Group;
  spineLumbar: THREE.Group;
  spineThorax: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  // Arms
  leftClavicle: THREE.Group;
  leftUpperArm: THREE.Group;
  leftForearm: THREE.Group;
  leftHand: THREE.Group;
  rightClavicle: THREE.Group;
  rightUpperArm: THREE.Group;
  rightForearm: THREE.Group;
  rightHand: THREE.Group;
  // Legs
  leftThigh: THREE.Group;
  leftShin: THREE.Group;
  leftFoot: THREE.Group;
  rightThigh: THREE.Group;
  rightShin: THREE.Group;
  rightFoot: THREE.Group;
  // Web Emitters
  rightWristWebNode: THREE.Object3D;
  leftWristWebNode: THREE.Object3D;
  spiderSenseAlertMesh: THREE.Group;
  redMeshes: THREE.Mesh[];
  blueMeshes: THREE.Mesh[];
  eyeFrameMeshes: THREE.Mesh[];
  eyeLensMeshes: THREE.Mesh[];
  backDecalMesh: THREE.Mesh;
}

export class SpidermanCharacter {
  public mesh: THREE.Group;
  public rig: SpidermanRig;
  public currentSuit: SuitType = 'classic';
  private animTime = 0;

  // Procedural Leg Locomotion & Footsteps
  private stridePhase = 0;
  private wallStridePhase = 0;
  private prevFootstepSide: 'left' | 'right' | null = null;

  // Attack & Dodge Animation timers
  private comboIndex = 0;
  private meleeTimer = 0;
  private webPelletTimer = 0;
  private webCocoonTimer = 0;
  private dodgeTimer = 0;
  private dodgeDuration = 0.35;
  private dodgeDirection: 'left' | 'right' | 'back' | 'forward' = 'left';
  private suitTextures: Record<SuitType, THREE.CanvasTexture>;

  constructor() {
    this.suitTextures = {
      classic: this.createClassicSuitTexture(),
      symbiote: this.createSymbioteSuitTexture(),
      miles: this.createMilesSuitTexture(),
    };
    this.mesh = new THREE.Group();
    this.rig = this.buildAnatomicalCharacterMesh();
    this.mesh.add(this.rig.group);
    this.setSuit('classic');
  }

  private createClassicSuitTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Rich Red Suit Base
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, 512, 512);

    // Deep Athletic Navy Blue Side Panels
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(0, 0, 142, 512);
    ctx.fillRect(370, 0, 142, 512);

    // High-tech hexagonal woven micro-texture (Marvel's Spider-Man fabric feel)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.09)';
    for (let y = 0; y < 512; y += 6) {
      for (let x = 0; x < 512; x += 6) {
        if ((x + y) % 12 === 0) {
          ctx.fillRect(x, y, 2.5, 2.5);
        }
      }
    }

    // Embossed Webbing Pattern (Drop Shadow + Crisp Highlight Line)
    const drawWebArc = (y: number) => {
      // Dark under-shadow
      ctx.strokeStyle = '#050811';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(142, y + 1);
      ctx.quadraticCurveTo(256, y + 17, 370, y + 1);
      ctx.stroke();

      // Sharp top web-line
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(142, y);
      ctx.quadraticCurveTo(256, y + 16, 370, y);
      ctx.stroke();
    };

    for (let y = 16; y < 512; y += 36) {
      drawWebArc(y);
    }

    // Radial longitudinal web lines
    for (let x = 158; x <= 354; x += 28) {
      ctx.strokeStyle = '#050811';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (x - 256) * 0.28, 512);
      ctx.stroke();

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x - 0.5, 0);
      ctx.lineTo(x - 0.5 + (x - 256) * 0.28, 512);
      ctx.stroke();
    }

    // Front Chest Spider Logo (Centered at x=256, mapped to chest)
    this.drawSpiderLogo(ctx, 256, 256, '#0f172a', 1.15);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createSymbioteSuitTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Liquid Alien Bio-suit Gradient with deep purple/navy sheen
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#020617');
    grad.addColorStop(0.35, '#0f172a');
    grad.addColorStop(0.7, '#1e1b4b');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Organic biomechanical tendon fibers
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, 0);
      ctx.bezierCurveTo(
        Math.random() * 512,
        180,
        Math.random() * 512,
        340,
        Math.random() * 512,
        512
      );
      ctx.stroke();
    }

    // Brilliant White Symbiote Spider Logo
    this.drawSpiderLogo(ctx, 256, 256, '#ffffff', 1.45);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createMilesSuitTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Stealth Matte Black
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 512, 512);

    // Hex Carbon Grid
    ctx.fillStyle = '#1e293b';
    for (let y = 0; y < 512; y += 8) {
      for (let x = 0; x < 512; x += 8) {
        if ((x + y) % 16 === 0) {
          ctx.fillRect(x, y, 3.5, 3.5);
        }
      }
    }

    // Bio-electric Crimson Webbing
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3.5;
    for (let y = 24; y < 512; y += 42) {
      ctx.beginPath();
      ctx.moveTo(90, y);
      ctx.quadraticCurveTo(256, y + 22, 422, y);
      ctx.stroke();
    }

    for (let x = 110; x <= 402; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (x - 256) * 0.32, 512);
      ctx.stroke();
    }

    // Graffiti-styled Miles Morales Red Spider Insignia
    this.drawSpiderLogo(ctx, 256, 256, '#ef4444', 1.25);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createBackLogoTexture(color = '#b91c1c'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 256);
    this.drawSpiderLogo(ctx, 128, 128, color, 1.4);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private drawSpiderLogo(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    color: string,
    scale = 1.0
  ) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;

    // Body abdomen and thorax
    ctx.beginPath();
    ctx.ellipse(0, 6, 14, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, -17, 9, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 8 arachnid legs
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = color;
    const legOffsets = [
      [[-28, -25], [-52, -45], [-70, -15]],
      [[28, -25], [52, -45], [70, -15]],
      [[-28, -10], [-58, -25], [-76, 0]],
      [[28, -10], [58, -25], [76, 0]],
      [[-25, 10], [-56, 32], [-64, 64]],
      [[25, 10], [56, 32], [64, 64]],
      [[-22, 25], [-46, 54], [-52, 80]],
      [[22, 25], [46, 54], [52, 80]],
    ];

    for (const leg of legOffsets) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(leg[0][0], leg[0][1]);
      ctx.lineTo(leg[1][0], leg[1][1]);
      ctx.lineTo(leg[2][0], leg[2][1]);
      ctx.stroke();
    }

    ctx.restore();
  }

  public setSuit(suit: SuitType) {
    this.currentSuit = suit;
    const tex = this.suitTextures[suit];
    let primaryColor = 0xd62828;
    let secondaryColor = 0x1d4ed8;
    let backLogoColor = 0xb91c1c;
    let roughness = 0.35;
    let metalness = 0.1;

    if (suit === 'symbiote') {
      primaryColor = 0x0a0f1d;
      secondaryColor = 0x050811;
      backLogoColor = 0xffffff;
      roughness = 0.15;
      metalness = 0.45;
    } else if (suit === 'miles') {
      primaryColor = 0x090d16;
      secondaryColor = 0x0f172a;
      backLogoColor = 0xef4444;
      roughness = 0.45;
      metalness = 0.15;
    }

    this.rig.redMeshes.forEach((m) => {
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.map = tex;
      mat.color.setHex(primaryColor);
      mat.roughness = roughness;
      mat.metalness = metalness;
      mat.needsUpdate = true;
    });

    this.rig.blueMeshes.forEach((m) => {
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.color.setHex(secondaryColor);
      mat.roughness = roughness;
      mat.metalness = metalness;
      mat.needsUpdate = true;
    });

    (this.rig.backDecalMesh.material as THREE.MeshBasicMaterial).map =
      this.createBackLogoTexture(suit === 'symbiote' ? '#ffffff' : suit === 'miles' ? '#ef4444' : '#b91c1c');
    (this.rig.backDecalMesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
  }

  /**
   * Anatomical bone construction:
   * Rigged with athletic superhero musculature, pectorals, deltoid pads,
   * wrist web-shooters, and iconic 🤟 hand signs.
   */
  private buildAnatomicalCharacterMesh(): SpidermanRig {
    const redMat = new THREE.MeshStandardMaterial({
      color: 0xd62828,
      roughness: 0.35,
      metalness: 0.1,
      map: this.suitTextures.classic,
    });
    const blueMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.4,
      metalness: 0.15,
    });
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.2,
    });
    const eyeFrameMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.35,
      metalness: 0.85,
    });
    const eyeWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.1,
      metalness: 0.45,
    });

    const redMeshes: THREE.Mesh[] = [];
    const blueMeshes: THREE.Mesh[] = [];
    const eyeFrameMeshes: THREE.Mesh[] = [];
    const eyeLensMeshes: THREE.Mesh[] = [];

    const group = new THREE.Group();

    // PELVIS / HIPS
    const hips = new THREE.Group();
    hips.position.y = 0.95;
    group.add(hips);

    const pelvisMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.16, 0.22, 10),
      blueMat
    );
    pelvisMesh.rotation.y = Math.PI;
    pelvisMesh.castShadow = true;
    hips.add(pelvisMesh);
    blueMeshes.push(pelvisMesh);

    // SPINE: LUMBAR SEGMENT (Lower Back & Athletic Obliques)
    const spineLumbar = new THREE.Group();
    spineLumbar.position.y = 0.11;
    hips.add(spineLumbar);

    const abdomenMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.17, 0.22, 10),
      redMat
    );
    abdomenMesh.position.y = 0.11;
    abdomenMesh.rotation.y = Math.PI;
    abdomenMesh.castShadow = true;
    spineLumbar.add(abdomenMesh);
    redMeshes.push(abdomenMesh);

    // SPINE: THORAX SEGMENT (Chest & Broad Shoulders)
    const spineThorax = new THREE.Group();
    spineThorax.position.y = 0.22;
    spineLumbar.add(spineThorax);

    const chestMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.2, 0.3, 12),
      redMat
    );
    chestMesh.position.y = 0.15;
    chestMesh.rotation.y = Math.PI; // Aligns front spider logo to +Z
    chestMesh.castShadow = true;
    spineThorax.add(chestMesh);
    redMeshes.push(chestMesh);

    // Muscular Pectoral Plate Accents (Left & Right Pectorals)
    const pecGeom = new THREE.BoxGeometry(0.11, 0.12, 0.05);
    const leftPec = new THREE.Mesh(pecGeom, redMat);
    leftPec.position.set(-0.065, 0.17, 0.14);
    leftPec.rotation.y = -0.15;
    spineThorax.add(leftPec);
    redMeshes.push(leftPec);

    const rightPec = new THREE.Mesh(pecGeom, redMat);
    rightPec.position.set(0.065, 0.17, 0.14);
    rightPec.rotation.y = 0.15;
    spineThorax.add(rightPec);
    redMeshes.push(rightPec);

    // Back spider logo decal (Sits strictly at the rear -Z, facing backward)
    const backDecalMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.24),
      new THREE.MeshBasicMaterial({
        map: this.createBackLogoTexture('#b91c1c'),
        transparent: true,
        opacity: 0.96,
      })
    );
    backDecalMesh.rotation.y = Math.PI;
    backDecalMesh.position.set(0, 0.15, -0.14);
    spineThorax.add(backDecalMesh);

    // NECK & HEAD (With athletic trapezius slope and sculpted superhero jawline)
    const neck = new THREE.Group();
    neck.position.y = 0.3;
    spineThorax.add(neck);

    // Anatomical Trapezius muscle slope connecting neck down into broad shoulders
    const trapezius = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.17, 0.14, 10),
      redMat
    );
    trapezius.position.y = 0.04;
    neck.add(trapezius);
    redMeshes.push(trapezius);

    const neckMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.082, 0.088, 0.12, 8),
      redMat
    );
    neckMesh.position.y = 0.08;
    neck.add(neckMesh);
    redMeshes.push(neckMesh);

    const head = new THREE.Group();
    head.position.y = 0.14;
    neck.add(head);

    // Cranium
    const headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.165, 16, 14),
      redMat
    );
    headMesh.scale.set(0.9, 1.12, 1.05);
    headMesh.position.y = 0.08;
    headMesh.castShadow = true;
    head.add(headMesh);
    redMeshes.push(headMesh);

    // Sculpted superhero jawline and chin contour
    const jawMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.14, 8),
      redMat
    );
    jawMesh.rotation.x = Math.PI;
    jawMesh.position.set(0, 0.01, 0.04);
    head.add(jawMesh);
    redMeshes.push(jawMesh);

    // Spider-Sense Alert Crown
    const spiderSenseAlertMesh = new THREE.Group();
    spiderSenseAlertMesh.visible = false;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI - Math.PI / 2;
      const zap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.03, 0.28, 4),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      zap.position.set(Math.cos(angle) * 0.32, 0.24 + Math.sin(angle) * 0.2, 0);
      zap.rotation.z = angle - Math.PI / 2;
      spiderSenseAlertMesh.add(zap);
    }
    head.add(spiderSenseAlertMesh);

    // Comic Spider Eyes (Facing forward on +Z with 3D raised frames)
    const makeEye = (isRight: boolean) => {
      const eyeGroup = new THREE.Group();
      const sign = isRight ? 1 : -1;

      const frameGeom = new THREE.RingGeometry(0.02, 0.082, 8, 1, Math.PI / 4, Math.PI * 1.5);
      const frame = new THREE.Mesh(frameGeom, eyeFrameMat);
      frame.scale.set(1.42, 0.92, 1);
      frame.rotation.z = sign * 0.35;
      eyeGroup.add(frame);
      eyeFrameMeshes.push(frame);

      const lensGeom = new THREE.CircleGeometry(0.065, 8);
      const lens = new THREE.Mesh(lensGeom, eyeWhiteMat);
      lens.scale.set(1.22, 0.76, 1);
      lens.rotation.z = sign * 0.35;
      lens.position.z = 0.006;
      eyeGroup.add(lens);
      eyeLensMeshes.push(lens);

      eyeGroup.position.set(sign * 0.085, 0.1, 0.16);
      eyeGroup.rotation.y = sign * 0.25;
      return eyeGroup;
    };

    head.add(makeEye(false));
    head.add(makeEye(true));

    // --- ARMS RIGGING (With Deltoids, Olecranon Elbow Caps, Gauntlets & 🤟 Web-Shooter Hands) ---
    const buildArm = (isRight: boolean) => {
      const sign = isRight ? -1 : 1;

      // Clavicle
      const clavicle = new THREE.Group();
      clavicle.position.set(sign * 0.14, 0.24, 0);
      spineThorax.add(clavicle);

      // Deltoid Shoulder Pad (Sculpted athletic superhero musculature)
      const shoulderMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.092, 10, 10),
        redMat
      );
      shoulderMesh.position.set(sign * 0.14, 0, 0);
      shoulderMesh.scale.set(1.15, 0.95, 1.18);
      clavicle.add(shoulderMesh);
      redMeshes.push(shoulderMesh);

      // Upper Arm (Humerus with bicep and tricep volume)
      const upperArm = new THREE.Group();
      upperArm.position.set(sign * 0.14, 0, 0);
      clavicle.add(upperArm);

      const bicepMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.055, 0.26, 8),
        redMat
      );
      bicepMesh.position.y = -0.13;
      bicepMesh.castShadow = true;
      upperArm.add(bicepMesh);
      redMeshes.push(bicepMesh);

      // Anatomical Olecranon Elbow Joint Cap (sharp athletic joint articulation at rear)
      const elbowCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 8, 8),
        redMat
      );
      elbowCap.scale.set(0.9, 0.9, 1.2);
      elbowCap.position.set(0, -0.26, -0.025);
      upperArm.add(elbowCap);
      redMeshes.push(elbowCap);

      // Forearm (Hinges at elbow: y = -0.26 with extensor muscle taper)
      const forearm = new THREE.Group();
      forearm.position.set(0, -0.26, 0);
      upperArm.add(forearm);

      const forearmMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.056, 0.046, 0.26, 8),
        redMat
      );
      forearmMesh.position.y = -0.13;
      forearmMesh.castShadow = true;
      forearm.add(forearmMesh);
      redMeshes.push(forearmMesh);

      // Forearm extensor bulge
      const forearmBulge = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 6, 6),
        redMat
      );
      forearmBulge.position.set(sign * 0.02, -0.08, -0.01);
      forearm.add(forearmBulge);
      redMeshes.push(forearmBulge);

      // Wrist Web Shooter Metallic Gauntlet
      const gauntletMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.052, 0.05, 0.06, 8),
        metalMat
      );
      gauntletMesh.position.y = -0.24;
      forearm.add(gauntletMesh);

      // Wrist & Hand
      const hand = new THREE.Group();
      hand.position.set(0, -0.26, 0);
      forearm.add(hand);

      // Palm base
      const palmMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.065, 0.07, 0.04),
        redMat
      );
      palmMesh.position.y = -0.035;
      hand.add(palmMesh);
      redMeshes.push(palmMesh);

      // Thumb
      const thumb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.01, 0.05, 6),
        redMat
      );
      thumb.position.set(sign * 0.035, -0.04, 0.015);
      thumb.rotation.z = sign * 0.55;
      hand.add(thumb);
      redMeshes.push(thumb);

      // Iconic 🤟 Fingers: Extended Index & Pinky, Curled Middle & Ring
      const fingerMat = redMat;
      const indexFinger = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.01, 0.06, 6),
        fingerMat
      );
      indexFinger.position.set(-0.022 * sign, -0.09, 0.01);
      hand.add(indexFinger);
      redMeshes.push(indexFinger);

      const pinkyFinger = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.008, 0.055, 6),
        fingerMat
      );
      pinkyFinger.position.set(0.022 * sign, -0.088, 0.01);
      hand.add(pinkyFinger);
      redMeshes.push(pinkyFinger);

      // Curled Middle & Ring Knuckles
      const curledKnuckles = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.028, 0.035),
        fingerMat
      );
      curledKnuckles.position.set(0, -0.06, 0.015);
      hand.add(curledKnuckles);
      redMeshes.push(curledKnuckles);

      // Web Shooter Nozzle Node on inside wrist
      const wristWebNode = new THREE.Object3D();
      wristWebNode.position.set(0, -0.05, 0.04);
      hand.add(wristWebNode);

      return { clavicle, upperArm, forearm, hand, wristWebNode };
    };

    const leftArmData = buildArm(false);
    const rightArmData = buildArm(true);

    // --- LEGS RIGGING (With Sculpted Patella Kneecap, Calf Muscles & Contoured Running Boots) ---
    const buildLeg = (isRight: boolean) => {
      const sign = isRight ? -1 : 1;

      const thigh = new THREE.Group();
      thigh.position.set(sign * 0.12, -0.1, 0);
      hips.add(thigh);

      // Upper Thigh (Muscular quadriceps taper)
      const thighMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.088, 0.068, 0.38, 8),
        blueMat
      );
      thighMesh.position.y = -0.19;
      thighMesh.castShadow = true;
      thigh.add(thighMesh);
      blueMeshes.push(thighMesh);

      // Sculpted Patella Knee Cap (Faces FORWARD on +Z with quad tendon crest)
      const kneeCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.062, 8, 8),
        redMat
      );
      kneeCap.scale.set(0.95, 1.2, 0.95);
      kneeCap.position.set(0, -0.38, 0.035);
      thigh.add(kneeCap);
      redMeshes.push(kneeCap);

      // Shin (Hinges at knee: y = -0.38)
      const shin = new THREE.Group();
      shin.position.set(0, -0.38, 0);
      thigh.add(shin);

      const shinMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.052, 0.38, 8),
        redMat
      );
      shinMesh.position.y = -0.19;
      shinMesh.castShadow = true;
      shin.add(shinMesh);
      redMeshes.push(shinMesh);

      // Muscular Gastrocnemius Calf bulge at rear of shin
      const calfBulge = new THREE.Mesh(
        new THREE.SphereGeometry(0.066, 8, 8),
        redMat
      );
      calfBulge.scale.set(1.0, 1.35, 1.1);
      calfBulge.position.set(0, -0.15, -0.035);
      shin.add(calfBulge);
      redMeshes.push(calfBulge);

      // Contoured Athletic Superhero Running Boot (arched instep, heel cup & beveled toe box)
      const foot = new THREE.Group();
      foot.position.set(0, -0.38, 0.02);
      shin.add(foot);

      // Boot Arch & Instep
      const footInstep = new THREE.Mesh(
        new THREE.BoxGeometry(0.085, 0.062, 0.14),
        redMat
      );
      footInstep.position.set(0, -0.031, 0.02);
      foot.add(footInstep);
      redMeshes.push(footInstep);

      // Rounded Heel Cup
      const heelCup = new THREE.Mesh(
        new THREE.SphereGeometry(0.044, 8, 8),
        redMat
      );
      heelCup.position.set(0, -0.025, -0.06);
      foot.add(heelCup);
      redMeshes.push(heelCup);

      // Beveled Aerodynamic Toe Box
      const toeBox = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.042, 0.082, 10, 1, false, 0, Math.PI),
        redMat
      );
      toeBox.rotation.z = Math.PI / 2;
      toeBox.position.set(0, -0.035, 0.09);
      foot.add(toeBox);
      redMeshes.push(toeBox);

      // Dark athletic rubber boot sole tread
      const soleTread = new THREE.Mesh(
        new THREE.BoxGeometry(0.088, 0.015, 0.22),
        blueMat
      );
      soleTread.position.set(0, -0.062, 0.03);
      foot.add(soleTread);
      blueMeshes.push(soleTread);

      return { thigh, shin, foot };
    };

    const leftLegData = buildLeg(false);
    const rightLegData = buildLeg(true);

    return {
      group,
      hips,
      spineLumbar,
      spineThorax,
      neck,
      head,
      leftClavicle: leftArmData.clavicle,
      leftUpperArm: leftArmData.upperArm,
      leftForearm: leftArmData.forearm,
      leftHand: leftArmData.hand,
      rightClavicle: rightArmData.clavicle,
      rightUpperArm: rightArmData.upperArm,
      rightForearm: rightArmData.forearm,
      rightHand: rightArmData.hand,
      leftThigh: leftLegData.thigh,
      leftShin: leftLegData.shin,
      leftFoot: leftLegData.foot,
      rightThigh: rightLegData.thigh,
      rightShin: rightLegData.shin,
      rightFoot: rightLegData.foot,
      rightWristWebNode: rightArmData.wristWebNode,
      leftWristWebNode: leftArmData.wristWebNode,
      spiderSenseAlertMesh,
      redMeshes,
      blueMeshes,
      eyeFrameMeshes,
      eyeLensMeshes,
      backDecalMesh,
    };
  }

  // --- ATTACK TRIGGER METHODS ---
  public triggerMeleeCombo(comboStep: number) {
    this.comboIndex = comboStep === 99 ? 99 : comboStep % 6;
    this.meleeTimer = 0.38;
  }

  public triggerAerialSlam() {
    this.comboIndex = 99; // Special aerial slam
    this.meleeTimer = 0.42;
  }

  public triggerWebPellet() {
    this.webPelletTimer = 0.22;
  }

  public triggerWebCocoonBlast() {
    this.webCocoonTimer = 0.45;
  }

  public triggerDodge(direction: 'left' | 'right' | 'back' | 'forward' = 'left') {
    this.dodgeDuration = 0.35;
    this.dodgeTimer = 0.35;
    this.dodgeDirection = direction;
  }

  public setSpiderSense(active: boolean) {
    this.rig.spiderSenseAlertMesh.visible = active;
  }

  /**
   * Main animation update:
   * Supports dynamic alternating swing arms (left/right anchor),
   * superhero 3-point landing crouch, deep predatory spider squat, parkour banking,
   * Insomniac combat stance, acrobatic dodges, and 6-hit martial arts combo chain.
   */
  public update(
    dt: number,
    state: 'GROUND' | 'AIR' | 'SWINGING' | 'WALL_RUN' | 'WALL_STICK' | 'ZIP_TO_WALL' | 'WEB_STRIKE',
    speed: number,
    isSprinting: boolean,
    isSwinging: boolean,
    isWallRunning: boolean,
    activeAnchorSide: 'left' | 'right' = 'right',
    bankAngle = 0,
    superheroLandingTimer = 0,
    isDiving = false,
    isAirTricking = false,
    isCrouching = false,
    isInCombat = false,
    isAcrobaticLeap = false
  ) {
    this.animTime += dt;
    if (this.meleeTimer > 0) this.meleeTimer -= dt;
    if (this.webPelletTimer > 0) this.webPelletTimer -= dt;
    if (this.webCocoonTimer > 0) this.webCocoonTimer -= dt;
    if (this.dodgeTimer > 0) this.dodgeTimer -= dt;

    const r = this.rig;
    const damp = (curr: number, target: number, speedVal = 14) =>
      THREE.MathUtils.damp(curr, target, speedVal, dt);

    if (r.spiderSenseAlertMesh.visible) {
      r.spiderSenseAlertMesh.rotation.z = Math.sin(this.animTime * 30) * 0.15;
    }

    // Apply dynamic parkour torso banking into turns
    r.spineThorax.rotation.z = damp(r.spineThorax.rotation.z, bankAngle, 10);

    // --- SUPERHERO 3-POINT LANDING POSE ---
    if (superheroLandingTimer > 0) {
      r.hips.position.y = damp(r.hips.position.y, 0.48, 30);
      r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, 0.65, 30);
      r.spineThorax.rotation.x = damp(r.spineThorax.rotation.x, 0.3, 30);
      r.head.rotation.x = damp(r.head.rotation.x, -0.65, 30); // Looks up ahead fiercely!

      // Left leg tucked under body
      r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, -1.35, 30);
      r.leftShin.rotation.x = damp(r.leftShin.rotation.x, 1.45, 30);

      // Right leg swept backward
      r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, 0.85, 30);
      r.rightThigh.rotation.z = damp(r.rightThigh.rotation.z, -0.4, 30);
      r.rightShin.rotation.x = damp(r.rightShin.rotation.x, 0.35, 30);

      // Right fist punched down into roof/ground
      r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -0.6, 30);
      r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -0.3, 30);

      // Left arm swept back for balance
      r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, 0.9, 30);
      r.leftUpperArm.rotation.z = damp(r.leftUpperArm.rotation.z, 0.5, 30);
      r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -0.4, 30);
      return;
    }

    // --- INSOMNIAC ACROBATIC COMBAT DODGE OVERRIDE ---
    if (this.dodgeTimer > 0) {
      const p = 1.0 - this.dodgeTimer / this.dodgeDuration;
      const arc = Math.sin(p * Math.PI);

      if (this.dodgeDirection === 'left') {
        // Acrobatic left cartwheel / slip
        r.hips.position.y = damp(r.hips.position.y, 0.78 + arc * 0.32, 35);
        r.hips.rotation.z = damp(r.hips.rotation.z, (1 - p) * Math.PI * 1.5, 35);
        r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, 0.45, 35);
        r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, -1.8, 35);
        r.leftUpperArm.rotation.z = damp(r.leftUpperArm.rotation.z, 0.8, 35);
        r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, 1.2, 35);
        r.rightUpperArm.rotation.z = damp(r.rightUpperArm.rotation.z, -0.6, 35);
        r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, -0.8, 35);
        r.leftShin.rotation.x = damp(r.leftShin.rotation.x, 1.2, 35);
        r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, 0.6, 35);
        r.rightShin.rotation.x = damp(r.rightShin.rotation.x, 0.8, 35);
      } else if (this.dodgeDirection === 'right') {
        // Acrobatic right cartwheel / slip
        r.hips.position.y = damp(r.hips.position.y, 0.78 + arc * 0.32, 35);
        r.hips.rotation.z = damp(r.hips.rotation.z, -(1 - p) * Math.PI * 1.5, 35);
        r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, 0.45, 35);
        r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -1.8, 35);
        r.rightUpperArm.rotation.z = damp(r.rightUpperArm.rotation.z, -0.8, 35);
        r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, 1.2, 35);
        r.leftUpperArm.rotation.z = damp(r.leftUpperArm.rotation.z, 0.6, 35);
        r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, -0.8, 35);
        r.rightShin.rotation.x = damp(r.rightShin.rotation.x, 1.2, 35);
        r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, 0.6, 35);
        r.leftShin.rotation.x = damp(r.leftShin.rotation.x, 0.8, 35);
      } else if (this.dodgeDirection === 'back') {
        // Acrobatic back-handspring / back-slip
        r.hips.position.y = damp(r.hips.position.y, 0.84 + arc * 0.35, 35);
        r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, -0.65, 35);
        r.head.rotation.x = damp(r.head.rotation.x, 0.45, 35);
        r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, 1.4, 35);
        r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, 1.4, 35);
        r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, -0.9, 35);
        r.rightShin.rotation.x = damp(r.rightShin.rotation.x, 1.1, 35);
        r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, -0.9, 35);
        r.leftShin.rotation.x = damp(r.leftShin.rotation.x, 1.1, 35);
      } else {
        // Low acrobatic duck roll forward
        r.hips.position.y = damp(r.hips.position.y, 0.54 + arc * 0.15, 35);
        r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, 0.85, 35);
        r.head.rotation.x = damp(r.head.rotation.x, -0.65, 35);
        r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -1.2, 35);
        r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, -1.2, 35);
        r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, -1.3, 35);
        r.rightShin.rotation.x = damp(r.rightShin.rotation.x, 1.5, 35);
        r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, 0.3, 35);
        r.leftShin.rotation.x = damp(r.leftShin.rotation.x, 1.2, 35);
      }
      return;
    }

    if (isSwinging) {
      // SWINGING: Alternating left/right hand web holding based on anchor side!
      r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, 0.28);
      r.spineThorax.rotation.x = damp(r.spineThorax.rotation.x, 0.32);
      r.head.rotation.x = damp(r.head.rotation.x, -0.45);

      if (activeAnchorSide === 'left') {
        // Left arm overhead grasping web
        r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, -2.7);
        r.leftUpperArm.rotation.z = damp(r.leftUpperArm.rotation.z, 0.25);
        r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -0.4);

        // Right arm trailing for balance
        r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, 0.65);
        r.rightUpperArm.rotation.z = damp(r.rightUpperArm.rotation.z, -0.45);
        r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -0.6);
      } else {
        // Right arm overhead grasping web
        r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -2.7);
        r.rightUpperArm.rotation.z = damp(r.rightUpperArm.rotation.z, -0.25);
        r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -0.4);

        // Left arm trailing for balance
        r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, 0.65);
        r.leftUpperArm.rotation.z = damp(r.leftUpperArm.rotation.z, 0.45);
        r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -0.6);
      }

      // Acrobatic legs tucked with pendulum wave
      const legWave = Math.sin(this.animTime * 4.5) * 0.22;
      r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, -0.85 + legWave);
      r.rightShin.rotation.x = damp(r.rightShin.rotation.x, 1.35);
      r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, 0.35 - legWave);
      r.leftShin.rotation.x = damp(r.leftShin.rotation.x, 0.95);

      r.hips.position.y = damp(r.hips.position.y, 0.85);
    } else if (isWallRunning) {
      // WALL-RUN: High-speed athletic vertical wall sprint
      const wallClimbFreq = isSprinting ? 22 : 16;
      this.wallStridePhase = (this.wallStridePhase + dt * wallClimbFreq) % (Math.PI * 2);

      // Footstep sound for wall run
      const wallStepNorm = this.wallStridePhase / (Math.PI * 2);
      if (wallStepNorm < 0.25 && this.prevFootstepSide !== 'right') {
        this.prevFootstepSide = 'right';
        soundEngine.playFootstep(true, isSprinting);
      } else if (wallStepNorm >= 0.5 && wallStepNorm < 0.75 && this.prevFootstepSide !== 'left') {
        this.prevFootstepSide = 'left';
        soundEngine.playFootstep(true, isSprinting);
      }

      const pRight = this.wallStridePhase;
      const pLeft = (this.wallStridePhase + Math.PI) % (Math.PI * 2);

      // Forward lean into wall
      r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, 0.45);
      r.spineThorax.rotation.x = damp(r.spineThorax.rotation.x, 0.25);
      r.head.rotation.x = damp(r.head.rotation.x, -0.45);

      // Arms pumping in dynamic opposition
      const armSwing = Math.sin(this.wallStridePhase) * (isSprinting ? 1.05 : 0.85);
      r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -armSwing);
      r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -0.9);
      r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, armSwing);
      r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -0.9);

      // High-knee strides against wall surface:
      // When leg drives UP along wall: thigh is rotated forward (-X), knee is bent to lift foot
      // When leg pushes DOWN against wall: thigh rotates backward (+X), knee extends to press wall
      const calcWallLeg = (phase: number) => {
        const sinP = Math.sin(phase);
        const cosP = Math.cos(phase);
        const thighX = -cosP * (isSprinting ? 1.25 : 0.95) - 0.2;
        const shinX = sinP < 0 ? 0.15 + (isSprinting ? 1.35 : 0.95) * Math.pow(-sinP, 1.2) : 0.15 + 0.2 * sinP;
        const footX = 0.38 + 0.15 * cosP;
        return { thighX, shinX, footX };
      };

      const legR = calcWallLeg(pRight);
      const legL = calcWallLeg(pLeft);

      r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, legR.thighX);
      r.rightShin.rotation.x = damp(r.rightShin.rotation.x, legR.shinX);
      r.rightFoot.rotation.x = damp(r.rightFoot.rotation.x, legR.footX);

      r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, legL.thighX);
      r.leftShin.rotation.x = damp(r.leftShin.rotation.x, legL.shinX);
      r.leftFoot.rotation.x = damp(r.leftFoot.rotation.x, legL.footX);
    } else if (state === 'WALL_STICK') {
      // 4-POINT ACROBATIC SPIDER WALL-CLING (Gripping vertical wall)
      r.hips.position.y = damp(r.hips.position.y, 0.55, 20);
      r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, 0.58, 20);
      r.spineThorax.rotation.x = damp(r.spineThorax.rotation.x, 0.28, 20);
      r.head.rotation.x = damp(r.head.rotation.x, -0.55, 20);

      // Both hands forward pressing on wall with spread palms
      r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -1.35, 20);
      r.rightUpperArm.rotation.z = damp(r.rightUpperArm.rotation.z, -0.45, 20);
      r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -0.25, 20);
      r.rightHand.rotation.x = damp(r.rightHand.rotation.x, -0.4, 20);

      r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, -1.35, 20);
      r.leftUpperArm.rotation.z = damp(r.leftUpperArm.rotation.z, 0.45, 20);
      r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -0.25, 20);
      r.leftHand.rotation.x = damp(r.leftHand.rotation.x, -0.4, 20);

      // Wide spider-squat legs with feet planted flat against vertical wall surface
      r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, -1.15, 20);
      r.rightThigh.rotation.z = damp(r.rightThigh.rotation.z, -0.65, 20);
      r.rightShin.rotation.x = damp(r.rightShin.rotation.x, 1.25, 20);
      r.rightFoot.rotation.x = damp(r.rightFoot.rotation.x, 0.55, 20);

      r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, -1.15, 20);
      r.leftThigh.rotation.z = damp(r.leftThigh.rotation.z, 0.65, 20);
      r.leftShin.rotation.x = damp(r.leftShin.rotation.x, 1.25, 20);
      r.leftFoot.rotation.x = damp(r.leftFoot.rotation.x, 0.55, 20);
    } else if (state === 'ZIP_TO_WALL') {
      // AERODYNAMIC TWIN-WEB POINT ZIP POSTURE
      r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, 0.5, 30);
      r.spineThorax.rotation.x = damp(r.spineThorax.rotation.x, 0.2, 30);
      r.head.rotation.x = damp(r.head.rotation.x, -0.4, 30);

      // Both arms thrust forward shooting webs
      r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -1.6, 30);
      r.rightUpperArm.rotation.z = damp(r.rightUpperArm.rotation.z, -0.15, 30);
      r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -0.1, 30);
      r.rightHand.rotation.x = damp(r.rightHand.rotation.x, -0.25, 30);

      r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, -1.6, 30);
      r.leftUpperArm.rotation.z = damp(r.leftUpperArm.rotation.z, 0.15, 30);
      r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -0.1, 30);
      r.leftHand.rotation.x = damp(r.leftHand.rotation.x, -0.25, 30);

      // Streamlined tucked legs
      r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, 0.5, 30);
      r.rightShin.rotation.x = damp(r.rightShin.rotation.x, 0.7, 30);
      r.rightFoot.rotation.x = damp(r.rightFoot.rotation.x, -0.4, 30);
      r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, 0.5, 30);
      r.leftShin.rotation.x = damp(r.leftShin.rotation.x, 0.7, 30);
      r.leftFoot.rotation.x = damp(r.leftFoot.rotation.x, -0.4, 30);
    } else if (state === 'WEB_STRIKE') {
      // DYNAMIC FLYING MISSILE DROPKICK (Web-Strike into bandit)
      r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, -0.4, 40);
      r.spineThorax.rotation.x = damp(r.spineThorax.rotation.x, -0.2, 40);
      r.head.rotation.x = damp(r.head.rotation.x, 0.45, 40);

      // Both arms thrust forward shooting webs directly into target
      r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -1.6, 40);
      r.rightUpperArm.rotation.z = damp(r.rightUpperArm.rotation.z, -0.2, 40);
      r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -0.05, 40);
      r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, -1.6, 40);
      r.leftUpperArm.rotation.z = damp(r.leftUpperArm.rotation.z, 0.2, 40);
      r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -0.05, 40);

      // Both boots thrust forward in high-velocity flying missile dropkick!
      r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, -1.75, 40);
      r.rightShin.rotation.x = damp(r.rightShin.rotation.x, 0.1, 40);
      r.rightFoot.rotation.x = damp(r.rightFoot.rotation.x, 0.35, 40);

      r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, -1.65, 40);
      r.leftShin.rotation.x = damp(r.leftShin.rotation.x, 0.1, 40);
      r.leftFoot.rotation.x = damp(r.leftFoot.rotation.x, 0.35, 40);
    } else if (state === 'AIR') {
      this.prevFootstepSide = null;

      if (isDiving) {
        // HIGH-SPEED SWAN DIVE: Head down towards city, arms back as delta-wings, legs trailing
        const flutter = Math.sin(this.animTime * 22) * 0.08;
        r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, 0.72, 22);
        r.spineThorax.rotation.x = damp(r.spineThorax.rotation.x, 0.25, 22);
        r.head.rotation.x = damp(r.head.rotation.x, -0.65, 22);

        // Delta wing swept-back arms
        r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, 1.45, 22);
        r.rightUpperArm.rotation.z = damp(r.rightUpperArm.rotation.z, -0.35, 22);
        r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -0.15, 22);

        r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, 1.45, 22);
        r.leftUpperArm.rotation.z = damp(r.leftUpperArm.rotation.z, 0.35, 22);
        r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -0.15, 22);

        // Aerodynamic streamlined trailing legs
        r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, 0.45 + flutter, 22);
        r.rightShin.rotation.x = damp(r.rightShin.rotation.x, 0.45, 22);
        r.rightFoot.rotation.x = damp(r.rightFoot.rotation.x, -0.4, 22);

        r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, 0.45 - flutter, 22);
        r.leftShin.rotation.x = damp(r.leftShin.rotation.x, 0.45, 22);
        r.leftFoot.rotation.x = damp(r.leftFoot.rotation.x, -0.4, 22);
      } else if (isAcrobaticLeap) {
        // ATHLETIC ACROBATIC SUPERHERO LEAP WITH TUCK AND FORWARD ARC (Space jump)
        r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, 0.45, 28);
        r.spineThorax.rotation.x = damp(r.spineThorax.rotation.x, 0.22, 28);
        r.head.rotation.x = damp(r.head.rotation.x, -0.42, 28);

        // Arms braced forward and slightly out with wrists cocked for stabilizer balance
        r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -0.75, 28);
        r.rightUpperArm.rotation.z = damp(r.rightUpperArm.rotation.z, -0.35, 28);
        r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -0.55, 28);

        r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, -0.75, 28);
        r.leftUpperArm.rotation.z = damp(r.leftUpperArm.rotation.z, 0.35, 28);
        r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -0.55, 28);

        // Athletic tucked legs during ascent arc
        r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, -1.15, 28);
        r.rightShin.rotation.x = damp(r.rightShin.rotation.x, 1.45, 28);
        r.rightFoot.rotation.x = damp(r.rightFoot.rotation.x, -0.2, 28);

        r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, -0.85, 28);
        r.leftShin.rotation.x = damp(r.leftShin.rotation.x, 1.25, 28);
        r.leftFoot.rotation.x = damp(r.leftFoot.rotation.x, -0.2, 28);
      } else if (isAirTricking) {
        // ACROBATIC AIR PARKOUR TRICK (Front-Flip & Pike Spin)
        const spinOsc = Math.sin(this.animTime * 14);
        r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, 0.65 + spinOsc * 0.35, 25);
        r.spineThorax.rotation.x = damp(r.spineThorax.rotation.x, 0.3, 25);
        r.head.rotation.x = damp(r.head.rotation.x, -0.45, 25);

        // Dynamic acrobatic limbs
        r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -1.2, 25);
        r.rightUpperArm.rotation.z = damp(r.rightUpperArm.rotation.z, -0.4, 25);
        r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, 1.1, 25);
        r.leftUpperArm.rotation.z = damp(r.leftUpperArm.rotation.z, 0.4, 25);

        r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, -1.35, 25);
        r.rightShin.rotation.x = damp(r.rightShin.rotation.x, 1.45, 25);
        r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, 0.7, 25);
        r.leftShin.rotation.x = damp(r.leftShin.rotation.x, 1.05, 25);
      } else {
        // STREAMLINED AIR GLIDE / SKYLINE CRUISE
        r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, 0.42);
        r.spineThorax.rotation.x = damp(r.spineThorax.rotation.x, 0.18);
        r.head.rotation.x = damp(r.head.rotation.x, -0.32);

        r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, 0.85);
        r.rightUpperArm.rotation.z = damp(r.rightUpperArm.rotation.z, -0.35);
        r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -0.45);
        r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, 0.85);
        r.leftUpperArm.rotation.z = damp(r.leftUpperArm.rotation.z, 0.35);
        r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -0.45);

        r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, 0.28);
        r.rightShin.rotation.x = damp(r.rightShin.rotation.x, 0.75);
        r.rightFoot.rotation.x = damp(r.rightFoot.rotation.x, -0.25);
        r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, -0.18);
        r.leftShin.rotation.x = damp(r.leftShin.rotation.x, 0.58);
        r.leftFoot.rotation.x = damp(r.leftFoot.rotation.x, -0.2);
      }
    } else {
      // GROUND RUN, STEALTH CROUCH, OR IDLE
      if (isCrouching) {
        // --- ICONIC SPIDER-MAN DEEP PREDATORY CROUCH & STEALTH CRAWL ---
        this.prevFootstepSide = null;
        if (speed > 0.4) {
          // Low athletic stealth crawl
          const crawlFreq = 10.0;
          this.stridePhase = (this.stridePhase + dt * crawlFreq) % (Math.PI * 2);
          const pR = this.stridePhase;
          const pL = (this.stridePhase + Math.PI) % (Math.PI * 2);

          r.hips.position.y = damp(r.hips.position.y, 0.54, 25);
          r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, 0.62, 25);
          r.spineThorax.rotation.x = damp(r.spineThorax.rotation.x, 0.22, 25);
          r.head.rotation.x = damp(r.head.rotation.x, -0.55, 25);

          const armReach = Math.sin(this.stridePhase) * 0.65;
          r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -0.9 - armReach, 25);
          r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -0.4, 25);
          r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, -0.9 + armReach, 25);
          r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -0.4, 25);

          r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, -1.25 + Math.cos(pR) * 0.45, 25);
          r.rightShin.rotation.x = damp(r.rightShin.rotation.x, 1.45, 25);
          r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, -1.25 + Math.cos(pL) * 0.45, 25);
          r.leftShin.rotation.x = damp(r.leftShin.rotation.x, 1.45, 25);
        } else {
          // Deep athletic 3-point spider perch crouch (fingertips planted, watchful gaze)
          r.hips.position.y = damp(r.hips.position.y, 0.42, 25);
          r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, 0.72, 25);
          r.spineThorax.rotation.x = damp(r.spineThorax.rotation.x, 0.28, 25);
          r.head.rotation.x = damp(r.head.rotation.x, -0.65, 25);

          // Right hand down touching ground with spread fingers
          r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -0.85, 25);
          r.rightUpperArm.rotation.z = damp(r.rightUpperArm.rotation.z, -0.25, 25);
          r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -0.22, 25);
          r.rightHand.rotation.x = damp(r.rightHand.rotation.x, -0.45, 25);

          // Left arm raised back for balance
          r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, 0.75, 25);
          r.leftUpperArm.rotation.z = damp(r.leftUpperArm.rotation.z, 0.35, 25);
          r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -0.65, 25);

          // Deeply tucked spider-squat legs
          r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, -1.45, 25);
          r.rightThigh.rotation.z = damp(r.rightThigh.rotation.z, -0.38, 25);
          r.rightShin.rotation.x = damp(r.rightShin.rotation.x, 1.55, 25);
          r.rightFoot.rotation.x = damp(r.rightFoot.rotation.x, 0.35, 25);

          r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, -1.45, 25);
          r.leftThigh.rotation.z = damp(r.leftThigh.rotation.z, 0.38, 25);
          r.leftShin.rotation.x = damp(r.leftShin.rotation.x, 1.55, 25);
          r.leftFoot.rotation.x = damp(r.leftFoot.rotation.x, 0.35, 25);
        }
      } else if (speed > 0.4) {
        // NATURAL SPEED-SYNCHRONIZED STRIDE LOCOMOTION
        const strideFreq = Math.max(5.5, Math.min(25.0, speed * 0.92 + 3.8));
        this.stridePhase = (this.stridePhase + dt * strideFreq) % (Math.PI * 2);

        // Footstep audio trigger on ground strike
        const stepNorm = this.stridePhase / (Math.PI * 2);
        if (stepNorm < 0.25 && this.prevFootstepSide !== 'right') {
          this.prevFootstepSide = 'right';
          soundEngine.playFootstep(false, isSprinting);
        } else if (stepNorm >= 0.5 && stepNorm < 0.75 && this.prevFootstepSide !== 'left') {
          this.prevFootstepSide = 'left';
          soundEngine.playFootstep(false, isSprinting);
        }

        const pRight = this.stridePhase;
        const pLeft = (this.stridePhase + Math.PI) % (Math.PI * 2);

        // Athletic forward lean proportional to sprint
        const forwardLean = isSprinting ? 0.38 : 0.18;
        r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, forwardLean);

        // Torso & Pelvis twist in natural opposition
        const twist = Math.sin(this.stridePhase) * (isSprinting ? 0.16 : 0.10);
        r.spineThorax.rotation.y = THREE.MathUtils.damp(r.spineThorax.rotation.y, twist, 14, dt);
        r.hips.rotation.y = THREE.MathUtils.damp(r.hips.rotation.y, -twist * 0.6, 14, dt);

        // Arms swing naturally in opposition to legs
        const armSwing = Math.sin(this.stridePhase) * (isSprinting ? 1.05 : 0.75);
        r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -armSwing);
        r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -0.85);

        r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, armSwing);
        r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -0.85);

        // Biomechanically accurate leg kinematics (hip swing + knee flexion + ankle roll)
        const calcGroundLeg = (phase: number) => {
          const cosP = Math.cos(phase);
          const sinP = Math.sin(phase);

          const swingAmp = isSprinting ? 1.15 : 0.78;
          const thighX = -cosP * swingAmp;
          const thighZ = Math.sin(phase * 0.5) * 0.03;

          const maxKneeSwing = isSprinting ? 1.42 : 0.98;
          const shinX = sinP < 0
            ? 0.12 + maxKneeSwing * Math.pow(-sinP, 1.25)
            : 0.12 + 0.18 * sinP;

          const footX = -cosP * (isSprinting ? 0.38 : 0.26) + (sinP > 0 ? 0.12 * sinP : 0);

          return { thighX, thighZ, shinX, footX };
        };

        const legR = calcGroundLeg(pRight);
        const legL = calcGroundLeg(pLeft);

        r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, legR.thighX);
        r.rightThigh.rotation.z = damp(r.rightThigh.rotation.z, -0.05 + legR.thighZ);
        r.rightShin.rotation.x = damp(r.rightShin.rotation.x, legR.shinX);
        r.rightFoot.rotation.x = damp(r.rightFoot.rotation.x, legR.footX);

        r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, legL.thighX);
        r.leftThigh.rotation.z = damp(r.leftThigh.rotation.z, 0.05 - legL.thighZ);
        r.leftShin.rotation.x = damp(r.leftShin.rotation.x, legL.shinX);
        r.leftFoot.rotation.x = damp(r.leftFoot.rotation.x, legL.footX);

        // Hips vertical bounce
        const hipBounce = -Math.cos(this.stridePhase * 2) * (isSprinting ? 0.045 : 0.025);
        r.hips.position.y = damp(r.hips.position.y, 0.98 + hipBounce);
      } else if (isInCombat) {
        // --- INSOMNIAC SPIDER-MAN COMBAT STANCE ---
        // Clenched fists guarding chin, low athletic spring-loaded knees, agile bob & weave
        this.prevFootstepSide = null;
        const combatSway = Math.sin(this.animTime * 5.5);
        const combatBreath = Math.sin(this.animTime * 3.5) * 0.02;

        r.hips.position.y = damp(r.hips.position.y, 0.91 + combatBreath);
        r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, 0.28 + combatBreath);
        r.spineLumbar.rotation.y = damp(r.spineLumbar.rotation.y, combatSway * 0.08);
        r.spineThorax.rotation.x = damp(r.spineThorax.rotation.x, 0.16);
        r.spineThorax.rotation.y = damp(r.spineThorax.rotation.y, combatSway * 0.12);
        r.head.rotation.x = damp(r.head.rotation.x, -0.22);
        r.head.rotation.y = damp(r.head.rotation.y, -combatSway * 0.08);

        // Right Arm: Chin-protection guard
        r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -0.85);
        r.rightUpperArm.rotation.z = damp(r.rightUpperArm.rotation.z, -0.25);
        r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -1.45);
        r.rightHand.rotation.x = damp(r.rightHand.rotation.x, -0.3);

        // Left Arm: Lead probing guard
        r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, -1.25);
        r.leftUpperArm.rotation.z = damp(r.leftUpperArm.rotation.z, 0.3);
        r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -1.15);
        r.leftHand.rotation.x = damp(r.leftHand.rotation.x, 0.2);

        // Spring-loaded athletic combat leg stance (weight shifting)
        r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, -0.35 + combatSway * 0.05);
        r.rightThigh.rotation.z = damp(r.rightThigh.rotation.z, -0.15);
        r.rightShin.rotation.x = damp(r.rightShin.rotation.x, 0.52);
        r.rightFoot.rotation.x = damp(r.rightFoot.rotation.x, -0.12);

        r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, 0.25 - combatSway * 0.05);
        r.leftThigh.rotation.z = damp(r.leftThigh.rotation.z, 0.15);
        r.leftShin.rotation.x = damp(r.leftShin.rotation.x, 0.38);
        r.leftFoot.rotation.x = damp(r.leftFoot.rotation.x, -0.05);
      } else {
        // SPIDER ALERT IDLE (Exact boot sole flush alignment with rooftops)
        this.prevFootstepSide = null;
        const breath = Math.sin(this.animTime * 2.5) * 0.03;
        r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, 0.12 + breath);
        r.spineThorax.rotation.x = damp(r.spineThorax.rotation.x, 0.08);
        r.spineThorax.rotation.y = damp(r.spineThorax.rotation.y, 0);
        r.hips.rotation.y = damp(r.hips.rotation.y, 0);
        r.head.rotation.x = damp(r.head.rotation.x, -breath);

        r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, 0.1);
        r.rightUpperArm.rotation.z = damp(r.rightUpperArm.rotation.z, -0.15);
        r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -0.35);

        r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, 0.1);
        r.leftUpperArm.rotation.z = damp(r.leftUpperArm.rotation.z, 0.15);
        r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -0.35);

        r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, 0.08);
        r.rightThigh.rotation.z = damp(r.rightThigh.rotation.z, -0.05);
        r.rightShin.rotation.x = damp(r.rightShin.rotation.x, 0.12);
        r.rightFoot.rotation.x = damp(r.rightFoot.rotation.x, 0.0);

        r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, 0.08);
        r.leftThigh.rotation.z = damp(r.leftThigh.rotation.z, 0.05);
        r.leftShin.rotation.x = damp(r.leftShin.rotation.x, 0.12);
        r.leftFoot.rotation.x = damp(r.leftFoot.rotation.x, 0.0);

        // Calibrated baseline: boot sole bottom sits exactly flush on roof surface
        r.hips.position.y = damp(r.hips.position.y, 0.98 + Math.max(0, breath * 0.03));
      }
    }

    // --- 4-HIT INSOMNIAC MARTIAL ARTS COMBO + AERIAL SLAM OVERRIDE ---
    if (this.meleeTimer > 0) {
      if (this.comboIndex === 99) {
        // SPECIAL: Aerial Web-Slam / Downward Hammerfist Strike!
        r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, 0.85, 40);
        r.head.rotation.x = damp(r.head.rotation.x, -0.75, 40);
        // Both fists clasped driving straight down
        r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -0.9, 40);
        r.rightUpperArm.rotation.z = damp(r.rightUpperArm.rotation.z, -0.1, 40);
        r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -0.2, 40);
        r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, -0.9, 40);
        r.leftUpperArm.rotation.z = damp(r.leftUpperArm.rotation.z, 0.1, 40);
        r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -0.2, 40);
        r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, -0.6, 40);
        r.rightShin.rotation.x = damp(r.rightShin.rotation.x, 1.2, 40);
        r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, -0.6, 40);
        r.leftShin.rotation.x = damp(r.leftShin.rotation.x, 1.2, 40);
      } else if (this.comboIndex === 0) {
        // Strike 1: Left Speed Jab (Удар 1: кулак - резкий прямой выпад левой рукой, правая у подбородка)
        r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, -1.68, 42);
        r.leftUpperArm.rotation.z = damp(r.leftUpperArm.rotation.z, 0.08, 42);
        r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -0.05, 42);
        r.leftHand.rotation.x = damp(r.leftHand.rotation.x, 0.1, 42);
        r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -0.65, 35);
        r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -1.35, 35);
        r.spineThorax.rotation.y = damp(r.spineThorax.rotation.y, 0.52, 42);
        r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, 0.15, 35);
      } else if (this.comboIndex === 1) {
        // Strike 2: Right Spinning Elbow Strike (Удар 2: локоть - сокрушительный круговой удар локтем с разворотом торса)
        r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -1.55, 42);
        r.rightUpperArm.rotation.z = damp(r.rightUpperArm.rotation.z, -0.75, 42);
        r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -1.85, 42);
        r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, -0.55, 35);
        r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -1.45, 35);
        r.spineThorax.rotation.y = damp(r.spineThorax.rotation.y, -0.85, 42);
        r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, 0.22, 35);
      } else if (this.comboIndex === 2) {
        // Strike 3: Acrobatic Flying Knee / Jump Kick (Удар 3: прыжок и удар коленом в корпус с отрывом от земли)
        r.hips.position.y = damp(r.hips.position.y, 1.28, 40);
        r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, -1.85, 42);
        r.rightShin.rotation.x = damp(r.rightShin.rotation.x, 1.45, 42);
        r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, 0.45, 35);
        r.leftShin.rotation.x = damp(r.leftShin.rotation.x, 0.65, 35);
        r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, 0.65, 35);
        r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, -0.95, 35);
        r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -0.4, 35);
        r.spineThorax.rotation.x = damp(r.spineThorax.rotation.x, 0.28, 40);
      } else {
        // Strike 4: Insomniac Rising Uppercut Finisher (Удар 4: мощнейший восходящий апперкот, подбрасывающий врага)
        r.hips.position.y = damp(r.hips.position.y, 1.45, 40);
        r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -2.6, 45);
        r.rightUpperArm.rotation.z = damp(r.rightUpperArm.rotation.z, -0.15, 45);
        r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -0.45, 45);
        r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, 0.75, 35);
        r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -0.65, 35);
        r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, -0.35, 42);
        r.head.rotation.x = damp(r.head.rotation.x, -0.65, 42);
        r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, -0.85, 38);
        r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, 0.35, 38);
      }
    }

    // --- WEB PELLET SHOOT OVERRIDE (F Key) ---
    if (this.webPelletTimer > 0) {
      r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -1.55, 35);
      r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -0.1, 35);
      r.rightHand.rotation.x = damp(r.rightHand.rotation.x, -0.5, 35);
    }

    // --- WEB COCOON BLAST OVERRIDE (Right Click / RMB) ---
    if (this.webCocoonTimer > 0) {
      r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -1.5, 35);
      r.rightUpperArm.rotation.z = damp(r.rightUpperArm.rotation.z, -0.2, 35);
      r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -0.15, 35);
      r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, -1.5, 35);
      r.leftUpperArm.rotation.z = damp(r.leftUpperArm.rotation.z, 0.2, 35);
      r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -0.15, 35);
      r.spineThorax.rotation.x = damp(r.spineThorax.rotation.x, 0.2, 30);
    }
  }

  public getRightWristPosition(outVec: THREE.Vector3) {
    this.rig.rightWristWebNode.getWorldPosition(outVec);
  }

  public getLeftWristPosition(outVec: THREE.Vector3) {
    this.rig.leftWristWebNode.getWorldPosition(outVec);
  }
}
