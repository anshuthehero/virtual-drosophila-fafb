import React from 'react';
import { BehavioralState, IllnessConfig, NeuralCircuitState } from '../types/simulation';

interface MotorDeckProps {
  neuralState: NeuralCircuitState;
  behavioralState: BehavioralState;
  illness: IllnessConfig;
  onUpdateIllness: (updater: (prev: IllnessConfig) => IllnessConfig) => void;
  onManualSteer: (dir: number) => void;
  onManualForward: () => void;
  onManualEscape: () => void;
}

export const MotorDeck: React.FC<MotorDeckProps> = ({
  neuralState,
  behavioralState,
  illness,
  onUpdateIllness,
  onManualSteer,
  onManualForward,
  onManualEscape
}) => {
  const isTurningLeft = neuralState.motor.dng02Steering < -0.15;
  const isTurningRight = neuralState.motor.dng02Steering > 0.15;
  const isMovingForward = neuralState.motor.dng01Forward > 0.1;
  const isEscaping = neuralState.motor.dnp09EscapeSaccade > 0.5 || neuralState.fear.giantFiberSpike > 0.5;
  const isProboscisOut = neuralState.reward.proboscisDrive > 0.5;

  return (
    <div className="flex flex-col bg-[#000000] border border-[#262626] rounded-sm divide-y divide-[#262626] h-full text-xs">
      {/* 1. NEURON -> BUTTON / MOTOR COMMANDS (Matching screenshot layout) */}
      <div className="p-3">
        <div className="text-[10px] text-[#888888] font-bold tracking-widest uppercase mb-2">
          NEURON → MOTOR READOUTS
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Steer button */}
          <button
            onClick={() => onManualSteer(-1)}
            className={`flex flex-col items-center justify-center p-2 rounded-sm border transition-all ${
              isTurningLeft || isTurningRight
                ? 'bg-[#1F1708] border-[#FFB300] text-[#FFB300] shadow-[0_0_8px_rgba(255,179,0,0.3)]'
                : 'bg-[#0A0A0A] border-[#262626] text-[#888888] hover:border-[#404040]'
            }`}
          >
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <span>↤</span>
              <span>STEER</span>
              <span>↦</span>
            </div>
            <div className="text-[9px] mt-1 font-mono">
              {isTurningLeft ? 'LEFT' : isTurningRight ? 'RIGHT' : 'CENTER'}
            </div>
          </button>

          {/* Move button */}
          <button
            onClick={onManualForward}
            className={`flex flex-col items-center justify-center p-2 rounded-sm border transition-all ${
              isMovingForward
                ? 'bg-[#081F1A] border-[#00FF88] text-[#00FF88] shadow-[0_0_8px_rgba(0,255,136,0.3)]'
                : 'bg-[#0A0A0A] border-[#262626] text-[#888888] hover:border-[#404040]'
            }`}
          >
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <span>↥</span>
              <span>MOVE</span>
            </div>
            <div className="text-[9px] mt-1 font-mono">
              {(neuralState.motor.dng01Forward * 100).toFixed(0)}% THRUST
            </div>
          </button>

          {/* Escape / Fire button */}
          <button
            onClick={onManualEscape}
            className={`flex flex-col items-center justify-center p-2 rounded-sm border transition-all ${
              isEscaping
                ? 'bg-[#2A0812] border-[#FF1E56] text-[#FF1E56] animate-pulse shadow-[0_0_8px_rgba(255,30,86,0.5)]'
                : 'bg-[#0A0A0A] border-[#262626] text-[#888888] hover:border-[#404040]'
            }`}
          >
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <span>⚡</span>
              <span>ESCAPE</span>
            </div>
            <div className="text-[9px] mt-1 font-mono">
              {isEscaping ? 'GIANT FIBER' : 'STANDBY'}
            </div>
          </button>
        </div>

        {/* Secondary motors (Proboscis & Saccade) */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div
            className={`px-2 py-1.5 border rounded-sm flex items-center justify-between text-[10px] ${
              isProboscisOut
                ? 'bg-[#082A14] border-[#00FF88] text-[#00FF88]'
                : 'bg-[#0A0A0A] border-[#1F1F1F] text-[#666666]'
            }`}
          >
            <span>PROBOSCIS (PER):</span>
            <span className="font-bold">{isProboscisOut ? 'EXTENDED 👅' : 'RETRACTED'}</span>
          </div>

          <div
            className={`px-2 py-1.5 border rounded-sm flex items-center justify-between text-[10px] ${
              neuralState.fear.panicLevel > 0.2
                ? 'bg-[#2A0812] border-[#FF1E56] text-[#FF1E56]'
                : 'bg-[#0A0A0A] border-[#1F1F1F] text-[#666666]'
            }`}
          >
            <span>THREAT AROUSAL:</span>
            <span className="font-bold">{(neuralState.fear.panicLevel * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* 2. ILLNESS & PERTURBATION LABORATORY */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] text-[#888888] font-bold tracking-widest uppercase">
            CONNECTOME LESION & ILLNESS LAB
          </div>
          <span className="text-[9px] text-[#00E5FF] font-mono">
            EB BUMP STABILITY: {(neuralState.compass.stability * 100).toFixed(0)}%
          </span>
        </div>

        {/* EB Synapse Knockout Slider */}
        <div className="space-y-1 mb-3">
          <div className="flex justify-between text-[10px] text-[#AAAAAA]">
            <span>ELLIPSOID BODY SYNAPSE KNOCKOUT:</span>
            <span className="font-bold text-[#E5E5E5]">
              {illness.ebLesionPercent}% SEVERED
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="80"
            step="5"
            value={illness.ebLesionPercent}
            onChange={(e) =>
              onUpdateIllness((prev) => ({
                ...prev,
                ebLesionPercent: parseInt(e.target.value)
              }))
            }
            className="w-full h-1.5 bg-[#1F1F1F] rounded-lg appearance-none cursor-pointer accent-[#00E5FF]"
          />
          <div className="flex justify-between text-[8px] text-[#555555]">
            <span>0% (INTACT COMPASS)</span>
            <span>40% (DRIFT/CIRCLES)</span>
            <span>80% (COMPLETE ATAXIA)</span>
          </div>
        </div>

        {/* Physical Illness & Pathology Selectors */}
        <div className="space-y-1.5">
          <div className="text-[10px] text-[#888888] uppercase">PHYSICAL IMPAIRMENT:</div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() =>
                onUpdateIllness((prev) => ({
                  ...prev,
                  damagedLeg: null,
                  wingDamaged: false
                }))
              }
              className={`text-[9px] sm:text-[10px] py-1.5 px-2 border rounded-sm uppercase tracking-wide transition-all ${
                illness.damagedLeg === null && !illness.wingDamaged
                  ? 'bg-[#1A1A1A] text-white border-white font-bold'
                  : 'bg-[#0A0A0A] text-[#777777] border-[#222222] hover:border-[#444444]'
              }`}
            >
              NONE (INTACT)
            </button>

            <button
              onClick={() =>
                onUpdateIllness((prev) => ({
                  ...prev,
                  damagedLeg: prev.damagedLeg === 'L2' ? null : 'L2'
                }))
              }
              className={`text-[9px] sm:text-[10px] py-1.5 px-2 border rounded-sm uppercase tracking-wide transition-all ${
                illness.damagedLeg === 'L2'
                  ? 'bg-[#2A1E08] text-[#FFB300] border-[#FFB300] font-bold'
                  : 'bg-[#0A0A0A] text-[#777777] border-[#222222] hover:border-[#444444]'
              }`}
            >
              L2 LEG PARESIS (LIMP)
            </button>

            <button
              onClick={() =>
                onUpdateIllness((prev) => ({
                  ...prev,
                  wingDamaged: !prev.wingDamaged
                }))
              }
              className={`text-[9px] sm:text-[10px] py-1.5 px-2 border rounded-sm uppercase tracking-wide transition-all ${
                illness.wingDamaged
                  ? 'bg-[#2A0812] text-[#FF1E56] border-[#FF1E56] font-bold'
                  : 'bg-[#0A0A0A] text-[#777777] border-[#222222] hover:border-[#444444]'
              }`}
            >
              WING SHEAR (NO FLIGHT)
            </button>

            <button
              onClick={() =>
                onUpdateIllness((prev) => ({
                  ...prev,
                  anhedonia: !prev.anhedonia
                }))
              }
              className={`text-[9px] sm:text-[10px] py-1.5 px-2 border rounded-sm uppercase tracking-wide transition-all ${
                illness.anhedonia
                  ? 'bg-[#1F102A] text-[#B388FF] border-[#B388FF] font-bold'
                  : 'bg-[#0A0A0A] text-[#777777] border-[#222222] hover:border-[#444444]'
              }`}
            >
              DOPAMINE NULL (ANHEDONIA)
            </button>
          </div>
        </div>
      </div>

      {/* 3. HOW THE FLY COMPENSATES / HANDLES ILLNESS */}
      <div className="p-3 bg-[#080808]">
        <div className="text-[10px] text-[#00E5FF] font-bold tracking-widest uppercase mb-1 flex items-center gap-1.5">
          <span>⚙ ADAPTIVE COMPENSATION MECHANISM</span>
        </div>
        <p className="text-[10px] text-[#999999] leading-relaxed">
          {illness.damagedLeg === 'L2' && (
            <span className="text-[#FFB300]">
              <strong>5-Leg Gait Compensation:</strong> Left middle leg is dragged. The thoracic Central Pattern Generator increases contralateral Right-2 duty cycle by 42% to cancel out leftward rotational drag and preserve straight navigation.
            </span>
          )}
          {illness.ebLesionPercent >= 35 && (
            <span className="text-[#E040FB]">
              <strong>Compass De-coherence:</strong> Ellipsoid Body ring attractor lost {illness.ebLesionPercent}% of recurrent connections. Heading bump wanders unpredictably, forcing the fly into tortuous circular search patterns.
            </span>
          )}
          {illness.wingDamaged && (
            <span className="text-[#FF1E56]">
              <strong>Aerodynamic Loss:</strong> Wing lift is eliminated. When Giant Fiber triggers escape, fly relies on ballistic high-torque tarsal jumping rather than aerial flight.
            </span>
          )}
          {illness.anhedonia && (
            <span className="text-[#B388FF]">
              <strong>Dopaminergic Disconnection:</strong> PAM dopamine neurons fail to signal sucrose valence. The fly ignores airborne odor plumes and wanders past food.
            </span>
          )}
          {!illness.damagedLeg && illness.ebLesionPercent < 35 && !illness.wingDamaged && !illness.anhedonia && (
            <span>
              <strong>Intact Coordination:</strong> Normal alternating tripod gait (L1-R2-L3 vs R1-L2-R3). Heading bump in Ellipsoid Body dynamically tracks world orientation with 98% fidelity.
            </span>
          )}
        </p>
      </div>
    </div>
  );
};
