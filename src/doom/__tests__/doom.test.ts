import { describe, it, expect, beforeEach } from 'vitest';
import { DoomRaycaster } from '../raycaster';
import { DemonManager } from '../demonAI';
import { FlyBrainDoomAgent } from '../flyBrainDoomAgent';
import { getInitialDemons, getInitialItems } from '../doomMap';
import { DoomPlayer } from '../types';

describe('DOOM 3D Raycaster Engine', () => {
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
