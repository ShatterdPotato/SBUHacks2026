# Claude startup

Read `TEAM_CONTEXT.md`, then `docs/HANDOFF.md` and `AGENTS.md` before planning
or editing. The project is **Cadence**, a voluntary interview practice service
coordinated by `aiden.sol`. XTrain, hardware roles and the rover mailbox are retired.

Use `docs/REPOSITORY_AUDIT.md` for the repository map and known gaps,
`docs/FEATURE_STATUS.md` for source capabilities, `docs/ARCHITECTURE.md` for
API/media contracts, and `docs/DEMO.md` for verification. For question/grading changes also read
`web/agents/GEMINI.md` and `docs/GRADING_RUBRIC.md`; AI grades must receive and
validate the current rubric on every request. Historical QA records
are dated evidence; they do not establish the current deployment or device quality.

The current default is a conversational studio with local English transcription,
optional continuous recording and reference-limited knowledge checks. Individual
answer practice remains available. Preserve media/provider consent, server-only
keys, unpaid Gemini restrictions and teammate work. Never read or print secrets.

Claude web needs current GitHub context explicitly attached. Follow AGENTS.md
for required checks and use the manual handoff when no mailbox is connected;
never invent message delivery, deployment, secret access or verification receipts.
