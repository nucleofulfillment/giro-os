/* LiveFood — BIPADOR (mesmo leitor da Mesa e do Atendimento).
   Bipador.abrir({titulo, dica, aoLer(codigo, fechar), continuo})
   - câmera do celular: leitor do próprio navegador (BarcodeDetector) e, onde não existe (iPhone,
     computador), a biblioteca ZXing carregada só quando precisa;
   - leitor USB/Bluetooth e digitação: campo "Ou digite o código" (o leitor digita e aperta Enter).
   continuo=true mantém a câmera aberta para bipar vários itens seguidos. */
(function(){
'use strict';
var FM=['ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf'];
var B={stream:null, raf:0, zx:null, ate:0, box:null, op:null, ctx:null};
function css(){ if(document.getElementById('css-bipador')) return; var s=document.createElement('style'); s.id='css-bipador'; s.textContent=
  '.bpd{position:fixed;top:0;right:0;bottom:0;left:0;inset:0;z-index:4000;background:rgba(20,20,22,.6);display:flex;align-items:center;justify-content:center;padding:16px}'+
  '.bpd-c{width:100%;max-width:460px;background:#fff;border-radius:22px;padding:16px;box-shadow:0 30px 60px rgba(0,0,0,.3);font-family:inherit;color:#1C1C1E}'+
  '.bpd-h{display:flex;align-items:center;gap:10px;margin-bottom:10px}.bpd-h b{flex:1;font-size:18px}.bpd-x{width:40px;height:40px;border-radius:50%;border:1px solid #DFDFE4;background:#fff;font-size:16px;cursor:pointer}'+
  '.bpd-v{min-height:200px;position:relative;border-radius:16px;overflow:hidden;background:#111;aspect-ratio:4/3}.bpd-v video{width:100%;height:100%;object-fit:cover;display:block}'+
  '.bpd-v i{position:absolute;left:12%;right:12%;top:50%;height:2px;background:#FF5A00;box-shadow:0 0 12px #FF5A00;animation:bpdL 1.6s ease-in-out infinite}@keyframes bpdL{0%,100%{transform:translateY(-40px)}50%{transform:translateY(40px)}}'+
  '.bpd-d{font-size:13.5px;color:#71717A;font-weight:600;margin:10px 2px}.bpd-e{font-size:13px;color:#B91C1C;font-weight:700;margin:8px 2px}'+
  '.bpd-m{display:flex;gap:8px}.bpd-m input{flex:1;min-width:0;min-height:52px;border-radius:14px;border:2px solid #DFDFE4;padding:0 12px;font:inherit;font-size:18px;font-weight:700;outline:none}.bpd-m input:focus{border-color:#FF5A00}.bpd-m button{min-height:52px;border-radius:14px;border:0;background:#FF5A00;color:#fff;font:inherit;font-weight:800;padding:0 18px;cursor:pointer}'+
  '.bpd-ok{margin-top:10px;border-radius:12px;background:#ECFDF3;color:#14532D;font-weight:800;font-size:14px;padding:10px 12px;display:none}';
  document.head.appendChild(s); }
function som(ok){ try{ navigator.vibrate&&navigator.vibrate(ok?60:[120,60,120]); }catch(e){}
  try{ B.ctx=B.ctx||new (window.AudioContext||window.webkitAudioContext)(); var a=B.ctx; if(a.state==='suspended') a.resume(); var o=a.createOscillator(), g=a.createGain(), t=a.currentTime; o.type='square'; o.frequency.value=ok?1800:320; g.gain.setValueAtTime(.12,t); g.gain.exponentialRampToValueAtTime(.001,t+(ok?.12:.35)); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+(ok?.12:.35)); }catch(e){} }
function para(){ cancelAnimationFrame(B.raf); B.raf=0; try{ if(B.zx){ B.zx.reset(); B.zx=null; } }catch(e){} if(B.stream){ B.stream.getTracks().forEach(function(t){ t.stop(); }); B.stream=null; } }
function fechar(){ para(); if(B.box){ B.box.remove(); B.box=null; } document.removeEventListener('keydown', esc, true); }
function esc(e){ if(e.key==='Escape') fechar(); }
function erro(t){ var e=B.box&&B.box.querySelector('.bpd-e'); if(e) e.textContent=t||''; }
function lido(c){ c=String(c||'').trim(); if(!c||!B.op) return; if(Date.now()<B.ate) return; B.ate=Date.now()+1500;
  var r; try{ r=B.op.aoLer(c, fechar); }catch(e){ console.error(e); }
  som(r!==false);
  if(r===false){ erro('Código '+c+' não encontrado.'); return; }
  erro(''); if(!B.op.continuo) fechar(); else { var k=B.box&&B.box.querySelector('.bpd-ok'); if(k){ k.style.display='block'; k.textContent=(typeof r==='string'?r:'Lido: '+c); } } }
function le(v){
  if('BarcodeDetector' in window){ BarcodeDetector.getSupportedFormats().then(function(s){ var det=new BarcodeDetector({formats:FM.filter(function(f){ return s.indexOf(f)>=0; })}), ult=0;
      (function loop(){ if(!B.stream) return; B.raf=requestAnimationFrame(loop); var ag=Date.now(); if(ag-ult<180||v.readyState<2) return; ult=ag; det.detect(v).then(function(r){ if(r&&r[0]&&r[0].rawValue) lido(r[0].rawValue); }).catch(function(){}); })();
    }).catch(function(){ leZx(v); }); return; }
  leZx(v);
}
function leZx(v){
  var vai=function(){ if(!B.stream||!window.ZXing) return; var r=new ZXing.BrowserMultiFormatReader(); B.zx=r; r.decodeFromStream(B.stream,v,function(res){ if(res) lido(res.getText()); }).catch(function(){}); };
  if(window.ZXing){ vai(); return; }
  var s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js'; s.onload=vai; s.onerror=function(){ erro('Não consegui ligar o leitor pela câmera. Digite o código.'); }; document.head.appendChild(s);
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
function camera(proxima){
  return camPede({video:{facingMode:{ideal:'environment'}},audio:false}).catch(function(){ return camPede({video:true,audio:false}); }).then(function(st){
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
    var d=document.createElement('div'); d.className='bpd';
    d.innerHTML='<div class="bpd-c"><div class="bpd-h"><b></b><button class="bpd-x" type="button" aria-label="Fechar">✕</button></div><div class="bpd-v"><video playsinline muted autoplay></video><i></i></div>'+
      '<div class="bpd-d"></div><div class="bpd-m"><input inputmode="numeric" autocomplete="off" placeholder="Ou digite o código"><button type="button">OK</button></div><div class="bpd-e"></div><div class="bpd-ok"></div></div>';
    d.querySelector('b').textContent=B.op.titulo||'Bipar código de barras';
    d.querySelector('.bpd-d').textContent=B.op.dica||'Aponte a câmera para o código de barras. Leitor USB também funciona.';
    document.body.appendChild(d); B.box=d;
    var inp=d.querySelector('input'), ok=function(){ var c=inp.value.trim(); inp.value=''; if(c){ B.ate=0; lido(c); } inp.focus(); };
    d.querySelector('.bpd-m button').onclick=ok; inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); ok(); } });
    d.querySelector('.bpd-x').onclick=fechar; d.addEventListener('click',function(e){ if(e.target===d) fechar(); });
    document.addEventListener('keydown', esc, true);
    setTimeout(function(){ try{ inp.focus({preventScroll:true}); }catch(e){} },80);
    var v=d.querySelector('video');
    var liga=function(proxima){ para(); camera(proxima).then(function(st){
      if(B.box!==d){ camPara(st); return; }
      B.stream=st; v.srcObject=st; v.play().catch(function(){}); le(v);
    }).catch(function(e){ d.querySelector('.bpd-v').style.display='none'; var n=(navigator.userAgent.match(/Chrome\/(\d+)/)||[])[1]; erro('Não consegui abrir a câmera. Libere a permissão, ou digite o código. (motivo: '+((e&&e.name)||'desconhecido')+(n?', navegador '+n:'')+')'); }); };
    var tc=document.createElement('button'); tc.type='button'; tc.textContent='🔄 Trocar câmera'; tc.style.cssText='width:100%;margin:8px 0 0;min-height:44px;border-radius:12px;border:1px solid #DFDFE4;background:#F4F4F5;font:inherit;font-weight:800'; tc.onclick=function(){ liga(true); };
    d.querySelector('.bpd-v').insertAdjacentElement('afterend',tc);
    liga(false);
  },
  fechar:fechar,
  norm:function(c){ return String(c||'').replace(/[^0-9A-Za-z]/g,'').replace(/^0+(?=\d{8,}$)/,''); }
};
})();
