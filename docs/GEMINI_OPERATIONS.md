# Gemini operation map

Interviewer speech is a separate ElevenLabs call through `POST /api/speech`, using the fixed Gearwell voice. Preview, every spoken question/probe, retry and individual Read question use that route. It sends text only and does not consume Gemini tokens. See [the complete speech map](GEARWELL_INTEGRATION.md). All Gemini calls below are preserved.

Every operation below uses `generation_config.thinking_level: high` through
`web/lib/provider.mjs`. The output ceilings are 8,192 tokens for planning and the
interviewer, 16,384 for grading, verification, synthesis, clip coaching, drills
and offline bank authoring/review, and 8,192 for retained cloud transcription.
Thinking happens inside the model; raw private reasoning is neither requested
nor stored. Structured final justifications are validated against evidence.
Eligible individual grades can include up to four small JPEG frames only with
separate visual consent; unpaid Gemini rejects them. Visual notes never affect
grades, and independent factual verification receives text only.

| Trigger | Endpoint / operation | Runtime source |
| --- | --- | --- |
| Build a cloud-enabled interview | `POST /api/plan` → `interview_plan` | `web/app/page.tsx` → `web/lib/premium-service.mjs` |
| Submit a non-skipped conversational answer | `POST /api/interviewer` → `adaptive_interviewer` | `web/components/conversation-studio.tsx` → `web/lib/premium-service.mjs` |
| Finish either interview mode, after media finalization | `POST /api/grade` → `answer_grade` | `page.tsx` → `lib/session-grading.mjs` → premium service; two concurrent, single content-rubric/key passes |
| Legacy callers only: missing factual checks (not current website) | internal `answer_accuracy` call | Retained compatibility factual assessment |
| Legacy callers only: contradicted facts or appeal (not current website) | internal `answer_verification` | Retained compatibility rubric/factual reassessment |
| Correct a transcript, or regrade / appeal from the report | `POST /api/regrade` → `answer_regrade` only | Page or PremiumReview → premium service with `assessmentMode: content`; high-thinking rubric/key assessment |
| Review a completed consented session | `POST /api/session-report` → `session_report` | PremiumReview; waits for completed grades; invalidated when evidence changes |
| Review recorded excerpts | `POST /api/clip-feedback` → `clip_coaching` | PremiumReview; at most six locally selected timestamped transcript excerpts plus current answer/grading context; no uploaded video |
| Ask for an explanation or practice drills | `POST /api/coach` → `practice_coach` | PremiumReview, on explicit button click |
| Resume offline question-bank generation | `bank_authoring`, `bank_review` | `web/scripts/author-question-bank.mjs`; no public HTTP endpoint |
| Run the model comparison | `grader_verification_benchmark` | `web/scripts/evaluate-graders.mjs`; offline CLI only |

The retained compatibility endpoints `/api/questions`, `/api/interview-turn`
and `/api/analyze` still call Gemini if invoked with valid consent, using
`interview_questions`, `interview_turn` and `interview_feedback`. The current
website uses the new split paths. `/api/transcribe` remains an eligible paid
adapter (`transcription`); the current website transcribes locally and does not
call it. `GET /api/health` checks configuration only and never calls Gemini.

Nonempty technical answers receive AI grading even when shorter than five words;
notation and concise factual results are valid interview answers. Short behavioral
answers remain unscored. Missing factual evidence becomes provisional with retry,
not a completed blank assessment. Local semantic review says AI is required rather
than claiming there was no checkable fact. Bare unambiguous executable results
can be checked locally without a spoken formatting prefix. Skips, local-only practice,
recording, playback, speech recognition/synthesis, score arithmetic, truth-table
and calculation checks, exports, and normal UI actions do not call Gemini.

Every request receives the shared Cadence interviewer identity plus an operation-
specific role from `interviewer-instructions.mjs`. Live questioning, assessments,
report debriefs, authoring and transcription have distinct output duties. The full
rubric remains injected, but criterion/version output is required only when the
response schema actually contains a rubric. Transcription adds no dialogue.

## Request behavior

No grading requests start between turns. The next question waits for transcript finalization, the adaptive interviewer and optional ElevenLabs speech. Final media is saved and devices released before two concurrent content assessments run. The grading chamber reports completion and supports cancellation with retryable saved answers. Interviewer
failures retain the submitted answer and offer retry or an explicit local-bank
transition; grading failures appear in the report for regrading. Corrections
invalidate generated report, clip feedback and drills before regrading. A grade
may require up to three sequential operations (grade, factual assessment, rubric
verification); the browser allows 240 seconds while preserving the answer.

Mixed coverage is enforced by a server-validated schedule. Introductions and
probes are outside the main-topic quota. Only a substantive technical answer
can receive a probe, and probes cannot receive another probe. Technical main
questions for the four supported tracks must preserve the sampled canonical
task, tying the question to its answer key; Gemini can add a brief natural bridge.
It generates probes from the current answer, question, answer key and recent
history, and can choose to move on without probing.

## Models and usage

`GEMINI_MODEL` selects the interviewer/planner model and defaults to
`gemini-3.5-flash-lite`. `GEMINI_GRADING_MODEL` optionally selects a separate
grader; without it the primary model is used. `GEMINI_FALLBACK_MODEL` is the
existing optional transient-retry model. All attempts preserve high thinking.
The October 25 factual holdout found 8/8 successful correct Lite responses and
3/8 successful correct Flash 3.8 responses, with five Flash request failures.
All completed responses were correct on that small set. The stronger model was
not promoted automatically. See `web/evaluations/grader-benchmark.json`.

Each response includes safe request metadata: operation, actual model, status,
attempts, duration and provider input/output/thought/total counters when present.
The report shows a session activity ledger and includes it in the JSON export.
Optional `AI_TELEMETRY=true` enables metadata-only server logging. No transcript,
resume, credential or thought text is included in these logs. Missing counters
are unavailable, not evidence of zero billing; an upstream failed attempt may
consume tokens that were not returned. Usage is session-local, not account billing.

The provider permits four active requests per isolate and a bounded queue of
sixteen waiting requests. A queued request times out after fifteen seconds.
Transport/transient server failures receive at most one retry within a sixty-
second operation deadline; invalid credentials and quota failures are not retried
automatically. Offline bank authoring/review use a 180-second deadline with a 90-second first attempt. This is bounded backpressure, not a distributed quota or billing
system. The Site remains private and unchanged; account/key rotation is not used.

## Evidence and limits

All grades load the versioned rubric at request time. Source quotations and
answer quotations are validated; totals and factual caps are computed in code.
The bank distinguishes AI-reviewed keys from executable-verified results and
does not claim human expert certification. Citation validation checks supplied
reference consistency, not the universal truth of every statement. Raw arbitrary
candidate code is never executed. Supported reference programs perform bounded
math, algorithm traces and Boolean truth-table simulation.

Session and clip calls require the same explicit cloud consent as answer grading.
Unpaid Gemini remains restricted to fictional, non-sensitive text. Real personal
answers, raw audio/video and resumes remain blocked under unpaid Gemini. No new
persistent cloud storage, billing activation, public access or secrets are created.
