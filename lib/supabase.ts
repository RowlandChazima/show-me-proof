import { createClient } from "@supabase/supabase-js";

export interface AcceptanceCriterion {
  id: string;
  rule: string;
  passed: boolean | null;
  evidence?: string;
}

export interface ContractRow {
  id: string;
  title: string;
  description: string;
  client_email: string;
  freelancer_paypal_email: string;
  total_amount: number;
  currency: string;
  paypal_order_id: string | null;
  paypal_checkout_url: string | null;
  status:
    | "DRAFT"
    | "PENDING"
    | "ACCEPTED"
    | "REJECTED"
    | "COMPLETED"
    | "DISPUTED";
  created_at: string;
}

export interface MilestoneRow {
  id: string;
  contract_id: string;
  sequence_order: number;
  title: string;
  amount: number;
  deliVerable_type: "UI_SCREENSHOT" | "GITHUB_PR" | "LIVE_URL";
  acceptance_criteria: AcceptanceCriterion[];
  proof_submission_url: string | null;
  proof_notes: string | null;
  ai_confidence_score: number;
  status:
    | "LOCKED"
    | "AWAITING SUBMISSION"
    | "AI_AUDITING"
    | "VERIFIED_PAID"
    | "REJECTED";
  paypal_payout_batch_id: string | null;
  updated_at: string;
}

export interface PayoutLedgerRow {
  id: string;
  contract_id: string;
  milestone_id: string | null;
  transaction_type: "ESCROW_DEPOSIT" | "MILESTONE_PAYOUT" | "REFUND";
  paypal_reference_id: string;
  sender_email: string;
  recipient_email: string;
  amount: number;
  paypal_status: string;
  raw_paypal_response: Record<string, any> | null;
  created_at: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

//Browser Client -> AG Grid aand my React Components
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server Admin Client for the api routes
export const getServiceSupabase = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
  return createClient(supabaseUrl, serviceKey);
};
