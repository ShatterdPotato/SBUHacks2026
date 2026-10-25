// Called only after the session recording is finalized. Never grade between turns.
export async function gradeSavedAnswers(takes,{request,consent,signal,onProgress=()=>{}}){
 const results=takes.map(t=>({...t,analysis:{...t.analysis}}));
 const eligible=results.map((take,index)=>({take,index})).filter(({take})=>take.cloudEligible&&take.transcript.trim()&&take.transcriptSource!=='skipped');
 let cursor=0,completed=0;onProgress({completed,total:eligible.length});
 async function worker(){
  while(cursor<eligible.length){
   const {take,index}=eligible[cursor++];
   if(signal?.aborted){take.analysis={...take.analysis,aiStatus:'failed',aiError:'Assessment stopped. Your answer is saved; retry from the report.'};continue;}
   try{
    const result=await request('/api/grade',{...consent,assessmentMode:'content',question:take.question,answer:take.transcript,duration:take.duration,recorded:take.hasRecording,visualConsent:take.gradingMedia?.consent===true,frames:take.gradingMedia?.frames??[]},signal);
    if(signal?.aborted)throw new Error('Assessment stopped. Retry from the report.');
    results[index]={...take,referenceAnswer:result.referenceAnswer??take.referenceAnswer,analysis:{...result,scores:{...result.scores,confidence:take.delivery?.score??null,comprehension:null},metrics:{...result.metrics,wpm:take.delivery?.metrics.wpm??result.metrics.wpm}}};
   }catch(error){results[index]={...take,analysis:{...take.analysis,aiStatus:'failed',aiError:error.message||'Assessment failed. Retry from the report.'}};}
   completed++;onProgress({completed,total:eligible.length});
  }
 }
 await Promise.all(Array.from({length:Math.min(2,eligible.length)},worker));
 return results.map(({gradingMedia,...take})=>take);
}
