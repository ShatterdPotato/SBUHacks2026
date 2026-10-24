# Cadence: read this before continuing

Updated October 24, 2026, America/New_York. The human requested this handoff because
their Codex usage was nearly exhausted. Do not restart the project or discard work.

## Where we left off

All application changes are already merged into **Sameer's repository**:
https://github.com/ShatterdPotato/SBUHacks2026 . Canonical branch: `main`.
Last application merge: `7e09897406ccb7e962290a11196be8bbe50d2449` (PR #5).
PR #3 replaced the retired XTrain rover; PR #4 added Gemini; PR #5 fixed PDFs and
added personal-resume practice. This handoff adds documentation and fictional examples.

Live Site: https://cadence-interview-studio-aiden.daintyridge32.chatgpt.site

- Sites project: `appgprj_6adcd46ff0dc8191943fd596d01bba52`.
- Latest deployed application source: `321bb50ef43bd78d5308352269dec5584ee8fcb3`.
- Saved version: `appgprj_6adcd46ff0dc8191943fd596d01bba52~appgver_c68a81b841788191bcc0ad80f84ee448`.
- Deployment: `appgdep_6adcfbf3c0388191ae5e3cdb642dbd0c`, succeeded; environment revision 2.
- Audience remains owner-private. GitHub access does not grant access to this Site
  or its runtime secrets. Do not make it public or change billing implicitly.
- The Site source repository has its own commit history; its SHA differs from
  GitHub's squash-merge SHA. Both contain the same latest application changes.

The last user issue was: "make it allow personal resumes, and it isnt accepting
that resume." The provided PDF was rejected by our former free-Gemini restriction.
That is fixed and deployed. The exact PDF extracted **4,198 editable characters**
in local and hosted browser tests. We also found and fixed a hidden upload input
that widened the page. The final CSS fix was built/deployed but its narrow-screen
layout still needs a fresh browser check.

## User decisions that must persist

- The product is **Cadence**, an AI interview practice service; XTrain and its
  hardware/mailbox are retired. Do not recreate rover work or delete unrelated repos.
- Orchestrator: `aiden.sol`. No mailbox is connected; this is a manual handoff.
- **Keep Gemini free.** The user explicitly answered "No - keep the free setup"
  when asked whether Google Cloud Billing was active. Do not enable billing or set
  `GEMINI_DATA_POLICY=paid` without a real change authorized by the owner.
- The user wants personal resumes accepted, PDF upload working, interview questions,
  camera/audio practice, feedback, and best/worst clips. See FEATURE_STATUS.md for
  implemented capabilities and honest boundaries.
- A ChatGPT/Codex subscription is not a website API allowance. Website calls use
  a server provider key and a versioned coaching prompt, not a developer's live chat.
- The user asked about Google search, a GoDaddy domain, and visitors without AI
  accounts. The Site remains private; custom domain, public launch, and indexing
  have not been completed. Do not claim those are live.

## Privacy modes and API contract

The selected provider is Google Gemini, model `gemini-3.1-flash-lite`.

**My real experience (default):** read PDF/TXT locally; retain resume and answers
in browser memory. Optional Gemini questions send only a broad role and reviewed
generic skill labels from fixed allowlists. They send no resume text, contact
information, employers, school names, project names, or personal answers. The
server rejects extra source fields. Personal answer feedback is the labeled,
heuristic browser rubric, not semantic AI evaluation.

**A fictional sample:** explicit selection plus cloud consent permits extracted
fictional resume text and fictional typed answers to Gemini for AI questions and
feedback. Original PDFs, audio, and camera frames are not sent on the unpaid policy.
The supplied examples are clearly labeled fictional and safe for this demo mode.

Free Gemini's terms prohibit personal/sensitive/confidential submissions and may
allow product improvement/human review. Sending generic topic labels is not a
promise to anonymize arbitrary resume text. Never replace this design with a
simple name/email scrubber and send the remaining personal resume automatically.
Reference: https://ai.google.dev/gemini-api/terms

Routes: `GET /api/health`; `POST /api/questions`, `/api/analyze`, `/api/transcribe`.
Personal free questions use `privacyMode:personal`, `profile:{roleFamily,skills}`,
count/type/level, cloudConsent, providerConsent. The personal UI computes feedback
in the browser; the server rejects personal free cloud analysis. Fictional cloud
calls use `privacyMode:fictional`, `demoDataOnly:true`, and matching provider consent.

## Files and local setup

- `AGENTS.md`, `TEAM_CONTEXT.md`: startup rules, current contracts, ownership.
- `web/app/page.tsx`, `globals.css`: setup, consent, editable PDF preview, studio, report.
- `web/lib/pdf-resume.ts`: PDF.js browser extraction; 2 MB, 10 pages, 18,000 chars,
  30-second timeout. Scans need OCR; password-protected PDFs need an unlocked copy.
- `web/lib/resume-profile.mjs`: fixed topic extraction and strict generic request checks.
- `web/lib/interview.mjs`: curated retrieval, rubric, pace/fillers, clip ranking.
- `web/lib/service.mjs`, `provider.mjs`: API validation, consent, Gemini/OpenAI adapters.
- `web/lib/interviewer-instructions.mjs`: shared provider coaching instructions.
- `web/scripts/run-cadence.mjs`, `copy-pdf-assets.mjs`: copy worker/font/CMap files
  from installed PDF.js to ignored same-origin public assets, then run the framework.
  Use `pnpm dev` / `pnpm build`; bypassing this wrapper can omit PDF assets.
- `web/worker/index.ts`: Cloudflare API entry before the Sites/Vinext handler.
- `docs/ARCHITECTURE.md`, `DEMO.md`, `FEATURE_STATUS.md`: contracts and verification.
- `examples/`: the fictional AI/ML resume in TXT and PDF, plus usage instructions.

From a fresh clone, install Node 22.13+ and pnpm 11.25.0, then:

```text
cd web
pnpm install
pnpm dev
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

The app works with browser rubric/curated practice without a key. For local live
AI, copy `.dev.vars.example` to ignored `.dev.vars` and configure a key securely.
Hosted runtime has `AI_PROVIDER=gemini`, secret `GEMINI_API_KEY`,
`GEMINI_MODEL=gemini-3.1-flash-lite`, `GEMINI_DATA_POLICY=unpaid`.
**No credential value is in Git.** The old key was pasted in chat and should be
rotated through a secure setup before a production launch; never ask for chat keys.
An `AQ.` authorization-key prefix can be valid; do not reject keys by that prefix.

## What was verified

- All **31 tests**, `pnpm exec tsc --noEmit`, and the production build passed.
- Real Gemini question generation and text feedback succeeded previously.
- Latest hosted personal flow: supplied PDF accepted; generic tags displayed;
  SQL tag excluded; three live AI questions generated; a typed answer used browser
  rubric; two skips stayed unscored; report correctly showed unavailable confidence
  for text-only answers. No new hosted console errors were observed.
- Latest hosted fictional flow: the same parsed PDF generated three AI questions
  and reached the studio in fictional sample mode. **The turn was interrupted
  before submitting a fictional answer in this final flow.** Finish that check.
- Physical camera/microphone capture and live paid transcription/visual analysis
  have not been verified. Mock tests are not hardware or live-media evidence.
- GitHub has no configured check runs/status checks on these PRs; verification
  above is local/live evidence, not a claim that GitHub CI ran.

## What the next model should do

1. Read this file, TEAM_CONTEXT.md, ARCHITECTURE.md, FEATURE_STATUS.md, and DEMO.md.
   Fetch main, inspect Git status, and preserve teammate changes before editing.
2. Confirm the latest deployed PDF upload still accepts `examples/fictional-ai-ml-resume.pdf`.
   Check extracted text and narrow layout after the hidden-input CSS fix.
3. Complete one fictional-sample answer through actual Gemini feedback and its
   report on the latest deployment. Use fictional content only. Test malformed,
   scanned, password-protected, and oversized PDF errors. Review timeout/password
   cleanup behavior; those edge cases were not exercised in browser QA.
4. With explicit device permission, test actual recording, stop/retake, device-off,
   replay, downloads, strongest/weakest whole-answer clips, and resource cleanup.
5. Ask which missing feature to prioritize. Do not label all original ambitions
   complete: adaptive follow-ups, word-aligned subclips, advanced motion/audio
   analysis, durable accounts/history, and public launch are not implemented.
6. For application changes, run the three required checks, browser-test relevant
   flows, use branch -> commit -> push -> PR -> review -> merge -> pull, and publish
   source changes to the existing Site using the Sites skill. Preserve its audience.

For Sites updates, read `web/.openai/hosting.json`, get the existing Site and a
fresh source credential, and use the supported Sites source helper. Do not place
credentials in shell arguments or files. Build via the Sites build helper and
publish its matching source/archive. The local ignored `outputs/cadence-site`
checkout was used to avoid embedding a separate Git repository under `web/`.
The repository source, dependencies, scripts, and hosting manifest are sufficient
to reconstruct the app; generated node_modules/dist need not be committed.

## Original whiteboard design, preserved

Open site -> upload resume or enter interview prompt -> scan relevant expertise ->
retrieve or generate questions -> voluntary camera/audio practice -> reviewed
transcription -> content/comprehension/delivery feedback -> strongest/weakest clips.
Visual feedback must describe observable framing/posture/gestures/head orientation
and face/mouth visibility only. Do not identify faces, lip-read, infer emotions,
personality/protected traits, or make hiring decisions. Confidence remains a
transparent pace/filler proxy, not a psychological assessment.

## Manual handoff

From / To: aiden.sol / Sameer and the next Cadence coding agent.
Owned work: existing application plus PDF/personal-resume fixes, documentation,
fictional samples, deployment and regression checks described above.
Blocker: no blocker for current free practice. Full AI analysis of personal
content needs eligible provider data handling; public rollout needs additional work.
No teammate-message delivery, Site ownership transfer, or credential transfer is claimed.

Windows development note: stop the local dev server before running a production build. Recopying PDF worker assets while Vite watches them can cause an EBUSY file-watcher error. This affects the local preview, not the verified hosted deployment.
