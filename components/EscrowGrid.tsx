"use client";

import React, { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  ColDef,
  ICellRendererParams,
  themeQuartz,
} from "ag-grid-community";
import {
  CheckCircle2,
  Clock,
  Lock,
  UploadCloud,
  Sparkles,
  XCircle,
  Eye,
  Search,
} from "lucide-react";
import { MilestoneRow } from "@/lib/supabase";

// Register AG Grid v33+ Community Modules
ModuleRegistry.registerModules([AllCommunityModule]);

// Custom Dark Slate Neo-Brutalist AG Grid Theme
const proofPayGridTheme = themeQuartz.withParams({
  backgroundColor: "#0B0F17",
  foregroundColor: "#F1F5F9",
  headerBackgroundColor: "#111827",
  headerTextColor: "#94A3B8",
  borderColor: "#1E293B",
  rowHoverColor: "#1E293B80",
  fontFamily: "inherit",
  fontSize: 13,
  headerFontSize: 11,
});

interface EscrowGridProps {
  milestones: MilestoneRow[];
  role: "CLIENT" | "FREELANCER";
  onOpenSubmitModal: (milestone: MilestoneRow) => void;
  onSelectMilestoneForInspect: (milestone: MilestoneRow) => void;
  onInspectReceipt: (milestone: MilestoneRow) => void; // <-- NEW PROP
}

export default function EscrowGrid({
  milestones,
  role,
  onOpenSubmitModal,
  onSelectMilestoneForInspect,
  onInspectReceipt,
}: EscrowGridProps) {
  const [quickFilterText, setQuickFilterText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredRows = useMemo(() => {
    if (statusFilter === "ALL") return milestones;
    return milestones.filter((m) => m.status === statusFilter);
  }, [milestones, statusFilter]);

  const columnDefs = useMemo<ColDef<MilestoneRow>[]>(
    () => [
      {
        headerName: "#",
        field: "sequence_order",
        width: 65,
        cellRenderer: (params: ICellRendererParams<MilestoneRow>) => (
          <span className="font-mono text-xs font-bold text-slate-400">
            M{params.value}
          </span>
        ),
      },
      {
        headerName: "MILESTONE & VERIFIABLE CRITERIA",
        field: "title",
        flex: 2,
        minWidth: 260,
        cellRenderer: (params: ICellRendererParams<MilestoneRow>) => {
          const row = params.data;
          if (!row) return null;
          const passedCount =
            row.acceptance_criteria?.filter((c) => c.passed === true).length ||
            0;
          const totalCount = row.acceptance_criteria?.length || 0;

          return (
            <div className="py-1.5 leading-tight">
              <div className="font-semibold text-slate-100 text-sm">
                {row.title}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                <span className="font-mono px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700">
                  {row.deliVerable_type}
                </span>
                <span>
                  {passedCount}/{totalCount} AI Criteria Verified
                </span>
              </div>
            </div>
          );
        },
      },
      {
        headerName: "ESCROW AMOUNT",
        field: "amount",
        width: 140,
        cellRenderer: (params: ICellRendererParams<MilestoneRow>) => (
          <span className="font-mono font-bold text-emerald-400 text-sm">
            ${Number(params.value || 0).toFixed(2)}
          </span>
        ),
      },
      {
        headerName: "AI CONFIDENCE",
        field: "ai_confidence_score",
        width: 165,
        enableCellChangeFlash: true,
        cellRenderer: (params: ICellRendererParams<MilestoneRow>) => {
          const score = Number(params.value || 0);
          const barColor =
            score >= 85
              ? "bg-emerald-500"
              : score > 0
                ? "bg-rose-500"
                : "bg-slate-700";

          return (
            <div className="flex items-center gap-2.5 h-full">
              <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className={`h-full ${barColor} transition-all duration-500`}
                  style={{ width: `${Math.min(100, score)}%` }}
                />
              </div>
              <span className="font-mono text-xs text-slate-200 font-semibold">
                {score > 0 ? `${score}%` : "--"}
              </span>
            </div>
          );
        },
      },
      {
        headerName: "ESCROW & PAYPAL STATUS",
        field: "status",
        width: 195,
        enableCellChangeFlash: true,
        cellRenderer: (params: ICellRendererParams<MilestoneRow>) => {
          const status = params.value as MilestoneRow["status"];

          switch (status) {
            case "VERIFIED_PAID":
              return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/70">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  PAYOUT RELEASED
                </span>
              );
            case "AI_AUDITING":
              return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-amber-950/80 text-amber-300 border border-amber-600/70 animate-pulse">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                  AI AUDITING...
                </span>
              );
            case "AWAITING_SUBMISSION":
              return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-sky-950/80 text-sky-300 border border-sky-700/70">
                  <Clock className="h-3.5 w-3.5 text-sky-400" />
                  READY FOR PROOF
                </span>
              );
            case "REJECTED":
              return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-rose-950/80 text-rose-300 border border-rose-700/70">
                  <XCircle className="h-3.5 w-3.5 text-rose-400" />
                  FIX REQUIRED
                </span>
              );
            default:
              return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800">
                  <Lock className="h-3 w-3" />
                  LOCKED IN ESCROW
                </span>
              );
          }
        },
      },
      {
        headerName: "PAYPAL BATCH ID",
        field: "paypal_payout_batch_id",
        width: 175,
        cellRenderer: (params: ICellRendererParams<MilestoneRow>) => {
          const row = params.data;
          if (!row || !params.value) {
            return (
              <span className="text-xs font-mono text-slate-600">
                Pending Audit
              </span>
            );
          }
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInspectReceipt(row);
              }}
              title="Click to inspect raw PayPal Sandbox JSON response"
              className="font-mono text-xs text-sky-300 hover:text-white bg-sky-950/60 hover:bg-[#0070BA] px-2.5 py-1 rounded border border-sky-700/70 transition cursor-pointer inline-flex items-center gap-1"
            >
              <span>#{String(params.value).slice(0, 12)}</span>
              <span className="text-[10px] opacity-75">JSON ↗</span>
            </button>
          );
        },
      },
      {
        headerName: "ACTION",
        width: 175,
        pinned: "right",
        cellRenderer: (params: ICellRendererParams<MilestoneRow>) => {
          const row = params.data;
          if (!row) return null;

          const canSubmit =
            row.status === "AWAITING_SUBMISSION" || row.status === "REJECTED";

          if (role === "FREELANCER" && canSubmit) {
            return (
              <button
                onClick={() => onOpenSubmitModal(row)}
                className="px-3 py-1.5 rounded-md bg-[#E05A47] hover:bg-[#cc4c3a] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow transition cursor-pointer"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Submit Deliverable
              </button>
            );
          }

          return (
            <button
              onClick={() => onSelectMilestoneForInspect(row)}
              className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5 text-sky-400" />
              Inspect Rules
            </button>
          );
        },
      },
    ],
    [role, onOpenSubmitModal, onSelectMilestoneForInspect, onInspectReceipt],
  );

  return (
    <section className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-lg">
      {/* Grid Header & Filtering Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              2. AG Grid Autonomous Escrow Command Center
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
              Realtime Ledger
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any row to inspect its Gemini Vision checklist & autonomous
            PayPal Payout receipt.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Pills Filter */}
          {(
            ["ALL", "AWAITING_SUBMISSION", "VERIFIED_PAID", "LOCKED"] as const
          ).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`text-xs font-mono px-2.5 py-1 rounded border transition cursor-pointer ${
                statusFilter === st
                  ? "bg-[#E05A47]/20 border-[#E05A47] text-white"
                  : "bg-[#0B0F17] border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {st === "ALL" ? "All Rows" : st.replace("_", " ")}
            </button>
          ))}

          {/* AG Grid Quick Search */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-2" />
            <input
              type="text"
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              placeholder="Filter milestones..."
              className="bg-[#0B0F17] border border-slate-800 rounded-md pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-[#E05A47]"
            />
          </div>
        </div>
      </div>

      {/* AG Grid Container */}
      <div className="w-full h-[320px] rounded-lg overflow-hidden border border-slate-800">
        <AgGridReact<MilestoneRow>
          theme={proofPayGridTheme}
          rowData={filteredRows}
          columnDefs={columnDefs}
          quickFilterText={quickFilterText}
          rowHeight={62}
          headerHeight={38}
          animateRows={true}
          getRowId={(params) => params.data.id}
          onRowClicked={(e) => {
            if (e.data) onSelectMilestoneForInspect(e.data);
          }}
        />
      </div>
    </section>
  );
}
