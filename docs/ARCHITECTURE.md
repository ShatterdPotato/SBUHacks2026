# Cadence architecture

## October 25 eye-contact and coaching update

The existing classic vision worker optionally emits `eyeContact` as contact/away/
blink/none from eye-direction coefficients and head transform. Only timestamped
classifications remain in browser memory. RecordingCoach counts 500 ms slots,
including missed intervals, and rejects stale generation/listening epochs. Both
modes opt in locally. Percentages need 20 classified samples and 70% usable coverage.
Gaze has no Confidence weight pending camera validation; answer evidence and PDF
show coverage/limits. Existing head/framing scoring now counts missing slots.

`POST /api/coach` accepts optional `chatHistory`: at most eight alternating user/
assistant messages in completed exchanges (1500/6000 characters per message).
Saved answers and validated rubric evidence ground replies. Chat joins consent
and contact checks; recordings/vision are never sent. Replies contain an explanation
and zero to three drills with validated reference IDs. Results chat has separate
consent, aborts on revocation/unmount, keeps failed drafts and clears history after
transcript/grade changes. Deferred high-thinking grading is preserved.

Current October 25 review refresh supersedes earlier scoring/export/timing notes: **Cadence** is the website; **Gearwell** is the interviewer. AI grading begins only after media finalization, with two concurrent high-thinking content-rubric calls and a cancellable grading chamber. Current grades/regrades use `assessmentMode: content`: no separate factual score, focused accuracy pass or verification pass. Reference answers still ground technical feedback. Results use Clarity, Confidence (observed delivery only) and Knowledgeability (technical content only) gauges. Downloads are local paginated PDFs. Relax is locked during interviews; gears/coil accents respect reduced motion. Responsive fields are bounded from 320 px upward. See [current behavior and verification](qa/REVIEW_REFRESH_2026-10-25.md). Historical implementation notes below retain their original dates.

Latest October 25 frontend: **Gearwell** replaces the previous interface with the supplied brass design, mechanical gate, VRM examiner and live camera tile. Consented interviewer lines now use server-side ElevenLabs voice `Veg2qijYoJAS8VPKOOmi`; text-only practice remains available. The Cadence grading/recording engine and all high-thinking Gemini operations remain. Read the [integration, source and API map](GEARWELL_INTEGRATION.md) and its linked QA before UI/media edits. Current checks: 151 tests, TypeScript and production build. This is source/GitHub work; no new hosted deployment is claimed.

October 25 follow-up: factual grading now handles concise technical answers, retries missing/invalid checks with a focused high-thinking factual pass, and reassesses rubric explanations after factual findings. Reports expose per-answer accuracy and coverage. Replay waits for decoded seeks and WebM duration discovery, with retryable failures. Every Gemini operation now receives an explicit interviewer role matched to its output schema. See [follow-up QA](qa/FACTUAL_REPLAY_2026-10-25.md).

Current premium implementation (October 25): separate high-thinking planning, adaptive interviewer and background grader; selective verification, regrading/appeals, session synthesis, evidence-aligned clip coaching and on-demand drills. Four technical banks include original sourced questions with explicit AI-review provenance and independently executable exercises. Strict randomized coverage, retries, preserved answers and a session usage ledger are implemented. [Operation map](GEMINI_OPERATIONS.md) and [current QA](qa/PREMIUM_2026-10-25.md) supersede older configuration/route/count notes below. No human expert certification or hosted deployment is claimed.

Latest October 25 configuration: all Gemini API operations request high thinking. Models, consent and unpaid policy remain unchanged; current ceilings are 8,192 for planning/interviewing and 16,384 for deep assessment operations. The [premium interview design](PREMIUM_INTERVIEW_DESIGN.md) separates implemented settings from the proposed product architecture.


## October 25 scoring and question contract

`question-kind.mjs` preserves question category and detects common introductions independently of session focus. Both grading routes retain this classification. `nextTurnAction` allows one probe only for substantive technical answers; the server also converts behavioral probes to transitions/finish and rejects obvious disguised probes/quotes after behavior. Mixed transitions after behavior require an independent technical topic.

`local-grading.mjs` supplies conservative category-specific cue estimates. AI v3 selects technical or behavioral anchors, validates literal evidence and required improvements, and generates visible feedback from those same scored criteria. `reportFor.categoryScores` separately averages Technical and Behavioral content; behavioral answers are excluded from factual accuracy. Answer headers show content only; session overall retains available delivery and content/technical-accuracy dimensions. Every current Gemini request uses high thinking. Current ceilings are 8,192 for questions/transcription and 16,384 for grading, verification and synthesis.

Clip rankings use matching criterion evidence or a labeled local excerpt estimate. Reasons quote the excerpt and explain a strength or concrete revision. Whole-answer and delivery scores do not inflate clip content rankings; measured delivery is described separately. No new media upload or persistence is introduced.

Source contract updated October 24, 2026: `c13107c` plus local adaptive/rubric
implementation on `codex/adaptive-interview-rubric`. This describes current
application source; publication and dated verification are in [HANDOFF](HANDOFF.md)
and [DEMO](DEMO.md). See [the repository audit](REPOSITORY_AUDIT.md) for tooling
and scaffolding that is present but unused by the product.

## Runtime and module boundaries

The React 19 client is served by Vinext/Vite with a Cloudflare Worker.
`worker/index.ts` intercepts every `/api/*` request and calls `lib/service.mjs`
before the page handler. Secrets exist only in Worker environment bindings.
The API/business modules are independently exercised by Node's test runner.

| Area | Owned source |
| --- | --- |
| Setup, individual practice, report/export | `app/page.tsx`, `app/globals.css`, `app/layout.tsx` |
| Default conversation | `components/conversation-studio.tsx`, `lib/conversation.mjs` |
| Questions and input validation | `lib/interview.mjs`, `role-context.mjs`, `role-questions.mjs`, `question-variety.mjs` |
| Resume reading/privacy profiles | `lib/pdf-resume.ts`, `resume-text.mjs`, `resume-profile.mjs` |
| Provider API and consent | `lib/service.mjs`, `provider.mjs`, `interviewer-instructions.mjs` |
| Premium API and report UI | `lib/premium-service.mjs`, `lib/grading-core.mjs`, `lib/ai-client.ts`, `components/premium-review.tsx` |
| Knowledge/reference checks | `lib/knowledge.mjs`, `technical-bank.mjs`, `verified-exercises.mjs`, `data/question-bank/` |
| Mandatory grading agent/rubric | `agents/GEMINI.md`, `agents/interview-grader.mjs`, `lib/content-rubric.mjs`; report `components/feedback-text.tsx`, `grading-breakdown.tsx` |
| Shared client contracts | `lib/interview-types.ts`, `recorded-delivery.d.mts` |
| Speech/audio/vision | `lib/recording-coach.ts`, `speech.worker.ts`, `speech-refinement.mjs`, `public/audio-capture.worklet.js`, `public/vision-capture.worker.js` |
| Delivery and clips | `lib/recorded-delivery.mjs`, `components/moment-clip.tsx`, `lib/export-clip.ts` |

Sites' last-recorded private access boundary protects the hosted MVP. There is no
custom API authentication, per-user quota or abuse-control implementation.
A supplied foreign Origin is rejected; missing Origin is accepted. This does not
replace authentication. Before a public or different-host deployment, implement
the needed access/usage controls.

## API contract

Responses use `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.
Thirteen routes include health, seven premium routes, four compatibility adapters and ElevenLabs speech.
The current UI uses the premium routes; `/api/transcribe` remains a retained adapter.
See [the complete call map](GEMINI_OPERATIONS.md). Recognized mutation routes require POST and reject a supplied foreign Origin.
JSON bodies must be `application/json` and are bounded to **4,000,000 bytes**,
including streamed bodies. Errors return safe `error` text and optional `code`.

| Endpoint | Accepted input / consent | Result |
| --- | --- | --- |
| `GET /api/health` | none | `mode`, provider/label/model, `cloudAvailable`, `demoDataOnly`, `mediaCloudAvailable`, `pdfCloudAvailable`. Availability is configuration/key presence, not a live provider probe. |
| `POST /api/plan` | Generic allowlisted profile, focus/level, count 3–6, explicit provider consent | Randomized category schedule, competency priorities and behavioral opener |
| `POST /api/interviewer` | Validated plan, current question/answer, up to 13 history entries and 300 seen IDs; explicit text consent | Independent adaptive probe, canonical-bank transition or finish; last four turns reach Gemini |
| `POST /api/grade`, `/api/regrade` | Question/key binding, answer ≤20,000 chars, duration 0–600, optional appeal ≤1,500; explicit text consent. Optional ≤4 JPEGs ≤180,000 chars require separate visual consent and eligible provider. | Rubric-derived analysis; optional independent verification; pending/provisional/completed state and usage. Text-only verification; visual notes never affect scores. |
| `POST /api/session-report`, `/api/coach` | Up to 13 consented answers with validated criterion evidence; coach request ≤1,500 chars | Quoted patterns/priorities or explanation/drills; no generated numeric scores |
| `POST /api/clip-feedback` | 1–6 timestamped transcript excerpts ≤6,000 chars, full answer context ≤20,000 and validated grading; explicit text consent | Literal excerpt quote, distinct strength/correction, justification and replay category; no media or generated score |
| `POST /api/questions` | role ≤160 chars, context ≤20,000, type Mixed/Behavioral/Technical, level Internship/Entry level/Experienced, integer count 3–6, format conversation/individual, optional variation token; cloud/provider consent for live calls. Unpaid personal mode instead requires an allowlisted profile-only request. | `mode`, optional provider and questions with id/prompt/category/focus/source. Conversation returns one opener; individual returns count questions. No cloud opt-in/key uses curated retrieval. |
| `POST /api/analyze` | question prompt ≤1,200, focus ≤12 strings, answer ≤20,000, duration 0–600, recorded/mode; matching cloud/provider consent for live feedback. Unpaid personal analysis rejected. Optional ≤4 small JPEG data URLs, each ≤180,000 chars, under eligible media policy. | Analysis: nullable confidence/content/comprehension, metrics, summary, strengths/improvements, literal evidence, visual notes, knowledge, versioned criterion grading and limitations. |
| `POST /api/interview-turn` | question prompt ≤1,200, answer ≤12,000, role ≤150, ≤4 prior question/answer pairs with the same text bounds and optional ≤4 feedback strings ≤1,000 chars each per prior turn; interview settings allow only profile, type, level, topicIndex, targetTopics (3–6), nextAction (probe/transition/finish); duration 0–600, recorded and matching cloud/provider consent. Unpaid additionally needs `privacyMode:fictional`, `demoDataOnly:true`, `nonSensitiveConsent:true` and an allowlisted broad role. | `{ analysis, nextQuestion, followup }` (`followup` is a compatibility alias of nextQuestion.prompt). Next question ≤45 words, valid focus/category and optional exact current-answer anchorQuote ≤160 chars; finish permits an empty prompt. Requires a configured provider; the browser handles failure with labeled local feedback. Resume/media fields are not forwarded. |
| `POST /api/transcribe` | multipart, `cloudConsent=true`, matching `providerConsent`, eligible media policy; nonempty supported audio file ≤20,000,000 bytes; total body ≤22,000,000 bytes. | `{ text }`. Retained cloud adapter; current UI does not call it. |

Legacy direct `/api/questions` PDF data URLs are bounded to 2,800,000 characters
and need cloud consent plus an eligible provider. The current UI extracts text
locally and never sends the original PDF. The browser's PDF/TXT size cap is
**2 MiB**; PDF parsing additionally limits ten pages, 18,000 extracted characters
and thirty seconds. Scans need OCR; password-protected PDFs need an unlocked copy.
PDF.js worker/fonts/CMaps are served from the same origin.

Provider outputs use JSON schemas plus runtime validation. Evidence quotes must
occur literally in the answer. Conversation checks also require valid status and
known reference IDs for supported/contradicted claims. Resumes, transcripts,
history and prompts are untrusted data within the shared coaching instructions.

## Question preparation

An explicit role takes priority over recognizable context role and resume
background. Local banks include practical cashier/customer-service scenarios and
AI/ML/data-science questions plus generic role questions. Broad families and fixed
skill labels are shared by local detection and server validation.

Local retrieval shuffles and filters similar/recent prompts, preserving mixed
category counts with seen-question fallback when necessary. Browser module memory
keeps the last 36 questions per normalized role; reload resets it. Generated
sets are checked for internal repetition. The client filters them against recent
questions and fills gaps with curated questions. A session marked `live` can contain generated and curated sources. Conversation
keeps one opener from setup with a separate target topic count. Every later
consented AI question is generated after the response using the broad role,
approved topic labels, focus/level, progress, current answer and up to four prior
turns/feedback. Main transitions are generated too. The server checks recent
questions; the client checks the whole session. Local fallback is labeled.
Highlighted anchor quotes must occur literally in the latest answer.

## Conversation and individual media lifecycle

Conversation owns one MediaRecorder, RecordingCoach and turn state. With explicit voice consent, Gearwell reads each question through ElevenLabs.
Without consent the question remains readable; a voice failure offers retry or
explicit text continuation. Recognition is gated
during interviewer playback and thinking time. A microphone-energy threshold
ends a voiced turn after a configured 5/7/10-second wait. Manual completion,
interrupt, skip, text conversation and early finish are available. One follow-up
may follow a technical answer with at least ten recognized words.

Media capture needs explicit local-processing consent and a start click.
Camera and microphone stay active throughout the continuous recording, including
interviewer playback and **Pause listening**. Pause only gates recognition;
finish stops recording/devices. Limits are three minutes per recorded turn and
twenty minutes per session, subject to turn/finalization work. Text turns submit
manually. Early finish preserves an
in-progress recognized transcript with local feedback. Provider failures preserve
recording evidence and visibly use local fallback analysis.

Individual practice retains separate video+audio and audio-only recorders per
answer, preview/meter, three-minute cap, stop, retake and local recognition retry.
Stopping an answer does not turn off preview devices; explicit device-off or
session completion does. The audio-only Blob supports local retry and is not
uploaded by the UI. Eligible optional cloud JPEG notes exist only in this mode.

`RecordingCoach` captures mono 16 kHz PCM through an AudioWorklet. Quantized
`Xenova/whisper-base.en` runs as WASM in a dedicated worker, with approximately
twelve-second batches and one-second overlap; silence-only chunks are rejected.
Word timestamps are approximate. Conversational multi-batch turns may receive a
whole-answer pass, trimmed after measured speech. Refinement losing more than
20% of recognized words or over two seconds of recognized ending speech is
discarded. Each new turn releases the prior PCM buffer; gated audio is replaced
with silence to preserve the session clock. Recognition errors can require retry
or transcript corrections.

The local classic vision worker samples about twice a second, uses MediaPipe
face/pose models and three-sample head-position smoothing. Speech/vision model
weights download from Hugging Face/Google; inference is local and recordings are
not sent to those download hosts. Models may cache; session media is not
intentionally persisted. First use is not an offline flow.

Workers/AudioContexts/tracks close on finish/unmount or individual device-off.
Reset/retake revoke relevant Blob URLs; unload warnings remind users to download.
All session state and videos are memory-only. No IndexedDB/localStorage session
history, server recording database or background upload is implemented.

## Scoring and clip contracts

`Analysis.scores` retains `confidence`, `content` and `comprehension`, each
nullable. Reports average available dimensions and exclude missing scores.
Skipped/empty answers have no scores. `localTurn` wraps the lexical rubric with
reference checks. Its old internal comprehension heuristic is replaced before
current product display.

- **Content quality:** local lexical heuristic or mandatory `cadence-content-v3`
  AI rubric. Anchored 0–4 levels: relevance 25%, reasoning 30%, specific support
  25%, completeness 20%. Every grading request embeds the entire current rubric
  through the agent on both providers/routes and retries. Response version, IDs,
  levels and literal evidence are validated; the server computes weighted totals.
  Missing/stale rubric evidence fails with a safe 502. Relevance 0 caps content
  at 20; major/critical factual errors cap it at 59/25. See [rubric](GRADING_RUBRIC.md).
- **Factual accuracy:** existing `comprehension` field; supported/partial/
  contradicted receive 1/.5/0 credit with minor/major/critical weights 1/2/3.
  Unverified claims excluded; null without checks. Major/critical errors cap
  accuracy at 59/25. Model checks need exact answer and reference quotes; invalid
  citations and duplicate/overlapping claim quotes are excluded. The bank provides 448 authored keys, including 32 executable reference exercises,
  alongside legacy references. Local checks accept an explicit result marker or an
  unambiguous bare result; semantic checking needs consented AI. `/api/interview-turn`
  and `/api/analyze` add provisional AI classifications against supplied references.
  Neither accepts a free-form model accuracy score.
  Deterministic arithmetic overrides conflicting AI praise/prose. No live web
  search or certification of personal achievements occurs.
- **Confidence / delivery:** the current UI replaces the legacy API pace/filler
  proxy with measured `recordedDelivery`. Base weights: pace .20, fillers/possible
  repetitions .10, pauses .15, head position .15, framing .10. Available weights
  renormalize. At least five seconds, fifteen recognized words and two components
  are needed. Each visual component needs eight usable samples and 70% coverage.
  Pace uses first-to-last word timing when available. Movement is described
  without a penalty. Cloud visual notes never affect scores.

There is no face identification, lip-reading, emotion/personality/protected-trait
inference, stuttering diagnosis, eye-contact certainty or hiring-fitness scoring.
These are voluntary coaching heuristics affected by noise, ASR and camera setup.

Speech excerpts split on gaps/sentence boundaries with a clause/midpoint fallback.
Ranking uses matching criterion evidence or a local excerpt estimate, with referenced-error caps. Delivery remains a separate observation. Ties say no clear difference was measured.
Up to three excerpts per category can come from one or several answers; categories
do not duplicate the same excerpt. Without timing, whole-answer fallback remains.

Word/evidence times are relative to each turn. `recordingOffset` converts clip
ranges to the shared continuous Blob's clock. Playback uses a shared asynchronous controller: discover missing WebM duration,
wait for decoded seek readiness, ignore stale end events while seeking, and pause
at the bounded end. Replay and export share preparation; loading/error/retry states
are visible. No competing media-fragment seek is applied.
Export re-encodes locally with canvas/Web Audio/MediaRecorder and takes roughly
the excerpt duration; frame/word cuts are approximate. One full interview
download is shown for conversation. JSON exports omit Blob URLs and raw sampled
audio/vision arrays, but retain transcripts, timing and derived feedback.
The top-level export `mode` tracks question generation; use per-answer
`analysis.mode` and question `source` to understand mixed/local-fallback sessions.
Report corrections first update local evidence, then regrade previously consented
answers and invalidate derived conclusions while retaining original delivery/alignment. Feedback deduplication compares summaries,
bullets and bounded previous feedback. Short key phrases use safe **bold**
rendering, not HTML. The expandable rubric explains criteria/caps and shows a
duplicate evidence quote once. Empty strengths are allowed.

## Provider policy and reliability

`AI_PROVIDER` selects Gemini or OpenAI; absent that, a Gemini key selects Gemini,
otherwise OpenAI. Missing keys leave practice mode available. Code defaults are
`gemini-3.5-flash-lite`, `gpt-4.1-mini` and
`gpt-4o-mini-transcribe`; they are configuration defaults, not guarantees of
current provider availability. Verify official provider support before changes.

Gemini uses HTTPS Interactions with `x-goog-api-key` header authentication;
OpenAI uses Responses and optional audio transcription with bearer headers.
Structured calls use `store:false`. Gemini text is extracted only from model
output steps. Both structured adapters share `interviewer-instructions.mjs`.
They do not access this Codex chat, a coding-agent session or subscriptions.

Unpaid Gemini is the default unless `GEMINI_DATA_POLICY=paid` is explicitly set:

- Personal question requests allow only validated broad role/skill labels and
  settings/consent/variation fields. Other source fields are rejected.
- Fictional setup plus provider consent permits invented extracted text/answers.
- Conversation has an independent studio opt-in. Under unpaid policy it requires
  fictional/non-sensitive attestation, a matching broad-role/allowlisted skill profile, focus/level and bounded
  transcript/feedback history. Unknown history fields are projected away. Obvious
  email/phone matches in question, answers/history are rejected. This is
  partial validation, not anonymization or a guarantee that text lacks personal data.
- Original PDFs, audio and frames are rejected on unpaid cloud routes.

Paid Gemini policy is an operator declaration after appropriate owner-authorized
billing/data handling, not billing activation. Eligible paid Gemini/OpenAI adapters
support media but require separate live verification.

Transport errors and HTTP 408/500/502/503/504 get at most one retry within a
sixty-second deadline; the first attempt is capped at thirty seconds. Optional
`GEMINI_FALLBACK_MODEL` replaces the model only for attempt two. Credentials,
quota and invalid requests are not retried. Logs/errors expose fixed categories,
not upstream bodies or credentials. Individual-answer failures retain inputs for
retry; conversational failure is explicitly labeled local fallback.

## Build and deployment

`pnpm dev/build` invokes `scripts/run-cadence.mjs`: copy PDF.js/MediaPipe assets,
bundle speech separately without Vinext page/HMR transforms, then run the
framework. The worker is served at `/vendor/speech/speech.worker.js`; generated
public vendor directories are ignored. Restart dev after speech-worker changes.
Portable execution uses the Vinext CLI; a checkout-local managed Linux profile
uses its dedicated wrappers. `pnpm start` serves built Worker output locally.

`web/.openai/hosting.json` preserves the Site identity; D1/R2 are null.
Database tables/migrations are empty and the notes API lives only in examples.
Sites auth/connector helpers and preview infrastructure are retained scaffolding;
the interview flow does not invoke connected services. They are unrelated to the
retired rover mailbox. See [HANDOFF](HANDOFF.md) for the last recorded deployment
and access blocker; this architecture does not establish a new publication.
