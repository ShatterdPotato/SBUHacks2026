'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import type {Take} from '../lib/interview-types';
import {aiRequest} from '../lib/ai-client';
import {FeedbackText} from './feedback-text';
export type CoachReply={explanation:string;drills:{prompt:string;solution:string;sourceId:string}[]};
type Message={role:'user'|'assistant';text:string;reply?:CoachReply};
export function ResultsChat({answers,provider,unpaid,available,onCoach}:{answers:Take[];provider:string;unpaid:boolean;available:boolean;onCoach:(reply:CoachReply|null)=>void}){
 const [messages,setMessages]=useState<Message[]>([]),[draft,setDraft]=useState(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const controller=useRef<AbortController|null>(null),revision=JSON.stringify(answers.map(t=>[t.question.id,t.transcript,t.analysis.grading,t.analysis.aiStatus]));
 const latest=useRef(onCoach);latest.current=onCoach;
 useEffect(()=>{controller.current?.abort();setMessages([]);setDraft('');setConsent(false);setBusy(false);setError('');latest.current(null);return()=>controller.current?.abort();},[revision,provider]);
 const entries=answers.filter(t=>t.transcript.trim()&&t.transcriptSource!=='skipped').map(t=>({question:t.question,answer:t.transcript,grading:t.analysis.grading}));
 async function send(event?:FormEvent){
  event?.preventDefault();if(busy||!consent||!draft.trim()||!available||!entries.length)return;
  const request=draft.trim(),token=new AbortController();controller.current=token;setBusy(true);setError('');
  // Failed requests keep the draft and conversation, so Retry sends it once.
  try{
   const reply=await aiRequest<CoachReply>('/api/coach',{cloudConsent:true,providerConsent:provider,privacyMode:'fictional',demoDataOnly:unpaid,nonSensitiveConsent:true,answers:entries,request,chatHistory:messages.slice(-8).map(m=>({role:m.role,text:m.text.slice(0,m.role==='user'?1500:6000)}))},token.signal);
   if(controller.current!==token||token.signal.aborted)return;
   setMessages(old=>[...old,{role:'user',text:request},{role:'assistant',text:[reply.explanation,...reply.drills.map(d=>`${d.prompt}\n${d.solution}`)].join('\n\n'),reply}]);setDraft('');latest.current(reply);
  }catch(e){if(controller.current===token&&!token.signal.aborted)setError(e instanceof Error?e.message:'Chat could not connect. Your message is preserved.');}
  finally{if(controller.current===token){controller.current=null;setBusy(false);}}
 }
 function revoke(){controller.current?.abort();controller.current=null;setBusy(false);setConsent(false);}
 return <section className="coach-chat" aria-label="Chat about your results">
  <h3>Talk through your results.</h3><p>Ask about a mistake, work through a solution, or request a practice problem. Gearwell uses your saved answers and rubric feedback, plus the recent conversation.</p>
  {!available&&<p>AI chat is unavailable until the server’s AI connection is configured. Your local report is still available.</p>}
  {!entries.length&&<p>Save at least one answer to discuss it with Gearwell.</p>}
  <label className="check-row"><input type="checkbox" checked={consent} disabled={!available||!entries.length} onChange={e=>e.target.checked?setConsent(true):revoke()}/><span>Enable results chat · {entries.length} saved answers<small>{unpaid?'I confirm all answers and chat messages are fictional and non-sensitive. I consent to sending their question text, transcripts, rubric feedback and recent chat to Google. Free-tier data may improve Google products and be reviewed. Do not enable this for real personal answers.':'I consent to sending saved questions, answer transcripts, rubric feedback and recent chat to the configured AI provider.'} Recordings and gaze measurements stay on this device.</small></span></label>
  <div className="coach-messages" role="log" aria-label="Results chat messages" aria-live="polite">{messages.map((message,index)=><article key={index} className={`coach-message ${message.role}`}><strong>{message.role==='user'?'You':'Gearwell'}</strong>{message.reply?<><p><FeedbackText>{message.reply.explanation}</FeedbackText></p>{message.reply.drills.map((drill,i)=><details key={i}><summary>{drill.prompt}</summary><p><FeedbackText>{drill.solution}</FeedbackText></p><small>{drill.sourceId?'Uses the supplied answer-key reference':'Generated practice · check the worked solution'}</small></details>)}</>:<p>{message.text}</p>}</article>)}</div>
  <div className="coach-prompts">{['Explain my biggest mistake.','Give me a similar practice problem.','Walk me through the solution step by step.'].map(prompt=><button type="button" className="secondary" key={prompt} disabled={busy} onClick={()=>setDraft(prompt)}>{prompt}</button>)}</div>
  <form onSubmit={send}><label className="field-label" htmlFor="results-chat-message">Your message to Gearwell</label><textarea id="results-chat-message" rows={3} maxLength={1500} value={draft} disabled={busy} onChange={e=>setDraft(e.target.value)} placeholder="Why was my reasoning incomplete? Can you give me another example?"/>
   <button type="submit" className="primary" disabled={busy||!consent||!available||!entries.length||!draft.trim()}>{busy?'Gearwell is preparing a response…':error?'Retry message':'Send message'}</button>
  </form>{busy&&<button type="button" className="text-link" onClick={()=>{controller.current?.abort();controller.current=null;setBusy(false);}}>Cancel response</button>}{error&&<p role="alert">{error}</p>}
  <small>AI coaching can be wrong. Chat stays in this session; the latest practice response is included in your PDF.</small>
 </section>;
}
