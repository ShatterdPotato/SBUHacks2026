import fs from 'node:fs/promises';
import { TECHNICAL_BANK, BANK_SOURCES, sampleBank } from '../lib/technical-bank.mjs';
import { executeCheck } from '../lib/verified-exercises.mjs';
const seen=new Set(),errors=[],summary=[];
for(const q of TECHNICAL_BANK){
 if(seen.has(q.id))errors.push(`Duplicate ID: ${q.id}`);seen.add(q.id);
 if(!q.prompt||q.prompt.length>1200||q.category!=='Technical'||!q.competency||!q.answerKey||q.answerKey.length<25)errors.push(`Invalid content: ${q.id}`);
 for(const field of ['essentialFacts','partialCredit','misconceptions','probes','sourceIds'])if(!Array.isArray(q[field])||!q[field].length||q[field].some(s=>typeof s!=='string'||!s.trim()))errors.push(`Missing ${field}: ${q.id}`);
 if(q.sourceIds.some(id=>!BANK_SOURCES.some(s=>s.id===id&&s.tracks.includes(q.track))))errors.push(`Invalid source: ${q.id}`);
 if(!['ai-reviewed','executable-verified'].includes(q.review.status))errors.push(`Invalid review status: ${q.id}`);
 if(q.checker){const value=executeCheck(q.checker);if(typeof value==='number'&&!Number.isFinite(value))errors.push(`Non-finite reference result: ${q.id}`);}
}
for(const track of ['ai-ml','software','hardware','digital-logic']){
 const rows=TECHNICAL_BANK.filter(q=>q.track===track);
 if(rows.length<100)errors.push(`${track} has fewer than 100 questions`);
 if(new Set(rows.map(q=>q.prompt.toLowerCase().replace(/\s+/g,' ').trim())).size!==rows.length)errors.push(`${track} contains duplicate prompts`);
 const levels=Object.fromEntries(['Internship','Entry level','Experienced'].map(l=>[l,rows.filter(q=>q.level===l).length]));
 if(Object.values(levels).some(n=>n<10))errors.push(`${track} lacks difficulty coverage`);
 summary.push({track,count:rows.length,competencies:new Set(rows.map(q=>q.competency)).size,levels,executable:rows.filter(q=>q.checker).length,aiReviewed:rows.filter(q=>q.review.status==='ai-reviewed').length});
}
for(const role of ['AI/ML engineering','Software engineering','Hardware engineering','Digital logic']){
 const used=[];
 for(let i=0;i<3;i++){const batch=sampleBank(role,'Entry level',6,[],used);if(batch.length!==6||batch.some(q=>used.includes(q.id)))errors.push(`Selection coverage failed: ${role}`);used.push(...batch.map(q=>q.id));}
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else{
 await fs.writeFile(new URL('../data/question-bank/manifest.json',import.meta.url),JSON.stringify({version:1,date:'2026-10-25',total:TECHNICAL_BANK.length,summary,validation:'Schema, unique prompts, source ID integrity, difficulty coverage, deterministic reference execution and no-repeat sampling passed. AI review is not human certification.'},null,2)+'\n');
 console.log(JSON.stringify(summary));
}
