import type { Grading } from '../lib/interview-types';
import { FeedbackText } from './feedback-text';

export function GradingBreakdown({grading}:{grading:Grading}) {
    return <details className="grading-breakdown"><summary>Why this grade · {grading.category??'Content'} rubric</summary>
        <p>Each criterion is anchored from 0 (missing) to 4 (complete), weighted as shown. Technical answers are compared with the relevant reference approach.</p>
        {grading.score<grading.uncappedScore&&<p className="grade-cap"><strong>Relevance cap applied:</strong> {grading.uncappedScore} → {grading.score}/100.</p>}
        <ul>{grading.criteria.map((c,index)=><li key={c.id}><div><strong>{c.label}</strong><span>{c.level}/4 · {c.weight}% weight</span></div><p><FeedbackText>{c.reason}</FeedbackText></p>{c.evidence&&grading.criteria.findIndex(other=>other.evidence===c.evidence)===index&&<blockquote>“{c.evidence}”</blockquote>}</li>)}</ul>
        <small>{grading.version} · {grading.method==='local-heuristic'?'Local text heuristic; meaning and correctness are not verified.':'AI classifications are provisional.'}</small>
    </details>;
}
