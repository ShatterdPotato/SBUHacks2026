import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from '../lib/service.mjs';
import { bankEntry, bankReference, publicQuestion } from '../lib/technical-bank.mjs';
import { knowledgeScore, literalSpan, localKnowledge, reviewKnowledge } from '../lib/knowledge.mjs';
import { checkAnswer, executableQuestions } from '../lib/verified-exercises.mjs';
import { reportFor } from '../lib/interview.mjs';
import { rubricFixture } from './fixtures/grading.mjs';

const env={AI_PROVIDER:'gemini',GEMINI_API_KEY:'test-only'};
const consent={cloudConsent:true,providerConsent:'gemini',privacyMode:'fictional',demoDataOnly:true,nonSensitiveConsent:true};
const req=(body,path='grade')=>new Request(`https://cadence.test/api/${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...consent,...body})});
const output=data=>Response.json({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(data)}]}]});
const feedback=(answer,checks=[])=>({summary:'Assessment',strengths:[],improvements:[],visual:[],evidence:[],rubric:rubricFixture(answer),checks});
const question=publicQuestion(bankEntry('software-001'));
const answer='Worst case is O(N), but amortized is O(1).';
const check=(q,a,status='supported')=>({quote:a,status,explanation:status==='contradicted'?'The reference gives constant amortized cost, not linear amortized cost.':'Your stated result agrees with the supplied answer key.',referenceId:`key:${q.bankId}`,referenceExcerpt:bankReference(q)[0].text.split('\n')[0],severity:'major'});

test('short technical notation receives sourced accuracy instead of the five-word bypass',async()=>{
 const q=publicQuestion(bankEntry('hardware-001')),a='0xFFFFF800';let calls=0;
 const r=await handleApi(req({question:q,answer:a}),env,async()=>{calls++;return output(feedback(a,[check(q,a)]));});
 const d=await r.json();assert.equal(r.status,200);assert.equal(calls,1);assert.equal(d.scores.comprehension,100);assert.equal(d.aiStatus,'complete');
});

test('missing combined-grade checks trigger a focused factual review with real key evidence',async()=>{
 let calls=0;const r=await handleApi(req({question,answer}),env,async(_u,o)=>{
  const body=JSON.parse(o.body);calls++;
  if(calls===1)return output(feedback(answer));
  assert.match(body.system_instruction,/CURRENT INTERVIEW OPERATION: answer_accuracy/);
  assert.equal(body.generation_config.thinking_level,'high');assert.equal(body.generation_config.max_output_tokens,16384);
  assert.equal(body.response_format.schema.properties.assessment.type,'string');
  assert.ok(JSON.parse(body.input[0].text).references.some(r=>r.id==='key:software-001'));
  return output({assessment:'checked',reason:'Both complexity claims match the supplied key.',checks:[check(question,answer)]});
 });
 const d=await r.json();assert.equal(r.status,200);assert.equal(calls,2);assert.equal(d.scores.comprehension,100);assert.equal(d.accuracyReview.status,'completed');
});

test('empty or invalid focused evidence stays provisional and retryable',async()=>{
 for(const checks of [[],[{...check(question,answer),referenceExcerpt:'invented source text'}]]){
  let calls=0;const r=await handleApi(req({question,answer}),env,async()=>output(++calls===1?feedback(answer):{assessment:'checked',reason:'Checked.',checks}));
  const d=await r.json();assert.equal(d.aiStatus,'provisional');assert.equal(d.scores.comprehension,null);assert.equal(d.knowledge.accuracyStatus,'pending');assert.match(d.knowledge.coverage,/retry/i);
 }
});

test('legitimate abstention distinguishes no assertion from a changed-probe reference gap',async()=>{
 for(const [assessment,a,q] of [['no_claims','I do not know the answer.',question],['out_of_reference','I would use a different growth factor of one point five.',{...question,isFollowup:true,prompt:'How does a different growth factor change the constant?'}]]){
  let calls=0;const r=await handleApi(req({question:q,answer:a}),env,async()=>output(++calls===1?feedback(a):{assessment,reason:'The given evidence does not support a factual score for this response.',checks:[]}));
  const d=await r.json();assert.equal(d.aiStatus,'complete');assert.equal(d.scores.comprehension,null);assert.equal(d.knowledge.accuracyStatus,assessment);
 }
});

test('a newly discovered factual error reassesses criterion explanations before completion',async()=>{
 const a='Amortized append is O(N).';let calls=0;
 const r=await handleApi(req({question,answer:a}),env,async(_u,o)=>{
  calls++;const body=JSON.parse(o.body);
  if(calls===1){const f=feedback(a);f.rubric.criteria.forEach(c=>{c.level=4;c.reason='You correctly explain that amortized append is O(N).';});return output(f);}
  if(calls===2)return output({assessment:'checked',reason:'The amortized cost is wrong.',checks:[check(question,a,'contradicted')]});
  assert.match(body.system_instruction,/CURRENT INTERVIEW OPERATION: answer_verification/);
  const f=feedback(a,[check(question,a,'contradicted')]);f.rubric.criteria.forEach(c=>{c.level=1;c.reason='Your O(N) claim confuses a single resizing append with amortized cost across all appends.';});return output(f);
 });
 const d=await r.json();assert.equal(calls,3);assert.equal(d.aiStatus,'complete');assert.equal(d.scores.comprehension,0);assert.equal(d.grading.score,d.scores.content);assert.ok(d.grading.criteria.every(c=>!c.reason.includes('correctly explain')));assert.equal(d.verification.status,'completed');
});

test('failed rubric reassessment after a factual error cannot masquerade as complete',async()=>{
 const a='Amortized append is O(N).';let calls=0;
 const r=await handleApi(req({question,answer:a}),env,async()=>++calls===1?output(feedback(a)):calls===2?output({assessment:'checked',reason:'Wrong complexity.',checks:[check(question,a,'contradicted')]}):Response.json({error:{}},{status:429}));
 const d=await r.json();assert.equal(d.aiStatus,'provisional');assert.equal(d.scores.comprehension,0);assert.equal(d.verification.status,'pending');
});

test('verification must address the flagged claim instead of replacing it with unrelated praise',async()=>{
 const a='Worst case is O(N). Amortized append is also O(N).';let calls=0;
 const wrong=check(question,'Amortized append is also O(N).','contradicted');
 const r=await handleApi(req({question,answer:a}),env,async()=>output(++calls===1?feedback(a,[wrong]):feedback(a,[check(question,'Worst case is O(N).')])));
 const d=await r.json();assert.equal(d.aiStatus,'provisional');assert.equal(d.scores.comprehension,0);assert.equal(d.verification.status,'pending');assert.ok(d.knowledge.checks.some(c=>c.quote===wrong.quote&&c.status==='contradicted'));
});

test('valid sourced evidence supersedes an earlier unverified classification',()=>{
 const c=check(question,answer);const k=reviewKnowledge(question,answer,[{...c,status:'unverified',referenceExcerpt:''},c]);
 assert.equal(k.checks.length,1);assert.equal(k.checks[0].status,'supported');assert.equal(knowledgeScore(k),100);
});

test('line-wrap differences preserve canonical evidence without allowing paraphrases',()=>{
 assert.equal(literalSpan('Lists are\nmutable.','Lists are mutable.',400),'Lists are\nmutable.');
 assert.equal(literalSpan('Lists are not mutable.','Lists are mutable.',400),null);
 assert.equal(literalSpan('Lists are mutable.','Lists are ... mutable.',400),null);
 const c=check(question,answer);const k=reviewKnowledge(question,answer,[{...c,referenceExcerpt:c.referenceExcerpt.replaceAll(' ','\n')}]);assert.equal(knowledgeScore(k),100);assert.ok(bankReference(question)[0].text.includes(k.checks[0].referenceExcerpt));
});

test('a correct executable result does not hide a separate contradictory explanation',()=>{
 const entry=executableQuestions.find(q=>q.checker.operation==='truth-table'&&q.checker.args.gate==='xor'),q=publicQuestion(entry);
 const a='Truth table: 0110. XOR is true when both inputs are equal.';
 const c=check(q,'XOR is true when both inputs are equal.','contradicted');
 const k=reviewKnowledge(q,a,[c]);assert.equal(k.checks.length,2);assert.equal(knowledgeScore(k),50);
});

test('unambiguous bare calculations work locally without speaking a formatting prefix',()=>{
 const entry=executableQuestions[0];assert.equal(checkAnswer(entry,'0.8')[0].status,'supported');assert.equal(checkAnswer(entry,'4/5')[0].status,'supported');assert.equal(checkAnswer(entry,'0.2')[0].status,'contradicted');assert.equal(checkAnswer(entry,'0.8 or 0.2').length,0);
});

test('local semantic feedback explains pending AI review and report counts preserve zero',()=>{
 const k=localKnowledge(question,answer);assert.equal(k.accuracyStatus,'needs_ai');assert.match(k.coverage,/has not compared/);assert.doesNotMatch(k.coverage,/No checkable claim/);
 const takes=[{question,transcript:answer,analysis:{scores:{content:40,confidence:null,comprehension:0},knowledge:{checks:[check(question,answer,'contradicted')]}}},{question,transcript:answer,analysis:{scores:{content:60,confidence:null,comprehension:null},knowledge:k}}];
 const r=reportFor(takes);assert.equal(r.scores.comprehension,0);assert.deepEqual(r.accuracyCoverage,{answers:2,checkedAnswers:1,claims:1,localOnly:1,pending:0});
});

test('technical probes cannot silently become behavioral questions during grading',async()=>{
 const plan={profile:{roleFamily:'Software engineering',skills:[]},type:'Technical',level:'Internship',count:3,schedule:['Technical','Technical','Technical'],priorities:['algorithms']};
 const r=await handleApi(req({question,answer:'Worst case is linear, but amortized cost is constant over many operations.',history:[],plan,followups:true},'interviewer'),env,async()=>output({action:'probe',prompt:'Tell me about a project where you used this array resizing strategy.',anchorQuote:'',probeIntent:'Explore the candidate’s experience.'}));assert.equal(r.status,502);
});
