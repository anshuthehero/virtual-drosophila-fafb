import { DemonEntity, DoomButtons, DoomPlayer, ItemEntity } from './types';
import { RingAttractorModel } from '../simulation/ringAttractor';
import { DOOM_GRID, DOOM_MAP_HEIGHT, DOOM_MAP_WIDTH } from './doomMap';

export class FlyBrainDoomAgent {
  public ringAttractor: RingAttractorModel;
  public fearSpikeLevel: number = 0;
  public rewardSpikeLevel: number = 0;
  public giantFiberActive: boolean = false;
  public dng01ForwardLevel: number = 0;
  public dng02SteeringLevel: number = 0;
  public dnp09SaccadeLevel: number = 0;
  public lastDecisionReason: string = 'EXPLORING_CORRIDORS';

  private aimTolerance: number = 0.18; // radians (~10.3 degrees)
  private fireCooldown: number = 0;
  private cornerTurnDir: number = 0; // -1 = left, +1 = right, 0 = straight
  private cornerTurnTimer: number = 0; // latched turn duration to prevent oscillation

  constructor() {
    this.ringAttractor = new RingAttractorModel();
  }

  public setEBLesion(percent: number) {
    this.ringAttractor.setLesionPercentage(percent);
    this.ringAttractor.update(0.05, 0);
  }

  /** Grid-based raycast to check line of sight between two points */
  public hasLOS(x0: number, y0: number, x1: number, y1: number): boolean {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.ceil(dist * 12);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const mx = Math.floor(x0 + (x1 - x0) * t);
      const my = Math.floor(y0 + (y1 - y0) * t);
      if (mx < 0 || mx >= DOOM_MAP_WIDTH || my < 0 || my >= DOOM_MAP_HEIGHT) return false;
      if (DOOM_GRID[my][mx] > 0) return false;
    }
    return true;
  }

  /** Distance in units to the nearest wall along a specified direction (max 8.0) */
  public castRay(x: number, y: number, dirX: number, dirY: number, maxDist: number = 8.0): number {
    const stepSize = 0.08;
    const steps = Math.floor(maxDist / stepSize);
    for (let i = 1; i <= steps; i++) {
      const d = i * stepSize;
      const cx = x + dirX * d;
      const cy = y + dirY * d;
      const mx = Math.floor(cx);
      const my = Math.floor(cy);
      if (mx < 0 || mx >= DOOM_MAP_WIDTH || my < 0 || my >= DOOM_MAP_HEIGHT) return d;
      if (DOOM_GRID[my][mx] > 0) return d;
    }
    return maxDist;
  }

  /** Angle difference normalized to (-π, π) */
  private angleDiff(a: number, b: number): number {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  public step(
    dt: number,
    player: DoomPlayer,
    demons: DemonEntity[],
    items: ItemEntity[]
  ): {
    buttons: DoomButtons;
    fearLevel: number;
    rewardLevel: number;
    giantFiberSpike: boolean;
    dng01: number;
    dng02: number;
    dnp09: number;
    reason: string;
  } {
    if (this.fireCooldown > 0) this.fireCooldown -= dt;

    const buttons: DoomButtons = {
      turnLeft: false,
      turnRight: false,
      moveForward: false,
      moveBackward: false,
      strafeLeft: false,
      strafeRight: false,
      fire: false
    };
    let giantFiberSpike = false;
    this.dng01ForwardLevel = 0;
    this.dng02SteeringLevel = 0;
    this.dnp09SaccadeLevel = 0;

    // ── 1. Lobula Plate Visual Threat Detection (Scan for Demons) ──────────
    let closestDemon: DemonEntity | null = null;
    let minDemonDist = 999;
    let demonAngleDelta = 0;

    for (const demon of demons) {
      if (demon.state === 'DEAD') continue;
      const dx = demon.x - player.x;
      const dy = demon.y - player.y;
      const dist = Math.hypot(dx, dy);

      // Only track demons within reasonable sensory range (up to 14 tiles)
      if (dist > 14 || dist >= minDemonDist) continue;

      const worldAngle = Math.atan2(dy, dx);
      const aDiff = this.angleDiff(worldAngle, player.angleRad);

      // Within FOV (~100 degrees) and has clear line of sight
      if (Math.abs(aDiff) < 0.95 && this.hasLOS(player.x, player.y, demon.x, demon.y)) {
        minDemonDist = dist;
        closestDemon = demon;
        demonAngleDelta = aDiff;
      }
    }

    this.fearSpikeLevel = closestDemon && minDemonDist < 10
      ? Math.min(1.0, (10 - minDemonDist) / 8.0)
      : 0;

    // ── 2. Mushroom Body PAM Dopamine (Scan for Health/Ammo Pickups) ────────
    let closestItem: ItemEntity | null = null;
    let minItemDist = 999;
    let itemAngleDelta = 0;

    for (const item of items) {
      if (item.pickedUp) continue;
      const dx = item.x - player.x;
      const dy = item.y - player.y;
      const dist = Math.hypot(dx, dy);
      const worldAngle = Math.atan2(dy, dx);
      const aDiff = this.angleDiff(worldAngle, player.angleRad);

      if (Math.abs(aDiff) < 1.2 && dist < minItemDist && this.hasLOS(player.x, player.y, item.x, item.y)) {
        minItemDist = dist;
        closestItem = item;
        itemAngleDelta = aDiff;
      }
    }
    this.rewardSpikeLevel = closestItem && minItemDist < 8
      ? Math.min(1.0, (8 - minItemDist) / 7.0)
      : 0;

    // ── 3. Connectome Action Selection ─────────────────────────────────────
    const ringState = this.ringAttractor.getState();

    // Helper: Test if forward movement is safe from hitting a wall
    const frontWallDist = this.castRay(player.x, player.y, player.dirX, player.dirY, 3.0);
    const canSafelyAdvance = frontWallDist > 0.80;

    // Condition 0: Ellipsoid Body Compass Lesion
    if (ringState.stability < 0.5 || ringState.lesionPercentage >= 40) {
      buttons.turnLeft = true;
      buttons.moveForward = Math.random() > 0.4 && canSafelyAdvance;
      this.lastDecisionReason = 'EB LESION: COMPASS INCOHERENCE (SPINNING)';
    }

    // Condition A: Demon in sight (Active Combat)
    else if (closestDemon) {
      if (Math.abs(demonAngleDelta) < this.aimTolerance) {
        // Aligned with crosshair -> Fire Shotgun!
        if (this.fireCooldown <= 0 && player.ammo > 0) {
          buttons.fire = true;
          giantFiberSpike = true;
          this.fireCooldown = 0.5; // Shotgun pump
          this.lastDecisionReason = 'GIANT FIBER SPIKE: FIRE SHOTGUN';
        } else {
          this.lastDecisionReason = 'TARGET LOCKED: HOLDING SIGHTS';
        }

        // Tactical movement during combat:
        // Lateral clearances for circle-strafing and evasive maneuvers
        const leftWallDist = this.castRay(player.x, player.y, -player.dirY, player.dirX, 2.5);
        const rightWallDist = this.castRay(player.x, player.y, player.dirY, -player.dirX, 2.5);

        // Advance if demon is beyond shotgun sweet spot (> 2.0 units) AND path is clear
        if (minDemonDist > 2.0 && canSafelyAdvance) {
          buttons.moveForward = true;
          this.dng01ForwardLevel = 0.8;
        } else if (minDemonDist < 1.3) {
          // Backpedal only if space behind is clear
          const backDist = this.castRay(player.x, player.y, -player.dirX, -player.dirY, 1.5);
          if (backDist > 0.6) {
            buttons.moveBackward = true;
            this.dng01ForwardLevel = -0.7;
          }
        }

        // DNp09 Lateral Evasive Saccade & Tactical Circle-Strafing:
        // Strafe around the demon to dodge melee/fireballs while keeping gun trained!
        if (minDemonDist < 3.8) {
          if (leftWallDist > 0.9 && leftWallDist >= rightWallDist) {
            buttons.strafeLeft = true;
            this.dnp09SaccadeLevel = -0.85;
          } else if (rightWallDist > 0.9) {
            buttons.strafeRight = true;
            this.dnp09SaccadeLevel = 0.85;
          }
        }
      } else {
        // P-EN Steered tracking towards demon
        if (demonAngleDelta < 0) {
          buttons.turnLeft = true;
          this.dng02SteeringLevel = -0.9;
          this.lastDecisionReason = 'P-EN STEERING: AIMING LEFT AT DEMON';
        } else {
          buttons.turnRight = true;
          this.dng02SteeringLevel = 0.9;
          this.lastDecisionReason = 'P-EN STEERING: AIMING RIGHT AT DEMON';
        }

        // If roughly aligned and far away, advance while turning only if wall is not in front
        if (minDemonDist > 2.5 && Math.abs(demonAngleDelta) < 0.5 && canSafelyAdvance) {
          buttons.moveForward = true;
          this.dng01ForwardLevel = 0.6;
        }
      }
    }

    // Condition B: Needs supplies & item in view
    else if (closestItem && (player.health < 60 || player.ammo < 10)) {
      if (Math.abs(itemAngleDelta) < 0.2) {
        if (canSafelyAdvance) {
          buttons.moveForward = true;
          this.dng01ForwardLevel = 0.8;
        }
        this.lastDecisionReason = 'PAM DOPAMINE: COLLECTING SUPPLIES';
      } else if (itemAngleDelta < 0) {
        buttons.turnLeft = true;
        this.dng02SteeringLevel = -0.8;
        this.lastDecisionReason = 'PAM DOPAMINE: TURNING TO SUPPLIES';
      } else {
        buttons.turnRight = true;
        this.dng02SteeringLevel = 0.8;
        this.lastDecisionReason = 'PAM DOPAMINE: TURNING TO SUPPLIES';
      }
    }

    // Condition C: Drosophila Optic Flow Centering & Whole-Maze Corridor Exploration
    else {
      if (this.cornerTurnTimer > 0) {
        this.cornerTurnTimer -= dt;
      }

      // Cast sensory distance rays: Center (0°), Left (+35°), Right (-35°)
      const angle = player.angleRad;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Center distance straight ahead
      const distCenter = this.castRay(player.x, player.y, cosA, sinA, 6.0);

      // Left distance (+35 deg)
      const leftAngle = angle - 0.61;
      const distLeft = this.castRay(player.x, player.y, Math.cos(leftAngle), Math.sin(leftAngle), 4.5);

      // Right distance (-35 deg)
      const rightAngle = angle + 0.61;
      const distRight = this.castRay(player.x, player.y, Math.cos(rightAngle), Math.sin(rightAngle), 4.5);

      // 1. Approaching a wall directly in front
      if (distCenter < 1.3) {
        // If not already in a committed turn, pick the more open direction and LATCH it for 0.4s
        if (this.cornerTurnTimer <= 0) {
          this.cornerTurnDir = distLeft >= distRight ? -1 : 1;
          this.cornerTurnTimer = 0.4;
        }

        // Execute latched turn
        if (this.cornerTurnDir < 0) {
          buttons.turnLeft = true;
          this.dng02SteeringLevel = -1.0;
        } else {
          buttons.turnRight = true;
          this.dng02SteeringLevel = 1.0;
        }

        // Only move forward if distance to wall is comfortably greater than 0.75
        // This ensures the fly NEVER bumps the wall!
        if (distCenter > 0.75) {
          buttons.moveForward = true;
          this.dng01ForwardLevel = 0.4;
        }
        this.lastDecisionReason = 'EB COMPASS: CORNER NAVIGATION';
      }
      // 2. Active turn still completing
      else if (this.cornerTurnTimer > 0) {
        if (this.cornerTurnDir < 0) {
          buttons.turnLeft = true;
          this.dng02SteeringLevel = -1.0;
        } else {
          buttons.turnRight = true;
          this.dng02SteeringLevel = 1.0;
        }
        if (distCenter > 0.75) {
          buttons.moveForward = true;
          this.dng01ForwardLevel = 0.4;
        }
        this.lastDecisionReason = 'EB COMPASS: CORNER NAVIGATION';
      }
      // 3. Corridor ahead is clear and open!
      else {
        this.cornerTurnDir = 0;
        buttons.moveForward = true;
        this.dng01ForwardLevel = 1.0;

        // Corridor centering with generous safety margin:
        // Steer away from walls early (0.75 cushion) to avoid brushing sides
        if (distLeft < 0.75 && distRight > 0.85) {
          buttons.turnRight = true;
          buttons.strafeRight = true; // Side-slip away from wall
          this.dng02SteeringLevel = 0.5;
          this.dnp09SaccadeLevel = 0.5;
        } else if (distRight < 0.75 && distLeft > 0.85) {
          buttons.turnLeft = true;
          buttons.strafeLeft = true; // Side-slip away from wall
          this.dng02SteeringLevel = -0.5;
          this.dnp09SaccadeLevel = -0.5;
        } else if (distCenter < 2.2) {
          // Anticipatory curve into bending corridor
          if (distLeft > distRight + 0.5) {
            buttons.turnLeft = true;
            this.dng02SteeringLevel = -0.6;
          } else if (distRight > distLeft + 0.5) {
            buttons.turnRight = true;
            this.dng02SteeringLevel = 0.6;
          }
        }

        this.lastDecisionReason = 'EB COMPASS: CORRIDOR PATROL';
      }
    }

    this.giantFiberActive = giantFiberSpike;
    this.ringAttractor.update(dt, buttons.turnLeft ? -2.5 : buttons.turnRight ? 2.5 : 0);

    return {
      buttons,
      fearLevel: this.fearSpikeLevel,
      rewardLevel: this.rewardSpikeLevel,
      giantFiberSpike,
      dng01: this.dng01ForwardLevel,
      dng02: this.dng02SteeringLevel,
      dnp09: this.dnp09SaccadeLevel,
      reason: this.lastDecisionReason
    };
  }
}
