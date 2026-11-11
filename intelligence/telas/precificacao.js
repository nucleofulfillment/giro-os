/* LivePro — PRECIFICAÇÃO (simples e dinâmica).
   O custo vem da receita de cada produto (ou do custo de compra, na revenda). A pessoa digita o preço de venda
   e vê na hora o lucro e a "régua" (quanto do preço é custo e quanto é lucro). Por enquanto só o custo do produto:
   despesas operacionais entram depois. Substitui a antiga tela de Custos e Precificação (rota 'custos'). */
(function(){
'use strict';
var UI=LFI.ui, F=LFI.fmt, esc=UI.esc;
function r2(v){ return Math.round(v*100)/100; }
function numIn(s){ var t=String(s==null?'':s).trim(); if(/^\d+\.\d{1,2}$/.test(t)) return parseFloat(t); var v=parseFloat(t.replace(/\./g,'').replace(',','.')); return isFinite(v)?v:0; }
function money(v){ return v?v.toFixed(2).replace('.',','):''; }
(function(){ var cfg=LFI.db.config=LFI.db.config||{}; if(!cfg.despMig){ cfg.despesas=0; cfg.despMig=1; LFI.salvar(); } })();
function st(){ return LFI.estado.prec=LFI.estado.prec||{grupo:'todos', sit:'', q:'', meta:60, lim:50, novos:{}}; }

/* custo só do produto (sem despesas operacionais por enquanto) */
LFI.custoProduto=function(p){
  if(p.tipo==='revenda') return p.custoMedio||0;
  var r=LFI.receitaDe?LFI.receitaDe(p):null; if(!r) return p.custoMedio||0;
  var t=0; r.ing.forEach(function(g){ var q=LFI.prod(g.prod); if(q) t+=LFI.converte(g.qtd,g.un,q.un)*(q.custoMedio||0); });
  return t/(r.rend||1);
};
function situacao(m, preco){ if(!preco) return 'sem'; return m>=0.5?'ok':m>=0.3?'wt':'no'; }
var SIT={ok:['Lucro bom','50% ou mais'], wt:['Atenção','entre 30% e 50%'], no:['Lucro baixo','menos de 30%'], sem:['Sem preço','falta o preço de venda']};

function css(){ if(document.getElementById('css-prec')) return; var c=document.createElement('style'); c.id='css-prec'; c.textContent=
  '.pc{max-width:1180px;margin:0 auto;padding-bottom:120px}'+
  '.pr-grp{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:10px;scrollbar-width:none}.pr-grp::-webkit-scrollbar{display:none}.pr-grp button{flex:none;display:flex;align-items:center;gap:6px;min-height:46px;padding:0 16px;border-radius:14px;border:1.5px solid var(--border2);background:#fff;font:inherit;font-size:14.5px;font-weight:800;cursor:pointer;white-space:nowrap;color:var(--text)}.pr-grp button.on{background:var(--text);border-color:var(--text);color:#fff}.pr-grp button i{font-style:normal;font-size:12px;font-weight:800;color:var(--muted)}.pr-grp button.on i{color:#C9C9CF}'+
  '.pr-busca{display:flex;align-items:center;gap:10px;border:2px solid var(--border2);border-radius:16px;background:#fff;padding:0 14px;min-height:56px;margin-bottom:12px}.pr-busca:focus-within{border-color:var(--roxo)}.pr-busca svg{width:20px;height:20px;stroke:var(--muted);fill:none;stroke-width:2;flex:none}.pr-busca input{flex:1;border:0;outline:none;font:inherit;font-size:17px;font-weight:700;background:transparent;min-width:0}'+
  '.pc-hd{margin-bottom:12px}.pc-hd h1{font-size:24px;margin:0}.pc-hd small{display:block;color:var(--muted);font-weight:700;font-size:13.5px;margin-top:2px}'+
  '.pc-k{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}.pc-k button{text-align:left;border:1.5px solid var(--border);border-radius:16px;background:#fff;padding:12px 14px;font:inherit;cursor:pointer}.pc-k button.on{border-color:var(--text);box-shadow:0 0 0 2px var(--text) inset}.pc-k span{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:var(--muted2);text-transform:uppercase;letter-spacing:.3px}.pc-k i{width:10px;height:10px;border-radius:50%}.pc-k b{display:block;font-size:24px;margin-top:2px}.pc-k small{font-size:12px;color:var(--muted);font-weight:700}'+
  '.ok-c{background:#16A34A}.wt-c{background:#E9A80B}.no-c{background:#DC2626}.sem-c{background:#A1A1AA}'+
  '.pc-f{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px}.pc-f .pr-busca{flex:1 1 280px;margin:0}'+
  '.pc-meta{display:flex;align-items:center;gap:8px;background:#fff;border:1.5px solid var(--border2);border-radius:16px;padding:0 12px;min-height:56px;font-weight:800;font-size:14px}.pc-meta input{width:62px;min-height:40px;border-radius:10px;border:2px solid var(--roxo);text-align:center;font:inherit;font-size:17px;font-weight:800;outline:none}'+
  '.pc-l{display:flex;flex-direction:column;gap:8px}'+
  '.pc-it{display:grid;grid-template-columns:minmax(0,1.6fr) 110px 150px 120px;gap:14px;align-items:center;background:#fff;border:1.5px solid var(--border);border-radius:18px;padding:12px 16px}.pc-it.mud{border-color:var(--roxo);background:#FFFBF7}'+
  '.pc-n{display:flex;align-items:center;gap:12px;min-width:0}.pc-n>span{min-width:0}.pc-n b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}.pc-n small{font-size:12px;color:var(--muted);font-weight:700}.pc-n .fprod{flex:none}'+
  '.pc-lb{display:block;font-size:10.5px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px}.pc-c b{font-size:16px}.pc-c small{display:block;font-size:11.5px;color:var(--muted);font-weight:700}'+
  '.pc-p label{display:flex;align-items:center;gap:4px;border:2px solid var(--border2);border-radius:12px;background:#fff;padding:0 10px;height:46px}.pc-p label:focus-within{border-color:var(--roxo)}.pc-p em{font-style:normal;font-weight:800;color:var(--muted);font-size:14px}.pc-p input{width:100%;min-width:0;border:0;outline:none;font:inherit;font-size:18px;font-weight:800;background:transparent}'+
  '.pc-sug{display:block;margin-top:4px;border:0;background:none;padding:0;font:inherit;font-size:11.5px;font-weight:800;color:var(--roxo-esc);cursor:pointer;text-align:left}'+
  '.pc-r b{font-size:18px}.pc-r small{display:block;font-size:12px;font-weight:700;color:var(--muted2)}.pc-r.ok b{color:#16A34A}.pc-r.wt b{color:#B7791F}.pc-r.no b{color:#DC2626}.pc-r.sem b{color:var(--muted)}'+
  /* régua: custo x lucro */
  '.pc-bar{grid-column:1/-1;position:relative;height:26px;border-radius:9px;overflow:hidden;display:flex;background:var(--s3);font-size:11.5px;font-weight:800;color:#fff}.pc-bar>div{display:flex;align-items:center;justify-content:center;white-space:nowrap;overflow:hidden;transition:width .25s}.pc-bar .cu{background:#E8632B}.pc-bar .lu{background:#16A34A}.pc-bar .lu.wt{background:#E9A80B}.pc-bar .lu.no{background:#DC2626}.pc-bar .vz{background:var(--s3);color:var(--muted)}'+
  '.pc-bar .mt{position:absolute;top:0;bottom:0;width:0;border-left:2px dashed #1C1C1E;opacity:.55}'+
  '.pc-mais{display:block;margin:14px auto 0;min-height:50px;padding:0 24px;border-radius:14px}'+
  '.pc-salvar{position:fixed;left:0;right:0;bottom:0;z-index:60;background:#fff;border-top:1px solid var(--border);box-shadow:0 -8px 24px rgba(0,0,0,.08);padding:10px 16px calc(10px + env(safe-area-inset-bottom));transform:translateY(110%);transition:transform .25s}.pc-salvar.on{transform:none}.pc-salvar>div{max-width:1180px;margin:0 auto;display:flex;gap:10px}.pc-salvar .btn{min-height:56px;font-size:16px;border-radius:16px;justify-content:center}.pc-salvar .btn.pri{flex:1}'+
  '@media (max-width:900px){.pc-k{grid-template-columns:1fr 1fr}.pc-it{grid-template-columns:1fr 1fr;gap:10px 12px}.pc-n{grid-column:1/-1}.pc-r{grid-column:1/-1;display:flex;align-items:baseline;gap:8px}.pc-r .pc-lb{margin:0}.pc-meta{flex:1 1 100%;justify-content:space-between}}';
  document.head.appendChild(c); }

function render(el, arg){
  css(); document.body.classList.add('foco');
  var s=st();
  var base=LFI.db.produtos.filter(function(p){ return (p.tipo==='acabado'&&p.ativo!==false)||p.tipo==='revenda'; });
  function preco(p){ return s.novos[p.id]!=null?s.novos[p.id]:(p.preco||0); }
  function calc(p){ var c=LFI.custoProduto(p), pv=preco(p), l=pv-c, m=pv?l/pv:0; return {c:c, pv:pv, l:l, m:m, sit:situacao(m,pv)}; }
  var grupos=['todos'].concat(LFI.GRUPOS.filter(function(g){ return g.nome!=='Bases'&&g.nome!=='Inativos'; }).map(function(g){ return g.nome; }));
  var h='<div class="pc"><div class="pc-hd"><div class="pghd-t">'+UI.setaVoltar()+'<h1>Precificação</h1></div><small>O custo vem da receita de cada produto. Digite o preço de venda e veja o lucro na hora.</small></div>';
  h+='<div class="pc-k" id="pc-k"></div>';
  h+='<div class="pr-grp">'+grupos.map(function(g){ var n=g==='todos'?base.length:base.filter(function(p){ return p.grupo===g; }).length; if(!n) return ''; return '<button class="'+(s.grupo===g?'on':'')+'" data-act="grp" data-id="'+esc(g)+'">'+(g==='todos'?'Todos':LFI.grupoInfo(g).emoji+' '+esc(g))+' <i>'+n+'</i></button>'; }).join('')+'</div>';
  h+='<div class="pc-f"><div class="pr-busca">'+UI.ic('busca')+'<input id="pc-q" placeholder="Buscar produto" value="'+esc(s.q)+'" autocomplete="off"></div>'+
    '<label class="pc-meta">Lucro desejado <span><input id="pc-meta" inputmode="decimal" value="'+s.meta+'"> %</span></label></div>';
  h+='<div class="pc-l" id="pc-l"></div></div>';
  h+='<div class="pc-salvar" id="pc-salvar"><div><button class="btn sec" data-act="desfaz">Desfazer</button><button class="btn pri" data-act="salva" id="pc-sv">Salvar preços</button></div></div>';
  el.innerHTML=h;

  function filtrados(){
    var ls=base.filter(function(p){ return s.grupo==='todos'||p.grupo===s.grupo; });
    if(s.q.trim()) ls=UI.filtrarBusca(s.q, ls, function(p){ return p.nome+' '+(p.cod||''); });
    else ls=ls.slice().sort(function(a,b){ return a.nome.localeCompare(b.nome); });
    return ls;
  }
  function kpis(){
    var ls=filtrados(), cont={ok:0,wt:0,no:0,sem:0}; ls.forEach(function(p){ cont[calc(p).sit]++; });
    el.querySelector('#pc-k').innerHTML=['ok','wt','no','sem'].map(function(k){ return '<button class="'+(s.sit===k?'on':'')+'" data-act="sit" data-id="'+k+'"><span><i class="'+k+'-c"></i>'+SIT[k][0]+'</span><b>'+cont[k]+'</b><small>'+SIT[k][1]+'</small></button>'; }).join('');
  }
  function sugerido(c){ var m=Math.min(95,Math.max(0,s.meta))/100; return c>0?Math.ceil(c/(1-m)*10)/10-0.01:0; }
  function barra(a){
    var meta=Math.min(95,Math.max(0,s.meta));
    if(!a.pv) return '<div class="pc-bar"><div class="vz" style="width:100%">Sem preço de venda · custo '+F.moeda(a.c)+'</div></div>';
    var cu=Math.max(0,Math.min(100,a.c/a.pv*100)), lu=Math.max(0,100-cu);
    return '<div class="pc-bar"><div class="cu" style="width:'+cu+'%">'+(cu>14?'Custo '+Math.round(cu)+'%':'')+'</div><div class="lu '+a.sit+'" style="width:'+lu+'%">'+(a.l<0?'Prejuízo':lu>14?'Lucro '+Math.round(lu)+'%':'')+'</div><span class="mt" style="left:'+(100-meta)+'%" title="Lucro desejado"></span></div>';
  }
  function linha(p){ var a=calc(p), un=p.un==='un'?'unidade':p.un, mud=s.novos[p.id]!=null&&s.novos[p.id]!==(p.preco||0);
    return '<div class="pc-it'+(mud?' mud':'')+'" data-id="'+p.id+'"><div class="pc-n">'+UI.fotoProd(p,44)+'<span><b data-act="abre" data-id="'+p.id+'">'+esc(p.nome)+'</b><small>'+esc(p.grupo||'')+' · por '+un+(p.tipo==='revenda'?' · revenda':'')+'</small></span></div>'+
      '<div class="pc-c"><span class="pc-lb">Custo</span><b>'+F.moeda(a.c)+'</b><small>'+(p.tipo==='revenda'?'compra':'da receita')+'</small></div>'+
      '<div class="pc-p"><span class="pc-lb">Preço de venda</span><label><em>R$</em><input inputmode="decimal" data-pv="'+p.id+'" value="'+money(a.pv)+'" placeholder="0,00"></label><button class="pc-sug" data-act="sug" data-id="'+p.id+'">Sugerido p/ '+s.meta+'%: '+F.moeda(sugerido(a.c))+'</button></div>'+
      '<div class="pc-r '+a.sit+'"><span class="pc-lb">Lucro</span><b>'+(a.pv?F.pct(a.m):'—')+'</b><small>'+(a.pv?F.moeda(a.l)+' por '+un:'sem preço')+'</small></div>'+barra(a)+'</div>'; }
  function atualizaLinha(id){ var p=LFI.prod(id), box=el.querySelector('.pc-it[data-id="'+id+'"]'); if(!box) return; var a=calc(p), un=p.un==='un'?'unidade':p.un;
    var r=box.querySelector('.pc-r'); r.className='pc-r '+a.sit; r.querySelector('b').textContent=a.pv?F.pct(a.m):'—'; r.querySelector('small').textContent=a.pv?F.moeda(a.l)+' por '+un:'sem preço';
    var b=box.querySelector('.pc-bar'); b.outerHTML=barra(a); box.classList.toggle('mud', s.novos[id]!=null&&s.novos[id]!==(p.preco||0)); }
  function lista(){
    var ls=filtrados().filter(function(p){ return !s.sit||calc(p).sit===s.sit; }), mostra=ls.slice(0,s.lim);
    el.querySelector('#pc-l').innerHTML=(mostra.length?mostra.map(linha).join(''):'<div class="card">'+UI.vazio('Nenhum produto encontrado.','🔎')+'</div>')+(ls.length>mostra.length?'<button class="btn sec pc-mais" data-act="mais">Mostrar mais ('+(ls.length-mostra.length)+')</button>':'');
    UI.els('input[data-pv]', el).forEach(function(inp){ inp.addEventListener('input', function(){ var id=inp.getAttribute('data-pv'); s.novos[id]=r2(numIn(inp.value)); atualizaLinha(id); barraSalvar(); kpis(); }); });
  }
  function barraSalvar(){ var n=Object.keys(s.novos).filter(function(id){ var p=LFI.prod(id); return p&&s.novos[id]!==(p.preco||0); }).length;
    el.querySelector('#pc-salvar').classList.toggle('on', n>0); el.querySelector('#pc-sv').innerHTML=UI.ic('check')+'Salvar '+n+(n===1?' preço':' preços'); }
  kpis(); lista(); barraSalvar();
  el.querySelector('#pc-q').addEventListener('input', function(ev){ s.q=ev.target.value; s.lim=50; kpis(); lista(); });
  el.querySelector('#pc-meta').addEventListener('input', function(ev){ s.meta=Math.min(95,Math.max(0,numIn(ev.target.value))); UI.els('.pc-sug', el).forEach(function(b){ var p=LFI.prod(b.getAttribute('data-id')); b.textContent='Sugerido p/ '+s.meta+'%: '+F.moeda(sugerido(LFI.custoProduto(p))); }); UI.els('.pc-it', el).forEach(function(x){ atualizaLinha(x.getAttribute('data-id')); }); });
  UI.liga(el, UI.navHandlers({
    grp:function(g){ s.grupo=g; s.lim=50; LFI.recarregar(); },
    sit:function(k){ s.sit=s.sit===k?'':k; s.lim=50; kpis(); lista(); },
    mais:function(){ s.lim+=100; lista(); },
    sug:function(id){ var p=LFI.prod(id), v=r2(sugerido(LFI.custoProduto(p))); s.novos[id]=v; var inp=el.querySelector('input[data-pv="'+id+'"]'); if(inp) inp.value=money(v); atualizaLinha(id); barraSalvar(); kpis(); },
    abre:function(id){ LFI.ir('produtos', id); },
    desfaz:function(){ s.novos={}; LFI.recarregar(); },
    salva:function(){ var n=0; Object.keys(s.novos).forEach(function(id){ var p=LFI.prod(id); if(!p) return; var v=s.novos[id]; if(v===(p.preco||0)) return; p.preco=v; var r=LFI.receitaDe(p); if(r) r.preco=v; n++; });
      s.novos={}; LFI.atividade('preco', n+(n===1?' preço de venda atualizado':' preços de venda atualizados')+' na precificação',{tela:'custos'}); LFI.salvar(); UI.toast('Preços salvos', n+(n===1?' produto atualizado':' produtos atualizados')); LFI.recarregar(); }
  }));
}

LFI.registrar('custos',{titulo:'Precificação', render:render});
})();
