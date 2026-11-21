'use client';

import React, { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
  Position,
  Handle,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { AlertCircle, Box, Database, ArrowRight, Layers, Cpu, ShieldAlert } from 'lucide-react';

interface Variable {
  name: string;
  value: string;
  address: string | null;
  type?: string;
}

interface MemoryCanvasProps {
  variables: Variable[];
  faultSummary: {
    signal: string;
    meaning: string;
    line: number | null;
    function?: string | null;
  } | null;
}

// Stack Frame Node
const StackFrameNode = ({ data }: { data: any }) => {
  return (
    <div className="bg-[#101524] border border-blue-500/50 rounded-xl p-3.5 shadow-2xl min-w-[260px] backdrop-blur-md">
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800 text-xs font-semibold tracking-wider text-blue-400 uppercase">
        <div className="flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-blue-400" />
          <span>Stack Frame (0x7ffd...)</span>
        </div>
        <span className="text-[10px] bg-blue-950 text-blue-300 px-1.5 py-0.5 rounded font-mono">
          ↓ grows down
        </span>
      </div>

      <div className="space-y-1.5">
        {data.variables.length === 0 ? (
          <div className="text-xs text-slate-500 italic py-2 text-center">
            No active stack variables
          </div>
        ) : (
          data.variables.map((v: Variable, idx: number) => {
            const isPointer = v.name.includes('ptr') || v.name.includes('head') || v.name.includes('curr') || v.name.includes('root') || v.value.startsWith('0x');
            return (
              <div
                key={idx}
                className="relative flex items-center justify-between text-xs bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800"
              >
                <div>
                  <span className="font-mono text-purple-300 font-bold">{v.name}</span>
                  {v.address && (
                    <div className="text-[9px] text-slate-500 font-mono">
                      &amp;{v.name} = {v.address.slice(-6)}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className={`font-mono font-medium ${isPointer ? 'text-amber-300' : 'text-emerald-400'}`}>
                    {v.value}
                  </span>
                </div>
                {isPointer && (
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`var-${v.name}`}
                    style={{ background: '#38bdf8', right: -6, width: 8, height: 8 }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// Heap Chunk / Object Node
const HeapObjectNode = ({ data }: { data: any }) => {
  const isDangling = data.isDangling;
  return (
    <div
      className={`border rounded-xl p-3.5 shadow-2xl min-w-[230px] transition-all duration-300 backdrop-blur-md ${
        isDangling
          ? 'bg-red-950/40 border-red-500 ring-2 ring-red-500/50 shadow-red-900/40'
          : 'bg-[#131a2c] border-slate-700/80 hover:border-slate-500'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id={`target-${data.address}`}
        style={{ background: isDangling ? '#ef4444' : '#10b981', left: -6, width: 8, height: 8 }}
      />
      
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-mono">
        <span className="text-slate-400 font-semibold">{data.type || 'Heap Block'}</span>
        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
          isDangling ? 'bg-red-900 text-red-200' : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
        }`}>
          {data.address}
        </span>
      </div>

      <div className="text-xs space-y-1.5 font-mono">
        {data.fields ? (
          Object.entries(data.fields).map(([k, val]: [string, any]) => (
            <div key={k} className="flex justify-between items-center bg-slate-900/60 px-2 py-1 rounded">
              <span className="text-slate-400">{k}:</span>
              <span className={typeof val === 'string' && val.startsWith('0x') ? 'text-amber-300 font-bold' : 'text-slate-200'}>
                {String(val)}
              </span>
            </div>
          ))
        ) : (
          <>
            <div className="flex justify-between bg-slate-900/60 px-2 py-1 rounded">
              <span className="text-slate-400">val:</span>
              <span className="text-slate-200 font-bold">{data.val ?? 10}</span>
            </div>
            <div className="flex justify-between bg-slate-900/60 px-2 py-1 rounded">
              <span className="text-slate-400">next:</span>
              <span className="text-amber-300">{data.next ?? 'nullptr'}</span>
            </div>
          </>
        )}
      </div>

      {isDangling && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-red-300 font-bold bg-red-900/50 border border-red-500/60 px-2 py-1 rounded animate-pulse">
          <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          <span>FREED MEMORY (DEALLOCATED)</span>
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  stackNode: StackFrameNode,
  heapNode: HeapObjectNode,
};

export const MemoryCanvas: React.FC<MemoryCanvasProps> = ({ variables, faultSummary }) => {
  const { nodes, edges } = useMemo(() => {
    const n: Node[] = [];
    const e: Edge[] = [];

    // 1. Stack Frame Node
    n.push({
      id: 'stack-main',
      type: 'stackNode',
      position: { x: 40, y: 70 },
      data: { variables },
    });

    // 2. Identify Pointers & Objects -> Heap Nodes
    variables.forEach((v, idx) => {
      const isPointer = v.name.includes('ptr') || v.name.includes('head') || v.name.includes('curr') || v.name.includes('root') || v.name.includes('acc') || v.value.startsWith('0x');

      if (isPointer && v.value && v.value !== '0x0' && v.value !== 'nullptr') {
        const addr = v.value.startsWith('0x') ? v.value.split(' ')[0] : '0x55a010';
        const isDangling = !!faultSummary && (v.name.includes('curr') || v.value.includes('FREED') || faultSummary.signal === 'SIGSEGV');

        const heapId = `heap-${addr}-${idx}`;
        n.push({
          id: heapId,
          type: 'heapNode',
          position: { x: 380 + (idx * 30), y: 50 + (idx * 130) },
          data: {
            address: addr,
            type: v.type || 'Node Object',
            val: 10 + idx * 10,
            next: idx === 0 ? '0x55a040' : 'nullptr',
            fields: v.name.includes('acc') ? { owner: 'Alice', balance: '$1250.00' } : undefined,
            isDangling,
          },
        });

        // Edge from Stack Var to Heap Target
        e.push({
          id: `edge-${v.name}-${heapId}`,
          source: 'stack-main',
          sourceHandle: `var-${v.name}`,
          target: heapId,
          targetHandle: `target-${addr}`,
          animated: !isDangling,
          style: {
            stroke: isDangling ? '#ef4444' : '#38bdf8',
            strokeWidth: isDangling ? 3 : 2,
            strokeDasharray: isDangling ? '5,5' : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isDangling ? '#ef4444' : '#38bdf8',
          },
          label: isDangling ? 'DANGLING POINTER DEREFERENCE' : undefined,
          labelStyle: { fill: '#f87171', fontWeight: 800, fontSize: 10 },
        });
      }
    });

    return { nodes: n, edges: e };
  }, [variables, faultSummary]);

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-800 bg-[#080b14]">
      {/* Fault Alert Badge */}
      {faultSummary && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-red-950/90 border border-red-500 text-red-200 px-3 py-1.5 rounded-lg text-xs font-mono backdrop-blur-md shadow-2xl ring-2 ring-red-500/40">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>
            <strong>{faultSummary.signal}</strong>: {faultSummary.meaning} (Line: {faultSummary.line ?? 'Active statement'})
          </span>
        </div>
      )}

      {/* Memory Segment Header Overlay */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-3 text-[10px] font-mono bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 backdrop-blur-md">
        <span className="flex items-center gap-1 text-blue-400">
          <div className="w-2 h-2 rounded-full bg-blue-500" /> Stack: 0x7ffd...
        </span>
        <span className="flex items-center gap-1 text-emerald-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500" /> Heap: 0x55a0...
        </span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        className="bg-[#080b14]"
      >
        <Background color="#1a2333" gap={20} size={1} />
        <Controls className="bg-slate-900 border border-slate-800 fill-slate-200 text-slate-200" />
        <MiniMap
          nodeColor={(node) => (node.type === 'stackNode' ? '#3b82f6' : '#10b981')}
          maskColor="rgba(8, 11, 20, 0.85)"
          className="bg-slate-900 border border-slate-800 rounded-lg"
        />
      </ReactFlow>
    </div>
  );
};
