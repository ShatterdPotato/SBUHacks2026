# Cadence continuation handoff

October 25 follow-up: factual grading now handles concise technical answers, retries missing/invalid checks with a focused high-thinking factual pass, and reassesses rubric explanations after factual findings. Reports expose per-answer accuracy and coverage. Replay waits for decoded seeks and WebM duration discovery, with retryable failures. Every Gemini operation now receives an explicit interviewer role matched to its output schema. See [follow-up QA](qa/FACTUAL_REPLAY_2026-10-25.md).

Updated October 25, 2026. Read TEAM_CONTEXT.md first. Orchestrator: aiden.sol.
Current work is on codex/adaptive-interview-rubric, based on c13107c.
Prior repository/context and rubric work has been preserved. GitHub publication
status is recorded below after final checks; no merge to main is implied.

## Current implementation

- All Gemini operations request high internal thinking. Planning/interviewing use
  an 8,192-token ceiling; grading, verification, reports, clips, drills and offline
  bank authoring/review use 16,384. Final explanations stay concise; raw private
  thought text is neither requested nor logged.
- Separate planner, adaptive interviewer and background grader. A strict randomized
  schedule enforces the technical/behavioral mix. Introductions and probes do not
  consume main-topic quota. Only substantive technical answers can receive one
  optional probe. Technical main tasks preserve their canonical answer key.
- 448 original sourced technical questions: 112 each for AI/ML, software, hardware
  and digital logic. Each has an answer key, facts, alternatives, partial-credit
  anchors, misconceptions, source IDs and review provenance. 416 are AI-reviewed
  and 32 have executable reference checks; no human expert certification claim.
- Cryptographic sampling respects level, competency diversity and recent IDs.
  Finite pool exhaustion may reuse older-session questions, not current-session IDs.
- Rubric v3 is injected on every grade. Literal evidence/version are validated;
  server arithmetic produces grades/caps. Behavioral answers are excluded from
  technical content and accuracy. Corrections/appeals trigger independent regrading
  and invalidate derived report/clip/drill conclusions.
- Selective independent verification receives original evidence without the
  previous verdict. Failure preserves a provisional assessment with retry.
  Background grades complete before final review.
- Clip coaching uses timestamped transcript excerpts plus answer/grading context,
  literal quotes, distinct strengths/corrections and explanations. Gemini chooses
  replay categories from the local shortlist; it does not invent clip scores.
- Session synthesis and on-demand coaching/drills are live. Safe provider usage,
  model, timing, attempts and nullable token counters are displayed and exported.
  Answers survive interviewer failure; retry and explicit local continuation are
  available. Failed/provisional grades can be retried in the report.
- Provider concurrency is bounded to four active and sixteen waiting per isolate.
  Queue timeout: 15 seconds; live deadline: 60 seconds, at most one transient retry.
  Offline bank jobs allow 180 seconds. No distributed quotas or account rotation.

See [every Gemini call](GEMINI_OPERATIONS.md), [current QA](qa/PREMIUM_2026-10-25.md),
[bank](../web/data/question-bank/README.md), [rubric](GRADING_RUBRIC.md),
[architecture](ARCHITECTURE.md) and [agent](../web/agents/GEMINI.md).

## Verification

137 tests, TypeScript and production build pass. Bank validation confirms 112 per
track, source/key integrity, unique prompts/IDs, difficulty coverage and all 32
executable expected results. Temporary QA routes were removed before build.

Live fictional-text Gemini checks passed planning, adaptive interviewing, grading,
verification, regrading, reports, clip coaching and drills. Browser checks covered
mixed quotas, no introduction/probe loops, saved-answer recovery, regrading,
report regeneration, drills, usage and distinct live clip feedback. No physical
camera/microphone, original media or personal data was uploaded for these checks.

The eight-case factual comparison completed 8/8 correct grounded Lite responses
and 3/8 correct grounded Flash 3.8 responses, with five Flash request failures.
Default remains Gemini 3.5 Flash-Lite; optional GEMINI_GRADING_MODEL is supported.
This small factual set does not establish general grading superiority.

## Privacy and local workflow

Ignored web/.dev.vars is configured locally. Never print, commit or move the key.
Unpaid Gemini remains fictional/non-sensitive text only with explicit consent.
Personal resumes stay local; setup sends generic approved labels. The current UI
uses local English transcription and optional continuous recording. Paid/eligible
individual frames retain a separate opt-in and never affect scores; no paid-media
configuration was enabled here. Media/cloud consent remains required.

State and recordings remain browser-memory only. Download before closing/reset.
Delivery is a labeled observable heuristic; no identity, emotion, personality,
protected-trait or hiring-fitness inference. Preserve Site identity/audience/secrets.
No mailbox is connected; use a truthful manual handoff.

From web/: pnpm dev (port 5173); pnpm test; pnpm exec tsc --noEmit; pnpm build.
Use package scripts to prepare vendor/speech assets. Stop owned dev before build
on Windows; restart after speech-worker changes. Reusable fixtures live under
web/tests/fixtures. Temporary QA routes must never be published.

## Last recorded hosted deployment

These identifiers are preserved from prior evidence. They were **not** re-read
from a hosting account in this audit.

| Item | Last recorded value |
| --- | --- |
| URL | https://cadence-interview-studio-aiden.daintyridge32.chatgpt.site |
| Sites project | `appgprj_6adcd46ff0dc8191943fd596d01bba52` |
| Deployed application source | `add43d0445ad419509d717ca4316eac4b32f0741` |
| Saved version | `appgprj_6adcd46ff0dc8191943fd596d01bba52~appgver_7bc87b31660481919afff74c19aad57f` |
| Deployment | `appgdep_6add213036888191b0453e9d4e623fb7`, previously succeeded |
| Environment | revision 3; `GEMINI_API_KEY` previously recorded as configured/redacted |
| Audience | owner-private; preserve existing access |

Later continuations received `Sites project not found` from the connector even
when browser visitor access worked. The last recorded deployment predates local
recording/conversation features. GitHub access is not Site owner/editor access.
Do not create a replacement Site, change audience or transfer secrets to work
around this issue. Use the original owner's or authorized same-workspace editor's
connection. GitHub merge SHAs and Sites source SHAs belong to different source
repositories and need not match.

For future publication, read the Sites skill and `web/.openai/hosting.json`;
obtain fresh source credentials through its protected mechanism. Build/push/package
matching source and deploy a saved version while preserving identity/audience.
Earlier work used ignored `outputs/cadence-site` outside `web/` for the hosting
checkout; generated/private outputs are not needed in Git.


## Outstanding work and integration

- Restore access to the original Sites project before deploying. The latest lookup
  returned Sites project not found; no deployment or audience/secret change occurred.
- Human domain review, broader expert-scored evaluation, physical device checks,
  cross-browser/accessibility coverage and live paid-media checks remain separate.
- Durable accounts/history, native thought-state continuation and distributed
  quotas require deliberate storage/access/capacity design; none were enabled.
- Large-bundle warnings remain. Further code/bank splitting would improve first load.

Earlier evidence is preserved in qa/ADAPTIVE_RUBRIC_2026-10-24.md,
qa/FEEDBACK_GROUNDING_2026-10-25.md, qa/LOCAL_GEMINI_SETUP_2026-10-24.md,
qa/CONVERSATION_2026-10-24.md and REPOSITORY_AUDIT.md. Their dated counts describe
those revisions, not this current implementation.

GitHub publication: implementation commit `a070642` is pushed to
`codex/adaptive-interview-rubric`, with [draft PR #13](https://github.com/ShatterdPotato/SBUHacks2026/pull/13).
No merge or hosted deployment was performed. Local preview is running at
http://127.0.0.1:5173/; root and health checks returned HTTP 200.
