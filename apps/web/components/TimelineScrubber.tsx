'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Gauge,
  AlertTriangle,
} from 'lucide-react';

interface TimelineScrubberProps {
  currentStepIndex: number;
  totalSteps: number;
  faultStepIndex?: number | null;
  onStepChange: (index: number | ((prev: number) => number)) => void;
  onReset: () => void;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  currentStepIndex,
  totalSteps,
  faultStepIndex,
  onStepChange,
  onReset,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(800); // 800ms default
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        onStepChange((prev) => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speedMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, totalSteps, speedMs, onStepChange]);

  const togglePlay = () => {
    if (currentStepIndex >= totalSteps - 1) {
      onStepChange(0);
    }
    setIsPlaying(!isPlaying);
  };

  if (totalSteps <= 1) return null;

  return (
    <div className="w-full flex items-center justify-between px-4 py-2.5 bg-[#0c101c] border-t border-slate-800 text-xs select-none">
      {/* Playback Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => {
            setIsPlaying(false);
            onStepChange(0);
          }}
          disabled={currentStepIndex === 0}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 transition"
          title="Jump to Start"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => {
            setIsPlaying(false);
            onStepChange(Math.max(0, currentStepIndex - 1));
          }}
          disabled={currentStepIndex === 0}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 transition"
          title="Step Back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={togglePlay}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition shadow ${
            isPlaying
              ? 'bg-amber-600 hover:bg-amber-500 text-slate-950'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
          title={isPlaying ? 'Pause auto-play' : 'Auto-play execution steps'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        <button
          onClick={() => {
            setIsPlaying(false);
            onStepChange(Math.min(totalSteps - 1, currentStepIndex + 1));
          }}
          disabled={currentStepIndex >= totalSteps - 1}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 transition"
          title="Step Forward"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            setIsPlaying(false);
            onStepChange(totalSteps - 1);
          }}
          disabled={currentStepIndex >= totalSteps - 1}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 transition"
          title="Jump to End / Crash"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => {
            setIsPlaying(false);
            onReset();
          }}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          title="Reset Trace"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrubber Slider */}
      <div className="flex-1 mx-6 flex items-center gap-3">
        <span className="font-mono text-slate-400 text-[11px] shrink-0">
          Step {currentStepIndex + 1} / {totalSteps}
        </span>

        <div className="flex-1 relative flex items-center">
          <input
            type="range"
            min={0}
            max={totalSteps - 1}
            value={currentStepIndex}
            onChange={(e) => {
              setIsPlaying(false);
              onStepChange(parseInt(e.target.value));
            }}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />

          {faultStepIndex !== undefined && faultStepIndex !== null && (
            <div
              style={{ left: `${(faultStepIndex / (totalSteps - 1)) * 100}%` }}
              className="absolute -top-1 w-3 h-3 bg-red-500 rounded-full shadow-lg shadow-red-500/80 -translate-x-1/2 pointer-events-none animate-ping"
              title="Runtime Fault / Segfault point"
            />
          )}
        </div>
      </div>

      {/* Speed Selector */}
      <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
        <Gauge className="w-3.5 h-3.5 text-blue-400" />
        <span>Speed:</span>
        <select
          value={speedMs}
          onChange={(e) => setSpeedMs(parseInt(e.target.value))}
          className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-1.5 py-0.5 text-xs focus:outline-none"
        >
          <option value={1500}>0.5x (Slow)</option>
          <option value={800}>1.0x (Normal)</option>
          <option value={400}>2.0x (Fast)</option>
          <option value={200}>4.0x (Hyper)</option>
        </select>
      </div>
    </div>
  );
};
