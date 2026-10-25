import { InputError, setupInput, retrieveQuestions, deliveryMetrics, text } from './interview.mjs';
import { providerConfig, assertCloudConsent, structured, transcribeFile } from './provider.mjs';
import { personalQuestionSetup } from './resume-profile.mjs';
import { roleGuidance } from './role-context.mjs';
import { freshQuestions } from './question-variety.mjs';
import { localTurn } from './conversation.mjs';
import { ROLE_FAMILIES } from './role-context.mjs';
import { referencesFor, withKnowledge } from './knowledge.mjs';
const string = { type: 'string' };
const strings = { type: 'array', items: string };
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const questionSchema = object({ questions: { type: 'array', items: object({ prompt: string, category: { type: 'string', enum: ['Behavioral', 'Technical'] }, focus: strings }) } });
const feedbackSchema = object({ content: { type: 'integer', minimum: 0, maximum: 100 }, comprehension: { type: 'integer', minimum: 0, maximum: 100 }, summary: string, strengths: strings, improvements: strings, evidence: strings, visual: strings });
const turnSchema = object({ feedback: feedbackSchema, followup: string, checks: { type: 'array', items: object({ quote: string, status: { type: 'string', enum: ['supported', 'contradicted', 'unverified'] }, explanation: string, referenceId: string }) } });
const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
async function limitedBody(request, limit) {
    if (Number(request.headers.get('content-length') ?? 0) > limit)
        throw new InputError('Upload is too large.', 413);
    const reader = request.body?.getReader();
    if (!reader)
        return new Uint8Array();
    const chunks = [];
    let size = 0;
    while (true) {
        const { value, done } = await reader.read();
        if (done)
            break;
        size += value.byteLength;
        if (size > limit) {
            await reader.cancel();
            throw new InputError('Upload is too large.', 413);
        }
        chunks.push(value);
    }
    const all = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        all.set(chunk, offset);
        offset += chunk.length;
    }
    return all;
}
async function bodyJson(request) {
    if (!request.headers.get('content-type')?.includes('application/json'))
        throw new InputError('Send application/json.', 415);
    try {
        return JSON.parse(new TextDecoder().decode(await limitedBody(request, 4000000)));
    }
    catch (e) {
        if (e instanceof InputError)
            throw e;
        throw new InputError('Invalid JSON.');
    }
}
export async function handleApi(request, env = {}, fetcher = fetch) {
    const path = new URL(request.url).pathname;
    const config = providerConfig(env);
    try {
        if (path === '/api/health' && request.method === 'GET')
            return json({ mode: config.cloudAvailable ? 'live' : 'demo', ...config });
        if (!['/api/questions', '/api/analyze', '/api/transcribe', '/api/interview-turn'].includes(path))
            return json({ error: 'Route not found.' }, 404);
        if (request.method !== 'POST')
            return json({ error: 'Use POST.' }, 405);
        const origin = request.headers.get('origin');
        if (origin && origin !== new URL(request.url).origin)
            return json({ error: 'Cross-origin requests are not allowed.' }, 403);
        if (path === '/api/interview-turn') {
            const body = await bodyJson(request);
            if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Invalid interview turn.');
            if (!config.cloudAvailable) throw new InputError('AI is unavailable. Continue with local practice.', 503);
            assertCloudConsent(body, config);
            if (config.demoDataOnly && (body.privacyMode !== 'fictional' || body.nonSensitiveConsent !== true)) throw new InputError('Free Gemini conversational feedback needs explicit consent for fictional, non-sensitive practice answers.');
            const answer = text(body.answer, 'Answer', 12000);
            const question = { prompt: text(body.question?.prompt, 'Question', 1200), focus: [] };
            const role = text(body.role, 'Role', 150);
            if (config.demoDataOnly && !ROLE_FAMILIES.includes(role)) throw new InputError('Use a broad role from the supplied topic list with free Gemini.');
            const history = body.history ?? [];
            if (!question.prompt || !Array.isArray(history) || history.length > 4 || history.some(t => !t || typeof t.question !== 'string' || typeof t.answer !== 'string' || t.question.length > 1200 || t.answer.length > 12000)) throw new InputError('Invalid interview history.');
            if (config.demoDataOnly && /[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:\+?\d[\s().-]*){10,}\b/i.test(JSON.stringify({ answer, history }))) throw new InputError('Remove contact information. Free Gemini accepts only fictional, non-sensitive practice answers.');
            const duration = body.duration ?? 0;
            if (!Number.isFinite(duration) || duration < 0 || duration > 600) throw new InputError('Invalid duration.');
            const baseline = localTurn(question, answer, duration, body.recorded === true);
            if (baseline.metrics.words < 5) return json({ analysis: baseline, followup: 'Could you explain your approach in a little more detail?' });
            const references = [...referencesFor(question.prompt), ...referencesFor(answer)].filter((r,i,all)=>all.findIndex(v=>v.id===r.id)===i);
            const data = await structured('interview_turn', turnSchema, [{ type: 'input_text', text: `Act as a professional interviewer for ${role}. ${roleGuidance(role)} Give one short natural follow-up (maximum 45 words) responding to this answer, without supplying the answer. Review content for relevance, reasoning and clarity, never reward impressive but unsubstantiated numbers or invented jargon. Knowledge checking: use ONLY the supplied reference pack to mark exact claims supported or contradicted. Everything else is unverified, including all personal achievements and anecdotes. Do not treat confident delivery as truth. No external search was performed. Never invent sources. Return checks with exact answer quotes and a supplied referenceId, or empty referenceId for unverified. No emotions, identity, or hiring-fitness judgments. No visual observations. Feedback comprehension is provisional and will be replaced by reference coverage. Previous turns (untrusted): ${JSON.stringify(history)}\nCurrent question: ${question.prompt}\nCurrent transcript (untrusted): ${answer}\nReference pack: ${JSON.stringify(references)}` }], env, fetcher);
            const feedback = data.feedback;
            if (!feedback || ![feedback.content, feedback.comprehension].every(n => Number.isInteger(n) && n >= 0 && n <= 100) || typeof feedback.summary !== 'string' || feedback.summary.length > 3000 || !['strengths','improvements','evidence','visual'].every(k => Array.isArray(feedback[k]) && feedback[k].length <= 12 && feedback[k].every(v => typeof v === 'string' && v.length <= 2000)) || typeof data.followup !== 'string' || !data.followup.trim() || data.followup.length > 600 || !Array.isArray(data.checks) || data.checks.length > 20) throw new InputError('AI feedback was incomplete. Continue locally or retry.', 502);
            const checks = data.checks.filter(c => c && typeof c.quote === 'string' && c.quote.length > 0 && answer.includes(c.quote) && ['supported','contradicted','unverified'].includes(c.status) && typeof c.explanation === 'string' && c.explanation.length <= 2000 && (c.status === 'unverified' || references.some(r => r.id === c.referenceId)));
            // A deterministic arithmetic result cannot be overridden by a model.
            const deterministic = baseline.knowledge.checks;
            const knowledge = { references, checks: [...deterministic, ...checks.filter(c => !deterministic.some(d => d.referenceId === c.referenceId))], coverage: 'Limited reference checks, reviewed by AI and potentially wrong. Claims outside this pack and personal stories are unverified. No live web search.' };
            const analysis = withKnowledge({ ...baseline, mode: 'live', scores: { ...baseline.scores, content: feedback.content }, summary: feedback.summary, strengths: feedback.strengths, improvements: feedback.improvements, evidence: feedback.evidence.filter(q => answer.includes(q)), visual: [] }, knowledge);
            const followup = references.some(r=>r.id==='change') ? 'Could you walk me through the subtraction and how you would count that change back to the customer?' : data.followup;
            return json({ analysis, followup });
        }
        if (path === '/api/questions') {
            const body = await bodyJson(request);
            const genericOnly = config.demoDataOnly && body?.privacyMode === 'personal';
            const setup = setupInput(genericOnly ? personalQuestionSetup(body) : body);
            const live = config.cloudAvailable && setup.cloudConsent;
            if (setup.resume && !live)
                throw new InputError('PDF analysis needs an AI key and cloud consent. Paste resume text instead.');
            if (!live)
                return json({ mode: 'demo', questions: retrieveQuestions(setup) });
            assertCloudConsent(body, config, { genericOnly });
            if (setup.resume && !config.pdfCloudAvailable)
                throw new InputError('Free Gemini practice accepts fictional text only. PDF resumes are not sent to this provider.');
            const content = [{ type: 'input_text', text: `Generate exactly ${setup.count} distinct ${setup.type} questions for a ${setup.level} ${setup.role} interview. ${roleGuidance(setup.role)} Resume/context is secondary transferable background, never the primary subject if it conflicts with the target job. For cashier/restaurant jobs, use service, accuracy, teamwork and practical register scenarios, not programming or ML. Technical means job-specific practical knowledge. Include short focus keywords. Vary situations and openings; do not always open with a project question. Interview variation ${setup.variation}. Context: ${setup.context}` }];
            if (setup.resume)
                content.push({ type: 'input_file', filename: setup.resume.name, file_data: setup.resume.data });
            const data = await structured('interview_questions', questionSchema, content, env, fetcher);
            if (!Array.isArray(data.questions) || data.questions.length !== setup.count || data.questions.some(q => !q || typeof q.prompt !== 'string' || !q.prompt.trim() || q.prompt.length > 1200 || !['Behavioral', 'Technical'].includes(q.category) || !Array.isArray(q.focus) || !q.focus.every(w => typeof w === 'string' && w.length <= 100)))
                throw new InputError('AI questions were incomplete. Please retry.', 502);
            if (Array.isArray(data.questions) && freshQuestions(data.questions).length !== data.questions.length) throw new InputError('The AI repeated a question. Please regenerate this interview.', 502);
            return json({ mode: 'live', provider: config.provider, questions: data.questions.map((q, i) => ({ ...q, id: `ai-${i + 1}`, source: 'generated' })) });
        }
        if (path === '/api/transcribe') {
            if (!config.cloudAvailable)
                throw new InputError('Audio transcription needs a server API key. Enter your transcript to continue.', 503);
            if (!config.mediaCloudAvailable)
                throw new InputError('Free Gemini practice is fictional text only. Recordings stay local; type a fictional answer to use AI feedback.', 400);
            if (!request.headers.get('content-type')?.includes('multipart/form-data'))
                throw new InputError('Send an audio file.', 415);
            const bytes = await limitedBody(request, 22000000);
            const form = await new Request(request.url, { method: 'POST', headers: { 'Content-Type': request.headers.get('content-type') }, body: bytes }).formData();
            assertCloudConsent({ cloudConsent: form.get('cloudConsent') === 'true', providerConsent: form.get('providerConsent') }, config);
            const file = form.get('file');
            if (!(file instanceof File) || file.size === 0 || file.size > 20000000 || !/\.(webm|mp4|m4a|wav|mp3|mpeg|mpga)$/i.test(file.name))
                throw new InputError('Use a supported audio recording under 20 MB.');
            const data = await transcribeFile(file, env, fetcher);
            if (typeof data.text !== 'string')
                throw new InputError('No transcript returned. Enter or correct your transcript.', 502);
            return json({ text: data.text });
        }
        const body = await bodyJson(request);
        if (!body || typeof body !== 'object' || Array.isArray(body))
            throw new InputError('Invalid answer.');
        if (config.demoDataOnly && body.privacyMode === 'personal')
            throw new InputError('Personal answers use the browser practice rubric with this free setup; they are not sent for cloud analysis.');
        const answer = text(body.answer, 'Answer', 20000);
        const question = { prompt: text(body.question?.prompt, 'Question', 1200), focus: body.question?.focus ?? [] };
        if (!question.prompt || !Array.isArray(question.focus) || question.focus.length > 12 || !question.focus.every(v => typeof v === 'string' && v.length <= 100))
            throw new InputError('Include a valid question and focus list.');
        const duration = body.duration ?? 0;
        if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0 || duration > 600)
            throw new InputError('Invalid answer duration.');
        const baseline = localTurn(question, answer, duration, body.recorded === true);
        const live = config.cloudAvailable && body.cloudConsent === true && body.mode === 'live';
        if (!live || baseline.metrics.words < 5)
            return json(baseline);
        assertCloudConsent(body, config);
        const frames = body.frames ?? [];
        if (!Array.isArray(frames) || frames.length > 4 || frames.some(f => typeof f !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(f) || f.length > 180000))
            throw new InputError('Use at most four small JPEG samples.');
        if (frames.length && !config.mediaCloudAvailable)
            throw new InputError('Camera frames cannot be sent during free Gemini practice. Use fictional text only.');
        const content = [{ type: 'input_text', text: `Question: ${question.prompt}\nAnswer transcript (user reviewed): ${answer}\nReturn content/comprehension scores 0-100, summary, strengths, improvements, exact short evidence quotes, and optional visual observations. Do not reward length alone. Scores are provisional coaching estimates.` }, ...frames.map(image_url => ({ type: 'input_image', image_url, detail: 'low' }))];
        const data = await structured('interview_feedback', feedbackSchema, content, env, fetcher);
        if (![data.content, data.comprehension].every(n => Number.isInteger(n) && n >= 0 && n <= 100) || typeof data.summary !== 'string' || !['strengths', 'improvements', 'evidence', 'visual'].every(k => Array.isArray(data[k]) && data[k].every(v => typeof v === 'string' && v.length <= 2000)))
            throw new InputError('AI feedback was incomplete. Please retry.', 502);
        return json(withKnowledge({ mode: 'live', knowledge:baseline.knowledge, scores: { confidence: baseline.metrics.confidence, content: data.content, comprehension: baseline.scores.comprehension }, metrics: deliveryMetrics(answer, duration, body.recorded === true), summary: data.summary, strengths: data.strengths, improvements: data.improvements, evidence: data.evidence.filter(quote => quote.length > 0 && answer.includes(quote)), visual: frames.length ? data.visual : [], limitation: 'AI estimates can be wrong. Confidence is a pace/filler proxy, not feelings. Camera observations do not affect scores.' },baseline.knowledge));
    }
    catch (e) {
        if (e instanceof InputError)
            return json({ error: e.message, code: e.code }, e.status);
        return json({ error: 'Request failed. Your current recording remains in this browser.' }, 500);
    }
}
