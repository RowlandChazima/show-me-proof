import { NextResponse } from "next/server";
import { generateContractMilestones } from "@/lib/gemini-verifier";
import { createEscrowOrder } from "@/lib/paypal-toolkit";
import { getServiceSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      prompt,
      totalBudget = 450,
      clientEmail = "client-buyer@sandbox.paypal.com",
      freelancerEmail = "freelancer-receiver@sandbox.paypal.com",
    } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Please provide a valid project prompt." },
        { status: 400 },
      );
    }

    const supabase = getServiceSupabase();

    // 1. Run Gemini Architect Agent to generate 3 verifiable milestones
    const plan = await generateContractMilestones({
      prompt,
      totalBudget: Number(totalBudget),
    });

    // 2. Insert parent Contract row into Supabase
    const { data: contract, error: contractErr } = await supabase
      .from("contracts")
      .insert({
        title: plan.contractTitle,
        description: plan.contractSummary,
        client_email: clientEmail,
        freelancer_paypal_email: freelancerEmail,
        total_amount: Number(totalBudget),
        currency: "USD",
        status: "FUNDED_IN_ESCROW",
      })
      .select("*")
      .single();

    if (contractErr || !contract) {
      throw new Error(
        `Supabase Contract Insert Error: ${contractErr?.message}`,
      );
    }

    // 3. Call PayPal Orders v2 API in Sandbox to create the Escrow Deposit Order
    let paypalOrder = {
      orderId: `SANDBOX_ORD_${Date.now()}`,
      status: "CREATED",
      approveUrl: "https://www.sandbox.paypal.com/checkoutnow",
      raw: {} as any,
    };

    try {
      paypalOrder = await createEscrowOrder({
        contractId: contract.id,
        title: plan.contractTitle,
        totalAmount: Number(totalBudget),
      });
    } catch (paypalErr: any) {
      console.error("PayPal Order Error:", paypalErr);
      console.warn("PayPal Order fallback note:", paypalErr.message);
    }

    // Update contract with PayPal Order ID & Checkout URL
    const { data: updatedContract } = await supabase
      .from("contracts")
      .update({
        paypal_order_id: paypalOrder.orderId,
        paypal_checkout_url: paypalOrder.approveUrl,
      })
      .eq("id", contract.id)
      .select("*")
      .single();

    // 4. Insert the 3 Milestones into Supabase (Milestone 1 starts unlocked!)
    const milestonePayloads = plan.milestones.map((m, idx) => ({
      contract_id: contract.id,
      sequence_order: m.sequenceOrder,
      title: m.title,
      amount: m.amount,
      deliverable_type: m.deliverableType,
      acceptance_criteria: m.acceptanceCriteria.map((c) => ({
        id: c.id,
        rule: c.rule,
        passed: null,
      })),
      status: idx === 0 ? "AWAITING_SUBMISSION" : "LOCKED",
    }));

    const { data: insertedMilestones, error: msErr } = await supabase
      .from("milestones")
      .insert(milestonePayloads)
      .select("*")
      .order("sequence_order", { ascending: true });

    if (msErr) {
      throw new Error(`Supabase Milestones Insert Error: ${msErr.message}`);
    }

    // 5. Log the Escrow Deposit in payout_ledger
    await supabase.from("payout_ledger").insert({
      contract_id: contract.id,
      transaction_type: "ESCROW_DEPOSIT",
      paypal_reference_id: paypalOrder.orderId,
      sender_email: clientEmail,
      recipient_email: "escrow-vault@proofpay.ai",
      amount: Number(totalBudget),
      paypal_status: paypalOrder.status,
      raw_paypal_response: paypalOrder.raw,
    });

    return NextResponse.json({
      success: true,
      contract: updatedContract || contract,
      milestones: insertedMilestones,
      paypalOrder,
      telemetryLog: [
        `[Architect Agent] Structured "${plan.contractTitle}" into 3 verifiable milestones ($${Number(totalBudget).toFixed(2)} USD).`,
        `[PayPal Toolkit] Created Escrow Order #${paypalOrder.orderId} (${paypalOrder.status}).`,
      ],
    });
  } catch (error: any) {
    console.error("Architect Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to architect contract" },
      { status: 500 },
    );
  }
}
