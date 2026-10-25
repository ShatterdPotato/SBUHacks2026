import { roleRule } from './role-context.mjs';
const retail = [
    ['Behavioral','A customer is frustrated by a long wait. How would you speak with them while keeping the line moving?', ['customer','listen','team']],
    ['Behavioral','Tell me about a time you stayed reliable when other people depended on you. How would that help during a busy shift?', ['reliable','shift','team']],
    ['Behavioral','How would you respond if a teammate needed help while you were serving a customer?', ['team','customer','priority']],
    ['Behavioral','What would you do if you realized you had entered the wrong order?', ['correct','communicate','supervisor']],
    ['Behavioral','How would you learn the register and menu during your first week?', ['learn','practice','ask']],
    ['Behavioral','How would you handle feedback about a mistake you made on shift?', ['listen','correct','learn']],
    ['Behavioral','What does dependable customer service look like when the restaurant is very busy?', ['customer','reliable','team']],
    ['Technical','An order costs $8.65 and the customer gives you $20. How much change is due, and how would you check it?', ['11.35','change','check']],
    ['Technical','A customer asks about an ingredient allergy and you are unsure. What would you do before answering?', ['allergy','check','supervisor']],
    ['Technical','What steps would you take if your cash drawer did not match the expected amount?', ['count','supervisor','record']],
    ['Technical','A payment appears to fail but the customer thinks they were charged. How would you resolve it?', ['verify','supervisor','payment']],
    ['Technical','An order costs $13.40 and a customer pays $15. What change is due?', ['1.60','change']],
    ['Technical','How would you check that an order is accurate before handing it to a customer?', ['order','check','confirm']],
    ['Technical','What would you do if the register stopped working while a line was forming?', ['supervisor','communicate','procedure']],
    ['Technical','How would you handle a refund request when you do not know the store policy?', ['policy','supervisor','check']],
    ['Technical','A customer changes their order after you entered it. How would you confirm the new total?', ['confirm','total','check']],
];
const ml = [
    ['How would you prevent information from a test set leaking into model training?', ['split','train','test']],
    ['Why can accuracy be misleading with a severely imbalanced dataset?', ['precision','recall','imbalance']],
    ['What would you compare against before claiming that a complex model is an improvement?', ['baseline','metric','validation']],
    ['How would you decide whether a model is overfitting?', ['validation','training','gap']],
    ['What would you monitor after deploying a predictive model?', ['drift','metric','data']],
    ['How would you evaluate a retrieval system when some questions have no supported answer?', ['recall','grounding','abstain']],
];
export function roleQuestions(role) {
    const family = roleRule(role).family;
    const items = family === 'Retail cashier / customer service' ? retail
        : family === 'AI/ML engineering' || family === 'Data science' ? ml.map(([prompt, focus]) => ['Technical', prompt, focus]) : [];
    const practical = ['How would you learn an unfamiliar task and check that you performed it correctly?', 'Walk me through how you would investigate a recurring error in this role.', 'How would you decide what to prioritize when several tasks arrive at once?', 'How would you check the quality of your work before handing it over?', 'What would you do when a task exceeds your authority or expertise?', 'How would you explain a practical tradeoff to a teammate in this role?'];
    const extra = ['AI/ML engineering','Data science'].includes(family) ? [] : practical.map(prompt => ['Technical', prompt, ['check','communicate','reason']]);
    return [...items, ...extra].map(([category, prompt, focus], i) => ({ id:`role-${family}-${i}`, category, prompt, focus, source:'curated', roles:[family], tags:[] }));
}
