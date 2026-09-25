import { Direction, GridPos, MazeMap, TILE_SIZE } from './mazeMap';
import { GameDifficulty, PredatorEntity, PredatorMode, PredatorType } from './types';

export class PredatorSystem {
  public predators: PredatorEntity[];
  public maze: MazeMap;

  constructor(maze: MazeMap) {
    this.maze = maze;
    this.predators = this.initPredators();
  }

  /**
   * Spawn 4 predators in all 4 corners of the labyrinth
   * so they converge on the fly from ALL directions!
   */
  public initPredators(): PredatorEntity[] {
    return [
      {
        id: 'red_hunter',
        type: 'RED_HUNTER',
        name: 'LOOMING HUNTER (NORTHEAST)',
        col: 22,
        row: 1,
        x: 22 * TILE_SIZE + TILE_SIZE / 2,
        y: 1 * TILE_SIZE + TILE_SIZE / 2,
        dir: 'LEFT',
        speed: 2.5,
        mode: 'CHASE',
        fleeTimer: 0,
        color: '#FFFFFF',
        targetCol: 12,
        targetRow: 17,
        loomingShadowRadius: 40
      },
      {
        id: 'cyan_ambush',
        type: 'CYAN_AMBUSH',
        name: 'AMBUSH TRAPPER (NORTHWEST)',
        col: 1,
        row: 1,
        x: 1 * TILE_SIZE + TILE_SIZE / 2,
        y: 1 * TILE_SIZE + TILE_SIZE / 2,
        dir: 'RIGHT',
        speed: 2.4,
        mode: 'CHASE',
        fleeTimer: 0,
        color: '#FFFFFF',
        targetCol: 12,
        targetRow: 17,
        loomingShadowRadius: 32
      },
      {
        id: 'purple_stalker',
        type: 'PURPLE_STALKER',
        name: 'SCENT STALKER (SOUTHWEST)',
        col: 1,
        row: 22,
        x: 1 * TILE_SIZE + TILE_SIZE / 2,
        y: 22 * TILE_SIZE + TILE_SIZE / 2,
        dir: 'UP',
        speed: 2.3,
        mode: 'CHASE',
        fleeTimer: 0,
        color: '#FFFFFF',
        targetCol: 12,
        targetRow: 17,
        loomingShadowRadius: 28
      },
      {
        id: 'orange_patrol',
        type: 'ORANGE_PATROL',
        name: 'TERRITORIAL BRUTE (SOUTHEAST)',
        col: 22,
        row: 22,
        x: 22 * TILE_SIZE + TILE_SIZE / 2,
        y: 22 * TILE_SIZE + TILE_SIZE / 2,
        dir: 'UP',
        speed: 2.2,
        mode: 'CHASE',
        fleeTimer: 0,
        color: '#FFFFFF',
        targetCol: 12,
        targetRow: 17,
        loomingShadowRadius: 34
      }
    ];
  }

  public resetPositions() {
    this.predators = this.initPredators();
  }

  public triggerFrenzy(durationSec: number) {
    for (const p of this.predators) {
      if (p.mode !== 'EATEN') {
        p.mode = 'FLEE';
        p.fleeTimer = durationSec;
      }
    }
  }

  public update(
    dt: number,
    flyCol: number,
    flyRow: number,
    flyDir: Direction,
    flyTrail: GridPos[],
    difficulty: GameDifficulty,
    playerControlledDir?: Direction // In PLAYER_VS_FLY mode
  ) {
    const speedMult = difficulty === 'NIGHTMARE' ? 1.35 : difficulty === 'HARDCORE' ? 1.15 : 0.95;

    for (const p of this.predators) {
      // Handle Flee timer
      if (p.mode === 'FLEE') {
        p.fleeTimer -= dt;
        if (p.fleeTimer <= 0) {
          p.mode = 'CHASE';
        }
      }

      // If in PLAYER_VS_FLY mode and this is red_hunter, player controls direction
      if (playerControlledDir && p.type === 'RED_HUNTER') {
        this.stepPredatorManual(p, dt, playerControlledDir, speedMult);
      } else {
        // AI Pathfinding
        this.updateAITarget(p, flyCol, flyRow, flyDir, flyTrail);
        this.stepPredatorAI(p, dt, speedMult);
      }
    }
  }

  private updateAITarget(
    p: PredatorEntity,
    flyCol: number,
    flyRow: number,
    flyDir: Direction,
    flyTrail: GridPos[]
  ) {
    if (p.mode === 'FLEE') {
      // Run away to corners
      p.targetCol = p.col < 12 ? 22 : 1;
      p.targetRow = p.row < 12 ? 22 : 1;
      return;
    }

    if (p.mode === 'EATEN') {
      p.targetCol = 12;
      p.targetRow = 10;
      if (p.col === 12 && p.row === 10) {
        p.mode = 'CHASE';
      }
      return;
    }

    switch (p.type) {
      case 'RED_HUNTER':
        // Direct chase to fly position from top-right
        p.targetCol = flyCol;
        p.targetRow = flyRow;
        break;

      case 'CYAN_AMBUSH':
        // Project 4 tiles ahead of fly's heading to cut off escape
        let aheadCol = flyCol;
        let aheadRow = flyRow;
        if (flyDir === 'UP') aheadRow -= 4;
        else if (flyDir === 'DOWN') aheadRow += 4;
        else if (flyDir === 'LEFT') aheadCol -= 4;
        else if (flyDir === 'RIGHT') aheadCol += 4;
        p.targetCol = Math.max(1, Math.min(22, aheadCol));
        p.targetRow = Math.max(1, Math.min(22, aheadRow));
        break;

      case 'PURPLE_STALKER':
        // Scent stalker: follows past odor trail
        if (flyTrail.length > 5) {
          const past = flyTrail[Math.max(0, flyTrail.length - 6)];
          p.targetCol = past.col;
          p.targetRow = past.row;
        } else {
          p.targetCol = flyCol;
          p.targetRow = flyRow;
        }
        break;

      case 'ORANGE_PATROL':
        // If close (< 7 tiles), chase; otherwise patrol bottom-right quadrant
        const dist = Math.abs(p.col - flyCol) + Math.abs(p.row - flyRow);
        if (dist < 7) {
          p.targetCol = flyCol;
          p.targetRow = flyRow;
        } else {
          p.targetCol = 20;
          p.targetRow = 20;
        }
        break;
    }
  }

  private stepPredatorAI(p: PredatorEntity, dt: number, speedMult: number) {
    const tilePx = TILE_SIZE;
    const currentSpeed = p.mode === 'FLEE' ? p.speed * 0.7 : p.speed * speedMult;
    const moveDist = currentSpeed * dt * 45;

    const centerTileX = p.col * tilePx + tilePx / 2;
    const centerTileY = p.row * tilePx + tilePx / 2;

    const atCenter =
      Math.abs(p.x - centerTileX) < moveDist + 1 &&
      Math.abs(p.y - centerTileY) < moveDist + 1;

    if (atCenter) {
      p.x = centerTileX;
      p.y = centerTileY;

      const neighbors = this.maze.getValidNeighbors(p.col, p.row);
      const oppositeDir = this.getOppositeDir(p.dir);
      const candidates = neighbors.filter(n => neighbors.length === 1 || n.dir !== oppositeDir);

      let bestDir = p.dir;
      let minDist = 999999;

      for (const cand of candidates) {
        const d =
          (cand.col - p.targetCol) * (cand.col - p.targetCol) +
          (cand.row - p.targetRow) * (cand.row - p.targetRow);
        if (d < minDist) {
          minDist = d;
          bestDir = cand.dir;
        }
      }

      p.dir = bestDir;
    }

    this.moveEntity(p, moveDist);
  }

  private stepPredatorManual(p: PredatorEntity, dt: number, requestedDir: Direction, speedMult: number) {
    const moveDist = p.speed * speedMult * dt * 45;
    const tilePx = TILE_SIZE;
    const centerTileX = p.col * tilePx + tilePx / 2;
    const centerTileY = p.row * tilePx + tilePx / 2;

    const atCenter =
      Math.abs(p.x - centerTileX) < moveDist + 1 &&
      Math.abs(p.y - centerTileY) < moveDist + 1;

    if (atCenter && requestedDir !== 'NONE') {
      const neighbors = this.maze.getValidNeighbors(p.col, p.row);
      if (neighbors.some(n => n.dir === requestedDir)) {
        p.dir = requestedDir;
        p.x = centerTileX;
        p.y = centerTileY;
      }
    }

    this.moveEntity(p, moveDist);
  }

  private moveEntity(p: PredatorEntity, dist: number) {
    if (p.dir === 'UP') p.y -= dist;
    else if (p.dir === 'DOWN') p.y += dist;
    else if (p.dir === 'LEFT') p.x -= dist;
    else if (p.dir === 'RIGHT') p.x += dist;

    // Update grid col/row
    p.col = Math.floor(p.x / TILE_SIZE);
    p.row = Math.floor(p.y / TILE_SIZE);

    // Warp wrap
    if (p.col < 0) {
      p.col = this.maze.grid[0].length - 1;
      p.x = p.col * TILE_SIZE + TILE_SIZE / 2;
    } else if (p.col >= this.maze.grid[0].length) {
      p.col = 0;
      p.x = TILE_SIZE / 2;
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
}
