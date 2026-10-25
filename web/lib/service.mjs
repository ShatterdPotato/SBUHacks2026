import {createSpeechResponse} from './elevenlabs-speech.mjs';
import { PREMIUM_ROUTES, premiumOperation } from './premium-service.mjs';
import { InputError, setupInput, retrieveQuestions, text, wordCount } from './interview.mjs';
import { providerConfig, assertCloudConsent, structured, transcribeFile } from './provider.mjs';
import { personalQuestionSetup, validateGenericProfile } from './resume-profile.mjs';
import { roleGuidance } from './role-context.mjs';
import { freshQuestions } from './question-variety.mjs';
import { localTurn } from './conversation.mjs';
import { ROLE_FAMILIES } from './role-context.mjs';
import { referencesFor, withKnowledge, reviewKnowledge } from './knowledge.mjs';
import { CONTENT_RUBRIC, distinctFeedback, scoreContentRubric, feedbackFromGrading } from './content-rubric.mjs';
import { questionKind, canFollowUp } from './question-kind.mjs';
import { questionSchema, feedbackSchema, turnSchema, gradedAnalysis, readQuestion, knowledgeFor } from './grading-core.mjs';
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
    if(path==='/api/speech')return createSpeechResponse(request,env,fetcher);
    env = {...env,__usage:[]};
    const baseJson=json;
    const reply=(data,status=200)=>baseJson({...data,usage:env.__usage},status);
    const config = providerConfig(env);
    try {
        if (path === '/api/health' && request.method === 'GET')
            return reply({ mode: config.cloudAvailable ? 'live' : 'demo', ...config });
        if (!['/api/questions', '/api/analyze', '/api/transcribe', '/api/interview-turn',...PREMIUM_ROUTES].includes(path))
            return reply({ error: 'Route not found.' }, 404);
        if (request.method !== 'POST')
            return reply({ error: 'Use POST.' }, 405);
        const origin = request.headers.get('origin');
        if (origin && origin !== new URL(request.url).origin)
            return reply({ error: 'Cross-origin requests are not allowed.' }, 403);
        if (PREMIUM_ROUTES.includes(path)) return reply(await premiumOperation(path,await bodyJson(request),env,fetcher));
        if (path === '/api/interview-turn') {
            const body = await bodyJson(request);
            if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Invalid interview turn.');
            if (!config.cloudAvailable) throw new InputError('AI is unavailable. Continue with local practice.', 503);
            assertCloudConsent(body, config);
            if (config.demoDataOnly && (body.privacyMode !== 'fictional' || body.nonSensitiveConsent !== true)) throw new InputError('Free Gemini conversational feedback needs explicit consent for fictional, non-sensitive practice answers.');
            const answer = text(body.answer, 'Answer', 12000);
            const question = readQuestion(body.question);
            const role = text(body.role, 'Role', 150);
            if (config.demoDataOnly && !ROLE_FAMILIES.includes(role)) throw new InputError('Use a broad role from the supplied topic list with free Gemini.');
            const rawHistory = body.history ?? [];
            if (!question.prompt || !Array.isArray(rawHistory) || rawHistory.length > 4 || rawHistory.some(t => !t || typeof t.question !== 'string' || typeof t.answer !== 'string' || t.question.length > 1200 || t.answer.length > 12000 || (t.feedback !== undefined && (!Array.isArray(t.feedback) || t.feedback.length > 4 || t.feedback.some(v=>typeof v!=='string'||v.length>1000))))) throw new InputError('Invalid interview history.');
            const history = rawHistory.map(t=>({question:t.question,answer:t.answer,...(t.feedback?{feedback:t.feedback}:{})}));
            if (config.demoDataOnly && /[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:\+?\d[\s().-]*){10,}\b/i.test(JSON.stringify({ question:question.prompt, answer, history }))) throw new InputError('Remove contact information. Free Gemini accepts only fictional, non-sensitive practice answers.');
            const duration = body.duration ?? 0;
            if (!Number.isFinite(duration) || duration < 0 || duration > 600) throw new InputError('Invalid duration.');
            const settings = body.interview ?? {};
            if (!settings || typeof settings !== 'object' || Array.isArray(settings) || Object.keys(settings).some(k=>!['profile','type','level','topicIndex','targetTopics','nextAction'].includes(k))) throw new InputError('Invalid interview context.');
            const setup = setupInput({ role, type:settings.type, level:settings.level, count:settings.targetTopics });
            const profile = settings.profile ? validateGenericProfile(settings.profile) : {roleFamily:ROLE_FAMILIES.includes(role)?role:'General interview',skills:[]};
            if (config.demoDataOnly && profile.roleFamily !== role) throw new InputError('The generic profile must match the interview role.');
            const topicIndex = settings.topicIndex ?? 0;
            let nextAction = settings.nextAction ?? 'probe';
            if (!Number.isInteger(topicIndex) || topicIndex < 0 || topicIndex >= setup.count || !['probe','transition','finish'].includes(nextAction)) throw new InputError('Invalid interview progress.');
            if (nextAction==='probe'&&!canFollowUp(question)) nextAction=topicIndex+1>=setup.count?'finish':'transition';
            const afterBehavioral = question.category==='Behavioral' && nextAction==='transition';
            const nextCategory = setup.type==='Mixed' && afterBehavioral ? 'Technical' : setup.type;
            const baseline = localTurn(question, answer, duration, body.recorded === true);
            const references = [...referencesFor(question.prompt), ...referencesFor(answer)].filter((r,i,all)=>all.findIndex(v=>v.id===r.id)===i);
            const data = await structured('interview_turn', turnSchema, [{ type:'input_text', text:JSON.stringify({
                task:'Grade this answer with the mandatory rubric. Then write the next single conversational question from the latest response, recent history and interview context. There is no preset question slate. Do not give coaching or reveal the answer in the spoken question.',
                interviewing:nextAction==='probe'?'Probe one specific ambiguity, unsupported step or consequential claim in the latest response. Ask a short natural question, not several subquestions.':nextAction==='transition'?'Move to a fresh role-relevant angle or scenario shaped by what the candidate just said. Bridge naturally; do not reuse a prepared question or re-ask an answered question.':'The interview is complete. Return an empty next question prompt and empty anchorQuote.',
                style:'Maximum 45 words. Match role, focus and experience level. Occasionally highlight a short exact line from the CURRENT answer in anchorQuote when clarification needs it; otherwise leave anchorQuote empty. Never invent quotations or repeat the same generic opening. Keep the prompt conversational and vary probes. Critical factual gaps should shape a probe before moving on.',
                transitionRule:afterBehavioral?`The behavioral answer is COMPLETE. Ask an independent NEW ${nextCategory} scenario or topic. Do not ask for an example, elaboration or verification of the previous answer. Do not refer to "these tools", "that approach" or "you mentioned". anchorQuote MUST be empty. If focus is Behavioral, move to a different behavioral theme such as teamwork or prioritization.`:'Follow the requested nextAction. Only technical answers can be probed.',
                roleGuidance:roleGuidance(role), interview:{role,profile,type:setup.type,level:setup.level,topicIndex,targetTopics:setup.count,nextAction},
                question:question.prompt, questionKind:questionKind(question), transcript:answer, history,
                references, deterministicChecks:baseline.knowledge.checks,
                grading:'Apply the current system rubric; return criterion evidence and source excerpts for factual checks. Unsupported claims stay unverified. Feedback must identify the biggest answer-specific gap and concrete revision, with brief bold emphasis and no redundant bullets.'
            }) }], env, fetcher);
            const next = data.nextQuestion;
            if (!Array.isArray(data.checks) || data.checks.length > 20 || !next || typeof next.prompt !== 'string' || next.prompt.length > 600 || wordCount(next.prompt)>45 || (nextAction!=='finish' && !next.prompt.trim()) || !['Behavioral','Technical'].includes(next.category) || (setup.type!=='Mixed'&&next.category!==setup.type) || !Array.isArray(next.focus) || next.focus.length > 12 || !next.focus.every(v=>typeof v==='string'&&v.length<=100) || typeof next.anchorQuote !== 'string' || next.anchorQuote.length > 160 || (next.anchorQuote && !answer.includes(next.anchorQuote))) throw new InputError('The AI question or evidence was incomplete. Continue locally or retry.',502);
            if (nextAction!=='finish' && freshQuestions([next],[question.prompt,...history.map(t=>t.question)]).length===0) throw new InputError('The AI repeated an earlier question. This turn can continue locally.',502);
            if (afterBehavioral && (next.anchorQuote || (nextCategory!=='Mixed'&&questionKind(next).category!==nextCategory) || /\b(you mentioned|these tools|that approach|that experience|you just (?:said|described))\b/i.test(next.prompt))) throw new InputError('The AI tried to follow up on a behavioral answer. Moving to a new local topic.',502);
            const knowledge = knowledgeFor(question,answer,data.checks);
            const analysis = gradedAnalysis(data.feedback,answer,baseline,knowledge,false,history.flatMap(t=>t.feedback??[]));
            return reply({ analysis, nextAction, nextQuestion:{...next,...questionKind(next),prompt:next.prompt.trim(),source:'generated'}, followup:nextAction==='probe'?next.prompt.trim():'' });
        }
        if (path === '/api/questions') {
            const body = await bodyJson(request);
            const genericOnly = config.demoDataOnly && body?.privacyMode === 'personal';
            const setup = setupInput(genericOnly ? personalQuestionSetup(body) : body);
            const live = config.cloudAvailable && setup.cloudConsent;
            if (setup.resume && !live)
                throw new InputError('PDF analysis needs an AI key and cloud consent. Paste resume text instead.');
            const questionCount = setup.format === 'conversation' ? 1 : setup.count;
            if (!live)
                return reply({ mode: 'demo', questions: retrieveQuestions(setup).slice(0,questionCount) });
            assertCloudConsent(body, config, { genericOnly });
            if (setup.resume && !config.pdfCloudAvailable)
                throw new InputError('Free Gemini practice accepts fictional text only. PDF resumes are not sent to this provider.');
            const content = [{ type: 'input_text', text: `${setup.format === 'conversation' ? 'Write ONE warm, concise opening question for a natural conversation. The following questions will be generated after each answer, not as a preset slate.' : `Generate exactly ${setup.count} distinct conversational questions, each one focused and natural rather than a multipart checklist.`} Interview focus: ${setup.type}; questions for a ${setup.level} ${setup.role} interview. ${roleGuidance(setup.role)} Resume/context is secondary transferable background, never the primary subject if it conflicts with the target job. For cashier/restaurant jobs, use service, accuracy, teamwork and practical register scenarios, not programming or ML. Technical means job-specific practical knowledge. Include short focus keywords. Vary situations and openings; do not always open with a project question. Interview variation ${setup.variation}. Context: ${setup.context}` }];
            if (setup.resume)
                content.push({ type: 'input_file', filename: setup.resume.name, file_data: setup.resume.data });
            const data = await structured('interview_questions', questionSchema, content, env, fetcher);
            if (!Array.isArray(data.questions) || data.questions.length !== questionCount || data.questions.some(q => !q || typeof q.prompt !== 'string' || !q.prompt.trim() || q.prompt.length > 1200 || !['Behavioral', 'Technical'].includes(q.category) || !Array.isArray(q.focus) || !q.focus.every(w => typeof w === 'string' && w.length <= 100)))
                throw new InputError('AI questions were incomplete. Please retry.', 502);
            if (Array.isArray(data.questions) && freshQuestions(data.questions).length !== data.questions.length) throw new InputError('The AI repeated a question. Please regenerate this interview.', 502);
            return reply({ mode: 'live', provider: config.provider, questions: data.questions.map((q, i) => ({ ...q, ...questionKind(q), id: `ai-${i + 1}`, source: 'generated' })) });
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
            return reply({ text: data.text });
        }
        const body = await bodyJson(request);
        if (!body || typeof body !== 'object' || Array.isArray(body))
            throw new InputError('Invalid answer.');
        if (config.demoDataOnly && body.privacyMode === 'personal')
            throw new InputError('Personal answers use the browser practice rubric with this free setup; they are not sent for cloud analysis.');
        const answer = text(body.answer, 'Answer', 20000);
        const question = readQuestion(body.question);
        if (!question.prompt || !Array.isArray(question.focus) || question.focus.length > 12 || !question.focus.every(v => typeof v === 'string' && v.length <= 100))
            throw new InputError('Include a valid question and focus list.');
        const duration = body.duration ?? 0;
        if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0 || duration > 600)
            throw new InputError('Invalid answer duration.');
        const baseline = localTurn(question, answer, duration, body.recorded === true);
        const live = config.cloudAvailable && body.cloudConsent === true && body.mode === 'live';
        if (!live || baseline.metrics.words < 5)
            return reply(baseline);
        assertCloudConsent(body, config);
        const frames = body.frames ?? [];
        if (!Array.isArray(frames) || frames.length > 4 || frames.some(f => typeof f !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(f) || f.length > 180000))
            throw new InputError('Use at most four small JPEG samples.');
        if (frames.length && !config.mediaCloudAvailable)
            throw new InputError('Camera frames cannot be sent during free Gemini practice. Use fictional text only.');
        const references = [...referencesFor(question.prompt),...referencesFor(answer)].filter((r,i,all)=>all.findIndex(v=>v.id===r.id)===i);
        const content = [{ type:'input_text', text:JSON.stringify({ task:'Analyze the actual answer carefully against the requested question before grading. Use the category-specific mandatory rubric. For each criterion return a precise justification tied to a short literal quote or a clearly identified omission, plus a concrete improvement. Check that each level agrees with its reason. Never demand technical validation for a behavioral introduction.',question:question.prompt,questionKind:questionKind(question),transcript:answer,references,deterministicChecks:baseline.knowledge.checks }) }, ...frames.map(image_url=>({type:'input_image',image_url,detail:'low'}))];
        const data = await structured('interview_feedback',feedbackSchema,content,env,fetcher);
        if (!Array.isArray(data.checks) || data.checks.length > 20) throw new InputError('AI reference checks were incomplete. Please retry.',502);
        const knowledge = knowledgeFor(question,answer,data.checks);
        return reply(gradedAnalysis(data,answer,baseline,knowledge,frames.length>0));
    }
    catch (e) {
        if(e instanceof InputError&&e.status===502&&env.__usage.at(-1)?.status==='completed')env.__usage.at(-1).validationFailed=true;
        if (e instanceof InputError)
            return reply({ error: e.message, code: e.code }, e.status);
        return reply({ error: 'Request failed. Your current recording remains in this browser.' }, 500);
    }
}
