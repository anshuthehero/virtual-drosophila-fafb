import React from 'react';
import { DoomButtons } from '../doom/types';

interface DoomControlsProps {
  buttons: DoomButtons;
  reason: string;
  isAutoPlay: boolean;
  onToggleAutoPlay: () => void;
  isPaused: boolean;
  onTogglePlay: () => void;
  onSpawnDemon: () => void;
  ebLesionPercent: number;
  onChangeEBLesion: (percent: number) => void;
  onManualButton: (button: keyof DoomButtons) => void;
  demonsAlive: number;
}

export const DoomControls: React.FC<DoomControlsProps> = ({
  buttons,
  reason,
  isAutoPlay,
  onToggleAutoPlay,
  isPaused,
  onTogglePlay,
  onSpawnDemon,
  ebLesionPercent,
  onChangeEBLesion,
  onManualButton,
  demonsAlive
}) => {
  return (
    <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 bg-[#000000] border border-[#262626] rounded-sm p-2.5 text-xs font-mono select-none">

      {/* 1. PLAY / STOP */}
      <button
        onClick={onTogglePlay}
        className={`shrink-0 py-2 px-4 border rounded-sm font-bold uppercase text-[11px] transition-all flex items-center gap-1.5 ${
          isPaused
            ? 'bg-[#052814] text-[#00FF88] border-[#00FF88] hover:bg-[#083E1E] shadow-[0_0_12px_rgba(0,255,136,0.35)] animate-pulse'
            : 'bg-[#291700] text-[#FFB300] border-[#FFB300] hover:bg-[#3D2200]'
        }`}
      >
        <span className="text-sm">{isPaused ? '▶' : '⏸'}</span>
        <span>{isPaused ? 'PLAY' : 'PAUSE'}</span>
      </button>

      {/* 2. AUTO / MANUAL */}
      <button
        onClick={onToggleAutoPlay}
        className={`shrink-0 py-2 px-3 border rounded-sm font-bold uppercase text-[10px] transition-all flex items-center gap-1 ${
          isAutoPlay
            ? 'bg-[#0F1E16] text-[#00FF88] border-[#00FF88]'
            : 'bg-[#1F1708] text-[#FFB300] border-[#FFB300]'
        }`}
      >
        <span>{isAutoPlay ? '🪰 CONNECTOME' : '🎮 MANUAL'}</span>
      </button>

      {/* 3. Separator */}
      <div className="shrink-0 h-8 w-px bg-[#262626] hidden lg:block" />

      {/* 4. NEURON BUTTONS: TURN / MOVE / FIRE */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onManualButton('turnLeft')}
          className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-sm border transition-all min-w-[64px] ${
            buttons.turnLeft || buttons.turnRight
              ? 'bg-[#1F1708] border-[#FFB300] text-[#FFB300] shadow-[0_0_8px_rgba(255,179,0,0.4)]'
              : 'bg-[#0A0A0A] border-[#262626] text-[#666666] hover:border-[#444444]'
          }`}
        >
          <div className="text-[11px] font-bold flex items-center gap-0.5">
            <span>↤</span><span>TURN</span><span>↦</span>
          </div>
          <div className="text-[8px] font-mono font-bold mt-0.5">
            {buttons.turnLeft ? 'LEFT' : buttons.turnRight ? 'RIGHT' : '—'}
          </div>
        </button>

        <button
          onClick={() => onManualButton('moveForward')}
          className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-sm border transition-all min-w-[60px] ${
            buttons.moveForward || buttons.moveBackward
              ? 'bg-[#081F1A] border-[#00FF88] text-[#00FF88] shadow-[0_0_8px_rgba(0,255,136,0.4)]'
              : 'bg-[#0A0A0A] border-[#262626] text-[#666666] hover:border-[#444444]'
          }`}
        >
          <div className="text-[11px] font-bold">↥ MOVE</div>
          <div className="text-[8px] font-mono font-bold mt-0.5">
            {buttons.moveForward ? 'FWD' : buttons.moveBackward ? 'BACK' : '—'}
          </div>
        </button>

        <button
          onClick={() => onManualButton('fire')}
          className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-sm border transition-all min-w-[56px] ${
            buttons.fire
              ? 'bg-[#2A0812] border-[#FF1E56] text-[#FF1E56] animate-pulse shadow-[0_0_12px_rgba(255,30,86,0.7)]'
              : 'bg-[#0A0A0A] border-[#262626] text-[#666666] hover:border-[#FF1E56] hover:text-[#FF1E56]'
          }`}
        >
          <div className="text-[11px] font-bold">🎯 FIRE</div>
          <div className="text-[8px] font-mono font-bold mt-0.5">{buttons.fire ? 'BLAST!' : '—'}</div>
        </button>
      </div>

      {/* 5. Circuit Decision Reason — stretches to fill space */}
      <div className="flex-1 min-w-0 px-2.5 py-1.5 bg-[#080808] border border-[#1F1F1F] rounded-sm">
        <div className="text-[8px] text-[#666666] uppercase tracking-wider">Circuit</div>
        <div className="text-[10px] text-[#00E5FF] font-semibold truncate">{reason}</div>
      </div>

      {/* 6. Separator */}
      <div className="shrink-0 h-8 w-px bg-[#262626] hidden lg:block" />

      {/* 7. Spawn Demon */}
      <div className="shrink-0 flex flex-col items-center gap-1">
        <div className="text-[8px] text-[#888888] uppercase">Demons: <span className="text-white font-bold">{demonsAlive}</span></div>
        <button
          onClick={onSpawnDemon}
          className="py-1.5 px-3 bg-[#2A0812] hover:bg-[#3D0C1A] text-[#FF1E56] border border-[#FF1E56] rounded-sm font-bold uppercase text-[9px] transition-all flex items-center gap-1 shadow-[0_0_8px_rgba(255,30,86,0.25)]"
        >
          <span>👹</span><span>SPAWN</span>
        </button>
      </div>

      {/* 8. EB Lesion Slider */}
      <div className="shrink-0 flex flex-col gap-1 min-w-[140px]">
        <div className="flex justify-between text-[8px]">
          <span className="text-[#888888] uppercase">EB Damage</span>
          <span className="font-bold text-[#00E5FF]">{ebLesionPercent}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="80"
          step="5"
          value={ebLesionPercent}
          onChange={(e) => onChangeEBLesion(parseInt(e.target.value))}
          className="w-full h-1.5 bg-[#1F1F1F] rounded-lg appearance-none cursor-pointer accent-[#00E5FF]"
        />
        <div className="text-[7px] text-[#444444] leading-tight">≥40% = compass fail → spin panic</div>
      </div>
    </div>
  );
};
