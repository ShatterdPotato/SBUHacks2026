import fs from 'node:fs/promises';
const base=process.env.CADENCE_URL||'http://127.0.0.1:5173';
const consent={cloudConsent:true,providerConsent:'gemini',privacyMode:'fictional',demoDataOnly:true,nonSensitiveConsent:true};
const results=[];
async function post(path,body){
 const started=Date.now();const r=await fetch(`${base}/api/${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...consent,...body})});const d=await r.json();
 results.push({operation:path,status:r.status,elapsedMs:Date.now()-started,usage:d.usage,error:d.error});
 console.log(`${path}: HTTP ${r.status}`);if(!r.ok)throw new Error(d.error);return d;
}
try{
 const setup=await post('plan',{profile:{roleFamily:'AI/ML engineering',skills:['Model evaluation']},type:'Technical',level:'Internship',count:3});
 const intro=setup.questions[0],motivation='In this fictional practice I enjoy building useful tools. I would bring careful testing and data analysis skills to this role.';
 const next=await post('interviewer',{plan:setup.plan,question:intro,answer:motivation,history:[],followups:true,duration:14.748595867394});
 results.at(-1).question=next.nextQuestion.prompt;
 const introGrade=await post('grade',{question:intro,answer:motivation});
 const q={id:'smoke',bankId:'verified-ai-ml-1',prompt:'A classifier makes 24 true-positive and 6 false-positive predictions. What is its precision as a decimal?',category:'Technical',focus:['precision']};
 const answer='Precision is true positives divided by all predicted positives. There are thirty predicted positives here, so twenty four divided by thirty is 0.8. Final: 0.8';
 const grade=await post('grade',{question:q,answer});results.at(-1).accuracy=grade.scores.comprehension;results.at(-1).aiStatus=grade.aiStatus;
 const follow=await post('interviewer',{plan:setup.plan,question:q,answer:'I use the number of actual positives as the denominator for precision because I want to know how many positives were recovered.',history:[{question:intro,answer:motivation}],followups:true});results.at(-1).action=follow.nextAction;results.at(-1).question=follow.nextQuestion.prompt;
 const corrected=await post('regrade',{question:q,answer,appeal:'Please verify the precision denominator.'});
 const clips=await post('clip-feedback',{clips:[{id:'a',question:q,transcript:'Precision is true positives divided by all predicted positives.',start:0,end:6,kind:'best'},{id:'b',question:q,transcript:'I use actual positives as the denominator for precision.',start:7,end:13,kind:'worst'}]});results.at(-1).feedback=clips.clips;
 const answers=[{question:intro,answer:motivation,grading:introGrade.grading},{question:q,answer,grading:corrected.grading}];
 await post('session-report',{answers});
 await post('coach',{answers,request:'Explain precision versus recall and give two targeted exercises.'});
}catch(e){console.log(`Smoke stopped: ${e.message}`);process.exitCode=1;}
await fs.mkdir(new URL('../../outputs/premium-qa/',import.meta.url),{recursive:true});
await fs.writeFile(new URL('../../outputs/premium-qa/live-smoke.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
