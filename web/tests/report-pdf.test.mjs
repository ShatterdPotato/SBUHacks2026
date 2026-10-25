import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createInterviewPdf} from '../lib/report-pdf.mjs';
test('PDF retains long answers, technical notation and readable pages without recording URLs',async()=>{
 const fonts=await Promise.all(['Regular','Bold'].map(async n=>(await readFile(new URL(`../public/fonts/NotoSans-${n}.ttf`,import.meta.url))).toString('base64')));
 const transcript='The capacity invariant is n ≤ capacity. '+('A measured explanation with evidence and a boundary case. '.repeat(180))+' FINAL_SENTINEL';
 const doc=await createInterviewPdf({role:'Fictional software practice',answers:[{question:{prompt:'Explain the invariant.',category:'Technical'},transcript,transcriptSource:'typed',duration:90,url:'blob:private-recording',analysis:{mode:'local',scores:{content:50,confidence:null,comprehension:100},summary:'**Check the boundary.** Test an empty array.',strengths:[],improvements:[]}}]},{fonts});
 const loading=getDocument({data:new Uint8Array(doc.output('arraybuffer')),useSystemFonts:true});const pdf=await loading.promise;let text='';
 assert.ok(pdf.numPages>=3);
 for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),content=await page.getTextContent();text+=content.items.map(t=>t.str??'').join(' ');for(const item of content.items){if(!item.transform)continue;assert.ok(item.transform[4]>=40&&item.transform[4]+item.width<575,'Text stays within horizontal margins');assert.ok(item.transform[5]>=23&&item.transform[5]<=765,'Text stays within vertical margins');}}
 assert.match(text,/FINAL_SENTINEL/);assert.match(text,/<=/);assert.match(text,/Knowledgeability/);assert.doesNotMatch(text,/blob:private-recording/);await loading.destroy();
});
