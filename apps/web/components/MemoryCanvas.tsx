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
import { AlertCircle, Box, Database, ArrowRight } from 'lucide-react';

interface Variable {
  name: string;
  value: string;
  address: string | null;
}

interface MemoryCanvasProps {
  variables: Variable[];
  faultSummary: {
    signal: string;
    meaning: string;
    line: number | null;
  } | null;
}

// Custom Node for Stack Frame
const StackFrameNode = ({ data }: { data: any }) => {
  return (
    <div className="bg-[#121829] border border-blue-500/40 rounded-xl p-4 shadow-xl min-w-[240px]">
      <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-800 text-xs font-semibold tracking-wider text-blue-400 uppercase">
        <Box className="w-4 h-4 text-blue-400" />
        Stack Frame (main)
      </div>
      <div className="space-y-2">
        {data.variables.length === 0 ? (
          <div className="text-xs text-slate-500 italic">No local variables allocated yet</div>
        ) : (
          data.variables.map((v: Variable, idx: number) => {
            const isPointer = v.name.includes('ptr') || v.value.startsWith('0x');
            return (
              <div
                key={idx}
                className="relative flex items-center justify-between text-xs bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800"
              >
                <div>
                  <span className="font-mono text-purple-300 font-semibold">{v.name}</span>
                  {v.address && (
                    <div className="text-[10px] text-slate-500 font-mono">@{v.address.slice(-6)}</div>
                  )}
                </div>
                <div className="text-right">
                  <span className={`font-mono ${isPointer ? 'text-amber-300' : 'text-emerald-400'}`}>
                    {v.value}
                  </span>
                </div>
                {isPointer && (
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`var-${v.name}`}
                    style={{ background: '#38bdf8', right: -6 }}
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

// Custom Node for Heap Object
const HeapObjectNode = ({ data }: { data: any }) => {
  const isDangling = data.isDangling;
  return (
    <div
      className={`border rounded-xl p-4 shadow-2xl min-w-[220px] transition-all duration-300 ${
        isDangling
          ? 'bg-red-950/40 border-red-500 ring-2 ring-red-500/50'
          : 'bg-[#151c2e] border-slate-700'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id={`target-${data.address}`}
        style={{ background: isDangling ? '#ef4444' : '#10b981', left: -6 }}
      />
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-mono">
        <span className="text-slate-400">Heap Chunk</span>
        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
          isDangling ? 'bg-red-900/60 text-red-200' : 'bg-emerald-950 text-emerald-400'
        }`}>
          {data.address}
        </span>
      </div>
      <div className="text-xs space-y-1 font-mono">
        <div className="flex justify-between">
          <span className="text-slate-400">val:</span>
          <span className="text-slate-200">{data.val ?? 42}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">next:</span>
          <span className="text-amber-400">{data.next ?? 'nullptr'}</span>
        </div>
      </div>
      {isDangling && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-red-400 font-semibold bg-red-900/30 px-2 py-1 rounded">
          <AlertCircle className="w-3.5 h-3.5" />
          DANGLING / FREED MEMORY
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

    // 1. Stack Node
    n.push({
      id: 'stack-main',
      type: 'stackNode',
      position: { x: 50, y: 80 },
      data: { variables },
    });

    // 2. Identify pointers & create Heap target nodes
    variables.forEach((v, idx) => {
      if (v.value && (v.value.startsWith('0x') || v.name.includes('ptr') || v.name.includes('curr') || v.name.includes('head'))) {
        const addr = v.value.startsWith('0x') ? v.value : '0x55a010';
        const isNull = v.value === '0x0' || v.value === '0' || v.value.toLowerCase().includes('null');
        const isDangling = !!faultSummary && (v.name.includes('curr') || v.name.includes('bad_ptr') || faultSummary.signal === 'SIGSEGV');

        if (!isNull) {
          const heapId = `heap-${addr}`;
          n.push({
            id: heapId,
            type: 'heapNode',
            position: { x: 380 + (idx * 20), y: 60 + (idx * 110) },
            data: {
              address: addr,
              val: 100 + idx * 5,
              next: idx === 0 ? '0x55a040' : 'nullptr',
              isDangling,
            },
          });

          // Edge from Stack Var to Heap Node
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
            label: isDangling ? 'CRASH: Dereference of freed memory' : undefined,
            labelStyle: { fill: '#f87171', fontWeight: 700, fontSize: 11 },
          });
        }
      }
    });

    return { nodes: n, edges: e };
  }, [variables, faultSummary]);

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-800 bg-[#0a0e19]">
      {faultSummary && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-red-950/80 border border-red-500/80 text-red-200 px-3 py-2 rounded-lg text-xs font-mono backdrop-blur-md shadow-2xl animate-pulse">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>
            <strong>{faultSummary.signal}</strong>: {faultSummary.meaning} (Culprit line: {faultSummary.line ?? 'Active'})
          </span>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        className="bg-[#0a0e19]"
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls className="bg-slate-900 border border-slate-800 fill-slate-200 text-slate-200" />
        <MiniMap
          nodeColor={(node) => (node.type === 'stackNode' ? '#3b82f6' : '#10b981')}
          maskColor="rgba(10, 13, 20, 0.8)"
          className="bg-slate-900 border border-slate-800 rounded-lg"
        />
      </ReactFlow>
    </div>
  );
};
