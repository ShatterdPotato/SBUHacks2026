# Cadence demo and verification

October 25 follow-up: factual grading now handles concise technical answers, retries missing/invalid checks with a focused high-thinking factual pass, and reassesses rubric explanations after factual findings. Reports expose per-answer accuracy and coverage. Replay waits for decoded seeks and WebM duration discovery, with retryable failures. Every Gemini operation now receives an explicit interviewer role matched to its output schema. See [follow-up QA](qa/FACTUAL_REPLAY_2026-10-25.md).

Current premium implementation (October 25): separate high-thinking planning, adaptive interviewer and background grader; selective verification, regrading/appeals, session synthesis, evidence-aligned clip coaching and on-demand drills. Four technical banks include original sourced questions with explicit AI-review provenance and independently executable exercises. Strict randomized coverage, retries, preserved answers and a session usage ledger are implemented. [Operation map](GEMINI_OPERATIONS.md) and [current QA](qa/PREMIUM_2026-10-25.md) supersede older configuration/route/count notes below. No human expert certification or hosted deployment is claimed.

All current Gemini operations request high thinking. Current verification: 113
tests, TypeScript, production build, four-track bank validation and live fictional
requests for all new operations. See [premium QA](qa/PREMIUM_2026-10-25.md).

Earlier October 25 checks: [feedback grounding QA](qa/FEEDBACK_GROUNDING_2026-10-25.md). Verify introductions and behavioral answers transition without probes; technical answers may have one. Review separate Technical content and Behavioral responses cards, content-only answer headers, literal evidence and concise corrections. Behavioral-only sessions show unavailable technical content/accuracy. Clip captions reference their own speech instead of shared boilerplate; local estimates remain labeled.

Current source procedure, October 24, 2026. Start with [HANDOFF](HANDOFF.md);
the last recorded hosted build predates the conversational source. Use the local
checkout for new features until the original Site is published by an authorized
owner/editor. Check results from this refresh are in [REPOSITORY_AUDIT](REPOSITORY_AUDIT.md).

## Setup and required checks

Requires Node.js 22.13+ and pnpm 11.25.0. From `web/`:

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm exec tsc --noEmit
pnpm build
pnpm dev
```

Finish installation before concurrent checks; automatic pnpm installs can collide
on Windows. Stop dev before a build if generated PDF/model assets are locked.
Package scripts prepare same-origin PDF.js/MediaPipe files and the isolated speech
worker. Restart dev after speech-worker source changes. Open localhost:5173 in a
supported browser. No provider key is needed for local practice.

## Credential-free text conversation

1. Leave cloud AI off. Enter a target role such as McDonald's cashier, optional
   fictional background and a target of 3–6 main topics. Choose conversation format.
2. Build the interview, turn off camera/microphone and start. Verify that questions
   speak with an available local English voice, or clearly fall back to readable
   text. No native device permission should be requested for text practice.
3. Submit a specific answer, a vague answer and a skip. Try one local follow-up
   after a substantive answer, interruption, pause/resume and early finish.
4. Review content feedback and unavailable delivery for text-only practice.
   Unsupported stories should have unavailable Knowledge / accuracy. For the
   curated $8.65/$20 change question, a single $10.35 answer should be contradicted
   with $11.35; a single correct amount should be supported.
5. Export the JSON. Skips remain unscored, there are no fabricated clips, and
   evidence quotes come from transcripts. Use per-answer `analysis.mode` and
   question `source` for provenance; top-level `mode` is question-generation mode.
6. Start fresh with ML-heavy resume background and a cashier target. Practical
   service/register topics should dominate. Generate successive sessions and
   inspect variety; finite bank exhaustion and reload can allow repeats.

## Explicitly consented physical conversation recording

Do these steps only with the user's explicit device/media consent. These are an
acceptance checklist, not a claim that hardware has been verified.

1. Select camera/microphone, check local-processing consent and start once.
   Confirm native permission handling, visible preview and model-loading status.
   Models download on first use; use headphones to limit interviewer echo.
2. Speak and confirm captions arrive in short batches and finalize at turn end.
   Recognition should exclude interviewer playback. Test 5/7/10-second waits,
   manual completion and the three-minute answer cap.
3. Confirm continuous recording across main questions and follow-ups. Pause
   listening and verify that the UI explains recording continues; resume, interrupt,
   skip and finish early. Exercise the twenty-minute session limit separately.
4. Finish and replay strong/improvement moments. Later turns must seek to their
   later global positions within the same recording. Export a range from each
   category, reopen the files and confirm audible audio plus the intended duration.
   Download the full interview once.
5. Correct a recognized transcript in the report and recheck locally. Content/
   reference feedback changes; original delivery and timing evidence remain.
6. Test denied permissions, device disconnect, interrupted recognition, slow model
   load, cancellation and unmount. Confirm recordings/transcripts remain available
   where promised and camera/microphone indicators switch off at finish/unmount.
   Real-person head/framing quality and noisy/accented speech need separate checks.

## Individual answer mode

1. Choose Individual answer practice. With media consent, enable preview/devices,
   record, stop, review captions and optionally correct them. Retry transcription
   from the saved audio, then retake and verify the replaced clip is released.
2. Save several distinct speech sections. Check variable-length strong/improvement
   moments, whole-answer fallback when timing is missing, replay and separate
   exports. Camera preview remains on after stopping an answer until device-off
   or session completion; confirm visible status and explicit shutdown.
3. Complete a text-only session too. Delivery/recordings should stay unavailable,
   and unanswered questions should not acquire scores.
4. If a consented live analysis fails, verify the answer/recording survives for retry.

## Live AI consent paths

No live provider or cloud media call was needed for the repository audit. Use
only authorized securely configured credentials; never print `.dev.vars`.

| Path | Acceptance check |
| --- | --- |
| Unpaid Gemini personal questions | Upload a local PDF/TXT with My real experience. Review/edit extraction and generic role/skill tags; exclude a tag. Consent and generate. Request contains only validated generic profile/settings/consent/variation; no raw resume/context. Personal individual-answer feedback stays local. |
| Unpaid Gemini fictional setup | Select A fictional sample, use the repository fixture or invented context and give matching provider consent. Generate questions and submit fictional individual answers; inspect grounded evidence, errors/retry and curated recovery preserving input. |
| Independent conversational AI | Give the separate studio opt-in and use fictional/non-sensitive answers under unpaid Gemini. Verify text-only question/answer, broad role and ≤4 prior turns; no raw resume/audio/frames. Check an adaptive follow-up, valid references, deterministic arithmetic override and explicit local fallback on provider failure. |
| Eligible paid Gemini/OpenAI | Requires owner-authorized provider/billing/data handling and matching cloud consent. Current UI still uses local transcription. Individual-mode camera notes additionally require frame consent; notes do not change scores. Retained direct PDF/audio API adapters need their own live checks. |

Changing setup source/privacy/provider must not silently reuse incompatible
consent. Unpaid raw PDF/audio/frame routes must remain blocked. Partial contact
validation does not anonymize text. Do not use real personal answers in fictional
AI paths. Provider-safe errors should distinguish quota, credentials, model,
settings and transport without exposing upstream bodies.

## Automated and synthetic coverage

`pnpm test` runs the Node regression suite, currently **137 cases**: setup/retrieval, role
priority/variety, resume allowlists/text, consent/limits, both provider adapters,
retry/error categories, reference filtering/arithmetic, speech-refinement retention,
delivery coverage and excerpt offsets. New regressions cover opener-only setup,
response/context-based questions, exact quotes, rubric injection on retries,
missing/stale evidence rejection, server totals, severity/partial-credit caps,
citations and prior-feedback deduplication. Provider calls in the unit suite are mocked. Premium tests add category quotas,
answer-key binding, adaptive probes, executable references, independent verification,
clip/report quotes, regrading and paid-frame consent preservation.
TypeScript and production build check contracts/bundling, not device behavior.

Reusable browser fixtures require manual setup on the **actual Vinext origin**:

- `web/tests/fixtures/worker-origin.html`: temporarily serve under ignored
  `public/qa-fixtures/` to verify real worker warm-up/model inference.
- `web/tests/fixtures/conversation-harness.tsx`: temporarily copy to
  `app/qa-conversation/page.tsx`; generate synthetic speech with
  `build-conversation-audio.ps1` and serve it under `public/qa-fixtures/`.
  The harness replaces getUserMedia with synthetic media and verifies continuous
  turns and audible exports without physical devices.

- `web/tests/fixtures/adaptive-interview-harness.tsx`: temporarily copy to
  `app/qa-adaptive/page.tsx`. The real app/business API/report use mocked Gemini
  transport. With fictional text-only input, verify generated probe/main transition,
  quote highlighting, settings/history/feedback, rubric/caps, bold critical
  feedback and downloaded JSON. No live provider or devices.

- `web/tests/fixtures/premium-harness.tsx`: temporary `app/qa-premium/page.tsx`,
  full premium interview/review with mocked transport.
- `web/tests/fixtures/clip-feedback-harness.tsx`: temporary `app/qa-clips/page.tsx`,
  fictional excerpts through live Gemini (consumes quota; no video upload).

- `web/tests/fixtures/clip-replay-harness.tsx`: temporarily copy to
  `app/qa-replay/page.tsx`. Generate moving canvas frames and a synthetic tone
  through MediaRecorder, then verify early/later first play, repeated replay,
  bounded stops and audible exports. No physical capture or provider upload.

Run `node scripts/verify-question-bank.mjs` from `web/` for bank validation.
Remove temporary routes/public fixture files before production builds.
The standard Node test command does not run these browser fixtures.

## Dated evidence index

| Record | Scope and provenance |
| --- | --- |
| [Conversation QA](qa/CONVERSATION_2026-10-24.md) | Historical 64 tests/type/build; actual-origin synthetic turns and audible exports; fictional live Gemini questions/follow-up/arithmetic. No physical devices. |
| [Worker-origin fix](qa/WORKER_ORIGIN_FIX_2026-10-24.md) | Historical 53-test checkpoint; reproduced file-origin/HMR failures, then verified standalone worker warm-up/transcription at the app origin. |
| [Recording-first QA](qa/RECORDING_FIRST_2026-10-24.md) | Historical 53 tests/type/build; public speech fixture, local captions, distinct exports with audio. Synthetic canvas had no face/pose detections. |
| [Continuation](qa/CONTINUATION_VERIFICATION_2026-10-24.md) | Historical 44 tests/type/build; hosted fictional PDF/questions/answer/report and actual downloaded JSON; focused responsive/help checks. |
| [Resume audit](qa/RESUME_BROWSER_AUDIT_2026-10-24.md) | Historical 125 browser scenarios, baseline failures and focused retests with separate parent PDF/source checks. Original ledgers retain their observations. |
| [Repository audit](REPOSITORY_AUDIT.md) | Earlier documentation audit before adaptive/rubric implementation. |
| [Adaptive rubric QA](qa/ADAPTIVE_RUBRIC_2026-10-24.md) | Earlier 80 tests/type/build and controlled real-app browser flow, rubric/caps and validated JSON. No live provider/devices. |
| [Local Gemini setup](qa/LOCAL_GEMINI_SETUP_2026-10-24.md) | Subsequent authorized local key setup; real generic opener and fictional rubric turn returned HTTP 200. No personal data, media or deployment. |

Physical media, real-person vision/ASR quality, live paid media, full Firefox,
screen-reader/focus-boundary and low-resource performance checks remain open.
Earlier focused Chromium checks and synthetic exports do not close these gaps.
