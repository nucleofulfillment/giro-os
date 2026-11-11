/* LivePro — troca a base de produtos de exemplo pelo catálogo real do cliente (catalogo-dados.js).
   Roda no fim de LFI.criarBase():
   - ingredientes da planilha viram insumos do estoque (os de exemplo equivalentes são reaproveitados, mantendo notas e pedidos);
   - bases (massas, recheios) e produtos de venda viram produtos com receita (a receita fica dentro do produto: p.receita);
   - bebidas de revenda viram produtos de revenda;
   - insumos do sushi continuam só para o Buffet de exemplo;
   - pedidos, notas, movimentos, produção e vendas de exemplo são ajustados para os produtos reais. */
(function(){
'use strict';
var GRUPOS=[
  {nome:'Pães', dep:'pad', emoji:'🥖'}, {nome:'Padaria', dep:'pad', emoji:'🥐'}, {nome:'Bolos e tortas', dep:'pad', emoji:'🎂'},
  {nome:'Cucas e bolos secos', dep:'pad', emoji:'🍰'}, {nome:'Pastel', dep:'pad', emoji:'🥟'}, {nome:'Lanches e porções', dep:'res', emoji:'🍔'},
  {nome:'Bebidas', dep:'res', emoji:'☕'}, {nome:'Bases', dep:'pad', emoji:'🥣'}, {nome:'Inativos', dep:'pad', emoji:'📦'}
];
LFI.GRUPOS=GRUPOS;
LFI.grupoInfo=function(n){ for(var i=0;i<GRUPOS.length;i++) if(GRUPOS[i].nome===n) return GRUPOS[i]; return {nome:n, dep:'pad', emoji:'📦'}; };
function k(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,' ').trim(); }

/* produto de exemplo -> equivalente real (mesmo id, para manter notas, pedidos e cotações) */
var MAP_ING={p01:'Farinha de trigo tipo 1',p02:'Açúcar cristal',p03:'Sal',p04:'Fermento biológico',p05:'Melhorador de farinha',p06:'Margarina',p07:'Manteiga',p08:'Leite',p09:'Creme de leite',p10:'Ovos',p11:'Queijo muçarela fatiado',p12:'Queijo minas',p13:'Presunto',p15:'Polvilho azedo',p16:'Chocolate meio amargo',p17:'Fermento químico',p18:'Óleo de soja',p26:'Extrato de tomate',p27:'Champignon fatiado',p28:'Cebola',p29:'Tomate',p30:'Alface',p31:'Cenoura',p32:'Batata',p36:'Peito de frango',p37:'Carne bovina (patinho)',p38:'Carne moída',p44:'Gergelim',p53:'Embalagem marmitex 750 ml',p55:'Sacola média',p57:'Papel manteiga',pa3:'Pão de queijo congelado (un)'};
var MAP_REV={p48:'Refrigerante cola lata 350ml',p49:'Água mineral 500ml',p50:'Cerveja long neck',p51:'Suco de uva 1L'};
var MAP_REC={pa1:'Pão francês'};
var SUSHI={p14:1,p21:1,p25:1,p33:1,p34:1,p35:1,p39:1,p40:1,p41:1,p42:1,p43:1,p45:1,p46:1,p47:1,p54:1,p56:1};
var LOCAL={far:'Despensa seca A',mer:'Despensa seca B',lat:'Câmara fria 01 (0 a 4 °C)',car:'Câmara de resfriados 02',pes:'Câmara de resfriados 02',hor:'Câmara fria 01 (0 a 4 °C)',ole:'Despensa seca A',beb:'Bar e adega',emb:'Almoxarifado de embalagens',tem:''};
var RUA={'Câmara fria 01 (0 a 4 °C)':'CF','Freezer 02 (−18 °C)':'FZ','Despensa seca A':'A','Despensa seca B':'B','Bar e adega':'BR','Almoxarifado de embalagens':'E','Câmara de resfriados 02':'CR','Vitrine da padaria':'VT'};
var FORN={far:'f2',lat:'f3',car:'f6',pes:'f4',hor:'f7',emb:'f8',beb:'f9',ole:'f1',mer:'f1'};
var NCM={far:'1101.00.10',lat:'0406.10.10',car:'0201.30.00',pes:'0302.14.00',hor:'0709.99.90',ole:'1507.90.11',beb:'2202.10.00',emb:'3923.29.90',mer:'2106.90.90',aca:'1905.90.90'};

LFI._aplicarCatalogo=function(db, h){
  var C=LFI.CATALOGO; if(!C) return;
  var D=h.D, R=h.R, r2=h.r2, r3=h.r3;
  var antigos={}; db.produtos.forEach(function(p){ antigos[p.id]=p; });
  var porNomeIng={}, porNomeRev={}, porNomeRec={};
  Object.keys(MAP_ING).forEach(function(id){ porNomeIng[k(MAP_ING[id])]=id; });
  Object.keys(MAP_REV).forEach(function(id){ porNomeRev[k(MAP_REV[id])]=id; });
  Object.keys(MAP_REC).forEach(function(id){ porNomeRec[k(MAP_REC[id])]=id; });
  var razao={}, novos=[], ruas={}, seqEan=0;
  function pad(n,t){ n=String(n); while(n.length<t) n='0'+n; return n; }
  function ean(){ seqEan++; return LFI.ean13('789'+String(52300000+seqEan*911).slice(-9)); }
  function endereco(local){ var r=RUA[local]; if(!r) return null; ruas[r]=(ruas[r]||0)+1; return {rua:r, pos:pad(ruas[r],2)}; }
  function hist(base){ var hh=[]; for(var i=5;i>=0;i--){ var v=i===0?base:r2(base*(1-(i*0.012)+(R()-.5)*0.03)); hh.push({d:D(-i*30-5), v:v, origem:i===0?'Custo médio atual':'Compra'}); } return hh; }
  function base(id, nome){ var o=antigos[id]; if(o) return o; return {id:id, nome:nome, est:{cen:0,pad:0,res:0}, apelidos:[], contado:null, hist:[], fornAlt:[], cest:''}; }

  /* ---- 1. ingredientes -> insumos ---- */
  var ingId=[];
  C.ing.forEach(function(a, n){
    var nome=a[0], un=a[1], pac=a[2]||1, preco=a[3]||0, cat=a[4], semPreco=!!a[5];
    var velho=porNomeIng[k(nome)], id=velho||('i'+pad(n+1,3)), p=base(id, nome);
    var custo=pac?r2(preco/pac*10000)/10000:0; custo=Math.round(custo*10000)/10000;
    if(velho && antigos[velho]) razao[velho]=antigos[velho].custoMedio?custo/antigos[velho].custoMedio:1;
    p.nome=nome; p.un=un; p.cat=cat==='tem'?'tem':cat; p.custoMedio=custo; p.ultimoCusto=custo; p.semPreco=semPreco;
    delete p.receita; p.tipo=un==='min'?'servico':'insumo'; p.conv={un:un==='min'?'Minuto':'Pacote '+String(pac).replace('.',',')+' '+un, fator:pac}; p.pacote={qtd:pac, preco:preco};
    if(!velho){
      p.ncm=NCM[cat]||''; p.forn=FORN[cat]||'f1'; p.local=LOCAL[cat]||'Despensa seca B'; p.apelidos=[nome.toUpperCase()];
      var perec=/^(hor|lat|car|pes)$/.test(cat); p.validade=p.tipo==='servico'?null:D(perec?Math.round(3+R()*12):Math.round(45+R()*200));
      p.estMin=(p.tipo==='servico'||semPreco)?0:r3(pac*(un==='un'?0.3:1));
      p.est={cen:0,pad:0,res:0};
      if(p.tipo!=='servico' && !semPreco){ p.est.cen=r3(pac*(un==='un'?(0.4+R()*1.6):(1+Math.floor(R()*4)))); if(R()<0.35) p.est.pad=r3(pac*(un==='un'?0.15:0.3+R())); }
      p.ultMov=D(-Math.round(1+R()*9)); p.hist=hist(custo); p.ean=p.tipo==='servico'?null:ean(); p.end=p.tipo==='servico'?null:endereco(p.local);
    } else {
      p.hist=hist(custo); p.est.res=p.est.res||0;
      ['cen','pad','res'].forEach(function(d){ p.est[d]=r3(p.est[d]||0); });
    }
    ingId[n]=id; novos.push(p);
  });

  /* ---- 2. receitas -> produtos com receita ---- */
  var recId=[], prodRec=[];
  C.rec.forEach(function(a, n){
    var nome=a[0], grupo=a[1], un=a[2], g=LFI.grupoInfo(grupo), baseRec=grupo==='Bases', ativo=!!a[8];
    var velho=porNomeRec[k(nome)], id=velho||((baseRec?'b':'v')+pad(n+1,3)), p=base(id, nome);
    p.nome=nome; p.un=un; p.cat='aca'; p.emoji=g.emoji; p.grupo=grupo; p.dep=g.dep; p.tipo=baseRec?'base':'acabado'; p.ativo=ativo;
    p.preco=a[4]; p.promo=a[9]||null; p.cod=a[5]||null; p.custoExcel=a[7]; p.ncm=NCM.aca; p.forn=null; p.fornAlt=[];
    p.local=g.dep==='pad'?'Vitrine da padaria':'Cozinha do restaurante'; p.conv={un:un==='un'?'Unidade':un,fator:1};
    p.est={cen:0,pad:0,res:0};
    if(ativo && !baseRec && g.dep==='pad') p.est.pad=un==='un'?Math.round(4+R()*30):r3(0.8+R()*6);
    if(ativo && baseRec && R()<0.4) p.est.pad=r3(1+R()*4);
    p.estMin=0; p.validade=D(baseRec?Math.round(2+R()*4):Math.round(1+R()*3)); p.ultMov=D(0); p.apelidos=[]; p.contado=null; p.ean=velho?p.ean:ean(); p.end=null;
    p.receita='rc'+pad(n+1,3); recId[n]=id; prodRec[n]=p; novos.push(p);
  });
  /* itens das receitas (precisa de todos os ids prontos) */
  var unRec={kg:'g', L:'ml', un:'un', min:'min'};
  var receitas=C.rec.map(function(a, n){
    var p=prodRec[n], g=LFI.grupoInfo(a[1]), tempo=0;
    var ing=a[6].map(function(it){ var tp=it[0][0], ix=+it[0].slice(1), pid=tp==='i'?ingId[ix]:recId[ix], q=it[1];
      var pp=null; for(var j=0;j<novos.length;j++) if(novos[j].id===pid){ pp=novos[j]; break; }
      if(pp&&pp.un==='min') tempo+=q;
      return {prod:pid, qtd:q, un:unRec[pp?pp.un:'kg']||'g'}; });
    return {id:p.receita, nome:a[0], dep:g.dep, cat:a[1], foto:g.emoji, cor:'#F6E3C5', rend:a[3]||1, rendUn:p.un==='un'?'unidade':p.un, pesoFinal:p.un==='kg'?Math.round((a[3]||1)*1000):null,
      perda:0, tempo:Math.round(tempo), preco:a[4]||0, vendaUn:p.un, acabado:p.id, ing:ing, modo:'', custoExcel:a[7], ativo:!!a[8], base:a[1]==='Bases', real:true};
  });

  /* ---- 3. bebidas de revenda ---- */
  C.rev.forEach(function(a, n){
    var velho=porNomeRev[k(a[0])], id=velho||('rv'+pad(n+1,3)), p=base(id, a[0]);
    if(velho && antigos[velho]) razao[velho]=antigos[velho].custoMedio?a[1]/antigos[velho].custoMedio:1;
    delete p.receita; p.nome=a[0]; p.un='un'; p.cat='beb'; p.tipo='revenda'; p.grupo='Bebidas'; p.dep='res'; p.custoMedio=a[1]; p.ultimoCusto=a[1]; p.preco=a[2];
    p.conv={un:'Fardo 12 un', fator:12}; p.ncm=NCM.beb;
    if(!velho){ p.forn='f9'; p.local='Bar e adega'; p.est={cen:Math.round(12+R()*60), pad:0, res:Math.round(6+R()*24)}; p.estMin=12; p.validade=D(Math.round(60+R()*200)); p.apelidos=[a[0].toUpperCase()]; p.ultMov=D(-Math.round(1+R()*6)); p.ean=ean(); p.end=endereco(p.local); }
    else { ['cen','pad','res'].forEach(function(d){ p.est[d]=r3(p.est[d]||0); }); }
    p.hist=hist(a[1]); novos.push(p);
  });

  /* ---- 4. insumos do sushi ficam para o Buffet de exemplo; sobras do buffet também ---- */
  db.produtos.forEach(function(p){ if(SUSHI[p.id]){ p.exemplo=true; p.grupo='Buffet (exemplo)'; ['cen','pad','res'].forEach(function(d){ p.est[d]=p.est[d]||0; }); novos.push(p); } else if(/^sb_/.test(p.id)) novos.push(p); });
  var existe={}; novos.forEach(function(p){ existe[p.id]=1; });
  db.produtos=novos;

  /* ---- 5. receitas: buffet de exemplo + reais ---- */
  db.receitas=db.receitas.filter(function(r){ return r.buffet; }).concat(receitas);
  db.receitas.forEach(function(r){ r.ing=r.ing.filter(function(g){ return existe[g.prod]; }); });

  /* ---- 6. referências: notas, pedidos, cotações, movimentos ---- */
  function fator(id){ return razao[id]!=null?razao[id]:1; }
  db.notas.forEach(function(n){
    n.itens=n.itens.filter(function(it){ return !it.prod || existe[it.prod]; });
    n.itens.forEach(function(it){ if(!it.prod) return; var f=fator(it.prod); if(f===1) return;
      it.vUn=r2(it.vUn*f); var vAnt=it.vProd; it.vProd=r2(it.vUn*it.qtd); var s=vAnt?it.vProd/vAnt:1;
      ['icms','ipi','pis','cofins','st'].forEach(function(t){ if(it[t]){ if(it[t].v) it[t].v=r2(it[t].v*s); if(it[t].bc) it[t].bc=r2(it[t].bc*s); } }); });
    var t=0; n.itens.forEach(function(i){ t+=i.vProd+(i.ipi?i.ipi.v:0)+(i.st?i.st.v:0); }); n.valor=r2(t+(n.frete||0)-(n.desconto||0));
  });
  db.notas=db.notas.filter(function(n){ return n.itens.length; });
  var nvalor={}; db.notas.forEach(function(n){ nvalor[n.id]=n.valor; });
  (db.contasPagar||[]).forEach(function(c){ if(c.nf&&nvalor[c.nf]!=null) c.valor=nvalor[c.nf]; });
  db.ordens.forEach(function(o){ o.itens=o.itens.filter(function(i){ return existe[i.prod]; }); o.itens.forEach(function(i){ i.preco=r2(i.preco*fator(i.prod)); }); });
  db.ordens=db.ordens.filter(function(o){ return o.itens.length; });
  db.cotacoes.forEach(function(c){
    c.itens=c.itens.filter(function(i){ return existe[i.prod]; });
    (c.propostas||[]).forEach(function(pr){ pr.itens=pr.itens.filter(function(i){ return existe[i.prod]; }); pr.itens.forEach(function(i){ i.preco=r2(i.preco*fator(i.prod)); }); });
    if(c.escolhas) Object.keys(c.escolhas).forEach(function(pid){ if(!existe[pid]) delete c.escolhas[pid]; });
  });
  db.cotacoes=db.cotacoes.filter(function(c){ return c.itens.length; });
  db.movs=db.movs.filter(function(m){ return existe[m.prod] && !(m.origem&&m.origem.tipo==='op'); });
  db.movs.forEach(function(m){ if(m.custo!=null) m.custo=r2(m.custo*fator(m.prod)); });

  /* ---- 7. custo dos produtos com receita (bases dentro de produtos) ---- */
  db.config=db.config||{}; db.config.despesas=0; db.config.despesasPlanilha=C.despesas||33; db.config.despMig=1; /* por enquanto só o custo do produto */
  db.miro=C.miro;
  LFI.recalcularProduzidos(db);

  /* ---- 8. produção de exemplo com receitas reais ---- */
  function recDe(nome){ var kk=k(nome); for(var i=0;i<db.receitas.length;i++) if(k(db.receitas[i].nome)===kk) return db.receitas[i]; return null; }
  var ops=[['op451','OP-2026-0451','Pão francês',1,0,'04:30','07:40','Seu Antônio (padeiro)','concluida','Fornada da manhã.'],
           ['op452','OP-2026-0452','Cuca de brigadeiro',1,0,'06:10',null,'Larissa (confeitaria)','producao','Cucas para a vitrine da tarde.'],
           ['op453','OP-2026-0453','Recheio de frango',1,0,null,null,'Seu Antônio (padeiro)','planejada','Recheio para pastéis e calzones.'],
           ['op450','OP-2026-0450','Biscoito de polvilho',1,-1,'14:00','15:30','Larissa (confeitaria)','concluida',''],
           ['op449','OP-2026-0449','Bolo de morango com chocolate',2,-1,'09:00','10:20','Larissa (confeitaria)','concluida','']];
  db.producao=[];
  ops.forEach(function(o){ var r=recDe(o[2]); if(!r) return;
    var qtd=r3((r.rend||1)*o[3]);
    var op={id:o[0], num:o[1], rec:r.id, qtd:qtd, dep:r.dep, data:D(o[4]), inicio:o[5], fim:o[6], resp:o[7], status:o[8], obs:o[9]};
    db.producao.push(op);
    if(op.status!=='concluida') return;
    r.ing.forEach(function(g){ var p=null; for(var i=0;i<db.produtos.length;i++) if(db.produtos[i].id===g.prod){ p=db.produtos[i]; break; } if(!p||p.tipo==='servico') return;
      var q=r3(LFI.converte(g.qtd,g.un,p.un)*o[3]);
      db.movs.push({id:'m'+(db.movs.length+1), d:op.data+'T'+(op.fim||'08:00'), prod:p.id, dep:op.dep, tipo:'producao', qtd:-q, custo:p.custoMedio, origem:{tipo:'op', id:op.id}, usuario:op.resp, obs:op.num}); });
    db.movs.push({id:'m'+(db.movs.length+1), d:op.data+'T'+(op.fim||'08:00'), prod:r.acabado, dep:op.dep, tipo:'producao', qtd:qtd, custo:null, origem:{tipo:'op', id:op.id}, usuario:op.resp, obs:'Entrada de produto acabado'});
  });
  db.movs.sort(function(a,b){ return a.d<b.d?1:-1; });
  db.movs.forEach(function(m,i){ m.id='m'+(i+1); });
  db.atividades.forEach(function(a){ if(a.ref&&a.ref.id==='op451') a.txt='OP-2026-0451 concluída: '+String(db.producao[0]?db.producao[0].qtd:'').replace('.',',')+' kg de pão francês'; });

  /* ---- 9. mix de vendas com produtos reais (o buffet de sushi continua de exemplo) ---- */
  var mix=[['Pão francês','pad',0.22],['Cafezinho','pad',0.12],['Cuca de brigadeiro','pad',0.1],['Sonho de creme','pad',0.08],['Pastel de frango','pad',0.08],['Bolo de morango com chocolate','pad',0.06],
           ['X-salada','res',0.12],['X-burguer','res',0.09],['Prato de carne acebolada','res',0.06],['Porção de batata frita','res',0.04]];
  var novoMix=[];
  mix.forEach(function(m){ var r=recDe(m[0]); if(r) novoMix.push({nome:r.nome, dep:m[1], rec:r.id, part:m[2], preco:r.preco||0}); });
  var coca=null; db.produtos.forEach(function(p){ if(p.id==='p48') coca=p; });
  if(coca) novoMix.push({nome:coca.nome, dep:'res', rec:null, part:0.05, preco:coca.preco, custo:coca.custoMedio, prod:coca.id});
  (db.mixVendas||[]).forEach(function(m){ if(m.rec&&/^r(09|1[0-6])$/.test(m.rec)) novoMix.push(m); else if(/sushi/i.test(m.nome)) novoMix.push(m); });
  db.mixVendas=novoMix;
  /* categorias de venda da padaria com os grupos reais */
  var REN={'Pães':'Pães','Confeitaria':'Bolos e tortas','Salgados':'Pastel','Bebidas':'Bebidas','Revenda':'Cucas e bolos secos','Almoço buffet/executivo':'Lanches e porções','À la carte':'Pratos e porções','Delivery':'Delivery'};
  db.vendas.forEach(function(v){ var c2={}; Object.keys(v.cats).forEach(function(c){ var n=REN[c]||c; c2[n]=r2((c2[n]||0)+v.cats[c]); }); v.cats=c2; });
  /* ---- 10. regimes do cliente: Padaria no Lucro Real, Restaurante no Simples Nacional; faturamento realista do restaurante ---- */
  var nomeConta=''; try{ var us=JSON.parse(localStorage.getItem('dd_user')||'null'); nomeConta=us&&us.cliente_nome?String(us.cliente_nome).trim():''; }catch(e){}
  if(!nomeConta) nomeConta='Padaria Exemplo';
  db.grupo.nome=nomeConta;
  db.empresas.forEach(function(e){
    if(e.id==='e1'){ e.fantasia=nomeConta+' Padaria'; e.razao=nomeConta+' Panificadora Ltda'; }
    if(e.id==='e2'){ e.fantasia=nomeConta+' Restaurante'; e.razao=nomeConta+' Restaurante Ltda'; }
    if(e.id==='e1'){ e.regime='Lucro Real'; e.pisCofins='nao_cumulativo'; e.impVenda=13; }
    if(e.id==='e2'){ e.regime='Simples Nacional'; e.pisCofins='nao_se_aplica'; e.anexo='I'; e.impVenda=9; }
  });
  (function(){ var tot=0, n=0; db.vendas.forEach(function(v){ if(v.dep==='res'){ tot+=v.valor; n++; } }); var alvo=4000, f=n?alvo/(tot/n):1;
    db.vendas.forEach(function(v){ if(v.dep!=='res') return; v.valor=r2(v.valor*f); v.tickets=Math.max(1,Math.round(v.tickets*f)); Object.keys(v.cats).forEach(function(c){ v.cats[c]=r2(v.cats[c]*f); }); }); })();
  /* fluxo de caixa de EXEMPLO: despesas fixas dos últimos meses e as próximas */
  db.fluxo=[]; var fxs=[['Aluguel da loja','Aluguel',6500,5],['Folha de pagamento','Folha de pagamento',38000,5],['Conta de energia','Energia, água e gás',4200,10],['Água e esgoto','Energia, água e gás',900,12],['Gás','Energia, água e gás',1800,15],['Contador','Operacional',1200,10],['Manutenção dos fornos','Manutenção',850,18],['Internet e telefone','Operacional',380,20]];
  [-2,-1,0].forEach(function(mo){ var base=new Date(h.D(0)+'T12:00:00'); base.setDate(1); base.setMonth(base.getMonth()+mo);
    fxs.forEach(function(f,i){ var dt=new Date(base); dt.setDate(f[3]); var iso=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
      db.fluxo.push({id:'fx'+mo+'_'+i, tp:'out', tt:f[0], categoria:f[1], data:iso, vl:r2(f[2]*(0.95+R()*0.1)), status:iso<h.D(0)?'pago':'pendente', obs:''}); }); });
  /* parâmetros fiscais de EXEMPLO (o contador confirma): usados pela tela Tributário */
  db.config.trib={
    e1:{pis:1.65, cofins:7.6, icmsVenda:7, icmsCompra:5, cmv:35, lucro:8, irpj:15, adicional:10, limAdicional:20000, csll:9},
    e2:{anexo:'I'}
  };
  db.atividades.forEach(function(a){ a.txt=a.txt.replace(/Dourado Restaurante/g,nomeConta+' Restaurante').replace(/Pão Dourado Padaria/g,nomeConta+' Padaria'); });
  db.categorias.forEach(function(c){ if(c.id==='ori') c.nome='Insumos do sushi (buffet de exemplo)'; if(c.id==='aca') c.nome='Produtos feitos aqui'; }); db.categorias.push({id:'tem', nome:'Tempo e mão de obra'});
};

/* custo dos produtos feitos aqui (bases e produtos com receita): soma dos ingredientes ÷ rendimento.
   Repete algumas vezes porque uma base pode usar outra base. */
LFI.recalcularProduzidos=function(dbx){
  var db=dbx||LFI.db, map={}; db.produtos.forEach(function(p){ map[p.id]=p; });
  var rec={}; db.receitas.forEach(function(r){ rec[r.id]=r; });
  for(var volta=0; volta<6; volta++){
    var mudou=false;
    db.produtos.forEach(function(p){
      if(!p.receita || (p.tipo!=='base' && p.tipo!=='acabado')) return;
      var r=rec[p.receita]; if(!r) return;
      var t=0; r.ing.forEach(function(g){ var q=map[g.prod]; if(!q) return; t+=LFI.converte(g.qtd,g.un,q.un)*(q.custoMedio||0); });
      var c=Math.round(t/(r.rend||1)*10000)/10000;
      if(Math.abs(c-(p.custoMedio||0))>0.00005){ p.custoMedio=c; p.ultimoCusto=c; mudou=true; }
    });
    if(!mudou) break;
  }
};
})();
