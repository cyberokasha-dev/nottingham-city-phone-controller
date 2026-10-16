(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var TIMEOUT_MS = 15000;
  var peer = null, conn = null, timer = null, sender = null, linked = false, connectionGeneration=0;
  var state = { x: 0, y: 0, b: {}, lx: 0, ly: 0, cc: 0 };
  var last = '', lastSent = 0, sequence = 0, context='play', cursorMode=false, pendingPointer={x:0,y:0};
  window.NottController = { command: function (data) { if (!linked || !conn || !conn.open) return; if(['phone','map','characters','screen','play','back','text_input'].includes(data.action))sendNeutral();conn.send(Object.assign({}, data, {t:'cmd', seq:++sequence})); } };
  function showStick(){window.dispatchEvent(new CustomEvent('nott-stick',{detail:{x:state.x,y:state.y}}));}
  function sendNeutral(){state.b={};state.x=0;state.y=0;state.lx=0;state.ly=0;pendingPointer={x:0,y:0};showStick();send(true);}
  function linkEvent(up) { window.dispatchEvent(new CustomEvent('nott-link', {detail:up})); }

  function setError(text) { $('error').textContent = text || ''; }
  function badge(text, ok) {
    var b = $('linkBadge');
    if (!b) {
      b = document.createElement('span');
      b.id = 'linkBadge';
      b.style.cssText = 'font:600 12px system-ui,sans-serif;padding:6px 10px;border-radius:999px;margin-right:8px;align-self:center';
      var nav = document.querySelector('.top nav');
      if (nav) nav.insertBefore(b, nav.firstChild);
    }
    b.textContent = text;
    b.style.background = ok ? '#123d2a' : '#3a2a10';
    b.style.color = ok ? '#6cdfa1' : '#ffd37a';
  }
  function cleanup() {
    connectionGeneration++;linked=false;
    clearTimeout(timer);
    clearInterval(sender);
    state.b = {}; state.x = 0; state.y = 0; state.lx = 0; state.ly = 0;
    last = ""; sequence = 0; showStick(); linkEvent(false);
    sender = null;context='play';cursorMode=false;pendingPointer={x:0,y:0};
    var oldConn = conn, oldPeer = peer;
    conn = null; peer = null;
    try { if (oldConn) oldConn.close(); } catch (e) {}
    try { if (oldPeer) oldPeer.destroy(); } catch (e) {}
  }
  function failed(message) {
    cleanup();
    badge('Not connected', false);
    setError(message);
    $('connectModal').classList.remove('hidden');
    $('pair').disabled = false;
  }
  function send(force) {
    if (!linked || !conn || !conn.open) return;
    if(pendingPointer.x||pendingPointer.y){
      var dx=Math.max(-.25,Math.min(.25,pendingPointer.x)),dy=Math.max(-.25,Math.min(.25,pendingPointer.y));pendingPointer.x-=dx;pendingPointer.y-=dy;
      try{conn.send({t:'cmd',seq:++sequence,action:'pointer_move',x:dx,y:dy});}catch(e){}
    }
    var names = Object.keys(state.b);
    var packet = { t: 's', x: Math.round(state.x * 100) / 100, y: Math.round(state.y * 100) / 100, b: names, lx: Math.round(state.lx), ly: Math.round(state.ly), cc: state.cc };
    var key = JSON.stringify([packet.x, packet.y, packet.b, packet.cc]);
    var now = Date.now();
    var moving = packet.lx !== 0 || packet.ly !== 0;
    if (force || moving || key !== last || now - lastSent > 250) {
      try { conn.send(packet); } catch (e) { return; }
      last = key; lastSent = now;
      state.lx = 0; state.ly = 0;
    }
  }
  async function connect(code) {
    cleanup();
    const attempt=connectionGeneration;
    $('pair').disabled=true;
    code=String(code).toUpperCase().replace(/[\s-]/g,'');
    const privateCode=code.length===16;
    if(privateCode&&!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{16}$/.test(code)){failed('Check your sixteen-character private city code.');return;}
    if(!privateCode&&!/^[A-Z0-9]{6}$/.test(code)){failed('Enter a six-character pairing code or your private city code.');return;}
    let peerId='nottcity-'+code;
    if(privateCode){
      if(!crypto.subtle){failed('Private-code pairing needs a secure HTTPS connection.');return;}
      try{const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code));peerId='nottcity-account-'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');}catch{failed('Could not prepare private-code pairing.');return;}
    }
    if(attempt!==connectionGeneration)return;
    setError('');
    $('pair').disabled = true;
    badge('Connecting...', false);
    if (typeof Peer === 'undefined') { failed('Could not load the connection library. Check your internet and reload.'); return; }
    peer = new Peer({ debug: 0 });
    timer = setTimeout(function () { failed('Could not reach the game. Check the code and that the game page is open.'); }, TIMEOUT_MS);
    peer.on('error', function (err) {
      var t = err && err.type;
      failed(t === 'peer-unavailable' ? 'No game found with that code. Check it and try again.' : 'Connection problem (' + (t || 'unknown') + '). Try again.');
    });
    peer.on('open', function () {
      conn = peer.connect(peerId, { reliable: true, serialization: 'json' });
      const channel=conn;
      conn.on('data', async function (d) {
        if (!d||conn!==channel) return;
        if(d.t==='challenge'&&privateCode&&/^[a-f0-9]{48}$/.test(d.nonce)){
          try{const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(code),{name:'HMAC',hash:'SHA-256'},false,['sign']);const signed=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(d.nonce));if(conn===channel)channel.send({t:'proof',proof:Array.from(new Uint8Array(signed),b=>b.toString(16).padStart(2,'0')).join('')});}catch{failed('Private-code authentication failed.');}
          return;
        }
        if(d.t==='denied'){failed('Private city code was not accepted.');return;}
        if ((d.t === 'ui' || d.t === 'atlas')&&linked) {
          if(d.t==='ui'){const next=d.context||'play';if(next!==context)sendNeutral();context=next;cursorMode=context==='screen';}
          window.dispatchEvent(new CustomEvent('nott-ui', {detail:d}));
        } else if (d.t === 'ready'&&!linked) {
          linked=true;
          if(privateCode)$('code').value='';
          clearTimeout(timer);
          $('pair').disabled = false;
          $('connectModal').classList.add('hidden');
          badge('Connected', true);
          linkEvent(true);
          send(true);
          sender = setInterval(function () { send(false); }, 33);
        } else if (d.t === 'busy') {
          failed('That game already has a phone connected.');
        }
      });
      conn.on('close', function () { if (conn) failed('Disconnected from the game.'); });
      conn.on('error', function () { failed('Lost connection to the game.'); });
    });
  }

  $('pair').onclick = function () {
    var code = $('code').value.trim().toUpperCase().replace(/[\s-]/g,'');
    if (code.length < 4) { setError('Enter the pairing code shown by your game.'); return; }
    connect(code);
  };

  // Sticks, buttons and camera swipe (visuals are handled by app.js)
  var ring = $('stick');
  var pid = null;
  function locallyBlocked(){return !!document.querySelector('.shade:not(.hidden),.game-text-entry:not(.hidden)');}
  new MutationObserver(()=>{if(locallyBlocked())sendNeutral();}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
  function stickMove(e) {
    if(locallyBlocked()){state.x=0;state.y=0;showStick();return;}
    var r = ring.getBoundingClientRect();
    var max = r.width * 0.29;
    var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    var len = Math.hypot(dx, dy);
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    state.x = dx / max; state.y = dy / max; showStick();
  }
  function stickEnd(e) { if(e&&e.pointerId!==pid)return;pid = null; state.x = 0; state.y = 0; showStick(); send(true); }
  ring.addEventListener('pointerdown', function (e) { if(pid!==null||locallyBlocked())return;e.preventDefault();pid=e.pointerId;try{ring.setPointerCapture(pid);}catch{}stickMove(e);send(true); });
  ring.addEventListener('pointermove', function (e) { if (pid === e.pointerId) stickMove(e); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) { ring.addEventListener(n, stickEnd); });

  document.querySelectorAll('[data-control]').forEach(function (el) {
    var name = el.dataset.control;
    el.addEventListener('pointerdown', function () { state.b[name] = true; send(true); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) { el.addEventListener(n, function () { delete state.b[name]; send(true); }); });
  });

  var cam = $('camera'), cx = 0, cy = 0, cp = null, tapAt = 0, moved = 0,listSwipe=0;
  cam.addEventListener('pointerdown', function (e) { cp = e.pointerId; cx = e.clientX; cy = e.clientY; moved = 0;listSwipe=0; });
  cam.addEventListener('pointermove', function (e) {
    if (cp !== e.pointerId || locallyBlocked()) return;
    var dx = e.clientX - cx, dy = e.clientY - cy;
    cx = e.clientX; cy = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    if(cursorMode){var rect=cam.getBoundingClientRect();pendingPointer.x+=dx/rect.width;pendingPointer.y+=dy/rect.height;}
    else if(context==='list'){listSwipe+=dy;if(Math.abs(listSwipe)>22){window.NottController.command({action:'nav',value:listSwipe>0?'down':'up'});listSwipe=0;}}
    else if(context==='play'){state.lx += dx; state.ly += dy;}
  });
  function camEnd(e) {
    if (cp !== e.pointerId) return;
    cp = null;
    send(true);
    if (cursorMode&&moved<12){window.NottController.command({action:'confirm'});return;}
    if (context==='play'&&moved < 12) {
      var now = Date.now();
      if (now - tapAt < 350) { state.cc += 1; tapAt = 0; } else { tapAt = now; }
    }
  }
  cam.addEventListener('pointerup',camEnd);cam.addEventListener('pointercancel',function(){cp=null;state.lx=0;state.ly=0;pendingPointer={x:0,y:0};});cam.addEventListener('lostpointercapture',function(){if(cp!==null){cp=null;state.lx=0;state.ly=0;pendingPointer={x:0,y:0};}});

  function release() { state.b = {}; cp=null;pendingPointer={x:0,y:0};stickEnd();state.lx=0;state.ly=0;send(true); }
  addEventListener('blur', release);
  addEventListener('resize',release);
  addEventListener('pagehide',release);
  document.addEventListener('visibilitychange', function () { if (document.hidden) release(); });

  // Opened from the game's QR code: ?code=ABC123
  var match = location.search.match(/[?&]code=([A-Za-z0-9-]{6})(?:&|$)/);
  badge('Not connected', false);
  if (match) {
    $('code').value = match[1].toUpperCase();
    $('connectModal').classList.remove('hidden');
    var auto = function () { connect(match[1].toUpperCase()); };
    if (document.readyState === 'complete') auto(); else window.addEventListener('load', auto, { once: true });
  }
})();
