'use client';
import { useState } from 'react';
import { Download } from 'lucide-react';
import { exportClip } from '../lib/export-clip';
export type Moment = { id: string; answerIndex: number; start: number; end: number; transcript: string; score: number; reason: string; url: string; mime: string };
const clock = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
export function MomentClip({ moment, kind }: { moment: Moment; kind: 'best' | 'worst' }) {
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
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
    return <article className="moment-excerpt"><video controls playsInline preload="metadata" src={`${moment.url}#t=${moment.start},${moment.end}`} aria-label={`${kind === 'best' ? 'Strong' : 'Improvement'} moment, question ${moment.answerIndex + 1}, ${clock(moment.start)} to ${clock(moment.end)}`}
        onLoadedMetadata={e => { e.currentTarget.currentTime = moment.start; }}
        onPlay={e => { const v = e.currentTarget; if (v.currentTime < moment.start || v.currentTime >= moment.end) v.currentTime = moment.start; }}
        onTimeUpdate={e => { const v = e.currentTarget; if (v.currentTime >= moment.end) v.pause(); }}/>
        <div className="moment-copy"><span>QUESTION {moment.answerIndex + 1} · {clock(moment.start)}–{clock(moment.end)} · {moment.score}/100 estimate</span><p className="moment-transcript">“{moment.transcript}”</p><p>{moment.reason}</p>
            <button className="text-link" disabled={busy} onClick={() => void save()}><Download size={15}/>{busy ? 'Preparing your clip…' : 'Download this moment'}</button>
            {busy && <p role="status">Keep this tab open while the selected moment exports.</p>}{error && <p role="alert">{error}</p>}
        </div></article>;
}
