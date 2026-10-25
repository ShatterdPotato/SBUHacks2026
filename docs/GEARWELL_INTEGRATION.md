# Gearwell frontend and interviewer voice

October 25 latency update supersedes the earlier model note: speech defaults to eleven_flash_v2_5 with the same voice ID and 1.25x pitch-preserving playback. Server ELEVENLABS_MODEL=eleven_multilingual_v2 restores the former model when desired. See qa/TURN_LATENCY_2026-10-25.md.

Current October 25 review refresh supersedes earlier scoring/export/timing notes: **Cadence** is the website; **Gearwell** is the interviewer. AI grading begins only after media finalization, with two concurrent high-thinking content-rubric calls and a cancellable grading chamber. Current grades/regrades use `assessmentMode: content`: no separate factual score, focused accuracy pass or verification pass. Reference answers still ground technical feedback. Results use Clarity, Confidence (observed delivery only) and Knowledgeability (technical content only) gauges. Downloads are local paginated PDFs. Relax is locked during interviews; gears/coil accents respect reduced motion. Responsive fields are bounded from 320 px upward. See [current behavior and verification](qa/REVIEW_REFRESH_2026-10-25.md). Historical implementation notes below retain their original dates.

Updated October 25, 2026. Gearwell is the public interface; the existing Cadence
interview and assessment engine remains underneath. The frontend came from the
user-supplied Gearwell handoff, source revision
`c8a4411dd3ec403ff429131d812a0fd6d7221371`.

The imported brass palette, serif typography, mechanical gate, VRM examiner,
animations and picture-in-picture camera are used throughout setup and the room.
Reports and existing controls now use the same palette. The model retains its
pixiv VRoid Project credit; supplied VRMA notices remain under
`web/public/assets/vrma/LICENSE.txt`.

## Ownership and lifecycle

- `web/gearwell/shell.ts`: imported shell markup and stable portal mounts.
- `web/components/gearwell-shell.tsx`: loads the room controllers once, mounts
  React controls, and coordinates setup, gate, session, cancellation and report.
  Memoized shell DOM must not be reconciled while the avatar controller moves
  its canvas between landing and room mounts.
- `web/gearwell/avatar.js`, `voice-check.js`, `emotions.js` and
  `animation-controls.js`: editable avatar, playback and animation source.
- `web/scripts/build-gearwell.mjs`: bundles avatar source with Three.js/VRM on
  both `pnpm dev` and `pnpm build`. Do not hand-edit the generated avatar bundle.
- `web/public/assets/interview.js`: receives the engine's already-authorized
  MediaStream, reuses it for the corner camera, and stops it on cancellation.
  It never requests a second camera/microphone stream.
- `web/app/globals.css` and `web/public/assets/*.css`: Gearwell visual system;
  `session.css` extends it for grading, replay and application controls.
- `web/components/conversation-studio.tsx`: existing recording, turn-taking,
  background grading and adaptive-question engine, now using Gearwell speech.
- `web/components/individual-question-voice.tsx`: automatic individual-question
  speech. The page's Read question button uses the same transport.

## Every ElevenLabs call

| Trigger | Client path |
| --- | --- |
| Explicit Preview voice click on the landing page | `gearwell/voice-check.js`: fixed Gearwell greeting |
| Initial conversational question | `ConversationStudio.ask` → `speakInterviewLine` |
| Each adaptive technical probe or next main question | same `ask` path after the interviewer chooses the question |
| Retry question voice | same current question; new generation after a failed request |
| Each individual question, including advancement | `IndividualQuestionVoice` → `speakInterviewLine` |
| Read question in individual practice | page `readQuestion` → `speakInterviewLine` |

All paths converge on `GearwellInterview.speak` / `GearwellSpeech.speak`, then
`POST /api/speech`. `web/worker/index.ts` dispatches to
`web/lib/service.mjs` and `web/lib/elevenlabs-speech.mjs`. The server calls
`https://api.elevenlabs.io/v1/text-to-speech/Veg2qijYoJAS8VPKOOmi?output_format=mp3_44100_128`
with model `eleven_multilingual_v2`. The fixed voice is the supplied frontend's
voice ID. Keys exist only in `ELEVENLABS_API_KEY` on the server.

Blocked autoplay and paused audio reuse the existing MP3 when Play voice is
clicked. They do not make another API call. Gate sound and animation selection
are local assets. Neither recording nor transcription calls ElevenLabs. Speech
does not use Gemini; all existing Gemini operations retain high thinking and
mandatory grading-rubric behavior described in [the operation map](GEMINI_OPERATIONS.md).

The speech endpoint validates origin, JSON, explicit speech consent, streamed
body size (20 KB), line length (3,000 characters), provider content type and
nonempty audio. It has a 45-second provider deadline, propagates cancellation,
sanitizes provider errors and returns private/no-store audio. The existing
private hosting boundary is unchanged; Origin checks are not authentication.

## Consent and playback behavior

Voice is optional. Setup consent explains that interviewer question text,
including quoted response excerpts, goes to ElevenLabs. Without that consent,
questions stay readable and no question-speech request is made. The preview
button explicitly names ElevenLabs and sends only the fixed greeting.
Camera/microphone and Gemini feedback retain their separate opt-ins. Personal
resume processing and unpaid Gemini restrictions are unchanged.

The conversation excludes interviewer playback from speech recognition. It
begins listening only after the MP3 ends, or after an explicit interruption.
Failure provides a retry and an explicit read-and-answer continuation. Ending,
cancelling, switching questions or starting an individual recording stops speech.
Avatar mouth motion follows actual playing/waiting/pause/ended events; it is a
playback-driven animation, not phoneme-level lip synchronization. Original
recordings, transcripts, grading, corrections, factual checks, clip replay and
exports remain in the existing engine.

The user-authorized local handoff key was merged into ignored `.dev.vars`
without copying the handoff's private file, hosting identity, or build output.
GitHub publication does not deploy or configure the original hosted Site.

See [dated verification](qa/GEARWELL_2026-10-25.md).
