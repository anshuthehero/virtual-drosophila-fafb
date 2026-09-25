/**
 * Types for NEURAL LABYRINTH: Hardcore Connectome Edition
 * Powered by FlyWire FAFB Connectome
 */

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE';

export interface GridPos {
  col: number;
  row: number;
}

export interface PixelPos {
  x: number;
  y: number;
}

export type TileType = 
  | 'WALL'
  | 'CORRIDOR'
  | 'PELLET'
  | 'SUPER_PELLET'
  | 'HEAT_TRAP'
  | 'WARP_TUNNEL'
  | 'GHOST_SPAWN';

export type PredatorType = 
  | 'RED_HUNTER'    // Direct line-of-sight chase, casts expanding looming shadow
  | 'CYAN_AMBUSH'    // Projects fly heading and cuts off escape corridors
  | 'PURPLE_STALKER' // Follows recent scent trail, prevents backtracking
  | 'ORANGE_PATROL'; // Patrols and guards high-density sucrose rooms

export type PredatorMode = 'CHASE' | 'SCATTER' | 'FLEE' | 'EATEN';

export interface PredatorEntity {
  id: string;
  type: PredatorType;
  name: string;
  col: number;
  row: number;
  x: number;
  y: number;
  dir: Direction;
  speed: number;
  mode: PredatorMode;
  fleeTimer: number;
  color: string;
  targetCol: number;
  targetRow: number;
  loomingShadowRadius: number;
}

export interface DirectionScore {
  dir: Direction;
  totalScore: number;
  probability: number; // 0 to 1 (softmax)
  fearPenalty: number;
  rewardValue: number;
  compassBias: number;
  memoryPenalty: number;
  isValid: boolean;
}

export interface DecisionVector {
  chosenDir: Direction;
  isIntersection: boolean;
  options: Record<Direction, DirectionScore>;
  reason: string;
}

export type GameDifficulty = 'CASUAL' | 'HARDCORE' | 'NIGHTMARE';
export type GamePlayMode = 'AUTONOMOUS_RUN' | 'PLAYER_VS_FLY';
export type GameState = 'START' | 'PLAYING' | 'PAUSED' | 'STAGE_CLEAR' | 'GAME_OVER';

export interface GameTelemetry {
  score: number;
  highScore: number;
  stage: number;
  energyPercent: number; // 100 to 0 (starvation clock)
  pelletsRemaining: number;
  frenzyTimeRemaining: number;
  frenzyActive: boolean;
  predatorsEaten: number;
  totalIntersectionsSolved: number;
  deaths: number;
}
