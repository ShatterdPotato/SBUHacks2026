'use client';
import { useEffect, useRef, useState } from 'react';
import { RecordingCoach, type RecordingEvidence } from '../lib/recording-coach';
import { recordedDelivery } from '../lib/recorded-delivery.mjs';
import { localTurn, localFollowup } from '../lib/conversation.mjs';
import type { Question, Take, Analysis } from '../lib/interview-types';

type Phase = 'ready'|'loading'|'speaking'|'listening'|'thinking'|'paused'|'review'|'ending';
type Props = {questions:Question[];role:string;roleFamily:string;provider:string;providerLabel:string;cloudAvailable:boolean;unpaid:boolean;onComplete:(takes:Take[],warning?:string)=>void;onLegacy:()=>void};
const empty = ():RecordingEvidence => ({words:[],audioEvidence:[],visionEvidence:[],transcript:''});
const time = (n:number) => `${Math.floor(n/60)}:${Math.floor(n%60).toString().padStart(2,'0')}`;

export function ConversationStudio(props:Props) {
    const [phase,setPhaseState] = useState<Phase>('ready');
    const [camera,setCamera] = useState(true);
    const [consent,setConsent] = useState(false);
    const [aiConsent,setAiConsent] = useState(false);
    const [followups,setFollowups] = useState(true);
    const [silence,setSilence] = useState(5);
    const [question,setQuestion] = useState(props.questions[0]);
    const [caption,setCaptionState] = useState('');
    const [status,setStatus] = useState('');
    const [error,setError] = useState('');
    const [elapsed,setElapsed] = useState(0);
    const [log,setLog] = useState<{question:string;answer:string}[]>([]);
    const phaseRef = useRef<Phase>('ready'), mounted = useRef(true), video = useRef<HTMLVideoElement>(null);
    const stream = useRef<MediaStream|null>(null), coach = useRef<RecordingCoach|null>(null), recorder = useRef<MediaRecorder|null>(null);
    const recording = useRef<Promise<Blob>|null>(null), startAt = useRef(0), turnStart = useRef(0), recorderOffset = useRef(0);
    const lastVoice = useRef(0), voiced = useRef(0), noise = useRef<number[]>([]), captionRef = useRef('');
    const takes = useRef<Take[]>([]), baseIndex = useRef(0), isFollowup = useRef(false), current = useRef(question);
    const locked = useRef(false), startup = useRef(0), speechToken = useRef(0), speechTimer = useRef<ReturnType<typeof setTimeout>|null>(null), requestController = useRef<AbortController|null>(null);
    function phaseTo(p:Phase) { phaseRef.current=p;if(mounted.current)setPhaseState(p); }
    function captionTo(s:string) {captionRef.current=s;if(mounted.current)setCaptionState(s);}
    function stopSpeech() { speechToken.current++; if(speechTimer.current)clearTimeout(speechTimer.current);window.speechSynthesis?.cancel(); }
    function release() { stopSpeech();coach.current?.dispose();coach.current=null;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null; }
    useEffect(()=>{ mounted.current=true;return()=>{mounted.current=false;requestController.current?.abort();stopSpeech();if(recorder.current?.state==='recording')recorder.current.stop();coach.current?.dispose();stream.current?.getTracks().forEach(t=>t.stop());}; },[]);
    useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(recorder.current?.state==='recording'){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);
    useEffect(()=>{if(video.current&&stream.current){video.current.srcObject=stream.current;void video.current.play().catch(()=>{});}},[phase,camera]);
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
        stopSpeech();captionTo('');voiced.current=0;noise.current=[];lastVoice.current=performance.now();
        turnStart.current=coach.current?.beginTurn()??performance.now()/1000;
        phaseTo('listening');setStatus(message??(camera?'Your turn. Finish naturally; a pause advances the conversation.':'Your turn. Type your response below.'));
    }
    function ask(q:Question) {
        current.current=q;setQuestion(q);captionTo('');coach.current?.setListening(false);phaseTo('speaking');
        stopSpeech();const token=speechToken.current;
        const voice=window.speechSynthesis?.getVoices().find(v=>v.localService&&/^en(?:-|_)/i.test(v.lang));
        if(!voice){listen('Your turn. No local English voice is available; read the question above, then answer.');return;}
        const speech=new SpeechSynthesisUtterance(q.prompt);speech.voice=voice;speech.rate=1;
        const done=()=>{if(token===speechToken.current&&mounted.current&&phaseRef.current==='speaking')listen();};
        speech.onend=done;speech.onerror=done;speechTimer.current=setTimeout(done,45000);
        setStatus('Interviewer speaking · your microphone is excluded from transcription until your turn');window.speechSynthesis.speak(speech);
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
                stream.current=newStream;
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
                });
                await coach.current.warm();if(attempt!==startup.current||!mounted.current)return;
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
        if(locked.current||!['listening','paused','review'].includes(phaseRef.current))return;
        locked.current=true;phaseTo('thinking');setError('');
        const duration=Math.min(180,Math.max(0,camera?(coach.current?.currentTime??turnStart.current)-turnStart.current:performance.now()/1000-turnStart.current));
        let evidence=empty();
        try {
            if(corrected)evidence={...empty(),transcript:captionRef.current};
            else if(camera&&coach.current){
                try{evidence=await coach.current.finishTurn(turnStart.current);}catch(e){
                    if(!skip){setError('Recognition failed. Review the live caption below or finish the session to keep the video.');phaseTo('review');return;}
                }
                if(!mounted.current)return;
                captionTo(evidence.transcript);
            }else evidence={...empty(),transcript:captionRef.current};
            if(skip)evidence={...evidence,transcript:'',words:[]};
            if(!skip&&!evidence.transcript.trim()){setError('No speech was recognized. Choose “Try this answer again”, skip, or finish to preserve the video.');phaseTo('review');return;}
            const q=current.current;
            let analysis=localTurn(q,evidence.transcript,duration,camera) as Analysis;
            let followup=localFollowup(q,evidence.transcript);
            if(aiConsent&&props.cloudAvailable&&!skip){
                setStatus(`Waiting for ${props.providerLabel} to respond…`);
                try{
                    const controller=new AbortController();requestController.current=controller;
                    const response=await fetch('/api/interview-turn',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(75000)]),body:JSON.stringify({question:q,answer:evidence.transcript,role:props.roleFamily,history:takes.current.slice(-4).map(t=>({question:t.question.prompt,answer:t.transcript})),duration,recorded:camera,cloudConsent:true,providerConsent:props.provider,demoDataOnly:props.unpaid,privacyMode:'fictional',nonSensitiveConsent:true})});
                    const data=await response.json() as {error?:string;analysis:Analysis;followup:string};if(!response.ok)throw new Error(data.error??'AI request failed.');
                    analysis=data.analysis;followup=data.followup;
                }catch(e){if(!mounted.current)return;setError(`${e instanceof Error?e.message:'AI unavailable.'} This turn uses local practice feedback; the recording is preserved.`);}
            }
            if(!mounted.current)return;
            const delivery=camera&&!skip?recordedDelivery({transcript:evidence.transcript,duration,words:evidence.words,audio:evidence.audioEvidence,vision:evidence.visionEvidence}):null;
            if(delivery){analysis={...analysis,scores:{...analysis.scores,confidence:delivery.score},metrics:delivery.metrics};}
            takes.current.push({...evidence,question:q,analysis,duration,hasRecording:camera,url:null,mime:'',transcriptSource:skip?'skipped':corrected?'recording-corrected':camera?'recording':'typed',delivery,recordingOffset:Math.max(0,turnStart.current-recorderOffset.current),sessionRecording:camera});
            setLog(takes.current.map(t=>({question:t.question.prompt,answer:t.transcript})));
            const shouldFollow=followups&&!isFollowup.current&&!skip&&analysis.metrics.words>=10;
            if(shouldFollow){isFollowup.current=true;ask({...q,id:`${q.id}-followup`,prompt:followup,source:analysis.mode==='live'?'generated':'curated'});}
            else {isFollowup.current=false;baseIndex.current++;if(baseIndex.current>=props.questions.length){await finishSession(true);return;}ask(props.questions[baseIndex.current]);}
        }finally{locked.current=false;}
    }
    async function finishSession(fromSubmit=false) {
        if(locked.current&&!fromSubmit)return;
        const previousPhase=phaseRef.current;
        locked.current=true;phaseTo('ending');stopSpeech();coach.current?.setListening(false);
        try{
            if(!fromSubmit&&['listening','paused','review'].includes(previousPhase)){
                let e:RecordingEvidence={...empty(),transcript:captionRef.current};
                if(camera&&coach.current){try{e=await coach.current.finishTurn(turnStart.current);}catch{/* Keep live captions and the original video on a recognition error. */}}
                if(!mounted.current)return;
                if(e.transcript.trim()){
                    const duration=Math.min(180,Math.max(0,camera?(coach.current?.currentTime??turnStart.current)-turnStart.current:performance.now()/1000-turnStart.current));
                    const delivery=camera?recordedDelivery({transcript:e.transcript,duration,words:e.words,audio:e.audioEvidence,vision:e.visionEvidence}):null;
                    const analysis=localTurn(current.current,e.transcript,duration,camera) as Analysis;analysis.scores.confidence=delivery?.score??null;
                    takes.current.push({...e,question:current.current,analysis,duration,hasRecording:camera,url:null,mime:'',transcriptSource:camera?'recording':'typed',delivery,recordingOffset:Math.max(0,turnStart.current-recorderOffset.current),sessionRecording:camera});
                }
            }
            if(camera&&recorder.current){
                if(recorder.current.state!=='inactive')recorder.current.stop();
                const blob=await recording.current;
                if(blob?.size){const url=URL.createObjectURL(blob);takes.current=takes.current.map(t=>({...t,url,mime:blob.type,hasRecording:true}));
                    // An interrupted current turn still gets a replayable range.
                    if(!takes.current.length)takes.current.push({...empty(),question:current.current,analysis:localTurn(current.current,'',0,true) as Analysis,duration:Math.max(0,elapsed),hasRecording:true,url,mime:blob.type,transcriptSource:'skipped',delivery:null,recordingOffset:0,sessionRecording:true});
                }
            }
            if(!mounted.current)return;release();props.onComplete(takes.current);
        }catch(e){if(mounted.current){release();props.onComplete(takes.current.map(t=>({...t,hasRecording:false,url:null,mime:''})), 'The video could not be finalized. Completed transcripts and feedback are retained; video clips are unavailable.');}}
        finally{locked.current=false;}
    }
    const active=phase!=='ready'&&phase!=='loading';
    return <section className="conversation-studio">
        <div className="studio-heading"><div><div className="eyebrow">A CONVERSATION, AT YOUR PACE</div><h1>Let’s <em>talk.</em></h1><p>{props.role} · {props.questions.length} topics{followups?' + follow-ups':''}</p></div><strong>{time(elapsed)} / 20:00</strong></div>
        {error&&<p role="alert" className="conversation-error">{error}</p>}
        <div className="studio-grid"><div>
            <section className="question-card"><div className="question-meta"><span>{isFollowup.current?'Follow-up':question.category}</span><span>{aiConsent?'AI conversation':'Local practice conversation'}</span></div><h2>{question.prompt}</h2><p role="status" aria-live="polite">{status||'The interviewer speaks, then listens. One continuous recording captures the whole conversation.'}</p></section>
            {camera&&<section className="camera-card"><video ref={video} autoPlay playsInline muted className="live-video" aria-label="Continuous interview camera preview"/><div className="camera-controls"><span className={active?'recording-status':'camera-status'}><i/>{active?'Continuous recording · stays on this device':stream.current?'Camera & microphone preview · model loading':'Camera off'}</span><span>{phase==='listening'?'Listening':phase==='speaking'?'Interviewer speaking':phase==='thinking'?'Preparing response':phase}</span></div></section>}
            {phase==='ready'&&<section className="transcript-card">
                <label className="check-row"><input type="checkbox" checked={camera} onChange={e=>setCamera(e.target.checked)}/><span>Use camera and microphone (turn off for text conversation)</span></label>
                {camera&&<label className="check-row"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I agree to record and analyze audio/video on this device. English speech and landmark models download on first use. Recordings stay in browser memory.</span></label>}
                <label className="check-row"><input type="checkbox" checked={followups} onChange={e=>setFollowups(e.target.checked)}/><span>Ask one follow-up after each substantive answer</span></label>
                <label className="field-label" htmlFor="silence">Wait after I stop speaking</label><select id="silence" value={silence} onChange={e=>setSilence(Number(e.target.value))}><option value={5}>5 seconds</option><option value={7}>7 seconds</option><option value={10}>10 seconds</option></select>
                <button className="primary" disabled={camera&&!consent} onClick={()=>void start()}>Start interview</button>
            </section>}
            {phase==='loading'&&<div><p role="status">Connecting devices and loading the larger English speech model. First use can take several minutes.</p><button className="secondary" onClick={()=>{startup.current++;release();setStatus('');phaseTo('ready');}}>Cancel & turn off devices</button></div>}
            {active&&<section className="transcript-card"><label className="field-label" htmlFor="conversation-caption">{camera?'Live transcript · finalized after your turn':'Your response'}</label><textarea id="conversation-caption" rows={5} value={caption} maxLength={12000} readOnly={camera&&phase!=='review'} onChange={e=>captionTo(e.target.value)} placeholder="Your answer appears here…"/>
                {phase==='speaking'&&<button className="secondary" onClick={()=>listen()}>Interrupt & answer</button>}
                {phase==='listening'&&<><button className="primary" disabled={!camera&&!caption.trim()} onClick={()=>void submitTurn()}>I’m done speaking</button> <button className="secondary" onClick={()=>{coach.current?.setListening(false);phaseTo('paused');setStatus(camera?'Listening paused. Recording continues on this device; finish to stop recording.':'Conversation paused.');}}>Pause listening</button> <button className="text-link" onClick={()=>void submitTurn(true)}>Skip</button></>}
                {phase==='paused'&&<button className="primary" onClick={()=>{coach.current?.setListening(true);phaseTo('listening');lastVoice.current=performance.now();setStatus('Your turn. Continue your answer.');}}>Resume answer</button>}
                {phase==='review'&&<><button className="primary" onClick={()=>listen()}>Try this answer again</button><button className="secondary" disabled={!caption.trim()} onClick={()=>void submitTurn(false,true)}>Use corrected caption</button><button className="text-link" onClick={()=>void submitTurn(true)}>Skip</button></>}
            </section>}
            {active&&<button className="secondary" disabled={phase==='thinking'||phase==='ending'} onClick={()=>void finishSession()}>Finish now & review completed answers</button>}
            {log.length>0&&<details className="transcript-card"><summary>Conversation so far · {log.length} responses</summary>{log.map((t,i)=><div key={i}><h3>{t.question}</h3><p>{t.answer||'Skipped'}</p></div>)}</details>}
        </div><aside className="privacy-card"><h3>Your words drive the feedback.</h3><p>Speech is transcribed locally with Whisper Base English. Multi-batch answers receive a complete-answer refinement. Captions can be wrong; check them in your report. Use headphones to reduce interviewer echo.</p><p>Knowledge checks cite a small reference pack. Claims without evidence and personal stories stay unverified. Video observations describe framing and head position, never feelings or eye-contact certainty.</p>
            <label className="check-row"><input type="checkbox" checked={aiConsent} disabled={!props.cloudAvailable||phase!=='ready'} onChange={e=>setAiConsent(e.target.checked)}/><span>Use {props.providerLabel} for adaptive follow-ups and reference-based feedback<small>{props.unpaid?'I will use only fictional, non-sensitive practice answers. I consent to sending these transcripts, questions, a broad role and up to four prior responses to Google. Free-tier inputs and outputs may improve Google products and be read by reviewers. My real resume and recording are not uploaded.':'I consent to sending question/answer transcripts and up to four prior responses to the configured AI provider. Recordings remain local.'}</small></span></label>
            <p>{aiConsent?'AI responds between turns; latency and free quotas can interrupt the conversation. Finishing early saves an unfinished response with local feedback.':'Without this opt-in, answers stay local, follow-ups use templates and factual checks have limited coverage.'}</p>
            {phase==='ready'&&<button className="text-link" onClick={props.onLegacy}>Use individual answer practice</button>}
        </aside></div>
    </section>;
}
