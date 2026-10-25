import type {Take,Analysis} from './interview-types';
export function gradeSavedAnswers(takes:Take[],options:{request:(path:string,body:unknown,signal?:AbortSignal)=>Promise<Analysis>;consent:Record<string,unknown>;signal?:AbortSignal;onProgress?:(progress:{completed:number;total:number})=>void}):Promise<Take[]>;
