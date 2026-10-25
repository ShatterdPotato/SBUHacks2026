# Cadence review refresh — October 25, 2026

This update supersedes the previous factual-scoring, background-grading and JSON-export UI contracts. Cadence is the website; Gearwell remains the interviewer.

## Current behavior

- Questions, transcripts and available question-bank reference approaches are retained during the interview. No Gemini grading starts between turns in either conversation or individual practice.
- Media finalization and device release precede the grading chamber. `lib/session-grading.mjs` runs at most two grades concurrently. Progress counts actual completions; cancellation preserves answers and allows retries from the report. Captured frames are removed from completed grading snapshots.
- The current website uses `assessmentMode: content` for grades, transcript corrections and appeals. This invokes one high-thinking rubric/key assessment, without the legacy factual score, accuracy retry or verification pipeline. Relevant reference answers still ground technical understanding. Legacy API behavior remains covered for compatibility callers.
- The report gauges match the landing dials: Clarity averages relevance/completeness; Confidence uses observed recording delivery, never inferred feelings; Knowledgeability averages technical content only. Behavioral answers never contribute to technical ratings. Missing evidence remains unscored.
- PDF export is lazy-loaded, generated locally with embedded Noto Sans fonts, paginated headers/footers, pressure gauges, transcripts, bold feedback, rubric evidence and reference approaches. Available synthesis, replay notes and drills are included. Recordings are separate downloads; no media URLs or raw media are embedded.
- Gearwell loops Relax throughout an active interview, including speech and thinking events. Mouth movement remains connected to ElevenLabs playback. Animation selection is confined to the landing preview. Rotating gears appear in the room and page margins; sparse blue coil sparks respect reduced motion.
- Cadence replaces the masthead/title/report brand. Settings use bounded border-box fields and shrinkable grid columns. Headings are larger.

## Evidence

- Required suite: 157 tests passed, including bounded grading concurrency, cancellation, local/skipped exclusions, saved-media preservation, content-only provider contracts, rating exclusions, and multipage PDF text/margin checks. `pnpm exec tsc --noEmit` and `pnpm build` also passed from `web/`; the temporary QA route was removed before the production build.
- Browser: landing settings checked at 320, 390, 560, 768, 950, 1440 and 1920 px; no horizontal page or field overflow. Report checked at 320, 390, 768 and 1440 px with all three gauges present and no horizontal overflow.
- Controlled fictional interview: ledger showed plan/interviewer requests only between answers. Finishing retained the partial final response, started two grade requests and displayed the mechanical grading screen; completed reviews opened the report and session synthesis.
- Relax was observed across readiness, listening and question transitions. Animation controls disappear inside the room. No new physical-camera or real-person delivery validation is claimed.
- Live fictional technical answer: HTTP 200, `answer_grade` only, high thinking, `gemini-3.5-flash-lite`, 6,691 ms provider latency, 1,716 reported thought tokens; factual score null. This is one observed call, not a timing guarantee.
- Actual browser PDF download rendered and all four pages inspected. Separate long-answer test confirms the final transcript sentinel, supported math notation and page margins survive pagination.
- Local evidence (ignored): `outputs/review-qa/`, `outputs/review-tests.txt`, `outputs/review-types.txt`, `outputs/review-build.txt`; sample PDF in `output/pdf/`. QA fixture uses mocked Gemini classifications and fictional answers; its sample scores are not live model evaluation evidence.

## Remaining timing and limits

Transcription finalization, an adaptive-question call and optional ElevenLabs generation/playback still run between turns. Removing grading contention reduces that path but cannot eliminate those waits. Final grading remains high reasoning and may retry transient provider failures. Recordings and answers remain in tab memory; closing or refreshing the tab clears them. Download before leaving. Current unpaid-provider consent restrictions remain unchanged. No hosted deployment or merge to main is implied.
