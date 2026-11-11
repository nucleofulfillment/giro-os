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

/* lista de tarefas do dia: cada item leva direto à tela onde se resolve */
function tarefas(){
  var db=LFI.db, out=[];
  var nfs=db.notas.filter(function(n){ return (n.status==='recebida'||n.status==='conferencia')&&LFI.empresaVisivel(n.empresa); });
  if(nfs.length) out.push({ic:'nota', cor:'lf', t:nfs.length===1?'1 nota fiscal para conferir':nfs.length+' notas fiscais para conferir', d:LFI.forn(nfs[0].forn).nome+' · '+F.moeda(nfs[0].valor), b:'Conferir', ir:'notas/'+nfs[0].id});
  var falta=LFI.alertas().filter(function(a){ return a.tipo==='critico'||a.tipo==='baixo'; });
  if(falta.length) out.push({ic:'estoque', cor:'no', t:falta.length+' produtos com estoque baixo', d:falta.slice(0,3).map(function(a){ return LFI.prod(a.prod).nome; }).join(', ')+(falta.length>3?'…':''), b:'Ver estoque', ir:'estoque'});
  var cmp=db.cotacoes.filter(function(c){ return (c.status==='comparacao'||c.status==='propostas_recebidas')&&LFI.empresaVisivel(c.empresa); });
  if(cmp.length) out.push({ic:'compras', cor:'lf', t:'Propostas de fornecedores para comparar', d:cmp[0].num+' · '+cmp[0].propostas.length+' propostas recebidas', b:'Comparar', ir:'compras/'+cmp[0].id});
  var apr=db.ordens.filter(function(o){ return o.status==='aguardando_aprovacao'&&LFI.empresaVisivel(o.empresa); });
  if(apr.length) out.push({ic:'ordem', cor:'wt', t:apr.length===1?'1 ordem de compra para aprovar':apr.length+' ordens de compra para aprovar', d:LFI.forn(apr[0].forn).nome+' · '+F.moeda(LFI.totalOrdem(apr[0])), b:'Aprovar', ir:'ordens/'+apr[0].id});
  var venc=LFI.alertas().filter(function(a){ return a.tipo==='validade'; });
  if(venc.length) out.push({ic:'relogio', cor:'wt', t:venc.length+' produtos perto do vencimento', d:venc.slice(0,3).map(function(a){ return LFI.prod(a.prod).nome; }).join(', '), b:'Ver', ir:'estoque'});
  var bf=db.buffets.filter(function(x){ return x.status!=='encerrado'&&LFI.empresaVisivel(x.empresa); });
  if(bf.length) out.push({ic:'buffet', cor:'lf', t:'Buffet em andamento', d:bf[0].num+' · '+bf[0].turno, b:'Acompanhar', ir:'buffet/'+bf[0].id});
  else if(LFI.depVisivel('res')) out.push({ic:'buffet', cor:'nu', t:'Buffet do sushi ainda não foi aberto hoje', d:'Abra o buffet e registre o peso de cada item', b:'Abrir buffet', ir:'buffet/novo'});
  return out;
}

function render(el){
  var s=st(); if(['hoje','ontem','7d','30d','custom'].indexOf(s.per)<0) s.per='30d';
  var p=LFI.periodo(s.per, s.de, s.ate), pa=LFI.periodoAnterior(p), deps=depsFiltro(), emp=LFI.empresaAtual();
  var fat=LFI.faturamento(p,deps), fatA=LFI.faturamento(pa,deps);
  var cmv=0, imp=0; deps.forEach(function(d){ var f=LFI.faturamento(p,[d]); cmv+=f*LFI.cmvPct(d); imp+=f*LFI.empresaDoDep(d).impVenda/100; });
  var mc=fat-cmv-imp;
  var baixo=LFI.alertas().filter(function(a){ return a.tipo==='critico'||a.tipo==='baixo'; }).length;
  var cp=LFI.contasAbertas(7);
  var tf=tarefas();

  var ops=['todas'].concat(LFI.depIds().filter(function(d){ return d!=='cen'; }));
  var h=UI.cabecalho({titulo:'Visão Geral', sub:emp?esc(emp.fantasia):esc(LFI.db.grupo.nome)+' · todas as empresas'});
  h+='<div class="vg-filtros"><div class="seg vg-per">'+[['hoje','Hoje'],['ontem','Ontem'],['7d','7 dias'],['30d','30 dias'],['custom','Personalizado']].map(function(x){ return '<button class="'+(s.per===x[0]?'on':'')+'" data-act="per" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>'+
     (ops.length>2?'<div class="pills vg-ops">'+ops.map(function(d){ var dd=LFI.dep(d); return '<button class="pill'+(s.op===d?' on':'')+'" data-act="op" data-id="'+d+'">'+(dd?'<i style="background:'+dd.cor+'"></i>'+esc(dd.curto):'Todas')+'</button>'; }).join('')+'</div>':'')+'</div>';
  if(s.per==='custom') h+='<div class="vg-datas"><label>De <input type="date" class="inp sm" data-chg="de" value="'+p.de+'"></label><label>Até <input type="date" class="inp sm" data-chg="ate" value="'+p.ate+'"></label></div>';

  h+='<div class="kpis">'+
    UI.kpi({lb:'Vendas', vl:F.moeda(fat), dl:UI.variacao(fat,fatA)+' em relação ao período anterior', hl:true})+
    UI.kpi({lb:'Lucro bruto', vl:F.pct(fat?mc/fat:0,0), dl:F.moeda(mc)+' depois de custos e impostos', act:'kMc'})+
    UI.kpi({lb:'Estoque baixo', vl:baixo+' <small>produtos</small>', dl:'Toque para ver quais', act:'_ir', id:'estoque'})+
    UI.kpi({lb:'Contas a pagar', vl:F.moeda(cp.total), dl:'Nos próximos 7 dias', act:'kCp'})+
  '</div>';

  h+='<div class="grid g12 mb"><div class="card"><h3>O que fazer agora <small>'+tf.length+' '+(tf.length===1?'tarefa':'tarefas')+'</small></h3>'+
     (tf.length?'<div class="vg-tarefas">'+tf.map(function(t){ return '<div class="alr '+t.cor+'" data-act="_ir" data-id="'+t.ir+'"><span class="ic">'+UI.ic(t.ic)+'</span><div class="gr"><div class="tt">'+esc(t.t)+'</div><div class="dd">'+esc(t.d)+'</div></div><span class="btn sec sm">'+esc(t.b)+'</span></div>'; }).join('')+'</div>':UI.vazio('Tudo em dia por aqui.','✅'))+'</div>'+
     '<div class="card"><h3>Vendas por dia</h3><div id="g-dia"></div></div></div>';
  el.innerHTML=h;

  var ds=dias(p), serie={}; deps.forEach(function(d){ serie[d]=ds.map(function(){ return 0; }); });
  LFI.vendas(p,deps).forEach(function(v){ var i=ds.indexOf(v.d); if(i>=0) serie[v.dep][i]+=v.valor; });
  var g=el.querySelector('#g-dia');
  UI.grafLinhas(g,{cats:ds.map(F.dataC), titulosTip:ds.map(function(d){ return F.diaSemana(d)+', '+F.data(d); }), altura:260, area:false,
    series:deps.map(function(d){ return {nome:LFI.dep(d).nome, cor:CORES_OP[d], valores:serie[d]}; }), onClick:function(i){ detalheDia(ds[i], deps); }});

  UI.liga(el, UI.navHandlers({
    per:function(id){ s.per=id; LFI.recarregar(); },
    de:function(_,ev){ s.de=ev.target.value; if(s.ate&&s.de>s.ate) s.ate=s.de; LFI.recarregar(); },
    ate:function(_,ev){ s.ate=ev.target.value; if(s.de&&s.ate<s.de) s.de=s.ate; LFI.recarregar(); },
    op:function(id){ s.op=id; LFI.recarregar(); },
    kMc:function(){ detalheMargem(p, deps); },
    kCp:function(){ contasPagar(); }
  }));
}

function detalheDia(d, deps){
  var vs=LFI.db.vendas.filter(function(v){ return v.d===d&&deps.indexOf(v.dep)>=0; }), tot=0; vs.forEach(function(v){ tot+=v.valor; });
  var h='<div class="kpis k3">'+UI.kpi({lb:'Faturamento', vl:F.moeda(tot)})+UI.kpi({lb:'Tickets', vl:F.num(vs.reduce(function(a,v){ return a+v.tickets; },0),0)})+UI.kpi({lb:'Ticket médio', vl:F.moeda(tot/Math.max(1,vs.reduce(function(a,v){ return a+v.tickets; },0)))})+'</div>';
  vs.forEach(function(v){ h+='<div class="card flat" style="margin-top:10px"><h3 style="margin-bottom:8px">'+UI.dep(v.dep)+'<small>'+F.moeda(v.valor)+' · '+v.tickets+' tickets</small></h3>'+Object.keys(v.cats).map(function(c){ return '<div class="lnr"><span class="k">'+esc(c)+'</span><span class="v">'+F.moeda(v.cats[c])+'</span></div>'; }).join('')+'</div>'; });
  UI.modal({titulo:'Faturamento de '+F.diaSemana(d)+', '+F.data(d), sub:'Detalhe por operação e categoria', corpo:h||UI.vazio('Sem vendas neste dia')});
}
function detalheMargem(p, deps){
  var h='<div class="tb-wrap"><table class="tb"><thead><tr><th>Operação</th><th class="r">Faturamento</th><th class="r">Custo dos produtos</th><th class="r">Impostos</th><th class="r">Lucro bruto</th><th class="r">%</th></tr></thead><tbody>', T=[0,0,0,0];
  deps.forEach(function(d){ var f=LFI.faturamento(p,[d]), c=f*LFI.cmvPct(d), i=f*LFI.empresaDoDep(d).impVenda/100, mc=f-c-i; T[0]+=f; T[1]+=c; T[2]+=i; T[3]+=mc;
    h+='<tr><td>'+UI.dep(d)+'<small>'+esc(LFI.empresaDoDep(d).fantasia)+' · '+esc(LFI.empresaDoDep(d).regime)+'</small></td><td class="r">'+F.moeda(f)+'</td><td class="r">'+F.moeda(c)+'<small>'+F.pct(LFI.cmvPct(d))+'</small></td><td class="r">'+F.moeda(i)+'<small>'+F.pctN(LFI.empresaDoDep(d).impVenda)+'</small></td><td class="r"><b>'+F.moeda(mc)+'</b></td><td class="r">'+F.pct(f?mc/f:0)+'</td></tr>'; });
  h+='</tbody><tfoot><tr><td>Total</td><td class="r">'+F.moeda(T[0])+'</td><td class="r">'+F.moeda(T[1])+'</td><td class="r">'+F.moeda(T[2])+'</td><td class="r">'+F.moeda(T[3])+'</td><td class="r">'+F.pct(T[0]?T[3]/T[0]:0)+'</td></tr></tfoot></table></div>';
  h+=UI.nota('Lucro bruto = vendas menos o custo dos produtos (pelas receitas) e os impostos sobre a venda.','in');
  UI.modal({titulo:'Lucro bruto por operação', sub:esc(LFI.periodo(st().per).nome), tam:'lg', corpo:h, botoes:'<button class="btn sec" data-act="_fechar">Fechar</button><button class="btn pri" data-act="c">Abrir Precificação</button>', acoes:{c:function(){ LFI.ir('custos'); }}});
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

if(!document.getElementById('css-visao')){ var css=document.createElement('style'); css.id='css-visao'; css.textContent='.vg-filtros{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}.vg-datas{display:flex;gap:12px;flex-wrap:wrap;margin:-4px 0 14px}.vg-datas label{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:800;color:var(--muted2)}.vg-datas input{width:auto}@media(max-width:700px){.vg-filtros{flex-direction:column;align-items:stretch}.vg-per{display:flex;width:100%}.vg-per button{flex:1 1 auto;padding:7px 4px;font-size:12px}.vg-ops{justify-content:center}.vg-datas{display:grid;grid-template-columns:1fr 1fr;gap:10px}.vg-datas label{flex-direction:column;align-items:stretch;gap:4px}.vg-datas input{width:100%}}.vg-tarefas .alr{padding:12px 14px}.vg-tarefas .alr .btn{pointer-events:none;flex:none}.vg-tarefas .alr .tt{font-size:14px}@media(max-width:700px){.vg-tarefas .alr .btn{display:none}}'; document.head.appendChild(css); }
LFI.registrar('visao',{titulo:'Visão Geral', render:render});
})();
