import { Direction, GridPos, MazeMap, TILE_SIZE } from './mazeMap';
import { DecisionVector, DirectionScore, PredatorEntity } from './types';
import { RingAttractorModel } from '../simulation/ringAttractor';

export class NeuralDecisionEngine {
  public ringAttractor: RingAttractorModel;
  public visitedTiles: Map<string, number> = new Map(); // "col,row" -> timestamp
  public lastDecision: DecisionVector | null = null;
  public fearSpikeLevel: number = 0;
  public rewardSpikeLevel: number = 0;
  public giantFiberEscapeActive: boolean = false;

  constructor() {
    this.ringAttractor = new RingAttractorModel();
  }

  public setEBLesion(percent: number) {
    this.ringAttractor.setLesionPercentage(percent);
  }

  public markVisited(col: number, row: number, now: number) {
    this.visitedTiles.set(`${col},${row}`, now);
  }

  public evaluateIntersection(
    flyCol: number,
    flyRow: number,
    currentDir: Direction,
    maze: MazeMap,
    predators: PredatorEntity[],
    energyPercent: number, // 0 to 100
    isFrenzyActive: boolean,
    now: number
  ): DecisionVector {
    const validNeighbors = maze.getValidNeighbors(flyCol, flyRow);
    const oppositeDir = this.getOppositeDir(currentDir);

    // Candidates: all valid neighbors.
    // If not at a dead-end, avoid immediately reversing unless blocked.
    const candidates = validNeighbors;

    const options: Record<Direction, DirectionScore> = {
      UP: this.emptyScore('UP'),
      DOWN: this.emptyScore('DOWN'),
      LEFT: this.emptyScore('LEFT'),
      RIGHT: this.emptyScore('RIGHT'),
      NONE: this.emptyScore('NONE')
    };

    let maxScore = -99999;
    let chosenDir: Direction = currentDir;
    let primaryReason = 'EXPLORING_CORRIDOR';

    // Weights modulated by internal biological states:
    // Starvation threshold (<25% energy): hunger dominates fear!
    const isStarving = energyPercent < 25;
    const wFear = isFrenzyActive ? -0.8 : (isStarving ? 0.9 : 2.8);
    const wReward = isFrenzyActive ? 3.5 : (isStarving ? 4.2 : 1.6);
    const wCompass = 0.8 * this.ringAttractor.getState().stability;
    const wMemory = 0.65;

    let overallThreat = 0;
    let overallOdor = 0;

    for (const d of ['UP', 'DOWN', 'LEFT', 'RIGHT'] as Direction[]) {
      const neighbor = candidates.find(c => c.dir === d);
      if (!neighbor) {
        options[d].isValid = false;
        options[d].totalScore = -9999;
        continue;
      }

      options[d].isValid = true;

      // 1. FEAR EVALUATION (Lobula LPLC2 & Giant Fiber)
      // Ray-cast down this corridor up to 6 tiles
      const threat = this.sampleCorridorThreat(d, flyCol, flyRow, maze, predators, isFrenzyActive);
      options[d].fearPenalty = threat * wFear;
      overallThreat = Math.max(overallThreat, threat);

      // 2. REWARD EVALUATION (Antennal Lobe ALPN & PAM Dopamine)
      // Check pellets in corridor sightline
      const reward = this.sampleCorridorReward(d, flyCol, flyRow, maze);
      options[d].rewardValue = reward * wReward;
      overallOdor = Math.max(overallOdor, reward);

      // 3. COMPASS BIAS (Ellipsoid Body 16-wedge Ring Attractor)
      // Angular alignment between corridor direction and EB heading bump
      const dirAngle = this.dirToAngle(d);
      const ebAngle = this.ringAttractor.getState().bumpAngleRad;
      let angleDiff = Math.abs(dirAngle - ebAngle);
      if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
      const compassAlignment = Math.cos(angleDiff);
      options[d].compassBias = compassAlignment * wCompass;

      // 4. WORKING MEMORY PENALTY
      // Penalize recently visited tiles to prevent loops
      const key = `${neighbor.col},${neighbor.row}`;
      const lastVisit = this.visitedTiles.get(key) || 0;
      const ageSec = (now - lastVisit) / 1000;
      const recency = ageSec < 8 ? (8 - ageSec) / 8 : 0;
      // Do not penalize reverse as heavily if escaping threat
      const isReverse = d === oppositeDir;
      options[d].memoryPenalty = (recency * wMemory) + (isReverse && threat < 0.2 ? 1.4 : 0);

      // Total Utility
      const utility =
        options[d].rewardValue -
        options[d].fearPenalty +
        options[d].compassBias -
        options[d].memoryPenalty;

      options[d].totalScore = utility;

      if (utility > maxScore) {
        maxScore = utility;
        chosenDir = d;
      }
    }

    // Softmax probabilities
    const validScores = Object.values(options).filter(o => o.isValid);
    const sumExp = validScores.reduce((acc, o) => acc + Math.exp(o.totalScore), 0);
    for (const o of validScores) {
      o.probability = sumExp > 0 ? Math.exp(o.totalScore) / sumExp : 0.25;
    }

    // Determine descriptive reason
    if (isFrenzyActive) {
      primaryReason = 'DOPAMINE FRENZY: HUNTING PREDATORS';
    } else if (isStarving && overallOdor > 0.1 && overallThreat < 0.75) {
      primaryReason = 'STARVATION OVERDRIVE: SUCROSE PURSUIT';
      this.giantFiberEscapeActive = false;
    } else if (overallThreat > 0.45) {
      primaryReason = 'GIANT FIBER SACCADE: FLEEING THREAT';
      this.giantFiberEscapeActive = true;
    } else if (options[chosenDir].rewardValue > 1.2) {
      primaryReason = 'ALPN CHEMOTAXIS: FORAGING';
      this.giantFiberEscapeActive = false;
    } else {
      primaryReason = 'EB COMPASS: LABYRINTH EXPLORATION';
      this.giantFiberEscapeActive = false;
    }

    this.fearSpikeLevel = overallThreat;
    this.rewardSpikeLevel = overallOdor;

    // Update internal ring attractor with chosen direction
    this.ringAttractor.update(0.05, 0, this.dirToAngle(chosenDir));

    const result: DecisionVector = {
      chosenDir,
      isIntersection: maze.isIntersection(flyCol, flyRow),
      options,
      reason: primaryReason
    };

    this.lastDecision = result;
    return result;
  }

  private sampleCorridorThreat(
    dir: Direction,
    col: number,
    row: number,
    maze: MazeMap,
    predators: PredatorEntity[],
    isFrenzy: boolean
  ): number {
    let dc = 0, dr = 0;
    if (dir === 'UP') dr = -1;
    else if (dir === 'DOWN') dr = 1;
    else if (dir === 'LEFT') dc = -1;
    else if (dir === 'RIGHT') dc = 1;

    let maxThreat = 0;
    // Cast ray up to 6 tiles
    for (let step = 1; step <= 6; step++) {
      const checkC = col + dc * step;
      const checkR = row + dr * step;

      if (maze.isWall(checkC, checkR)) break;

      // Check if any predator is on this tile or adjacent
      for (const p of predators) {
        if (p.mode === 'EATEN') continue;
        const d = Math.abs(p.col - checkC) + Math.abs(p.row - checkR);
        if (d <= 1) {
          // Proximity threat: closer means exponential looming expansion
          const proximityWeight = (7 - step) / 6.0;
          const threatVal = isFrenzy ? -proximityWeight * 1.5 : proximityWeight * 2.2;
          if (threatVal > maxThreat) maxThreat = threatVal;
        }
      }
    }
    return maxThreat;
  }

  private sampleCorridorReward(
    dir: Direction,
    col: number,
    row: number,
    maze: MazeMap
  ): number {
    let dc = 0, dr = 0;
    if (dir === 'UP') dr = -1;
    else if (dir === 'DOWN') dr = 1;
    else if (dir === 'LEFT') dc = -1;
    else if (dir === 'RIGHT') dc = 1;

    let reward = 0;
    for (let step = 1; step <= 6; step++) {
      const checkC = col + dc * step;
      const checkR = row + dr * step;

      if (maze.isWall(checkC, checkR)) break;

      const tile = maze.getTile(checkC, checkR);
      if (tile === 'PELLET') {
        reward += (7 - step) * 0.28;
      } else if (tile === 'SUPER_PELLET') {
        reward += (7 - step) * 1.2; // High value sucrose crystal!
      }
    }
    return Math.min(3.5, reward);
  }

  private dirToAngle(dir: Direction): number {
    switch (dir) {
      case 'RIGHT': return 0;
      case 'DOWN': return Math.PI * 0.5;
      case 'LEFT': return Math.PI;
      case 'UP': return -Math.PI * 0.5;
      default: return 0;
    }
  }

  private getOppositeDir(dir: Direction): Direction {
    switch (dir) {
      case 'UP': return 'DOWN';
      case 'DOWN': return 'UP';
      case 'LEFT': return 'RIGHT';
      case 'RIGHT': return 'LEFT';
      default: return 'NONE';
    }
  }

  private emptyScore(dir: Direction): DirectionScore {
    return {
      dir,
      totalScore: 0,
      probability: 0,
      fearPenalty: 0,
      rewardValue: 0,
      compassBias: 0,
      memoryPenalty: 0,
      isValid: false
    };
  }
}
