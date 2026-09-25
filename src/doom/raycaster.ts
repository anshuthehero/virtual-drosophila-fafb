import { DOOM_GRID, DOOM_MAP_HEIGHT, DOOM_MAP_WIDTH } from './doomMap';
import { DemonEntity, DoomPlayer, ItemEntity, RayHit } from './types';

export class DoomRaycaster {
  public width: number;
  public height: number;
  public zBuffer: Float32Array;
  public retinalRays: number[] = new Array(36).fill(0); // 36-ommatidia scan

  constructor(width: number = 420, height: number = 280) {
    this.width = width;
    this.height = height;
    this.zBuffer = new Float32Array(width);
  }

  public render(
    ctx: CanvasRenderingContext2D,
    player: DoomPlayer,
    demons: DemonEntity[],
    items: ItemEntity[]
  ) {
    const w = this.width;
    const h = this.height;

    // 1. Draw Ceiling and Floor (Retro DOOM Depth Shading)
    ctx.fillStyle = '#111111'; // Ceiling
    ctx.fillRect(0, 0, w, h / 2);
    ctx.fillStyle = '#1A1818'; // Floor
    ctx.fillRect(0, h / 2, w, h / 2);

    // 2. DDA Raycast for 3D Walls
    const rayHits: RayHit[] = [];

    for (let x = 0; x < w; x++) {
      // Calculate ray position and direction
      const cameraX = (2 * x) / w - 1; // x in camera space (-1 to +1)
      const rayDirX = player.dirX + player.planeX * cameraX;
      const rayDirY = player.dirY + player.planeY * cameraX;

      // Current map box
      let mapX = Math.floor(player.x);
      let mapY = Math.floor(player.y);

      // Length of ray from current position to next x or y-side
      let sideDistX = 0;
      let sideDistY = 0;

      // Length of ray from one x or y-side to next x or y-side
      const deltaDistX = Math.abs(1 / (rayDirX || 0.00001));
      const deltaDistY = Math.abs(1 / (rayDirY || 0.00001));
      let perpWallDist = 0;

      let stepX = 0;
      let stepY = 0;
      let hit = 0;
      let side = 0; // 0 for vertical, 1 for horizontal

      // Calculate step and initial sideDist
      if (rayDirX < 0) {
        stepX = -1;
        sideDistX = (player.x - mapX) * deltaDistX;
      } else {
        stepX = 1;
        sideDistX = (mapX + 1.0 - player.x) * deltaDistX;
      }
      if (rayDirY < 0) {
        stepY = -1;
        sideDistY = (player.y - mapY) * deltaDistY;
      } else {
        stepY = 1;
        sideDistY = (mapY + 1.0 - player.y) * deltaDistY;
      }

      // DDA algorithm loop
      while (hit === 0) {
        if (sideDistX < sideDistY) {
          sideDistX += deltaDistX;
          mapX += stepX;
          side = 0;
        } else {
          sideDistY += deltaDistY;
          mapY += stepY;
          side = 1;
        }

        // Check if ray hit a wall
        if (mapX >= 0 && mapX < DOOM_MAP_WIDTH && mapY >= 0 && mapY < DOOM_MAP_HEIGHT) {
          if (DOOM_GRID[mapY][mapX] > 0) {
            hit = DOOM_GRID[mapY][mapX];
          }
        } else {
          hit = 1; // Out of bounds treated as boundary wall
        }
      }

      // Calculate perpendicular distance to avoid fisheye distortion
      if (side === 0) {
        perpWallDist = (mapX - player.x + (1 - stepX) / 2) / rayDirX;
      } else {
        perpWallDist = (mapY - player.y + (1 - stepY) / 2) / rayDirY;
      }

      this.zBuffer[x] = perpWallDist;

      // Wall column height on screen
      const lineHeight = Math.floor(h / (perpWallDist || 0.001));
      const drawStart = Math.max(0, -lineHeight / 2 + h / 2);
      const drawEnd = Math.min(h - 1, lineHeight / 2 + h / 2);

      // Depth shading: farther walls get darker (retro fog)
      const brightness = Math.max(0.12, Math.min(1.0, 1.0 - perpWallDist / 12.0));
      const shadeFactor = side === 1 ? 0.72 : 1.0; // Shading for north/south vs east/west

      // Wall color by texture type
      let r = 80, g = 80, b = 80;
      if (hit === 1) { r = 120; g = 120; b = 120; } // Tech Steel
      else if (hit === 2) { r = 140; g = 50; b = 40; }  // Demon Brick
      else if (hit === 3) { r = 40; g = 90; b = 130; }  // Blue Base
      else if (hit === 4) { r = 150; g = 120; b = 30; } // Hazard

      const finalR = Math.floor(r * brightness * shadeFactor);
      const finalG = Math.floor(g * brightness * shadeFactor);
      const finalB = Math.floor(b * brightness * shadeFactor);

      ctx.fillStyle = `rgb(${finalR}, ${finalG}, ${finalB})`;
      ctx.fillRect(x, drawStart, 1, drawEnd - drawStart + 1);

      // Subtle vertical mortar lines every 16 pixels
      let wallX = side === 0 ? player.y + perpWallDist * rayDirY : player.x + perpWallDist * rayDirX;
      wallX -= Math.floor(wallX);
      if (Math.floor(wallX * 16) === 0 || Math.floor(wallX * 16) === 15) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(x, drawStart, 1, drawEnd - drawStart + 1);
      }
    }

    // 3. Render 3D Sprites (Items & Demons) Sorted by Distance
    const sprites: Array<{
      type: 'DEMON' | 'ITEM';
      entity: DemonEntity | ItemEntity;
      dist: number;
      x: number;
      y: number;
    }> = [];

    for (const d of demons) {
      if (d.state !== 'DEAD') {
        const dist = Math.hypot(d.x - player.x, d.y - player.y);
        sprites.push({ type: 'DEMON', entity: d, dist, x: d.x, y: d.y });
      }
    }

    for (const it of items) {
      if (!it.pickedUp) {
        const dist = Math.hypot(it.x - player.x, it.y - player.y);
        sprites.push({ type: 'ITEM', entity: it, dist, x: it.x, y: it.y });
      }
    }

    // Sort far to near (Painter's algorithm)
    sprites.sort((a, b) => b.dist - a.dist);

    for (const sp of sprites) {
      this.drawBillboardSprite(ctx, player, sp.x, sp.y, sp.dist, sp.type, sp.entity);
    }

    // 4. Draw Center Crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 6, h / 2);
    ctx.lineTo(w / 2 + 6, h / 2);
    ctx.moveTo(w / 2, h / 2 - 6);
    ctx.lineTo(w / 2, h / 2 + 6);
    ctx.stroke();

    // 5. Draw First-Person Doom Shotgun
    this.drawShotgun(ctx, player);

    // 6. Update 36-ray Retinal Buffer for Sensory HUD
    for (let i = 0; i < 36; i++) {
      const colIdx = Math.floor((i / 36) * w);
      const depth = this.zBuffer[colIdx] || 10;
      this.retinalRays[i] = Math.max(0.05, Math.min(1.0, 1.0 - depth / 12.0));
    }
  }

  private drawBillboardSprite(
    ctx: CanvasRenderingContext2D,
    player: DoomPlayer,
    spriteX: number,
    spriteY: number,
    dist: number,
    type: 'DEMON' | 'ITEM',
    entity: DemonEntity | ItemEntity
  ) {
    const w = this.width;
    const h = this.height;

    // Sprite position relative to camera
    const relX = spriteX - player.x;
    const relY = spriteY - player.y;

    // Transform sprite with inverse camera matrix
    const invDet = 1.0 / (player.planeX * player.dirY - player.dirX * player.planeY);
    const transformX = invDet * (player.dirY * relX - player.dirX * relY);
    const transformY = invDet * (-player.planeY * relX + player.planeX * relY); // Depth in front of camera

    if (transformY <= 0.2) return; // Behind player

    const spriteScreenX = Math.floor((w / 2) * (1 + transformX / transformY));
    const spriteHeight = Math.abs(Math.floor(h / transformY));
    const spriteWidth = spriteHeight;

    const drawStartY = Math.max(0, -spriteHeight / 2 + h / 2);
    const drawEndY = Math.min(h - 1, spriteHeight / 2 + h / 2);
    const drawStartX = Math.max(0, -spriteWidth / 2 + spriteScreenX);
    const drawEndX = Math.min(w - 1, spriteWidth / 2 + spriteScreenX);

    // Only draw if within screen and closer than wall
    if (spriteScreenX >= -spriteWidth && spriteScreenX <= w + spriteWidth) {
      if (transformY < this.zBuffer[Math.max(0, Math.min(w - 1, spriteScreenX))]) {
        if (type === 'DEMON') {
          this.renderDemonSprite(ctx, spriteScreenX, drawStartY, spriteWidth, spriteHeight, entity as DemonEntity, transformY);
        } else {
          this.renderItemSprite(ctx, spriteScreenX, drawStartY, spriteWidth, spriteHeight, entity as ItemEntity);
        }
      }
    }
  }

  private renderDemonSprite(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    startY: number,
    width: number,
    height: number,
    demon: DemonEntity,
    depth: number
  ) {
    ctx.save();
    const cx = screenX;
    const cy = startY + height * 0.55;
    const sz = width * 0.45;

    // Hurt flash
    const isHurt = demon.hurtTimer > 0;
    const bodyColor = isHurt ? '#FFFFFF' : '#8A2A1A'; // Classic Doom Imp brown/red

    // Demon Torso & Head
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy, sz * 0.55, sz * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();

    // Horns
    ctx.fillStyle = isHurt ? '#FFFFFF' : '#22110E';
    ctx.beginPath();
    ctx.moveTo(cx - sz * 0.4, cy - sz * 0.6);
    ctx.lineTo(cx - sz * 0.65, cy - sz * 1.1);
    ctx.lineTo(cx - sz * 0.2, cy - sz * 0.75);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + sz * 0.4, cy - sz * 0.6);
    ctx.lineTo(cx + sz * 0.65, cy - sz * 1.1);
    ctx.lineTo(cx + sz * 0.2, cy - sz * 0.75);
    ctx.fill();

    // Glowing Red/Amber Demon Eyes
    ctx.fillStyle = '#FF1E56';
    ctx.shadowColor = '#FF1E56';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(cx - sz * 0.2, cy - sz * 0.35, Math.max(1.5, sz * 0.08), 0, Math.PI * 2);
    ctx.arc(cx + sz * 0.2, cy - sz * 0.35, Math.max(1.5, sz * 0.08), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Fangs / Mouth
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - sz * 0.15, cy - sz * 0.1, sz * 0.3, sz * 0.08);

    // Health bar overhead if damaged
    if (demon.health < demon.maxHealth) {
      const barW = sz * 1.2;
      const barH = 3;
      const barX = cx - barW / 2;
      const barY = cy - sz * 1.2;
      ctx.fillStyle = '#331111';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#FF1E56';
      ctx.fillRect(barX, barY, barW * (demon.health / demon.maxHealth), barH);
    }

    ctx.restore();
  }

  private renderItemSprite(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    startY: number,
    width: number,
    height: number,
    item: ItemEntity
  ) {
    ctx.save();
    const cx = screenX;
    const cy = startY + height * 0.65;
    const sz = width * 0.35;

    if (item.type === 'HEALTH') {
      // Stimpack (Green cross)
      ctx.fillStyle = '#00FF88';
      ctx.fillRect(cx - sz * 0.5, cy - sz * 0.2, sz, sz * 0.4);
      ctx.fillRect(cx - sz * 0.2, cy - sz * 0.5, sz * 0.4, sz);
    } else {
      // Ammo Box (Gold)
      ctx.fillStyle = '#FFB300';
      ctx.fillRect(cx - sz * 0.4, cy - sz * 0.3, sz * 0.8, sz * 0.6);
      ctx.fillStyle = '#000000';
      ctx.font = '8px monospace';
      ctx.fillText('AMMO', cx - sz * 0.3, cy);
    }
    ctx.restore();
  }

  private drawShotgun(ctx: CanvasRenderingContext2D, player: DoomPlayer) {
    const w = this.width;
    const h = this.height;
    const isFiring = player.shootAnimTimer > 0;

    const gunX = w / 2;
    const recoil = isFiring ? 12 : 0;
    const gunY = h - 10 + recoil;

    ctx.save();

    // Muzzle Flash explosion if firing!
    if (isFiring && player.shootAnimTimer > 0.08) {
      const flashSize = 36 + Math.random() * 12;
      const grad = ctx.createRadialGradient(gunX, gunY - 45, 4, gunX, gunY - 45, flashSize);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.3, '#FFB300');
      grad.addColorStop(0.7, '#FF1E56');
      grad.addColorStop(1, 'rgba(255, 30, 86, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gunX, gunY - 45, flashSize, 0, Math.PI * 2);
      ctx.fill();

      // Smoke puff
      ctx.fillStyle = 'rgba(200, 200, 200, 0.35)';
      ctx.beginPath();
      ctx.arc(gunX - 10, gunY - 55, 14, 0, Math.PI * 2);
      ctx.arc(gunX + 10, gunY - 55, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shotgun Double Barrel
    ctx.fillStyle = '#2A2A2A';
    ctx.fillRect(gunX - 14, gunY - 40, 12, 45);
    ctx.fillRect(gunX + 2, gunY - 40, 12, 45);

    // Barrel holes
    ctx.fillStyle = '#080808';
    ctx.beginPath();
    ctx.arc(gunX - 8, gunY - 40, 4.5, 0, Math.PI * 2);
    ctx.arc(gunX + 8, gunY - 40, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Wooden Forend Grip
    ctx.fillStyle = '#5A2E12';
    ctx.fillRect(gunX - 16, gunY - 15, 32, 25);

    // Metal Receiver
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(gunX - 10, gunY, 20, 20);

    ctx.restore();
  }
}
