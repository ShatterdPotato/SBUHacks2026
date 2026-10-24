'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowRight, AudioLines, Check, CheckCircle2, ChevronDown, CircleHelp, Download, FileText, Film, Layers3, LoaderCircle, LockKeyhole, Plus, ShieldCheck, Sparkles, Square, Upload, Video, X } from 'lucide-react';
import { reportFor, overallScore, retrieveQuestions, setupInput, rubricAnalysis } from '../lib/interview.mjs';
import { genericProfile, personalQuestionRequest } from '../lib/resume-profile.mjs';
type Question = {
    id: string;
    prompt: string;
    category: string;
    focus: string[];
    source: string;
};
type Analysis = {
    mode: string;
    scores: {
        confidence: number | null;
        content: number | null;
        comprehension: number | null;
    };
    metrics: {
        words: number;
        fillers: number;
        wpm: number | null;
    };
    summary: string;
    strengths: string[];
    improvements: string[];
    evidence: string[];
    visual: string[];
    limitation: string;
};
type Take = {
    question: Question;
    transcript: string;
    analysis: Analysis;
    duration: number;
    hasRecording: boolean;
    url: string | null;
    mime: string;
};
type Pending = {
    video: Promise<Blob>;
    audio: Promise<Blob>;
};
const clock = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
const scoreText = (score: number | null | undefined) => score == null ? '—' : String(score);
async function api<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json() as T & {
        error?: string;
    };
    if (!response.ok)
        throw new Error(data.error || 'Please try again.');
    return data;
}
function download(url: string, filename: string) { const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); }
export default function Home() {
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
    const [questions, setQuestions] = useState<Question[]>([]);
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<Take[]>([]);
    const [transcript, setTranscript] = useState('');
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
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
    const q = questions[index];
    const report = reportFor(answers);
    const personalFree = fictionalOnly && privacyMode === 'personal';
    const localReview = mode !== 'live' || personalFree;
    const detectedProfile = genericProfile([role, context, resumeText].join('\n'));
    const profile = { ...detectedProfile, skills: detectedProfile.skills.filter(skill => !excludedSkills.includes(skill)) };
    useEffect(() => { fetch('/api/health').then(async (r) => { if (!r.ok)
        throw new Error(); return await r.json() as {
        cloudAvailable: boolean; provider: string; providerLabel: string;
        demoDataOnly: boolean; mediaCloudAvailable: boolean; pdfCloudAvailable: boolean;
    }; }).then(d => { setCloudAvailable(d.cloudAvailable === true); setProvider(d.provider); setProviderLabel(d.providerLabel); setFictionalOnly(d.demoDataOnly === true); setMediaCloudAvailable(d.mediaCloudAvailable === true); }).catch(() => { setOnline(false); setError('The interview service is unavailable. Refresh once the server is running.'); }); }, []);
    function releaseDevices() {
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
    useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; recorderRef.current?.state === 'recording' && recorderRef.current.stop(); audioRecorderRef.current?.state === 'recording' && audioRecorderRef.current.stop(); streamRef.current?.getTracks().forEach(t => t.stop()); if (meterTimerRef.current)
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
    async function upload(file: File) {
        setError('');
        setBusy('Reading resume');
        try {
            if (file.size > 2 * 1024 * 1024)
                throw new Error('Please use a resume under 2 MB.');
            let value: string;
            if (/\.txt$/i.test(file.name)) value = await file.text();
            else if (/\.pdf$/i.test(file.name)) {
                const { readPdfResume } = await import('../lib/pdf-resume');
                value = await readPdfResume(file);
            } else
                throw new Error('Upload a .pdf or .txt resume. You can also paste the text.');
            if (!value.trim()) throw new Error('This file is empty. Upload a resume with readable text.');
            if (value.length > 18000) throw new Error('Keep resume text under 18,000 characters.');
            setResumeText(value.trim());
            setFilename(file.name);
            setExcludedSkills([]);
            setCloudConsent(false);
        }
        catch (e) {
            fail(e);
        }
        finally {
            setBusy('');
            if (fileRef.current)
                fileRef.current.value = '';
        }
    }
    async function prepare() {
        setError('');
        setBusy('Preparing your interview');
        try {
            const combined = [context, resumeText].filter(Boolean).join('\n\n');
            let data: { questions: Question[]; mode: string };
            if (!cloudConsent) {
                data = { mode: 'demo', questions: retrieveQuestions(setupInput({ role: role || detectedProfile.roleFamily, context: combined.slice(0, 20000), type, level, count })) };
            } else if (personalFree) {
                data = await api('/api/questions', personalQuestionRequest({ profile, count, type, level, provider, cloudConsent }));
            } else {
                data = await api('/api/questions', { role: role || 'General interview', context: combined, type, level, count, cloudConsent, providerConsent: provider, privacyMode, demoDataOnly: privacyMode === 'fictional' });
            }
            setQuestions(data.questions);
            setMode(data.mode);
            setStage('studio');
            setIndex(0);
            window.scrollTo(0, 0);
        }
        catch (e) {
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
    function startRecording() {
        if ('speechSynthesis' in window)
            window.speechSynthesis.cancel();
        if (!streamRef.current || !streamRef.current.getAudioTracks().some(t => t.readyState === 'live')) {
            setError('Reconnect your camera and microphone before recording.');
            return;
        }
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
            startedRef.current = Date.now();
            setSeconds(0);
            setError('');
            recorder.start(1000);
            audio.start(1000);
            setRecording(true);
        }
        catch (e) {
            fail(e);
        }
    }
    async function transcribe(audio: Blob) {
        if (!mediaCloudAvailable || !cloudConsent) return;
        setBusy('Transcribing your answer');
        try {
            const form = new FormData();
            form.set('file', audio, `answer.${audio.type.includes('mp4') ? 'mp4' : 'webm'}`);
            form.set('cloudConsent', 'true');
            form.set('providerConsent', provider);
            const response = await fetch('/api/transcribe', { method: 'POST', body: form });
            const data = await response.json() as {
                error?: string;
                text: string;
            };
            if (!response.ok)
                throw new Error(data.error);
            setTranscript(data.text);
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
            if (mode === 'live' && cloudConsent && mediaCloudAvailable)
                await transcribe(audio);
        }
        catch (e) {
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
    } setClip(null); setTranscript(''); setSeconds(0); framesRef.current = []; setError(''); }
    async function saveAnswer(skip = false) {
        if (recording)
            return;
        setBusy('Reviewing your answer');
        setError('');
        try {
            const answer = skip ? '' : transcript;
            const analysis: Analysis = localReview
                ? rubricAnalysis({ question: q, answer, duration: clip?.duration ?? 0, recorded: !!clip })
                : await api<Analysis>('/api/analyze', { question: q, answer, duration: clip?.duration ?? 0, recorded: !!clip, mode, cloudConsent, providerConsent: provider, privacyMode, demoDataOnly: privacyMode === 'fictional', frames: visualConsent && mediaCloudAvailable ? framesRef.current : [] });
            const next = [...answers, { question: q, transcript: skip ? '' : transcript, analysis, duration: clip?.duration ?? 0, hasRecording: !!clip, url: clip?.url ?? null, mime: clip?.blob.type ?? '' }];
            setAnswers(next);
            setClip(null);
            setTranscript('');
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
    function reset() { releaseDevices(); urlsRef.current.forEach(u => URL.revokeObjectURL(u)); urlsRef.current = []; framesRef.current = []; setAnswers([]); setQuestions([]); setIndex(0); setClip(null); setTranscript(''); setStage('setup'); setCloudConsent(false); setVisualConsent(false); setMediaConsent(false); setTextOnly(false); setError(''); setSeconds(0); }
    function exportReport() { const data = { product: 'Cadence', role: role || 'General interview', createdAt: new Date().toISOString(), mode, report, answers: answers.map(({ url, ...rest }) => rest) }; const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); download(url, 'cadence-interview-report.json'); setTimeout(() => URL.revokeObjectURL(url), 1000); }
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
      <header className="topbar"><span>Workspace <span className="slash">/</span> <strong>{stage === 'setup' ? 'New practice' : stage === 'studio' ? 'Interview studio' : 'Session report'}</strong></span><span className="status-pill"><i className={mode === 'live' && stage !== 'setup' ? 'live-dot' : ''}/>{cloudAvailable === null ? 'Connecting' : !online ? 'Offline' : stage !== 'setup' && mode === 'live' ? personalFree ? 'AI skill questions' : 'AI connected' : 'Practice mode'}</span></header>
      <main>
        {error && <div className="error-banner" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><X size={16}/></button></div>}
        {stage === 'setup' && <>
          <section className="intro"><div className="eyebrow"><span />YOUR NEXT OPPORTUNITY STARTS HERE</div><h1>Good interviews<br />start with <em>practice.</em></h1><p>A space to find your words, sharpen your stories,<br className="desktop-break"/> and show up as yourself. Let’s get you ready.</p></section>
          <div className="setup-grid">
            <section className="setup-card"><div className="section-heading"><div className="step-badge">01</div><div><h2>Make it your interview</h2><p>A little context makes the questions a lot better.</p></div></div>
              <div className="source-tabs" role="group" aria-label="Interview context"><button className={tab === 'prompt' ? 'selected' : ''} onClick={() => setTab('prompt')}><Sparkles size={15}/>Describe your interview</button><button className={tab === 'resume' ? 'selected' : ''} onClick={() => setTab('resume')}><FileText size={15}/>Use your resume</button></div>
              {fictionalOnly && <div className="resume-privacy"><label className="field-label">The information I’m using</label><div className="focus-options" role="group" aria-label="Session data"><button aria-pressed={privacyMode === 'personal'} className={privacyMode === 'personal' ? 'selected' : ''} onClick={() => { setPrivacyMode('personal'); setCloudConsent(false); }}>My real experience</button><button aria-pressed={privacyMode === 'fictional'} className={privacyMode === 'fictional' ? 'selected' : ''} onClick={() => { setPrivacyMode('fictional'); setCloudConsent(false); }}>A fictional sample</button></div><p>{personalFree ? 'Personal resumes are welcome. We read PDF and TXT files in your browser. Your resume and interview answers stay here.' : 'Use made-up details only. With AI enabled, the extracted text and your typed answers go to Google for feedback.'}</p></div>}
              <label className="field-label" htmlFor="role">What role are you preparing for?</label><input id="role" maxLength={160} value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Software Engineering Intern"/>
              {tab === 'resume' && <><input ref={fileRef} type="file" accept=".pdf,.txt" className="sr-only" aria-label="Upload resume" onChange={e => e.target.files?.[0] && void upload(e.target.files[0])}/><button className="upload-zone" disabled={!!busy} onClick={() => fileRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0])
            void upload(e.dataTransfer.files[0]); }}><span className="upload-icon">{filename ? <Check size={21}/> : <Upload size={21}/>}</span><strong>{filename || 'Drop your resume here, or browse'}</strong><small>{filename ? `Read successfully · ${resumeText.length.toLocaleString()} characters` : 'PDF or TXT · up to 2 MB · read in your browser'}</small></button>{filename && <><button className="text-link remove-file" onClick={() => { setFilename(''); setResumeText(''); setCloudConsent(false); }}>Remove file</button><details className="resume-preview"><summary>Review extracted resume text</summary><p>Check the text below and correct anything the PDF reader missed.</p><textarea aria-label="Extracted resume text" rows={8} maxLength={18000} value={resumeText} onChange={e => { setResumeText(e.target.value); setCloudConsent(false); }}/></details></>}</>}
              <label className="field-label" htmlFor="context">{tab === 'resume' ? 'Add a job description or paste resume text' : 'What would you like to practice?'} <span>optional</span></label><textarea id="context" rows={4} maxLength={18000} value={context} onChange={e => setContext(e.target.value)} placeholder={tab === 'resume' ? 'Paste your resume, a job description, or a skill you want to focus on…' : 'Tell us about the role, a project you built, or the questions you want to get better at…'}/>
              <div className="field-row"><div><label className="field-label" htmlFor="level">Experience level</label><select id="level" value={level} onChange={e => setLevel(e.target.value)}><option>Internship</option><option>Entry level</option><option>Experienced</option></select></div><div><label className="field-label" htmlFor="count">Session length</label><select id="count" value={count} onChange={e => setCount(Number(e.target.value))}>{[3, 4, 5, 6].map(n => <option key={n} value={n}>{n} questions · ~{n * 2} min</option>)}</select></div></div>
              <label className="field-label">Interview focus</label><div className="focus-options" role="group" aria-label="Interview focus">{['Mixed', 'Behavioral', 'Technical'].map(t => <button key={t} aria-pressed={type === t} className={type === t ? 'selected' : ''} onClick={() => setType(t)}>{type === t && <Check size={14}/>} {t === 'Mixed' ? 'A bit of both' : t}</button>)}</div>
              <label className="check-row cloud-check"><input type="checkbox" checked={cloudConsent} disabled={!cloudAvailable} onChange={e => setCloudConsent(e.target.checked)}/><span>{cloudAvailable ? personalFree ? `Use ${providerLabel} for skill-based questions` : `Use ${providerLabel} questions and feedback` : 'AI connection not configured'}<small>{cloudAvailable ? personalFree ? 'I agree to send only the broad role and selected generic skill tags below to Google. No resume text, contact details, employers, or interview answers are sent. Answer feedback uses a browser practice rubric.' : fictionalOnly ? 'I confirm this is fictional sample data and agree to send its text and typed answers to Google. Free-tier data may improve Google products and be reviewed by people. Do not include personal, sensitive, or confidential information.' : `I agree to send my resume/context, answers, and recorded audio to ${providerLabel} for processing.` : 'Curated questions and a transparent browser practice rubric are available now.'}</small></span></label>
              {cloudConsent && personalFree && <div className="skill-profile"><strong>What Google receives</strong><p>Broad role: {profile.roleFamily}. Interview focus, level, and question count. Only the selected tags below; click a tag to exclude it.</p><div className="skill-tags" role="group" aria-label="Generic skills shared with AI">{detectedProfile.skills.map(skill => <button key={skill} aria-pressed={!excludedSkills.includes(skill)} onClick={() => setExcludedSkills(old => old.includes(skill) ? old.filter(s => s !== skill) : [...old, skill])}>{!excludedSkills.includes(skill) && <Check size={11}/>} {skill}</button>)}</div>{!profile.skills.length && <small>No skill tags selected. We’ll ask general questions for this broad role.</small>}<p>Personal answer feedback stays in your browser. Full AI analysis of real resumes and answers requires a paid provider configuration. <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">Google’s data terms</a></p></div>}
              <button className="primary full" disabled={!!busy || !online} onClick={() => void prepare()}>{busy ? <><LoaderCircle className="spin" size={17}/>{busy}</> : <>Build my interview<ArrowRight size={18}/></>}</button><p className="form-footnote"><LockKeyhole size={12}/>PDFs are read in your browser. Recording is always optional.</p>
            </section>
            <aside className="preview-panel"><div className="preview-top"><span className="tiny-label">THE SPACE BETWEEN “WHAT IF” & “I’M READY”</span><span className="sparkle-mark">✳</span></div><div className="orbit-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit orbit-three"/><div className="orbit-center"><AudioLines size={47} strokeWidth={1.3}/></div><span className="orbit-star">✦</span><span className="orbit-dot"/><span className="art-label art-label-one">your experience</span><span className="art-label art-label-two">your own voice</span></div><div className="preview-copy"><span className="eyebrow">A REHEARSAL, BUILT AROUND YOU</span><h2>Your experience.<br />Your next chapter.</h2><p>Relevant questions. Room to think.<br />Feedback you can actually put to work.</p></div><div className="session-blueprint"><span>YOUR SESSION AT A GLANCE</span><div><strong>{count}</strong><p>tailored questions<small>{type === 'Mixed' ? 'Behavioral + technical' : type + ' focus'}</small></p><span className="blueprint-line"/><strong>~{count * 2}</strong><p>minutes<small>At your own pace</small></p></div></div><div className="preview-bottom"><ShieldCheck size={16}/>Practice is personal. Your recording stays with you.</div></aside>
          </div>
          <div className="feature-strip">{[{ n: '01', icon: FileText, title: 'Bring your experience', text: 'A resume, a role, or an idea of what’s next.' }, { n: '02', icon: Video, title: 'Find your rhythm', text: 'Practice aloud, on camera, or in writing.' }, { n: '03', icon: Film, title: 'See what’s working', text: 'Useful feedback. Moments worth revisiting.' }].map(f => <div key={f.n}><span>{f.n}</span><f.icon size={19}/><div><h3>{f.title}</h3><p>{f.text}</p></div></div>)}</div>
        </>}
        {stage === 'studio' && q && <>
          <div className="studio-heading"><div><div className="eyebrow">YOUR PRACTICE, YOUR PACE</div><h1>Find your <em>rhythm.</em></h1><p>{role || 'General interview'} · {level}</p></div><div className="question-progress"><strong>{String(index + 1).padStart(2, '0')}</strong><span>/ {String(questions.length).padStart(2, '0')} questions</span><div className="progress-track"><i style={{ width: `${index / questions.length * 100}%` }}/></div></div></div>
          <div className="studio-grid"><div><section className="question-card"><div className="question-meta"><span>{q.category}</span><span>{q.source === 'generated' ? 'AI generated' : 'Curated question'}</span></div><h2>{q.prompt}</h2><div className="question-bottom"><span>Take a breath. You’ve got room to think.</span><button className="text-link" onClick={readQuestion} disabled={recording}><AudioLines size={15}/>Read question</button></div></section>
            <section className="camera-card">{media && !clip ? <video ref={videoRef} className="live-video" autoPlay muted playsInline aria-label="Live camera preview"/> : clip ? <video src={clip.url} className="playback-video" controls playsInline aria-label="Review your answer recording"/> : <div className="camera-empty"><div className="camera-glyph">{textOnly ? <FileText size={29}/> : <Video size={29}/>}</div><h3>{textOnly ? 'Make space for your answer.' : 'Your practice studio is ready.'}</h3><p>{textOnly ? 'Write your response in the transcript box below.' : 'Turn on your camera and microphone when you’re ready.'}</p>{!textOnly && <><label className="check-row media-check"><input type="checkbox" checked={mediaConsent} onChange={e => setMediaConsent(e.target.checked)}/><span>I agree to record my camera and microphone for this session.</span></label><button className="primary" disabled={!mediaConsent || !!busy} onClick={() => void enableMedia()}><Video size={16}/>Enable camera & microphone</button><button className="text-link" disabled={!!busy} onClick={() => setTextOnly(true)}>Use text answers instead<ArrowRight size={14}/></button></>}</div>}
              <div className="camera-controls"><span className={recording ? 'recording-status' : 'camera-status'}><i />{recording ? 'Recording' : clip ? (media ? 'Answer captured · camera on' : 'Answer captured') : media ? 'Camera & mic on' : 'Camera & mic off'}</span><span className="record-time">{clock(clip?.duration ?? seconds)} <small>/ 03:00</small></span><div className="meter" aria-label="Microphone level">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ height: 5 + Math.min(1, meter) * (8 + (i % 4) * 6), opacity: media ? .45 + Math.min(1, meter) * .5 : .2 }}/>)}</div>{recording ? <button className="stop-button" onClick={() => void stopRecording()} disabled={!!busy}><Square size={13} fill="currentColor"/>Stop answer</button> : media && !clip ? <button className="record-button" onClick={startRecording} disabled={!!busy}><span />Record answer</button> : clip ? <button className="text-link" disabled={!!busy} onClick={retake}>Retake</button> : null}{media && <button className="device-off" aria-label="Turn off camera and microphone" disabled={recording || !!busy} onClick={releaseDevices}><Video size={14}/><X size={10}/></button>}</div>
            </section>
            <section className="transcript-card"><div><label className="field-label" htmlFor="transcript">Your answer transcript</label><span>{transcript.trim().split(/\s+/).filter(Boolean).length} words</span></div><p>{localReview ? personalFree ? 'Your answer stays in this browser. Feedback uses a transparent practice rubric, not AI analysis. Type or paste what you said.' : 'Practice mode: type or paste what you said. The browser rubric uses this text, not the recording.' : fictionalOnly ? 'Fictional sample mode: type a made-up answer only. This text goes to Google; recordings stay local.' : 'Stop recording to transcribe, then review and correct your words before continuing.'}</p><textarea id="transcript" rows={5} maxLength={20000} placeholder={mode === 'live' && fictionalOnly && !personalFree ? 'In this fictional example, I built a pretend project…' : 'Your words go here. A specific situation, what you did, and what changed…'} value={transcript} disabled={recording || !!busy} onChange={e => setTranscript(e.target.value)}/>{clip && mode === 'live' && mediaCloudAvailable && <button className="text-link" disabled={!!busy} onClick={() => void transcribe(clip.audio)}>Retry audio transcription</button>}</section>
            <div className="studio-actions"><button className="text-link" disabled={recording || !!busy || !!clip || !!transcript.trim()} onClick={() => void saveAnswer(true)}>Skip this question</button><button className="primary" disabled={recording || !!busy || !transcript.trim()} onClick={() => void saveAnswer()}>{busy ? <><LoaderCircle className="spin" size={17}/>{busy}</> : <>{index === questions.length - 1 ? 'Finish & see feedback' : 'Save & next question'}<ArrowRight size={17}/></>}</button></div>
          </div><aside className="coaching-sidebar"><div className="coaching-card"><span className="tiny-label">A SMALL REMINDER</span><h3>Let the story<br />do the talking.</h3><p>You don’t need a perfect answer. You need a clear one.</p><ol><li><span>S</span><div><strong>Set the scene</strong><small>What was happening?</small></div></li><li><span>A</span><div><strong>Make it yours</strong><small>What did you actually do?</small></div></li><li><span>R</span><div><strong>Show the change</strong><small>What happened? What did you learn?</small></div></li></ol></div><div className="privacy-card"><LockKeyhole size={19}/><h4>Your recording stays here.</h4><p>Clips stay in this browser until you download them or close the page.</p>{mode === 'live' && (mediaCloudAvailable ? <><label className="check-row"><input type="checkbox" checked={visualConsent} disabled={recording || !!busy || !!clip} onChange={e => setVisualConsent(e.target.checked)}/><span>Include camera observations<small>Send up to 4 sampled frames to {providerLabel} for framing, posture, and face/mouth visibility feedback.</small></span></label><p>Audio and transcripts use the cloud processing you enabled. Camera observations do not affect scores.</p></> : <p>{personalFree ? 'Your personal resume, answers, and recordings stay in this browser. Only the approved generic role and skill tags are used for AI questions. Answer feedback uses the browser practice rubric.' : 'Fictional sample text and typed answers use Gemini. No original PDFs, audio, or camera frames are sent.'}</p>)}</div>{textOnly && <button className="text-link" onClick={() => setTextOnly(false)}>Switch to camera practice<ArrowRight size={14}/></button>}</aside></div>
        </>}
        {stage === 'review' && <>
          <div className="studio-heading report-heading"><div><div className="eyebrow"><CheckCircle2 size={14}/>ONE PRACTICE CLOSER</div><h1>That’s how you <em>grow.</em></h1><p>{role || 'General interview'} · {answers.length} answers · {localReview ? 'Browser practice rubric' : 'AI coaching estimates'}</p></div><button className="secondary" onClick={exportReport}><Download size={16}/>Download report</button></div>
          <div className="report-overview"><div className="overall"><span className="tiny-label">YOUR SESSION</span><div>{scoreText(report.overall)}<small>/100</small></div><p>{report.overall === null ? 'Not enough answer evidence' : 'A starting point for your next practice'}</p></div><div className="score-grid">{[{ key: 'confidence', name: 'Confidence', sub: 'Speaking pace + filler proxy', icon: AudioLines }, { key: 'content', name: 'Content', sub: 'Specificity, structure & evidence', icon: FileText }, { key: 'comprehension', name: 'Comprehension', sub: 'How you address the question', icon: Sparkles }].map(item => <div className="score-item" key={item.key}><item.icon size={19}/><div><span>{item.name}</span><strong>{scoreText(report.scores[item.key])}<small>{report.scores[item.key] === null ? 'unavailable' : '/100'}</small></strong><p>{item.sub}</p></div></div>)}</div></div>
          <p className="score-disclaimer">{localReview ? 'Practice scores use simple text heuristics and cannot establish correctness or genuine comprehension.' : 'AI feedback is provisional and may be wrong.'} Confidence describes delivery patterns, not how you feel. Camera observations never affect scores.</p>
          <div className="section-title-row"><div><span className="eyebrow">THE REPLAY ROOM</span><h2>Moments to come back to.</h2></div><span>Whole answer clips · ranked by available scores</span></div>
          <div className="moments-grid">{[{ kind: 'best', label: 'YOUR STRONGEST MOMENT', index: report.best }, { kind: 'worst', label: 'YOUR BIGGEST OPPORTUNITY', index: report.worst }].map(item => { const take = item.index === null ? null : answers[item.index]; return <section className={`moment-card ${item.kind}`} key={item.kind}><div className="moment-label"><span>{item.kind === 'best' ? <Sparkles size={15}/> : <ArrowUpRight size={16}/>} {item.label}</span>{take && <strong>{scoreText(overallScore(take.analysis.scores))}/100</strong>}</div>{take?.url ? <><video controls playsInline src={take.url} preload="metadata" aria-label={item.kind === 'best' ? 'Strongest answer clip' : 'Weakest answer clip'}/><div className="moment-copy"><span>QUESTION {(item.index ?? 0) + 1} · {clock(take.duration)}</span><h3>{take.question.prompt}</h3><p>{take.analysis.summary}</p><button className="text-link" onClick={() => download(take.url!, `cadence-${item.kind}-answer.${take.mime.includes('mp4') ? 'mp4' : 'webm'}`)}><Download size={15}/>Download this clip</button></div></> : <div className="moment-empty"><Film size={28}/><h3>{item.kind === 'best' ? 'Your next replay starts here.' : 'Make room for a comparison.'}</h3><p>{item.kind === 'best' ? 'Record at least one scored answer to see a highlight.' : 'Record at least two scored answers to compare your strongest and weakest moments.'}</p></div>}</section>; })}</div>
          <div className="section-title-row"><h2>Go a little deeper.</h2><span>Your answers, with something to work on.</span></div>
          <div className="answer-list">{answers.map((take, i) => <details key={take.question.id}><summary><span className="answer-number">{String(i + 1).padStart(2, '0')}</span><span>{take.question.prompt}</span><strong>{scoreText(overallScore(take.analysis.scores))}<small>/100</small></strong><ChevronDown size={17}/></summary><div className="answer-detail"><p>{take.analysis.summary}</p><div className="feedback-columns"><div><h4>Keep doing</h4><ul>{take.analysis.strengths.map((s, j) => <li key={j}>{s}</li>)}</ul></div><div><h4>Try next time</h4><ul>{take.analysis.improvements.map((s, j) => <li key={j}>{s}</li>)}</ul></div></div>{take.analysis.visual.length > 0 && <div><h4>Camera observations</h4><ul>{take.analysis.visual.map((s, j) => <li key={j}>{s}</li>)}</ul></div>}<div className="transcript-quote"><h4>Your transcript</h4><p>{take.transcript || 'Question skipped. No transcript submitted.'}</p></div>{take.analysis.evidence.length > 0 && <p className="evidence-note">Evidence: “{take.analysis.evidence[0]}”</p>}<div className="answer-metrics"><span>{take.analysis.metrics.words} words</span><span>{take.analysis.metrics.fillers} filler phrases</span><span>{take.analysis.metrics.wpm === null ? 'Pace unavailable' : `${take.analysis.metrics.wpm} words/min incl. pauses`}</span><span>{take.analysis.mode === 'live' ? 'AI feedback' : 'Practice rubric'}</span></div>{take.url && <button className="text-link" onClick={() => download(take.url!, `cadence-answer-${i + 1}.${take.mime.includes('mp4') ? 'mp4' : 'webm'}`)}><Download size={14}/>Download answer recording</button>}</div></details>)}</div>
          <div className="review-footer"><div><LockKeyhole size={18}/><p>Keep the moments that matter.<small>Download your clips before closing this page. Starting fresh clears this session.</small></p></div><button className="primary" onClick={reset}>Start a fresh practice<ArrowRight size={17}/></button></div>
        </>}
        <footer className="page-footer"><span>Built for the person you’re becoming.</span><span>cadence<span className="brand-dot">.</span></span></footer>
      </main>
    </div>
    <dialog ref={helpRef} className="help-dialog"><button className="dialog-close" aria-label="Close explanation" onClick={() => helpRef.current?.close()}><X size={20}/></button><span className="eyebrow">A LITTLE PRACTICE GOES A LONG WAY</span><h2>Your interview, rehearsed.</h2><ol><li><strong>Bring context.</strong> Upload a PDF or TXT resume. PDFs are read in this browser; review the extracted text before building your interview.</li><li><strong>Practice your way.</strong> Give text answers or opt into camera/microphone recording. Each answer becomes its own downloadable clip.</li><li><strong>Review your words.</strong> Cloud audio transcription is available only when the provider’s data policy permits it. Otherwise enter the transcript yourself.</li><li><strong>Find your next step.</strong> Review content, comprehension, and delivery feedback, then replay the strongest and weakest recorded answers.</li></ol><p>Confidence is a delivery proxy based on pace and filler phrases. Camera feedback covers visible framing and posture; it never infers feelings or identity. Missing evidence stays unavailable.</p><p>Videos stay in browser memory. {fictionalOnly ? 'Personal mode keeps your resume and answers in this browser and can send selected generic skill tags for AI questions. Fictional sample mode sends extracted text and typed answers to Google. Free-tier cloud data may improve Google products and be reviewed by people.' : `With cloud consent, resume/context, transcript, audio, and optional sampled frames are sent to ${providerLabel}; its data policies apply.`} Download clips before closing this page.</p><button className="primary" onClick={() => helpRef.current?.close()}>Let’s practice<ArrowRight size={17}/></button></dialog>
  </div>;
}
