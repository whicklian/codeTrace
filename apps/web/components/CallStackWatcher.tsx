'use client';

import React, { useState } from 'react';
import { Layers, Eye, Plus, Trash2, ArrowUpRight, Activity } from 'lucide-react';

interface Variable {
  name: string;
  value: string;
  address: string | null;
  type?: string;
}

interface CallStackFrame {
  function: string;
  line: number;
  file?: string;
}

interface CallStackWatcherProps {
  currentStep: any;
  previousStep: any;
  stackFrames?: CallStackFrame[];
}

export const CallStackWatcher: React.FC<CallStackWatcherProps> = ({
  currentStep,
  previousStep,
  stackFrames = [],
}) => {
  const [watchExpressions, setWatchExpressions] = useState<string[]>(['curr', 'head']);
  const [newExpr, setNewExpr] = useState('');

  const variables: Variable[] = currentStep?.variables || [];
  const prevVars: Variable[] = previousStep?.variables || [];

  const handleAddExpr = (e: React.FormEvent) => {
    e.preventDefault();
    if (newExpr.trim() && !watchExpressions.includes(newExpr.trim())) {
      setWatchExpressions([...watchExpressions, newExpr.trim()]);
      setNewExpr('');
    }
  };

  const handleRemoveExpr = (expr: string) => {
    setWatchExpressions(watchExpressions.filter((e) => e !== expr));
  };

  // Check if variable changed in this step
  const hasChanged = (v: Variable) => {
    const prev = prevVars.find((pv) => pv.name === v.name);
    return prev && prev.value !== v.value;
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#080c16] border border-slate-800 rounded-xl overflow-hidden text-xs font-mono shadow-2xl">
      {/* Call Stack Section */}
      <div className="border-b border-slate-800">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/80 text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>Call Stack (Frames)</span>
        </div>
        <div className="p-2 space-y-1 max-h-32 overflow-y-auto">
          {stackFrames.length === 0 ? (
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-blue-950/30 border border-blue-500/30 rounded-lg text-blue-300">
              <span className="font-semibold">{currentStep?.function || 'main()'}</span>
              <span className="text-[10px] text-slate-400">line {currentStep?.line || 1}</span>
            </div>
          ) : (
            stackFrames.map((frame, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border ${
                  idx === 0
                    ? 'bg-blue-950/40 border-blue-500/40 text-blue-200'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-400'
                }`}
              >
                <span>{frame.function}</span>
                <span className="text-[10px] text-slate-500">line {frame.line}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Variables & Scope Inspection */}
      <div className="flex-1 flex flex-col border-b border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Scope Variables</span>
          </div>
          <span className="text-[10px] text-slate-500">{variables.length} active</span>
        </div>

        <div className="flex-1 p-2 overflow-y-auto space-y-1.5">
          {variables.length === 0 ? (
            <div className="text-slate-600 italic px-2 py-3 text-center">
              No local variables in current frame
            </div>
          ) : (
            variables.map((v, idx) => {
              const changed = hasChanged(v);
              const isPtr = v.value.startsWith('0x') || v.name.includes('ptr') || v.name.includes('curr') || v.name.includes('head');

              return (
                <div
                  key={idx}
                  className={`p-2 rounded-lg border transition-all ${
                    changed
                      ? 'bg-amber-950/20 border-amber-500/60 ring-1 ring-amber-500/40'
                      : 'bg-slate-900/40 border-slate-800/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-purple-300">{v.name}</span>
                      {v.type && (
                        <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded">
                          {v.type}
                        </span>
                      )}
                    </div>
                    {changed && (
                      <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded animate-pulse">
                        UPDATED
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    <span className={`font-mono ${isPtr ? 'text-amber-300' : 'text-emerald-400'}`}>
                      {v.value}
                    </span>
                    {v.address && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        &amp; = {v.address}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Watch Expressions */}
      <div className="h-44 flex flex-col bg-slate-950/80">
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Watch Expressions</span>
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleAddExpr} className="px-2 py-1.5 border-b border-slate-800 flex gap-1">
          <input
            type="text"
            placeholder="Add watch (e.g. curr->next)..."
            value={newExpr}
            onChange={(e) => setNewExpr(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded"
          >
            <Plus className="w-3 h-3" />
          </button>
        </form>

        <div className="flex-1 p-2 overflow-y-auto space-y-1">
          {watchExpressions.map((expr) => {
            const matchingVar = variables.find((v) => v.name === expr);
            return (
              <div
                key={expr}
                className="flex items-center justify-between px-2 py-1 bg-slate-900/60 rounded border border-slate-800 text-[11px]"
              >
                <span className="text-purple-300 font-semibold">{expr}:</span>
                <span className="text-slate-200 font-mono">
                  {matchingVar ? matchingVar.value : '<not in scope>'}
                </span>
                <button
                  onClick={() => handleRemoveExpr(expr)}
                  className="text-slate-500 hover:text-red-400 ml-2"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
