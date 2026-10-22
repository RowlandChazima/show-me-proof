"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import ContractArchitect from "@/components/ContractArchitect";
import EscrowGrid from "@/components/EscrowGrid";
import AgentTerminal from "@/components/AgentTerminal";
import SubmitProofModal from "@/components/SubmitProofModal";
import PayPalReceiptModal from "@/components/PayPalReceiptModal";
import { supabase, ContractRow, MilestoneRow } from "@/lib/supabase";

export default function ProofPayCommandCenter() {
  const [role, setRole] = useState<"CLIENT" | "FREELANCER">("CLIENT");
  const [contract, setContract] = useState<ContractRow | null>(null);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [selectedMilestone, setSelectedMilestone] =
    useState<MilestoneRow | null>(null);
  const [modalMilestone, setModalMilestone] = useState<MilestoneRow | null>(
    null,
  );
  const [receiptMilestone, setReceiptMilestone] = useState<MilestoneRow | null>(
    null,
  );
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([
    "[System Ready] ProofPay Autonomous Escrow initialized.",
    "[PayPal Toolkit] Connected to PayPal Sandbox (Orders v2 + Payouts v1).",
  ]);

  // Load most recent contract & milestones on initial mount
  useEffect(() => {
    async function loadLatestContract() {
      const { data: latestContracts } = await supabase
        .from("contracts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

      if (latestContracts && latestContracts.length > 0) {
        const active = latestContracts[0] as ContractRow;
        setContract(active);

        const { data: msRows } = await supabase
          .from("milestones")
          .select("*")
          .eq("contract_id", active.id)
          .order("sequence_order", { ascending: true });

        if (msRows) {
          setMilestones(msRows as MilestoneRow[]);
          setSelectedMilestone((msRows[0] as MilestoneRow) || null);
        }
      }
    }
    loadLatestContract();
  }, []);

  // Subscribe to Supabase Realtime updates on `milestones`
  useEffect(() => {
    if (!contract?.id) return;

    const channel = supabase
      .channel(`milestones_realtime_${contract.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "milestones",
          filter: `contract_id=eq.${contract.id}`,
        },
        (payload) => {
          const updated = payload.new as MilestoneRow;
          setMilestones((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m)),
          );
          setSelectedMilestone((prev) =>
            prev && prev.id === updated.id ? updated : prev,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contract?.id]);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col">
      <Navbar
        role={role}
        setRole={setRole}
        contract={contract}
        milestones={milestones}
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Workspace (8 Columns): Architect + AG Grid Command Center */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <ContractArchitect
            activeContract={contract}
            onContractCreated={({
              contract: newContract,
              milestones: newMs,
              logs,
            }) => {
              setContract(newContract);
              setMilestones(newMs);
              setSelectedMilestone(newMs[0] || null);
              setTelemetryLogs((prev) => [...logs, ...prev]);
            }}
          />

          <EscrowGrid
            milestones={milestones}
            role={role}
            onOpenSubmitModal={(ms) => setModalMilestone(ms)}
            onSelectMilestoneForInspect={(ms) => setSelectedMilestone(ms)}
            onInspectReceipt={(ms) => setReceiptMilestone(ms)}
          />
        </div>

        {/* Right Workspace (4 Columns): Live Agent Telemetry & Audit Drawer */}
        <div className="lg:col-span-4">
          <AgentTerminal
            selectedMilestone={selectedMilestone}
            telemetryLogs={telemetryLogs}
            onTriggerSubmitModal={(ms) => setModalMilestone(ms)}
          />
        </div>
      </main>

      {/* Deliverable Upload & Gemini Vision Audit Modal */}
      <SubmitProofModal
        milestone={modalMilestone}
        onClose={() => setModalMilestone(null)}
        onVerificationComplete={({ milestone: updatedMs, logs }) => {
          setMilestones((prev) =>
            prev.map((m) => (m.id === updatedMs.id ? updatedMs : m)),
          );
          setSelectedMilestone(updatedMs);
          setTelemetryLogs((prev) => [...logs, ...prev]);
        }}
      />

      {/* PayPal Sandbox Receipt (Raw JSON) Modal */}
      <PayPalReceiptModal
        milestone={receiptMilestone}
        onClose={() => setReceiptMilestone(null)}
      />
    </div>
  );
}
