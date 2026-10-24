import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordedDelivery, selectMoments, timedWords } from '../lib/recorded-delivery.mjs';
const transcript = 'First I built and tested a service because users needed reliable results. Then I measured the result and reduced errors by 20 percent.';
const words = transcript.split(' ').map((text, i) => ({ text, start: i * .6, end: i * .6 + .5 }));
const duration = words.at(-1).end + .4;
const audio = Array.from({ length: 160 }, (_, i) => ({ at: i / 10, rms: .04 }));
function take(overrides = {}) { return { hasRecording: true, url: 'blob:synthetic', transcript, words, audioEvidence: audio, visionEvidence: [], duration, mime: 'video/webm', question: { focus: ['tested', 'result'] }, analysis: { scores: { confidence: 80, content: 80, comprehension: 75 } }, ...overrides }; }
test('delivery excludes unavailable video and exposes measured audio weights', () => {
    const result = recordedDelivery({ transcript, duration, words, audio });
    assert.ok(result.score > 0); assert.equal(result.components.length, 3);
    assert.ok(result.components.every(c => !/head|framing/i.test(c.name)));
    assert.ok(result.notes.some(n => n.includes('Head direction unavailable')));
    assert.ok(Math.abs(result.components.reduce((s,c) => s+c.weight, 0)-100) <= 1);
});
test('observable video changes delivery but never creates text evidence or eye-contact claims', () => {
    const good = Array.from({ length: 12 }, (_, i) => ({ at: i, facing: true, shouldersVisible: true }));
    const poor = good.map(s => ({ ...s, facing: false, shouldersVisible: false }));
    const a = recordedDelivery({ transcript, duration, words, audio, vision: good });
    const b = recordedDelivery({ transcript, duration, words, audio, vision: poor });
    assert.ok(a.score > b.score); assert.equal(a.components.length, 5);
    assert.ok(a.components.some(c => c.evidence.includes('not a measure of eye contact')));
    assert.equal(a.metrics.words, b.metrics.words);
});
test('missing or insufficient recording evidence stays unavailable', () => {
    assert.equal(recordedDelivery({ transcript: '', duration: 60 }).score, null);
    assert.equal(recordedDelivery({ transcript, duration: 2, words, audio }).score, null);
    assert.equal(recordedDelivery({ transcript, duration }).score, null);
});
test('one recorded answer can supply distinct strong and weak excerpts with bounded timestamps', () => {
    const result = selectMoments([take()]);
    assert.ok(result.best.length); assert.ok(result.worst.length);
    assert.notEqual(result.best[0].id, result.worst[0].id);
    for (const m of [...result.best,...result.worst]) { assert.ok(m.start >= 0 && m.end <= duration && m.end > m.start); assert.ok(m.reason.includes('heuristic')); }
});
test('multiple answers can provide multiple moments without duplicate IDs or typed-answer clips', () => {
    const result = selectMoments([take(), take({ url:'blob:two' }), take({ url:'blob:three' }), take({ hasRecording:false, url:null })]);
    assert.equal(result.best.length,3); assert.equal(result.worst.length,3);
    const ids = [...result.best,...result.worst].map(m=>m.id); assert.equal(new Set(ids).size,ids.length);
    assert.ok(!ids.some(id=>id.startsWith('3-')));
});
test('two timestamp-free recordings retain both whole-answer categories', () => {
    const result = selectMoments([take({words:[]}),take({words:[],url:'blob:second'})]);
    assert.equal(result.best.length,1); assert.equal(result.worst.length,1);
    assert.notEqual(result.best[0].answerIndex,result.worst[0].answerIndex);
    assert.deepEqual(selectMoments([take({hasRecording:false,url:null})]),{best:[],worst:[]});
});
test('invalid ASR timestamps are rejected rather than fabricating alignment', () => {
    assert.deepEqual(timedWords([{text:'hello',timestamp:[0,1]},{text:'bad',timestamp:[2,null]},{text:'bad',timestamp:[3,2]},{text:'late',timestamp:[10,12]}],5),[{text:'hello',start:0,end:1}]);
});
test('measured shoulder movement and long interior pauses affect the delivery breakdown', () => {
    const steady = Array.from({length:12},(_,i)=>({at:i,facing:true,shouldersVisible:true,bodyShift:.02}));
    const shifting = steady.map(v=>({...v,bodyShift:.4}));
    const a=recordedDelivery({transcript,duration,words,audio,vision:steady});
    const b=recordedDelivery({transcript,duration,words,audio,vision:shifting});
    assert.equal(a.components.length,6);assert.ok(a.score>b.score);
    const gaps=audio.map(s=>({...s,rms:s.at>=4&&s.at<=9?0:.04}));
    const c=recordedDelivery({transcript,duration,words,audio:gaps,vision:steady});
    assert.ok(c.score<a.score); assert.ok(c.components.find(c=>c.name==='Pause cadence').evidence.startsWith('1 '));
});
test('one timestamp-free recording retains a highlight without inventing a comparison',()=>{
    const selection=selectMoments([take({words:[]})]);assert.equal(selection.best.length,1);assert.equal(selection.worst.length,0);
});
