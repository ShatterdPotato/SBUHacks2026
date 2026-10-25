# Eye-contact evidence and results chat

October 25, 2026. Agent: montasir. Based on `d954c59` on the unmerged
`origin/codex/gearwell-frontend`, preserving draft PR #14.

## Changes

- Adapted `eye-contact-feature-1.patch` to the existing classic vision worker.
  One face detector uses eye-direction blendshapes and the head transform at 2 Hz.
  Raw shapes/landmarks are discarded. Optional local tracking works in both modes.
  Invalid/missing geometry stays unavailable. Blinks are excluded from percentages.
- Loading, dropped and stalled slots reduce coverage. Generation/listening epochs
  reject stale results; candidate listening gates and frame cleanup are preserved.
  Percentages need 20 classified samples and 70% usable coverage. Live UI, answer
  evidence and the PDF show gaze/coverage. Gaze has no Confidence weight pending
  physical-camera validation, as required by the next-agent guide. Existing delivery
  scoring benefits from better missing-slot accounting. No gaze or media upload.
- Results chat sends saved question/answer/rubric evidence and at most four recent
  exchanges through `/api/coach`. Separate consent, unpaid Gemini fictional-data
  restrictions, bounded input/contact checks, draft-preserving retry, cancellation,
  consent revocation and reset on transcript/grade changes are implemented. Replies
  support an explanation and zero to three drills; the latest reply enters the PDF.
- Larger CadenceAI gear/wordmark and 1440 px maximum landing width; wider columns.
  Gearwell speaks at 1.25x with pitch preservation and loops `Idle_man_1` in interviews.
  Removed the repeated excerpt source parenthetical. General report evidence and
  approximate-selection explanations remain visible once.

## Verification

- 170 automated tests pass, including gaze geometry/missing evidence/coverage,
  listening gates, stale results, stalled intervals, bitmap cleanup, chat consent/
  bounds/contact checks, high thinking, reference validation, voice rate and PDF.
- Browser: desktop setup uses available width; no overflow at 320 CSS pixels.
  Text-only conversation, next question and early report passed. Idle man 1 stayed
  active across transitions. Text-only Confidence remained unassessed.
- Browser fixture: send blocked before consent; practice drill and solution;
  contextual follow-up with two previous messages; failed draft retained; retry
  without duplicate history; cancellation; correction clears chat/consent; usable
  and insufficient-coverage gaze readouts. Fixture console had no errors/warnings.
  Temporary QA route removed before the production build; reusable fixture retained.
- Existing avatar assets warn about missing VRMA specVersion in development (v1
  assumed). HMR can log the existing multiple-renderer warning.

Final TypeScript/build/publication results are in HANDOFF.md. Chat browser tests
used mocked replies. Local health reported no configured AI provider; no secret
file was read or changed. Physical-camera accuracy (glasses, lighting, placement),
calibration and actual ElevenLabs listening remain unverified.
No new gaze score weight or proven accuracy improvement is claimed.

Post-deployment live check: PASS. A fictional text session reached the production report; Gemini returned a gap explanation and worked exercise, followed by a contextual revised introduction. Two actual requests completed. Audience/secrets stayed unchanged at environment revision 3.
