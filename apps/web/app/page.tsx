'use client';

import React, { useState } from 'react';
import { CodeEditor } from '../components/CodeEditor';
import { MemoryCanvas } from '../components/MemoryCanvas';
import { SqlPlanTree } from '../components/SqlPlanTree';
import { SocraticDrawer } from '../components/SocraticDrawer';
import { FileTree } from '../components/FileTree';
import { TerminalOutput } from '../components/TerminalOutput';
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
  Terminal,
  Code2,
  Coffee,
  Boxes,
} from 'lucide-react';

// Preset Templates
const TEMPLATES: Record<string, { language: string; files: Record<string, string>; entryFile: string }> = {
  cpp_linkedlist: {
    language: 'cpp',
    entryFile: 'main.cpp',
    files: {
      'main.cpp': `// C++ Linked-List Deletion with Segfault Interception
#include <iostream>
#include "LinkedList.h"

int main() {
    LinkedList list;
    list.insert(10);
    list.insert(20);
    list.insert(30);

    std::cout << "List created with 3 nodes." << std::endl;

    // Trigger deliberate dangling pointer bug
    list.buggyDeleteHead();

    return 0;
}
`,
      'LinkedList.h': `#pragma once
#include <iostream>

struct Node {
    int val;
    Node* next;
};

class LinkedList {
private:
    Node* head;
public:
    LinkedList() : head(nullptr) {}
    void insert(int v);
    void buggyDeleteHead();
};
`,
      'LinkedList.cpp': `#include "LinkedList.h"

void LinkedList::insert(int v) {
    Node* n = new Node{v, head};
    head = n;
}

void LinkedList::buggyDeleteHead() {
    if (!head) return;
    Node* curr = head;
    
    // BUG: Freeing memory BEFORE advancing pointer
    free(curr);
    curr = curr->next; // CRASH / DANGLING ACCESS
}
`
    }
  },
  python_tree: {
    language: 'python',
    entryFile: 'main.py',
    files: {
      'main.py': `# Python Binary Search Tree & Traversal
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def insert(root, val):
    if not root:
        return TreeNode(val)
    if val < root.val:
        root.left = insert(root.left, val)
    else:
        root.right = insert(root.right, val)
    return root

def inorder(root, res):
    if not root:
        return
    inorder(root.left, res)
    res.append(root.val)
    inorder(root.right, res)

root = None
for v in [50, 30, 70, 20, 40, 60, 80]:
    root = insert(root, v)

traversal = []
inorder(root, traversal)
print("Inorder BST:", traversal)
`
    }
  },
  java_oop: {
    language: 'java',
    entryFile: 'BankApp.java',
    files: {
      'BankApp.java': `// Java OOP Account Management
public class BankApp {
    public static void main(String[] args) {
        BankAccount acc1 = new BankAccount("Alice", 1000.0);
        BankAccount acc2 = new BankAccount("Bob", 500.0);

        acc1.deposit(250.0);
        acc1.transfer(acc2, 400.0);

        System.out.println("Alice Balance: " + acc1.getBalance());
        System.out.println("Bob Balance: " + acc2.getBalance());
    }
}

class BankAccount {
    private String owner;
    private double balance;

    public BankAccount(String owner, double balance) {
        this.owner = owner;
        this.balance = balance;
    }

    public void deposit(double amt) {
        this.balance += amt;
    }

    public void transfer(BankAccount target, double amt) {
        if (this.balance >= amt) {
            this.balance -= amt;
            target.deposit(amt);
        }
    }

    public double getBalance() {
        return this.balance;
    }
}
`
    }
  },
  sql_university: {
    language: 'sql',
    entryFile: 'queries.sql',
    files: {
      'queries.sql': `-- PostgreSQL Query Execution Plan Demonstration
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
`
    }
  }
};

export default function Home() {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('cpp');
  const [files, setFiles] = useState<Record<string, string>>(TEMPLATES.cpp_linkedlist.files);
  const [activeFile, setActiveFile] = useState<string>('main.cpp');
  const [activeView, setActiveView] = useState<'visualizer' | 'terminal'>('visualizer');

  // Tracing State
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [steps, setSteps] = useState<any[]>([]);
  const [faultSummary, setFaultSummary] = useState<any>(null);
  const [isTracing, setIsTracing] = useState<boolean>(false);

  // Build & Run State
  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const [buildResult, setBuildResult] = useState<any>(null);

  // SQL Result
  const [sqlResult, setSqlResult] = useState<any>(null);

  const activeCode = files[activeFile] || '';

  const handleCodeChange = (newVal: string | undefined) => {
    if (newVal !== undefined) {
      setFiles((prev) => ({
        ...prev,
        [activeFile]: newVal,
      }));
    }
  };

  const handleCreateFile = (fileName: string) => {
    setFiles((prev) => ({
      ...prev,
      [fileName]: `// ${fileName}\n`,
    }));
    setActiveFile(fileName);
  };

  const handleDeleteFile = (fileName: string) => {
    if (Object.keys(files).length <= 1) return;
    const updated = { ...files };
    delete updated[fileName];
    setFiles(updated);
    setActiveFile(Object.keys(updated)[0]);
  };

  const handleLoadTemplate = (key: string) => {
    const tmpl = TEMPLATES[key];
    if (tmpl) {
      setSelectedLanguage(tmpl.language);
      setFiles(tmpl.files);
      setActiveFile(tmpl.entryFile);
      handleReset();
    }
  };

  // 1. Build and Run Multi-File Project
  const handleBuildAndRun = async () => {
    setIsBuilding(true);
    setActiveView('terminal');
    try {
      const res = await fetch('http://localhost:3001/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files,
          entryFile: activeFile,
          language: selectedLanguage,
        }),
      });
      const data = await res.json();
      setBuildResult(data);
    } catch (err: any) {
      setBuildResult({
        success: false,
        stage: 'build',
        buildOutput: 'Failed to connect to API server at http://localhost:3001',
        stdout: '',
        stderr: err.message,
        exitCode: 1,
        durationMs: 0,
      });
    } finally {
      setIsBuilding(false);
    }
  };

  // 2. Step Debug / Interactive Trace
  const handleRunTrace = async () => {
    setIsTracing(true);
    setActiveView('visualizer');
    try {
      const res = await fetch('http://localhost:3001/api/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: activeCode, language: selectedLanguage }),
      });
      const data = await res.json();

      if (selectedLanguage === 'sql') {
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
      // Local fallback simulation
      if (selectedLanguage === 'cpp') {
        setSteps([
          { step: 1, line: 9, function: 'main', variables: [{ name: 'list', value: '{head: 0x55a010}', address: '0x7ffd00' }] },
          { step: 2, line: 10, function: 'main', variables: [{ name: 'list', value: '{head: 0x55a010}', address: '0x7ffd00' }] },
          { step: 3, line: 17, function: 'buggyDeleteHead', variables: [{ name: 'curr', value: '0x55a010 (FREED)', address: '0x7ffd10' }] },
        ]);
        setFaultSummary({ signal: 'SIGSEGV', meaning: 'Segmentation fault', line: 18, function: 'buggyDeleteHead' });
        setCurrentStepIndex(2);
      }
    } finally {
      setIsTracing(false);
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
      <header className="h-14 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30">
            CT
          </div>
          <span className="font-bold text-base tracking-tight text-white">
            Code<span className="text-blue-500">Trace</span>
          </span>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
            Universal CS Visualizer & Debugger
          </span>
        </div>

        {/* Multi-Language Selector */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          {[
            { id: 'cpp', label: 'C++', icon: Cpu },
            { id: 'c', label: 'C', icon: Cpu },
            { id: 'python', label: 'Python', icon: Code2 },
            { id: 'java', label: 'Java', icon: Coffee },
            { id: 'javascript', label: 'JS/TS', icon: Code2 },
            { id: 'sql', label: 'SQL', icon: Database },
          ].map((lang) => {
            const Icon = lang.icon;
            const isSelected = selectedLanguage === lang.id;
            return (
              <button
                key={lang.id}
                onClick={() => {
                  setSelectedLanguage(lang.id);
                  if (lang.id === 'cpp') handleLoadTemplate('cpp_linkedlist');
                  if (lang.id === 'python') handleLoadTemplate('python_tree');
                  if (lang.id === 'java') handleLoadTemplate('java_oop');
                  if (lang.id === 'sql') handleLoadTemplate('sql_university');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                {lang.label}
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Build and Run */}
          <button
            onClick={handleBuildAndRun}
            disabled={isBuilding}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isBuilding ? 'Building...' : 'Build & Run'}
          </button>

          {/* Debug / Trace */}
          <button
            onClick={handleRunTrace}
            disabled={isTracing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 transition"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            {isTracing ? 'Tracing...' : 'Step Trace'}
          </button>
        </div>
      </header>

      {/* Main 3-Pane Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Multi-file Explorer */}
        <FileTree
          files={files}
          activeFile={activeFile}
          onSelectFile={setActiveFile}
          onCreateFile={handleCreateFile}
          onDeleteFile={handleDeleteFile}
          onLoadTemplate={handleLoadTemplate}
        />

        {/* Center Pane: Editor & Step Controls */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800 p-2 gap-2">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/40 border border-slate-800/80 rounded-xl">
            <span className="text-xs font-mono text-slate-300 font-semibold truncate">
              {activeFile}
            </span>

            {/* Stepping controls */}
            {steps.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">
                  Step {currentStepIndex + 1}/{steps.length}
                </span>
                <button
                  onClick={handleStepPrev}
                  disabled={currentStepIndex === 0}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleStepNext}
                  disabled={currentStepIndex === steps.length - 1}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleReset}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            <CodeEditor
              code={activeCode}
              language={selectedLanguage}
              onChange={handleCodeChange}
              currentLine={currentLine}
              faultLine={faultLine}
            />
          </div>
        </div>

        {/* Right Pane: Visualizer OR Terminal Console */}
        <div className="w-[45%] flex flex-col p-2 gap-2 min-w-0">
          {/* View Tab Switcher */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/40 border border-slate-800/80 rounded-xl">
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setActiveView('visualizer')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition ${
                  activeView === 'visualizer'
                    ? 'bg-blue-600/30 text-blue-300 font-semibold border border-blue-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>
                  {selectedLanguage === 'sql' ? 'SQL Query Plan' : 'Memory & OOP Graph'}
                </span>
              </button>
              <button
                onClick={() => setActiveView('terminal')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition ${
                  activeView === 'terminal'
                    ? 'bg-blue-600/30 text-blue-300 font-semibold border border-blue-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Build & Terminal Output</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {activeView === 'terminal' ? (
              <TerminalOutput
                buildOutput={buildResult?.buildOutput}
                stdout={buildResult?.stdout}
                stderr={buildResult?.stderr}
                exitCode={buildResult?.exitCode}
                durationMs={buildResult?.durationMs}
                onClear={() => setBuildResult(null)}
              />
            ) : selectedLanguage === 'sql' ? (
              <SqlPlanTree
                planData={sqlResult?.plan}
                metrics={sqlResult?.metrics}
              />
            ) : (
              <MemoryCanvas
                variables={currentStep ? currentStep.variables : []}
                faultSummary={faultSummary}
              />
            )}
          </div>
        </div>
      </div>

      {/* Socratic AI Tutor Drawer */}
      <SocraticDrawer
        code={activeCode}
        language={selectedLanguage}
        currentLine={currentLine || faultLine}
        faultSummary={faultSummary}
      />
    </main>
  );
}
