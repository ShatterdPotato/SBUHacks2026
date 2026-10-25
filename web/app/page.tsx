'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowRight, AudioLines, Check, CheckCircle2, ChevronDown, CircleHelp, Download, FileText, Film, Layers3, LoaderCircle, LockKeyhole, Plus, ShieldCheck, Sparkles, Square, Upload, Video, X } from 'lucide-react';
import { reportFor, overallScore, retrieveQuestions, setupInput, wordCount } from '../lib/interview.mjs';
import { profileForInterview, personalQuestionRequest } from '../lib/resume-profile.mjs';
import { resumeText as validateResumeText } from '../lib/resume-text.mjs';
import { recordedDelivery, selectMoments } from '../lib/recorded-delivery.mjs';
import { RecordingCoach, type RecordingEvidence } from '../lib/recording-coach';
import { MomentClip, type Moment } from '../components/moment-clip';
import type { Question, Analysis, Take } from '../lib/interview-types';
import { ConversationStudio } from '../components/conversation-studio';
import { freshQuestions, recentQuestions, rememberQuestions } from '../lib/question-variety.mjs';
import { localTurn } from '../lib/conversation.mjs';
import { questionKind } from '../lib/question-kind.mjs';
import { aiRequest, clearSessionUsage, sessionUsage } from '../lib/ai-client';
import { coverageSchedule } from '../lib/technical-bank.mjs';
import { PremiumReview, type ClipFeedback } from '../components/premium-review';
import type { InterviewPlan } from '../lib/interview-types';
import { FeedbackText } from '../components/feedback-text';
import { GradingBreakdown } from '../components/grading-breakdown';
type Pending = {
    video: Promise<Blob>;
    audio: Promise<Blob>;
};
const clock = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
const scoreText = (score: number | null | undefined) => score == null ? '—' : String(score);
const api = aiRequest;
function download(url: string, filename: string) { const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); }
function TranscriptCorrection({take,onSave}:{take:Take;onSave:(value:string)=>void}) {
    const [value,setValue]=useState(take.transcript);
    return <details><summary>Correct recognition errors</summary><label className="field-label" htmlFor={`correct-${take.question.id}`}>Corrected transcript</label><textarea id={`correct-${take.question.id}`} rows={5} maxLength={12000} value={value} onChange={e=>setValue(e.target.value)}/><p>Corrections invalidate previous AI conclusions and automatically regrade answers with existing cloud consent. Failed regrades can be retried in the review panel. Delivery and alignment keep the original recording evidence.</p><button className="secondary" disabled={value===take.transcript} onClick={()=>onSave(value)}>Save correction</button></details>;
}
export default function Home() {
    const [conversational, setConversational] = useState(true);
    const [stage, setStage] = useState<'setup' | 'studio' | 'review'>('setup');
    const [role, setRole] = useState('');
    const [context, setContext] = useState('');
    const [tab, setTab] = useState<'prompt' | 'resume'>('prompt');
    const [type, setType] = useState('Mixed');
    const [level, setLevel] = useState('Internship');
    const [count, setCount] = useState(4);
    const [resumeText, setResumeText] = useState('');
    const [filename, setFilename] = useState('');
    const [cloudAvailable, setCloudAvailable] = useState<boolean | null>(null);
    const [provider, setProvider] = useState('openai');
    const [providerLabel, setProviderLabel] = useState('OpenAI');
    const [fictionalOnly, setFictionalOnly] = useState(false);
    const [privacyMode, setPrivacyMode] = useState<'personal' | 'fictional'>('personal');
    const [excludedSkills, setExcludedSkills] = useState<string[]>([]);
    const [mediaCloudAvailable, setMediaCloudAvailable] = useState(false);
    const [online, setOnline] = useState(true);
    const [cloudConsent, setCloudConsent] = useState(false);
    const [mediaConsent, setMediaConsent] = useState(false);
    const [visualConsent, setVisualConsent] = useState(false);
    const [mode, setMode] = useState('demo');
    const [aiReport,setAiReport]=useState<unknown>(null),[practiceDrills,setPracticeDrills]=useState<unknown>(null);
    const [clipFeedback,setClipFeedback]=useState<Record<string,ClipFeedback>>({});
    const [plan,setPlan]=useState<InterviewPlan|null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<Take[]>([]);
    const [transcript, setTranscript] = useState('');
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [questionError, setQuestionError] = useState(false);
    const [media, setMedia] = useState(false);
    const [textOnly, setTextOnly] = useState(false);
    const [recording, setRecording] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [clip, setClip] = useState<{
        url: string;
        blob: Blob;
        audio: Blob;
        duration: number;
    } | null>(null);
    const [meter, setMeter] = useState(0);
    const [speechStatus, setSpeechStatus] = useState('');
    const [recordedTranscript, setRecordedTranscript] = useState('');
    const [evidence, setEvidence] = useState<RecordingEvidence | null>(null);
    const coachRef = useRef<RecordingCoach | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const helpRef = useRef<HTMLDialogElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const audioRecorderRef = useRef<MediaRecorder | null>(null);
    const pendingRef = useRef<Pending | null>(null);
    const startedRef = useRef(0);
    const urlsRef = useRef<string[]>([]);
    const framesRef = useRef<string[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);
    const meterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const mountedRef = useRef(true);
    const uploadInProgressRef = useRef(false);
    const q = questions[index];
    const report = reportFor(answers);
    const selectedMoments = selectMoments(answers) as { best: Moment[]; worst: Moment[] };
    const allMoments=[...selectedMoments.best,...selectedMoments.worst];
    const moments=Object.keys(clipFeedback).length?{best:allMoments.filter(m=>clipFeedback[m.id]?clipFeedback[m.id].kind==='strength':selectedMoments.best.some(x=>x.id===m.id)),worst:allMoments.filter(m=>clipFeedback[m.id]?clipFeedback[m.id].kind==='improvement':selectedMoments.worst.some(x=>x.id===m.id))}:selectedMoments;
    const personalFree = fictionalOnly && privacyMode === 'personal';
    const localReview = mode !== 'live' || personalFree;
    const reportLocal = !answers.some(a=>a.analysis.mode==='live');
    const activeResumeText = tab === 'resume' ? resumeText : '';
    const detectedProfile = profileForInterview({ role, context, resume: resumeText, source: tab });
    const displayRole = role.trim() || detectedProfile.roleFamily || 'General interview';
    const profile = { ...detectedProfile, skills: detectedProfile.skills.filter((skill:string) => !excludedSkills.includes(skill)) };
    useEffect(() => { fetch('/api/health').then(async (r) => { if (!r.ok)
        throw new Error(); return await r.json() as {
        cloudAvailable: boolean; provider: string; providerLabel: string;
        demoDataOnly: boolean; mediaCloudAvailable: boolean; pdfCloudAvailable: boolean;
    }; }).then(d => { setCloudAvailable(d.cloudAvailable === true); setProvider(d.provider); setProviderLabel(d.providerLabel); setFictionalOnly(d.demoDataOnly === true); setMediaCloudAvailable(d.mediaCloudAvailable === true); }).catch(() => { setOnline(false); setError('The interview service is unavailable. Refresh once the server is running.'); }); }, []);
    function releaseDevices() {
        coachRef.current?.dispose(); coachRef.current = null;
        if ('speechSynthesis' in window)
            window.speechSynthesis.cancel();
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        if (meterTimerRef.current)
            clearInterval(meterTimerRef.current);
        void audioContextRef.current?.close().catch(() => { });
        audioContextRef.current = null;
        setMedia(false);
        setMeter(0);
    }
    useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; coachRef.current?.dispose(); recorderRef.current?.state === 'recording' && recorderRef.current.stop(); audioRecorderRef.current?.state === 'recording' && audioRecorderRef.current.stop(); streamRef.current?.getTracks().forEach(t => t.stop()); if (meterTimerRef.current)
        clearInterval(meterTimerRef.current); void audioContextRef.current?.close().catch(() => { }); urlsRef.current.forEach(u => URL.revokeObjectURL(u)); }; }, []);
    useEffect(() => { if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        void videoRef.current.play().catch(() => { });
    } }, [media, stage, index, clip]);
    useEffect(() => { if (!recording)
        return; const timer = setInterval(() => setSeconds(s => s + 1), 1000); return () => clearInterval(timer); }, [recording]);
    useEffect(() => { if (!recording || !visualConsent || !mediaCloudAvailable || mode !== 'live')
        return; function sample() { const v = videoRef.current; if (!v || !v.videoWidth || framesRef.current.length >= 4)
        return; const c = document.createElement('canvas'); c.width = 384; c.height = Math.round(v.videoHeight / v.videoWidth * 384); c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height); framesRef.current.push(c.toDataURL('image/jpeg', .55)); } const timer = setInterval(sample, 15000); sample(); return () => clearInterval(timer); }, [recording, visualConsent, mediaCloudAvailable, mode]);
    useEffect(() => { if (recording && seconds >= 180)
        void stopRecording(); }, [seconds, recording]); // Three-minute answer cap.
    useEffect(() => { const warn = (e: BeforeUnloadEvent) => { if (answers.some(a => a.hasRecording) || clip || recording) {
        e.preventDefault();
        e.returnValue = '';
    } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [answers, clip, recording]);
    function fail(e: unknown) { setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); }
    function changeSource(next: 'prompt' | 'resume') {
        if (next === tab) return;
        setTab(next);
        setCloudConsent(false);
        setExcludedSkills([]);
    }
    async function upload(file: File) {
        if (busy || uploadInProgressRef.current) return;
        uploadInProgressRef.current = true;
        setError('');
        setQuestionError(false);
        setBusy('Reading resume');
        try {
            if (file.size > 2 * 1024 * 1024)
                throw new Error('Please use a resume of 2 MB or smaller.');
            let value: string;
            if (/\.txt$/i.test(file.name)) value = await file.text();
            else if (/\.pdf$/i.test(file.name)) {
                const { readPdfResume } = await import('../lib/pdf-resume');
                value = await readPdfResume(file);
            } else
                throw new Error('Upload a .pdf or .txt resume. You can also paste the text.');
            setResumeText(validateResumeText(value));
            setFilename(file.name);
            setExcludedSkills([]);
            setCloudConsent(false);
        }
        catch (e) {
            fail(e);
        }
        finally {
            uploadInProgressRef.current = false;
            setBusy('');
            if (fileRef.current)
                fileRef.current.value = '';
        }
    }
    async function prepare(forcePractice = false) {
        setError('');
        setQuestionError(false);
        setBusy('Preparing your interview');
        try {
            const useCloud = cloudConsent && !forcePractice;
            if (forcePractice) setCloudConsent(false);
            const combined = [context, activeResumeText].filter(Boolean).join('\n\n');
            const previous = recentQuestions(displayRole);
            const variation = crypto.randomUUID();
            const format = conversational ? 'conversation' : 'individual';
            const requested = conversational ? 1 : count;
            let data: { questions: Question[]; mode: string; plan?:InterviewPlan };
            clearSessionUsage();
            const localPlan={schedule:coverageSchedule(type,count),priorities:profile.skills,profile,type,level,count};
            if (!useCloud) {
                data = { mode: 'demo', questions: retrieveQuestions(setupInput({ role: displayRole, context: combined.slice(0, 20000), type, level, count }), { previous }).slice(0,requested) };
            } else {
                data=await api('/api/plan',{profile,count,type,level,cloudConsent:true,providerConsent:provider,privacyMode,demoDataOnly:privacyMode==='fictional'});
                if(!conversational)data.questions=retrieveQuestions(setupInput({role:displayRole,type,level,count}),{previous});
            }
            setPlan(data.plan??localPlan);
            if(conversational&&!useCloud)data.questions=[{id:crypto.randomUUID(),prompt:'To begin, what interests you about this role, and which skills would you like to bring to it?',category:'Behavioral',purpose:'introduction',focus:['motivation','skills'],source:'curated'}];
            const fresh = (conversational&&data.questions[0]?.purpose==='introduction'?data.questions:freshQuestions(data.questions, previous)) as Question[];
            if (fresh.length < requested) fresh.push(...retrieveQuestions(setupInput({ role:displayRole, type, level, count }), { previous:[...previous,...fresh.map(q=>q.prompt)] }).filter((q:Question)=>!fresh.some(f=>f.prompt===q.prompt)).slice(0,requested-fresh.length));
            const selected = fresh.slice(0,requested);rememberQuestions(displayRole, selected);setQuestions(selected);
            setMode(data.mode);
            setStage('studio');
            setIndex(0);
            window.scrollTo(0, 0);
        }
        catch (e) {
            setQuestionError(true);
            fail(e);
        }
        finally {
            setBusy('');
        }
    }
    async function enableMedia() {
        if (!mediaConsent)
            return;
        setBusy('Connecting camera & microphone');
        setError('');
        try {
            if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
                throw new Error('Recording needs a supported browser on localhost or HTTPS. You can continue with text answers.');
            if (!coachRef.current) {
                const coach = new RecordingCoach(text => { if (mountedRef.current) { setTranscript(text); setRecordedTranscript(text); } }, status => { if (mountedRef.current) setSpeechStatus(status); });
                coachRef.current = coach;
                try { await coach.warm(); } catch (error) { coach.dispose(); coachRef.current = null; throw error; }
            }
            if (!mountedRef.current) return;
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: { echoCancellation: true, noiseSuppression: true } });
            if (!mountedRef.current) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }
            streamRef.current = stream;
            setMedia(true);
            setTextOnly(false);
            stream.getTracks().forEach(track => track.addEventListener('ended', () => { void stopRecording(); setRecording(false); setError('A camera or microphone disconnected. Reconnect your devices to record again.'); releaseDevices(); }));
            try {
                const ac = new AudioContext();
                audioContextRef.current = ac;
                const analyser = ac.createAnalyser();
                analyser.fftSize = 256;
                ac.createMediaStreamSource(stream).connect(analyser);
                const buffer = new Uint8Array(analyser.frequencyBinCount);
                meterTimerRef.current = setInterval(() => { analyser.getByteFrequencyData(buffer); setMeter(buffer.reduce((a, b) => a + b, 0) / buffer.length / 128); }, 150);
            }
            catch { /* Recording still works when a level meter is unavailable. */ }
        }
        catch (e) {
            setError(e instanceof DOMException && e.name === 'NotAllowedError' ? 'Camera or microphone access was declined. Change browser permissions or use text answers.' : e instanceof Error ? e.message : 'Camera unavailable. Try text answers.');
            releaseDevices();
        }
        finally {
            setBusy('');
        }
    }
    async function startRecording() {
        if ('speechSynthesis' in window)
            window.speechSynthesis.cancel();
        if (!streamRef.current || !streamRef.current.getAudioTracks().some(t => t.readyState === 'live')) {
            setError('Reconnect your camera and microphone before recording.');
            return;
        }
        setBusy('Starting recording');
        try {
            const videoType = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(t => MediaRecorder.isTypeSupported(t));
            const audioType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t));
            const recorder = new MediaRecorder(streamRef.current, { ...(videoType ? { mimeType: videoType } : {}), videoBitsPerSecond: 800000, audioBitsPerSecond: 64000 });
            const audio = new MediaRecorder(new MediaStream(streamRef.current.getAudioTracks()), { ...(audioType ? { mimeType: audioType } : {}), audioBitsPerSecond: 64000 });
            const capture = (r: MediaRecorder) => new Promise<Blob>((resolve, reject) => { const chunks: Blob[] = []; r.ondataavailable = e => { if (e.data.size)
                chunks.push(e.data); }; r.onstop = () => resolve(new Blob(chunks, { type: r.mimeType })); r.onerror = () => { reject(new Error('Recording was interrupted. Reconnect your devices and try again.')); setError('Recording was interrupted. Reconnect your devices and try again.'); setRecording(false); if (recorderRef.current?.state === 'recording')
                recorderRef.current.stop(); if (audioRecorderRef.current?.state === 'recording')
                audioRecorderRef.current.stop(); releaseDevices(); }; });
            pendingRef.current = { video: capture(recorder), audio: capture(audio) };
            recorderRef.current = recorder;
            audioRecorderRef.current = audio;
            // Recorders may fail before the user presses Stop; keep rejections handled.
            void pendingRef.current.video.catch(() => { });
            void pendingRef.current.audio.catch(() => { });
            framesRef.current = [];
            setTranscript(''); setRecordedTranscript(''); setEvidence(null);
            if (!coachRef.current) throw new Error('Local transcription is not ready. Reconnect the devices to retry.');
            await coachRef.current.start(streamRef.current, videoRef.current);
            startedRef.current = Date.now();
            setSeconds(0);
            setError('');
            recorder.start(1000);
            audio.start(1000);
            setRecording(true);
        }
        catch (e) {
            if (coachRef.current) await coachRef.current.stop().catch(() => {});
            pendingRef.current = null;
            fail(e);
        }
        finally { setBusy(''); }
    }
    async function transcribe(audio: Blob) {
        setBusy('Transcribing your answer');
        try {
            if (coachRef.current?.failed) { coachRef.current.dispose(); coachRef.current = null; }
            if (!coachRef.current) {
                const coach = new RecordingCoach(text => { if (mountedRef.current) { setTranscript(text); setRecordedTranscript(text); } }, status => { if (mountedRef.current) setSpeechStatus(status); });
                coachRef.current = coach;
                try { await coach.warm(); } catch (error) { coach.dispose(); coachRef.current = null; throw error; }
            }
            const result = await coachRef.current.retry(audio);
            setEvidence({ ...result, audioEvidence: evidence?.audioEvidence ?? result.audioEvidence, visionEvidence: evidence?.visionEvidence ?? result.visionEvidence });
            setRecordedTranscript(result.transcript); setTranscript(result.transcript);
        }
        catch (e) {
            fail(e);
        }
        finally {
            setBusy('');
        }
    }
    async function stopRecording() {
        if (!pendingRef.current || recorderRef.current?.state !== 'recording')
            return;
        setRecording(false);
        setBusy('Saving your recording');
        recorderRef.current.stop();
        if (audioRecorderRef.current?.state === 'recording')
            audioRecorderRef.current.stop();
        try {
            const [video, audio] = await Promise.all([pendingRef.current.video, pendingRef.current.audio]);
            if (!video.size)
                throw new Error('No recording was captured. Please try again.');
            const duration = Math.min(180, (Date.now() - startedRef.current) / 1000);
            const url = URL.createObjectURL(video);
            urlsRef.current.push(url);
            setClip({ url, blob: video, audio, duration });
            setBusy('Finalizing speech transcript');
            if (coachRef.current) {
                const result = await coachRef.current.stop(); setEvidence(result); setTranscript(result.transcript); setRecordedTranscript(result.transcript);
                if (!result.transcript.trim()) setError('No speech was recognized. Your recording is saved. Retry transcription, retake, or enter a correction.');
            }
        }
        catch (e) {
            if (coachRef.current) setEvidence(coachRef.current.evidence());
            fail(e);
        }
        finally {
            pendingRef.current = null;
            setBusy('');
        }
    }
    function retake() { if (clip) {
        URL.revokeObjectURL(clip.url);
        urlsRef.current = urlsRef.current.filter(u => u !== clip.url);
    } setClip(null); setTranscript(''); setRecordedTranscript(''); setEvidence(null); setSeconds(0); framesRef.current = []; setError(''); }
    async function saveAnswer(skip = false) {
        if (recording)
            return;
        setBusy('Reviewing your answer');
        setError('');
        try {
            const answer = skip ? '' : transcript;
            const analysis: Analysis = localReview
                ? localTurn(q, answer, clip?.duration ?? 0, !!clip)
                : await api<Analysis>('/api/grade', { question: q, answer, duration: clip?.duration ?? 0, recorded: !!clip, mode, cloudConsent, providerConsent: provider, privacyMode, nonSensitiveConsent:privacyMode==='fictional',demoDataOnly: privacyMode === 'fictional', visualConsent, frames: visualConsent && mediaCloudAvailable ? framesRef.current : [] });
            const measured = evidence ?? coachRef.current?.evidence();
            const delivery = !skip && clip && measured ? recordedDelivery({ transcript: recordedTranscript, duration: clip.duration, words: measured.words, audio: measured.audioEvidence, vision: measured.visionEvidence }) : null;
            // Content/comprehension use the audio-derived transcript (with optional corrections).
            // Delivery always uses the original recognition plus measured media evidence.
            analysis.scores.confidence = delivery?.score ?? null;
            if (delivery) analysis.limitation = `${localReview ? 'Content/comprehension use an approximate browser rubric and cannot establish correctness.' : 'AI content/comprehension estimates may be wrong.'} Confidence is a local delivery heuristic using measured recording cues, not feelings or eye contact. Speech timestamps and clip boundaries are approximate.`;
            if (delivery) { analysis.metrics = { ...analysis.metrics, wpm: delivery.metrics.wpm }; analysis.visual = [...analysis.visual, ...delivery.components.filter(c => /Camera|body/.test(c.name)).map(c => c.evidence)]; }
            const next: Take[] = [...answers, { question: q, transcript: answer, analysis, duration: clip?.duration ?? 0, hasRecording: !!clip, url: clip?.url ?? null, mime: clip?.blob.type ?? '',
                words: clip && !skip ? measured?.words ?? [] : [], audioEvidence: clip && !skip ? measured?.audioEvidence ?? [] : [], visionEvidence: clip && !skip ? measured?.visionEvidence ?? [] : [],
                cloudEligible:!localReview,transcriptSource: skip ? 'skipped' : clip ? transcript === recordedTranscript ? 'recording' : 'recording-corrected' : 'typed', delivery }];
            setAnswers(next);
            setClip(null);
            setTranscript('');
            setRecordedTranscript(''); setEvidence(null);
            setSeconds(0);
            framesRef.current = [];
            if (index + 1 === questions.length) {
                setStage('review');
                releaseDevices();
            }
            else {
                setIndex(index + 1);
            }
            window.scrollTo(0, 0);
        }
        catch (e) {
            fail(e);
        }
        finally {
            setBusy('');
        }
    }
    async function correctTranscript(answerIndex:number,value:string) {
        const take=answers[answerIndex];if(!take)return;
        const local=localTurn(take.question,value,take.duration,take.hasRecording) as Analysis;
        local.scores.confidence=take.delivery?.score??null;if(take.delivery)local.metrics.wpm=take.delivery.metrics.wpm;
        local.summary='Corrected transcript; local feedback recalculated. '+local.summary;
        if(take.cloudEligible)local.aiStatus='pending';
        setAnswers(old=>old.map((t,i)=>i===answerIndex?{...t,transcript:value,transcriptSource:'recording-corrected',analysis:local}:t));
        if(!take.cloudEligible)return;
        try{
            const analysis=await api<Analysis>('/api/regrade',{question:take.question,answer:value,duration:take.duration,recorded:take.hasRecording,appeal:'The user corrected recognition errors. Grade this corrected transcript independently.',cloudConsent:true,providerConsent:provider,privacyMode:'fictional',demoDataOnly:fictionalOnly,nonSensitiveConsent:true});
            if(mountedRef.current)setAnswers(old=>old.map((t,i)=>i===answerIndex&&t.transcript===value?{...t,analysis:{...analysis,scores:{...analysis.scores,confidence:t.delivery?.score??null},metrics:{...analysis.metrics,wpm:t.delivery?.metrics.wpm??analysis.metrics.wpm}}}:t));
        }catch(e){if(mountedRef.current)setAnswers(old=>old.map((t,i)=>i===answerIndex&&t.transcript===value?{...t,analysis:{...t.analysis,aiStatus:'failed',aiError:e instanceof Error?e.message:'AI regrading failed. Retry from the review panel.'}}:t));}
    }
    function reset() { clearSessionUsage();setPlan(null);setClipFeedback({});setAiReport(null);setPracticeDrills(null);releaseDevices(); coachRef.current?.dispose(); coachRef.current = null; setSpeechStatus(''); setRecordedTranscript(''); setEvidence(null); urlsRef.current.forEach(u => URL.revokeObjectURL(u)); urlsRef.current = []; framesRef.current = []; setAnswers([]); setQuestions([]); setIndex(0); setClip(null); setTranscript(''); setStage('setup'); setCloudConsent(false); setVisualConsent(false); setMediaConsent(false); setTextOnly(false); setError(''); setSeconds(0); }
    function exportReport() { const withoutUrls = (items: Moment[]) => items.map(({ url, ...rest }) => rest); const data = { product: 'Cadence', role: displayRole, createdAt: new Date().toISOString(), mode, usage:sessionUsage(), clipFeedback, aiReport, practiceDrills, report, moments: { best: withoutUrls(moments.best), worst: withoutUrls(moments.worst) }, answers: answers.map(({ url, audioEvidence, visionEvidence, ...rest }) => rest) }; const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); download(url, 'cadence-interview-report.json'); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    function readQuestion() { if (!('speechSynthesis' in window))
        return; window.speechSynthesis.cancel(); const speech = new SpeechSynthesisUtterance(q.prompt); speech.rate = .95; window.speechSynthesis.speak(speech); }
    return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={e => e.preventDefault()} aria-label="Cadence interview studio"><span className="brand-symbol"><AudioLines size={23}/></span>cadence<span className="brand-dot">.</span></a>
      <div className="workspace-label">YOUR PRACTICE SPACE</div>
      <nav aria-label="Workspace"><button className={stage === 'setup' ? 'nav-item active' : 'nav-item'} onClick={reset} disabled={stage === 'studio' || !!busy}><Plus size={17}/>New practice<span className="nav-key">N</span></button><button className={stage === 'studio' ? 'nav-item active' : 'nav-item'} disabled={stage !== 'studio'}><Video size={17}/>Interview studio</button><button className={stage === 'review' ? 'nav-item active' : 'nav-item'} disabled={stage !== 'review'}><Layers3 size={17}/>Session report</button></nav>
      <div className="sidebar-note"><div className="note-orbit"><Sparkles size={21}/></div><h3>A little practice.<br />A different outcome.</h3><p>Make room for the version of you that shows up prepared.</p><button onClick={() => helpRef.current?.showModal()}>See how it works <ArrowUpRight size={14}/></button></div>
      <div className="sidebar-bottom"><button onClick={() => helpRef.current?.showModal()}><CircleHelp size={16}/>How it works</button><div className="local-note"><span className="avatar">YOU</span><div>Your private studio<small>Made for your next chapter</small></div></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><span>Workspace <span className="slash">/</span> <strong>{stage === 'setup' ? 'New practice' : stage === 'studio' ? 'Interview studio' : 'Session report'}</strong></span><span className="status-pill"><i className={mode === 'live' && stage !== 'setup' ? 'live-dot' : ''}/>{cloudAvailable === null ? 'Connecting' : !online ? 'Offline' : stage==='review'&&!reportLocal ? 'AI feedback' : stage==='studio'&&conversational ? 'Conversation studio' : stage !== 'setup' && mode === 'live' ? personalFree ? 'AI skill questions' : 'AI connected' : 'Practice mode'}</span></header>
      <main>
        {error && <div className="error-banner" role="alert"><span>{error}</span>{stage === 'setup' && questionError && <button className="recovery-action" onClick={() => void prepare(true)}>Use curated questions</button>}<button aria-label="Dismiss error" onClick={() => setError('')}><X size={16}/></button></div>}
        {stage === 'setup' && <>
          <section className="intro"><div className="eyebrow"><span />YOUR NEXT OPPORTUNITY STARTS HERE</div><h1>Good interviews<br />start with <em>practice.</em></h1><p>A space to find your words, sharpen your stories,<br className="desktop-break"/> and show up as yourself. Let’s get you ready.</p></section>
          <div className="setup-grid">
            <section className="setup-card"><div className="section-heading"><div className="step-badge">01</div><div><h2>Make it your interview</h2><p>A little context makes the questions a lot better.</p></div></div>
              <div className="source-tabs" role="group" aria-label="Interview context"><button className={tab === 'prompt' ? 'selected' : ''} onClick={() => changeSource('prompt')}><Sparkles size={15}/>Describe your interview</button><button className={tab === 'resume' ? 'selected' : ''} onClick={() => changeSource('resume')}><FileText size={15}/>Use your resume</button></div>
              {fictionalOnly && <div className="resume-privacy"><label className="field-label">The information I’m using</label><div className="focus-options" role="group" aria-label="Session data"><button aria-pressed={privacyMode === 'personal'} className={privacyMode === 'personal' ? 'selected' : ''} onClick={() => { setPrivacyMode('personal'); setCloudConsent(false); }}>My real experience</button><button aria-pressed={privacyMode === 'fictional'} className={privacyMode === 'fictional' ? 'selected' : ''} onClick={() => { setPrivacyMode('fictional'); setCloudConsent(false); }}>A fictional sample</button></div><p>{personalFree ? 'Personal resumes are welcome. We read PDF and TXT files in your browser. Your resume and interview answers stay here.' : 'Use made-up details only. With AI enabled, the extracted text and your answer transcripts go to Google for feedback.'}</p></div>}
              <label className="field-label" htmlFor="role">What role are you preparing for?</label><input id="role" maxLength={160} value={role} onChange={e => { setRole(e.target.value); setCloudConsent(false); }} placeholder="e.g. Software Engineering Intern"/>
              {tab === 'resume' && <><input ref={fileRef} type="file" disabled={!!busy} accept=".pdf,.txt" className="sr-only" aria-label="Upload resume" onChange={e => e.target.files?.[0] && void upload(e.target.files[0])}/><button className="upload-zone" disabled={!!busy} onClick={() => fileRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0])
            void upload(e.dataTransfer.files[0]); }}><span className="upload-icon">{filename ? <Check size={21}/> : <Upload size={21}/>}</span><strong>{filename || 'Drop your resume here, or browse'}</strong><small>{filename ? `Read successfully · ${resumeText.length.toLocaleString()} ${resumeText.length === 1 ? 'character' : 'characters'}` : 'PDF or TXT · up to 2 MB · read in your browser'}</small></button>{filename && <><button className="text-link remove-file" onClick={() => { setFilename(''); setResumeText(''); setCloudConsent(false); }}>Remove file</button><details className="resume-preview"><summary>Review extracted resume text</summary><p>Check the text below and correct anything the PDF reader missed.</p><textarea aria-label="Extracted resume text" rows={8} maxLength={18000} value={resumeText} onChange={e => { setResumeText(e.target.value); setCloudConsent(false); }}/></details></>}</>}
              <label className="field-label" htmlFor="context">{tab === 'resume' ? 'Add a job description or paste resume text' : 'What would you like to practice?'} <span>optional</span></label><textarea id="context" rows={4} maxLength={18000} value={context} onChange={e => { setContext(e.target.value); setCloudConsent(false); }} placeholder={tab === 'resume' ? 'Paste your resume, a job description, or a skill you want to focus on…' : 'Tell us about the role, a project you built, or the questions you want to get better at…'}/>
              <div className="field-row"><div><label className="field-label" htmlFor="level">Experience level</label><select id="level" value={level} onChange={e => setLevel(e.target.value)}><option>Internship</option><option>Entry level</option><option>Experienced</option></select></div><div><label className="field-label" htmlFor="count">Session length</label><select id="count" value={count} onChange={e => setCount(Number(e.target.value))}>{[3, 4, 5, 6].map(n => <option key={n} value={n}>{n} questions · ~{n * 2} min</option>)}</select></div></div>
              <label className="field-label" htmlFor="interview-style">Interview format</label><select id="interview-style" value={conversational?'conversation':'individual'} onChange={e=>setConversational(e.target.value==='conversation')}><option value="conversation">Back-and-forth conversation · continuous recording</option><option value="individual">Individual answer practice</option></select><label className="field-label">Interview focus</label><div className="focus-options" role="group" aria-label="Interview focus">{['Mixed', 'Behavioral', 'Technical'].map(t => <button key={t} aria-pressed={type === t} className={type === t ? 'selected' : ''} onClick={() => setType(t)}>{type === t && <Check size={14}/>} {t === 'Mixed' ? 'A bit of both' : t}</button>)}</div>
              <label className="check-row cloud-check"><input type="checkbox" checked={cloudConsent} disabled={!cloudAvailable} onChange={e => setCloudConsent(e.target.checked)}/><span>{cloudAvailable ? personalFree ? `Use ${providerLabel} for skill-based questions` : `Use ${providerLabel} questions and feedback` : 'AI connection not configured'}<small>{cloudAvailable ? personalFree ? 'I agree to send only the broad role and selected generic skill tags below to Google. No resume text, contact details, employers, or interview answers are sent. Answer feedback uses a browser practice rubric.' : fictionalOnly ? 'I confirm this is fictional sample data and agree to send its text and answer transcripts to Google. Free-tier data may improve Google products and be reviewed by people. Do not include personal, sensitive, or confidential information.' : `I agree to send my resume/context and answer transcripts to ${providerLabel} for processing. Recorded audio stays on this device.` : 'Curated questions and a transparent browser practice rubric are available now.'}</small></span></label>
              {cloudConsent && personalFree && <div className="skill-profile"><strong>What Google receives</strong><p>Broad role: {profile.roleFamily}. Interview focus, level, and question count. Only the selected tags below; click a tag to exclude it.</p><div className="skill-tags" role="group" aria-label="Generic skills shared with AI">{detectedProfile.skills.map((skill:string) => <button key={skill} aria-pressed={!excludedSkills.includes(skill)} onClick={() => setExcludedSkills(old => old.includes(skill) ? old.filter(s => s !== skill) : [...old, skill])}>{!excludedSkills.includes(skill) && <Check size={11}/>} {skill}</button>)}</div>{!profile.skills.length && <small>No skill tags selected. We’ll ask general questions for this broad role.</small>}<p>Personal answer feedback stays in your browser. Full AI analysis of real resumes and answers requires a paid provider configuration. <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">Google’s data terms</a></p></div>}
              <button className="primary full" disabled={!!busy || !online} onClick={() => void prepare()}>{busy ? <><LoaderCircle className="spin" size={17}/>{busy}</> : <>Build my interview<ArrowRight size={18}/></>}</button><p className="form-footnote"><LockKeyhole size={12}/>PDFs are read in your browser. Recording is always optional.</p>
            </section>
            <aside className="preview-panel"><div className="preview-top"><span className="tiny-label">THE SPACE BETWEEN “WHAT IF” & “I’M READY”</span><span className="sparkle-mark">✳</span></div><div className="orbit-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit orbit-three"/><div className="orbit-center"><AudioLines size={47} strokeWidth={1.3}/></div><span className="orbit-star">✦</span><span className="orbit-dot"/><span className="art-label art-label-one">your experience</span><span className="art-label art-label-two">your own voice</span></div><div className="preview-copy"><span className="eyebrow">A REHEARSAL, BUILT AROUND YOU</span><h2>Your experience.<br />Your next chapter.</h2><p>Relevant questions. Room to think.<br />Feedback you can actually put to work.</p></div><div className="session-blueprint"><span>YOUR SESSION AT A GLANCE</span><div><strong>{count}</strong><p>main topics + introduction<small>{type === 'Mixed' ? 'Behavioral + technical' : type + ' focus'}</small></p><span className="blueprint-line"/><strong>~{count * 2}</strong><p>minutes<small>At your own pace</small></p></div></div><div className="preview-bottom"><ShieldCheck size={16}/>Practice is personal. Your recording stays with you.</div></aside>
          </div>
          <div className="feature-strip">{[{ n: '01', icon: FileText, title: 'Bring your experience', text: 'A resume, a role, or an idea of what’s next.' }, { n: '02', icon: Video, title: 'Find your rhythm', text: 'Practice aloud, on camera, or in writing.' }, { n: '03', icon: Film, title: 'See what’s working', text: 'Useful feedback. Moments worth revisiting.' }].map(f => <div key={f.n}><span>{f.n}</span><f.icon size={19}/><div><h3>{f.title}</h3><p>{f.text}</p></div></div>)}</div>
        </>}
        {stage === 'studio' && conversational && <ConversationStudio questions={questions} plan={plan??undefined} questionLimit={count} type={type} level={level} profile={profile} role={displayRole} roleFamily={profile.roleFamily} provider={provider} providerLabel={providerLabel} cloudAvailable={cloudAvailable===true} unpaid={fictionalOnly} onLegacy={()=>{setConversational(false);setStage('setup');}} onComplete={(takes,warning)=>{setAnswers(takes);if(warning)setError(warning);urlsRef.current.push(...new Set(takes.flatMap(t=>t.url?[t.url]:[])));setStage('review');window.scrollTo(0,0);}}/>}
        {stage === 'studio' && !conversational && q && <>
          <div className="studio-heading"><div><div className="eyebrow">YOUR PRACTICE, YOUR PACE</div><h1>Find your <em>rhythm.</em></h1><p>{displayRole} · {level}</p></div><div className="question-progress"><strong>{String(index + 1).padStart(2, '0')}</strong><span>/ {String(questions.length).padStart(2, '0')} questions</span><div className="progress-track"><i style={{ width: `${index / questions.length * 100}%` }}/></div></div></div>
          <div className="studio-grid"><div><section className="question-card"><div className="question-meta"><span>{q.category}</span><span>{q.source === 'generated' ? 'AI generated' : 'Curated question'}</span></div><h2>{q.prompt}</h2>{q.answerFormat&&<p>For an independent calculation check, include <strong>{q.answerFormat}</strong>.</p>}<div className="question-bottom"><span>Take a breath. You’ve got room to think.</span><button className="text-link" onClick={readQuestion} disabled={recording}><AudioLines size={15}/>Read question</button></div></section>
            <section className="camera-card">{media && !clip ? <video ref={videoRef} className="live-video" autoPlay muted playsInline aria-label="Live camera preview"/> : clip ? <video src={clip.url} className="playback-video" controls playsInline aria-label="Review your answer recording"/> : <div className="camera-empty"><div className="camera-glyph">{textOnly ? <FileText size={29}/> : <Video size={29}/>}</div><h3>{textOnly ? 'Make space for your answer.' : 'Your practice studio is ready.'}</h3><p>{textOnly ? 'Write your response in the transcript box below.' : 'Turn on your camera and microphone when you’re ready.'}</p>{!textOnly && <><label className="check-row media-check"><input type="checkbox" checked={mediaConsent} onChange={e => setMediaConsent(e.target.checked)}/><span>I agree to record and analyze my camera and microphone on this device. Speech and vision models download on first use; English speech becomes a transcript automatically.</span></label><button className="primary" disabled={!mediaConsent || !!busy} onClick={() => void enableMedia()}><Video size={16}/>Enable camera & microphone</button><button className="text-link" disabled={!!busy} onClick={() => setTextOnly(true)}>Use text answers instead<ArrowRight size={14}/></button></>}</div>}
              <div className="camera-controls"><span className={recording ? 'recording-status' : 'camera-status'}><i />{recording ? 'Recording' : clip ? (media ? 'Answer captured · camera on' : 'Answer captured') : media ? 'Camera & mic on' : 'Camera & mic off'}</span><span className="record-time">{clock(clip?.duration ?? seconds)} <small>/ 03:00</small></span><div className="meter" aria-label="Microphone level">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ height: 5 + Math.min(1, meter) * (8 + (i % 4) * 6), opacity: media ? .45 + Math.min(1, meter) * .5 : .2 }}/>)}</div>{recording ? <button className="stop-button" onClick={() => void stopRecording()} disabled={!!busy}><Square size={13} fill="currentColor"/>Stop answer</button> : media && !clip ? <button className="record-button" onClick={() => void startRecording()} disabled={!!busy}><span />Record answer</button> : clip ? <button className="text-link" disabled={!!busy} onClick={retake}>Retake</button> : null}{media && <button className="device-off" aria-label="Turn off camera and microphone" disabled={recording || !!busy} onClick={releaseDevices}><Video size={14}/><X size={10}/></button>}</div>
            </section>
            <section className="transcript-card"><div><label className="field-label" htmlFor="transcript">{textOnly ? 'Your answer transcript' : 'Transcript from your recording'}</label><span>{wordCount(transcript)} {wordCount(transcript) === 1 ? 'word' : 'words'}</span></div>
              {speechStatus && <p role="status" aria-live="polite">{speechStatus}</p>}
              <p>{clip || recording || media ? 'Speak naturally. Your audio is transcribed on this device in short batches and finalized when you stop. Correct recognition errors if needed; there is no need to type your answer.' : 'Text practice is also available. Camera answers generate their own transcript.'} {personalFree || mode !== 'live' ? 'Content uses the local practice heuristic; accuracy requires reference evidence.' : fictionalOnly ? 'Only fictional spoken answers may be sent to Google for feedback.' : 'The transcript uses the cloud feedback consent you enabled.'}</p>
              <textarea id="transcript" rows={5} maxLength={20000} placeholder={textOnly ? 'Write your answer here…' : 'Your spoken words will appear here automatically…'} value={transcript} disabled={recording || !!busy} onChange={e => setTranscript(e.target.value)}/>
              {clip && <button className="text-link" disabled={!!busy} onClick={() => void transcribe(clip.audio)}>Retry transcription from recording</button>}
            </section>
            <div className="studio-actions"><button className="text-link" disabled={recording || !!busy || !!clip || !!transcript.trim()} onClick={() => void saveAnswer(true)}>Skip this question</button><button className="primary" disabled={recording || !!busy || !transcript.trim()} onClick={() => void saveAnswer()}>{busy ? <><LoaderCircle className="spin" size={17}/>{busy}</> : <>{index === questions.length - 1 ? 'Finish & see feedback' : 'Save & next question'}<ArrowRight size={17}/></>}</button></div>
          </div><aside className="coaching-sidebar"><div className="coaching-card"><span className="tiny-label">A SMALL REMINDER</span><h3>Let the story<br />do the talking.</h3><p>You don’t need a perfect answer. You need a clear one.</p><ol><li><span>S</span><div><strong>Set the scene</strong><small>What was happening?</small></div></li><li><span>A</span><div><strong>Make it yours</strong><small>What did you actually do?</small></div></li><li><span>R</span><div><strong>Show the change</strong><small>What happened? What did you learn?</small></div></li></ol></div><div className="privacy-card"><LockKeyhole size={19}/><h4>Your recording stays here.</h4><p>Clips stay in this browser until you download them or close the page. Speech recognition and landmark measurements run on your device. Model files download from Hugging Face and Google; recording data is not sent to those download hosts.</p>{mode === 'live' && (mediaCloudAvailable ? <><label className="check-row"><input type="checkbox" checked={visualConsent} disabled={recording || !!busy || !!clip} onChange={e => setVisualConsent(e.target.checked)}/><span>Include camera observations<small>Send up to 4 sampled frames to {providerLabel} for framing, posture, and face/mouth visibility feedback.</small></span></label><p>Audio stays on this device. Transcripts and optional sampled cloud frames use your consent. Cloud visual notes do not affect scores.</p></> : <p>{personalFree ? 'Your personal resume, answers, and recordings stay in this browser. Only the approved generic role and skill tags are used for AI questions. Answer feedback uses the browser practice rubric.' : 'Fictional sample text and answer transcripts use Gemini. No original PDFs, audio, or camera frames are sent.'}</p>)}</div>{textOnly && <button className="text-link" onClick={() => setTextOnly(false)}>Switch to camera practice<ArrowRight size={14}/></button>}</aside></div>
        </>}
        {stage === 'review' && <>
          <div className="studio-heading report-heading"><div><div className="eyebrow"><CheckCircle2 size={14}/>ONE PRACTICE CLOSER</div><h1>That’s how you <em>grow.</em></h1><p>{displayRole} · {answers.length} answers · {reportLocal ? 'Browser practice rubric' : 'AI coaching estimates'}</p></div><button className="secondary" onClick={exportReport}><Download size={16}/>Download report</button></div>
          <div className="report-overview"><div className="overall"><span className="tiny-label">YOUR SESSION</span><div>{scoreText(report.overall)}<small>/100</small></div><p>{report.overall === null ? 'Not enough answer evidence' : 'A starting point for your next practice'}</p></div><div className="score-grid">{[{ key: 'confidence', name: 'Confidence / delivery', sub: 'Observable delivery · approximate', icon: AudioLines }, { key: 'technical', name: 'Technical content', sub: 'Technical answers only', icon: FileText }, { key: 'behavioral', name: 'Behavioral responses', sub: 'Motivation, examples & reflection', icon: FileText }, { key: 'comprehension', name: 'Factual accuracy', sub: `${report.accuracyCoverage.checkedAnswers}/${report.accuracyCoverage.answers} technical answers checked · ${report.accuracyCoverage.claims} referenced claims`, icon: Sparkles }].map(item => <div className="score-item" key={item.key}><item.icon size={19}/><div><span>{item.name}</span><strong>{scoreText((item.key==='technical'?report.categoryScores.Technical:item.key==='behavioral'?report.categoryScores.Behavioral:report.scores[item.key]))}<small>{(item.key==='technical'?report.categoryScores.Technical:item.key==='behavioral'?report.categoryScores.Behavioral:report.scores[item.key]) === null ? 'unavailable' : '/100'}</small></strong><p>{item.sub}</p></div></div>)}</div></div>
          {report.accuracyCoverage.localOnly>0&&<p className="score-disclaimer">{report.accuracyCoverage.localOnly} technical answer{report.accuracyCoverage.localOnly===1?' has':'s have'} an answer key but only local feedback. Semantic factual grading requires consented AI; this session’s cloud data restrictions still apply.</p>}{report.accuracyCoverage.pending>0&&<p role="status">{report.accuracyCoverage.pending} technical assessment{report.accuracyCoverage.pending===1?' needs':'s need'} another review. Retry failed or provisional answers in the grade review panel.</p>}<p className="score-disclaimer">{reportLocal ? 'Content practice scores use text heuristics; reference checks have limited coverage.' : 'AI feedback is provisional and may be wrong.'} Behavioral answers never contribute to technical content or accuracy. Per-answer scores show content only; session overall also includes available delivery and technical accuracy. Knowledge scores cover checked claims only; unverified stories are not evidence of correctness. Confidence is a labeled delivery estimate from pace, pauses, possible repetitions, and available head-position and framing measurements. Body movement is described without a penalty. It does not measure feelings or eye contact. Missing cues are excluded.</p>
          <PremiumReview answers={answers} setAnswers={setAnswers} moments={selectedMoments} provider={provider} unpaid={fictionalOnly} onClips={setClipFeedback} onReport={setAiReport} onCoach={setPracticeDrills} />
          <div className="section-title-row"><div><span className="eyebrow">THE REPLAY ROOM</span><h2>Moments to come back to.</h2></div><span>{Object.keys(clipFeedback).length?'AI reviewed excerpts · approximate timing':'Variable-length excerpts · local heuristic selection'}</span></div>
          <div className="moments-grid">{(['best', 'worst'] as const).map(kind => <section className={`moment-card ${kind}`} key={kind}><div className="moment-label"><span>{kind === 'best' ? <Sparkles size={15}/> : <ArrowUpRight size={16}/>} {kind === 'best' ? 'STRONG MOMENTS' : 'MOMENTS TO IMPROVE'}</span></div>{moments[kind].length ? moments[kind].map(moment => <MomentClip key={moment.id} moment={moment} kind={kind} feedback={clipFeedback[moment.id]}/>) : <div className="moment-empty"><Film size={28}/><h3>{kind === 'best' ? 'Your next replay starts here.' : 'More speech gives us a comparison.'}</h3><p>Record at least two distinct speech sections, within one answer or across answers, to show both categories. Unavailable evidence is never duplicated into a second clip.</p></div>}</section>)}</div>
          <div className="section-title-row"><h2>Go a little deeper.</h2><span>Your answers, with something to work on.</span></div>
          <div className="answer-list">{answers.map((take, i) => <details key={take.question.id}><summary><span className="answer-number">{String(i + 1).padStart(2, '0')}</span><span>{take.question.prompt}</span><strong>{scoreText(take.analysis.scores.content)}<small>/100 content</small></strong><ChevronDown size={17}/></summary><div className="answer-detail"><p className="tiny-label">{questionKind(take.question).category} answer{questionKind(take.question).category==='Behavioral'?' · excluded from technical scores':''}</p><p className="feedback-summary"><FeedbackText>{take.analysis.summary}</FeedbackText></p>{take.analysis.grading&&<GradingBreakdown grading={take.analysis.grading}/>}<div className="feedback-columns"><div><h4>What worked</h4>{take.analysis.strengths.length?<ul>{take.analysis.strengths.map((s, j) => <li key={j}><FeedbackText>{s}</FeedbackText></li>)}</ul>:<p>No specific strength was supported by this answer.</p>}</div><div><h4>What held this answer back</h4><ul>{take.analysis.improvements.map((s, j) => <li key={j}><FeedbackText>{s}</FeedbackText></li>)}</ul></div></div>{take.analysis.visual.length > 0 && <div><h4>Camera observations</h4><ul>{take.analysis.visual.map((s, j) => <li key={j}><FeedbackText>{s}</FeedbackText></li>)}</ul></div>}<div className="transcript-quote"><h4>{take.transcriptSource.startsWith('recording') ? 'Transcript from recording audio' : 'Your transcript'}</h4><p>{take.transcript || 'Question skipped. No transcript submitted.'}</p></div>{take.hasRecording && <TranscriptCorrection take={take} onSave={value=>correctTranscript(i,value)}/>}{take.analysis.knowledge && <div className="knowledge-review"><h4>Knowledge / accuracy checks</h4>{questionKind(take.question).category==='Technical'&&<p><strong>Factual accuracy: {take.analysis.scores.comprehension===null?'not scored':`${take.analysis.scores.comprehension}/100`}</strong>{take.analysis.knowledge.accuracyStatus==='pending'?' · review incomplete':take.analysis.knowledge.accuracyStatus==='needs_ai'?' · local review only':''}</p>}{take.question.reviewStatus&&<p>Answer key review: {take.question.reviewStatus}. AI-reviewed items have not been certified by a human expert.</p>}<p>{take.analysis.knowledge.coverage}</p>{take.analysis.knowledge.checks.map((check,j)=><div key={j}><strong>{check.status.toUpperCase()}</strong><blockquote>{check.quote}</blockquote><p><FeedbackText>{check.explanation}</FeedbackText></p>{check.referenceExcerpt&&<details><summary>Reference evidence</summary><blockquote>{check.referenceExcerpt}</blockquote></details>}{take.analysis.knowledge?.references.filter(r=>r.id===check.referenceId).map(r=>r.url?<a key={r.id} href={r.url} target="_blank" rel="noreferrer">{r.title}</a>:<span key={r.id}>{r.title}{r.furtherReading?.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer"> · Further reading: {s.title}</a>)}</span>)}</div>)}</div>}{take.analysis.evidence.length > 0 && <p className="evidence-note">Evidence: “{take.analysis.evidence[0]}”</p>}{take.delivery && <div className="delivery-evidence"><h4>Confidence / delivery breakdown</h4><ul>{take.delivery.components.map(component => <li key={component.name}><strong>{component.name}: {component.score}/100 ({component.weight}% weight)</strong> — {component.evidence}</li>)}</ul>{take.delivery.notes.map(note => <p key={note}>{note}</p>)}</div>}<div className="answer-metrics"><span>{take.analysis.metrics.words} {take.analysis.metrics.words === 1 ? 'word' : 'words'}</span><span>{take.analysis.metrics.fillers} filler phrases</span><span>{take.analysis.metrics.wpm === null ? 'Pace unavailable' : `${take.analysis.metrics.wpm} words/min incl. pauses`}</span><span>{take.analysis.mode === 'live' ? 'AI feedback' : 'Practice rubric'}</span></div>{take.url && (!take.sessionRecording || i===0) && <button className="text-link" onClick={() => download(take.url!, `cadence-answer-${i + 1}.${take.mime.includes('mp4') ? 'mp4' : 'webm'}`)}><Download size={14}/>{take.sessionRecording?'Download full interview recording':'Download answer recording'}</button>}</div></details>)}</div>
          <div className="review-footer"><div><LockKeyhole size={18}/><p>Keep the moments that matter.<small>Download your clips before closing this page. Starting fresh clears this session.</small></p></div><button className="primary" onClick={reset}>Start a fresh practice<ArrowRight size={17}/></button></div>
        </>}
        <footer className="page-footer"><span>Built for the person you’re becoming.</span><span>cadence<span className="brand-dot">.</span></span></footer>
      </main>
    </div>
    <dialog ref={helpRef} className="help-dialog" aria-labelledby="how-it-works-title"><button className="dialog-close" aria-label="Close explanation" onClick={() => helpRef.current?.close()}><X size={20}/></button><span className="eyebrow">A LITTLE PRACTICE GOES A LONG WAY</span><h2 id="how-it-works-title">Your interview, rehearsed.</h2><ol><li><strong>Bring context.</strong> Upload a PDF or TXT resume. PDFs are read in this browser; review the extracted text before building your interview.</li><li><strong>Practice your way.</strong> Give text answers or opt into camera/microphone recording. Conversation mode keeps one continuous recording with follow-ups between turns.</li><li><strong>Review your words.</strong> Recorded audio is transcribed on your device in short batches. Stop recording to finalize it, then optionally correct recognition errors. English speech is supported initially.</li><li><strong>Find your next step.</strong> Review content quality, factual accuracy, and delivery feedback, then replay the strongest and weakest recorded answers.</li></ol><p>Confidence is a delivery estimate from pace, pauses, possible word repetitions, camera-facing head position, and upper-body framing when available. Head direction does not prove eye contact. No feelings, identity, or speech disorder is inferred. Missing evidence stays unavailable.</p><p>Videos stay in browser memory. {fictionalOnly ? 'Personal mode keeps your resume and answers in this browser and can send selected generic skill tags for AI questions. Fictional sample mode sends extracted text and answer transcripts to Google. Free-tier cloud data may improve Google products and be reviewed by people.' : `With cloud consent, resume/context, transcript, and optional sampled frames are sent to ${providerLabel}; its data policies apply.`} Download clips before closing this page.</p><button className="primary" onClick={() => helpRef.current?.close()}>Let’s practice<ArrowRight size={17}/></button></dialog>
  </div>;
}
