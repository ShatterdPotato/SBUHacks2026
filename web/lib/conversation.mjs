import { rubricAnalysis } from './interview.mjs';
import { localKnowledge, withKnowledge } from './knowledge.mjs';
export function localTurn(question, answer, duration, recorded) {
    return withKnowledge(rubricAnalysis({ question, answer, duration, recorded }), localKnowledge(question.prompt, answer));
}
export function localFollowup(question, answer) {
    if (!answer.trim()) return 'Could you talk me through how you would approach that situation?';
    if (!/\b(because|reason|why)\b/i.test(answer)) return `What is the reason for that approach, and what would you check before proceeding?`;
    if (!/\b(result|outcome|learn|check|verify|confirm)\w*/i.test(answer)) return 'How would you check whether your approach worked, and what would you change if it did not?';
    return 'What would you do differently if the situation became more difficult?';
}
