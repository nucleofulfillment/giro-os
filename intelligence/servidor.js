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
  var info={ok:'Salvo no servidor', salvando:'Salvando no servidor…', offline:'Sem internet: salvo neste aparelho', erro:'Não foi possível salvar no servidor', carregando:'Carregando do servidor…'}[e];
  if(!info){ c.hidden=true; return; }
  var nuvem='<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5H7z"/>', marca={ok:'<path class="nv-m" d="M9.5 13.5l2 2 4-4"/>', offline:'<path class="nv-m" d="M12 11v3M12 16.5v.01"/>', erro:'<path class="nv-m" d="M12 11v3M12 16.5v.01"/>'}[e]||'';
  c.hidden=false; c.className='tb-nuvem '+e; c.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+nuvem+marca+'</svg>'; c.title=txt||info; c.setAttribute('aria-label', txt||info); }

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
S.req=req;
/* ---------- fotos no servidor ----------
   Fotos (notas, avarias, balança do buffet) ficam no armazenamento do servidor; no banco fica só 'lpf:<chave>'.
   Assim o banco fica leve e o celular e o computador veem as mesmas fotos. */
function ehFoto(s){ return typeof s==='string' && s.length>2500 && /^data:image\/(jpeg|png|webp);base64,/.test(s); }
var subindo={};
function subir(img){ if(subindo[img]) return subindo[img];
  subindo[img]=req('POST','/painel/livepro-foto',{img:img}).then(function(j){ delete subindo[img]; return j&&j.ok?('lpf:'+j.k):null; }).catch(function(){ delete subindo[img]; return null; });
  return subindo[img]; }
/* troca as fotos do banco por chaves do servidor (no máximo 8 por vez, para não travar) */
function trocarFotos(){
  if(!S.ativo||!S.pronto) return Promise.resolve(0);
  var achou=[];
  (function anda(o, pai, k, prof){ if(prof>9||achou.length>=8) return; if(ehFoto(o)){ achou.push([pai,k,o]); return; } if(o&&typeof o==='object'){ for(var c in o){ if(Object.prototype.hasOwnProperty.call(o,c)) anda(o[c], o, c, prof+1); } } })(LFI.db, null, null, 0);
  if(!achou.length) return Promise.resolve(0);
  return Promise.all(achou.map(function(a){ return subir(a[2]).then(function(ch){ if(ch&&a[0][a[1]]===a[2]) a[0][a[1]]=ch; return !!ch; }); })).then(function(r){ var n=r.filter(Boolean).length; if(n){ salvarLocal.call(LFI); } return n; });
}
S.trocarFotos=trocarFotos;
/* para mandar ao fornecedor: devolve as chaves das fotos (sobe as que ainda estão no aparelho) */
S.fotosParaChaves=function(lista){ return Promise.all((lista||[]).filter(Boolean).map(function(x){ if(typeof x==='string'&&x.indexOf('lpf:')===0) return Promise.resolve(x.slice(4)); if(ehFoto(x)) return subir(x).then(function(ch){ return ch?ch.slice(4):null; }); return Promise.resolve(null); })).then(function(r){ return r.filter(Boolean); }); };
/* mostra as fotos guardadas no servidor: <img src="lpf:..."> e fundos com url(lpf:...) */
var cacheFoto={};
function urlFoto(ch){ if(cacheFoto[ch]) return cacheFoto[ch];
  cacheFoto[ch]=fetch(API+'/painel/livepro-foto?k='+encodeURIComponent(ch),{headers:{'Authorization':'Bearer '+token()}}).then(function(r){ return r.ok?r.blob():null; }).then(function(b){ return b?URL.createObjectURL(b):''; }).catch(function(){ delete cacheFoto[ch]; return ''; });
  return cacheFoto[ch]; }
function mostrarFotos(raiz){
  (raiz||document).querySelectorAll('img[src^="lpf:"]').forEach(function(im){ var ch=im.getAttribute('src').slice(4); im.setAttribute('src','data:image/gif;base64,R0lGODlhAQABAAAAACw='); urlFoto(ch).then(function(u){ if(u) im.src=u; }); });
  (raiz||document).querySelectorAll('[style*="lpf:"]').forEach(function(el){ var st=el.getAttribute('style'), m=/url\(['"]?lpf:([a-z0-9]+)['"]?\)/.exec(st); if(!m) return; el.setAttribute('style', st.replace(m[0],'url()')); urlFoto(m[1]).then(function(u){ if(u) el.style.backgroundImage='url("'+u+'")'; }); });
}
var _mfT=null; new MutationObserver(function(){ clearTimeout(_mfT); _mfT=setTimeout(function(){ mostrarFotos(document); },20); }).observe(document.documentElement,{childList:true, subtree:true});
S.agendar=function(){ if(!S.ativo||!S.pronto) return; clearTimeout(S.timer); S.timer=setTimeout(function(){ trocarFotos().then(function(){ enviar(); }); }, 1200); };

/* toda gravação local também agenda o envio ao servidor */
var salvarLocal=LFI.salvar;
LFI.salvar=function(){ salvarLocal.apply(this, arguments); S.agendar(); };

S.carregar=function(){
  if(!S.ativo) return;
  estado('carregando');
  req('GET','/painel/livepro').then(function(j){
    if(j._s===403||j._s===404){ S.ativo=false; estado('local'); return; }   /* sem liberação, ou servidor ainda sem o LivePro: segue só neste aparelho */
    if(!j.ok){ estado('erro', j.mensagem); S.falhou=true; return; }
    S.falhou=false;
    var chaves=Object.keys(j.blocos||{});
    S.pronto=true;
    if(!chaves.length){ enviar(true); return; }   /* primeira vez desta conta: o servidor recebe os dados deste aparelho */
    var db=montar(j.blocos);
    if(!db.produtos||!db.receitas){ enviar(true); return; }
    chaves.forEach(function(k){ S.hashes[k]=j.blocos[k].h; });
    LFI.db=db; salvarLocal.call(LFI);   /* cópia local, sem reenviar */
    estado('ok'); LFI.recarregar(); S.fila();
  }).catch(function(){ estado('offline'); S.falhou=true; });   /* não envia nada antes de ler o servidor: assim os dados de lá nunca são trocados pelos deste aparelho */
};
/* vendas bipadas no Atendimento do LiveFood (garçom e balcão) dão baixa no estoque daqui, pelo código de barras */
S.fila=function(){
  if(!S.ativo||!S.pronto) return;
  req('GET','/painel/livepro-fila').then(function(j){
    if(!j||!j.ok||!(j.itens||[]).length) return;
    var ids=[], n=0;
    j.itens.forEach(function(f){ ids.push(f.id); (f.itens||[]).forEach(function(it){
      var p=LFI.prodPorCodigo?LFI.prodPorCodigo(it.barras):null, q=Number(it.qtd)||0; if(!p||!(q>0)) return;
      var dep=p.dep&&p.est&&(p.dep in p.est)?p.dep:'res'; if(!(dep in p.est)) dep=Object.keys(p.est)[0];
      LFI.movimentar({prod:p.id, dep:dep, tipo:'venda', qtd:-q, origem:{tipo:'livefood', id:f.id}, obs:'Venda no LiveFood'+(f.ref?' · '+f.ref:''), usuario:f.por||'LiveFood'}); n++; }); });
    if(n){ LFI.atividade('estoque', n+(n===1?' item vendido':' itens vendidos')+' no LiveFood baixado(s) do estoque',{tela:'estoque'}); LFI.salvar(); LFI.recarregar(); }
    req('POST','/painel/livepro-fila-ok',{ids:ids});
  }).catch(function(){});
};
setInterval(function(){ S.fila(); }, 120000);
setInterval(function(){ trocarFotos().then(function(n){ if(n) enviar(); }); }, 60000);   /* fotos antigas sobem aos poucos */
/* quando a internet volta, manda o que ficou pendente */
window.addEventListener('online', function(){ if(!S.ativo) return; if(S.pronto) enviar(); else S.carregar(); });
/* se a primeira leitura falhou, tenta de novo a cada 30 segundos */
setInterval(function(){ if(S.ativo&&!S.pronto&&S.falhou) S.carregar(); }, 30000);
})();
