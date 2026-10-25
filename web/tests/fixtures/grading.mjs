export function rubricFixture(quote, levels = [3,3,3,3]) {
    return {version:'cadence-content-v3',criteria:['relevance','reasoning','evidence','completeness'].map((id,i)=>({id,level:levels[i],evidence:quote,reason:`A specific ${id} assessment grounded in this answer.`,improvement:`Add a concrete ${id} detail that addresses this question.`}))};
}
