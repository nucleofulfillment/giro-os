/* LiveFood Intelligence — ESTOQUE INTELIGENTE
   Estoque centralizado separado por departamento (Padaria, Restaurante, Sushi, Estoque central),
   alertas, ficha completa do produto (conversões, custos, receitas, fornecedores, movimentos),
   ajuste de inventário, transferências, saídas/perdas, movimentações e sugestão de compra.
   Toda alteração de saldo passa por LFI.movimentar. */
(function(){
'use strict';
var LFI=window.LFI, UI=LFI.ui, F=LFI.fmt, esc=UI.esc;
var r2=LFI.dataUtil.r2, r3=LFI.dataUtil.r3;
var ORDEM_DEP=['pad','res','sus','cen'];

function st(){ return LFI.estado.estoque = LFI.estado.estoque || {aba:'pos', dep:'todos', q:'', cat:'', sit:'', alr:'todos', alrTodos:false, mvTipo:'', mvPer:'30d', mvQ:'', mult:2, sel:{}, sq:{}}; }
function depsOrd(){ return ORDEM_DEP.filter(function(d){ return LFI.depVisivel(d); }); }
function depsSel(){ var s=st(); if(s.dep!=='todos'&&!LFI.depVisivel(s.dep)) s.dep='todos'; return s.dep==='todos'?LFI.depIds():[s.dep]; }

function css(){
  if(document.getElementById('css-estoque')) return;
  var s=document.createElement('style'); s.id='css-estoque';
  s.textContent=[
    '.tela-estoque .grid>.card+.card{margin-top:0}',
    '.tela-estoque .kv span.badge,.tela-estoque .kv span.tag,.tela-estoque .kv span.var{display:inline-flex;text-transform:none;letter-spacing:0;margin:0 4px 0 0}',
    '.kpis.k6{grid-template-columns:repeat(6,minmax(0,1fr))}',
    '.kpis.k6 .kpi .vl{font-size:22px}',
    '.es-alr{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}',
    '.es-alr .alr+.alr{margin-top:0}',
    '.es-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}',
    '.es-qd{display:flex;gap:4px;flex-wrap:wrap;margin-top:3px}',
    '.es-qd span{font-size:10.5px;font-weight:800;color:var(--muted2);background:var(--s3);border-radius:5px;padding:1px 5px;white-space:nowrap}',
    '.es-qd span i{display:inline-block;width:6px;height:6px;border-radius:2px;margin-right:4px;vertical-align:1px}',
    '.es-dep{display:flex;flex-direction:column;gap:14px}',
    '.es-dep .it{display:grid;grid-template-columns:130px minmax(0,1fr) 110px;gap:12px;align-items:center}',
    '.es-dep .nm{font-size:12.5px;font-weight:800;display:flex;align-items:center;gap:7px}',
    '.es-dep .nm i{width:9px;height:9px;border-radius:3px;display:block}',
    '.es-dep .nm small{display:block;font-size:10.5px;color:var(--muted);font-weight:700}',
    '.es-dep .bw{position:relative;height:14px;border-radius:99px;background:var(--s4);overflow:visible}',
    '.es-dep .bw b{position:absolute;left:0;top:0;bottom:0;border-radius:99px;transition:width .5s}',
    '.es-dep .bw .mk{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--red);border-radius:2px}',
    '.es-dep .vl{text-align:right;font-size:13px;font-weight:800;font-variant-numeric:tabular-nums}',
    '.es-dep .vl small{display:block;font-size:11px;color:var(--muted);font-weight:700}',
    '.es-conv{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:14px;border-radius:12px;background:var(--s2);border:1px solid var(--border);margin-bottom:12px}',
    '.es-conv .bl{background:#fff;border:1px solid var(--border);border-radius:10px;padding:8px 12px;text-align:center;min-width:92px}',
    '.es-conv .bl b{display:block;font-size:16px;font-weight:800;font-variant-numeric:tabular-nums}',
    '.es-conv .bl small{font-size:10.5px;color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.4px}',
    '.es-conv .eq{font-size:18px;font-weight:800;color:var(--muted)}',
    '.es-calc{display:grid;grid-template-columns:minmax(0,1fr) 90px;gap:8px;align-items:end;margin-bottom:10px}',
    '.es-res{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}',
    '.es-res div{background:var(--lf-soft);border-radius:10px;padding:9px 11px}',
    '.es-res span{display:block;font-size:10px;font-weight:800;color:var(--roxo-esc);text-transform:uppercase;letter-spacing:.4px}',
    '.es-res b{font-size:16px;font-weight:800;font-variant-numeric:tabular-nums}',
    '.es-fo{display:flex;align-items:center;gap:12px;padding:10px 4px;border-bottom:1px solid var(--border)}',
    '.es-fo:last-child{border-bottom:0}',
    '.es-fo .gr{flex:1;min-width:0}',
    '.es-fo .gr b{font-size:13px;font-weight:800;display:block}',
    '.es-fo .gr small{font-size:11.5px;color:var(--muted);font-weight:600}',
    '.es-fo .rt{text-align:right;font-weight:800;font-variant-numeric:tabular-nums}',
    '.es-fo .rt small{display:block;font-size:11px;color:var(--muted);font-weight:600}',
    '.es-sug td .inp{width:96px}',
    '@media (max-width:1280px){.kpis.k6{grid-template-columns:repeat(3,minmax(0,1fr))}}',
    '@media (max-width:1100px){.es-alr{grid-template-columns:minmax(0,1fr)}}',
    '@media (max-width:700px){.kpis.k6{grid-template-columns:repeat(2,minmax(0,1fr))}.es-dep .it{grid-template-columns:96px minmax(0,1fr) 84px}.es-res{grid-template-columns:minmax(0,1fr)}}'
  ].join('\n');
  document.head.appendChild(s);
}

/* ---------- consultas da tela ---------- */
function produtosVis(){
  var s=st(), deps=depsSel();
  return LFI.db.produtos.filter(function(p){
    if(p.tipo==='sobra'&&LFI.estoqueGeral(p)<=0) return false;
    if(s.dep!=='todos') return Math.abs(p.est[s.dep]||0)>0.0001 || (p.contado&&p.contado.dep===s.dep);
    return deps.some(function(d){ return (p.est[d]||0)>0; }) || p.tipo==='insumo';
  });
}
function alertasVis(lista){ var ids={}; lista.forEach(function(p){ ids[p.id]=1; }); return LFI.alertas().filter(function(a){ return ids[a.prod]; }); }
function sugQtd(p, mult){ var alvo=p.estMin*(mult||2), falta=alvo-LFI.estoqueGeral(p), fat=(p.conv&&p.conv.fator)||1; if(falta<=0) return 0; return r3(Math.ceil(falta/fat-1e-9)*fat); }
function depEntrega(){ var s=st(), v=LFI.depIds(); if(s.dep!=='todos') return s.dep; return v.indexOf('cen')>=0?'cen':v[0]; }
function consumo30(p){ var lim=LFI.dataUtil.D(-29), t=0; LFI.db.movs.forEach(function(m){ if(m.prod!==p.id||m.d.slice(0,10)<lim||m.qtd>=0) return; if(m.tipo==='transferencia') return; t+=-m.qtd; }); return r3(t); }
function origemLink(m){
  var o=m.origem; if(!o) return '<small>'+esc(m.obs||'—')+'</small>';
  if(o.tipo==='nf'){ var n=LFI.nota(o.id); return '<a class="vertodos" data-act="_ir" data-id="notas/'+o.id+'">NF '+esc(n?n.numero:o.id)+'</a>'; }
  if(o.tipo==='op'){ var op=LFI.op(o.id); return '<a class="vertodos" data-act="_ir" data-id="producao/'+o.id+'">'+esc(op?op.num:o.id)+'</a>'; }
  if(o.tipo==='buffet'){ var b=LFI.buffet(o.id); return '<a class="vertodos" data-act="_ir" data-id="buffet/'+o.id+'">'+esc(b?b.num:o.id)+'</a>'; }
  if(o.tipo==='transf'){ var d=LFI.dep(o.para||o.de); return '<span class="tag">'+(o.para?'Para ':'De ')+esc(d?d.curto:(o.para||o.de))+'</span>'; }
  if(o.tipo==='inventario') return '<span class="tag">Inventário</span>';
  return '<small>'+esc(m.obs||o.tipo)+'</small>';
}
/* barra segmentada com a distribuição do saldo entre departamentos */
function segBar(p){ var ds=depsOrd().filter(function(d){ return (p.est[d]||0)>0; }), t=0; ds.forEach(function(d){ t+=p.est[d]; }); if(!t) return '<small>sem saldo</small>';
  var tip=ds.map(function(d){ return LFI.dep(d).curto+' '+F.qtd(p.est[d],p.un); }).join(' · ');
  return '<div title="'+esc(tip)+'" style="display:flex;height:6px;border-radius:99px;overflow:hidden;width:96px;margin:5px 0 3px auto;background:var(--s4)">'+ds.map(function(d){ return '<i style="display:block;width:'+(p.est[d]/t*100).toFixed(1)+'%;background:'+LFI.dep(d).cor+'"></i>'; }).join('')+'</div><small style="white-space:nowrap">'+(ds.length===1?esc(LFI.dep(ds[0]).curto):ds.map(function(d){ return esc(LFI.dep(d).curto.slice(0,3))+' '+F.num(p.est[d],p.un==='un'?0:1); }).join(' · '))+'</small>'; }
function tipoBadge(t){ var x=LFI.TIPOS_MOV[t]||[t,'nu']; return UI.badge(x[0], x[1]); }
function validadeTxt(p){ var dv=LFI.diasParaVencer(p); if(dv==null) return '<small>—</small>'; var c=dv<0?'var(--red)':dv<=3?'var(--red)':dv<=7?'#946C00':'var(--muted)'; return F.data(p.validade)+'<small style="color:'+c+'">'+(dv<0?'vencido há '+(-dv)+' d':dv===0?'vence hoje':'em '+dv+' dias')+'</small>'; }
function selProd(sel){ var h='<option value="">Selecione o produto…</option>'; LFI.db.categorias.forEach(function(c){ var ps=LFI.db.produtos.filter(function(p){ return p.cat===c.id&&(p.tipo!=='sobra'||LFI.estoqueGeral(p)>0); }); if(!ps.length) return; h+='<optgroup label="'+esc(c.nome)+'">'+ps.map(function(p){ return '<option value="'+p.id+'"'+(p.id===sel?' selected':'')+'>'+esc(p.nome)+' ('+p.un+')</option>'; }).join('')+'</optgroup>'; }); return h; }
function optDeps(sel, todos){ var ls=todos?LFI.db.departamentos:LFI.depsVisiveis(); return ls.map(function(d){ return '<option value="'+d.id+'"'+(d.id===sel?' selected':'')+'>'+esc(d.nome)+' — '+esc(LFI.emp(d.empresa).fantasia)+'</option>'; }).join(''); }

/* ---------- roteador ---------- */
function render(el, arg){
  css();
  if(arg){ var p=LFI.prod(arg); if(!p){ el.innerHTML=UI.cabecalho({titulo:'Produto não encontrado', migalha:[{t:'Estoque', ir:'estoque'},{t:'Não encontrado'}]})+'<div class="card">'+UI.vazio('Este produto não existe na base de demonstração.','🔎')+'</div>'; UI.liga(el,UI.navHandlers({})); return; } return ficha(el, p.id); }
  principal(el);
}

/* =====================================================================
   VISÃO PRINCIPAL
   ===================================================================== */
function principal(el){
  var s=st(), deps=depsSel(), lista=produtosVis(), alr=alertasVis(lista), emp=LFI.empresaAtual();
  var vEst=0, comSaldo=0; lista.forEach(function(p){ vEst+=LFI.valorEstoque(p,deps); if(LFI.estoque(p,deps)>0) comSaldo++; });
  var cnt=function(t){ return alr.filter(function(a){ return t.indexOf(a.tipo)>=0; }); };
  var baixos=cnt(['baixo','critico']), crit=cnt(['critico']), venc=cnt(['validade']), par=cnt(['parado']), div=cnt(['divergencia']);
  var vPar=0; par.forEach(function(a){ vPar+=LFI.valorEstoque(a.prod,['cen','pad','res','sus']); });
  var v7=lista.filter(function(p){ var d=LFI.diasParaVencer(p); return d!=null&&d<=7&&LFI.estoque(p,deps)>0&&p.tipo==='insumo'; }).length;
  var vDiv=0; div.forEach(function(a){ var p=LFI.prod(a.prod); vDiv+=(p.contado.qtd-(p.est[p.contado.dep]||0))*p.custoMedio; });
  var nSug=LFI.db.produtos.filter(function(p){ return p.tipo==='insumo'&&['baixo','critico'].indexOf(LFI.situacao(p))>=0&&lista.indexOf(p)>=0; }).length;

  var h=UI.cabecalho({titulo:'Estoque Inteligente', sub:(emp?esc(emp.fantasia)+' · CNPJ '+emp.cnpj:esc(LFI.db.grupo.nome)+' · estoque centralizado de '+LFI.db.empresas.length+' CNPJs')+' · custo médio ponderado atualizado pelas notas fiscais',
    acoes:'<button class="btn sec sm" data-act="ajuste">'+UI.ic('editar')+'Ajuste de inventário</button><button class="btn sec sm" data-act="transf">'+UI.ic('seta')+'Transferência</button><button class="btn sec sm" data-act="saida">'+UI.ic('lixo')+'Saída / perda</button><button class="btn pri sm" data-act="novoP">'+UI.ic('mais')+'Novo produto</button>'});
  h+='<div class="barra"><div class="pills">'+['todos'].concat(depsOrd()).map(function(d){ var dd=LFI.dep(d), v=d==='todos'?null:LFI.valorEstoqueTotal([d]);
      return '<button class="pill'+(s.dep===d?' on':'')+'" data-act="dep" data-id="'+d+'">'+(dd?'<i style="background:'+dd.cor+'"></i>'+esc(dd.nome)+' <span class="c">'+F.moedaK(v)+'</span>':'Todos os departamentos')+'</button>'; }).join('')+'</div></div>';

  h+='<div class="kpis k6">'+
    UI.kpi({lb:'Valor em estoque', vl:F.moeda(vEst), dl:'Ao custo médio', hl:true})+
    UI.kpi({lb:'Itens', vl:String(lista.length), dl:comSaldo+' com saldo'})+
    UI.kpi({lb:'<span style="color:var(--red)">●</span> Abaixo do mínimo', vl:String(baixos.length), dl:crit.length+' em nível crítico', act:'kAlr', id:'baixo'})+
    UI.kpi({lb:'<span style="color:#E9A80B">●</span> Vencendo', vl:String(venc.length), dl:v7+' vencem em até 7 dias', act:'kAlr', id:'validade'})+
    UI.kpi({lb:'Sem movimentação', vl:String(par.length), dl:F.moeda(vPar)+' imobilizado', act:'kAlr', id:'parado'})+
    UI.kpi({lb:'<span style="color:var(--blue)">●</span> Divergências', vl:String(div.length), dl:'Contagem × sistema '+(vDiv?(vDiv>0?'+':'−')+F.moeda(Math.abs(vDiv)):''), act:'kAlr', id:'divergencia'})+
  '</div>';
  h+='<div class="tabs">'+[['pos','Posição de estoque',lista.length],['mov','Movimentações',null],['sug','Sugestão de compra',nSug]].map(function(t){ return '<button class="'+(s.aba===t[0]?'on':'')+'" data-act="aba" data-id="'+t[0]+'">'+t[1]+(t[2]!=null?' <span class="n">'+t[2]+'</span>':'')+'</button>'; }).join('')+'</div>';
  h+='<div id="es-aba"></div>';
  el.innerHTML=h;
  var box=el.querySelector('#es-aba');
  var hand=UI.navHandlers({
    dep:function(id){ s.dep=id; LFI.recarregar(); },
    aba:function(id){ s.aba=id; LFI.recarregar(); },
    kAlr:function(id){ s.aba='pos'; s.alr=id; s.alrTodos=true; LFI.recarregar(); setTimeout(function(){ var a=document.getElementById('es-alertas'); if(a) a.scrollIntoView({behavior:'smooth', block:'start'}); },60); },
    ajuste:function(){ modalMov('ajuste'); }, transf:function(){ modalMov('transf'); }, saida:function(){ modalMov('saida'); },
    novoP:function(){ LFI.formProduto({}, function(p){ LFI.ir('estoque', p.id); }); },
    abrir:function(id){ LFI.ir('estoque', id); }
  });
  if(s.aba==='mov') abaMov(box, hand); else if(s.aba==='sug') abaSug(box, hand, lista); else abaPos(box, hand, lista, alr, deps);
  UI.liga(el, hand);
}

/* ---------- aba: posição ---------- */
function abaPos(box, hand, lista, alr, deps){
  var s=st();
  var tipos=[['todos','Todos'],['critico','Crítico'],['baixo','Baixo'],['validade','Vencimento'],['parado','Sem movimento'],['divergencia','Divergência']];
  var alrF = s.alr==='todos'?alr : s.alr==='baixo'?alr.filter(function(a){ return a.tipo==='baixo'||a.tipo==='critico'; }) : alr.filter(function(a){ return a.tipo===s.alr; });
  var ics={critico:'alerta', baixo:'estoque', validade:'relogio', parado:'info', divergencia:'filtro'};
  var mostra=s.alrTodos?alrF:alrF.slice(0,10);
  var h='<div class="grid g21 mb"><div class="card" id="es-alertas"><h3><span class="lft">'+UI.ic('alerta')+' Alertas de estoque <span class="n">'+alr.length+'</span></span><small>clique para abrir o produto</small></h3>'+
    '<div class="es-chips">'+tipos.map(function(t){ var n=t[0]==='todos'?alr.length:t[0]==='baixo'?alr.filter(function(a){ return a.tipo==='baixo'; }).length:alr.filter(function(a){ return a.tipo===t[0]; }).length; return '<button class="pill'+(s.alr===t[0]?' on':'')+'" data-act="alr" data-id="'+t[0]+'">'+t[1]+' <span class="c">'+n+'</span></button>'; }).join('')+'</div>'+
    (mostra.length?'<div class="es-alr">'+mostra.map(function(a){ return '<div class="alr '+a.nivel+'" data-act="abrir" data-id="'+a.prod+'"><span class="ic">'+UI.ic(ics[a.tipo])+'</span><div class="gr"><div class="tt">'+esc(a.titulo)+'</div><div class="dd">'+esc(a.txt)+'</div></div></div>'; }).join('')+'</div>':UI.vazio('Nenhum alerta neste filtro','✅'))+
    (alrF.length>10?'<div style="text-align:center;margin-top:12px"><button class="vertodos" data-act="alrMais">'+(s.alrTodos?'Mostrar menos':'Ver todos os '+alrF.length+' alertas')+'</button></div>':'')+
    '</div><div class="card"><h3>Valor por departamento <small>ao custo médio</small></h3><div id="es-rosca"></div><div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px"><div style="font-size:10.5px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Maiores categorias</div><div id="es-cat"></div></div></div></div>';

  h+='<div class="card"><h3><span class="lft">'+UI.ic('estoque')+' Produtos em estoque</span><small id="es-cont"></small></h3><div class="barra">'+
    '<div class="search">'+UI.ic('busca')+'<input id="es-q" placeholder="Buscar por nome, NCM ou local…" value="'+esc(s.q)+'"></div>'+
    '<select class="inp sm" style="width:auto" data-chg="cat"><option value="">Todas as categorias</option>'+LFI.db.categorias.map(function(c){ return '<option value="'+c.id+'"'+(s.cat===c.id?' selected':'')+'>'+esc(c.nome)+'</option>'; }).join('')+'</select>'+
    '<select class="inp sm" style="width:auto" data-chg="sit">'+[['','Todas as situações'],['critico','Crítico'],['baixo','Abaixo do mínimo'],['ok','Normal'],['excesso','Excesso'],['vencendo','Vencendo (7 dias)'],['parado','Sem movimentação (30 dias)'],['divergencia','Com divergência']].map(function(x){ return '<option value="'+x[0]+'"'+(s.sit===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select>'+
    '<span class="sp"></span><button class="btn sec sm" data-act="exp">'+UI.ic('excel')+'Excel</button></div><div id="es-tab"></div></div>';
  box.innerHTML=h;

  var dv=depsOrd().filter(function(d){ return deps.indexOf(d)>=0; });
  UI.grafRosca(box.querySelector('#es-rosca'),{itens:dv.map(function(d){ var x=LFI.dep(d); return {nome:x.curto, valor:LFI.valorEstoqueTotal([d]), cor:x.cor, id:d}; }), centro:{valor:F.moedaK(LFI.valorEstoqueTotal(deps)), rotulo:'em estoque'}, onClick:function(x){ st().dep=x.id; LFI.recarregar(); }});
  var pc={}; lista.forEach(function(p){ pc[p.cat]=(pc[p.cat]||0)+LFI.valorEstoque(p,deps); });
  box.querySelector('#es-cat').innerHTML=UI.barrasH(Object.keys(pc).map(function(c){ return {nome:LFI.cat(c).nome, valor:pc[c], id:c, cor:'var(--roxo)'}; }).sort(function(a,b){ return b.valor-a.valor; }).slice(0,5),{act:'catF'});

  var todos=st().dep==='todos';
  var tab=UI.tabela(box.querySelector('#es-tab'), {linhas:[], ordem:7, dir:-1, linhaAct:'abrir', vazio:'Nenhum produto com estes filtros.',
    classeLinha:function(p){ var x=LFI.situacao(p); return x==='critico'?'alerta':x==='baixo'?'aviso':''; }, colunas:[
    {t:'Produto', v:function(p){ return '<div style="min-width:190px"><b>'+esc(p.nome)+'</b><small>'+esc(LFI.cat(p.cat).nome)+(p.tipo!=='insumo'?' · '+(p.tipo==='acabado'?'produto acabado':'sobra'):'')+'</small></div>'; }, ord:function(p){ return p.nome; }},
    {t:'NCM / CEST', v:function(p){ return '<span class="mono">'+esc(p.ncm||'—')+'</span>'+(p.cest?'<small class="mono">CEST '+esc(p.cest)+'</small>':''); }, ord:function(p){ return p.ncm; }},
    {t:todos?'Estoque por depto. / total':'Estoque', r:true, v:function(p){ var q=LFI.estoque(p,deps);
      return '<b>'+F.qtd(q,p.un)+'</b>'+(todos?segBar(p):''); }, ord:function(p){ return LFI.estoque(p,deps); }},
    {t:'Mínimo', r:true, v:function(p){ return p.estMin?F.qtd(p.estMin,p.un):'<small>—</small>'; }, ord:function(p){ return p.estMin; }},
    {t:'Situação', v:function(p){ var b=UI.situacao(p), dv=LFI.diasParaVencer(p); if(dv!=null&&dv<=3&&LFI.estoqueGeral(p)>0) b+=' '+UI.badge(dv<0?'Vencido':'Vence','no'); if(p.contado) b+=' '+UI.badge('Divergência','in'); return '<div style="display:flex;gap:4px;flex-wrap:wrap">'+b+'</div>'; }, ord:function(p){ return {critico:0,baixo:1,ok:2,excesso:3}[LFI.situacao(p)]; }},
    {t:'Custo médio', r:true, v:function(p){ return F.moeda(p.custoMedio)+'<small>/'+p.un+'</small>'; }, ord:function(p){ return p.custoMedio; }},
    {t:'Último custo', r:true, v:function(p){ return F.moeda(p.ultimoCusto)+(Math.abs(p.ultimoCusto/(p.custoMedio||1)-1)>0.0005?'<small>'+UI.variacao(p.ultimoCusto,p.custoMedio,true)+'</small>':'<small>= médio</small>'); }, ord:function(p){ return p.ultimoCusto; }},
    {t:'Valor', r:true, v:function(p){ return '<b>'+F.moeda(LFI.valorEstoque(p,deps))+'</b>'; }, ord:function(p){ return LFI.valorEstoque(p,deps); }},
    {t:'Validade', v:function(p){ return validadeTxt(p); }, ord:function(p){ var d=LFI.diasParaVencer(p); return d==null?99999:d; }},
    {t:'Local', v:function(p){ return '<small style="margin:0;color:var(--muted2);font-weight:700;min-width:110px;line-height:1.3">'+esc(p.local||'—')+'</small>'; }, ord:function(p){ return p.local||''; }}
  ]});
  function filtra(){ var q=String(s.q||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
    return lista.filter(function(p){
      if(s.cat&&p.cat!==s.cat) return false;
      if(s.sit){ var x=LFI.situacao(p), dv=LFI.diasParaVencer(p);
        if(['critico','baixo','ok','excesso'].indexOf(s.sit)>=0&&x!==s.sit) return false;
        if(s.sit==='vencendo'&&!(dv!=null&&dv<=7&&LFI.estoqueGeral(p)>0)) return false;
        if(s.sit==='parado'&&!(p.tipo==='insumo'&&LFI.diasSemMov(p)>=30)) return false;
        if(s.sit==='divergencia'&&!p.contado) return false; }
      if(q&&(p.nome+' '+p.ncm+' '+(p.local||'')+' '+LFI.cat(p.cat).nome).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').indexOf(q)<0) return false;
      return true; }); }
  function atualiza(){ var ls=filtra(), v=0; ls.forEach(function(p){ v+=LFI.valorEstoque(p,deps); }); tab.redesenha(ls); box.querySelector('#es-cont').textContent=ls.length+' produtos · '+F.moeda(v); }
  atualiza();
  box.querySelector('#es-q').addEventListener('input', function(ev){ s.q=ev.target.value; atualiza(); });
  hand.alr=function(id){ s.alr=id; s.alrTodos=false; LFI.recarregar(); };
  hand.alrMais=function(){ s.alrTodos=!s.alrTodos; LFI.recarregar(); };
  hand.cat=function(_,ev){ s.cat=ev.target.value; atualiza(); };
  hand.sit=function(_,ev){ s.sit=ev.target.value; atualiza(); };
  hand.catF=function(id){ s.cat=id; LFI.recarregar(); };
  hand.exp=function(){ var ls=filtra(); UI.exportarExcel('posicao_estoque', ['Produto','Categoria','NCM','CEST','Unidade','Central','Padaria','Restaurante','Sushi','Total (filtro)','Mínimo','Situação','Custo médio','Último custo','Valor','Validade','Local'],
    ls.map(function(p){ return [p.nome, LFI.cat(p.cat).nome, p.ncm, p.cest, p.un, p.est.cen||0, p.est.pad||0, p.est.res||0, p.est.sus||0, LFI.estoque(p,deps), p.estMin, LFI.situacao(p), p.custoMedio, p.ultimoCusto, LFI.valorEstoque(p,deps), p.validade?F.data(p.validade):'', p.local]; }), 'Estoque'); UI.toast('Posição de estoque exportada', ls.length+' produtos'); };
}

/* ---------- aba: movimentações ---------- */
function abaMov(box, hand){
  var s=st(), deps=depsSel(), D=LFI.dataUtil.D, lim={hoje:D(0), '7d':D(-6), '30d':D(-29), todas:'0000'}[s.mvPer]||D(-29);
  var q=String(s.mvQ||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  var ms=LFI.db.movs.filter(function(m){ var p=LFI.prod(m.prod); if(!p) return false; if(deps.indexOf(m.dep)<0) return false; if(m.d.slice(0,10)<lim) return false; if(s.mvTipo&&m.tipo!==s.mvTipo) return false;
    if(q&&p.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').indexOf(q)<0) return false; return true; });
  var vE=0, vS=0, vP=0, nT=0; ms.forEach(function(m){ var v=Math.abs(m.qtd)*(m.custo||0); if(m.tipo==='entrada') vE+=v; else if(m.tipo==='perda'||m.tipo==='descarte') vP+=v; else if(m.tipo==='transferencia'){ if(m.qtd>0) nT++; } else if(m.qtd<0) vS+=v; });
  var h='<div class="kpis">'+UI.kpi({lb:'Entradas por nota fiscal', vl:F.moeda(vE), dl:ms.filter(function(m){ return m.tipo==='entrada'; }).length+' movimentos'})+UI.kpi({lb:'Consumo, produção e vendas', vl:F.moeda(vS), dl:'Saídas ao custo médio'})+UI.kpi({lb:'Perdas e descartes', vl:F.moeda(vP), dl:ms.filter(function(m){ return m.tipo==='perda'||m.tipo==='descarte'; }).length+' registros'})+UI.kpi({lb:'Transferências', vl:String(nT), dl:'Entre departamentos'})+'</div>';
  h+='<div class="card"><h3><span class="lft">'+UI.ic('lista')+' Histórico de movimentações</span><small>'+ms.length+' movimentos</small></h3><div class="barra">'+
    '<div class="search">'+UI.ic('busca')+'<input id="mv-q" placeholder="Filtrar por produto…" value="'+esc(s.mvQ)+'"></div>'+
    '<select class="inp sm" style="width:auto" data-chg="mvTipo"><option value="">Todos os tipos</option>'+Object.keys(LFI.TIPOS_MOV).map(function(k){ return '<option value="'+k+'"'+(s.mvTipo===k?' selected':'')+'>'+LFI.TIPOS_MOV[k][0]+'</option>'; }).join('')+'</select>'+
    '<span class="sp"></span><div class="seg">'+[['hoje','Hoje'],['7d','7 dias'],['30d','30 dias'],['todas','Todo o período']].map(function(x){ return '<button class="'+(s.mvPer===x[0]?'on':'')+'" data-act="mvPer" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>'+
    '<button class="btn sec sm" data-act="mvExp">'+UI.ic('excel')+'Excel</button></div><div id="mv-t"></div></div>';
  box.innerHTML=h;
  UI.tabela(box.querySelector('#mv-t'), {linhas:ms, ordem:0, dir:-1, vazio:'Nenhuma movimentação no filtro.', colunas:movCols(true)});
  var inp=box.querySelector('#mv-q'), t; inp.addEventListener('input', function(){ clearTimeout(t); t=setTimeout(function(){ s.mvQ=inp.value; LFI.recarregar(); var i=document.getElementById('mv-q'); if(i){ i.focus(); i.setSelectionRange(i.value.length,i.value.length); } },350); });
  hand.mvTipo=function(_,ev){ s.mvTipo=ev.target.value; LFI.recarregar(); };
  hand.mvPer=function(id){ s.mvPer=id; LFI.recarregar(); };
  hand.mvExp=function(){ UI.exportarExcel('movimentacoes_estoque',['Data','Produto','Departamento','Tipo','Quantidade','Unidade','Custo unitário','Valor','Origem','Usuário','Observação'], ms.map(function(m){ var p=LFI.prod(m.prod); return [F.dataHora(m.d), p.nome, LFI.dep(m.dep).nome, (LFI.TIPOS_MOV[m.tipo]||[m.tipo])[0], m.qtd, p.un, m.custo, r2(Math.abs(m.qtd)*(m.custo||0)), m.origem?m.origem.tipo:'', m.usuario, m.obs]; }),'Movimentações'); UI.toast('Movimentações exportadas', ms.length+' registros'); };
}
function movCols(comProd){
  var c=[{t:'Data', v:function(m){ return '<span style="white-space:nowrap">'+F.dataHora(m.d)+'</span><small>'+F.relativo(m.d)+'</small>'; }, ord:function(m){ return m.d; }}];
  if(comProd) c.push({t:'Produto', v:function(m){ var p=LFI.prod(m.prod); return '<a class="vertodos" style="color:var(--text);font-weight:800" data-act="_ir" data-id="estoque/'+m.prod+'">'+esc(p.nome)+'</a>'; }, ord:function(m){ return LFI.prod(m.prod).nome; }});
  return c.concat([
    {t:'Tipo', v:function(m){ return tipoBadge(m.tipo); }, ord:function(m){ return m.tipo; }},
    {t:'Departamento', v:function(m){ return UI.dep(m.dep); }, ord:function(m){ return m.dep; }},
    {t:'Quantidade', r:true, v:function(m){ var p=LFI.prod(m.prod); return '<b style="color:'+(m.qtd>0?'var(--green)':'var(--red)')+'">'+(m.qtd>0?'+':'')+F.qtd(m.qtd,p.un)+'</b>'; }, ord:function(m){ return m.qtd; }},
    {t:'Custo', r:true, v:function(m){ return m.custo!=null?F.moeda(m.custo)+'<small>'+F.moeda(Math.abs(m.qtd)*m.custo)+'</small>':'—'; }, ord:function(m){ return Math.abs(m.qtd)*(m.custo||0); }},
    {t:'Origem', v:function(m){ return origemLink(m); }, ord:function(m){ return m.origem?m.origem.tipo:''; }},
    {t:'Responsável', v:function(m){ return esc(m.usuario)+(m.obs&&m.origem?'<small>'+esc(m.obs)+'</small>':''); }, ord:function(m){ return m.usuario; }}
  ]);
}

/* ---------- aba: sugestão de compra ---------- */
function abaSug(box, hand, lista){
  var s=st(), mult=s.mult||2;
  var itens=lista.filter(function(p){ return p.tipo==='insumo'&&['baixo','critico'].indexOf(LFI.situacao(p))>=0; }).sort(function(a,b){ return LFI.estoqueGeral(a)/a.estMin-LFI.estoqueGeral(b)/b.estMin; });
  itens.forEach(function(p){ if(s.sel[p.id]==null) s.sel[p.id]=true; });
  function qtd(p){ return s.sq[p.id]!=null?s.sq[p.id]:sugQtd(p,mult); }
  var tot=0, n=0; itens.forEach(function(p){ if(s.sel[p.id]){ tot+=qtd(p)*p.ultimoCusto; n++; } });
  var dep=depEntrega();
  var h='<div class="card"><h3><span class="lft">'+UI.ic('compras')+' Sugestão de compra</span><small>itens abaixo do mínimo · repor até '+F.num(mult)+'× o estoque mínimo, arredondado à unidade de compra</small></h3>'+
    '<div class="barra"><span style="font-size:12.5px;font-weight:800;color:var(--muted2)">Meta de reposição</span><div class="seg">'+[1.5,2,3].map(function(x){ return '<button class="'+(mult===x?'on':'')+'" data-act="mult" data-id="'+x+'">'+F.num(x)+'× mínimo</button>'; }).join('')+'</div>'+
    '<span class="sp"></span><span style="font-size:12px;font-weight:700;color:var(--muted)">Entrega em</span><select class="inp sm" style="width:auto" data-chg="sDep">'+optDeps(dep)+'</select>'+
    '<button class="btn pri sm" data-act="cot"'+(n?'':' disabled')+'>'+UI.ic('compras')+'Criar cotação com '+n+' '+(n===1?'item':'itens')+'</button></div>';
  if(!itens.length){ h+=UI.vazio('Nenhum produto abaixo do estoque mínimo. 👏','✅')+'</div>'; box.innerHTML=h; }
  else {
    h+='<div class="tb-wrap"><table class="tb es-sug"><thead><tr><th class="c" style="width:36px"><input type="checkbox" data-chg="selT"'+(n===itens.length?' checked':'')+' style="accent-color:var(--roxo)"></th><th>Produto</th><th>Situação</th><th class="r">Estoque / mínimo</th><th class="r">Sugerido</th><th>Unidade de compra</th><th>Fornecedor principal</th><th class="r">Último custo</th><th class="r">Valor estimado</th></tr></thead><tbody>'+
      itens.map(function(p){ var q=qtd(p), fat=(p.conv&&p.conv.fator)||1, f=p.forn&&LFI.forn(p.forn);
        return '<tr class="'+(s.sel[p.id]?'sel':'')+'"><td class="c"><input type="checkbox" data-chg="sel" data-id="'+p.id+'"'+(s.sel[p.id]?' checked':'')+' style="accent-color:var(--roxo);width:16px;height:16px"></td>'+
          '<td><a class="vertodos" style="color:var(--text);font-weight:800" data-act="abrir" data-id="'+p.id+'">'+esc(p.nome)+'</a><small>'+esc(LFI.cat(p.cat).nome)+'</small></td><td>'+UI.situacao(p)+'</td>'+
          '<td class="r">'+F.qtd(LFI.estoqueGeral(p),p.un)+'<small>mín. '+F.qtd(p.estMin,p.un)+'</small>'+UI.bar(LFI.estoqueGeral(p)/p.estMin, LFI.situacao(p)==='critico'?'no':'wt')+'</td>'+
          '<td class="r"><div style="display:flex;align-items:center;gap:6px;justify-content:flex-end"><input class="inp sm num" data-chg="sq" data-id="'+p.id+'" value="'+UI.numBR(q)+'"> '+esc(p.un)+'</div></td>'+
          '<td><b>'+F.num(r2(q/fat))+' ×</b> '+esc(p.conv.un)+'</td><td>'+(f?esc(f.nome)+'<small>prazo '+f.prazo+' d · '+esc(f.cond)+'</small>':'—')+'</td>'+
          '<td class="r">'+F.moeda(p.ultimoCusto)+'</td><td class="r"><b>'+F.moeda(q*p.ultimoCusto)+'</b></td></tr>'; }).join('')+
      '</tbody><tfoot><tr><td colspan="8">'+n+' itens selecionados · estimativa pelo último custo de compra</td><td class="r">'+F.moeda(tot)+'</td></tr></tfoot></table></div>'+
      UI.nota('A cotação é criada com os fornecedores que atendem cada produto (principal e alternativos) e segue o fluxo de Compras Inteligentes: envio simulado por WhatsApp, propostas e comparador.','in')+'</div>';
    box.innerHTML=h;
  }
  hand.mult=function(id){ s.mult=+id; s.sq={}; LFI.recarregar(); };
  hand.sel=function(id,ev){ s.sel[id]=ev.target.checked; LFI.recarregar(); };
  hand.selT=function(_,ev){ itens.forEach(function(p){ s.sel[p.id]=ev.target.checked; }); LFI.recarregar(); };
  hand.sq=function(id,ev){ s.sq[id]=Math.max(0,UI.num(ev.target.value)); LFI.recarregar(); };
  hand.sDep=function(_,ev){ s.depEnt=ev.target.value; };
  hand.cot=function(){
    var sel=itens.filter(function(p){ return s.sel[p.id]&&qtd(p)>0; }); if(!sel.length){ UI.toast('Selecione ao menos um item com quantidade','','wt'); return; }
    var d=s.depEnt&&LFI.depVisivel(s.depEnt)?s.depEnt:dep;
    var c=LFI.criarCotacao({itens:sel.map(function(p){ return {prod:p.id, qtd:qtd(p)}; }), dep:d, origem:'estoque', obs:'Sugestão automática do estoque: repor até '+F.num(mult)+'× o mínimo ('+sel.length+' itens).'});
    sel.forEach(function(p){ delete s.sel[p.id]; delete s.sq[p.id]; });
    UI.toast('Cotação '+c.num+' criada', sel.length+' itens · '+LFI.dep(d).nome); LFI.ir('compras', c.id);
  };
}

/* =====================================================================
   FICHA DO PRODUTO
   ===================================================================== */
function ficha(el, id){
  var p=LFI.prod(id), cat=LFI.cat(p.cat), deps=depsOrd(), tot=LFI.estoqueGeral(p), sit=LFI.situacao(p);
  var cons=consumo30(p), diario=cons/30, cob=diario>0?LFI.estoque(p,LFI.depIds())/diario:null;
  var h30=LFI.custoEm(p, LFI.dataUtil.D(-30));
  var h=UI.cabecalho({titulo:esc(p.nome), migalha:[{t:'Estoque', ir:'estoque'},{t:cat.nome},{t:p.nome}],
    sub:esc(cat.nome)+' · NCM '+esc(p.ncm||'—')+(p.cest?' · CEST '+esc(p.cest):'')+' · '+esc(p.local||'')+' · '+UI.situacao(p),
    acoes:'<button class="btn sec sm" data-act="editar">'+UI.ic('editar')+'Editar</button><button class="btn sec sm" data-act="ajuste">Ajustar</button><button class="btn sec sm" data-act="transf">Transferir</button><button class="btn sec sm" data-act="saida">Saída / perda</button>'+(p.tipo==='insumo'?'<button class="btn pri sm" data-act="solic">'+UI.ic('compras')+'Gerar solicitação de compra</button>':'')});
  /* avisos */
  if(p.contado){ var sis=p.est[p.contado.dep]||0, dif=r3(p.contado.qtd-sis);
    h+='<div class="nota in" style="align-items:center">'+UI.ic('filtro')+'<div style="flex:1"><b>Divergência de inventário no '+esc(LFI.dep(p.contado.dep).nome)+'</b>: sistema '+F.qtd(sis,p.un)+' · contado '+F.qtd(p.contado.qtd,p.un)+' por '+esc(p.contado.por)+' em '+F.data(p.contado.data)+' (diferença '+(dif>0?'+':'')+F.qtd(dif,p.un)+' = '+F.moeda(dif*p.custoMedio)+').</div><button class="btn sec sm" data-act="descCont">Manter sistema</button><button class="btn pri sm" data-act="aceitar">Aceitar contagem</button></div>'; }
  if(sit==='critico'||sit==='baixo') h+=UI.nota('<b>'+(sit==='critico'?'Nível crítico':'Abaixo do mínimo')+'</b>: estoque do grupo '+F.qtd(tot,p.un)+' para mínimo de '+F.qtd(p.estMin,p.un)+'. Sugestão de compra: <b>'+F.qtd(sugQtd(p,2),p.un)+'</b> ('+F.num(r2(sugQtd(p,2)/((p.conv&&p.conv.fator)||1)))+' × '+esc(p.conv.un)+').', sit==='critico'?'wt':'lf','alerta');
  var dv=LFI.diasParaVencer(p); if(dv!=null&&dv<=3&&tot>0) h+=UI.nota('<b>'+(dv<0?'Produto vencido':'Vence '+(dv===0?'hoje':'em '+dv+' dia(s)'))+'</b> — '+F.qtd(tot,p.un)+' em estoque ('+F.moeda(LFI.valorEstoque(p,['cen','pad','res','sus']))+'). Priorize o uso ou registre a perda.','wt','relogio');

  h+='<div class="kpis">'+
    UI.kpi({lb:'Estoque atual', vl:F.qtd(LFI.estoque(p,LFI.depIds()),p.un), dl:'Grupo '+F.qtd(tot,p.un)+' · mínimo '+F.qtd(p.estMin,p.un), hl:true})+
    UI.kpi({lb:'Valor em estoque', vl:F.moeda(LFI.valorEstoque(p,LFI.depIds())), dl:'Ao custo médio'})+
    UI.kpi({lb:'Custo médio', vl:F.moeda(p.custoMedio)+' <small>/'+p.un+'</small>', dl:UI.variacao(p.custoMedio,h30,true)+' em 30 dias · último '+F.moeda(p.ultimoCusto)})+
    UI.kpi({lb:'Consumo · 30 dias', vl:F.qtd(cons,p.un), dl:cob!=null?'Cobertura de <b style="color:var(--text)">'+F.num(cob,0)+' dias</b>':'Sem consumo registrado'})+'</div>';

  /* estoque por depto + cadastro */
  var mx=Math.max(p.estMin||0, Math.max.apply(null, deps.map(function(d){ return p.est[d]||0; }).concat([0.001])));
  h+='<div class="grid g21 mb"><div><div class="card"><h3><span class="lft">'+UI.ic('estoque')+' Estoque por departamento</span><small>linha vermelha = mínimo do grupo</small></h3><div class="es-dep">'+
    deps.map(function(d){ var x=LFI.dep(d), q=p.est[d]||0; return '<div class="it"><div class="nm"><i style="background:'+x.cor+'"></i><div>'+esc(x.nome)+'<small>'+esc(LFI.emp(x.empresa).fantasia)+'</small></div></div><div class="bw"><b style="width:'+Math.max(0,Math.min(100,q/mx*100)).toFixed(1)+'%;background:'+x.cor+'"></b>'+(p.estMin?'<span class="mk" style="left:'+Math.min(99.5,p.estMin/mx*100).toFixed(1)+'%"></span>':'')+'</div><div class="vl">'+F.qtd(q,p.un)+'<small>'+F.moeda(q*p.custoMedio)+'</small></div></div>'; }).join('')+
    '</div><div class="lnr tot" style="margin-top:14px"><span class="k">Total'+(deps.length<4?' (empresa selecionada)':'')+'</span><span class="v">'+F.qtd(LFI.estoque(p,LFI.depIds()),p.un)+' · '+F.moeda(LFI.valorEstoque(p,LFI.depIds()))+'</span></div></div>'+
    '<div class="card"><h3><span class="lft">'+UI.ic('fornecedor')+' Fornecedores e último preço</span></h3>'+painelForn(p)+'</div></div>'+
    '<div class="card"><h3><span class="lft">'+UI.ic('info')+' Cadastro</span><button class="vertodos" data-act="editar">Editar</button></h3><div class="kv">'+
      '<div><span>Categoria</span><b>'+esc(cat.nome)+'</b></div><div><span>Unidade base</span><b>'+esc(p.un)+'</b></div>'+
      '<div><span>NCM</span><b class="mono">'+esc(p.ncm||'—')+'</b></div><div><span>CEST</span><b class="mono">'+esc(p.cest||'—')+'</b></div>'+
      '<div><span>Custo médio</span><b>'+F.moeda(p.custoMedio)+'</b></div><div><span>Último custo</span><b>'+F.moeda(p.ultimoCusto)+' '+(Math.abs(p.ultimoCusto/(p.custoMedio||1)-1)>0.0005?UI.variacao(p.ultimoCusto,p.custoMedio,true):'')+'</b></div>'+
      '<div><span>Estoque mínimo</span><b>'+F.qtd(p.estMin,p.un)+'</b></div><div><span>Validade</span><b>'+(p.validade?F.data(p.validade):'Não se aplica')+'</b></div>'+
      '<div style="grid-column:1/-1"><span>Local de armazenagem</span><b>'+esc(p.local||'—')+'</b></div>'+
      '<div style="grid-column:1/-1"><span>Fornecedor principal / alternativos</span><b style="white-space:normal">'+(p.forn?esc(LFI.forn(p.forn).nome):'—')+(p.fornAlt&&p.fornAlt.length?' <small>· '+p.fornAlt.map(function(f){ return esc(LFI.forn(f).nome); }).join(', ')+'</small>':'')+'</b></div>'+
      '<div style="grid-column:1/-1"><span>Descrições aprendidas das notas</span><b style="white-space:normal;font-size:12px">'+((p.apelidos||[]).length?p.apelidos.map(function(a){ return '<span class="tag mono" style="margin:0 4px 4px 0">'+esc(a)+'</span>'; }).join(''):'—')+'</b></div>'+
    '</div></div></div>';

  /* custo + conversão */
  h+='<div class="grid g2 mb"><div class="card"><h3><span class="lft">'+UI.ic('custos')+' Histórico de custo</span><small>custo médio após cada entrada</small></h3><div id="pf-hist"></div></div>'+
     '<div class="card"><h3><span class="lft">'+UI.ic('balanca')+' Conversão de unidades</span></h3>'+painelConv(p)+'</div></div>';
  /* receitas */
  var recs=LFI.receitasComProduto(p.id);
  h+='<div class="card mb"><h3><span class="lft">'+UI.ic('receita')+' Receitas que usam este produto <span class="n">'+recs.length+'</span></span><small>impacto no custo das fichas técnicas</small></h3>'+(recs.length?'<div id="pf-rec"></div>':UI.vazio(p.tipo==='insumo'?'Nenhuma ficha técnica usa este produto.':'Produto acabado: veja a ficha técnica de origem.','🧾'))+'</div>';
  /* fornecedores + movimentos */
  var movs=LFI.db.movs.filter(function(m){ return m.prod===p.id; });
  h+='<div class="mb"><div class="card"><h3><span class="lft">'+UI.ic('lista')+' Movimentações <span class="n">'+movs.length+'</span></span>'+(movs.length>12?'<button class="vertodos" data-act="todosMov">Ver todas</button>':'')+'</h3><div id="pf-mov"></div></div></div>';
  el.innerHTML=h;

  /* gráfico */
  var hs=p.hist.slice(-14);
  if(hs.length>1) UI.grafLinhas(el.querySelector('#pf-hist'),{cats:hs.map(function(x){ return F.dataC(x.d); }), titulosTip:hs.map(function(x){ return F.data(x.d)+' · '+x.origem; }), series:[{nome:'Custo médio', cor:'#FF5A00', valores:hs.map(function(x){ return x.v; })}], zero:false, altura:210});
  else el.querySelector('#pf-hist').innerHTML=UI.vazio('Sem histórico suficiente','📈');
  if(hs.length>1){ var a=hs[0].v, b=hs[hs.length-1].v; el.querySelector('#pf-hist').insertAdjacentHTML('beforeend','<div class="lnr" style="margin-top:8px"><span class="k">Variação no período ('+F.dataC(hs[0].d)+' a '+F.dataC(hs[hs.length-1].d)+')</span><span class="v">'+F.moeda(a)+' → '+F.moeda(b)+' '+UI.variacao(b,a,true)+'</span></div>'); }

  if(recs.length) UI.tabela(el.querySelector('#pf-rec'), {linhas:recs, linhaAct:'rec', ordem:4, dir:-1, colunas:[
    {t:'Receita', v:function(r){ return '<b>'+esc(r.foto||'')+' '+esc(r.nome)+'</b><small>'+esc(r.cat)+' · rende '+F.num(r.rend)+' '+esc(r.rendUn)+'</small>'; }, ord:function(r){ return r.nome; }},
    {t:'Operação', v:function(r){ return UI.dep(r.dep); }, ord:function(r){ return r.dep; }},
    {t:'Qtd. na ficha', r:true, v:function(r){ var g=r.ing.filter(function(x){ return x.prod===p.id; })[0]; return F.num(g.qtd)+' '+esc(g.un)+'<small>'+F.qtd(LFI.converte(g.qtd,g.un,p.un),p.un)+'</small>'; }, ord:false},
    {t:'Custo do ingrediente', r:true, v:function(r){ var i=itemRec(r,p); return F.moeda(i.custo); }, ord:function(r){ return itemRec(r,p).custo; }},
    {t:'Participação', r:true, v:function(r){ var i=itemRec(r,p); return '<b>'+F.pct(i.part)+'</b>'+UI.bar(i.part); }, ord:function(r){ return itemRec(r,p).part; }},
    {t:'Custo por porção', r:true, v:function(r){ var c=LFI.custoReceita(r); return F.moeda(c.porcao)+'<small>'+esc(r.rendUn)+'</small>'; }, ord:function(r){ return LFI.custoReceita(r).porcao; }},
    {t:'Se o custo subir 10%', r:true, v:function(r){ var i=itemRec(r,p), c=LFI.custoReceita(r), d=r2(i.custo*0.1*(1+(r.perda||0)/100)/(r.rend||1)); return '<b style="color:var(--red)">+'+F.moeda(d)+'</b><small>'+F.pct(c.porcao?d/c.porcao:0)+' na porção</small>'; }, ord:function(r){ return itemRec(r,p).part; }}
  ]});
  UI.tabela(el.querySelector('#pf-mov'), {linhas:movs.slice(0,12), ordem:0, dir:-1, vazio:'Nenhuma movimentação registrada.', cls:'cp', colunas:movCols(false)});

  ligaCalc(el, p);
  UI.liga(el, UI.navHandlers({
    editar:function(){ LFI.formProduto({id:p.id}, function(){ LFI.recarregar(); }); },
    ajuste:function(){ modalMov('ajuste', p.id); }, transf:function(){ modalMov('transf', p.id); }, saida:function(){ modalMov('saida', p.id); },
    solic:function(){ solicitar(p.id); },
    aceitar:function(){ aceitarContagem(p.id); },
    descCont:function(){ UI.confirmar('Manter saldo do sistema','A contagem física de '+esc(p.contado.por)+' será descartada e o saldo do sistema permanece. Recomenda-se uma recontagem.','Descartar contagem',function(){ var x=LFI.prod(id); x.contado=null; LFI.atividade('estoque','Contagem de '+x.nome+' descartada (saldo do sistema mantido)',{tela:'estoque',id:x.id}); LFI.salvar(); UI.toast('Contagem descartada', x.nome,'in'); LFI.recarregar(); },'esc'); },
    rec:function(rid){ LFI.ir('receitas', rid); },
    forn:function(fid){ LFI.ir('fornecedores', fid); },
    todosMov:function(){ var s=st(); s.aba='mov'; s.mvQ=p.nome; s.mvPer='todas'; s.mvTipo=''; LFI.ir('estoque'); }
  }));
}
function itemRec(r, p){ var c=LFI.custoReceita(r); return c.itens.filter(function(i){ return i.prod.id===p.id; })[0]||{custo:0,part:0}; }

function unidadesUso(p){ return p.un==='kg'?[['g',1e-3],['kg',1]]:p.un==='L'?[['ml',1e-3],['L',1]]:[['un',1]]; }
function painelConv(p){
  var fat=(p.conv&&p.conv.fator)||1, sub=p.un==='kg'?['g',1000]:p.un==='L'?['ml',1000]:null;
  var recs=LFI.receitasComProduto(p.id), g0=recs.length?recs[0].ing.filter(function(x){ return x.prod===p.id; })[0]:null;
  var us=unidadesUso(p), uso=g0?g0.qtd:(sub?100:1), un=g0?g0.un:us[0][0];
  if(!us.some(function(u){ return u[0]===un; })) un=us[0][0];
  var h='<div class="es-conv"><div class="bl"><small>Compra</small><b>1</b><small>'+esc(p.conv.un)+'</small></div><span class="eq">=</span><div class="bl"><small>Estoque</small><b>'+F.num(fat)+'</b><small>'+esc(p.un)+'</small></div>'+(sub?'<span class="eq">=</span><div class="bl"><small>Receita</small><b>'+F.num(fat*sub[1],0)+'</b><small>'+sub[0]+'</small></div>':'')+
    '<div style="margin-left:auto;text-align:right"><small style="display:block;font-size:11px;color:var(--muted);font-weight:700">Custo da unidade de compra</small><b style="font-size:17px">'+F.moeda(fat*p.custoMedio)+'</b></div></div>';
  h+='<div style="font-size:12px;font-weight:800;margin-bottom:6px">Calculadora de porcionamento</div><div class="es-calc"><div class="field" style="margin:0"><label>Quantidade usada por porção / receita</label><input class="inp num" id="cv-q" data-inp="calc" value="'+UI.numBR(uso)+'"></div><div class="field" style="margin:0"><label>Unidade</label><select class="inp" id="cv-u" data-chg="calc">'+us.map(function(u){ return '<option'+(u[0]===un?' selected':'')+'>'+u[0]+'</option>'; }).join('')+'</select></div></div>'+
    '<div class="es-res" id="cv-r"></div>';
  if(recs.length) h+='<div style="margin-top:12px">'+recs.slice(0,4).map(function(r){ var g=r.ing.filter(function(x){ return x.prod===p.id; })[0], qb=LFI.converte(g.qtd,g.un,p.un); return '<div class="lnr"><span class="k">'+esc(r.nome)+' <small style="color:var(--muted)">· '+F.num(g.qtd)+' '+esc(g.un)+' por '+(r.rend>1?'lote de '+F.num(r.rend)+' '+esc(r.rendUn):esc(r.rendUn))+'</small></span><span class="v">'+F.num(qb?fat/qb:0,1)+' por '+esc(p.conv.un.split(' ')[0].toLowerCase())+'</span></div>'; }).join('')+'</div>';
  return h;
}
function ligaCalc(el, p){
  var q=el.querySelector('#cv-q'), u=el.querySelector('#cv-u'), r=el.querySelector('#cv-r'); if(!q) return;
  var fat=(p.conv&&p.conv.fator)||1;
  function calc(){ var v=UI.num(q.value), fu=unidadesUso(p).filter(function(x){ return x[0]===u.value; })[0], qb=v*(fu?fu[1]:1);
    var porc=qb>0?fat/qb:0, custo=qb*p.custoMedio, est=LFI.estoque(p,LFI.depIds());
    r.innerHTML='<div><span>Porções por '+esc(p.conv.un.split(' ')[0].toLowerCase())+'</span><b>'+F.num(porc,1)+'</b></div><div><span>Custo por porção</span><b>'+F.moeda(custo)+'</b></div><div><span>Porções com o estoque</span><b>'+F.num(qb>0?est/qb:0,0)+'</b></div>'; }
  q.addEventListener('input', calc); u.addEventListener('change', calc); calc();
}
function painelForn(p){
  var fs=LFI.fornecedoresDoProduto(p.id); if(!fs.length) return UI.vazio('Produto sem fornecedor cadastrado (produção própria).','🏭');
  var ult={};
  LFI.db.notas.forEach(function(n){ if(n.status!=='lancada') return; n.itens.forEach(function(it){ if(it.prod!==p.id) return; var q=it.qtd*(it.fator||1), pu=q?(it.vProd+it.ipi.v+it.st.v)/q:0, d=n.entrada||n.emissao; if(!ult[n.forn]||ult[n.forn].d<d) ult[n.forn]={d:d, v:r2(pu), fonte:'NF '+n.numero, nf:n.id}; }); });
  LFI.db.cotacoes.forEach(function(c){ (c.propostas||[]).forEach(function(pr){ pr.itens.forEach(function(i){ if(i.prod!==p.id||!i.preco) return; var d=(pr.recebida||c.data).slice(0,10); if(!ult[pr.forn]||ult[pr.forn].d<d) ult[pr.forn]={d:d, v:i.preco, fonte:'Proposta '+c.num}; }); }); });
  var melhor=null; fs.forEach(function(f){ if(ult[f.id]&&(melhor==null||ult[f.id].v<ult[melhor].v)) melhor=f.id; });
  return fs.map(function(f){ var u=ult[f.id]; return '<div class="es-fo"><span class="av'+(f.id===p.forn?' lf':'')+'">'+esc(f.nome.split(' ').map(function(w){ return w[0]; }).join('').slice(0,2))+'</span><div class="gr"><b><a class="vertodos" style="color:var(--text)" data-act="forn" data-id="'+f.id+'">'+esc(f.nome)+'</a> '+(f.id===p.forn?UI.badge('Principal','lf'):UI.badge('Alternativo','nu'))+'</b><small>'+UI.estrelas(f.qualidade)+' · prazo '+f.prazo+' d · '+esc(f.cond)+' · '+esc(f.whats)+'</small></div>'+
    '<div class="rt">'+(u?F.moeda(u.v)+'<small>'+(u.nf?'<a class="vertodos" data-act="_ir" data-id="notas/'+u.nf+'">'+esc(u.fonte)+'</a>':esc(u.fonte))+' · '+F.dataC(u.d)+'</small>'+(f.id===melhor&&fs.length>1?UI.badge('Melhor preço','ok'):''):'<small>Sem histórico</small>')+'</div></div>'; }).join('');
}

/* ---------- ações ---------- */
function aceitarContagem(id){
  var p=LFI.prod(id); if(!p||!p.contado) return; var c=p.contado, sis=p.est[c.dep]||0, dif=r3(c.qtd-sis);
  UI.confirmar('Aceitar contagem física','O saldo de <b>'+esc(p.nome)+'</b> no '+esc(LFI.dep(c.dep).nome)+' passa de '+F.qtd(sis,p.un)+' para <b>'+F.qtd(c.qtd,p.un)+'</b> (ajuste de '+(dif>0?'+':'')+F.qtd(dif,p.un)+' · '+F.moeda(dif*p.custoMedio)+').','Aceitar e ajustar',function(){
    LFI.movimentar({prod:p.id, dep:c.dep, tipo:'ajuste', qtd:dif, origem:{tipo:'inventario'}, obs:'Contagem física aceita ('+c.por+', '+F.data(c.data)+')'});
    p.contado=null; LFI.atividade('estoque','Divergência de '+p.nome+' resolvida: ajuste de '+F.qtd(dif,p.un),{tela:'estoque',id:p.id}); LFI.salvar();
    UI.toast('Inventário ajustado', p.nome+' · '+(dif>0?'+':'')+F.qtd(dif,p.un)); LFI.recarregar(); });
}
function modalMov(tipo, prodId){
  var tit={ajuste:'Ajuste de inventário', transf:'Transferência entre departamentos', saida:'Registrar saída ou perda'}[tipo];
  var vis=LFI.depIds(), d0=vis.indexOf('cen')>=0?'cen':vis[0];
  var o={prod:prodId||'', dep:d0, para:vis.filter(function(d){ return d!==d0; })[0]||'', tipoS:'perda'};
  if(prodId){ var p0=LFI.prod(prodId), best=vis.slice().sort(function(a,b){ return (p0.est[b]||0)-(p0.est[a]||0); })[0]; if(best) o.dep=best; if(tipo==='ajuste'&&p0.contado&&vis.indexOf(p0.contado.dep)>=0) o.dep=p0.contado.dep; o.para=ORDEM_DEP.filter(function(d){ return d!==o.dep; })[0]; if(tipo==='transf'&&o.dep==='cen') o.para=vis.filter(function(d){ return d!=='cen'; })[0]||'sus'; }
  var m=UI.modal({titulo:tit, sub:tipo==='transf'?'Saída na origem e entrada no destino ao custo médio':'Movimento registrado com responsável e motivo', tam:'lg', corpo:'<div id="mv-f"></div>',
    botoes:'<button class="btn sec" data-act="_fechar">Cancelar</button><button class="btn pri" data-act="ok">'+UI.ic('check')+'Registrar</button>',
    acoes:{ ok:function(){ salvar(); },
      prod:function(_,ev){ o.prod=ev.target.value; desenha(); }, dep:function(_,ev){ o.dep=ev.target.value; if(o.para===o.dep) o.para=ORDEM_DEP.filter(function(d){ return d!==o.dep; })[0]; desenha(); },
      para:function(_,ev){ o.para=ev.target.value; desenha(); }, tipoS:function(_,ev){ o.tipoS=ev.target.value; desenha(); },
      qtd:function(){ resumo(); } }});
  function desenha(){
    var p=o.prod&&LFI.prod(o.prod), sis=p?(p.est[o.dep]||0):0, h='';
    h+='<div class="fgrid"><div class="field full"><label>Produto</label><select class="inp" data-chg="prod">'+selProd(o.prod)+'</select></div>';
    if(tipo==='transf'){
      h+='<div class="field"><label>De (origem)</label><select class="inp" data-chg="dep">'+optDeps(o.dep)+'</select>'+(p?'<div class="hint">Saldo na origem: <b>'+F.qtd(sis,p.un)+'</b></div>':'')+'</div>'+
         '<div class="field"><label>Para (destino)</label><select class="inp" data-chg="para">'+LFI.db.departamentos.filter(function(d){ return d.id!==o.dep; }).map(function(d){ return '<option value="'+d.id+'"'+(d.id===o.para?' selected':'')+'>'+esc(d.nome)+' — '+esc(LFI.emp(d.empresa).fantasia)+'</option>'; }).join('')+'</select>'+(p&&o.para?'<div class="hint">Saldo no destino: <b>'+F.qtd(p.est[o.para]||0,p.un)+'</b></div>':'')+'</div>'+
         '<div class="field"><label>Quantidade a transferir'+(p?' ('+p.un+')':'')+'</label><input class="inp num" id="mv-q" data-inp="qtd" value=""></div>';
    } else if(tipo==='ajuste'){
      h+='<div class="field"><label>Departamento</label><select class="inp" data-chg="dep">'+optDeps(o.dep)+'</select></div>'+
         '<div class="field"><label>Quantidade contada'+(p?' ('+p.un+')':'')+'</label><input class="inp num" id="mv-q" data-inp="qtd" value="'+(p?UI.numBR(p.contado&&p.contado.dep===o.dep?p.contado.qtd:sis):'')+'"><div class="hint">Saldo no sistema: <b>'+(p?F.qtd(sis,p.un):'—')+'</b></div></div>';
    } else {
      h+='<div class="field"><label>Departamento</label><select class="inp" data-chg="dep">'+optDeps(o.dep)+'</select>'+(p?'<div class="hint">Saldo: <b>'+F.qtd(sis,p.un)+'</b></div>':'')+'</div>'+
         '<div class="field"><label>Tipo de saída</label><select class="inp" data-chg="tipoS">'+[['perda','Perda (avaria, validade, quebra)'],['descarte','Descarte sanitário'],['consumo','Consumo interno / cozinha'],['saida','Outra saída']].map(function(x){ return '<option value="'+x[0]+'"'+(o.tipoS===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></div>'+
         '<div class="field"><label>Quantidade'+(p?' ('+p.un+')':'')+'</label><input class="inp num" id="mv-q" data-inp="qtd" value=""></div>';
    }
    h+='<div class="field'+(tipo==='saida'?'':' full')+'"><label>Motivo / observação</label><input class="inp" id="mv-o" placeholder="'+(tipo==='transf'?'Ex.: reposição do turno da noite':tipo==='ajuste'?'Ex.: inventário mensal':'Ex.: produto avariado no recebimento')+'"></div></div>';
    if(tipo==='transf'&&o.para&&LFI.dep(o.para).empresa!==LFI.dep(o.dep).empresa) h+=UI.nota('Origem e destino estão em <b>CNPJs diferentes</b> ('+esc(LFI.emp(LFI.dep(o.dep).empresa).fantasia)+' → '+esc(LFI.emp(LFI.dep(o.para).empresa).fantasia)+'). Na operação real, a transferência é acompanhada de NF de transferência (CFOP 5152) — aqui ela é registrada apenas no estoque.','wt');
    if(!vis.length) h+=UI.nota('Nenhum departamento visível na empresa selecionada.','wt');
    h+='<div id="mv-r"></div>';
    m.corpoHTML(h); resumo();
  }
  function resumo(){
    var p=o.prod&&LFI.prod(o.prod), box=m.corpo.querySelector('#mv-r'); if(!box) return; if(!p){ box.innerHTML=UI.nota('Selecione o produto para ver o efeito no estoque.','in'); return; }
    var q=UI.num((m.corpo.querySelector('#mv-q')||{}).value), sis=p.est[o.dep]||0, h;
    if(tipo==='ajuste'){ var dif=r3(q-sis); h='<div class="kpis k3" style="margin:0">'+UI.kpi({lb:'Sistema', vl:F.qtd(sis,p.un)})+UI.kpi({lb:'Contado', vl:F.qtd(q,p.un)})+UI.kpi({lb:'Ajuste', vl:'<span style="color:'+(dif<0?'var(--red)':dif>0?'var(--green)':'inherit')+'">'+(dif>0?'+':'')+F.qtd(dif,p.un)+'</span>', dl:F.moeda(dif*p.custoMedio)})+'</div>'; }
    else if(tipo==='transf'){ h='<div class="kpis k3" style="margin:0">'+UI.kpi({lb:LFI.dep(o.dep).curto+' (origem)', vl:F.qtd(r3(sis-q),p.un), dl:'antes '+F.qtd(sis,p.un)})+UI.kpi({lb:(o.para?LFI.dep(o.para).curto:'Destino')+' (destino)', vl:F.qtd(r3((p.est[o.para]||0)+q),p.un), dl:'antes '+F.qtd(p.est[o.para]||0,p.un)})+UI.kpi({lb:'Valor transferido', vl:F.moeda(q*p.custoMedio), dl:'ao custo médio'})+'</div>'+(q>sis?UI.nota('Quantidade maior que o saldo da origem.','wt','alerta'):''); }
    else { h='<div class="kpis k3" style="margin:0">'+UI.kpi({lb:'Saldo atual', vl:F.qtd(sis,p.un)})+UI.kpi({lb:'Saldo após', vl:F.qtd(r3(sis-q),p.un)})+UI.kpi({lb:'Valor da saída', vl:'<span style="color:var(--red)">'+F.moeda(q*p.custoMedio)+'</span>', dl:o.tipoS==='perda'||o.tipoS==='descarte'?'entra no relatório de perdas':''})+'</div>'+(q>sis?UI.nota('Quantidade maior que o saldo do departamento.','wt','alerta'):''); }
    box.innerHTML=h;
  }
  function salvar(){
    var p=o.prod&&LFI.prod(o.prod); if(!p){ UI.toast('Selecione o produto','','wt'); return; }
    var q=r3(UI.num(m.corpo.querySelector('#mv-q').value)), obs=m.corpo.querySelector('#mv-o').value.trim(), sis=p.est[o.dep]||0;
    if(tipo==='ajuste'){ var dif=r3(q-sis); if(Math.abs(dif)<0.0005){ UI.toast('Sem diferença para ajustar','Contado igual ao sistema','in'); return; }
      LFI.movimentar({prod:p.id, dep:o.dep, tipo:'ajuste', qtd:dif, origem:{tipo:'inventario'}, obs:obs||'Ajuste de inventário (contado '+F.qtd(q,p.un)+')'});
      if(p.contado&&p.contado.dep===o.dep) p.contado=null;
      LFI.atividade('estoque','Ajuste de inventário: '+p.nome+' '+(dif>0?'+':'')+F.qtd(dif,p.un)+' ('+LFI.dep(o.dep).curto+')',{tela:'estoque',id:p.id});
      UI.toast('Inventário ajustado', p.nome+' · '+(dif>0?'+':'')+F.qtd(dif,p.un)); }
    else if(tipo==='transf'){ if(!(q>0)){ UI.toast('Informe a quantidade','','wt'); return; } if(!o.para||o.para===o.dep){ UI.toast('Escolha um destino diferente da origem','','wt'); return; } if(q>sis+1e-9){ UI.toast('Saldo insuficiente na origem', 'Disponível '+F.qtd(sis,p.un),'no'); return; }
      LFI.movimentar({prod:p.id, dep:o.dep, tipo:'transferencia', qtd:-q, origem:{tipo:'transf', para:o.para}, obs:obs||'Para '+LFI.dep(o.para).nome});
      LFI.movimentar({prod:p.id, dep:o.para, tipo:'transferencia', qtd:q, origem:{tipo:'transf', de:o.dep}, obs:obs||'Do '+LFI.dep(o.dep).nome});
      LFI.atividade('estoque','Transferência de '+F.qtd(q,p.un)+' de '+p.nome+': '+LFI.dep(o.dep).curto+' → '+LFI.dep(o.para).curto,{tela:'estoque',id:p.id});
      UI.toast('Transferência registrada', F.qtd(q,p.un)+' · '+LFI.dep(o.dep).curto+' → '+LFI.dep(o.para).curto); }
    else { if(!(q>0)){ UI.toast('Informe a quantidade','','wt'); return; } if(q>sis+1e-9){ UI.toast('Saldo insuficiente', 'Disponível '+F.qtd(sis,p.un),'no'); return; }
      LFI.movimentar({prod:p.id, dep:o.dep, tipo:o.tipoS, qtd:-q, obs:obs||(LFI.TIPOS_MOV[o.tipoS]||[o.tipoS])[0]+' registrada'});
      LFI.atividade('estoque',(LFI.TIPOS_MOV[o.tipoS]||[o.tipoS])[0]+': '+F.qtd(q,p.un)+' de '+p.nome+' ('+F.moeda(q*p.custoMedio)+')',{tela:'estoque',id:p.id});
      UI.toast((LFI.TIPOS_MOV[o.tipoS]||[o.tipoS])[0]+' registrada', F.qtd(q,p.un)+' de '+p.nome+' · '+F.moeda(q*p.custoMedio), o.tipoS==='perda'||o.tipoS==='descarte'?'wt':''); }
    LFI.salvar(); m.fechar(); LFI.recarregar();
  }
  desenha();
}
function solicitar(id){
  var p=LFI.prod(id), sug=sugQtd(p,2)||r3(Math.max(p.estMin,(p.conv&&p.conv.fator)||1)), fs=LFI.fornecedoresDoProduto(p.id), dep=depEntrega(), fat=(p.conv&&p.conv.fator)||1;
  var m=UI.modal({titulo:'Gerar solicitação de compra', sub:esc(p.nome)+' · origem: estoque', corpo:
    '<div class="fgrid"><div class="field"><label>Quantidade ('+p.un+')</label><input class="inp num" id="sc-q" value="'+UI.numBR(sug)+'"><div class="hint" id="sc-h"></div></div>'+
    '<div class="field"><label>Entregar em</label><select class="inp" id="sc-d">'+optDeps(dep)+'</select></div>'+
    '<div class="field full"><label>Fornecedores a cotar</label><div style="display:flex;flex-direction:column;gap:8px">'+fs.map(function(f){ return '<label class="chk"><input type="checkbox" data-f="'+f.id+'" checked> '+esc(f.nome)+' <small style="color:var(--muted)">'+(f.id===p.forn?'principal':'alternativo')+' · '+esc(f.cond)+'</small></label>'; }).join('')+'</div></div>'+
    '<div class="field full"><label>Observação</label><input class="inp" id="sc-o" value="Reposição de estoque: '+esc(LFI.situacao(p)==='ok'?'compra programada':'abaixo do mínimo')+'"></div></div>'+
    UI.nota('Sugestão: repor até <b>2× o estoque mínimo</b> ('+F.qtd(p.estMin*2,p.un)+'), arredondado à unidade de compra ('+esc(p.conv.un)+'). A cotação segue para Compras Inteligentes.','in'),
    botoes:'<button class="btn sec" data-act="_fechar">Cancelar</button><button class="btn pri" data-act="ok">'+UI.ic('compras')+'Criar cotação</button>',
    acoes:{ok:function(){ var q=r3(UI.num(m.el.querySelector('#sc-q').value)); if(!(q>0)){ UI.toast('Informe a quantidade','','wt'); return; }
      var fo=UI.els('[data-f]',m.el).filter(function(c){ return c.checked; }).map(function(c){ return c.getAttribute('data-f'); });
      var c=LFI.criarCotacao({itens:[{prod:p.id, qtd:q}], dep:m.el.querySelector('#sc-d').value, origem:'estoque', fornecedores:fo.length?fo:null, obs:m.el.querySelector('#sc-o').value});
      m.fechar(); UI.toast('Cotação '+c.num+' criada', esc(p.nome)+' · '+F.qtd(q,p.un)); LFI.ir('compras', c.id); }}});
  var qi=m.el.querySelector('#sc-q'), hi=m.el.querySelector('#sc-h'); function hint(){ var q=UI.num(qi.value); hi.innerHTML='= '+F.num(r2(q/fat))+' × '+esc(p.conv.un)+' · estimado '+F.moeda(q*p.ultimoCusto); } qi.addEventListener('input',hint); hint();
}

/* ---------- formulário de produto (novo / edição) — também usado pela conferência de notas ---------- */
LFI.formProduto = function(o, cb){
  o=o||{}; var ed=o.id?LFI.prod(o.id):null;
  var p=ed||{nome:o.nome||'', cat:o.cat||'mer', un:o.un||'kg', ncm:o.ncm||'', cest:'', estMin:0, local:'', validade:null, forn:o.forn||'', fornAlt:[], conv:o.conv||{un:'Unidade', fator:1}};
  var locais={}; LFI.db.produtos.forEach(function(x){ if(x.local) locais[x.local]=1; });
  var m=UI.modal({titulo:ed?'Editar produto':'Novo produto', sub:ed?esc(ed.nome):(o.apelido?'A partir do item da nota: '+esc(o.apelido):'Cadastro de insumo do estoque'), tam:'lg', corpo:
    '<div class="fgrid c3"><div class="field" style="grid-column:span 2"><label>Nome do produto</label><input class="inp" id="fp-n" value="'+esc(p.nome)+'"></div>'+
    '<div class="field"><label>Categoria</label><select class="inp" id="fp-c">'+LFI.db.categorias.map(function(c){ return '<option value="'+c.id+'"'+(c.id===p.cat?' selected':'')+'>'+esc(c.nome)+'</option>'; }).join('')+'</select></div>'+
    '<div class="field"><label>Unidade base (estoque)</label><select class="inp" id="fp-u">'+['kg','L','un'].map(function(u){ return '<option'+(u===p.un?' selected':'')+'>'+u+'</option>'; }).join('')+'</select></div>'+
    '<div class="field"><label>NCM</label><input class="inp mono" id="fp-ncm" value="'+esc(p.ncm)+'" placeholder="0000.00.00"></div>'+
    '<div class="field"><label>CEST</label><input class="inp mono" id="fp-cest" value="'+esc(p.cest||'')+'" placeholder="Opcional"></div>'+
    '<div class="field"><label>Unidade de compra</label><input class="inp" id="fp-cu" value="'+esc(p.conv.un)+'" placeholder="Ex.: Saco 25 kg"></div>'+
    '<div class="field"><label>Fator (unid. base por compra)</label><input class="inp num" id="fp-cf" value="'+UI.numBR(p.conv.fator)+'"></div>'+
    '<div class="field"><label>Estoque mínimo</label><input class="inp num" id="fp-min" value="'+UI.numBR(p.estMin)+'"></div>'+
    '<div class="field"><label>Local de armazenagem</label><input class="inp" id="fp-l" list="fp-ll" value="'+esc(p.local||'')+'"><datalist id="fp-ll">'+Object.keys(locais).map(function(l){ return '<option value="'+esc(l)+'">'; }).join('')+'</datalist></div>'+
    '<div class="field"><label>Validade do lote atual</label><input class="inp" type="date" id="fp-v" value="'+(p.validade||'')+'"></div>'+
    (ed?'':'<div class="field"><label>Custo inicial (R$ por unid. base)</label><input class="inp num" id="fp-cs" value="'+UI.numBR(o.custo||0,2)+'"></div>')+
    '<div class="field"><label>Fornecedor principal</label><select class="inp" id="fp-f">'+UI.selFornecedores(p.forn,'Sem fornecedor')+'</select></div>'+
    '<div class="field full"><label>Fornecedores alternativos</label><div style="display:flex;gap:6px 16px;flex-wrap:wrap">'+LFI.db.fornecedores.map(function(f){ return '<label class="chk" style="font-size:12.5px"><input type="checkbox" data-fa="'+f.id+'"'+((p.fornAlt||[]).indexOf(f.id)>=0?' checked':'')+'> '+esc(f.nome)+'</label>'; }).join('')+'</div></div></div>'+
    (o.apelido?UI.nota('A descrição <b>'+esc(o.apelido)+'</b> será guardada como apelido: nas próximas notas o item será reconhecido com 100% de confiança.','ok','check'):''),
    botoes:'<button class="btn sec" data-act="_fechar">Cancelar</button><button class="btn pri" data-act="ok">'+UI.ic('check')+(ed?'Salvar alterações':'Cadastrar produto')+'</button>',
    acoes:{ok:function(){
      var v=function(s){ var x=m.el.querySelector(s); return x?x.value.trim():''; };
      if(v('#fp-n').length<3){ UI.toast('Informe o nome do produto','','wt'); return; }
      if(v('#fp-ncm')&&!/^\d{4}\.?\d{2}\.?\d{2}$/.test(v('#fp-ncm'))){ UI.toast('NCM inválido','Use o formato 0000.00.00','wt'); return; }
      var fat=UI.num(v('#fp-cf'))||1, ncm=v('#fp-ncm').replace(/^(\d{4})\.?(\d{2})\.?(\d{2})$/,'$1.$2.$3');
      var alt=UI.els('[data-fa]',m.el).filter(function(c){ return c.checked; }).map(function(c){ return c.getAttribute('data-fa'); }).filter(function(f){ return f!==v('#fp-f'); });
      var dados={nome:v('#fp-n'), cat:v('#fp-c'), un:v('#fp-u'), ncm:ncm, cest:v('#fp-cest'), conv:{un:v('#fp-cu')||'Unidade', fator:fat}, estMin:UI.num(v('#fp-min')), local:v('#fp-l'), validade:v('#fp-v')||null, forn:v('#fp-f')||null, fornAlt:alt};
      var x;
      if(ed){ for(var k in dados) ed[k]=dados[k]; x=ed; LFI.atividade('estoque','Cadastro de '+x.nome+' atualizado',{tela:'estoque',id:x.id}); }
      else { var cu=r2(UI.num(v('#fp-cs')));
        x={id:LFI.novoId('p'), custoMedio:cu, ultimoCusto:cu, est:{cen:0,pad:0,res:0,sus:0}, apelidos:o.apelido?[o.apelido]:[], ultMov:LFI.hoje(), tipo:'insumo', contado:null, hist:[{d:LFI.hoje(), v:cu, origem:'Cadastro inicial'}]};
        for(var k2 in dados) x[k2]=dados[k2];
        LFI.db.produtos.push(x); LFI.atividade('estoque','Produto '+x.nome+' cadastrado',{tela:'estoque',id:x.id}); }
      LFI.salvar(); m.fechar(); UI.toast(ed?'Produto atualizado':'Produto cadastrado', x.nome); if(cb) cb(x);
    }}});
};

LFI.registrar('estoque',{titulo:'Estoque Inteligente', render:render});
})();
