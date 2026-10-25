import { deliveryMetrics, overallScore } from './interview.mjs';

const clamp = n => Math.max(0, Math.min(100, n));
const average = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
export function timedWords(chunks, duration, offset = 0) {
    if (!Array.isArray(chunks)) return [];
    return chunks.flatMap(chunk => {
        const start = chunk?.timestamp?.[0], end = chunk?.timestamp?.[1];
        if (typeof chunk?.text !== 'string' || !chunk.text.trim() || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) return [];
        const from = start + offset, to = Math.min(duration, end + offset);
        return from < to ? [{ text: chunk.text.trim(), start: from, end: to }] : [];
    });
}

// Observable practice estimates only. Missing channels never become zero scores.
export function recordedDelivery({ transcript, duration, words = [], audio = [], vision = [] }) {
    const validWords = words.filter(w => w.start >= 0 && w.end > w.start && w.end <= duration + .1);
    const speechStart = validWords.length >= 5 ? validWords[0].start : 0;
    const speechEnd = validWords.length >= 5 ? validWords.at(-1).end : duration;
    const metrics = deliveryMetrics(transcript, Math.max(0,speechEnd-speechStart), true);
    const components = [];
    if (metrics.wpm !== null) components.push({ name: 'Speaking pace', score: clamp(100 - Math.max(0, Math.abs(metrics.wpm - 140) - 30) * .7), weight: .2, evidence: `${metrics.wpm} words/minute including pauses` });
    const repeats = (transcript.match(/\b([\p{L}]+)[\s,]+\1\b/giu) ?? []).length;
    if (metrics.words >= 15 && validWords.length >= 5) components.push({ name: 'Fillers and repeated words', score: clamp(100 - (metrics.fillers + repeats) / metrics.words * 220), weight: .1, evidence: `${metrics.fillers} filler phrases; ${repeats} possible word repetitions. ASR may omit or misrecognize disfluencies; this does not diagnose stuttering.` });
    const levels = audio.filter(s => Number.isFinite(s.at) && Number.isFinite(s.rms) && s.at >= speechStart && s.at <= speechEnd);
    if (levels.length >= 20 && duration >= 5) {
        let longPauses = 0, silentStart = null;
        for (const sample of levels) {
            if (sample.rms < .008) silentStart ??= sample.at;
            else { if (silentStart !== null && sample.at - silentStart > 3.5) longPauses++; silentStart = null; }
        }
        components.push({ name: 'Pause cadence', score: clamp(100 - longPauses / Math.max(1, duration / 60) * 10), weight: .15, evidence: `${longPauses} interior low-volume gaps longer than 3.5 seconds; noise can affect detection` });
    }
    const face = vision.filter(v => typeof v.facing === 'boolean');
    const body = vision.filter(v => typeof v.shouldersVisible === 'boolean');
    if (face.length >= 8 && face.length / vision.length >= .7) components.push({ name: 'Camera-facing head position', score: Math.round(average(face.map(v => v.facing ? 100 : 0))), weight: .15, evidence: `${face.filter(v => v.facing).length}/${face.length} usable samples roughly camera-facing; smoothed landmark geometry, not a measure of eye contact` });
    if (body.length >= 8 && body.length / vision.length >= .7) components.push({ name: 'Upper-body framing', score: Math.round(average(body.map(v => v.shouldersVisible ? 100 : 0))), weight: .1, evidence: `${body.filter(v => v.shouldersVisible).length}/${body.length} usable samples with both shoulders in frame; camera setup affects this` });
    const movement = vision.filter(v => Number.isFinite(v.bodyShift) && v.bodyShift >= 0);
    const usable = duration >= 5 && metrics.words >= 15 && components.length >= 2;
    const weight = components.reduce((sum, c) => sum + c.weight, 0);
    const score = usable ? Math.round(components.reduce((sum, c) => sum + c.score * c.weight, 0) / weight) : null;
    return { score, components: usable ? components.map(c => ({ ...c, weight: Math.round(c.weight / weight * 100) })) : [],
        metrics: { ...metrics, confidence: score, repetitions: repeats },
        notes: ['Delivery estimate from observable recording cues, not emotional confidence or hiring fitness. Ordinary gestures and body movement are not penalized. With word timestamps, pace covers the first through last recognized word, excluding automatic end-of-turn waiting.',
            `Visual coverage: ${face.length}/${vision.length} usable head-position samples; ${body.length}/${vision.length} usable framing samples. Visual scoring needs at least eight samples and 70% detection coverage.`,
            ...(movement.length >= 5 ? [`${movement.filter(v => v.bodyShift > .25).length} large shoulder-center shifts across ${movement.length} measured intervals. Camera movement can cause this; no movement penalty.`] : []),
            ...(face.length < 8 || face.length/vision.length < .7 ? ['Head direction unavailable: insufficient samples or detection coverage.'] : []),
            ...(body.length < 8 || body.length/vision.length < .7 ? ['Body framing unavailable: insufficient samples or detection coverage.'] : []),
            ...(movement.length < 5 ? ['Body movement unavailable: fewer than five usable motion intervals.'] : [])] };
}

// Split at speech gaps/sentence endings, preserving variable-length excerpts.
export function answerMoments(take, answerIndex) {
    if (!take.hasRecording || !take.url || !take.words?.length || !take.transcript?.trim()) return [];
    const words = take.words.filter(w => w.end > w.start && w.start >= 0 && w.end <= take.duration + .1);
    const groups = []; let group = [];
    for (let i = 0; i < words.length; i++) {
        group.push(words[i]);
        const span = words[i].end - group[0].start;
        if (i === words.length - 1 || span >= 35 || (span >= 5 && (/[.!?]$/.test(words[i].text) || words[i + 1]?.start - words[i].end >= 1.2))) {
            groups.push(group); group = [];
        }
    }
    if (groups.length === 1 && groups[0].length >= 12 && groups[0].at(-1).end - groups[0][0].start >= 7) {
        const only = groups.pop();
        const boundaries = only.map((w, i) => /[,;:.!?]$/.test(w.text) ? i + 1 : -1).filter(i => i >= 3 && i <= only.length - 3);
        const middle = boundaries.sort((a,b) => Math.abs(a-only.length/2)-Math.abs(b-only.length/2))[0] ?? Math.floor(only.length / 2);
        groups.push(only.slice(0, middle), only.slice(middle));
    }
    return groups.filter(g => g.length >= 3 && g.at(-1).end - g[0].start >= 2).map((g, segmentIndex) => {
        const start = Math.max(0, g[0].start - .3), end = Math.min(take.duration, g.at(-1).end + .4);
        const transcript = g.map(w => w.text).join(' ');
        const delivery = recordedDelivery({ transcript, duration: end - start,
            words: g.map(w => ({ ...w, start: w.start - start, end: w.end - start })),
            audio: (take.audioEvidence ?? []).filter(s => s.at >= start && s.at <= end).map(s => ({ ...s, at: s.at - start })),
            vision: (take.visionEvidence ?? []).filter(s => s.at >= start && s.at <= end).map(s => ({ ...s, at: s.at - start })) });
        const focus = (take.question.focus ?? []).filter(f => transcript.toLowerCase().includes(f.toLowerCase())).length;
        const specificity = Math.min(100, 45 + (/\b(tested|measured|verified|checked|because)\b/i.test(transcript) ? 25 : 0) + Math.min(30, focus * 10));
        const checks=(take.analysis.knowledge?.checks??[]).filter(c=>c.quote&&transcript.includes(c.quote));
        const contradicted=checks.some(c=>c.status==='contradicted');
        const content=take.analysis.scores.content??specificity;
        const score = Math.round(Math.max(0,(delivery.score ?? specificity) * .5 + specificity * .2 + content * .3 - (contradicted?30:0)));
        return { id: `${answerIndex}-${segmentIndex}`, answerIndex, start:start+(take.recordingOffset??0), end:end+(take.recordingOffset??0), transcript, score,
            reason: `${take.analysis.mode==='live'?'Provisional AI content feedback':'Local content heuristic'}, transcript structure and available delivery cues.${contradicted?' Contains a claim contradicted by the reference check.':''} This excerpt estimate does not verify other claims.`,
            url: take.url, mime: take.mime };
    });
}
export function selectMoments(answers, limit = 3) {
    const candidates = answers.flatMap(answerMoments).sort((a, b) => b.score - a.score || a.answerIndex - b.answerIndex || a.start - b.start);
    if(candidates.length>1&&candidates[0].score===candidates.at(-1).score)for(const c of candidates)c.reason+=' These excerpts are tied; no clear strength difference was measured.';
    if (candidates.length < 2) {
        // Whole-answer fallback still offers both categories when two recordings exist.
        const whole = answers.map((a, answerIndex) => ({ a, answerIndex, score: overallScore(a.analysis.scores) })).filter(x => x.a.hasRecording && x.a.url && x.score !== null)
            .map(x => ({ id: `whole-${x.answerIndex}`, answerIndex: x.answerIndex, start: x.a.recordingOffset??0, end: (x.a.recordingOffset??0)+x.a.duration, transcript: x.a.transcript, score: x.score,
                reason: 'Whole answer: finer speech timestamps unavailable.', url: x.a.url, mime: x.a.mime })).sort((a, b) => b.score - a.score);
        if (whole.length >= 2) return { best: [whole[0]], worst: [whole.at(-1)] };
        if (whole.length === 1 && candidates.length === 0) return { best: whole, worst: [] };
    }
    const count = Math.min(limit, Math.floor(candidates.length / 2));
    return { best: candidates.slice(0, count || 1), worst: count ? candidates.slice(-count).reverse() : [] };
}
