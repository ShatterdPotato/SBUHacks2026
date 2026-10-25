// Gearwell handoff c8a4411. Keep portal IDs stable; controllers own this DOM.
export const shellHtml = `
<div class="wrap" id="landing-view">
<header>
  <a class="logo" href="#top" id="top"><svg width="56" height="56" viewBox="0 0 40 40" aria-hidden="true"><path class="lg" fill="#c8963e"/><circle cx="20" cy="20" r="6" fill="#21180e"/></svg>CadenceAI</a>
  <nav><a class="hide" href="#how">How it works</a><a href="#setup">Get started</a></nav>
</header>

<main>
<div class="hero">
  <div id="setup">
    <span class="eyebrow">A little preparation. A better interview.</span>
    <h1>Interviews that run like clockwork.</h1>
    <p>Meet your next interview with confidence. Bring your resume, tell us the role, and get ready to practice with your virtual examiner.</p>
    <div id="gearwell-setup-slot"></div>
  </div>
  <div class="examiner-stage" role="group" aria-label="Interactive 3D interviewer">
  <canvas id="avatar-canvas" role="img" aria-label="Gearwell, your 3D interviewer. Move your cursor to turn the examiner’s head."></canvas>
  <div id="avatar-loading" class="avatar-loading" role="status"><span>Preparing your examiner…</span></div>
  <svg class="machine" viewBox="0 0 400 360" role="img" aria-label="Decorative brass gears and pressure gauge">
    <g fill="#8a5f1a" stroke="#c8963e" stroke-width="3">
      <g class="spin"><path id="gA"/></g><g class="spin r"><path id="gB"/></g><g class="spin"><path id="gC"/></g>
    </g>
    <circle cx="200" cy="190" r="104" fill="#b07c2c" stroke="#e6c071" stroke-width="6"/>
    <circle cx="200" cy="190" r="86" fill="#f1e6c8" stroke="#5a3b22" stroke-width="4"/>
    <path d="M128 190A72 72 0 0 1 272 190" fill="none" stroke="#5a3b22" stroke-width="3"/>
    <path d="M244 140A72 72 0 0 1 272 190" fill="none" stroke="#b4562c" stroke-width="8"/>
    <g stroke="#5a3b22" stroke-width="3"><path d="M200 126v12M155 145l8 8M245 145l-8 8M136 190h12M252 190h12"/></g>
    <text x="200" y="232" text-anchor="middle" font-family="IM Fell English,serif" font-size="20" fill="#5a3b22">Confidence</text>
    <g class="needle"><path d="M200 190L200 124" stroke="#8a2a1a" stroke-width="4" stroke-linecap="round"/></g>
    <circle cx="200" cy="190" r="9" fill="#5a3b22"/>
    <g fill="#e6c071"><circle cx="110" cy="118" r="4"/><circle cx="290" cy="118" r="4"/><circle cx="110" cy="262" r="4"/><circle cx="290" cy="262" r="4"/></g>
  </svg>
  <div class="examiner-caption">
    <span class="examiner-title">Meet your examiner</span>
    <span id="avatar-status" aria-live="polite">Loading the interview room…</span>
    <div class="examiner-controls" id="examiner-controls">
      <div class="examiner-control-buttons"><button id="voice-check" class="tracking-toggle" type="button" aria-describedby="voice-check-status" disabled>Preview voice · ElevenLabs</button><button id="animation-toggle" class="tracking-toggle" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="animation-menu" disabled>Animations ▾</button></div>
      <div id="animation-menu" class="animation-menu" role="menu" aria-label="Animation previews" hidden>
        <p class="animation-menu-title">Animation previews</p>
        <button type="button" class="animation-choice" role="menuitemradio" aria-checked="false" data-animation="emotion">Match interview emotion</button>
        <button type="button" class="animation-choice" role="menuitemradio" aria-checked="false" data-animation="cycle">Play full cycle</button>
        <hr role="separator"><div id="animation-options" role="group" aria-label="Individual animations"></div>
        <p id="animation-current" class="animation-current" role="status"></p><p id="animation-feedback" class="animation-menu-note"></p>
      </div>
      <span id="voice-check-status" class="voice-feedback" role="status"></span>
    </div>
  </div>
  </div>
</div>

<section id="chamber" aria-labelledby="readout-heading"><div class="readout"><div class="readout-head"><h2 id="readout-heading">A well-calibrated interview.</h2><span class="preview-tag">Report preview · not scored</span></div><p class="lede">Three qualities to practice. Your future interview report will help you see where to improve.</p><div class="gauges"><div class="g"><svg viewBox="0 0 160 112" aria-hidden="true"><path d="M16 87A64 64 0 0 1 144 87" fill="#171109" stroke="#725a35" stroke-width="9"/><path d="M16 87A64 64 0 0 1 144 87" class="dial-zone" fill="none" stroke-width="6"/><path d="M26 87A54 54 0 0 1 134 87" stroke="#e4bd6c" stroke-width="1" fill="none"/><g stroke="#fff0c4" stroke-width="2"><path d="M23 87h7m5-35 6 4m39-33v8m45 21-6 4m18 31h-7"/></g><path d="M80 87V42" class="dial-needle" stroke-width="3" stroke-linecap="round"/><circle cx="80" cy="87" r="7" class="dial-hub"/><circle cx="80" cy="87" r="3" fill="#21180e"/></svg><strong>Clarity</strong><span>Make your answers clear and easy to follow.</span></div><div class="g"><svg viewBox="0 0 160 112" aria-hidden="true"><path d="M16 87A64 64 0 0 1 144 87" fill="#171109" stroke="#725a35" stroke-width="9"/><path d="M16 87A64 64 0 0 1 144 87" class="dial-zone" fill="none" stroke-width="6"/><path d="M26 87A54 54 0 0 1 134 87" stroke="#e4bd6c" stroke-width="1" fill="none"/><g stroke="#fff0c4" stroke-width="2"><path d="M23 87h7m5-35 6 4m39-33v8m45 21-6 4m18 31h-7"/></g><path d="M80 87V42" class="dial-needle" stroke-width="3" stroke-linecap="round"/><circle cx="80" cy="87" r="7" class="dial-hub"/><circle cx="80" cy="87" r="3" fill="#21180e"/></svg><strong>Confidence</strong><span>Speak with assurance and a steady delivery.</span></div><div class="g"><svg viewBox="0 0 160 112" aria-hidden="true"><path d="M16 87A64 64 0 0 1 144 87" fill="#171109" stroke="#725a35" stroke-width="9"/><path d="M16 87A64 64 0 0 1 144 87" class="dial-zone" fill="none" stroke-width="6"/><path d="M26 87A54 54 0 0 1 134 87" stroke="#e4bd6c" stroke-width="1" fill="none"/><g stroke="#fff0c4" stroke-width="2"><path d="M23 87h7m5-35 6 4m39-33v8m45 21-6 4m18 31h-7"/></g><path d="M80 87V42" class="dial-needle" stroke-width="3" stroke-linecap="round"/><circle cx="80" cy="87" r="7" class="dial-hub"/><circle cx="80" cy="87" r="3" fill="#21180e"/></svg><strong>Knowledgeability</strong><span>Show a solid understanding of your field.</span></div></div></div></section>

<section id="how">
  <div class="wrap" style="padding:0">
    <h2>How an interview works</h2>
    <p class="lede">Three steps, start to finish.</p>
    <ol class="steps">
      <li><h3>Bring your experience</h3><p>Add your resume to give your interview a starting point. You can also continue without one.</p></li>
      <li><h3>Set your direction</h3><p>Tell us what you’re applying for: the role, company, or a few details from the job description.</p></li>
      <li><h3>Prepare for your close-up</h3><p>Step through the mechanical gate and meet Gearwell in your interview room.</p></li>
    </ol>
  </div>
</section>
</main>

<footer>Practice with adaptive questions, local recording, and evidence-based feedback. Cloud text processing requires your consent.<br>Interviewer model credit: pixiv VRoid Project.</footer>
</div>

<main id="interview-room" class="interview-room" aria-labelledby="room-heading" data-state="idle" hidden>
  <div class="room-header">
    <div><div class="room-brand">Cadence</div><h1 id="room-heading" class="room-heading">Interview room</h1><p id="room-role" class="room-role"></p></div>
    <div id="room-controls-mount"></div><button id="admin-cancel" class="admin-cancel" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>Discard session</button>
  </div>
  <div class="room-grid">
    <div class="participant-tile examiner-tile" role="group" aria-label="Gearwell, interviewer">
      <div id="room-avatar-mount" class="room-avatar-mount"></div>
      <div class="participant-label"><span class="participant-name">Gearwell<small>Interviewer</small></span><span class="participant-state">Virtual examiner</span></div>
    </div>
    <div class="participant-tile interviewee-tile" role="group" aria-label="Interviewee, camera off">
      <video id="interviewee-video" autoplay muted playsinline aria-label="Interviewee webcam" hidden></video>
      <div class="participant-label"><span class="participant-name">Interviewee<small>You</small></span><span id="interviewee-camera-state" class="participant-state">Camera off</span></div>
    </div>
  </div>
  <div id="gearwell-session-slot" class="gearwell-content"></div><div class="room-footer"><div class="room-footer-meta"><span class="room-preview">Live interview · recording stays on this device</span><span id="room-camera-note">Your camera is off.</span></div></div>
</main>

<dialog id="mechanical-gate" class="mechanical-gate" aria-labelledby="gate-status" aria-describedby="gate-description" data-state="idle">
  <div class="gate-stage"><div class="gate-door gate-left" aria-hidden="true"><span class="gate-brace"></span><span class="gate-brace"></span><span class="gate-piston"></span><svg class="gate-cog" viewBox="0 0 100 100"><path data-gate-cog/></svg><svg class="gate-cog small" viewBox="0 0 100 100"><path data-gate-cog/></svg></div><div class="gate-door gate-right" aria-hidden="true"><span class="gate-brace"></span><span class="gate-brace"></span><span class="gate-piston"></span><svg class="gate-cog" viewBox="0 0 100 100"><path data-gate-cog/></svg><svg class="gate-cog small" viewBox="0 0 100 100"><path data-gate-cog/></svg></div>
    <div class="gate-frame top" aria-hidden="true"></div><div class="gate-frame bottom" aria-hidden="true"></div>
    <div class="gate-brand" aria-hidden="true">Cadence · Examination chamber</div>
    <div class="gate-steam left" aria-hidden="true"></div><div class="gate-steam right" aria-hidden="true"></div>
    <div class="gate-center">
      <div class="gate-medallion" aria-hidden="true"><span class="gate-monogram">G</span><svg class="gate-progress-ring" viewBox="0 0 100 100"><circle class="gate-progress-track" cx="50" cy="50" r="46"/><circle class="gate-progress-value" cx="50" cy="50" r="46" pathLength="100"/></svg></div>
      <p class="gate-kicker">A moment, while the gears turn</p>
      <h2 id="gate-status" aria-live="polite">Preparing the chamber</h2>
      <p id="gate-description" class="gate-subtitle">Precision takes a little winding.</p>
      <div class="gate-audio-notice audio-help" data-audio-help role="status" hidden><p data-audio-help-text></p><div><button class="audio-action" type="button" data-enable-audio>Enable sound</button><button class="audio-action" type="button" data-choose-speaker hidden>Choose speaker</button></div></div>
      <div id="gate-progress" role="progressbar" aria-label="Chamber preparation" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>
    </div>
    <button class="gate-cancel gate-sound-toggle" id="gate-sound-toggle" type="button" aria-label="Gate sound" aria-pressed="true">Sound on</button>
    <button class="gate-cancel" id="gate-cancel" type="button" autofocus>Cancel</button>
  </div>
</dialog>

<audio id="gate-audio" src="/assets/mechanical-gate.wav?v=gears-25-door-slam" preload="auto" aria-hidden="true"></audio>




<main id="gearwell-report-slot" class="gearwell-content wrap" hidden></main>`;
