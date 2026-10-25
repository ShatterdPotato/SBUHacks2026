'use client';
import { useEffect, useRef, useState } from 'react';
import { RecordingCoach, type RecordingEvidence } from '../lib/recording-coach';
import { EyeContactReadout } from './eye-contact-readout';
import type { EyeSummary } from '../lib/eye-contact-metrics.mjs';
import { recordedDelivery } from '../lib/recorded-delivery.mjs';
import { localTurn, localFollowup, localNextQuestion, answerAnchor } from '../lib/conversation.mjs';
import { rememberQuestions, freshQuestions, recentBankIds } from '../lib/question-variety.mjs';
import { nextTurnAction, questionKind } from '../lib/question-kind.mjs';
import { aiRequest } from '../lib/ai-client';
import {speakInterviewLine,stopInterviewerVoice,attachInterviewCamera} from '../lib/gearwell-voice';
import { coverageSchedule, sampleBank, bankEntry } from '../lib/technical-bank.mjs';
import type { InterviewPlan } from '../lib/interview-types';
import type { Question, Take, Analysis } from '../lib/interview-types';

type Phase = 'ready'|'loading'|'speaking'|'listening'|'thinking'|'paused'|'review'|'ending';
type Props = {voiceConsent:boolean;plan?:InterviewPlan;questions:Question[];questionLimit?:number;type?:string;level?:string;profile?:{roleFamily:string;skills:string[]};role:string;roleFamily:string;provider:string;providerLabel:string;cloudAvailable:boolean;unpaid:boolean;onComplete:(takes:Take[],warning?:string)=>void;onLegacy:()=>void};
const empty = ():RecordingEvidence => ({words:[],audioEvidence:[],visionEvidence:[],transcript:''});
const time = (n:number) => `${Math.floor(n/60)}:${Math.floor(n%60).toString().padStart(2,'0')}`;

export function ConversationStudio(props:Props) {
    const topicLimit = props.questionLimit ?? props.questions.length;
    const plan=useRef<InterviewPlan>(props.plan??{schedule:coverageSchedule(props.type??'Mixed',topicLimit),priorities:props.profile?.skills??[],profile:props.profile??{roleFamily:props.roleFamily,skills:[]},type:props.type??'Mixed',level:props.level??'Internship',count:topicLimit});
    const nextRetry=useRef<{body:unknown;fallback:Question;action:string}|null>(null);
    const [waitingRetry,setWaitingRetry]=useState(false);

    const [phase,setPhaseState] = useState<Phase>('ready');
    const [camera,setCamera] = useState(true);
    const [consent,setConsent] = useState(false);
    const [eyeEnabled,setEyeEnabled]=useState(true),[eyeSummary,setEyeSummary]=useState<EyeSummary|null>(null);
    const [aiConsent,setAiConsent] = useState(false);
    const [followups,setFollowups] = useState(true);
    const [silence,setSilence] = useState(2);
    const [refineCaptions,setRefineCaptions]=useState(false);
    const [question,setQuestion] = useState(props.questions[0]);
    const [caption,setCaptionState] = useState('');
    const [status,setStatus] = useState('');
    const [error,setError] = useState('');
    const [voiceFailed,setVoiceFailed]=useState(false);
    const [elapsed,setElapsed] = useState(0);
    const [log,setLog] = useState<{question:string;answer:string}[]>([]);
    const phaseRef = useRef<Phase>('ready'), mounted = useRef(true), video = useRef<HTMLVideoElement>(null);
    const stream = useRef<MediaStream|null>(null), coach = useRef<RecordingCoach|null>(null), recorder = useRef<MediaRecorder|null>(null);
    const recording = useRef<Promise<Blob>|null>(null), startAt = useRef(0), turnStart = useRef(0), recorderOffset = useRef(0);
    const lastVoice = useRef(0), voiced = useRef(0), noise = useRef<number[]>([]), captionRef = useRef('');
    const takes = useRef<Take[]>([]), baseIndex = useRef(0), isFollowup = useRef(false), current = useRef(question);
    const locked = useRef(false), startup = useRef(0), speechToken = useRef(0), speechTimer = useRef<ReturnType<typeof setTimeout>|null>(null), requestController = useRef<AbortController|null>(null);
    function phaseTo(p:Phase) { phaseRef.current=p;document.dispatchEvent(new CustomEvent('gearwell:emotion',{detail:{emotion:p==='thinking'?'thinking':'listening'}}));if(mounted.current)setPhaseState(p); }
    function captionTo(s:string) {captionRef.current=s;if(mounted.current)setCaptionState(s);}
    function stopSpeech() { speechToken.current++; if(speechTimer.current)clearTimeout(speechTimer.current);stopInterviewerVoice(); }
    function release() { stopSpeech();attachInterviewCamera(null);coach.current?.dispose();coach.current=null;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null; }
    useEffect(()=>{ mounted.current=true;return()=>{mounted.current=false;requestController.current?.abort();stopSpeech();if(recorder.current?.state==='recording')recorder.current.stop();coach.current?.dispose();stream.current?.getTracks().forEach(t=>t.stop());}; },[]);
    useEffect(()=>{
        const status=(event:Event)=>{if(phaseRef.current!=='speaking')return;const p=(event as CustomEvent).detail?.phase;const messages:Record<string,string>={preparing:'Preparing Gearwell’s ElevenLabs voice · listening begins after playback',speaking:'Gearwell is speaking · your microphone is excluded from transcription',blocked:'The question audio is ready. Select Play voice above, or interrupt to answer.',paused:'Voice playback paused. Select Play voice above to continue.',buffering:'Buffering the question audio · listening is paused'};if(messages[p])setStatus(messages[p]);};
        document.addEventListener('gearwell:voice-state',status);return()=>document.removeEventListener('gearwell:voice-state',status);
    },[]);
    useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(recorder.current?.state==='recording'){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);
    useEffect(()=>{if(video.current&&stream.current){video.current.srcObject=stream.current;void video.current.play().catch(()=>{});}},[phase,camera]);
    useEffect(()=>{if(phase==='speaking')document.getElementById('room-heading')?.scrollIntoView({block:'start'});},[phase,question.id]);
    useEffect(()=>{
        if(phase==='ready'||phase==='loading')return;
        const timer=setInterval(()=>{
            if(!mounted.current)return;
            const seconds=(performance.now()-startAt.current)/1000;setElapsed(seconds);
            if(seconds>=1200&&!locked.current){void finishSession();return;}
            if(phaseRef.current==='listening'&&camera) {
                const duration=(coach.current?.currentTime??turnStart.current)-turnStart.current;
                if(duration>=180||(voiced.current>=.4&&performance.now()-lastVoice.current>silence*1000))void submitTurn();
            }
        },300);return()=>clearInterval(timer);
    },[phase,camera,silence]);
    function listen(message?:string) {
        if(!mounted.current||phaseRef.current==='ending')return;
        stopSpeech();setVoiceFailed(false);setError('');coach.current?.setListening(true);captionTo('');voiced.current=0;noise.current=[];lastVoice.current=performance.now();
        turnStart.current=coach.current?.beginTurn()??performance.now()/1000;
        phaseTo('listening');setStatus(message??(camera?'Your turn. Finish naturally; a pause advances the conversation.':'Your turn. Type your response below.'));
    }
    function ask(q:Question) {
        if(takes.current.length)rememberQuestions(props.role,[q]);
        current.current=q;setQuestion(q);captionTo('');coach.current?.setListening(false);phaseTo('speaking');
        stopSpeech();const token=speechToken.current;
        if(!props.voiceConsent){listen('Voice is off. Read the question, then answer.');return;}
        setVoiceFailed(false);setStatus('Preparing Gearwell’s ElevenLabs voice · listening begins after playback');
        void speakInterviewLine(q.prompt,props.voiceConsent).then(()=>{
            if(token===speechToken.current&&mounted.current&&phaseRef.current==='speaking')listen();
        }).catch(e=>{
            if(token!==speechToken.current||!mounted.current)return;
            setVoiceFailed(true);setError(e.name==='AbortError'?'Voice playback was interrupted. Replay the question or continue by reading it.':e.message);
            setStatus('Voice unavailable · your answer has not started. Retry, or read the question and answer.');
        });
    }

    async function start() {
        if(camera&&!consent)return;
        const attempt=++startup.current;
        setError('');phaseTo('loading');
        try {
            if(camera){
                if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('Camera recording requires Chrome or Edge on localhost/HTTPS. Text conversation is available.');
                const newStream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720},facingMode:'user'},audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
                if(!mounted.current||attempt!==startup.current){newStream.getTracks().forEach(t=>t.stop());return;}
                stream.current=newStream;attachInterviewCamera(newStream);
                if(video.current){video.current.srcObject=stream.current;await video.current.play();}
                if(attempt!==startup.current||!mounted.current)return;
                coach.current=new RecordingCoach(()=>{
                    if(!mounted.current)return;
                    const words=coach.current?.words.filter(w=>w.start>=turnStart.current)??[];
                    captionTo(words.map(w=>w.text).join(' '));
                },s=>{if(mounted.current)setStatus(s);},(rms)=>{
                    if(phaseRef.current!=='listening')return;
                    if(noise.current.length<20)noise.current.push(rms);
                    const sorted=[...noise.current].sort((a,b)=>a-b);
                    const threshold=Math.min(.02,Math.max(.008,(sorted[Math.floor(sorted.length*.2)]??.003)*2.5));
                    if(rms>threshold){lastVoice.current=performance.now();voiced.current+=.1;}
                },{eyeContact:eyeEnabled,onEyeContact:summary=>{if(mounted.current)setEyeSummary(summary);}});
                await coach.current.warm(refineCaptions?'accurate':'quick');if(attempt!==startup.current||!mounted.current)return;
                const runningCoach=coach.current;await runningCoach.start(newStream,video.current);
                if(attempt!==startup.current||!mounted.current){runningCoach.dispose();return;}
                runningCoach.setListening(false);
                const mime=['video/webm;codecs=vp8,opus','video/webm','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
                const r=new MediaRecorder(stream.current,mime?{mimeType:mime}:undefined);recorder.current=r;
                recording.current=new Promise((resolve,reject)=>{const chunks:BlobPart[]=[];r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};r.onstop=()=>resolve(new Blob(chunks,{type:r.mimeType}));r.onerror=()=>reject(new Error('Recording failed. Transcript remains available.'));});
                // Attach a rejection handler immediately, including during unmount.
                void recording.current.catch(()=>{});
                recorderOffset.current=coach.current.currentTime;r.start(1000);
                stream.current.getTracks().forEach(track=>track.addEventListener('ended',()=>{if(mounted.current){setError('A device disconnected. Finish to preserve captured answers.');coach.current?.setListening(false);phaseTo('paused');}}));
            }
            startAt.current=performance.now();ask(props.questions[0]);
        }catch(e){if(attempt!==startup.current||!mounted.current)return;release();setError(e instanceof Error?e.message:'Could not start the interview.');phaseTo('ready');}
    }
    async function submitTurn(skip=false, corrected=false) {
        if(nextRetry.current||locked.current||!['listening','paused','review'].includes(phaseRef.current))return;
        locked.current=true;phaseTo('thinking');setError('');
        const duration=Math.min(180,Math.max(0,camera?(coach.current?.currentTime??turnStart.current)-turnStart.current:performance.now()/1000-turnStart.current));
        let evidence=empty();
        try {
            if(corrected)evidence={...empty(),transcript:captionRef.current};
            else if(camera&&coach.current){
                try{evidence=await coach.current.finishTurn(turnStart.current,{refine:refineCaptions});}catch(e){
                    if(!skip){setError('Recognition failed. Review the live caption below or finish the session to keep the video.');phaseTo('review');return;}
                }
                if(!mounted.current)return;
                captionTo(evidence.transcript);
            }else evidence={...empty(),transcript:captionRef.current};
            if(skip)evidence={...evidence,transcript:'',words:[]};
            if(!skip&&!evidence.transcript.trim()){setError('No speech was recognized. Choose “Try this answer again”, skip, or finish to preserve the video.');phaseTo('review');return;}
            const q={...current.current,...questionKind(current.current)};
            let analysis=localTurn(q,evidence.transcript,duration,camera,'content') as Analysis;
            const mainCount=[...takes.current,{question:q}].filter(t=>questionKind(t.question).purpose!=='introduction'&&!t.question.isFollowup).length;
            const category=plan.current.schedule[mainCount];
            const bank=sampleBank(props.role,props.level,1,[...takes.current.map(t=>t.question.prompt),q.prompt],takes.current.map(t=>t.question.bankId).filter(Boolean))[0];
            const localAction=mainCount>=topicLimit?'finish':'transition';
            let nextAction=localAction;
            let nextQuestion:Question=category==='Technical'&&bank?bank:localNextQuestion({role:props.role,type:category??props.type,level:props.level,index:mainCount,previous:[...takes.current.map(t=>t.question.prompt),q.prompt]}) as Question;
            const delivery=camera&&!skip?recordedDelivery({transcript:evidence.transcript,duration,words:evidence.words,audio:evidence.audioEvidence,vision:evidence.visionEvidence}):null;
            if(delivery)analysis={...analysis,scores:{...analysis.scores,confidence:delivery.score},metrics:delivery.metrics};
            const history=takes.current.map(t=>({question:t.question,answer:t.transcript}));

            const eligible=aiConsent&&props.cloudAvailable&&!skip;
            if(eligible)analysis.aiStatus='pending';
            takes.current.push({...evidence,question:q,referenceAnswer:q.isFollowup?null:bankEntry(q.bankId)?.answerKey??null,analysis,duration,hasRecording:camera,url:null,mime:'',transcriptSource:skip?'skipped':corrected?'recording-corrected':camera?'recording':'typed',delivery,recordingOffset:Math.max(0,turnStart.current-recorderOffset.current),sessionRecording:camera,cloudEligible:eligible});
            const consentFields={cloudConsent:true,providerConsent:props.provider,demoDataOnly:props.unpaid,privacyMode:'fictional',nonSensitiveConsent:true};
            if(eligible){
                const body={...consentFields,question:q,answer:evidence.transcript,history,plan:plan.current,seenBankIds:recentBankIds(),followups,duration};
                setStatus('Answer saved. Gearwell is preparing the next question. Grades are calculated after the interview.');
                try{
                    const controller=new AbortController();requestController.current=controller;
                    const data=await aiRequest<{nextAction:string;nextQuestion:Question}>('/api/interviewer',body,controller.signal);
                    if(!mounted.current)return;
                    nextAction=data.nextAction;nextQuestion=data.nextQuestion;
                }catch(e){
                    if(!mounted.current)return;
                    nextRetry.current={body,fallback:nextQuestion,action:localAction};setWaitingRetry(true);
                    setError((e instanceof Error?e.message:'AI unavailable.')+' Your answer and recording are saved. Retry the question or explicitly continue locally.');
                    setStatus('Your answer is saved. Retry the AI question or continue with the next planned topic.');phaseTo('paused');return;
                }
            }
            if(!mounted.current)return;
            setLog(takes.current.map(t=>({question:t.question.prompt,answer:t.transcript})));
            await advance(nextAction,nextQuestion);
        }finally{locked.current=false;}
    }
    async function advance(action:string,next:Question){
        setLog(takes.current.map(t=>({question:t.question.prompt,answer:t.transcript})));
        nextRetry.current=null;setWaitingRetry(false);
        if(action==='finish'){await finishSession(true);return;}
        isFollowup.current=action==='probe';
        baseIndex.current=takes.current.filter(t=>questionKind(t.question).purpose!=='introduction'&&!t.question.isFollowup).length;
        ask({...next,isFollowup:action==='probe',id:next.id??crypto.randomUUID()});
    }
    async function retryNext(local=false){
        const retry=nextRetry.current;if(!retry||locked.current)return;
        locked.current=true;setError('');phaseTo('thinking');setStatus(local?'Continuing with a local bank question.':'Retrying the adaptive interviewer…');
        try{const result=local?{nextAction:retry.action,nextQuestion:retry.fallback}:await aiRequest<{nextAction:string;nextQuestion:Question}>('/api/interviewer',retry.body);await advance(result.nextAction,result.nextQuestion);}
        catch(e){setError(e instanceof Error?e.message:'Retry failed.');setStatus('Your answer is saved. Retry or continue with the next planned topic.');phaseTo('paused');}
        finally{locked.current=false;}
    }
    async function finishSession(fromSubmit=false) {
        if(locked.current&&!fromSubmit)return;
        const previousPhase=phaseRef.current;
        locked.current=true;phaseTo('ending');stopSpeech();coach.current?.setListening(false);
        try{
            if(!fromSubmit&&!nextRetry.current&&['listening','paused','review'].includes(previousPhase)){
                let e:RecordingEvidence={...empty(),transcript:captionRef.current};
                if(camera&&coach.current){try{e=await coach.current.finishTurn(turnStart.current,{refine:refineCaptions});}catch{/* Keep live captions and the original video on a recognition error. */}}
                if(!mounted.current)return;
                if(e.transcript.trim()){
                    const duration=Math.min(180,Math.max(0,camera?(coach.current?.currentTime??turnStart.current)-turnStart.current:performance.now()/1000-turnStart.current));
                    const delivery=camera?recordedDelivery({transcript:e.transcript,duration,words:e.words,audio:e.audioEvidence,vision:e.visionEvidence}):null;
                    const analysis=localTurn(current.current,e.transcript,duration,camera,'content') as Analysis;analysis.scores.confidence=delivery?.score??null;
                    takes.current.push({...e,question:current.current,analysis,duration,hasRecording:camera,url:null,mime:'',transcriptSource:camera?'recording':'typed',delivery,recordingOffset:Math.max(0,turnStart.current-recorderOffset.current),sessionRecording:camera,cloudEligible:aiConsent&&props.cloudAvailable,referenceAnswer:current.current.isFollowup?null:bankEntry(current.current.bankId)?.answerKey??null});
                    if(aiConsent&&props.cloudAvailable)takes.current[takes.current.length-1].analysis.aiStatus='pending';
                }
            }
            if(camera&&recorder.current){
                if(recorder.current.state!=='inactive')recorder.current.stop();
                const blob=await recording.current;
                if(blob?.size){const url=URL.createObjectURL(blob);takes.current=takes.current.map(t=>({...t,url,mime:blob.type,hasRecording:true}));
                    // An interrupted current turn still gets a replayable range.
                    if(!takes.current.length)takes.current.push({...empty(),question:current.current,analysis:localTurn(current.current,'',0,true,'content') as Analysis,duration:Math.max(0,elapsed),hasRecording:true,url,mime:blob.type,transcriptSource:'skipped',delivery:null,recordingOffset:0,sessionRecording:true});
                }
            }
            release();setStatus('Recording saved. Opening your end-of-interview assessment.');
            if(!mounted.current)return;props.onComplete(takes.current);
        }catch(e){if(mounted.current){release();props.onComplete(takes.current.map(t=>({...t,hasRecording:false,url:null,mime:''})), 'The video could not be finalized. Completed transcripts and feedback are retained; video clips are unavailable.');}}
        finally{locked.current=false;}
    }
    const active=phase!=='ready'&&phase!=='loading';
    return <section className="conversation-studio">
        <div className="studio-heading"><div><div className="eyebrow">A CONVERSATION, AT YOUR PACE</div><h1>Let’s <em>talk.</em></h1><p>{props.role} · {topicLimit} topics{followups?' + follow-ups':''} · {aiConsent?'Questions adapt to your answers':'Local practice'}</p></div><strong>{time(elapsed)} / 20:00</strong></div>
        {error&&<p role="alert" className="conversation-error">{error}</p>}
        {waitingRetry&&<div className="studio-actions"><button className="primary" disabled={phase==='thinking'} onClick={()=>void retryNext()}>Retry AI question</button><button className="secondary" disabled={phase==='thinking'} onClick={()=>void retryNext(true)}>Continue with local bank</button></div>}
        <div className="studio-grid"><div>
            <section className="question-card"><div className="question-meta"><span>{isFollowup.current?'Follow-up':question.category}</span><span>{question.source==='generated'?'AI question':question.source==='bank'?'Question bank':'Local question'}</span></div>{question.anchorQuote&&<blockquote className="question-anchor"><span>From your previous answer</span><mark>{question.anchorQuote}</mark></blockquote>}<h2>{question.prompt}</h2>{question.answerFormat&&<p>For this task, include <strong>{question.answerFormat}</strong>.</p>}<p role="status" aria-live="polite">{status||'The interviewer speaks, then listens. One continuous recording captures the whole conversation.'}</p></section>
            {camera&&<section className="camera-card engine-camera"><video ref={video} autoPlay playsInline muted className="live-video" aria-label="Continuous interview camera preview"/><div className="camera-controls"><span className={active?'recording-status':'camera-status'}><i/>{active?'Continuous recording · stays on this device':stream.current?'Camera & microphone preview · model loading':'Camera off'}</span><span>{phase==='listening'?'Listening':phase==='speaking'?'Interviewer speaking':phase==='thinking'?'Preparing response':phase}</span></div></section>}
            {phase==='ready'&&<section className="transcript-card">
                <label className="check-row"><input type="checkbox" checked={camera} onChange={e=>setCamera(e.target.checked)}/><span>Use camera and microphone (turn off for text conversation)</span></label>
                {camera&&<><label className="check-row"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I agree to record and analyze audio/video on this device. English speech and landmark models download on first use. Recordings stay in browser memory.</span></label><label className="check-row"><input type="checkbox" checked={eyeEnabled} onChange={e=>setEyeEnabled(e.target.checked)}/><span>Include an on-device eye-contact estimate<small>Measures approximate camera-directed gaze. Glasses, lighting and camera position affect tracking. It has no score weight until camera validation.</small></span></label></>}
                <label className="check-row"><input type="checkbox" checked={followups} onChange={e=>setFollowups(e.target.checked)}/><span>Allow one follow-up after technical answers only. Introductions and behavioral answers move to the next topic.</span></label>
                <label className="field-label" htmlFor="silence">Wait after I stop speaking</label><select id="silence" value={silence} onChange={e=>setSilence(Number(e.target.value))}><option value={2}>2 seconds · quick</option><option value={3}>3 seconds</option><option value={5}>5 seconds · more thinking time</option><option value={7}>7 seconds</option><option value={10}>10 seconds</option></select>
                {camera&&<label className="check-row"><input type="checkbox" checked={refineCaptions} onChange={e=>setRefineCaptions(e.target.checked)}/><span>Extra transcript accuracy · slower turns<small>Use the larger speech model and rerun the complete answer before moving on. Leave off for faster conversation; review caption errors in your report.</small></span></label>}
                <button className="primary" disabled={camera&&!consent} onClick={()=>void start()}>Start interview</button>
            </section>}
            {phase==='loading'&&<div><p role="status">Connecting devices and loading local English speech recognition. First use downloads the selected model.</p><button className="secondary" onClick={()=>{startup.current++;release();setStatus('');phaseTo('ready');}}>Cancel & turn off devices</button></div>}
            {active&&camera&&eyeEnabled&&<EyeContactReadout summary={eyeSummary} paused={phase!=='listening'}/>}
            {active&&<section className="transcript-card"><label className="field-label" htmlFor="conversation-caption">{camera?'Live transcript · finalized after your turn':'Your response'}</label><textarea id="conversation-caption" rows={5} value={caption} maxLength={12000} readOnly={camera&&phase!=='review'} onChange={e=>captionTo(e.target.value)} placeholder="Your answer appears here…"/>
                {phase==='speaking'&&<>{voiceFailed&&<button className="primary" onClick={()=>{setError('');ask(current.current);}}>Retry question voice</button>}<button className="secondary" onClick={()=>listen()}>{voiceFailed?'Read question & answer without voice':'Interrupt & answer'}</button></>}
                {phase==='listening'&&<><button className="primary" disabled={!camera&&!caption.trim()} onClick={()=>void submitTurn()}>I’m done speaking</button> <button className="secondary" onClick={()=>{coach.current?.setListening(false);phaseTo('paused');setStatus(camera?'Listening paused. Recording continues on this device; finish to stop recording.':'Conversation paused.');}}>Pause listening</button> <button className="text-link" onClick={()=>void submitTurn(true)}>Skip</button></>}
                {phase==='paused'&&!waitingRetry&&<button className="primary" onClick={()=>{coach.current?.setListening(true);phaseTo('listening');lastVoice.current=performance.now();setStatus('Your turn. Continue your answer.');}}>Resume answer</button>}
                {phase==='review'&&<><button className="primary" onClick={()=>listen()}>Try this answer again</button><button className="secondary" disabled={!caption.trim()} onClick={()=>void submitTurn(false,true)}>Use corrected caption</button><button className="text-link" onClick={()=>void submitTurn(true)}>Skip</button></>}
            </section>}
            {active&&<button className="secondary" disabled={phase==='thinking'||phase==='ending'} onClick={()=>void finishSession()}>Finish now & review completed answers</button>}
            {log.length>0&&<details className="transcript-card"><summary>Conversation so far · {log.length} responses</summary>{log.map((t,i)=><div key={i}><h3>{t.question}</h3><p>{t.answer||'Skipped'}</p></div>)}</details>}
        </div><aside className="privacy-card"><h3>Your words drive the feedback.</h3><p>Speech is transcribed locally. Faster conversation uses Whisper Tiny English and finalizes caption batches once; optional extra accuracy uses Whisper Base English and reruns the complete answer. Captions can be wrong; check them in your report. Use headphones to reduce interviewer echo. Select “I’m done speaking” to advance without waiting for the silence timer.</p><p>Technical feedback uses the content rubric and relevant reference approach. Personal stories remain unverified. Video observations describe framing and head position, never feelings or eye-contact certainty.</p>
            <label className="check-row"><input type="checkbox" checked={aiConsent} disabled={!props.cloudAvailable||phase!=='ready'} onChange={e=>setAiConsent(e.target.checked)}/><span>Use {props.providerLabel} for adaptive questions, grading, reports and clip transcript coaching<small>{props.unpaid?'I will use only fictional, non-sensitive practice answers. I consent to sending these transcripts, questions, a broad role, selected skill topics, interview focus/level and session transcripts and evidence-based feedback to Google. Free-tier inputs and outputs may improve Google products and be read by reviewers. My real resume and recording are not uploaded.':'I consent to sending question/answer transcripts, selected skill topics, interview focus/level and session transcripts and evidence-based feedback to the configured AI provider. Recordings remain local.'}</small></span></label>
            <p>{aiConsent?'When useful, Gearwell uses your latest answer to ask a focused follow-up. Otherwise it moves straight to the next planned topic. Short exact quotes may highlight something to clarify. Latency and free quotas can interrupt AI; local fallback is labeled. Finishing early preserves the partial response and grades it when AI consent is enabled.':'Without this opt-in, answers stay local, questions use local retrieval/templates and feedback uses an approximate browser rubric.'}</p>
            {phase==='ready'&&<button className="text-link" onClick={props.onLegacy}>Switch to individual answer setup</button>}
        </aside></div>
    </section>;
}
