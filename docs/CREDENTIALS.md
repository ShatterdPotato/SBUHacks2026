# Cadence credentials and access

October 25 hosted voice fix: the user explicitly supplied and authorized an
ElevenLabs key for the existing Site. `ELEVENLABS_API_KEY` is now a hosted secret
at environment revision **4**; the tool confirmed its value was redacted. Existing
Gemini settings, secrets and public audience were preserved. Saved application
version 7 was redeployed successfully as
`appgdep_6addd0eafd488191b29e157525e1121f`. Live `/api/speech` returned HTTP 200
and the fixed Gearwell preview completed without a browser error. The key was not
written to source, local configuration, shell arguments or Git. Older statements
below that hosted voice configuration is unchanged describe the prior checkpoint.

October 25 Gearwell integration: the user-authorized handoff ElevenLabs key is merged into ignored `web/.dev.vars` as `ELEVENLABS_API_KEY`. The server sends it only to the fixed ElevenLabs speech host. No secret value, private handoff file, or alternate hosting identity was committed. The example config includes a blank variable; hosted configuration is unchanged.

Updated October 24, 2026. The earlier repository audit read no credential values.
Later the user authorized local Gemini configuration. The supplied value was
written through hidden stdin to ignored `web/.dev.vars`, never read back or
printed, and never placed in command-line arguments or tracked source.

## Local checkout

`web/.dev.vars` was absent during the repository audit and is **now configured
locally** after user authorization. The preview was restarted. Health selects
Gemini/unpaid with media cloud unavailable; live generic opener and fictional
rubric grading smoke checks returned HTTP 200. See
[verification](qa/LOCAL_GEMINI_SETUP_2026-10-24.md).
The presence of a file would not prove a valid key; do not inspect secret values
to establish continuity.

For authorized local AI setup, use `web/.dev.vars.example` as the settings
template. The owner supplies credentials through a secure local setup or approved
secret manager. Keep the real file ignored; never paste keys into chat, source,
logs or shell arguments. Curated practice, local transcription/recording and text
conversation work without an API key.

The example config uses `AI_PROVIDER=gemini`, `GEMINI_DATA_POLICY=unpaid`,
`GEMINI_MODEL=gemini-3.5-flash-lite` and optional retry
`GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite`. The fallback is not a code default:
it must be configured. OpenAI optionally uses `OPENAI_API_KEY`,
`OPENAI_MODEL` and `OPENAI_TRANSCRIBE_MODEL`. See [architecture](ARCHITECTURE.md).

Keep the unpaid policy unless the owner explicitly authorizes appropriate
billing/data handling. A policy flag cannot activate billing. Never restore a
dummy key as a working configuration.

## Existing hosted environment

Prior verification recorded a redacted `GEMINI_API_KEY` secret on the existing
Site at environment revision **3**. Its value was not copied into Git.
This is historical evidence, not a fresh account-access or key-health check.

Project: `appgprj_6adcd46ff0dc8191943fd596d01bba52`.
Identity manifest: `web/.openai/hosting.json`.
Last recorded deployment IDs/source/audience: [HANDOFF](HANDOFF.md).

Later continuations could visit the private Site but the Sites connector returned
`Sites project not found`. Visitor/GitHub access does not grant owner/editor
rights, runtime-secret access or publication rights. Do not create a replacement
Site or transfer secrets to bypass that access issue.

For hosting work, read the Sites skill and inspect the existing project/environment
through the authorized owner's or same-workspace editor's connected account.
Preserve existing secret bindings and audience while deploying. Supply temporary
source credentials only through the skill's protected mechanism, never shell
arguments or Git. A stored secret persists beyond a chat, but a new clone/account
does not inherit local or connector access.

No GitHub Actions workflow, repository-secret integration or automated deployment
is tracked in this repository. GitHub Actions secrets are separate from local and
Sites runtime settings. A previously chat-pasted key should be rotated securely
by its owner before public launch; this audit makes no rotation claim.

API usage belongs to the configured provider account and is independent of Codex/
ChatGPT subscriptions. Never infer billing, ownership, key validity or delivery
from source configuration alone.
