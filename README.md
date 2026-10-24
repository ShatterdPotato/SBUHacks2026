# Cadence

**Your interview, rehearsed.** An AI interview practice service for SBUHacks 2026,
built by Aiden Li Productions. Upload a resume or describe a role, practice an
interview, and leave with useful feedback and recordings worth revisiting.

The team pivoted from XTrain due to hardware limitations. Rover and old mailbox
files have been removed; earlier versions remain in Git history.

## Run locally

Requires Node.js 22.13+ and pnpm 11.25.0. From PowerShell:

```powershell
cd web
pnpm install
pnpm dev
```

Open `http://localhost:5173`. The default practice mode needs no API key:
curated questions, optional webcam/microphone recording, manually entered
transcripts, clearly labeled heuristic feedback, and actual answer clips.

For live AI, copy `web/.dev.vars.example` to `web/.dev.vars` and set a server-side
`GEMINI_API_KEY` and `AI_PROVIDER=gemini`, then restart the server. Never put keys
in browser code or Git. For Sites production, configure the same secret in the
Site runtime and deploy. API usage is independent of Codex or ChatGPT usage.
OpenAI remains an optional adapter using `AI_PROVIDER=openai` and `OPENAI_API_KEY`.

Gemini defaults to `gemini-3.1-flash-lite` and `GEMINI_DATA_POLICY=unpaid`. Free Gemini
practice accepts **fictional text only**, with consent and a made-up-data checkbox.
No real resumes, personal details, sensitive data, or confidential work. Google may
use free-tier inputs/outputs to improve products and for human review. PDF/audio/
camera uploads are blocked server-side; recordings stay local. Free quotas may
limit availability. See [Google's API terms](https://ai.google.dev/gemini-api/terms).
Only configure `GEMINI_DATA_POLICY=paid` after arranging appropriate Google billing
and data handling; the flag does not activate billing. No billing is enabled here.

## Interview flow

1. Add the role, experience, resume (TXT/PDF), or a custom prompt. Choose focus
   and 3–6 questions. PDF processing requires live AI and cloud consent.
2. Choose text practice or consent to camera/microphone recording. Each answer
   is recorded separately; a three-minute limit keeps clips manageable.
3. When cloud media is available, recorded audio is transcribed. Review/edit the
   transcript before submitting. Free Gemini and practice mode use typed text.
4. Receive content and comprehension feedback plus a pace/filler-based delivery
   proxy labeled confidence. Replay/download the strongest and weakest answers,
   inspect individual feedback, and export the JSON report.

Camera observations are optional in AI mode: framing, visible posture/gestures,
head orientation, and face/mouth visibility. They do not affect scores. This
service does not identify faces, read emotions, or make hiring decisions.

## Data and limitations

Recordings remain in browser memory and disappear on page close unless downloaded.
No server recording storage or account history is implemented. A separate cloud
opt-in sends context/resume, transcripts, audio, and optionally up to four camera
frames per answer to the selected provider when its configured data policy permits.
Provider data policies apply; `store:false` is used for Responses and Interactions
calls. Free Gemini sends fictional text only. Do not upload information you do not
want processed. Both providers share `web/lib/interviewer-instructions.mjs`; this
is a versioned coaching prompt, not access to a live Codex conversation or account.

Practice scores use approximate lexical heuristics and do not establish technical
correctness or actual comprehension. Live AI feedback is also fallible. Missing
evidence is unavailable. Best/worst moments are whole answer clips; word-aligned
subclips, adaptive follow-ups, lip tracking, and detailed pose tracking are not
implemented. Live API and physical media checks require separate verification.

## Verify

```powershell
cd web
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

Start every AI session with [TEAM_CONTEXT.md](TEAM_CONTEXT.md). See
[architecture](docs/ARCHITECTURE.md) and the [demo checklist](docs/DEMO.md).
