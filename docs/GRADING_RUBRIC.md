# Cadence content and accuracy rubric

## Version 3 behavioral scoring and evidence

Use `behavioralCriteria` for every behavioral answer: answers the question 25%, motivation/reflection 30%, personal examples/contribution 25%, requested coverage 20%. Introductions assess only requested motivation, background and skills. They require no technical tests, assumptions, verification, baselines or failure boundaries. Other behavioral questions assess the situation/actions/reflection actually asked. These answers are excluded from technical content and factual accuracy (null, never zero).

Every criterion has an exact contiguous quote (at most 400 characters), a justification (at most 1,000), and a concrete improvement (at most 800, required below level 4). A level 3–4 without literal evidence fails closed. Gemini grading uses high thinking and an 8,192-token output allowance, with deliberate evidence/anchor consistency checks and concise justifications. See [Google's thinking documentation](https://ai.google.dev/gemini-api/docs/thinking).

The server constructs report prose from those same scored criteria; free-form praise cannot override weak grades. Major gaps outrank minor refinements; overlapping evidence spans and repeated previous advice are deduplicated. Full criteria remain inspectable. Local fallback uses conservative category-specific text cues, labeled as a heuristic.

Only technical answers may receive a probe. Introductions and behavioral answers move to an independent new topic or finish; mixed sessions transition from behavior to technical. No prior-answer quote accompanies that transition. Both client and server enforce this.

Answer headers show content alone; technical and behavioral averages are separate. Clip reasons quote matching speech evidence and explain a strength or concrete correction. Without a matching graded span, a labeled local excerpt heuristic supplies the rationale. Delivery does not inflate clip content rankings. Session overall can include behavioral content, technical content, delivery and checked technical accuracy.


Runtime version: **cadence-content-v3**. The executable source of truth is
[content-rubric.mjs](../web/lib/content-rubric.mjs); the grading agent is
[GEMINI.md](../web/agents/GEMINI.md) with its
[runtime instructions](../web/agents/interview-grader.mjs).

Every grading call embeds the full rubric in system instructions. Responses must
return this version, all four criterion levels, exact answer evidence and reasons.
The server rejects missing/stale versions, duplicate criteria, out-of-range levels
and fabricated quotes, then computes scores itself. This applies to conversational
and individual feedback, Gemini and OpenAI, including provider retries. Gemini
does not need filesystem access or a separate retrieval tool.

## Content quality

Each criterion is rated 0–4 against these anchors in order; weighted total is
round(sum(level / 4 * weight)). A number invented by the model is not accepted.

| Criterion | Weight | Anchors: 0 / 1 / 2 / 3 / 4 |
| --- | --- | --- |
| Answers the question | 25% | Off topic or no answer / Touches the topic but avoids the request / Answers part of the request / Directly answers with a small omission / Direct, focused answer to every requested part |
| Reasoning and judgment | 30% | No usable reasoning or fundamentally flawed approach / Asserts an approach without explaining why / Some reasoning; important assumptions or tradeoffs missing / Coherent explanation with a minor gap / Defensible reasoning, assumptions, checks and relevant tradeoffs |
| Specific support | 25% | No concrete support / Vague claims, jargon or unsupported impressive numbers / Specific action but ownership, baseline or verification unclear / Clear personal action or worked example with some verification / Precise example, ownership and a credible verification method; anecdote still unverified |
| Completeness and precision | 20% | Essential steps missing / Large gaps prevent a usable answer / Usable outline with important missing details / Mostly complete, one concrete improvement remains / Concise, complete steps, boundaries and outcome appropriate to the question |

High scores require literal evidence. Impressive figures, confident delivery and
length do not establish a good answer. A personal example can show an explanation
without proving the claimed achievement. An off-topic relevance level of 0 caps
content at 20. A referenced major factual error caps content at 59; a critical
error caps it at 25. The report shows the criterion rationale and any applied cap.

## Factual accuracy

Only exact answer claims checked against supplied reference passages or server
calculations contribute. Supported = 1, partially supported = 0.5, contradicted = 0.
Severity weights: minor 1, major 2, critical 3. Accuracy is the weighted fraction
scaled to 100. A major contradiction caps the result at 59; a critical contradiction
caps it at 25, even if many minor details are supported.

Each model check needs an exact transcript quote, a known reference ID, a literal
reference excerpt, an explanation and severity. Invalid citations are excluded.
Duplicate/overlapping quotes for the same referenced claim cannot multiply credit.
Unverified claims do not count as false or correct; no checked claims means null.
The report explicitly states how many claims were checked. A 100 on one claim
is not proof that the whole answer is correct.

Local constrained cash calculations override model classifications and prose.
The built-in reference pack remains small: cash change, US McDonald's allergen
guidance, Python sequence mutability and scikit-learn leakage guidance. There is
no live fact search. Personal achievements and out-of-pack facts stay unverified.
The rubric makes the grading procedure consistent and auditable; AI semantic
judgments remain provisional and are not universal fact verification.

## Feedback and interviewing

Name the most consequential answer-specific gap, why it matters and one concrete
revision. Allow at most two earned strengths and three distinct improvements;
empty strengths are valid. Avoid generic praise, repeated advice and personality
judgments. Use short **bold** phrases; render them as safe text with emphasis.
Previous feedback is bounded and supplied with recent turns so recurring issues
can be addressed with new evidence rather than repeated boilerplate.

Conversation setup creates one opener. Each later AI question is generated after
the latest answer from the role, approved topics, focus/level, progress and up to
four previous turns. A next question either probes a specific gap, transitions
naturally or finishes the interview. Optional highlighted lines must be exact
short quotations from the latest answer; fabricated quotes and repeated questions
are rejected. Local fallback is labeled and keeps the recording.

Local personal/practice feedback remains a labeled lexical heuristic. The strict
AI rubric is applied only on consented AI grading calls. Unpaid Gemini still
requires fictional, non-sensitive answer text; resumes and media are not forwarded.
