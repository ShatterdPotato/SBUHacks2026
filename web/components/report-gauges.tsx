import type {CSSProperties} from 'react';
import {reportRatings} from '../lib/report-ratings.mjs';
import type {Take} from '../lib/interview-types';
export function ReportGauges({answers}:{answers:Take[]}){
 return <section className="readout report-dials" aria-label="Session ratings"><div className="readout-head"><h2>Your interview, calibrated.</h2><span className="preview-tag">Practice feedback</span></div><div className="gauges">{reportRatings(answers).map(r=><div className="g" key={r.id}>
 <svg viewBox="0 0 160 112" role="img" aria-label={`${r.label}: ${r.score===null?'not assessed':r.score+' out of 100'}`}>
 <path d="M16 87A64 64 0 0 1 144 87" fill="#171109" stroke="#725a35" strokeWidth="9"/><path d="M16 87A64 64 0 0 1 144 87" className="dial-zone" fill="none" strokeWidth="6"/>
 <path d="M26 87A54 54 0 0 1 134 87" stroke="#e4bd6c" strokeWidth="1" fill="none"/><g stroke="#fff0c4" strokeWidth="2"><path d="M23 87h7m5-35 6 4m39-33v8m45 21-6 4m18 31h-7"/></g>
 <path d="M80 87V42" className="result-needle" style={{transform:`rotate(${r.score===null?-90:r.score*1.8-90}deg)`,opacity:r.score===null?.3:1} as CSSProperties} stroke="#fff3ce" strokeWidth="3" strokeLinecap="round"/><circle cx="80" cy="87" r="7" className="dial-hub"/><circle cx="80" cy="87" r="3" fill="#21180e"/></svg>
 <strong>{r.label}</strong><div className="dial-score">{r.score===null?'Not assessed':<>{r.score}<small>/100</small></>}</div><span>{r.description}</span><details><summary>How this rating works</summary><p>{r.basis}</p></details>
 </div>)}</div></section>;
}
