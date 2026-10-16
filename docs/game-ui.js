(function () {
  'use strict';
  const field=document.querySelector('.field'),mode=document.getElementById('mode');
  let visualDrive=false,screenAvailable=false;
  let context='play',driving=false,screen=false,repeat=null,connected=false,entryId=null;
  function send(action,value,extra){window.NottController?.command(Object.assign({action,value},extra||{}));}
  const bar=document.createElement('nav');bar.className='game-shortcuts';bar.setAttribute('aria-label','Game screen controls');
  [['Phone','phone'],['Map','map'],['Characters','characters'],['Screen cursor','screen'],['Camera','camera'],['Back','back']].forEach(([label,action])=>{
    const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.command=action;b.onclick=()=>send(action==='screen'&&screen?'play':action);bar.appendChild(b);
  });field.appendChild(bar);
  const pad=document.createElement('nav');pad.className='menu-pad';pad.setAttribute('aria-label','Menu directions');
  const stop=()=>{clearInterval(repeat);repeat=null;};
  [['↑','up'],['←','left'],['↓','down'],['→','right']].forEach(([symbol,direction])=>{
    const b=document.createElement('button');b.type='button';b.textContent=symbol;b.dataset.direction=direction;b.setAttribute('aria-label','Menu '+direction);
    b.onpointerdown=e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId);}catch{}stop();send('nav',direction);repeat=setInterval(()=>send('nav',direction),180);};
    b.onpointerup=b.onpointercancel=b.onlostpointercapture=stop;pad.appendChild(b);
  });field.appendChild(pad);
  const hint=document.createElement('small');hint.className='menu-hint';field.appendChild(hint);
  const editor=document.createElement('form');editor.className='game-text-entry hidden';editor.setAttribute('aria-label','Type for the game');
  const label=document.createElement('label'),input=document.createElement('input');input.type='text';input.autocomplete='off';input.id='gameText';label.htmlFor=input.id;
  const apply=document.createElement('button');apply.type='submit';apply.textContent='Send to game';
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.onclick=()=>send('back');
  editor.append(label,input,apply,cancel);document.body.appendChild(editor);
  editor.onsubmit=e=>{e.preventDefault();send('text_input',input.value,{id:entryId});if(input.type==='password')input.value='';};
  input.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();send('back');}};
  function render(){
    const menu=context!=='play',point=context==='screen',list=context==='list';
    const nextVisual=driving&&!menu;if(nextVisual!==visualDrive){visualDrive=nextVisual;window.dispatchEvent(new CustomEvent('nott-driving',{detail:nextVisual}));}
    document.body.classList.toggle('game-menu-open',menu);document.body.classList.toggle('screen-cursor-mode',point);
    const cursorButton=bar.querySelector('[data-command="screen"]');cursorButton.disabled=!connected||!screenAvailable;cursorButton.title=screenAvailable?'Select buttons on the game screen':'Refresh the game to use screen cursor';
    bar.querySelector('[data-command="screen"]').setAttribute('aria-pressed',String(screen));
    bar.querySelector('[data-command="screen"]').textContent=screen?'Return to play':'Screen cursor';
    mode.textContent=!connected?'CONNECT TO GAME':point?'SCREEN CURSOR':list?'CHOOSE ON GAME SCREEN':menu?'GAME SCREEN MENU':driving?'DRIVING':'ON FOOT';
    document.getElementById('stickLabel').textContent=point?'MOVE SCREEN CURSOR':list?'BROWSE LIST':menu?'MOVE SELECTION':driving?'STEER':'MOVE / RUN';
    document.querySelector('#cameraHint span').textContent=point?'SWIPE TO MOVE SCREEN CURSOR':list?'SWIPE UP / DOWN TO BROWSE':menu?'USE STICK OR DIRECTIONS':'SWIPE TO LOOK AROUND';
    hint.textContent=!connected?'Open Connect and enter the code from the game screen':point?'Point on the game screen · × click · ○ return · L1 / R1 scroll':list?'↑ / ↓ choose · × confirm · ○ cancel · L1 / R1 jump 10':menu?'Menus stay on the game screen · × select · ○ back · L1 / R1 tabs':'Open Phone, Map or Characters · Screen cursor selects on-screen buttons';
    const labels={TRIANGLE:menu?'':'Interact',SQUARE:menu?'':'Jump',CIRCLE:menu?'Back':'Punch',CROSS:menu?'Select':driving?'Handbrake':'Run',L1:point?'Scroll up':list?'Back 10':menu?'Previous tab':'Guard',R1:point?'Scroll down':list?'Next 10':menu?'Next tab':'Heavy',L2:driving?'Reverse':'',R2:driving?'Accelerate':''};
    field.querySelectorAll('[data-control]').forEach(b=>{b.dataset.caption=labels[b.dataset.control]||'';b.setAttribute('aria-label',labels[b.dataset.control]||b.dataset.control);});
    editor.classList.toggle('hidden',context!=='text');
  }
  window.addEventListener('nott-ui',e=>{
    const d=e.detail;if(d.t!=='ui')return;
    context=d.context||'play';if(context!=='text'&&input.type==='password')input.value='';screen=!!d.screen;screenAvailable=Number(d.version)>=4;
    driving=d.mode==='Driving';
    if(d.entry&&d.entry.id!==entryId){entryId=d.entry.id;label.textContent=d.entry.label||'Type for the game';input.type=d.entry.secret?'password':'text';input.value=d.entry.secret?'':d.entry.value||'';input.maxLength=Math.min(256,d.entry.max||256);setTimeout(()=>input.focus(),0);}
    render();
  });
  window.addEventListener('nott-link',e=>{connected=!!e.detail;bar.querySelectorAll('button').forEach(b=>b.disabled=!connected);pad.querySelectorAll('button').forEach(b=>b.disabled=!connected);if(!connected){stop();driving=false;context='play';screen=false;entryId=null;render();}});
  new MutationObserver(()=>{if(document.querySelector('.shade:not(.hidden)'))stop();}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
  window.addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  window.dispatchEvent(new CustomEvent('nott-link',{detail:false}));render();
})();
