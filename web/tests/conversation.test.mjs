import { rubricFixture } from './fixtures/grading.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from '../lib/service.mjs';
import { localTurn } from '../lib/conversation.mjs';
import { setupInput, retrieveQuestions } from '../lib/interview.mjs';
import { genericProfile } from '../lib/resume-profile.mjs';
import { freshQuestions } from '../lib/question-variety.mjs';
import { selectMoments, recordedDelivery } from '../lib/recorded-delivery.mjs';
import { preferRefinedWords } from '../lib/speech-refinement.mjs';
const env={AI_PROVIDER:'gemini',GEMINI_API_KEY:'test',GEMINI_DATA_POLICY:'unpaid'};
const question={prompt:'An order costs $8.65 and the customer gives you $20. What change is due?',focus:[]};
const body={question,answer:'I would give the customer $10.35 in change, checking the amount carefully.',role:'Retail cashier / customer service',history:[],duration:30,recorded:true,cloudConsent:true,providerConsent:'gemini',demoDataOnly:true,privacyMode:'fictional',nonSensitiveConsent:true};
const req=b=>new Request('https://cadence.test/api/interview-turn',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
const response=value=>{if(value.followup)value={...value,nextQuestion:{prompt:value.followup,category:'Technical',focus:[],anchorQuote:''}};return Response.json({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(value)}]}]});};
const feedback={content:60,comprehension:95,summary:'Check the arithmetic.',strengths:['You described a check.'],improvements:['Recalculate change.'],evidence:['$10.35','invented quote'],visual:['invented observation'],rubric:rubricFixture('$10.35'),checks:[]};
test('cashier role overrides an ML resume for profiles and every technical question',()=>{
    const profile=genericProfile('Python PyTorch NLP Transformer model evaluation, circuits','McDonald’s cashier');
    assert.equal(profile.roleFamily,'Retail cashier / customer service');assert.ok(!profile.skills.includes('PyTorch'));
    for(let i=0;i<20;i++){
        const qs=retrieveQuestions(setupInput({role:'McDonalds cashier',context:'PyTorch model developer circuits',type:'Technical',count:6}));
        assert.equal(qs.length,6);assert.ok(qs.every(q=>!/model|circuit|code|predictive|service that receives/i.test(q.prompt)));
    }
});
test('successive sessions avoid recent questions while the bank has alternatives',()=>{
    const setup=setupInput({role:'cashier',type:'Technical',count:3});let prior=[];
    for(let i=0;i<3;i++){const qs=retrieveQuestions(setup,{previous:prior});assert.equal(freshQuestions(qs,prior).length,3);prior.push(...qs.map(q=>q.prompt));}
    assert.equal(freshQuestions([{prompt:'How do you handle a difficult customer?'},{prompt:'How do you handle a difficult customer?'}]).length,1);
    assert.equal(freshQuestions([{prompt:'Tell me about working with a coworker during a fast-paced shift.'}],['Describe a time you supported a team member on a stressful shift.']).length,0);
});
test('mixed sessions keep all requested questions when one category exhausts first',()=>{
    const setup=setupInput({role:'Software engineer',type:'Mixed',count:6});let prior=[];
    for(let i=0;i<10;i++){const qs=retrieveQuestions(setup,{previous:prior});assert.equal(qs.length,6);assert.equal(qs.filter(q=>q.category==='Behavioral').length,3);assert.equal(new Set(qs.map(q=>q.id)).size,6);prior.push(...qs.map(q=>q.prompt));}
});
test('arithmetic is checked in cents and fabricated personal outcomes remain unverified',()=>{
    const wrong=localTurn(question,'I would return $10.35 after checking the change.',20,true);
    assert.equal(wrong.scores.comprehension,0);assert.equal(wrong.knowledge.checks[0].status,'contradicted');
    assert.equal(localTurn(question,'I would return $11.35 after checking the change.',20,true).scores.comprehension,100);
    const madeup=localTurn({prompt:'Tell me about your work.',focus:[]},'I invented a cosmic neural register and increased sales by 9000 percent.',20,true);
    assert.equal(madeup.scores.comprehension,null);assert.match(madeup.knowledge.coverage,/unverified/);
    assert.equal(localTurn(question,'$11.35 is incorrect; I would give $5 instead.',20,true).scores.comprehension,null);
});
test('turn endpoint rejects missing consent, personal mode, contact data and oversized history without a call',async()=>{
    const never=()=>assert.fail('Provider must not be called');
    for(const patch of [{cloudConsent:false},{providerConsent:'openai'},{demoDataOnly:false},{nonSensitiveConsent:false},{privacyMode:'personal'},{role:'Arbitrary private role'},{answer:'Contact madeup@example.com'},{history:Array(5).fill({question:'q',answer:'a'})}]){
        assert.equal((await handleApi(req({...body,...patch}),env,never)).status,400);
    }
});
test('free Gemini follow-up receives bounded transcript history and checks only valid quoted reference claims',async()=>{
    let sent;
    const fetcher=async(_,options)=>{sent=JSON.parse(options.body);return response({feedback,followup:'How would you check that calculation?',checks:[{quote:'$10.35',status:'supported',explanation:'Model got this wrong',referenceId:'change'},{quote:'invented quote',status:'supported',explanation:'bad',referenceId:'change'},{quote:'customer',status:'supported',explanation:'bad',referenceId:'fabricated-source'}]});};
    const result=await handleApi(req({...body,history:[{question:'A prior fictional question',answer:'A fictional answer'}],resume:'MUST NEVER BE FORWARDED'}),env,fetcher);
    assert.equal(result.status,200);const data=await result.json();
    assert.equal(data.analysis.mode,'live');assert.equal(data.analysis.scores.comprehension,0);
    assert.equal(data.analysis.knowledge.checks.length,1);assert.equal(data.analysis.knowledge.checks[0].status,'contradicted');
    assert.deepEqual(data.analysis.evidence,['$10.35']);assert.deepEqual(data.analysis.visual,[]);
    assert.equal(data.analysis.knowledge.references[0].id,'change');assert.match(JSON.stringify(sent),/11\.35/);
    assert.match(data.analysis.summary,/factual error/i);
    assert.match(data.followup,/check that calculation/);
    assert.equal(sent.store,false);assert.ok(!JSON.stringify(sent).includes('MUST NEVER BE FORWARDED'));
});
test('unreferenced AI claims stay unverified and do not create a knowledge score',async()=>{
    const b={...body,question:{prompt:'Tell me about a fictional achievement.',focus:[]},answer:'I invented a new principle that increases every number by infinite percent.'};
    const r=await handleApi(req(b),env,async()=>response({feedback:{...feedback,rubric:rubricFixture('infinite percent')},followup:'How did you verify that result?',checks:[{quote:'infinite percent',status:'supported',explanation:'claimed fact',referenceId:'invented'},{quote:'infinite percent',status:'unverified',explanation:'No supplied reference verifies this.',referenceId:''}]}));
    const d=await r.json();assert.equal(d.analysis.scores.comprehension,null);assert.equal(d.analysis.knowledge.checks.length,1);
});
test('individual-answer feedback also overrides incorrect AI arithmetic praise',async()=>{
    const request=new Request('https://cadence.test/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,mode:'live'})});
    const result=await handleApi(request,env,async()=>response({...feedback,summary:'The change was calculated correctly.'}));
    const data=await result.json();assert.equal(data.scores.comprehension,0);assert.match(data.summary,/factual error/i);
});
test('continuous recording moments use their global session offsets',()=>{
    const transcript='First I checked the order because accuracy matters. Then I counted change and confirmed the total with the customer.';
    const words=transcript.split(' ').map((text,i)=>({text,start:i*.7,end:i*.7+.5}));
    const takes=[0,80].map((offset,i)=>({question:{focus:[]},transcript,words,duration:20,audioEvidence:[],visionEvidence:[],hasRecording:true,url:'blob:one-session',mime:'video/webm',recordingOffset:offset,analysis:{scores:{confidence:70,content:60,comprehension:null}}}));
    const moments=selectMoments(takes);assert.ok(moments.best.length&&moments.worst.length);
    for(const m of [...moments.best,...moments.worst])assert.ok(m.start>=takes[m.answerIndex].recordingOffset&&m.end<=takes[m.answerIndex].recordingOffset+20);
    const fallback=selectMoments(takes.map(t=>({...t,words:[]})));assert.equal(fallback.worst[0].start,80);
});
test('sparse landmark detections never become a misleading visual score',()=>{
    const transcript=Array(30).fill('word').join(' ');
    const vision=Array.from({length:40},(_,i)=>({at:i,facing:i<8?true:null,shouldersVisible:i<8?true:null}));
    const d=recordedDelivery({transcript,duration:45,vision});assert.equal(d.score,null);assert.equal(d.components.length,0);
});
test('complete-answer refinement cannot erase recognized live speech',()=>{
    const live=Array.from({length:30},(_,i)=>({text:'word',start:i,end:i+.5}));
    assert.equal(preferRefinedWords(live,live.slice(0,15)),live);
    assert.equal(preferRefinedWords(live,[]),live);
    const refined=live.map(w=>({...w,text:'corrected'}));assert.equal(preferRefinedWords(live,refined),refined);
});
