import { DemonEntity, DoomButtons, DoomPlayer, ItemEntity } from './types';
import { RingAttractorModel } from '../simulation/ringAttractor';
import { DOOM_GRID, DOOM_MAP_HEIGHT, DOOM_MAP_WIDTH } from './doomMap';

type WanderPhase = 'MOVE' | 'TURNING';

export class FlyBrainDoomAgent {
  public ringAttractor: RingAttractorModel;
  public fearSpikeLevel: number = 0;
  public rewardSpikeLevel: number = 0;
  public giantFiberActive: boolean = false;
  public lastDecisionReason: string = 'EXPLORING_CORRIDORS';

  private aimTolerance: number = 0.15;
  private fireCooldown: number = 0;

  // Wander: MOVE straight → detect wall → pick best open heading → TURN to it → MOVE
  private wanderPhase: WanderPhase = 'MOVE';
  private wanderMoveTimer: number = 2.0;
  private targetAngle: number = 0;        // world angle we're turning to face
  private stuckTimer: number = 0;         // how long since we last moved
  private lastX: number = -999;
  private lastY: number = -999;

  constructor() {
    this.ringAttractor = new RingAttractorModel();
    this.targetAngle = 0;
  }

  public setEBLesion(percent: number) {
    this.ringAttractor.setLesionPercentage(percent);
    this.ringAttractor.update(0.05, 0);
  }

  /** Grid LOS: returns false if wall blocks ray from (x0,y0) to (x1,y1) */
  private hasLOS(x0: number, y0: number, x1: number, y1: number): boolean {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.ceil(dist * 10);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const mx = Math.floor(x0 + (x1 - x0) * t);
      const my = Math.floor(y0 + (y1 - y0) * t);
      if (mx < 0 || mx >= DOOM_MAP_WIDTH || my < 0 || my >= DOOM_MAP_HEIGHT) return false;
      if (DOOM_GRID[my][mx] > 0) return false;
    }
    return true;
  }

  /** How far we can walk in direction (cos θ, sin θ) before hitting a wall — max 6 units */
  private castRay(x: number, y: number, dirX: number, dirY: number): number {
    const max = 6.0;
    const steps = 60; // 0.1 unit per step
    for (let i = 1; i <= steps; i++) {
      const cx = x + dirX * (i / 10);
      const cy = y + dirY * (i / 10);
      const mx = Math.floor(cx);
      const my = Math.floor(cy);
      if (mx < 0 || mx >= DOOM_MAP_WIDTH || my < 0 || my >= DOOM_MAP_HEIGHT) return i / 10;
      if (DOOM_GRID[my][mx] > 0) return i / 10;
    }
    return max;
  }

  /**
   * Scan 8 directions from current position, return the world angle with the
   * longest clear path. Biased toward the current heading to avoid U-turns.
   */
  private bestOpenAngle(px: number, py: number, currentAngle: number): number {
    let bestAngle = currentAngle;
    let bestDist = -1;

    const candidates = 8;
    for (let i = 0; i < candidates; i++) {
      const angle = currentAngle + (i / candidates) * Math.PI * 2;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      // Penalize angles that require a big turn (prefer forward-ish directions)
      const turnCost = Math.abs(Math.atan2(Math.sin(angle - currentAngle), Math.cos(angle - currentAngle)));
      const clearDist = this.castRay(px, py, dx, dy) - turnCost * 0.3;
      if (clearDist > bestDist) {
        bestDist = clearDist;
        bestAngle = angle;
      }
    }
    return bestAngle;
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
    reason: string;
  } {
    if (this.fireCooldown > 0) this.fireCooldown -= dt;

    const buttons: DoomButtons = {
      turnLeft: false, turnRight: false,
      moveForward: false, moveBackward: false,
      fire: false
    };
    let giantFiberSpike = false;

    // ── stuck detector: if barely moved in 0.8s, force a new heading ──────
    const movedDist = Math.hypot(player.x - this.lastX, player.y - this.lastY);
    if (movedDist < 0.02) {
      this.stuckTimer += dt;
    } else {
      this.stuckTimer = 0;
      this.lastX = player.x;
      this.lastY = player.y;
    }
    const isStuck = this.stuckTimer > 0.8;

    // ── 1. Find closest visible demon ─────────────────────────────────────
    let closestDemon: DemonEntity | null = null;
    let minDemonDist = 999;
    let demonAngleDelta = 0;

    for (const demon of demons) {
      if (demon.state === 'DEAD') continue;
      const dx = demon.x - player.x;
      const dy = demon.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 12 || dist >= minDemonDist) continue;

      const worldAngle = Math.atan2(dy, dx);
      const aDiff = this.angleDiff(worldAngle, player.angleRad);

      if (Math.abs(aDiff) < 0.87 && this.hasLOS(player.x, player.y, demon.x, demon.y)) {
        minDemonDist = dist;
        closestDemon = demon;
        demonAngleDelta = aDiff;
      }
    }

    this.fearSpikeLevel = closestDemon && minDemonDist < 10
      ? Math.min(1.0, (10 - minDemonDist) / 8.0) : 0;

    // ── 2. Find closest item ───────────────────────────────────────────────
    let closestItem: ItemEntity | null = null;
    let minItemDist = 999;
    let itemAngleDelta = 0;

    for (const item of items) {
      if (item.pickedUp) continue;
      const dx = item.x - player.x;
      const dy = item.y - player.y;
      const dist = Math.hypot(dx, dy);
      const aDiff = this.angleDiff(Math.atan2(dy, dx), player.angleRad);
      if (Math.abs(aDiff) < 1.2 && dist < minItemDist) {
        minItemDist = dist; closestItem = item; itemAngleDelta = aDiff;
      }
    }
    this.rewardSpikeLevel = closestItem && minItemDist < 8
      ? Math.min(1.0, (8 - minItemDist) / 7.0) : 0;

    // ── 3. ACTION SELECTION ────────────────────────────────────────────────

    // Case A: COMBAT — demon visible and has LOS
    if (closestDemon && !isStuck) {
      if (Math.abs(demonAngleDelta) < this.aimTolerance) {
        // Crosshair locked — FIRE
        if (this.fireCooldown <= 0 && player.ammo > 0) {
          buttons.fire = true;
          giantFiberSpike = true;
          this.fireCooldown = 0.6;
          this.lastDecisionReason = 'GIANT FIBER SPIKE: FIRE SHOTGUN';
        }
        // ALWAYS approach demon unless very close — fixes the dead-zone freeze
        if (minDemonDist > 1.8) buttons.moveForward = true;
        else buttons.moveBackward = true;
        if (!buttons.fire) this.lastDecisionReason = 'TARGET LOCKED: ADVANCING';
      } else {
        // Steer toward demon — turn only, no forward unless well-aligned
        if (demonAngleDelta < 0) buttons.turnLeft = true;
        else buttons.turnRight = true;
        // Only approach if we're fairly well aimed (< 0.4 rad) and far
        if (minDemonDist > 2.5 && Math.abs(demonAngleDelta) < 0.4) {
          buttons.moveForward = true;
        }
        this.lastDecisionReason = demonAngleDelta < 0
          ? 'P-EN STEERING: AIMING LEFT AT DEMON'
          : 'P-EN STEERING: AIMING RIGHT AT DEMON';
      }
      // Reset wander state so next patrol starts fresh
      this.wanderPhase = 'MOVE';
      this.wanderMoveTimer = 1.5;
    }

    // Case B: SEEK supplies
    else if (closestItem && (player.health < 60 || player.ammo < 8) && !isStuck) {
      if (Math.abs(itemAngleDelta) < 0.15) {
        buttons.moveForward = true;
        this.lastDecisionReason = 'PAM DOPAMINE: COLLECTING SUPPLIES';
      } else {
        if (itemAngleDelta < 0) buttons.turnLeft = true;
        else buttons.turnRight = true;
        this.lastDecisionReason = 'PAM: TURNING TO SUPPLIES';
      }
      this.wanderPhase = 'MOVE';
      this.wanderMoveTimer = 1.5;
    }

    // Case C: EXPLORE — smart maze navigation
    else {
      const ringState = this.ringAttractor.getState();

      if (ringState.stability < 0.5 || ringState.lesionPercentage >= 40) {
        buttons.turnLeft = true;
        if (Math.random() > 0.4) buttons.moveForward = true;
        this.lastDecisionReason = 'EB LESION: COMPASS INCOHERENCE';
      } else {
        // Look ahead: how much clear space is straight in front?
        const lookDist = this.castRay(player.x, player.y, player.dirX, player.dirY);
        const wallAhead = lookDist < 0.6;

        if (isStuck || (wallAhead && this.wanderPhase === 'MOVE')) {
          // STUCK or WALL HIT → find the best open direction and commit to it
          this.stuckTimer = 0;
          const best = this.bestOpenAngle(player.x, player.y, player.angleRad);
          this.targetAngle = best;
          this.wanderPhase = 'TURNING';
          this.lastDecisionReason = 'EB COMPASS: FINDING OPEN PATH';
        }

        if (this.wanderPhase === 'TURNING') {
          const diff = this.angleDiff(this.targetAngle, player.angleRad);
          if (Math.abs(diff) < 0.08) {
            // Aligned with target heading → start moving
            this.wanderPhase = 'MOVE';
            this.wanderMoveTimer = 1.8 + Math.random() * 1.5; // 1.8–3.3s straight
            this.lastDecisionReason = 'EB COMPASS: CORRIDOR PATROL';
          } else {
            // Turn toward best heading — NO forward movement
            if (diff < 0) buttons.turnLeft = true;
            else buttons.turnRight = true;
            this.lastDecisionReason = 'EB COMPASS: FINDING OPEN PATH';
          }
        } else {
          // MOVE phase: go straight, count down timer
          this.wanderMoveTimer -= dt;
          if (this.wanderMoveTimer <= 0) {
            // Time's up → pick a new direction (slight random bias, not U-turn)
            const bias = (Math.random() - 0.5) * Math.PI * 0.9; // ±81° bias
            this.targetAngle = player.angleRad + bias;
            this.wanderPhase = 'TURNING';
            this.lastDecisionReason = 'EB COMPASS: CHOOSING NEXT CORRIDOR';
          } else {
            buttons.moveForward = true;
            this.lastDecisionReason = 'EB COMPASS: CORRIDOR PATROL';
          }
        }
      }
    }

    this.giantFiberActive = giantFiberSpike;
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
