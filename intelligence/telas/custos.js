/* LiveFood Intelligence — CUSTOS E PRECIFICAÇÃO
   Central de custos (aquisição, médio, receitas, produção, impostos, perdas, margem), markup configurável
   por operação/categoria, precificação de todas as receitas, simulador de margem, cenários de variação de
   insumo e painel de custos de insumos. Tudo lido de LFI.db pelas regras do núcleo. */
(function(){
'use strict';
var LFI=window.LFI, UI=LFI.ui, F=LFI.fmt, esc=UI.esc, r2=LFI.dataUtil.r2;
var CORES_OP={pad:'#E08A1E', res:'#1D4ED8', sus:'#C2185B'};

function css(){
  if(document.getElementById('css-custos')) return;
  var s=document.createElement('style'); s.id='css-custos';
  s.textContent=
  '.tela-custos .grid>.card+.card{margin-top:0}.tela-custos .btn.xs svg{width:13px;height:13px}'+
  '.cs-wf{display:flex;flex-direction:column;gap:4px}'+
  '.cs-wf .rw{display:grid;grid-template-columns:minmax(120px,170px) minmax(0,1fr) 118px;gap:12px;align-items:center;padding:6px 0;cursor:default}'+
  '.cs-wf .rw .k{font-size:12.5px;font-weight:800;color:var(--texto2);line-height:1.25}.cs-wf .rw .k small{display:block;font-size:11px;color:var(--muted);font-weight:600}'+
  '.cs-wf .trk{position:relative;height:28px;background:var(--s3);border-radius:8px}'+
  '.cs-wf .trk i{position:absolute;top:3px;bottom:3px;border-radius:6px;min-width:2px;transition:left .4s,width .4s}'+
  '.cs-wf .trk i.neg{background:repeating-linear-gradient(135deg,var(--red) 0 6px,#E25555 6px 12px)}'+
  '.cs-wf .rw .v{text-align:right;font-weight:800;font-variant-numeric:tabular-nums;font-size:13.5px}.cs-wf .rw .v small{display:block;font-size:11px;color:var(--muted);font-weight:700}'+
  '.cs-wf .rw.tot{border-top:1px dashed var(--border2);margin-top:2px;padding-top:9px}'+
  '.cs-sl{margin-bottom:16px}.cs-sl .hd{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:6px}'+
  '.cs-sl .hd label{font-size:12px;font-weight:800;color:var(--texto2)}.cs-sl .hd b{font-size:14px;font-weight:800;font-variant-numeric:tabular-nums}'+
  '.cs-sl input[type=range]{width:100%;accent-color:var(--roxo);margin:0}'+
  '.cs-sl .lim{display:flex;justify-content:space-between;font-size:10.5px;color:var(--muted);font-weight:700;margin-top:2px}'+
  '.cs-dec{display:flex;height:34px;border-radius:9px;overflow:hidden;margin:6px 0 8px;background:var(--s3)}'+
  '.cs-dec span{display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;transition:width .3s;min-width:0}'+
  '.cs-res{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}'+
  '.cs-res .c{background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:10px 12px;min-width:0}'+
  '.cs-res .c>span{display:block;font-size:10.5px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.4px}'+
  '.cs-res .c b{display:block;font-size:18px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
  '.cs-res .c small{font-size:11px;color:var(--muted);font-weight:700}'+
  '.cs-res .c.hl{background:#1C1C1E;border-color:#1C1C1E;color:#fff}.cs-res .c.hl>span,.cs-res .c.hl small{color:#B9B9C0}'+
  '.cs-mk{width:86px;display:inline-block}'+
  '.cs-op-hd{display:flex;align-items:center;gap:10px;margin-bottom:12px}.cs-op-hd .sw{width:10px;height:28px;border-radius:4px}'+
  '.cs-op-hd b{font-size:15px;font-weight:800;display:block}.cs-op-hd small{font-size:11.5px;color:var(--muted);font-weight:700}'+
  '.cs-pad{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin-bottom:10px}'+
  '.cs-pad label{font-size:12.5px;font-weight:800}.cs-pad small{display:block;font-size:11px;color:var(--muted);font-weight:600}'+
  '.cs-chg{color:var(--roxo-esc);font-weight:800}'+
  '@media (max-width:1100px){.cs-res{grid-template-columns:repeat(2,minmax(0,1fr))}}'+
  '@media (max-width:700px){.cs-wf .rw{grid-template-columns:minmax(0,1fr) 100px}.cs-wf .trk{grid-column:1/-1;grid-row:2}.cs-res{grid-template-columns:minmax(0,1fr)}}';
  document.head.appendChild(s);
}

function st(){ return LFI.estado.custos = LFI.estado.custos || {aba:'central', per:'30d', op:'todas', fOp:'todas', fSt:'', sim:{rec:null}, cen:{prod:'p39', pct:10}, ins:{cat:'', q:''}}; }
function opsVis(){ return LFI.depIds().filter(function(d){ return d!=='cen'; }); }
function depsFiltro(){ var s=st(), v=opsVis(); return s.op==='todas'?v:v.filter(function(d){ return d===s.op; }); }
function receitasVis(){ return LFI.db.receitas.filter(function(r){ return LFI.depVisivel(r.dep); }); }
function somaArr(a){ var t=0; a.forEach(function(x){ t+=x; }); return t; }

/* ---------- métricas por receita ---------- */
function metr(r){
  var c=LFI.custoReceita(r), buffetBase=!!(r.buffet&&!r.preco);
  var pr = buffetBase ? LFI.precificar(r,{preco:LFI.db.buffetPrecoKg}) : LFI.precificar(r);
  var meta=1/pr.markup, status;
  if(buffetBase) status='buffet';
  else if(pr.preco < pr.sugerido*0.98) status='abaixo';
  else if(pr.preco > pr.sugerido*1.15) status='acima';
  else status='meta';
  return {r:r, c:c, pr:pr, buffet:buffetBase, meta:meta, preco:buffetBase?null:r.preco, dif:buffetBase?null:r2(r.preco-pr.sugerido), status:status};
}
function selo(status){ return status==='abaixo'?UI.badge('Abaixo da meta','no'):status==='acima'?UI.badge('Acima do sugerido','in'):status==='buffet'?UI.badge('Componente do buffet','nu'):UI.badge('Dentro da meta','ok'); }
/* volume vendido em 30 dias por receita (mix de vendas) + kg consumidos no buffet */
function volumes(){
  var p=LFI.periodo('30d'), out={};
  LFI.produtosVendidos(p, opsVis()).forEach(function(x){ if(x.rec){ out[x.rec]=out[x.rec]||{qtd:0, receita:0, kg:0}; out[x.rec].qtd+=x.qtd; out[x.rec].receita+=x.receita; } });
  LFI.db.buffets.forEach(function(b){ if(b.status!=='encerrado'||b.data<p.de||b.data>p.ate||!LFI.depVisivel(b.dep)) return;
    LFI.resumoBuffet(b).itens.forEach(function(i){ if(i.cons==null) return; out[i.it.rec]=out[i.it.rec]||{qtd:0, receita:0, kg:0}; out[i.it.rec].kg+=i.cons; }); });
  return out;
}

/* ---------- consolidação de custos do período ---------- */
function consolidado(p, deps){
  var o={fat:0, cmv:0, imp:0, perdasEst:0, perdasTec:0, perdasBuf:0, porOp:{}};
  deps.forEach(function(d){
    var f=LFI.faturamento(p,[d]), cmv=f*LFI.cmvPct(d), imp=f*LFI.empresaDoDep(d).impVenda/100, pp=LFI.perdasProducao(p,[d]), pb=0;
    LFI.db.buffets.forEach(function(b){ if(b.dep!==d||b.status!=='encerrado'||b.data<p.de||b.data>p.ate) return; var rb=LFI.resumoBuffet(b); pb+=rb.vDesc+rb.vPerda; });
    o.fat+=f; o.cmv+=cmv; o.imp+=imp; o.perdasEst+=pp.estoque; o.perdasTec+=pp.tecnica; o.perdasBuf+=pb;
    o.porOp[d]={fat:f, cmv:cmv, imp:imp, perdas:pp.total+pb, mc:f-cmv-imp};
  });
  o.perdas=o.perdasEst+o.perdasTec+o.perdasBuf; o.mc=o.fat-o.cmv-o.imp; o.res=o.mc-o.perdas;
  /* custo de produção: ingredientes das OPs concluídas no período */
  var prod=0, nOp=0; LFI.db.producao.forEach(function(op){ if(op.status!=='concluida'||op.data<p.de||op.data>p.ate||deps.indexOf(op.dep)<0) return; var r=LFI.rec(op.rec); prod+=LFI.custoReceita(r).total*(op.qtd/r.rend); nOp++; });
  o.producao=r2(prod); o.nOp=nOp;
  o.compras=LFI.comprasPeriodo(p);
  return o;
}

/* ================= RENDER ================= */
function render(el){
  css();
  var s=st(), emp=LFI.empresaAtual();
  var abas=[['central','Central de custos'],['preco','Markup e precificação'],['sim','Simulador de margem'],['cen','Cenários de insumo'],['ins','Custos de insumos']];
  var abaixo=receitasVis().map(metr).filter(function(m){ return m.status==='abaixo'; }).length;
  var h=UI.cabecalho({titulo:'Custos e Precificação', sub:(emp?esc(emp.fantasia)+' · CNPJ '+emp.cnpj:esc(LFI.db.grupo.nome)+' · consolidado')+' · custos atualizados pelas notas fiscais lançadas e pelas fichas técnicas',
    acoes:'<button class="btn sec sm" data-act="_ir" data-id="receitas">'+UI.ic('receita')+'Fichas técnicas</button><button class="btn sec sm" data-act="_ir" data-id="relatorios/custos_rec">'+UI.ic('relatorio')+'Relatório de custos</button><button class="btn pri sm" data-act="aba" data-id="sim">'+UI.ic('raio')+'Simular margem</button>'});
  h+='<div class="tabs">'+abas.map(function(a){ return '<button class="'+(s.aba===a[0]?'on':'')+'" data-act="aba" data-id="'+a[0]+'">'+a[1]+(a[0]==='preco'&&abaixo?' <span class="n">'+abaixo+'</span>':'')+'</button>'; }).join('')+'</div>';
  h+='<div id="cs-corpo"></div>';
  el.innerHTML=h;
  var corpo=el.querySelector('#cs-corpo');
  var handlers={ aba:function(id){ s.aba=id; LFI.recarregar(); } };
  ({central:abaCentral, preco:abaPreco, sim:abaSim, cen:abaCenario, ins:abaInsumos}[s.aba]||abaCentral)(corpo, handlers);
  UI.liga(el, UI.navHandlers(handlers));
}

/* ---------- aba: central de custos ---------- */
function abaCentral(el, H){
  var s=st(), p=LFI.periodo(s.per), deps=depsFiltro(), o=consolidado(p,deps), pa=LFI.periodoAnterior(p), oa=consolidado(pa,deps);
  var vEst=LFI.valorEstoqueTotal(s.op==='todas'?LFI.depIds():deps.concat(LFI.depVisivel('cen')?['cen']:[]));
  var per=[['7d','7 dias'],['30d','30 dias'],['mes','Mês atual']];
  var h='<div class="barra"><div class="seg">'+per.map(function(x){ return '<button class="'+(s.per===x[0]?'on':'')+'" data-act="per" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div><span class="tag">'+F.dataC(p.de)+' a '+F.dataC(p.ate)+'</span><span class="sp"></span>'+
    '<div class="pills">'+['todas'].concat(opsVis()).map(function(d){ var dd=LFI.dep(d); return '<button class="pill'+(s.op===d?' on':'')+'" data-act="op" data-id="'+d+'">'+(dd?'<i style="background:'+dd.cor+'"></i>'+esc(dd.curto):'Todas as operações')+'</button>'; }).join('')+'</div></div>';
  h+='<div class="kpis k5">'+
    UI.kpi({lb:'Faturamento', vl:F.moeda(o.fat), dl:UI.variacao(o.fat,oa.fat)+' vs. anterior', hl:true})+
    UI.kpi({lb:'CMV (fichas técnicas)', vl:F.moeda(o.cmv), dl:'<b style="color:var(--text)">'+F.pct(o.fat?o.cmv/o.fat:0)+'</b> do faturamento', act:'aba', id:'preco'})+
    UI.kpi({lb:'Impostos sobre a venda', vl:F.moeda(o.imp), dl:F.pct(o.fat?o.imp/o.fat:0)+' · alíquota efetiva por CNPJ', act:'_ir', id:'tributos'})+
    UI.kpi({lb:'Perdas', vl:F.moeda(o.perdas), dl:'Técnica '+F.moedaK(o.perdasTec)+' · estoque '+F.moedaK(o.perdasEst)+' · buffet '+F.moedaK(o.perdasBuf), act:'_ir', id:'relatorios/perdas'})+
    UI.kpi({lb:'Margem de contribuição', vl:F.moeda(o.mc), dl:'<b style="color:var(--text)">'+F.pct(o.fat?o.mc/o.fat:0)+'</b> · após perdas '+F.moedaK(o.res)})+
  '</div>';
  h+='<div class="grid g21 mb"><div class="card"><h3><span class="lft">'+UI.ic('custos')+' Composição do resultado <small>do faturamento à margem após perdas</small></span></h3><div id="cs-wf"></div></div>'+
     '<div class="card"><h3>Custos consolidados <small>'+esc(p.nome.toLowerCase())+'</small></h3><div id="cs-cons"></div></div></div>';
  h+='<div class="grid g2 mb"><div class="card"><h3><span class="lft">Resultado por operação <small>clique para ver as receitas</small></span></h3><div id="cs-op"></div></div>'+
     '<div class="card"><h3><span class="lft">Receitas fora da meta</span><button class="vertodos" data-act="aba" data-id="preco">Ver precificação</button></h3><div id="cs-fora"></div></div></div>';
  h+='<div class="grid g2"><div class="card"><h3><span class="lft">Maiores altas de custo <small>insumos · últimos 6 meses</small></span><button class="vertodos" data-act="aba" data-id="ins">Ver insumos</button></h3><div id="cs-alta"></div></div>'+
     '<div class="card"><h3>Peso dos insumos no CMV <small>custo × volume vendido em 30 dias</small></h3><div id="cs-peso"></div></div></div>';
  el.innerHTML=h;

  /* cascata */
  var max=o.fat||1, passos=[
    {k:'Faturamento', s:'vendas do período', v:o.fat, ini:0, cor:'var(--text)'},
    {k:'(−) CMV', s:F.pct(o.fat?o.cmv/o.fat:0)+' · fichas técnicas', v:-o.cmv, ini:o.fat-o.cmv, cor:'#FF5A00'},
    {k:'(−) Impostos s/ venda', s:F.pct(o.fat?o.imp/o.fat:0), v:-o.imp, ini:o.fat-o.cmv-o.imp, cor:'#B08A00'},
    {k:'= Margem de contribuição', s:F.pct(o.fat?o.mc/o.fat:0), v:o.mc, ini:0, cor:'#16A34A', tot:true},
    {k:'(−) Perdas', s:'produção, estoque e buffet', v:-o.perdas, ini:o.mc-o.perdas, cor:'#DC2626'},
    {k:'= Margem após perdas', s:F.pct(o.fat?o.res/o.fat:0), v:o.res, ini:0, cor:'#0F7A36', tot:true}
  ];
  el.querySelector('#cs-wf').innerHTML='<div class="cs-wf">'+passos.map(function(x){ var w=Math.abs(x.v)/max*100, l=Math.max(0,x.ini)/max*100;
    return '<div class="rw'+(x.tot?' tot':'')+'"><div class="k">'+esc(x.k)+'<small>'+esc(x.s)+'</small></div><div class="trk"><i style="left:'+l.toFixed(2)+'%;width:'+w.toFixed(2)+'%;background:'+x.cor+'"></i></div><div class="v">'+(x.v<0?'− ':'')+F.moeda(Math.abs(x.v))+'</div></div>'; }).join('')+'</div>'+
    UI.nota('CMV estimado pelo <b>mix de vendas</b> e pelas <b>fichas técnicas com custo médio atualizado</b>. Lançar uma nota fiscal atualiza o custo médio e refaz esta composição automaticamente.','in');

  /* custos consolidados */
  var altas=LFI.db.produtos.filter(function(x){ return x.tipo==='insumo'&&x.ultimoCusto>x.custoMedio*1.005; }).length;
  var recs=receitasVis().map(metr).filter(function(m){ return !m.buffet; }), cmvMed=recs.length?somaArr(recs.map(function(m){ return m.pr.cmvPct; }))/recs.length:0;
  var linhas=[
    ['Custo de aquisição', 'Compras lançadas · '+o.compras.notas+' notas · último custo', F.moeda(o.compras.total), '_ir', 'notas'],
    ['Custo médio em estoque', 'Valor ao custo médio ponderado'+(altas?' · '+altas+' insumo(s) com último custo acima do médio':''), F.moeda(vEst), 'aba', 'ins'],
    ['Custo das receitas', recs.length+' fichas · CMV médio de '+F.pct(cmvMed), F.pct(cmvMed), 'aba', 'preco'],
    ['Custo de produção', o.nOp+' ordem(ns) concluída(s) · ingredientes + perda técnica', F.moeda(o.producao), '_ir', 'producao'],
    ['Impostos sobre a venda', 'Conforme regime de cada CNPJ', F.moeda(o.imp), '_ir', 'tributos'],
    ['Perdas', 'Técnica, avarias de estoque e descarte do buffet', F.moeda(o.perdas), '_ir', 'relatorios/perdas'],
    ['Margem de contribuição', 'Faturamento − CMV − impostos', F.moeda(o.mc), 'aba', 'sim']
  ];
  el.querySelector('#cs-cons').innerHTML='<div class="lst">'+linhas.map(function(l){ return '<div class="li cl" data-act="'+l[3]+'" data-id="'+l[4]+'"><div class="gr"><div class="tt">'+esc(l[0])+'</div><div class="dd" style="white-space:normal">'+esc(l[1])+'</div></div><div class="rt">'+l[2]+'</div></div>'; }).join('')+'</div>';

  /* resultado por operação (empilhado) */
  var gOp=el.querySelector('#cs-op');
  if(deps.length){
    UI.grafBarras(gOp,{cats:deps.map(function(d){ return LFI.dep(d).nome; }), empilhado:true, altura:240, legenda:true,
      series:[{nome:'CMV', cor:'#FF5A00', valores:deps.map(function(d){ return o.porOp[d].cmv; })},
              {nome:'Impostos', cor:'#B08A00', valores:deps.map(function(d){ return o.porOp[d].imp; })},
              {nome:'Perdas', cor:'#DC2626', valores:deps.map(function(d){ return o.porOp[d].perdas; })},
              {nome:'Margem após perdas', cor:'#16A34A', valores:deps.map(function(d){ return Math.max(0,o.porOp[d].mc-o.porOp[d].perdas); })}],
      onClick:function(i){ detalheOp(deps[i], p); }});
  } else gOp.innerHTML=UI.vazio('Nenhuma operação visível nesta empresa');

  /* fora da meta */
  var fora=receitasVis().map(metr).filter(function(m){ return m.status==='abaixo'; }).sort(function(a,b){ return a.dif-b.dif; });
  el.querySelector('#cs-fora').innerHTML = fora.length ? '<div class="lst">'+fora.slice(0,6).map(function(m){ return '<div class="li"><span class="av" style="background:'+m.r.cor+';font-size:18px">'+m.r.foto+'</span><div class="gr"><div class="tt">'+esc(m.r.nome)+'</div><div class="dd">'+UI.dep(m.r.dep)+' · CMV '+F.pct(m.pr.cmvPct)+' (meta '+F.pct(m.meta)+')</div></div><div class="rt">'+F.moeda(m.preco)+'<small>sugerido '+F.moeda(m.pr.sugerido)+'</small></div><button class="btn sec xs" data-act="aplicar" data-id="'+m.r.id+'">Aplicar</button></div>'; }).join('')+'</div>'
    : UI.vazio('Todas as receitas estão dentro da meta de CMV','✅');

  /* maiores altas */
  var al=LFI.db.produtos.filter(function(x){ return x.tipo==='insumo'&&x.hist.length>1; }).map(function(x){ var v=x.custoMedio/x.hist[0].v-1; return {nome:x.nome, valor:v*100, id:x.id, sub:LFI.receitasComProduto(x.id).length+' receita(s)', cor:v>0.1?'#DC2626':'#FF5A00'}; }).filter(function(x){ return x.valor>0.5; }).sort(function(a,b){ return b.valor-a.valor; }).slice(0,7);
  el.querySelector('#cs-alta').innerHTML=UI.barrasH(al,{fmt:function(v){ return '+'+F.pctN(v,1); }, act:'insDet'});

  /* peso dos insumos no CMV do mês */
  var vol=volumes(), peso={};
  receitasVis().forEach(function(r){ var v=vol[r.id]; if(!v) return; var c=LFI.custoReceita(r); var mult = (r.buffet&&!r.preco) ? v.kg/(r.pesoFinal/1000)/(r.rend||1) : v.qtd/(r.rend||1);
    c.itens.forEach(function(i){ peso[i.prod.id]=(peso[i.prod.id]||0)+i.custo*(1+(r.perda||0)/100)*mult; }); });
  var pl=Object.keys(peso).map(function(k){ return {nome:LFI.prod(k).nome, valor:peso[k], id:k, cor:'var(--roxo)'}; }).sort(function(a,b){ return b.valor-a.valor; }).slice(0,7);
  el.querySelector('#cs-peso').innerHTML=pl.length?UI.barrasH(pl,{act:'insDet'})+'<div class="nota" style="margin:12px 0 0;font-size:11.5px">'+UI.ic('info')+'<div>Os insumos do topo são os que mais movem a margem: use <b>Cenários de insumo</b> para simular reajustes.</div></div>':UI.vazio('Sem vendas com ficha técnica no período');

  H.per=function(id){ s.per=id; LFI.recarregar(); };
  H.op=function(id){ s.op=id; LFI.recarregar(); };
  H.aplicar=aplicarPreco;
  H.insDet=detalheInsumo;
}

function detalheOp(dep, p){
  var d=LFI.dep(dep), e=LFI.empresaDoDep(dep), ms=LFI.db.receitas.filter(function(r){ return r.dep===dep; }).map(metr);
  var m=UI.modal({titulo:esc(d.nome)+' · custos e margens', sub:esc(e.fantasia)+' · '+esc(e.regime)+' · impostos s/ venda '+F.pctN(e.impVenda), tam:'lg', corpo:'<div id="do-t"></div>',
    botoes:'<button class="btn sec" data-act="_fechar">Fechar</button><button class="btn pri" data-act="pr">Abrir precificação</button>', acoes:{pr:function(){ m.fechar(); st().aba='preco'; st().fOp=dep; LFI.recarregar(); }}});
  UI.tabela(m.corpo.querySelector('#do-t'),{linhas:ms, linhaId:function(x){ return x.r.id; }, ordem:3, colunas:[
    {t:'Receita', v:function(x){ return '<b>'+esc(x.r.nome)+'</b><small>'+esc(x.r.cat)+'</small>'; }, ord:function(x){ return x.r.nome; }},
    {t:'Custo', r:true, v:function(x){ return F.moeda(x.pr.custo)+'<small>'+(x.buffet?'por kg':'por porção')+'</small>'; }, ord:function(x){ return x.pr.custo; }},
    {t:'Preço', r:true, v:function(x){ return x.buffet?'<span class="tag">Buffet</span>':F.moeda(x.preco); }, ord:function(x){ return x.preco||0; }},
    {t:'CMV', r:true, v:function(x){ return F.pct(x.pr.cmvPct); }, ord:function(x){ return x.pr.cmvPct; }},
    {t:'Margem', r:true, v:function(x){ return F.moeda(x.pr.mc)+'<small>'+F.pct(x.pr.mcPct)+'</small>'; }, ord:function(x){ return x.pr.mc; }},
    {t:'Situação', v:function(x){ return selo(x.status); }, ord:function(x){ return x.status; }}
  ]});
}

/* aplica o preço sugerido (atualiza r.preco e o preço do mix de vendas) */
function aplicarPreco(id){
  var r=LFI.rec(id), pr=LFI.precificar(r);
  UI.confirmar('Aplicar preço sugerido', 'O preço de venda de <b>'+esc(r.nome)+'</b> passa de <b>'+F.moeda(r.preco)+'</b> para <b>'+F.moeda(pr.sugerido)+'</b> (custo '+F.moeda(pr.custo)+' × markup '+F.num(pr.markup,2)+').<br><br>A ficha técnica, os indicadores de margem e o mix de vendas passam a usar o novo preço.', 'Aplicar preço', function(){
    var antes=r.preco; r.preco=pr.sugerido;
    LFI.db.mixVendas.forEach(function(x){ if(x.rec===r.id) x.preco=pr.sugerido; });
    LFI.atividade('receita','Preço de '+r.nome+' atualizado: '+F.moeda(antes)+' → '+F.moeda(pr.sugerido),{tela:'receitas',id:r.id});
    LFI.salvar(); UI.toast('Preço atualizado', r.nome+' · '+F.moeda(pr.sugerido)); LFI.recarregar();
  });
}

/* ---------- aba: markup e precificação ---------- */
function abaPreco(el, H){
  var s=st(), ops=opsVis();
  if(s.fOp!=='todas'&&ops.indexOf(s.fOp)<0) s.fOp='todas';
  var h='<div class="card mb"><h3><span class="lft">'+UI.ic('editar')+' Markup por operação e categoria <small>categoria sem valor usa o markup padrão da operação</small></span><span style="display:flex;gap:8px"><button class="btn sec sm" data-act="mkDesf">Descartar</button><button class="btn pri sm" data-act="mkSalvar">'+UI.ic('check')+'Salvar markup</button></span></h3>'+
    '<div class="grid '+(ops.length>=3?'g3':ops.length===2?'g2':'')+'">'+ops.map(function(d){ return cardMarkup(d); }).join('')+'</div>'+
    UI.nota('Ao salvar, os <b>preços sugeridos</b> são recalculados em todas as telas (fichas técnicas, simulador, relatórios). O preço de venda atual só muda quando você aplica o sugerido.','in')+'</div>';

  h+='<div class="card"><h3><span class="lft">Precificação das receitas <small>clique no cabeçalho para ordenar</small></span><span style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'+
    '<div class="pills">'+['todas'].concat(ops).map(function(d){ var dd=LFI.dep(d); return '<button class="pill'+(s.fOp===d?' on':'')+'" data-act="fOp" data-id="'+d+'">'+(dd?'<i style="background:'+dd.cor+'"></i>'+esc(dd.curto):'Todas')+'</button>'; }).join('')+'</div>'+
    '<select class="inp sm" style="width:auto" data-chg="fSt"><option value="">Todas as situações</option><option value="abaixo"'+(s.fSt==='abaixo'?' selected':'')+'>Abaixo da meta</option><option value="meta"'+(s.fSt==='meta'?' selected':'')+'>Dentro da meta</option><option value="acima"'+(s.fSt==='acima'?' selected':'')+'>Acima do sugerido</option><option value="buffet"'+(s.fSt==='buffet'?' selected':'')+'>Componentes do buffet</option></select>'+
    '<button class="btn sec sm" data-act="aplTodos">Aplicar sugerido aos abaixo da meta</button><button class="btn sec sm" data-act="xls">'+UI.ic('baixar')+'Excel</button></span></h3><div id="cs-rec"></div></div>';
  el.innerHTML=h;

  var linhas=receitasVis().filter(function(r){ return s.fOp==='todas'||r.dep===s.fOp; }).map(metr).filter(function(m){ return !s.fSt||m.status===s.fSt; });
  UI.tabela(el.querySelector('#cs-rec'),{linhas:linhas, linhaId:function(m){ return m.r.id; }, cls:'cp', vazio:'Nenhuma receita com estes filtros', colunas:[
    {t:'Receita', w:'210px', v:function(m){ return '<b>'+m.r.foto+' '+esc(m.r.nome)+'</b><small>'+UI.dep(m.r.dep)+' · '+esc(m.r.cat)+'</small>'; }, ord:function(m){ return m.r.nome; }},
    {t:'Custo', r:true, v:function(m){ return F.moeda(m.c.porcao)+'<small>'+(m.c.porKg!=null?F.moeda(m.c.porKg)+'/kg':esc(m.r.rendUn))+'</small>'; }, ord:function(m){ return m.c.porcao; }},
    {t:'Sugerido', r:true, v:function(m){ return '<b>'+F.moeda(m.pr.sugerido)+'</b><small>'+(m.buffet?'por kg · ':'')+'markup '+F.num(m.pr.markup,2)+'×</small>'; }, ord:function(m){ return m.pr.sugerido; }},
    {t:'Preço atual', r:true, v:function(m){ return m.buffet?'<span class="tag">Buffet</span><small>'+F.moeda(LFI.db.buffetPrecoKg)+'/kg</small>':F.moeda(m.preco); }, ord:function(m){ return m.preco||0; }},
    {t:'Diferença', r:true, v:function(m){ if(m.dif==null) return '—'; var c=m.dif<-0.004?'var(--red)':m.dif>0.004?'var(--green)':'var(--muted)'; return '<b style="color:'+c+'">'+(m.dif>0?'+':'')+F.moeda(m.dif)+'</b><small>'+(m.pr.sugerido?(m.dif>0?'+':'')+F.pct(m.dif/m.pr.sugerido):'')+'</small>'; }, ord:function(m){ return m.dif==null?-1e9:m.dif; }},
    {t:'Margem', r:true, v:function(m){ return F.moeda(m.pr.mc)+'<small>'+F.pct(m.pr.mcPct)+'</small>'; }, ord:function(m){ return m.pr.mcPct; }},
    {t:'CMV', r:true, v:function(m){ return '<b>'+F.pct(m.pr.cmvPct)+'</b><small>meta '+F.pct(m.meta)+'</small>'; }, ord:function(m){ return m.pr.cmvPct; }},
    {t:'Situação', v:function(m){ return selo(m.status); }, ord:function(m){ return m.status; }},
    {t:'Ações', r:true, ord:false, v:function(m){ if(m.buffet) return '<small style="margin:0">no buffet</small>'; return '<span style="display:inline-flex;gap:4px">'+(Math.abs(m.dif)>=0.005?'<button class="btn sec xs" data-act="aplicar" data-id="'+m.r.id+'" title="Aplicar o preço sugerido">Aplicar</button>':'')+'<button class="btn gh xs" data-act="simR" data-id="'+m.r.id+'" title="Abrir no simulador">'+UI.ic('raio')+'</button></span>'; }}
  ]});

  H.fOp=function(id){ s.fOp=id; LFI.recarregar(); };
  H.fSt=function(_,ev){ s.fSt=ev.target.value; LFI.recarregar(); };
  H.aplicar=aplicarPreco;
  H.simR=function(id){ s.sim={rec:id}; s.aba='sim'; LFI.recarregar(); };
  H.mk=function(id, ev){ previewMarkup(el, id); };
  H.mkDesf=function(){ LFI.recarregar(); UI.toast('Alterações descartadas','','in'); };
  H.mkSalvar=function(){ salvarMarkup(el); };
  H.aplTodos=function(){
    var alvo=receitasVis().filter(function(r){ return s.fOp==='todas'||r.dep===s.fOp; }).map(metr).filter(function(m){ return m.status==='abaixo'; });
    if(!alvo.length){ UI.toast('Nenhuma receita abaixo da meta neste filtro','','in'); return; }
    UI.confirmar('Aplicar preços sugeridos', alvo.length+' receita(s) abaixo da meta terão o preço de venda atualizado para o sugerido:<br><br>'+alvo.map(function(m){ return '• '+esc(m.r.nome)+': '+F.moeda(m.preco)+' → <b>'+F.moeda(m.pr.sugerido)+'</b>'; }).join('<br>'), 'Aplicar a todas', function(){
      alvo.forEach(function(m){ m.r.preco=m.pr.sugerido; LFI.db.mixVendas.forEach(function(x){ if(x.rec===m.r.id) x.preco=m.pr.sugerido; }); });
      LFI.atividade('receita', alvo.length+' preço(s) de venda ajustados ao sugerido',{tela:'custos'});
      LFI.salvar(); UI.toast('Preços atualizados', alvo.length+' receita(s)'); LFI.recarregar();
    });
  };
  H.xls=function(){
    UI.exportarExcel('precificacao_receitas',['Receita','Operação','Categoria','Custo por porção','Custo por kg','Markup','Preço sugerido','Preço atual','Diferença','Margem R$','Margem %','CMV %','Meta CMV %','Situação'],
      linhas.map(function(m){ return [m.r.nome, LFI.dep(m.r.dep).nome, m.r.cat, m.c.porcao, m.c.porKg, m.pr.markup, m.pr.sugerido, m.preco, m.dif, m.pr.mc, r2(m.pr.mcPct*100), r2(m.pr.cmvPct*100), r2(m.meta*100), {abaixo:'Abaixo da meta',meta:'Dentro da meta',acima:'Acima do sugerido',buffet:'Componente do buffet'}[m.status]]; }), 'Precificação');
    UI.toast('Planilha gerada', linhas.length+' receitas');
  };
}
function catsDaOp(dep){ var m=LFI.db.markup[dep]||{padrao:3,cats:{}}, cs=Object.keys(m.cats||{}); LFI.db.receitas.forEach(function(r){ if(r.dep===dep&&cs.indexOf(r.cat)<0) cs.push(r.cat); }); return cs; }
function cardMarkup(dep){
  var d=LFI.dep(dep), m=LFI.db.markup[dep]||{padrao:3,cats:{}}, e=LFI.empresaDoDep(dep);
  var h='<div class="card flat" style="margin:0"><div class="cs-op-hd"><span class="sw" style="background:'+d.cor+'"></span><div><b>'+esc(d.nome)+'</b><small>'+esc(e.fantasia)+' · impostos s/ venda '+F.pctN(e.impVenda)+'</small></div></div>'+
    '<div class="cs-pad"><div><label>Markup padrão</label><small>CMV meta <span data-meta="'+dep+'|">'+F.pct(1/m.padrao)+'</span></small></div><input class="inp sm num cs-mk" data-mk="'+dep+'|" data-inp="mk" data-id="'+dep+'|" value="'+UI.numBR(m.padrao,2)+'"></div>'+
    '<table class="tb cp"><thead><tr><th>Categoria</th><th class="r">Markup</th><th class="r">CMV meta</th></tr></thead><tbody>';
  catsDaOp(dep).forEach(function(c){ var v=m.cats&&m.cats[c], ex=LFI.db.receitas.filter(function(r){ return r.dep===dep&&r.cat===c&&!(r.buffet&&!r.preco); })[0];
    var nR=LFI.db.receitas.filter(function(r){ return r.dep===dep&&r.cat===c; }).length;
    h+='<tr><td><b>'+esc(c)+'</b><small data-ex="'+dep+'|'+esc(c)+'">'+(ex?'Ex.: '+esc(ex.nome)+' · '+F.moeda(LFI.precificar(ex).sugerido):nR+' receita(s) · vendidas por kg')+'</small></td><td class="r"><input class="inp sm num cs-mk" placeholder="'+UI.numBR(m.padrao,2)+'" data-mk="'+dep+'|'+esc(c)+'" data-inp="mk" data-id="'+dep+'|'+esc(c)+'" value="'+(v?UI.numBR(v,2):'')+'"></td><td class="r" data-meta="'+dep+'|'+esc(c)+'">'+F.pct(1/(v||m.padrao))+'</td></tr>'; });
  return h+'</tbody></table></div>';
}
function lerMarkup(el, dep){
  var pad=UI.num((el.querySelector('[data-mk="'+dep+'|"]')||{}).value), cats={};
  UI.els('[data-mk^="'+dep+'|"]', el).forEach(function(i){ var c=i.getAttribute('data-mk').split('|').slice(1).join('|'); if(!c) return; var v=UI.num(i.value); if(i.value.trim()&&v>0) cats[c]=v; });
  return {padrao:pad, cats:cats};
}
function previewMarkup(el, id){
  var dep=id.split('|')[0], m=lerMarkup(el, dep), pad=m.padrao>0?m.padrao:(LFI.db.markup[dep]||{}).padrao||3;
  UI.els('[data-meta^="'+dep+'|"]', el).forEach(function(x){ var c=x.getAttribute('data-meta').split('|').slice(1).join('|'); var mk=c?(m.cats[c]||pad):pad; x.textContent=F.pct(1/mk); });
  UI.els('[data-ex^="'+dep+'|"]', el).forEach(function(x){ var c=x.getAttribute('data-ex').split('|').slice(1).join('|'); var ex=LFI.db.receitas.filter(function(r){ return r.dep===dep&&r.cat===c&&!(r.buffet&&!r.preco); })[0]; if(!ex) return;
    var mk=m.cats[c]||pad, atual=LFI.precificar(ex).sugerido, novo=LFI.precificar(ex,{markup:mk}).sugerido;
    x.innerHTML='Ex.: '+esc(ex.nome)+' · '+(Math.abs(novo-atual)>0.004?'<span class="cs-chg">'+F.moeda(atual)+' → '+F.moeda(novo)+'</span>':F.moeda(novo)); });
  /* placeholders das categorias seguem o padrão digitado */
  UI.els('[data-mk^="'+dep+'|"]', el).forEach(function(i){ if(i.getAttribute('data-mk')!==dep+'|') i.placeholder=UI.numBR(pad,2); });
}
function salvarMarkup(el){
  var ops=opsVis(), novo={}, erro=null;
  ops.forEach(function(d){ var m=lerMarkup(el,d); if(!(m.padrao>1&&m.padrao<=10)) erro=LFI.dep(d).nome+': markup padrão deve estar entre 1,01 e 10'; Object.keys(m.cats).forEach(function(c){ if(!(m.cats[c]>1&&m.cats[c]<=10)) erro=LFI.dep(d).nome+' · '+c+': markup deve estar entre 1,01 e 10'; }); novo[d]=m; });
  if(erro){ UI.toast('Markup inválido', erro, 'wt'); return; }
  var antes={}; LFI.db.receitas.forEach(function(r){ antes[r.id]=LFI.precificar(r).sugerido; });
  ops.forEach(function(d){ LFI.db.markup[d]={padrao:novo[d].padrao, cats:novo[d].cats}; });
  var mud=LFI.db.receitas.filter(function(r){ return Math.abs(LFI.precificar(r).sugerido-antes[r.id])>0.004; }).length;
  LFI.atividade('receita','Markup atualizado · '+mud+' preço(s) sugerido(s) recalculado(s)',{tela:'custos'});
  LFI.salvar(); UI.toast('Markup salvo', mud+' preço(s) sugerido(s) recalculado(s)'); LFI.recarregar();
}

/* ---------- aba: simulador ---------- */
function recsSim(){ return receitasVis().filter(function(r){ return !(r.buffet&&!r.preco); }); }
function calcSim(sim){
  var r=LFI.rec(sim.rec), c=LFI.custoReceita(r), bruto=0;
  c.itens.forEach(function(i){ bruto+=i.custo*(i.prod.id===sim.ing?1+sim.varPct/100:1); });
  var custo=bruto*(1+(r.perda||0)/100)/(r.rend||1);
  var mk = sim.modo==='mk' ? sim.mk : (custo? sim.preco/custo : 0);
  var preco = sim.modo==='mk' ? custo*sim.mk : sim.preco;
  var impV=preco*sim.imp/100, mc=preco-custo-impV;
  return {r:r, custo:custo, custoBase:c.porcao, preco:preco, mk:mk, impV:impV, mc:mc, mcPct:preco?mc/preco:0, cmv:preco?custo/preco:0, minimo:sim.imp<100?custo/(1-sim.imp/100):0, precoMeta:custo*LFI.markupDe(r)};
}
function abaSim(el, H){
  var s=st(), lista=recsSim();
  if(!lista.length){ el.innerHTML='<div class="card">'+UI.vazio('Nenhuma receita com preço de venda nesta empresa')+'</div>'; return; }
  var sim=s.sim; if(!sim.rec||!LFI.rec(sim.rec)||lista.indexOf(LFI.rec(sim.rec))<0) sim=s.sim={rec:lista[0].id};
  var r=LFI.rec(sim.rec), c=LFI.custoReceita(r);
  if(sim.ing==null||!c.itens.some(function(i){ return i.prod.id===sim.ing; })){ var top=c.itens.slice().sort(function(a,b){ return b.custo-a.custo; })[0]; sim.ing=top.prod.id; }
  if(sim.varPct==null) sim.varPct=0; if(sim.imp==null) sim.imp=LFI.impVendaDe(r); if(sim.preco==null) sim.preco=r.preco; if(sim.mk==null) sim.mk=LFI.markupDe(r); if(!sim.modo) sim.modo='preco'; if(sim.fixo==null) sim.fixo=3000;
  var vol=(volumes()[r.id]||{qtd:0}).qtd;
  var pMin=Math.max(0.5, r2(c.porcao*1.05)), pMax=r2(Math.max(r.preco*2, c.porcao*7));
  var h='<div class="grid g12">'+
    '<div class="card"><h3>Parâmetros</h3>'+
      '<div class="field"><label>Receita</label><select class="inp" data-chg="sRec">'+opsVis().map(function(d){ var rs=lista.filter(function(x){ return x.dep===d; }); if(!rs.length) return ''; return '<optgroup label="'+esc(LFI.dep(d).nome)+'">'+rs.map(function(x){ return '<option value="'+x.id+'"'+(x.id===r.id?' selected':'')+'>'+esc(x.nome)+'</option>'; }).join('')+'</optgroup>'; }).join('')+'</select></div>'+
      sl('preco','Preço de venda', F.moeda(sim.modo==='mk'?calcSim(sim).preco:sim.preco), pMin, pMax, 0.1, sim.modo==='mk'?calcSim(sim).preco:sim.preco, F.moeda(pMin), F.moeda(pMax))+
      sl('mk','Markup sobre o custo', F.num(calcSim(sim).mk,2)+'×', 1.2, 7, 0.05, calcSim(sim).mk, '1,2×', '7×')+
      '<div class="field"><label>Ingrediente com variação de custo</label><select class="inp" data-chg="sIng">'+c.itens.map(function(i){ return '<option value="'+i.prod.id+'"'+(i.prod.id===sim.ing?' selected':'')+'>'+esc(i.prod.nome)+' · '+F.pct(i.part,0)+' do custo</option>'; }).join('')+'</select></div>'+
      sl('var','Variação do custo do ingrediente', (sim.varPct>0?'+':'')+F.num(sim.varPct,0)+'%', -30, 50, 1, sim.varPct, '−30%', '+50%')+
      sl('imp','Impostos sobre a venda', F.pctN(sim.imp,2), 0, 25, 0.25, sim.imp, '0%', '25%')+
      '<div class="field" style="margin:0"><label>Custo fixo mensal alocado ao produto (R$)</label><input class="inp num" data-inp="sFixo" value="'+UI.numBR(sim.fixo,2)+'"><div class="hint">Usado para o ponto de equilíbrio em unidades.</div></div>'+
      '<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn sec sm" data-act="sReset">Voltar aos valores atuais</button><button class="btn sec sm" data-act="sMeta">Usar preço da meta</button></div>'+
    '</div>'+
    '<div class="card"><h3><span class="lft">'+r.foto+' '+esc(r.nome)+' <small>'+esc(LFI.dep(r.dep).nome)+' · '+esc(r.cat)+'</small></span><span class="tag">'+F.num(vol,0)+' vendidos em 30 dias</span></h3><div id="sim-res"></div></div>'+
  '</div>';
  el.innerHTML=h;
  desenhaSim(el, vol);

  function upd(){ var x=calcSim(sim); var ip=el.querySelector('[data-inp="sPreco"]'), im=el.querySelector('[data-inp="sMk"]');
    if(sim.modo==='mk'){ ip.value=x.preco; } else { im.value=x.mk; }
    el.querySelector('[data-lb="preco"]').textContent=F.moeda(x.preco); el.querySelector('[data-lb="mk"]').textContent=F.num(x.mk,2)+'×';
    el.querySelector('[data-lb="var"]').textContent=(sim.varPct>0?'+':'')+F.num(sim.varPct,0)+'%'; el.querySelector('[data-lb="imp"]').textContent=F.pctN(sim.imp,2);
    desenhaSim(el, vol); }
  H.sRec=function(_,ev){ s.sim={rec:ev.target.value}; LFI.recarregar(); };
  H.sIng=function(_,ev){ sim.ing=ev.target.value; upd(); };
  H.sPreco=function(_,ev){ sim.modo='preco'; sim.preco=+ev.target.value; upd(); };
  H.sMk=function(_,ev){ sim.modo='mk'; sim.mk=+ev.target.value; upd(); };
  H.sVar=function(_,ev){ sim.varPct=+ev.target.value; if(sim.modo==='mk'){} upd(); };
  H.sImp=function(_,ev){ sim.imp=+ev.target.value; upd(); };
  H.sFixo=function(_,ev){ sim.fixo=UI.num(ev.target.value); desenhaSim(el, vol); };
  H.sReset=function(){ s.sim={rec:r.id}; LFI.recarregar(); };
  H.sMeta=function(){ sim.modo='mk'; sim.mk=LFI.markupDe(r); LFI.recarregar(); };
}
function sl(k, lb, val, min, max, step, v, l1, l2){
  return '<div class="cs-sl"><div class="hd"><label>'+lb+'</label><b data-lb="'+k+'">'+val+'</b></div><input type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+v+'" data-inp="s'+k.charAt(0).toUpperCase()+k.slice(1)+'"><div class="lim"><span>'+l1+'</span><span>'+l2+'</span></div></div>';
}
function desenhaSim(el, vol){
  var s=st(), sim=s.sim, x=calcSim(sim), r=x.r, atual=calcSim({rec:sim.rec, ing:sim.ing, varPct:0, imp:LFI.impVendaDe(r), preco:r.preco, modo:'preco'});
  var mcMes=x.mc*vol, mcMesAtual=atual.mc*vol, eq=x.mc>0?Math.ceil(sim.fixo/x.mc):null;
  var cp=Math.max(0,x.custo/x.preco*100), ip=Math.max(0,x.impV/x.preco*100), mp=Math.max(0,100-cp-ip);
  var corMc=x.mcPct<0?'var(--red)':x.cmv>1/LFI.markupDe(r)+0.02?'#946C00':'var(--green)';
  var h='<div class="cs-dec"><span style="width:'+Math.min(100,cp).toFixed(1)+'%;background:#FF5A00">'+(cp>12?'Custo '+F.pctN(cp,0):'')+'</span><span style="width:'+Math.min(100,ip).toFixed(1)+'%;background:#B08A00">'+(ip>9?'Impostos':'')+'</span><span style="width:'+mp.toFixed(1)+'%;background:#16A34A">'+(mp>12?'Margem '+F.pctN(mp,0):'')+'</span></div>'+
    '<div class="ch-leg" style="margin:0 0 14px"><span><i style="background:#FF5A00"></i>Custo</span><span><i style="background:#B08A00"></i>Impostos</span><span><i style="background:#16A34A"></i>Margem de contribuição</span></div>';
  h+='<div class="cs-res">'+
    cel('Custo unitário', F.moeda(x.custo), Math.abs(x.custo-x.custoBase)>0.004?UI.variacao(x.custo,x.custoBase,true)+' vs atual':'custo atual')+
    cel('Preço de venda', F.moeda(x.preco), Math.abs(x.preco-r.preco)>0.004?UI.variacao(x.preco,r.preco)+' vs '+F.moeda(r.preco):'preço atual', true)+
    cel('Markup aplicado', F.num(x.mk,2)+'×', 'meta '+F.num(LFI.markupDe(r),2)+'×')+
    cel('Margem de contribuição', '<span style="color:'+corMc+'">'+F.moeda(x.mc)+'</span>', F.pct(x.mcPct)+' do preço')+
    cel('CMV', '<span style="color:'+corMc+'">'+F.pct(x.cmv)+'</span>', 'meta '+F.pct(1/LFI.markupDe(r)))+
    cel('Impostos', F.moeda(x.impV), F.pctN(sim.imp,2)+' sobre a venda')+
    cel('Preço mínimo (MC = 0)', F.moeda(x.minimo), 'abaixo disso, prejuízo por unidade')+
    cel('Preço para a meta de CMV', F.moeda(x.precoMeta), 'custo × markup da categoria')+
    cel('Ponto de equilíbrio', eq==null?'—':F.num(eq,0)+' <small>un/mês</small>', 'para '+F.moeda(sim.fixo)+' de custo fixo')+
  '</div>';
  h+='<div class="grid g2 mt"><div class="card flat" style="margin:0"><h3 style="margin-bottom:8px">Projeção mensal <small>volume dos últimos 30 dias</small></h3>'+
    '<div class="lnr"><span class="k">Unidades vendidas</span><span class="v">'+F.num(vol,0)+'</span></div>'+
    '<div class="lnr"><span class="k">Margem atual no mês</span><span class="v">'+F.moeda(mcMesAtual)+'</span></div>'+
    '<div class="lnr"><span class="k">Margem simulada no mês</span><span class="v">'+F.moeda(mcMes)+'</span></div>'+
    '<div class="lnr tot"><span class="k">Diferença</span><span class="v" style="color:'+(mcMes-mcMesAtual<0?'var(--red)':'var(--green)')+'">'+(mcMes-mcMesAtual>0?'+':'')+F.moeda(mcMes-mcMesAtual)+'</span></div></div>'+
    '<div class="card flat" style="margin:0"><h3 style="margin-bottom:8px">Ingredientes <small>'+(sim.varPct?'com '+esc(LFI.prod(sim.ing).nome)+' '+(sim.varPct>0?'+':'')+sim.varPct+'%':'custo atual')+'</small></h3>'+
    LFI.custoReceita(r).itens.slice().sort(function(a,b){ return b.custo-a.custo; }).slice(0,6).map(function(i){ var v=i.custo*(i.prod.id===sim.ing?1+sim.varPct/100:1)/(r.rend||1); return '<div class="lnr"><span class="k">'+(i.prod.id===sim.ing?'<b style="color:var(--roxo-esc)">'+esc(i.prod.nome)+'</b>':esc(i.prod.nome))+'</span><span class="v">'+F.moeda(v)+'</span></div>'; }).join('')+'</div></div>';
  if(x.mc<0) h+=UI.nota('<b>Margem negativa:</b> com estes parâmetros cada unidade vendida gera prejuízo de '+F.moeda(-x.mc)+'.','wt','alerta');
  el.querySelector('#sim-res').innerHTML=h;
}
function cel(lb, v, sub, hl){ return '<div class="c'+(hl?' hl':'')+'"><span>'+lb+'</span><b>'+v+'</b><small>'+sub+'</small></div>'; }

/* ---------- aba: cenários de variação de insumo ---------- */
function abaCenario(el, H){
  var s=st(), cen=s.cen, usados=LFI.db.produtos.filter(function(p){ return p.tipo==='insumo'&&LFI.receitasComProduto(p.id).some(function(r){ return LFI.depVisivel(r.dep); }); });
  if(!usados.length){ el.innerHTML='<div class="card">'+UI.vazio('Nenhuma receita visível nesta empresa')+'</div>'; return; }
  if(!LFI.prod(cen.prod)||usados.indexOf(LFI.prod(cen.prod))<0) cen.prod=usados[0].id;
  var p=LFI.prod(cen.prod);
  var h='<div class="card mb"><div class="fgrid c3" style="align-items:end"><div class="field"><label>Insumo</label><select class="inp" data-chg="cProd">'+LFI.db.categorias.map(function(c){ var ps=usados.filter(function(x){ return x.cat===c.id; }); if(!ps.length) return ''; return '<optgroup label="'+esc(c.nome)+'">'+ps.map(function(x){ return '<option value="'+x.id+'"'+(x.id===p.id?' selected':'')+'>'+esc(x.nome)+' · '+F.moeda(x.custoMedio)+'/'+x.un+'</option>'; }).join('')+'</optgroup>'; }).join('')+'</select></div>'+
    '<div class="field"><div class="cs-sl" style="margin:0"><div class="hd"><label>Variação de preço do insumo</label><b data-lb="cPct">'+(cen.pct>0?'+':'')+cen.pct+'%</b></div><input type="range" min="-30" max="50" step="1" value="'+cen.pct+'" data-inp="cPct"><div class="lim"><span>−30%</span><span>0</span><span>+50%</span></div></div></div>'+
    '<div class="field"><div class="pills">'+[-10,5,10,20].map(function(v){ return '<button class="pill" data-act="cRap" data-id="'+v+'">'+(v>0?'+':'')+v+'%</button>'; }).join('')+'</div></div></div>'+
    '<div id="cen-kpi"></div></div>'+
    '<div class="card"><h3><span class="lft">Impacto nas receitas que usam '+esc(p.nome)+' <small>volume: vendas dos últimos 30 dias (mix) e consumo do buffet</small></span><button class="btn sec sm" data-act="cXls">'+UI.ic('baixar')+'Excel</button></h3><div id="cen-t"></div></div>';
  el.innerHTML=h;
  var tab=null, ultimo=[];
  function calc(){
    var vol=volumes(), f=1+cen.pct/100, linhas=[];
    LFI.receitasComProduto(p.id).filter(function(r){ return LFI.depVisivel(r.dep); }).forEach(function(r){
      var c=LFI.custoReceita(r), it=c.itens.filter(function(i){ return i.prod.id===p.id; }), ingC=0; it.forEach(function(i){ ingC+=i.custo; });
      var buffetBase=!!(r.buffet&&!r.preco), div=buffetBase?(r.pesoFinal/1000):(r.rend||1);
      var delta=ingC*(f-1)*(1+(r.perda||0)/100)/div, base=buffetBase?c.porKg:c.porcao, novo=base+delta;
      var preco=buffetBase?LFI.db.buffetPrecoKg:r.preco, imp=LFI.impVendaDe(r)/100;
      var v=vol[r.id]||{qtd:0,kg:0}, q=buffetBase?v.kg:v.qtd;
      linhas.push({id:r.id, r:r, buffet:buffetBase, part:c.bruto?ingC/c.bruto:0, base:base, novo:novo, delta:delta, preco:preco, cmvA:preco?base/preco:0, cmvN:preco?novo/preco:0, mcA:preco-base-preco*imp, mcN:preco-novo-preco*imp, q:q, imp:(r2(-delta*q)||0), manter:preco&&base?novo/(base/preco):0});
    });
    return linhas;
  }
  function desenha(){
    var ls=calc(); ultimo=ls; var tot=0; ls.forEach(function(l){ tot+=l.imp; });
    var p30=LFI.periodo('30d'), cons=consolidado(p30, opsVis()), estV=LFI.valorEstoque(p, LFI.depIds())*(cen.pct/100);
    el.querySelector('#cen-kpi').innerHTML='<div class="kpis k4" style="margin:0;grid-template-columns:repeat(4,minmax(0,1fr))">'+
      UI.kpi({lb:'Novo custo do insumo', vl:F.moeda(p.custoMedio*(1+cen.pct/100))+' <small>/'+p.un+'</small>', dl:'atual '+F.moeda(p.custoMedio)})+
      UI.kpi({lb:'Receitas afetadas', vl:String(ls.length), dl:ls.filter(function(l){ return !l.buffet&&l.cmvN>1/LFI.markupDe(l.r)+0.005; }).length+' passariam da meta de CMV'})+
      UI.kpi({lb:'Impacto na margem mensal', vl:'<span style="color:'+(tot<0?'var(--red)':tot>0?'var(--green)':'inherit')+'">'+(tot>0?'+':'')+F.moeda(tot)+'</span>', dl:cons.mc?F.pct(Math.abs(tot)/cons.mc,2)+' da margem de 30 dias':'', hl:true})+
      UI.kpi({lb:'Reavaliação do estoque', vl:(estV>0?'+':'')+F.moeda(estV), dl:F.qtd(LFI.estoque(p,LFI.depIds()),p.un)+' em estoque'})+'</div>';
    el.querySelector('[data-lb="cPct"]').textContent=(cen.pct>0?'+':'')+cen.pct+'%';
    var cfg={linhas:ls, ordem:8, dir:1, cls:'cp', vazio:'Nenhuma receita usa este insumo', linhaAct:'cRec', colunas:[
      {t:'Receita', v:function(l){ return '<b>'+l.r.foto+' '+esc(l.r.nome)+'</b><small>'+UI.dep(l.r.dep)+'</small>'; }, ord:function(l){ return l.r.nome; }},
      {t:'Peso no custo', r:true, v:function(l){ return F.pct(l.part,0); }, ord:function(l){ return l.part; }},
      {t:'Custo atual', r:true, v:function(l){ return F.moeda(l.base)+'<small>'+(l.buffet?'por kg':'por porção')+'</small>'; }, ord:function(l){ return l.base; }},
      {t:'Custo simulado', r:true, v:function(l){ return '<b>'+F.moeda(l.novo)+'</b><small>'+(l.delta>=0?'+':'')+F.moeda(l.delta)+'</small>'; }, ord:function(l){ return l.novo; }},
      {t:'CMV', r:true, v:function(l){ return F.pct(l.cmvA)+' → <b>'+F.pct(l.cmvN)+'</b><small>'+(l.buffet?'s/ preço do buffet':'meta '+F.pct(1/LFI.markupDe(l.r)))+'</small>'; }, ord:function(l){ return l.cmvN; }},
      {t:'Margem unit.', r:true, v:function(l){ return F.moeda(l.mcA)+' → <b>'+F.moeda(l.mcN)+'</b>'; }, ord:function(l){ return l.mcN; }},
      {t:'Volume 30 d', r:true, v:function(l){ return l.buffet?F.num(l.q,1)+' kg':F.num(l.q,0)+' un'; }, ord:function(l){ return l.q; }},
      {t:'Preço p/ manter CMV', r:true, v:function(l){ return l.buffet?'—':F.moeda(l.manter)+'<small>hoje '+F.moeda(l.preco)+'</small>'; }, ord:function(l){ return l.manter; }},
      {t:'Impacto mensal', r:true, v:function(l){ return '<b style="color:'+(l.imp<-0.004?'var(--red)':l.imp>0.004?'var(--green)':'var(--muted)')+'">'+(l.imp>0?'+':'')+F.moeda(l.imp)+'</b>'; }, ord:function(l){ return l.imp; }}
    ], rodape:'<tr><td colspan="8">Total no mês</td><td class="r">'+(tot>0?'+':'')+F.moeda(tot)+'</td></tr>'};
    if(tab) tab.redesenha(ls); else tab=UI.tabela(el.querySelector('#cen-t'), cfg);
    if(tab) { /* rodapé com total atualizado */ var tf=el.querySelector('#cen-t tfoot td.r'); if(tf) tf.textContent=(tot>0?'+':'')+F.moeda(tot); }
  }
  desenha();
  H.cProd=function(_,ev){ cen.prod=ev.target.value; LFI.recarregar(); };
  H.cPct=function(_,ev){ cen.pct=+ev.target.value; desenha(); };
  H.cRap=function(id){ cen.pct=+id; el.querySelector('[data-inp="cPct"]').value=cen.pct; desenha(); };
  H.cRec=function(id){ LFI.ir('receitas', id); };
  H.cXls=function(){ UI.exportarExcel('cenario_'+p.nome.replace(/\W+/g,'_').toLowerCase(),['Receita','Operação','Peso do insumo no custo %','Custo atual','Custo simulado','CMV atual %','CMV simulado %','Margem unit. atual','Margem unit. simulada','Volume 30 dias','Impacto mensal R$'],
    ultimo.map(function(l){ return [l.r.nome, LFI.dep(l.r.dep).nome, r2(l.part*100), r2(l.base), r2(l.novo), r2(l.cmvA*100), r2(l.cmvN*100), r2(l.mcA), r2(l.mcN), r2(l.q), r2(l.imp)]; }), 'Cenário'); UI.toast('Planilha do cenário gerada'); };
}

/* ---------- aba: custos de insumos ---------- */
function abaInsumos(el, H){
  var s=st(), f=s.ins;
  var ps=LFI.db.produtos.filter(function(p){ return p.tipo==='insumo'&&(!f.cat||p.cat===f.cat); });
  var n=function(x){ return String(x||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); };
  if(f.q) ps=ps.filter(function(p){ return n(p.nome).indexOf(n(f.q))>=0||p.ncm.indexOf(f.q)>=0; });
  var altaU=ps.filter(function(p){ return p.ultimoCusto>p.custoMedio*1.005; }), alta6=ps.filter(function(p){ return p.hist.length&&p.custoMedio>p.hist[0].v*1.05; });
  var vEst=0; ps.forEach(function(p){ vEst+=LFI.valorEstoque(p, LFI.depIds()); });
  var h='<div class="kpis">'+
    UI.kpi({lb:'Insumos analisados', vl:String(ps.length), dl:LFI.db.categorias.length+' categorias cadastradas'})+
    UI.kpi({lb:'Último custo acima do médio', vl:String(altaU.length), dl:'Pressão no custo das próximas entradas'})+
    UI.kpi({lb:'Alta acima de 5% em 6 meses', vl:String(alta6.length), dl:'Revisar preços das receitas afetadas'})+
    UI.kpi({lb:'Valor em estoque', vl:F.moeda(vEst), dl:'Ao custo médio · empresa selecionada'})+'</div>';
  h+='<div class="card"><h3><span class="lft">Custos dos insumos <small>custo médio ponderado × último custo de aquisição</small></span><span style="display:flex;gap:8px;flex-wrap:wrap"><div class="search">'+UI.ic('busca')+'<input placeholder="Buscar insumo ou NCM" data-inp="iQ" value="'+esc(f.q)+'"></div>'+
    '<select class="inp sm" style="width:auto" data-chg="iCat"><option value="">Todas as categorias</option>'+LFI.db.categorias.filter(function(c){ return c.id!=='aca'&&c.id!=='sob'; }).map(function(c){ return '<option value="'+c.id+'"'+(f.cat===c.id?' selected':'')+'>'+esc(c.nome)+'</option>'; }).join('')+'</select></span></h3><div id="ins-t"></div></div>';
  el.innerHTML=h;
  UI.tabela(el.querySelector('#ins-t'),{linhas:ps, linhaAct:'insDet', cls:'cp', ordem:5, vazio:'Nenhum insumo encontrado', colunas:[
    {t:'Insumo', v:function(p){ return '<b>'+esc(p.nome)+'</b><small>'+esc(LFI.cat(p.cat).nome)+' · NCM '+esc(p.ncm)+'</small>'; }, ord:function(p){ return p.nome; }},
    {t:'Un', k:'un', c:true},
    {t:'Custo médio', r:true, v:function(p){ return '<b>'+F.moeda(p.custoMedio)+'</b>'; }, ord:function(p){ return p.custoMedio; }},
    {t:'Último custo', r:true, v:function(p){ return F.moeda(p.ultimoCusto); }, ord:function(p){ return p.ultimoCusto; }},
    {t:'Último × médio', r:true, v:function(p){ return UI.variacao(p.ultimoCusto,p.custoMedio,true); }, ord:function(p){ return p.ultimoCusto/p.custoMedio; }},
    {t:'Tendência 6 meses', v:function(p){ var vs=p.hist.map(function(x){ return x.v; }); return vs.length>1?'<span style="display:inline-flex;gap:8px;align-items:center">'+UI.spark(vs, vs[vs.length-1]>vs[0]*1.02?'#DC2626':vs[vs.length-1]<vs[0]*0.98?'#16A34A':'#8E8E93')+UI.variacao(p.custoMedio,p.hist[0].v,true)+'</span>':'—'; }, ord:function(p){ return p.hist.length?p.custoMedio/p.hist[0].v:1; }},
    {t:'Receitas', r:true, v:function(p){ var n=LFI.receitasComProduto(p.id).length; return n?'<b>'+n+'</b>':'<span style="color:var(--muted)">0</span>'; }, ord:function(p){ return LFI.receitasComProduto(p.id).length; }},
    {t:'Valor em estoque', r:true, v:function(p){ return F.moeda(LFI.valorEstoque(p, LFI.depIds()))+'<small>'+F.qtd(LFI.estoque(p,LFI.depIds()),p.un)+'</small>'; }, ord:function(p){ return LFI.valorEstoque(p, LFI.depIds()); }}
  ]});
  var t; H.iQ=function(_,ev){ clearTimeout(t); var v=ev.target.value; t=setTimeout(function(){ f.q=v; LFI.recarregar(); var i=document.querySelector('[data-inp="iQ"]'); if(i){ i.focus(); i.setSelectionRange(v.length,v.length); } },250); };
  H.iCat=function(_,ev){ f.cat=ev.target.value; LFI.recarregar(); };
  H.insDet=detalheInsumo;
}
function detalheInsumo(id){
  var p=LFI.prod(id); if(!p) return;
  var recs=LFI.receitasComProduto(id);
  var corpo='<div class="kpis k3">'+UI.kpi({lb:'Custo médio', vl:F.moeda(p.custoMedio)+' <small>/'+p.un+'</small>'})+UI.kpi({lb:'Último custo', vl:F.moeda(p.ultimoCusto), dl:UI.variacao(p.ultimoCusto,p.custoMedio,true)+' vs médio'})+UI.kpi({lb:'Variação 6 meses', vl:p.hist.length?F.pct(p.custoMedio/p.hist[0].v-1):'—', dl:'desde '+(p.hist[0]?F.data(p.hist[0].d):'—')})+'</div>'+
    '<div class="card flat" style="margin-bottom:14px"><h3 style="margin-bottom:6px">Histórico de custo</h3><div id="di-g"></div></div>'+
    '<h3 style="font-size:14px;font-weight:800;margin:0 0 8px">Receitas que usam este insumo</h3>'+
    (recs.length?'<div class="tb-wrap"><table class="tb cp"><thead><tr><th>Receita</th><th class="r">Qtd</th><th class="r">Custo na receita</th><th class="r">Peso no custo</th></tr></thead><tbody>'+recs.map(function(r){ var c=LFI.custoReceita(r), it=c.itens.filter(function(i){ return i.prod.id===id; })[0]; return '<tr class="cl" data-act="rec" data-id="'+r.id+'"><td><b>'+esc(r.nome)+'</b><small>'+UI.dep(r.dep)+'</small></td><td class="r">'+F.num(it.qtd)+' '+esc(it.un)+'</td><td class="r">'+F.moeda(it.custo)+'</td><td class="r">'+F.pct(it.part,0)+'</td></tr>'; }).join('')+'</tbody></table></div>':UI.vazio('Nenhuma receita usa este insumo'));
  var m=UI.modal({titulo:esc(p.nome), sub:esc(LFI.cat(p.cat).nome)+' · NCM '+esc(p.ncm)+' · fornecedor '+esc(p.forn?LFI.forn(p.forn).nome:'—'), tam:'lg', corpo:corpo,
    botoes:'<button class="btn sec" data-act="_fechar">Fechar</button><button class="btn sec" data-act="cen">Simular variação</button><button class="btn pri" data-act="est">Abrir no estoque</button>',
    acoes:{est:function(){ m.fechar(); LFI.ir('estoque', id); }, rec:function(rid){ m.fechar(); LFI.ir('receitas', rid); }, cen:function(){ m.fechar(); var s=st(); s.cen.prod=id; s.aba='cen'; if(LFI.atual().id==='custos') LFI.recarregar(); else LFI.ir('custos'); }}});
  setTimeout(function(){ UI.grafLinhas(m.corpo.querySelector('#di-g'),{cats:p.hist.map(function(x){ return F.dataC(x.d); }), titulosTip:p.hist.map(function(x){ return F.data(x.d)+' · '+x.origem; }), series:[{nome:'Custo', cor:'#FF5A00', valores:p.hist.map(function(x){ return x.v; })}], zero:false, altura:180}); },30);
}

LFI.registrar('custos',{titulo:'Custos e Precificação', render:render});
})();
