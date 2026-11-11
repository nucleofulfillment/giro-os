/* LiveFood Intelligence — INDICADORES E RELATÓRIOS
   Aba "Indicadores": tendências, comparativos entre operações, ticket médio, engenharia de cardápio,
   estoque, compras, contas a pagar (aging), perdas, margem e carga tributária — com detalhamento por clique.
   Aba "Central de relatórios": 13 relatórios com prévia, filtros e exportação (PDF e Excel), sempre gerados
   a partir de LFI.db, de modo que ações feitas nos outros módulos aparecem aqui. Rota: #/relatorios/<id>. */
(function(){
'use strict';
var LFI=window.LFI, UI=LFI.ui, F=LFI.fmt, esc=UI.esc, r2=LFI.dataUtil.r2;
var CORES_OP={pad:'#E08A1E', res:'#1D4ED8', sus:'#C2185B', cen:'#5E5E66'};

function css(){
  if(document.getElementById('css-relatorios')) return;
  var s=document.createElement('style'); s.id='css-relatorios';
  s.textContent=
  '.tela-relatorios .grid>.card+.card{margin-top:0}.tela-relatorios .g3 .donut-wrap{flex-direction:column;align-items:stretch}.tela-relatorios .g3 .donut-wrap .ch{margin:0 auto}'+
  '.rl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}'+
  '.rl-card{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:16px;display:flex;flex-direction:column;gap:10px;cursor:pointer;transition:box-shadow .18s,transform .18s,border-color .18s;box-shadow:var(--sh1)}'+
  '.rl-card:hover{box-shadow:var(--sh2);transform:translateY(-2px);border-color:var(--border2)}'+
  '.rl-card .hd{display:flex;gap:12px;align-items:flex-start}.rl-card .hd b{font-size:14.5px;font-weight:800;display:block}.rl-card .hd small{font-size:12px;color:var(--muted);font-weight:600;line-height:1.45;display:block;margin-top:3px}'+
  '.rl-card .ft{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:auto;padding-top:10px;border-top:1px solid var(--border)}'+
  '.rl-card .ft .tags{display:flex;gap:5px;flex-wrap:wrap}.rl-card .ft .vl{font-size:12px;font-weight:800;color:var(--muted2);white-space:nowrap}'+
  '.rl-gr{font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);margin:20px 0 10px}.rl-gr:first-child{margin-top:4px}'+
  '.rl-me{display:flex;flex-direction:column;gap:2px}.rl-me .it{display:flex;align-items:center;gap:10px;padding:8px 6px;border-bottom:1px solid var(--border);cursor:pointer;border-radius:8px}.rl-me .it:hover{background:var(--s2)}.rl-me .it:last-child{border-bottom:0}'+
  '.rl-me .it .gr{flex:1;min-width:0}.rl-me .it b{font-size:13px;font-weight:800;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rl-me .it small{font-size:11.5px;color:var(--muted);font-weight:600}'+
  '.rl-me .it .rt{text-align:right;font-size:12.5px;font-weight:800;font-variant-numeric:tabular-nums}.rl-me .it .rt small{display:block}'+
  '.rl-quad{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:12px}.rl-quad div{border-radius:10px;padding:8px 9px;font-size:11px;font-weight:700;line-height:1.35}.rl-quad b{display:block;font-size:16px;font-weight:800}'+
  '.rl-kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:16px}'+
  '@media (max-width:700px){.rl-quad{grid-template-columns:repeat(2,minmax(0,1fr))}}';
  document.head.appendChild(s);
}

function st(){ return LFI.estado.relatorios = LFI.estado.relatorios || {aba:'ind', per:'30d', op:'todas', de:null, ate:null, cmp:'forn', q:'', rp:{per:'30d', op:'todas', de:null, ate:null}}; }
function opsVis(){ return LFI.depIds().filter(function(d){ return d!=='cen'; }); }
function depsDe(op){ var v=opsVis(); return op==='todas'?v:v.filter(function(d){ return d===op; }); }
function dias(p){ var out=[], d=new Date(p.de+'T12:00:00'), f=new Date(p.ate+'T12:00:00'); while(d<=f){ out.push(LFI.dataUtil.iso(d)); d.setDate(d.getDate()+1); } return out; }
function soma(a, f){ var t=0; a.forEach(function(x){ t+=f?f(x):x; }); return t; }
function tickets(p, deps){ return soma(LFI.vendas(p,deps), function(v){ return v.tickets; }); }
function barraFiltros(s, prefixo){
  var per=[['hoje','Hoje'],['7d','7 dias'],['30d','30 dias'],['mes','Mês atual'],['custom','Período']], p=LFI.periodo(s.per, s.de, s.ate);
  return '<div class="seg">'+per.map(function(x){ return '<button class="'+(s.per===x[0]?'on':'')+'" data-act="'+prefixo+'per" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>'+
    (s.per==='custom'?'<input type="date" class="inp sm" style="width:auto" data-chg="'+prefixo+'de" value="'+p.de+'"><input type="date" class="inp sm" style="width:auto" data-chg="'+prefixo+'ate" value="'+p.ate+'">':'<span class="tag">'+F.dataC(p.de)+' a '+F.dataC(p.ate)+'</span>');
}
function pillsOps(s, prefixo){ return '<div class="pills">'+['todas'].concat(opsVis()).map(function(d){ var dd=LFI.dep(d); return '<button class="pill'+(s.op===d?' on':'')+'" data-act="'+prefixo+'op" data-id="'+d+'">'+(dd?'<i style="background:'+dd.cor+'"></i>'+esc(dd.curto):'Todas as operações')+'</button>'; }).join('')+'</div>'; }
function ligaFiltros(H, s, prefixo){
  H[prefixo+'per']=function(id){ s.per=id; LFI.recarregar(); };
  H[prefixo+'de']=function(_,ev){ s.de=ev.target.value; LFI.recarregar(); };
  H[prefixo+'ate']=function(_,ev){ s.ate=ev.target.value; LFI.recarregar(); };
  H[prefixo+'op']=function(id){ s.op=id; LFI.recarregar(); };
}

/* categoria de venda de um item do mix (para rentabilidade) */
function catVenda(x){ if(x.rec){ var r=LFI.rec(x.rec); return r?r.cat:'Outros'; } var m=LFI.db.mixVendas.filter(function(y){ return y.nome===x.nome&&y.dep===x.dep; })[0]; if(m&&m.prod) return 'Bebidas (revenda)'; if(/buffet/i.test(x.nome)) return 'Buffet por quilo'; return 'Cafeteria'; }
/* perdas detalhadas (estoque, buffet e técnica de produção) */
function perdasDet(p, deps){
  var out=[];
  LFI.db.movs.forEach(function(m){ var d=m.d.slice(0,10); if(d<p.de||d>p.ate||deps.indexOf(m.dep)<0) return; if(m.tipo!=='perda'&&m.tipo!=='descarte') return; var pr=LFI.prod(m.prod); if(!pr) return;
    out.push({d:d, tipo:m.tipo==='perda'?'Perda':'Descarte', origem:'Estoque', item:pr.nome, dep:m.dep, qtd:Math.abs(m.qtd), un:pr.un, valor:r2(Math.abs(m.qtd)*(m.custo||0)), motivo:m.obs||'—', resp:m.usuario, perda:true}); });
  LFI.db.buffets.forEach(function(b){ if(b.status!=='encerrado'||b.data<p.de||b.data>p.ate||deps.indexOf(b.dep)<0) return;
    LFI.resumoBuffet(b).itens.forEach(function(i){ var it=i.it; if(it.pesoFinal==null||!it.pesoFinal) return; var v=r2(it.pesoFinal*i.custoKg);
      var tipo=it.destino==='reaproveitar'?'Sobra reaproveitada':it.destino==='perda'?'Perda':'Descarte';
      out.push({d:b.data, tipo:tipo, origem:'Buffet '+b.num, item:i.rec.nome, dep:b.dep, qtd:it.pesoFinal, un:'kg', valor:v, motivo:(it.motivo||'Dentro das regras de conservação')+(it.temp!=null?' · '+it.temp+' °C':'')+' · '+it.cond, resp:b.respEnc||b.resp, perda:it.destino!=='reaproveitar'}); }); });
  LFI.db.producao.forEach(function(op){ if(op.status!=='concluida'||op.data<p.de||op.data>p.ate||deps.indexOf(op.dep)<0) return; var r=LFI.rec(op.rec), c=LFI.custoReceita(r), v=r2(c.perdaV*(op.qtd/r.rend));
    out.push({d:op.data, tipo:'Perda técnica', origem:'Produção '+op.num, item:r.nome, dep:op.dep, qtd:r.perda, un:'% da ficha', valor:v, motivo:'Perda técnica prevista na ficha técnica ('+F.num(r.perda,0)+'%) · '+F.num(op.qtd,0)+' '+r.rendUn, resp:op.resp, perda:true}); });
  out.sort(function(a,b){ return a.d<b.d?1:-1; });
  return out;
}

/* ================= RENDER ================= */
function render(el, arg){
  css();
  if(arg && REL[arg]) return renderPreview(el, arg);
  var s=st();
  var h=UI.cabecalho({titulo:'Indicadores e Relatórios', sub:(LFI.empresaAtual()?esc(LFI.empresaAtual().fantasia)+' · CNPJ '+LFI.empresaAtual().cnpj:esc(LFI.db.grupo.nome)+' · consolidado de '+LFI.db.empresas.length+' CNPJs')+' · dados compartilhados com todos os módulos',
    acoes:'<button class="btn sec sm" data-act="aba" data-id="rel">'+UI.ic('pdf')+'Central de relatórios</button><button class="btn pri sm" data-act="_ir" data-id="relatorios/perdas">'+UI.ic('relatorio')+'Sobras e perdas</button>'});
  h+='<div class="tabs"><button class="'+(s.aba==='ind'?'on':'')+'" data-act="aba" data-id="ind">Indicadores</button><button class="'+(s.aba==='rel'?'on':'')+'" data-act="aba" data-id="rel">Central de relatórios <span class="n">'+LISTA.length+'</span></button></div><div id="rl-corpo"></div>';
  el.innerHTML=h;
  var H={aba:function(id){ s.aba=id; LFI.recarregar(); }};
  (s.aba==='rel'?abaCentral:abaIndicadores)(el.querySelector('#rl-corpo'), H);
  UI.liga(el, UI.navHandlers(H));
}

/* ---------- aba: indicadores ---------- */
function abaIndicadores(el, H){
  var s=st(), p=LFI.periodo(s.per, s.de, s.ate), pa=LFI.periodoAnterior(p), deps=depsDe(s.op);
  var fat=LFI.faturamento(p,deps), fatA=LFI.faturamento(pa,deps), tk=tickets(p,deps), tkA=tickets(pa,deps), tm=tk?fat/tk:0, tmA=tkA?fatA/tkA:0;
  var cmv=0, imp=0; deps.forEach(function(d){ var f=LFI.faturamento(p,[d]); cmv+=f*LFI.cmvPct(d); imp+=f*LFI.empresaDoDep(d).impVenda/100; });
  var mc=fat-cmv-imp, perP=LFI.perdasProducao(p,deps), perB=soma(perdasDet(p,deps).filter(function(x){ return x.origem.indexOf('Buffet')===0&&x.perda; }), function(x){ return x.valor; });
  var nd=dias(p).length;
  var h='<div class="barra">'+barraFiltros(s,'')+'<span class="sp"></span>'+pillsOps(s,'')+'</div>';
  h+='<div class="kpis k5">'+
    UI.kpi({lb:'Faturamento', vl:F.moeda(fat), dl:UI.variacao(fat,fatA)+' vs. '+F.dataC(pa.de)+'–'+F.dataC(pa.ate), hl:true})+
    UI.kpi({lb:'Ticket médio', vl:F.moeda(tm), dl:UI.variacao(tm,tmA)+' vs. anterior', act:'kTk'})+
    UI.kpi({lb:'Atendimentos', vl:F.num(tk,0), dl:F.num(tk/Math.max(1,nd),0)+' por dia · '+UI.variacao(tk,tkA)})+
    UI.kpi({lb:'Margem de contribuição', vl:F.pct(fat?mc/fat:0), dl:F.moeda(mc)+' · CMV '+F.pct(fat?cmv/fat:0), act:'_ir', id:'custos'})+
    UI.kpi({lb:'Perdas sobre faturamento', vl:F.pct(fat?(perP.total+perB)/fat:0,2), dl:F.moeda(perP.total+perB)+' em perdas', act:'_ir', id:'relatorios/perdas'})+'</div>';
  h+='<div class="grid g21 mb"><div class="card"><h3><span class="lft">'+UI.ic('relatorio')+' Faturamento acumulado <small>período atual × anterior · clique para ver o dia</small></span></h3><div id="i-acum"></div></div>'+
     '<div class="card"><h3>Comparativo entre operações <small>clique para detalhar</small></h3><div id="i-ops"></div></div></div>';
  h+='<div class="grid g3 mb"><div class="card"><h3>Média por dia da semana <small>clique na barra</small></h3><div id="i-sem"></div></div>'+
     '<div class="card"><h3>Faturamento por categoria <small>clique para a tendência</small></h3><div id="i-cat"></div></div>'+
     '<div class="card"><h3><span class="lft">Engenharia de cardápio</span><button class="vertodos" data-act="_ir" data-id="relatorios/vendidos">Relatório</button></h3><div id="i-me"></div></div></div>';
  h+='<div class="grid g3 mb"><div class="card"><h3>CMV por operação <small>real × meta do markup</small></h3><div id="i-cmv"></div></div>'+
     '<div class="card"><h3><span class="lft">Valor em estoque</span><button class="vertodos" data-act="_ir" data-id="relatorios/estoque">Posição</button></h3><div id="i-est"></div></div>'+
     '<div class="card"><h3><span class="lft">Abaixo do mínimo</span><button class="vertodos" data-act="_ir" data-id="estoque">Estoque</button></h3><div id="i-min"></div></div></div>';
  h+='<div class="grid g3 mb"><div class="card"><h3><span class="lft">Compras realizadas</span><span class="seg"><button class="'+(s.cmp==='forn'?'on':'')+'" data-act="cmp" data-id="forn">Fornecedor</button><button class="'+(s.cmp==='cat'?'on':'')+'" data-act="cmp" data-id="cat">Categoria</button></span></h3><div id="i-cmp"></div></div>'+
     '<div class="card"><h3>Contas a pagar · vencimentos <small>clique na faixa</small></h3><div id="i-cp"></div></div>'+
     '<div class="card"><h3><span class="lft">Perdas de produção e buffet</span><button class="vertodos" data-act="_ir" data-id="relatorios/perdas">Relatório</button></h3><div id="i-per"></div></div></div>';
  h+='<div class="grid g2"><div class="card"><h3><span class="lft">Margem de contribuição por categoria de produto</span><button class="vertodos" data-act="_ir" data-id="relatorios/rentabilidade">Relatório</button></h3><div id="i-mc"></div></div>'+
     '<div class="card"><h3><span class="lft">Carga tributária estimada por categoria</span><button class="vertodos" data-act="_ir" data-id="tributos">Gestão tributária</button></h3><div id="i-trib"></div></div></div>';
  el.innerHTML=h;

  /* acumulado atual × anterior */
  var ds=dias(p), dsA=dias(pa), acc=0, accA=0, sA=[], sB=[];
  var porDia={}; LFI.vendas(p,deps).forEach(function(v){ porDia[v.d]=(porDia[v.d]||0)+v.valor; });
  var porDiaA={}; LFI.vendas(pa,deps).forEach(function(v){ porDiaA[v.d]=(porDiaA[v.d]||0)+v.valor; });
  ds.forEach(function(d,i){ acc+=porDia[d]||0; accA+=porDiaA[dsA[i]]||0; sA.push(acc); sB.push(accA); });
  if(ds.length>1) UI.grafLinhas(el.querySelector('#i-acum'),{cats:ds.map(F.dataC), titulosTip:ds.map(function(d,i){ return F.diaSemana(d)+', '+F.data(d)+' (anterior: '+F.dataC(dsA[i])+')'; }), altura:240,
    series:[{nome:'Período atual', cor:'#FF5A00', valores:sA},{nome:'Período anterior', cor:'#8E8E93', valores:sB, tracejado:true}], onClick:function(i){ detalheDia(ds[i], deps); }});
  else el.querySelector('#i-acum').innerHTML=UI.barrasH(deps.map(function(d){ return {nome:LFI.dep(d).nome, valor:LFI.faturamento(p,[d]), cor:CORES_OP[d], id:d, sub:'anterior '+F.moedaK(LFI.faturamento(pa,[d]))}; }),{act:'opDet'});

  /* comparativo */
  var linhasOp=deps.map(function(d){ var f=LFI.faturamento(p,[d]), fa=LFI.faturamento(pa,[d]), t=tickets(p,[d]), e=LFI.empresaDoDep(d), c=f*LFI.cmvPct(d), i=f*e.impVenda/100; return {d:d, f:f, fa:fa, t:t, tm:t?f/t:0, cmv:LFI.cmvPct(d), mc:f-c-i, mcp:f?(f-c-i)/f:0, per:LFI.perdasProducao(p,[d]).total}; });
  el.querySelector('#i-ops').innerHTML='<div class="tb-wrap"><table class="tb cp"><thead><tr><th>Operação</th><th class="r">Faturamento</th><th class="r">Ticket</th><th class="r">Margem</th></tr></thead><tbody>'+linhasOp.map(function(l){ return '<tr class="cl" data-act="opDet" data-id="'+l.d+'"><td>'+UI.dep(l.d)+'<small>'+esc(LFI.empresaDoDep(l.d).fantasia)+'</small></td><td class="r"><b>'+F.moeda(l.f)+'</b><small>'+UI.variacao(l.f,l.fa)+'</small></td><td class="r">'+F.moeda(l.tm)+'<small>'+F.num(l.t,0)+' atend.</small></td><td class="r"><b>'+F.pct(l.mcp)+'</b><small>CMV '+F.pct(l.cmv)+'</small></td></tr>'; }).join('')+'</tbody></table></div>'+
    (linhasOp.length>1?'<div style="margin-top:12px">'+UI.barrasH(linhasOp.map(function(l){ return {nome:LFI.dep(l.d).curto+' · participação', valor:fat?l.f/fat*100:0, cor:CORES_OP[l.d], id:l.d}; }),{fmt:function(v){ return F.pctN(v,1); }, act:'opDet'})+'</div>':'');

  /* dia da semana */
  var nomesS=['dom','seg','ter','qua','qui','sex','sáb'], semV={}, semN={};
  deps.forEach(function(d){ semV[d]=[0,0,0,0,0,0,0]; semN[d]=[0,0,0,0,0,0,0]; });
  ds.forEach(function(d){ var w=new Date(d+'T12:00:00').getDay(); deps.forEach(function(x){ semN[x][w]++; }); });
  LFI.vendas(p,deps).forEach(function(v){ semV[v.dep][new Date(v.d+'T12:00:00').getDay()]+=v.valor; });
  UI.grafBarras(el.querySelector('#i-sem'),{cats:nomesS, altura:220, series:deps.map(function(d){ return {nome:LFI.dep(d).curto, cor:CORES_OP[d], valores:semV[d].map(function(v,i){ return semN[d][i]?v/semN[d][i]:0; })}; }), onClick:function(i){ detalheSemana(i, p, deps); }});

  /* categorias */
  var cats={}; LFI.vendas(p,deps).forEach(function(v){ for(var c in v.cats) cats[c]=(cats[c]||0)+v.cats[c]; });
  var cl=Object.keys(cats).sort(function(a,b){ return cats[b]-cats[a]; });
  UI.grafRosca(el.querySelector('#i-cat'),{itens:cl.slice(0,7).map(function(c,i){ return {nome:c, valor:cats[c], cor:UI.CORES[i%UI.CORES.length], id:c}; }), centro:{valor:F.moedaK(fat), rotulo:'no período'}, onClick:function(x){ detalheCategoria(x.id, p, deps); }});

  /* engenharia de cardápio (popularidade × margem) */
  var pv=LFI.produtosVendidos(p,deps), mediaQ=pv.length?soma(pv,function(x){ return x.receita; })/pv.length:0, mediaM=pv.length?soma(pv,function(x){ return x.mcPct; })/pv.length:0;
  var clas=function(x){ var pop=x.receita>=mediaQ*0.7, mg=x.mcPct>=mediaM; return pop&&mg?['Estrela','ok']:pop?['Popular, margem baixa','wt']:mg?['Rentável, pouco vendido','in']:['Revisar','no']; };
  var grupos={Estrela:0,'Popular, margem baixa':0,'Rentável, pouco vendido':0,Revisar:0}; pv.forEach(function(x){ grupos[clas(x)[0]]++; });
  el.querySelector('#i-me').innerHTML='<div class="rl-quad"><div style="background:var(--g-soft);color:var(--green)"><b>'+grupos.Estrela+'</b>Estrelas</div><div style="background:var(--a-soft);color:#946C00"><b>'+grupos['Popular, margem baixa']+'</b>Populares</div><div style="background:var(--b-soft);color:var(--blue)"><b>'+grupos['Rentável, pouco vendido']+'</b>Rentáveis</div><div style="background:var(--r-soft);color:var(--red)"><b>'+grupos.Revisar+'</b>Revisar</div></div>'+
    (pv.length?'<div class="rl-me">'+pv.slice().sort(function(a,b){ return b.mc-a.mc; }).slice(0,6).map(function(x){ var c=clas(x); return '<div class="it" data-act="prodDet" data-id="'+(x.rec||'')+'"><div class="gr"><b>'+esc(x.nome)+'</b><small>'+UI.dep(x.dep)+' · '+F.moedaK(x.receita)+'</small><div style="margin-top:3px">'+UI.badge(c[0],c[1])+'</div></div><div class="rt">'+F.pct(x.mcPct,0)+'<small>'+F.moedaK(x.mc)+'</small></div></div>'; }).join('')+'</div>':UI.vazio('Sem vendas no período'));

  /* CMV real × meta */
  UI.grafBarras(el.querySelector('#i-cmv'),{cats:deps.map(function(d){ return LFI.dep(d).curto; }), altura:200, fmt:function(v){ return F.pctN(v,1); }, fmtEixo:function(v){ return F.pctN(v,0); },
    series:[{nome:'CMV real', cor:'#FF5A00', valores:deps.map(function(d){ return LFI.cmvPct(d)*100; })},{nome:'Meta (1 ÷ markup padrão)', cor:'#1C1C1E', valores:deps.map(function(d){ return 100/((LFI.db.markup[d]||{padrao:3}).padrao); })}], onClick:function(){ LFI.ir('custos'); }});

  /* estoque por categoria e operação */
  var depsEst=s.op==='todas'?LFI.depIds():deps, porCat={};
  LFI.db.produtos.forEach(function(pr){ var v=LFI.valorEstoque(pr,depsEst); if(v>0) porCat[pr.cat]=(porCat[pr.cat]||0)+v; });
  var ec=Object.keys(porCat).sort(function(a,b){ return porCat[b]-porCat[a]; });
  el.querySelector('#i-est').innerHTML='<div id="i-est-r"></div><div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px">'+UI.barrasH(depsEst.map(function(d){ return {nome:LFI.dep(d).nome, valor:LFI.valorEstoqueTotal([d]), cor:CORES_OP[d], id:d}; }).filter(function(x){ return x.valor>0; }))+'</div>';
  UI.grafRosca(el.querySelector('#i-est-r'),{itens:ec.slice(0,6).map(function(c,i){ return {nome:LFI.cat(c).nome, valor:porCat[c], cor:UI.CORES[i%UI.CORES.length], id:c}; }), centro:{valor:F.moedaK(LFI.valorEstoqueTotal(depsEst)), rotulo:'em estoque'}, onClick:function(x){ detalheEstoqueCat(x.id, depsEst); }});

  /* abaixo do mínimo */
  var bx=LFI.alertas().filter(function(a){ return a.tipo==='critico'||a.tipo==='baixo'; });
  el.querySelector('#i-min').innerHTML = bx.length ? '<div class="rl-me">'+bx.slice(0,7).map(function(a){ var pr=LFI.prod(a.prod), q=LFI.estoqueGeral(pr), falta=Math.max(0,pr.estMin-q); return '<div class="it" data-act="_ir" data-id="estoque/'+pr.id+'"><div class="gr"><b>'+esc(pr.nome)+'</b><small>'+F.qtd(q,pr.un)+' de '+F.qtd(pr.estMin,pr.un)+'</small>'+UI.bar(q/pr.estMin, a.tipo==='critico'?'no':'wt')+'</div><div class="rt">'+F.moeda(falta*pr.custoMedio)+'<small>para repor</small></div></div>'; }).join('')+'</div>'+
    UI.nota('Reposição estimada até o mínimo: <b>'+F.moeda(soma(bx,function(a){ var pr=LFI.prod(a.prod); return Math.max(0,pr.estMin-LFI.estoqueGeral(pr))*pr.custoMedio; }))+'</b>.','in') : UI.vazio('Nenhum produto abaixo do mínimo','✅');

  /* compras */
  var cmp=LFI.comprasPeriodo(p), cmpCat={};
  LFI.db.notas.forEach(function(n){ if(n.status!=='lancada'||!LFI.empresaVisivel(n.empresa)) return; var d=n.entrada||n.emissao; if(d<p.de||d>p.ate) return; n.itens.forEach(function(it){ var pr=LFI.prod(it.prod); var c=pr?pr.cat:'mer'; cmpCat[c]=(cmpCat[c]||0)+it.vProd; }); });
  var listaC = s.cmp==='forn' ? Object.keys(cmp.porForn).map(function(f){ return {nome:LFI.forn(f).nome, valor:cmp.porForn[f], id:f, cor:'var(--roxo)'}; }) : Object.keys(cmpCat).map(function(c){ return {nome:LFI.cat(c).nome, valor:cmpCat[c], id:c, cor:'#1C1C1E'}; });
  listaC.sort(function(a,b){ return b.valor-a.valor; });
  el.querySelector('#i-cmp').innerHTML = listaC.length ? '<div class="lnr" style="padding-top:0"><span class="k">'+cmp.notas+' nota(s) lançada(s)</span><span class="v">'+F.moeda(cmp.total)+'</span></div><div style="margin-top:10px">'+UI.barrasH(listaC.slice(0,6),{act:s.cmp==='forn'?'fornDet':'cmpCat'})+'</div>' : UI.vazio('Nenhuma nota lançada no período');

  /* aging de contas a pagar */
  var faixas=[['Vencidas',-1e5,-1,'#DC2626','Vencidas'],['0–7 d',0,7,'#E9A80B','Vencem em até 7 dias'],['8–15 d',8,15,'#FF5A00','Vencem em 8 a 15 dias'],['16–30 d',16,30,'#1D4ED8','Vencem em 16 a 30 dias'],['+30 d',31,1e5,'#5E5E66','Vencem após 30 dias']];
  var hoje=LFI.hoje(), contas=LFI.db.contasPagar.filter(function(c){ return c.status!=='pago'&&LFI.empresaVisivel(c.empresa); });
  var dd=function(c){ return Math.round((new Date(c.venc+'T12:00:00')-new Date(hoje+'T12:00:00'))/864e5); };
  var fx=faixas.map(function(f){ var ls=contas.filter(function(c){ var n=dd(c); return n>=f[1]&&n<=f[2]; }); return {f:f, ls:ls, v:soma(ls,function(c){ return c.valor; })}; });
  el.querySelector('#i-cp').innerHTML='<div class="lnr" style="padding-top:0"><span class="k">'+contas.length+' título(s) em aberto</span><span class="v">'+F.moeda(soma(contas,function(c){ return c.valor; }))+'</span></div><div id="i-cp-g"></div>';
  UI.grafBarras(el.querySelector('#i-cp-g'),{cats:faixas.map(function(f){ return f[0]; }), titulosTip:faixas.map(function(f){ return f[4]; }), altura:200, series:[{nome:'Valor', cor:'#FF5A00', cores:faixas.map(function(f){ return f[3]; }), valores:fx.map(function(x){ return x.v; })}], onClick:function(i){ detalheContas(fx[i].f[4], fx[i].ls); }});

  /* perdas */
  var pd=perdasDet(p,deps).filter(function(x){ return x.perda; }), porO={'Perda técnica (produção)':0,'Estoque (avarias e validade)':0,'Buffet (descarte)':0};
  pd.forEach(function(x){ var k=x.tipo==='Perda técnica'?'Perda técnica (produção)':x.origem==='Estoque'?'Estoque (avarias e validade)':'Buffet (descarte)'; porO[k]+=x.valor; });
  var top=pd.slice().sort(function(a,b){ return b.valor-a.valor; }).slice(0,4);
  el.querySelector('#i-per').innerHTML=UI.barrasH(Object.keys(porO).map(function(k,i){ return {nome:k, valor:porO[k], cor:['#B08A00','#DC2626','#C2185B'][i], id:'perdas'}; }),{act:'perdasRel'})+
    (top.length?'<div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px"><div style="font-size:10.5px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Maiores ocorrências</div>'+top.map(function(x){ return '<div class="lnr"><span class="k">'+esc(x.item)+' <small style="color:var(--muted)">· '+esc(x.origem)+'</small></span><span class="v">'+F.moeda(x.valor)+'</span></div>'; }).join('')+'</div>':UI.vazio('Sem perdas no período','✅'));

  /* margem por categoria de produto */
  var mcCat={}; pv.forEach(function(x){ var k=catVenda(x)+'|'+x.dep, o=mcCat[k]=mcCat[k]||{nome:catVenda(x), dep:x.dep, mc:0, rec:0}; o.mc+=x.mc; o.rec+=x.receita; });
  var mcl=Object.keys(mcCat).map(function(k){ var o=mcCat[k]; return {nome:o.nome, valor:o.mc, cor:CORES_OP[o.dep], sub:LFI.dep(o.dep).curto+' · '+F.pct(o.rec?o.mc/o.rec:0,0), id:'rentabilidade'}; }).sort(function(a,b){ return b.valor-a.valor; }).slice(0,8);
  el.querySelector('#i-mc').innerHTML=mcl.length?UI.barrasH(mcl,{act:'mcRel'}):UI.vazio('Sem vendas no período');

  /* carga tributária por categoria */
  var tc={}; LFI.db.produtos.forEach(function(pr){ var c=LFI.cargaEstimada(pr); if(c.pct==null) return; var v=LFI.valorEstoque(pr, LFI.depIds()); if(v<=0) return; var o=tc[pr.cat]=tc[pr.cat]||{b:0,i:0}; o.b+=v; o.i+=v*c.pct/100; });
  var tl=Object.keys(tc).map(function(c){ return {nome:LFI.cat(c).nome, valor:tc[c].b?tc[c].i/tc[c].b*100:0, sub:F.moedaK(tc[c].i)+' estimado', id:c, cor:'#1C1C1E'}; }).sort(function(a,b){ return b.valor-a.valor; }).slice(0,8);
  el.querySelector('#i-trib').innerHTML=UI.barrasH(tl,{fmt:function(v){ return F.pctN(v,1); }, act:'tribDet'})+'<div class="nota" style="margin:12px 0 0;font-size:11.5px">'+UI.ic('info')+'<div>Somente regras validadas. Percentuais da base de demonstração são exemplos sujeitos à validação fiscal.</div></div>';

  ligaFiltros(H, s, '');
  H.cmp=function(id){ s.cmp=id; LFI.recarregar(); };
  H.kTk=function(){ detalheTicket(p, pa, deps); };
  H.opDet=function(id){ detalheOp(id, p, pa); };
  H.prodDet=function(id){ if(id) LFI.ir('receitas', id); else UI.toast('Item sem ficha técnica','Revenda ou buffet por quilo: custo pelo último preço de compra','in'); };
  H.fornDet=function(id){ detalheForn(id, p); };
  H.cmpCat=function(){ LFI.ir('relatorios','compras'); };
  H.perdasRel=function(){ LFI.ir('relatorios','perdas'); };
  H.mcRel=function(){ LFI.ir('relatorios','rentabilidade'); };
  H.tribDet=function(id){ LFI.estado.tributos=LFI.estado.tributos||{}; LFI.estado.tributos.cat=id; LFI.ir('tributos'); };
}

/* ---------- detalhamentos ---------- */
function detalheDia(d, deps){
  var vs=LFI.db.vendas.filter(function(v){ return v.d===d&&deps.indexOf(v.dep)>=0; }), tot=soma(vs,function(v){ return v.valor; }), tk=soma(vs,function(v){ return v.tickets; });
  var h='<div class="kpis k3">'+UI.kpi({lb:'Faturamento', vl:F.moeda(tot)})+UI.kpi({lb:'Atendimentos', vl:F.num(tk,0)})+UI.kpi({lb:'Ticket médio', vl:F.moeda(tk?tot/tk:0)})+'</div>';
  vs.forEach(function(v){ h+='<div class="card flat" style="margin-top:10px"><h3 style="margin-bottom:8px">'+UI.dep(v.dep)+'<small>'+F.moeda(v.valor)+' · '+v.tickets+' atendimentos · ticket '+F.moeda(v.tickets?v.valor/v.tickets:0)+'</small></h3>'+Object.keys(v.cats).map(function(c){ return '<div class="lnr"><span class="k">'+esc(c)+'</span><span class="v">'+F.moeda(v.cats[c])+'</span></div>'; }).join('')+'</div>'; });
  UI.modal({titulo:'Faturamento de '+F.diaSemana(d)+', '+F.data(d), sub:'Por operação e categoria', corpo:vs.length?h:UI.vazio('Sem vendas neste dia')});
}
function detalheSemana(w, p, deps){
  var nomes=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
  var vs=LFI.vendas(p,deps).filter(function(v){ return new Date(v.d+'T12:00:00').getDay()===w; });
  var m=UI.modal({titulo:'Vendas às '+nomes[w]+'s', sub:esc(p.nome)+' · '+vs.length+' registro(s)', tam:'lg', corpo:'<div id="ds-t"></div>'});
  UI.tabela(m.corpo.querySelector('#ds-t'),{linhas:vs, ordem:0, dir:-1, vazio:'Sem vendas neste dia da semana (a operação pode não abrir).', linhaId:function(v){ return v.d; }, colunas:[
    {t:'Data', v:function(v){ return F.data(v.d); }, ord:function(v){ return v.d; }},
    {t:'Operação', v:function(v){ return UI.dep(v.dep); }, ord:function(v){ return v.dep; }},
    {t:'Atendimentos', r:true, v:function(v){ return F.num(v.tickets,0); }, ord:function(v){ return v.tickets; }},
    {t:'Ticket médio', r:true, v:function(v){ return F.moeda(v.tickets?v.valor/v.tickets:0); }, ord:function(v){ return v.tickets?v.valor/v.tickets:0; }},
    {t:'Faturamento', r:true, v:function(v){ return '<b>'+F.moeda(v.valor)+'</b>'; }, ord:function(v){ return v.valor; }}]});
}
function detalheCategoria(cat, p, deps){
  var ds=dias(p), ser={}; deps.forEach(function(d){ ser[d]=ds.map(function(){ return 0; }); });
  LFI.vendas(p,deps).forEach(function(v){ if(v.cats[cat]) ser[v.dep][ds.indexOf(v.d)]+=v.cats[cat]; });
  var ativos=deps.filter(function(d){ return soma(ser[d])>0; }), tot=soma(ativos,function(d){ return soma(ser[d]); });
  var m=UI.modal({titulo:esc(cat), sub:'Tendência diária por operação · '+esc(p.nome), tam:'lg', corpo:'<div class="kpis k3">'+UI.kpi({lb:'Total', vl:F.moeda(tot)})+UI.kpi({lb:'Média diária', vl:F.moeda(tot/Math.max(1,ds.length))})+UI.kpi({lb:'Operações', vl:String(ativos.length), dl:ativos.map(function(d){ return LFI.dep(d).curto; }).join(', ')})+'</div><div id="dc-g"></div>'});
  setTimeout(function(){ var g=m.corpo.querySelector('#dc-g'); if(ds.length>1) UI.grafLinhas(g,{cats:ds.map(F.dataC), altura:230, area:ativos.length===1, series:ativos.map(function(d){ return {nome:LFI.dep(d).curto, cor:CORES_OP[d], valores:ser[d]}; })}); else g.innerHTML=UI.barrasH(ativos.map(function(d){ return {nome:LFI.dep(d).nome, valor:ser[d][0], cor:CORES_OP[d]}; })); },30);
}
function detalheTicket(p, pa, deps){
  var h='<div class="tb-wrap"><table class="tb"><thead><tr><th>Operação</th><th class="r">Atendimentos</th><th class="r">Ticket atual</th><th class="r">Ticket anterior</th><th class="r">Variação</th></tr></thead><tbody>'+deps.map(function(d){ var f=LFI.faturamento(p,[d]), t=tickets(p,[d]), fa=LFI.faturamento(pa,[d]), ta=tickets(pa,[d]); return '<tr><td>'+UI.dep(d)+'</td><td class="r">'+F.num(t,0)+'</td><td class="r"><b>'+F.moeda(t?f/t:0)+'</b></td><td class="r">'+F.moeda(ta?fa/ta:0)+'</td><td class="r">'+UI.variacao(t?f/t:0, ta?fa/ta:0)+'</td></tr>'; }).join('')+'</tbody></table></div>'+
    UI.nota('Ticket médio = faturamento ÷ atendimentos registrados no PDV de cada operação. O sushi tem ticket maior pelo buffet por quilo; a padaria, pelo maior número de atendimentos.','in');
  UI.modal({titulo:'Ticket médio por operação', sub:esc(p.nome)+' × período anterior', tam:'lg', corpo:h});
}
function detalheOp(dep, p, pa){
  var d=LFI.dep(dep), e=LFI.empresaDoDep(dep), cats={}, catsA={};
  LFI.vendas(p,[dep]).forEach(function(v){ for(var c in v.cats) cats[c]=(cats[c]||0)+v.cats[c]; });
  LFI.vendas(pa,[dep]).forEach(function(v){ for(var c in v.cats) catsA[c]=(catsA[c]||0)+v.cats[c]; });
  var pv=LFI.produtosVendidos(p,[dep]).sort(function(a,b){ return b.receita-a.receita; });
  var corpo='<div class="kpis">'+UI.kpi({lb:'Faturamento', vl:F.moeda(LFI.faturamento(p,[dep])), dl:UI.variacao(LFI.faturamento(p,[dep]),LFI.faturamento(pa,[dep]))})+UI.kpi({lb:'Atendimentos', vl:F.num(tickets(p,[dep]),0)})+UI.kpi({lb:'CMV', vl:F.pct(LFI.cmvPct(dep))})+UI.kpi({lb:'Perdas', vl:F.moeda(LFI.perdasProducao(p,[dep]).total)})+'</div>'+
    '<div class="grid g2"><div class="card flat" style="margin:0"><h3>Categorias</h3>'+Object.keys(cats).sort(function(a,b){ return cats[b]-cats[a]; }).map(function(c){ return '<div class="lnr"><span class="k">'+esc(c)+'</span><span class="v">'+F.moeda(cats[c])+' '+UI.variacao(cats[c],catsA[c])+'</span></div>'; }).join('')+'</div>'+
    '<div class="card flat" style="margin:0"><h3>Produtos</h3>'+pv.slice(0,7).map(function(x){ return '<div class="lnr"><span class="k">'+esc(x.nome)+' <small style="color:var(--muted)">'+F.num(x.qtd,0)+' un</small></span><span class="v">'+F.moeda(x.receita)+'<small style="display:block;color:var(--muted);font-size:11px">margem '+F.pct(x.mcPct,0)+'</small></span></div>'; }).join('')+'</div></div>';
  UI.modal({titulo:esc(d.nome), sub:esc(e.fantasia)+' · '+esc(e.regime)+' · '+esc(p.nome), tam:'lg', corpo:corpo});
}
function detalheEstoqueCat(cat, deps){
  var ps=LFI.db.produtos.filter(function(p){ return p.cat===cat&&LFI.valorEstoque(p,deps)>0; });
  var m=UI.modal({titulo:'Estoque · '+esc(LFI.cat(cat).nome), sub:ps.length+' produto(s) · ao custo médio', tam:'lg', corpo:'<div id="de-t"></div>'});
  UI.tabela(m.corpo.querySelector('#de-t'),{linhas:ps, linhaAct:'p', ordem:3, colunas:[
    {t:'Produto', v:function(p){ return '<b>'+esc(p.nome)+'</b><small>'+esc(p.local)+'</small>'; }, ord:function(p){ return p.nome; }},
    {t:'Estoque', r:true, v:function(p){ return F.qtd(LFI.estoque(p,deps),p.un); }, ord:function(p){ return LFI.estoque(p,deps); }},
    {t:'Situação', v:function(p){ return UI.situacao(p); }, ord:function(p){ return LFI.situacao(p); }},
    {t:'Valor', r:true, v:function(p){ return '<b>'+F.moeda(LFI.valorEstoque(p,deps))+'</b>'; }, ord:function(p){ return LFI.valorEstoque(p,deps); }}]});
  UI.liga(m.corpo,{p:function(id){ m.fechar(); LFI.ir('estoque', id); }});
}
function detalheContas(nome, ls){
  var m=UI.modal({titulo:'Contas a pagar · '+esc(nome), sub:ls.length+' título(s) · '+F.moeda(soma(ls,function(c){ return c.valor; })), tam:'lg', corpo:'<div id="dcp-t"></div>'});
  UI.tabela(m.corpo.querySelector('#dcp-t'),{linhas:ls, ordem:2, dir:1, vazio:'Nenhum título nesta faixa', colunas:[
    {t:'Fornecedor', v:function(c){ return '<b>'+esc(LFI.forn(c.forn).nome)+'</b><small>'+esc(c.descricao)+'</small>'; }, ord:function(c){ return LFI.forn(c.forn).nome; }},
    {t:'Empresa', v:function(c){ return UI.empTag(c.empresa); }, ord:function(c){ return c.empresa; }},
    {t:'Vencimento', v:function(c){ return F.data(c.venc)+'<small>'+F.relativo(c.venc)+'</small>'; }, ord:function(c){ return c.venc; }},
    {t:'Valor', r:true, v:function(c){ return '<b>'+F.moeda(c.valor)+'</b>'; }, ord:function(c){ return c.valor; }},
    {t:'Origem', v:function(c){ return c.nf?'<a class="vertodos" data-act="nf" data-id="'+c.nf+'">Ver nota</a>':'<span class="tag">Boleto avulso</span>'; }, ord:false}]});
  UI.liga(m.corpo,{nf:function(id){ m.fechar(); LFI.ir('notas', id); }});
}
function detalheForn(id, p){
  var f=LFI.forn(id), ns=LFI.db.notas.filter(function(n){ var d=n.entrada||n.emissao; return n.forn===id&&n.status==='lancada'&&LFI.empresaVisivel(n.empresa)&&d>=p.de&&d<=p.ate; });
  var m=UI.modal({titulo:esc(f.nome), sub:'Notas lançadas · '+esc(p.nome), tam:'lg', corpo:'<div id="df-t"></div>', botoes:'<button class="btn sec" data-act="_fechar">Fechar</button><button class="btn pri" data-act="fo">Abrir fornecedor</button>', acoes:{fo:function(){ m.fechar(); LFI.ir('fornecedores', id); }}});
  UI.tabela(m.corpo.querySelector('#df-t'),{linhas:ns, linhaAct:'n', colunas:[
    {t:'Nota', v:function(n){ return '<b>NF '+esc(n.numero)+'</b><small>'+n.itens.length+' itens</small>'; }, ord:function(n){ return n.numero; }},
    {t:'Entrada', v:function(n){ return F.data(n.entrada||n.emissao); }, ord:function(n){ return n.entrada||n.emissao; }},
    {t:'Empresa', v:function(n){ return UI.empTag(n.empresa); }, ord:function(n){ return n.empresa; }},
    {t:'Valor', r:true, v:function(n){ return '<b>'+F.moeda(n.valor)+'</b>'; }, ord:function(n){ return n.valor; }}]});
  UI.liga(m.corpo,{n:function(nid){ m.fechar(); LFI.ir('notas', nid); }});
}

/* ================= RELATÓRIOS ================= */
/* cada gerador devolve {resumo:[[rótulo, valor formatado]], cols:[{t, tp}], rows:[[valores brutos]], tot:[...]|null, nota} */
var LISTA=[
  {id:'estoque', nome:'Posição de estoque', desc:'Saldo por produto, mínimo, situação e valor ao custo médio.', grupo:'Estoque e compras', ic:'estoque', per:false, op:true, gera:gEstoque},
  {id:'compras', nome:'Histórico de compras', desc:'Itens das notas fiscais lançadas, com quantidade e custo unitário.', grupo:'Estoque e compras', ic:'nota', per:true, op:true, gera:gCompras},
  {id:'fornecedores', nome:'Comparativo de fornecedores', desc:'Volume comprado, competitividade nas cotações, prazo e qualidade.', grupo:'Estoque e compras', ic:'fornecedor', per:true, op:false, gera:gFornecedores},
  {id:'ordens', nome:'Ordens de compra', desc:'OCs emitidas, status, valor e percentual recebido.', grupo:'Estoque e compras', ic:'ordem', per:true, op:true, gera:gOrdens},
  {id:'custos_prod', nome:'Custos por produto', desc:'Custo médio, último custo e variação em 6 meses dos insumos.', grupo:'Custos e rentabilidade', ic:'custos', per:false, op:false, gera:gCustosProd},
  {id:'custos_rec', nome:'Custos por receita', desc:'Custo por porção e por kg, markup, preço sugerido e CMV.', grupo:'Custos e rentabilidade', ic:'receita', per:false, op:true, gera:gCustosRec},
  {id:'fichas', nome:'Fichas técnicas', desc:'Ingredientes de cada receita com quantidade, custo e participação.', grupo:'Custos e rentabilidade', ic:'lista', per:false, op:true, gera:gFichas},
  {id:'rentabilidade', nome:'Rentabilidade por categoria', desc:'Faturamento, CMV, impostos e margem por categoria de produto.', grupo:'Custos e rentabilidade', ic:'relatorio', per:true, op:true, gera:gRentab},
  {id:'carga', nome:'Carga tributária', desc:'Carga estimada por categoria, destacado em nota e crédito potencial.', grupo:'Tributos', ic:'tributo', per:false, op:false, gera:gCarga},
  {id:'producao', nome:'Produção', desc:'Ordens de produção, custo dos ingredientes e perda técnica.', grupo:'Operação', ic:'producao', per:true, op:true, gera:gProducao},
  {id:'buffet', nome:'Consumo do buffet', desc:'Pesagens de abertura, reposições, sobras e consumo por item.', grupo:'Operação', ic:'buffet', per:true, op:false, gera:gBuffet},
  {id:'perdas', nome:'Sobras e perdas', desc:'Perdas de estoque, descarte e reaproveitamento do buffet e perda técnica.', grupo:'Operação', ic:'alerta', per:true, op:true, gera:gPerdas},
  {id:'vendidos', nome:'Produtos mais vendidos', desc:'Ranking por faturamento com quantidade, custo e margem.', grupo:'Vendas', ic:'estrela', per:true, op:true, gera:gVendidos}
];
var REL={}; LISTA.forEach(function(r){ REL[r.id]=r; });

function gEstoque(f){
  var deps=f.op==='todas'?LFI.depIds():[f.op], ps=LFI.db.produtos.filter(function(p){ return LFI.estoque(p,deps)!==0||(p.tipo==='insumo'&&deps.some(function(d){ return d in p.est; })); });
  var sit={critico:'Crítico', baixo:'Baixo', excesso:'Excesso', ok:'Normal'};
  var rows=ps.map(function(p){ return [p.nome, LFI.cat(p.cat).nome, p.un, LFI.estoque(p,deps), p.estMin, sit[LFI.situacao(p)], p.custoMedio, LFI.valorEstoque(p,deps)]; }).sort(function(a,b){ return b[7]-a[7]; });
  var tot=soma(rows,function(r){ return r[7]; });
  return {resumo:[['Itens',F.num(rows.length,0)],['Valor em estoque',F.moeda(tot)],['Abaixo do mínimo',String(ps.filter(function(p){ var s=LFI.situacao(p); return s==='baixo'||s==='critico'; }).length)],['Críticos',String(ps.filter(function(p){ return LFI.situacao(p)==='critico'; }).length)]],
    cols:[{t:'Produto'},{t:'Categoria'},{t:'Un'},{t:'Estoque',tp:'qtd'},{t:'Mínimo',tp:'qtd'},{t:'Situação',tp:'sit'},{t:'Custo médio',tp:'moeda'},{t:'Valor',tp:'moeda'}], rows:rows, tot:['Total','','','','','','',tot],
    nota:'Situação calculada sobre o estoque total do grupo frente ao mínimo cadastrado. Valores ao custo médio ponderado atualizado pelas notas fiscais.'};
}
function gCompras(f){
  var p=f.p, rows=[];
  LFI.db.notas.forEach(function(n){ if(n.status!=='lancada'||!LFI.empresaVisivel(n.empresa)) return; var d=n.entrada||n.emissao; if(d<p.de||d>p.ate) return; if(f.op!=='todas'&&n.dep!==f.op) return;
    n.itens.forEach(function(it){ var pr=LFI.prod(it.prod), q=it.qtd*it.fator; rows.push([d, 'NF '+n.numero, LFI.forn(n.forn).nome, LFI.emp(n.empresa).fantasia, pr?pr.nome:it.desc, r2(q*1000)/1000, pr?pr.un:it.un, q?r2(it.vProd/q):0, it.vProd]); }); });
  rows.sort(function(a,b){ return a[0]<b[0]?1:-1; });
  var tot=soma(rows,function(r){ return r[8]; }), nfs={}, fs={}; rows.forEach(function(r){ nfs[r[1]]=1; fs[r[2]]=1; });
  return {resumo:[['Notas',String(Object.keys(nfs).length)],['Fornecedores',String(Object.keys(fs).length)],['Itens comprados',String(rows.length)],['Total em produtos',F.moeda(tot)]],
    cols:[{t:'Entrada',tp:'data'},{t:'Nota'},{t:'Fornecedor'},{t:'Empresa'},{t:'Produto'},{t:'Quantidade',tp:'qtd'},{t:'Un'},{t:'Custo unit.',tp:'moeda'},{t:'Valor',tp:'moeda'}], rows:rows, tot:['Total','','','','','','','',tot],
    nota:f.op!=='todas'?'Filtrado pelas notas com entrada na operação '+LFI.dep(f.op).nome+'. Compras do estoque central aparecem em "Todas as operações".':'Inclui todas as notas lançadas da empresa selecionada no topo.'};
}
function gFornecedores(f){
  var p=f.p, c=LFI.comprasPeriodo(p), ganhos={}, props={}, itensCot={};
  LFI.db.cotacoes.forEach(function(ct){ if(!LFI.empresaVisivel(ct.empresa)) return;
    ct.itens.forEach(function(i){ var melhor=null; ct.propostas.forEach(function(pp){ var x=pp.itens.filter(function(y){ return y.prod===i.prod&&y.preco>0; })[0]; if(!x) return; itensCot[pp.forn]=(itensCot[pp.forn]||0)+1; if(!melhor||x.preco<melhor.preco) melhor={forn:pp.forn, preco:x.preco}; }); if(melhor) ganhos[melhor.forn]=(ganhos[melhor.forn]||0)+1; });
    ct.propostas.forEach(function(pp){ props[pp.forn]=(props[pp.forn]||0)+1; }); });
  var nNotas={}; LFI.db.notas.forEach(function(n){ var d=n.entrada||n.emissao; if(n.status==='lancada'&&LFI.empresaVisivel(n.empresa)&&d>=p.de&&d<=p.ate) nNotas[n.forn]=(nNotas[n.forn]||0)+1; });
  var rows=LFI.db.fornecedores.map(function(fo){ return [fo.nome, fo.cidade+'/'+fo.uf, c.porForn[fo.id]||0, nNotas[fo.id]||0, props[fo.id]||0, itensCot[fo.id]?(ganhos[fo.id]||0)/itensCot[fo.id]:0, fo.prazo, fo.cond, fo.pontualidade/100, fo.qualidade]; }).sort(function(a,b){ return b[2]-a[2]; });
  var top=rows[0];
  return {resumo:[['Fornecedores',String(rows.length)],['Com compras no período',String(rows.filter(function(r){ return r[2]>0; }).length)],['Total comprado',F.moeda(c.total)],['Maior fornecedor',top&&top[2]?top[0]:'—']],
    cols:[{t:'Fornecedor'},{t:'Cidade'},{t:'Compras',tp:'moeda'},{t:'Notas',tp:'int'},{t:'Propostas',tp:'int'},{t:'Menor preço',tp:'pct'},{t:'Prazo (dias)',tp:'int'},{t:'Condição'},{t:'Pontualidade',tp:'pct'},{t:'Qualidade',tp:'int'}], rows:rows, tot:['Total','',c.total,'','','','','','',''],
    nota:'"Menor preço" = percentual dos itens cotados em que o fornecedor ofereceu o melhor preço, considerando todas as cotações da empresa selecionada.'};
}
function gOrdens(f){
  var p=f.p, ls=LFI.db.ordens.filter(function(o){ return LFI.empresaVisivel(o.empresa)&&o.emissao>=p.de&&o.emissao<=p.ate&&(f.op==='todas'||o.dep===f.op); });
  var rows=ls.map(function(o){ var tq=soma(o.itens,function(i){ return i.qtd*i.preco; }), rq=soma(o.itens,function(i){ return i.recebido*i.preco; }); return [o.num, LFI.forn(o.forn).nome, LFI.emp(o.empresa).fantasia, o.emissao, o.previsao, LFI.STATUS.oc[o.status][0], o.itens.length, LFI.totalOrdem(o), tq?rq/tq:0]; });
  var tot=soma(rows,function(r){ return r[7]; });
  return {resumo:[['Ordens',String(rows.length)],['Valor total',F.moeda(tot)],['Aguardando aprovação',String(ls.filter(function(o){ return o.status==='aguardando_aprovacao'; }).length)],['Recebidas',String(ls.filter(function(o){ return o.status==='recebida'; }).length)]],
    cols:[{t:'OC'},{t:'Fornecedor'},{t:'Empresa'},{t:'Emissão',tp:'data'},{t:'Previsão',tp:'data'},{t:'Status'},{t:'Itens',tp:'int'},{t:'Valor',tp:'moeda'},{t:'Recebido',tp:'pct'}], rows:rows, tot:['Total','','','','','','',tot,''], nota:'Recebido = valor dos itens já entregues ÷ valor da ordem.'};
}
function gCustosProd(){
  var rows=LFI.db.produtos.filter(function(p){ return p.tipo==='insumo'; }).map(function(p){ var h0=p.hist[0]?p.hist[0].v:p.custoMedio; return [p.nome, LFI.cat(p.cat).nome, p.un, p.custoMedio, p.ultimoCusto, p.custoMedio?p.ultimoCusto/p.custoMedio-1:0, h0, h0?p.custoMedio/h0-1:0, LFI.receitasComProduto(p.id).length, LFI.estoque(p,LFI.depIds()), LFI.valorEstoque(p,LFI.depIds())]; }).sort(function(a,b){ return b[7]-a[7]; });
  return {resumo:[['Insumos',String(rows.length)],['Alta média em 6 meses',F.pct(rows.length?soma(rows,function(r){ return r[7]; })/rows.length:0)],['Último custo acima do médio',String(rows.filter(function(r){ return r[5]>0.005; }).length)],['Valor em estoque',F.moeda(soma(rows,function(r){ return r[10]; }))]],
    cols:[{t:'Insumo'},{t:'Categoria'},{t:'Un'},{t:'Custo médio',tp:'moeda'},{t:'Último custo',tp:'moeda'},{t:'Último × médio',tp:'pctv'},{t:'Custo há 6 meses',tp:'moeda'},{t:'Variação 6 meses',tp:'pctv'},{t:'Receitas',tp:'int'},{t:'Estoque',tp:'qtd'},{t:'Valor',tp:'moeda'}], rows:rows, tot:null, nota:'Custo médio ponderado atualizado a cada nota lançada; o último custo é o da entrada mais recente.'};
}
function gCustosRec(f){
  var rows=LFI.db.receitas.filter(function(r){ return LFI.depVisivel(r.dep)&&(f.op==='todas'||r.dep===f.op); }).map(function(r){ var c=LFI.custoReceita(r), bb=r.buffet&&!r.preco, pr=bb?LFI.precificar(r,{preco:LFI.db.buffetPrecoKg}):LFI.precificar(r); return [r.nome, LFI.dep(r.dep).nome, r.cat, r.rend+' '+r.rendUn, c.total, c.porcao, c.porKg, pr.markup, pr.sugerido, bb?null:r.preco, pr.cmvPct, pr.mc]; });
  return {resumo:[['Receitas',String(rows.length)],['CMV médio',F.pct(rows.length?soma(rows,function(r){ return r[10]; })/rows.length:0)],['Abaixo do sugerido',String(rows.filter(function(r){ return r[9]!=null&&r[9]<r[8]*0.98; }).length)],['Custo total das fichas',F.moeda(soma(rows,function(r){ return r[4]; }))]],
    cols:[{t:'Receita'},{t:'Operação'},{t:'Categoria'},{t:'Rendimento'},{t:'Custo total',tp:'moeda'},{t:'Custo/porção',tp:'moeda'},{t:'Custo/kg',tp:'moeda'},{t:'Markup',tp:'num2'},{t:'Sugerido',tp:'moeda'},{t:'Preço atual',tp:'moeda'},{t:'CMV',tp:'pct'},{t:'Margem',tp:'moeda'}], rows:rows, tot:null,
    nota:'Componentes do buffet (sem preço próprio) são comparados ao preço do buffet por quilo ('+F.moeda(LFI.db.buffetPrecoKg)+'). Markup configurável em Custos e Precificação.'};
}
function gFichas(f){
  var rows=[];
  LFI.db.receitas.filter(function(r){ return LFI.depVisivel(r.dep)&&(f.op==='todas'||r.dep===f.op); }).forEach(function(r){ LFI.custoReceita(r).itens.forEach(function(i){ rows.push([r.nome, LFI.dep(r.dep).curto, i.prod.nome, i.qtd, i.un, i.custoUn, i.custo, i.part]); }); });
  return {resumo:[['Receitas',String(LFI.db.receitas.filter(function(r){ return LFI.depVisivel(r.dep)&&(f.op==='todas'||r.dep===f.op); }).length)],['Linhas de ingredientes',String(rows.length)],['Custo dos ingredientes',F.moeda(soma(rows,function(r){ return r[6]; }))]],
    cols:[{t:'Receita'},{t:'Operação'},{t:'Ingrediente'},{t:'Qtd',tp:'num3'},{t:'Un'},{t:'Custo unit. (base)',tp:'moeda'},{t:'Custo',tp:'moeda'},{t:'Part. no custo',tp:'pct'}], rows:rows, tot:null, nota:'Custo antes da perda técnica de cada ficha. Custo unitário na unidade base do produto (kg, L ou un).'};
}
function gRentab(f){
  var pv=LFI.produtosVendidos(f.p, depsDe(f.op)), g={};
  pv.forEach(function(x){ var e=LFI.empresaDoDep(x.dep), k=x.dep+'|'+catVenda(x), o=g[k]=g[k]||{dep:x.dep, cat:catVenda(x), n:0, rec:0, cmv:0, imp:0, mc:0}; o.n++; o.rec+=x.receita; o.cmv+=x.qtd*x.custo; o.imp+=x.receita*e.impVenda/100; o.mc+=x.mc; });
  var tot=soma(Object.keys(g),function(k){ return g[k].rec; });
  var rows=Object.keys(g).map(function(k){ var o=g[k]; return [LFI.dep(o.dep).nome, o.cat, o.n, o.rec, o.cmv, o.imp, o.mc, o.rec?o.mc/o.rec:0, tot?o.rec/tot:0]; }).sort(function(a,b){ return b[6]-a[6]; });
  var T=[0,0,0,0]; rows.forEach(function(r){ T[0]+=r[3]; T[1]+=r[4]; T[2]+=r[5]; T[3]+=r[6]; });
  return {resumo:[['Faturamento',F.moeda(T[0])],['CMV',F.moeda(T[1])],['Margem de contribuição',F.moeda(T[3])],['Margem %',F.pct(T[0]?T[3]/T[0]:0)]],
    cols:[{t:'Operação'},{t:'Categoria'},{t:'Itens',tp:'int'},{t:'Faturamento',tp:'moeda'},{t:'CMV',tp:'moeda'},{t:'Impostos',tp:'moeda'},{t:'Margem',tp:'moeda'},{t:'Margem %',tp:'pct'},{t:'Participação',tp:'pct'}], rows:rows, tot:['Total','','',T[0],T[1],T[2],T[3],T[0]?T[3]/T[0]:0,1],
    nota:'Faturamento distribuído pelo mix de vendas de cada operação; CMV pelas fichas técnicas atualizadas; impostos pela alíquota efetiva de cada CNPJ.'};
}
function gCarga(){
  var cp={}; LFI.db.notas.forEach(function(n){ if(n.status!=='lancada'||!LFI.empresaVisivel(n.empresa)) return; n.itens.forEach(function(it){ if(it.prod) cp[it.prod]=(cp[it.prod]||0)+it.vProd; }); });
  var dest=LFI.impostosDestacados(), g={};
  LFI.db.produtos.forEach(function(p){ if(p.tipo==='sobra') return; var o=g[p.cat]=g[p.cat]||{be:0,bc:0,cob:0,icms:0,pis:0,cofins:0,ipi:0,dest:0,cred:0,sem:0}, c=LFI.cargaEstimada(p), v=LFI.valorEstoque(p,LFI.depIds()), d=dest[p.id];
    o.be+=v; o.bc+=cp[p.id]||0; if(d){ o.dest+=d.icms+d.ipi+d.pis+d.cofins+d.st; o.cred+=d.cred; }
    if(c.pct==null){ o.sem++; return; } o.cob+=v; o.icms+=v*c.icms/100; o.pis+=v*c.pis/100; o.cofins+=v*c.cofins/100; o.ipi+=v*c.ipi/100; });
  var rows=Object.keys(g).map(function(k){ var o=g[k], imp=o.icms+o.pis+o.cofins+o.ipi; return [LFI.cat(k).nome, o.be, o.bc, o.cob?imp/o.cob:null, o.icms, o.pis, o.cofins, o.ipi, o.dest, o.cred, o.sem]; }).filter(function(r){ return r[1]>0||r[2]>0; }).sort(function(a,b){ return (b[3]||-1)-(a[3]||-1); });
  var T=[1,2,4,5,6,7,8,9].map(function(i){ return soma(rows,function(r){ return r[i]||0; }); });
  return {resumo:[['Base em estoque',F.moeda(T[0])],['Imposto estimado',F.moeda(T[2]+T[3]+T[4]+T[5])],['Destacado nas notas',F.moeda(T[6])],['Crédito potencial',F.moeda(T[7])]],
    cols:[{t:'Categoria'},{t:'Base estoque',tp:'moeda'},{t:'Compras (NF)',tp:'moeda'},{t:'Carga estimada',tp:'pct'},{t:'ICMS est.',tp:'moeda'},{t:'PIS est.',tp:'moeda'},{t:'COFINS est.',tp:'moeda'},{t:'IPI est.',tp:'moeda'},{t:'Destacado (NF)',tp:'moeda'},{t:'Crédito potencial',tp:'moeda'},{t:'Sem regra validada',tp:'int'}], rows:rows,
    tot:['Total',T[0],T[1],null,T[2],T[3],T[4],T[5],T[6],T[7],soma(rows,function(r){ return r[10]; })],
    nota:'<b>Atenção:</b> dados configuráveis e sujeitos à validação fiscal. Percentuais da base de demonstração são exemplos; regras pendentes não entram na estimativa. Destacado = valores reais das notas; crédito potencial = somente regras validadas e creditáveis (Simples Nacional não toma crédito de PIS/COFINS).'};
}
function gProducao(f){
  var p=f.p, ls=LFI.db.producao.filter(function(o){ return o.data>=p.de&&o.data<=p.ate&&depsDe(f.op).indexOf(o.dep)>=0; });
  var rows=ls.map(function(o){ var r=LFI.rec(o.rec), c=LFI.custoReceita(r), lotes=o.qtd/r.rend, ct=c.total*lotes; return [o.num, o.data, r.nome, LFI.dep(o.dep).curto, o.qtd, LFI.STATUS.op[o.status][0], o.resp, ct, c.perdaV*lotes, o.qtd?ct/o.qtd:0]; }).sort(function(a,b){ return a[1]<b[1]?1:-1; });
  return {resumo:[['Ordens',String(rows.length)],['Concluídas',String(ls.filter(function(o){ return o.status==='concluida'; }).length)],['Custo dos ingredientes',F.moeda(soma(rows,function(r){ return r[7]; }))],['Perda técnica',F.moeda(soma(rows,function(r){ return r[8]; }))]],
    cols:[{t:'OP'},{t:'Data',tp:'data'},{t:'Receita'},{t:'Operação'},{t:'Quantidade',tp:'int'},{t:'Status'},{t:'Responsável'},{t:'Custo ingredientes',tp:'moeda'},{t:'Perda técnica',tp:'moeda'},{t:'Custo unitário',tp:'moeda'}], rows:rows,
    tot:['Total','','','','','','',soma(rows,function(r){ return r[7]; }),soma(rows,function(r){ return r[8]; }),''], nota:'Custo pelas fichas técnicas com o custo médio atual dos insumos.'};
}
function gBuffet(f){
  var p=f.p, rows=[], bs=LFI.db.buffets.filter(function(b){ return LFI.empresaVisivel(b.empresa)&&b.data>=p.de&&b.data<=p.ate; });
  var destN={reaproveitar:'Reaproveitado', descarte:'Descarte', perda:'Perda'};
  bs.forEach(function(b){ LFI.resumoBuffet(b).itens.forEach(function(i){ rows.push([b.num, b.data, i.rec.nome, i.it.pesoIni, i.rep, i.disp, i.it.pesoFinal, i.cons, i.custoKg, i.cons==null?null:i.cons*i.custoKg, i.it.destino?destN[i.it.destino]:'Em operação']); }); });
  var res=bs.map(LFI.resumoBuffet), disp=soma(res,function(r){ return r.disp; }), cons=soma(res,function(r){ return r.consumo; });
  return {resumo:[['Buffets',String(bs.length)],['Consumo',F.num(cons,1)+' kg'],['Aproveitamento',F.pct(disp?cons/disp:0)],['Sobras',F.num(soma(res,function(r){ return r.final; }),1)+' kg']],
    cols:[{t:'Buffet'},{t:'Data',tp:'data'},{t:'Item'},{t:'Inicial (kg)',tp:'num2'},{t:'Reposições (kg)',tp:'num2'},{t:'Disponível (kg)',tp:'num2'},{t:'Final (kg)',tp:'num2'},{t:'Consumo (kg)',tp:'num2'},{t:'Custo/kg',tp:'moeda'},{t:'Valor consumido',tp:'moeda'},{t:'Destino da sobra'}], rows:rows,
    tot:['Total','','',soma(rows,function(r){ return r[3]; }),soma(rows,function(r){ return r[4]; }),soma(rows,function(r){ return r[5]; }),soma(rows,function(r){ return r[6]||0; }),soma(rows,function(r){ return r[7]||0; }),'',soma(rows,function(r){ return r[9]||0; }),''],
    nota:'Pesagens registradas na balança do buffet; custo por kg pela ficha técnica de cada item.'};
}
function gPerdas(f){
  var ls=perdasDet(f.p, depsDe(f.op));
  var rows=ls.map(function(x){ return [x.d, x.tipo, x.origem, x.item, LFI.dep(x.dep).curto, x.qtd, x.un, x.valor, x.motivo, x.resp]; });
  var perd=ls.filter(function(x){ return x.perda; }), reap=ls.filter(function(x){ return !x.perda; }), bufD=perd.filter(function(x){ return x.origem.indexOf('Buffet')===0; });
  return {resumo:[['Perdas totais',F.moeda(soma(perd,function(x){ return x.valor; }))],['Descarte do buffet',F.num(soma(bufD,function(x){ return x.qtd; }),1)+' kg · '+F.moeda(soma(bufD,function(x){ return x.valor; }))],['Sobras reaproveitadas',F.num(soma(reap,function(x){ return x.qtd; }),1)+' kg · '+F.moeda(soma(reap,function(x){ return x.valor; }))],['Perda técnica',F.moeda(soma(perd.filter(function(x){ return x.tipo==='Perda técnica'; }),function(x){ return x.valor; }))]],
    cols:[{t:'Data',tp:'data'},{t:'Tipo',tp:'tipoP'},{t:'Origem'},{t:'Item'},{t:'Operação'},{t:'Qtd',tp:'num2'},{t:'Un'},{t:'Valor',tp:'moeda'},{t:'Motivo / condição'},{t:'Responsável'}], rows:rows,
    tot:['Total de perdas (sem reaproveitadas)','','','','','','',soma(perd,function(x){ return x.valor; }),'',''],
    nota:'Sobras de buffet só voltam ao estoque quando atendem às regras de conservação (temperatura e tempo). Peixe cru e frituras expostos são sempre descartados.'};
}
function gVendidos(f){
  var pv=LFI.produtosVendidos(f.p, depsDe(f.op)).sort(function(a,b){ return b.receita-a.receita; }), tot=soma(pv,function(x){ return x.receita; });
  var rows=pv.map(function(x,i){ return [i+1, x.nome, LFI.dep(x.dep).curto, x.qtd, x.preco, x.receita, x.custo, x.mc, x.mcPct, tot?x.receita/tot:0]; });
  return {resumo:[['Produtos',String(rows.length)],['Faturamento',F.moeda(tot)],['Mais vendido',pv[0]?pv[0].nome:'—'],['Mais rentável',pv.length?pv.slice().sort(function(a,b){ return b.mc-a.mc; })[0].nome:'—']],
    cols:[{t:'#',tp:'int'},{t:'Produto'},{t:'Operação'},{t:'Quantidade',tp:'int'},{t:'Preço',tp:'moeda'},{t:'Faturamento',tp:'moeda'},{t:'Custo unit.',tp:'moeda'},{t:'Margem',tp:'moeda'},{t:'Margem %',tp:'pct'},{t:'Participação',tp:'pct'}], rows:rows,
    tot:['','Total','','',  '',tot,'',soma(rows,function(r){ return r[7]; }),'',1], nota:'Quantidades estimadas pelo mix de vendas de cada operação sobre o faturamento do período.'};
}

/* formatação de célula por tipo */
var NUM_TP={moeda:1,qtd:1,num2:1,num3:1,int:1,pct:1,pctv:1};
function fmtC(v, tp){
  if(v==null||v==='') return '—';
  switch(tp){
    case 'moeda': return F.moeda(v);
    case 'qtd': return F.num(v, Math.abs(v)<10&&v%1?2:v%1?1:0);
    case 'num2': return F.num(v,2);
    case 'num3': return F.num(v);
    case 'int': return F.num(v,0);
    case 'pct': return F.pct(v);
    case 'pctv': return (v>0?'+':'')+F.pct(v);
    case 'data': return F.data(v);
    default: return esc(v);
  }
}
function fmtHTML(v, tp){
  if(tp==='sit'){ return v==='Crítico'?UI.badge(v,'no'):v==='Baixo'?UI.badge(v,'wt'):v==='Excesso'?UI.badge(v,'in'):UI.badge(v,'ok'); }
  if(tp==='tipoP'){ return v==='Sobra reaproveitada'?UI.badge(v,'ok'):v==='Perda técnica'?UI.badge(v,'nu'):v==='Perda'?UI.badge(v,'wt'):UI.badge(v,'no'); }
  if(tp==='pctv'&&v!=null){ return '<span class="var '+(Math.abs(v)<0.0005?'nu':v>0?'upr':'dng')+'">'+fmtC(v,tp)+'</span>'; }
  return fmtC(v,tp);
}
function dirC(tp){ return NUM_TP[tp]; }

/* ---------- aba: central de relatórios ---------- */
function abaCentral(el, H){
  var s=st(), nrm=function(x){ return String(x||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); };
  var ls=LISTA.filter(function(r){ return !s.q||nrm(r.nome+' '+r.desc+' '+r.grupo).indexOf(nrm(s.q))>=0; });
  var h='<div class="barra"><div class="search" style="max-width:420px">'+UI.ic('busca')+'<input placeholder="Buscar relatório (ex.: perdas, compras, tributos)" data-inp="q" value="'+esc(s.q)+'"></div><span class="sp"></span><span class="tag">'+ls.length+' de '+LISTA.length+' relatórios</span></div>';
  if(!ls.length) h+='<div class="card">'+UI.vazio('Nenhum relatório encontrado para "'+s.q+'"','🔎')+'</div>';
  var grupos=[]; ls.forEach(function(r){ if(grupos.indexOf(r.grupo)<0) grupos.push(r.grupo); });
  var p30=LFI.periodo('30d');
  grupos.forEach(function(g){
    h+='<div class="rl-gr">'+esc(g)+'</div><div class="rl-grid">'+ls.filter(function(r){ return r.grupo===g; }).map(function(r){ var n=0; try{ n=r.gera({p:p30, op:'todas'}).rows.length; }catch(e){ console.error(e); }
      return '<div class="rl-card" data-act="abrir" data-id="'+r.id+'"><div class="hd"><span class="av lf">'+UI.ic(r.ic)+'</span><div><b>'+esc(r.nome)+'</b><small>'+esc(r.desc)+'</small></div></div><div class="ft"><span class="tags">'+(r.per?'<span class="tag">Período</span>':'<span class="tag">Posição atual</span>')+(r.op?'<span class="tag">Operação</span>':'')+'<span class="tag">PDF · Excel</span></span><span class="vl">'+F.num(n,0)+' linhas</span></div></div>'; }).join('')+'</div>';
  });
  el.innerHTML=h;
  var t; H.q=function(_,ev){ clearTimeout(t); var v=ev.target.value; t=setTimeout(function(){ s.q=v; LFI.recarregar(); var i=document.querySelector('[data-inp="q"]'); if(i){ i.focus(); i.setSelectionRange(v.length,v.length); } },250); };
  H.abrir=function(id){ LFI.ir('relatorios', id); };
}

/* ---------- prévia do relatório ---------- */
function renderPreview(el, id){
  var s=st(), f=s.rp, R=REL[id];
  if(f.op!=='todas'&&opsVis().indexOf(f.op)<0) f.op='todas';
  var p=LFI.periodo(f.per, f.de, f.ate), d=R.gera({p:p, op:R.op?f.op:'todas'});
  var subt=(R.per?p.nome+' ('+F.data(p.de)+' a '+F.data(p.ate)+')':'Posição em '+F.data(LFI.hoje()))+(R.op&&f.op!=='todas'?' · '+LFI.dep(f.op).nome:R.op?' · todas as operações':'');
  var h=UI.cabecalho({migalha:[{t:'Indicadores e Relatórios', ir:'relatorios'},{t:'Central de relatórios', ir:'relatorios'},{t:R.nome}], titulo:esc(R.nome), sub:esc(R.desc)+' · '+esc(subt),
    acoes:'<button class="btn sec sm" data-act="voltar">'+UI.ic('voltar')+'Relatórios</button><button class="btn sec sm" data-act="pdf">'+UI.ic('pdf')+'Exportar PDF</button><button class="btn pri sm" data-act="xls">'+UI.ic('excel')+'Exportar Excel</button>'});
  if(R.per||R.op) h+='<div class="barra">'+(R.per?barraFiltros(f,'r'):'<span class="tag">'+UI.ic('relogio','')+' Posição atual</span>')+'<span class="sp"></span>'+(R.op?pillsOps(f,'r'):'')+'</div>';
  h+='<div class="rl-kp">'+d.resumo.map(function(x,i){ return UI.kpi({lb:x[0], vl:'<span style="font-size:'+(String(x[1]).length>16?'17px':'inherit')+'">'+esc(x[1])+'</span>', hl:i===0}); }).join('')+'</div>';
  h+='<div class="card"><h3><span class="lft">'+UI.ic(R.ic)+' Prévia <small>'+d.rows.length+' linha(s) · clique no cabeçalho para ordenar</small></span><small>Gerado em '+F.dataHora(LFI.agoraISO())+'</small></h3><div id="rp-t"></div>'+(d.nota?'<div class="mt">'+UI.nota(d.nota,'in')+'</div>':'')+'</div>';
  el.innerHTML=h;
  var linhas=d.rows.map(function(r,i){ return {i:i, r:r}; });
  var rod=d.tot?'<tr>'+d.tot.map(function(v,i){ var tp=d.cols[i].tp; return '<td class="'+(dirC(tp)?'r':'')+'">'+(v===''||v==null?'':typeof v==='string'?esc(v):fmtC(v,tp))+'</td>'; }).join('')+'</tr>':null;
  UI.tabela(el.querySelector('#rp-t'),{linhas:linhas, linhaId:function(l){ return l.i; }, cls:'cp', vazio:'Nenhum registro para os filtros selecionados', rodape:d.rows.length?rod:null,
    colunas:d.cols.map(function(c,i){ return {t:c.t, r:!!dirC(c.tp), nw:c.tp==='data', v:function(l){ var v=l.r[i]; return i===0&&!c.tp?'<b>'+esc(v)+'</b>':fmtHTML(v,c.tp); }, ord:function(l){ var v=l.r[i]; return v==null?(dirC(c.tp)?-1e12:''):v; }}; })});
  var H=UI.navHandlers({
    voltar:function(){ st().aba='rel'; LFI.ir('relatorios'); },
    pdf:function(){
      var kp='<div class="kp">'+d.resumo.map(function(x){ return '<div><span>'+esc(x[0])+'</span><b>'+esc(x[1])+'</b></div>'; }).join('')+'</div>';
      var tb='<table><thead><tr>'+d.cols.map(function(c){ return '<th class="'+(dirC(c.tp)?'r':'')+'">'+esc(c.t)+'</th>'; }).join('')+'</tr></thead><tbody>'+
        d.rows.map(function(r){ return '<tr>'+r.map(function(v,i){ var tp=d.cols[i].tp; return '<td class="'+(dirC(tp)?'r':'')+'">'+fmtC(v,tp)+'</td>'; }).join('')+'</tr>'; }).join('')+'</tbody>'+
        (d.tot?'<tfoot><tr>'+d.tot.map(function(v,i){ var tp=d.cols[i].tp; return '<td class="'+(dirC(tp)?'r':'')+'">'+(v===''||v==null?'':typeof v==='string'?esc(v):fmtC(v,tp))+'</td>'; }).join('')+'</tr></tfoot>':'')+'</table>';
      UI.exportarPDF(R.nome, subt, kp+(d.rows.length?tb:'<p>Nenhum registro para os filtros selecionados.</p>')+(d.nota?'<p style="font-size:10px;color:#5E5E66;margin-top:10px">'+d.nota+'</p>':''));
      UI.toast('Relatório pronto para impressão', R.nome+' · use "Salvar como PDF"', 'in');
    },
    xls:function(){
      var cab=d.cols.map(function(c){ return c.t+(c.tp==='pct'||c.tp==='pctv'?' (%)':''); });
      var rows=d.rows.map(function(r){ return r.map(function(v,i){ var tp=d.cols[i].tp; if(v==null) return ''; if(tp==='pct'||tp==='pctv') return r2(v*100); if(tp==='moeda') return r2(v); if(tp==='data') return F.data(v); return v; }); });
      if(d.tot) rows.push(d.tot.map(function(v,i){ var tp=d.cols[i].tp; if(v==null||v==='') return ''; if(typeof v==='string') return v; if(tp==='pct'||tp==='pctv') return r2(v*100); return r2(v); }));
      UI.exportarExcel(R.id+'_'+LFI.hoje(), cab, rows, R.nome);
      UI.toast('Planilha gerada', R.nome+' · '+d.rows.length+' linha(s)');
    }
  });
  ligaFiltros(H, f, 'r');
  UI.liga(el, H);
}

LFI.registrar('relatorios',{titulo:'Indicadores e Relatórios', render:render});
})();
