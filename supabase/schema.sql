-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- 1. CONTRACTS TABLE (Parent Project & Escrow Funding)
create table public.contracts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null,
  client_email text not null default 'client-buyer@sandbox.paypal.com',
  freelancer_paypal_email text not null default 'freelancer-receiver@sandbox.paypal.com',
  total_amount numeric(10, 2) not null,
  currency text not null default 'USD',
  paypal_order_id text,               -- Populated by @paypal/agent-toolkit
  paypal_checkout_url text,           -- Sandbox approval link
  status text not null default 'DRAFT' 
    check (status in ('DRAFT', 'FUNDED_IN_ESCROW', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED')),
  created_at timestamptz not null default now()
);

-- 2. MILESTONES TABLE (Main Rows in AG Grid Command Center)
create table public.milestones (
  id uuid primary key default uuid_generate_v4(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  sequence_order int not null,
  title text not null,
  amount numeric(10, 2) not null,
  deliverable_type text not null default 'UI_SCREENSHOT'
    check (deliverable_type in ('UI_SCREENSHOT', 'GITHUB_PR', 'LIVE_URL')),
  acceptance_criteria jsonb not null default '[]'::jsonb, 
  -- Example: [{"id": "c1", "rule": "Dark slate background (#0F172A)", "passed": null}]
  proof_submission_url text,          -- Image URL in Supabase Storage or GitHub PR URL
  proof_notes text,
  ai_confidence_score int default 0,  -- 0 to 100 (Powers the AG Grid progress bar)
  status text not null default 'LOCKED'
    check (status in ('LOCKED', 'AWAITING_SUBMISSION', 'AI_AUDITING', 'VERIFIED_PAID', 'REJECTED')),
  paypal_payout_batch_id text,        -- Populated the second Payouts API fires
  updated_at timestamptz not null default now()
);

-- 3. AI AUDITS TABLE (Stores the Step-by-Step Agent Reasoning)
create table public.ai_audits (
  id uuid primary key default uuid_generate_v4(),
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  overall_passed boolean not null,
  confidence_score int not null,
  criteria_breakdown jsonb not null,  -- Detailed pass/fail per rule with evidence
  agent_reasoning text not null,      -- Natural language summary from Gemini
  created_at timestamptz not null default now()
);

-- 4. PAYOUT LEDGER TABLE (Audit Trail of Autonomous PayPal Movements)
create table public.payout_ledger (
  id uuid primary key default uuid_generate_v4(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  transaction_type text not null check (transaction_type in ('ESCROW_DEPOSIT', 'MILESTONE_PAYOUT', 'REFUND')),
  paypal_reference_id text not null,  -- Order ID or Payout Batch ID
  sender_email text not null,
  recipient_email text not null,
  amount numeric(10, 2) not null,
  paypal_status text not null,        -- e.g., 'COMPLETED', 'SUCCESS', 'PENDING'
  raw_paypal_response jsonb,          -- Raw response from PayPal for inspection in the inspect modal
  created_at timestamptz not null default now()
);

-- Enable Supabase Realtime so AG Grid updates live during the video demo!
alter publication supabase_realtime add table public.contracts;
alter publication supabase_realtime add table public.milestones;
alter publication supabase_realtime add table public.ai_audits;
alter publication supabase_realtime add table public.payout_ledger;