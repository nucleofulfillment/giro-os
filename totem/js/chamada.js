/* Tela de chamada — TV do salão com a fila de preparo e os pedidos prontos (LiveFood).
   Abre com o link das configurações do totem: chamada.html?loja=<código>&k=<chave do totem>.
   Consulta /live/chamada a cada 4 s. Pedido de retirada (balcão ou totem) que a cozinha recebeu fica em "Preparando";
   quando é marcado como pronto (no Preparo, por toque ou bipe), a tela inteira chama o número e o nome e ele passa
   para "Pronto para retirar". Só leitura: esta tela não muda nada no pedido.
   chamada.html?demo=1 mostra a tela com pedidos inventados, para demonstração. */
(function () {
  'use strict';
  const API = 'https://giro-os-api.nucleofull.workers.dev';
  const Q = new URLSearchParams(location.search);
  const LOJA = String(Q.get('loja') || Q.get('c') || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
  const CHAVE = String(Q.get('k') || '').replace(/[^a-f0-9]/g, '').slice(0, 64);
  const DEMO = Q.get('demo') === '1';
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------------------------------------------------------------------------
  // Tela (1920 x 1080, encaixada na TV)
  // ---------------------------------------------------------------------------
  const st = document.createElement('style');
  st.textContent = `
  :root { --bg: #F4F4F5; --s3: #F3F3F5; --s4: #E8E8EB; --b2: #DFDFE4; --tx: #1C1C1E; --mu: #8E8E93; --mu2: #5E5E66; --pri: #FF5A00; --pri-esc: #E04A00; --f: 'Manrope', system-ui, sans-serif; --ft: 'Baloo 2', system-ui, sans-serif; }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; overflow: hidden; background: #1C1C1E; color: var(--tx); font-family: var(--f); -webkit-font-smoothing: antialiased; cursor: default; }
  #tv { position: fixed; left: 0; top: 0; width: 1920px; height: 1080px; transform-origin: 0 0; overflow: hidden; background: var(--pri); user-select: none; }
  #assinatura { position: absolute; left: 0; right: 0; bottom: 0; height: 56px; display: grid; place-items: center; }
  #assinatura img { height: 28px; }
  #tela { position: absolute; left: 0; right: 0; top: 0; bottom: 56px; background: var(--bg); border-radius: 0 0 44px 44px; overflow: hidden; display: grid; grid-template-columns: 640px minmax(0, 1fr); }
  /* esquerda: fila de preparo, calma, em cinza */
  #col-prep { background: #fff; border-right: 2px solid var(--s4); display: flex; flex-direction: column; padding: 44px 44px 30px; min-height: 0; }
  #marca { height: 72px; display: flex; align-items: center; font: 800 40px/1 var(--ft); letter-spacing: -.5px; }
  #marca img { height: 72px; max-width: 420px; object-fit: contain; display: block; }
  .tit { display: flex; align-items: baseline; justify-content: space-between; margin: 42px 0 22px; }
  .tit b { font-size: 46px; font-weight: 800; letter-spacing: -1px; }
  .tit span { font-size: 26px; font-weight: 700; color: var(--mu); }
  #prep { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: 132px; gap: 16px; align-content: start; overflow: hidden; }
  .pt { position: relative; border-radius: 30px; background: var(--s3); padding: 0 28px; display: flex; flex-direction: column; justify-content: center; min-width: 0; }
  .pt .n { font: 800 70px/.9 var(--ft); letter-spacing: -2px; color: var(--mu2); padding-top: 10px; }
  .pt .nm { min-width: 0; font-size: 27px; font-weight: 700; color: var(--mu2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pt .nm:empty { display: none; }
  .pt.entra { animation: ptEntra .5s cubic-bezier(.2, .9, .3, 1.2); }
  @keyframes ptEntra { from { opacity: 0; transform: translateY(30px) scale(.94); } }
  .fogo { position: absolute; right: 26px; top: 26px; display: flex; gap: 6px; align-items: flex-end; height: 30px; }
  .fogo i { width: 8px; height: 8px; border-radius: 50%; background: var(--pri); opacity: .35; animation: fogo 1.4s ease-in-out infinite; }
  .fogo i:nth-child(2) { animation-delay: .2s; } .fogo i:nth-child(3) { animation-delay: .4s; }
  @keyframes fogo { 40% { transform: translateY(-16px); opacity: 1; } }
  #prep-mais { margin-top: 16px; font-size: 26px; font-weight: 700; color: var(--mu); min-height: 34px; }
  .vazio { grid-column: 1 / -1; font-size: 28px; font-weight: 700; color: var(--mu); padding-top: 10px; }
  /* direita: prontos */
  #col-pronto { display: flex; flex-direction: column; padding: 44px 50px 30px; min-height: 0; min-width: 0; }
  #topo-dir { display: flex; align-items: center; justify-content: space-between; height: 72px; }
  #topo-dir b { font-size: 46px; font-weight: 800; letter-spacing: -1px; }
  #hora { font: 800 46px/1 var(--ft); color: var(--mu2); padding-top: 6px; font-variant-numeric: tabular-nums; }
  #heroi { position: relative; margin-top: 30px; height: 470px; flex: none; border-radius: 48px; background: var(--pri); color: #fff; overflow: hidden; display: flex; align-items: center; padding: 0 70px; gap: 60px; box-shadow: 0 30px 60px -20px rgba(255, 90, 0, .55); }
  #heroi .n { font: 800 400px/1 var(--ft); letter-spacing: -14px; padding-top: 40px; flex: none; }
  #heroi.d4 .n { font-size: 300px; letter-spacing: -9px; } #heroi.d5 .n { font-size: 230px; letter-spacing: -6px; }
  #heroi .t { min-width: 0; }
  #heroi .t small { display: block; font-size: 36px; font-weight: 700; opacity: .88; }
  #heroi .t b { display: block; font-size: 110px; font-weight: 800; line-height: 1.02; letter-spacing: -3px; margin-top: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  #heroi .t span { display: inline-block; margin-top: 22px; padding: 12px 30px; border-radius: 99px; background: #fff; color: var(--pri-esc); font-size: 34px; font-weight: 800; }
  #heroi.so-numero { justify-content: center; } #heroi.so-numero .n { font-size: 440px; } #heroi.so-numero.d4 .n { font-size: 380px; } #heroi.so-numero.d5 .n { font-size: 300px; }
  #heroi.novo .n { animation: bate .7s cubic-bezier(.3, 1.7, .5, 1); }
  @keyframes bate { from { transform: scale(.5); opacity: 0; } }
  #heroi .anel { position: absolute; right: -120px; top: -120px; width: 420px; height: 420px; border-radius: 50%; border: 60px solid rgba(255, 255, 255, .12); }
  #heroi-vazio { margin-top: 30px; height: 470px; flex: none; border-radius: 48px; border: 4px dashed var(--b2); display: flex; align-items: center; justify-content: center; gap: 50px; color: var(--mu2); font-size: 44px; font-weight: 700; line-height: 1.25; }
  #heroi-vazio .lv { width: 210px; flex: none; }
  #antes { margin-top: 26px; flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 100%; gap: 20px; overflow: hidden; }
  .pa { border-radius: 36px; background: #fff; border: 3px solid var(--s4); padding: 22px 28px; display: flex; flex-direction: column; justify-content: center; min-width: 0; }
  .pa .n { font: 800 128px/1 var(--ft); letter-spacing: -4px; color: var(--pri); padding-top: 12px; }
  .pa.d4 .n { font-size: 100px; letter-spacing: -3px; } .pa.d5 .n { font-size: 80px; letter-spacing: -2px; }
  .pa .nm { font-size: 34px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
  .pa .ha { font-size: 22px; font-weight: 700; color: var(--mu); margin-top: 6px; }
  .pa.desce { animation: desce .6s cubic-bezier(.2, .9, .3, 1); }
  @keyframes desce { from { opacity: 0; transform: translateY(-40px) scale(.9); } }
  /* a chamada: a tela inteira vira o pedido por 3 segundos */
  #chama { position: absolute; inset: 0; z-index: 10; background: var(--pri); color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; clip-path: circle(0 at 16% 60%); pointer-events: none; }
  #chama.on { animation: abreC .7s cubic-bezier(.6, 0, .2, 1) forwards; }
  #chama.sai { clip-path: circle(150% at 16% 60%); animation: fechaC .5s ease-in forwards; }
  @keyframes abreC { to { clip-path: circle(150% at 16% 60%); } }
  @keyframes fechaC { to { opacity: 0; } }
  #chama small { font-size: 54px; font-weight: 800; opacity: .9; }
  #chama .n { font: 800 560px/.9 var(--ft); letter-spacing: -20px; padding-top: 40px; }
  #chama.d4 .n { font-size: 440px; letter-spacing: -14px; } #chama.d5 .n { font-size: 340px; letter-spacing: -10px; }
  #chama.on .n { animation: bate .8s .25s cubic-bezier(.3, 1.7, .5, 1) backwards; }
  #chama b { font-size: 150px; font-weight: 800; letter-spacing: -4px; line-height: 1; }
  #chama.on b { animation: sobe .6s .5s cubic-bezier(.2, .9, .3, 1) backwards; }
  @keyframes sobe { from { opacity: 0; transform: translateY(50px); } }
  #chama > span { margin-top: 30px; font-size: 44px; font-weight: 700; opacity: .92; }
  /* o Live oficial, numa placa branca para aparecer sobre o laranja */
  #chama .placa { position: absolute; right: 100px; bottom: 70px; width: 300px; height: 300px; border-radius: 50%; background: #fff; display: grid; place-items: center; box-shadow: 0 20px 50px rgba(120, 40, 0, .35); }
  #chama .placa .lv { width: 190px; }
  #chama.on .placa { animation: placaC .7s .35s cubic-bezier(.3, 1.6, .5, 1) backwards; }
  @keyframes placaC { from { transform: translateY(420px) rotate(18deg); } }
  .conf { position: absolute; top: -40px; width: 22px; height: 22px; border-radius: 6px; background: #fff; animation: cai linear forwards; }
  @keyframes cai { to { transform: translateY(1200px) rotate(720deg); opacity: 0; } }
  /* avisos pequenos */
  #aviso { position: absolute; left: 44px; bottom: 26px; z-index: 5; padding: 12px 22px; border-radius: 99px; background: var(--tx); color: #fff; font-size: 22px; font-weight: 700; }
  #aviso:empty { display: none; }
  #erro { position: absolute; inset: 0; z-index: 20; background: var(--bg); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; text-align: center; padding: 0 200px; font-size: 44px; font-weight: 800; }
  #erro small { font-size: 30px; font-weight: 600; color: var(--mu2); line-height: 1.4; }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } #chama.on { clip-path: circle(150% at 16% 60%); } }`;
  document.head.appendChild(st);

  document.body.insertAdjacentHTML('beforeend', `<div id="tv">
    <div id="assinatura"><img src="img/logo-livefood-branca.png" alt="livefood"></div>
    <div id="tela">
      <section id="col-prep"><div id="marca"></div><div class="tit"><b>Preparando</b><span id="prep-n"></span></div><div id="prep"></div><div id="prep-mais"></div></section>
      <section id="col-pronto"><div id="topo-dir"><b>Pronto para retirar</b><div id="hora"></div></div><div id="heroi-lugar"></div><div id="antes"></div></section>
      <div id="chama" aria-live="assertive"></div>
      <div id="aviso"></div>
    </div>
  </div>`);
  const tv = $('#tv');
  function escala() { const s = Math.min(innerWidth / 1920, innerHeight / 1080); tv.style.transform = `translate(${(innerWidth - 1920 * s) / 2}px, ${(innerHeight - 1080 * s) / 2}px) scale(${s})`; }
  addEventListener('resize', escala); escala();
  function hora() { $('#hora').textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  hora(); setInterval(hora, 15000);

  // ---------------------------------------------------------------------------
  // Live oficial (site/js/live-mascote.js, o mesmo personagem do cardápio e do atendimento)
  // ---------------------------------------------------------------------------
  let lives = [];
  function poeLive(alvo, expressao) {
    if (!alvo || !window.LiveMascote) return null;
    try { const l = window.LiveMascote.criar(alvo, { sombra: false, expressao: expressao || 'feliz' }); lives.push({ alvo, l }); return l; } catch (e) { return null; }
  }
  function limpaLives() { lives = lives.filter((x) => { if (document.body.contains(x.alvo)) return true; try { x.l.destruir(); } catch (e) { /* ok */ } return false; }); }

  // ---------------------------------------------------------------------------
  // Estado e desenho
  // ---------------------------------------------------------------------------
  let E = { prep: [], prontos: [] }, cfg = { som: 1, voz: 0 }, fora = 0, vistos = null, fila = [], chamando = false, esperando = {}, prepVistos = {};
  const dig = (n) => { const d = String(n).length; return d >= 5 ? ' d5' : d === 4 ? ' d4' : ''; };
  const ha = (t) => { const m = Math.floor((Date.now() + fora - t) / 60000); return m < 1 ? 'agora há pouco' : 'há ' + m + ' min'; };

  function desenha(novoPronto) {
    const cabe = 10, vis = E.prep.slice(0, cabe);
    $('#prep-n').textContent = E.prep.length ? E.prep.length + (E.prep.length > 1 ? ' pedidos' : ' pedido') : '';
    $('#prep').innerHTML = vis.length ? vis.map((p) => { const novo = !prepVistos[p.num]; prepVistos[p.num] = 1; return `<div class="pt${novo && vistos ? ' entra' : ''}"><span class="n">${esc(p.num)}</span><span class="nm">${esc(p.nome)}</span><span class="fogo"><i></i><i></i><i></i></span></div>`; }).join('') : '<div class="vazio">Nenhum pedido na fila agora.</div>';
    $('#prep-mais').textContent = E.prep.length > cabe ? '+ ' + (E.prep.length - cabe) + ' na fila' : '';
    // prontos que ainda estão na fila da chamada só entram na tela depois de chamados
    const pr = E.prontos.filter((p) => !esperando[p.num]), h = pr[0];
    $('#heroi-lugar').innerHTML = h
      ? `<div id="heroi" class="${h.nome ? '' : 'so-numero'}${dig(h.num)}${h.num === novoPronto ? ' novo' : ''}"><span class="anel"></span><span class="n">${esc(h.num)}</span>${h.nome ? `<div class="t"><small>Pedido pronto</small><b>${esc(h.nome)}</b><span>Retire no balcão</span></div>` : ''}</div>`
      : '<div id="heroi-vazio"><div class="lv" id="lv-vazio"></div><span>Assim que o seu pedido ficar pronto,<br>ele aparece aqui.</span></div>';
    if (!h) poeLive($('#lv-vazio'), 'feliz');
    $('#antes').innerHTML = pr.slice(1, 5).map((p, k) => `<div class="pa${dig(p.num)}${novoPronto && k === 0 ? ' desce' : ''}"><span class="n">${esc(p.num)}</span>${p.nome ? `<span class="nm">${esc(p.nome)}</span>` : ''}<span class="ha">${ha(p.t)}</span></div>`).join('');
    limpaLives();
  }

  // ---------------------------------------------------------------------------
  // Som e voz (o navegador só libera depois de um toque na tela)
  // ---------------------------------------------------------------------------
  let ctx = null, liberado = false;
  function libera() {
    if (liberado) return; liberado = true;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); ctx.resume(); } catch (e) { /* sem áudio */ }
    try { if (window.speechSynthesis) speechSynthesis.speak(new SpeechSynthesisUtterance(' ')); } catch (e) { /* ok */ }
    try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); } catch (e) { /* ok */ }
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(() => {}); } catch (e) { /* ok */ }
    avisa();
  }
  ['pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, libera));
  function avisa() { $('#aviso').textContent = (!liberado && (cfg.som || cfg.voz)) ? 'Toque na tela para ligar o som e a tela cheia' : ''; }
  function som() {
    if (!cfg.som || !ctx) return;
    try {
      [[880, 0], [1174.66, .16], [1567.98, .32]].forEach(([f, t]) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + .02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + .5);
        o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + .55);
      });
    } catch (e) { /* sem áudio */ }
  }
  function voz(p) {
    if (!cfg.voz || !liberado || !window.speechSynthesis) return;
    try { const u = new SpeechSynthesisUtterance('Pedido ' + String(p.num).split('').join(' ') + (p.nome ? ', ' + p.nome : '') + '. Pronto para retirar.'); u.lang = 'pt-BR'; u.rate = .95; setTimeout(() => speechSynthesis.speak(u), 700); } catch (e) { /* ok */ }
  }

  // ---------------------------------------------------------------------------
  // A chamada (um pedido de cada vez)
  // ---------------------------------------------------------------------------
  function chamaProximo() {
    if (chamando || !fila.length) return;
    const p = fila.shift(); chamando = true;
    const c = $('#chama');
    c.innerHTML = `<small>Pedido pronto</small><div class="n">${esc(p.num)}</div>${p.nome ? `<b>${esc(p.nome)}</b>` : ''}<span>Retire no balcão</span><div class="placa"><div class="lv" id="lv-chama"></div></div>` +
      Array.from({ length: 34 }, (x, k) => `<i class="conf" style="left:${Math.random() * 100}%;animation-duration:${1.6 + Math.random() * 1.6}s;animation-delay:${.3 + Math.random() * .8}s;border-radius:${k % 3 ? '6px' : '50%'};opacity:${.5 + Math.random() * .5}"></i>`).join('');
    c.className = dig(p.num).trim(); void c.offsetWidth; c.classList.add('on');
    const live = poeLive($('#lv-chama'), 'animado');
    if (live) setTimeout(() => { try { live.gesto('comemorar'); } catch (e) { /* ok */ } }, 700);
    som(); voz(p);
    setTimeout(() => { delete esperando[p.num]; desenha(p.num); c.classList.remove('on'); c.classList.add('sai'); }, 3000);
    setTimeout(() => { c.className = ''; c.innerHTML = ''; limpaLives(); chamando = false; chamaProximo(); }, 3550);
  }

  function recebe(d) {
    cfg = d.cfg || cfg; fora = (d.agora || Date.now()) - Date.now();
    E = { prep: d.prep || [], prontos: d.prontos || [] };
    if (!vistos) { vistos = {}; E.prontos.forEach((p) => { vistos[p.num] = 1; }); } // ao abrir, quem já estava pronto não é chamado de novo
    else E.prontos.slice().reverse().forEach((p) => { if (!vistos[p.num]) { vistos[p.num] = 1; esperando[p.num] = 1; fila.push(p); } });
    desenha(); avisa(); chamaProximo();
  }

  // ---------------------------------------------------------------------------
  // Dados: servidor (a cada 4 s) ou demonstração
  // ---------------------------------------------------------------------------
  function erro(titulo, texto) { let e = $('#erro'); if (!e) { e = document.createElement('div'); e.id = 'erro'; $('#tela').appendChild(e); } e.innerHTML = `${esc(titulo)}<small>${esc(texto)}</small>`; }
  function semErro() { const e = $('#erro'); if (e) e.remove(); }
  function marca(nome, logo) { $('#marca').innerHTML = logo ? `<img src="${esc(logo)}" alt="${esc(nome)}">` : esc(nome); }

  if (DEMO || (!LOJA && !CHAVE)) {
    if (!DEMO) { erro('Tela de chamada', 'Abra pelo link copiado em Configurações > Totem de toque, parte Tela de chamada.'); return; }
    // demonstração: pedidos inventados entrando e ficando prontos
    const NOMES = ['Ana', 'Bruno', 'Camila', 'Diego', 'Eduarda', 'Felipe', 'Gabi', 'Heitor', 'Isabela', 'João Pedro', 'Karina', 'Lucas', 'Maria Clara', 'Nicolas', 'Olívia', 'Paulo', 'Rafa', 'Sofia', 'Thiago', 'Vitória'];
    let prox = 131;
    const D = { prep: [124, 125, 126, 127, 128, 129, 130].map((n, k) => ({ num: n, nome: NOMES[(k + 3) % NOMES.length] })), prontos: [{ num: 123, nome: 'Sofia', t: Date.now() - 60000 }, { num: 121, nome: 'Diego', t: Date.now() - 190000 }] };
    marca('LiveFood', '');
    const manda = () => recebe({ agora: Date.now(), prep: D.prep.slice(), prontos: D.prontos.slice(), cfg: { som: 1, voz: Q.get('voz') === '1' ? 1 : 0 } });
    manda();
    setInterval(() => { if (D.prep.length) { const p = D.prep.shift(); p.t = Date.now(); D.prontos.unshift(p); D.prontos = D.prontos.slice(0, 6); } manda(); }, 9000);
    setInterval(() => { D.prep.push({ num: prox++, nome: NOMES[Math.floor(Math.random() * NOMES.length)] }); manda(); }, 7000);
    setInterval(() => desenha(), 30000);
    return;
  }

  marca('', '');
  fetch(API + '/food/marca/' + encodeURIComponent(LOJA)).then((r) => r.json()).then((d) => {
    if (d && d.ok) marca(d.nome || '', d.logo ? `${API}/food/foto/${encodeURIComponent(d.cli)}/_logop?v=${d.v || 0}` : '');
  }).catch(() => { /* sem logo: fica em branco */ });

  let falhas = 0;
  async function consulta() {
    try {
      const r = await fetch(`${API}/live/chamada?loja=${encodeURIComponent(LOJA)}&k=${CHAVE}`, { cache: 'no-store' });
      const d = await r.json();
      if (r.status === 401) { erro('Link inválido', d.mensagem || 'Copie de novo o link em Configurações > Totem de toque.'); return; }
      if (r.status === 404) { erro('O servidor ainda não tem a tela de chamada', 'Publique o Worker 301 (ou mais novo) e recarregue esta página.'); return; }
      if (!d || !d.ok) throw new Error((d && d.mensagem) || 'sem resposta');
      falhas = 0; semErro(); recebe(d);
    } catch (e) {
      if (++falhas >= 5) erro('Sem conexão com o LiveFood', 'A tela volta sozinha quando a internet voltar.');
    }
  }
  consulta(); setInterval(consulta, 4000);
  setInterval(() => { if (!chamando) desenha(); }, 30000); // atualiza o "há 3 min"

  // versão nova no ar: a TV se atualiza sozinha (confere a cada 10 min)
  (function () {
    const arquivos = ['chamada.html', 'js/chamada.js'], marcaV = {};
    async function confere() {
      let mudou = false;
      for (const a of arquivos) {
        try { const r = await fetch(a + '?c=' + Date.now(), { method: 'HEAD', cache: 'no-store' }); const m = r.ok ? (r.headers.get('etag') || r.headers.get('last-modified') || '') : ''; if (!m) continue; if (marcaV[a] === undefined) marcaV[a] = m; else if (marcaV[a] !== m) mudou = true; } catch (e) { /* tenta depois */ }
      }
      if (mudou && !chamando) location.reload();
    }
    setTimeout(confere, 20000); setInterval(confere, 10 * 60000);
  })();
})();
