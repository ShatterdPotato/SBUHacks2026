(() => {
  const room = document.querySelector('#interview-room');
  const landing = document.querySelector('#landing-view');
  const stage = document.querySelector('.examiner-stage');
  const stageHome = stage.parentElement;
  const stageSibling = stage.nextSibling;
  const mount = document.querySelector('#room-avatar-mount');
  const controls = document.querySelector('#examiner-controls');
  const controlsHome = controls.parentElement;
  const controlsSibling = controls.nextSibling;
  const controlsMount = document.querySelector('#room-controls-mount');
  const video = document.querySelector('#interviewee-video');
  const cameraState = document.querySelector('#interviewee-camera-state');
  const cameraNote = document.querySelector('#room-camera-note');
  const cameraTile = document.querySelector('.interviewee-tile');
  const cancelButton = document.querySelector('#admin-cancel');
  const role = document.querySelector('#room-role');
  let active = false;
  let scrollPosition = {x:0,y:0};
  let cameraRevision = 0;

  function clearCamera() {
    cameraRevision++;
    video.pause();
    // The interview engine supplies its authorized session stream here.
    video.srcObject?.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    video.hidden = true;
    cameraState.textContent = 'Camera off';
    cameraNote.textContent = 'Your camera is off.';
    cameraTile.setAttribute('aria-label','Interviewee, camera off');
  }
  function open({role: application = ''} = {}) {
    if(active) return;
    active = true;
    scrollPosition = {x:window.scrollX,y:window.scrollY};
    role.textContent = application;
    role.title = application;
    mount.append(stage);
    controlsMount.append(controls);
    landing.hidden = true;
    room.hidden = false;
    room.dataset.state = 'active';
    document.dispatchEvent(new Event('gearwell:interview-started'));
    window.scrollTo({left:0,top:0,behavior:'instant'});
  }
  function focus() { if(active) cancelButton.focus({preventScroll:true}); }
  function cancel({restoreFocus = true} = {}) {
    if(!active) return;
    active = false;
    clearCamera();
    window.GearwellAudio?.stop();
    document.dispatchEvent(new Event('gearwell:interview-ended'));
    controlsHome.insertBefore(controls,controlsSibling);
    stageHome.insertBefore(stage,stageSibling);
    room.hidden = true;
    room.dataset.state = 'idle';
    landing.hidden = false;
    window.scrollTo({left:scrollPosition.x,top:scrollPosition.y,behavior:'instant'});
    document.querySelector('#setup-hint').textContent = 'Interview cancelled. You can start again when you’re ready.';
    if(restoreFocus) document.querySelector('#generate-video').focus({preventScroll:true});
  }
  // The engine supplies an already-authorized MediaStream; do not request a second one.
  async function setIntervieweeStream(stream) {
    if(!active) throw new Error('Open an interview before attaching a webcam stream.');
    if(video.srcObject===stream)return;
    clearCamera();
    if(!stream) return;
    const revision = cameraRevision;
    video.srcObject = stream;
    video.hidden = false;
    cameraState.textContent = 'Camera on';
    cameraNote.textContent = 'Camera preview on.';
    cameraTile.setAttribute('aria-label','Interviewee, camera on');
    try { await video.play(); }
    catch { if(active && revision === cameraRevision) cameraState.textContent = 'Camera paused'; }
  }
  cancelButton.addEventListener('click',()=>cancel());
  window.addEventListener('pagehide',()=>cancel({restoreFocus:false}));
  window.GearwellInterview = Object.freeze({open,cancel,focus,setIntervieweeStream,speak(text,options){if(!active)return Promise.reject(new Error('Start an interview first.'));return window.GearwellSpeech.speak(text,options);},get active(){return active;}});
})();
