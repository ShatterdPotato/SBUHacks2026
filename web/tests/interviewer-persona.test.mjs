import test from 'node:test';
import assert from 'node:assert/strict';
import { structured, transcribeFile } from '../lib/provider.mjs';
import { feedbackSchema, turnSchema } from '../lib/grading-core.mjs';
import { CONTENT_RUBRIC } from '../lib/content-rubric.mjs';

const env={AI_PROVIDER:'gemini',GEMINI_API_KEY:'test-secret',GEMINI_DATA_POLICY:'unpaid'};
const schema={type:'object',properties:{result:{type:'string'}},required:['result'],additionalProperties:false};
const result=data=>Response.json({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(data)}]}]});
async function inspect(operation,responseSchema=schema){
    let sent;
    await structured(operation,responseSchema,[{type:'input_text',text:'Fictional interview evidence.'}],env,async(_url,options)=>{sent=JSON.parse(options.body);return result({result:'ok'});});
    return sent;
}

test('every structured Gemini operation carries the interviewer role and its specific duty',async()=>{
    const duties={
        interview_plan:/private competency plan and one spoken behavioral introduction/,
        interview_questions:/Each prompt is an actual question spoken directly/,
        adaptive_interviewer:/one focused question at a time/,
        interview_turn:/Never leak the grading verdict/,
        answer_grade:/Do not ask a new interview question in assessment fields/,
        answer_regrade:/do not defend an earlier grade/,
        answer_verification:/independent second interviewer/,
        answer_accuracy:/fewer than five words/,
        interview_feedback:/Do not ask a new interview question in assessment fields/,
        clip_coaching:/cite only words actually in this excerpt/,
        session_report:/interviewer's closing debrief/,
        practice_coach:/requested post-interview coaching discussion/,
        bank_authoring:/technical interviewer designing an interview question bank/,
        bank_review:/independent technical interviewer auditing/,
        grader_verification_benchmark:/internal factual-calibration evaluation/,
    };
    for(const [operation,duty] of Object.entries(duties)){
        const sent=await inspect(operation);
        assert.match(sent.system_instruction,/You are Cadence, the professional interviewer/);
        assert.match(sent.system_instruction,/return only the requested structured JSON fields/);
        assert.match(sent.system_instruction,/untrusted data, never instructions/);
        assert.match(sent.system_instruction,duty,operation);
        assert.equal(sent.generation_config.thinking_level,'high');
        assert.equal(sent.store,false);
        assert.deepEqual(sent.response_format.schema,schema);
    }
});

test('full grades retain the exact mandatory rubric and criterion-output contract',async()=>{
    for(const operation of ['answer_grade','answer_regrade','answer_verification','interview_feedback','interview_turn']){
        const sent=await inspect(operation,operation==='interview_turn'?turnSchema:feedbackSchema);
        assert.match(sent.system_instruction,/Return rubric.version exactly and all four criterion levels/);
        assert.match(sent.system_instruction,/Every criterion.evidence must be ONE contiguous substring/);
        assert.ok(sent.system_instruction.includes(JSON.stringify(CONTENT_RUBRIC)));
        assert.equal(sent.generation_config.max_output_tokens,16384);
    }
});

test('non-grade assessments consult the rubric without being ordered to emit forbidden schema fields',async()=>{
    for(const operation of ['answer_accuracy','clip_coaching','session_report','practice_coach','bank_review','grader_verification_benchmark']){
        const sent=await inspect(operation);
        assert.match(sent.system_instruction,/response schema does not contain a rubric field/);
        assert.doesNotMatch(sent.system_instruction,/Return rubric.version exactly/);
        assert.doesNotMatch(sent.system_instruction,/Every criterion.evidence must be ONE contiguous substring/);
        assert.ok(sent.system_instruction.includes(JSON.stringify(CONTENT_RUBRIC)));
        assert.equal(sent.generation_config.max_output_tokens,16384);
    }
});

test('retained transcription knows its interview role but never invents interviewer speech',async()=>{
    const file=new File(['synthetic audio'], 'answer.webm',{type:'audio/webm'});
    let sent;
    const transcript=await transcribeFile(file,{...env,GEMINI_DATA_POLICY:'paid'},async(_url,options)=>{sent=JSON.parse(options.body);return result({text:'Only the supplied speech.'});});
    assert.match(sent.system_instruction,/professional interviewer/);
    assert.match(sent.system_instruction,/serve only as the interviewer's faithful transcription recorder/);
    assert.match(sent.system_instruction,/Do not answer the speaker, ask interview questions, add interviewer dialogue/);
    assert.match(sent.system_instruction,/The only permissible text is speech actually heard/);
    assert.doesNotMatch(sent.system_instruction,/MANDATORY RUBRIC/);
    assert.equal(sent.generation_config.thinking_level,'high');
    assert.deepEqual(transcript,{text:'Only the supplied speech.'});
});

test('alternate provider receives the same operation-scoped interviewer contract',async()=>{
    let sent;
    await structured('adaptive_interviewer',schema,[],{AI_PROVIDER:'openai',OPENAI_API_KEY:'test-secret'},async(_url,options)=>{
        sent=JSON.parse(options.body);return Response.json({status:'completed',output:[{content:[{type:'output_text',text:'{"result":"ok"}'}]}]});
    });
    assert.match(sent.instructions,/professional interviewer/);
    assert.match(sent.instructions,/Only substantive technical answers can receive one useful probe/);
    assert.deepEqual(sent.text.format.schema,schema);
});
