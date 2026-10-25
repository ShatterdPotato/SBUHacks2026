import { bankEntry } from './technical-bank.mjs';
import { InputError, text } from './interview.mjs';
import { CONTENT_RUBRIC, distinctFeedback, scoreContentRubric, feedbackFromGrading } from './content-rubric.mjs';
import { questionKind } from './question-kind.mjs';
import { reviewKnowledge, withKnowledge } from './knowledge.mjs';
export const string = { type: 'string' };
export const strings = { type: 'array', items: string };
export const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
export const questionSchema = object({ questions: { type: 'array', items: object({ prompt: string, category: { type: 'string', enum: ['Behavioral', 'Technical'] }, focus: strings }) } });
export const rubricSchema = object({ version: string, criteria: { type:'array', items:object({ id:{type:'string',enum:CONTENT_RUBRIC.criteria.map(c=>c.id)}, level:{type:'integer',minimum:0,maximum:4}, evidence:string, reason:string, improvement:string }) } });
export const checkSchema = { type:'array', items:object({ quote:string, status:{type:'string',enum:['supported','partially_supported','contradicted','unverified']}, explanation:string, referenceId:string, referenceExcerpt:string, severity:{type:'string',enum:['minor','major','critical']} }) };
export const feedbackFields = { summary:string, strengths:strings, improvements:strings, evidence:strings, visual:strings, rubric:rubricSchema };
export const feedbackSchema = object({ ...feedbackFields, checks:checkSchema });
export const nextQuestionSchema = object({ prompt:string, category:{type:'string',enum:['Behavioral','Technical']}, focus:strings, anchorQuote:string });
export const turnSchema = object({ feedback:object(feedbackFields), nextQuestion:nextQuestionSchema, checks:checkSchema });
export function gradedAnalysis(feedback, answer, baseline, knowledge, visuals = false, previousFeedback = []) {
    if (!feedback || typeof feedback.summary !== 'string' || !feedback.summary.trim() || feedback.summary.length > 3000 || !['strengths','improvements','evidence','visual'].every(k => Array.isArray(feedback[k]) && feedback[k].length <= 12 && feedback[k].every(v => typeof v === 'string' && v.length <= 2000))) throw new InputError('AI feedback was incomplete. Continue locally or retry.', 502);
    const grading = scoreContentRubric(feedback.rubric, answer, knowledge, baseline.questionKind);
    const grounded = feedbackFromGrading(grading,previousFeedback);
    return withKnowledge({ ...baseline, mode:'live', grading, scores:{...baseline.scores,content:grading.score}, ...grounded, evidence:distinctFeedback(grading.criteria.map(c=>c.evidence).filter(Boolean),[],3), visual:visuals ? distinctFeedback(feedback.visual) : [], limitation:'Rubric-based AI coaching is provisional. Behavioral responses are excluded from technical scores. Reference-limited factual accuracy and local delivery measurements are separate.' },knowledge);
}
export function readQuestion(value) {
    const question = {prompt:text(value?.prompt,'Question',1200),focus:value?.focus??[],category:value?.category};
    if (!question.prompt || (question.category!==undefined&&!['Technical','Behavioral'].includes(question.category)) || !Array.isArray(question.focus)||question.focus.length>12||!question.focus.every(v=>typeof v==='string'&&v.length<=100)) throw new InputError('Include a valid question, category and focus list.');
    const bankId = value?.bankId;
    if (bankId !== undefined && (!bankEntry(bankId) || (!value.isFollowup && !question.prompt.includes(bankEntry(bankId).prompt)))) throw new InputError('Question does not match its answer key.');
    return {...question,...questionKind({...question,purpose:value?.purpose}),...(bankId?{bankId}:{}),isFollowup:value?.isFollowup===true};
}
export const knowledgeFor = (question,answer,checks) => questionKind(question).category==='Behavioral' ? {checks:[],references:[],coverage:'Behavioral response: technical accuracy is not graded. Personal experiences remain unverified.'} : reviewKnowledge(question,answer,checks);
