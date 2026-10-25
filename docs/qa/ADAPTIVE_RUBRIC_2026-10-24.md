# Adaptive interview and rubric grading verification

October 24, 2026, America/New_York. Base c13107c; implementation branch
`codex/adaptive-interview-rubric`. No commit/push/deployment is claimed. Earlier
uncommitted context-audit changes are preserved in the same working tree.

## Implemented and checked

- Conversation setup returns one opener for a 3–6-topic session. Every subsequent
  consented AI probe/main transition is generated from the latest answer, role,
  approved topic labels, focus/level, progress and recent turns/feedback. Individual
  mode retains set generation. Full-session client and bounded server repeat checks.
- Exact short current-answer quotations can be highlighted. Fabricated quotes,
  repeated prompts, wrong focus category and questions over 45 words are rejected.
- Gemini agent file: `web/agents/GEMINI.md`; enforced runtime instructions in
  `interview-grader.mjs`, rubric source `web/lib/content-rubric.mjs`. Every grading
  request for both providers/routes embeds the complete versioned rubric, including
  retries. Missing/stale versions and fabricated criterion evidence fail closed.
- Server-computed content: relevance 25%, reasoning 30%, support 25%, completeness
  20%, anchored 0–4. Accuracy is reference-limited, severity-weighted, with partial
  credit and unknown/unsupported claims excluded. Major/critical contradictions
  cap content and accuracy at 59/25. Deterministic cash checks override model errors.
- Specific critical feedback, summary/bullet/prior-feedback deduplication, safe
  bold text rendering and expandable criterion/cap evidence. Duplicate rubric
  quotes display once; empty strengths do not produce invented praise.
- Personal/unpaid boundaries retained; no raw resume/media added to conversation.
  Approved profile/settings and at most four prior turns are sent with consent.
  Prior feedback bounded to four 1,000-character strings per turn; unknown history
  fields are projected away. Contact checks remain partial, not anonymization.

## Required local checks

From `web/`, final application source checks:

- `pnpm test`: **80 passed, 0 failed, 0 skipped** (64 retained, 16 new tests).
- `pnpm exec tsc --noEmit`: **PASS**, exit 0, including reusable fixtures.
- `pnpm build`: **PASS**, exit 0, standalone speech bundle and five Vinext phases.
  Temporary `app/qa-adaptive/page.tsx` was removed first; only `/` was listed.
- `git diff --check`: checked during review; no application whitespace errors.

No dependency/lockfile change was needed. Existing speech chunk-size and Vinext
route-classification notices remain. Lint was not requested/run.

## Actual-origin browser verification

Used the real local Vinext app, ConversationStudio, business API validation,
rubric calculation and report. Provider transport was mocked by the reusable
`web/tests/fixtures/adaptive-interview-harness.tsx`, temporarily copied into
`app/qa-adaptive/page.tsx`. The fixture was visibly labeled as mocked and used
fictional text only. No Gemini network call, camera or microphone access occurred.

1. Setup used a cashier role, selected focus/level and three target topics. The
   request included `format:conversation`; only one opening question was returned.
2. An answer proposing a second charge produced a new question about checking
   whether the first payment succeeded, with an exact highlighted response line.
3. The reply about checking the terminal/supervisor produced a new main topic,
   rather than returning to an array of prewritten questions. Ledger confirmed
   role/profile/settings, progress, recent question/answer and bounded feedback.
4. A fictional $10.35 response to $20 minus $8.65 was contradicted deterministically.
   Report showed factual accuracy 0 and content capped from 49 to 25. Rubric
   criteria/weights/reasons, bold critical text and source evidence were visible.
5. Downloaded the actual JSON through the UI, parsed it, and asserted three answers,
   exact rubric version, four valid criteria per answer, evidence substrings,
   expected arithmetic scores/cap, no recording claim and no Blob URLs. PASS.
6. Default desktop report had no horizontal overflow (1087 px document/client
   width). Final test-tab console had no captured warning/error. Dev server did
   print multiple-renderer warnings during temporary route/HMR reloads; no clean
   production-runtime or full accessibility claim is inferred from this fixture.
7. Separately exercised the actual credential-free product root: text conversation,
   answer-specific local probe/quote, early finish and bold local feedback. PASS.

Ignored local evidence: `outputs/adaptive-rubric-qa/rubric-report.png` and
`validated-report.json`. Screenshot clearly labels mocked transport. No real
interview data, keys or recordings are committed. The temporary route was removed
and owned development server stopped before production build.

## Remaining limits and handoff

The existing Sites connector was rechecked and returned `Sites project not found`.
No replacement Site, audience change, secret transfer, billing or publication.
`web/.dev.vars` remains absent; no key values were read. Live Gemini response
quality/schema acceptance needs separate authorized provider verification.

Accuracy remains limited to the supplied reference pack. Literal citation and
rubric validation do not prove an AI semantic classification correct. Personal
achievements and out-of-pack facts remain unverified. Local personal practice
still uses a labeled lexical heuristic. Physical media/real-person quality,
Firefox/full screen-reader coverage, narrow/mobile and performance checks were
not newly established in this change. Prior dated media QA remains historical.

Manual handoff: implementation agent -> Sameer / aiden.sol / next Cadence agent.
Review source and rubric, then verify live Gemini and publish the original Site
through an authorized account. No teammate delivery receipt is claimed.
