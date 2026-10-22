// lib/gemini-verifier.ts
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { AcceptanceCriterion } from "./supabase";

/**
 * 1. ARCHITECT AGENT SCHEMA & GENERATOR
 * Breaks a client prompt + budget into 3 verifiable micro-milestones.
 */
const ArchitectOutputSchema = z.object({
  contractTitle: z.string().describe("Crisp, professional project title"),
  contractSummary: z.string().describe("1-2 sentence executive scope summary"),
  milestones: z
    .array(
      z.object({
        sequenceOrder: z.number().int().min(1).max(3),
        title: z.string(),
        amount: z.number().positive(),
        deliverableType: z.enum(["UI_SCREENSHOT", "GITHUB_PR", "LIVE_URL"]),
        acceptanceCriteria: z
          .array(
            z.object({
              id: z.string().describe("Short ID like c1, c2, c3"),
              rule: z
                .string()
                .describe(
                  "Concrete, visually or technically verifiable requirement",
                ),
            }),
          )
          .min(3)
          .max(4),
      }),
    )
    .length(3),
});

export async function generateContractMilestones(params: {
  prompt: string;
  totalBudget: number;
}) {
  const { object } = await generateObject({
    model: google("gemini-3.8-flash"),
    schema: ArchitectOutputSchema,
    prompt: `
      You are the ProofPay Autonomous Contract Architect.
      A client wants to hire a freelancer with the following request:
      "${params.prompt}"
      
      Total Escrow Budget: $${params.totalBudget.toFixed(2)} USD.

      Break this project into EXACTLY 3 sequential micro-milestones whose amounts sum up to EXACTLY $${params.totalBudget.toFixed(2)}.
      - Make Milestone 1 focused on UI/Visual Design or Core Layout (deliverableType: "UI_SCREENSHOT") so it can be visually audited by Multimodal Vision.
      - Make Milestone 2 focused on Code/API implementation (deliverableType: "GITHUB_PR" or "UI_SCREENSHOT").
      - Make Milestone 3 focused on Final Polish & Responsive Deployment (deliverableType: "LIVE_URL" or "UI_SCREENSHOT").
      - Each milestone MUST have 3 to 4 strict, concrete acceptance criteria that an AI Inspector can objectively verify from a screenshot or GitHub PR.
    `,
  });

  return object;
}

/**
 * 2. INSPECTOR AGENT SCHEMA & MULTIMODAL VERIFIER
 * Evaluates a submitted screenshot, GitHub PR, or live URL against the milestone rules,
 * including an anti-spoofing forensic check for AI-generated UI mockups.
 */
const AuditOutputSchema = z.object({
  overallPassed: z
    .boolean()
    .describe(
      "True ONLY if confidenceScore >= 85, all critical rules pass, AND authenticityCheck.isLikelyAiGeneratedSpoof is false",
    ),
  confidenceScore: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe(
      "0-100 score. Must be < 40 if suspected of being an AI-generated image spoof.",
    ),
  authenticityCheck: z.object({
    isLikelyAiGeneratedSpoof: z
      .boolean()
      .describe(
        "True if image shows diffusion artifacts, warped micro-typography, gibberish subtext, non-integer pixel borders, or painterly gradients typical of Midjourney/DALL-E/Flux UI generations",
      ),
    authenticityScore: z
      .number()
      .int()
      .min(0)
      .max(100)
      .describe(
        "100 = Crisp authentic browser DOM/Figma render; < 50 = Suspected AI diffusion image",
      ),
    forensicNotes: z
      .string()
      .describe(
        "Specific forensic analysis of font rendering sharpness, 1px CSS border alignment, and DOM/code consistency",
      ),
  }),
  criteriaBreakdown: z.array(
    z.object({
      id: z.string(),
      rule: z.string(),
      passed: z.boolean(),
      evidence: z
        .string()
        .describe(
          "Specific visual or code observation proving why this rule passed or failed",
        ),
    }),
  ),
  agentReasoning: z
    .string()
    .describe(
      "Executive technical audit summary including anti-spoofing verdict",
    ),
});

/**
 * Helper: If the freelancer submits a GitHub Pull Request URL, fetch its real metadata/files
 * so Gemini can inspect actual code changes!
 */
async function fetchGitHubPRContext(url: string): Promise<string | null> {
  try {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) return null;
    const [, owner, repo, pullNumber] = match;

    const [prRes, filesRes] = await Promise.all([
      fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
        {
          headers: { Accept: "application/vnd.github.v3+json" },
        },
      ),
      fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files`,
        {
          headers: { Accept: "application/vnd.github.v3+json" },
        },
      ),
    ]);

    if (!prRes.ok) return null;
    const prData = await prRes.json();
    const filesData = filesRes.ok ? await filesRes.json() : [];

    const fileSummaries = Array.isArray(filesData)
      ? filesData
          .slice(0, 8)
          .map(
            (f: any) =>
              `- ${f.filename} (+${f.additions}/-${f.deletions})\nPatch:\n${(f.patch || "").slice(0, 600)}`,
          )
          .join("\n\n")
      : "";

    return `GitHub PR Title: ${prData.title}\nDescription: ${prData.body || "None"}\nState: ${prData.state}\nChanged Files:\n${fileSummaries}`;
  } catch {
    return null;
  }
}

/**
 * Helper: If the freelancer submits a Live URL, fetch the actual HTML DOM
 * to verify it is a real coded webpage and not just a static image!
 */
async function fetchLiveDomContext(url: string): Promise<string | null> {
  try {
    if (!url.startsWith("http") || url.includes("github.com")) return null;
    const res = await fetch(url, {
      headers: { "User-Agent": "ProofPay-Inspector-Agent/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;

    const html = await res.text();
    return `Live HTML DOM Snippet (First 2500 chars):\n${html.slice(0, 2500)}`;
  } catch {
    return null;
  }
}

export async function verifyDeliverableWithGemini(params: {
  milestoneTitle: string;
  deliverableType: "UI_SCREENSHOT" | "GITHUB_PR" | "LIVE_URL";
  acceptanceCriteria: AcceptanceCriterion[];
  proofSubmissionUrl: string; // Can be a base64 data:image/... URI, an https:// image URL, or a GitHub/Live URL
  proofNotes?: string;
}) {
  const criteriaListText = params.acceptanceCriteria
    .map((c) => `- [${c.id}] ${c.rule}`)
    .join("\n");

  const isImageSubmission =
    params.proofSubmissionUrl.startsWith("data:image/") ||
    /\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(params.proofSubmissionUrl);

  const [githubContext, liveDomContext] = await Promise.all([
    !isImageSubmission
      ? fetchGitHubPRContext(params.proofSubmissionUrl)
      : Promise.resolve(null),
    !isImageSubmission
      ? fetchLiveDomContext(params.proofSubmissionUrl)
      : Promise.resolve(null),
  ]);

  const systemInstruction = `
    You are the ProofPay Autonomous Escrow Inspector & Anti-Fraud Forensic Agent.
    Your job is two-fold:
    1. IMPARTIAL CRITERIA AUDIT: Verify whether the submission satisfies every milestone acceptance criterion.
    2. ANTI-SPOOFING FORENSICS: Freelancers may attempt to cheat escrow by generating fake UI mockups using AI diffusion models (Midjourney, DALL-E, Flux) instead of building real UI code/designs.
       - Inspect micro-typography, small button labels, kerning, and subtext: AI diffusion models warp small letters, blur character edges, or produce pseudo-Latin gibberish.
       - Inspect CSS box geometry: Real browser DOM and Figma renders have mathematically crisp 1px borders, uniform border-radius, and exact pixel alignment. AI images have crooked borders, inconsistent padding, or soft diffusion gradients.
       - If you detect an AI-generated diffusion spoof, you MUST set authenticityCheck.isLikelyAiGeneratedSpoof = true, set confidenceScore below 35, and set overallPassed = false to protect the client's PayPal escrow funds.
  `;

  // Multimodal branch (UI Screenshot / Image inspection)
  if (
    isImageSubmission &&
    (params.proofSubmissionUrl.startsWith("data:image/") ||
      params.proofSubmissionUrl.startsWith("http"))
  ) {
    const { object } = await generateObject({
      model: google("gemini-3.8-flash"),
      schema: AuditOutputSchema,
      system: systemInstruction,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Perform a Forensic Authenticity Check + Milestone Criteria Audit for: "${params.milestoneTitle}".
              Freelancer Notes: "${params.proofNotes || "No additional notes provided."}"
              
              Acceptance Criteria to verify:
              ${criteriaListText}`,
            },
            {
              type: "image",
              image: params.proofSubmissionUrl,
            },
          ],
        },
      ],
    });

    // Hard guardrail: Never pass if flagged as an AI spoof
    if (object.authenticityCheck.isLikelyAiGeneratedSpoof) {
      object.overallPassed = false;
      object.confidenceScore = Math.min(object.confidenceScore, 35);
    }

    return object;
  }

  // Code / GitHub PR / Live URL branch
  const { object } = await generateObject({
    model: google("gemini-3.8-flash"),
    schema: AuditOutputSchema,
    system: systemInstruction,
    prompt: `
      Perform a Forensic Authenticity Check + Milestone Criteria Audit for: "${params.milestoneTitle}".
      Deliverable Type: ${params.deliverableType}
      Submitted URL: ${params.proofSubmissionUrl}
      Freelancer Notes: "${params.proofNotes || "None"}"
      ${githubContext ? `\nVerified GitHub Pull Request Diff:\n${githubContext}` : ""}
      ${liveDomContext ? `\nVerified Live Webpage HTML DOM:\n${liveDomContext}` : ""}

      Acceptance Criteria to verify:
      ${criteriaListText}
    `,
  });

  // Hard guardrail: Never pass if flagged as an AI spoof
  if (object.authenticityCheck.isLikelyAiGeneratedSpoof) {
    object.overallPassed = false;
    object.confidenceScore = Math.min(object.confidenceScore, 35);
  }

  return object;
}
