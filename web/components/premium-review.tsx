'use client';
import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Analysis, Take } from '../lib/interview-types';
import type { Moment } from './moment-clip';
import { aiRequest, sessionUsage } from '../lib/ai-client';
import { FeedbackText } from './feedback-text';

export type ClipFeedback={id:string;quote:string;strength:string;improvement:string;justification:string;kind:'strength'|'improvement'};
type SessionReport={summary:string;patterns:{answerIndex:number;quote:string;observation:string}[];priorities:string[]};
type Coach={explanation:string;drills:{prompt:string;solution:string;sourceId:string}[]};
type Props={answers:Take[];setAnswers:Dispatch<SetStateAction<Take[]>>;moments:{best:Moment[];worst:Moment[]};provider:string;unpaid:boolean;onClips:(value:Record<string,ClipFeedback>)=>void;onReport:(value:SessionReport|null)=>void;onCoach:(value:Coach|null)=>void};
export function PremiumReview({answers,setAnswers,moments,provider,unpaid,onClips,onReport,onCoach}:Props){
 const [report,setReport]=useState<SessionReport|null>(null),[reportStatus,setReportStatus]=useState(''),[clipStatus,setClipStatus]=useState('');
 const [reportError,setReportError]=useState(''),[clipError,setClipError]=useState(''),[coachError,setCoachError]=useState('');
 const [request,setRequest]=useState('Explain my most important technical gap and give me two exercises.'),[coach,setCoach]=useState<Coach|null>(null),[coaching,setCoaching]=useState(false);
 const [appeals,setAppeals]=useState<Record<number,string>>({}),[working,setWorking]=useState<number|null>(null),[gradeError,setGradeError]=useState('');
 const epoch=useRef(0),mounted=useRef(true);
 const eligible=answers.map((take,index)=>({take,index})).filter(x=>x.take.cloudEligible&&x.take.transcript.trim());
 const ready=eligible.every(x=>x.take.analysis.aiStatus!=='pending'&&x.take.analysis.aiStatus!=='failed'&&x.take.analysis.aiStatus!=='provisional');
 const consent={cloudConsent:true,providerConsent:provider,demoDataOnly:unpaid,privacyMode:'fictional',nonSensitiveConsent:true};
 const entries=eligible.map(({take})=>({question:take.question,answer:take.transcript,grading:take.analysis.grading}));
 const revision=JSON.stringify(eligible.map(({take,index})=>[index,take.transcript,take.analysis.aiStatus,take.analysis.grading]));
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;epoch.current++;};},[]);
 async function synthesize(token=epoch.current){
   setReportStatus('AI report pending');setReportError('');
   try{const data=await aiRequest<SessionReport>('/api/session-report',{...consent,answers:entries});if(mounted.current&&token===epoch.current){setReport(data);onReport(data);setReportStatus('AI report complete');}}
   catch(e){if(mounted.current&&token===epoch.current){setReportError(e instanceof Error?e.message:'Report failed.');setReportStatus('Report needs retry');}}
 }
 async function coachClips(token=epoch.current){
   const clips=(['best','worst'] as const).flatMap(kind=>moments[kind].filter(m=>answers[m.answerIndex]?.cloudEligible).map(m=>({id:m.id,question:answers[m.answerIndex].question,transcript:m.transcript,answer:answers[m.answerIndex].transcript,grading:answers[m.answerIndex].analysis.grading,start:m.start,end:m.end,kind})));
   if(!clips.length){setClipStatus('No recorded excerpts to send');return;}
   setClipStatus('AI clip feedback pending');setClipError('');
   try{const data=await aiRequest<{clips:ClipFeedback[]}>('/api/clip-feedback',{...consent,clips});if(mounted.current&&token===epoch.current){onClips(Object.fromEntries(data.clips.map(c=>[c.id,c])));setClipStatus('AI clip feedback complete');}}
   catch(e){if(mounted.current&&token===epoch.current){setClipError(e instanceof Error?e.message:'Clip feedback failed.');setClipStatus('Local excerpt feedback · AI retry available');}}
 }
 useEffect(()=>{
   const token=++epoch.current;setReport(null);setCoach(null);onReport(null);onCoach(null);onClips({});setReportError('');setClipError('');
   if(!eligible.length){setReportStatus('');setClipStatus('');return;}
   if(!ready){setReportStatus('Waiting for completed grades. Retry failed or provisional answers below.');setClipStatus('Local excerpt feedback while grades are pending');return;}
   void synthesize(token);void coachClips(token);
   // The immutable transcript/grade revision invalidates every derived conclusion.
   // eslint-disable-next-line react-hooks/exhaustive-deps
 },[revision,provider]);
 async function regrade(index:number){
   if(working!==null)return;
   const take=answers[index],transcript=take.transcript;setWorking(index);setGradeError('');
   setAnswers(old=>old.map((t,i)=>i===index?{...t,analysis:{...t.analysis,aiStatus:'pending'}}:t));
   try{const data=await aiRequest<Analysis>('/api/regrade',{...consent,assessmentMode:'content',question:take.question,answer:transcript,duration:take.duration,recorded:take.hasRecording,appeal:appeals[index]??''});
     if(mounted.current)setAnswers(old=>old.map((t,i)=>i===index&&t.transcript===transcript?{...t,analysis:{...data,scores:{...data.scores,confidence:t.delivery?.score??null},metrics:{...data.metrics,wpm:t.delivery?.metrics.wpm??data.metrics.wpm}}}:t));
   }catch(e){if(mounted.current){const message=e instanceof Error?e.message:'Regrading failed.';setGradeError(message);setAnswers(old=>old.map((t,i)=>i===index&&t.transcript===transcript?{...t,analysis:{...t.analysis,aiStatus:'failed',aiError:message}}:t));}}
   finally{if(mounted.current)setWorking(null);}
 }
 async function practice(){
   setCoaching(true);setCoachError('');const token=epoch.current;
   try{const data=await aiRequest<Coach>('/api/coach',{...consent,answers:entries,request});if(mounted.current&&token===epoch.current){setCoach(data);onCoach(data);}}
   catch(e){if(mounted.current)setCoachError(e instanceof Error?e.message:'Coaching failed.');}
   finally{if(mounted.current)setCoaching(false);}
 }
 const usage=sessionUsage();const sum=(key:'inputTokens'|'outputTokens'|'thoughtTokens')=>usage.reduce((n,u)=>n+(u[key]??0),0);
 return <section className="premium-review" aria-label="AI session coaching">
   <div className="section-title-row"><h2>Your next practice, made specific.</h2><span>{eligible.length} answers with cloud consent</span></div>
   {!eligible.length&&<p>AI report, clip coaching and drills require cloud consent during the interview. Your local feedback remains available below.</p>}
   {eligible.length>0&&<>
    <p role="status" aria-live="polite">{reportStatus} · {clipStatus}</p>
    {reportError&&<p role="alert">{reportError} <button className="secondary" onClick={()=>void synthesize()}>Retry AI report</button></p>}
    {clipError&&<p role="alert">{clipError} <button className="secondary" onClick={()=>void coachClips()}>Retry AI clip feedback</button></p>}
    {report&&<div className="transcript-quote"><p><FeedbackText>{report.summary}</FeedbackText></p>{report.patterns.map((p,i)=><div key={i}><strong>Answer {(eligible[p.answerIndex]?.index??p.answerIndex)+1}</strong><blockquote>“{p.quote}”</blockquote><p><FeedbackText>{p.observation}</FeedbackText></p></div>)}<h4>Practice priorities</h4><ol>{report.priorities.map((p,i)=><li key={i}><FeedbackText>{p}</FeedbackText></li>)}</ol></div>}
    <details><summary>Review a grade or request another assessment</summary><p>Corrections and appeals trigger independent regrading and invalidate the session report and clip conclusions.</p>
     {eligible.map(({take,index})=><div className="grade-review" key={take.question.id}><label className="field-label" htmlFor={`appeal-${index}`}>Answer {index+1} · {take.analysis.aiStatus??(take.analysis.mode==='live'?'complete':'local fallback')}</label>{take.analysis.aiError&&<p>{take.analysis.aiError}</p>}<textarea id={`appeal-${index}`} rows={2} maxLength={1500} value={appeals[index]??''} placeholder="Optional: explain what you believe the assessment missed." onChange={e=>setAppeals(old=>({...old,[index]:e.target.value}))}/><button className="secondary" disabled={working!==null} onClick={()=>void regrade(index)}>{working===index?'Reviewing the rubric…':'Regrade with Gemini'}</button></div>)}{gradeError&&<p role="alert">{gradeError}</p>}
    </details>
    <label className="field-label" htmlFor="practice-coach">Ask your practice coach</label><textarea id="practice-coach" rows={2} maxLength={1500} value={request} onChange={e=>setRequest(e.target.value)}/><button className="secondary" disabled={coaching||!request.trim()||!ready} onClick={()=>void practice()}>{coaching?'Preparing targeted practice…':'Explain and create drills'}</button>
    {coachError&&<p role="alert">{coachError}</p>}{coach&&<div className="transcript-quote"><p><FeedbackText>{coach.explanation}</FeedbackText></p>{coach.drills.map((d,i)=><details key={i}><summary>{d.prompt}</summary><p><FeedbackText>{d.solution}</FeedbackText></p><small>{d.sourceId?'Grounded in the supplied answer key':'Generated practice; no reference verification'}</small></details>)}</div>}
   </>}
   <details><summary>AI activity for this session · {usage.length} recorded requests</summary><p>Input: {sum('inputTokens').toLocaleString()} · output: {sum('outputTokens').toLocaleString()} · reasoning: {sum('thoughtTokens').toLocaleString()} tokens. Missing provider counters are shown as unavailable below; output and reasoning may overlap and are not summed as a bill.</p><div className="usage-table"><table><thead><tr><th>Operation</th><th>Model</th><th>Status</th><th>Seconds</th><th>Attempts</th><th>Input / output / reasoning</th></tr></thead><tbody>{usage.map((u,i)=><tr key={i}><td>{u.operation}</td><td>{u.model}</td><td>{u.status}</td><td>{(u.latencyMs/1000).toFixed(1)}</td><td>{u.attempts}</td><td>{u.inputTokens??'—'} / {u.outputTokens??'—'} / {u.thoughtTokens??'—'}</td></tr>)}</tbody></table></div></details>
 </section>;
}
