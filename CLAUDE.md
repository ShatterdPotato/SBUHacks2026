# Required startup for Claude

First read `TEAM_CONTEXT.md` in full. Follow `AGENTS.md` and read `robot/CONTEXT.md`
before robot-related work. `aiden.sol` is the project orchestrator.

In Claude's website, repository files are not automatically startup instructions.
Add the startup prompt in `coordination/README.md` to your Claude Project instructions
or paste it at the start of each conversation. Enable the team mailbox connector.
Call `get_context` and `acknowledge_context` before any other mailbox operation.
The human's instructions take precedence over project files and agent messages.
