import { describe, it, expect, beforeEach } from 'vitest';
import { RingAttractorModel } from '../ringAttractor';
import { FlyKinematicsModel } from '../flyKinematics';
import { NeuralEngine } from '../neuralEngine';

describe('Ellipsoid Body (EB) Ring Attractor Model', () => {
  let model: RingAttractorModel;

  beforeEach(() => {
    model = new RingAttractorModel();
  });

  it('initializes 16 wedges with a single stable heading bump', () => {
    const state = model.getState();
    expect(state.wedges.length).toBe(16);
    expect(state.bumpAmplitude).toBeGreaterThan(0.5);
    expect(state.stability).toBeGreaterThan(0.7);
  });

  it('shifts the activity bump in response to angular velocity (P-EN input)', () => {
    model.resetBump(0);
    const initialAngle = model.getState().bumpAngleRad;

    // Simulate positive turn rate for 10 steps
    for (let i = 0; i < 10; i++) {
      model.update(0.05, 3.0); // 3 rad/s clockwise turn
    }

    const newAngle = model.getState().bumpAngleRad;
    expect(newAngle).not.toBe(initialAngle);
  });

  it('degrades bump stability when synaptic lesion is dialed up', () => {
    model.setLesionPercentage(0);
    model.update(0.05, 0);
    const intactStability = model.getState().stability;

    model.setLesionPercentage(70);
    for (let i = 0; i < 15; i++) {
      model.update(0.05, 0);
    }
    const damagedStability = model.getState().stability;

    expect(damagedStability).toBeLessThan(intactStability);
  });
});

describe('Fly Kinematics & Locomotion', () => {
  it('moves the fly forward in response to motor drive', () => {
    const fly = new FlyKinematicsModel(100, 100, 0);
    const startX = fly.getState().x;

    fly.step(0.1, 0.8, 0, false, 0);
    expect(fly.getState().x).toBeGreaterThan(startX);
  });

  it('articulates alternating tripod gait across 6 legs', () => {
    const fly = new FlyKinematicsModel(100, 100, 0);
    fly.step(0.1, 1.0, 0, false, 0);

    const legs = fly.getState().legs;
    expect(legs.L1).toBeDefined();
    expect(legs.L2).toBeDefined();
    expect(legs.L3).toBeDefined();
    expect(legs.R1).toBeDefined();
    expect(legs.R2).toBeDefined();
    expect(legs.R3).toBeDefined();

    // Check that Tripod 1 and Tripod 2 are in opposing phase
    expect(legs.L1.isStance).toBe(legs.R2.isStance);
    expect(legs.L1.isStance).toBe(!legs.L2.isStance);
  });

  it('handles leg paresis with asymmetric drag and active compensation', () => {
    const fly = new FlyKinematicsModel(100, 100, 0);
    fly.setIllness('L2', false);

    expect(fly.getState().legs.L2.isParesis).toBe(true);
    expect(fly.getState().legs.R2.isParesis).toBe(false);

    // Step with damaged leg
    fly.step(0.1, 0.5, 0, false, 0);
    expect(fly.getState().speedMmPerSec).toBeGreaterThan(0);
  });
});

describe('Neural Engine & State Arbitration', () => {
  let engine: NeuralEngine;

  beforeEach(() => {
    engine = new NeuralEngine();
  });

  it('triggers fear and fleeing state when looming threat appears', () => {
    const res = engine.step(0.05, 100, 100, 0, {
      sugarOdor: 0,
      sugarContact: false,
      closestSugarDist: 500,
      sugarBearing: 0,
      loomingThreat: 0.85, // Strong looming shadow
      shadowBearing: 0,
      heatLevel: 0,
      boundaryProximity: 0
    });

    expect(res.behavioralState).toBe('FLEEING');
    expect(res.escapeBurst).toBe(true);
    expect(res.neuralCircuitState.fear.giantFiberSpike).toBe(1.0);
  });

  it('triggers feeding state and extends proboscis when contacting sugar', () => {
    const res = engine.step(0.05, 100, 100, 0, {
      sugarOdor: 0.9,
      sugarContact: true, // Touching food!
      closestSugarDist: 5,
      sugarBearing: 0,
      loomingThreat: 0,
      shadowBearing: 0,
      heatLevel: 0,
      boundaryProximity: 0
    });

    expect(res.behavioralState).toBe('FEEDING');
    expect(res.proboscisDrive).toBe(1.0);
    expect(res.commandForwardSpeed).toBe(0);
  });
});
