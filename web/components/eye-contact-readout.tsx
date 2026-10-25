import type { EyeSummary } from '../lib/eye-contact-metrics.mjs';
export function EyeContactReadout({summary,paused=false}:{summary:EyeSummary|null;paused?:boolean}){
 return <p className="eye-contact-readout">Eye contact estimate · {paused?'paused':summary?.cameraGaze!==null&&summary?`${summary.cameraGaze}% camera-directed`:summary&&summary.frames>=20?'unavailable · insufficient usable tracking':'collecting usable samples…'}<small>Tracking coverage: {summary?.coverage===null||!summary?'unavailable':`${summary.coverage}%`} · on-device, uncalibrated. Gaze is shown beside Confidence pending camera validation.</small></p>;
}
