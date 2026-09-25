import React, { useRef, useEffect } from 'react';
import { DemonEntity, DoomPlayer, ItemEntity } from '../doom/types';
import { DoomRaycaster } from '../doom/raycaster';

interface DoomScreenProps {
  raycaster: DoomRaycaster;
  player: DoomPlayer;
  demons: DemonEntity[];
  items: ItemEntity[];
  hurtFlash: boolean;
}

export const DoomScreen: React.FC<DoomScreenProps> = ({
  raycaster,
  player,
  demons,
  items,
  hurtFlash
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      // 1. Render 3D Raycasting Scene
      raycaster.render(ctx, player, demons, items);

      // 2. Red screen flash if player hurt
      if (hurtFlash) {
        ctx.fillStyle = 'rgba(255, 30, 86, 0.35)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 3. Retro CRT Scanline Overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      for (let y = 0; y < canvas.height; y += 4) {
        ctx.fillRect(0, y, canvas.width, 1.5);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [raycaster, player, demons, items, hurtFlash]);

  return (
    <div className="relative flex flex-col items-center justify-center bg-[#000000] border border-[#262626] rounded-sm overflow-hidden p-2 font-mono">
      {/* 3D Raycaster Canvas */}
      <div className="relative w-full aspect-[4/3] max-w-[560px] bg-black border border-[#333333] rounded-sm overflow-hidden">
        <canvas
          ref={canvasRef}
          width={420}
          height={280}
          className="w-full h-full block"
        />

        {/* In-Game Classic DOOM Status Bar */}
        <div className="absolute bottom-0 inset-x-0 bg-[#0A0A0A] border-t border-[#333333] px-3 py-1.5 flex items-center justify-between text-[11px] font-bold z-10">
          <div className="flex items-center gap-1.5">
            <span className="text-[#888888]">HEALTH:</span>
            <span
              className={
                player.health > 50
                  ? 'text-[#00FF88]'
                  : player.health > 25
                  ? 'text-[#FFB300]'
                  : 'text-[#FF1E56] animate-pulse'
              }
            >
              {player.health}%
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#888888]">AMMO:</span>
            <span className={player.ammo > 5 ? 'text-[#FFB300]' : 'text-[#FF1E56] animate-pulse'}>
              {player.ammo}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#888888]">FRAGS:</span>
            <span className="text-[#00E5FF]">{player.frags}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[9px] text-[#666666]">
            <span>WEAPON:</span>
            <span className="text-white">SHOTGUN</span>
          </div>
        </div>
      </div>
    </div>
  );
};
