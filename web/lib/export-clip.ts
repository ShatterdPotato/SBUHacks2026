import { prepareClipRange } from './clip-playback.mjs';
export async function exportClip(url: string, start: number, end: number): Promise<Blob> {
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) throw new Error('Invalid clip range.');
    const video = document.createElement('video'); video.playsInline = true; video.preload = 'auto';
    const context = new AudioContext();
    let recorder: MediaRecorder | undefined, stream: MediaStream | undefined, timer: ReturnType<typeof setInterval> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
        await context.resume();
        await new Promise<void>((resolve, reject) => {
            const watchdog = setTimeout(() => reject(new Error('Recording could not be opened for clipping.')), 15000);
            video.onloadeddata = () => { clearTimeout(watchdog); resolve(); };
            video.onerror = () => { clearTimeout(watchdog); reject(new Error('Recording could not be opened for clipping.')); };
            video.src = url;
        });
        const range = await prepareClipRange(video,start,end);
        const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        const drawing = canvas.getContext('2d'); if (!drawing || !canvas.captureStream) throw new Error('Clip export is unavailable in this browser. Download the full answer instead.');
        drawing.drawImage(video, 0, 0);
        const audio = context.createMediaStreamDestination(); context.createMediaElementSource(video).connect(audio);
        stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...audio.stream.getAudioTracks()]);
        const mimeType = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(t => MediaRecorder.isTypeSupported(t));
        recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 1200000 });
        const activeRecorder = recorder;
        const result = new Promise<Blob>((resolve, reject) => {
            const chunks: Blob[] = [];
            activeRecorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
            activeRecorder.onstop = () => { const blob = new Blob(chunks, { type: activeRecorder.mimeType }); blob.size ? resolve(blob) : reject(new Error('Clip export was empty.')); };
            activeRecorder.onerror = () => reject(new Error('Clip export failed. Your full recording is preserved.'));
            timeout = setTimeout(() => { reject(new Error('Clip export timed out. Keep this tab visible and retry.')); }, (end - start + 20) * 1000);
        });
        activeRecorder.start(250);
        timer = setInterval(() => {
            drawing.drawImage(video, 0, 0);
            if (video.currentTime >= range.end || video.ended) { video.pause(); if (activeRecorder.state === 'recording') activeRecorder.stop(); }
        }, 33);
        video.onended = () => { if (activeRecorder.state === 'recording') activeRecorder.stop(); };
        await video.play();
        return await result;
    } finally {
        if (timer) clearInterval(timer); if (timeout) clearTimeout(timeout);
        video.pause(); if (recorder?.state === 'recording') recorder.stop();
        stream?.getTracks().forEach(t => t.stop()); await context.close(); video.removeAttribute('src'); video.load();
    }
}
