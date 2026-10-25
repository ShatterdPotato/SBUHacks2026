import { timedWords } from './recorded-delivery.mjs';
import { preferRefinedWords } from './speech-refinement.mjs';
import { eyeContactSummary, type EyeState, type EyeSummary } from './eye-contact-metrics.mjs';
export type SpeechWord = { text: string; start: number; end: number };
export type AudioEvidence = { at: number; rms: number };
export type VisionEvidence = { at: number; facing: boolean | null; shouldersVisible: boolean | null; bodyShift?: number | null; eyeContact?:EyeState };
export type RecordingEvidence = { words: SpeechWord[]; audioEvidence: AudioEvidence[]; visionEvidence: VisionEvidence[]; transcript: string };

export class RecordingCoach {
    // Serve an isolated bundle: Vinext's client transforms rewrite import.meta.url
    // and inject window-based HMR code, neither of which is valid in this worker.
    private speech = new Worker('/vendor/speech/speech.worker.js', { type: 'module' });
    private vision: Worker | null = null;
    private pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
    private sequence = 0;
    private context: AudioContext | null = null;
    private node: AudioWorkletNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private chunks: Float32Array[] = [];
    private samples = 0;
    private processed = 0;
    private chunkStart = 0;
    private listening = true;
    private turnInferences = 0;
    private batchSeconds = 12;
    private chain: Promise<void> = Promise.resolve();
    private active = false;
    private visionBusy = false;
    private visionReady = false;
    private visionTimer: ReturnType<typeof setInterval> | null = null;
    private started = 0;
    private lastAudioAt = -1;
    private generation = 0;
    private visionEpoch = 0;
    private eyeStart = 0;
    private lastVisionAt = 0;
    private failure: Error | null = null;
    words: SpeechWord[] = [];
    audioEvidence: AudioEvidence[] = [];
    visionEvidence: VisionEvidence[] = [];
    get failed() { return this.failure !== null; }
    get currentTime() { return this.samples / 16000; }
    constructor(private onText: (text: string) => void, private onStatus: (status: string) => void, private onActivity?: (rms: number, at: number) => void, private visionOptions:{eyeContact?:boolean;onEyeContact?:(summary:EyeSummary)=>void}={}) {
        this.speech.onmessage = ({ data }) => {
            if (data.type === 'progress') { this.onStatus(`Loading local speech model (${data.progress}% of current file)`); return; }
            const pending = this.pending.get(data.id);
            if (!pending) return;
            clearTimeout(pending.timer); this.pending.delete(data.id);
            if (data.type === 'error') pending.reject(new Error(data.message)); else pending.resolve(data.output);
        };
        this.speech.onerror = () => { this.rejectPending('Speech worker stopped. Retry transcription or use text practice.'); };
    }
    private rejectPending(message: string) {
        for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new Error(message)); }
        this.pending.clear();
    }
    private request(type: string, audio?: Float32Array, speechMode?:'quick'|'accurate'): Promise<any> {
        const id = ++this.sequence;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('Local transcription timed out. Your recording is preserved; retry on a faster device or use text practice.')); }, 180000);
            this.pending.set(id, { resolve, reject, timer });
            this.speech.postMessage({ id, type, audio, ...(speechMode?{speechMode}:{}) }, audio ? [audio.buffer] : []);
        });
    }
    async warm(speechMode:'quick'|'accurate'='accurate') {
        this.batchSeconds=speechMode==='quick'?6:12;
        this.onStatus('Loading local speech model. First use may take a minute…');
        await this.request('warm',undefined,speechMode);
        this.onStatus('On-device English transcription ready');
        // MediaPipe's WASM loader uses importScripts, which requires a classic worker.
        this.vision = new Worker('/vision-capture.worker.js');
        this.vision.onmessage = ({ data }) => {
            if (data.type === 'ready') this.visionReady = true;
            if (data.type === 'unavailable') { this.visionReady = false; this.onStatus('Speech ready; visual measurements unavailable on this device'); }
            if (data.type === 'frameDone') this.visionBusy = false;
            if (data.type === 'sample' && this.active && this.listening && data.generation === this.generation && data.epoch===this.visionEpoch) {
                const index=this.visionEvidence.findIndex(s=>s.at===data.at);
                if(index>=0)this.visionEvidence[index]={at:data.at,facing:data.facing,shouldersVisible:data.shouldersVisible,bodyShift:data.bodyShift,...(this.visionOptions.eyeContact?{eyeContact:data.eyeContact}:{})};
                this.updateEyeContact();
            }
        };
        this.vision.onerror = () => { this.visionReady=false;this.visionBusy = false; this.onStatus('Speech ready; visual measurements unavailable on this device'); };
        this.vision.postMessage({ type: 'warm',eyeContact:this.visionOptions.eyeContact===true });
    }
    async start(stream: MediaStream, video: HTMLVideoElement | null) {
        this.generation++; this.visionEpoch++;this.eyeStart=0;this.lastVisionAt=0;this.failure = null; this.words = []; this.audioEvidence = []; this.visionEvidence = [];this.updateEyeContact();
        this.chunks = []; this.samples = 0; this.processed = 0; this.chunkStart = 0; this.listening = true; this.lastAudioAt = -1; this.chain = Promise.resolve();
        this.context = new AudioContext({ sampleRate: 16000 });
        if (this.context.sampleRate !== 16000) throw new Error('This browser cannot capture 16 kHz speech for local recognition. Try Chrome or Edge, or use text practice.');
        await this.context.audioWorklet.addModule('/audio-capture.worklet.js');
        await this.context.resume();
        this.source = this.context.createMediaStreamSource(stream);
        this.node = new AudioWorkletNode(this.context, 'cadence-audio-capture');
        this.active = true; this.started = performance.now();
        this.node.port.onmessage = ({ data }: MessageEvent<Float32Array>) => {
            if (!this.active) return;
            this.samples += data.length;
            if (!this.listening) { this.chunks.push(new Float32Array(data.length)); return; }
            this.chunks.push(data);
            const at = this.samples / 16000;
            if (at - this.lastAudioAt >= .1) {
                const rms = Math.sqrt(data.reduce((sum, x) => sum + x * x, 0) / data.length);
                this.audioEvidence.push({ at, rms }); this.lastAudioAt = at;
                this.onActivity?.(rms, at);
            }
            if (this.samples - this.processed >= this.batchSeconds * 16000) this.queueAudio(false);
        };
        this.source.connect(this.node); this.node.connect(this.context.destination);
        if (video) this.visionTimer = setInterval(() => { void this.sampleVideo(video); }, 500);
        this.onStatus('Listening on this device · captions update in short batches');
    }
    private async sampleVideo(video: HTMLVideoElement) {
        if (!this.active || !this.listening) return;
        const at=this.currentTime,generation=this.generation,epoch=this.visionEpoch;
        if(at<=this.lastVisionAt)return;
        // Reserve every scheduled slot, including loading, dropped or stalled frames.
        // Late results replace their own slot and cannot leak into another turn.
        const missing=(time:number)=>({at:time,facing:null,shouldersVisible:null,...(this.visionOptions.eyeContact?{eyeContact:'none' as const}:{})});
        for(let gap=this.lastVisionAt+.5;gap<at-.25;gap+=.5)this.visionEvidence.push(missing(gap));
        this.visionEvidence.push(missing(at));this.lastVisionAt=at;this.updateEyeContact();
        if (!this.visionReady || this.visionBusy || !video.videoWidth) return;
        this.visionBusy = true;
        try {
            const frame = await createImageBitmap(video, { resizeWidth: 384, resizeHeight: Math.round(video.videoHeight / video.videoWidth * 384) });
            if (!this.active || !this.listening || generation!==this.generation || epoch!==this.visionEpoch || !this.vision) { frame.close(); this.visionBusy = false; return; }
            this.vision.postMessage({ type: 'frame', frame, at, timestamp: performance.now(), generation,epoch,eyeContact:this.visionOptions.eyeContact===true }, [frame]);
        } catch { this.visionBusy = false; }
    }
    private updateEyeContact(){if(this.visionOptions.eyeContact)this.visionOptions.onEyeContact?.(eyeContactSummary(this.visionEvidence.filter(s=>s.at>this.eyeStart)));}
    private queueAudio(final: boolean) {
        const end = this.samples, from = this.processed;
        if (end <= from || (!final && end - from < this.batchSeconds * 16000)) return;
        const all = new Float32Array(end - this.chunkStart); let pos = 0;
        for (const chunk of this.chunks) { all.set(chunk, pos); pos += chunk.length; }
        let audio = all.slice(Math.max(0, from - this.chunkStart - 16000));
        const offset = Math.max(this.chunkStart, from - 16000) / 16000, generation = this.generation;
        this.processed = end;
        if(final){
            const lastVoice=this.audioEvidence.findLast(s=>s.at>from/16000&&s.at<=end/16000&&s.rms>=.004)?.at;
            if(lastVoice===undefined)return; // No new speech since the last caption batch.
            audio=audio.slice(0,Math.min(audio.length,Math.ceil((lastVoice+.35-offset)*16000)));
        }
        this.chain = this.chain.then(async () => {
            if (this.failure || generation !== this.generation) return;
            // Whisper can hallucinate on silence. Reject silent chunks before inference.
            if (Math.sqrt(audio.reduce((sum, x) => sum + x * x, 0) / audio.length) < .004) return;
            const output = await this.request('transcribe', audio);
            if (generation !== this.generation) return;
            const words = timedWords(output.chunks, end / 16000, offset).filter((w: SpeechWord) => w.start >= from / 16000 - .15);
            if(words.length)this.turnInferences++;
            this.words.push(...words);
            this.onText(this.words.map(w => w.text).join(' ').trim());
        }).catch(error => { if (generation !== this.generation) return; this.failure = error instanceof Error ? error : new Error('Transcription failed.'); this.onStatus(this.failure.message); });
    }
    // New turns release the previous PCM buffer. The recording stays continuous,
    // while speech recognition excludes interviewer playback and thinking time.
    beginTurn() {
        this.visionEpoch++;this.eyeStart=this.currentTime;this.lastVisionAt=this.currentTime;this.updateEyeContact();
        this.listening = true; this.failure = null; this.chunks = []; this.turnInferences=0;
        this.chunkStart = this.samples; this.processed = this.samples;
        return this.currentTime;
    }
    setListening(value: boolean) { if(this.listening!==value){this.visionEpoch++;if(value)this.lastVisionAt=this.currentTime;}this.listening = value; }
    async finishTurn(start: number, {refine = true}:{refine?:boolean} = {}): Promise<RecordingEvidence> {
        this.setListening(false); const end = this.currentTime;
        this.onStatus('Finishing the last local caption batch…');
        this.queueAudio(true); await this.chain;
        const audio = new Float32Array(refine?Math.round((end-start)*16000):0); let pos = 0;
        for (const chunk of this.chunks) { if(pos>=audio.length)break;audio.set(chunk.subarray(0,audio.length-pos),pos); pos += chunk.length; }
        if (refine && !this.failure && this.turnInferences!==1 && audio.length && Math.sqrt(audio.reduce((s,x) => s+x*x,0)/audio.length) >= .004) {
            this.onStatus('Refining the complete answer on this device…');
            try {
                // Exclude the automatic end-of-turn waiting silence from the
                // refinement request, preserving the original time origin.
                const lastVoice=this.audioEvidence.filter(s=>s.at>=start&&s.at<=end&&s.rms>=.008).at(-1)?.at??end;
                const output = await this.request('transcribe', audio.slice(0,Math.min(audio.length,Math.ceil((lastVoice-start+.5)*16000))));
                const refined=timedWords(output.chunks, end, start);
                const live=this.words.filter(w=>w.start>=start);
                this.words = [...this.words.filter(w => w.start < start), ...preferRefinedWords(live,refined)];
            } catch (error) { this.onStatus('Final refinement unavailable; using live captions. Review recognition errors in the report.'); }
        }
        if (this.failure) throw this.failure;
        const evidence = this.evidence();
        const words = evidence.words.filter(w => w.start >= start && w.end <= end+.1).map(w => ({ ...w, start:w.start-start,end:w.end-start }));
        return { words, transcript:words.map(w=>w.text).join(' ').trim(), audioEvidence:evidence.audioEvidence.filter(s=>s.at>=start&&s.at<=end).map(s=>({...s,at:s.at-start})),visionEvidence:evidence.visionEvidence.filter(s=>s.at>start&&s.at<=end).map(s=>({...s,at:s.at-start})) };
    }
    async stop(): Promise<RecordingEvidence> {
        this.active = false;
        if (this.visionTimer) clearInterval(this.visionTimer);
        this.visionTimer = null;
        this.source?.disconnect(); this.node?.disconnect();
        if (this.context?.state !== 'closed') await this.context?.close(); this.context = null;
        if (this.listening) this.queueAudio(true); await this.chain;
        if (this.failure) throw this.failure;
        this.onStatus('Transcript generated from recording audio · review optional corrections');
        return this.evidence();
    }
    evidence(): RecordingEvidence { return { words: [...this.words], audioEvidence: [...this.audioEvidence], visionEvidence: [...this.visionEvidence], transcript: this.words.map(w => w.text).join(' ').trim() }; }
    async retry(blob: Blob): Promise<RecordingEvidence> {
        this.generation++; this.failure = null;
        const context = new AudioContext({ sampleRate: 16000 });
        try {
            const buffer = await context.decodeAudioData(await blob.arrayBuffer());
            const mono = new Float32Array(buffer.length);
            for (let c = 0; c < buffer.numberOfChannels; c++) { const channel = buffer.getChannelData(c); for (let i = 0; i < mono.length; i++) mono[i] += channel[i] / buffer.numberOfChannels; }
            const output = await this.request('transcribe', mono);
            this.words = timedWords(output.chunks, buffer.duration);
            this.onText(this.words.map(w => w.text).join(' ').trim()); return this.evidence();
        } finally { await context.close(); }
    }
    dispose() {
        this.active = false; this.generation++;
        if (this.visionTimer) clearInterval(this.visionTimer);
        this.source?.disconnect(); this.node?.disconnect(); void this.context?.close().catch(() => {});
        this.speech.terminate(); this.vision?.terminate(); this.rejectPending('Recording session closed.');
    }
}
