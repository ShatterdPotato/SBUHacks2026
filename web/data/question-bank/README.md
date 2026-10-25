# Cadence technical question bank

Four tracks are stored as versioned JSON: AI/ML, software, hardware engineering
and digital logic: **112 questions per track, 448 total** (104 AI-reviewed plus
eight executable exercises per track). The runtime also adds independently executable exercises from
`../../lib/verified-exercises.mjs`. `manifest.json` records validated counts.

These are newly authored questions informed by the online curriculum and
documentation references in `sources.json`. No third-party exercise collection
was bulk copied. Source titles/URLs are attribution and further reading, not a
claim that those authors endorse Cadence or wrote these answer keys. No license
to redistribute HDLBits exercises is assumed.

Each item has a stable ID, track, competency, level, prompt, worked answer key,
essential facts, acceptable alternatives, partial-credit anchors, misconceptions,
conditional probes, source IDs, version and review provenance. Generated items
received separate high-thinking author and critic calls. Their status is
**ai-reviewed**, not human expert certified. The smaller **executable-verified**
set has reference calculations or bounded logic/algorithm simulation; this
verifies the stated factual result, not every sentence of a candidate's answer.

Runtime sampling uses cryptographic randomness, topic diversity and difficulty
eligibility. Recent bank IDs are avoided for the browser session. Conversation
introductions and probes are excluded from the main-topic coverage quota. Mixed
sessions contain ceil(N/2) technical topics and floor(N/2) behavioral topics in
random order. Answer keys are resolved server-side by ID; a model cannot attach
an unrelated task to a key. The local fallback can also retrieve the bank.

## Maintenance

From `web/`, run `node scripts/author-question-bank.mjs` to resume offline
authoring with a configured server key. This invokes Gemini and consumes quota;
it is not an HTTP endpoint or a browser action. Intermediate batches are ignored.
The authoring script never prints credentials. Run
`node scripts/verify-question-bank.mjs` and the application tests before release.
Do not promote edited keys without reviewing assumptions, units, alternatives
and provenance. Use human domain review before claiming expert verification.

`node scripts/evaluate-graders.mjs` compares two configurable models on a separate
fixed factual holdout. These eight cases are not a comprehensive expert-scored
rubric benchmark. Results live in `../../evaluations/grader-benchmark.json`.
