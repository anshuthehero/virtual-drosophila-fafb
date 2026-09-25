import { describe, it, expect, beforeEach } from 'vitest';
import { DoomRaycaster } from '../raycaster';
import { DemonManager } from '../demonAI';
import { FlyBrainDoomAgent } from '../flyBrainDoomAgent';
import { DOOM_GRID, getInitialDemons, getInitialItems } from '../doomMap';
import { DoomPlayer } from '../types';

describe('DOOM Trajectory & Autonomous Exploration', () => {
  it('autonomously patrols and navigates through the maze without getting stuck', () => {
    const agent = new FlyBrainDoomAgent();
    const demons = new DemonManager(getInitialDemons());
    const items = getInitialItems();
    const player: DoomPlayer = {
      x: 2.5, y: 2.5, dirX: 1, dirY: 0, planeX: 0, planeY: 0.66,
      angleRad: 0, health: 100, ammo: 30, frags: 0, isShooting: false, shootAnimTimer: 0
    };

    const moveEntityWithSliding = (
      currentX: number, currentY: number, dx: number, dy: number, radius = 0.2
    ): { x: number; y: number } => {
      let newX = currentX;
      let newY = currentY;
      if (dx !== 0) {
        const targetX = currentX + dx;
        const testX = dx > 0 ? targetX + radius : targetX - radius;
        const checkCol = Math.floor(testX);
        const minY = Math.floor(currentY - radius + 0.05);
        const maxY = Math.floor(currentY + radius - 0.05);
        let blockedX = false;
        for (let r = minY; r <= maxY; r++) {
          if (checkCol < 0 || checkCol >= 16 || r < 0 || r >= 16 || DOOM_GRID[r][checkCol] > 0) {
            blockedX = true; break;
          }
        }
        if (!blockedX) newX = targetX;
        else newX = dx > 0 ? checkCol - radius - 0.001 : checkCol + 1 + radius + 0.001;
      }
      if (dy !== 0) {
        const targetY = currentY + dy;
        const testY = dy > 0 ? targetY + radius : targetY - radius;
        const checkRow = Math.floor(testY);
        const minX = Math.floor(newX - radius + 0.05);
        const maxX = Math.floor(newX + radius - 0.05);
        let blockedY = false;
        for (let c = minX; c <= maxX; c++) {
          if (checkRow < 0 || checkRow >= 16 || c < 0 || c >= 16 || DOOM_GRID[checkRow][c] > 0) {
            blockedY = true; break;
          }
        }
        if (!blockedY) newY = targetY;
        else newY = dy > 0 ? checkRow - radius - 0.001 : checkRow + 1 + radius + 0.001;
      }
      return { x: newX, y: newY };
    };

    let totalMoved = 0;
    let lastX = player.x;
    let lastY = player.y;

    for (let i = 0; i < 400; i++) {
      const dt = 0.033;
      const out = agent.step(dt, player, demons.demons, items);
      demons.update(dt, player);

      if (out.buttons.fire) {
        demons.shootAt(player);
      }

      const rotSpeed = 2.2 * dt;
      if (out.buttons.turnLeft) player.angleRad -= rotSpeed;
      if (out.buttons.turnRight) player.angleRad += rotSpeed;
      while (player.angleRad > Math.PI) player.angleRad -= Math.PI * 2;
      while (player.angleRad < -Math.PI) player.angleRad += Math.PI * 2;
      player.dirX = Math.cos(player.angleRad);
      player.dirY = Math.sin(player.angleRad);

      const moveSpeed = 3.6 * dt;
      let moveDx = 0;
      let moveDy = 0;
      if (out.buttons.moveForward) {
        moveDx += player.dirX * moveSpeed;
        moveDy += player.dirY * moveSpeed;
      }
      if (out.buttons.moveBackward) {
        moveDx -= player.dirX * moveSpeed * 0.7;
        moveDy -= player.dirY * moveSpeed * 0.7;
      }
      if (moveDx !== 0 || moveDy !== 0) {
        const moved = moveEntityWithSliding(player.x, player.y, moveDx, moveDy, 0.2);
        player.x = moved.x;
        player.y = moved.y;
      }

      totalMoved += Math.hypot(player.x - lastX, player.y - lastY);
      lastX = player.x;
      lastY = player.y;
    }

    // Agent should have traversed significant distance across multiple rooms
    expect(totalMoved).toBeGreaterThan(25.0);
  });

  it('initializes z-buffer and retinal scan rays', () => {
    const raycaster = new DoomRaycaster(320, 240);
    expect(raycaster.zBuffer.length).toBe(320);
    expect(raycaster.retinalRays.length).toBe(36);
  });
});

describe('Demon Manager & Combat', () => {
  let demons: DemonManager;
  let player: DoomPlayer;

  beforeEach(() => {
    demons = new DemonManager(getInitialDemons());
    player = {
      x: 2.5,
      y: 2.5,
      dirX: 1.0,
      dirY: 0.0,
      planeX: 0.0,
      planeY: 0.66,
      angleRad: 0.0,
      health: 100,
      ammo: 30,
      frags: 0,
      isShooting: false,
      shootAnimTimer: 0
    };
  });

  it('spawns demons and registers shotgun hits when aimed at demon', () => {
    // Spawn demon directly in front of player
    demons.spawnDemonInFront(player);
    const activeDemons = demons.demons.filter((d) => d.state !== 'DEAD');
    expect(activeDemons.length).toBeGreaterThan(4);

    // Shoot shotgun
    const shot = demons.shootAt(player);
    expect(shot.hitDemon).not.toBeNull();
  });
});

describe('FlyBrainDoomAgent (Connectome Action Selection)', () => {
  let agent: FlyBrainDoomAgent;
  let player: DoomPlayer;

  beforeEach(() => {
    agent = new FlyBrainDoomAgent();
    player = {
      x: 2.5,
      y: 2.5,
      dirX: 1.0,
      dirY: 0.0,
      planeX: 0.0,
      planeY: 0.66,
      angleRad: 0.0,
      health: 100,
      ammo: 30,
      frags: 0,
      isShooting: false,
      shootAnimTimer: 0
    };
  });

  it('triggers Giant Fiber and presses FIRE when demon is in crosshair', () => {
    // Place demon directly aligned with player heading (3 tiles ahead)
    const alignedDemon = {
      id: 'test_demon',
      x: 5.5,
      y: 2.5,
      health: 60,
      maxHealth: 60,
      state: 'CHASE' as const,
      speed: 1.8,
      animFrame: 0,
      hurtTimer: 0,
      attackCooldown: 0,
      distToPlayer: 3.0,
      angleToPlayer: 0
    };

    const out = agent.step(0.05, player, [alignedDemon], []);
    expect(out.buttons.fire).toBe(true);
    expect(out.giantFiberSpike).toBe(true);
    expect(out.reason).toContain('FIRE');
  });

  it('turns toward demon when demon is off-center in FOV', () => {
    // Demon located to the right (+y)
    const offCenterDemon = {
      id: 'test_demon_right',
      x: 4.5,
      y: 4.5,
      health: 60,
      maxHealth: 60,
      state: 'CHASE' as const,
      speed: 1.8,
      animFrame: 0,
      hurtTimer: 0,
      attackCooldown: 0,
      distToPlayer: 3.5,
      angleToPlayer: Math.PI / 4
    };

    const out = agent.step(0.05, player, [offCenterDemon], []);
    expect(out.buttons.turnRight).toBe(true);
    expect(out.reason).toContain('AIMING RIGHT');
  });

  it('induces continuous spinning when Ellipsoid Body compass is lesioned', () => {
    agent.setEBLesion(70); // Severe EB lesion
    const out = agent.step(0.05, player, [], []);
    expect(out.buttons.turnLeft).toBe(true);
    expect(out.reason).toContain('EB LESION');
  });
});
