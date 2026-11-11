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
  '@media (max-width:700px){.bf-cta{flex-direction:column;text-align:center;justify-content:center}.bf-cta>div{width:100%}.bf-cta .bf-emos{justify-content:center}.bf-cta>.btn{width:100%;min-height:58px;font-size:17px}}'+
  '.bf-cta h2{margin:0 0 4px;font-size:21px;font-weight:800}.bf-cta p{margin:0;color:#C9C9CF;font-size:13.5px;font-weight:600;max-width:560px;line-height:1.5}'+
  '.bf-cta .btn{min-height:56px;font-size:16px;padding:14px 26px;border-radius:14px}'+
  '.bf-cta-x{}.bf-emos{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.bf-emos span{width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font-size:18px}'+
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
  if(arg==='novo') return abertura2(el);
  if(arg){ var b=LFI.buffet(arg); if(b){ if(b.status==='aberto') return acompanhamento(el,b); if(b.status==='encerramento') return b.etapa==='aprovacao'?aprovacao(el,b):encerramento2(el,b); return relatorioBuffet(el,b); } }
  principal(el);
}

/* ================= TELA PRINCIPAL ================= */
function principal(el){
  var s=st(), ls=visiveis().slice().sort(function(a,b){ return (b.data+b.abertura)>(a.data+a.abertura)?1:-1; });
  var abertos=ls.filter(function(b){ return b.status!=='encerrado'; }), enc=ls.filter(function(b){ return b.status==='encerrado'; });
  var mes=LFI.hoje().slice(0,7), doMes=ls.filter(function(b){ return b.data.slice(0,7)===mes; }), encMes=doMes.filter(function(b){ return b.status==='encerrado'; });
  var A={disp:0, cons:0, cli:0, perdas:0, reap:0}; encMes.forEach(function(b){ var r=LFI.resumoBuffet(b); A.disp+=r.disp; A.cons+=r.consumo; A.cli+=b.clientes||0; A.perdas+=r.vDesc+r.vPerda; A.reap+=r.vReap; });
  var turno=new Date().getHours()<16?'almoço':'jantar', susOk=LFI.depVisivel('res');
  var abertosTopo=false;
  var h=UI.cabecalho({titulo:'Buffet', sub:'Pesagem das cubas · '+F.moeda(LFI.db.buffetPrecoKg)+'/kg',
    acoes:(s.aba!=='operacao'?'<button class="btn sec" data-act="aba" data-id="operacao">'+UI.ic('voltar')+'Voltar à pesagem</button>':'')+'<button class="btn sec" data-act="qr">'+UI.ic('raio')+'Gravar QR Code</button>'+'<button class="btn sec" data-act="dados">'+UI.ic('relatorio')+'Dados</button>'+(susOk&&abertosTopo?'<button class="btn pri" data-act="novo">'+UI.ic('balanca')+'Abrir buffet</button>':'')});
  if(s.aba==='relatorio'){ el.innerHTML=h+relatorioGeralHTML(enc); relatorioGeral(el, enc); ligaPrincipal(el); return; }
  if(s.aba==='regras'){ el.innerHTML=h+regrasHTML(); ligaPrincipal(el); return; }

  if(!susOk) h+=UI.nota('O buffet de sushi por quilo é operado no <b>'+esc((LFI.emp('e2')||{}).fantasia||'Restaurante')+'</b>. Selecione essa empresa ou a visão consolidada no topo para abrir um buffet.','wt');
  abertos.forEach(function(b){ var t=totais(b), al=b.itens.filter(function(it){ return b.status==='aberto'&&restKg(it)<it.pesoIni*0.25; }).length;
    h+='<div class="card mb"><div class="bf-open"><div><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:6px"><b style="font-size:18px">'+esc(b.num)+' · '+esc(b.turno)+'</b>'+UI.status('bf',b.status)+UI.dep(b.dep)+(al?UI.badge(al+' alerta(s) de reposição','no'):'')+'</div>'+
      '<div style="font-size:13px;color:var(--muted);font-weight:700">Aberto às '+esc(b.abertura)+' por '+esc(b.resp)+' · '+b.itens.length+' itens · '+F.num(b.clientes||0,0)+' clientes</div>'+
      '<div class="kv c4" style="margin-top:14px"><div><span>Tempo de operação</span><b class="relogio" data-bf="'+b.id+'">'+dur(decorrido(b))+'</b></div><div><span>Disponível</span><b>'+kg(t.disp)+'</b></div><div><span>Consumido</span><b>'+kg(t.cons)+' <small>'+F.pct(t.disp?t.cons/t.disp:0,0)+'</small></b></div><div><span>Receita estimada</span><b>'+F.moeda(t.cons*LFI.db.buffetPrecoKg)+'</b></div></div>'+
      '<div style="margin-top:12px">'+UI.bar(t.disp?t.cons/t.disp:0,'lg')+'</div></div>'+
      '<div><button class="btn pri lg" data-act="_ir" data-id="buffet/'+b.id+'">'+(b.status==='aberto'?UI.ic('balanca')+'Acompanhar buffet':UI.ic('check')+'Continuar encerramento')+'</button></div></div></div>'; });
  if(!abertos.length&&susOk) h+='<div class="bf-cta mb"><div><h2>Abrir buffet do '+turno+'</h2><p>Registre a pesagem inicial de cada cuba com a balança integrada, acompanhe o consumo em tempo real e encerre com controle de sobras, temperatura e destino.</p><div class="bf-emos">'+CATS[0].recs.concat(CATS[1].recs).map(function(id){ return '<span>'+LFI.rec(id).foto+'</span>'; }).join('')+'</div></div>'+
    '<button class="btn pri" data-act="novo">'+UI.ic('balanca')+'Abrir buffet do '+turno+'</button></div>';
  h+='<div class="card pad0 mb"><h3>Histórico de buffets <small>clique para abrir</small></h3><div id="bf-hist" style="padding:0 8px 8px"></div></div>';
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
  ligaPrincipal(el);
  iniciaRelogio(el);
}
function ligaPrincipal(el){ var s=st(); UI.liga(el, UI.navHandlers({ qr:function(){ gravarQR(); }, dados:function(){ dadosModal(); }, aba:function(id){ s.aba=id; LFI.recarregar(); }, novo:function(){ LFI.ir('buffet','novo'); }, abrir:function(id){ LFI.ir('buffet',id); },
  pdfGeral:function(){ pdfGeral(); }, xlsGeral:function(){ xlsGeral(); } })); }

/* indicadores e gráficos do buffet: ficam num botão "Dados" para a tela principal ficar só com a pesagem */
function dadosModal(){
  var ls=visiveis(), enc=ls.filter(function(b){ return b.status==='encerrado'; }).sort(function(a,b){ return (b.data+b.abertura)>(a.data+a.abertura)?1:-1; });
  var mes=LFI.hoje().slice(0,7), doMes=ls.filter(function(b){ return b.data.slice(0,7)===mes; }), encMes=doMes.filter(function(b){ return b.status==='encerrado'; });
  var A={disp:0, cons:0, cli:0, perdas:0, reap:0}; encMes.forEach(function(b){ var r=LFI.resumoBuffet(b); A.disp+=r.disp; A.cons+=r.consumo; A.cli+=b.clientes||0; A.perdas+=r.vDesc+r.vPerda; A.reap+=r.vReap; });
  var h='<div class="kpis">'+
    UI.kpi({lb:'Buffets no mês', vl:String(doMes.length), dl:encMes.length+' encerrado(s)'})+
    UI.kpi({lb:'Consumo por cliente', vl:A.cli?F.num(A.cons/A.cli*1000,0)+' <small>g</small>':'—', dl:A.cli?F.num(A.cli,0)+' clientes · '+kg(A.cons):'sem buffets encerrados'})+
    UI.kpi({lb:'Aproveitamento', vl:A.disp?F.pct(A.cons/A.disp):'—', dl:'consumido ÷ disponível', hl:true})+
    UI.kpi({lb:'Perdas do buffet', vl:F.moeda(A.perdas), dl:'reaproveitado '+F.moeda(A.reap)})+'</div>';
  h+='<div class="card flat"><h3>Último buffet encerrado <small>'+(enc[0]?esc(enc[0].num)+' · '+F.data(enc[0].data):'')+'</small></h3><div id="dm-ult"></div></div>';
  var m=UI.modal({titulo:'Dados do buffet', sub:'Mês atual', tam:'lg', corpo:h,
    botoes:'<button class="btn sec esq" data-act="reg">Regras de conservação</button><button class="btn sec" data-act="_fechar">Fechar</button><button class="btn pri" data-act="rel">'+UI.ic('relatorio')+'Relatório de perdas</button>',
    acoes:{rel:function(){ st().aba='relatorio'; m.fechar(); LFI.ir('buffet'); }, reg:function(){ st().aba='regras'; m.fechar(); LFI.ir('buffet'); }}});
  var box=m.corpo.querySelector('#dm-ult');
  if(enc[0]){ var r=LFI.resumoBuffet(enc[0]); UI.grafRosca(box,{itens:[{nome:'Consumido',valor:r.consumo,cor:'#16A34A'},{nome:'Reaproveitado',valor:r.reaproveitado,cor:'#1D4ED8'},{nome:'Descarte',valor:r.descarte,cor:'#DC2626'},{nome:'Perda',valor:r.perda,cor:'#B08A00'}], fmt:kg, centro:{valor:F.pct(r.aproveitamento,0), rotulo:'aproveitamento'}}); }
  else box.innerHTML=UI.vazio('Nenhum buffet encerrado','🍣');
}
function dadosAcomp(b){
  var t=totais(b), preco=LFI.db.buffetPrecoKg;
  var m=UI.modal({titulo:'Dados do '+esc(b.num), sub:'Consumo até agora', tam:'xl', corpo:'<div class="kpis">'+UI.kpi({lb:'Consumido', vl:kg(t.cons), dl:F.pct(t.disp?t.cons/t.disp:0)+' do disponível', hl:true})+UI.kpi({lb:'Restante estimado', vl:kg(t.rest)})+UI.kpi({lb:'Receita estimada', vl:F.moeda(t.cons*preco)})+UI.kpi({lb:'Clientes', vl:F.num(b.clientes||0,0), dl:b.clientes?F.num(t.cons/b.clientes*1000,0)+' g por cliente':''})+'</div>'+
    '<div class="grid g2 mb"><div class="card flat"><h3>Consumo por categoria</h3><div id="g-cat"></div></div><div class="card flat"><h3>Consumo por produto <small>kg</small></h3><div id="g-prod"></div></div></div><div class="card flat"><h3>Curva de consumo <small>acumulado (kg)</small></h3><div id="g-curva"></div></div>'});
  var el=m.corpo;
  setTimeout(function(){
    var porCat={}; b.itens.forEach(function(it){ var c=catDe(it.rec); porCat[c]=(porCat[c]||0)+(it.cons||0); });
    if(t.cons) UI.grafRosca(el.querySelector('#g-cat'),{itens:Object.keys(porCat).map(function(c,i){ return {nome:c, valor:porCat[c], cor:['#C2185B','#16A34A','#1D4ED8'][i]}; }), fmt:kg, centro:{valor:kg(t.cons), rotulo:'consumidos'}});
    else el.querySelector('#g-cat').innerHTML=UI.vazio('Aguardando consumo.','⏱️');
    var pl=b.itens.map(function(it){ var r=LFI.rec(it.rec); return {nome:r.foto+' '+r.nome.replace(/\s*\(.*\)/,''), valor:it.cons||0, cor:catDe(it.rec)==='Sushi'?'#C2185B':'#16A34A', sub:F.moeda((it.cons||0)*preco)}; }).sort(function(a,c){ return c.valor-a.valor; });
    el.querySelector('#g-prod').innerHTML=UI.barrasH(pl,{fmt:kg});
    if(b.leituras.length>1) UI.grafLinhas(el.querySelector('#g-curva'),{cats:b.leituras.map(function(l){ return l.h; }), series:[{nome:'Consumo acumulado', cor:'#FF5A00', valores:b.leituras.map(function(l){ return l.kg; })}], fmt:kg, altura:200});
    else el.querySelector('#g-curva').innerHTML=UI.vazio('A curva aparece com as leituras da balança.','📈');
  },40);
}
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
    acoes:'<span class="bf-scale"><i></i>Balança conectada (simulação)</span><button class="btn sec md" data-act="dadosA">'+UI.ic('relatorio')+'Dados</button><button class="btn sec md" data-act="simular">'+UI.ic('relogio')+'Simular +30 min de operação</button><button class="btn pri md" data-act="encerrar">'+UI.ic('check')+'Iniciar encerramento</button>'});
  h+='<div class="card mb" style="padding:16px 20px 2px">'+UI.passos(ETAPAS,1)+'</div>';
  h+='<div class="kpis k3">'+
    UI.kpi({lb:'Tempo de operação', vl:'<span class="relogio" data-bf="'+b.id+'">'+dur(decorrido(b))+'</span>', dl:'desde '+esc(b.abertura), hl:true})+
    UI.kpi({lb:'Peso disponível', vl:kg(t.disp), dl:'inicial '+kg(t.ini)+' · reposições '+kg(t.rep)})+
    UI.kpi({lb:'Restante estimado', vl:kg(t.rest), dl:alertas.length?(function(){ var n=alertas.filter(function(x){ return x.nivel==='al'; }).length; return n?'<span style="color:var(--red)">'+n+' item(ns) para repor</span>':'<span style="color:#946C00">'+alertas.length+' item(ns) em atenção</span>'; })():'níveis adequados'})+
  '</div>';
  if(alertas.length) h+='<div class="mb">'+alertas.map(function(x){ var r=LFI.rec(x.it.rec); return '<div class="bf-alr '+(x.nivel==='at'?'at':'')+'">'+UI.ic('alerta','')+'<span>'+(x.nivel==='al'?'Repor agora: ':'Atenção: ')+r.foto+' '+esc(r.nome)+' — restam ~'+kg(x.rest)+' ('+F.pct(x.f,0)+' da cuba)</span><span class="sp"></span><button class="btn '+(x.nivel==='al'?'pri':'sec')+' md" data-act="repor" data-id="'+x.it.rec+'">'+UI.ic('mais')+'Registrar reposição</button></div>'; }).join('')+'</div>';
  else h+=UI.nota('Nenhum alerta de reposição. Alertas aparecem quando o restante estimado de uma cuba fica abaixo de 25% do peso inicial.','ok','check');
  CATS.forEach(function(c){ var its=b.itens.filter(function(it){ return catDe(it.rec)===c.nome; }); if(!its.length) return;
    h+='<div class="card mb"><h3><span class="lft">'+esc(c.nome)+'</span><small>'+kg(its.reduce(function(a,it){ return a+(it.cons||0); },0))+' consumidos</small></h3><div class="bf-grid">'+its.map(function(it){ var r=LFI.rec(it.rec), disp=dispKg(it), rest=restKg(it), f=it.pesoIni?rest/it.pesoIni:1, pc=disp?(it.cons||0)/disp:0;
      return '<div class="bf-it '+(f<0.25?'al':f<0.4?'at':'')+'"><div class="hd"><span class="em" style="background:'+r.cor+'">'+r.foto+'</span><div class="gr"><b>'+esc(r.nome.replace(/\s*\(.*\)/,''))+'</b><small>'+(it.repos.length?it.repos.length+' reposição(ões) · última '+it.repos[it.repos.length-1].h:'sem reposições')+'</small></div>'+(f<0.25?UI.badge('Repor','no'):f<0.4?UI.badge('Atenção','wt'):UI.badge(F.pct(pc,0),'lf'))+'</div>'+
        '<div style="display:flex;justify-content:space-between;font-size:11.5px;font-weight:800;color:var(--muted);margin-bottom:5px"><span>Consumo</span><span>'+F.pct(pc,0)+'</span></div>'+UI.bar(pc,f<0.25?'no':f<0.4?'wt':'')+
        '<div class="pesos"><div>Inicial<b>'+kg(it.pesoIni)+'</b></div><div>Reposições<b>'+kg(reposKg(it))+'</b></div><div>Consumido<b>'+kg(it.cons||0)+'</b></div><div>Restante<b style="color:var('+(f<0.25?'--red':'--text')+')">'+kg(rest)+'</b></div></div>'+
        '<div class="bf-row" style="margin-top:12px"><button class="btn sec md" style="flex:1" data-act="repor" data-id="'+it.rec+'">'+UI.ic('mais')+'Reposição</button><button class="btn sec md" style="flex:1" data-act="pesar" data-id="'+it.rec+'">'+UI.ic('balanca')+'Pesar cuba</button></div></div>'; }).join('')+'</div></div>'; });
  el.innerHTML=h;
  iniciaRelogio(el);
  UI.liga(el, UI.navHandlers({
    dadosA:function(){ dadosAcomp(b); },
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
  if(it.temp!=null&&it.temp!==''&&+it.temp>g.tempMax) return {g:g, pode:false, motivo:'Temperatura de '+F.num(+it.temp,1)+' °C acima do limite de '+g.tempMax+' °C.'};
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


/* =====================================================================
   BUFFET PELO CELULAR: bandeja com QR Code + foto única (QR + visor da balança)
   Abertura: produto → foto na balança → confirmar → outro item / finalizar
   Encerramento: foto na balança → sobra → destino → próxima / finalizar
   ===================================================================== */
function bandejas(){ var db=LFI.db; if(!db.bandejas){ db.bandejas=[]; for(var i=1;i<=10;i++) db.bandejas.push({id:'B'+String(i).padStart(2,'0'), codigo:'LP-BDJ-'+String(i).padStart(3,'0'), tara:r3(0.38+((i*37)%17)/100), criada:LFI.hoje()}); LFI.salvar(); } return db.bandejas; }
function bandeja(id){ return bandejas().filter(function(x){ return x.id===id; })[0]; }
function hashS(s){ var h=2166136261; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
/* QR Code ilustrativo (padrão visual com os 3 marcadores de canto) */
function qrSVG(codigo, tam){
  var n=21, h=hashS(codigo), s='', bit=function(x,y){ h=(Math.imul(h^(x*73856093)^(y*19349663),2654435761))>>>0; return h%100<47; };
  function fin(x,y){ return '<rect x="'+x+'" y="'+y+'" width="7" height="7" fill="#111"/><rect x="'+(x+1)+'" y="'+(y+1)+'" width="5" height="5" fill="#fff"/><rect x="'+(x+2)+'" y="'+(y+2)+'" width="3" height="3" fill="#111"/>'; }
  for(var y=0;y<n;y++) for(var x=0;x<n;x++){ var f=(x<8&&y<8)||(x>12&&y<8)||(x<8&&y>12); if(!f&&bit(x,y)) s+='<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="#111"/>'; }
  return '<svg viewBox="-1 -1 23 23" width="'+(tam||96)+'" height="'+(tam||96)+'" style="background:#fff;display:block" aria-label="QR Code '+esc(codigo)+'">'+s+fin(0,0)+fin(14,0)+fin(0,14)+'</svg>';
}
/* foto de exemplo: bandeja com adesivo QR sobre a balança, visor mostrando o peso */
function fotoBalanca(rec, band, bruto){
  var c=document.createElement('canvas'); c.width=520; c.height=390; var x=c.getContext('2d');
  x.fillStyle='#3B3530'; x.fillRect(0,0,520,390);
  x.fillStyle='#C9CDD2'; x.fillRect(60,250,400,110); x.fillStyle='#9AA0A6'; x.fillRect(60,250,400,10);
  x.fillStyle='#111'; x.fillRect(300,280,140,60); x.fillStyle='#7CFC9A'; x.font='bold 30px monospace'; x.fillText(Number(bruto).toFixed(3),312,322); x.font='bold 11px Arial'; x.fillText('kg',418,334);
  x.fillStyle='#F3F3F0'; x.fillRect(90,120,340,130); x.fillStyle='#E2E2DD'; x.fillRect(100,130,320,110);
  var r=LFI.rec(rec); x.font='54px serif'; x.fillText(r?r.foto:'🍱',200,205);
  x.fillStyle='#fff'; x.fillRect(110,140,60,72); x.fillStyle='#111'; var h=hashS(band.codigo);
  for(var yy=0;yy<14;yy++) for(var xx=0;xx<14;xx++){ h=(Math.imul(h^(xx*31+yy*7),2654435761))>>>0; if(h%100<46||(xx<4&&yy<4)||(xx>9&&yy<4)||(xx<4&&yy>9)) x.fillRect(113+xx*3.9,143+yy*3.9,3.9,3.9); }
  x.font='bold 10px Arial'; x.fillText(band.id,128,208);
  return c.toDataURL('image/jpeg',0.72);
}
function fotoInput(acao){ return '<label class="bm-cam"><input type="file" accept="image/*" capture="environment" data-chg="'+acao+'">'+UI.ic('foto')+'<b>Tirar foto</b><small>bandeja na balança, com o QR Code e o visor aparecendo</small></label><button class="bm-btn sec" data-act="'+acao+'Ex">Usar foto de exemplo</button>'; }
function lerArquivo(ev, cb){ var a=ev.target.files&&ev.target.files[0]; if(!a) return; var rd=new FileReader(); rd.onload=function(){ var im=new Image(); im.onload=function(){ var k=Math.min(1,520/Math.max(im.width,im.height)), c=document.createElement('canvas'); c.width=im.width*k; c.height=im.height*k; c.getContext('2d').drawImage(im,0,0,c.width,c.height); cb(c.toDataURL('image/jpeg',0.7)); }; im.src=rd.result; }; rd.readAsDataURL(a); }
function telaMobile(el, titulo, sub, corpo, voltar){
  el.innerHTML='<div class="bm"><div class="bm-hd"><button class="bm-x" data-act="'+(voltar||'_ir')+'" data-id="buffet" aria-label="Voltar">'+UI.ic('voltar')+'</button><div><b>'+titulo+'</b><small>'+sub+'</small></div></div>'+corpo+'</div>';
}
function css3(){ if(document.getElementById('css-buffet3')) return; var c=document.createElement('style'); c.id='css-buffet3'; c.textContent=
  '.bm{max-width:560px;margin:0 auto;padding-bottom:40px}.bm-hd{display:flex;align-items:center;gap:12px;margin-bottom:16px}.bm-hd b{display:block;font-size:20px;font-weight:800}.bm-hd small{font-size:13px;color:var(--muted);font-weight:700}'+
  '.bm-x{width:48px;height:48px;border-radius:14px;border:1px solid var(--border2);background:#fff;display:flex;align-items:center;justify-content:center;flex:none;cursor:pointer}.bm-x svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2}'+
  '.bm-pass{display:flex;gap:6px;margin-bottom:16px}.bm-pass i{flex:1;height:6px;border-radius:99px;background:var(--s4)}.bm-pass i.on{background:var(--roxo)}'+
  '.bm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.bm-prod{display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px 10px;border:2px solid var(--border2);border-radius:18px;background:#fff;cursor:pointer;font:inherit;color:inherit;min-height:128px;justify-content:center}.bm-prod .em{font-size:44px;line-height:1}.bm-prod b{font-size:15px;text-align:center}.bm-prod small{font-size:12px;color:var(--green);font-weight:800}.bm-prod.feito{border-color:#BBE5C8;background:#F3FBF5}'+
  '.bm-cat{font-size:12px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin:16px 2px 8px}'+
  '.bm-cam{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:220px;border:3px dashed var(--roxo);border-radius:22px;background:var(--lf-soft);color:var(--roxo-esc);cursor:pointer;text-align:center;padding:20px;margin-bottom:10px}.bm-cam input{display:none}.bm-cam svg{width:54px;height:54px;stroke:currentColor;fill:none;stroke-width:1.8}.bm-cam b{font-size:22px}.bm-cam small{font-size:14px;font-weight:700;color:#8A3A0A}'+
  '.bm-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:64px;border-radius:18px;border:0;font:inherit;font-size:18px;font-weight:800;cursor:pointer;margin-top:10px}.bm-btn svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2.2}.bm-btn.pri{background:var(--roxo);color:#fff}.bm-btn.ok{background:var(--green);color:#fff}.bm-btn.sec{background:#fff;border:1.5px solid var(--border2);color:var(--text)}.bm-btn.esc{background:var(--text);color:#fff}.bm-btn.no{background:#fff;border:2px solid #F5C2C2;color:var(--red)}.bm-btn:disabled{opacity:.4}'+
  '.bm-foto{width:100%;border-radius:18px;display:block;margin-bottom:12px}.bm-lido{background:#fff;border:1px solid var(--border);border-radius:18px;padding:16px;margin-bottom:6px}.bm-lido .ln{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:15px;font-weight:700}.bm-lido .ln:last-child{border:0}.bm-lido .ln span{color:var(--muted2)}.bm-peso{font-size:40px;font-weight:800;text-align:center;margin:6px 0 2px;font-variant-numeric:tabular-nums}.bm-peso small{font-size:18px;color:var(--muted)}'+
  '.bm-ok{display:flex;align-items:center;gap:8px;color:var(--green);font-weight:800;font-size:14px;justify-content:center}.bm-ok svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2.4;flex:none}.bm-dest button>span{display:block;text-align:left}.bm-in{width:100%;min-height:56px;font:inherit;font-size:22px;font-weight:800;text-align:center;border:2px solid var(--border2);border-radius:14px}'+
  '.bm-sel{display:flex;gap:8px;align-items:center;justify-content:space-between}.bm-sel select{min-height:44px;font:inherit;font-size:15px;font-weight:800;border-radius:12px;border:1.5px solid var(--border2);padding:0 10px}'+
  '.bm-dest{display:grid;gap:10px}.bm-dest button{min-height:72px;border-radius:18px;border:2px solid var(--border2);background:#fff;font:inherit;font-size:19px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:12px;padding:0 18px}.bm-dest button small{display:block;font-size:12.5px;color:var(--muted);font-weight:700;text-align:left}.bm-dest button.on{border-color:var(--roxo);background:var(--lf-soft)}.bm-dest button:disabled{opacity:.4;cursor:not-allowed}'+
  '.bm-lista{display:flex;flex-direction:column;gap:8px;margin:14px 0}.bm-li{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--border);border-radius:14px;padding:10px 12px}.bm-li .em{font-size:28px}.bm-li .gr{flex:1;min-width:0}.bm-li b{display:block;font-size:14.5px}.bm-li small{font-size:12.5px;color:var(--muted);font-weight:700}.bm-li .v{font-weight:800;font-size:16px}'+
  '.bq-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}.bq{border:1px solid var(--border2);border-radius:14px;padding:12px;display:flex;flex-direction:column;align-items:center;gap:6px;background:#fff}.bq b{font-size:16px}.bq small{font-size:11.5px;color:var(--muted);font-weight:700}';
  document.head.appendChild(c); }

/* ---------- abertura pelo celular ---------- */
function abertura2(el){
  css3(); var s=st(), turnoP=new Date().getHours()<16?'Almoço':'Jantar';
  var a=s.ab2=s.ab2||{passo:'produto', rec:null, lido:null, itens:[], turno:turnoP, resp:LFI.usuario().nome};
  var feitos={}; a.itens.forEach(function(it){ feitos[it.rec]=it; });
  var pass='<div class="bm-pass">'+['produto','foto','conf'].map(function(p,i){ var at=['produto','foto','conf'].indexOf(a.passo); return '<i class="'+(i<=at?'on':'')+'"></i>'; }).join('')+'</div>';
  if(a.passo==='produto'){
    var h=pass+(a.itens.length?'<div class="bm-lista">'+a.itens.map(function(it){ var r=LFI.rec(it.rec); return '<div class="bm-li"><span class="em">'+r.foto+'</span><div class="gr"><b>'+esc(r.nome.replace(/\s*\(.*\)/,''))+'</b><small>Bandeja '+esc(it.band)+'</small></div><span class="v">'+kg(it.peso)+'</span></div>'; }).join('')+'</div>':'');
    CATS.forEach(function(c){ h+='<div class="bm-cat">'+esc(c.nome)+'</div><div class="bm-grid">'+c.recs.map(function(id){ var r=LFI.rec(id), f=feitos[id]; return '<button class="bm-prod'+(f?' feito':'')+'" data-act="esc" data-id="'+id+'"><span class="em">'+r.foto+'</span><b>'+esc(r.nome.replace(/\s*\(.*\)/,''))+'</b>'+(f?'<small>✓ '+kg(f.peso)+' · '+esc(f.band)+'</small>':'')+'</button>'; }).join('')+'</div>'; });
    if(a.itens.length) h+='<button class="bm-btn ok" data-act="fin">'+UI.ic('check')+'Finalizar abertura ('+a.itens.length+' itens)</button>';
    telaMobile(el,'Abrir buffet · '+esc(a.turno), a.itens.length?'Escolha o próximo alimento':'1. Escolha o alimento', h);
  } else if(a.passo==='foto'){
    var r=LFI.rec(a.rec);
    telaMobile(el, esc(r.nome.replace(/\s*\(.*\)/,'')), '2. Coloque a bandeja na balança e tire a foto', pass+fotoInput('foto'), 'volta');
  } else {
    var L=a.lido, bd=bandeja(L.band);
    var h2=pass+'<img class="bm-foto" src="'+L.img+'" alt="Foto da bandeja na balança"><div class="bm-lido"><div class="bm-ok">'+UI.ic('check')+'QR Code e peso lidos</div><div class="bm-peso">'+kg(L.liq).replace(' kg','')+' <small>kg</small></div>'+
      '<div class="ln"><span>Alimento</span><b>'+esc(LFI.rec(a.rec).nome.replace(/\s*\(.*\)/,''))+'</b></div>'+
      '<div class="ln bm-sel"><span>Bandeja</span><select data-chg="band">'+bandejas().map(function(x){ return '<option value="'+x.id+'"'+(x.id===L.band?' selected':'')+'>'+x.id+'</option>'; }).join('')+'</select></div>'+
      '<div class="ln"><span>Peso na balança</span><b>'+kg(L.bruto)+'</b></div><div class="ln"><span>Bandeja vazia (desconto)</span><b>− '+kg(bd.tara)+'</b></div></div>'+
      '<button class="bm-btn pri" data-act="outro">'+UI.ic('mais')+'Confirmar e inserir outro item</button><button class="bm-btn ok" data-act="okfin">'+UI.ic('check')+'Confirmar e finalizar abertura</button>'+
      '<button class="bm-btn sec" data-act="corrigir">'+UI.ic('editar')+'Corrigir peso</button>';
    telaMobile(el,'Confirme a pesagem','3. Confira o que foi lido da foto', h2, 'volta');
  }
  function leitura(img){ var usados=a.itens.map(function(i){ return i.band; }); var livre=bandejas().filter(function(x){ return usados.indexOf(x.id)<0; })[0]||bandejas()[0];
    var liq=alvoLeitura(PRESET[a.rec]||3), bruto=r3(liq+livre.tara); a.lido={band:livre.id, bruto:bruto, liq:r3(liq), img:img||fotoBalanca(a.rec, livre, bruto)}; a.passo='conf'; LFI.recarregar(); }
  function grava(){ var L=a.lido; a.itens=a.itens.filter(function(i){ return i.rec!==a.rec; }); a.itens.push({rec:a.rec, band:L.band, peso:L.liq}); a.rec=null; a.lido=null; }
  function cria(){
    var ab=LFI.agoraHM(), b={id:LFI.novoId('bf'), num:LFI.proximo('bf'), dep:'res', empresa:LFI.dep('res').empresa, data:LFI.hoje(), turno:a.turno, abertura:ab, abTs:Date.now(), simMin:0, encerramento:null, resp:a.resp, respEnc:null, status:'aberto', aprovadoPor:null, clientes:0, mobile:true,
      itens:a.itens.map(function(i){ return {rec:i.rec, bandeja:i.band, pesoIni:r3(i.peso), repos:[], pesoFinal:null, temp:null, hora:null, cond:'Câmara fria', destino:'', motivo:'', aprov:false, cons:0}; }), leituras:[{h:ab, kg:0}]};
    LFI.db.buffets.unshift(b); LFI.atividade('buffet','Buffet '+b.num+' aberto pelo celular · '+b.itens.length+' bandejas',{tela:'buffet',id:b.id}); s.ab2=null; LFI.salvar(); UI.toast('Buffet '+b.num+' aberto', b.itens.length+' bandejas pesadas'); LFI.ir('buffet', b.id); }
  UI.liga(el, UI.navHandlers({
    esc:function(id){ a.rec=id; a.passo='foto'; LFI.recarregar(); },
    volta:function(){ a.passo=a.passo==='conf'?'foto':'produto'; LFI.recarregar(); },
    foto:function(_,ev){ lerArquivo(ev, function(img){ leitura(img); }); }, fotoEx:function(){ leitura(null); },
    band:function(_,ev){ var b2=bandeja(ev.target.value); a.lido.band=b2.id; a.lido.liq=r3(Math.max(0,a.lido.bruto-b2.tara)); LFI.recarregar(); },
    corrigir:function(){ corrigePeso(a.lido.liq, function(v){ a.lido.liq=v; a.lido.bruto=r3(v+bandeja(a.lido.band).tara); LFI.recarregar(); }); },
    outro:function(){ grava(); a.passo='produto'; UI.toast('Bandeja registrada'); LFI.recarregar(); },
    okfin:function(){ grava(); cria(); },
    fin:function(){ cria(); }
  }));
}
function corrigePeso(v, cb){
  var m=UI.modal({titulo:'Corrigir peso', tam:'sm', corpo:'<input class="bm-in" id="cp-v" inputmode="decimal" value="'+UI.numBR(v,3)+'"><p style="text-align:center;color:var(--muted);font-weight:700;margin:8px 0 0">kg do alimento (sem a bandeja)</p>',
    botoes:'<button class="btn sec" data-act="_fechar">Cancelar</button><button class="btn pri" data-act="ok">Salvar</button>', acoes:{ok:function(){ var x=UI.num(m.el.querySelector('#cp-v').value); if(!(x>0)){ UI.toast('Informe um peso válido','','wt'); return; } m.fechar(); cb(r3(x)); }}});
  setTimeout(function(){ var i=m.el.querySelector('#cp-v'); i.focus(); i.select(); },80);
}

/* ---------- encerramento pelo celular ---------- */
function encerramento2(el, b){
  css3(); var s=st(), E=(s.enc2=s.enc2||{})[b.id]=(s.enc2||{})[b.id]||{passo:'foto', lido:null, dest:null};
  var pend=b.itens.filter(function(it){ return it.pesoFinal==null; }), tot=b.itens.length, feitos=tot-pend.length;
  var pass='<div class="bm-pass">'+b.itens.map(function(it){ return '<i class="'+(it.pesoFinal!=null?'on':'')+'"></i>'; }).join('')+'</div>';
  if(!pend.length&&E.passo!=='dest'){
    var h=pass+'<div class="bm-lista">'+b.itens.map(function(it){ var r=LFI.rec(it.rec); return '<div class="bm-li"><span class="em">'+r.foto+'</span><div class="gr"><b>'+esc(r.nome.replace(/\s*\(.*\)/,''))+'</b><small>Sobra '+kg(it.pesoFinal)+' · consumo '+kg(r2(dispKg(it)-it.pesoFinal))+'</small></div>'+badgeDest(it.destino)+'</div>'; }).join('')+'</div>'+
      '<button class="bm-btn ok" data-act="aprov">'+UI.ic('check')+'Finalizar buffet</button>';
    telaMobile(el,'Todas as bandejas pesadas', b.num+' · confira e finalize', h); 
  } else if(E.passo==='foto'){
    telaMobile(el,'Encerrar '+esc(b.num), 'Bandeja '+(feitos+1)+' de '+tot+' · retire a bandeja, coloque na balança e tire a foto', pass+fotoInput('foto')+
      '<div class="bm-cat">Faltam pesar</div><div class="bm-lista">'+pend.map(function(it){ var r=LFI.rec(it.rec); return '<div class="bm-li"><span class="em">'+r.foto+'</span><div class="gr"><b>'+esc(r.nome.replace(/\s*\(.*\)/,''))+'</b><small>Bandeja '+esc(it.bandeja||'—')+' · entrou '+kg(dispKg(it))+'</small></div></div>'; }).join('')+'</div>');
  } else {
    var L=E.lido, it=b.itens.filter(function(x){ return x.rec===L.rec; })[0], r=LFI.rec(it.rec), g=regraDe(it.rec), podeR=!!(g&&g.reaproveita), cons=r2(dispKg(it)-L.liq);
    var dest=E.dest||(podeR?null:'descarte');
    var h3=pass+'<img class="bm-foto" src="'+L.img+'" alt="Foto da bandeja na balança"><div class="bm-lido"><div class="bm-ok">'+UI.ic('check')+'Bandeja '+esc(L.band)+' identificada</div>'+
      '<div class="ln"><span>Alimento</span><b>'+r.foto+' '+esc(r.nome.replace(/\s*\(.*\)/,''))+'</b></div><div class="ln"><span>Entrou no buffet</span><b>'+kg(dispKg(it))+'</b></div><div class="ln"><span>Consumido</span><b>'+kg(cons)+'</b></div>'+
      '<div class="bm-peso">'+kg(L.liq).replace(' kg','')+' <small>kg de sobra</small></div></div><button class="bm-btn sec" data-act="corrigir">'+UI.ic('editar')+'Corrigir peso</button>'+
      '<div class="bm-cat">Destino da sobra</div><div class="bm-dest">'+
        '<button class="'+(dest==='reaproveitar'?'on':'')+'" data-act="dest" data-id="reaproveitar"'+(podeR?'':' disabled')+'>♻️<span>Reaproveitar<small>'+(podeR?'Vai para o estoque de sobras após aprovação':'Não permitido: '+esc(g?g.grupo:'sem regra'))+'</small></span></button>'+
        '<button class="'+(dest==='descarte'?'on':'')+'" data-act="dest" data-id="descarte">🗑️<span>Descarte<small>'+(podeR?'Jogar fora':'Obrigatório para este alimento')+'</small></span></button>'+
        '<button class="'+(dest==='perda'?'on':'')+'" data-act="dest" data-id="perda">⚠️<span>Perda<small>Caiu, estragou ou contaminou</small></span></button></div>'+
      '<button class="bm-btn pri" data-act="salva"'+(dest?'':' disabled')+'>'+UI.ic('check')+(pend.length>1?'Salvar e próxima bandeja':'Salvar última bandeja')+'</button>';
    telaMobile(el,'Sobra da bandeja','Confira o peso e escolha o destino', h3, 'volta');
  }
  function leitura(img){ var it=pend[0], bd=bandeja(it.bandeja)||bandejas()[0], liq=alvoLeitura(Math.max(0.1,restKg(it))), bruto=r3(liq+bd.tara);
    E.lido={rec:it.rec, band:bd.id, liq:r3(Math.min(liq,dispKg(it))), bruto:bruto, img:img||fotoBalanca(it.rec, bd, bruto)}; E.dest=null; E.passo='dest'; LFI.recarregar(); }
  UI.liga(el, UI.navHandlers({
    volta:function(){ E.passo='foto'; E.lido=null; LFI.recarregar(); },
    foto:function(_,ev){ lerArquivo(ev, leitura); }, fotoEx:function(){ leitura(null); },
    corrigir:function(){ corrigePeso(E.lido.liq, function(v){ E.lido.liq=v; LFI.recarregar(); }); },
    dest:function(id){ E.dest=id; LFI.recarregar(); },
    salva:function(){ var L=E.lido, it=b.itens.filter(function(x){ return x.rec===L.rec; })[0], g=regraDe(it.rec);
      it.pesoFinal=L.liq; it.hora=LFI.agoraHM(); it.resp=b.resp; it.cond=it.cond||'Câmara fria'; it.destino=E.dest||(g&&g.reaproveita?'reaproveitar':'descarte');
      it.motivo=it.destino==='descarte'&&!(g&&g.reaproveita)?(g?g.grupo.split(' (')[0]:'Sem regra')+': descarte obrigatório':it.destino==='perda'?'Perda registrada no encerramento':'';
      it.cons=r2(dispKg(it)-it.pesoFinal); E.passo='foto'; E.lido=null; E.dest=null; LFI.salvar(); UI.toast('Bandeja '+L.band+' registrada', kg(it.pesoFinal)+' de sobra · '+it.destino); LFI.recarregar(); },
    aprov:function(){ b.etapa='aprovacao'; if(!b.encerramento) b.encerramento=LFI.agoraHM(); LFI.salvar(); LFI.recarregar(); }
  }));
}

/* ---------- gravar QR Code das bandejas ---------- */
function gravarQR(){
  css3();
  function corpo(){ return UI.nota('Cole o adesivo com o QR Code em cada bandeja. Na gravação, a bandeja vazia é pesada para o sistema descontar o peso dela nas pesagens.','in')+
    '<div class="bq-grid">'+bandejas().map(function(x){ return '<div class="bq">'+qrSVG(x.codigo,110)+'<b>'+x.id+'</b><small>'+x.codigo+'</small><small>Bandeja vazia: '+kg(x.tara)+'</small></div>'; }).join('')+'</div>'; }
  var m=UI.modal({titulo:'QR Code das bandejas', sub:bandejas().length+' bandejas gravadas', tam:'xl', corpo:corpo(),
    botoes:'<button class="btn sec esq" data-act="imp">'+UI.ic('imprimir')+'Imprimir etiquetas</button><button class="btn sec" data-act="_fechar">Fechar</button><button class="btn pri" data-act="nova">'+UI.ic('mais')+'Gravar nova bandeja</button>',
    acoes:{nova:function(){ novaBandeja(function(){ m.corpoHTML(corpo()); }); },
      imp:function(){ UI.exportarPDF('Etiquetas QR Code das bandejas','Recorte e cole uma etiqueta em cada bandeja','<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px">'+bandejas().map(function(x){ return '<div style="border:1px dashed #999;border-radius:8px;padding:10px;text-align:center">'+qrSVG(x.codigo,120).replace('display:block','display:inline-block')+'<div style="font-weight:800;font-size:16px">'+x.id+'</div><div style="font-size:10px;color:#666">'+x.codigo+'</div></div>'; }).join('')+'</div>'); }}});
}
function novaBandeja(depois){
  css3();
  var n=bandejas().length+1, id='B'+String(n).padStart(2,'0'), cod='LP-BDJ-'+String(n).padStart(3,'0'), tara=null;
  var m=UI.modal({titulo:'Gravar bandeja '+id, sub:'Coloque a bandeja VAZIA na balança', tam:'sm', corpo:'', botoes:''});
  function des(){ m.corpoHTML(tara==null?fotoInput('tf'):'<div style="display:flex;flex-direction:column;align-items:center;gap:8px">'+qrSVG(cod,150)+'<b style="font-size:20px">'+id+'</b><small style="color:var(--muted);font-weight:700">'+cod+'</small><div class="bm-peso" style="font-size:28px">'+kg(tara)+' <small>bandeja vazia</small></div></div>');
    m.rodapeHTML('<button class="btn sec" data-act="_fechar">Cancelar</button>'+(tara!=null?'<button class="btn pri" data-act="ok">Gravar bandeja</button>':'')); }
  UI.liga(m.el,{tf:function(_,ev){ lerArquivo(ev,function(){ tara=r3(0.38+Math.random()*0.15); des(); }); }, tfEx:function(){ tara=r3(0.38+Math.random()*0.15); des(); },
    ok:function(){ bandejas().push({id:id, codigo:cod, tara:tara, criada:LFI.hoje()}); LFI.salvar(); m.fechar(); UI.toast('Bandeja '+id+' gravada','Imprima a etiqueta e cole na bandeja'); depois(); }});
  des();
}

LFI.registrar('buffet',{titulo:'Buffet', render:render});
})();
