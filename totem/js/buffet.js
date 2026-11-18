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
  const VOLTA_MS = 8000;         // depois da comanda, a tela volta sozinha para o início

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

  // TEM_SENHA: a loja cadastrou senha para trocar o prato (a senha em si fica no servidor). SERVIDOR_312: o servidor já confere senha e aceita "teste".
  let TEM_SENHA = false, SERVIDOR_312 = false;
  async function carregaConfig() {
    // demonstração aberta sem o link da loja: cardápio de exemplo e preços de exemplo
    if (TESTE && !(LOJA && KEY)) { const lv0 = parseFloat(String(Q.get('livre') || '').replace(',', '.')); if (lv0 > 0) AGORA.livre = lv0; BARRAS = {}; C.bebCats = (CRU.cats || []).filter((k) => /bebid|refri|suco|cervej|[aá]gua|drink/i.test(k.nome || '')).map((k) => k.id); Object.keys(PRODS).forEach((id) => { if (PRODS[id].barras) BARRAS[id] = PRODS[id].barras; }); return true; }
    // tela de verdade e demonstração pelo link da loja: a aparência, os preços, os pratos e as bebidas são os do painel
    const r = await fetch(`${API}/live/balanca?loja=${encodeURIComponent(LOJA)}&k=${encodeURIComponent(KEY)}`, { cache: 'no-store' });
    const d = await r.json().catch(() => ({}));
    if (!d.ok) throw new Error(d.mensagem || (r.status === 404 ? 'O servidor ainda não conhece a balança (publique o Worker 310).' : 'Não consegui carregar a configuração da balança.'));
    C = d.bal; AGORA = d.agora || { preco: C.precoKg, faixa: '' }; BARRAS = d.barras || {}; VOZ_SERVIDOR = !!d.voz; CLI = d.cli || CLI;
    SERVIDOR_312 = d.temSenha !== undefined; TEM_SENHA = !!d.temSenha;
    if (TESTE && !(AGORA.preco > 0)) AGORA.preco = 69.9;   // demonstração de loja que ainda não informou o preço
    const lv = parseFloat(String(Q.get('livre') || '').replace(',', '.')); if (TESTE && lv > 0) AGORA.livre = lv;   // demonstração: ...&livre=49,90 mostra o buffet livre sem mexer na loja
    return true;
  }
  // bebidas por categoria, na ordem do cadastro (categorias na ordem do cardápio; produtos na ordem em que o cardápio os entrega)
  function bebidasPorCategoria() {
    const todos = Object.keys(PRODS).map((id, i) => Object.assign({ id, _i: i }, PRODS[id]))
      .filter((p) => C.bebCats.indexOf(p.cat) >= 0 && p.preco > 0 && !(p.tamanhos && p.tamanhos.length) && !(p.sabores && p.sabores.length))
      .sort((a, b) => ((a.ordem == null ? a._i : a.ordem) - (b.ordem == null ? b._i : b.ordem)) || a._i - b._i);
    return (CRU.cats || []).filter((k) => C.bebCats.indexOf(k.id) >= 0).map((k) => ({ id: k.id, nome: k.nome, itens: todos.filter((p) => p.cat === k.id) })).filter((g) => g.itens.length);
  }
  function pintaFixos() {
    $('#frase').textContent = C.frase || 'Coloque seu prato na balança';
    $('#preco-chip').hidden = !(AGORA.preco > 0); $('#preco-v').textContent = real(AGORA.preco);
    $('#livre-chip').hidden = !(livre() > 0); $('#livre-v').textContent = real(livre());
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
  // A fala tem de sair na hora em que o peso para. A voz do servidor (a do totem de voz) leva 2 a 3 segundos para gerar cada frase,
  // e aqui a frase muda a cada prato (não dá para deixar pronta). Por isso o Buffet fala com a voz do próprio navegador, que é imediata;
  // "aquece" deixa a ligação dela aberta antes da primeira fala (ao ligar a tela e quando um prato encosta na balança).
  // A voz NUNCA pode ficar muda: se a voz do navegador não existir neste aparelho, ou não começar em 1,5 s, a frase sai pela
  // voz do servidor (a do totem de voz), que demora mais mas sempre funcionou.
  function aquece() { try { if (C.voz && window.Voz && window.Voz.aquecer && !(speechSynthesis.speaking || speechSynthesis.pending)) window.Voz.aquecer(); } catch (e) { /* ok */ } }
  const vozProxy = () => (VOZ_SERVIDOR && KEY ? (texto, velocidade, signal) => fetch(API + '/live/voz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal, body: JSON.stringify({ loja: LOJA, k: KEY, texto, velocidade }) }) : null);
  try { if (window.speechSynthesis) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => {}; } } catch (e) { /* ok */ }   // pede a lista de vozes cedo (ela chega depois)
  function vozDoNavegador() {
    try {
      const todas = speechSynthesis.getVoices().filter((v) => /^pt/i.test(v.lang || ''));
      const br = todas.filter((v) => /pt[-_]BR/i.test(v.lang)), lista = br.length ? br : todas;
      const femininas = /Maria|Francisca|Thalita|Leticia|Brenda|Elza|Giovanna|Leila|Manuela|Yara|Luciana|Camila|Vitoria|Heloisa/i;
      const masc = lista.filter((v) => !femininas.test(v.name));
      for (const re of [/Ant[oô]nio.*Natural/i, /Natural/i, /Daniel/i, /Google/i]) { const v = masc.find((x) => re.test(x.name)); if (v) return v; }
      return masc[0] || lista[0] || null;
    } catch (e) { return null; }
  }
  let falaVez = 0;
  function fala(texto) {
    if (!C.voz || !texto) return;
    const V = window.Voz, vez = ++falaVez;
    const servidor = () => {
      if (vez !== falaVez) return;
      try { const px = vozProxy(); if (V && px) V.falar(texto, { tom: 1.6, velocidade: 1.1, elevenProxy: px }).catch(() => {}); } catch (e) { /* sem voz: a tela continua */ }
    };
    try {
      const synth = window.speechSynthesis, v = synth ? vozDoNavegador() : null;
      if (!v) return servidor();   // este aparelho não tem voz em português: usa a do servidor
      try { V && V.parar && V.parar(); } catch (e) { /* ok */ }
      const u = new SpeechSynthesisUtterance(V && V.paraFala ? V.paraFala(texto) : texto);
      u.voice = v; u.lang = v.lang || 'pt-BR'; u.rate = 1.1; u.pitch = /Natural/i.test(v.name) ? 1.6 : 1.1; u.volume = 1;
      let saiu = false;
      u.onstart = u.onboundary = () => { saiu = true; };
      u.onerror = () => { if (!saiu) { saiu = true; servidor(); } };
      // falar logo depois de um "cancelar" faz alguns navegadores engolirem a frase: dá um respiro antes
      if (synth.speaking || synth.pending) { synth.cancel(); setTimeout(() => { try { synth.speak(u); } catch (e) { servidor(); } }, 120); } else synth.speak(u);
      setTimeout(() => { if (!saiu) { saiu = true; try { synth.cancel(); } catch (e) { /* ok */ } servidor(); } }, 1500);
    } catch (e) { servidor(); }
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
  // BUFFET LIVRE (opcional): valor do livre que vale agora (o da faixa de horário, senão o padrão da loja). Passou dele, vale ele.
  const livre = () => (AGORA.livre > 0 ? AGORA.livre : (C.max > 0 ? C.max : 0));
  const noLivre = (liq) => livre() > 0 && r2(liq * AGORA.preco) > livre();
  const valorDe = (liq) => (noLivre(liq) ? livre() : r2(liq * AGORA.preco));
  const totalBeb = () => Object.keys(E.beb).reduce((s, id) => s + (PRODS[id] ? PRODS[id].preco * E.beb[id] : 0), 0);
  function fase(f) {
    E.fase = f; E.desde = Date.now(); E.mexeu = Date.now(); E.contagem = 0;
    window.Totem.estado.modo = f === 'espera' ? 'standby' : 'conversa';
    const cena = { espera: 'c-espera', pesando: 'c-peso', pergunta: 'c-peso', bebida: 'c-beb', enviando: f === 'enviando' && $('#c-beb').classList.contains('on') ? 'c-beb' : 'c-peso', fim: 'c-fim', retire: 'c-fim', pix: 'c-pix', pago: 'c-pix' }[f];
    document.querySelectorAll('.cena').forEach((c) => c.classList.toggle('on', c.id === cena));
    $('#ligar').hidden = f !== 'ligar';
    $('#pergunta').hidden = f !== 'pergunta';
    if (f === 'espera') { E.beb = {}; E.fixo = 0; E.resp = null; E.env = ''; $('#erro').hidden = true; }
    if (f === 'pesando') { mostraPeso = 0; alvoPeso = 0; ultAvanco = performance.now(); }   // cada pesagem começa do zero
    pinta();
    if (cena === 'c-peso') roda();
  }

  // ----- desenho -----
  // Evolução da pesagem: o peso, o valor e o anel não pulam para o número final; correm até ele (uns 0,8 s), como um mostrador.
  // "avanca" é chamada a cada quadro da tela enquanto a pesagem está aberta e também a cada leitura da balança.
  let alvoPeso = 0, mostraPeso = 0, ultAvanco = 0, quadro = 0;
  function avanca() {
    const t = performance.now(), dt = Math.min(0.3, Math.max(0, (t - ultAvanco) / 1000)); ultAvanco = t;
    mostraPeso += (alvoPeso - mostraPeso) * (1 - Math.exp(-dt * 4.5));
    if (Math.abs(alvoPeso - mostraPeso) < 0.0006) mostraPeso = alvoPeso;
    $('#peso-num').textContent = kgTxt(mostraPeso);
    $('#valor').textContent = real(valorDe(mostraPeso));
    // o anel enche até 1 kg e dá a volta de novo a cada quilo
    const fr = mostraPeso <= 0 ? 0 : ((mostraPeso % 1) || 1);
    $('#anel-pg').style.strokeDashoffset = String(565.5 * (1 - fr));
  }
  function roda() { cancelAnimationFrame(quadro); const f = () => { if (!$('#c-peso').classList.contains('on')) return; avanca(); quadro = requestAnimationFrame(f); }; quadro = requestAnimationFrame(f); }
  function pinta() {
    if (TESTE) { const tem = E.simKg > 0; $('#demo').hidden = E.fase === 'ligar'; $('#b-demo-poe').hidden = tem || E.fase !== 'espera'; $('#b-demo-tira').hidden = !tem; }
    $('#aviso-bal').hidden = E.online || E.fase !== 'espera'; $('#aviso-bal').textContent = E.msgBal;
    $('#seta').style.visibility = E.online ? 'visible' : 'hidden';
    if (E.fase === 'espera' && E.travado && E.online) { $('#aviso-bal').hidden = false; $('#aviso-bal').textContent = 'Retire o prato da balança para a próxima pesagem.'; $('#seta').style.visibility = 'hidden'; }
    if (E.fase === 'pesando' || E.fase === 'pergunta' || (E.fase === 'enviando' && $('#c-peso').classList.contains('on'))) {
      const kg = E.fase === 'pesando' ? E.kg : E.fixo, liq = liquido(kg), v = valorDe(liq), p = prato();
      alvoPeso = liq; avanca();   // os números e o anel correm até o peso (ver "avanca")
      $('#conta').innerHTML = real(AGORA.preco) + ' o quilo' + (p.g ? '<br>já descontado o prato (' + p.g + ' g)' : '') + (noLivre(liq) ? '<br><b class="selo-livre">Buffet livre</b> passou do valor do livre: você paga o livre' : '');
      const ok = E.fase !== 'pesando';
      $('#anel').classList.toggle('ok', ok); $('#anel').classList.toggle('vivo', !ok);
      $('#estado').classList.toggle('ok', ok);
      $('#estado-t').textContent = E.fase === 'enviando' ? 'Registrando a sua comanda…' : ok ? 'Peso registrado' : (liq * 1000 < C.minG ? 'Prato vazio? Sirva-se e coloque de novo' : 'Pesando…');
      $('#conta-reg').textContent = E.contagem ? 'Sem bebida: imprimindo a comanda em ' + E.contagem + '…' : '';
    }
    if (E.fase === 'bebida' || (E.fase === 'enviando' && $('#c-beb').classList.contains('on'))) pintaBebidas();
  }
  // a grade é montada uma vez (só refaz se o cardápio mudar); a cada leitura da balança só os números mudam, para não piscar nem perder a rolagem
  let gradeFeita = '', comandaFeita = '';
  function montaGrade() {
    const grupos = bebidasPorCategoria(), marca = JSON.stringify(grupos.map((g) => [g.id, g.itens.map((p) => p.id + p.preco)]));
    if (marca === gradeFeita) return grupos.length;
    gradeFeita = marca;
    $('#beb-cats').innerHTML = grupos.length > 1 ? grupos.map((g, i) => `<button type="button" data-cat="${esc(g.id)}"${i ? '' : ' class="on"'}>${esc(g.nome)}</button>`).join('') : '';
    $('#beb-cats').hidden = grupos.length < 2;
    $('#grade').innerHTML = grupos.map((g) => (grupos.length > 1 ? `<h4 data-cat-t="${esc(g.id)}">${esc(g.nome)}</h4>` : '') + '<div class="gr4">'
      + g.itens.map((p) => `<button type="button" class="beb" data-add="${esc(p.id)}">${p.foto ? `<img loading="lazy" alt="" src="${API}/food/foto/${encodeURIComponent(CLI)}/${encodeURIComponent(p.id)}">` : '<div class="sem">🥤</div>'}<b>${esc(p.nome)}</b><span>${real(p.preco)}</span><em hidden></em></button>`).join('') + '</div>').join('');
    $('#grade').scrollTop = 0;
    return grupos.length;
  }
  function pintaBebidas() {
    const n = montaGrade(), liq = liquido(E.fixo), v = valorDe(liq);
    document.querySelectorAll('#grade .beb').forEach((b) => { const q = E.beb[b.dataset.add] || 0, em = b.querySelector('em'); b.classList.toggle('tem', q > 0); em.hidden = !q; em.textContent = q || ''; });
    if (!$('#beb-dica').dataset.erro) $('#beb-dica').textContent = n ? 'Toque na bebida ou passe a lata no leitor' : 'Passe o código de barras da bebida no leitor';
    const ids = Object.keys(E.beb), env0 = E.fase === 'enviando', marcaC = JSON.stringify([E.beb, liq, v, env0]);
    if (marcaC === comandaFeita) return;
    comandaFeita = marcaC;
    $('#beb-itens').innerHTML = `<div class="ln"><div class="n">${noLivre(liq) ? 'Buffet livre' : 'Buffet por quilo'}<small>${noLivre(liq) ? kgTxt(liq) + ' kg · passou do livre' : kgTxt(liq) + ' kg x ' + real(AGORA.preco)}</small></div><div class="v">${real(v)}</div></div>`
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
    const pix = !!(r.pix && r.conta);
    $('#fim-aviso').textContent = r.impressora === 0 && !TESTE ? 'A impressora está desligada. Informe o número ' + r.num + ' no caixa.' : pix ? 'Pague agora por Pix, pelo QR da comanda no celular, ou no caixa ao sair.' : 'Pague no caixa ao sair. Bom apetite!';
    $('#fim-pagar').hidden = !pix;
  }

  // ----- pagar agora com Pix (opcional): gera o Pix da comanda, mostra o QR e espera a confirmação -----
  let pixVez = 0;
  function voltaInicio() {
    pixVez++;
    if (TESTE && E.simKg > 0) { E.simKg = 0; E.kg = 0; }   // demonstração: o prato de mentira sai sozinho, pronto para a próxima
    E.travado = E.online && E.kg >= NA_BALANCA; fase('espera');
  }
  async function abrePix() {
    const r = E.resp; if (!r || !r.conta) return;
    const vez = ++pixVez, c = r.conta;
    $('#pix-img').removeAttribute('src'); $('#pix-ok').hidden = true; $('#b-pix-voltar').hidden = false; $('#pix-live').hidden = true; $('#pix-caixa').hidden = false; $('#pix-total').hidden = false;
    $('#pix-titulo').textContent = 'Pague com Pix'; $('#pix-sub').textContent = 'Abra o aplicativo do seu banco e leia o QR Code';
    $('#pix-total').textContent = real(r.total); $('#pix-estado').textContent = 'Gerando o Pix…';
    fase('pix');
    try {
      let d;
      if (TESTE) { await new Promise((ok) => setTimeout(ok, 800)); d = { ok: true, conta: { pix_qr: '' } }; }
      else d = await fetch(API + '/live/conta-pix', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ l: c.l, n: c.n, t: c.t }) }).then((x) => x.json());
      if (vez !== pixVez) return;
      if (!d.ok) throw new Error(d.mensagem || 'Não consegui gerar o Pix.');
      if (d.conta.pix_qr) $('#pix-img').src = /^data:/.test(d.conta.pix_qr) ? d.conta.pix_qr : 'data:image/png;base64,' + d.conta.pix_qr;
      $('#pix-estado').textContent = TESTE ? 'Teste: o pagamento será confirmado sozinho em instantes' : 'Aguardando o pagamento…';
      const inicio = Date.now();
      const confere = async () => {
        if (vez !== pixVez || E.fase !== 'pix') return;
        let paga = false;
        try {
          if (TESTE) paga = Date.now() - inicio > 5000;
          else { const s = await fetch(`${API}/live/conta?l=${encodeURIComponent(c.l)}&n=${c.n}&t=${c.t}`, { cache: 'no-store' }).then((x) => x.json()); paga = !!(s.ok && (s.paga || !s.aberta)); }
        } catch (e) { /* sem rede agora: tenta de novo */ }
        if (vez !== pixVez || E.fase !== 'pix') return;
        if (paga) {
          $('#pix-caixa').hidden = true; $('#pix-live').hidden = false; $('#b-pix-voltar').hidden = true;   // pago: sai o QR, entra o Live comemorando
          $('#pix-titulo').textContent = 'Pagamento confirmado!'; $('#pix-sub').textContent = 'Comanda ' + r.num + ' paga. Obrigado e bom apetite!'; $('#pix-estado').textContent = '';
          bip(880); fala('Pagamento confirmado. Obrigado e bom apetite!'); fase('pago'); return;
        }
        setTimeout(confere, 3000);
      };
      setTimeout(confere, 3000);
    } catch (e) {
      if (vez !== pixVez) return;
      $('#pix-estado').textContent = ((e && e.message) || 'Não consegui gerar o Pix.') + ' Pague no caixa.';
    }
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
    const dica = $('#beb-dica');
    if (id) { delete dica.dataset.erro; soma(id, 1); bip(880); }
    else { bip(220); if (E.fase === 'pergunta') fase('bebida'); dica.dataset.erro = '1'; dica.textContent = 'Não achei esse código. Chame um atendente.'; setTimeout(() => { delete dica.dataset.erro; }, 5000); }
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
        d = { ok: true, num: 100 + Math.floor(Math.random() * 900), total: r2(v + totalBeb()), impressora: 1, pix: C.pagTela === 0 ? 0 : 1, conta: { l: 'teste', n: 1, t: 'x' },
          linhas: [{ qty: 1, nome: noLivre(liq) ? 'Buffet livre' : 'Buffet por quilo', desc: noLivre(liq) ? kgTxt(liq) + ' kg - passou do livre, vale o livre' : kgTxt(liq) + ' kg x ' + real(AGORA.preco) + '/kg', preco: real(v) }].concat(bebidas.map((b) => ({ qty: b.qty, nome: PRODS[b.p].nome, desc: '', preco: real(PRODS[b.p].preco * b.qty) }))) };
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
  function cancelar() { $('#erro').hidden = true; E.resp = null; if (TESTE && E.simKg > 0) { E.simKg = 0; E.kg = 0; } if (E.kg >= NA_BALANCA) { $('#fim-titulo').textContent = 'Pesagem cancelada'; $('#fim-num').innerHTML = ''; $('#fim-itens').innerHTML = ''; $('#fim-total').textContent = ''; $('#fim-aviso').textContent = 'Retire o prato da balança.'; fase('retire'); } else fase('espera'); }

  // ----- o passo de cada leitura da balança -----
  let estaveis = 0;
  function passo() {
    const agora = Date.now(), tem = E.online && E.kg >= NA_BALANCA;
    estaveis = E.online && E.estavel ? estaveis + 1 : 0;
    if (tem) E.semPrato = 0; else if (!E.semPrato) E.semPrato = agora;
    const fora = E.semPrato && agora - E.semPrato > 1200;   // o prato saiu de verdade (não foi só uma leitura ruim)
    switch (E.fase) {
      case 'espera':
        // depois de uma pesagem a tela volta sozinha para o início; se o prato ainda está na balança, só aceita outro depois que ele sair
        if (E.travado) { if (fora || !E.online) E.travado = false; }
        else if (tem) fase('pesando');
        break;
      case 'pesando':
        if (fora) { fase('espera'); break; }
        // "estavel" do programa já são 3 leituras iguais seguidas; o 1,1 s dá tempo de ver os números correndo
        if (tem && estaveis >= 1 && agora - E.desde >= 1100 && liquido(E.kg) * 1000 >= C.minG) {
          E.fixo = E.kg; const liq = liquido(E.fixo);
          fala('Seu prato deu ' + pesoFalado(liq) + '. ' + (noLivre(liq) ? 'Passou do buffet livre, então você paga o livre: ' : '') + valorFalado(valorDe(liq)) + '.' + (C.bebida ? ' Deseja uma bebida?' : ''));
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
      case 'fim': if (agora - E.desde > (E.resp && E.resp.pix && E.resp.conta ? VOLTA_MS + 7000 : VOLTA_MS)) voltaInicio(); break;   // volta sozinha para a tela inicial (com o botão do Pix, espera um pouco mais)
      case 'pix': if (agora - E.desde > 5 * 60000) voltaInicio(); break;   // ninguém pagou: a comanda segue aberta para o caixa ou para o QR
      case 'pago': if (agora - E.desde > 6000) voltaInicio(); break;
      case 'retire': if (fora || agora - E.desde > 5000) { E.travado = !fora; fase('espera'); } break;
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
    // demonstração: sem balança por perto a tela funciona igual, com o prato de mentira do botão
    if (TESTE && !E.online) { E.online = true; E.kg = 0; E.estavel = true; E.msgBal = ''; }
  }
  async function ciclo() { await lePeso(); if (E.fase !== 'ligar' && E.fase !== 'enviando' && E.fase !== 'erro') passo(); else pinta(); setTimeout(ciclo, 300); }

  // ----- teclado do prato (funcionário toca no "prato" lá em cima e digita o número) -----
  // Com senha cadastrada no painel, o teclado pede primeiro a senha (conferida no servidor) e só depois o número do prato.
  let digitos = '', tcModo = 'prato', tcSenha = '';
  function tcVisor() { $('#tc-visor').textContent = tcModo === 'senha' ? '•'.repeat(digitos.length) : digitos; }
  function tcPasso(modo) {
    tcModo = modo; digitos = ''; $('#tc-m').textContent = ''; tcVisor();
    $('#tc-titulo').textContent = modo === 'senha' ? 'Senha' : 'Trocar o prato';
    $('#tc-texto').textContent = modo === 'senha' ? 'Digite a senha para trocar o prato.' : 'Digite o número do prato que está no buffet agora.';
    $('#tc-lista').hidden = modo === 'senha';
  }
  function abreTeclado() {
    if (E.fase !== 'espera' || !C.pratos.length) return;
    tcSenha = ''; tcPasso(TEM_SENHA ? 'senha' : 'prato');
    $('#tc-teclas').innerHTML = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Fechar', '0', 'OK'].map((t) => `<button type="button" data-t="${t}"${t === 'OK' ? ' class="ok"' : ''}${t === 'Fechar' ? ' style="font-size:calc(var(--u)*1.3)"' : ''}>${t}</button>`).join('');
    $('#tc-lista').innerHTML = C.pratos.map((p) => `<div>${('0' + p.n).slice(-2)} · ${esc(p.nome)} · ${p.g} g${p.n === C.prato ? ' (em uso)' : ''}</div>`).join('');
    $('#teclado').hidden = false; window.Totem.estado.modo = 'conversa';
  }
  function fechaTeclado() { $('#teclado').hidden = true; if (E.fase === 'espera') window.Totem.estado.modo = 'standby'; }
  async function tecla(t) {
    if (t === 'Fechar') return fechaTeclado();
    if (t !== 'OK') { digitos = tcModo === 'senha' ? (digitos + t).slice(0, 8) : (digitos + t).slice(-2); tcVisor(); $('#tc-m').textContent = ''; return; }
    const prato_ = (corpo) => fetch(API + '/live/balanca-prato', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ loja: LOJA, k: KEY }, corpo)) }).then((r) => r.json());
    if (tcModo === 'senha') {
      if (!digitos) return;
      try {
        const d = await prato_({ soSenha: 1, senha: digitos });
        if (!d.ok) { bip(220); digitos = ''; tcVisor(); $('#tc-m').textContent = d.mensagem || 'Senha incorreta.'; return; }
        tcSenha = digitos; tcPasso('prato');
      } catch (e) { $('#tc-m').textContent = 'Sem conexão.'; }
      return;
    }
    const n = parseInt(digitos, 10) || 0, p = C.pratos.find((x) => x.n === n);
    if (!p) { $('#tc-m').textContent = 'Não existe prato com esse número.'; digitos = ''; tcVisor(); return; }
    try {
      // tela de verdade: grava no servidor. Demonstração: só confere (no servidor novo) e troca nesta tela, sem mexer na loja
      if (!TESTE || (SERVIDOR_312 && TEM_SENHA)) {
        const d = await prato_({ n, senha: tcSenha, teste: TESTE ? 1 : undefined });
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
      bip(660); aquece(); fase('espera'); return;
    }
    if (b.dataset.cat) {   // categoria: leva a lista até ela
      const g = $('#grade'), t = g.querySelector(`[data-cat-t="${CSS.escape(b.dataset.cat)}"]`);
      if (t) {
        const alvo = Math.min(t.offsetTop - g.offsetTop - 4, g.scrollHeight - g.clientHeight), de = g.scrollTop;
        g.scrollTo({ top: alvo, behavior: 'smooth' });
        setTimeout(() => { if (Math.abs(g.scrollTop - de) < 2 && Math.abs(alvo - de) > 2) g.scrollTo({ top: alvo, behavior: 'instant' }); }, 500);   // a rolagem suave não andou: vai direto
      }
      document.querySelectorAll('#beb-cats button').forEach((x) => x.classList.toggle('on', x === b));
      E.mexeu = Date.now(); return;
    }
    if (b.dataset.add) return void soma(b.dataset.add, 1);
    if (b.dataset.menos) return void soma(b.dataset.menos, -1);
    if (b.dataset.t) return void tecla(b.dataset.t);
    if (b.id === 'b-sim') { E.mexeu = Date.now(); fase('bebida'); }
    else if (b.id === 'b-nao' || b.id === 'b-concluir' || b.id === 'b-de-novo') { $('#erro').hidden = true; if (E.fase === 'erro') E.fase = 'pergunta'; concluir(); }
    else if (b.id === 'b-cancelar' || b.id === 'b-desistir') cancelar();
    else if (b.id === 'prato-chip') abreTeclado();
    else if (b.id === 'b-demo-poe') { if (E.fase === 'espera') { E.travado = false; E.simKg = r3(0.35 + Math.random() * 0.5 + prato().g / 1000); pinta(); } }
    else if (b.id === 'b-demo-tira') { E.simKg = 0; pinta(); }
    else if (b.id === 'b-pix') abrePix();
    else if (b.id === 'b-depois' || b.id === 'b-pix-voltar') voltaInicio();
  });
  // a categoria acesa acompanha a rolagem da lista (e rolar conta como o cliente mexendo na tela)
  $('#grade').addEventListener('scroll', () => {
    const g = $('#grade'); let atual = '';
    g.querySelectorAll('[data-cat-t]').forEach((t) => { if (t.offsetTop - g.offsetTop <= g.scrollTop + 40) atual = t.dataset.catT; });
    if (g.scrollTop + g.clientHeight >= g.scrollHeight - 4) { const ts = g.querySelectorAll('[data-cat-t]'); if (ts.length) atual = ts[ts.length - 1].dataset.catT; }
    document.querySelectorAll('#beb-cats button').forEach((b, i) => b.classList.toggle('on', atual ? b.dataset.cat === atual : i === 0));
    E.mexeu = Date.now();
  }, { passive: true });
  // leitor de código de barras (funciona como um teclado muito rápido que termina com Enter)
  let buf = '', ultima = 0;
  document.addEventListener('keydown', (ev) => {
    const t = Date.now();
    if (ev.key === 'Enter') { if (buf.length >= 6 && t - ultima < 150) { ev.preventDefault(); bipou(buf); } buf = ''; return; }
    if (ev.key.length === 1 && /[0-9A-Za-z-]/.test(ev.key)) { if (t - ultima > 100) buf = ''; buf += ev.key; ultima = t; }
    if (TESTE) {   /* no teste, P põe um prato de mentira e R retira (vale mesmo com a balança ligada) */ if (ev.key === 'p' || ev.key === 'P') E.simKg = r3(0.3 + Math.random() * 0.6 + prato().g / 1000); if (ev.key === 'r' || ev.key === 'R') E.simKg = 0; }
  }, true);

  // ----- começa -----
  (async function () {
    if (!TESTE && (!LOJA || !KEY)) { $('#carregando').textContent = 'Abra esta tela pelo link do painel, no menu Balança.'; return; }
    try { await carregaConfig(); } catch (e) { $('#carregando').textContent = (e && e.message) || 'Não carregou.'; setTimeout(() => location.reload(), 30000); return; }
    if (!TESTE && !C.ativo) { $('#carregando').textContent = 'A balança do buffet está desligada. Ligue no painel, no menu Balança.'; setTimeout(() => location.reload(), 30000); return; }
    pintaFixos(); document.body.classList.add('pronto'); fase('ligar'); ciclo();
    // o preço do quilo muda com o horário e o prato pode ser trocado no painel: confere a cada minuto, só com a tela parada
    setInterval(async () => { if (E.fase !== 'espera' || !$('#teclado').hidden) return; aquece(); try { await carregaConfig(); pintaFixos(); } catch (e) { /* tenta de novo no próximo minuto */ } }, 60000);
  })();
})();
