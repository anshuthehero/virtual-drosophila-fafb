import React from 'react';
import { DoomPlayer } from '../doom/types';

interface HeaderBarProps {
  player: DoomPlayer;
  fps: number;
  demonsKilled: number;
  isPaused: boolean;
  onTogglePlay: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  player,
  fps,
  demonsKilled,
  isPaused,
  onTogglePlay
}) => {
  return (
    <header className="border-b border-[#262626] bg-[#000000] px-3 sm:px-6 py-2.5 font-mono select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* Title and Dataset Link */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isPaused ? 'bg-[#FFB300]' : 'animate-ping bg-[#FF1E56]'
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isPaused ? 'bg-[#FFB300]' : 'bg-[#FF1E56]'
                }`}
              ></span>
            </span>
            <span className="font-bold tracking-wider text-xs sm:text-sm text-white">
              DOOM-FLY // FAFB CONNECTOME
            </span>
          </div>

          <div className="h-4 w-[1px] bg-[#333333]"></div>

          <a
            href="https://codex.flywire.ai/?dataset=fafb"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] sm:text-xs text-[#888888] hover:text-[#00E5FF] transition-colors border border-[#262626] px-2 py-0.5 rounded-sm tracking-wide"
          >
            DATASET: FLYWIRE FAFB ↗
          </a>

          {/* Quick Play/Stop Header Button */}
          <button
            onClick={onTogglePlay}
            className={`text-[10px] px-2 py-0.5 rounded-sm border font-bold uppercase transition-all flex items-center gap-1 ${
              isPaused
                ? 'bg-[#052814] text-[#00FF88] border-[#00FF88]'
                : 'bg-[#1F1708] text-[#FFB300] border-[#FFB300]'
            }`}
          >
            <span>{isPaused ? '▶ PLAY' : '⏸ STOP'}</span>
          </button>

          <span className="text-[10px] text-[#555555] hidden md:inline">
            {fps} FPS
          </span>
        </div>

        {/* Live DOOM Telemetry */}
        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <span className="text-[#888888]">HEALTH:</span>
            <span className={player.health > 25 ? 'text-[#00FF88]' : 'text-[#FF1E56] animate-pulse'}>
              {player.health}%
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#888888]">AMMO:</span>
            <span className="text-[#FFB300]">{player.ammo}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#888888]">FRAGS:</span>
            <span className="text-[#00E5FF]">{demonsKilled}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
