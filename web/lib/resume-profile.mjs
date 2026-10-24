import { InputError } from './interview.mjs';

// These fixed labels are generic interview topics. Never send source excerpts,
// contact information, employers, schools, project names, or arbitrary tags.
/** @type {[string, RegExp][]} */
const TOPICS = [
    ['Python', /\bpython\b/i], ['SQL', /\bsql\b/i], ['C++', /\bc\+\+/i],
    ['JavaScript', /\bjavascript\b/i], ['TypeScript', /\btypescript\b/i],
    ['Java', /\bjava\b/i], ['PyTorch', /\bpytorch\b/i], ['TensorFlow', /\btensorflow\b/i],
    ['scikit-learn', /\bscikit[ -]learn\b/i], ['NumPy', /\bnumpy\b/i], ['pandas', /\bpandas\b/i],
    ['NLP', /\b(nlp|natural language processing)\b/i],
    ['RAG', /\b(rag|retrieval.augmented)\b/i], ['Transformers', /\b(transformers?|distilbert|bert)\b/i],
    ['Computer vision', /\b(computer vision|image classification|object detection)\b/i],
    ['Model evaluation', /\b(evaluation|precision|recall|f1|confusion matrix)\b/i],
    ['Time series', /\btime.series\b/i], ['Data leakage', /\b(data leakage|leakage prevention)\b/i],
    ['FastAPI', /\bfastapi\b/i], ['Docker', /\bdocker\b/i], ['Git', /\bgit(hub)?\b/i],
    ['Linux', /\blinux\b/i], ['PostgreSQL', /\bpostgres(ql)?\b/i],
    ['React', /\breact\b/i], ['Node.js', /\bnode\.?js\b/i], ['Testing', /\b(testing|unit tests?|pytest)\b/i],
    ['Algorithms', /\balgorithms?\b/i], ['Data structures', /\bdata structures?\b/i],
    ['Statistics', /\b(statistics|statistical)\b/i], ['Linear algebra', /\blinear algebra\b/i],
    ['Circuits', /\bcircuits?\b/i], ['Embedded systems', /\b(embedded|microcontroller)\b/i],
    ['User research', /\buser research\b/i], ['Product design', /\bproduct design\b/i]
];
export const SKILL_NAMES = Object.freeze(TOPICS.map(([name]) => name));
export const ROLE_FAMILIES = Object.freeze(['AI/ML engineering', 'Software engineering', 'Data science', 'Electrical engineering', 'Product management', 'General interview']);

export function genericProfile(source) {
    const value = typeof source === 'string' ? source : '';
    const roleFamily = /\b(machine learning|ai[ /-]*ml|pytorch|tensorflow|nlp)\b/i.test(value) ? ROLE_FAMILIES[0]
        : /\b(data science|data scientist|data analyst)\b/i.test(value) ? ROLE_FAMILIES[2]
        : /\b(electrical|circuits?|embedded)\b/i.test(value) ? ROLE_FAMILIES[3]
        : /\b(product manager|product management|user research)\b/i.test(value) ? ROLE_FAMILIES[4]
        : /\b(software|developer|python|javascript)\b/i.test(value) ? ROLE_FAMILIES[1] : ROLE_FAMILIES[5];
    return { roleFamily, skills: TOPICS.filter(([, pattern]) => pattern.test(value)).map(([name]) => name) };
}

export function validateGenericProfile(profile) {
    if (!profile || typeof profile !== 'object' || Array.isArray(profile) ||
        Object.keys(profile).some(key => !['roleFamily', 'skills'].includes(key)) ||
        !ROLE_FAMILIES.includes(profile.roleFamily) || !Array.isArray(profile.skills) ||
        profile.skills.length > SKILL_NAMES.length || !profile.skills.every(skill => SKILL_NAMES.includes(skill)))
        throw new InputError('Choose a broad role and skills from the supplied topic list.');
    return { roleFamily: profile.roleFamily, skills: [...new Set(profile.skills)] };
}

export function personalQuestionRequest({ profile, count, type, level, provider, cloudConsent }) {
    return { privacyMode: 'personal', profile: validateGenericProfile(profile), count, type, level, providerConsent: provider, cloudConsent: cloudConsent === true };
}

export function personalQuestionSetup(body) {
    const allowed = ['privacyMode', 'profile', 'count', 'type', 'level', 'providerConsent', 'cloudConsent'];
    if (Object.keys(body).some(key => !allowed.includes(key)))
        throw new InputError('Personal-resume questions accept generic topic labels only. Keep resume text, files, and answers in the browser.');
    const profile = validateGenericProfile(body.profile);
    return { role: profile.roleFamily, context: `Generic interview topics: ${profile.skills.join(', ') || 'general interview practice'}.`,
        count: body.count, type: body.type, level: body.level, cloudConsent: body.cloudConsent };
}
