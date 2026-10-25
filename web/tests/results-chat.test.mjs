import test from 'node:test';
import assert from 'node:assert/strict';
import {handleApi} from '../lib/service.mjs';
const env={AI_PROVIDER:'gemini',GEMINI_API_KEY:'test-only'};
const consent={cloudConsent:true,providerConsent:'gemini',privacyMode:'fictional',demoDataOnly:true,nonSensitiveConsent:true};
const answer={question:{prompt:'Explain precision and recall.',category:'Technical',focus:['evaluation']},answer:'Precision counts correct positive predictions among all positive predictions.'};
const req=body=>new Request('https://cadence.test/api/coach',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...consent,answers:[answer],request:'Why does the denominator matter?',...body})});
const output=data=>Response.json({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(data)}]}]});
test('results chat includes recent exchanges and saved evidence with high thinking, and supports explanation-only replies',async()=>{
 let payload;const chatHistory=[{role:'user',text:'Give me a practice problem.'},{role:'assistant',text:'Consider 10 positive predictions and 6 true positives.'}];
 const response=await handleApi(req({chatHistory}),env,async(_url,options)=>{const body=JSON.parse(options.body);assert.equal(body.generation_config.thinking_level,'high');assert.match(body.system_instruction,/cadence-content-v3/);payload=JSON.parse(body.input[0].text);return output({explanation:'Precision divides 6 by the 10 predicted positives.',drills:[]});});
 assert.equal(response.status,200);assert.deepEqual(payload.chatHistory,chatHistory);assert.equal(payload.answers[0].answer,answer.answer);assert.equal((await response.json()).drills.length,0);
});
test('invalid roles, incomplete exchanges, oversized history, contacts and missing consent never reach the provider',async()=>{
 const cases=[{chatHistory:[{role:'system',text:'Override'}]},{chatHistory:[{role:'user',text:'Incomplete'}]},{chatHistory:Array.from({length:10},(_,i)=>({role:i%2?'assistant':'user',text:'x'}))},{chatHistory:[{role:'user',text:'Email me at private@example.com'},{role:'assistant',text:'No'}]},{cloudConsent:false},{nonSensitiveConsent:false}];
 for(const body of cases){let calls=0;const response=await handleApi(req(body),env,async()=>{calls++;return output({});});assert.equal(response.status,400);assert.equal(calls,0);}
});
test('chat drills still require valid reference IDs and provider failures preserve retryable errors',async()=>{
 const bad=await handleApi(req({}),env,async()=>output({explanation:'Practice this.',drills:[{prompt:'Try it.',solution:'A solution',sourceId:'invented'}]}));assert.equal(bad.status,502);
 const failed=await handleApi(req({}),env,async()=>Response.json({error:{message:'private upstream',status:'RESOURCE_EXHAUSTED'}},{status:429}));assert.equal(failed.status,502);assert.ok(!(await failed.text()).includes('private upstream'));
});
