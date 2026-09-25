import React from 'react';
import { DoomButtons } from '../doom/types';

interface DoomControlsProps {
  buttons: DoomButtons;
  reason: string;
  isAutoPlay: boolean;
  onToggleAutoPlay: () => void;
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
  onSpawnDemon,
  ebLesionPercent,
  onChangeEBLesion,
  onManualButton,
  demonsAlive
}) => {
  return (
    <div className="flex flex-col bg-[#000000] border border-[#262626] rounded-sm divide-y divide-[#262626] p-3 text-xs font-mono space-y-3 h-full">
      {/* 1. NEURON -> BUTTON Layout (Directly matching screenshot) */}
      <div>
        <div className="flex items-center justify-between text-[10px] text-[#888888] font-bold tracking-widest uppercase mb-2">
          <span>NEURON → BUTTON</span>
          <span className="text-[#00E5FF]">FAFB MOTOR ACTUATION</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* TURN Button */}
          <button
            onClick={() => onManualButton('turnLeft')}
            className={`flex flex-col items-center justify-center p-2.5 rounded-sm border transition-all ${
              buttons.turnLeft || buttons.turnRight
                ? 'bg-[#1F1708] border-[#FFB300] text-[#FFB300] shadow-[0_0_10px_rgba(255,179,0,0.35)]'
                : 'bg-[#0A0A0A] border-[#262626] text-[#666666]'
            }`}
          >
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <span>↤</span>
              <span>TURN</span>
              <span>↦</span>
            </div>
            <div className="text-[9px] mt-1 font-mono font-bold">
              {buttons.turnLeft ? 'LEFT' : buttons.turnRight ? 'RIGHT' : '—'}
            </div>
          </button>

          {/* MOVE Button */}
          <button
            onClick={() => onManualButton('moveForward')}
            className={`flex flex-col items-center justify-center p-2.5 rounded-sm border transition-all ${
              buttons.moveForward || buttons.moveBackward
                ? 'bg-[#081F1A] border-[#00FF88] text-[#00FF88] shadow-[0_0_10px_rgba(0,255,136,0.35)]'
                : 'bg-[#0A0A0A] border-[#262626] text-[#666666]'
            }`}
          >
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <span>↥</span>
              <span>MOVE</span>
            </div>
            <div className="text-[9px] mt-1 font-mono font-bold">
              {buttons.moveForward ? 'FORWARD' : buttons.moveBackward ? 'BACK' : '—'}
            </div>
          </button>

          {/* FIRE Button */}
          <button
            onClick={() => onManualButton('fire')}
            className={`flex flex-col items-center justify-center p-2.5 rounded-sm border transition-all ${
              buttons.fire
                ? 'bg-[#2A0812] border-[#FF1E56] text-[#FF1E56] animate-pulse shadow-[0_0_12px_rgba(255,30,86,0.6)]'
                : 'bg-[#0A0A0A] border-[#262626] text-[#666666]'
            }`}
          >
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <span>🎯</span>
              <span>FIRE</span>
            </div>
            <div className="text-[9px] mt-1 font-mono font-bold">
              {buttons.fire ? 'BLAST!' : '—'}
            </div>
          </button>
        </div>

        {/* Neural Experiment Status & Decision Reason */}
        <div className="mt-2.5 px-2.5 py-1.5 bg-[#080808] border border-[#1F1F1F] rounded-sm flex items-center justify-between text-[10px]">
          <span className="text-[#666666]">NEURAL EXPERIMENT:</span>
          <span className="text-white font-bold">NO LEARNING (FAFB CONNECTOME)</span>
        </div>

        <div className="mt-1 px-2.5 py-1.5 bg-[#080808] border border-[#1F1F1F] rounded-sm text-[10px] truncate">
          <span className="text-[#666666]">DECISION REASON: </span>
          <span className="text-[#00E5FF] font-semibold">{reason}</span>
        </div>
      </div>

      {/* 2. Interactive Controls & Demon Spawning */}
      <div className="pt-2 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-[#888888] font-bold uppercase">
          <span>EXPERIMENT CONTROLS:</span>
          <span className="text-white">DEMONS ALIVE: {demonsAlive}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Toggle Auto/Manual */}
          <button
            onClick={onToggleAutoPlay}
            className={`py-2 px-2 border rounded-sm font-bold uppercase text-[10px] transition-all text-center ${
              isAutoPlay
                ? 'bg-[#0F1E16] text-[#00FF88] border-[#00FF88]'
                : 'bg-[#1F1708] text-[#FFB300] border-[#FFB300]'
            }`}
          >
            {isAutoPlay ? '🪰 CONNECTOME AUTO' : '🎮 MANUAL WASD'}
          </button>

          {/* Spawn Demon */}
          <button
            onClick={onSpawnDemon}
            className="py-2 px-2 bg-[#2A0812] hover:bg-[#3D0C1A] text-[#FF1E56] border border-[#FF1E56] rounded-sm font-bold uppercase text-[10px] transition-all flex items-center justify-center gap-1"
          >
            <span>+ SPAWN DEMON 👹</span>
          </button>
        </div>
      </div>

      {/* 3. Ellipsoid Body Compass Lesion Slider */}
      <div className="pt-2 space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-[#AAAAAA]">EB COMPASS DAMAGE:</span>
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
        <div className="text-[8px] text-[#666666]">
          Higher lesion causes compass drift: watch the fly spin in circles and lose aim!
        </div>
      </div>
    </div>
  );
};
