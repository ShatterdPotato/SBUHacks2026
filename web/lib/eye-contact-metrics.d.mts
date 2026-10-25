export type EyeState='contact'|'away'|'blink'|'none';
export type EyeSummary={cameraGaze:number|null;faceVisible:number|null;frames:number;classified:number;coverage:number|null};
export function eyeContactSummary(samples?:{eyeContact?:EyeState}[]):EyeSummary;
