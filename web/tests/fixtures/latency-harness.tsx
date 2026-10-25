'use client';
// Temporarily copy to app/qa-latency/page.tsx; remove before the production build.
import { useEffect, useState } from 'react';
import Home from '@/app/page';
import { handleApi } from '@/lib/service.mjs';
import { localTurn } from '@/lib/conversation.mjs';
import {rubricFixture} from '@/tests/fixtures/grading.mjs';
export default function PremiumHarness(){
 const [ready,setReady]=useState(false),[ledger,setLedger]=useState<string[]>([]);
 useEffect(()=>{
  const original=window.fetch, voices=window.speechSynthesis.getVoices.bind(window.speechSynthesis);
  window.speechSynthesis.getVoices=()=>[];
  window.fetch=async(input,init)=>{
   const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.href);
   if(url.origin!==location.origin||!url.pathname.startsWith('/api/'))return original(input,init);
   if(init?.method==='POST')setLedger(old=>[...old,url.pathname]);

   return handleApi(new Request(url,input instanceof Request?input:init),{AI_PROVIDER:'gemini',GEMINI_API_KEY:'fixture-only',GEMINI_DATA_POLICY:'unpaid'},async(_u,options)=>{
    const sent=JSON.parse(String(options?.body)),props=sent.response_format.schema.properties,ctx=JSON.parse(sent.input[0].text);let data;
    if(props.openingQuestion)data={priorities:['evaluation','reasoning'],openingQuestion:'What interests you about this role, and which skills would you bring?'};
    else if(props.action&&ctx.answer.includes('premature'))data={action:'finish',prompt:'',anchorQuote:'',probeIntent:''};
    else if(props.action){const probe=ctx.mayProbe&&ctx.answer.includes('ambiguous');const action=probe?'probe':ctx.transitionCategory==='finish'?'finish':'transition';data={action,prompt:action==='finish'?'':probe?'Which denominator counts predicted positives in your calculation?':ctx.nextTask?.prompt??'Tell me about a time you changed your mind after a teammate challenged your decision.',anchorQuote:probe?'ambiguous':'',probeIntent:probe?'Clarify the denominator.':''};}
    else if(props.rubric){const local=localTurn(ctx.question,ctx.transcript,0,false);const grading=local.grading??rubricFixture(ctx.transcript,[0,0,0,0]);data={summary:local.summary,strengths:local.strengths,improvements:local.improvements,evidence:local.evidence,visual:[],rubric:{version:grading.version,criteria:grading.criteria.map((c:{id:string;level:number;evidence:string;reason:string;improvement:string})=>({id:c.id,level:c.level,evidence:c.evidence,reason:c.reason,improvement:c.improvement}))},checks:local.knowledge?.checks??[]};}
    else if(props.clips)data={clips:ctx.clips.map((c:{id:string;transcript:string})=>({kind:'improvement',id:c.id,quote:c.transcript.slice(0,120),strength:'**Concrete wording:** This excerpt names a step.',improvement:'**Explain the link:** State how this step resolves the stated question.',justification:'The quoted step can be made more useful by explaining its purpose.'}))};
    else if(props.patterns)data={summary:'**Explain your choices:** Connect each technical step to the problem it solves.',patterns:[{answerIndex:0,quote:ctx.answers[0].answer.slice(0,100),observation:'This answer supplies a starting point. Make your contribution explicit.'}],priorities:['State the key technical definition before applying it.','Practice one worked example and its boundary conditions.']};
    else data={explanation:'**Practice the denominator:** Identify the population counted by each metric.',drills:[{prompt:'How do precision and recall differ?',solution:'Precision conditions on predicted positives; recall conditions on actual positives.',sourceId:''}]};
    return Response.json({status:'completed',usage:{total_input_tokens:1000,total_output_tokens:400,total_thought_tokens:200,total_tokens:1400},steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(data)}]}]});
   });
  };
  setReady(true);return()=>{window.fetch=original;window.speechSynthesis.getVoices=voices;};
 },[]);
 return <><p style={{padding:12,background:'#fff0d6'}}>Latency QA fixture · model deliberately ends early for answers containing premature · no real provider/media</p>{ready&&<Home/>}<details><summary>Request ledger</summary><pre id="qa-ledger">{ledger.join('\n')}</pre></details></>;
}
