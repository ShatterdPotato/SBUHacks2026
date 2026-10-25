(() => {
  const sound = document.querySelector('#gate-audio');
  const toggle = document.querySelector('#gate-sound-toggle');
  const test = document.querySelector('#test-device-sound');
  const output = document.querySelector('#audio-output-label');
  const helpers = [...document.querySelectorAll('[data-audio-help]')];
  const chooseButtons = [...document.querySelectorAll('[data-choose-speaker]')];
  const Context = window.AudioContext || window.webkitAudioContext;
  const canChoose = Boolean(navigator.mediaDevices?.selectAudioOutput &&
    (Context ? typeof Context.prototype.setSinkId === 'function' : typeof sound.setSinkId === 'function'));
  let context;
  let source;
  let attempt = 0;
  let wanted = false;
  let preview = false;
  let unlockTimer;
  let outputName = 'Device default';
  sound.volume = 0.7;

  function sync() {
    toggle.textContent = sound.muted ? 'Sound off' : 'Sound on';
    toggle.setAttribute('aria-pressed', String(!sound.muted));
    test.textContent = preview && wanted ? 'Stop sound' : 'Test sound';
    output.textContent = `Output: ${outputName}`;
  }
  function hideHelp() { helpers.forEach(panel => { panel.hidden = true; }); }
  function showHelp(message) {
    helpers.forEach(panel => {
      panel.querySelector('[data-audio-help-text]').textContent = message;
      panel.hidden = false;
    });
  }
  function explain(error) {
    if (error?.name === 'NotAllowedError') return 'Your browser blocked sound. Tap Enable sound to allow playback. If it stays blocked, allow sound in your browser’s site settings.';
    if (error?.name === 'NotFoundError') return 'The selected speaker is unavailable. Choose another output, or check your device’s sound settings and try again.';
    if (sound.error) return 'The sound could not be loaded. Check your connection, then tap Enable sound to retry.';
    return 'Sound has not started. Tap Enable sound, then check your device’s volume and selected audio output if needed.';
  }
  function prepareGraph() {
    // Playback uses the system's current media output, without microphone access.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    if (!Context) { sound.volume = 0.7; return; }
    if (context) return;
    let created;
    try {
      created = new Context({ latencyHint: 'interactive' });
      const gain = created.createGain();
      gain.gain.value = 1;
      const limiter = created.createDynamicsCompressor();
      limiter.threshold.value = -2; limiter.knee.value = 0; limiter.ratio.value = 20;
      limiter.attack.value = 0.001; limiter.release.value = 0.15;
      gain.connect(limiter); limiter.connect(created.destination);
      source = created.createMediaElementSource(sound);
      source.connect(gain);
      context = created;
      context.addEventListener('statechange', () => {
        if (wanted && !sound.muted && ['interrupted', 'suspended'].includes(context.state)) {
          showHelp('Audio was interrupted. Tap Enable sound to resume it on your device.');
        }
      });
    } catch {
      // If Web Audio cannot initialize, native media playback can still use the device output.
      sound.volume = 0.7;
      if (source && created) {
        source.connect(created.destination);
        context = created;
      } else if (created) {
        created.close().catch(() => {});
      }
    }
  }
  function stop() {
    attempt++;
    wanted = false; preview = false;
    clearTimeout(unlockTimer);
    sound.pause();
    try { sound.currentTime = 0; } catch {}
    sync();
  }
  function play({ position = 0, manual = false, enable = false } = {}) {
    const ticket = ++attempt;
    clearTimeout(unlockTimer);
    sound.pause();
    if (enable) sound.muted = false;
    if (sound.muted) { wanted = false; preview = false; sync(); return Promise.resolve(false); }
    wanted = true; preview = manual;
    hideHelp(); sync();
    try {
      prepareGraph();
      sound.currentTime = Number.isFinite(sound.duration) ? Math.min(position, Math.max(0, sound.duration - 0.05)) : position;
      // Invoke both operations in the click handler, before awaiting permission/unlock.
      const resume = context && context.state !== 'running' ? context.resume() : Promise.resolve();
      const playback = sound.play();
      unlockTimer = setTimeout(() => {
        if (ticket === attempt && wanted && (sound.paused || (context && context.state !== 'running'))) showHelp(explain());
      }, 1200);
      return Promise.all([resume, playback]).then(() => {
        if (ticket !== attempt || !wanted) return false;
        if (context && context.state !== 'running') { showHelp(explain()); return false; }
        clearTimeout(unlockTimer); hideHelp(); sync(); return true;
      }).catch(error => {
        if (ticket !== attempt) return false;
        clearTimeout(unlockTimer); sound.pause(); wanted = false; preview = false;
        if (error?.name !== 'AbortError') showHelp(explain(error));
        sync(); return false;
      });
    } catch (error) {
      wanted = false; preview = false; showHelp(explain(error)); sync();
      return Promise.resolve(false);
    }
  }
  function retry() {
    if (sound.error) sound.load();
    const inGate = Boolean(window.GearwellGate?.busy);
    return play({ position: inGate ? window.GearwellGate.playhead : 0, manual: !inGate, enable: true });
  }
  async function chooseSpeaker() {
    if (!canChoose) return;
    try {
      // This is the browser's native speaker-selection permission request.
      const choice = await navigator.mediaDevices.selectAudioOutput();
      prepareGraph();
      if (context) await context.setSinkId(choice.deviceId);
      else await sound.setSinkId(choice.deviceId);
      outputName = choice.label || 'Selected speaker'; sync();
      await retry();
    } catch (error) {
      if (error?.name !== 'AbortError') showHelp('Speaker selection was not allowed or the output is unavailable. You can still use your device’s default audio output; check browser sound permissions and try again.');
    }
  }
  toggle.addEventListener('click', () => {
    sound.muted = !sound.muted; sync();
    if (!sound.muted && window.GearwellGate?.busy) retry();
  });
  test.addEventListener('click', () => preview && wanted ? stop() : play({ manual: true, enable: true }));
  document.querySelectorAll('[data-enable-audio]').forEach(button => button.addEventListener('click', retry));
  chooseButtons.forEach(button => { button.hidden = !canChoose; button.addEventListener('click', chooseSpeaker); });
  sound.addEventListener('ended', () => { wanted = false; preview = false; sync(); });
  sound.addEventListener('error', () => { if (wanted) showHelp(explain()); });
  window.addEventListener('pagehide', stop);
  sync();
  window.GearwellAudio = Object.freeze({ play, stop });
})();
