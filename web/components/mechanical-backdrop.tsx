function gearPath(teeth:number,radius:number){
 return Array.from({length:teeth*4},(_,i)=>{const a=i*Math.PI*2/(teeth*4),r=i%4<2?radius:radius*.82;return `${i?'L':'M'}${(100+Math.cos(a)*r).toFixed(2)},${(100+Math.sin(a)*r).toFixed(2)}`;}).join(' ')+' Z';
}
export function MechanicalBackdrop(){
 return <div className="mechanical-backdrop" aria-hidden="true"><svg className="ambient-gear ambient-gear-left" viewBox="0 0 200 200"><g><path d={gearPath(16,96)}/><circle cx="100" cy="100" r="57"/><circle cx="100" cy="100" r="25"/></g></svg><svg className="ambient-gear ambient-gear-right" viewBox="0 0 200 200"><g><path d={gearPath(13,96)}/><circle cx="100" cy="100" r="49"/><circle cx="100" cy="100" r="20"/></g></svg><svg className="tesla-coil" viewBox="0 0 120 250"><g className="coil-brass"><path d="M38 235h44l-8-12H46zM56 223V66h8v157"/><ellipse cx="60" cy="58" rx="36" ry="13"/>{Array.from({length:12},(_,i)=><path key={i} d={`M46 ${86+i*10}l28 -5`}/>)}</g><path className="coil-spark spark-one" d="M41 48L23 30l9-4L11 8"/><path className="coil-spark spark-two" d="M83 52l14-12-6-8 19-17"/></svg></div>;
}
