import { describe, it, expect, beforeEach } from 'vitest';
import { MazeMap } from '../mazeMap';
import { NeuralDecisionEngine } from '../neuralDecisionEngine';
import { PredatorSystem } from '../predatorAI';
import { FlyActor } from '../flyActor';

describe('MazeMap & Labyrinth Topology', () => {
  let maze: MazeMap;

  beforeEach(() => {
    maze = new MazeMap();
  });

  it('generates a valid maze grid with pellets and walls', () => {
    expect(maze.grid.length).toBe(24);
    expect(maze.grid[0].length).toBe(24);
    expect(maze.totalPellets).toBeGreaterThan(100);
    expect(maze.isWall(0, 0)).toBe(true);
  });

  it('correctly identifies corridor intersections', () => {
    const neighbors = maze.getValidNeighbors(1, 4);
    expect(neighbors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Predator System (4-Corner Distributed Spawns)', () => {
  let maze: MazeMap;
  let predatorSystem: PredatorSystem;

  beforeEach(() => {
    maze = new MazeMap();
    predatorSystem = new PredatorSystem(maze);
  });

  it('spawns 4 predators distributed across all 4 separate corners of the maze', () => {
    expect(predatorSystem.predators.length).toBe(4);

    const red = predatorSystem.predators.find(p => p.type === 'RED_HUNTER')!;
    const cyan = predatorSystem.predators.find(p => p.type === 'CYAN_AMBUSH')!;
    const purple = predatorSystem.predators.find(p => p.type === 'PURPLE_STALKER')!;
    const orange = predatorSystem.predators.find(p => p.type === 'ORANGE_PATROL')!;

    // Top-Right corner
    expect(red.col).toBe(22);
    expect(red.row).toBe(1);

    // Top-Left corner
    expect(cyan.col).toBe(1);
    expect(cyan.row).toBe(1);

    // Bottom-Left corner
    expect(purple.col).toBe(1);
    expect(purple.row).toBe(22);

    // Bottom-Right corner
    expect(orange.col).toBe(22);
    expect(orange.row).toBe(22);
  });

  it('triggers flee mode during dopamine frenzy', () => {
    predatorSystem.triggerFrenzy(8.0);
    for (const p of predatorSystem.predators) {
      expect(p.mode).toBe('FLEE');
      expect(p.fleeTimer).toBe(8.0);
    }
  });
});

describe('FlyActor Mechanics & Anti-Stuck Guarantee', () => {
  let maze: MazeMap;
  let fly: FlyActor;
  let decisionEngine: NeuralDecisionEngine;
  let predatorSystem: PredatorSystem;

  beforeEach(() => {
    maze = new MazeMap();
    fly = new FlyActor();
    decisionEngine = new NeuralDecisionEngine();
    predatorSystem = new PredatorSystem(maze);
  });

  it('moves continuously along corridors and consumes pellets', () => {
    fly.col = 1;
    fly.row = 1;
    fly.x = 1 * 22 + 11;
    fly.y = 1 * 22 + 11;
    maze.setTile(1, 1, 'PELLET');

    const res = fly.update(0.05, maze, decisionEngine, predatorSystem.predators, false, Date.now());
    expect(res.pelletEaten).toBe('PELLET');
    expect(maze.getTile(1, 1)).toBe('CORRIDOR');
  });

  it('guarantees continuous motion and never halts at corners', () => {
    fly.col = 1;
    fly.row = 4;
    fly.x = 1 * 22 + 11;
    fly.y = 4 * 22 + 11;
    fly.dir = 'LEFT'; // Points into a wall

    const startX = fly.x;
    const startY = fly.y;

    // Step several frames
    for (let i = 0; i < 5; i++) {
      fly.update(0.05, maze, decisionEngine, predatorSystem.predators, false, Date.now() + i * 50);
    }

    // Position must have changed (it must have turned up, down, or right rather than freezing!)
    const moved = Math.hypot(fly.x - startX, fly.y - startY);
    expect(moved).toBeGreaterThan(0.5);
  });
});

describe('Neural Decision Engine (Connectome Crossroad Arbitration)', () => {
  let maze: MazeMap;
  let decisionEngine: NeuralDecisionEngine;
  let predatorSystem: PredatorSystem;

  beforeEach(() => {
    maze = new MazeMap();
    decisionEngine = new NeuralDecisionEngine();
    predatorSystem = new PredatorSystem(maze);
  });

  it('evaluates valid intersection directions with softmax probabilities', () => {
    const decision = decisionEngine.evaluateIntersection(
      1,
      4,
      'RIGHT',
      maze,
      predatorSystem.predators,
      100,
      false,
      Date.now()
    );

    expect(decision).toBeDefined();
    expect(decision.options).toBeDefined();
    expect(['UP', 'DOWN', 'LEFT', 'RIGHT']).toContain(decision.chosenDir);

    const validProbs = Object.values(decision.options)
      .filter((o) => o.isValid)
      .map((o) => o.probability);
    const sumProb = validProbs.reduce((a, b) => a + b, 0);
    expect(sumProb).toBeCloseTo(1.0, 1);
  });

  it('avoids corridor containing a looming predator (Giant Fiber Fear Reflex)', () => {
    const redHunter = predatorSystem.predators.find((p) => p.type === 'RED_HUNTER')!;
    redHunter.col = 1;
    redHunter.row = 3;

    const decision = decisionEngine.evaluateIntersection(
      1,
      4,
      'RIGHT',
      maze,
      predatorSystem.predators,
      100,
      false,
      Date.now()
    );

    expect(decision.options.UP.fearPenalty).toBeGreaterThan(0);
    expect(decision.chosenDir).not.toBe('UP');
  });

  it('pursues pellets aggressively when in starvation state', () => {
    const decision = decisionEngine.evaluateIntersection(
      12,
      17,
      'RIGHT',
      maze,
      predatorSystem.predators,
      10, // 10% energy = severe starvation
      false,
      Date.now()
    );

    expect(decision.reason).toContain('STARVATION');
  });
});
