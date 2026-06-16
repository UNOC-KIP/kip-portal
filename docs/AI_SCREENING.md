# AI Screening (Internal — Developer Reference Only)

> ⚠️ **Audience: internal devs only.** This document and the capabilities it
> describes must NOT be referenced anywhere in investor-facing UI, marketing
> material, public documentation, or stakeholder-facing communications. AI
> screening is a TC-side decision-support tool, not a substitute for the
> formal Technical Committee evaluation defined in the Land Allocation Policy.

## Purpose

When an application enters `UNDER_TC_REVIEW`, n8n runs a background job that
calls the Anthropic Claude API to produce a preliminary structured assessment
across the same five sections the TC scores manually:

1. Preliminary Information completeness
2. Land area & business profile fit
3. Utilities & infrastructure feasibility
4. H3SE strength
5. National content track record

The output is stored against the application as a `ReviewAction` of type
`COMMENTED` with a special `actorUserId` representing the AI assistant role.
It is **visible only inside the TC review console** and is clearly labelled
as a preliminary AI-generated assessment requiring human verification.

## Why this is internal-only

The Land Allocation Policy is explicit: decisions are made by the Technical
Committee, GM-URHC, ExCo, the Investment Committee, and the Board. Surfacing
AI involvement to investors or in external comms would misrepresent the
process and create both legal and reputational risk.

## Implementation outline

1. n8n workflow `tc-ai-prescreen` triggered by webhook on submission
2. Workflow fetches application JSON + presigned URLs to uploaded documents
3. PDFs unreliable for text extraction in many cases — rasterise scans via
   PyMuPDF (`fitz`) at the n8n side; this is the proven fallback for
   UNOC's scan-based PDFs
4. Build a structured prompt with explicit scoring rubric per section
5. Call Anthropic API; require JSON output with `scores`, `findings`,
   `clarification_questions`, `risk_flags`
6. POST the result back to `/webhooks/n8n/event` with HMAC signature
7. API persists as a `ReviewAction` linked to the application

## Prompt design constraints

- Output must be strictly JSON, validated against a Zod schema
- Never include the investor's personal data in logs
- Anthropic API key lives in env, never in client code
- Cap input size; pre-summarise large uploads if needed

## What it must never do

- Make a decision
- Notify the investor
- Appear on any investor-facing screen
- Be cited in outcome letters
