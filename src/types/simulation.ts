/**
 * Type definitions for Virtual Drosophila simulation
 * Grounded in FlyWire FAFB connectome and neuro-biomechanics
 */

export type Neurotransmitter = 
  | 'acetylcholine' // Excitatory
  | 'gaba'          // Inhibitory
  | 'glutamate'     // Modulatory / Inhibitory in invertebrates
  | 'dopamine'      // Reward / Arousal
  | 'serotonin'     // Satiety / Calm
  | 'octopamine';   // Stress / Alertness

export type CircuitCategory = 
  | 'compass'       // Central Complex Ellipsoid Body (EB / PB)
  | 'fear'          // Visual looming -> Giant Fiber escape
  | 'reward'        // Olfactory / PAM Dopamine -> Feeding
  | 'motor'         // Descending neurons -> Tripod gait
  | 'homeostasis';  // dFB sleep & grooming

export interface NeuronData {
  id: string;
  name: string;
  flywireRootId: string;
  neuropil: string;
  category: CircuitCategory;
  neurotransmitter: Neurotransmitter;
  function: string;
  activity: number; // 0.0 to 1.0
  synapseCountApprox: number;
}

export interface RingAttractorWedge {
  index: number;
  angleRad: number;   // Angle in radians [0, 2*pi)
  activity: number;   // Current firing rate [0, 1]
  lesioned: boolean;  // Whether synapse connections are severed
}

export interface RingAttractorState {
  wedges: RingAttractorWedge[];
  bumpAngleRad: number;
  bumpAmplitude: number;
  lesionPercentage: number; // 0 to 80%
  stability: number;        // 1.0 (crisp bump) to 0.0 (dispersed noise)
}

export interface SensoryInput {
  // Retinal ommatidia: 36 sectors around 360 degrees
  retinaSectors: number[]; 
  loomingThreatLevel: number; // 0 to 1 (shadow expanding over fly)
  sugarOdorGradient: number;  // 0 to 1 (odor intensity at antennae)
  sugarContact: boolean;      // Tarsal or proboscis contact with food
  heatHazardLevel: number;    // 0 to 1 (near dangerous thermal zone)
  boundaryProximity: number;  // 0 to 1 (near arena wall)
}

export interface NeuralCircuitState {
  fear: {
    lplc2Activity: number;     // Lobula looming detector
    giantFiberSpike: number;   // Rapid escape trigger (0 or 1)
    panicLevel: number;        // General threat arousal (0 to 1)
  };
  reward: {
    alpnOdorDrive: number;     // Antennal lobe projection neuron
    pamDopamine: number;       // Reward valence
    proboscisDrive: number;    // SEZ motor command for PER
  };
  compass: RingAttractorState;
  motor: {
    dng01Forward: number;      // Descending forward thrust (0 to 1)
    dng02Steering: number;     // Descending steering torque (-1 to +1)
    dnp09EscapeSaccade: number;// High-velocity escape burst (0 or 1)
    leftTripodDrive: number;
    rightTripodDrive: number;
  };
  homeostasis: {
    energySatiety: number;     // 100% full to 0% starving
    dfbSleepDrive: number;     // Sleep / rest pressure (0 to 1)
  };
}

export type LegId = 'L1' | 'L2' | 'L3' | 'R1' | 'R2' | 'R3';

export interface LegJoints {
  id: LegId;
  baseX: number;
  baseY: number;
  coxaAngle: number;
  femurAngle: number;
  tibiaAngle: number;
  tipX: number;
  tipY: number;
  isStance: boolean; // Ground contact vs swing
  isParesis: boolean; // Damaged / dragging leg
}

export interface FlyKinematics {
  x: number;               // Arena coordinate (mm)
  y: number;
  headingRad: number;      // World heading angle
  speedMmPerSec: number;   // Linear velocity
  turnRateRadPerSec: number; // Angular velocity
  legs: Record<LegId, LegJoints>;
  tripodPhase: number;     // 0 to 2*pi
  proboscisLength: number; // 0 (retracted) to 1 (extended)
  leftWingAngle: number;   // Flutter angle
  rightWingAngle: number;
  wingDamaged: boolean;    // Inability to jump/fly
}

export type IllnessType = 
  | 'intact'
  | 'eb_lesion'
  | 'leg_paresis'
  | 'wing_shear'
  | 'starvation'
  | 'fear_crisis';

export interface IllnessConfig {
  type: IllnessType;
  label: string;
  description: string;
  ebLesionPercent: number; // 0 to 80%
  damagedLeg: LegId | null;
  wingDamaged: boolean;
  metabolicDepletion: number; // 0 to 1
  fearSensitization: number;  // 0 to 1
  anhedonia: boolean;
}

export type BehavioralState = 
  | 'EXPLORING'
  | 'FORAGING'
  | 'FLEEING'
  | 'FEEDING'
  | 'LIMPING'
  | 'DISORIENTED'
  | 'RESTING'
  | 'GROOMING';

export interface SucroseDrop {
  id: string;
  x: number;
  y: number;
  radius: number;
  amount: number; // 100 to 0 as consumed
}

export interface PredatorShadow {
  x: number;
  y: number;
  currentRadius: number;
  targetRadius: number;
  growthRate: number;
  opacity: number;
  active: boolean;
  loomingSpeed: number;
}

export interface HeatZone {
  id: string;
  x: number;
  y: number;
  radius: number;
  intensity: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  state: BehavioralState;
  timestamp: number;
}

export interface SimulationTelemetry {
  fps: number;
  timeSec: number;
  distanceMm: number;
  foodConsumedCount: number;
  escapesTriggered: number;
  headingErrorDeg: number;
}
