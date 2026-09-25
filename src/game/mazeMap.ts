export { type Direction, type GridPos, type TileType } from './types';
import { Direction, GridPos, TileType } from './types';

export const MAZE_COLS = 24;
export const MAZE_ROWS = 24;
export const TILE_SIZE = 22; // In screen pixels

// Maze layout:
// # = WALL
// . = PELLET
// O = SUPER PELLET (Sucrose Crystal)
// H = HEAT TRAP (Pulsing hazard tunnel)
// W = WARP TUNNEL
// S = GHOST SPAWN
//   = EMPTY CORRIDOR
export const MAZE_STRING_TEMPLATE = [
  "########################",
  "#O.........##.........O#",
  "#.####.###.##.###.####.#",
  "#.####.###.##.###.####.#",
  "#......................#",
  "#.####.##.####.##.####.#",
  "#......##..##..##......#",
  "######.### ## ###.######",
  "     #.##  SS  ##.#     ",
  "W#####.## SSSS ##.#####W",
  "     #....SSSS....#     ",
  "######.## SSSS ##.######",
  "     #.##      ##.#     ",
  "######.##.####.##.######",
  "#..........##..........#",
  "#.####.###.##.###.####.#",
  "#.####.###.##.###.####.#",
  "#O..##............##..O#",
  "###.##.##.####.##.##.###",
  "#......##..##..##......#",
  "#.########.##.########.#",
  "#.HH................HH.#",
  "#......................#",
  "########################"
];

export class MazeMap {
  public grid: TileType[][];
  public totalPellets: number = 0;
  public ghostSpawnPos: GridPos = { col: 12, row: 10 };
  public flySpawnPos: GridPos = { col: 12, row: 17 };

  constructor() {
    this.grid = [];
    this.resetMaze();
  }

  public resetMaze() {
    this.grid = [];
    this.totalPellets = 0;

    for (let r = 0; r < MAZE_ROWS; r++) {
      const rowArr: TileType[] = [];
      const line = MAZE_STRING_TEMPLATE[r];

      for (let c = 0; c < MAZE_COLS; c++) {
        const char = line ? line[c] : '#';
        if (char === '#') {
          rowArr.push('WALL');
        } else if (char === '.') {
          rowArr.push('PELLET');
          this.totalPellets++;
        } else if (char === 'O') {
          rowArr.push('SUPER_PELLET');
          this.totalPellets++;
        } else if (char === 'H') {
          rowArr.push('HEAT_TRAP');
        } else if (char === 'W') {
          rowArr.push('WARP_TUNNEL');
        } else if (char === 'S') {
          rowArr.push('GHOST_SPAWN');
        } else {
          rowArr.push('CORRIDOR');
        }
      }
      this.grid.push(rowArr);
    }
  }

  public isWall(col: number, row: number): boolean {
    if (row < 0 || row >= MAZE_ROWS) return true;
    // Handle warp tunnel wrap
    if (col < 0 || col >= MAZE_COLS) return false;
    return this.grid[row][col] === 'WALL';
  }

  public getTile(col: number, row: number): TileType {
    if (col < 0 || col >= MAZE_COLS) return 'WARP_TUNNEL';
    if (row < 0 || row >= MAZE_ROWS) return 'WALL';
    return this.grid[row][col];
  }

  public setTile(col: number, row: number, tile: TileType) {
    if (col >= 0 && col < MAZE_COLS && row >= 0 && row < MAZE_ROWS) {
      this.grid[row][col] = tile;
    }
  }

  public getValidNeighbors(col: number, row: number): { dir: Direction; col: number; row: number }[] {
    const list: { dir: Direction; col: number; row: number }[] = [];
    const dirs: { dir: Direction; dc: number; dr: number }[] = [
      { dir: 'UP', dc: 0, dr: -1 },
      { dir: 'DOWN', dc: 0, dr: 1 },
      { dir: 'LEFT', dc: -1, dr: 0 },
      { dir: 'RIGHT', dc: 1, dr: 0 }
    ];

    for (const d of dirs) {
      let nc = col + d.dc;
      let nr = row + d.dr;

      // Handle wrap
      if (nc < 0) nc = MAZE_COLS - 1;
      if (nc >= MAZE_COLS) nc = 0;

      if (!this.isWall(nc, nr)) {
        list.push({ dir: d.dir, col: nc, row: nr });
      }
    }
    return list;
  }

  public isIntersection(col: number, row: number): boolean {
    return this.getValidNeighbors(col, row).length >= 3;
  }
}
