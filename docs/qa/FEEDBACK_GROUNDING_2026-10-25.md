# Feedback grounding verification — October 25, 2026

Branch: `codex/adaptive-interview-rubric`, base `c13107c`; changes remain
uncommitted/unpushed. Earlier repository/context work is preserved.

## Changes verified

- Behavioral and introduction classification survives both API grading routes.
  Common introductions override a mistaken Technical label. Client scheduling
  and server validation disallow behavioral probes, including last-topic finish;
  mixed sessions move to an independent technical topic.
- Rubric v3 has separate behavioral anchors with the same 25/30/25/20 weights.
  Behavioral answers do not affect technical content or factual accuracy.
- Scores, displayed critique and strengths derive from the same validated
  criteria. High scores require literal evidence; low scores require a concrete
  improvement. Overlapping evidence and previous advice are deduplicated.
- Gemini grading requests use high thinking and 8,192 output tokens; prompt-only
  question generation stays low. Every grade/retry still includes the full rubric.
- Clip explanations quote their own speech and matching graded evidence, or use
  a labeled local excerpt estimate. Delivery and whole-answer scores no longer
  inflate excerpt content rankings. Whole-answer fallback also has grounded prose.
- Local heuristics are category-specific and conservative, with inspectable
  criterion reasons. They do not establish semantic correctness.

## Automated checks

`pnpm test`: **92 passed, 0 failed, 0 skipped**. Twelve new regression cases cover
classification, technical-only probes, disguised behavioral probes, distinct score
aggregates, high-thinking retry, criterion/feedback consistency, mandatory
improvements, clip evidence alignment, fallback and delivery-independent ranking.
Prior tests were retained, updating fixtures to rubric v3 and criterion-derived
feedback. `pnpm exec tsc --noEmit`: exit 0. `pnpm build`: exit 0, all five Vinext
phases, only `/` page listed. Temporary QA route removed before build.
Existing large speech/WASM chunk and Vinext route-classification notices remain.

## Real Gemini smoke

Used the already authorized local server/key, only invented non-sensitive text,
no personal screenshots/transcripts, media, file attachments or credential output.

- Technical investigation answer that only delegated work: HTTP 200, live,
  content 20, accuracy null. Criticism cited the handoff and missing investigation.
- Introduction intentionally labeled Technical: final HTTP 200, live, Behavioral
  content 64, accuracy null, `nextAction:transition`, empty followup and anchor.
  Next question was an independent troubleshooting scenario, category Technical.
- An earlier intro response failed the exact-evidence guard. Instructions were
  tightened to require one contiguous verbatim substring with explicit bounds;
  subsequent checks passed. Invalid evidence continues to fail closed. A few
  live smoke cases do not establish universal model correctness or reliability.

## Browser verification

Actual local Vinext origin with `adaptive-interview-harness.tsx`, mocked Gemini
transport, real Home/studio/API/rubric/report components. No physical devices or
real provider requests from the browser fixture. The retained fixture now begins
with an introduction. Verified no introduction probe; next independent technical
question; one evidence-linked technical probe; early finish; behavioral 64 and
technical 44 displayed separately; answer headers match content; behavioral
accuracy unavailable; concise bold critique; expanded grading controls.

1280px viewport: document width 1265px, no horizontal overflow; four visible bold
feedback leads across two answers. Captured browser console warnings/errors: none.
The dev terminal had the existing multiple-renderer warning during temporary
fixture/HMR use. Screenshot (ignored local evidence):
`outputs/feedback-qa/behavioral-technical-report.png`.

The report download button was exercised, but the inspected Downloads file was
the older three-answer export, so no new on-disk export verification is claimed.
Category aggregates are covered by unit assertions and rendered browser evidence.
Clip text/ranking/alignment has automated synthetic coverage; no new physical
recording or clip playback/export test is claimed in this continuation.

## Delivery and limits

Local preview restarted at `http://127.0.0.1:5173/`. User's existing tab was not
intentionally reloaded. Temporary verification tab closed. Existing saved reports
are not retroactively regraded; new sessions use the updated code.
Original Site access rechecked: `Sites project not found`. No replacement Site,
deployment, hosted key, audience or billing changes. Private key stays ignored.
Physical devices, broad cross-browser/accessibility testing and extensive AI
quality evaluation remain separate. Usage was checked during work and remained
well above the user's 10% remaining stopping threshold.
