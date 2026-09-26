import React, { useState } from 'react';
import { FLYWIRE_FAFB_NEURONS } from '../simulation/connectomeData';
import { DoomButtons } from '../doom/types';

interface NeuronDrawerProps {
  fearLevel: number;
  rewardLevel: number;
  ebStability: number;
  giantFiberActive: boolean;
  isFrenzyActive: boolean;
  buttons?: DoomButtons;
  dng01Forward?: number;
  dng02Steering?: number;
  dnp09Saccade?: number;
}

export const NeuronDrawer: React.FC<NeuronDrawerProps> = ({
  fearLevel,
  rewardLevel,
  ebStability,
  giantFiberActive,
  isFrenzyActive,
  buttons,
  dng01Forward,
  dng02Steering,
  dnp09Saccade
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getNeuronActivity = (id: string) => {
    if (id.startsWith('E-PG')) return ebStability;
    if (id.startsWith('P-EN1')) {
      const isTurning = buttons?.turnLeft || buttons?.turnRight;
      return isTurning ? Math.max(0.65, Math.abs(dng02Steering ?? 0.65)) : 0.20;
    }
    if (id.startsWith('Delta7')) return ebStability;
    if (id.startsWith('ER2')) return 0.22;
    if (id.startsWith('LPLC2')) return Math.max(0.02, fearLevel);
    if (id.startsWith('GF')) return giantFiberActive ? 1.0 : fearLevel > 0.4 ? 0.7 : 0.05;
    if (id.startsWith('DNp09')) {
      const isStrafing = buttons?.strafeLeft || buttons?.strafeRight;
      return giantFiberActive ? 1.0 : isStrafing ? 0.85 : Math.max(0.05, Math.abs(dnp09Saccade ?? 0));
    }
    if (id.startsWith('ALPN')) return Math.max(0.08, rewardLevel);
    if (id.startsWith('PAM')) return isFrenzyActive ? 1.0 : Math.max(0.15, rewardLevel);
    if (id.startsWith('SEZ')) return isFrenzyActive ? 1.0 : rewardLevel > 0.3 ? 0.90 : 0.05;
    if (id.startsWith('DNg01')) {
      if (buttons?.moveForward) return Math.max(0.85, Math.abs(dng01Forward ?? 0.85));
      if (buttons?.moveBackward) return 0.55;
      return Math.abs(dng01Forward ?? 0.05);
    }
    if (id.startsWith('DNg02')) {
      if (buttons?.turnLeft || buttons?.turnRight) return Math.max(0.75, Math.abs(dng02Steering ?? 0.75));
      return Math.abs(dng02Steering ?? 0.05);
    }
    if (id.startsWith('dFB')) return 0.18;
    return 0.15;
  };

  return (
    <div className="border border-[#262626] bg-[#000000] rounded-sm overflow-hidden font-mono">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[#0A0A0A] hover:bg-[#121212] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-[#00E5FF] font-bold">|||</span>
          <span className="text-[11px] font-bold tracking-widest text-[#E5E5E5] uppercase">
            NEURON READOUTS
          </span>
          <span className="text-[10px] text-[#666666]">
            (FLYWIRE FAFB v783 IDENTIFIED CELLS)
          </span>
        </div>
        <div className="text-[11px] text-[#888888]">
          {isOpen ? '— MINIMIZE' : `+ ${FLYWIRE_FAFB_NEURONS.length} CELLS`}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-[#262626] overflow-x-auto">
          <table className="w-full text-left text-[10px] border-collapse">
            <thead>
              <tr className="border-b border-[#262626] text-[#777777] uppercase">
                <th className="py-1.5 px-2">CELL TYPE</th>
                <th className="py-1.5 px-2">NEUROPIL</th>
                <th className="py-1.5 px-2">TRANSMITTER</th>
                <th className="py-1.5 px-2">FAFB ROOT ID</th>
                <th className="py-1.5 px-2">SYNAPSES</th>
                <th className="py-1.5 px-2">ACTIVITY</th>
                <th className="py-1.5 px-2">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {FLYWIRE_FAFB_NEURONS.map((neuron) => {
                const activity = getNeuronActivity(neuron.id);
                return (
                  <tr key={neuron.id} className="hover:bg-[#0A0A0A] transition-colors">
                    <td className="py-1.5 px-2 font-bold text-white flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{
                          backgroundColor:
                            neuron.category === 'fear'
                              ? '#FF1E56'
                              : neuron.category === 'reward'
                              ? '#00FF88'
                              : neuron.category === 'compass'
                              ? '#00E5FF'
                              : neuron.category === 'motor'
                              ? '#FFB300'
                              : '#B388FF'
                        }}
                      />
                      {neuron.name}
                    </td>
                    <td className="py-1.5 px-2 text-[#AAAAAA]">{neuron.neuropil}</td>
                    <td className="py-1.5 px-2 uppercase text-[#888888]">{neuron.neurotransmitter}</td>
                    <td className="py-1.5 px-2 text-[#00E5FF]">{neuron.flywireRootId}</td>
                    <td className="py-1.5 px-2 text-[#888888]">~{neuron.synapseCountApprox}</td>
                    <td className="py-1.5 px-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 bg-[#1A1A1A] h-2 rounded-sm overflow-hidden">
                          <div
                            className="h-full transition-all duration-75"
                            style={{
                              width: `${Math.min(100, activity * 100)}%`,
                              backgroundColor:
                                neuron.category === 'fear'
                                  ? '#FF1E56'
                                  : neuron.category === 'reward'
                                  ? '#00FF88'
                                  : neuron.category === 'compass'
                                  ? '#00E5FF'
                                  : neuron.category === 'motor'
                                  ? '#FFB300'
                                  : '#B388FF'
                            }}
                          />
                        </div>
                        <span className="text-[9px] text-[#666666]">
                          {(activity * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-1.5 px-2">
                      <a
                        href={`https://codex.flywire.ai/?dataset=fafb&search=${neuron.flywireRootId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] text-[#00E5FF] hover:underline"
                      >
                        EXPLORE CODEX ↗
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
