# Cadence architecture

## Request and media flow

The browser handles the resume/prompt form, permission prompts, MediaRecorder,
editable transcripts, reports, and Blob URLs. The Worker intercepts `/api/*`
before the Vinext page handler and calls `lib/service.mjs`. Provider credentials
exist only in Worker environment bindings. Business logic is separately testable.

Sites provides private access control; preserve that boundary when configuring
paid API credentials. If deploying elsewhere or making the Site public, add
authentication, per-user quotas, and abuse controls before exposing paid endpoints.
The application is a single-session MVP; there is no durable session store.

| Endpoint | Input | Output |
| --- | --- | --- |
| `GET /api/health` | none | mode, cloudAvailable, provider, providerLabel, model, demoDataOnly, mediaCloudAvailable, pdfCloudAvailable |
| `POST /api/questions` | role, context, type, level, count, optional PDF data URL, cloudConsent, providerConsent, demoDataOnly | mode, provider when live, questions with id/prompt/category/focus/source |
| `POST /api/analyze` | question, answer, duration in seconds, recorded, mode, cloudConsent, providerConsent, demoDataOnly, optional JPEG frames | scores, metrics, summary, strengths, improvements, evidence, visual, limitation |
| `POST /api/transcribe` | multipart file + cloudConsent=true + providerConsent | text |

JSON requests are capped at 4 MB, PDF resumes at 2 MB, audio at 20 MB, and camera
analysis at four small JPEG frames per answer. Input lengths and types are checked
server-side. Mutations reject a foreign Origin. Provider calls time out after
60 seconds; user-safe errors do not expose keys, personal data, or upstream bodies.

## Modes and scoring

No key or no cloud opt-in uses curated retrieval and a labeled approximate rubric.
The browser extracts PDF text locally in a bundled PDF.js worker, with a 2 MB,
ten-page, 18,000-character, 30-second limit. Users can review/edit the extracted
text. Empty/scanned, encrypted, or invalid files get actionable errors. The
original PDF never leaves the browser through the current UI. Legacy direct
API PDF attachments still require a media-capable provider and cloud consent.
Provider errors remain errors and preserve the local answer for retry. Generated
questions and feedback use strict JSON schemas plus runtime checks. Resumes,
prompts, and transcripts are untrusted data within developer instructions.

Content measures relevant specifics, reasoning, and results; comprehension means
addressing the question. Recorded answers automatically provide a transcript
from their audio. Optional recognition corrections feed content/comprehension;
delivery retains the original recognition and measured recording cues. Personal
free/practice feedback still uses a labeled browser rubric; fictional consented
cloud feedback uses the same transcript with the configured provider.

Confidence is a labeled delivery heuristic. Base weights: speaking pace 20%,
fillers/possible repeated words 10%, interior low-volume gaps 15%, approximately
camera-facing head position 25%, upper-body framing 20%, shoulder-center movement
10%. At least five seconds, fifteen recognized words and two available components
are needed. Missing components are excluded and remaining weights renormalize;
weights and observations appear in the report. No universal delivery style is
established by these thresholds. Noise, ASR errors, camera setup and movement
affect measurements. This does not diagnose stuttering or infer emotional
confidence. Content/comprehension remain text dimensions. Overall averages the
three available dimensions and ignores nulls.

Cloud visual notes do not affect scores. Separate on-device landmarks contribute
observable head-position, framing and movement cues to delivery. They do not
measure eye contact, identify faces, infer emotion/traits, lip-read, or rate hiring fit.
This is voluntary self-practice, not employment screening.

## Media lifecycle

Camera and microphone require explicit checkbox consent followed by a button and
the native permission dialog. Each answer uses video+audio MediaRecorder and a
separate audio-only recorder. Video is kept locally as a real downloadable clip;
the audio is transcribed locally by `recording-coach.ts` and `speech.worker.ts`
using quantized English Whisper in a worker. An AudioWorklet captures mono 16 kHz
PCM; captions update in approximately twelve-second batches and finalize on stop.
Silence-only batches are rejected before ASR. Word timestamps are approximate.
Speech and vision models download on first use and may be cached; recordings
are not cached. Original audio/video never goes to a model download host.
The old cloud transcription endpoint remains for eligible API clients but the UI
uses local transcription, including retries. Sampled cloud frames still require
their additional opt-in and an eligible provider. Text answers need no device
access. Local microphones remain on during the visible camera preview.

On stop, both recorders finalize before feedback. The user reviews the transcript;
network errors preserve the clip for retry. Retake revokes its old Blob URL.
Finishing the session/unmount stops all tracks and closes the level meter. Reset
revokes all clips. A page-unload warning reminds users to download recordings.
Original videos are never uploaded or stored by Cadence. There is no browser
IndexedDB/localStorage history. Each provider has its own data policies.

Strong and improvement moments are distinct variable-length speech excerpts,
split on sentence/gap boundaries, with a clause/midpoint split for one long span.
Local delivery and transcript-specificity/keyword heuristics rank excerpts; this
does not establish semantic correctness. Up to three of each category can span
one or several answers. Too little evidence yields an explicit empty state;
the same excerpt is not duplicated into both categories. With missing timestamps,
two scored recordings can fall back to separate whole answers.
Playback seeks/pauses within the chosen range. Download re-encodes that range
locally with canvas, Web Audio and MediaRecorder; it takes approximately the
clip's duration. Audio and video are retained; exact frame/word cuts and a full
session editor remain outside scope. Reports export ranges and evidence without
Blob URLs or raw sampled audio/landmark arrays.

## Models and deployment

`AI_PROVIDER=gemini` selects server-only `GEMINI_API_KEY`. Gemini uses native HTTPS
Interactions with `store:false`, structured JSON schema, and runtime validation;
default model `gemini-3.5-flash-lite`. REST text is extracted only from model_output
steps, never thought steps. Keys travel in headers, never query strings.

Gemini defaults to `GEMINI_DATA_POLICY=unpaid` with two explicit session choices:

- Personal: PDF/TXT resumes, prompts, and answers remain in browser memory. With
  cloud consent, `/api/questions` accepts `privacyMode:personal` and a `profile`
  containing a broad `roleFamily` and fixed `skills` labels. The server rejects
  every other source field and validates both allowlists before constructing a
  generic prompt. This is topic selection, not anonymized resume transmission.
  Personal answer feedback uses the pure browser rubric; `/api/analyze` rejects
  personal mode under this provider policy. No answer API call is made by the UI.
- Fictional sample: the explicit choice supplies `demoDataOnly:true`. With
  provider-specific consent, extracted fictional resume text and typed fictional
  answers can be sent for full AI feedback. No original PDFs are uploaded.

Without cloud opt-in, question retrieval and all feedback run in the browser.
Raw PDFs, audio, and sampled frames remain rejected on unpaid cloud routes.
Free-tier cloud data may improve Google products and undergo human review.
Rate-limit failures remain visible errors. A source-reading worker is bundled
and served from the same origin, with no third-party PDF parsing service.

`GEMINI_DATA_POLICY=paid` permits media only after the owner arranges appropriate
Google billing/data handling. This is an operator declaration, not billing setup
or proof of entitlement. No billing is enabled by this project. Media adapters
use inline document/image/audio content. They require separate live verification.

`AI_PROVIDER=openai` selects server-only `OPENAI_API_KEY`. Default Responses model:
`gpt-4.1-mini`; default transcription:
`gpt-4o-mini-transcribe`. Both are configurable. Consult current provider
documentation before changing models or deploying after deprecation dates. As of
2026-10-24 the legacy transcription endpoint is scheduled to shut down in February
2027; migrate that adapter before then.

`web/.openai/hosting.json` owns the Site identity. Keep its current access private
when adding API secrets. Source is also published to the team's GitHub project.
No training pipeline or GPU is required. The current backend uses HTTPS provider
APIs and the browser's media APIs.

Both providers use the versioned `lib/interviewer-instructions.mjs` coaching
contract. Visitor requests never access this Codex chat, a developer's Codex
subscription, or a coding-agent session. Provider-specific consent must match
the active provider; stale consent fails rather than silently changing recipients.

Official integration references:
- [Gemini Interactions](https://ai.google.dev/gemini-api/docs/interactions)
- [Gemini REST schema](https://ai.google.dev/api/interactions-api)
- [Google data terms](https://ai.google.dev/gemini-api/terms)
- [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [File inputs](https://developers.openai.com/api/docs/guides/file-inputs)
- [File transcription](https://developers.openai.com/api/docs/guides/speech-to-text)

Reliability update: provider transport and HTTP 408/500/502/503/504 failures
receive at most one retry within 60 seconds. The first attempt has a 30-second
limit. Optional GEMINI_FALLBACK_MODEL changes only the second Gemini attempt.
Credentials, quota, and invalid-request failures are not retried. API errors
include a fixed safe code; raw upstream bodies are neither returned nor logged.
Selected resume source determines context and generic topics; switching sources
resets cloud consent. Explicit role/context target takes priority over background.
