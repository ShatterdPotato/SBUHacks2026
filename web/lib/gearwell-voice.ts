// All spoken interviewer lines share the imported ElevenLabs/VRM controller.
declare global {
    interface Window {
        GearwellSpeech?:{speak:(text:string,options?:{emotion?:string})=>Promise<unknown>;stop:()=>void;phase:string;busy:boolean};
        GearwellInterview?:{open:(options?:{role?:string})=>void;cancel:(options?:{restoreFocus?:boolean})=>void;focus:()=>void;setIntervieweeStream:(stream:MediaStream|null)=>Promise<void>;speak:(text:string,options?:{emotion?:string})=>Promise<unknown>;active:boolean};
        GearwellGate?:{start:()=>void;cancel:()=>void;busy:boolean};
    }
}
export function stopInterviewerVoice(){window.GearwellSpeech?.stop();}
export async function speakInterviewLine(text:string,consent:boolean){
    if(!consent)throw new Error('Enable ElevenLabs voice consent before speaking interview questions.');
    if(!window.GearwellInterview?.active)throw new Error('The interview room is not ready.');
    await window.GearwellInterview.speak(text,{emotion:'neutral'});
}
export function attachInterviewCamera(stream:MediaStream|null){
    if(window.GearwellInterview?.active)void window.GearwellInterview.setIntervieweeStream(stream);
}
