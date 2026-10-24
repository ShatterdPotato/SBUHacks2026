import test from 'node:test';
import assert from 'node:assert/strict';
import { setupInput, retrieveQuestions, rubricAnalysis, deliveryMetrics, reportFor } from '../lib/interview.mjs';
import { handleApi } from '../lib/service.mjs';
const req = (path, body, headers = {}) => new Request(`https://cadence.test/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const question = { prompt: 'Describe your project and its result.', focus: ['project', 'built', 'result'] };
const answer = 'I built a project to process requests. First I measured the old service. Then I tested a cache because repeat requests were slow. The result was a 30 percent reduction in response time. I learned to measure before optimizing.';
const mockOutput = value => Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(value) }] }] });
test('all session lengths and focus choices return enough unique questions', () => {
    for (const type of ['Mixed', 'Technical', 'Behavioral'])
        for (const count of [3, 4, 5, 6]) {
            const questions = retrieveQuestions(setupInput({ type, count }));
            assert.equal(questions.length, count);
            assert.equal(new Set(questions.map(q => q.id)).size, count);
            if (type !== 'Mixed')
                assert.ok(questions.every(q => q.category === type));
        }
});
test('retrieval selects role-relevant technical questions', () => {
    const questions = retrieveQuestions(setupInput({ role: 'Machine learning engineer', type: 'Technical', count: 3 }));
    assert.match(questions[0].prompt, /model/i);
});
test('invalid setup and unconsented PDF are rejected', () => {
    assert.throws(() => setupInput({ count: 100 }));
    assert.throws(() => setupInput({ context: 'a'.repeat(20001) }));
    assert.throws(() => setupInput({ resume: { data: 'data:application/pdf;base64,AAAA' }, cloudConsent: false }));
});
test('missing transcript and unrecorded delivery remain unavailable', () => {
    const result = rubricAnalysis({ answer: '', question });
    assert.deepEqual(result.scores, { confidence: null, content: null, comprehension: null });
    assert.equal(deliveryMetrics(answer, 60, false).confidence, null);
    assert.equal(deliveryMetrics(answer, 0, true).wpm, null);
});
test('delivery metrics use actual duration and count filler phrases', () => {
    const metrics = deliveryMetrics(`${answer} um uh you know`, 60, true);
    assert.equal(metrics.fillers, 3);
    assert.equal(metrics.wpm, metrics.words);
    assert.ok(metrics.confidence >= 0 && metrics.confidence <= 100);
});
test('report ranks recorded answers and excludes missing scores from means', () => {
    const data = [{ hasRecording: true, analysis: { scores: { confidence: null, content: 90, comprehension: 80 } } }, { hasRecording: false, analysis: { scores: { confidence: null, content: 100, comprehension: 100 } } }, { hasRecording: true, analysis: { scores: { confidence: 60, content: 40, comprehension: 50 } } }, { hasRecording: true, analysis: { scores: { confidence: null, content: null, comprehension: null } } }];
    const report = reportFor(data);
    assert.equal(report.best, 0);
    assert.equal(report.worst, 2);
    assert.equal(report.scores.confidence, 60);
    assert.equal(reportFor([]).overall, null);
});
test('API never calls the provider without explicit cloud consent', async () => {
    let calls = 0;
    const fetcher = async () => { calls++; throw new Error('Must not call'); };
    const result = await handleApi(req('questions', { count: 3 }), { OPENAI_API_KEY: 'test' }, fetcher);
    assert.equal((await result.json()).mode, 'demo');
    assert.equal(calls, 0);
    const analysis = await handleApi(req('analyze', { answer, question, mode: 'live' }), { OPENAI_API_KEY: 'test' }, fetcher);
    assert.equal((await analysis.json()).mode, 'demo');
    assert.equal(calls, 0);
});
test('live question request uses strict structured output and store:false', async () => {
    let sent;
    const fetcher = async (url, options) => { sent = JSON.parse(options.body); return mockOutput({ questions: Array.from({ length: 3 }, (_, i) => ({ prompt: `Question ${i}?`, category: 'Technical', focus: ['test'] })) }); };
    const response = await handleApi(req('questions', { count: 3, cloudConsent: true }), { OPENAI_API_KEY: 'test' }, fetcher);
    const result = await response.json();
    assert.equal(result.mode, 'live');
    assert.equal(result.questions.length, 3);
    assert.equal(sent.store, false);
    assert.equal(sent.text.format.strict, true);
    assert.match(sent.instructions, /untrusted data/);
});
test('live feedback filters invented evidence and unobserved visuals', async () => {
    const fetcher = async () => mockOutput({ content: 80, comprehension: 75, summary: 'Specific example', strengths: ['Concrete measurement'], improvements: ['Explain the baseline'], evidence: ['I built a project', 'I launched a spaceship'], visual: ['Invented image observation'] });
    const response = await handleApi(req('analyze', { answer, question, mode: 'live', cloudConsent: true, duration: 60, recorded: true }), { OPENAI_API_KEY: 'test' }, fetcher);
    const data = await response.json();
    assert.equal(data.mode, 'live');
    assert.deepEqual(data.evidence, ['I built a project']);
    assert.deepEqual(data.visual, []);
    assert.equal(data.scores.content, 80);
});
test('provider errors stay errors rather than silently fabricating AI results', async () => {
    const response = await handleApi(req('questions', { count: 3, cloudConsent: true }), { OPENAI_API_KEY: 'test' }, async () => new Response('private upstream details', { status: 429 }));
    assert.equal(response.status, 502);
    const data = await response.json();
    assert.match(data.error, /usage limit/);
    assert.ok(!JSON.stringify(data).includes('private upstream'));
});
test('malformed model output is rejected', async () => {
    const response = await handleApi(req('questions', { count: 3, cloudConsent: true }), { OPENAI_API_KEY: 'test' }, async () => mockOutput({ questions: [] }));
    assert.equal(response.status, 502);
});
test('API rejects cross-origin, invalid JSON, and oversized request bodies', async () => {
    assert.equal((await handleApi(req('questions', {}, { origin: 'https://elsewhere.test' }))).status, 403);
    assert.equal((await handleApi(new Request('https://cadence.test/api/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' }))).status, 400);
    assert.equal((await handleApi(req('questions', {}, { 'Content-Length': '5000000' }))).status, 413);
    assert.equal((await handleApi(req('analyze', { question, answer, duration: -1 }))).status, 400);
});
test('transcription requires consent and configured credentials', async () => {
    assert.equal((await handleApi(req('transcribe', {}))).status, 503);
    const form = new FormData();
    form.set('file', new Blob(['audio'], { type: 'audio/webm' }), 'answer.webm');
    const response = await handleApi(new Request('https://cadence.test/api/transcribe', { method: 'POST', body: form }), { OPENAI_API_KEY: 'test' }, () => { throw new Error('Must not call'); });
    assert.equal(response.status, 400);
});
test('consented transcription forwards audio and returns actual provider text', async () => {
    const form = new FormData();
    form.set('file', new Blob(['audio'], { type: 'audio/webm' }), 'answer.webm');
    form.set('cloudConsent', 'true');
    let endpoint;
    const fetcher = async (url, options) => { endpoint = url; assert.equal(options.body.get('file').name, 'answer.webm'); return Response.json({ text: 'A real test transcript.' }); };
    const response = await handleApi(new Request('https://cadence.test/api/transcribe', { method: 'POST', body: form }), { OPENAI_API_KEY: 'test' }, fetcher);
    assert.equal((await response.json()).text, 'A real test transcript.');
    assert.match(endpoint, /audio\/transcriptions$/);
});
