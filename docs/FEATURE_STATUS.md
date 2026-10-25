# Cadence feature inventory

Current October 25 review refresh supersedes earlier scoring/export/timing notes: **Cadence** is the website; **Gearwell** is the interviewer. AI grading begins only after media finalization, with two concurrent high-thinking content-rubric calls and a cancellable grading chamber. Current grades/regrades use `assessmentMode: content`: no separate factual score, focused accuracy pass or verification pass. Reference answers still ground technical feedback. Results use Clarity, Confidence (observed delivery only) and Knowledgeability (technical content only) gauges. Downloads are local paginated PDFs. Relax is locked during interviews; gears/coil accents respect reduced motion. Responsive fields are bounded from 320 px upward. See [current behavior and verification](qa/REVIEW_REFRESH_2026-10-25.md). Historical implementation notes below retain their original dates.

Latest October 25 frontend: **Gearwell** replaces the previous interface with the supplied brass design, mechanical gate, VRM examiner and live camera tile. Consented interviewer lines now use server-side ElevenLabs voice `Veg2qijYoJAS8VPKOOmi`; text-only practice remains available. The Cadence grading/recording engine and all high-thinking Gemini operations remain. Read the [integration, source and API map](GEARWELL_INTEGRATION.md) and its linked QA before UI/media edits. Current checks: 151 tests, TypeScript and production build. This is source/GitHub work; no new hosted deployment is claimed.

October 25 follow-up: factual grading now handles concise technical answers, retries missing/invalid checks with a focused high-thinking factual pass, and reassesses rubric explanations after factual findings. Reports expose per-answer accuracy and coverage. Replay waits for decoded seeks and WebM duration discovery, with retryable failures. Every Gemini operation now receives an explicit interviewer role matched to its output schema. See [follow-up QA](qa/FACTUAL_REPLAY_2026-10-25.md).

Current premium implementation (October 25): separate high-thinking planning, adaptive interviewer and background grader; selective verification, regrading/appeals, session synthesis, evidence-aligned clip coaching and on-demand drills. Four technical banks include original sourced questions with explicit AI-review provenance and independently executable exercises. Strict randomized coverage, retries, preserved answers and a session usage ledger are implemented. [Operation map](GEMINI_OPERATIONS.md) and [current QA](qa/PREMIUM_2026-10-25.md) supersede older configuration/route/count notes below. No human expert certification or hosted deployment is claimed.

Latest October 25 configuration: all Gemini API operations request high thinking. Models, consent and unpaid policy remain unchanged; current ceilings are 8,192 for planning/interviewing and 16,384 for deep assessment operations. The [premium interview design](PREMIUM_INTERVIEW_DESIGN.md) separates implemented settings from the proposed product architecture.


October 25 refinement: rubric v3 separates behavioral and technical expectations. Behavioral responses never count toward technical content/accuracy or receive probes. Gemini grading uses high thinking with literal evidence and actionable justification checks. Scored criteria generate visible critique; clip reasons match speech evidence with a labeled local fallback. See [current QA](qa/FEEDBACK_GROUNDING_2026-10-25.md).

Updated October 24, 2026: `c13107c` plus local adaptive/rubric work on
`codex/adaptive-interview-rubric`. Read [HANDOFF](HANDOFF.md) first.
These are source capabilities. The last recorded hosted build predates recording/
conversation work; owner/editor access is needed to publish the existing Site.
See [architecture](ARCHITECTURE.md) for contracts and [audit](REPOSITORY_AUDIT.md)
for verification and known gaps.

| Capability | Current source / boundary |
| --- | --- |
| Resume/prompt setup | PDF/TXT browser extraction and editable text, target role/context, 3–6 main topics, focus and level; conversation generates only an opener at setup. PDF: 2 MiB, 10 pages, 18,000 chars, 30 seconds; no OCR. |
| Personal resumes on unpaid Gemini | Resume/context stays local; optional questions send reviewed fixed skill labels and a broad role. Full personal-text analysis is blocked. |
| Curated question retrieval | 448 original sourced technical tasks, 112 per track (AI/ML, software, hardware, digital logic), plus behavioral/legacy roles. Answer keys resolve by ID. No live question search. |
| AI questions | Gemini Interactions or optional OpenAI Responses, strict JSON/runtime validation, safe errors, at most one transient retry. Configured Gemini fallback applies to the second attempt. |
| Question variety | Cryptographic shuffle, difficulty/topic diversity, exact category quotas, up to 240 recent bank IDs and 36 recent prompts per role in browser memory. Finite banks can repeat; reload clears recent history. |
| Conversational interview (default) | Questions spoken by Gearwell through consented ElevenLabs calls; explicit text continuation, continuous optional recording, automatic/manual turn completion, interruption, skip and early finish. Recorded turn limit 3 minutes; session limit 20 minutes. Text turns submit manually. |
| Pause/resume | Pauses transcription/listening; continuous recorder and physical devices remain active until finish. |
| Adaptive questions | One opener, then every subsequent consented AI probe/main question generated from the latest answer, role, approved topics, focus/level and recent history. Optional exact quotes are highlighted; repeated/invented questions/quotes are rejected. Local fallback labeled; up to one probe per substantive technical answer. No duplex voice/avatar. |
| Free Gemini conversation | Explicit fictional/non-sensitive attestation, provider consent, broad role, approved topic labels, focus/level and at most four prior question/answer pairs with ≤4 feedback strings of ≤1,000 chars each per turn. No resume/audio/frame forwarding. Obvious-contact checks are not anonymization. |
| Individual answer mode | Optional camera/mic preview/meter, separate video and audio recorders, 3-minute cap, stop/retake, transcription retry and text-only practice. |
| Local transcription | Quantized Whisper Base English in an isolated same-origin worker, 16 kHz mono worklet capture, ~12-second batches, automatic finalization. Guarded complete-answer refinement in conversation. English only; model download/compute latency varies. |
| Content feedback | Mandatory versioned rubric on every AI grade: relevance 25%, reasoning 30%, evidence 25%, completeness 20%, anchored 0–4. Server validates version/literal evidence and computes scores. Specific critical feedback, deduplication across recent feedback and safe bold emphasis. Local practice remains heuristic; skips unscored. |
| Factual accuracy | Nullable existing JSON `scores.comprehension`; literal source excerpts required. Supported/partial/contradicted credit weighted by severity; major/critical contradictions cap accuracy and content at 59/25. 32 executable reference exercises plus cash checks override AI. Separate verification adjudicates contradictions/unresolved coverage. AI-reviewed keys are labeled; no human certification, live fact search or proof of personal achievements. |
| Confidence / delivery | Labeled local weighted pace, repetitions/fillers, interior low-volume gaps, head position and upper-body framing. Insufficient/missing channels excluded. Ordinary movement has no penalty. |
| Local visual observations | Sampled face/pose geometry with smoothing; scoring requires 8 usable samples and 70% coverage. No face identity, expressions, lip-reading, eye-contact certainty, feelings or hiring judgment. Real-person accuracy remains unverified. |
| Cloud visual observations | Optional individual-answer JPEG samples under eligible provider/data policy. Separate consent; these notes do not affect scores. Blocked on unpaid Gemini. |
| Strong/improvement moments | Up to three distinct variable-length excerpts per category from one or multiple answers, approximate timestamps, bounded replay and local video/audio export. Global offsets for continuous recording; whole-answer fallback when timestamps are missing. |
| Reports | Available-score means, per-answer critical feedback/evidence/reference checks/delivery breakdown, expandable rubric criteria and applied caps, correction/appeal regrading, high-thinking session synthesis and clip coaching, on-demand drills, token/model/latency ledger, full recording download and JSON export without Blob URLs or raw audio/vision arrays. |
| Storage and privacy | Browser-memory state/recordings; no durable history. Consent checks, server-only keys, bounded requests, provider-safe errors and unpaid profile allowlists. Models may cache; recordings are not intentionally persisted. |
| Cloud transcription API | Retained consented `/api/transcribe` adapter for eligible clients. Current UI transcribes locally. Paid/live media adapters have mocked coverage only. |
| Hosting | Existing last-recorded owner-private Sites deployment; D1/R2 disabled. Source on GitHub. Later publication blocked by original Site access. No public launch, custom domain or indexing rollout. |
| Team continuation | Startup instructions, shared context, handoff, audit, architecture, demo, credentials and dated QA artifacts. No active rover mailbox. |

Deferred: durable accounts/history, custom app authentication/quotas/abuse controls,
public launch/domain setup, non-English ASR, duplex streaming voice, precise
word/frame editing, pitch/prosody scoring, continuous lip tracking, validated
gesture/gaze assessment and custom model training.

Verification remains separate for physical-device permissions/cleanup, real speech
and landmarks, cross-browser performance, full screen-reader use and live paid
media. Preserve dated QA observations and do not mark these complete from unit tests.
