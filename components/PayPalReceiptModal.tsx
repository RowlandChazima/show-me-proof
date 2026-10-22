// components/PayPalReceiptModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  ShieldCheck,
  Copy,
  Check,
  FileCode2,
  ArrowRight,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { supabase, MilestoneRow, PayoutLedgerRow } from "@/lib/supabase";

interface PayPalReceiptModalProps {
  milestone: MilestoneRow | null;
  onClose: () => void;
}

export default function PayPalReceiptModal({
  milestone,
  onClose,
}: PayPalReceiptModalProps) {
  const [ledgerEntry, setLedgerEntry] = useState<PayoutLedgerRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!milestone) return;

    async function fetchLedgerReceipt() {
      setLoading(true);
      const { data, error } = await supabase
        .from("payout_ledger")
        .select("*")
        .eq("milestone_id", milestone!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setLedgerEntry(data as PayoutLedgerRow);
      } else {
        setLedgerEntry(null);
      }
      setLoading(false);
    }

    fetchLedgerReceipt();
  }, [milestone]);

  if (!milestone) return null;

  const jsonPayload = JSON.stringify(
    ledgerEntry?.raw_paypal_response || {
      batch_header: {
        payout_batch_id: milestone.paypal_payout_batch_id,
        batch_status: "SUCCESS",
        sender_batch_header: {
          email_subject: "ProofPay AI Verified Milestone Payout Released!",
        },
      },
      note: "Autonomous Payout triggered via ProofPay Inspector Agent",
    },
    null,
    2,
  );

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-xl max-w-2xl w-full p-6 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-[#0070BA]/20 border border-[#0070BA]/50 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400">
                  PayPal Sandbox Telemetry Receipt
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                  {ledgerEntry?.paypal_status || "SUCCESS"}
                </span>
              </div>
              <h3 className="text-base font-bold text-white">
                Batch #{milestone.paypal_payout_batch_id}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs font-mono">
            <Loader2 className="h-5 w-5 animate-spin text-sky-400" />
            <span>Loading immutable PayPal Sandbox ledger record...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Metadata Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#0B0F17] border border-slate-800 rounded-lg p-3.5">
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-400">
                  Verified Milestone
                </div>
                <div className="text-xs font-semibold text-white mt-0.5 truncate">
                  M{milestone.sequence_order}: {milestone.title}
                </div>
                <div className="text-[11px] font-mono text-emerald-400 mt-0.5">
                  AI Confidence: {milestone.ai_confidence_score}%
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono uppercase text-slate-400">
                  Autonomous Route
                </div>
                <div className="text-[11px] font-mono text-slate-200 mt-0.5 flex items-center gap-1 truncate">
                  <span>Escrow</span>
                  <ArrowRight className="h-3 w-3 text-[#E05A47] shrink-0" />
                  <span className="truncate text-sky-300">
                    {ledgerEntry?.recipient_email ||
                      "freelancer@sandbox.paypal.com"}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                  POST /v1/payments/payouts
                </div>
              </div>

              <div className="sm:text-right">
                <div className="text-[10px] font-mono uppercase text-slate-400">
                  Disbursed Amount
                </div>
                <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                  ${Number(ledgerEntry?.amount ?? milestone.amount).toFixed(2)}{" "}
                  USD
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  {ledgerEntry?.created_at
                    ? new Date(ledgerEntry.created_at).toLocaleTimeString()
                    : "Realtime Settlement"}
                </div>
              </div>
            </div>

            {/* Raw PayPal JSON Payload Viewer */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <FileCode2 className="h-4 w-4 text-[#E05A47]" />
                  <span>payout_ledger.raw_paypal_response (JSONB)</span>
                </div>

                <button
                  onClick={handleCopyJson}
                  className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied JSON</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Payload</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="bg-[#0B0F17] border border-slate-800 rounded-lg p-4 text-xs font-mono text-sky-300 overflow-x-auto max-h-[280px] leading-relaxed">
                {jsonPayload}
              </pre>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <a
                href="https://developer.paypal.com/dashboard/Notifications"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono text-slate-400 hover:text-sky-400 inline-flex items-center gap-1.5 transition"
              >
                <span>Verify in PayPal Developer Sandbox Dashboard</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
