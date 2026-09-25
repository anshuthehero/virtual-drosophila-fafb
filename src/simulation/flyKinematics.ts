import { FlyKinematics, LegId, LegJoints } from '../types/simulation';

const TWO_PI = Math.PI * 2;

// Anatomical base offsets of 6 legs relative to fly center (thorax)
// Fly body length is ~2.5mm in real life; in arena pixels we scale suitably
const LEG_CONFIG: Record<LegId, { dx: number; dy: number; restAngle: number; length1: number; length2: number }> = {
  L1: { dx: 6, dy: -6, restAngle: -Math.PI * 0.45, length1: 10, length2: 12 },
  L2: { dx: 0, dy: -8, restAngle: -Math.PI * 0.55, length1: 11, length2: 14 },
  L3: { dx: -7, dy: -6, restAngle: -Math.PI * 0.75, length1: 12, length2: 15 },
  R1: { dx: 6, dy: 6, restAngle: Math.PI * 0.45, length1: 10, length2: 12 },
  R2: { dx: 0, dy: 8, restAngle: Math.PI * 0.55, length1: 11, length2: 14 },
  R3: { dx: -7, dy: 6, restAngle: Math.PI * 0.75, length1: 12, length2: 15 }
};

export class FlyKinematicsModel {
  private state: FlyKinematics;
  private damagedLeg: LegId | null = null;
  private wingDamaged: boolean = false;

  constructor(startX: number, startY: number, startHeading: number = 0) {
    const legs: Record<LegId, LegJoints> = {} as any;
    for (const key of Object.keys(LEG_CONFIG) as LegId[]) {
      legs[key] = {
        id: key,
        baseX: 0,
        baseY: 0,
        coxaAngle: 0,
        femurAngle: 0,
        tibiaAngle: 0,
        tipX: 0,
        tipY: 0,
        isStance: true,
        isParesis: false
      };
    }

    this.state = {
      x: startX,
      y: startY,
      headingRad: startHeading,
      speedMmPerSec: 0,
      turnRateRadPerSec: 0,
      legs,
      tripodPhase: 0,
      proboscisLength: 0,
      leftWingAngle: 0,
      rightWingAngle: 0,
      wingDamaged: false
    };

    this.updateLegs(0);
  }

  public setIllness(damagedLeg: LegId | null, wingDamaged: boolean) {
    this.damagedLeg = damagedLeg;
    this.wingDamaged = wingDamaged;
    this.state.wingDamaged = wingDamaged;
    for (const key of Object.keys(this.state.legs) as LegId[]) {
      this.state.legs[key].isParesis = key === damagedLeg;
    }
  }

  /**
   * Step physical kinematics forward
   */
  public step(
    dt: number,
    commandForwardSpeed: number, // 0 to 1
    commandSteeringTorque: number, // -1 (left) to +1 (right)
    escapeBurst: boolean,
    proboscisDrive: number
  ) {
    // 1. Biomechanical limits
    const maxSpeed = escapeBurst && !this.wingDamaged ? 45.0 : 20.0; // mm/s
    const maxTurn = 6.0; // rad/s

    // If a leg is damaged (e.g. L2 paresis), it introduces asymmetric dragging torque
    let intrinsicTorqueBias = 0;
    let dragSlowdown = 1.0;

    if (this.damagedLeg) {
      dragSlowdown = 0.72; // Slower due to limp
      if (this.damagedLeg.startsWith('L')) {
        // Left leg damaged -> natural drag turns fly to the left
        intrinsicTorqueBias = -1.8;
      } else if (this.damagedLeg.startsWith('R')) {
        // Right leg damaged -> natural drag turns fly to the right
        intrinsicTorqueBias = 1.8;
      }
    }

    // How the fly handles it: Active neuromuscular compensation!
    // The fly exerts compensatory contralateral steering effort to maintain intended heading
    const compensatedSteering = commandSteeringTorque - intrinsicTorqueBias * 0.75;

    // Target linear and angular velocity
    const targetSpeed = commandForwardSpeed * maxSpeed * dragSlowdown;
    const targetTurn = (compensatedSteering * maxTurn) + (intrinsicTorqueBias * 0.25);

    // Inertial acceleration smoothing
    this.state.speedMmPerSec += (targetSpeed - this.state.speedMmPerSec) * Math.min(1.0, dt * 10);
    this.state.turnRateRadPerSec += (targetTurn - this.state.turnRateRadPerSec) * Math.min(1.0, dt * 12);

    // Update position and heading
    this.state.headingRad = (this.state.headingRad + this.state.turnRateRadPerSec * dt + TWO_PI) % TWO_PI;
    this.state.x += Math.cos(this.state.headingRad) * this.state.speedMmPerSec * dt * 12; // pixel scale factor
    this.state.y += Math.sin(this.state.headingRad) * this.state.speedMmPerSec * dt * 12;

    // Update tripod gait phase based on distance traveled
    const gaitFrequency = (this.state.speedMmPerSec / 8.0) * TWO_PI;
    this.state.tripodPhase = (this.state.tripodPhase + gaitFrequency * dt) % TWO_PI;

    // Proboscis extension reflex
    this.state.proboscisLength += (proboscisDrive - this.state.proboscisLength) * Math.min(1.0, dt * 8);

    // Wing flutter (high frequency when fleeing/frightened, gentle shudder when resting)
    if (escapeBurst && !this.wingDamaged) {
      const flutter = Math.sin(Date.now() * 0.08) * 0.45;
      this.state.leftWingAngle = 0.25 + flutter;
      this.state.rightWingAngle = -0.25 - flutter;
    } else {
      this.state.leftWingAngle = 0.05;
      this.state.rightWingAngle = -0.05;
    }

    this.updateLegs(dt);
  }

  /**
   * Calculate kinematics for all 6 articulated legs (Tripod A vs Tripod B)
   */
  private updateLegs(dt: number) {
    const cosH = Math.cos(this.state.headingRad);
    const sinH = Math.sin(this.state.headingRad);

    // Tripod 1: L1, R2, L3
    // Tripod 2: R1, L2, R3
    const phase1 = this.state.tripodPhase;
    const isTripod1Stance = Math.sin(phase1) >= 0;

    for (const legId of Object.keys(LEG_CONFIG) as LegId[]) {
      const cfg = LEG_CONFIG[legId];
      const leg = this.state.legs[legId];

      // Base joint on thorax in world coordinates
      const worldBaseX = this.state.x + (cfg.dx * cosH - cfg.dy * sinH);
      const worldBaseY = this.state.y + (cfg.dx * sinH + cfg.dy * cosH);
      leg.baseX = worldBaseX;
      leg.baseY = worldBaseY;

      // Determine if in stance or swing
      const belongsToTripod1 = legId === 'L1' || legId === 'R2' || legId === 'L3';
      let inStance = belongsToTripod1 ? isTripod1Stance : !isTripod1Stance;

      // In leg paresis / limp, damaged leg is dragged along with irregular stance
      if (leg.isParesis) {
        inStance = false; // Cannot push effectively
      }
      leg.isStance = inStance;

      // Swing amplitude
      const phaseOffset = belongsToTripod1 ? 0 : Math.PI;
      const legPhase = (this.state.tripodPhase + phaseOffset) % TWO_PI;
      const swingAngle = Math.sin(legPhase) * 0.42 * (this.state.speedMmPerSec > 0.5 ? 1 : 0.05);

      // If dragging/paresis, leg hangs limp and trails behind
      let effectiveAngle = this.state.headingRad + cfg.restAngle + (leg.isParesis ? -0.25 : swingAngle);

      // Calculate articulated joints: Base -> Knee (Femur) -> Tip (Tarsus)
      const kneeX = worldBaseX + Math.cos(effectiveAngle) * cfg.length1;
      const kneeY = worldBaseY + Math.sin(effectiveAngle) * cfg.length1;

      const tibiaAngle = effectiveAngle + (leg.id.startsWith('L') ? -0.35 : 0.35);
      leg.tipX = kneeX + Math.cos(tibiaAngle) * cfg.length2;
      leg.tipY = kneeY + Math.sin(tibiaAngle) * cfg.length2;
    }
  }

  public getState(): FlyKinematics {
    return {
      ...this.state,
      legs: {
        L1: { ...this.state.legs.L1 },
        L2: { ...this.state.legs.L2 },
        L3: { ...this.state.legs.L3 },
        R1: { ...this.state.legs.R1 },
        R2: { ...this.state.legs.R2 },
        R3: { ...this.state.legs.R3 }
      }
    };
  }

  public setPosition(x: number, y: number) {
    this.state.x = x;
    this.state.y = y;
  }
}
