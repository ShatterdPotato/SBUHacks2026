'use client';
// Copy to app/qa-montasir/page.tsx for browser QA; remove the route before building.
import {useEffect,useRef,useState} from 'react';
import {ResultsChat} from '@/components/results-chat';
import {EyeContactReadout} from '@/components/eye-contact-readout';
import {localTurn} from '@/lib/conversation.mjs';
import type {Take} from '@/lib/interview-types';
const question={id:'fixture',prompt:'Explain precision and recall.',category:'Technical',focus:['evaluation'],source:'curated'};
const transcript='Precision measures correct positive predictions among all positive predictions. Recall measures true positives among actual positives.';
const take:Take={question,transcript,duration:0,hasRecording:false,url:null,mime:'',transcriptSource:'typed',delivery:null,words:[],audioEvidence:[],visionEvidence:[],analysis:localTurn(question,transcript,0,false)};
export default function ResultsChatHarness(){
 const [answers,setAnswers]=useState([take]),[ledger,setLedger]=useState<string[]>([]),[ready,setReady]=useState(false);
 const behavior=useRef('normal');
 useEffect(()=>{const original=window.fetch;window.fetch=async(input,init)=>{
  const url=String(input);if(url!=='/api/coach')return original(input,init);
  const body=JSON.parse(String(init?.body));setLedger(old=>[...old,JSON.stringify({request:body.request,history:body.chatHistory.length,answers:body.answers.length})]);
  if(behavior.current==='fail'){behavior.current='normal';return Response.json({error:'Fixture connection failure. Your message is preserved.'},{status:503});}
  if(behavior.current==='wait'){behavior.current='normal';await new Promise<void>((resolve,reject)=>{const timer=setTimeout(resolve,15000);init?.signal?.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));},{once:true});});}
  return Response.json({explanation:body.chatHistory.length?'As discussed above, **precision uses predicted positives** in the denominator. Your earlier example had 10 predicted positives.':'Your answer names both populations. **Practice with a numerical example** to make the difference concrete.',drills:body.request.toLowerCase().includes('problem')?[{prompt:'Six of ten positive predictions are correct. Find precision.',solution:'Precision = 6 / 10 = 0.6.',sourceId:''}]:[]});
 };setReady(true);return()=>{window.fetch=original;};},[]);
 return <main className="wrap"><h1>QA fixture · no live AI or media</h1><button onClick={()=>behavior.current='fail'}>Fail next response</button><button onClick={()=>behavior.current='wait'}>Delay next response</button><button onClick={()=>setAnswers([{...take,transcript:take.transcript+' This is a corrected transcript.'}])}>Correct transcript</button>{ready&&<ResultsChat answers={answers} provider="gemini" unpaid available onCoach={()=>{}}/>}<EyeContactReadout summary={{cameraGaze:80,faceVisible:95,frames:40,classified:32,coverage:80}}/><EyeContactReadout summary={{cameraGaze:null,faceVisible:10,frames:40,classified:4,coverage:10}}/><pre aria-label="Request ledger">{ledger.join('\n')}</pre></main>;
}
