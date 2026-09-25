import { DemonEntity, DoomButtons, DoomPlayer, ItemEntity } from './types';
import { RingAttractorModel } from '../simulation/ringAttractor';

export class FlyBrainDoomAgent {
  public ringAttractor: RingAttractorModel;
  public fearSpikeLevel: number = 0;
  public rewardSpikeLevel: number = 0;
  public giantFiberActive: boolean = false;
  public lastDecisionReason: string = 'EXPLORING_CORRIDORS';

  private aimTolerance: number = 0.18; // radians (~10 degrees)
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
    for (const demon of demons) {
      if (demon.state === 'DEAD') continue;

      const dx = demon.x - player.x;
      const dy = demon.y - player.y;
      const dist = Math.hypot(dx, dy);

      // Angle from player to demon
      const demonWorldAngle = Math.atan2(dy, dx);
      let angleDiff = demonWorldAngle - player.angleRad;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      // If within 110-degree FOV in front
      if (Math.abs(angleDiff) < 1.0 && dist < minDemonDist) {
        minDemonDist = dist;
        closestDemon = demon;
        demonAngleDelta = angleDiff;
      }
    }

    // Compute looming threat intensity
    let threatIntensity = 0;
    if (closestDemon && minDemonDist < 10) {
      // Threat increases quadratically as demon gets closer
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

    // Case A: Demon detected in FOV
    if (closestDemon) {
      // Check if demon is lined up with the center crosshair
      if (Math.abs(demonAngleDelta) < this.aimTolerance) {
        // TARGET LOCKED IN CROSSHAIR!
        if (this.fireCooldown <= 0 && player.ammo > 0) {
          // Giant Fiber fires ballistic shotgun blast!
          buttons.fire = true;
          giantFiberSpike = true;
          this.fireCooldown = 0.55; // Shotgun pump cycle
          this.lastDecisionReason = 'GIANT FIBER SPIKE: FIRE SHOTGUN';
        } else {
          // If already fired or low on ammo, move or maintain aim
          buttons.moveForward = minDemonDist > 3.0; // Advance if far
          buttons.moveBackward = minDemonDist < 1.8; // Backpedal if too close!
          this.lastDecisionReason = 'TARGET LOCKED: MAINTAINING DISTANCE';
        }
      } else {
        // Demon is off-center: E-PG / P-EN steering turns towards demon to aim!
        if (demonAngleDelta < 0) {
          buttons.turnLeft = true;
          this.lastDecisionReason = 'P-EN STEERING: AIMING LEFT AT DEMON';
        } else {
          buttons.turnRight = true;
          this.lastDecisionReason = 'P-EN STEERING: AIMING RIGHT AT DEMON';
        }

        // Slight forward approach while tracking
        buttons.moveForward = minDemonDist > 3.5;
      }
    }
    // Case B: No demons in sight, but health/ammo item nearby and player is low
    else if (closestItem && (player.health < 60 || player.ammo < 8)) {
      if (Math.abs(itemAngleDelta) < 0.2) {
        buttons.moveForward = true;
        this.lastDecisionReason = 'PAM DOPAMINE: COLLECTING SUPPLIES';
      } else if (itemAngleDelta < 0) {
        buttons.turnLeft = true;
      } else {
        buttons.turnRight = true;
      }
    }
    // Case C: Labyrinth Exploration & Patrol
    else {
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderTurnBias = (Math.random() - 0.5) * 1.5;
        this.wanderTimer = 0.8 + Math.random() * 1.5;
      }

      // If EB compass is damaged (>35% or stability < 0.5), induce continuous erratic spinning!
      const ringState = this.ringAttractor.getState();
      if (ringState.stability < 0.5 || ringState.lesionPercentage >= 40) {
        buttons.turnLeft = true;
        buttons.moveForward = Math.random() > 0.4;
        this.lastDecisionReason = 'EB LESION: COMPASS INCOHERENCE (SPINNING)';
      } else {
        buttons.moveForward = true;
        if (this.wanderTurnBias < -0.3) buttons.turnLeft = true;
        else if (this.wanderTurnBias > 0.3) buttons.turnRight = true;
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
