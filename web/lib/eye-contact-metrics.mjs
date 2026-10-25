/**
 * Camera-directed gaze heuristics (labeled estimate, never a score input).
 *
 * Inputs are MediaPipe Face Landmarker blendshape scores (0..1) and its 4x4
 * facial transformation matrix. Everything runs in the browser; no frames,
 * landmarks or frames are retained. Timestamped classifications remain only
 * in browser memory alongside the existing recording evidence.
 *
 * This estimates whether the eyes and head point roughly toward the camera.
 * It cannot establish attention, engagement, confidence, or feelings.
 */

/** Tolerances. Webcams usually sit above the screen, so glancing down is allowed more. */
export const EYE_CONTACT_LIMITS = Object.freeze({
    gazeSide: 0.45,
    gazeUp: 0.45,
    gazeDown: 0.6,
    blink: 0.5,
    yawDeg: 20,
    pitchDeg: 20,
});

/** Twenty classified samples: about ten seconds at the shared 2 Hz sampling rate. */
export const MIN_EYE_FRAMES = 20;

const avg = (a, b) => ((a ?? 0) + (b ?? 0)) / 2;

/**
 * Approximate head yaw/pitch in degrees from a 4x4 rotation-translation matrix.
 * MediaPipe's column-major matrix is used; these angles are approximate.
 * @param {ArrayLike<number> | null | undefined} m
 * @returns {{ yaw: number, pitch: number } | null}
 */
export function headAngles(m) {
    if (!m || m.length !== 16 || !Array.from(m).every(Number.isFinite) || Math.hypot(m[8],m[9],m[10]) < .5) return null;
    const yaw = Math.atan2(m[8], m[10]) * 180 / Math.PI;
    const pitch = Math.asin(Math.max(-1, Math.min(1, -m[9]))) * 180 / Math.PI;
    return { yaw, pitch };
}

/**
 * Classify one video frame.
 * @param {{ scores?: Record<string, number> | null, matrix?: ArrayLike<number> | null }} frame
 * @param {typeof EYE_CONTACT_LIMITS} [limits]
 * @returns {'contact' | 'away' | 'blink' | 'none'}
 */
export function classifyFrame({ scores, matrix } = {}, limits = EYE_CONTACT_LIMITS) {
    const required=['eyeBlinkLeft','eyeBlinkRight','eyeLookInLeft','eyeLookOutRight','eyeLookOutLeft','eyeLookInRight','eyeLookUpLeft','eyeLookUpRight','eyeLookDownLeft','eyeLookDownRight'];
    const angles = headAngles(matrix);
    if (!scores || !angles || required.some(key=>!Number.isFinite(scores[key]) || scores[key]<0 || scores[key]>1)) return 'none';
    if (avg(scores.eyeBlinkLeft, scores.eyeBlinkRight) > limits.blink) return 'blink';
    // Looking to the subject's right moves the left eye inward and the right eye outward.
    const lookRight = avg(scores.eyeLookInLeft, scores.eyeLookOutRight);
    const lookLeft = avg(scores.eyeLookOutLeft, scores.eyeLookInRight);
    const lookUp = avg(scores.eyeLookUpLeft, scores.eyeLookUpRight);
    const lookDown = avg(scores.eyeLookDownLeft, scores.eyeLookDownRight);
    if (Math.max(lookRight, lookLeft) > limits.gazeSide || lookUp > limits.gazeUp || lookDown > limits.gazeDown)
        return 'away';
    if (angles && (Math.abs(angles.yaw) > limits.yawDeg || Math.abs(angles.pitch) > limits.pitchDeg))
        return 'away';
    return 'contact';
}

/** @returns {{ contact: number, away: number, blink: number, none: number }} */
export const emptyEyeCounts = () => ({ contact: 0, away: 0, blink: 0, none: 0 });

/**
 * Summarize one answer. Percentages are null when evidence is insufficient.
 * @param {{ contact: number, away: number, blink: number, none: number }} counts
 * @returns {{ cameraGaze: number | null, faceVisible: number | null, frames: number }}
 */
export function summarizeEyeContact(counts) {
    const c = { ...emptyEyeCounts(), ...counts };
    const total = c.contact + c.away + c.blink + c.none;
    const classified = c.contact + c.away;
    return {
        cameraGaze: classified >= MIN_EYE_FRAMES && classified / total >= .7 ? Math.round(c.contact / classified * 100) : null,
        faceVisible: total >= MIN_EYE_FRAMES ? Math.round((total - c.none) / total * 100) : null,
        frames: total,
    };
}

/** Missing, dropped and model-loading slots count toward coverage, never as looking away. */
export function eyeContactSummary(samples = []) {
    const counts=emptyEyeCounts();
    for(const sample of samples) counts[Object.hasOwn(counts,sample.eyeContact)?sample.eyeContact:'none']++;
    const summary=summarizeEyeContact(counts), classified=counts.contact+counts.away;
    return {...summary,classified,coverage:samples.length?Math.round(classified/samples.length*100):null};
}
