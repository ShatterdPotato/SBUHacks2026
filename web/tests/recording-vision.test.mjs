import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {transformSync} from 'esbuild';
const source=readFileSync(new URL('../lib/recording-coach.ts',import.meta.url),'utf8');
function harness(){
 const workers=[],ticks=[],summaries=[];let releaseBitmap=null,bitmapClosed=0;
 class Worker{constructor(path){this.path=path;this.sent=[];workers.push(this);}postMessage(data){this.sent.push(data);if(data.type==='warm')queueMicrotask(()=>this.onmessage({data:this.path.includes('speech')?{id:data.id,output:{}}:{type:'ready'}}));if(data.type==='transcribe')queueMicrotask(()=>this.onmessage({data:{id:data.id,output:{chunks:[{text:'captured speech',timestamp:[1.1,1.7]}]}}}));}terminate(){}}
 class AudioContext{sampleRate=16000;state='running';destination={};audioWorklet={addModule:async()=>{}};resume(){}createMediaStreamSource(){return {connect(){},disconnect(){}};}async close(){this.state='closed';}}
 class AudioWorkletNode{port={};connect(){}disconnect(){}}
 const module={exports:{}};
 const context={module,exports:module.exports,require:createRequire(new URL('../lib/recording-coach.ts',import.meta.url)),Worker,AudioContext,AudioWorkletNode,Float32Array,performance,setTimeout,clearTimeout,setInterval:f=>{ticks.push(f);return ticks.length;},clearInterval(){},createImageBitmap:async()=>{if(releaseBitmap)await new Promise(r=>releaseBitmap=r);return {close(){bitmapClosed++;}};}};
 vm.runInNewContext(transformSync(source,{loader:'ts',format:'cjs'}).code,context);
 const coach=new module.exports.RecordingCoach(()=>{},()=>{},undefined,{eyeContact:true,onEyeContact:s=>summaries.push(s)});
 return {coach,workers,summaries,advance(seconds,rms=0){coach.node.port.onmessage({data:new Float32Array(Math.round(seconds*16000)).fill(rms)});},tick:async()=>{ticks[0]();await Promise.resolve();await Promise.resolve();},holdBitmap(){releaseBitmap=true;},releaseBitmap(){const release=releaseBitmap;releaseBitmap=null;release?.();},closed:()=>bitmapClosed};
}
test('vision shares one worker, excludes interviewer/paused intervals and rejects delayed results across turns',async()=>{
 const h=harness();await h.coach.warm();await h.coach.start({}, {videoWidth:1280,videoHeight:720});
 const worker=h.workers[1];assert.equal(worker.sent[0].eyeContact,true);
 h.coach.setListening(false);h.advance(2);await h.tick();assert.equal(h.coach.evidence().visionEvidence.length,0);
 h.coach.beginTurn();h.advance(.5);await h.tick();const old=worker.sent.at(-1);assert.equal(old.type,'frame');
 h.coach.setListening(false);worker.onmessage({data:{...old,type:'sample',facing:true,shouldersVisible:true,eyeContact:'contact'}});worker.onmessage({data:{type:'frameDone'}});
 assert.equal(h.coach.evidence().visionEvidence[0].eyeContact,'none');
 h.coach.beginTurn();h.advance(.5);await h.tick();const current=worker.sent.at(-1);
 worker.onmessage({data:{...old,type:'sample',eyeContact:'away'}});worker.onmessage({data:{...current,type:'sample',facing:true,shouldersVisible:true,eyeContact:'contact'}});worker.onmessage({data:{type:'frameDone'}});
 assert.equal(h.coach.evidence().visionEvidence.at(-1).eyeContact,'contact');assert.equal(h.summaries.at(-1).frames,1);
 h.coach.dispose();
});

test('fast turn completion preserves final captions, trims trailing silence and avoids a whole-answer rerun',async()=>{
 for(const refine of [false,true]){
  const h=harness();await h.coach.warm();await h.coach.start({},null);const start=h.coach.beginTurn();
  h.advance(12,.04);await new Promise(setImmediate);h.advance(3,.04);h.advance(2,0);
  const evidence=await h.coach.finishTurn(start,{refine});
  const requests=h.workers[0].sent.filter(r=>r.type==='transcribe');assert.equal(requests.length,refine?3:2);
  assert.ok(requests[1].audio.length<6*16000,'Final batch excludes trailing silence');assert.equal(evidence.words.length,2);assert.ok(evidence.words[1].start>=12);assert.ok(evidence.transcript.includes('captured speech'));h.coach.dispose();
 }
});

test('already-captioned speech followed by silence needs no extra final inference',async()=>{
 const h=harness();await h.coach.warm();await h.coach.start({},null);const start=h.coach.beginTurn();h.advance(12,.006);await new Promise(setImmediate);h.advance(2,0);const evidence=await h.coach.finishTurn(start,{refine:false});assert.equal(h.workers[0].sent.filter(r=>r.type==='transcribe').length,1);assert.equal(evidence.words.length,1);h.coach.dispose();
});

test('quick speech mode produces earlier caption batches while accurate mode retains longer context',async()=>{
 for(const mode of ['quick','accurate']){
  const h=harness();await h.coach.warm(mode);await h.coach.start({},null);h.coach.beginTurn();h.advance(6,.04);await new Promise(setImmediate);
  assert.equal(h.workers[0].sent[0].speechMode,mode);assert.equal(h.workers[0].sent.filter(r=>r.type==='transcribe').length,mode==='quick'?1:0);h.coach.dispose();
 }
});
test('stalled intervals count as missing coverage and a bitmap created after pause is closed',async()=>{
 const h=harness();await h.coach.warm();await h.coach.start({}, {videoWidth:1280,videoHeight:720});
 h.advance(3);await h.tick();assert.equal(h.coach.evidence().visionEvidence.length,6);assert.equal(h.summaries.at(-1).coverage,0);
 h.workers[1].onmessage({data:{type:'frameDone'}});h.holdBitmap();h.advance(.5);await h.tick();const frames=h.workers[1].sent.length;
 h.coach.setListening(false);h.releaseBitmap();await new Promise(setImmediate);assert.equal(h.closed(),1);assert.equal(h.workers[1].sent.length,frames);
 h.coach.dispose();
});
