export type ClipPlaybackState = {state:'loading'|'ready'|'playing'|'ended'|'error';error:string};
export function seekMedia(video:HTMLMediaElement,target:number,options?:{signal?:AbortSignal;timeoutMs?:number}):Promise<void>;
export function prepareClipRange(video:HTMLMediaElement,start:number,end:number,options?:{signal?:AbortSignal;timeoutMs?:number}):Promise<{start:number;end:number}>;
export function attachClipPlayback(video:HTMLMediaElement,start:number,end:number,onState?:(value:ClipPlaybackState)=>void):{retry:()=>Promise<void>;destroy:()=>void};
