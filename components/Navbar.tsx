// components/Navbar.tsx
"use client";

import React from "react";
import { ShieldCheck, Zap, UserCheck, Code2, ExternalLink } from "lucide-react";
import { ContractRow, MilestoneRow } from "@/lib/supabase";

interface NavbarProps {
  role: "CLIENT" | "FREELANCER";
  setRole: (role: "CLIENT" | "FREELANCER") => void;
  contract: ContractRow | null;
  milestones: MilestoneRow[];
}

export default function Navbar({
  role,
  setRole,
  contract,
  milestones,
}: NavbarProps) {
  const totalBudget = contract ? Number(contract.total_amount) : 0;
  const totalPaid = milestones
    .filter((m) => m.status === "VERIFIED_PAID")
    .reduce((sum, m) => sum + Number(m.amount), 0);
  const lockedInEscrow = Math.max(0, totalBudget - totalPaid);

  return (
    <header className="border-b border-slate-800 bg-[#0B0F17]/95 backdrop-blur sticky top-0 z-30 px-6 py-3.5">
      <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#E05A47] flex items-center justify-center shadow-[0_0_20px_rgba(224,90,71,0.35)] border border-orange-400/30">
            <Zap className="h-5 w-5 text-white fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-lg tracking-tight text-white">
                PROOFPAY
              </span>
              <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-[#E05A47] border border-slate-700">
                Autonomous AI Escrow
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>PayPal Sandbox Connected (Orders v2 + Payouts v1)</span>
            </div>
          </div>
        </div>

        {/* Center: Live Escrow Vault Status */}
        <div className="flex items-center gap-3 bg-[#111827] border border-slate-800 rounded-lg px-4 py-2">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
            <ShieldCheck className="h-4 w-4 text-[#0070BA]" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">
                Escrow Vault Locked
              </div>
              <div className="text-sm font-bold text-white font-mono">
                ${lockedInEscrow.toFixed(2)}{" "}
                <span className="text-xs text-slate-400">USD</span>
              </div>
            </div>
          </div>

          <div className="pl-1">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">
              AI Released Payouts
            </div>
            <div className="text-sm font-bold text-emerald-400 font-mono">
              ${totalPaid.toFixed(2)}{" "}
              <span className="text-xs text-slate-500">USD</span>
            </div>
          </div>

          {contract?.paypal_checkout_url && (
            <a
              href={contract.paypal_checkout_url}
              target="_blank"
              rel="noreferrer"
              className="ml-2 text-xs bg-[#0070BA]/20 hover:bg-[#0070BA]/30 text-sky-300 border border-[#0070BA]/50 px-2.5 py-1.5 rounded flex items-center gap-1.5 transition"
              title="Open PayPal Sandbox Checkout Order"
            >
              <span>Order #{contract.paypal_order_id?.slice(0, 8)}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Right: Instant Demo Role Switcher */}
        <div className="flex items-center gap-2 bg-[#111827] p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setRole("CLIENT")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              role === "CLIENT"
                ? "bg-[#0070BA] text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            Client Mode (US Buyer)
          </button>
          <button
            onClick={() => setRole("FREELANCER")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              role === "FREELANCER"
                ? "bg-[#E05A47] text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            Freelancer Mode (Submit Proof)
          </button>
        </div>
      </div>
    </header>
  );
}
