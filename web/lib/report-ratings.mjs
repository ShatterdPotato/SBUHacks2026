import {questionKind} from './question-kind.mjs';
const mean=values=>values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):null;
const finite=value=>typeof value==='number'&&Number.isFinite(value);
export function reportRatings(answers){
 const substantive=answers.filter(t=>t.transcript?.trim()&&t.transcriptSource!=='skipped');
 const clarity=substantive.flatMap(t=>{const c=t.analysis.grading?.criteria.filter(c=>['relevance','completeness'].includes(c.id));return c?.length===2?[mean(c.map(c=>c.level*25))]:[];});
 const technical=substantive.filter(t=>questionKind(t.question).category==='Technical');
 const values=[mean(clarity),mean(substantive.filter(t=>t.hasRecording).map(t=>t.delivery?.score??t.analysis.scores.confidence).filter(finite)),mean(technical.map(t=>t.analysis.scores.content).filter(finite))];
 return [
  {id:'clarity',label:'Clarity',score:values[0],description:'Focus and completeness of your answers',basis:'Average of relevance and completeness rubric levels. Unassessed answers are excluded.'},
  {id:'confidence',label:'Confidence',score:values[1],description:'Observable delivery, not feelings',basis:'Local delivery estimate from available recording cues. Text-only answers are excluded. Optional eye-contact estimates and tracking coverage appear in each recorded answer’s evidence; gaze has no score weight pending camera validation.'},
  {id:'knowledgeability',label:'Knowledgeability',score:values[2],description:'Technical understanding and reasoning',basis:'Technical content rubric only. Behavioral answers are excluded. No separate factual-accuracy score.'},
 ];
}
