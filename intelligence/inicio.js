/* LivePro — tela de entrada no celular.
   Quem abre o sistema pelo celular (operador) vê o Live dando boas-vindas e dois botões grandes:
   Recebimento, Buffet e Saídas e perdas. Ao tocar, o Live comemora (como quando sai um pedido no LiveFood) e a tela abre.
   Aparece uma vez por sessão; "Ver o sistema completo" fecha e segue para a Visão Geral. */
(function(){
'use strict';
var UI=LFI.ui;
var CSS='.ini{position:fixed;inset:0;z-index:3000;display:flex;align-items:center;justify-content:center;padding:20px 16px;background:rgba(255,255,255,.96);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);opacity:0;transition:opacity .3s}'+
'.ini.on{opacity:1}.ini.sai{opacity:0}'+
'.ini-cx{width:100%;max-width:420px;display:flex;flex-direction:column;align-items:center;text-align:center}'+
'.ini-live{width:150px;margin-bottom:6px}'+
'.ini h2{font-size:26px;font-weight:800;margin:6px 0 4px;letter-spacing:-.01em;opacity:0;transform:translateY(14px);transition:all .5s .5s cubic-bezier(.34,1.56,.64,1)}'+
'.ini p{font-size:16px;font-weight:700;color:var(--muted2);margin:0 0 20px;opacity:0;transform:translateY(10px);transition:all .5s .65s cubic-bezier(.16,1,.3,1)}'+
'.ini.on h2,.ini.on p{opacity:1;transform:none}'+
'.ini-bt{display:flex;align-items:center;gap:16px;width:100%;min-height:92px;padding:16px 20px;margin-bottom:12px;border-radius:22px;border:0;font:inherit;text-align:left;cursor:pointer;color:#fff;background:var(--roxo);box-shadow:0 12px 26px rgba(255,90,0,.28);opacity:0;transform:translateY(16px);transition:opacity .5s,transform .5s cubic-bezier(.16,1,.3,1)}'+
'.ini-bt.b2{background:var(--text);box-shadow:0 12px 26px rgba(0,0,0,.2)}.ini-bt.b3{background:#fff;color:var(--text);border:1.5px solid var(--border2);box-shadow:0 8px 20px rgba(0,0,0,.06)}.ini-bt.b3 .ic{background:#FEE2E2}.ini-bt.b3 svg{stroke:var(--red)}'+
'.ini.on .ini-bt{opacity:1;transform:none}.ini.on .ini-bt.b1{transition-delay:.8s}.ini.on .ini-bt.b2{transition-delay:.92s}.ini.on .ini-bt.b3{transition-delay:1.04s}'+
'.ini-bt:active{transform:scale(.97)!important}'+
'.ini-bt .ic{width:56px;height:56px;border-radius:16px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;flex:none}'+
'.ini-bt svg{width:30px;height:30px;stroke:#fff;fill:none;stroke-width:2}'+
'.ini-bt b{display:block;font-size:22px;font-weight:800}.ini-bt small{display:block;font-size:14px;font-weight:700;opacity:.85}'+
'.ini-bt.esc{opacity:.35!important}.ini-bt.vai{transform:scale(1.03)!important}'+
'.ini-ver{margin-top:6px;border:0;background:none;font:inherit;font-size:15px;font-weight:800;color:var(--muted2);padding:12px;cursor:pointer;opacity:0;transition:opacity .4s 1.1s}.ini.on .ini-ver{opacity:1}'+
'.ini-ok{font-size:22px;font-weight:800;color:var(--roxo)}';

function mostrar(){
  var st=document.createElement('style'); st.textContent=CSS; document.head.appendChild(st);
  var nome=String(LFI.usuario().nome||'').split(' ')[0];
  var box=document.createElement('div'); box.className='ini'; box.setAttribute('role','dialog'); box.setAttribute('aria-label','Boas-vindas');
  box.innerHTML='<div class="ini-cx"><div class="ini-live"></div>'+
    '<h2>Olá, '+UI.esc(nome)+'!</h2><p>O que você vai fazer agora?</p>'+
    '<button class="ini-bt b1" data-ir="notas"><span class="ic">'+UI.ic('caminhao')+'</span><span><b>Recebimento</b><small>Receber o pedido que chegou</small></span></button>'+
    '<button class="ini-bt b2" data-ir="buffet"><span class="ic">'+UI.ic('balanca')+'</span><span><b>Buffet</b><small>Pesar as cubas</small></span></button>'+
    '<button class="ini-bt b3" data-ir="perdas"><span class="ic">'+UI.ic('lixo')+'</span><span><b>Saídas e perdas</b><small>Dar baixa no que vai para o descarte</small></span></button>'+
    '<button class="ini-ver" data-ir="">Ver o sistema completo</button></div>';
  document.body.appendChild(box);
  var live=window.LiveMascote?LiveMascote.criar(box.querySelector('.ini-live'),{sombra:true, expressao:'surpreso'}):null;
  var mola=function(p){ return 1+2.70158*Math.pow(p-1,3)+1.70158*Math.pow(p-1,2); };
  requestAnimationFrame(function(){ box.classList.add('on'); });
  (async function(){ if(!live) return;
    try{ Object.assign(live.P,{y:-150,sx:.7,sy:.7}); await live.animar({y:0,sx:1,sy:1},700,mola);
      live.expressao('animado'); await live.gesto('boas_vindas'); await live.gesto('acenar'); await live.gesto('piscadinha'); }catch(e){}
  })();
  var indo=false;
  box.addEventListener('click', function(ev){
    var b=ev.target.closest('[data-ir]'); if(!b||indo) return; indo=true;
    var rota=b.getAttribute('data-ir');
    function sair(){ box.classList.add('sai'); setTimeout(function(){ if(live) live.destruir(); box.remove(); },320); if(rota) LFI.ir(rota); }
    if(!rota||!live){ sair(); return; }
    UI.els('.ini-bt',box).forEach(function(x){ x.classList.add(x===b?'vai':'esc'); });
    var r=box.querySelector('.ini-live').getBoundingClientRect();
    if(window.LiveApp) LiveApp.confete(r.left+r.width/2, r.top+r.height/2);
    live.gesto('comemorar');
    setTimeout(sair, 1300);
  });
}

var orig=UI.iniciar;
UI.iniciar=function(){
  orig.apply(this, arguments);
  if(innerWidth>700) return;
  var visto=false; try{ visto=sessionStorage.getItem('lfi_ini')==='1'; sessionStorage.setItem('lfi_ini','1'); }catch(e){}
  if(!visto) mostrar();
};
})();
