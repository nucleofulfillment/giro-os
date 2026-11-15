/* LiveFood · site institucional (HOME-01): movimento e navegação.
   Tudo aqui é leve: só transform/opacity, um único laço de animação e observadores de tela.
   Com "reduzir movimento" ligado no aparelho, nada flutua nem troca sozinho. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fino = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const limita = (v, a, b) => Math.max(a, Math.min(b, v));

  const ano = $('#ano'); if (ano) ano.textContent = new Date().getFullYear();
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('pronto')));

  // ---------------------------------------------------------------- revelar ao rolar
  const olho = 'IntersectionObserver' in window ? new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visivel'); olho.unobserve(e.target); contar(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }) : null;
  function preparar(raiz) {
    $$('[data-revela]', raiz).forEach((el) => { if (olho) olho.observe(el); else el.classList.add('visivel'); });
  }
  preparar(document);
  document.addEventListener('lf:conteudo', (e) => preparar(e.detail || document));   // planos chegam depois

  // ---------------------------------------------------------------- números que contam
  function formata(v, casas) { return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }); }
  function contar(raiz) {
    const alvos = raiz.matches && raiz.matches('[data-conta]') ? [raiz] : $$('[data-conta]', raiz);
    alvos.forEach((el) => {
      if (el.dataset.contou) return; el.dataset.contou = '1';
      const fim = parseFloat(el.dataset.conta), casas = +(el.dataset.casas || 0), pre = el.dataset.pre || '', suf = el.dataset.suf || '';
      if (calmo || !isFinite(fim)) return;
      const t0 = performance.now(), dur = 1500 + Math.min(900, fim / 20);
      (function passo(t) {
        const p = limita((t - t0) / dur, 0, 1), s = 1 - Math.pow(1 - p, 4);
        el.textContent = pre + formata(fim * s, casas) + suf;
        if (p < 1) requestAnimationFrame(passo);
      })(t0);
    });
  }

  // ---------------------------------------------------------------- topo: some ao descer, volta ao subir
  const topo = $('#topo'), hamb = $('.hamb'), movel = $('#menu-movel');
  let yAntes = scrollY;
  function topoRola() {
    const y = scrollY;
    topo.classList.toggle('rolou', y > 8);
    const aberto = hamb.getAttribute('aria-expanded') === 'true' || !!$('.sub.aberto');
    if (!aberto) topo.classList.toggle('some', y > 520 && y > yAntes + 4 ? true : (y < yAntes - 4 ? false : topo.classList.contains('some')));
    yAntes = y;
  }
  // submenu Soluções
  const sub = $('.sub'), subBtn = $('.sub-btn');
  function abreSub(sim) { sub.classList.toggle('aberto', sim); subBtn.setAttribute('aria-expanded', String(sim)); }
  subBtn.addEventListener('click', () => abreSub(!sub.classList.contains('aberto')));
  if (fino) { let t; sub.addEventListener('mouseenter', () => { clearTimeout(t); abreSub(true); }); sub.addEventListener('mouseleave', () => { t = setTimeout(() => abreSub(false), 160); }); }
  document.addEventListener('click', (e) => { if (!e.target.closest('.sub') || e.target.closest('.sub-painel a')) abreSub(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { abreSub(false); menuMovel(false); } });
  // menu do celular
  function menuMovel(sim) {
    if (sim === (hamb.getAttribute('aria-expanded') === 'true')) return;
    hamb.setAttribute('aria-expanded', String(sim)); hamb.setAttribute('aria-label', sim ? 'Fechar menu' : 'Abrir menu');
    document.body.classList.toggle('travado', sim);
    if (sim) { movel.hidden = false; requestAnimationFrame(() => movel.classList.add('aberto')); topo.classList.remove('some'); }
    else { movel.classList.remove('aberto'); setTimeout(() => { if (hamb.getAttribute('aria-expanded') !== 'true') movel.hidden = true; }, 320); }
  }
  hamb.addEventListener('click', () => menuMovel(hamb.getAttribute('aria-expanded') !== 'true'));
  movel.addEventListener('click', (e) => { if (e.target.closest('a')) menuMovel(false); });
  addEventListener('resize', () => { if (innerWidth > 1080) menuMovel(false); });

  // ---------------------------------------------------------------- Live (personagem)
  const lives = {};
  function live(id, op) { const el = document.getElementById(id); if (!el || !window.LiveMascote) return null; try { return (lives[id] = LiveMascote.criar(el, { sombra: false, rotulo: 'Live', ...op })); } catch (e) { return null; } }
  live('live-capa', { expressao: 'animado', seguirMouse: fino && !calmo });
  live('live-totem-capa', { flutuar: false });
  live('live-totem-aba', { flutuar: false, expressao: 'animado' });
  live('planos-live', { expressao: 'feliz' });
  const liveFinal = live('final-live', { expressao: 'animado' });
  if (lives['live-capa'] && !calmo) setTimeout(() => { try { lives['live-capa'].gesto('acenar'); } catch (e) {} }, 1600);
  if (liveFinal && olho) new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); if (!calmo) try { liveFinal.gesto('comemorar'); } catch (e) {} } }, { threshold: 0.6 }).observe($('#final-live'));

  // ---------------------------------------------------------------- LiveFood: abas que trocam sozinhas
  const abas = $$('#abas-lf .aba'), quadros = $$('.cena-lf .quadro'), DUR = 6500;
  let abaAtual = 0, relogio = null, naTela = false, pausa = false;
  function abaVai(i, usuario) {
    abaAtual = (i + abas.length) % abas.length;
    abas.forEach((a, k) => { const on = k === abaAtual; a.classList.toggle('on', on); a.classList.remove('toca'); a.setAttribute('aria-selected', String(on)); });
    quadros.forEach((q) => q.classList.toggle('on', q.dataset.quadro === abas[abaAtual].dataset.aba));
    clearTimeout(relogio);
    if (usuario) pausa = true;
    if (!calmo && naTela && !pausa) {
      const a = abas[abaAtual]; a.style.setProperty('--dur', DUR + 'ms'); void a.offsetWidth; a.classList.add('toca');
      relogio = setTimeout(() => abaVai(abaAtual + 1), DUR);
    }
  }
  abas.forEach((a, i) => a.addEventListener('click', () => abaVai(i, true)));
  const secLf = $('#livefood');
  if (abas.length && secLf && 'IntersectionObserver' in window) new IntersectionObserver((es) => { naTela = es[0].isIntersecting; if (naTela) abaVai(abaAtual); else clearTimeout(relogio); }, { threshold: 0.3 }).observe(secLf);
  // links antigos (#delivery, #comanda...) continuam valendo: abrem a aba certa
  function abaDoEndereco() { if (!abas.length) return; const h = location.hash.slice(1), i = abas.findIndex((a) => a.dataset.aba === h); if (i >= 0) { abaVai(i, true); secLf.scrollIntoView(); } }
  addEventListener('hashchange', abaDoEndereco); abaDoEndereco();

  // ---------------------------------------------------------------- LiveBank: cor do cartão
  const cartaoBank = $('#cartao-bank');
  $$('.troca button').forEach((b) => b.addEventListener('click', () => {
    $$('.troca button').forEach((x) => x.classList.toggle('on', x === b));
    cartaoBank.classList.toggle('degrade', b.dataset.cor === 'degrade');
  }));

  // ---------------------------------------------------------------- manifesto: palavras acendem com a rolagem
  const manifesto = $('#manifesto'); let palavras = [];
  if (manifesto) {
    manifesto.innerHTML = manifesto.textContent.trim().split(/\s+/).map((p) => '<span class="pl' + (calmo ? ' on' : '') + '">' + p + '</span>').join(' ');
    palavras = $$('.pl', manifesto);
  }

  // ---------------------------------------------------------------- um laço só: paralaxe, trilho, cartão
  const palco = $('#palco'), cams = (palco ? $$('.cam', palco) : []).map((el) => ({ el, prof: parseFloat(el.dataset.prof || 0) }));
  const pares = $$('[data-par]').map((el) => ({ el, f: parseFloat(el.dataset.par) }));
  const trilho = $('#trilho'), etapas = $$('.etapa', trilho), gira = $('#gira'), cenaBank = $('#cena-bank');
  let mx = 0, my = 0, ax = 0, ay = 0, bx = 0, by = 0, cbx = 0, cby = 0, sujo = true, rodando = false;
  if (fino && !calmo) {
    addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; pede(); }, { passive: true });
    if (cenaBank) {
      cenaBank.addEventListener('pointermove', (e) => { const r = cenaBank.getBoundingClientRect(); bx = (e.clientX - r.left) / r.width - 0.5; by = (e.clientY - r.top) / r.height - 0.5; pede(); }, { passive: true });
      cenaBank.addEventListener('pointerleave', () => { bx = 0; by = 0; pede(); });
    }
  }
  function progresso(el, ini, fim) {   // 0 quando o topo do elemento chega em "ini" da tela, 1 quando chega em "fim"
    const r = el.getBoundingClientRect(), h = innerHeight;
    return limita((h * ini - r.top) / (h * ini - h * fim + r.height * 0), 0, 1);
  }
  function quadro() {
    rodando = false;
    const h = innerHeight;
    // capa: camadas em profundidades diferentes seguem o ponteiro e a rolagem
    if (!calmo && palco) {
      ax += (mx - ax) * 0.08; ay += (my - ay) * 0.08;
      const rp = palco.getBoundingClientRect();
      if (rp.bottom > 0 && rp.top < h) {
        const rol = limita(scrollY / h, 0, 1.2);
        cams.forEach((c) => { c.el.style.transform = 'translate3d(' + (-ax * c.prof * 1.1).toFixed(2) + 'px,' + (-ay * c.prof * 0.8 - rol * c.prof * 2.2).toFixed(2) + 'px,0)'; });
      }
      pares.forEach((p) => { const r = p.el.parentElement.getBoundingClientRect(); if (r.bottom < 0 || r.top > h) return; p.el.style.transform = 'translate3d(0,' + ((r.top + r.height / 2 - h / 2) * p.f).toFixed(1) + 'px,0)'; });
      if (Math.abs(mx - ax) > 0.001 || Math.abs(my - ay) > 0.001) pede();
    }
    // trilho "do pedido ao lucro": a linha enche conforme a seção passa
    if (trilho) {
      const r = trilho.getBoundingClientRect();
      const p = calmo ? 1 : limita((h * 0.78 - r.top) / (r.height + h * 0.28), 0, 1);
      trilho.style.setProperty('--p', p.toFixed(3));
      etapas.forEach((e, i) => e.classList.toggle('on', p >= (i + 0.12) / etapas.length));
    }
    // manifesto
    if (palavras.length && !calmo) {
      const r = manifesto.getBoundingClientRect(), p = limita((h * 0.86 - r.top) / (r.height + h * 0.36), 0, 1), n = Math.round(p * palavras.length);
      palavras.forEach((w, i) => w.classList.toggle('on', i < n));
    }
  }
  function pede() { if (!rodando) { rodando = true; requestAnimationFrame(quadro); } }

  // cartão LiveBank: em pé, girando devagar o tempo todo (só enquanto está na tela) e inclinando com o ponteiro
  if (gira && cartaoBank) {
    let vendo = false, tAnt = 0, ang = 0;
    function giraCartao(t) {
      if (!vendo) return;
      const dt = Math.min(0.05, (t - (tAnt || t)) / 1000); tAnt = t;
      ang += dt * 0.55;
      cbx += (bx - cbx) * 0.08; cby += (by - cby) * 0.08;
      const s1 = Math.sin(ang), ry = s1 * 42 + (Math.sin(ang * 0.5) > 0.985 ? 0 : 0) + cbx * 40 - 8;
      const rx = 12 + Math.sin(ang * 0.7) * 5 - cby * 22, rz = 14 + Math.sin(ang * 0.45) * 3, y = Math.sin(ang * 1.3) * 8;
      cartaoBank.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) rotateZ(' + rz.toFixed(2) + 'deg)';
      cartaoBank.style.setProperty('--brilho', (ry * 0.9).toFixed(1) + '%');
      requestAnimationFrame(giraCartao);
    }
    if (!calmo && 'IntersectionObserver' in window) new IntersectionObserver((es) => { const v = es[0].isIntersecting; if (v && !vendo) { vendo = true; tAnt = 0; requestAnimationFrame(giraCartao); } else if (!v) vendo = false; }, { threshold: 0.05 }).observe(cenaBank);
  }
  addEventListener('scroll', () => { topoRola(); pede(); }, { passive: true });
  addEventListener('resize', pede);
  topoRola(); pede();

  // ---------------------------------------------------------------- segmentos: carrossel com o item do meio em destaque
  (function () {
    const trilhoS = $('#seg-trilho'); if (!trilhoS) return;
    const itens = $$('.seg', trilhoS), pontos = $('#seg-pontos');
    pontos.innerHTML = itens.map(() => '<i></i>').join('');
    const pts = $$('i', pontos);
    let atual = 0, mexeu = false, timer = null, pedeS = false;
    function mede() {
      const r = trilhoS.getBoundingClientRect(), meio = r.left + r.width / 2; let melhor = 0, md = 1e9;
      itens.forEach((el, i) => {
        const b = el.getBoundingClientRect(), d = Math.abs(b.left + b.width / 2 - meio), k = limita(d / (b.width * 1.05), 0, 1);
        el.style.setProperty('--s', (1 - k * 0.32).toFixed(3)); el.style.setProperty('--op', (1 - k * 0.5).toFixed(3));
        if (d < md) { md = d; melhor = i; }
      });
      atual = melhor; pts.forEach((p, i) => p.classList.toggle('on', i === atual));
    }
    function vai(i, suave) { const el = itens[(i + itens.length) % itens.length]; trilhoS.scrollTo({ left: el.offsetLeft - trilhoS.offsetLeft - (trilhoS.clientWidth - el.offsetWidth) / 2, behavior: suave === false || calmo ? 'auto' : 'smooth' }); }
    function para() { mexeu = true; clearInterval(timer); }
    trilhoS.addEventListener('scroll', () => { if (!pedeS) { pedeS = true; requestAnimationFrame(() => { pedeS = false; mede(); }); } }, { passive: true });
    ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach((ev) => trilhoS.addEventListener(ev, para, { passive: true }));
    itens.forEach((el, i) => el.addEventListener('click', () => { para(); vai(i); }));
    $$('.seg-seta').forEach((b) => b.addEventListener('click', () => { para(); vai(atual + (+b.dataset.seg)); }));
    addEventListener('resize', mede);
    vai(1, false); mede();
    if (!calmo && 'IntersectionObserver' in window) new IntersectionObserver((es) => {
      clearInterval(timer);
      if (es[0].isIntersecting && !mexeu) timer = setInterval(() => vai(atual + 1), 3200);
    }, { threshold: 0.4 }).observe(trilhoS);
  })();

  // ---------------------------------------------------------------- capa: vídeo de fundo (só toca se o aparelho permitir movimento)
  (function () {
    const v = $('#capa-video'); if (!v) return;
    if (calmo) { v.removeAttribute('loop'); return; }
    v.play().catch(() => {});
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { if (es[0].isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.05 }).observe(v);
  })();

  // ---------------------------------------------------------------- o Live espia pela borda da tela enquanto a pessoa rola
  (function () {
    const esp = $('#espiao'), bal = $('#balao'); if (!esp || calmo || !window.LiveMascote) return;
    let lv = null; try { lv = LiveMascote.criar($('#espiao-live'), { sombra: false, flutuar: true, expressao: 'feliz', rotulo: 'Live' }); } catch (e) { return; }
    const FALAS = { segmentos: 'Seu negócio está aqui? 👀', pagamentos: 'Pagou, caiu no painel! 💸', ecossistema: 'Tudo isso conversa entre si 🔗', livefood: 'Bora vender em todo canal? 🚀', atendimento: 'Eu respondo no WhatsApp 24h 😉', livepro: 'Lucro de verdade, sem planilha 📈', livefest: 'O rosto é o ingresso! 🎉', livebank: 'Taxa na ponta do lápis ✏️', planos: 'Escolhe um e vem comigo! 🧡' };
    const secs = Object.keys(FALAS).map((id) => document.getElementById(id)).filter(Boolean);
    let ultima = '', tSai = null, tBal = null, lado = 0;
    function aparece(id) {
      if (id === ultima) return; ultima = id; lado = 1 - lado;
      clearTimeout(tSai); clearTimeout(tBal); bal.classList.remove('on'); esp.classList.remove('fora');
      setTimeout(() => {
        esp.classList.toggle('esq', lado === 1 && innerWidth > 720); bal.classList.toggle('esq', esp.classList.contains('esq'));
        requestAnimationFrame(() => requestAnimationFrame(() => { esp.classList.add('fora'); try { lv.expressao('animado'); lv.piscar(); } catch (e) {} }));
        tBal = setTimeout(() => { bal.textContent = FALAS[id]; bal.classList.add('on'); try { lv.falar(FALAS[id]); } catch (e) {} }, 700);
        tSai = setTimeout(() => { bal.classList.remove('on'); esp.classList.remove('fora'); }, 5200);
      }, 450);
    }
    if ('IntersectionObserver' in window) {
      const o = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) aparece(e.target.id); }), { rootMargin: '-45% 0px -45% 0px' });
      secs.forEach((el) => o.observe(el));
    }
    esp.addEventListener('click', () => { try { lv.gesto('piscadinha'); } catch (e) {} bal.classList.add('on'); clearTimeout(tSai); tSai = setTimeout(() => { bal.classList.remove('on'); esp.classList.remove('fora'); }, 3200); });
  })();

  // confete simples para o "conta criada" do cadastro (usado pelo planos.js)
  window.LFConfete = function (x, y) {
    if (calmo) return;
    const cores = ['#FF5A00', '#FF3D5E', '#FF2D87', '#FFB800', '#0E0E11'];
    for (let i = 0; i < 46; i++) {
      const p = document.createElement('i'), a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 260;
      p.style.cssText = 'position:fixed;z-index:400;left:' + x + 'px;top:' + y + 'px;width:9px;height:9px;border-radius:' + (i % 3 ? '2px' : '50%') + ';background:' + cores[i % cores.length] + ';pointer-events:none';
      document.body.appendChild(p);
      p.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * d + 'px,' + (Math.sin(a) * d + 220) + 'px) rotate(' + (Math.random() * 720 - 360) + 'deg)', opacity: 0 }], { duration: 1100 + Math.random() * 700, easing: 'cubic-bezier(.16,1,.3,1)' }).onfinish = () => p.remove();
    }
  };
})();
