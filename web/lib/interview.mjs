/** Provider-independent interview logic. Never persists personal data. */
export class InputError extends Error {
    constructor(message, status = 400) { super(message); this.status = status; }
}
export const BANK = [
    { category: 'Behavioral', prompt: 'Tell me about a project you are proud of. What did you personally contribute, and what changed as a result?', focus: ['project', 'built', 'result'], tags: [] },
    { category: 'Behavioral', prompt: 'Describe a time you disagreed with a teammate. How did you understand their perspective and reach a decision?', focus: ['team', 'decision', 'learned'], tags: [] },
    { category: 'Behavioral', prompt: 'Walk me through a failure or unexpected setback. What did you change afterward, and how did you know it helped?', focus: ['problem', 'changed', 'learned'], tags: [] },
    { category: 'Behavioral', prompt: 'Tell me about a time you had to learn something quickly. How did you choose what to learn and check your understanding?', focus: ['learned', 'practice', 'feedback'], tags: [] },
    { category: 'Behavioral', prompt: 'Describe how you prioritized two competing deadlines. What tradeoff did you make, and how did you communicate it?', focus: ['priority', 'tradeoff', 'communicated'], tags: [] },
    { category: 'Technical', prompt: 'Design a small service that receives a request, processes it, and returns a result. How would you handle failures and test it?', focus: ['service', 'error', 'test'], tags: ['software', 'engineer', 'backend', 'python', 'javascript', 'web'] },
    { category: 'Technical', prompt: 'A feature you shipped suddenly becomes slow. How would you find the bottleneck, choose a fix, and verify the improvement?', focus: ['measure', 'performance', 'test'], tags: ['software', 'engineer', 'backend', 'frontend', 'web'] },
    { category: 'Technical', prompt: 'Your model performs well on training data but poorly on new examples. How would you diagnose the gap and evaluate your next experiment?', focus: ['validation', 'overfit', 'data'], tags: ['machine learning', 'ml', 'ai', 'model', 'pytorch', 'data'] },
    { category: 'Technical', prompt: 'How would you build a fair comparison between two predictive models? Explain the data split, baseline, and metric you would choose.', focus: ['split', 'baseline', 'metric'], tags: ['machine learning', 'ml', 'ai', 'model', 'data', 'quant'] },
    { category: 'Technical', prompt: 'A circuit prototype behaves differently from your calculation. What would you measure first, and how would you isolate the cause?', focus: ['measure', 'voltage', 'test'], tags: ['electrical', 'hardware', 'circuit', 'embedded', 'ee'] },
    { category: 'Technical', prompt: 'A trading signal looks profitable in a backtest. What could make the result misleading, and how would you validate it?', focus: ['bias', 'cost', 'data'], tags: ['quant', 'finance', 'trading', 'statistics'] },
    { category: 'Technical', prompt: 'How would you decide which product problem to solve first? Describe your user research, tradeoffs, and success metric.', focus: ['user', 'tradeoff', 'metric'], tags: ['product', 'design', 'business', 'manager', 'ux'] },
    { category: 'Technical', prompt: 'Explain a difficult concept from your field to someone new to it. Give a concrete example and explain where the analogy stops working.', focus: ['example', 'because', 'limit'], tags: [] },
    { category: 'Behavioral', prompt: 'Why this role, and how does your experience prepare you for it? Connect one specific example to the work you want to do.', focus: ['experience', 'role', 'example'], tags: [] },
];
export function text(value, name, max, fallback = '') {
    if (value === undefined || value === null)
        return fallback;
    if (typeof value !== 'string' || value.length > max)
        throw new InputError(`${name} must be text of at most ${max} characters.`);
    return value.trim();
}
export function setupInput(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body))
        throw new InputError('Invalid interview setup.');
    const role = text(body.role, 'Role', 160, 'General interview') || 'General interview';
    const context = text(body.context, 'Context', 20000);
    const type = text(body.type, 'Interview type', 20, 'Mixed');
    if (!['Mixed', 'Behavioral', 'Technical'].includes(type))
        throw new InputError('Choose Mixed, Behavioral, or Technical.');
    const count = body.count ?? 4;
    if (!Number.isInteger(count) || count < 3 || count > 6)
        throw new InputError('Choose between 3 and 6 questions.');
    const level = text(body.level, 'Experience level', 30, 'Internship');
    if (!['Internship', 'Entry level', 'Experienced'].includes(level))
        throw new InputError('Choose a valid experience level.');
    let resume;
    if (body.resume != null) {
        if (typeof body.resume !== 'object' || typeof body.resume.data !== 'string' ||
            !/^data:application\/pdf;base64,[A-Za-z0-9+/]+=*$/.test(body.resume.data) || body.resume.data.length > 2800000)
            throw new InputError('Upload a PDF no larger than 2 MB, or paste resume text.');
        resume = { name: text(body.resume.name, 'Filename', 160, 'resume.pdf'), data: body.resume.data };
        if (!body.cloudConsent)
            throw new InputError('PDF analysis requires cloud consent. Paste text to use the local rubric.');
    }
    return { role, context, type, count, level, resume, cloudConsent: body.cloudConsent === true };
}
export function retrieveQuestions(setup) {
    const query = `${setup.role} ${setup.context}`.toLowerCase();
    const ranked = BANK.map((q, i) => ({ ...q, id: `bank-${i + 1}`, source: 'curated', relevance: q.tags.reduce((n, tag) => n + (new RegExp(`\\b${tag}\\b`, 'i').test(query) ? (tag.includes(" ") ? 3 : tag === "engineer" ? .25 : 1) : 0), 0) }));
    const pool = ranked.filter(q => setup.type === 'Mixed' || q.category === setup.type).sort((a, b) => b.relevance - a.relevance);
    const chosen = setup.type === 'Mixed'
        ? [ranked[0], ...pool.filter(q => q.id !== ranked[0].id && q.category === 'Technical').slice(0, 2), ...pool.filter(q => q.id !== ranked[0].id && q.category === 'Behavioral')]
        : pool;
    return chosen.slice(0, setup.count).map(({ relevance, tags, ...q }) => q);
}
export function deliveryMetrics(answer, duration, recorded) {
    const words = answer.match(/\b[\w'-]+\b/g) ?? [];
    const fillers = (answer.match(/\b(um+|uh+|erm|you know|sort of|kind of)\b/gi) ?? []).length;
    const measured = recorded === true && Number.isFinite(duration) && duration >= 5 && words.length >= 15;
    const wpm = measured ? Math.round(words.length / duration * 60) : null;
    const confidence = measured ? Math.round(Math.max(15, Math.min(100, 95 - Math.abs(135 - wpm) * .22 - fillers / words.length * 180))) : null;
    return { words: words.length, fillers, wpm, confidence };
}
export function rubricAnalysis({ answer, question, duration = 0, recorded = false }) {
    const metrics = deliveryMetrics(answer, duration, recorded);
    if (metrics.words < 5)
        return { mode: 'demo', scores: { confidence: null, content: null, comprehension: null }, metrics, summary: 'There is not enough transcript evidence to assess this answer.', strengths: [], improvements: ['Add or correct your transcript, then explain a specific example.'], evidence: [], visual: [], limitation: 'Practice rubric; no semantic AI evaluation or camera analysis was performed.' };
    const lower = answer.toLowerCase();
    const focus = (question.focus ?? []).filter(w => lower.includes(w.toLowerCase()));
    const structured = /\b(because|first|then|finally|result|learned|therefore|however)\b/i.test(answer);
    const concrete = /\d|\b(built|designed|tested|measured|implemented|reduced|increased|created|analyzed)\b/i.test(answer);
    const content = Math.round(Math.min(92, 25 + Math.min(metrics.words, 130) * .25 + (structured ? 15 : 0) + (concrete ? 15 : 0)));
    const comprehension = Math.round(Math.min(88, 30 + (focus.length / Math.max(1, question.focus?.length ?? 1)) * 38 + (structured ? 12 : 0)));
    return { mode: 'demo', scores: { confidence: metrics.confidence, content, comprehension }, metrics,
        summary: concrete ? 'You included a concrete action. Connect that action to a clear result.' : 'Build your answer around one specific situation, your action, and the outcome.',
        strengths: [structured ? 'Your transcript includes language that connects the steps of your explanation.' : 'You put an answer into words; use this as your starting point.', ...(concrete ? ['Your answer includes an action or measurable detail.'] : [])],
        improvements: [concrete ? 'Explain how you verified the outcome and what you learned.' : 'Give an example of something you personally did.', ...(metrics.fillers > 2 ? ['Try a brief pause instead of repeated filler phrases.'] : []), 'Check that you answered every part of the question.'],
        evidence: [answer.slice(0, 180)], visual: [], limitation: 'Practice rubric uses length, structure, and keyword overlap. It cannot establish correctness or genuine comprehension. Confidence is a pace/filler proxy, not a psychological assessment.' };
}
export function overallScore(scores) {
    const values = Object.values(scores).filter(v => typeof v === 'number' && Number.isFinite(v));
    return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
}
export function reportFor(answers) {
    const scores = Object.fromEntries(['confidence', 'content', 'comprehension'].map(key => {
        const values = answers.map(a => a.analysis.scores[key]).filter(v => typeof v === 'number');
        return [key, values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null];
    }));
    const ranked = answers.map((a, index) => ({ index, score: overallScore(a.analysis.scores) })).filter(a => a.score !== null).sort((a, b) => b.score - a.score);
    const clips = ranked.filter(a => answers[a.index].hasRecording);
    return { scores, overall: overallScore(scores), best: clips[0]?.index ?? null, worst: clips.length > 1 ? clips.at(-1).index : null, ranked };
}
