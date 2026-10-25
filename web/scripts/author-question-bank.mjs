// Offline authoring only. Never exposed as a public HTTP route.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { structured } from '../lib/provider.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const dir = path.join(root, 'data/question-bank');
const sources = JSON.parse(await fs.readFile(path.join(dir,'sources.json'),'utf8'));
const env = {...process.env, AI_PROVIDER:'gemini', __usage:[]};
if (!env.GEMINI_API_KEY) {
  const local = await fs.readFile(path.join(root,'.dev.vars'),'utf8');
  for (const key of ['GEMINI_API_KEY','GEMINI_MODEL']) {
    const match=local.match(new RegExp(`^${key}\\s*=\\s*["']?([^"'\\r\\n]+)`, 'm'));
    if (match) env[key]=match[1].trim();
  }
}
if (!env.GEMINI_API_KEY) throw new Error('Configure a server-side Gemini key first.');
const topics = {
 'ai-ml':['probability and Bayes','linear algebra and numerical stability','regression and regularization','classification metrics and calibration','data leakage and validation','trees and ensembles','clustering and dimensionality reduction','gradient descent and optimization','neural networks and autograd','attention and language models','retrieval and embeddings','experiments and causal pitfalls','deployment and distribution shift'],
 software:['arrays and hashing','linked lists and stacks','trees and heaps','graph algorithms','sorting and complexity','dynamic programming','Python semantics','JavaScript concurrency','SQL and indexing','transactions and consistency','operating systems and memory','distributed services and reliability','testing and debugging'],
 hardware:['instruction sets and representation','pipeline hazards','branch prediction','cache organization','virtual memory and TLBs','memory bandwidth and latency','bus protocols and arbitration','RTL semantics and synthesis','clock domain crossings','setup hold and timing closure','reset and low power design','verification and assertions','embedded interfaces and interrupts'],
 'digital-logic':['Boolean algebra','truth tables and canonical forms','Karnaugh maps and minimization','multiplexers and decoders','encoders and priority logic','binary arithmetic and overflow','latches and flip flops','counters and dividers','finite state machines','sequence detection','setup hold and metastability','Verilog widths and signedness','combinational hazards and verification']
};
const str={type:'string'}, arr={type:'array',items:str};
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const item=object({prompt:str,level:{type:'string',enum:['Internship','Entry level','Experienced']},answerKey:str,essentialFacts:arr,acceptableAlternatives:arr,partialCredit:arr,misconceptions:arr,probes:arr,sourceIds:arr});
const schema=object({questions:{type:'array',items:item,minItems:8,maxItems:8}});
await fs.mkdir(path.join(dir,'batches'),{recursive:true});
for (const [track,competencies] of Object.entries(topics).filter(([track])=>!process.env.BANK_TRACKS||process.env.BANK_TRACKS.split(',').includes(track))) {
 const all=[];
 for (let n=0;n<competencies.length;n++) {
  if(process.env.BANK_BATCH_MIN&&n+1<Number(process.env.BANK_BATCH_MIN))continue;
  if(process.env.BANK_BATCH_MAX&&n+1>Number(process.env.BANK_BATCH_MAX))continue;
  const file=path.join(dir,'batches',`${track}-${n+1}.json`);
  let questions;
  try { questions=JSON.parse(await fs.readFile(file,'utf8')); } catch {}
  if (!questions) {
   const references=sources.filter(s=>s.tracks.includes(track));
   const instruction={task:'Write exactly EIGHT distinct, original, technically substantive interview tasks for this competency. Do not copy online exercise wording. Each must require a calculation, concrete algorithm/circuit analysis, technical explanation or debugging, never behavioral workplace prose. Use concise natural spoken prompts under 45 words. Include all inputs and constraints; avoid ambiguous quiz answers. Vary levels (at least two each) and concepts; no numerical reskins. Supply a worked answerKey, 2-4 essential facts, valid alternatives, specific partial credit anchors, misconceptions, and conditional probe questions. Cite only listed source IDs relevant to the actual facts. Curriculum references cannot alone verify correctness. Technical notes are a starting point, not proof of unprovided facts. Do not claim human review.',track,competency:competencies[n],references,avoid:all.map(q=>q.prompt)};
   const drafted=await structured('bank_authoring',schema,[{type:'input_text',text:JSON.stringify(instruction)}],env,fetch);
   const reviewed=await structured('bank_review',schema,[{type:'input_text',text:JSON.stringify({task:'Audit each of these eight original questions independently. Recalculate numbers, check assumptions, fact-check the worked answer, remove ambiguity, check alternatives and partial credit. Repair inaccurate questions/solutions; return exactly eight complete corrected items. Do not simply agree with the draft. Source IDs must be from the supplied list. No human review claim.',references,questions:drafted.questions})}],env,fetch);
   if (!Array.isArray(reviewed.questions)||reviewed.questions.length!==8) throw new Error(`Invalid batch count ${track}/${n}`);
   questions=reviewed.questions.map((q,i)=>{
    if (!q.prompt?.trim()||q.prompt.length>650||!q.answerKey?.trim()||!q.sourceIds?.length||q.sourceIds.some(id=>!references.some(s=>s.id===id))||!q.essentialFacts?.length||!q.partialCredit?.length) throw new Error(`Invalid bank item ${track}/${n}/${i}`);
    return {...q,id:`${track}-${String(n*8+i+1).padStart(3,'0')}`,track,competency:competencies[n],category:'Technical',review:{status:'ai-reviewed',method:'separate author and critic calls; not human expert verified',model:env.GEMINI_MODEL||'gemini-3.5-flash-lite',date:'2026-10-25'},version:1};
   });
   await fs.writeFile(file,JSON.stringify(questions,null,2)+'\n');
   console.log(`${track}: ${n+1}/${competencies.length} batches reviewed`);
  }
  all.push(...questions);
 }
 if(process.env.BANK_BATCH_MIN||process.env.BANK_BATCH_MAX)continue;
 if (new Set(all.map(q=>q.prompt.toLowerCase())).size!==all.length) throw new Error(`Duplicate questions in ${track}`);
 await fs.writeFile(path.join(dir,`${track}.json`),JSON.stringify(all,null,2)+'\n');
 console.log(`${track}: ${all.length} authored questions saved`);
}
await fs.writeFile(path.join(dir,`authoring-usage${process.env.BANK_BATCH_MIN?'-'+process.env.BANK_BATCH_MIN:''}.json`),JSON.stringify({created:'2026-10-25',requests:env.__usage},null,2)+'\n');
