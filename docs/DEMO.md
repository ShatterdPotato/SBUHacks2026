# Demo and verification

## Fast demo without credentials

1. Run `pnpm dev` in `web/`, then open localhost:5173 in Chrome or Edge.
2. Enter a role such as Machine Learning Intern. Add a short project description.
   Set three questions and generate. Confirm the UI says Practice mode.
3. Choose text answers. Answer each question, then save. Try one detailed answer,
   one vague answer, and one skipped answer. Confirm the skipped answer is unscored.
4. Inspect the report. Delivery is unavailable for text-only answers, and no
   fabricated recordings appear. Download the JSON report and inspect its content.
5. Start fresh. Enable media only after checking consent; verify the permission
   prompt, live preview, mic meter, recording start/stop, replay, and retake.
6. In practice mode, manually enter the matching transcript for each recording.
   Record at least two answers, submit, and replay/download best and worst clips.
   Verify the files are playable and camera/microphone indicators turn off.

## Live AI demo

### Free Gemini personal resume practice

1. Open Use your resume with My real experience selected. Upload a PDF or TXT.
   The provided fictional AI/ML PDF is also valid in this mode. Confirm the
   success character count, open Review extracted resume text, and inspect it.
2. Enable skill-based AI questions. Review the broad role and fixed topic tags;
   exclude one. Confirm the personal question request contains only that generic
   profile, interview settings, consent, and privacyMode. No original source.
3. Generate questions and enter a personal answer. Feedback must say browser
   practice rubric; no answer API request is made. Skip an answer and verify it
   remains unscored. Local clips remain optional and downloadable.
4. With AI off, retrieval and feedback still work in the browser. Try a malformed
   or scanned PDF and confirm an actionable error, with no cloud upload.

### Free Gemini fictional demo

1. Set `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.5-flash-lite`,
   and `GEMINI_DATA_POLICY=unpaid` in ignored `.dev.vars` or Sites secrets. Redeploy.
2. Select A fictional sample. Upload the provided fictional AI/ML PDF or describe
   a pretend project. Choose three questions and consent to Google processing.
3. Generate real AI questions, choose text answers, and submit a fictional answer.
   Confirm provisional feedback and exact transcript evidence. Skip another answer
   and verify it remains unscored. Finish and inspect the report.
4. Confirm audio transcription and camera-cloud controls are unavailable. PDF
   uploads must extract text locally, without forwarding the original document.
   Disable cloud consent and confirm browser-only practice still works. Never
   use personal content in fictional mode.
5. Check quotas/errors without pretending failures are successful AI feedback.

### Media-capable provider

1. Set `AI_PROVIDER=openai` and `OPENAI_API_KEY` in ignored `web/.dev.vars` or Sites runtime secrets;
   restart/redeploy. Verify cloud personalization is available.
2. Opt into cloud processing, upload a non-sensitive PDF/TXT resume or prompt,
   and confirm questions reference actual experience. Declining cloud processing
   must still allow text/curated practice.
3. Record and stop. Confirm actual transcription, edit mistakes, and submit.
4. Opt into camera observations for one answer only. Check actual framing/posture
   observations, uncertainty, and no inferred identity or feelings. No visual score.
5. Confirm per-answer feedback evidence is present in the transcript. Download
   videos and report. Simulate provider failure and ensure recordings survive retry.

## Regression checks

`pnpm test` covers retrieval for all sizes/types, validation, consent, missing
evidence, clip ranking, both provider schemas/errors, Gemini data-policy blocking,
header authentication, and mocked audio transcription/inline media adapters.
`pnpm exec tsc --noEmit` checks types; `pnpm build` checks production bundling.
Browser QA should include narrow/mobile layout, uploads, help dialog, text flow,
report details, and console errors. Native camera/microphone and paid provider
calls must be recorded separately from mocked verification. Do not report them
as verified merely because browser navigation or unit tests passed.

## Verification recorded 2026-10-24

- All 23 tests, `pnpm exec tsc --noEmit`, and the production build passed.
- Real `gemini-3.5-flash-lite` requests returned HTTP 200 for three generated
  questions and scored feedback using fictional, nonpersonal text.
- Local browser QA completed a text session/report with AI disabled, confirmed
  skipped answers stayed unscored, and found no console warnings/errors.
- Hosted consent UI required the fictional-data checkbox before generation.
- Paid media adapters are mocked only. Physical camera/microphone capture and
  live cloud transcription/camera analysis were not tested in this change.

Personal-resume update: all 31 tests and TypeScript pass. The exact provided
AI/ML resume PDF was accepted in browser QA and yielded 4,198 editable characters,
including its name and Python skills. PDF.js worker/font/CMap assets are served
from the same origin, copied from the installed package by `run-cadence.mjs`.

Latest audit: 44 tests, type check, and production build passed. Hosted personal
and fictional PDF question generation passed on deployed source add43d044.
The interrupted fictional answer feedback/report/export check was completed in
the continuation: live AI feedback and exact evidence, unscored skipped answers,
and the actual downloaded JSON passed validation. All 44 tests, TypeScript, and
production build were rerun successfully. See
[continuation evidence](qa/CONTINUATION_VERIFICATION_2026-10-24.md) and
[the detailed manual audit](qa/RESUME_BROWSER_AUDIT_2026-10-24.md).
