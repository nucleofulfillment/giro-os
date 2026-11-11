/* LivePro — TRIBUTÁRIO (didático, com o cálculo de verdade de cada regime).
   Padaria no Lucro Real: débito − crédito = a pagar (PIS/COFINS, ICMS) + IRPJ/CSLL sobre o lucro.
   Restaurante no Simples Nacional: como o DAS é calculado (faturamento 12 meses → faixa → alíquota efetiva).
   Gráfico de 6 meses, calendário de guias e impostos das compras (XML).
   Percentuais de EXEMPLO em db.config.trib até o contador confirmar. A tela técnica antiga é a "Área do contador". */
(function(){
'use strict';
var UI=LFI.ui, F=LFI.fmt, esc=UI.esc;
var antigo=LFI.telas.tributos;
var MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
var MC=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
/* Simples Nacional — Anexo I (comércio): [até, alíquota nominal %, parcela a deduzir] */
var ANEXO_I=[[180000,4,0],[360000,7.3,5940],[720000,9.5,13860],[1800000,10.7,22500],[3600000,14.3,87300],[4800000,19,378000]];
var COR={pad:'#E08A1E', res:'#1D4ED8'};
function st(){ return LFI.estado.trib3=LFI.estado.trib3||{mes:null, ab:{}}; }
function ymOf(d){ return d.slice(0,7); }
function ymAdd(ym, n){ var y=+ym.slice(0,4), m=+ym.slice(5,7)-1+n; y+=Math.floor(m/12); m=((m%12)+12)%12; return y+'-'+(m+1<10?'0':'')+(m+1); }
function nomeMes(ym, curto){ var m=+ym.slice(5,7)-1; return (curto?MC:MESES)[m]+(curto?'':' de '+ym.slice(0,4)); }
function ultimoDia(ym){ var y=+ym.slice(0,4), m=+ym.slice(5,7); return new Date(y, m, 0).getDate(); }
function cfg(){ var c=LFI.db.config=LFI.db.config||{}; c.trib=c.trib||{e1:{pis:1.65,cofins:7.6,icmsVenda:7,icmsCompra:5,cmv:35,lucro:8,irpj:15,adicional:10,limAdicional:20000,csll:9}, e2:{anexo:'I'}}; return c.trib; }

function depsDe(empId){ return LFI.db.departamentos.filter(function(d){ return d.empresa===empId; }).map(function(d){ return d.id; }); }
function vendasMes(empId, ym){ var deps=depsDe(empId), t=0; LFI.db.vendas.forEach(function(v){ if(ymOf(v.d)===ym && deps.indexOf(v.dep)>=0) t+=v.valor; }); return t; }
function mesesComDados(){ var o={}; LFI.db.vendas.forEach(function(v){ o[ymOf(v.d)]=1; }); return Object.keys(o).sort(); }

/* ---- Lucro Real (padaria) ---- */
function calcReal(e, ym){
  var p=cfg()[e.id]||cfg().e1, V=vendasMes(e.id, ym), C=V*p.cmv/100, L=V*p.lucro/100;
  var pis={deb:V*p.pis/100, cred:C*p.pis/100}, cof={deb:V*p.cofins/100, cred:C*p.cofins/100}, icms={deb:V*p.icmsVenda/100, cred:C*p.icmsCompra/100};
  [pis,cof,icms].forEach(function(x){ x.pagar=Math.max(0,x.deb-x.cred); });
  var irpj=L*p.irpj/100+Math.max(0,L-p.limAdicional)*p.adicional/100, csll=L*p.csll/100;
  var total=pis.pagar+cof.pagar+icms.pagar+irpj+csll;
  return {tipo:'real', V:V, C:C, L:L, p:p, pis:pis, cofins:cof, icms:icms, irpj:irpj, csll:csll, total:total, pct:V?total/V:0};
}
/* ---- Simples Nacional (restaurante) ---- */
function calcSimples(e, ym){
  var V=vendasMes(e.id, ym), soma=0, n=0, todos=mesesComDados();
  for(var i=1;i<=12;i++){ var m=ymAdd(ym,-i); if(todos.indexOf(m)<0) continue; var v=vendasMes(e.id,m); if(v>0){ soma+=v; n++; } }
  var rbt=n?soma*12/n:V*12, faixa=0; while(faixa<ANEXO_I.length-1 && rbt>ANEXO_I[faixa][0]) faixa++;
  var fx=ANEXO_I[faixa], efetiva=rbt?((rbt*fx[1]/100)-fx[2])/rbt:fx[1]/100; if(efetiva<0) efetiva=fx[1]/100;
  return {tipo:'simples', V:V, rbt:rbt, meses:n, faixa:faixa, nominal:fx[1], deduzir:fx[2], efetiva:efetiva, das:V*efetiva, total:V*efetiva, pct:efetiva, de:faixa?ANEXO_I[faixa-1][0]:0, ate:fx[0]};
}
function calc(e, ym){ return /simples/i.test(e.regime)?calcSimples(e,ym):calcReal(e,ym); }

function css(){ if(document.getElementById('css-trib3')) return; var c=document.createElement('style'); c.id='css-trib3'; c.textContent=
  '.tx{max-width:1080px;margin:0 auto;padding-bottom:40px}'+
  '.tx-hd{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:12px}.tx-hd>div{flex:1;min-width:240px}.tx-hd h1{font-size:24px;margin:0}.tx-hd small{display:block;color:var(--muted);font-weight:700;font-size:13.5px;margin-top:2px}.tx-cont{min-height:48px;border-radius:14px;padding:0 16px;font-size:14.5px}'+
  '.tx-ex{display:flex;gap:10px;align-items:center;background:#FEF3C7;color:#5C4300;border-radius:14px;padding:10px 14px;font-size:13.5px;font-weight:700;margin-bottom:12px}.tx-ex svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;flex:none}'+
  '.tx-per{display:flex;gap:6px;margin-bottom:14px}.tx-per button{flex:1;min-height:48px;border-radius:14px;border:1.5px solid var(--border2);background:#fff;font:inherit;font-size:14.5px;font-weight:800;cursor:pointer;line-height:1.15}.tx-per button small{display:block;font-size:11px;font-weight:700;opacity:.7}.tx-per button.on{background:var(--text);color:#fff;border-color:var(--text)}'+
  '.tx-res{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:14px}.tx-e{background:#fff;border:1px solid var(--border);border-radius:20px;padding:16px 18px;box-shadow:var(--sh1)}.tx-e .t{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.tx-e .t b{font-size:16px}.tx-reg{border-radius:999px;padding:3px 10px;font-size:12px;font-weight:800;background:var(--s3)}.tx-reg.real{background:#FFF1E8;color:#9A3412}.tx-reg.simples{background:#E0EAFF;color:#1E3A8A}'+
  '.tx-e .nums{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:12px 0 10px}.tx-e .nums span{display:block;font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.3px}.tx-e .nums b{font-size:18px}.tx-e .nums .im b{color:#DC2626}'+
  '.tx-bar{height:24px;border-radius:8px;overflow:hidden;display:flex;font-size:11.5px;font-weight:800;color:#fff}.tx-bar>div{display:flex;align-items:center;justify-content:center;white-space:nowrap;overflow:hidden}.tx-bar .im{background:#DC2626}.tx-bar .fi{background:#16A34A}'+
  '.tx-q{background:#fff;border:1px solid var(--border);border-radius:20px;padding:18px 20px;margin-bottom:14px;box-shadow:var(--sh1)}'+
  '.tx-qh{display:flex;align-items:center;gap:12px;margin-bottom:10px}.tx-qh .n{width:34px;height:34px;border-radius:12px;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;flex:none;font-size:15px}.tx-qh h2{flex:1;font-size:18px;margin:0;line-height:1.25}.tx-qh h2 small{display:block;font-size:12.5px;font-weight:700;color:var(--muted);margin-top:2px}'+
  '.tx-aj{width:34px;height:34px;border-radius:50%;border:1.5px solid var(--border2);background:#fff;font:inherit;font-weight:800;font-size:15px;color:var(--muted2);cursor:pointer;flex:none}.tx-aj.on{background:var(--text);color:#fff;border-color:var(--text)}'+
  '.tx-exp{background:var(--s2);border-radius:14px;padding:12px 14px;font-size:14px;line-height:1.55;margin-bottom:12px}.tx-exp b{color:var(--text)}'+
  /* débito − crédito */
  '.tx-dc{display:flex;flex-direction:column;gap:8px}.tx-l{display:grid;grid-template-columns:minmax(0,1.3fr) 1fr 26px 1fr 26px 1fr;align-items:center;gap:6px;border:1px solid var(--border);border-radius:14px;padding:10px 12px}.tx-l .nm b{display:block;font-size:14.5px}.tx-l .nm small{font-size:11.5px;color:var(--muted);font-weight:700}.tx-l .v span{display:block;font-size:10.5px;font-weight:800;color:var(--muted);text-transform:uppercase}.tx-l .v b{font-size:15px}.tx-l .op{text-align:center;font-weight:800;color:var(--muted);font-size:18px}.tx-l .cr b{color:#16A34A}.tx-l .pg b{color:#DC2626;font-size:16px}'+
  '.tx-tot{display:flex;justify-content:space-between;align-items:baseline;border-top:2px solid var(--text);margin-top:10px;padding-top:10px;font-weight:800;font-size:15px}.tx-tot b{font-size:22px;color:#DC2626}'+
  /* passos do DAS */
  '.tx-ps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.tx-p{background:var(--s2);border-radius:14px;padding:12px}.tx-p i{font-style:normal;display:inline-flex;width:22px;height:22px;border-radius:50%;background:#1D4ED8;color:#fff;font-size:12px;font-weight:800;align-items:center;justify-content:center}.tx-p span{display:block;font-size:12px;font-weight:800;color:var(--muted2);margin:6px 0 2px}.tx-p b{font-size:17px}.tx-p small{display:block;font-size:11.5px;color:var(--muted);font-weight:700;margin-top:2px;line-height:1.35}.tx-p.fim{background:#1D4ED8;color:#fff}.tx-p.fim i{background:#fff;color:#1D4ED8}.tx-p.fim span,.tx-p.fim small{color:#DCE6FF}'+
  '.tx-fx{margin-top:14px}.tx-fx .rg{position:relative;height:16px;border-radius:8px;overflow:hidden;display:flex}.tx-fx .rg div{border-right:2px solid #fff}.tx-fx .mk{position:relative;height:30px}.tx-fx .mk span{position:absolute;top:2px;transform:translateX(-50%);font-size:11.5px;font-weight:800;white-space:nowrap;background:var(--text);color:#fff;border-radius:6px;padding:2px 6px}.tx-fx .mk span:before{content:"";position:absolute;left:50%;top:-6px;border:4px solid transparent;border-bottom-color:var(--text);transform:translateX(-50%)}.tx-fx .lg{position:relative;height:16px;font-size:11px;font-weight:700;color:var(--muted)}.tx-fx .lg span{position:absolute;top:0;white-space:nowrap}'+
  /* calendário */
  '.tx-cal{display:flex;flex-direction:column;gap:8px}.tx-g{display:flex;align-items:center;gap:12px;border:1px solid var(--border);border-radius:14px;padding:10px 12px}.tx-g .dt{width:52px;height:52px;border-radius:12px;background:var(--s2);display:flex;flex-direction:column;align-items:center;justify-content:center;flex:none;line-height:1}.tx-g .dt b{font-size:19px}.tx-g .dt small{font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;margin-top:2px}.tx-g>span{flex:1;min-width:0}.tx-g>span b{display:block;font-size:14.5px}.tx-g>span small{font-size:12px;color:var(--muted);font-weight:700}.tx-g strong{font-size:16px}.tx-sit{border-radius:999px;padding:3px 9px;font-size:11.5px;font-weight:800;white-space:nowrap}.tx-sit.ok{background:#ECFDF3;color:#14532D}.tx-sit.ap{background:#FEF3C7;color:#7A5A00}'+
  '.tx-tipos{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}.tx-t{border-radius:14px;background:var(--s2);padding:10px 12px}.tx-t span{font-size:12px;font-weight:800}.tx-t b{display:block;font-size:17px;margin-top:2px}.tx-t small{font-size:11.5px;color:var(--muted);font-weight:700}'+
  '.tx-gl{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px}.tx-gi{background:var(--s2);border-radius:12px;padding:10px 12px;font-size:13px;line-height:1.45}.tx-gi b{display:block;font-size:14px;margin-bottom:2px}'+
  '@media (max-width:760px){.tx-hd h1{font-size:21px}.tx-cont{width:100%}.tx-res{grid-template-columns:1fr}.tx-q{padding:16px}.tx-ps{grid-template-columns:1fr 1fr}'+
  '.tx-l{grid-template-columns:1fr 1fr 1fr;row-gap:8px}.tx-l .nm{grid-column:1/-1}.tx-l .op{display:none}.tx-e .nums b{font-size:16px}}';
  document.head.appendChild(c); }

function render(el, arg){
  if(arg==='contador'&&antigo){ antigo.render(el); var t=el.querySelector('.pghd h1'); if(t) t.textContent='Área do contador'; return; }
  css(); document.body.classList.add('foco');
  var s=st(), hoje=LFI.hoje(), ymHoje=ymOf(hoje), todos=mesesComDados();
  var opcoes=[ymAdd(ymHoje,-2), ymAdd(ymHoje,-1), ymHoje].filter(function(m){ return todos.indexOf(m)>=0; });
  if(!s.mes||opcoes.indexOf(s.mes)<0) s.mes=opcoes.length>1?opcoes[opcoes.length-2]:opcoes[0];
  var ym=s.mes, parcial=ym===ymHoje;
  var emps=LFI.db.empresas.filter(function(e){ return LFI.empresaVisivel(e.id); });
  var res=emps.map(function(e){ return {e:e, c:calc(e, ym), dep:depsDe(e.id)[0]}; });
  function ajuda(id, txt){ return s.ab[id]?'<div class="tx-exp">'+txt+'</div>':''; }
  function cab(n, cor, tit, sub, id){ return '<div class="tx-qh"><span class="n" style="background:'+cor+'">'+n+'</span><h2>'+tit+(sub?'<small>'+sub+'</small>':'')+'</h2>'+(id?'<button class="tx-aj'+(s.ab[id]?' on':'')+'" data-act="aj" data-id="'+id+'" aria-label="Explicar">?</button>':'')+'</div>'; }
  function barra(pct){ var p=Math.round(pct*1000)/10, w=Math.max(p,12); return '<div class="tx-bar"><div class="im" style="width:'+w+'%">'+String(p).replace('.',',')+'%</div><div class="fi" style="width:'+(100-w)+'%">Fica para a empresa '+String(Math.round((100-p)*10)/10).replace('.',',')+'%</div></div>'; }
  function pc(v){ return F.pctN(v*100,2); }

  var h='<div class="tx"><div class="tx-hd"><div><h1>Tributário</h1><small>Quanto cada empresa paga de imposto, e como esse valor é calculado.</small></div><button class="btn sec tx-cont" data-act="_ir" data-id="tributos/contador">'+UI.ic('empresa')+'Área do contador</button></div>';
  h+='<div class="tx-ex">'+UI.ic('alerta')+'<span>Cálculo com percentuais de <b>exemplo</b>. O contador confirma as alíquotas; os impostos das compras ficam reais com as notas (XML).</span></div>';
  h+='<div class="tx-per">'+opcoes.map(function(m){ return '<button class="'+(m===ym?'on':'')+'" data-act="mes" data-id="'+m+'">'+nomeMes(m,true).replace(/^./,function(c){ return c.toUpperCase(); })+' '+m.slice(0,4)+(m===ymHoje?'<small>até hoje</small>':'<small>mês fechado</small>')+'</button>'; }).join('')+'</div>';

  /* resumo por empresa */
  h+='<div class="tx-res">'+res.map(function(x){ var c=x.c, e=x.e; return '<div class="tx-e"><div class="t"><b>'+esc(e.fantasia)+'</b><span class="tx-reg '+c.tipo+'">'+esc(e.regime)+'</span></div>'+
    '<div class="nums"><div><span>Vendas</span><b>'+F.moedaK(c.V)+'</b></div><div class="im"><span>Imposto</span><b>'+F.moedaK(c.total)+'</b></div><div><span>Efetivo</span><b>'+pc(c.pct)+'</b></div></div>'+barra(c.pct)+'</div>'; }).join('')+'</div>';

  /* Lucro Real */
  res.filter(function(x){ return x.c.tipo==='real'; }).forEach(function(x){ var c=x.c, p=c.p;
    function linha(nm, sub, o){ return '<div class="tx-l"><div class="nm"><b>'+nm+'</b><small>'+sub+'</small></div><div class="v"><span>Nas vendas</span><b>'+F.moeda(o.deb)+'</b></div><div class="op">−</div><div class="v cr"><span>Crédito compras</span><b>'+F.moeda(o.cred)+'</b></div><div class="op">=</div><div class="v pg"><span>A pagar</span><b>'+F.moeda(o.pagar)+'</b></div></div>'; }
    h+='<div class="tx-q">'+cab('LR','#E08A1E',esc(x.e.fantasia)+' · Lucro Real','Imposto das vendas − crédito das compras = valor a pagar','lr')+
      ajuda('lr','No <b>Lucro Real</b> a empresa paga imposto sobre o que vende, mas pode <b>descontar</b> o imposto que já veio nas compras de ingredientes e embalagens (o crédito). Por isso comprar com nota fiscal reduz o imposto. O IRPJ e a CSLL são calculados sobre o <b>lucro</b>, não sobre a venda.<br><small>Exemplo: compras estimadas em '+F.num(p.cmv)+'% das vendas e lucro de '+F.num(p.lucro)+'% das vendas.</small>')+
      '<div class="tx-dc">'+linha('PIS','federal · '+F.num(p.pis,2)+'%',c.pis)+linha('COFINS','federal · '+F.num(p.cofins,2)+'%',c.cofins)+linha('ICMS','estadual · '+F.num(p.icmsVenda)+'% vendas, '+F.num(p.icmsCompra)+'% compras',c.icms)+
      '<div class="tx-l"><div class="nm"><b>IRPJ + CSLL</b><small>sobre o lucro · '+F.num(p.irpj)+'% (+'+F.num(p.adicional)+'% acima de R$ 20 mil) e '+F.num(p.csll)+'%</small></div><div class="v"><span>Lucro do mês</span><b>'+F.moeda(c.L)+'</b></div><div class="op"></div><div class="v"><span>IRPJ</span><b>'+F.moeda(c.irpj)+'</b></div><div class="op"></div><div class="v pg"><span>CSLL</span><b>'+F.moeda(c.csll)+'</b></div></div></div>'+
      '<div class="tx-tot"><span>Total de impostos em '+nomeMes(ym)+(parcial?' (até hoje)':'')+'</span><b>'+F.moeda(c.total)+'</b></div></div>'; });

  /* Simples */
  res.filter(function(x){ return x.c.tipo==='simples'; }).forEach(function(x){ var c=x.c, lim=4800000, sub=3600000;
    var cores=['#BFDBFE','#93C5FD','#60A5FA','#3B82F6','#2563EB','#1D4ED8'];
    var rg=ANEXO_I.map(function(f,i){ var de=i?ANEXO_I[i-1][0]:0; return '<div style="width:'+((f[0]-de)/lim*100)+'%;background:'+cores[i]+'" title="Faixa '+(i+1)+'"></div>'; }).join('');
    var pos=Math.min(100,c.rbt/lim*100);
    h+='<div class="tx-q">'+cab('SN','#1D4ED8',esc(x.e.fantasia)+' · Simples Nacional','Como a guia do mês (DAS) é calculada · Anexo I','sn')+
      ajuda('sn','No <b>Simples Nacional</b> a empresa paga <b>uma guia só (o DAS)</b>, que junta vários impostos. O percentual depende de quanto a empresa faturou nos <b>últimos 12 meses</b>: quanto mais fatura, maior a faixa. Não existe crédito das compras. O limite do Simples é R$ 4,8 milhões por ano; acima de R$ 3,6 milhões o ICMS passa a ser pago fora do DAS.')+
      '<div class="tx-ps">'+
        '<div class="tx-p"><i>1</i><span>Faturamento 12 meses</span><b>'+F.moedaK(c.rbt)+'</b><small>'+(c.meses<12?'estimado com '+c.meses+' meses de vendas':'soma dos últimos 12 meses')+'</small></div>'+
        '<div class="tx-p"><i>2</i><span>Faixa do Anexo I</span><b>Faixa '+(c.faixa+1)+'</b><small>de '+F.moedaK(c.de)+' a '+F.moedaK(c.ate)+' · alíquota '+F.num(c.nominal,1)+'%</small></div>'+
        '<div class="tx-p"><i>3</i><span>Alíquota efetiva</span><b>'+pc(c.efetiva)+'</b><small>(12 meses × '+F.num(c.nominal,1)+'% − '+F.moedaK(c.deduzir)+') ÷ 12 meses</small></div>'+
        '<div class="tx-p fim"><i>4</i><span>DAS de '+nomeMes(ym,true)+'</span><b>'+F.moeda(c.das)+'</b><small>vendas do mês '+F.moedaK(c.V)+' × '+pc(c.efetiva)+'</small></div></div>'+
      '<div class="tx-fx"><div class="rg">'+rg+'</div><div class="mk"><span style="left:'+pos+'%">você está aqui</span></div><div class="lg"><span style="left:0">R$ 0</span><span style="left:75%;transform:translateX(-50%)">R$ 3,6 mi (ICMS fora)</span><span style="right:0">R$ 4,8 mi (limite)</span></div></div></div>'; });

  /* gráfico 6 meses */
  var meses6=[]; for(var i=6;i>=1;i--){ var m=ymAdd(ymHoje,-i); if(todos.indexOf(m)>=0) meses6.push(m); }
  h+='<div class="tx-q">'+cab('📊','#1C1C1E','Impostos dos últimos meses','Total calculado por mês e por empresa','')+'<div id="tx-g6"></div></div>';

  /* calendário de guias (competência escolhida, pagas no mês seguinte) */
  var venc=ymAdd(ym,1), guias=[];
  res.forEach(function(x){ var c=x.c, nm=x.e.fantasia;
    if(c.tipo==='simples') guias.push({dia:20, nome:'DAS · Simples Nacional', emp:nm, v:c.das});
    else { guias.push({dia:20, nome:'ICMS', emp:nm, v:c.icms.pagar}); guias.push({dia:25, nome:'PIS e COFINS', emp:nm, v:c.pis.pagar+c.cofins.pagar}); guias.push({dia:ultimoDia(venc), nome:'IRPJ e CSLL', emp:nm, v:c.irpj+c.csll}); } });
  guias.sort(function(a,b){ return a.dia-b.dia; });
  h+='<div class="tx-q">'+cab('📅','#1C1C1E','Guias para pagar','Referentes a '+nomeMes(ym)+' · vencem em '+nomeMes(venc),'')+
    (parcial?'<div class="tx-exp" style="margin-bottom:10px">O mês ainda não fechou: os valores vão crescer até o fim de '+nomeMes(ym,true)+'.</div>':'')+
    '<div class="tx-cal">'+guias.map(function(g){ var data=venc+'-'+(g.dia<10?'0':'')+g.dia, pago=data<hoje, dias=Math.round((new Date(data+'T12:00:00')-new Date(hoje+'T12:00:00'))/864e5);
      return '<div class="tx-g"><div class="dt"><b>'+g.dia+'</b><small>'+MC[+venc.slice(5,7)-1]+'</small></div><span><b>'+esc(g.nome)+'</b><small>'+esc(g.emp)+'</small></span><div style="text-align:right"><strong>'+F.moeda(g.v)+'</strong><br><span class="tx-sit '+(pago?'ok':'ap')+'">'+(pago?'Pago':dias<=0?'Vence hoje':'Vence em '+dias+(dias===1?' dia':' dias'))+'</span></div></div>'; }).join('')+'</div></div>';

  /* compras (XML) */
  var lim30=LFI.dataUtil.D(-29), tipos={icms:0,st:0,ipi:0,pis:0,cofins:0}, vComp=0;
  LFI.db.notas.forEach(function(n){ if(n.status!=='lancada'||!LFI.empresaVisivel(n.empresa)) return; var d=n.entrada||n.emissao; if(d<lim30) return; n.itens.forEach(function(it){ vComp+=it.vProd; tipos.icms+=it.icms.v; tipos.st+=it.st.v; tipos.ipi+=it.ipi.v; tipos.pis+=it.pis.v; tipos.cofins+=it.cofins.v; }); });
  var tImp=0; Object.keys(tipos).forEach(function(k){ tImp+=tipos[k]; });
  var NOM={icms:['ICMS','imposto do estado'],st:['ICMS-ST','cobrado antes, pelo fornecedor'],ipi:['IPI','imposto da indústria'],pis:['PIS','federal'],cofins:['COFINS','federal']};
  h+='<div class="tx-q">'+cab('🧾','#1C1C1E','Impostos que vieram nas compras','Notas fiscais lançadas nos últimos 30 dias · '+F.moeda(vComp)+' em produtos, '+F.moeda(tImp)+' de impostos','cp')+
    ajuda('cp','Esses valores vêm direto do <b>XML das notas fiscais</b> dos fornecedores. Na padaria (Lucro Real) parte deles vira <b>crédito</b>, que reduz o imposto a pagar.')+
    '<div class="tx-tipos">'+Object.keys(tipos).filter(function(k){ return tipos[k]>0; }).map(function(k){ return '<div class="tx-t"><span>'+NOM[k][0]+'</span><b>'+F.moeda(tipos[k])+'</b><small>'+NOM[k][1]+'</small></div>'; }).join('')+'</div></div>';

  /* glossário */
  h+='<div class="tx-q">'+cab('?','#A1A1AA','O que é cada imposto','','gl')+(s.ab.gl?'<div class="tx-gl">'+[
      ['PIS e COFINS','Impostos federais sobre o faturamento. No Lucro Real dão crédito nas compras.'],['ICMS','Imposto do estado sobre a circulação de mercadorias. Débito nas vendas, crédito nas compras.'],
      ['IRPJ e CSLL','Impostos sobre o lucro da empresa (Lucro Real).'],['DAS','Guia única mensal do Simples Nacional, que junta vários impostos num percentual.'],
      ['ICMS-ST','Substituição tributária: o fornecedor já cobrou o ICMS de toda a cadeia (comum em bebidas).'],['Reforma tributária','CBS e IBS vão substituir PIS, COFINS, ICMS e ISS aos poucos nos próximos anos.']
    ].map(function(g){ return '<div class="tx-gi"><b>'+g[0]+'</b>'+g[1]+'</div>'; }).join('')+'</div>':'<p style="margin:0;font-size:13.5px;color:var(--muted2);font-weight:600">Toque no "?" para ver uma explicação curta de cada imposto.</p>')+'</div>';
  h+='</div>';
  el.innerHTML=h;
  if(meses6.length){ UI.grafBarras(el.querySelector('#tx-g6'),{cats:meses6.map(function(m){ return nomeMes(m,true); }), empilhado:true, altura:230,
    series:emps.map(function(e){ var d=/simples/i.test(e.regime)?'res':'pad'; return {nome:e.fantasia, cor:COR[d]||'#71717A', valores:meses6.map(function(m){ return Math.round(calc(e,m).total); })}; })}); }
  UI.liga(el, UI.navHandlers({
    mes:function(m){ s.mes=m; LFI.recarregar(); },
    aj:function(id){ s.ab[id]=!s.ab[id]; LFI.recarregar(); }
  }));
}
LFI.registrar('tributos',{titulo:'Tributário', render:render});
})();
