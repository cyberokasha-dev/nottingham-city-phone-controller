(function () {
  'use strict';
  const field=document.querySelector('.field');
  const bar=document.createElement('nav');bar.className='game-shortcuts';bar.setAttribute('aria-label','Game screen controls');
  function send(action,value){window.NottController?.command({action,value});}
  [['Phone','phone'],['Map','map'],['Characters','characters'],['Camera','camera'],['Back','back']].forEach(([label,action])=>{
    const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.command=action;b.onclick=()=>send(action);bar.appendChild(b);
  });field.appendChild(bar);
  const pad=document.createElement('nav');pad.className='menu-pad';pad.setAttribute('aria-label','Menu directions');
  let repeat=null;
  [['↑','up'],['←','left'],['↓','down'],['→','right']].forEach(([symbol,direction])=>{
    const b=document.createElement('button');b.textContent=symbol;b.dataset.direction=direction;b.setAttribute('aria-label','Menu '+direction);
    b.onpointerdown=e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId);}catch{}clearInterval(repeat);send('nav',direction);repeat=setInterval(()=>send('nav',direction),200);};
    b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>{clearInterval(repeat);repeat=null;};pad.appendChild(b);
  });field.appendChild(pad);
  const hint=document.createElement('small');hint.className='menu-hint';hint.textContent='Menus are on the game screen · × select · ○ back · L1 / R1 tabs';field.appendChild(hint);
  window.addEventListener('blur',()=>{clearInterval(repeat);repeat=null;});
  let drive=null;
  window.addEventListener('nott-ui',e=>{
    const d=e.detail;if(d.t!=='ui')return;
    const driving=d.mode==='Driving';if(drive!==driving){drive=driving;window.dispatchEvent(new CustomEvent('nott-driving',{detail:driving}));}
    const menu=d.context!=='play';document.body.classList.toggle('game-menu-open',menu);
    document.getElementById('mode').textContent=menu?'LOOK AT THE GAME SCREEN':d.mode;
    const labels={TRIANGLE:menu?'':'Interact',SQUARE:menu?'':'Jump',CIRCLE:menu?'Back':'Punch',CROSS:menu?'Select':driving?'Handbrake':'Run',L1:menu?'Previous tab':'Guard',R1:menu?'Next tab':'Heavy',L2:'Reverse',R2:'Accelerate'};
    field.querySelectorAll('[data-control]').forEach(b=>{b.dataset.caption=labels[b.dataset.control];b.setAttribute('aria-label',labels[b.dataset.control]||b.dataset.control);});
  });
  window.addEventListener('nott-link',e=>{bar.querySelectorAll('button').forEach(b=>b.disabled=!e.detail);pad.querySelectorAll('button').forEach(b=>b.disabled=!e.detail);if(!e.detail){clearInterval(repeat);repeat=null;}});
  window.dispatchEvent(new CustomEvent('nott-link',{detail:false}));
})();
