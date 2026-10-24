# Speech worker origin regression

The human reported that enabling camera/microphone failed before device access:
`Failed to construct 'Worker'`, with `file:///lib/speech.worker.ts?worker_file&type=module`
as the worker URL on the local HTTP website.

## Cause and fix

The JavaScript served by the actual Cadence/Vinext server resolved the worker's
root-relative entry against a rewritten `file:///ROOT/lib/recording-coach.ts`
`import.meta.url`. The previous standalone Vite media harness did not exercise
this framework transform and therefore missed the defect.

An explicit Vite worker import removed the file-origin error but exposed a second
actual-server problem: Vinext's development client reached the worker import
graph and threw `window is not defined` from `/@vite/client`.

The final fix bundles `speech.worker.ts` in a separate, plugin-free Vite build
before both `pnpm dev` and `pnpm build`. `RecordingCoach` loads the resulting
same-origin `/vendor/speech/speech.worker.js` module worker. Worker dependencies
and its WASM asset are served as static public files, outside the Vinext page/HMR
transform pipeline. The generated directory is ignored. No credential, media
consent, provider policy, API contract, or hosted audience changed.

The isolated output is approximately 850 kB JavaScript and 21.6 MB WASM, with the
WASM emitted as a separate asset. Worker-source edits require restarting the dev
command to regenerate that bundle.

## Browser regression on the actual app origin

Fixture source: `web/tests/fixtures/worker-origin.html`.

1. Run `pnpm dev` normally, then temporarily copy that fixture into the ignored
   `web/public/qa-fixtures/` directory.
2. Open `http://127.0.0.1:5173/qa-fixtures/worker-origin.html`.
3. **Load recording speech worker** constructs the actual `RecordingCoach` and
   warms the model. Result: **PASS** through the actual Cadence/Vinext origin.
4. **Transcribe public speech fixture** uses the public speech audio linked by
   the Transformers.js documentation. The same worker recognized the expected
   speech and returned more than fifteen timestamped words. Result: **PASS**.
5. Remove the temporary public fixture before building. No camera or microphone
   was accessed, and no personal interview content or server key was supplied to
   the fixture. This verifies the startup/transcription prerequisite, not physical
   device quality or permissions.

The test first reproduced both startup failures, then passed with the final
isolated bundle. Screenshot: local ignored
`outputs/continuation-qa/worker-origin-pass.jpg`.

Required checks: 53 tests PASS; TypeScript PASS; production build PASS. See the
current Git checkpoint for this fix. The local Gemini configuration remains in
ignored `.dev.vars`; it is not included in source or public worker assets.

## Manual handoff

From / To: implementation agent -> Sameer / aiden.sol / next Cadence agent.
Owned files: recording worker loader, standalone worker build/prelaunch step,
generated-asset ignore rule, browser regression fixture, and context docs.
Next action: user retries camera/microphone setup after refreshing the local app.
Physical capture still requires the user's explicit device permission. Hosted
publication remains blocked by the previously documented Site owner/editor access.
