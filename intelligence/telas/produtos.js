/* LivePro — PRODUTOS (com a receita dentro de cada produto).
   Feito para pessoas leigas e para o celular: lista com busca e grupos; ao abrir o produto aparecem
   preço, custo e lucro, e a receita com "quanto usa" de cada ingrediente. Tudo recalcula na hora.
   Bases (massas e recheios) são produtos com receita que entram em outras receitas: o custo delas
   atualiza sozinho em todos os produtos que as usam. */
(function(){
'use strict';
var UI=LFI.ui, F=LFI.fmt, esc=UI.esc;
function r2(v){ return Math.round(v*100)/100; }
function r4(v){ return Math.round(v*10000)/10000; }
function num(s){ var v=parseFloat(String(s==null?'':s).replace(/\./g,'').replace(',','.')); return isFinite(v)?v:0; }
function numIn(s){ var t=String(s==null?'':s).trim(); if(/^\d+\.\d{1,3}$/.test(t)) return parseFloat(t); return num(t); }
function fmtIn(v){ if(v==null||v==='') return ''; return String(Math.round(v*1000)/1000).replace('.',','); }
function st(){ return LFI.estado.produtos=LFI.estado.produtos||{grupo:'venda', q:'', lim:60}; }
function desp(){ var c=LFI.db.config=LFI.db.config||{}; if(c.despesas==null) c.despesas=33; return c.despesas; }
var UNR={g:'g', ml:'ml', un:'un', min:'min', kg:'kg', L:'L'};
function unRec(p){ return {kg:'g', L:'ml', un:'un', min:'min'}[p.un]||'g'; }
function nomeUn(p, plural){ return p.un==='un'?(plural?'unidades':'unidade'):p.un==='kg'?'kg':p.un==='L'?'litros':p.un; }

/* ---------- contas ---------- */
LFI.receitaDe=function(p){ if(!p||!p.receita) return null; return LFI.rec(p.receita); };
LFI.analiseProduto=function(p, r){
  r=r||LFI.receitaDe(p); var o={tem:!!r, custoReceita:0, custoUn:0, despPct:0, despV:0, custoFinal:0, preco:p.preco||0, lucro:0, margem:0, semPreco:[]};
  if(r){
    r.ing.forEach(function(g){ var q=LFI.prod(g.prod); if(!q) return; var c=LFI.converte(g.qtd,g.un,q.un)*(q.custoMedio||0); o.custoReceita+=c; if(q.semPreco||!(q.custoMedio>0)) o.semPreco.push(q.nome); });
    o.custoUn=o.custoReceita/(r.rend||1); o.despPct=desp(); o.despV=o.custoUn*o.despPct/100; o.custoFinal=o.custoUn+o.despV;
  } else { o.custoUn=p.custoMedio||0; o.custoFinal=o.custoUn; }
  o.lucro=o.preco-o.custoFinal; o.margem=o.preco?o.lucro/o.preco:0;
  return o;
};
function corMargem(m, preco){ if(!preco) return 'nu'; return m>=0.5?'ok':m>=0.3?'wt':'no'; }

function css(){ if(document.getElementById('css-produtos')) return; var c=document.createElement('style'); c.id='css-produtos'; c.textContent=
  '.pr{max-width:1180px;margin:0 auto;padding-bottom:40px}'+
  '.pr-hd{display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap}.pr-hd>div{flex:1;min-width:200px}.pr-hd h1{font-size:24px;margin:0}.pr-hd small{display:block;color:var(--muted);font-weight:700;font-size:13.5px;margin-top:2px}'+
  '.pr-novo{min-height:50px;border-radius:14px;padding:0 18px;font-size:15px}'+
  '.pr-grp{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:10px;scrollbar-width:none}.pr-grp::-webkit-scrollbar{display:none}.pr-grp button{flex:none;display:flex;align-items:center;gap:6px;min-height:46px;padding:0 16px;border-radius:14px;border:1.5px solid var(--border2);background:#fff;font:inherit;font-size:14.5px;font-weight:800;cursor:pointer;white-space:nowrap}.pr-grp button.on{background:var(--text);border-color:var(--text);color:#fff}.pr-grp button i{font-style:normal;font-size:12px;font-weight:800;color:var(--muted)}.pr-grp button.on i{color:#C9C9CF}'+
  '.pr-busca{display:flex;align-items:center;gap:10px;border:2px solid var(--border2);border-radius:16px;background:#fff;padding:0 14px;min-height:56px;margin-bottom:12px}.pr-busca:focus-within{border-color:var(--roxo)}.pr-busca svg{width:20px;height:20px;stroke:var(--muted);fill:none;stroke-width:2}.pr-busca input{flex:1;border:0;outline:none;font:inherit;font-size:17px;font-weight:700;background:transparent;min-width:0}'+
  '.pr-lista{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}.pr-it{min-width:0}'+
  '.pr-it{display:flex;align-items:center;gap:12px;text-align:left;border:1.5px solid var(--border2);border-radius:18px;background:#fff;padding:12px 14px;cursor:pointer;font:inherit;color:inherit;min-height:78px}.pr-it:hover{border-color:var(--roxo)}.pr-it>span{flex:1;min-width:0}.pr-it b{display:block;font-size:15.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pr-it small{display:block;font-size:12.5px;color:var(--muted);font-weight:700}.pr-it .pv{text-align:right;flex:none}.pr-it .pv b{font-size:16px}.pr-it .pv small{font-size:12px}'+
  '.pr-m{display:inline-block;border-radius:8px;padding:2px 7px;font-size:11.5px;font-weight:800;margin-top:3px}.pr-m.ok{background:#ECFDF3;color:#14532D}.pr-m.wt{background:#FEF3C7;color:#7A5A00}.pr-m.no{background:#FEE2E2;color:#991B1B}.pr-m.nu{background:var(--s3);color:var(--muted2)}'+
  '.pr-mais{display:block;margin:14px auto 0;min-height:50px;padding:0 24px;border-radius:14px}'+
  /* página do produto */
  '.pp{max-width:760px;margin:0 auto;padding-bottom:130px}'+
  '.pp-top{display:flex;align-items:center;gap:14px;margin-bottom:14px}.pp-x{width:48px;height:48px;border-radius:14px;border:1px solid var(--border2);background:#fff;display:flex;align-items:center;justify-content:center;flex:none;cursor:pointer}.pp-x svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2}.pp-top>div{flex:1;min-width:0}.pp-top h1{font-size:22px;margin:0;line-height:1.2}.pp-top small{display:block;color:var(--muted);font-weight:700;font-size:13px;margin-top:3px}.pp-top .fprod{flex:none}'+
  '.pp-res{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px}.pp-res>div{background:#fff;border:1px solid var(--border);border-radius:16px;padding:12px 14px}.pp-res span{display:block;font-size:11.5px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.4px}.pp-res b{display:block;font-size:20px;margin-top:4px}.pp-res small{display:block;font-size:12px;font-weight:700;color:var(--muted2);margin-top:2px}.pp-res .hl{background:var(--text);color:#fff;border-color:var(--text)}.pp-res .hl span,.pp-res .hl small{color:#C9C9CF}.pp-res .ok b{color:var(--green)}.pp-res .no b{color:var(--red)}.pp-res .wt b{color:#B7791F}'+
  '.pp-preco{display:flex;align-items:center;gap:6px;margin-top:4px}.pp-preco em{font-style:normal;font-size:15px;font-weight:800;color:var(--muted)}.pp-preco input{width:100%;min-width:0;border:0;border-bottom:2px dashed #5A5A60;background:transparent;color:#fff;font:inherit;font-size:22px;font-weight:800;padding:0;outline:none}.pp-preco input::placeholder{color:#8A8A90}.pr .fprod,.pp .fprod{flex:none}.pp-preco input:focus{border-bottom-color:var(--roxo)}'+
  '.pp-card{background:#fff;border:1px solid var(--border);border-radius:18px;padding:14px 16px;margin-bottom:14px}.pp-card h3{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:17px;margin:0 0 4px}.pp-card h3 small{font-size:12.5px;color:var(--muted);font-weight:700}.pp-dica{font-size:13px;color:var(--muted2);font-weight:600;margin:0 0 10px}'+
  '.pp-rend{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:var(--lf-soft);border-radius:14px;padding:10px 14px;margin:8px 0 12px;font-weight:800;font-size:15px}.pp-rend input{width:110px;min-height:46px;border-radius:12px;border:2px solid var(--roxo);background:#fff;font:inherit;font-size:18px;font-weight:800;text-align:center;outline:none}'+
  '.pp-sec{font-size:11.5px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin:12px 2px 4px}'+
  '.pp-ing{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)}.pp-ing:last-child{border-bottom:0}.pp-ing .nm{flex:1;min-width:0}.pp-ing .nm b{display:block;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pp-ing .nm small{font-size:12px;color:var(--muted);font-weight:700}.pp-ing .nm small.sp{color:var(--red)}'+
  '.pp-q{display:flex;align-items:center;gap:4px;border:1.5px solid var(--border2);border-radius:12px;background:#fff;padding:0 8px;height:44px;width:118px;flex:none}.pp-q:focus-within{border-color:var(--roxo)}.pp-q input{width:100%;min-width:0;border:0;outline:none;font:inherit;font-size:16px;font-weight:800;text-align:right;background:transparent}.pp-q em{font-style:normal;font-size:12.5px;font-weight:800;color:var(--muted)}'+
  '.pp-c{width:78px;text-align:right;font-size:13.5px;font-weight:800;flex:none}.pp-rm{width:38px;height:38px;border-radius:10px;border:1px solid var(--border2);background:#fff;color:var(--muted2);cursor:pointer;flex:none;font-size:14px}'+
  '.pp-add{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:52px;margin-top:10px;border-radius:14px;border:2px dashed var(--roxo);background:var(--lf-soft);color:var(--roxo-esc);font:inherit;font-size:15.5px;font-weight:800;cursor:pointer}.pp-add svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2.2}'+
  '.pp-busca{margin-top:10px}.pp-ach{display:flex;flex-direction:column;gap:6px;margin-top:8px}.pp-ach button{display:flex;align-items:center;gap:10px;text-align:left;border:1.5px solid var(--border2);border-radius:14px;background:#fff;padding:8px 12px;font:inherit;cursor:pointer;min-height:56px}.pp-ach button:hover{border-color:var(--roxo)}.pp-ach span{flex:1;min-width:0}.pp-ach b{display:block;font-size:14.5px}.pp-ach small{font-size:12px;color:var(--muted);font-weight:700}'+
  '.pp-tot{margin-top:12px;border-top:2px solid var(--text);padding-top:10px}.pp-tot div{display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:14.5px;font-weight:700;color:var(--muted2)}.pp-tot div b{color:var(--text)}.pp-tot .fim{font-size:16.5px;color:var(--text)}.pp-tot .fim b{font-size:18px}.pp-tot a{color:var(--roxo-esc);font-weight:800;cursor:pointer;font-size:12.5px;margin-left:6px}'+
  '.pp-aviso{display:flex;gap:8px;background:#FEF3C7;color:#5C4300;border-radius:12px;padding:10px 12px;font-size:13px;font-weight:700;margin-top:10px}'+
  '.pp-uso{display:flex;flex-direction:column;gap:6px}.pp-uso button{display:flex;align-items:center;gap:10px;text-align:left;border:1px solid var(--border);border-radius:12px;background:var(--s1);padding:8px 10px;font:inherit;cursor:pointer}.pp-uso span{flex:1;min-width:0}.pp-uso b{display:block;font-size:14px}.pp-uso small{font-size:12px;color:var(--muted);font-weight:700}'+
  '.pp-pac{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pp-pac label{display:flex;flex-direction:column;gap:6px;font-size:12.5px;font-weight:800;color:var(--muted2)}.pp-pac input{min-height:52px;border-radius:14px;border:2px solid var(--border2);font:inherit;font-size:18px;font-weight:800;padding:0 12px;outline:none}.pp-pac input:focus{border-color:var(--roxo)}'+
  '.pp-bar{position:fixed;left:0;right:0;bottom:0;z-index:60;background:#fff;border-top:1px solid var(--border);box-shadow:0 -8px 24px rgba(0,0,0,.08);padding:10px 16px calc(10px + env(safe-area-inset-bottom));transform:translateY(110%);transition:transform .25s}.pp-bar.on{transform:none}.pp-bar>div{max-width:760px;margin:0 auto;display:flex;gap:10px}.pp-bar .btn{min-height:56px;font-size:16px;border-radius:16px;justify-content:center}.pp-bar .btn.pri{flex:1}'+
  '.pp-tipo{display:flex;flex-direction:column;gap:10px}.pp-tipo button{display:flex;align-items:center;gap:14px;text-align:left;min-height:76px;border-radius:16px;border:1.5px solid var(--border2);background:#fff;padding:12px 16px;font:inherit;cursor:pointer}.pp-tipo button.on{border-color:var(--roxo);background:var(--lf-soft)}.pp-tipo em{font-style:normal;font-size:30px}.pp-tipo b{display:block;font-size:16px}.pp-tipo small{font-size:13px;color:var(--muted);font-weight:700}'+
  '@media (max-width:700px){.pp-top h1{font-size:20px}.pp-top .fprod{display:none}.pp-dd{width:48px;height:48px;padding:0;justify-content:center;flex:none}.pp-dd span{display:none}.pp-ing{display:grid;grid-template-columns:minmax(0,1fr) auto auto;column-gap:8px;row-gap:6px}.pp-ing .nm{grid-column:1/-1}.pp-ing .nm b{white-space:normal}.pp-q{width:auto}.pp-c{width:auto;min-width:70px}.pr-hd h1{font-size:21px}.pr-novo{width:100%}.pr-lista{grid-template-columns:minmax(0,1fr)}.pp-res{grid-template-columns:1fr 1fr}.pp-res>div:first-child{grid-column:1/-1}.pp-ing .fprod{display:none}.pp-pac{grid-template-columns:1fr}}';
  document.head.appendChild(c); }

/* ---------- lista ---------- */
var FILTROS=[
  {id:'venda', nome:'Para vender', f:function(p){ return (p.tipo==='acabado'&&p.ativo!==false)||p.tipo==='revenda'; }},
  {id:'g:Pães'},{id:'g:Padaria'},{id:'g:Bolos e tortas'},{id:'g:Cucas e bolos secos'},{id:'g:Pastel'},{id:'g:Lanches e porções'},{id:'g:Bebidas'},
  {id:'bases', nome:'Bases (massas e recheios)', f:function(p){ return p.tipo==='base'; }},
  {id:'ing', nome:'Ingredientes', f:function(p){ return p.tipo==='insumo'&&!p.exemplo; }},
  {id:'tempo', nome:'Tempo e mão de obra', f:function(p){ return p.tipo==='servico'; }},
  {id:'inativos', nome:'Inativos', f:function(p){ return p.tipo==='acabado'&&p.ativo===false; }}
];
FILTROS.forEach(function(x){ if(x.id.indexOf('g:')===0){ var g=x.id.slice(2); x.nome=g; x.f=function(p){ return p.grupo===g&&p.ativo!==false&&(p.tipo==='acabado'||p.tipo==='revenda'); }; } });
function filtro(id){ for(var i=0;i<FILTROS.length;i++) if(FILTROS[i].id===id) return FILTROS[i]; return FILTROS[0]; }

function render(el, arg){
  css();
  if(arg){ var p=LFI.prod(arg); if(p) return pagina(el, p); }
  document.body.classList.add('foco');
  var s=st(), fl=filtro(s.grupo), todos=LFI.db.produtos;
  var h='<div class="pr"><div class="pr-hd"><div><h1>Produtos</h1><small>Tudo o que a casa vende e produz. A receita fica dentro de cada produto.</small></div><button class="btn pri pr-novo" data-act="novo">'+UI.ic('mais')+'Novo produto</button></div>';
  h+='<div class="pr-grp">'+FILTROS.map(function(x){ var n=todos.filter(x.f).length; if(!n&&x.id!=='venda') return ''; var g=x.id.indexOf('g:')===0?LFI.grupoInfo(x.nome).emoji+' ':''; return '<button class="'+(x.id===s.grupo?'on':'')+'" data-act="grp" data-id="'+esc(x.id)+'">'+g+esc(x.nome)+' <i>'+n+'</i></button>'; }).join('')+'</div>';
  h+='<div class="pr-busca">'+UI.ic('busca')+'<input id="pr-q" placeholder="Buscar pelo nome ou código" value="'+esc(s.q)+'" autocomplete="off"></div><div id="pr-ls"></div></div>';
  el.innerHTML=h;
  function cartao(p){ var a=LFI.analiseProduto(p), cm=corMargem(a.margem,a.preco), sub;
    if(p.tipo==='insumo') sub='Pacote '+F.qtd(p.pacote?p.pacote.qtd:(p.conv&&p.conv.fator)||1,p.un)+(p.semPreco?' · sem preço':'');
    else if(p.tipo==='servico') sub='Custo por minuto';
    else sub=esc(p.grupo||'')+(p.cod?' · cód. '+esc(p.cod):'');
    var dir;
    if(p.tipo==='insumo') dir='<b>'+(p.pacote?F.moeda(p.pacote.preco):F.moeda(p.custoMedio))+'</b><small>'+F.moeda(p.custoMedio)+'/'+esc(p.un)+'</small>';
    else if(p.tipo==='servico') dir='<b>'+F.moeda(p.custoMedio)+'</b><small>por minuto</small>';
    else if(p.tipo==='base') dir='<b>'+F.moeda(a.custoUn)+'</b><small>custo/'+esc(p.un)+'</small>';
    else dir='<b>'+(a.preco?F.moeda(a.preco):'<span style="color:var(--red)">Sem preço</span>')+'</b><small>'+(p.un==='un'?'unidade':'por '+esc(p.un))+'</small>'+(a.preco?'<span class="pr-m '+cm+'">lucro '+F.pct(a.margem)+'</span>':'');
    return '<button class="pr-it" data-act="_ir" data-id="produtos/'+p.id+'">'+UI.fotoProd(p,48)+'<span><b>'+esc(p.nome)+'</b><small>'+sub+'</small>'+(a.semPreco.length&&p.tipo!=='insumo'?'<small style="color:var(--red)">⚠ '+a.semPreco.length+' ingrediente(s) sem preço</small>':'')+'</span><span class="pv">'+dir+'</span></button>'; }
  function desenha(){
    var ls=todos.filter(fl.f), q=s.q.trim();
    if(q){ ls=UI.filtrarBusca(q, todos.filter(function(p){ return p.tipo!=='sobra'&&!p.exemplo; }), function(p){ return p.nome+' '+(p.cod||'')+' '+(p.grupo||''); }); }
    else ls=ls.slice().sort(function(a,b){ return a.nome.localeCompare(b.nome); });
    var mostra=ls.slice(0,s.lim);
    el.querySelector('#pr-ls').innerHTML=(mostra.length?'<div class="pr-lista">'+mostra.map(cartao).join('')+'</div>':'<div class="card">'+UI.vazio('Nenhum produto encontrado.','🔎')+'</div>')+(ls.length>mostra.length?'<button class="btn sec pr-mais" data-act="mais">Mostrar mais ('+(ls.length-mostra.length)+')</button>':'');
  }
  desenha();
  el.querySelector('#pr-q').addEventListener('input', function(ev){ s.q=ev.target.value; s.lim=60; desenha(); });
  UI.liga(el, UI.navHandlers({
    grp:function(id){ s.grupo=id; s.q=''; s.lim=60; LFI.recarregar(); },
    mais:function(){ s.lim+=120; desenha(); },
    novo:function(){ novoProduto(); }
  }));
}

/* ---------- página do produto ---------- */
function pagina(el, p){
  document.body.classList.add('foco');
  var r=LFI.receitaDe(p), ed=r?JSON.parse(JSON.stringify({ing:r.ing, rend:r.rend})):null, preco=p.preco||0, mudou=false, buscando=false;
  var pac=p.pacote?{qtd:p.pacote.qtd, preco:p.pacote.preco}:{qtd:(p.conv&&p.conv.fator)||1, preco:r2((p.custoMedio||0)*((p.conv&&p.conv.fator)||1))};
  var custoCompra=p.custoMedio||0;
  function rascunho(){ return r?{ing:ed.ing, rend:ed.rend, id:r.id}:null; }
  function ana(){ var pp=Object.assign({}, p, {preco:preco}); if(p.tipo==='revenda') pp.custoMedio=custoCompra; return LFI.analiseProduto(pp, rascunho()); }
  var tipoTxt={acabado:'Produto feito aqui', base:'Base (massa, recheio, preparo)', revenda:'Revenda (compra pronto)', insumo:'Ingrediente', servico:'Tempo e mão de obra'}[p.tipo]||'Produto';
  var h='<div class="pp"><div class="pp-top"><button class="pp-x" data-act="volta" aria-label="Voltar">'+UI.ic('voltar')+'</button>'+UI.fotoProd(p,56)+'<div><h1>'+esc(p.nome)+'</h1><small>'+tipoTxt+(p.grupo?' · '+esc(p.grupo):'')+(p.cod?' · cód. '+esc(p.cod):'')+(p.ativo===false?' · inativo':'')+'</small></div><button class="btn sec sm pp-dd" data-act="dados" aria-label="Dados do produto">'+UI.ic('editar')+'<span>Dados</span></button></div>';
  h+='<div id="pp-res"></div>';
  if(r){
    h+='<div class="pp-card"><h3>Receita <small id="pp-n"></small></h3><p class="pp-dica">Coloque quanto vai de cada ingrediente na receita inteira. O custo muda na hora.</p>'+
      '<div class="pp-rend">Esta receita rende <input id="pp-rend" inputmode="decimal" value="'+fmtIn(ed.rend)+'"> '+nomeUn(p,true)+'</div>'+
      '<div id="pp-ings"></div><button class="pp-add" data-act="add">'+UI.ic('mais')+'Adicionar ingrediente</button><div id="pp-busca"></div><div class="pp-tot" id="pp-tot"></div></div>';
  }
  if(p.tipo==='insumo'){
    h+='<div class="pp-card"><h3>Preço de compra</h3><p class="pp-dica">Informe o tamanho do pacote e quanto ele custa. O custo de todas as receitas que usam este ingrediente atualiza sozinho.</p>'+
      '<div class="pp-pac"><label>Tamanho do pacote ('+esc(p.un)+')<input id="pp-pq" inputmode="decimal" value="'+fmtIn(pac.qtd)+'"></label><label>Preço do pacote (R$)<input id="pp-pp" inputmode="decimal" value="'+(+pac.preco||0).toFixed(2).replace('.',',')+'"></label></div><div class="pp-tot" id="pp-tot"></div></div>';
  }
  if(p.tipo==='servico'){
    h+='<div class="pp-card"><h3>Custo do tempo</h3><p class="pp-dica">Quanto custa cada hora deste recurso (forno, batedeira, mão de obra). As receitas usam minutos.</p>'+
      '<div class="pp-pac"><label>Custo por hora (R$)<input id="pp-ph" inputmode="decimal" value="'+fmtIn(r2((p.custoMedio||0)*60))+'"></label></div><div class="pp-tot" id="pp-tot"></div></div>';
  }
  if(p.tipo==='revenda'){
    h+='<div class="pp-card"><h3>Custo de compra</h3><div class="pp-pac"><label>Quanto pago por unidade (R$)<input id="pp-cc" inputmode="decimal" value="'+fmtIn(custoCompra)+'"></label></div></div>';
  }
  var usos=LFI.receitasComProduto(p.id).filter(function(x){ return x.real; });
  if(usos.length) h+='<div class="pp-card"><h3>Usado em <small>'+usos.length+(usos.length===1?' receita':' receitas')+'</small></h3><div class="pp-uso">'+usos.slice(0,30).map(function(x){ var q=LFI.prod(x.acabado); return '<button data-act="_ir" data-id="produtos/'+x.acabado+'">'+UI.fotoProd(q,36)+'<span><b>'+esc(x.nome)+'</b><small>'+esc(x.cat)+'</small></span>›</button>'; }).join('')+(usos.length>30?'<small style="color:var(--muted);font-weight:700">e mais '+(usos.length-30)+'…</small>':'')+'</div></div>';
  var tot=LFI.estoqueGeral(p);
  if(p.tipo!=='servico') h+='<div class="pp-card"><h3>Estoque <small>'+F.qtd(tot,p.un)+'</small></h3><p class="pp-dica" style="margin:0">'+LFI.depsVisiveis().map(function(d){ return esc(d.curto)+': '+F.qtd(p.est[d.id]||0,p.un); }).join(' · ')+' <a class="vertodos" data-act="_ir" data-id="estoque/'+p.id+'">Ver no estoque</a></p></div>';
  h+='</div><div class="pp-bar" id="pp-bar"><div><button class="btn sec" data-act="desfaz">Desfazer</button><button class="btn pri" data-act="salva">'+UI.ic('check')+'Salvar alterações</button></div></div>';
  el.innerHTML=h;

  function marca(){ mudou=true; el.querySelector('#pp-bar').classList.add('on'); }
  LFI._antesDeVoltar=function(){ if(!mudou) return true; UI.confirmar('Sair sem salvar?','As alterações deste produto serão perdidas.','Sair sem salvar',function(){ mudou=false; LFI.voltar(true); }); return false; };
  function resumo(){
    var a=ana(), cm=corMargem(a.margem,a.preco), box=el.querySelector('#pp-res'), un=p.un==='un'?'unidade':p.un;
    if(p.tipo==='acabado'||p.tipo==='revenda'){
      box.innerHTML='<div class="pp-res"><div class="hl"><span>Preço de venda'+(p.un!=='un'?' (por '+esc(p.un)+')':'')+'</span><div class="pp-preco"><em>R$</em><input id="pp-preco" inputmode="decimal" value="'+(preco?preco.toFixed(2).replace('.',','):'')+'" placeholder="0,00"></div>'+(p.promo?'<small>Promoção: '+F.moeda(p.promo)+'</small>':'<small>&nbsp;</small>')+'</div>'+
        '<div><span>Custo'+(r?' + despesas':'')+'</span><b id="pp-cf">'+F.moeda(a.custoFinal)+'</b><small>por '+un+'</small></div>'+
        '<div class="'+cm+'"><span>Lucro</span><b id="pp-lu">'+(a.preco?F.pct(a.margem):'—')+'</b><small id="pp-lv">'+(a.preco?F.moeda(a.lucro)+' por '+un:'informe o preço')+'</small></div></div>';
      var pi=box.querySelector('#pp-preco'); pi.addEventListener('input', function(){ preco=numIn(pi.value); marca(); parcial(); });
    } else if(p.tipo==='base'){
      box.innerHTML='<div class="pp-res"><div class="hl"><span>Custo por '+un+'</span><b id="pp-cf">'+F.moeda(a.custoUn)+'</b><small>sem as despesas da casa</small></div><div><span>Usado em</span><b>'+usos.length+'</b><small>receitas</small></div><div><span>Receita inteira</span><b id="pp-ri">'+F.moeda(a.custoReceita)+'</b><small>rende '+F.qtd(ed.rend,p.un)+'</small></div></div>';
    } else box.innerHTML='';
  }
  function parcial(){ var a=ana(), cm=corMargem(a.margem,a.preco), un=p.un==='un'?'unidade':p.un;
    var cf=el.querySelector('#pp-cf'); if(cf) cf.textContent=F.moeda(p.tipo==='base'?a.custoUn:a.custoFinal);
    var lu=el.querySelector('#pp-lu'); if(lu){ lu.textContent=a.preco?F.pct(a.margem):'—'; lu.parentNode.className=cm; el.querySelector('#pp-lv').textContent=a.preco?F.moeda(a.lucro)+' por '+un:'informe o preço'; }
    var ri=el.querySelector('#pp-ri'); if(ri) ri.textContent=F.moeda(a.custoReceita);
    if(r) totais(a);
  }
  function grupoIng(q){ return q.tipo==='servico'?'Tempo de preparo':q.cat==='emb'?'Embalagem e etiqueta':q.tipo==='base'||q.tipo==='acabado'?'Bases e preparos':'Ingredientes'; }
  function ings(){
    var box=el.querySelector('#pp-ings'), ordem=['Ingredientes','Bases e preparos','Embalagem e etiqueta','Tempo de preparo'], grupos={};
    ed.ing.forEach(function(g,i){ var q=LFI.prod(g.prod); if(!q) return; var gn=grupoIng(q); (grupos[gn]=grupos[gn]||[]).push(i); });
    var hh=''; ordem.forEach(function(gn){ if(!grupos[gn]) return; hh+='<div class="pp-sec">'+gn+'</div>'+grupos[gn].map(function(i){ var g=ed.ing[i], q=LFI.prod(g.prod), c=LFI.converte(g.qtd,g.un,q.un)*(q.custoMedio||0), sp=q.semPreco||!(q.custoMedio>0);
      return '<div class="pp-ing" data-i="'+i+'">'+UI.fotoProd(q,36)+'<div class="nm"><b>'+esc(q.nome)+'</b><small'+(sp?' class="sp"':'')+'>'+(sp?'⚠ sem preço cadastrado':F.moeda(q.custoMedio)+'/'+esc(q.un))+'</small></div>'+
        '<label class="pp-q"><input inputmode="decimal" data-q="'+i+'" value="'+fmtIn(g.qtd)+'" placeholder="0"><em>'+esc(UNR[g.un]||g.un)+'</em></label><span class="pp-c" data-c="'+i+'">'+F.moeda(c)+'</span><button class="pp-rm" data-act="rm" data-id="'+i+'" aria-label="Tirar">✕</button></div>'; }).join(''); });
    box.innerHTML=hh||'<p class="pp-dica">Nenhum ingrediente ainda. Toque em "Adicionar ingrediente".</p>';
    el.querySelector('#pp-n').textContent=ed.ing.length+(ed.ing.length===1?' item':' itens');
    UI.els('input[data-q]', box).forEach(function(inp){ inp.addEventListener('input', function(){ var i=+inp.getAttribute('data-q'), g=ed.ing[i], q=LFI.prod(g.prod); g.qtd=numIn(inp.value); box.querySelector('[data-c="'+i+'"]').textContent=F.moeda(LFI.converte(g.qtd,g.un,q.un)*(q.custoMedio||0)); marca(); parcial(); }); });
  }
  function totais(a){ a=a||ana(); var box=el.querySelector('#pp-tot'); if(!box) return; var un=p.un==='un'?'unidade':p.un;
    box.innerHTML='<div><span>Custo da receita inteira</span><b>'+F.moeda(a.custoReceita)+'</b></div><div><span>Custo por '+un+' (÷ '+F.num(ed.rend)+')</span><b>'+F.moeda(a.custoUn)+'</b></div>'+
      (p.tipo==='acabado'?'<div><span>Despesas da casa ('+F.num(a.despPct)+'%)<a data-act="desp">alterar</a></span><b>+ '+F.moeda(a.despV)+'</b></div><div class="fim"><span>Custo final por '+un+'</span><b>'+F.moeda(a.custoFinal)+'</b></div>':'')+
      (a.semPreco.length?'<div class="pp-aviso">⚠ '+a.semPreco.length+' ingrediente(s) sem preço: '+esc(a.semPreco.slice(0,4).join(', '))+(a.semPreco.length>4?'…':'')+'. O custo pode estar menor do que o real.</div>':'')+
      (p.custoExcel&&r&&r.real?'<div style="font-size:12px"><span>Custo por '+un+' na planilha do cliente (sem despesas)</span><b style="color:var(--muted2)">'+F.moeda(p.custoExcel)+'</b></div>':'');
  }
  function tirarPreco(){ var box=el.querySelector('#pp-tot'); if(!box) return; var q=numIn(el.querySelector('#pp-pq').value), v=numIn(el.querySelector('#pp-pp').value);
    box.innerHTML='<div class="fim"><span>Custo por '+esc(p.un)+'</span><b>'+(q>0?F.moeda(v/q):'—')+'</b></div>'+(usos.length?'<div><span>Receitas que mudam de custo</span><b>'+usos.length+'</b></div>':''); }
  function busca(){
    var box=el.querySelector('#pp-busca');
    if(!buscando){ box.innerHTML=''; return; }
    box.innerHTML='<div class="pr-busca pp-busca">'+UI.ic('busca')+'<input id="pp-bq" placeholder="Digite o ingrediente (ex.: farinha)" autocomplete="off"></div><div class="pp-ach" id="pp-ach"></div>';
    var inp=box.querySelector('#pp-bq'), ach=box.querySelector('#pp-ach');
    var base=LFI.db.produtos.filter(function(q){ return q.id!==p.id && (q.tipo==='insumo'||q.tipo==='servico'||q.tipo==='base'||(q.tipo==='acabado'&&q.ativo!==false)) && !q.exemplo; });
    function lista(){ var t=inp.value.trim(); if(!t){ ach.innerHTML='<small style="color:var(--muted);font-weight:700">Comece a digitar o nome.</small>'; return; }
      var rs=UI.filtrarBusca(t, base, function(q){ return q.nome; }).slice(0,8);
      ach.innerHTML=rs.length?rs.map(function(q){ return '<button data-act="pega" data-id="'+q.id+'">'+UI.fotoProd(q,36)+'<span><b>'+esc(q.nome)+'</b><small>'+(q.tipo==='base'?'Base':q.tipo==='acabado'?'Produto feito aqui':q.tipo==='servico'?'Tempo':'Ingrediente')+' · '+F.moeda(q.custoMedio)+'/'+esc(q.un)+'</small></span>'+UI.ic('mais')+'</button>'; }).join(''):'<small style="color:var(--muted);font-weight:700">Nada encontrado. Cadastre o ingrediente em "Novo produto".</small>'; }
    inp.addEventListener('input', lista); lista(); setTimeout(function(){ try{ inp.focus(); }catch(e){} }, 30);
  }
  resumo();
  if(r){ ings(); totais(); busca();
    var ri=el.querySelector('#pp-rend'); ri.addEventListener('input', function(){ ed.rend=numIn(ri.value)||0; marca(); parcial(); }); }
  if(p.tipo==='insumo'){ tirarPreco(); ['#pp-pq','#pp-pp'].forEach(function(s){ el.querySelector(s).addEventListener('input', function(){ marca(); tirarPreco(); }); }); }
  if(p.tipo==='servico'){ var ph=el.querySelector('#pp-ph'); function tp(){ el.querySelector('#pp-tot').innerHTML='<div class="fim"><span>Custo por minuto</span><b>'+F.moeda(numIn(ph.value)/60)+'</b></div>'; } tp(); ph.addEventListener('input', function(){ marca(); tp(); }); }
  if(p.tipo==='revenda'){ var cc=el.querySelector('#pp-cc'); cc.addEventListener('input', function(){ custoCompra=numIn(cc.value); marca(); parcial(); }); }

  function salvar(){
    if(r){ if(!(ed.rend>0)){ UI.toast('Informe quanto a receita rende','','wt'); return; }
      r.ing=ed.ing.filter(function(g){ return g.qtd>0; }); r.rend=ed.rend; if(p.un==='kg') r.pesoFinal=Math.round(ed.rend*1000); }
    if(p.tipo==='acabado'||p.tipo==='revenda'){ p.preco=r2(preco); if(r) r.preco=p.preco; }
    if(p.tipo==='revenda'){ p.custoMedio=r4(custoCompra); p.ultimoCusto=p.custoMedio; }
    if(p.tipo==='insumo'){ var q=numIn(el.querySelector('#pp-pq').value), v=numIn(el.querySelector('#pp-pp').value); if(!(q>0)){ UI.toast('Informe o tamanho do pacote','','wt'); return; }
      p.pacote={qtd:q, preco:v}; p.conv={un:'Pacote '+fmtIn(q)+' '+p.un, fator:q}; var c=r4(v/q); if(c!==p.custoMedio){ p.hist=p.hist||[]; p.hist.push({d:LFI.hoje(), v:c, origem:'Preço atualizado no cadastro'}); } p.custoMedio=c; p.ultimoCusto=c; p.semPreco=!(v>0); }
    if(p.tipo==='servico'){ p.custoMedio=r4(numIn(el.querySelector('#pp-ph').value)/60); p.ultimoCusto=p.custoMedio; }
    LFI.recalcularProduzidos();
    LFI.atividade('produto','Produto atualizado: '+p.nome,{tela:'produtos', id:p.id});
    LFI.salvar(); UI.toast('Alterações salvas', p.nome+(usos.length?' · '+usos.length+' receita(s) recalculada(s)':'')); LFI.recarregar();
  }
  UI.liga(el, UI.navHandlers({
    volta:function(){ if(LFI.podeVoltar()) LFI.voltar(); else LFI.ir('produtos'); },
    add:function(){ buscando=!buscando; busca(); },
    pega:function(id){ var q=LFI.prod(id); ed.ing.push({prod:q.id, qtd:0, un:unRec(q)}); buscando=false; busca(); ings(); marca(); parcial();
      var ultimo=el.querySelector('input[data-q="'+(ed.ing.length-1)+'"]'); if(ultimo){ ultimo.focus(); ultimo.scrollIntoView({block:'center'}); } },
    rm:function(i){ ed.ing.splice(+i,1); ings(); marca(); parcial(); },
    desfaz:function(){ LFI.recarregar(); },
    salva:salvar,
    desp:function(){ var m=UI.modal({titulo:'Despesas da casa', sub:'Aluguel, energia, salários e outros custos fixos', corpo:'<p class="pp-dica">Este percentual é somado ao custo de todos os produtos feitos aqui (na planilha do cliente é 33%).</p><div class="pp-pac"><label>Percentual (%)<input id="dp-v" inputmode="decimal" value="'+fmtIn(desp())+'"></label></div>', botoes:'<button class="btn sec" data-act="_fechar">Cancelar</button><button class="btn pri" data-act="ok">Salvar</button>',
      acoes:{ok:function(){ var v=numIn(m.el.querySelector('#dp-v').value); LFI.db.config.despesas=v; LFI.salvar(); m.fechar(); UI.toast('Despesas da casa: '+F.num(v)+'%','Vale para todos os produtos'); LFI.recarregar(); }}}); },
    dados:function(){ editarDados(p); }
  }));
}

/* ---------- dados do produto (nome, grupo, código, ativo) ---------- */
function editarDados(p){
  var grupos=LFI.GRUPOS.filter(function(g){ return g.nome!=='Inativos'; });
  var m=UI.modal({titulo:'Dados do produto', corpo:'<div class="field"><label>Nome</label><input class="inp" id="dd-n" value="'+esc(p.nome)+'"></div>'+
    (p.tipo==='acabado'||p.tipo==='revenda'||p.tipo==='base'?'<div class="field"><label>Grupo</label><select class="inp" id="dd-g">'+grupos.map(function(g){ return '<option'+(p.grupo===g.nome?' selected':'')+'>'+esc(g.nome)+'</option>'; }).join('')+'</select></div><div class="field"><label>Código</label><input class="inp" id="dd-c" value="'+esc(p.cod||'')+'"></div>':'')+
    (p.tipo==='acabado'?'<label style="display:flex;gap:10px;align-items:center;font-weight:700"><input type="checkbox" id="dd-a"'+(p.ativo!==false?' checked':'')+' style="width:20px;height:20px;accent-color:var(--roxo)"> Produto ativo (aparece para vender)</label>':''),
    botoes:'<button class="btn sec" data-act="_fechar">Cancelar</button><button class="btn pri" data-act="ok">Salvar</button>',
    acoes:{ok:function(){ var n=m.el.querySelector('#dd-n').value.trim(); if(!n){ UI.toast('Informe o nome','','wt'); return; } p.nome=n;
      var g=m.el.querySelector('#dd-g'); if(g){ p.grupo=g.value; var gi=LFI.grupoInfo(p.grupo); p.emoji=gi.emoji; p.dep=gi.dep; }
      var c=m.el.querySelector('#dd-c'); if(c) p.cod=c.value.trim()||null;
      var a=m.el.querySelector('#dd-a'); if(a) p.ativo=a.checked;
      var r=LFI.receitaDe(p); if(r){ r.nome=p.nome; if(p.grupo){ r.cat=p.grupo; r.dep=p.dep; r.foto=p.emoji; } r.ativo=p.ativo!==false; }
      LFI.salvar(); m.fechar(); UI.toast('Dados salvos', p.nome); LFI.recarregar(); }}});
}

/* ---------- novo produto ---------- */
function novoProduto(){
  var tipo='acabado';
  var TIPOS=[['acabado','🥖','Produto que fazemos','Tem receita: pão, bolo, lanche, café…'],['base','🥣','Base','Massa, recheio ou preparo usado em outras receitas'],['revenda','🥤','Revenda','Compramos pronto e vendemos: refrigerante, água…'],['insumo','🌾','Ingrediente','Matéria-prima comprada: farinha, ovos, embalagem…']];
  var m=UI.modal({titulo:'Novo produto', corpo:'<div class="pp-tipo">'+TIPOS.map(function(t){ return '<button class="'+(t[0]===tipo?'on':'')+'" data-act="tp" data-id="'+t[0]+'"><em>'+t[1]+'</em><span><b>'+t[2]+'</b><small>'+t[3]+'</small></span></button>'; }).join('')+'</div>'+
    '<div class="field" style="margin-top:14px"><label>Nome</label><input class="inp" id="np-n" placeholder="Ex.: Pão de batata"></div>'+
    '<div class="field" id="np-gw"><label>Grupo</label><select class="inp" id="np-g">'+LFI.GRUPOS.filter(function(g){ return g.nome!=='Inativos'&&g.nome!=='Bases'; }).map(function(g){ return '<option>'+esc(g.nome)+'</option>'; }).join('')+'</select></div>'+
    '<div class="field" id="np-uw"><label>Vende / usa por</label><select class="inp" id="np-u"><option value="un">Unidade</option><option value="kg">Quilo (kg)</option><option value="L">Litro</option></select></div>',
    botoes:'<button class="btn sec" data-act="_fechar">Cancelar</button><button class="btn pri" data-act="ok">Criar e abrir</button>',
    acoes:{
      tp:function(id){ tipo=id; UI.els('.pp-tipo button', m.el).forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-id')===id); }); m.el.querySelector('#np-gw').style.display=(id==='acabado'||id==='revenda')?'':'none'; },
      ok:function(){
        var n=m.el.querySelector('#np-n').value.trim(); if(!n){ UI.toast('Informe o nome','','wt'); return; }
        var un=m.el.querySelector('#np-u').value, grupo=tipo==='base'?'Bases':tipo==='insumo'?null:m.el.querySelector('#np-g').value, gi=grupo?LFI.grupoInfo(grupo):null;
        var id=LFI.novoId(tipo==='insumo'?'i':tipo==='base'?'b':tipo==='revenda'?'rv':'v');
        var p={id:id, nome:n, un:un, cat:tipo==='insumo'?'mer':tipo==='revenda'?'beb':'aca', tipo:tipo, grupo:grupo, dep:gi?gi.dep:'cen', emoji:gi?gi.emoji:null, ativo:true, preco:0, custoMedio:0, ultimoCusto:0, estMin:0, ncm:'', cest:'', forn:null, fornAlt:[], local:'', validade:null,
          conv:{un:un==='un'?'Unidade':un, fator:1}, est:{cen:0,pad:0,res:0}, apelidos:[n.toUpperCase()], ultMov:LFI.hoje(), contado:null, hist:[], ean:null, end:null};
        if(tipo==='insumo'){ p.pacote={qtd:1, preco:0}; p.semPreco=true; }
        LFI.db.produtos.push(p);
        if(tipo==='acabado'||tipo==='base'){ var r={id:LFI.novoId('rc'), nome:n, dep:p.dep, cat:grupo, foto:p.emoji, cor:'#F6E3C5', rend:1, rendUn:un==='un'?'unidade':un, pesoFinal:un==='kg'?1000:null, perda:0, tempo:0, preco:0, vendaUn:un, acabado:id, ing:[], modo:'', real:true, base:tipo==='base', ativo:true}; LFI.db.receitas.push(r); p.receita=r.id; }
        LFI.atividade('produto','Produto criado: '+n,{tela:'produtos', id:id}); LFI.salvar(); m.fechar(); LFI.ir('produtos', id);
      }}});
}

LFI.registrar('produtos',{titulo:'Produtos', render:render});
})();
