import type { Usage } from './interview-types';
const usage:Usage[]=[];
export function sessionUsage(){return [...usage];}
export function clearSessionUsage(){usage.length=0;}
export async function aiRequest<T>(path:string,body:unknown,signal?:AbortSignal):Promise<T>{
 const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},signal:signal?AbortSignal.any([signal,AbortSignal.timeout(150000)]):AbortSignal.timeout(150000),body:JSON.stringify(body)});
 const data=await response.json() as T&{error?:string;usage?:Usage[]};
 if(Array.isArray(data.usage)){usage.push(...data.usage);if(usage.length>500)usage.splice(0,usage.length-500);}
 if(!response.ok)throw new Error(data.error??'AI request failed. Your answer is preserved.');
 return data;
}
