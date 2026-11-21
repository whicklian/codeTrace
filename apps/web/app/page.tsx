'use client';

import React, { useState } from 'react';
import { CodeEditor } from '../components/CodeEditor';
import { MemoryCanvas } from '../components/MemoryCanvas';
import { SqlPlanTree } from '../components/SqlPlanTree';
import { SocraticDrawer } from '../components/SocraticDrawer';
import {
  Play,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Database,
  Cpu,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';

const CPP_SEGFAULT_DEMO = `// Demo 1: Linked-List Deletion Bug (Dangling Pointer)
#include <iostream>

struct Node {
    int data;
    Node* next;
};

int main() {
    Node* head = new Node{10, nullptr};
    head->next = new Node{20, nullptr};

    Node* curr = head;

    // BUG: Freeing memory BEFORE advancing the pointer
    free(curr);
    curr = curr->next; // CRASH: Read from freed memory!

    return 0;
}
`;

const SQL_JOIN_DEMO = `-- Demo 2: Unindexed 50,000 Rows JOIN Bottleneck
SELECT 
    s.id AS student_id,
    s.name,
    e.course_id,
    e.grade
FROM enrollments e
JOIN students s ON e.student_id = s.id
WHERE e.grade >= 'B';

-- Optimization: Add Index to turn Seq Scan into Index Only Scan:
-- CREATE INDEX idx_enrollments_student_grade ON enrollments(student_id, grade);
`;

const SQL_INDEXED_DEMO = `-- Demo 2 (Optimized): Index Only Scan Active
SELECT 
    s.id AS student_id,
    s.name,
    e.course_id,
    e.grade
FROM enrollments e
JOIN students s ON e.student_id = s.id
WHERE e.grade >= 'B' -- idx_enrollments_student_grade active
`;

export default function Home() {
  const [mode, setMode] = useState<'cpp' | 'sql'>('cpp');
  const [code, setCode] = useState<string>(CPP_SEGFAULT_DEMO);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [steps, setSteps] = useState<any[]>([]);
  const [faultSummary, setFaultSummary] = useState<any>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [sqlResult, setSqlResult] = useState<any>(null);

  const handleRunTrace = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('http://localhost:3001/api/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: mode }),
      });
      const data = await res.json();

      if (mode === 'sql') {
        setSqlResult(data);
      } else {
        if (data.steps && data.steps.length > 0) {
          setSteps(data.steps);
          setCurrentStepIndex(0);
          setFaultSummary(data.fault_summary);
        } else if (data.fault_summary) {
          setFaultSummary(data.fault_summary);
        }
      }
    } catch {
      // Local fallback for offline demo
      if (mode === 'cpp') {
        setSteps([
          { step: 1, line: 10, function: 'main', variables: [{ name: 'head', value: '0x55a010', address: '0x7ffd01' }] },
          { step: 2, line: 11, function: 'main', variables: [{ name: 'head', value: '0x55a010', address: '0x7ffd01' }] },
          { step: 3, line: 13, function: 'main', variables: [{ name: 'head', value: '0x55a010', address: '0x7ffd01' }, { name: 'curr', value: '0x55a010', address: '0x7ffd08' }] },
          { step: 4, line: 16, function: 'main', variables: [{ name: 'head', value: '0x55a010', address: '0x7ffd01' }, { name: 'curr', value: '0x55a010 (FREED)', address: '0x7ffd08' }] },
        ]);
        setFaultSummary({ signal: 'SIGSEGV', meaning: 'Segmentation fault', line: 17, function: 'main' });
        setCurrentStepIndex(3);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleStepNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleStepPrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
    setSteps([]);
    setFaultSummary(null);
    setSqlResult(null);
  };

  const currentStep = steps[currentStepIndex] || null;
  const currentLine = currentStep ? currentStep.line : null;
  const faultLine = faultSummary?.line || null;

  return (
    <main className="flex flex-col h-screen w-screen overflow-hidden bg-[#090d16]">
      {/* Navbar */}
      <header className="h-14 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30">
            CT
          </div>
          <span className="font-bold text-base tracking-tight text-white">
            Code<span className="text-blue-500">Trace</span>
          </span>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
            Interactive CS Visualizer
          </span>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => {
              setMode('cpp');
              setCode(CPP_SEGFAULT_DEMO);
              handleReset();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              mode === 'cpp' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            C/C++ Memory Trace
          </button>
          <button
            onClick={() => {
              setMode('sql');
              setCode(SQL_JOIN_DEMO);
              handleReset();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              mode === 'sql' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            SQL Query Plan
          </button>
        </div>

        {/* Quick Demo Pre-sets */}
        <div className="flex items-center gap-2">
          {mode === 'sql' && (
            <button
              onClick={() => {
                setCode(SQL_INDEXED_DEMO);
                handleReset();
              }}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono flex items-center gap-1 hover:bg-emerald-900/40"
            >
              <Zap className="w-3 h-3" />
              Apply Index (2ms)
            </button>
          )}

          <button
            onClick={handleRunTrace}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isRunning ? 'Tracing...' : 'Run Trace'}
          </button>
        </div>
      </header>

      {/* Main Two-Column Split Workspace */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* Left Column: Monaco Code Editor & Step Controls */}
        <div className="w-1/2 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-900/40 border border-slate-800/80 rounded-xl">
            <span className="text-xs font-mono text-slate-400">
              Source Editor ({mode.toUpperCase()})
            </span>

            {mode === 'cpp' && steps.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-300">
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
                <button
                  onClick={handleStepPrev}
                  disabled={currentStepIndex === 0}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleStepNext}
                  disabled={currentStepIndex === steps.length - 1}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={handleReset}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                  title="Reset"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            <CodeEditor
              code={code}
              language={mode}
              onChange={(val) => setCode(val || '')}
              currentLine={currentLine}
              faultLine={faultLine}
            />
          </div>
        </div>

        {/* Right Column: Visualization Canvas (Memory Graph or SQL Tree) */}
        <div className="w-1/2 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-900/40 border border-slate-800/80 rounded-xl">
            <span className="text-xs font-mono text-slate-400">
              {mode === 'cpp' ? 'Interactive Memory Canvas (Stack ➔ Heap)' : 'PostgreSQL EXPLAIN Execution Tree'}
            </span>
          </div>

          <div className="flex-1 overflow-hidden">
            {mode === 'cpp' ? (
              <MemoryCanvas
                variables={currentStep ? currentStep.variables : []}
                faultSummary={faultSummary}
              />
            ) : (
              <SqlPlanTree
                planData={sqlResult?.plan}
                metrics={sqlResult?.metrics}
              />
            )}
          </div>
        </div>
      </div>

      {/* Socratic AI Tutor Drawer */}
      <SocraticDrawer
        code={code}
        language={mode}
        currentLine={currentLine || faultLine}
        faultSummary={faultSummary}
      />
    </main>
  );
}
