export function createAnimationControls({onSelect}) {
  const button = document.querySelector('#animation-toggle');
  const menu = document.querySelector('#animation-menu');
  const options = document.querySelector('#animation-options');
  const current = document.querySelector('#animation-current');
  const feedback = document.querySelector('#animation-feedback');
  let entries = [];
  let selection = 0;
  let cycling = false;
  function close({focus = false} = {}) {
    menu.hidden = true;
    button.setAttribute('aria-expanded','false');
    if(focus) button.focus({preventScroll:true});
  }
  function choices() { return [...menu.querySelectorAll('[role="menuitemradio"]:not(:disabled)')]; }
  function update(index, cycle, emotionMode = false) {
    selection = index; cycling = cycle;
    for(const item of menu.querySelectorAll('[data-animation]')) {
      item.setAttribute('aria-checked', String(item.dataset.animation === (emotionMode ? 'emotion' : cycling ? 'cycle' : String(index))));
    }
    current.textContent = `${emotionMode ? 'Emotion match' : cycling ? 'Cycling' : 'Looping'}: ${entries[index]?.label || 'Idle man 1'}`;
  }
  button.addEventListener('click',()=>{
    const opening = menu.hidden;
    menu.hidden = !opening;
    button.setAttribute('aria-expanded',String(opening));
    if(opening) (choices().find(item=>item.getAttribute('aria-checked') === 'true') || choices()[0])?.focus({preventScroll:true});
  });
  button.addEventListener('keydown',event=>{
    if(event.key !== 'ArrowDown') return;
    event.preventDefault(); menu.hidden=false;button.setAttribute('aria-expanded','true');choices()[0]?.focus({preventScroll:true});
  });
  menu.addEventListener('click',event=>{
    const item = event.target.closest('[data-animation]');
    if(!item || item.disabled) return;
    const cycle = item.dataset.animation === 'cycle';
    const emotionMode = item.dataset.animation === 'emotion';
    const index = cycle || emotionMode ? 0 : Number(item.dataset.animation);
    onSelect(index,cycle,emotionMode);close({focus:true});
  });
  menu.addEventListener('keydown',event=>{
    const items = choices();
    const index = items.indexOf(document.activeElement);
    let next;
    if(event.key === 'ArrowDown') next=(index+1)%items.length;
    if(event.key === 'ArrowUp') next=(index-1+items.length)%items.length;
    if(event.key === 'Home') next=0;
    if(event.key === 'End') next=items.length-1;
    if(event.key === 'Escape') {event.preventDefault();event.stopPropagation();close({focus:true});return;}
    if(event.key === 'Tab') {close();return;}
    if(next !== undefined) {event.preventDefault();items[next]?.focus({preventScroll:true});}
  });
  document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target) && !button.contains(event.target))close();});
  document.addEventListener('gearwell:interview-ended',()=>close());
  document.querySelector('#interview-setup').addEventListener('submit',()=>close());
  return Object.freeze({
    update,close,
    setClips(data,failed = []) {
      entries = data;options.replaceChildren();
      data.forEach((entry,index)=>{
        const item=document.createElement('button');item.type='button';item.className='animation-choice';item.dataset.animation=String(index);item.setAttribute('role','menuitemradio');item.setAttribute('aria-checked','false');item.textContent=entry.label;options.append(item);
      });
      feedback.textContent=failed.length ? `Could not load: ${failed.join(', ')}. Refresh to retry.` : `${data.length} animations · select one to loop it.`;
      button.disabled=false;update(selection,cycling);
    }
  });
}
