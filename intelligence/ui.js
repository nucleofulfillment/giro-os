/* LiveFood Intelligence — INTERFACE: ícones, modais, avisos, tabelas, gráficos, rotas e casca do módulo. */
(function(){
'use strict';
var LFI = window.LFI, F = LFI.fmt;
var UI = LFI.ui = {};

/* ---------- utilidades ---------- */
UI.esc = function(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
var esc = UI.esc;
UI.el = function(sel, raiz){ return (raiz||document).querySelector(sel); };
UI.els = function(sel, raiz){ return Array.prototype.slice.call((raiz||document).querySelectorAll(sel)); };
/* liga cliques em [data-act] dentro do elemento: handlers {nome: function(id, ev, alvo)} */
UI.liga = function(raiz, handlers){
  raiz.addEventListener('click', function(ev){
    var t=ev.target.closest('[data-act]'); if(!t||!raiz.contains(t)) return;
    var fn=handlers[t.getAttribute('data-act')]; if(!fn) return;
    if(t.tagName==='A') ev.preventDefault();
    fn(t.getAttribute('data-id'), ev, t);
  });
  raiz.addEventListener('change', function(ev){
    var t=ev.target.closest('[data-chg]'); if(!t||!raiz.contains(t)) return;
    var fn=handlers[t.getAttribute('data-chg')]; if(fn) fn(t.getAttribute('data-id'), ev, t);
  });
  raiz.addEventListener('input', function(ev){
    var t=ev.target.closest('[data-inp]'); if(!t||!raiz.contains(t)) return;
    var fn=handlers[t.getAttribute('data-inp')]; if(fn) fn(t.getAttribute('data-id'), ev, t);
  });
};
UI.num = function(v){ if(typeof v==='number') return v; v=String(v||'').trim(); if(!v) return 0; if(v.indexOf(',')>=0) v=v.replace(/\./g,'').replace(',','.'); var n=parseFloat(v); return isNaN(n)?0:n; };
UI.numBR = function(v,c){ if(v==null||v==='') return ''; return Number(v).toLocaleString('pt-BR',{minimumFractionDigits:c==null?0:c, maximumFractionDigits:c==null?3:c, useGrouping:false}); };
UI.espera = function(ms){ return new Promise(function(r){ setTimeout(r,ms); }); };

/* ---------- ícones (traço, 24x24) ---------- */
var IC = {
  painel:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  nota:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6M9 9h2"/>',
  estoque:'<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  compras:'<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
  ordem:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  fornecedor:'<path d="M3 21V9l6-4v4l6-4v4l6-4v16z"/><path d="M7 17h2M11 17h2M15 17h2"/>',
  receita:'<path d="M6 3h11a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1z"/><path d="M9 8h6M9 12h6"/>',
  producao:'<path d="M3 21h18M5 21V10l5 3V10l5 3V7l4 2v12"/>',
  buffet:'<path d="M4 15h16a0 0 0 0 1 0 0 8 8 0 0 1-8 6 8 8 0 0 1-8-6z"/><path d="M12 4v3M6 15a6 6 0 0 1 12 0"/><path d="M2 15h20"/>',
  custos:'<path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  tributo:'<path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16l-4-2-4 2-4-2z"/><path d="M9 8l6 6M15 8h.01M9 14h.01"/>',
  relatorio:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  busca:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  mais:'<path d="M12 5v14M5 12h14"/>',
  upload:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  baixar:'<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  foto:'<path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4"/>',
  lista:'<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  alerta:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  relogio:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  seta:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  voltar:'<path d="M19 12H5M11 18l-6-6 6-6"/>',
  editar:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  lixo:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  whats:'<path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5 5 16.2A8.5 8.5 0 1 1 20.5 11.6z"/><path d="M8.8 8.6c.3 2.6 2.9 5.4 5.6 5.9l1.2-1.2-1.8-.9-.8.8c-1-.4-2.1-1.5-2.5-2.5l.8-.8-.9-1.8z"/>',
  balanca:'<path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
  termo:'<path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z"/>',
  play:'<path d="M7 4l13 8-13 8z"/>',
  imprimir:'<path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2"/><rect x="6" y="14" width="12" height="7"/>',
  excel:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 8l8 8M16 8l-8 8"/>',
  pdf:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8.5 15.5h1a1 1 0 0 0 0-2h-1v4M13 13.5v4h1a2 2 0 0 0 0-4z"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  empresa:'<path d="M3 21h18M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M15 9h3a1 1 0 0 1 1 1v11M8 8h3M8 12h3M8 16h3"/>',
  filtro:'<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  estrela:'<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z"/>',
  raio:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  calendario:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  copiar:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  caminhao:'<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  enviar:'<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
  ia:'<path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>'
};
UI.ic = function(n, cls){ return '<svg viewBox="0 0 24 24" class="'+(cls||'')+'" aria-hidden="true">'+(IC[n]||IC.info)+'</svg>'; };

/* ---------- selos ---------- */
UI.badge = function(txt, cor){ return '<span class="badge b-'+(cor||'nu')+'"><i></i>'+esc(txt)+'</span>'; };
UI.status = function(grupo, s){ var d=(LFI.STATUS[grupo]||{})[s]||[s,'nu']; return UI.badge(d[0], d[1]); };
UI.dep = function(id){ var d=LFI.dep(id); if(!d) return ''; return '<span class="dep"><i style="background:'+d.cor+'"></i>'+esc(d.curto)+'</span>'; };
UI.empTag = function(id){ var e=LFI.emp(id); if(!e) return ''; return '<span class="tag" title="'+esc(e.razao+' · '+e.cnpj)+'">'+esc(e.fantasia)+'</span>'; };
UI.estrelas = function(n){ var s=''; for(var i=1;i<=5;i++) s+= i<=n?'★':'<span class="v">★</span>'; return '<span class="estrelas" title="Qualidade '+n+'/5">'+s+'</span>'; };
UI.situacao = function(p){ var s=LFI.situacao(p); return s==='critico'?UI.badge('Crítico','no'):s==='baixo'?UI.badge('Baixo','wt'):s==='excesso'?UI.badge('Excesso','in'):UI.badge('Normal','ok'); };
UI.variacao = function(atual, antes, inverso){ if(!antes) return '<span class="var nu">—</span>'; var v=atual/antes-1; var up=v>=0; var cls = Math.abs(v)<0.0005?'nu':(inverso?(up?'upr':'dng'):(up?'up':'dn')); return '<span class="var '+cls+'">'+(up?'▲ ':'▼ ')+F.pct(Math.abs(v))+'</span>'; };
UI.match = function(sc){ var c=sc>=85?'alto':sc>=60?'medio':'baixo'; return '<span class="match '+c+'"><span class="sc">'+sc+'%</span></span>'; };
UI.nota = function(txt, tipo, ic){ return '<div class="nota '+(tipo||'')+'">'+UI.ic(ic||'info')+'<div>'+txt+'</div></div>'; };
UI.bar = function(frac, cls){ frac=Math.max(0,Math.min(1,frac||0)); return '<div class="bar '+(cls||'')+'"><i style="width:'+(frac*100).toFixed(1)+'%"></i></div>'; };
UI.vazio = function(txt, em){ return '<div class="vazio"><div class="em">'+(em||'📭')+'</div>'+esc(txt)+'</div>'; };
UI.kpi = function(o){ return '<div class="kpi'+(o.act?' cl':'')+(o.hl?' hl':'')+'"'+(o.act?' data-act="'+o.act+'" data-id="'+esc(o.id||'')+'"':'')+'><div class="lb">'+o.lb+'</div><div class="vl">'+o.vl+'</div>'+(o.dl?'<div class="dl">'+o.dl+'</div>':'')+(o.spark?'<div class="sp">'+o.spark+'</div>':'')+'</div>'; };
UI.passos = function(lista, atual){ var h=''; lista.forEach(function(t,i){ if(i) h+='<div class="passo-l'+(i<=atual?' ok':'')+'"></div>'; h+='<div class="passo'+(i<atual?' ok':i===atual?' on':'')+'"><span class="bo">'+(i<atual?'✓':(i+1))+'</span>'+esc(t)+'</div>'; }); return '<div class="passos">'+h+'</div>'; };
UI.selProdutos = function(sel, filtro){ var h='<option value="">Selecione o produto…</option>'; LFI.db.categorias.forEach(function(c){ var ps=LFI.db.produtos.filter(function(p){ return p.cat===c.id&&p.tipo==='insumo'&&(!filtro||filtro(p)); }); if(!ps.length) return; h+='<optgroup label="'+esc(c.nome)+'">'; ps.forEach(function(p){ h+='<option value="'+p.id+'"'+(p.id===sel?' selected':'')+'>'+esc(p.nome)+' ('+p.un+')</option>'; }); h+='</optgroup>'; }); return h; };
UI.selFornecedores = function(sel, vazio){ var h=vazio?'<option value="">'+esc(vazio)+'</option>':''; LFI.db.fornecedores.forEach(function(f){ h+='<option value="'+f.id+'"'+(f.id===sel?' selected':'')+'>'+esc(f.nome)+'</option>'; }); return h; };
UI.selDeps = function(sel, todos){ var h=todos?'<option value="">'+esc(todos)+'</option>':''; LFI.depsVisiveis().forEach(function(d){ h+='<option value="'+d.id+'"'+(d.id===sel?' selected':'')+'>'+esc(d.nome)+' — '+esc(LFI.emp(d.empresa).fantasia)+'</option>'; }); return h; };

/* ---------- modal / painel lateral ---------- */
var pilha=[];
UI.modal = function(o){
  var ovl=document.createElement('div'); ovl.className='ovl';
  var m=document.createElement('div'); m.className='mdl '+(o.tam||''); m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true');
  m.innerHTML='<div class="mdl-hd"><div><h3>'+o.titulo+'</h3>'+(o.sub?'<small>'+o.sub+'</small>':'')+'</div><button class="x" type="button" data-act="_fechar" aria-label="Fechar">✕</button></div><div class="mdl-bd"></div>'+(o.rodape!==false?'<div class="mdl-ft"></div>':'');
  document.body.appendChild(ovl); document.body.appendChild(m);
  var api={el:m, corpo:m.querySelector('.mdl-bd'), rodape:m.querySelector('.mdl-ft'),
    fechar:function(){ m.classList.remove('on'); ovl.classList.remove('on'); setTimeout(function(){ m.remove(); ovl.remove(); },220); var i=pilha.indexOf(api); if(i>=0) pilha.splice(i,1); if(o.aoFechar) o.aoFechar(); },
    corpoHTML:function(h){ api.corpo.innerHTML=h; }, rodapeHTML:function(h){ if(api.rodape) api.rodape.innerHTML=h; }};
  if(typeof o.corpo==='string') api.corpo.innerHTML=o.corpo;
  if(api.rodape) api.rodape.innerHTML = o.botoes!=null ? o.botoes : '<button class="btn sec" data-act="_fechar">Fechar</button>';
  var h=o.acoes||{}; h._fechar=function(){ api.fechar(); };
  UI.liga(m, h);
  ovl.addEventListener('click', function(){ if(o.fixo) return; api.fechar(); });
  pilha.push(api);
  requestAnimationFrame(function(){ ovl.classList.add('on'); m.classList.add('on'); });
  if(o.aoAbrir) o.aoAbrir(api);
  return api;
};
UI.fecharTodos = function(){ pilha.slice().forEach(function(m){ m.fechar(); }); };
document.addEventListener('keydown', function(e){ if(e.key==='Escape'&&pilha.length){ pilha[pilha.length-1].fechar(); } });
UI.confirmar = function(titulo, texto, rotulo, fn, tipo){
  var m=UI.modal({titulo:titulo, tam:'sm', corpo:'<p style="margin:0;font-size:14px;line-height:1.55;color:var(--muted2);font-weight:600">'+texto+'</p>',
    botoes:'<button class="btn sec" data-act="_fechar">Voltar</button><button class="btn '+(tipo||'pri')+'" data-act="ok">'+esc(rotulo||'Confirmar')+'</button>',
    acoes:{ok:function(){ m.fechar(); fn(); }}});
};

/* ---------- avisos ---------- */
UI.toast = function(msg, sub, tipo){
  var box=document.getElementById('toasts'); if(!box){ box=document.createElement('div'); box.id='toasts'; document.body.appendChild(box); }
  var t=document.createElement('div'); t.className='toast '+(tipo||''); t.innerHTML='<span class="ic">'+(tipo==='no'?'!':tipo==='wt'?'!':tipo==='in'?'✦':'✓')+'</span><div>'+esc(msg)+(sub?'<small>'+esc(sub)+'</small>':'')+'</div>';
  box.appendChild(t); setTimeout(function(){ t.style.transition='opacity .3s,transform .3s'; t.style.opacity='0'; t.style.transform='translateY(6px)'; setTimeout(function(){ t.remove(); },320); }, 4200);
};

/* ---------- tabela com busca e ordenação ----------
   UI.tabela(el, {colunas:[{t:'Título', k:'chave' ou v:function(l), r:true(direita), ord:function(l) ou false, w:'120px'}],
   linhas:[], linhaAct:'acao', linhaId:function(l), classeLinha:function(l), vazio:'texto', rodape:'<tr>…</tr>'}) */
UI.tabela = function(el, o){
  var st={k:o.ordem!=null?o.ordem:null, dir:o.dir||1};
  function desenha(){
    var ls=o.linhas.slice();
    if(st.k!=null){ var c=o.colunas[st.k], f=c.ord||function(l){ return c.k?l[c.k]:0; }; ls.sort(function(a,b){ var x=f(a), y=f(b); if(typeof x==='string') return x.localeCompare(y,'pt-BR')*st.dir; return ((x>y)-(x<y))*st.dir; }); }
    var h='<div class="tb-wrap"><table class="tb '+(o.cls||'')+'"><thead><tr>';
    o.colunas.forEach(function(c,i){ h+='<th class="'+(c.r?'r ':'')+(c.c?'c ':'')+(c.ord!==false?'srt':'')+'" data-col="'+i+'"'+(c.w?' style="width:'+c.w+'"':'')+'>'+c.t+(st.k===i?'<span class="ar">'+(st.dir>0?'▲':'▼')+'</span>':'')+'</th>'; });
    h+='</tr></thead><tbody>';
    if(!ls.length) h+='<tr><td colspan="'+o.colunas.length+'">'+UI.vazio(o.vazio||'Nenhum registro encontrado.')+'</td></tr>';
    ls.forEach(function(l){ var id=o.linhaId?o.linhaId(l):l.id;
      h+='<tr class="'+(o.linhaAct?'cl ':'')+(o.classeLinha?o.classeLinha(l):'')+'"'+(o.linhaAct?' data-act="'+o.linhaAct+'" data-id="'+esc(id)+'"':'')+'>';
      o.colunas.forEach(function(c){ var v=c.v?c.v(l):esc(l[c.k]); h+='<td class="'+(c.r?'r ':'')+(c.c?'c ':'')+(c.nw?'nw':'')+'">'+(v==null?'':v)+'</td>'; });
      h+='</tr>'; });
    h+='</tbody>'+(o.rodape?'<tfoot>'+o.rodape+'</tfoot>':'')+'</table></div>';
    el.innerHTML=h;
    UI.els('th.srt',el).forEach(function(th){ th.addEventListener('click',function(){ var i=+th.getAttribute('data-col'); if(st.k===i) st.dir*=-1; else { st.k=i; st.dir=o.colunas[i].r?-1:1; } desenha(); }); });
  }
  desenha();
  return {redesenha:function(linhas){ if(linhas) o.linhas=linhas; desenha(); }};
};

/* ---------- gráficos (SVG próprio, interativo) ---------- */
UI.CORES = ['#FF5A00','#1C1C1E','#1D4ED8','#16A34A','#C2185B','#B08A00','#7C3AED','#0891B2','#8E8E93','#DB2777','#65A30D','#EA580C'];
var tip;
function tipMostra(ev, html){ if(!tip){ tip=document.createElement('div'); tip.className='ch-tip'; document.body.appendChild(tip); } tip.innerHTML=html; tip.classList.add('on'); var x=ev.clientX+14, y=ev.clientY+14; var w=tip.offsetWidth, hh=tip.offsetHeight; if(x+w>innerWidth-8) x=ev.clientX-w-14; if(y+hh>innerHeight-8) y=ev.clientY-hh-14; tip.style.left=x+'px'; tip.style.top=y+'px'; }
function tipEsconde(){ if(tip) tip.classList.remove('on'); }
UI.tipMostra=tipMostra; UI.tipEsconde=tipEsconde;
function escala(max){ if(max<=0) return {max:1, passo:0.25}; var e=Math.pow(10,Math.floor(Math.log10(max))), n=max/e, p=n<=1.2?0.25:n<=2.5?0.5:n<=5?1:2; var passo=p*e, m=Math.ceil(max/passo)*passo; return {max:m, passo:passo}; }
function eixoFmt(v){ if(Math.abs(v)>=1e6) return (v/1e6).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mi'; if(Math.abs(v)>=1e3) return (v/1e3).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mil'; return v.toLocaleString('pt-BR',{maximumFractionDigits:2}); }

/* barras verticais (agrupadas ou empilhadas) */
UI.grafBarras = function(el, o){
  var W=Math.max(320, el.clientWidth||600), H=o.altura||240, pl=48, pr=8, pt=12, pb=o.rotacao?54:28;
  var n=o.cats.length, ser=o.series, emp=!!o.empilhado, fmt=o.fmt||F.moeda;
  var max=0; o.cats.forEach(function(c,i){ if(emp){ var s=0; ser.forEach(function(x){ s+=Math.max(0,x.valores[i]||0); }); max=Math.max(max,s); } else ser.forEach(function(x){ max=Math.max(max,x.valores[i]||0); }); });
  if(o.linhaRef) max=Math.max(max,o.linhaRef.valor);
  var es=escala(max*1.05), ih=H-pt-pb, iw=W-pl-pr, gw=iw/n, bw=emp?Math.min(46,gw*0.62):Math.min(28,gw*0.8/ser.length);
  var s='<svg viewBox="0 0 '+W+' '+H+'" height="'+H+'">';
  for(var v=0; v<=es.max+1e-9; v+=es.passo){ var y=pt+ih-(v/es.max)*ih; s+='<line class="gl" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'"/><text class="ax" x="'+(pl-8)+'" y="'+(y+3.5)+'" text-anchor="end">'+(o.fmtEixo?o.fmtEixo(v):eixoFmt(v))+'</text>'; }
  o.cats.forEach(function(c,i){
    var x0=pl+gw*i, acum=0;
    ser.forEach(function(x,j){ var val=x.valores[i]||0; if(val<=0&&!emp) return; var bh=(Math.max(0,val)/es.max)*ih, bx, by;
      if(emp){ bx=x0+(gw-bw)/2; by=pt+ih-acum-bh; acum+=bh; } else { bx=x0+(gw-bw*ser.length)/2+bw*j; by=pt+ih-bh; }
      var rad=Math.min(5,bw/2.5), cor=(x.cores&&x.cores[i])||x.cor;
      s+='<rect class="bk" data-i="'+i+'" data-j="'+j+'" x="'+bx.toFixed(1)+'" y="'+by.toFixed(1)+'" width="'+Math.max(1,bw-(emp?0:2)).toFixed(1)+'" height="'+Math.max(0,bh).toFixed(1)+'" rx="'+(emp?2:rad)+'" fill="'+cor+'"/>'; });
    var show = n<=14 || i%Math.ceil(n/14)===0;
    if(show) s+= o.rotacao ? '<text class="ax" transform="translate('+(x0+gw/2)+','+(pt+ih+12)+') rotate(-32)" text-anchor="end">'+esc(c)+'</text>' : '<text class="ax" x="'+(x0+gw/2)+'" y="'+(H-pb+17)+'" text-anchor="middle">'+esc(c)+'</text>';
  });
  if(o.linhaRef){ var yr=pt+ih-(o.linhaRef.valor/es.max)*ih; s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+yr+'" y2="'+yr+'" stroke="'+(o.linhaRef.cor||'#DC2626')+'" stroke-dasharray="5 4" stroke-width="1.5"/><text class="ax" x="'+(W-pr)+'" y="'+(yr-5)+'" text-anchor="end" style="fill:'+(o.linhaRef.cor||'#DC2626')+'">'+esc(o.linhaRef.rotulo||'')+'</text>'; }
  s+='</svg>';
  var leg = ser.length>1||o.legenda ? '<div class="ch-leg">'+ser.map(function(x){ return '<span><i style="background:'+x.cor+'"></i>'+esc(x.nome)+'</span>'; }).join('')+'</div>' : '';
  el.innerHTML='<div class="ch">'+s+'</div>'+leg;
  UI.els('.bk',el).forEach(function(r){ var i=+r.getAttribute('data-i'), j=+r.getAttribute('data-j');
    r.addEventListener('mousemove',function(ev){ var h='<b>'+esc(o.titulosTip?o.titulosTip[i]:o.cats[i])+'</b>'; var tot=0; ser.forEach(function(x){ var vv=x.valores[i]||0; tot+=vv; h+='<div class="r"><span><i style="background:'+x.cor+'"></i>'+esc(x.nome)+'</span><b style="display:inline;margin:0">'+fmt(vv)+'</b></div>'; }); if(emp&&ser.length>1) h+='<div class="r" style="border-top:1px solid rgba(255,255,255,.2);margin-top:4px;padding-top:4px"><span>Total</span><b style="display:inline;margin:0">'+fmt(tot)+'</b></div>'; if(o.onClick) h+='<div style="opacity:.6;font-size:11px;margin-top:4px">Clique para detalhar</div>'; tipMostra(ev,h); });
    r.addEventListener('mouseleave',tipEsconde);
    if(o.onClick) r.addEventListener('click',function(){ tipEsconde(); o.onClick(i,j); }); });
};

/* linhas (com área opcional) */
UI.grafLinhas = function(el, o){
  var W=Math.max(320, el.clientWidth||600), H=o.altura||220, pl=50, pr=12, pt=12, pb=28;
  var n=o.cats.length, fmt=o.fmt||F.moeda, max=0, min=Infinity;
  o.series.forEach(function(x){ x.valores.forEach(function(v){ if(v==null) return; max=Math.max(max,v); min=Math.min(min,v); }); });
  var base = o.zero===false ? Math.max(0, min - (max-min)*0.35) : 0;
  var es=escala((max-base)*1.08), top=base+es.max, ih=H-pt-pb, iw=W-pl-pr;
  function X(i){ return pl + (n<=1? iw/2 : iw*i/(n-1)); }
  function Y(v){ return pt+ih-((v-base)/(top-base))*ih; }
  var s='<svg viewBox="0 0 '+W+' '+H+'" height="'+H+'">';
  for(var v=base; v<=top+1e-9; v+=es.passo){ var y=Y(v); s+='<line class="gl" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'"/><text class="ax" x="'+(pl-8)+'" y="'+(y+3.5)+'" text-anchor="end">'+(o.fmtEixo?o.fmtEixo(v):eixoFmt(v))+'</text>'; }
  o.series.forEach(function(x,j){
    var pts=[]; x.valores.forEach(function(v,i){ if(v!=null) pts.push([X(i),Y(v)]); }); if(!pts.length) return;
    var d='M'+pts.map(function(p){ return p[0].toFixed(1)+' '+p[1].toFixed(1); }).join(' L');
    if(o.area!==false && j===0) s+='<path d="'+d+' L'+pts[pts.length-1][0].toFixed(1)+' '+(pt+ih)+' L'+pts[0][0].toFixed(1)+' '+(pt+ih)+' Z" fill="'+x.cor+'" opacity=".09"/>';
    s+='<path d="'+d+'" fill="none" stroke="'+x.cor+'" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"'+(x.tracejado?' stroke-dasharray="5 4"':'')+'/>';
    if(n<=40) pts.forEach(function(p){ s+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="2.6" fill="#fff" stroke="'+x.cor+'" stroke-width="1.8"/>'; });
  });
  var step=Math.ceil(n/12); o.cats.forEach(function(c,i){ if(i%step===0||i===n-1) s+='<text class="ax" x="'+X(i)+'" y="'+(H-8)+'" text-anchor="middle">'+esc(c)+'</text>'; });
  s+='<line class="cursor" x1="0" x2="0" y1="'+pt+'" y2="'+(pt+ih)+'" stroke="#1C1C1E" stroke-width="1" opacity="0"/>';
  s+='<rect class="hit" x="'+pl+'" y="'+pt+'" width="'+iw+'" height="'+ih+'" fill="transparent" style="cursor:'+(o.onClick?'pointer':'crosshair')+'"/></svg>';
  var leg = o.series.length>1 ? '<div class="ch-leg">'+o.series.map(function(x){ return '<span><i style="background:'+x.cor+'"></i>'+esc(x.nome)+'</span>'; }).join('')+'</div>' : '';
  el.innerHTML='<div class="ch">'+s+'</div>'+leg;
  var svg=el.querySelector('svg'), hit=el.querySelector('.hit'), cur=el.querySelector('.cursor');
  function idx(ev){ var r=svg.getBoundingClientRect(), x=(ev.clientX-r.left)*(W/r.width); return Math.max(0,Math.min(n-1,Math.round((x-pl)/(iw/(Math.max(1,n-1)))))); }
  hit.addEventListener('mousemove',function(ev){ var i=idx(ev); cur.setAttribute('x1',X(i)); cur.setAttribute('x2',X(i)); cur.setAttribute('opacity','.25'); var h='<b>'+esc(o.titulosTip?o.titulosTip[i]:o.cats[i])+'</b>'; o.series.forEach(function(x){ h+='<div class="r"><span><i style="background:'+x.cor+'"></i>'+esc(x.nome)+'</span><b style="display:inline;margin:0">'+(x.valores[i]==null?'—':fmt(x.valores[i]))+'</b></div>'; }); tipMostra(ev,h); });
  hit.addEventListener('mouseleave',function(){ cur.setAttribute('opacity','0'); tipEsconde(); });
  if(o.onClick) hit.addEventListener('click',function(ev){ tipEsconde(); o.onClick(idx(ev)); });
};

/* rosca com legenda clicável */
UI.grafRosca = function(el, o){
  var itens=o.itens.filter(function(x){ return x.valor>0; }), tot=0; itens.forEach(function(x){ tot+=x.valor; });
  var R=80, r=54, cx=85, cy=85, a0=-Math.PI/2, fmt=o.fmt||F.moeda;
  var s='<svg viewBox="0 0 170 170" height="170">';
  if(!tot) s+='<circle cx="85" cy="85" r="67" fill="none" stroke="#E8E8EB" stroke-width="26"/>';
  itens.forEach(function(x,i){ var f=x.valor/tot, a1=a0+f*Math.PI*2; if(f>=0.9999) a1=a0+Math.PI*2-0.0001;
    var la=f>0.5?1:0, p=function(rr,a){ return (cx+rr*Math.cos(a)).toFixed(2)+' '+(cy+rr*Math.sin(a)).toFixed(2); };
    s+='<path class="bk" data-i="'+i+'" d="M'+p(R,a0)+' A'+R+' '+R+' 0 '+la+' 1 '+p(R,a1)+' L'+p(r,a1)+' A'+r+' '+r+' 0 '+la+' 0 '+p(r,a0)+' Z" fill="'+x.cor+'" stroke="#fff" stroke-width="1.5"/>'; a0=a1; });
  s+='<text x="85" y="82" text-anchor="middle" style="font:800 15px Manrope;fill:#1C1C1E">'+esc(o.centro?o.centro.valor:F.moedaK(tot))+'</text><text x="85" y="99" text-anchor="middle" class="ax">'+esc(o.centro?o.centro.rotulo:'total')+'</text></svg>';
  var leg='<div class="donut-leg">'+itens.map(function(x,i){ return '<div class="it" data-i="'+i+'"><i style="background:'+x.cor+'"></i><span>'+esc(x.nome)+'</span><b>'+fmt(x.valor)+'</b><small>'+F.pct(x.valor/tot,0)+'</small></div>'; }).join('')+'</div>';
  el.innerHTML='<div class="donut-wrap"><div class="ch">'+s+'</div>'+leg+'</div>';
  UI.els('[data-i]',el).forEach(function(n){ var i=+n.getAttribute('data-i'), x=itens[i];
    n.addEventListener('mousemove',function(ev){ tipMostra(ev,'<b>'+esc(x.nome)+'</b>'+fmt(x.valor)+' · '+F.pct(x.valor/tot)+(o.onClick?'<div style="opacity:.6;font-size:11px;margin-top:4px">Clique para detalhar</div>':'')); });
    n.addEventListener('mouseleave',tipEsconde);
    if(o.onClick){ n.style.cursor='pointer'; n.addEventListener('click',function(){ tipEsconde(); o.onClick(x,i); }); } });
};

/* barras horizontais (HTML) — itens [{nome, valor, sub, cor, id}] */
UI.barrasH = function(itens, o){ o=o||{}; var max=0; itens.forEach(function(x){ max=Math.max(max,x.valor); }); var fmt=o.fmt||F.moeda;
  return '<div class="hb">'+itens.map(function(x,i){ return '<div class="hb-it"'+(o.act?' data-act="'+o.act+'" data-id="'+esc(x.id!=null?x.id:i)+'"':'')+'><div class="t"><span>'+(o.rank?'<b style="color:var(--muted);margin-right:6px">'+(i+1)+'</b>':'')+esc(x.nome)+(x.sub?'<small>'+esc(x.sub)+'</small>':'')+'</span><b>'+fmt(x.valor)+'</b></div><div class="bar"><i style="width:'+(max?(x.valor/max*100):0).toFixed(1)+'%;background:'+(x.cor||'var(--roxo)')+'"></i></div></div>'; }).join('')+'</div>'; };
UI.spark = function(vals, cor){ var n=vals.length, max=Math.max.apply(null,vals), min=Math.min.apply(null,vals), W=76, H=26; if(max===min) max=min+1; var pts=vals.map(function(v,i){ return (i*(W/(n-1))).toFixed(1)+','+(H-2-(v-min)/(max-min)*(H-4)).toFixed(1); }); return '<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'"><polyline points="'+pts.join(' ')+'" fill="none" stroke="'+(cor||'#FF5A00')+'" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>'; };

/* ---------- exportação (demonstração) ---------- */
UI.baixarArquivo = function(nome, conteudo, tipo){ var b=new Blob([conteudo],{type:tipo||'text/plain;charset=utf-8'}); var a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=nome; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },500); };
/* Excel: usa a mesma biblioteca do Painel (SheetJS) quando carregada; senão gera CSV que o Excel abre */
UI.exportarExcel = function(nome, cabecalho, linhas, aba){
  if(window.XLSX){ var ws=XLSX.utils.aoa_to_sheet([cabecalho].concat(linhas)); ws['!cols']=cabecalho.map(function(){ return {wch:18}; }); var wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, (aba||'Relatório').slice(0,30)); XLSX.writeFile(wb, nome+'.xlsx'); return; }
  var csv='﻿'+[cabecalho].concat(linhas).map(function(l){ return l.map(function(c){ c=String(c==null?'':c); return /[;"\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c; }).join(';'); }).join('\n');
  UI.baixarArquivo(nome+'.csv', csv, 'text/csv;charset=utf-8');
};
/* PDF: abre o relatório formatado pronto para "Salvar como PDF" */
UI.exportarPDF = function(titulo, subtitulo, htmlCorpo){
  var emp=LFI.empresaAtual(), w=window.open('','_blank');
  var cab = emp ? emp.razao+' · CNPJ '+emp.cnpj : LFI.db.grupo.nome+' · consolidado ('+LFI.db.empresas.length+' CNPJs)';
  var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>'+esc(titulo)+'</title><style>@page{size:A4;margin:12mm}body{font-family:Manrope,Arial,sans-serif;color:#1C1C1E;font-size:11px;margin:0}h1{font-size:18px;margin:0}h2{font-size:13px;margin:16px 0 6px}.cab{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #FF5A00;padding-bottom:10px;margin-bottom:14px}.cab small{color:#5E5E66;font-size:10.5px}.cab img{height:22px}table{width:100%;border-collapse:collapse;margin-top:6px}th{background:#F3F3F5;text-align:left;font-size:9.5px;text-transform:uppercase;letter-spacing:.3px;color:#5E5E66;padding:6px 7px;border-bottom:1px solid #DFDFE4}td{padding:6px 7px;border-bottom:1px solid #ECECEF;font-size:10.5px}td.r,th.r{text-align:right}tfoot td{font-weight:800;background:#FAFAFA}.kp{display:flex;gap:10px;margin:8px 0 4px}.kp div{flex:1;border:1px solid #ECECEF;border-radius:8px;padding:8px 10px}.kp span{display:block;font-size:9px;text-transform:uppercase;color:#8E8E93;font-weight:800}.kp b{font-size:14px}.rod{margin-top:18px;font-size:9.5px;color:#8E8E93;border-top:1px solid #ECECEF;padding-top:8px}.demo{background:#FFF1E8;color:#8A3A0A;padding:6px 9px;border-radius:6px;font-size:10px;margin-bottom:10px}</style></head><body>'+
    '<div class="cab"><div><h1>'+esc(titulo)+'</h1><small>'+esc(subtitulo||'')+'<br>'+esc(cab)+'</small></div><div style="text-align:right"><img src="'+location.href.replace(/[^\/]*$/,'')+'livefood-logo.png" alt="LiveFood"><br><small>LivePro · emitido em '+F.dataHora(LFI.agoraISO())+'</small></div></div>'+
    '<div class="demo">Relatório de demonstração gerado com dados fictícios.</div>'+htmlCorpo+'<div class="rod">Gerado por '+esc(LFI.usuario().nome)+' · LivePro</div><script>setTimeout(function(){print()},400)<\/script></body></html>';
  if(!w){ UI.toast('Libere a abertura de janelas para gerar o PDF','','wt'); return; }
  w.document.open(); w.document.write(html); w.document.close();
};

/* ---------- rotas e telas ---------- */
LFI.telas = {};
LFI.menu = [
  {grupo:'Gestão', itens:[{id:'visao', nome:'Visão Geral', ic:'painel'}]},
  {grupo:'Suprimentos', itens:[{id:'notas', nome:'Fiscal', ic:'nota'},{id:'estoque', nome:'Estoque', ic:'estoque'},{id:'compras', nome:'Compras', ic:'compras'},{id:'ordens', nome:'Ordens', ic:'ordem'},{id:'fornecedores', nome:'Fornecedores', ic:'fornecedor'}]},
  {grupo:'Operação', itens:[{id:'receitas', nome:'Receitas', ic:'receita'},{id:'producao', nome:'Produção', ic:'producao'},{id:'buffet', nome:'Buffet', ic:'buffet'}]},
  {grupo:'Inteligência', itens:[{id:'custos', nome:'Precificação', ic:'custos'},{id:'tributos', nome:'Tributário', ic:'tributo'},{id:'relatorios', nome:'Relatórios', ic:'relatorio'}]}
];
LFI.estado = {}; /* estado de cada tela (filtros, abas) enquanto a página estiver aberta */
LFI.registrar = function(id, def){ LFI.telas[id]=def; };
var atual={id:null, arg:null};
LFI.ir = function(id, arg){ var h='#/'+id+(arg?'/'+encodeURIComponent(arg):''); if(location.hash===h) LFI.renderizar(); else location.hash=h; };
LFI.atual = function(){ return atual; };
LFI.renderizar = function(manterScroll){
  var m=location.hash.match(/^#\/([^\/]+)(?:\/(.+))?/), id=m?m[1]:'visao', arg=m&&m[2]?decodeURIComponent(m[2]):null;
  if(!LFI.telas[id]) id='visao';
  var mudouTela = atual.id!==id || atual.arg!==arg;
  atual={id:id, arg:arg};
  document.body.classList.remove('foco');
  var main=document.getElementById('main'), y=window.scrollY;
  var c=document.createElement('div'); c.className='tela tela-'+id;
  main.innerHTML=''; main.appendChild(c);
  try{ LFI.telas[id].render(c, arg); }
  catch(e){ console.error(e); c.innerHTML='<div class="card">'+UI.vazio('Não foi possível abrir esta tela: '+e.message,'⚠️')+'</div>'; }
  document.title=(LFI.telas[id].titulo||'LiveFood')+' · LivePro';
  UI.desenhaMenu();
  if(mudouTela && !manterScroll) window.scrollTo(0,0); else window.scrollTo(0,y);
  fechaMM();
};
LFI.recarregar = function(){ LFI.renderizar(true); };
window.addEventListener('hashchange', function(){ UI.fecharTodos(); LFI.renderizar(); });

/* cabeçalho de página padrão */
UI.cabecalho = function(o){
  return (o.migalha?'<div class="migalha">'+o.migalha.map(function(m,i){ return m.ir?'<a data-act="_ir" data-id="'+esc(m.ir)+'">'+esc(m.t)+'</a>':'<span>'+esc(m.t)+'</span>'; }).join('<span>›</span>')+'</div>':'')+
    '<div class="pghd"><div><h1>'+o.titulo+'</h1>'+(o.sub?'<div class="sub">'+o.sub+'</div>':'')+'</div>'+(o.acoes?'<div class="acoes">'+o.acoes+'</div>':'')+'</div>';
};
/* navegação embutida: data-act="_ir" data-id="tela/arg" */
UI.navHandlers = function(h){ h=h||{}; h._ir=function(id){ var p=String(id).split('/'); LFI.ir(p[0], p.slice(1).join('/')||null); }; return h; };

/* ---------- casca: menu, empresa, busca ---------- */
function contagens(){
  var db=LFI.db, c={};
  c.notas = db.notas.filter(function(n){ return (n.status==='recebida'||n.status==='conferencia')&&LFI.empresaVisivel(n.empresa); }).length;
  c.estoque = LFI.alertas().filter(function(a){ return a.nivel==='no'; }).length;
  c.compras = db.cotacoes.filter(function(x){ return ['propostas_recebidas','comparacao','aguardando_propostas'].indexOf(x.status)>=0&&LFI.empresaVisivel(x.empresa); }).length;
  c.ordens = db.ordens.filter(function(o){ return o.status==='aguardando_aprovacao'&&LFI.empresaVisivel(o.empresa); }).length;
  c.buffet = db.buffets.filter(function(b){ return b.status!=='encerrado'&&LFI.empresaVisivel(b.empresa); }).length;
  c.producao = db.producao.filter(function(o){ return o.status!=='concluida'&&o.status!=='cancelada'&&LFI.depVisivel(o.dep); }).length;
  c.tributos = db.regrasTrib.filter(function(r){ return r.status==='pendente'; }).length;
  return c;
}
UI.desenhaMenu = function(){
  var c=contagens(), destaque={notas:1,estoque:1,compras:1,ordens:1,buffet:1};
  var h=''; LFI.menu.forEach(function(g){ h+='<div class="gr">'+esc(g.grupo)+'</div>'; g.itens.forEach(function(it){ var n=c[it.id]; h+='<button type="button" class="'+(atual.id===it.id?'on':'')+'" data-ir="'+it.id+'"><span class="ic">'+UI.ic(it.ic)+'</span><span>'+esc(it.nome)+'</span>'+(n?'<span class="nb'+(destaque[it.id]?' al':'')+'">'+n+'</span>':'')+'</button>'; }); });
  h+='<div class="side-rod"><div class="demo"><b>Protótipo de demonstração</b>Dados fictícios. As ações ficam salvas neste navegador.<br><button type="button" data-restaurar>Restaurar dados iniciais</button></div><img src="livefood-logo.png" alt="LiveFood"></div>';
  UI.els('.side').forEach(function(s){ s.innerHTML=h; });
};
document.addEventListener('click', function(ev){
  var b=ev.target.closest('[data-ir]'); if(b){ LFI.ir(b.getAttribute('data-ir')); return; }
  if(ev.target.closest('[data-restaurar]')){ UI.confirmar('Restaurar dados de demonstração','Todas as notas lançadas, cotações, ordens, produções e buffets criados nesta demonstração serão desfeitos e a base volta ao estado inicial.','Restaurar',function(){ LFI.restaurar(); UI.toast('Base de demonstração restaurada'); LFI.ir('visao'); },'esc'); }
});
function fechaMM(){ var m=document.getElementById('mm'); if(m) m.classList.remove('on'); }
UI.abreMM = function(){ var m=document.getElementById('mm'); m.classList.add('on'); };

/* seletor de empresa (multi-CNPJ) */
UI.desenhaEmpresa = function(){
  var e=LFI.empresaAtual(), btn=document.getElementById('emp-btn'), ls=document.getElementById('emp-lista');
  btn.innerHTML = e ? '<span class="emp-ic" style="background:'+e.cor+'">'+e.sigla+'</span><span class="emp-tx"><b>'+esc(e.fantasia)+'</b><small>CNPJ '+e.cnpj+'</small></span><span class="car">▼</span>'
                    : '<span class="emp-ic">'+LFI.db.empresas.length+'</span><span class="emp-tx"><b>'+esc(LFI.db.grupo.nome)+'</b><small>Consolidado · '+LFI.db.empresas.length+' CNPJs</small></span><span class="car">▼</span>';
  var h='<div class="t">Empresa em análise</div><button class="emp-op'+(!e?' on':'')+'" data-emp="todas"><span class="emp-ic">'+LFI.db.empresas.length+'</span><span class="emp-tx"><b>Todas as empresas</b><small>Visão consolidada do grupo</small></span>'+(!e?'<span class="ok">✓</span>':'')+'</button>';
  LFI.db.empresas.forEach(function(x){ var deps=LFI.db.departamentos.filter(function(d){ return d.empresa===x.id; }).map(function(d){ return d.curto; }).join(', ');
    h+='<button class="emp-op'+(e&&e.id===x.id?' on':'')+'" data-emp="'+x.id+'"><span class="emp-ic" style="background:'+x.cor+'">'+x.sigla+'</span><span class="emp-tx"><b>'+esc(x.fantasia)+'</b><small>'+x.cnpj+' · '+x.tipo+' · '+esc(x.regime)+'</small><small>'+esc(deps)+'</small></span>'+(e&&e.id===x.id?'<span class="ok">✓</span>':'')+'</button>'; });
  h+='<div class="rod"><button class="emp-op" data-emp-cad><span class="emp-ic" style="background:var(--s3);color:var(--text)">+</span><span class="emp-tx"><b>Gerenciar empresas e CNPJs</b><small>Cadastro, regime tributário e operações</small></span></button></div>';
  ls.innerHTML=h;
};
document.addEventListener('click', function(ev){
  var ls=document.getElementById('emp-lista'); if(!ls) return;
  if(ev.target.closest('#emp-btn')){ ls.classList.toggle('on'); return; }
  var op=ev.target.closest('[data-emp]'); if(op){ ls.classList.remove('on'); LFI.setEmpresa(op.getAttribute('data-emp')); return; }
  if(ev.target.closest('[data-emp-cad]')){ ls.classList.remove('on'); UI.gerenciarEmpresas(); return; }
  if(!ev.target.closest('.emp-sel')) ls.classList.remove('on');
});
LFI.on('empresa', function(){ UI.desenhaEmpresa(); LFI.recarregar(); var e=LFI.empresaAtual(); UI.toast(e?'Visualizando '+e.fantasia:'Visão consolidada do grupo', e?'CNPJ '+e.cnpj:'Todas as empresas', 'in'); });
LFI.on('mudou', function(){ UI.desenhaMenu(); });

/* cadastro de empresas (multi-CNPJ) */
UI.gerenciarEmpresas = function(){
  function corpo(){
    return UI.nota('Cada CNPJ tem seu próprio regime tributário, estoque por operação, notas fiscais e contas a pagar. Use o seletor no topo para alternar entre uma empresa e a visão consolidada.','in')+
      '<div class="tb-wrap"><table class="tb"><thead><tr><th>Empresa</th><th>CNPJ</th><th>Tipo</th><th>Regime</th><th>Operações</th><th class="r">Impostos s/ venda</th><th></th></tr></thead><tbody>'+
      LFI.db.empresas.map(function(e){ var deps=LFI.db.departamentos.filter(function(d){ return d.empresa===e.id; }); return '<tr><td><b>'+esc(e.fantasia)+'</b><small>'+esc(e.razao)+'</small></td><td class="nw mono">'+e.cnpj+'</td><td>'+e.tipo+'</td><td>'+esc(e.regime)+'</td><td>'+deps.map(function(d){ return UI.dep(d.id); }).join(' ')+'</td><td class="r">'+F.pctN(e.impVenda)+'</td><td class="r"><button class="btn sec xs" data-act="edit" data-id="'+e.id+'">Editar</button></td></tr>'; }).join('')+
      '</tbody></table></div>';
  }
  var m=UI.modal({titulo:'Empresas e CNPJs do grupo', sub:LFI.db.grupo.nome, tam:'lg', corpo:corpo(),
    botoes:'<button class="btn sec esq" data-act="nova">'+UI.ic('mais')+'Adicionar CNPJ</button><button class="btn pri" data-act="_fechar">Concluir</button>',
    acoes:{edit:function(id){ UI.editarEmpresa(id, function(){ m.corpoHTML(corpo()); UI.desenhaEmpresa(); }); }, nova:function(){ UI.editarEmpresa(null, function(){ m.corpoHTML(corpo()); UI.desenhaEmpresa(); }); }}});
};
UI.editarEmpresa = function(id, depois){
  var e=id?LFI.emp(id):{id:LFI.novoId('e'), sigla:'', fantasia:'', razao:'', cnpj:'', ie:'', regime:'Simples Nacional', uf:'SP', cidade:'Campinas', endereco:'', tipo:'Filial', impVenda:8, cor:'#0891B2'};
  var deps=LFI.db.departamentos;
  var m=UI.modal({titulo:id?'Editar empresa':'Novo CNPJ', tam:'lg', corpo:
    '<div class="fgrid"><div class="field"><label>Nome fantasia</label><input class="inp" id="ee-f" value="'+esc(e.fantasia)+'"></div><div class="field"><label>Razão social</label><input class="inp" id="ee-r" value="'+esc(e.razao)+'"></div>'+
    '<div class="field"><label>CNPJ</label><input class="inp mono" id="ee-c" value="'+esc(e.cnpj)+'" placeholder="00.000.000/0000-00"></div><div class="field"><label>Inscrição estadual</label><input class="inp" id="ee-ie" value="'+esc(e.ie)+'"></div>'+
    '<div class="field"><label>Tipo</label><select class="inp" id="ee-t"><option'+(e.tipo==='Matriz'?' selected':'')+'>Matriz</option><option'+(e.tipo==='Filial'?' selected':'')+'>Filial</option></select></div>'+
    '<div class="field"><label>Regime tributário</label><select class="inp" id="ee-rg">'+['Simples Nacional','Lucro Presumido','Lucro Real','MEI'].map(function(x){ return '<option'+(x===e.regime?' selected':'')+'>'+x+'</option>'; }).join('')+'</select></div>'+
    '<div class="field"><label>Impostos sobre a venda (%)</label><input class="inp num" id="ee-iv" value="'+UI.numBR(e.impVenda,2)+'"><div class="hint">Informe a alíquota efetiva indicada pela contabilidade. Usada na margem de contribuição.</div></div>'+
    '<div class="field"><label>PIS/COFINS</label><select class="inp" id="ee-pc">'+[['nao_se_aplica','Não se aplica (Simples Nacional)'],['cumulativo','Cumulativo (sem crédito)'],['nao_cumulativo','Não cumulativo (com crédito)']].map(function(x){ return '<option value="'+x[0]+'"'+(x[0]===e.pisCofins?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select><div class="hint">Define se as compras geram crédito de PIS/COFINS. Confirme com a contabilidade.</div></div>'+'<div class="field"><label>Sigla (2 letras)</label><input class="inp" id="ee-s" maxlength="2" value="'+esc(e.sigla)+'"></div>'+
    '<div class="field full"><label>Operações vinculadas a este CNPJ</label><div style="display:flex;gap:14px;flex-wrap:wrap">'+deps.map(function(d){ return '<label class="chk"><input type="checkbox" data-dep="'+d.id+'"'+(d.empresa===e.id?' checked':'')+'> '+esc(d.nome)+' <small style="color:var(--muted)">(hoje: '+esc(LFI.emp(d.empresa).fantasia)+')</small></label>'; }).join('')+'</div></div></div>',
    botoes:'<button class="btn sec" data-act="_fechar">Cancelar</button><button class="btn pri" data-act="ok">Salvar</button>',
    acoes:{ok:function(){
      var v=function(s){ return m.el.querySelector(s).value.trim(); };
      if(!v('#ee-f')||!/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(v('#ee-c'))){ UI.toast('Preencha o nome e um CNPJ no formato 00.000.000/0000-00','','wt'); return; }
      e.fantasia=v('#ee-f'); e.razao=v('#ee-r')||e.fantasia; e.cnpj=v('#ee-c'); e.ie=v('#ee-ie'); e.tipo=v('#ee-t'); e.regime=v('#ee-rg'); e.impVenda=UI.num(v('#ee-iv')); e.pisCofins=v('#ee-pc'); e.sigla=(v('#ee-s')||e.fantasia.slice(0,2)).toUpperCase();
      if(!id) LFI.db.empresas.push(e);
      UI.els('[data-dep]',m.el).forEach(function(c){ if(c.checked) LFI.dep(c.getAttribute('data-dep')).empresa=e.id; });
      LFI.salvar(); m.fechar(); UI.toast(id?'Empresa atualizada':'CNPJ adicionado ao grupo', e.cnpj); if(depois) depois(); LFI.recarregar();
    }}});
};

/* busca global */
function busca(q){
  q=q.trim().toLowerCase(); if(q.length<2) return [];
  var n=function(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }, qq=n(q), out=[];
  LFI.db.produtos.forEach(function(p){ if(n(p.nome).indexOf(qq)>=0||p.ncm.indexOf(q)>=0) out.push({g:'Produtos', t:p.nome, s:F.qtd(LFI.estoqueGeral(p),p.un), ir:'estoque/'+p.id}); });
  LFI.db.receitas.forEach(function(r){ if(n(r.nome).indexOf(qq)>=0) out.push({g:'Receitas', t:r.nome, s:LFI.dep(r.dep).curto, ir:'receitas/'+r.id}); });
  LFI.db.fornecedores.forEach(function(f){ if(n(f.nome+' '+f.razao).indexOf(qq)>=0||f.cnpj.replace(/\D/g,'').indexOf(q.replace(/\D/g,'')||'x')>=0) out.push({g:'Fornecedores', t:f.nome, s:f.cidade+'/'+f.uf, ir:'fornecedores/'+f.id}); });
  LFI.db.notas.forEach(function(x){ if((x.numero+' '+LFI.forn(x.forn).nome).toLowerCase().indexOf(q)>=0||n(x.numero).replace(/\D/g,'').indexOf(q.replace(/\D/g,'')||'x')>=0) out.push({g:'Notas fiscais', t:'NF '+x.numero, s:LFI.forn(x.forn).nome, ir:'notas/'+x.id}); });
  LFI.db.ordens.forEach(function(x){ if(n(x.num).indexOf(qq)>=0) out.push({g:'Ordens de compra', t:x.num, s:LFI.forn(x.forn).nome, ir:'ordens/'+x.id}); });
  LFI.db.cotacoes.forEach(function(x){ if(n(x.num).indexOf(qq)>=0) out.push({g:'Cotações', t:x.num, s:LFI.STATUS.cot[x.status][0], ir:'compras/'+x.id}); });
  return out.slice(0,14);
}
UI.iniciaBusca = function(){
  var inp=document.getElementById('busca'), res=document.getElementById('busca-res'); if(!inp) return; var sel=0, itens=[];
  function des(){ if(!itens.length){ res.innerHTML=inp.value.trim().length>=2?'<div class="vazio" style="padding:18px">Nada encontrado</div>':''; res.classList.toggle('on',inp.value.trim().length>=2); return; } var g='', h=''; itens.forEach(function(x,i){ if(x.g!==g){ g=x.g; h+='<div class="gr">'+esc(g)+'</div>'; } h+='<button data-i="'+i+'" class="'+(i===sel?'on':'')+'">'+esc(x.t)+'<small>'+esc(x.s)+'</small></button>'; }); res.innerHTML=h; res.classList.add('on'); }
  function vai(i){ var x=itens[i]; if(!x) return; res.classList.remove('on'); inp.value=''; inp.blur(); var p=x.ir.split('/'); LFI.ir(p[0],p[1]); }
  inp.addEventListener('input',function(){ itens=busca(inp.value); sel=0; des(); });
  inp.addEventListener('keydown',function(e){ if(e.key==='ArrowDown'){ sel=Math.min(itens.length-1,sel+1); des(); e.preventDefault(); } else if(e.key==='ArrowUp'){ sel=Math.max(0,sel-1); des(); e.preventDefault(); } else if(e.key==='Enter'){ vai(sel); } else if(e.key==='Escape'){ res.classList.remove('on'); inp.blur(); } });
  res.addEventListener('mousedown',function(e){ var b=e.target.closest('[data-i]'); if(b){ e.preventDefault(); vai(+b.getAttribute('data-i')); } });
  inp.addEventListener('blur',function(){ setTimeout(function(){ res.classList.remove('on'); },150); });
  document.addEventListener('keydown',function(e){ if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){ e.preventDefault(); inp.focus(); } });
};

UI.iniciar = function(){
  UI.desenhaEmpresa(); UI.desenhaMenu(); UI.iniciaBusca();
  var rel=document.getElementById('tb-hora'); function hr(){ var d=new Date(); rel.textContent=d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'}).replace('.','')+' · '+LFI.agoraHM(); } hr(); setInterval(hr,30000);
  document.getElementById('tb-av').textContent=LFI.usuario().ini;
  document.getElementById('tb-menu').addEventListener('click', UI.abreMM);
  document.querySelector('#mm .fd').addEventListener('click', fechaMM);
  var t, larg=innerWidth; window.addEventListener('resize', function(){ clearTimeout(t); t=setTimeout(function(){ if(Math.abs(innerWidth-larg)<60||document.querySelector('.mdl.on')) return; larg=innerWidth; if(!document.activeElement||!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) LFI.recarregar(); },300); });
  LFI.renderizar();
};
})();
