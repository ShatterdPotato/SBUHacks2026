'use client';
// Synthetic transcript fixture. No camera, microphone or original video is used.
// Temporarily copy to app/qa-clips/page.tsx, then remove before production build.
import { useState } from 'react';
import { aiRequest } from '@/lib/ai-client';
import { MomentClip, type Moment } from '@/components/moment-clip';
import type { ClipFeedback } from '@/components/premium-review';
const question={id:'clip-qa',bankId:'verified-ai-ml-1',prompt:'A classifier makes 24 true-positive and 6 false-positive predictions. What is its precision as a decimal?',category:'Technical',focus:['precision'],source:'bank'};
const excerpts=[{id:'a',transcript:'Precision is true positives divided by all predicted positives.',start:0,end:6},{id:'b',transcript:'I use actual positives as the denominator for precision.',start:7,end:13}];
export default function ClipFeedbackHarness(){
 const [feedback,setFeedback]=useState<Record<string,ClipFeedback>>({}),[status,setStatus]=useState('Synthetic test excerpts; no video uploaded.');
 async function run(){setStatus('Requesting high-reasoning Gemini feedback on these fictional excerpts…');try{const d=await aiRequest<{clips:ClipFeedback[]}>('/api/clip-feedback',{cloudConsent:true,providerConsent:'gemini',privacyMode:'fictional',demoDataOnly:true,nonSensitiveConsent:true,clips:excerpts.map((e,i)=>({...e,question,kind:i?'worst':'best'}))});setFeedback(Object.fromEntries(d.clips.map(c=>[c.id,c])));setStatus('Live Gemini feedback complete. Transcript-only synthetic QA; no physical recording.');}catch(e){setStatus(e instanceof Error?e.message:'Failed');}}
 return <main style={{padding:32,maxWidth:1200,margin:'auto'}}><p>CADENCE · SYNTHETIC CLIP QA</p><h1>Feedback tied to each excerpt</h1><p role="status">{status}</p><button className="primary" onClick={()=>void run()}>Analyze fictional excerpts with Gemini</button><div className="moments-grid" style={{marginTop:24}}>{excerpts.map((e,i)=><section className="moment-card" key={e.id}><h2>{feedback[e.id]?.kind==='improvement'?'Moment to improve':i?'Moment to improve':'Strong moment'}</h2><MomentClip moment={{...e,answerIndex:i,score:null,reason:'Local placeholder pending AI feedback.',url:'',mime:''} as Moment} kind={i?'worst':'best'} feedback={feedback[e.id]}/></section>)}</div></main>;
}
