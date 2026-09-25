import { DOOM_GRID, DOOM_MAP_HEIGHT, DOOM_MAP_WIDTH } from './doomMap';
import { DemonEntity, DoomPlayer, ItemEntity, RayHit } from './types';

const TEX_SIZE = 64;

export class DoomRaycaster {
  public width: number;
  public height: number;
  public zBuffer: Float32Array;
  public retinalRays: number[] = new Array(36).fill(0); // 36-ommatidia scan

  private imgData: ImageData | null = null;
  private screenBuf: Uint32Array | null = null;
  private textures: Uint32Array[] = [];

  constructor(width: number = 420, height: number = 280) {
    this.width = width;
    this.height = height;
    this.zBuffer = new Float32Array(width);
    this.initTextures();
  }

  /**
   * Pre-render authentic 64x64 procedural DOOM textures:
   * 1: UAC Tech Steel Wall with rivets & reinforcement
   * 2: Gothic Demon Brick with mortar & blood stains
   * 3: UAC Mainframe Computer Terminal with glowing radar/LEDs
   * 4: Industrial Hazard Warning Chevron Stripes
   */
  private initTextures() {
    this.textures = [];

    // Helper to pack RGBA into 32-bit uint (0xAABBGGRR)
    const packRGBA = (r: number, g: number, b: number, a: number = 255): number => {
      return ((a & 0xff) << 24) | ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff);
    };

    // 0: Empty / Fallback
    const tex0 = new Uint32Array(TEX_SIZE * TEX_SIZE);
    tex0.fill(packRGBA(20, 20, 20));
    this.textures.push(tex0);

    // 1: UAC Tech Steel Wall (Gunmetal steel plates with rivets and beveled seams)
    const tex1 = new Uint32Array(TEX_SIZE * TEX_SIZE);
    for (let y = 0; y < TEX_SIZE; y++) {
      for (let x = 0; x < TEX_SIZE; x++) {
        // Base gunmetal
        let r = 70 + ((x ^ y) % 5);
        let g = 75 + ((x * y) % 6);
        let b = 85 + (((x + y) * 7) % 8);

        // Dark bevel seam at edges
        if (x === 0 || x === 63 || y === 0 || y === 63) {
          r = 25; g = 28; b = 32;
        } else if (x === 1 || y === 1) {
          // Highlight rim
          r += 40; g += 40; b += 45;
        }

        // Horizontal steel crossbar at middle
        if (y >= 29 && y <= 34) {
          if (y === 29) { r += 35; g += 35; b += 40; }
          else if (y === 34) { r = 30; g = 32; b = 35; }
          else { r -= 15; g -= 15; b -= 15; }
        }

        // Heavy steel hex rivets in 4 corners
        const isRivet =
          (x >= 4 && x <= 6 && y >= 4 && y <= 6) ||
          (x >= 57 && x <= 59 && y >= 4 && y <= 6) ||
          (x >= 4 && x <= 6 && y >= 57 && y <= 59) ||
          (x >= 57 && x <= 59 && y >= 57 && y <= 59) ||
          (x >= 30 && x <= 33 && y >= 4 && y <= 6) ||
          (x >= 30 && x <= 33 && y >= 57 && y <= 59);

        if (isRivet) {
          r = 160; g = 170; b = 185; // Rivet metal gleam
        }

        tex1[y * TEX_SIZE + x] = packRGBA(r, g, b);
      }
    }
    this.textures.push(tex1);

    // 2: Gothic Demon Catacomb Brick (Dark red-brown mortared cobblestone with stains)
    const tex2 = new Uint32Array(TEX_SIZE * TEX_SIZE);
    for (let y = 0; y < TEX_SIZE; y++) {
      const row = Math.floor(y / 16);
      const isHorizontalMortar = y % 16 === 0 || y % 16 === 15;
      const xOffset = row % 2 === 0 ? 0 : 16;

      for (let x = 0; x < TEX_SIZE; x++) {
        const isVerticalMortar = (x + xOffset) % 32 === 0 || (x + xOffset) % 32 === 31;

        if (isHorizontalMortar || isVerticalMortar) {
          // Deep dark mortar
          tex2[y * TEX_SIZE + x] = packRGBA(22, 10, 8);
        } else {
          // Brick surface texture
          const grain = ((x * 13 + y * 29) % 25) - 12;
          let r = 115 + grain;
          let g = 38 + Math.floor(grain * 0.4);
          let b = 28 + Math.floor(grain * 0.3);

          // Top highlight on each stone
          if (y % 16 === 1 || (x + xOffset) % 32 === 1) {
            r += 35; g += 15; b += 10;
          }

          // Dark blood / soot grunge streaks
          if ((x * 7 + y * 11) % 43 < 6) {
            r = Math.floor(r * 0.65);
            g = Math.floor(g * 0.4);
            b = Math.floor(b * 0.4);
          }

          tex2[y * TEX_SIZE + x] = packRGBA(r, g, b);
        }
      }
    }
    this.textures.push(tex2);

    // 3: UAC Mainframe Computer Terminal (Slate chassis, glowing CRT screen & status LEDs)
    const tex3 = new Uint32Array(TEX_SIZE * TEX_SIZE);
    for (let y = 0; y < TEX_SIZE; y++) {
      for (let x = 0; x < TEX_SIZE; x++) {
        let r = 28, g = 36, b = 45; // Dark slate casing

        // Border frame
        if (x < 2 || x > 61 || y < 2 || y > 61) {
          r = 15; g = 18; b = 24;
        }
        // CRT Display Monitor (y: 6 to 26, x: 8 to 55)
        else if (y >= 6 && y <= 26 && x >= 8 && x <= 55) {
          if (x === 8 || x === 55 || y === 6 || y === 26) {
            r = 10; g = 14; b = 18; // Bezel
          } else {
            // Screen scanlines & radar graphics
            const isScanline = y % 2 === 0;
            const isRadarCircle = Math.abs(Math.hypot(x - 31, y - 16) - 7) < 1;
            const isRadarCross = (x === 31 || y === 16) && Math.hypot(x - 31, y - 16) < 9;

            if (isRadarCircle || isRadarCross) {
              r = 0; g = 255; b = 180; // Glowing radar trace
            } else if (isScanline) {
              r = 0; g = 70; b = 80;
            } else {
              r = 0; g = 45; b = 55; // CRT phosphor glow
            }
          }
        }
        // Control panel / Blinking LED arrays (y: 32 to 58)
        else if (y >= 32 && y <= 44) {
          // Rows of colored indicator LEDs
          const colIdx = Math.floor(x / 8);
          const isLed = (x % 8 >= 2 && x % 8 <= 4) && (y % 6 >= 2 && y % 6 <= 4);
          if (isLed) {
            if (colIdx % 3 === 0) { r = 255; g = 30; b = 60; } // Red LED
            else if (colIdx % 3 === 1) { r = 0; g = 255; b = 120; } // Green LED
            else { r = 255; g = 190; b = 0; } // Yellow LED
          } else {
            r = 20; g = 24; b = 30;
          }
        }
        // Ventilation grille slots (y: 48 to 58)
        else if (y >= 48 && y <= 58) {
          if (y % 3 === 0 && x >= 6 && x <= 57) {
            r = 10; g = 12; b = 15; // Dark vent slat
          } else {
            r = 38; g = 46; b = 58;
          }
        }

        tex3[y * TEX_SIZE + x] = packRGBA(r, g, b);
      }
    }
    this.textures.push(tex3);

    // 4: Industrial Hazard Warning Stripes (Diagonal yellow and black chevrons)
    const tex4 = new Uint32Array(TEX_SIZE * TEX_SIZE);
    for (let y = 0; y < TEX_SIZE; y++) {
      for (let x = 0; x < TEX_SIZE; x++) {
        // Steel borders top and bottom
        if (y < 6 || y > 57) {
          const isBolt = (x % 16 >= 7 && x % 16 <= 9) && ((y >= 2 && y <= 4) || (y >= 59 && y <= 61));
          if (isBolt) {
            tex4[y * TEX_SIZE + x] = packRGBA(200, 200, 210);
          } else {
            tex4[y * TEX_SIZE + x] = packRGBA(45, 48, 52);
          }
        } else {
          // Diagonal 45-degree yellow and black warning stripes
          const stripe = (x + y) % 18 < 9;
          if (stripe) {
            // Industrial Caution Gold
            tex4[y * TEX_SIZE + x] = packRGBA(230, 175, 15);
          } else {
            // Dark Carbon / Rubber
            tex4[y * TEX_SIZE + x] = packRGBA(25, 25, 28);
          }
        }
      }
    }
    this.textures.push(tex4);
  }

  public render(
    ctx: CanvasRenderingContext2D,
    player: DoomPlayer,
    demons: DemonEntity[],
    items: ItemEntity[]
  ) {
    const w = this.width;
    const h = this.height;

    // Initialize or retrieve fast 32-bit pixel buffer
    if (!this.imgData || this.imgData.width !== w || this.imgData.height !== h) {
      this.imgData = ctx.createImageData(w, h);
      this.screenBuf = new Uint32Array(this.imgData.data.buffer);
    }
    const buf = this.screenBuf!;

    // Muzzle flash intensity lighting calculation
    const flashIntensity = player.shootAnimTimer > 0 ? (player.shootAnimTimer / 0.22) * 1.6 : 0;
    const flashR = Math.floor(flashIntensity * 70);
    const flashG = Math.floor(flashIntensity * 35);
    const flashB = Math.floor(flashIntensity * 10);

    // 1. Render Floor & Ceiling with depth gradient and dynamic flash lighting
    const halfH = Math.floor(h / 2);
    for (let y = 0; y < halfH; y++) {
      // Ceiling gradient: dark industrial gunmetal fading to pitch black near horizon
      const cGrad = (halfH - y) / halfH;
      const cR = Math.min(255, Math.floor(18 * cGrad + 8 + flashR * 0.4));
      const cG = Math.min(255, Math.floor(20 * cGrad + 8 + flashG * 0.4));
      const cB = Math.min(255, Math.floor(26 * cGrad + 12 + flashB * 0.4));
      const cColor = (255 << 24) | (cB << 16) | (cG << 8) | cR;

      // Floor gradient: dark slate floor with distance darkening
      const fGrad = y / halfH;
      const fR = Math.min(255, Math.floor(28 * fGrad + 10 + flashR * 0.6));
      const fG = Math.min(255, Math.floor(24 * fGrad + 8 + flashG * 0.6));
      const fB = Math.min(255, Math.floor(24 * fGrad + 8 + flashB * 0.6));
      const fColor = (255 << 24) | (fB << 16) | (fG << 8) | fR;

      const topRow = y * w;
      const bottomRow = (h - 1 - y) * w;
      for (let x = 0; x < w; x++) {
        buf[topRow + x] = cColor;
        buf[bottomRow + x] = fColor;
      }
    }

    // 2. DDA Raycast for 3D Textured Walls
    for (let x = 0; x < w; x++) {
      // Camera space X (-1 to +1)
      const cameraX = (2 * x) / w - 1;
      const rayDirX = player.dirX + player.planeX * cameraX;
      const rayDirY = player.dirY + player.planeY * cameraX;

      let mapX = Math.floor(player.x);
      let mapY = Math.floor(player.y);

      const deltaDistX = Math.abs(1 / (rayDirX || 0.00001));
      const deltaDistY = Math.abs(1 / (rayDirY || 0.00001));

      let stepX = 0;
      let stepY = 0;
      let sideDistX = 0;
      let sideDistY = 0;
      let hit = 0;
      let side = 0; // 0 for vertical, 1 for horizontal

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

        if (mapX >= 0 && mapX < DOOM_MAP_WIDTH && mapY >= 0 && mapY < DOOM_MAP_HEIGHT) {
          if (DOOM_GRID[mapY][mapX] > 0) {
            hit = DOOM_GRID[mapY][mapX];
          }
        } else {
          hit = 1;
        }
      }

      // Perpendicular wall distance
      let perpWallDist = 0;
      if (side === 0) {
        perpWallDist = (mapX - player.x + (1 - stepX) / 2) / rayDirX;
      } else {
        perpWallDist = (mapY - player.y + (1 - stepY) / 2) / rayDirY;
      }
      perpWallDist = Math.max(0.05, perpWallDist);
      this.zBuffer[x] = perpWallDist;

      // Screen wall slice coordinates
      const lineHeight = Math.floor(h / perpWallDist);
      const drawStart = Math.max(0, Math.floor(-lineHeight / 2 + h / 2));
      const drawEnd = Math.min(h - 1, Math.floor(lineHeight / 2 + h / 2));

      // Calculate exact wall hit coordinate for texture mapping
      let wallX = 0;
      if (side === 0) {
        wallX = player.y + perpWallDist * rayDirY;
      } else {
        wallX = player.x + perpWallDist * rayDirX;
      }
      wallX -= Math.floor(wallX);

      // Texture coordinate X (0 to 63)
      let texX = Math.floor(wallX * TEX_SIZE);
      if ((side === 0 && rayDirX > 0) || (side === 1 && rayDirY < 0)) {
        texX = TEX_SIZE - texX - 1;
      }

      // Depth shading + side shadowing + dynamic muzzle flash lighting
      const depthFactor = Math.max(0.12, Math.min(1.0, 1.0 - perpWallDist / 13.0));
      const sideFactor = side === 1 ? 0.75 : 1.0;
      const lightFactor = depthFactor * sideFactor;

      // Select texture buffer
      const texIndex = hit >= 1 && hit <= 4 ? hit : 1;
      const texture = this.textures[texIndex];

      // Vertical step per screen pixel
      const step = TEX_SIZE / lineHeight;
      let texPos = (drawStart - h / 2 + lineHeight / 2) * step;

      for (let y = drawStart; y <= drawEnd; y++) {
        const texY = Math.min(TEX_SIZE - 1, Math.max(0, Math.floor(texPos)));
        texPos += step;

        const rawPixel = texture[texY * TEX_SIZE + texX];
        const rawR = rawPixel & 0xff;
        const rawG = (rawPixel >> 8) & 0xff;
        const rawB = (rawPixel >> 16) & 0xff;

        // Apply lighting and muzzle flash
        const outR = Math.min(255, Math.floor(rawR * lightFactor + flashR));
        const outG = Math.min(255, Math.floor(rawG * lightFactor + flashG));
        const outB = Math.min(255, Math.floor(rawB * lightFactor + flashB));

        buf[y * w + x] = (255 << 24) | (outB << 16) | (outG << 8) | outR;
      }
    }

    // 3. Blit the 3D scene onto canvas
    ctx.putImageData(this.imgData, 0, 0);

    // 4. Render 3D Sprites (Items & Demons) Sorted by Distance
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

    // 5. Draw Dynamic Center Crosshair with Hitmarkers
    this.drawCrosshair(ctx, player);

    // 6. Draw First-Person Doom Shotgun with Recoil & FX
    this.drawShotgun(ctx, player);

    // 7. Screen Effect Vignettes (Damage flash, pickup flash)
    this.drawScreenVignettes(ctx, player);

    // 8. Update 36-ray Retinal Buffer for Sensory HUD
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
    const transformY = invDet * (-player.planeY * relX + player.planeX * relY);

    if (transformY <= 0.25) return; // Behind player or too close

    const spriteScreenX = Math.floor((w / 2) * (1 + transformX / transformY));
    const spriteHeight = Math.abs(Math.floor(h / transformY));
    const spriteWidth = spriteHeight;

    const drawStartY = Math.max(0, -spriteHeight / 2 + h / 2);

    // Depth check against zBuffer at sprite center
    if (spriteScreenX >= -spriteWidth && spriteScreenX <= w + spriteWidth) {
      const centerCol = Math.max(0, Math.min(w - 1, spriteScreenX));
      if (transformY < this.zBuffer[centerCol] + 0.3) {
        if (type === 'DEMON') {
          this.renderDemonSprite(
            ctx,
            spriteScreenX,
            drawStartY,
            spriteWidth,
            spriteHeight,
            entity as DemonEntity,
            transformY
          );
        } else {
          this.renderItemSprite(
            ctx,
            spriteScreenX,
            drawStartY,
            spriteWidth,
            spriteHeight,
            entity as ItemEntity
          );
        }
      }
    }
  }

  /**
   * High-detail classic DOOM Imp / Demon Sprite
   * Features: Muscular chest, bone horns, fangs, glowing eyes, walk anim, hurt recoil, and fireballs
   */
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
    const cy = startY + height * 0.58;
    const sz = width * 0.48;

    // Walking animation sway
    const walkBob = Math.sin(demon.animFrame * 8) * (sz * 0.08);
    const isHurt = demon.hurtTimer > 0;
    const isAttacking = demon.state === 'ATTACK';

    // Depth shading on sprite
    const depthDim = Math.max(0.3, Math.min(1.0, 1.0 - depth / 14.0));

    // Demon Color Palette
    const baseColor = isHurt ? '#FFFFFF' : '#8A2A1A';
    const darkShade = isHurt ? '#FFAAAA' : '#4E140C';
    const muscleHighlight = isHurt ? '#FFFFFF' : '#A93B28';

    // 1. Back Spikes & Spine
    ctx.fillStyle = isHurt ? '#FFFFFF' : '#2A0D07';
    ctx.beginPath();
    ctx.moveTo(cx - sz * 0.45, cy - sz * 0.2);
    ctx.lineTo(cx - sz * 0.7, cy - sz * 0.5);
    ctx.lineTo(cx - sz * 0.3, cy - sz * 0.3);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + sz * 0.45, cy - sz * 0.2);
    ctx.lineTo(cx + sz * 0.7, cy - sz * 0.5);
    ctx.lineTo(cx + sz * 0.3, cy - sz * 0.3);
    ctx.fill();

    // 2. Muscular Torso & Abdomen
    ctx.fillStyle = darkShade;
    ctx.beginPath();
    ctx.ellipse(cx, cy + walkBob, sz * 0.52, sz * 0.68, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chest plates / Pectorals
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.ellipse(cx - sz * 0.18, cy - sz * 0.1 + walkBob, sz * 0.22, sz * 0.26, -0.15, 0, Math.PI * 2);
    ctx.ellipse(cx + sz * 0.18, cy - sz * 0.1 + walkBob, sz * 0.22, sz * 0.26, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Muscular Highlights
    ctx.fillStyle = muscleHighlight;
    ctx.beginPath();
    ctx.arc(cx - sz * 0.18, cy - sz * 0.14 + walkBob, sz * 0.12, 0, Math.PI * 2);
    ctx.arc(cx + sz * 0.18, cy - sz * 0.14 + walkBob, sz * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // 3. Demonic Head
    const headY = cy - sz * 0.65 + walkBob;
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.ellipse(cx, headY, sz * 0.38, sz * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Sweeping Bone Horns
    ctx.fillStyle = isHurt ? '#FFFFFF' : '#22110D';
    // Left horn
    ctx.beginPath();
    ctx.moveTo(cx - sz * 0.22, headY - sz * 0.15);
    ctx.quadraticCurveTo(cx - sz * 0.65, headY - sz * 0.75, cx - sz * 0.75, headY - sz * 0.95);
    ctx.quadraticCurveTo(cx - sz * 0.4, headY - sz * 0.55, cx - sz * 0.12, headY - sz * 0.35);
    ctx.fill();

    // Right horn
    ctx.beginPath();
    ctx.moveTo(cx + sz * 0.22, headY - sz * 0.15);
    ctx.quadraticCurveTo(cx + sz * 0.65, headY - sz * 0.75, cx + sz * 0.75, headY - sz * 0.95);
    ctx.quadraticCurveTo(cx + sz * 0.4, headY - sz * 0.55, cx + sz * 0.12, headY - sz * 0.35);
    ctx.fill();

    // 5. Piercing Glowing Eyes (Classic Doom Fire Eyes)
    ctx.fillStyle = '#FF0033';
    ctx.shadowColor = '#FF1E56';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx - sz * 0.16, headY - sz * 0.08, Math.max(2, sz * 0.07), 0, Math.PI * 2);
    ctx.arc(cx + sz * 0.16, headY - sz * 0.08, Math.max(2, sz * 0.07), 0, Math.PI * 2);
    ctx.fill();

    // Fiery eye pupil center
    ctx.fillStyle = '#FFFF55';
    ctx.beginPath();
    ctx.arc(cx - sz * 0.16, headY - sz * 0.08, Math.max(1, sz * 0.035), 0, Math.PI * 2);
    ctx.arc(cx + sz * 0.16, headY - sz * 0.08, Math.max(1, sz * 0.035), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 6. Snarling Maw / Jagged Teeth
    ctx.fillStyle = '#100302';
    ctx.beginPath();
    ctx.ellipse(cx, headY + sz * 0.2, sz * 0.22, sz * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sharp white fangs
    ctx.fillStyle = '#F5F5F0';
    for (let f = -2; f <= 2; f++) {
      ctx.beginPath();
      ctx.moveTo(cx + f * sz * 0.07, headY + sz * 0.13);
      ctx.lineTo(cx + f * sz * 0.07 + sz * 0.03, headY + sz * 0.25);
      ctx.lineTo(cx + f * sz * 0.07 - sz * 0.03, headY + sz * 0.25);
      ctx.fill();
    }

    // 7. Claws & Arms (With Fireball in hands if attacking!)
    if (isAttacking) {
      // Raised glowing fire claws
      ctx.fillStyle = '#FF5500';
      ctx.shadowColor = '#FF5500';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(cx - sz * 0.55, cy - sz * 0.2, sz * 0.16, 0, Math.PI * 2);
      ctx.arc(cx + sz * 0.55, cy - sz * 0.2, sz * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 8. Overhead Health Bar
    if (demon.health < demon.maxHealth) {
      const barW = Math.max(28, sz * 1.3);
      const barH = 4;
      const barX = cx - barW / 2;
      const barY = headY - sz * 0.85;

      // Dark border
      ctx.fillStyle = '#080808';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

      // Red health fill
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
    const sz = width * 0.38;

    if (item.type === 'HEALTH') {
      // Stimpack / Medikit (Metallic case with glowing bio-hazard green cross)
      ctx.fillStyle = '#E5E5E5';
      ctx.fillRect(cx - sz * 0.6, cy - sz * 0.45, sz * 1.2, sz * 0.9);

      ctx.fillStyle = '#00FF88';
      ctx.shadowColor = '#00FF88';
      ctx.shadowBlur = 8;
      // Cross
      ctx.fillRect(cx - sz * 0.45, cy - sz * 0.12, sz * 0.9, sz * 0.24);
      ctx.fillRect(cx - sz * 0.12, cy - sz * 0.4, sz * 0.24, sz * 0.8);
      ctx.shadowBlur = 0;
    } else {
      // Heavy 12-Gauge Ammo Box (Gold military crate with steel hinges)
      ctx.fillStyle = '#302610';
      ctx.fillRect(cx - sz * 0.6, cy - sz * 0.35, sz * 1.2, sz * 0.7);

      ctx.fillStyle = '#FFB300';
      ctx.fillRect(cx - sz * 0.55, cy - sz * 0.3, sz * 1.1, sz * 0.6);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('12-GA', cx, cy + sz * 0.1);
    }
    ctx.restore();
  }

  private drawCrosshair(ctx: CanvasRenderingContext2D, player: DoomPlayer) {
    const cx = this.width / 2;
    const cy = this.height / 2;

    ctx.save();
    // Default precision crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(cx - 7, cy);
    ctx.lineTo(cx - 2, cy);
    ctx.moveTo(cx + 2, cy);
    ctx.lineTo(cx + 7, cy);
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx, cy - 2);
    ctx.moveTo(cx, cy + 2);
    ctx.lineTo(cx, cy + 7);
    ctx.stroke();

    // Hitmarker ticks (flash bright red/white on impact)
    if (player.hitmarkerTimer && player.hitmarkerTimer > 0) {
      ctx.strokeStyle = '#FF1E56';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 6);
      ctx.lineTo(cx - 3, cy - 3);
      ctx.moveTo(cx + 3, cy - 3);
      ctx.lineTo(cx + 6, cy - 6);
      ctx.moveTo(cx - 6, cy + 6);
      ctx.lineTo(cx - 3, cy + 3);
      ctx.moveTo(cx + 3, cy + 3);
      ctx.lineTo(cx + 6, cy + 6);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Detailed First-Person DOOM Combat Shotgun:
   * Features: Dual blued steel barrels, ribbed sight bridge, walnut forend grip,
   * idle walk bob, shell ejection, and explosive multi-stage muzzle fireball!
   */
  private drawShotgun(ctx: CanvasRenderingContext2D, player: DoomPlayer) {
    const w = this.width;
    const h = this.height;
    const isFiring = player.shootAnimTimer > 0;

    // Weapon idle bobbing synchronized with walking
    const bobAngle = player.walkBob || 0;
    const bobX = Math.cos(bobAngle) * 3;
    const bobY = Math.abs(Math.sin(bobAngle)) * 4;

    const gunX = w / 2 + bobX;
    // Heavy recoil kickback
    const recoil = isFiring ? 16 : 0;
    const gunY = h - 6 + recoil + bobY;

    ctx.save();

    // 1. Muzzle Fireball Explosion (If firing)
    if (isFiring && player.shootAnimTimer > 0.06) {
      const flashSize = 44 + Math.random() * 16;
      const flashX = gunX;
      const flashY = gunY - 50;

      // Outer crimson flame
      const grad = ctx.createRadialGradient(flashX, flashY, 3, flashX, flashY, flashSize);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.2, '#FFE57F');
      grad.addColorStop(0.5, '#FF9100');
      grad.addColorStop(0.8, '#FF1E56');
      grad.addColorStop(1, 'rgba(255, 30, 86, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(flashX, flashY, flashSize, 0, Math.PI * 2);
      ctx.fill();

      // Gunpowder smoke cloud puffs
      ctx.fillStyle = 'rgba(200, 200, 200, 0.4)';
      ctx.beginPath();
      ctx.arc(flashX - 16, flashY - 14, 18, 0, Math.PI * 2);
      ctx.arc(flashX + 16, flashY - 14, 18, 0, Math.PI * 2);
      ctx.arc(flashX, flashY - 26, 22, 0, Math.PI * 2);
      ctx.fill();

      // Fiery ember spark particles
      ctx.fillStyle = '#FFFF77';
      for (let s = 0; s < 6; s++) {
        const sx = flashX + (Math.random() - 0.5) * 60;
        const sy = flashY - 10 - Math.random() * 40;
        ctx.fillRect(sx, sy, 2.5, 2.5);
      }
    }

    // 2. Double-Barrel Combat Shotgun Body
    // Left barrel
    const bGradL = ctx.createLinearGradient(gunX - 16, 0, gunX - 2, 0);
    bGradL.addColorStop(0, '#15181C');
    bGradL.addColorStop(0.4, '#4B535E'); // Top specular gleam
    bGradL.addColorStop(1, '#0C0E10');
    ctx.fillStyle = bGradL;
    ctx.fillRect(gunX - 16, gunY - 44, 14, 52);

    // Right barrel
    const bGradR = ctx.createLinearGradient(gunX + 2, 0, gunX + 16, 0);
    bGradR.addColorStop(0, '#15181C');
    bGradR.addColorStop(0.4, '#4B535E');
    bGradR.addColorStop(1, '#0C0E10');
    ctx.fillStyle = bGradR;
    ctx.fillRect(gunX + 2, gunY - 44, 14, 52);

    // Ribbed ventilation bridge between barrels
    ctx.fillStyle = '#22262C';
    ctx.fillRect(gunX - 2, gunY - 44, 4, 52);

    // Bore holes / Muzzles (Dark cavities at the tip)
    ctx.fillStyle = '#050505';
    ctx.beginPath();
    ctx.ellipse(gunX - 9, gunY - 44, 5.5, 3.5, 0, 0, Math.PI * 2);
    ctx.ellipse(gunX + 9, gunY - 44, 5.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Metallic muzzle rim
    ctx.strokeStyle = '#66707E';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 3. Ribbed Walnut Forend Grip
    const woodGrad = ctx.createLinearGradient(gunX - 20, 0, gunX + 20, 0);
    woodGrad.addColorStop(0, '#2D1407');
    woodGrad.addColorStop(0.5, '#5C2D12');
    woodGrad.addColorStop(1, '#2D1407');
    ctx.fillStyle = woodGrad;
    ctx.fillRect(gunX - 19, gunY - 12, 38, 28);

    // Forend grip knurling grooves
    ctx.strokeStyle = '#1E0E05';
    ctx.lineWidth = 1.5;
    for (let gy = gunY - 8; gy < gunY + 14; gy += 4) {
      ctx.beginPath();
      ctx.moveTo(gunX - 17, gy);
      ctx.lineTo(gunX + 17, gy);
      ctx.stroke();
    }

    // 4. Heavy Steel Receiver Frame
    ctx.fillStyle = '#1A1E24';
    ctx.fillRect(gunX - 12, gunY + 8, 24, 24);

    ctx.restore();
  }

  private drawScreenVignettes(ctx: CanvasRenderingContext2D, player: DoomPlayer) {
    const w = this.width;
    const h = this.height;

    // 1. Low Health Red Danger Vignette
    if (player.health < 35) {
      const pulse = 0.25 + Math.sin(Date.now() * 0.008) * 0.15;
      const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.8);
      grad.addColorStop(0, 'rgba(255, 0, 0, 0)');
      grad.addColorStop(1, `rgba(255, 20, 50, ${pulse})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Pickup Flash (Green for health, Gold for ammo)
    if (player.pickupFlashTimer && player.pickupFlashTimer > 0) {
      const alpha = Math.min(0.35, player.pickupFlashTimer);
      if (player.pickupFlash === 'HEALTH') {
        ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
      } else {
        ctx.fillStyle = `rgba(255, 179, 0, ${alpha})`;
      }
      ctx.fillRect(0, 0, w, h);
    }
  }
}
