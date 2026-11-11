/* LiveFood Intelligence — BUFFET E PESAGEM INTELIGENTE
   Etapa 1 abertura (pesagem com balança simulada) → etapa 2 acompanhamento (consumo, reposições, alertas)
   → etapa 3 encerramento (peso final, temperatura, horário, condição, destino) → aprovação de segurança
   alimentar → sobras aprovadas entram no estoque. Relatório de perdas e aproveitamento. */
(function(){
'use strict';
var LFI=window.LFI, UI=LFI.ui, F=LFI.fmt, esc=UI.esc;
var r2=LFI.dataUtil.r2, r3=LFI.dataUtil.r3, D=LFI.dataUtil.D;
var CATS=[{nome:'Sushi', recs:['r12','r13','r10','r11','r09']},{nome:'Acompanhamentos', recs:['r15','r16','r14']}];
var PRESET={r12:8.5, r13:4.0, r10:5.2, r11:4.0, r09:3.0, r14:6.0, r15:3.0, r16:2.5};
var TAXA={r12:0.92, r13:0.38, r10:0.58, r11:0.46, r09:0.27, r14:0.52, r15:0.17, r16:0.16}; /* kg por 30 min no pico */
var CURVA=[0.5,1.05,1.4,1.5,1.35,1.05,0.7,0.45,0.3,0.25];
var CONDS=['Câmara fria','Resfriador rápido','Balcão refrigerado','Ambiente'];
var ETAPAS=['Abertura','Acompanhamento','Encerramento','Aprovação e estoque'];
var CHECK=['Temperatura das sobras medida com termômetro calibrado','Sobras reaproveitáveis em recipientes fechados e etiquetados (produto, data, hora e responsável)','Itens reaproveitáveis sem contato com o cliente (reposição por trás do balcão)','Resfriamento rápido concluído dentro do prazo da regra','Descartes e perdas pesados e registrados'];
var relogio=null;

function st(){ return LFI.estado.buffet = LFI.estado.buffet || {aba:'operacao', ab:null}; }
function css(){
  if(document.getElementById('css-buffet')) return;
  var s=document.createElement('style'); s.id='css-buffet';
  s.textContent=
  '.bf-x .inp.xl{font-size:20px;padding:12px 14px;min-height:52px;font-weight:800;font-variant-numeric:tabular-nums}'+
  '.bf-x .btn.lg{min-height:52px;font-size:15px;padding:12px 20px;border-radius:12px}'+
  '.bf-x .btn.md{min-height:44px;font-size:13.5px;padding:10px 14px}'+
  '.bf-x .bf-grid{grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}'+
  '.bf-x .bf-it .em{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:26px;flex:none}'+
  '.bf-x .bf-it .hd{align-items:center}'+
  '.bf-x .bf-it .hd .gr{flex:1;min-width:0}'+
  '.bf-x .bf-it.off{opacity:.5}'+
  '.bf-x .bf-it.sel{border-color:var(--roxo);box-shadow:0 0 0 3px rgba(255,90,0,.10)}'+
  '.bf-tg{width:30px;height:30px;border-radius:9px;border:2px solid var(--border2);background:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;cursor:pointer;flex:none;font-size:15px}'+
  '.bf-it.sel .bf-tg{background:var(--roxo);border-color:var(--roxo)}'+
  '.bf-x .balanca{margin:10px 0}'+
  '.balanca .v{flex:1;text-align:right}'+
  '.balanca.lendo{color:#FDE68A}.balanca.ok{color:#7CFC9A}'+
  '.bf-row{display:flex;gap:8px;align-items:stretch}'+
  '.bf-row .inp{flex:1;min-width:0}'+
  '.bf-scale{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:800;color:#166534;background:#EAF8EF;border:1px solid #BBE5C8;border-radius:99px;padding:6px 12px}'+
  '.bf-scale i{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px rgba(22,163,74,.2)}'+
  '.bf-sum{position:sticky;bottom:12px;z-index:5;display:flex;gap:18px;align-items:center;flex-wrap:wrap;background:#1C1C1E;color:#fff;border-radius:16px;padding:14px 18px;box-shadow:var(--sh3);margin-top:16px}'+
  '.bf-sum div span{display:block;font-size:10.5px;font-weight:800;color:#B9B9C0;text-transform:uppercase;letter-spacing:.4px}'+
  '.bf-sum div b{font-size:19px;font-variant-numeric:tabular-nums}'+
  '.bf-sum .sp{flex:1}'+
  '.bf-seg{display:flex;gap:8px}'+
  '.bf-seg button{flex:1;min-height:52px;border-radius:12px;border:1.5px solid var(--border2);background:#fff;font:inherit;font-size:15px;font-weight:800;cursor:pointer;color:var(--texto2)}'+
  '.bf-seg button.on{background:var(--text);color:#fff;border-color:var(--text)}'+
  '.bf-seg button:disabled{opacity:.4;cursor:not-allowed;text-decoration:line-through}'+
  '.bf-seg.dest button.on[data-id="reaproveitar"]{background:var(--green);border-color:var(--green)}'+
  '.bf-seg.dest button.on[data-id="descarte"]{background:var(--red);border-color:var(--red)}'+
  '.bf-seg.dest button.on[data-id="perda"]{background:#946C00;border-color:#946C00}'+
  '.bf-clock{font-size:34px;font-weight:800;letter-spacing:-.5px;font-variant-numeric:tabular-nums}'+
  '.bf-open{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center}'+
  '.bf-cta{background:linear-gradient(135deg,#1C1C1E,#33333A);color:#fff;border-radius:var(--r);padding:24px 26px;display:flex;justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap}'+
  '.bf-cta h2{margin:0 0 4px;font-size:21px;font-weight:800}.bf-cta p{margin:0;color:#C9C9CF;font-size:13.5px;font-weight:600;max-width:560px;line-height:1.5}'+
  '.bf-cta .btn{min-height:56px;font-size:16px;padding:14px 26px;border-radius:14px}'+
  '.bf-emos{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.bf-emos span{width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font-size:18px}'+
  '.bf-enc{background:var(--s1);border:1px solid var(--border);border-radius:16px;padding:16px 18px;display:grid;grid-template-columns:230px minmax(0,1fr);gap:18px}'+
  '.bf-enc+.bf-enc{margin-top:12px}'+
  '.bf-enc.reap{border-color:#BBE5C8}.bf-enc.desc{border-color:#F5C2C2}'+
  '.bf-enc .lado .pesos{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px}'+
  '.bf-enc .lado .pesos div{background:var(--s3);border-radius:9px;padding:6px 8px}'+
  '.bf-enc .lado .pesos span{display:block;font-size:9.5px;font-weight:800;color:var(--muted);text-transform:uppercase}'+
  '.bf-enc .lado .pesos b{font-size:14px;font-variant-numeric:tabular-nums}'+
  '.bf-enc .fgrid{grid-template-columns:repeat(3,minmax(0,1fr))}'+
  '.bf-enc .field{margin-bottom:10px}'+
  '.bf-regra{font-size:11.5px;font-weight:700;line-height:1.45;border-radius:10px;padding:8px 10px;margin-top:10px}'+
  '.bf-regra.ok{background:#EAF8EF;color:#166534}.bf-regra.no{background:var(--r-soft);color:#991B1B}'+
  '.bf-chk label{display:flex;gap:12px;align-items:flex-start;padding:12px 4px;border-bottom:1px solid var(--border);font-size:14px;font-weight:700;cursor:pointer}'+
  '.bf-chk input{width:24px;height:24px;accent-color:var(--green);flex:none}'+
  '.bf-alr{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;background:var(--r-soft);color:#991B1B;font-weight:800;font-size:13.5px}'+
  '.bf-alr+.bf-alr{margin-top:8px}.bf-alr.at{background:var(--a-soft);color:#7A5A00}'+
  '.bf-alr .sp{flex:1}'+
  '.bf-alr svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}'+
  '.bf-x .bf-it .pesos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px}'+
  '@media (max-width:1100px){.bf-enc{grid-template-columns:minmax(0,1fr)}.bf-open{grid-template-columns:minmax(0,1fr)}}'+
  '@media (max-width:700px){.bf-enc .fgrid{grid-template-columns:minmax(0,1fr)}}';
  document.head.appendChild(s);
}

/* ---------- utilidades ---------- */
function kg(v){ return v==null||isNaN(v)?'—':Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2})+' kg'; }
function kg3(v){ return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:3,maximumFractionDigits:3}); }
function minutos(hm){ var a=String(hm||'0:0').split(':'); return (+a[0])*60+(+a[1]||0); }
function hm(min){ min=((Math.round(min)%1440)+1440)%1440; return (min/60<10?'0':'')+Math.floor(min/60)+':'+(min%60<10?'0':'')+(min%60); }
function decorrido(b){ var real=b.abTs?Math.max(0,Date.now()-b.abTs):0; return real+(b.simMin||0)*60000; }
function horaOper(b){ return hm(minutos(b.abertura)+decorrido(b)/60000); }
function dur(ms){ var s=Math.floor(ms/1000), h=Math.floor(s/3600), m=Math.floor(s%3600/60), x=s%60; return (h<10?'0':'')+h+':'+(m<10?'0':'')+m+':'+(x<10?'0':'')+x; }
function regraDe(rec){ var r=null; LFI.db.regrasSobra.forEach(function(g){ if(g.receitas.indexOf(rec)>=0) r=g; }); return r; }
function catDe(rec){ for(var i=0;i<CATS.length;i++) if(CATS[i].recs.indexOf(rec)>=0) return CATS[i].nome; return 'Outros'; }
function reposKg(it){ var t=0; (it.repos||[]).forEach(function(r){ t+=r.kg; }); return r2(t); }
function dispKg(it){ return r2(it.pesoIni+reposKg(it)); }
function consKg(it){ return it.pesoFinal!=null&&it.pesoFinal!==''?r2(dispKg(it)-it.pesoFinal):r2(it.cons||0); }
function restKg(it){ return r2(Math.max(0,dispKg(it)-(it.cons||0))); }
function visiveis(){ return LFI.db.buffets.filter(function(b){ return LFI.empresaVisivel(b.empresa); }); }
function totais(b){ var t={ini:0, rep:0, disp:0, cons:0, rest:0, custoCons:0}; b.itens.forEach(function(it){ t.ini+=it.pesoIni; t.rep+=reposKg(it); t.disp+=dispKg(it); t.cons+=consKg(it); t.rest+=Math.max(0,dispKg(it)-consKg(it)); t.custoCons+=consKg(it)*LFI.custoKgBuffet(it.rec); }); for(var k in t) t[k]=r2(t[k]); return t; }
function balancaHTML(id, v, lbl){ return '<div class="balanca'+(v?' ok':'')+'" id="'+id+'"><small>'+(lbl||(v?'ESTÁVEL':'BALANÇA'))+'</small><span class="v">'+(v?kg3(v):'– – –')+'</span><small>kg</small></div>'; }
/* simula a leitura da balança: oscila e estabiliza no valor */
function lerBalanca(box, alvo, cb){
  if(!box){ cb(alvo); return; }
  box.classList.remove('ok'); box.classList.add('lendo'); var lb=box.querySelector('small'), v=box.querySelector('.v'); lb.textContent='LENDO…';
  var n=0, N=16, t=setInterval(function(){ n++; var ruido=(1-n/N)*Math.max(0.35,alvo*0.22), x=n>=N?alvo:Math.max(0,alvo+(Math.random()*2-1)*ruido);
    if(!box.isConnected){ clearInterval(t); return; } v.textContent=kg3(x);
    if(n>=N){ clearInterval(t); box.classList.remove('lendo'); box.classList.add('ok'); lb.textContent='ESTÁVEL'; cb(alvo); } },70);
}
function alvoLeitura(base){ return Math.max(0, Math.round((base+(Math.random()*0.06-0.03))*200)/200); }

/* ================= ROTEAMENTO ================= */
function render(el, arg){
  css(); if(relogio){ clearInterval(relogio); relogio=null; }
  el.classList.add('bf-x');
  if(arg==='novo') return abertura(el);
  if(arg){ var b=LFI.buffet(arg); if(b){ if(b.status==='aberto') return acompanhamento(el,b); if(b.status==='encerramento') return b.etapa==='aprovacao'?aprovacao(el,b):encerramento(el,b); return relatorioBuffet(el,b); } }
  principal(el);
}

/* ================= TELA PRINCIPAL ================= */
function principal(el){
  var s=st(), ls=visiveis().slice().sort(function(a,b){ return (b.data+b.abertura)>(a.data+a.abertura)?1:-1; });
  var abertos=ls.filter(function(b){ return b.status!=='encerrado'; }), enc=ls.filter(function(b){ return b.status==='encerrado'; });
  var mes=LFI.hoje().slice(0,7), doMes=ls.filter(function(b){ return b.data.slice(0,7)===mes; }), encMes=doMes.filter(function(b){ return b.status==='encerrado'; });
  var A={disp:0, cons:0, cli:0, perdas:0, reap:0}; encMes.forEach(function(b){ var r=LFI.resumoBuffet(b); A.disp+=r.disp; A.cons+=r.consumo; A.cli+=b.clientes||0; A.perdas+=r.vDesc+r.vPerda; A.reap+=r.vReap; });
  var turno=new Date().getHours()<16?'almoço':'jantar', susOk=LFI.depVisivel('res');
  var h=UI.cabecalho({titulo:'Buffet e Pesagem Inteligente', sub:'Buffet por quilo · '+F.moeda(LFI.db.buffetPrecoKg)+'/kg · balança integrada (simulação) e controle de sobras com regras de segurança alimentar',
    acoes:'<button class="btn sec" data-act="aba" data-id="relatorio">'+UI.ic('relatorio')+'Relatório de perdas</button>'+(susOk?'<button class="btn pri" data-act="novo">'+UI.ic('mais')+'Abrir buffet</button>':'')});
  h+='<div class="tabs"><button class="'+(s.aba==='operacao'?'on':'')+'" data-act="aba" data-id="operacao">Operação'+(abertos.length?' <span class="n">'+abertos.length+' aberto</span>':'')+'</button><button class="'+(s.aba==='relatorio'?'on':'')+'" data-act="aba" data-id="relatorio">Relatório de perdas e aproveitamento</button><button class="'+(s.aba==='regras'?'on':'')+'" data-act="aba" data-id="regras">Regras de conservação <span class="n">'+LFI.db.regrasSobra.length+'</span></button></div>';
  h+='<div class="kpis">'+
    UI.kpi({lb:'Buffets no mês', vl:String(doMes.length), dl:encMes.length+' encerrado(s) · '+(doMes.length-encMes.length)+' em andamento'})+
    UI.kpi({lb:'Consumo médio por cliente', vl:A.cli?F.num(A.cons/A.cli*1000,0)+' <small>g</small>':'—', dl:A.cli?F.num(A.cli,0)+' clientes · '+kg(A.cons):'sem buffets encerrados'})+
    UI.kpi({lb:'Aproveitamento', vl:A.disp?F.pct(A.cons/A.disp):'—', dl:'consumido ÷ disponível', hl:true})+
    UI.kpi({lb:'<span style="color:var(--red)">●</span> Perdas do buffet', vl:F.moeda(A.perdas), dl:'descartes e perdas ao custo · reaproveitado '+F.moeda(A.reap)})+
  '</div>';
  if(s.aba==='relatorio'){ el.innerHTML=h+relatorioGeralHTML(enc); relatorioGeral(el, enc); ligaPrincipal(el); return; }
  if(s.aba==='regras'){ el.innerHTML=h+regrasHTML(); ligaPrincipal(el); return; }

  if(!susOk) h+=UI.nota('O buffet de sushi por quilo é operado no <b>Dourado Restaurante</b>. Selecione essa empresa ou a visão consolidada no topo para abrir um buffet.','wt');
  abertos.forEach(function(b){ var t=totais(b), al=b.itens.filter(function(it){ return b.status==='aberto'&&restKg(it)<it.pesoIni*0.25; }).length;
    h+='<div class="card mb"><div class="bf-open"><div><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:6px"><b style="font-size:18px">'+esc(b.num)+' · '+esc(b.turno)+'</b>'+UI.status('bf',b.status)+UI.dep(b.dep)+(al?UI.badge(al+' alerta(s) de reposição','no'):'')+'</div>'+
      '<div style="font-size:13px;color:var(--muted);font-weight:700">Aberto às '+esc(b.abertura)+' por '+esc(b.resp)+' · '+b.itens.length+' itens · '+F.num(b.clientes||0,0)+' clientes</div>'+
      '<div class="kv c4" style="margin-top:14px"><div><span>Tempo de operação</span><b class="relogio" data-bf="'+b.id+'">'+dur(decorrido(b))+'</b></div><div><span>Disponível</span><b>'+kg(t.disp)+'</b></div><div><span>Consumido</span><b>'+kg(t.cons)+' <small>'+F.pct(t.disp?t.cons/t.disp:0,0)+'</small></b></div><div><span>Receita estimada</span><b>'+F.moeda(t.cons*LFI.db.buffetPrecoKg)+'</b></div></div>'+
      '<div style="margin-top:12px">'+UI.bar(t.disp?t.cons/t.disp:0,'lg')+'</div></div>'+
      '<div><button class="btn pri lg" data-act="_ir" data-id="buffet/'+b.id+'">'+(b.status==='aberto'?UI.ic('balanca')+'Acompanhar buffet':UI.ic('check')+'Continuar encerramento')+'</button></div></div></div>'; });
  if(!abertos.length&&susOk) h+='<div class="bf-cta mb"><div><h2>Abrir buffet do '+turno+'</h2><p>Registre a pesagem inicial de cada cuba com a balança integrada, acompanhe o consumo em tempo real e encerre com controle de sobras, temperatura e destino.</p><div class="bf-emos">'+CATS[0].recs.concat(CATS[1].recs).map(function(id){ return '<span>'+LFI.rec(id).foto+'</span>'; }).join('')+'</div></div>'+
    '<button class="btn pri" data-act="novo">'+UI.ic('balanca')+'Abrir buffet do '+turno+'</button></div>';
  h+='<div class="grid g21 mb"><div class="card pad0"><h3>Histórico de buffets <small>clique para abrir a ordem</small></h3><div id="bf-hist" style="padding:0 8px 8px"></div></div>'+
    '<div class="card"><h3>Último buffet encerrado <small>destino do que foi servido</small></h3><div id="bf-ult"></div></div></div>';
  el.innerHTML=h;
  UI.tabela(el.querySelector('#bf-hist'),{linhas:ls, linhaAct:'abrir', vazio:'Nenhum buffet registrado para a empresa selecionada.', colunas:[
    {t:'Buffet', v:function(b){ return '<b>'+esc(b.num)+'</b><small>'+esc(b.turno)+' · '+esc(b.resp)+'</small>'; }, ord:function(b){ return b.num; }},
    {t:'Data', v:function(b){ return F.data(b.data)+'<small>'+esc(b.abertura)+(b.encerramento?' – '+esc(b.encerramento):'')+'</small>'; }, ord:function(b){ return b.data+b.abertura; }},
    {t:'Clientes', r:true, v:function(b){ return F.num(b.clientes||0,0); }, ord:function(b){ return b.clientes||0; }},
    {t:'Consumo', r:true, v:function(b){ var t=totais(b); return kg(t.cons)+'<small>de '+kg(t.disp)+'</small>'; }, ord:function(b){ return totais(b).cons; }},
    {t:'Aproveit.', r:true, v:function(b){ if(b.status!=='encerrado') return '—'; var r=LFI.resumoBuffet(b); return F.pct(r.aproveitamento); }, ord:function(b){ return b.status==='encerrado'?LFI.resumoBuffet(b).aproveitamento:0; }},
    {t:'Perdas', r:true, v:function(b){ if(b.status!=='encerrado') return '—'; var r=LFI.resumoBuffet(b); return '<b style="color:var(--red)">'+F.moeda(r.vDesc+r.vPerda)+'</b>'; }, ord:function(b){ if(b.status!=='encerrado') return 0; var r=LFI.resumoBuffet(b); return r.vDesc+r.vPerda; }},
    {t:'Status', v:function(b){ return UI.status('bf',b.status); }, ord:function(b){ return b.status; }}
  ]});
  if(enc[0]){ var r=LFI.resumoBuffet(enc[0]); UI.grafRosca(el.querySelector('#bf-ult'),{itens:[{nome:'Consumido',valor:r.consumo,cor:'#16A34A'},{nome:'Reaproveitado',valor:r.reaproveitado,cor:'#1D4ED8'},{nome:'Descarte',valor:r.descarte,cor:'#DC2626'},{nome:'Perda',valor:r.perda,cor:'#B08A00'}], fmt:kg, centro:{valor:F.pct(r.aproveitamento,0), rotulo:'aproveitamento'}});
    el.querySelector('#bf-ult').insertAdjacentHTML('beforeend','<div style="margin-top:12px"><div class="lnr"><span class="k">'+esc(enc[0].num)+' · '+F.data(enc[0].data)+'</span><span class="v"><a class="vertodos" data-act="abrir" data-id="'+enc[0].id+'">Ver relatório</a></span></div><div class="lnr"><span class="k">Perdas ao custo</span><span class="v" style="color:var(--red)">'+F.moeda(r.vDesc+r.vPerda)+'</span></div><div class="lnr"><span class="k">Reaproveitado (estoque de sobras)</span><span class="v">'+F.moeda(r.vReap)+'</span></div></div>'); }
  else el.querySelector('#bf-ult').innerHTML=UI.vazio('Nenhum buffet encerrado','🍣');
  ligaPrincipal(el);
  iniciaRelogio(el);
}
function ligaPrincipal(el){ var s=st(); UI.liga(el, UI.navHandlers({ aba:function(id){ s.aba=id; LFI.recarregar(); }, novo:function(){ LFI.ir('buffet','novo'); }, abrir:function(id){ LFI.ir('buffet',id); },
  pdfGeral:function(){ pdfGeral(); }, xlsGeral:function(){ xlsGeral(); } })); }
function iniciaRelogio(el){
  relogio=setInterval(function(){ if(!el.isConnected){ clearInterval(relogio); relogio=null; return; }
    UI.els('.relogio[data-bf]',el).forEach(function(x){ var b=LFI.buffet(x.getAttribute('data-bf')); if(b) x.textContent=dur(decorrido(b)); }); },1000);
}
function regrasHTML(){
  return UI.nota('Sobras <b>nunca</b> voltam automaticamente ao estoque. Cada grupo de produto tem regra própria de reaproveitamento, temperatura máxima e prazo de resfriamento; o reaproveitamento exige aprovação de segurança alimentar no encerramento.','in','info')+
    '<div class="grid g2">'+LFI.db.regrasSobra.map(function(g){ return '<div class="card" style="margin:0"><h3><span class="lft">'+esc(g.grupo)+'</span>'+(g.reaproveita?UI.badge('Reaproveitável com condições','ok'):UI.badge('Descarte obrigatório','no'))+'</h3>'+
      '<div class="bf-emos" style="margin:0 0 12px">'+g.receitas.map(function(id){ var r=LFI.rec(id); return r?'<span style="background:'+r.cor+'" title="'+esc(r.nome)+'">'+r.foto+'</span>':''; }).join('')+'</div>'+
      '<div class="kv c3"><div><span>Temperatura máx.</span><b>'+g.tempMax+' °C</b></div><div><span>Prazo de resfriamento</span><b>'+(g.horasMax?g.horasMax+' h':'—')+'</b></div><div><span>Validade da sobra</span><b>'+(g.validadeH?g.validadeH+' h':'—')+'</b></div></div>'+
      '<p style="font-size:13px;color:var(--muted2);font-weight:600;line-height:1.5;margin:12px 0 0">'+esc(g.obs)+'</p></div>'; }).join('')+'</div>';
}

/* ================= ETAPA 1 — ABERTURA ================= */
function abertura(el){
  var s=st();
  if(!LFI.depVisivel('res')){ el.innerHTML=UI.cabecalho({migalha:[{t:'Buffet',ir:'buffet'},{t:'Abertura'}], titulo:'Abertura de buffet'})+UI.nota('O buffet é operado no Kaizen Sushi. Selecione essa empresa ou a visão consolidada no topo.','wt'); UI.liga(el,UI.navHandlers({})); return; }
  if(!s.ab){ var itens={}; CATS.forEach(function(c){ c.recs.forEach(function(r){ itens[r]={sel:true, peso:null}; }); });
    s.ab={dep:'res', turno:new Date().getHours()<16?'Almoço':'Jantar', resp:'Chef Hiro', itens:itens}; }
  var a=s.ab, prox='BF-'+new Date().getFullYear()+'-'+String(LFI.db.seq.bf+1).padStart(3,'0');
  var h=UI.cabecalho({migalha:[{t:'Buffet',ir:'buffet'},{t:'Abertura'}], titulo:'Abertura do buffet', sub:'Ordem de abertura '+prox+' · pesagem inicial de cada cuba', acoes:'<span class="bf-scale"><i></i>Balança conectada (simulação) · BL-30 · USB</span>'});
  h+='<div class="card mb" style="padding:16px 20px 2px">'+UI.passos(ETAPAS,0)+'</div>';
  h+='<div class="card mb"><div class="fgrid c3" style="align-items:end"><div class="field"><label>Turno</label><div class="bf-seg">'+['Almoço','Jantar'].map(function(t){ return '<button type="button" class="'+(a.turno===t?'on':'')+'" data-act="turno" data-id="'+t+'">'+t+'</button>'; }).join('')+'</div></div>'+
    '<div class="field"><label>Operação</label><select class="inp xl" data-chg="abDep">'+LFI.depsVisiveis().filter(function(d){ return d.id!=='cen'; }).map(function(d){ return '<option value="'+d.id+'"'+(d.id===a.dep?' selected':'')+'>'+esc(d.nome)+' — '+esc(LFI.emp(d.empresa).fantasia)+'</option>'; }).join('')+'</select></div>'+
    '<div class="field"><label>Responsável pela abertura</label><input class="inp xl" data-inp="abResp" value="'+esc(a.resp)+'"></div></div>'+
    '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="btn sec md" data-act="pesarTodos">'+UI.ic('balanca')+'Pesar todos os selecionados</button><span style="font-size:12.5px;color:var(--muted);font-weight:700">Coloque a cuba na balança e toque em “Ler balança”, ou digite o peso manualmente.</span></div></div>';
  CATS.forEach(function(c){
    h+='<div class="card mb"><h3><span class="lft">'+esc(c.nome)+' <span class="n">'+c.recs.filter(function(r){ return a.itens[r].sel; }).length+' de '+c.recs.length+'</span></span><small>'+(c.nome==='Sushi'?'peixe cru e frituras: descarte obrigatório no encerramento':'reaproveitáveis se atenderem às regras de conservação')+'</small></h3><div class="bf-grid">'+
      c.recs.map(function(id){ var r=LFI.rec(id), it=a.itens[id];
        return '<div class="bf-it '+(it.sel?'sel':'off')+'" id="ab-'+id+'"><div class="hd"><span class="em" style="background:'+r.cor+'">'+r.foto+'</span><div class="gr"><b>'+esc(r.nome.replace(/\s*\(.*\)/,''))+'</b><small>custo '+F.moeda(LFI.custoKgBuffet(id))+'/kg</small></div><span class="bf-tg" data-act="abSel" data-id="'+id+'">'+(it.sel?'✓':'')+'</span></div>'+
          balancaHTML('bal-'+id, it.peso)+
          '<div class="bf-row"><input class="inp xl num" data-inp="abPeso" data-id="'+id+'" value="'+(it.peso?UI.numBR(it.peso,3):'')+'" placeholder="0,000" inputmode="decimal"'+(it.sel?'':' disabled')+'><button class="btn esc md" data-act="abLer" data-id="'+id+'"'+(it.sel?'':' disabled')+'>'+UI.ic('balanca')+'Ler balança</button></div></div>'; }).join('')+'</div></div>'; });
  h+='<div class="bf-sum"><div><span>Itens</span><b id="ab-n">0</b></div><div><span>Peso inicial</span><b id="ab-kg">0</b></div><div><span>Custo do buffet</span><b id="ab-c">0</b></div><div><span>Receita potencial</span><b id="ab-r">0</b></div><span class="sp"></span><button class="btn sec lg" data-act="_ir" data-id="buffet">Cancelar</button><button class="btn pri lg" data-act="abrir">'+UI.ic('play')+'Abrir buffet</button></div>';
  el.innerHTML=h;
  function resumo(){ var n=0, t=0, c=0; Object.keys(a.itens).forEach(function(id){ var it=a.itens[id]; if(!it.sel) return; n++; t+=it.peso||0; c+=(it.peso||0)*LFI.custoKgBuffet(id); });
    el.querySelector('#ab-n').textContent=n; el.querySelector('#ab-kg').textContent=kg(t); el.querySelector('#ab-c').textContent=F.moeda(c); el.querySelector('#ab-r').textContent=F.moeda(t*LFI.db.buffetPrecoKg); }
  function ler(id, cb){ var box=el.querySelector('#bal-'+id), alvo=alvoLeitura(PRESET[id]||3);
    lerBalanca(box, alvo, function(v){ a.itens[id].peso=v; var i=el.querySelector('[data-inp="abPeso"][data-id="'+id+'"]'); if(i) i.value=UI.numBR(v,3); resumo(); if(cb) cb(); }); }
  resumo();
  UI.liga(el, UI.navHandlers({
    turno:function(id){ a.turno=id; UI.els('[data-act="turno"]',el).forEach(function(b){ b.classList.toggle('on',b.getAttribute('data-id')===id); }); },
    abDep:function(_,ev){ a.dep=ev.target.value; },
    abResp:function(_,ev){ a.resp=ev.target.value; },
    abSel:function(id){ a.itens[id].sel=!a.itens[id].sel; LFI.recarregar(); },
    abPeso:function(id,ev){ var v=UI.num(ev.target.value); a.itens[id].peso=v>0?v:null; var box=el.querySelector('#bal-'+id); box.querySelector('.v').textContent=v>0?kg3(v):'– – –'; box.querySelector('small').textContent=v>0?'MANUAL':'BALANÇA'; resumo(); },
    abLer:function(id){ ler(id); },
    pesarTodos:function(){ var ids=Object.keys(a.itens).filter(function(id){ return a.itens[id].sel; }), i=0; (function prox(){ if(i>=ids.length){ UI.toast('Pesagem concluída', ids.length+' cubas pesadas'); return; } ler(ids[i++], prox); })(); },
    abrir:function(){
      var sel=Object.keys(a.itens).filter(function(id){ return a.itens[id].sel; });
      if(!sel.length){ UI.toast('Selecione ao menos um item','','wt'); return; }
      var semPeso=sel.filter(function(id){ return !(a.itens[id].peso>0); });
      if(semPeso.length){ UI.toast('Registre o peso inicial de todos os itens', semPeso.map(function(id){ return LFI.rec(id).nome; }).join(', '),'wt'); return; }
      if(!String(a.resp||'').trim()){ UI.toast('Informe o responsável pela abertura','','wt'); return; }
      var ab=LFI.agoraHM(), b={id:LFI.novoId('bf'), num:LFI.proximo('bf'), dep:a.dep, empresa:LFI.dep(a.dep).empresa, data:LFI.hoje(), turno:a.turno, abertura:ab, abTs:Date.now(), simMin:0, encerramento:null, resp:a.resp.trim(), respEnc:null, status:'aberto', aprovadoPor:null, clientes:0,
        itens:sel.map(function(id){ return {rec:id, pesoIni:r3(a.itens[id].peso), repos:[], pesoFinal:null, temp:null, hora:null, cond:'', destino:'', motivo:'', aprov:false, cons:0}; }), leituras:[{h:ab, kg:0}]};
      LFI.db.buffets.unshift(b);
      var t=totais(b); LFI.atividade('buffet','Buffet '+b.num+' aberto ('+b.turno+') · '+kg(t.ini)+' em '+b.itens.length+' itens',{tela:'buffet',id:b.id});
      LFI.salvar(); s.ab=null; UI.toast('Buffet '+b.num+' aberto', kg(t.ini)+' pesados · '+b.itens.length+' itens'); LFI.ir('buffet', b.id);
    }
  }));
}

/* ================= ETAPA 2 — ACOMPANHAMENTO ================= */
function acompanhamento(el, b){
  var t=totais(b), preco=LFI.db.buffetPrecoKg;
  var alertas=b.itens.map(function(it){ var rest=restKg(it), f=it.pesoIni?rest/it.pesoIni:1; return {it:it, rest:rest, f:f, nivel:f<0.25?'al':f<0.4?'at':null}; }).filter(function(x){ return x.nivel; }).sort(function(a,b){ return a.f-b.f; });
  var h=UI.cabecalho({migalha:[{t:'Buffet',ir:'buffet'},{t:b.num}], titulo:esc(b.num)+' · buffet do '+esc(b.turno.toLowerCase())+' '+UI.status('bf',b.status), sub:esc(LFI.dep(b.dep).nome)+' · aberto às '+esc(b.abertura)+' por '+esc(b.resp)+' · '+F.moeda(preco)+'/kg',
    acoes:'<span class="bf-scale"><i></i>Balança conectada (simulação)</span><button class="btn sec md" data-act="simular">'+UI.ic('relogio')+'Simular +30 min de operação</button><button class="btn pri md" data-act="encerrar">'+UI.ic('check')+'Iniciar encerramento</button>'});
  h+='<div class="card mb" style="padding:16px 20px 2px">'+UI.passos(ETAPAS,1)+'</div>';
  h+='<div class="kpis k5">'+
    UI.kpi({lb:'Tempo de operação', vl:'<span class="relogio" data-bf="'+b.id+'">'+dur(decorrido(b))+'</span>', dl:'desde '+esc(b.abertura)+' · agora '+horaOper(b), hl:true})+
    UI.kpi({lb:'Peso disponível', vl:kg(t.disp), dl:'inicial '+kg(t.ini)+' · reposições '+kg(t.rep)})+
    UI.kpi({lb:'Consumido', vl:kg(t.cons), dl:F.pct(t.disp?t.cons/t.disp:0)+' do disponível'})+
    UI.kpi({lb:'Restante estimado', vl:kg(t.rest), dl:alertas.length?(function(){ var n=alertas.filter(function(x){ return x.nivel==='al'; }).length; return n?'<span style="color:var(--red)">'+n+' item(ns) para repor</span>':'<span style="color:#946C00">'+alertas.length+' item(ns) em atenção</span>'; })():'níveis adequados'})+
    UI.kpi({lb:'Receita estimada', vl:F.moeda(t.cons*preco), dl:F.num(b.clientes||0,0)+' clientes · '+(b.clientes?F.num(t.cons/b.clientes*1000,0)+' g/cliente':'—')})+
  '</div>';
  if(alertas.length) h+='<div class="mb">'+alertas.map(function(x){ var r=LFI.rec(x.it.rec); return '<div class="bf-alr '+(x.nivel==='at'?'at':'')+'">'+UI.ic('alerta','')+'<span>'+(x.nivel==='al'?'Repor agora: ':'Atenção: ')+r.foto+' '+esc(r.nome)+' — restam ~'+kg(x.rest)+' ('+F.pct(x.f,0)+' da cuba)</span><span class="sp"></span><button class="btn '+(x.nivel==='al'?'pri':'sec')+' md" data-act="repor" data-id="'+x.it.rec+'">'+UI.ic('mais')+'Registrar reposição</button></div>'; }).join('')+'</div>';
  else h+=UI.nota('Nenhum alerta de reposição. Alertas aparecem quando o restante estimado de uma cuba fica abaixo de 25% do peso inicial.','ok','check');
  CATS.forEach(function(c){ var its=b.itens.filter(function(it){ return catDe(it.rec)===c.nome; }); if(!its.length) return;
    h+='<div class="card mb"><h3><span class="lft">'+esc(c.nome)+'</span><small>'+kg(its.reduce(function(a,it){ return a+(it.cons||0); },0))+' consumidos</small></h3><div class="bf-grid">'+its.map(function(it){ var r=LFI.rec(it.rec), disp=dispKg(it), rest=restKg(it), f=it.pesoIni?rest/it.pesoIni:1, pc=disp?(it.cons||0)/disp:0;
      return '<div class="bf-it '+(f<0.25?'al':f<0.4?'at':'')+'"><div class="hd"><span class="em" style="background:'+r.cor+'">'+r.foto+'</span><div class="gr"><b>'+esc(r.nome.replace(/\s*\(.*\)/,''))+'</b><small>'+(it.repos.length?it.repos.length+' reposição(ões) · última '+it.repos[it.repos.length-1].h:'sem reposições')+'</small></div>'+(f<0.25?UI.badge('Repor','no'):f<0.4?UI.badge('Atenção','wt'):UI.badge(F.pct(pc,0),'lf'))+'</div>'+
        '<div style="display:flex;justify-content:space-between;font-size:11.5px;font-weight:800;color:var(--muted);margin-bottom:5px"><span>Consumo</span><span>'+F.pct(pc,0)+'</span></div>'+UI.bar(pc,f<0.25?'no':f<0.4?'wt':'')+
        '<div class="pesos"><div>Inicial<b>'+kg(it.pesoIni)+'</b></div><div>Reposições<b>'+kg(reposKg(it))+'</b></div><div>Consumido<b>'+kg(it.cons||0)+'</b></div><div>Restante<b style="color:var('+(f<0.25?'--red':'--text')+')">'+kg(rest)+'</b></div></div>'+
        '<div class="bf-row" style="margin-top:12px"><button class="btn sec md" style="flex:1" data-act="repor" data-id="'+it.rec+'">'+UI.ic('mais')+'Reposição</button><button class="btn sec md" style="flex:1" data-act="pesar" data-id="'+it.rec+'">'+UI.ic('balanca')+'Pesar cuba</button></div></div>'; }).join('')+'</div></div>'; });
  h+='<div class="grid g2 mb"><div class="card"><h3>Consumo por categoria</h3><div id="g-cat"></div></div><div class="card"><h3>Consumo por produto <small>kg</small></h3><div id="g-prod"></div></div></div><div class="card mb"><h3>Curva de consumo <small>acumulado (kg) · leituras da balança</small></h3><div id="g-curva"></div></div>';
  el.innerHTML=h;
  var porCat={}; b.itens.forEach(function(it){ var c=catDe(it.rec); porCat[c]=(porCat[c]||0)+(it.cons||0); });
  UI.grafRosca(el.querySelector('#g-cat'),{itens:Object.keys(porCat).map(function(c,i){ return {nome:c, valor:porCat[c], cor:['#C2185B','#16A34A','#1D4ED8'][i]}; }), fmt:kg, centro:{valor:kg(t.cons), rotulo:'consumidos'}});
  if(!t.cons) el.querySelector('#g-cat').innerHTML=UI.vazio('Aguardando consumo. Use “Simular +30 min”.','⏱️');
  var pl=b.itens.map(function(it){ var r=LFI.rec(it.rec); return {nome:r.foto+' '+r.nome.replace(/\s*\(.*\)/,''), valor:it.cons||0, cor:catDe(it.rec)==='Sushi'?'#C2185B':'#16A34A', sub:F.moeda((it.cons||0)*preco)}; }).sort(function(a,b){ return b.valor-a.valor; });
  el.querySelector('#g-prod').innerHTML=UI.barrasH(pl,{fmt:kg});
  if(b.leituras.length>1) UI.grafLinhas(el.querySelector('#g-curva'),{cats:b.leituras.map(function(l){ return l.h; }), series:[{nome:'Consumo acumulado', cor:'#FF5A00', valores:b.leituras.map(function(l){ return l.kg; })}], fmt:kg, altura:200});
  else el.querySelector('#g-curva').innerHTML=UI.vazio('A curva aparece com as leituras da balança ao longo do turno.','📈');
  iniciaRelogio(el);
  UI.liga(el, UI.navHandlers({
    simular:function(){ simular(b); LFI.salvar(); UI.toast('+30 min de operação simulados','Consumo total '+kg(totais(b).cons)+' · '+b.clientes+' clientes','in'); LFI.recarregar(); },
    repor:function(id){ reposicao(b, id); },
    pesar:function(id){ pesarCuba(b, id); },
    encerrar:function(){ var t2=totais(b); UI.confirmar('Iniciar encerramento do '+b.num,'O buffet deixa de receber reposições. Em seguida, pese cada cuba e registre temperatura, horário, condição e destino da sobra. Consumo estimado até agora: <b>'+kg(t2.cons)+'</b>.','Iniciar encerramento',function(){
      b.status='encerramento'; b.encInicio=horaOper(b); b.simFim=decorrido(b);
      b.itens.forEach(function(it){ var g=regraDe(it.rec); it.cond=it.cond||'Câmara fria'; it.resp=b.resp; if(g&&!g.reaproveita){ it.destino='descarte'; it.motivo=g.grupo.split(' (')[0]+': '+(g.obs.split('.')[0]); } });
      if(t2.cons>(b.leituras[b.leituras.length-1]||{kg:0}).kg) b.leituras.push({h:b.encInicio, kg:t2.cons});
      LFI.atividade('buffet','Encerramento do '+b.num+' iniciado',{tela:'buffet',id:b.id}); LFI.salvar(); LFI.recarregar(); }); }
  }));
}
function simular(b){
  b.simMin=(b.simMin||0)+30;
  var k=Math.max(0,b.leituras.length-1), f=CURVA[Math.min(k,CURVA.length-1)], tot=0;
  b.itens.forEach(function(it){ var rest=dispKg(it)-(it.cons||0), d=(TAXA[it.rec]||0.3)*f*(0.85+Math.random()*0.3)*(it.pesoIni/(PRESET[it.rec]||it.pesoIni));
    d=Math.min(d, Math.max(0, rest-0.05)); it.cons=r3((it.cons||0)+d); tot+=d; });
  b.clientes=(b.clientes||0)+Math.round(tot/0.305);
  b.leituras.push({h:horaOper(b), kg:totais(b).cons});
}
function reposicao(b, recId){
  var it=null; b.itens.forEach(function(x){ if(x.rec===recId) it=x; }); var r=LFI.rec(recId), sug=r2((PRESET[recId]||3)*0.5), v=null;
  var m=UI.modal({titulo:'Reposição · '+r.foto+' '+esc(r.nome), sub:'Restante estimado na cuba: '+kg(restKg(it))+' · inicial '+kg(it.pesoIni), corpo:'<div class="bf-x">'+balancaHTML('rp-bal',null)+'<div class="bf-row"><input class="inp xl num" id="rp-kg" placeholder="0,000" inputmode="decimal"><button class="btn esc md" data-act="ler">'+UI.ic('balanca')+'Ler balança</button></div><div class="hint" style="font-size:12px;color:var(--muted);font-weight:600;margin-top:8px">Pese apenas o produto que está sendo adicionado (tara da cuba descontada).</div></div>',
    botoes:'<button class="btn sec" data-act="_fechar">Cancelar</button><button class="btn pri" data-act="ok">'+UI.ic('check')+'Registrar reposição</button>',
    acoes:{ ler:function(){ lerBalanca(m.el.querySelector('#rp-bal'), alvoLeitura(sug), function(x){ m.el.querySelector('#rp-kg').value=UI.numBR(x,3); }); },
      ok:function(){ v=UI.num(m.el.querySelector('#rp-kg').value); if(!(v>0)){ UI.toast('Informe o peso da reposição','','wt'); return; }
        it.repos.push({h:horaOper(b), kg:r3(v)}); LFI.atividade('buffet','Reposição de '+kg(v)+' de '+r.nome+' ('+b.num+')',{tela:'buffet',id:b.id}); LFI.salvar(); m.fechar(); UI.toast('Reposição registrada', r.nome+' · +'+kg(v)); LFI.recarregar(); } }});
}
function pesarCuba(b, recId){
  var it=null; b.itens.forEach(function(x){ if(x.rec===recId) it=x; }); var r=LFI.rec(recId);
  var m=UI.modal({titulo:'Pesar cuba · '+r.foto+' '+esc(r.nome), sub:'Atualiza o consumo real deste item · disponível '+kg(dispKg(it)), corpo:'<div class="bf-x">'+balancaHTML('pc-bal',null)+'<div class="bf-row"><input class="inp xl num" id="pc-kg" placeholder="0,000" inputmode="decimal"><button class="btn esc md" data-act="ler">'+UI.ic('balanca')+'Ler balança</button></div><div class="hint" style="font-size:12px;color:var(--muted);font-weight:600;margin-top:8px">Restante estimado pelo sistema: '+kg(restKg(it))+'.</div></div>',
    botoes:'<button class="btn sec" data-act="_fechar">Cancelar</button><button class="btn pri" data-act="ok">'+UI.ic('check')+'Atualizar consumo</button>',
    acoes:{ ler:function(){ lerBalanca(m.el.querySelector('#pc-bal'), alvoLeitura(restKg(it)), function(x){ m.el.querySelector('#pc-kg').value=UI.numBR(x,3); }); },
      ok:function(){ var v=UI.num(m.el.querySelector('#pc-kg').value); if(v<0||v>dispKg(it)){ UI.toast('Peso inválido','Deve estar entre 0 e '+kg(dispKg(it)),'wt'); return; }
        it.cons=r3(dispKg(it)-v); b.leituras.push({h:horaOper(b), kg:totais(b).cons}); LFI.salvar(); m.fechar(); UI.toast('Consumo atualizado', r.nome+' · restante '+kg(v)); LFI.recarregar(); } }});
}

/* ================= ETAPA 3 — ENCERRAMENTO ================= */
/* avalia se o item pode ser reaproveitado segundo db.regrasSobra */
function avaliar(b, it){
  var g=regraDe(it.rec);
  if(!g) return {g:null, pode:false, motivo:'Sem regra de conservação cadastrada para este item: reaproveitamento não permitido.'};
  if(!g.reaproveita) return {g:g, pode:false, motivo:'Grupo “'+g.grupo+'” não permite reaproveitamento. '+g.obs};
  if(it.temp==null||it.temp==='') return {g:g, pode:false, pend:true, motivo:'Informe a temperatura para liberar o reaproveitamento (máx. '+g.tempMax+' °C).'};
  if(+it.temp>g.tempMax) return {g:g, pode:false, motivo:'Temperatura de '+F.num(+it.temp,1)+' °C acima do limite de '+g.tempMax+' °C.'};
  if(it.cond==='Ambiente') return {g:g, pode:false, motivo:'Armazenamento em temperatura ambiente não permite reaproveitamento.'};
  if(it.hora&&b.encInicio){ var dm=minutos(it.hora)-minutos(b.encInicio); if(dm<0) dm+=1440; if(g.horasMax&&dm>g.horasMax*60) return {g:g, pode:false, motivo:'Fora do prazo: registro '+F.num(dm/60,1)+' h após a saída do buffet (máximo '+g.horasMax+' h para resfriamento).'}; }
  return {g:g, pode:true, motivo:'Atende à regra: até '+g.tempMax+' °C, resfriamento em até '+g.horasMax+' h, uso em até '+g.validadeH+' h.'};
}
function ajusta(b, it){ var a=avaliar(b,it); if(it.destino==='reaproveitar'&&!a.pode){ it.destino='descarte'; it.motivo=a.motivo; return a; } return a; }
function encerramento(el, b){
  var preco=LFI.db.buffetPrecoKg, sum={reap:0, desc:0, perda:0, vReap:0, vDesc:0, vPerda:0, pend:0};
  b.itens.forEach(function(it){ ajusta(b,it); var ck=LFI.custoKgBuffet(it.rec), f=it.pesoFinal; if(f==null||!it.destino){ sum.pend++; } if(f!=null){ if(it.destino==='reaproveitar'){ sum.reap+=f; sum.vReap+=f*ck; } else if(it.destino==='perda'){ sum.perda+=f; sum.vPerda+=f*ck; } else if(it.destino==='descarte'){ sum.desc+=f; sum.vDesc+=f*ck; } } });
  var h=UI.cabecalho({migalha:[{t:'Buffet',ir:'buffet'},{t:b.num}], titulo:'Encerramento · '+esc(b.num)+' '+UI.status('bf',b.status), sub:'Saída do buffet às '+esc(b.encInicio||'—')+' · pese cada cuba e registre temperatura, horário, condição e destino da sobra',
    acoes:'<span class="bf-scale"><i></i>Balança e termômetro conectados (simulação)</span><button class="btn sec md" data-act="pesarTudo">'+UI.ic('balanca')+'Pesar todas as cubas</button>'});
  h+='<div class="card mb" style="padding:16px 20px 2px">'+UI.passos(ETAPAS,2)+'</div>';
  h+=UI.nota('<b>Sobras não são estoque disponível.</b> Sobra = disponível − consumido. Cada item é classificado como <b>reaproveitável</b> (entra no estoque de sobras somente após aprovação de segurança alimentar), <b>descarte</b> ou <b>perda</b>, conforme as regras de conservação.','lf','alerta');
  b.itens.forEach(function(it){ var r=LFI.rec(it.rec), a=avaliar(b,it), disp=dispKg(it), cons=it.pesoFinal!=null?r2(disp-it.pesoFinal):null;
    h+='<div class="bf-enc '+(it.destino==='reaproveitar'?'reap':it.destino?'desc':'')+'"><div class="lado"><div style="display:flex;gap:10px;align-items:center"><span class="em" style="width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:26px;background:'+r.cor+'">'+r.foto+'</span><div><b style="font-size:14.5px">'+esc(r.nome.replace(/\s*\(.*\)/,''))+'</b><small style="display:block;font-size:11.5px;color:var(--muted);font-weight:700">'+esc(a.g?a.g.grupo:'Sem regra')+'</small></div></div>'+
      '<div class="pesos"><div><span>Disponível</span><b>'+kg(disp)+'</b></div><div><span>Consumido</span><b>'+(cons!=null?kg(cons):'—')+'</b></div><div><span>Sobra</span><b style="color:var(--roxo-esc)">'+(it.pesoFinal!=null?kg(it.pesoFinal):'—')+'</b></div></div>'+
      '<div class="bf-regra '+(a.pode?'ok':'no')+'">'+(a.pode?'✓ ':'⛔ ')+esc(a.motivo)+'</div></div>'+
      '<div><div class="fgrid"><div class="field"><label>Peso final da sobra (kg)</label>'+balancaHTML('ef-'+it.rec, it.pesoFinal||null)+'<div class="bf-row"><input class="inp xl num" data-chg="eF" data-id="'+it.rec+'" value="'+(it.pesoFinal!=null?UI.numBR(it.pesoFinal,3):'')+'" placeholder="est. '+UI.numBR(restKg(it),2)+'" inputmode="decimal"><button class="btn esc md" data-act="eLer" data-id="'+it.rec+'">Ler</button></div></div>'+
        '<div class="field"><label>Temperatura (°C)</label><div class="balanca'+(it.temp!=null?' ok':'')+'" id="et-'+it.rec+'"><small>'+(it.temp!=null?'MEDIDA':'TERMÔMETRO')+'</small><span class="v">'+(it.temp!=null?F.num(+it.temp,1):'– –')+'</span><small>°C</small></div><div class="bf-row"><input class="inp xl num" data-chg="eT" data-id="'+it.rec+'" value="'+(it.temp!=null?UI.numBR(it.temp,1):'')+'" placeholder="°C" inputmode="decimal"><button class="btn esc md" data-act="eTer" data-id="'+it.rec+'">Medir</button></div></div>'+
        '<div class="field"><label>Horário do registro</label><input type="time" class="inp xl" data-chg="eH" data-id="'+it.rec+'" value="'+esc(it.hora||'')+'"><label style="margin-top:10px">Responsável</label><input class="inp" data-chg="eR" data-id="'+it.rec+'" value="'+esc(it.resp||b.resp)+'"></div></div>'+
        '<div class="fgrid"><div class="field"><label>Condição de armazenamento</label><select class="inp xl" data-chg="eC" data-id="'+it.rec+'">'+CONDS.map(function(c){ return '<option'+(c===it.cond?' selected':'')+'>'+c+'</option>'; }).join('')+'</select></div>'+
        '<div class="field" style="grid-column:span 2"><label>Destino da sobra</label><div class="bf-seg dest">'+[['reaproveitar','Reaproveitar'],['descarte','Descarte'],['perda','Perda']].map(function(d){ return '<button type="button" class="'+(it.destino===d[0]?'on':'')+'" data-act="eD" data-id="'+d[0]+'" data-rec="'+it.rec+'"'+(d[0]==='reaproveitar'&&!a.pode?' disabled title="'+esc(a.motivo)+'"':'')+'>'+d[1]+'</button>'; }).join('')+'</div></div></div>'+
        '<div class="field" style="margin:0"><label>Motivo / observação</label><input class="inp" data-chg="eM" data-id="'+it.rec+'" value="'+esc(it.motivo||'')+'" placeholder="'+(it.destino==='reaproveitar'?'Ex.: yakimeshi do almoço de amanhã':'Ex.: peixe cru exposto')+'"></div></div></div>'; });
  h+='<div class="bf-sum"><div><span>Reaproveitável</span><b style="color:#7CFC9A">'+kg(sum.reap)+'</b></div><div><span>Descarte</span><b style="color:#FCA5A5">'+kg(sum.desc)+'</b></div><div><span>Perda</span><b style="color:#FDE68A">'+kg(sum.perda)+'</b></div><div><span>Perdas ao custo</span><b>'+F.moeda(sum.vDesc+sum.vPerda)+'</b></div><div><span>Pendentes</span><b>'+sum.pend+'</b></div><span class="sp"></span><button class="btn sec lg" data-act="voltar">Voltar ao acompanhamento</button><button class="btn pri lg" data-act="aprov"'+(sum.pend?' disabled':'')+'>'+UI.ic('seta')+'Enviar para aprovação</button></div>';
  el.innerHTML=h;
  function item(id){ var x=null; b.itens.forEach(function(it){ if(it.rec===id) x=it; }); return x; }
  function salva(){ LFI.salvar(); LFI.recarregar(); }
  function lerPeso(id, cb){ var it=item(id); lerBalanca(el.querySelector('#ef-'+id), alvoLeitura(restKg(it)), function(v){ it.pesoFinal=Math.min(v,dispKg(it)); if(!it.hora) it.hora=horaOper(b); if(cb) cb(); else salva(); }); }
  UI.liga(el, UI.navHandlers({
    eF:function(id,ev){ var it=item(id), v=ev.target.value.trim(); if(v===''){ it.pesoFinal=null; return salva(); } v=UI.num(v); if(v<0||v>dispKg(it)){ UI.toast('Peso final inválido','Deve estar entre 0 e '+kg(dispKg(it)),'wt'); return salva(); } it.pesoFinal=r3(v); if(!it.hora) it.hora=horaOper(b); salva(); },
    eT:function(id,ev){ var it=item(id), v=ev.target.value.trim(); it.temp=v===''?null:r2(UI.num(v)); salva(); },
    eH:function(id,ev){ item(id).hora=ev.target.value; salva(); },
    eR:function(id,ev){ item(id).resp=ev.target.value; LFI.salvar(); },
    eC:function(id,ev){ item(id).cond=ev.target.value; salva(); },
    eM:function(id,ev){ item(id).motivo=ev.target.value; LFI.salvar(); },
    eD:function(d,ev,t){ var it=item(t.getAttribute('data-rec')); it.destino=d; if(d==='reaproveitar') it.motivo=''; else if(!it.motivo) it.motivo=d==='perda'?'Perda operacional':'Descarte'; salva(); },
    eLer:function(id){ lerPeso(id); },
    eTer:function(id){ var it=item(id), g=regraDe(id), box=el.querySelector('#et-'+id);
      var alvo=it.cond==='Ambiente'?r2(14+Math.random()*8):id==='r16'?r2(4+Math.random()*5.5):r2(2.8+Math.random()*2.4);
      box.classList.add('lendo'); box.querySelector('small').textContent='MEDINDO…'; var n=0, tm=setInterval(function(){ n++; if(!box.isConnected){ clearInterval(tm); return; } box.querySelector('.v').textContent=F.num(alvo+(12-n)*0.8*Math.random(),1); if(n>=12){ clearInterval(tm); it.temp=alvo; if(!it.hora) it.hora=horaOper(b); salva(); } },80); },
    pesarTudo:function(){ var ids=b.itens.filter(function(it){ return it.pesoFinal==null; }).map(function(it){ return it.rec; }), i=0; if(!ids.length){ UI.toast('Todas as cubas já foram pesadas','','in'); return; } (function prox(){ if(i>=ids.length){ salva(); UI.toast('Pesagem final concluída', ids.length+' cubas'); return; } lerPeso(ids[i++], prox); })(); },
    voltar:function(){ b.status='aberto'; LFI.salvar(); LFI.recarregar(); },
    aprov:function(){ var falta=b.itens.filter(function(it){ return it.pesoFinal==null||!it.destino; }); if(falta.length){ UI.toast('Complete o peso final e o destino de todos os itens','','wt'); return; }
      b.etapa='aprovacao'; LFI.salvar(); LFI.recarregar(); }
  }));
}

/* ================= ETAPA 4 — APROVAÇÃO DE SEGURANÇA ALIMENTAR ================= */
function aprovacao(el, b){
  var preco=LFI.db.buffetPrecoKg, reap=b.itens.filter(function(it){ return it.destino==='reaproveitar'; }), t={disp:0, cons:0, final:0};
  b.itens.forEach(function(it){ t.disp+=dispKg(it); t.final+=it.pesoFinal; t.cons+=dispKg(it)-it.pesoFinal; });
  var clientes=b.clientes||Math.round(t.cons/0.305);
  var h=UI.cabecalho({migalha:[{t:'Buffet',ir:'buffet'},{t:b.num}], titulo:'Aprovação e ordem de encerramento · '+esc(b.num), sub:'Conferência final antes de qualquer entrada de sobra no estoque'});
  h+='<div class="card mb" style="padding:16px 20px 2px">'+UI.passos(ETAPAS,3)+'</div>';
  h+='<div class="kpis">'+UI.kpi({lb:'Disponível', vl:kg(t.disp)})+UI.kpi({lb:'Consumido', vl:kg(t.cons), dl:F.pct(t.cons/t.disp)+' de aproveitamento', hl:true})+UI.kpi({lb:'Sobras para estoque', vl:kg(reap.reduce(function(a,it){ return a+it.pesoFinal; },0)), dl:reap.length+' item(ns) reaproveitável(is)'})+UI.kpi({lb:'Descarte + perda', vl:kg(b.itens.filter(function(it){ return it.destino!=='reaproveitar'; }).reduce(function(a,it){ return a+it.pesoFinal; },0)), dl:'registrados somente no buffet'})+'</div>';
  h+='<div class="grid g21 mb"><div class="card pad0"><h3>Ordem de encerramento</h3><div class="tb-wrap" style="padding:0 8px 8px"><table class="tb cp"><thead><tr><th>Item</th><th class="r">Disponível</th><th class="r">Consumido</th><th class="r">Sobra</th><th class="r">Temp.</th><th>Hora · condição</th><th>Destino</th></tr></thead><tbody>'+
    b.itens.map(function(it){ var r=LFI.rec(it.rec); return '<tr><td><b>'+r.foto+' '+esc(r.nome.replace(/\s*\(.*\)/,''))+'</b><small>'+esc(it.motivo||'')+'</small></td><td class="r">'+kg(dispKg(it))+'</td><td class="r">'+kg(dispKg(it)-it.pesoFinal)+'</td><td class="r"><b>'+kg(it.pesoFinal)+'</b></td><td class="r">'+(it.temp!=null?F.num(+it.temp,1)+' °C':'—')+'</td><td>'+esc(it.hora||'—')+'<small>'+esc(it.cond||'')+' · '+esc(it.resp||b.resp)+'</small></td><td>'+badgeDest(it.destino)+'</td></tr>'; }).join('')+'</tbody></table></div></div>'+
    '<div class="card"><h3><span class="lft">'+UI.ic('check')+' Checklist de segurança alimentar</span></h3><div class="bf-chk">'+CHECK.map(function(c,i){ return '<label><input type="checkbox" data-chk="'+i+'"> '+esc(c)+'</label>'; }).join('')+'</div>'+
      '<div class="fgrid" style="margin-top:14px"><div class="field"><label>Aprovado por (responsável técnico)</label><input class="inp xl" id="ap-nome" value="'+esc(b.resp)+'"></div><div class="field"><label>Clientes atendidos</label><input class="inp xl num" id="ap-cli" value="'+clientes+'" inputmode="numeric"></div></div>'+
      (reap.length?UI.nota('<b>'+reap.length+' sobra(s)</b> entrarão no estoque de sobras ('+esc(LFI.dep(b.dep).nome)+', câmara fria) com validade conforme a regra: '+reap.map(function(it){ var g=regraDe(it.rec); return esc(LFI.rec(it.rec).nome.replace(/\s*\(.*\)/,''))+' '+kg(it.pesoFinal)+' (uso em até '+g.validadeH+' h)'; }).join(', ')+'.','in'):UI.nota('Nenhuma sobra reaproveitável: nada entrará no estoque.','')) +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end"><button class="btn sec lg" data-act="voltar">Voltar à pesagem</button><button class="btn ok lg" data-act="aprovar">'+UI.ic('check')+'Aprovar e encerrar buffet</button></div></div></div>';
  el.innerHTML=h;
  UI.liga(el, UI.navHandlers({
    voltar:function(){ b.etapa=null; LFI.salvar(); LFI.recarregar(); },
    aprovar:function(){
      var ok=UI.els('[data-chk]',el).every(function(c){ return c.checked; }), nome=el.querySelector('#ap-nome').value.trim(), cli=Math.round(UI.num(el.querySelector('#ap-cli').value));
      if(!ok){ UI.toast('Confirme todos os itens do checklist','A entrada de sobras no estoque exige a aprovação completa','wt'); return; }
      if(!nome){ UI.toast('Informe quem aprova','','wt'); return; }
      var entradas=[];
      b.itens.forEach(function(it){
        if(it.destino==='reaproveitar'){ var a=avaliar(b,it); if(!a.pode){ it.destino='descarte'; it.motivo=a.motivo; it.aprov=false; return; }
          var r=LFI.rec(it.rec), g=a.g, ck=r2(LFI.custoKgBuffet(it.rec)), sid='sb_'+it.rec+'_'+b.id, p=LFI.prod(sid);
          if(!p){ p={id:sid, nome:r.nome+' — sobra do buffet', cat:'sob', un:'kg', custoMedio:ck, ultimoCusto:ck, estMin:0, ncm:'', cest:'', forn:null, fornAlt:[], local:'Câmara fria 01 (0 a 4 °C)', validade:D(Math.max(1,Math.ceil(g.validadeH/24))), conv:{un:'kg',fator:1}, est:{cen:0,pad:0,res:0,sus:0}, apelidos:[], ultMov:LFI.hoje(), tipo:'sobra', origem:{tipo:'buffet', id:b.id, rec:it.rec}, contado:null, hist:[{d:LFI.hoje(), v:ck, origem:'Sobra '+b.num}]}; LFI.db.produtos.push(p); }
          LFI.movimentar({prod:sid, dep:b.dep, tipo:'sobra', qtd:it.pesoFinal, custo:ck, origem:{tipo:'buffet', id:b.id}, usuario:nome, obs:'Sobra aprovada (temp. '+F.num(+it.temp,1)+' °C) · uso em até '+g.validadeH+' h'});
          it.aprov=true; entradas.push(p);
        } else it.aprov=false;
        delete it.cons;
      });
      var t2=totais(b);
      b.status='encerrado'; b.etapa=null; b.encerramento=hm(Math.max.apply(null,b.itens.map(function(it){ return minutos(it.hora||b.encInicio); }))); b.respEnc=b.resp; b.aprovadoPor=nome; b.aprovEm=LFI.agoraISO(); b.checklist=CHECK.slice(); b.clientes=cli||b.clientes;
      var ult=b.leituras[b.leituras.length-1]; if(!ult||Math.abs(ult.kg-t2.cons)>0.01) b.leituras.push({h:b.encInicio||b.encerramento, kg:t2.cons});
      var rs=LFI.resumoBuffet(b);
      LFI.atividade('buffet','Buffet '+b.num+' encerrado: '+kg(rs.consumo)+' consumidos · aproveitamento '+F.pct(rs.aproveitamento,0)+(entradas.length?' · '+entradas.length+' sobra(s) no estoque':''),{tela:'buffet',id:b.id});
      LFI.salvar(); UI.toast('Buffet '+b.num+' encerrado', entradas.length?entradas.length+' sobra(s) aprovadas entraram no estoque':'Sem sobras para o estoque'); LFI.recarregar();
    }
  }));
}
function badgeDest(d){ return d==='reaproveitar'?UI.badge('Reaproveitar','ok'):d==='perda'?UI.badge('Perda','wt'):d==='descarte'?UI.badge('Descarte','no'):UI.badge('Pendente','nu'); }

/* ================= RELATÓRIO DE UM BUFFET ENCERRADO ================= */
function relatorioBuffet(el, b){
  var r=LFI.resumoBuffet(b), preco=LFI.db.buffetPrecoKg, movs=LFI.db.movs.filter(function(m){ return m.origem&&m.origem.tipo==='buffet'&&m.origem.id===b.id; });
  var h=UI.cabecalho({migalha:[{t:'Buffet',ir:'buffet'},{t:b.num}], titulo:esc(b.num)+' · '+esc(b.turno)+' de '+F.data(b.data)+' '+UI.status('bf',b.status), sub:esc(LFI.dep(b.dep).nome)+' · '+esc(b.abertura)+' – '+esc(b.encerramento||'—')+' · abertura '+esc(b.resp)+' · aprovado por '+esc(b.aprovadoPor||'—'),
    acoes:'<button class="btn sec" data-act="xls">'+UI.ic('excel')+'Excel</button><button class="btn sec" data-act="pdf">'+UI.ic('pdf')+'PDF</button>'});
  h+='<div class="card mb" style="padding:16px 20px 2px">'+UI.passos(ETAPAS,4)+'</div>';
  h+='<div class="kpis k5">'+UI.kpi({lb:'Disponível', vl:kg(r.disp), dl:'inicial '+kg(r.ini)+' · reposições '+kg(r.repos)})+UI.kpi({lb:'Consumido', vl:kg(r.consumo), dl:F.num(b.clientes||0,0)+' clientes · '+(b.clientes?F.num(r.consumo/b.clientes*1000,0)+' g/cliente':'—')})+
    UI.kpi({lb:'Aproveitamento', vl:F.pct(r.aproveitamento), dl:'perda '+F.pct(r.perdaPct)+' do disponível', hl:true})+UI.kpi({lb:'<span style="color:var(--red)">●</span> Perdas ao custo', vl:F.moeda(r.vDesc+r.vPerda), dl:'descarte '+kg(r.descarte)+' · perda '+kg(r.perda)})+UI.kpi({lb:'Receita estimada', vl:F.moeda(r.consumo*preco), dl:'reaproveitado '+kg(r.reaproveitado)+' ('+F.moeda(r.vReap)+')'})+'</div>';
  h+='<div class="card pad0 mb"><h3>Ordem de encerramento <small>por item · valores ao custo da ficha técnica</small></h3><div id="rb-t" style="padding:0 8px 8px"></div></div>';
  h+='<div class="grid g2 mb"><div class="card"><h3>Destino do disponível</h3><div id="rb-dest"></div></div><div class="card"><h3>Consumo × sobra por item <small>kg</small></h3><div id="rb-bar"></div></div></div><div class="card mb"><h3>Curva de consumo <small>acumulado (kg) · leituras da balança</small></h3><div id="rb-cv"></div></div>';
  h+='<div class="card"><h3><span class="lft">'+UI.ic('estoque')+' Movimentações de estoque <span class="n">'+movs.length+'</span></span><small>somente sobras aprovadas entram no estoque</small></h3><div id="rb-mov"></div></div>';
  el.innerHTML=h;
  UI.tabela(el.querySelector('#rb-t'),{linhas:r.itens, cls:'cp', colunas:[
    {t:'Item', v:function(x){ return '<b>'+x.rec.foto+' '+esc(x.rec.nome.replace(/\s*\(.*\)/,''))+'</b><small>'+esc(catDe(x.it.rec))+'</small>'; }, ord:function(x){ return x.rec.nome; }},
    {t:'Inicial', r:true, v:function(x){ return kg(x.it.pesoIni); }, ord:function(x){ return x.it.pesoIni; }},
    {t:'Reposições', r:true, v:function(x){ return kg(x.rep)+'<small>'+(x.it.repos||[]).map(function(p){ return p.h; }).join(', ')+'</small>'; }, ord:function(x){ return x.rep; }},
    {t:'Disponível', r:true, v:function(x){ return kg(x.disp); }, ord:function(x){ return x.disp; }},
    {t:'Final', r:true, v:function(x){ return '<b>'+kg(x.it.pesoFinal)+'</b>'; }, ord:function(x){ return x.it.pesoFinal; }},
    {t:'Consumo', r:true, v:function(x){ return kg(x.cons)+'<small>'+F.pct(x.disp?x.cons/x.disp:0,0)+'</small>'; }, ord:function(x){ return x.cons; }},
    {t:'Temp. · hora', v:function(x){ return (x.it.temp!=null?F.num(x.it.temp,1)+' °C':'—')+'<small>'+esc(x.it.hora||'')+' · '+esc(x.it.cond||'')+'</small>'; }, ord:function(x){ return x.it.temp||0; }},
    {t:'Destino', v:function(x){ return badgeDest(x.it.destino)+(x.it.motivo?'<small>'+esc(x.it.motivo)+'</small>':''); }, ord:function(x){ return x.it.destino; }},
    {t:'Valor perdido', r:true, v:function(x){ var v=x.it.destino==='reaproveitar'?0:x.it.pesoFinal*x.custoKg; return v?'<b style="color:var(--red)">'+F.moeda(v)+'</b>':'<span style="color:var(--green);font-weight:800">—</span>'; }, ord:function(x){ return x.it.destino==='reaproveitar'?0:x.it.pesoFinal*x.custoKg; }}
  ], rodape:'<tr><td>Total</td><td class="r">'+kg(r.ini)+'</td><td class="r">'+kg(r.repos)+'</td><td class="r">'+kg(r.disp)+'</td><td class="r">'+kg(r.final)+'</td><td class="r">'+kg(r.consumo)+'</td><td></td><td></td><td class="r">'+F.moeda(r.vDesc+r.vPerda)+'</td></tr>'});
  UI.grafRosca(el.querySelector('#rb-dest'),{itens:[{nome:'Consumido',valor:r.consumo,cor:'#16A34A'},{nome:'Reaproveitado',valor:r.reaproveitado,cor:'#1D4ED8'},{nome:'Descarte',valor:r.descarte,cor:'#DC2626'},{nome:'Perda',valor:r.perda,cor:'#B08A00'}], fmt:kg, centro:{valor:F.pct(r.aproveitamento,0), rotulo:'aproveitamento'}});
  UI.grafBarras(el.querySelector('#rb-bar'),{cats:r.itens.map(function(x){ return x.rec.foto; }), titulosTip:r.itens.map(function(x){ return x.rec.nome; }), empilhado:true, altura:210, fmt:kg, fmtEixo:function(v){ return F.num(v,0); },
    series:[{nome:'Consumido', cor:'#16A34A', valores:r.itens.map(function(x){ return x.cons; })},{nome:'Sobra', cor:'#DC2626', valores:r.itens.map(function(x){ return x.it.pesoFinal; })}]});
  if(b.leituras&&b.leituras.length>1) UI.grafLinhas(el.querySelector('#rb-cv'),{cats:b.leituras.map(function(l){ return l.h; }), series:[{nome:'Consumo acumulado', cor:'#FF5A00', valores:b.leituras.map(function(l){ return l.kg; })}], fmt:kg, altura:210});
  else el.querySelector('#rb-cv').innerHTML=UI.vazio('Sem leituras registradas','📈');
  UI.tabela(el.querySelector('#rb-mov'),{linhas:movs, vazio:'Nenhuma sobra entrou no estoque (somente descartes e perdas).', colunas:[
    {t:'Data', v:function(m){ return F.dataHora(m.d); }, ord:function(m){ return m.d; }},
    {t:'Produto', v:function(m){ var p=LFI.prod(m.prod); return p?'<a class="vertodos" style="color:var(--text)" data-act="_ir" data-id="estoque/'+p.id+'">'+esc(p.nome)+'</a><small>'+esc(p.local)+(p.validade?' · validade '+F.data(p.validade):'')+'</small>':'—'; }, ord:function(m){ return m.prod; }},
    {t:'Tipo', v:function(m){ var t=LFI.TIPOS_MOV[m.tipo]||[m.tipo,'nu']; return UI.badge(t[0],t[1]); }, ord:function(m){ return m.tipo; }},
    {t:'Quantidade', r:true, v:function(m){ return '<b style="color:var('+(m.qtd<0?'--red':'--green')+')">'+(m.qtd>0?'+':'')+kg(m.qtd)+'</b>'; }, ord:function(m){ return m.qtd; }},
    {t:'Usuário', v:function(m){ return esc(m.usuario)+'<small>'+esc(m.obs||'')+'</small>'; }, ord:function(m){ return m.usuario; }}
  ]});
  UI.liga(el, UI.navHandlers({ pdf:function(){ pdfBuffet(b); }, xls:function(){ xlsBuffet(b); } }));
}
function linhasBuffet(b){ var r=LFI.resumoBuffet(b); return r.itens.map(function(x){ var perd=x.it.destino==='reaproveitar'?0:x.it.pesoFinal*x.custoKg; return [b.num, F.data(b.data), b.turno, x.rec.nome, x.it.pesoIni, x.rep, x.disp, x.it.pesoFinal, x.cons, x.it.temp==null?'':x.it.temp, x.it.hora||'', x.it.cond||'', x.it.destino, x.it.motivo||'', r2(x.custoKg), r2(perd)]; }); }
var CAB_XLS=['Buffet','Data','Turno','Item','Peso inicial (kg)','Reposições (kg)','Disponível (kg)','Peso final (kg)','Consumo (kg)','Temperatura (°C)','Horário','Condição','Destino','Motivo','Custo/kg','Valor perdido (R$)'];
function xlsBuffet(b){ UI.exportarExcel('buffet_'+b.num, CAB_XLS, linhasBuffet(b), b.num); UI.toast('Planilha exportada', b.num); }
function pdfBuffet(b){
  var r=LFI.resumoBuffet(b);
  var h='<div class="kp"><div><span>Disponível</span><b>'+kg(r.disp)+'</b></div><div><span>Consumido</span><b>'+kg(r.consumo)+'</b></div><div><span>Aproveitamento</span><b>'+F.pct(r.aproveitamento)+'</b></div><div><span>Perdas</span><b>'+F.moeda(r.vDesc+r.vPerda)+'</b></div><div><span>Clientes</span><b>'+F.num(b.clientes||0,0)+'</b></div></div>'+
    '<h2>Itens</h2><table><thead><tr><th>Item</th><th class="r">Inicial</th><th class="r">Repos.</th><th class="r">Disp.</th><th class="r">Final</th><th class="r">Consumo</th><th class="r">Temp.</th><th>Destino</th><th class="r">Perdido</th></tr></thead><tbody>'+
    r.itens.map(function(x){ return '<tr><td>'+esc(x.rec.nome)+'</td><td class="r">'+kg(x.it.pesoIni)+'</td><td class="r">'+kg(x.rep)+'</td><td class="r">'+kg(x.disp)+'</td><td class="r">'+kg(x.it.pesoFinal)+'</td><td class="r">'+kg(x.cons)+'</td><td class="r">'+(x.it.temp!=null?x.it.temp+' °C':'—')+'</td><td>'+esc(x.it.destino)+(x.it.motivo?' — '+esc(x.it.motivo):'')+'</td><td class="r">'+F.moeda(x.it.destino==='reaproveitar'?0:x.it.pesoFinal*x.custoKg)+'</td></tr>'; }).join('')+
    '</tbody><tfoot><tr><td>Total</td><td class="r">'+kg(r.ini)+'</td><td class="r">'+kg(r.repos)+'</td><td class="r">'+kg(r.disp)+'</td><td class="r">'+kg(r.final)+'</td><td class="r">'+kg(r.consumo)+'</td><td></td><td></td><td class="r">'+F.moeda(r.vDesc+r.vPerda)+'</td></tr></tfoot></table>'+
    '<h2>Aprovação</h2><p>Abertura: '+esc(b.resp)+' às '+esc(b.abertura)+' · Encerramento: '+esc(b.respEnc||b.resp)+' às '+esc(b.encerramento||'—')+' · Aprovado por: <b>'+esc(b.aprovadoPor||'—')+'</b></p>';
  UI.exportarPDF('Ordem de encerramento '+b.num, b.turno+' de '+F.data(b.data)+' · '+LFI.dep(b.dep).nome, h);
}

/* ================= RELATÓRIO GERAL DE PERDAS E APROVEITAMENTO ================= */
function relatorioGeralHTML(enc){
  if(!enc.length) return '<div class="card">'+UI.vazio('Nenhum buffet encerrado para a empresa selecionada.','🍣')+'</div>';
  return '<div class="barra"><span style="font-size:13px;font-weight:700;color:var(--muted)">'+enc.length+' buffet(s) encerrado(s) · valores ao custo das fichas técnicas</span><span class="sp"></span><button class="btn sec sm" data-act="xlsGeral">'+UI.ic('excel')+'Exportar Excel</button><button class="btn sec sm" data-act="pdfGeral">'+UI.ic('pdf')+'Exportar PDF</button></div>'+
    '<div class="grid g21 mb"><div class="card"><h3>Perdas por produto <small>descarte + perda, ao custo</small></h3><div id="rg-prod"></div></div><div class="card"><h3>Destino do disponível <small>todos os buffets</small></h3><div id="rg-dest"></div></div></div>'+
    '<div class="card pad0 mb"><h3>Aproveitamento por produto</h3><div id="rg-t" style="padding:0 8px 8px"></div></div>'+
    '<div class="card pad0"><h3>Histórico de buffets encerrados</h3><div id="rg-b" style="padding:0 8px 8px"></div></div>';
}
function agregaProdutos(enc){
  var o={}; enc.forEach(function(b){ LFI.resumoBuffet(b).itens.forEach(function(x){ var k=x.it.rec, a=o[k]=o[k]||{rec:x.rec, disp:0, cons:0, reap:0, desc:0, perda:0, v:0, n:0}; a.n++; a.disp+=x.disp; a.cons+=x.cons; var f=x.it.pesoFinal;
    if(x.it.destino==='reaproveitar') a.reap+=f; else if(x.it.destino==='perda'){ a.perda+=f; a.v+=f*x.custoKg; } else { a.desc+=f; a.v+=f*x.custoKg; } }); });
  return Object.keys(o).map(function(k){ return o[k]; });
}
function relatorioGeral(el, enc){
  if(!enc.length) return;
  var ag=agregaProdutos(enc), T={cons:0, reap:0, desc:0, perda:0};
  ag.forEach(function(a){ T.cons+=a.cons; T.reap+=a.reap; T.desc+=a.desc; T.perda+=a.perda; });
  el.querySelector('#rg-prod').innerHTML=UI.barrasH(ag.filter(function(a){ return a.v>0; }).sort(function(a,b){ return b.v-a.v; }).map(function(a){ return {nome:a.rec.foto+' '+a.rec.nome.replace(/\s*\(.*\)/,''), valor:a.v, sub:kg(a.desc+a.perda), cor:'var(--red)'}; }));
  UI.grafRosca(el.querySelector('#rg-dest'),{itens:[{nome:'Consumido',valor:T.cons,cor:'#16A34A'},{nome:'Reaproveitado',valor:T.reap,cor:'#1D4ED8'},{nome:'Descarte',valor:T.desc,cor:'#DC2626'},{nome:'Perda',valor:T.perda,cor:'#B08A00'}], fmt:kg, centro:{valor:kg(T.cons+T.reap+T.desc+T.perda), rotulo:'disponível'}});
  UI.tabela(el.querySelector('#rg-t'),{linhas:ag, ordem:7, dir:-1, colunas:[
    {t:'Produto', v:function(a){ return '<b>'+a.rec.foto+' '+esc(a.rec.nome)+'</b><small>'+esc(regraDe(a.rec.id)?regraDe(a.rec.id).grupo:'')+'</small>'; }, ord:function(a){ return a.rec.nome; }},
    {t:'Disponível', r:true, v:function(a){ return kg(a.disp); }, ord:function(a){ return a.disp; }},
    {t:'Consumido', r:true, v:function(a){ return kg(a.cons); }, ord:function(a){ return a.cons; }},
    {t:'Reaproveitado', r:true, v:function(a){ return kg(a.reap); }, ord:function(a){ return a.reap; }},
    {t:'Descarte', r:true, v:function(a){ return kg(a.desc); }, ord:function(a){ return a.desc; }},
    {t:'Perda', r:true, v:function(a){ return kg(a.perda); }, ord:function(a){ return a.perda; }},
    {t:'Aproveitamento', r:true, v:function(a){ var f=a.disp?(a.cons+a.reap)/a.disp:0; return '<div style="display:flex;gap:8px;align-items:center;justify-content:flex-end">'+UI.bar(f,f>0.85?'ok':f>0.75?'wt':'no')+'<b style="width:46px">'+F.pct(f,0)+'</b></div>'; }, ord:function(a){ return a.disp?(a.cons+a.reap)/a.disp:0; }},
    {t:'Valor perdido', r:true, v:function(a){ return '<b style="color:var(--red)">'+F.moeda(a.v)+'</b>'; }, ord:function(a){ return a.v; }}
  ]});
  UI.tabela(el.querySelector('#rg-b'),{linhas:enc, linhaAct:'abrir', colunas:[
    {t:'Buffet', v:function(b){ return '<b>'+esc(b.num)+'</b><small>'+esc(b.turno)+' · '+esc(b.resp)+'</small>'; }, ord:function(b){ return b.num; }},
    {t:'Data', v:function(b){ return F.data(b.data); }, ord:function(b){ return b.data; }},
    {t:'Clientes', r:true, v:function(b){ return F.num(b.clientes||0,0); }, ord:function(b){ return b.clientes||0; }},
    {t:'Disponível', r:true, v:function(b){ return kg(LFI.resumoBuffet(b).disp); }, ord:function(b){ return LFI.resumoBuffet(b).disp; }},
    {t:'Consumo', r:true, v:function(b){ return kg(LFI.resumoBuffet(b).consumo); }, ord:function(b){ return LFI.resumoBuffet(b).consumo; }},
    {t:'Aproveitamento', r:true, v:function(b){ return F.pct(LFI.resumoBuffet(b).aproveitamento); }, ord:function(b){ return LFI.resumoBuffet(b).aproveitamento; }},
    {t:'Reaproveitado', r:true, v:function(b){ var r=LFI.resumoBuffet(b); return kg(r.reaproveitado)+'<small>'+F.moeda(r.vReap)+'</small>'; }, ord:function(b){ return LFI.resumoBuffet(b).reaproveitado; }},
    {t:'Perdas', r:true, v:function(b){ var r=LFI.resumoBuffet(b); return '<b style="color:var(--red)">'+F.moeda(r.vDesc+r.vPerda)+'</b><small>'+kg(r.descarte+r.perda)+'</small>'; }, ord:function(b){ var r=LFI.resumoBuffet(b); return r.vDesc+r.vPerda; }}
  ]});
}
function encVisiveis(){ return visiveis().filter(function(b){ return b.status==='encerrado'; }); }
function xlsGeral(){ var l=[]; encVisiveis().forEach(function(b){ l=l.concat(linhasBuffet(b)); }); UI.exportarExcel('buffet_perdas_aproveitamento', CAB_XLS, l, 'Perdas e aproveitamento'); UI.toast('Planilha exportada', l.length+' linhas'); }
function pdfGeral(){
  var enc=encVisiveis(), ag=agregaProdutos(enc), T={disp:0,cons:0,v:0,reap:0};
  ag.forEach(function(a){ T.disp+=a.disp; T.cons+=a.cons; T.v+=a.v; T.reap+=a.reap; });
  var h='<div class="kp"><div><span>Buffets</span><b>'+enc.length+'</b></div><div><span>Disponível</span><b>'+kg(T.disp)+'</b></div><div><span>Consumido</span><b>'+kg(T.cons)+'</b></div><div><span>Aproveitamento</span><b>'+F.pct(T.disp?(T.cons+T.reap)/T.disp:0)+'</b></div><div><span>Perdas</span><b>'+F.moeda(T.v)+'</b></div></div>'+
    '<h2>Por produto</h2><table><thead><tr><th>Produto</th><th class="r">Disponível</th><th class="r">Consumido</th><th class="r">Reaproveitado</th><th class="r">Descarte</th><th class="r">Perda</th><th class="r">Valor perdido</th></tr></thead><tbody>'+ag.map(function(a){ return '<tr><td>'+esc(a.rec.nome)+'</td><td class="r">'+kg(a.disp)+'</td><td class="r">'+kg(a.cons)+'</td><td class="r">'+kg(a.reap)+'</td><td class="r">'+kg(a.desc)+'</td><td class="r">'+kg(a.perda)+'</td><td class="r">'+F.moeda(a.v)+'</td></tr>'; }).join('')+'</tbody></table>'+
    '<h2>Buffets</h2><table><thead><tr><th>Buffet</th><th>Data</th><th class="r">Clientes</th><th class="r">Consumo</th><th class="r">Aproveitamento</th><th class="r">Perdas</th></tr></thead><tbody>'+enc.map(function(b){ var r=LFI.resumoBuffet(b); return '<tr><td>'+esc(b.num)+' · '+esc(b.turno)+'</td><td>'+F.data(b.data)+'</td><td class="r">'+(b.clientes||0)+'</td><td class="r">'+kg(r.consumo)+'</td><td class="r">'+F.pct(r.aproveitamento)+'</td><td class="r">'+F.moeda(r.vDesc+r.vPerda)+'</td></tr>'; }).join('')+'</tbody></table>';
  UI.exportarPDF('Relatório de perdas e aproveitamento do buffet', 'Buffets encerrados', h);
}

LFI.registrar('buffet',{titulo:'Buffet e Pesagem', render:render});
})();
