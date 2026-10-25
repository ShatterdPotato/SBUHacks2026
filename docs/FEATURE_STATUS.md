# Feature inventory

## Conversational continuation (2026-10-24)

Implemented: default spoken back-and-forth studio with continuous optional recording; energy-based turn detection, manual completion, pause/resume, interruption, skips and early finish; one optional follow-up per topic; Gemini adaptive follow-ups for consented fictional/non-sensitive transcripts; larger local English ASR with guarded refinement; role-first practical question bank and in-session repeat suppression; reference-limited knowledge checks with explicit unverified claims; stricter visual evidence coverage and no gesture penalty; global clip ranges and local transcript corrections.

Limits: turn-based latency rather than a duplex streaming voice API; English only; physical device/real-person accuracy still unverified; finite banks can repeat after alternatives are exhausted; recent-question memory resets on page reload; reference coverage is deliberately small, no live web search; real personal answers cannot use unpaid Gemini. Sites publication still requires access to the original project.


Status as of October 24, 2026. Read HANDOFF.md before continuing.
The recording-first rows describe current source; publication is pending access
to the existing Site's owner/editor account. The old hosted build is unchanged.

| Requested capability | Included implementation / boundary |
| --- | --- |
| Resume or custom prompt | PDF/TXT browser reading, editable text preview, role/context input, 3-6 questions and focus/level settings. PDF limits/errors in HANDOFF.md. |
| Personal resumes | Accepted locally. Free personal mode shares only approved generic role/skill labels for AI questions; personal answers use browser rubric. Full personal-text AI analysis is not enabled. |
| AI-generated questions | Gemini 3.5 Flash-Lite with configured 3.1 fallback; latest live question generation verified. Optional OpenAI adapter retained. Strict JSON plus runtime checks. |
| Retrieved questions | Local curated bank with keyword relevance. No external interview-question search/index implemented. |
| Audio/video practice | Explicit consent, camera/mic preview, mic meter, per-answer MediaRecorder, three-minute cap, stop, retake, device-off, text-only option. Physical-device verification remains. |
| Speech transcription | On-device English Whisper; live captions in ~12-second batches, automatic finalization on stop, optional corrections/retry. First-use model download required. Legacy eligible cloud API adapters retained. |
| Content/comprehension | AI estimates for fictional cloud practice; browser heuristic estimates for personal/free or AI-off practice. Missing answers unscored. Not hiring decisions. |
| Confidence | Labeled weighted delivery heuristic: pace, pauses, fillers/possible word repetitions, camera-facing head position, upper-body framing/movement when available. Missing cues excluded; breakdown shown. No feelings or stuttering diagnosis. |
| Body/facial/mouth observations | Local face/pose landmarks measure observable head position and upper-body framing/movement, including under unpaid policy. No identity, expressions, lip-reading, eye-contact certainty, or hiring fitness. Separate eligible opt-in cloud notes retained. |
| Best/worst moments | Multiple strong/improvement excerpts with approximate speech timestamps, variable durations, bounded replay and separate local video/audio exports. One sufficiently long answer can supply both. Whole-answer fallback retained. |
| Reports | Session scores, per-answer strengths/improvements/evidence, metrics, clips, JSON export; heuristic/AI limitations labeled. |
| Privacy | Browser memory, no durable recording database; consent/provider checks; server-only keys; personal profile allowlists; raw personal/cloud input separation. |
| Hosting | Existing private Sites deployment, preserved manifest/worker integration, source in Sameer's GitHub. Public/anonymous access, GoDaddy domain, SEO/indexing not completed. |
| Team continuation | AGENTS.md, TEAM_CONTEXT.md, architecture, demo checklist, HANDOFF.md, this inventory, fictional PDF/TXT samples. No active mailbox. |
| Adaptive interview conversation | Not implemented; questions are generated as a set. No synchronized realtime avatar/voice interviewer. |
| Advanced analysis | Acoustic pitch/prosody scoring, continuous lip tracking, exact clip alignment, custom training, and validated gesture/gaze assessment remain unimplemented. Local sampled pose landmarks and amplitude-based pauses are included. |
| Accounts/history/production controls | No durable user/session history, custom auth, per-user quota system, billing, or public abuse-control rollout. Sites private access is the current boundary. |

Do not remove working features or present unverified/deferred features as complete.
