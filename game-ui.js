(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  let model = null, atlas = null, connected = false, lastContext = '', drive = null;
  const pending = new Map(), widgets = new Map();
  const make = (tag, text, cls) => { const el = document.createElement(tag); if (text) el.textContent = text; if (cls) el.className = cls; return el; };
  function send(data) {
    flush();
    if (window.NottController) window.NottController.command(data);
  }
  function flush() {
    for (const [id, item] of pending) { clearTimeout(item.timer); window.NottController?.command({action:'control', id, value:item.value}); }
    pending.clear();
  }
  const bar = make('div', '', 'game-shortcuts');
  [['Phone / rides','phone'],['Map','map'],['Characters','characters'],['Camera','camera'],['More','more']].forEach(([title, action]) => {
    const b = make('button',title); b.type='button'; b.dataset.command=action;
    b.onclick=() => action==='more' ? openSheet() : send({action}); bar.appendChild(b);
  });
  document.querySelector('.field').appendChild(bar);
  const sheet=make('section','','remote-sheet hidden'); sheet.id='gameMenu'; sheet.setAttribute('aria-label','Live game menu');
  const head=make('header'), title=make('h2','Game controls'), back=make('button','Back to game');
  back.onclick=()=>{ if(model && model.context!=='play') send({action:'back'}); else sheet.classList.add('hidden'); };
  head.append(title,back);
  const status=make('p','Connect to the game to use its menus.','remote-status'); status.setAttribute('aria-live','polite');
  const shortcuts=make('nav','','remote-shortcuts');
  [['Phone / rides','phone'],['City map','map'],['Characters','characters'],['Call ride','hail'],['Skip ride','skip'],['Flight height','altitude']].forEach(([label,action])=>{const b=make('button',label); b.onclick=()=>send({action}); shortcuts.appendChild(b);});
  const mapBox=make('div','','remote-map hidden'), canvas=make('canvas'); canvas.width=800;canvas.height=480;canvas.setAttribute('aria-label','City map. Tap a destination, drag to pan.');
  const mapHelp=make('p','Tap a place to select it. Drag to pan. Use + and − below to zoom.');
  mapBox.append(canvas,mapHelp);
  const rows=make('div','','remote-rows'), help=make('p','△ Interact / board / request stop · □ Jump · ○ Punch · × Run / handbrake · L1 Guard · R1 Heavy punch · L2 Reverse · R2 Accelerate','remote-help');
  const extra=make('div','','remote-shortcuts');
  [['Fold arms','fold_arms'],['Cancel activity','cancel_action']].forEach(([label,action])=>{const b=make('button',label);b.onclick=()=>send({action:'game_action',value:action});extra.appendChild(b);});
  sheet.append(head,status,shortcuts,mapBox,rows,extra,help);document.body.appendChild(sheet);
  function openSheet(){ document.querySelectorAll('.shade').forEach(e=>e.classList.add('hidden')); sheet.classList.remove('hidden'); }
  function control(row,value){send({action:row.kind==='character'?'character':'control',id:row.id,value});}
  function createWidget(row){
    const wrap=make('div','','remote-row'), label=make('label'), field=make(row.kind==='select'?'select':row.kind==='text'?'input':row.kind==='label'?'p':row.kind==='tabs'?'div':'button');
    wrap.appendChild(label);wrap.appendChild(field);
    return {wrap,label,field,options:''};
  }
  function renderRows(data){
    const alive=new Set();
    data.forEach((row,i)=>{
      const key=String(row.id ?? 'label-'+i)+'/'+row.kind;alive.add(key);
      let w=widgets.get(key);if(!w){w=createWidget(row);widgets.set(key,w);}
      if(rows.children[i]!==w.wrap)rows.insertBefore(w.wrap,rows.children[i]||null);
      w.label.hidden=true;const f=w.field;f.disabled=!!row.disabled;
      if(row.kind==='label'){f.textContent=row.text;}
      else if(row.kind==='text'){
        f.type='text';f.autocomplete='off';f.placeholder=row.text;f.maxLength=row.max>0?row.max:256;f.setAttribute('aria-label',row.text||'Game text');
        if(document.activeElement!==f&&!pending.has(row.id))f.value=row.value;
        f.oninput=()=>{const old=pending.get(row.id);if(old)clearTimeout(old.timer);const item={value:f.value};item.timer=setTimeout(()=>flush(),180);pending.set(row.id,item);};
        f.onchange=flush;
      }else if(row.kind==='select'){
        const key=JSON.stringify(row.options);
        if(w.options!==key){f.replaceChildren(...row.options.map((o,index)=>{const opt=make('option',o.text);opt.value=index;opt.disabled=o.disabled;return opt;}));w.options=key;}
        if(document.activeElement!==f)f.value=row.value;
        f.setAttribute('aria-label',row.text||'Select a game option');f.onchange=()=>control(row,Number(f.value));
      }else if(row.kind==='tabs'){
        f.className='remote-tabs'; f.replaceChildren(...row.options.map((o,index)=>{const b=make('button',o.text);b.disabled=o.disabled;b.classList.toggle('selected',index===row.value);b.onclick=()=>control(row,index);return b;}));
      }else{
        f.type='button';f.textContent=(row.kind==='toggle'?(row.value?'✓ ':'○ '):'')+row.text;
        f.classList.toggle('selected',!!row.selected);f.onclick=()=>control(row,row.kind==='character'?row.id:!row.value);
      }
    });
    for(const [key,w] of widgets)if(!alive.has(key)){w.wrap.remove();widgets.delete(key);}
  }
  const ctx=canvas.getContext('2d');
  function drawMap(){
    if(!model?.map)return;const m=model.map,span=3000/m.zoom,w=canvas.width,h=canvas.height;
    ctx.fillStyle='#293035';ctx.fillRect(0,0,w,h);
    if(atlas?.complete)ctx.drawImage(atlas,(m.center[0]-span/2+1500)/3000*1024,(m.center[1]-span/2+1500)/3000*1024,span/3000*1024,span/3000*1024,0,0,w,h);
    const project=p=>[(p[0]-m.center[0])/span*w+w/2,(p[1]-m.center[1])/span*h+h/2];
    ctx.strokeStyle='#a6dfff';ctx.lineWidth=4;ctx.beginPath();m.route.forEach((p,i)=>{const q=project(p);i?ctx.lineTo(...q):ctx.moveTo(...q);});ctx.stroke();
    ctx.font='13px system-ui';
    (m.markers||[]).forEach(p=>{const q=project(p);ctx.fillStyle='#e5c583';ctx.fillRect(q[0]-2,q[1]-2,4,4);if(m.zoom>3)ctx.fillText(p[2],q[0]+5,q[1]-5);});
    [[m.destination,'#d4a1ff',7],[m.player,'white',6]].forEach(([p,color,r])=>{if(!p.length)return;const q=project(p);ctx.fillStyle=color;ctx.beginPath();ctx.arc(...q,r,0,Math.PI*2);ctx.fill();});
    ctx.fillStyle='white';ctx.fillText('N ↑',12,22);mapHelp.textContent=m.selected+' · Tap to select; drag to pan.';
  }
  let start=null;
  canvas.onpointerdown=e=>{start={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);};
  canvas.onpointerup=e=>{
    if(!start||start.id!==e.pointerId)return;const r=canvas.getBoundingClientRect(),dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;
    if(Math.hypot(dx,dy)>8)send({action:'map_pan',x:dx/r.width,y:dy/r.height});
    else send({action:'map_pick',x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height});
  };
  canvas.onpointercancel=()=>{start=null;};
  window.addEventListener('nott-ui',e=>{
    const data=e.detail;if(data.t==='atlas'){atlas=new Image();atlas.onload=drawMap;atlas.src=data.image;return;}
    if(data.t!=='ui')return;model=data;
    const driving=data.mode==='Driving';if(drive!==driving){drive=driving;window.dispatchEvent(new CustomEvent('nott-driving',{detail:driving}));}
    $('mode').textContent=data.character+' · '+data.mode;
    const captions={TRIANGLE:data.mode.includes('passenger')?'Stop / exit':'Interact',SQUARE:'Jump',CIRCLE:'Punch',CROSS:driving?'Handbrake':'Run',L1:'Guard',R1:'Heavy',L2:'Reverse',R2:'Accelerate'};
    document.querySelectorAll('[data-control]').forEach(b=>{b.dataset.caption=captions[b.dataset.control];b.setAttribute('aria-label',captions[b.dataset.control]);});
    if(data.context!=='play'&&lastContext!==data.context)openSheet();
    if(data.context==='play'&&lastContext!=='play'&&lastContext!=='')sheet.classList.add('hidden');
    lastContext=data.context;title.textContent={phone:'City phone',map:'City map',characters:'Choose character',conversation:'Conversation',play:'Game controls'}[data.context]||'Game controls';
    status.textContent=data.character+' · '+data.mode+'\n'+data.prompt;
    mapBox.classList.toggle('hidden',data.context!=='map');renderRows(data.rows||[]);drawMap();
  });
  window.addEventListener('nott-link',e=>{
    connected=e.detail;bar.querySelectorAll('button').forEach(b=>b.disabled=!connected&&b.dataset.command!=='more');
    shortcuts.querySelectorAll('button').forEach(b=>b.disabled=!connected);extra.querySelectorAll('button').forEach(b=>b.disabled=!connected);
    if(!connected){model=null;lastContext='';rows.replaceChildren();widgets.clear();pending.forEach(i=>clearTimeout(i.timer));pending.clear();status.textContent='Not connected. Connect to the game first.';mapBox.classList.add('hidden');}
  });
  window.dispatchEvent(new CustomEvent('nott-link',{detail:false}));
})();
