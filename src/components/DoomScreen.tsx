import React, { useRef, useEffect } from 'react';
import { DemonEntity, DoomPlayer, ItemEntity } from '../doom/types';
import { DoomRaycaster } from '../doom/raycaster';

interface DoomScreenProps {
  raycaster: DoomRaycaster;
  player: DoomPlayer;
  demons: DemonEntity[];
  items: ItemEntity[];
  hurtFlash: boolean;
  isPaused: boolean;
  onTogglePlay: () => void;
  onShoot: () => void;
}

export const DoomScreen: React.FC<DoomScreenProps> = ({
  raycaster,
  player,
  demons,
  items,
  hurtFlash,
  isPaused,
  onTogglePlay,
  onShoot
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep a stable ref to latest props for 60 FPS animation loop without effect churn
  const stateRef = useRef({
    raycaster,
    player,
    demons,
    items,
    hurtFlash,
    isPaused
  });

  useEffect(() => {
    stateRef.current = {
      raycaster,
      player,
      demons,
      items,
      hurtFlash,
      isPaused
    };
  });

  // Main 3D Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const { raycaster: rc, player: p, demons: d, items: it, hurtFlash: hf, isPaused: paused } = stateRef.current;

      // 1. Render 3D Raycasting Scene
      rc.render(ctx, p, d, it);

      // 2. Red screen flash if player hurt
      if (hf) {
        ctx.fillStyle = 'rgba(255, 30, 86, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 3. Retro CRT Scanline Overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let y = 0; y < canvas.height; y += 4) {
        ctx.fillRect(0, y, canvas.width, 1.5);
      }

      // 4. Paused Screen Overlay
      if (paused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Retro Paused Box
        const bw = 240;
        const bh = 70;
        const bx = (canvas.width - bw) / 2;
        const by = (canvas.height - bh) / 2 - 10;

        ctx.fillStyle = '#080808';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#FFB300';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);

        ctx.fillStyle = '#FFB300';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⏸ SIMULATION STOPPED', canvas.width / 2, by + 28);

        ctx.fillStyle = '#CCCCCC';
        ctx.font = '10px monospace';
        ctx.fillText('PRESS [PLAY] OR "P" TO RESUME', canvas.width / 2, by + 48);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Animated Retro DOOM Cyber-Fly Face
  useEffect(() => {
    const faceCanvas = faceCanvasRef.current;
    if (!faceCanvas) return;
    const fctx = faceCanvas.getContext('2d');
    if (!fctx) return;

    let faceAnimId: number;

    const renderFace = () => {
      const p = stateRef.current.player;
      const fw = faceCanvas.width;
      const fh = faceCanvas.height;

      fctx.fillStyle = '#141414';
      fctx.fillRect(0, 0, fw, fh);

      const cx = fw / 2;
      const cy = fh / 2 + 1;

      // Look direction angle
      const lookOffset = Math.sin(Date.now() * 0.0018) * 3;
      const isDead = p.health <= 0;
      const isLowHealth = p.health < 35;
      const isFiring = p.shootAnimTimer > 0;

      // 1. Antennae
      fctx.strokeStyle = '#00FF88';
      fctx.lineWidth = 1.5;
      fctx.beginPath();
      fctx.moveTo(cx - 5, cy - 8);
      fctx.lineTo(cx - 10, cy - 16);
      fctx.moveTo(cx + 5, cy - 8);
      fctx.lineTo(cx + 10, cy - 16);
      fctx.stroke();

      // 2. Fly Head Shell (Chitin exoskeleton)
      fctx.fillStyle = isLowHealth ? '#3A2E1A' : '#1C3A27';
      fctx.beginPath();
      fctx.ellipse(cx, cy, 14, 12, 0, 0, Math.PI * 2);
      fctx.fill();

      // 3. Compound Ommatidia Eyes (Left & Right)
      const eyeColor = isDead
        ? '#333333'
        : isFiring
        ? '#FF1E56' // Fiery red grin when shooting!
        : isLowHealth
        ? '#FFB300'
        : '#00E5FF';

      fctx.fillStyle = eyeColor;
      // Left eye
      fctx.beginPath();
      fctx.ellipse(cx - 7 + (isFiring ? 0 : lookOffset * 0.4), cy - 2, 5.5, 7.5, -0.2, 0, Math.PI * 2);
      fctx.fill();

      // Right eye
      fctx.beginPath();
      fctx.ellipse(cx + 7 + (isFiring ? 0 : lookOffset * 0.4), cy - 2, 5.5, 7.5, 0.2, 0, Math.PI * 2);
      fctx.fill();

      // Eye pupil glare / facet dots
      if (!isDead) {
        fctx.fillStyle = '#FFFFFF';
        fctx.fillRect(cx - 8 + lookOffset * 0.4, cy - 4, 2, 2);
        fctx.fillRect(cx + 6 + lookOffset * 0.4, cy - 4, 2, 2);
      }

      // 4. Mouth / Proboscis
      if (isDead) {
        // X eyes and flat mouth
        fctx.strokeStyle = '#FF1E56';
        fctx.lineWidth = 1.5;
        fctx.strokeText('X', cx - 9, cy + 2);
        fctx.strokeText('X', cx + 4, cy + 2);
      } else if (isFiring) {
        // Wicked grin
        fctx.strokeStyle = '#FFFFFF';
        fctx.lineWidth = 1.5;
        fctx.beginPath();
        fctx.arc(cx, cy + 4, 5, 0.2, Math.PI - 0.2);
        fctx.stroke();
      } else {
        // Standard proboscis feeder tube
        fctx.fillStyle = '#0F2618';
        fctx.fillRect(cx - 2, cy + 3, 4, 6);
      }

      // 5. Blood drips if low health
      if (isLowHealth && !isDead) {
        fctx.fillStyle = '#FF1E56';
        fctx.fillRect(cx - 11, cy + 2, 2, 6);
        fctx.fillRect(cx + 9, cy, 2, 8);
      }

      faceAnimId = requestAnimationFrame(renderFace);
    };

    faceAnimId = requestAnimationFrame(renderFace);
    return () => cancelAnimationFrame(faceAnimId);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center bg-[#000000] border border-[#262626] rounded-sm overflow-hidden p-2 font-mono select-none">
      {/* 3D Raycaster Canvas */}
      <div
        onClick={onShoot}
        className="relative w-full aspect-[16/10] bg-black border border-[#333333] rounded-sm overflow-hidden cursor-crosshair group shadow-[0_0_30px_rgba(0,0,0,0.9)]"
      >
        <canvas
          ref={canvasRef}
          width={640}
          height={400}
          className="w-full h-full block"
        />

        {/* Quick Play/Pause Badge Overlay Top Right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePlay();
          }}
          className="absolute top-2 right-2 px-2.5 py-1 bg-[#0A0A0ACC] hover:bg-[#1A1A1A] border border-[#444444] hover:border-white text-xs font-bold rounded-sm flex items-center gap-1.5 backdrop-blur-sm transition-all z-20"
        >
          {isPaused ? (
            <>
              <span className="text-[#00FF88]">▶</span>
              <span className="text-[#00FF88]">PLAY</span>
            </>
          ) : (
            <>
              <span className="text-[#FFB300]">⏸</span>
              <span className="text-[#FFB300]">STOP</span>
            </>
          )}
        </button>

        {/* In-Game Classic DOOM Status Bar with Animated Cyber-Fly Face */}
        <div className="absolute bottom-0 inset-x-0 bg-[#0F0F12] border-t-2 border-[#333333] px-3 py-1.5 flex items-center justify-between text-[11px] font-bold z-10 select-none">
          {/* Health counter */}
          <div className="flex flex-col items-start min-w-[65px]">
            <span className="text-[9px] text-[#777777] tracking-wider">HEALTH</span>
            <span
              className={`text-base font-extrabold tracking-tight ${
                player.health > 50
                  ? 'text-[#00FF88]'
                  : player.health > 25
                  ? 'text-[#FFB300]'
                  : 'text-[#FF1E56] animate-pulse'
              }`}
            >
              {player.health}%
            </span>
          </div>

          {/* Ammo counter */}
          <div className="flex flex-col items-start min-w-[55px]">
            <span className="text-[9px] text-[#777777] tracking-wider">AMMO</span>
            <span
              className={`text-base font-extrabold tracking-tight ${
                player.ammo > 5 ? 'text-[#FFB300]' : 'text-[#FF1E56] animate-pulse'
              }`}
            >
              {player.ammo}
            </span>
          </div>

          {/* Center Animated Cyber-Fly Face */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border border-[#444444] rounded-sm overflow-hidden bg-[#111111] shadow-[inset_0_0_6px_rgba(0,0,0,0.9)]">
              <canvas ref={faceCanvasRef} width={40} height={40} className="w-full h-full block" />
            </div>
            <span className="text-[8px] text-[#666666] mt-0.5">FLY-GUY</span>
          </div>

          {/* Frags / Demons Killed */}
          <div className="flex flex-col items-start min-w-[55px]">
            <span className="text-[9px] text-[#777777] tracking-wider">FRAGS</span>
            <span className="text-base font-extrabold text-[#00E5FF] tracking-tight">
              {player.frags}
            </span>
          </div>

          {/* Weapon / Armed Status */}
          <div className="flex flex-col items-end min-w-[65px]">
            <span className="text-[9px] text-[#777777] tracking-wider">ARMED</span>
            <span className="text-xs text-white tracking-wider">12-GA</span>
          </div>
        </div>
      </div>
    </div>
  );
};
