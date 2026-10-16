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

  // Attack Animation timers
  private comboIndex = 0;
  private meleeTimer = 0;
  private webPelletTimer = 0;
  private webCocoonTimer = 0;
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

    // Red suit base
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, 512, 512);

    // Blue side panels
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(0, 0, 140, 512);
    ctx.fillRect(372, 0, 140, 512);

    // Webbing pattern lines
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 3;

    for (let y = 20; y < 512; y += 40) {
      ctx.beginPath();
      ctx.moveTo(140, y);
      ctx.quadraticCurveTo(256, y + 15, 372, y);
      ctx.stroke();
    }

    for (let x = 160; x <= 352; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (x - 256) * 0.25, 512);
      ctx.stroke();
    }

    // Front Chest Spider Logo (Centered at x=256, which maps to front when rotated)
    this.drawSpiderLogo(ctx, 256, 256, '#090d16', 1.05);

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

    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#020617');
    grad.addColorStop(0.5, '#0f172a');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;

    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, 0);
      ctx.bezierCurveTo(
        Math.random() * 512,
        200,
        Math.random() * 512,
        350,
        Math.random() * 512,
        512
      );
      ctx.stroke();
    }

    this.drawSpiderLogo(ctx, 256, 256, '#ffffff', 1.35);

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

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 512, 512);

    ctx.fillStyle = '#1e293b';
    for (let y = 0; y < 512; y += 8) {
      for (let x = 0; x < 512; x += 8) {
        if ((x + y) % 16 === 0) {
          ctx.fillRect(x, y, 4, 4);
        }
      }
    }

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3.5;

    for (let y = 30; y < 512; y += 45) {
      ctx.beginPath();
      ctx.moveTo(100, y);
      ctx.quadraticCurveTo(256, y + 20, 412, y);
      ctx.stroke();
    }

    for (let x = 120; x <= 392; x += 38) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (x - 256) * 0.3, 512);
      ctx.stroke();
    }

    this.drawSpiderLogo(ctx, 256, 256, '#ef4444', 1.15);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
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

    (this.rig.backDecalMesh.material as THREE.MeshBasicMaterial).color.setHex(backLogoColor);
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
    const eyeFrameMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

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
      new THREE.PlaneGeometry(0.18, 0.18),
      new THREE.MeshBasicMaterial({ color: 0xb91c1c, transparent: true, opacity: 0.95 })
    );
    backDecalMesh.rotation.y = Math.PI;
    backDecalMesh.position.set(0, 0.15, -0.14);
    spineThorax.add(backDecalMesh);

    // NECK & HEAD
    const neck = new THREE.Group();
    neck.position.y = 0.3;
    spineThorax.add(neck);

    const neckMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.09, 0.12, 8),
      redMat
    );
    neckMesh.position.y = 0.06;
    neck.add(neckMesh);
    redMeshes.push(neckMesh);

    const head = new THREE.Group();
    head.position.y = 0.12;
    neck.add(head);

    const headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 16, 14),
      redMat
    );
    headMesh.scale.set(0.9, 1.15, 1.05);
    headMesh.position.y = 0.08;
    headMesh.castShadow = true;
    head.add(headMesh);
    redMeshes.push(headMesh);

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

    // Comic Spider Eyes (Facing forward on +Z)
    const makeEye = (isRight: boolean) => {
      const eyeGroup = new THREE.Group();
      const sign = isRight ? 1 : -1;

      const frameGeom = new THREE.RingGeometry(0.02, 0.08, 4, 1, Math.PI / 4, Math.PI * 1.5);
      const frame = new THREE.Mesh(frameGeom, eyeFrameMat);
      frame.scale.set(1.4, 0.9, 1);
      frame.rotation.z = sign * 0.35;
      eyeGroup.add(frame);
      eyeFrameMeshes.push(frame);

      const lensGeom = new THREE.CircleGeometry(0.062, 5);
      const lens = new THREE.Mesh(lensGeom, eyeWhiteMat);
      lens.scale.set(1.2, 0.75, 1);
      lens.rotation.z = sign * 0.35;
      lens.position.z = 0.005;
      eyeGroup.add(lens);
      eyeLensMeshes.push(lens);

      eyeGroup.position.set(sign * 0.085, 0.1, 0.16);
      eyeGroup.rotation.y = sign * 0.25;
      return eyeGroup;
    };

    head.add(makeEye(false));
    head.add(makeEye(true));

    // --- ARMS RIGGING (With Deltoids, Gauntlets & 🤟 Web-Shooter Hands) ---
    const buildArm = (isRight: boolean) => {
      const sign = isRight ? -1 : 1;

      // Clavicle
      const clavicle = new THREE.Group();
      clavicle.position.set(sign * 0.14, 0.24, 0);
      spineThorax.add(clavicle);

      // Deltoid Shoulder Pad (Broad athletic superhero taper)
      const shoulderMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 8, 8),
        redMat
      );
      shoulderMesh.position.set(sign * 0.14, 0, 0);
      shoulderMesh.scale.set(1.1, 1.0, 1.15);
      clavicle.add(shoulderMesh);
      redMeshes.push(shoulderMesh);

      // Upper Arm (Humerus)
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

      // Elbow Joint (Placed at rear -Z)
      const elbowCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 6, 6),
        redMat
      );
      elbowCap.position.set(0, -0.26, -0.02);
      upperArm.add(elbowCap);
      redMeshes.push(elbowCap);

      // Forearm (Hinges at elbow: y = -0.26)
      const forearm = new THREE.Group();
      forearm.position.set(0, -0.26, 0);
      upperArm.add(forearm);

      const forearmMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.048, 0.26, 8),
        redMat
      );
      forearmMesh.position.y = -0.13;
      forearmMesh.castShadow = true;
      forearm.add(forearmMesh);
      redMeshes.push(forearmMesh);

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

    // --- LEGS RIGGING (True backward-bending knee joint) ---
    const buildLeg = (isRight: boolean) => {
      const sign = isRight ? -1 : 1;

      const thigh = new THREE.Group();
      thigh.position.set(sign * 0.12, -0.1, 0);
      hips.add(thigh);

      const thighMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.088, 0.07, 0.38, 8),
        blueMat
      );
      thighMesh.position.y = -0.19;
      thighMesh.castShadow = true;
      thigh.add(thighMesh);
      blueMeshes.push(thighMesh);

      // Patella Knee Cap (Faces FORWARD on +Z, so knee bends BACKWARDS!)
      const kneeCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 6),
        redMat
      );
      kneeCap.position.set(0, -0.38, 0.03);
      thigh.add(kneeCap);
      redMeshes.push(kneeCap);

      // Shin (Hinges at knee: y = -0.38)
      const shin = new THREE.Group();
      shin.position.set(0, -0.38, 0);
      thigh.add(shin);

      const shinMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.055, 0.38, 8),
        redMat
      );
      shinMesh.position.y = -0.19;
      shinMesh.castShadow = true;
      shin.add(shinMesh);
      redMeshes.push(shinMesh);

      // Muscular Calf bulge at rear of shin
      const calfBulge = new THREE.Mesh(
        new THREE.SphereGeometry(0.062, 6, 6),
        redMat
      );
      calfBulge.position.set(0, -0.14, -0.03);
      shin.add(calfBulge);
      redMeshes.push(calfBulge);

      // Foot & Ankle (Points forward towards +Z)
      const foot = new THREE.Group();
      foot.position.set(0, -0.38, 0.04);
      shin.add(foot);

      const footMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.085, 0.065, 0.2),
        redMat
      );
      footMesh.position.set(0, -0.03, 0.05);
      foot.add(footMesh);
      redMeshes.push(footMesh);

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
    this.comboIndex = comboStep % 4;
    this.meleeTimer = 0.32;
  }

  public triggerWebPellet() {
    this.webPelletTimer = 0.22;
  }

  public triggerWebCocoonBlast() {
    this.webCocoonTimer = 0.45;
  }

  public setSpiderSense(active: boolean) {
    this.rig.spiderSenseAlertMesh.visible = active;
  }

  /**
   * Main animation update:
   * Supports dynamic alternating swing arms (left/right anchor),
   * superhero 3-point landing crouch, parkour banking, and acrobatic martial arts.
   */
  public update(
    dt: number,
    state: 'GROUND' | 'AIR' | 'SWINGING' | 'WALL_RUN' | 'WALL_STICK' | 'ZIP_TO_WALL',
    speed: number,
    isSprinting: boolean,
    isSwinging: boolean,
    isWallRunning: boolean,
    activeAnchorSide: 'left' | 'right' = 'right',
    bankAngle = 0,
    superheroLandingTimer = 0
  ) {
    this.animTime += dt;
    if (this.meleeTimer > 0) this.meleeTimer -= dt;
    if (this.webPelletTimer > 0) this.webPelletTimer -= dt;
    if (this.webCocoonTimer > 0) this.webCocoonTimer -= dt;

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
    } else if (state === 'AIR') {
      // AIR DIVE / GLIDE: Streamlined aerodynamic tuck
      this.prevFootstepSide = null;
      r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, 0.45);
      r.spineThorax.rotation.x = damp(r.spineThorax.rotation.x, 0.2);
      r.head.rotation.x = damp(r.head.rotation.x, -0.3);

      r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, 0.8);
      r.rightUpperArm.rotation.z = damp(r.rightUpperArm.rotation.z, -0.4);
      r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -0.5);
      r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, 0.8);
      r.leftUpperArm.rotation.z = damp(r.leftUpperArm.rotation.z, 0.4);
      r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -0.5);

      r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, 0.3);
      r.rightShin.rotation.x = damp(r.rightShin.rotation.x, 0.8);
      r.rightFoot.rotation.x = damp(r.rightFoot.rotation.x, -0.3);
      r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, -0.2);
      r.leftShin.rotation.x = damp(r.leftShin.rotation.x, 0.6);
      r.leftFoot.rotation.x = damp(r.leftFoot.rotation.x, -0.2);
    } else {
      // GROUND RUN OR IDLE
      if (speed > 0.4) {
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

          // Knee flexion:
          // Stance (sinP >= 0): slight cushioning flex 0.12 - 0.28 rad
          // Swing (sinP < 0): knee flexes sharply (up to 1.42 rad in sprint) to tuck heel and clear pavement!
          const maxKneeSwing = isSprinting ? 1.42 : 0.98;
          const shinX = sinP < 0
            ? 0.12 + maxKneeSwing * Math.pow(-sinP, 1.25)
            : 0.12 + 0.18 * sinP;

          // Foot / Ankle angle:
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

        // Hips vertical bounce: peaks at mid-stance, dips at step transition
        const hipBounce = -Math.cos(this.stridePhase * 2) * (isSprinting ? 0.045 : 0.025);
        r.hips.position.y = damp(r.hips.position.y, 0.95 + hipBounce);
      } else {
        // SPIDER ALERT IDLE (Low center of gravity, hands ready)
        this.prevFootstepSide = null;
        const breath = Math.sin(this.animTime * 2.5) * 0.03;
        r.spineLumbar.rotation.x = damp(r.spineLumbar.rotation.x, 0.12 + breath);
        r.spineThorax.rotation.x = damp(r.spineThorax.rotation.x, 0.08);
        r.spineThorax.rotation.y = damp(r.spineThorax.rotation.y, 0);
        r.hips.rotation.y = damp(r.hips.rotation.y, 0);
        r.head.rotation.x = damp(r.head.rotation.x, -breath);

        // Arms hanging naturally with slight forward forearm flexion
        r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, 0.1);
        r.rightUpperArm.rotation.z = damp(r.rightUpperArm.rotation.z, -0.15);
        r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -0.35);

        r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, 0.1);
        r.leftUpperArm.rotation.z = damp(r.leftUpperArm.rotation.z, 0.15);
        r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -0.35);

        // Legs in relaxed athletic stance
        r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, 0.08);
        r.rightThigh.rotation.z = damp(r.rightThigh.rotation.z, -0.05);
        r.rightShin.rotation.x = damp(r.rightShin.rotation.x, 0.12);
        r.rightFoot.rotation.x = damp(r.rightFoot.rotation.x, 0.0);

        r.leftThigh.rotation.x = damp(r.leftThigh.rotation.x, 0.08);
        r.leftThigh.rotation.z = damp(r.leftThigh.rotation.z, 0.05);
        r.leftShin.rotation.x = damp(r.leftShin.rotation.x, 0.12);
        r.leftFoot.rotation.x = damp(r.leftFoot.rotation.x, 0.0);

        r.hips.position.y = damp(r.hips.position.y, 0.95 + breath * 0.06);
      }
    }

    // --- 4-HIT ACROBATIC MARTIAL ARTS COMBO OVERRIDE ---
    if (this.meleeTimer > 0) {
      if (this.comboIndex === 0) {
        // Strike 1: Left Quick Jab (Left shoulder drives, fist punches forward)
        r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, -1.5, 35);
        r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -0.1, 35);
        r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -0.5, 30);
        r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -1.2, 30);
        r.spineThorax.rotation.y = damp(r.spineThorax.rotation.y, 0.45, 35);
      } else if (this.comboIndex === 1) {
        // Strike 2: Right Heavy Cross (Torso twist, right fist lunges forward)
        r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -1.6, 35);
        r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -0.05, 35);
        r.leftUpperArm.rotation.x = damp(r.leftUpperArm.rotation.x, -0.4, 30);
        r.leftForearm.rotation.x = damp(r.leftForearm.rotation.x, -1.2, 30);
        r.spineThorax.rotation.y = damp(r.spineThorax.rotation.y, -0.5, 35);
      } else if (this.comboIndex === 2) {
        // Strike 3: Acrobatic High Roundhouse Kick (Body banks, right leg sweeps in high kick)
        r.spineThorax.rotation.z = damp(r.spineThorax.rotation.z, 0.5, 35);
        r.rightThigh.rotation.x = damp(r.rightThigh.rotation.x, -1.6, 35);
        r.rightThigh.rotation.z = damp(r.rightThigh.rotation.z, -0.8, 35);
        r.rightShin.rotation.x = damp(r.rightShin.rotation.x, 0.1, 35);
        r.hips.position.y = damp(r.hips.position.y, 1.2, 30);
      } else {
        // Strike 4: Rising Uppercut (Right fist drives vertically, hero springs upward)
        r.rightUpperArm.rotation.x = damp(r.rightUpperArm.rotation.x, -2.4, 35);
        r.rightForearm.rotation.x = damp(r.rightForearm.rotation.x, -0.6, 35);
        r.spineThorax.rotation.x = damp(r.spineThorax.rotation.x, -0.3, 30);
        r.hips.position.y = damp(r.hips.position.y, 1.35, 30);
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
