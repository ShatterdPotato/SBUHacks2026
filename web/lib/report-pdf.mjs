import {jsPDF} from 'jspdf';
import {reportRatings} from './report-ratings.mjs';

// All layout and text rendering happens locally. No transcript is sent to a PDF service.
const ink='#29241d',muted='#665e51',brass='#926d2e',paper='#fbf8f1';
const clean=value=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/\r\n?/g,'\n').replace(/[≤≥≠∞∑√∈∉]/g,c=>({'≤':'<=','≥':'>=','≠':'!=','∞':'infinity','∑':'sum','√':'sqrt','∈':'in','∉':'not in'}[c]));
async function fontFile(name){
 const response=await fetch(`/fonts/NotoSans-${name}.ttf`);
 if(!response.ok)throw new Error('Report font could not load. Please retry the download.');
 const bytes=new Uint8Array(await response.arrayBuffer());let binary='';
 for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(binary);
}
export async function createInterviewPdf({role,answers,aiReport,practiceDrills,clipFeedback={},createdAt=new Date().toISOString()},options={}){
 const fonts=options.fonts??await Promise.all(['Regular','Bold'].map(fontFile));
 const doc=new jsPDF({unit:'pt',format:'letter',compress:true,putOnlyUsedFonts:true});
 fonts.forEach((data,i)=>{doc.addFileToVFS(`Noto-${i}.ttf`,data);doc.addFont(`Noto-${i}.ttf`,'Noto',i?'bold':'normal');});
 doc.setProperties({title:'Cadence | Interview practice report',subject:clean(role),author:'Cadence'});
 const left=44,width=524,bottom=728;let y=0;
 function font(size=10,bold=false,color=ink){doc.setFont('Noto',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(color);}
 function page(){if(y)doc.addPage();doc.setFillColor(paper);doc.rect(0,0,612,792,'F');font(11,true,brass);doc.text('CADENCE',left,33);font(8,false,muted);doc.text('INTERVIEW PRACTICE · PERSONAL REPORT',568,33,{align:'right'});doc.setDrawColor('#d2c5ad');doc.line(left,43,568,43);y=67;}
 function space(height){if(y+height>bottom)page();}
 function heading(value,size=17){space(size+36);y+=8;font(size,true);const lines=doc.splitTextToSize(clean(value),width);for(const line of lines){space(size+5);doc.text(line,left,y);y+=size+5;}y+=5;}
 // Measure every styled word; even very long tokens wrap within the printable area.
 function paragraph(value,{size=10,color=ink,indent=0}={}){
  const text=clean(value);const lineHeight=size*1.5;let x=left+indent,bold=false;
  space(lineHeight);font(size,false,color);
  for(const token of text.split(/(\*\*|\n|[ \t]+)/)){
   if(token==='**'){bold=!bold;continue;}if(!token)continue;
   if(token==='\n'){y+=lineHeight;space(lineHeight);x=left+indent;continue;}
   font(size,bold,color);const isSpace=/^\s+$/.test(token),word=isSpace?' ':token;
   if(x+doc.getTextWidth(word)>left+width&&x>left+indent){y+=lineHeight;space(lineHeight);x=left+indent;}
   if(isSpace&&x===left+indent)continue;
   const pieces=doc.getTextWidth(word)>width-indent?Array.from(word):[word];
   for(const piece of pieces){font(size,bold,color);const w=doc.getTextWidth(piece);if(x+w>left+width){y+=lineHeight;space(lineHeight);x=left+indent;}font(size,bold,color);doc.text(piece,x,y);x+=w;}
  }
  y+=lineHeight+7;
 }
 function section(label,values){if(!values?.length)return;space(42);paragraph(`**${label}**`,{size:10,color:brass});values.forEach(v=>paragraph(v,{indent:10}));}
 page();heading('Your interview, calibrated.',27);paragraph(clean(role)||'Interview practice',{size:13,color:muted});
 paragraph(`${new Date(createdAt).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})} · ${answers.length} saved answers`,{size:9,color:muted});
 const ratings=reportRatings(answers);space(146);const top=y;
 ratings.forEach((r,i)=>{
  const cx=left+85+i*177,cy=top+45,radius=39;
  doc.setLineWidth(7);doc.setDrawColor('#d9c9aa');
  for(let n=0;n<40;n++){const a=Math.PI+n*Math.PI/40,b=Math.PI+(n+1)*Math.PI/40;doc.line(cx+radius*Math.cos(a),cy+radius*Math.sin(a),cx+radius*Math.cos(b),cy+radius*Math.sin(b));}
  doc.setDrawColor(brass);doc.setLineWidth(1);
  for(let n=0;n<=4;n++){const a=Math.PI+n*Math.PI/4;doc.line(cx+30*Math.cos(a),cy+30*Math.sin(a),cx+36*Math.cos(a),cy+36*Math.sin(a));}
  const a=Math.PI+(r.score??0)/100*Math.PI;doc.setLineWidth(2);doc.line(cx,cy,cx+30*Math.cos(a),cy+30*Math.sin(a));doc.setFillColor(brass);doc.circle(cx,cy,4,'F');
  font(11,true);doc.text(r.label,cx,cy+22,{align:'center'});font(17,true,brass);doc.text(r.score===null?'—':`${r.score}/100`,cx,cy+46,{align:'center'});
  font(8,false,muted);doc.text(r.score===null?'Not assessed':'Practice estimate',cx,cy+62,{align:'center'});
 });y=top+126;
 paragraph('These ratings describe this practice session. They do not measure personality, feelings or hiring suitability. Missing evidence is shown as not assessed.',{size:9,color:muted});
 ratings.forEach(r=>paragraph(`**${r.label}.** ${r.basis}`,{size:9,color:muted}));
 if(aiReport){heading('What to work on next');paragraph(aiReport.summary);section('Practice priorities',aiReport.priorities);for(const p of aiReport.patterns??[])paragraph(`**Evidence:** “${p.quote}”\n${p.observation}`);}
 else paragraph('Session synthesis was not available when this report was downloaded. The saved answer reviews follow.',{size:9,color:muted});
 answers.forEach((take,index)=>{
  page();heading(`Answer ${String(index+1).padStart(2,'0')}`,23);
  const a=take.analysis,status=a.aiStatus==='complete'?'AI rubric review':a.aiStatus==='pending'?'AI review pending':a.aiStatus==='failed'?'AI review needs retry':'Local heuristic review';
  paragraph(`${take.question.category??'Interview'} · ${status} · ${Math.round(take.duration)} seconds`,{size:9,color:muted});
  paragraph(`**${take.question.prompt}**`,{size:13});
  if(a.aiStatus==='failed'||a.aiStatus==='pending')paragraph('AI grading is unfinished. Any feedback below is the local estimate; retry this answer in the website for an AI assessment.',{size:9,color:muted});
  if(take.transcriptSource==='skipped')paragraph('This question was skipped.');
  else {section('Your answer',[take.transcript||'No usable transcript was captured.']);section('Review',[a.summary]);section('What worked',a.strengths);section('What to improve',a.improvements);}
  if(a.grading?.criteria?.length){heading('Rubric evidence',14);const seen=new Set();for(const c of a.grading.criteria){space(43);paragraph(`**${c.label??c.id} · ${c.level}/4**\n${c.reason??c.justification??''}`,{size:9});if(c.evidence?.length&&!seen.has(String(c.evidence))){paragraph(`“${Array.isArray(c.evidence)?c.evidence.join('” · “'):c.evidence}”`,{size:9,color:muted});seen.add(String(c.evidence));}}}
  if(take.referenceAnswer||a.referenceAnswer)section('Reference approach',[(take.referenceAnswer||a.referenceAnswer).replace(/\$([^$]+)\$/g,'$1')]);
  if(take.delivery){section('Observed delivery',take.delivery.components.map(c=>`${c.name}: ${c.score}/100 · ${c.evidence}`));section('Recording evidence and limits',take.delivery.notes);}
  paragraph('Reference approaches are practice aids, not independent fact certification. Behavioral answers do not contribute to Knowledgeability.',{size:8,color:muted});
 });
 const clips=Object.values(clipFeedback);
 if(clips.length){page();heading('Replay notes',23);for(const c of clips){section('Excerpt',[`“${c.quote}”`]);section('What worked',[c.strength]);section('Next attempt',[c.improvement]);paragraph(c.justification,{size:9,color:muted});}}
 if(practiceDrills){page();heading('Your next practice',23);paragraph(practiceDrills.explanation);for(const [i,d] of practiceDrills.drills.entries()){heading(`Exercise ${i+1}`,14);paragraph(d.prompt);section('Suggested solution',[d.solution]);}}
 const pages=doc.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);doc.setDrawColor('#d2c5ad');doc.line(left,748,568,748);font(8,false,muted);doc.text('CADENCE · Generated locally from your saved session',left,764);doc.text(`${i} / ${pages}`,568,764,{align:'right'});}
 return doc;
}
