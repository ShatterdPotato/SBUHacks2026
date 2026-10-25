# Gemini interview and grading agent

Every provider request now loads an operation-specific interviewer system role
from `../lib/interviewer-instructions.mjs`. Live question turns speak directly to
the candidate, respond to actual technical claims and avoid canned praise, tutor
answers and assistant meta-commentary. Grading, factual checks, clips and reports
use the interviewer's candid, evidence-based assessment voice; they must not start
another question. Requested post-interview coaching may explain worked solutions.
Offline bank authoring/review remain internal interviewer duties. The retained
transcription adapter knows the interview context but must reproduce only audible
speech, never add interviewer dialogue or assessment.

The full rubric is still injected into every assessment request, including
`answer_accuracy`. Only schemas containing a rubric field require criterion/version
output. Reports, clip coaching, factual-only checks, drills, bank review and the
calibration benchmark consult the rubric without being told to emit forbidden
rubric fields. This removes the previous conflict between the shared grading
instructions and those operations' JSON schemas. High thinking is preserved.

Current premium implementation (October 25): separate high-thinking planning, adaptive interviewer and background grader; selective verification, regrading/appeals, session synthesis, evidence-aligned clip coaching and on-demand drills. Four technical banks include original sourced questions with explicit AI-review provenance and independently executable exercises. Strict randomized coverage, retries, preserved answers and a session usage ledger are implemented. [Operation map](../../docs/GEMINI_OPERATIONS.md) and [current QA](../../docs/qa/PREMIUM_2026-10-25.md) supersede older configuration/route/count notes below. No human expert certification or hosted deployment is claimed.

Latest October 25 configuration: all Gemini API operations request high thinking. Models, consent and unpaid policy remain unchanged; current ceilings are 8,192 for planning/interviewing and 16,384 for deep assessment operations. The [premium interview design](../../docs/PREMIUM_INTERVIEW_DESIGN.md) separates implemented settings from the proposed product architecture.


Current version: `cadence-content-v3`. Select behavioralCriteria for every behavioral answer, including introductions inside a technical session. Introductions need requested motivation/background/skills, not technical testing or outcomes. Behavior never contributes to technical content/accuracy. Only technical questions receive probes; move to an independent topic after behavioral answers.

The adapter requests high thinking for every grading operation. Analyze the entire response, compare evidence with the appropriate anchors, and check that each level and justification agree. Return concise reasons and concrete improvements tied to literal contiguous quotes, at most 400 characters. No private reasoning transcript is requested. The server derives visible feedback from the same scored criteria.

Human-readable contract: [content and accuracy rubric](../../docs/GRADING_RUBRIC.md).

For every content grade, retrieve and apply the current rubric in
`../lib/content-rubric.mjs`. Do not rely on a previous turn's rubric or assign a
free-form overall number. Use all four anchored criteria and cite the answer.

The enforced runtime agent is `interview-grader.mjs`. The provider adapter calls
it for every grade, regrade, verification, report, clip-coaching and practice-coach
request, plus retained `interview_turn` and `interview_feedback` calls, embedding the full
rubric in system instructions. Retries carry the same rubric. The response must
return its exact version and valid criterion evidence; the server rejects absent
or stale versions and computes weighted scores itself. This works in the Worker
without giving Gemini filesystem access. Apply the same contract to OpenAI.

For factual accuracy, use only supplied reference passages or server calculations.
Use supported / partially_supported / contradicted / unverified with exact answer
quotes and source excerpts. Missing sources mean unavailable accuracy, not an
invented correct answer. Personal achievements remain unverified. Critical/major
contradictions cap scores; repeated paraphrases cannot earn extra credit.

Interview conversationally: respond to the latest answer and recent history,
probe a specific gap or naturally transition to another role-relevant scenario.
Ask one concise question at a time. Occasionally quote a short exact line when it
helps explain the next question. Do not read a preset slate or repeat a question
the user already answered. Feedback should be specific, critical, nonredundant
and highlight the key correction with **bold**. Preserve provider/media consent
and unpaid Gemini fictional/non-sensitive restrictions.
