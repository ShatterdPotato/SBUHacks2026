# Feature inventory

Status as of October 24, 2026. Read HANDOFF.md before continuing.

| Requested capability | Included implementation / boundary |
| --- | --- |
| Resume or custom prompt | PDF/TXT browser reading, editable text preview, role/context input, 3-6 questions and focus/level settings. PDF limits/errors in HANDOFF.md. |
| Personal resumes | Accepted locally. Free personal mode shares only approved generic role/skill labels for AI questions; personal answers use browser rubric. Full personal-text AI analysis is not enabled. |
| AI-generated questions | Gemini 3.1 Flash-Lite, verified live. Optional OpenAI adapter retained. Strict JSON plus runtime checks. |
| Retrieved questions | Local curated bank with keyword relevance. No external interview-question search/index implemented. |
| Audio/video practice | Explicit consent, camera/mic preview, mic meter, per-answer MediaRecorder, three-minute cap, stop, retake, device-off, text-only option. Physical-device verification remains. |
| Speech transcription | Configurable server adapters exist; paid/media-eligible policy and consent required. Disabled on current unpaid Gemini setup; type transcripts. Live media verification remains. |
| Content/comprehension | AI estimates for fictional cloud practice; browser heuristic estimates for personal/free or AI-off practice. Missing answers unscored. Not hiring decisions. |
| Confidence | Labeled pace/filler proxy from transcript and measured recording duration; unavailable without enough recording/transcript evidence. No emotional-confidence inference. |
| Body/facial/mouth observations | Opt-in sampled-frame adapter for eligible providers; observable framing/posture/gestures/head direction/visibility only. Disabled on current unpaid setup. No face recognition, emotion reading, lip-reading, gaze certainty, or hiring fitness. |
| Best/worst moments | Replay/download whole recorded answers ranked by available scores. Precise word-aligned subclips are not implemented. |
| Reports | Session scores, per-answer strengths/improvements/evidence, metrics, clips, JSON export; heuristic/AI limitations labeled. |
| Privacy | Browser memory, no durable recording database; consent/provider checks; server-only keys; personal profile allowlists; raw personal/cloud input separation. |
| Hosting | Existing private Sites deployment, preserved manifest/worker integration, source in Sameer's GitHub. Public/anonymous access, GoDaddy domain, SEO/indexing not completed. |
| Team continuation | AGENTS.md, TEAM_CONTEXT.md, architecture, demo checklist, HANDOFF.md, this inventory, fictional PDF/TXT samples. No active mailbox. |
| Adaptive interview conversation | Not implemented; questions are generated as a set. No synchronized realtime avatar/voice interviewer. |
| Advanced analysis | Acoustic pitch/prosody scoring, pose tracking, continuous lip/body tracking, exact clip alignment, custom model training not implemented. |
| Accounts/history/production controls | No durable user/session history, custom auth, per-user quota system, billing, or public abuse-control rollout. Sites private access is the current boundary. |

Do not remove working features or present unverified/deferred features as complete.
