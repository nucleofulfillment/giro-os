/* Live — o personagem oficial da LiveFood, versão para o site.
   Mesmo desenho do totem (live-totem/js/live.js): cabeça de TV em SVG + rosto luminoso em canvas,
   mesmas expressões, piscadas, antena com mola e gestos. Aqui ele vira um componente:
   cada LiveMascote.criar(elemento) monta uma instância independente (hero, totem, planos, espião…).
   Quando o modelo 3D / vídeos ficarem prontos, só este arquivo muda: a API de cada instância continua igual. */
(function () {
  'use strict';

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
  const VISEMAS = { A: [28, 24], E: [36, 13], I: [28, 8], O: [19, 22], U: [13, 14], M: [22, 3] };
  const ICONES = {
    hamburguer: ['...XXXXXX...', '.XXXXXXXXXX.', 'XXXX.XXXX.XX', 'XXXXXXXXXXXX', '............', 'XXXXXXXXXXXX', '............', '.XXXXXXXXXX.'],
    batata: ['X..X..X', '.X.X.X.', 'X.X.X.X', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '.XXXXX.', '.XXXXX.'],
    bebida: ['......XX', '.....X..', 'XXXXXXXX', '.XXXXXX.', '.X....X.', '.XXXXXX.', '.XXXXXX.', '..XXXX..'],
    check: ['........X', '.......XX', 'X.....XX.', 'XX...XX..', '.XX.XX...', '..XXX....', '...X.....'],
    interrogacao: ['.XXXX.', 'XX..XX', '....XX', '...XX.', '..XX..', '......', '..XX..'],
    coracao: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  };
  const RES = 2 / 3;

  const suave = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const rapido = (p) => 1 - Math.pow(1 - p, 3);
  const cai = (p) => p * p;
  const mola = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const sorteio = (a, b) => a + Math.random() * (b - a);
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)');

  let contador = 0;
  const instancias = new Set();

  function svgCabeca(s) {
    return `
    <defs>
      <linearGradient id="lv-cab${s}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FF8A33"/><stop offset=".5" stop-color="#FF5A00"/><stop offset="1" stop-color="#E64800"/>
      </linearGradient>
      <linearGradient id="lv-cab-lado${s}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".25" stop-color="#fff" stop-opacity="0"/>
        <stop offset=".8" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#6a2400" stop-opacity=".3"/>
      </linearGradient>
      <linearGradient id="lv-moldura${s}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFF9F0"/><stop offset="1" stop-color="#E5D0B5"/>
      </linearGradient>
    </defs>
    <g class="lv-antena">
      <path d="M-4,-76 L-27,-116" stroke="#FF5A00" stroke-width="10" stroke-linecap="round"/>
      <path d="M4,-76 L27,-116" stroke="#FF5A00" stroke-width="10" stroke-linecap="round"/>
      <rect x="-14" y="-84" width="28" height="15" rx="6" fill="#E84E00"/>
    </g>
    <rect x="-30" y="64" width="60" height="18" rx="8" fill="#D44600"/>
    <rect x="-96" y="-74" width="192" height="148" rx="38" fill="url(#lv-cab${s})"/>
    <rect x="-96" y="-74" width="192" height="148" rx="38" fill="url(#lv-cab-lado${s})"/>
    <ellipse cx="-34" cy="-63" rx="48" ry="6" fill="#fff" opacity=".4"/>
    <rect x="-75" y="-59" width="150" height="118" rx="25" fill="url(#lv-moldura${s})"/>
    <rect x="-64" y="-49" width="128" height="98" rx="18" fill="#100C0B"/>`;
  }

  // caixa do desenho: x -110…110, y -130…100 (a cabeça com antena cabe inteira, com folga para girar)
  const VB = { x: -110, y: -130, w: 220, h: 230 };

  function criar(alvo, opcoes = {}) {
    const id = ++contador;
    const op = { seguirMouse: false, sombra: true, flutuar: true, ...opcoes };

    const raiz = document.createElement('div');
    raiz.className = 'live-mascote';
    raiz.setAttribute('role', 'img');
    raiz.setAttribute('aria-label', op.rotulo || 'Live, o mascote da LiveFood');
    raiz.innerHTML = `
      ${op.sombra ? '<div class="live-sombra"></div>' : ''}
      <div class="live-corpo">
        <svg viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" aria-hidden="true">${svgCabeca(id)}</svg>
        <canvas class="live-rosto" aria-hidden="true"></canvas>
      </div>`;
    alvo.appendChild(raiz);

    const corpo = raiz.querySelector('.live-corpo');
    const antena = raiz.querySelector('.lv-antena');
    const sombra = raiz.querySelector('.live-sombra');
    const tela = raiz.querySelector('canvas');
    // a tela do rosto ocupa o retângulo -63,-48 (126 x 96) do desenho
    Object.assign(tela.style, {
      left: ((-63 - VB.x) / VB.w) * 100 + '%', top: ((-48 - VB.y) / VB.h) * 100 + '%',
      width: (126 / VB.w) * 100 + '%', height: (96 / VB.h) * 100 + '%',
    });
    tela.width = Math.round(W * RES);
    tela.height = Math.round(H * RES);
    const ctx = tela.getContext('2d');

    const rosto = {
      olhos: ['normal', 'normal'], boca: 'sorriso', bochecha: false,
      olhar: [0, 0], olharAlvo: [0, 0], icone: null, viseme: null, pontos: false,
      piscadaInicio: -1, proximaPiscada: 1 + Math.random() * 2, bocaAtual: [22, 3],
    };

    // ----- desenho do rosto (igual ao totem) -----
    const fundo = ctx.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, W * 0.7);
    fundo.addColorStop(0, '#241D1B');
    fundo.addColorStop(1, '#100C0B');
    const grade = document.createElement('canvas');
    grade.width = tela.width; grade.height = tela.height;
    const gg = grade.getContext('2d');
    gg.fillStyle = 'rgba(8, 6, 6, 0.24)';
    for (let x = 0; x < grade.width; x += 4) gg.fillRect(x, 0, 1, grade.height);
    for (let y = 0; y < grade.height; y += 4) gg.fillRect(0, y, grade.width, 1);

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
        case 'normal': { const h = Math.max(10, 82 * abertura); retangulo(cx - 29, cy - h / 2, 58, h, Math.min(24, h / 2)); ctx.fill(); break; }
        case 'linha': retangulo(cx - 34, cy - 1, 68, 14, 7); ctx.fill(); break;
        case 'feliz': ctx.beginPath(); ctx.moveTo(cx - 32, cy + 14); ctx.quadraticCurveTo(cx, cy - 40, cx + 32, cy + 14); ctx.stroke(); break;
        case 'arregalado':
          ctx.lineWidth = 12;
          ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
          break;
        case 'apertado': {
          const s = direito ? -1 : 1;
          ctx.beginPath(); ctx.moveTo(cx - 26 * s, cy - 24); ctx.lineTo(cx + 22 * s, cy); ctx.lineTo(cx - 26 * s, cy + 24); ctx.stroke();
          break;
        }
        case 'coracao': coracao(cx, cy, 1 + Math.sin(t * 8) * 0.08); break;
      }
    }
    function boca(tipo, cx, cy) {
      ctx.lineWidth = 12;
      switch (tipo) {
        case 'sorriso': ctx.beginPath(); ctx.moveTo(cx - 36, cy - 8); ctx.quadraticCurveTo(cx, cy + 24, cx + 36, cy - 8); ctx.stroke(); break;
        case 'sorrisao': ctx.beginPath(); ctx.moveTo(cx - 44, cy - 14); ctx.quadraticCurveTo(cx, cy + 62, cx + 44, cy - 14); ctx.closePath(); ctx.fill(); break;
        case 'o': ctx.lineWidth = 11; ctx.beginPath(); ctx.ellipse(cx, cy, 15, 19, 0, 0, Math.PI * 2); ctx.stroke(); break;
        case 'reta': ctx.beginPath(); ctx.moveTo(cx - 24, cy); ctx.lineTo(cx + 24, cy); ctx.stroke(); break;
        case 'onda':
          ctx.lineWidth = 10; ctx.beginPath();
          for (let x = -44; x <= 44; x += 3) { const y = Math.sin((x / 44) * Math.PI * 2) * 7; if (x === -44) ctx.moveTo(cx + x, cy + y); else ctx.lineTo(cx + x, cy + y); }
          ctx.stroke();
          break;
      }
    }
    function desenharRosto(t) {
      ctx.setTransform(RES, 0, 0, RES, 0, 0);
      ctx.fillStyle = fundo;
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
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(bx - 34 + i * 34, by - Math.max(0, Math.sin(t * 7 - i * 0.9)) * 12, 10, 0, Math.PI * 2); ctx.fill(); }
        } else if (rosto.viseme) {
          const alvoV = VISEMAS[rosto.viseme] || VISEMAS.M;
          rosto.bocaAtual[0] += (alvoV[0] - rosto.bocaAtual[0]) * 0.5;
          rosto.bocaAtual[1] += (alvoV[1] - rosto.bocaAtual[1]) * 0.5;
          ctx.beginPath(); ctx.ellipse(bx, by, Math.max(4, rosto.bocaAtual[0]), Math.max(4, rosto.bocaAtual[1]), 0, 0, Math.PI * 2); ctx.fill();
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
      ctx.drawImage(grade, 0, 0);
      ctx.setTransform(RES, 0, 0, RES, 0, 0);
      const faixa = ((t * 90) % (H + 160)) - 80;
      const g = ctx.createLinearGradient(0, faixa - 40, 0, faixa + 40);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(160,230,255,0.05)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, faixa - 40, W, 80);
    }

    // ----- motor de animação (unidades do desenho; 1 unidade = largura/220) -----
    const P = { x: 0, y: 0, giro: 0, salto: 0, sx: 1, sy: 1 };
    let tweens = [], oscs = {}, antA = 0, antV = 0, ultimo = null, ultimoRosto = 0, visivel = true, k = 1;

    function animar(alvoP, ms = 400, ease = suave) {
      return new Promise((res) => {
        for (const tw of tweens) for (const c in alvoP) delete tw.alvo[c];
        const de = {};
        for (const c in alvoP) de[c] = P[c];
        tweens.push({ de, alvo: { ...alvoP }, ms: Math.max(1, ms), t0: performance.now(), ease, res });
      });
    }
    const repouso = (ms = 400) => animar({ giro: 0, salto: 0, sx: 1, sy: 1, x: 0 }, ms, suave);

    function quadro(ms) {
      const t = ms / 1000;
      tweens = tweens.filter((tw) => {
        const chaves = Object.keys(tw.alvo);
        if (!chaves.length) { tw.res(); return false; }
        const p = Math.min(1, (ms - tw.t0) / tw.ms);
        const e = tw.ease(p);
        for (const c of chaves) P[c] = tw.de[c] + (tw.alvo[c] - tw.de[c]) * e;
        if (p >= 1) { tw.res(); return false; }
        return true;
      });
      if (!visivel) return;
      if (t > rosto.proximaPiscada) {
        rosto.piscadaInicio = t;
        rosto.proximaPiscada = t + (Math.random() < 0.2 ? 0.3 : sorteio(2.2, 5));
      }
      const F = { ...P, antena: 0 };
      if (op.flutuar && !reduzido.matches) { F.salto += Math.sin(t * 1.8 + id) * 5; F.giro += Math.sin(t * 1.1 + id) * 2.5; }
      for (const c in oscs) { const o = oscs[c](t); for (const kk in o) F[kk] = (F[kk] || 0) + o[kk]; }
      const y = F.y + F.salto;
      corpo.style.transform = `translate3d(${F.x * k}px, ${y * k}px, 0) rotate(${F.giro}deg) scale(${F.sx}, ${F.sy})`;
      if (sombra) {
        const s = Math.max(0.45, 1 - Math.max(0, -F.salto) / 120);
        sombra.style.transform = `translateX(${F.x * k}px) scale(${s})`;
        sombra.style.opacity = String(0.55 * s);
      }
      if (ultimo) {
        const empurrao = (F.giro - ultimo.giro) * 0.9 + (F.x - ultimo.x) * 0.1 + (y - ultimo.y) * 0.14;
        antV += -antA * 0.12 - antV * 0.12 - empurrao * 0.6;
        antA = Math.max(-30, Math.min(30, antA + antV));
      }
      ultimo = { giro: F.giro, x: F.x, y };
      antena.setAttribute('transform', `rotate(${antA + Math.sin(t * 2.6) * 2 + F.antena} 0 -76)`);
      if (ms - ultimoRosto > 32) { ultimoRosto = ms; desenharRosto(t); }
    }

    // ----- API do rosto -----
    function expressao(nome) {
      const e = EXPRESSOES[nome] || EXPRESSOES.feliz;
      rosto.olhos = e.olhos.slice();
      rosto.boca = e.boca;
      rosto.bochecha = !!e.bochecha;
      if (e.olhar) olhar(e.olhar[0], e.olhar[1]);
    }
    function olhar(x, y) { rosto.olharAlvo = [Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))]; }
    let iconeTimer = null;
    function icone(nome, ms = 1500) {
      clearTimeout(iconeTimer);
      rosto.icone = ICONES[nome] ? nome : null;
      if (rosto.icone && ms) iconeTimer = setTimeout(() => { rosto.icone = null; }, ms);
    }
    function piscar() { rosto.proximaPiscada = 0; }

    // fala "de mentirinha": a boca acompanha um texto pelas vogais (sem áudio no site)
    let falaTimer = null;
    function falar(texto, msPorLetra = 55) {
      clearInterval(falaTimer);
      const letras = String(texto || '').toUpperCase().replace(/[^A-ZÁÉÍÓÚÃÕÂÊÔÇ ]/g, '');
      let i = 0;
      oscs.fala = (t) => ({ salto: Math.sin(t * 7) * 1.5, giro: Math.sin(t * 2.4) * 2 });
      return new Promise((res) => {
        falaTimer = setInterval(() => {
          if (i >= letras.length) { clearInterval(falaTimer); rosto.viseme = null; delete oscs.fala; res(); return; }
          const c = letras[i++].normalize('NFD')[0];
          rosto.viseme = 'AEIOU'.includes(c) ? c : (c === ' ' ? 'M' : (Math.random() < 0.5 ? 'E' : 'M'));
        }, msPorLetra);
      });
    }
    function pensando(on) {
      rosto.pontos = on;
      if (on) { olhar(0.7, -0.8); oscs.pensar = (t) => ({ giro: -6 + Math.sin(t * 1.5) * 2 }); }
      else { delete oscs.pensar; olhar(0, 0); }
    }

    // ----- gestos (os mesmos do totem, adaptados à escala do site) -----
    let ocupado = false;
    const GESTOS = {
      async acenar() {
        oscs.aceno = (t) => ({ giro: Math.sin(t * 9) * 10, antena: Math.sin(t * 18) * 14 });
        await animar({ salto: -14 }, 250, rapido);
        await animar({ salto: 0 }, 300, mola);
        await espera(800);
        delete oscs.aceno;
        await repouso(300);
      },
      async boas_vindas() {
        expressao('animado');
        await animar({ salto: -24, sx: 0.94, sy: 1.08 }, 260, rapido);
        await animar({ salto: 0, sx: 1.06, sy: 0.94 }, 260, cai);
        await animar({ sx: 1, sy: 1 }, 300, mola);
      },
      async comemorar() {
        expressao('animado');
        await animar({ salto: -40, sx: 0.92, sy: 1.1 }, 300, rapido);
        await animar({ giro: 360 }, 520, suave);
        P.giro = 0;
        await animar({ salto: 0, sx: 1.1, sy: 0.9 }, 260, cai);
        await animar({ sx: 1, sy: 1 }, 300, mola);
      },
      async piscadinha() {
        expressao('piscadinha');
        await animar({ giro: -8, salto: -6 }, 260, mola);
        await espera(650);
        expressao('feliz');
        await repouso(350);
      },
      async apontar(lado = 1) {
        olhar(lado, 0.2);
        await animar({ giro: 9 * lado, x: 10 * lado }, 380, mola);
        oscs.aponta = (t) => ({ x: Math.abs(Math.sin(t * 7)) * 4 * lado });
        await espera(1200);
        delete oscs.aponta;
        olhar(0, 0);
        await repouso(400);
      },
      async confuso() {
        expressao('curioso');
        oscs.confuso = (t) => ({ giro: Math.sin(t * 14) * 4, antena: -18 });
        await animar({ giro: 14 }, 300, mola);
        await espera(1000);
        delete oscs.confuso;
        expressao('feliz');
        await repouso();
      },
      async apaixonado() {
        expressao('apaixonado');
        await animar({ salto: -10, sx: 1.05, sy: 1.05 }, 300, mola);
        await espera(900);
        expressao('feliz');
        await repouso();
      },
      async trombar(lado = 1) {
        expressao('surpreso');
        await animar({ sx: 0.78, sy: 1.12, giro: -lado * 8 }, 90, rapido);
        await animar({ x: P.x - lado * 26, sx: 1.08, sy: 0.94, giro: -lado * 25 }, 260, rapido);
        expressao('tonto');
        oscs.tonto = (t) => ({ giro: Math.sin(t * 5) * 9 });
        await animar({ sx: 1, sy: 1 }, 400, mola);
        await espera(1000);
        delete oscs.tonto;
        expressao('envergonhado');
        await espera(500);
        await animar({ giro: 0 }, 300, mola);
      },
    };
    async function gesto(nome, ...args) {
      if (ocupado || reduzido.matches) { if (nome === 'piscadinha') { expressao('piscadinha'); await espera(700); expressao('feliz'); } return; }
      ocupado = true;
      try { await (GESTOS[nome] || (async () => {}))(...args); } finally { ocupado = false; }
    }

    // ----- olhos seguem o ponteiro -----
    let seguindo = false, ultimoMov = 0;
    function aoMover(e) {
      if (!seguindo || ocupado || rosto.pontos) return;
      const r = raiz.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height * 0.45;
      olhar((e.clientX - cx) / Math.max(320, innerWidth * 0.35), (e.clientY - cy) / Math.max(260, innerHeight * 0.35));
      ultimoMov = performance.now();
      const inclina = Math.max(-1, Math.min(1, (e.clientX - cx) / innerWidth)) * 8;
      oscs.segue = () => ({ giro: inclina });
    }
    function seguirMouse(on) {
      seguindo = on;
      if (!on) { delete oscs.segue; olhar(0, 0); }
    }
    addEventListener('pointermove', aoMover, { passive: true });
    // sem mexer no mouse por um tempo: volta a olhar para a frente
    const ociosoTimer = setInterval(() => { if (seguindo && performance.now() - ultimoMov > 3500 && !rosto.pontos) { olhar(0, 0); delete oscs.segue; } }, 1000);

    // ----- tamanho e visibilidade -----
    const ro = new ResizeObserver(() => { k = raiz.clientWidth / VB.w; });
    ro.observe(raiz);
    const io = new IntersectionObserver((ents) => { visivel = ents[ents.length - 1].isIntersecting; }, { rootMargin: '120px' });
    io.observe(raiz);

    const inst = {
      raiz, P, animar, repouso, expressao, olhar, icone, piscar, gesto, falar, pensando, seguirMouse, quadro,
      get ocupado() { return ocupado; },
      set ocupado(v) { ocupado = v; },
      osc(nome, fn) { if (fn) oscs[nome] = fn; else delete oscs[nome]; },
      destruir() { instancias.delete(inst); ro.disconnect(); io.disconnect(); clearInterval(ociosoTimer); removeEventListener('pointermove', aoMover); raiz.remove(); },
    };
    expressao(op.expressao || 'feliz');
    if (op.seguirMouse) seguirMouse(true);
    instancias.add(inst);
    return inst;
  }

  function loop(ms) {
    for (const i of instancias) i.quadro(ms);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.LiveMascote = { criar, espera, sorteio, EXPRESSOES: Object.keys(EXPRESSOES) };
})();
