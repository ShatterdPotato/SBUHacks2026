import ml from '../data/question-bank/ai-ml.json' with { type:'json' };
import software from '../data/question-bank/software.json' with { type:'json' };
import hardware from '../data/question-bank/hardware.json' with { type:'json' };
import logic from '../data/question-bank/digital-logic.json' with { type:'json' };
import sources from '../data/question-bank/sources.json' with { type:'json' };
import { executableQuestions } from './verified-exercises.mjs';
import { shuffled, freshQuestions, secureRandom } from './question-variety.mjs';
export const BANK_SOURCES = sources;
export const TECHNICAL_BANK = [...ml,...software,...hardware,...logic,...executableQuestions];
const byId = new Map(TECHNICAL_BANK.map(q=>[q.id,q]));
export const bankEntry = id => byId.get(id);
export function trackFor(role='') {
 if (/digital logic|logic design|fpga|verilog|vhdl/i.test(role)) return 'digital-logic';
 if (/hardware|electrical|embedded|computer architecture|vlsi/i.test(role)) return 'hardware';
 if (/\bai\b|\bml\b|machine learning|data scien/i.test(role)) return 'ai-ml';
 if (/software|developer|programmer|python|javascript/i.test(role)) return 'software';
 return null;
}
export function publicQuestion(q) {
 return {id:q.id,bankId:q.id,prompt:q.prompt,category:'Technical',focus:[q.competency],source:'bank',level:q.level,track:q.track,reviewStatus:q.review.status,...(q.checker?{answerFormat:q.checker.format}:{})};
}
export function sampleBank(role,level='Internship',count=6,previous=[],excludedIds=[],random=secureRandom) {
 const track=trackFor(role); if(!track)return [];
 const pool=shuffled(TECHNICAL_BANK.filter(q=>q.track===track&&!excludedIds.includes(q.id)),random);
 const exact=pool.filter(q=>q.level===level);
 const order=['Internship','Entry level','Experienced'];
 const eligible=exact.length>=count?exact:[...exact,...pool.filter(q=>q.level!==level&&order.indexOf(q.level)<order.indexOf(level))];
 const fresh=freshQuestions(eligible,previous);
 const selected=[], topics=new Set();
 for(const q of [...fresh,...eligible]) {
   if(selected.length>=count)break;
   if(!topics.has(q.competency)&&!selected.some(x=>x.id===q.id)){selected.push(q);topics.add(q.competency);}
 }
 for(const q of fresh)if(selected.length<count&&!selected.some(x=>x.id===q.id))selected.push(q);
 return selected.map(publicQuestion);
}
export function bankReference(question) {
 const q=bankEntry(question?.bankId); if(!q)return [];
 return [{id:`key:${q.id}`,title:`Cadence answer key: ${q.competency} (${q.review.status})`,text:[q.answerKey,...q.essentialFacts,...q.acceptableAlternatives].join('\n'),url:'',reviewStatus:q.review.status,furtherReading:q.sourceIds.map(id=>sources.find(s=>s.id===id)).filter(Boolean).map(s=>({title:s.title,url:s.url}))}];
}
export function coverageSchedule(type,count,random=secureRandom) {
 const technical=type==='Technical'?count:type==='Behavioral'?0:Math.ceil(count/2);
 return shuffled([...Array(technical).fill('Technical'),...Array(count-technical).fill('Behavioral')],random);
}
