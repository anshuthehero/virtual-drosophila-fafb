import React, { useState } from 'react';

export const NotesDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-[#262626] bg-[#000000] rounded-sm overflow-hidden font-mono">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[#0A0A0A] hover:bg-[#121212] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-[#FFB300] font-bold">&lt;&gt;</span>
          <span className="text-[11px] font-bold tracking-widest text-[#E5E5E5] uppercase">
            EXPERIMENT NOTES
          </span>
          <span className="text-[10px] text-[#666666]">
            (GAME ARCHITECTURE & DECISION-MAKING MATHEMATICS)
          </span>
        </div>
        <div className="text-[11px] text-[#888888]">
          {isOpen ? '— MINIMIZE' : '+ METHOD + SOURCE'}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-[#262626] text-xs space-y-3 leading-relaxed text-[#AAAAAA]">
          <div>
            <h4 className="text-white font-bold uppercase text-[11px] mb-1">
              1. The Connectome as a Game Agent
            </h4>
            <p>
              In <em>NEURAL LABYRINTH</em>, game corridor sightlines and environmental rewards are directly routed into an artificial brain grounded in the <strong>FlyWire FAFB</strong> whole-brain connectome (Dorkenwald et al., <em>Nature</em> 2024; Schlegel et al., <em>Nature</em> 2024). The fly's motor buttons are depressed directly by synaptic threshold crossings.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold uppercase text-[11px] mb-1">
              2. Crossroad Mathematical Utility Arbitration
            </h4>
            <p>
              At every intersection, a directional utility vector U(d) is computed for each candidate direction d in &#123;North, South, East, West&#125;:
            </p>
            <div className="bg-[#0A0A0A] border border-[#222222] p-2 rounded-sm text-[#00E5FF] text-[10px]">
              U(d) = w_reward * ALPN_Odor(d) - w_fear * LPLC2_Threat(d) + w_compass * cos(θ_d - θ_EB) - MemoryPenalty(d)
            </div>
            <p>
              Softmax probabilities determine the chosen turn. When predators loom close, <strong>Lobula LPLC2 and Giant Fiber</strong> spike, commanding an emergency escape away from that corridor. When metabolic energy drops below 25%, hunger takes over, forcing high-risk food foraging.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold uppercase text-[11px] mb-1">
              3. Ellipsoid Body (EB) Path Integration & Lesion Effects
            </h4>
            <p>
              The 16-wedge <strong>E-PG ring attractor</strong> maintains an internal heading compass. If you dial up the EB Lesion slider, synaptic weights are severed. Without spatial compass cohesion, the fly cannot maintain orientation through multi-turn corridors and repeatedly traps itself in dead-ends!
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold uppercase text-[11px] mb-1">
              4. Predator Hunter Archetypes
            </h4>
            <p>
              The 4 predators emulate natural Drosophila threats: the <strong>Looming Hunter</strong> casts expanding overhead shadows, the <strong>Ambush Trapper</strong> predicts heading to cut off exits, the <strong>Scent Stalker</strong> tracks the fly's past odor trail, and the <strong>Territorial Brute</strong> defends high-value sucrose rooms.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
