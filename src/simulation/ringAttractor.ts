import { RingAttractorState, RingAttractorWedge } from '../types/simulation';

const NUM_WEDGES = 16;
const TWO_PI = Math.PI * 2;

/**
 * Continuous ring attractor differential equation simulation for the
 * Drosophila Ellipsoid Body (EB) 16-wedge compass network.
 * Based on FlyWire FAFB connectome topology (E-PG, P-EN, Delta7).
 */
export class RingAttractorModel {
  private wedges: RingAttractorWedge[];
  private lesionPercentage: number = 0;
  private lesionMask: Float32Array; // 0 to 1 scaling per synapse pair
  private baseWeights: Float32Array; // 16x16 recurrent weight matrix
  private currentAngle: number = 0; // Current estimated internal heading
  private bumpAmplitude: number = 1.0;
  private stability: number = 1.0;

  constructor() {
    this.wedges = [];
    for (let i = 0; i < NUM_WEDGES; i++) {
      const angleRad = (i / NUM_WEDGES) * TWO_PI;
      this.wedges.push({
        index: i,
        angleRad,
        activity: 0.1,
        lesioned: false
      });
    }

    this.baseWeights = new Float32Array(NUM_WEDGES * NUM_WEDGES);
    this.lesionMask = new Float32Array(NUM_WEDGES * NUM_WEDGES);
    this.initWeights();
    this.resetBump(0);
  }

  private initWeights() {
    for (let i = 0; i < NUM_WEDGES; i++) {
      const thetaI = (i / NUM_WEDGES) * TWO_PI;
      for (let j = 0; j < NUM_WEDGES; j++) {
        const thetaJ = (j / NUM_WEDGES) * TWO_PI;
        let diff = Math.abs(thetaI - thetaJ);
        if (diff > Math.PI) diff = TWO_PI - diff;

        // Mexican-hat / cosine kernel: local excitation, global Delta7 inhibition
        const exc = Math.exp(-(diff * diff) / (2 * 0.45 * 0.45));
        const inh = 0.35; // Global Delta7 lateral inhibition
        const w = exc - inh;

        const idx = i * NUM_WEDGES + j;
        this.baseWeights[idx] = w;
        this.lesionMask[idx] = 1.0;
      }
    }
  }

  public resetBump(headingRad: number) {
    this.currentAngle = (headingRad % TWO_PI + TWO_PI) % TWO_PI;
    for (let i = 0; i < NUM_WEDGES; i++) {
      const theta = this.wedges[i].angleRad;
      let diff = Math.abs(theta - this.currentAngle);
      if (diff > Math.PI) diff = TWO_PI - diff;
      this.wedges[i].activity = Math.max(0.05, Math.exp(-(diff * diff) / (2 * 0.4 * 0.4)));
    }
    this.bumpAmplitude = 1.0;
    this.stability = 1.0;
  }

  public setLesionPercentage(percent: number) {
    this.lesionPercentage = Math.max(0, Math.min(80, percent));
    const fraction = this.lesionPercentage / 100.0;

    // Deterministic pseudo-random knockout so user can dial up and down smoothly
    for (let i = 0; i < NUM_WEDGES * NUM_WEDGES; i++) {
      // Use pseudo-random hash of index
      const hash = ((i * 2654435761) ^ (i >> 13)) >>> 0;
      const randVal = (hash % 1000) / 1000.0;
      this.lesionMask[i] = randVal < fraction ? 0.0 : 1.0;
    }

    // Flag wedges with heavy synaptic damage
    for (let i = 0; i < NUM_WEDGES; i++) {
      let activeInputs = 0;
      for (let j = 0; j < NUM_WEDGES; j++) {
        activeInputs += this.lesionMask[i * NUM_WEDGES + j];
      }
      this.wedges[i].lesioned = activeInputs < (NUM_WEDGES * (1 - fraction * 0.8));
    }
  }

  /**
   * Update the ring attractor state:
   * @param dt Delta time in seconds
   * @param angularVelocityRadPerSec Angular velocity from P-EN neurons
   * @param visualCueHeadingRad Optional visual cue to help anchor heading
   */
  public update(dt: number, angularVelocityRadPerSec: number, visualCueHeadingRad?: number): RingAttractorState {
    const tau = 0.05; // 50ms membrane time constant
    const step = Math.min(dt, 0.05);
    const newActivities = new Float32Array(NUM_WEDGES);

    // 1. Angular velocity shift from P-EN neurons
    const shiftTerm = angularVelocityRadPerSec * 0.12;

    for (let i = 0; i < NUM_WEDGES; i++) {
      const thetaI = this.wedges[i].angleRad;
      let totalRecurrent = 0;

      for (let j = 0; j < NUM_WEDGES; j++) {
        const idx = i * NUM_WEDGES + j;
        const weight = this.baseWeights[idx] * this.lesionMask[idx];
        const thetaJ = this.wedges[j].angleRad;

        let diff = thetaI - thetaJ;
        if (diff > Math.PI) diff -= TWO_PI;
        if (diff < -Math.PI) diff += TWO_PI;

        // P-EN rotational drive term (asymmetric shift proportional to angular velocity)
        const rotDrive = shiftTerm * Math.sin(diff) * this.lesionMask[idx];
        totalRecurrent += (weight + rotDrive) * this.wedges[j].activity;
      }

      // External landmark visual cue (ER ring neurons)
      let externalInput = 0;
      if (visualCueHeadingRad !== undefined) {
        let cueDiff = Math.abs(thetaI - visualCueHeadingRad);
        if (cueDiff > Math.PI) cueDiff = TWO_PI - cueDiff;
        externalInput = 0.3 * Math.exp(-(cueDiff * cueDiff) / (2 * 0.5 * 0.5));
      }

      // Noise injection increases with lesion rate
      const noise = (Math.random() - 0.5) * (this.lesionPercentage * 0.02);

      // Leaky ReLU rate equation: dr/dt = (-r + ReLU(W*r + I)) / tau
      const drive = totalRecurrent + externalInput + noise;
      const activated = Math.max(0, drive);
      const dr = (-this.wedges[i].activity + activated) * (step / tau);
      newActivities[i] = Math.max(0.01, Math.min(1.2, this.wedges[i].activity + dr));
    }

    // Assign updated activities
    for (let i = 0; i < NUM_WEDGES; i++) {
      this.wedges[i].activity = newActivities[i];
    }

    // Compute circular center of mass (bump angle) and amplitude
    let sinSum = 0;
    let cosSum = 0;
    let actSum = 0;
    let maxAct = 0;
    let minAct = 999;

    for (let i = 0; i < NUM_WEDGES; i++) {
      const act = this.wedges[i].activity;
      const angle = this.wedges[i].angleRad;
      sinSum += act * Math.sin(angle);
      cosSum += act * Math.cos(angle);
      actSum += act;
      if (act > maxAct) maxAct = act;
      if (act < minAct) minAct = act;
    }

    if (actSum > 0.01) {
      this.currentAngle = (Math.atan2(sinSum, cosSum) + TWO_PI) % TWO_PI;
    }

    this.bumpAmplitude = maxAct;

    // Stability is high when there is a clear contrast between peak and trough
    const contrast = maxAct > 0.1 ? (maxAct - minAct) / maxAct : 0.0;
    // Lesion directly penalizes coherence
    this.stability = Math.max(0, contrast * (1 - (this.lesionPercentage / 100) * 0.8));

    return this.getState();
  }

  public getState(): RingAttractorState {
    return {
      wedges: this.wedges.map(w => ({ ...w })),
      bumpAngleRad: this.currentAngle,
      bumpAmplitude: this.bumpAmplitude,
      lesionPercentage: this.lesionPercentage,
      stability: this.stability
    };
  }
}
