'use client';
import {useEffect,useState} from 'react';
export function GradingRoom({completed,total,onContinue}:{completed:number;total:number;onContinue:()=>void}){
 const [seconds,setSeconds]=useState(0);useEffect(()=>{const timer=setInterval(()=>setSeconds(s=>s+1),1000);return()=>clearInterval(timer);},[]);
 return <main className="grading-room gearwell-content" aria-labelledby="grading-title"><div className="grading-doors" aria-hidden="true"><div className="gate-door gate-left"/><div className="gate-door gate-right"/></div><section className="grading-panel readout">
 <span className="eyebrow">CADENCE · THE REVIEW CHAMBER</span><div className="grading-cog" aria-hidden="true">⚙</div><h1 id="grading-title">Grading your interview.</h1>
 <p>Your answers are saved in this tab. Your camera and microphone are off.</p><p role="status" aria-live="polite"><strong>{completed} of {total} answers reviewed</strong> · {seconds}s elapsed</p>
 <progress value={completed} max={Math.max(1,total)} aria-label="Answers reviewed"/><p>Gearwell is comparing each answer with the content rubric and relevant reference approach. Two answers are reviewed at a time.</p>
 <button className="secondary" onClick={onContinue}>View saved answers now</button><small>You can retry unfinished assessments from the report. Keep this tab open to retain your recording.</small>
 </section></main>;
}
