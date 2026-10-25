'use client';
// Mount temporarily at /qa-gearwell for UI verification; never publish the route.
import {useEffect,useRef,useState} from 'react';
import Home from '@/app/page';
export default function GearwellCameraQA(){
    const [ready,setReady]=useState(false);const cleanup=useRef<()=>void>(()=>{});
    useEffect(()=>()=>cleanup.current(),[]);
    async function initialize(){
        const ac=new AudioContext();await ac.resume();const audio=ac.createMediaStreamDestination();
        const oscillator=ac.createOscillator(),gain=ac.createGain();gain.gain.value=0;oscillator.connect(gain).connect(audio);oscillator.start();
        const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const context=canvas.getContext('2d')!;let frame=0;
        const timer=setInterval(()=>{context.fillStyle='#332719';context.fillRect(0,0,640,360);context.fillStyle='#ffdb82';context.font='28px Georgia';context.fillText('Synthetic camera · '+frame,25,60);context.fillRect((frame++*5)%580,200,60,60);},33);
        const stream=new MediaStream([...canvas.captureStream(30).getVideoTracks(),...audio.stream.getAudioTracks()]);
        const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>stream});
        cleanup.current=()=>{clearInterval(timer);stream.getTracks().forEach(t=>t.stop());void ac.close();Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:original});};
        setReady(true);
    }
    return ready?<Home/>:<main className="wrap gearwell-content"><h1>Synthetic Gearwell camera check</h1><p>No physical devices are accessed. The real interview engine receives moving graphics and silent generated audio.</p><button className="primary" onClick={()=>void initialize()}>Install synthetic camera</button></main>;
}
