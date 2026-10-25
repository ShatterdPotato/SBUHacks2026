'use client';
import { useEffect, useRef, useState } from 'react';
import { attachClipPlayback } from '../lib/clip-playback.mjs';
import { Download } from 'lucide-react';
import { exportClip } from '../lib/export-clip';
import type { ClipFeedback } from './premium-review';
import { FeedbackText } from './feedback-text';
export type Moment = { id: string; answerIndex: number; start: number; end: number; transcript: string; score: number|null; reason: string; url: string; mime: string };
const clock = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
export function MomentClip({ moment, kind, feedback }: { moment: Moment; kind: 'best' | 'worst'; feedback?:ClipFeedback }) {
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    const video=useRef<HTMLVideoElement>(null),playback=useRef<ReturnType<typeof attachClipPlayback>|null>(null);
    const [replay,setReplay]=useState({state:'loading',error:''});
    useEffect(()=>{
        if(!video.current)return;
        playback.current=attachClipPlayback(video.current,moment.start,moment.end,setReplay);
        return ()=>{playback.current?.destroy();playback.current=null;};
    },[moment.url,moment.start,moment.end]);
    async function save() {
        setBusy(true); setError('');
        try {
            const blob = await exportClip(moment.url, moment.start, moment.end);
            const url = URL.createObjectURL(blob), a = document.createElement('a');
            a.href = url; a.download = `cadence-${kind}-q${moment.answerIndex + 1}-${Math.floor(moment.start)}-${Math.ceil(moment.end)}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`; a.click();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        } catch (e) { setError(e instanceof Error ? e.message : 'Could not export this moment.'); }
        finally { setBusy(false); }
    }
    return <article className="moment-excerpt"><video ref={video} controls playsInline preload="auto" src={moment.url} aria-label={`${kind === 'best' ? 'Strong' : 'Improvement'} moment, question ${moment.answerIndex + 1}, ${clock(moment.start)} to ${clock(moment.end)}`}/>
        {replay.state==='loading'&&<p role="status">Preparing this moment for replay…</p>}
        {replay.error&&<p role="alert">{replay.error} <button className="text-link" onClick={()=>void playback.current?.retry()}>Retry replay</button></p>}
        <div className="moment-copy"><span>QUESTION {moment.answerIndex + 1} · {clock(moment.start)}–{clock(moment.end)}{moment.score==null?'':` · ${moment.score}/100 local content estimate`}</span><p className="moment-transcript">“{moment.transcript}”</p>{feedback?<div><small>Gemini feedback on this excerpt · high reasoning</small>{feedback.quote.trim()!==moment.transcript.trim()&&<blockquote>“{feedback.quote}”</blockquote>}{feedback.strength&&<p><FeedbackText>{feedback.strength}</FeedbackText></p>}{feedback.improvement&&<p><FeedbackText>{feedback.improvement}</FeedbackText></p>}<details><summary>Why this assessment</summary><p><FeedbackText>{feedback.justification}</FeedbackText></p></details></div>:<p><FeedbackText>{moment.reason}</FeedbackText></p>}
            <button className="text-link" disabled={busy} onClick={() => void save()}><Download size={15}/>{busy ? 'Preparing your clip…' : 'Download this moment'}</button>
            {busy && <p role="status">Keep this tab open while the selected moment exports.</p>}{error && <p role="alert">{error}</p>}
        </div></article>;
}
