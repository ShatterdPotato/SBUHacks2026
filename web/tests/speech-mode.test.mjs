import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';

test('quick and accurate speech modes use local Tiny/Base models and preserve word timestamps',async()=>{
 const calls=[],messages=[],inferences=[];
 const worker={postMessage:message=>messages.push(message)};
 const output={chunks:[{text:'recorded words',timestamp:[.2,1.4]}]};
 const pipeline=async(task,model,options)=>{calls.push({task,model,device:options.device,dtype:options.dtype});return async(audio,settings)=>{inferences.push({audio,settings});return output;};};
 const code=transformSync(readFileSync(new URL('../lib/speech.worker.ts',import.meta.url),'utf8'),{loader:'ts',format:'cjs'}).code;
 vm.runInNewContext(code,{self:worker,require:()=>({pipeline,env:{backends:{onnx:{wasm:{}}}}}),Float32Array});
 await worker.onmessage({data:{id:1,type:'warm',speechMode:'quick'}});
 await worker.onmessage({data:{id:2,type:'transcribe',audio:new Float32Array(16000)}});
 assert.equal(calls[0].model,'Xenova/whisper-tiny.en');assert.equal(calls[0].device,'wasm');assert.equal(inferences[0].settings.return_timestamps,'word');assert.deepEqual(messages.at(-1).output,output);
 await worker.onmessage({data:{id:3,type:'warm',speechMode:'accurate'}});
 assert.equal(calls[1].model,'Xenova/whisper-base.en');assert.equal(calls[1].dtype,'q8');assert.equal(messages.at(-1).type,'ready');
});
