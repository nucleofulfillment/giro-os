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
  if(cmp.length) out.push({ic:'compras', cor:'lf', t:'Respostas de fornecedores para comparar', d:cmp[0].num+' · '+cmp[0].propostas.length+' propostas recebidas', b:'Comparar', ir:'compras/'+cmp[0].id});
  var cheg=db.ordens.filter(function(o){ return ['recebida','cancelada'].indexOf(o.status)<0&&o.previsao<=LFI.hoje()&&LFI.empresaVisivel(o.empresa); });
  if(cheg.length) out.push({ic:'caminhao', cor:'wt', t:cheg.length===1?'1 pedido para receber hoje':cheg.length+' pedidos para receber hoje', d:LFI.forn(cheg[0].forn).nome+' · '+F.moeda(LFI.totalOrdem(cheg[0])), b:'Receber', ir:'ordens'});
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
     (ops.length>2?'<div class="pills vg-ops">'+ops.map(function(d){ var dd=LFI.dep(d); return '<button class="pill'+(s.op===d?' on':'')+'" data-act="op" data-id="'+d+'">'+(dd?'<i style="background:'+dd.cor+'"></i>'+esc(dd.curto):'Todas')+'</button>'; }).join('')+'<button class="pill vg-share" data-act="share">'+UI.ic('whats')+'Compartilhar</button></div>':'')+'</div>';
  if(s.per==='custom') h+='<div class="vg-datas"><label>De <input type="date" class="inp sm" data-chg="de" value="'+p.de+'"></label><label>Até <input type="date" class="inp sm" data-chg="ate" value="'+p.ate+'"></label></div>';

  function so(dsk, html){ return dsk ? html.replace('<div class="kpi','<div class="vg-dsk kpi') : html; }
  h+='<div class="kpis">'+
    UI.kpi({lb:'Vendas', vl:F.moeda(fat), dl:UI.variacao(fat,fatA)+' em relação ao período anterior', hl:true})+
    so(1,UI.kpi({lb:'Lucro bruto', vl:F.pct(fat?mc/fat:0,0), dl:F.moeda(mc)+' depois de custos e impostos', act:'kMc'}))+
    so(1,UI.kpi({lb:'Estoque baixo', vl:baixo+' <small>produtos</small>', dl:'Toque para ver quais', act:'_ir', id:'estoque'}))+
    so(1,UI.kpi({lb:'Contas a pagar', vl:F.moeda(cp.total), dl:'Nos próximos 7 dias', act:'kCp'}))+
  '</div>';
  h+='<div class="card mb"><h3>Vendas por dia</h3><div id="g-dia"></div></div>';
  h+='<div class="card mb"><h3>O que fazer agora <small>'+tf.length+' '+(tf.length===1?'tarefa':'tarefas')+'</small></h3>'+
     (tf.length?'<div class="vg-tarefas">'+tf.map(function(t){ return '<div class="alr '+t.cor+'" data-act="_ir" data-id="'+t.ir+'"><span class="ic">'+UI.ic(t.ic)+'</span><div class="gr"><div class="tt">'+esc(t.t)+'</div><div class="dd">'+esc(t.d)+'</div></div><span class="btn sec sm">'+esc(t.b)+'</span></div>'; }).join('')+'</div>':UI.vazio('Tudo em dia por aqui.','✅'))+'</div>';
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
    share:function(){ compartilhar(); },
    kMc:function(){ detalheMargem(p, deps); },
    kCp:function(){ contasPagar(); }
  }));
}

function detalheDia(d, deps){
  var vs=LFI.db.vendas.filter(function(v){ return v.d===d&&deps.indexOf(v.dep)>=0; }), tot=0; vs.forEach(function(v){ tot+=v.valor; });
  var tk=vs.reduce(function(a,v){ return a+v.tickets; },0);
  var h='<div class="vg-dia">'+UI.kpi({lb:'Faturamento', vl:F.moeda(tot), hl:true})+'<div class="vg-dia2">'+UI.kpi({lb:'Tickets', vl:F.num(tk,0)})+UI.kpi({lb:'Ticket médio', vl:F.moeda(tot/Math.max(1,tk))})+'</div></div>';
  vs.forEach(function(v){ h+='<div class="card flat" style="margin-top:10px"><h3 style="margin-bottom:8px">'+UI.dep(v.dep)+'<small>'+F.moeda(v.valor)+' · '+v.tickets+' tickets</small></h3>'+Object.keys(v.cats).map(function(c){ return '<div class="lnr"><span class="k">'+esc(c)+'</span><span class="v">'+F.moeda(v.cats[c])+'</span></div>'; }).join('')+'</div>'; });
  UI.modal({titulo:'Faturamento de '+F.diaSemana(d)+', '+F.data(d), sub:'Detalhe por operação e categoria', corpo:h||UI.vazio('Sem vendas neste dia')});
}

/* ---------- compartilhar resumo do dia por WhatsApp (envio manual agora; automático diário previsto) ---------- */
function cfgShare(){ var c=LFI.db.compartilhar; if(!c){ c=LFI.db.compartilhar={contatos:[{nome:LFI.usuario().nome, fone:'(19) 99700-1122'}], auto:true, hora:'07:00', dia:'ontem'}; } return c; }
function resumoDia(d){
  var deps=LFI.depIds().filter(function(x){ return x!=='cen'; }), vs=LFI.db.vendas.filter(function(v){ return v.d===d&&deps.indexOf(v.dep)>=0; });
  var tot=0, tk=0; vs.forEach(function(v){ tot+=v.valor; tk+=v.tickets; });
  var emp=LFI.empresaAtual(), t='*Resumo de '+F.diaSemana(d)+', '+F.data(d)+'*\n'+(emp?emp.fantasia:LFI.db.grupo.nome)+'\n\n';
  t+='💰 Faturamento: *'+F.moeda(tot)+'*\n🧾 Tickets: '+F.num(tk,0)+' · Ticket médio: '+F.moeda(tot/Math.max(1,tk))+'\n';
  vs.forEach(function(v){ t+='\n*'+LFI.dep(v.dep).nome+'* · '+F.moeda(v.valor)+' ('+v.tickets+' tickets)\n'+Object.keys(v.cats).map(function(c){ return '• '+c+': '+F.moeda(v.cats[c]); }).join('\n')+'\n'; });
  var al=LFI.alertas().filter(function(a){ return a.tipo==='critico'||a.tipo==='baixo'; }).length; if(al) t+='\n⚠️ '+al+' produtos com estoque baixo';
  return t+'\n\nEnviado pelo LivePro';
}
function compartilhar(){
  var c=JSON.parse(JSON.stringify(cfgShare()));
  var m=UI.modal({titulo:'Compartilhar resumo do dia', sub:'Envia o faturamento por WhatsApp para os donos do estabelecimento', tam:'lg', corpo:'', botoes:''});
  function des(){
    var d = c.dia==='hoje' ? LFI.hoje() : LFI.dataUtil.D(-1);
    m.corpoHTML('<div class="sh-sec"><div class="sh-tit">Quem recebe</div>'+
      c.contatos.map(function(x,i){ return '<div class="sh-ct"><input class="inp" placeholder="Nome" data-chg="nome" data-id="'+i+'" value="'+esc(x.nome)+'"><input class="inp" placeholder="(00) 00000-0000" inputmode="tel" data-chg="fone" data-id="'+i+'" value="'+esc(x.fone)+'"><button class="cf-x" data-act="rem" data-id="'+i+'" aria-label="Remover contato">✕</button></div>'; }).join('')+
      '<button class="btn sec sm" data-act="add">'+UI.ic('mais')+'Adicionar contato</button></div>'+
      '<div class="sh-sec"><div class="sh-tit">Envio automático</div><label class="chk"><input type="checkbox" data-chg="auto"'+(c.auto?' checked':'')+'> Enviar todos os dias, no horário</label>'+
      '<div class="sh-hora"><input type="time" class="inp" data-chg="hora" value="'+esc(c.hora)+'"'+(c.auto?'':' disabled')+'><span>com o resumo do dia anterior</span></div></div>'+
      '<div class="sh-sec"><div class="sh-tit">Mensagem <span class="seg" style="margin-left:8px"><button class="'+(c.dia==='ontem'?'on':'')+'" data-act="dia" data-id="ontem">Ontem</button><button class="'+(c.dia==='hoje'?'on':'')+'" data-act="dia" data-id="hoje">Hoje até agora</button></span></div>'+
      '<div class="wa"><div class="wa-hd"><span class="av">'+UI.ic('whats')+'</span><div><b>LivePro</b><small>resumo diário</small></div></div><div class="wa-b out">'+esc(resumoDia(d))+'<span class="h">'+(c.auto?c.hora:LFI.agoraHM())+'</span></div></div></div>'+
      '<p class="cf-obs">Nesta demonstração o envio é simulado. O envio automático fica configurado e passa a funcionar quando o WhatsApp for integrado.</p>');
    m.rodapeHTML('<button class="btn sec esq" data-act="salvar">Salvar configuração</button><button class="btn sec" data-act="_fechar">Fechar</button><button class="btn pri" data-act="env">'+UI.ic('enviar')+'Enviar agora</button>');
  }
  function valido(){ var ok=c.contatos.filter(function(x){ return x.nome.trim()&&x.fone.replace(/\D/g,'').length>=10; }); if(!ok.length){ UI.toast('Cadastre ao menos um contato com nome e telefone','','wt'); return null; } return ok; }
  UI.liga(m.el,{
    nome:function(i,ev){ c.contatos[+i].nome=ev.target.value; }, fone:function(i,ev){ c.contatos[+i].fone=ev.target.value; },
    rem:function(i){ c.contatos.splice(+i,1); des(); }, add:function(){ c.contatos.push({nome:'',fone:''}); des(); },
    auto:function(_,ev){ c.auto=ev.target.checked; des(); }, hora:function(_,ev){ c.hora=ev.target.value||'07:00'; des(); }, dia:function(id){ c.dia=id; des(); },
    salvar:function(){ var ok=valido(); if(!ok) return; c.contatos=ok; LFI.db.compartilhar=c; LFI.salvar(); UI.toast('Configuração salva', c.auto?'Envio automático todos os dias às '+c.hora:'Envio automático desligado'); m.fechar(); },
    env:function(){ var ok=valido(); if(!ok) return; c.contatos=ok; LFI.db.compartilhar=c; (c.envios=c.envios||[]).unshift({em:LFI.agoraISO(), para:ok.map(function(x){ return x.nome; }), dia:c.dia}); LFI.salvar();
      UI.toast('Resumo enviado por WhatsApp', ok.map(function(x){ return x.nome; }).join(', ')); m.fechar(); }
  });
  des();
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

if(!document.getElementById('css-visao')){ var css=document.createElement('style'); css.id='css-visao'; css.textContent='.vg-dia{display:flex;flex-direction:column;gap:12px}.vg-dia2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.vg-dia .kpi .vl{white-space:normal}.vg-share{border-color:#BFE8CF;color:#128C4A}.vg-share svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2}.sh-sec{margin-bottom:18px}.sh-tit{display:flex;align-items:center;font-size:12px;font-weight:800;color:var(--texto2);margin-bottom:8px;text-transform:uppercase;letter-spacing:.4px}.sh-ct{display:grid;grid-template-columns:1fr 1fr 32px;gap:8px;align-items:center;margin-bottom:8px}.sh-ct .cf-x{width:32px;height:32px;border-radius:50%;border:1px solid var(--border2);background:#fff;cursor:pointer;color:var(--muted2)}.sh-hora{display:flex;align-items:center;gap:10px;margin-top:8px}.sh-hora input{width:130px}.sh-hora span{font-size:12.5px;color:var(--muted2);font-weight:600}@media(max-width:700px){.sh-ct{grid-template-columns:1fr 32px}.sh-ct input:nth-child(2){grid-column:1}}@media(max-width:700px){.vg-dsk{display:none!important}}.vg-tarefas{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.vg-tarefas .alr+.alr{margin-top:0}@media(max-width:1100px){.vg-tarefas{grid-template-columns:minmax(0,1fr)}}.vg-filtros{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}.vg-datas{display:flex;gap:12px;flex-wrap:wrap;margin:-4px 0 14px}.vg-datas label{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:800;color:var(--muted2)}.vg-datas input{width:auto}@media(max-width:700px){.vg-filtros{flex-direction:column;align-items:stretch}.vg-per{display:flex;width:100%}.vg-per button{flex:1 1 auto;padding:7px 4px;font-size:12px}.vg-ops{justify-content:center}.vg-datas{display:grid;grid-template-columns:1fr 1fr;gap:10px}.vg-datas label{flex-direction:column;align-items:stretch;gap:4px}.vg-datas input{width:100%}}.vg-tarefas .alr{padding:12px 14px}.vg-tarefas .alr .btn{pointer-events:none;flex:none}.vg-tarefas .alr .tt{font-size:14px}@media(max-width:700px){.vg-tarefas .alr .btn{display:none}}'; document.head.appendChild(css); }
LFI.registrar('visao',{titulo:'Visão Geral', render:render});
})();
