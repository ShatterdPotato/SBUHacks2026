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

1. Set `OPENAI_API_KEY` in ignored `web/.dev.vars` or Sites runtime secrets;
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
evidence, clip ranking, mocked provider schemas/errors, and audio transcription.
`pnpm exec tsc --noEmit` checks types; `pnpm build` checks production bundling.
Browser QA should include narrow/mobile layout, uploads, help dialog, text flow,
report details, and console errors. Native camera/microphone and paid provider
calls must be recorded separately from mocked verification. Do not report them
as verified merely because browser navigation or unit tests passed.
