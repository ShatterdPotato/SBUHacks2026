# Gearwell

The supplied Gearwell frontend now wraps the Cadence interview engine: brass styling, animated VRM examiner, mechanical room transition and consented ElevenLabs interviewer speech. See [integration and every speech call](docs/GEARWELL_INTEGRATION.md).

October 25 feedback update: behavioral questions have separate scoring and never receive probes. Clip captions cite their own speech, and Gemini grades with high thinking plus evidence-based justifications. See [QA](docs/qa/FEEDBACK_GROUNDING_2026-10-25.md).

**Interviews that run like clockwork.** A voluntary AI interview practice service for
SBUHacks 2026, built by Aiden Li Productions. Upload a resume or describe a role,
practice a conversation, then review your words, feedback and recorded moments.

Continuing development? Read [TEAM_CONTEXT.md](TEAM_CONTEXT.md), the
[handoff](docs/HANDOFF.md), [feature inventory](docs/FEATURE_STATUS.md) and
[repository audit](docs/REPOSITORY_AUDIT.md). XTrain and the rover mailbox are
retired; their earlier code remains in Git history.

## Run locally

Requires Node.js 22.13+ and pnpm 11.25.0. From PowerShell:

```powershell
cd web
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:5173`. Text practice needs no API key. Spoken Gearwell questions require a server-side `ELEVENLABS_API_KEY` and separate voice consent. It includes curated
questions, text conversation, local follow-ups, optional recording, on-device
English transcription, labeled delivery estimates and excerpt downloads.
First-use speech/landmark model downloads require network access.

For authorized live AI setup, copy `web/.dev.vars.example` to ignored
`web/.dev.vars` and configure a server-side key. The user subsequently authorized
local Gemini setup, and live opener/rubric smoke checks passed. The key stays in
ignored server configuration. Never put keys in browser code, Git or chat.
The optional providers are Gemini Interactions and OpenAI Responses; configuration
defaults and consent boundaries are in [architecture](docs/ARCHITECTURE.md).
API use is separate from Codex/ChatGPT subscriptions.

## Practice flow

1. Enter a target role and optional background, or upload PDF/TXT. Review the
   browser-extracted text. Choose 3–6 main topics, focus and experience level. Conversation setup writes
   one opener; later AI questions are generated after each response.
   The target role takes priority over unrelated resume skills.
2. The default conversation asks questions aloud using an available local English
   system voice, then listens or accepts typed answers. Optional camera/microphone
   recording requires explicit consent and a start click.
3. With recording, Whisper Base English generates local captions in roughly
   twelve-second batches. Turns advance after a configurable 5/7/10-second pause
   or manual completion. Pause listening, interrupt, skip or finish early.
   Listening pauses keep the continuous recording running.
4. Local follow-ups can ask one extra question after each substantive main answer.
   A separate studio opt-in enables adaptive provider questions for both probes
   and new topics, with occasional exact response quotations, plus rubric-based
   feedback. Unpaid Gemini accepts fictional, non-sensitive transcripts only.
5. Review Content quality, Factual accuracy and Confidence / delivery. AI grading
   shows weighted criteria, specific criticism and **bold** key corrections. Correct
   recognition errors locally, replay strong/improvement excerpts, download their
   video/audio ranges, the full recording and the JSON report.

Individual answer practice remains available, with separate recordings,
stop/retake and local transcription retry. Recorded answers/turns cap at three
minutes; the conversation has a twenty-minute session limit. Text turns are
submitted manually.

## Privacy and evidence

Unpaid Gemini personal mode reads resumes locally. Optional AI questions receive
only reviewed, fixed generic skill labels and a broad role. Personal answer
feedback stays local unless the user separately opts into conversational AI and
uses fictional, non-sensitive answers. Fictional setup mode can send invented
resume/context text and answer transcripts with provider consent. Raw PDFs,
audio and frames are blocked on unpaid cloud routes. No billing is enabled.

The current UI transcribes audio locally. Conversation AI sends only question/
answer text, a broad role, approved skill topics, focus/level and up to four prior
turns with bounded feedback. Eligible individual-answer
cloud observations can send up to four separately consented JPEG frames.
Provider policies apply; structured Responses/Interactions calls use `store:false`.
See [credential handling](docs/CREDENTIALS.md) before configuring a provider.

Recordings and interview state remain in browser memory and are lost on reload,
reset or page close unless downloaded. There is no durable account/session store.
PDFs are limited to 2 MiB, ten pages, 18,000 extracted characters and thirty
seconds of parsing; scans need OCR and encrypted files need an unlocked copy.
[Fictional PDF/TXT fixtures](examples/README.md) are included.

The [Gemini grading agent](web/agents/GEMINI.md) injects the complete
[versioned rubric](docs/GRADING_RUBRIC.md) into every grading request; the server
validates its version/evidence and computes weighted content scores.
Content and delivery scores are provisional coaching estimates. Accuracy scores
cover claims checked against supplied answer keys and reference results; personal stories
and other unsupported claims stay unverified. There is no live fact search.
Delivery uses measured pace, pauses, possible repetitions and sufficiently covered
head-position/framing samples. Ordinary movement has no penalty. No face identity,
feelings, personality, eye-contact certainty or hiring fitness is inferred.
Word timestamps and clip boundaries are approximate.

## Verification and hosting

```powershell
cd web
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

See [the demo checklist](docs/DEMO.md) for both practice formats and consent paths,
and [the audit](docs/REPOSITORY_AUDIT.md) for the earlier repository inventory.

Current local source adds high-reasoning planning, separate interviewer/grader,
independent verification, clip coaching, reports and targeted drills. The bank
has **448 questions, 112 per track**, with explicit AI-reviewed versus executable
provenance. **137 tests, TypeScript and production build pass**; live synthetic
Gemini checks passed. See [current QA](docs/qa/FACTUAL_REPLAY_2026-10-25.md),
[all API call sites](docs/GEMINI_OPERATIONS.md) and [the bank](web/data/question-bank/README.md).
The last recorded private Site uses older source; current deployment remains
blocked by original Site access. Physical-device and expert-review checks remain separate.
