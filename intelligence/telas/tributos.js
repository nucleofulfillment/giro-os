/* LiveFood Intelligence — GESTÃO TRIBUTÁRIA INTELIGENTE
   Classificação fiscal por produto, regras configuráveis (Produto > NCM > Categoria) com fluxo de validação
   pelo contador, ranking de carga estimada por categoria e a distinção entre imposto destacado na nota,
   crédito potencial e carga estimada. Nenhuma alíquota é presumida: tudo vem de db.regrasTrib ou das notas. */
(function(){
'use strict';
var LFI=window.LFI, UI=LFI.ui, F=LFI.fmt, esc=UI.esc, r2=LFI.dataUtil.r2;
var CT={icms:'#1C1C1E', pis:'#1D4ED8', cofins:'#0891B2', ipi:'#FF5A00', st:'#B08A00'};
var UFS=['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
var OPERACOES=['Compra para revenda','Compra para industrialização','Uso e consumo','Ativo imobilizado','Transferência entre filiais'];
var REGIMES=['Todos','Simples Nacional','Lucro Presumido','Lucro Real'];

function css(){
  if(document.getElementById('css-tributos')) return;
  var s=document.createElement('style'); s.id='css-tributos';
  s.textContent=
  '.tela-tributos .grid>.card+.card{margin-top:0}#tr-ros .donut-wrap,#dr-ros .donut-wrap{flex-direction:column;align-items:stretch}#tr-ros .donut-wrap .ch,#dr-ros .donut-wrap .ch{margin:0 auto}'+
  '.tr-aviso{display:flex;gap:14px;align-items:flex-start;background:#FFF8E1;border:1px solid #F3DD9B;border-radius:14px;padding:14px 16px;margin-bottom:16px;color:#5C4300}'+
  '.tr-aviso .ic{width:34px;height:34px;border-radius:10px;background:#FDE9A8;display:flex;align-items:center;justify-content:center;flex:none}'+
  '.tr-aviso .ic svg{width:18px;height:18px;stroke:#7A5A00;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}'+
  '.tr-aviso .tt{display:block;font-size:13.5px;font-weight:800;margin-bottom:3px;color:#4A3600}.tr-aviso p b{color:#4A3600;font-weight:800}.tr-aviso p{margin:0;font-size:12.5px;line-height:1.55;font-weight:600}'+
  '.tr-rk{display:flex;flex-direction:column;gap:12px}'+
  '.tr-rk .it{cursor:pointer;padding:6px 8px;margin:0 -8px;border-radius:10px;transition:background .12s}.tr-rk .it:hover{background:var(--s2)}'+
  '.tr-rk .t{display:flex;justify-content:space-between;gap:10px;align-items:baseline;margin-bottom:6px}'+
  '.tr-rk .t span{font-size:13px;font-weight:800;min-width:0}.tr-rk .t span small{display:block;font-size:11px;color:var(--muted);font-weight:600;margin-top:1px}'+
  '.tr-rk .t b{font-size:15px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right}.tr-rk .t b small{display:block;font-size:11px;color:var(--muted);font-weight:700}'+
  '.tr-stk{display:flex;height:12px;border-radius:99px;background:var(--s4);overflow:hidden}.tr-stk i{display:block;height:100%}'+
  '.tr-cc{display:flex;flex-direction:column;height:100%}.tr-cc .hd{display:flex;gap:10px;align-items:flex-start;margin-bottom:10px}'+
  '.tr-cc .num{width:28px;height:28px;border-radius:9px;color:#fff;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;flex:none}'+
  '.tr-cc .hd>div>b{font-size:14px;font-weight:800;display:block}.tr-cc .hd small b{color:var(--text)}.tr-cc .hd small{font-size:11.5px;color:var(--muted);font-weight:600;line-height:1.4;display:block;margin-top:2px}'+
  '.tr-cc .vl{font-size:24px;font-weight:800;font-variant-numeric:tabular-nums;margin:4px 0 2px;letter-spacing:-.3px}.tr-cc .vs{font-size:12px;color:var(--muted);font-weight:700;margin-bottom:10px}'+
  '.tr-prec{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.tr-prec .st{display:flex;align-items:center;gap:8px;background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:8px 12px}'+
  '.tr-prec .st b{font-size:13px;font-weight:800;display:block}.tr-prec .st small{font-size:11px;color:var(--muted);font-weight:600}'+
  '.tr-prec .st .n{width:22px;height:22px;border-radius:50%;background:var(--text);color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none}'+
  '.tr-prec .gt{font-weight:800;color:var(--muted);font-size:16px}'+
  '.tr-al{font-variant-numeric:tabular-nums;font-weight:700}.tr-al.z{color:var(--muted)}'+
  '.tr-tr{display:flex;flex-direction:column;gap:8px}.tr-tr .r{display:flex;gap:10px;align-items:center;border:1px solid var(--border);border-radius:12px;padding:10px 12px}'+
  '.tr-tr .r.on{border-color:var(--roxo);background:var(--lf-soft)}.tr-tr .r.off{opacity:.62}.tr-tr .r .gr{flex:1;min-width:0}.tr-tr .r b{font-size:13px;font-weight:800}.tr-tr .r small{display:block;font-size:11.5px;color:var(--muted);font-weight:600}';
  document.head.appendChild(s);
}

function st(){
  var s=LFI.estado.tributos=LFI.estado.tributos||{}, d={aba:'visao', base:'estoque', grupo:'cat', fCat:'', fSt:'', fEsc:'', q:'', rSt:''};
  for(var k in d) if(s[k]===undefined) s[k]=d[k];
  return s;
}
function produtosFiscais(){ return LFI.db.produtos.filter(function(p){ return p.tipo!=='sobra'; }); }
function nomeAlvo(r){ if(r.escopo==='Produto'){ var p=LFI.prod(r.alvo); return p?p.nome:r.alvo; } if(r.escopo==='Categoria'){ var c=LFI.cat(r.alvo); return c?c.nome:r.alvo; } return 'NCM '+r.alvo; }
function stRegra(p){ var r=LFI.regraDoProduto(p); return r?r.status:'sem'; }
function seloSt(s){ return s==='sem'?UI.badge('Sem regra','no'):UI.status('trib', s); }
function al(v){ return v==null?'<span class="tr-al z">—</span>':'<span class="tr-al'+(v?'':' z')+'">'+F.pctN(v,2)+'</span>'; }
function produtosDaRegra(r){ return produtosFiscais().filter(function(p){ return LFI.regraDoProduto(p)===r; }); }

/* compras por produto nas notas lançadas da empresa selecionada */
function comprasPorProduto(){ var o={}; LFI.db.notas.forEach(function(n){ if(n.status!=='lancada'||!LFI.empresaVisivel(n.empresa)) return; n.itens.forEach(function(it){ if(it.prod) o[it.prod]=(o[it.prod]||0)+it.vProd; }); }); return o; }
function baseDe(p, base, cp){ return base==='compras' ? (cp[p.id]||0) : LFI.valorEstoque(p, LFI.depIds()); }

/* agrupa produtos por categoria (ou tipo de operação da regra) com a composição da carga estimada */
function agrupar(base, grupo){
  var cp=comprasPorProduto(), g={};
  produtosFiscais().forEach(function(p){
    var b=baseDe(p,base,cp); if(b<=0) return;
    var c=LFI.cargaEstimada(p), k = grupo==='op' ? (c.regra&&c.regra.operacao||'Sem regra cadastrada') : p.cat;
    var o=g[k]=g[k]||{k:k, base:0, baseCob:0, baseSem:0, icms:0, pis:0, cofins:0, ipi:0, n:0, nSem:0, st:0};
    o.base+=b; o.n++;
    if(c.pct==null){ o.baseSem+=b; o.nSem++; return; }
    o.baseCob+=b; o.icms+=b*c.icms/100; o.pis+=b*c.pis/100; o.cofins+=b*c.cofins/100; o.ipi+=b*c.ipi/100; if(c.st) o.st++;
  });
  return Object.keys(g).map(function(k){ var o=g[k]; o.imp=o.icms+o.pis+o.cofins+o.ipi; o.pct=o.baseCob?o.imp/o.baseCob*100:null; o.nome=grupo==='op'?k:(LFI.cat(k)?LFI.cat(k).nome:k); o.cob=o.base?o.baseCob/o.base:0; return o; });
}

/* três conceitos sobre as notas lançadas: destacado, crédito potencial e carga estimada */
function conceitos(filtroEmp){
  var dest=LFI.impostosDestacados(filtroEmp?function(it,n){ return n.empresa===filtroEmp; }:null);
  var o={vProd:0, icms:0, ipi:0, pis:0, cofins:0, st:0, cred:0, est:0, estIcms:0, estPis:0, estCofins:0, estIpi:0, semRegra:0, vSem:0, prods:[]};
  Object.keys(dest).forEach(function(k){ var d=dest[k], p=LFI.prod(k); o.vProd+=d.vProd; o.icms+=d.icms; o.ipi+=d.ipi; o.pis+=d.pis; o.cofins+=d.cofins; o.st+=d.st; o.cred+=d.cred;
    var c=p?LFI.cargaEstimada(p):{pct:null}, est=null;
    if(c.pct!=null){ est=d.vProd*c.pct/100; o.est+=est; o.estIcms+=d.vProd*c.icms/100; o.estPis+=d.vProd*c.pis/100; o.estCofins+=d.vProd*c.cofins/100; o.estIpi+=d.vProd*c.ipi/100; } else { o.semRegra++; o.vSem+=d.vProd; }
    o.prods.push({id:k, p:p, vProd:d.vProd, dest:d.icms+d.ipi+d.pis+d.cofins+d.st, d:d, est:est, cred:d.cred, regra:c.regra||null}); });
  o.dest=o.icms+o.ipi+o.pis+o.cofins+o.st;
  return o;
}

/* ================= RENDER ================= */
function render(el){
  css();
  var s=st(), emp=LFI.empresaAtual(), pre=s.cat; if(pre){ delete s.cat; s.aba='visao'; }
  var pend=LFI.db.regrasTrib.filter(function(r){ return r.status==='pendente'; }).length, rev=LFI.db.regrasTrib.filter(function(r){ return r.status==='em_revisao'; }).length;
  var h=UI.cabecalho({titulo:'Gestão Tributária Inteligente', sub:(emp?esc(emp.fantasia)+' · '+esc(emp.regime)+' · CNPJ '+emp.cnpj:esc(LFI.db.grupo.nome)+' · '+LFI.db.empresas.length+' CNPJs ('+LFI.db.empresas.map(function(e){ return e.regime; }).filter(function(v,i,a){ return a.indexOf(v)===i; }).join(' e ')+')'),
    acoes:'<button class="btn sec sm" data-act="_ir" data-id="relatorios/carga">'+UI.ic('relatorio')+'Relatório de carga</button><button class="btn pri sm" data-act="novaRegra">'+UI.ic('mais')+'Nova regra tributária</button>'});
  h+='<div class="tr-aviso"><span class="ic">'+UI.ic('alerta')+'</span><div><span class="tt">Dados configuráveis e sujeitos à validação fiscal</span><p>Os percentuais desta base de demonstração são <b>exemplos</b> para ilustrar a mecânica e não substituem a análise da contabilidade. O sistema <b>não presume</b> que produtos da mesma categoria tenham o mesmo tratamento: a regra aplicada segue a precedência <b>Produto › NCM › Categoria</b>, e regras pendentes não entram nas estimativas até serem validadas pelo contador.'+(pend||rev?' Hoje há <b>'+pend+' pendente(s)</b> e <b>'+rev+' em revisão</b>.':'')+'</p></div></div>';
  var abas=[['visao','Visão tributária'],['class','Classificação fiscal'],['regras','Regras tributárias', pend+rev]];
  h+='<div class="tabs">'+abas.map(function(a){ return '<button class="'+(s.aba===a[0]?'on':'')+'" data-act="aba" data-id="'+a[0]+'">'+a[1]+(a[2]?' <span class="n">'+a[2]+'</span>':'')+'</button>'; }).join('')+'</div><div id="tr-corpo"></div>';
  el.innerHTML=h;
  var H={ aba:function(id){ s.aba=id; LFI.recarregar(); }, novaRegra:function(){ editarRegra(null); } };
  ({visao:abaVisao, class:abaClass, regras:abaRegras}[s.aba]||abaVisao)(el.querySelector('#tr-corpo'), H);
  UI.liga(el, UI.navHandlers(H));
  if(pre&&LFI.cat(pre)) setTimeout(function(){ drill(pre,'cat'); },60);
}

/* ---------- aba: visão tributária ---------- */
function abaVisao(el, H){
  var s=st(), grupos=agrupar(s.base, s.grupo), cc=conceitos(null);
  var cob=grupos.filter(function(g){ return g.pct!=null; }).sort(function(a,b){ return b.pct-a.pct; }), sem=grupos.filter(function(g){ return g.pct==null; });
  var totBase=0, totImp=0, totCob=0; grupos.forEach(function(g){ totBase+=g.base; totImp+=g.imp; totCob+=g.baseCob; });
  var h='<div class="kpis">'+
    UI.kpi({lb:'Carga estimada média', vl:totCob?F.pctN(totImp/totCob*100,2):'—', dl:'sobre '+(s.base==='compras'?'compras em notas':'estoque')+' com regra validada', hl:true})+
    UI.kpi({lb:'Imposto destacado nas notas', vl:F.moeda(cc.dest), dl:'Valores reais das NFs lançadas'})+
    UI.kpi({lb:'Crédito tributário potencial', vl:F.moeda(cc.cred), dl:'Apenas regras validadas e creditáveis'})+
    UI.kpi({lb:'Cobertura de regras validadas', vl:F.pct(totBase?totCob/totBase:0,0), dl:F.moedaK(totBase-totCob)+' da base sem regra validada', act:'aba', id:'regras'})+'</div>';
  h+='<div class="grid g21 mb"><div class="card"><h3><span class="lft">'+UI.ic('tributo')+' Ranking de carga tributária estimada <small>clique para detalhar</small></span><span style="display:flex;gap:8px;flex-wrap:wrap">'+
      '<span class="seg"><button class="'+(s.grupo==='cat'?'on':'')+'" data-act="grupo" data-id="cat">Por categoria</button><button class="'+(s.grupo==='op'?'on':'')+'" data-act="grupo" data-id="op">Por tipo de operação</button></span>'+
      '<span class="seg"><button class="'+(s.base==='estoque'?'on':'')+'" data-act="base" data-id="estoque">Base: estoque</button><button class="'+(s.base==='compras'?'on':'')+'" data-act="base" data-id="compras">Base: compras (NF)</button></span></span></h3>'+
      '<div class="ch-leg" style="margin:-4px 0 14px">'+['icms','pis','cofins','ipi'].map(function(k){ return '<span><i style="background:'+CT[k]+'"></i>'+k.toUpperCase()+'</span>'; }).join('')+'</div><div id="tr-rk"></div></div>'+
    '<div class="card"><h3>Participação no imposto estimado</h3><div id="tr-ros"></div><div id="tr-sem" style="margin-top:14px"></div></div></div>';
  h+='<div class="card mb"><h3><span class="lft">Três conceitos, três números <small>sobre as notas fiscais lançadas da empresa selecionada</small></span></h3><div class="grid g3">'+
    cartaoConceito(1,'#1C1C1E','Imposto destacado na nota','O que o fornecedor destacou no XML/DANFE das notas lançadas. É fato documental, não estimativa.', F.moeda(cc.dest), F.moeda(cc.vProd)+' em produtos', [['ICMS',cc.icms],['ICMS-ST',cc.st],['IPI',cc.ipi],['PIS',cc.pis],['COFINS',cc.cofins]])+
    cartaoConceito(2,'#16A34A','Crédito tributário potencial','Parcela do destacado que pode ser aproveitada: só regras <b>validadas</b> e marcadas como creditáveis. PIS/COFINS só gera crédito para CNPJ no regime não cumulativo (Simples Nacional e Presumido cumulativo não tomam).', F.moeda(cc.cred), F.pct(cc.dest?cc.cred/cc.dest:0)+' do destacado', null, produtosFiscais().filter(function(p){ var r=LFI.regraDoProduto(p); return r&&r.creditavel&&r.status==='validada'; }).length+' produto(s) com regra creditável validada')+
    cartaoConceito(3,'#FF5A00','Carga tributária estimada','Alíquotas das regras cadastradas × valor dos produtos. Serve para planejamento e para conferir divergências com a nota.', F.moeda(cc.est), cc.semRegra?cc.semRegra+' produto(s) sem regra validada ('+F.moeda(cc.vSem)+')':'todos os produtos com regra validada', [['ICMS',cc.estIcms],['PIS',cc.estPis],['COFINS',cc.estCofins],['IPI',cc.estIpi]])+
  '</div><h3 style="margin:18px 0 10px;font-size:14px"><span class="lft">Nota × regra por produto <small>diferenças indicam alíquota de regra a revisar ou tratamento especial na nota (ex.: ST)</small></span></h3><div id="tr-cmp"></div></div>';
  h+='<div class="card"><h3><span class="lft">'+UI.ic('empresa')+' Por CNPJ e regime tributário</span></h3><div id="tr-reg"></div></div>';
  el.innerHTML=h;

  var max=0; cob.forEach(function(g){ max=Math.max(max,g.pct); });
  el.querySelector('#tr-rk').innerHTML = cob.length ? '<div class="tr-rk">'+cob.map(function(g,i){
    var seg=['icms','pis','cofins','ipi'].map(function(k){ var p=g.baseCob?g[k]/g.baseCob*100:0; return p>0?'<i style="width:'+(p/max*100).toFixed(2)+'%;background:'+CT[k]+'" title="'+k.toUpperCase()+' '+F.pctN(p,2)+'"></i>':''; }).join('');
    return '<div class="it" data-act="drill" data-id="'+esc(g.k)+'"><div class="t"><span><b style="color:var(--muted);margin-right:6px">'+(i+1)+'</b>'+esc(g.nome)+'<small>'+g.n+' produto(s) · base '+F.moedaK(g.base)+(g.cob<0.999?' · cobertura '+F.pct(g.cob,0):'')+(g.st?' · '+g.st+' com ST':'')+'</small></span><b>'+F.pctN(g.pct,2)+'<small>'+F.moeda(g.imp)+'</small></b></div><div class="tr-stk">'+seg+'</div></div>'; }).join('')+'</div>' : UI.vazio('Sem base de cálculo para esta empresa');
  var ros=cob.filter(function(g){ return g.imp>0; }).sort(function(a,b){ return b.imp-a.imp; });
  UI.grafRosca(el.querySelector('#tr-ros'),{itens:ros.slice(0,7).map(function(g,i){ return {nome:g.nome, valor:g.imp, cor:UI.CORES[i%UI.CORES.length], id:g.k}; }), centro:{valor:F.moedaK(totImp), rotulo:'estimado'}, onClick:function(x){ drill(x.id, s.grupo); }});
  el.querySelector('#tr-sem').innerHTML = sem.length||grupos.some(function(g){ return g.nSem; }) ? UI.nota('<b>Sem regra validada:</b> '+grupos.filter(function(g){ return g.nSem; }).map(function(g){ return esc(g.nome)+' ('+g.nSem+')'; }).join(', ')+'. Esses produtos ficam fora da estimativa até a validação.','wt','alerta') : UI.nota('Todos os produtos da base têm regra validada.','ok','check');

  UI.tabela(el.querySelector('#tr-cmp'),{linhas:cc.prods, linhaId:function(x){ return x.id; }, linhaAct:'prodDet', cls:'cp', ordem:5, dir:-1, vazio:'Nenhuma nota lançada nesta empresa', colunas:[
    {t:'Produto', v:function(x){ return '<b>'+esc(x.p?x.p.nome:x.id)+'</b><small>NCM '+esc(x.p?x.p.ncm:'—')+'</small>'; }, ord:function(x){ return x.p?x.p.nome:''; }},
    {t:'Regra', v:function(x){ return x.regra?'<span class="tag">'+esc(x.regra.escopo)+'</span> '+seloSt(x.regra.status):seloSt('sem'); }, ord:function(x){ return x.regra?x.regra.status:'z'; }},
    {t:'Valor dos produtos', r:true, v:function(x){ return F.moeda(x.vProd); }, ord:function(x){ return x.vProd; }},
    {t:'(1) Destacado', r:true, v:function(x){ return '<b>'+F.moeda(x.dest)+'</b><small>'+F.pct(x.vProd?x.dest/x.vProd:0)+(x.d.st?' · ST '+F.moeda(x.d.st):'')+'</small>'; }, ord:function(x){ return x.dest; }},
    {t:'(2) Crédito', r:true, v:function(x){ return x.cred?'<b style="color:var(--green)">'+F.moeda(x.cred)+'</b>':'<span class="tr-al z">—</span>'; }, ord:function(x){ return x.cred; }},
    {t:'(3) Estimado', r:true, v:function(x){ return x.est==null?'<small style="margin:0">sem regra validada</small>':'<b>'+F.moeda(x.est)+'</b><small>'+F.pct(x.vProd?x.est/x.vProd:0)+'</small>'; }, ord:function(x){ return x.est==null?-1:x.est; }},
    {t:'Conferência', v:function(x){ if(x.est==null) return UI.badge('Validar regra','wt'); var d=x.dest-x.est; return Math.abs(d)<=Math.max(1,x.vProd*0.01)?UI.badge('Consistente','ok'):UI.badge((d>0?'Nota acima':'Nota abaixo')+' '+F.moeda(Math.abs(d)),'in'); }, ord:function(x){ return x.est==null?1e9:Math.abs(x.dest-x.est); }}
  ]});

  /* por CNPJ / regime */
  var emps=LFI.db.empresas.filter(function(e){ return LFI.empresaVisivel(e.id); });
  var rows=emps.map(function(e){ var c=conceitos(e.id), n=LFI.db.notas.filter(function(x){ return x.empresa===e.id&&x.status==='lancada'; }).length; return {e:e, c:c, n:n}; });
  var tot={v:0,d:0,cr:0,es:0}; rows.forEach(function(x){ tot.v+=x.c.vProd; tot.d+=x.c.dest; tot.cr+=x.c.cred; tot.es+=x.c.est; });
  el.querySelector('#tr-reg').innerHTML='<div class="tb-wrap"><table class="tb"><thead><tr><th>Empresa</th><th>Regime</th><th class="r">Notas</th><th class="r">Compras (produtos)</th><th class="r">(1) Destacado</th><th class="r">(2) Crédito potencial</th><th class="r">(3) Carga estimada</th><th>Observação</th></tr></thead><tbody>'+
    rows.map(function(x){ var e=x.e, deps=LFI.db.departamentos.filter(function(d){ return d.empresa===e.id; }); return '<tr><td><b>'+esc(e.fantasia)+'</b><small class="mono">'+e.cnpj+'</small><small>'+deps.map(function(d){ return d.curto; }).join(', ')+'</small></td><td>'+UI.badge(e.regime, e.regime==='Simples Nacional'?'lf':'in')+'<small>Venda: '+F.pctN(e.impVenda)+' efetiva</small></td><td class="r">'+x.n+'</td><td class="r">'+F.moeda(x.c.vProd)+'</td><td class="r"><b>'+F.moeda(x.c.dest)+'</b></td><td class="r" style="color:var(--green)"><b>'+F.moeda(x.c.cred)+'</b></td><td class="r"><b>'+F.moeda(x.c.est)+'</b>'+(x.c.semRegra?'<small>'+x.c.semRegra+' sem regra</small>':'')+'</td><td style="max-width:280px;white-space:normal;font-size:12px;color:var(--muted2);font-weight:600">'+(e.regime==='Simples Nacional'?'Não toma crédito de PIS/COFINS. Crédito de ICMS somente quando a regra validada indicar.':'Crédito de PIS/COFINS considerado apenas em regras validadas e creditáveis — confirmar regime cumulativo/não cumulativo com a contabilidade.')+'</td></tr>'; }).join('')+
    '</tbody><tfoot><tr><td colspan="3">Total</td><td class="r">'+F.moeda(tot.v)+'</td><td class="r">'+F.moeda(tot.d)+'</td><td class="r">'+F.moeda(tot.cr)+'</td><td class="r">'+F.moeda(tot.es)+'</td><td></td></tr></tfoot></table></div>';

  H.grupo=function(id){ s.grupo=id; LFI.recarregar(); };
  H.base=function(id){ s.base=id; LFI.recarregar(); };
  H.drill=function(id){ drill(id, s.grupo); };
  H.prodDet=detalheProduto;
}
function cartaoConceito(n, cor, tit, txt, vl, vs, lista, rod){
  return '<div class="card flat" style="margin:0"><div class="tr-cc"><div class="hd"><span class="num" style="background:'+cor+'">'+n+'</span><div><b>'+tit+'</b><small>'+txt+'</small></div></div><div class="vl">'+vl+'</div><div class="vs">'+vs+'</div>'+
    (lista?lista.map(function(l){ return '<div class="lnr"><span class="k">'+l[0]+'</span><span class="v">'+F.moeda(l[1])+'</span></div>'; }).join(''):'')+(rod?UI.nota(rod,'ok','check'):'')+'</div></div>';
}

/* drill-down de uma categoria (ou tipo de operação) */
function drill(k, grupo){
  var s=st(), cp=comprasPorProduto(), dest=LFI.impostosDestacados();
  var ps=produtosFiscais().filter(function(p){ if(grupo==='op'){ var r=LFI.regraDoProduto(p); return ((r&&r.operacao)||'Sem regra cadastrada')===k; } return p.cat===k; });
  var nome = grupo==='op'?k:(LFI.cat(k)?LFI.cat(k).nome:k);
  var linhas=ps.map(function(p){ var c=LFI.cargaEstimada(p), b=baseDe(p,s.base,cp), d=dest[p.id]; return {id:p.id, p:p, c:c, b:b, imp:c.pct!=null?b*c.pct/100:null, dest:d?d.icms+d.ipi+d.pis+d.cofins+d.st:0}; });
  var tb=0, ti=0, comp={icms:0,pis:0,cofins:0,ipi:0}, nSem=0, tc=0;
  linhas.forEach(function(l){ tb+=l.b; if(l.c.pct==null){ nSem++; return; } tc+=l.b; ti+=l.imp; ['icms','pis','cofins','ipi'].forEach(function(t){ comp[t]+=l.b*l.c[t]/100; }); });
  var corpo='<div class="kpis">'+UI.kpi({lb:'Base ('+(s.base==='compras'?'compras':'estoque')+')', vl:F.moeda(tb)})+UI.kpi({lb:'Imposto estimado', vl:F.moeda(ti)})+UI.kpi({lb:'Carga estimada', vl:tc?F.pctN(ti/tc*100,2):'—', hl:true})+UI.kpi({lb:'Sem regra validada', vl:String(nSem), dl:'de '+linhas.length+' produto(s)'})+'</div>'+
    '<div class="grid g12 mb"><div class="card flat" style="margin:0"><h3>Composição da carga</h3><div id="dr-ros"></div></div><div class="card flat" style="margin:0"><h3>Por que os produtos diferem?</h3>'+
    UI.nota('Cada produto usa a regra mais específica: <b>Produto</b>, depois <b>NCM</b>, depois <b>Categoria</b>. Por isso, produtos da mesma categoria podem ter cargas diferentes — por exemplo, NCM com substituição tributária, isenção ou alíquota própria.','in')+
    '<div class="lnr"><span class="k">Regras por produto</span><span class="v">'+linhas.filter(function(l){ return l.c.regra&&l.c.regra.escopo==='Produto'; }).length+'</span></div><div class="lnr"><span class="k">Regras por NCM</span><span class="v">'+linhas.filter(function(l){ return l.c.regra&&l.c.regra.escopo==='NCM'; }).length+'</span></div><div class="lnr"><span class="k">Regras por categoria</span><span class="v">'+linhas.filter(function(l){ return l.c.regra&&l.c.regra.escopo==='Categoria'; }).length+'</span></div><div class="lnr"><span class="k">Sem regra</span><span class="v">'+linhas.filter(function(l){ return !l.c.regra; }).length+'</span></div></div></div><div id="dr-t"></div>';
  var m=UI.modal({titulo:'Carga tributária · '+esc(nome), sub:'Produtos, classificação fiscal e composição da carga estimada', tam:'xl', corpo:corpo,
    botoes:'<button class="btn sec" data-act="_fechar">Fechar</button>'+(grupo==='cat'?'<button class="btn pri" data-act="cl">Abrir na classificação fiscal</button>':''),
    acoes:{cl:function(){ m.fechar(); s.aba='class'; s.fCat=k; s.fSt=s.fEsc=s.q=''; if(LFI.atual().id==='tributos') LFI.recarregar(); else LFI.ir('tributos'); }, p:function(id){ detalheProduto(id); }}});
  setTimeout(function(){ UI.grafRosca(m.corpo.querySelector('#dr-ros'),{itens:['icms','pis','cofins','ipi'].map(function(t){ return {nome:t.toUpperCase(), valor:comp[t], cor:CT[t]}; }), centro:{valor:F.moedaK(ti), rotulo:'estimado'}}); },30);
  UI.tabela(m.corpo.querySelector('#dr-t'),{linhas:linhas, linhaAct:'p', cls:'cp', ordem:9, dir:-1, colunas:colunasFiscais().concat([
    {t:'Base', r:true, v:function(l){ return F.moeda(l.b); }, ord:function(l){ return l.b; }},
    {t:'Imposto est.', r:true, v:function(l){ return l.imp==null?'—':'<b>'+F.moeda(l.imp)+'</b>'; }, ord:function(l){ return l.imp||0; }},
    {t:'Destacado (NF)', r:true, v:function(l){ return l.dest?F.moeda(l.dest):'<span class="tr-al z">—</span>'; }, ord:function(l){ return l.dest; }}])});
}
function colunasFiscais(){
  return [
    {t:'Produto', v:function(l){ return '<b>'+esc(l.p.nome)+'</b><small>'+esc(LFI.cat(l.p.cat).nome)+'</small>'; }, ord:function(l){ return l.p.nome; }},
    {t:'NCM / CEST', v:function(l){ return '<span class="mono">'+esc(l.p.ncm)+'</span><small>'+(l.p.cest?'CEST '+esc(l.p.cest):'sem CEST')+'</small>'; }, ord:function(l){ return l.p.ncm; }},
    {t:'Regra aplicada', v:function(l){ var r=l.c.regra; return r?'<b style="font-size:12.5px">'+esc(r.nome)+'</b><small><span class="tag">'+esc(r.escopo)+'</span> '+seloSt(r.status)+'</small>':seloSt('sem'); }, ord:function(l){ return l.c.regra?l.c.regra.status:'zz'; }},
    {t:'ICMS', r:true, v:function(l){ return al(l.c.regra&&l.c.regra.status!=='pendente'?l.c.regra.icms:null); }, ord:function(l){ return l.c.icms||0; }},
    {t:'PIS', r:true, v:function(l){ return al(l.c.regra&&l.c.regra.status!=='pendente'?l.c.regra.pis:null); }, ord:function(l){ return l.c.pis||0; }},
    {t:'COFINS', r:true, v:function(l){ return al(l.c.regra&&l.c.regra.status!=='pendente'?l.c.regra.cofins:null); }, ord:function(l){ return l.c.cofins||0; }},
    {t:'IPI', r:true, v:function(l){ return al(l.c.regra&&l.c.regra.status!=='pendente'?l.c.regra.ipi:null); }, ord:function(l){ return l.c.ipi||0; }},
    {t:'ST', c:true, v:function(l){ var r=l.c.regra; return r&&r.st?UI.badge('ST','wt'):r&&r.st===false?'<span class="tr-al z">Não</span>':'<span class="tr-al z">—</span>'; }, ord:function(l){ return l.c.st?1:0; }},
    {t:'Carga estimada', r:true, v:function(l){ return l.c.pct==null?'<small style="margin:0;color:var(--red)">sem regra validada</small>':'<b>'+F.pctN(l.c.pct,2)+'</b>'; }, ord:function(l){ return l.c.pct==null?-1:l.c.pct; }}
  ];
}

/* ---------- aba: classificação fiscal ---------- */
function abaClass(el, H){
  var s=st(), nrm=function(x){ return String(x||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); };
  var todos=produtosFiscais().map(function(p){ return {id:p.id, p:p, c:LFI.cargaEstimada(p)}; });
  var ls=todos.filter(function(l){ var stt=l.c.regra?l.c.regra.status:'sem';
    return (!s.fCat||l.p.cat===s.fCat)&&(!s.fSt||stt===s.fSt)&&(!s.fEsc||(s.fEsc==='nenhum'?!l.c.regra:l.c.regra&&l.c.regra.escopo===s.fEsc))&&(!s.q||nrm(l.p.nome).indexOf(nrm(s.q))>=0||l.p.ncm.indexOf(s.q)>=0); });
  var cnt=function(f){ return todos.filter(f).length; };
  var h='<div class="kpis">'+
    UI.kpi({lb:'Produtos classificados', vl:String(todos.length), dl:cnt(function(l){ return l.p.cest; })+' com CEST informado'})+
    UI.kpi({lb:'Com regra validada', vl:String(cnt(function(l){ return l.c.regra&&l.c.regra.status==='validada'; })), dl:F.pct(cnt(function(l){ return l.c.regra&&l.c.regra.status==='validada'; })/Math.max(1,todos.length),0)+' do cadastro', act:'fStQ', id:'validada'})+
    UI.kpi({lb:'Pendentes ou sem regra', vl:String(cnt(function(l){ return !l.c.regra||l.c.regra.status==='pendente'; })), dl:'Fora da estimativa de carga', act:'fStQ', id:'pendente'})+
    UI.kpi({lb:'Em revisão', vl:String(cnt(function(l){ return l.c.regra&&l.c.regra.status==='em_revisao'; })), dl:'Entram na estimativa com ressalva', act:'fStQ', id:'em_revisao'})+'</div>';
  h+='<div class="card"><h3><span class="lft">Classificação fiscal por produto <small>'+ls.length+' de '+todos.length+' · clique para ver a precedência das regras</small></span><span style="display:flex;gap:8px;flex-wrap:wrap">'+
    '<div class="search">'+UI.ic('busca')+'<input placeholder="Produto ou NCM" data-inp="q" value="'+esc(s.q)+'"></div>'+
    '<select class="inp sm" style="width:auto" data-chg="fCat"><option value="">Todas as categorias</option>'+LFI.db.categorias.filter(function(c){ return c.id!=='sob'; }).map(function(c){ return '<option value="'+c.id+'"'+(s.fCat===c.id?' selected':'')+'>'+esc(c.nome)+'</option>'; }).join('')+'</select>'+
    '<select class="inp sm" style="width:auto" data-chg="fSt"><option value="">Todos os status</option>'+[['validada','Validada'],['em_revisao','Em revisão'],['pendente','Pendente de validação'],['sem','Sem regra']].map(function(x){ return '<option value="'+x[0]+'"'+(s.fSt===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select>'+
    '<select class="inp sm" style="width:auto" data-chg="fEsc"><option value="">Qualquer escopo</option>'+[['Produto','Regra por produto'],['NCM','Regra por NCM'],['Categoria','Regra por categoria'],['nenhum','Sem regra']].map(function(x){ return '<option value="'+x[0]+'"'+(s.fEsc===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select>'+
    (s.fCat||s.fSt||s.fEsc||s.q?'<button class="btn gh sm" data-act="limpar">Limpar filtros</button>':'')+
    '<button class="btn sec sm" data-act="xls">'+UI.ic('baixar')+'Excel</button></span></h3><div id="cl-t"></div></div>';
  el.innerHTML=h;
  UI.tabela(el.querySelector('#cl-t'),{linhas:ls, linhaAct:'prodDet', cls:'cp', vazio:'Nenhum produto com estes filtros', colunas:colunasFiscais()});
  var t; H.q=function(_,ev){ clearTimeout(t); var v=ev.target.value; t=setTimeout(function(){ s.q=v; LFI.recarregar(); var i=document.querySelector('[data-inp="q"]'); if(i){ i.focus(); i.setSelectionRange(v.length,v.length); } },250); };
  H.fCat=function(_,ev){ s.fCat=ev.target.value; LFI.recarregar(); };
  H.fSt=function(_,ev){ s.fSt=ev.target.value; LFI.recarregar(); };
  H.fEsc=function(_,ev){ s.fEsc=ev.target.value; LFI.recarregar(); };
  H.fStQ=function(id){ s.fSt=id; LFI.recarregar(); };
  H.limpar=function(){ s.fCat=s.fSt=s.fEsc=s.q=''; LFI.recarregar(); };
  H.prodDet=detalheProduto;
  H.xls=function(){ UI.exportarExcel('classificacao_fiscal',['Produto','Categoria','NCM','CEST','Regra','Escopo','Status','ICMS %','PIS %','COFINS %','IPI %','ST','Creditável','Carga estimada %'],
    ls.map(function(l){ var r=l.c.regra, ok=r&&r.status!=='pendente'; return [l.p.nome, LFI.cat(l.p.cat).nome, l.p.ncm, l.p.cest||'', r?r.nome:'Sem regra', r?r.escopo:'', r?LFI.STATUS.trib[r.status][0]:'Sem regra', ok?r.icms:'', ok?r.pis:'', ok?r.cofins:'', ok?r.ipi:'', r&&r.st?'Sim':'Não', r&&r.creditavel?'Sim':'Não', l.c.pct==null?'sem regra validada':l.c.pct]; }), 'Classificação'); UI.toast('Planilha gerada', ls.length+' produtos'); };
}

/* detalhe fiscal do produto com a cadeia de precedência */
function detalheProduto(id){
  var p=LFI.prod(id); if(!p) return;
  var rs=LFI.db.regrasTrib, ap=LFI.regraDoProduto(p), c=LFI.cargaEstimada(p);
  var cand=[['Produto', rs.filter(function(r){ return r.escopo==='Produto'&&r.alvo===p.id; })[0], 'Regra específica deste produto'],
            ['NCM', rs.filter(function(r){ return r.escopo==='NCM'&&r.alvo===p.ncm; })[0], 'NCM '+p.ncm],
            ['Categoria', rs.filter(function(r){ return r.escopo==='Categoria'&&r.alvo===p.cat; })[0], LFI.cat(p.cat).nome]];
  var d=LFI.impostosDestacados(function(it){ return it.prod===p.id; })[p.id];
  var corpo='<div class="kv c4" style="margin-bottom:16px"><div><span>NCM</span><b class="mono">'+esc(p.ncm)+'</b></div><div><span>CEST</span><b>'+(p.cest?esc(p.cest):'—')+'</b></div><div><span>Categoria</span><b>'+esc(LFI.cat(p.cat).nome)+'</b></div><div><span>Carga estimada</span><b>'+(c.pct==null?'<span style="color:var(--red)">sem regra validada</span>':F.pctN(c.pct,2))+'</b></div></div>'+
    '<h3 style="font-size:14px;font-weight:800;margin:0 0 8px">Precedência das regras</h3><div class="tr-tr">'+cand.map(function(x,i){ var r=x[1], on=r&&r===ap;
      return '<div class="r'+(on?' on':r?' off':'')+'"><span class="tag">'+(i+1)+'º '+x[0]+'</span><div class="gr"><b>'+(r?esc(r.nome):'Nenhuma regra cadastrada')+'</b><small>'+esc(x[2])+(r?' · ICMS '+(r.icms==null?'—':F.pctN(r.icms,2))+' · PIS '+(r.pis==null?'—':F.pctN(r.pis,2))+' · COFINS '+(r.cofins==null?'—':F.pctN(r.cofins,2))+' · IPI '+(r.ipi==null?'—':F.pctN(r.ipi,2))+(r.st?' · ST':''):'')+'</small></div>'+(r?seloSt(r.status):'')+(on?UI.badge('Aplicada','lf'):r?UI.badge('Substituída','nu'):'')+'</div>'; }).join('')+'</div>'+
    (ap&&ap.obs?UI.nota(esc(ap.obs),'in'):'')+
    (ap&&ap.status==='pendente'?UI.nota('A regra aplicada está <b>pendente de validação</b>: este produto não entra na carga estimada.','wt','alerta'):'')+
    '<h3 style="font-size:14px;font-weight:800;margin:14px 0 8px">Destacado nas notas lançadas</h3>'+
    (d?'<div class="kv c4"><div><span>Valor dos produtos</span><b>'+F.moeda(d.vProd)+'</b></div><div><span>ICMS / ST</span><b>'+F.moeda(d.icms)+' / '+F.moeda(d.st)+'</b></div><div><span>PIS / COFINS / IPI</span><b>'+F.moeda(d.pis+d.cofins+d.ipi)+'</b></div><div><span>Crédito potencial</span><b style="color:var(--green)">'+F.moeda(d.cred)+'</b></div></div>':UI.vazio('Nenhuma nota lançada com este produto nesta empresa'));
  var m=UI.modal({titulo:esc(p.nome), sub:'Classificação fiscal e regra aplicada', tam:'lg', corpo:corpo,
    botoes:'<button class="btn sec" data-act="_fechar">Fechar</button>'+(ap?'<button class="btn sec" data-act="ed">Editar regra aplicada</button>':'')+(cand[0][1]?'':'<button class="btn pri" data-act="nova">Criar regra específica do produto</button>'),
    acoes:{ed:function(){ m.fechar(); editarRegra(ap.id); }, nova:function(){ m.fechar(); var base=ap||{}; editarRegra(null,{escopo:'Produto', alvo:p.id, nome:p.nome, regime:base.regime||'Todos', ufOrig:base.ufOrig||'SP', ufDest:base.ufDest||'SP', operacao:base.operacao||OPERACOES[1]}); }}});
}

/* ---------- aba: regras ---------- */
function abaRegras(el, H){
  var s=st(), rs=LFI.db.regrasTrib, cnt=function(x){ return rs.filter(function(r){ return r.status===x; }).length; };
  var ls=rs.filter(function(r){ return !s.rSt||r.status===s.rSt; });
  var h='<div class="card mb"><h3><span class="lft">'+UI.ic('filtro')+' Como a regra é escolhida</span></h3><div class="tr-prec">'+
    '<div class="st"><span class="n">1</span><div><b>Produto</b><small>regra específica do item</small></div></div><span class="gt">›</span>'+
    '<div class="st"><span class="n">2</span><div><b>NCM</b><small>classificação fiscal</small></div></div><span class="gt">›</span>'+
    '<div class="st"><span class="n">3</span><div><b>Categoria</b><small>regra geral, só na falta das anteriores</small></div></div>'+
    '<span style="flex:1"></span><small style="font-size:12px;color:var(--muted);font-weight:600;max-width:420px">Cada regra também registra regime tributário, UF de origem e destino e tipo de operação. Regras <b>pendentes</b> não entram nas estimativas; alterar uma regra validada a devolve para revisão.</small></div></div>';
  h+='<div class="card"><h3><span class="lft">Regras tributárias cadastradas <small>'+rs.length+' regras</small></span><span style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><div class="pills">'+
    [['','Todas',rs.length],['validada','Validadas',cnt('validada')],['em_revisao','Em revisão',cnt('em_revisao')],['pendente','Pendentes',cnt('pendente')]].map(function(x){ return '<button class="pill'+(s.rSt===x[0]?' on':'')+'" data-act="rSt" data-id="'+x[0]+'">'+x[1]+' <span class="c">'+x[2]+'</span></button>'; }).join('')+
    '</div><button class="btn pri sm" data-act="novaRegra">'+UI.ic('mais')+'Nova regra</button></span></h3><div id="rg-t"></div></div>';
  el.innerHTML=h;
  UI.tabela(el.querySelector('#rg-t'),{linhas:ls, cls:'cp', vazio:'Nenhuma regra neste status', classeLinha:function(r){ return r.status==='pendente'?'alerta':r.status==='em_revisao'?'aviso':''; }, colunas:[
    {t:'Regra', v:function(r){ return '<b>'+esc(r.nome)+'</b><small><span class="tag">'+esc(r.escopo)+'</span> '+(r.escopo==='NCM'?'<span class="mono">'+esc(r.alvo)+'</span>':esc(nomeAlvo(r)))+'</small>'; }, ord:function(r){ return r.nome; }},
    {t:'Regime · operação', v:function(r){ return esc(r.regime)+'<small>'+esc(r.operacao)+' · '+esc(r.ufOrig)+' → '+esc(r.ufDest)+'</small>'; }, ord:function(r){ return r.regime; }},
    {t:'ICMS', r:true, v:function(r){ return al(r.icms); }, ord:function(r){ return r.icms||0; }},
    {t:'PIS', r:true, v:function(r){ return al(r.pis); }, ord:function(r){ return r.pis||0; }},
    {t:'COFINS', r:true, v:function(r){ return al(r.cofins); }, ord:function(r){ return r.cofins||0; }},
    {t:'IPI', r:true, v:function(r){ return al(r.ipi); }, ord:function(r){ return r.ipi||0; }},
    {t:'ST / MVA', v:function(r){ return r.st?UI.badge('ST','wt')+(r.mva?'<small>'+esc(r.mva)+'</small>':''):r.st===false?'<span class="tr-al z">Não</span>':'<span class="tr-al z">—</span>'; }, ord:function(r){ return r.st?1:0; }},
    {t:'Crédito', c:true, v:function(r){ return r.creditavel?UI.badge('Creditável','ok'):r.creditavel===false?'<span class="tr-al z">Não</span>':'<span class="tr-al z">—</span>'; }, ord:function(r){ return r.creditavel?1:0; }},
    {t:'Produtos', r:true, v:function(r){ var n=produtosDaRegra(r).length; return n?'<b>'+n+'</b>':'<span class="tr-al z" title="Substituída por regras mais específicas">0</span>'; }, ord:function(r){ return produtosDaRegra(r).length; }},
    {t:'Status', v:function(r){ return UI.status('trib', r.status)+(r.validadoPor?'<small>'+esc(r.validadoPor)+(r.validadoEm?' · '+F.data(r.validadoEm):'')+'</small>':''); }, ord:function(r){ return r.status; }},
    {t:'', ord:false, r:true, v:function(r){ return '<span style="display:inline-flex;gap:4px">'+(r.status!=='validada'?'<button class="btn ok xs" data-act="validar" data-id="'+r.id+'">'+UI.ic('check')+'Validar</button>':'<button class="btn sec xs" data-act="revisao" data-id="'+r.id+'">Revisar</button>')+'<button class="btn gh xs" data-act="editar" data-id="'+r.id+'" title="Editar">'+UI.ic('editar')+'</button><button class="btn gh xs" data-act="excluir" data-id="'+r.id+'" title="Excluir">'+UI.ic('lixo')+'</button></span>'; }}
  ]});
  H.rSt=function(id){ s.rSt=id; LFI.recarregar(); };
  H.editar=function(id){ editarRegra(id); };
  H.validar=validarRegra;
  H.revisao=function(id){ var r=LFI.regra(id); UI.confirmar('Enviar para revisão', 'A regra <b>'+esc(r.nome)+'</b> volta ao status <b>Em revisão</b> e precisará ser validada novamente pela contabilidade.', 'Enviar para revisão', function(){ r.status='em_revisao'; LFI.atividade('trib','Regra "'+r.nome+'" enviada para revisão',{tela:'tributos'}); LFI.salvar(); UI.toast('Regra em revisão', r.nome, 'wt'); LFI.recarregar(); }); };
  H.excluir=function(id){ var r=LFI.regra(id), n=produtosDaRegra(r).length; UI.confirmar('Excluir regra tributária', 'Excluir <b>'+esc(r.nome)+'</b>? '+(n?n+' produto(s) passarão a usar a próxima regra na precedência (ou ficarão sem regra).':'Nenhum produto usa esta regra hoje.'), 'Excluir', function(){ LFI.db.regrasTrib=LFI.db.regrasTrib.filter(function(x){ return x.id!==id; }); LFI.atividade('trib','Regra "'+r.nome+'" excluída',{tela:'tributos'}); LFI.salvar(); UI.toast('Regra excluída', r.nome); LFI.recarregar(); }, 'no'); };
}

function validarRegra(id){
  var r=LFI.regra(id);
  if(r.icms==null||r.pis==null||r.cofins==null||r.ipi==null){ UI.toast('Preencha as alíquotas antes de validar', r.nome, 'wt'); editarRegra(id); return; }
  var afet=produtosDaRegra(r);
  var m=UI.modal({titulo:'Validar regra tributária', sub:esc(r.nome)+' · '+esc(r.escopo)+' '+esc(nomeAlvo(r)), corpo:
    '<div class="kv c4" style="margin-bottom:14px"><div><span>ICMS</span><b>'+F.pctN(r.icms,2)+'</b></div><div><span>PIS</span><b>'+F.pctN(r.pis,2)+'</b></div><div><span>COFINS</span><b>'+F.pctN(r.cofins,2)+'</b></div><div><span>IPI</span><b>'+F.pctN(r.ipi,2)+'</b></div></div>'+
    UI.nota('Ao validar, a regra passa a compor a <b>carga estimada</b>'+(r.creditavel?' e o <b>crédito potencial</b>':'')+' de '+afet.length+' produto(s): '+esc(afet.slice(0,6).map(function(p){ return p.nome; }).join(', '))+(afet.length>6?'…':'')+'.','in')+
    '<div class="field"><label>Validado por (contador responsável)</label><input class="inp" id="vr-por" value="'+esc(r.validadoPor||'Contabilidade Alves & Prado')+'"></div>'+
    '<div class="field"><label>Observação da validação</label><textarea class="inp" id="vr-obs" placeholder="Fundamento legal, número do parecer, ressalvas…">'+esc(r.obs||'')+'</textarea></div>',
    botoes:'<button class="btn sec" data-act="_fechar">Cancelar</button><button class="btn ok" data-act="ok">'+UI.ic('check')+'Confirmar validação</button>',
    acoes:{ok:function(){ var por=m.el.querySelector('#vr-por').value.trim(); if(!por){ UI.toast('Informe quem validou a regra','','wt'); return; }
      r.status='validada'; r.validadoPor=por; r.validadoEm=LFI.hoje(); r.obs=m.el.querySelector('#vr-obs').value.trim();
      LFI.atividade('trib','Regra "'+r.nome+'" validada por '+por,{tela:'tributos'}); LFI.salvar(); m.fechar(); UI.toast('Regra validada', r.nome+' · '+afet.length+' produto(s) na estimativa'); LFI.recarregar(); }}});
}

/* cadastro / edição de regra */
function editarRegra(id, pre){
  var r=id?LFI.regra(id):null, o=r?JSON.parse(JSON.stringify(r)):Object.assign({escopo:'NCM', alvo:'', nome:'', regime:'Todos', ufOrig:'SP', ufDest:'SP', operacao:OPERACOES[1], icms:null, pis:null, cofins:null, ipi:null, st:false, mva:'', creditavel:false, status:'pendente', validadoPor:'', obs:''}, pre||{});
  function selOpts(lista, v){ return lista.map(function(x){ var val=x.push?x[0]:x, t=x.push?x[1]:x; return '<option value="'+esc(val)+'"'+(String(val)===String(v)?' selected':'')+'>'+esc(t)+'</option>'; }).join(''); }
  function campoAlvo(esc_){
    if(esc_==='Produto') return '<select class="inp" id="rg-alvo">'+UI.selProdutos(o.alvo)+'</select>';
    if(esc_==='Categoria') return '<select class="inp" id="rg-alvo"><option value="">Selecione…</option>'+selOpts(LFI.db.categorias.filter(function(c){ return c.id!=='sob'; }).map(function(c){ return [c.id,c.nome]; }), o.alvo)+'</select>';
    var ncms=[]; LFI.db.produtos.forEach(function(p){ if(p.ncm&&ncms.indexOf(p.ncm)<0) ncms.push(p.ncm); }); ncms.sort();
    return '<input class="inp mono" id="rg-alvo" list="rg-ncms" placeholder="0000.00.00" value="'+esc(o.alvo)+'"><datalist id="rg-ncms">'+ncms.map(function(n){ var ps=LFI.db.produtos.filter(function(p){ return p.ncm===n; }); return '<option value="'+n+'">'+esc(ps.map(function(p){ return p.nome; }).join(', '))+'</option>'; }).join('')+'</datalist>';
  }
  function num(v){ return v==null?'':UI.numBR(v,2); }
  var corpo=UI.nota('Os percentuais devem ser informados ou confirmados pela contabilidade. Campos de alíquota em branco mantêm a regra fora da estimativa.','wt','alerta')+
    '<div class="fgrid c3"><div class="field"><label>Escopo</label><select class="inp" id="rg-esc">'+selOpts(['Produto','NCM','Categoria'], o.escopo)+'</select><div class="hint">Produto › NCM › Categoria</div></div>'+
    '<div class="field"><label>Alvo</label><div id="rg-alvo-w">'+campoAlvo(o.escopo)+'</div></div>'+
    '<div class="field"><label>Nome da regra</label><input class="inp" id="rg-nome" value="'+esc(o.nome)+'" placeholder="Ex.: Refrigerantes com ST"></div>'+
    '<div class="field"><label>Regime tributário</label><select class="inp" id="rg-reg">'+selOpts(REGIMES, o.regime)+'</select></div>'+
    '<div class="field"><label>UF de origem</label><select class="inp" id="rg-uo">'+selOpts(UFS, o.ufOrig)+'</select></div>'+
    '<div class="field"><label>UF de destino</label><select class="inp" id="rg-ud">'+selOpts(UFS, o.ufDest)+'</select></div>'+
    '<div class="field full"><label>Tipo de operação</label><select class="inp" id="rg-op">'+selOpts(OPERACOES.indexOf(o.operacao)<0?OPERACOES.concat([o.operacao]):OPERACOES, o.operacao)+'</select></div></div>'+
    '<div class="fgrid c4"><div class="field"><label>ICMS (%)</label><input class="inp num" id="rg-icms" value="'+num(o.icms)+'"></div><div class="field"><label>PIS (%)</label><input class="inp num" id="rg-pis" value="'+num(o.pis)+'"></div><div class="field"><label>COFINS (%)</label><input class="inp num" id="rg-cofins" value="'+num(o.cofins)+'"></div><div class="field"><label>IPI (%)</label><input class="inp num" id="rg-ipi" value="'+num(o.ipi)+'"></div></div>'+
    '<div class="fgrid c3" style="align-items:end"><div class="field"><label class="chk"><input type="checkbox" id="rg-st"'+(o.st?' checked':'')+'> Substituição tributária (ST)</label></div><div class="field"><label>MVA / pauta</label><input class="inp" id="rg-mva" value="'+esc(o.mva||'')+'" placeholder="Ex.: MVA 70% ou pauta CAT"></div><div class="field"><label class="chk"><input type="checkbox" id="rg-cred"'+(o.creditavel?' checked':'')+'> Gera crédito tributário</label></div></div>'+
    '<div class="fgrid"><div class="field"><label>Status</label><select class="inp" id="rg-st2">'+selOpts([['pendente','Pendente de validação'],['em_revisao','Em revisão'],['validada','Validada']], o.status)+'</select></div><div class="field"><label>Validado por</label><input class="inp" id="rg-por" value="'+esc(o.validadoPor||'')+'" placeholder="Contador responsável"></div>'+
    '<div class="field full"><label>Observação</label><textarea class="inp" id="rg-obs" style="min-height:70px">'+esc(o.obs||'')+'</textarea></div></div>';
  var m=UI.modal({titulo:r?'Editar regra tributária':'Nova regra tributária', sub:r?esc(r.nome):'Estrutura configurável por produto, NCM ou categoria', tam:'lg', corpo:corpo,
    botoes:'<button class="btn sec" data-act="_fechar">Cancelar</button><button class="btn pri" data-act="ok">Salvar regra</button>', acoes:{ok:salvar}});
  m.el.querySelector('#rg-esc').addEventListener('change', function(ev){ o.escopo=ev.target.value; o.alvo=''; m.el.querySelector('#rg-alvo-w').innerHTML=campoAlvo(o.escopo); });
  function salvar(){
    var v=function(x){ return m.el.querySelector(x).value.trim(); }, pn=function(x){ var t=v(x); return t===''?null:UI.num(t); };
    var n={escopo:v('#rg-esc'), alvo:v('#rg-alvo'), nome:v('#rg-nome'), regime:v('#rg-reg'), ufOrig:v('#rg-uo'), ufDest:v('#rg-ud'), operacao:v('#rg-op'), icms:pn('#rg-icms'), pis:pn('#rg-pis'), cofins:pn('#rg-cofins'), ipi:pn('#rg-ipi'),
      st:m.el.querySelector('#rg-st').checked, mva:v('#rg-mva'), creditavel:m.el.querySelector('#rg-cred').checked, status:v('#rg-st2'), validadoPor:v('#rg-por'), obs:v('#rg-obs')};
    if(!n.alvo){ UI.toast('Informe o alvo da regra', n.escopo==='NCM'?'Digite o NCM no formato 0000.00.00':'Selecione '+(n.escopo==='Produto'?'o produto':'a categoria'), 'wt'); return; }
    if(n.escopo==='NCM'&&!/^\d{4}\.\d{2}\.\d{2}$/.test(n.alvo)){ UI.toast('NCM inválido','Use o formato 0000.00.00','wt'); return; }
    if(!n.nome) n.nome=nomeAlvo(n);
    var dup=LFI.db.regrasTrib.filter(function(x){ return x.escopo===n.escopo&&x.alvo===n.alvo&&(!r||x.id!==r.id); })[0];
    if(dup){ UI.toast('Já existe regra para este alvo', '"'+dup.nome+'" — edite a regra existente', 'wt'); return; }
    if([n.icms,n.pis,n.cofins,n.ipi].some(function(x){ return x!=null&&(x<0||x>100); })){ UI.toast('Alíquotas devem estar entre 0 e 100%','','wt'); return; }
    if(n.status==='validada'&&([n.icms,n.pis,n.cofins,n.ipi].some(function(x){ return x==null; })||!n.validadoPor)){ UI.toast('Para validar, preencha todas as alíquotas e quem validou','','wt'); return; }
    var aviso='';
    if(r&&r.status==='validada'&&n.status==='validada'&&['icms','pis','cofins','ipi','st','creditavel','escopo','alvo'].some(function(k){ return r[k]!==n[k]; })){ n.status='em_revisao'; aviso='Alteração em regra validada: status voltou para Em revisão'; }
    if(n.status==='validada'&&(!r||r.status!=='validada')) n.validadoEm=LFI.hoje();
    if(r){ Object.assign(r,n); } else { n.id=LFI.novoId('t'); LFI.db.regrasTrib.push(n); }
    var alvoR=r||n, af=produtosDaRegra(alvoR).length;
    LFI.atividade('trib',(r?'Regra tributária editada: ':'Nova regra tributária: ')+n.nome,{tela:'tributos'});
    LFI.salvar(); m.fechar(); UI.toast(r?'Regra atualizada':'Regra cadastrada', aviso||(af+' produto(s) passam a usar esta regra'), aviso?'wt':''); LFI.recarregar();
  }
}

LFI.registrar('tributos',{titulo:'Gestão Tributária', render:render});
})();
