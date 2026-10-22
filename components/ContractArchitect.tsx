"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Loader2,
  DollarSign,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { ContractRow, MilestoneRow } from "@/lib/supabase";

interface ContractArchitectProps {
  onContractCreated: (data: {
    contract: ContractRow;
    milestones: MilestoneRow[];
    logs: string[];
  }) => void;
  activeContract: ContractRow | null;
}

const DEMO_PRESET_PROMPT =
  "Build a high-contrast dark slate (#0F172A) SaaS landing page for an AI developer tool. Must include a hero section with a primary CTA button, a 3-tier pricing comparison table ($0, $29, $99), and a responsive API documentation preview card.";

export default function ContractArchitect({
  onContractCreated,
  activeContract,
}: ContractArchitectProps) {
  const [prompt, setPrompt] = useState(DEMO_PRESET_PROMPT);
  const [budget, setBudget] = useState("450");
  const [freelancerEmail, setFreelancerEmail] = useState(
    "freelancer-receiver@sandbox.paypal.com",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateAndFund = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/architect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          totalBudget: Number(budget) || 450,
          freelancerEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create contract");
      }

      onContractCreated({
        contract: data.contract,
        milestones: data.milestones,
        logs: data.telemetryLog || [],
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#E05A47]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            1. AI Contract Architect & PayPal Escrow Lock
          </h2>
        </div>

        {activeContract && (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2.5 py-1 rounded">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Active Contract: {activeContract.title} (Order #
            {activeContract.paypal_order_id?.slice(0, 8)})
          </span>
        )}
      </div>

      <form onSubmit={handleGenerateAndFund} className="space-y-3">
        <div>
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe project deliverables..."
            className="w-full rounded-lg bg-[#0B0F17] border border-slate-700/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#E05A47] transition"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-3">
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
              Total Escrow (USD)
            </label>
            <div className="relative">
              <DollarSign className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full rounded-lg bg-[#0B0F17] border border-slate-700 pl-8 pr-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#E05A47]"
              />
            </div>
          </div>

          <div className="md:col-span-5">
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
              Freelancer PayPal Sandbox Email
            </label>
            <input
              type="email"
              value={freelancerEmail}
              onChange={(e) => setFreelancerEmail(e.target.value)}
              className="w-full rounded-lg bg-[#0B0F17] border border-slate-700 px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-[#E05A47]"
            />
          </div>

          <div className="md:col-span-4 pt-4 md:pt-5">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#E05A47] hover:bg-[#cc4c3a] disabled:opacity-50 text-white font-semibold text-sm py-2.5 px-4 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(224,90,71,0.25)] transition cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Architecting & Locking PayPal Order...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate 3 Milestones & Lock Escrow</span>
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/50 rounded-lg px-3 py-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>
    </section>
  );
}
