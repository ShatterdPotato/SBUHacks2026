import type { RecordingEvidence } from './recording-coach';
import type { recordedDelivery } from './recorded-delivery.mjs';
export type Question = { id:string; prompt:string; category:string; focus:string[]; source:string };
export type Knowledge = { checks:{quote:string;status:string;explanation:string;referenceId:string}[]; references:{id:string;title:string;text:string;url:string}[];coverage:string };
export type Analysis = { mode:string;scores:{confidence:number|null;content:number|null;comprehension:number|null};metrics:{words:number;fillers:number;wpm:number|null};summary:string;strengths:string[];improvements:string[];evidence:string[];visual:string[];limitation:string;knowledge?:Knowledge };
export type Take = RecordingEvidence & {question:Question;analysis:Analysis;duration:number;hasRecording:boolean;url:string|null;mime:string;transcriptSource:'recording'|'recording-corrected'|'typed'|'skipped';delivery:ReturnType<typeof recordedDelivery>|null;recordingOffset?:number;sessionRecording?:boolean};
