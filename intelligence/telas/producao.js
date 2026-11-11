/* LiveFood Intelligence — PRODUÇÃO
   Quadro de ordens de produção (planejada → em produção → concluída), nova OP com cálculo automático
   de insumos pela ficha técnica, faltas com transferência do central ou solicitação de compra,
   baixa de insumos e entrada do produto acabado na conclusão. */
(function(){
'use strict';
var LFI=window.LFI, UI=LFI.ui, F=LFI.fmt, esc=UI.esc;
var r2=LFI.dataUtil.r2, r3=LFI.dataUtil.r3;
var COLS=[['planejada','Planejadas'],['producao','Em produção'],['concluida','Concluídas']];

function st(){ return LFI.estado.producao = LFI.estado.producao || {dep:'todas', vista:'quadro'}; }
function css(){
  if(document.getElementById('css-producao')) return;
  var s=document.createElement('style'); s.id='css-producao';
  s.textContent=
  '.op-kb{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:start}'+
  '.op-col{background:var(--s3);border:1px solid var(--border);border-radius:var(--r);padding:12px;min-height:160px}'+
  '.op-col>.hd{display:flex;justify-content:space-between;align-items:center;padding:2px 4px 10px;font-size:13px;font-weight:800}'+
  '.op-col>.hd .n{font-size:11px;font-weight:800;background:#fff;border-radius:99px;padding:2px 8px;color:var(--muted2)}'+
  '.op-card{background:var(--s1);border:1px solid var(--border);border-radius:14px;padding:12px 13px;cursor:pointer;box-shadow:var(--sh1);transition:box-shadow .15s,transform .15s}'+
  '.op-card+.op-card{margin-top:10px}'+
  '.op-card:hover{box-shadow:var(--sh2);transform:translateY(-1px)}'+
  '.op-card .t{display:flex;gap:10px;align-items:center}'+
  '.op-card .em{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:22px;flex:none}'+
  '.op-card .t b{display:block;font-size:13.5px;font-weight:800;line-height:1.25}'+
  '.op-card .t small{font-size:11.5px;color:var(--muted);font-weight:700}'+
  '.op-card .q{display:flex;justify-content:space-between;align-items:flex-end;margin-top:10px}'+
  '.op-card .q b{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums}'+
  '.op-card .q small{font-size:11.5px;color:var(--muted);font-weight:700;display:block}'+
  '.op-card .ft{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px;padding-top:9px;border-top:1px solid var(--border);font-size:11.5px;font-weight:700;color:var(--muted2)}'+
  '.op-card .btn{min-height:36px}'+
  '.op-col.producao{background:#FFF6EF;border-color:#FBDCC6}'+
  '.op-col.concluida{background:#F3FBF5;border-color:#CDEBD6}'+
  '.op-nec td.falta{color:var(--red);font-weight:800}'+
  '.op-acoes{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}'+
  '.op-big .btn{min-height:44px;padding:11px 18px;font-size:14px}'+
  '@media (max-width:959px){.op-kb{grid-template-columns:minmax(0,1fr)}}';
  document.head.appendChild(s);
}

/* ---------- cálculos ---------- */
function rec(op){ return LFI.rec(op.rec); }
function lotes(r, qtd){ return qtd/(r.rend||1); }
function custoEst(op){ if(op.custo!=null) return op.custo; var r=rec(op); return r2(LFI.custoReceita(r).bruto*lotes(r,op.qtd)); }
/* necessidade de insumos para produzir qtd (no rendimento da receita) no departamento */
function necessidades(r, qtd, dep){
  var l=lotes(r,qtd);
  return r.ing.filter(function(g){ var p=LFI.prod(g.prod); return p&&p.tipo!=='servico'; }).map(function(g){ var p=LFI.prod(g.prod), need=r3(LFI.converte(g.qtd,g.un,p.un)*l), disp=r3(p.est[dep]||0), cen=dep==='cen'?0:r3(p.est.cen||0);
    var falta=r3(Math.max(0,need-disp)); return {p:p, need:need, disp:disp, cen:cen, falta:falta, transf:r3(Math.min(falta,cen)), compra:r3(Math.max(0,falta-cen)), custo:r2(need*p.custoMedio)}; });
}
function faltasDe(op){ if(op.status==='concluida'||op.status==='cancelada') return []; return necessidades(rec(op),op.qtd,op.dep).filter(function(n){ return n.falta>0; }); }
function movsDe(op){ return LFI.db.movs.filter(function(m){ return m.origem&&(m.origem.id===op.id||m.origem.op===op.id); }); }
function visiveis(){ var s=st(); return LFI.db.producao.filter(function(o){ return LFI.depVisivel(o.dep)&&(s.dep==='todas'||o.dep===s.dep)&&rec(o); }); }
function histDe(op){
  if(op.hist&&op.hist.length) return op.hist;
  var h=[{d:op.data+'T'+(op.inicio?subHora(op.inicio,30):'06:00'), s:'planejada', u:op.resp}];
  if(op.inicio) h.push({d:op.data+'T'+op.inicio, s:'producao', u:op.resp});
  if(op.status==='concluida') h.push({d:op.data+'T'+(op.fim||'08:00'), s:'concluida', u:op.resp});
  if(op.status==='cancelada') h.push({d:op.data+'T12:00', s:'cancelada', u:op.resp});
  return h;
}
function subHora(hm, min){ var a=hm.split(':'), t=(+a[0])*60+(+a[1])-min; if(t<0) t=0; return (t/60<10?'0':'')+Math.floor(t/60)+':'+(t%60<10?'0':'')+(t%60); }

/* ================= QUADRO ================= */
function render(el, arg){
  css(); document.body.classList.add('foco');
  if(arg){ var op=LFI.op(arg); if(op) return detalhe(el, op); }
  var s=st(), ls=visiveis(), hoje=LFI.hoje();
  var hojeL=ls.filter(function(o){ return o.data===hoje; }), concH=hojeL.filter(function(o){ return o.status==='concluida'; });
  var custoH=0; concH.forEach(function(o){ custoH+=custoEst(o); });
  var emProd=ls.filter(function(o){ return o.status==='producao'; });
  var plan=ls.filter(function(o){ return o.status==='planejada'; });
  var comFalta=plan.filter(function(o){ return faltasDe(o).length; });
  var h=UI.cabecalho({titulo:'Produção', sub:'Ordens de produção com baixa automática de insumos pela ficha técnica',
    acoes:'<button class="btn pri" data-act="nova">'+UI.ic('mais')+'Nova ordem de produção</button>'});
  h+='<div class="kpis">'+
    UI.kpi({lb:'OPs de hoje', vl:String(hojeL.length), dl:plan.length+' planejadas · '+F.dataC(hoje), hl:true})+
    UI.kpi({lb:'Em produção', vl:String(emProd.length), dl:emProd.length?esc(emProd.map(function(o){ return rec(o).nome; }).join(', ')):'nenhuma em andamento'})+
    UI.kpi({lb:'Concluídas hoje', vl:String(concH.length), dl:concH.map(function(o){ return F.num(o.qtdReal||o.qtd)+' '+rec(o).rendUn.replace(/\s*\(.*\)/,''); }).join(' · ')||'—'})+
    UI.kpi({lb:'Custo produzido hoje', vl:F.moeda(custoH), dl:'insumos baixados do estoque'})+
  '</div>';
  if(comFalta.length) h+=UI.nota('<b>'+comFalta.length+' ordem(ns) planejada(s) com falta de insumos</b>: '+comFalta.map(function(o){ return '<a class="vertodos" data-act="abrir" data-id="'+o.id+'">'+esc(o.num)+' · '+esc(rec(o).nome)+'</a> ('+faltasDe(o).map(function(n){ return esc(n.p.nome); }).join(', ')+')'; }).join('; ')+'. Transfira do estoque central ou gere a solicitação de compra.','wt','alerta');
  var deps=['todas'].concat(LFI.depIds().filter(function(d){ return d!=='cen'; }));
  h+='<div class="barra"><div class="pills">'+deps.map(function(d){ var dd=LFI.dep(d); return '<button class="pill'+(s.dep===d?' on':'')+'" data-act="dep" data-id="'+d+'">'+(dd?'<i style="background:'+dd.cor+'"></i>'+esc(dd.curto):'Todos os departamentos')+'</button>'; }).join('')+'</div><span class="sp"></span>'+
    '<div class="seg"><button class="'+(s.vista==='quadro'?'on':'')+'" data-act="vista" data-id="quadro">Quadro</button><button class="'+(s.vista==='lista'?'on':'')+'" data-act="vista" data-id="lista">Lista</button></div></div>';
  if(s.vista==='lista') h+='<div class="card pad0 mb"><div id="op-tb" style="padding:4px 8px 8px"></div></div>';
  else {
    h+='<div class="op-kb mb">'+COLS.map(function(c){ var it=ls.filter(function(o){ return o.status===c[0]; }).sort(function(a,b){ return a.data<b.data?1:a.data>b.data?-1:0; });
      return '<div class="op-col '+c[0]+'"><div class="hd"><span>'+UI.status('op',c[0])+'</span><span class="n">'+it.length+'</span></div>'+(it.length?it.map(cartao).join(''):'<div class="vazio" style="padding:20px 8px">Nenhuma ordem</div>')+'</div>'; }).join('')+'</div>';
    var canc=ls.filter(function(o){ return o.status==='cancelada'; });
    if(canc.length) h+='<div class="card mb" style="padding:12px 18px"><h3 style="margin:0 0 6px">Canceladas <span class="n">'+canc.length+'</span></h3>'+canc.map(function(o){ return '<div class="lnr" style="cursor:pointer" data-act="abrir" data-id="'+o.id+'"><span class="k">'+esc(o.num)+' · '+esc(rec(o).nome)+'</span><span class="v">'+F.data(o.data)+'</span></div>'; }).join('')+'</div>';
  }
  h+='<div class="grid g21"><div class="card"><h3>Custo produzido por dia <small>insumos baixados · últimos 7 dias</small></h3><div id="op-g"></div></div>'+
     '<div class="card"><h3>Insumos consumidos hoje <small>baixas de produção</small></h3><div id="op-ins"></div></div></div>';
  el.innerHTML=h;

  if(s.vista==='lista') UI.tabela(el.querySelector('#op-tb'),{linhas:ls, linhaAct:'abrir', ordem:3, dir:-1, colunas:[
    {t:'Ordem', v:function(o){ return '<b>'+esc(o.num)+'</b><small>'+esc(o.resp)+'</small>'; }, ord:function(o){ return o.num; }},
    {t:'Receita', v:function(o){ return rec(o).foto+' '+esc(rec(o).nome); }, ord:function(o){ return rec(o).nome; }},
    {t:'Departamento', v:function(o){ return UI.dep(o.dep); }, ord:function(o){ return o.dep; }},
    {t:'Data', v:function(o){ return F.data(o.data)+'<small>'+(o.inicio?o.inicio+(o.fim?' – '+o.fim:''):'não iniciada')+'</small>'; }, ord:function(o){ return o.data+(o.inicio||''); }},
    {t:'Quantidade', r:true, v:function(o){ return F.num(o.qtd)+'<small>'+(o.qtdReal!=null?'produzido '+F.num(o.qtdReal):esc(rec(o).rendUn))+'</small>'; }, ord:function(o){ return o.qtd; }},
    {t:'Custo', r:true, v:function(o){ return F.moeda(custoEst(o))+'<small>'+(o.custo!=null?'real':'estimado')+'</small>'; }, ord:custoEst},
    {t:'Insumos', v:function(o){ var f=faltasDe(o); return o.status==='planejada'||o.status==='producao'?(f.length?UI.badge(f.length+' em falta','no'):UI.badge('Disponíveis','ok')):'—'; }, ord:function(o){ return faltasDe(o).length; }},
    {t:'Status', v:function(o){ return UI.status('op',o.status); }, ord:function(o){ return o.status; }}
  ]});

  /* custo por dia */
  var dias=[], i; for(i=6;i>=0;i--) dias.push(LFI.dataUtil.D(-i));
  var porDep={}; LFI.depIds().filter(function(d){ return d!=='cen'; }).forEach(function(d){ porDep[d]=dias.map(function(){ return 0; }); });
  LFI.db.movs.forEach(function(m){ if(m.tipo!=='producao'||m.qtd>=0||!m.origem||m.origem.tipo!=='op'||!porDep[m.dep]) return; var k=dias.indexOf(m.d.slice(0,10)); if(k>=0) porDep[m.dep][k]+=Math.abs(m.qtd)*(m.custo||0); });
  var cores={pad:'#E08A1E',res:'#1D4ED8',sus:'#C2185B'};
  UI.grafBarras(el.querySelector('#op-g'),{cats:dias.map(function(d){ return F.diaSemana(d)+' '+F.dataC(d); }), empilhado:true, altura:220, series:Object.keys(porDep).map(function(d){ return {nome:LFI.dep(d).curto, cor:cores[d]||'#888', valores:porDep[d]}; })});
  var ins={}; LFI.db.movs.forEach(function(m){ if(m.tipo!=='producao'||m.qtd>=0||m.d.slice(0,10)!==hoje||!LFI.depVisivel(m.dep)) return; var p=LFI.prod(m.prod); if(!p) return; var o=ins[m.prod]=ins[m.prod]||{nome:p.nome, valor:0, q:0, un:p.un}; o.valor+=Math.abs(m.qtd)*(m.custo||0); o.q+=Math.abs(m.qtd); });
  var il=Object.keys(ins).map(function(k){ var o=ins[k]; return {nome:o.nome, valor:o.valor, sub:F.qtd(o.q,o.un), id:'estoque/'+k}; }).sort(function(a,b){ return b.valor-a.valor; }).slice(0,7);
  el.querySelector('#op-ins').innerHTML=il.length?UI.barrasH(il,{act:'_ir'}):UI.vazio('Nenhuma baixa de produção hoje','🧺');

  UI.liga(el, UI.navHandlers({
    dep:function(id){ s.dep=id; LFI.recarregar(); },
    vista:function(id){ s.vista=id; LFI.recarregar(); },
    abrir:function(id){ LFI.ir('producao', id); },
    nova:function(){ novaOP(); },
    iniciar:function(id,ev){ ev.stopPropagation(); iniciar(LFI.op(id)); },
    concluir:function(id,ev){ ev.stopPropagation(); concluir(LFI.op(id)); }
  }));
  if(s.nova){ var rid=s.nova; s.nova=null; setTimeout(function(){ novaOP(rid); },60); }
}
function cartao(o){
  var r=rec(o), f=faltasDe(o);
  var acao = o.status==='planejada' ? '<button class="btn sec sm" data-act="iniciar" data-id="'+o.id+'">'+UI.ic('play')+'Iniciar</button>' : o.status==='producao' ? '<button class="btn pri sm" data-act="concluir" data-id="'+o.id+'">'+UI.ic('check')+'Concluir</button>' : '<span>'+(o.fim?'Fim '+o.fim:'')+'</span>';
  return '<div class="op-card" data-act="abrir" data-id="'+o.id+'"><div class="t"><span class="em" style="background:'+(r.cor||'#eee')+'">'+r.foto+'</span><span style="min-width:0"><b>'+esc(r.nome)+'</b><small>'+esc(o.num)+' · '+F.relativo(o.data)+(o.inicio?' · '+o.inicio:'')+'</small></span></div>'+
    '<div class="q"><div><b>'+F.num(o.qtdReal!=null?o.qtdReal:o.qtd)+'</b><small>'+esc(r.rendUn)+(o.qtdReal!=null&&o.qtdReal<o.qtd?' · planejado '+F.num(o.qtd):'')+'</small></div><div style="text-align:right"><b style="font-size:14px">'+F.moeda(custoEst(o))+'</b><small>'+(o.custo!=null?'custo real':'custo estimado')+'</small></div></div>'+
    (f.length?'<div style="margin-top:8px">'+UI.badge(f.length+' insumo(s) em falta','no')+'</div>':'')+
    '<div class="ft"><span>'+UI.dep(o.dep)+' · '+esc(o.resp.replace(/\s*\(.*\)/,''))+'</span>'+acao+'</div></div>';
}

/* ================= NOVA OP ================= */
function novaOP(recId){
  var deps=LFI.depIds().filter(function(d){ return d!=='cen'; });
  var recs=LFI.db.receitas.filter(function(r){ return deps.indexOf(r.dep)>=0; });
  if(!recs.length){ UI.toast('Nenhuma receita nas operações da empresa selecionada','','wt'); return; }
  var r0=LFI.rec(recId)&&deps.indexOf(LFI.rec(recId).dep)>=0?LFI.rec(recId):recs[0];
  var d={id:LFI.novoId('op'), rec:r0.id, qtd:sugQtd(r0), dep:r0.dep, resp:respPadrao(r0.dep), data:LFI.hoje(), obs:'', cot:null, transf:0};
  var opts=''; deps.forEach(function(dp){ var rs=recs.filter(function(r){ return r.dep===dp; }); if(!rs.length) return; opts+='<optgroup label="'+esc(LFI.dep(dp).nome)+'">'+rs.map(function(r){ return '<option value="'+r.id+'"'+(r.id===d.rec?' selected':'')+'>'+r.foto+' '+esc(r.nome)+'</option>'; }).join('')+'</optgroup>'; });
  var m=UI.modal({titulo:'Nova ordem de produção', sub:'Insumos calculados automaticamente pela ficha técnica', tam:'xl', fixo:true,
    corpo:'<div class="fgrid c3"><div class="field"><label>Receita</label><select class="inp" data-chg="rec">'+opts+'</select></div>'+
      '<div class="field"><label>Quantidade planejada <span id="np-un" style="color:var(--muted);font-weight:700"></span></label><input class="inp num" id="np-q" data-inp="qtd" value="'+UI.numBR(d.qtd)+'" inputmode="decimal"><div class="hint" id="np-lotes"></div></div>'+
      '<div class="field"><label>Departamento produtor</label><select class="inp" data-chg="dep">'+deps.map(function(x){ return '<option value="'+x+'"'+(x===d.dep?' selected':'')+'>'+esc(LFI.dep(x).nome)+'</option>'; }).join('')+'</select></div>'+
      '<div class="field"><label>Responsável</label><input class="inp" id="np-resp" data-inp="resp" value="'+esc(d.resp)+'"></div>'+
      '<div class="field"><label>Data</label><input type="date" class="inp" data-chg="data" value="'+d.data+'"></div>'+
      '<div class="field"><label>Observação</label><input class="inp" data-inp="obs" placeholder="Ex.: fornada da tarde"></div></div>'+
      '<div id="np-nec"></div>',
    botoes:'<button class="btn sec esq" data-act="_fechar">Cancelar</button><button class="btn sec" data-act="criar" data-id="0">Criar ordem planejada</button><button class="btn pri" data-act="criar" data-id="1">'+UI.ic('play')+'Criar e iniciar</button>',
    acoes:{
      rec:function(_,ev){ var r=LFI.rec(ev.target.value); d.rec=r.id; d.qtd=sugQtd(r); m.el.querySelector('#np-q').value=UI.numBR(d.qtd); if(deps.indexOf(r.dep)>=0){ d.dep=r.dep; m.el.querySelector('[data-chg="dep"]').value=r.dep; d.resp=respPadrao(r.dep); m.el.querySelector('#np-resp').value=d.resp; } nec(); },
      qtd:function(_,ev){ d.qtd=UI.num(ev.target.value); nec(); },
      dep:function(_,ev){ d.dep=ev.target.value; nec(); },
      resp:function(_,ev){ d.resp=ev.target.value; },
      data:function(_,ev){ d.data=ev.target.value; },
      obs:function(_,ev){ d.obs=ev.target.value; },
      transf:function(){ var n=transferir(LFI.rec(d.rec), d.qtd, d.dep, d.id); if(n){ d.transf+=n; UI.toast('Transferência do estoque central registrada', n+' insumo(s) para '+LFI.dep(d.dep).nome); } nec(); },
      compra:function(){ var c=gerarCompra(LFI.rec(d.rec), d.qtd, d.dep, null); if(c){ d.cot=c.id; UI.toast('Solicitação de compra criada', c.num+' · origem: produção','in'); } nec(); },
      verCot:function(){ m.fechar(); LFI.ir('compras', d.cot); },
      criar:function(id){
        var r=LFI.rec(d.rec); if(!(d.qtd>0)){ UI.toast('Informe a quantidade planejada','','wt'); return; }
        var op={id:d.id, num:LFI.proximo('op'), rec:r.id, qtd:d.qtd, dep:d.dep, data:d.data||LFI.hoje(), inicio:null, fim:null, resp:d.resp||LFI.usuario().nome, status:'planejada', obs:d.obs, cot:d.cot, criadoEm:LFI.agoraISO(), hist:[{d:LFI.agoraISO(), s:'planejada', u:LFI.usuario().nome}]};
        if(id==='1'){ op.status='producao'; op.inicio=LFI.agoraHM(); op.hist.push({d:LFI.agoraISO(), s:'producao', u:op.resp}); }
        LFI.db.producao.unshift(op);
        LFI.atividade('producao',op.num+' criada: '+F.num(op.qtd)+' '+r.rendUn+' de '+r.nome+(op.status==='producao'?' (em produção)':''),{tela:'producao',id:op.id});
        LFI.salvar(); m.fechar(); UI.toast('Ordem de produção '+op.num+' criada', r.nome+' · '+F.num(op.qtd)+' '+r.rendUn);
        LFI.ir('producao', op.id);
      }
    }});
  function nec(){
    var r=LFI.rec(d.rec); m.el.querySelector('#np-un').textContent='('+r.rendUn+')';
    m.el.querySelector('#np-lotes').textContent='Ficha técnica rende '+F.num(r.rend)+' '+r.rendUn+' por lote · '+F.num(lotes(r,d.qtd||0),2)+' lote(s)';
    m.el.querySelector('#np-nec').innerHTML=tabelaNec(r, d.qtd||0, d.dep, true, d);
  }
  nec();
}
function sugQtd(r){ return r.rend>=10?r.rend*2:r.rend===1?10:r.rend; }
function respPadrao(dep){ return {pad:'Seu Antônio (padeiro)', res:'Chef Diego', sus:'Chef Hiro'}[dep]||LFI.usuario().nome; }

/* tabela de necessidades com faltas e ações */
function tabelaNec(r, qtd, dep, acoes, d){
  var ns=necessidades(r, qtd, dep), tot=0, falt=ns.filter(function(n){ return n.falta>0; });
  ns.forEach(function(n){ tot+=n.custo; });
  var podeT=falt.some(function(n){ return n.transf>0; }), podeC=falt.some(function(n){ return n.compra>0; });
  var h='<div class="grid g4 mb" style="gap:10px">'+mini('Insumos', String(ns.length))+mini('Custo estimado do lote', F.moeda(tot))+mini('Custo por '+(r.rendUn.replace(/\s*\(.*\)/,'').replace(/s$/,'')||'unidade'), F.moeda(qtd?tot/qtd:0))+mini('Faltas', falt.length?'<span style="color:var(--red)">'+falt.length+' insumo(s)</span>':'<span style="color:var(--green)">Nenhuma</span>')+'</div>';
  h+='<div class="tb-wrap"><table class="tb cp op-nec"><thead><tr><th>Insumo</th><th class="r">Necessário</th><th class="r">Disponível em '+esc(LFI.dep(dep).curto)+'</th><th class="r">Estoque central</th><th class="r">Falta</th><th class="r">Custo</th><th>Situação</th></tr></thead><tbody>';
  ns.forEach(function(n){ h+='<tr class="'+(n.falta>0?'alerta':'')+'"><td><b>'+esc(n.p.nome)+'</b><small>'+F.moeda(n.p.custoMedio)+'/'+n.p.un+'</small></td><td class="r">'+F.qtd(n.need,n.p.un)+'</td><td class="r">'+F.qtd(n.disp,n.p.un)+'</td><td class="r">'+(dep==='cen'?'—':F.qtd(n.cen,n.p.un))+'</td><td class="r'+(n.falta>0?' falta':'')+'">'+(n.falta>0?F.qtd(n.falta,n.p.un):'—')+'</td><td class="r">'+F.moeda(n.custo)+'</td><td>'+
    (n.falta<=0?UI.badge('Disponível','ok'):n.compra<=0?UI.badge('Transferir do central','wt'):n.transf>0?UI.badge('Central parcial + compra','no'):UI.badge('Comprar','no'))+'</td></tr>'; });
  h+='</tbody><tfoot><tr><td>Total</td><td colspan="4"></td><td class="r">'+F.moeda(tot)+'</td><td></td></tr></tfoot></table></div>';
  if(acoes&&falt.length){
    h+='<div class="op-acoes">'+(podeT?'<button class="btn sec" data-act="transf">'+UI.ic('caminhao')+'Transferir do estoque central</button>':'')+
      (podeC&&!(d&&d.cot)?'<button class="btn sec" data-act="compra">'+UI.ic('compras')+'Gerar solicitação de compra</button>':'')+'</div>';
  }
  if(d&&d.transf) h+=UI.nota(d.transf+' transferência(s) do estoque central registradas para esta ordem.','ok','check');
  if(d&&d.cot){ var c=LFI.cotacao(d.cot); if(c) h+=UI.nota('Solicitação de compra <b>'+esc(c.num)+'</b> criada com '+c.itens.length+' item(ns) (origem: produção). <a class="vertodos" data-act="verCot">Abrir cotação</a>','in','compras'); }
  if(acoes&&!falt.length&&qtd>0) h+=UI.nota('Todos os insumos estão disponíveis em '+esc(LFI.dep(dep).nome)+'.','ok','check');
  return h;
}
function mini(lb, vl){ return '<div class="kpi" style="padding:11px 13px"><div class="lb">'+lb+'</div><div class="vl" style="font-size:18px">'+vl+'</div></div>'; }
function transferir(r, qtd, dep, opId){
  var n=0;
  necessidades(r, qtd, dep).forEach(function(x){ if(x.transf<=0) return;
    LFI.movimentar({prod:x.p.id, dep:'cen', tipo:'transferencia', qtd:-x.transf, origem:{tipo:'transf', para:dep, op:opId}, obs:'Para '+LFI.dep(dep).nome+' (ordem de produção)'});
    LFI.movimentar({prod:x.p.id, dep:dep, tipo:'transferencia', qtd:x.transf, origem:{tipo:'transf', de:'cen', op:opId}, obs:'Do estoque central (ordem de produção)'});
    n++; });
  if(n){ LFI.atividade('estoque',n+' insumo(s) transferidos do central para '+LFI.dep(dep).nome+' ('+r.nome+')',{tela:'estoque'}); LFI.salvar(); }
  return n;
}
function gerarCompra(r, qtd, dep, op){
  var itens=necessidades(r, qtd, dep).filter(function(x){ return x.compra>0; }).map(function(x){ var q=x.p.un==='un'?Math.ceil(x.compra):Math.ceil(x.compra*10)/10; return {prod:x.p.id, qtd:q}; });
  if(!itens.length) return null;
  var c=LFI.criarCotacao({itens:itens, dep:dep, origem:'producao', obs:'Necessidade da produção: '+F.num(qtd)+' '+r.rendUn+' de '+r.nome+(op?' ('+op.num+')':'')});
  if(op){ op.cot=c.id; LFI.salvar(); }
  return c;
}

/* ================= DETALHE DA OP ================= */
function detalhe(el, op){
  var r=rec(op), emp=LFI.empresaDoDep(op.dep), hist=histDe(op), movs=movsDe(op);
  var idx=op.status==='planejada'?0:op.status==='producao'?1:op.status==='concluida'?3:0;
  var acoes='';
  if(op.status==='planejada') acoes='<button class="btn no" data-act="cancelar">Cancelar ordem</button><button class="btn pri" data-act="iniciar">'+UI.ic('play')+'Iniciar produção</button>';
  else if(op.status==='producao') acoes='<button class="btn no" data-act="cancelar">Cancelar ordem</button><button class="btn pri" data-act="concluir">'+UI.ic('check')+'Concluir produção</button>';
  acoes='<button class="btn sec" data-act="pdf">'+UI.ic('imprimir')+'Imprimir</button>'+acoes;
  var h=UI.cabecalho({migalha:[{t:'Produção',ir:'producao'},{t:op.num}], titulo:esc(op.num)+' · '+esc(r.nome)+' '+UI.status('op',op.status), sub:esc(LFI.dep(op.dep).nome)+' · '+esc(emp.fantasia)+' · '+F.data(op.data)+' · responsável '+esc(op.resp), acoes:'<span class="op-big" style="display:flex;gap:8px;flex-wrap:wrap">'+acoes+'</span>'});
  if(!LFI.depVisivel(op.dep)) h+=UI.nota('Ordem de outro CNPJ (fora da empresa selecionada). Exibida somente para consulta.','wt');
  if(op.status==='cancelada') h+=UI.nota('Ordem cancelada'+(op.motivoCanc?': '+esc(op.motivoCanc):'')+'. Nenhuma baixa de estoque foi feita.','wt','x');
  else h+='<div class="card mb" style="padding:16px 20px 2px">'+UI.passos(['Planejada','Em produção','Concluída'], idx)+'</div>';
  var custo=custoEst(op), qProd=op.qtdReal!=null?op.qtdReal:null;
  h+='<div class="kpis">'+
    UI.kpi({lb:'Quantidade planejada', vl:F.num(op.qtd)+' <small>'+esc(r.rendUn)+'</small>', dl:F.num(lotes(r,op.qtd),2)+' lote(s) da ficha técnica'})+
    UI.kpi({lb:'Quantidade produzida', vl:qProd!=null?F.num(qProd)+' <small>'+esc(r.rendUn)+'</small>':'—', dl:op.perda&&op.perda.qtd?'<span style="color:var(--red)">perda de '+F.num(op.perda.qtd)+' ('+F.moeda(op.perda.valor)+')</span>':(qProd!=null?'sem perdas':'aguardando conclusão')})+
    UI.kpi({lb:op.custo!=null?'Custo real do lote':'Custo estimado do lote', vl:F.moeda(custo), dl:'insumos ao custo médio', hl:true})+
    UI.kpi({lb:'Custo unitário', vl:F.moeda(custo/((qProd||op.qtd)||1)), dl:'ficha técnica: '+F.moeda(LFI.custoReceita(r).porcao)+' por '+esc(r.vendaUn||'un')})+
  '</div>';
  h+='<div class="grid g21 mb"><div class="card"><h3><span class="lft">'+UI.ic('receita')+' '+(op.status==='concluida'?'Insumos baixados':'Insumos necessários')+'</span><a class="vertodos" data-act="_ir" data-id="receitas/'+r.id+'">Ver ficha técnica</a></h3><div id="op-ins"></div></div>'+
    '<div class="card"><h3>Andamento</h3><div class="kv" style="margin-bottom:16px"><div><span>Receita</span><b>'+r.foto+' '+esc(r.nome)+'</b></div><div><span>Departamento</span><b>'+esc(LFI.dep(op.dep).nome)+'</b></div><div><span>Início</span><b>'+(op.inicio||'—')+'</b></div><div><span>Fim</span><b>'+(op.fim||'—')+'</b></div>'+
      '<div><span>Produto acabado</span><b>'+(r.acabado&&LFI.prod(r.acabado)?'<a class="vertodos" data-act="_ir" data-id="estoque/'+r.acabado+'">'+esc(LFI.prod(r.acabado).nome)+'</a>':'<small>consumo imediato</small>')+'</b></div><div><span>Solicitação de compra</span><b>'+(op.cot&&LFI.cotacao(op.cot)?'<a class="vertodos" data-act="_ir" data-id="compras/'+op.cot+'">'+esc(LFI.cotacao(op.cot).num)+'</a>':'—')+'</b></div></div>'+
      (op.obs?UI.nota(esc(op.obs),'','info'):'')+
      '<div class="tl">'+hist.map(function(x,i){ var lb={planejada:'Ordem planejada', producao:'Produção iniciada', concluida:'Produção concluída', cancelada:'Ordem cancelada'}[x.s]||x.s; return '<div class="tl-it '+(i===hist.length-1&&op.status!=='concluida'&&op.status!=='cancelada'?'on':'ok')+'"><b>'+lb+'</b><small>'+F.dataHora(x.d)+' · '+esc(x.u||'')+(x.obs?' · '+esc(x.obs):'')+'</small></div>'; }).join('')+
      (op.status==='planejada'?'<div class="tl-it"><b style="color:var(--muted)">Início da produção</b><small>pendente</small></div>':'')+(op.status!=='concluida'&&op.status!=='cancelada'?'<div class="tl-it"><b style="color:var(--muted)">Conclusão e baixa de estoque</b><small>pendente</small></div>':'')+'</div></div></div>';
  h+='<div class="card"><h3><span class="lft">'+UI.ic('estoque')+' Movimentações de estoque geradas <span class="n">'+movs.length+'</span></span><small>rastreáveis por esta ordem</small></h3><div id="op-mov"></div></div>';
  el.innerHTML=h;

  var box=el.querySelector('#op-ins');
  if(op.status==='concluida'){
    var cons=movs.filter(function(m){ return m.tipo==='producao'&&m.qtd<0; });
    if(cons.length){ var t=0; box.innerHTML='<div class="tb-wrap"><table class="tb cp"><thead><tr><th>Insumo</th><th class="r">Baixado</th><th class="r">Custo unit.</th><th class="r">Custo</th></tr></thead><tbody>'+cons.map(function(m){ var p=LFI.prod(m.prod), v=Math.abs(m.qtd)*(m.custo||0); t+=v; return '<tr><td><b>'+esc(p.nome)+'</b></td><td class="r">'+F.qtd(Math.abs(m.qtd),p.un)+'</td><td class="r">'+F.moeda(m.custo)+'/'+p.un+'</td><td class="r">'+F.moeda(v)+'</td></tr>'; }).join('')+'</tbody><tfoot><tr><td>Total</td><td></td><td></td><td class="r">'+F.moeda(t)+'</td></tr></tfoot></table></div>'; }
    else box.innerHTML=tabelaNec(r, op.qtd, op.dep, false);
  } else if(op.status==='cancelada') box.innerHTML=tabelaNec(r, op.qtd, op.dep, false);
  else box.innerHTML=tabelaNec(r, op.qtd, op.dep, true, {cot:op.cot, transf:movs.filter(function(m){ return m.tipo==='transferencia'&&m.qtd>0; }).length});

  UI.tabela(el.querySelector('#op-mov'),{linhas:movs, vazio:op.status==='concluida'?'Sem movimentações registradas.':'As baixas de insumos e a entrada do produto acabado serão registradas ao concluir a produção.', colunas:[
    {t:'Data', v:function(m){ return F.dataHora(m.d); }, ord:function(m){ return m.d; }},
    {t:'Produto', v:function(m){ var p=LFI.prod(m.prod); return p?'<a class="vertodos" style="color:var(--text)" data-act="_ir" data-id="estoque/'+p.id+'">'+esc(p.nome)+'</a>':'—'; }, ord:function(m){ var p=LFI.prod(m.prod); return p?p.nome:''; }},
    {t:'Local', v:function(m){ return UI.dep(m.dep); }, ord:function(m){ return m.dep; }},
    {t:'Tipo', v:function(m){ var t=LFI.TIPOS_MOV[m.tipo]||[m.tipo,'nu']; return UI.badge(m.qtd>0&&m.tipo==='producao'?'Produto acabado':t[0], m.qtd>0&&m.tipo==='producao'?'ok':t[1]); }, ord:function(m){ return m.tipo; }},
    {t:'Quantidade', r:true, v:function(m){ var p=LFI.prod(m.prod); return '<b style="color:var('+(m.qtd<0?'--red':'--green')+')">'+(m.qtd>0?'+':'')+F.qtd(m.qtd,p?p.un:'')+'</b>'; }, ord:function(m){ return m.qtd; }},
    {t:'Custo', r:true, v:function(m){ return m.custo!=null?F.moeda(m.custo):'—'; }, ord:function(m){ return m.custo||0; }},
    {t:'Usuário', v:function(m){ return esc(m.usuario)+(m.obs?'<small>'+esc(m.obs)+'</small>':''); }, ord:function(m){ return m.usuario; }}
  ]});

  UI.liga(el, UI.navHandlers({
    iniciar:function(){ iniciar(op); },
    concluir:function(){ concluir(op); },
    cancelar:function(){ UI.confirmar('Cancelar '+op.num,'A ordem de produção de <b>'+esc(r.nome)+'</b> será cancelada. Nenhum insumo foi baixado do estoque.','Cancelar ordem',function(){
      op.hist=histDe(op).slice(); op.status='cancelada'; op.hist.push({d:LFI.agoraISO(), s:'cancelada', u:LFI.usuario().nome}); LFI.atividade('producao',op.num+' cancelada ('+r.nome+')',{tela:'producao',id:op.id}); LFI.salvar(); UI.toast(op.num+' cancelada','','wt'); LFI.recarregar(); },'esc'); },
    transf:function(){ var n=transferir(r, op.qtd, op.dep, op.id); if(n) UI.toast('Transferência registrada', n+' insumo(s) do estoque central para '+LFI.dep(op.dep).nome); LFI.recarregar(); },
    compra:function(){ var c=gerarCompra(r, op.qtd, op.dep, op); if(c) UI.toast('Solicitação de compra '+c.num+' criada','Origem: produção ('+op.num+')','in'); LFI.recarregar(); },
    verCot:function(){ LFI.ir('compras', op.cot); },
    pdf:function(){ imprimir(op); }
  }));
}

/* ---------- ações ---------- */
function iniciar(op){
  var f=faltasDe(op), r=rec(op);
  function vai(){ op.hist=histDe(op).slice(); op.status='producao'; op.inicio=LFI.agoraHM(); op.hist.push({d:LFI.agoraISO(), s:'producao', u:op.resp}); LFI.atividade('producao',op.num+' iniciada: '+F.num(op.qtd)+' '+r.rendUn+' de '+r.nome,{tela:'producao',id:op.id}); LFI.salvar(); UI.toast('Produção iniciada', op.num+' · '+r.nome); LFI.recarregar(); }
  if(f.length) UI.confirmar('Iniciar com insumos em falta?','Faltam '+f.map(function(n){ return esc(n.p.nome)+' ('+F.qtd(n.falta,n.p.un)+')'; }).join(', ')+' em '+esc(LFI.dep(op.dep).nome)+'. Recomenda-se transferir do estoque central antes de iniciar.','Iniciar mesmo assim',vai,'esc');
  else vai();
}
function concluir(op){
  var r=rec(op), ns=necessidades(r, op.qtd, op.dep), falt=ns.filter(function(n){ return n.falta>0; }), tot=0; ns.forEach(function(n){ tot+=n.custo; });
  var aca=r.acabado?LFI.prod(r.acabado):null;
  var m=UI.modal({titulo:'Concluir '+op.num, sub:esc(r.nome)+' · '+esc(LFI.dep(op.dep).nome), tam:'lg', fixo:true,
    corpo:'<div class="fgrid"><div class="field"><label>Quantidade efetivamente produzida ('+esc(r.rendUn)+')</label><input class="inp num" id="cq" style="font-size:20px;padding:12px 14px" value="'+UI.numBR(op.qtd)+'" data-inp="q" inputmode="decimal"><div class="hint">Planejado: '+F.num(op.qtd)+' '+esc(r.rendUn)+'</div></div>'+
      '<div class="field"><label>Motivo da diferença (se houver)</label><select class="inp" id="cm"><option value="">—</option><option>Queima no forno</option><option>Massa fora do ponto</option><option>Quebra no manuseio</option><option>Peso abaixo do padrão</option><option>Outro</option></select></div></div>'+
      '<div id="c-res"></div>'+
      (falt.length?UI.nota('<b>Atenção:</b> saldo insuficiente de '+falt.map(function(n){ return esc(n.p.nome); }).join(', ')+' em '+esc(LFI.dep(op.dep).nome)+'. A baixa deixará saldo negativo, que aparecerá como divergência no estoque.','wt','alerta'):'')+
      UI.nota('Ao concluir: baixa de '+ns.length+' insumos em '+esc(LFI.dep(op.dep).nome)+(aca?' e entrada de <b>'+esc(aca.nome)+'</b> no estoque com o custo real do lote.':'. Esta receita não tem produto acabado em estoque (consumo imediato).'),'in'),
    botoes:'<button class="btn sec" data-act="_fechar">Voltar</button><button class="btn pri" data-act="ok">'+UI.ic('check')+'Concluir e baixar estoque</button>',
    acoes:{q:function(){ res(); }, ok:function(){
      var q=UI.num(m.el.querySelector('#cq').value); if(!(q>0)){ UI.toast('Informe a quantidade produzida','','wt'); return; }
      var motivo=m.el.querySelector('#cm').value, custo=0; op.hist=histDe(op).slice();
      ns.forEach(function(n){ var res=LFI.movimentar({prod:n.p.id, dep:op.dep, tipo:'producao', qtd:-n.need, origem:{tipo:'op', id:op.id}, usuario:op.resp, obs:op.num}); custo+=n.need*res.mov.custo; });
      custo=r2(custo); var cu=r2(custo/q);
      if(aca){ var base=Math.max(0,LFI.estoqueGeral(aca)), cm=aca.custoMedio;
        LFI.movimentar({prod:aca.id, dep:op.dep, tipo:'producao', qtd:q, custo:cu, origem:{tipo:'op', id:op.id}, usuario:op.resp, obs:'Entrada de produto acabado ('+op.num+')'});
        aca.custoMedio=r2(base+q>0?(base*cm+q*cu)/(base+q):cu); aca.ultimoCusto=cu; aca.hist.push({d:LFI.hoje(), v:aca.custoMedio, origem:op.num}); }
      op.status='concluida'; op.fim=LFI.agoraHM(); op.qtdReal=q; op.custo=custo; op.custoUn=cu;
      if(q<op.qtd) op.perda={qtd:r3(op.qtd-q), valor:r2((op.qtd-q)*cu), motivo:motivo||'Não informado'};
      op.hist.push({d:LFI.agoraISO(), s:'concluida', u:op.resp, obs:F.num(q)+' '+r.rendUn+(op.perda?' · perda '+F.num(op.perda.qtd)+' ('+op.perda.motivo+')':'')});
      LFI.atividade('producao',op.num+' concluída: '+F.num(q)+' '+r.rendUn+' de '+r.nome+' · '+F.moeda(custo),{tela:'producao',id:op.id});
      LFI.salvar(); m.fechar(); UI.toast('Produção concluída', ns.length+' insumos baixados'+(aca?' · '+F.num(q)+' '+aca.un+' de '+aca.nome+' no estoque':'')); LFI.recarregar();
    }}});
  function res(){ var q=UI.num(m.el.querySelector('#cq').value), p=q<op.qtd?op.qtd-q:0;
    m.el.querySelector('#c-res').innerHTML='<div class="grid g4" style="gap:10px;margin-bottom:14px">'+mini('Custo dos insumos', F.moeda(tot))+mini('Custo unitário real', F.moeda(q>0?tot/q:0))+mini('Ficha técnica', F.moeda(LFI.custoReceita(r).bruto/r.rend))+mini('Perda', p?'<span style="color:var(--red)">'+F.num(p)+' · '+F.moeda(p*(q>0?tot/q:0))+'</span>':'<span style="color:var(--green)">Nenhuma</span>')+'</div>'; }
  res();
}
function imprimir(op){
  var r=rec(op), ns=necessidades(r, op.qtd, op.dep), tot=0; ns.forEach(function(n){ tot+=n.custo; });
  var h='<div class="kp"><div><span>Receita</span><b>'+esc(r.nome)+'</b></div><div><span>Quantidade</span><b>'+F.num(op.qtd)+' '+esc(r.rendUn)+'</b></div><div><span>Departamento</span><b>'+esc(LFI.dep(op.dep).nome)+'</b></div><div><span>Status</span><b>'+LFI.STATUS.op[op.status][0]+'</b></div></div>'+
    '<h2>Insumos</h2><table><thead><tr><th>Insumo</th><th class="r">Quantidade</th><th class="r">Custo unit.</th><th class="r">Custo</th></tr></thead><tbody>'+ns.map(function(n){ return '<tr><td>'+esc(n.p.nome)+'</td><td class="r">'+F.qtd(n.need,n.p.un)+'</td><td class="r">'+F.moeda(n.p.custoMedio)+'</td><td class="r">'+F.moeda(n.custo)+'</td></tr>'; }).join('')+'</tbody><tfoot><tr><td colspan="3">Custo estimado</td><td class="r">'+F.moeda(tot)+'</td></tr></tfoot></table>'+
    '<h2>Modo de preparo</h2><p>'+esc(r.modo||'—')+'</p><h2>Apontamento</h2><table><tbody><tr><td>Início: ________</td><td>Fim: ________</td><td>Produzido: ________</td><td>Responsável: '+esc(op.resp)+'</td></tr></tbody></table>';
  UI.exportarPDF('Ordem de produção '+op.num, F.data(op.data)+' · '+LFI.empresaDoDep(op.dep).fantasia, h);
}

LFI.registrar('producao',{titulo:'Produção', render:render});
})();
