import { InputError } from './interview.mjs';
import { operationInstructions } from './interviewer-instructions.mjs';
import { gradingAgentInstructions } from '../agents/interview-grader.mjs';

export function providerConfig(env) {
    const provider = env.AI_PROVIDER || (env.GEMINI_API_KEY ? 'gemini' : 'openai');
    const gemini = provider === 'gemini';
    const cloudAvailable = (gemini || provider === 'openai') && !!(gemini ? env.GEMINI_API_KEY : env.OPENAI_API_KEY);
    const demoDataOnly = gemini && env.GEMINI_DATA_POLICY !== 'paid';
    return { provider, providerLabel: gemini ? 'Google Gemini' : 'OpenAI',
        model: gemini ? env.GEMINI_MODEL || 'gemini-3.5-flash-lite' : env.OPENAI_MODEL || 'gpt-4.1-mini',
        cloudAvailable, demoDataOnly, mediaCloudAvailable: cloudAvailable && !demoDataOnly,
        pdfCloudAvailable: cloudAvailable && !demoDataOnly };
}

export function assertCloudConsent(body, config, { genericOnly = false } = {}) {
    if (body.cloudConsent !== true || body.providerConsent !== config.provider)
        throw new InputError('Confirm cloud processing for the current AI provider. Refresh the page if the provider changed.', 400);
    if (config.demoDataOnly && !genericOnly && body.demoDataOnly !== true)
        throw new InputError('Free Gemini practice requires fictional text only. Confirm that you are not sending personal, sensitive, or confidential information.', 400);
}

export function providerError(status, payload) {
    // Classify upstream diagnostics in memory. Never return/log the raw body,
    // which can contain credentials, a prompt, or provider account details.
    const error = payload?.error ?? {};
    const diagnostic = [error.message, error.status, error.type, error.code,
        ...(Array.isArray(error.details) ? error.details.map(detail => detail?.reason) : [])]
        .filter(value => typeof value === 'string').join(' ').toLowerCase();
    if (status === 429)
        return { code: 'usage_limit', message: 'The AI service is at its usage limit. Try again later or use curated questions.' };
    if ([401, 403].includes(status) || /api[_ -]?key.*(invalid|not valid|expired|revoked|leaked|blocked)|key.*reported.*leaked|api_key_invalid|credentials.*invalid/.test(diagnostic))
        return { code: 'credentials_rejected', message: 'The AI provider rejected the server key or its access. The project owner needs to check or replace the key securely. Your resume is still here; curated questions are available.' };
    if (status === 404 || /model.*(not found|not supported|unavailable)/.test(diagnostic))
        return { code: 'model_unavailable', message: 'The configured AI model is unavailable. The project owner needs to update the model setting. You can use curated questions now.' };
    if ([500, 502, 503, 504].includes(status))
        return { code: 'provider_unavailable', message: 'The AI provider is temporarily unavailable after a retry. Please try again or use curated questions.' };
    if (status === 400)
        return { code: 'request_rejected', message: 'The AI provider rejected the request settings (400). Your resume was read successfully. Try again, or use curated questions while the project owner checks the provider configuration.' };
    return { code: 'provider_rejected', message: 'The AI provider could not process this request. Your resume is still here. Try again or use curated questions.' };
}

let activeRequests=0;
const waitingRequests=[];
async function acquireSlot(){
    if(activeRequests<4){activeRequests++;return;}
    if(waitingRequests.length>=16)throw new InputError('AI is busy. Your work is preserved; retry shortly.',429);
    await new Promise((resolve,reject)=>{
        const ticket={resolve:()=>{clearTimeout(timer);resolve();}};
        const timer=setTimeout(()=>{const i=waitingRequests.indexOf(ticket);if(i>=0)waitingRequests.splice(i,1);reject(new InputError('AI queue timed out. Your work is preserved; retry.',503));},15000);
        waitingRequests.push(ticket);
    });
}
export async function providerFetch(path, options, env, fetcher, operation = 'provider') {
    await acquireSlot();
    try {return await performProviderFetch(path,options,env,fetcher,operation);}
    finally {const next=waitingRequests.shift();if(next)next.resolve();else activeRequests--;}
}
async function performProviderFetch(path, options, env, fetcher, operation = 'provider') {
    const started = Date.now();
    const record = (status, attempt, payload = null, model = '') => {
        const u = payload?.usage;
        const count = key => Number.isFinite(u?.[key]) ? u[key] : null;
        const entry = { operation, model: model || providerConfig(env).model, status, attempts:attempt + 1, latencyMs:Date.now()-started, inputTokens:count('total_input_tokens'), outputTokens:count('total_output_tokens'), thoughtTokens:count('total_thought_tokens'), totalTokens:count('total_tokens'), incomplete:payload?.status === 'incomplete' };
        env.__usage?.push(entry);
        if (env.AI_TELEMETRY === 'true') console.info('Cadence AI usage', entry);
    };
    const gemini = providerConfig(env).provider === 'gemini';
    const offlineBank = operation === 'bank_authoring' || operation === 'bank_review';
    const deadline = Date.now() + (offlineBank ? 180000 : 60000);
    for (let attempt = 0; attempt < 2; attempt++) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) break;
        const signal = AbortSignal.timeout(Math.min(attempt === 0 ? (offlineBank ? 90000 : 30000) : remaining, remaining));
        let body = options.body;
        if (gemini && attempt === 1 && env.GEMINI_FALLBACK_MODEL && typeof body === 'string') {
            const payload = JSON.parse(body);
            if (typeof payload.model === 'string') body = JSON.stringify({ ...payload, model: env.GEMINI_FALLBACK_MODEL });
        }
        const request = {
            ...options, body, headers: { ...(gemini ? { 'x-goog-api-key': env.GEMINI_API_KEY } : { Authorization: `Bearer ${env.OPENAI_API_KEY}` }), ...options.headers },
            signal
        };
        const url = `${gemini ? 'https://generativelanguage.googleapis.com/v1beta' : 'https://api.openai.com/v1'}${path}`;
        let response;
        try {
            response = await fetcher(url, request);
        } catch {
            if (attempt === 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
            break;
        }
        // Invalid requests, credentials, and quota exhaustion are not retried.
        if (attempt === 0 && [408, 500, 502, 503, 504].includes(response.status)) {
            await response.body?.cancel();
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
        }
        if (!response.ok) {
            const details = await response.json().catch(() => null);
            const failure = providerError(response.status, details);
            console.warn('Cadence AI request failed', { provider: gemini ? 'gemini' : 'openai', status: response.status, code: failure.code });
            record(failure.code, attempt, null, typeof body==='string' ? JSON.parse(body).model : '');
            throw Object.assign(new InputError(failure.message, 502), { code: failure.code });
        }
        try { const payload = await response.json(); record(payload.status ?? 'completed', attempt, payload, typeof body==='string' ? JSON.parse(body).model : ''); return payload; }
        catch { throw new InputError('The AI returned unreadable feedback. Please try again.', 502); }
    }
    record('network_unavailable', 1);
    console.warn('Cadence AI request failed', { provider: gemini ? 'gemini' : 'openai', code: 'network_unavailable' });
    throw Object.assign(new InputError('The AI provider could not be reached after two attempts. Your input is still here. Retry or choose curated questions.', 502), { code: 'network_unavailable' });
}

function geminiContent(item) {
    if (item.type === 'input_text') return { type: 'text', text: item.text };
    const url = item.type === 'input_file' ? item.file_data : item.image_url;
    const [, mime_type, data] = /^data:([^;]+);base64,(.+)$/.exec(url) || [];
    if (!data) throw new InputError('Invalid inline attachment.');
    return { type: item.type === 'input_file' ? 'document' : 'image', mime_type, data };
}

export async function structured(name, schema, content, env, fetcher) {
    const config = providerConfig(env);
    const grading = /interview_turn|feedback|grade|verification|answer_accuracy|session_report|clip_coaching|practice_coach|bank_review/.test(name);
    const roleInstructions = operationInstructions(name);
    // Reports, clips, drills and bank reviews consult the rubric but do not
    // return a rubric object. Keep system instructions consistent with schemas.
    const requireRubricOutput = !!(schema.properties?.rubric || schema.properties?.feedback?.properties?.rubric);
    const systemInstructions = grading
        ? `${roleInstructions}\n${gradingAgentInstructions({ requireRubricOutput })}` : roleInstructions;
    let output;
    if (config.provider === 'gemini') {
        const result = await providerFetch('/interactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
            model: grading ? env.GEMINI_GRADING_MODEL || config.model : config.model, store: false, system_instruction: systemInstructions,
            input: content.map(geminiContent),
            response_format: { type: 'text', mime_type: 'application/json', schema },
            generation_config: { max_output_tokens: grading ? 16384 : name === 'bank_authoring' ? 16384 : 8192, thinking_level: 'high' }
        }) }, env, fetcher, name);
        if (result.status !== 'completed') throw new InputError('The AI did not return complete feedback. Please try again.', 502);
        output = result.steps?.filter(step => step.type === 'model_output').flatMap(step => step.content ?? [])
            .filter(item => item.type === 'text').map(item => item.text).join('');
    } else {
        const result = await providerFetch('/responses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
            model: config.model, store: false, instructions: systemInstructions, input: [{ role: 'user', content }],
            text: { format: { type: 'json_schema', name, strict: true, schema } }, max_output_tokens: 3000
        }) }, env, fetcher, name);
        if (result.status && result.status !== 'completed') throw new InputError('The AI did not return complete feedback. Please try again.', 502);
        output = result.output?.flatMap(item => item.content ?? []).filter(item => item.type === 'output_text').map(item => item.text).join('');
    }
    if (!output) throw new InputError('The AI did not return complete feedback. Please try again.', 502);
    try { return JSON.parse(output); }
    catch { throw new InputError('The AI returned unreadable feedback. Please try again.', 502); }
}

export async function transcribeFile(file, env, fetcher) {
    if (providerConfig(env).provider === 'gemini') {
        const bytes = new Uint8Array(await file.arrayBuffer());
        let binary = '';
        for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        const ext = file.name.split('.').pop().toLowerCase();
        const mime_type = ({ webm: 'audio/webm', mp4: 'audio/m4a', m4a: 'audio/m4a', wav: 'audio/wav', mp3: 'audio/mp3', mpeg: 'audio/mpeg', mpga: 'audio/mpeg' })[ext];
        const result = await providerFetch('/interactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
            model: env.GEMINI_MODEL || 'gemini-3.5-flash-lite', store: false,
            system_instruction: operationInstructions('transcription'),
            input: [{ type: 'text', text: 'Transcribe this interview answer.' }, { type: 'audio', mime_type, data: btoa(binary) }],
            response_format: { type: 'text', mime_type: 'application/json', schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false } },
            generation_config: { max_output_tokens: 8192, thinking_level: 'high' }
        }) }, env, fetcher, 'transcription');
        if (result.status !== 'completed') throw new InputError('No complete transcript returned. Enter or correct your transcript.', 502);
        try { return JSON.parse(result.steps?.filter(s => s.type === 'model_output').flatMap(s => s.content ?? []).filter(c => c.type === 'text').map(c => c.text).join('')); }
        catch { throw new InputError('No transcript returned. Enter or correct your transcript.', 502); }
    }
    const upstream = new FormData();
    upstream.set('file', file);
    upstream.set('model', env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe');
    upstream.set('response_format', 'json');
    return providerFetch('/audio/transcriptions', { method: 'POST', body: upstream }, env, fetcher);
}
