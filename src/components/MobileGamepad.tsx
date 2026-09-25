import React from 'react';
import { DoomButtons } from '../doom/types';

interface MobileGamepadProps {
  buttons: DoomButtons;
  isAutoPlay: boolean;
  isPaused: boolean;
  onToggleAutoPlay: () => void;
  onTogglePlay: () => void;
  onTouchButtonDown: (button: keyof DoomButtons) => void;
  onTouchButtonUp: (button: keyof DoomButtons) => void;
}

export const MobileGamepad: React.FC<MobileGamepadProps> = ({
  buttons,
  isAutoPlay,
  isPaused,
  onToggleAutoPlay,
  onTogglePlay,
  onTouchButtonDown,
  onTouchButtonUp
}) => {
  const triggerHaptic = (ms: number = 30) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch (_) {
        // ignore if not supported
      }
    }
  };

  const bindButton = (btn: keyof DoomButtons) => {
    return {
      onTouchStart: (e: React.TouchEvent) => {
        e.preventDefault();
        triggerHaptic(25);
        onTouchButtonDown(btn);
      },
      onTouchEnd: (e: React.TouchEvent) => {
        e.preventDefault();
        onTouchButtonUp(btn);
      },
      onTouchCancel: (e: React.TouchEvent) => {
        e.preventDefault();
        onTouchButtonUp(btn);
      },
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault();
        onTouchButtonDown(btn);
      },
      onMouseUp: (e: React.MouseEvent) => {
        e.preventDefault();
        onTouchButtonUp(btn);
      },
      onMouseLeave: () => {
        onTouchButtonUp(btn);
      }
    };
  };

  return (
    <div className="w-full bg-[#08080A] border border-[#262626] rounded-sm p-2 select-none touch-none font-mono">
      {/* Top Mobile Bar: Mode & Status Toggles */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1E1E24] text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="text-[#00E5FF] font-bold">📱 PHONE CONTROLS</span>
          <span className="text-[9px] text-[#666666] hidden xs:inline">
            (TOUCH & SWIPE SCREEN TO AIM)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onTogglePlay}
            className={`px-2 py-0.5 rounded-sm font-bold border ${
              isPaused
                ? 'bg-[#052814] text-[#00FF88] border-[#00FF88]'
                : 'bg-[#291700] text-[#FFB300] border-[#FFB300]'
            }`}
          >
            {isPaused ? '▶ PLAY' : '⏸ STOP'}
          </button>

          <button
            onClick={onToggleAutoPlay}
            className={`px-2 py-0.5 rounded-sm font-bold border ${
              isAutoPlay
                ? 'bg-[#0F1E16] text-[#00FF88] border-[#00FF88]'
                : 'bg-[#1F1708] text-[#FFB300] border-[#FFB300]'
            }`}
          >
            {isAutoPlay ? '🪰 AUTO' : '🎮 MANUAL'}
          </button>
        </div>
      </div>

      {/* Main Dual-Thumb Mobile Gamepad Layout */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 items-center">
        {/* Left Thumb: Movement & Strafe Cross (D-Pad) */}
        <div className="flex flex-col items-center">
          <div className="text-[8px] text-[#777777] uppercase tracking-wider mb-1">
            MOVE & STRAFE
          </div>

          <div className="grid grid-cols-3 grid-rows-3 gap-1 w-36 h-36 max-w-full">
            {/* Top Row: Forward */}
            <div className="col-start-2">
              <button
                {...bindButton('moveForward')}
                className={`w-full h-full flex flex-col items-center justify-center rounded-sm border active:scale-95 transition-transform ${
                  buttons.moveForward
                    ? 'bg-[#00FF88] text-black font-extrabold border-white shadow-[0_0_12px_rgba(0,255,136,0.6)]'
                    : 'bg-[#141418] text-[#00FF88] border-[#2A2A32] active:bg-[#202028]'
                }`}
              >
                <span className="text-base leading-none">▲</span>
                <span className="text-[7px] font-bold">FWD</span>
              </button>
            </div>

            {/* Middle Row: Strafe Left, Neutral, Strafe Right */}
            <div className="col-start-1 row-start-2">
              <button
                {...bindButton('strafeLeft')}
                className={`w-full h-full flex flex-col items-center justify-center rounded-sm border active:scale-95 transition-transform ${
                  buttons.strafeLeft
                    ? 'bg-[#B388FF] text-black font-extrabold border-white shadow-[0_0_12px_rgba(179,136,255,0.6)]'
                    : 'bg-[#141418] text-[#B388FF] border-[#2A2A32] active:bg-[#202028]'
                }`}
              >
                <span className="text-base leading-none">◀</span>
                <span className="text-[7px] font-bold">LEFT</span>
              </button>
            </div>

            <div className="col-start-2 row-start-2 flex items-center justify-center bg-[#0C0C10] rounded-sm border border-[#1A1A22]">
              <span className="text-[8px] text-[#555555] font-bold">PAD</span>
            </div>

            <div className="col-start-3 row-start-2">
              <button
                {...bindButton('strafeRight')}
                className={`w-full h-full flex flex-col items-center justify-center rounded-sm border active:scale-95 transition-transform ${
                  buttons.strafeRight
                    ? 'bg-[#B388FF] text-black font-extrabold border-white shadow-[0_0_12px_rgba(179,136,255,0.6)]'
                    : 'bg-[#141418] text-[#B388FF] border-[#2A2A32] active:bg-[#202028]'
                }`}
              >
                <span className="text-base leading-none">▶</span>
                <span className="text-[7px] font-bold">RIGHT</span>
              </button>
            </div>

            {/* Bottom Row: Backward */}
            <div className="col-start-2 row-start-3">
              <button
                {...bindButton('moveBackward')}
                className={`w-full h-full flex flex-col items-center justify-center rounded-sm border active:scale-95 transition-transform ${
                  buttons.moveBackward
                    ? 'bg-[#00FF88] text-black font-extrabold border-white shadow-[0_0_12px_rgba(0,255,136,0.6)]'
                    : 'bg-[#141418] text-[#00FF88] border-[#2A2A32] active:bg-[#202028]'
                }`}
              >
                <span className="text-base leading-none">▼</span>
                <span className="text-[7px] font-bold">BACK</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Thumb: Turn & Big Fire Weapon Trigger */}
        <div className="flex flex-col items-center">
          <div className="text-[8px] text-[#777777] uppercase tracking-wider mb-1">
            AIM & WEAPON
          </div>

          <div className="flex flex-col gap-2 w-36 h-36 max-w-full justify-between">
            {/* Turn Left / Turn Right Row */}
            <div className="grid grid-cols-2 gap-1.5 h-12">
              <button
                {...bindButton('turnLeft')}
                className={`flex flex-col items-center justify-center rounded-sm border active:scale-95 transition-transform ${
                  buttons.turnLeft
                    ? 'bg-[#FFB300] text-black font-extrabold border-white shadow-[0_0_12px_rgba(255,179,0,0.6)]'
                    : 'bg-[#141418] text-[#FFB300] border-[#2A2A32] active:bg-[#202028]'
                }`}
              >
                <span className="text-sm font-bold">↺ TURN</span>
                <span className="text-[7px] font-bold">LEFT</span>
              </button>

              <button
                {...bindButton('turnRight')}
                className={`flex flex-col items-center justify-center rounded-sm border active:scale-95 transition-transform ${
                  buttons.turnRight
                    ? 'bg-[#FFB300] text-black font-extrabold border-white shadow-[0_0_12px_rgba(255,179,0,0.6)]'
                    : 'bg-[#141418] text-[#FFB300] border-[#2A2A32] active:bg-[#202028]'
                }`}
              >
                <span className="text-sm font-bold">TURN ↻</span>
                <span className="text-[7px] font-bold">RIGHT</span>
              </button>
            </div>

            {/* BIG GLOWING RED FIRE BUTTON */}
            <button
              {...bindButton('fire')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-sm border-2 active:scale-95 transition-all ${
                buttons.fire
                  ? 'bg-[#FF1E56] text-white font-extrabold border-white shadow-[0_0_20px_rgba(255,30,86,0.9)] animate-pulse'
                  : 'bg-[#2A0812] text-[#FF1E56] border-[#FF1E56] hover:bg-[#3D0C1A] shadow-[0_0_10px_rgba(255,30,86,0.35)]'
              }`}
            >
              <span className="text-xl">💥</span>
              <div className="flex flex-col items-start text-left">
                <span className="text-sm sm:text-base font-extrabold leading-none tracking-wider">
                  BLAST
                </span>
                <span className="text-[8px] text-[#FFA0B2] font-mono leading-none mt-0.5">
                  12-GA SHOTGUN
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
