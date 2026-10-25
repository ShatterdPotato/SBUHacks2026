'use client';
import React, {useEffect,useRef,useState} from 'react';
import {ConversationStudio} from '@/components/conversation-studio';
import {selectMoments} from '@/lib/recorded-delivery.mjs';
import {exportClip} from '@/lib/export-clip';
import {MomentClip} from '@/components/moment-clip';
import type {Take} from '@/lib/interview-types';
export default function QA(){
 const [verification,setVerification]=useState<unknown>(null);
 const [ready,setReady]=useState(false),[result,setResult]=useState<Take[]|null>(null),[status,setStatus]=useState('Initialize synthetic devices. No physical camera or microphone is used.');
 const ac=useRef<AudioContext|null>(null),observer=useRef<MutationObserver|null>(null),timer=useRef<ReturnType<typeof setInterval>|null>(null);
 useEffect(()=>()=>{observer.current?.disconnect();if(timer.current)clearInterval(timer.current);if(ac.current?.state!=='closed')void ac.current?.close().catch(()=>{});},[]);
 async function initialize(){
  const context=new AudioContext();ac.current=context;await context.resume();const buffers=await Promise.all(['answer1.wav','answer2.wav'].map(async name=>context.decodeAudioData(await(await fetch('/qa-fixtures/'+name)).arrayBuffer())));let turnIndex=0;
  const destination=context.createMediaStreamDestination(),canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;let frame=0;
  timer.current=setInterval(()=>{const c=canvas.getContext('2d')!;c.fillStyle='#244f3e';c.fillRect(0,0,640,360);c.fillStyle='white';c.font='24px sans-serif';c.fillText('Synthetic interview: no camera',30,60);c.fillRect((frame++*3)%500,200,50,50);},33);
  const stream=new MediaStream([...canvas.captureStream(30).getVideoTracks(),...destination.stream.getAudioTracks()]);
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>stream});
  // Test interviewer playback completion without sending speech to OS speakers.
  Object.defineProperty(window.speechSynthesis,'speak',{configurable:true,value:(utterance:SpeechSynthesisUtterance)=>setTimeout(()=>utterance.onend?.({} as SpeechSynthesisEvent),50)});
  let listening=false;
  observer.current=new MutationObserver(()=>{
   const active=!!Array.from(document.querySelectorAll('[role="status"]')).find(el=>el.textContent?.includes('Your turn.'));
   if(active&&!listening){const source=context.createBufferSource();source.buffer=buffers[turnIndex++%buffers.length];source.connect(destination);source.start(context.currentTime+.3);}
   listening=active;
  });observer.current.observe(document.body,{childList:true,subtree:true,characterData:true});setReady(true);setStatus('Synthetic devices installed. Start the real conversation studio below.');
 }
 async function verifyExports(){
  if(!result)return;setStatus('Verifying selected clip audio and global ranges...');
  const m=selectMoments(result);const outputs=[];
  for(const moment of [m.best[0],m.worst[0]]){if(!moment)continue;const blob=await exportClip(moment.url,moment.start,moment.end);const context=new AudioContext();try{const audio=await context.decodeAudioData(await blob.arrayBuffer());const samples=audio.getChannelData(0);const rms=Math.sqrt(samples.reduce((s,x)=>s+x*x,0)/samples.length);outputs.push({start:moment.start,end:moment.end,expectedDuration:moment.end-moment.start,audioDuration:audio.duration,rms,bytes:blob.size});}finally{await context.close();}}
  setVerification(outputs);setStatus('Clip exports decoded with audio.');
 }
 const moments=result?selectMoments(result):null;
 return <main style={{padding:30}}><h1>Continuous conversation regression</h1><p>{status}</p>{!ready&&<button onClick={()=>void initialize()}>Initialize synthetic devices</button>}{ready&&!result&&<ConversationStudio questions={[{id:'qa1',prompt:'Tell me about a fictional example of helping someone.',category:'Behavioral',focus:[],source:'curated'},{id:'qa2',prompt:'How would you check your work?',category:'Technical',focus:[],source:'curated'}]} role="Synthetic cashier practice" roleFamily="Retail cashier / customer service" provider="gemini" providerLabel="Gemini" cloudAvailable={false} unpaid onLegacy={()=>{}} onComplete={takes=>{setResult(takes);observer.current?.disconnect();}}/>}{result&&<><h2>Completed synthetic recording</h2><button onClick={()=>void verifyExports()}>Verify selected clip exports</button><pre id="qa-exports">{JSON.stringify(verification)}</pre><details><summary>Verification JSON</summary><pre id="qa-result">{JSON.stringify({takes:result.map(({url,audioEvidence,visionEvidence,...t})=>({...t,wordCount:t.words.length,audioSamples:audioEvidence.length,visionSamples:visionEvidence.length})),moments: moments&&{best:moments.best.map(({url,...m})=>m),worst:moments.worst.map(({url,...m})=>m)}},null,2)}</pre></details>{result[0]?.url&&<video controls src={result[0].url} style={{width:640}}/>}{moments?.best.map(m=><MomentClip key={m.id} moment={m} kind="best"/>)}{moments?.worst.map(m=><MomentClip key={m.id} moment={m} kind="worst"/>)}</>}</main>;
}
