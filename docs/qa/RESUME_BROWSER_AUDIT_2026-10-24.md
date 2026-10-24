# Cadence resume and interview browser audit

Date: October 24, 2026. Production: https://cadence-interview-studio-aiden.daintyridge32.chatgpt.site

## Result and evidence

The updated production site accepted the supplied fictional PDF (4,198 characters)
and generated live questions. A personal-mode session generated four AI skill
questions; a separate fictional-mode session generated three questions referencing
the fictional resume. The final fictional answer/feedback check was interrupted
before an answer was submitted. It remains a next step, not a passed check.

The user's intermittent production transport failure was not reproduced in two
earlier live generation checks. The local audit preview deliberately used a dummy
key, so its immediate provider rejection was expected. That local key file has
been removed and the audit server stopped. Local live AI needs its own securely
configured key; no key is required for curated practice.

## Manual coverage

The requested subagent performed **125 distinct manual browser scenarios**:
118 PASS, four FAIL, three qualified LIMITATION. These are distinct checks, not
125 independent testing methodologies. The complete actions, expectations, and
observations are in [the baseline ledger](resume-audit-2026-10-24/baseline.md)
and its [JSON](resume-audit-2026-10-24/baseline-cases.json).

Coverage includes forms and boundaries, navigation, literal script-looking text,
consent, active sources, skill previews, keyboard/native length limits, dialog
accessibility, transcripts, missing evidence, reports, exports, state retention,
TXT formats, and recovery. The parent additionally performed
[16 PDF/text/source checks](resume-audit-2026-10-24/pdf-cases.json), including exact
2 MiB and ten-page boundaries, oversized, encrypted, corrupt, scanned, empty,
uppercase-extension, UTF-16, and binary files.

All **14 executed post-fix subagent retests passed**. Two further child retests
were blocked by its unavailable browser surface; the parent manually completed
both on production: an empty role plus Software engineering job context overrode
an ML-heavy resume, and reselecting the active source retained checked consent.
The blocked child entries remain in the ledger for provenance.

## Confirmed bugs and fixes

| Finding | Reproduction/evidence | Fix and verification |
| --- | --- | --- |
| Hidden resume affected prompt-only interviews and retained consent | E112: switch to Describe interview, enter circuits; 24 hidden ML tags remained and consent stayed checked | Only the active resume contributes context/tags; switching sources resets consent. RT09/RT10 PASS. |
| Resume background overrode the requested target role | P14: Software Engineering Intern with ML-heavy resume yielded AI/ML | Explicit role takes priority, then recognizable context role. RT08 and parent context-priority check PASS. |
| Binary TXT falsely marked readable | P16: binary file accepted with 116 control characters and replacement text | Reject invalid control/replacement characters with export guidance; keep previous valid upload. RT11 PASS. |
| Whitespace role rendered/exported blank | E095: three spaces as role | Trim role and use detected/general fallback consistently. RT02/RT06 PASS. |
| Editor and report disagreed on word count | E110: five spaced CJK tokens counted as five in editor, zero in report; emoji also differed | Shared Unicode-aware counter. RT03/RT04 PASS. This does not establish semantic correctness in every language. |
| Help dialog lacked accessible name | E036 | Heading reference added. RT01 PASS. |
| Singular grammar | One word/character displayed plural | Consistent singular/plural labels. RT05/RT07 PASS. |
| Provider failure diagnosis/recovery was insufficient | Dummy-key rejection produced generic failure; input recovery needed clearer action | Safe error categories distinguish key, model, quota, settings, outage, transport; explicit Use curated questions retains resume. RT12–RT14 PASS. |

## Reliability changes and nonfindings

Provider transport failures and HTTP 408/500/502/503/504 receive at most one
retry within a total 60-second deadline. Primary Gemini model is
`gemini-3.5-flash-lite`; configured second-attempt fallback is
`gemini-3.1-flash-lite`. Credentials, quota, and invalid requests are not retried.
Errors/logs contain fixed safe codes rather than upstream bodies or personal text.
The free/unpaid policy remains enabled; billing was not enabled.

This improves recovery; successful live requests do not prove that intermittent
free-provider outages can never recur. The exact cause of the user's earlier
transport failure was not established.

Encrypted-PDF delay suspicion was ruled out by a timed rejection in 193 ms.
UTF-16 with BOM was readable. A stale upload completion was not reproduced;
the busy guard and disabled file input are defensive hardening, not a claim of
a confirmed stale-state defect. CUA fill could bypass native maxlength, while
actual native typing enforcement passed. Focus wrapping into browser chrome
remains inconclusive.

## Validation and deployment

- 44 automated tests PASS, TypeScript PASS, production build PASS. Automated
  regression tests are separate from the manual scenario count.
- Published source: `add43d0445ad419509d717ca4316eac4b32f0741`.
- Deployment: `appgdep_6add213036888191b0453e9d4e623fb7`, succeeded, environment revision 3.
- Saved version: `appgprj_6adcd46ff0dc8191943fd596d01bba52~appgver_7bc87b31660481919afff74c19aad57f`.
- Audience remains owner-private; credentials were not transferred into Git.

## Remaining verification

Complete one fictional answer through live AI feedback and export on this
deployment. Test physical recording/replay/retake/download/device cleanup with
explicit permission. No physical camera/microphone, paid media adapters, complete
Firefox compatibility, or full screen-reader audit was verified here. Public
launch/domain/indexing, durable accounts/history, adaptive follow-ups, and exact
word-aligned clipping remain outside the implemented feature set. See
[feature inventory](../FEATURE_STATUS.md) and [continuation handoff](../HANDOFF.md).

Only synthetic fixtures were used in committed audit evidence. The ledgers retain
baseline failures as historical observations; post-fix results are separate.
