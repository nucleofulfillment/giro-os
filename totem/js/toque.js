/* Totem de toque — autoatendimento por toque do LiveFood (sem voz).
   Usa o mesmo cardápio e o mesmo envio de pedido do totem de voz (js/cardapio.js → window.LIVEFOOD).
   A aparência vem do painel da loja (Configurações → Totem de toque), entregue em /live/config no campo "toque".
   Sem a chave no link, ou com o totem de toque desligado no painel, roda em modo teste: mostra tudo, mas não envia pedido. */
(function () {
  'use strict';
  const M = window.LIVEFOOD;
  const $ = (s) => document.querySelector(s), $$ = (s) => document.querySelectorAll(s);
  const totem = $('#totem');
  const R$ = (v) => 'R$ ' + (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  // ----- configuração do painel -----
  const S = M.servidor || null;
  const C = Object.assign({ ativo: 0, formato: 'v', frase: '', modo: 'ambos', cat: 'esq', capa: 1, topo: 1, rotulo: '', ofs: [], troca: 5, princ: 1, cobrar: 'totem', pg: ['caixa'], ajuda: 1, video: '' }, (S && S.toque) || {});
  const Q = new URLSearchParams(location.search);
  if (/^[vh]$/.test(Q.get('formato') || '')) C.formato = Q.get('formato'); // para conferir o outro formato sem mexer no painel
  // pré-visualização: sem a chave do totem (ou seja, sempre em modo teste) o link aceita ...&demo={"cat":"topo","pg":["caixa","pix"]} para ver uma configuração antes de salvar no painel
  if (!S && Q.get('demo')) { try { Object.assign(C, JSON.parse(Q.get('demo')), { ativo: 0 }); if (!Array.isArray(C.pg) || !C.pg.length) C.pg = ['caixa']; if (!Array.isArray(C.ofs)) C.ofs = []; } catch (e) { /* demo inválido: fica o padrão */ } }
  const MESA = M.mesa || '';                 // tablet de mesa: o pedido entra na conta da mesa
  let ENVIA = !!(M.cli && S && C.ativo);     // senão: modo teste
  let EDITANDO = false;                      // dono logado com o painel de configurações aberto ao lado: nada é enviado
  const FORMAS = ['caixa', 'pix', 'credito', 'debito'];
  function arrumaCfg() { C.pg = (Array.isArray(C.pg) ? C.pg : []).filter((p) => FORMAS.includes(p)); if (!C.pg.length) C.pg = ['caixa']; if (!Array.isArray(C.ofs)) C.ofs = []; }
  arrumaCfg();
  const frase = () => C.frase || (M.ehRest === false ? 'Faça seu pedido aqui' : 'Bateu a fome?');
  const rotulo = () => C.rotulo || 'Oferta de hoje';
  const nomeModo = (m) => (m === 'levar' ? 'Para levar' : 'Consumir aqui');
  window.Totem = { estado: { modo: 'standby' } }; // o cardapio.js só recarrega a página com o totem em espera

  // ----- comemoração do pedido (personagem animado + confete): garante que ela existe mesmo se a página aberta for antiga -----
  // Um totem fica dias com a mesma página aberta. Se o toque.html guardado no aparelho for de antes da comemoração,
  // os arquivos do personagem e os tamanhos da tela não vieram com ele: este arquivo (sempre o mais novo) completa o que faltar.
  (function () {
    const poe = (src, depois) => { const s = document.createElement('script'); s.src = src; s.onload = depois || null; document.body.appendChild(s); };
    const app = () => { if (!window.LiveApp) poe('../site/js/live-app.js'); };
    if (!window.LiveMascote) poe('../site/js/live-mascote.js', app); else app();
    const st = document.createElement('style');
    st.textContent = `
      body .lfc { inset: auto; left: var(--tt-x, 0px); top: var(--tt-y, 0px); width: var(--tt-w, 100vw); height: var(--tt-h, 100vh); gap: calc(26px * var(--tt-s, 1)); padding: calc(60px * var(--tt-s, 1)); background: rgba(244, 244, 245, .97); color: #1C1C1E; border-radius: 0 0 calc(60px * var(--tt-s, 1)) calc(60px * var(--tt-s, 1)); }
      body .lfc .lfc-live { width: calc(420px * var(--tt-s, 1)); flex: none; }
      body .lfc b { font-size: calc(56px * var(--tt-s, 1)); }
      body .lfc .lfc-val { font: 800 calc(300px * var(--tt-s, 1))/1 'Baloo 2', sans-serif; letter-spacing: -.03em; }
      body .lfc .lfc-fp { font-size: calc(34px * var(--tt-s, 1)); padding: calc(18px * var(--tt-s, 1)) calc(38px * var(--tt-s, 1)); gap: calc(14px * var(--tt-s, 1)); }
      body .lfc span { font-size: calc(34px * var(--tt-s, 1)); max-width: calc(840px * var(--tt-s, 1)); line-height: 1.3; color: #5E5E66; }
      body .lfc .lfc-bt { margin-top: calc(34px * var(--tt-s, 1)); min-width: calc(520px * var(--tt-s, 1)); padding: calc(34px * var(--tt-s, 1)) calc(64px * var(--tt-s, 1)); border-radius: calc(36px * var(--tt-s, 1)); font-size: calc(36px * var(--tt-s, 1)); }
      body .lfc-confete { font-size: calc(64px * var(--tt-s, 1)); }
      body.tt-deitado .lfc { gap: calc(14px * var(--tt-s, 1)); padding: calc(30px * var(--tt-s, 1)); border-radius: 0 0 calc(44px * var(--tt-s, 1)) calc(44px * var(--tt-s, 1)); }
      body.tt-deitado .lfc .lfc-live { width: calc(250px * var(--tt-s, 1)); }
      body.tt-deitado .lfc b { font-size: calc(44px * var(--tt-s, 1)); }
      body.tt-deitado .lfc .lfc-val { font-size: calc(190px * var(--tt-s, 1)); }
      body.tt-deitado .lfc .lfc-bt { margin-top: calc(14px * var(--tt-s, 1)); padding: calc(26px * var(--tt-s, 1)) calc(56px * var(--tt-s, 1)); }`;
    document.head.appendChild(st);
  })();
  // ----- encaixe na tela do aparelho -----
  // A tela foi desenhada em 1080x1920 (em pé) ou 1920x1080 (deitada). Aparelho mais comprido ou mais largo que isso
  // (celular, tablet) ficava com faixas pretas sobrando: agora a tela estica a medida que sobra, até 45% a mais,
  // e o conteúdo se acomoda (mais produtos visíveis). Só acima disso é que sobra faixa.
  function encaixa() {
    const deitada = totem.classList.contains('horiz'), W0 = deitada ? 1920 : 1080, H0 = deitada ? 1080 : 1920;
    const lado = window.TOQUE_LADO || 0, larg = Math.max(50, innerWidth - lado), alt = Math.max(50, innerHeight), prop = larg / alt;
    let W = W0, H = H0;
    if (prop < W0 / H0) H = Math.min(Math.round(W0 / prop), Math.round(H0 * 1.45)); else W = Math.min(Math.round(H0 * prop), Math.round(W0 * 1.45));
    totem.style.width = W + 'px'; totem.style.height = H + 'px';
    const s = Math.min(larg / W, alt / H);
    totem.style.transform = 'translate(' + (lado + (larg - W * s) / 2) + 'px, ' + ((alt - H * s) / 2) + 'px) scale(' + s + ')';
    medeTela();
  }
  window.ajustarEscalaToque = encaixa; // o painel de configurações chama por este nome
  // lugar e escala da tela (sem a faixa do LiveFood), para a comemoração ocupar exatamente a tela do totem
  function medeTela() {
    const r = totem.getBoundingClientRect(), W = totem.offsetWidth, H = totem.offsetHeight, s = r.width / W, d = document.documentElement.style;
    d.setProperty('--tt-x', r.left + 'px'); d.setProperty('--tt-y', r.top + 'px'); d.setProperty('--tt-w', r.width + 'px');
    const deitada = totem.classList.contains('horiz');
    d.setProperty('--tt-h', ((H - (deitada ? 60 : 84)) * s) + 'px'); d.setProperty('--tt-s', s);
    document.body.classList.toggle('tt-deitado', deitada);
  }
  // (a página também tem um encaixe próprio, mais antigo; este roda depois dele e é o que vale)
  ['resize', 'orientationchange', 'fullscreenchange'].forEach((ev) => addEventListener(ev, () => setTimeout(encaixa, 0)));
  document.addEventListener('fullscreenchange', () => setTimeout(encaixa, 60));

  // ----- versão nova no ar: o totem se atualiza sozinho -----
  // A cada 10 minutos confere se a página ou este arquivo mudaram no site; se mudaram, recarrega quando o totem estiver na tela de entrada.
  (function () {
    const arquivos = ['toque.html', 'js/toque.js'], marca = {};
    let pendente = false;
    async function confere() {
      for (const a of arquivos) {
        try {
          const r = await fetch(a + '?c=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
          const m = r.ok ? (r.headers.get('etag') || r.headers.get('last-modified') || '') : '';
          if (!m) continue;
          if (marca[a] === undefined) marca[a] = m; else if (marca[a] !== m) pendente = true;
        } catch (e) { /* sem rede agora: tenta na próxima */ }
      }
      if (pendente) recarregaLivre();
    }
    function recarregaLivre() {
      const livre = window.Totem && window.Totem.estado.modo === 'standby' && !document.getElementById('tq-painel') && !document.querySelector('.lfc');
      if (livre) location.reload(); else setTimeout(recarregaLivre, 5000);
    }
    setTimeout(confere, 20000); setInterval(confere, 10 * 60000);
  })();

  // ----- Live oficial (mesma cabeça do totem de voz, rosto padrão "feliz") -----
  const LIVE = `<svg class="lv" viewBox="-110 -125 220 215" aria-hidden="true"><g class="lv-corpo">
    <g class="lv-antena"><path d="M-4,-76 L-27,-116" stroke="#FF5A00" stroke-width="10" stroke-linecap="round"/><path d="M4,-76 L27,-116" stroke="#FF5A00" stroke-width="10" stroke-linecap="round"/><rect x="-14" y="-84" width="28" height="15" rx="6" fill="#E84E00"/></g>
    <rect x="-30" y="64" width="60" height="18" rx="8" fill="#D44600"/>
    <rect x="-96" y="-74" width="192" height="148" rx="38" fill="url(#lv-cab)"/>
    <rect x="-96" y="-74" width="192" height="148" rx="38" fill="url(#lv-cab-lado)"/>
    <ellipse cx="-34" cy="-63" rx="48" ry="6" fill="#fff" opacity=".4"/>
    <rect x="-75" y="-59" width="150" height="118" rx="25" fill="url(#lv-moldura)"/>
    <rect x="-64" y="-49" width="128" height="98" rx="18" fill="url(#lv-tela)"/>
    <g class="lv-rosto" filter="url(#lv-brilho)" fill="#E9FCFF" stroke="#E9FCFF">
      <g class="lv-olhos" stroke="none"><rect x="-25.75" y="-18.75" width="14.5" height="20.5" rx="6"/><rect x="11.25" y="-18.75" width="14.5" height="20.5" rx="6"/></g>
      <path d="M-9,18 Q0,26 9,18" fill="none" stroke-width="3" stroke-linecap="round"/>
    </g></g></svg>`;
  $$('.lv-aqui').forEach((e) => { e.innerHTML = LIVE; });

  // ----- cardápio: o totem de voz trabalha com um item por tamanho; aqui eles voltam a ser um produto com opções -----
  const PRODS = {}, ORDEM = [];
  for (const it of M.itens) {
    const pid = it.pid || it.id;
    let p = PRODS[pid];
    if (!p) { p = PRODS[pid] = { pid, nome: it.produto || it.nome, desc: it.descricao || '', cat: it.categoria || '', foto: it.foto || '', video: it.video || '', emoji: it.emoji || '🍽️', vars: [] }; ORDEM.push(p); }
    p.vars.push(it);
  }
  for (const p of ORDEM) {
    const v0 = p.vars[0];
    p.simples = p.vars.length === 1 && !v0.sabores.length && !v0.bordas.length && !v0.adicionais.length; // vai direto para a sacola
    p.preco = Math.min.apply(null, p.vars.map((v) => v.preco));
    p.apartir = p.vars.length > 1 || v0.sabores.length > 0;
    p.promo = p.vars.some((v) => v.promo);
    p.de = (p.vars.length === 1 && v0.promo && v0.base > v0.preco) ? v0.base : 0;
  }
  const temCat = (id) => M.categorias.some((c) => c.id === id);
  let CATS = [];
  function montaCats() {
    const promo = ORDEM.filter((p) => p.promo);
    CATS = (C.princ && promo.length ? [{ id: '_of', nome: 'Ofertas', itens: promo }] : [])
      .concat(M.categorias.map((c) => ({ id: c.id, nome: c.nome, itens: ORDEM.filter((p) => p.cat === c.id) })).filter((c) => c.itens.length));
    const soltos = ORDEM.filter((p) => !temCat(p.cat));
    if (soltos.length) CATS.push({ id: '_out', nome: CATS.length ? 'Outros' : (M.catNome || 'Cardápio'), itens: soltos });
  }
  // banner: os produtos escolhidos no painel; sem escolha, os que estão em promoção
  const calcOfs = () => (C.ofs.length ? C.ofs.map((id) => PRODS[id]).filter(Boolean) : ORDEM.filter((p) => p.promo).slice(0, 6));
  let OFS = calcOfs();

  const E = { cat: 0, carrinho: [], modo: '', pagar: '', aberto: null, ocupado: false };
  const qtdDe = (pid) => E.carrinho.filter((l) => l.pid === pid).reduce((s, l) => s + l.qtd, 0);
  const total = () => E.carrinho.reduce((s, l) => s + M.precoLinha(l), 0);
  const fotoOuEmoji = (p, cls) => p.foto ? `<img class="${cls || ''}" src="${esc(p.foto)}" alt="" loading="lazy">` : `<span class="sem-foto ${cls || ''}">${p.emoji}</span>`;
  const precoTxt = (p) => p.apartir ? (p.preco > 0 ? `<small>a partir de</small>${R$(p.preco)}` : '<small>Escolha as opções</small>') : R$(p.preco) + (p.de ? `<s>${R$(p.de)}</s>` : '');

  // ----- banner de ofertas: um produto fica parado, vários viram carrossel -----
  let OI = 0;
  const ofertaAtual = () => OFS[OI % OFS.length];
  function desenhaOfertas(anima) {
    const p = OFS.length ? ofertaAtual() : null;
    [['#capa', C.capa], ['#banner', C.topo]].forEach(([s, ligado]) => {
      const el = $(s); el.classList.toggle('some-de-vez', !ligado || !p); if (!p) return;
      el.innerHTML = `${fotoOuEmoji(p)}<div class="t"><small>${esc(rotulo())}</small><b>${esc(p.nome)}</b></div><em>${p.preco > 0 ? R$(p.preco) : 'Ver'}</em>` +
        (OFS.length > 1 ? `<span class="pts">${OFS.map((x, k) => `<i class="${k === OI % OFS.length ? 'on' : ''}"></i>`).join('')}</span>` : '');
      el.classList.remove('troca'); if (anima) { void el.offsetWidth; el.classList.add('troca'); }
    });
  }
  let tTroca = null;
  function ligaTroca() { clearInterval(tTroca); OI = 0; if (OFS.length > 1) tTroca = setInterval(() => { OI++; desenhaOfertas(true); }, Math.max(2, C.troca || 5) * 1000); }
  ligaTroca();

  // ----- vídeo de fundo da tela de entrada -----
  // Enviado pelo dono nas configurações. Roda sem som e em repetição atrás da entrada, com um véu escuro por cima
  // para a frase continuar legível (texto branco). Fica pausado enquanto o cliente está no cardápio.
  (function () {
    const st = document.createElement('style');
    st.textContent = `
      /* z-index negativo: o vídeo e o véu ficam atrás de tudo o que já existe na entrada, sem mexer na posição de nada */
      #inicio-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -1; background: #111; }
      #inicio.com-video::after { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(rgba(0, 0, 0, .52), rgba(0, 0, 0, .34) 45%, rgba(0, 0, 0, .62)); pointer-events: none; }
      #inicio.com-video > .loja-logo { color: #fff; }
      #inicio.com-video > .loja-logo img { background: #fff; border-radius: 36px; padding: 16px 30px; box-sizing: content-box; } /* a logo ganha uma placa branca para aparecer sobre o vídeo */
      #inicio.com-video > .loja-logo img.clara { filter: none; background: none; padding: 0; } /* logo branca: aparece direto sobre o vídeo escurecido */
      #inicio.com-video h1 { color: #fff; text-shadow: 0 4px 30px rgba(0, 0, 0, .45); }
      #inicio.com-video .sub { color: #fff; opacity: .92; }
      #inicio.com-video .aviso { color: #fff; opacity: .85; }
      #inicio.com-video .escolha button:not(.unico), #inicio.com-video #capa { border-color: transparent; }`;
    document.head.appendChild(st);
  })();
  let videoRuim = '';
  function fundoVideo() {
    const ini = $('#inicio'); let v = $('#inicio-video');
    const url = C.video && M.cli ? `${M.api}/food/video/${encodeURIComponent(M.cli)}/${encodeURIComponent(C.video)}` : '';
    if (!url || url === videoRuim) { if (v) v.remove(); ini.classList.remove('com-video'); return; }
    if (!v) {
      v = document.createElement('video'); v.id = 'inicio-video';
      v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true'); v.preload = 'auto';
      // vídeo apagado ou que não carrega: volta ao fundo normal e não tenta de novo esse mesmo vídeo
      v.addEventListener('error', () => { videoRuim = v.getAttribute('src') || ''; v.remove(); ini.classList.remove('com-video'); });
      ini.prepend(v);
    }
    if (v.getAttribute('src') !== url) v.src = url;
    ini.classList.add('com-video');
    tocaFundo();
  }
  function tocaFundo() {
    const v = $('#inicio-video'); if (!v) return;
    if (totem.classList.contains('em-cardapio')) v.pause(); else v.play().catch(() => {});
  }

  // ----- desenho -----
  function desenhaFixos() {
    totem.classList.toggle('horiz', C.formato === 'h');
    fundoVideo();
    if (window.pintaLogoToque) window.pintaLogoToque(M.loja);
    $('#meio').className = C.cat === 'nao' ? 'cat-topo sem-cats' : 'cat-' + C.cat;
    desenhaOfertas();
    $('#inicio-visual').style.display = C.ajuda ? '' : 'none';
    $('#inicio-frase').textContent = frase();
    const ic = { aqui: '<circle cx="26" cy="24" r="13"/><circle cx="26" cy="24" r="6.5"/><path d="M6 8v12a3 3 0 0 0 6 0V8M9 8v32"/>', levar: '<path d="M10 16h28l-3 26H13Z"/><path d="M17 16c0-6 3-10 7-10s7 4 7 10"/>' };
    const doisModos = !MESA && C.modo === 'ambos';
    $('#inicio-escolha').innerHTML = doisModos
      ? ['aqui', 'levar'].map((m) => `<button type="button" data-modo="${m}"><svg viewBox="0 0 48 48" fill="none" stroke="#FF5A00" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${ic[m]}</svg>${nomeModo(m)}</button>`).join('')
      : `<button type="button" class="unico" data-modo="${MESA ? 'mesa' : C.modo}">Toque para começar</button>`;
    const bm = $('#btn-modo');
    bm.style.display = (doisModos || MESA) ? '' : 'none';
    bm.textContent = MESA ? 'Mesa ' + MESA : nomeModo(E.modo || 'aqui'); bm.disabled = !!MESA;
    $('#ajuda-btn').style.display = C.ajuda ? '' : 'none';
    $('#inicio-aviso').textContent = ENVIA ? '' : EDITANDO ? 'Configurando: os pedidos feitos aqui não são enviados para a loja.' : 'Modo teste: os pedidos não são enviados para a loja.';
  }
  function desenhaCats() {
    $('#cats').innerHTML = CATS.map((c, k) => `<button type="button" data-cat="${k}" class="${k === E.cat ? 'on' : ''}">${fotoOuEmoji(c.itens.find((p) => p.foto) || c.itens[0])}${esc(c.nome)}</button>`).join('');
    setas();
  }
  function setas() {
    const c = $('#cats'), w = $('#cats-wrap');
    w.classList.toggle('mais-baixo', c.scrollTop + c.clientHeight < c.scrollHeight - 30);
    w.classList.toggle('mais-cima', c.scrollTop > 30);
  }
  function cartao(p) {
    const q = qtdDe(p.pid);
    return `<div class="prod ${q ? 'tem' : ''}" data-prod="${esc(p.pid)}">${fotoOuEmoji(p)}${p.video ? '<span class="tem-video"><svg viewBox="0 0 24 24" fill="#fff"><path d="M7 4.5v15l12-7.5Z"/></svg>Vídeo</span>' : ''}<div class="txt"><b class="nome">${esc(p.nome)}</b><p>${esc(p.desc)}</p>
      <span class="preco">${precoTxt(p)}</span><div class="pe">${q
        ? `<span class="qt"><button type="button" data-menos="${esc(p.pid)}" aria-label="Tirar um ${esc(p.nome)}">−</button><b>${q}</b><button type="button" data-mais="${esc(p.pid)}" aria-label="Mais um ${esc(p.nome)}">+</button></span>`
        : `<button type="button" class="mais" data-mais="${esc(p.pid)}" aria-label="Adicionar ${esc(p.nome)}"><i>+</i>Adicionar</button>`}</div></div></div>`;
  }
  function desenhaGrade() {
    if (!CATS.length) { $('#cat-titulo').textContent = 'Cardápio vazio'; $('#grade').innerHTML = ''; return; }
    const semCats = C.cat === 'nao', c = CATS[E.cat] || CATS[0];
    $('#cat-titulo').textContent = c.nome; $('#cat-titulo').style.display = semCats ? 'none' : '';
    $('#grade').innerHTML = semCats ? CATS.map((x) => `<h2 class="sec">${esc(x.nome)}</h2>` + x.itens.map(cartao).join('')).join('') : c.itens.map(cartao).join('');
  }
  function desenhaBarra() {
    const n = E.carrinho.reduce((s, l) => s + l.qtd, 0);
    $('#sacola-n').textContent = n; $('#sacola-n').style.display = n ? '' : 'none';
    $('#sacola-txt').textContent = n ? n + (n > 1 ? ' itens na sacola' : ' item na sacola') : 'Sua sacola está vazia';
    $('#sacola-total').textContent = R$(total());
    $('#barra-itens').innerHTML = E.carrinho.map((l) => `<div>${l.qtd}× ${esc(PRODS[l.pid].nome)}<span>${R$(M.precoLinha(l))}</span></div>`).join('');
    $('#btn-ver').disabled = !n;
  }
  function tudo() { montaCats(); if (E.cat >= CATS.length) E.cat = 0; desenhaFixos(); desenhaCats(); desenhaGrade(); desenhaBarra(); encaixa(); setas(); }

  // ----- sacola -----
  function poe(pid, id, q, sab, adds) {
    sab = sab || []; adds = adds || [];
    const chave = JSON.stringify([id, sab, adds]);
    const igual = E.carrinho.find((l) => l.chave === chave);
    if (igual) igual.qtd += q; else E.carrinho.push({ chave, pid, id, qtd: q, sab, adds, obs: '' });
    desenhaGrade(); desenhaBarra();
  }
  function tira(pid) {
    for (let k = E.carrinho.length - 1; k >= 0; k--) if (E.carrinho[k].pid === pid) { if (--E.carrinho[k].qtd < 1) E.carrinho.splice(k, 1); break; }
    desenhaGrade(); desenhaBarra();
  }
  function pulaSacola() { const sc = $('#sacola'); sc.classList.remove('pulo'); void sc.offsetWidth; sc.classList.add('pulo'); }
  // o produto "cai" na sacola
  function voa(origem, foto) {
    if (!origem || !foto) { pulaSacola(); return; }
    const tr = totem.getBoundingClientRect(), s = tr.width / totem.offsetWidth, a = origem.getBoundingClientRect(), b = $('#sacola').getBoundingClientRect();
    const c = document.createElement('img'); c.src = foto; c.className = 'voa'; c.alt = '';
    c.style.cssText = `left:${(a.left - tr.left) / s}px;top:${(a.top - tr.top) / s}px;width:${a.width / s}px;height:${a.height / s}px`;
    totem.appendChild(c); c.getBoundingClientRect();
    c.style.transform = `translate(${(b.left + b.width / 2 - a.left - a.width / 2) / s}px, ${(b.top + b.height / 2 - a.top - a.height / 2) / s}px) scale(.1)`; c.style.opacity = '.35';
    setTimeout(() => { c.remove(); pulaSacola(); }, 600);
  }
  function mais(pid, origem) {
    const p = PRODS[pid]; if (!p) return;
    if (!p.simples) return abreProd(pid);                                  // tem tamanho, sabor ou adicional: abre para escolher
    voa(origem || $(`.prod[data-prod="${CSS.escape(pid)}"] img`), p.foto); // sem opções: vai direto para a sacola
    poe(pid, p.vars[0].id, 1);
  }

  // ----- folhas -----
  const FOLHAS = ['#f-prod', '#f-ped', '#f-fim', '#f-ajuda', '#f-pix'];
  function abre(id) {
    FOLHAS.forEach((f) => $(f).classList.toggle('some', f !== id)); $('#veu').classList.toggle('some', !id);
    if (id !== '#f-prod') $('#fp-vid').pause();
    if (id !== '#f-pix') pararPix();
  }

  // produto: tamanho, sabores (pizza: até o máximo do tamanho), borda e adicionais
  function abreProd(pid) {
    const p = PRODS[pid]; if (!p) return;
    E.aberto = { p, v: p.vars[0], q: 1, sab: [], adds: [] };
    const im = $('#fp-img'), vd = $('#fp-vid'), sf = $('#fp-sem');
    im.style.display = (!p.video && p.foto) ? '' : 'none'; vd.style.display = p.video ? '' : 'none'; sf.style.display = (!p.video && !p.foto) ? '' : 'none';
    sf.textContent = p.emoji;
    if (p.foto) im.src = p.foto;
    if (p.video) { vd.poster = p.foto || ''; if (vd.getAttribute('src') !== p.video) vd.src = p.video; try { vd.currentTime = 0; } catch (e) { /* ainda carregando */ } vd.play().catch(() => {}); }
    $('#fp-nome').textContent = p.nome; $('#fp-desc').textContent = p.desc;
    desenhaOpcs(); abre('#f-prod'); $('#f-prod .corpo').scrollTop = 0;
  }
  function opc(tipo, k, nome, direita, on, sub) {
    return `<button type="button" class="opc ${on ? 'on' : ''}" data-o="${tipo}" data-k="${k}"><i>✓</i><span class="on-n">${esc(nome)}${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="on-d">${direita}</span></button>`;
  }
  function desenhaOpcs() {
    const a = E.aberto, v = a.v; let h = '';
    if (a.p.vars.length > 1) h += '<h3>Tamanho</h3>' + a.p.vars.map((x, k) => opc('tam', k, x.tam || x.nome, x.preco > 0 ? R$(x.preco) : '', x === v)).join('');
    if (v.sabores.length) {
      h += `<h3>${v.maxSabores > 1 ? 'Sabores (escolha até ' + v.maxSabores + ')' : 'Sabor'}</h3>` + v.sabores.map((s, k) => {
        const pr = s.precos && s.precos[v.tamId || '_'];
        return opc('sab', k, s.nome, pr > 0 ? R$(pr) : '', a.sab.includes(s.nome), s.desc);
      }).join('');
    }
    if (v.bordas.length) h += '<h3>Borda</h3>' + v.bordas.map((b, k) => opc('bor', k, b.nome, b.preco ? '+ ' + R$(b.preco) : 'sem custo', a.adds.includes(b.nome))).join('');
    if (v.adicionais.length) h += '<h3>Quer mudar alguma coisa?</h3>' + v.adicionais.map((x, k) => opc('add', k, x.nome, x.preco ? '+ ' + R$(x.preco) : 'sem custo', a.adds.includes(x.nome))).join('');
    $('#fp-opcs').innerHTML = h;
    atualizaProd();
  }
  function atualizaProd() {
    const a = E.aberto, falta = a.v.sabores.length && !a.sab.length;
    $('#fp-qtd').textContent = a.q;
    $('#fp-total').textContent = falta ? '' : R$(M.precoUnit(a.v, a.sab, a.adds) * a.q);
    $('#fp-rot').textContent = falta ? 'Escolha o sabor' : 'Adicionar';
    $('#fp-add').disabled = !!falta;
  }
  function tocaOpc(tipo, k) {
    const a = E.aberto, v = a.v;
    const alterna = (lista, nome) => { const i = lista.indexOf(nome); if (i >= 0) lista.splice(i, 1); else lista.push(nome); };
    if (tipo === 'tam') {
      a.v = a.p.vars[k];
      a.sab = a.sab.filter((n) => a.v.sabores.some((s) => s.nome === n)).slice(0, Math.max(1, a.v.maxSabores));
      a.adds = a.adds.filter((n) => a.v.bordas.concat(a.v.adicionais).some((x) => x.nome === n));
    } else if (tipo === 'sab') {
      const nome = v.sabores[k].nome, max = Math.max(1, v.maxSabores);
      if (a.sab.includes(nome)) alterna(a.sab, nome); else if (max === 1) a.sab = [nome]; else if (a.sab.length < max) a.sab.push(nome);
    } else if (tipo === 'bor') {
      const nome = v.bordas[k].nome, tinha = a.adds.includes(nome);
      a.adds = a.adds.filter((n) => !v.bordas.some((b) => b.nome === n)); if (!tinha) a.adds.push(nome); // só uma borda
    } else if (tipo === 'add') alterna(a.adds, v.adicionais[k].nome);
    const rol = $('#f-prod .corpo').scrollTop; desenhaOpcs(); $('#f-prod .corpo').scrollTop = rol;
  }

  // pedido: lista de itens (rola), pagamento e confirmar (fixos)
  function descLinha(l) {
    const it = M.itens.find((x) => x.id === l.id), n = l.sab.length;
    return [it && it.tam].concat(l.sab.map((s) => (n > 1 ? '1/' + n + ' ' : '') + s), l.adds).filter(Boolean).join(', ');
  }
  const PGS = {
    caixa: ['No caixa', '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.8"/><path d="M6 9.5v5M18 9.5v5"/>'],
    pix: ['Pix', '<path d="M12 2.8 21.2 12 12 21.2 2.8 12Z"/><path d="M7.5 7.5 12 12l4.5-4.5M7.5 16.5 12 12l4.5 4.5"/>'],
    // crédito e débito: pagos na maquininha do totem (ela não é ligada ao sistema; o pedido entra com a forma anotada)
    credito: ['Crédito', '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M6.5 15h4"/>'],
    debito: ['Débito', '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M14 15h4"/>'],
  };
  const ehCartao = (f) => f === 'credito' || f === 'debito';
  const cobraNaTela = () => !MESA && C.cobrar === 'totem';
  function abrePedido() {
    if (cobraNaTela()) { if (C.pg.length === 1) E.pagar = C.pg[0]; if (!C.pg.includes(E.pagar)) E.pagar = ''; }
    const rol = $('#f-ped .corpo').scrollTop;
    $('#ped-itens').innerHTML = E.carrinho.map((l, k) => { const p = PRODS[l.pid], d = descLinha(l); return `<div class="item">${fotoOuEmoji(p)}<div><b class="n">${esc(p.nome)}</b>${d ? `<small>${esc(d)}</small>` : ''}<em>${R$(M.precoLinha(l))}</em></div>
      <span class="qt"><button type="button" data-it="${k}" data-d="-1" aria-label="Tirar um">−</button><b>${l.qtd}</b><button type="button" data-it="${k}" data-d="1" aria-label="Mais um">+</button></span>
      <button type="button" class="tirar" data-rm="${k}" aria-label="Remover ${esc(p.nome)} do pedido">✕</button></div>`; }).join('');
    $('#ped-pg-tit').style.display = $('#ped-pagar').style.display = cobraNaTela() ? '' : 'none';
    $('#ped-pagar').innerHTML = C.pg.map((p) => `<button type="button" data-p="${p}" class="${p === E.pagar ? 'on' : ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${PGS[p][1]}</svg>${PGS[p][0]}</button>`).join('');
    $('#ped-rot').textContent = cobraNaTela() ? (E.pagar === 'pix' ? 'Pagar com Pix' : 'Confirmar pedido') : 'Enviar pedido';
    $('#ped-total').textContent = R$(total());
    $('#ped-confirmar').classList.toggle('espera', cobraNaTela() && !E.pagar);
    $('#ped-confirmar').disabled = false; $('#ped-erro').textContent = '';
    abre('#f-ped'); $('#f-ped .corpo').scrollTop = rol;
  }

  async function confirma() {
    if (E.ocupado) return;
    if (cobraNaTela() && !E.pagar) { const pg = $('#ped-pagar'); pg.classList.remove('chama'); void pg.offsetWidth; pg.classList.add('chama'); return; }
    const forma = MESA ? 'mesa' : (cobraNaTela() ? E.pagar : 'caixa');
    const bt = $('#ped-confirmar'), rot = $('#ped-rot'), rotAntes = rot.textContent;
    E.ocupado = true; bt.disabled = true; rot.textContent = 'Enviando…'; $('#ped-erro').textContent = '';
    try {
      if (!ENVIA) { await espera(700); return fim({ num: 0, teste: true }, forma === 'pix' ? 'pix' : forma); }
      const onde = E.modo === 'levar' ? ' Para levar.' : E.modo === 'aqui' ? ' Consumir no local.' : '';
      const op = MESA ? { modo: 'mesa', mesa: MESA, pagto: 'conta', obs: 'Pedido feito no tablet da mesa.' }
        : forma === 'pix' ? { modo: 'retirada', pagto: 'pix', obs: 'Totem de toque.' + onde }
        : ehCartao(forma) ? { modo: 'retirada', pagto: 'maquina', maqTipo: forma, obs: 'Totem de toque.' + onde + ' Pagar na maquininha do totem.' }
        : { modo: 'retirada', pagto: 'dinheiro', obs: 'Totem de toque.' + onde + ' Pagar no caixa.' };
      const r = await M.enviarPedido(E.carrinho.map((l) => ({ id: l.id, qtd: l.qtd, sab: l.sab, adds: l.adds, obs: '' })), op);
      if (!r.ok) throw new Error(r.mensagem || 'Não consegui enviar o pedido.');
      if (forma === 'pix') return abrePix(r);
      fim(r, forma);
    } catch (e) {
      $('#ped-erro').textContent = String((e && e.message) || e); bt.disabled = false; rot.textContent = rotAntes;
    } finally { E.ocupado = false; }
  }

  // Pix na tela: mostra o QR Code e pergunta ao servidor a cada 3 s se o pagamento caiu (desiste em 6 min)
  let tPix = null;
  function pararPix() { clearInterval(tPix); tPix = null; }
  function abrePix(r) {
    const qr = $('#pix-qr');
    qr.src = r.pixQr ? (/^data:/.test(r.pixQr) ? r.pixQr : 'data:image/png;base64,' + r.pixQr) : '';
    qr.style.display = r.pixQr ? '' : 'none';
    $('#pix-total').textContent = R$(r.total || total());
    $('#pix-estado').textContent = 'Aguardando o pagamento…';
    abre('#f-pix');
    const t0 = Date.now();
    tPix = setInterval(async () => {
      if (Date.now() - t0 > 6 * 60000) { pararPix(); abrePedido(); $('#ped-erro').textContent = 'O tempo do Pix acabou. Tente de novo.'; return; }
      try {
        const c = await M.consultarPedido(r.id);
        if (!c.ok || /^aguardando/.test(c.status)) return;
        pararPix();
        if (c.status === 'expirado' || c.status === 'cancelado') { abrePedido(); $('#ped-erro').textContent = 'O Pix não foi pago a tempo. Tente de novo.'; return; }
        fim(r, 'pix');
      } catch (e) { /* rede oscilou: tenta de novo na próxima volta */ }
    }, 3000);
  }

  let tFim = null;
  function fim(r, forma) {
    // comemoração do cardápio e do atendimento: o Live animado, confete e o número do pedido bem grande (site/js/live-app.js)
    if (window.LiveApp && window.LiveMascote) {
      const valor = R$(r.total || total());
      abre(null);
      window.LiveApp.comemorar({
        titulo: r.teste ? 'Modo teste: este pedido não foi enviado' : forma === 'mesa' ? 'Pedido enviado! Número' : 'Pedido confirmado! Sua senha é',
        valor: r.teste ? 'teste' : String(r.num),
        forma: forma === 'mesa' ? 'Mesa ' + MESA : forma === 'pix' ? 'Pix confirmado' : ehCartao(forma) ? `Pague ${valor} no ${forma === 'debito' ? 'débito' : 'crédito'}, na maquininha` : `Pague ${valor} no caixa`,
        sub: forma === 'mesa' ? 'Já foi para a cozinha e o bar. Levamos até a sua mesa.' : E.modo === 'levar' ? 'Retire no balcão quando chamarem a senha.' : 'Aguarde a senha ser chamada e retire no balcão.',
        botao: { texto: 'Fazer outro pedido', acao: recomeca },
      });
      // ninguém tocou em 25 s: fecha sozinho e volta para a entrada
      clearTimeout(tFim); tFim = setTimeout(() => { const b = document.querySelector('.lfc .lfc-bt'); if (b) b.click(); else recomeca(); }, 25000);
      return;
    }
    const ic = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="#1C1C1E" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
    const iPag = ic('<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.8"/><path d="M6 9.5v5M18 9.5v5"/>'), iOk = ic('<path d="M5 12.5 10 17.5 19 7"/>'), iLocal = ic('<path d="M12 21s7-5.5 7-11a7 7 0 0 0-14 0c0 5.5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>');
    $('#fim-num').textContent = r.teste ? 'teste' : r.num;
    $('#fim-num').classList.toggle('pequeno', !!r.teste);
    $('#fim-tit').textContent = r.teste ? 'Modo teste: este pedido não foi enviado' : (forma === 'mesa' ? 'Pedido enviado. Número' : 'Pedido confirmado. Sua senha é');
    const passos = forma === 'mesa' ? [iOk + 'Seu pedido já foi para a cozinha e o bar.', iLocal + `Levamos até a mesa ${esc(MESA)}. O valor entra na conta da mesa.`]
      : [forma === 'pix' ? iOk + 'Pagamento por Pix confirmado.'
        : ehCartao(forma) ? iPag + `Pague ${R$(r.total || total())} no ${forma === 'debito' ? 'débito' : 'crédito'}, na maquininha do totem.`
        : iPag + `Pague ${R$(r.total || total())} no caixa e informe a sua senha.`,
        iLocal + (E.modo === 'levar' ? 'Retire no balcão quando chamarem a senha.' : 'Aguarde a senha ser chamada e retire no balcão.')];
    $('#fim-passos').innerHTML = passos.map((x) => `<div>${x}</div>`).join('');
    abre('#f-fim');
    clearTimeout(tFim); tFim = setTimeout(recomeca, 25000); // volta sozinho para a entrada
  }

  // ----- ajuda com opções prontas (sem voz: funciona em totem sem alto-falante) -----
  function ajudaOps() {
    const pagar = MESA ? 'O valor entra na conta da mesa. Você paga quando fechar a conta.'
      : !cobraNaTela() ? 'O pagamento é feito no caixa, informando a senha do pedido.'
      : 'Aqui no totem você escolhe: ' + C.pg.map((p) => ({ pix: 'Pix, lendo o QR Code na tela', credito: 'crédito na maquininha', debito: 'débito na maquininha', caixa: 'pagar no caixa' }[p])).join(', ').replace(/, ([^,]*)$/, ' ou $1') + '.';
    return [
      ['Como faço meu pedido?', 'Escolha a categoria, toque em Adicionar em cada produto e depois em “Ver pedido”.'],
      ['Como posso pagar?', pagar],
      [MESA ? 'Como recebo meu pedido?' : 'Onde retiro meu pedido?', MESA ? 'Levamos o pedido até a sua mesa assim que ficar pronto.' : 'No fim o totem mostra a sua senha. Retire no balcão quando ela for chamada.'],
      ['Posso mudar meu pedido?', 'Sim. Em “Ver pedido” você muda a quantidade ou remove itens antes de confirmar.'],
    ];
  }
  function abreAjuda() {
    const r = $('#ajuda-resp'); r.textContent = 'Toque em uma das opções abaixo.'; r.className = 'vazio';
    $('#ajuda-ops').innerHTML = ajudaOps().map((o, k) => `<button type="button" data-aj="${k}">${esc(o[0])}</button>`).join('');
    abre('#f-ajuda');
  }

  // ----- tela cheia -----
  // O navegador só deixa entrar em tela cheia a partir de um toque, então ela entra no toque que começa o pedido
  // (e volta a entrar no pedido seguinte, se alguém tiver saído com Esc). Junto, pede para a tela não apagar.
  // Não vale com as configurações do dono abertas nem dentro da janela do painel.
  let acesa = null;
  async function manterAcesa() {
    try { if ('wakeLock' in navigator && !acesa) { acesa = await navigator.wakeLock.request('screen'); acesa.addEventListener('release', () => { acesa = null; }); } } catch (e) { /* o aparelho não deixa: segue sem */ }
  }
  function telaCheia() {
    if (EDITANDO || window.top !== window.self) return;
    const d = document.documentElement;
    try { if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); } catch (e) { /* sem suporte (iPhone): segue normal */ }
    manterAcesa();
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && document.fullscreenElement) manterAcesa(); });

  // ----- toques -----
  totem.addEventListener('click', (ev) => {
    const b = ev.target.closest('button'), d = b ? b.dataset : {};
    if (!b) {
      if (ev.target.id === 'veu' && $('#f-pix').classList.contains('some') && $('#f-fim').classList.contains('some')) abre(null);
      const card = ev.target.closest('.prod');
      if (card) { const p = PRODS[card.dataset.prod]; if (p && p.video) abreProd(p.pid); else mais(card.dataset.prod); } // com vídeo, tocar na foto abre para mostrar
      return;
    }
    if (d.modo) { telaCheia(); E.modo = d.modo === 'mesa' ? '' : d.modo; desenhaFixos(); totem.classList.add('em-cardapio'); tocaFundo(); window.Totem.estado.modo = 'conversa'; setas(); if (M.prepararEnvio && ENVIA) M.prepararEnvio(); }
    else if (d.cat !== undefined) { E.cat = +d.cat; desenhaCats(); desenhaGrade(); $('#lista').scrollTop = 0; }
    else if (d.rola) $('#cats').scrollBy({ top: +d.rola * 420, behavior: 'smooth' });
    else if (d.mais) mais(d.mais);
    else if (d.menos) tira(d.menos);
    else if (b.id === 'banner') { const p = ofertaAtual(); if (p) mais(p.pid, b.querySelector('img')); }
    else if (d.o) tocaOpc(d.o, +d.k);
    else if (b.id === 'fp-menos') { E.aberto.q = Math.max(1, E.aberto.q - 1); atualizaProd(); }
    else if (b.id === 'fp-mais') { E.aberto.q++; atualizaProd(); }
    else if (b.id === 'fp-add') { const a = E.aberto; voa(a.p.video ? $('#fp-vid') : $('#fp-img'), a.p.foto); poe(a.p.pid, a.v.id, a.q, a.sab.slice(), a.adds.slice()); abre(null); }
    else if (b.id === 'btn-ver') abrePedido();
    else if (d.it !== undefined || d.rm !== undefined) {
      const k = +(d.rm !== undefined ? d.rm : d.it), l = E.carrinho[k]; if (!l) return;
      if (d.rm !== undefined) l.qtd = 0; else l.qtd += +d.d;
      if (l.qtd < 1) E.carrinho.splice(k, 1);
      desenhaGrade(); desenhaBarra(); if (E.carrinho.length) abrePedido(); else abre(null);
    }
    else if (d.p) { E.pagar = d.p; abrePedido(); }
    else if (b.id === 'ped-confirmar') confirma();
    else if (b.id === 'pix-cancelar') { pararPix(); abrePedido(); }
    else if (b.id === 'fim-novo' || b.id === 'btn-recomecar') recomeca();
    else if (b.id === 'btn-modo') { E.modo = E.modo === 'aqui' ? 'levar' : 'aqui'; b.textContent = nomeModo(E.modo); }
    else if (d.fecha !== undefined) abre(null);
    else if (b.id === 'ajuda-btn') abreAjuda();
    else if (d.aj !== undefined) { const r = $('#ajuda-resp'); r.textContent = ajudaOps()[+d.aj][1]; r.className = ''; $$('#ajuda-ops button').forEach((x) => x.classList.toggle('on', x === b)); }
  });
  $('#cats').addEventListener('scroll', setas);
  // foto que não carregou (apagada no painel, rede): entra o desenho no lugar, sem deixar o quadro quebrado
  totem.addEventListener('error', (ev) => {
    const im = ev.target;
    if (!im || im.tagName !== 'IMG' || im.id === 'pix-qr' || im.closest('.loja-logo') || im.closest('#assinatura') || im.classList.contains('voa')) return;
    if (im.id === 'fp-img') { im.style.display = 'none'; const sf = $('#fp-sem'); sf.style.display = ''; return; }
    const sp = document.createElement('span'); sp.className = 'sem-foto'; sp.textContent = '🍽️'; im.replaceWith(sp);
  }, true);
  function recomeca() {
    clearTimeout(tFim); E.carrinho = []; E.pagar = ''; E.cat = 0; E.modo = ''; abre(null); tudo();
    totem.classList.remove('em-cardapio'); window.Totem.estado.modo = 'standby';
    tocaFundo();
  }

  // totem parado por 2 minutos no meio de um pedido: volta para a entrada (o próximo cliente não herda a sacola de ninguém)
  let tParado = null;
  function mexeu() {
    clearTimeout(tParado);
    tParado = setTimeout(() => { if (totem.classList.contains('em-cardapio') && $('#f-pix').classList.contains('some') && !E.ocupado) recomeca(); else mexeu(); }, 120000);
  }
  ['pointerdown', 'keydown', 'scroll'].forEach((ev) => addEventListener(ev, mexeu, true));

  // ----- painel de configurações do dono (js/toque-config.js) -----
  // Com o dono logado no painel neste navegador, as configurações aparecem à esquerda do totem e cada mudança
  // redesenha a tela na hora. Enquanto o painel está aberto o totem não envia pedidos. Cliente nunca vê: sem login, nada carrega.
  const enviaNormal = ENVIA;
  window.ToqueCfg = {
    atual: () => JSON.parse(JSON.stringify(C)),
    produtos: () => ORDEM.map((p) => ({ id: p.pid, nome: p.nome, promo: !!p.promo })),
    editar(ligado) { EDITANDO = !!ligado; ENVIA = EDITANDO ? false : enviaNormal; tudo(); },
    aplica(cfg) {
      Object.assign(C, cfg); arrumaCfg();
      OFS = calcOfs(); ligaTroca();
      const noPedido = !$('#f-ped').classList.contains('some');
      tudo();
      if (noPedido && E.carrinho.length) abrePedido();
    },
  };
  let jwt = ''; try { jwt = localStorage.getItem('dd_jwt') || ''; } catch (e) { /* sem armazenamento */ }
  let oculto = false; try { oculto = localStorage.getItem('toque-sem-config') === '1'; } catch (e) { /* ok */ }
  const pediu = Q.get('config') === '1';
  if (jwt && M.cli && !MESA && (pediu || (!oculto && innerWidth >= 900))) {
    const sc = document.createElement('script'); sc.src = 'js/toque-config.js?v=' + Date.now(); document.body.appendChild(sc);
  }

  tudo(); mexeu();
  totem.classList.add('pronto');
})();
