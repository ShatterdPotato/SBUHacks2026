// A warm-up stays behavioral even when the session's selected focus is Technical.
export function questionKind(question = {}) {
    const prompt = question.prompt ?? '';
    const introduction = question.purpose === 'introduction' || /\b(tell (?:me|us) (?:a (?:little|bit) )?about (?:yourself|your background)|walk (?:me|us) through your (?:background|resume)|introduce yourself|what (?:drew|attracted|brings) you|why (?:this|the) (?:role|company|internship)|why (?:do you want|are you interested|did you apply|are you applying)|what interests you|excited to bring|motivat\w* you to (?:apply|join))\b/i.test(prompt);
    const behavioral = introduction || question.category === 'Behavioral' || /\b(tell me about a (?:time|project)|describe a time|disagreed with|your strengths)\b/i.test(prompt) || (question.category !== 'Technical' && /\b(your experience|your background)\b/i.test(prompt));
    return { category: behavioral ? 'Behavioral' : 'Technical', purpose: introduction ? 'introduction' : behavioral ? 'behavioral' : 'technical' };
}
export function canFollowUp(question) { return questionKind(question).category === 'Technical'; }
export function nextTurnAction({question, enabled = true, isFollowup = false, skipped = false, words = 0, topicIndex = 0, targetTopics = 3}) {
    if (enabled && !isFollowup && !skipped && words >= 10 && canFollowUp(question)) return 'probe';
    return topicIndex + 1 >= targetTopics ? 'finish' : 'transition';
}
