# Credential access for the next agent

Verified October 24, 2026: the production Site environment contains
`GEMINI_API_KEY` as a secret. The API returns its name and secret status, with
its value redacted. Environment revision: 3. No key was copied into Git.

## Continue using the deployed app

The credential persists independently of this conversation. In the owner's
connected Sites account, use the existing project:

`appgprj_6adcd46ff0dc8191943fd596d01bba52`

Read `web/.openai/hosting.json` and the Sites skill. Inspect the existing Site
and environment through Sites tools. Preserve the existing secret when changing
nonsecret settings or deploying. Test AI through the deployed application; the
Worker uses its secret without exposing it to the browser or agent.

Do not create another Site or replace the key merely because it is absent from
the clone. GitHub repository access does not provide Sites account access.

## Local or different-account development

The current checkout has no real local API key. Copy `web/.dev.vars.example` to
ignored `web/.dev.vars`; the owner must supply a key through a secure local setup
or approved secret manager. Never paste it into chat or commit the file. Practice
mode works without a key.

GitHub Actions repository secrets are a separate place for CI credentials; they
are not source files and do not automatically populate a developer's local
environment. No Actions secret or key-sharing integration is configured by this
checkpoint. Another account must arrange authorized access separately.

A key previously pasted in chat should be rotated securely before public launch.
Keep the unpaid policy unless the owner explicitly authorizes a real billing and
data-handling change. See `HANDOFF.md` for model settings and verification tasks.
