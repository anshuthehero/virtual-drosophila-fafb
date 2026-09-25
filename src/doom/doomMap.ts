import { DemonEntity, ItemEntity } from './types';

export const DOOM_MAP_WIDTH = 16;
export const DOOM_MAP_HEIGHT = 16;

// 0 = empty space, 1..4 = wall texture types
export const DOOM_GRID: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 3, 3, 0, 0, 3, 3, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 3, 0, 0, 0, 0, 3, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 3, 0, 0, 0, 0, 3, 0, 1],
  [1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 4, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 1, 0, 0, 4, 4, 4, 0, 0, 0, 1],
  [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 0, 0, 1, 0, 2, 2, 0, 0, 2, 2, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 1],
  [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 1, 0, 2, 2, 0, 0, 2, 2, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

export function getInitialDemons(): DemonEntity[] {
  return [
    {
      // Demon in starting room, north end — fly sees it immediately
      id: 'demon_1',
      x: 4.5,
      y: 1.5,
      health: 60,
      maxHealth: 60,
      state: 'IDLE',
      speed: 1.8,
      animFrame: 0,
      hurtTimer: 0,
      attackCooldown: 0,
      distToPlayer: 999,
      angleToPlayer: 0
    },
    {
      // Demon in starting room, south end — flanks from below
      id: 'demon_2',
      x: 1.5,
      y: 5.5,
      health: 60,
      maxHealth: 60,
      state: 'IDLE',
      speed: 2.0,
      animFrame: 0,
      hurtTimer: 0,
      attackCooldown: 0,
      distToPlayer: 999,
      angleToPlayer: 0
    },
    {
      // Demon in far corridor — navigates around walls to reach player
      id: 'demon_3',
      x: 4.5,
      y: 10.5,
      health: 80,
      maxHealth: 80,
      state: 'IDLE',
      speed: 1.6,
      animFrame: 0,
      hurtTimer: 0,
      attackCooldown: 0,
      distToPlayer: 999,
      angleToPlayer: 0
    },
    {
      // Demon in far right corridor — comes from the east
      id: 'demon_4',
      x: 13.5,
      y: 7.5,
      health: 100,
      maxHealth: 100,
      state: 'IDLE',
      speed: 2.1,
      animFrame: 0,
      hurtTimer: 0,
      attackCooldown: 0,
      distToPlayer: 999,
      angleToPlayer: 0
    }
  ];
}

export function getInitialItems(): ItemEntity[] {
  return [
    { id: 'health_1', x: 2.5, y: 1.5, type: 'HEALTH', pickedUp: false },
    { id: 'health_2', x: 13.5, y: 1.5, type: 'HEALTH', pickedUp: false },
    { id: 'ammo_1', x: 3.5, y: 8.5, type: 'AMMO', pickedUp: false },
    { id: 'ammo_2', x: 14.5, y: 14.5, type: 'AMMO', pickedUp: false }
  ];
}
