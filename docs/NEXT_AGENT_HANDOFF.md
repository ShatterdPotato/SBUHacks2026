# Next agent: eye/body tracking and delivery evidence

Updated October 25, 2026. This is the human-requested torch handoff, not a task
dispatch or delivery receipt. Read TEAM_CONTEXT.md and docs/HANDOFF.md first.

## Your assignment

The user wants eye tracking and body-language tracking so the Confidence rating
has stronger observable evidence. Implement and validate optional, local tracking
within the existing interview flow. Do not treat gaze as proof of emotional
confidence, attention, honesty, personality or hiring fitness. The product label
currently means a practice delivery estimate. Distinguish the candidate's delivery
rating from the tracking system's own reliability/coverage.

The next feature is not implemented yet. Start by measuring what the camera can
reliably observe, add calibration and clear unavailable states, then determine
whether validated measurements should affect delivery scoring. Do not increase
scores simply because a face was detected or penalize unavailable tracking.

## Start state and publication

- Repository: https://github.com/ShatterdPotato/SBUHacks2026.
- Working branch: `codex/gearwell-frontend`; website commit: `fe0db58`.
- Existing draft PR: https://github.com/ShatterdPotato/SBUHacks2026/pull/14.
  Check its state before continuing; do not assume it has merged. Preserve teammate
  changes and inspect the working tree before editing.
- Cadence is the website name. Gearwell is the interviewer and imported visual
  design. The brass aesthetic, gate, VRM model and fixed ElevenLabs voice remain.
- Local preview: http://127.0.0.1:5173/. Start with `pnpm dev` from `web/` if needed.
  The prior agent left it running, but process availability must be checked.
- Last application verification: 157 tests, `pnpm exec tsc --noEmit`, `pnpm build`.
  See `docs/qa/REVIEW_REFRESH_2026-10-25.md`. Browser fixtures are not physical-camera
  validation. The original hosted Site was not redeployed; Git publication is
  separate. Preserve the Site identity/audience and use its authorized owner flow
  if the human later requests deployment.
- Local secrets remain in ignored configuration. Never print or commit them.
  Personal resumes, recordings, transcripts and generated reports are not Git assets.

## What exists today

| Source | Existing behavior / extension point |
| --- | --- |
| `web/public/vision-capture.worker.js` | Classic MediaPipe worker; one face and one pose; local frame inference. Emits `facing`, `shouldersVisible`, `bodyShift` with timestamps and generation IDs. No eye-gaze estimate, calibration, emotion or identity analysis. |
| `web/lib/recording-coach.ts` | Owns audio/speech/vision workers, frame sampling, listening gates, evidence buffers and turn-relative timestamps. Extend `VisionEvidence` here. |
| `web/lib/recorded-delivery.mjs` | Combines speaking pace, fillers/repetitions, pauses, head direction and framing. Ordinary movement is currently descriptive only, not penalized. |
| `web/lib/recorded-delivery.d.mts` | A second Vision type exists here. Update it with the runtime contract and any fixtures; changing only the worker silently loses fields. |
| `web/components/conversation-studio.tsx` | Continuous recording, consent, interviewer playback/listening state, turn finalization and recording offsets. |
| `web/app/page.tsx` | Individual recording, corrections, end-session grading and report UI. Both interview modes need the same tracking behavior. |
| `web/lib/session-grading.mjs` | Saves the measured `take.delivery.score` over the AI response's confidence field. Keep delivery independent of Gemini text judgments. |
| `web/lib/report-ratings.mjs`, `web/components/report-gauges.tsx` | Confidence averages available recorded delivery; text-only answers are excluded. Keep unavailable values null. |
| `web/lib/report-pdf.mjs` | Local PDF generation. Update explanations/coverage in the report and PDF together if rating semantics change. |
| `web/tests/recorded-delivery.test.mjs` | Existing evidence thresholds, movement neutrality and missing-evidence tests; add meaningful tracking regressions here or alongside it. |

## Tricky code and concrete pitfalls

1. **Head direction is not eye gaze.** The current worker uses eye-corner landmarks
   33/263 and nose landmark 1 to calculate a normalized nose offset, averages three
   samples, and compares it with `.3`. Eye corners provide a head-width reference;
   there is no pupil/iris gaze calculation. Do not rename `facing` to eye contact.
   Verify the model's current landmark contract against official documentation
   before choosing iris or eye geometry.

2. **Sampling is currently sparse.** `sampleVideo` runs every 500 ms and resizes to
   384 pixels wide. Do not claim blink/saccade measurement from this pipeline.
   Benchmark any higher rate/resolution on real devices before adopting it; it
   competes with local Whisper and the Three.js avatar. Preserve the `visionBusy`
   single-frame backpressure gate, transferable ImageBitmap ownership, and
   `frame.close()` / `frameDone` in the worker's `finally` block.

3. **Measurement absence is not a negative observation.** Worker values are nullable.
   Current scoring needs eight usable samples and 70% detection coverage before
   using a visual component. These thresholds are existing heuristics, not a gaze
   accuracy validation. Coverage currently counts returned samples, not elapsed
   camera time; include dropped/stalled intervals in any new temporal reliability
   measure. Do not convert nulls to false, and do not double-count correlated head
   and eye measurements. Available component weights are renormalized.

4. **Worker formats matter.** The vision worker is deliberately classic because
   MediaPipe's WASM loader uses `importScripts`; speech is a separately bundled
   module worker at `/vendor/speech/speech.worker.js`. Vinext HMR/import.meta.url
   rewriting previously broke workers. Use the package build scripts, preserve
   local WASM serving, and restart dev after worker changes.

5. **Three clocks must stay aligned.** MediaPipe receives monotonic
   `performance.now()` timestamps. Evidence `at` uses the audio-sample clock
   (`samples / 16000`). `finishTurn(start)` filters and subtracts the turn origin;
   `recordingOffset = turnStart - recorderOffset` places a clip in the continuous
   recording. Do not substitute wall-clock time or double-subtract offsets.
   Preserve generation IDs so delayed worker results cannot contaminate a new take.

6. **Only score the candidate's answering interval.** `sampleVideo` requires
   `active && listening && visionReady && !visionBusy`. Interviewer speech,
   thinking time and pauses are gated out; the video may continue recording while
   listening is paused. Keep calibration samples separate from answer evidence.
   Preserve camera/mic release on finish, cancel, disconnect and unmount.

7. **React does not own the avatar's moving DOM.** `GearwellMarkup` in
   `web/components/gearwell-shell.tsx` is memoized because the imported controller
   reparents the canvas and controls between portal mounts. Replacing its HTML
   during state updates detaches portals. Keep IDs stable. Add tracking overlays
   to the candidate camera tile, not the avatar canvas. The preview is mirrored
   with CSS; verify overlay coordinates against the unmirrored inference frame.

8. **Preserve the latest latency fix.** There must be no `/api/grade` calls between
   questions. `finishInterview` finalizes media and releases devices before
   `gradeSavedAnswers` runs two requests at a time. `assessmentMode: content`
   bypasses legacy accuracy/verification calls. Do not resurrect separate factual
   scoring or use Gemini vision for eye tracking. All existing Gemini operations
   retain high thinking and the mandatory rubric.

9. **Preserve voice/animation behavior.** `web/gearwell/avatar.js` locks Relax while
   `GearwellInterview.active`; it deliberately avoids restarting that loop on every
   voice phase. Mouth movement follows ElevenLabs playback independently. Edit
   avatar source and rebuild its generated bundle, not the generated asset itself.
   Voice consent is separate from camera/AI consent.

10. **Score corrections must not rewrite physical evidence.** Corrected transcripts
    can trigger regrading and invalidate report/clip synthesis, but delivery remains
    based on the original measured recording. Keep this separation in correction,
    appeal, retry and export flows. Do not let text-only answers inherit a fabricated
    camera or delivery score.

## Recommended implementation sequence

1. Reproduce both recording modes and the current delivery breakdown. Establish
   baseline frame rate, CPU load, sample coverage and timestamp alignment.
2. Design an optional calibration and tracking-quality UI. Explain what is measured;
   let users skip, disable or recalibrate without losing the interview. Keep raw
   frames/landmarks local and preserve explicit media/cloud consent boundaries.
3. Prototype eye orientation relative to a calibrated camera/screen region and
   neutral body measurements such as visible framing and measured posture changes.
   Report estimates/uncertainty, not guaranteed eye contact or psychological state.
   Avoid a blanket penalty for looking away, normal gestures or ordinary movement.
4. Carry timestamped, quality-qualified measurements through the shared evidence
   types. Build pure measurement/aggregation functions with testable fixtures rather
   than embedding all math inside UI handlers.
5. Validate measurements before changing Confidence weights. Until validation is
   adequate, expose descriptive observations with unavailable states and retain the
   existing score. Explain any eventual weights, excluded evidence and coverage in
   the report; update the PDF and context files at the same time.
6. Verify the integrated recording/voice/grading flow and performance. Run the
   required checks from `web/`: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`.
   Remove temporary QA routes before the production build; retain safe fixtures.

## Acceptance evidence to collect

- Calibration failure, off-center camera, glasses/reflections, low light, occlusion,
  partial face/shoulders, no detection, camera motion and dropped frames produce
  explicit uncertainty/unavailable results rather than confident negative scores.
- Synthetic geometry/timestamps test math and stale-result rejection. Real-camera
  checks separately establish tracking behavior; do not describe fixtures as proof
  of real-user gaze accuracy. Never commit identifying recordings or landmark traces.
- Camera disabled, text-only mode, reduced motion, pause/resume, interviewer speech,
  early finish, cancellation, disconnect, transcript correction and retry all work.
- Clip seeking/offsets and continuous recording remain correct; missing visual data
  does not prevent transcript grading or PDF download. Check mobile performance
  alongside local Whisper and the avatar, not in an isolated tracking demo alone.
- Update `TEAM_CONTEXT.md`, `docs/HANDOFF.md`, architecture, feature status and a
  dated QA ledger with actual findings and remaining limits. Push to the correct
  branch/PR after inspecting its current state. Do not claim hosted deployment,
  main-branch merge, or message delivery without tool evidence.
