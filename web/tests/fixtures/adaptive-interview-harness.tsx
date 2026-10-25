'use client';
// Manual browser fixture: copy temporarily to app/qa-adaptive/page.tsx.
// Real Home, conversation, API logic and report; provider transport is mocked.
import { useEffect, useState } from 'react';
import Home from '@/app/page';
import { handleApi } from '@/lib/service.mjs';
import { rubricFixture } from '@/tests/fixtures/grading.mjs';
import { localTurn } from '@/lib/conversation.mjs';

export default function AdaptiveInterviewHarness() {
    const [ready,setReady]=useState(false),[requests,setRequests]=useState<unknown[]>([]);
    useEffect(()=>{
        const original=window.fetch;
        const originalVoices=window.speechSynthesis.getVoices.bind(window.speechSynthesis);
        window.speechSynthesis.getVoices=()=>[]; // Deterministic readable-question fallback.
        window.fetch=async(input,init)=>{
            const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.href);
            if(url.origin!==location.origin||!url.pathname.startsWith('/api/'))return original(input,init);
            const request=new Request(url,input instanceof Request?input:init);
            if(request.method==='POST')setRequests(old=>[...old,{path:url.pathname,body:JSON.parse(String(init?.body??'{}'))}]);
            return handleApi(request,{AI_PROVIDER:'gemini',GEMINI_API_KEY:'mock-fixture-only-not-a-credential',GEMINI_DATA_POLICY:'unpaid'},async(_url,options)=>{
                const sent=JSON.parse(String(options?.body));
                let data;
                if(sent.response_format.schema.properties.questions)data={questions:[{prompt:'What drew you to apply for this internship and what skills would you bring?',category:'Behavioral',focus:['skills']}]};
                else {
                    const context=JSON.parse(sent.input[0].text),answer=context.transcript as string,anchor=answer.slice(0,140);
                    const feedback={summary:'**The verification step is incomplete.** Explain what you would check before acting on the customer’s payment.',strengths:[],improvements:['**Avoid a second charge:** Check the terminal transaction record and explain when you would ask a supervisor to intervene.','**State a decision boundary:** Explain what evidence would make you change your next step.'],evidence:[anchor],visual:[],rubric:rubricFixture(anchor,[3,1,2,2]),checks:[]};
                    const local=localTurn({prompt:context.question,...context.questionKind,focus:[]},answer,0,false);
                    if(local.grading)feedback.rubric={version:local.grading.version,criteria:local.grading.criteria};
                    if(context.references.some((r:{id:string})=>r.id==='change')){
                        feedback.summary='**The amount needs verification.** Counting back does not fix an incorrect starting calculation.';
                        feedback.improvements=['**Show your calculation:** Subtract the order total from the amount tendered in cents before handing over cash.','**Verify before closing the drawer:** Count up from the order total to the tendered amount.'];
                        const reasons=['You address the requested change amount, but the stated result is wrong.','You describe counting back without showing a defensible subtraction.','The answer supplies an amount but no worked check supporting it.','The handover step is present; verification before handing over money is missing.'];
                        feedback.rubric.criteria=feedback.rubric.criteria.map((c,i)=>({...c,reason:reasons[i]}));
                    }
                    if(sent.response_format.schema.properties.nextQuestion){
                        const action=context.interview.nextAction;
                        const prompt=action==='finish'?'':context.questionKind.category==='Behavioral'?'How would you investigate a recurring error in a service?':action==='transition'?'An order costs $8.65 and the customer pays $20. How much change would you return?':answer.includes('charge')?'How would you check whether the first payment went through before charging the customer again?':'What evidence would you collect to isolate the cause of that recurring error?';
                        data={feedback,nextQuestion:{prompt,category:'Technical',focus:['verify'],anchorQuote:action==='finish'||context.questionKind.category==='Behavioral'?'':anchor},checks:[]};
                    } else data=feedback;
                }
                return Response.json({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(data)}]}]});
            });
        };
        setReady(true);return()=>{window.fetch=original;window.speechSynthesis.getVoices=originalVoices;};
    },[]);
    return <><div style={{padding:12,background:'#fff0d6',color:'#704614',position:'sticky',top:0,zIndex:50}}>Test fixture · mocked Gemini transport · no live provider calls · use text only</div>{ready&&<Home/>}<details style={{padding:20}}><summary>Mock request ledger</summary><pre id="adaptive-requests">{JSON.stringify(requests,null,2)}</pre></details></>;
}
