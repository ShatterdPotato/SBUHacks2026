class CadenceAudioCapture extends AudioWorkletProcessor {
    process(inputs, outputs) {
        const channels = inputs[0];
        if (channels?.length) {
            const mono = new Float32Array(channels[0].length);
            for (const channel of channels) for (let i = 0; i < mono.length; i++) mono[i] += channel[i] / channels.length;
            this.port.postMessage(mono, [mono.buffer]);
        }
        // Muted output keeps the capture graph processing without audible monitoring.
        for (const channel of outputs[0] ?? []) channel.fill(0);
        return true;
    }
}
registerProcessor('cadence-audio-capture', CadenceAudioCapture);
