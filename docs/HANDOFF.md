# Cadence: continuation handoff

Updated October 24, 2026, America/New_York. Read this before continuing. The human
requested an immediate GitHub checkpoint because their usage was nearly exhausted.
Do not restart the project, discard teammate work, or resurrect XTrain.

Credential continuity: see [CREDENTIALS.md](CREDENTIALS.md). The production key
was reverified as a configured, redacted Site secret at environment revision 3;
it persists beyond this chat. A new clone or another account does not inherit it.

Continuation completed later October 24: the interrupted fictional-answer check
now **passes**, including live Gemini feedback, skipped-answer null scores, the
report, and a downloaded/validated JSON export. All 44 tests, TypeScript, and the
production build were rerun and pass. No application changes or deployment were
needed. See [continuation evidence](qa/CONTINUATION_VERIFICATION_2026-10-24.md).
Browser access worked after the human signed in; this account's Sites connector
returned `Sites project not found`, so hosting ownership/settings were not
reverified. Physical media, full Firefox/screen-reader verification remain open.

## Current state

Repository: https://github.com/ShatterdPotato/SBUHacks2026 (Sameer's repository).
Canonical branch: main. This checkpoint is the resume/browser-audit change set;
use Git history for its final squash-merge SHA. Earlier handoff was main 6acc2d1.

Live site: https://cadence-interview-studio-aiden.daintyridge32.chatgpt.site

- Sites project: appgprj_6adcd46ff0dc8191943fd596d01bba52.
- Deployed application source: add43d0445ad419509d717ca4316eac4b32f0741.
- Saved version: appgprj_6adcd46ff0dc8191943fd596d01bba52~appgver_7bc87b31660481919afff74c19aad57f.
- Deployment: appgdep_6add213036888191b0453e9d4e623fb7; succeeded; environment revision 3.
- Audience remains owner-private. GitHub permission does not grant Site ownership
  or runtime-secret access. No public launch, domain setup, or indexing is claimed.
- Sites source SHA differs from the GitHub squash SHA because repositories differ.

## Latest user issue and completed work

Resume upload/read succeeded but interview generation sometimes failed. The user
reported a production transport error and an immediate local Gemini failure.
The local audit used an intentional dummy key; it has been removed and the dev
server stopped. No real provider key is configured locally. Curated practice
needs no key. Do not restore the dummy key or describe it as a production failure.

The fresh published build accepted the supplied fictional PDF (4,198 characters)
and generated four personal-mode AI skill questions. A separate fictional-mode
PDF session generated three real questions and referenced its fictional project.
The user interrupted before submitting a fictional answer in that final session;
the continuation has now completed that check in a fresh fictional session.
Earlier live question checks also succeeded; the original intermittent outage
was not reproduced or conclusively diagnosed. Do not promise it cannot recur.

Implemented: bounded transport/transient-status retry (two attempts total,
60-second deadline), same-provider fallback, safe provider error codes and
explicit curated recovery retaining the upload. Also fixed hidden resume source
leakage into prompt-only topics, source consent reset, requested-role priority,
binary TXT acceptance, blank whitespace role/report export, Unicode word-count
mismatch, unnamed help dialog, and singular labels. Added defensive upload guard.

Read [the detailed audit](qa/RESUME_BROWSER_AUDIT_2026-10-24.md).
The subagent ran 125 distinct manual browser scenarios: 118 PASS, 4 FAIL,
3 qualified LIMITATION. All 14 executed focused child retests passed. Two child
checks blocked by its browser were completed by the parent and passed. Baseline
failures remain historical evidence, not current failing claims. Parent tested
16 additional PDF/text/source boundaries. These are scenarios, not 125 distinct
methodologies. All 44 automated tests, TypeScript, and production build passed.
No physical camera/microphone or paid-media checks were performed.

## Persistent product and privacy decisions

- Product: Cadence, AI interview practice. Orchestrator: aiden.sol. No mailbox is
  connected; give manual handoffs and never invent teammate delivery receipts.
- Keep Gemini free. Do not enable billing or set paid policy without human
  authorization and appropriate data handling. Current server settings:
  AI_PROVIDER=gemini, GEMINI_DATA_POLICY=unpaid,
  GEMINI_MODEL=gemini-3.5-flash-lite,
  GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite.
- Hosted GEMINI_API_KEY remains a server secret. Never commit keys or request
  them in chat. A previously chat-pasted key should be securely rotated before
  a public launch. No credentials or Site ownership were transferred to GitHub.
- Personal mode reads PDF/TXT locally. Optional AI questions send only reviewed
  fixed generic skill labels and broad role, never raw personal resume/answers.
  Personal answer feedback is a labeled browser heuristic rubric.
- Fictional sample mode plus consent can send made-up extracted text and typed
  answers for AI questions/feedback. Free inputs/outputs may improve Google
  products and be reviewed. Do not send personal/sensitive/confidential data.
- Raw PDFs/audio/frames are blocked under unpaid policy. Original PDFs are read
  by bundled PDF.js in the browser: 2 MiB, 10 pages, 18,000 chars, 30 seconds.
  Scans need OCR; encrypted PDFs need an unlocked copy.
- Media requires explicit consent and a click. Clips stay in browser memory
  until downloaded or page closed. No server recording database/history exists.
- Confidence is a pace/filler delivery proxy. No face identity, lip-reading,
  emotion/personality/protected-trait inference, or hiring-fitness decisions.
  Observable framing/posture/head direction/visibility only; no visual score.
- API use is independent of Codex/ChatGPT subscriptions and this chat session.

## Included source and setup

All implemented features remain in web/. See [FEATURE_STATUS.md](FEATURE_STATUS.md)
for exact capabilities and deferred ambitions. Fictional resume PDF/TXT examples
are in examples/. Audit ledgers and recovery proof are in docs/qa/.

Core files: web/app/page.tsx and globals.css (setup/studio/report/recordings),
web/lib/pdf-resume.ts and resume-text.mjs (reading/validation),
resume-profile.mjs (allowlisted generic profile), interview.mjs (curated bank,
rubric/metrics/clip ranking), provider.mjs and service.mjs (provider/API/consent),
interviewer-instructions.mjs (versioned coaching contract), worker/index.ts.
Routes: GET /api/health; POST /api/questions, /api/analyze, /api/transcribe.

Use Node 22.13+ and pnpm 11.25.0. From web/: pnpm install; pnpm dev.
Live local AI requires ignored .dev.vars configured securely from its example;
without it the app uses practice mode. Keep credentials/personal data out of Git.
Required app checks: pnpm test; pnpm exec tsc --noEmit; pnpm build.
Stop Vite before production builds on Windows to avoid PDF asset EBUSY errors.

## What the next model should do

1. Read TEAM_CONTEXT.md, this handoff, ARCHITECTURE.md, FEATURE_STATUS.md, DEMO.md,
   and the audit report. Fetch main, inspect status, preserve teammate changes.
2. The fictional answer -> live Gemini feedback -> report -> JSON export check
   is complete. Read the continuation evidence before repeating provider calls.
3. If generation fails again, inspect recent production errors with Sites logs.
   Use safe code/status categories to distinguish transport, quota, key, settings,
   and model errors. Never expose raw upstream bodies or secret values. Retry or
   curated recovery must preserve the user's input. Free quotas can interrupt AI.
4. Focused 320/390/768px report layout and 320px setup/studio checks passed.
   Help naming, initial focus, Escape, and focus return passed. Complete a full
   screen-reader audit, focus-boundary checks, and Firefox separately.
   Browser user drafts must be preserved; interrupted temporary audit tabs may
   have closed. Do not assume a tab ID or automatically overwrite human content.
5. With explicit device permission, test physical recording, stop/retake,
   replay/download, strongest/weakest whole-answer clips, and device cleanup.
6. Ask which deferred feature to prioritize after restoring verification. Adaptive
   follow-ups, precise word-aligned clips, advanced acoustic/motion analysis,
   durable accounts/history, public launch/domain/indexing are not implemented.
7. For changes, use branch -> commit -> push -> PR -> review -> merge -> pull.
   Run required checks, publish using Sites skill, preserve current audience.

For Sites work read web/.openai/hosting.json and the Sites skill; get fresh source
credentials through tools and feed them through hidden stdin, never shell args.
The ignored outputs/cadence-site checkout avoids an embedded Git repo under web/.
Build/push/package exact matching source; deploy a saved version. Generated
node_modules/dist and private outputs are not needed in Git to reconstruct it.

Manual handoff: aiden.sol -> Sameer and next Cadence agent. All source/features,
fictional samples, tests, audit evidence and continuation instructions are saved
in the repository. No teammate message, runtime-secret transfer, physical-media
verification, or Site ownership transfer is claimed.
