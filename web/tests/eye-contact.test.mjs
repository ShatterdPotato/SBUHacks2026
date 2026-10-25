import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyFrame, headAngles, summarizeEyeContact, emptyEyeCounts, MIN_EYE_FRAMES, eyeContactSummary } from '../lib/eye-contact-metrics.mjs';

const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -40, 1];
const yawed = deg => { const r = deg * Math.PI / 180; return [Math.cos(r), 0, -Math.sin(r), 0, 0, 1, 0, 0, Math.sin(r), 0, Math.cos(r), 0, 0, 0, -40, 1]; };
const centered = { eyeBlinkLeft: 0.05, eyeBlinkRight: 0.05, eyeLookInLeft: 0.1, eyeLookOutRight: 0.1, eyeLookOutLeft:0,eyeLookInRight:0,eyeLookUpLeft:0,eyeLookUpRight:0,eyeLookDownLeft: 0.2, eyeLookDownRight: 0.2 };

test('centered eyes with a frontal head count as camera-directed gaze', () => {
    assert.equal(classifyFrame({ scores: centered, matrix: identity }), 'contact');
    assert.equal(classifyFrame({ scores: centered }), 'none');
});

test('sideways, upward, and strong downward glances count as away', () => {
    assert.equal(classifyFrame({ scores: { ...centered, eyeLookInLeft: 0.7, eyeLookOutRight: 0.7 }, matrix: identity }), 'away');
    assert.equal(classifyFrame({ scores: { ...centered, eyeLookUpLeft: 0.6, eyeLookUpRight: 0.6 }, matrix: identity }), 'away');
    assert.equal(classifyFrame({ scores: { ...centered, eyeLookDownLeft: 0.8, eyeLookDownRight: 0.8 }, matrix: identity }), 'away');
    // A mild downward glance toward the screen under the webcam is tolerated.
    assert.equal(classifyFrame({ scores: { ...centered, eyeLookDownLeft: 0.5, eyeLookDownRight: 0.5 }, matrix: identity }), 'contact');
});

test('head turned past the limit counts as away in either direction', () => {
    assert.ok(Math.abs(headAngles(yawed(35)).yaw) > 30);
    assert.equal(classifyFrame({ scores: centered, matrix: yawed(35) }), 'away');
    assert.equal(classifyFrame({ scores: centered, matrix: yawed(-35) }), 'away');
    assert.equal(classifyFrame({ scores: centered, matrix: yawed(10) }), 'contact');
});

test('blinks and missing faces are not counted as eye contact or looking away', () => {
    assert.equal(classifyFrame({ scores: { ...centered, eyeBlinkLeft: 0.9, eyeBlinkRight: 0.9 },matrix:identity }), 'blink');
    assert.equal(classifyFrame({ scores: null }), 'none');
    assert.equal(classifyFrame(), 'none');
    assert.equal(headAngles([1, 2, 3]), null);
});

test('incomplete or corrupt eye geometry cannot turn into a positive observation',()=>{
 for(const scores of [{},{...centered,eyeLookUpLeft:undefined},{...centered,eyeBlinkLeft:NaN},{...centered,eyeLookInLeft:2}])assert.equal(classifyFrame({scores,matrix:identity}),'none');
 assert.equal(classifyFrame({scores:centered,matrix:Array(16).fill(0)}),'none');
 assert.equal(classifyFrame({scores:centered,matrix:identity.map((v,i)=>i===10?NaN:v)}),'none');
});

test('poor coverage, loading and dropped slots suppress percentages without becoming away samples',()=>{
 const samples=[...Array.from({length:20},()=>({eyeContact:'contact'})),...Array.from({length:30},()=>({eyeContact:'none'}))];
 assert.deepEqual(eyeContactSummary(samples),{cameraGaze:null,faceVisible:40,frames:50,classified:20,coverage:40});
 const covered=eyeContactSummary([...Array.from({length:20},()=>({eyeContact:'contact'})),...Array.from({length:5},()=>({eyeContact:'away'})),...Array.from({length:5},()=>({eyeContact:'blink'}))]);
 assert.equal(covered.cameraGaze,80);assert.equal(covered.classified,25);assert.equal(covered.coverage,83);
});

test('summary reports percentages only with enough evidence', () => {
    assert.deepEqual(summarizeEyeContact(emptyEyeCounts()), { cameraGaze: null, faceVisible: null, frames: 0 });
    assert.equal(summarizeEyeContact({ contact: MIN_EYE_FRAMES - 1, away: 0, blink: 0, none: 0 }).cameraGaze, null);
    assert.deepEqual(summarizeEyeContact({ contact: 60, away: 20, blink: 10, none: 10 }), { cameraGaze: 75, faceVisible: 90, frames: 100 });
    assert.deepEqual(summarizeEyeContact({ contact: 0, away: 0, blink: 0, none: 50 }), { cameraGaze: null, faceVisible: 0, frames: 50 });
});
