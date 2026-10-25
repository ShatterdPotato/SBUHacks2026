import { rubricAnalysis, setupInput, retrieveQuestions } from './interview.mjs';
import { localKnowledge, withKnowledge } from './knowledge.mjs';
import { feedbackFromGrading } from './content-rubric.mjs';
import { localGrading } from './local-grading.mjs';
import { questionKind, canFollowUp } from './question-kind.mjs';
import { freshQuestions } from './question-variety.mjs';
export function answerAnchor(answer, max = 140) {
    const sentence = answer.trim().split(/(?<=[.!?])\s+/).find(s=>s.length>=12) ?? answer.trim();
    return sentence.length <= max ? sentence : sentence.slice(0,max).replace(/\s+\S*$/, '');
}
export function localTurn(question, answer, duration, recorded, assessmentMode='legacy') {
    const baseline = rubricAnalysis({ question, answer, duration, recorded });
    const kind = questionKind(question);
    const knowledge = assessmentMode==='content'?{checks:[],references:[],coverage:'Content practice rubric; no separate factual score.'}:kind.category === 'Behavioral' ? {checks:[],references:[],coverage:'Behavioral response: technical accuracy is not graded. Personal experiences remain unverified.'} : localKnowledge(question,answer);
    baseline.questionKind = kind;
    if (baseline.metrics.words >= 5) {
        const grading = localGrading(question,answer,knowledge);
        Object.assign(baseline,{grading,...feedbackFromGrading(grading),scores:{...baseline.scores,content:grading.score}});
    }
    const result=withKnowledge(baseline, knowledge);
    return assessmentMode==='content'?{...result,assessmentMode,knowledge:undefined,scores:{...result.scores,comprehension:null}}:result;
}
export function localFollowup(question, answer) {
    if (!canFollowUp(question)) return '';
    if (!answer.trim()) return 'Could you talk me through how you would approach that situation?';
    const line = answerAnchor(answer, 90);
    if (!/\b(because|reason|why)\b/i.test(answer)) return `You mentioned “${line}”. What led you to choose that approach?`;
    if (!/\b(result|outcome|learn|check|verify|confirm)\w*/i.test(answer)) return `How would you check whether the approach you just described actually worked?`;
    return `What would make you reconsider the approach you just described?`;
}
/** @param {{role:string,type?:string,level?:string,index?:number,previous?:string[],answer?:string}} input */
export function localNextQuestion({ role, type = 'Mixed', level = 'Internship', index = 1, previous = [], answer = '' }) {
    const focus = type === 'Mixed' ? index % 2 ? 'Technical' : 'Behavioral' : type;
    const pool = retrieveQuestions(setupInput({role,type:focus,level,count:6}),{previous});
    const fresh = freshQuestions(pool,previous);
    const candidate = (fresh.length ? fresh : pool)[0];
    return {...candidate,anchorQuote:index % 3 === 0 ? answerAnchor(answer) : '',source:'curated'};
}
