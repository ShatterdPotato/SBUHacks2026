import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpeechResponse,VOICE_ID} from '../lib/elevenlabs-speech.mjs';
import {createVoiceCheck,INTRODUCTION} from '../gearwell/voice-check.js';
import {resolveEmotion,EMOTION_ANIMATIONS} from '../gearwell/emotions.js';
import {handleApi} from '../lib/service.mjs';
const request=(body,options={})=>new Request('https://gearwell.test/api/speech',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://gearwell.test',...options.headers},body:JSON.stringify({speechConsent:true,...body}),signal:options.signal});
const mp3=()=>new Response(new Uint8Array([73,68,51,4,0,0,0,0,0,12,1,2,3]),{headers:{'Content-Type':'audio/mpeg'}});
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('Server sends the exact voice/text and returns private MP3 without the key',async()=>{
 let call;
 const response=await createSpeechResponse(request({text:'Excellent answer!',emotion:'encouraging'}),{ELEVENLABS_API_KEY:'server-only-test-key'},async(url,init)=>{call={url,init};return mp3();});
 assert.equal(response.status,200);assert.match(call.url,new RegExp(VOICE_ID));assert.match(call.url,/output_format=mp3_44100_128/);
 assert.equal(call.init.headers['xi-api-key'],'server-only-test-key');assert.deepEqual(JSON.parse(call.init.body),{text:'Excellent answer!',model_id:'eleven_flash_v2_5'});assert.equal(response.headers.get('x-gearwell-model'),'eleven_flash_v2_5');
 assert.equal(response.headers.get('content-type'),'audio/mpeg');assert.equal(response.headers.get('x-gearwell-emotion'),'happy');assert.match(response.headers.get('cache-control'),/no-store/);
 assert.equal((await response.arrayBuffer()).byteLength,13);assert.ok(![...response.headers.values()].join().includes('server-only-test-key'));
});

test('speech model is server-controlled and can retain Multilingual v2 when configured',async()=>{
 let model,calls=0;const provider=async(_url,init)=>{calls++;model=JSON.parse(init.body).model_id;return mp3();};
 const r=await createSpeechResponse(request({text:'A question',model:'injected'}),{ELEVENLABS_API_KEY:'test',ELEVENLABS_MODEL:'eleven_multilingual_v2'},provider);assert.equal(r.status,200);assert.equal(model,'eleven_multilingual_v2');
 const bad=await createSpeechResponse(request({text:'A question'}),{ELEVENLABS_API_KEY:'test',ELEVENLABS_MODEL:'unrecognized'},provider);assert.equal(bad.status,503);assert.equal(calls,1);
});
test('Server rejects invalid requests before making a billable provider call',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return mp3();};const env={ELEVENLABS_API_KEY:'test'};
 for(const [req,status] of [[request({text:'Hello',speechConsent:false}),403],[request({text:''}),400],[request({text:'x'.repeat(3001)}),400],[request({text:'Hello'},{headers:{Origin:'https://other.test'}}),403],[request({text:'Hello'},{headers:{'Content-Type':'text/plain'}}),415]])assert.equal((await createSpeechResponse(req,env,fetcher)).status,status);
 assert.equal((await createSpeechResponse(request({text:'Hello'}),{},fetcher)).status,503);assert.equal(calls,0);
});
test('Provider errors are sanitized and request cancellation reaches the provider',async()=>{
 const response=await createSpeechResponse(request({text:'Hello'}),{ELEVENLABS_API_KEY:'secret'},async()=>new Response('secret provider debug',{status:401}));
 assert.equal(response.status,502);assert.ok(!(await response.text()).includes('secret provider debug'));
 const controller=new AbortController();controller.abort();let aborted=false;
 await createSpeechResponse(request({text:'Hello'},{signal:controller.signal}),{ELEVENLABS_API_KEY:'secret'},async(_url,init)=>{aborted=init.signal.aborted;throw new Error('aborted');});assert.equal(aborted,true);
});
function setup(fetcher=async()=>mp3(),blocked=false){
 const button={handlers:{},setAttribute(){},addEventListener(n,f){this.handlers[n]=f;}},feedback={textContent:''};
 const changes=[],states=[],audios=[],revoked=[];
 class MockAudio {
  constructor(){this.ended=false;audios.push(this);}
  async play(){if(blocked){blocked=false;throw new DOMException('Blocked','NotAllowedError');}this.onplaying?.();}
  pause(){this.onpause?.();}removeAttribute(){}load(){}
  end(){this.ended=true;this.onended?.();}
 }
 const speech=createVoiceCheck({button,feedback,fetcher,audioFactory:()=>new MockAudio(),urlAPI:{createObjectURL:()=>`blob:${audios.length}`,revokeObjectURL:url=>revoked.push(url)},onSpeakingChange:v=>changes.push(v),onStateChange:v=>states.push(v.phase)});speech.setReady(true);
 return {speech,button,feedback,changes,states,audios,revoked};
}
test('MP3 playback events drive speaking, pause/resume, and completion',async()=>{
 let body;const t=setup(async(_url,options)=>{body=JSON.parse(options.body);return mp3();});
 const done=t.speech.speak(INTRODUCTION);await tick();assert.equal(body.text,INTRODUCTION);assert.equal(t.changes.at(-1),true);assert.equal(t.button.disabled,true);
 assert.equal(t.audios[0].playbackRate,1.25);assert.equal(t.audios[0].defaultPlaybackRate,1.25);assert.equal(t.audios[0].preservesPitch,true);
 t.audios[0].pause();assert.equal(t.changes.at(-1),false);assert.equal(t.button.textContent,'Play voice');t.button.handlers.click();await tick();assert.equal(t.changes.at(-1),true);
 t.audios[0].end();const result=await done;assert.equal(result.voiceId,VOICE_ID);assert.ok(result.blob instanceof Blob);assert.equal(t.changes.at(-1),false);assert.equal(t.button.disabled,false);assert.equal(t.revoked.length,1);
});
test('Blocked autoplay retries the same MP3 without another API call',async()=>{
 let calls=0;const t=setup(async()=>{calls++;return mp3();},true);const done=t.speech.speak('Hello');await tick();assert.equal(t.speech.phase,'blocked');assert.equal(t.changes.at(-1),false);assert.equal(t.button.disabled,false);
 t.button.handlers.click();await tick();assert.equal(calls,1);assert.equal(t.changes.at(-1),true);t.audios[0].end();await done;
});
test('Admin stop aborts pending generation and prevents late playback',async()=>{
 let deliver,signal;const t=setup((_url,options)=>{signal=options.signal;return new Promise(resolve=>deliver=resolve);});const done=t.speech.speak('Pending line');const cancelled=assert.rejects(done,{name:'AbortError'});t.speech.stop();await cancelled;assert.equal(signal.aborted,true);
 deliver(mp3());await tick();assert.equal(t.audios.length,0);assert.equal(t.changes.at(-1),false);assert.equal(t.speech.busy,false);
});
test('A new model line cancels old speech; failed generation leaves the mouth closed',async()=>{
 const t=setup();const old=t.speech.speak('First line');const cancelled=assert.rejects(old,{name:'AbortError'});const next=t.speech.speak('New line',{emotion:'surprised'});await cancelled;await tick();assert.equal(t.audios.length,1);t.audios[0].end();assert.equal((await next).emotion,'surprised');
 const bad=setup(async()=>Response.json({error:'API key missing'},{status:503}));await assert.rejects(bad.speech.speak('Hello'),/API key missing/);assert.equal(bad.changes.at(-1),false);assert.equal(bad.button.disabled,false);
});
test('Professional listening stays calm and explicit emotion tags take priority',()=>{
 assert.deepEqual(EMOTION_ANIMATIONS.listening,['Relax','LookAround','Thinking']);assert.equal(resolveEmotion('How did you handle it?'),'thinking');assert.equal(resolveEmotion('Great answer!'),'happy');assert.equal(resolveEmotion('Great answer!','sad'),'sad');assert.equal(resolveEmotion('Welcome'),'greeting');assert.equal(resolveEmotion('Goodbye'),'goodbye');assert.equal(resolveEmotion('Discuss your skills.','not-a-tag'),'neutral');
});

test('The application routes speech to ElevenLabs without calling Gemini',async()=>{
 let url;
 const response=await handleApi(request({text:'Which data structure would you choose, and why?'}),{ELEVENLABS_API_KEY:'voice-only',GEMINI_API_KEY:'never-forward'},async(target,options)=>{url=target;assert.ok(!JSON.stringify(options).includes('never-forward'));return mp3();});
 assert.equal(response.status,200);assert.equal(new URL(url).hostname,'api.elevenlabs.io');
 assert.equal(response.headers.get('x-gearwell-voice'),VOICE_ID);
});

test('Chunked oversized speech bodies are cancelled before any provider request',async()=>{
 let cancelled=false,calls=0;
 const stream=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(12000));},cancel(){cancelled=true;}});
 const req=new Request('https://gearwell.test/api/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:stream,duplex:'half'});
 const result=await createSpeechResponse(req,{ELEVENLABS_API_KEY:'test'},async()=>{calls++;return mp3();});
 assert.equal(result.status,413);assert.equal(calls,0);assert.equal(cancelled,true);
});

test('Successful non-audio upstream responses never reach the player',async()=>{
 const result=await createSpeechResponse(request({text:'Hello'}),{ELEVENLABS_API_KEY:'test'},async()=>Response.json({debug:'private upstream message'}));
 assert.equal(result.status,502);assert.ok(!(await result.text()).includes('private upstream message'));
});

test('Leaving during active playback closes the mouth and ignores stale events',async()=>{
 const t=setup();const pending=t.speech.speak('An interview question');await tick();
 const player=t.audios[0];assert.equal(t.changes.at(-1),true);
 const cancelled=assert.rejects(pending,{name:'AbortError'});t.speech.stop();await cancelled;
 player.onplaying();player.onwaiting();player.end();
 assert.equal(t.changes.at(-1),false);assert.equal(t.speech.phase,'idle');assert.equal(t.revoked.length,1);
});
