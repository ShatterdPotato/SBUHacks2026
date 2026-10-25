# Faster conversation and coverage recovery

October 25, 2026. Agent: montasir. Continuation on `codex/montasir-eye-contact`.

## Observed cause

Recent production logs showed successful `/api/interviewer` requests taking
2539–5039 ms and `/api/speech` taking 1396–3475 ms. A 3523 ms interviewer request
returned HTTP 502. The supplied screenshot's message matches the server rejecting
an early model `finish` before required topic coverage. Before requests, the UI
waited five seconds of silence, completed pending local Whisper Base batches and
could rerun the complete answer. Those waits were sequential.

## Implementation

- Default end pause is two seconds; 3/5/7/10 remain selectable and “I'm done
  speaking” bypasses the pause. Quick conversation uses local Whisper Tiny English,
  six-second batches and one final caption pass. Extra transcript accuracy opts into
  Whisper Base, twelve-second batches and guarded whole-answer refinement.
  Individual practice retains Base by default. Caption corrections and the original
  local recording remain available; no raw audio is sent to cloud services.
- The final caption batch trims trailing low-volume padding, skips already-captioned
  silence, and still awaits remaining recognized speech. Existing word timestamps,
  answer offsets, candidate-only listening gates, recordings and evidence survive.
- Planned technical-bank transitions with no eligible probe and completed coverage
  return without redundant model calls. Dynamic action schemas exclude premature
  `finish`. If a provider nevertheless returns it,
  the server continues to the required bank or fresh curated topic without discarding the answer or requiring retry.
  Fabricated quotes, unrelated questions and invalid coverage remain rejected.
- Adaptive Gemini operations retain high thinking. Content grading stays after
  interview completion, with the same rubric and bounded concurrency.
- ElevenLabs defaults to `eleven_flash_v2_5`, keeping the fixed voice ID, secret,
  consent and 1.25x pitch-preserving playback. Server `ELEVENLABS_MODEL` can select
  the former `eleven_multilingual_v2`. The owner’s runtime secrets are preserved.
  This still uses complete MP3 files, not streaming audio. Flash's latency/quality
  tradeoff is documented by [ElevenLabs](https://elevenlabs.io/docs/eleven-api/guides/how-to/best-practices/latency-optimization).

## Verification

- **178 automated tests pass**, including no-call bank/finish paths, constrained
  actions, premature-finish recovery, reference/quote/coverage safeguards, quick/
  accurate model selection, final caption preservation, silence trimming, short
  caption batches, existing media lifecycle, consent and high-thinking grading.
- Browser fixture deliberately returned a premature finish after a substantive
  technical answer. The next technical topic appeared without an error/retry.
  Short declined answers advanced immediately. Exactly three main topics plus
  introduction were saved before the four-answer grading chamber opened.
- Synthetic recording benchmark on this machine, measuring speech ending to the
  next question listening, excluding cloud AI/TTS and initial model loading:
  Base / 12-second batches / no whole-answer rerun: **11038 ms**;
  Tiny / 12-second batches: **6483 ms**;
  Tiny / 6-second batches: **2762 ms**.
  These are illustrative single transitions, not statistical or physical-device
  performance guarantees. Even the Base comparison already used the new 2-second
  pause and disabled full-answer refinement; it is not an original-release baseline.
- Quick mode recognized both fictional sample answers, with 35 timed words each.
  One phrase changed “count it” to “counted”; this is a caption accuracy tradeoff,
  not a claim of equivalent recognition quality. Raw recordings remain authoritative.
- Both selected exports decoded with audio: 5.36 s range -> 5.34 s decoded,
  RMS .0828; 6.40 s range -> 6.36 s decoded, RMS .0906. Continuous recording offsets
  remained distinct (0.056 and 14.544 s). The blank synthetic camera had unavailable
  visual/gaze evidence, as expected. No physical microphone/camera was used.
- Reusable fixtures: `latency-harness.tsx` and `speech-latency-harness.tsx` under
  `web/tests/fixtures/`. Temporary routes and generated audio were removed before
  production build. First speech-model downloads can still delay startup. Actual
  cloud follow-ups and TTS add network/provider time; no zero-latency claim is made.

Final type/build and hosted verification/publication results are in HANDOFF.md.
