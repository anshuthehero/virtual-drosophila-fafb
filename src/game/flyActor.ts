import { Direction, GridPos, MazeMap, TILE_SIZE } from './mazeMap';
import { NeuralDecisionEngine } from './neuralDecisionEngine';
import { DecisionVector, PredatorEntity } from './types';

export class FlyActor {
  public col: number = 12;
  public row: number = 17;
  public x: number = 12 * TILE_SIZE + TILE_SIZE / 2;
  public y: number = 17 * TILE_SIZE + TILE_SIZE / 2;
  public dir: Direction = 'LEFT';
  public nextDir: Direction = 'LEFT';
  public headingRad: number = Math.PI;
  public speed: number = 3.2; // Brisk, energetic movement (tiles/sec)
  public energyPercent: number = 100;
  public isAlive: boolean = true;
  public isEating: boolean = false;
  public tripodPhase: number = 0;
  public trail: GridPos[] = [];

  // Watchdog to guarantee fly NEVER gets stuck
  private lastX: number = 0;
  private lastY: number = 0;
  private stuckTimer: number = 0;

  constructor() {
    this.reset();
  }

  public reset() {
    this.col = 12;
    this.row = 17;
    this.x = 12 * TILE_SIZE + TILE_SIZE / 2;
    this.y = 17 * TILE_SIZE + TILE_SIZE / 2;
    this.dir = 'LEFT';
    this.nextDir = 'LEFT';
    this.headingRad = Math.PI;
    this.speed = 3.2;
    this.energyPercent = 100;
    this.isAlive = true;
    this.isEating = false;
    this.tripodPhase = 0;
    this.trail = [];
    this.lastX = this.x;
    this.lastY = this.y;
    this.stuckTimer = 0;
  }

  public update(
    dt: number,
    maze: MazeMap,
    decisionEngine: NeuralDecisionEngine,
    predators: PredatorEntity[],
    isFrenzyActive: boolean,
    now: number,
    manualRequestedDir?: Direction
  ): {
    pelletEaten: 'NONE' | 'PELLET' | 'SUPER_PELLET';
    decisionVector: DecisionVector | null;
  } {
    if (!this.isAlive) {
      return { pelletEaten: 'NONE', decisionVector: null };
    }

    // Energy decay over time (Starvation Clock)
    this.energyPercent = Math.max(0, this.energyPercent - dt * 1.5);

    const tilePx = TILE_SIZE;
    const centerTileX = this.col * tilePx + tilePx / 2;
    const centerTileY = this.row * tilePx + tilePx / 2;
    const moveDist = this.speed * dt * 45;

    let decisionVector: DecisionVector | null = null;

    // Check if at or passing tile center
    const atCenter =
      Math.abs(this.x - centerTileX) <= moveDist * 1.2 &&
      Math.abs(this.y - centerTileY) <= moveDist * 1.2;

    const validNeighbors = maze.getValidNeighbors(this.col, this.row);

    // If at center or if current direction is into a wall, make an immediate decision
    const nextCol = this.col + (this.dir === 'LEFT' ? -1 : this.dir === 'RIGHT' ? 1 : 0);
    const nextRow = this.row + (this.dir === 'UP' ? -1 : this.dir === 'DOWN' ? 1 : 0);
    const isFacingWall = maze.isWall(nextCol, nextRow);

    if (atCenter || isFacingWall) {
      // Snap to corridor axis
      if (this.dir === 'LEFT' || this.dir === 'RIGHT') {
        this.y = centerTileY;
      } else {
        this.x = centerTileX;
      }

      decisionEngine.markVisited(this.col, this.row, now);

      // Record trail
      this.trail.push({ col: this.col, row: this.row });
      if (this.trail.length > 24) this.trail.shift();

      if (manualRequestedDir && manualRequestedDir !== 'NONE') {
        if (validNeighbors.some((n) => n.dir === manualRequestedDir)) {
          this.dir = manualRequestedDir;
        } else if (isFacingWall) {
          // Fallback to any valid neighbor so we never freeze
          this.dir = validNeighbors[0]?.dir || 'UP';
        }
      } else {
        // Autonomous Connectome Decision
        decisionVector = decisionEngine.evaluateIntersection(
          this.col,
          this.row,
          this.dir,
          maze,
          predators,
          this.energyPercent,
          isFrenzyActive,
          now
        );
        this.dir = decisionVector.chosenDir;

        // Double check: if chosen dir is invalid/wall, pick first valid neighbor
        if (!validNeighbors.some((n) => n.dir === this.dir)) {
          this.dir = validNeighbors[0]?.dir || 'UP';
        }
      }
    }

    // Stuck Watchdog: If position barely moved over 0.2s, force a direction change!
    const distMoved = Math.hypot(this.x - this.lastX, this.y - this.lastY);
    if (distMoved < 1.0) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 0.15) {
        // Force snap to center and pick a random open neighbor
        this.x = centerTileX;
        this.y = centerTileY;
        if (validNeighbors.length > 0) {
          const altNeighbors = validNeighbors.filter(n => n.dir !== this.dir);
          this.dir = (altNeighbors.length > 0 ? altNeighbors[0] : validNeighbors[0]).dir;
        }
        this.stuckTimer = 0;
      }
    } else {
      this.stuckTimer = 0;
    }
    this.lastX = this.x;
    this.lastY = this.y;

    // Execute physical movement
    if (this.dir === 'UP') {
      this.y -= moveDist;
      this.headingRad = -Math.PI * 0.5;
    } else if (this.dir === 'DOWN') {
      this.y += moveDist;
      this.headingRad = Math.PI * 0.5;
    } else if (this.dir === 'LEFT') {
      this.x -= moveDist;
      this.headingRad = Math.PI;
    } else if (this.dir === 'RIGHT') {
      this.x += moveDist;
      this.headingRad = 0;
    }

    this.tripodPhase = (this.tripodPhase + moveDist * 0.8) % (Math.PI * 2);

    // Update grid col and row
    this.col = Math.floor(this.x / tilePx);
    this.row = Math.floor(this.y / tilePx);

    // Warp tunnels (Left/Right wrap)
    if (this.col < 0) {
      this.col = maze.grid[0].length - 1;
      this.x = this.col * tilePx + tilePx / 2;
    } else if (this.col >= maze.grid[0].length) {
      this.col = 0;
      this.x = tilePx / 2;
    }

    // Check pellet collection
    let pelletEaten: 'NONE' | 'PELLET' | 'SUPER_PELLET' = 'NONE';
    const currentTile = maze.getTile(this.col, this.row);
    if (currentTile === 'PELLET') {
      maze.setTile(this.col, this.row, 'CORRIDOR');
      this.energyPercent = Math.min(100, this.energyPercent + 3.0);
      pelletEaten = 'PELLET';
      this.isEating = true;
    } else if (currentTile === 'SUPER_PELLET') {
      maze.setTile(this.col, this.row, 'CORRIDOR');
      this.energyPercent = 100;
      pelletEaten = 'SUPER_PELLET';
      this.isEating = true;
    } else {
      this.isEating = false;
    }

    return { pelletEaten, decisionVector };
  }
}
