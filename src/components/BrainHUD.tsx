import React, { useRef, useEffect } from 'react';
import { RingAttractorState } from '../types/simulation';

interface BrainHUDProps {
  ringAttractorState: RingAttractorState;
  fearLevel: number;
  rewardLevel: number;
  giantFiberActive: boolean;
  isFrenzyActive: boolean;
}

export const BrainHUD: React.FC<BrainHUDProps> = ({
  ringAttractorState,
  fearLevel,
  rewardLevel,
  giantFiberActive,
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

    // Left side: 16-wedge Ellipsoid Body (EB) Ring Attractor Compass
    // Right side: Anatomical Fly Brain Neuropil Map with live neural firing pathways
    const ebCenterX = width * 0.28;
    const ebCenterY = height * 0.52;
    const ebOuterRadius = Math.min(width, height) * 0.34;
    const ebInnerRadius = ebOuterRadius * 0.52;

    // --- 1. DRAW ELLIPSOID BODY RING ATTRACTOR (COMPASS) ---
    ctx.fillStyle = '#888888';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CENTRAL COMPLEX: ELLIPSOID BODY (E-PG BUMP)', ebCenterX, 16);

    const wedges = ringAttractorState.wedges;
    const numWedges = wedges.length;
    const wedgeAngleSpan = (Math.PI * 2) / numWedges;

    for (let i = 0; i < numWedges; i++) {
      const w = wedges[i];
      const startAngle = w.angleRad - wedgeAngleSpan * 0.48;
      const endAngle = w.angleRad + wedgeAngleSpan * 0.48;

      ctx.beginPath();
      ctx.arc(ebCenterX, ebCenterY, ebOuterRadius, startAngle, endAngle);
      ctx.arc(ebCenterX, ebCenterY, ebInnerRadius, endAngle, startAngle, true);
      ctx.closePath();

      if (w.lesioned) {
        // Severed synapse wedge
        ctx.fillStyle = 'rgba(255, 30, 86, 0.2)';
        ctx.fill();
        ctx.strokeStyle = '#FF1E56';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Active heading bump wedge in Electric Cyan
        const alpha = Math.max(0.08, w.activity);
        ctx.fillStyle = `rgba(0, 229, 255, ${alpha})`;
        ctx.fill();

        ctx.strokeStyle = w.activity > 0.6 ? '#00E5FF' : '#222222';
        ctx.lineWidth = w.activity > 0.6 ? 1.5 : 0.8;
        ctx.stroke();
      }
    }

    // Center pointer for current internal heading bump vector
    const bumpAngle = ringAttractorState.bumpAngleRad;
    const pointerLen = ebInnerRadius * 0.82;
    const ptrX = ebCenterX + Math.cos(bumpAngle) * pointerLen;
    const ptrY = ebCenterY + Math.sin(bumpAngle) * pointerLen;

    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ebCenterX, ebCenterY);
    ctx.lineTo(ptrX, ptrY);
    ctx.stroke();

    ctx.fillStyle = '#00E5FF';
    ctx.beginPath();
    ctx.arc(ptrX, ptrY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Stability label
    ctx.fillStyle = ringAttractorState.stability < 0.4 ? '#FF1E56' : '#00E5FF';
    ctx.font = '8px monospace';
    ctx.fillText(
      `HEADING: ${((bumpAngle * 180) / Math.PI).toFixed(0)}° (COHERENCE: ${(ringAttractorState.stability * 100).toFixed(0)}%)`,
      ebCenterX,
      height - 8
    );

    // Vertical Divider
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width * 0.54, 10);
    ctx.lineTo(width * 0.54, height - 10);
    ctx.stroke();

    // --- 2. ANATOMICAL NEUROPIL SCHEMATIC & FEAR/REWARD CIRCUITS ---
    const brainX = width * 0.77;
    const brainY = height * 0.5;

    ctx.fillStyle = '#888888';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BRAIN NEUROPILS & CIRCUITS', brainX, 16);

    // Brain wireframe silhouette
    ctx.strokeStyle = '#2A2A2A';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(brainX, brainY, 36, 42, 0, 0, Math.PI * 2);
    ctx.ellipse(brainX - 44, brainY, 18, 30, -0.2, 0, Math.PI * 2);
    ctx.ellipse(brainX + 44, brainY, 18, 30, 0.2, 0, Math.PI * 2);
    ctx.stroke();

    // Circuit 1: FEAR / THREAT (Lobula Plate & Giant Fiber)
    // Turns on in VIVID CRIMSON (#FF1E56)
    const isFearActive = fearLevel > 0.35 || giantFiberActive;

    ctx.fillStyle = isFearActive
      ? `rgba(255, 30, 86, ${Math.max(0.3, fearLevel)})`
      : 'rgba(40, 20, 20, 0.4)';
    ctx.strokeStyle = isFearActive ? '#FF1E56' : '#442222';
    ctx.lineWidth = isFearActive ? 2 : 1;

    // Left & Right Lobula LPLC2
    ctx.beginPath();
    ctx.arc(brainX - 42, brainY, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(brainX + 42, brainY, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Giant Fiber axon descending through neck
    ctx.strokeStyle = giantFiberActive
      ? '#FF1E56'
      : isFearActive
      ? 'rgba(255, 30, 86, 0.6)'
      : '#332222';
    ctx.lineWidth = giantFiberActive ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(brainX, brainY - 10);
    ctx.lineTo(brainX, brainY + 50);
    ctx.stroke();

    // Circuit 2: FOOD / REWARD (Antennal Lobe & PAM Dopamine)
    // Turns on in VIBRANT EMERALD GREEN (#00FF88)
    const isRewardActive = rewardLevel > 0.25 || isFrenzyActive;

    ctx.fillStyle = isRewardActive
      ? `rgba(0, 255, 136, ${Math.max(0.3, rewardLevel)})`
      : 'rgba(10, 35, 20, 0.4)';
    ctx.strokeStyle = isRewardActive ? '#00FF88' : '#1A3F2A';
    ctx.lineWidth = isRewardActive ? 2 : 1;

    // Antennal Lobe glomeruli
    ctx.beginPath();
    ctx.arc(brainX, brainY - 26, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Mushroom Body / PAM Dopamine cluster
    ctx.beginPath();
    ctx.arc(brainX - 16, brainY - 10, 7, 0, Math.PI * 2);
    ctx.arc(brainX + 16, brainY - 10, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Legend
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    if (isFrenzyActive) {
      ctx.fillStyle = '#00FF88';
      ctx.fillText('⚡ DOPAMINE OVERDRIVE: HUNTING GHOSTS', brainX, height - 8);
    } else if (isFearActive) {
      ctx.fillStyle = '#FF1E56';
      ctx.fillText('🔴 FEAR CIRCUIT: LPLC2 → GIANT FIBER SPIKE', brainX, height - 8);
    } else if (isRewardActive) {
      ctx.fillStyle = '#00FF88';
      ctx.fillText('🟢 REWARD CIRCUIT: ALPN → PAM DOPAMINE', brainX, height - 8);
    } else {
      ctx.fillStyle = '#888888';
      ctx.fillText('🔵 NAVIGATION: CX RING ATTRACTOR ACTIVE', brainX, height - 8);
    }

  }, [ringAttractorState, fearLevel, rewardLevel, giantFiberActive, isFrenzyActive]);

  return (
    <div className="flex flex-col bg-[#000000] border border-[#262626] rounded-sm overflow-hidden h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#262626] bg-[#0A0A0A]">
        <span className="text-[10px] font-bold tracking-widest text-[#E5E5E5] uppercase">
          02 / NEURAL ACTIVITY
        </span>
        <span className="text-[9px] text-[#FF1E56] font-mono tracking-wider">
          {fearLevel > 0.4 ? 'FEAR ACTIVATED (CRIMSON)' : isFrenzyActive ? 'FRENZY OVERDRIVE' : 'NORMAL HOMEOSTASIS'}
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
