'use client';
import {useEffect,useRef} from 'react';
import {speakInterviewLine,stopInterviewerVoice} from '../lib/gearwell-voice';
export function IndividualQuestionVoice({id,text,consent,onError}:{id:string;text:string;consent:boolean;onError:(error:Error)=>void}){
    const report=useRef(onError);report.current=onError;
    useEffect(()=>{if(!consent)return;let active=true;document.getElementById('room-heading')?.scrollIntoView({block:'start'});void speakInterviewLine(text,consent).catch(error=>{if(active&&error.name!=='AbortError')report.current(error);});return()=>{active=false;stopInterviewerVoice();};},[id,text,consent]);
    return null;
}
