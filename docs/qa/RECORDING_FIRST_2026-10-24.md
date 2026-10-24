# Recording-first practice verification

October 24, 2026, America/New_York. Implements the human's request for recorded
audio as the primary answer input, automatic captions, media-based delivery
estimates, and multiple strong/improvement clips. No paid policy or credentials
changed. The existing Site has not been redeployed because this account's Sites
connector returns `Sites project not found`; browser visitor access is separate.

## Implemented source

- English Whisper runs in a browser worker. An AudioWorklet captures 16 kHz
  mono audio from the recording's microphone stream. Captions update in roughly
  twelve-second batches; stop finalizes the remaining audio automatically.
  Typed input is optional correction or text-only practice. Model downloads and
  slow hardware can delay recognition; errors preserve the recording for retry.
- Content/comprehension use that transcript, with optional recognition corrections.
  Existing personal/free privacy and labeled browser-rubric restrictions remain.
- Local face/pose landmark inference supplies observable camera-facing head
  position, upper-body framing and shoulder-center movement. Audio supplies
  pace, low-volume pause intervals and possible filler/word repetitions. The
  report shows heuristic component scores, renormalized weights and missing
  channels. No identity, emotion, eye-contact certainty or stuttering diagnosis.
- Multiple distinct, variable-length speech excerpts can come from one or several
  answers. Both categories replay within selected ranges and export actual
  local audio/video files. Selection uses explicit local delivery/text heuristics;
  timing and frame boundaries are approximate. It is not a correctness judgment.
- Retry retains existing sampled evidence. Recording generation IDs prevent late
  vision samples crossing into retakes. Devices, workers and AudioContexts close
  on completion, reset/unmount, or device shutdown; clips remain local until reset.

## Executed checks

From `web/`, final checks after cleanup changes:

- `pnpm test`: **53 passed**, 0 failed (44 existing, nine new regressions).
- `pnpm exec tsc --noEmit`: **PASS**, exit 0.
- `pnpm build`: **PASS**, exit 0, all five Vinext phases completed.
- `git diff --check`: **PASS**.

Browser synthetic test used the actual `RecordingCoach`, speech/vision workers,
delivery/selection functions and `MomentClip` exporter. It supplied a generated
canvas video plus the public-domain JFK speech fixture linked by the official
Transformers.js documentation. No physical device permission was requested.

- Real local model inference recognized the fixture and produced word timestamps.
- A 23-second fixture (speech repeated with a 0.5-second gap) produced captions
  before capture ended, then finalized successfully. Both moment categories
  appeared from this one recording.
- The vision worker processed synthetic frames successfully, with no face/pose
  detections. Those channels were unavailable rather than fabricated.
- Separate WebM excerpt downloads were re-opened and their audio decoded in the
  browser: **7.14 seconds / RMS 0.1534** and **4.62 seconds / RMS 0.1133**.
  Both contained audible samples and were shorter than the source recording.
- The actual app's text-only fallback completed a three-question session with
  one typed fictional answer and two skips. Confidence stayed unavailable, the
  skips stayed unscored, and no recording clips were fabricated.
- Studio consent and instructions explicitly describe automatic local recognition
  and the first-use model download. Local preview: `http://127.0.0.1:5173/`.

Machine-readable synthetic evidence:
[recording-first-synthetic-2026-10-24.json](recording-first-synthetic-2026-10-24.json).
It contains no Blob URLs, original audio/video, credentials or personal interview
data. QA harness, public speech fixture, screenshots and exported videos remain
local/ignored. Temporary harness hot reloads produced React root warnings during
editing; these were harness-only and are not reported as app failures or clean
application console evidence.

## Remaining limits and manual handoff

Physical camera/microphone capture, real-person landmark accuracy, denied-device
permissions and cross-browser performance remain separate tests requiring explicit
device consent. Synthetic frames do not establish real-person tracking quality.
Recognition can omit speech disfluencies; corrections may be needed. Full
screen-reader and Firefox verification remain open. These checks do not establish
any measured psychological confidence or hiring suitability.

From / To: implementation agent -> Sameer / aiden.sol / next Cadence agent.
Owned files: browser recording workers, delivery/moment modules and component,
page/CSS integration, dependency/build configuration, regression tests and docs.
Status: source ready and locally verified; publication blocked by Site editor/owner
access. No teammate delivery receipt or secret transfer is claimed.
Next action: owner/authorized editor publishes the existing Site from this source,
preserving ID, audience, server secrets and unpaid policy. Then perform explicitly
consented physical-device checks against that deployed version.
