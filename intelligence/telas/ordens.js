/* LivePro — PEDIDOS (ordens aprovadas aos fornecedores)
   Fluxo obrigatório: Ordem (cotação) → Respostas → Pedido → Recebimento.
   Lista enxuta com resumo no topo; clicar abre os itens e dados da compra; "Receber pedido" leva ao Recebimento. */
(function(){
'use strict';
var LFI=window.LFI, UI=LFI.ui, F=LFI.fmt, esc=UI.esc;

function st(){ return LFI.estado.pedidos = LFI.estado.pedidos || {f:'aberto', q:''}; }
function css(){ if(document.getElementById('css-pedidos')) return; var e=document.createElement('style'); e.id='css-pedidos'; e.textContent=
  '.pd-flux{display:flex;align-items:center;background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:12px 18px;margin-bottom:16px;overflow-x:auto}'+
  '.pd-fi{display:flex;align-items:center;gap:9px;flex:none;font-size:12.5px;font-weight:800;color:var(--muted);cursor:pointer}.pd-fi .bo{width:26px;height:26px;border-radius:50%;border:2px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:11.5px;background:#fff}'+
  '.pd-fi.on{color:var(--text)}.pd-fi.on .bo{border-color:var(--roxo);color:var(--roxo)}.pd-fi.ok{color:var(--text)}.pd-fi.ok .bo{background:var(--roxo);border-color:var(--roxo);color:#fff}.pd-fi small{display:block;font-size:11px;font-weight:600;color:var(--muted)}'+
  '.pd-fl{flex:1 1 30px;min-width:30px;height:2px;background:var(--border2);margin:0 12px}.pd-fl.ok{background:var(--roxo)}'+
  '.pd-atr{color:var(--red);font-weight:800}';
  document.head.appendChild(e); }

var ABERTOS=['aguardando_aprovacao','aprovada','enviada','aguardando_entrega','parcial'];
function aberto(o){ return ABERTOS.indexOf(o.status)>=0; }
function sit(o){ if(o.status==='recebida') return ['Recebido','ok']; if(o.status==='parcial') return ['Entrega parcial','wt']; if(o.status==='cancelada') return ['Cancelado','no']; if(o.previsao<LFI.hoje()) return ['Atrasado','no']; if(o.previsao===LFI.hoje()) return ['Chega hoje','lf']; return ['Aguardando entrega','in']; }
function pedidos(){ return LFI.db.ordens.filter(function(o){ return LFI.empresaVisivel(o.empresa); }); }
function criado(o){ var h=(o.hist||[])[0]; return h?h.d:o.emissao; }
function fluxo(at){
  var ps=[['Ordem','criar e enviar a cotação','compras'],['Respostas','comparar e escolher','compras'],['Pedido','pedido aprovado','ordens'],['Recebimento','conferir a entrega','notas']];
  return '<div class="pd-flux">'+ps.map(function(p,i){ return (i?'<div class="pd-fl'+(i<=at?' ok':'')+'"></div>':'')+'<div class="pd-fi'+(i<at?' ok':i===at?' on':'')+'" data-act="_ir" data-id="'+p[2]+'"><span class="bo">'+(i<at?'✓':(i+1))+'</span><span>'+p[0]+'<small>'+p[1]+'</small></span></div>'; }).join('')+'</div>';
}

function render(el, arg){
  css();
  var s=st(), todos=pedidos(), abertos=todos.filter(aberto);
  var prev=0; abertos.forEach(function(o){ prev+=LFI.totalOrdem(o)*(o.status==='parcial'?pendFrac(o):1); });
  var hoje=abertos.filter(function(o){ return o.previsao===LFI.hoje(); }).length, atr=abertos.filter(function(o){ return o.previsao<LFI.hoje(); }).length;
  var q=String(s.q||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  var ls=(s.f==='aberto'?abertos:s.f==='recebido'?todos.filter(function(o){ return o.status==='recebida'; }):todos).filter(function(o){
    if(!q) return true; var t=(o.num+' '+LFI.forn(o.forn).nome+' '+o.itens.map(function(i){ var p=LFI.prod(i.prod); return p?p.nome:''; }).join(' ')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); return t.indexOf(q)>=0; });

  var h=UI.cabecalho({titulo:'Pedidos', sub:'Pedidos aprovados aos fornecedores · quando a entrega chegar, clique em Receber'});
  h+=fluxo(2);
  h+='<div class="kpis">'+UI.kpi({lb:'Valor previsto', vl:F.moeda(prev), dl:'Pedidos ainda não recebidos', hl:true})+
    UI.kpi({lb:'Aguardando entrega', vl:String(abertos.length), dl:'Pedidos em aberto'})+
    UI.kpi({lb:'<span style="color:var(--roxo)">●</span> Chegam hoje', vl:String(hoje), dl:'Previsão de entrega para hoje'})+
    UI.kpi({lb:'<span style="color:var(--red)">●</span> Atrasados', vl:String(atr), dl:'Passaram da previsão de entrega'})+'</div>';
  h+='<div class="card"><div class="barra"><div class="seg">'+[['aberto','Em aberto'],['recebido','Recebidos'],['todos','Todos']].map(function(x){ return '<button class="'+(s.f===x[0]?'on':'')+'" data-act="f" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>'+
    '<div class="search">'+UI.ic('busca')+'<input placeholder="Buscar pedido, fornecedor ou produto" value="'+esc(s.q)+'" data-chg="q"></div></div><div id="pd-t"></div></div>';
  el.innerHTML=h;
  UI.tabela(el.querySelector('#pd-t'),{linhas:ls, ordem:1, dir:-1, linhaAct:'abrir', vazio:'Nenhum pedido aqui. Os pedidos aparecem quando uma ordem é aprovada.',
    classeLinha:function(o){ var x=sit(o)[0]; return x==='Atrasado'?'alerta':x==='Chega hoje'?'aviso':''; }, colunas:[
    {t:'Pedido', v:function(o){ return '<b>'+esc(o.num)+'</b>'+(o.cot&&LFI.cotacao(o.cot)?'<small>ordem '+esc(LFI.cotacao(o.cot).num)+'</small>':''); }, ord:function(o){ return o.num; }},
    {t:'Criado em', v:function(o){ return F.dataHora(criado(o)); }, ord:function(o){ return criado(o); }},
    {t:'Fornecedor', v:function(o){ return '<b>'+esc(LFI.forn(o.forn).nome)+'</b>'; }, ord:function(o){ return LFI.forn(o.forn).nome; }},
    {t:'Itens', r:true, v:function(o){ return String(o.itens.length); }, ord:function(o){ return o.itens.length; }},
    {t:'Valor', r:true, v:function(o){ return '<b>'+F.moeda(LFI.totalOrdem(o))+'</b>'; }, ord:function(o){ return LFI.totalOrdem(o); }},
    {t:'Entrega prevista', v:function(o){ var x=sit(o)[0]; return '<span class="'+(x==='Atrasado'?'pd-atr':'')+'">'+F.data(o.previsao)+'</span>'; }, ord:function(o){ return o.previsao; }},
    {t:'Situação', v:function(o){ var x=sit(o); return UI.badge(x[0],x[1]); }, ord:function(o){ return sit(o)[0]; }},
    {t:'', r:true, ord:false, v:function(o){ return aberto(o)?'<span class="btn pri xs" data-act="receber" data-id="'+o.id+'">Receber</span>':''; }}
  ]});
  var H=UI.navHandlers({ abrir:function(id){ detalhe(id); }, f:function(id){ s.f=id; LFI.recarregar(); }, q:function(_,ev){ s.q=ev.target.value; LFI.recarregar(); },
    receber:function(id,ev){ ev.stopPropagation(); receber(id); } });
  UI.liga(el, H);
  if(arg&&LFI.ordem(arg)) setTimeout(function(){ detalhe(arg); },60);
}
function pendFrac(o){ var t=0, p=0; o.itens.forEach(function(i){ t+=i.qtd*i.preco; p+=Math.max(0,i.qtd-i.recebido)*i.preco; }); return t?p/t:0; }

/* janela com os itens e dados da compra */
function detalhe(id){
  var o=LFI.ordem(id), f=LFI.forn(o.forn), e=LFI.emp(o.empresa), x=sit(o), cot=o.cot&&LFI.cotacao(o.cot);
  var nfs=(o.nfs||[]).map(LFI.nota).filter(Boolean);
  var h='<div class="kv c4" style="margin-bottom:16px"><div><span>Fornecedor</span><b>'+esc(f.nome)+'</b><small>'+esc(f.whats)+'</small></div><div><span>Criado em</span><b>'+F.dataHora(criado(o))+'</b></div><div><span>Entrega prevista</span><b>'+F.data(o.previsao)+'</b></div><div><span>Pagamento</span><b>'+esc(o.cond)+'</b></div>'+
    '<div><span>Empresa</span><b>'+esc(e.fantasia)+'</b></div><div><span>Entrega em</span><b>'+esc(LFI.dep(o.dep).nome)+'</b></div><div><span>Ordem de origem</span><b>'+(cot?esc(cot.num):'—')+'</b></div><div><span>Situação</span><b>'+UI.badge(x[0],x[1])+'</b></div></div>';
  h+='<div class="tb-wrap"><table class="tb"><thead><tr><th>Produto</th><th class="r">Pedido</th><th class="r">Preço</th><th class="r">Total</th><th class="r">Recebido</th></tr></thead><tbody>'+
    o.itens.map(function(i){ var p=LFI.prod(i.prod); return '<tr><td><div class="cp-prod">'+UI.fotoProd(p,34)+'<b>'+esc(p?p.nome:i.prod)+'</b></div></td><td class="r">'+F.qtd(i.qtd,p?p.un:'')+'</td><td class="r">'+F.moeda(i.preco)+'</td><td class="r"><b>'+F.moeda(i.qtd*i.preco)+'</b></td><td class="r">'+(i.recebido?F.qtd(i.recebido,p?p.un:''):'—')+'</td></tr>'; }).join('')+
    '</tbody><tfoot><tr><td colspan="3">Total do pedido</td><td class="r">'+F.moeda(LFI.totalOrdem(o))+'</td><td></td></tr></tfoot></table></div>';
  if(nfs.length) h+='<div style="margin-top:14px;font-size:13px;font-weight:700">Notas fiscais: '+nfs.map(function(n){ return '<a class="vertodos" data-act="nf" data-id="'+n.id+'">NF '+esc(n.numero)+'</a> '+UI.status('nf',n.status); }).join(' · ')+'</div>';
  if(o.obs) h+='<p style="font-size:12.5px;color:var(--muted);font-weight:600;margin:12px 0 0">'+esc(o.obs)+'</p>';
  var m=UI.modal({titulo:'Pedido '+esc(o.num), sub:esc(f.nome)+' · '+F.moeda(LFI.totalOrdem(o)), tam:'lg', corpo:h,
    botoes:'<button class="btn sec" data-act="_fechar">Fechar</button>'+(aberto(o)?'<button class="btn pri" data-act="rec">'+UI.ic('caminhao')+(o.status==='parcial'?'Receber o restante':'Receber pedido')+'</button>':''),
    acoes:{rec:function(){ m.fechar(); receber(o.id); }, nf:function(nid){ m.fechar(); LFI.ir('notas',nid); }}});
}
/* receber: usa a nota já importada para este pedido; senão abre a conferência com os itens do pedido */
function receber(id){
  var o=LFI.ordem(id), pend=LFI.db.notas.filter(function(n){ return n.oc===o.id&&(n.status==='recebida'||n.status==='conferencia'); })[0];
  if(pend){ UI.toast('Abrindo a conferência da NF '+pend.numero, 'Nota do fornecedor já recebida para este pedido','in'); LFI.ir('notas', pend.id); return; }
  var faltam={}; o.itens.forEach(function(i){ var q=Math.max(0,i.qtd-i.recebido); if(q>0) faltam[i.prod]=q; });
  var n=LFI.notaDaOrdem(o.id, faltam);
  UI.toast('Recebimento do pedido '+o.num, 'Confira item a item, com fotos, validade e local','in');
  LFI.ir('notas', n.id);
}

LFI.registrar('ordens',{titulo:'Pedidos', render:render});
})();
