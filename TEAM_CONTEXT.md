# Cadence: shared team context

**Read this first every session. Orchestrator: `aiden.sol`.**

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
- `web/lib/service.mjs`: business API, consent, validation, OpenAI integration.
- `web/lib/interview.mjs`: curated retrieval, practice rubric, delivery metrics.
- `web/app/page.tsx`: setup, studio, report; actual per-answer MediaRecorder clips.
- `docs/ARCHITECTURE.md`: API/media contracts. `docs/DEMO.md`: verification.
- `GET /api/health`; `POST /api/questions`, `/api/analyze`, `/api/transcribe`.
- `OPENAI_API_KEY` is server-only; models configurable. Missing key means labeled
  practice rubric mode. Chat subscriptions do not supply API credentials.

## Privacy and evidence

Media requires consent and a click; text-only practice is available. Videos remain
in browser memory and disappear on page close unless downloaded. Cloud processing
has a separate opt-in for resume/context, transcript, audio, and sampled frames.
OpenAI retention policies apply. No server recording database is implemented.

Confidence is a delivery proxy using speaking pace and transcript filler words,
not feelings or personality. Content/comprehension use text; demo keyword
heuristics cannot establish correctness. Visual feedback describes framing,
posture/gestures, head orientation, and face/mouth visibility. Head direction
does not establish eye contact. No face recognition, lip-reading, emotion/trait
inference, voice identification, or hiring decisions. Missing evidence is
unavailable, never fabricated. Clips rank whole recorded answers; precise
word-aligned editing is not implemented.

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
