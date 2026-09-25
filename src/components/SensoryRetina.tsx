import React, { useRef, useEffect } from 'react';
import { DecisionVector, Direction } from '../game/types';

interface SensoryRetinaProps {
  decision: DecisionVector | null;
  fearLevel: number;
  rewardLevel: number;
  isFrenzyActive: boolean;
}

export const SensoryRetina: React.FC<SensoryRetinaProps> = ({
  decision,
  fearLevel,
  rewardLevel,
  isFrenzyActive
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

    // 1. Draw 4-Corridor Visual Raycast Spectrum
    ctx.fillStyle = '#888888';
    ctx.font = '9px monospace';
    ctx.fillText('COMPOUND EYE CORRIDOR SIGHTLINES (OPTIC FLOW)', 12, 16);

    const dirs: Direction[] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
    const colW = (width - 24) / 4;
    const baseY = 55;

    dirs.forEach((d, idx) => {
      const opt = decision ? decision.options[d] : undefined;
      const x = 12 + idx * colW;
      const barH = 26;

      if (!opt || !opt.isValid) {
        // Blocked wall
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(x, baseY - barH, colW - 2, barH);
        ctx.fillStyle = '#444444';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('WALL', x + colW / 2, baseY - 10);
      } else {
        // Open corridor
        const threatVal = opt.fearPenalty;
        if (threatVal > 0.5) {
          ctx.fillStyle = '#FF1E56'; // Threat detected in corridor!
        } else if (opt.rewardValue > 1.0) {
          ctx.fillStyle = '#00FF88'; // Food detected!
        } else {
          ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
        }
        ctx.fillRect(x, baseY - barH, colW - 2, barH);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${d}`, x + colW / 2, baseY - 10);
      }
    });

    ctx.textAlign = 'left';

    // 2. Antennal Chemosensory Odor Bar
    const odorY = baseY + 28;
    ctx.fillStyle = '#888888';
    ctx.font = '9px monospace';
    ctx.fillText('ANTENNAL CHEMOSENSORY (SUCROSE ODOR):', 12, odorY);

    const barW = width - 24;
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(12, odorY + 5, barW, 8);

    ctx.fillStyle = '#00FF88';
    ctx.fillRect(12, odorY + 5, barW * Math.min(1.0, rewardLevel), 8);

    ctx.fillStyle = '#E5E5E5';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${(rewardLevel * 100).toFixed(0)}%`, width - 12, odorY);
    ctx.textAlign = 'left';

    // 3. Looming Threat (Lobula LPLC2) Sensor
    const threatY = odorY + 28;
    ctx.fillStyle = '#888888';
    ctx.font = '9px monospace';
    ctx.fillText('OPTIC LOOMING DETECTOR (LPLC2 PRE-ESCAPE):', 12, threatY);

    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(12, threatY + 5, barW, 8);

    ctx.fillStyle = isFrenzyActive ? '#00FF88' : fearLevel > 0.4 ? '#FF1E56' : '#FF8800';
    ctx.fillRect(12, threatY + 5, barW * Math.min(1.0, fearLevel), 8);

    ctx.fillStyle = '#E5E5E5';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(isFrenzyActive ? 'INVERTED (HUNT)' : `${(fearLevel * 100).toFixed(0)}%`, width - 12, threatY);
    ctx.textAlign = 'left';

    // 4. Sensor Flags
    const flagsY = threatY + 24;
    ctx.font = '9px monospace';
    ctx.fillStyle = fearLevel > 0.4 ? '#FF1E56' : '#333333';
    ctx.fillText(`[ ${fearLevel > 0.4 ? '●' : '○'} LOOMING THREAT ]`, 12, flagsY);

    ctx.fillStyle = rewardLevel > 0.3 ? '#00FF88' : '#333333';
    ctx.fillText(`[ ${rewardLevel > 0.3 ? '●' : '○'} SUCROSE ODOR ]`, width * 0.44, flagsY);

    ctx.fillStyle = isFrenzyActive ? '#FFB300' : '#333333';
    ctx.fillText(`[ ${isFrenzyActive ? '●' : '○'} DOPAMINE FRENZY ]`, width * 0.74, flagsY);

  }, [decision, fearLevel, rewardLevel, isFrenzyActive]);

  return (
    <div className="flex flex-col bg-[#000000] border border-[#262626] rounded-sm overflow-hidden h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#262626] bg-[#0A0A0A]">
        <span className="text-[10px] font-bold tracking-widest text-[#E5E5E5] uppercase">
          01 / SENSORY INPUT
        </span>
        <span className="text-[9px] text-[#00E5FF] font-mono tracking-wider">
          LIVE PIXELS (RETINA & ANTENNA)
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
