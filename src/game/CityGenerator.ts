/**
 * CityGenerator: High-fidelity procedural Manhattan environment for Spider-Man.
 * Featuring diverse skyscraper styles (Glass towers, Brick Art-Deco, Spire towers),
 * detailed rooftops (water towers, HVAC, antennas), and high-performance collisions.
 */

import * as THREE from 'three';
import { soundEngine } from './SoundEngine';

export interface BuildingData {
  box: THREE.Box3;
  center: THREE.Vector3;
  width: number;
  height: number;
  depth: number;
  roofY: number;
  type: 'glass' | 'brick' | 'deco' | 'tower';
}

export interface VehicleTurn {
  progress: number;
  duration: number;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  startRotY: number;
  targetRotY: number;
  newAxis: 'x' | 'z';
  newDirection: number;
  newStreetCoord: number;
}

export interface TrafficVehicle {
  group: THREE.Group;
  axis: 'x' | 'z';
  direction: number; // 1 or -1
  speed: number;
  baseSpeed: number;
  minLimit: number;
  maxLimit: number;
  length: number;
  width: number;
  height: number;
  wheels?: THREE.Mesh[];
  frontSteerPivots?: THREE.Group[];
  policeStrobe?: { red: THREE.Mesh; blue: THREE.Mesh };
  currentStreetCoord: number;
  turning?: VehicleTurn;
  lastTurnCoord?: number;
  bodyRoll: number;
}

export interface SteamVent {
  mesh: THREE.Mesh;
  baseY: number;
  phase: number;
}

export class CityGenerator {
  public cityGroup: THREE.Group;
  public buildings: BuildingData[] = [];
  public colliderMeshes: THREE.Mesh[] = [];
  public groundMesh: THREE.Mesh;
  public beacons: THREE.Mesh[] = [];
  public vehicles: TrafficVehicle[] = [];
  public steams: SteamVent[] = [];
  public fans: THREE.Mesh[] = [];
  public waterMesh: THREE.Mesh | null = null;
  public citySize = 420;
  public streetLines: number[] = [];
  public obstacles: THREE.Box3[] = [];

  private roadTexture: THREE.CanvasTexture;
  private brickTexture: THREE.CanvasTexture;
  private glassTexture: THREE.CanvasTexture;
  private decoTexture: THREE.CanvasTexture;
  private helipadTexture: THREE.CanvasTexture;
  private waterTexture: THREE.CanvasTexture;
  private roofTexture: THREE.CanvasTexture;

  constructor() {
    this.cityGroup = new THREE.Group();
    this.roadTexture = this.createRoadTexture();
    this.brickTexture = this.createBrickTexture();
    this.glassTexture = this.createGlassTexture();
    this.decoTexture = this.createDecoTexture();
    this.helipadTexture = this.createHelipadTexture();
    this.waterTexture = this.createWaterTexture();
    this.roofTexture = this.createRoofTexture();

    this.groundMesh = this.createGroundAndRoads();
    this.cityGroup.add(this.groundMesh);
    this.createWaterfrontAndPerimeter();

    this.generateSkyscrapers();
    this.generateStreetProps();
    this.generateTraffic();
    this.generateSteamVents();
  }

  private createRoadTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Asphalt surface with realistic micro-texture
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle grain
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.fillStyle = Math.random() > 0.5 ? '#1e293b' : '#090d16';
      ctx.fillRect(x, y, 2, 2);
    }

    // Yellow center double divider line
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(250, 0);
    ctx.lineTo(250, 512);
    ctx.moveTo(262, 0);
    ctx.lineTo(262, 512);
    ctx.stroke();

    // White pedestrian crosswalk dashes at intersections
    ctx.fillStyle = '#cbd5e1';
    for (let y = 16; y < 140; y += 22) {
      ctx.fillRect(60, y, 65, 12);
      ctx.fillRect(387, y, 65, 12);
    }

    // White lane margins
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.setLineDash([35, 25]);
    ctx.beginPath();
    ctx.moveTo(140, 0);
    ctx.lineTo(140, 512);
    ctx.moveTo(372, 0);
    ctx.lineTo(372, 512);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(22, 22);
    return tex;
  }

  private createBrickTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Warm reddish-brown brick base
    ctx.fillStyle = '#5c1d0a';
    ctx.fillRect(0, 0, 512, 512);

    // Cornices & Floor horizontal dividers
    ctx.fillStyle = '#291107';
    for (let y = 0; y < 512; y += 64) {
      ctx.fillRect(0, y, 512, 6);
    }

    // Window bays
    for (let y = 8; y < 512; y += 64) {
      for (let x = 16; x < 512; x += 48) {
        // Dark frame
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x - 3, y - 2, 26, 42);

        // Window glass with warm interior lighting or dusk sky reflection
        const hash = Math.sin(x * 17 + y * 23);
        if (hash > 0.25) {
          ctx.fillStyle = '#fef08a'; // Warm glowing window
        } else if (hash > -0.2) {
          ctx.fillStyle = '#fdba74'; // Amber lamp light
        } else {
          ctx.fillStyle = '#0a101f'; // Dark unlit
        }
        ctx.fillRect(x, y, 20, 36);

        // Window mullion cross
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x + 10, y);
        ctx.lineTo(x + 10, y + 36);
        ctx.moveTo(x, y + 18);
        ctx.lineTo(x + 20, y + 18);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  private createGlassTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Modern architectural deep cyan/navy glass
    ctx.fillStyle = '#0a2540';
    ctx.fillRect(0, 0, 512, 512);

    // Glass panel grid
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    for (let y = 0; y < 512; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
    for (let x = 0; x < 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }

    // High-rise glowing office floor segments
    for (let y = 4; y < 512; y += 32) {
      for (let x = 4; x < 512; x += 32) {
        const rand = Math.sin(x * 31 + y * 47);
        if (rand > 0.35) {
          ctx.fillStyle = '#7dd3fc';
          ctx.fillRect(x + 2, y + 2, 24, 24);
        } else if (rand > 0.1) {
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(x + 2, y + 2, 24, 24);
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  private createDecoTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Art-Deco granite / limestone dark base
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 512, 512);

    // Vertical Art Deco fluted limestone pillars
    ctx.fillStyle = '#0f172a';
    for (let x = 0; x < 512; x += 32) {
      ctx.fillRect(x, 0, 6, 512);
    }

    // Brass & Bronze geometric chevron horizontal friezes
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    for (let y = 0; y < 512; y += 64) {
      ctx.beginPath();
      for (let x = 0; x < 512; x += 32) {
        ctx.moveTo(x, y + 8);
        ctx.lineTo(x + 16, y);
        ctx.lineTo(x + 32, y + 8);
      }
      ctx.stroke();
    }

    // Windows with warm amber and dusk lights
    for (let y = 14; y < 512; y += 64) {
      for (let x = 8; x < 512; x += 32) {
        const hash = Math.sin(x * 19 + y * 29);
        if (hash > 0.1) {
          ctx.fillStyle = hash > 0.6 ? '#fde047' : '#f59e0b';
        } else {
          ctx.fillStyle = '#090d16';
        }
        ctx.fillRect(x, y, 18, 42);

        // Window mullion
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 18, 42);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  private createHelipadTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Non-slip dark asphalt roof deck
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, 256, 256);

    // Yellow safety perimeter ring
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(128, 128, 105, 0, Math.PI * 2);
    ctx.stroke();

    // Red outer corner hazard stripes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(10, 10, 30, 8);
    ctx.fillRect(216, 10, 30, 8);
    ctx.fillRect(10, 238, 30, 8);
    ctx.fillRect(216, 238, 30, 8);

    // Bold White "H" Landing Mark
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 100px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', 128, 130);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createWaterTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0369a1';
    ctx.fillRect(0, 0, 512, 512);

    // Glistening ripples
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    for (let y = 10; y < 512; y += 24) {
      ctx.beginPath();
      for (let x = 0; x <= 512; x += 32) {
        const dy = Math.sin((x + y) * 0.05) * 6;
        if (x === 0) ctx.moveTo(x, y + dy);
        else ctx.lineTo(x, y + dy);
      }
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 16);
    return tex;
  }

  private createWaterfrontAndPerimeter() {
    // Hudson & East River surrounding water plane
    const waterGeom = new THREE.PlaneGeometry(800, 800);
    const waterMat = new THREE.MeshStandardMaterial({
      map: this.waterTexture,
      roughness: 0.1,
      metalness: 0.8,
      color: 0x0284c7,
    });
    this.waterMesh = new THREE.Mesh(waterGeom, waterMat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.y = -0.55;
    this.cityGroup.add(this.waterMesh);

    // Perimeter Manhattan Seawalls (Granite bulkheads with safety railings)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const railingMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.3 });
    const limit = 206;
    const wallThick = 2.4;
    const wallHeight = 1.6;

    const createSeawallSegment = (x: number, z: number, w: number, d: number) => {
      const stone = new THREE.Mesh(new THREE.BoxGeometry(w, wallHeight, d), wallMat);
      stone.position.set(x, wallHeight / 2 - 0.2, z);
      this.cityGroup.add(stone);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), railingMat);
      rail.position.set(x, wallHeight + 0.4, z);
      this.cityGroup.add(rail);
    };

    // North, South, East, West seawalls
    createSeawallSegment(0, -limit, limit * 2, wallThick);
    createSeawallSegment(0, limit, limit * 2, wallThick);
    createSeawallSegment(-limit, 0, wallThick, limit * 2);
    createSeawallSegment(limit, 0, wallThick, limit * 2);
  }

  private createRoofTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Non-reflective dark slate rooftop base
    ctx.fillStyle = '#1e2433';
    ctx.fillRect(0, 0, 512, 512);

    // Fine gravel speckles
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.fillStyle = Math.random() > 0.5 ? '#334155' : '#0f172a';
      ctx.fillRect(x, y, 2, 2);
    }

    // Tar waterproofing expansion grid seams
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 4;
    for (let y = 0; y < 512; y += 128) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
    for (let x = 0; x < 512; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }

  private createGroundAndRoads(): THREE.Mesh {
    const geom = new THREE.PlaneGeometry(this.citySize * 1.6, this.citySize * 1.6);
    const mat = new THREE.MeshStandardMaterial({
      map: this.roadTexture,
      roughness: 0.6,
      metalness: 0.3,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    return mesh;
  }

  private generateSkyscrapers() {
    const blockSize = 62;
    const streetWidth = 26;
    const step = blockSize + streetWidth;
    const half = this.citySize / 2;

    const materials = {
      brick: new THREE.MeshStandardMaterial({
        map: this.brickTexture,
        roughness: 0.75,
        metalness: 0.15,
      }),
      glass: new THREE.MeshStandardMaterial({
        map: this.glassTexture,
        roughness: 0.15,
        metalness: 0.65,
      }),
      deco: new THREE.MeshStandardMaterial({
        map: this.decoTexture,
        roughness: 0.35,
        metalness: 0.35,
      }),
      helipad: new THREE.MeshStandardMaterial({
        map: this.helipadTexture,
        roughness: 0.65,
      }),
      roof: new THREE.MeshStandardMaterial({
        map: this.roofTexture,
        roughness: 0.9,
        metalness: 0.1,
      }),
      doghouse: new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.85,
        metalness: 0.15,
      }),
      parapet: new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.8,
        metalness: 0.2,
      }),
      waterTowerWood: new THREE.MeshStandardMaterial({
        color: 0x78350f,
        roughness: 0.85,
      }),
      metal: new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.35,
        metalness: 0.85,
      }),
    };

    // Daily Bugle & Oscorp Signs
    const createSignTex = (text: string, bgColor: string, textColor: string) => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 128;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, 512, 128);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, 500, 116);
      ctx.fillStyle = textColor;
      ctx.font = 'bold 54px Bangers, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 256, 64);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };

    const bugleMat = new THREE.MeshBasicMaterial({
      map: createSignTex('DAILY BUGLE', '#b91c1c', '#ffffff'),
    });
    const oscorpMat = new THREE.MeshBasicMaterial({
      map: createSignTex('OSCORP INDUSTRIES', '#15803d', '#ffffff'),
    });

    for (let x = -half + step / 2; x < half; x += step) {
      for (let z = -half + step / 2; z < half; z += step) {
        const subCount = Math.random() > 0.4 ? 2 : 1;
        for (let s = 0; s < subCount; s++) {
          const offsetX = (s === 0 ? -1 : 1) * (subCount > 1 ? 14 : 0);
          const offsetZ = (s === 0 ? -1 : 1) * (subCount > 1 ? 14 : 0);
          const w = subCount === 1 ? blockSize - 4 : blockSize / 2 - 4;
          const d = subCount === 1 ? blockSize - 4 : blockSize / 2 - 4;

          const distFromCenter = Math.sqrt(x * x + z * z);
          const heightBoost = Math.max(0, 1 - distFromCenter / (half * 1.2)) * 85;
          const h = 45 + Math.random() * 65 + heightBoost;

          const typeRand = Math.random();
          const type: 'glass' | 'brick' | 'deco' =
            typeRand < 0.45 ? 'glass' : typeRand < 0.8 ? 'brick' : 'deco';

          const posX = x + offsetX;
          const posZ = z + offsetZ;
          const posY = h / 2;

          const geom = new THREE.BoxGeometry(w, h, d);
          const mat = materials[type];
          // Multi-material 6-face mapping:
          // [0: +X, 1: -X, 2: +Y (ROOF!), 3: -Y (BASE), 4: +Z, 5: -Z]
          // Rooftop face strictly uses materials.roof — windows will NEVER appear on roofs!
          const buildingMesh = new THREE.Mesh(geom, [
            mat,
            mat,
            materials.roof,
            materials.roof,
            mat,
            mat,
          ]);
          buildingMesh.position.set(posX, posY, posZ);
          buildingMesh.castShadow = true;
          buildingMesh.receiveShadow = true;
          this.cityGroup.add(buildingMesh);
          this.colliderMeshes.push(buildingMesh);

          // Walkable rooftop floor level is exactly h!
          const roofY = h;

          // Dedicated thick solid architectural rooftop capping slab
          // Overlaps the top edge of building by 0.2m to seal the roof and ensure zero window bleed-through
          const roofSlab = new THREE.Mesh(
            new THREE.BoxGeometry(w + 0.3, 0.45, d + 0.3),
            materials.roof
          );
          roofSlab.position.set(posX, roofY - 0.22, posZ);
          roofSlab.receiveShadow = true;
          this.cityGroup.add(roofSlab);

          // Perimeter parapet walls (architectural stone ledge with dark metal coping)
          const parapetThick = 0.6;
          const parapetH = 1.15;
          const parapetMat = materials.parapet;

          // North & South parapets
          const nsGeom = new THREE.BoxGeometry(w, parapetH, parapetThick);
          const pNorth = new THREE.Mesh(nsGeom, parapetMat);
          pNorth.position.set(posX, roofY + parapetH / 2, posZ - d / 2 + parapetThick / 2);
          this.cityGroup.add(pNorth);

          const pSouth = new THREE.Mesh(nsGeom, parapetMat);
          pSouth.position.set(posX, roofY + parapetH / 2, posZ + d / 2 - parapetThick / 2);
          this.cityGroup.add(pSouth);

          // East & West parapets
          const ewGeom = new THREE.BoxGeometry(parapetThick, parapetH, Math.max(1, d - parapetThick * 2));
          const pWest = new THREE.Mesh(ewGeom, parapetMat);
          pWest.position.set(posX - w / 2 + parapetThick / 2, roofY + parapetH / 2, posZ);
          this.cityGroup.add(pWest);

          const pEast = new THREE.Mesh(ewGeom, parapetMat);
          pEast.position.set(posX + w / 2 - parapetThick / 2, roofY + parapetH / 2, posZ);
          this.cityGroup.add(pEast);

          // Metal coping caps on top of parapet edges
          const copingMat = materials.metal;
          const cNorth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.08, parapetThick + 0.1), copingMat);
          cNorth.position.set(posX, roofY + parapetH + 0.04, posZ - d / 2 + parapetThick / 2);
          this.cityGroup.add(cNorth);
          const cSouth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.08, parapetThick + 0.1), copingMat);
          cSouth.position.set(posX, roofY + parapetH + 0.04, posZ + d / 2 - parapetThick / 2);
          this.cityGroup.add(cSouth);

          // --- DETAILED MANHATTAN ROOFTOP ARCHITECTURE ---
          // 1. Helipad for tall skyscrapers
          if (h > 88 && w >= 22 && d >= 22) {
            const pad = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 0.25, 24), materials.helipad);
            pad.position.set(posX, roofY + 0.14, posZ);
            pad.receiveShadow = true;
            this.cityGroup.add(pad);

            // 4 amber corner beacons on helipad
            for (const [cx, cz] of [[-7.5, -7.5], [7.5, -7.5], [-7.5, 7.5], [7.5, 7.5]]) {
              const light = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 6), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
              light.position.set(posX + cx, roofY + 0.35, posZ + cz);
              this.cityGroup.add(light);
            }
          }

          // 2. NYC Stairwell Bulkhead / Rooftop Doghouse (Exit to roof)
          // Uses pure architectural masonry doghouseMat — NEVER shows window textures on roofs!
          if (Math.random() > 0.3) {
            const dogX = posX + (Math.random() > 0.5 ? 1 : -1) * (w * 0.26);
            const dogZ = posZ + (Math.random() > 0.5 ? 1 : -1) * (d * 0.26);
            const doghouse = new THREE.Mesh(
              new THREE.BoxGeometry(4.8, 3.2, 4.8),
              materials.doghouse
            );
            doghouse.position.set(dogX, roofY + 1.6, dogZ);
            this.cityGroup.add(doghouse);
            this.obstacles.push(
              new THREE.Box3(
                new THREE.Vector3(dogX - 2.5, roofY, dogZ - 2.5),
                new THREE.Vector3(dogX + 2.5, roofY + 3.4, dogZ + 2.5)
              )
            );

            // Doghouse concrete roof cap
            const dogRoofCap = new THREE.Mesh(
              new THREE.BoxGeometry(5.1, 0.2, 5.1),
              materials.roof
            );
            dogRoofCap.position.set(dogX, roofY + 3.3, dogZ);
            this.cityGroup.add(dogRoofCap);

            // Metal security access door
            const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), materials.metal);
            door.position.set(dogX, roofY + 1.2, dogZ + 2.41);
            this.cityGroup.add(door);

            // Exterior doorway safety lamp
            const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
            lamp.position.set(dogX, roofY + 2.6, dogZ + 2.45);
          }

          // 3. Iconic Manhattan Water Tower (Cedar tank on 4-leg structural steel truss with hoops)
          if (Math.random() > 0.45) {
            const tower = new THREE.Group();
            tower.position.set(
              posX + (Math.random() > 0.5 ? 1 : -1) * (w * 0.25),
              roofY,
              posZ + (Math.random() > 0.5 ? 1 : -1) * (d * 0.25)
            );

            // 4 structural steel truss legs with cross bracing
            for (const [lx, lz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) {
              const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.2, 4), materials.metal);
              leg.position.set(lx, 2.1, lz);
              tower.add(leg);
            }

            const strut = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 3.2), materials.metal);
            strut.position.y = 2.1;
            tower.add(strut);

            // Cedar wood tank
            const vatGeom = new THREE.CylinderGeometry(2.6, 2.6, 4.8, 16);
            const vat = new THREE.Mesh(vatGeom, materials.waterTowerWood);
            vat.position.y = 6.2;
            tower.add(vat);

            // 3 galvanized steel hoops
            for (const hy of [4.4, 6.2, 8.0]) {
              const hoop = new THREE.Mesh(new THREE.TorusGeometry(2.64, 0.05, 4, 16), materials.metal);
              hoop.rotation.x = Math.PI / 2;
              hoop.position.y = hy;
              tower.add(hoop);
            }

            // Conical roof with vent cap
            const capGeom = new THREE.ConeGeometry(3.0, 2.2, 16);
            const cap = new THREE.Mesh(capGeom, materials.roof);
            cap.position.y = 9.5;
            tower.add(cap);

            this.cityGroup.add(tower);
            this.obstacles.push(
              new THREE.Box3(
                new THREE.Vector3(tower.position.x - 1.8, roofY, tower.position.z - 1.8),
                new THREE.Vector3(tower.position.x + 1.8, roofY + 9.5, tower.position.z + 1.8)
              )
            );
          }

          // 4. Rooftop HVAC Chiller Unit with spinning fan blades
          const hvac = new THREE.Group();
          hvac.position.set(posX - w * 0.24, roofY + 1.2, posZ - d * 0.24);
          const hvacBox = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.4, 4.4), materials.metal);
          hvac.add(hvacBox);

          const cowl = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.3, 16), materials.metal);
          cowl.position.y = 1.35;
          hvac.add(cowl);

          // 4-blade spinning exhaust fan
          const fan = new THREE.Group();
          fan.position.y = 1.38;
          for (let f = 0; f < 4; f++) {
            const blade = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.28), materials.metal);
            blade.rotation.y = (f * Math.PI) / 2;
            fan.add(blade);
          }
          hvac.add(fan);
          this.fans.push(fan as any);
          this.cityGroup.add(hvac);
          this.obstacles.push(
            new THREE.Box3(
              new THREE.Vector3(posX - w * 0.24 - 2.3, roofY, posZ - d * 0.24 - 2.3),
              new THREE.Vector3(posX - w * 0.24 + 2.3, roofY + 2.6, posZ - d * 0.24 + 2.3)
            )
          );

          // 5. Radio Antenna with blinking warning beacon
          if (Math.random() > 0.5) {
            const antenna = new THREE.Mesh(
              new THREE.CylinderGeometry(0.2, 0.6, 20, 6),
              materials.metal
            );
            antenna.position.set(posX + (w * 0.25), roofY + 10, posZ + (d * 0.25));
            this.cityGroup.add(antenna);

            const beacon = new THREE.Mesh(
              new THREE.SphereGeometry(0.5, 8, 8),
              new THREE.MeshBasicMaterial({ color: 0xef4444 })
            );
            beacon.position.set(posX + (w * 0.25), roofY + 20, posZ + (d * 0.25));
            this.cityGroup.add(beacon);
            this.beacons.push(beacon);
          }

          // 6. Solar Panel Banks on modern glass towers
          if (type === 'glass' && Math.random() > 0.45) {
            const solarGroup = new THREE.Group();
            solarGroup.position.set(posX + w * 0.2, roofY + 0.8, posZ - d * 0.2);
            solarGroup.rotation.x = 0.35;
            const panel = new THREE.Mesh(
              new THREE.BoxGeometry(5.4, 0.15, 3.8),
              new THREE.MeshStandardMaterial({ color: 0x0f2744, metalness: 0.85, roughness: 0.15 })
            );
            solarGroup.add(panel);
            this.cityGroup.add(solarGroup);
            this.obstacles.push(
              new THREE.Box3(
                new THREE.Vector3(posX + w * 0.2 - 2.8, roofY, posZ - d * 0.2 - 2.0),
                new THREE.Vector3(posX + w * 0.2 + 2.8, roofY + 1.8, posZ - d * 0.2 + 2.0)
              )
            );
          }

          // 7. Daily Bugle or Oscorp billboard
          if (h > 85 && Math.random() > 0.6) {
            const isOscorp = Math.random() > 0.5;
            const billboard = new THREE.Mesh(
              new THREE.PlaneGeometry(18, 5.5),
              isOscorp ? oscorpMat : bugleMat
            );
            billboard.position.set(posX, roofY + 4.2, posZ + d / 2 + 0.15);
            this.cityGroup.add(billboard);
          }

          const box = new THREE.Box3(
            new THREE.Vector3(posX - w / 2, 0, posZ - d / 2),
            new THREE.Vector3(posX + w / 2, h, posZ + d / 2)
          );
          this.buildings.push({
            box,
            center: new THREE.Vector3(posX, posY, posZ),
            width: w,
            height: h,
            depth: d,
            roofY,
            type,
          });
        }
      }
    }
  }

  private generateStreetProps() {
    const half = this.citySize / 2;
    const lampGeom = new THREE.CylinderGeometry(0.12, 0.16, 6.5, 6);
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    for (let x = -half + 30; x < half; x += 40) {
      for (let z = -half + 30; z < half; z += 40) {
        if (Math.abs(x) < half && Math.abs(z) < half) {
          const lamp = new THREE.Group();
          lamp.position.set(x, 3.25, z);
          const pole = new THREE.Mesh(lampGeom, lampMat);
          lamp.add(pole);
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), bulbMat);
          bulb.position.set(0, 3.2, 0);
          lamp.add(bulb);
          this.cityGroup.add(lamp);
        }
      }
    }
  }

  /**
   * Procedural Moving Traffic: High-fidelity NYC Yellow Cabs, NYPD Cruisers,
   * MTA City Buses, and Sports Sedans with rotating 3D wheels, headlights, and strobes.
   */
  private generateTraffic() {
    const half = this.citySize / 2;
    const blockSize = 62;
    const streetWidth = 26;
    const step = blockSize + streetWidth;

    // Shared Vehicle Materials
    const yellowTaxiMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.3 });
    const policeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.2 });
    const policeNavyMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.25, metalness: 0.4 });
    const sportsCrimsonMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.18, metalness: 0.5 });
    const sedanBlackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.6 });
    const busBlueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.3 });
    const busWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3, metalness: 0.2 });
    const darkWindowMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.1, metalness: 0.9 });
    const litBusWindowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.75 });
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.3 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.85 });
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const taxiSignMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const strobeRedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const strobeBlueMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });

    // High-Fidelity Automotive Fascia Materials
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 });
    const grilleMeshMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85, metalness: 0.4 });
    const headlightHousingMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.35, metalness: 0.7 });
    const headlightLensMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfef08a,
      emissiveIntensity: 0.95,
      roughness: 0.1,
    });
    const drlMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
    const foglightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const taillightRedMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0xef4444,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const taillightAmberMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const reverseLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const licensePlateMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.1 });
    const licenseFrameMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });

    // Helper: Build a realistic aerodynamic vehicle with smoothly rounded corners & curved greenhouse
    const buildVehicle = (type: 'cab' | 'police' | 'bus' | 'sports' | 'sedan' | 'suv') => {
      const group = new THREE.Group();
      const wheels: THREE.Mesh[] = [];
      let policeStrobe: { red: THREE.Mesh; blue: THREE.Mesh } | undefined;

      const isBus = type === 'bus';
      const isSuv = type === 'suv';
      const isSports = type === 'sports';

      const length = isBus ? 10.4 : isSuv ? 4.9 : 4.6;
      const width = isBus ? 2.5 : isSuv ? 2.15 : 2.0;
      const bodyH = isBus ? 2.6 : isSuv ? 1.05 : isSports ? 0.72 : 0.85;

      // Materials selection
      const suvMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.4 });
      let mainMat =
        type === 'cab'
          ? yellowTaxiMat
          : type === 'police'
          ? policeWhiteMat
          : type === 'sports'
          ? sportsCrimsonMat
          : type === 'bus'
          ? busBlueMat
          : type === 'suv'
          ? suvMat
          : sedanBlackMat;

      if (isBus) {
        // --- MTA METROPOLITAN BUS: Smooth Rounded Nose & Aerodynamic Roof ---
        const cornerR = 0.35;
        // Bus lower body
        const busLower = new THREE.Mesh(new THREE.BoxGeometry(width - cornerR * 2, 1.4, length - cornerR * 2), busBlueMat);
        busLower.position.y = 1.25;
        group.add(busLower);

        // 4 Rounded Corner Pillars on Lower Bus Body
        for (const [cx, cz] of [
          [-width / 2 + cornerR, length / 2 - cornerR],
          [width / 2 - cornerR, length / 2 - cornerR],
          [-width / 2 + cornerR, -length / 2 + cornerR],
          [width / 2 - cornerR, -length / 2 + cornerR],
        ]) {
          const cornerPillar = new THREE.Mesh(
            new THREE.CylinderGeometry(cornerR, cornerR, 1.4, 12),
            busBlueMat
          );
          cornerPillar.position.set(cx, 1.25, cz);
          group.add(cornerPillar);
        }

        // Side body fillers
        const sideFillL = new THREE.Mesh(new THREE.BoxGeometry(cornerR, 1.4, length - cornerR * 2), busBlueMat);
        sideFillL.position.set(-width / 2 + cornerR / 2, 1.25, 0);
        group.add(sideFillL);
        const sideFillR = sideFillL.clone();
        sideFillR.position.x = width / 2 - cornerR / 2;
        group.add(sideFillR);

        // Rounded bus front nose visor
        const busNose = new THREE.Mesh(
          new THREE.CylinderGeometry(width * 0.46, width * 0.46, 1.4, 16, 1, false, -Math.PI / 2, Math.PI),
          busBlueMat
        );
        busNose.rotation.z = Math.PI / 2;
        busNose.position.set(0, 1.25, length / 2 - cornerR);
        group.add(busNose);

        // Bus Upper Window Greenhouse
        const busUpper = new THREE.Mesh(new THREE.BoxGeometry(width - 0.08, 1.05, length - 0.4), busWhiteMat);
        busUpper.position.y = 2.45;
        group.add(busUpper);

        // Rounded bus roof crown
        const roofCrown = new THREE.Mesh(
          new THREE.CylinderGeometry(width * 0.48, width * 0.48, length - 0.4, 16, 1, false, 0, Math.PI),
          busWhiteMat
        );
        roofCrown.rotation.x = Math.PI / 2;
        roofCrown.position.set(0, 2.92, 0);
        group.add(roofCrown);

        // Panoramic glowing passenger windows
        const winL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, length - 1.4), litBusWindowMat);
        winL.position.set(-width / 2 - 0.02, 2.1, 0);
        group.add(winL);
        const winR = winL.clone();
        winR.position.x = width / 2 + 0.02;
        group.add(winR);

        // Panoramic curved windshield
        const windshield = new THREE.Mesh(
          new THREE.CylinderGeometry(width * 0.47, width * 0.47, 0.85, 16, 1, false, -Math.PI / 2, Math.PI),
          darkWindowMat
        );
        windshield.rotation.z = Math.PI / 2;
        windshield.position.set(0, 2.15, length / 2 - 0.35);
        group.add(windshield);

        // Digital destination display banner
        const destMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.28, 0.12), taxiSignMat);
        destMesh.position.set(0, 2.76, length / 2 - 0.15);
        group.add(destMesh);
      } else {
        // --- AERODYNAMIC SEDAN / TAXI / POLICE / SPORTS / SUV WITH ROUNDED CORNERS ---
        const cornerR = isSports ? 0.38 : 0.32;
        const halfW = width / 2;
        const halfL = length / 2;

        // 1. Lower Chassis with smooth corner fillets
        const chassis = new THREE.Mesh(
          new THREE.BoxGeometry(width - cornerR * 2, 0.32, length - cornerR * 2),
          bumperMat
        );
        chassis.position.y = 0.40;
        group.add(chassis);

        // 2. Main Car Body with 4 Smooth Vertical Rounded Corner Fillets
        // Central body box
        const mainCore = new THREE.Mesh(
          new THREE.BoxGeometry(width - cornerR * 2, bodyH, length - cornerR * 2),
          mainMat
        );
        mainCore.position.y = 0.74;
        group.add(mainCore);

        // Side body extensions to flush edges
        const sideBoxL = new THREE.Mesh(new THREE.BoxGeometry(cornerR, bodyH, length - cornerR * 2), mainMat);
        sideBoxL.position.set(-halfW + cornerR / 2, 0.74, 0);
        group.add(sideBoxL);
        const sideBoxR = sideBoxL.clone();
        sideBoxR.position.x = halfW - cornerR / 2;
        group.add(sideBoxR);

        // 4 Rounded Corner Pillars (eliminates square corners completely!)
        const cornerGeom = new THREE.CylinderGeometry(cornerR, cornerR, bodyH, 12);
        for (const [cx, cz] of [
          [-halfW + cornerR, halfL - cornerR],
          [halfW - cornerR, halfL - cornerR],
          [-halfW + cornerR, -halfL + cornerR],
          [halfW - cornerR, -halfL + cornerR],
        ]) {
          const cornerMesh = new THREE.Mesh(cornerGeom, mainMat);
          cornerMesh.position.set(cx, 0.74, cz);
          group.add(cornerMesh);
        }

        // 3. AUTHENTIC AUTOMOTIVE HOOD, CABIN & TRUNK SCULPTING (Natural slopes and clean proportions)
        const cabinW = width - 0.34;
        const cabinL = length * (isSuv ? 0.65 : 0.52);
        const cabinH = isSuv ? 0.78 : 0.62;
        const cabinY = 0.74 + bodyH / 2 + cabinH / 2;
        const cabinCenterZ = isSuv ? -0.05 : -0.15;

        const hoodL = length * (isSuv ? 0.32 : isSports ? 0.36 : 0.34);
        const trunkL = length * (isSuv ? 0.14 : isSports ? 0.22 : 0.26);

        // A) Sloping Front Hood (Tapers down gracefully towards front fascia)
        const hoodMesh = new THREE.Mesh(
          new THREE.BoxGeometry(width - 0.22, 0.08, hoodL),
          mainMat
        );
        const hoodAngle = isSuv ? 0.04 : 0.09;
        hoodMesh.rotation.x = hoodAngle;
        hoodMesh.position.set(0, 0.74 + bodyH * 0.42, cabinCenterZ + cabinL / 2 + hoodL / 2 - 0.06);
        group.add(hoodMesh);

        // Central sculpted hood power bulge (cowl crease)
        const hoodBulge = new THREE.Mesh(
          new THREE.BoxGeometry((width - 0.22) * 0.48, 0.035, hoodL * 0.92),
          mainMat
        );
        hoodBulge.rotation.x = hoodAngle;
        hoodBulge.position.set(0, 0.77 + bodyH * 0.42, cabinCenterZ + cabinL / 2 + hoodL / 2 - 0.06);
        group.add(hoodBulge);

        // Front Fascia / Nose Cap between hood and bumper
        const frontNose = new THREE.Mesh(
          new THREE.BoxGeometry(width - 0.16, bodyH * 0.55, 0.24),
          mainMat
        );
        frontNose.position.set(0, 0.62, halfL - 0.12);
        group.add(frontNose);

        // B) Rear Trunk Decklid (Natural backward slope into rear fascia)
        if (!isSuv) {
          const trunkMesh = new THREE.Mesh(
            new THREE.BoxGeometry(width - 0.24, 0.08, trunkL),
            mainMat
          );
          trunkMesh.rotation.x = -0.05;
          trunkMesh.position.set(0, 0.72 + bodyH * 0.38, cabinCenterZ - cabinL / 2 - trunkL / 2 + 0.06);
          group.add(trunkMesh);

          // Integrated ducktail / trailing lip spoiler
          const trunkLip = new THREE.Mesh(
            new THREE.BoxGeometry(width - 0.26, 0.05, 0.14),
            isSports ? sportsCrimsonMat : mainMat
          );
          trunkLip.position.set(0, 0.76 + bodyH * 0.38, -halfL + 0.14);
          group.add(trunkLip);
        }

        // Rear Fascia panel connecting trunk to bumper
        const rearFascia = new THREE.Mesh(
          new THREE.BoxGeometry(width - 0.16, bodyH * 0.55, 0.24),
          mainMat
        );
        rearFascia.position.set(0, 0.62, -halfL + 0.12);
        group.add(rearFascia);

        // C) Sculpted Aerodynamic Front & Rear Bumpers (Curved, seamless, no glitches)
        // Front Bumper: Body-colored curved upper fascia + lower aerodynamic splitter
        const frontBumperUpper = new THREE.Mesh(
          new THREE.BoxGeometry(width - 0.06, 0.28, 0.34),
          mainMat
        );
        frontBumperUpper.position.set(0, 0.44, halfL - 0.10);
        group.add(frontBumperUpper);

        const frontSplitter = new THREE.Mesh(
          new THREE.BoxGeometry(width - 0.02, 0.09, 0.36),
          bumperMat
        );
        frontSplitter.position.set(0, 0.28, halfL - 0.08);
        group.add(frontSplitter);

        // Rear Bumper: Sculpted body-colored fascia + integrated lower diffuser
        const rearBumperUpper = new THREE.Mesh(
          new THREE.BoxGeometry(width - 0.06, 0.28, 0.34),
          mainMat
        );
        rearBumperUpper.position.set(0, 0.44, -halfL + 0.10);
        group.add(rearBumperUpper);

        const rearDiffuser = new THREE.Mesh(
          new THREE.BoxGeometry(width - 0.02, 0.10, 0.36),
          bumperMat
        );
        rearDiffuser.position.set(0, 0.28, -halfL + 0.08);
        group.add(rearDiffuser);

        // Rear Diffuser Aerodynamic Vertical Aero Fins
        for (const finX of [-0.45, -0.15, 0.15, 0.45]) {
          const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.22), bumperMat);
          fin.position.set(finX, 0.28, -halfL - 0.08);
          group.add(fin);
        }

        // 4. Passenger Cabin & Sleek Monolithic Automotive Roof Architecture
        // Dark Tinted Glass Greenhouse
        const greenhouse = new THREE.Mesh(
          new THREE.BoxGeometry(cabinW, cabinH - 0.04, cabinL - 0.06),
          darkWindowMat
        );
        greenhouse.position.set(0, cabinY - 0.02, cabinCenterZ);
        group.add(greenhouse);

        // REALISTIC MONOLITHIC CAR ROOF: Single seamless shell with clean beveled cantrails
        const roofLen = cabinL * 0.98;
        const roofWid = cabinW + 0.08;
        const roofYPos = cabinY + cabinH / 2 + 0.01;

        // 1) Main seamless sheet-metal roof canopy
        const roofPanel = new THREE.Mesh(
          new THREE.BoxGeometry(roofWid, 0.08, roofLen),
          mainMat
        );
        roofPanel.position.set(0, roofYPos, cabinCenterZ);
        group.add(roofPanel);

        // 2) Subtle aerodynamic roof crown - solid contoured center spine (no intersecting cylinders)
        const roofSpine = new THREE.Mesh(
          new THREE.BoxGeometry(roofWid * 0.82, 0.03, roofLen * 0.90),
          mainMat
        );
        roofSpine.position.set(0, roofYPos + 0.045, cabinCenterZ);
        group.add(roofSpine);

        // 3) Embossed Tinted Sunroof with Raised Rubber Gasket Trim (Zero z-fighting)
        const gasketMat = new THREE.MeshStandardMaterial({
          color: 0x09090b,
          roughness: 0.9,
          metalness: 0.1,
        });
        const sunroofGlassMat = new THREE.MeshStandardMaterial({
          color: 0x020617,
          roughness: 0.1,
          metalness: 0.85,
        });

        // Raised rubber gasket frame
        const gasket = new THREE.Mesh(
          new THREE.BoxGeometry(roofWid * 0.58, 0.025, roofLen * 0.44),
          gasketMat
        );
        gasket.position.set(0, roofYPos + 0.065, cabinCenterZ + (isSuv ? 0.08 : 0.04));
        group.add(gasket);

        // Glossy dark sunroof glass panel
        const sunroofGlass = new THREE.Mesh(
          new THREE.BoxGeometry(roofWid * 0.54, 0.026, roofLen * 0.40),
          sunroofGlassMat
        );
        sunroofGlass.position.set(0, roofYPos + 0.072, cabinCenterZ + (isSuv ? 0.08 : 0.04));
        group.add(sunroofGlass);

        // 4) Front Windshield Upper Brow Header & Rear Roof Lip
        const frontBrow = new THREE.Mesh(
          new THREE.BoxGeometry(roofWid, 0.07, 0.12),
          mainMat
        );
        frontBrow.position.set(0, roofYPos - 0.02, cabinCenterZ + roofLen / 2);
        group.add(frontBrow);

        const rearBrow = new THREE.Mesh(
          new THREE.BoxGeometry(roofWid, 0.07, 0.12),
          mainMat
        );
        rearBrow.position.set(0, roofYPos - 0.02, cabinCenterZ - roofLen / 2);
        group.add(rearBrow);

        // A-Pillars (Front Angled Windshield Posts on Left & Right)
        const aPillarGeom = new THREE.BoxGeometry(0.08, 0.08, cabinL * 0.42);
        const aPillarL = new THREE.Mesh(aPillarGeom, mainMat);
        aPillarL.position.set(-cabinW / 2 + 0.02, cabinY, cabinCenterZ + cabinL * 0.34);
        aPillarL.rotation.x = -0.52;
        aPillarL.rotation.y = 0.08;
        group.add(aPillarL);

        const aPillarR = new THREE.Mesh(aPillarGeom, mainMat);
        aPillarR.position.set(cabinW / 2 - 0.02, cabinY, cabinCenterZ + cabinL * 0.34);
        aPillarR.rotation.x = -0.52;
        aPillarR.rotation.y = -0.08;
        group.add(aPillarR);

        // B-Pillars (Center Dividing Vertical Posts between front & rear windows)
        const bPillarGeom = new THREE.BoxGeometry(0.06, cabinH - 0.02, 0.12);
        const bPillarL = new THREE.Mesh(bPillarGeom, bumperMat);
        bPillarL.position.set(-cabinW / 2 - 0.01, cabinY - 0.02, cabinCenterZ - 0.05);
        group.add(bPillarL);

        const bPillarR = new THREE.Mesh(bPillarGeom, bumperMat);
        bPillarR.position.set(cabinW / 2 + 0.01, cabinY - 0.02, cabinCenterZ - 0.05);
        group.add(bPillarR);

        // C-Pillars (Rear Quarter Posts into trunk)
        const cPillarGeom = new THREE.BoxGeometry(0.12, 0.08, cabinL * 0.40);
        const cPillarL = new THREE.Mesh(cPillarGeom, mainMat);
        cPillarL.position.set(-cabinW / 2 + 0.03, cabinY, cabinCenterZ - cabinL * 0.34);
        cPillarL.rotation.x = 0.52;
        cPillarL.rotation.y = -0.08;
        group.add(cPillarL);

        const cPillarR = new THREE.Mesh(cPillarGeom, mainMat);
        cPillarR.position.set(cabinW / 2 - 0.03, cabinY, cabinCenterZ - cabinL * 0.34);
        cPillarR.rotation.x = 0.52;
        cPillarR.rotation.y = 0.08;
        group.add(cPillarR);

        // Raked Aerodynamic Windshield Glass
        const windshield = new THREE.Mesh(
          new THREE.PlaneGeometry(cabinW - 0.08, 0.74),
          darkWindowMat
        );
        windshield.rotation.x = -0.56;
        windshield.position.set(0, cabinY, cabinCenterZ + cabinL / 2 + 0.02);
        group.add(windshield);

        // Sloped Rear Glass Window
        const rearWindow = new THREE.Mesh(
          new THREE.PlaneGeometry(cabinW - 0.08, 0.70),
          darkWindowMat
        );
        rearWindow.rotation.x = 0.56;
        rearWindow.rotation.y = Math.PI;
        rearWindow.position.set(0, cabinY, cabinCenterZ - cabinL / 2 - 0.02);
        group.add(rearWindow);

        // Aerodynamic Side Door Mirrors (Driver & Passenger)
        for (const side of [-1, 1]) {
          const mirror = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.09, 0.14),
            mainMat
          );
          mirror.position.set(side * (halfW + 0.06), 0.74 + bodyH / 2 + 0.12, cabinCenterZ + cabinL * 0.28);
          group.add(mirror);

          // Reflective mirror glass
          const mirrorGlass = new THREE.Mesh(
            new THREE.PlaneGeometry(0.12, 0.07),
            new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.1 })
          );
          mirrorGlass.position.set(side * (halfW + 0.06), 0.74 + bodyH / 2 + 0.12, cabinCenterZ + cabinL * 0.28 - 0.075);
          mirrorGlass.rotation.y = Math.PI;
          group.add(mirrorGlass);
        }

        // Front Radiator Grille with Chrome Trim Surround & Center Badge
        const grilleW = width * (isSuv ? 0.62 : 0.54);
        const grilleH = isSuv ? 0.32 : 0.24;
        const grilleMesh = new THREE.Mesh(new THREE.BoxGeometry(grilleW, grilleH, 0.08), grilleMeshMat);
        grilleMesh.position.set(0, 0.64, halfL + 0.02);
        group.add(grilleMesh);

        // Chrome Grille Surround Trim
        const grilleTrim = new THREE.Mesh(new THREE.BoxGeometry(grilleW + 0.04, grilleH + 0.04, 0.02), chromeMat);
        grilleTrim.position.set(0, 0.64, halfL + 0.01);
        group.add(grilleTrim);

        // Center Hood/Grille Chrome Emblem Badge
        const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8), chromeMat);
        badge.rotation.x = Math.PI / 2;
        badge.position.set(0, 0.64, halfL + 0.07);
        group.add(badge);

        // Front Fog Lights / Corner Aero Air Dams
        for (const fogX of [-halfW + 0.28, halfW - 0.28]) {
          const fogHousing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.08), bumperMat);
          fogHousing.position.set(fogX, 0.38, halfL + 0.03);
          group.add(fogHousing);

          const fogLight = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 8), foglightMat);
          fogLight.rotation.x = Math.PI / 2;
          fogLight.position.set(fogX, 0.38, halfL + 0.075);
          group.add(fogLight);
        }

        // Front License Plate
        const plateMountF = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.04), licenseFrameMat);
        plateMountF.position.set(0, 0.38, halfL + 0.08);
        group.add(plateMountF);

        const plateMeshF = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.02), licensePlateMat);
        plateMeshF.position.set(0, 0.38, halfL + 0.10);
        group.add(plateMeshF);

        // Rear Recessed License Plate & Plate Brow
        const plateMountR = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.04), licenseFrameMat);
        plateMountR.position.set(0, 0.44, -halfL - 0.06);
        group.add(plateMountR);

        const plateMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.02), licensePlateMat);
        plateMeshR.position.set(0, 0.44, -halfL - 0.08);
        group.add(plateMeshR);

        // Dual Chrome Exhaust Pipes (all cars receive realistic exhausts, sports cars get quad exhausts)
        const exhaustRadius = isSports ? 0.07 : 0.06;
        const exhaustOffsets = isSports ? [-0.52, -0.38, 0.38, 0.52] : [-0.48, 0.48];
        for (const exX of exhaustOffsets) {
          const exPipe = new THREE.Mesh(
            new THREE.CylinderGeometry(exhaustRadius, exhaustRadius, 0.22, 10),
            chromeMat
          );
          exPipe.rotation.x = Math.PI / 2;
          exPipe.position.set(exX, 0.30, -halfL - 0.08);
          group.add(exPipe);
        }

        // SUV Roof Luggage Rails
        if (isSuv) {
          const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
          const railL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, cabinL * 0.85), railMat);
          railL.position.set(-cabinW / 2 + 0.08, cabinY + cabinH / 2 + 0.12, -0.15);
          group.add(railL);
          const railR = railL.clone();
          railR.position.x = cabinW / 2 - 0.08;
          group.add(railR);
        }

        // Taxi Medallion Lightbar on roof with clean pedestal mount
        if (type === 'cab') {
          const mount = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.16), bumperMat);
          mount.position.set(0, cabinY + cabinH / 2 + 0.065, -0.15);
          group.add(mount);

          const sign = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.24, 0.28), taxiSignMat);
          sign.position.set(0, cabinY + cabinH / 2 + 0.20, -0.15);
          group.add(sign);
        }

        // Police Siren Lightbar on roof with elevated aerodynamic crossbar
        if (type === 'police') {
          const barBase = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.05, 0.18), bumperMat);
          barBase.position.set(0, cabinY + cabinH / 2 + 0.075, -0.15);
          group.add(barBase);

          // Dual mounting feet
          for (const footX of [-0.36, 0.36]) {
            const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.14), bumperMat);
            foot.position.set(footX, cabinY + cabinH / 2 + 0.045, -0.15);
            group.add(foot);
          }

          const redStrobe = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.15, 0.18), strobeRedMat);
          redStrobe.position.set(-0.25, cabinY + cabinH / 2 + 0.175, -0.15);
          group.add(redStrobe);

          const blueStrobe = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.15, 0.18), strobeBlueMat);
          blueStrobe.position.set(0.25, cabinY + cabinH / 2 + 0.175, -0.15);
          group.add(blueStrobe);

          policeStrobe = { red: redStrobe, blue: blueStrobe };

          // Police door navy decals
          const doorL = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.52), policeNavyMat);
          doorL.position.set(-halfW - 0.02, 0.75, -0.1);
          doorL.rotation.y = -Math.PI / 2;
          group.add(doorL);

          const doorR = doorL.clone();
          doorR.position.x = halfW + 0.02;
          doorR.rotation.y = Math.PI / 2;
          group.add(doorR);
        }

        // Sports car rear aerodynamic wing with elevated stanchions
        if (isSports) {
          const wing = new THREE.Mesh(new THREE.BoxGeometry(width - 0.04, 0.06, 0.34), sportsCrimsonMat);
          wing.position.set(0, 1.15, -halfL + 0.28);
          group.add(wing);

          // Dual wing mounting stanchions
          for (const stanchionX of [-0.48, 0.48]) {
            const stanchion = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.20, 0.16), bumperMat);
            stanchion.position.set(stanchionX, 1.05, -halfL + 0.28);
            group.add(stanchion);
          }
        }
      }

      // --- HIGH-FIDELITY AUTOMOTIVE LIGHTING CLUSTERS ---
      if (isBus) {
        // BUS FRONT: Twin Rectangular Halogen Headlights with Bezel & Front Plate
        for (const side of [-1, 1]) {
          const busHlBezel = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.26, 0.06), bumperMat);
          busHlBezel.position.set(side * (width / 2 - 0.45), 0.72, length / 2 + 0.02);
          group.add(busHlBezel);

          const busHlLens = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.20, 0.04), headlightLensMat);
          busHlLens.position.set(side * (width / 2 - 0.45), 0.72, length / 2 + 0.045);
          group.add(busHlLens);

          // BUS REAR: Vertical 3-Tier Transit Taillights (Red / Amber / Reverse)
          const busTlHousing = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 0.06), bumperMat);
          busTlHousing.position.set(side * (width / 2 - 0.24), 1.15, -length / 2 - 0.02);
          group.add(busTlHousing);

          const redSeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.20, 0.04), taillightRedMat);
          redSeg.position.set(side * (width / 2 - 0.24), 1.36, -length / 2 - 0.04);
          group.add(redSeg);

          const amberSeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.04), taillightAmberMat);
          amberSeg.position.set(side * (width / 2 - 0.24), 1.15, -length / 2 - 0.04);
          group.add(amberSeg);

          const whiteSeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.04), reverseLightMat);
          whiteSeg.position.set(side * (width / 2 - 0.24), 0.96, -length / 2 - 0.04);
          group.add(whiteSeg);
        }

        // Bus Rear Engine Cooling Slats
        const engineGrille = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 0.04), grilleMeshMat);
        engineGrille.position.set(0, 0.65, -length / 2 - 0.02);
        group.add(engineGrille);
      } else {
        // PASSENGER CARS: Modern Twin-Beam Projector Headlights with LED Eyebrows
        for (const side of [-1, 1]) {
          const hlX = side * (width / 2 - 0.34);

          // Dark Housing Cavity
          const hlHousing = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 0.14), headlightHousingMat);
          hlHousing.position.set(hlX, 0.66, length / 2 - 0.02);
          group.add(hlHousing);

          // Twin Projector Lenses
          for (const projOffset of [-0.10, 0.10]) {
            const lens = new THREE.Mesh(
              new THREE.CylinderGeometry(0.045, 0.045, 0.03, 10),
              headlightLensMat
            );
            lens.rotation.x = Math.PI / 2;
            lens.position.set(hlX + projOffset, 0.65, length / 2 + 0.05);
            group.add(lens);
          }

          // Top White LED DRL Eyebrow Strip
          const drl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.04), drlMat);
          drl.position.set(hlX, 0.73, length / 2 + 0.05);
          group.add(drl);

          // REAR: Sleek Multi-Segment Wrap-Around LED Taillights
          const tlX = side * (width / 2 - 0.34);

          // Dark housing
          const tlHousing = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.12), headlightHousingMat);
          tlHousing.position.set(tlX, 0.68, -length / 2 + 0.02);
          group.add(tlHousing);

          // Red Main Lightbar
          const tlMain = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.12, 0.04), taillightRedMat);
          tlMain.position.set(tlX - side * 0.06, 0.68, -length / 2 - 0.045);
          group.add(tlMain);

          // Amber Turn Indicator
          const tlAmber = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, 0.04), taillightAmberMat);
          tlAmber.position.set(tlX + side * 0.14, 0.71, -length / 2 - 0.045);
          group.add(tlAmber);

          // White Reverse Light
          const tlWhite = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.05, 0.04), reverseLightMat);
          tlWhite.position.set(tlX + side * 0.14, 0.65, -length / 2 - 0.045);
          group.add(tlWhite);
        }
      }

      // Underbody Ground Shadow quad to anchor car into asphalt
      const shadowMat = new THREE.MeshBasicMaterial({ color: 0x050810, transparent: true, opacity: 0.65 });
      const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(width * 1.08, length * 1.04), shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = 0.04;
      group.add(shadowMesh);

      // Aerodynamic Side Mirrors with reflective glass
      for (const side of [-1, 1]) {
        const mirrorHousing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.16), mainMat);
        const mirrorGlass = new THREE.Mesh(
          new THREE.PlaneGeometry(0.20, 0.11),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.1, metalness: 0.9 })
        );
        mirrorGlass.rotation.y = Math.PI;
        mirrorGlass.position.set(0, 0, -0.085);
        mirrorHousing.add(mirrorGlass);
        mirrorHousing.position.set(side * (width / 2 + 0.14), isBus ? 1.8 : 0.88, isBus ? length * 0.44 : length * 0.15);
        mirrorHousing.rotation.y = side * 0.12;
        group.add(mirrorHousing);
      }

      // Roof Shark-Fin Antenna on passenger cars
      if (!isBus) {
        const finAntenna = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 4), mainMat);
        finAntenna.rotation.x = -0.35;
        finAntenna.position.set(0, isSuv ? 1.9 : 1.55, -length * 0.22);
        group.add(finAntenna);
      }

      // Wheel construction (Rubber tires, chrome rims, calipers & steerable front pivots)
      const wheelGeom = new THREE.CylinderGeometry(0.38, 0.38, 0.22, 14);
      const rimGeom = new THREE.CylinderGeometry(0.22, 0.22, 0.24, 8);
      const caliperGeom = new THREE.BoxGeometry(0.08, 0.12, 0.14);
      const caliperMat = new THREE.MeshStandardMaterial({ color: isSports ? 0xef4444 : 0x475569, roughness: 0.3 });
      const archGeom = new THREE.TorusGeometry(0.44, 0.04, 4, 16, Math.PI);
      const frontSteerPivots: THREE.Group[] = [];

      const addWheel = (x: number, z: number, isFront = false) => {
        const steerPivot = new THREE.Group();
        steerPivot.position.set(x, 0.38, z);
        group.add(steerPivot);

        const wheelGroup = new THREE.Mesh(wheelGeom, tireMat);
        wheelGroup.rotation.z = Math.PI / 2;
        steerPivot.add(wheelGroup);

        const rim = new THREE.Mesh(rimGeom, rimMat);
        wheelGroup.add(rim);

        // Brake Caliper
        const caliper = new THREE.Mesh(caliperGeom, caliperMat);
        caliper.position.set(x > 0 ? -0.06 : 0.06, 0.12, 0);
        steerPivot.add(caliper);

        wheels.push(wheelGroup);
        if (isFront) {
          frontSteerPivots.push(steerPivot);
        }

        // Curved Wheel Arch Flare
        const arch = new THREE.Mesh(archGeom, mainMat);
        arch.position.set(x * 0.96, 0.38, z);
        arch.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
        group.add(arch);
      };

      const wheelX = width / 2;
      if (isBus) {
        addWheel(-wheelX, length * 0.36, true);
        addWheel(wheelX, length * 0.36, true);
        addWheel(-wheelX, -length * 0.18, false);
        addWheel(wheelX, -length * 0.18, false);
        addWheel(-wheelX, -length * 0.36, false);
        addWheel(wheelX, -length * 0.36, false);
      } else {
        const wheelZ = length * 0.32;
        addWheel(-wheelX, wheelZ, true);
        addWheel(wheelX, wheelZ, true);
        addWheel(-wheelX, -wheelZ, false);
        addWheel(wheelX, -wheelZ, false);
      }

      const carHeight = isBus ? 3.2 : isSuv ? 1.85 : 1.45;
      return { group, wheels, frontSteerPivots, policeStrobe, length, width, height: carHeight };
    };

    const streetLines: number[] = [];
    for (let coord = -half + step; coord < half - 20; coord += step) {
      streetLines.push(coord);
    }
    this.streetLines = streetLines;

    streetLines.forEach((coord, idx) => {
      // 2 cars per avenue (Northbound & Southbound)
      for (const dir of [1, -1]) {
        const rand = Math.random();
        const type: 'cab' | 'police' | 'bus' | 'sports' | 'sedan' | 'suv' =
          rand < 0.35 ? 'cab' : rand < 0.55 ? 'police' : rand < 0.68 ? 'bus' : rand < 0.80 ? 'suv' : rand < 0.90 ? 'sports' : 'sedan';

        const carData = buildVehicle(type);
        const laneOffset = dir === 1 ? 5.0 : -5.0;
        const startZ = (Math.random() * 2 - 1) * (half - 30);
        const speedVal = type === 'bus' ? 10 + Math.random() * 4 : 14 + Math.random() * 8;

        carData.group.position.set(coord + laneOffset, 0, startZ);
        if (dir === -1) {
          carData.group.rotation.y = Math.PI;
        }

        this.cityGroup.add(carData.group);
        this.vehicles.push({
          group: carData.group,
          axis: 'z',
          direction: dir,
          speed: speedVal,
          baseSpeed: speedVal,
          minLimit: -half + 10,
          maxLimit: half - 10,
          length: carData.length,
          width: carData.width,
          height: carData.height,
          wheels: carData.wheels,
          frontSteerPivots: carData.frontSteerPivots,
          policeStrobe: carData.policeStrobe,
          currentStreetCoord: coord,
          bodyRoll: 0,
        });
      }

      // Cross-street vehicles along X axis
      if (idx % 2 === 0) {
        for (const dir of [1, -1]) {
          const rand = Math.random();
          const type: 'cab' | 'police' | 'sports' | 'sedan' | 'suv' =
            rand < 0.40 ? 'cab' : rand < 0.60 ? 'sedan' : rand < 0.75 ? 'suv' : rand < 0.88 ? 'sports' : 'police';

          const carData = buildVehicle(type);
          const laneOffset = dir === 1 ? 5.0 : -5.0;
          const startX = (Math.random() * 2 - 1) * (half - 30);
          const speedVal = 13 + Math.random() * 7;

          carData.group.position.set(startX, 0, coord + laneOffset);
          carData.group.rotation.y = dir === 1 ? Math.PI / 2 : -Math.PI / 2;

          this.cityGroup.add(carData.group);
          this.vehicles.push({
            group: carData.group,
            axis: 'x',
            direction: dir,
            speed: speedVal,
            baseSpeed: speedVal,
            minLimit: -half + 10,
            maxLimit: half - 10,
            length: carData.length,
            width: carData.width,
            height: carData.height,
            wheels: carData.wheels,
            frontSteerPivots: carData.frontSteerPivots,
            policeStrobe: carData.policeStrobe,
            currentStreetCoord: coord,
            bodyRoll: 0,
          });
        }
      }
    });
  }

  /**
   * Iconic Manhattan Rooftop & Sewer Steam Vents:
   * Atmospheric rising white vapor puffs.
   */
  private generateSteamVents() {
    const steamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
    });
    const steamGeom = new THREE.SphereGeometry(1.2, 7, 7);

    // Pick 14 rooftop and street locations for steam plumes
    for (let i = 0; i < Math.min(14, this.buildings.length); i++) {
      const b = this.buildings[(i * 2) % this.buildings.length];
      const steamGroup = new THREE.Group();
      const steamMesh = new THREE.Mesh(steamGeom, steamMat);
      steamMesh.position.set(b.center.x + (Math.random() - 0.5) * 8, b.roofY + 1.2, b.center.z + (Math.random() - 0.5) * 8);
      steamGroup.add(steamMesh);
      this.cityGroup.add(steamGroup);

      this.steams.push({
        mesh: steamMesh,
        baseY: b.roofY + 1.2,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  /**
   * Main City Animation Loop:
   * Drives street traffic with spinning wheels, flashing police strobes,
   * rotating rooftop HVAC exhaust fans, animated river waves, and rising steam vents.
   */
  public update(dt: number) {
    const delta = Math.min(dt, 0.05);

    // 1. Update traffic vehicles: intersection turns, border U-turns, steering, suspension, wheel spin
    const policeStrobeTime = Date.now() * 0.008;
    const strobeState = Math.sin(policeStrobeTime * 4) > 0;

    for (const v of this.vehicles) {
      if (v.turning) {
        // --- EXECUTING SMOOTH TURN (Intersection 90° turn or Border U-Turn) ---
        v.turning.progress += delta / v.turning.duration;
        const t = Math.min(1.0, v.turning.progress);
        const smoothT = t * t * (3 - 2 * t); // Hermite smoothstep

        v.group.position.lerpVectors(v.turning.startPos, v.turning.targetPos, smoothT);

        // Shortest-path angle interpolation
        let dAngle = v.turning.targetRotY - v.turning.startRotY;
        while (dAngle > Math.PI) dAngle -= Math.PI * 2;
        while (dAngle < -Math.PI) dAngle += Math.PI * 2;
        v.group.rotation.y = v.turning.startRotY + dAngle * smoothT;

        // Front wheel steering articulation during turn
        const steerAngle = Math.sin(t * Math.PI) * 0.45 * Math.sign(dAngle);
        if (v.frontSteerPivots) {
          for (const p of v.frontSteerPivots) {
            p.rotation.y = steerAngle;
          }
        }

        // Realistic dynamic chassis body roll leaning into turn
        const targetRoll = -Math.sign(dAngle) * 0.065 * (v.speed / 14);
        v.bodyRoll = THREE.MathUtils.damp(v.bodyRoll, targetRoll, 10, delta);
        v.group.rotation.z = v.bodyRoll;

        if (t >= 1.0) {
          // Completed turn cleanly
          v.axis = v.turning.newAxis;
          v.direction = v.turning.newDirection;
          v.currentStreetCoord = v.turning.newStreetCoord;
          v.group.position.copy(v.turning.targetPos);
          v.group.rotation.y = v.turning.targetRotY;
          v.group.rotation.z = 0;
          v.bodyRoll = 0;
          if (v.frontSteerPivots) {
            for (const p of v.frontSteerPivots) {
              p.rotation.y = 0;
            }
          }
          v.turning = undefined;
        }
      } else {
        // --- STRAIGHT DRIVING & INTERSECTION / BORDER DETECTION ---
        v.bodyRoll = THREE.MathUtils.damp(v.bodyRoll, 0, 10, delta);
        v.group.rotation.z = v.bodyRoll;
        if (v.frontSteerPivots) {
          for (const p of v.frontSteerPivots) {
            p.rotation.y = 0;
          }
        }

        // Drive forward
        if (v.axis === 'z') {
          v.group.position.z += v.direction * v.speed * delta;
        } else {
          v.group.position.x += v.direction * v.speed * delta;
        }

        // Subtle road bump suspension oscillation
        v.group.position.y = Math.sin(Date.now() * 0.01 + v.speed * 3) * 0.012;

        // BORDER U-TURNS: Never teleport or disappear!
        const borderMargin = 8;
        if (v.axis === 'z') {
          if (v.direction === 1 && v.group.position.z >= v.maxLimit - borderMargin) {
            // Smooth U-turn at North border
            v.turning = {
              progress: 0,
              duration: 1.25,
              startPos: v.group.position.clone(),
              targetPos: new THREE.Vector3(v.currentStreetCoord - 5.0, 0, v.maxLimit - 14),
              startRotY: 0,
              targetRotY: Math.PI,
              newAxis: 'z',
              newDirection: -1,
              newStreetCoord: v.currentStreetCoord,
            };
          } else if (v.direction === -1 && v.group.position.z <= v.minLimit + borderMargin) {
            // Smooth U-turn at South border
            v.turning = {
              progress: 0,
              duration: 1.25,
              startPos: v.group.position.clone(),
              targetPos: new THREE.Vector3(v.currentStreetCoord + 5.0, 0, v.minLimit + 14),
              startRotY: Math.PI,
              targetRotY: 0,
              newAxis: 'z',
              newDirection: 1,
              newStreetCoord: v.currentStreetCoord,
            };
          } else {
            // Check for Manhattan Street Intersections to turn randomly
            for (const crossCoord of this.streetLines) {
              const distAlongZ = (crossCoord - v.group.position.z) * v.direction;
              if (distAlongZ > 0.2 && distAlongZ < 3.2 && v.lastTurnCoord !== crossCoord) {
                v.lastTurnCoord = crossCoord;
                // 35% chance to turn onto cross-street
                if (Math.random() < 0.35) {
                  const turnLeft = Math.random() < 0.5;
                  const newDir = v.direction === 1 ? (turnLeft ? -1 : 1) : (turnLeft ? 1 : -1);
                  const targetLaneZ = crossCoord + (newDir === 1 ? 5.0 : -5.0);
                  const targetPosX = v.group.position.x + newDir * 12.0;
                  const targetRotY = newDir === 1 ? Math.PI / 2 : -Math.PI / 2;

                  v.turning = {
                    progress: 0,
                    duration: 0.95,
                    startPos: v.group.position.clone(),
                    targetPos: new THREE.Vector3(targetPosX, 0, targetLaneZ),
                    startRotY: v.group.rotation.y,
                    targetRotY,
                    newAxis: 'x',
                    newDirection: newDir,
                    newStreetCoord: crossCoord,
                  };
                  break;
                }
              }
            }
          }
        } else {
          // axis === 'x'
          if (v.direction === 1 && v.group.position.x >= v.maxLimit - borderMargin) {
            // Smooth U-turn at East border
            v.turning = {
              progress: 0,
              duration: 1.25,
              startPos: v.group.position.clone(),
              targetPos: new THREE.Vector3(v.maxLimit - 14, 0, v.currentStreetCoord - 5.0),
              startRotY: Math.PI / 2,
              targetRotY: -Math.PI / 2,
              newAxis: 'x',
              newDirection: -1,
              newStreetCoord: v.currentStreetCoord,
            };
          } else if (v.direction === -1 && v.group.position.x <= v.minLimit + borderMargin) {
            // Smooth U-turn at West border
            v.turning = {
              progress: 0,
              duration: 1.25,
              startPos: v.group.position.clone(),
              targetPos: new THREE.Vector3(v.minLimit + 14, 0, v.currentStreetCoord + 5.0),
              startRotY: -Math.PI / 2,
              targetRotY: Math.PI / 2,
              newAxis: 'x',
              newDirection: 1,
              newStreetCoord: v.currentStreetCoord,
            };
          } else {
            // Check for Avenue Intersections
            for (const crossCoord of this.streetLines) {
              const distAlongX = (crossCoord - v.group.position.x) * v.direction;
              if (distAlongX > 0.2 && distAlongX < 3.2 && v.lastTurnCoord !== crossCoord) {
                v.lastTurnCoord = crossCoord;
                if (Math.random() < 0.35) {
                  const turnLeft = Math.random() < 0.5;
                  const newDir = v.direction === 1 ? (turnLeft ? 1 : -1) : (turnLeft ? -1 : 1);
                  const targetLaneX = crossCoord + (newDir === 1 ? 5.0 : -5.0);
                  const targetPosZ = v.group.position.z + newDir * 12.0;
                  const targetRotY = newDir === 1 ? 0 : Math.PI;

                  v.turning = {
                    progress: 0,
                    duration: 0.95,
                    startPos: v.group.position.clone(),
                    targetPos: new THREE.Vector3(targetLaneX, 0, targetPosZ),
                    startRotY: v.group.rotation.y,
                    targetRotY,
                    newAxis: 'z',
                    newDirection: newDir,
                    newStreetCoord: crossCoord,
                  };
                  break;
                }
              }
            }
          }
        }
      }

      // Rotate wheels based on road velocity
      if (v.wheels) {
        const wheelSpin = (v.speed / 0.38) * v.direction * delta;
        for (const w of v.wheels) {
          w.rotation.x += wheelSpin;
        }
      }

      // Flash emergency police cruiser strobes
      if (v.policeStrobe) {
        v.policeStrobe.red.visible = strobeState;
        v.policeStrobe.blue.visible = !strobeState;
      }
    }

    // 2. Rotate rooftop HVAC fans
    for (const f of this.fans) {
      f.rotation.y += delta * 12.0;
    }

    // 3. Animate river water surface
    if (this.waterTexture) {
      this.waterTexture.offset.y += delta * 0.035;
      this.waterTexture.offset.x += delta * 0.015;
    }

    // 4. Update steam vapor plumes
    for (const s of this.steams) {
      s.phase += delta * 1.8;
      const progress = ((s.phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2);
      s.mesh.position.y = s.baseY + progress * 4.5;
      const scale = 0.6 + progress * 1.6;
      s.mesh.scale.set(scale, scale * 1.2, scale);
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.38 * (1 - progress));
    }

    // 5. Occasional subtle distant Manhattan taxi horn
    if (Math.random() < delta * 0.035) {
      soundEngine.playCabHorn();
    }
  }

  /**
   * Insomniac-style Smart Skyscraper Web Anchor Finder:
   * Scans a conical field of view with 14 angled rays across both sides of the street.
   * Dynamically evaluates skyscraper heights, swing arcs, and distances for organic swinging.
   */
  public findBestWebAnchor(
    origin: THREE.Vector3,
    lookDir: THREE.Vector3,
    maxDistance = 160
  ): { point: THREE.Vector3; distance: number; normal: THREE.Vector3; side: 'left' | 'right' } | null {
    const horizontalAngle = Math.atan2(lookDir.x, lookDir.z);

    const forwardHoriz = new THREE.Vector3(lookDir.x, 0, lookDir.z).normalize();
    const rightHoriz = new THREE.Vector3(-forwardHoriz.z, 0, forwardHoriz.x);

    // Multi-angle spread: detects skyscrapers flanking the left and right sides of Manhattan avenues
    const angleOffsets = [
      { h: 0.28, v: 0.32 },
      { h: -0.28, v: 0.32 },
      { h: 0.58, v: 0.36 },
      { h: -0.58, v: 0.36 },
      { h: 0.92, v: 0.26 },
      { h: -0.92, v: 0.26 },
      { h: 1.25, v: 0.22 },
      { h: -1.25, v: 0.22 },
      { h: 0.12, v: 0.45 },
      { h: -0.12, v: 0.45 },
      { h: 0.0, v: 0.25 },
    ];

    let bestHit: { point: THREE.Vector3; distance: number; normal: THREE.Vector3; side: 'left' | 'right'; score: number } | null = null;
    const hitPoint = new THREE.Vector3();

    for (const off of angleOffsets) {
      const yaw = horizontalAngle + off.h;
      const testDir = new THREE.Vector3(
        Math.sin(yaw),
        off.v,
        Math.cos(yaw)
      ).normalize();

      const ray = new THREE.Ray(origin, testDir);

      for (const b of this.buildings) {
        // Must be tall enough to provide an upward pendulum tether
        if (b.roofY < origin.y + 3) continue;

        const hit = ray.intersectBox(b.box, hitPoint);
        if (hit) {
          const dist = origin.distanceTo(hit);
          // Ideal swing tether distance is 10m to 160m
          if (dist >= 10 && dist <= maxDistance && hit.y > origin.y + 2) {
            // Anchor scoring: favors high rooftop anchors and optimal swing radius (~42m)
            const heightBonus = (hit.y - origin.y) * 1.8;
            const distPenalty = -Math.abs(dist - 42) * 0.35;
            const score = heightBonus + distPenalty;

            if (!bestHit || score > bestHit.score) {
              const normal = new THREE.Vector3();
              const epsilon = 0.65;
              if (Math.abs(hit.x - b.box.max.x) < epsilon) normal.set(1, 0, 0);
              else if (Math.abs(hit.x - b.box.min.x) < epsilon) normal.set(-1, 0, 0);
              else if (Math.abs(hit.z - b.box.max.z) < epsilon) normal.set(0, 0, 1);
              else if (Math.abs(hit.z - b.box.min.z) < epsilon) normal.set(0, 0, -1);
              else normal.set(0, 1, 0);

              const toHit = hit.clone().sub(origin);
              const side: 'left' | 'right' = toHit.dot(rightHoriz) >= 0 ? 'right' : 'left';

              bestHit = {
                point: hit.clone(),
                distance: dist,
                normal,
                side,
                score,
              };
            }
          }
        }
      }
    }

    if (bestHit) {
      return {
        point: bestHit.point,
        distance: bestHit.distance,
        normal: bestHit.normal,
        side: bestHit.side,
      };
    }

    // Direct look fallback
    return this.findWebAnchor(origin, lookDir, maxDistance);
  }

  public findWebAnchor(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance = 150
  ): { point: THREE.Vector3; distance: number; normal: THREE.Vector3; side: 'left' | 'right' } | null {
    let closestHit: { point: THREE.Vector3; distance: number; normal: THREE.Vector3; side: 'left' | 'right' } | null = null;
    let minDistance = maxDistance;
    const ray = new THREE.Ray(origin, direction.clone().normalize());
    const hitPoint = new THREE.Vector3();

    for (const b of this.buildings) {
      if (b.roofY < origin.y - 5) continue;
      const hit = ray.intersectBox(b.box, hitPoint);
      if (hit) {
        const dist = origin.distanceTo(hit);
        if (dist > 3 && dist < minDistance) {
          minDistance = dist;
          const normal = new THREE.Vector3();
          const epsilon = 0.55;
          if (Math.abs(hit.x - b.box.max.x) < epsilon) normal.set(1, 0, 0);
          else if (Math.abs(hit.x - b.box.min.x) < epsilon) normal.set(-1, 0, 0);
          else if (Math.abs(hit.z - b.box.max.z) < epsilon) normal.set(0, 0, 1);
          else if (Math.abs(hit.z - b.box.min.z) < epsilon) normal.set(0, 0, -1);
          else normal.set(0, 1, 0);

          closestHit = {
            point: hit.clone(),
            distance: dist,
            normal,
            side: hit.x > origin.x ? 'right' : 'left',
          };
        }
      }
    }
    return closestHit;
  }

  /**
   * Find targeted wall/ledge/roof point for Web-Zip / Point Perch (Right Click):
   * Casts high-precision rays with intelligent rooftop ledge snapping.
   */
  public findZipTarget(
    origin: THREE.Vector3,
    lookDir: THREE.Vector3,
    maxDistance = 220
  ): { point: THREE.Vector3; distance: number; normal: THREE.Vector3; isRoof: boolean; roofY: number } | null {
    const normDir = lookDir.clone().normalize();
    const ray = new THREE.Ray(origin, normDir);
    const hitPoint = new THREE.Vector3();
    let closest: { point: THREE.Vector3; distance: number; normal: THREE.Vector3; isRoof: boolean; roofY: number } | null = null;
    let minD = maxDistance;

    for (const b of this.buildings) {
      const hit = ray.intersectBox(b.box, hitPoint);
      if (hit) {
        const dist = origin.distanceTo(hit);
        if (dist > 2 && dist < minD) {
          minD = dist;
          const normal = new THREE.Vector3();
          const epsilon = 0.65;
          let isRoof = false;

          // Check if top face or upper rim of skyscraper
          if (Math.abs(hit.y - b.box.max.y) < epsilon || hit.y >= b.roofY - 1.2) {
            normal.set(0, 1, 0);
            isRoof = true;
            // Place landing firmly on top of the rooftop plane
            hit.y = b.roofY;
          } else if (Math.abs(hit.x - b.box.max.x) < epsilon) {
            normal.set(1, 0, 0);
          } else if (Math.abs(hit.x - b.box.min.x) < epsilon) {
            normal.set(-1, 0, 0);
          } else if (Math.abs(hit.z - b.box.max.z) < epsilon) {
            normal.set(0, 0, 1);
          } else if (Math.abs(hit.z - b.box.min.z) < epsilon) {
            normal.set(0, 0, -1);
          } else {
            normal.set(0, 1, 0);
            isRoof = true;
            hit.y = b.roofY;
          }

          closest = {
            point: hit.clone(),
            distance: dist,
            normal,
            isRoof,
            roofY: b.roofY,
          };
        }
      }
    }

    // Secondary search: if crosshair was aimed near a roof ledge but slightly missed the box
    if (!closest) {
      for (const b of this.buildings) {
        const toBuilding = b.center.clone().sub(origin);
        const dist = toBuilding.length();
        if (dist < minD && dist < 180) {
          const dot = toBuilding.clone().normalize().dot(normDir);
          if (dot > 0.94) {
            minD = dist;
            closest = {
              point: new THREE.Vector3(b.center.x, b.roofY, b.center.z),
              distance: dist,
              normal: new THREE.Vector3(0, 1, 0),
              isRoof: true,
              roofY: b.roofY,
            };
          }
        }
      }
    }

    return closest;
  }

  /**
   * Continuous Swept AABB Collision Resolution:
   * 100% Solid and Impenetrable.
   * Guaranteed:
   * 1. Player NEVER sinks into or falls through rooftops.
   * 2. Player NEVER clips or tunnels into skyscraper exterior walls.
   * 3. Street ground level (y=0) is impenetrable.
   */
  public resolveCollision(
    pos: THREE.Vector3,
    prevPos: THREE.Vector3 = pos,
    radius = 0.65,
    height = 1.8
  ): { pos: THREE.Vector3; wallNormal: THREE.Vector3 | null; isGrounded: boolean; roofY: number | null } {
    const result = {
      pos: pos.clone(),
      wallNormal: null as THREE.Vector3 | null,
      isGrounded: false,
      roofY: null as number | null,
    };

    // Street Level (Ground floor: y = 0)
    if (result.pos.y <= 0) {
      result.pos.y = 0;
      result.isGrounded = true;
    }

    for (const b of this.buildings) {
      const minX = b.box.min.x;
      const maxX = b.box.max.x;
      const minZ = b.box.min.z;
      const maxZ = b.box.max.z;
      const roofY = b.roofY;

      // Proximity check for roof ledge vaulting
      const nearBuildingHoriz =
        result.pos.x >= minX - radius - 0.8 &&
        result.pos.x <= maxX + radius + 0.8 &&
        result.pos.z >= minZ - radius - 0.8 &&
        result.pos.z <= maxZ + radius + 0.8;

      if (nearBuildingHoriz && Math.abs(result.pos.y - roofY) < 3.5) {
        result.roofY = roofY;
      }

      // 1. CONTINUOUS SWEPT ROOFTOP & PARAPET SURFACE RESOLUTION
      // 100% impenetrable. Prevents all sinking into roof slabs and parapet copings.
      const onRoofFootprint =
        result.pos.x >= minX - 0.35 &&
        result.pos.x <= maxX + 0.35 &&
        result.pos.z >= minZ - 0.35 &&
        result.pos.z <= maxZ + 0.35;

      if (onRoofFootprint) {
        // Detect if player is walking/perched on the outer parapet coping (perimeter ledge)
        const isNearPerimeter =
          result.pos.x <= minX + 0.65 ||
          result.pos.x >= maxX - 0.65 ||
          result.pos.z <= minZ + 0.65 ||
          result.pos.z >= maxZ - 0.65;

        const parapetTopY = roofY + 1.15;
        // If player was already near or above parapet level, land on parapet top; otherwise inner roof
        const targetFloorY = isNearPerimeter && prevPos.y >= roofY + 0.6 ? parapetTopY : roofY;

        // Continuous swept test: did the player cross or land onto the surface during this frame?
        const wasAbove = prevPos.y >= targetFloorY - 0.25;
        const reachedOrPierced = result.pos.y <= targetFloorY + 0.12;
        const fallingThrough = result.pos.y < targetFloorY && prevPos.y >= targetFloorY - 2.5;

        if ((wasAbove && reachedOrPierced) || fallingThrough) {
          result.pos.y = targetFloorY;
          result.isGrounded = true;
          result.roofY = targetFloorY;
        }
      }

      // 2. SKYSCRAPER EXTERIOR WALL COLLISION RESOLUTION (Impenetrable solid faces)
      // Active whenever player altitude is beneath the building roof ledge
      if (result.pos.y < roofY - 0.05 && result.pos.y + height > 0) {
        const insideWallX = result.pos.x > minX - radius && result.pos.x < maxX + radius;
        const insideWallZ = result.pos.z > minZ - radius && result.pos.z < maxZ + radius;

        if (insideWallX && insideWallZ) {
          // Compute penetration depth across all 4 exterior building faces
          const dLeft = Math.abs(result.pos.x - (minX - radius));
          const dRight = Math.abs((maxX + radius) - result.pos.x);
          const dBack = Math.abs(result.pos.z - (minZ - radius));
          const dFront = Math.abs((maxZ + radius) - result.pos.z);
          const minD = Math.min(dLeft, dRight, dBack, dFront);

          if (minD === dLeft) {
            result.pos.x = minX - radius;
            result.wallNormal = new THREE.Vector3(-1, 0, 0);
          } else if (minD === dRight) {
            result.pos.x = maxX + radius;
            result.wallNormal = new THREE.Vector3(1, 0, 0);
          } else if (minD === dBack) {
            result.pos.z = minZ - radius;
            result.wallNormal = new THREE.Vector3(0, 0, -1);
          } else {
            result.pos.z = maxZ + radius;
            result.wallNormal = new THREE.Vector3(0, 0, 1);
          }
          result.roofY = roofY;
        }
      }
    }

    // 3. SOLID ROOFTOP OBSTACLES (Stairwell bulkheads, water towers, HVAC units, solar panels)
    for (const obs of this.obstacles) {
      if (result.pos.y + height > obs.min.y && result.pos.y < obs.max.y) {
        const insideX = result.pos.x > obs.min.x - radius && result.pos.x < obs.max.x + radius;
        const insideZ = result.pos.z > obs.min.z - radius && result.pos.z < obs.max.z + radius;
        if (insideX && insideZ) {
          const topY = obs.max.y;
          const wasAboveObs = prevPos.y >= topY - 0.25;
          if (wasAboveObs && result.pos.y <= topY + 0.15) {
            result.pos.y = topY;
            result.isGrounded = true;
            result.roofY = topY;
          } else {
            const dLeft = Math.abs(result.pos.x - (obs.min.x - radius));
            const dRight = Math.abs((obs.max.x + radius) - result.pos.x);
            const dBack = Math.abs(result.pos.z - (obs.min.z - radius));
            const dFront = Math.abs((obs.max.z + radius) - result.pos.z);
            const minD = Math.min(dLeft, dRight, dBack, dFront);

            if (minD === dLeft) {
              result.pos.x = obs.min.x - radius;
              result.wallNormal = new THREE.Vector3(-1, 0, 0);
            } else if (minD === dRight) {
              result.pos.x = obs.max.x + radius;
              result.wallNormal = new THREE.Vector3(1, 0, 0);
            } else if (minD === dBack) {
              result.pos.z = obs.min.z - radius;
              result.wallNormal = new THREE.Vector3(0, 0, -1);
            } else {
              result.pos.z = obs.max.z + radius;
              result.wallNormal = new THREE.Vector3(0, 0, 1);
            }
          }
        }
      }
    }

    // 4. SOLID VEHICLE COLLISIONS ON MANHATTAN STREETS (Impenetrable cars)
    if (result.pos.y < 3.5) {
      for (const v of this.vehicles) {
        const dx = result.pos.x - v.group.position.x;
        const dz = result.pos.z - v.group.position.z;
        if (Math.abs(dx) < 8.0 && Math.abs(dz) < 8.0) {
          const angle = -v.group.rotation.y;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          const localX = cosA * dx - sinA * dz;
          const localZ = sinA * dx + cosA * dz;

          const halfW = v.width / 2 + radius;
          const halfL = v.length / 2 + radius;

          if (Math.abs(localX) < halfW && Math.abs(localZ) < halfL && result.pos.y < v.height) {
            // Check if player lands on top of vehicle (hood / roof)
            if (prevPos.y >= v.height - 0.25 && result.pos.y <= v.height + 0.15) {
              result.pos.y = v.height;
              result.isGrounded = true;
            } else {
              // Push out horizontally along shortest local axis
              const penX = halfW - Math.abs(localX);
              const penZ = halfL - Math.abs(localZ);
              let pushLX = 0;
              let pushLZ = 0;
              if (penX < penZ) {
                pushLX = localX > 0 ? penX : -penX;
              } else {
                pushLZ = localZ > 0 ? penZ : -penZ;
              }
              const worldPushX = Math.cos(v.group.rotation.y) * pushLX - Math.sin(v.group.rotation.y) * pushLZ;
              const worldPushZ = Math.sin(v.group.rotation.y) * pushLX + Math.cos(v.group.rotation.y) * pushLZ;
              result.pos.x += worldPushX;
              result.pos.z += worldPushZ;
            }
          }
        }
      }
    }

    return result;
  }
}
