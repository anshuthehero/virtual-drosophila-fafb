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

    // 1. Pack Alert: If any demon is in CHASE or HURT, alert nearby demons within 14 units
    const isAnyAlert = this.demons.some((d) => d.state === 'CHASE' || d.hurtTimer > 0);

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

      // Advance walk animation frame (Shadow stalkers twitch faster)
      const animMultiplier = demon.demonType === 'SHADOW' ? 5.5 : demon.state === 'CHASE' ? 3.5 : 1.2;
      demon.animFrame += dt * animMultiplier;

      // Calculate distance and angle to player
      const dx = player.x - demon.x;
      const dy = player.y - demon.y;
      const dist = Math.hypot(dx, dy);
      demon.distToPlayer = dist;

      // Angle from player to demon in world space
      demon.angleToPlayer = Math.atan2(dy, dx);

      // Line of sight check: raycast from demon to player
      const hasLOS = this.checkLineOfSight(demon.x, demon.y, player.x, player.y);

      // Pack coordination: Alert if in hearing range OR pack member alerted nearby
      if (dist < 16 || (isAnyAlert && dist < 18)) {
        demon.state = 'CHASE';

        // Attack if in close melee range (< 1.35 units) AND has LOS
        if (dist < 1.35 && demon.attackCooldown <= 0 && hasLOS) {
          demon.state = 'ATTACK';
          demon.attackCooldown = demon.demonType === 'SHADOW' ? 0.6 : 0.9;

          // Damage based on demon archetype
          const baseDamage =
            demon.demonType === 'BARON'
              ? 24
              : demon.demonType === 'CACODEMON'
              ? 18
              : demon.demonType === 'SHADOW'
              ? 14
              : 16;
          playerDamage += baseDamage;
        } else {
          // Tactical Pincer / Flanking Movement:
          // Instead of all charging in a straight line, flankers approach from angles
          let approachDx = dx / dist;
          let approachDy = dy / dist;

          if (dist > 2.0 && demon.flankRole) {
            // Perpendicular vector (-dy, dx)
            const perpX = -dy / dist;
            const perpY = dx / dist;
            const flankFactor = demon.flankRole === 'LEFT' ? 0.45 : demon.flankRole === 'RIGHT' ? -0.45 : 0;
            approachDx = approachDx + perpX * flankFactor;
            approachDy = approachDy + perpY * flankFactor;
            const norm = Math.hypot(approachDx, approachDy) || 1;
            approachDx /= norm;
            approachDy /= norm;
          }

          const stepDist = demon.speed * dt;
          const moveX = approachDx * stepDist;
          const moveY = approachDy * stepDist;

          // Wall slide: try X then Y independently so demons glide along walls
          const canX = !this.isWallWithRadius(demon.x + moveX, demon.y, 0.22);
          const canY = !this.isWallWithRadius(demon.x, demon.y + moveY, 0.22);

          if (canX) demon.x += moveX;
          if (canY) demon.y += moveY;

          // Perpendicular slide fallback if cornered
          if (!canX && !canY) {
            const px = -moveY;
            const py = moveX;
            if (!this.isWallWithRadius(demon.x + px, demon.y, 0.22)) demon.x += px;
            else if (!this.isWallWithRadius(demon.x, demon.y + py, 0.22)) demon.y += py;
          }
        }
      } else {
        demon.state = 'IDLE';
      }
    }

    // Dynamic Reinforcement: Keep the action intense!
    // If active demon count drops below 4, spawn a reinforcement in a distant room
    const activeDemons = this.demons.filter((d) => d.state !== 'DEAD');
    if (activeDemons.length < 5 && this.demons.length < 14) {
      const candidateSpawns = [
        { x: 13.5, y: 2.5, type: 'CACODEMON' as const },
        { x: 13.5, y: 13.5, type: 'BARON' as const },
        { x: 2.5, y: 12.5, type: 'SHADOW' as const },
        { x: 8.5, y: 13.5, type: 'IMP' as const },
        { x: 8.5, y: 2.5, type: 'IMP' as const }
      ];

      for (const sp of candidateSpawns) {
        if (Math.hypot(sp.x - player.x, sp.y - player.y) > 7.0) {
          const occupied = this.demons.some((d) => d.state !== 'DEAD' && Math.hypot(d.x - sp.x, d.y - sp.y) < 2.0);
          if (!occupied && !this.isWall(sp.x, sp.y)) {
            const flankRoles: ('DIRECT' | 'LEFT' | 'RIGHT')[] = ['DIRECT', 'LEFT', 'RIGHT'];
            this.demons.push({
              id: `demon_reinforce_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              x: sp.x,
              y: sp.y,
              health: sp.type === 'BARON' ? 120 : sp.type === 'CACODEMON' ? 85 : 70,
              maxHealth: sp.type === 'BARON' ? 120 : sp.type === 'CACODEMON' ? 85 : 70,
              state: 'CHASE',
              speed: sp.type === 'SHADOW' ? 2.3 : sp.type === 'BARON' ? 1.7 : 1.9,
              animFrame: Math.random() * 5,
              hurtTimer: 0,
              attackCooldown: 0.5,
              distToPlayer: Math.hypot(sp.x - player.x, sp.y - player.y),
              angleToPlayer: 0,
              demonType: sp.type,
              flankRole: flankRoles[Math.floor(Math.random() * flankRoles.length)]
            });
            break;
          }
        }
      }
    }

    // Soft repulsion between active demons to prevent overlapping
    for (let i = 0; i < this.demons.length; i++) {
      const d1 = this.demons[i];
      if (d1.state === 'DEAD') continue;
      for (let j = i + 1; j < this.demons.length; j++) {
        const d2 = this.demons[j];
        if (d2.state === 'DEAD') continue;
        const sepX = d1.x - d2.x;
        const sepY = d1.y - d2.y;
        const sepDist = Math.hypot(sepX, sepY);
        if (sepDist > 0.001 && sepDist < 0.75) {
          const push = ((0.75 - sepDist) / 0.75) * 1.5 * dt;
          const px = (sepX / sepDist) * push;
          const py = (sepY / sepDist) * push;
          if (!this.isWall(d1.x + px, d1.y)) d1.x += px;
          if (!this.isWall(d1.x, d1.y + py)) d1.y += py;
          if (!this.isWall(d2.x - px, d2.y)) d2.x -= px;
          if (!this.isWall(d2.x, d2.y - py)) d2.y -= py;
        }
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

      const dx = demon.x - player.x;
      const dy = demon.y - player.y;
      const dist = Math.hypot(dx, dy);

      // Dot product with player direction vector
      const dot = (dx * player.dirX + dy * player.dirY) / dist;

      // Cross product for angle deviation
      const cross = (dx * player.dirY - dy * player.dirX) / dist;

      // Within cone (~20 degrees) in front and has line-of-sight
      if (dot > 0.93 && Math.abs(cross) < 0.28 && dist < closestDist) {
        if (this.checkLineOfSight(player.x, player.y, demon.x, demon.y)) {
          closestDist = dist;
          closestDemon = demon;
        }
      }
    }

    if (closestDemon) {
      const demon = closestDemon as DemonEntity;
      const damage = Math.floor(45 + Math.random() * 30);
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
    // Try multiple angles and distances so demons don't pile onto identical coordinates
    const candidateAngles = [0, 0.25, -0.25, 0.5, -0.5];
    const candidateDistances = [2.0, 2.5, 3.0, 1.5, 3.5];

    for (const ang of candidateAngles) {
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const testDirX = player.dirX * ca - player.dirY * sa;
      const testDirY = player.dirX * sa + player.dirY * ca;

      for (const spawnDist of candidateDistances) {
        const sx = player.x + testDirX * spawnDist;
        const sy = player.y + testDirY * spawnDist;

        if (!this.isWall(sx, sy)) {
          // Check if spot is already crowded
          const crowded = this.demons.some(d => d.state !== 'DEAD' && Math.hypot(d.x - sx, d.y - sy) < 0.5);
          if (!crowded || (ang === candidateAngles[candidateAngles.length - 1] && spawnDist === candidateDistances[candidateDistances.length - 1])) {
            this.demons.push({
              id: `demon_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
              x: sx,
              y: sy,
              health: 75,
              maxHealth: 75,
              state: 'CHASE',
              speed: 1.8 + Math.random() * 0.4,
              animFrame: Math.random() * 5,
              hurtTimer: 0,
              attackCooldown: 0.5,
              distToPlayer: spawnDist,
              angleToPlayer: 0
            });
            return;
          }
        }
      }
    }
  }

  public isWall(x: number, y: number): boolean {
    const mx = Math.floor(x);
    const my = Math.floor(y);
    if (mx < 0 || mx >= DOOM_MAP_WIDTH || my < 0 || my >= DOOM_MAP_HEIGHT) return true;
    return DOOM_GRID[my][mx] > 0;
  }

  private isWallWithRadius(x: number, y: number, r: number): boolean {
    for (const dx of [-r, r]) {
      for (const dy of [-r, r]) {
        if (this.isWall(x + dx, y + dy)) return true;
      }
    }
    return false;
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
