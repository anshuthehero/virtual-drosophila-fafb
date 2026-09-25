import React, { useRef, useEffect } from 'react';
import { ArenaPhysics } from '../simulation/arenaPhysics';
import { BehavioralState, FlyKinematics, TrailPoint } from '../types/simulation';

interface ArenaViewProps {
  arena: ArenaPhysics;
  flyKinematics: FlyKinematics;
  behavioralState: BehavioralState;
  trailPoints: TrailPoint[];
  showTrail: boolean;
  onAddSucrose: (x: number, y: number) => void;
  onTriggerShadow: (x?: number, y?: number) => void;
  onClearArena: () => void;
  onResetFly: () => void;
}

export const ArenaView: React.FC<ArenaViewProps> = ({
  arena,
  flyKinematics,
  behavioralState,
  trailPoints,
  showTrail,
  onAddSucrose,
  onTriggerShadow,
  onClearArena,
  onResetFly
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.44;

      // 1. Clear background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      // Subtle millimeter grid inside arena
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      // Petri dish floor
      ctx.fillStyle = '#0A0A0A';
      ctx.fill();

      // Grid lines
      ctx.strokeStyle = '#141414';
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = cx - radius; x <= cx + radius; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, cy - radius);
        ctx.lineTo(x, cy + radius);
        ctx.stroke();
      }
      for (let y = cy - radius; y <= cy + radius; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(cx - radius, y);
        ctx.lineTo(cx + radius, y);
        ctx.stroke();
      }

      // Heat hazard zones
      for (const zone of arena.heatZones) {
        const grad = ctx.createRadialGradient(zone.x, zone.y, 5, zone.x, zone.y, zone.radius);
        grad.addColorStop(0, 'rgba(255, 30, 86, 0.45)');
        grad.addColorStop(0.7, 'rgba(255, 75, 43, 0.15)');
        grad.addColorStop(1, 'rgba(255, 30, 86, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 30, 86, 0.5)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Sucrose drops & odor plumes
      for (const drop of arena.sucroseDrops) {
        // Diffusing odor gradient
        const odorRadius = drop.radius * 4.5;
        const odorGrad = ctx.createRadialGradient(drop.x, drop.y, drop.radius, drop.x, drop.y, odorRadius);
        odorGrad.addColorStop(0, 'rgba(0, 255, 136, 0.22)');
        odorGrad.addColorStop(0.6, 'rgba(0, 255, 136, 0.06)');
        odorGrad.addColorStop(1, 'rgba(0, 255, 136, 0)');
        ctx.fillStyle = odorGrad;
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, odorRadius, 0, Math.PI * 2);
        ctx.fill();

        // Sucrose droplet core
        const dropGrad = ctx.createRadialGradient(drop.x - 3, drop.y - 3, 2, drop.x, drop.y, drop.radius);
        dropGrad.addColorStop(0, '#FFFFFF');
        dropGrad.addColorStop(0.3, '#00FF88');
        dropGrad.addColorStop(1, '#057A44');
        ctx.fillStyle = dropGrad;
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, drop.radius * (drop.amount / 100), 0, Math.PI * 2);
        ctx.fill();

        // Droplet outline & label
        ctx.strokeStyle = '#00FF88';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 255, 136, 0.8)';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`SUCROSE ${Math.round(drop.amount)}%`, drop.x, drop.y + drop.radius + 12);
      }

      // Breadcrumb trail
      if (showTrail && trailPoints.length > 1) {
        for (let i = 1; i < trailPoints.length; i++) {
          const p1 = trailPoints[i - 1];
          const p2 = trailPoints[i];
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);

          // Color coded by behavioral state at that time
          if (p2.state === 'FLEEING') ctx.strokeStyle = 'rgba(255, 30, 86, 0.7)';
          else if (p2.state === 'FEEDING') ctx.strokeStyle = 'rgba(0, 255, 136, 0.7)';
          else if (p2.state === 'LIMPING') ctx.strokeStyle = 'rgba(255, 179, 0, 0.6)';
          else if (p2.state === 'DISORIENTED') ctx.strokeStyle = 'rgba(224, 64, 251, 0.7)';
          else ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';

          ctx.lineWidth = p2.state === 'FLEEING' ? 2 : 1.2;
          ctx.stroke();
        }
      }

      // Looming predator shadow
      if (arena.predatorShadow.active && arena.predatorShadow.opacity > 0.05) {
        const shadow = arena.predatorShadow;
        const sGrad = ctx.createRadialGradient(
          shadow.x,
          shadow.y,
          shadow.currentRadius * 0.1,
          shadow.x,
          shadow.y,
          shadow.currentRadius
        );
        sGrad.addColorStop(0, `rgba(10, 0, 0, ${shadow.opacity * 0.95})`);
        sGrad.addColorStop(0.7, `rgba(40, 5, 15, ${shadow.opacity * 0.6})`);
        sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = sGrad;
        ctx.beginPath();
        ctx.arc(shadow.x, shadow.y, shadow.currentRadius, 0, Math.PI * 2);
        ctx.fill();

        // Looming threat ring indicator
        ctx.strokeStyle = `rgba(255, 30, 86, ${shadow.opacity * 0.8})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(shadow.x, shadow.y, shadow.currentRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 30, 86, ${shadow.opacity})`;
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`▲ LOOMING SHADOW`, shadow.x, shadow.y - shadow.currentRadius - 6);
      }

      // 2. Draw the Articulated Drosophila melanogaster
      drawFly(ctx, flyKinematics, behavioralState);

      ctx.restore(); // Restore clip

      // Arena boundary ring & scale marks
      ctx.strokeStyle = '#404040';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Tick marks on perimeter
      for (let deg = 0; deg < 360; deg += 15) {
        const rad = (deg * Math.PI) / 180;
        const isMajor = deg % 45 === 0;
        const tickLen = isMajor ? 8 : 4;
        const x1 = cx + Math.cos(rad) * radius;
        const y1 = cy + Math.sin(rad) * radius;
        const x2 = cx + Math.cos(rad) * (radius - tickLen);
        const y2 = cy + Math.sin(rad) * (radius - tickLen);

        ctx.strokeStyle = isMajor ? '#888888' : '#333333';
        ctx.lineWidth = isMajor ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [arena, flyKinematics, behavioralState, trailPoints, showTrail]);

  // Helper to draw realistic articulated fruit fly
  const drawFly = (
    ctx: CanvasRenderingContext2D,
    fly: FlyKinematics,
    state: BehavioralState
  ) => {
    ctx.save();
    ctx.translate(fly.x, fly.y);
    ctx.rotate(fly.headingRad);

    const isFleeing = state === 'FLEEING';
    const isFeeding = state === 'FEEDING';

    // 1. Articulated Legs (6 legs in alternating tripod gait)
    for (const legKey of Object.keys(fly.legs) as (keyof typeof fly.legs)[]) {
      const leg = fly.legs[legKey];

      // Convert world tip back to local for drawing relative to fly
      const cosH = Math.cos(-fly.headingRad);
      const sinH = Math.sin(-fly.headingRad);
      const relTipX = (leg.tipX - fly.x) * cosH - (leg.tipY - fly.y) * sinH;
      const relTipY = (leg.tipX - fly.x) * sinH + (leg.tipY - fly.y) * cosH;

      const relBaseX = (leg.baseX - fly.x) * cosH - (leg.baseY - fly.y) * sinH;
      const relBaseY = (leg.baseX - fly.x) * sinH + (leg.baseY - fly.y) * cosH;

      // Leg color: if damaged (paresis), highlight in warning red-amber
      if (leg.isParesis) {
        ctx.strokeStyle = '#FF5500';
        ctx.lineWidth = 1.8;
      } else {
        ctx.strokeStyle = leg.isStance ? '#9E8A78' : '#68594C';
        ctx.lineWidth = 1.4;
      }

      ctx.beginPath();
      ctx.moveTo(relBaseX, relBaseY);

      // Mid joint (Femur-Tibia knee)
      const midX = (relBaseX + relTipX) * 0.5 + (leg.id.startsWith('L') ? -2 : 2);
      const midY = (relBaseY + relTipY) * 0.5 + (leg.id.startsWith('L') ? -4 : 4);
      ctx.lineTo(midX, midY);
      ctx.lineTo(relTipX, relTipY);
      ctx.stroke();

      // Tarsal claw tip contact dot
      ctx.fillStyle = leg.isParesis ? '#FF5500' : (leg.isStance ? '#E5D5C5' : '#444444');
      ctx.beginPath();
      ctx.arc(relTipX, relTipY, leg.isParesis ? 2.5 : 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Wings (Translucent with delicate venation)
    if (!fly.wingDamaged) {
      // Left Wing
      ctx.save();
      ctx.translate(-2, -3);
      ctx.rotate(fly.leftWingAngle - 0.25);
      ctx.fillStyle = isFleeing ? 'rgba(200, 235, 255, 0.45)' : 'rgba(220, 240, 255, 0.25)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(-14, -8, 16, 5.5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Right Wing
      ctx.save();
      ctx.translate(-2, 3);
      ctx.rotate(fly.rightWingAngle + 0.25);
      ctx.fillStyle = isFleeing ? 'rgba(200, 235, 255, 0.45)' : 'rgba(220, 240, 255, 0.25)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(-14, 8, 16, 5.5, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else {
      // Wing shear / damaged wing
      ctx.save();
      ctx.translate(-2, -3);
      ctx.strokeStyle = '#FF3366';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-6, -4);
      ctx.lineTo(-4, -7);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Abdomen (Striped Drosophila tergites)
    ctx.save();
    ctx.translate(-10, 0);
    const abdoGrad = ctx.createLinearGradient(-16, 0, 4, 0);
    abdoGrad.addColorStop(0, '#1A1208');
    abdoGrad.addColorStop(0.5, '#C68A4C');
    abdoGrad.addColorStop(1, '#8C5628');
    ctx.fillStyle = abdoGrad;
    ctx.beginPath();
    ctx.ellipse(-5, 0, 11, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Abdominal stripes (characteristic Drosophila melanic bands)
    ctx.strokeStyle = '#1F140A';
    ctx.lineWidth = 1.2;
    for (let s = -12; s <= 0; s += 3) {
      ctx.beginPath();
      ctx.moveTo(s, -5);
      ctx.lineTo(s, 5);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Thorax (Mesonotum with bristled silhouette)
    const thoraxGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 7);
    thoraxGrad.addColorStop(0, '#9E6B38');
    thoraxGrad.addColorStop(0.8, '#593815');
    thoraxGrad.addColorStop(1, '#2E1906');
    ctx.fillStyle = thoraxGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 7.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Head & Red Compound Eyes (Ommatidia)
    ctx.save();
    ctx.translate(8, 0);
    ctx.fillStyle = '#42240C';
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Compound eyes (Vivid Drosophila brick-red with ommatidia glow)
    const eyeGradL = ctx.createRadialGradient(-0.5, -3.5, 0.5, 0, -3.5, 3);
    eyeGradL.addColorStop(0, '#FF4444');
    eyeGradL.addColorStop(0.7, '#B81414');
    eyeGradL.addColorStop(1, '#500000');
    ctx.fillStyle = eyeGradL;
    ctx.beginPath();
    ctx.ellipse(0.5, -3.5, 3.2, 2.4, 0.3, 0, Math.PI * 2);
    ctx.fill();

    const eyeGradR = ctx.createRadialGradient(-0.5, 3.5, 0.5, 0, 3.5, 3);
    eyeGradR.addColorStop(0, '#FF4444');
    eyeGradR.addColorStop(0.7, '#B81414');
    eyeGradR.addColorStop(1, '#500000');
    ctx.fillStyle = eyeGradR;
    ctx.beginPath();
    ctx.ellipse(0.5, 3.5, 3.2, 2.4, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Antennae (Aristae feathery projections)
    ctx.strokeStyle = '#D4A373';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(3.5, -1.5);
    ctx.lineTo(7, -3.5);
    ctx.moveTo(3.5, 1.5);
    ctx.lineTo(7, 3.5);
    ctx.stroke();

    // Proboscis (Extends during feeding)
    if (fly.proboscisLength > 0.05 || isFeeding) {
      const probLen = 4 + fly.proboscisLength * 6;
      ctx.strokeStyle = '#00FF88';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(4 + probLen, 0);
      ctx.stroke();

      ctx.fillStyle = '#00FF88';
      ctx.beginPath();
      ctx.arc(4 + probLen, 0, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // Restore head

    ctx.restore(); // Restore fly transform
  };

  // Canvas click / touch handlers
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Shift click triggers looming shadow, standard click adds sucrose
    if (e.shiftKey) {
      onTriggerShadow(clickX, clickY);
    } else {
      onAddSucrose(clickX, clickY);
    }
  };

  return (
    <div className="relative flex flex-col bg-[#000000] border border-[#262626] rounded-sm overflow-hidden">
      {/* Top Arena Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#262626] bg-[#0A0A0A]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-widest text-[#E5E5E5] uppercase">
            PRIMARY ARENA // PETRI DISH (2D)
          </span>
          <span className="text-[10px] text-[#666666]">
            [TAP/CLICK: ADD SUCROSE | SHIFT+CLICK: LOOM SHADOW]
          </span>
        </div>

        {/* Live state pill */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase text-[#888888]">STATE:</span>
          <span
            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border ${
              behavioralState === 'FLEEING'
                ? 'bg-[#2A0812] text-[#FF1E56] border-[#FF1E56] animate-pulse'
                : behavioralState === 'FEEDING'
                ? 'bg-[#082A14] text-[#00FF88] border-[#00FF88]'
                : behavioralState === 'LIMPING'
                ? 'bg-[#2A1E08] text-[#FFB300] border-[#FFB300]'
                : behavioralState === 'DISORIENTED'
                ? 'bg-[#25082A] text-[#E040FB] border-[#E040FB]'
                : 'bg-[#081E2A] text-[#00E5FF] border-[#00E5FF]'
            }`}
          >
            {behavioralState}
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[520px] bg-[#050505]">
        <canvas
          ref={canvasRef}
          width={800}
          height={520}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Arena Action Overlay */}
        <div className="absolute bottom-2.5 left-2.5 flex flex-wrap items-center gap-1.5 z-10">
          <button
            onClick={() => onAddSucrose(arena.centerX + (Math.random() - 0.5) * 160, arena.centerY + (Math.random() - 0.5) * 160)}
            className="text-[10px] uppercase px-2.5 py-1 bg-[#0A0A0A] hover:bg-[#151515] text-[#00FF88] border border-[#00FF88]/50 hover:border-[#00FF88] rounded-sm tracking-wider font-semibold transition-colors flex items-center gap-1"
          >
            <span>+ SUCROSE 🍯</span>
          </button>

          <button
            onClick={() => onTriggerShadow()}
            className="text-[10px] uppercase px-2.5 py-1 bg-[#0A0A0A] hover:bg-[#151515] text-[#FF1E56] border border-[#FF1E56]/50 hover:border-[#FF1E56] rounded-sm tracking-wider font-semibold transition-colors flex items-center gap-1"
          >
            <span>⚡ TRIGGER SHADOW 🦅</span>
          </button>

          <button
            onClick={onClearArena}
            className="text-[10px] uppercase px-2.5 py-1 bg-[#0A0A0A] hover:bg-[#151515] text-[#888888] border border-[#262626] hover:border-[#666666] rounded-sm tracking-wider transition-colors"
          >
            CLEAR ARENA
          </button>

          <button
            onClick={onResetFly}
            className="text-[10px] uppercase px-2.5 py-1 bg-[#0A0A0A] hover:bg-[#151515] text-[#888888] border border-[#262626] hover:border-[#666666] rounded-sm tracking-wider transition-colors"
          >
            RESET FLY
          </button>
        </div>
      </div>
    </div>
  );
};
