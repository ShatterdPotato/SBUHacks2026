# Premium interview design — October 25, 2026

Implementation update: the runtime operations, question banks, deterministic checks, usage instrumentation, retry/regrade UI and fixed factual model comparison are now implemented. See [the operation map](GEMINI_OPERATIONS.md) and [current QA](qa/PREMIUM_2026-10-25.md). Human expert certification, persistent account progress, distributed quotas and hosted deployment remain outside the completed local implementation. The proposal below is retained as design rationale.

Original proposal:
The change implemented with this proposal sets every current Gemini request to
`thinking_level: high`, including question generation and the retained cloud
transcription adapter. Grading was already high. Existing token ceilings remain
4,096 for question generation and 8,192 for grading/transcription. Current models,
privacy boundaries, media consent, stateless requests and billing are unchanged.

## Verification of the implemented setting

On October 25, 2026, `pnpm test` passed all 92 tests, `pnpm exec tsc --noEmit`
passed, and `pnpm build` completed. Payload assertions cover high thinking for
question generation and the retained paid transcription adapter; existing
grading/retry coverage remains in place. A real, generic AI/ML question-generation
request returned HTTP 200 and a technical data-leakage investigation question.
That single smoke check is not a latency or quality benchmark. Cloud transcription
was mocked, not exercised with uploaded media. No hosted deployment was performed.

## Where Gemini adds value

| Operation | Proposed use | Execution |
| --- | --- | --- |
| Interview planning | Map approved role, level, skills and goals to competencies, difficulty and coverage targets. Retrieve relevant verified bank entries. Plan coverage, not a fixed spoken script. | Once at setup; revise only when goals materially change. |
| Interviewer | Interpret the latest answer, decide whether a technical probe is useful, and phrase one natural next question. Anchor probes in actual claims, mistakes or missing steps. Respect no probes after introductions/behavioral answers. | One interactive call per submitted answer, with structured session state. |
| Answer grader | Assess the complete answer against the question's answer key and rubric, with exact evidence, reasoning quality and factual status. Explain uncertainty and support alternative correct solutions. | Background call per answer, separate from the next-question critical path. |
| Verification | Adjudicate ambiguous, contradictory or unsupported grading, using independent reference retrieval and tool results rather than asking for agreement with the first verdict. | Selective second pass; always for defined high-risk grading failures, not blindly for every answer. |
| Corrections and appeals | Regrade a corrected transcript or review a user's challenge; invalidate affected feedback/report/clip conclusions. | Only when the answer or relevant source changes, with applicable consent. |
| Clip coaching | Choose useful moments and write speech-specific explanations from timestamped transcripts and already verified grading evidence. | One batch per completed session; code validates timestamps and quotations and exports media. |
| Final report | Explain recurring strengths/misconceptions, distinguish isolated errors from patterns, and prescribe the next two or three practice priorities. | Once after grades finish, or when corrected evidence invalidates it. |
| Practice coach | Answer follow-up questions about the report, explain an ideal solution and create targeted drills. | On demand. |
| Bank authoring | Draft variants, distractors, explanations, misconception probes and tagging. | Offline pipeline with expert review and source/license tracking before publication. |

Keep recording, media export, timestamp alignment, consent, question-count and
category quotas, score arithmetic, input validation and ordinary UI state in code.
Use a speech recognition system for transcription and a speech synthesis system
for spoken questions. Gemini should not continuously reread every audio/video
frame or invent numeric observations that software can measure directly.
Code execution and circuit simulation supply independent test results; Gemini
explains them. Any new media processing needs appropriate configuration/consent.

## Conversation and responsiveness

Replace the current combined grading/next-question call with separate interviewer
and grader roles. The interviewer receives the current answer, question intent,
verified reference material, coverage state and available earlier grading. It can
probe a relevant assumption while the deeper assessment completes. It must not
assert that an unverified claim is correct. Final results wait for grading.

Benchmark a stronger grading model against the existing Lite model, using a fixed
expert-scored evaluation set. Choose models by factual agreement, evidence
faithfulness, latency and reliability. High thinking alone does not establish
quality. Allow a generous model-supported reasoning ceiling for difficult grades;
measure truncation before choosing budgets. Do not force verbose user-facing text.

Enforce the selected technical/behavioral mix in application code, excluding the
introduction from the coverage quota and counting probes separately. Technical
questions must carry a domain competency, answerable technical task and answer
key. Reject generic teamwork/prioritization prompts labeled Technical. Enforce
non-repetition, difficulty and a limit on consecutive probes. Retain independent
new topics after behavioral answers, as requested.

Use explicit statuses for AI waiting, retrying, local fallback, provisional and
completed feedback. Preserve answers on failure and offer retry instead of
silently replacing the premium experience with generic templates. Persist user
sessions and progress only under a deliberate retention/export/delete contract;
the current app remains memory-only.

## Four technical tracks

Recommended initial target: 250–500 reviewed canonical questions per track,
expanded with tested variations. This is a proposed target; no bank was imported
or pushed as part of the reasoning-setting change.

| Track | Example coverage |
| --- | --- |
| AI/ML | Probability, optimization, linear algebra, statistical learning, evaluation/leakage, neural networks, retrieval/LLMs, deployment and monitoring. |
| Software engineering | Algorithms/data structures, complexity, language semantics, concurrency, databases, distributed systems, debugging, testing and system design. |
| Hardware engineering | Architecture, pipelines, caches, buses/interfaces, memory systems, RTL, timing constraints, clock/reset design and verification. |
| Digital logic | Boolean algebra, K-maps, combinational circuits, sequential logic, FSMs, counters, arithmetic circuits, setup/hold and metastability. |

Hardware and digital logic overlap; share canonical items with multiple tags
rather than duplicating question text. Each versioned entry should include:

- Stable ID, track, competency, prerequisites, level, expected duration and type.
- Prompt, constraints, diagram/code when needed and independent worked solution.
- Essential facts, acceptable alternatives, partial-credit anchors and critical errors.
- Misconceptions and conditional probes tied to actual answers.
- Reference excerpts, URLs, source revision/review date and reuse/license provenance.
- Executable tests, counterexamples, truth tables or simulation checks where possible.
- Review status and evaluation history; separate training examples from holdout tests.

Store source-attributed, appropriately licensed or independently authored items
in the repository. Retrieval supplies a small relevant pack for each call; do not
send the entire bank on every turn. Refresh factual references through an audited
authoring process instead of improvising web search during every answer.

## Reasoning, measurements and capacity

Gemini exposes optional thought summaries and opaque encrypted signatures; these
are not a raw internal reasoning transcript. High thinking already enables its
internal reasoning. For continuity, preserve supported native thought/signature
blocks under an approved state/retention design. Do not reconstruct private
reasoning from summaries or ask the model to invent a chain of thought. Keep
user-facing justifications concise, evidence-based and independently verifiable.
See [Google thinking documentation](https://ai.google.dev/gemini-api/docs/thinking).

Record safe per-request metadata: operation, model, status, attempt count,
latency, input/output/thought tokens, truncation and validation failures. Do not
log keys, raw resumes, interview transcripts or thought text as ordinary telemetry.
Track factual grading agreement, false criticism, missed contradictions,
behavioral/technical misclassification, repetitive questions and user corrections.

Use organization-owned project capacity with documented quotas and budget controls.
More API keys in one project do not increase that project's quota; limits are
project-based. Request suitable capacity and implement queueing/backoff instead
of assuming account count guarantees availability. See
[Google rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).

## Recommended implementation order

1. Usage/latency instrumentation, strict mixed-mode coverage and technical-task validation.
2. A smaller expert-verified bank slice plus executable factual checks for each track.
3. Separate interviewer/grader with stronger-model evaluation and selective verification.
4. Session synthesis, evidence-aligned clips and correction/regrade workflows.
5. Expand reviewed banks, then add retained progress and personalized drills under consent.

The runtime operations, banks, telemetry and optional grader-model routing have been implemented. Native thought-state continuation and new account/storage changes remain deferred; requests remain stateless.
