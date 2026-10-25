import { bankEntry, bankReference } from './technical-bank.mjs';
import { checkAnswer } from './verified-exercises.mjs';
import { CONTENT_RUBRIC, distinctFeedback } from './content-rubric.mjs';
// Small, versioned reference pack. Coverage is explicit; no web search or proof
// of personal anecdotes is implied by the free provider's model response.
export function referencesFor(question) {
    const value = question.toLowerCase();
    const refs = [];
    const amounts = [...question.matchAll(/\$\s*(\d+(?:\.\d{1,2})?)/g)].map(m => Math.round(Number(m[1]) * 100));
    if (/change|cash|pay|tender/i.test(value) && amounts.length === 2 && amounts[1] >= amounts[0]) refs.push({ id: 'change', title: 'Computed change (integer cents)', text: `${(amounts[1]/100).toFixed(2)} minus ${(amounts[0]/100).toFixed(2)} equals ${((amounts[1]-amounts[0])/100).toFixed(2)}.`, url: '', expected: (amounts[1]-amounts[0])/100 });
    if (/allerg|gluten/.test(value)) refs.push({ id: 'allergens', title: 'McDonald’s US allergen FAQ', text: 'Shared cooking and preparation areas, equipment and utensils can cause contact with other food products including gluten. Do not promise food is free of allergens. Consult current ingredient information; policies differ by location.', url: 'https://www.mcdonalds.com/us/en-us/faq/does-mcdonald-s-have-a-gluten-free-list-of-menu-items.html' });
    if (/python|tuple|list\b/.test(value)) refs.push({ id: 'python-sequences', title: 'Python: data structures', text: 'Lists are mutable. Tuples are immutable sequences, but may contain mutable objects. Individual tuple items cannot be reassigned.', url: 'https://docs.python.org/3/tutorial/datastructures.html#tuples-and-sequences' });
    if (/leakage|train|test set|preprocess|model evaluation/.test(value)) refs.push({ id: 'data-leakage', title: 'scikit-learn: common pitfalls', text: 'Keep test data separate. Fit preprocessing and feature selection on training data only, then transform the test set. Pipelines help prevent data leakage. Test information used for training or selection can inflate evaluation results.', url: 'https://scikit-learn.org/stable/common_pitfalls.html#data-leakage' });
    return refs;
}
export function localKnowledge(question, answer) {
    const questionObject = typeof question === 'string' ? {prompt:question} : question;
    const references = [...referencesFor(questionObject.prompt??''), ...bankReference(questionObject)];
    const checks = questionObject.isFollowup ? [] : checkAnswer(bankEntry(questionObject.bankId),answer);
    const change = references.find(r => r.id === 'change');
    if (change) {
        const values = [...answer.matchAll(/(?:\$\s*)?\b(\d+(?:\.\d{1,2})?)\b/g)].map(m => ({ value: Number(m[1]), quote: m[0] }));
        // A single numerical answer is checkable; multiple unrelated quantities
        // are left for semantic review rather than selecting an arbitrary number.
        if (values.length === 1 && !/\b(not|wrong|incorrect|instead|isn't)\b/i.test(answer)) checks.push({ quote: values[0].quote, status: Math.abs(values[0].value-change.expected)<.001 ? 'supported' : 'contradicted', explanation: change.text, referenceId: change.id, referenceExcerpt: change.text, severity: 'critical' });
    }
    const knowledge = { checks, references, coverage: checks.length ? 'Limited reference check; other claims remain unverified.' : 'No checkable claim found in the available reference pack. Personal stories and claimed results are unverified.' };
    return knowledge;
}
export function knowledgeScore(knowledge) {
    const checked = knowledge.checks.filter(c => c.status !== 'unverified');
    if (!checked.length) return null;
    const rubric = CONTENT_RUBRIC.accuracy;
    const weight = c => rubric.severityWeights[c.severity] ?? rubric.severityWeights.major;
    const score = Math.round(100 * checked.reduce((n,c) => n + (rubric[c.status] ?? 0) * weight(c), 0) / checked.reduce((n,c) => n + weight(c), 0));
    if (checked.some(c => c.status === 'contradicted' && c.severity === 'critical')) return Math.min(score, rubric.criticalErrorCap);
    if (checked.some(c => c.status === 'contradicted' && c.severity !== 'minor')) return Math.min(score, rubric.majorErrorCap);
    return score;
}
export function reviewKnowledge(question, answer, modelChecks = []) {
    const baseline = localKnowledge(question, answer);
    const references = [...baseline.references, ...referencesFor(answer)].filter((r,i,all) => all.findIndex(v => v.id === r.id) === i);
    const checks = [...baseline.checks];
    for (const c of modelChecks) {
        if (!c || typeof c.quote !== 'string' || !c.quote.trim() || c.quote.length > 400 || !answer.includes(c.quote) || !['supported','partially_supported','contradicted','unverified'].includes(c.status) || typeof c.explanation !== 'string' || !c.explanation.trim() || c.explanation.length > 1500) continue;
        const reference = references.find(r => r.id === c.referenceId);
        if (c.status !== 'unverified' && (!reference || typeof c.referenceExcerpt !== 'string' || !c.referenceExcerpt.trim() || !reference.text.includes(c.referenceExcerpt) || !['minor','major','critical'].includes(c.severity))) continue;
        // Calculations and repeated/overlapping claim quotes cannot be outvoted.
        if (baseline.checks.some(d => d.referenceId === c.referenceId) || checks.some(d => d.referenceId === c.referenceId && (d.quote.includes(c.quote) || c.quote.includes(d.quote)))) continue;
        checks.push({ quote:c.quote, status:c.status, explanation:c.explanation, referenceId:reference?.id ?? '', referenceExcerpt:c.status === 'unverified' ? '' : c.referenceExcerpt, severity:['change','allergens'].includes(reference?.id) ? 'critical' : c.severity ?? 'major' });
    }
    const checked = checks.filter(c => c.status !== 'unverified').length;
    return { references, checks, rubricVersion:CONTENT_RUBRIC.version, coverage:`${checked} referenced claim${checked === 1 ? '' : 's'} checked with the accuracy rubric. This is coverage of checked claims, not the whole answer. Other claims and personal stories remain unverified. AI classifications may be wrong; no live web search.` };
}
export function withKnowledge(analysis, knowledge) {
    const errors=knowledge.checks.filter(c=>c.status==='contradicted');
    const cap = errors.some(c=>c.severity==='critical') ? CONTENT_RUBRIC.accuracy.criticalErrorCap : errors.some(c=>c.severity!=='minor') ? CONTENT_RUBRIC.accuracy.majorErrorCap : 100;
    return { ...analysis, knowledge,
        ...(errors.length?{summary:`**Factual error:** “${errors[0].quote}” needs correction against the supplied reference.`,strengths:analysis.strengths.filter(s=>!/\b(correct|accurate|accuracy)\b/i.test(s)),improvements:distinctFeedback([...errors.map(c=>`**Correct this claim:** ${c.explanation}`),...analysis.improvements])}:{}),
        scores: { ...analysis.scores, content:analysis.scores.content == null ? null : Math.min(analysis.scores.content,cap), comprehension: knowledgeScore(knowledge) }, limitation: `${analysis.limitation} Knowledge is scored only for claims checked against supplied references; unsupported personal stories are not certified.` };
}
