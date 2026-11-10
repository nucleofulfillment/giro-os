/* LiveFood Intelligence — VISÃO GERAL (dashboard gerencial)
   Modelo de tela: LFI.registrar(id, {titulo, render(el, arg)}); estado em LFI.estado[id];
   HTML com data-act="nome" data-id="…" ligado por LFI.ui.liga(el, handlers). */
(function(){
'use strict';
var LFI=window.LFI, UI=LFI.ui, F=LFI.fmt, esc=UI.esc;
var CORES_OP={pad:'#E08A1E', res:'#1D4ED8', sus:'#C2185B'};

function st(){ return LFI.estado.visao = LFI.estado.visao || {per:'30d', op:'todas', de:null, ate:null, rank:'vendidos'}; }
function depsFiltro(){ var s=st(), vis=LFI.depIds().filter(function(d){ return d!=='cen'; }); return s.op==='todas'?vis:vis.filter(function(d){ return d===s.op; }); }

function dias(p){ var out=[], d=new Date(p.de+'T12:00:00'), f=new Date(p.ate+'T12:00:00'); while(d<=f){ out.push(LFI.dataUtil.iso(d)); d.setDate(d.getDate()+1); } return out; }

/* roteiro da demonstração: mostra ao proprietário o caminho completo, do recebimento da nota ao fechamento do buffet */
function roteiro(){
  var db=LFI.db, nf=LFI.nota('nf_demo'), cot=LFI.cotacao('cot031'), bfNovo=db.buffets.some(function(b){ return b.id!=='bf088'; });
  var passos=[
    {t:'Nota fiscal chega', d:'NF 000.125.890 · Distribuidora Central', ok:nf&&nf.status==='lancada', ir:'notas/nf_demo'},
    {t:'Estoque e custo médio', d:'Entrada automática com rastreio da nota', ok:nf&&nf.status==='lancada', ir:'estoque'},
    {t:'Receitas recalculadas', d:'Temaki de salmão com o novo custo', ok:nf&&nf.status==='lancada', ir:'receitas/r09'},
    {t:'Necessidade de compra', d:'Lista fotografada vira cotação', ok:db.cotacoes.length>5, ir:'compras'},
    {t:'Comparar fornecedores', d:'COT-2026-031 com 4 propostas', ok:cot&&(cot.status==='convertida'||cot.status==='aprovada'), ir:'compras/cot031'},
    {t:'Ordem de compra', d:'Consolidada por fornecedor', ok:cot&&cot.status==='convertida', ir:'ordens'},
    {t:'Buffet de sushi', d:'Abertura, pesagem e encerramento', ok:bfNovo, ir:'buffet'}
  ];
  var feitos=passos.filter(function(p){ return p.ok; }).length;
  return '<div class="card mb" style="padding:16px 18px"><h3 style="margin-bottom:12px"><span class="lft">'+UI.ic('ia','')+' Roteiro da demonstração <small>do recebimento da nota ao fechamento do buffet</small></span><small>'+feitos+' de '+passos.length+' etapas</small></h3>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">'+passos.map(function(p,i){
      return '<button type="button" data-act="_ir" data-id="'+p.ir+'" style="text-align:left;border:1px solid '+(p.ok?'#BBE5C8':'var(--border)')+';background:'+(p.ok?'#F3FBF5':'var(--s2)')+';border-radius:12px;padding:10px 11px;cursor:pointer;font:inherit;color:inherit;display:flex;gap:9px;align-items:flex-start">'+
        '<span style="flex:none;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;'+(p.ok?'background:var(--green);color:#fff':'background:#fff;border:1.5px solid var(--border2);color:var(--muted2)')+'">'+(p.ok?'✓':(i+1))+'</span>'+
        '<span style="min-width:0"><b style="display:block;font-size:12.5px;font-weight:800">'+esc(p.t)+'</b><small style="display:block;font-size:11px;color:var(--muted);font-weight:600;line-height:1.35;margin-top:2px">'+esc(p.d)+'</small></span></button>'; }).join('')+'</div></div>';
}

function render(el){
  var s=st(), p=LFI.periodo(s.per, s.de, s.ate), pa=LFI.periodoAnterior(p), deps=depsFiltro(), emp=LFI.empresaAtual();
  var fat=LFI.faturamento(p,deps), fatA=LFI.faturamento(pa,deps);
  var cmvPct=0, totW=0; deps.forEach(function(d){ var f=LFI.faturamento(p,[d]); cmvPct+=LFI.cmvPct(d)*f; totW+=f; }); cmvPct = totW? cmvPct/totW : 0;
  var cmv=fat*cmvPct, imp=0; deps.forEach(function(d){ imp+=LFI.faturamento(p,[d])*LFI.empresaDoDep(d).impVenda/100; });
  var mc=fat-cmv-imp;
  var depsEst = s.op==='todas'?LFI.depIds():deps.concat(LFI.depVisivel('cen')?['cen']:[]);
  var vEst=LFI.valorEstoqueTotal(depsEst), alertas=LFI.alertas(), abaixo=alertas.filter(function(a){ return a.tipo==='critico'||a.tipo==='baixo'; });
  var compras=LFI.comprasPeriodo(p), cp=LFI.contasAbertas(7), cpTot=LFI.contasAbertas();
  var perdP=LFI.perdasProducao(p, deps), perdB=LFI.perdasBuffet(p);
  var cotAnd=LFI.db.cotacoes.filter(function(c){ return LFI.empresaVisivel(c.empresa)&&['convertida','cancelada'].indexOf(c.status)<0; }).length;
  var ds=dias(p), serieDia={}; deps.forEach(function(d){ serieDia[d]=ds.map(function(){ return 0; }); });
  LFI.vendas(p,deps).forEach(function(v){ var i=ds.indexOf(v.d); if(i>=0) serieDia[v.dep][i]+=v.valor; });
  var tot7=ds.map(function(_,i){ var t=0; deps.forEach(function(d){ t+=serieDia[d][i]; }); return t; });

  var opsPills='<div class="pills">'+['todas'].concat(LFI.depIds().filter(function(d){ return d!=='cen'; })).map(function(d){ var dd=LFI.dep(d); return '<button class="pill'+(s.op===d?' on':'')+'" data-act="op" data-id="'+d+'">'+(dd?'<i style="background:'+dd.cor+'"></i>'+esc(dd.curto):'Todas as operações')+'</button>'; }).join('')+'</div>';
  var per=[['hoje','Hoje'],['7d','7 dias'],['30d','30 dias'],['mes','Mês atual'],['custom','Período']];
  var perSeg='<div class="seg">'+per.map(function(x){ return '<button class="'+(s.per===x[0]?'on':'')+'" data-act="per" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>';
  var custom = s.per==='custom' ? '<input type="date" class="inp sm" style="width:auto" data-chg="de" value="'+p.de+'"><input type="date" class="inp sm" style="width:auto" data-chg="ate" value="'+p.ate+'">' : '';

  var h=UI.cabecalho({titulo:'Visão Geral', sub:(emp?esc(emp.fantasia)+' · CNPJ '+emp.cnpj:esc(LFI.db.grupo.nome)+' · consolidado de '+LFI.db.empresas.length+' CNPJs')+' · '+esc(p.nome)+' ('+F.dataC(p.de)+' a '+F.dataC(p.ate)+')',
    acoes:'<button class="btn sec sm" data-act="_ir" data-id="notas">'+UI.ic('nota')+'Importar nota</button><button class="btn sec sm" data-act="_ir" data-id="compras">'+UI.ic('foto')+'Compra por foto</button><button class="btn pri sm" data-act="_ir" data-id="buffet">'+UI.ic('buffet')+'Buffet</button>'});
  h+='<div class="barra">'+perSeg+custom+'<span class="sp"></span>'+opsPills+'</div>';
  h+=roteiro();

  h+='<div class="kpis k5">'+
    UI.kpi({lb:'Faturamento', vl:F.moeda(fat), dl:UI.variacao(fat,fatA)+' vs. período anterior', spark:tot7.length>2?UI.spark(tot7):'', act:'kFat', hl:true})+
    UI.kpi({lb:'Margem de contribuição', vl:F.moeda(mc), dl:'<b style="color:var(--text)">'+F.pct(fat?mc/fat:0)+'</b> do faturamento', act:'kMc'})+
    UI.kpi({lb:'Custo das mercadorias (CMV)', vl:F.moeda(cmv), dl:F.pct(cmvPct)+' · pelas fichas técnicas', act:'kCmv'})+
    UI.kpi({lb:'Valor em estoque', vl:F.moeda(vEst), dl:'Ao custo médio atualizado', act:'_ir', id:'estoque'})+
    UI.kpi({lb:'Contas a pagar · 7 dias', vl:F.moeda(cp.total), dl:cp.qtd+' títulos · '+F.moeda(cpTot.total)+' em aberto', act:'kCp'})+
  '</div>';
  h+='<div class="kpis k5">'+
    UI.kpi({lb:'<span style="color:var(--red)">●</span> Abaixo do mínimo', vl:abaixo.length+' <small>produtos</small>', dl:alertas.filter(function(a){ return a.tipo==='critico'; }).length+' em nível crítico', act:'_ir', id:'estoque'})+
    UI.kpi({lb:'Compras no período', vl:F.moeda(compras.total), dl:compras.notas+' notas fiscais lançadas', act:'_ir', id:'notas'})+
    UI.kpi({lb:'Perdas de produção', vl:F.moeda(perdP.total), dl:'Técnica '+F.moedaK(perdP.tecnica)+' · estoque '+F.moedaK(perdP.estoque), act:'kPerdas'})+
    UI.kpi({lb:'Perdas do buffet', vl:F.moeda(perdB.valor), dl:F.num(perdB.kg,1)+' kg descartados · '+perdB.buffets+' buffet(s)', act:'_ir', id:'buffet'})+
    UI.kpi({lb:'Cotações em andamento', vl:String(cotAnd), dl:'Propostas por PDF, Excel e WhatsApp', act:'_ir', id:'compras'})+
  '</div>';

  h+='<div class="grid g21 mb"><div class="card"><h3><span class="lft">Faturamento por dia <small>por operação · clique em uma barra</small></span></h3><div id="g-dia"></div></div>'+
     '<div class="card"><h3>Faturamento por operação</h3><div id="g-op"></div><div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px" id="op-cnpj"></div></div></div>';

  h+='<div class="grid g3 mb">'+
     '<div class="card"><h3>Faturamento por categoria <small>clique para detalhar</small></h3><div id="g-cat"></div></div>'+
     '<div class="card"><h3><span class="lft">Produtos</span><span class="seg"><button class="'+(s.rank==='vendidos'?'on':'')+'" data-act="rank" data-id="vendidos">Mais vendidos</button><button class="'+(s.rank==='rentaveis'?'on':'')+'" data-act="rank" data-id="rentaveis">Mais rentáveis</button></span></h3><div id="g-prod"></div></div>'+
     '<div class="card"><h3><span class="lft">Alertas de estoque <span class="n">'+alertas.length+'</span></span><button class="vertodos" data-act="_ir" data-id="estoque">Ver estoque</button></h3><div id="alertas"></div></div></div>';

  h+='<div class="grid g3 mb">'+
     '<div class="card"><h3>Carga tributária estimada <small>por categoria de compra</small></h3><div id="g-trib"></div></div>'+
     '<div class="card"><h3>Compras por fornecedor <small>'+esc(p.nome.toLowerCase())+'</small></h3><div id="g-forn"></div></div>'+
     '<div class="card"><h3><span class="lft">Atividade recente</span></h3><div id="ativ"></div></div></div>';
  el.innerHTML=h;

  /* gráfico por dia */
  var gDia=el.querySelector('#g-dia');
  if(ds.length===1){
    gDia.innerHTML=UI.barrasH(deps.map(function(d){ return {nome:LFI.dep(d).nome, valor:serieDia[d][0], cor:CORES_OP[d], id:d}; }),{act:'opDet'});
  } else {
    UI.grafBarras(gDia,{cats:ds.map(function(d){ return F.dataC(d); }), titulosTip:ds.map(function(d){ return F.diaSemana(d)+', '+F.data(d); }), empilhado:true, altura:250,
      series:deps.map(function(d){ return {nome:LFI.dep(d).curto, cor:CORES_OP[d], valores:serieDia[d]}; }), onClick:function(i){ detalheDia(ds[i], deps); }});
  }
  /* rosca por operação */
  UI.grafRosca(el.querySelector('#g-op'),{itens:deps.map(function(d){ return {nome:LFI.dep(d).nome, valor:LFI.faturamento(p,[d]), cor:CORES_OP[d], id:d}; }), centro:{valor:F.moedaK(fat), rotulo:'no período'}, onClick:function(x){ s.op=x.id; LFI.recarregar(); }});
  var porEmp={}; deps.forEach(function(d){ var e=LFI.dep(d).empresa; porEmp[e]=(porEmp[e]||0)+LFI.faturamento(p,[d]); });
  el.querySelector('#op-cnpj').innerHTML='<div style="font-size:10.5px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Por CNPJ</div>'+Object.keys(porEmp).map(function(e){ var x=LFI.emp(e); return '<div class="lnr"><span class="k"><b style="color:var(--text)">'+esc(x.fantasia)+'</b> <small class="mono" style="color:var(--muted)">'+x.cnpj+'</small></span><span class="v">'+F.moeda(porEmp[e])+'</span></div>'; }).join('');

  /* categorias */
  var cats={}; LFI.vendas(p,deps).forEach(function(v){ for(var c in v.cats){ var k=c; cats[k]=cats[k]||{v:0,dep:{}}; cats[k].v+=v.cats[c]; cats[k].dep[v.dep]=(cats[k].dep[v.dep]||0)+v.cats[c]; } });
  var catL=Object.keys(cats).map(function(k){ var dmax=Object.keys(cats[k].dep).sort(function(a,b){ return cats[k].dep[b]-cats[k].dep[a]; })[0]; return {nome:k, valor:cats[k].v, cor:CORES_OP[dmax], id:k, sub:Object.keys(cats[k].dep).length>1?'várias operações':LFI.dep(dmax).curto}; }).sort(function(a,b){ return b.valor-a.valor; }).slice(0,8);
  el.querySelector('#g-cat').innerHTML=catL.length?UI.barrasH(catL,{act:'catDet'}):UI.vazio('Sem vendas no período');

  /* produtos */
  var pv=LFI.produtosVendidos(p,deps);
  var lista = s.rank==='vendidos' ? pv.sort(function(a,b){ return b.receita-a.receita; }).slice(0,7).map(function(x){ return {nome:x.nome, valor:x.receita, sub:F.num(x.qtd,0)+' vendidos', cor:CORES_OP[x.dep], id:x.rec||''}; })
                                 : pv.sort(function(a,b){ return b.mc-a.mc; }).slice(0,7).map(function(x){ return {nome:x.nome, valor:x.mc, sub:'margem '+F.pct(x.mcPct,0), cor:CORES_OP[x.dep], id:x.rec||''}; });
  el.querySelector('#g-prod').innerHTML=lista.length?UI.barrasH(lista,{act:'prodDet', rank:true}):UI.vazio('Sem vendas no período');

  /* alertas */
  var ics={critico:'alerta', baixo:'estoque', validade:'relogio', parado:'info', divergencia:'filtro'};
  el.querySelector('#alertas').innerHTML=alertas.slice(0,6).map(function(a){ return '<div class="alr '+a.nivel+'" data-act="_ir" data-id="estoque/'+a.prod+'"><span class="ic">'+UI.ic(ics[a.tipo])+'</span><div class="gr"><div class="tt">'+esc(a.titulo)+'</div><div class="dd">'+esc(a.txt)+'</div></div></div>'; }).join('')||UI.vazio('Nenhum alerta','✅');

  /* tributos por categoria */
  var dest=LFI.impostosDestacados(), porCat={};
  LFI.db.produtos.forEach(function(pr){ var c=LFI.cargaEstimada(pr); if(c.pct==null) return; var v=LFI.valorEstoque(pr,['cen','pad','res','sus']); var o=porCat[pr.cat]=porCat[pr.cat]||{base:0,imp:0}; o.base+=v; o.imp+=v*c.pct/100; });
  var tl=Object.keys(porCat).map(function(c){ return {nome:LFI.cat(c).nome, valor:porCat[c].base?porCat[c].imp/porCat[c].base*100:0, id:c, cor:'#1C1C1E'}; }).filter(function(x){ return x.valor>0; }).sort(function(a,b){ return b.valor-a.valor; }).slice(0,6);
  el.querySelector('#g-trib').innerHTML=UI.barrasH(tl,{fmt:function(v){ return F.pctN(v,1); }, act:'tribDet'})+'<div class="nota" style="margin:12px 0 0;font-size:11.5px">'+UI.ic('info')+'<div>Estimativa com regras tributárias <b>validadas</b>. '+LFI.db.regrasTrib.filter(function(r){ return r.status!=='validada'; }).length+' regras aguardam validação fiscal.</div></div>';

  /* fornecedores */
  var fl=Object.keys(compras.porForn).map(function(f){ return {nome:LFI.forn(f).nome, valor:compras.porForn[f], id:f, cor:'var(--roxo)'}; }).sort(function(a,b){ return b.valor-a.valor; }).slice(0,6);
  el.querySelector('#g-forn').innerHTML=fl.length?UI.barrasH(fl,{act:'fornDet'}):UI.vazio('Nenhuma nota lançada no período');

  /* atividades */
  var icA={nf:'nota', cotacao:'compras', oc:'ordem', producao:'producao', buffet:'buffet', estoque:'estoque', receita:'receita', trib:'tributo'};
  el.querySelector('#ativ').innerHTML='<div class="lst">'+LFI.db.atividades.slice(0,7).map(function(a){ return '<div class="li cl" '+(a.ref?'data-act="_ir" data-id="'+a.ref.tela+(a.ref.id?'/'+a.ref.id:'')+'"':'')+'><span class="av">'+UI.ic(icA[a.tipo]||'info')+'</span><div class="gr"><div class="tt" style="white-space:normal;font-size:12.5px">'+esc(a.txt)+'</div><div class="dd">'+F.relativo(a.d)+'</div></div></div>'; }).join('')+'</div>';

  UI.liga(el, UI.navHandlers({
    per:function(id){ s.per=id; LFI.recarregar(); },
    de:function(_,ev){ s.de=ev.target.value; LFI.recarregar(); }, ate:function(_,ev){ s.ate=ev.target.value; LFI.recarregar(); },
    op:function(id){ s.op=id; LFI.recarregar(); },
    rank:function(id){ s.rank=id; LFI.recarregar(); },
    opDet:function(id){ s.op=id; LFI.recarregar(); },
    catDet:function(id){ detalheCategoria(id, p, deps); },
    prodDet:function(id){ if(id) LFI.ir('receitas', id); else UI.toast('Produto de revenda','Sem ficha técnica: custo pelo último preço de compra','in'); },
    tribDet:function(id){ LFI.estado.tributos=LFI.estado.tributos||{}; LFI.estado.tributos.cat=id; LFI.ir('tributos'); },
    fornDet:function(id){ LFI.ir('fornecedores', id); },
    kFat:function(){ detalheFaturamento(p, deps); },
    kMc:function(){ detalheMargem(p, deps); },
    kCmv:function(){ LFI.ir('custos'); },
    kCp:function(){ contasPagar(); },
    kPerdas:function(){ LFI.ir('relatorios','perdas'); }
  }));
}

function detalheDia(d, deps){
  var vs=LFI.db.vendas.filter(function(v){ return v.d===d&&deps.indexOf(v.dep)>=0; }), tot=0; vs.forEach(function(v){ tot+=v.valor; });
  var h='<div class="kpis k3">'+UI.kpi({lb:'Faturamento', vl:F.moeda(tot)})+UI.kpi({lb:'Tickets', vl:F.num(vs.reduce(function(a,v){ return a+v.tickets; },0),0)})+UI.kpi({lb:'Ticket médio', vl:F.moeda(tot/Math.max(1,vs.reduce(function(a,v){ return a+v.tickets; },0)))})+'</div>';
  vs.forEach(function(v){ h+='<div class="card flat" style="margin-top:10px"><h3 style="margin-bottom:8px">'+UI.dep(v.dep)+'<small>'+F.moeda(v.valor)+' · '+v.tickets+' tickets</small></h3>'+Object.keys(v.cats).map(function(c){ return '<div class="lnr"><span class="k">'+esc(c)+'</span><span class="v">'+F.moeda(v.cats[c])+'</span></div>'; }).join('')+'</div>'; });
  UI.modal({titulo:'Faturamento de '+F.diaSemana(d)+', '+F.data(d), sub:'Detalhe por operação e categoria', corpo:h||UI.vazio('Sem vendas neste dia')});
}
function detalheCategoria(cat, p, deps){
  var ds=dias(p), serie=ds.map(function(){ return 0; }); LFI.vendas(p,deps).forEach(function(v){ if(v.cats[cat]) serie[ds.indexOf(v.d)]+=v.cats[cat]; });
  var tot=serie.reduce(function(a,b){ return a+b; },0);
  var m=UI.modal({titulo:esc(cat), sub:'Faturamento da categoria · '+esc(p.nome), tam:'lg', corpo:'<div class="kpis k3">'+UI.kpi({lb:'Total', vl:F.moeda(tot)})+UI.kpi({lb:'Média por dia com venda', vl:F.moeda(tot/Math.max(1,serie.filter(function(x){ return x>0; }).length))})+UI.kpi({lb:'Melhor dia', vl:F.moeda(Math.max.apply(null,serie))})+'</div><div id="dc-g"></div>'});
  setTimeout(function(){ UI.grafLinhas(m.corpo.querySelector('#dc-g'),{cats:ds.map(F.dataC), series:[{nome:cat, cor:'#FF5A00', valores:serie}], altura:220}); },30);
}
function detalheFaturamento(p, deps){
  var meses={}; LFI.db.vendas.forEach(function(v){ if(deps.indexOf(v.dep)<0) return; var k=v.d.slice(0,7); meses[k]=meses[k]||{}; meses[k][v.dep]=(meses[k][v.dep]||0)+v.valor; });
  var ks=Object.keys(meses).sort();
  var m=UI.modal({titulo:'Evolução do faturamento', sub:'Últimos meses por operação', tam:'lg', corpo:'<div id="df-g"></div>'+UI.nota('O mês atual está em andamento. Clique em uma operação na Visão Geral para analisar só ela.','in')});
  setTimeout(function(){ var nomes=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']; UI.grafBarras(m.corpo.querySelector('#df-g'),{cats:ks.map(function(k){ return nomes[+k.slice(5)-1]+'/'+k.slice(2,4); }), empilhado:true, altura:260, series:deps.map(function(d){ return {nome:LFI.dep(d).curto, cor:CORES_OP[d], valores:ks.map(function(k){ return meses[k][d]||0; })}; })}); },30);
}
function detalheMargem(p, deps){
  var h='<div class="tb-wrap"><table class="tb"><thead><tr><th>Operação</th><th class="r">Faturamento</th><th class="r">CMV</th><th class="r">Impostos</th><th class="r">Margem</th><th class="r">%</th></tr></thead><tbody>', T=[0,0,0,0];
  deps.forEach(function(d){ var f=LFI.faturamento(p,[d]), c=f*LFI.cmvPct(d), i=f*LFI.empresaDoDep(d).impVenda/100, mc=f-c-i; T[0]+=f; T[1]+=c; T[2]+=i; T[3]+=mc;
    h+='<tr><td>'+UI.dep(d)+'<small>'+esc(LFI.empresaDoDep(d).fantasia)+' · '+esc(LFI.empresaDoDep(d).regime)+'</small></td><td class="r">'+F.moeda(f)+'</td><td class="r">'+F.moeda(c)+'<small>'+F.pct(LFI.cmvPct(d))+'</small></td><td class="r">'+F.moeda(i)+'<small>'+F.pctN(LFI.empresaDoDep(d).impVenda)+'</small></td><td class="r"><b>'+F.moeda(mc)+'</b></td><td class="r">'+F.pct(f?mc/f:0)+'</td></tr>'; });
  h+='</tbody><tfoot><tr><td>Total</td><td class="r">'+F.moeda(T[0])+'</td><td class="r">'+F.moeda(T[1])+'</td><td class="r">'+F.moeda(T[2])+'</td><td class="r">'+F.moeda(T[3])+'</td><td class="r">'+F.pct(T[0]?T[3]/T[0]:0)+'</td></tr></tfoot></table></div>';
  h+=UI.nota('CMV calculado pelo mix de vendas e pelas <b>fichas técnicas com custo atualizado</b>. Impostos sobre a venda conforme a alíquota efetiva cadastrada em cada CNPJ.','in');
  UI.modal({titulo:'Margem de contribuição', sub:esc(LFI.periodo(st().per,st().de,st().ate).nome), tam:'lg', corpo:h, botoes:'<button class="btn sec" data-act="_fechar">Fechar</button><button class="btn pri" data-act="c">Abrir Custos e Precificação</button>', acoes:{c:function(){ LFI.ir('custos'); }}});
}
function contasPagar(){
  var ls=LFI.db.contasPagar.filter(function(c){ return LFI.empresaVisivel(c.empresa)&&c.status!=='pago'; }).sort(function(a,b){ return a.venc<b.venc?-1:1; });
  var m=UI.modal({titulo:'Contas a pagar em aberto', sub:'Lançamentos gerados pelas notas fiscais de entrada', tam:'lg', corpo:'<div id="cp-t"></div>'});
  UI.tabela(m.corpo.querySelector('#cp-t'),{linhas:ls, ordem:2, dir:1, colunas:[
    {t:'Fornecedor', v:function(c){ return '<b>'+esc(LFI.forn(c.forn).nome)+'</b><small>'+esc(c.descricao)+'</small>'; }, ord:function(c){ return LFI.forn(c.forn).nome; }},
    {t:'Empresa', v:function(c){ return UI.empTag(c.empresa); }, ord:function(c){ return c.empresa; }},
    {t:'Vencimento', v:function(c){ return F.data(c.venc)+'<small>'+F.relativo(c.venc)+'</small>'; }, ord:function(c){ return c.venc; }},
    {t:'Valor', r:true, v:function(c){ return '<b>'+F.moeda(c.valor)+'</b>'; }, ord:function(c){ return c.valor; }},
    {t:'Origem', v:function(c){ return c.nf?'<a class="vertodos" data-act="nf" data-id="'+c.nf+'">Ver nota</a>':'<span class="tag">Boleto avulso</span>'; }, ord:false}
  ]});
  UI.liga(m.corpo,{nf:function(id){ m.fechar(); LFI.ir('notas',id); }});
}

LFI.registrar('visao',{titulo:'Visão Geral', render:render});
})();
