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
| `GET /api/health` | none | `mode`, `cloudAvailable` |
| `POST /api/questions` | role, context, type, level, count, optional PDF data URL, cloudConsent | mode, questions with id/prompt/category/focus/source |
| `POST /api/analyze` | question, answer, duration in seconds, recorded, mode, cloudConsent, optional JPEG frames | scores, metrics, summary, strengths, improvements, evidence, visual, limitation |
| `POST /api/transcribe` | multipart file + cloudConsent=true | text |

JSON requests are capped at 4 MB, PDF resumes at 2 MB, audio at 20 MB, and camera
analysis at four small JPEG frames per answer. Input lengths and types are checked
server-side. Mutations reject a foreign Origin. Provider calls time out after
60 seconds; user-safe errors do not expose keys, personal data, or upstream bodies.

## Modes and scoring

No key or no cloud opt-in uses curated retrieval and a labeled approximate rubric.
PDF input cannot silently fall back: the user must paste text or enable live AI.
Provider errors remain errors and preserve the local answer for retry. Generated
questions and feedback use strict JSON schemas plus runtime checks. Resumes,
prompts, and transcripts are untrusted data within developer instructions.

Content measures relevant specifics, reasoning, and results; comprehension means
addressing the question. Live AI estimates these from the reviewed transcript.
The demo instead uses text length, structural words, actions/numbers, and focus
keyword overlap; it cannot verify correctness. Confidence is a transparent
pace/filler proxy, only available for a recording of at least five seconds with
at least fifteen transcript words. WPM includes pauses and depends on transcript
accuracy. Edited or mismatched transcripts can therefore invalidate the estimate.
The overall score averages available dimensions and ignores nulls.

Visual notes do not affect scores. They describe visible framing, posture,
gestures, head orientation, face/mouth visibility, and uncertainty; they do not
measure gaze, identify faces, infer emotion/traits, lip-read, or rate hiring fit.
This is voluntary self-practice, not employment screening.

## Media lifecycle

Camera and microphone require explicit checkbox consent followed by a button and
the native permission dialog. Each answer uses video+audio MediaRecorder and a
separate audio-only recorder. Video is kept locally as a real downloadable clip;
the audio is sent for transcription only with cloud consent. Sampled frames are
sent only with an additional camera-observation opt-in. Text answers require no
device access. Local microphones remain on during the visible camera preview.

On stop, both recorders finalize before feedback. The user reviews the transcript;
network errors preserve the clip for retry. Retake revokes its old Blob URL.
Finishing the session/unmount stops all tracks and closes the level meter. Reset
revokes all clips. A page-unload warning reminds users to download recordings.
Original videos are never uploaded or stored by Cadence. There is no browser
IndexedDB/localStorage history. OpenAI processing has its own retention policy.

Best and worst clips are whole recorded answers ranked by their mean available
scores. One recording yields only a best clip; no scored recording yields none.
Word-aligned subclips, full-session editing, and emotion detection are outside MVP.

## Models and deployment

Default Responses model: `gpt-4.1-mini`; default transcription:
`gpt-4o-mini-transcribe`. Both are configurable. Consult current provider
documentation before changing models or deploying after deprecation dates. As of
2026-10-24 the legacy transcription endpoint is scheduled to shut down in February
2027; migrate that adapter before then.

`web/.openai/hosting.json` owns the Site identity. Keep its current access private
when adding API secrets. Source is also published to the team's GitHub project.
No training pipeline or GPU is required. The current backend uses HTTPS provider
APIs and the browser's media APIs.

Official integration references:
- [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [File inputs](https://developers.openai.com/api/docs/guides/file-inputs)
- [File transcription](https://developers.openai.com/api/docs/guides/speech-to-text)
