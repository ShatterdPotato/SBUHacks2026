import test from 'node:test';
import assert from 'node:assert/strict';
import { genericProfile, profileForInterview } from '../lib/resume-profile.mjs';
import { resumeText } from '../lib/resume-text.mjs';
import { wordCount, deliveryMetrics, rubricAnalysis } from '../lib/interview.mjs';
import { providerError, providerFetch } from '../lib/provider.mjs';

test('explicit interview role takes precedence over a different resume background', () => {
    const source = 'Python PyTorch NLP Transformers Docker SQL';
    assert.equal(genericProfile(source, 'Software Engineering Intern').roleFamily, 'Software engineering');
    assert.equal(genericProfile(source, 'Electrical Engineer').roleFamily, 'Electrical engineering');
    assert.equal(genericProfile(source, 'Product Manager').roleFamily, 'Product management');
    assert.equal(genericProfile(source, 'Accountant').roleFamily, 'General interview');
    assert.equal(genericProfile(source, '  ').roleFamily, 'AI/ML engineering');
});

test('ML role abbreviations classify without sending arbitrary role text', () => {
    assert.equal(genericProfile('', 'ML Engineer').roleFamily, 'AI/ML engineering');
    assert.equal(genericProfile('', 'AI intern').roleFamily, 'AI/ML engineering');
});

test('job-description role takes priority when the explicit role field is empty', () => {
    const profile = profileForInterview({ context: 'Software engineering internship', resume: 'PyTorch NLP', source: 'resume' });
    assert.equal(profile.roleFamily, 'Software engineering');
    assert.ok(profile.skills.includes('PyTorch'));
});

test('unselected resume contributes no role or skills to prompt-only requests', () => {
    const profile = profileForInterview({ context: 'circuits and embedded systems', resume: 'PyTorch NLP SQL', source: 'prompt' });
    assert.equal(profile.roleFamily, 'Electrical engineering');
    assert.deepEqual(profile.skills, ['Circuits', 'Embedded systems']);
});

test('binary/control-character input cannot be claimed as readable resume text', () => {
    for (const value of ['Python\u0000SQL', '\u0001abc', '\ufffdcorrupted', '\u007f'])
        assert.throws(() => resumeText(value), /unreadable or binary/);
});

test('resume validation preserves readable international text and paragraph breaks', () => {
    assert.equal(resumeText('  简历\nPython\tSQL\fRésumé\r\n  '), '简历\nPython\tSQL\nRésumé');
    assert.equal(resumeText('x'.repeat(18000)).length, 18000);
    assert.throws(() => resumeText('x'.repeat(18001)), /18,000/);
    assert.throws(() => resumeText(' \n\t'), /empty/);
});

test('one shared word counter matches report metrics for Unicode and emoji', () => {
    for (const [answer, expected] of [['你好世界 这是 一个 示例 回答', 5], ['😀 😁 😄', 0], ['résumé café naïve', 3], ["don't over-fit", 2], ['--- ... !!!', 0]]) {
        assert.equal(wordCount(answer), expected);
        assert.equal(deliveryMetrics(answer, 60, false).words, expected);
        assert.equal(rubricAnalysis({ answer, question: { prompt: 'Explain.', focus: [] } }).metrics.words, expected);
    }
});

test('provider key errors classify safely even when Google uses HTTP 400', () => {
    const result = providerError(400, { error: { message: 'API key not valid. secret-credential-value', details: [{ reason: 'API_KEY_INVALID' }] } });
    assert.equal(result.code, 'credentials_rejected');
    assert.ok(!JSON.stringify(result).includes('secret-credential-value'));
    assert.match(result.message, /securely/);
});

test('provider errors distinguish quota, configuration, model, and outage failures', () => {
    assert.equal(providerError(429, {}).code, 'usage_limit');
    assert.equal(providerError(400, {}).code, 'request_rejected');
    assert.equal(providerError(404, {}).code, 'model_unavailable');
    assert.equal(providerError(503, {}).code, 'provider_unavailable');
});

test('one transient provider failure is retried at most once', async () => {
    const signals = [];
    let calls = 0;
    const data = await providerFetch('/interactions', { method: 'POST', body: '{}' }, { AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'test' }, async (url, options) => {
        signals.push(options.signal); calls++;
        return calls === 1 ? new Response('temporary', { status: 503 }) : Response.json({ ok: true });
    });
    assert.equal(calls, 2);
    assert.ok(signals.every(signal => signal instanceof AbortSignal));
    assert.equal(data.ok, true);
});

test('a transport failure uses the configured same-provider fallback model', async () => {
    let calls = 0;
    const models = [];
    const result = await providerFetch('/interactions', { method: 'POST', body: JSON.stringify({ model: 'gemini-3.5-flash-lite', store: false }) }, { AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'test', GEMINI_FALLBACK_MODEL: 'gemini-3.1-flash-lite' }, async (url, options) => {
        models.push(JSON.parse(options.body).model); calls++;
        if (calls === 1) throw new TypeError('network');
        return Response.json({ ok: true });
    });
    assert.deepEqual(models, ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
    assert.equal(result.ok, true);
});

test('persistent transport failure ends after two attempts with a safe code', async () => {
    let calls = 0;
    await assert.rejects(providerFetch('/interactions', { method: 'POST', body: '{}' }, { AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'test' }, async () => { calls++; throw new TypeError('private upstream details'); }), error => error.code === 'network_unavailable' && !error.message.includes('private upstream'));
    assert.equal(calls, 2);
});

test('invalid credentials are not retried and upstream details remain private', async () => {
    let calls = 0;
    await assert.rejects(providerFetch('/interactions', { method: 'POST', body: '{}' }, { AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'test' }, async () => {
        calls++;
        return Response.json({ error: { message: 'API key not valid. test' } }, { status: 400 });
    }), error => error.code === 'credentials_rejected' && !error.message.includes('not valid. test'));
    assert.equal(calls, 1);
});
