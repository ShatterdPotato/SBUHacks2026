import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from '../lib/service.mjs';
import { RUBRIC_VERSION, scoreContentRubric, distinctFeedback } from '../lib/content-rubric.mjs';
import { reviewKnowledge, knowledgeScore } from '../lib/knowledge.mjs';
import { localFollowup, localNextQuestion } from '../lib/conversation.mjs';
import { personalQuestionRequest } from '../lib/resume-profile.mjs';
import { rubricFixture } from './fixtures/grading.mjs';

const env={AI_PROVIDER:'gemini',GEMINI_API_KEY:'test-only',GEMINI_DATA_POLICY:'unpaid'};
const answer='I would split the training data before fitting preprocessing because fitting it on the test set leaks information.';
const question={prompt:'How would you prevent data leakage in model evaluation?',focus:['split','training']};
const consent={providerConsent:'gemini',cloudConsent:true,demoDataOnly:true,privacyMode:'fictional',nonSensitiveConsent:true};
const body={...consent,role:'AI/ML engineering',question,answer,history:[],interview:{profile:{roleFamily:'AI/ML engineering',skills:['Data leakage','Model evaluation']},type:'Technical',level:'Experienced',topicIndex:0,targetTopics:3,nextAction:'transition'}};
const request=(route,value)=>new Request(`https://cadence.test/api/${route}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
const output=data=>Response.json({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(data)}]}]});
const feedback=(text=answer)=>({summary:'**The split is appropriate; validation is incomplete.** Explain how you detect duplicate records across the boundary.',strengths:['**Clear ordering:** You place splitting before preprocessing.'],improvements:['**Check duplicates:** Describe how you detect overlapping records before trusting evaluation.'],evidence:[text],visual:[],rubric:rubricFixture(text),checks:[]});
const nextQuestion={prompt:'How would your validation change if the same customer appeared in both splits?',category:'Technical',focus:['groups','split'],anchorQuote:'fitting it on the test set leaks information.'};
const turn=(text=answer)=>({feedback:feedback(text),nextQuestion,checks:[]});

test('conversation setup generates just an opener while retaining requested interview settings',async()=>{
    const payload=personalQuestionRequest({profile:{roleFamily:'AI/ML engineering',skills:['Data leakage']},count:6,type:'Technical',level:'Experienced',provider:'gemini',cloudConsent:true,format:'conversation'});
    const result=await handleApi(request('questions',payload),env,async(_,options)=>{
        const sent=JSON.parse(options.body);assert.match(sent.input[0].text,/ONE.*opening question/);assert.match(sent.input[0].text,/following questions.*after each answer/);
        assert.ok(!sent.system_instruction.includes('MANDATORY RUBRIC'));
        return output({questions:[{prompt:'What makes you trust a model evaluation result?',category:'Technical',focus:['evaluation']}]});
    });
    assert.equal(result.status,200);assert.equal((await result.json()).questions.length,1);
});

test('a new main question is generated from answer, role, selected topics and recent history',async()=>{
    const result=await handleApi(request('interview-turn',{...body,history:[{question:'What was your first check?',answer:'I reviewed class balance.',resume:'DO NOT FORWARD'}],resume:'DO NOT FORWARD'}),env,async(_,options)=>{
        const sent=JSON.parse(options.body),context=JSON.parse(sent.input[0].text);
        assert.equal(context.interview.nextAction,'transition');assert.equal(context.interview.type,'Technical');assert.equal(context.interview.level,'Experienced');
        assert.deepEqual(context.interview.profile.skills,['Data leakage','Model evaluation']);
        assert.equal(context.transcript,answer);assert.equal(context.history[0].answer,'I reviewed class balance.');
        assert.ok(!JSON.stringify(sent).includes('DO NOT FORWARD'));assert.match(sent.system_instruction,/MANDATORY RUBRIC/);assert.match(sent.system_instruction,/cadence-content-v3/);
        return output(turn());
    });
    assert.equal(result.status,200);const data=await result.json();assert.equal(data.nextQuestion.prompt,nextQuestion.prompt);assert.equal(data.nextQuestion.source,'generated');assert.equal(data.nextQuestion.anchorQuote,nextQuestion.anchorQuote);
    assert.equal(data.analysis.grading.version,RUBRIC_VERSION);
});

test('invented quotation, repeated question and overlong next question are rejected',async()=>{
    for(const patch of [{anchorQuote:'a line never said'},{prompt:question.prompt},{prompt:Array(46).fill('word').join(' ')},{category:'Behavioral'}]){
        const result=await handleApi(request('interview-turn',body),env,async()=>output({...turn(),nextQuestion:{...nextQuestion,...patch}}));
        assert.equal(result.status,502);
    }
});

test('invalid context fields or injected skill labels never reach Gemini',async()=>{
    for(const patch of [{resume:'raw private source'},{profile:{roleFamily:'AI/ML engineering',skills:['PRIVATE PROJECT NAME']}},{profile:{roleFamily:'Retail cashier / customer service',skills:[]}},{targetTopics:40},{topicIndex:9},{nextAction:'read preset slate'}]){
        const result=await handleApi(request('interview-turn',{...body,interview:{...body.interview,...patch}}),env,()=>assert.fail('Must not call provider'));
        assert.equal(result.status,400);
    }
});

test('both grading routes fail closed for an omitted or stale rubric',async()=>{
    for(const rubric of [undefined,{version:'old-rubric',criteria:[]}]){
        const f={...feedback(),rubric};
        const analyze=await handleApi(request('analyze',{...consent,question,answer,mode:'live'}),env,async()=>output(f));
        const conversational=await handleApi(request('interview-turn',body),env,async()=>output({...turn(),feedback:f}));
        assert.equal(analyze.status,502);assert.equal(conversational.status,502);
    }
});

test('individual feedback includes the complete rubric on every retry',async()=>{
    let calls=0;
    const result=await handleApi(request('analyze',{...consent,question,answer,mode:'live'}),env,async(_,options)=>{
        const sent=JSON.parse(options.body);assert.match(sent.system_instruction,/MANDATORY RUBRIC/);
        const embedded=JSON.parse(sent.system_instruction.split('MANDATORY RUBRIC:\n')[1]);
        assert.equal(embedded.version,RUBRIC_VERSION);assert.deepEqual(embedded.criteria.map(c=>c.weight),[25,30,25,20]);
        assert.equal(embedded.criteria[0].anchors.length,5);assert.equal(sent.store,false);
        return ++calls===1?new Response('transient',{status:503}):output(feedback());
    });
    assert.equal(result.status,200);assert.equal(calls,2);
});

test('weighted content totals are computed by the server, with an off-topic cap',()=>{
    const grade=scoreContentRubric(rubricFixture(answer,[4,2,1,3]),answer,{checks:[]});
    assert.equal(grade.score,61);assert.equal(grade.criteria[1].weight,30);
    const irrelevant=scoreContentRubric(rubricFixture(answer,[0,4,4,4]),answer,{checks:[]});
    assert.equal(irrelevant.uncappedScore,75);assert.equal(irrelevant.score,20);
});

test('fabricated criterion evidence and duplicate/missing criterion IDs cannot produce a grade',()=>{
    const evidence=rubricFixture('invented quotation');
    assert.throws(()=>scoreContentRubric(evidence,answer,{checks:[]}),/evidence/);
    const repeated=rubricFixture(answer);repeated.criteria[3].id='relevance';
    assert.throws(()=>scoreContentRubric(repeated,answer,{checks:[]}),/evidence/);
});

test('critical arithmetic overrides model praise and caps content independently of criterion ratings',async()=>{
    const q={prompt:'An order costs $8.65 and the customer pays $20. What change is due?',focus:[]};
    const a='I would return $10.35 and carefully count it for the customer.';
    const result=await handleApi(request('analyze',{...consent,question:q,answer:a,mode:'live'}),env,async()=>output({...feedback(a),rubric:rubricFixture(a,[4,4,4,4]),summary:'Everything is correct.'}));
    const data=await result.json();assert.equal(data.scores.content,25);assert.equal(data.scores.comprehension,0);assert.equal(data.grading.uncappedScore,100);assert.match(data.summary,/factual error/i);
});

test('partial support earns partial accuracy only with a literal supplied reference excerpt',()=>{
    const a='Tuples are immutable but they cannot hold a list.';
    const c={quote:'Tuples are immutable but they cannot hold a list.',status:'partially_supported',explanation:'Tuple item assignment is immutable, but mutable objects can be contained.',referenceId:'python-sequences',referenceExcerpt:'Tuples are immutable sequences, but may contain mutable objects.',severity:'major'};
    const knowledge=reviewKnowledge('Explain Python tuples.',a,[c]);assert.equal(knowledgeScore(knowledge),50);
    assert.equal(knowledgeScore(reviewKnowledge('Explain Python tuples.',a,[{...c,referenceExcerpt:'a source passage that does not exist'}])),null);
});

test('accuracy caps prevent many supported minor details from hiding a major or critical error',()=>{
    const correct=Array.from({length:10},()=>({status:'supported',severity:'minor'}));
    assert.equal(knowledgeScore({checks:[...correct,{status:'contradicted',severity:'major'}]}),59);
    assert.equal(knowledgeScore({checks:[...correct,{status:'contradicted',severity:'critical'}]}),25);
    assert.equal(knowledgeScore({checks:[{status:'unverified',severity:'major'}]}),null);
});

test('unsupported achievements never acquire factual credit and repeated claim quotes do not inflate it',()=>{
    const story='I improved sales by 900 percent in my fictional project.';
    const unverifiable=reviewKnowledge('Tell me about your work.',story,[{quote:story,status:'supported',referenceId:'made-up',referenceExcerpt:'a made-up source',explanation:'Not grounded.',severity:'minor'}]);
    assert.equal(knowledgeScore(unverifiable),null);
    const a='Lists are mutable.';
    const check={quote:a,status:'supported',referenceId:'python-sequences',referenceExcerpt:'Lists are mutable.',explanation:'The supplied reference supports this.',severity:'major'};
    assert.equal(reviewKnowledge('Explain Python lists.',a,[check,check,{...check,quote:'mutable.'}]).checks.length,1);
});

test('unrelated model prose cannot override evidence-based feedback and emphasis',async()=>{
    const f={...feedback(),summary:'Check for duplicate records before trusting the evaluation.',improvements:['Explain why grouping customers matters to this split.','**Explain why grouping customers matters to this split.**'],strengths:['Explain why grouping customers matters to this split.']};
    const result=await handleApi(request('analyze',{...consent,question,answer,mode:'live'}),env,async()=>output(f));
    const data=await result.json();assert.ok(data.improvements.length>0);assert.ok(data.strengths.length>0);assert.ok(!JSON.stringify(data.improvements).includes('grouping customers matters'));assert.match(data.summary,/\*\*.+\*\*/);assert.match(data.improvements[0],/\*\*.+\*\*/);
    assert.equal(distinctFeedback(['Same recommendation.','**Same recommendation.**']).length,1);
});

test('finishing grades the last answer without requiring another question',async()=>{
    const result=await handleApi(request('interview-turn',{...body,interview:{...body.interview,nextAction:'finish',topicIndex:2}}),env,async()=>output({...turn(),nextQuestion:{...nextQuestion,prompt:'',anchorQuote:''}}));
    assert.equal(result.status,200);const data=await result.json();assert.equal(data.nextQuestion.prompt,'');assert.equal(data.analysis.grading.version,RUBRIC_VERSION);
});

test('bounded previous feedback prevents repeating the same advice on a later response',async()=>{
    const repeated='**Refine answers the question:** Add a concrete relevance detail that addresses this question.';
    const f={...feedback(),improvements:[repeated,'Name the observation that would invalidate the final evaluation.']};
    const result=await handleApi(request('interview-turn',{...body,history:[{question:'What changed?',answer:'I grouped the records.',feedback:[repeated]}]}),env,async(_,options)=>{
        assert.match(JSON.parse(options.body).input[0].text,/concrete relevance detail/);return output({...turn(),feedback:f});
    });
    const data=await result.json();assert.ok(data.analysis.improvements.length>0);assert.ok(data.analysis.improvements.every(v=>!v.includes(repeated)));
    const invalid=await handleApi(request('interview-turn',{...body,history:[{question:'q',answer:'a',feedback:Array(5).fill('too much')}]}),env,()=>assert.fail('Must not call provider'));
    assert.equal(invalid.status,400);
});

test('local fallback probes quote actual wording and selects a fresh role-appropriate next angle',()=>{
    const line='I would ask my supervisor to check the payment before taking it again.';
    assert.ok(localFollowup({prompt:'A payment failed.'},line).includes(line));
    const previous=['An order costs $8.65 and the customer gives you $20. How much change is due, and how would you check it?'];
    const next=localNextQuestion({role:'cashier',type:'Technical',index:3,previous,answer:line});
    assert.ok(!previous.includes(next.prompt));assert.ok(!/model|Python|circuit/i.test(next.prompt));assert.equal(next.anchorQuote,line);
});
