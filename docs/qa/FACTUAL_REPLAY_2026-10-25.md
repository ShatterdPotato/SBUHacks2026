# Factual accuracy, replay and interviewer-role follow-up

User reported unavailable accuracy for technical questions, frozen clip starts,
and inconsistent interviewer behavior. This follow-up critically revisited the
previous premium implementation instead of inferring success from its test count.

## Confirmed defects and repairs

- The five-word cutoff skipped valid short technical answers. All nonempty
  technical answers now receive consented grading, including mathematical notation.
- An unverified claim could suppress a subsequent valid sourced check. Valid
  evidence now supersedes abstention; harmless line wraps retain canonical quotes.
- Missing/invalid checks could leave a completed assessment with no accuracy.
  Focused answer_accuracy calls distinguish checked, no_claims and out_of_reference;
  failed evidence stays provisional with retry. Local-only review honestly says
  semantic comparison has not run. Reports show per-answer accuracy and coverage.
- Deterministic results suppressed other checks sharing the same answer key.
  Only overlapping claims are protected; a correct final result cannot hide a
  separate wrong explanation.
- A generated probe could look technical in the UI but be classified behavioral
  during grading. The interviewer now rejects behavioral-style technical probes.
- A later factual error could cap numbers while keeping stale rubric praise.
  Full rubric verification now follows factual assessment. Verification must
  address the flagged claim rather than replacing it with unrelated correct facts.
- Clip playback mixed fragment seeking and imperative seeking, and could process
  stale end events while seeking back. The shared controller now discovers missing
  WebM duration, waits for decoded seeks, handles repeated replay and exposes retry.
- The shared prompt called Gemini a generic coach. Some non-grade schemas were
  simultaneously instructed to return forbidden rubric fields. Every operation
  now has a system-level interviewer role and schema-appropriate output duties;
  transcription remains faithful transcription without inserted dialogue.

## Verification

The final regression suite contains 137 passing tests. TypeScript passes.
The production build passes and lists only the product root route; no QA route
is bundled. Existing large-bundle warnings remain. The new tests cover
short answers, factual abstention/invalid citations, evidence deduplication,
score/reason reconciliation, disappearing contradictions, technical probe kind,
operation-specific prompts and asynchronous playback races/readiness.

Five live fictional Gemini cases returned HTTP 200 with completed assessments:
- Hardware 0xFFFFF800: accuracy 100; short correct sign-extension result.
- Hardware 0x00000800: accuracy 0; separate verification retained the correction.
- Digital logic C': accuracy 100; one-token Boolean simplification.
- Natural spoken software complexity paraphrase: accuracy 100.
- Explicit admission of not knowing: no_claims, null accuracy, with a focused
  answer_accuracy call. Null is appropriate here and is not labeled a failed check.

Receipt: outputs/accuracy-qa/live-results.json (ignored fictional test data).
The new persona is exercised live through these grades; automated payload checks
cover every operation. We do not claim perfect compliance from prompt tests alone.

## Actual recorded-media browser checks

The previous premium clip screenshot had empty video players and established
feedback rendering, not replay reliability. This follow-up recorded moving canvas
frames plus a synthetic tone with the actual browser MediaRecorder.

Early (.1–1.6s) and later (4–6s) excerpts advanced and decoded on first playback
and a second replay, with finite duration discovered before playback. End stops
were within about .08s. Later export was 116,718 bytes and decoded to 1.98 seconds
of audio with RMS .03535. No camera/microphone permission or media upload occurred.

Receipts: outputs/replay-qa/measurements.json and verified-replay.png (ignored).
The original intermittent freeze was not reproduced using the synthetic baseline;
concrete race/readiness repairs and real-blob regression checks are established.
The user's physical recording, full Firefox/Safari behavior and device-specific
codec failures remain unverified. Retry/full-recording fallback is available.
Temporary replay QA routes were removed before production checks.

## Publication and boundaries

Same branch and draft PR #13; root will record the final pushed commit. No merge,
hosted deployment, account/billing/storage change, or personal-media upload.
Unpaid Gemini still requires explicit fictional/non-sensitive consent. No numeric
accuracy is invented when the relevant factual assertion or reference is absent.

Follow-up publication: implementation commit `233fe10` is pushed to
`codex/adaptive-interview-rubric` and draft PR #13. Final checks: 137 tests,
TypeScript and production build passed; working preview restarted with root and
health HTTP 200. No merge or hosted deployment.
