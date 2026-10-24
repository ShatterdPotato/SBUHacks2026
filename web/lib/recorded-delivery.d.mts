type Word = { text: string; start: number; end: number };
type Audio = { at: number; rms: number };
type Vision = { at: number; facing: boolean | null; shouldersVisible: boolean | null; bodyShift?: number | null };
export type Delivery = {
    score: number | null;
    components: { name: string; score: number; weight: number; evidence: string }[];
    metrics: { words: number; fillers: number; wpm: number | null; confidence: number | null; repetitions: number };
    notes: string[];
};
export type Moment = { id: string; answerIndex: number; start: number; end: number; transcript: string; score: number; reason: string; url: string; mime: string };
type Take = { hasRecording: boolean; url: string | null; transcript: string; duration: number; mime: string; question: { focus: string[] }; analysis: { scores: { confidence: number | null; content: number | null; comprehension: number | null } }; words?: Word[]; audioEvidence?: Audio[]; visionEvidence?: Vision[] };
export function timedWords(chunks: unknown, duration: number, offset?: number): Word[];
export function recordedDelivery(input: { transcript: string; duration: number; words?: Word[]; audio?: Audio[]; vision?: Vision[] }): Delivery;
export function answerMoments(take: Take, answerIndex: number): Moment[];
export function selectMoments(answers: Take[], limit?: number): { best: Moment[]; worst: Moment[] };
