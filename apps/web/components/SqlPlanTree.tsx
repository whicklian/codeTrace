'use client';

import React from 'react';
import { Database, Zap, Layers, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface SqlPlanNode {
  "Node Type": string;
  "Relation Name"?: string;
  "Alias"?: string;
  "Startup Cost": number;
  "Total Cost": number;
  "Plan Rows": number;
  "Plan Width": number;
  "Actual Startup Time"?: number;
  "Actual Total Time"?: number;
  "Actual Rows"?: number;
  "Actual Loops"?: number;
  "Filter"?: string;
  "Rows Removed by Filter"?: number;
  "Index Name"?: string;
  "Index Cond"?: string;
  "Hash Cond"?: string;
  "Plans"?: SqlPlanNode[];
}

interface SqlPlanTreeProps {
  planData?: {
    Plan: SqlPlanNode;
    "Planning Time": number;
    "Execution Time": number;
  } | null;
  metrics?: {
    isFullTableScan: boolean;
    bottleneckNode: string;
    totalCost: number;
    executionTimeMs: number;
    recommendation?: string;
  } | null;
}

const PlanNodeCard: React.FC<{ node: SqlPlanNode; depth?: number }> = ({ node, depth = 0 }) => {
  const nodeType = node["Node Type"];
  const isSeqScan = nodeType === 'Seq Scan';
  const isIndexScan = nodeType.includes('Index');

  const badgeColor = isSeqScan
    ? 'bg-red-950/80 border-red-500/80 text-red-300'
    : isIndexScan
    ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
    : 'bg-blue-950/80 border-blue-500/80 text-blue-300';

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-72 p-3.5 rounded-xl border backdrop-blur-md transition-all shadow-xl ${
          isSeqScan
            ? 'bg-red-950/20 border-red-500/70 shadow-red-900/20 ring-1 ring-red-500/40'
            : isIndexScan
            ? 'bg-emerald-950/20 border-emerald-500/70 shadow-emerald-900/20 ring-1 ring-emerald-500/40'
            : 'bg-slate-900/90 border-slate-700/80'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${badgeColor}`}>
            {nodeType}
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {node["Actual Total Time"] ? `${node["Actual Total Time"]} ms` : `Cost: ${node["Total Cost"]}`}
          </span>
        </div>

        <div className="text-xs space-y-1 font-mono">
          {node["Relation Name"] && (
            <div className="text-slate-300 font-semibold flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              table: <span className="text-white">{node["Relation Name"]}</span>
              {node["Alias"] && <span className="text-slate-500">({node["Alias"]})</span>}
            </div>
          )}

          {node["Index Name"] && (
            <div className="text-emerald-400 text-[11px] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              index: {node["Index Name"]}
            </div>
          )}

          {node["Filter"] && (
            <div className="text-[11px] text-amber-300/90 truncate" title={node["Filter"]}>
              filter: {node["Filter"]}
            </div>
          )}

          <div className="flex justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-400">
            <span>Rows: <strong className="text-slate-200">{node["Actual Rows"] ?? node["Plan Rows"]}</strong></span>
            {node["Rows Removed by Filter"] !== undefined && (
              <span className="text-red-400">Filtered: {node["Rows Removed by Filter"]}</span>
            )}
          </div>
        </div>
      </div>

      {node.Plans && node.Plans.length > 0 && (
        <div className="flex flex-col items-center w-full mt-2">
          <div className="w-0.5 h-6 bg-slate-700" />
          <div className="flex gap-4 justify-center items-start pt-2 border-t border-slate-700">
            {node.Plans.map((child, idx) => (
              <PlanNodeCard key={idx} node={child} depth={depth + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const SqlPlanTree: React.FC<SqlPlanTreeProps> = ({ planData, metrics }) => {
  if (!planData) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2 p-8 border border-slate-800 rounded-xl bg-[#0c101b]">
        <Database className="w-8 h-8 text-slate-600" />
        <p className="text-sm">Run an SQL query with EXPLAIN to inspect query tree nodes and bottleneck scans.</p>
      </div>
    );
  }

  const isFast = (planData["Execution Time"] || 0) < 10;

  return (
    <div className="w-full h-full flex flex-col border border-slate-800 rounded-xl bg-[#0c101b] overflow-hidden">
      {/* Top Metrics Banner */}
      <div className="flex items-center justify-between p-4 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Execution Time:</span>
            <strong className={`px-2 py-0.5 rounded text-sm ${isFast ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
              {planData["Execution Time"]} ms
            </strong>
          </div>
          <div className="text-xs font-mono text-slate-400">
            Planning: <strong className="text-slate-200">{planData["Planning Time"]} ms</strong>
          </div>
        </div>

        {metrics && (
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-mono ${
            metrics.isFullTableScan ? 'bg-red-950/80 text-red-300 border border-red-500/50' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50'
          }`}>
            {metrics.isFullTableScan ? <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{metrics.bottleneckNode}</span>
          </div>
        )}
      </div>

      {metrics?.recommendation && (
        <div className={`px-4 py-2 text-xs font-mono border-b ${
          metrics.isFullTableScan
            ? 'bg-red-950/30 border-red-900/50 text-red-300'
            : 'bg-emerald-950/30 border-emerald-900/50 text-emerald-300'
        }`}>
          💡 {metrics.recommendation}
        </div>
      )}

      {/* Interactive Plan Graph */}
      <div className="flex-1 overflow-auto p-8 flex justify-center items-start">
        <PlanNodeCard node={planData.Plan} />
      </div>
    </div>
  );
};
