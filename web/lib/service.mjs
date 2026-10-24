import { InputError, setupInput, retrieveQuestions, rubricAnalysis, deliveryMetrics, text } from './interview.mjs';
import { providerConfig, assertCloudConsent, structured, transcribeFile } from './provider.mjs';
const string = { type: 'string' };
const strings = { type: 'array', items: string };
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const questionSchema = object({ questions: { type: 'array', items: object({ prompt: string, category: { type: 'string', enum: ['Behavioral', 'Technical'] }, focus: strings }) } });
const feedbackSchema = object({ content: { type: 'integer', minimum: 0, maximum: 100 }, comprehension: { type: 'integer', minimum: 0, maximum: 100 }, summary: string, strengths: strings, improvements: strings, evidence: strings, visual: strings });
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
        if (!['/api/questions', '/api/analyze', '/api/transcribe'].includes(path))
            return json({ error: 'Route not found.' }, 404);
        if (request.method !== 'POST')
            return json({ error: 'Use POST.' }, 405);
        const origin = request.headers.get('origin');
        if (origin && origin !== new URL(request.url).origin)
            return json({ error: 'Cross-origin requests are not allowed.' }, 403);
        if (path === '/api/questions') {
            const body = await bodyJson(request);
            const setup = setupInput(body);
            const live = config.cloudAvailable && setup.cloudConsent;
            if (setup.resume && !live)
                throw new InputError('PDF analysis needs an AI key and cloud consent. Paste resume text instead.');
            if (!live)
                return json({ mode: 'demo', questions: retrieveQuestions(setup) });
            assertCloudConsent(body, config);
            if (setup.resume && !config.pdfCloudAvailable)
                throw new InputError('Free Gemini practice accepts fictional text only. PDF resumes are not sent to this provider.');
            const content = [{ type: 'input_text', text: `Generate exactly ${setup.count} distinct ${setup.type} questions for a ${setup.level} ${setup.role} interview. Tailor to the experience and prompt. Include short focus keywords. Mixed means behavioral and technical. Context: ${setup.context}` }];
            if (setup.resume)
                content.push({ type: 'input_file', filename: setup.resume.name, file_data: setup.resume.data });
            const data = await structured('interview_questions', questionSchema, content, env, fetcher);
            if (!Array.isArray(data.questions) || data.questions.length !== setup.count || data.questions.some(q => !q || typeof q.prompt !== 'string' || !q.prompt.trim() || q.prompt.length > 1200 || !['Behavioral', 'Technical'].includes(q.category) || !Array.isArray(q.focus) || !q.focus.every(w => typeof w === 'string' && w.length <= 100)))
                throw new InputError('AI questions were incomplete. Please retry.', 502);
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
        const answer = text(body.answer, 'Answer', 20000);
        const question = { prompt: text(body.question?.prompt, 'Question', 1200), focus: body.question?.focus ?? [] };
        if (!question.prompt || !Array.isArray(question.focus) || question.focus.length > 12 || !question.focus.every(v => typeof v === 'string' && v.length <= 100))
            throw new InputError('Include a valid question and focus list.');
        const duration = body.duration ?? 0;
        if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0 || duration > 600)
            throw new InputError('Invalid answer duration.');
        const baseline = rubricAnalysis({ answer, question, duration, recorded: body.recorded === true });
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
        return json({ mode: 'live', scores: { confidence: baseline.metrics.confidence, content: data.content, comprehension: data.comprehension }, metrics: deliveryMetrics(answer, duration, body.recorded === true), summary: data.summary, strengths: data.strengths, improvements: data.improvements, evidence: data.evidence.filter(quote => quote.length > 0 && answer.includes(quote)), visual: frames.length ? data.visual : [], limitation: 'AI estimates can be wrong. Confidence is a pace/filler proxy, not feelings. Camera observations do not affect scores.' });
    }
    catch (e) {
        if (e instanceof InputError)
            return json({ error: e.message }, e.status);
        return json({ error: 'Request failed. Your current recording remains in this browser.' }, 500);
    }
}
