import React, { useRef, useEffect } from 'react';
import { FlyActor } from '../game/flyActor';
import { MAZE_COLS, MAZE_ROWS, MazeMap, TILE_SIZE } from '../game/mazeMap';
import { PredatorSystem } from '../game/predatorAI';
import { DecisionVector, Direction } from '../game/types';

interface MazeCanvasProps {
  maze: MazeMap;
  fly: FlyActor;
  predatorSystem: PredatorSystem;
  decisionVector: DecisionVector | null;
  isFrenzyActive: boolean;
  onManualInput?: (dir: Direction) => void;
}

export const MazeCanvas: React.FC<MazeCanvasProps> = ({
  maze,
  fly,
  predatorSystem,
  decisionVector,
  isFrenzyActive,
  onManualInput
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // 1. Pure Pitch Black Background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      const now = Date.now();
      const pulse = Math.sin(now * 0.006);

      // 2. Render Full Retro Black & White Maze Walls and Tiles
      for (let r = 0; r < MAZE_ROWS; r++) {
        for (let c = 0; c < MAZE_COLS; c++) {
          const tile = maze.getTile(c, r);
          const px = c * TILE_SIZE;
          const py = r * TILE_SIZE;

          if (tile === 'WALL') {
            // Stark Monochrome Vector Walls: Black fill with crisp white perimeter
            ctx.fillStyle = '#000000';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);

            // Subtle inner inset line for retro vector arcade feel
            ctx.strokeStyle = '#333333';
            ctx.strokeRect(px + 3.5, py + 3.5, TILE_SIZE - 7, TILE_SIZE - 7);
          } else if (tile === 'PELLET') {
            // Crisp White Sucrose Pellet
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(px + TILE_SIZE / 2 - 1, py + TILE_SIZE / 2 - 1, 2.5, 2.5);
          } else if (tile === 'SUPER_PELLET') {
            // Pulsating Retro White Diamond Gem
            const sz = 4.5 + pulse * 1.5;
            ctx.save();
            ctx.translate(px + TILE_SIZE / 2, py + TILE_SIZE / 2);
            ctx.rotate(now * 0.002);
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.moveTo(0, -sz);
            ctx.lineTo(sz, 0);
            ctx.lineTo(0, sz);
            ctx.lineTo(-sz, 0);
            ctx.closePath();
            ctx.fill();

            // White glint lines
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-sz * 1.4, 0);
            ctx.lineTo(sz * 1.4, 0);
            ctx.moveTo(0, -sz * 1.4);
            ctx.lineTo(0, sz * 1.4);
            ctx.stroke();
            ctx.restore();
          } else if (tile === 'HEAT_TRAP') {
            // Retro Black & White Diagonal Warning Hazard Stripes
            ctx.save();
            ctx.beginPath();
            ctx.rect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.clip();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            const stripeSpacing = 6;
            for (let i = -TILE_SIZE; i < TILE_SIZE * 2; i += stripeSpacing) {
              ctx.beginPath();
              ctx.moveTo(px + i, py);
              ctx.lineTo(px + i + TILE_SIZE, py + TILE_SIZE);
              ctx.stroke();
            }
            ctx.restore();
          } else if (tile === 'GHOST_SPAWN') {
            ctx.fillStyle = '#050505';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          }
        }
      }

      // 3. Draw Decision Vector at Fly Position (Monochrome Radar Lines)
      if (decisionVector && decisionVector.options) {
        for (const d of ['UP', 'DOWN', 'LEFT', 'RIGHT'] as Direction[]) {
          const opt = decisionVector.options[d];
          if (opt && opt.isValid) {
            let targetX = fly.x;
            let targetY = fly.y;
            const dist = 18;
            if (d === 'UP') targetY -= dist;
            else if (d === 'DOWN') targetY += dist;
            else if (d === 'LEFT') targetX -= dist;
            else if (d === 'RIGHT') targetX += dist;

            const isChosen = d === decisionVector.chosenDir;
            ctx.strokeStyle = isChosen ? '#FFFFFF' : '#444444';
            ctx.lineWidth = isChosen ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(fly.x, fly.y);
            ctx.lineTo(targetX, targetY);
            ctx.stroke();

            // Arrow tip
            ctx.fillStyle = isChosen ? '#FFFFFF' : '#666666';
            ctx.beginPath();
            ctx.arc(targetX, targetY, isChosen ? 2.5 : 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 4. Draw Predators in Full Retro Black & White
      for (const p of predatorSystem.predators) {
        if (p.mode === 'EATEN') {
          // Floating white eyes returning to base
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(p.x - 3, p.y, 2.5, 0, Math.PI * 2);
          ctx.arc(p.x + 3, p.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(p.x - 3, p.y, 1.2, 0, Math.PI * 2);
          ctx.arc(p.x + 3, p.y, 1.2, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }

        // Looming threat circle (Monochrome dashed warning ring)
        if (p.type === 'RED_HUNTER' && p.mode === 'CHASE') {
          ctx.strokeStyle = '#FFFFFF';
          ctx.setLineDash([3, 3]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.loomingShadowRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Predator Vector Silhouette
        ctx.save();
        ctx.translate(p.x, p.y);

        if (p.mode === 'FLEE') {
          // In Frenzy / Flee mode: Hatched wireframe ghost that flashes
          const flash = Math.floor(now / 150) % 2 === 0;
          ctx.fillStyle = flash ? '#FFFFFF' : '#000000';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(0, -2, 7.5, Math.PI, 0, false);
          ctx.lineTo(7.5, 6);
          ctx.lineTo(4, 3);
          ctx.lineTo(0, 6);
          ctx.lineTo(-4, 3);
          ctx.lineTo(-7.5, 6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // X eyes
          ctx.strokeStyle = flash ? '#000000' : '#FFFFFF';
          ctx.lineWidth = 1;
          ctx.strokeText('× ×', -6, 2);
        } else {
          // Solid White Vector Body
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(0, -2, 7.5, Math.PI, 0, false);
          ctx.lineTo(7.5, 6);
          ctx.lineTo(4, 3);
          ctx.lineTo(0, 6);
          ctx.lineTo(-4, 3);
          ctx.lineTo(-7.5, 6);
          ctx.closePath();
          ctx.fill();

          // Black eye cutouts
          let lookDx = 0, lookDy = 0;
          if (p.dir === 'LEFT') lookDx = -1.5;
          else if (p.dir === 'RIGHT') lookDx = 1.5;
          else if (p.dir === 'UP') lookDy = -1.5;
          else if (p.dir === 'DOWN') lookDy = 1.5;

          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(-2.8 + lookDx, -2.5 + lookDy, 1.8, 0, Math.PI * 2);
          ctx.arc(2.8 + lookDx, -2.5 + lookDy, 1.8, 0, Math.PI * 2);
          ctx.fill();

          // Unique Retro Monochrome Insignia on Forehead
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          if (p.type === 'RED_HUNTER') {
            // Crosshair (+)
            ctx.beginPath();
            ctx.moveTo(0, -6);
            ctx.lineTo(0, -2);
            ctx.moveTo(-2, -4);
            ctx.lineTo(2, -4);
            ctx.stroke();
          } else if (p.type === 'CYAN_AMBUSH') {
            // Inverted triangle (▼)
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.moveTo(-2.5, -5.5);
            ctx.lineTo(2.5, -5.5);
            ctx.lineTo(0, -2.5);
            ctx.fill();
          } else if (p.type === 'PURPLE_STALKER') {
            // Crown dots
            ctx.fillStyle = '#000000';
            ctx.fillRect(-3, -5.5, 1.5, 1.5);
            ctx.fillRect(-0.7, -6.5, 1.5, 1.5);
            ctx.fillRect(1.5, -5.5, 1.5, 1.5);
          } else if (p.type === 'ORANGE_PATROL') {
            // Target dot
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(0, -4, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.restore();
      }

      // 5. Draw the Drosophila Avatar in Full Retro Monochrome
      if (fly.isAlive) {
        ctx.save();
        ctx.translate(fly.x, fly.y);
        ctx.rotate(fly.headingRad);

        // Articulated legs (White vector lines)
        const isStance1 = Math.sin(fly.tripodPhase) > 0;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.2;

        const legOffsets = [
          { dx: 3, dy: -5, angle: -0.6, stance: isStance1 },
          { dx: 0, dy: -6, angle: -1.2, stance: !isStance1 },
          { dx: -4, dy: -5, angle: -2.0, stance: isStance1 },
          { dx: 3, dy: 5, angle: 0.6, stance: !isStance1 },
          { dx: 0, dy: 6, angle: 1.2, stance: isStance1 },
          { dx: -4, dy: 5, angle: 2.0, stance: !isStance1 }
        ];

        for (const l of legOffsets) {
          const swing = l.stance ? 0 : 0.35;
          ctx.beginPath();
          ctx.moveTo(l.dx, l.dy * 0.5);
          ctx.lineTo(l.dx + Math.cos(l.angle + swing) * 7.5, l.dy + Math.sin(l.angle + swing) * 7.5);
          ctx.stroke();
        }

        // Translucent White Wings with Edge Wireframe
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(-6, -4, 8, 3.2, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(-6, 4, 8, 3.2, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Abdomen (White outline, black interior with white tergite lines)
        ctx.fillStyle = '#000000';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(-4, 0, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Abdominal stripes
        for (let s = -8; s <= -1; s += 2.5) {
          ctx.beginPath();
          ctx.moveTo(s, -3);
          ctx.lineTo(s, 3);
          ctx.stroke();
        }

        // Thorax (Solid White)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(1, 0, 4.5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head (Black with White Eyes and White Antennae)
        ctx.fillStyle = '#000000';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(5, 0, 3, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // White Ommatidia Eyes
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(5.5, -2.2, 1.8, 0, Math.PI * 2);
        ctx.arc(5.5, 2.2, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Black pupils
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(5.8, -2.2, 0.8, 0, Math.PI * 2);
        ctx.arc(5.8, 2.2, 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Proboscis extends when eating (White vector line)
        if (fly.isEating) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(7, 0);
          ctx.lineTo(11, 0);
          ctx.stroke();
        }

        ctx.restore();
      }

      // 6. Retro CRT Scanline Overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.5);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [maze, fly, predatorSystem, decisionVector, isFrenzyActive]);

  return (
    <div className="relative flex flex-col items-center justify-center bg-[#000000] border border-[#262626] rounded-sm overflow-hidden p-2">
      <canvas
        ref={canvasRef}
        width={MAZE_COLS * TILE_SIZE}
        height={MAZE_ROWS * TILE_SIZE}
        className="max-w-full h-auto aspect-square block border border-[#333333] rounded-sm shadow-[0_0_15px_rgba(255,255,255,0.05)]"
      />

      {/* Mobile Virtual D-Pad (Touch / Clickable) */}
      <div className="mt-3 flex sm:hidden flex-col items-center gap-1 z-10">
        <button
          onClick={() => onManualInput && onManualInput('UP')}
          className="w-12 h-10 bg-[#111111] active:bg-[#222222] border border-[#333333] text-white rounded-sm font-bold text-sm"
        >
          ▲
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => onManualInput && onManualInput('LEFT')}
            className="w-12 h-10 bg-[#111111] active:bg-[#222222] border border-[#333333] text-white rounded-sm font-bold text-sm"
          >
            ◀
          </button>
          <button
            onClick={() => onManualInput && onManualInput('DOWN')}
            className="w-12 h-10 bg-[#111111] active:bg-[#222222] border border-[#333333] text-white rounded-sm font-bold text-sm"
          >
            ▼
          </button>
          <button
            onClick={() => onManualInput && onManualInput('RIGHT')}
            className="w-12 h-10 bg-[#111111] active:bg-[#222222] border border-[#333333] text-white rounded-sm font-bold text-sm"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
};
