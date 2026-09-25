import React from 'react';
import { DecisionVector, Direction } from '../game/types';

interface DecisionMatrixHUDProps {
  decision: DecisionVector | null;
  fearLevel: number;
  rewardLevel: number;
  ebStability: number;
  energyPercent: number;
  isFrenzyActive: boolean;
}

export const DecisionMatrixHUD: React.FC<DecisionMatrixHUDProps> = ({
  decision,
  fearLevel,
  rewardLevel,
  ebStability,
  energyPercent,
  isFrenzyActive
}) => {
  const directions: Direction[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];

  return (
    <div className="flex flex-col bg-[#000000] border border-[#262626] rounded-sm divide-y divide-[#262626] h-full text-xs font-mono">
      {/* 1. Header & Live Biological State */}
      <div className="p-3 bg-[#0A0A0A]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold tracking-widest text-[#E5E5E5] uppercase">
            CONNECTOME DECISION RADAR
          </span>
          <span
            className={`text-[9px] px-2 py-0.5 rounded-sm font-bold uppercase border ${
              isFrenzyActive
                ? 'bg-[#082A14] text-[#00FF88] border-[#00FF88] animate-pulse'
                : fearLevel > 0.4
                ? 'bg-[#2A0812] text-[#FF1E56] border-[#FF1E56] animate-pulse'
                : 'bg-[#081E2A] text-[#00E5FF] border-[#00E5FF]'
            }`}
          >
            {isFrenzyActive
              ? '⚡ DOPAMINE FRENZY'
              : fearLevel > 0.4
              ? '🔴 THREAT SACCADE'
              : '🔵 CORRIDOR NAVIGATION'}
          </span>
        </div>

        {/* Reason pill */}
        <div className="text-[10px] text-[#AAAAAA] mt-1 truncate">
          <span className="text-[#666666]">ARBITRATION: </span>
          <span className="text-white font-semibold">
            {decision ? decision.reason : 'EXPLORING CORRIDOR'}
          </span>
        </div>
      </div>

      {/* 2. Directional Probability Matrix (Softmax Breakdown) */}
      <div className="p-3 space-y-2">
        <div className="text-[9px] text-[#777777] font-bold uppercase tracking-wider mb-1">
          CROSSROAD UTILITY & SOFTMAX PROBABILITIES:
        </div>

        <div className="grid grid-cols-2 gap-2">
          {directions.map((d) => {
            const opt = decision?.options?.[d];
            const isChosen = decision?.chosenDir === d;
            const prob = opt && opt.isValid ? Math.round(opt.probability * 100) : 0;

            return (
              <div
                key={d}
                className={`p-2 rounded-sm border transition-all ${
                  isChosen
                    ? 'bg-[#0F1E16] border-[#00FF88] shadow-[0_0_8px_rgba(0,255,136,0.25)]'
                    : opt?.isValid
                    ? 'bg-[#080808] border-[#222222]'
                    : 'bg-[#050505] border-[#181818] opacity-35'
                }`}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className={`font-bold ${isChosen ? 'text-[#00FF88]' : 'text-[#AAAAAA]'}`}>
                    {d === 'UP' ? '▲ NORTH' : d === 'DOWN' ? '▼ SOUTH' : d === 'LEFT' ? '◀ WEST' : '▶ EAST'}
                  </span>
                  <span className={`font-bold ${isChosen ? 'text-[#00FF88]' : 'text-white'}`}>
                    {opt?.isValid ? `${prob}%` : 'BLOCKED'}
                  </span>
                </div>

                {opt?.isValid && (
                  <div className="mt-1 space-y-0.5 text-[8px] text-[#777777]">
                    <div className="flex justify-between">
                      <span className="text-[#FF1E56]">FEAR (LPLC2):</span>
                      <span>-{opt.fearPenalty.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#00FF88]">REWARD (ALPN):</span>
                      <span>+{opt.rewardValue.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#00E5FF]">EB COMPASS:</span>
                      <span>{opt.compassBias >= 0 ? '+' : ''}{opt.compassBias.toFixed(1)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Biological Driving Forces Meter */}
      <div className="p-3 space-y-2 bg-[#080808]">
        <div className="text-[9px] text-[#777777] font-bold uppercase tracking-wider">
          LIVE NEUROMODULATORY STATES:
        </div>

        {/* Fear / Looming Meter */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[9px]">
            <span className="text-[#FF1E56]">FEAR DRIVE (GIANT FIBER):</span>
            <span className="text-[#E5E5E5]">{(fearLevel * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-[#1A1A1A] h-1.5 rounded-sm overflow-hidden">
            <div
              className="bg-[#FF1E56] h-full transition-all duration-100"
              style={{ width: `${Math.min(100, fearLevel * 100)}%` }}
            />
          </div>
        </div>

        {/* Reward / Odor Scent */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[9px]">
            <span className="text-[#00FF88]">SUCROSE VALENCE (PAM DOPAMINE):</span>
            <span className="text-[#E5E5E5]">{(rewardLevel * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-[#1A1A1A] h-1.5 rounded-sm overflow-hidden">
            <div
              className="bg-[#00FF88] h-full transition-all duration-100"
              style={{ width: `${Math.min(100, rewardLevel * 100)}%` }}
            />
          </div>
        </div>

        {/* Ellipsoid Body Compass Coherence */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[9px]">
            <span className="text-[#00E5FF]">EB RING ATTRACTOR COHERENCE:</span>
            <span className="text-[#E5E5E5]">{(ebStability * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-[#1A1A1A] h-1.5 rounded-sm overflow-hidden">
            <div
              className="bg-[#00E5FF] h-full transition-all duration-100"
              style={{ width: `${Math.min(100, ebStability * 100)}%` }}
            />
          </div>
        </div>

        {/* Starvation Energy Clock */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[9px]">
            <span className={energyPercent < 25 ? 'text-[#FF1E56] font-bold animate-pulse' : 'text-[#FFB300]'}>
              METABOLIC ENERGY (STARVATION CLOCK):
            </span>
            <span className="text-[#E5E5E5]">{energyPercent.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-[#1A1A1A] h-1.5 rounded-sm overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${
                energyPercent < 25 ? 'bg-[#FF1E56]' : 'bg-[#FFB300]'
              }`}
              style={{ width: `${Math.min(100, energyPercent)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
