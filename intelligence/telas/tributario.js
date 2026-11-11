/* LivePro — TRIBUTÁRIO didático (visual).
   Três perguntas simples, cada uma com explicação em português:
   1) Quanto pago de imposto nas vendas?  2) Quanto de imposto veio nas compras?  3) Tenho crédito para recuperar?
   Os percentuais são EXEMPLOS até o contador confirmar o regime e as alíquotas.
   A tela técnica antiga (regras, NCM, classificação) continua como "Área do contador" (tributos/contador). */
(function(){
'use strict';
var UI=LFI.ui, F=LFI.fmt, esc=UI.esc;
var antigo=LFI.telas.tributos;   /* tela técnica: vira Área do contador */
function st(){ return LFI.estado.trib2=LFI.estado.trib2||{per:'mes', ab:{}}; }
var NOMES={icms:['ICMS','Imposto do estado (SP)'], st:['ICMS-ST','ICMS cobrado antes, pelo fornecedor'], ipi:['IPI','Imposto da indústria'], pis:['PIS','Imposto federal'], cofins:['COFINS','Imposto federal']};
var COR={icms:'#1C1C1E', st:'#B08A00', ipi:'#FF5A00', pis:'#1D4ED8', cofins:'#0891B2'};

function css(){ if(document.getElementById('css-trib2')) return; var c=document.createElement('style'); c.id='css-trib2'; c.textContent=
  '.tx{max-width:980px;margin:0 auto;padding-bottom:40px}'+
  '.tx-hd{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:12px}.tx-hd>div{flex:1;min-width:240px}.tx-hd h1{font-size:24px;margin:0}.tx-hd small{display:block;color:var(--muted);font-weight:700;font-size:13.5px;margin-top:2px}'+
  '.tx-cont{min-height:48px;border-radius:14px;padding:0 16px;font-size:14.5px}'+
  '.tx-ex{display:flex;gap:10px;align-items:center;background:#FEF3C7;color:#5C4300;border-radius:14px;padding:10px 14px;font-size:13.5px;font-weight:700;margin-bottom:12px}.tx-ex svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;flex:none}'+
  '.tx-per{display:flex;gap:6px;margin-bottom:14px}.tx-per button{flex:1;min-height:46px;border-radius:14px;border:1.5px solid var(--border2);background:#fff;font:inherit;font-size:14.5px;font-weight:800;cursor:pointer}.tx-per button.on{background:var(--text);color:#fff;border-color:var(--text)}'+
  '.tx-q{background:#fff;border:1px solid var(--border);border-radius:20px;padding:18px 20px;margin-bottom:14px;box-shadow:var(--sh1)}'+
  '.tx-qh{display:flex;align-items:center;gap:12px;margin-bottom:12px}.tx-qh .n{width:34px;height:34px;border-radius:50%;background:var(--roxo);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;flex:none}.tx-qh h2{flex:1;font-size:18px;margin:0;line-height:1.25}'+
  '.tx-aj{width:34px;height:34px;border-radius:50%;border:1.5px solid var(--border2);background:#fff;font:inherit;font-weight:800;font-size:15px;color:var(--muted2);cursor:pointer;flex:none}.tx-aj.on{background:var(--text);color:#fff;border-color:var(--text)}'+
  '.tx-exp{background:var(--s2);border-radius:14px;padding:12px 14px;font-size:14px;line-height:1.5;color:var(--texto2,#3F3F46);margin-bottom:12px}.tx-exp b{color:var(--text)}'+
  '.tx-big{font-size:17px;font-weight:700;color:var(--muted2);margin-bottom:10px}.tx-big b{font-size:34px;color:var(--text);letter-spacing:-.02em;margin:0 4px}'+
  '.tx-bar{height:30px;border-radius:10px;overflow:hidden;display:flex;font-size:12px;font-weight:800;color:#fff;margin-bottom:6px}.tx-bar>div{display:flex;align-items:center;justify-content:center;white-space:nowrap;overflow:hidden}.tx-bar .im{background:#DC2626}.tx-bar .fi{background:#16A34A}.tx-leg{display:flex;gap:14px;font-size:12.5px;font-weight:700;color:var(--muted2);margin-bottom:12px;flex-wrap:wrap}.tx-leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}'+
  '.tx-emp{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.tx-e{border:1.5px solid var(--border);border-radius:16px;padding:12px 14px}.tx-e b{display:block;font-size:15px}.tx-e small{display:block;font-size:12.5px;color:var(--muted);font-weight:700}.tx-e .v{display:flex;justify-content:space-between;align-items:baseline;margin-top:8px;font-size:13.5px;font-weight:700;color:var(--muted2)}.tx-e .v strong{font-size:18px;color:var(--text)}.tx-e .pc{display:inline-block;margin-top:6px;border-radius:8px;padding:3px 8px;background:#FEE2E2;color:#991B1B;font-size:12px;font-weight:800}'+
  '.tx-tipos{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:12px}.tx-t{border-radius:14px;background:var(--s2);padding:10px 12px}.tx-t span{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800}.tx-t span i{width:9px;height:9px;border-radius:3px}.tx-t b{display:block;font-size:17px;margin-top:2px}.tx-t small{font-size:11.5px;color:var(--muted);font-weight:700}'+
  '.tx-fl{display:flex;flex-direction:column;gap:6px}.tx-f{display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:12px;padding:9px 12px}.tx-f span{flex:1;min-width:0}.tx-f b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tx-f small{font-size:12px;color:var(--muted);font-weight:700}.tx-f strong{font-size:14.5px}'+
  '.tx-cr{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.tx-c{border-radius:16px;padding:14px;border:1.5px solid var(--border)}.tx-c.sim{border-color:#BBE5C8;background:#F3FBF5}.tx-c.nao{background:var(--s2)}.tx-c .r{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:800;border-radius:999px;padding:4px 10px;margin:6px 0}.tx-c.sim .r{background:#16A34A;color:#fff}.tx-c.nao .r{background:#E4E4E7;color:#3F3F46}.tx-c b{display:block;font-size:15px}.tx-c small{display:block;font-size:12.5px;color:var(--muted);font-weight:700;line-height:1.4}.tx-c strong{display:block;font-size:22px;margin-top:4px;color:#16A34A}'+
  '.tx-gl{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px}.tx-g{background:var(--s2);border-radius:12px;padding:10px 12px;font-size:13px;line-height:1.45}.tx-g b{display:block;font-size:14px;margin-bottom:2px}'+
  '@media (max-width:700px){.tx-hd h1{font-size:21px}.tx-cont{width:100%}.tx-emp,.tx-cr{grid-template-columns:1fr}.tx-big{font-size:15px}.tx-big b{font-size:24px}.tx-q{padding:16px}}';
  document.head.appendChild(c); }

function porEmpresa(per){
  var emps=LFI.db.empresas.filter(function(e){ return LFI.empresaVisivel(e.id); });
  return emps.map(function(e){
    var deps=LFI.db.departamentos.filter(function(d){ return d.empresa===e.id; }).map(function(d){ return d.id; });
    var vendas=0; LFI.db.vendas.forEach(function(v){ if(v.d>=per.de&&v.d<=per.ate&&deps.indexOf(v.dep)>=0) vendas+=v.valor; });
    var pct=e.impVenda||0;
    var comp={vProd:0, icms:0, st:0, ipi:0, pis:0, cofins:0, cred:0, forn:{}};
    LFI.db.notas.forEach(function(n){ if(n.status!=='lancada'||n.empresa!==e.id) return; var d=n.entrada||n.emissao; if(d<per.de||d>per.ate) return;
      n.itens.forEach(function(it){ comp.vProd+=it.vProd; comp.icms+=it.icms.v; comp.st+=it.st.v; comp.ipi+=it.ipi.v; comp.pis+=it.pis.v; comp.cofins+=it.cofins.v; comp.cred+=LFI.creditoItem(it,n).v;
        var t=it.icms.v+it.st.v+it.ipi.v+it.pis.v+it.cofins.v, f=comp.forn[n.forn]=comp.forn[n.forn]||{v:0,imp:0}; f.v+=it.vProd; f.imp+=t; }); });
    comp.imp=comp.icms+comp.st+comp.ipi+comp.pis+comp.cofins;
    return {e:e, vendas:vendas, pct:pct, impVendas:vendas*pct/100, comp:comp};
  });
}

function render(el, arg){
  if(arg==='contador'&&antigo){ antigo.render(el); var t=el.querySelector('.pghd h1'); if(t) t.textContent='Área do contador'; return; }
  css(); document.body.classList.add('foco');
  var s=st(), per=LFI.periodo(s.per==='90d'?'custom':s.per, s.per==='90d'?LFI.dataUtil.D(-89):null), dados=porEmpresa(per);
  if(s.per==='90d') per.nome='Últimos 90 dias';
  var tv=0, ti=0, tc=0, tci=0, tcr=0, tipos={icms:0,st:0,ipi:0,pis:0,cofins:0}, forn={};
  dados.forEach(function(x){ tv+=x.vendas; ti+=x.impVendas; tc+=x.comp.vProd; tci+=x.comp.imp; tcr+=x.comp.cred; Object.keys(tipos).forEach(function(k){ tipos[k]+=x.comp[k]; });
    Object.keys(x.comp.forn).forEach(function(f){ var o=forn[f]=forn[f]||{v:0,imp:0}; o.v+=x.comp.forn[f].v; o.imp+=x.comp.forn[f].imp; }); });
  function ajuda(id, txt){ return s.ab[id]?'<div class="tx-exp">'+txt+'</div>':''; }
  function cab(n, tit, id){ return '<div class="tx-qh"><span class="n">'+n+'</span><h2>'+tit+'</h2><button class="tx-aj'+(s.ab[id]?' on':'')+'" data-act="aj" data-id="'+id+'" aria-label="Explicar">?</button></div>'; }
  var cada=function(v,t){ return t?Math.round(v/t*1000)/10:0; };

  var h='<div class="tx"><div class="tx-hd"><div><h1>Tributário</h1><small>Entenda, de um jeito simples, quanto do seu dinheiro vai para impostos.</small></div><button class="btn sec tx-cont" data-act="_ir" data-id="tributos/contador">'+UI.ic('empresa')+'Área do contador</button></div>';
  h+='<div class="tx-ex">'+UI.ic('alerta')+'<span>Valores de <b>exemplo</b>. Os percentuais reais serão confirmados pelo contador; os impostos das compras ficam reais quando as notas (XML) forem importadas.</span></div>';
  h+='<div class="tx-per">'+[['mes','Este mês'],['30d','30 dias'],['90d','90 dias']].map(function(x){ return '<button class="'+(s.per===x[0]?'on':'')+'" data-act="per" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>';

  /* 1. vendas */
  var p1=cada(ti,tv);
  h+='<div class="tx-q">'+cab(1,'Quanto pago de imposto nas vendas?','v')+
    ajuda('v','Toda venda tem imposto embutido. Na <b>padaria (Simples Nacional)</b> paga-se uma guia única por mês (o DAS), que é um percentual sobre o que você vende. No <b>restaurante (Lucro Presumido)</b> são vários impostos (PIS, COFINS, IRPJ, CSLL e ICMS) que também somam um percentual sobre as vendas. O contador informa esse percentual.')+
    '<div class="tx-big">De cada <b>R$ 100</b> vendidos, <b>R$ '+p1.toFixed(2).replace('.',',')+'</b> vão para impostos</div>'+
    '<div class="tx-bar"><div class="im" style="width:'+Math.max(p1,14)+'%">'+String(p1).replace('.',',')+'%</div><div class="fi" style="width:'+(100-Math.max(p1,14))+'%">Fica para a empresa '+String(Math.round((100-p1)*10)/10).replace('.',',')+'%</div></div>'+
    '<div class="tx-leg"><span><i style="background:#DC2626"></i>Imposto: '+F.moeda(ti)+'</span><span><i style="background:#16A34A"></i>Vendas no período: '+F.moeda(tv)+'</span></div>'+
    '<div class="tx-emp">'+dados.map(function(x){ return '<div class="tx-e"><b>'+esc(x.e.fantasia)+'</b><small>'+esc(x.e.regime)+' · '+esc(x.e.cnpj)+'</small><span class="pc">'+F.pctN(x.pct,2)+' sobre as vendas (exemplo)</span><div class="v"><span>Vendas</span><strong>'+F.moeda(x.vendas)+'</strong></div><div class="v"><span>Imposto</span><strong style="color:#DC2626">'+F.moeda(x.impVendas)+'</strong></div></div>'; }).join('')+'</div></div>';

  /* 2. compras */
  var p2=cada(tci,tc), lf=Object.keys(forn).map(function(f){ return {f:LFI.forn(f), v:forn[f].v, imp:forn[f].imp}; }).sort(function(a,b){ return b.imp-a.imp; });
  h+='<div class="tx-q">'+cab(2,'Quanto de imposto veio nas compras?','c')+
    ajuda('c','Quando você compra, o preço já vem com impostos que o fornecedor pagou e <b>destacou na nota fiscal</b>. Esse valor sai direto do XML da nota, por isso é um número real (não é estimativa). Ele mostra quanto do que você paga aos fornecedores é imposto.')+
    '<div class="tx-big">De cada <b>R$ 100</b> comprados, <b>R$ '+p2.toFixed(2).replace('.',',')+'</b> eram impostos</div>'+
    '<div class="tx-tipos">'+Object.keys(tipos).filter(function(k){ return tipos[k]>0; }).map(function(k){ return '<div class="tx-t"><span><i style="background:'+COR[k]+'"></i>'+NOMES[k][0]+'</span><b>'+F.moeda(tipos[k])+'</b><small>'+NOMES[k][1]+'</small></div>'; }).join('')+'</div>'+
    (lf.length?'<div class="tx-fl">'+lf.slice(0,5).map(function(x){ return '<div class="tx-f"><span><b>'+esc(x.f?x.f.nome:'—')+'</b><small>Compras '+F.moeda(x.v)+'</small></span><strong>'+F.moeda(x.imp)+'</strong></div>'; }).join('')+'</div>':'<p class="tx-exp" style="margin:0">Nenhuma nota lançada neste período.</p>')+'</div>';

  /* 3. crédito */
  h+='<div class="tx-q">'+cab(3,'Tenho crédito para recuperar?','r')+
    ajuda('r','Em alguns regimes, parte do imposto que veio nas compras pode ser <b>descontada</b> do imposto que você paga nas vendas: isso é o crédito. No <b>Simples Nacional</b> não há esse desconto. No <b>Lucro Presumido</b> só alguns itens dão crédito de ICMS (PIS e COFINS não dão). Quem confirma é o contador.')+
    '<div class="tx-cr">'+dados.map(function(x){ var simples=/simples/i.test(x.e.regime), tem=!simples&&x.comp.cred>0;
      return '<div class="tx-c '+(tem?'sim':'nao')+'"><b>'+esc(x.e.fantasia)+'</b><span class="r">'+(tem?'✓ Sim':'✕ Não')+'</span><small>'+(simples?'No Simples Nacional o imposto das compras não vira crédito.':tem?'Crédito de ICMS das compras que podem ser descontadas.':'Nenhuma compra com crédito neste período.')+'</small>'+(tem?'<strong>'+F.moeda(x.comp.cred)+'</strong>':'')+'</div>'; }).join('')+'</div></div>';

  /* glossário */
  h+='<div class="tx-q">'+cab('?','O que é cada imposto','g')+(s.ab.g?'<div class="tx-gl">'+[
      ['ICMS','Imposto do estado sobre a circulação de mercadorias. Vem nas notas de compra e incide nas vendas.'],
      ['ICMS-ST','"Substituição tributária": o fornecedor já cobra o ICMS de toda a cadeia (comum em bebidas).'],
      ['IPI','Imposto federal sobre produtos industrializados (ex.: algumas embalagens).'],
      ['PIS e COFINS','Impostos federais sobre o faturamento.'],
      ['DAS (Simples)','Guia única mensal do Simples Nacional, que junta vários impostos num só percentual.'],
      ['Reforma tributária','Nos próximos anos CBS e IBS vão substituir PIS, COFINS, ICMS e ISS aos poucos. A tela vai acompanhar.']
    ].map(function(g){ return '<div class="tx-g"><b>'+g[0]+'</b>'+g[1]+'</div>'; }).join('')+'</div>':'<p class="pp-dica" style="margin:0;color:var(--muted2);font-weight:600">Toque no "?" para ver uma explicação curta de cada imposto.</p>')+'</div>';
  h+='</div>';
  el.innerHTML=h;
  UI.liga(el, UI.navHandlers({
    per:function(id){ s.per=id; LFI.recarregar(); },
    aj:function(id){ s.ab[id]=!s.ab[id]; LFI.recarregar(); }
  }));
}
LFI.registrar('tributos',{titulo:'Tributário', render:render});
})();
