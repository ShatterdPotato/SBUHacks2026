// Bounded reference programs, never eval user code or model-provided formulas.
export function executeCheck(c) {
 const a=c.args;
 switch(c.operation) {
  case 'precision':return a.tp/(a.tp+a.fp);
  case 'recall':return a.tp/(a.tp+a.fn);
  case 'f1':return 2*a.tp/(2*a.tp+a.fp+a.fn);
  case 'accuracy':return (a.tp+a.tn)/(a.tp+a.tn+a.fp+a.fn);
  case 'dot':return a.x.reduce((s,x,i)=>s+x*a.y[i],0);
  case 'mse':return a.actual.reduce((s,x,i)=>s+(x-a.predicted[i])**2,0)/a.actual.length;
  case 'gradient':return a.w-a.lr*2*(a.w-a.target);
  case 'mean':return a.values.reduce((s,x)=>s+x,0)/a.values.length;
  case 'binary-search':return Math.floor(Math.log2(a.n))+1;
  case 'heap-height':return Math.floor(Math.log2(a.n));
  case 'prefix-sum':return a.values.slice(a.start,a.end+1).reduce((s,x)=>s+x,0);
  case 'unique':return new Set(a.values).size;
  case 'inversions':return a.values.reduce((s,x,i)=>s+a.values.slice(i+1).filter(y=>y<x).length,0);
  case 'gcd':{let x=a.x,y=a.y;while(y)[x,y]=[y,x%y];return x;}
  case 'fib':{let x=0,y=1;for(let i=0;i<a.n;i++)[x,y]=[y,x+y];return x;}
  case 'hamming':return (a.x^a.y).toString(2).split('1').length-1;
  case 'amat':return a.hit+a.missRate*a.penalty;
  case 'cache-sets':return a.bytes/(a.line*a.ways);
  case 'tag-bits':return a.addressBits-Math.log2(a.bytes/a.ways);
  case 'bandwidth':return a.bytes*a.mhz;
  case 'cycles':return a.instructions+a.stages-1;
  case 'cpi':return a.base+a.frequency*a.penalty;
  case 'clock-mhz':return 1000/(a.cq+a.logic+a.setup);
  case 'speedup':return 1/((1-a.fraction)+a.fraction/a.acceleration);
  case 'unsigned':return parseInt(a.bits,2);
  case 'twos-complement':return parseInt(a.bits,2)-(a.bits[0]==='1'?2**a.bits.length:0);
  case 'counter-width':return Math.ceil(Math.log2(a.states));
  case 'mux-select':return Math.log2(a.inputs);
  case 'mod-sum':return (a.x+a.y)%(2**a.width);
  case 'parity':return a.bits.split('1').length%2===0?1:0;
  case 'truth-table':return [0,1].flatMap(x=>[0,1].map(y=>({and:x&y,or:x|y,xor:x^y,nand:1-(x&y),nor:1-(x|y),xnor:1-(x^y)})[a.gate])).join('');
  default:throw new Error('Unsupported reference program');
 }
}
const rows=[
 ['ai-ml','precision',{tp:24,fp:6},'A classifier makes 24 true-positive and 6 false-positive predictions. What is its precision as a decimal?'],
 ['ai-ml','recall',{tp:18,fn:12},'A detector finds 18 positives and misses 12 positives. What is its recall as a decimal?'],
 ['ai-ml','f1',{tp:12,fp:4,fn:8},'For TP=12, FP=4 and FN=8, calculate the F1 score as a decimal.'],
 ['ai-ml','accuracy',{tp:30,tn:50,fp:5,fn:15},'For TP=30, TN=50, FP=5 and FN=15, calculate accuracy as a decimal.'],
 ['ai-ml','dot',{x:[2,-1,3],y:[4,5,2]},'What is the dot product of [2,-1,3] and [4,5,2]?'],
 ['ai-ml','mse',{actual:[1,2,4],predicted:[2,2,2]},'Compute mean squared error for targets [1,2,4] and predictions [2,2,2].'],
 ['ai-ml','gradient',{w:5,lr:.1,target:2},'For loss (w-2)^2, start at w=5 and take one gradient-descent step with learning rate 0.1. What is the new w?'],
 ['ai-ml','mean',{values:[2,3,4,7]},'An empirical distribution places equal probability on 2,3,4,7. What is its expected value?'],
 ['software','binary-search',{n:31},'A standard binary search halves a sorted array of 31 elements. What is its worst-case number of midpoint probes?'],
 ['software','heap-height',{n:63},'What is the height in edges of a complete binary heap containing 63 nodes?'],
 ['software','prefix-sum',{values:[3,-2,5,7,1],start:1,end:3},'For [3,-2,5,7,1], what is the inclusive range sum from zero-based index 1 through 3?'],
 ['software','unique',{values:[4,1,4,2,1,7]},'After inserting 4,1,4,2,1,7 into an initially empty set, how many distinct elements remain?'],
 ['software','inversions',{values:[3,1,2,0]},'How many inversions does [3,1,2,0] contain? An inversion is a pair i<j with a[i]>a[j].'],
 ['software','gcd',{x:84,y:30},'Using the Euclidean algorithm, what is gcd(84,30)?'],
 ['software','fib',{n:9},'For F(0)=0, F(1)=1 and F(n)=F(n-1)+F(n-2), calculate F(9).'],
 ['software','hamming',{x:10,y:6},'What is the Hamming distance between the four-bit values 1010 and 0110?'],
 ['hardware','amat',{hit:2,missRate:.05,penalty:80},'A cache has 2 ns hit time and a 5% miss rate. Each miss adds 80 ns. What is average access time in ns?'],
 ['hardware','cache-sets',{bytes:32768,line:64,ways:4},'How many sets are in a 32 KiB, four-way cache with 64-byte lines?'],
 ['hardware','tag-bits',{addressBits:32,bytes:16384,ways:4},'A byte-addressed 32-bit system has a 16 KiB four-way cache and 64-byte lines. How many tag bits are needed per line?'],
 ['hardware','bandwidth',{bytes:8,mhz:200},'A bus transfers eight bytes per cycle at 200 MHz with no overhead. What is peak bandwidth in decimal MB/s?'],
 ['hardware','cycles',{instructions:20,stages:5},'A five-stage pipeline starts empty and has no stalls. How many cycles complete 20 instructions?'],
 ['hardware','cpi',{base:1,frequency:.2,penalty:3},'Base CPI is 1. Twenty percent of instructions each incur a three-cycle stall. What is the resulting CPI?'],
 ['hardware','clock-mhz',{cq:1,logic:7,setup:2},'A register path has 1 ns clock-to-Q, 7 ns logic delay and 2 ns setup time. Ignoring skew and uncertainty, what is maximum frequency in MHz?'],
 ['hardware','speedup',{fraction:.8,acceleration:4},'Eighty percent of a workload becomes four times faster; the rest is unchanged. What is overall speedup?'],
 ['digital-logic','unsigned',{bits:'101101'},'Interpret the unsigned binary number 101101 in decimal.'],
 ['digital-logic','twos-complement',{bits:'111010'},'Interpret the six-bit two’s-complement number 111010 in decimal.'],
 ['digital-logic','counter-width',{states:19},'What is the minimum number of binary state bits needed for a counter with 19 distinct states?'],
 ['digital-logic','mux-select',{inputs:16},'How many binary select bits does a 16-to-1 multiplexer need?'],
 ['digital-logic','mod-sum',{x:13,y:7,width:4},'A four-bit unsigned adder adds decimal 13 and 7 and discards carry-out. What decimal value remains?'],
 ['digital-logic','parity',{bits:'10111'},'What parity bit must be appended to 10111 so that the total number of ones is even?'],
 ['digital-logic','truth-table',{gate:'xor'},'Give XOR outputs for input pairs 00,01,10,11, in that order.'],
 ['digital-logic','truth-table',{gate:'nand'},'Give NAND outputs for input pairs 00,01,10,11, in that order.']
];
export const executableQuestions=rows.map(([track,operation,args,prompt],i)=>{
 const checker={operation,args,format:operation==='truth-table'?'Truth table: four bits in 00,01,10,11 order':'Final: number (use the units requested; decimals, not percentages)'};
 const result=executeCheck(checker);
 return {id:`verified-${track}-${i+1}`,track,competency:operation,prompt,level:'Internship',category:'Technical',checker,answerKey:`The independently computed result is ${result}. ${checker.format}. Explain the intermediate steps and the stated assumptions.`,essentialFacts:[`Result = ${result}`],acceptableAlternatives:['Equivalent exact fractions or decimal values within 0.001 are acceptable.'],partialCredit:['Correct setup and intermediate reasoning can earn partial credit even if the final arithmetic is wrong.'],misconceptions:['Do not change the stated units, bit width, indexing or definition.'],probes:['Ask about the specific intermediate step that caused a discrepancy, if present.'],sourceIds:[track==='ai-ml'?'google-ml':track==='software'?'cs-curriculum':track==='hardware'?'mit-cs':'hdlbits'],review:{status:'executable-verified',method:'deterministic reference program; bounded factual result only',date:'2026-10-25'},version:1};
});
export function checkAnswer(entry,answer) {
 if(!entry?.checker)return [];
 const c=entry.checker, expected=executeCheck(c);
 const matches=[...answer.matchAll(c.operation==='truth-table'?/Truth table:\s*([01]{4})\b/gi:/Final:\s*([-+]?\d+(?:\.\d+)?(?:\s*\/\s*[-+]?\d+(?:\.\d+)?)?)\s*(%?)/gi)];
 if(matches.length!==1||matches[0][2]==='%')return [];
 const m=matches[0]; const parts=m[1].split('/').map(Number);
 const value=c.operation==='truth-table'?m[1]:parts.length===2?parts[0]/parts[1]:parts[0];
 const correct=typeof expected==='string'?value===expected:Number.isFinite(value)&&Math.abs(value-expected)<=.001;
 return [{quote:m[0],status:correct?'supported':'contradicted',explanation:`The ${c.operation} reference program returns ${expected} for the inputs in this question. This checks the final result only.`,referenceId:`key:${entry.id}`,referenceExcerpt:`The independently computed result is ${expected}.`,severity:'major',method:'executable'}];
}
