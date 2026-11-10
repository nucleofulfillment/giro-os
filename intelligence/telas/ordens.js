/* LiveFood Intelligence — ORDENS DE COMPRA
   Central com compras consolidadas agrupadas · detalhe com aprovação, envio (WhatsApp/e-mail), recebimento parcial/total
   e vínculo com a nota fiscal. A entrada no estoque acontece somente na conferência da NF (LFI.lancarNota). */
(function(){
'use strict';
var LFI=window.LFI, UI=LFI.ui, F=LFI.fmt, esc=UI.esc, U=LFI.dataUtil, r2=U.r2, r3=U.r3;

var CSS=[
'.oq-tb td{vertical-align:top}',
'.oq-tb tr.grp td{background:linear-gradient(90deg,var(--lf-soft),#fff 70%);border-bottom:1px solid var(--lf-soft2);padding:9px 10px}',
'.oq-tb tr.grp:hover td{background:linear-gradient(90deg,var(--lf-soft2),#fff 70%)}',
'.oq-tb tr.grp .gh{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12.5px;font-weight:700;color:var(--muted2)}',
'.oq-tb tr.grp .gh b{color:var(--text);font-weight:800;font-size:13px}',
'.oq-tb tr.grp .gh svg{width:15px;height:15px;stroke:var(--roxo);fill:none;stroke-width:2}',
'.oq-tb tr.gm td:first-child{box-shadow:inset 3px 0 0 var(--roxo);padding-left:16px}',
'.oq-atr{color:var(--red)!important;font-weight:800}',
'.oq-prods{font-size:12px;color:var(--muted2);font-weight:600;line-height:1.45;max-width:280px}',
'.oq-prods b{color:var(--text);font-weight:800}',
'.oq-it .bar{margin-top:5px}',
'.oq-env{display:grid;grid-template-columns:minmax(0,1fr);gap:12px}',
'.oq-mail{border:1px solid var(--border);border-radius:12px;overflow:hidden;background:#fff}',
'.oq-mail .hd{background:var(--s2);padding:10px 14px;border-bottom:1px solid var(--border);font-size:12.5px;line-height:1.7}',
'.oq-mail .hd span{color:var(--muted);font-weight:700;display:inline-block;width:64px}',
'.oq-mail .bd{padding:14px;font-size:13px;white-space:pre-wrap;line-height:1.5}',
'.oq-mail .anx{display:inline-flex;align-items:center;gap:8px;margin:0 14px 14px;border:1px solid var(--border);border-radius:9px;padding:7px 10px;font-size:12px;font-weight:700}',
'.oq-mail .anx i{width:24px;height:28px;border-radius:4px;background:#DC2626;color:#fff;font-size:8.5px;font-style:normal;font-weight:800;display:flex;align-items:center;justify-content:center}',
'.oq-nf{display:flex;gap:12px;align-items:flex-start;border:1.5px solid var(--border2);border-radius:12px;padding:11px 13px;cursor:pointer;margin-bottom:8px}',
'.oq-nf input{margin-top:3px;accent-color:var(--roxo);width:16px;height:16px;flex:none}',
'.oq-nf.on{border-color:var(--roxo);background:var(--lf-soft)}',
'.oq-nf b{font-size:13px;font-weight:800;display:block}',
'.oq-nf small{font-size:11.5px;color:var(--muted);font-weight:600;display:block;margin-top:2px}',
'.wa-tag svg,.wa-doc svg{fill:none;stroke:currentColor;stroke-width:2}',
'@media (max-width:1100px){.oq-hm,.oq-tb td small.mono{display:none!important}}',
'.tela-ordens .grid>.card+.card,.tela-ordens .grid>div>.card:first-child{margin-top:0}'
].join('\n');
function css(){ if(document.getElementById('css-ordens')) return; var s=document.createElement('style'); s.id='css-ordens'; s.textContent=CSS; document.head.appendChild(s); }

var ABERTAS=['aguardando_aprovacao','aprovada','enviada','aguardando_entrega','parcial'];
var TRANSITO=['enviada','aguardando_entrega','parcial'];
var COR_ST={nu:'#8E8E93', wt:'#E9A80B', in:'#1D4ED8', lf:'#FF5A00', ok:'#16A34A', dk:'#1C1C1E', no:'#DC2626'};
function st(){ var s=LFI.estado.ordens=LFI.estado.ordens||{}; if(!s.filtro) s.filtro='todas'; if(s.busca==null) s.busca=''; return s; }
function curto(n){ return String(n||'').replace(/\s*\([^)]*\)/,'').trim(); }
function prodN(id){ var p=LFI.prod(id); return p?p.nome:'—'; }
function qtdP(id,q){ var p=LFI.prod(id); return F.qtd(q,p?p.un:''); }
function norm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
function plural(n,a,b){ return n+' '+(n===1?a:b); }
function primeiro(n){ return String(n||'').split(/[\s(]/)[0]; }
function ordensVis(){ return LFI.db.ordens.filter(function(o){ return LFI.empresaVisivel(o.empresa); }); }
function recebidoV(oc){ var t=0; oc.itens.forEach(function(i){ t+=Math.min(i.recebido,i.qtd)*i.preco; }); return r2(t); }
function abertoV(oc){ return ABERTAS.indexOf(oc.status)<0?0:r2(LFI.totalOrdem(oc)-recebidoV(oc)); }
function atrasada(oc){ return ['aprovada','enviada','aguardando_entrega','parcial'].indexOf(oc.status)>=0&&oc.previsao<LFI.hoje(); }
function fracRec(oc){ var t=LFI.totalOrdem(oc); return t?recebidoV(oc)/t:0; }
function nfsDa(oc){ return LFI.db.notas.filter(function(n){ return n.oc===oc.id||oc.nfs.indexOf(n.id)>=0; }); }
function resumoProd(oc, max){ max=max||3; return oc.itens.slice(0,max).map(function(i){ return esc(curto(prodN(i.prod)))+' <b>'+esc(qtdP(i.prod,i.qtd))+'</b>'; }).join(', ')+(oc.itens.length>max?' <span style="color:var(--muted)">+'+(oc.itens.length-max)+'</span>':''); }

function render(el, arg){
  css();
  if(arg){ var oc=LFI.ordem(arg); if(oc) return detalhe(el, oc);
    el.innerHTML=UI.cabecalho({migalha:[{t:'Ordens de Compra',ir:'ordens'},{t:'Não encontrada'}], titulo:'Ordem de compra não encontrada'})+'<div class="card">'+UI.vazio('A OC solicitada não existe.','🔎')+'</div>'; UI.liga(el,UI.navHandlers()); return; }
  lista(el);
}

/* =================== CENTRAL =================== */
function lista(el){
  var s=st(), todas=ordensVis(), emp=LFI.empresaAtual(), cont={};
  todas.forEach(function(o){ cont[o.status]=(cont[o.status]||0)+1; });
  var q=norm(s.busca);
  var ls=todas.filter(function(o){
    if(s.filtro==='abertas'&&ABERTAS.indexOf(o.status)<0) return false;
    if(s.filtro==='atrasadas'&&!atrasada(o)) return false;
    if(['todas','abertas','atrasadas'].indexOf(s.filtro)<0&&o.status!==s.filtro) return false;
    if(q){ var c=o.cot?LFI.cotacao(o.cot):null; var t=norm(o.num+' '+(o.grupo||'')+' '+LFI.forn(o.forn).nome+' '+(c?c.num:'')+' '+o.itens.map(function(i){ return prodN(i.prod); }).join(' ')); if(t.indexOf(q)<0) return false; }
    return true; }).sort(function(a,b){ return a.emissao<b.emissao?1:a.emissao>b.emissao?-1:(a.num<b.num?1:-1); });

  var aguard=todas.filter(function(o){ return o.status==='aguardando_aprovacao'; }), vAg=0; aguard.forEach(function(o){ vAg+=LFI.totalOrdem(o); });
  var trans=todas.filter(function(o){ return TRANSITO.indexOf(o.status)>=0; });
  var aberto=0, nAb=0; todas.forEach(function(o){ var v=abertoV(o); if(v>0){ aberto+=v; nAb++; } });
  var atr=todas.filter(atrasada);

  var h=UI.cabecalho({titulo:'Ordens de Compra', sub:'Aprovação, envio ao fornecedor e acompanhamento das entregas · '+(emp?esc(emp.fantasia)+' · CNPJ '+emp.cnpj:'consolidado de '+LFI.db.empresas.length+' CNPJs'),
    acoes:'<button class="btn sec sm" data-act="exportar">'+UI.ic('baixar')+'Exportar</button><button class="btn pri sm" data-act="_ir" data-id="compras/nova">'+UI.ic('mais')+'Nova cotação</button>'});
  h+='<div class="kpis">'+
    UI.kpi({lb:'Aguardando aprovação', vl:String(aguard.length), dl:F.moeda(vAg)+' para aprovar', act:'filtro', id:'aguardando_aprovacao', hl:aguard.length>0})+
    UI.kpi({lb:'Em trânsito', vl:String(trans.length), dl:(cont.parcial||0)+' com entrega parcial', act:'filtro', id:'abertas'})+
    UI.kpi({lb:'Valor em aberto', vl:F.moeda(aberto), dl:plural(nAb,'ordem a receber','ordens a receber')})+
    UI.kpi({lb:'<span style="color:var(--red)">●</span> Entregas atrasadas', vl:String(atr.length), dl:atr.length?atr.map(function(o){ return esc(o.num.replace('OC-2026-','')); }).join(', ')+' · previsão vencida':'Nenhum atraso', act:'filtro', id:'atrasadas'})+
  '</div>';
  var pills=[['todas','Todas',todas.length],['abertas','Em aberto',todas.filter(function(o){ return ABERTAS.indexOf(o.status)>=0; }).length]].concat(LFI.OC_FLUXO.concat(['cancelada']).map(function(k){ return [k,LFI.STATUS.oc[k][0],cont[k]||0]; }));
  h+='<div class="barra"><div class="pills">'+pills.map(function(p){ var d=LFI.STATUS.oc[p[0]]; return '<button class="pill'+(s.filtro===p[0]?' on':'')+'" data-act="filtro" data-id="'+p[0]+'">'+(d?'<i style="background:'+COR_ST[d[1]]+'"></i>':'')+esc(p[1])+' <span class="c">'+p[2]+'</span></button>'; }).join('')+(s.filtro==='atrasadas'?'<button class="pill on" data-act="filtro" data-id="todas"><i style="background:var(--red)"></i>Atrasadas · limpar</button>':'')+'</div><span class="sp"></span><div class="search">'+UI.ic('busca')+'<input placeholder="OC, fornecedor, produto, compra consolidada" value="'+esc(s.busca)+'" data-chg="busca" id="oq-busca"></div></div>';

  /* tabela com compras consolidadas agrupadas */
  var grupos={}; ls.forEach(function(o){ if(o.grupo) (grupos[o.grupo]=grupos[o.grupo]||[]).push(o); });
  var feitos={}, linhas='';
  ls.forEach(function(o){
    if(o.grupo){ if(feitos[o.grupo]) return; feitos[o.grupo]=1; var g=grupos[o.grupo], tot=0, ag=0; g.forEach(function(x){ tot+=LFI.totalOrdem(x); if(x.status==='aguardando_aprovacao') ag++; }); var c=o.cot?LFI.cotacao(o.cot):null;
      linhas+='<tr class="grp"><td colspan="8"><div class="gh">'+UI.ic('compras')+'<b>Compra consolidada '+esc(o.grupo)+'</b><span>'+plural(g.length,'fornecedor','fornecedores')+' · '+F.moeda(tot)+'</span>'+(c?'<a class="vertodos" data-act="_ir" data-id="compras/'+c.id+'">'+esc(c.num)+'</a>':'')+'<span style="flex:1"></span>'+(ag?'<button class="btn ok xs" data-act="aprovGrupo" data-id="'+esc(o.grupo)+'">'+UI.ic('check')+'Aprovar '+plural(ag,'OC','OCs')+' da compra</button>':'')+'</div></td></tr>';
      g.forEach(function(x){ linhas+=linha(x,true); });
    } else linhas+=linha(o,false);
  });
  h+='<div class="card pad0"><div class="tb-wrap"><table class="tb oq-tb"><thead><tr><th>Número</th><th>Fornecedor</th><th>Empresa (CNPJ)</th><th class="oq-hm">Emissão</th><th>Produtos e quantidades</th><th class="r">Valor · pagamento</th><th>Previsão</th><th>Status</th></tr></thead><tbody>'+
    (linhas||'<tr><td colspan="8">'+UI.vazio('Nenhuma ordem de compra neste filtro.','📄')+'</td></tr>')+'</tbody></table></div></div>';

  /* painéis */
  var prox=todas.filter(function(o){ return ['aprovada','enviada','aguardando_entrega','parcial'].indexOf(o.status)>=0; }).sort(function(a,b){ return a.previsao<b.previsao?-1:1; });
  var porF={}; todas.forEach(function(o){ var v=abertoV(o); if(v>0) porF[o.forn]=(porF[o.forn]||0)+v; });
  h+='<div class="grid g2 mt"><div class="card"><h3><span class="lft">'+UI.ic('caminhao')+' Entregas previstas</span><small>'+plural(prox.length,'ordem','ordens')+'</small></h3>'+(prox.length?'<div class="lst">'+prox.slice(0,6).map(function(o){ var a=atrasada(o); return '<div class="li cl" data-act="abrir" data-id="'+o.id+'"><span class="av'+(a?'':' lf')+'" style="'+(a?'background:var(--r-soft);color:var(--red)':'')+'">'+UI.ic('calendario')+'</span><div class="gr"><div class="tt">'+esc(o.num)+' · '+esc(LFI.forn(o.forn).nome)+'</div><div class="dd">'+resumoProd(o,2)+'</div></div><div class="rt"><span class="'+(a?'oq-atr':'')+'">'+F.relativo(o.previsao)+'</span><small>'+UI.status('oc',o.status)+'</small></div></div>'; }).join('')+'</div>':UI.vazio('Nenhuma entrega pendente','✅'))+'</div>'+
    '<div class="card"><h3><span class="lft">'+UI.ic('fornecedor')+' Valor em aberto por fornecedor</span><small>a receber</small></h3>'+(Object.keys(porF).length?UI.barrasH(Object.keys(porF).map(function(f){ return {nome:LFI.forn(f).nome, valor:porF[f], id:'fornecedores/'+f, cor:'var(--roxo)'}; }).sort(function(a,b){ return b.valor-a.valor; }),{act:'_ir'}):UI.vazio('Nada em aberto','✅'))+'</div></div>';
  el.innerHTML=h;

  UI.liga(el, UI.navHandlers({
    filtro:function(id){ s.filtro=id; LFI.recarregar(); },
    busca:function(_,ev){ s.busca=ev.target.value; LFI.recarregar(); },
    abrir:function(id){ LFI.ir('ordens',id); },
    aprovGrupo:function(g,ev){ ev.stopPropagation(); var ocs=LFI.db.ordens.filter(function(o){ return o.grupo===g&&o.status==='aguardando_aprovacao'; }), t=0; ocs.forEach(function(o){ t+=LFI.totalOrdem(o); });
      UI.confirmar('Aprovar compra consolidada '+esc(g), plural(ocs.length,'ordem de compra','ordens de compra')+' · '+F.moeda(t)+'. Depois de aprovadas, cada OC pode ser enviada ao seu fornecedor.','Aprovar todas',function(){ ocs.forEach(function(o){ LFI.mudarStatusOrdem(o,'aprovada','Aprovada em lote (compra consolidada '+g+')'); }); LFI.atividade('oc','Compra consolidada '+g+' aprovada ('+plural(ocs.length,'OC','OCs')+')',{tela:'ordens',id:ocs[0].id}); LFI.salvar(); LFI.recarregar(); UI.toast('Compra consolidada aprovada',plural(ocs.length,'OC','OCs')+' · '+F.moeda(t)); },'ok'); },
    exportar:function(){ UI.exportarExcel('ordens-de-compra',['Número','Compra consolidada','Fornecedor','Empresa','CNPJ','Emissão','Produtos','Valor','Pagamento','Previsão','Status'], ls.map(function(o){ var e=LFI.emp(o.empresa); return [o.num,o.grupo||'',LFI.forn(o.forn).nome,e.fantasia,e.cnpj,F.data(o.emissao),o.itens.map(function(i){ return curto(prodN(i.prod))+' '+qtdP(i.prod,i.qtd); }).join('; '),LFI.totalOrdem(o),o.cond,F.data(o.previsao),LFI.STATUS.oc[o.status][0]]; }),'Ordens'); UI.toast('Planilha gerada',plural(ls.length,'ordem','ordens')); }
  }));
}
function linha(o, emGrupo){
  var f=LFI.forn(o.forn), a=atrasada(o), fr=fracRec(o), e=LFI.emp(o.empresa);
  return '<tr class="cl'+(emGrupo?' gm':'')+(a?' alerta':'')+'" data-act="abrir" data-id="'+o.id+'"><td class="nw"><b>'+esc(o.num)+'</b>'+(o.cot&&!emGrupo&&LFI.cotacao(o.cot)?'<small>'+esc(LFI.cotacao(o.cot).num)+'</small>':'')+'</td>'+
    '<td style="min-width:150px"><b>'+esc(f.nome)+'</b><small>'+esc(f.contato)+'</small></td><td title="'+esc(e.razao+' · CNPJ '+e.cnpj)+'">'+UI.empTag(o.empresa)+'<small class="mono" style="font-size:10.5px">'+e.cnpj+'</small></td><td class="nw oq-hm">'+F.data(o.emissao)+'</td>'+
    '<td style="min-width:200px"><div class="oq-prods">'+resumoProd(o,2)+'</div><small>'+plural(o.itens.length,'item','itens')+(o.status==='parcial'?' · '+Math.round(fr*100)+'% recebido':'')+'</small></td><td class="r"><b>'+F.moeda(LFI.totalOrdem(o))+'</b><small>'+esc(o.cond)+'</small></td>'+
    '<td class="nw'+(a?' oq-atr':'')+'">'+F.data(o.previsao)+'<small'+(a?' style="color:var(--red)"':'')+'>'+(a?'atrasada · ':'')+F.relativo(o.previsao)+'</small></td><td class="nw">'+UI.status('oc',o.status)+'</td></tr>';
}

/* =================== DETALHE =================== */
function detalhe(el, oc){
  var f=LFI.forn(oc.forn), emp=LFI.emp(oc.empresa), dep=LFI.dep(oc.dep), tot=LFI.totalOrdem(oc), a=atrasada(oc), cot=oc.cot?LFI.cotacao(oc.cot):null;
  var ac='<button class="btn sec sm" data-act="pdf">'+UI.ic('imprimir')+'Imprimir OC</button>';
  var btCanc='<button class="btn no sm" data-act="cancelar">Cancelar</button>';
  if(oc.status==='aguardando_aprovacao') ac+=btCanc+'<button class="btn ok sm" data-act="aprovar">'+UI.ic('check')+'Aprovar</button>';
  else if(oc.status==='aprovada') ac+=btCanc+'<button class="btn pri sm" data-act="enviar">'+UI.ic('enviar')+'Enviar ao fornecedor</button>';
  else if(oc.status==='enviada') ac+=btCanc+'<button class="btn sec sm" data-act="aguardar">'+UI.ic('caminhao')+'Marcar aguardando entrega</button><button class="btn pri sm" data-act="receber">'+UI.ic('estoque')+'Registrar recebimento</button>';
  else if(oc.status==='aguardando_entrega') ac+=btCanc+'<button class="btn pri sm" data-act="receber">'+UI.ic('estoque')+'Registrar recebimento</button>';
  else if(oc.status==='parcial') ac+='<button class="btn pri sm" data-act="receber">'+UI.ic('estoque')+'Registrar restante</button>';

  var h=UI.cabecalho({migalha:[{t:'Ordens de Compra',ir:'ordens'},{t:oc.num}], titulo:esc(oc.num)+' '+UI.status('oc',oc.status), sub:esc(f.nome)+' · '+esc(emp.fantasia)+' (CNPJ '+emp.cnpj+') · '+esc(dep?dep.nome:'')+' · emitida em '+F.data(oc.emissao), acoes:ac});

  if(oc.status==='cancelada') h+=UI.nota('<b>Ordem cancelada.</b> '+esc(oc.obs||''),'wt','x');
  else {
    var fluxo=LFI.OC_FLUXO.filter(function(s){ return s!=='parcial'||oc.status==='parcial'||oc.hist.some(function(x){ return x.s==='parcial'; }); });
    var idx=oc.status==='recebida'?fluxo.length:fluxo.indexOf(oc.status);
    h+='<div class="card mb" style="padding:16px 20px 2px">'+UI.passos(fluxo.map(function(s){ return LFI.STATUS.oc[s][0]; }), idx)+'</div>';
  }
  /* NF recebida que referencia esta OC e ainda não foi conferida */
  var nfPend=LFI.db.notas.filter(function(n){ return n.oc===oc.id&&n.status!=='lancada'&&n.status!=='cancelada'; });
  nfPend.forEach(function(n){ h+=UI.nota('<b>A NF '+esc(n.numero)+' de '+esc(f.nome)+' chegou e referencia esta OC</b> ('+F.moeda(n.valor)+', '+F.relativo(n.emissao).toLowerCase()+'). Registre o recebimento e confira a nota para dar entrada no estoque. <a class="vertodos" data-act="receber">Registrar recebimento e vincular</a> · <a class="vertodos" data-act="_ir" data-id="notas/'+n.id+'">Abrir conferência</a>','lf','nota'); });

  h+='<div class="kpis">'+UI.kpi({lb:'Valor da ordem', vl:F.moeda(tot), dl:plural(oc.itens.length,'item','itens'), hl:true})+
    UI.kpi({lb:'Recebido', vl:F.pct(fracRec(oc),0), dl:F.moeda(recebidoV(oc))+' de '+F.moeda(tot)})+
    UI.kpi({lb:'Previsão de entrega', vl:'<span class="'+(a?'oq-atr':'')+'">'+F.dataC(oc.previsao)+'</span>', dl:a?'<span style="color:var(--red);font-weight:800">Atrasada</span> · '+F.relativo(oc.previsao):F.relativo(oc.previsao)})+
    UI.kpi({lb:'Condição de pagamento', vl:esc(oc.cond), dl:'Contas a pagar gerado no lançamento da NF'})+'</div>';

  h+='<div class="grid g21"><div>';
  h+='<div class="card pad0"><h3 style="padding:16px 20px 10px;margin:0"><span class="lft">'+UI.ic('lista')+' Itens da ordem</span><small>pedido × recebido</small></h3><div class="tb-wrap"><table class="tb"><thead><tr><th>Produto</th><th class="r">Pedido</th><th class="r">Preço unit.</th><th class="r">Total</th><th style="width:190px">Recebido</th></tr></thead><tbody>'+
    oc.itens.map(function(i){ var p=LFI.prod(i.prod), fr=i.qtd?Math.min(1,i.recebido/i.qtd):0; return '<tr class="oq-it"><td><b>'+esc(p?p.nome:'—')+'</b><small>Custo médio atual '+F.moeda(p?p.custoMedio:0)+' '+UI.variacao(i.preco,p?p.custoMedio:i.preco,true)+'</small></td><td class="r">'+esc(qtdP(i.prod,i.qtd))+'</td><td class="r">'+F.moeda(i.preco)+'</td><td class="r"><b>'+F.moeda(r2(i.qtd*i.preco))+'</b></td><td><div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700"><span>'+esc(qtdP(i.prod,i.recebido))+'</span><span style="color:var(--muted)">'+Math.round(fr*100)+'%</span></div>'+UI.bar(fr,fr>=1?'ok':fr>0?'wt':'')+(fr<1&&fr>0?'<small style="color:#946C00;font-weight:700;margin-top:3px;display:block">faltam '+esc(qtdP(i.prod,r3(i.qtd-i.recebido)))+'</small>':'')+'</td></tr>'; }).join('')+
    '</tbody><tfoot><tr><td colspan="3">Total</td><td class="r">'+F.moeda(tot)+'</td><td>'+F.moeda(recebidoV(oc))+' recebido</td></tr></tfoot></table></div></div>';

  var nfs=nfsDa(oc);
  h+='<div class="card"><h3><span class="lft">'+UI.ic('nota')+' Notas fiscais vinculadas <span class="n">'+nfs.length+'</span></span></h3>'+(nfs.length?'<div class="lst">'+nfs.map(function(n){ return '<div class="li cl" data-act="_ir" data-id="notas/'+n.id+'"><span class="av">'+UI.ic('nota')+'</span><div class="gr"><div class="tt">NF '+esc(n.numero)+' · série '+esc(n.serie)+'</div><div class="dd">Emitida '+F.data(n.emissao)+' · '+n.itens.length+' itens · '+esc(n.arquivo)+'</div></div><div class="rt">'+F.moeda(n.valor)+'<small>'+UI.status('nf',n.status)+'</small></div></div>'; }).join('')+'</div>':UI.vazio('Nenhuma nota fiscal ainda. Ela é vinculada no registro do recebimento.','🧾'))+
    UI.nota('A <b>entrada no estoque</b>, o custo médio e o contas a pagar são atualizados quando a nota fiscal da entrega é <b>conferida e lançada</b> — assim nada entra em duplicidade.','in','info')+'</div>';
  h+='</div><div>';
  h+='<div class="card"><h3><span class="lft">'+UI.ic('fornecedor')+' Fornecedor</span><button class="vertodos" data-act="_ir" data-id="fornecedores/'+f.id+'">Ficha</button></h3><div class="kv"><div><span>Nome</span><b>'+esc(f.nome)+'</b></div><div><span>CNPJ</span><b class="mono">'+f.cnpj+'</b></div><div><span>Contato</span><b>'+esc(f.contato)+'</b></div><div><span>WhatsApp</span><b>'+f.whats+'</b></div><div><span>Qualidade</span><b>'+UI.estrelas(f.qualidade)+'</b></div><div><span>Pontualidade</span><b>'+f.pontualidade+'%</b></div></div></div>';
  h+='<div class="card"><h3><span class="lft">'+UI.ic('link')+' Origem</span></h3>';
  if(cot) h+='<div class="li cl" data-act="_ir" data-id="compras/'+cot.id+'"><span class="av lf">'+UI.ic('compras')+'</span><div class="gr"><div class="tt">'+esc(cot.num)+'</div><div class="dd">Cotação · '+esc(cot.resp)+' · '+F.data(cot.data)+'</div></div>'+UI.status('cot',cot.status)+'</div>';
  if(oc.grupo){ var irmas=LFI.db.ordens.filter(function(x){ return x.grupo===oc.grupo; }), tg=0; irmas.forEach(function(x){ tg+=LFI.totalOrdem(x); });
    h+='<div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin:12px 0 4px">Compra consolidada '+esc(oc.grupo)+' · '+F.moeda(tg)+'</div>'+irmas.map(function(x){ return '<div class="li'+(x.id===oc.id?'':' cl')+'"'+(x.id===oc.id?'':' data-act="_ir" data-id="ordens/'+x.id+'"')+'><div class="gr"><div class="tt" style="font-size:12.5px">'+esc(x.num)+(x.id===oc.id?' (esta)':'')+'</div><div class="dd">'+esc(LFI.forn(x.forn).nome)+' · '+F.moeda(LFI.totalOrdem(x))+'</div></div>'+UI.status('oc',x.status)+'</div>'; }).join(''); }
  if(!cot&&!oc.grupo) h+=UI.vazio('Ordem emitida diretamente, sem cotação.','📝');
  if(oc.obs) h+=UI.nota(esc(oc.obs),'','info');
  h+='</div>';
  h+='<div class="card"><h3><span class="lft">'+UI.ic('relogio')+' Histórico</span></h3><div class="tl">'+oc.hist.map(function(x,i){ var d=LFI.STATUS.oc[x.s]; return '<div class="tl-it '+(i===oc.hist.length-1?'on':'ok')+'"><b>'+esc(x.nota?'Registro':d?d[0]:x.s)+'</b><small>'+F.dataHora(x.d)+' · '+esc(x.u)+'</small>'+(x.obs?'<small style="display:block">'+esc(x.obs)+'</small>':'')+'</div>'; }).join('')+'</div></div>';
  h+='</div></div>';
  el.innerHTML=h;

  UI.liga(el, UI.navHandlers({
    pdf:function(){ imprimir(oc); },
    aprovar:function(){ UI.confirmar('Aprovar '+esc(oc.num), esc(f.nome)+' · '+F.moeda(tot)+' · '+esc(oc.cond)+'. Depois de aprovada, a OC pode ser enviada ao fornecedor.','Aprovar',function(){ LFI.mudarStatusOrdem(oc,'aprovada'); LFI.atividade('oc',oc.num+' aprovada ('+f.nome+')',{tela:'ordens',id:oc.id}); LFI.salvar(); LFI.recarregar(); UI.toast('Ordem aprovada',oc.num+' · pronta para envio'); },'ok'); },
    enviar:function(){ enviar(oc); },
    aguardar:function(){ LFI.mudarStatusOrdem(oc,'aguardando_entrega','Fornecedor confirmou o pedido'); LFI.recarregar(); UI.toast('Aguardando entrega','Previsão '+F.data(oc.previsao),'in'); },
    cancelar:function(){ cancelar(oc); },
    receber:function(){ receber(oc); }
  }));
}

function msgOC(oc){
  var f=LFI.forn(oc.forn), emp=LFI.emp(oc.empresa), dep=LFI.dep(oc.dep);
  return 'Olá, '+primeiro(f.contato)+'! Segue a ordem de compra '+oc.num+' do '+LFI.db.grupo.nome+' — '+emp.fantasia+' (CNPJ '+emp.cnpj+').\n\n'+
    oc.itens.map(function(i){ return '• '+curto(prodN(i.prod))+' — '+qtdP(i.prod,i.qtd)+' × '+F.moeda(i.preco); }).join('\n')+
    '\n\nTotal: '+F.moeda(LFI.totalOrdem(oc))+'\nPagamento: '+oc.cond+'\nEntrega prevista: '+F.data(oc.previsao)+'\nLocal: '+(dep?dep.nome:'')+' — '+emp.endereco+'\n\nPor favor, confirme o recebimento e cite o número da OC na nota fiscal.';
}
function enviar(oc){
  var f=LFI.forn(oc.forn), modo='whats';
  function corpo(){
    var msg=msgOC(oc);
    return '<div class="seg" style="margin-bottom:14px"><button class="'+(modo==='whats'?'on':'')+'" data-act="modo" data-id="whats">WhatsApp</button><button class="'+(modo==='mail'?'on':'')+'" data-act="modo" data-id="mail">E-mail</button></div>'+
      (modo==='whats'?'<div class="wa"><div class="wa-hd"><span class="av">'+esc(f.nome.slice(0,2).toUpperCase())+'</span><div><b>'+esc(f.nome)+'</b><small>'+f.whats+' · '+esc(f.contato)+'</small></div><span class="wa-tag" style="margin-left:auto">'+UI.ic('whats')+'WhatsApp Business</span></div><div class="wa-b out"><div class="wa-doc"><span class="ic" style="background:#DC2626">PDF</span><span>'+esc(oc.num)+'.pdf<small style="display:block;color:#667781;font-weight:600">Ordem de compra · 1 página</small></span></div>'+esc(msg)+'<span class="h">prévia</span></div></div>'
        :'<div class="oq-mail"><div class="hd"><div><span>Para</span>'+esc(f.email)+'</div><div><span>Cc</span>compras@paodourado.com.br</div><div><span>Assunto</span><b>Ordem de compra '+esc(oc.num)+' — '+esc(LFI.db.grupo.nome)+'</b></div></div><div class="bd">'+esc(msg)+'\n\nAtenciosamente,\n'+esc(LFI.usuario().nome)+' — '+esc(LFI.db.grupo.nome)+'</div><div class="anx"><i>PDF</i>'+esc(oc.num)+'.pdf</div></div>');
  }
  var m=UI.modal({titulo:'Enviar '+esc(oc.num)+' ao fornecedor', sub:esc(f.nome)+' · '+f.whats+' · '+esc(f.email), tam:'lg', corpo:corpo(),
    botoes:'<button class="btn sec" data-act="_fechar">Cancelar</button><button class="btn pri" data-act="ok">'+UI.ic('enviar')+'Enviar por WhatsApp e e-mail</button>',
    acoes:{modo:function(id){ modo=id; m.corpoHTML(corpo()); }, ok:function(){ LFI.mudarStatusOrdem(oc,'enviada','Enviada por WhatsApp ('+f.whats+') e e-mail ('+f.email+')'); LFI.atividade('oc',oc.num+' enviada a '+f.nome,{tela:'ordens',id:oc.id}); LFI.salvar(); m.fechar(); LFI.recarregar(); UI.toast('Ordem enviada ao fornecedor',f.nome+' · WhatsApp e e-mail'); }}});
}
function cancelar(oc){
  var m=UI.modal({titulo:'Cancelar '+esc(oc.num), tam:'sm', corpo:'<div class="field"><label>Motivo</label><select class="inp" id="oq-mot"><option>Fornecedor sem estoque</option><option>Preço ou condição alterados pelo fornecedor</option><option>Necessidade suspensa pela operação</option><option>Pedido duplicado</option><option>Outro motivo</option></select></div><div class="field"><label>Detalhe</label><textarea class="inp" id="oq-obs" style="min-height:70px" placeholder="Opcional"></textarea></div>'+(['enviada','aguardando_entrega'].indexOf(oc.status)>=0?UI.nota('O fornecedor será avisado do cancelamento pelo WhatsApp.','wt'):''),
    botoes:'<button class="btn sec" data-act="_fechar">Voltar</button><button class="btn no" data-act="ok">Cancelar ordem</button>', acoes:{ok:function(){
      var mot=m.el.querySelector('#oq-mot').value, ob=m.el.querySelector('#oq-obs').value.trim(), txt=mot+(ob?' — '+ob:'');
      oc.obs='Cancelada: '+txt; LFI.mudarStatusOrdem(oc,'cancelada',txt); LFI.atividade('oc',oc.num+' cancelada: '+mot,{tela:'ordens',id:oc.id}); LFI.salvar(); m.fechar(); LFI.recarregar(); UI.toast('Ordem cancelada',oc.num,'wt'); }}});
}

/* recebimento: quantidades por item + NF existente ou NF simulada → conferência em Notas Fiscais */
function receber(oc){
  var f=LFI.forn(oc.forn);
  var cand=LFI.db.notas.filter(function(n){ return n.forn===oc.forn&&n.status!=='lancada'&&n.status!=='cancelada'&&(n.oc===oc.id||!n.oc); }).sort(function(a,b){ return (b.oc===oc.id)-(a.oc===oc.id); });
  var escolha=cand.length?cand[0].id:'simular';
  var pend=oc.itens.filter(function(i){ return i.recebido<i.qtd-0.0001; });
  function opcoes(){ return cand.map(function(n){ return '<label class="oq-nf'+(escolha===n.id?' on':'')+'"><input type="radio" name="oq-nf" value="'+n.id+'" data-chg="nf"'+(escolha===n.id?' checked':'')+'><div><b>Vincular NF '+esc(n.numero)+' '+(n.oc===oc.id?UI.badge('Referencia esta OC','lf'):'')+'</b><small>Recebida '+F.relativo(n.emissao).toLowerCase()+' · '+n.itens.length+' itens · '+F.moeda(n.valor)+' · '+esc(n.arquivo)+'</small><small>Abre a conferência da nota (correspondência de produtos, fatores e impostos).</small></div></label>'; }).join('')+
    '<label class="oq-nf'+(escolha==='simular'?' on':'')+'"><input type="radio" name="oq-nf" value="simular" data-chg="nf"'+(escolha==='simular'?' checked':'')+'><div><b>Simular chegada da nota fiscal desta entrega</b><small>Gera uma NF de '+esc(f.nome)+' com as quantidades informadas acima, já vinculada a esta OC, aguardando conferência.</small></div></label>'; }
  var corpo=UI.nota('Registre o que chegou. <b>A entrada no estoque acontece na conferência da nota fiscal</b>: ao lançá-la, o sistema atualiza estoque, custo médio, receitas, contas a pagar e a situação desta OC (parcial ou recebida).','in','info')+
    '<div class="tb-wrap"><table class="tb cp"><thead><tr><th>Produto</th><th class="r">Pedido</th><th class="r">Já recebido</th><th class="r">Pendente</th><th class="r">Recebido agora</th></tr></thead><tbody>'+
    oc.itens.map(function(i){ var p=LFI.prod(i.prod), pd=r3(Math.max(0,i.qtd-i.recebido)); return '<tr><td><b>'+esc(p.nome)+'</b></td><td class="r">'+esc(qtdP(i.prod,i.qtd))+'</td><td class="r">'+esc(qtdP(i.prod,i.recebido))+'</td><td class="r">'+esc(qtdP(i.prod,pd))+'</td><td class="r nw"><input class="inp sm num" style="width:90px;display:inline-block" data-p="'+i.prod+'" data-max="'+pd+'" value="'+(pd>0?UI.numBR(pd):'0')+'"'+(pd>0?'':' disabled')+'> <small style="display:inline">'+p.un+'</small></td></tr>'; }).join('')+
    '</tbody></table></div><div style="display:flex;gap:6px;margin:10px 0 16px"><button class="btn sec xs" data-act="tudo">Recebido completo</button><button class="btn gh xs" data-act="zerar">Zerar quantidades</button></div>'+
    '<label style="display:block;font-size:12px;font-weight:800;margin-bottom:8px">Nota fiscal desta entrega</label><div id="oq-op">'+opcoes()+'</div>';
  var m=UI.modal({titulo:'Registrar recebimento · '+esc(oc.num), sub:esc(f.nome)+' · '+plural(pend.length,'item pendente','itens pendentes'), tam:'lg', corpo:corpo,
    botoes:'<button class="btn sec" data-act="_fechar">Cancelar</button><button class="btn pri" data-act="ok">'+UI.ic('nota')+'Registrar e conferir nota</button>',
    acoes:{
      nf:function(_,ev){ escolha=ev.target.value; m.el.querySelector('#oq-op').innerHTML=opcoes(); },
      tudo:function(){ UI.els('[data-p]',m.el).forEach(function(i){ i.value=UI.numBR(+i.getAttribute('data-max')); }); },
      zerar:function(){ UI.els('[data-p]:not([disabled])',m.el).forEach(function(i){ i.value='0'; }); },
      ok:function(){
        var rec={}, n=0, txt=[], erro=false;
        UI.els('[data-p]',m.el).forEach(function(i){ var q=r3(UI.num(i.value)), mx=+i.getAttribute('data-max'); if(q>mx+0.0001) erro=true; if(q>0){ rec[i.getAttribute('data-p')]=q; n++; txt.push(curto(prodN(i.getAttribute('data-p')))+' '+qtdP(i.getAttribute('data-p'),q)); } });
        if(erro){ UI.toast('Quantidade maior que o pendente','Confira os valores informados','wt'); return; }
        if(!n){ UI.toast('Informe ao menos uma quantidade recebida','','wt'); return; }
        var nf;
        if(escolha==='simular') nf=LFI.notaDaOrdem(oc.id, rec);
        else { nf=LFI.nota(escolha); nf.oc=oc.id; }
        oc.hist.push({d:LFI.agoraISO(), s:oc.status, u:LFI.usuario().nome, nota:true, obs:'Recebimento registrado ('+txt.join(', ')+') · NF '+nf.numero+' aguardando conferência'});
        oc.recebimentos=oc.recebimentos||[]; oc.recebimentos.push({d:LFI.agoraISO(), nf:nf.id, itens:rec, u:LFI.usuario().nome});
        LFI.salvar(); m.fechar();
        UI.toast('Recebimento registrado','Confira a NF '+nf.numero+' para dar entrada no estoque','in');
        LFI.ir('notas', nf.id);
      }}});
}

function imprimir(oc){
  var f=LFI.forn(oc.forn), emp=LFI.emp(oc.empresa), dep=LFI.dep(oc.dep), cot=oc.cot?LFI.cotacao(oc.cot):null;
  var h='<div class="kp"><div><span>Ordem de compra</span><b>'+esc(oc.num)+'</b></div><div><span>Emissão</span><b>'+F.data(oc.emissao)+'</b></div><div><span>Previsão</span><b>'+F.data(oc.previsao)+'</b></div><div><span>Pagamento</span><b>'+esc(oc.cond)+'</b></div><div><span>Status</span><b>'+esc(LFI.STATUS.oc[oc.status][0])+'</b></div></div>'+
    '<table><tr><td style="width:50%;vertical-align:top"><b>Comprador</b><br>'+esc(emp.razao)+'<br>CNPJ '+emp.cnpj+' · IE '+esc(emp.ie)+'<br>'+esc(emp.endereco)+' — '+esc(emp.cidade)+'/'+emp.uf+'<br>Entrega: '+esc(dep?dep.nome:'')+'</td><td style="vertical-align:top"><b>Fornecedor</b><br>'+esc(f.razao)+'<br>CNPJ '+f.cnpj+'<br>'+esc(f.cidade)+'/'+f.uf+'<br>'+esc(f.contato)+' · '+f.whats+' · '+esc(f.email)+'</td></tr></table>'+
    '<h2>Itens</h2><table><thead><tr><th>#</th><th>Produto</th><th>NCM</th><th class="r">Quantidade</th><th class="r">Preço unit.</th><th class="r">Total</th></tr></thead><tbody>'+oc.itens.map(function(i,k){ var p=LFI.prod(i.prod); return '<tr><td>'+(k+1)+'</td><td>'+esc(p.nome)+'</td><td>'+esc(p.ncm)+'</td><td class="r">'+esc(qtdP(i.prod,i.qtd))+'</td><td class="r">'+F.moeda(i.preco)+'</td><td class="r">'+F.moeda(r2(i.qtd*i.preco))+'</td></tr>'; }).join('')+'</tbody><tfoot><tr><td colspan="5">Total da ordem</td><td class="r">'+F.moeda(LFI.totalOrdem(oc))+'</td></tr></tfoot></table>'+
    '<p style="font-size:10.5px">'+(cot?'Origem: '+esc(cot.num)+(oc.grupo?' · compra consolidada '+esc(oc.grupo):'')+'. ':'')+'A nota fiscal deve citar o número desta OC. '+esc(oc.obs||'')+'</p>'+
    '<table style="margin-top:40px"><tr><td style="border:0;text-align:center;border-top:1px solid #999">Comprador — '+esc(LFI.usuario().nome)+'</td><td style="border:0;width:40px"></td><td style="border:0;text-align:center;border-top:1px solid #999">Fornecedor — '+esc(f.contato)+'</td></tr></table>';
  UI.exportarPDF('Ordem de compra '+oc.num, f.nome+' · '+emp.fantasia, h);
}

LFI.registrar('ordens',{titulo:'Ordens de Compra', render:render});
})();
