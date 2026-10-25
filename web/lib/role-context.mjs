export const ROLE_RULES = [
    { family: 'Retail cashier / customer service', pattern: /cashier|retail|customer service|fast.food|mcdonald|barista|crew member|restaurant|food service/i,
      topics: ['Customer service', 'Cash handling', 'Teamwork', 'Conflict resolution', 'Reliability', 'Food safety'],
      guidance: 'Prioritize serving customers, cash/change accuracy, handling complaints, teamwork, reliability and safe escalation. Technical means practical job scenarios, never coding or machine learning. Do not invent employer-specific procedures.' },
    { family: 'Warehouse / operations', pattern: /warehouse|logistics|stock|delivery|operations associate|picker|packer/i,
      topics: ['Teamwork', 'Reliability', 'Safety', 'Inventory'], guidance: 'Prioritize accuracy, safe handling, inventory, teamwork and reliable work. Avoid unrelated coding questions.' },
    { family: 'AI/ML engineering', pattern: /\b(machine learning|ai[ /-]*ml|ai|ml|pytorch|tensorflow|nlp)\b/i, guidance: 'Prioritize model evaluation, data quality, leakage, experiments and job-relevant engineering.' },
    { family: 'Data science', pattern: /data science|data scientist|data analyst/i, guidance: 'Prioritize data analysis, statistical reasoning, experiments and business interpretation.' },
    { family: 'Electrical engineering', pattern: /electrical|circuits?|embedded/i, guidance: 'Prioritize measurement, circuits, debugging and safe engineering reasoning.' },
    { family: 'Product management', pattern: /product manager|product management|user research/i, guidance: 'Prioritize user needs, prioritization, communication, tradeoffs and measurable outcomes.' },
    { family: 'Software engineering', pattern: /software|developer|programmer|python|javascript/i, guidance: 'Prioritize software design, debugging, tests, data structures and job-relevant implementation.' },
];
export const ROLE_FAMILIES = Object.freeze([...ROLE_RULES.map(r => r.family), 'General interview']);
export function roleRule(role) { return ROLE_RULES.find(r => r.pattern.test(role ?? '') || r.family === role) ?? { family: 'General interview', guidance: 'Prioritize the explicitly requested job and practical responsibilities. Resume details are secondary evidence, not the job description.' }; }
export function roleGuidance(role) { const rule = roleRule(role); return `TARGET ROLE HAS PRIORITY: ${role}. ${rule.guidance} Use resume background only for transferable examples relevant to this role; never switch professions because of the resume.`; }
export function relevantSkills(skills, family) {
    const rule = ROLE_RULES.find(r => r.family === family);
    return rule?.topics ? [...new Set([...skills.filter(s => rule.topics.includes(s)), ...rule.topics.slice(0, 5)])] : skills;
}
