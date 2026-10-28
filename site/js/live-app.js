/* Live nos apps (cardápio do cliente e app do garçom): abertura e comemoração.
   Usa o mesmo personagem do site (site/js/live-mascote.js). Fundo branco + logo laranja da LiveFood.

   Abertura: basta ter no HTML, logo depois do <body>, o bloco #lf-abertura (ele aparece antes de qualquer script).
     data-minimo="1600"  tempo mínimo na tela (ms)
     data-esperar="1"    só sai quando a página chamar LiveApp.pronto() (ex.: cardápio carregado)
   Comemoração: LiveApp.comemorar({ titulo, sub, ms }) → overlay com o Live girando e confete de comida. */
(function () {
  'use strict';

  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const molaEase = (p) => 1 + 2.70158 * Math.pow(p - 1, 3) + 1.70158 * Math.pow(p - 1, 2);

  // estilos do personagem e das animações (os apps não carregam o CSS do site)
  const css = `
  .live-mascote{position:relative;width:100%;aspect-ratio:220/230}
  .live-corpo{position:absolute;inset:0;transform-origin:50% 46%;will-change:transform}
  .live-corpo svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 14px 22px rgba(120,50,0,.22))}
  .live-rosto{position:absolute;border-radius:14% / 18%}
  .live-sombra{position:absolute;left:22%;right:22%;bottom:-6%;height:9%;border-radius:50%;background:radial-gradient(closest-side,rgba(60,30,10,.35),transparent)}
  #lf-abertura.sai{opacity:0;visibility:hidden;transform:scale(1.04)}
  #lf-abertura .lfa-barra{width:120px;height:3px;border-radius:3px;background:#FFE3D1;overflow:hidden}
  #lf-abertura .lfa-barra i{display:block;height:100%;width:30%;border-radius:3px;background:#FF5A00;animation:lfaBarra 1.1s ease-in-out infinite}
  @keyframes lfaBarra{0%{transform:translateX(-110%)}100%{transform:translateX(380%)}}
  #lf-abertura img{opacity:0;transform:translateY(10px);transition:opacity .5s .35s,transform .6s .35s cubic-bezier(.16,1,.3,1)}
  #lf-abertura.ok img{opacity:1;transform:none}
  .lfc{position:fixed;inset:0;z-index:2147483001;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;
    background:rgba(255,255,255,.94);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);color:#29231E;font-family:'Manrope','Nunito',-apple-system,system-ui,sans-serif;
    opacity:0;transition:opacity .3s}
  .lfc.on{opacity:1}
  .lfc .lfc-live{width:150px}
  .lfc b{font-size:24px;font-weight:800;line-height:1.15;transform:translateY(16px);opacity:0;transition:all .5s .25s cubic-bezier(.34,1.56,.64,1)}
  .lfc span{font-size:15px;font-weight:700;color:#8C817A;transform:translateY(12px);opacity:0;transition:all .5s .4s cubic-bezier(.16,1,.3,1)}
  .lfc.on b,.lfc.on span{transform:none;opacity:1}
  .lfc small{position:absolute;bottom:26px;font-size:12px;font-weight:700;color:#B5ACA5}
  .lfc-confete{position:fixed;z-index:2147483002;left:0;top:0;font-size:26px;pointer-events:none;will-change:transform}`;
  const st = document.createElement('style');
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  function confete(x, y, n = 28) {
    if (reduzido) return;
    const itens = ['🍔', '🍕', '🍟', '🥤', '⭐', '🧡', '✨'];
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'lfc-confete';
      s.textContent = itens[i % itens.length];
      document.body.appendChild(s);
      const ang = -Math.PI * (0.1 + Math.random() * 0.8), vel = 260 + Math.random() * 380;
      const dx = Math.cos(ang) * vel, dy = Math.sin(ang) * vel;
      const a = s.animate([
        { transform: `translate(${x}px,${y}px) rotate(0deg) scale(.4)`, opacity: 1 },
        { transform: `translate(${x + dx * 0.6}px,${y + dy * 0.6}px) rotate(${(Math.random() - 0.5) * 400}deg) scale(1.1)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${x + dx}px,${y + dy + 560}px) rotate(${(Math.random() - 0.5) * 800}deg) scale(.9)`, opacity: 0 },
      ], { duration: 1300 + Math.random() * 600, easing: 'cubic-bezier(.2,.6,.4,1)' });
      a.onfinish = () => s.remove();
    }
  }

  // ---------------------------------------------------------------------------
  // Abertura
  // ---------------------------------------------------------------------------
  const el = document.getElementById('lf-abertura');
  let prontoRes;
  const pronto = new Promise((r) => { prontoRes = r; });

  async function abertura() {
    if (!el || !window.LiveMascote) return;
    const minimo = Number(el.dataset.minimo) || 1500;
    const esperar = el.dataset.esperar === '1';
    const t0 = Date.now();
    const live = LiveMascote.criar(el.querySelector('.lfa-live'), { sombra: true, expressao: 'surpreso' });
    el.classList.add('ok');
    if (!reduzido) {
      Object.assign(live.P, { y: -160, sx: 0.7, sy: 0.7 });
      await live.animar({ y: 0, sx: 1, sy: 1 }, 700, molaEase);
      live.expressao('animado');
      await live.gesto('boas_vindas');
      await live.gesto('piscadinha');
    }
    const prontoOuLoad = esperar ? pronto : (document.readyState === 'complete' ? Promise.resolve() : new Promise((r) => addEventListener('load', r, { once: true })));
    await Promise.race([prontoOuLoad, espera(4500)]);
    const falta = minimo - (Date.now() - t0);
    if (falta > 0) await espera(falta);
    el.style.transition = 'opacity .45s, visibility .45s, transform .5s';
    el.classList.add('sai');
    setTimeout(() => { live.destruir(); el.remove(); }, 550);
  }
  if (el) {
    if (window.LiveMascote) abertura();
    else el.remove();
  }

  // ---------------------------------------------------------------------------
  // Comemoração (pedido enviado / pago / conta fechada)
  // ---------------------------------------------------------------------------
  let ativa = null;
  function comemorar(op = {}) {
    if (!window.LiveMascote || !document.body) return Promise.resolve();
    if (ativa) ativa.fechar();
    const ms = op.ms || 2600;
    const box = document.createElement('div');
    box.className = 'lfc';
    box.setAttribute('role', 'status');
    box.innerHTML = '<div class="lfc-live"></div><b></b><span></span><small>toque para continuar</small>';
    box.querySelector('b').textContent = op.titulo || 'Pedido enviado!';
    box.querySelector('span').textContent = op.sub || '';
    document.body.appendChild(box);
    const live = LiveMascote.criar(box.querySelector('.lfc-live'), { sombra: true, expressao: 'animado' });
    let fechado = false, timer = null;
    const fim = new Promise((res) => {
      function fechar() {
        if (fechado) return;
        fechado = true; clearTimeout(timer);
        box.classList.remove('on');
        setTimeout(() => { live.destruir(); box.remove(); res(); }, 320);
        if (ativa && ativa.fechar === fechar) ativa = null;
      }
      ativa = { fechar };
      box.addEventListener('click', fechar);
      timer = setTimeout(fechar, ms);
    });
    requestAnimationFrame(() => box.classList.add('on'));
    (async () => {
      if (reduzido) return;
      Object.assign(live.P, { y: 140, sx: 0.5, sy: 0.5 });
      await live.animar({ y: 0, sx: 1, sy: 1 }, 520, molaEase);
      const r = box.querySelector('.lfc-live').getBoundingClientRect();
      confete(r.left + r.width / 2, r.top + r.height / 2);
      await live.gesto('comemorar');
      if (!fechado) live.gesto('piscadinha');
    })();
    return fim;
  }

  window.LiveApp = { pronto: () => prontoRes(), comemorar, confete };
})();
