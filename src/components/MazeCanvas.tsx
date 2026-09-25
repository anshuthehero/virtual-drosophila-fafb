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

      // Clear dark background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      // 1. Draw Maze Tiles
      const now = Date.now();
      const pulse = Math.sin(now * 0.005);

      for (let r = 0; r < MAZE_ROWS; r++) {
        for (let c = 0; c < MAZE_COLS; c++) {
          const tile = maze.getTile(c, r);
          const px = c * TILE_SIZE;
          const py = r * TILE_SIZE;

          if (tile === 'WALL') {
            // High-contrast clean neon walls
            ctx.fillStyle = '#0A0A0A';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#222222';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
          } else if (tile === 'PELLET') {
            // Sucrose dot
            ctx.fillStyle = '#00FF88';
            ctx.beginPath();
            ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 2.2, 0, Math.PI * 2);
            ctx.fill();
          } else if (tile === 'SUPER_PELLET') {
            // Pulsating Super Sucrose Gem
            const rSize = 4.5 + pulse * 1.5;
            ctx.fillStyle = '#FFB300';
            ctx.shadowColor = '#FFB300';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, rSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          } else if (tile === 'HEAT_TRAP') {
            // Hazard thermal stripes
            ctx.fillStyle = 'rgba(255, 30, 86, 0.15)';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = 'rgba(255, 30, 86, 0.4)';
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
          } else if (tile === 'GHOST_SPAWN') {
            ctx.fillStyle = '#0D0D0D';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          }
        }
      }

      // 2. Draw Decision Radar Trails at current fly tile
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
            ctx.strokeStyle = isChosen ? '#00FF88' : 'rgba(0, 229, 255, 0.35)';
            ctx.lineWidth = isChosen ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(fly.x, fly.y);
            ctx.lineTo(targetX, targetY);
            ctx.stroke();

            // Tip indicator
            ctx.fillStyle = isChosen ? '#00FF88' : '#00E5FF';
            ctx.beginPath();
            ctx.arc(targetX, targetY, isChosen ? 2.5 : 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 3. Draw Predators
      for (const p of predatorSystem.predators) {
        if (p.mode === 'EATEN') {
          // Floating eyes returning to base
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(p.x - 3, p.y, 2.5, 0, Math.PI * 2);
          ctx.arc(p.x + 3, p.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#00E5FF';
          ctx.beginPath();
          ctx.arc(p.x - 3, p.y, 1.2, 0, Math.PI * 2);
          ctx.arc(p.x + 3, p.y, 1.2, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }

        // Looming Hunter shadow cone
        if (p.type === 'RED_HUNTER' && p.mode === 'CHASE') {
          const shadowGrad = ctx.createRadialGradient(p.x, p.y, 5, p.x, p.y, p.loomingShadowRadius);
          shadowGrad.addColorStop(0, 'rgba(255, 30, 86, 0.35)');
          shadowGrad.addColorStop(0.7, 'rgba(255, 30, 86, 0.1)');
          shadowGrad.addColorStop(1, 'rgba(255, 30, 86, 0)');
          ctx.fillStyle = shadowGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.loomingShadowRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Ghost body
        ctx.save();
        ctx.translate(p.x, p.y);
        const ghostColor = p.mode === 'FLEE' ? (p.fleeTimer < 2 && (now % 200 < 100) ? '#FFFFFF' : '#00E5FF') : p.color;

        ctx.fillStyle = ghostColor;
        ctx.beginPath();
        ctx.arc(0, -2, 7.5, Math.PI, 0, false);
        ctx.lineTo(7.5, 6);
        // Wavy skirt
        ctx.lineTo(4, 3);
        ctx.lineTo(0, 6);
        ctx.lineTo(-4, 3);
        ctx.lineTo(-7.5, 6);
        ctx.closePath();
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#FFFFFF';
        let lookDx = 0, lookDy = 0;
        if (p.dir === 'LEFT') lookDx = -1.5;
        else if (p.dir === 'RIGHT') lookDx = 1.5;
        else if (p.dir === 'UP') lookDy = -1.5;
        else if (p.dir === 'DOWN') lookDy = 1.5;

        ctx.beginPath();
        ctx.arc(-2.8, -2.5, 2.2, 0, Math.PI * 2);
        ctx.arc(2.8, -2.5, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = p.mode === 'FLEE' ? '#FF1E56' : '#050505';
        ctx.beginPath();
        ctx.arc(-2.8 + lookDx, -2.5 + lookDy, 1.2, 0, Math.PI * 2);
        ctx.arc(2.8 + lookDx, -2.5 + lookDy, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 4. Draw Drosophila Connectome Avatar
      if (fly.isAlive) {
        ctx.save();
        ctx.translate(fly.x, fly.y);
        ctx.rotate(fly.headingRad);

        // Legs (6 legs in alternating tripod gait)
        const isStance1 = Math.sin(fly.tripodPhase) > 0;
        ctx.strokeStyle = '#9E8A78';
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
          const swing = l.stance ? 0 : 0.3;
          ctx.beginPath();
          ctx.moveTo(l.dx, l.dy * 0.5);
          ctx.lineTo(l.dx + Math.cos(l.angle + swing) * 7, l.dy + Math.sin(l.angle + swing) * 7);
          ctx.stroke();
        }

        // Wings
        ctx.fillStyle = isFrenzyActive ? 'rgba(0, 255, 136, 0.45)' : 'rgba(200, 230, 255, 0.3)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(-6, -4, 8, 3.2, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(-6, 4, 8, 3.2, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Abdomen
        ctx.fillStyle = '#8C5628';
        ctx.beginPath();
        ctx.ellipse(-4, 0, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Thorax
        ctx.fillStyle = '#593815';
        ctx.beginPath();
        ctx.ellipse(1, 0, 4.5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head with Brick-Red Compound Eyes
        ctx.fillStyle = '#3A1C08';
        ctx.beginPath();
        ctx.ellipse(5, 0, 3, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Red Ommatidia Eyes
        ctx.fillStyle = '#FF2222';
        ctx.beginPath();
        ctx.arc(5.5, -2.2, 1.8, 0, Math.PI * 2);
        ctx.arc(5.5, 2.2, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Proboscis extends when eating
        if (fly.isEating) {
          ctx.strokeStyle = '#00FF88';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(7, 0);
          ctx.lineTo(11, 0);
          ctx.stroke();
        }

        ctx.restore();
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
        className="max-w-full h-auto aspect-square block border border-[#1A1A1A] rounded-sm"
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
