/**
 * EnemiesManager: Combat system with 3 distinct player attack types:
 * 1. Martial arts 4-hit melee combo (LMB)
 * 2. Rapid-fire Web Pellets (F)
 * 3. Wide Web Cocoon Net blast (RMB)
 */

import * as THREE from 'three';
import { soundEngine } from './SoundEngine';

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
    const words = ['THWIP!', 'BAM!', 'POW!', 'KAPOW!', 'WHAM!', 'CRACK!', 'WEB-TRAP!'];
    const colors = ['#f59e0b', '#ef4444', '#ec4899', '#3b82f6', '#10b981', '#f97316', '#06b6d4'];

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

  public spawnBandit(x: number, y: number, z: number): Bandit {
    const banditGroup = new THREE.Group();
    banditGroup.position.set(x, y, z);

    const jacketMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.6,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.5,
    });
    const bandanaMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.7,
    });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.35), jacketMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    banditGroup.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), skinMat);
    head.position.y = 1.6;
    head.castShadow = true;
    banditGroup.add(head);

    const bandana = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 6, 12), bandanaMat);
    bandana.position.set(0, 1.65, 0);
    bandana.rotation.x = Math.PI / 2;
    banditGroup.add(bandana);

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.22), pantsMat);
    leftLeg.position.set(0.15, 0.35, 0);
    banditGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.22), pantsMat);
    rightLeg.position.set(-0.15, 0.35, 0);
    banditGroup.add(rightLeg);

    const bat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.06, 0.8, 6),
      new THREE.MeshStandardMaterial({ color: 0x78350f })
    );
    bat.position.set(0.35, 1.0, 0.2);
    bat.rotation.x = Math.PI / 3;
    banditGroup.add(bat);

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
    healthBarMesh.position.set(0, 2.05, 0);
    banditGroup.add(healthBarMesh);

    // Web Cocoon Wrap Mesh
    const cocoonMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.9,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const cocoonMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.85, 10), cocoonMat);
    cocoonMesh.position.set(0, 0.9, 0);
    cocoonMesh.visible = false;
    banditGroup.add(cocoonMesh);

    this.group.add(banditGroup);

    const bandit: Bandit = {
      id: this.nextId++,
      mesh: banditGroup,
      position: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(),
      health: 100,
      maxHealth: 100,
      state: 'PATROL',
      webTimer: 0,
      attackTimer: 0,
      patrolAngle: Math.random() * Math.PI * 2,
      spawnPoint: new THREE.Vector3(x, y, z),
      healthBarMesh,
      cocoonMesh,
    };
    this.bandits.push(bandit);
    return bandit;
  }

  // --- ATTACK 1: 4-HIT MARTIAL ARTS MELEE COMBO (LMB) ---
  public performMeleeCombo(
    playerPos: THREE.Vector3,
    playerAngle: number,
    comboIndex: number
  ): { hitCount: number; defeatedCount: number } {
    let hitCount = 0;
    let defeatedCount = 0;
    const step = comboIndex % 4;

    // Step 0: Jab (30 dmg), Step 1: Cross (40 dmg), Step 2: High Kick (55 dmg), Step 3: Uppercut (70 dmg)
    const damages = [30, 40, 55, 70];
    const hitWords = ['POW!', 'BAM!', 'KAPOW!', 'WHAM!'];
    const damage = damages[step];
    const word = hitWords[step];

    for (const b of this.bandits) {
      if (b.state === 'KNOCKED_OUT') continue;
      const dist = playerPos.distanceTo(b.position);
      if (dist < 3.4) {
        hitCount++;
        b.health -= damage;
        const knockDir = b.position.clone().sub(playerPos).normalize();

        if (step === 3) {
          // Uppercut launches into the air!
          knockDir.y = 1.2;
          b.velocity.addScaledVector(knockDir, 22);
        } else {
          knockDir.y = 0.3;
          b.velocity.addScaledVector(knockDir, 16);
        }

        soundEngine.playPunch(step + 1);
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
          trappedCount++;
          b.state = 'WEB_WRAPPED';
          b.webTimer = 5.0; // 5 full seconds immobilized
          b.cocoonMesh.visible = true;
          b.health -= 35;
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
        hitCount++;
        b.health -= damage;
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
          b.health -= 35;
          b.velocity.addScaledVector(p.velocity.clone().normalize(), 14); // Stagger backwards
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

    // UPDATE BANDITS AI
    for (const b of this.bandits) {
      if (b.state === 'KNOCKED_OUT') continue;
      b.healthBarMesh.quaternion.copy(camera.quaternion);

      if (b.state === 'WEB_WRAPPED') {
        b.webTimer -= dt;
        b.mesh.rotation.y += Math.sin(b.webTimer * 20) * 0.04;
        if (b.webTimer <= 0) {
          b.state = 'CHASE';
          b.cocoonMesh.visible = false;
        }
        continue;
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
          b.position.addScaledVector(toPlayer, 5.5 * dt);
        } else {
          b.state = 'ATTACK_PREP';
          b.attackTimer += dt;
          if (b.attackTimer > 0.4 && b.attackTimer < 1.1) {
            dangerImminent = true;
          }
          if (b.attackTimer >= 1.1) {
            b.attackTimer = 0;
            onPlayerDamage(16);
            soundEngine.playPunch(0);
            this.spawnComicPopup(playerPos, 'WHAM!');
          }
        }
      } else {
        b.state = 'PATROL';
        b.patrolAngle += 0.5 * dt;
        b.position.x = b.spawnPoint.x + Math.cos(b.patrolAngle) * 5;
        b.position.z = b.spawnPoint.z + Math.sin(b.patrolAngle) * 5;
        b.mesh.rotation.y = b.patrolAngle + Math.PI / 2;
      }

      b.position.addScaledVector(b.velocity, dt);
      b.velocity.multiplyScalar(0.85);
      // Keep bandit solidly grounded on rooftop level
      if (b.position.y < b.spawnPoint.y) {
        b.position.y = b.spawnPoint.y;
        b.velocity.y = 0;
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
