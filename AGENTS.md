# Agent startup

Read `TEAM_CONTEXT.md` before planning, project answers, or edits. Read
`docs/HANDOFF.md` for the latest stopping point and next steps. The project is
**Cadence**, an AI interview practice service. XTrain and the rover mailbox are
retired by the human. Orchestrator: **aiden.sol**.

Use `docs/REPOSITORY_AUDIT.md` for the repository map, verification provenance
and known gaps; `docs/FEATURE_STATUS.md` for current source capabilities.
Read `docs/ARCHITECTURE.md` for API/media work and `docs/DEMO.md` for verification.
Coordinate shared contracts; preserve teammate work. Use the manual handoff when
no mailbox is connected. Never invent delivery receipts.

The default studio is conversational, with local English transcription and
optional continuous recording. Individual answer practice remains available. For question/grading changes, read
`web/agents/GEMINI.md` and `docs/GRADING_RUBRIC.md`; preserve mandatory per-request
rubric injection, version/evidence validation and server-computed grades.
Distinguish implemented source, dated QA evidence and the last recorded hosted
deployment. Historical QA ledgers should retain their original observations.

Keep keys server-side and personal data out of Git. Require explicit media/cloud
consent, including the separate conversational AI opt-in. Preserve unpaid Gemini
restrictions and the existing Site identity/audience. Do not read or print secret
files. Describe observable delivery cues; do not identify faces or infer feelings,
personality, protected traits, or hiring fitness. Label heuristic results.

Run `pnpm test`, `pnpm exec tsc --noEmit`, and the production build from `web/`
for application changes. Use the pinned pnpm lockfile and package scripts so
generated PDF, vision and speech-worker assets are prepared. Restart dev after
speech-worker source changes. Update the relevant context and handoff with actual
check results and limitations; never infer live AI or physical-device success
from mocked tests.
