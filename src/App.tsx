import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HeaderBar } from './components/HeaderBar';
import { DoomScreen } from './components/DoomScreen';
import { DoomControls } from './components/DoomControls';
import { SensoryRetina } from './components/SensoryRetina';
import { BrainHUD } from './components/BrainHUD';
import { NeuronDrawer } from './components/NeuronDrawer';
import { NotesDrawer } from './components/NotesDrawer';
import { MobileGamepad } from './components/MobileGamepad';

import { DoomRaycaster } from './doom/raycaster';
import { DemonManager } from './doom/demonAI';
import { FlyBrainDoomAgent } from './doom/flyBrainDoomAgent';
import { DOOM_GRID, DOOM_MAP_HEIGHT, DOOM_MAP_WIDTH, getInitialDemons, getInitialItems } from './doom/doomMap';
import { DemonEntity, DoomButtons, DoomPlayer, ItemEntity } from './doom/types';

export const App: React.FC = () => {
  // Game Singletons
  const raycasterRef = useRef<DoomRaycaster>(new DoomRaycaster(640, 400));
  const demonsRef = useRef<DemonManager>(new DemonManager(getInitialDemons()));
  const itemsRef = useRef<ItemEntity[]>(getInitialItems());
  const agentRef = useRef<FlyBrainDoomAgent>(new FlyBrainDoomAgent());

  // Player state
  const playerRef = useRef<DoomPlayer>({
    x: 2.5,
    y: 2.5,
    dirX: 1.0,
    dirY: 0.0,
    planeX: 0.0,
    planeY: 0.66, // 66 degree FOV
    angleRad: 0.0,
    health: 100,
    ammo: 30,
    frags: 0,
    isShooting: false,
    shootAnimTimer: 0,
    walkBob: 0,
    hitmarkerTimer: 0,
    pickupFlash: null,
    pickupFlashTimer: 0
  });

  // UI state
  const [playerState, setPlayerState] = useState<DoomPlayer>({ ...playerRef.current });
  const [demonsState, setDemonsState] = useState<DemonEntity[]>([...demonsRef.current.demons]);
  const [buttonsState, setButtonsState] = useState<DoomButtons>({
    turnLeft: false,
    turnRight: false,
    moveForward: false,
    moveBackward: false,
    strafeLeft: false,
    strafeRight: false,
    fire: false
  });

  const [decisionReason, setDecisionReason] = useState<string>('EXPLORING CORRIDORS');
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  isPausedRef.current = isPaused;

  const [ebLesionPercent, setEbLesionPercent] = useState<number>(0);
  const [hurtFlash, setHurtFlash] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(60);
  const [demonsKilled, setDemonsKilled] = useState<number>(0);

  const [showEyes, setShowEyes] = useState<boolean>(true);
  const [showBrain, setShowBrain] = useState<boolean>(true);

  // Manual keyboard state
  const keysDownRef = useRef<Record<string, boolean>>({});

  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const fpsTimerRef = useRef<number>(0);

  // Continuous collision with true wall sliding and push-out
  const moveEntityWithSliding = useCallback(
    (currentX: number, currentY: number, dx: number, dy: number, radius = 0.2): { x: number; y: number } => {
      let newX = currentX;
      let newY = currentY;

      // 1. Move along X independently
      if (dx !== 0) {
        const targetX = currentX + dx;
        const testX = dx > 0 ? targetX + radius : targetX - radius;
        const checkCol = Math.floor(testX);

        const minY = Math.floor(currentY - radius + 0.05);
        const maxY = Math.floor(currentY + radius - 0.05);

        let blockedX = false;
        for (let r = minY; r <= maxY; r++) {
          if (checkCol < 0 || checkCol >= DOOM_MAP_WIDTH || r < 0 || r >= DOOM_MAP_HEIGHT || DOOM_GRID[r][checkCol] > 0) {
            blockedX = true;
            break;
          }
        }

        if (!blockedX) {
          newX = targetX;
        } else {
          // Slide flush against the wall boundary
          if (dx > 0) {
            newX = checkCol - radius - 0.001;
          } else {
            newX = checkCol + 1 + radius + 0.001;
          }
        }
      }

      // 2. Move along Y independently (sliding is preserved!)
      if (dy !== 0) {
        const targetY = currentY + dy;
        const testY = dy > 0 ? targetY + radius : targetY - radius;
        const checkRow = Math.floor(testY);

        const minX = Math.floor(newX - radius + 0.05);
        const maxX = Math.floor(newX + radius - 0.05);

        let blockedY = false;
        for (let c = minX; c <= maxX; c++) {
          if (checkRow < 0 || checkRow >= DOOM_MAP_HEIGHT || c < 0 || c >= DOOM_MAP_WIDTH || DOOM_GRID[checkRow][c] > 0) {
            blockedY = true;
            break;
          }
        }

        if (!blockedY) {
          newY = targetY;
        } else {
          // Slide flush against the wall boundary
          if (dy > 0) {
            newY = checkRow - radius - 0.001;
          } else {
            newY = checkRow + 1 + radius + 0.001;
          }
        }
      }

      return { x: newX, y: newY };
    },
    []
  );

  // Keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();

      // 'P' key toggles Play / Pause
      if (k === 'p') {
        setIsPaused((prev) => !prev);
        return;
      }

      // Prevent browser scrolling on space / arrow keys during gameplay
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        e.preventDefault();
      }

      keysDownRef.current[k] = true;
      if (k === ' ' || k === 'control') {
        keysDownRef.current['fire'] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        e.preventDefault();
      }
      keysDownRef.current[k] = false;
      if (k === ' ' || k === 'control') {
        keysDownRef.current['fire'] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Action handlers
  const handleToggleAutoPlay = useCallback(() => {
    setIsAutoPlay((prev) => !prev);
  }, []);

  const handleTogglePlay = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const handleSpawnDemon = useCallback(() => {
    demonsRef.current.spawnDemonInFront(playerRef.current);
    setDemonsState([...demonsRef.current.demons]);
  }, []);

  const handleChangeEBLesion = useCallback((percent: number) => {
    setEbLesionPercent(percent);
    agentRef.current.setEBLesion(percent);
  }, []);

  const handleManualButton = useCallback((btn: keyof DoomButtons) => {
    const player = playerRef.current;
    if (btn === 'fire' && player.ammo > 0 && player.shootAnimTimer <= 0) {
      player.isShooting = true;
      player.shootAnimTimer = 0.22;
      player.ammo = Math.max(0, player.ammo - 1);
      const res = demonsRef.current.shootAt(player);
      if (res.hitDemon) {
        player.hitmarkerTimer = 0.16;
      }
      if (res.killed) {
        player.frags += 1;
        setDemonsKilled((k) => k + 1);
      }
    } else if (btn === 'turnLeft') {
      player.angleRad -= 0.35;
      while (player.angleRad < -Math.PI) player.angleRad += Math.PI * 2;
      player.dirX = Math.cos(player.angleRad);
      player.dirY = Math.sin(player.angleRad);
      player.planeX = -player.dirY * 0.66;
      player.planeY = player.dirX * 0.66;
    } else if (btn === 'turnRight') {
      player.angleRad += 0.35;
      while (player.angleRad > Math.PI) player.angleRad -= Math.PI * 2;
      player.dirX = Math.cos(player.angleRad);
      player.dirY = Math.sin(player.angleRad);
      player.planeX = -player.dirY * 0.66;
      player.planeY = player.dirX * 0.66;
    } else if (btn === 'moveForward') {
      const step = 0.5;
      const res = moveEntityWithSliding(player.x, player.y, player.dirX * step, player.dirY * step, 0.2);
      player.x = res.x;
      player.y = res.y;
    } else if (btn === 'moveBackward') {
      const step = 0.4;
      const res = moveEntityWithSliding(player.x, player.y, -player.dirX * step, -player.dirY * step, 0.2);
      player.x = res.x;
      player.y = res.y;
    } else if (btn === 'strafeLeft') {
      const step = 0.4;
      const res = moveEntityWithSliding(player.x, player.y, -player.dirY * step, player.dirX * step, 0.2);
      player.x = res.x;
      player.y = res.y;
    } else if (btn === 'strafeRight') {
      const step = 0.4;
      const res = moveEntityWithSliding(player.x, player.y, player.dirY * step, -player.dirX * step, 0.2);
      player.x = res.x;
      player.y = res.y;
    }
  }, [moveEntityWithSliding]);

  // Mobile Touch Controls Handlers
  const touchButtonsRef = useRef<Record<string, boolean>>({});

  const handleTouchButtonDown = useCallback((btn: keyof DoomButtons) => {
    if (isAutoPlay) {
      setIsAutoPlay(false);
    }
    keysDownRef.current[btn] = true;
    touchButtonsRef.current[btn] = true;
  }, [isAutoPlay]);

  const handleTouchButtonUp = useCallback((btn: keyof DoomButtons) => {
    keysDownRef.current[btn] = false;
    touchButtonsRef.current[btn] = false;
  }, []);

  const handleTurnDelta = useCallback((deltaRad: number) => {
    if (isAutoPlay) {
      setIsAutoPlay(false);
    }
    const player = playerRef.current;
    player.angleRad += deltaRad;
    while (player.angleRad > Math.PI) player.angleRad -= Math.PI * 2;
    while (player.angleRad < -Math.PI) player.angleRad += Math.PI * 2;
    player.dirX = Math.cos(player.angleRad);
    player.dirY = Math.sin(player.angleRad);
    player.planeX = -player.dirY * 0.66;
    player.planeY = player.dirX * 0.66;
  }, [isAutoPlay]);

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

      const player = playerRef.current;
      const demons = demonsRef.current;
      const items = itemsRef.current;
      const agent = agentRef.current;

      // If paused, keep pushing state to UI but don't advance physics simulation
      if (isPausedRef.current) {
        setPlayerState({ ...player });
        setDemonsState([...demons.demons]);
        animId = requestAnimationFrame(gameLoop);
        return;
      }

      // Update timers
      if (player.shootAnimTimer > 0) {
        player.shootAnimTimer -= dt;
        if (player.shootAnimTimer <= 0) {
          player.isShooting = false;
        }
      }
      if (player.hitmarkerTimer && player.hitmarkerTimer > 0) {
        player.hitmarkerTimer -= dt;
      }
      if (player.pickupFlashTimer && player.pickupFlashTimer > 0) {
        player.pickupFlashTimer -= dt;
      }

      // 1. Determine Button Commands
      let currentButtons: DoomButtons = {
        turnLeft: false,
        turnRight: false,
        moveForward: false,
        moveBackward: false,
        strafeLeft: false,
        strafeRight: false,
        fire: false
      };

      if (isAutoPlay) {
        // Connectome Brain Agent selects buttons
        const agentOut = agent.step(dt, player, demons.demons, items);
        currentButtons = agentOut.buttons;
        setDecisionReason(agentOut.reason);
      } else {
        // Manual player controls (WASD / Arrows / Space / Q & E / Mobile Touch)
        const keys = keysDownRef.current;
        const touch = touchButtonsRef.current;
        currentButtons = {
          turnLeft: !!(keys['arrowleft'] || keys['left'] || touch['turnLeft']),
          turnRight: !!(keys['arrowright'] || keys['right'] || touch['turnRight']),
          moveForward: !!(keys['w'] || keys['arrowup'] || touch['moveForward']),
          moveBackward: !!(keys['s'] || keys['arrowdown'] || touch['moveBackward']),
          strafeLeft: !!(keys['a'] || keys['q'] || touch['strafeLeft']),
          strafeRight: !!(keys['d'] || keys['e'] || touch['strafeRight']),
          fire: !!(keys['fire'] || keys[' '] || touch['fire'])
        };
        setDecisionReason('MANUAL PLAYER CONTROL');
      }

      setButtonsState(currentButtons);

      // 2. Execute Rotation (Turning)
      const rotSpeed = (isAutoPlay ? 2.2 : 3.2) * dt;
      if (currentButtons.turnLeft) {
        player.angleRad -= rotSpeed;
      }
      if (currentButtons.turnRight) {
        player.angleRad += rotSpeed;
      }
      // Keep angleRad strictly normalized within (-π, π)
      while (player.angleRad > Math.PI) player.angleRad -= Math.PI * 2;
      while (player.angleRad < -Math.PI) player.angleRad += Math.PI * 2;

      // Exact mathematical direction and camera plane vectors (zero precision drift)
      player.dirX = Math.cos(player.angleRad);
      player.dirY = Math.sin(player.angleRad);
      player.planeX = -player.dirY * 0.66;
      player.planeY = player.dirX * 0.66;

      // 3. Execute Translation (Forward, Backward, Strafe Left, Strafe Right with true wall sliding)
      const moveSpeed = 3.6 * dt;
      let moveDx = 0;
      let moveDy = 0;

      if (currentButtons.moveForward) {
        moveDx += player.dirX * moveSpeed;
        moveDy += player.dirY * moveSpeed;
        player.walkBob = (player.walkBob || 0) + dt * 10;
      }
      if (currentButtons.moveBackward) {
        const backSpeed = moveSpeed * 0.7;
        moveDx -= player.dirX * backSpeed;
        moveDy -= player.dirY * backSpeed;
        player.walkBob = (player.walkBob || 0) + dt * 8;
      }
      if (currentButtons.strafeLeft) {
        const strafeSpeed = moveSpeed * 0.75;
        moveDx -= player.dirY * strafeSpeed;
        moveDy += player.dirX * strafeSpeed;
        player.walkBob = (player.walkBob || 0) + dt * 8;
      }
      if (currentButtons.strafeRight) {
        const strafeSpeed = moveSpeed * 0.75;
        moveDx += player.dirY * strafeSpeed;
        moveDy -= player.dirX * strafeSpeed;
        player.walkBob = (player.walkBob || 0) + dt * 8;
      }

      if (moveDx !== 0 || moveDy !== 0) {
        const moved = moveEntityWithSliding(player.x, player.y, moveDx, moveDy, 0.2);
        player.x = moved.x;
        player.y = moved.y;
      }

      // 4. Execute Fire (Shotgun Blast)
      if (currentButtons.fire && player.shootAnimTimer <= 0 && player.ammo > 0) {
        player.isShooting = true;
        player.shootAnimTimer = 0.22;
        player.ammo = Math.max(0, player.ammo - 1);

        const shotResult = demons.shootAt(player);
        if (shotResult.hitDemon) {
          player.hitmarkerTimer = 0.16;
        }
        if (shotResult.killed) {
          player.frags += 1;
          setDemonsKilled((k) => k + 1);
        }
      }

      // 5. Update Demons (Pathfinding & Attacks)
      const demonOut = demons.update(dt, player);
      if (demonOut.playerDamage > 0) {
        player.health = Math.max(0, player.health - demonOut.playerDamage);
        setHurtFlash(true);
        setTimeout(() => setHurtFlash(false), 120);

        if (player.health <= 0) {
          // Respawn player at safe hangar position
          player.health = 100;
          player.ammo = 30;
          player.x = 2.5;
          player.y = 2.5;
          player.angleRad = 0;
          player.dirX = 1;
          player.dirY = 0;
          player.planeX = 0;
          player.planeY = 0.66;

          // Push any demons clustering around spawn point back to prevent spawn camping
          for (const d of demons.demons) {
            if (d.state !== 'DEAD' && Math.hypot(d.x - 2.5, d.y - 2.5) < 3.5) {
              d.x = 8.5;
              d.y = 3.5;
              d.state = 'IDLE';
            }
          }
        }
      }

      // 6. Check Item Pickups
      for (const it of items) {
        if (!it.pickedUp && Math.hypot(it.x - player.x, it.y - player.y) < 0.9) {
          it.pickedUp = true;
          player.pickupFlash = it.type;
          player.pickupFlashTimer = 0.25;
          if (it.type === 'HEALTH') {
            player.health = Math.min(100, player.health + 35);
          } else {
            player.ammo = Math.min(50, player.ammo + 20);
          }
        }
      }

      // Push states to UI
      setPlayerState({ ...player });
      setDemonsState([...demons.demons]);

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [isAutoPlay]);

  const activeDemons = demonsState.filter((d) => d.state !== 'DEAD').length;

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-[#E5E5E5] font-mono selection:bg-[#FF1E56] selection:text-white">
      {/* Top Header Bar */}
      <HeaderBar
        player={playerState}
        fps={fps}
        demonsKilled={demonsKilled}
        isPaused={isPaused}
        onTogglePlay={handleTogglePlay}
      />

      {/* Main DOOM Console Area */}
      <main className="flex-1 p-2 sm:p-4 max-w-[1600px] w-full mx-auto space-y-3">
        {/* UPPER SPLIT DECK: 3D DOOM Screen (Left) + NEURON->BUTTON Controls (Right) */}
        {/* 3D DOOM Screen — full width, dominant */}
        <div className="w-full">
          <DoomScreen
            raycaster={raycasterRef.current}
            player={playerState}
            demons={demonsState}
            items={itemsRef.current}
            hurtFlash={hurtFlash}
            isPaused={isPaused}
            onTogglePlay={handleTogglePlay}
            onShoot={() => handleManualButton('fire')}
            onTurnDelta={handleTurnDelta}
          />
        </div>

        {/* MOBILE TOUCH GAMEPAD: Responsive phone touchscreen controller */}
        <div className="w-full">
          <MobileGamepad
            buttons={buttonsState}
            isAutoPlay={isAutoPlay}
            isPaused={isPaused}
            onToggleAutoPlay={handleToggleAutoPlay}
            onTogglePlay={handleTogglePlay}
            onTouchButtonDown={handleTouchButtonDown}
            onTouchButtonUp={handleTouchButtonUp}
          />
        </div>

        {/* NEURON -> BUTTON Control Deck — compact strip below the game */}
        <div className="w-full">
          <DoomControls
            buttons={buttonsState}
            reason={decisionReason}
            isAutoPlay={isAutoPlay}
            onToggleAutoPlay={handleToggleAutoPlay}
            isPaused={isPaused}
            onTogglePlay={handleTogglePlay}
            onSpawnDemon={handleSpawnDemon}
            ebLesionPercent={ebLesionPercent}
            onChangeEBLesion={handleChangeEBLesion}
            onManualButton={handleManualButton}
            demonsAlive={activeDemons}
          />
        </div>

        {/* LOWER DECK: LOOK INSIDE (01 / Sensory Input + 02 / Neural Activity) */}
        <div className="border border-[#262626] bg-[#000000] rounded-sm p-3 space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#222222] pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold tracking-widest text-white uppercase">
                LOOK INSIDE
              </span>
              <span className="text-[10px] text-[#666666] hidden sm:inline">
                (COMPOUND EYE RAYCAST SCAN & FLYWIRE CONNECTOME FIRING)
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
                retinalRays={raycasterRef.current.retinalRays}
                fearLevel={agentRef.current.fearSpikeLevel}
                rewardLevel={agentRef.current.rewardSpikeLevel}
              />
            )}
            {showBrain && (
              <BrainHUD
                ringAttractorState={agentRef.current.ringAttractor.getState()}
                fearLevel={agentRef.current.fearSpikeLevel}
                rewardLevel={agentRef.current.rewardSpikeLevel}
                giantFiberActive={agentRef.current.giantFiberActive}
                isFrenzyActive={playerState.isShooting}
              />
            )}
          </div>
        </div>

        {/* BOTTOM COLLAPSIBLE TECHNICAL DRAWERS */}
        <div className="space-y-2">
          <NeuronDrawer
            fearLevel={agentRef.current.fearSpikeLevel}
            rewardLevel={agentRef.current.rewardSpikeLevel}
            ebStability={agentRef.current.ringAttractor.getState().stability}
            giantFiberActive={agentRef.current.giantFiberActive}
            isFrenzyActive={playerState.isShooting}
            dng01Forward={agentRef.current.dng01ForwardLevel}
            dng02Steering={agentRef.current.dng02SteeringLevel}
            dnp09Saccade={agentRef.current.dnp09SaccadeLevel}
          />
          <NotesDrawer />
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#262626] bg-[#000000] px-4 py-2 mt-6 flex flex-col sm:flex-row items-center justify-between text-[10px] text-[#666666]">
        <div className="flex items-center gap-2">
          <span className="text-[#FF1E56] font-bold">|||</span>
          <span className="tracking-widest uppercase">
            DOOM-FLY • FLYWIRE FAFB CONNECTOME v783
          </span>
        </div>

        <div className="mt-1 sm:mt-0 font-mono tracking-wide">
          REAL-TIME NEURAL DECISION AGENT • 3D RAYCASTER • 60 FPS
        </div>
      </footer>
    </div>
  );
};
