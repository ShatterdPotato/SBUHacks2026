import test from 'node:test';
import assert from 'node:assert/strict';
import {gradeSavedAnswers} from '../lib/session-grading.mjs';
import {reportRatings} from '../lib/report-ratings.mjs';
import {handleApi} from '../lib/service.mjs';
import {bankEntry,publicQuestion} from '../lib/technical-bank.mjs';
import {rubricFixture} from './fixtures/grading.mjs';
const take=(i=0,extra={})=>({question:{id:String(i),prompt:'Explain amortized append cost.',category:'Technical'},transcript:'Appending usually takes constant time; resizing requires a copy.',transcriptSource:'typed',cloudEligible:true,duration:30,url:'blob:saved',hasRecording:false,delivery:null,analysis:{mode:'local',aiStatus:'pending',scores:{content:50,confidence:null,comprehension:100},metrics:{wpm:null},grading:{criteria:[{id:'relevance',level:2},{id:'completeness',level:4}]}},...extra});
const result={aiStatus:'complete',scores:{content:75,confidence:100,comprehension:80},metrics:{wpm:30},referenceAnswer:'Amortized O(1).'};
test('end-session grading bounds concurrency, preserves order and local media, removes frames',async()=>{
 let active=0,peak=0,calls=0;const progress=[];
 const answers=Array.from({length:5},(_,i)=>take(i,{gradingMedia:{consent:true,frames:['image']}}));
 const output=await gradeSavedAnswers(answers,{consent:{cloudConsent:true},request:async(path,body)=>{calls++;assert.equal(path,'/api/grade');assert.equal(body.assessmentMode,'content');assert.equal(body.visualConsent,true);peak=Math.max(peak,++active);await new Promise(r=>setTimeout(r,5));active--;return result;},onProgress:p=>progress.push(p)});
 assert.equal(calls,5);assert.equal(peak,2);assert.deepEqual(output.map(t=>t.question.id),['0','1','2','3','4']);assert.equal(output[0].url,'blob:saved');assert.equal(output[0].analysis.scores.confidence,null);assert.equal(output[0].analysis.scores.comprehension,null);assert.equal(output[0].gradingMedia,undefined);assert.equal(progress.at(-1).completed,5);assert.equal(answers[0].analysis.aiStatus,'pending');
});
test('local, skipped and empty answers never upload; a failed grade retains its answer',async()=>{
 let calls=0;const output=await gradeSavedAnswers([take(0,{cloudEligible:false}),take(1,{transcriptSource:'skipped'}),take(2,{transcript:''}),take(3)],{consent:{},request:async()=>{calls++;throw new Error('Provider timeout');}});
 assert.equal(calls,1);assert.equal(output[3].analysis.aiStatus,'failed');assert.equal(output[3].url,'blob:saved');assert.equal(output[3].transcript,take().transcript);
});
test('cancelling assessment stops the queue while preserving retryable answers',async()=>{
 const controller=new AbortController();let calls=0;
 const output=await gradeSavedAnswers([take(),take(1),take(2)],{signal:controller.signal,consent:{},request:async()=>{calls++;controller.abort();return result;}});
 assert.equal(calls,1);assert.ok(output.every(t=>t.analysis.aiStatus==='failed'));assert.ok(output.every(t=>t.url==='blob:saved'));
});
test('ratings ignore factual score, behavior and absent delivery evidence',()=>{
 const values=reportRatings([take(),take(1,{question:{category:'Behavioral',prompt:'Why this role?'},analysis:{...take().analysis,scores:{content:100,comprehension:0,confidence:null}}})]);
 assert.deepEqual(values.map(v=>v.score),[75,null,50]);assert.equal(reportRatings([])[2].score,null);assert.equal(reportRatings([take(2,{analysis:{...take().analysis,scores:{content:50,confidence:99,comprehension:100}}})])[1].score,null);
});
test('content assessment uses one high-thinking rubric/key call and no factual pipeline',async()=>{
 const question=publicQuestion(bankEntry('software-001')),answer='Worst case is O(N), but amortized is O(1).';let calls=0;
 const request=new Request('https://cadence.test/api/grade',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question,answer,assessmentMode:'content',cloudConsent:true,providerConsent:'gemini',privacyMode:'fictional',demoDataOnly:true,nonSensitiveConsent:true})});
 const response=await handleApi(request,{AI_PROVIDER:'gemini',GEMINI_API_KEY:'test-only'},async(_url,options)=>{
  calls++;const body=JSON.parse(options.body);assert.equal(body.generation_config.thinking_level,'high');assert.match(body.system_instruction,/cadence-content-v3/);assert.match(body.system_instruction,/interviewer/i);assert.equal(body.response_format.schema.properties.checks,undefined);assert.ok(JSON.parse(body.input[0].text).answerKey.solution);
  return Response.json({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify({summary:'Assessment',strengths:[],improvements:[],visual:[],evidence:[],rubric:rubricFixture(answer)})}]}]});
 });
 const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));assert.equal(calls,1);assert.equal(data.aiStatus,'complete');assert.equal(data.knowledge,undefined);assert.equal(data.scores.comprehension,null);assert.equal(data.scores.content,75);assert.ok(data.referenceAnswer);
});
