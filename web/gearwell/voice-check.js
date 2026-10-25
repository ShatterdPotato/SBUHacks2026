import {resolveEmotion} from './emotions.js';
export const INTRODUCTION="Hello, my name is Gearwell. I'll be your interviewer today.";
export const VOICE_ID='Veg2qijYoJAS8VPKOOmi';

// All Gearwell speech goes through the private server endpoint and an MP3 player.
// Mouth motion follows playback events, never the duration of an API request.
export function createVoiceCheck({button,feedback,onSpeakingChange,onBeforeSpeak=()=>{},onStateChange=()=>{},allowPreview=()=>true,fetcher=fetch,audioFactory=()=>new Audio(),urlAPI=URL}) {
  let ready=false;
  let current=null;
  function sync() {
    const retry=current && ['blocked','paused'].includes(current.phase);
    button.textContent=retry ? 'Play voice' : 'Preview voice · ElevenLabs';
    button.disabled=!ready || Boolean(current && !retry) || (!current && !allowPreview());
    button.setAttribute('aria-busy',String(Boolean(current && !retry)));
  }
  function state(token,phase) {
    if(current!==token)return;
    token.phase=phase;
    onStateChange({phase,text:token.text,emotion:token.emotion});sync();
  }
  function release(token) {
    clearTimeout(token.timer);
    token.controller.abort();
    if(token.audio) {token.audio.pause();token.audio.removeAttribute('src');token.audio.load();}
    if(token.url)urlAPI.revokeObjectURL(token.url);
  }
  function finish(token,error) {
    if(current!==token)return;
    current=null;release(token);
    onSpeakingChange(false,{text:token.text,emotion:token.emotion});
    onStateChange({phase:'idle',text:token.text,emotion:token.emotion});
    feedback.textContent=error?.name==='AbortError' ? '' : error?.message || '';
    sync();
    if(error)token.reject(error);
    else token.resolve({blob:token.blob,voiceId:VOICE_ID,emotion:token.emotion});
  }
  function stop() {
    if(current)finish(current,new DOMException('Speech cancelled.','AbortError'));
  }
  async function play(token) {
    if(current!==token)return;
    try {await token.audio.play();}
    catch(error) {
      if(current!==token)return;
      onSpeakingChange(false,{text:token.text,emotion:token.emotion});
      if(error.name==='NotAllowedError') {
        state(token,'blocked');feedback.textContent='Your voice is ready. Tap Play voice to allow audio playback.';
      } else finish(token,new Error('The generated voice could not play. Please try Voice check again.'));
    }
  }
  async function generate(token) {
    token.timer=setTimeout(()=>finish(token,new Error('Voice generation timed out. Please try again.')),50000);
    const response=await fetcher('/api/speech',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({text:token.text,emotion:token.emotion,speechConsent:true}),signal:token.controller.signal});
    if(current!==token)return;
    if(!response.ok) {
      let message='Gearwell’s voice could not be generated. Please try again.';
      try {const data=await response.json();if(typeof data.error==='string')message=data.error;}catch{}
      throw new Error(message);
    }
    if(!response.headers.get('content-type')?.includes('audio/'))throw new Error('The speech service did not return an audio file.');
    token.blob=await response.blob();
    if(current!==token)return;
    if(!token.blob.size)throw new Error('The speech service returned an empty audio file.');
    clearTimeout(token.timer);
    token.audio=audioFactory();token.audio.preload='auto';token.audio.volume=.8;
    token.audio.defaultPlaybackRate=1.25;token.audio.playbackRate=1.25;token.audio.preservesPitch=true;
    token.url=urlAPI.createObjectURL(token.blob);token.audio.src=token.url;
    token.audio.onplaying=()=>{
      if(current!==token)return;
      onSpeakingChange(true,{text:token.text,emotion:token.emotion});state(token,'speaking');feedback.textContent='Speaking…';
    };
    token.audio.onpause=()=>{
      if(current!==token || token.audio.ended)return;
      onSpeakingChange(false,{text:token.text,emotion:token.emotion});state(token,'paused');feedback.textContent='Voice paused. Tap Play voice to continue.';
    };
    token.audio.onwaiting=()=>{
      if(current!==token)return;
      onSpeakingChange(false,{text:token.text,emotion:token.emotion});state(token,'buffering');feedback.textContent='Buffering voice…';
    };
    token.audio.onended=()=>finish(token);
    token.audio.onerror=()=>finish(token,new Error('The generated voice could not be decoded. Please try again.'));
    // The entire MP3 is loaded, so even long lines have a bounded playback lifetime.
    token.timer=setTimeout(()=>finish(token,new Error('Voice playback timed out. Please try again.')),Math.max(90000,token.text.length*180));
    await play(token);
  }
  function speak(text,{emotion}={}) {
    if(!ready)return Promise.reject(new Error('Gearwell is still loading. Please try again shortly.'));
    if(typeof text!=='string' || !text.trim())return Promise.reject(new Error('Provide text for Gearwell to read.'));
    if(text.trim().length>3000)return Promise.reject(new Error('Use at most 3,000 characters per spoken line.'));
    stop();onBeforeSpeak();
    return new Promise((resolve,reject)=>{
      const token={text:text.trim(),emotion:resolveEmotion(text,emotion),controller:new AbortController(),phase:'preparing',resolve,reject};
      current=token;onSpeakingChange(false,{text:token.text,emotion:token.emotion});state(token,'preparing');feedback.textContent='Preparing Gearwell’s voice…';
      generate(token).catch(error=>{if(current===token)finish(token,error.name==='AbortError' ? new Error('Voice generation was interrupted. Please try again.') : error);});
    });
  }
  button.addEventListener('click',()=>{
    if(current && ['blocked','paused'].includes(current.phase))void play(current);
    else if(allowPreview())void speak(INTRODUCTION,{emotion:'greeting'}).catch(()=>{});
  });
  sync();
  return Object.freeze({speak,stop,refresh:sync,setReady(value){ready=value;if(!ready)stop();sync();},get busy(){return Boolean(current);},get phase(){return current?.phase || 'idle';}});
}
