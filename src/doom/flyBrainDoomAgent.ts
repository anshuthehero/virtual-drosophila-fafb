import { DemonEntity, DoomButtons, DoomPlayer, ItemEntity } from './types';
import { RingAttractorModel } from '../simulation/ringAttractor';
import { DOOM_GRID, DOOM_MAP_HEIGHT, DOOM_MAP_WIDTH } from './doomMap';

type WanderPhase = 'MOVE' | 'TURN';

export class FlyBrainDoomAgent {
  public ringAttractor: RingAttractorModel;
  public fearSpikeLevel: number = 0;
  public rewardSpikeLevel: number = 0;
  public giantFiberActive: boolean = false;
  public lastDecisionReason: string = 'EXPLORING_CORRIDORS';

  private aimTolerance: number = 0.15;
  private fireCooldown: number = 0;

  // Wander state machine: MOVE straight, then TURN to a new heading
  private wanderPhase: WanderPhase = 'MOVE';
  private wanderMoveTimer: number = 1.5;  // seconds to move straight
  private wanderTurnTimer: number = 0;    // seconds left to turn
  private wanderTurnDir: number = 1;      // +1 = right, -1 = left

  constructor() {
    this.ringAttractor = new RingAttractorModel();
  }

  public setEBLesion(percent: number) {
    this.ringAttractor.setLesionPercentage(percent);
    this.ringAttractor.update(0.05, 0);
  }

  /** Grid-based LOS check — returns false if any wall blocks the ray */
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

  /** Check if player can move to a position (same logic as App.tsx canMoveTo) */
  private canMove(x: number, y: number): boolean {
    const r = 0.25;
    for (const dx of [-r, r]) {
      for (const dy of [-r, r]) {
        const mx = Math.floor(x + dx);
        const my = Math.floor(y + dy);
        if (mx < 0 || mx >= DOOM_MAP_WIDTH || my < 0 || my >= DOOM_MAP_HEIGHT) return false;
        if (DOOM_GRID[my][mx] > 0) return false;
      }
    }
    return true;
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

    // ── 1. SCAN: find closest visible demon ────────────────────────────────
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
      let angleDiff = worldAngle - player.angleRad;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) < 0.87 && this.hasLOS(player.x, player.y, demon.x, demon.y)) {
        minDemonDist = dist;
        closestDemon = demon;
        demonAngleDelta = angleDiff;
      }
    }

    this.fearSpikeLevel = closestDemon && minDemonDist < 10
      ? Math.min(1.0, (10 - minDemonDist) / 8.0) : 0;

    // ── 2. SCAN: find closest item if needed ───────────────────────────────
    let closestItem: ItemEntity | null = null;
    let minItemDist = 999;
    let itemAngleDelta = 0;

    for (const item of items) {
      if (item.pickedUp) continue;
      const dx = item.x - player.x;
      const dy = item.y - player.y;
      const dist = Math.hypot(dx, dy);
      const worldAngle = Math.atan2(dy, dx);
      let angleDiff = worldAngle - player.angleRad;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (Math.abs(angleDiff) < 1.2 && dist < minItemDist) {
        minItemDist = dist; closestItem = item; itemAngleDelta = angleDiff;
      }
    }
    this.rewardSpikeLevel = closestItem && minItemDist < 8
      ? Math.min(1.0, (8 - minItemDist) / 7.0) : 0;

    // ── 3. ACTION SELECTION ────────────────────────────────────────────────

    // Case A: Demon visible with LOS — COMBAT
    if (closestDemon) {
      if (Math.abs(demonAngleDelta) < this.aimTolerance) {
        // Crosshair locked — FIRE
        if (this.fireCooldown <= 0 && player.ammo > 0) {
          buttons.fire = true;
          giantFiberSpike = true;
          this.fireCooldown = 0.6;
          this.lastDecisionReason = 'GIANT FIBER SPIKE: FIRE SHOTGUN';
        } else {
          // Hold position / backpedal if too close
          if (minDemonDist > 3.0) buttons.moveForward = true;
          else if (minDemonDist < 1.8) buttons.moveBackward = true;
          this.lastDecisionReason = 'TARGET LOCKED: HOLDING POSITION';
        }
      } else {
        // Turn ONLY — no forward during aiming turn (avoids circular arc)
        if (demonAngleDelta < 0) buttons.turnLeft = true;
        else buttons.turnRight = true;
        // Approach only when demon is far and roughly ahead
        if (minDemonDist > 4.0 && Math.abs(demonAngleDelta) < 0.5) {
          buttons.moveForward = true;
        }
        this.lastDecisionReason = demonAngleDelta < 0
          ? 'P-EN STEERING: AIMING LEFT AT DEMON' : 'P-EN STEERING: AIMING RIGHT AT DEMON';
      }
      // Reset wander so exploration restarts cleanly after combat
      this.wanderPhase = 'MOVE';
      this.wanderMoveTimer = 1.0;
    }

    // Case B: Low resources + item visible — SEEK
    else if (closestItem && (player.health < 60 || player.ammo < 8)) {
      if (Math.abs(itemAngleDelta) < 0.15) {
        buttons.moveForward = true;
        this.lastDecisionReason = 'PAM DOPAMINE: COLLECTING SUPPLIES';
      } else {
        // Turn only, no forward — stops the circle problem
        if (itemAngleDelta < 0) buttons.turnLeft = true;
        else buttons.turnRight = true;
        this.lastDecisionReason = 'PAM: TURNING TO SUPPLIES';
      }
      this.wanderPhase = 'MOVE';
      this.wanderMoveTimer = 1.0;
    }

    // Case C: WANDER — two-phase state machine
    // Phase MOVE: go straight until hitting a wall or timer expires
    // Phase TURN: rotate in place to a new direction, then switch back to MOVE
    else {
      const ringState = this.ringAttractor.getState();

      if (ringState.stability < 0.5 || ringState.lesionPercentage >= 40) {
        // EB Lesion: erratic spinning
        buttons.turnLeft = true;
        if (Math.random() > 0.4) buttons.moveForward = true;
        this.lastDecisionReason = 'EB LESION: COMPASS INCOHERENCE';
      } else {
        // Check if a wall is directly in front
        const lookAhead = 0.55;
        const frontX = player.x + player.dirX * lookAhead;
        const frontY = player.y + player.dirY * lookAhead;
        const wallAhead = !this.canMove(frontX, frontY);

        if (this.wanderPhase === 'MOVE') {
          if (wallAhead || this.wanderMoveTimer <= 0) {
            // Hit wall or timer done → switch to TURN phase
            this.wanderPhase = 'TURN';
            // Pick a random turn direction and duration (0.4–1.0s)
            this.wanderTurnDir = Math.random() < 0.5 ? -1 : 1;
            this.wanderTurnTimer = 0.4 + Math.random() * 0.6;
            this.lastDecisionReason = 'EB COMPASS: WALL DETECTED, TURNING';
          } else {
            // Move straight ahead
            this.wanderMoveTimer -= dt;
            buttons.moveForward = true;
            this.lastDecisionReason = 'EB COMPASS: CORRIDOR PATROL';
          }
        }

        if (this.wanderPhase === 'TURN') {
          this.wanderTurnTimer -= dt;
          if (this.wanderTurnTimer <= 0) {
            // Done turning → switch back to MOVE with a fresh timer
            this.wanderPhase = 'MOVE';
            this.wanderMoveTimer = 1.2 + Math.random() * 1.5; // 1.2–2.7s straight
            this.lastDecisionReason = 'EB COMPASS: CORRIDOR PATROL';
          } else {
            // Turn in place ONLY — no forward so it doesn't arc
            if (this.wanderTurnDir > 0) buttons.turnRight = true;
            else buttons.turnLeft = true;
            this.lastDecisionReason = 'EB COMPASS: FINDING NEW HEADING';
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
