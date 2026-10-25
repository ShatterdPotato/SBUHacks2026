import { InputError } from './interview.mjs';
import { questionKind } from './question-kind.mjs';

export const RUBRIC_VERSION = 'cadence-content-v3';
// This is the runtime source of truth. Grading requests embed this whole rubric.
export const CONTENT_RUBRIC = {
    version: RUBRIC_VERSION,
    relevanceZeroCap: 20,
    criteria: [
        { id: 'relevance', label: 'Answers the question', weight: 25, anchors: ['Off topic or no answer', 'Touches the topic but avoids the request', 'Answers part of the request', 'Directly answers with a small omission', 'Direct, focused answer to every requested part'] },
        { id: 'reasoning', label: 'Reasoning and judgment', weight: 30, anchors: ['No usable reasoning or fundamentally flawed approach', 'Asserts an approach without explaining why', 'Some reasoning; important assumptions or tradeoffs missing', 'Coherent explanation with a minor gap', 'Defensible reasoning, assumptions, checks and relevant tradeoffs'] },
        { id: 'evidence', label: 'Specific support', weight: 25, anchors: ['No concrete support', 'Vague claims, jargon or unsupported impressive numbers', 'Specific action but ownership, baseline or verification unclear', 'Clear personal action or worked example with some verification', 'Precise example, ownership and a credible verification method; anecdote still unverified'] },
        { id: 'completeness', label: 'Completeness and precision', weight: 20, anchors: ['Essential steps missing', 'Large gaps prevent a usable answer', 'Usable outline with important missing details', 'Mostly complete, one concrete improvement remains', 'Concise, complete steps, boundaries and outcome appropriate to the question'] },
    ],
    behavioralCriteria: [
        { id:'relevance', label:'Answers the behavioral question', weight:25, anchors:['Off topic or no answer','Broad topic only','One requested part answered','Direct answer with a small omission','Focused answer to all requested parts'] },
        { id:'reasoning', label:'Motivation and reflection', weight:30, anchors:['No explanation of motivation or choice','Preference or action asserted without explanation','Some explanation but connection to this role or situation is unclear','Clear motivation or thoughtful explanation with a minor gap','Specific, coherent motivation or reflection appropriate to the question'] },
        { id:'evidence', label:'Personal examples and contribution', weight:25, anchors:['No example or relevant detail','Generic self-description or enthusiasm','Specific experience but own contribution or relevant skill is unclear','Concrete relevant personal detail or contribution','Specific experience clearly supports the motivation, skill or action being discussed; personal story remains unverified'] },
        { id:'completeness', label:'Covers the requested points', weight:20, anchors:['No requested points addressed','Most requested points missing','One important requested point missing','Requested points mostly covered','All requested points covered concisely and specifically'] },
    ],
    behavioralRules: 'Use behavioralCriteria for EVERY Behavioral question. Introductions assess motivation, role connection and concrete skills ONLY to the extent requested. Do not demand technical tests, assumptions, baselines, failure boundaries, numerical outcomes or STAR stories in an introduction. Other behavioral questions assess the requested situation, personal action and reflection, not engineering rigor. Behavioral answers never contribute to technical content or technical accuracy scores.',
    accuracy: {
        supported: 1, partially_supported: .5, contradicted: 0,
        severityWeights: { minor: 1, major: 2, critical: 3 },
        criticalErrorCap: 25, majorErrorCap: 59,
        rules: 'Grade only exact claims checked against supplied references. Include a literal referenceExcerpt for every supported, partially_supported or contradicted claim. Unverified claims are excluded, not counted as false. No checked claims means null. Personal achievements cannot be certified. Deterministic calculations take precedence. Grade partial support only when a claim is partly correct and explain the missing qualification. Do not multiply paraphrases of one claim to inflate a score.',
    },
    contentRules: 'Score each criterion 0-4 using its anchors; the server calculates the weighted total. Evidence must be a literal answer quote (or empty when identifying an omission). Explain the concrete omission or strength in one sentence. High scores need substance, not length, polish, jargon or confident delivery. A major factual contradiction caps content at 59; a critical contradiction caps it at 25. Relevance 0 caps content at 20. Answer quality and factual accuracy are distinct.',
};

const plain = value => value.replace(/“[^”]+”/g,'').replace(/\*\*/g, '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
export function emphasizeFeedback(value) {
    if (/\*\*[^*]+\*\*/.test(value)) return value;
    const lead = value.match(/^(.{5,80}?)(?=[:.!?]|$)/)?.[0] ?? value.split(/\s+/).slice(0,6).join(' ');
    return lead ? `**${lead}**${value.slice(lead.length)}` : value;
}
export function distinctFeedback(items, previous = [], limit = 3) {
    const seen = previous.map(plain), result = [];
    for (const value of items) {
        if (typeof value !== 'string' || !value.trim()) continue;
        const key = plain(value), words = new Set(key.split(' ').filter(w => w.length > 3));
        if (seen.some(p => {
            if (p === key || (key.length > 30 && (p.includes(key) || key.includes(p)))) return true;
            const other = new Set(p.split(' ').filter(w => w.length > 3));
            return words.size >= 5 && other.size >= 5 && [...words].filter(w => other.has(w)).length / Math.max(words.size, other.size) >= .75;
        })) continue;
        seen.push(key); result.push(value.trim()); if (result.length >= limit) break;
    }
    return result;
}

export function scoreContentRubric(value, answer, knowledge, question = {}) {
    if (value?.version !== RUBRIC_VERSION || !Array.isArray(value.criteria) || value.criteria.length !== CONTENT_RUBRIC.criteria.length)
        throw new InputError('The AI did not apply the current grading rubric. Retry or use local feedback.', 502);
    const kind = questionKind(question);
    const rules = kind.category === 'Behavioral' ? CONTENT_RUBRIC.behavioralCriteria : CONTENT_RUBRIC.criteria;
    const criteria = rules.map(rule => {
        const matches = value.criteria.filter(c => c?.id === rule.id), c = matches[0];
        if (matches.length !== 1 || !Number.isInteger(c.level) || c.level < 0 || c.level > 4 || typeof c.reason !== 'string' || !c.reason.trim() || c.reason.length > 1000 || typeof c.evidence !== 'string' || c.evidence.length > 400)
            throw new InputError('The AI rubric did not include valid answer evidence. Retry or use local feedback.', 502);
        if (c.evidence && !answer.includes(c.evidence)) throw new InputError('The AI evidence quote did not exactly match the transcript. Retry or use local feedback.',502);
        if (c.level>=3&&!c.evidence) throw new InputError('The AI assigned a high grade without supporting answer evidence. Retry or use local feedback.',502);
        if (typeof c.improvement !== 'string' || c.improvement.length > 800 || (c.level < 4 && !c.improvement.trim())) throw new InputError('The AI rubric did not justify how to improve this grade. Retry or use local feedback.',502);
        return { id: rule.id, label: rule.label, weight: rule.weight, level: c.level, evidence: c.evidence, reason: c.reason.trim(), improvement:c.improvement.trim() };
    });
    const uncappedScore = Math.round(criteria.reduce((sum, c) => sum + c.level / 4 * c.weight, 0));
    const errors = kind.category === 'Technical' ? knowledge.checks.filter(c => c.status === 'contradicted') : [];
    const cap = errors.some(c => c.severity === 'critical') ? CONTENT_RUBRIC.accuracy.criticalErrorCap : errors.some(c => c.severity !== 'minor') ? CONTENT_RUBRIC.accuracy.majorErrorCap : 100;
    return { version: RUBRIC_VERSION, method: 'ai-rubric', ...kind, criteria, uncappedScore, score: Math.min(uncappedScore, cap, criteria[0].level === 0 ? CONTENT_RUBRIC.relevanceZeroCap : 100), accuracyScope: kind.category === 'Behavioral' ? 'Behavioral answer; excluded from technical content and accuracy scores.' : 'Accuracy covers referenced claims only; unsupported claims remain unverified.' };
}

// The displayed feedback comes from the same evidence that determines the score.
// Separate model prose cannot contradict (or inflate) the actual criterion grades.
export function feedbackFromGrading(grading, previousFeedback = []) {
    const ordered = [...grading.criteria].sort((a,b)=>(4-b.level)*b.weight-(4-a.level)*a.weight);
    const describe = c => `**${c.label}:** ${c.evidence ? `“${c.evidence}” — ` : ''}${c.reason}`;
    const uniqueSpans = criteria => criteria.filter((c,i,all)=>!c.evidence||!all.slice(0,i).some(p=>p.evidence&&(p.evidence.includes(c.evidence)||c.evidence.includes(p.evidence))));
    const gaps=ordered.some(c=>c.level<=2)?ordered.filter(c=>c.level<=2):ordered.filter(c=>c.level<4);
    const correction = c => c.level>=3?`**Refine ${c.label.toLowerCase()}:** ${c.improvement}`:`${describe(c)} ${c.improvement}`;
    return {
        summary:`**${grading.category} answer: ${grading.score}/100${grading.method === 'local-heuristic' ? ' local estimate' : ''}.** ${grading.score < grading.uncappedScore ? 'A factual-error or relevance cap applies.' : ordered[0].level < 4 ? `The largest gap is ${ordered[0].label.toLowerCase()} (${ordered[0].level}/4).` : 'All requested criteria are supported by the cited evidence.'}`,
        strengths:distinctFeedback(uniqueSpans(grading.criteria.filter(c=>c.level>=3&&c.evidence).sort((a,b)=>b.level-a.level||b.weight-a.weight)).map(describe),[],2),
        improvements:distinctFeedback(uniqueSpans(gaps.filter(c=>distinctFeedback([correction(c)],previousFeedback).length)).map(correction),[],3),
    };
}
