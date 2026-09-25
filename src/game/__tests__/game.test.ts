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
    // Row 4 Col 1 is an intersection with neighbors up, down, right
    const neighbors = maze.getValidNeighbors(1, 4);
    expect(neighbors.length).toBeGreaterThanOrEqual(2);
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
    // Place a predator directly above the fly (row 3, col 1)
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

    // Threat penalty for UP should be high, so UP should not be chosen
    expect(decision.options.UP.fearPenalty).toBeGreaterThan(0);
    expect(decision.chosenDir).not.toBe('UP');
  });

  it('pursues pellets aggressively when in starvation state', () => {
    const decision = decisionEngine.evaluateIntersection(
      1,
      4,
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

describe('Predator System & Hunter AI', () => {
  let maze: MazeMap;
  let predatorSystem: PredatorSystem;

  beforeEach(() => {
    maze = new MazeMap();
    predatorSystem = new PredatorSystem(maze);
  });

  it('initializes 4 predator archetypes', () => {
    expect(predatorSystem.predators.length).toBe(4);
    const types = predatorSystem.predators.map((p) => p.type);
    expect(types).toContain('RED_HUNTER');
    expect(types).toContain('CYAN_AMBUSH');
    expect(types).toContain('PURPLE_STALKER');
    expect(types).toContain('ORANGE_PATROL');
  });

  it('triggers flee mode during dopamine frenzy', () => {
    predatorSystem.triggerFrenzy(8.0);
    for (const p of predatorSystem.predators) {
      expect(p.mode).toBe('FLEE');
      expect(p.fleeTimer).toBe(8.0);
    }
  });
});

describe('FlyActor Mechanics', () => {
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

  it('moves along corridors and consumes pellets', () => {
    // Place fly on a pellet tile
    fly.col = 1;
    fly.row = 1;
    fly.x = 1 * 22 + 11;
    fly.y = 1 * 22 + 11;
    maze.setTile(1, 1, 'PELLET');

    const res = fly.update(0.05, maze, decisionEngine, predatorSystem.predators, false, Date.now());
    expect(res.pelletEaten).toBe('PELLET');
    expect(maze.getTile(1, 1)).toBe('CORRIDOR');
  });
});
