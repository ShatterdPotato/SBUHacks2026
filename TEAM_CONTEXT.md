# Cadence: shared team context

## Conversational interview update (2026-10-24)

The default studio is now a back-and-forth conversation with spoken local English questions, automatic end-of-turn detection (5/7/10-second wait), optional adaptive follow-ups, and one continuous local video. Individual answer practice remains available. Whisper Base English replaces Tiny; multi-batch answers receive a guarded whole-answer refinement. Recent questions are suppressed in session memory and target-role practical questions take priority over unrelated resume skills.

Free Gemini remains unpaid. A separate explicit fictional/non-sensitive answer opt-in enables /api/interview-turn; this sends question/transcript history (maximum four previous turns) and a broad role, never the actual resume, audio or frames. Personal answers remain local without this opt-in. No billing was enabled.

The third displayed dimension is Knowledge / accuracy (the existing comprehension field in JSON). It scores only claims checked against a small supplied reference pack; unknown claims and personal stories remain unverified. No live web search is implemented. Cash-change arithmetic is deterministic and overrides contradictory AI prose. Video scores require eight usable samples and 70% coverage; movement is described without a penalty, and visual weights are reduced. Session clip ranges include each answer's global recording offset.


**Read this first every session. Orchestrator: `aiden.sol`.**

Continuation snapshot: [docs/HANDOFF.md](docs/HANDOFF.md). Read it for the exact
latest deployment, verified flows, user decisions, missing features, and next steps.
See [docs/FEATURE_STATUS.md](docs/FEATURE_STATUS.md) for the full capability inventory.

- Repository: https://github.com/ShatterdPotato/SBUHacks2026; canonical branch `main`.
- Updated: 2026-10-24, America/New_York. Team: Aiden Li Productions.
- Cadence is a working name. The human discontinued XTrain for hardware limitations
  and authorized replacing this project's files. Rover code remains in Git history.
  Do not change unrelated repositories.

## Product and architecture

Upload a resume or describe a target interview; retrieve curated questions or
generate tailored questions. Practice with optional webcam/microphone, review
transcripts, receive content/comprehension/delivery feedback, and replay/download
the strongest and weakest recorded answers. This is voluntary personal coaching.

- `web/`: React/Vinext, Sites integration, Cloudflare Worker.
- `web/lib/service.mjs`: business API, consent, validation.
- `web/lib/provider.mjs`: Gemini Interactions and OpenAI Responses adapters.
- `web/lib/interviewer-instructions.mjs`: shared coaching contract for both providers.
- `web/lib/interview.mjs`: curated retrieval, practice rubric, delivery metrics.
- `web/app/page.tsx`: setup, studio, report; actual per-answer MediaRecorder clips.
- `docs/ARCHITECTURE.md`: API/media contracts. `docs/DEMO.md`: verification.
- `GET /api/health`; `POST /api/questions`, `/api/analyze`, `/api/transcribe`.
- `AI_PROVIDER=gemini` uses server-only `GEMINI_API_KEY`; model defaults to
  `gemini-3.5-flash-lite`. `AI_PROVIDER=openai` uses `OPENAI_API_KEY`. Missing keys mean
  labeled practice rubric mode. Chat subscriptions do not supply API credentials.
- `web/lib/pdf-resume.ts`: PDF.js text extraction in a bundled browser worker.
- Recording-first update: `recording-coach.ts`, `speech.worker.ts`, and the audio
  worklet run English Whisper transcription locally in ~12-second batches.
  `scripts/build-speech-worker.mjs` isolates the speech worker from Vinext's page
  transforms at dev/build startup; the browser loads `/vendor/speech/speech.worker.js`.
  `public/vision-capture.worker.js` runs local landmark measurements. Model files
  download from Hugging Face/Google; media is not sent to those download hosts.
- `recorded-delivery.mjs` calculates labeled delivery components and selects
  variable-duration speech excerpts; `components/moment-clip.tsx` and
  `lib/export-clip.ts` replay/export separate strong and improvement clips.
- `web/lib/resume-profile.mjs`: fixed skill labels, broad roles, generic request validation.
- Gemini defaults to `GEMINI_DATA_POLICY=unpaid`: personal PDF/TXT resumes are read
  in the browser. Optional AI questions use only reviewed generic skill labels and
  a broad role; personal answers use the browser rubric. No raw personal resume,
  answer, contact, employer, or project data goes to the free API. Fictional sample
  mode can send made-up text for AI feedback. Raw PDFs/audio/frames remain blocked.

## Privacy and evidence

Media requires consent and a click; text-only practice is available. Videos remain
in browser memory and disappear on page close unless downloaded. Cloud processing
has a separate opt-in for resume/context, transcript, audio, and sampled frames.
The selected provider's data policies apply; both structured adapters use
`store:false`. Free Gemini inputs/outputs may improve Google products and be
reviewed by people. Do not send personal, sensitive, or confidential information.
Only use a paid data policy after the owner arranges appropriate Google billing
and data handling; an environment flag cannot enable billing. No server recording
database is implemented. The API is independent of Codex chat/subscription usage.

Confidence is a labeled local delivery estimate using pace, pauses, possible
word repetitions/fillers, camera-facing head position, upper-body framing and
movement when measurable. Missing channels are excluded and weights renormalize.
These are coaching heuristics, not feelings or personality. Content/comprehension
use the recognized transcript (with optional corrections); demo keyword
heuristics cannot establish correctness. Visual feedback describes framing,
posture/gestures, head orientation, and face/mouth visibility. Head direction
does not establish eye contact. No face recognition, lip-reading, emotion/trait
inference, voice identification, or hiring decisions. Missing evidence is
unavailable, never fabricated. Multiple strong/improvement excerpts can come
from one recording or several. Speech alignment and export boundaries remain
approximate; whole-answer fallback remains when timestamps are unavailable.

## Team workflow

Hardware roles and the rover mailbox are retired. `aiden.sol` owns integration
until humans reassign frontend, AI/backend, and recording/QA roles. Do not invent
assignments or message delivery. Use branch -> commit -> push -> PR -> review ->
merge -> pull. Preserve teammate work and update contracts here. Keep personal
interview data, keys, and ignored private `.coordination/` state out of Git.

Without a connected mailbox, give a manual handoff:

```text
From / To:
Context revision and Git commit:
Task and owned files:
What changed and what was verified:
Question or blocker:
Proposed interface or next action:
```

Paid provider calls and physical recording hardware require separate end-to-end
checks. Mocked tests do not establish live AI or real camera/microphone behavior.
Report actual verification results and remaining setup in the handoff.

2026-10-24: 31 tests, type check, and production build passed. Exact supplied PDF
accepted (4,198 characters); hosted personal generic-AI questions and browser-rubric
report verified. Fictional PDF generated AI questions; final fictional answer check
was interrupted. Physical media and paid media adapters remain separately unverified.

Latest browser-audit checkpoint: 44 tests, type check, and production build PASS.
Primary Gemini 3.5 Flash-Lite, configured retry fallback 3.1 Flash-Lite, unpaid
policy preserved. Latest deployed source add43d0445ad419509d717ca4316eac4b32f0741.
Personal and fictional PDF live question generation passed. The continuation
completed fictional answer feedback, report, and JSON export, and reran all 44
tests, type check, and build successfully. See docs/HANDOFF.md and
docs/qa/RESUME_BROWSER_AUDIT_2026-10-24.md for 125 manual scenarios, fixes, and limits.
Current continuation evidence: docs/qa/CONTINUATION_VERIFICATION_2026-10-24.md.
No application redeployment was required. Physical media and full Firefox /
screen-reader checks remain unverified; focused responsive/help checks passed.
