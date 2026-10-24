import test from 'node:test';
import assert from 'node:assert/strict';
import { genericProfile, personalQuestionRequest, validateGenericProfile } from '../lib/resume-profile.mjs';
import { handleApi } from '../lib/service.mjs';

const env = { AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'test', GEMINI_DATA_POLICY: 'unpaid' };
const request = body => new Request('https://cadence.test/api/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const source = 'Jordan Private, jordan.private@example.com. Confidential Acme project. Python, PyTorch, SQL, Docker, RAG, model evaluation. GPA 3.8, Example University.';
const profile = genericProfile(source);
const payload = () => personalQuestionRequest({ profile, count: 3, type: 'Mixed', level: 'Internship', provider: 'gemini', cloudConsent: true });
const never = async () => assert.fail('Personal content must not reach the provider.');

test('generic skill extraction retains only fixed labels and a broad role', () => {
    assert.equal(profile.roleFamily, 'AI/ML engineering');
    assert.ok(profile.skills.includes('PyTorch'));
    assert.ok(profile.skills.includes('SQL'));
    for (const detail of ['Jordan', 'jordan.private', 'Acme', 'University', '3.8'])
        assert.ok(!JSON.stringify(profile).includes(detail));
});

test('personal question payload drops all source data and accepts topic exclusions', () => {
    const body = personalQuestionRequest({ profile: { ...profile, skills: profile.skills.filter(s => s !== 'SQL') }, count: 3, type: 'Mixed', level: 'Internship', provider: 'gemini', cloudConsent: true, resume: source, answer: source });
    assert.ok(!body.profile.skills.includes('SQL'));
    assert.deepEqual(Object.keys(body).sort(), ['privacyMode', 'profile', 'count', 'type', 'level', 'providerConsent', 'cloudConsent'].sort());
    assert.ok(!JSON.stringify(body).includes('jordan.private'));
});

test('personal mode sends only validated generic topics to Gemini without fictional-data attestation', async () => {
    let sent;
    const response = await handleApi(request(payload()), env, async (url, options) => {
        sent = JSON.parse(options.body);
        return Response.json({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify({ questions: Array.from({ length: 3 }, (_, i) => ({ prompt: `Explain general ML topic ${i + 1}.`, category: 'Technical', focus: ['model'] })) }) }] }] });
    });
    assert.equal(response.status, 200);
    assert.match(sent.input[0].text, /PyTorch/);
    for (const detail of ['Jordan', 'jordan.private', 'Acme', 'University', '3.8'])
        assert.ok(!JSON.stringify(sent).includes(detail));
});

test('server rejects raw source fields even when a personal profile is valid', async () => {
    for (const extra of [{ context: source }, { role: 'Jordan Private' }, { resume: { data: source } }, { answer: source }, { frames: [] }])
        assert.equal((await handleApi(request({ ...payload(), ...extra }), env, never)).status, 400);
});

test('server rejects arbitrary role labels, topic injection, and extra profile fields', async () => {
    for (const bad of [{ roleFamily: 'Jordan Private', skills: [] }, { ...profile, skills: ['Python', 'Acme private project'] }, { ...profile, name: 'Jordan' }, { ...profile, skills: 'Python' }]) {
        assert.throws(() => validateGenericProfile(bad));
        assert.equal((await handleApi(request({ ...payload(), profile: bad }), env, never)).status, 400);
    }
});

test('personal generic questions still require matching provider consent', async () => {
    assert.equal((await handleApi(request({ ...payload(), providerConsent: 'openai' }), env, never)).status, 400);
    const result = await handleApi(request({ ...payload(), cloudConsent: false }), env, never);
    assert.equal((await result.json()).mode, 'demo');
});

test('personal answers cannot be sent for free Gemini analysis even with fictional attestation', async () => {
    const response = await handleApi(new Request('https://cadence.test/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ privacyMode: 'personal', question: { prompt: 'Describe your work.', focus: [] }, answer: source, mode: 'live', cloudConsent: true, providerConsent: 'gemini', demoDataOnly: true }) }), env, never);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /browser practice rubric/);
});

test('empty personal profiles are valid and yield generic interview questions', async () => {
    const blank = genericProfile('');
    assert.deepEqual(blank, { roleFamily: 'General interview', skills: [] });
    const response = await handleApi(request({ ...payload(), profile: blank, cloudConsent: false }), env, never);
    assert.equal((await response.json()).questions.length, 3);
});
