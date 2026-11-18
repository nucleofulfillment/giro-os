/* Tela da balança do buffet por quilo (buffet.html).
   - O peso vem do programa de impressão deste computador: GET http://127.0.0.1:17865/balanca/peso  ->  { ok, kg, estavel }.
   - A configuração (preço do quilo de agora, pratos, bebidas, vídeo, voz) vem do Worker: GET /live/balanca?loja=&k=
   - A pesagem vira pedido em POST /live/balanca-pedido: o servidor desconta o prato, calcula o valor e põe a comanda na impressora.
   Passos: espera -> pesando -> (bebida?) -> enviando -> fim -> espera. A próxima pesagem só começa depois que o prato sai da balança.
   Teste sem servidor: buffet.html?teste=1 (com a balança de verdade; sem ela, as teclas P = põe um prato, R = retira). */
(function () {
  'use strict';
  const M = window.LIVEFOOD || {}, API = M.api || 'https://giro-os-api.nucleofull.workers.dev';
  const Q = new URLSearchParams(location.search), TESTE = Q.get('teste') === '1';
  const LOJA = M.codigo || '', KEY = (M.servidor && M.servidor.k) || '';
  const BAL = 'http://127.0.0.1:17865';
  const $ = (s) => document.querySelector(s);
  const real = (v) => 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ',');
  const kgTxt = (v) => (Number(v) || 0).toFixed(3).replace('.', ',');
  const r2 = (v) => Math.round(v * 100) / 100, r3 = (v) => Math.round(v * 1000) / 1000;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NA_BALANCA = 0.03;      // acima disso há alguma coisa em cima da balança
  const ESPERA_RESPOSTA = 40000; // sem resposta na pergunta da bebida: fecha sozinho
  const CONTAGEM = 6;            // segundos da contagem antes de fechar sozinho

  // ----- Live oficial (a mesma cabeça do totem) -----
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
  document.querySelectorAll('.lv-aqui').forEach((e) => { e.innerHTML = LIVE; });

  // ----- configuração da loja -----
  let C = { ativo: 1, precoKg: 69.9, faixas: [], pratos: [{ n: 1, nome: 'Prato raso', g: 0 }], prato: 1, max: 0, minG: 20, bebida: 1, bebCats: [], frase: '', video: '', voz: 1 };
  let AGORA = { preco: 69.9, faixa: '' }, BARRAS = {}, VOZ_SERVIDOR = false, CLI = M.cli || '';
  // cardápio cru (o cardapio.js guarda a cópia): categoria e código de barras de cada produto
  let CRU = {}; try { CRU = JSON.parse(localStorage.getItem('live-cardapio-' + LOJA) || '{}') || {}; } catch (e) { CRU = {}; }
  const PRODS = CRU.produtos || {};
  const prato = () => C.pratos.find((p) => p.n === C.prato) || { n: 0, nome: '', g: 0 };
  const normBarra = (c) => String(c || '').replace(/[^0-9A-Za-z]/g, '').replace(/^0+/, '').toUpperCase();

  async function carregaConfig() {
    if (TESTE) { BARRAS = {}; C.bebCats = (CRU.cats || []).filter((k) => /bebid|refri|suco|cervej|[aá]gua|drink/i.test(k.nome || '')).map((k) => k.id); Object.keys(PRODS).forEach((id) => { if (PRODS[id].barras) BARRAS[id] = PRODS[id].barras; }); return true; }
    const r = await fetch(`${API}/live/balanca?loja=${encodeURIComponent(LOJA)}&k=${encodeURIComponent(KEY)}`, { cache: 'no-store' });
    const d = await r.json().catch(() => ({}));
    if (!d.ok) throw new Error(d.mensagem || (r.status === 404 ? 'O servidor ainda não conhece a balança (publique o Worker 310).' : 'Não consegui carregar a configuração da balança.'));
    C = d.bal; AGORA = d.agora || { preco: C.precoKg, faixa: '' }; BARRAS = d.barras || {}; VOZ_SERVIDOR = !!d.voz; CLI = d.cli || CLI;
    return true;
  }
  function bebidasDaGrade() {
    return Object.keys(PRODS).map((id) => Object.assign({ id }, PRODS[id]))
      .filter((p) => C.bebCats.indexOf(p.cat) >= 0 && p.preco > 0 && !(p.tamanhos && p.tamanhos.length) && !(p.sabores && p.sabores.length));
  }
  function pintaFixos() {
    $('#frase').textContent = C.frase || 'Coloque seu prato na balança';
    $('#preco-chip').hidden = !(AGORA.preco > 0); $('#preco-v').textContent = real(AGORA.preco);
    const p = prato(); $('#prato-chip').hidden = !C.pratos.length; $('#prato-v').textContent = p.n ? ('0' + p.n).slice(-2) + ' · ' + p.nome : '';
    $('#selo-teste').hidden = !TESTE;
    const tela = $('#tela'), antigo = $('#fundo');
    const url = C.video && CLI ? `${API}/food/video/${encodeURIComponent(CLI)}/${C.video}` : '';
    if (!url) { if (antigo) antigo.remove(); tela.classList.remove('com-video'); }
    else if (!antigo || antigo.dataset.u !== url) {
      if (antigo) antigo.remove();
      const v = document.createElement('video'); v.id = 'fundo'; v.dataset.u = url; v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
      v.addEventListener('playing', () => tela.classList.add('com-video'), { once: true });
      v.addEventListener('error', () => { v.remove(); tela.classList.remove('com-video'); });
      tela.prepend(v); v.play().catch(() => {});
    }
  }

  // ----- voz do Live -----
  const vozProxy = () => (VOZ_SERVIDOR && KEY ? (texto, velocidade, signal) => fetch(API + '/live/voz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal, body: JSON.stringify({ loja: LOJA, k: KEY, texto, velocidade }) }) : null);
  function fala(texto) {
    if (!C.voz || !texto) return;
    try {
      if (window.Voz) { window.Voz.falar(texto, { tom: 1.6, velocidade: 1.1, elevenProxy: vozProxy() }).catch(() => {}); return; }
      if (window.speechSynthesis) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(texto); u.lang = 'pt-BR'; speechSynthesis.speak(u); }
    } catch (e) { /* sem voz: a tela continua */ }
  }
  function pesoFalado(kg) {
    const g = Math.round(kg * 1000), q = Math.floor(g / 1000), r = g % 1000;
    if (!q) return g + ' gramas';
    return q + (q === 1 ? ' quilo' : ' quilos') + (r ? ' e ' + r + ' gramas' : '');
  }
  function valorFalado(v) {
    const c = Math.round(v * 100), re = Math.floor(c / 100), ce = c % 100;
    return (re ? re + (re === 1 ? ' real' : ' reais') : '') + (re && ce ? ' e ' : '') + (ce ? ce + (ce === 1 ? ' centavo' : ' centavos') : '') || 'zero';
  }

  // ----- estado -----
  const E = { fase: 'ligar', kg: 0, estavel: false, online: false, msgBal: '', fixo: 0, beb: {}, env: '', desde: 0, mexeu: 0, semPrato: 0, contagem: 0, resp: null, simKg: null };
  const liquido = (kg) => Math.max(0, r3(kg - prato().g / 1000));
  const valorDe = (liq) => { let v = r2(liq * AGORA.preco); if (C.max > 0 && v > C.max) v = C.max; return v; };
  const totalBeb = () => Object.keys(E.beb).reduce((s, id) => s + (PRODS[id] ? PRODS[id].preco * E.beb[id] : 0), 0);
  function fase(f) {
    E.fase = f; E.desde = Date.now(); E.mexeu = Date.now(); E.contagem = 0;
    window.Totem.estado.modo = f === 'espera' ? 'standby' : 'conversa';
    const cena = { espera: 'c-espera', pesando: 'c-peso', pergunta: 'c-peso', bebida: 'c-beb', enviando: f === 'enviando' && $('#c-beb').classList.contains('on') ? 'c-beb' : 'c-peso', fim: 'c-fim', retire: 'c-fim' }[f];
    document.querySelectorAll('.cena').forEach((c) => c.classList.toggle('on', c.id === cena));
    $('#ligar').hidden = f !== 'ligar';
    $('#pergunta').hidden = f !== 'pergunta';
    if (f === 'espera') { E.beb = {}; E.fixo = 0; E.resp = null; E.env = ''; $('#erro').hidden = true; }
    pinta();
  }

  // ----- desenho -----
  function pinta() {
    $('#aviso-bal').hidden = E.online || E.fase !== 'espera'; $('#aviso-bal').textContent = E.msgBal;
    $('#seta').style.visibility = E.online ? 'visible' : 'hidden';
    if (E.fase === 'pesando' || E.fase === 'pergunta' || (E.fase === 'enviando' && $('#c-peso').classList.contains('on'))) {
      const kg = E.fase === 'pesando' ? E.kg : E.fixo, liq = liquido(kg), v = valorDe(liq), p = prato();
      $('#peso-num').textContent = kgTxt(liq);
      $('#valor').textContent = real(v);
      $('#conta').innerHTML = real(AGORA.preco) + ' o quilo' + (p.g ? '<br>já descontado o prato (' + p.g + ' g)' : '') + (C.max > 0 && v >= C.max ? '<br>valor máximo por prato' : '');
      // o anel enche até 1 kg e dá a volta de novo a cada quilo
      const fr = liq <= 0 ? 0 : ((liq % 1) || 1);
      $('#anel-pg').style.strokeDashoffset = String(565.5 * (1 - fr));
      const ok = E.fase !== 'pesando';
      $('#anel').classList.toggle('ok', ok); $('#anel').classList.toggle('vivo', !ok);
      $('#estado').classList.toggle('ok', ok);
      $('#estado-t').textContent = E.fase === 'enviando' ? 'Registrando a sua comanda…' : ok ? 'Peso registrado' : (liq * 1000 < C.minG ? 'Prato vazio? Sirva-se e coloque de novo' : 'Pesando…');
      $('#conta-reg').textContent = E.contagem ? 'Sem bebida: imprimindo a comanda em ' + E.contagem + '…' : '';
    }
    if (E.fase === 'bebida' || (E.fase === 'enviando' && $('#c-beb').classList.contains('on'))) pintaBebidas();
  }
  function pintaBebidas() {
    const lista = bebidasDaGrade(), liq = liquido(E.fixo), v = valorDe(liq);
    $('#grade').innerHTML = lista.map((p) => `<button type="button" class="beb${E.beb[p.id] ? ' tem' : ''}" data-add="${esc(p.id)}">${p.foto ? `<img loading="lazy" alt="" src="${API}/food/foto/${encodeURIComponent(CLI)}/${encodeURIComponent(p.id)}">` : '<div class="sem">🥤</div>'}<b>${esc(p.nome)}</b><span>${real(p.preco)}</span>${E.beb[p.id] ? `<em>${E.beb[p.id]}</em>` : ''}</button>`).join('');
    $('#beb-dica').textContent = lista.length ? 'Toque na bebida ou passe a lata no leitor' : 'Passe o código de barras da bebida no leitor';
    const ids = Object.keys(E.beb);
    $('#beb-itens').innerHTML = `<div class="ln"><div class="n">Buffet por quilo<small>${kgTxt(liq)} kg x ${real(AGORA.preco)}</small></div><div class="v">${real(v)}</div></div>`
      + ids.map((id) => `<div class="ln"><div class="qt"><button type="button" data-menos="${esc(id)}" aria-label="Tirar uma">−</button><b>${E.beb[id]}</b><button type="button" data-add="${esc(id)}" aria-label="Mais uma">+</button></div><div class="n">${esc(PRODS[id].nome)}</div><div class="v">${real(PRODS[id].preco * E.beb[id])}</div></div>`).join('');
    $('#beb-total').textContent = real(v + totalBeb());
    const env = E.fase === 'enviando';
    $('#b-concluir').textContent = env ? 'Registrando…' : 'Concluir e imprimir'; $('#b-concluir').disabled = env; $('#b-cancelar').hidden = env;
  }
  function pintaFim() {
    const r = E.resp;
    $('#fim-num').innerHTML = '<small>COMANDA</small>' + esc(r.num);
    $('#fim-itens').innerHTML = (r.linhas || []).map((l) => `<div class="ln"><div class="n">${l.qty > 1 ? l.qty + 'x ' : ''}${esc(l.nome)}${l.desc ? `<small>${esc(l.desc)}</small>` : ''}</div><div class="v">${esc(l.preco)}</div></div>`).join('');
    $('#fim-total').textContent = real(r.total);
    $('#fim-titulo').textContent = r.impressora === 0 && !TESTE ? 'Comanda ' + r.num + ' registrada' : 'Prontinho! Retire a sua comanda';
    $('#fim-aviso').textContent = r.impressora === 0 && !TESTE ? 'A impressora está desligada. Informe o número ' + r.num + ' no caixa.' : 'Pague no caixa ao sair. Bom apetite!';
  }

  // ----- ações -----
  function soma(id, n) {
    if (!PRODS[id]) return false;
    const q = Math.max(0, Math.min(20, (E.beb[id] || 0) + n));
    if (q) E.beb[id] = q; else delete E.beb[id];
    E.mexeu = Date.now(); E.contagem = 0;
    if (E.fase === 'pergunta') fase('bebida'); else pinta();
    return true;
  }
  function bipou(cod) {
    if (E.fase !== 'pergunta' && E.fase !== 'bebida') return;
    if (!C.bebida) return;
    const n = normBarra(cod), id = Object.keys(BARRAS).find((k) => normBarra(BARRAS[k]) === n && PRODS[k]);
    if (id) { soma(id, 1); bip(880); } else { bip(220); $('#beb-dica').textContent = 'Não achei esse código. Chame um atendente.'; }
  }
  let actx = null;
  function bip(f) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; g.gain.value = .08; o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + .12); } catch (e) { /* sem som */ } }

  async function concluir() {
    if (E.fase === 'enviando') return;
    E.env = E.env || 'bf' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    fase('enviando');
    const bebidas = Object.keys(E.beb).map((id) => ({ p: id, qty: E.beb[id] }));
    try {
      let d;
      if (TESTE) {
        await new Promise((r) => setTimeout(r, 700));
        const liq = liquido(E.fixo), v = valorDe(liq);
        d = { ok: true, num: 100 + Math.floor(Math.random() * 900), total: r2(v + totalBeb()), impressora: 1,
          linhas: [{ qty: 1, nome: 'Buffet por quilo', desc: kgTxt(liq) + ' kg x ' + real(AGORA.preco) + '/kg', preco: real(v) }].concat(bebidas.map((b) => ({ qty: b.qty, nome: PRODS[b.p].nome, desc: '', preco: real(PRODS[b.p].preco * b.qty) }))) };
      } else {
        const r = await fetch(API + '/live/balanca-pedido', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loja: LOJA, k: KEY, kg: E.fixo, bebidas, env: E.env }) });
        d = await r.json().catch(() => ({ ok: false, mensagem: 'Resposta inválida do servidor (' + r.status + ').' }));
      }
      if (!d.ok) throw new Error(d.mensagem || 'Não consegui registrar a pesagem.');
      if (!d.linhas) d.linhas = [];   // envio repetido: o servidor devolve só o número e o total
      E.resp = d; pintaFim(); fase('fim');
      fala('Prontinho! Comanda ' + d.num + '. Retire o seu papel e bom apetite!');
    } catch (e) {
      $('#erro-m').textContent = (e && e.message) || 'Sem conexão com o sistema.'; $('#erro').hidden = false;
      E.fase = 'erro';
    }
  }
  function cancelar() { $('#erro').hidden = true; E.resp = null; if (E.kg >= NA_BALANCA) { $('#fim-titulo').textContent = 'Pesagem cancelada'; $('#fim-num').innerHTML = ''; $('#fim-itens').innerHTML = ''; $('#fim-total').textContent = ''; $('#fim-aviso').textContent = 'Retire o prato da balança.'; fase('retire'); } else fase('espera'); }

  // ----- o passo de cada leitura da balança -----
  let estaveis = 0;
  function passo() {
    const agora = Date.now(), tem = E.online && E.kg >= NA_BALANCA;
    estaveis = E.online && E.estavel ? estaveis + 1 : 0;
    if (tem) E.semPrato = 0; else if (!E.semPrato) E.semPrato = agora;
    const fora = E.semPrato && agora - E.semPrato > 1200;   // o prato saiu de verdade (não foi só uma leitura ruim)
    switch (E.fase) {
      case 'espera': if (tem) fase('pesando'); break;
      case 'pesando':
        if (fora) { fase('espera'); break; }
        if (tem && estaveis >= 2 && liquido(E.kg) * 1000 >= C.minG) {
          E.fixo = E.kg; const liq = liquido(E.fixo);
          fala('Seu prato deu ' + pesoFalado(liq) + '. ' + valorFalado(valorDe(liq)) + '.' + (C.bebida ? ' Deseja uma bebida?' : ''));
          if (C.bebida) fase('pergunta'); else concluir();
        }
        break;
      case 'pergunta': case 'bebida':
        // o cliente pôs mais comida (ou tirou) com o prato ainda na balança: vale o peso novo
        if (tem && estaveis >= 2 && Math.abs(E.kg - E.fixo) >= 0.005 && liquido(E.kg) * 1000 >= C.minG) { E.fixo = E.kg; E.mexeu = agora; E.contagem = 0; }
        if (E.fase === 'pergunta') {
          // tirou o prato sem responder, ou ficou parado: conta e fecha sem bebida
          const parado = fora ? agora - E.semPrato : agora - E.mexeu - ESPERA_RESPOSTA + 1200;
          if (parado > 1200) { const falta = CONTAGEM - Math.floor((parado - 1200) / 1000); if (falta <= 0) { concluir(); return; } E.contagem = falta; } else E.contagem = 0;
        } else if (agora - E.mexeu > 90000) { concluir(); return; }   // esqueceu a tela das bebidas aberta: fecha com o que escolheu
        break;
      case 'fim': if ((fora && agora - E.desde > 7000) || agora - E.desde > 45000) { if (fora) fase('espera'); else { $('#fim-aviso').textContent = 'Retire o prato da balança.'; fase('retire'); } } break;
      case 'retire': if (fora) fase('espera'); break;
    }
    pinta();
  }
  async function lePeso() {
    try {
      if (E.simKg !== null) { E.online = true; E.estavel = true; E.kg = E.simKg; return; }
      const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 1500);
      const d = await fetch(BAL + '/balanca/peso', { cache: 'no-store', signal: ctrl.signal }).then((r) => r.json()).finally(() => clearTimeout(t));
      E.online = !!d.ok; E.kg = d.ok ? Number(d.kg) || 0 : 0; E.estavel = !!d.estavel;
      E.msgBal = d.ok ? '' : (d.erro === 'sem-porta' ? 'A balança ainda não foi escolhida. Abra o painel neste computador, menu Balança, e toque em Procurar balança.' : d.mensagem || 'A balança não respondeu.');
    } catch (e) {
      E.online = false; E.kg = 0; E.estavel = false;
      E.msgBal = 'Não achei o programa de impressão neste computador. Ele precisa estar instalado e ligado (painel, Configurações, Impressoras).';
    }
  }
  async function ciclo() { await lePeso(); if (E.fase !== 'ligar' && E.fase !== 'enviando' && E.fase !== 'erro') passo(); else pinta(); setTimeout(ciclo, 300); }

  // ----- teclado do prato (funcionário toca no "prato" lá em cima e digita o número) -----
  let digitos = '';
  function abreTeclado() {
    if (E.fase !== 'espera' || !C.pratos.length) return;
    digitos = ''; $('#tc-m').textContent = ''; $('#tc-visor').textContent = '';
    $('#tc-teclas').innerHTML = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Fechar', '0', 'OK'].map((t) => `<button type="button" data-t="${t}"${t === 'OK' ? ' class="ok"' : ''}${t === 'Fechar' ? ' style="font-size:calc(var(--u)*1.3)"' : ''}>${t}</button>`).join('');
    $('#tc-lista').innerHTML = C.pratos.map((p) => `<div>${('0' + p.n).slice(-2)} · ${esc(p.nome)} · ${p.g} g${p.n === C.prato ? ' (em uso)' : ''}</div>`).join('');
    $('#teclado').hidden = false; window.Totem.estado.modo = 'conversa';
  }
  function fechaTeclado() { $('#teclado').hidden = true; if (E.fase === 'espera') window.Totem.estado.modo = 'standby'; }
  async function tecla(t) {
    if (t === 'Fechar') return fechaTeclado();
    if (t !== 'OK') { digitos = (digitos + t).slice(-2); $('#tc-visor').textContent = digitos; $('#tc-m').textContent = ''; return; }
    const n = parseInt(digitos, 10) || 0, p = C.pratos.find((x) => x.n === n);
    if (!p) { $('#tc-m').textContent = 'Não existe prato com esse número.'; digitos = ''; $('#tc-visor').textContent = ''; return; }
    try {
      if (!TESTE) {
        const d = await fetch(API + '/live/balanca-prato', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loja: LOJA, k: KEY, n }) }).then((r) => r.json());
        if (!d.ok) throw new Error(d.mensagem || 'Não troquei o prato.');
      }
      C.prato = n; pintaFixos(); fechaTeclado(); bip(880);
    } catch (e) { $('#tc-m').textContent = (e && e.message) || 'Sem conexão.'; }
  }

  // ----- toques, leitor de código de barras e teclas de teste -----
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('button, #ligar'); if (!b) return;
    if (b.id === 'ligar') {
      try { window.Voz && window.Voz.destravar && window.Voz.destravar(); } catch (e) { /* ok */ }
      try { const el = document.documentElement; if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {}); } catch (e) { /* ok */ }
      bip(660); fase('espera'); return;
    }
    if (b.dataset.add) return void soma(b.dataset.add, 1);
    if (b.dataset.menos) return void soma(b.dataset.menos, -1);
    if (b.dataset.t) return void tecla(b.dataset.t);
    if (b.id === 'b-sim') { E.mexeu = Date.now(); fase('bebida'); }
    else if (b.id === 'b-nao' || b.id === 'b-concluir' || b.id === 'b-de-novo') { $('#erro').hidden = true; if (E.fase === 'erro') E.fase = 'pergunta'; concluir(); }
    else if (b.id === 'b-cancelar' || b.id === 'b-desistir') cancelar();
    else if (b.id === 'prato-chip') abreTeclado();
  });
  // leitor de código de barras (funciona como um teclado muito rápido que termina com Enter)
  let buf = '', ultima = 0;
  document.addEventListener('keydown', (ev) => {
    const t = Date.now();
    if (ev.key === 'Enter') { if (buf.length >= 6 && t - ultima < 150) { ev.preventDefault(); bipou(buf); } buf = ''; return; }
    if (ev.key.length === 1 && /[0-9A-Za-z-]/.test(ev.key)) { if (t - ultima > 100) buf = ''; buf += ev.key; ultima = t; }
    if (TESTE && !E.online || E.simKg !== null) { if (ev.key === 'p' || ev.key === 'P') E.simKg = r3(0.3 + Math.random() * 0.6 + prato().g / 1000); if (ev.key === 'r' || ev.key === 'R') E.simKg = 0; }
  }, true);

  // ----- começa -----
  (async function () {
    if (!TESTE && (!LOJA || !KEY)) { $('#carregando').textContent = 'Abra esta tela pelo link do painel, no menu Balança.'; return; }
    try { await carregaConfig(); } catch (e) { $('#carregando').textContent = (e && e.message) || 'Não carregou.'; setTimeout(() => location.reload(), 30000); return; }
    if (!TESTE && !C.ativo) { $('#carregando').textContent = 'A balança do buffet está desligada. Ligue no painel, no menu Balança.'; setTimeout(() => location.reload(), 30000); return; }
    pintaFixos(); document.body.classList.add('pronto'); fase('ligar'); ciclo();
    // o preço do quilo muda com o horário e o prato pode ser trocado no painel: confere a cada minuto, só com a tela parada
    setInterval(async () => { if (E.fase !== 'espera' || !$('#teclado').hidden) return; try { await carregaConfig(); pintaFixos(); } catch (e) { /* tenta de novo no próximo minuto */ } }, 60000);
  })();
})();
