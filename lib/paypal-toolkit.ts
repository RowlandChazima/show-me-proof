import { PayPalAgentToolkit } from "@paypal/agent-toolkit/ai-sdk";

const PAYPAL_BASE_URL =
  process.env.PAYPAL_ENVIRONMENT === "PRODUCTION"
    ? "https://api-m.paypal.com"
    : "https://sandbox.paypal.com";

// PAYPAL Agent Toolkit instance

export const PaypalToolkit = new PayPalAgentToolkit({
  clientId: process.env.PAYPAL_CLIENT_ID!,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
  configuration: {
    actions: {
      invoices: { create: true, list: true, get: true, send: true },
      orders: { create: true, get: true, capture: true },
      disputes: { list: true, get: true },
    },
    context: {
      sandbox: process.env.PAYPAL_ENVIRONMENT !== "PRODUCTION",
    },
  },
});

// Fetch OAuth Token from PayPal Sandbox
export async function getPaypalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in .env.local",
    );
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const data = await response.json();
  return data.access_token;
}

//Paypal order to fund the contract Escrow
export async function createEscrowOrder(params: {
  contractId: string;
  title: string;
  totalAmount: number;
  currency?: string;
}) {
  const accessToken = await getPaypalAccessToken();
  const currency = params.currency || "USD";

  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: params.contractId,
        description: params.title,
        amount: {
          currency_code: currency,
          value: params.totalAmount.toFixed(2),
        },
      },
    ],
    application_context: {
      brand_name: "ProofPay",
      user_action: "PAY_NOW",
      return_url: "https://localhost:300/?.escrow=funded",
      cancel_url: "https://localhost:300/?.escrow=cancelled",
    },
  };

  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`PayPal Create Order Error: ${JSON.stringify(data)}`);
  }

  const approveLink =
    data.links?.find(
      (link: { rel: string; href: string }) => link.rel === "approve",
    )?.href || null;

  return {
    orderId: data.id as string,
    status: data.status as string,
    approveUrl: approveLink,
    raw: data,
  };
}

// Autonomous Payout Tool
// Gets triggered when the Gemini Inspector Agent verifies a milestone (>=90% confidence)
export async function triggerAutonomousPayout(params: {
  milestoneId: string;
  milestoneTitle: string;
  recipientEmail: string;
  amount: number;
  currency?: string;
  confidenceScore: number;
}) {
  const accessToken = await getPaypalAccessToken();
  const senderBatchId = `PROOFPAY_${params.milestoneId.slice(0, 8)}_${Date.now()}`;

  const payload = {
    sender_batch_header: {
      sender_batch_id: senderBatchId,
      email_subject: `ProofPay AI Verified Milestone Payout Released!`,
      email_message: `Your deliverable for "${params.milestoneTitle}" passed autonomous AI inspection with a ${params.confidenceScore}% confidence score. Funds have been released.`,
    },
    items: [
      {
        recipient_type: "EMAIL",
        amount: {
          value: params.amount.toFixed(2),
          currency: params.currency || "USD",
        },
        note: `AI Verified Milestone: ${params.milestoneTitle} (${params.confidenceScore}% match)`,
        sender_item_id: params.milestoneId,
        receiver: params.recipientEmail,
      },
    ],
  };

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/payments/payouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`PayPal Payouts API Error: ${JSON.stringify(data)}`);
  }

  return {
    payoutBatchId: data.batch_header?.payout_batch_id as string,
    batchStatus: data.batch_header?.batch_status as string,
    senderBatchId,
    raw: data,
  };
}
