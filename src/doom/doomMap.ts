import { DemonEntity, ItemEntity } from './types';

export const DOOM_MAP_WIDTH = 16;
export const DOOM_MAP_HEIGHT = 16;

// 0 = empty space, 1 = Tech Steel, 2 = Gothic Brick, 3 = Computer Terminal, 4 = Hazard Striped
export const DOOM_GRID: number[][] = [
  // 0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 0
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 1], // 1: Hangar (left) & Mainframe (right)
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 1], // 2: Player starts at (2.5, 2.5)
  [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1], // 3: Wide East Corridor
  [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 3, 0, 0, 3, 0, 1], // 4
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 3, 0, 1], // 5: Wide South & East Openings
  [1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 6
  [1, 0, 0, 0, 0, 0, 4, 4, 0, 0, 4, 4, 0, 0, 0, 1], // 7: Hazard Courtyard
  [1, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 4, 0, 0, 0, 1], // 8
  [1, 0, 0, 0, 0, 0, 4, 4, 0, 0, 4, 4, 0, 0, 0, 1], // 9
  [1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 10
  [1, 0, 1, 1, 0, 0, 2, 2, 0, 0, 2, 2, 0, 0, 0, 1], // 11: Catacomb Wing
  [1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 1], // 12
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 13: Open Southern Perimeter
  [1, 0, 1, 1, 0, 0, 2, 2, 0, 0, 2, 2, 0, 0, 0, 1], // 14
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]  // 15
];

export function getInitialDemons(): DemonEntity[] {
  return [
    {
      // Demon 1: Patrolling the East Mainframe Corridor
      id: 'demon_1',
      x: 8.5,
      y: 2.5,
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
      // Demon 2: Guarding the Central Hazard Courtyard
      id: 'demon_2',
      x: 8.5,
      y: 8.5,
      health: 70,
      maxHealth: 70,
      state: 'IDLE',
      speed: 1.9,
      animFrame: 0,
      hurtTimer: 0,
      attackCooldown: 0,
      distToPlayer: 999,
      angleToPlayer: 0
    },
    {
      // Demon 3: Lurking in the South-West Corridor
      id: 'demon_3',
      x: 3.5,
      y: 12.5,
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
      // Demon 4: Guarding the Eastern Catacombs
      id: 'demon_4',
      x: 13.5,
      y: 12.5,
      health: 100,
      maxHealth: 100,
      state: 'IDLE',
      speed: 2.0,
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
    { id: 'ammo_1', x: 1.5, y: 4.5, type: 'AMMO', pickedUp: false },
    { id: 'health_2', x: 13.5, y: 2.5, type: 'HEALTH', pickedUp: false },
    { id: 'ammo_2', x: 13.5, y: 8.5, type: 'AMMO', pickedUp: false },
    { id: 'health_3', x: 3.5, y: 8.5, type: 'HEALTH', pickedUp: false },
    { id: 'ammo_3', x: 8.5, y: 13.5, type: 'AMMO', pickedUp: false }
  ];
}
