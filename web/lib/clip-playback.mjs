const SEEK_TOLERANCE = 0.12;
function abortError(){return new DOMException('Replay cancelled.','AbortError');}
function waitForMedia(video,predicate,{signal,timeoutMs=12000}={},events=['loadedmetadata','loadeddata','durationchange','progress','seeked','canplay']){
 if(signal?.aborted)return Promise.reject(abortError());
 if(predicate())return Promise.resolve();
 return new Promise((resolve,reject)=>{
  let timer;
  const clean=()=>{clearTimeout(timer);for(const name of events)video.removeEventListener(name,check);video.removeEventListener('error',failed);signal?.removeEventListener('abort',aborted);};
  const done=(error)=>{clean();error?reject(error):resolve();};
  const check=()=>{if(predicate())done();};
  const failed=()=>done(new Error('The recording could not be decoded. Download the full recording or retry replay.'));
  const aborted=()=>done(abortError());
  for(const name of events)video.addEventListener(name,check);
  video.addEventListener('error',failed);signal?.addEventListener('abort',aborted,{once:true});
  timer=setTimeout(()=>done(new Error('The selected moment is taking too long to load. Retry replay or download the full recording.')),timeoutMs);
  check();
 });
}
export async function seekMedia(video,target,options={}){
 await waitForMedia(video,()=>video.readyState>=1,options);
 if(!video.seeking&&video.readyState>=2&&Math.abs(video.currentTime-target)<=SEEK_TOLERANCE)return;
 // Assigning currentTime starts an asynchronous decode/seek, not a completed seek.
 video.currentTime=target;
 await waitForMedia(video,()=>!video.seeking&&video.readyState>=2&&Math.abs(video.currentTime-target)<=SEEK_TOLERANCE,options);
}
export async function prepareClipRange(video,start,end,options={}){
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start)throw new Error('Invalid clip range.');
 await waitForMedia(video,()=>video.readyState>=1,options);
 if(!Number.isFinite(video.duration)){
  // MediaRecorder WebM often omits a duration/index. Reading through a seek to
  // its end lets the browser discover the complete Blob before seeking back.
  video.currentTime=1e9;
  await waitForMedia(video,()=>Number.isFinite(video.duration)&&video.duration>0&&!video.seeking,options);
 }
 if(video.duration<=0||start>=video.duration-.02)throw new Error('This moment starts beyond the available recording. Download the full recording to review it.');
 const range={start,end:Math.min(end,video.duration)};
 await seekMedia(video,range.start,options);
 return range;
}
export function attachClipPlayback(video,start,end,onState=()=>{}){
 const controller=new AbortController();let pending=null,range={start,end},prepared=false,disposed=false,wantsPlay=false,watchdog;
 const emit=(state,error='')=>{if(!disposed)onState({state,error});};
 const stopWatch=()=>{clearTimeout(watchdog);watchdog=undefined;};
 const watch=()=>{stopWatch();if(video.paused||pending)return;const before=video.currentTime;watchdog=setTimeout(()=>{if(disposed||video.paused||pending)return;if(video.currentTime<=before+.05){video.pause();emit('error','Playback did not advance. Retry replay or download the full recording.');}else watch();},6000);};
 function prepare(play=false){
  wantsPlay=wantsPlay||play;
  if(pending)return pending;
  stopWatch();emit('loading');
  pending=Promise.resolve().then(()=>prepareClipRange(video,start,end,{signal:controller.signal})).then(async result=>{
   range=result;prepared=true;pending=null;if(disposed)return;
   emit('ready');
   if(wantsPlay){wantsPlay=false;try{await video.play();watch();}catch(error){if(!disposed&&error?.name!=='AbortError')emit('error','Press play to start this moment, or retry replay.');}}
  }).catch(error=>{pending=null;if(disposed||error?.name==='AbortError')return;prepared=false;wantsPlay=false;video.pause();emit('error',error.message);});
  return pending;
 }
 const play=()=>{
  if(!prepared||pending||video.currentTime<range.start-SEEK_TOLERANCE||video.currentTime>=range.end-.02){void prepare(true);return;}
  emit('playing');watch();
 };
 const pause=()=>{stopWatch();if(!pending){wantsPlay=false;emit(video.currentTime>=range.end-.02?'ended':'ready');}};
 const progress=()=>{
  // Ignore stale end-position events while replay is seeking back to its start.
  if(pending||video.seeking||!prepared)return;
  if(video.currentTime>=range.end-.02){video.pause();emit('ended');}
 };
 const seeked=()=>{
  if(pending||!prepared)return;
  if(video.currentTime<range.start-SEEK_TOLERANCE||video.currentTime>range.end+.02)void prepare(!video.paused);
  else progress();
 };
 const failed=()=>{stopWatch();emit('error','The recording could not be played. Retry replay or download the full recording.');};
 for(const [event,handler] of [['play',play],['pause',pause],['timeupdate',progress],['seeked',seeked],['error',failed]])video.addEventListener(event,handler);
 void prepare();
 return {retry:()=>{if(!pending){prepared=false;video.pause();video.load();}return prepare(true);},destroy:()=>{disposed=true;controller.abort();stopWatch();for(const [event,handler] of [['play',play],['pause',pause],['timeupdate',progress],['seeked',seeked],['error',failed]])video.removeEventListener(event,handler);video.pause();}};
}
