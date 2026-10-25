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
    const references = referencesFor(question);
    const checks = [];
    const change = references.find(r => r.id === 'change');
    if (change) {
        const values = [...answer.matchAll(/(?:\$\s*)?\b(\d+(?:\.\d{1,2})?)\b/g)].map(m => ({ value: Number(m[1]), quote: m[0] }));
        // A single numerical answer is checkable; multiple unrelated quantities
        // are left for semantic review rather than selecting an arbitrary number.
        if (values.length === 1 && !/\b(not|wrong|incorrect|instead|isn't)\b/i.test(answer)) checks.push({ quote: values[0].quote, status: Math.abs(values[0].value-change.expected)<.001 ? 'supported' : 'contradicted', explanation: change.text, referenceId: change.id });
    }
    const knowledge = { checks, references, coverage: checks.length ? 'Limited reference check; other claims remain unverified.' : 'No checkable claim found in the available reference pack. Personal stories and claimed results are unverified.' };
    return knowledge;
}
export function knowledgeScore(knowledge) {
    const checked = knowledge.checks.filter(c => c.status !== 'unverified');
    return checked.length ? Math.round(100 * checked.filter(c => c.status === 'supported').length / checked.length) : null;
}
export function withKnowledge(analysis, knowledge) {
    const errors=knowledge.checks.filter(c=>c.status==='contradicted');
    return { ...analysis, knowledge,
        ...(errors.length?{summary:`Reference review found a factual error: ${errors.slice(0,2).map(c=>c.explanation).join(' ')}`,strengths:analysis.strengths.filter(s=>!/\b(correct|accurate|accuracy)\b/i.test(s)),improvements:[...errors.map(c=>c.explanation),...analysis.improvements].slice(0,8)}:{}),
        scores: { ...analysis.scores, comprehension: knowledgeScore(knowledge) }, limitation: `${analysis.limitation} Knowledge is scored only for claims checked against supplied references; unsupported personal stories are not certified.` };
}
