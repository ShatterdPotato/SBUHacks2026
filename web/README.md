# Cadence web app

Current premium implementation (October 25): separate high-thinking planning, adaptive interviewer and background grader; selective verification, regrading/appeals, session synthesis, evidence-aligned clip coaching and on-demand drills. Four technical banks include original sourced questions with explicit AI-review provenance and independently executable exercises. Strict randomized coverage, retries, preserved answers and a session usage ledger are implemented. [Operation map](../docs/GEMINI_OPERATIONS.md) and [current QA](../docs/qa/PREMIUM_2026-10-25.md) supersede older configuration/route/count notes below. No human expert certification or hosted deployment is claimed.

October 25 feedback update: behavioral questions have separate scoring and never receive probes. Clip captions cite their own speech, and Gemini grades with high thinking plus evidence-based justifications. See [QA](../docs/qa/FEEDBACK_GROUNDING_2026-10-25.md).

React 19 / Vinext application with a Cloudflare Worker API. Read
[shared context](../TEAM_CONTEXT.md) and [handoff](../docs/HANDOFF.md) first.
The [repository audit](../docs/REPOSITORY_AUDIT.md) maps the source and open gaps.

## Commands

Requires Node.js 22.13+ and pnpm 11.25.0. Run from this directory:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:5173`. No API key is needed for curated questions,
text conversation, local question transitions, local English speech transcription,
recording, delivery estimates or excerpt exports. Model downloads need network
access on first use. Camera/microphone capture needs explicit device consent.

```powershell
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

`pnpm lint` is a separate script; its status is recorded in the audit when run.
`pnpm start` serves the built Worker locally with Wrangler; it requires `dist/`.
Complete installation before concurrent checks. Stop an active development server
before building on Windows if copied assets are locked. `pnpm db:generate` is
scaffolding; Cadence has no active database. Use the pnpm lockfile. Old npm
installer helpers reference a package lock and an `install:ci` script absent from
this project; they are not the local setup path.

## Source and build entry points

- `app/page.tsx`: setup, individual practice, report, transcript corrections and export.
- `components/conversation-studio.tsx`: default conversation, one continuous optional
  recording, turn detection, local questions spoken aloud and optional AI turns.
- `worker/index.ts` -> `lib/service.mjs`: twelve API endpoints, validation and consent; `lib/premium-service.mjs` contains the seven new routes.
- `lib/provider.mjs`: Gemini/OpenAI adapters, bounded retries and safe errors.
- `agents/GEMINI.md`, `agents/interview-grader.mjs`, `lib/content-rubric.mjs`:
  mandatory per-request rubric injection, version/evidence validation and server
  scoring. See [rubric](../docs/GRADING_RUBRIC.md). Conversation setup generates
  one opener; subsequent AI questions adapt to responses rather than a slate.
- `lib/recording-coach.ts`, `speech.worker.ts`, public audio/vision workers,
  `recorded-delivery.mjs`, `components/moment-clip.tsx`, `lib/export-clip.ts`: local media.
- `scripts/run-cadence.mjs`: copies PDF.js/MediaPipe assets, separately bundles the
  speech worker, then invokes the framework. Use package scripts for these steps.

Generated `public/vendor/{pdfjs,mediapipe,speech}/` assets are ignored. Restart
`pnpm dev` after editing speech-worker source to regenerate the standalone bundle.
Portable checkouts use the Vinext CLI. A checkout-local managed Linux execution
profile changes dev/build wrappers; `vite.config.ts` retains Sites integration.

## Configuration and privacy

Use ignored `.dev.vars` based on `.dev.vars.example` for authorized local provider
setup. That file was absent during the repository audit and was subsequently
configured locally on user authorization. Live opener/fictional grading smoke
checks passed. Never read, print or commit credentials. Practice mode needs none.

Unpaid Gemini personal questions send reviewed generic role/skill labels only.
Conversational AI requires a separate studio opt-in; unpaid Gemini accepts only
fictional, non-sensitive question/answer text, approved profile/settings and up to
four prior turns to the interviewer, bounded prior feedback to the grader, and
completed consented answers to report/clip/coach operations. Recordings
stay local. Eligible individual-answer cloud notes may send separately consented
JPEG frames. The UI uses local transcription; `/api/transcribe` is a retained
cloud adapter. See [architecture](../docs/ARCHITECTURE.md) for exact contracts.

`.openai/hosting.json` preserves the existing Site ID with D1/R2 disabled.
Latest source features have no recorded successful Site deployment. Deployment
identity, access blocker and credential provenance are in
[handoff](../docs/HANDOFF.md) and [credentials](../docs/CREDENTIALS.md).
Do not create a replacement Site.
