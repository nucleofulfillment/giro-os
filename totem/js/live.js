/* Live — o personagem do totem LiveFood: uma cabeça de TV flutuante.
   Cabeça em SVG + rosto luminoso desenhado em canvas dentro da tela.
   Quando o modelo 3D (GLB) ficar pronto, só este arquivo muda: a API pública (window.Live) continua igual. */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Rosto (canvas 504 x 384 dentro da tela da TV)
  // ---------------------------------------------------------------------------
  const W = 504, H = 384;
  const OLHO_E = { x: 178, y: 158 }, OLHO_D = { x: 326, y: 158 }, BOCA = { x: 252, y: 272 };

  const EXPRESSOES = {
    feliz: { olhos: ['normal', 'normal'], boca: 'sorriso' },
    animado: { olhos: ['feliz', 'feliz'], boca: 'sorrisao' },
    surpreso: { olhos: ['arregalado', 'arregalado'], boca: 'o' },
    curioso: { olhos: ['linha', 'normal'], boca: 'reta' },
    pensativo: { olhos: ['normal', 'normal'], boca: 'onda', olhar: [0.7, -0.8] },
    envergonhado: { olhos: ['feliz', 'feliz'], boca: 'onda', bochecha: true },
    tonto: { olhos: ['apertado', 'apertado'], boca: 'onda' },
    apaixonado: { olhos: ['coracao', 'coracao'], boca: 'sorriso' },
    piscadinha: { olhos: ['normal', 'feliz'], boca: 'sorriso' },
  };

  // abertura da boca (rx, ry) de cada visema
  const VISEMAS = { A: [28, 24], E: [36, 13], I: [28, 8], O: [19, 22], U: [13, 14], M: [22, 3] };

  const ICONES = {
    hamburguer: ['...XXXXXX...', '.XXXXXXXXXX.', 'XXXX.XXXX.XX', 'XXXXXXXXXXXX', '............', 'XXXXXXXXXXXX', '............', '.XXXXXXXXXX.'],
    batata: ['X..X..X', '.X.X.X.', 'X.X.X.X', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '.XXXXX.', '.XXXXX.'],
    bebida: ['......XX', '.....X..', 'XXXXXXXX', '.XXXXXX.', '.X....X.', '.XXXXXX.', '.XXXXXX.', '..XXXX..'],
    sorvete: ['..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', 'X.X.X.X', '.X.X.X.', '..X.X..', '...X...'],
    check: ['........X', '.......XX', 'X.....XX.', 'XX...XX..', '.XX.XX...', '..XXX....', '...X.....'],
    interrogacao: ['.XXXX.', 'XX..XX', '....XX', '...XX.', '..XX..', '......', '..XX..'],
    coracao: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  };

  // O desenho usa coordenadas 504x384, mas o canvas real é menor (mais leve para o totem)
  const RES = 2 / 3;
  let gradeCache = null, fundoCache = null, ultimoRosto = 0;

  const rosto = {
    olhos: ['normal', 'normal'], boca: 'sorriso', bochecha: false,
    olhar: [0, 0], olharAlvo: [0, 0],
    icone: null, viseme: null, pontos: false, barra: null,
    piscadaInicio: -1, proximaPiscada: 2,
    bocaAtual: [22, 3],
  };
  let ctx = null, iconeTimer = null;

  function retangulo(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function coracao(cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + 26 * s);
    ctx.bezierCurveTo(cx - 44 * s, cy - 4 * s, cx - 26 * s, cy - 38 * s, cx, cy - 16 * s);
    ctx.bezierCurveTo(cx + 26 * s, cy - 38 * s, cx + 44 * s, cy - 4 * s, cx, cy + 26 * s);
    ctx.fill();
  }

  function olho(tipo, cx, cy, abertura, t, direito) {
    ctx.lineWidth = 15;
    switch (tipo) {
      case 'normal': {
        const h = Math.max(10, 82 * abertura);
        retangulo(cx - 29, cy - h / 2, 58, h, Math.min(24, h / 2));
        ctx.fill();
        break;
      }
      case 'linha':
        retangulo(cx - 34, cy - 7 + 6, 68, 14, 7);
        ctx.fill();
        break;
      case 'feliz':
        ctx.beginPath();
        ctx.moveTo(cx - 32, cy + 14);
        ctx.quadraticCurveTo(cx, cy - 40, cx + 32, cy + 14);
        ctx.stroke();
        break;
      case 'arregalado':
        ctx.lineWidth = 12;
        ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
        break;
      case 'apertado': {
        // olhos fechados com força, tipo "> <" (depois de uma trombada)
        const s = direito ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(cx - 26 * s, cy - 24);
        ctx.lineTo(cx + 22 * s, cy);
        ctx.lineTo(cx - 26 * s, cy + 24);
        ctx.stroke();
        break;
      }
      case 'coracao':
        coracao(cx, cy, 1 + Math.sin(t * 8) * 0.08);
        break;
    }
  }

  function boca(tipo, cx, cy) {
    ctx.lineWidth = 12;
    switch (tipo) {
      case 'sorriso':
        ctx.beginPath(); ctx.moveTo(cx - 36, cy - 8); ctx.quadraticCurveTo(cx, cy + 24, cx + 36, cy - 8); ctx.stroke();
        break;
      case 'sorrisao':
        ctx.beginPath(); ctx.moveTo(cx - 44, cy - 14); ctx.quadraticCurveTo(cx, cy + 62, cx + 44, cy - 14); ctx.closePath(); ctx.fill();
        break;
      case 'o':
        ctx.lineWidth = 11;
        ctx.beginPath(); ctx.ellipse(cx, cy, 15, 19, 0, 0, Math.PI * 2); ctx.stroke();
        break;
      case 'reta':
        ctx.beginPath(); ctx.moveTo(cx - 24, cy); ctx.lineTo(cx + 24, cy); ctx.stroke();
        break;
      case 'onda':
        ctx.lineWidth = 10;
        ctx.beginPath();
        for (let x = -44; x <= 44; x += 3) {
          const y = Math.sin((x / 44) * Math.PI * 2) * 7;
          if (x === -44) ctx.moveTo(cx + x, cy + y); else ctx.lineTo(cx + x, cy + y);
        }
        ctx.stroke();
        break;
    }
  }

  function prepararCaches() {
    fundoCache = ctx.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, W * 0.7);
    fundoCache.addColorStop(0, '#241D1B');
    fundoCache.addColorStop(1, '#100C0B');
    // textura de pixels da tela, desenhada uma vez só
    gradeCache = document.createElement('canvas');
    gradeCache.width = ctx.canvas.width;
    gradeCache.height = ctx.canvas.height;
    const g = gradeCache.getContext('2d');
    g.fillStyle = 'rgba(8, 6, 6, 0.24)';
    for (let x = 0; x < gradeCache.width; x += 4) g.fillRect(x, 0, 1, gradeCache.height);
    for (let y = 0; y < gradeCache.height; y += 4) g.fillRect(0, y, gradeCache.width, 1);
  }

  function desenharRosto(t) {
    if (!ctx) return;
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    ctx.fillStyle = fundoCache;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.shadowColor = 'rgba(105, 215, 255, 0.95)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = ctx.strokeStyle = '#E9FCFF';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (rosto.icone) {
      const ic = ICONES[rosto.icone];
      const cel = Math.floor(Math.min(300 / ic[0].length, 230 / ic.length));
      const x0 = W / 2 - (ic[0].length * cel) / 2, y0 = H / 2 - (ic.length * cel) / 2 + Math.sin(t * 6) * 4;
      for (let r = 0; r < ic.length; r++) for (let c = 0; c < ic[0].length; c++) {
        if (ic[r][c] === 'X') { retangulo(x0 + c * cel + 1, y0 + r * cel + 1, cel - 2, cel - 2, 4); ctx.fill(); }
      }
    } else {
      rosto.olhar[0] += (rosto.olharAlvo[0] - rosto.olhar[0]) * 0.15;
      rosto.olhar[1] += (rosto.olharAlvo[1] - rosto.olhar[1]) * 0.15;
      const dx = rosto.olhar[0] * 24, dy = rosto.olhar[1] * 16;

      // piscada: fecha e abre em 150 ms
      let abertura = 1;
      if (rosto.piscadaInicio >= 0) {
        const p = (t - rosto.piscadaInicio) / 0.15;
        if (p >= 1) rosto.piscadaInicio = -1;
        else abertura = 1 - Math.sin(p * Math.PI) * 0.88;
      }
      olho(rosto.olhos[0], OLHO_E.x + dx, OLHO_E.y + dy, abertura, t, false);
      olho(rosto.olhos[1], OLHO_D.x + dx, OLHO_D.y + dy, abertura, t, true);

      const bx = BOCA.x + dx * 0.6, by = BOCA.y + dy * 0.5;
      if (rosto.pontos) {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(bx - 34 + i * 34, by - Math.max(0, Math.sin(t * 7 - i * 0.9)) * 12, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (rosto.barra != null) {
        ctx.lineWidth = 8;
        retangulo(bx - 90, by - 16, 180, 32, 16); ctx.stroke();
        const p = Math.max(0, Math.min(1, rosto.barra));
        if (p > 0.05) { retangulo(bx - 82, by - 8, 164 * p, 16, 8); ctx.fill(); }
      } else if (rosto.viseme) {
        const alvo = VISEMAS[rosto.viseme] || VISEMAS.M;
        rosto.bocaAtual[0] += (alvo[0] - rosto.bocaAtual[0]) * 0.5;
        rosto.bocaAtual[1] += (alvo[1] - rosto.bocaAtual[1]) * 0.5;
        ctx.beginPath();
        ctx.ellipse(bx, by, Math.max(4, rosto.bocaAtual[0]), Math.max(4, rosto.bocaAtual[1]), 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        rosto.bocaAtual = [22, 3];
        boca(rosto.boca, bx, by);
      }

      if (rosto.bochecha) {
        ctx.shadowColor = 'rgba(255, 120, 180, 0.9)';
        ctx.fillStyle = 'rgba(255, 150, 200, 0.55)';
        ctx.beginPath(); ctx.ellipse(OLHO_E.x - 20 + dx, OLHO_E.y + 62 + dy, 26, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(OLHO_D.x + 20 + dx, OLHO_D.y + 62 + dy, 26, 10, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(gradeCache, 0, 0);
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    // faixa de brilho passando
    const faixa = ((t * 90) % (H + 160)) - 80;
    const g = ctx.createLinearGradient(0, faixa - 40, 0, faixa + 40);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(160,230,255,0.05)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, faixa - 40, W, 80);
  }

  // ---------------------------------------------------------------------------
  // Cabeça (SVG). Coordenadas locais com o centro da cabeça em (0,0).
  // ---------------------------------------------------------------------------
  const SVG = `
  <defs>
    <linearGradient id="lv-cab" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FF8A33"/><stop offset=".5" stop-color="#FF5A00"/><stop offset="1" stop-color="#E64800"/>
    </linearGradient>
    <linearGradient id="lv-cab-lado" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".25" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".8" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#6a2400" stop-opacity=".3"/>
    </linearGradient>
    <linearGradient id="lv-moldura" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFF9F0"/><stop offset="1" stop-color="#E5D0B5"/>
    </linearGradient>
  </defs>
  <g id="lv-antena">
    <path d="M-4,-76 L-27,-116" stroke="#FF5A00" stroke-width="10" stroke-linecap="round"/>
    <path d="M4,-76 L27,-116" stroke="#FF5A00" stroke-width="10" stroke-linecap="round"/>
    <rect x="-14" y="-84" width="28" height="15" rx="6" fill="#E84E00"/>
  </g>
  <rect x="-30" y="64" width="60" height="18" rx="8" fill="#D44600"/>
  <rect x="-96" y="-74" width="192" height="148" rx="38" fill="url(#lv-cab)"/>
  <rect x="-96" y="-74" width="192" height="148" rx="38" fill="url(#lv-cab-lado)"/>
  <ellipse cx="-34" cy="-63" rx="48" ry="6" fill="#fff" opacity=".4"/>
  <rect x="-75" y="-59" width="150" height="118" rx="25" fill="url(#lv-moldura)"/>
  <rect x="-64" y="-49" width="128" height="98" rx="18" fill="#100C0B"/>`;
  // o rosto (canvas) fica por cima, como camada HTML que acompanha a cabeça

  // ---------------------------------------------------------------------------
  // Motor de animação
  // ---------------------------------------------------------------------------
  const CONVERSA = { x: 540, y: 690, escala: 2.7, chao: 1090 };
  const BASE = { giro: 0, salto: 0, sx: 1, sy: 1, sombra: 1 };

  const P = { x: -400, y: 900, escala: 2.7, chao: 1090, ...BASE, sombra: 0 };
  let tweens = [];
  let oscs = {};
  const el = {};
  const CANCELADO = Symbol('cancelado');

  const suave = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const rapido = (p) => 1 - Math.pow(1 - p, 3);
  const cai = (p) => p * p;
  const mola = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const sorteio = (a, b) => a + Math.random() * (b - a);

  function animar(alvo, ms = 400, ease = suave) {
    return new Promise((res) => {
      for (const tw of tweens) for (const k in alvo) delete tw.alvo[k];
      const de = {};
      for (const k in alvo) de[k] = P[k];
      tweens.push({ de, alvo: { ...alvo }, ms: Math.max(1, ms), t0: performance.now(), ease, res });
    });
  }
  const repouso = (ms = 400) => animar({ giro: 0, salto: 0, sx: 1, sy: 1 }, ms, suave);

  function atualizarTweens(agora) {
    tweens = tweens.filter((tw) => {
      const chaves = Object.keys(tw.alvo);
      if (!chaves.length) { tw.res(); return false; }
      const p = Math.min(1, (agora - tw.t0) / tw.ms);
      const e = tw.ease(p);
      for (const k of chaves) P[k] = tw.de[k] + (tw.alvo[k] - tw.de[k]) * e;
      if (p >= 1) { tw.res(); return false; }
      return true;
    });
  }

  let antA = 0, antV = 0, ultimo = null;

  function aplicar(t) {
    const F = { ...P };
    const somar = (o) => { for (const k in o) F[k] = (F[k] || 0) + o[k]; };
    // flutuando no ar
    somar({ salto: Math.sin(t * 1.8) * 14, giro: Math.sin(t * 1.1) * 2.5 });
    for (const k in oscs) somar(oscs[k](t));

    const y = F.y + F.salto;
    el.root.setAttribute('transform', `translate(${F.x} ${y}) rotate(${F.giro}) scale(${F.escala * F.sx} ${F.escala * F.sy})`);
    el.tela.style.transform = `translate(${F.x}px, ${y}px) rotate(${F.giro}deg) scale(${F.escala * F.sx}, ${F.escala * F.sy}) translate(-63px, -48px)`;
    const altura = Math.max(0, F.chao - y);
    const s = Math.max(0.4, 1.25 - altura / 900);
    el.sombra.setAttribute('transform', `translate(${F.x} ${F.chao}) scale(${F.escala * s} ${F.escala * s})`);
    el.sombra.setAttribute('opacity', String(Math.max(0, 0.22 * s * F.sombra)));

    // antena com "mola": balança quando ele se mexe
    if (ultimo) {
      const empurrao = (F.giro - ultimo.giro) * 0.9 + (F.x - ultimo.x) * 0.04 + (y - ultimo.y) * 0.05;
      antV += -antA * 0.12 - antV * 0.12 - empurrao * 0.6;
      antA = Math.max(-30, Math.min(30, antA + antV));
    }
    ultimo = { giro: F.giro, x: F.x, y };
    el.antena.setAttribute('transform', `rotate(${antA + Math.sin(t * 2.6) * 2 + (F.antena || 0)} 0 -76)`);
  }

  function quadro(ms) {
    const t = ms / 1000;
    atualizarTweens(ms);
    if (t > rosto.proximaPiscada) {
      rosto.piscadaInicio = t;
      rosto.proximaPiscada = t + (Math.random() < 0.2 ? 0.3 : sorteio(2.2, 5));
    }
    aplicar(t);
    // o rosto é redesenhado a ~30 quadros por segundo (o corpo continua a 60)
    if (ms - ultimoRosto > 32) { ultimoRosto = ms; desenharRosto(t); }
    requestAnimationFrame(quadro);
  }

  // ---------------------------------------------------------------------------
  // Rosto: API
  // ---------------------------------------------------------------------------
  function expressao(nome) {
    const e = EXPRESSOES[nome] || EXPRESSOES.feliz;
    rosto.olhos = e.olhos.slice();
    rosto.boca = e.boca;
    rosto.bochecha = !!e.bochecha;
    if (e.olhar) olhar(e.olhar[0], e.olhar[1]);
  }
  function olhar(x, y) { rosto.olharAlvo = [x, y]; }
  function icone(nome, ms = 1500) {
    clearTimeout(iconeTimer);
    rosto.icone = ICONES[nome] ? nome : null;
    if (rosto.icone && ms) iconeTimer = setTimeout(() => { rosto.icone = null; }, ms);
  }
  function piscarAgora() { rosto.proximaPiscada = 0; }

  // ---------------------------------------------------------------------------
  // Gestos (só com a cabeça)
  // ---------------------------------------------------------------------------
  const GESTOS = {
    async nenhum() {},
    async acenar() {
      oscs.aceno = (t) => ({ giro: Math.sin(t * 9) * 10, antena: Math.sin(t * 18) * 14 });
      await animar({ salto: -30 }, 250, rapido);
      await animar({ salto: 0 }, 300, mola);
      await espera(800);
      delete oscs.aceno;
      await repouso(300);
    },
    async boas_vindas() {
      await animar({ salto: -55, sx: 0.94, sy: 1.08 }, 260, rapido);
      await animar({ salto: 0, sx: 1.06, sy: 0.94 }, 260, cai);
      await animar({ sx: 1, sy: 1 }, 300, mola);
    },
    async sugerir() {
      olhar(0.9, 0.1);
      await animar({ giro: 9, x: P.x - 30 }, 380, mola);
      await espera(1400);
      olhar(0, 0);
      await animar({ giro: 0, x: CONVERSA.x }, 400, suave);
    },
    async apontar_pedido() {
      olhar(0, 1);
      await animar({ salto: 18, giro: -4 }, 300, mola);
      oscs.aceno = (t) => ({ salto: Math.abs(Math.sin(t * 7)) * 8 });
      await espera(1100);
      delete oscs.aceno;
      olhar(0, 0);
      await repouso();
    },
    async comemorar() {
      await animar({ salto: -90, sx: 0.92, sy: 1.1 }, 300, rapido);
      await animar({ giro: 360 }, 520, suave);
      P.giro = 0;
      await animar({ salto: 0, sx: 1.1, sy: 0.9 }, 260, cai);
      await animar({ sx: 1, sy: 1 }, 300, mola);
    },
    async confuso() {
      oscs.confuso = (t) => ({ giro: Math.sin(t * 14) * 4, antena: -18 });
      await animar({ giro: 14 }, 300, mola);
      await espera(1000);
      delete oscs.confuso;
      await repouso();
    },
  };
  // nomes antigos continuam valendo
  GESTOS.cocar_cabeca = GESTOS.confuso;
  GESTOS.apontar_cardapio = GESTOS.sugerir;

  function gesto(nome) {
    return (GESTOS[nome] || GESTOS.nenhum)();
  }

  // trombada atrapalhada: bate, achata, gira tonto e se recompõe
  async function trombar(lado = 1) {
    expressao('surpreso');
    await animar({ sx: 0.78, sy: 1.12, giro: -lado * 8 }, 90, rapido);
    await animar({ x: P.x - lado * 70, sx: 1.08, sy: 0.94, giro: -lado * 25 }, 260, rapido);
    expressao('tonto');
    oscs.tonto = (t) => ({ giro: Math.sin(t * 5) * 9 });
    await animar({ sx: 1, sy: 1 }, 400, mola);
    await espera(1100);
    delete oscs.tonto;
    expressao('envergonhado');
    oscs.balanca = (t) => ({ giro: Math.sin(t * 16) * 5 });
    await espera(500);
    delete oscs.balanca;
    await animar({ giro: 0 }, 300, mola);
  }

  // ---------------------------------------------------------------------------
  // Standby: espiando pelas bordas da tela
  // ---------------------------------------------------------------------------
  const FRASES_ESPIAR = ['Psiu! Tô aqui!', 'Tá com fome? 👀', 'Toca na tela que eu te atendo!', 'Hoje tem X-Live quentinho!', 'Ei, você! Bora pedir?', 'Achou que eu não tava vendo? 😄'];
  const MEIA = 96; // meia largura da cabeça em unidades locais
  let tokStandby = null;

  function cabecaNaTela() {
    return { x: P.x, y: P.y + P.salto, topo: P.y + P.salto - 125 * P.escala };
  }

  function balao(texto, ms = 1800) {
    if (Live.aoBalao) Live.aoBalao(texto, cabecaNaTela(), ms);
  }

  async function espiarLado(lado, ck) {
    // lado -1 = borda esquerda, 1 = borda direita
    const esc = 2.6, meia = MEIA * esc;
    const fora = lado < 0 ? -meia - 80 : 1080 + meia + 80;
    const dentro = lado < 0 ? meia * 0.15 : 1080 - meia * 0.15;
    Object.assign(P, { x: fora, y: sorteio(380, 1500), escala: esc, giro: -lado * 22, sombra: 0 });
    expressao('curioso');
    olhar(-lado, 0);
    await animar({ x: dentro }, 900, mola); ck();
    piscarAgora();
    await espera(900); ck();
    if (Math.random() < 0.5) {
      // esconde rapidinho e volta (esconde-esconde)
      expressao('surpreso');
      await animar({ x: fora }, 220, rapido); ck();
      await espera(600); ck();
      expressao('animado');
      await animar({ x: dentro }, 420, mola); ck();
    }
    expressao('feliz');
    olhar(-lado, 0.2);
    if (Math.random() < 0.7) balao(window.Frase ? window.Frase('espiando') : FRASES_ESPIAR[Math.floor(Math.random() * FRASES_ESPIAR.length)]);
    await espera(1800); ck();
    expressao('piscadinha');
    await espera(500); ck();
    await animar({ x: fora }, 500, suave); ck();
  }

  async function espiarBaixo(ck) {
    const esc = 2.6;
    const x = sorteio(260, 820);
    Object.assign(P, { x, y: 1920 + 240, escala: esc, giro: sorteio(-10, 10), sombra: 0 });
    expressao('curioso');
    olhar(0, -1);
    await animar({ y: 1835 }, 800, mola); ck();
    await espera(700); ck();
    olhar(Math.random() < 0.5 ? -1 : 1, -0.6);
    await espera(700); ck();
    expressao('animado');
    olhar(0, -0.6);
    balao('Oi! 👋', 1300);
    await animar({ y: 1760 }, 300, mola); ck();
    await espera(1100); ck();
    await animar({ y: 1920 + 240 }, 450, suave); ck();
  }

  async function atravessar(ck) {
    // passa voando pela tela, se distrai e bate na borda
    const esc = 2.2, meia = MEIA * esc;
    const lado = Math.random() < 0.5 ? 1 : -1;
    const y = sorteio(1440, 1640); // passa por baixo do texto da tela de espera, sem cobrir
    Object.assign(P, { x: lado > 0 ? -meia - 60 : 1080 + meia + 60, y, escala: esc, giro: lado * 6, sombra: 0 });
    expressao('feliz');
    olhar(lado, 0);
    oscs.voo = (t) => ({ salto: Math.sin(t * 6) * 20 });
    await animar({ x: 540 }, 1300, suave); ck();
    olhar(0, 0.1);
    expressao('animado');
    await espera(500); ck();
    olhar(-lado, 0); // olhou pra trás...
    await animar({ x: lado > 0 ? 1080 - meia + 10 : meia - 10 }, 700, cai); ck();
    delete oscs.voo;
    await trombar(lado); ck();
    balao('Ai! Essa parede tava aí? 😅', 1800);
    await espera(1300); ck();
    expressao('feliz');
    await animar({ x: lado > 0 ? 1080 + meia + 60 : -meia - 60, giro: lado * 10 }, 700, suave); ck();
  }

  async function standby() {
    pararStandby();
    const tok = { ativo: true };
    tokStandby = tok;
    const ck = () => { if (!tok.ativo) throw CANCELADO; };
    tweens.forEach((tw) => tw.res());
    tweens = [];
    oscs = {};
    rosto.icone = null; rosto.pontos = false; rosto.barra = null; rosto.viseme = null;
    expressao('feliz');
    olhar(0, 0);
    try {
      // sai de cena pelo lado mais próximo
      const saida = P.x < 540 ? -400 : 1480;
      await animar({ x: saida, sombra: 0, giro: 0, salto: 0, sx: 1, sy: 1 }, 650, suave);
      const roteiro = [espiarLado, espiarBaixo, espiarLado, atravessar];
      let i = Math.floor(Math.random() * roteiro.length);
      while (tok.ativo) {
        await espera(sorteio(900, 2200)); ck();
        const passo = roteiro[i++ % roteiro.length];
        if (passo === espiarLado) await espiarLado(Math.random() < 0.5 ? -1 : 1, ck);
        else await passo(ck);
      }
    } catch (e) {
      if (e !== CANCELADO) throw e;
    }
  }

  function pararStandby() {
    if (tokStandby) tokStandby.ativo = false;
    tokStandby = null;
  }

  // ---------------------------------------------------------------------------
  // Conversa
  // ---------------------------------------------------------------------------
  async function entrar() {
    pararStandby();
    oscs = {};
    expressao('surpreso');
    olhar(0, 0);
    // se estiver escondido fora da tela, entra pelo lado mais perto
    if (P.x < 0 || P.x > 1080 || P.y > 1920) {
      const lado = P.x > 540 ? 1 : -1;
      Object.assign(P, { x: lado > 0 ? 1400 : -320, y: CONVERSA.y + 200, giro: lado * -20, escala: CONVERSA.escala });
    }
    const atrapalhado = Math.random() < 0.35;
    await animar({ x: CONVERSA.x + (atrapalhado ? 0 : 0), y: CONVERSA.y, escala: CONVERSA.escala, chao: CONVERSA.chao, giro: 0, sombra: 1, sx: 1, sy: 1, salto: 0 }, 750, atrapalhado ? rapido : mola);
    if (atrapalhado) {
      // freou tarde demais e quicou no "chão" invisível
      await animar({ salto: 60, sx: 1.15, sy: 0.85 }, 140, cai);
      expressao('tonto');
      await animar({ salto: 0, sx: 1, sy: 1 }, 500, mola);
      await espera(700);
      expressao('envergonhado');
      await espera(500);
    }
    expressao('animado');
  }

  async function sair() {
    oscs = {};
    rosto.pontos = false; rosto.barra = null; rosto.viseme = null; rosto.icone = null;
    expressao('feliz');
    standby();
  }

  function falando(on) {
    if (on) oscs.fala = (t) => ({ salto: Math.sin(t * 7) * 3, giro: Math.sin(t * 2.4) * 2.5 });
    else delete oscs.fala;
  }

  function ouvindo(on) {
    if (on) {
      expressao('feliz');
      olhar(0, 0.15);
      oscs.ouvir = () => ({ giro: 7 });
    } else {
      delete oscs.ouvir;
    }
  }

  function pensando(on) {
    rosto.pontos = on;
    if (on) {
      olhar(0.7, -0.8);
      oscs.pensar = (t) => ({ giro: -6 + Math.sin(t * 1.5) * 2 });
    } else {
      delete oscs.pensar;
      olhar(0, 0);
    }
  }

  async function cocegas() {
    expressao('animado');
    oscs.riso = (t) => ({ giro: Math.sin(t * 30) * 6, salto: Math.sin(t * 22) * 6 });
    await espera(900);
    delete oscs.riso;
    await repouso(300);
  }

  // travessura quando ninguém fala nada por um tempo
  async function travessura() {
    const r = Math.random();
    if (r < 0.4) {
      // tenta pegar a própria antena
      olhar(0, -1);
      expressao('curioso');
      await animar({ giro: -18 }, 400, mola);
      await animar({ giro: 18 }, 500, suave);
      await animar({ giro: -360 + 18 }, 700, suave);
      P.giro = 18;
      expressao('tonto');
      await animar({ giro: 0 }, 500, mola);
      await espera(700);
      expressao('envergonhado');
      await espera(600);
    } else if (r < 0.7) {
      // cochilo rápido
      rosto.olhos = ['linha', 'linha'];
      rosto.boca = 'o';
      await animar({ salto: 40, giro: 10 }, 1200, suave);
      await espera(900);
      expressao('surpreso');
      await animar({ salto: -40, giro: 0 }, 200, rapido);
      await animar({ salto: 0 }, 300, mola);
      expressao('envergonhado');
      await espera(700);
    } else {
      await trombar(1);
      await animar({ x: CONVERSA.x }, 500, suave);
    }
    expressao('feliz');
    olhar(0, 0);
  }

  // ---------------------------------------------------------------------------
  // Montagem
  // ---------------------------------------------------------------------------
  function montar(grupo, sombra, tela) {
    grupo.innerHTML = SVG;
    tela.width = Math.round(W * RES);
    tela.height = Math.round(H * RES);
    Object.assign(el, { root: grupo, sombra, tela, antena: grupo.querySelector('#lv-antena') });
    ctx = tela.getContext('2d');
    prepararCaches();
    requestAnimationFrame(quadro);
  }

  const Live = {
    montar, standby, pararStandby, entrar, sair,
    expressao, olhar, icone, gesto, trombar, travessura, falando, ouvindo, pensando, cocegas,
    viseme(v) { rosto.viseme = v; },
    barra(p) { rosto.barra = p; },
    cabecaNaTela,
    aoBalao: null,
  };
  window.Live = Live;
})();
