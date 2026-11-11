/* LivePro — FLUXO DE CAIXA (entradas e saídas, lançamento manual).
   Lançamentos manuais ficam em db.fluxo. Entram sozinhos: as notas fiscais lançadas (contas a pagar)
   e as vendas de cada dia. Quando a conta já usa o LiveFood, os lançamentos do Fluxo de Caixa do painel
   são trazidos uma vez para cá (origem 'livefood'). Sem Pix por aqui: só marcar como pago/recebido. */
(function(){
'use strict';
var UI=LFI.ui, F=LFI.fmt, esc=UI.esc;
var API='https://giro-os-api.nucleofull.workers.dev';
var CATS_PADRAO={in:['Vendas','Repasses e recebimentos','Outras entradas'], out:['Fornecedores','Folha de pagamento','Aluguel','Energia, água e gás','Impostos','Manutenção','Operacional','Marketing','Outras saídas']};
function r2(v){ return Math.round(v*100)/100; }
function numIn(s){ var t=String(s==null?'':s).trim(); if(/^\d+\.\d{1,2}$/.test(t)) return parseFloat(t); var v=parseFloat(t.replace(/\./g,'').replace(',','.')); return isFinite(v)?v:0; }
function st(){ return LFI.estado.fluxo=LFI.estado.fluxo||{per:'mes', de:null, ate:null, tp:'', cat:'', sit:'', q:'', lim:60}; }
function db(){ var d=LFI.db; d.fluxo=d.fluxo||[]; d.fluxoCats=d.fluxoCats||JSON.parse(JSON.stringify(CATS_PADRAO)); return d; }
function hoje(){ return LFI.hoje(); }

/* todos os lançamentos: manuais + contas a pagar das notas + vendas por dia */
function todos(){
  var d=db(), out=[];
  d.fluxo.forEach(function(x){ if(x.excluido) return; out.push(x); });
  (d.contasPagar||[]).forEach(function(c){ if(!LFI.empresaVisivel(c.empresa)) return; var f=LFI.forn(c.forn);
    out.push({id:'cp:'+c.id, tp:'out', tt:c.descricao+(f?' · '+f.nome:''), categoria:'Fornecedores', data:c.venc, vl:c.valor, status:c.status==='pago'?'pago':'pendente', auto:'nota', ref:c.id}); });
  var porDia={};
  (d.vendas||[]).forEach(function(v){ var dp=LFI.dep(v.dep); if(!dp||!LFI.empresaVisivel(dp.empresa)) return; var k=v.d+'|'+v.dep; porDia[k]=porDia[k]||{d:v.d, dep:v.dep, v:0}; porDia[k].v+=v.valor; });
  Object.keys(porDia).forEach(function(k){ var x=porDia[k]; out.push({id:'vd:'+k, tp:'in', tt:'Vendas do dia · '+LFI.dep(x.dep).nome, categoria:'Vendas', data:x.d, vl:r2(x.v), status:'recebido', auto:'venda'}); });
  return out;
}
function situacao(x){ if(x.status==='pago'||x.status==='recebido') return x.status; if(x.status==='cancelado') return 'cancelado'; return x.data<hoje()?'vencido':'pendente'; }
var SIT={pendente:['A pagar','wt'], vencido:['Vencido','no'], pago:['Pago','ok'], recebido:['Recebido','ok'], cancelado:['Cancelado','nu']};
function sitTxt(x){ var s=situacao(x); if(s==='pendente'&&x.tp==='in') return ['A receber','wt']; return SIT[s]; }

function periodo(s){ if(s.per==='custom') return {de:s.de||LFI.dataUtil.D(-29), ate:s.ate||hoje()}; if(s.per==='prox') return {de:hoje(), ate:LFI.dataUtil.D(30)}; var p=LFI.periodo(s.per); if(s.per==='mes'){ var d=new Date(p.de+'T12:00:00'); d.setMonth(d.getMonth()+1); d.setDate(0); p.ate=LFI.dataUtil.iso(d); } return {de:p.de, ate:p.ate}; }   /* este mês vai até o último dia, para mostrar o que ainda vence */

function css(){ if(document.getElementById('css-fluxo')) return; var c=document.createElement('style'); c.id='css-fluxo'; c.textContent=
  '.fx{max-width:1180px;margin:0 auto;padding-bottom:40px}'+
  '.fx-hd{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:12px}.fx-hd>div{flex:1;min-width:220px}.fx-hd h1{font-size:24px;margin:0}.fx-hd small{display:block;color:var(--muted);font-weight:700;font-size:13.5px;margin-top:2px}'+
  '.fx-bts{display:flex;gap:10px}.fx-bts .btn{min-height:50px;border-radius:14px;padding:0 18px;font-size:15px}.btn.fx-in{background:#16A34A;color:#fff;border:0}.btn.fx-out{background:#DC2626;color:#fff;border:0}'+
  '.fx-per{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}.fx-per button{flex:1 1 auto;min-height:44px;border-radius:12px;border:1.5px solid var(--border2);background:#fff;font:inherit;font-size:14px;font-weight:800;cursor:pointer;padding:0 12px}.fx-per button.on{background:var(--text);color:#fff;border-color:var(--text)}'+
  '.fx-datas{display:flex;gap:10px;margin-bottom:10px}.fx-datas label{flex:1;display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:800;color:var(--muted2)}.fx-datas input{min-height:46px;border-radius:12px;border:1.5px solid var(--border2);padding:0 10px;font:inherit;font-weight:700}'+
  '.fx-k{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}.fx-k>div{background:#fff;border:1px solid var(--border);border-radius:16px;padding:12px 14px}.fx-k span{display:block;font-size:11.5px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.3px}.fx-k b{display:block;font-size:22px;margin-top:3px}.fx-k small{font-size:12px;color:var(--muted);font-weight:700}.fx-k .in b{color:#16A34A}.fx-k .out b{color:#DC2626}.fx-k .ap b{color:#B7791F}.fx-k .sd{background:var(--text);color:#fff;border-color:var(--text)}.fx-k .sd span,.fx-k .sd small{color:#C9C9CF}'+
  '.fx-card{background:#fff;border:1px solid var(--border);border-radius:18px;padding:14px 16px;margin-bottom:12px}.fx-card h3{margin:0 0 6px;font-size:16px}'+
  '.fx-f{display:grid;grid-template-columns:minmax(0,2fr) repeat(3,minmax(0,1fr));gap:8px;margin-bottom:10px}.fx-f select,.fx-f input{min-height:48px;border-radius:12px;border:1.5px solid var(--border2);padding:0 12px;font:inherit;font-size:14.5px;font-weight:700;background:#fff;width:100%}'+
  '.fx-l{display:flex;flex-direction:column;gap:8px}.fx-dia{font-size:12px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin:10px 2px 2px}'+
  '.fx-it{display:flex;align-items:center;gap:12px;background:#fff;border:1.5px solid var(--border);border-radius:16px;padding:10px 14px;cursor:pointer}.fx-it:hover{border-color:var(--roxo)}.fx-it .ic{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;flex:none}.fx-it.in .ic{background:#ECFDF3;color:#16A34A}.fx-it.out .ic{background:#FEE2E2;color:#DC2626}.fx-it>span{flex:1;min-width:0}.fx-it b{display:block;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fx-it small{font-size:12px;color:var(--muted);font-weight:700}.fx-it .vl{text-align:right;flex:none}.fx-it .vl strong{display:block;font-size:15.5px}.fx-it.in .vl strong{color:#16A34A}.fx-it.out .vl strong{color:#DC2626}'+
  '.fx-tg{display:inline-block;border-radius:8px;padding:2px 8px;font-size:11.5px;font-weight:800;margin-top:3px}.fx-tg.ok{background:#ECFDF3;color:#14532D}.fx-tg.wt{background:#FEF3C7;color:#7A5A00}.fx-tg.no{background:#FEE2E2;color:#991B1B}.fx-tg.nu{background:var(--s3);color:var(--muted2)}'+
  '.fx-ok{width:40px;height:40px;border-radius:12px;border:1.5px solid #BBE5C8;background:#fff;color:#16A34A;font-size:17px;font-weight:800;cursor:pointer;flex:none}'+
  '.fx-imp{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#EEF2FF;color:#312E81;border-radius:14px;padding:10px 14px;font-size:13.5px;font-weight:700;margin-bottom:12px}.fx-imp span{flex:1}'+
  '.fx-tp{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.fx-tp button{min-height:52px;border-radius:14px;border:1.5px solid var(--border2);background:#fff;font:inherit;font-size:15px;font-weight:800;cursor:pointer}.fx-tp button.on.in{background:#16A34A;border-color:#16A34A;color:#fff}.fx-tp button.on.out{background:#DC2626;border-color:#DC2626;color:#fff}'+
  '.fx-vl{display:flex;align-items:center;gap:6px;border:2px solid var(--roxo);border-radius:14px;padding:0 12px;min-height:58px;margin-bottom:12px}.fx-vl em{font-style:normal;font-weight:800;color:var(--muted)}.fx-vl input{flex:1;min-width:0;border:0;outline:none;font:inherit;font-size:24px;font-weight:800}'+
  '@media (max-width:760px){.fx-imp{flex-direction:column;align-items:stretch}.fx-imp .btn{min-height:46px}.fx-hd h1{font-size:21px}.fx-bts{width:100%}.fx-bts .btn{flex:1;justify-content:center}.fx-k{grid-template-columns:1fr 1fr}.fx-k b{font-size:18px}.fx-f{grid-template-columns:1fr 1fr}.fx-f>:first-child{grid-column:1/-1}}';
  document.head.appendChild(c); }

function render(el){
  css(); document.body.classList.add('foco');
  var s=st(), d=db(), p=periodo(s), lista=todos();
  var noPer=lista.filter(function(x){ return x.data>=p.de && x.data<=p.ate && x.status!=='cancelado'; });
  var ent=0, sai=0, apagar=0, areceber=0;
  noPer.forEach(function(x){ var sit=situacao(x); if(x.tp==='in'){ if(sit==='recebido') ent+=x.vl; else areceber+=x.vl; } else { if(sit==='pago') sai+=x.vl; else apagar+=x.vl; } });
  var saldo=ent-sai;
  var cats={}; lista.forEach(function(x){ cats[x.categoria]=1; }); (d.fluxoCats.in.concat(d.fluxoCats.out)).forEach(function(c){ cats[c]=1; });
  var h='<div class="fx"><div class="fx-hd"><div><div class="pghd-t">'+UI.setaVoltar()+'<h1>Fluxo de caixa</h1></div><small>Entradas e saídas da empresa. Vendas e notas fiscais entram sozinhas.</small></div>'+
    '<div class="fx-bts"><button class="btn fx-in" data-act="novo" data-id="in">+ Entrada</button><button class="btn fx-out" data-act="novo" data-id="out">+ Saída</button></div></div>';
  if(LFI.servidor&&LFI.servidor.ativo&&!d.fluxoImport) h+='<div class="fx-imp"><span>Esta conta já usa o Fluxo de Caixa do LiveFood. Traga os lançamentos de lá para cá.</span><button class="btn pri sm" data-act="importar">Trazer lançamentos do LiveFood</button></div>';
  h+='<div class="fx-per">'+[['hoje','Hoje'],['7d','7 dias'],['mes','Este mês'],['30d','30 dias'],['prox','Próximos 30 dias'],['custom','Período']].map(function(x){ return '<button class="'+(s.per===x[0]?'on':'')+'" data-act="per" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>';
  if(s.per==='custom') h+='<div class="fx-datas"><label>De<input type="date" data-chg="de" value="'+p.de+'"></label><label>Até<input type="date" data-chg="ate" value="'+p.ate+'"></label></div>';
  h+='<div class="fx-k"><div class="in"><span>Entradas</span><b>'+F.moeda(ent)+'</b><small>recebido no período</small></div><div class="out"><span>Saídas</span><b>'+F.moeda(sai)+'</b><small>pago no período</small></div>'+
    '<div class="ap"><span>A pagar</span><b>'+F.moeda(apagar)+'</b><small>'+(areceber?F.moeda(areceber)+' a receber':'em aberto no período')+'</small></div>'+
    '<div class="sd"><span>Saldo do período</span><b style="color:'+(saldo<0?'#FCA5A5':'#86EFAC')+'">'+F.moeda(saldo)+'</b><small>entradas − saídas</small></div></div>';
  h+='<div class="fx-card"><h3>Entradas × saídas por dia</h3><div id="fx-g"></div></div>';
  h+='<div class="fx-f"><input id="fx-q" placeholder="Buscar descrição" value="'+esc(s.q)+'"><select data-chg="tp"><option value="">Entradas e saídas</option><option value="in"'+(s.tp==='in'?' selected':'')+'>Só entradas</option><option value="out"'+(s.tp==='out'?' selected':'')+'>Só saídas</option></select>'+
    '<select data-chg="cat"><option value="">Todas as categorias</option>'+Object.keys(cats).sort().map(function(c){ return '<option'+(s.cat===c?' selected':'')+'>'+esc(c)+'</option>'; }).join('')+'</select>'+
    '<select data-chg="sit"><option value="">Todas as situações</option>'+[['aberto','A pagar / a receber'],['vencido','Vencidos'],['quitado','Pagos / recebidos']].map(function(x){ return '<option value="'+x[0]+'"'+(s.sit===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></div>';
  h+='<div id="fx-l"></div></div>';
  el.innerHTML=h;

  /* gráfico */
  var dias=[], m={}, dt=new Date(p.de+'T12:00:00'), fim=new Date(p.ate+'T12:00:00');
  while(dt<=fim && dias.length<92){ var k=LFI.dataUtil.iso(dt); dias.push(k); m[k]={i:0,o:0}; dt.setDate(dt.getDate()+1); }
  noPer.forEach(function(x){ if(!m[x.data]) return; if(x.tp==='in') m[x.data].i+=x.vl; else m[x.data].o+=x.vl; });
  if(dias.length>1) UI.grafBarras(el.querySelector('#fx-g'),{cats:dias.map(F.dataC), altura:220, series:[{nome:'Entradas', cor:'#16A34A', valores:dias.map(function(k){ return Math.round(m[k].i); })},{nome:'Saídas', cor:'#DC2626', valores:dias.map(function(k){ return Math.round(m[k].o); })}]});
  else el.querySelector('#fx-g').innerHTML='<p style="margin:0;color:var(--muted);font-weight:700;font-size:13.5px">Escolha um período com mais de um dia para ver o gráfico.</p>';

  function desenha(){
    var q=s.q.trim(), ls=noPer.filter(function(x){ if(s.tp&&x.tp!==s.tp) return false; if(s.cat&&x.categoria!==s.cat) return false; var sit=situacao(x);
      if(s.sit==='aberto'&&!(sit==='pendente'||sit==='vencido')) return false; if(s.sit==='vencido'&&sit!=='vencido') return false; if(s.sit==='quitado'&&!(sit==='pago'||sit==='recebido')) return false; return true; });
    if(q) ls=UI.filtrarBusca(q, ls, function(x){ return x.tt+' '+x.categoria; });
    ls.sort(function(a,b){ return a.data<b.data?1:a.data>b.data?-1:(a.tp<b.tp?-1:1); });
    var mostra=ls.slice(0,s.lim), hh='', dAnt='';
    mostra.forEach(function(x){ if(x.data!==dAnt){ hh+='<div class="fx-dia">'+F.diaSemana(x.data)+', '+F.data(x.data)+'</div>'; dAnt=x.data; } var t=sitTxt(x), aberto=situacao(x)==='pendente'||situacao(x)==='vencido';
      hh+='<div class="fx-it '+x.tp+'" data-act="abre" data-id="'+esc(x.id)+'"><span class="ic">'+(x.tp==='in'?'+':'−')+'</span><span><b>'+esc(x.tt)+'</b><small>'+esc(x.categoria)+(x.auto==='nota'?' · nota fiscal':x.auto==='venda'?' · automático':x.origem==='livefood'?' · do LiveFood':'')+'</small><br><span class="fx-tg '+t[1]+'">'+t[0]+'</span></span>'+
        '<span class="vl"><strong>'+(x.tp==='in'?'+ ':'− ')+F.moeda(x.vl)+'</strong></span>'+(aberto?'<button class="fx-ok" data-act="quita" data-id="'+esc(x.id)+'" title="'+(x.tp==='in'?'Marcar como recebido':'Marcar como pago')+'">✓</button>':'')+'</div>'; });
    el.querySelector('#fx-l').innerHTML=(hh?'<div class="fx-l">'+hh+'</div>':'<div class="card">'+UI.vazio('Nenhum lançamento neste período.','🧾')+'</div>')+(ls.length>mostra.length?'<button class="btn sec" style="display:block;margin:12px auto 0;min-height:48px" data-act="mais">Mostrar mais ('+(ls.length-mostra.length)+')</button>':'');
  }
  desenha();
  el.querySelector('#fx-q').addEventListener('input', function(ev){ s.q=ev.target.value; desenha(); });
  UI.liga(el, UI.navHandlers({
    per:function(id){ s.per=id; LFI.recarregar(); },
    de:function(_,ev){ s.de=ev.target.value; LFI.recarregar(); }, ate:function(_,ev){ s.ate=ev.target.value; LFI.recarregar(); },
    tp:function(_,ev){ s.tp=ev.target.value; desenha(); }, cat:function(_,ev){ s.cat=ev.target.value; desenha(); }, sit:function(_,ev){ s.sit=ev.target.value; desenha(); },
    mais:function(){ s.lim+=100; desenha(); },
    novo:function(tp){ editar(null, tp); },
    abre:function(id){ var x=acha(id); if(!x) return; if(x.auto==='venda'){ UI.toast('Lançamento automático','As vendas do dia vêm das vendas registradas.'); return; } editar(x); },
    quita:function(id, ev){ if(ev) ev.stopPropagation(); quitar(acha(id)); },
    importar:importarLivefood
  }));
}
function acha(id){ var r=null; todos().forEach(function(x){ if(x.id===id) r=x; }); return r; }
function quitar(x){ if(!x) return;
  if(x.auto==='nota'){ var c=(LFI.db.contasPagar||[]).filter(function(c){ return c.id===x.ref; })[0]; if(c){ c.status='pago'; c.pagoEm=hoje(); } }
  else { x.status=x.tp==='in'?'recebido':'pago'; x.quitadoEm=hoje(); }
  LFI.salvar(); UI.toast(x.tp==='in'?'Marcado como recebido':'Marcado como pago', x.tt+' · '+F.moeda(x.vl)); LFI.recarregar(); }

function editar(x, tp){
  var d=db(), novo=!x, o=x?{tp:x.tp, tt:x.tt, categoria:x.categoria, data:x.data, vl:x.vl, status:x.status, obs:x.obs||''}:{tp:tp||'out', tt:'', categoria:'', data:hoje(), vl:0, status:'pendente', obs:''};
  var soVer=x&&x.auto==='nota';
  function cats(){ return d.fluxoCats[o.tp]||[]; }
  var m=UI.modal({titulo:novo?(o.tp==='in'?'Nova entrada':'Nova saída'):(soVer?'Conta da nota fiscal':'Editar lançamento'), corpo:'<div id="fx-m"></div>',
    botoes:(x&&!soVer?'<button class="btn sec esq" data-act="exc">Excluir</button><button class="btn sec" data-act="dup">Duplicar</button>':'')+'<button class="btn sec" data-act="_fechar">Cancelar</button>'+(soVer?'':'<button class="btn pri" data-act="ok">Salvar</button>'),
    acoes:{
      tp:function(v){ o.tp=v; if(cats().indexOf(o.categoria)<0) o.categoria=''; des(); },
      ok:function(){ ler(); if(!o.tt.trim()){ UI.toast('Informe a descrição','','wt'); return; } if(!(o.vl>0)){ UI.toast('Informe o valor','','wt'); return; } if(!o.categoria){ UI.toast('Escolha a categoria','','wt'); return; }
        if(d.fluxoCats[o.tp].indexOf(o.categoria)<0) d.fluxoCats[o.tp].push(o.categoria);
        if(novo) d.fluxo.push({id:LFI.novoId('fx'), tp:o.tp, tt:o.tt.trim(), categoria:o.categoria, data:o.data, vl:r2(o.vl), status:o.status, obs:o.obs, criado:LFI.agoraISO(), por:LFI.usuario().nome});
        else { x.tp=o.tp; x.tt=o.tt.trim(); x.categoria=o.categoria; x.data=o.data; x.vl=r2(o.vl); x.status=o.status; x.obs=o.obs; }
        LFI.salvar(); m.fechar(); UI.toast(novo?'Lançamento criado':'Lançamento salvo', o.tt+' · '+F.moeda(o.vl)); LFI.recarregar(); },
      dup:function(){ d.fluxo.push({id:LFI.novoId('fx'), tp:x.tp, tt:x.tt, categoria:x.categoria, data:hoje(), vl:x.vl, status:'pendente', obs:x.obs||'', criado:LFI.agoraISO(), por:LFI.usuario().nome}); LFI.salvar(); m.fechar(); UI.toast('Lançamento duplicado','Com data de hoje e em aberto'); LFI.recarregar(); },
      exc:function(){ UI.confirmar('Excluir lançamento','<b>'+esc(x.tt)+'</b> · '+F.moeda(x.vl)+' será excluído.','Excluir',function(){ d.fluxo=d.fluxo.filter(function(y){ return y!==x; }); LFI.salvar(); m.fechar(); UI.toast('Lançamento excluído'); LFI.recarregar(); }); }
    }});
  function ler(){ var q=function(s){ return m.el.querySelector(s); }; if(!q('#fx-tt')) return; o.tt=q('#fx-tt').value; o.vl=numIn(q('#fx-vl').value); o.categoria=q('#fx-cat').value.trim(); o.data=q('#fx-dt').value||hoje(); o.obs=q('#fx-obs').value; o.status=q('#fx-st').checked?(o.tp==='in'?'recebido':'pago'):'pendente'; }
  function des(){ var box=m.el.querySelector('#fx-m'), dis=soVer?' disabled':'';
    box.innerHTML=(novo?'<div class="fx-tp"><button class="in'+(o.tp==='in'?' on':'')+'" data-act="tp" data-id="in">+ Entrada</button><button class="out'+(o.tp==='out'?' on':'')+'" data-act="tp" data-id="out">− Saída</button></div>':'')+
      '<div class="fx-vl"><em>R$</em><input id="fx-vl" inputmode="decimal" placeholder="0,00" value="'+(o.vl?o.vl.toFixed(2).replace('.',','):'')+'"'+dis+'></div>'+
      '<div class="field"><label>Descrição</label><input class="inp" id="fx-tt" value="'+esc(o.tt)+'" placeholder="'+(o.tp==='in'?'Ex.: Venda de encomenda':'Ex.: Aluguel da loja')+'"'+dis+'></div>'+
      '<div class="fgrid c2"><div class="field"><label>Categoria</label><input class="inp" id="fx-cat" list="fx-cats" value="'+esc(o.categoria)+'" placeholder="Escolha ou digite uma nova"'+dis+'><datalist id="fx-cats">'+cats().map(function(c){ return '<option value="'+esc(c)+'">'; }).join('')+'</datalist></div>'+
      '<div class="field"><label>'+(o.tp==='in'?'Data do recebimento':'Vencimento')+'</label><input type="date" class="inp" id="fx-dt" value="'+o.data+'"'+dis+'></div></div>'+
      '<label style="display:flex;align-items:center;gap:10px;font-weight:800;margin:4px 0 12px"><input type="checkbox" id="fx-st" style="width:22px;height:22px;accent-color:var(--roxo)"'+(o.status==='pago'||o.status==='recebido'?' checked':'')+(soVer?' onclick="return false"':'')+'> '+(o.tp==='in'?'Já recebido':'Já pago')+'</label>'+
      '<div class="field"><label>Observação</label><input class="inp" id="fx-obs" value="'+esc(o.obs)+'" placeholder="Opcional"'+dis+'></div>'+
      (soVer?UI.nota('Esta conta vem da nota fiscal lançada no Recebimento. Para quitar, use o ✓ na lista.','in','info'):'');
    var cp=box.querySelector('#fx-cat'); }
  des();
  if(!soVer) setTimeout(function(){ var i=m.el.querySelector('#fx-vl'); if(i&&novo) i.focus(); },60);
  m.el.addEventListener('input', function(){}, true);
}

/* traz os lançamentos do Fluxo de Caixa do painel do LiveFood (uma vez) */
function importarLivefood(){
  var tk=''; try{ tk=localStorage.getItem('dd_jwt')||''; }catch(e){}
  if(!tk){ UI.toast('Entre pelo Hub para trazer os lançamentos','','wt'); return; }
  UI.toast('Buscando lançamentos no LiveFood…');
  fetch(API+'/painel/tudo',{cache:'no-store', headers:{'Authorization':'Bearer '+tk}}).then(function(r){ return r.json(); }).then(function(j){
    if(!j||!j.ok){ UI.toast('Não consegui ler o LiveFood', (j&&j.mensagem)||'', 'no'); return; }
    var est=j.est||{}, ks=Object.keys(est).filter(function(k){ return k.split('~')[0]==='extrato'; }).sort(function(a,b){ return (parseInt(a.split('~')[1]||'0',10))-(parseInt(b.split('~')[1]||'0',10)); }), ex=[];
    ks.forEach(function(k){ var dd=est[k]&&est[k].d; if(Array.isArray(dd)) ex=ex.concat(dd); });
    var d=db(), ja={}, n=0; d.fluxo.forEach(function(x){ if(x.lfId!=null) ja[x.lfId]=1; });
    ex.forEach(function(e){ if(!e||ja[e.id]||!(Number(e.vl)>0)) return; var tp=e.tp==='in'?'in':'out', stt=e.status==='pago'?'pago':e.status==='recebido'?'recebido':e.status==='recusado'?'cancelado':'pendente';
      var cat=String(e.categoria||(tp==='in'?'Outras entradas':'Outras saídas')); if(d.fluxoCats[tp].indexOf(cat)<0) d.fluxoCats[tp].push(cat);
      d.fluxo.push({id:LFI.novoId('fx'), lfId:e.id, tp:tp, tt:String(e.tt||'Lançamento'), categoria:cat, data:String(e.data||LFI.hoje()).slice(0,10), vl:r2(Number(e.vl)), status:stt, obs:e.obs||'', origem:'livefood'}); n++; });
    d.fluxoImport=LFI.agoraISO(); LFI.salvar(); UI.toast('Lançamentos trazidos do LiveFood', n+(n===1?' lançamento':' lançamentos')); LFI.recarregar();
  }).catch(function(){ UI.toast('Sem conexão com o servidor','Tente de novo em instantes','no'); });
}

LFI.registrar('fluxo',{titulo:'Fluxo de caixa', render:render});
})();
