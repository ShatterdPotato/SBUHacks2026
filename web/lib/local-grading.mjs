import { RUBRIC_VERSION, scoreContentRubric } from './content-rubric.mjs';
import { questionKind } from './question-kind.mjs';

// Conservative, inspectable fallback. A matching phrase is a cue, not proof of meaning.
export function localGrading(question, answer, knowledge) {
    const kind = questionKind(question);
    const sentences = answer.trim().split(/(?<=[.!?])\s+/);
    const quote = sentence => (sentence ?? '').slice(0,350);
    const find = pattern => quote(sentences.find(s=>pattern.test(s)));
    const first = quote(sentences[0]);
    const personal = find(/\bI (?:\w+\s+){0,3}(?:built|made|created|organized|helped|designed|learned|resolved|led|used|using|worked|asked|would|submitted)\b/i);
    const reason = find(/\b(because|so that|in order to|led me|inspired|drew me|interested|enjoy|excited|passion)\b/i);
    const skills = find(/\b(built|created|designed|implemented|organized|resolved|led|practiced|developed|wrote)\b/i);
    const check = find(/\b(test(?:ed|ing)?|verif\w*|check(?:ed|ing)?|compar\w*|measur\w*|reproduc\w*|confirm\w*)\b/i);
    const result = find(/\b(result|outcome|learned|changed|improved|resolved)\b/i);
    const focus = (question.focus ?? []).some(f=>answer.toLowerCase().includes(f.toLowerCase()));
    const values = [];
    const add = (id,level,evidence,reasonText,improvement) => values.push({id,level,evidence,reason:reasonText,improvement});
    if (kind.purpose === 'introduction') {
        const asksSkills = /\b(skill|bring|contribut|prepar|experience|background|yourself)/i.test(question.prompt);
        add('relevance',reason?3:2,reason||first,reason?'This passage explains an interest or motivation relevant to an introduction.':'This passage offers background; the connection to the requested role is not explicit in the detected wording.',reason?'Connect this specific interest directly to the work of the role.':'Name what attracts you to this role.');
        add('reasoning',reason?3:1,reason||first,reason?'The stated interest gives a reason for applying; local matching cannot judge how persuasive it is.':'The detected wording states background without a clear reason for applying.','Explain why this particular aspect of the role matters to you.');
        add('evidence',skills?3:personal?2:1,skills||personal||first,skills?'This passage names a personal action that can support a relevant skill; the experience remains unverified.':personal?'There is a personal experience, but experience using a product alone does not demonstrate a skill you can contribute.':'The excerpt supplies a general self-description rather than a concrete example of a relevant skill.',asksSkills?'Explain how this specific experience demonstrates a skill you would bring.':'Connect this specific experience to your motivation.');
        add('completeness',asksSkills&&!skills?2:3,skills||first,asksSkills&&!skills?'The prompt asks what you bring; no concrete example of applying a skill was detected.':'The response contains relevant introductory material; check that each requested point is directly covered.',asksSkills?'Finish with a specific skill and how you would use it in this role.':'Keep the answer focused on the motivation the question asks about.');
    } else if (kind.category === 'Behavioral') {
        add('relevance',focus||personal?3:2,personal||first,'This passage describes an experience or proposed action; local matching cannot confirm it answers every part of the situation.','Connect the example explicitly to the situation in the question.');
        add('reasoning',reason?3:1,reason||first,reason?'The passage gives a reason for a choice or interest.':'The detected wording describes events without an explicit explanation of your choice.','Explain what led you to that decision or what you learned.');
        add('evidence',personal?3:1,personal||first,personal?'The passage identifies your action, rather than only describing the team.':'Your individual contribution is unclear in the detected wording.','Name your own contribution and distinguish it from what others did.');
        const outcomeAsked = /\b(result|outcome|learn|change|help|reach a decision)\w*/i.test(question.prompt);
        add('completeness',outcomeAsked&&!result?2:3,result||first,outcomeAsked&&!result?'The question asks about the outcome or learning; neither is explicit in the detected wording.':'The response covers an action or reflection; check the remaining requested points.','Close the example by addressing the remaining part of the question in concrete terms.');
    } else {
        const diagnostic = /\b(error|investigat|debug|diagnos|bottleneck)\w*/i.test(question.prompt);
        const escalation = find(/\b(ticket|supervisor|IT|team|schedul)\w*/i);
        const diagnosticStep = find(/\b(reproduc\w*|logs?|isolat\w*|root cause|error message|trace)\b/i);
        add('relevance',focus||personal||check?3:2,personal||first,'This passage names a proposed step, but local matching cannot establish its suitability.','State explicitly how this step addresses the problem posed.');
        add('reasoning',reason?3:1,reason||escalation||first,reason?'A reason for a choice is stated; its technical validity still needs review.':diagnostic&&escalation?'The passage describes escalation or coordination, but does not explain how that identifies the cause.':'The passage states a step without an explicit reason for choosing it.',diagnostic?'Explain what evidence you would collect first and how it would narrow the possible causes.':'Explain why this step fits the problem and the relevant tradeoff.');
        add('evidence',check?3:personal?2:1,check||personal||first,check?'A check or measurement is named; its result and validity are not verified locally.':'A proposed action alone does not demonstrate that the approach succeeds.','Describe the concrete observation or worked example that would support this approach.');
        const gap=diagnostic?!diagnosticStep:!check;
        add('completeness',gap?1:3,diagnosticStep||escalation||check||first,gap?(diagnostic?'The detected steps omit reproducing the error or inspecting evidence that could isolate its cause.':'The detected steps do not include a check of the proposed outcome.'):'The passage includes an investigation or checking step; local matching cannot certify completeness.',diagnostic?'Include reproduction steps, the relevant error evidence, and a check that the fix resolves the recurrence.':'Say what result you would expect and how you would check it.');
    }
    const grade=scoreContentRubric({version:RUBRIC_VERSION,criteria:values},answer,knowledge,question);
    return {...grade,method:'local-heuristic'};
}
