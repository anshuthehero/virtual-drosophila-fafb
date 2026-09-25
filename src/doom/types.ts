/**
 * Types for DOOM-FLY: FAFB Connectome Plays DOOM
 */

export interface DoomPlayer {
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  planeX: number; // Camera plane for raycasting FOV (~66 deg)
  planeY: number;
  angleRad: number;
  health: number; // 100 to 0
  ammo: number;
  frags: number;
  isShooting: boolean;
  shootAnimTimer: number;
  walkBob?: number;
  hitmarkerTimer?: number;
  pickupFlash?: 'HEALTH' | 'AMMO' | null;
  pickupFlashTimer?: number;
}

export type DemonState = 'IDLE' | 'CHASE' | 'ATTACK' | 'HURT' | 'DEAD';
export type DemonType = 'IMP' | 'BARON' | 'CACODEMON' | 'SHADOW';

export interface DemonEntity {
  id: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  state: DemonState;
  speed: number;
  animFrame: number;
  hurtTimer: number;
  attackCooldown: number;
  distToPlayer: number;
  angleToPlayer: number;
  demonType?: DemonType;
  flankRole?: 'DIRECT' | 'LEFT' | 'RIGHT';
}

export interface ItemEntity {
  id: string;
  x: number;
  y: number;
  type: 'HEALTH' | 'AMMO';
  pickedUp: boolean;
}

export interface RayHit {
  distance: number;
  side: number; // 0 for vertical, 1 for horizontal
  wallType: number;
  wallX: number; // Exact hit coordinate along wall
  rayDirX: number;
  rayDirY: number;
}

export interface DoomButtons {
  turnLeft: boolean;
  turnRight: boolean;
  moveForward: boolean;
  moveBackward: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
  fire: boolean;
}

export interface DoomTelemetry {
  health: number;
  ammo: number;
  frags: number;
  demonsAlive: number;
  shotsFired: number;
  accuracyPercent: number;
  stageName: string;
}
