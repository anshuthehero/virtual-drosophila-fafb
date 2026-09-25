import { DemonEntity, DoomButtons, DoomPlayer, ItemEntity } from './types';
import { RingAttractorModel } from '../simulation/ringAttractor';
import { DOOM_GRID, DOOM_MAP_HEIGHT, DOOM_MAP_WIDTH } from './doomMap';

export class FlyBrainDoomAgent {
  public ringAttractor: RingAttractorModel;
  public fearSpikeLevel: number = 0;
  public rewardSpikeLevel: number = 0;
  public giantFiberActive: boolean = false;
  public lastDecisionReason: string = 'EXPLORING_CORRIDORS';

  private aimTolerance: number = 0.15; // radians (~8.6 degrees)
  private fireCooldown: number = 0;
  private wanderTimer: number = 0;
  private wanderTurnBias: number = 0;

  constructor() {
    this.ringAttractor = new RingAttractorModel();
  }

  public setEBLesion(percent: number) {
    this.ringAttractor.setLesionPercentage(percent);
    this.ringAttractor.update(0.05, 0);
  }

  /**
   * BUG FIX: Grid-based line-of-sight check so agent won't fire through walls.
   * Marches a ray from (x0,y0) to (x1,y1) and returns false if any wall is hit.
   */
  private hasLOS(x0: number, y0: number, x1: number, y1: number): boolean {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.ceil(dist * 10);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const cx = x0 + (x1 - x0) * t;
      const cy = y0 + (y1 - y0) * t;
      const mx = Math.floor(cx);
      const my = Math.floor(cy);
      if (mx < 0 || mx >= DOOM_MAP_WIDTH || my < 0 || my >= DOOM_MAP_HEIGHT) return false;
      if (DOOM_GRID[my][mx] > 0) return false;
    }
    return true;
  }

  /**
   * Main neural arbitration loop:
   * Translates 3D sensory inputs -> FlyWire circuits -> Doom button presses
   */
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
    reason: string;
  } {
    if (this.fireCooldown > 0) {
      this.fireCooldown -= dt;
    }

    const buttons: DoomButtons = {
      turnLeft: false,
      turnRight: false,
      moveForward: false,
      moveBackward: false,
      fire: false
    };

    let giantFiberSpike = false;
    let closestDemon: DemonEntity | null = null;
    let minDemonDist = 999;
    let demonAngleDelta = 0;

    // 1. Scan FOV for demons (Lobula Plate & LPLC2 Visual Looming Detectors)
    // BUG FIX #1: Clamp to 12-unit visibility range (was 999)
    // BUG FIX #2: Add LOS check so agent can't "see" demons through walls
    for (const demon of demons) {
      if (demon.state === 'DEAD') continue;

      const dx = demon.x - player.x;
      const dy = demon.y - player.y;
      const dist = Math.hypot(dx, dy);

      // Only react to demons within visible range
      if (dist > 12 || dist >= minDemonDist) continue;

      // Angle from player to demon (world space)
      const demonWorldAngle = Math.atan2(dy, dx);
      let angleDiff = demonWorldAngle - player.angleRad;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      // BUG FIX #3: Tighten FOV to ~100 degrees (was ~115)
      if (Math.abs(angleDiff) < 0.87) {
        // BUG FIX #4: Line-of-sight check — don't target demons behind walls
        if (this.hasLOS(player.x, player.y, demon.x, demon.y)) {
          minDemonDist = dist;
          closestDemon = demon;
          demonAngleDelta = angleDiff;
        }
      }
    }

    // Compute looming threat intensity
    let threatIntensity = 0;
    if (closestDemon && minDemonDist < 10) {
      threatIntensity = Math.min(1.0, (10 - minDemonDist) / 8.0);
    }
    this.fearSpikeLevel = threatIntensity;

    // 2. Scan for Health / Ammo Items (Antennal Lobe ALPN & PAM Dopamine)
    let closestItem: ItemEntity | null = null;
    let minItemDist = 999;
    let itemAngleDelta = 0;

    for (const item of items) {
      if (item.pickedUp) continue;
      const dx = item.x - player.x;
      const dy = item.y - player.y;
      const dist = Math.hypot(dx, dy);

      const itemWorldAngle = Math.atan2(dy, dx);
      let angleDiff = itemWorldAngle - player.angleRad;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) < 1.2 && dist < minItemDist) {
        minItemDist = dist;
        closestItem = item;
        itemAngleDelta = angleDiff;
      }
    }

    let rewardIntensity = 0;
    if (closestItem && minItemDist < 8) {
      rewardIntensity = Math.min(1.0, (8 - minItemDist) / 7.0);
    }
    this.rewardSpikeLevel = rewardIntensity;

    // 3. Connectome Action Selection
    const ebStability = this.ringAttractor.getState().stability;

    // Case A: Demon detected in visible FOV with confirmed line-of-sight
    if (closestDemon) {
      if (Math.abs(demonAngleDelta) < this.aimTolerance) {
        // TARGET LOCKED IN CROSSHAIR!
        if (this.fireCooldown <= 0 && player.ammo > 0) {
          // Giant Fiber fires ballistic shotgun blast!
          buttons.fire = true;
          giantFiberSpike = true;
          this.fireCooldown = 0.6; // Shotgun pump cycle
          this.lastDecisionReason = 'GIANT FIBER SPIKE: FIRE SHOTGUN';
        } else {
          // Maintain position / distance
          buttons.moveForward = minDemonDist > 3.0;
          buttons.moveBackward = minDemonDist < 1.8;
          this.lastDecisionReason = 'TARGET LOCKED: MAINTAINING DISTANCE';
        }
      } else {
        // Demon off-center: E-PG / P-EN steering turns to aim
        if (demonAngleDelta < 0) {
          buttons.turnLeft = true;
          this.lastDecisionReason = 'P-EN STEERING: AIMING LEFT AT DEMON';
        } else {
          buttons.turnRight = true;
          this.lastDecisionReason = 'P-EN STEERING: AIMING RIGHT AT DEMON';
        }
        // Approach while tracking
        buttons.moveForward = minDemonDist > 3.5;
      }
    }
    // Case B: No demons visible, but supplies needed
    else if (closestItem && (player.health < 60 || player.ammo < 8)) {
      if (Math.abs(itemAngleDelta) < 0.2) {
        buttons.moveForward = true;
        this.lastDecisionReason = 'PAM DOPAMINE: COLLECTING SUPPLIES';
      } else if (itemAngleDelta < 0) {
        buttons.turnLeft = true;
        this.lastDecisionReason = 'PAM DOPAMINE: TURNING TO SUPPLIES';
      } else {
        buttons.turnRight = true;
        this.lastDecisionReason = 'PAM DOPAMINE: TURNING TO SUPPLIES';
      }
    }
    // Case C: Labyrinth Exploration & Patrol
    else {
      this.wanderTimer -= dt;

      // Refresh wander direction every 1.5–3s (less frequent = less spinning)
      if (this.wanderTimer <= 0) {
        this.wanderTurnBias = (Math.random() - 0.5) * 2.0; // -1 to +1
        this.wanderTimer = 1.5 + Math.random() * 1.5;
      }

      const ringState = this.ringAttractor.getState();
      if (ringState.stability < 0.5 || ringState.lesionPercentage >= 40) {
        // EB Lesion: compass incoherence → erratic spinning
        buttons.turnLeft = true;
        buttons.moveForward = Math.random() > 0.4;
        this.lastDecisionReason = 'EB LESION: COMPASS INCOHERENCE (SPINNING)';
      } else {
        // Forward-biased patrol: always moving, steer gently
        // Only turn when bias is strong — this avoids constant spinning
        buttons.moveForward = true;

        const steerStrength = Math.abs(this.wanderTurnBias);
        if (steerStrength > 0.5) {
          // Interleave turn + forward (not pure turn) so it actually travels
          if (this.wanderTurnBias < 0) buttons.turnLeft = true;
          else buttons.turnRight = true;
        }
        this.lastDecisionReason = 'EB COMPASS: CORRIDOR PATROL';
      }
    }

    this.giantFiberActive = giantFiberSpike;

    // Update internal ring attractor with current heading
    this.ringAttractor.update(dt, buttons.turnLeft ? -2.5 : buttons.turnRight ? 2.5 : 0);

    return {
      buttons,
      fearLevel: this.fearSpikeLevel,
      rewardLevel: this.rewardSpikeLevel,
      giantFiberSpike,
      reason: this.lastDecisionReason
    };
  }
}
