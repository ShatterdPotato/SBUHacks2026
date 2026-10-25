import test from 'node:test';
import assert from 'node:assert/strict';
import {attachClipPlayback,prepareClipRange,seekMedia} from '../lib/clip-playback.mjs';
const tick=()=>new Promise(resolve=>setTimeout(resolve,15));
class Media extends EventTarget {
 constructor({duration=8,autoSeek=true}={}){super();this.duration=duration;this.actualDuration=8;this.readyState=2;this.seeking=false;this.paused=true;this.position=0;this.target=0;this.autoSeek=autoSeek;this.playCalls=0;this.pauseCalls=0;this.seeks=[];}
 get currentTime(){return this.position;}
 set currentTime(value){this.target=Math.min(value,this.actualDuration);this.seeks.push(value);this.seeking=true;this.readyState=1;this.emit('seeking');if(this.autoSeek)setTimeout(()=>this.finishSeek(),2);}
 finishSeek(){this.position=this.target;this.seeking=false;this.readyState=2;if(!Number.isFinite(this.duration)){this.duration=this.actualDuration;this.emit('durationchange');}this.emit('seeked');this.emit('loadeddata');}
 load(){this.position=0;this.seeking=false;this.readyState=2;this.loads=(this.loads??0)+1;}
 emit(name){this.dispatchEvent(new Event(name));}
 play(){this.playCalls++;const wasPaused=this.paused;this.paused=false;if(wasPaused)this.emit('play');return Promise.resolve();}
 pause(){this.pauseCalls++;const wasPaused=this.paused;this.paused=true;if(!wasPaused)this.emit('pause');}
}
test('clip preparation discovers an unindexed MediaRecorder duration before seeking to a later moment',async()=>{
 const media=new Media({duration:Infinity});const range=await prepareClipRange(media,4,10);assert.deepEqual(range,{start:4,end:8});assert.equal(media.currentTime,4);assert.equal(media.seeking,false);assert.equal(media.duration,8);assert.ok(media.seeks[0]>8);
});
test('a seek is not ready until its decoded position is available',async()=>{
 const media=new Media({autoSeek:false});let complete=false;const work=seekMedia(media,4).then(()=>{complete=true;});await tick();assert.equal(complete,false);media.finishSeek();await work;assert.equal(complete,true);assert.equal(media.currentTime,4);
});
test('replay ignores stale end-position events while the seek back is pending',async()=>{
 const media=new Media();const states=[];const replay=attachClipPlayback(media,4,6,s=>states.push(s));await tick();
 media.position=6.05;await media.play();media.emit('timeupdate');assert.equal(media.paused,false,'a stale end event must not pause the requested replay');await tick();assert.equal(media.currentTime,4);assert.equal(media.paused,false);assert.ok(media.playCalls>=2);
 media.position=6.03;media.emit('timeupdate');assert.equal(media.paused,true);assert.equal(states.at(-1).state,'ended');replay.destroy();
});
test('unavailable clip ranges and media decode timeouts give actionable failures',async()=>{
 const media=new Media();await assert.rejects(prepareClipRange(media,9,10),/beyond the available recording/);
 const stalled=new Media({autoSeek:false});await assert.rejects(seekMedia(stalled,4,{timeoutMs:20}),/too long to load/);
});
test('unmount cancels pending preparation without late state updates',async()=>{
 const media=new Media({autoSeek:false});const states=[];const replay=attachClipPlayback(media,4,6,s=>states.push(s));await tick();replay.destroy();const count=states.length;media.finishSeek();await tick();assert.equal(states.length,count);assert.equal(media.paused,true);
});

test('explicit replay retry resets the decoder before seeking and playing again',async()=>{
 const media=new Media();const replay=attachClipPlayback(media,4,6);await tick();media.position=5;await replay.retry();assert.equal(media.loads,1);assert.equal(media.currentTime,4);assert.equal(media.paused,false);replay.destroy();
});
