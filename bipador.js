/* LiveFood — BIPADOR (mesmo leitor da Mesa e do Atendimento).
   Bipador.abrir({titulo, dica, aoLer(codigo, fechar), continuo})
   - câmera do celular: leitor do próprio navegador (BarcodeDetector) e, onde não existe (iPhone,
     computador), a biblioteca ZXing carregada só quando precisa;
   - leitor USB/Bluetooth e digitação: campo "Ou digite o código" (o leitor digita e aperta Enter).
   continuo=true mantém a câmera aberta para bipar vários itens seguidos. */
(function(){
'use strict';
var FM=['qr_code','ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf'];
var B={stream:null, raf:0, zx:null, ate:0, box:null, op:null, ctx:null};
function css(){ if(document.getElementById('css-bipador')) return; var s=document.createElement('style'); s.id='css-bipador'; s.textContent=
  '.bpd{position:fixed;top:0;right:0;bottom:0;left:0;inset:0;z-index:4000;background:rgba(20,20,22,.6);display:flex;align-items:center;justify-content:center;padding:16px}'+
  '.bpd-c{width:100%;max-width:460px;background:#fff;border-radius:22px;padding:16px;box-shadow:0 30px 60px rgba(0,0,0,.3);font-family:inherit;color:#1C1C1E}'+
  '.bpd-h{display:flex;align-items:center;gap:10px;margin-bottom:10px}.bpd-h b{flex:1;font-size:18px}.bpd-x{width:40px;height:40px;border-radius:50%;border:1px solid #DFDFE4;background:#fff;font-size:16px;cursor:pointer}'+
  '.bpd-v{height:40vh;max-height:340px;min-height:180px;position:relative;border-radius:16px;overflow:hidden;background:#111}.bpd-v video{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block}.bpd-c{max-height:100%;overflow-y:auto}.bpd-i{position:relative}'+
  '.bpd-v i{position:absolute;left:12%;right:12%;top:50%;height:2px;background:#FF5A00;box-shadow:0 0 12px #FF5A00;animation:bpdL 1.6s ease-in-out infinite}@keyframes bpdL{0%,100%{transform:translateY(-40px)}50%{transform:translateY(40px)}}'+
  '.bpd-d{font-size:13.5px;color:#71717A;font-weight:600;margin:10px 2px}.bpd-e{font-size:13px;color:#B91C1C;font-weight:700;margin:8px 2px}'+
  '.bpd-m{display:flex;gap:8px}.bpd-m input{flex:1;min-width:0;min-height:52px;border-radius:14px;border:2px solid #DFDFE4;padding:0 12px;font:inherit;font-size:18px;font-weight:700;outline:none}.bpd-m input:focus{border-color:#FF5A00}.bpd-m button{min-height:52px;border-radius:14px;border:0;background:#FF5A00;color:#fff;font:inherit;font-weight:800;padding:0 18px;cursor:pointer}'+
  '.bpd-ok{margin-top:10px;border-radius:12px;background:#ECFDF3;color:#14532D;font-weight:800;font-size:14px;padding:10px 12px;display:none}';
  document.head.appendChild(s);
  var c=document.createElement('style'); c.textContent='.bpd.cheia{padding:0}.bpd.cheia .bpd-c{max-width:none;width:100%;height:100%;border-radius:0;display:flex;flex-direction:column;padding:10px}.bpd.cheia .bpd-c>*{flex:none}.bpd.cheia .bpd-v{flex:1 1 auto;height:auto;max-height:none;min-height:220px;aspect-ratio:auto}.bpd.cheia .bpd-d{display:none}'; document.head.appendChild(c); }
function som(ok){ try{ navigator.vibrate&&navigator.vibrate(ok?60:[120,60,120]); }catch(e){}
  try{ B.ctx=B.ctx||new (window.AudioContext||window.webkitAudioContext)(); var a=B.ctx; if(a.state==='suspended') a.resume(); var o=a.createOscillator(), g=a.createGain(), t=a.currentTime; o.type='square'; o.frequency.value=ok?1800:320; g.gain.setValueAtTime(.12,t); g.gain.exponentialRampToValueAtTime(.001,t+(ok?.12:.35)); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+(ok?.12:.35)); }catch(e){} }
function para(){ cancelAnimationFrame(B.raf); clearTimeout(B.raf); B.raf=0; if(B.wk){ try{ B.wk.terminate(); }catch(e){} B.wk=null; } try{ if(B.zx){ B.zx.reset(); B.zx=null; } }catch(e){} if(B.stream){ B.stream.getTracks().forEach(function(t){ t.stop(); }); B.stream=null; } }
function fechar(){ para(); if(B.box){ B.box.remove(); B.box=null; } document.removeEventListener('keydown', esc, true); if(B.tec){ document.removeEventListener('keydown', B.tec, true); B.tec=null; } }
function esc(e){ if(e.key==='Escape') fechar(); }
function faixa(t,ok){ var v=B.box&&B.box.querySelector('.bpd-v'); if(!v) return; var f=v.querySelector('.bpd-f'); if(!f){ f=document.createElement('div'); f.className='bpd-f'; f.style.cssText='position:absolute;left:0;right:0;top:0;padding:14px 10px;text-align:center;color:#fff;font-size:22px;font-weight:900'; v.appendChild(f); } f.textContent=t; f.style.background=ok?'rgba(22,163,74,.92)':'rgba(220,38,38,.92)'; f.style.display='block'; clearTimeout(B.fx); B.fx=setTimeout(function(){ f.style.display='none'; },1400); }
function erro(t){ var e=B.box&&B.box.querySelector('.bpd-e'); if(e) e.textContent=t||''; }
function lido(c){ c=String(c||'').trim(); if(!c||!B.op) return; if(Date.now()<B.ate) return; if(B.op.continuo&&c===B.ult&&Date.now()-B.ultT<4000) return;   /* a mesma comanda parada na frente da câmera não repete */
  B.ate=Date.now()+(B.op.continuo?600:1500); B.ult=c; B.ultT=Date.now();
  var r; try{ r=B.op.aoLer(c, fechar); }catch(e){ console.error(e); }
  som(r!==false); faixa(r===false?'✕ '+c:(typeof r==='string'?r:'✓ '+c), r!==false);
  if(r===false){ erro('Código '+c+' não encontrado.'); return; }
  erro(''); if(!B.op.continuo) fechar(); else { var k=B.box&&B.box.querySelector('.bpd-ok'); if(k){ k.style.display='block'; k.textContent=(typeof r==='string'?r:'Lido: '+c); } } }
function le(v){
  if('BarcodeDetector' in window){ BarcodeDetector.getSupportedFormats().then(function(s){ var det=new BarcodeDetector({formats:FM.filter(function(f){ return s.indexOf(f)>=0; })}), ult=0;
      (function loop(){ if(!B.stream) return; B.raf=requestAnimationFrame(loop); var ag=Date.now(); if(ag-ult<180||v.readyState<2) return; ult=ag; det.detect(v).then(function(r){ if(r&&r[0]&&r[0].rawValue) lido(r[0].rawValue); }).catch(function(){}); })();
    }).catch(function(){ leZx(v); }); return; }
  leZx(v);
}
/* sem o leitor do navegador (maquininha antiga, iPhone): a biblioteca ZXing lê um quadro por vez, copiado para um canvas.
   Alterna o meio da imagem e o quadro inteiro, e mostra na tela o que está fazendo (para saber onde parou, se parar). */
/* a leitura roda em segundo plano (Web Worker): a tela só copia o quadro da câmera, então a imagem não trava.
   Se o aparelho não aceitar, cai no jeito antigo (leZxTela). */
function leZx(v){
  var wk=null, meu=B.stream; try{ wk=new Worker('leitor-worker.js?v=1'); }catch(e){ wk=null; }
  if(!wk){ leZxTela(v); return; }
  var cv=document.createElement('canvas'), cx=cv.getContext('2d'), n=0, ocupado=true, vivo=true, pronto=false;
  var reserva=function(){ if(!vivo) return; vivo=false; try{ wk.terminate(); }catch(e){} if(B.wk===wk) B.wk=null; if(B.stream===meu) leZxTela(v); };
  B.wk=wk; info('Carregando o leitor…');
  wk.onerror=function(){ reserva(); };
  wk.onmessage=function(ev){
    var d=ev.data||{}; if(!vivo) return;
    if(d.falha){ reserva(); return; }
    if(d.pronto){ pronto=true; ocupado=false; return; }
    ocupado=false; B.dt=B.dt?Math.round((B.dt*3+d.ms)/4):d.ms;
    if(d.txt) lido(d.txt);
  };
  setTimeout(function(){ if(!pronto) reserva(); },8000);   /* não respondeu: usa o jeito antigo */
  (function passo(){
    if(!vivo||B.stream!==meu) return;
    var w=v.videoWidth, h=v.videoHeight;
    if(!ocupado&&v.readyState>=2&&w&&h&&Date.now()>=B.ate){
      n++;
      var forte=n%5===0, lado=Math.min(w,h), ch=forte?Math.round(h*0.5):Math.round(lado*0.8), cw=forte?w:ch, x0=Math.round((w-cw)/2), y=Math.round((h-ch)/2), k=Math.min(1,(forte?800:(n%2?400:300))/cw);
      cv.width=Math.round(cw*k); cv.height=Math.round(ch*k);
      try{
        var c0=Date.now();
        cx.drawImage(v,x0,y,cw,ch,0,0,cv.width,cv.height);
        var im=cx.getImageData(0,0,cv.width,cv.height);
        var cap=Date.now()-c0; B.cap=B.cap?Math.round((B.cap*3+cap)/4):cap;   /* tempo que a TELA gasta copiando o quadro */
        ocupado=true; wk.postMessage({buf:im.data.buffer,w:cv.width,h:cv.height,n:n,forte:forte},[im.data.buffer]);
      }catch(e){ ocupado=false; }
      info(w+'x'+h+' · '+n+' · copia '+(B.cap||0)+' ms · lê '+(B.dt||0)+' ms · 2º plano');
    }
    B.raf=setTimeout(passo,Math.max(80,(B.cap||0)*3));   /* a cópia do quadro ocupa no máximo 1/4 do tempo da tela */
  })();
}
function leZxTela(v){
  var vai=function(){
    if(!B.stream) return;
    if(!window.ZXing||!window.ZXing.DecodeHintType){ erro('Não consegui carregar o leitor neste aparelho'+(B.falhaZx?' ('+B.falhaZx+')':'')+'. Digite o código.'); return; }
    var Z=window.ZXing, hints=new Map(), leitor, rapido, cv=document.createElement('canvas'), cx=cv.getContext('2d'), n=0, falha='', meu=B.stream;
    try{
      hints.set(Z.DecodeHintType.POSSIBLE_FORMATS,[Z.BarcodeFormat.QR_CODE,Z.BarcodeFormat.CODE_128,Z.BarcodeFormat.CODE_39,Z.BarcodeFormat.EAN_13,Z.BarcodeFormat.EAN_8,Z.BarcodeFormat.ITF]);
      hints.set(Z.DecodeHintType.TRY_HARDER,true);
      leitor=new Z.MultiFormatReader(); leitor.setHints(hints);
      var hr=new Map(); hr.set(Z.DecodeHintType.POSSIBLE_FORMATS,[Z.BarcodeFormat.QR_CODE]); rapido=new Z.MultiFormatReader(); rapido.setHints(hr);
    }catch(e){ erro('O leitor não funcionou neste aparelho ('+(e.message||e.name)+'). Digite o código.'); return; }
    (function passo(){
      if(B.stream!==meu) return;
      var w=v.videoWidth, h=v.videoHeight;
      if(v.readyState>=2&&w&&h){
        n++;
        /* aparelho lento: imagem menor e so o quadrado do meio; o leitor completo entra 1 a cada 4 vezes */
        var t0=Date.now(), forte=n%5===0, lado=Math.min(w,h), ch=forte?Math.round(h*0.5):Math.round(lado*0.8), cw=forte?w:ch, x0=Math.round((w-cw)/2), y=Math.round((h-ch)/2), k=Math.min(1,(forte?800:(n%2?400:300))/cw);
        cv.width=Math.round(cw*k); cv.height=Math.round(ch*k);
        try{
          cx.drawImage(v,x0,y,cw,ch,0,0,cv.width,cv.height);
          var fonte=new Z.HTMLCanvasElementLuminanceSource(cv);
          var bin=n%2?new Z.HybridBinarizer(fonte):new Z.GlobalHistogramBinarizer(fonte);
          var r=(forte?leitor:rapido).decodeWithState(new Z.BinaryBitmap(bin));
          if(r&&r.getText()) lido(r.getText());
        }catch(e){ if(e&&!/NotFound|Checksum|Format/.test((e.getKind&&e.getKind())||e.name||'')&&!(Z.NotFoundException&&e instanceof Z.NotFoundException)) falha=e.message||e.name||'erro'; }
        var dt=Date.now()-t0; B.dt=B.dt?Math.round((B.dt*3+dt)/4):dt;
        info('Lendo '+w+'x'+h+' · '+n+' · '+B.dt+' ms'+(falha?' · '+String(falha).slice(0,60):''));
      }
      /* a leitura ocupa no maximo 1/3 do tempo: a imagem da camera nao trava; depois de ler, uma pausa */
      B.raf=setTimeout(passo,Date.now()<B.ate?300:Math.max(60,Math.round((B.dt||0)*0.8)));
    })();
  };
  if(window.ZXing&&window.ZXing.DecodeHintType){ vai(); return; }
  info('Carregando o leitor…');
  window.addEventListener('error',function(ev){ if(/zxing/i.test(String(ev.filename||''))) B.falhaZx=String(ev.message||'').slice(0,80); });
  var s=document.createElement('script'); s.src='zxing.js?v=2'; s.onload=vai; s.onerror=function(){ erro('Não consegui carregar o leitor (internet). Digite o código.'); }; document.head.appendChild(s);
}
/* câmera de TRÁS: aparelho antigo ignora o pedido "environment" e abre a da frente, então escolhemos pela lista de câmeras.
   O botão "Trocar câmera" (proxima=true) passa para a outra e o aparelho guarda a escolha. */
function camPede(c){
  var md=navigator.mediaDevices, velha=navigator.webkitGetUserMedia||navigator.getUserMedia;
  if(md&&md.getUserMedia) return md.getUserMedia(c);
  return new Promise(function(ok,no){ if(!velha){ no({name:'SemCamera'}); return; } velha.call(navigator,c,ok,no); });
}
function camPara(st){ st.getTracks().forEach(function(t){ t.stop(); }); }
function camId(st){ var t=st.getVideoTracks()[0]; try{ return (t.getSettings&&t.getSettings().deviceId)||''; }catch(e){ return ''; } }
function camAbre(id){ return camPede({video:{deviceId:{exact:id}},audio:false}).catch(function(){ return camPede({video:{optional:[{sourceId:id}]},audio:false}); }); }
/* navegador antigo (ex.: Chrome 52 da maquininha): lista as câmeras por MediaStreamTrack.getSources e pede a escolhida por sourceId */
function fontesAntigas(){
  return new Promise(function(ok){
    var T=window.MediaStreamTrack, fim=false; if(!T||!T.getSources){ ok([]); return; }
    setTimeout(function(){ if(!fim){ fim=true; ok([]); } },1500);
    try{ T.getSources(function(l){ if(fim) return; fim=true; ok((l||[]).filter(function(s){ return s.kind==='video'; })); }); }catch(e){ fim=true; ok([]); }
  });
}
function cameraAntiga(fontes,proxima){
  var guardada=''; try{ guardada=localStorage.getItem('lf_cam_ant')||''; }catch(e){}
  var ids=fontes.map(function(s){ return s.id; }), q=ids.indexOf(guardada), i;
  if(q<0){ for(i=0;i<fontes.length;i++) if(/environment/i.test(fontes[i].facing||'')||/back|rear|traseira/i.test(fontes[i].label||'')){ q=i; break; } }
  if(q<0) q=fontes.length>1?1:0;
  if(proxima) q=(q+1)%fontes.length;
  try{ localStorage.setItem('lf_cam_ant',ids[q]); }catch(e){}
  info('Câmeras: '+fontes.length+' ('+fontes.map(function(s){ return s.facing||s.label||'sem nome'; }).join(', ')+') · usando a '+(q+1));
  return camPede({video:{mandatory:{sourceId:ids[q],minWidth:1280,minHeight:720}},audio:false}).catch(function(){ return camPede({video:{mandatory:{sourceId:ids[q]}},audio:false}); }).catch(function(){ return camPede({video:{optional:[{sourceId:ids[q]}]},audio:false}); })
    .catch(function(e){ info('Câmeras: '+fontes.length+' · não abriu a '+(q+1)+' ('+((e&&(e.name||e.message))||'erro')+')'); return camPede({video:true,audio:false}); });
}
function info(t){ window.Bipador.info=t; var e=document.querySelector('.bpd-i'); if(e) e.textContent='Leitor v13 · '+t; var s=document.querySelector('.bpd-s'); if(s) s.textContent='Leitor v13 · '+t; }
function chromeAntigo(){ var m=(navigator.userAgent.match(/Chrome\/(\d+)/)||[])[1]; return !!m&&Number(m)<60; }
function camera(proxima){
  if(chromeAntigo()) return fontesAntigas().then(function(f){ return f.length?cameraAntiga(f,proxima):cameraNova(proxima); });
  return cameraNova(proxima);
}
function cameraNova(proxima){
  return camPede({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false}).catch(function(){ return camPede({video:true,audio:false}); }).then(function(st){
    var md=navigator.mediaDevices; if(!md||!md.enumerateDevices) return st;
    return md.enumerateDevices().then(function(ds){
      var cs=ds.filter(function(d){ return d.kind==='videoinput'; }); if(cs.length<2) return st;
      var ids=cs.map(function(d){ return d.deviceId; }), guardada=''; try{ guardada=localStorage.getItem('lf_cam')||''; }catch(e){}
      var atual=st.getVideoTracks()[0], i=ids.indexOf(camId(st)); if(i<0) cs.forEach(function(d,k){ if(d.label&&d.label===atual.label) i=k; });
      var quer=ids.indexOf(guardada);
      if(quer<0){
        cs.forEach(function(d,k){ if(quer<0&&/back|rear|traseira|environment/i.test(d.label)) quer=k; });
        if(quer<0) quer=0;   /* sem nome: no Android a primeira da lista é a de trás */
      }
      if(proxima){ quer=(quer+1)%cs.length; try{ localStorage.setItem('lf_cam',ids[quer]); }catch(e){} }
      if(quer===i) return st;
      camPara(st);
      return camAbre(ids[quer]).catch(function(){ return camPede({video:true,audio:false}); });
    }, function(){ return st; });
  });
}
window.Bipador={
  camera:camera,
  abrir:function(op){
    css(); fechar(); B.op=op||{}; B.ate=0;
    var d=document.createElement('div'); d.className='bpd'+(B.op.cheia?' cheia':'');
    d.innerHTML='<div class="bpd-c"><div class="bpd-h"><b></b><button class="bpd-x" type="button" aria-label="Fechar">✕</button></div><div class="bpd-i" style="font-size:11.5px;color:#71717A;margin:-4px 2px 8px">Leitor v13</div><div class="bpd-v"><video playsinline muted autoplay></video><i></i><span class="bpd-s" style="position:absolute;left:8px;bottom:8px;right:8px;color:#fff;font-size:11.5px;font-weight:700;background:rgba(0,0,0,.6);border-radius:8px;padding:4px 8px">Leitor v13</span></div>'+
      '<div class="bpd-d"></div><div class="bpd-m"><input inputmode="numeric" autocomplete="off" placeholder="Ou digite o código"><button type="button">OK</button></div><div class="bpd-e"></div><div class="bpd-ok"></div></div>';
    d.querySelector('b').textContent=B.op.titulo||'Bipar código de barras';
    d.querySelector('.bpd-d').textContent=B.op.dica||'Aponte a câmera para o código de barras. Leitor USB também funciona.';
    document.body.appendChild(d); B.box=d;
    var inp=d.querySelector('input'), toque=('ontouchstart' in window), ok=function(){ var c=inp.value.trim(); inp.value=''; if(c){ B.ate=0; lido(c); } if(!toque) inp.focus(); };
    if(toque){ inp.readOnly=true; inp.addEventListener('click',function(){ if(inp.readOnly){ inp.readOnly=false; inp.blur(); inp.focus(); } }); inp.blur(); try{ document.activeElement&&document.activeElement.blur(); }catch(e){}
      B.tec=function(e){ if(B.box!==d||document.activeElement===inp) return; if(e.keyCode===13){ e.preventDefault(); ok(); } else if(e.key&&e.key.length===1&&/[0-9A-Za-z-]/.test(e.key)) inp.value+=e.key; else if(e.keyCode===8) inp.value=inp.value.slice(0,-1); };
      document.addEventListener('keydown',B.tec,true); }
    d.querySelector('.bpd-m button').onclick=ok; inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); ok(); } });
    d.querySelector('.bpd-x').onclick=fechar; d.addEventListener('click',function(e){ if(e.target===d) fechar(); });
    document.addEventListener('keydown', esc, true);
    if(!toque) setTimeout(function(){ try{ inp.focus({preventScroll:true}); }catch(e){} },80);
    var v=d.querySelector('video');
    var liga=function(proxima){ para(); camera(proxima).then(function(st){
      if(B.box!==d){ camPara(st); return; }
      B.stream=st; if('srcObject' in v) v.srcObject=st; else v.src=URL.createObjectURL(st); var pl=v.play(); if(pl&&pl.catch) pl.catch(function(){}); le(v);
    }).catch(function(e){ d.querySelector('.bpd-v').style.display='none'; var n=(navigator.userAgent.match(/Chrome\/(\d+)/)||[])[1]; if(B.op&&B.op.aoFalhar) B.op.aoFalhar(); erro('Não consegui abrir a câmera. Libere a permissão, ou digite o código. (motivo: '+((e&&e.name)||'desconhecido')+((e&&e.message)?' - '+String(e.message).slice(0,90):'')+(n?', navegador '+n:'')+')'); }); };
    var tc=document.createElement('button'); tc.type='button'; tc.textContent='🔄 Trocar câmera'; tc.style.cssText='width:100%;margin:8px 0 0;min-height:44px;border-radius:12px;border:1px solid #DFDFE4;background:#F4F4F5;font:inherit;font-weight:800'; tc.onclick=function(){ liga(true); };
    d.querySelector('.bpd-v').insertAdjacentElement('afterend',tc);
    liga(false);
  },
  fechar:fechar,
  norm:function(c){ return String(c||'').replace(/[^0-9A-Za-z]/g,'').replace(/^0+(?=\d{8,}$)/,''); }
};
})();
