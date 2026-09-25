import { DOOM_GRID, DOOM_MAP_HEIGHT, DOOM_MAP_WIDTH } from './doomMap';
import { DemonEntity, DoomPlayer } from './types';

export class DemonManager {
  public demons: DemonEntity[];

  constructor(initialDemons: DemonEntity[]) {
    this.demons = initialDemons;
  }

  public update(dt: number, player: DoomPlayer): { playerDamage: number; demonsKilled: number } {
    let playerDamage = 0;
    let demonsKilled = 0;

    for (const demon of this.demons) {
      if (demon.state === 'DEAD') continue;

      // Hurt timer recovery
      if (demon.hurtTimer > 0) {
        demon.hurtTimer -= dt;
      }

      // Attack cooldown timer
      if (demon.attackCooldown > 0) {
        demon.attackCooldown -= dt;
      }

      // Calculate distance and angle to player
      const dx = player.x - demon.x;
      const dy = player.y - demon.y;
      const dist = Math.hypot(dx, dy);
      demon.distToPlayer = dist;

      // Angle from player to demon in world space
      demon.angleToPlayer = Math.atan2(dy, dx);

      // Line of sight check: raycast from demon to player
      const hasLOS = this.checkLineOfSight(demon.x, demon.y, player.x, player.y);

      if (hasLOS && dist < 10) {
        demon.state = 'CHASE';

        // Attack if in close melee range (< 1.5 units)
        if (dist < 1.4 && demon.attackCooldown <= 0) {
          demon.state = 'ATTACK';
          demon.attackCooldown = 1.0;
          playerDamage += 15; // Scratch attack!
        } else {
          // Approach player smoothly
          const stepDist = demon.speed * dt;
          const nextX = demon.x + (dx / dist) * stepDist;
          const nextY = demon.y + (dy / dist) * stepDist;

          // Wall collision check
          if (!this.isWall(nextX, demon.y)) demon.x = nextX;
          if (!this.isWall(demon.x, nextY)) demon.y = nextY;
        }
      } else {
        demon.state = 'IDLE';
      }
    }

    return { playerDamage, demonsKilled };
  }

  public shootAt(player: DoomPlayer): { hitDemon: DemonEntity | null; killed: boolean } {
    // Shotgun blast: check demons in center crosshair ray
    let closestDemon: DemonEntity | null = null;
    let closestDist = 999;

    for (const demon of this.demons) {
      if (demon.state === 'DEAD') continue;

      // Check if demon is in front of player
      const dx = demon.x - player.x;
      const dy = demon.y - player.y;
      const dist = Math.hypot(dx, dy);

      // Dot product with player direction vector
      const dot = (dx * player.dirX + dy * player.dirY) / dist;

      // Cross product for angle deviation
      const cross = (dx * player.dirY - dy * player.dirX) / dist;

      // If within narrow cone (~18 degrees) in front and has line-of-sight
      if (dot > 0.95 && Math.abs(cross) < 0.25 && dist < closestDist) {
        if (this.checkLineOfSight(player.x, player.y, demon.x, demon.y)) {
          closestDist = dist;
          closestDemon = demon;
        }
      }
    }

    if (closestDemon) {
      const demon = closestDemon as DemonEntity;
      const damage = Math.floor(40 + Math.random() * 30);
      demon.health -= damage;
      demon.hurtTimer = 0.25;

      if (demon.health <= 0) {
        demon.state = 'DEAD';
        return { hitDemon: demon, killed: true };
      }
      return { hitDemon: demon, killed: false };
    }

    return { hitDemon: null, killed: false };
  }

  public spawnDemonInFront(player: DoomPlayer) {
    // Check distances 1.5, 2.0, 2.5, 3.0 to find open floor
    for (const spawnDist of [2.0, 1.5, 2.5, 3.0, 1.0]) {
      const sx = player.x + player.dirX * spawnDist;
      const sy = player.y + player.dirY * spawnDist;

      if (!this.isWall(sx, sy)) {
        this.demons.push({
          id: `demon_${Date.now()}_${Math.random()}`,
          x: sx,
          y: sy,
          health: 80,
          maxHealth: 80,
          state: 'CHASE',
          speed: 2.0,
          animFrame: 0,
          hurtTimer: 0,
          attackCooldown: 0.5,
          distToPlayer: spawnDist,
          angleToPlayer: 0
        });
        break;
      }
    }
  }

  private isWall(x: number, y: number): boolean {
    const mx = Math.floor(x);
    const my = Math.floor(y);
    if (mx < 0 || mx >= DOOM_MAP_WIDTH || my < 0 || my >= DOOM_MAP_HEIGHT) return true;
    return DOOM_GRID[my][mx] > 0;
  }

  private checkLineOfSight(x0: number, y0: number, x1: number, y1: number): boolean {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.ceil(dist * 8);
    for (let i = 1; i < steps; i++) {
      const cx = x0 + ((x1 - x0) * i) / steps;
      const cy = y0 + ((y1 - y0) * i) / steps;
      if (this.isWall(cx, cy)) return false;
    }
    return true;
  }
}
