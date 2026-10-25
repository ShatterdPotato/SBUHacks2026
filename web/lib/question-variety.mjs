export const questionKey = value => String(value ?? '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
function scenario(value) {
    const p=questionKey(value);
    if(/(?:coworker|team member|teammate|colleague)/.test(p)&&/stress|busy|fast paced|rush/.test(p))return 'team-under-pressure';
    if(/return|refund/.test(p)&&/receipt|policy/.test(p))return 'returns-policy';
    if(/price/.test(p)&&/tag|shelf|ring|higher/.test(p))return 'price-check';
    if(/drawer|register/.test(p)&&/short|discrepancy|did not match|does not match/.test(p))return 'cash-discrepancy';
    if(/drawer|register/.test(p)&&/running low|low on|denomination/.test(p))return 'cash-supply';
    if(/change/.test(p)&&/costs?/.test(p)&&/\d/.test(p))return 'cash-calculation';
    return null;
}
export function similarQuestion(a, b) {
    const x = questionKey(a), y = questionKey(b); if (x === y) return true;
    const intent=scenario(x);if(intent&&intent===scenario(y))return true;
    const words = s => new Set(s.split(' ').filter(w => w.length > 3));
    const left = words(x), right = words(y), overlap = [...left].filter(w => right.has(w)).length;
    return left.size >= 5 && right.size >= 5 && overlap / Math.min(left.size, right.size) >= .8;
}
/** @param {any[]} candidates @param {string[]} previous */
export function freshQuestions(candidates, previous = []) {
    const result = [];
    for (const q of candidates) if (![...previous, ...result.map(q => q.prompt)].some(p => similarQuestion(p, q.prompt))) result.push(q);
    return result;
}
export function shuffled(values, random = Math.random) {
    const result = [...values]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result;
}
const recent = new Map();
export function recentQuestions(role) { return recent.get(questionKey(role)) ?? []; }
export function rememberQuestions(role, questions) { recent.set(questionKey(role), [...recentQuestions(role), ...questions.map(q => q.prompt)].slice(-36)); }
