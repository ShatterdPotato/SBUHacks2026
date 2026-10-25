import fs from 'node:fs/promises';
import { structured } from '../lib/provider.mjs';
const root=new URL('../',import.meta.url),env={...process.env,AI_PROVIDER:'gemini',__usage:[]};
if(!env.GEMINI_API_KEY){const local=await fs.readFile(new URL('.dev.vars',root),'utf8');env.GEMINI_API_KEY=local.match(/^GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)/m)?.[1].trim();}
if(!env.GEMINI_API_KEY)throw new Error('Configure a server-side key.');
const cases=[
 {id:'ml-correct',question:'TP=14, FP=6. What is precision as a decimal?',key:'Precision = TP/(TP+FP) = 14/20 = 0.7.',answer:'Precision is fourteen divided by twenty, so 0.7.',expected:'supported'},
 {id:'ml-wrong',question:'TP=14, FP=6. What is precision as a decimal?',key:'Precision = TP/(TP+FP) = 14/20 = 0.7.',answer:'Precision is fourteen divided by six, so about 2.33.',expected:'contradicted'},
 {id:'software-correct',question:'In Python, a=[1]; b=a; b.append(2). What is a?',key:'Both variables refer to the same mutable list; a is [1,2].',answer:'They alias the same list, so a is [1,2].',expected:'supported'},
 {id:'software-wrong',question:'In Python, a=[1]; b=a; b.append(2). What is a?',key:'Both variables refer to the same mutable list; a is [1,2].',answer:'Assignment makes a deep copy, so a stays [1].',expected:'contradicted'},
 {id:'hardware-correct',question:'Hit time 3 ns, miss rate 10%, additional miss penalty 70 ns: average access time?',key:'AMAT = 3 + 0.1*70 = 10 ns.',answer:'Every access pays three ns, plus seven ns expected miss cost: ten ns.',expected:'supported'},
 {id:'hardware-wrong',question:'Hit time 3 ns, miss rate 10%, additional miss penalty 70 ns: average access time?',key:'AMAT = 3 + 0.1*70 = 10 ns.',answer:'The cache hits ninety percent, so the average is three times 0.9, or 2.7 ns.',expected:'contradicted'},
 {id:'logic-correct',question:'What is a two-input XOR output for input 11?',key:'XOR is one exactly when the inputs differ; XOR(1,1)=0.',answer:'The inputs match, so XOR outputs zero.',expected:'supported'},
 {id:'logic-wrong',question:'What is a two-input XOR output for input 11?',key:'XOR is one exactly when the inputs differ; XOR(1,1)=0.',answer:'Either input being one makes XOR one, so it outputs one.',expected:'contradicted'}
];
const schema={type:'object',properties:{verdict:{type:'string',enum:['supported','contradicted','unverified']},quote:{type:'string'},justification:{type:'string'}},required:['verdict','quote','justification'],additionalProperties:false};
const results=[];
for(const model of (process.env.EVAL_MODELS||'gemini-3.5-flash-lite,gemini-3.8-flash').split(',')){
 for(const c of cases){
  try{const data=await structured('grader_verification_benchmark',schema,[{type:'input_text',text:JSON.stringify({task:'Evaluate factual correctness against this independently supplied answer key. Return an exact answer quote and a concise evidence-based justification. Do not infer personal traits.',question:c.question,answer:c.answer,reference:c.key})}],{...env,GEMINI_GRADING_MODEL:model},fetch);
   results.push({model,id:c.id,expected:c.expected,actual:data.verdict,correct:data.verdict===c.expected,grounded:!!data.quote&&c.answer.includes(data.quote),usage:env.__usage.at(-1)});
  }catch{results.push({model,id:c.id,expected:c.expected,actual:'request_failed',correct:false,grounded:false});}
  console.log(`${model}: ${c.id} complete`);
 }
}
const summary=[...new Set(results.map(r=>r.model))].map(model=>{const rows=results.filter(r=>r.model===model);return {model,cases:rows.length,correct:rows.filter(r=>r.correct).length,grounded:rows.filter(r=>r.grounded).length,failures:rows.filter(r=>r.actual==='request_failed').length,falseCriticism:rows.filter(r=>r.expected==='supported'&&r.actual==='contradicted').length,missedErrors:rows.filter(r=>r.expected==='contradicted'&&r.actual==='supported').length,meanSuccessfulLatencyMs:Math.round(rows.filter(r=>r.usage).reduce((n,r)=>n+r.usage.latencyMs,0)/Math.max(1,rows.filter(r=>r.usage).length))};});
await fs.mkdir(new URL('evaluations/',root),{recursive:true});
await fs.writeFile(new URL('evaluations/grader-benchmark.json',root),JSON.stringify({date:'2026-10-25',scope:'Eight fixed factual holdouts, independently specified keys. Not a human expert rubric-agreement or production latency benchmark. No automatic model promotion.',summary,results},null,2)+'\n');
console.log(JSON.stringify(summary));
