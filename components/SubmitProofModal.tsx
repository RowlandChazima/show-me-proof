"use client";

import React, { useState } from "react";
import {
  X,
  Upload,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  Link2,
} from "lucide-react";
import { MilestoneRow } from "@/lib/supabase";

interface SubmitProofModalProps {
  milestone: MilestoneRow | null;
  onClose: () => void;
  onVerificationComplete: (result: {
    passed: boolean;
    milestone: MilestoneRow;
    logs: string[];
  }) => void;
}

/**
 * Generates a real PNG Data URI on the fly representing a Dark-Slate SaaS Landing Page
 * with a 3-tier pricing table so Gemini Vision can visually inspect real pixels!
 */
function generateDemoLandingPageDataUrl(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 600;
  const ctx = canvas.getContext("2d")!;

  // 1. Dark Slate Background (#0F172A)
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(0, 0, 960, 600);

  // 2. Top Navbar & Hero CTA
  ctx.fillStyle = "#F8FAFC";
  ctx.font = "bold 32px sans-serif";
  ctx.fillText("ProofPay Cloud — Autonomous Developer API", 60, 80);

  ctx.fillStyle = "#94A3B8";
  ctx.font = "18px sans-serif";
  ctx.fillText(
    "High-contrast Dark Slate SaaS Interface with Instant Documentation & Pricing",
    60,
    118,
  );

  // Hero Primary CTA Button (#E05A47)
  ctx.fillStyle = "#E05A47";
  ctx.fillRect(60, 145, 220, 48);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("Start Building Free →", 85, 175);

  // 3. Three-Tier Pricing Table ($0, $29, $99)
  const tiers = [
    { name: "Starter Tier", price: "$0 / mo", desc: "Full Sandbox API & Docs" },
    { name: "Pro Growth", price: "$29 / mo", desc: "Autonomous AI Escrow" },
    { name: "Enterprise", price: "$99 / mo", desc: "Unlimited PayPal Payouts" },
  ];

  tiers.forEach((t, i) => {
    const x = 60 + i * 290;
    const y = 230;
    ctx.fillStyle = "#1E293B";
    ctx.fillRect(x, y, 265, 290);
    ctx.strokeStyle = i === 1 ? "#E05A47" : "#334155";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, 265, 290);

    ctx.fillStyle = "#F8FAFC";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(t.name, x + 24, y + 50);

    ctx.fillStyle = "#10B981";
    ctx.font = "bold 34px monospace";
    ctx.fillText(t.price, x + 24, y + 110);

    ctx.fillStyle = "#CBD5E1";
    ctx.font = "15px sans-serif";
    ctx.fillText(t.desc, x + 24, y + 160);

    ctx.fillStyle = "#0070BA";
    ctx.fillRect(x + 24, y + 215, 215, 42);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText("Select Plan", x + 85, y + 242);
  });

  return canvas.toDataURL("image/png");
}

export default function SubmitProofModal({
  milestone,
  onClose,
  onVerificationComplete,
}: SubmitProofModalProps) {
  const [proofUrl, setProofUrl] = useState("");
  const [proofNotes, setProofNotes] = useState(
    "Implemented dark slate (#0F172A) theme, responsive hero CTA button, and 3-tier pricing table ($0, $29, $99).",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!milestone) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProofUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLoadDemoMockup = () => {
    const dataUrl = generateDemoLandingPageDataUrl();
    setProofUrl(dataUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofUrl) {
      setError(
        "Please upload a UI screenshot, load the demo canvas, or paste a GitHub PR URL.",
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/verify-and-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestoneId: milestone.id,
          proofSubmissionUrl: proofUrl,
          proofNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification request failed");
      }

      const logs: string[] = [
        `[Deliverable Submitted] Milestone #${milestone.sequence_order}: "${milestone.title}"`,
        `[Gemini Vision Inspector] Confidence Score: ${data.audit?.confidence_score ?? data.milestone?.ai_confidence_score}% — ${
          data.passed ? "PASSED ALL CHECKS ✅" : "REJECTED ❌"
        }`,
      ];

      if (data.passed && data.payout) {
        logs.push(
          `[AUTONOMOUS PAYOUT TRIGGERED] POST /v1/payments/payouts -> $${Number(
            milestone.amount,
          ).toFixed(
            2,
          )} USD released! PayPal Batch ID: #${data.payout.payoutBatchId}`,
        );
      }

      onVerificationComplete({
        passed: data.passed,
        milestone: data.milestone,
        logs,
      });
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-xl max-w-xl w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <span className="text-[11px] font-mono uppercase text-[#E05A47]">
              Autonomous Escrow Verification
            </span>
            <h3 className="text-base font-bold text-white">
              Submit Proof — M{milestone.sequence_order}: {milestone.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Action Bar: Upload Image OR Generate Instant Demo Mockup */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#0B0F17] hover:bg-slate-900 border border-dashed border-slate-700 text-xs font-medium text-slate-200 cursor-pointer transition">
              <Upload className="h-4 w-4 text-[#E05A47]" />
              <span>Upload Screenshot (PNG/JPG)</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleLoadDemoMockup}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-sky-950/60 hover:bg-sky-900/60 border border-sky-700/70 text-xs font-semibold text-sky-300 transition cursor-pointer"
            >
              <ImageIcon className="h-4 w-4" />
              <span>Load Verified UI Mockup (Demo)</span>
            </button>
          </div>

          {/* Preview if image data URL loaded */}
          {proofUrl.startsWith("data:image/") && (
            <div className="rounded-lg overflow-hidden border border-slate-700 bg-[#0B0F17] p-2">
              <img
                src={proofUrl}
                alt="Deliverable Preview"
                className="w-full h-40 object-contain rounded"
              />
            </div>
          )}

          {/* Or GitHub PR / Live URL input */}
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Or Paste GitHub Pull Request / Live Deployment URL
            </label>
            <div className="relative">
              <Link2 className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={
                  proofUrl.startsWith("data:image/")
                    ? "[Screenshot Image Attached]"
                    : proofUrl
                }
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://github.com/owner/repo/pull/1 or screenshot URL..."
                className="w-full rounded-lg bg-[#0B0F17] border border-slate-700 pl-9 pr-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#E05A47]"
              />
            </div>
          </div>

          {/* Freelancer Implementation Notes */}
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Release Notes for AI Inspector
            </label>
            <textarea
              rows={2}
              value={proofNotes}
              onChange={(e) => setProofNotes(e.target.value)}
              className="w-full rounded-lg bg-[#0B0F17] border border-slate-700 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#E05A47]"
            />
          </div>

          {error && (
            <div className="text-xs text-rose-400 bg-rose-950/50 border border-rose-800 rounded p-2.5">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-[#E05A47] hover:bg-[#cc4c3a] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Gemini Auditing & Triggering PayPal Payout...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>
                    Run AI Audit & Release $
                    {Number(milestone.amount).toFixed(2)} Payout
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
