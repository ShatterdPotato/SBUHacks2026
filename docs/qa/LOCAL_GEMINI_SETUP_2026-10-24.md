# Local Gemini configuration verification

October 24, 2026, America/New_York. The user explicitly authorized configuring
the supplied provider key for the local Cadence preview. No key value, prefix,
hash or other credential material is recorded here.

- Confirmed `web/.dev.vars` is ignored by Git, then created it through hidden
  stdin. No credential in shell arguments, tracked files or command output;
  the file was not read back. Existing files would have been preserved.
- Set `AI_PROVIDER=gemini`, `GEMINI_DATA_POLICY=unpaid`, existing primary model
  `gemini-3.5-flash-lite` and configured retry model `gemini-3.1-flash-lite`.
  No billing or hosted environment change.
- Restarted the local preview. Health selected Gemini, cloud available, unpaid
  data-only policy and media cloud unavailable. Health alone is not key validation.
- A real `/api/questions` call with an approved generic cashier/skill profile
  and conversation format returned HTTP 200, live mode and one generated opener.
- A real `/api/interview-turn` call using explicitly fictional cash-change text
  returned HTTP 200, live mode, rubric `cadence-content-v2`, a next question,
  factual accuracy 0 and content capped at 25 for the incorrect amount.

These two live smoke checks establish local credential/model/structured-grading
acceptance for those requests, not general AI accuracy or future quota availability.
No personal resume, real interview answer, original media or physical device was
used. No application source/dependency changes were needed. Prior 80-test/type/
build verification remains the application baseline.

Preview remains available at `http://127.0.0.1:5173/`; refresh the existing page
to load the new provider settings. Hosted publication/access is unchanged.
Because the credential was shared in chat, its owner should rotate it securely
before public launch; no rotation is claimed.
