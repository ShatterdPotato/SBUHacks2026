import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from '../lib/service.mjs';
import { rubricFixture } from './fixtures/grading.mjs';
import { executableQuestions, executeCheck, checkAnswer } from '../lib/verified-exercises.mjs';
import { TECHNICAL_BANK, bankEntry, publicQuestion, coverageSchedule, sampleBank } from '../lib/technical-bank.mjs';
const env={AI_PROVIDER:'gemini',GEMINI_API_KEY:'test-only'};
const consent={cloudConsent:true,providerConsent:'gemini',privacyMode:'fictional',demoDataOnly:true,nonSensitiveConsent:true};
const req=(path,body)=>new Request(`https://cadence.test/api/${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...consent,...body})});
const output=data=>Response.json({status:'completed',usage:{total_input_tokens:100,total_output_tokens:80,total_thought_tokens:40,total_tokens:180},steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(data)}]}]});
const intro={prompt:'What drew you to this role?',category:'Behavioral',purpose:'introduction',focus:['skills']};
const answer='I enjoy solving problems and would bring careful testing skills to this role.';
const plan={profile:{roleFamily:'AI/ML engineering',skills:['Model evaluation']},type:'Mixed',level:'Internship',count:3,schedule:['Technical','Behavioral','Technical'],priorities:['model evaluation']};
const feedback=a=>({summary:'Assessment',strengths:[],improvements:[],visual:[],evidence:[],rubric:rubricFixture(a,[3,2,2,2]),checks:[]});

test('every premium text route requires explicit consent before any provider call',async()=>{
 for(const path of ['plan','interviewer','grade','regrade','clip-feedback','session-report','coach']){
  let calls=0;const response=await handleApi(req(path,{cloudConsent:false}),env,()=>{calls++;throw new Error();});
  assert.equal(response.status,400);assert.equal(calls,0);
 }
});
test('personal transcripts and contact details cannot reach unpaid premium calls',async()=>{
 for(const body of [{privacyMode:'personal'},{nonSensitiveConsent:false},{answer:'Email jane@example.org about this.'}]){
  let calls=0;const r=await handleApi(req('grade',{question:intro,answer,...body}),env,()=>{calls++;});assert.equal(r.status,400);assert.equal(calls,0);
 }
});
test('durations and generated IDs are not mistaken for contact information',async()=>{
 const r=await handleApi(req('grade',{question:{...intro,id:'123456789012'},answer,duration:12.1234567890123}),env,async()=>output(feedback(answer)));
 assert.equal(r.status,200);
});
test('planning uses only generic context and maintains requested category quotas',async()=>{
 let sent;const response=await handleApi(req('plan',{...plan,privateResume:'DO NOT FORWARD',privacyMode:'personal'}),env,async(_u,o)=>{sent=JSON.parse(o.body);return output({priorities:['evaluation'],openingQuestion:intro.prompt});});
 const data=await response.json();assert.equal(response.status,200);assert.equal(sent.generation_config.thinking_level,'high');assert.ok(!JSON.stringify(sent).includes('DO NOT FORWARD'));assert.equal(data.plan.schedule.filter(x=>x==='Technical').length,2);assert.equal(data.questions[0].purpose,'introduction');assert.equal(data.usage[0].thoughtTokens,40);
});
test('coverage remains exact for all session lengths and randomized orders',()=>{
 for(let count=3;count<=6;count++)for(const type of ['Mixed','Technical','Behavioral']){
  const result=coverageSchedule(type,count);assert.equal(result.length,count);assert.equal(result.filter(c=>c==='Technical').length,type==='Technical'?count:type==='Behavioral'?0:Math.ceil(count/2));
 }
});
test('introduction transitions to a concrete bank task without receiving a probe',async()=>{
 let payload;const r=await handleApi(req('interviewer',{question:intro,answer,history:[],plan,followups:true}),env,async(_u,o)=>{const sent=JSON.parse(o.body);payload=JSON.parse(sent.input[0].text);assert.equal(sent.generation_config.thinking_level,'high');return output({action:'transition',prompt:payload.nextTask.prompt,anchorQuote:'',probeIntent:''});});
 const data=await r.json();assert.equal(r.status,200);assert.equal(payload.mayProbe,false);assert.equal(data.nextQuestion.category,'Technical');assert.ok(bankEntry(data.nextQuestion.bankId));assert.equal(data.nextQuestion.anchorQuote,'');
});
test('technical main questions cannot be replaced by behavioral prose or a different task',async()=>{
 const r=await handleApi(req('interviewer',{question:intro,answer,history:[],plan,followups:true}),env,async()=>output({action:'transition',prompt:'Tell me about a time you worked on a team.',anchorQuote:'',probeIntent:''}));assert.equal(r.status,502);
});
test('adaptive technical probe includes actual context and forbids another probe',async()=>{
 const question=publicQuestion(executableQuestions[0]);const technicalAnswer='I divide true positives by all actual positives, because that gives precision.';
 const body={question,answer:technicalAnswer,history:[{question:intro,answer}],plan,followups:true};
 let payload;const fetcher=async(_u,o)=>{payload=JSON.parse(JSON.parse(o.body).input[0].text);return output({action:'probe',prompt:'Which denominator counts predicted positives rather than actual positives?',anchorQuote:'all actual positives',probeIntent:'Resolve confusion between precision and recall.'});};
 const r=await handleApi(req('interviewer',body),env,fetcher);assert.equal(r.status,200);assert.equal(payload.answer,technicalAnswer);assert.ok(payload.answerKey.essentialFacts.length);assert.equal((await r.json()).nextQuestion.isFollowup,true);
 const twice=await handleApi(req('interviewer',{...body,history:[...body.history,{question,answer:technicalAnswer}],question:{...question,isFollowup:true}}),env,fetcher);assert.equal(twice.status,502);
});
test('fabricated quoted anchors and early termination are rejected',async()=>{
 for(const data of [{action:'probe',prompt:'Why?',anchorQuote:'invented',probeIntent:'gap'},{action:'finish',prompt:'',anchorQuote:'',probeIntent:''}]){const r=await handleApi(req('interviewer',{question:intro,answer,history:[],plan,followups:true}),env,async()=>output(data));assert.equal(r.status,502);}
});
test('question answer-key mismatches and tampered coverage never reach the provider',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return output({});};
 const wrong=await handleApi(req('grade',{question:{...publicQuestion(executableQuestions[0]),prompt:'A different technical task'},answer}),env,fetcher);assert.equal(wrong.status,400);
 const quota=await handleApi(req('interviewer',{question:intro,answer,history:[],plan:{...plan,schedule:['Behavioral','Behavioral','Behavioral']}}),env,fetcher);assert.equal(quota.status,400);assert.equal(calls,0);
});
test('independent calculations have known expected outputs, including truth-table simulation',()=>{
 const expected=[.8,.6,2/3,.8,9,5/3,4.4,4,5,5,10,4,5,6,34,2,6,128,20,1600,24,1.6,100,2.5,45,-6,5,4,4,0,'0110','1110'];
 executableQuestions.forEach((q,i)=>{const result=executeCheck(q.checker);if(typeof result==='number')assert.ok(Math.abs(result-expected[i])<1e-10,`${q.id}: ${result}`);else assert.equal(result,expected[i]);});
 assert.throws(()=>executeCheck({operation:'arbitrary-code',args:{}}));
});
test('factual checker accepts a clear result, rejects mismatches, and abstains on ambiguity',()=>{
 const q=executableQuestions[0];assert.equal(checkAnswer(q,'Final: 0.8')[0].status,'supported');assert.equal(checkAnswer(q,'Final: 4/5')[0].status,'supported');assert.equal(checkAnswer(q,'Final: 0.2')[0].status,'contradicted');
 for(const a of ['Final: 80%','There were 24 positives and 6 false positives.','Final: 0.2. Actually Final: 0.8.'])assert.equal(checkAnswer(q,a).length,0);
});
test('grading consults the rubric, uses executable evidence, and performs independent verification',async()=>{
 const question=publicQuestion(executableQuestions[0]),a='Precision is my chosen metric. Final: 0.2';let calls=0;
 const r=await handleApi(req('grade',{question,answer:a}),env,async(_u,o)=>{calls++;const sent=JSON.parse(o.body);assert.equal(sent.generation_config.thinking_level,'high');assert.match(sent.system_instruction,/MANDATORY RUBRIC/);const input=JSON.parse(sent.input[0].text);assert.equal(input.deterministicChecks[0].status,'contradicted');return output(feedback(a));});
 const data=await r.json();assert.equal(r.status,200);assert.equal(calls,2);assert.equal(data.scores.comprehension,0);assert.ok(data.scores.content<=59);assert.equal(data.verification.status,'completed');assert.equal(data.usage.length,2);
});
test('verification failures retain the first assessment as provisional',async()=>{
 const question=publicQuestion(executableQuestions[0]),a='I think precision is important. Final: 0.2';let calls=0;
 const r=await handleApi(req('grade',{question,answer:a}),env,async()=>++calls===1?output(feedback(a)):Response.json({error:{}},{status:429}));const d=await r.json();assert.equal(r.status,200);assert.equal(d.aiStatus,'provisional');assert.equal(d.verification.status,'pending');
});
test('behavioral grading has no technical accuracy and regrade gets an independent pass',async()=>{
 let calls=0;const r=await handleApi(req('regrade',{question:intro,answer,appeal:'My motivation was explicitly stated.'}),env,async()=>{calls++;return output(feedback(answer));});const d=await r.json();assert.equal(r.status,200);assert.equal(calls,2);assert.equal(d.scores.comprehension,null);assert.equal(d.grading.category,'Behavioral');
});
test('clip feedback must quote the corresponding excerpt, with no media upload',async()=>{
 const clip={id:'c1',question:intro,transcript:answer,answer,grading:{...rubricFixture(answer),method:'ai-rubric'},start:3,end:12,kind:'worst'};
 const valid={kind:'improvement',id:'c1',quote:'careful testing skills',strength:'**Specific skill:** You identify testing.',improvement:'**Add an example:** Name a testing task you performed.',justification:'The skill is relevant, but this excerpt gives no example.'};
 for(const [quote,status] of [[valid.quote,200],['words never spoken',502]]){
  const r=await handleApi(req('clip-feedback',{clips:[clip]}),env,async(_u,o)=>{const sent=JSON.parse(o.body);assert.equal(sent.generation_config.thinking_level,'high');assert.equal(sent.input.length,1);assert.equal(JSON.parse(sent.input[0].text).clips[0].grading.criteria.length,4);return output({clips:[{...valid,quote}]});});assert.equal(r.status,status);
 }
});
test('report patterns require exact answer evidence and preserve valid grade context',async()=>{
 const body={answers:[{question:intro,answer,grading:{...rubricFixture(answer),method:'ai-rubric'}}]};
 let sent;const r=await handleApi(req('session-report',body),env,async(_u,o)=>{sent=JSON.parse(JSON.parse(o.body).input[0].text);return output({summary:'Testing is your stated contribution.',patterns:[{answerIndex:0,quote:'careful testing skills',observation:'Give one testing example.'}],priorities:['Describe a concrete test.']});});assert.equal(r.status,200);assert.equal(sent.answers[0].grading.criteria.length,4);
 const bad=await handleApi(req('session-report',body),env,async()=>output({summary:'Summary',patterns:[{answerIndex:4,quote:'invented',observation:'Unsupported'}],priorities:['Practice.']}));assert.equal(bad.status,502);
});
test('practice coaching validates sources rather than accepting invented citations',async()=>{
 const body={answers:[{question:intro,answer}],request:'Help me explain my skills.'};
 for(const [sourceId,status] of [['',200],['invented-reference',502]]){const r=await handleApi(req('coach',body),env,async()=>output({explanation:'Give an example.',drills:[{prompt:'Describe a testing task.',solution:'State your role, action and result.',sourceId}]}));assert.equal(r.status,status);}
});
test('random retrieval excludes seen IDs and preserves the requested track',()=>{
 const first=sampleBank('AI/ML engineering','Internship',6);const next=sampleBank('AI/ML engineering','Internship',6,[],first.map(q=>q.bankId));assert.equal(next.length,6);assert.ok(next.every(q=>q.track==='ai-ml'&&!first.some(p=>p.bankId===q.bankId)));assert.equal(new Set(next.map(q=>q.bankId)).size,6);
});

test('premium grades retain separately consented paid visual observations',async()=>{
 const frames=['data:image/jpeg;base64,aGVsbG8='];let sent;
 const r=await handleApi(req('grade',{question:intro,answer,frames,visualConsent:true}),{...env,GEMINI_DATA_POLICY:'paid'},async(_u,o)=>{sent=JSON.parse(o.body);return output({...feedback(answer),visual:['The shoulders are within the frame.']});});
 assert.equal(r.status,200);assert.equal(sent.input[1].type,'image');assert.deepEqual((await r.json()).visual,['The shoulders are within the frame.']);
});
test('premium grades reject camera frames without consent or with unpaid policy',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return output(feedback(answer));};const body={question:intro,answer,frames:['data:image/jpeg;base64,aGVsbG8=']};
 assert.equal((await handleApi(req('grade',body),{...env,GEMINI_DATA_POLICY:'paid'},fetcher)).status,400);
 assert.equal((await handleApi(req('grade',{...body,visualConsent:true}),env,fetcher)).status,400);assert.equal(calls,0);
});
