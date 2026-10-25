import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { createVRMAnimationClip, VRMAnimationLoaderPlugin, VRMLookAtQuaternionProxy } from '@pixiv/three-vrm-animation';
import { createAnimationControls } from './animation-controls.js';
import { EMOTION_ANIMATIONS, resolveEmotion } from './emotions.js';
import { createVoiceCheck } from './voice-check.js';

const canvas = document.querySelector('#avatar-canvas');
const stage = canvas.parentElement;
const status = document.querySelector('#avatar-status');
const loading = document.querySelector('#avatar-loading');
const voiceButton = document.querySelector('#voice-check');
const voiceFeedback = document.querySelector('#voice-check-status');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(29, 1, 0.05, 100);
const clock = new THREE.Clock();
const offset = new THREE.Quaternion();
const rotation = new THREE.Euler(0, 0, 0, 'YXZ');
let renderer, vrm, mixer, clips = [], currentAction;
let running = !reducedMotion.matches;
let inView = true;
let active = true;
let pointerActive = false;
let pointerX = 0, pointerY = 0, yaw = 0, pitch = 0;
let clipIndex = 0;
let cycling = false;
let cycleElapsed = 0;
let emotionMode = false;
let emotion = 'listening';
let emotionStep = 0;
let currentSpeechEmotion = 'neutral';
let beforeSpeech = null;
let clipLabels = [];
let clipSources = [];
const vrmaNames = ['Angry','Blush','Clapping','Goodbye','Jump','LookAround','Relax','Sad','Sleepy','Surprised','Thinking'];
const animationControls = createAnimationControls({onSelect(index, cycle, matchEmotion) {
  emotionMode = Boolean(matchEmotion);
  cycling = cycle;
  running = true; // Selecting a preview explicitly opts into its motion.
  if(emotionMode) setEmotion(speaking ? currentSpeechEmotion : 'listening');
  else playClip(index);
}});
let speaking = false;
let speechStarted = 0;
const voiceCheck = createVoiceCheck({
  button: voiceButton,
  allowPreview:()=>!window.GearwellInterview?.active,
  feedback: voiceFeedback,
  onBeforeSpeak() {
    window.GearwellAudio?.stop();
    if(!window.GearwellInterview?.active)stage.scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  },
  onStateChange({phase,text,emotion: spokenEmotion}) {
    document.dispatchEvent(new CustomEvent('gearwell:voice-state',{detail:{phase}}));
    if(phase==='preparing') {
      if(!beforeSpeech)beforeSpeech={index:clipIndex,cycling,emotionMode,emotion};
      currentSpeechEmotion=spokenEmotion;setEmotion('thinking');
    }
    if(phase==='idle') {
      if(window.GearwellInterview?.active)setEmotion('listening');
      else if(beforeSpeech && clips.length) {
        const previous=beforeSpeech;emotionMode=previous.emotionMode;cycling=previous.cycling;
        if(emotionMode)setEmotion(previous.emotion);else playClip(previous.index);
      }
      beforeSpeech=null;
    }
  },
  onSpeakingChange(value, details={}) {
    speaking = value;
    if(value)setEmotion(details.emotion || currentSpeechEmotion);
    speechStarted = performance.now();
    stage.dataset.speaking = String(value);
    if (!value) {
      vrm?.expressionManager?.setValue('aa', 0);
      stage.dataset.mouthOpen = '0.000';
    }
  }
});

function updateControl() {
  status.textContent = 'Gearwell';
  animationControls.update(clipIndex,cycling,emotionMode);
  stage.dataset.emotion=emotion;
  stage.dataset.animationMode=emotionMode ? 'emotion' : cycling ? 'cycle' : 'loop';
}
function playClip(index) {
  const previous = currentAction;
  clipIndex = index;
  cycleElapsed = 0;
  currentAction = mixer.clipAction(clips[index]);
  currentAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).setLoop(cycling || emotionMode ? THREE.LoopOnce : THREE.LoopRepeat, cycling || emotionMode ? 1 : Infinity).play();
  currentAction.clampWhenFinished=cycling || emotionMode;
  if (previous && previous !== currentAction) previous.crossFadeTo(currentAction, 0.45, false);
  updateControl();
}
function nextEmotionClip() {
  if(!clips.length)return;
  const pool=EMOTION_ANIMATIONS[emotion] || EMOTION_ANIMATIONS.neutral;
  const name=pool[emotionStep++ % pool.length];
  const index=clips.findIndex(clip=>clip.name===name);
  playClip(index<0 ? 0 : index);
}
function setEmotion(value) {
  emotionMode=true;cycling=false;emotion=resolveEmotion('',value);emotionStep=0;
  nextEmotionClip();
}
window.GearwellSpeech=voiceCheck;
document.addEventListener('gearwell:speak',event=>{
  const {text,emotion}=event.detail || {};
  void voiceCheck.speak(text,{emotion}).catch(error=>{if(error.name!=='AbortError')voiceFeedback.textContent=error.message;});
});
document.addEventListener('gearwell:emotion',event=>setEmotion(event.detail?.emotion || 'listening'));
document.addEventListener('gearwell:interview-started',()=>{voiceCheck.stop();voiceCheck.refresh();setEmotion('listening');});
function fail(error) {
  console.error('Examiner failed to load:', error);
  voiceCheck.stop();
  stage.dataset.avatarState = 'error';
  loading.hidden = false;
  loading.querySelector('span').textContent = 'The examiner could not load. Please refresh to retry.';
  status.textContent = 'You can still prepare your interview brief.';
  voiceCheck.setReady(false);
}
function resize() {
  const { width, height } = stage.getBoundingClientRect();
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener('pointermove', e => { pointerX=e.clientX; pointerY=e.clientY; pointerActive=true; }, {passive:true});
document.documentElement.addEventListener('pointerleave', () => { pointerActive=false; });
window.addEventListener('blur', () => { pointerActive=false; });
window.addEventListener('pointerup', e => { if(e.pointerType==='touch') pointerActive=false; }, {passive:true});
reducedMotion.addEventListener('change', () => { running=!reducedMotion.matches; updateControl(); });
document.addEventListener('visibilitychange', () => { active=inView && !document.hidden; clock.getDelta(); if(document.hidden)voiceCheck.stop(); });
window.addEventListener('pagehide', () => voiceCheck.stop());
document.addEventListener('gearwell:interview-ended', () => {voiceCheck.stop();voiceCheck.refresh();beforeSpeech=null;emotionMode=false;cycling=false;if(clips.length)playClip(0);});
document.querySelector('#interview-setup').addEventListener('submit', () => voiceCheck.stop());
new IntersectionObserver(([entry]) => { inView=entry.isIntersecting; active=inView && !document.hidden; }).observe(stage);

async function init() {
  renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:true, powerPreference:'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000,0);
  scene.add(new THREE.HemisphereLight(0xfff4de,0x81958a,2.4));
  const key = new THREE.DirectionalLight(0xfff5e4,2.5);key.position.set(1,2,3);scene.add(key);
  const fill = new THREE.DirectionalLight(0xe6c071,0.8);fill.position.set(-2,1,-1);scene.add(fill);
  resize();new ResizeObserver(resize).observe(stage);
  const loader=new GLTFLoader();loader.register(parser=>new VRMLoaderPlugin(parser));
  const [gltf,pack]=await Promise.all([
    loader.loadAsync(new URL('/assets/Interviewer.vrm',document.baseURI).href),
    fetch(new URL('/assets/idle-pack.json',document.baseURI)).then(response=>{if(!response.ok)throw new Error('Idle pack is unavailable');return response.json();})
  ]);
  vrm=gltf.userData.vrm;
  if(!vrm)throw new Error('The model contains no VRM rig.');
  VRMUtils.rotateVRM0(vrm);scene.add(vrm.scene);vrm.update(0);vrm.scene.updateMatrixWorld(true);
  const humanoid=vrm.humanoid;
  const head=humanoid.getNormalizedBoneNode('head').getWorldPosition(new THREE.Vector3());
  const bounds=new THREE.Box3().setFromObject(vrm.scene);const height=bounds.max.y-bounds.min.y;
  camera.position.set(head.x,head.y-height*0.115,height*1.32);camera.lookAt(head.x,head.y-height*0.115,0);
  if(vrm.lookAt)vrm.lookAt.autoUpdate=false;
  const hips=humanoid.getNormalizedBoneNode('hips');
  const restHips=hips.position.clone();
  if(vrm.lookAt) {
    const proxy=new VRMLookAtQuaternionProxy(vrm.lookAt);
    proxy.name='GearwellLookAtProxy';vrm.scene.add(proxy);
  }
  vrm.scene.traverse(object=>{object.frustumCulled=false;});
  mixer=new THREE.AnimationMixer(vrm.scene);
  clips=pack.clips.filter(data=>data.name==='Idle_man_1').map(data=>{
    const tracks=[];
    for(const track of data.tracks){
      const bone=humanoid.getNormalizedBoneNode(track.bone);if(!bone)continue;
      tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.uuid}.quaternion`,track.times||data.times,track.values));
    }
    if(data.hips){
      const initial=new THREE.Vector3(...data.hips.slice(0,3));
      const values=data.hips.map((value,i)=>value-initial.getComponent(i%3)+restHips.getComponent(i%3));
      tracks.push(new THREE.VectorKeyframeTrack(`${hips.uuid}.position`,data.times,values));
    }
    return new THREE.AnimationClip(data.name,data.duration,tracks);
  });
  if(!clips.length)throw new Error('Idle_man_1 is unavailable.');
  clipLabels=['Idle man 1'];clipSources=[pack.source];
  const animationLoader=new GLTFLoader();
  animationLoader.register(parser=>new VRMAnimationLoaderPlugin(parser));
  const results=await Promise.allSettled(vrmaNames.map(async name=>{
    const asset=await animationLoader.loadAsync(new URL(`./assets/vrma/${name}.vrma`,document.baseURI).href);
    const animation=asset.userData.vrmAnimations?.[0];
    if(!animation)throw new Error(`${name} has no VRM animation.`);
    const clip=createVRMAnimationClip(animation,vrm);clip.name=name;
    // Anchor the supplied root motion to this booth, preserving relative movement.
    const hipTrack=clip.tracks.find(track=>track.name===`${hips.name}.position`);
    if(hipTrack) {
      const first=Array.from(hipTrack.values.slice(0,3));
      hipTrack.values=hipTrack.values.map((value,i)=>value-first[i%3]+restHips.getComponent(i%3));
    }
    // Use the same binding keys as the existing Unity clip for clean crossfades.
    for(const track of clip.tracks) for(const boneName of Object.keys(humanoid.normalizedHumanBones)) {
      const bone=humanoid.getNormalizedBoneNode(boneName);
      if(bone && track.name.startsWith(`${bone.name}.`)) track.name=bone.uuid+track.name.slice(bone.name.length);
    }
    return clip;
  }));
  const failed=[];
  results.forEach((result,index)=>{
    if(result.status==='fulfilled') {
      clips.push(result.value);
      clipLabels.push(vrmaNames[index].replace(/([a-z])([A-Z])/g,'$1 $2'));
      clipSources.push(`Supplied VRMA / ${vrmaNames[index]}.vrma`);
    } else {failed.push(vrmaNames[index]);console.warn('Animation unavailable',vrmaNames[index],result.reason);}
  });
  animationControls.setClips(clipLabels.map(label=>({label})),failed);
  if(window.GearwellInterview?.active)setEmotion('listening');else playClip(0);mixer.update(0);vrm.update(0);
  voiceCheck.setReady(true);loading.hidden=true;stage.dataset.avatarState='ready';
  stage.dataset.speaking='false';stage.dataset.mouthOpen='0.000';
  renderer.setAnimationLoop(()=>{
    const dt=Math.min(clock.getDelta(),0.05);if(!active)return;
    const motionDt=running?dt:0;
    mixer.update(motionDt);
    if((cycling || emotionMode) && running) {
      cycleElapsed+=motionDt;
      // Long idle clips get eight seconds; short gestures play through once.
      if(cycleElapsed>=Math.min(8,clips[clipIndex].duration)) {if(emotionMode)nextEmotionClip();else playClip((clipIndex+1)%clips.length);}
    }
    // Cursor interaction is additive; all idle poses and motion come from the supplied package.
    const rect=stage.getBoundingClientRect();
    const targetYaw=running && pointerActive ? THREE.MathUtils.clamp((pointerX-rect.left-rect.width/2)/(rect.width*0.8),-1,1)*0.35:0;
    const targetPitch=running && pointerActive ? THREE.MathUtils.clamp((pointerY-rect.top-rect.height*0.3)/(rect.height*0.8),-1,1)*0.20:0;
    const ease=1-Math.exp(-dt*6);yaw=THREE.MathUtils.lerp(yaw,targetYaw,ease);pitch=THREE.MathUtils.lerp(pitch,targetPitch,ease);
    for(const [name,weight] of [['head',0.75],['neck',0.25]]){
      const bone=humanoid.getNormalizedBoneNode(name);if(!bone)continue;
      rotation.set(pitch*weight,yaw*weight,0);offset.setFromEuler(rotation);bone.quaternion.multiply(offset);
    }
    // Functional speaking motion remains active even when reduced motion stops the idle clip.
    const speechTime = (performance.now() - speechStarted) / 1000;
    const mouthOpen = speaking ? 0.68 * (0.5 - 0.5 * Math.cos(2 * Math.PI * 4.2 * speechTime)) : 0;
    vrm.expressionManager?.setValue('aa', mouthOpen);
    stage.dataset.mouthOpen = mouthOpen.toFixed(3);
    vrm.update(motionDt);renderer.render(scene,camera);
    stage.dataset.animation=clips[clipIndex].name;
    stage.dataset.animationTime=currentAction.time.toFixed(3);
    stage.dataset.animationSource=clipSources[clipIndex];
  });
}
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fail(new Error('WebGL context lost'));});
init().catch(fail);
