/* LiveFood Intelligence — NÚCLEO: armazenamento, consultas e regras de negócio compartilhadas.
   Toda tela lê e altera os dados SOMENTE por aqui, para que uma ação (ex.: lançar uma nota)
   reflita no estoque, nos custos das receitas, nos indicadores e no contas a pagar. */
(function(){
'use strict';
var LFI = window.LFI;
var U = LFI.dataUtil, r2 = U.r2, r3 = U.r3;
var CHAVE = 'lfi_base_v8', CHAVE_CTX = 'lfi_ctx_v1';

/* ---------- armazenamento ---------- */
function carrega(){
  try{ var s=localStorage.getItem(CHAVE); if(s){ var d=JSON.parse(s); if(d&&d.versao===8) return d; } }catch(e){}
  return null;
}
LFI.db = carrega() || LFI.criarBase();
LFI.salvar = function(){ try{ localStorage.setItem(CHAVE, JSON.stringify(LFI.db)); }catch(e){} LFI.emit('mudou'); };
LFI.restaurar = function(){ LFI.db = LFI.criarBase(); LFI.salvar(); };
LFI.ctx = (function(){ try{ return JSON.parse(localStorage.getItem(CHAVE_CTX)||'null')||{empresa:'todas'}; }catch(e){ return {empresa:'todas'}; } })();
LFI.setEmpresa = function(id){ LFI.ctx.empresa=id; try{ localStorage.setItem(CHAVE_CTX, JSON.stringify(LFI.ctx)); }catch(e){} LFI.emit('empresa'); };

/* eventos */
var ouvintes = {};
LFI.on = function(ev, fn){ (ouvintes[ev]=ouvintes[ev]||[]).push(fn); };
LFI.emit = function(ev, dado){ (ouvintes[ev]||[]).forEach(function(fn){ try{ fn(dado); }catch(e){ console.error(e); } }); };

/* ---------- consultas básicas ---------- */
function acha(lista, id){ for(var i=0;i<lista.length;i++) if(lista[i].id===id) return lista[i]; return null; }
LFI.prod = function(id){ return acha(LFI.db.produtos, id); };
LFI.forn = function(id){ return acha(LFI.db.fornecedores, id); };
LFI.rec = function(id){ return acha(LFI.db.receitas, id); };
LFI.emp = function(id){ return acha(LFI.db.empresas, id); };
LFI.dep = function(id){ return acha(LFI.db.departamentos, id); };
LFI.cat = function(id){ return acha(LFI.db.categorias, id); };
LFI.nota = function(id){ return acha(LFI.db.notas, id); };
LFI.ordem = function(id){ return acha(LFI.db.ordens, id); };
LFI.cotacao = function(id){ return acha(LFI.db.cotacoes, id); };
LFI.op = function(id){ return acha(LFI.db.producao, id); };
LFI.buffet = function(id){ return acha(LFI.db.buffets, id); };
LFI.regra = function(id){ return acha(LFI.db.regrasTrib, id); };
LFI.hoje = function(){ return U.D(0); };
LFI.agoraHM = function(){ var d=new Date(); return (d.getHours()<10?'0':'')+d.getHours()+':'+(d.getMinutes()<10?'0':'')+d.getMinutes(); };
LFI.agoraISO = function(){ return LFI.hoje()+'T'+LFI.agoraHM(); };
LFI.usuario = function(){ return LFI.db.usuario; };

/* ---------- multi-CNPJ ---------- */
/* departamentos visíveis na empresa selecionada no topo */
LFI.depsVisiveis = function(){
  var e=LFI.ctx.empresa; return LFI.db.departamentos.filter(function(d){ return e==='todas'||d.empresa===e; });
};
LFI.depIds = function(){ return LFI.depsVisiveis().map(function(d){ return d.id; }); };
LFI.empresaVisivel = function(empId){ return LFI.ctx.empresa==='todas' || LFI.ctx.empresa===empId; };
LFI.depVisivel = function(depId){ return LFI.depIds().indexOf(depId)>=0; };
LFI.empresaAtual = function(){ return LFI.ctx.empresa==='todas'?null:LFI.emp(LFI.ctx.empresa); };
LFI.empresaDoDep = function(depId){ var d=LFI.dep(depId); return d?LFI.emp(d.empresa):null; };

/* ---------- estoque ---------- */
LFI.estoque = function(p, deps){
  if(typeof p==='string') p=LFI.prod(p); if(!p) return 0;
  deps = deps || LFI.depIds(); var t=0; deps.forEach(function(d){ t+=p.est[d]||0; }); return r3(t);
};
LFI.estoqueGeral = function(p){ return LFI.estoque(p, LFI.db.departamentos.map(function(d){ return d.id; })); };
LFI.valorEstoque = function(p, deps){ if(typeof p==='string') p=LFI.prod(p); return r2(LFI.estoque(p,deps)*(p.custoMedio||0)); };
/* situação considera o estoque total do grupo contra o mínimo cadastrado */
LFI.situacao = function(p){
  if(typeof p==='string') p=LFI.prod(p);
  if(!p.estMin) return 'ok';
  var q=LFI.estoqueGeral(p);
  if(q<=p.estMin*0.4) return 'critico';
  if(q<p.estMin) return 'baixo';
  if(q>p.estMin*4) return 'excesso';
  return 'ok';
};
LFI.diasParaVencer = function(p){ if(!p.validade) return null; return Math.round((new Date(p.validade+'T12:00:00')-new Date(LFI.hoje()+'T12:00:00'))/864e5); };
LFI.diasSemMov = function(p){ return Math.round((new Date(LFI.hoje()+'T12:00:00')-new Date(p.ultMov+'T12:00:00'))/864e5); };

/* alertas de estoque: baixo, crítico, vencimento, sem movimentação, divergência */
LFI.alertas = function(){
  var out=[], deps=LFI.depIds();
  LFI.db.produtos.forEach(function(p){
    if(p.tipo==='sobra'&&LFI.estoqueGeral(p)<=0) return;
    var vis = deps.some(function(d){ return (p.est[d]||0)>0; }) || p.tipo==='insumo';
    if(!vis) return;
    var s=LFI.situacao(p);
    if(s==='critico') out.push({tipo:'critico', nivel:'no', prod:p.id, titulo:p.nome+' em nível crítico', txt:'Estoque '+LFI.fmt.qtd(LFI.estoqueGeral(p),p.un)+' · mínimo '+LFI.fmt.qtd(p.estMin,p.un)});
    else if(s==='baixo') out.push({tipo:'baixo', nivel:'wt', prod:p.id, titulo:p.nome+' abaixo do mínimo', txt:'Estoque '+LFI.fmt.qtd(LFI.estoqueGeral(p),p.un)+' · mínimo '+LFI.fmt.qtd(p.estMin,p.un)});
    var dv=LFI.diasParaVencer(p);
    if(dv!==null && dv<=3 && p.tipo==='insumo' && LFI.estoqueGeral(p)>0) out.push({tipo:'validade', nivel:dv<=1?'no':'wt', prod:p.id, titulo:p.nome+(dv<0?' vencido':dv===0?' vence hoje':' vence em '+dv+(dv===1?' dia':' dias')), txt:LFI.fmt.qtd(LFI.estoqueGeral(p),p.un)+' em estoque · '+p.local});
    if(p.tipo==='insumo' && LFI.diasSemMov(p)>=30) out.push({tipo:'parado', nivel:'nu', prod:p.id, titulo:p.nome+' sem movimentação', txt:LFI.diasSemMov(p)+' dias parado · '+LFI.fmt.moeda(LFI.valorEstoque(p,['cen','pad','res','sus']))+' imobilizado'});
    if(p.contado){ var sis=p.est[p.contado.dep]||0, dif=r3(p.contado.qtd-sis); if(Math.abs(dif)>0.001) out.push({tipo:'divergencia', nivel:'in', prod:p.id, titulo:'Divergência em '+p.nome, txt:'Sistema '+LFI.fmt.qtd(sis,p.un)+' · contado '+LFI.fmt.qtd(p.contado.qtd,p.un)+' ('+(dif>0?'+':'')+LFI.fmt.qtd(dif,p.un)+')'}); }
  });
  var ordem={no:0,wt:1,in:2,nu:3}; out.sort(function(a,b){ return ordem[a.nivel]-ordem[b.nivel]; });
  return out;
};

/* registra movimento e atualiza saldo; entradas recalculam o custo médio ponderado */
LFI.movimentar = function(o){
  var p=LFI.prod(o.prod); if(!p) return null;
  var antes=p.est[o.dep]||0, custoAnt=p.custoMedio;
  if(o.qtd>0 && o.custo!=null && (o.tipo==='entrada')){
    var totAntes=LFI.estoqueGeral(p);
    var base=Math.max(0,totAntes);
    p.custoMedio = r2(base+o.qtd>0 ? (base*p.custoMedio + o.qtd*o.custo)/(base+o.qtd) : o.custo);
    p.ultimoCusto = r2(o.custo);
    p.hist.push({d:LFI.hoje(), v:p.custoMedio, origem:o.obs||'Entrada'});
  }
  p.est[o.dep]=r3(antes+o.qtd);
  p.ultMov=LFI.hoje();
  var m={id:'m'+(LFI.db.seq.mov++), d:o.d||LFI.agoraISO(), prod:o.prod, dep:o.dep, tipo:o.tipo, qtd:r3(o.qtd), custo:o.custo!=null?o.custo:p.custoMedio, origem:o.origem||null, usuario:o.usuario||LFI.usuario().nome, obs:o.obs||''};
  LFI.db.movs.unshift(m);
  return {mov:m, custoAnt:custoAnt, custoNovo:p.custoMedio};
};

/* ---------- receitas e custos ---------- */
/* custo do produto numa data (usa o histórico) */
LFI.custoEm = function(p, data){
  if(typeof p==='string') p=LFI.prod(p); if(!data) return p.custoMedio;
  var v=null; p.hist.forEach(function(h){ if(h.d<=data) v=h.v; }); return v==null?(p.hist[0]?p.hist[0].v:p.custoMedio):v;
};
LFI.custoReceita = function(r, data){
  if(typeof r==='string') r=LFI.rec(r);
  var itens=r.ing.map(function(g){
    var p=LFI.prod(g.prod), qb=LFI.converte(g.qtd,g.un,p.un), cu=LFI.custoEm(p,data);
    return {prod:p, qtd:g.qtd, un:g.un, qtdBase:qb, custoUn:cu, custo:r2(qb*cu)};
  });
  var bruto=0; itens.forEach(function(i){ bruto+=i.custo; });
  var perdaV = r2(bruto*(r.perda||0)/100);
  var total=r2(bruto+perdaV);
  var porcao=r2(total/(r.rend||1));
  var porKg = r.pesoFinal? r2(total/(r.pesoFinal/1000)) : null;
  itens.forEach(function(i){ i.part = bruto? i.custo/bruto : 0; });
  return {itens:itens, bruto:r2(bruto), perdaV:perdaV, total:total, porcao:porcao, porKg:porKg};
};
LFI.markupDe = function(r){ var m=LFI.db.markup[r.dep]; if(!m) return 3; return (m.cats&&m.cats[r.cat])||m.padrao; };
LFI.impVendaDe = function(r){ var e=LFI.empresaDoDep(r.dep); return e?e.impVenda:8; };
LFI.precificar = function(r, opts){
  if(typeof r==='string') r=LFI.rec(r); opts=opts||{};
  var c=LFI.custoReceita(r), mk=opts.markup||LFI.markupDe(r), imp=LFI.impVendaDe(r);
  var custoUn = r.buffet && !r.preco ? c.porKg : c.porcao;
  var preco = opts.preco!=null ? opts.preco : (r.preco || r2(custoUn*mk));
  var sugerido = r2(custoUn*mk);
  var impV = r2(preco*imp/100);
  var mc = r2(preco-custoUn-impV);
  return {custo:custoUn, markup:mk, sugerido:sugerido, preco:preco, impPct:imp, impV:impV, mc:mc, mcPct:preco?mc/preco:0, cmvPct:preco?custoUn/preco:0, markupReal:custoUn?preco/custoUn:0};
};
LFI.receitasComProduto = function(prodId){ return LFI.db.receitas.filter(function(r){ return r.ing.some(function(g){ return g.prod===prodId; }); }); };

/* ---------- correspondência de produtos (nota fiscal / lista) ---------- */
function norm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); }
var PARADAS = {de:1,da:1,do:1,c:1,s:1,com:1,sem:1,para:1,p:1,tipo:1,kg:1,g:1,l:1,ml:1,un:1,cx:1,pct:1,pc:1,fd:1,sc:1,bd:1,gl:1,balde:1,galao:1,pacote:1,saco:1,fardo:1,caixa:1,lata:1,t1:1,extra:1,especial:1,refinado:1,nacional:1,a:1,o:1,e:1,em:1};
function tokens(s){ return norm(s).split(' ').filter(function(t){ return t && !PARADAS[t] && !/^\d+([,.]\d+)?(kg|g|l|ml|un|x\d+)?$/.test(t) && t.length>1; }); }
var SIN = {mussarela:'mucarela', muzarela:'mucarela', acucar:'acucar', oleo:'oleo', far:'farinha', trigo:'trigo', refrig:'refrigerante', biol:'biologico', file:'file', japones:'japones', salmao:'salmao', fresco:'fresco', frango:'frango', queijo:'queijo', nori:'nori', yaki:'nori'};
function canon(t){ return SIN[t]||t; }
function simTok(a,b){ if(a===b) return 1; if(a.length>=4&&b.length>=4&&(a.indexOf(b)===0||b.indexOf(a)===0)) return 0.85; return 0; }
LFI.similaridade = function(a, b){
  var ta=tokens(a).map(canon), tb=tokens(b).map(canon); if(!ta.length||!tb.length) return 0;
  var s=0; tb.forEach(function(x){ var m=0; ta.forEach(function(y){ m=Math.max(m,simTok(x,y)); }); s+=m; });
  var cobB=s/tb.length;
  var s2=0; ta.forEach(function(x){ var m=0; tb.forEach(function(y){ m=Math.max(m,simTok(x,y)); }); s2+=m; });
  var cobA=s2/ta.length;
  return cobB*0.7+cobA*0.3;
};
/* devolve os produtos mais parecidos com o texto, com nota de 0 a 100 */
LFI.sugerirProduto = function(texto, limite){
  var n=norm(texto), lista=[];
  LFI.db.produtos.forEach(function(p){
    if(p.tipo!=='insumo') return;
    var sc=LFI.similaridade(texto, p.nome);
    (p.apelidos||[]).forEach(function(a){ if(norm(a)===n) sc=Math.max(sc,1.0); else sc=Math.max(sc, LFI.similaridade(texto,a)*0.97); });
    if(sc>0.05) lista.push({prod:p, score:Math.round(Math.min(1,sc)*100)});
  });
  lista.sort(function(a,b){ return b.score-a.score; });
  return lista.slice(0, limite||5);
};
/* fator de conversão sugerido: tenta ler "25KG", "5L", "3,6KG" e "50 FOLHAS" na descrição */
LFI.sugerirFator = function(desc, unNF, p){
  var u=String(unNF||'').toUpperCase(), d=String(desc||'').toUpperCase();
  if(p && (u===p.un.toUpperCase() || (u==='KG'&&p.un==='kg') || (u==='LT'&&p.un==='L') || (u==='UN'&&p.un==='un'))) return 1;
  if(p && p.un==='un'){ var mu=d.match(/(?:FD|CX|C\/|PCT|PC)\s*(\d+)/)||d.match(/(\d+)\s*(FOLHAS|UN|UNID|LATAS|PARES)/); if(mu) return parseInt(mu[1],10); return p.conv?p.conv.fator:1; }
  var m=d.match(/(\d+(?:[,.]\d+)?)\s*(KG|L|LT|G|ML)\b/);
  if(m){ var v=parseFloat(m[1].replace(',','.')); if(m[2]==='G') v/=1000; if(m[2]==='ML') v/=1000; return r3(v); }
  m=d.match(/(\d+)\s*(FOLHAS|UN|UNID|LATAS)/); if(m) return parseInt(m[1],10);
  return p&&p.conv?p.conv.fator:1;
};

/* lê uma lista em texto livre: "20 kg de salmão", "15kg cream cheese", "shoyu 10 litros" */
LFI.lerLista = function(texto){
  var out=[];
  String(texto||'').split(/\n|;/).forEach(function(l){
    var raw=l.replace(/^[\s\-•*·]+/,'').replace(/^\d+[\.\)]\s+/,'').trim(); if(!raw) return;
    var m=raw.match(/(\d+(?:[,.]\d+)?)\s*(kg|quilos?|kilos?|g|gramas?|l|lt|litros?|ml|un|unid(?:ades)?|cx|caixas?|pct|pacotes?|dz|duzias?|d[uú]zias?|sacos?|fardos?|gal[oõ]es?|folhas?)?\b/i);
    var qtd=1, un='', nome=raw;
    if(m){ qtd=parseFloat(m[1].replace(',','.')); un=(m[2]||'').toLowerCase(); nome=(raw.slice(0,m.index)+' '+raw.slice(m.index+m[0].length)).replace(/\bde\b/i,' ').trim(); }
    var sug=LFI.sugerirProduto(nome,3), p=sug[0]&&sug[0].score>=45?sug[0].prod:null;
    var unN = /^(kg|quilo|kilo)/.test(un)?'kg': /^g/.test(un)?'g' : /^(l|lt|litro)/.test(un)?'L' : /^ml/.test(un)?'ml' : /^(dz|d[uú]zia)/.test(un)?'dz' : un?un:'';
    var q=qtd;
    if(p){ if(unN==='g'&&p.un==='kg') q=qtd/1000; else if(unN==='ml'&&p.un==='L') q=qtd/1000; else if(unN==='dz'&&p.un==='un') q=qtd*12; }
    out.push({texto:raw, nome:nome, qtd:r3(q), unLida:unN||'', prod:p?p.id:null, score:sug[0]?sug[0].score:0, alternativas:sug.map(function(s){ return s.prod.id; })});
  });
  return out;
};

/* ---------- tributos ---------- */
/* regra aplicável ao produto: Produto > NCM > Categoria (a mais específica vence) */
LFI.regraDoProduto = function(p, ctx){
  if(typeof p==='string') p=LFI.prod(p); ctx=ctx||{};
  var emp = ctx.empresa ? (typeof ctx.empresa==='string'?LFI.emp(ctx.empresa):ctx.empresa) : null;
  /* condições da regra: regime da empresa, UF de origem e tipo de operação (quando informados) */
  function serve(r){
    if(emp && r.regime && r.regime!=='Todos' && r.regime!==emp.regime) return false;
    if(ctx.ufOrig && r.ufOrig && r.ufOrig!==ctx.ufOrig) return false;
    if(ctx.operacao && r.operacao && r.operacao!==ctx.operacao) return false;
    return true;
  }
  var rs=LFI.db.regrasTrib.filter(serve), i;
  for(i=0;i<rs.length;i++) if(rs[i].escopo==='Produto'&&rs[i].alvo===p.id) return rs[i];
  for(i=0;i<rs.length;i++) if(rs[i].escopo==='NCM'&&rs[i].alvo===p.ncm) return rs[i];
  for(i=0;i<rs.length;i++) if(rs[i].escopo==='Categoria'&&rs[i].alvo===p.cat) return rs[i];
  return null;
};
/* carga estimada (% sobre o valor de compra). null = sem regra validada */
LFI.cargaEstimada = function(p, ctx){
  var r=LFI.regraDoProduto(p, ctx); if(!r||r.status!=='validada'||r.icms==null) return {regra:r, pct:null, emRevisao:!!(r&&r.status==='em_revisao')};
  var pct=(r.icms||0)+(r.pis||0)+(r.cofins||0)+(r.ipi||0);
  return {regra:r, pct:pct, icms:r.icms||0, pis:r.pis||0, cofins:r.cofins||0, ipi:r.ipi||0, st:!!r.st};
};
/* impostos destacados nas notas lançadas, por produto */
LFI.impostosDestacados = function(filtro){
  var out={}; LFI.db.notas.forEach(function(n){ if(n.status!=='lancada') return; if(!LFI.empresaVisivel(n.empresa)) return;
    n.itens.forEach(function(it){ if(filtro&&!filtro(it,n)) return; var k=it.prod||'?', o=out[k]=out[k]||{vProd:0,icms:0,ipi:0,pis:0,cofins:0,st:0,cred:0};
      o.vProd+=it.vProd; o.icms+=it.icms.v; o.ipi+=it.ipi.v; o.pis+=it.pis.v; o.cofins+=it.cofins.v; o.st+=it.st.v;
      o.cred+=LFI.creditoItem(it,n).v;
    }); });
  return out;
};

/* crédito potencial de um item de nota: regra validada e creditável; PIS/COFINS só no regime não cumulativo */
LFI.creditoItem = function(it, n){
  if(!it.prod) return {v:0, regra:null};
  var emp=LFI.emp(n.empresa), f=LFI.forn(n.forn), p=LFI.prod(it.prod), rg=p?LFI.regraDoProduto(p,{empresa:emp, ufOrig:f&&f.uf}):null;
  if(rg&&rg.creditavel&&rg.status==='validada') return {v:r2(it.icms.v + (emp&&emp.pisCofins==='nao_cumulativo'?(it.pis.v+it.cofins.v):0)), regra:rg};
  return {v:0, regra:rg};
};

/* ---------- fluxo: lançar nota fiscal ---------- */
/* aplica a nota conferida: estoque, custo médio, último custo, receitas, contas a pagar, OC */
LFI.lancarNota = function(nfId){
  var n=LFI.nota(nfId), db=LFI.db; if(!n||n.status==='lancada') return null;
  var recsAntes={}; db.receitas.forEach(function(r){ recsAntes[r.id]=LFI.custoReceita(r).porcao; });
  var precoAntes={}; db.receitas.forEach(function(r){ precoAntes[r.id]=LFI.precificar(r).sugerido; });
  var resumo={nota:n, itens:[], receitas:[], cp:null, oc:null};
  n.itens.forEach(function(it){
    if(!it.prod||it.revisao) return;
    var q=r3(it.qtd*it.fator), cu=r2((it.vProd + (it.ipi.v||0) + (it.st.v||0))/q);
    var p=LFI.prod(it.prod), ultimoAnt=p.ultimoCusto;
    var res=LFI.movimentar({prod:it.prod, dep:n.dep, tipo:'entrada', qtd:q, custo:cu, origem:{tipo:'nf', id:n.id}, obs:'NF '+n.numero, usuario:LFI.usuario().nome});
    /* validade, código de barras e endereço informados na conferência */
    if(it.validade){ var estAnt=r3(LFI.estoqueGeral(p)-q); p.validade = (p.validade&&estAnt>0&&p.validade<it.validade) ? p.validade : it.validade; }
    if(it.ean && (!p.ean || it.eanAtualizar)) p.ean=it.ean;
    if(it.rua && it.pos) p.end={rua:String(it.rua).toUpperCase(), pos:String(it.pos).padStart(2,'0')};
    /* aprende o apelido da nota para a próxima vez */
    if((p.apelidos||[]).indexOf(it.desc)<0) p.apelidos.push(it.desc);
    resumo.itens.push({prod:p, qtd:q, custoUn:cu, custoAnt:res.custoAnt, custoNovo:res.custoNovo, ultimoAnt:ultimoAnt});
  });
  n.status='lancada'; n.entrada=LFI.hoje(); n.pendencias=n.itens.filter(function(i){ return i.revisao; }).length; n.lancadaPor=LFI.usuario().nome; n.lancadaEm=LFI.agoraISO();
  db.receitas.forEach(function(r){ var novo=LFI.custoReceita(r).porcao; if(Math.abs(novo-recsAntes[r.id])>=0.005) resumo.receitas.push({rec:r, antes:recsAntes[r.id], depois:novo, precoAntes:precoAntes[r.id], precoDepois:LFI.precificar(r).sugerido}); });
  resumo.receitas.sort(function(a,b){ return Math.abs(b.depois/b.antes-1)-Math.abs(a.depois/a.antes-1); });
  /* contas a pagar */
  var f=LFI.forn(n.forn), dias=parseInt((f.cond.match(/\d+/)||['28'])[0],10); var venc=new Date(n.emissao+'T12:00:00'); venc.setDate(venc.getDate()+dias);
  var cp={id:'cp_'+n.id, forn:n.forn, empresa:n.empresa, nf:n.id, descricao:'NF '+n.numero, emissao:n.emissao, venc:U.iso(venc), valor:n.valor, status:'aberto', categoria:'Compra de mercadorias', criadoEm:LFI.agoraISO()};
  db.contasPagar.unshift(cp); n.cp=cp.id; resumo.cp=cp;
  /* ordem de compra vinculada */
  if(n.oc){ var oc=LFI.ordem(n.oc); if(oc){ resumo.oc=oc; if(oc.nfs.indexOf(n.id)<0) oc.nfs.push(n.id);
    n.itens.forEach(function(it){ oc.itens.forEach(function(x){ if(x.prod===it.prod) x.recebido=r3(Math.min(x.qtd, x.recebido + it.qtd*it.fator)); }); });
    var completo=oc.itens.every(function(x){ return x.recebido>=x.qtd-0.001; });
    var st=completo?'recebida':'parcial'; if(oc.status!==st){ oc.status=st; oc.hist.push({d:LFI.agoraISO(), s:st, u:LFI.usuario().nome}); }
  } }
  LFI.atividade('nf','NF '+n.numero+' lançada ('+f.nome+') · '+LFI.fmt.moeda(n.valor),{tela:'notas',id:n.id});
  LFI.salvar();
  return resumo;
};

/* ---------- atividade e numeração ---------- */
LFI.atividade = function(tipo, txt, ref){ LFI.db.atividades.unshift({d:LFI.agoraISO(), tipo:tipo, txt:txt, ref:ref||null}); if(LFI.db.atividades.length>60) LFI.db.atividades.length=60; };
LFI.proximo = function(tipo){
  var s=LFI.db.seq, ano=new Date().getFullYear();
  if(tipo==='oc'){ s.oc++; return 'OC-'+ano+'-'+String(s.oc).padStart(4,'0'); }
  if(tipo==='cot'){ s.cot++; return 'COT-'+ano+'-'+String(s.cot).padStart(3,'0'); }
  if(tipo==='op'){ s.op++; return 'OP-'+ano+'-'+String(s.op).padStart(4,'0'); }
  if(tipo==='bf'){ s.bf++; return 'BF-'+ano+'-'+String(s.bf).padStart(3,'0'); }
  if(tipo==='nf'){ s.nf++; return String(200000+s.nf*137).replace(/(\d{3})(\d{3})$/,'000.$1.$2'); }
  s[tipo]=(s[tipo]||0)+1; return tipo.toUpperCase()+'-'+s[tipo];
};
LFI.novoId = function(p){ return p+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36); };

/* ---------- faturamento e indicadores ---------- */
/* período: {de, ate} em ISO; deps: lista de departamentos */
LFI.periodo = function(chave, de, ate){
  var h=LFI.hoje(), D=U.D;
  if(chave==='hoje') return {de:h, ate:h, nome:'Hoje'};
  if(chave==='ontem') return {de:D(-1), ate:D(-1), nome:'Ontem'};
  if(chave==='7d') return {de:D(-6), ate:h, nome:'Últimos 7 dias'};
  if(chave==='30d') return {de:D(-29), ate:h, nome:'Últimos 30 dias'};
  if(chave==='mes'){ var d=U.hojeD(); return {de:U.iso(new Date(d.getFullYear(),d.getMonth(),1,12)), ate:h, nome:'Mês atual'}; }
  if(chave==='custom') return {de:de||D(-29), ate:ate||h, nome:'Personalizado'};
  return {de:D(-29), ate:h, nome:'Últimos 30 dias'};
};
LFI.periodoAnterior = function(p){
  var a=new Date(p.de+'T12:00:00'), b=new Date(p.ate+'T12:00:00'), n=Math.round((b-a)/864e5)+1;
  var a2=new Date(a); a2.setDate(a2.getDate()-n); var b2=new Date(a); b2.setDate(b2.getDate()-1);
  return {de:U.iso(a2), ate:U.iso(b2)};
};
LFI.vendas = function(p, deps){ deps=deps||LFI.depIds(); return LFI.db.vendas.filter(function(v){ return v.d>=p.de&&v.d<=p.ate&&deps.indexOf(v.dep)>=0; }); };
LFI.faturamento = function(p, deps){ var t=0; LFI.vendas(p,deps).forEach(function(v){ t+=v.valor; }); return r2(t); };
/* custo estimado das vendas (CMV) usando a ficha técnica de cada produto do mix */
LFI.cmvPct = function(dep){
  var c=0, s=0; LFI.db.mixVendas.forEach(function(m){ if(dep&&m.dep!==dep) return; var custo = m.rec? LFI.custoReceita(m.rec).porcao : (m.prod?LFI.prod(m.prod).custoMedio:m.custo); if(m.rec&&LFI.rec(m.rec).buffet&&!LFI.rec(m.rec).preco) custo=LFI.custoReceita(m.rec).porKg; c+=m.part*(custo/m.preco); s+=m.part; });
  return s? c/s : 0.33;
};

/* ---------- formatação ---------- */
var nf2 = new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2});
LFI.fmt = {
  moeda:function(v){ if(v==null||isNaN(v)) return '—'; return 'R$ '+nf2.format(v); },
  moedaK:function(v){ if(v==null) return '—'; if(Math.abs(v)>=1e6) return 'R$ '+(v/1e6).toLocaleString('pt-BR',{maximumFractionDigits:2})+' mi'; if(Math.abs(v)>=1e4) return 'R$ '+(v/1e3).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mil'; return 'R$ '+nf2.format(v); },
  num:function(v,c){ if(v==null||isNaN(v)) return '—'; return Number(v).toLocaleString('pt-BR',{minimumFractionDigits:c||0, maximumFractionDigits:c==null?3:c}); },
  pct:function(v,c){ if(v==null||isNaN(v)) return '—'; return (v*100).toLocaleString('pt-BR',{minimumFractionDigits:c==null?1:c, maximumFractionDigits:c==null?1:c})+'%'; },
  pctN:function(v,c){ if(v==null||isNaN(v)) return '—'; return Number(v).toLocaleString('pt-BR',{minimumFractionDigits:c==null?2:c, maximumFractionDigits:c==null?2:c})+'%'; },
  qtd:function(v,un){ if(v==null||isNaN(v)) return '—'; var c = (un==='un')?0:(Math.abs(v)<10?2:1); if(un==='un'&&v%1) c=1; return Number(v).toLocaleString('pt-BR',{minimumFractionDigits:0, maximumFractionDigits:c})+' '+(un||''); },
  data:function(s){ if(!s) return '—'; var p=String(s).slice(0,10).split('-'); return p[2]+'/'+p[1]+'/'+p[0]; },
  dataC:function(s){ if(!s) return '—'; var p=String(s).slice(0,10).split('-'); return p[2]+'/'+p[1]; },
  dataHora:function(s){ if(!s) return '—'; var t=String(s); return LFI.fmt.data(t)+(t.length>10?' '+t.slice(11,16):''); },
  hora:function(s){ return s?String(s).slice(11,16):'—'; },
  relativo:function(s){ if(!s) return '—'; var d=String(s).slice(0,10), h=LFI.hoje(); var n=Math.round((new Date(h+'T12:00:00')-new Date(d+'T12:00:00'))/864e5); var hr=String(s).length>10?' às '+String(s).slice(11,16):''; if(n===0) return 'Hoje'+hr; if(n===1) return 'Ontem'+hr; if(n===-1) return 'Amanhã'+hr; if(n>1&&n<7) return 'Há '+n+' dias'; if(n<-1&&n>-7) return 'Em '+(-n)+' dias'; return LFI.fmt.data(d); },
  diaSemana:function(s){ return ['dom','seg','ter','qua','qui','sex','sáb'][new Date(s+'T12:00:00').getDay()]; }
};

/* ---------- rótulos de status ---------- */
LFI.STATUS = {
  cot:{preparacao:['Em preparação','nu'], aguardando_envio:['Aguardando envio','wt'], enviada:['Enviada aos fornecedores','in'], aguardando_propostas:['Aguardando propostas','wt'], propostas_recebidas:['Propostas recebidas','lf'], comparacao:['Em comparação','lf'], aprovada:['Aprovada','ok'], convertida:['Convertida em OC','dk'], cancelada:['Cancelada','no']},
  oc:{aguardando_aprovacao:['Aguardando entrega','lf'], aprovada:['Aguardando entrega','lf'], enviada:['Aguardando entrega','lf'], aguardando_entrega:['Aguardando entrega','lf'], parcial:['Entrega parcial','wt'], recebida:['Recebido','ok'], cancelada:['Cancelado','no']},
  nf:{recebida:['Aguardando conferência','wt'], conferencia:['Em conferência','lf'], lancada:['Lançada','ok'], cancelada:['Cancelada','no']},
  op:{planejada:['Planejada','nu'], producao:['Em produção','lf'], concluida:['Concluída','ok'], cancelada:['Cancelada','no']},
  bf:{aberto:['Em operação','lf'], encerramento:['Em encerramento','wt'], encerrado:['Encerrado','ok']},
  cp:{aberto:['Em aberto','wt'], pago:['Pago','ok'], vencido:['Vencido','no']},
  trib:{validada:['Validada','ok'], pendente:['Pendente de validação','no'], em_revisao:['Em revisão','wt']}
};
LFI.COT_FLUXO = ['preparacao','aguardando_envio','enviada','aguardando_propostas','propostas_recebidas','comparacao','aprovada','convertida'];
LFI.OC_FLUXO = ['aguardando_aprovacao','aprovada','enviada','aguardando_entrega','parcial','recebida'];
LFI.TIPOS_MOV = {entrada:['Entrada (NF)','ok'], saida:['Saída','nu'], transferencia:['Transferência','in'], producao:['Produção','lf'], consumo:['Consumo','nu'], venda:['Venda','nu'], perda:['Perda','no'], descarte:['Descarte','no'], ajuste:['Ajuste','wt'], sobra:['Sobra de buffet','in']};
})();

/* ---------- perdas, compras e contas (usados pela Visão Geral e pelos relatórios) ---------- */
(function(){
var LFI=window.LFI, r2=LFI.dataUtil.r2;
/* custo por kg de um item de buffet (a partir da ficha técnica) */
LFI.custoKgBuffet = function(recId){ var c=LFI.custoReceita(recId); return c.porKg||0; };
/* resumo de um buffet: consumo, sobras por destino e valores */
LFI.resumoBuffet = function(b){
  if(typeof b==='string') b=LFI.buffet(b);
  var o={ini:0, repos:0, disp:0, final:0, consumo:0, reaproveitado:0, descarte:0, perda:0, vConsumo:0, vReap:0, vDesc:0, vPerda:0, itens:[]};
  b.itens.forEach(function(it){
    var rep=0; (it.repos||[]).forEach(function(r){ rep+=r.kg; });
    var disp=it.pesoIni+rep, fim=it.pesoFinal==null?null:it.pesoFinal, ck=LFI.custoKgBuffet(it.rec);
    var cons = fim==null ? null : r2(disp-fim);
    o.ini+=it.pesoIni; o.repos+=rep; o.disp+=disp;
    if(fim!=null){ o.final+=fim; o.consumo+=cons; o.vConsumo+=cons*ck;
      if(it.destino==='reaproveitar'){ o.reaproveitado+=fim; o.vReap+=fim*ck; } else if(it.destino==='perda'){ o.perda+=fim; o.vPerda+=fim*ck; } else if(it.destino==='descarte'){ o.descarte+=fim; o.vDesc+=fim*ck; } }
    o.itens.push({it:it, rec:LFI.rec(it.rec), disp:r2(disp), rep:r2(rep), cons:cons, custoKg:ck});
  });
  ['ini','repos','disp','final','consumo','reaproveitado','descarte','perda','vConsumo','vReap','vDesc','vPerda'].forEach(function(k){ o[k]=r2(o[k]); });
  o.aproveitamento = o.disp? o.consumo/o.disp : 0;
  o.perdaPct = o.disp? (o.descarte+o.perda)/o.disp : 0;
  return o;
};
LFI.perdasBuffet = function(p){ var kg=0, v=0, n=0; LFI.db.buffets.forEach(function(b){ if(b.status!=='encerrado'||b.data<p.de||b.data>p.ate||!LFI.empresaVisivel(b.empresa)) return; var r=LFI.resumoBuffet(b); kg+=r.descarte+r.perda; v+=r.vDesc+r.vPerda; n++; }); return {kg:r2(kg), valor:r2(v), buffets:n}; };
/* perdas registradas no estoque (tipo perda/descarte) + perda técnica das ordens de produção concluídas */
LFI.perdasProducao = function(p, deps){ deps=deps||LFI.depIds(); var mov=0, tec=0;
  LFI.db.movs.forEach(function(m){ var d=m.d.slice(0,10); if(d<p.de||d>p.ate||deps.indexOf(m.dep)<0) return; if((m.tipo==='perda'||m.tipo==='descarte')&&LFI.prod(m.prod)) mov+=Math.abs(m.qtd)*(m.custo||0); });
  LFI.db.producao.forEach(function(op){ if(op.status!=='concluida'||op.data<p.de||op.data>p.ate||deps.indexOf(op.dep)<0) return; var r=LFI.rec(op.rec), c=LFI.custoReceita(r); tec+=c.perdaV*(op.qtd/r.rend); });
  return {estoque:r2(mov), tecnica:r2(tec), total:r2(mov+tec)}; };
LFI.comprasPeriodo = function(p){ var t=0, n=0, porForn={}; LFI.db.notas.forEach(function(x){ if(x.status!=='lancada'||!LFI.empresaVisivel(x.empresa)) return; var d=x.entrada||x.emissao; if(d<p.de||d>p.ate) return; t+=x.valor; n++; porForn[x.forn]=(porForn[x.forn]||0)+x.valor; }); return {total:r2(t), notas:n, porForn:porForn}; };
LFI.contasAbertas = function(dias){ var lim=LFI.dataUtil.D(dias==null?3650:dias), t=0, n=0, venc=0; LFI.db.contasPagar.forEach(function(c){ if(c.status==='pago'||!LFI.empresaVisivel(c.empresa)) return; if(c.venc<=lim){ t+=c.valor; n++; } if(c.venc<LFI.hoje()) venc++; }); return {total:r2(t), qtd:n, vencidas:venc}; };
LFI.valorEstoqueTotal = function(deps){ var t=0; LFI.db.produtos.forEach(function(p){ t+=LFI.valorEstoque(p,deps); }); return r2(t); };
/* produtos vendidos no período: receita, quantidade e margem (a partir do mix e das fichas técnicas) */
LFI.produtosVendidos = function(p, deps){ deps=deps||LFI.depIds(); var out=[];
  deps.forEach(function(d){ var fat=LFI.faturamento(p,[d]); if(!fat) return; var emp=LFI.empresaDoDep(d);
    LFI.db.mixVendas.forEach(function(m){ if(m.dep!==d) return; var receita=fat*m.part, custo;
      if(m.rec){ var r=LFI.rec(m.rec); custo = (r.buffet&&!r.preco)?LFI.custoReceita(r).porKg:LFI.custoReceita(r).porcao; } else custo = m.prod?LFI.prod(m.prod).custoMedio:m.custo;
      var qtd=receita/m.preco, mc=receita - qtd*custo - receita*(emp?emp.impVenda:8)/100;
      out.push({nome:m.nome, dep:d, rec:m.rec, receita:r2(receita), qtd:Math.round(qtd), preco:m.preco, custo:r2(custo), mc:r2(mc), mcPct:receita?mc/receita:0}); }); });
  return out; };
})();

/* ---------- integrações entre módulos ---------- */
(function(){
var LFI=window.LFI, r2=LFI.dataUtil.r2, r3=LFI.dataUtil.r3;
/* fornecedores que atendem um produto (principal + alternativos + quem cadastrou a categoria) */
LFI.fornecedoresDoProduto = function(prodId){ var p=LFI.prod(prodId), ids=[]; if(!p) return []; if(p.forn) ids.push(p.forn); (p.fornAlt||[]).forEach(function(f){ if(ids.indexOf(f)<0) ids.push(f); }); return ids.map(LFI.forn); };
/* cria uma cotação: o={itens:[{prod,qtd}], dep, empresa?, origem:'foto'|'lista'|'manual'|'producao'|'estoque', resp?, obs?, fornecedores?, status?} */
LFI.criarCotacao = function(o){
  var dep=o.dep||'cen', forn=o.fornecedores;
  if(!forn){ forn=[]; o.itens.forEach(function(i){ LFI.fornecedoresDoProduto(i.prod).forEach(function(f){ if(forn.indexOf(f.id)<0) forn.push(f.id); }); }); }
  var c={id:LFI.novoId('cot'), num:LFI.proximo('cot'), data:LFI.agoraISO(), resp:o.resp||LFI.usuario().nome, dep:dep, empresa:o.empresa||LFI.dep(dep).empresa, origem:o.origem||'manual', status:o.status||'preparacao',
    prazoRetorno:LFI.dataUtil.D(1)+'T12:00', obs:o.obs||'', itens:o.itens.map(function(i){ return {prod:i.prod, qtd:r3(i.qtd)}; }), fornecedores:forn, propostas:[], escolhas:{}};
  LFI.db.cotacoes.unshift(c);
  LFI.atividade('cotacao','Cotação '+c.num+' criada ('+c.itens.length+' itens)',{tela:'compras',id:c.id});
  LFI.salvar(); return c;
};
/* cria ordem de compra: o={forn, dep, empresa?, itens:[{prod,qtd,preco}], cond?, previsao?, cot?, grupo?, obs?, status?} */
LFI.criarOrdem = function(o){
  var f=LFI.forn(o.forn), dep=o.dep||'cen', prev=new Date(); prev.setDate(prev.getDate()+(f.prazo||2));
  var oc={id:LFI.novoId('oc'), num:LFI.proximo('oc'), forn:o.forn, empresa:o.empresa||LFI.dep(dep).empresa, dep:dep, cot:o.cot||null, grupo:o.grupo||null, emissao:LFI.hoje(), previsao:o.previsao||LFI.dataUtil.iso(prev), cond:o.cond||f.cond, status:o.status||'aguardando_aprovacao', nfs:[], obs:o.obs||'',
    itens:o.itens.map(function(i){ return {prod:i.prod, qtd:r3(i.qtd), preco:r2(i.preco), recebido:0}; }), hist:[{d:LFI.agoraISO(), s:o.status||'aguardando_aprovacao', u:LFI.usuario().nome}]};
  LFI.db.ordens.unshift(oc);
  LFI.atividade('oc',oc.num+' criada para '+f.nome+' · '+LFI.fmt.moeda(LFI.totalOrdem(oc)),{tela:'ordens',id:oc.id});
  LFI.salvar(); return oc;
};
LFI.totalOrdem = function(oc){ var t=0; oc.itens.forEach(function(i){ t+=i.qtd*i.preco; }); return r2(t); };
LFI.mudarStatusOrdem = function(oc, s, obs){ oc.status=s; oc.hist.push({d:LFI.agoraISO(), s:s, u:LFI.usuario().nome, obs:obs||''}); LFI.salvar(); };
/* simula a chegada da NF de uma entrega: cria nota "recebida" (aguardando conferência) já vinculada à OC.
   recebidos: {prodId: qtd na unidade base}. A entrada no estoque acontece quando a nota for conferida e lançada. */
LFI.notaDaOrdem = function(ocId, recebidos){
  var oc=LFI.ordem(ocId), f=LFI.forn(oc.forn), num=LFI.proximo('nf');
  var itens=[]; oc.itens.forEach(function(i){ var q=recebidos?recebidos[i.prod]:(i.qtd-i.recebido); if(!q||q<=0) return; var p=LFI.prod(i.prod), fat=1;
    var desc=(p.apelidos&&p.apelidos[0])||p.nome.toUpperCase(), vProd=r2(q*i.preco);
    var cred=LFI.regraDoProduto(p), icms=cred&&cred.icms?cred.icms:0;
    itens.push({id:LFI.novoId('i'), desc:desc, cod:'', ncm:p.ncm, cfop:f.uf==='SP'?'5102':'6102', un:p.un.toUpperCase(), qtd:r3(q), vUn:i.preco, vProd:vProd, prod:p.id, fator:fat, conf:false,
      icms:{cst:'00', bc:icms?vProd:0, p:icms, v:r2(vProd*icms/100)}, ipi:{p:0,v:0}, pis:{p:0,v:0}, cofins:{p:0,v:0}, st:{v:0}}); });
  var t=0; itens.forEach(function(i){ t+=i.vProd; });
  var n={id:LFI.novoId('nf'), numero:num, serie:'1', forn:oc.forn, empresa:oc.empresa, dep:oc.dep, emissao:LFI.hoje(), entrada:null, status:'recebida', origem:'xml', arquivo:'NFe_'+num.replace(/\D/g,'')+'.xml', oc:oc.id, frete:0, desconto:0, natOp:'Venda de mercadoria', itens:itens, valor:r2(t), chave:'3526'+String(Date.now()).padEnd(40,'0').slice(0,40), cp:null};
  LFI.db.notas.unshift(n);
  LFI.atividade('nf','NF '+num+' recebida de '+f.nome+' (aguardando conferência)',{tela:'notas',id:n.id});
  LFI.salvar(); return n;
};
})();

/* aplica preço de venda numa receita mantendo o mix de vendas coerente */
window.LFI.aplicarPreco = function(recId, preco){ var LFI=window.LFI, r=LFI.rec(recId); if(!r) return; r.preco=LFI.dataUtil.r2(preco); LFI.db.mixVendas.forEach(function(m){ if(m.rec===recId) m.preco=r.preco; }); LFI.atividade('receita','Preço de '+r.nome+' atualizado para '+LFI.fmt.moeda(r.preco),{tela:'receitas',id:recId}); LFI.salvar(); };

/* código de barras (EAN-13) e endereço no estoque */
window.LFI.textoEnd = function(e){ return e&&e.rua?'Rua '+e.rua+' · Posição '+e.pos:''; };
