import React, { useRef, useEffect } from 'react';

interface SensoryRetinaProps {
  retinalRays: number[]; // 36-ommatidia scan from 3D raycaster
  fearLevel: number;
  rewardLevel: number;
}

export const SensoryRetina: React.FC<SensoryRetinaProps> = ({
  retinalRays,
  fearLevel,
  rewardLevel
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    // 1. Draw 36-Ommatidia Retinal Scan from 3D DOOM Scene
    ctx.fillStyle = '#888888';
    ctx.font = '9px monospace';
    ctx.fillText('COMPOUND EYE 3D DEPTH SCAN (36-RAY FOV)', 12, 16);

    const numRays = retinalRays.length || 36;
    const colW = (width - 24) / numRays;
    const baseY = 55;

    for (let i = 0; i < numRays; i++) {
      const depthVal = retinalRays[i] || 0.1;
      const x = 12 + i * colW;
      const barH = 26;

      // Color: if threat detected near center, highlight in crimson
      const isCenter = Math.abs(i - 18) <= 4;
      if (isCenter && fearLevel > 0.4) {
        ctx.fillStyle = '#FF1E56';
      } else {
        ctx.fillStyle = `rgba(0, 229, 255, ${Math.max(0.15, depthVal)})`;
      }

      ctx.fillRect(x, baseY - barH, colW - 1, barH);
    }

    // Tick labels
    ctx.fillStyle = '#444444';
    ctx.font = '8px monospace';
    ctx.fillText('-33° (L)', 12, baseY + 11);
    ctx.fillText('0° (CROSSHAIR)', width * 0.42, baseY + 11);
    ctx.fillText('+33° (R)', width - 42, baseY + 11);

    // 2. Looming Threat (Lobula LPLC2) Sensor
    const threatY = baseY + 28;
    ctx.fillStyle = '#888888';
    ctx.font = '9px monospace';
    ctx.fillText('OPTIC LOOMING THREAT (LOBULA LPLC2):', 12, threatY);

    const barW = width - 24;
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(12, threatY + 5, barW, 8);

    ctx.fillStyle = fearLevel > 0.4 ? '#FF1E56' : '#FF8800';
    ctx.fillRect(12, threatY + 5, barW * Math.min(1.0, fearLevel), 8);

    ctx.fillStyle = '#E5E5E5';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${(fearLevel * 100).toFixed(0)}%`, width - 12, threatY);
    ctx.textAlign = 'left';

    // 3. Reward / Supplies (PAM Dopamine)
    const rewardY = threatY + 28;
    ctx.fillStyle = '#888888';
    ctx.font = '9px monospace';
    ctx.fillText('SUPPLY DETECTION (HEALTH / AMMO VALENCE):', 12, rewardY);

    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(12, rewardY + 5, barW, 8);

    ctx.fillStyle = '#00FF88';
    ctx.fillRect(12, rewardY + 5, barW * Math.min(1.0, rewardLevel), 8);

    ctx.fillStyle = '#E5E5E5';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${(rewardLevel * 100).toFixed(0)}%`, width - 12, rewardY);
    ctx.textAlign = 'left';

    // 4. Status Indicators
    const flagsY = rewardY + 24;
    ctx.font = '9px monospace';
    ctx.fillStyle = fearLevel > 0.4 ? '#FF1E56' : '#333333';
    ctx.fillText(`[ ${fearLevel > 0.4 ? '●' : '○'} DEMON IN SIGHT ]`, 12, flagsY);

    ctx.fillStyle = rewardLevel > 0.2 ? '#00FF88' : '#333333';
    ctx.fillText(`[ ${rewardLevel > 0.2 ? '●' : '○'} SUPPLIES NEARBY ]`, width * 0.46, flagsY);

  }, [retinalRays, fearLevel, rewardLevel]);

  return (
    <div className="flex flex-col bg-[#000000] border border-[#262626] rounded-sm overflow-hidden h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#262626] bg-[#0A0A0A]">
        <span className="text-[10px] font-bold tracking-widest text-[#E5E5E5] uppercase">
          01 / SENSORY INPUT
        </span>
        <span className="text-[9px] text-[#00E5FF] font-mono tracking-wider">
          LIVE PIXELS (RETINA & CORRIDORS)
        </span>
      </div>

      <div className="p-2 flex-1 flex items-center justify-center bg-[#050505]">
        <canvas
          ref={canvasRef}
          width={460}
          height={160}
          className="w-full h-full max-h-[180px] block"
        />
      </div>
    </div>
  );
};
