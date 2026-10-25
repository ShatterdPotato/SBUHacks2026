'use client';
import {memo,useEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {shellHtml} from '../gearwell/shell';
import '../lib/gearwell-voice';

type Props={stage:'setup'|'studio'|'review';setup:ReactNode;session:ReactNode;report:ReactNode;onCancel:()=>void;onReady:()=>void};
// The imported room moves the canvas between mounts. Never reconcile its DOM.
const GearwellMarkup=memo(function GearwellMarkup(){return <div dangerouslySetInnerHTML={{__html:shellHtml}}/>;});
function script(src:string,module=false) {
    return new Promise<void>((resolve,reject)=>{const node=document.createElement('script');node.src=src;node.type=module?'module':'text/javascript';node.onload=()=>resolve();node.onerror=()=>reject(new Error('The Gearwell room could not load. Refresh to retry.'));document.body.appendChild(node);});
}
export function GearwellShell(props:Props) {
    const [slots,setSlots]=useState<HTMLElement[]>([]),[ready,setReady]=useState(false),[roomOpen,setRoomOpen]=useState(false),[failure,setFailure]=useState('');
    const latest=useRef(props);latest.current=props;
    const starting=useRef(false),programmatic=useRef(false);
    useEffect(()=>{setSlots(['gearwell-setup-slot','gearwell-session-slot','gearwell-report-slot'].map(id=>document.getElementById(id)!));},[]);
    useEffect(()=>{
        if(!slots.length||starting.current)return;starting.current=true;
        void (async()=>{
            for(const src of ['gears','gate-audio','interview','gate'])await script(`/assets/${src}.js`);
            await script('/assets/avatar.js',true);
            setReady(true);latest.current.onReady();
        })().catch(e=>setFailure(e.message));
    },[slots]);
    useEffect(()=>{
        const open=()=>setRoomOpen(true);
        const close=()=>{setRoomOpen(false);if(!programmatic.current&&latest.current.stage==='studio')latest.current.onCancel();};
        document.addEventListener('gearwell:interview-started',open);
        document.addEventListener('gearwell:interview-ended',close);
        document.addEventListener('gearwell:gate-cancelled',close);
        return()=>{document.removeEventListener('gearwell:interview-started',open);document.removeEventListener('gearwell:interview-ended',close);document.removeEventListener('gearwell:gate-cancelled',close);};
    },[]);
    useEffect(()=>{
        if(!ready)return;
        if(props.stage==='studio'){window.GearwellGate?.start();return;}
        programmatic.current=true;
        if(window.GearwellGate?.busy)window.GearwellGate.cancel();
        window.GearwellInterview?.cancel({restoreFocus:false});
        window.GearwellSpeech?.stop();setRoomOpen(false);
        document.getElementById('landing-view')!.hidden=props.stage!=='setup';
        document.getElementById('gearwell-report-slot')!.hidden=props.stage!=='review';
        programmatic.current=false;
        if(props.stage==='review')window.scrollTo(0,0);
    },[props.stage,ready]);
    return <><GearwellMarkup/>{failure&&<p role="alert" className="error-banner">{failure}</p>}{slots.length>0&&<>{createPortal(props.setup,slots[0])}{roomOpen&&props.stage==='studio'&&createPortal(props.session,slots[1])}{props.stage==='review'&&createPortal(props.report,slots[2])}</>}</>;
}
