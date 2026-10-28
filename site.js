/* LiveFood · site institucional: navegação, efeitos, demonstrações e o Live conduzindo a experiência. */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const { criar, espera, sorteio } = window.LiveMascote;
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ponteiroFino = matchMedia('(pointer: fine)').matches;
  const PARE = Symbol('pare');
  const raiz = document.documentElement;

  // ---------------------------------------------------------------------------
  // Conteúdo das soluções (ecossistema + gaveta de detalhes). Só recursos que o produto já tem.
  // ---------------------------------------------------------------------------
  const SOLUCOES = [
    { id: 'delivery', icone: '🛵', nome: 'Sistema de Delivery', img: 'site/img/pizza.jpg',
      resumo: 'Cardápio online com entrega e retirada, painel de pedidos e app do motoboy.',
      texto: 'O cliente pede pelo cardápio online do seu restaurante. O pedido cai no painel, segue para o preparo e o motoboy recebe a entrega no app dele.',
      passos: [['Pedido online', 'Entrega ou retirada, com endereços salvos e localização atual.'], ['Painel único', 'Todos os pedidos chegam no mesmo painel, com status.'], ['Frete por região', 'Você define o frete de cada região de entrega.'], ['App do motoboy', 'O entregador acompanha as entregas pelo celular.'], ['Pix automático', 'Pagamento por Pix e financeiro no mesmo lugar.']] },
    { id: 'comanda', icone: '📋', nome: 'Comanda Digital', img: 'site/img/batata.jpg',
      resumo: 'Garçom com o mapa do salão no celular e pedidos direto na tela da cozinha.',
      texto: 'O garçom escolhe a mesa no mapa do salão, lança os itens com observações e envia. A cozinha recebe na tela dela, sem papel.',
      passos: [['Mapa do salão', 'Você desenha as mesas e o balcão como no seu salão.'], ['Comandas abertas', 'Cada mesa com sua comanda, itens e observações.'], ['Tela da cozinha', 'Os pedidos aparecem na hora para a equipe da cozinha.'], ['Fila e balcão de saída', 'Pedidos prontos avisam quem leva à mesa.'], ['Fechar conta', 'Fecha a conta e gera a cobrança, inclusive pelo WhatsApp.']] },
    { id: 'app', icone: '📱', nome: 'App do Restaurante', img: 'site/img/acai.jpg',
      resumo: 'Link próprio do seu cardápio, que o cliente instala no celular.',
      texto: 'Cada restaurante tem o seu link, com logo e cor da marca. O cliente pede da mesa, para entrega ou retirada, e paga por Pix.',
      passos: [['Seu link', 'Cardápio com a sua marca, que pode ser instalado no celular.'], ['Mesa com NFC ou QR', 'Etiquetas por mesa levam o cliente direto ao cardápio.'], ['Entrar pelo WhatsApp', 'O cliente recebe um código no WhatsApp para entrar.'], ['Chamar o garçom', 'E fechar a conta pelo celular.'], ['Pix na hora', 'Código Pix gerado com a conta Asaas do restaurante.']] },
    { id: 'autoatendimento', icone: '🤖', nome: 'Autoatendimento', img: 'site/img/burger.jpg',
      resumo: 'O Live atende no totem por voz, sugere itens e envia o pedido ao painel.',
      texto: 'No totem, o cliente conversa com o Live. Ele usa o cardápio e as orientações da sua loja, monta o pedido na tela e envia para o painel como retirada no balcão.',
      passos: [['Conversa por voz', 'O cliente fala e o Live responde, com legenda na tela.'], ['Cardápio da loja', 'Tamanhos, sabores, adicionais e promoções do seu cadastro.'], ['Treinamento', 'Você escreve as orientações e o Live segue o jeito da casa.'], ['Idiomas', 'O cliente pode escolher outro idioma na tela.'], ['Pedido no painel', 'Entra como retirada no balcão, pago no caixa, com número real.']] },
    { id: 'atendimento', icone: '💬', nome: 'Atendimento Digital', img: 'site/img/shake.jpg',
      resumo: 'Chamados da mesa, fila da equipe e cobrança pelo WhatsApp.',
      texto: 'O cliente chama o garçom e pede a conta pelo celular. A equipe recebe na fila de atendimento e a cobrança pode seguir pelo WhatsApp.',
      passos: [['Chamar o garçom', 'Um toque no app da mesa e o chamado entra na fila.'], ['Fila de garçons', 'A equipe vê quem chamou e atende na ordem.'], ['Balcão de saída', 'Pedido pronto avisa quem vai levar à mesa.'], ['Conta pelo celular', 'O cliente vê os itens e paga com Pix.'], ['Cobrança no WhatsApp', 'A cobrança vai direto para o celular do cliente.']] },
  ];

  // ---------------------------------------------------------------------------
  // Balão de fala global (Live espião e hero)
  // ---------------------------------------------------------------------------
  const balaoEl = $('#balao');
  let balaoTimer = null;
  function balao(texto, rect, ms = 2200, lado = 'cima') {
    clearTimeout(balaoTimer);
    balaoEl.textContent = texto;
    balaoEl.classList.remove('visivel');
    const bw = balaoEl.offsetWidth, bh = balaoEl.offsetHeight;
    let x, y, origem;
    if (lado === 'direita') { x = rect.right + 8; y = rect.top + rect.height * 0.2 - bh / 2; origem = '0% 50%'; }
    else if (lado === 'esquerda') { x = rect.left - bw - 8; y = rect.top + rect.height * 0.2 - bh / 2; origem = '100% 50%'; }
    else { x = rect.left + rect.width / 2 - bw / 2; y = rect.top - bh - 6; origem = '50% 100%'; }
    x = Math.max(10, Math.min(innerWidth - bw - 10, x));
    y = Math.max(76, Math.min(innerHeight - bh - 10, y));
    balaoEl.style.setProperty('--bx', x + 'px');
    balaoEl.style.setProperty('--by', y + 'px');
    balaoEl.style.setProperty('--bo', origem);
    requestAnimationFrame(() => balaoEl.classList.add('visivel'));
    balaoTimer = setTimeout(() => balaoEl.classList.remove('visivel'), ms);
  }

  // ---------------------------------------------------------------------------
  // Confete de comida
  // ---------------------------------------------------------------------------
  function confete(x, y, n = 26) {
    if (reduzido) return;
    const itens = ['🍔', '🍕', '🍟', '🥤', '⭐', '🧡', '✨'];
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'confete';
      s.textContent = itens[i % itens.length];
      document.body.appendChild(s);
      const ang = sorteio(-Math.PI, 0), vel = sorteio(260, 620), dx = Math.cos(ang) * vel, dy = Math.sin(ang) * vel;
      s.animate([
        { transform: `translate(${x}px, ${y}px) rotate(0deg) scale(.4)`, opacity: 1 },
        { transform: `translate(${x + dx * 0.6}px, ${y + dy * 0.6}px) rotate(${sorteio(-200, 200)}deg) scale(1.1)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${x + dx}px, ${y + dy + 520}px) rotate(${sorteio(-400, 400)}deg) scale(.9)`, opacity: 0 },
      ], { duration: sorteio(1300, 1900), easing: 'cubic-bezier(.2,.6,.4,1)' }).onfinish = () => s.remove();
    }
  }
  window.LFConfete = confete;

  // ---------------------------------------------------------------------------
  // Abertura
  // ---------------------------------------------------------------------------
  const abertura = $('#abertura');
  const liveAbertura = criar($('#abertura-live'), { sombra: false, expressao: 'surpreso' });
  (async () => {
    if (!reduzido) {
      liveAbertura.P.y = 60; liveAbertura.P.sx = 0.6; liveAbertura.P.sy = 0.6;
      await liveAbertura.animar({ y: 0, sx: 1, sy: 1 }, 650, (p) => 1 + 2.70158 * Math.pow(p - 1, 3) + 1.70158 * Math.pow(p - 1, 2));
      liveAbertura.expressao('animado');
      await espera(250);
      await liveAbertura.gesto('piscadinha');
    }
    const carregou = document.readyState === 'complete' ? Promise.resolve() : new Promise((r) => addEventListener('load', r, { once: true }));
    await Promise.race([carregou, espera(1800)]);
    abertura.classList.add('saindo');
    document.body.classList.add('pronto');
    setTimeout(() => { liveAbertura.destruir(); abertura.remove(); }, 1100);
    iniciarHero();
  })();

  // ---------------------------------------------------------------------------
  // Hero: Live, parallax do mouse e brasas
  // ---------------------------------------------------------------------------
  const heroLiveEl = $('#hero-live');
  const heroLive = criar(heroLiveEl, { rotulo: 'Live, o mascote da LiveFood, dando oi' });
  heroLive.P.y = 120; heroLive.P.sx = 0.4; heroLive.P.sy = 0.4;
  async function iniciarHero() {
    await espera(reduzido ? 0 : 450);
    await heroLive.animar({ y: 0, sx: 1, sy: 1 }, 800, (p) => 1 + 2.70158 * Math.pow(p - 1, 3) + 1.70158 * Math.pow(p - 1, 2));
    await heroLive.gesto('boas_vindas');
    if (heroVisivel && scrollY < innerHeight * 0.5) {
      balao('Oi! Eu sou o Live 👋', heroLiveEl.querySelector('.live-corpo').getBoundingClientRect(), 2600);
      heroLive.falar('Oi! Eu sou o Live');
    }
    await espera(1200);
    heroLive.seguirMouse(true);
  }
  heroLiveEl.addEventListener('click', async () => {
    const frases = ['Bora vender mais? 🚀', 'Cliquei, pisquei 😉', 'Hehe, cócegas! 😄', 'Dá uma olhada nos planos!'];
    balao(frases[Math.floor(Math.random() * frases.length)], heroLiveEl.querySelector('.live-corpo').getBoundingClientRect(), 1800);
    await heroLive.gesto('comemorar');
  });
  $$('[data-live-pisca]').forEach((b) => b.addEventListener('pointerenter', () => heroLive.gesto('piscadinha')));

  const heroPalco = $('.hero-palco');
  const profundos = $$('[data-prof]');
  let mx = 0, my = 0, mxS = 0, myS = 0;
  if (ponteiroFino && !reduzido) {
    addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  }

  // brasas subindo no fundo do hero (pausa fora da tela)
  const brasas = $('#brasas');
  const bctx = brasas.getContext('2d');
  let heroVisivel = true, particulas = [];
  function tamanhoBrasas() {
    const dpr = Math.min(1.5, devicePixelRatio || 1);
    brasas.width = brasas.clientWidth * dpr; brasas.height = brasas.clientHeight * dpr;
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = innerWidth < 640 ? 22 : 48;
    particulas = Array.from({ length: n }, () => novaBrasa(true));
  }
  function novaBrasa(qualquer) {
    const w = brasas.clientWidth, h = brasas.clientHeight;
    return { x: sorteio(w * 0.25, w), y: qualquer ? sorteio(0, h) : h + 10, r: sorteio(0.6, 2.4), v: sorteio(0.25, 0.9), a: sorteio(0.2, 0.8), f: sorteio(0, 6) };
  }
  if (!reduzido) { tamanhoBrasas(); addEventListener('resize', tamanhoBrasas); }
  new IntersectionObserver((e) => { heroVisivel = e[0].isIntersecting; }).observe($('#inicio'));

  // ---------------------------------------------------------------------------
  // Topo: rolado, esconde ao descer, barra de progresso, seção ativa
  // ---------------------------------------------------------------------------
  const topo = $('#topo'), barra = $('#progresso i');
  let ultimoY = scrollY, navegando = false;
  const marcador = $('.menu-marcador');
  const menu = $('#menu');
  function marcarAtivo(nome) {
    const alvo = menu.querySelector(`[data-secao="${nome}"]`);
    $$('[data-secao]', menu).forEach((x) => x.classList.toggle('ativo', x === alvo));
    if (!alvo) { marcador.style.opacity = '0'; return; }
    const r = alvo.getBoundingClientRect(), rm = menu.getBoundingClientRect();
    marcador.style.opacity = '1';
    marcador.style.width = r.width + 'px';
    marcador.style.transform = `translateX(${r.left - rm.left}px)`;
  }
  const obsSecoes = new IntersectionObserver((ents) => {
    ents.forEach((e) => { if (e.isIntersecting) marcarAtivo(e.target.dataset.secaoNome); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('[data-secao-nome]').forEach((s) => obsSecoes.observe(s));

  // ---------------------------------------------------------------------------
  // Loop de rolagem / parallax (um rAF só)
  // ---------------------------------------------------------------------------
  const paralaxes = $$('[data-paralaxe]');
  const finais = $$('.final-comida');
  const manifesto = $('[data-palavras]');
  if (manifesto) manifesto.innerHTML = manifesto.textContent.trim().split(/\s+/).map((p) => `<span class="p">${p}</span>`).join(' ');
  const palavras = manifesto ? $$('.p', manifesto) : [];

  function quadro(t) {
    const y = scrollY, alt = innerHeight;
    // topo
    topo.classList.toggle('rolado', y > 30);
    if (!navegando && !document.body.classList.contains('travado')) topo.classList.toggle('escondido', y > ultimoY + 4 && y > 500);
    if (y < ultimoY - 4) topo.classList.remove('escondido');
    ultimoY = y;
    barra.style.transform = `scaleX(${y / Math.max(1, raiz.scrollHeight - alt)})`;

    if (!reduzido) {
      // hero: mouse + rolagem
      if (heroVisivel) {
        mxS += (mx - mxS) * 0.07; myS += (my - myS) * 0.07;
        for (const el of profundos) { const p = +el.dataset.prof; el.style.transform = `translate3d(${mxS * p * 2}px, ${myS * p * 2}px, 0)`; }
        if (innerWidth > 1080) { // em duas colunas o palco afunda e some ao rolar; empilhado, ele fica abaixo do texto
          heroPalco.style.transform = `translate3d(0, ${y * 0.18}px, 0)`;
          heroPalco.style.opacity = String(Math.max(0, 1 - y / (alt * 0.9)));
        } else if (heroPalco.style.opacity) { heroPalco.style.transform = ''; heroPalco.style.opacity = ''; }
        // brasas
        const w = brasas.clientWidth;
        bctx.clearRect(0, 0, w, brasas.clientHeight);
        for (const b of particulas) {
          b.y -= b.v; b.x += Math.sin(t / 900 + b.f) * 0.3;
          if (b.y < -10) Object.assign(b, novaBrasa(false));
          bctx.globalAlpha = b.a * (0.6 + Math.sin(t / 300 + b.f) * 0.4);
          bctx.fillStyle = b.r > 1.8 ? '#FFB27A' : '#FF5A00';
          bctx.beginPath(); bctx.arc(b.x, b.y, b.r, 0, 6.283); bctx.fill();
        }
      }
      // imagens de comida nas seções
      for (const el of paralaxes) {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -100 || r.top > alt + 100) continue;
        const centro = (r.top + r.height / 2 - alt / 2);
        el.style.transform = `translate3d(0, ${centro * +el.dataset.paralaxe}px, 0) rotate(${centro * 0.01}deg)`;
      }
      for (let i = 0; i < finais.length; i++) finais[i].style.transform = `translate3d(0, ${Math.sin(t / 1400 + i * 2) * 16}px, 0) rotate(${Math.sin(t / 2000 + i) * 8}deg)`;
    }
    // manifesto: palavras acendem conforme a leitura
    if (palavras.length) {
      const r = manifesto.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (alt * 0.85 - r.top) / (r.height + alt * 0.35)));
      const n = Math.round(p * palavras.length);
      for (let i = 0; i < palavras.length; i++) palavras[i].classList.toggle('on', i < n);
    }
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);

  // ---------------------------------------------------------------------------
  // Navegação: rolagem suave curta, cortina laranja em saltos longos
  // ---------------------------------------------------------------------------
  const cortina = $('#cortina');
  function irPara(id, x, y) {
    const alvo = document.getElementById(id);
    if (!alvo) return;
    const topoAlvo = alvo.getBoundingClientRect().top + scrollY - (id === 'inicio' ? 0 : 70);
    const focar = () => { if (!alvo.hasAttribute('tabindex')) alvo.setAttribute('tabindex', '-1'); alvo.focus({ preventScroll: true }); };
    history.replaceState(null, '', '#' + id);
    if (reduzido || Math.abs(topoAlvo - scrollY) < innerHeight * 1.6) {
      navegando = true;
      scrollTo({ top: topoAlvo, behavior: reduzido ? 'auto' : 'smooth' });
      setTimeout(() => { navegando = false; }, 900);
      focar();
      return;
    }
    navegando = true;
    cortina.style.setProperty('--cx', (x != null ? x : innerWidth / 2) + 'px');
    cortina.style.setProperty('--cy', (y != null ? y : innerHeight / 2) + 'px');
    cortina.classList.remove('sai');
    void cortina.offsetWidth;
    cortina.classList.add('entra');
    setTimeout(() => {
      raiz.style.scrollBehavior = 'auto';
      scrollTo(0, topoAlvo);
      raiz.style.scrollBehavior = '';
      topo.classList.remove('escondido');
      cortina.classList.remove('entra');
      cortina.classList.add('sai');
      focar();
      setTimeout(() => { cortina.classList.remove('sai'); navegando = false; }, 650);
    }, 580);
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (!id || !document.getElementById(id)) return;
    e.preventDefault();
    fecharSubmenu(); fecharMenuMovel(); fecharGaveta(true);
    irPara(id, e.clientX || null, e.clientY || null);
  });

  // submenu "Soluções"
  const sub = $('.submenu'), subBtn = $('.submenu-btn');
  function abrirSubmenu() { sub.classList.add('aberto'); subBtn.setAttribute('aria-expanded', 'true'); }
  function fecharSubmenu() { sub.classList.remove('aberto'); subBtn.setAttribute('aria-expanded', 'false'); }
  subBtn.addEventListener('click', () => (sub.classList.contains('aberto') ? fecharSubmenu() : abrirSubmenu()));
  if (ponteiroFino) { sub.addEventListener('pointerenter', abrirSubmenu); sub.addEventListener('pointerleave', fecharSubmenu); }
  sub.addEventListener('keydown', (e) => {
    const links = $$('.submenu-lista a', sub), i = links.indexOf(document.activeElement);
    if (e.key === 'Escape') { fecharSubmenu(); subBtn.focus(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); abrirSubmenu(); links[(i + 1) % links.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); abrirSubmenu(); links[(i - 1 + links.length) % links.length].focus(); }
  });
  document.addEventListener('click', (e) => { if (!sub.contains(e.target)) fecharSubmenu(); });

  // menu do celular
  const hamb = $('.hamburguer'), menuMovel = $('#menu-movel');
  function fecharMenuMovel() {
    if (menuMovel.hidden) return;
    menuMovel.classList.remove('aberto'); hamb.setAttribute('aria-expanded', 'false'); hamb.setAttribute('aria-label', 'Abrir menu');
    document.body.classList.remove('travado');
    setTimeout(() => { menuMovel.hidden = true; }, 600);
  }
  hamb.addEventListener('click', () => {
    if (!menuMovel.hidden && menuMovel.classList.contains('aberto')) return fecharMenuMovel();
    menuMovel.hidden = false;
    $$('a', menuMovel).forEach((a, i) => { a.style.transitionDelay = (0.12 + i * 0.035) + 's'; });
    requestAnimationFrame(() => menuMovel.classList.add('aberto'));
    hamb.setAttribute('aria-expanded', 'true'); hamb.setAttribute('aria-label', 'Fechar menu');
    document.body.classList.add('travado');
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharMenuMovel(); });

  // ---------------------------------------------------------------------------
  // Revelação ao rolar, microinterações
  // ---------------------------------------------------------------------------
  const obsRevela = new IntersectionObserver((ents) => {
    ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visivel'); obsRevela.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
  function preparar(escopo = document) {
    $$('[data-revela], [data-revela-lista]', escopo).forEach((el) => obsRevela.observe(el));
    if (ponteiroFino && !reduzido) {
      $$('.mag', escopo).forEach(magnetico);
      $$('[data-tilt]', escopo).forEach(inclinar);
    }
    $$('.plano', escopo).forEach((c) => c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }));
    if (ponteiroFino) $$('a, button, [data-tilt], .hero-live, .final-live', escopo).forEach(cursorGrande);
  }
  function magnetico(b) {
    if (b.dataset.mag) return; b.dataset.mag = '1';
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.setProperty('--bx', ((e.clientX - r.left - r.width / 2) * 0.22) + 'px');
      b.style.setProperty('--by', ((e.clientY - r.top - r.height / 2) * 0.35) + 'px');
    });
    b.addEventListener('pointerleave', () => { b.style.setProperty('--bx', '0px'); b.style.setProperty('--by', '0px'); });
  }
  function inclinar(el) {
    if (el.dataset.tiltOk) return; el.dataset.tiltOk = '1';
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transition = 'transform .15s';
      el.style.transform = `perspective(1000px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(0)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transition = ''; el.style.transform = ''; });
  }
  const cursor = $('#cursor');
  function cursorGrande(el) {
    if (el.dataset.cur) return; el.dataset.cur = '1';
    el.addEventListener('pointerenter', () => cursor.classList.add('grande'));
    el.addEventListener('pointerleave', () => cursor.classList.remove('grande'));
  }
  if (ponteiroFino && !reduzido) {
    let cx = 0, cy = 0, tx = 0, ty = 0;
    addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; cursor.classList.add('ativo'); }, { passive: true });
    document.addEventListener('pointerleave', () => cursor.classList.remove('ativo'));
    (function seguir() { cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2; cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`; requestAnimationFrame(seguir); })();
  }
  preparar();
  document.addEventListener('lf:conteudo', (e) => preparar(e.detail));
  $('#ano').textContent = new Date().getFullYear();

  // ---------------------------------------------------------------------------
  // Cenas: roteiros que só rodam enquanto estão visíveis
  // ---------------------------------------------------------------------------
  function cena(el, roteiro, limiar = 0.3) {
    let tok = null;
    new IntersectionObserver((ents) => {
      const e = ents[ents.length - 1];
      if (e.isIntersecting && !tok) {
        const t = { on: true };
        tok = t;
        (async () => {
          while (t.on) {
            try { await roteiro(t); } catch (err) { if (err !== PARE) { console.error(err); return; } }
          }
        })();
      } else if (!e.isIntersecting && tok) { tok.on = false; tok = null; }
    }, { threshold: limiar }).observe(el);
  }
  const w = (ms, t) => espera(ms).then(() => { if (!t.on) throw PARE; });

  // ----- Ecossistema -----
  const ecoLive = criar($('#eco-live'), { sombra: false });
  const nos = $('.eco-nos'), linhas = $('.eco-linhas'), detalhe = $('#eco-detalhe');
  let ecoSel = 0, ecoUsuario = false;
  SOLUCOES.forEach((s, i) => {
    const ang = (-90 + i * 72) * Math.PI / 180, x = 50 + Math.cos(ang) * 40, y = 50 + Math.sin(ang) * 40;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'eco-no'; b.setAttribute('role', 'tab'); b.id = 'eco-' + s.id;
    b.setAttribute('aria-controls', 'eco-detalhe');
    b.style.left = x + '%'; b.style.top = y + '%';
    b.innerHTML = `<span class="icone" aria-hidden="true">${s.icone}</span><span>${s.nome}</span>`;
    b.dataset.ang = ang;
    b.addEventListener('click', () => { ecoUsuario = true; selecionarEco(i); });
    b.addEventListener('pointerenter', () => { if (ponteiroFino) { ecoUsuario = true; selecionarEco(i); } });
    nos.appendChild(b);
    const px = x * 6, py = y * 6, cxp = 300 + Math.cos(ang + 0.5) * 70, cyp = 300 + Math.sin(ang + 0.5) * 70;
    linhas.insertAdjacentHTML('beforeend', `<path class="fio" d="M300 300 Q ${cxp} ${cyp} ${px} ${py}"/><path class="fluxo" data-i="${i}" d="M300 300 Q ${cxp} ${cyp} ${px} ${py}"/>`);
  });
  function selecionarEco(i) {
    ecoSel = i;
    const s = SOLUCOES[i];
    $$('.eco-no', nos).forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
    $$('.fluxo', linhas).forEach((p, k) => p.classList.toggle('ativo', k === i));
    detalhe.setAttribute('aria-labelledby', 'eco-' + s.id);
    detalhe.innerHTML = `<div class="troca"><h3>${s.icone} ${s.nome}</h3><p>${s.resumo}</p></div><a class="btn btn-pri btn-p mag troca" href="#${s.id}">Ver solução <span class="seta">→</span></a>`;
    preparar(detalhe);
    const ang = +$$('.eco-no', nos)[i].dataset.ang;
    if (!ecoLive.ocupado) { ecoLive.olhar(Math.cos(ang), Math.sin(ang)); ecoLive.expressao(i % 2 ? 'animado' : 'feliz'); }
  }
  selecionarEco(0);
  cena($('#ecossistema'), async (t) => {
    await w(3800, t);
    if (!ecoUsuario) selecionarEco((ecoSel + 1) % SOLUCOES.length);
    else if (Math.random() < 0.25) ecoLive.gesto('piscadinha');
  }, 0.2);

  // ----- Delivery -----
  const passos = $$('#delivery .linha-tempo li'), rota = $('#delivery .rota'), moto = $('#delivery .moto'), notif = $('#delivery .notif');
  const compRota = rota.getTotalLength();
  rota.style.strokeDasharray = compRota; rota.style.strokeDashoffset = compRota;
  function moverMoto(p) { const pt = rota.getPointAtLength(compRota * p); moto.setAttribute('transform', `translate(${pt.x} ${pt.y})`); }
  moverMoto(0);
  cena($('#delivery'), async (t) => {
    passos.forEach((p) => p.classList.remove('feito'));
    notif.classList.remove('mostra');
    rota.style.transition = 'none'; rota.style.strokeDashoffset = compRota; moverMoto(0);
    await w(500, t);
    notif.classList.add('mostra');
    passos[0].classList.add('feito');
    await w(1300, t);
    notif.classList.remove('mostra');
    passos[1].classList.add('feito');
    await w(1300, t);
    passos[2].classList.add('feito');
    rota.style.transition = 'stroke-dashoffset 3s cubic-bezier(.65,0,.35,1)'; rota.style.strokeDashoffset = '0';
    const t0 = performance.now();
    await new Promise((res) => { (function anda() { const p = Math.min(1, (performance.now() - t0) / 3000); moverMoto(p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2); if (p < 1 && t.on) requestAnimationFrame(anda); else res(); })(); });
    passos[3].classList.add('feito');
    await w(2600, t);
  });

  // ----- Comanda -----
  const mesasEl = $('#comanda .mesas'), itensEl = $('#comanda .comanda-itens'), enviar = $('#comanda .comanda-enviar'), fila = $('#comanda .cozinha-fila');
  for (let i = 1; i <= 9; i++) mesasEl.insertAdjacentHTML('beforeend', `<div class="mesa${[2, 5, 9].includes(i) ? ' ocupada' : ''}">${i}</div>`);
  const mesas = $$('.mesa', mesasEl);
  cena($('#comanda'), async (t) => {
    itensEl.innerHTML = ''; fila.innerHTML = '';
    mesas.forEach((m) => m.classList.remove('alvo'));
    await w(700, t);
    mesas[6].classList.add('alvo');
    await w(800, t);
    for (const item of ['2× Smash burger', '1× Batata grande · sem sal', '2× Refri lata']) { itensEl.insertAdjacentHTML('beforeend', `<li>${item}</li>`); await w(650, t); }
    enviar.classList.add('aperta');
    await w(220, t);
    enviar.classList.remove('aperta');
    fila.insertAdjacentHTML('beforeend', '<div class="ticket">Mesa 7 · 3 itens</div>');
    mesas[6].classList.remove('alvo'); mesas[6].classList.add('ocupada');
    await w(2800, t);
    mesas[6].classList.remove('ocupada');
  });

  // ----- App -----
  const telas = $$('#app .tela-app'), pontos = $$('#app .pontos-telas button');
  const qr = $('#app .qr');
  for (let i = 0; i < 169; i++) { const r = Math.floor(i / 13), c = i % 13; const canto = (r < 4 && c < 4) || (r < 4 && c > 8) || (r > 8 && c < 4); qr.insertAdjacentHTML('beforeend', `<i class="${canto ? ((r % 3 && c % 3 && !(r === 1 || c === 1 || r === 11 || c === 11)) ? 'v' : '') : (Math.random() < 0.45 ? 'v' : '')}"></i>`); }
  let telaAtual = 0, appUsuario = 0;
  function mostrarTela(i) {
    telas.forEach((s, k) => { s.classList.toggle('ativa', k === i); s.classList.toggle('saiu', k < i); });
    pontos.forEach((p, k) => { p.classList.toggle('on', k === i); p.setAttribute('aria-selected', String(k === i)); });
    telaAtual = i;
  }
  pontos.forEach((p, i) => p.addEventListener('click', () => { appUsuario = Date.now(); mostrarTela(i); }));
  cena($('#app'), async (t) => {
    await w(3000, t);
    if (Date.now() - appUsuario > 8000) mostrarTela((telaAtual + 1) % telas.length);
  });

  // ----- Totem (autoatendimento) -----
  const totem = $('#totem'), tela = $('.totem-tela', totem);
  const totemLive = criar($('#totem-live'), { sombra: false });
  const tBalao = $('.totem-balao', totem), tSug = $('.totem-sugestao', totem), falaLive = $('.fala-live', totem), falaCli = $('.fala-cliente', totem), tLista = $('.totem-resumo ul', totem), mic = $('.totem-mic', totem);
  function balaoTotem(texto, ms = 1600) {
    const rt = tela.getBoundingClientRect(), rc = totemLive.raiz.querySelector('.live-corpo').getBoundingClientRect();
    tBalao.textContent = texto;
    tBalao.style.left = Math.max(20, Math.min(rt.width - 20, rc.left - rt.left + rc.width / 2)) / rt.width * 100 + '%';
    tBalao.style.top = (rc.top - rt.top + 4) / rt.height * 100 + '%';
    tBalao.classList.add('mostra');
    setTimeout(() => tBalao.classList.remove('mostra'), ms);
  }
  async function digitar(el, texto, t, ms = 32) { el.textContent = ''; for (const c of texto) { el.textContent += c; await w(ms, t); } }
  let totemPular = null;
  $('#totem-tocar').addEventListener('click', () => { $('#totem').scrollIntoView({ behavior: reduzido ? 'auto' : 'smooth', block: 'center' }); if (totemPular) totemPular(); });
  tela.addEventListener('click', () => { if (totemPular) totemPular(); });
  cena(totem, async (t) => {
    // standby: espia pelas bordas, como no totem de verdade
    totem.classList.remove('conversa', 'final');
    tLista.innerHTML = ''; falaLive.textContent = ''; falaCli.textContent = '';
    Object.assign(totemLive.P, { x: -420, y: -80, giro: 22, salto: 0, sx: 1, sy: 1 });
    totemLive.expressao('curioso');
    let pulou = false;
    const toque = new Promise((r) => { totemPular = () => { pulou = true; r(); }; });
    const standby = (async () => {
      for (const lado of [-1, 1]) {
        if (pulou) return;
        Object.assign(totemLive.P, { x: lado * 420, giro: -lado * 22, y: lado < 0 ? -80 : -260 });
        totemLive.expressao('curioso'); totemLive.olhar(-lado, 0);
        await totemLive.animar({ x: lado * 250 }, 900, (p) => 1 + 2.70158 * Math.pow(p - 1, 3) + 1.70158 * Math.pow(p - 1, 2));
        if (pulou) return;
        totemLive.piscar(); await w(700, t);
        totemLive.expressao('feliz');
        balaoTotem(lado < 0 ? 'Psiu! Tô aqui!' : 'Tá com fome? 👀');
        await w(1500, t);
        totemLive.expressao('piscadinha'); await w(500, t);
        if (pulou) return;
        await totemLive.animar({ x: lado * 420 }, 500);
        await w(600, t);
      }
    })();
    await Promise.race([toque, standby, w(9000, t)]);
    pulou = true;
    totemPular = null;
    // conversa
    totem.classList.add('conversa');
    totemLive.expressao('surpreso'); totemLive.olhar(0, 0);
    await totemLive.animar({ x: 0, y: -390, giro: 0 }, 750, (p) => 1 + 2.70158 * Math.pow(p - 1, 3) + 1.70158 * Math.pow(p - 1, 2));
    totemLive.expressao('animado');
    await totemLive.gesto('boas_vindas');
    const fala = async (txt) => { const d = digitar(falaLive, txt, t, 28); await Promise.all([d, totemLive.falar(txt, 28)]); };
    await fala('Oi! Eu sou o Live. O que vai ser hoje?');
    mic.classList.add('ouvindo'); totemLive.olhar(0, 0.15);
    await w(500, t);
    await digitar(falaCli, '"Quero um smash burger e uma batata"', t, 30);
    mic.classList.remove('ouvindo');
    totemLive.pensando(true); await w(1100, t); totemLive.pensando(false);
    tLista.insertAdjacentHTML('beforeend', '<li><b>1×</b> Smash burger</li>');
    await w(300, t);
    tLista.insertAdjacentHTML('beforeend', '<li><b>1×</b> Batata</li>');
    totemLive.icone('hamburguer', 1200);
    tSug.querySelector('img').src = 'site/img/refri.jpg'; tSug.querySelector('span').textContent = 'Refri gelado?';
    tSug.classList.add('mostra');
    falaCli.textContent = '';
    await fala('Boa escolha! Que tal um refri pra acompanhar?');
    totemLive.gesto('apontar', 1);
    mic.classList.add('ouvindo');
    await w(700, t);
    await digitar(falaCli, '"Pode ser!"', t, 40);
    mic.classList.remove('ouvindo');
    tSug.classList.remove('mostra');
    tLista.insertAdjacentHTML('beforeend', '<li><b>1×</b> Refri</li>');
    totemLive.icone('check', 900);
    await w(400, t);
    falaCli.textContent = '';
    await fala('Fechado! Seu pedido já foi pro balcão.');
    totem.classList.add('final');
    await totemLive.gesto('comemorar');
    await w(3400, t);
    totemLive.expressao('feliz');
    await totemLive.animar({ x: 420, y: -80 }, 650);
  }, 0.35);

  // ----- Chat (atendimento digital) -----
  const chatCorpo = $('#atendimento .chat-corpo');
  const chatLive = criar($('#chat-live'), { sombra: false });
  const ROTEIRO_CHAT = [
    ['live', 'Oi! Vou te mostrar como o cliente fala com a equipe direto da mesa 👇'],
    ['acao', '🛎 Chamar o garçom'],
    ['sistema', 'Mesa 7 chamou · entrou na fila da equipe'],
    ['live', 'Pronto! O garçom vê o chamado na fila de atendimento.'],
    ['acao', '🧾 Fechar conta'],
    ['live', 'Os itens da mesa aparecem no celular e o Pix é gerado na hora.'],
    ['acao', 'Copiar código Pix'],
    ['sistema', 'Pagamento confirmado ✓'],
    ['live', 'Simples assim. E a cobrança também pode ir pelo WhatsApp 😉'],
  ];
  cena($('#atendimento'), async (t) => {
    chatCorpo.innerHTML = '';
    for (const [quem, texto] of ROTEIRO_CHAT) {
      if (quem === 'live') {
        const d = document.createElement('div'); d.className = 'digitando'; d.innerHTML = '<i></i><i></i><i></i>';
        chatCorpo.appendChild(d); chatLive.pensando(true);
        await w(900, t);
        d.remove(); chatLive.pensando(false);
        chatLive.falar(texto, 30);
      } else await w(700, t);
      const m = document.createElement('div');
      m.className = 'msg ' + quem; m.textContent = texto;
      chatCorpo.appendChild(m);
      while (chatCorpo.children.length > 7) chatCorpo.firstElementChild.remove();
      if (quem === 'sistema') chatLive.gesto(texto.includes('✓') ? 'comemorar' : 'piscadinha');
      await w(quem === 'live' ? 1500 : 900, t);
    }
    await w(3500, t);
  });

  // ----- Planos: o Live acompanha os cards -----
  const planosLive = criar($('#planos-live'), { sombra: false });
  const grade = $('#planos-grade');
  grade.addEventListener('pointerover', (e) => {
    const c = e.target.closest('.plano, .planos-aviso');
    if (!c || planosLive.ocupado) return;
    const r = c.getBoundingClientRect(), rl = planosLive.raiz.getBoundingClientRect();
    planosLive.olhar((r.left + r.width / 2 - (rl.left + rl.width / 2)) / 500, (r.top + r.height / 2 - (rl.top + rl.height / 2)) / 400);
    planosLive.expressao('animado');
  });
  grade.addEventListener('pointerleave', () => { planosLive.expressao('feliz'); planosLive.olhar(0, 0); });
  grade.addEventListener('click', (e) => { if (e.target.closest('[data-assinar]')) planosLive.gesto('comemorar'); });
  cena($('#planos'), async (t) => {
    await w(900, t);
    await planosLive.gesto('apontar', -1);
    await w(6000, t);
    await planosLive.gesto('piscadinha');
    await w(5000, t);
  }, 0.25);

  // ----- CTA final -----
  const finalEl = $('#final-live');
  const finalLive = criar(finalEl, { sombra: true, rotulo: 'Live comemorando' });
  let finalFesta = 0;
  new IntersectionObserver(async (e) => {
    if (!e[0].isIntersecting || Date.now() - finalFesta < 8000) return;
    finalFesta = Date.now();
    await espera(300);
    const r = finalEl.getBoundingClientRect();
    confete(r.left + r.width / 2, r.top + r.height / 2, 30);
    await finalLive.gesto('comemorar');
    finalLive.seguirMouse(true);
  }, { threshold: 0.6 }).observe(finalEl);
  finalEl.addEventListener('click', () => { const r = finalEl.getBoundingClientRect(); confete(r.left + r.width / 2, r.top + r.height / 2); finalLive.gesto('comemorar'); });

  // ---------------------------------------------------------------------------
  // Gaveta de detalhes das soluções
  // ---------------------------------------------------------------------------
  const gaveta = $('#gaveta'), gavetaConteudo = $('.gaveta-conteudo', gaveta);
  let focoGaveta = null;
  function abrirGaveta(id) {
    const s = SOLUCOES.find((x) => x.id === id);
    if (!s) return;
    focoGaveta = document.activeElement;
    gavetaConteudo.innerHTML = `
      <img class="gaveta-img" src="${s.img}" alt="">
      <p class="sobretitulo">${s.icone} Solução LiveFood</p>
      <h2 id="gaveta-titulo">${s.nome}</h2>
      <p class="lead">${s.texto}</p>
      <ul class="beneficios">${s.passos.map(([b, p]) => `<li><b>${b}</b>${p}</li>`).join('')}</ul>
      <div class="botoes-linha"><a class="btn btn-pri mag" href="#planos">Ver planos <span class="seta">→</span></a><button class="btn btn-vidro mag" type="button" data-abrir-contato>Falar com um especialista</button></div>`;
    gaveta.hidden = false;
    document.body.classList.add('travado');
    requestAnimationFrame(() => gaveta.classList.add('aberta'));
    preparar(gavetaConteudo);
    setTimeout(() => $('.fechar', gaveta).focus(), 350);
  }
  function fecharGaveta(rapido) {
    if (gaveta.hidden) return;
    gaveta.classList.remove('aberta');
    document.body.classList.remove('travado');
    setTimeout(() => { gaveta.hidden = true; }, rapido ? 0 : 600);
    if (focoGaveta && !rapido) focoGaveta.focus();
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-solucao]');
    if (b) { abrirGaveta(b.dataset.solucao); return; }
    if (e.target.closest('#gaveta [data-fechar]')) fecharGaveta();
    if (e.target.closest('#gaveta [data-abrir-contato]')) fecharGaveta(true);
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !gaveta.hidden) fecharGaveta(); });

  // ---------------------------------------------------------------------------
  // O Live espião: espia pelas bordas enquanto o visitante explora a página
  // ---------------------------------------------------------------------------
  const espiao = $('#espiao');
  const espiaoLive = criar($('.espiao-cabeca', espiao), { sombra: false });
  const FRASES = {
    ecossistema: 'Psiu! Tá tudo conectado, viu? 👀',
    delivery: 'Olha o delivery chegando! 🛵',
    comanda: 'Garçom com superpoderes 😎',
    app: 'Seu restaurante no bolso do cliente!',
    autoatendimento: 'Ei… esse aí no totem sou eu! 😄',
    atendimento: 'Chamou? Tô aqui! 🛎',
    planos: 'Psiu! Escolhe um que eu te ajudo 😉',
    sobre: 'Achou que eu não tava vendo? 😄',
  };
  let espiando = false, ultimaEspiada = Date.now(), ultimaRolagem = Date.now(), bloqueioEspiao = 0;
  const jaDisse = new Set();
  const mola = (p) => 1 + 2.70158 * Math.pow(p - 1, 3) + 1.70158 * Math.pow(p - 1, 2);
  function posEspiao(x, y, giro) { espiao.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${giro}deg)`; }
  function moverEspiao(de, para, ms, ease = 'cubic-bezier(.34,1.56,.64,1)') {
    const a = espiao.animate([
      { transform: `translate3d(${de[0]}px, ${de[1]}px, 0) rotate(${de[2]}deg)` },
      { transform: `translate3d(${para[0]}px, ${para[1]}px, 0) rotate(${para[2]}deg)` },
    ], { duration: ms, easing: ease, fill: 'forwards' });
    return a.finished.then(() => { posEspiao(...para); a.cancel(); });
  }
  function cabecaRect() { return $('.live-corpo', espiao).getBoundingClientRect(); }

  async function espiarLado(lado, frase) {
    const larg = espiao.offsetWidth, y = sorteio(innerHeight * 0.25, innerHeight * 0.6);
    const fora = [lado < 0 ? -larg * 1.4 : innerWidth + larg * 0.4, y, -lado * 22];
    const dentro = [lado < 0 ? -larg * 0.42 : innerWidth - larg * 0.58, y, -lado * 22];
    espiaoLive.expressao('curioso'); espiaoLive.olhar(-lado, 0);
    posEspiao(...fora);
    await moverEspiao(fora, dentro, 900);
    espiaoLive.piscar();
    await espera(700);
    if (Math.random() < 0.4) { // esconde-esconde
      espiaoLive.expressao('surpreso');
      await moverEspiao(dentro, fora, 220, 'cubic-bezier(.2,.8,.3,1)');
      await espera(600);
      espiaoLive.expressao('animado');
      await moverEspiao(fora, dentro, 420);
    }
    espiaoLive.expressao('feliz'); espiaoLive.olhar(-lado, 0.2);
    balao(frase, cabecaRect(), 2200, lado < 0 ? 'direita' : 'esquerda');
    espiaoLive.falar(frase, 40);
    await espera(2000);
    await espiaoLive.gesto('piscadinha');
    await moverEspiao(dentro, fora, 500, 'cubic-bezier(.65,0,.35,1)');
  }
  async function espiarBaixo(frase) {
    const larg = espiao.offsetWidth, x = sorteio(innerWidth * 0.2, innerWidth * 0.8 - larg), giro = sorteio(-10, 10);
    const fora = [x, innerHeight + 20, giro], dentro = [x, innerHeight - larg * 0.62, giro];
    espiaoLive.expressao('curioso'); espiaoLive.olhar(0, -1);
    posEspiao(...fora);
    await moverEspiao(fora, dentro, 800);
    await espera(600);
    espiaoLive.olhar(Math.random() < 0.5 ? -1 : 1, -0.6);
    await espera(600);
    espiaoLive.expressao('animado'); espiaoLive.olhar(0, -0.6);
    balao(frase, cabecaRect(), 2000, 'cima');
    espiaoLive.falar(frase, 40);
    await moverEspiao(dentro, [x, innerHeight - larg * 0.8, giro], 300);
    await espera(1800);
    await moverEspiao([x, innerHeight - larg * 0.8, giro], fora, 450, 'cubic-bezier(.65,0,.35,1)');
  }
  async function espiar(frase) {
    if (espiando || reduzido || !document.body.classList.contains('pronto')) return;
    if (document.body.classList.contains('travado') || Date.now() < bloqueioEspiao) return;
    espiando = true; ultimaEspiada = Date.now();
    espiao.classList.add('clicavel');
    try {
      if (Math.random() < 0.3) await espiarBaixo(frase); else await espiarLado(Math.random() < 0.5 ? -1 : 1, frase);
    } finally {
      espiao.classList.remove('clicavel');
      espiando = false; ultimaEspiada = Date.now();
    }
  }
  espiao.addEventListener('click', async () => {
    balao('Hehe, me achou! 😄', cabecaRect(), 1600, 'cima');
    await espiaoLive.gesto('comemorar');
  });
  // fica quieto enquanto o Live do hero ou do final está na tela
  let liveGrandeVisivel = true;
  const obsGrandes = new IntersectionObserver((ents) => { ents.forEach((e) => { e.target._vis = e.isIntersecting; }); liveGrandeVisivel = $('#inicio')._vis || $('#contato')._vis; }, { threshold: 0.25 });
  obsGrandes.observe($('#inicio')); obsGrandes.observe($('#contato'));
  const obsFrases = new IntersectionObserver((ents) => {
    ents.forEach((e) => {
      const id = e.target.id;
      if (!e.isIntersecting || jaDisse.has(id) || liveGrandeVisivel) return;
      if (Date.now() - ultimaEspiada < 9000) return;
      jaDisse.add(id);
      setTimeout(() => espiar(FRASES[id]), 900);
    });
  }, { threshold: 0.45 });
  Object.keys(FRASES).forEach((id) => { const s = document.getElementById(id); if (s) obsFrases.observe(s); });
  addEventListener('scroll', () => { ultimaRolagem = Date.now(); }, { passive: true });
  setInterval(() => { // parado lendo por um tempo: ele aparece para dar um oi
    if (!liveGrandeVisivel && Date.now() - ultimaRolagem > 7000 && Date.now() - ultimaEspiada > 16000) {
      const extras = ['Tô de olho, hein! 👀', 'Bora pedir? Quer dizer… bora vender! 😄', 'Qualquer dúvida, fala com a gente!', 'Psiu! Tem plano te esperando 😉'];
      espiar(extras[Math.floor(Math.random() * extras.length)]);
    }
  }, 2000);
  document.addEventListener('click', (e) => { if (e.target.closest('[data-assinar], [data-abrir-contato], [data-solucao]')) bloqueioEspiao = Date.now() + 4000; });
})();
