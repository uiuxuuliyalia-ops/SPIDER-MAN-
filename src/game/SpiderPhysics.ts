/**
 * SpiderPhysics: Momentum, swinging pendulum physics, wall-running parkour,
 * wall-sticking/crawling, point-zip to buildings, and superhero landings for Spider-Man.
 */

import * as THREE from 'three';
import { CityGenerator } from './CityGenerator';
import { soundEngine } from './SoundEngine';

export type SpiderState = 'GROUND' | 'AIR' | 'SWINGING' | 'WALL_RUN' | 'WALL_STICK' | 'ZIP_TO_WALL';

export interface WebAnchor {
  point: THREE.Vector3;
  ropeLength: number;
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

  // Constants & tuning
  private gravity = -27.0;
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
    swingDir.y = Math.max(swingDir.y, 0.2);
    swingDir.normalize();

    const hit = city.findBestWebAnchor(origin, swingDir, 135);
    if (hit) {
      this.activeAnchorSide = hit.side;
      this.activeAnchor = {
        point: hit.point.clone(),
        ropeLength: hit.distance * 0.94,
        initialDistance: hit.distance,
        side: hit.side,
      };
      this.state = 'SWINGING';
      this.swingTime = 0;

      // Impart forward swing kick if moving slowly
      const horizSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
      if (horizSpeed < 10) {
        const kickDir = new THREE.Vector3(lookDir.x, 0, lookDir.z).normalize();
        this.velocity.addScaledVector(kickDir, 20);
      }

      soundEngine.playWebShoot();
      soundEngine.playWebAttach();
      return true;
    }
    return false;
  }

  /**
   * Release current web swing (Space or releasing swing key).
   * Catapults the hero forward and upward into the skyline!
   */
  public releaseWeb(jumpBoost = false) {
    if (this.state === 'SWINGING') {
      this.state = 'AIR';
      this.activeAnchor = null;
      if (jumpBoost) {
        this.velocity.y = Math.max(this.velocity.y + 14, 18);
        const horizScale = 1.38;
        this.velocity.x *= horizScale;
        this.velocity.z *= horizScale;
        soundEngine.playJump();
      }
    }
  }

  /**
   * Start Point-Zip / Web-Zip to a targeted building wall, ledge or roof (RMB click).
   */
  public startZipToTarget(target: ZipTarget) {
    this.state = 'ZIP_TO_WALL';
    this.zipStartPos.copy(this.position);
    this.zipTarget = {
      point: target.point.clone(),
      normal: target.normal.clone(),
      isRoof: target.isRoof,
      roofY: target.roofY,
    };
    const dist = this.position.distanceTo(target.point);
    this.zipDuration = Math.max(0.18, Math.min(0.55, dist / 65));
    this.zipTimer = 0;
    this.activeAnchor = null;
    this.velocity.set(0, 0, 0);

    soundEngine.playWebShoot();
    soundEngine.playJump();
  }

  /**
   * Main physics step.
   */
  public update(
    dt: number,
    input: { forward: number; strafe: number; jump: boolean; sprint: boolean; webSwing: boolean },
    camYaw: number,
    city: CityGenerator
  ) {
    const delta = Math.min(dt, 0.05);
    this.isSprinting = input.sprint;
    const maxSpeed = input.sprint ? this.sprintSpeed : this.normalSpeed;

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
        // Horizontal acceleration
        if (moveDir.lengthSq() > 0.01) {
          const targetVel = moveDir.clone().multiplyScalar(maxSpeed);
          this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetVel.x, 15, delta);
          this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetVel.z, 15, delta);
        } else {
          this.velocity.x = THREE.MathUtils.damp(this.velocity.x, 0, this.groundFriction, delta);
          this.velocity.z = THREE.MathUtils.damp(this.velocity.z, 0, this.groundFriction, delta);
        }

        // Jump
        if (input.jump) {
          this.velocity.y = this.jumpForce * (input.sprint ? 1.25 : 1.0);
          this.state = 'AIR';
          soundEngine.playJump();
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
        // Gravity & Air drag
        this.velocity.y += this.gravity * delta;
        this.velocity.x *= 1 - this.airDrag * delta;
        this.velocity.z *= 1 - this.airDrag * delta;

        // Air steering control
        if (moveDir.lengthSq() > 0.01) {
          this.velocity.addScaledVector(moveDir, 26 * delta);
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

        // Gravity pull
        this.velocity.y += this.gravity * delta;

        // Forward thrust: holding forward adds massive kinetic momentum along trajectory
        if (input.forward > 0) {
          const horizDir = new THREE.Vector3(this.velocity.x, 0, this.velocity.z).normalize();
          if (horizDir.lengthSq() < 0.1) {
            horizDir.copy(forwardVec);
          }
          this.velocity.addScaledVector(horizDir, this.swingPumpForce * delta);
        }

        // Lateral steering: holding A or D curves smoothly around buildings
        if (input.strafe !== 0) {
          this.velocity.addScaledVector(rightVec, input.strafe * 22 * delta);
        }

        // Rope constraint (elastic string with pendulum physics & centrifugal lift)
        if (currentDist >= this.activeAnchor.ropeLength * 0.95) {
          const normal = toSpidey.clone().normalize();
          const radialVel = this.velocity.dot(normal);

          // Remove outward stretching velocity
          if (radialVel > 0) {
            this.velocity.sub(normal.clone().multiplyScalar(radialVel));
          }

          // Centrifugal upward arc: converts forward speed into climb altitude at bottom and upward swing
          const horizSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
          if (toSpidey.y < 0) {
            const liftFactor = Math.min(1.0, -toSpidey.y / this.activeAnchor.ropeLength);
            this.velocity.y += (22 + horizSpeed * 0.45) * liftFactor * delta;
          }

          this.position.copy(this.activeAnchor.point).add(normal.multiplyScalar(this.activeAnchor.ropeLength));
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

        // Mid-air Point Launch if Space is pressed during zip: catapult skyward!
        if (input.jump) {
          const launchDir = this.zipTarget.point.clone().sub(this.zipStartPos).normalize();
          this.velocity.copy(launchDir).multiplyScalar(38);
          this.velocity.y = 20;
          this.state = 'AIR';
          this.zipTarget = null;
          soundEngine.playJump();
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
          this.zipTarget = null;
        }
        return; // Skip standard physics integration while zipping
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

    // Save previous position before integration for swept collision detection
    this.prevPosition.copy(this.position);

    // Integrate position
    this.position.addScaledVector(this.velocity, delta);

    // CONTINUOUS SWEPT COLLISION RESOLUTION AGAINST SKYCRAPERS & ROOFS
    const col = city.resolveCollision(this.position, this.prevPosition, 0.65, 1.8);
    this.position.copy(col.pos);

    if (col.isGrounded) {
      if (this.state === 'AIR') {
        if (this.velocity.y < -14) {
          this.superheroLandingTimer = 0.3;
          soundEngine.playPunch(0);
        }
      }
      this.state = 'GROUND';
      this.activeAnchor = null;
      this.velocity.y = 0;
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

    // Dynamic wind audio update
    soundEngine.updateSpeedWind(this.velocity.length());
  }
}
