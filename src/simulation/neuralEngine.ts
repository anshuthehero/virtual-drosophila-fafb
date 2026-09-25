import { BehavioralState, IllnessConfig, NeuralCircuitState, SensoryInput } from '../types/simulation';
import { RingAttractorModel } from './ringAttractor';

export class NeuralEngine {
  public ringAttractor: RingAttractorModel;
  public state: NeuralCircuitState;
  public behavioralState: BehavioralState = 'EXPLORING';
  public illness: IllnessConfig;

  private hungerLevel: number = 0.6; // 0 (full) to 1 (starving)
  private fearDecayTimer: number = 0;
  private feedingTimer: number = 0;
  private restTimer: number = 0;
  private exploreHeadingTarget: number = 0;
  private exploreHeadingTimer: number = 0;

  constructor() {
    this.ringAttractor = new RingAttractorModel();
    this.illness = {
      type: 'intact',
      label: 'Wild-Type Control',
      description: 'Intact FAFB connectome and symmetric alternating tripod gait.',
      ebLesionPercent: 0,
      damagedLeg: null,
      wingDamaged: false,
      metabolicDepletion: 0,
      fearSensitization: 0,
      anhedonia: false
    };

    this.state = {
      fear: {
        lplc2Activity: 0,
        giantFiberSpike: 0,
        panicLevel: 0
      },
      reward: {
        alpnOdorDrive: 0,
        pamDopamine: 0.1,
        proboscisDrive: 0
      },
      compass: this.ringAttractor.getState(),
      motor: {
        dng01Forward: 0.5,
        dng02Steering: 0,
        dnp09EscapeSaccade: 0,
        leftTripodDrive: 0.5,
        rightTripodDrive: 0.5
      },
      homeostasis: {
        energySatiety: 0.6,
        dfbSleepDrive: 0.1
      }
    };
  }

  public setIllness(config: IllnessConfig) {
    this.illness = config;
    this.ringAttractor.setLesionPercentage(config.ebLesionPercent);
    if (config.metabolicDepletion > 0.5) {
      this.hungerLevel = 0.95;
    }
  }

  /**
   * Main neural sensory-motor compute step
   */
  public step(
    dt: number,
    flyX: number,
    flyY: number,
    currentHeadingRad: number,
    sensory: {
      sugarOdor: number;
      sugarContact: boolean;
      closestSugarDist: number;
      sugarBearing: number;
      loomingThreat: number;
      shadowBearing: number;
      heatLevel: number;
      boundaryProximity: number;
    }
  ): {
    commandForwardSpeed: number;
    commandSteeringTorque: number;
    escapeBurst: boolean;
    proboscisDrive: number;
    behavioralState: BehavioralState;
    neuralCircuitState: NeuralCircuitState;
  } {
    // 1. Metabolic & homeostasis progression
    this.hungerLevel = Math.min(1.0, this.hungerLevel + dt * 0.015);
    this.state.homeostasis.energySatiety = 1.0 - this.hungerLevel;

    // 2. Compute FEAR / THREAT CIRCUIT (Lobula LPLC2 & Giant Fiber)
    // Looming predator shadow or extreme heat induces fear
    const sensitizedThreat = sensory.loomingThreat * (1.0 + this.illness.fearSensitization * 1.5);
    const threatDrive = Math.max(sensitizedThreat, sensory.heatLevel * 0.9);

    this.state.fear.lplc2Activity = threatDrive;

    let escapeBurst = false;
    let escapeSteering = 0;

    if (threatDrive > 0.35) {
      // Giant Fiber threshold crossed! Emergency takeoff & escape saccade
      this.state.fear.giantFiberSpike = 1.0;
      this.state.fear.panicLevel = 1.0;
      this.fearDecayTimer = 1.4; // Remain alert for 1.4s
      escapeBurst = true;

      // Saccade turn vector: 180 degrees away from threat bearing
      let escapeAngle = sensory.shadowBearing + Math.PI;
      let angleDiff = escapeAngle - currentHeadingRad;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      escapeSteering = Math.sign(angleDiff) * Math.min(1.0, Math.abs(angleDiff) * 1.8);
      this.state.motor.dnp09EscapeSaccade = 1.0;
    } else {
      this.state.fear.giantFiberSpike = 0;
      this.state.motor.dnp09EscapeSaccade = 0;
      if (this.fearDecayTimer > 0) {
        this.fearDecayTimer -= dt;
        this.state.fear.panicLevel = Math.max(0, this.fearDecayTimer / 1.4);
      } else {
        this.state.fear.panicLevel = 0;
      }
    }

    // 3. Compute REWARD / SUCROSE CIRCUIT (Antennal Lobe & PAM Dopamine)
    const canSenseReward = !this.illness.anhedonia;
    const odorSense = canSenseReward ? sensory.sugarOdor : 0;
    this.state.reward.alpnOdorDrive = odorSense;

    let rewardSteering = 0;
    let proboscisCommand = 0;

    if (sensory.sugarContact && canSenseReward && !escapeBurst) {
      // Proboscis extension reflex (PER)
      proboscisCommand = 1.0;
      this.state.reward.proboscisDrive = 1.0;
      this.state.reward.pamDopamine = Math.min(1.0, this.state.reward.pamDopamine + dt * 0.8);
      this.hungerLevel = Math.max(0.1, this.hungerLevel - dt * 0.12);
      this.feedingTimer += dt;
    } else {
      this.state.reward.proboscisDrive = 0;
      this.state.reward.pamDopamine = Math.max(0.1, this.state.reward.pamDopamine - dt * 0.05);
      this.feedingTimer = 0;

      // Chemotaxis steering towards food plume
      if (odorSense > 0.08 && !escapeBurst) {
        let foodDiff = sensory.sugarBearing - currentHeadingRad;
        while (foodDiff > Math.PI) foodDiff -= Math.PI * 2;
        while (foodDiff < -Math.PI) foodDiff += Math.PI * 2;
        rewardSteering = Math.sign(foodDiff) * Math.min(1.0, Math.abs(foodDiff) * 1.4);
      }
    }

    // 4. Circular arena wall avoidance (Thigmotaxis or reflection)
    let wallSteering = 0;
    if (sensory.boundaryProximity > 0.2) {
      // Turn inwards away from wall
      wallSteering = 0.8;
    }

    // 5. General exploration wandering
    this.exploreHeadingTimer -= dt;
    if (this.exploreHeadingTimer <= 0) {
      this.exploreHeadingTarget = (Math.random() - 0.5) * 1.2;
      this.exploreHeadingTimer = 0.8 + Math.random() * 1.2;
    }

    // 6. RING ATTRACTOR UPDATE (Central Complex EB Compass)
    // The compass tracks angular velocity
    const estimatedTurnRate = escapeBurst ? escapeSteering * 5.0 : (rewardSteering || wallSteering || this.exploreHeadingTarget);
    this.state.compass = this.ringAttractor.update(dt, estimatedTurnRate);

    // If EB is heavily lesioned (>35%), internal heading bump wanders randomly, causing circular looping
    let disorientationSteeringBias = 0;
    if (this.state.compass.lesionPercentage > 25) {
      const lesionFraction = this.state.compass.lesionPercentage / 100.0;
      disorientationSteeringBias = Math.sin(Date.now() * 0.003) * lesionFraction * 1.6;
    }

    // 7. MOTOR DECISION ARBITRATION
    let commandForward = 0.6;
    let commandSteering = 0;

    if (escapeBurst) {
      // Highest priority: Fleeing from threat!
      commandForward = 1.0;
      commandSteering = escapeSteering;
      this.behavioralState = 'FLEEING';
    } else if (proboscisCommand > 0.5) {
      // Feeding stationary
      commandForward = 0.0;
      commandSteering = 0;
      this.behavioralState = 'FEEDING';
    } else if (sensory.sugarOdor > 0.12 && canSenseReward) {
      // Foraging towards sugar
      commandForward = 0.65;
      commandSteering = rewardSteering + wallSteering;
      this.behavioralState = 'FORAGING';
    } else if (this.state.compass.lesionPercentage >= 35 && this.state.compass.stability < 0.35) {
      // Disoriented wandering
      commandForward = 0.45;
      commandSteering = disorientationSteeringBias + wallSteering;
      this.behavioralState = 'DISORIENTED';
    } else if (this.illness.damagedLeg !== null) {
      // Limping state
      commandForward = 0.4;
      commandSteering = (wallSteering || this.exploreHeadingTarget);
      this.behavioralState = 'LIMPING';
    } else if (this.hungerLevel < 0.25 && Math.random() < 0.01) {
      // Resting / grooming state
      commandForward = 0.0;
      commandSteering = 0;
      this.behavioralState = 'RESTING';
    } else {
      // Standard exploratory walking
      commandForward = 0.55;
      commandSteering = this.exploreHeadingTarget + wallSteering;
      this.behavioralState = 'EXPLORING';
    }

    // Set motor neuron activations
    this.state.motor.dng01Forward = commandForward;
    this.state.motor.dng02Steering = commandSteering;
    this.state.motor.leftTripodDrive = Math.max(0.1, Math.min(1.0, commandForward - commandSteering * 0.3));
    this.state.motor.rightTripodDrive = Math.max(0.1, Math.min(1.0, commandForward + commandSteering * 0.3));

    return {
      commandForwardSpeed: commandForward,
      commandSteeringTorque: commandSteering,
      escapeBurst,
      proboscisDrive: proboscisCommand,
      behavioralState: this.behavioralState,
      neuralCircuitState: this.state
    };
  }
}
