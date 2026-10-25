(() => {
  const gate = document.querySelector('#mechanical-gate');
  const generate = document.querySelector('#generate-video');
  const status = document.querySelector('#gate-status');
  const progress = document.querySelector('#gate-progress');
  const progressValue = document.querySelector('.gate-progress-value');
  const duration = 5000;
  const messages = Object.freeze([
    'Winding the mechanism',
    'Building a head of steam',
    'Calibrating the brass gauges',
    'Engaging the clockwork',
    'Priming the pressure valves',
    'Aligning the cogwheels'
  ]);
  let loadingMessage = messages[0];
  let startedAt = 0;
  let frame = 0;
  let finishTimer = 0;
  let closeTimer = 0;
  let sealTimer = 0;
  let busy = false;
  let savedOverflow = '';
  let previousFocus;

  // Cog outlines are vector geometry; they do not require downloaded images.
  document.querySelectorAll('[data-gate-cog]').forEach(path => {
    let d=''; const teeth=14;
    for(let i=0;i<teeth;i++) for(const [r,offset] of [[37,0],[47,.16],[47,.49],[37,.66]]) {
      const a=2*Math.PI*(i+offset)/teeth;
      d+=`${d?'L':'M'}${50+Math.cos(a)*r} ${50+Math.sin(a)*r}`;
    }
    path.setAttribute('d',d+'Z M63 50 A13 13 0 1 0 37 50 A13 13 0 1 0 63 50Z');
    path.setAttribute('fill-rule','evenodd');
  });
  function syncGenerate() {
    generate.setAttribute('aria-busy',String(busy));
  }
  function paint() {
    if(!busy) return;
    const value=Math.min(100,(performance.now()-startedAt)/duration*100);
    progress.setAttribute('aria-valuenow',String(Math.round(value)));
    progressValue.style.strokeDashoffset=String(100-value);
    if(value<100) frame=requestAnimationFrame(paint);
  }
  function cleanup({completed = false} = {}) {
    window.GearwellAudio.stop();
    clearTimeout(finishTimer); clearTimeout(closeTimer); clearTimeout(sealTimer); cancelAnimationFrame(frame);
    gate.classList.remove('is-closing','is-sealed','is-opening');
    gate.dataset.state='idle';
    if(gate.open) gate.close();
    document.body.style.overflow=savedOverflow;
    busy=false;
    if(!completed) { window.GearwellInterview.cancel({restoreFocus:false}); document.dispatchEvent(new Event('gearwell:gate-cancelled')); }
    syncGenerate();
    if(completed && window.GearwellInterview.active) window.GearwellInterview.focus();
    else if(previousFocus?.isConnected) previousFocus.focus({preventScroll:true});
  }
  function openGate() {
    if(!busy) return;
    window.GearwellInterview.open({role:document.querySelector('#role-prompt').value.trim()});
    status.textContent='Opening the interview room';
    progress.setAttribute('aria-valuenow','100');
    progressValue.style.strokeDashoffset='0';
    gate.dataset.state='opening';
    gate.classList.add('is-opening');
    // Reveal the room behind the opening doors, then release the modal focus trap.
    closeTimer=setTimeout(()=>cleanup({completed:true}),matchMedia('(prefers-reduced-motion: reduce)').matches?220:900);
  }
  function start() {
    if(busy || window.GearwellInterview.active) return;
    if(!document.querySelector('#role-prompt').value.trim()) return;
    previousFocus=document.activeElement;
    savedOverflow=document.body.style.overflow;
    busy=true; syncGenerate();
    progress.setAttribute('aria-valuenow','0'); progressValue.style.strokeDashoffset='100';
    loadingMessage=messages[Math.floor(Math.random()*messages.length)];
    status.textContent=loadingMessage;
    gate.dataset.state='closing';
    document.body.style.overflow='hidden';
    gate.showModal();
    startedAt=performance.now();
    window.GearwellAudio.play();
    gate.classList.add('is-closing');
    sealTimer=setTimeout(()=>{
      if(!busy) return;
      gate.classList.add('is-sealed');gate.dataset.state='sealed';
      status.textContent=loadingMessage;
    },matchMedia('(prefers-reduced-motion: reduce)').matches?150:1150);
    frame=requestAnimationFrame(paint);
    finishTimer=setTimeout(openGate,duration);
  }
  document.querySelector('#gate-cancel').addEventListener('click',cleanup);
  gate.addEventListener('cancel',event=>{event.preventDefault();cleanup();});
  document.addEventListener('gearwell:interview-ended',syncGenerate);
  window.addEventListener('pagehide',()=>{if(busy)cleanup();});
  window.GearwellGate=Object.freeze({start,cancel:()=>cleanup(),get busy(){return busy;},get playhead(){return busy?(performance.now()-startedAt)/1000:0;}});
})();
