# Cadence repository audit

Latest October 25 frontend: **Gearwell** replaces the previous interface with the supplied brass design, mechanical gate, VRM examiner and live camera tile. Consented interviewer lines now use server-side ElevenLabs voice `Veg2qijYoJAS8VPKOOmi`; text-only practice remains available. The Cadence grading/recording engine and all high-thinking Gemini operations remain. Read the [integration, source and API map](GEARWELL_INTEGRATION.md) and its linked QA before UI/media edits. Current checks: 151 tests, TypeScript and production build. This is source/GitHub work; no new hosted deployment is claimed.

This is the documentation-audit snapshot before the adaptive/rubric application
change. For current source/contracts and checks, read [HANDOFF](HANDOFF.md) and
[adaptive grading QA](qa/ADAPTIVE_RUBRIC_2026-10-24.md). The original scope/results
below are preserved as dated evidence.

Date: October 24, 2026, America/New_York.
Audited source: `c13107c0deedfe91c0df9e7890d440f5925d642b` (local `main`,
PR #12 merged). Documentation branch: `codex/repository-context-audit`.
Task: analyze the repository and update maintained context to match implemented
source, historical evidence and known operational limits.

## Scope and method

Inventoried all **180 tracked paths** at the starting revision: 152 under
`web/`, 20 under `docs/`, three fictional example files and five root files.
The documentation refresh adds this audit; the baseline counts exclude it.

Reviewed maintained context, product/API/scoring/media source, dependency/build
configuration, worker/hosting integration, test coverage, reusable fixtures and
dated QA records. Classified the UI component library, vendored styling/licenses
and platform/database examples separately from active product behavior. The
lockfile was used unchanged for verification. This is a source/context audit,
not a penetration test or a line-by-line certification of third-party dependencies.

Excluded secret values, personal media, ignored private coordination state,
generated output, dependency internals and old XTrain history. Checked only
whether `web/.dev.vars` exists; it was absent. No secret was read. No remote
Git refresh, browser run, provider call, physical-device access or hosting account
inspection was needed. Cached `origin/main` matched local `main` at startup;
this does not prove a subsequently unchanged remote.

## Repository map

| Area | Files / responsibility |
| --- | --- |
| Startup and continuation | Root `AGENTS.md`, `CLAUDE.md`, `TEAM_CONTEXT.md`, `README.md`; `docs/HANDOFF.md`, feature/architecture/demo/credentials docs and this audit. |
| Product entry and presentation | `web/app/page.tsx`, `layout.tsx`, `globals.css`, `public/favicon.svg`. Client setup -> conversation or individual studio -> report. |
| Conversation | `web/components/conversation-studio.tsx`, `lib/conversation.mjs`, `lib/interview-types.ts`. Turn states, Gearwell/ElevenLabs voice, optional continuous recording, local/provider follow-ups and early finish. |
| Questions and privacy profiles | `lib/interview.mjs`, `role-context.mjs`, `role-questions.mjs`, `question-variety.mjs`, `resume-profile.mjs`. Role priority, finite curated banks, recent memory, validation and allowlisted cloud profiles. |
| Resume parsing | `lib/pdf-resume.ts`, `resume-text.mjs`. Local PDF.js and TXT validation; no OCR or parser service. |
| API/providers | `worker/index.ts`, `lib/service.mjs`, `provider.mjs`, `interviewer-instructions.mjs`, `cloudflare-env.d.ts`. Five endpoints, server-side secrets/consent, structured outputs, bounded retry and safe errors. |
| Knowledge | `lib/knowledge.mjs`. Small embedded reference pack and deterministic constrained cash calculations; no live search. |
| Media capture/inference | `lib/recording-coach.ts`, `speech.worker.ts`, `speech-refinement.mjs`, `public/audio-capture.worklet.js`, `public/vision-capture.worker.js`. Local audio/vision inference and evidence lifecycle. |
| Delivery and moments | `lib/recorded-delivery.mjs` plus declaration, `components/moment-clip.tsx`, `lib/export-clip.ts`. Nullable evidence-weighted delivery, excerpt selection/offsets, bounded playback and local exports. |
| Build/runtime | `package.json`, pnpm lock/workspace/npmrc, `vite.config.ts`, `next.config.ts`, `tsconfig.json`, ESLint/PostCSS config and `scripts/`. Prelaunch asset preparation, standalone speech-worker bundling and portable/managed execution wrappers. |
| Sites integration | `.openai/hosting.json`, `scripts/vite/sites-vite-plugin.ts`, its license, connector-preview plugin/session/worker/protocol/host-binding utilities, `lib/connector-*` and `lib/connectors.ts`. Retained platform capability plumbing; product interview routes do not invoke connected services. |
| Auth scaffolding | `app/chatgpt-auth.ts`, local Sites auth plugin, `components/connector-error.tsx`. Auth/header/recovery helpers exist; Cadence has no custom user/login/history flow. |
| Database examples | `db/index.ts`, empty `db/schema.ts`, `drizzle.config.ts`, empty migration journal and `examples/d1/`. D1/R2 bindings are null; example notes API is outside `app/` and is not a deployed product endpoint. |
| UI scaffolding/vendor | 61 `components/ui/` primitives, `hooks/use-mobile.ts`, `components.json`, `lib/utils.ts`, `vendor/shadcn-tailwind-4.13.0.*`. Preserve generated/vendor code and licenses; presence does not imply an active product feature. |
| Automated tests | Six `web/tests/*.test.mjs` files: interview, Gemini, resume profile, browser-audit regressions, recorded delivery and conversation. 64 Node tests; provider requests are mocked. |
| Browser fixtures | `tests/fixtures/worker-origin.html`, `conversation-harness.tsx`, `build-conversation-audio.ps1`, plus `tests/resume-fixture.txt`. Manual actual-origin synthetic QA; no standard browser-test command/CI pipeline. |
| Examples and dated evidence | Fictional PDF/TXT in root `examples/`; dated Markdown/JSON/ledgers and recovery image in `docs/qa/`. Historical results remain attributed to their original checks. |
| Generated/private local state | Ignored node_modules, dist/framework/Wrangler/Sites state, generated public vendor assets, QA media/routes when temporarily installed, outputs and local key files. Not reconstructed from committed recordings or secrets. |

## Context contradictions corrected

| Previous description | Source-grounded correction |
| --- | --- |
| Typed/manual transcript entry is the main recording path | Whisper Base English transcribes locally; typed input is text practice or correction. Conversation has guarded whole-answer refinement. |
| Each answer always has its own recording | Default conversation shares one continuous recording. Individual mode retains separate recordings. |
| Adaptive conversation is unimplemented | Local/template and optional provider follow-ups, automatic/manual turns, interruption, pause/skip/finish are implemented. No duplex voice streaming is claimed. |
| Highlights are whole-answer-only | Variable-length strong/improvement excerpts replay/export real local audio/video; whole-answer fallback remains. |
| Comprehension is always a lexical/AI score | Current display is Knowledge / accuracy using the existing nullable `comprehension` key and checked references. |
| Movement contributes a delivery penalty; older visual weights apply | Movement is observational. Current base head/framing weights are .15/.10, with 8-sample and 70% coverage requirements. |
| Conversational work is still an unmerged feature branch | PR #12 is merged in audited local `main`; recording/worker fixes are merged too. |
| A local real key is configured, or an old fictional feedback check is unfinished | `web/.dev.vars` is absent in this checkout. The historical hosted fictional feedback/report/export check was completed. |
| Latest source is necessarily hosted | Last recorded hosted source is older. Later publication was blocked by original Site account access; no new deployment is established. |

Maintained files refreshed: root startup/shared/readme documents;
`docs/{HANDOFF,ARCHITECTURE,FEATURE_STATUS,DEMO,CREDENTIALS}.md`;
`web/README.md`; `examples/README.md`. This audit is new.
Historical QA ledgers, fictional artifacts, vendor licenses and application code
were preserved.

## Current validation

Environment used: Windows PowerShell, Node **v24.20.0**, pnpm **11.25.0**.
The project's declared minimum is Node 22.13.0.

| Check | Result during this refresh |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS; completed sequentially, exit 0. Existing lockfile retained. |
| `pnpm test` from `web/` | PASS: **64 passed, 0 failed, 0 skipped**, exit 0. |
| `pnpm exec tsc --noEmit` | PASS, exit 0. |
| `pnpm build` | PASS, exit 0, standalone speech bundle and all five Vinext build phases completed. Only the product `/` page was listed; no temporary QA route was built. |
| Documentation links and `git diff --check` | PASS; 59 relative links across 20 Markdown files resolve, no whitespace errors. |
| `pnpm lint` | Not run in this documentation refresh; it is separate from the required three application checks. No lint-clean claim. |
| New browser/provider/hardware/deployment verification | Not performed; use dated QA evidence for earlier results and do not treat it as a fresh check. |

The first test/typecheck attempts each triggered automatic dependency setup and
collided on Windows symlinks (`EEXIST`/`EBUSY`) before reaching the checks.
A single frozen install repaired the environment, then all required commands
were run sequentially and passed. Those setup failures are not failing tests or
a source defect claim.

Build notices remain: standalone speech JavaScript about 850 kB, WASM about
21.6 MB, chunk-size/plugin-timing warnings and Vinext's static route-classification
notice. Successful bundling does not prove first-use model-download performance,
media quality or hosted deployment.

## Open gaps and follow-up priorities

| Gap | Evidence / next action |
| --- | --- |
| Current source not recorded as deployed | Preserve original Site identity/private audience/secret bindings. Resolve owner/editor access before publishing; exact last-known IDs are in HANDOFF. |
| Physical-device and real-person quality | Historical media QA used synthetic speech/canvas and public fixtures. Explicitly consented permission, speech, landmark, replay/export, disconnect and cleanup checks remain. |
| Accessibility/browser/performance | Focused earlier Chromium checks exist. Full Firefox, assistive-screen-reader/focus-boundary, noisy/accented speech and low-resource/model-load testing remain. |
| Paid cloud media | Gemini/OpenAI media translation has mocked tests; no live paid-media acceptance check is established. |
| Legacy npm installers | `scripts/install-ci.mjs` and `install-ci.sh` refer to npm CI/package-lock and an `install:ci` script absent from package.json. The tracked project uses pnpm. Avoid that legacy path until reconciled; the current frozen pnpm path passed. |
| No automated browser/CI rollout | No tracked `.github/` workflow or browser-runner script. Browser fixtures are manual and must never be copied into production permanently. |
| UI copy still contains older descriptions | `app/page.tsx` retains some “content/comprehension” wording and setup consent mentions cloud recorded audio although current UI transcription is local. Align product copy in a separate application change; this task updated docs only. |
| Unified interviewer voice | Resolved by the Gearwell import: both modes and individual replay share the fixed ElevenLabs voice. No browser speech-synthesis path remains in the application. |
| Export/health provenance | Top-level report mode tracks question generation; actual per-answer feedback can be local/live/mixed. Health availability is key/config presence, not a provider probe. Use per-answer modes/question sources and preserve these semantics in future clients. |
| Evidence/coverage limits | Reference pack is small/static; local arithmetic accepts only constrained unambiguous amounts. Contact checks are partial, recent memory resets, exact clip cuts are approximate and real-person delivery is unvalidated. These are documented limits, not certified correctness. |
| Public production features | No durable history, active D1/R2, custom authentication/quotas or public abuse-control rollout. Existing platform helpers do not establish those features. |

There is no new application fix or deployment in this task. Future code work must
preserve consent/privacy and run the required checks in AGENTS.md. Use the manual
handoff in HANDOFF.md; no mailbox receipt or teammate notification is claimed.

## Final documentation review

All 59 relative Markdown links across 20 Markdown files resolved to existing local
targets; external links were not revalidated. `git diff --check` passed. Changed
paths are the 11 maintained context documents plus this new audit. Application
source, dependency/configuration files, historical QA evidence and fixtures have
no changes. No commit, push, PR or publication was performed.
