/* LivePro — dados guardados no servidor (por conta).
   Quem entrou pelo Hub (login do LiveFood) e tem o LivePro liberado: os dados ficam no servidor e
   o mesmo conteúdo aparece no computador e no celular. O navegador guarda uma cópia para abrir rápido
   e para continuar funcionando sem internet; quando a internet volta, o que mudou é enviado.
   Sem login (arquivo aberto direto no aparelho) tudo continua só no navegador, como antes. */
(function(){
'use strict';
var API='https://giro-os-api.nucleofull.workers.dev';
var S=LFI.servidor={ativo:false, pronto:false, estado:'local', hashes:{}, timer:null, enviando:false, pendente:false};
function token(){ try{ return localStorage.getItem('dd_jwt')||''; }catch(e){ return ''; } }
S.ativo=/^https?:$/.test(location.protocol) && !!token() && token()!=='x';

/* hash simples (FNV-1a) para mandar só o que mudou */
function hash(s){ var h=0x811c9dc5; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=(h+((h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24)))>>>0; } return h.toString(16)+'-'+s.length; }
/* cada parte grande do banco vira um bloco; números e textos soltos vão juntos no bloco "meta" */
function blocos(db){ var out={}, meta={};
  Object.keys(db).forEach(function(k){ var v=db[k]; if(v&&typeof v==='object'){ out[k]=JSON.stringify(v); } else meta[k]=v; });
  out.meta=JSON.stringify(meta); return out; }
function montar(bl){ var db={}; Object.keys(bl).forEach(function(k){ var v; try{ v=JSON.parse(bl[k].t); }catch(e){ return; } if(k==='meta'){ Object.keys(v||{}).forEach(function(m){ db[m]=v[m]; }); } else db[k]=v; }); return db; }

function req(metodo, caminho, corpo){
  return fetch(API+caminho,{method:metodo, cache:'no-store', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token()}, body:corpo?JSON.stringify(corpo):undefined})
    .then(function(r){ return r.json().catch(function(){ return {ok:false}; }).then(function(j){ j._s=r.status; return j; }); });
}
function estado(e, txt){ S.estado=e; var c=document.getElementById('tb-nuvem'); if(!c) return;
  var info={ok:['☁','Salvo no servidor'], salvando:['⟳','Salvando…'], offline:['⚠','Sem internet: salvo neste aparelho'], erro:['⚠','Não foi possível salvar no servidor'], carregando:['⟳','Carregando do servidor…']}[e];
  if(!info){ c.hidden=true; return; } c.hidden=false; c.className='tb-nuvem '+e; c.innerHTML='<b>'+info[0]+'</b><span>'+(txt||info[1])+'</span>'; c.title=txt||info[1]; }

function enviar(todos){
  if(!S.ativo||!S.pronto) return;
  if(S.enviando){ S.pendente=true; return; }
  var bl=blocos(LFI.db), mandar={}, n=0;
  Object.keys(bl).forEach(function(k){ var h=hash(bl[k]); if(todos||S.hashes[k]!==h){ mandar[k]={t:bl[k], h:h}; n++; } });
  if(!n){ estado('ok'); return; }
  S.enviando=true; estado('salvando');
  req('POST','/painel/livepro-salvar',{blocos:mandar}).then(function(j){
    S.enviando=false;
    if(j.ok){ Object.keys(mandar).forEach(function(k){ S.hashes[k]=mandar[k].h; }); estado('ok'); }
    else if(j._s===403){ S.ativo=false; estado('local'); }
    else estado('erro', j.mensagem);
    if(S.pendente){ S.pendente=false; enviar(); }
  }).catch(function(){ S.enviando=false; estado('offline'); });
}
S.agendar=function(){ if(!S.ativo||!S.pronto) return; clearTimeout(S.timer); S.timer=setTimeout(function(){ enviar(); }, 1200); };

/* toda gravação local também agenda o envio ao servidor */
var salvarLocal=LFI.salvar;
LFI.salvar=function(){ salvarLocal.apply(this, arguments); S.agendar(); };

S.carregar=function(){
  if(!S.ativo) return;
  estado('carregando');
  req('GET','/painel/livepro').then(function(j){
    if(j._s===403||j._s===404){ S.ativo=false; estado('local'); return; }   /* sem liberação, ou servidor ainda sem o LivePro: segue só neste aparelho */
    if(!j.ok){ estado('erro', j.mensagem); return; }
    var chaves=Object.keys(j.blocos||{});
    S.pronto=true;
    if(!chaves.length){ enviar(true); return; }   /* primeira vez desta conta: o servidor recebe os dados deste aparelho */
    var db=montar(j.blocos);
    if(!db.produtos||!db.receitas){ enviar(true); return; }
    chaves.forEach(function(k){ S.hashes[k]=j.blocos[k].h; });
    LFI.db=db; salvarLocal.call(LFI);   /* cópia local, sem reenviar */
    estado('ok'); LFI.recarregar();
  }).catch(function(){ estado('offline'); S.pronto=true; });
};
/* quando a internet volta, manda o que ficou pendente */
window.addEventListener('online', function(){ if(S.ativo&&S.pronto) enviar(); });
})();
