import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/assets/interview.js',import.meta.url),'utf8');
function room(){
 const events=[],nodes=new Map();
 const parent={insertBefore(){}};
 const node=()=>({parentElement:parent,nextSibling:null,dataset:{},hidden:true,srcObject:null,textContent:'',append(){},pause(){},async play(){},setAttribute(){},addEventListener(){},focus(){}});
 const document={querySelector(selector){if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);},dispatchEvent(event){events.push(event.type);}};
 const window={scrollX:0,scrollY:0,scrollTo(){},addEventListener(){},GearwellAudio:{stop(){}},GearwellSpeech:{speak:async text=>text}};
 vm.runInNewContext(source,{window,document,Event});
 return {api:window.GearwellInterview,nodes,events};
}
test('Room reuses the authorized camera and stops it on cancellation',async()=>{
 const r=room();let stops=0;const stream={getTracks:()=>[{stop(){stops++;}}]};
 await assert.rejects(r.api.setIntervieweeStream(stream),/Open an interview/);
 r.api.open({role:'Digital logic engineer'});
 await r.api.setIntervieweeStream(stream);await r.api.setIntervieweeStream(stream);
 assert.equal(stops,0);assert.equal(r.nodes.get('#interviewee-video').srcObject,stream);
 assert.equal(r.nodes.get('#interviewee-video').hidden,false);
 r.api.cancel();assert.equal(stops,1);assert.equal(r.nodes.get('#interviewee-video').srcObject,null);
 assert.equal(r.api.active,false);assert.ok(r.events.includes('gearwell:interview-ended'));
});
test('Room speaks only during an active interview and can reopen cleanly',async()=>{
 const r=room();await assert.rejects(r.api.speak('Hello'),/Start an interview/);
 r.api.open({role:'AI engineer'});assert.equal(await r.api.speak('Explain overfitting.'),'Explain overfitting.');
 r.api.cancel();r.api.open({role:'Hardware engineer'});assert.equal(r.nodes.get('#room-role').textContent,'Hardware engineer');assert.equal(r.api.active,true);
});
