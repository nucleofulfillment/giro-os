/* LiveFood Intelligence — RECEITAS E FICHAS TÉCNICAS
   Catálogo, ficha técnica com custo vivo (custo médio do estoque), precificação, histórico de custos,
   edição com recálculo em tempo real, importação de planilha (simulada) e comparativo entre receitas. */
(function(){
'use strict';
var LFI=window.LFI, UI=LFI.ui, F=LFI.fmt, esc=UI.esc;
var r2=LFI.dataUtil.r2, D=LFI.dataUtil.D;
var META_MC=0.55; /* meta de margem de contribuição do grupo */
var COR_DEP={pad:'#F6E3C5', res:'#E3ECF9', sus:'#FBE0E9'};
var FOTOS=['🥖','🥐','🍞','🧀','🍰','🧁','🥧','🍪','🍗','🍛','🍝','🍽️','🥘','🥩','🍲','🥗','🍣','🍥','🍤','🐟','🍙','🍚','🥒','🍄','🍳','🍜'];
var UNS=['g','kg','ml','L','un'];

function st(){ return LFI.estado.receitas = LFI.estado.receitas || {aba:'catalogo', op:'todas', cat:'', q:'', vista:'grade', abaixo:false, cmp:30}; }

function css(){
  if(document.getElementById('css-receitas')) return;
  var s=document.createElement('style'); s.id='css-receitas';
  s.textContent=
  '.rc-bd .cat{font-size:11.5px;font-weight:700;color:var(--muted);margin-top:-6px}'+
  '.rc-bd .pr{display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid var(--border);padding-top:9px;margin-top:auto}'+
  '.rc-bd .pr span{font-size:10.5px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;display:block}'+
  '.rc-bd .pr b{font-size:16px;font-variant-numeric:tabular-nums}'+
  '.rc-ft .var{position:absolute;left:10px;bottom:10px}'+
  '.rc-hero{display:grid;grid-template-columns:170px minmax(0,1fr);gap:18px;align-items:start}'+
  '.rc-hero .foto{height:170px;font-size:78px}'+
  '.rc-live{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800;color:var(--green)}'+
  '.rc-live i{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px rgba(22,163,74,.18);animation:rcpulse 2s infinite}'+
  '@keyframes rcpulse{50%{box-shadow:0 0 0 6px rgba(22,163,74,.05)}}'+
  '.rc-ing a.lk{font-weight:800;cursor:pointer;text-decoration:none;color:var(--text)}.rc-ing a.lk:hover{color:var(--roxo)}'+
  '.rc-ing td:first-child,#rc-cmp td:first-child{min-width:190px}.rc-ing td small{white-space:nowrap}'+
  '.rc-part{display:flex;align-items:center;gap:8px;justify-content:flex-end}.rc-part .bar{width:70px;min-width:70px}'+
  '.rc-prc .big{font-size:28px;font-weight:800;letter-spacing:-.4px;font-variant-numeric:tabular-nums}'+
  '.rc-sim{display:flex;gap:8px;align-items:center;margin-top:10px}'+
  '.rc-sim .inp{max-width:140px}'+
  '.rc-modo{font-size:13.5px;line-height:1.65;color:var(--texto2);font-weight:600;white-space:pre-wrap}'+
  '.rc-ed{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:18px;align-items:start}'+
  '.rc-ed .res{position:sticky;top:0;background:var(--s2);border:1px solid var(--border);border-radius:14px;padding:14px 16px}'+
  '.rc-row{display:grid;grid-template-columns:minmax(0,1fr) 92px 74px 96px 34px;gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)}'+
  '.rc-row .cv{font-size:11px;color:var(--muted);font-weight:700;text-align:right;line-height:1.25}'+
  '.rc-row .cv b{display:block;color:var(--text);font-size:12.5px}'+
  '.rc-row .x{border:0;background:var(--s3);border-radius:8px;height:32px;cursor:pointer;color:var(--muted2);font-weight:800}'+
  '.rc-row .x:hover{background:var(--r-soft);color:var(--red)}'+
  '.rc-emo{display:flex;flex-wrap:wrap;gap:4px}'+
  '.rc-emo button{width:34px;height:34px;border-radius:9px;border:1px solid var(--border);background:#fff;font-size:18px;cursor:pointer;padding:0}'+
  '.rc-emo button.on{border-color:var(--roxo);box-shadow:0 0 0 2px rgba(255,90,0,.2);background:var(--lf-soft)}'+
  '.rc-imp-hd td{background:var(--s3)!important;font-weight:800}'+
  '.rc-alta{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}'+
  '.rc-alta button{display:flex;gap:10px;align-items:center;text-align:left;border:1px solid var(--border);background:var(--s2);border-radius:12px;padding:9px 11px;cursor:pointer;font:inherit;color:inherit}'+
  '.rc-alta button:hover{border-color:var(--border2);background:#fff}'+
  '.rc-alta .em{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex:none}'+
  '.rc-alta b{display:block;font-size:12.5px;font-weight:800}.rc-alta small{font-size:11px;color:var(--muted);font-weight:700}'+
  '@media (max-width:1100px){.rc-ed{grid-template-columns:minmax(0,1fr)}.rc-ed .res{position:static}}'+
  '@media (max-width:700px){.rc-hero{grid-template-columns:minmax(0,1fr)}.rc-row{grid-template-columns:minmax(0,1fr) 70px 64px 34px}.rc-row .cv{display:none}}';
  document.head.appendChild(s);
}

/* ---------- cálculos ---------- */
function prec(r){ return (r.buffet&&!r.preco) ? LFI.precificar(r,{preco:LFI.db.buffetPrecoKg}) : LFI.precificar(r); }
function porKgVenda(r){ return r.buffet&&!r.preco; }
function unVenda(r){ return porKgVenda(r)?'kg (buffet)':(r.vendaUn||'porção'); }
function visiveis(){ var deps=LFI.depIds(); return LFI.db.receitas.filter(function(r){ return deps.indexOf(r.dep)>=0; }); }
function corMc(p){ return p.mcPct>=META_MC?'ok':p.mcPct>=META_MC-0.08?'wt':'no'; }
function varPorcao(r, dias){ var a=LFI.custoReceita(r, D(-dias)).porcao, b=LFI.custoReceita(r).porcao; return {antes:a, agora:b, v:a?b/a-1:0}; }
function ingValidos(r){ return r.ing.filter(function(g){ return g.prod&&LFI.prod(g.prod)&&g.qtd>0; }); }
function custoSeguro(r){ var c={ing:ingValidos(r), perda:r.perda, rend:r.rend||1, pesoFinal:r.pesoFinal}; if(!c.ing.length) return {itens:[], bruto:0, perdaV:0, total:0, porcao:0, porKg:null}; return LFI.custoReceita(c); }
function rotDep(id){ var d=LFI.dep(id); return d?d.curto:id; }

/* notas fiscais pendentes que mexem no custo desta receita (prévia do impacto) */
function previaNF(r){
  var out=[];
  LFI.db.notas.forEach(function(n){ if(n.status==='lancada'||n.status==='cancelada'||!LFI.empresaVisivel(n.empresa)) return;
    n.itens.forEach(function(it){
      var pid=it.prod; if(!pid){ var s=LFI.sugerirProduto(it.desc,1); if(s[0]&&s[0].score>=60) pid=s[0].prod.id; }
      if(!pid||!r.ing.some(function(g){ return g.prod===pid; })) return;
      var p=LFI.prod(pid), q=it.qtd*it.fator, cu=(it.vProd+(it.ipi.v||0)+(it.st.v||0))/q, base=Math.max(0,LFI.estoqueGeral(p));
      out.push({nota:n, prod:p, cu:r2(cu), novo:r2((base*p.custoMedio+q*cu)/(base+q))});
    }); });
  if(!out.length) return null;
  var mapa={}; out.forEach(function(o){ mapa[o.prod.id]=o.novo; });
  var bruto=0; r.ing.forEach(function(g){ var p=LFI.prod(g.prod); bruto+=LFI.converte(g.qtd,g.un,p.un)*(mapa[g.prod]!=null?mapa[g.prod]:p.custoMedio); });
  var depois=r2(bruto*(1+(r.perda||0)/100)/(r.rend||1));
  return {itens:out, antes:LFI.custoReceita(r).porcao, depois:depois};
}
/* últimas notas que atualizaram ingredientes (histórico de custo com origem NF) */
function atualizacoesNF(r){
  var out=[];
  r.ing.forEach(function(g){ var p=LFI.prod(g.prod); for(var i=p.hist.length-1;i>0;i--){ var h=p.hist[i]; if(/^NF/.test(h.origem||'')&&h.d>=D(-30)){ out.push({prod:p, d:h.d, origem:h.origem, de:p.hist[i-1].v, para:h.v}); break; } } });
  out.sort(function(a,b){ return a.d<b.d?1:-1; });
  return out;
}

/* ================= CATÁLOGO ================= */
function render(el, arg){
  css();
  /* a receita agora fica dentro do produto (tela Produtos) */
  if(arg){ var r=LFI.rec(arg); if(r&&r.acabado&&LFI.prod(r.acabado)){ setTimeout(function(){ LFI.ir('produtos', r.acabado); },0); return; } if(r) return detalhe(el, r); }
  else { setTimeout(function(){ LFI.ir('produtos'); },0); return; }
  var s=st(), todas=visiveis(), emp=LFI.empresaAtual();
  var cats={}; todas.forEach(function(r){ if(s.op==='todas'||r.dep===s.op) cats[r.cat]=(cats[r.cat]||0)+1; });
  if(s.cat&&!cats[s.cat]) s.cat='';
  var q=(s.q||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  var lista=todas.filter(function(r){
    if(s.op!=='todas'&&r.dep!==s.op) return false;
    if(s.cat&&r.cat!==s.cat) return false;
    if(q&&r.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').indexOf(q)<0&&r.cat.toLowerCase().indexOf(q)<0) return false;
    if(s.abaixo&&prec(r).mcPct>=META_MC) return false;
    return true; });
  var precs=todas.map(prec), custos=todas.filter(function(r){ return !porKgVenda(r); }).map(function(r){ return LFI.custoReceita(r).porcao; });
  var mcMed=precs.length?precs.reduce(function(a,p){ return a+p.mcPct; },0)/precs.length:0;
  var abaixo=todas.filter(function(r){ return prec(r).mcPct<META_MC; }).length;
  var altas=todas.map(function(r){ return {r:r, v:varPorcao(r,30)}; }).filter(function(x){ return x.v.v>0.004; }).sort(function(a,b){ return b.v.v-a.v.v; }).slice(0,4);

  var h=UI.cabecalho({titulo:'Receitas e Fichas Técnicas', sub:(emp?esc(emp.fantasia)+' · ':'')+'Custos atualizados automaticamente pelo custo médio do estoque',
    acoes:'<button class="btn sec sm" data-act="importar">'+UI.ic('upload')+'Importar planilha</button><button class="btn pri sm" data-act="nova">'+UI.ic('mais')+'Nova receita</button>'});
  h+='<div class="tabs"><button class="'+(s.aba==='catalogo'?'on':'')+'" data-act="aba" data-id="catalogo">Catálogo <span class="n">'+todas.length+'</span></button><button class="'+(s.aba==='comparativo'?'on':'')+'" data-act="aba" data-id="comparativo">Comparativo de rentabilidade</button></div>';
  h+='<div class="kpis">'+
    UI.kpi({lb:'Receitas cadastradas', vl:String(todas.length), dl:Object.keys(groupBy(todas,'dep')).length+' operações · '+Object.keys(groupBy(todas,'cat')).length+' categorias'})+
    UI.kpi({lb:'Custo médio de porção', vl:F.moeda(custos.length?custos.reduce(function(a,b){ return a+b; },0)/custos.length:0), dl:'itens vendidos por unidade/porção'})+
    UI.kpi({lb:'Margem de contribuição média', vl:F.pct(mcMed), dl:'meta do grupo: '+F.pct(META_MC,0), hl:true})+
    UI.kpi({lb:'<span style="color:var(--red)">●</span> Abaixo da meta', vl:abaixo+' <small>receitas</small>', dl:s.abaixo?'filtro ativo · clique para limpar':'clique para filtrar', act:'kAbaixo'})+
  '</div>';
  if(s.aba==='comparativo'){ el.innerHTML=h+comparativoHTML(); ligaCatalogo(el); comparativo(el, todas); return; }

  if(altas.length) h+='<div class="card mb" style="padding:14px 18px"><h3 style="margin-bottom:10px"><span class="lft">'+UI.ic('alerta')+' Maiores altas de custo em 30 dias <small>recalculadas pelas últimas entradas de nota fiscal</small></span></h3><div class="rc-alta">'+
    altas.map(function(x){ return '<button data-act="abrir" data-id="'+x.r.id+'"><span class="em" style="background:'+(x.r.cor||'#eee')+'">'+x.r.foto+'</span><span style="min-width:0;flex:1"><b>'+esc(x.r.nome)+'</b><small>'+F.moeda(x.v.antes)+' → '+F.moeda(x.v.agora)+'</small></span>'+UI.variacao(x.v.agora,x.v.antes,true)+'</button>'; }).join('')+'</div></div>';

  var ops=['todas'].concat(LFI.depIds().filter(function(d){ return d!=='cen'; }));
  h+='<div class="barra"><div class="pills">'+ops.map(function(d){ var dd=LFI.dep(d), n=d==='todas'?todas.length:todas.filter(function(r){ return r.dep===d; }).length; return '<button class="pill'+(s.op===d?' on':'')+'" data-act="op" data-id="'+d+'">'+(dd?'<i style="background:'+dd.cor+'"></i>'+esc(dd.curto):'Todas as operações')+' <span class="c">'+n+'</span></button>'; }).join('')+'</div>'+
    '<select class="inp sm" style="width:auto;min-width:170px" data-chg="cat"><option value="">Todas as categorias</option>'+Object.keys(cats).sort().map(function(c){ return '<option'+(c===s.cat?' selected':'')+' value="'+esc(c)+'">'+esc(c)+' ('+cats[c]+')</option>'; }).join('')+'</select>'+
    '<span class="sp"></span><label class="search">'+UI.ic('busca')+'<input id="rc-q" placeholder="Buscar receita ou categoria" value="'+esc(s.q)+'" data-inp="q"></label>'+
    '<div class="seg"><button class="'+(s.vista==='grade'?'on':'')+'" data-act="vista" data-id="grade">Cartões</button><button class="'+(s.vista==='tabela'?'on':'')+'" data-act="vista" data-id="tabela">Tabela</button></div></div>';
  h+='<div id="rc-lista"></div>';
  el.innerHTML=h;
  desenhaLista(el.querySelector('#rc-lista'), lista);
  ligaCatalogo(el);
}
function groupBy(l,k){ var o={}; l.forEach(function(x){ o[x[k]]=1; }); return o; }

function desenhaLista(box, lista){
  var s=st();
  if(!lista.length){ box.innerHTML='<div class="card">'+UI.vazio('Nenhuma receita encontrada com os filtros atuais.','🔎')+'</div>'; return; }
  if(s.vista==='tabela'){
    box.innerHTML='<div class="card pad0"><div id="rc-tb"></div></div>';
    UI.tabela(box.querySelector('#rc-tb'),{linhas:lista, linhaAct:'abrir', colunas:[
      {t:'Receita', v:function(r){ return '<div style="display:flex;gap:10px;align-items:center"><span class="av" style="background:'+(r.cor||'#eee')+';font-size:18px">'+r.foto+'</span><span><b>'+esc(r.nome)+'</b><small>'+esc(r.cat)+'</small></span></div>'; }, ord:function(r){ return r.nome; }},
      {t:'Operação', v:function(r){ return UI.dep(r.dep); }, ord:function(r){ return r.dep; }},
      {t:'Rendimento', v:function(r){ return F.num(r.rend)+' '+esc(r.rendUn)+'<small>'+(r.pesoFinal?F.num(r.pesoFinal/1000,2)+' kg':'')+'</small>'; }, ord:function(r){ return r.rend; }},
      {t:'Custo/porção', r:true, v:function(r){ return '<b>'+F.moeda(LFI.custoReceita(r).porcao)+'</b>'; }, ord:function(r){ return LFI.custoReceita(r).porcao; }},
      {t:'Custo/kg', r:true, v:function(r){ var c=LFI.custoReceita(r); return c.porKg?F.moeda(c.porKg):'—'; }, ord:function(r){ return LFI.custoReceita(r).porKg||0; }},
      {t:'Preço', r:true, v:function(r){ return F.moeda(prec(r).preco)+'<small>'+esc(unVenda(r))+'</small>'; }, ord:function(r){ return prec(r).preco; }},
      {t:'CMV', r:true, v:function(r){ return F.pct(prec(r).cmvPct); }, ord:function(r){ return prec(r).cmvPct; }},
      {t:'Margem', r:true, v:function(r){ var p=prec(r); return UI.badge(F.pct(p.mcPct),corMc(p)); }, ord:function(r){ return prec(r).mcPct; }},
      {t:'30 dias', r:true, v:function(r){ var v=varPorcao(r,30); return UI.variacao(v.agora,v.antes,true); }, ord:function(r){ return varPorcao(r,30).v; }}
    ]});
    return;
  }
  box.innerHTML='<div class="rc-grid">'+lista.map(cartao).join('')+'</div>';
}
function cartao(r){
  var c=LFI.custoReceita(r), p=prec(r), v=varPorcao(r,30);
  return '<div class="rc" data-act="abrir" data-id="'+r.id+'"><div class="rc-ft" style="background:'+(r.cor||'#F3F3F5')+'">'+UI.dep(r.dep)+'<span class="mg">'+UI.badge('MC '+F.pct(p.mcPct,0),corMc(p))+'</span>'+r.foto+(Math.abs(v.v)>0.004?UI.variacao(v.agora,v.antes,true):'')+'</div>'+
    '<div class="rc-bd"><b>'+esc(r.nome)+'</b><div class="cat">'+esc(r.cat)+' · rende '+F.num(r.rend)+' '+esc(r.rendUn)+'</div>'+
    '<div class="ln"><span>Custo '+(porKgVenda(r)?'por kg':'por porção')+'</span><span>'+F.moeda(porKgVenda(r)?c.porKg:c.porcao)+'</span></div>'+
    '<div class="ln"><span>CMV</span><span>'+F.pct(p.cmvPct)+'</span></div>'+
    '<div class="pr"><div><span>Preço de venda</span><b>'+F.moeda(p.preco)+'</b></div><div style="text-align:right"><span>Margem</span><b style="color:var('+(p.mcPct>=META_MC?'--green':'--red')+')">'+F.moeda(p.mc)+'</b></div></div></div></div>';
}
function ligaCatalogo(el){
  var s=st();
  UI.liga(el, UI.navHandlers({
    aba:function(id){ s.aba=id; LFI.recarregar(); },
    op:function(id){ s.op=id; s.cat=''; LFI.recarregar(); },
    cat:function(_,ev){ s.cat=ev.target.value; LFI.recarregar(); },
    vista:function(id){ s.vista=id; LFI.recarregar(); },
    q:function(_,ev){ s.q=ev.target.value; var pos=ev.target.selectionStart; LFI.recarregar(); var i=document.getElementById('rc-q'); if(i){ i.focus(); try{ i.setSelectionRange(pos,pos); }catch(e){} } },
    kAbaixo:function(){ s.abaixo=!s.abaixo; s.aba='catalogo'; LFI.recarregar(); },
    abrir:function(id){ LFI.ir('receitas', id); },
    nova:function(){ editar(null); },
    importar:function(){ importar(); },
    ordCmp:function(){}
  }));
}

/* ================= COMPARATIVO ================= */
function comparativoHTML(){
  return '<div class="grid g21 mb"><div class="card"><h3>Custo × preço por receita <small>passe o mouse para detalhes</small></h3><div id="cmp-g"></div></div>'+
    '<div class="card"><h3>Margem de contribuição <small>% sobre o preço · meta '+F.pct(META_MC,0)+'</small></h3><div id="cmp-mc"></div></div></div>'+
    '<div class="card pad0"><h3>Comparativo de rentabilidade <small>clique no título da coluna para ordenar</small></h3><div id="cmp-t" style="padding:0 8px 8px"></div></div>';
}
function comparativo(el, todas){
  var ls=todas.filter(function(r){ return !porKgVenda(r); });
  var dados=todas.map(function(r){ var p=prec(r), c=LFI.custoReceita(r); return {r:r, p:p, c:c, mk:LFI.markupDe(r), lote:r2(p.mc*(porKgVenda(r)?(r.pesoFinal/1000||1):r.rend))}; });
  UI.grafBarras(el.querySelector('#cmp-g'),{cats:ls.map(function(r){ return r.foto+' '+(r.nome.length>14?r.nome.slice(0,13)+'…':r.nome); }), titulosTip:ls.map(function(r){ return r.nome; }), rotacao:true, altura:270,
    series:[{nome:'Custo da porção', cor:'#1C1C1E', valores:ls.map(function(r){ return LFI.custoReceita(r).porcao; })},{nome:'Preço de venda', cor:'#FF5A00', valores:ls.map(function(r){ return prec(r).preco; })}],
    onClick:function(i){ LFI.ir('receitas', ls[i].id); }});
  var mc=dados.slice().sort(function(a,b){ return b.p.mcPct-a.p.mcPct; }).slice(0,12).map(function(d){ return {nome:d.r.nome, valor:d.p.mcPct*100, cor:d.p.mcPct>=META_MC?'var(--green)':d.p.mcPct>=META_MC-0.08?'#E9A80B':'var(--red)', id:d.r.id, sub:UI.esc(rotDep(d.r.dep))}; });
  el.querySelector('#cmp-mc').innerHTML=UI.barrasH(mc,{fmt:function(v){ return F.pctN(v,1); }, act:'abrir'});
  UI.tabela(el.querySelector('#cmp-t'),{linhas:dados, linhaAct:'abrir', linhaId:function(d){ return d.r.id; }, ordem:6, dir:-1, classeLinha:function(d){ return d.p.mcPct<META_MC?'aviso':''; },
    colunas:[
      {t:'Receita', v:function(d){ return '<b>'+d.r.foto+' '+esc(d.r.nome)+'</b><small>'+esc(d.r.cat)+'</small>'; }, ord:function(d){ return d.r.nome; }},
      {t:'Operação', v:function(d){ return UI.dep(d.r.dep); }, ord:function(d){ return d.r.dep; }},
      {t:'Custo', r:true, v:function(d){ return F.moeda(d.p.custo)+'<small>por '+esc(porKgVenda(d.r)?'kg':d.r.vendaUn)+'</small>'; }, ord:function(d){ return d.p.custo; }},
      {t:'Preço', r:true, v:function(d){ return '<b>'+F.moeda(d.p.preco)+'</b><small>sugerido '+F.moeda(d.p.sugerido)+'</small>'; }, ord:function(d){ return d.p.preco; }},
      {t:'CMV', r:true, v:function(d){ return F.pct(d.p.cmvPct); }, ord:function(d){ return d.p.cmvPct; }},
      {t:'Margem R$', r:true, v:function(d){ return F.moeda(d.p.mc); }, ord:function(d){ return d.p.mc; }},
      {t:'Margem %', r:true, v:function(d){ return UI.badge(F.pct(d.p.mcPct),corMc(d.p)); }, ord:function(d){ return d.p.mcPct; }},
      {t:'Markup real / alvo', r:true, v:function(d){ var ok=d.p.markupReal>=d.mk-0.005; return '<b style="color:var('+(ok?'--text':'--red')+')">'+F.num(d.p.markupReal,2)+'×</b><small>alvo '+F.num(d.mk,2)+'×</small>'; }, ord:function(d){ return d.p.markupReal-d.mk; }},
      {t:'Rentabilidade por lote', r:true, v:function(d){ return F.moeda(d.lote)+'<small>rende '+F.num(d.r.rend)+' '+esc(d.r.rendUn)+'</small>'; }, ord:function(d){ return d.lote; }}
    ]});
}

/* ================= FICHA TÉCNICA ================= */
function detalhe(el, r){
  var s=st();
  var c=LFI.custoReceita(r), p=prec(r), mk=LFI.markupDe(r), emp=LFI.empresaDoDep(r.dep);
  var v30=varPorcao(r,30), nfs=atualizacoesNF(r), prev=previaNF(r), visivel=LFI.depVisivel(r.dep);
  var maxPart=0; c.itens.forEach(function(i){ maxPart=Math.max(maxPart,i.part); });
  var h=UI.cabecalho({migalha:[{t:'Receitas',ir:'receitas'},{t:r.nome}], titulo:esc(r.nome), sub:'Ficha técnica · '+esc(r.cat)+' · '+esc(LFI.dep(r.dep).nome)+' · '+esc(emp.fantasia),
    acoes:'<button class="btn sec sm" data-act="pdf">'+UI.ic('imprimir')+'Imprimir ficha</button><button class="btn sec sm" data-act="dup">'+UI.ic('copiar')+'Duplicar</button>'+(r.dep!=='sus'||!r.buffet?'<button class="btn sec sm" data-act="op">'+UI.ic('producao')+'Ordem de produção</button>':'<button class="btn sec sm" data-act="_ir" data-id="buffet">'+UI.ic('buffet')+'Buffet</button>')+'<button class="btn pri sm" data-act="editar">'+UI.ic('editar')+'Editar ficha</button>'});
  if(!visivel) h+=UI.nota('Esta receita pertence a <b>'+esc(emp.fantasia)+'</b>, fora da empresa selecionada no topo. Exibida apenas para consulta.','wt');

  /* faixa de "dados vivos" */
  var vivo='<div class="rc-live"><i></i>Custo vivo · ligado ao custo médio do estoque</div>';
  if(nfs.length){ var u=nfs[0]; vivo+='<div style="font-size:12.5px;font-weight:700;color:var(--muted2);margin-top:6px">Última atualização: <b style="color:var(--text)">'+esc(u.origem)+'</b> em '+F.data(u.d)+' — '+esc(u.prod.nome)+' '+F.moeda(u.de)+' → '+F.moeda(u.para)+'/'+u.prod.un+(nfs.length>1?' · e mais '+(nfs.length-1)+' ingrediente(s)':'')+'</div>'; }
  if(prev){ var dif=prev.depois-prev.antes;
    var n0=prev.itens[0].nota; h+='<div class="nota lf">'+UI.ic('raio')+'<div><b>Nota fiscal aguardando conferência altera esta receita.</b> A NF '+esc(n0.numero)+' ('+esc(LFI.forn(n0.forn).nome)+') traz '+prev.itens.map(function(x){ return esc(x.prod.nome)+' a '+F.moeda(x.cu)+'/'+x.prod.un+' (custo médio '+F.moeda(x.prod.custoMedio)+' → '+F.moeda(x.novo)+')'; }).join('; ')+
      '. Ao lançar a nota, o custo por porção passa de <b>'+F.moeda(prev.antes)+'</b> para <b>'+F.moeda(prev.depois)+'</b> ('+(dif>=0?'+':'')+F.pct(prev.antes?dif/prev.antes:0)+'). <a class="vertodos" data-act="_ir" data-id="notas/'+prev.itens[0].nota.id+'">Conferir nota</a></div></div>'; }

  h+='<div class="grid g21 mb"><div class="card"><div class="rc-hero"><div class="foto" style="background:'+(r.cor||'#F3F3F5')+'">'+r.foto+'</div><div>'+
    '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px">'+vivo+'</div>'+
    '<div class="kv c3">'+
      '<div><span>Categoria</span><b>'+esc(r.cat)+'</b></div>'+
      '<div><span>Operação</span><b><i style="display:inline-block;width:8px;height:8px;border-radius:3px;background:'+LFI.dep(r.dep).cor+';margin-right:6px"></i>'+esc(LFI.dep(r.dep).nome)+'</b></div>'+
      '<div><span>Rendimento</span><b>'+F.num(r.rend)+' <small>'+esc(r.rendUn)+'</small></b></div>'+
      '<div><span>Quantidade produzida</span><b>'+F.num(r.rend)+' <small>'+esc(r.rendUn)+' por lote</small></b></div>'+
      '<div><span>Peso final</span><b>'+(r.pesoFinal?F.num(r.pesoFinal/1000,3)+' <small>kg</small>':'—')+'</b></div>'+
      '<div><span>Perdas de produção</span><b>'+F.pctN(r.perda||0,1)+' <small>'+F.moeda(c.perdaV)+'</small></b></div>'+
      '<div><span>Tempo de preparo</span><b>'+tempo(r.tempo)+'</b></div>'+
      '<div><span>Unidade de venda</span><b>'+esc(unVenda(r))+'</b></div>'+
      '<div><span>Produto acabado</span><b>'+(r.acabado&&LFI.prod(r.acabado)?'<a class="vertodos" data-act="_ir" data-id="estoque/'+r.acabado+'">'+esc(LFI.prod(r.acabado).nome)+'</a>':'<small>sem estoque próprio</small>')+'</b></div>'+
    '</div></div></div>'+
    '<div style="margin-top:16px;border-top:1px solid var(--border);padding-top:14px"><div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Modo de preparo</div><div class="rc-modo">'+esc(r.modo||'Não informado.')+'</div></div></div>';

  /* precificação */
  var corM=p.mcPct>=META_MC?'var(--green)':'var(--red)';
  h+='<div class="card rc-prc"><h3><span class="lft">'+UI.ic('custos')+' Precificação</span>'+UI.badge(p.mcPct>=META_MC?'Dentro da meta':'Abaixo da meta',p.mcPct>=META_MC?'ok':'no')+'</h3>'+
    '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-end;margin-bottom:10px"><div><div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase">Preço atual'+(porKgVenda(r)?' (buffet por kg)':'')+'</div><div class="big">'+F.moeda(p.preco)+'</div></div>'+
    '<div style="text-align:right"><div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase">Margem de contribuição</div><div class="big" style="color:'+corM+'">'+F.pct(p.mcPct)+'</div></div></div>'+
    '<div class="lnr"><span class="k">Custo '+(porKgVenda(r)?'por kg':'por porção')+'</span><span class="v">'+F.moeda(p.custo)+'</span></div>'+
    '<div class="lnr"><span class="k">Markup alvo ('+esc(r.cat)+')</span><span class="v">'+F.num(mk,2)+'×</span></div>'+
    '<div class="lnr"><span class="k">Preço sugerido</span><span class="v">'+F.moeda(p.sugerido)+'</span></div>'+
    '<div class="lnr"><span class="k">Impostos sobre a venda <small>('+F.pctN(p.impPct)+' · '+esc(emp.regime)+')</small></span><span class="v">'+F.moeda(p.impV)+'</span></div>'+
    '<div class="lnr"><span class="k">CMV</span><span class="v">'+F.pct(p.cmvPct)+'</span></div>'+
    '<div class="lnr"><span class="k">Markup praticado</span><span class="v">'+F.num(p.markupReal,2)+'×</span></div>'+
    '<div class="lnr tot"><span class="k">Margem de contribuição</span><span class="v" style="color:'+corM+'">'+F.moeda(p.mc)+'</span></div>'+
    '<div class="lnr"><span class="k">Rentabilidade por lote <small>('+F.num(r.rend)+' '+esc(r.rendUn)+')</small></span><span class="v">'+F.moeda(p.mc*(porKgVenda(r)?(r.pesoFinal||1000)/1000:r.rend))+'</span></div>'+
    (porKgVenda(r)?UI.nota('Item do buffet vendido por quilo: a margem considera o preço do buffet ('+F.moeda(LFI.db.buffetPrecoKg)+'/kg).','in'):
    '<div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px"><div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Simular novo preço</div><div class="rc-sim"><input class="inp num sm" id="rc-sim" value="'+UI.numBR(p.preco,2)+'" data-inp="sim"><button class="btn sec sm" data-act="usarSug">Usar sugerido</button><button class="btn pri sm" data-act="aplicar">Aplicar preço</button></div><div id="rc-sim-r" style="font-size:12px;font-weight:700;color:var(--muted2);margin-top:8px"></div></div>')+
  '</div></div>';

  /* ingredientes */
  h+='<div class="card mb"><h3><span class="lft">'+UI.ic('receita')+' Ingredientes e custos <span class="n">'+c.itens.length+'</span></span><small>custo unitário = custo médio atual do estoque · variação em 30 dias</small></h3><div class="tb-wrap"><table class="tb rc-ing"><thead><tr><th>Ingrediente</th><th class="r">Quantidade</th><th class="r">Conversão (unid. base)</th><th class="r">Custo unitário</th><th class="r">30 dias</th><th class="r">Custo</th><th class="r" style="width:150px">Participação</th></tr></thead><tbody>';
  c.itens.forEach(function(i){ var c30=LFI.custoEm(i.prod,D(-30));
    h+='<tr><td><a class="lk" data-act="_ir" data-id="estoque/'+i.prod.id+'">'+esc(i.prod.nome)+'</a><small>'+esc(LFI.cat(i.prod.cat).nome)+' · estoque '+F.qtd(LFI.estoque(i.prod,[r.dep]),i.prod.un)+' na operação</small></td>'+
      '<td class="r">'+F.num(i.qtd)+' '+esc(i.un)+'</td><td class="r">'+F.num(i.qtdBase,3)+' '+i.prod.un+'</td>'+
      '<td class="r"><b>'+F.moeda(i.custoUn)+'</b><small>por '+i.prod.un+'</small></td><td class="r">'+UI.variacao(i.custoUn,c30,true)+'</td>'+
      '<td class="r"><b>'+F.moeda(i.custo)+'</b></td><td class="r"><div class="rc-part">'+UI.bar(maxPart?i.part/maxPart:0, i.part===maxPart?'':'dk')+'<span style="width:44px;text-align:right">'+F.pct(i.part)+'</span></div></td></tr>'; });
  h+='</tbody></table></div>';
  h+='<div class="grid g4" style="margin-top:14px;gap:10px">'+
    tot('Custo bruto', F.moeda(c.bruto), 'soma dos ingredientes')+
    tot('Perdas de produção', F.moeda(c.perdaV), F.pctN(r.perda||0,1)+' sobre o bruto')+
    tot('Custo total do lote', F.moeda(c.total), F.num(r.rend)+' '+esc(r.rendUn))+
    tot('Custo por porção', F.moeda(c.porcao), (c.porKg?F.moeda(c.porKg)+' por kg':'')+' · '+UI.variacao(v30.agora,v30.antes,true), true)+
  '</div></div>';

  /* histórico */
  h+='<div class="grid g21 mb"><div class="card"><h3><span class="lft">Histórico de custo por porção <small>últimos 6 meses · recalculado com o custo de cada ingrediente na data</small></span></h3><div id="rc-hist"></div></div>'+
    '<div class="card"><h3><span class="lft">O que mais pesou na variação</span><span class="seg"><button class="'+(s.cmp===30?'on':'')+'" data-act="cmp" data-id="30">30 dias</button><button class="'+(s.cmp===90?'on':'')+'" data-act="cmp" data-id="90">90 dias</button></span></h3><div id="rc-var"></div></div></div>';
  h+='<div class="card mb"><h3>Comparação por ingrediente <small>atual × 30 dias × 90 dias atrás · impacto por porção</small></h3><div id="rc-cmp"></div></div>';
  /* outras receitas que usam os mesmos insumos */
  el.innerHTML=h;

  /* gráfico do histórico */
  var datas={}; r.ing.forEach(function(g){ LFI.prod(g.prod).hist.forEach(function(x){ if(x.d>=D(-180)) datas[x.d]=1; }); });
  var ds=Object.keys(datas).sort(); if(ds[ds.length-1]!==LFI.hoje()) ds.push(LFI.hoje());
  var serie=ds.map(function(d){ return d===LFI.hoje()?c.porcao:LFI.custoReceita(r,d).porcao; });
  var serieP=ds.map(function(d){ var x=d===LFI.hoje()?c:LFI.custoReceita(r,d); return r2((porKgVenda(r)?x.porKg:x.porcao)*mk); });
  UI.grafLinhas(el.querySelector('#rc-hist'),{cats:ds.map(F.dataC), titulosTip:ds.map(function(d){ return F.data(d)+(d===LFI.hoje()?' (hoje)':''); }), zero:false, altura:230,
    series:[{nome:porKgVenda(r)?'Custo por kg':'Custo por porção', cor:'#FF5A00', valores:porKgVenda(r)?ds.map(function(d){ return d===LFI.hoje()?c.porKg:LFI.custoReceita(r,d).porKg; }):serie}]});
  el.querySelector('#rc-hist').insertAdjacentHTML('beforeend','<div class="lnr" style="margin-top:8px"><span class="k">Variação em 6 meses ('+F.data(ds[0])+' → hoje)</span><span class="v">'+F.moeda(serie[0])+' → '+F.moeda(serie[serie.length-1])+' '+UI.variacao(serie[serie.length-1],serie[0],true)+'</span></div><div class="lnr"><span class="k">CMV no preço atual</span><span class="v">'+F.pct(serie[0]/(porKgVenda(r)?p.preco*r.rend:p.preco))+' → '+F.pct(c.porcao/(porKgVenda(r)?p.preco*r.rend:p.preco))+'</span></div>');
  desenhaVariacao(el, r);
  if(!porKgVenda(r)) simula(el, r);

  UI.liga(el, UI.navHandlers({
    editar:function(){ editar(r); },
    dup:function(){ var n=JSON.parse(JSON.stringify(r)); n.id=null; n.nome=r.nome+' (cópia)'; delete n.acabado; editar(n, true); },
    pdf:function(){ fichaPDF(r); },
    op:function(){ LFI.estado.producao=LFI.estado.producao||{}; LFI.estado.producao.nova=r.id; LFI.ir('producao'); },
    cmp:function(id){ s.cmp=+id; desenhaVariacao(el, r); UI.els('[data-act="cmp"]',el).forEach(function(b){ b.classList.toggle('on', +b.getAttribute('data-id')===s.cmp); }); },
    sim:function(){ simula(el, r); },
    usarSug:function(){ el.querySelector('#rc-sim').value=UI.numBR(p.sugerido,2); simula(el, r); },
    aplicar:function(){ var v=UI.num(el.querySelector('#rc-sim').value); if(!(v>0)){ UI.toast('Informe um preço válido','','wt'); return; }
      var ant=r.preco; UI.confirmar('Aplicar novo preço','O preço de <b>'+esc(r.nome)+'</b> passa de '+F.moeda(ant)+' para <b>'+F.moeda(v)+'</b>. A margem e o CMV serão atualizados em todas as telas.','Aplicar preço',function(){
        r.preco=r2(v); LFI.atividade('receita','Preço de '+r.nome+' alterado: '+F.moeda(ant)+' → '+F.moeda(r.preco),{tela:'receitas',id:r.id}); LFI.salvar(); UI.toast('Preço atualizado', r.nome+' · '+F.moeda(r.preco)); LFI.recarregar(); }); }
  }));
}
function tot(lb, vl, dl, hl){ return '<div class="kpi'+(hl?' hl':'')+'" style="padding:12px 14px"><div class="lb">'+lb+'</div><div class="vl" style="font-size:20px">'+vl+'</div>'+(dl?'<div class="dl">'+dl+'</div>':'')+'</div>'; }
function tempo(m){ if(!m) return '—'; if(m<60) return m+' min'; return Math.floor(m/60)+' h'+(m%60?' '+(m%60)+' min':''); }

function simula(el, r){
  var box=el.querySelector('#rc-sim-r'); if(!box) return;
  var v=UI.num(el.querySelector('#rc-sim').value), x=LFI.precificar(r,{preco:v});
  box.innerHTML= v>0 ? 'Com '+F.moeda(v)+': margem <b style="color:var('+(x.mcPct>=META_MC?'--green':'--red')+')">'+F.moeda(x.mc)+' ('+F.pct(x.mcPct)+')</b> · CMV '+F.pct(x.cmvPct)+' · markup '+F.num(x.markupReal,2)+'×' : 'Informe um preço.';
}

function desenhaVariacao(el, r){
  var s=st(), dias=s.cmp, agora=LFI.custoReceita(r), a30=LFI.custoReceita(r,D(-30)), a90=LFI.custoReceita(r,D(-90)), ref=dias===30?a30:a90;
  var fat=(1+(r.perda||0)/100)/(r.rend||1);
  var linhas=agora.itens.map(function(i,k){ return {i:i, c30:a30.itens[k], c90:a90.itens[k], dif:r2((i.custo-ref.itens[k].custo)*fat)}; });
  var difTot=r2(agora.porcao-ref.porcao), altas=linhas.filter(function(l){ return l.dif>0; }).sort(function(a,b){ return b.dif-a.dif; });
  var hv='<div class="lnr"><span class="k">Custo por porção há '+dias+' dias</span><span class="v">'+F.moeda(ref.porcao)+'</span></div><div class="lnr" style="margin-bottom:12px"><span class="k">Hoje</span><span class="v">'+F.moeda(agora.porcao)+' '+UI.variacao(agora.porcao,ref.porcao,true)+'</span></div>';
  if(altas.length&&difTot>0){ var top=altas[0];
    hv+=UI.nota('<b>'+esc(top.i.prod.nome)+'</b> foi o que mais pesou na alta: +'+F.moeda(top.dif)+' por porção ('+F.pct(difTot?Math.min(1,top.dif/difTot):0,0)+' do aumento). Custo do insumo: '+F.moeda(LFI.custoEm(top.i.prod,D(-dias)))+' → '+F.moeda(top.i.custoUn)+'/'+top.i.prod.un+'.','lf','alerta');
    hv+=UI.barrasH(altas.slice(0,5).map(function(l){ return {nome:l.i.prod.nome, valor:l.dif, cor:'var(--red)', id:l.i.prod.id, sub:UI.esc(F.pct(l.i.custoUn/LFI.custoEm(l.i.prod,D(-dias))-1))}; }),{fmt:function(v){ return '+'+F.moeda(v); }});
  } else hv+=UI.nota(difTot<0?'O custo por porção caiu '+F.moeda(-difTot)+' no período.':'Sem variação relevante de custo no período.','ok','check');
  el.querySelector('#rc-var').innerHTML=hv;
  var box=el.querySelector('#rc-cmp');
  UI.tabela(box,{linhas:linhas, ordem:6, dir:-1, cls:'cp', colunas:[
    {t:'Ingrediente', v:function(l){ return '<b>'+esc(l.i.prod.nome)+'</b><small>'+F.num(l.i.qtdBase,3)+' '+l.i.prod.un+' por lote</small>'; }, ord:function(l){ return l.i.prod.nome; }},
    {t:'Custo un. hoje', r:true, v:function(l){ return F.moeda(l.i.custoUn); }, ord:function(l){ return l.i.custoUn; }},
    {t:'Há 30 dias', r:true, v:function(l){ return F.moeda(l.c30.custoUn)+'<small>'+UI.variacao(l.i.custoUn,l.c30.custoUn,true)+'</small>'; }, ord:function(l){ return l.c30.custoUn; }},
    {t:'Há 90 dias', r:true, v:function(l){ return F.moeda(l.c90.custoUn)+'<small>'+UI.variacao(l.i.custoUn,l.c90.custoUn,true)+'</small>'; }, ord:function(l){ return l.c90.custoUn; }},
    {t:'Custo no lote', r:true, v:function(l){ return F.moeda(l.i.custo); }, ord:function(l){ return l.i.custo; }},
    {t:'Participação', r:true, v:function(l){ return F.pct(l.i.part); }, ord:function(l){ return l.i.part; }},
    {t:'Impacto/porção ('+dias+'d)', r:true, v:function(l){ return '<b style="color:var('+(l.dif>0.004?'--red':l.dif<-0.004?'--green':'--muted')+')">'+(l.dif>0?'+':'')+F.moeda(l.dif)+'</b>'; }, ord:function(l){ return l.dif; }}
  ], rodape:'<tr><td>Total por porção</td><td class="r">'+F.moeda(agora.porcao)+'</td><td class="r">'+F.moeda(a30.porcao)+'</td><td class="r">'+F.moeda(a90.porcao)+'</td><td class="r">'+F.moeda(agora.total)+'</td><td class="r">100%</td><td class="r">'+(difTot>0?'+':'')+F.moeda(difTot)+'</td></tr>'});
}

/* ================= PDF ================= */
function fichaPDF(r){
  var c=LFI.custoReceita(r), p=prec(r), emp=LFI.empresaDoDep(r.dep);
  var h='<div class="kp"><div><span>Rendimento</span><b>'+F.num(r.rend)+' '+esc(r.rendUn)+'</b></div><div><span>Peso final</span><b>'+(r.pesoFinal?F.num(r.pesoFinal/1000,3)+' kg':'—')+'</b></div><div><span>Perdas</span><b>'+F.pctN(r.perda||0,1)+'</b></div><div><span>Tempo de preparo</span><b>'+tempo(r.tempo)+'</b></div><div><span>Custo por porção</span><b>'+F.moeda(c.porcao)+'</b></div></div>';
  h+='<h2>Ingredientes</h2><table><thead><tr><th>Ingrediente</th><th class="r">Qtd.</th><th class="r">Unid. base</th><th class="r">Custo unit.</th><th class="r">Custo</th><th class="r">Part.</th></tr></thead><tbody>'+
    c.itens.map(function(i){ return '<tr><td>'+esc(i.prod.nome)+'</td><td class="r">'+F.num(i.qtd)+' '+esc(i.un)+'</td><td class="r">'+F.num(i.qtdBase,3)+' '+i.prod.un+'</td><td class="r">'+F.moeda(i.custoUn)+'/'+i.prod.un+'</td><td class="r">'+F.moeda(i.custo)+'</td><td class="r">'+F.pct(i.part)+'</td></tr>'; }).join('')+
    '</tbody><tfoot><tr><td colspan="4">Custo bruto</td><td class="r">'+F.moeda(c.bruto)+'</td><td></td></tr><tr><td colspan="4">Perdas de produção ('+F.pctN(r.perda||0,1)+')</td><td class="r">'+F.moeda(c.perdaV)+'</td><td></td></tr><tr><td colspan="4">Custo total do lote</td><td class="r">'+F.moeda(c.total)+'</td><td></td></tr><tr><td colspan="4">Custo por porção'+(c.porKg?' · por kg '+F.moeda(c.porKg):'')+'</td><td class="r">'+F.moeda(c.porcao)+'</td><td></td></tr></tfoot></table>';
  h+='<h2>Precificação</h2><table><tbody><tr><td>Markup alvo</td><td class="r">'+F.num(p.markup,2)+'×</td><td>Preço sugerido</td><td class="r">'+F.moeda(p.sugerido)+'</td></tr><tr><td>Preço atual</td><td class="r">'+F.moeda(p.preco)+'</td><td>Impostos s/ venda ('+F.pctN(p.impPct)+')</td><td class="r">'+F.moeda(p.impV)+'</td></tr><tr><td>CMV</td><td class="r">'+F.pct(p.cmvPct)+'</td><td>Margem de contribuição</td><td class="r">'+F.moeda(p.mc)+' ('+F.pct(p.mcPct)+')</td></tr></tbody></table>';
  h+='<h2>Modo de preparo</h2><p style="font-size:11.5px;line-height:1.6">'+esc(r.modo||'—')+'</p>';
  UI.exportarPDF('Ficha técnica — '+r.nome, r.cat+' · '+LFI.dep(r.dep).nome+' · '+emp.fantasia+' (CNPJ '+emp.cnpj+')', h);
}

/* ================= EDIÇÃO ================= */
function editar(orig, duplicar){
  var novo=!orig||duplicar;
  var deps=LFI.depIds().filter(function(d){ return d!=='cen'; });
  var base=orig?JSON.parse(JSON.stringify(orig)):{nome:'', dep:st().op!=='todas'?st().op:(deps[0]||'pad'), cat:'', foto:'🍽️', rend:1, rendUn:'porção', pesoFinal:0, perda:3, tempo:30, preco:0, vendaUn:'porção', modo:'', ing:[{prod:'',qtd:0,un:'g'}]};
  var d=base; if(!d.cor) d.cor=COR_DEP[d.dep]||'#F3F3F5';
  var cats={}; LFI.db.receitas.forEach(function(r){ cats[r.cat]=1; });

  function linha(g,i){ return '<div class="rc-row" data-row="'+i+'"><select class="inp sm" data-chg="ingP" data-id="'+i+'">'+UI.selProdutos(g.prod)+'</select>'+
    '<input class="inp sm num" data-inp="ingQ" data-id="'+i+'" value="'+(g.qtd?UI.numBR(g.qtd):'')+'" placeholder="Qtd." inputmode="decimal">'+
    '<select class="inp sm" data-chg="ingU" data-id="'+i+'">'+UNS.map(function(u){ return '<option'+(u===g.un?' selected':'')+'>'+u+'</option>'; }).join('')+'</select>'+
    '<div class="cv" id="cv'+i+'"></div><button type="button" class="x" data-act="ingX" data-id="'+i+'" title="Remover">✕</button></div>'; }
  function linhas(){ return d.ing.map(linha).join(''); }
  var corpo='<div class="rc-ed"><div>'+
    '<div class="fgrid"><div class="field full"><label>Nome da receita</label><input class="inp" data-inp="f" data-id="nome" value="'+esc(d.nome)+'" placeholder="Ex.: Yakimeshi de salmão"></div>'+
    '<div class="field"><label>Operação</label><select class="inp" data-chg="f" data-id="dep">'+deps.map(function(x){ return '<option value="'+x+'"'+(x===d.dep?' selected':'')+'>'+esc(LFI.dep(x).nome)+' — '+esc(LFI.empresaDoDep(x).fantasia)+'</option>'; }).join('')+'</select></div>'+
    '<div class="field"><label>Categoria</label><input class="inp" list="rc-cats" data-inp="f" data-id="cat" value="'+esc(d.cat)+'" placeholder="Ex.: Pratos do almoço"><datalist id="rc-cats">'+Object.keys(cats).map(function(c){ return '<option value="'+esc(c)+'">'; }).join('')+'</datalist></div>'+
    '<div class="field full"><label>Foto ilustrativa</label><div class="rc-emo">'+FOTOS.map(function(e){ return '<button type="button" class="'+(e===d.foto?'on':'')+'" data-act="foto" data-id="'+e+'">'+e+'</button>'; }).join('')+'</div></div></div>'+
    '<div class="fgrid c4"><div class="field"><label>Rendimento</label><input class="inp num" data-inp="n" data-id="rend" value="'+UI.numBR(d.rend)+'" inputmode="decimal"></div>'+
    '<div class="field"><label>Unidade do rendimento</label><input class="inp" data-inp="f" data-id="rendUn" value="'+esc(d.rendUn)+'"></div>'+
    '<div class="field"><label>Peso final (g)</label><input class="inp num" data-inp="n" data-id="pesoFinal" value="'+UI.numBR(d.pesoFinal||'')+'" inputmode="decimal"></div>'+
    '<div class="field"><label>Perdas de produção (%)</label><input class="inp num" data-inp="n" data-id="perda" value="'+UI.numBR(d.perda||0,1)+'" inputmode="decimal"></div>'+
    '<div class="field"><label>Tempo de preparo (min)</label><input class="inp num" data-inp="n" data-id="tempo" value="'+UI.numBR(d.tempo||'')+'" inputmode="numeric"></div>'+
    '<div class="field"><label>Preço de venda (R$)</label><input class="inp num" data-inp="n" data-id="preco" value="'+UI.numBR(d.preco||'',2)+'" inputmode="decimal"></div>'+
    '<div class="field"><label>Vendido por</label><input class="inp" data-inp="f" data-id="vendaUn" value="'+esc(d.vendaUn||'porção')+'"></div></div>'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin:4px 0 4px"><label style="font-size:12px;font-weight:800">Ingredientes</label><button type="button" class="btn sec xs" data-act="ingAdd">'+UI.ic('mais')+'Adicionar ingrediente</button></div>'+
    '<div id="ed-ing">'+linhas()+'</div>'+
    '<div class="field" style="margin-top:14px"><label>Modo de preparo</label><textarea class="inp" data-inp="f" data-id="modo">'+esc(d.modo||'')+'</textarea></div>'+
    '</div><div class="res" id="ed-res"></div></div>';

  var m=UI.modal({titulo:novo?(duplicar?'Duplicar receita':'Nova receita'):'Editar ficha técnica', sub:novo?'O custo é calculado em tempo real com o custo médio atual do estoque':esc(orig.nome), tam:'xl', fixo:true, corpo:corpo,
    botoes:'<button class="btn sec" data-act="_fechar">Cancelar</button><button class="btn pri" data-act="salvar">'+UI.ic('check')+'Salvar ficha técnica</button>',
    acoes:{
      f:function(id,ev){ d[id]=ev.target.value; if(id==='dep'){ d.cor=COR_DEP[d.dep]||d.cor; } recalc(); },
      n:function(id,ev){ d[id]=UI.num(ev.target.value); recalc(); },
      foto:function(id,ev,t){ d.foto=id; UI.els('.rc-emo button',m.el).forEach(function(b){ b.classList.toggle('on',b===t); }); },
      ingP:function(i,ev){ var g=d.ing[+i]; g.prod=ev.target.value; var p=LFI.prod(g.prod); if(p){ g.un=p.un==='kg'?'g':p.un==='L'?'ml':'un'; var row=m.el.querySelector('[data-row="'+i+'"] select[data-chg="ingU"]'); row.value=g.un; } recalc(); },
      ingQ:function(i,ev){ d.ing[+i].qtd=UI.num(ev.target.value); recalc(); },
      ingU:function(i,ev){ d.ing[+i].un=ev.target.value; recalc(); },
      ingX:function(i){ d.ing.splice(+i,1); if(!d.ing.length) d.ing.push({prod:'',qtd:0,un:'g'}); m.el.querySelector('#ed-ing').innerHTML=linhas(); recalc(); },
      ingAdd:function(){ d.ing.push({prod:'',qtd:0,un:'g'}); m.el.querySelector('#ed-ing').innerHTML=linhas(); recalc(); var s=m.el.querySelectorAll('#ed-ing select[data-chg="ingP"]'); s[s.length-1].focus(); },
      salvar:function(){
        var ings=ingValidos(d);
        if(!String(d.nome).trim()){ UI.toast('Informe o nome da receita','','wt'); return; }
        if(!ings.length){ UI.toast('Inclua ao menos um ingrediente com quantidade','','wt'); return; }
        if(!(d.rend>0)){ UI.toast('Rendimento deve ser maior que zero','','wt'); return; }
        var alvo=novo?{id:LFI.novoId('r')}:orig;
        ['nome','dep','cat','foto','cor','rend','rendUn','pesoFinal','perda','tempo','preco','vendaUn','modo'].forEach(function(k){ alvo[k]=d[k]; });
        alvo.nome=String(alvo.nome).trim(); alvo.cat=String(alvo.cat||'Sem categoria').trim()||'Sem categoria';
        alvo.ing=ings.map(function(g){ return {prod:g.prod, qtd:g.qtd, un:g.un}; });
        if(novo){ if(d.buffet) alvo.buffet=true; LFI.db.receitas.push(alvo); }
        var c=LFI.custoReceita(alvo);
        LFI.atividade('receita',(novo?'Receita criada: ':'Ficha técnica atualizada: ')+alvo.nome+' · custo '+F.moeda(c.porcao)+'/porção',{tela:'receitas',id:alvo.id});
        LFI.salvar(); m.fechar(); UI.toast(novo?'Receita criada':'Ficha técnica salva', alvo.nome+' · custo por porção '+F.moeda(c.porcao));
        LFI.ir('receitas', alvo.id);
      }
    }});
  function recalc(){
    d.ing.forEach(function(g,i){ var cv=m.el.querySelector('#cv'+i); if(!cv) return; var p=LFI.prod(g.prod);
      if(!p||!g.qtd){ cv.innerHTML='—'; return; }
      var qb=LFI.converte(g.qtd,g.un,p.un); cv.innerHTML='<b>'+F.moeda(qb*p.custoMedio)+'</b>'+F.num(qb,3)+' '+p.un+' × '+F.moeda(p.custoMedio); });
    var c=custoSeguro(d), tmp={dep:d.dep, cat:d.cat, rend:d.rend, perda:d.perda, pesoFinal:d.pesoFinal, preco:d.preco, ing:ingValidos(d), buffet:d.buffet};
    var p=tmp.ing.length?LFI.precificar(tmp,{preco:d.preco||null}):null;
    var h='<div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Cálculo em tempo real</div>'+
      '<div class="lnr"><span class="k">Ingredientes</span><span class="v">'+c.itens.length+'</span></div>'+
      '<div class="lnr"><span class="k">Custo bruto</span><span class="v">'+F.moeda(c.bruto)+'</span></div>'+
      '<div class="lnr"><span class="k">Perdas ('+F.pctN(d.perda||0,1)+')</span><span class="v">'+F.moeda(c.perdaV)+'</span></div>'+
      '<div class="lnr"><span class="k">Custo total</span><span class="v">'+F.moeda(c.total)+'</span></div>'+
      '<div class="lnr tot"><span class="k">Custo por porção</span><span class="v">'+F.moeda(c.porcao)+'</span></div>'+
      '<div class="lnr"><span class="k">Custo por kg</span><span class="v">'+(c.porKg?F.moeda(c.porKg):'—')+'</span></div>';
    if(p){ h+='<div style="height:10px"></div><div class="lnr"><span class="k">Markup alvo</span><span class="v">'+F.num(p.markup,2)+'×</span></div><div class="lnr"><span class="k">Preço sugerido</span><span class="v">'+F.moeda(p.sugerido)+'</span></div>'+
      '<div class="lnr"><span class="k">Preço informado</span><span class="v">'+(d.preco?F.moeda(d.preco):'<small style="color:var(--muted)">usa o sugerido</small>')+'</span></div>'+
      '<div class="lnr"><span class="k">CMV</span><span class="v">'+F.pct(p.cmvPct)+'</span></div>'+
      '<div class="lnr"><span class="k">Margem de contribuição</span><span class="v" style="color:var('+(p.mcPct>=META_MC?'--green':'--red')+')">'+F.moeda(p.mc)+' · '+F.pct(p.mcPct)+'</span></div>';
      if(c.itens.length){ var mx=c.itens.slice().sort(function(a,b){ return b.part-a.part; })[0]; h+=UI.nota('<b>'+esc(mx.prod.nome)+'</b> representa '+F.pct(mx.part,0)+' do custo.','in'); } }
    m.el.querySelector('#ed-res').innerHTML=h;
  }
  recalc();
}

/* ================= IMPORTAR PLANILHA (simulação) ================= */
var PLANILHA=[
  {nome:'Yakimeshi de salmão', dep:'res', cat:'Pratos quentes', foto:'🍳', rend:4, rendUn:'porções', pesoFinal:1400, perda:4, tempo:20, preco:39.90, modo:'Saltear o gohan do dia anterior com salmão em cubos, ovos, cebola e shoyu em fogo alto.',
    linhas:[['ARROZ JAPONES GRAO CURTO','600','g'],['SALMAO FRESCO FILE','280','g'],['OVOS BRANCOS','3','un'],['MOLHO SHOYU','40','ml'],['CEBOLA','80','g'],['OLEO DE SOJA','30','ml']]},
  {nome:'Quiche de queijo e presunto', dep:'pad', cat:'Salgados', foto:'🥧', rend:8, rendUn:'fatias', pesoFinal:1300, perda:3, tempo:75, preco:14.90, modo:'Massa podre com manteiga gelada; recheio de creme, ovos, presunto e muçarela. Assar 35 min a 180 °C.',
    linhas:[['FARINHA DE TRIGO TIPO 1','250','g'],['MANTEIGA S/SAL','125','g'],['OVOS','4','un'],['CREME DE LEITE','300','g'],['PRESUNTO COZIDO','150','g'],['QUEIJO MUSSARELA','150','g'],['SAL REFINADO','5','g']]},
  {nome:'Escondidinho de carne', dep:'res', cat:'Pratos do almoço', foto:'🥘', rend:6, rendUn:'porções', pesoFinal:2400, perda:5, tempo:60, preco:38.90, modo:'Purê de batata com manteiga e leite sobre carne moída refogada com cebola e molho; gratinar com muçarela.',
    linhas:[['BATATA LAVADA','1,2','kg'],['ACEM MOIDO','800','g'],['LEITE INTEGRAL','300','ml'],['MANTEIGA','60','g'],['QUEIJO MUSSARELA','200','g'],['CEBOLA NACIONAL','150','g'],['MOLHO TOMATE','200','g']]}
];
function importar(){
  var dados=null;
  var m=UI.modal({titulo:'Importar fichas técnicas de planilha', sub:'Excel (.xlsx) ou CSV · leitura e correspondência de ingredientes simuladas', tam:'xl', fixo:true, corpo:passo1(),
    botoes:'<button class="btn sec" data-act="_fechar">Cancelar</button>',
    acoes:{
      exemplo:function(){ ler('Fichas_tecnicas_Grupo.xlsx'); },
      modelo:function(){ UI.exportarExcel('modelo_fichas_tecnicas',['Receita','Operação','Categoria','Rendimento','Unidade','Peso final (g)','Perda %','Preço','Ingrediente','Quantidade','Unidade'],
        PLANILHA[0].linhas.map(function(l,i){ return i?['','','','','','','','',l[0],l[1],l[2]]:[PLANILHA[0].nome,'Sushi',PLANILHA[0].cat,PLANILHA[0].rend,PLANILHA[0].rendUn,PLANILHA[0].pesoFinal,PLANILHA[0].perda,PLANILHA[0].preco,l[0],l[1],l[2]]; }),'Fichas'); },
      prod:function(id,ev){ var a=id.split('_'); dados[+a[0]].linhas[+a[1]].prod=ev.target.value; m.corpoHTML(previa()); rodape(); },
      sel:function(id,ev){ dados[+id].sel=ev.target.checked; rodape(); },
      importar:function(){
        var cri=[]; dados.forEach(function(rc){ if(!rc.sel) return;
          var ing=rc.linhas.filter(function(l){ return l.prod; }).map(function(l){ return {prod:l.prod, qtd:l.qtd, un:l.un}; });
          var r={id:LFI.novoId('r'), nome:rc.nome, dep:rc.dep, cat:rc.cat, foto:rc.foto, cor:COR_DEP[rc.dep], rend:rc.rend, rendUn:rc.rendUn, pesoFinal:rc.pesoFinal, perda:rc.perda, tempo:rc.tempo, preco:rc.preco, vendaUn:'porção', modo:rc.modo, ing:ing, importada:true};
          LFI.db.receitas.push(r); cri.push(r); });
        if(!cri.length){ UI.toast('Selecione ao menos uma receita','','wt'); return; }
        LFI.atividade('receita',cri.length+' fichas técnicas importadas de planilha',{tela:'receitas'});
        LFI.salvar(); m.fechar(); UI.toast(cri.length+' receitas importadas', cri.map(function(r){ return r.nome; }).join(', '));
        st().op='todas'; st().cat=''; st().q=''; st().aba='catalogo'; LFI.ir('receitas');
      }
    },
    aoAbrir:function(api){ setTimeout(function(){
      var inp=api.el.querySelector('#rc-file'), drop=api.el.querySelector('.drop');
      inp.addEventListener('change',function(){ if(inp.files[0]) ler(inp.files[0].name); });
      drop.addEventListener('click',function(ev){ if(ev.target.closest('button')) return; inp.click(); });
      drop.addEventListener('dragover',function(e){ e.preventDefault(); drop.classList.add('on'); });
      drop.addEventListener('dragleave',function(){ drop.classList.remove('on'); });
      drop.addEventListener('drop',function(e){ e.preventDefault(); drop.classList.remove('on'); var f=e.dataTransfer.files[0]; ler(f?f.name:'planilha.xlsx'); });
    },0); }
  });
  function passo1(){ return UI.passos(['Enviar planilha','Leitura','Conferência','Importação'],0)+
    '<div class="drop"><div class="ic">'+UI.ic('upload')+'</div><b>Arraste a planilha de fichas técnicas ou clique para escolher</b><small>Uma linha por ingrediente: receita, rendimento, ingrediente, quantidade e unidade</small><input type="file" id="rc-file" accept=".xlsx,.xls,.csv,.ods">'+
    '<div style="margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button type="button" class="btn sec sm" data-act="modelo">'+UI.ic('baixar')+'Baixar modelo</button><button type="button" class="btn pri sm" data-act="exemplo">'+UI.ic('excel')+'Usar planilha de exemplo</button></div></div>'+
    UI.nota('Os ingredientes da planilha são associados aos produtos do estoque por similaridade de nome (com nota de confiança). Você confere antes de importar.','in'); }
  function ler(nome){
    m.corpoHTML(UI.passos(['Enviar planilha','Leitura','Conferência','Importação'],1)+'<div class="card flat" style="margin-bottom:14px"><b style="font-size:13px">'+UI.ic('excel','')+' '+esc(nome)+'</b></div><div class="leitura">'+
      ['Lendo abas e colunas da planilha','Identificando receitas e linhas de ingredientes','Convertendo unidades (g, kg, ml, L, un)','Associando ingredientes aos produtos do estoque'].map(function(t,i){ return '<div class="lt-it" id="lt'+i+'"><span class="bo"></span>'+t+'</div>'; }).join('')+'</div>');
    var i=0; (function passo(){ if(i>0){ var a=m.el.querySelector('#lt'+(i-1)); if(a){ a.classList.remove('on'); a.classList.add('ok'); a.querySelector('.bo').textContent='✓'; } }
      if(i>=4){ setTimeout(function(){ montar(); },250); return; } var b=m.el.querySelector('#lt'+i); if(!b) return; b.classList.add('on'); i++; setTimeout(passo,420); })();
  }
  function montar(){
    var deps=LFI.depIds();
    dados=PLANILHA.map(function(rc){ var o=JSON.parse(JSON.stringify(rc)); o.sel=deps.indexOf(o.dep)>=0;
      o.linhas=rc.linhas.map(function(l){ var sug=LFI.sugerirProduto(l[0],4), q=UI.num(l[1]); return {desc:l[0], qtdTxt:l[1], qtd:q, un:l[2], sug:sug, prod:sug[0]&&sug[0].score>=45?sug[0].prod.id:'', score:sug[0]?sug[0].score:0}; });
      return o; });
    m.corpoHTML(previa()); rodape();
  }
  function previa(){
    var h=UI.passos(['Enviar planilha','Leitura','Conferência','Importação'],2);
    var tot=0, alto=0; dados.forEach(function(rc){ rc.linhas.forEach(function(l){ tot++; if(l.prod&&l.score>=85) alto++; }); });
    h+=UI.nota('<b>'+dados.length+' receitas</b> e <b>'+tot+' linhas de ingredientes</b> encontradas. '+alto+' associações com alta confiança; revise as marcadas em amarelo ou vermelho.','ok','check');
    h+='<div class="tb-wrap"><table class="tb cp"><thead><tr><th>Linha da planilha</th><th class="r">Qtd.</th><th>Produto do estoque</th><th>Confiança</th><th class="r">Custo</th></tr></thead><tbody>';
    dados.forEach(function(rc,ri){
      var c=custoSeguro({ing:rc.linhas.filter(function(l){ return l.prod; }).map(function(l){ return {prod:l.prod,qtd:l.qtd,un:l.un}; }), perda:rc.perda, rend:rc.rend, pesoFinal:rc.pesoFinal});
      var vis=LFI.depVisivel(rc.dep);
      h+='<tr class="rc-imp-hd"><td colspan="5"><label class="chk" style="display:inline-flex"><input type="checkbox" data-chg="sel" data-id="'+ri+'"'+(rc.sel?' checked':'')+'> '+rc.foto+' '+esc(rc.nome)+'</label> <span style="font-weight:600;color:var(--muted);font-size:12px;margin-left:8px">'+esc(rotDep(rc.dep))+' · '+esc(rc.cat)+' · rende '+rc.rend+' '+esc(rc.rendUn)+' · preço '+F.moeda(rc.preco)+' · custo/porção <b style="color:var(--text)">'+F.moeda(c.porcao)+'</b></span>'+(vis?'':' '+UI.badge('Operação fora da empresa selecionada','wt'))+'</td></tr>';
      rc.linhas.forEach(function(l,li){ var p=LFI.prod(l.prod), cu=p?LFI.converte(l.qtd,l.un,p.un)*p.custoMedio:0;
        var ops='<option value="">— não associar —</option>'+l.sug.map(function(s){ return '<option value="'+s.prod.id+'"'+(s.prod.id===l.prod?' selected':'')+'>'+esc(s.prod.nome)+' ('+s.score+'%)</option>'; }).join('');
        if(l.prod&&!l.sug.some(function(s){ return s.prod.id===l.prod; })) ops+='<option value="'+l.prod+'" selected>'+esc(p.nome)+'</option>';
        h+='<tr class="'+(!l.prod?'alerta':l.score<85?'aviso':'')+'"><td><span class="mono">'+esc(l.desc)+'</span></td><td class="r">'+esc(l.qtdTxt)+' '+esc(l.un)+'</td><td><select class="inp sm" style="min-width:220px" data-chg="prod" data-id="'+ri+'_'+li+'">'+ops+'</select></td><td>'+(l.prod?UI.match(l.score):UI.badge('Sem correspondência','no'))+'</td><td class="r">'+(p?F.moeda(cu):'—')+'</td></tr>'; });
    });
    h+='</tbody></table></div>';
    return h;
  }
  function rodape(){ var n=dados.filter(function(r){ return r.sel; }).length; m.rodapeHTML('<button class="btn sec esq" data-act="_fechar">Cancelar</button><button class="btn pri" data-act="importar"'+(n?'':' disabled')+'>'+UI.ic('check')+'Importar '+n+' receita'+(n===1?'':'s')+'</button>'); }
}

LFI.registrar('receitas',{titulo:'Receitas e Fichas Técnicas', render:render});
})();
