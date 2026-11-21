'use client';

import React, { useState } from 'react';
import { Terminal, CheckCircle2, XCircle, Clock, Trash2, Copy } from 'lucide-react';

interface TerminalOutputProps {
  buildOutput?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  durationMs?: number;
  onClear?: () => void;
}

export const TerminalOutput: React.FC<TerminalOutputProps> = ({
  buildOutput,
  stdout,
  stderr,
  exitCode,
  durationMs,
  onClear,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'stdout' | 'build' | 'stderr'>('all');

  const isSuccess = exitCode === 0;

  return (
    <div className="w-full h-full flex flex-col bg-[#080b13] border border-slate-800 rounded-xl overflow-hidden font-mono text-xs shadow-2xl">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px]">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Terminal & Build Console</span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2 py-0.5 rounded ${activeTab === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All Output
            </button>
            <button
              onClick={() => setActiveTab('stdout')}
              className={`px-2 py-0.5 rounded ${activeTab === 'stdout' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              stdout
            </button>
            <button
              onClick={() => setActiveTab('build')}
              className={`px-2 py-0.5 rounded ${activeTab === 'build' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Build Log
            </button>
            <button
              onClick={() => setActiveTab('stderr')}
              className={`px-2 py-0.5 rounded ${activeTab === 'stderr' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              stderr
            </button>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-3">
          {durationMs !== undefined && (
            <div className="flex items-center gap-1 text-slate-400 text-[11px]">
              <Clock className="w-3 h-3" />
              <span>{durationMs}ms</span>
            </div>
          )}

          {exitCode !== undefined && exitCode !== null && (
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                isSuccess
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-red-950/60 border-red-500/50 text-red-300'
              }`}
            >
              {isSuccess ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
              <span>Exit: {exitCode}</span>
            </div>
          )}

          {onClear && (
            <button
              onClick={onClear}
              className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition"
              title="Clear Console"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Content Body */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 selection:bg-slate-700">
        {!buildOutput && !stdout && !stderr ? (
          <div className="text-slate-600 italic">No output yet. Click "Build & Run" or "Run Trace" to execute your code.</div>
        ) : (
          <>
            {(activeTab === 'all' || activeTab === 'build') && buildOutput && (
              <div className="space-y-1">
                <div className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">
                  [Build Stage]
                </div>
                <pre className="text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-900/40 p-2 rounded border border-slate-800/60">
                  {buildOutput}
                </pre>
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'stdout') && stdout && (
              <div className="space-y-1">
                <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                  [Standard Output]
                </div>
                <pre className="text-emerald-300 whitespace-pre-wrap leading-relaxed bg-slate-900/40 p-2 rounded border border-slate-800/60">
                  {stdout}
                </pre>
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'stderr') && stderr && (
              <div className="space-y-1">
                <div className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">
                  [Standard Error / Exceptions]
                </div>
                <pre className="text-red-300 whitespace-pre-wrap leading-relaxed bg-red-950/20 p-2 rounded border border-red-900/40">
                  {stderr}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
