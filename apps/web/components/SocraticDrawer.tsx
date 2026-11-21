'use client';

import React, { useState } from 'react';
import { Sparkles, MessageSquare, HelpCircle, Loader2, Send } from 'lucide-react';

interface SocraticDrawerProps {
  code: string;
  language: string;
  currentLine: number | null;
  faultSummary: any;
}

export const SocraticDrawer: React.FC<SocraticDrawerProps> = ({
  code,
  language,
  currentLine,
  faultSummary,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [studentQuestion, setStudentQuestion] = useState('');

  const fetchHint = async (customQ?: string) => {
    setLoading(true);
    setIsOpen(true);
    try {
      const res = await fetch('http://localhost:3001/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          currentLine,
          faultSummary,
          studentQuestion: customQ || studentQuestion || "I'm stuck. What went wrong on this line?",
        }),
      });
      const data = await res.json();
      setHint(data.hint || data.error || 'Check the memory address of the pointer on this line.');
    } catch {
      setHint('Notice the pointer being dereferenced at this step: what address did it point to before vs after the free() call?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-30 flex items-center gap-2">
        <button
          onClick={() => fetchHint()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 text-xs tracking-wide uppercase"
        >
          <HelpCircle className="w-4 h-4 text-slate-950" />
          I'm Stuck
        </button>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold shadow-lg text-xs tracking-wide"
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          Socratic AI
        </button>
      </div>

      {/* Drawer Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-40 w-96 max-w-[90vw] bg-[#0f1422] border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col transition-all">
          <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-900/60">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
              <span className="text-xs font-semibold text-slate-200 tracking-wider uppercase">
                Gemini Socratic Tutor
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5 rounded"
            >
              ✕
            </button>
          </div>

          <div className="p-4 space-y-3 min-h-[140px] max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                <span className="text-xs font-mono">Analyzing memory trace & fault...</span>
              </div>
            ) : hint ? (
              <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-3.5 text-xs text-purple-200 leading-relaxed font-sans shadow-inner">
                <div className="flex items-center gap-1.5 text-purple-400 font-semibold mb-1 text-[11px] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Guiding Question:
                </div>
                {hint}
              </div>
            ) : (
              <div className="text-xs text-slate-400 text-center py-4">
                Click <strong>"I'm Stuck"</strong> or ask a question below to receive targeted Socratic hints without spoiling the solution.
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-800 bg-slate-900/40 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask about this memory state..."
              value={studentQuestion}
              onChange={(e) => setStudentQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchHint(studentQuestion)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
            />
            <button
              disabled={loading}
              onClick={() => fetchHint(studentQuestion)}
              className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
