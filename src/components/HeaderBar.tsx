import React from 'react';
import { GameTelemetry } from '../game/types';

interface HeaderBarProps {
  telemetry: GameTelemetry;
  fps: number;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ telemetry, fps }) => {
  return (
    <header className="border-b border-[#262626] bg-[#000000] px-3 sm:px-6 py-2.5 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* Title and Dataset Link */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF88] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00FF88]"></span>
            </span>
            <span className="font-bold tracking-wider text-xs sm:text-sm text-white">
              NEURAL LABYRINTH // FAFB HARDCORE
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

          <span className="text-[10px] text-[#555555] hidden md:inline">
            {fps} FPS
          </span>
        </div>

        {/* Live Score Telemetry */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[#666666]">STAGE:</span>
            <span className="text-white font-bold">{telemetry.stage}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#666666]">SCORE:</span>
            <span className="text-[#00FF88] font-bold">{telemetry.score}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#666666]">HIGH:</span>
            <span className="text-[#FFB300] font-bold">{telemetry.highScore}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#666666]">PELLETS:</span>
            <span className="text-[#00E5FF] font-bold">{telemetry.pelletsRemaining}</span>
          </div>

          {telemetry.frenzyActive && (
            <div className="flex items-center gap-1 bg-[#082A14] border border-[#00FF88] px-2 py-0.5 rounded-sm text-[#00FF88] font-bold animate-pulse text-[10px]">
              <span>FRENZY:</span>
              <span>{telemetry.frenzyTimeRemaining.toFixed(1)}s</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
