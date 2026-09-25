import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HeaderBar } from './components/HeaderBar';
import { MazeCanvas } from './components/MazeCanvas';
import { DecisionMatrixHUD } from './components/DecisionMatrixHUD';
import { ControlDeck } from './components/ControlDeck';
import { SensoryRetina } from './components/SensoryRetina';
import { BrainHUD } from './components/BrainHUD';
import { NeuronDrawer } from './components/NeuronDrawer';
import { NotesDrawer } from './components/NotesDrawer';

import { MazeMap, TILE_SIZE } from './game/mazeMap';
import { FlyActor } from './game/flyActor';
import { PredatorSystem } from './game/predatorAI';
import { NeuralDecisionEngine } from './game/neuralDecisionEngine';
import {
  DecisionVector,
  Direction,
  GameDifficulty,
  GamePlayMode,
  GameState,
  GameTelemetry
} from './game/types';

export const App: React.FC = () => {
  // Game singletons
  const mazeRef = useRef<MazeMap>(new MazeMap());
  const flyRef = useRef<FlyActor>(new FlyActor());
  const predatorRef = useRef<PredatorSystem>(new PredatorSystem(mazeRef.current));
  const decisionRef = useRef<NeuralDecisionEngine>(new NeuralDecisionEngine());

  // Game state
  const [gameState, setGameState] = useState<GameState>('PLAYING');
  const [difficulty, setDifficulty] = useState<GameDifficulty>('HARDCORE');
  const [playMode, setPlayMode] = useState<GamePlayMode>('AUTONOMOUS_RUN');
  const [ebLesionPercent, setEbLesionPercent] = useState<number>(0);

  const [decisionVector, setDecisionVector] = useState<DecisionVector | null>(null);
  const [frenzyActive, setFrenzyActive] = useState<boolean>(false);
  const [frenzyTimer, setFrenzyTimer] = useState<number>(0);

  const [telemetry, setTelemetry] = useState<GameTelemetry>({
    score: 0,
    highScore: 1240,
    stage: 1,
    energyPercent: 100,
    pelletsRemaining: mazeRef.current.totalPellets,
    frenzyTimeRemaining: 0,
    frenzyActive: false,
    predatorsEaten: 0,
    totalIntersectionsSolved: 0,
    deaths: 0
  });

  const [fps, setFps] = useState<number>(60);
  const [showEyes, setShowEyes] = useState<boolean>(true);
  const [showBrain, setShowBrain] = useState<boolean>(true);

  // Manual player inputs (WASD / Arrows)
  const manualDirRef = useRef<Direction>('NONE');

  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const fpsTimerRef = useRef<number>(0);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let dir: Direction = 'NONE';
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dir = 'UP';
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') dir = 'DOWN';
      else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dir = 'LEFT';
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dir = 'RIGHT';

      if (dir !== 'NONE') {
        manualDirRef.current = dir;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Mode & Difficulty
  const handleTogglePlayMode = useCallback(() => {
    setPlayMode((prev) => (prev === 'AUTONOMOUS_RUN' ? 'PLAYER_VS_FLY' : 'AUTONOMOUS_RUN'));
  }, []);

  const handleChangeDifficulty = useCallback((d: GameDifficulty) => {
    setDifficulty(d);
  }, []);

  const handleChangeEBLesion = useCallback((percent: number) => {
    setEbLesionPercent(percent);
    decisionRef.current.setEBLesion(percent);
  }, []);

  const handleTogglePause = useCallback(() => {
    setGameState((prev) => (prev === 'PLAYING' ? 'PAUSED' : 'PLAYING'));
  }, []);

  const handleRestart = useCallback(() => {
    mazeRef.current.resetMaze();
    flyRef.current.reset();
    predatorRef.current.resetPositions();
    setTelemetry((prev) => ({
      ...prev,
      score: 0,
      energyPercent: 100,
      pelletsRemaining: mazeRef.current.totalPellets,
      frenzyActive: false,
      frenzyTimeRemaining: 0
    }));
    setFrenzyActive(false);
    setFrenzyTimer(0);
    setGameState('PLAYING');
  }, []);

  const handleTriggerFrenzy = useCallback(() => {
    setFrenzyActive(true);
    setFrenzyTimer(8.0);
    predatorRef.current.triggerFrenzy(8.0);
  }, []);

  // Main 60 FPS Game Loop
  useEffect(() => {
    let animId: number;

    const gameLoop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      // FPS tracking
      frameCountRef.current++;
      fpsTimerRef.current += dt;
      if (fpsTimerRef.current >= 0.5) {
        setFps(Math.round(frameCountRef.current / fpsTimerRef.current));
        frameCountRef.current = 0;
        fpsTimerRef.current = 0;
      }

      if (gameState === 'PLAYING') {
        const maze = mazeRef.current;
        const fly = flyRef.current;
        const predators = predatorRef.current;
        const decisionEngine = decisionRef.current;

        // 1. Update Frenzy Timer
        let currentFrenzy = frenzyActive;
        let currentFrenzyTime = frenzyTimer;
        if (frenzyActive) {
          currentFrenzyTime = Math.max(0, frenzyTimer - dt);
          setFrenzyTimer(currentFrenzyTime);
          if (currentFrenzyTime <= 0) {
            currentFrenzy = false;
            setFrenzyActive(false);
          }
        }

        // 2. Step Fly Actor
        const flyResult = fly.update(
          dt,
          maze,
          decisionEngine,
          predators.predators,
          currentFrenzy,
          now,
          playMode === 'AUTONOMOUS_RUN' ? undefined : undefined
        );

        if (flyResult.decisionVector) {
          setDecisionVector(flyResult.decisionVector);
        }

        // Handle pellet eating & scoring
        if (flyResult.pelletEaten === 'PELLET') {
          setTelemetry((prev) => {
            const newScore = prev.score + 10;
            return {
              ...prev,
              score: newScore,
              highScore: Math.max(prev.highScore, newScore),
              pelletsRemaining: Math.max(0, prev.pelletsRemaining - 1),
              energyPercent: fly.energyPercent
            };
          });
        } else if (flyResult.pelletEaten === 'SUPER_PELLET') {
          // Trigger Dopamine Frenzy
          currentFrenzy = true;
          currentFrenzyTime = 8.0;
          setFrenzyActive(true);
          setFrenzyTimer(8.0);
          predators.triggerFrenzy(8.0);

          setTelemetry((prev) => {
            const newScore = prev.score + 50;
            return {
              ...prev,
              score: newScore,
              highScore: Math.max(prev.highScore, newScore),
              pelletsRemaining: Math.max(0, prev.pelletsRemaining - 1),
              energyPercent: 100,
              frenzyActive: true,
              frenzyTimeRemaining: 8.0
            };
          });
        } else {
          setTelemetry((prev) => ({
            ...prev,
            energyPercent: fly.energyPercent,
            frenzyActive: currentFrenzy,
            frenzyTimeRemaining: currentFrenzyTime
          }));
        }

        // 3. Step Predators
        const playerDir = playMode === 'PLAYER_VS_FLY' ? manualDirRef.current : undefined;
        predators.update(
          dt,
          fly.col,
          fly.row,
          fly.dir,
          fly.trail,
          difficulty,
          playerDir
        );

        // 4. Check Collisions between Fly and Predators
        for (const p of predators.predators) {
          const distPx = Math.hypot(p.x - fly.x, p.y - fly.y);
          if (distPx < TILE_SIZE * 0.75) {
            if (currentFrenzy && p.mode === 'FLEE') {
              // Fly eats predator!
              p.mode = 'EATEN';
              setTelemetry((prev) => ({
                ...prev,
                score: prev.score + 200,
                predatorsEaten: prev.predatorsEaten + 1
              }));
            } else if (p.mode === 'CHASE') {
              // Fly caught!
              fly.isAlive = false;
              setGameState('GAME_OVER');
              setTelemetry((prev) => ({
                ...prev,
                deaths: prev.deaths + 1
              }));
            }
          }
        }

        // Check Starvation
        if (fly.energyPercent <= 0) {
          fly.isAlive = false;
          setGameState('GAME_OVER');
        }

        // Check Stage Clear (all pellets eaten)
        let hasPellets = false;
        for (let r = 0; r < maze.grid.length; r++) {
          for (let c = 0; c < maze.grid[r].length; c++) {
            if (maze.grid[r][c] === 'PELLET' || maze.grid[r][c] === 'SUPER_PELLET') {
              hasPellets = true;
              break;
            }
          }
          if (hasPellets) break;
        }

        if (!hasPellets) {
          setGameState('STAGE_CLEAR');
          setTelemetry((prev) => ({
            ...prev,
            stage: prev.stage + 1,
            score: prev.score + 1000
          }));
          setTimeout(() => {
            maze.resetMaze();
            fly.reset();
            predators.resetPositions();
            setGameState('PLAYING');
          }, 2000);
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, difficulty, playMode, frenzyActive, frenzyTimer]);

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-[#E5E5E5] font-mono selection:bg-[#00E5FF] selection:text-black">
      {/* Top Header Bar */}
      <HeaderBar telemetry={telemetry} fps={fps} />

      {/* Main Game Interface */}
      <main className="flex-1 p-2 sm:p-4 max-w-[1600px] w-full mx-auto space-y-3">
        {/* UPPER SPLIT DECK: Labyrinth Canvas (Left) + Decision Matrix & Controls (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          {/* 1. Primary Maze Canvas */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="w-full relative">
              <MazeCanvas
                maze={mazeRef.current}
                fly={flyRef.current}
                predatorSystem={predatorRef.current}
                decisionVector={decisionVector}
                isFrenzyActive={frenzyActive}
                onManualInput={(dir) => {
                  manualDirRef.current = dir;
                }}
              />

              {/* Game Over / Stage Clear Overlay */}
              {gameState === 'GAME_OVER' && (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 border border-[#FF1E56] rounded-sm z-20">
                  <span className="text-[#FF1E56] text-xl font-bold tracking-widest animate-pulse mb-1">
                    CONNECTOME TERMINATED
                  </span>
                  <p className="text-xs text-[#888888] mb-4 text-center max-w-sm">
                    {flyRef.current.energyPercent <= 0
                      ? 'Metabolic energy depleted (Starvation). The fly succumbed to exhaustion.'
                      : 'Looming predator caught the fly. Giant Fiber escape was blocked.'}
                  </p>
                  <button
                    onClick={handleRestart}
                    className="px-4 py-2 bg-[#FF1E56] text-black font-bold uppercase tracking-wider text-xs rounded-sm hover:bg-[#FF3366] transition-colors"
                  >
                    PLAY AGAIN ↺
                  </button>
                </div>
              )}

              {gameState === 'STAGE_CLEAR' && (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 border border-[#00FF88] rounded-sm z-20">
                  <span className="text-[#00FF88] text-xl font-bold tracking-widest animate-pulse mb-1">
                    STAGE {telemetry.stage - 1} CLEARED!
                  </span>
                  <p className="text-xs text-[#888888] mb-2 text-center">
                    All sucrose harvested. Next stage initializing...
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 2. Decision Matrix & Control Deck */}
          <div className="lg:col-span-5 space-y-3">
            <DecisionMatrixHUD
              decision={decisionVector}
              fearLevel={decisionRef.current.fearSpikeLevel}
              rewardLevel={decisionRef.current.rewardSpikeLevel}
              ebStability={decisionRef.current.ringAttractor.getState().stability}
              energyPercent={telemetry.energyPercent}
              isFrenzyActive={frenzyActive}
            />

            <ControlDeck
              difficulty={difficulty}
              onChangeDifficulty={handleChangeDifficulty}
              playMode={playMode}
              onTogglePlayMode={handleTogglePlayMode}
              ebLesionPercent={ebLesionPercent}
              onChangeEBLesion={handleChangeEBLesion}
              gameState={gameState}
              onTogglePause={handleTogglePause}
              onRestart={handleRestart}
              onTriggerFrenzy={handleTriggerFrenzy}
            />
          </div>
        </div>

        {/* LOWER DECK: LOOK INSIDE (01 / Sensory Input + 02 / Neural Activity) */}
        <div className="border border-[#262626] bg-[#000000] rounded-sm p-3 space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#222222] pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold tracking-widest text-white uppercase">
                LOOK INSIDE
              </span>
              <span className="text-[10px] text-[#666666] hidden sm:inline">
                (CORRIDOR RETINA & FLYWIRE BRAIN ACTIVITY)
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <button
                onClick={() => setShowEyes(!showEyes)}
                className="flex items-center gap-1.5 text-[#888888] hover:text-white transition-colors"
              >
                <span>👁 EYES</span>
                <span
                  className={`w-6 h-3 rounded-full flex items-center p-0.5 border ${
                    showEyes
                      ? 'bg-[#00E5FF] border-[#00E5FF] justify-end'
                      : 'bg-[#1A1A1A] border-[#333333] justify-start'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-black block" />
                </span>
              </button>

              <button
                onClick={() => setShowBrain(!showBrain)}
                className="flex items-center gap-1.5 text-[#888888] hover:text-white transition-colors"
              >
                <span>🧠 BRAIN</span>
                <span
                  className={`w-6 h-3 rounded-full flex items-center p-0.5 border ${
                    showBrain
                      ? 'bg-[#00E5FF] border-[#00E5FF] justify-end'
                      : 'bg-[#1A1A1A] border-[#333333] justify-start'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-black block" />
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {showEyes && (
              <SensoryRetina
                decision={decisionVector}
                fearLevel={decisionRef.current.fearSpikeLevel}
                rewardLevel={decisionRef.current.rewardSpikeLevel}
                isFrenzyActive={frenzyActive}
              />
            )}
            {showBrain && (
              <BrainHUD
                ringAttractorState={decisionRef.current.ringAttractor.getState()}
                fearLevel={decisionRef.current.fearSpikeLevel}
                rewardLevel={decisionRef.current.rewardSpikeLevel}
                giantFiberActive={decisionRef.current.giantFiberEscapeActive}
                isFrenzyActive={frenzyActive}
              />
            )}
          </div>
        </div>

        {/* BOTTOM COLLAPSIBLE TECHNICAL DRAWERS */}
        <div className="space-y-2">
          <NeuronDrawer
            fearLevel={decisionRef.current.fearSpikeLevel}
            rewardLevel={decisionRef.current.rewardSpikeLevel}
            ebStability={decisionRef.current.ringAttractor.getState().stability}
            giantFiberActive={decisionRef.current.giantFiberEscapeActive}
            isFrenzyActive={frenzyActive}
          />
          <NotesDrawer />
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#262626] bg-[#000000] px-4 py-2 mt-6 flex flex-col sm:flex-row items-center justify-between text-[10px] text-[#666666]">
        <div className="flex items-center gap-2">
          <span className="text-[#00FF88] font-bold">|||</span>
          <span className="tracking-widest uppercase">
            NEURAL LABYRINTH • FLYWIRE FAFB CONNECTOME v783
          </span>
        </div>

        <div className="mt-1 sm:mt-0 font-mono tracking-wide">
          DECISION-MAKING ENGINE • HARDCORE ARCADE • 60 FPS
        </div>
      </footer>
    </div>
  );
};
