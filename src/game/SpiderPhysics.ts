/**
 * SpiderPhysics: Momentum, swinging pendulum physics, wall-running parkour,
 * wall-sticking/crawling, point-zip to buildings, and superhero landings for Spider-Man.
 */

import * as THREE from 'three';
import { CityGenerator } from './CityGenerator';
import { soundEngine } from './SoundEngine';

export type SpiderState = 'GROUND' | 'AIR' | 'SWINGING' | 'WALL_RUN' | 'WALL_STICK' | 'ZIP_TO_WALL' | 'WEB_STRIKE';

export interface WebAnchor {
  point: THREE.Vector3;
  ropeLength: number;
  targetRopeLength: number;
  initialDistance: number;
  side: 'left' | 'right';
}

export interface ZipTarget {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  isRoof: boolean;
  roofY: number;
}

export class SpiderPhysics {
  public position: THREE.Vector3;
  public prevPosition: THREE.Vector3;
  public velocity: THREE.Vector3;
  public state: SpiderState = 'GROUND';
  public facingAngle = Math.PI; // In radians (faces forward away from camera)
  public activeAnchor: WebAnchor | null = null;
  public activeAnchorSide: 'left' | 'right' = 'right';
  public wallNormal: THREE.Vector3 | null = null;
  public wallRunTimer = 0;
  public isSprinting = false;
  public superheroLandingTimer = 0;
  public bankAngle = 0;
  public swingTime = 0;

  // Web-Zip / Point Perch variables
  public zipTarget: ZipTarget | null = null;
  public zipStartPos: THREE.Vector3 = new THREE.Vector3();
  public zipTimer = 0;
  public zipDuration = 0;
  public onZipComplete?: () => void;

  // Web-Strike Combat Attack variables (Insomniac Spider-Man Signature Move)
  public webStrikeTarget: THREE.Vector3 | null = null;
  public webStrikeStartPos: THREE.Vector3 = new THREE.Vector3();
  public webStrikeTimer = 0;
  public webStrikeDuration = 0;
  public onWebStrikeHit?: () => void;

  // Traversal Acrobatics & Point Launch
  public isPointLaunching = false;
  public pointLaunchTimer = 0;
  public isDiving = false;
  public isAirTricking = false;
  public airTrickRotation = 0;
  public isCrouching = false;
  public isAcrobaticLeap = false;
  public acrobaticLeapTimer = 0;

  // Insomniac Combat Dodge System
  public isDodging = false;
  public dodgeTimer = 0;
  public dodgeDuration = 0.35;
  public dodgeDir = new THREE.Vector3();

  // Constants & tuning
  private gravity = -28.0;
  private groundFriction = 8.5;
  private airDrag = 0.35;
  private normalSpeed = 16.5;
  private sprintSpeed = 29.0;
  private jumpForce = 16.0;
  private swingPumpForce = 44.0;
  private wallRunSpeed = 24.0;
  private wallClimbSpeed = 8.5;

  constructor(initialPos = new THREE.Vector3(0, 0, 0)) {
    this.position = initialPos.clone();
    this.prevPosition = initialPos.clone();
    this.velocity = new THREE.Vector3();
  }

  /**
   * Shoot web and attach for swinging.
   * Uses Insomniac-style smart conical search to automatically find
   * the best skyscraper anchor to the left or right of player direction.
   */
  public attachWeb(origin: THREE.Vector3, lookDir: THREE.Vector3, city: CityGenerator): boolean {
    const swingDir = lookDir.clone();
    swingDir.y = Math.max(swingDir.y, 0.15);
    swingDir.normalize();

    const hit = city.findBestWebAnchor(origin, swingDir, 140);
    if (hit) {
      this.activeAnchorSide = hit.side;
      const initialDist = origin.distanceTo(hit.point);
      // Optimal pendulum radius between 22m and 52m
      const targetRope = Math.max(22, Math.min(initialDist * 0.92, 50));
      this.activeAnchor = {
        point: hit.point.clone(),
        ropeLength: initialDist,
        targetRopeLength: targetRope,
        initialDistance: initialDist,
        side: hit.side,
      };
      this.state = 'SWINGING';
      this.swingTime = 0;

      // Smooth forward acceleration impulse - never a jarring teleport
      const horizSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
      if (horizSpeed < 14) {
        const kickDir = new THREE.Vector3(lookDir.x, 0, lookDir.z).normalize();
        this.velocity.addScaledVector(kickDir, Math.max(0, 16 - horizSpeed));
      }

      soundEngine.playWebShoot();
      soundEngine.playWebAttach();
      return true;
    }
    return false;
  }

  /**
   * Release current web swing (Space or releasing swing key).
   * Catapults the hero forward and upward in a graceful superhero arc.
   */
  public releaseWeb(jumpBoost = false) {
    if (this.state === 'SWINGING') {
      this.state = 'AIR';
      this.activeAnchor = null;
      if (jumpBoost) {
        if (this.velocity.y > 0) {
          // Apex release: controlled superhero arc (never launches into outer space)
          this.velocity.y = Math.min(18.0, Math.max(this.velocity.y * 0.7 + 6.5, 11.0));
          this.velocity.x *= 1.25;
          this.velocity.z *= 1.25;
        } else {
          // Bottom release: forward kinetic slingshot
          this.velocity.y = Math.min(13.5, Math.max(this.velocity.y + 4.5, 8.0));
          this.velocity.x *= 1.35;
          this.velocity.z *= 1.35;
        }
        // Speed clamp to keep forward speed athletic, smooth and responsive
        const hSpd = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        if (hSpd > 38) {
          const s = 38 / hSpd;
          this.velocity.x *= s;
          this.velocity.z *= s;
        }
        this.isAirTricking = true;
        soundEngine.playJump();
      }
    }
  }

  /**
   * Start Point-Zip / Web-Zip to a targeted building wall, ledge or roof (RMB click).
   */
  public startZipToTarget(target: ZipTarget, onComplete?: () => void) {
    this.state = 'ZIP_TO_WALL';
    this.zipStartPos.copy(this.position);
    this.zipTarget = {
      point: target.point.clone(),
      normal: target.normal.clone(),
      isRoof: target.isRoof,
      roofY: target.roofY,
    };
    this.onZipComplete = onComplete;
    const dist = this.position.distanceTo(target.point);
    this.zipDuration = Math.max(0.18, Math.min(0.55, dist / 65));
    this.zipTimer = 0;
    this.activeAnchor = null;
    this.velocity.set(0, 0, 0);

    soundEngine.playWebShoot();
    soundEngine.playJump();
  }

  /**
   * Start Web-Strike Combat Attack (Insomniac Spider-Man Signature Move)
   * Shoots twin web strands to enemy and rockets into them for a flying missile dropkick!
   */
  public startWebStrike(targetPos: THREE.Vector3, onHit?: () => void) {
    this.state = 'WEB_STRIKE';
    this.webStrikeStartPos.copy(this.position);
    this.webStrikeTarget = targetPos.clone();
    this.onWebStrikeHit = onHit;
    const dist = this.position.distanceTo(targetPos);
    this.webStrikeDuration = Math.max(0.12, Math.min(0.38, dist / 55));
    this.webStrikeTimer = 0;
    this.activeAnchor = null;
    this.velocity.set(0, 0, 0);

    soundEngine.playWebShoot();
  }

  /**
   * Insomniac Spider-Man Acrobatic Combat Dodge:
   * Evasive slip / roll / back-handspring that swiftly evades attacks.
   */
  public triggerDodge(dodgeVector: THREE.Vector3) {
    this.isDodging = true;
    this.dodgeTimer = this.dodgeDuration;
    const dir = dodgeVector.lengthSq() > 0.01 ? dodgeVector.clone().normalize() : new THREE.Vector3(0, 0, -1);
    this.dodgeDir.copy(dir);
    this.velocity.set(dir.x * 22.0, 0, dir.z * 22.0);
    this.facingAngle = Math.atan2(dir.x, dir.z);
    soundEngine.playJump();
  }

  /**
   * Main physics step.
   */
  public update(
    dt: number,
    input: { forward: number; strafe: number; jump: boolean; sprint: boolean; webSwing: boolean; crouch?: boolean },
    camYaw: number,
    city: CityGenerator
  ) {
    const delta = Math.min(dt, 0.05);
    this.isSprinting = input.sprint;
    this.isCrouching = !!input.crouch && this.state === 'GROUND';

    if (this.isDodging) {
      this.dodgeTimer -= delta;
      if (this.dodgeTimer <= 0) {
        this.isDodging = false;
        this.velocity.x *= 0.35;
        this.velocity.z *= 0.35;
      }
    }

    const maxSpeed = this.isCrouching ? 6.0 : input.sprint ? this.sprintSpeed : this.normalSpeed;

    if (this.superheroLandingTimer > 0) {
      this.superheroLandingTimer -= delta;
    }

    // Movement direction in world space based on camera yaw
    const forwardVec = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
    const rightVec = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));

    const moveDir = new THREE.Vector3()
      .addScaledVector(forwardVec, input.forward)
      .addScaledVector(rightVec, input.strafe);

    if (moveDir.lengthSq() > 0.001 && this.state !== 'WALL_STICK') {
      moveDir.normalize();
      this.facingAngle = Math.atan2(moveDir.x, moveDir.z);
    }

    // Dynamic banking into turns
    const targetBank = -input.strafe * 0.35;
    this.bankAngle = THREE.MathUtils.damp(this.bankAngle, targetBank, 10, delta);

    // STATE-SPECIFIC PHYSICS EXECUTION
    switch (this.state) {
      case 'GROUND': {
        if (this.isDodging) {
          // Maintain swift acrobatic evasive speed
          const dodgeMult = Math.max(0.4, this.dodgeTimer / this.dodgeDuration);
          this.velocity.x = this.dodgeDir.x * 22.0 * dodgeMult;
          this.velocity.z = this.dodgeDir.z * 22.0 * dodgeMult;
          this.velocity.y = 0;
          break;
        }

        // Progressive organic acceleration & deceleration with physical inertia
        const currentHorizSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        if (moveDir.lengthSq() > 0.01) {
          const targetVel = moveDir.clone().multiplyScalar(maxSpeed);
          // Progressive acceleration: smooth ramp-up from standstill, snappy at full speed
          const accelRate = currentHorizSpeed < 5.0 ? 8.5 : 12.0;
          this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetVel.x, accelRate, delta);
          this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetVel.z, accelRate, delta);
        } else {
          // Weighty deceleration
          this.velocity.x = THREE.MathUtils.damp(this.velocity.x, 0, this.groundFriction, delta);
          this.velocity.z = THREE.MathUtils.damp(this.velocity.z, 0, this.groundFriction, delta);
        }

        // Jump: Acrobatic superhero leap with forward arc and tuck
        if (input.jump) {
          this.isAcrobaticLeap = true;
          this.acrobaticLeapTimer = 0.75;
          if (this.isCrouching) {
            this.velocity.y = this.jumpForce * 1.48;
            this.isPointLaunching = true;
            this.pointLaunchTimer = 0.45;
            soundEngine.playPointLaunch();
          } else {
            this.velocity.y = this.jumpForce * (input.sprint ? 1.28 : 1.12);
            // Forward momentum impulse for a graceful forward arc
            const leapBoost = input.sprint ? 8.5 : 5.5;
            if (moveDir.lengthSq() > 0.01) {
              this.velocity.x += moveDir.x * leapBoost;
              this.velocity.z += moveDir.z * leapBoost;
            } else {
              this.velocity.x += forwardVec.x * 4.5;
              this.velocity.z += forwardVec.z * 4.5;
            }
            soundEngine.playJump();
          }
          this.state = 'AIR';
        } else {
          this.velocity.y = -2; // Ground clamp
        }

        // Web swing latch from ground edge
        if (input.webSwing && !this.activeAnchor) {
          const attached = this.attachWeb(this.position, forwardVec, city);
          if (attached) {
            this.velocity.y = 10;
          }
        }
        break;
      }

      case 'AIR': {
        this.isDiving = this.velocity.y < -12;
        // Tricking is only enabled for deliberate Point Launch acrobatics, NOT standard Space jump!
        this.isAirTricking = this.isPointLaunching && !this.isDiving;

        if (this.pointLaunchTimer > 0) {
          this.pointLaunchTimer -= delta;
          if (this.pointLaunchTimer <= 0) this.isPointLaunching = false;
        }

        if (this.acrobaticLeapTimer > 0) {
          this.acrobaticLeapTimer -= delta;
          if (this.acrobaticLeapTimer <= 0) this.isAcrobaticLeap = false;
        }

        if (this.isAirTricking) {
          this.airTrickRotation += delta * 12;
        } else {
          this.airTrickRotation = 0;
        }

        // Gravity & Air drag (streamlined in dive for exhilarating terminal velocity)
        const currentAirDrag = this.isDiving ? 0.16 : this.airDrag;
        this.velocity.y += this.gravity * delta;
        this.velocity.x *= 1 - currentAirDrag * delta;
        this.velocity.z *= 1 - currentAirDrag * delta;

        // Air steering control
        if (moveDir.lengthSq() > 0.01) {
          this.velocity.addScaledVector(moveDir, (this.isDiving ? 36 : 28) * delta);
        }

        // Plunge dive acceleration when holding sprint in mid-air
        if (input.sprint && this.velocity.y < 0) {
          this.velocity.y += this.gravity * 0.45 * delta;
        }

        // Web swing latch if E is held or pressed
        if (input.webSwing && !this.activeAnchor) {
          this.attachWeb(this.position, forwardVec, city);
        }
        break;
      }

      case 'SWINGING': {
        if (!this.activeAnchor) {
          this.state = 'AIR';
          break;
        }

        this.swingTime += delta;

        // Space or releasing swing button releases swing with catapult launch
        if (input.jump || !input.webSwing) {
          this.releaseWeb(true);
          break;
        }

        // Vector from anchor to Spidey
        const toSpidey = this.position.clone().sub(this.activeAnchor.point);
        const currentDist = toSpidey.length();

        // Smoothly reel in rope towards optimal swinging length
        this.activeAnchor.ropeLength = THREE.MathUtils.damp(
          this.activeAnchor.ropeLength,
          this.activeAnchor.targetRopeLength,
          4.5,
          delta
        );

        // Standard gravity
        this.velocity.y += this.gravity * delta;

        // Forward thrust: holding forward pumps kinetic momentum along forward trajectory
        if (input.forward > 0) {
          const horizDir = new THREE.Vector3(this.velocity.x, 0, this.velocity.z).normalize();
          if (horizDir.lengthSq() < 0.1) {
            horizDir.copy(forwardVec);
          }
          this.velocity.addScaledVector(horizDir, this.swingPumpForce * delta);
        }

        // Lateral steering: holding A or D curves smoothly around buildings
        if (input.strafe !== 0) {
          this.velocity.addScaledVector(rightVec, input.strafe * 24 * delta);
        }

        // CRITICALLY DAMPED ELASTIC PENDULUM TETHER:
        // Eliminates harsh teleportation/snapping for buttery-smooth flight!
        if (currentDist >= this.activeAnchor.ropeLength) {
          const normal = toSpidey.clone().normalize();
          const radialVel = this.velocity.dot(normal);

          // Smoothly remove outward stretching velocity
          if (radialVel > 0) {
            this.velocity.sub(normal.clone().multiplyScalar(radialVel * Math.min(1.0, 16.0 * delta)));
          }

          // Gentle elastic tether pull
          const stretch = currentDist - this.activeAnchor.ropeLength;
          this.velocity.addScaledVector(normal, -stretch * 32.0 * delta);

          // Soft position convergence without teleports
          if (stretch > 0.5) {
            const targetSpherePos = this.activeAnchor.point.clone().addScaledVector(normal, this.activeAnchor.ropeLength);
            this.position.lerp(targetSpherePos, Math.min(1.0, 12.0 * delta));
          }

          // Centrifugal upward arc: convert forward velocity into climb altitude
          const horizSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
          if (toSpidey.y < 0) {
            // Taper lift as altitude approaches rooftop levels (prevent rocket launch above houses)
            const altitudeTaper = Math.max(0.1, Math.min(1.0, (110 - this.position.y) / 60));
            const liftFactor = Math.min(1.0, -toSpidey.y / this.activeAnchor.ropeLength);
            const lift = (22 + horizSpeed * 0.35) * liftFactor * altitudeTaper * delta;
            this.velocity.y += lift;
          }

          // Cap maximum upward swing velocity to prevent overshooting city rooftops
          if (this.velocity.y > 18.0) {
            this.velocity.y = THREE.MathUtils.damp(this.velocity.y, 18.0, 10, delta);
          }
        }

        // Update facing direction along horizontal velocity
        if (this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z > 1) {
          this.facingAngle = Math.atan2(this.velocity.x, this.velocity.z);
        }
        break;
      }

      case 'ZIP_TO_WALL': {
        if (!this.zipTarget) {
          this.state = 'AIR';
          break;
        }

        // Insomniac Point Launch: pressing Jump before or during arrival catapults forward skyward
        if (input.jump) {
          this.onZipComplete = undefined;
          const launchDir = this.zipTarget.point.clone().sub(this.zipStartPos).normalize();
          this.velocity.copy(launchDir).multiplyScalar(36);
          this.velocity.y = 16;
          this.state = 'AIR';
          this.zipTarget = null;
          this.isPointLaunching = true;
          this.pointLaunchTimer = 0.55;
          this.isAirTricking = true;
          soundEngine.playPointLaunch();
          break;
        }

        this.zipTimer += delta;
        const progress = Math.min(1, this.zipTimer / this.zipDuration);

        // Smooth cubic ease-out acceleration into soft touchdown
        const ease = 1 - Math.pow(1 - progress, 3);
        this.position.lerpVectors(this.zipStartPos, this.zipTarget.point, ease);

        // Organic parabolic arc lift in mid-air
        const dist = this.zipStartPos.distanceTo(this.zipTarget.point);
        const arcLift = Math.sin(progress * Math.PI) * Math.min(4.5, dist * 0.08);
        this.position.y += arcLift;

        // Face towards destination during zip
        const toDest = this.zipTarget.point.clone().sub(this.zipStartPos);
        if (toDest.x * toDest.x + toDest.z * toDest.z > 0.5) {
          this.facingAngle = Math.atan2(toDest.x, toDest.z);
        }

        if (progress >= 1) {
          // Arrived cleanly at target building!
          soundEngine.playWebAttach();
          if (this.zipTarget.isRoof) {
            // Firmly and cleanly land ON TOP of the roof — zero clipping
            this.position.set(this.zipTarget.point.x, this.zipTarget.roofY, this.zipTarget.point.z);
            this.prevPosition.copy(this.position);
            this.velocity.set(0, 0, 0);
            this.state = 'GROUND';
            this.superheroLandingTimer = 0.32;
            soundEngine.playPunch(0);
          } else {
            // Perch cleanly on wall in wall-stick pose
            this.position.copy(this.zipTarget.point).addScaledVector(this.zipTarget.normal, 0.55);
            this.prevPosition.copy(this.position);
            this.velocity.set(0, 0, 0);
            this.wallNormal = this.zipTarget.normal.clone();
            this.state = 'WALL_STICK';
            this.facingAngle = Math.atan2(-this.zipTarget.normal.x, -this.zipTarget.normal.z);
          }
          if (this.onZipComplete) {
            this.onZipComplete();
            this.onZipComplete = undefined;
          }
          this.zipTarget = null;
        }
        return; // Skip standard physics integration while zipping
      }

      case 'WEB_STRIKE': {
        if (!this.webStrikeTarget) {
          this.state = 'AIR';
          break;
        }

        this.webStrikeTimer += delta;
        const progress = Math.min(1, this.webStrikeTimer / this.webStrikeDuration);
        const ease = Math.sin((progress * Math.PI) / 2);
        this.position.lerpVectors(this.webStrikeStartPos, this.webStrikeTarget, ease);

        const toDest = this.webStrikeTarget.clone().sub(this.webStrikeStartPos);
        if (toDest.x * toDest.x + toDest.z * toDest.z > 0.5) {
          this.facingAngle = Math.atan2(toDest.x, toDest.z);
        }

        if (progress >= 1) {
          if (this.onWebStrikeHit) {
            this.onWebStrikeHit();
          }
          this.state = 'GROUND';
          this.velocity.set(toDest.x, 0, toDest.z).normalize().multiplyScalar(9);
          this.superheroLandingTimer = 0.24;
          this.webStrikeTarget = null;
        }
        return;
      }

      case 'WALL_STICK': {
        // Clinging cleanly to vertical skyscraper wall face
        this.velocity.set(0, 0, 0);

        if (this.wallNormal) {
          this.facingAngle = Math.atan2(-this.wallNormal.x, -this.wallNormal.z);

          // Wall climbing / crawling up & down
          if (input.forward > 0) {
            if (input.sprint) {
              this.state = 'WALL_RUN';
              this.wallRunTimer = 0;
            } else {
              this.position.y += this.wallClimbSpeed * delta;
            }
          } else if (input.forward < 0) {
            this.position.y -= this.wallClimbSpeed * delta;
          }

          // Lateral crawling along wall face
          if (input.strafe !== 0) {
            const wallTangent = new THREE.Vector3(-this.wallNormal.z, 0, this.wallNormal.x);
            this.position.addScaledVector(wallTangent, input.strafe * this.wallClimbSpeed * delta);
          }

          // Wall jump spring off with Space
          if (input.jump) {
            this.state = 'AIR';
            this.velocity.copy(this.wallNormal).multiplyScalar(20);
            this.velocity.y = 16;
            soundEngine.playJump();
            break;
          }
        } else {
          this.state = 'AIR';
        }
        break;
      }

      case 'WALL_RUN': {
        // High-speed athletic vertical wall sprint
        this.wallRunTimer += delta;
        const runMultiplier = input.sprint || this.wallRunTimer < 1.0 ? 1.35 : 1.0;
        this.velocity.y = Math.max(this.wallRunSpeed * runMultiplier, this.velocity.y * (1 - 0.3 * delta));

        // Lateral wall movement & secure adhesion
        if (this.wallNormal) {
          // Gentle adhesion force pressing into wall so character stays solidly grounded on the vertical surface
          this.velocity.x = -this.wallNormal.x * 2.5;
          this.velocity.z = -this.wallNormal.z * 2.5;

          const wallTangent = new THREE.Vector3(-this.wallNormal.z, 0, this.wallNormal.x);
          this.velocity.addScaledVector(wallTangent, input.strafe * 14);
          this.facingAngle = Math.atan2(-this.wallNormal.x, -this.wallNormal.z);
        }

        // Leap off wall with Space
        if (input.jump && this.wallNormal) {
          this.state = 'AIR';
          this.velocity.copy(this.wallNormal).multiplyScalar(22);
          this.velocity.y = 19;
          soundEngine.playJump();
          break;
        }

        // Transition to stick if user pulls back, or air if running out of stamina
        if (input.forward < 0) {
          this.state = 'WALL_STICK';
        } else if (input.forward === 0 && this.wallRunTimer > 2.0) {
          this.state = 'WALL_STICK';
        } else if (this.wallRunTimer > 8.0) {
          this.state = 'AIR';
        }
        break;
      }
    }

    // MULTI-SUBSTEPPING INTEGRATION & CONTINUOUS SWEPT COLLISION
    // Eliminates all tunneling through skyscraper walls and rooftops at high speeds (up to 45m/s)
    const subSteps = 3;
    const subDelta = delta / subSteps;
    let finalCol = {
      pos: this.position.clone(),
      wallNormal: null as THREE.Vector3 | null,
      isGrounded: false,
      roofY: null as number | null,
    };

    for (let s = 0; s < subSteps; s++) {
      this.prevPosition.copy(this.position);
      this.position.addScaledVector(this.velocity, subDelta);
      const subCol = city.resolveCollision(this.position, this.prevPosition, 0.65, 1.8);
      this.position.copy(subCol.pos);
      if (subCol.isGrounded) finalCol.isGrounded = true;
      if (subCol.wallNormal) finalCol.wallNormal = subCol.wallNormal;
      if (subCol.roofY !== null) finalCol.roofY = subCol.roofY;
    }
    const col = finalCol;

    if (col.isGrounded) {
      if (this.state === 'AIR') {
        if (this.velocity.y < -14) {
          this.superheroLandingTimer = 0.3;
          soundEngine.playPunch(0);
        }
      }
      this.state = 'GROUND';
      this.activeAnchor = null;
      this.velocity.y = Math.max(0, this.velocity.y);
    } else if (col.wallNormal) {
      this.wallNormal = col.wallNormal.clone();
      if (this.state === 'SWINGING') {
        // AUTOMATIC WALL-RUN FROM WEB SWING:
        // As soon as Spider-Man reaches the building facade while swinging,
        // convert kinetic swinging momentum directly into vertical wall run!
        const horizSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        this.state = 'WALL_RUN';
        this.wallRunTimer = 0;
        this.activeAnchor = null;
        this.velocity.y = Math.max(22.0, horizSpeed * 1.15 + Math.max(0, this.velocity.y));
        this.facingAngle = Math.atan2(-col.wallNormal.x, -col.wallNormal.z);
        soundEngine.playWebAttach();
        soundEngine.playFootstep(true, true);
      } else if (this.state === 'GROUND') {
        // While walking on ground or roof: slide cleanly against wall without unexpected latching
        const dot = this.velocity.dot(col.wallNormal);
        if (dot < 0) {
          this.velocity.sub(col.wallNormal.clone().multiplyScalar(dot));
        }
        // Only initiate vertical wall run if actively sprinting into the wall or pressing jump!
        if ((input.sprint && input.forward > 0) || input.jump) {
          this.state = 'WALL_RUN';
          this.wallRunTimer = 0;
          soundEngine.playWebAttach();
        }
      } else if (this.state === 'AIR') {
        // Approaching wall in mid-air: smoothly latch into wall-run if moving forward or swinging into wall
        const incomingDot = this.velocity.dot(col.wallNormal);
        if (input.forward > 0 || input.sprint || incomingDot < -3) {
          this.state = 'WALL_RUN';
          this.wallRunTimer = 0;
          this.velocity.y = Math.max(18, Math.abs(incomingDot) * 1.05 + Math.max(0, this.velocity.y));
        } else {
          this.state = 'WALL_STICK';
        }
        soundEngine.playWebAttach();
      }
    } else {
      if (this.state === 'GROUND' && !col.isGrounded) {
        this.state = 'AIR';
      }
      if ((this.state === 'WALL_RUN' || this.state === 'WALL_STICK') && !col.wallNormal) {
        // Vaulted over roof ledge onto the rooftop!
        if (col.roofY && this.position.y >= col.roofY - 1.2) {
          this.position.y = col.roofY;
          if (this.wallNormal) {
            // Step cleanly inward onto the roof floor with forward parkour hop
            this.position.addScaledVector(this.wallNormal, -1.35);
            this.velocity.set(-this.wallNormal.x * 7.5, 3.5, -this.wallNormal.z * 7.5);
          }
          this.prevPosition.copy(this.position);
          this.state = 'GROUND';
          this.superheroLandingTimer = 0.22;
          soundEngine.playJump();
        } else {
          this.state = 'AIR';
        }
      }
    }

    // --- WORLD BOUNDARY CONTAINMENT & SAFETY FLOOR ---
    // 1. Safety Floor: ensure player never falls through the asphalt ground
    if (this.position.y < 0.6) {
      this.position.y = 0.6;
      this.velocity.y = 0;
      if (this.state === 'AIR') {
        this.state = 'GROUND';
      }
    }

    // 2. High-Altitude Soft Ceiling: prevent flying into outer space over buildings
    const maxSkyAltitude = 120.0;
    if (this.position.y > maxSkyAltitude) {
      if (this.velocity.y > 0) {
        this.velocity.y = THREE.MathUtils.damp(this.velocity.y, -3.0, 5.0, delta);
      }
      this.velocity.y += this.gravity * 0.65 * delta;
    }

    // 3. Map Boundaries: keep hero within Manhattan (citySize = 420, span is [-210, 210])
    const boundWarning = 185.0;
    const boundHard = 202.0;

    // X-axis boundary containment
    if (Math.abs(this.position.x) > boundWarning) {
      const signX = Math.sign(this.position.x);
      const excessX = Math.abs(this.position.x) - boundWarning;
      // Inward aerodynamic drag pushing back into the city
      this.velocity.x -= signX * (25.0 + excessX * 3.0) * delta;

      if (Math.abs(this.position.x) >= boundHard) {
        this.position.x = signX * boundHard;
        this.velocity.x = -signX * Math.max(10.0, Math.abs(this.velocity.x) * 0.5);
        if (this.state === 'SWINGING') {
          this.releaseWeb(false);
        }
      }
    }

    // Z-axis boundary containment
    if (Math.abs(this.position.z) > boundWarning) {
      const signZ = Math.sign(this.position.z);
      const excessZ = Math.abs(this.position.z) - boundWarning;
      // Inward aerodynamic drag pushing back into the city
      this.velocity.z -= signZ * (25.0 + excessZ * 3.0) * delta;

      if (Math.abs(this.position.z) >= boundHard) {
        this.position.z = signZ * boundHard;
        this.velocity.z = -signZ * Math.max(10.0, Math.abs(this.velocity.z) * 0.5);
        if (this.state === 'SWINGING') {
          this.releaseWeb(false);
        }
      }
    }

    // Dynamic wind audio update
    soundEngine.updateSpeedWind(this.velocity.length());
  }
}
