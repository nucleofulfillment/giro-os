/* LiveFood Intelligence — FORNECEDORES
   Cadastro, desempenho (compras, notas, cotações, pontualidade), produtos fornecidos, histórico de preços e avaliação. */
(function(){
'use strict';
var LFI=window.LFI, UI=LFI.ui, F=LFI.fmt, esc=UI.esc, U=LFI.dataUtil, r2=U.r2;

var CSS=[
'.fq-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:14px}',
'.fq-c{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:16px 18px;cursor:pointer;box-shadow:var(--sh1);transition:box-shadow .2s,transform .2s,border-color .2s;display:flex;flex-direction:column;gap:12px}',
'.fq-c:hover{box-shadow:var(--sh2);transform:translateY(-2px);border-color:var(--border2)}',
'.fq-hd{display:flex;gap:12px;align-items:flex-start}',
'.fq-av{width:44px;height:44px;border-radius:12px;background:var(--lf-soft);color:var(--roxo-esc);font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;flex:none}',
'.fq-av.lg{width:56px;height:56px;font-size:18px;border-radius:15px}',
'.fq-hd b{font-size:15px;font-weight:800;display:block}',
'.fq-hd small{display:block;font-size:11.5px;color:var(--muted);font-weight:600;margin-top:2px}',
'.fq-tags{display:flex;flex-wrap:wrap;gap:5px}',
'.fq-m{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;border-top:1px solid var(--border);padding-top:12px}',
'.fq-m span{display:block;font-size:10.5px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.4px}',
'.fq-m b{display:block;font-size:14px;font-weight:800;margin-top:2px;font-variant-numeric:tabular-nums}',
'.fq-ln{display:flex;justify-content:space-between;gap:10px;font-size:12px;font-weight:700;color:var(--muted2)}',
'.fq-ln b{color:var(--text)}',
'.fq-st{cursor:pointer;font-size:22px;color:var(--s4);letter-spacing:2px;user-select:none}',
'.fq-st span.on{color:#E9A80B}',
'.fq-st span:hover{color:#F5C451}',
'.fq-cats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}',
'.fq-vp{display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)}',
'.fq-vp b{font-size:13px;font-weight:800}',
'.fq-vp small{display:block;font-size:11px;color:var(--muted);font-weight:600}',
'.tela-fornecedores .grid>.card+.card,.tela-fornecedores .grid>div>.card:first-child{margin-top:0}',
'@media (max-width:700px){.fq-cats{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}'
].join('\n');
function css(){ if(document.getElementById('css-fornecedores')) return; var s=document.createElement('style'); s.id='css-fornecedores'; s.textContent=CSS; document.head.appendChild(s); }

var PER={'30d':['30 dias',29],'90d':['90 dias',89],'12m':['12 meses',364]};
function st(){ return LFI.estado.fornecedores=LFI.estado.fornecedores||{busca:'', cat:'', per:'90d', modo:'cards', hp:{}}; }
function norm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
function plural(n,a,b){ return n+' '+(n===1?a:b); }
function ini(nome){ var w=String(nome).split(/\s+/).filter(function(x){ return x.length>2; }); if(!w.length) w=[nome]; return (w[0][0]+((w[1]||'')[0]||'')).toUpperCase(); }
function curto(n){ return String(n||'').replace(/\s*\([^)]*\)/,'').trim(); }
function somaMin(s,m){ var d=new Date(s); d.setMinutes(d.getMinutes()+m); return U.iso(d)+'T'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
function enviadaEm(c){ if(c.enviadaEm) return c.enviadaEm; if(c.status==='preparacao'||c.status==='aguardando_envio') return null; if(c.status==='cancelada'&&!c.propostas.length) return null; return somaMin(c.data,12); }
function dur(m){ if(m==null||isNaN(m)||m<0) return '—'; if(m<60) return m+' min'; var h=Math.floor(m/60), x=m%60; if(h<48) return h+'h'+(x?String(x).padStart(2,'0'):''); return Math.round(h/24)+' dias'; }
function produtosDe(fId){ return LFI.db.produtos.filter(function(p){ return LFI.compravel(p)&&(p.forn===fId||(p.fornAlt||[]).indexOf(fId)>=0); }); }
function notasDe(fId, de){ return LFI.db.notas.filter(function(n){ return n.forn===fId&&LFI.empresaVisivel(n.empresa)&&(!de||(n.entrada||n.emissao)>=de); }); }
function comprado(fId, de){ var t=0, n=0; notasDe(fId,de).forEach(function(x){ if(x.status==='lancada'){ t+=x.valor; n++; } }); return {total:r2(t), n:n}; }
function ultimoPreco(prod, fId){
  var best=null;
  LFI.db.notas.forEach(function(n){ if(n.forn!==fId||n.status!=='lancada') return; n.itens.forEach(function(it){ if(it.prod===prod&&it.qtd){ var v=r2(it.vProd/(it.qtd*(it.fator||1))); if(!best||n.emissao>best.d) best={d:n.emissao, v:v, o:'NF '+n.numero, tela:'notas/'+n.id}; } }); });
  LFI.db.cotacoes.forEach(function(c){ c.propostas.forEach(function(p){ if(p.forn!==fId) return; p.itens.forEach(function(it){ if(it.prod===prod&&it.preco>0){ var d=String(p.recebida).slice(0,10); if(!best||d>best.d) best={d:d, v:it.preco, o:'Proposta '+c.num, tela:'compras/'+c.id}; } }); }); });
  return best;
}
function precosDe(prod, fId){
  var out=[];
  LFI.db.notas.forEach(function(n){ if(n.forn!==fId||n.status!=='lancada') return; n.itens.forEach(function(it){ if(it.prod===prod&&it.qtd) out.push({d:n.emissao, v:r2(it.vProd/(it.qtd*(it.fator||1))), o:'NF '+n.numero, tela:'notas/'+n.id}); }); });
  LFI.db.cotacoes.forEach(function(c){ c.propostas.forEach(function(p){ if(p.forn!==fId) return; p.itens.forEach(function(it){ if(it.prod===prod&&it.preco>0) out.push({d:String(p.recebida).slice(0,10), v:it.preco, o:'Proposta '+c.num+(c.escolhas&&c.escolhas[prod]===fId?' (vencedora)':''), tela:'compras/'+c.id}); }); }); });
  LFI.db.ordens.forEach(function(o){ if(o.forn!==fId) return; o.itens.forEach(function(i){ if(i.prod===prod) out.push({d:o.emissao, v:i.preco, o:o.num, tela:'ordens/'+o.id}); }); });
  return out.sort(function(a,b){ return a.d<b.d?1:-1; });
}
function cotacoesDe(fId){ return LFI.db.cotacoes.filter(function(c){ return c.fornecedores.indexOf(fId)>=0&&LFI.empresaVisivel(c.empresa); }); }
function desempCot(fId){
  var cs=cotacoesDe(fId), resp=0, tm=[], dec=0, venceu=0;
  cs.forEach(function(c){ var p=null; c.propostas.forEach(function(x){ if(x.forn===fId) p=x; }); var e=enviadaEm(c);
    if(p){ resp++; if(e){ var m=Math.round((new Date(p.recebida)-new Date(e))/6e4); if(m>=0) tm.push(m); } }
    if(c.escolhas&&Object.keys(c.escolhas).length&&p){ dec++; if(Object.keys(c.escolhas).some(function(k){ return c.escolhas[k]===fId; })) venceu++; } });
  return {n:cs.length, resp:resp, taxa:cs.length?resp/cs.length:0, tm:tm.length?Math.round(tm.reduce(function(a,b){ return a+b; },0)/tm.length):null, dec:dec, venceu:venceu, win:dec?venceu/dec:null};
}

function render(el, arg){
  css(); document.body.classList.add('foco');
  if(arg){ var f=LFI.forn(arg); if(f) return detalhe(el,f);
    el.innerHTML=UI.cabecalho({migalha:[{t:'Fornecedores',ir:'fornecedores'},{t:'Não encontrado'}], titulo:'Fornecedor não encontrado'})+'<div class="card">'+UI.vazio('O fornecedor solicitado não existe.','🔎')+'</div>'; UI.liga(el,UI.navHandlers()); return; }
  lista(el);
}

/* =================== LISTA =================== */
function lista(el){
  var s=st(), de=U.D(-PER[s.per][1]), q=norm(s.busca), emp=LFI.empresaAtual();
  var todos=LFI.db.fornecedores, totalGeral=0;
  todos.forEach(function(f){ totalGeral+=comprado(f.id,de).total; });
  var ls=todos.filter(function(f){ return (!s.cat||f.cats.indexOf(s.cat)>=0); })
    .map(function(f){ var c=comprado(f.id,de); return {f:f, c:c, np:produtosDe(f.id).length, part:totalGeral?c.total/totalGeral:0}; }).sort(function(a,b){ return b.c.total-a.c.total||a.f.nome.localeCompare(b.f.nome,'pt-BR'); });
  var qm=0, pm=0; todos.forEach(function(f){ qm+=f.qualidade; pm+=f.pontualidade; }); qm/=todos.length||1; pm/=todos.length||1;
  var ativos=todos.filter(function(f){ return comprado(f.id,de).n>0||LFI.db.ordens.some(function(o){ return o.forn===f.id&&o.emissao>=de; }); }).length;
  var catsUsadas=LFI.db.categorias.filter(function(c){ return c.id!=='ori' && c.id!=='tem' && todos.some(function(f){ return f.cats.indexOf(c.id)>=0; }); });

  var h=UI.cabecalho({titulo:'Fornecedores', sub:plural(todos.length,'fornecedor','fornecedores')+' · compras dos últimos '+PER[s.per][0],
    acoes:'<div class="seg">'+Object.keys(PER).map(function(k){ return '<button class="'+(s.per===k?'on':'')+'" data-act="per" data-id="'+k+'">'+PER[k][0]+'</button>'; }).join('')+'</div><button class="btn pri sm" data-act="novo">'+UI.ic('mais')+'Novo fornecedor</button>'});
  h+='<div class="kpis">'+UI.kpi({lb:'Fornecedores ativos', vl:ativos+' <small>/ '+todos.length+'</small>', dl:'com compra ou OC no período'})+
    UI.kpi({lb:'Compras no período', vl:F.moeda(totalGeral), dl:'Notas fiscais lançadas', hl:true})+
    UI.kpi({lb:'Qualidade média', vl:F.num(qm,1)+' <small>/ 5</small>', dl:UI.estrelas(Math.round(qm))})+
    UI.kpi({lb:'Pontualidade média', vl:F.num(pm,0)+'%', dl:'Entregas dentro do prazo'})+'</div>';
  h+='<div class="barra"><div class="search">'+UI.ic('busca')+'<input placeholder="Nome, razão social, CNPJ, cidade ou contato" value="'+esc(s.busca)+'" data-inp="busca" id="fq-busca"></div><div class="pills"><button class="pill'+(!s.cat?' on':'')+'" data-act="cat" data-id="">Todas</button>'+catsUsadas.map(function(c){ return '<button class="pill'+(s.cat===c.id?' on':'')+'" data-act="cat" data-id="'+c.id+'">'+esc(c.nome)+'</button>'; }).join('')+'</div><span class="sp"></span><div class="seg"><button class="'+(s.modo==='cards'?'on':'')+'" data-act="modo" data-id="cards">Cartões</button><button class="'+(s.modo==='tabela'?'on':'')+'" data-act="modo" data-id="tabela">Tabela</button></div></div>';
  h+='<div id="fq-res"></div>';
  el.innerHTML=h;
  var res=el.querySelector('#fq-res');
  function desenha(lista){
    if(s.modo==='cards'){
      res.innerHTML=lista.length?'<div class="fq-grid">'+lista.map(function(x){ var f=x.f; return '<div class="fq-c" data-act="abrir" data-id="'+f.id+'" data-busca="'+esc(norm(f.nome+' '+f.razao+' '+f.cnpj+' '+f.cidade+' '+f.contato))+'">'+
        '<div class="fq-hd"><span class="fq-av">'+esc(ini(f.nome))+'</span><div style="flex:1;min-width:0"><b>'+esc(f.nome)+'</b><small>'+esc(f.razao)+'</small><small class="mono">CNPJ '+f.cnpj+'</small></div>'+UI.estrelas(f.qualidade)+'</div>'+
        '<div class="fq-ln"><span>'+UI.ic('empresa').replace('class=""','style="width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2;vertical-align:-2px"')+' '+esc(f.cidade)+'/'+f.uf+'</span><span>'+esc(f.contato)+' · <b>'+f.whats+'</b></span></div>'+
        '<div class="fq-tags">'+f.cats.map(function(c){ var cc=LFI.cat(c); return cc?'<span class="tag">'+esc(cc.nome)+'</span>':''; }).join('')+'</div>'+
        '<div class="fq-ln"><span>Entrega em <b>'+f.prazo+' dia'+(f.prazo>1?'s':'')+'</b> · '+esc(f.cond)+'</span><span>'+f.pontualidade+'% pontual</span></div>'+UI.bar(f.pontualidade/100,f.pontualidade>=95?'ok':f.pontualidade>=90?'':'wt')+
        '<div class="fq-m"><div><span>Compras</span><b>'+F.moedaK(x.c.total)+'</b></div><div><span>Notas</span><b>'+x.c.n+'</b></div><div><span>Produtos</span><b>'+x.np+'</b></div></div></div>'; }).join('')+'</div>':'<div class="card">'+UI.vazio('Nenhum fornecedor encontrado.','🔎')+'</div>';
    } else {
      res.innerHTML='<div class="card pad0" id="fq-t"></div>';
      UI.tabela(res.querySelector('#fq-t'),{linhas:lista, linhaAct:'abrir', linhaId:function(x){ return x.f.id; }, colunas:[
        {t:'Fornecedor', v:function(x){ return '<b>'+esc(x.f.nome)+'</b><small>'+esc(x.f.razao)+'</small>'; }, ord:function(x){ return x.f.nome; }},
        {t:'CNPJ', v:function(x){ return '<span class="mono">'+x.f.cnpj+'</span>'; }, ord:false, nw:true},
        {t:'Cidade/UF', v:function(x){ return esc(x.f.cidade)+'/'+x.f.uf; }, ord:function(x){ return x.f.cidade; }},
        {t:'Contato', v:function(x){ return esc(x.f.contato)+'<small>'+x.f.whats+'</small>'; }, ord:function(x){ return x.f.contato; }},
        {t:'Categorias', v:function(x){ return x.f.cats.map(function(c){ return LFI.cat(c)?'<span class="tag">'+esc(LFI.cat(c).nome)+'</span>':''; }).join(' '); }, ord:false},
        {t:'Prazo · condição', v:function(x){ return x.f.prazo+'d<small>'+esc(x.f.cond)+'</small>'; }, ord:function(x){ return x.f.prazo; }},
        {t:'Qualidade', v:function(x){ return UI.estrelas(x.f.qualidade); }, ord:function(x){ return x.f.qualidade; }},
        {t:'Pontualidade', r:true, v:function(x){ return x.f.pontualidade+'%'; }, ord:function(x){ return x.f.pontualidade; }},
        {t:'Compras', r:true, v:function(x){ return '<b>'+F.moeda(x.c.total)+'</b><small>'+plural(x.c.n,'nota','notas')+' · '+F.pct(x.part,0)+'</small>'; }, ord:function(x){ return x.c.total; }},
        {t:'Produtos', r:true, v:function(x){ return String(x.np); }, ord:function(x){ return x.np; }}
      ]});
    }
  }
  function filtra(){ var qq=norm(s.busca); return ls.filter(function(x){ return !qq||norm(x.f.nome+' '+x.f.razao+' '+x.f.cnpj+' '+x.f.cidade+' '+x.f.contato).indexOf(qq)>=0; }); }
  desenha(filtra());
  UI.liga(el, UI.navHandlers({
    per:function(id){ s.per=id; LFI.recarregar(); },
    cat:function(id){ s.cat=id; LFI.recarregar(); },
    modo:function(id){ s.modo=id; LFI.recarregar(); },
    busca:function(_,ev){ s.busca=ev.target.value; desenha(filtra()); },
    abrir:function(id){ LFI.ir('fornecedores',id); },
    novo:function(){ editar(null); }
  }));
}

/* =================== DETALHE =================== */
function detalhe(el, f){
  var s=st(), de=U.D(-PER[s.per][1]), c=comprado(f.id,de), cAll=comprado(f.id,null);
  var totGeral=0; LFI.db.fornecedores.forEach(function(x){ totGeral+=comprado(x.id,de).total; });
  var prods=produtosDe(f.id).sort(function(a,b){ return (b.forn===f.id)-(a.forn===f.id)||a.nome.localeCompare(b.nome,'pt-BR'); });
  var nfs=notasDe(f.id,null).sort(function(a,b){ return a.emissao<b.emissao?1:-1; });
  var ocs=LFI.db.ordens.filter(function(o){ return o.forn===f.id&&LFI.empresaVisivel(o.empresa); }).sort(function(a,b){ return a.emissao<b.emissao?1:-1; });
  var cps=LFI.db.contasPagar.filter(function(x){ return x.forn===f.id&&LFI.empresaVisivel(x.empresa); }).sort(function(a,b){ return a.venc<b.venc?1:-1; });
  var cots=cotacoesDe(f.id).sort(function(a,b){ return a.data<b.data?1:-1; }), D=desempCot(f.id);
  var aberto=0; cps.forEach(function(x){ if(x.status!=='pago') aberto+=x.valor; });

  var h=UI.cabecalho({migalha:[{t:'Fornecedores',ir:'fornecedores'},{t:f.nome}], titulo:esc(f.nome), sub:esc(f.razao)+' · CNPJ <span class="mono">'+f.cnpj+'</span> · '+esc(f.cidade)+'/'+f.uf,
    acoes:'<div class="seg">'+Object.keys(PER).map(function(k){ return '<button class="'+(s.per===k?'on':'')+'" data-act="per" data-id="'+k+'">'+PER[k][0]+'</button>'; }).join('')+'</div><button class="btn sec sm" data-act="vincular">'+UI.ic('link')+'Vincular produtos</button><button class="btn sec sm" data-act="editar">'+UI.ic('editar')+'Editar</button><button class="btn pri sm" data-act="cotar">'+UI.ic('whats')+'Nova cotação</button>'});
  h+='<div class="kpis">'+UI.kpi({lb:'Total comprado', vl:F.moeda(c.total), dl:'Últimos '+PER[s.per][0]+' · '+F.moeda(cAll.total)+' no histórico', hl:true})+
    UI.kpi({lb:'Notas fiscais', vl:String(c.n), dl:nfs.filter(function(n){ return n.status!=='lancada'; }).length+' aguardando conferência'})+
    UI.kpi({lb:'Ticket médio', vl:F.moeda(c.n?c.total/c.n:0), dl:'por nota lançada'})+
    UI.kpi({lb:'Participação nas compras', vl:F.pct(totGeral?c.total/totGeral:0), dl:'do total comprado no período'})+'</div>';

  h+='<div class="grid g21 mb"><div class="card"><h3><span class="lft">'+UI.ic('fornecedor')+' Cadastro</span><button class="vertodos" data-act="editar">Editar</button></h3><div class="kv c3">'+
    [['Razão social',esc(f.razao)],['CNPJ','<span class="mono">'+f.cnpj+'</span>'],['Cidade/UF',esc(f.cidade)+'/'+f.uf],['Contato',esc(f.contato)],['WhatsApp',f.whats],['E-mail',esc(f.email)],['Prazo de entrega',f.prazo+' dia'+(f.prazo>1?'s':'')],['Condição de pagamento',esc(f.cond)],['Contas em aberto',F.moeda(aberto)]].map(function(x){ return '<div><span>'+x[0]+'</span><b>'+x[1]+'</b></div>'; }).join('')+'</div>'+
    '<div style="margin-top:14px" class="fq-tags">'+f.cats.map(function(cc){ return LFI.cat(cc)?'<span class="tag">'+esc(LFI.cat(cc).nome)+'</span>':''; }).join('')+'</div>'+(f.obs?UI.nota(esc(f.obs),'','info').replace('class="nota ','class="nota mt '):'')+'</div>';
  h+='<div class="card"><h3><span class="lft">'+UI.ic('estrela')+' Avaliação</span><small>clique para ajustar</small></h3>'+
    '<div class="lnr"><span class="k">Qualidade</span><span class="v"><span class="fq-st">'+[1,2,3,4,5].map(function(n){ return '<span class="'+(n<=f.qualidade?'on':'')+'" data-act="qual" data-id="'+n+'" title="'+n+' de 5">★</span>'; }).join('')+'</span></span></div>'+
    '<div class="lnr" style="display:block"><div style="display:flex;justify-content:space-between"><span class="k">Pontualidade nas entregas</span><span class="v" id="fq-pv">'+f.pontualidade+'%</span></div><input type="range" min="50" max="100" value="'+f.pontualidade+'" style="width:100%;accent-color:var(--roxo);margin-top:8px" data-inp="pontV" data-chg="pontOk"></div>'+
    '<div class="lnr"><span class="k">Cotações respondidas</span><span class="v">'+D.resp+' de '+D.n+' ('+F.pct(D.taxa,0)+')</span></div>'+
    '<div class="lnr"><span class="k">Tempo médio de resposta</span><span class="v">'+dur(D.tm)+'</span></div>'+
    '<div class="lnr"><span class="k">Taxa de vitória</span><span class="v">'+(D.win==null?'—':F.pct(D.win,0)+' <small style="color:var(--muted)">('+D.venceu+'/'+D.dec+')</small>')+'</span></div>'+
    '<div style="font-size:11.5px;color:var(--muted);font-weight:600;margin-top:8px;line-height:1.45">Qualidade e pontualidade entram na nota ponderada do comparador de cotações.</div></div></div>';

  /* produtos */
  h+='<div class="grid g21 mb"><div class="card pad0"><h3 style="padding:16px 20px 10px;margin:0"><span class="lft">'+UI.ic('estoque')+' Produtos fornecidos <span class="n">'+prods.length+'</span></span><button class="vertodos" data-act="vincular">Vincular produtos</button></h3><div id="fq-prods"></div></div>';
  var comHist=prods.filter(function(p){ return p.forn===f.id; }); if(!comHist.length) comHist=prods.slice();
  comHist=comHist.slice(0,6);
  var hp=s.hp[f.id]&&comHist.some(function(p){ return p.id===s.hp[f.id]; })?s.hp[f.id]:(comHist[0]&&comHist[0].id);
  h+='<div class="card"><h3><span class="lft">'+UI.ic('relatorio')+' Histórico de preços</span></h3>'+(hp?'<div class="pills" style="margin-bottom:10px">'+comHist.map(function(p){ return '<button class="pill'+(p.id===hp?' on':'')+'" data-act="hp" data-id="'+p.id+'">'+esc(curto(p.nome))+'</button>'; }).join('')+'</div><div id="fq-hp"></div><div id="fq-hpl"></div>':UI.vazio('Nenhum produto vinculado','📦'))+'</div></div>';

  h+='<div class="grid g2 mb"><div class="card pad0"><h3 style="padding:16px 20px 10px;margin:0"><span class="lft">'+UI.ic('nota')+' Notas fiscais <span class="n">'+nfs.length+'</span></span></h3><div id="fq-nf"></div></div>'+
    '<div class="card pad0"><h3 style="padding:16px 20px 10px;margin:0"><span class="lft">'+UI.ic('ordem')+' Ordens de compra <span class="n">'+ocs.length+'</span></span></h3><div id="fq-oc"></div></div></div>';
  h+='<div class="grid g2"><div class="card pad0"><h3 style="padding:16px 20px 10px;margin:0"><span class="lft">'+UI.ic('compras')+' Cotações participadas <span class="n">'+cots.length+'</span></span><small>'+F.pct(D.taxa,0)+' respondidas · '+(D.win==null?'—':F.pct(D.win,0))+' vencidas</small></h3><div id="fq-cot"></div></div>'+
    '<div class="card pad0"><h3 style="padding:16px 20px 10px;margin:0"><span class="lft">'+UI.ic('custos')+' Contas a pagar <span class="n">'+cps.length+'</span></span><small>'+F.moeda(aberto)+' em aberto</small></h3><div id="fq-cp"></div></div></div>';
  el.innerHTML=h;

  UI.tabela(el.querySelector('#fq-prods'),{linhas:prods, linhaAct:'_ir', linhaId:function(p){ return 'estoque/'+p.id; }, cls:'cp', vazio:'Nenhum produto vinculado a este fornecedor.', colunas:[
    {t:'Produto', v:function(p){ return '<b>'+esc(p.nome)+'</b><small>'+esc(LFI.cat(p.cat).nome)+'</small>'; }, ord:function(p){ return p.nome; }},
    {t:'Papel', v:function(p){ return p.forn===f.id?UI.badge('Principal','lf'):UI.badge('Alternativo','nu'); }, ord:function(p){ return p.forn===f.id?0:1; }},
    {t:'Último preço', r:true, v:function(p){ var u=ultimoPreco(p.id,f.id); return u?'<b>'+F.moeda(u.v)+'</b><small>'+esc(u.o)+' · '+F.dataC(u.d)+'</small>':'<small>sem compra</small>'; }, ord:function(p){ var u=ultimoPreco(p.id,f.id); return u?u.v:0; }},
    {t:'Custo médio', r:true, v:function(p){ var u=ultimoPreco(p.id,f.id); return F.moeda(p.custoMedio)+'/'+p.un+(u?'<small>'+UI.variacao(u.v,p.custoMedio,true)+'</small>':''); }, ord:function(p){ return p.custoMedio; }},
    {t:'Estoque', r:true, v:function(p){ return F.qtd(LFI.estoqueGeral(p),p.un)+'<small>'+UI.situacao(p)+'</small>'; }, ord:function(p){ return LFI.estoqueGeral(p); }}
  ]});
  if(hp){ var p=LFI.prod(hp), meses=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'], pr=precosDe(hp,f.id);
    var cats=p.hist.map(function(x){ return meses[+x.d.slice(5,7)-1]+'/'+x.d.slice(2,4); }), serieF=p.hist.map(function(){ return null; });
    pr.forEach(function(x){ var k=0; p.hist.forEach(function(hh,i){ if(hh.d<=x.d) k=i; }); if(serieF[k]==null) serieF[k]=x.v; });
    UI.grafLinhas(el.querySelector('#fq-hp'),{cats:cats, zero:false, altura:200, series:[{nome:'Custo médio do grupo', cor:'#1C1C1E', valores:p.hist.map(function(x){ return x.v; })},{nome:'Preço de '+f.nome, cor:'#FF5A00', valores:serieF}]});
    el.querySelector('#fq-hpl').innerHTML=pr.length?'<div style="margin-top:12px">'+pr.slice(0,5).map(function(x){ return '<div class="fq-vp" data-act="_ir" data-id="'+x.tela+'" style="cursor:pointer"><div><b>'+esc(x.o)+'</b><small>'+F.data(x.d)+'</small></div><div style="text-align:right"><b>'+F.moeda(x.v)+'/'+p.un+'</b><small>'+UI.variacao(x.v,p.custoMedio,true)+' vs. custo médio</small></div></div>'; }).join('')+'</div>':UI.nota('Ainda não há compras ou propostas deste fornecedor para '+esc(curto(p.nome))+'.','in');
  }
  UI.tabela(el.querySelector('#fq-nf'),{linhas:nfs, linhaAct:'_ir', linhaId:function(n){ return 'notas/'+n.id; }, cls:'cp', vazio:'Nenhuma nota fiscal.', colunas:[
    {t:'Número', v:function(n){ return '<b>NF '+esc(n.numero)+'</b><small>'+UI.empTag(n.empresa)+'</small>'; }, ord:function(n){ return n.numero; }},
    {t:'Emissão', v:function(n){ return F.data(n.emissao); }, ord:function(n){ return n.emissao; }, nw:true},
    {t:'Valor', r:true, v:function(n){ return '<b>'+F.moeda(n.valor)+'</b>'; }, ord:function(n){ return n.valor; }},
    {t:'Status', v:function(n){ return UI.status('nf',n.status); }, ord:function(n){ return n.status; }}]});
  UI.tabela(el.querySelector('#fq-oc'),{linhas:ocs, linhaAct:'_ir', linhaId:function(o){ return 'ordens/'+o.id; }, cls:'cp', vazio:'Nenhuma ordem de compra.', colunas:[
    {t:'Número', v:function(o){ return '<b>'+esc(o.num)+'</b><small>'+(o.grupo?'Compra '+esc(o.grupo):F.data(o.emissao))+'</small>'; }, ord:function(o){ return o.num; }},
    {t:'Previsão', v:function(o){ return F.data(o.previsao); }, ord:function(o){ return o.previsao; }, nw:true},
    {t:'Valor', r:true, v:function(o){ return '<b>'+F.moeda(LFI.totalOrdem(o))+'</b>'; }, ord:function(o){ return LFI.totalOrdem(o); }},
    {t:'Status', v:function(o){ return UI.status('oc',o.status); }, ord:function(o){ return o.status; }}]});
  UI.tabela(el.querySelector('#fq-cot'),{linhas:cots, linhaAct:'_ir', linhaId:function(x){ return 'compras/'+x.id; }, cls:'cp', vazio:'Não participou de cotações.', colunas:[
    {t:'Cotação', v:function(x){ return '<b>'+esc(x.num)+'</b><small>'+F.data(x.data)+'</small>'; }, ord:function(x){ return x.data; }},
    {t:'Resposta', v:function(x){ var p=null; x.propostas.forEach(function(z){ if(z.forn===f.id) p=z; }); if(!p) return '<small>'+(enviadaEm(x)?'sem resposta':'não enviada')+'</small>'; var e=enviadaEm(x); return '<b>'+(p.canal==='whatsapp'?'WhatsApp':p.canal==='pdf'?'PDF':'Excel')+'</b><small>em '+(e?dur(Math.round((new Date(p.recebida)-new Date(e))/6e4)):'—')+'</small>'; }, ord:false},
    {t:'Itens vencidos', r:true, v:function(x){ var tot=x.itens.filter(function(i){ return (x.itemForn&&x.itemForn[i.prod]?x.itemForn[i.prod].indexOf(f.id)>=0:true); }).length, v=Object.keys(x.escolhas||{}).filter(function(k){ return x.escolhas[k]===f.id; }).length; return Object.keys(x.escolhas||{}).length?'<b>'+v+'</b> de '+x.itens.length:'<small>em decisão</small>'; }, ord:false},
    {t:'Status', v:function(x){ return UI.status('cot',x.status); }, ord:function(x){ return x.status; }}]});
  UI.tabela(el.querySelector('#fq-cp'),{linhas:cps, cls:'cp', vazio:'Nenhum título.', linhaAct:'cpAbre', linhaId:function(x){ return x.nf||''; }, colunas:[
    {t:'Descrição', v:function(x){ return '<b>'+esc(x.descricao)+'</b><small>'+UI.empTag(x.empresa)+'</small>'; }, ord:function(x){ return x.descricao; }},
    {t:'Vencimento', v:function(x){ return F.data(x.venc)+'<small>'+F.relativo(x.venc)+'</small>'; }, ord:function(x){ return x.venc; }, nw:true},
    {t:'Valor', r:true, v:function(x){ return '<b>'+F.moeda(x.valor)+'</b>'; }, ord:function(x){ return x.valor; }},
    {t:'Status', v:function(x){ return UI.status('cp',x.status==='aberto'&&x.venc<LFI.hoje()?'vencido':x.status); }, ord:function(x){ return x.status; }}]});

  UI.liga(el, UI.navHandlers({
    per:function(id){ s.per=id; LFI.recarregar(); },
    editar:function(){ editar(f); },
    vincular:function(){ vincular(f); },
    cotar:function(){ var st2=LFI.estado.compras=LFI.estado.compras||{}; st2.nova=null; LFI.ir('compras','nova'); UI.toast('Nova solicitação','Os produtos de '+f.nome+' serão vinculados automaticamente','in'); },
    hp:function(id){ s.hp[f.id]=id; LFI.recarregar(); },
    qual:function(n){ f.qualidade=+n; LFI.salvar(); LFI.recarregar(); UI.toast('Avaliação de qualidade atualizada',f.nome+' · '+n+' de 5'); },
    pontV:function(_,ev){ var b=el.querySelector('#fq-pv'); if(b) b.textContent=ev.target.value+'%'; },
    pontOk:function(_,ev){ f.pontualidade=+ev.target.value; LFI.salvar(); LFI.recarregar(); UI.toast('Pontualidade atualizada',f.nome+' · '+f.pontualidade+'%'); },
    cpAbre:function(id){ if(id) LFI.ir('notas',id); else UI.toast('Boleto avulso','Título sem nota fiscal vinculada','in'); }
  }));
}

/* =================== CADASTRO =================== */
function editar(f){
  var novo=!f, x=f||{id:LFI.novoId('f'), nome:'', razao:'', cnpj:'', cidade:'Campinas', uf:'SP', contato:'', whats:'', email:'', prazo:2, cond:'28 dias', qualidade:4, pontualidade:90, cats:[], obs:''};
  var cats=LFI.db.categorias.filter(function(c){ return c.id!=='aca'&&c.id!=='sob'; });
  var corpo='<div class="fgrid"><div class="field"><label>Nome fantasia *</label><input class="inp" id="fe-n" value="'+esc(x.nome)+'"></div><div class="field"><label>Razão social</label><input class="inp" id="fe-r" value="'+esc(x.razao)+'"></div>'+
    '<div class="field"><label>CNPJ *</label><input class="inp mono" id="fe-c" value="'+esc(x.cnpj)+'" placeholder="00.000.000/0000-00"></div><div class="fgrid" style="grid-template-columns:minmax(0,1fr) 80px"><div class="field"><label>Cidade</label><input class="inp" id="fe-ci" value="'+esc(x.cidade)+'"></div><div class="field"><label>UF</label><input class="inp" id="fe-uf" maxlength="2" value="'+esc(x.uf)+'"></div></div>'+
    '<div class="field"><label>Contato</label><input class="inp" id="fe-ct" value="'+esc(x.contato)+'"></div><div class="field"><label>WhatsApp</label><input class="inp" id="fe-w" value="'+esc(x.whats)+'" placeholder="(19) 99999-0000"><div class="hint">Usado no envio automático de cotações e ordens de compra.</div></div>'+
    '<div class="field"><label>E-mail</label><input class="inp" id="fe-e" value="'+esc(x.email)+'"></div><div class="fgrid" style="grid-template-columns:110px minmax(0,1fr)"><div class="field"><label>Prazo (dias)</label><input class="inp num" id="fe-p" value="'+x.prazo+'"></div><div class="field"><label>Condição de pagamento</label><input class="inp" id="fe-cd" value="'+esc(x.cond)+'"></div></div>'+
    '<div class="field"><label>Qualidade (1 a 5)</label><select class="inp" id="fe-q">'+[5,4,3,2,1].map(function(n){ return '<option value="'+n+'"'+(n===x.qualidade?' selected':'')+'>'+'★★★★★'.slice(0,n)+' — '+n+'</option>'; }).join('')+'</select></div><div class="field"><label>Pontualidade (%)</label><input class="inp num" id="fe-pt" value="'+x.pontualidade+'"></div>'+
    '<div class="field full"><label>Categorias atendidas</label><div class="fq-cats">'+cats.map(function(c){ return '<label class="chk"><input type="checkbox" data-cat="'+c.id+'"'+(x.cats.indexOf(c.id)>=0?' checked':'')+'> '+esc(c.nome)+'</label>'; }).join('')+'</div></div>'+
    '<div class="field full"><label>Observações</label><textarea class="inp" id="fe-o" style="min-height:64px">'+esc(x.obs)+'</textarea></div></div>';
  var m=UI.modal({titulo:novo?'Novo fornecedor':'Editar fornecedor', sub:novo?'Cadastro para cotações, ordens e notas fiscais':esc(x.nome), tam:'lg', corpo:corpo,
    botoes:'<button class="btn sec" data-act="_fechar">Cancelar</button><button class="btn pri" data-act="ok">Salvar</button>', acoes:{ok:function(){
      var v=function(id){ return m.el.querySelector(id).value.trim(); };
      if(!v('#fe-n')){ UI.toast('Informe o nome do fornecedor','','wt'); return; }
      if(!/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(v('#fe-c'))){ UI.toast('CNPJ no formato 00.000.000/0000-00','','wt'); return; }
      if(LFI.db.fornecedores.some(function(o){ return o.cnpj===v('#fe-c')&&o.id!==x.id; })){ UI.toast('Já existe um fornecedor com este CNPJ','','wt'); return; }
      x.nome=v('#fe-n'); x.razao=v('#fe-r')||x.nome; x.cnpj=v('#fe-c'); x.cidade=v('#fe-ci'); x.uf=v('#fe-uf').toUpperCase(); x.contato=v('#fe-ct'); x.whats=v('#fe-w'); x.email=v('#fe-e');
      x.prazo=Math.max(0,Math.round(UI.num(v('#fe-p')))); x.cond=v('#fe-cd')||'28 dias'; x.qualidade=+v('#fe-q'); x.pontualidade=Math.max(0,Math.min(100,Math.round(UI.num(v('#fe-pt'))))); x.obs=v('#fe-o');
      x.cats=UI.els('[data-cat]',m.el).filter(function(c){ return c.checked; }).map(function(c){ return c.getAttribute('data-cat'); });
      if(novo) LFI.db.fornecedores.push(x);
      LFI.atividade('fornecedor',(novo?'Fornecedor cadastrado: ':'Cadastro atualizado: ')+x.nome,{tela:'fornecedores',id:x.id});
      LFI.salvar(); m.fechar(); UI.toast(novo?'Fornecedor cadastrado':'Cadastro atualizado',x.nome);
      if(novo) LFI.ir('fornecedores',x.id); else LFI.recarregar();
    }}});
}
function vincular(f){
  var todas=false, busca='';
  var papel={}; LFI.db.produtos.forEach(function(p){ if(!LFI.compravel(p)) return; papel[p.id]=p.forn===f.id?'p':(p.fornAlt||[]).indexOf(f.id)>=0?'a':''; });
  function corpo(){
    var q=norm(busca), h='<div class="barra"><div class="search">'+UI.ic('busca')+'<input id="fv-b" placeholder="Buscar produto" value="'+esc(busca)+'" data-inp="b"></div><label class="chk"><input type="checkbox" data-chg="todas"'+(todas?' checked':'')+'> Mostrar todas as categorias</label></div><div id="fv-l">';
    LFI.db.categorias.forEach(function(c){ if(!todas&&f.cats.indexOf(c.id)<0) return; var ps=LFI.db.produtos.filter(function(p){ return LFI.compravel(p)&&p.cat===c.id&&(!q||norm(p.nome).indexOf(q)>=0); }); if(!ps.length) return;
      h+='<div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin:12px 0 4px">'+esc(c.nome)+'</div>'+ps.map(function(p){ var pr=p.forn&&p.forn!==f.id?LFI.forn(p.forn):null; return '<div class="fq-vp"><div><b>'+esc(p.nome)+'</b><small>'+(pr?'Principal hoje: '+esc(pr.nome):p.forn===f.id?'Principal: este fornecedor':'Sem fornecedor principal')+'</small></div><select class="inp sm" data-chg="pp" data-id="'+p.id+'"><option value=""'+(papel[p.id]===''?' selected':'')+'>Não fornece</option><option value="p"'+(papel[p.id]==='p'?' selected':'')+'>Principal</option><option value="a"'+(papel[p.id]==='a'?' selected':'')+'>Alternativo</option></select></div>'; }).join(''); });
    return h+'</div>';
  }
  var m=UI.modal({titulo:'Produtos de '+esc(f.nome), sub:'Defina o papel do fornecedor em cada produto. As cotações usam este vínculo para acionar fornecedores.', tam:'lg', corpo:corpo(),
    botoes:'<button class="btn sec" data-act="_fechar">Cancelar</button><button class="btn pri" data-act="ok">Salvar vínculos</button>', acoes:{
      b:function(_,ev){ busca=ev.target.value; var pos=ev.target.selectionStart; m.corpoHTML(corpo()); var i=m.el.querySelector('#fv-b'); i.focus(); i.setSelectionRange(pos,pos); },
      todas:function(_,ev){ todas=ev.target.checked; m.corpoHTML(corpo()); },
      pp:function(id,ev){ papel[id]=ev.target.value; },
      ok:function(){
        var n=0;
        LFI.db.produtos.forEach(function(p){ if(!LFI.compravel(p)) return; var atual=p.forn===f.id?'p':(p.fornAlt||[]).indexOf(f.id)>=0?'a':'', novo=papel[p.id]; if(atual===novo) return; n++;
          p.fornAlt=(p.fornAlt||[]).filter(function(x){ return x!==f.id; });
          if(atual==='p'){ p.forn=p.fornAlt.length?p.fornAlt.shift():null; }
          if(novo==='p'){ if(p.forn&&p.forn!==f.id&&p.fornAlt.indexOf(p.forn)<0) p.fornAlt.unshift(p.forn); p.forn=f.id; }
          if(novo==='a'){ if(p.fornAlt.indexOf(f.id)<0) p.fornAlt.push(f.id); }
        });
        LFI.salvar(); m.fechar(); LFI.recarregar(); UI.toast(n?plural(n,'vínculo atualizado','vínculos atualizados'):'Nenhuma alteração',f.nome);
      }}});
}

LFI.registrar('fornecedores',{titulo:'Fornecedores', render:render});
})();
