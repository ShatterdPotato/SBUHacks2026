import test from 'node:test';
import assert from 'node:assert/strict';
import { questionKind, nextTurnAction, canFollowUp } from '../lib/question-kind.mjs';
import { localTurn, localFollowup } from '../lib/conversation.mjs';
import { reportFor } from '../lib/interview.mjs';
import { answerMoments, selectMoments } from '../lib/recorded-delivery.mjs';
import { handleApi } from '../lib/service.mjs';
import { rubricFixture } from './fixtures/grading.mjs';

const intro={prompt:'What drew you to apply for this internship and what skills would you bring?',category:'Technical',focus:[]};
const motivation='I enjoy building useful tools because they help people. I have used drawing software for years and I am excited about this role.';
const technical={prompt:'Walk me through how you would investigate a recurring error.',category:'Technical',focus:['error']};
const escalation='First I would submit a ticket to IT. Then I would discuss the error with the team and schedule time for someone to fix it.';
const behavior={prompt:'Describe a time you disagreed with a teammate. What did you learn?',category:'Behavioral',focus:[]};
const env={AI_PROVIDER:'gemini',GEMINI_API_KEY:'test-only',GEMINI_DATA_POLICY:'unpaid'};
const consent={cloudConsent:true,providerConsent:'gemini',demoDataOnly:true,privacyMode:'fictional',nonSensitiveConsent:true};
const request=(path,body)=>new Request(`https://cadence.test/api/${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...consent,...body})});
const output=data=>Response.json({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(data)}]}]});
const feedback=(a,levels=[3,1,2,1])=>({summary:'Incorrect free-form praise: flawless answer.',strengths:['Unsupported claim.'],improvements:[],evidence:[a],visual:[],rubric:rubricFixture(a,levels),checks:[]});

test('introductions override a mistaken technical label; every behavioral category blocks probes',()=>{
    assert.deepEqual(questionKind(intro),{category:'Behavioral',purpose:'introduction'});
    for(const q of [intro,behavior,{category:'Behavioral',prompt:'How do you support colleagues?'}]){
        assert.equal(canFollowUp(q),false);assert.equal(localFollowup(q,motivation),'');
        assert.equal(nextTurnAction({question:q,words:80}), 'transition');
        assert.equal(nextTurnAction({question:q,words:80,topicIndex:2}), 'finish');
    }
    assert.equal(nextTurnAction({question:technical,words:80}),'probe');
    assert.equal(nextTurnAction({question:technical,words:80,isFollowup:true}),'transition');
});
test('local introduction coaching recognizes motivation and asks for contribution, never technical verification',()=>{
    const result=localTurn(intro,motivation,45,true);
    assert.equal(result.grading.category,'Behavioral');assert.equal(result.scores.comprehension,null);
    assert.ok(result.strengths.some(v=>v.includes('enjoy building useful tools')));
    assert.match(result.improvements.join(' '),/skill|contribution/);
    assert.doesNotMatch(result.improvements.join(' '),/test your assumptions|baseline|failure boundary|verify|technical/);
    assert.equal(result.scores.content,result.grading.score);
});
test('technical escalation without investigation gets specific diagnosis feedback and a matching low content score',()=>{
    const result=localTurn(technical,escalation,45,true);
    assert.ok(result.scores.content<60);assert.equal(result.scores.content,result.grading.score);
    assert.match(result.improvements.join(' '),/ticket to IT/);assert.match(result.improvements.join(' '),/cause|reproduc/);
    assert.ok(result.grading.criteria.some(c=>c.id==='reasoning'&&c.level===1));
});
test('behavioral scores and factual claims cannot contaminate technical aggregates, including all-behavioral sessions',()=>{
    const t={question:technical,analysis:{scores:{confidence:100,content:25,comprehension:30}}};
    const b={question:intro,analysis:{scores:{confidence:100,content:100,comprehension:100}}};
    const report=reportFor([t,b]);assert.equal(report.categoryScores.Technical,25);assert.equal(report.categoryScores.Behavioral,100);assert.equal(report.scores.comprehension,30);
    const only=reportFor([b]);assert.equal(only.categoryScores.Technical,null);assert.equal(only.scores.comprehension,null);
});
test('server preserves behavioral classification, forces transition and suppresses technical accuracy even for supplied claims',async()=>{
    const r=await handleApi(request('interview-turn',{question:intro,answer:motivation,role:'General interview',interview:{type:'Mixed',topicIndex:0,targetTopics:3,nextAction:'probe'}}),env,async(_,options)=>{
        const sent=JSON.parse(options.body),context=JSON.parse(sent.input[0].text);
        assert.equal(sent.generation_config.thinking_level,'high');assert.equal(context.questionKind.purpose,'introduction');assert.equal(context.interview.nextAction,'transition');
        return output({feedback:feedback(motivation),checks:[{quote:'useful tools',status:'contradicted',explanation:'Ignore invented classification.',referenceId:'change',severity:'critical'}],nextQuestion:{...technical,anchorQuote:''}});
    });
    assert.equal(r.status,200);const data=await r.json();assert.equal(data.nextAction,'transition');assert.equal(data.followup,'');assert.equal(data.analysis.grading.category,'Behavioral');assert.equal(data.analysis.scores.comprehension,null);assert.equal(data.analysis.knowledge.checks.length,0);
});
test('server rejects a disguised follow-up after a behavioral answer and finishes without a probe on the last topic',async()=>{
    const body={question:intro,answer:motivation,role:'General interview',interview:{type:'Mixed',topicIndex:0,targetTopics:3,nextAction:'probe'}};
    for(const nextQuestion of [{prompt:'How would you test that approach?',category:'Technical',focus:[],anchorQuote:''},{prompt:'Tell me more about these tools.',category:'Behavioral',focus:[],anchorQuote:''},{...technical,anchorQuote:'I enjoy building useful tools because they help people.'}]){
        const r=await handleApi(request('interview-turn',body),env,async()=>output({feedback:feedback(motivation),checks:[],nextQuestion}));assert.equal(r.status,502);
    }
    const r=await handleApi(request('interview-turn',{...body,interview:{...body.interview,topicIndex:2}}),env,async(_,options)=>{
        assert.equal(JSON.parse(JSON.parse(options.body).input[0].text).interview.nextAction,'finish');
        return output({feedback:feedback(motivation),checks:[],nextQuestion:{prompt:'',category:'Technical',focus:[],anchorQuote:''}});
    });assert.equal(r.status,200);assert.equal((await r.json()).followup,'');
});
test('individual behavioral grading and retry use the same high-reasoning behavioral rubric',async()=>{
    let calls=0;
    const r=await handleApi(request('analyze',{question:behavior,answer:motivation,mode:'live'}),env,async(_,options)=>{
        const sent=JSON.parse(options.body);assert.equal(sent.generation_config.thinking_level,'high');assert.match(sent.system_instruction,/behavioralCriteria/);
        assert.equal(JSON.parse(sent.input[0].text).questionKind.category,'Behavioral');
        return ++calls===1?new Response('',{status:503}):output(feedback(motivation));
    });
    assert.equal(r.status,200);assert.equal(calls,2);const data=await r.json();assert.equal(data.grading.category,'Behavioral');assert.equal(data.scores.comprehension,null);
});
test('displayed critique and content score follow criterion evidence, ignoring contradictory free-form praise',async()=>{
    const r=await handleApi(request('analyze',{question:technical,answer:escalation,mode:'live'}),env,async()=>output(feedback(escalation)));
    const data=await r.json();assert.equal(r.status,200);assert.equal(data.scores.content,44);assert.match(data.summary,/44\/100/);assert.doesNotMatch(data.summary,/flawless/);
    assert.ok(data.improvements.every(v=>data.grading.criteria.some(c=>v.includes(c.improvement))));
});
test('a grade without actionable justification fails closed',async()=>{
    const f=feedback(escalation);delete f.rubric.criteria[1].improvement;
    const r=await handleApi(request('analyze',{question:technical,answer:escalation,mode:'live'}),env,async()=>output(f));assert.equal(r.status,502);
});
function take(answer,question=technical,analysis=localTurn(question,answer,20,false)) {
    const words=answer.split(' ').map((text,i)=>({text,start:i*.7,end:i*.7+.6}));
    return {hasRecording:true,url:'blob:synthetic',mime:'video/webm',question,transcript:answer,words,duration:words.at(-1).end+.2,analysis};
}
test('each selected clip quotes its own speech and provides specific improvement or strength',()=>{
    const clips=selectMoments([take(escalation),take('I would reproduce the error with a minimal input because that isolates the trigger. I would inspect the error log and compare the fixed behavior against the same input.')]);
    const all=[...clips.best,...clips.worst];assert.ok(clips.worst.length);
    for(const c of all){assert.doesNotMatch(c.reason,/transcript structure and available delivery cues/);assert.match(c.reason,/\*\*/);assert.ok(c.reason.includes('“'));}
    assert.ok(clips.worst.some(c=>/cause|reproduc|evidence/.test(c.reason)));
    assert.ok(new Set(all.map(c=>c.reason)).size>1);
});
test('unrelated whole-answer AI praise cannot be attached to another excerpt',()=>{
    const a='I would submit the incident to a supervisor. I would reproduce the error with an isolated sample and read the error log.';
    const t=take(a);t.analysis.grading={method:'ai-rubric',criteria:[{id:'reasoning',label:'Reasoning',weight:30,level:4,evidence:'I would reproduce the error with an isolated sample and read the error log.',reason:'UNIQUE_SECOND_PASSAGE',improvement:''}]};
    const excerpts=answerMoments(t,0);assert.ok(excerpts.length>=2);
    assert.ok(!excerpts[0].reason.includes('UNIQUE_SECOND_PASSAGE'));assert.ok(excerpts.at(-1).reason.includes('UNIQUE_SECOND_PASSAGE'));
});
test('delivery cannot inflate clip content ranking, and whole-answer fallback has grounded feedback',()=>{
    const t=take(escalation),a=selectMoments([t]),b=selectMoments([{...t,audioEvidence:Array.from({length:200},(_,i)=>({at:i/10,rms:.05}))}]);
    assert.deepEqual(a.best.map(c=>c.score),b.best.map(c=>c.score));
    const whole=selectMoments([{...t,words:[]}]);assert.match(whole.best[0].reason,/ticket to IT/);
});
