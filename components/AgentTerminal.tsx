"use client";

import React from "react";
import {
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { MilestoneRow } from "@/lib/supabase";

interface AgentTerminalProps {
  selectedMilestone: MilestoneRow | null;
  telemetryLogs: string[];
  onTriggerSubmitModal: (milestone: MilestoneRow) => void;
}

export default function AgentTerminal({
  selectedMilestone,
  telemetryLogs,
  onTriggerSubmitModal,
}: AgentTerminalProps) {
  return (
    <aside className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-[#E05A47]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            3. Live AI Inspector & PayPal Telemetry
          </h2>
        </div>
        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
          gemini-2.5-flash
        </span>
      </div>

      {/* Selected Milestone Criteria Breakdown */}
      {selectedMilestone ? (
        <div className="mb-5 bg-[#0B0F17] border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-mono uppercase text-[#E05A47]">
              Milestone #{selectedMilestone.sequence_order} Audit Spec
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              ${Number(selectedMilestone.amount).toFixed(2)} USD
            </span>
          </div>

          <h3 className="text-sm font-bold text-white mb-3">
            {selectedMilestone.title}
          </h3>

          <div className="space-y-2">
            {selectedMilestone.acceptance_criteria?.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-md bg-[#111827] border border-slate-800/90 text-xs"
              >
                <div className="flex items-start gap-2">
                  {item.passed === true ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : item.passed === false ? (
                    <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="text-slate-200 font-medium">
                      {item.rule}
                    </div>
                    {item.evidence && (
                      <div className="text-[11px] text-slate-400 mt-1 font-mono bg-slate-900/90 p-1.5 rounded border border-slate-800">
                        AI Evidence: {item.evidence}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Payout Receipt Card if Paid */}
          {selectedMilestone.status === "VERIFIED_PAID" && (
            <div className="mt-3 p-3 rounded-lg bg-emerald-950/30 border border-emerald-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <div className="text-xs">
                  <div className="font-bold text-emerald-300">
                    Autonomous PayPal Payout Dispatched
                  </div>
                  <div className="font-mono text-[11px] text-slate-400">
                    Batch ID: #{selectedMilestone.paypal_payout_batch_id}
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {selectedMilestone.ai_confidence_score}% Match
              </span>
            </div>
          )}

          {/* Quick Submit Trigger */}
          {(selectedMilestone.status === "AWAITING_SUBMISSION" ||
            selectedMilestone.status === "REJECTED") && (
            <button
              onClick={() => onTriggerSubmitModal(selectedMilestone)}
              className="mt-3 w-full py-2 px-3 rounded-lg bg-[#E05A47] hover:bg-[#cc4c3a] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Submit Deliverable for AI Inspection</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="mb-5 p-4 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-400">
          Select a milestone row in the AG Grid Command Center to inspect its
          verifiable rules.
        </div>
      )}

      {/* Streaming Agent Telemetry Console */}
      <div className="flex-1 flex flex-col min-h-[220px]">
        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2">
          Autonomous Agent Execution Log
        </div>
        <div className="flex-1 bg-[#0B0F17] border border-slate-800 rounded-lg p-3 font-mono text-xs space-y-2 overflow-y-auto max-h-[300px]">
          {telemetryLogs.length === 0 ? (
            <div className="text-slate-500">
              &gt; Waiting for contract creation or deliverable submission...
            </div>
          ) : (
            telemetryLogs.map((log, index) => (
              <div
                key={index}
                className={`leading-relaxed ${
                  log.includes("PAYOUT") || log.includes("PASSED")
                    ? "text-emerald-400 font-semibold"
                    : log.includes("PayPal")
                      ? "text-sky-400"
                      : log.includes("REJECTED")
                        ? "text-rose-400"
                        : "text-slate-300"
                }`}
              >
                &gt; {log}
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
