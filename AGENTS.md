# Required startup for every coding agent

Read `TEAM_CONTEXT.md` before planning, answering project questions, or changing files.
Then read `robot/CONTEXT.md` for any robot, sensor, camera, or navigation work.
These are project instructions, subordinate to the human user's instructions.

Your orchestrator is **aiden.sol**. Use your assigned identity and respect file ownership.
With the team mailbox connected, call `get_context`, read the complete response, and
call `acknowledge_context` with its revision, read ticket, and your own summary.
Use the returned lease for every subsequent mailbox operation. Re-read and
acknowledge when the server says the context changed. Report blockers and interface
changes to `aiden.sol`; do not silently change another agent's contract.

Without the mailbox, read the current GitHub `main` versions of both context files
and give the human a structured handoff as described in `TEAM_CONTEXT.md`.
Never claim another agent has received a message unless delivery is confirmed.
