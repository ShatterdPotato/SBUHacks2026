/// <reference lib="webworker" />
import { pipeline, env, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
env.allowLocalModels = false;
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;
const createSpeech = pipeline as unknown as (task: string, model: string, options: { device: string; dtype: string; progress_callback: (p: { status: string; progress?: number }) => void }) => Promise<AutomaticSpeechRecognitionPipeline>;
let transcriber: Promise<AutomaticSpeechRecognitionPipeline> | undefined;
let modelId='Xenova/whisper-base.en';
self.onmessage = async ({ data }) => {
    try {
        if(data.type==='warm'){
            const requested=data.speechMode==='quick'?'Xenova/whisper-tiny.en':'Xenova/whisper-base.en';
            if(requested!==modelId){transcriber=undefined;modelId=requested;}
        }
        transcriber ??= createSpeech('automatic-speech-recognition', modelId, {
            device: 'wasm', dtype: 'q8', progress_callback: (p: { status: string; progress?: number }) => {
                if (p.status === 'progress') self.postMessage({ type: 'progress', progress: Math.round(p.progress ?? 0) });
            }
        });
        const model = await transcriber;
        if (data.type === 'warm') { self.postMessage({ type: 'ready', id: data.id }); return; }
        const output = await model(data.audio as Float32Array, { return_timestamps: 'word', chunk_length_s: 20, stride_length_s: 3, force_full_sequences: false });
        self.postMessage({ type: 'result', id: data.id, output });
    } catch { transcriber = undefined; self.postMessage({ type: 'error', id: data.id, message: 'On-device speech recognition could not run. Check model downloads, retry, or use text practice.' }); }
};
