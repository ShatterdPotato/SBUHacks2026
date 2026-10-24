import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from '../lib/service.mjs';

const env = { AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'test-secret', GEMINI_DATA_POLICY: 'unpaid' };
const request = (path, body) => new Request(`https://cadence.test/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ providerConsent: 'gemini', cloudConsent: true, demoDataOnly: true, ...body }) });
const output = (data, status = 'completed') => Response.json({ status, steps: [{ type: 'thought', summary: [{ type: 'text', text: 'Never parse reasoning.' }] }, { type: 'model_output', content: [{ type: 'text', text: JSON.stringify(data) }] }] });
const questions = Array.from({ length: 3 }, (_, i) => ({ prompt: `Describe fictional project ${i + 1}.`, category: 'Technical', focus: ['project'] }));
const feedback = { content: 70, comprehension: 80, summary: 'The fictional example includes a result.', strengths: ['A measured result'], improvements: ['Explain the baseline'], evidence: ['I built a pretend project', 'invented evidence'], visual: ['Invented visual'] };
const answer = 'In this fictional example I built a pretend project to sort blocks. First I measured a baseline. Then I tested the change and the result improved by 20 percent.';
const body = { question: { prompt: 'Describe a fictional project.', focus: ['project'] }, answer, mode: 'live' };
const never = async () => { assert.fail('No upstream request should be made.'); };

test('health reports the selected provider and policy without exposing credentials', async () => {
    const response = await handleApi(new Request('https://cadence.test/api/health'), { ...env, OPENAI_API_KEY: 'other-secret' });
    const data = await response.json();
    assert.equal(data.provider, 'gemini');
    assert.equal(data.model, 'gemini-3.5-flash-lite');
    assert.equal(data.cloudAvailable, true);
    assert.equal(data.demoDataOnly, true);
    assert.equal(data.mediaCloudAvailable, false);
    assert.equal(data.pdfCloudAvailable, false);
    assert.ok(!JSON.stringify(data).includes('secret'));
});

test('Gemini questions use header auth, structured JSON, shared instructions, and no storage', async () => {
    const response = await handleApi(request('questions', { count: 3 }), env, async (url, options) => {
        assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
        assert.ok(!url.includes(env.GEMINI_API_KEY));
        assert.equal(options.headers['x-goog-api-key'], env.GEMINI_API_KEY);
        assert.equal(options.headers.Authorization, undefined);
        const sent = JSON.parse(options.body);
        assert.equal(sent.store, false);
        assert.equal(sent.model, 'gemini-3.5-flash-lite');
        assert.equal(sent.response_format.mime_type, 'application/json');
        assert.equal(sent.response_format.schema.additionalProperties, false);
        assert.match(sent.system_instruction, /untrusted data/);
        assert.equal(sent.input[0].type, 'text');
        return output({ questions });
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.provider, 'gemini');
    assert.equal(data.questions.length, 3);
});

test('Gemini requires both provider-specific consent and fictional-data attestation', async () => {
    for (const overrides of [{ providerConsent: 'openai' }, { providerConsent: null }, { demoDataOnly: false }]) {
        assert.equal((await handleApi(request('questions', { count: 3, ...overrides }), env, never)).status, 400);
        assert.equal((await handleApi(request('analyze', { ...body, ...overrides }), env, never)).status, 400);
    }
    const result = await handleApi(request('questions', { count: 3, cloudConsent: false }), env, never);
    assert.equal((await result.json()).mode, 'demo');
});

test('unpaid Gemini blocks PDF, audio, and camera uploads on the server', async () => {
    assert.equal((await handleApi(request('questions', { resume: { name: 'fictional.pdf', data: 'data:application/pdf;base64,AAAA' } }), env, never)).status, 400);
    assert.equal((await handleApi(request('transcribe', {}), env, never)).status, 400);
    assert.equal((await handleApi(request('analyze', { ...body, frames: ['data:image/jpeg;base64,AAAA'] }), env, never)).status, 400);
});

test('Gemini feedback filters ungrounded evidence and visuals and preserves text-only scoring', async () => {
    const response = await handleApi(request('analyze', body), env, async () => output(feedback));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.mode, 'live');
    assert.equal(data.scores.content, 70);
    assert.equal(data.scores.confidence, null);
    assert.deepEqual(data.evidence, ['I built a pretend project']);
    assert.deepEqual(data.visual, []);
});

test('Gemini rejects truncated, refused, malformed, and invalid structured responses', async () => {
    for (const mocked of [output({ questions }, 'incomplete'), Response.json({ status: 'completed', steps: [] }), Response.json({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: 'bad JSON' }] }] }), output({ questions: [] })]) {
        assert.equal((await handleApi(request('questions', { count: 3 }), env, async () => mocked)).status, 502);
    }
});

test('Gemini provider errors never expose upstream details or credentials', async () => {
    for (const status of [401, 403, 429, 500]) {
        const response = await handleApi(request('questions', { count: 3 }), env, async () => new Response('test-secret private upstream details', { status }));
        assert.equal(response.status, 502);
        assert.ok(!JSON.stringify(await response.json()).includes('test-secret'));
    }
});

test('paid Gemini policy translates consented PDF and image data to inline content', async () => {
    const paid = { ...env, GEMINI_DATA_POLICY: 'paid' };
    const pdf = await handleApi(request('questions', { count: 3, resume: { name: 'sample.pdf', data: 'data:application/pdf;base64,AAAA' } }), paid, async (url, options) => {
        assert.deepEqual(JSON.parse(options.body).input[1], { type: 'document', mime_type: 'application/pdf', data: 'AAAA' });
        return output({ questions });
    });
    assert.equal(pdf.status, 200);
    const image = await handleApi(request('analyze', { ...body, frames: ['data:image/jpeg;base64,AAAA'] }), paid, async (url, options) => {
        assert.deepEqual(JSON.parse(options.body).input[1], { type: 'image', mime_type: 'image/jpeg', data: 'AAAA' });
        return output({ ...feedback, visual: ['The frame is dim.'] });
    });
    assert.deepEqual((await image.json()).visual, ['The frame is dim.']);
});

test('paid Gemini transcription forwards actual audio only with matching consent', async () => {
    const form = new FormData();
    form.set('cloudConsent', 'true'); form.set('providerConsent', 'gemini');
    form.set('file', new Blob(['test audio'], { type: 'audio/webm' }), 'answer.webm');
    const response = await handleApi(new Request('https://cadence.test/api/transcribe', { method: 'POST', body: form }), { ...env, GEMINI_DATA_POLICY: 'paid' }, async (url, options) => {
        const sent = JSON.parse(options.body);
        assert.equal(sent.store, false);
        assert.equal(sent.input[1].mime_type, 'audio/webm');
        assert.equal(atob(sent.input[1].data), 'test audio');
        return output({ text: 'A synthetic test transcript.' });
    });
    assert.equal((await response.json()).text, 'A synthetic test transcript.');
});
