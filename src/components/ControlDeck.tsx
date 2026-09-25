import React from 'react';
import { GameDifficulty, GamePlayMode, GameState } from '../game/types';

interface ControlDeckProps {
  difficulty: GameDifficulty;
  onChangeDifficulty: (d: GameDifficulty) => void;
  playMode: GamePlayMode;
  onTogglePlayMode: () => void;
  ebLesionPercent: number;
  onChangeEBLesion: (percent: number) => void;
  gameState: GameState;
  onTogglePause: () => void;
  onRestart: () => void;
  onTriggerFrenzy: () => void;
}

export const ControlDeck: React.FC<ControlDeckProps> = ({
  difficulty,
  onChangeDifficulty,
  playMode,
  onTogglePlayMode,
  ebLesionPercent,
  onChangeEBLesion,
  gameState,
  onTogglePause,
  onRestart,
  onTriggerFrenzy
}) => {
  return (
    <div className="flex flex-col bg-[#000000] border border-[#262626] rounded-sm divide-y divide-[#262626] p-3 text-xs font-mono space-y-3">
      {/* 1. Game Mode Selector */}
      <div>
        <div className="text-[10px] text-[#888888] font-bold tracking-widest uppercase mb-1.5">
          PLAY MODE:
        </div>
        <button
          onClick={onTogglePlayMode}
          className={`w-full py-2 px-3 border rounded-sm font-bold uppercase tracking-wider text-left flex items-center justify-between transition-all ${
            playMode === 'AUTONOMOUS_RUN'
              ? 'bg-[#0F1E16] text-[#00FF88] border-[#00FF88] shadow-[0_0_10px_rgba(0,255,136,0.2)]'
              : 'bg-[#2A0812] text-[#FF1E56] border-[#FF1E56] shadow-[0_0_10px_rgba(255,30,86,0.2)]'
          }`}
        >
          <div>
            <div className="text-[11px]">
              {playMode === 'AUTONOMOUS_RUN' ? '🪰 AUTONOMOUS CONNECTOME' : '🎮 PLAYER VS FLY (HUNTER)'}
            </div>
            <div className="text-[8px] font-normal opacity-75">
              {playMode === 'AUTONOMOUS_RUN'
                ? 'AI Fly decides turns using FlyWire connectome'
                : 'YOU control Red Hunter with WASD / Arrows to catch AI fly'}
            </div>
          </div>
          <span className="text-[10px] underline">TOGGLE ⇄</span>
        </button>
      </div>

      {/* 2. Difficulty Presets */}
      <div className="pt-2">
        <div className="text-[10px] text-[#888888] font-bold tracking-widest uppercase mb-1.5">
          DIFFICULTY LEVEL:
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(['CASUAL', 'HARDCORE', 'NIGHTMARE'] as GameDifficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => onChangeDifficulty(d)}
              className={`py-1.5 px-1 border rounded-sm uppercase tracking-wider text-[9px] font-bold transition-all text-center ${
                difficulty === d
                  ? d === 'NIGHTMARE'
                    ? 'bg-[#FF1E56] text-white border-white'
                    : d === 'HARDCORE'
                    ? 'bg-[#FFB300] text-black border-white'
                    : 'bg-[#00FF88] text-black border-white'
                  : 'bg-[#0A0A0A] text-[#777777] border-[#222222] hover:border-[#444444]'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Connectome Lesion Slider */}
      <div className="pt-2 space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-[#AAAAAA]">EB COMPASS SYNAPSE DAMAGE:</span>
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
          Higher lesion degrades spatial path integration, trapping the fly in dead ends!
        </div>
      </div>

      {/* 4. Action Buttons */}
      <div className="pt-2 grid grid-cols-3 gap-1.5">
        <button
          onClick={onTogglePause}
          className="py-1.5 px-2 bg-[#0A0A0A] hover:bg-[#151515] border border-[#333333] text-white rounded-sm font-bold text-[10px] uppercase transition-colors"
        >
          {gameState === 'PAUSED' ? 'RESUME ▶' : 'PAUSE ⏸'}
        </button>

        <button
          onClick={onRestart}
          className="py-1.5 px-2 bg-[#0A0A0A] hover:bg-[#151515] border border-[#333333] text-[#AAAAAA] hover:text-white rounded-sm font-bold text-[10px] uppercase transition-colors"
        >
          RESTART ↺
        </button>

        <button
          onClick={onTriggerFrenzy}
          className="py-1.5 px-2 bg-[#0A0A0A] hover:bg-[#151515] border border-[#00FF88]/50 hover:border-[#00FF88] text-[#00FF88] rounded-sm font-bold text-[10px] uppercase transition-colors"
        >
          FRENZY ⚡
        </button>
      </div>
    </div>
  );
};
