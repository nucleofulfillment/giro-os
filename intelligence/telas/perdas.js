/* LivePro — Saídas e perdas (feito para o celular).
   Hora da "limpa": o padeiro escolhe o produto numa lista com busca, informa a quantidade, o motivo e confirma.
   Cada confirmação baixa o estoque do setor (movimento de descarte / perda / consumo) e entra nas perdas do dia. */
(function(){
'use strict';
var UI=LFI.ui, F=LFI.fmt, esc=UI.esc;
function r3(v){ return Math.round(v*1000)/1000; }
var MOTIVOS=[
  {id:'descarte', nome:'Descarte', dica:'Vencido, estragado ou sobra do dia', ic:'lixo'},
  {id:'perda', nome:'Perda', dica:'Quebrou, caiu ou avariou', ic:'alerta'},
  {id:'consumo', nome:'Consumo interno', dica:'Equipe ou uso da cozinha', ic:'receita'}
];
function st(){ var s=LFI.estado.perdas=LFI.estado.perdas||{q:'', dep:null, motivo:'descarte', ultimo:null}; if(!s.dep) s.dep=LFI.depIds().indexOf('pad')>=0?'pad':LFI.depIds()[0]; return s; }

function css(){ if(document.getElementById('css-perdas')) return; var c=document.createElement('style'); c.id='css-perdas'; c.textContent=
  '.pd{max-width:620px;margin:0 auto;padding-bottom:40px}'+
  '.pd-hd{display:flex;align-items:center;gap:12px;margin-bottom:14px}.pd-hd b{display:block;font-size:21px;font-weight:800}.pd-hd small{font-size:13.5px;color:var(--muted);font-weight:700}'+
  '.pd-x{width:48px;height:48px;border-radius:14px;border:1px solid var(--border2);background:#fff;display:flex;align-items:center;justify-content:center;flex:none;cursor:pointer}.pd-x svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2}'+
  '.pd-hoje{display:flex;align-items:center;gap:12px;width:100%;border:0;border-radius:18px;background:var(--text);color:#fff;padding:14px 18px;margin-bottom:12px;font:inherit;text-align:left;cursor:pointer}.pd-hoje span{flex:1}.pd-hoje small{display:block;color:#C9C9CF;font-weight:700;font-size:12.5px}.pd-hoje b{font-size:18px}.pd-hoje em{font-style:normal;font-size:20px;font-weight:800;color:#FF8A33}.pd-hoje i{font-style:normal;color:#C9C9CF;font-size:12px}'+
  '.pd-hl{background:#fff;border:1px solid var(--border);border-radius:16px;padding:6px 14px;margin:-4px 0 12px}.pd-hl div{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)}.pd-hl div:last-child{border-bottom:0}.pd-hl span{flex:1;min-width:0}.pd-hl b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pd-hl small{font-size:12px;color:var(--muted);font-weight:700}.pd-hl em{font-style:normal;font-weight:800;color:var(--red);font-size:14px}'+
  '.pd-ok{display:flex;align-items:center;gap:10px;background:#ECFDF3;border:1.5px solid #BBE5C8;color:#14532D;border-radius:16px;padding:12px 16px;margin-bottom:12px;font-weight:700;font-size:14.5px}.pd-ok svg{width:22px;height:22px;stroke:var(--green);fill:none;stroke-width:2.4;flex:none}'+
  '.pd-deps{display:flex;gap:8px;margin-bottom:10px}.pd-deps button{flex:1;min-height:50px;border-radius:14px;border:1.5px solid var(--border2);background:#fff;font:inherit;font-size:15px;font-weight:800;cursor:pointer}.pd-deps button.on{background:var(--roxo);border-color:var(--roxo);color:#fff}'+
  '.pd-busca{display:flex;align-items:center;gap:10px;border:2px solid var(--border2);border-radius:16px;background:#fff;padding:0 14px;min-height:58px;margin-bottom:12px}.pd-busca:focus-within{border-color:var(--roxo)}.pd-busca svg{width:20px;height:20px;stroke:var(--muted);fill:none;stroke-width:2}.pd-busca input{flex:1;border:0;outline:none;font:inherit;font-size:17px;font-weight:700;background:transparent;min-width:0}'+
  '.pd-lista{display:flex;flex-direction:column;gap:8px}.pd-it{display:flex;align-items:center;gap:12px;width:100%;min-height:72px;text-align:left;border:1.5px solid var(--border2);border-radius:18px;background:#fff;padding:10px 14px;cursor:pointer;font:inherit;color:inherit}.pd-it:active{background:var(--lf-soft)}.pd-it span{flex:1;min-width:0}.pd-it b{display:block;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pd-it small{font-size:13px;color:var(--muted);font-weight:700}.pd-it .tg{font-style:normal;white-space:nowrap;font-size:11.5px;font-weight:800;border-radius:8px;padding:4px 8px;flex:none}body:has(.pd-btn) #notif{display:none}.tg.vc{background:#FEE2E2;color:#991B1B}.tg.av{background:#FEF3C7;color:#7A5A00}.tg.bx{background:#ECFDF3;color:#14532D}'+
  '.pd-sec{font-size:12px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin:14px 2px 8px}'+
  '.pd-prod{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid var(--border);border-radius:18px;padding:14px 16px;margin-bottom:16px}.pd-prod b{display:block;font-size:19px}.pd-prod small{font-size:14px;color:var(--muted);font-weight:700}'+
  '.pd-lb{font-size:13px;font-weight:800;color:var(--muted2);margin:0 2px 8px}'+
  '.pd-qtd{display:flex;align-items:center;gap:10px;margin-bottom:18px}.pd-qtd button{width:64px;height:72px;border-radius:18px;border:1.5px solid var(--border2);background:#fff;font:inherit;font-size:30px;font-weight:800;cursor:pointer;flex:none}.pd-qtd label{flex:1;display:flex;align-items:baseline;justify-content:center;gap:6px;height:72px;border:2px solid var(--roxo);border-radius:18px;background:#fff;padding:0 12px}.pd-qtd input{width:100%;min-width:0;border:0;outline:none;background:transparent;font:inherit;font-size:34px;font-weight:800;text-align:center;align-self:center}.pd-qtd em{font-style:normal;font-size:16px;font-weight:800;color:var(--muted);align-self:center}'+
  '.pd-mot{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}.pd-mot button{display:flex;align-items:center;gap:12px;min-height:64px;padding:0 16px;border-radius:16px;border:1.5px solid var(--border2);background:#fff;font:inherit;text-align:left;cursor:pointer}.pd-mot button.on{border-color:var(--roxo);background:var(--lf-soft)}.pd-mot svg{width:24px;height:24px;stroke:currentColor;fill:none;stroke-width:2;flex:none}.pd-mot b{display:block;font-size:16px}.pd-mot small{font-size:12.5px;color:var(--muted);font-weight:700}'+
  '.pd-res{text-align:center;font-size:14px;font-weight:700;color:var(--muted2);margin-bottom:6px}.pd-res b{color:var(--red)}'+
  '.pd-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:64px;border-radius:18px;border:0;font:inherit;font-size:18px;font-weight:800;cursor:pointer;margin-top:10px;background:var(--roxo);color:#fff}.pd-btn svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2.4}.pd-btn:disabled{opacity:.4;cursor:default}';
  document.head.appendChild(c); }

function baixasHoje(){ var h=LFI.hoje(), deps=LFI.depIds(); return LFI.db.movs.filter(function(m){ return String(m.d).slice(0,10)===h && (m.tipo==='descarte'||m.tipo==='perda'||m.tipo==='consumo') && m.qtd<0 && deps.indexOf(m.dep)>=0 && m.origem&&m.origem.tipo==='limpa'; }); }
function tag(p){ var dv=LFI.diasParaVencer(p); if(dv==null) return ''; if(dv<0) return '<i class="tg vc">Vencido</i>'; if(dv===0) return '<i class="tg vc">Vence hoje</i>'; if(dv<=2) return '<i class="tg av">Vence em '+dv+'d</i>'; return ''; }
function cab(titulo, sub, voltar){ return '<div class="pd-hd"><button class="pd-x" data-act="'+voltar+'" data-id="visao" aria-label="Voltar">'+UI.ic('voltar')+'</button><div><b>'+titulo+'</b><small>'+sub+'</small></div></div>'; }

function render(el, arg){
  css(); document.body.classList.add('foco');
  if(arg && LFI.prod(arg)) return passoQtd(el, LFI.prod(arg));
  var s=st(), dep=s.dep, bx=baixasHoje(), vt=0; bx.forEach(function(m){ vt+=Math.abs(m.qtd)*(m.custo||0); });
  var h='<div class="pd">'+cab('Saídas e perdas','Escolha o produto que vai sair do estoque','_ir');
  if(s.ultimo) h+='<div class="pd-ok">'+UI.ic('check')+'<span>'+esc(s.ultimo)+'</span></div>';
  h+='<button class="pd-hoje" data-act="verHoje"><span><small>Baixas de hoje</small><b>'+bx.length+(bx.length===1?' registro':' registros')+'</b></span><em>'+F.moeda(vt)+'</em><i>'+(s.verHoje?'▲':'▼')+'</i></button>';
  if(s.verHoje) h+='<div class="pd-hl">'+(bx.length?bx.map(function(m){ var p=LFI.prod(m.prod); return '<div>'+UI.fotoProd(p,36)+'<span><b>'+esc(p.nome)+'</b><small>'+F.qtd(Math.abs(m.qtd),p.un)+' · '+(LFI.TIPOS_MOV[m.tipo]||[m.tipo])[0]+' · '+String(m.d).slice(11,16)+'</small></span><em>'+F.moeda(Math.abs(m.qtd)*(m.custo||0))+'</em></div>'; }).join(''):'<div><span><small>Nenhuma baixa registrada hoje.</small></span></div>')+'</div>';
  var deps=LFI.depsVisiveis();
  if(deps.length>1) h+='<div class="pd-deps">'+deps.map(function(d){ return '<button class="'+(d.id===dep?'on':'')+'" data-act="dep" data-id="'+d.id+'">'+esc(d.curto||d.nome)+'</button>'; }).join('')+'</div>';
  h+='<div class="pd-busca">'+UI.ic('busca')+'<input id="pd-q" placeholder="Buscar produto" value="'+esc(s.q)+'" autocomplete="off"></div><div id="pd-ls"></div></div>';
  el.innerHTML=h;
  function lista(){
    var ps=LFI.db.produtos.filter(function(p){ return (p.est[dep]||0)>0; }), q=s.q.trim(), feitos={};
    bx.forEach(function(m){ if(m.dep===dep) feitos[m.prod]=(feitos[m.prod]||0)+Math.abs(m.qtd); });
    function linha(p){ return '<button class="pd-it" data-act="_ir" data-id="perdas/'+p.id+'">'+UI.fotoProd(p,48)+'<span><b>'+esc(p.nome)+'</b><small>Tem '+F.qtd(p.est[dep]||0,p.un)+'</small></span>'+(feitos[p.id]?'<i class="tg bx">✓ '+F.qtd(feitos[p.id],p.un)+'</i>':tag(p))+'</button>'; }
    var out='';
    if(q){ var r=UI.filtrarBusca(q, ps, function(p){ return p.nome+' '+(p.apelidos||[]).join(' '); }); out=r.length?'<div class="pd-lista">'+r.map(linha).join('')+'</div>':'<div class="card">'+UI.vazio('Nenhum produto encontrado.','🔎')+'</div>'; }
    else {
      var nome=function(a,b){ return a.nome.localeCompare(b.nome); };
      var aca=ps.filter(function(p){ return p.tipo==='acabado'; }).sort(nome), vence=ps.filter(function(p){ var dv=LFI.diasParaVencer(p); return p.tipo!=='acabado'&&dv!=null&&dv<=2; }).sort(function(a,b){ return LFI.diasParaVencer(a)-LFI.diasParaVencer(b); }), resto=ps.filter(function(p){ return aca.indexOf(p)<0&&vence.indexOf(p)<0; }).sort(nome);
      if(aca.length) out+='<div class="pd-sec">Produção do dia</div><div class="pd-lista">'+aca.map(linha).join('')+'</div>';
      if(vence.length) out+='<div class="pd-sec">Vencendo</div><div class="pd-lista">'+vence.map(linha).join('')+'</div>';
      if(resto.length) out+='<div class="pd-sec">Outros produtos</div><div class="pd-lista">'+resto.map(linha).join('')+'</div>';
      if(!out) out='<div class="card">'+UI.vazio('Nenhum produto com estoque neste setor.','📦')+'</div>';
    }
    el.querySelector('#pd-ls').innerHTML=out;
  }
  lista();
  el.querySelector('#pd-q').addEventListener('input', function(ev){ s.q=ev.target.value; s.ultimo=null; lista(); });
  UI.liga(el, UI.navHandlers({
    dep:function(id){ s.dep=id; s.ultimo=null; LFI.recarregar(); },
    verHoje:function(){ s.verHoje=!s.verHoje; LFI.recarregar(); }
  }));
}

function passoQtd(el, p){
  var s=st(), dep=s.dep, tem=p.est[dep]||0;
  var h='<div class="pd">'+cab('Dar baixa','Informe a quantidade e o motivo','volta')+
    '<div class="pd-prod">'+UI.fotoProd(p,64)+'<div><b>'+esc(p.nome)+'</b><small>Tem '+F.qtd(tem,p.un)+' em '+esc(LFI.dep(dep).nome)+'</small></div></div>'+
    '<div class="pd-lb">Quantidade que vai sair</div>'+
    '<div class="pd-qtd"><button data-act="menos" aria-label="Diminuir">−</button><label><input id="pd-n" type="text" inputmode="decimal" placeholder="0" autocomplete="off"><em>'+esc(p.un)+'</em></label><button data-act="mais" aria-label="Aumentar">+</button></div>'+
    '<div class="pd-lb">Motivo</div><div class="pd-mot">'+MOTIVOS.map(function(m){ return '<button class="'+(s.motivo===m.id?'on':'')+'" data-act="mot" data-id="'+m.id+'">'+UI.ic(m.ic)+'<span><b>'+m.nome+'</b><small>'+m.dica+'</small></span></button>'; }).join('')+'</div>'+
    '<div class="pd-res" id="pd-res"></div><button class="pd-btn" data-act="ok" id="pd-ok" disabled>'+UI.ic('check')+'Confirmar baixa</button></div>';
  el.innerHTML=h;
  var inp=el.querySelector('#pd-n');
  function val(){ var v=parseFloat(String(inp.value).replace(',','.')); return isFinite(v)?v:0; }
  function atualiza(){ var q=val(), b=el.querySelector('#pd-ok'), r=el.querySelector('#pd-res');
    b.disabled=!(q>0);
    r.innerHTML=q>0?(q>tem+1e-9?'<b>Mais do que tem no estoque ('+F.qtd(tem,p.un)+')</b>':'Valor que sai do estoque: <b>'+F.moeda(q*p.custoMedio)+'</b>'):''; }
  inp.addEventListener('input', atualiza);
  inp.addEventListener('keydown', function(ev){ if(ev.key==='Enter'&&val()>0) confirma(); });
  setTimeout(function(){ try{ inp.focus(); }catch(e){} }, 50);
  function passo(){ return p.un==='kg'||p.un==='L'?0.5:1; }
  function confirma(){ var q=r3(val()); if(!(q>0)) return;
    if(q>tem+1e-9){ UI.toast('Quantidade maior que o estoque','Tem '+F.qtd(tem,p.un),'no'); return; }
    var mot=MOTIVOS.filter(function(m){ return m.id===s.motivo; })[0];
    LFI.movimentar({prod:p.id, dep:dep, tipo:s.motivo, qtd:-q, origem:{tipo:'limpa'}, obs:mot.nome+' (saídas e perdas)'});
    LFI.atividade('estoque', mot.nome+': '+F.qtd(q,p.un)+' de '+p.nome+' ('+F.moeda(q*p.custoMedio)+')', {tela:'estoque', id:p.id});
    LFI.salvar(); s.ultimo=F.qtd(q,p.un)+' de '+p.nome+' · '+mot.nome+' registrado'; s.q='';
    LFI.ir('perdas'); window.scrollTo(0,0); }
  UI.liga(el, UI.navHandlers({
    volta:function(){ LFI.ir('perdas'); },
    menos:function(){ inp.value=String(Math.max(0, r3(val()-passo()))).replace('.',','); atualiza(); },
    mais:function(){ inp.value=String(r3(val()+passo())).replace('.',','); atualiza(); },
    mot:function(id){ s.motivo=id; UI.els('.pd-mot button',el).forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-id')===id); }); },
    ok:confirma
  }));
}

LFI.registrar('perdas',{titulo:'Saídas e perdas', render:render});
})();
