# Cadence: shared team context

Current premium implementation (October 25): separate high-thinking planning, adaptive interviewer and background grader; selective verification, regrading/appeals, session synthesis, evidence-aligned clip coaching and on-demand drills. Four technical banks include original sourced questions with explicit AI-review provenance and independently executable exercises. Strict randomized coverage, retries, preserved answers and a session usage ledger are implemented. [Operation map](docs/GEMINI_OPERATIONS.md) and [current QA](docs/qa/PREMIUM_2026-10-25.md) supersede older configuration/route/count notes below. No human expert certification or hosted deployment is claimed.

Latest October 25 configuration: all Gemini API operations request high thinking. Models, consent and unpaid policy remain unchanged; current ceilings are 8,192 for planning/interviewing and 16,384 for deep assessment operations. The [premium interview design](docs/PREMIUM_INTERVIEW_DESIGN.md) separates implemented settings from the proposed product architecture.


October 25, 2026 update: rubric v3 has separate behavioral anchors and technical-only accuracy. Introductions and all behavioral questions never receive probes. Technical and behavioral content averages are separate; answer headers show content without delivery inflation. Clip reasons quote matching speech and criterion evidence, with a labeled local excerpt fallback. Gemini grading uses high thinking and requires actionable justifications; report prose is built from the same criteria as scores. See [feedback QA](docs/qa/FEEDBACK_GROUNDING_2026-10-25.md).

Updated October 24, 2026, America/New_York, from repository source
`c13107c0deedfe91c0df9e7890d440f5925d642b`, the repository audit and the
adaptive interview/rubric implementation on `codex/adaptive-interview-rubric`.
**Read this first every session. Orchestrator: `aiden.sol`.**

Repository: https://github.com/ShatterdPotato/SBUHacks2026. Canonical branch:
`main`. Team: Aiden Li Productions. Cadence is the working product name.
The human retired XTrain, hardware roles and the rover mailbox. Do not revive
them or change unrelated repositories.

## Context map

- [HANDOFF](docs/HANDOFF.md): latest stopping point, publication identity and next steps.
- [Repository audit](docs/REPOSITORY_AUDIT.md): source map, gaps and current validation.
- [Feature status](docs/FEATURE_STATUS.md): implemented source versus deferred work.
- [Architecture](docs/ARCHITECTURE.md): API, privacy, scoring and media contracts.
- [Demo](docs/DEMO.md): verification procedure and dated evidence index.
- [Credentials](docs/CREDENTIALS.md): local/hosted access and secret handling.
- [Grading rubric](docs/GRADING_RUBRIC.md) and [Gemini agent](web/agents/GEMINI.md):
  mandatory versioned AI grading and conversational question contract.
- `docs/qa/`: historical evidence; earlier counts and behaviors belong to those revisions.

## Current product

Sessions target 3–6 main topics. Conversation setup creates one role-first opener;
each subsequent consented AI question is written from the latest answer, role,
approved skill topics, focus/level and recent conversation, rather than a preset
slate. Short exact response quotes can be highlighted; repeats/invented quotes
are rejected. Without AI opt-in, local retrieval/templates are labeled. The default
`ConversationStudio` supports local spoken English questions, typed answers or
optional continuous camera/microphone recording, energy-based turn completion
after 5/7/10 seconds, manual completion, interruption, pause/resume, skips, early
finish and one optional follow-up per substantive technical topic. Pause stops listening while
recording continues. Limits: three minutes per recorded answer/turn and twenty
minutes per conversation. Text turns are submitted manually. Individual answer
practice remains available with separate clips
and retakes.

Whisper Base English runs locally with roughly twelve-second caption batches.
Conversational multi-batch answers get guarded whole-answer refinement; losing
more than 20% of live recognized words or over two seconds at the recognized end
keeps live captions. Reports support local transcript corrections. Delivery and
alignment retain original recording evidence.

AI content quality uses `cadence-content-v3`: relevance 25%, reasoning 30%,
specific support 25%, completeness 20%, each anchored 0–4. Every grading request
injects the full rubric through `web/agents/interview-grader.mjs`; missing/stale
versions or fabricated criterion evidence fail closed. The server computes the
weighted score. Local content feedback remains a labeled lexical estimate.
Feedback is answer-specific, critical, deduplicated and safely bolded. Bounded
previous feedback helps prevent boilerplate across responses. The JSON field
`scores.comprehension` displays **Factual accuracy** and is null without checked
claims. Checks require exact source excerpts; supported/partial/contradicted
claims receive severity-weighted credit. Major/critical errors cap content and
accuracy at 59/25. The report explains criteria and caps. The four technical banks contain 448 questions (112 per track), including 32
executable reference checks and 416 AI-reviewed answer keys. Legacy cash, allergen,
Python and leakage references remain. AI can classify quoted claims against
supplied keys/references; human expert certification is not claimed. No live search or verification of
personal stories is implemented.

Delivery is a labeled local heuristic. Missing cues are excluded; visual scoring
needs at least eight usable samples and 70% detection coverage. Ordinary movement
is an observation without a penalty. Strong/improvement excerpts use approximate
speech ranges, local ranking and real local exports. Continuous-session clips
add each turn's recording offset. Whole-answer fallback remains when timing is
missing; one full-interview download is offered.

## Architecture and privacy

`web/` contains React 19 / Vinext, a Cloudflare Worker and Sites integration.
`app/page.tsx` handles setup, individual practice and report;
`components/conversation-studio.tsx` handles conversation;
`lib/service.mjs` routes twelve API endpoints through `worker/index.ts`;
`lib/premium-service.mjs` implements the seven new interview/review routes.
See the architecture for the module and request map. D1/R2 are disabled; the
database/auth/connector utilities are retained scaffolding, not account history.

Keep Gemini unpaid. Default model: `gemini-3.5-flash-lite`; the example config
sets `gemini-3.1-flash-lite` for the one retry. OpenAI is an optional adapter.
Structured provider calls use server-only credentials and `store:false`.
The repository audit found no local key file. Subsequently the user authorized
local Gemini setup: ignored `web/.dev.vars` is now configured. The value was
provided through hidden stdin, never read back or printed. Live generic question
and fictional rubric-turn checks both returned HTTP 200. See
[local Gemini verification](docs/qa/LOCAL_GEMINI_SETUP_2026-10-24.md).

- Personal PDF/TXT resumes are read in the browser. Under unpaid Gemini, optional
  AI question requests contain only validated generic role/skill labels.
- Personal answers remain local. Conversational AI has an independent opt-in;
  unpaid Gemini requires fictional, non-sensitive question/answer text and sends
  a broad role, approved skill topics, focus/level and at most four prior turns
  with bounded feedback. Attestation/contact checks are not
  anonymization. Do not include real personal data in this path.
- Fictional setup mode can send invented extracted text/answers with consent.
  Raw PDFs/audio/frames are blocked on unpaid cloud routes. Paid configuration
  needs explicit owner authorization and appropriate billing/data handling;
  changing a flag does not enable billing.
- Media requires consent and a click. Models download from Hugging Face/Google;
  recognition and landmark inference run locally. The current UI never uploads
  original recordings. Separate eligible cloud JPEG notes exist only in individual mode.
- Session state and clips are memory-only. Download before reload/reset/close.
  No face identification, lip-reading, emotion/personality/protected-trait
  inference, psychological diagnosis or hiring judgment is allowed.

## Source, deployment and verification

Conversational source is merged on local `main` at `c13107c`; recording work and
the standalone-worker fix are also merged. The prior documentation audit remains
preserved. Current application work is on `codex/adaptive-interview-rubric`.
See HANDOFF for the latest GitHub publication status.

Last recorded hosted source: `add43d0445ad419509d717ca4316eac4b32f0741`, private
audience. Later attempts returned `Sites project not found`. Visitor access
does not grant publishing rights. Preserve the existing Site ID/audience/secrets;
do not create a replacement. The connector was rechecked during adaptive/rubric
work and again returned
`Sites project not found`; remote settings/publication were not available.
The handoff preserves all publication IDs.

Current checks: **113 tests, TypeScript and production build pass**. The bank
validator confirms 112 items in each of four tracks. Live synthetic-text checks
passed planning, adaptive interviewing, grading, independent verification,
regrading, reports, clips and drills. Browser QA verified mixed coverage,
retry preservation, regrading, usage display and live evidence-specific clips.
See [premium QA](docs/qa/PREMIUM_2026-10-25.md). Physical devices, paid media and
expert bank certification remain unverified. Earlier QA retains its dated scope.

## Team workflow

`aiden.sol` owns integration until humans reassign roles. Preserve teammate work
and coordinate shared contracts. Use branch -> commit -> push -> PR -> review ->
merge -> pull for integration. Keep keys, personal interview data, generated
artifacts and ignored private `.coordination/` state out of Git.

Without a connected mailbox, use a manual handoff and never invent delivery:

```text
From / To:
Context revision and Git commit:
Task and owned files:
What changed and what was verified:
Question or blocker:
Proposed interface or next action:
```

From `web/`, run `pnpm test`, `pnpm exec tsc --noEmit` and `pnpm build` for
application changes. Model-worker assets are generated by the package scripts;
restart dev after editing speech-worker source. Mocked tests and synthetic
recording fixtures do not establish live AI or physical-device success.
