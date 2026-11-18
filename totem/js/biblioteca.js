/* LiveFood · Biblioteca de fotos (totem/biblioteca.html). Veja o comentário da página.
   Dono (logado no painel neste navegador): sobe fotos e cadastra cada uma (nome, preço, categoria, ou vínculo com produto que já existe).
   Visitante: só vê as fotos já cadastradas. O produto novo é criado pela rota de sempre do cardápio (cardapio-salvar). */
(function () {
  'use strict';
  const M = window.LIVEFOOD || {}, API = M.api || 'https://giro-os-api.nucleofull.workers.dev';
  const Q = new URLSearchParams(location.search), TESTE = Q.get('teste') === '1';
  const LOJA = M.codigo || '', KEY = (M.servidor && M.servidor.k) || '';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const real = (v) => 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ',');
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const preco = (v) => { const n = Number(String(v == null ? '' : v).replace(/\./g, '').replace(',', '.')); return isFinite(n) && n >= 0 ? n : 0; };
  let TOKEN = ''; try { TOKEN = localStorage.getItem('dd_jwt') || ''; } catch (e) { TOKEN = ''; }

  const S = { dono: false, cli: M.cli || '', itens: [], cats: [], prods: [], video: '', filtro: 'todos', sel: '', salvando: false, busca: '', demo: false };

  const fotoUrl = (it) => it.url || `${API}/food/biblioteca-foto/${encodeURIComponent(S.cli)}/${encodeURIComponent(it.id)}?v=${it.v || 0}`;
  const hdr = () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN });
  async function api(rota, corpo) {
    const r = await fetch(API + rota, { method: 'POST', headers: hdr(), body: JSON.stringify(corpo) });
    const d = await r.json().catch(() => ({}));
    if (!d.ok) throw new Error(d.mensagem || 'Não salvou (' + r.status + ')');
    return d;
  }

  // ---------- dados ----------
  const DEMO = () => ({
    cats: [{ id: 'k1', nome: 'Café da manhã' }, { id: 'k2', nome: 'Chocolates quentes' }, { id: 'k3', nome: 'Sucos' }, { id: 'k4', nome: 'Sobremesas' }],
    itens: [
      { id: 'd1', cod: '1100', nome: 'Waffles de morangos e nutella', preco: 38, cat: 'k4', reg: 1, url: 'img/biblioteca-teste/waffle.jpg' },
      { id: 'd2', cod: '', nome: 'Torrada na manteiga, ovos mexidos e bacon', preco: 32, cat: 'k1', reg: 1, url: 'img/biblioteca-teste/torrada.jpg' },
      { id: 'd3', cod: '', nome: '', preco: 0, cat: '', reg: 0, url: 'img/biblioteca-teste/choc-quente.jpg' },
      { id: 'd4', cod: '952', nome: 'Suco tropical: kiwi, laranja e limão', preco: 16, cat: 'k3', reg: 1, url: 'img/biblioteca-teste/suco-tropical.jpg' },
      { id: 'd5', cod: '', nome: 'Chocolate quente branco com pistache', preco: 28, cat: 'k2', reg: 1, url: 'img/biblioteca-teste/choc-branco.jpg' },
      { id: 'd6', cod: '', nome: '', preco: 0, cat: '', reg: 0, url: 'img/biblioteca-teste/bolo-rosa.jpg' }
    ],
    prods: [{ id: 'x1', nome: 'Bolo de brigadeiro rosa (fatia)', preco: 14, cat: 'k4' }, { id: 'x2', nome: 'Chocolate quente cremoso', preco: 22, cat: 'k2' }, { id: 'x3', nome: 'Croissant de pistache', preco: 19, cat: 'k1' }]
  });

  async function carregar() {
    if (TESTE && !(LOJA && KEY)) {
      const d = DEMO(); S.demo = true; S.dono = Q.get('visitante') !== '1';
      S.cats = d.cats; S.itens = d.itens; S.prods = d.prods; return;
    }
    // dono: o painel (mesmo navegador) deixa o login guardado; a rota do painel devolve TODAS as fotos, inclusive as sem cadastro
    if (TOKEN) {
      try {
        const r = await fetch(API + '/painel/biblioteca', { headers: hdr(), cache: 'no-store' }), d = await r.json();
        if (d && d.ok && (!LOJA || d.cli === LOJA || String(d.cli) === String(S.cli))) { S.dono = true; S.cli = d.cli; S.itens = d.itens; S.cats = d.cats; S.prods = d.prods; S.video = d.video || ''; }
      } catch (e) { /* sem rede: cai na visualização */ }
    }
    // visualização (e vídeo de fundo): pela chave do link da loja
    if (LOJA && KEY) {
      try {
        const r = await fetch(`${API}/live/biblioteca?loja=${encodeURIComponent(LOJA)}&k=${KEY}`, { cache: 'no-store' }), d = await r.json();
        if (d && d.ok) { S.cli = d.cli; S.video = d.video || ''; if (!S.dono) { S.itens = d.itens; S.cats = d.cats; } }
      } catch (e) { /* ok */ }
    }
  }

  // ---------- vídeo de fundo (o mesmo da balança) ----------
  function fundo(direto) {
    const tela = $('#tela'), antigo = $('#fundo'), url = direto || (S.video && S.cli ? `${API}/food/video/${encodeURIComponent(S.cli)}/${S.video}` : '');
    if (antigo) antigo.remove();
    if (!url) { tela.classList.remove('com-video'); relogo(); return; }
    const v = document.createElement('video'); v.id = 'fundo'; v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    v.addEventListener('playing', () => { tela.classList.add('com-video'); relogo(); }, { once: true });
    v.addEventListener('error', () => { v.remove(); tela.classList.remove('com-video'); relogo(); });
    tela.prepend(v); v.play().catch(() => {});
  }
  // vídeo de fundo próprio da biblioteca (ícone discreto no canto do painel): sobe o arquivo e guarda o id no servidor
  function mostraIconeVideo() { $('#ic-video').hidden = !S.dono; $('#b-video-x').hidden = !(S.video || S.demoVideo); }
  function enviarVideo(f) {
    if (!f) return;
    if (!/^video\/(mp4|webm|quicktime)$/.test(f.type)) { aviso('Envie um vídeo MP4 (ou WebM).'); return; }
    if (f.size > 90 * 1024 * 1024) { aviso('Vídeo de ' + (f.size / 1048576).toFixed(0) + ' MB. Use até 90 MB.'); return; }
    if (S.demo) { S.demoVideo = 1; fundo(URL.createObjectURL(f)); mostraIconeVideo(); aviso('Vídeo de fundo trocado (teste)'); return; }
    const x = new XMLHttpRequest(); x.open('POST', API + '/painel/video-upload'); x.setRequestHeader('Authorization', 'Bearer ' + TOKEN); x.setRequestHeader('Content-Type', f.type);
    const p = $('#prog'); p.hidden = false; p.textContent = 'Enviando vídeo… 0%';
    x.upload.onprogress = (e) => { if (e.lengthComputable) p.textContent = 'Enviando vídeo… ' + Math.round(e.loaded * 100 / e.total) + '%'; };
    x.onload = async () => {
      let d = {}; try { d = JSON.parse(x.responseText); } catch (e) { /* ok */ }
      if (x.status !== 200 || !d.ok) { p.textContent = 'Não enviou: ' + (d.mensagem || 'erro ' + x.status); setTimeout(() => { p.hidden = true; }, 3500); return; }
      try { await api('/painel/biblioteca-video', { vid: d.vid }); S.video = d.vid; fundo(); mostraIconeVideo(); aviso('Vídeo de fundo salvo'); }
      catch (e) { p.textContent = e.message; setTimeout(() => { p.hidden = true; }, 3500); }
    };
    x.onerror = () => { p.textContent = 'A internet caiu durante o envio. Tente de novo.'; setTimeout(() => { p.hidden = true; }, 3500); };
    x.send(f);
  }
  async function tirarVideo() {
    if (!confirm('Tirar o vídeo de fundo da biblioteca?')) return;
    try { if (!S.demo) await api('/painel/biblioteca-video', { vid: '' }); S.video = ''; S.demoVideo = 0; fundo(); mostraIconeVideo(); } catch (e) { aviso(e.message); }
  }  function relogo() { const i = document.querySelector('.loja-logo img'); if (i) i.classList.toggle('placa', $('#tela').classList.contains('com-video')); }

  // ---------- lista ----------
  const reg = (it) => !!(it.reg || it.nome);
  function categoriasVisiveis() {
    const usadas = {}; S.itens.forEach((i) => { if (reg(i) && i.cat) usadas[i.cat] = 1; });
    return S.cats.filter((c) => usadas[c.id]);
  }
  function filtrados() {
    return S.itens.filter((i) => {
      if (S.filtro === 'todos') return S.dono ? true : reg(i);
      if (S.filtro === 'pend') return !reg(i);
      if (S.filtro === 'sem') return reg(i) && !i.cat;
      return reg(i) && i.cat === S.filtro;
    });
  }
  const catNome = (id) => (S.cats.find((c) => c.id === id) || {}).nome || '';
  function pinta() {
    const pend = S.itens.filter((i) => !reg(i)).length, tot = S.dono ? S.itens.length : S.itens.filter(reg).length;
    $('#ch-n').innerHTML = `<b>${tot}</b> fotos`;
    $('#ch-add').hidden = !S.dono; $('#ch-pend').hidden = !S.dono; $('#ch-pend').innerHTML = `Sem cadastro <b>${pend}</b>`; $('#ch-pend').classList.toggle('on', S.filtro === 'pend');
    $('#selo-teste').hidden = !S.demo;
    // categorias: só as que já têm foto cadastrada (a biblioteca vai ganhando categorias conforme se cadastra)
    const cs = categoriasVisiveis(), semCat = S.itens.filter((i) => reg(i) && !i.cat).length;
    let h = `<button type="button" class="cat${S.filtro === 'todos' ? ' on' : ''}" data-f="todos">Todos</button>`;
    cs.forEach((c) => { h += `<button type="button" class="cat${S.filtro === c.id ? ' on' : ''}" data-f="${esc(c.id)}">${esc(c.nome)}</button>`; });
    if (S.dono && semCat) h += `<button type="button" class="cat${S.filtro === 'sem' ? ' on' : ''}" data-f="sem">Sem categoria</button>`;
    $('#cats').innerHTML = h;
    const l = filtrados();
    const cartao = (i) => `<button type="button" class="beb${i.id === S.sel ? ' tem' : ''}" data-id="${esc(i.id)}"><span class="ft" style="background-image:url('${esc(fotoUrl(i))}')"></span>${reg(i) ? '' : '<span class="pend">Falta cadastrar</span>'}${i.cod ? `<em>Cód. ${esc(i.cod)}</em>` : ''}<b>${esc(i.nome || (S.dono ? 'Sem nome' : ''))}</b><span>${reg(i) && i.preco > 0 ? real(i.preco) : ''}</span><i>+</i></button>`;
    let hl = '';
    if (!l.length) hl = `<div class="vazio">${S.dono ? (S.itens.length ? 'Nenhuma foto neste grupo.' : 'Nenhuma foto ainda. Toque em “+ Adicionar fotos”.') : 'A biblioteca ainda não tem fotos cadastradas.'}</div>`;
    else if (S.filtro === 'todos') {
      // lista contínua, com o título de cada categoria (como as bebidas da balança)
      const grupos = S.cats.map((c) => ({ nome: c.nome, it: l.filter((i) => reg(i) && i.cat === c.id) })), resto = l.filter((i) => !reg(i) || !S.cats.find((c) => c.id === i.cat));
      grupos.push({ nome: resto.some(reg) ? 'Sem categoria' : 'Sem cadastro', it: resto });
      hl = grupos.filter((g) => g.it.length).map((g) => `<h4>${esc(g.nome)}</h4><div class="gr4">${g.it.map(cartao).join('')}</div>`).join('');
    } else hl = `<h4>${esc(S.filtro === 'pend' ? 'Sem cadastro' : S.filtro === 'sem' ? 'Sem categoria' : catNome(S.filtro))}</h4><div class="gr4">${l.map(cartao).join('')}</div>`;
    $('#lista').innerHTML = hl;    pintaPainel();
  }

  // ---------- painel da direita ----------
  function pintaPainel() {
    const p = $('#painel'), it = S.itens.find((i) => i.id === S.sel);
    if (!it) { p.innerHTML = `<div class="vazio-p">${S.dono ? 'Toque numa foto para cadastrar o produto.' : 'Toque numa foto para ver os detalhes.'}</div>`; return; }
    if (!S.dono) {
      p.innerHTML = `<div class="cab"><h2>Detalhes</h2></div><div class="corpo"><div class="grande" style="background-image:url('${esc(fotoUrl(it))}')"></div><div class="nome-g">${esc(it.nome)}</div>${it.preco > 0 ? `<div class="preco-g">${real(it.preco)}</div>` : ''}${it.cat ? `<div class="sub">${esc(catNome(it.cat))}</div>` : ''}${it.cod ? `<div class="sub">Código ${esc(it.cod)}</div>` : ''}</div>`;
      return;
    }
    const vinc = it.prodId ? S.prods.find((x) => x.id === it.prodId) : null, opcs = '<option value="">Sem categoria</option>' + S.cats.map((c) => `<option value="${esc(c.id)}"${c.id === it.cat ? ' selected' : ''}>${esc(c.nome)}</option>`).join('') + '<option value="__nova">+ Nova categoria…</option>';
    p.innerHTML = `<div class="cab" style="display:flex;align-items:center;justify-content:space-between;gap:8px"><h2>${reg(it) ? 'Produto' : 'Cadastrar'}</h2><div class="miniatura" style="background-image:url('${esc(fotoUrl(it))}')"></div></div><div class="corpo">
      ${vinc ? `<div class="sub">Ligada ao produto <b>${esc(vinc.nome)}</b> do cardápio. Nome e preço mudam lá.</div>` : ''}
      <label for="f-nome">Nome do produto</label><input type="text" id="f-nome" maxlength="80" autocomplete="off" value="${esc(vinc ? vinc.nome : it.nome)}" ${vinc ? 'disabled' : ''}>
      <div class="linha2"><div><label for="f-preco">Preço</label><input type="text" id="f-preco" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${(vinc ? vinc.preco : it.preco) > 0 ? String(vinc ? vinc.preco : it.preco).replace('.', ',') : ''}" ${vinc ? 'disabled' : ''}></div>
      <div><label for="f-cod">Código antigo</label><input type="text" id="f-cod" maxlength="20" autocomplete="off" placeholder="ex.: 1100" value="${esc(it.cod)}"></div></div>
      <label for="f-cat">Categoria</label><select id="f-cat">${opcs}</select>
      <input type="text" id="f-catnova" placeholder="Nome da nova categoria" maxlength="40" hidden style="margin-top:6px">
      ${vinc ? '' : `<label for="f-prod">Ou ligar a um produto que já existe</label><input type="search" id="f-busca" placeholder="Buscar no cardápio…" autocomplete="off"><select id="f-prod" size="1" style="margin-top:6px"><option value="">Criar produto novo no cardápio</option>${prodOpcoes('')}</select>`}
      ${vinc ? '' : '<label class="ck"><input type="checkbox" id="f-ativo" checked> Já entra ativo no cardápio</label>'}
      <div class="nota">${vinc ? '' : 'A foto vai para o cadastro do produto em formato quadrado, no fundo branco. Aqui na biblioteca ela continua vertical.'}</div>
    </div><div class="rod"><div class="msg" id="f-msg"></div><button type="button" class="bt pri" id="f-ok">${reg(it) ? 'OK, salvar' : 'OK, cadastrar'}</button><button type="button" class="bt p er" id="f-del">Remover foto da biblioteca</button></div>`;
  }
  function prodOpcoes(q) {
    const n = norm(q), usados = {}; S.itens.forEach((i) => { if (i.prodId) usados[i.prodId] = 1; });
    return S.prods.filter((x) => !usados[x.id] && (!n || norm(x.nome).includes(n))).slice(0, 60).map((x) => `<option value="${esc(x.id)}">${esc(x.nome)} · ${real(x.preco)}</option>`).join('');
  }

  // ---------- imagens ----------
  function carregaImg(src, cors) { return new Promise((ok, no) => { const im = new Image(); if (cors) im.crossOrigin = 'anonymous'; im.onload = () => ok(im); im.onerror = no; im.src = src; }); }
  function jpeg(cv, max) { let q = 0.82, o = cv.toDataURL('image/jpeg', q); while (o.length > max && q > 0.35) { q -= 0.08; o = cv.toDataURL('image/jpeg', q); } return o; }
  // foto da biblioteca: continua vertical (até 720x1280)
  async function reduzArquivo(f) {
    const url = URL.createObjectURL(f);
    try {
      const im = await carregaImg(url);
      const s = Math.min(1, 1280 / Math.max(im.naturalWidth, im.naturalHeight)), cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(im.naturalWidth * s)); cv.height = Math.max(1, Math.round(im.naturalHeight * s));
      cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
      return jpeg(cv, 340000);
    } finally { URL.revokeObjectURL(url); }
  }
  // cadastro do produto: quadrado 700x700, foto inteira no fundo branco
  async function fotoQuadrada(it) {
    const im = await carregaImg(fotoUrl(it), true), L = 700, cv = document.createElement('canvas'); cv.width = cv.height = L;
    const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, L, L);
    const k = Math.min(L / im.naturalWidth, L / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k;
    c.drawImage(im, (L - w) / 2, (L - h) / 2, w, h); return jpeg(cv, 420000);
  }

  // ---------- ações do dono ----------
  const msg = (t, ok) => { const e = $('#f-msg'); if (e) { e.textContent = t || ''; e.className = 'msg' + (ok ? ' ok' : ''); } };
  async function salvar() {
    const it = S.itens.find((i) => i.id === S.sel); if (!it || S.salvando) return;
    const vinc = it.prodId ? S.prods.find((x) => x.id === it.prodId) : null, nome = (($('#f-nome') || {}).value || '').trim(), pr = preco(($('#f-preco') || {}).value), cod = ($('#f-cod').value || '').trim();
    let cat = $('#f-cat').value; const escolhido = $('#f-prod') ? $('#f-prod').value : '';
    if (!vinc && !escolhido && !nome) { msg('Digite o nome do produto.'); return; }
    if (!vinc && !escolhido && !(pr > 0)) { msg('Digite o preço.'); return; }
    S.salvando = true; $('#f-ok').disabled = true; $('#f-ok').textContent = 'Salvando…'; msg('');
    try {
      if (S.demo) { await new Promise((r) => setTimeout(r, 500)); }
      if (cat === '__nova') {
        const nn = ($('#f-catnova').value || '').trim(); if (!nn) throw new Error('Digite o nome da nova categoria.');
        if (S.demo) { cat = 'k' + Date.now(); S.cats.push({ id: cat, nome: nn }); }
        else { const d = await api('/painel/cardapio-salvar', { tipo: 'cat', item: { nome: nn } }); cat = d.id; S.cats.push({ id: cat, nome: nn }); }
      }
      let prodId = vinc ? vinc.id : escolhido, nm = nome, vl = pr, fotoProd = '';
      if (!S.demo && !vinc) { try { fotoProd = await fotoQuadrada(it); } catch (e) { fotoProd = ''; } }
      if (!prodId) {
        if (S.demo) prodId = 'p' + Date.now();
        else {
          const d = await api('/painel/cardapio-salvar', { tipo: 'prod', item: { nome: nm, preco: vl, cat: cat === '__nova' ? '' : cat, foto: fotoProd, desc: '', adicionais: [], tamanhos: [], sabores: [], ativo: !$('#f-ativo') || $('#f-ativo').checked, delivery: true, destaque: false } });
          prodId = d.id;
        }
      } else if (!vinc) { const x = S.prods.find((z) => z.id === prodId); if (x) { nm = x.nome; vl = Number(x.preco) || 0; } }
      if (!S.demo) await api('/painel/biblioteca-salvar', { id: it.id, cod, nome: nm, preco: vl, cat, prodId, fotoProd });
      Object.assign(it, { cod, nome: nm || it.nome, preco: vl || it.preco, cat, prodId, reg: 1 });
      if (!S.prods.find((z) => z.id === prodId)) S.prods.push({ id: prodId, nome: nm, preco: vl, cat });
      S.salvando = false; aviso('Cadastrado: ' + (it.nome || 'produto')); proximaPendente(it.id);
    } catch (e) { S.salvando = false; pintaPainel(); msg(e.message || 'Não salvou.'); }
  }
  function proximaPendente(depoisDe) {
    const l = filtrados(), i = l.findIndex((x) => x.id === depoisDe), prox = l.slice(i + 1).find((x) => !reg(x)) || S.itens.find((x) => !reg(x));
    S.sel = prox ? prox.id : ''; pinta();
    if (prox) { const el = document.querySelector(`.beb[data-id="${prox.id}"]`); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }
  async function remover() {
    const it = S.itens.find((i) => i.id === S.sel); if (!it) return;
    if (!confirm('Remover esta foto da biblioteca? O produto do cardápio, se existir, continua.')) return;
    try { if (!S.demo) await api('/painel/biblioteca-apagar', { id: it.id }); S.itens = S.itens.filter((i) => i.id !== it.id); S.sel = ''; pinta(); } catch (e) { msg(e.message); }
  }
  function aviso(t) { const p = $('#prog'); p.textContent = t; p.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(() => { p.hidden = true; }, 2600); }
  async function subir(files) {
    const l = Array.from(files).filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(f.name)), tot = l.length; let feitas = 0, falhas = 0; if (!tot) return;
    const p = $('#prog'); p.hidden = false;
    const fila = l.slice();
    async function um() {
      while (fila.length) {
        const f = fila.shift(); p.textContent = `Enviando… ${feitas + falhas + 1} de ${tot}`;
        try {
          const foto = await reduzArquivo(f);
          if (S.demo) { S.itens.push({ id: 'd' + Date.now() + feitas, cod: '', nome: '', preco: 0, cat: '', reg: 0, url: foto }); }
          else { const d = await api('/painel/biblioteca-foto', { foto }); S.itens.push({ id: d.id, cod: '', nome: '', preco: 0, cat: '', reg: 0, prodId: '', v: Date.now() }); }
          feitas++;
        } catch (e) { falhas++; }
        pinta();
      }
    }
    await Promise.all([um(), um()]);
    p.textContent = `${feitas} foto${feitas === 1 ? '' : 's'} enviada${feitas === 1 ? '' : 's'}${falhas ? ' · ' + falhas + ' com erro' : ''}`; setTimeout(() => { p.hidden = true; }, 3500);
    S.filtro = 'pend'; pinta();
  }

  // ---------- eventos ----------
  $('#cats').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b) return; S.filtro = b.dataset.f; pinta(); });
  $('#lista').addEventListener('click', (e) => { if (!S.dono) return; const b = e.target.closest('.beb'); if (!b) return; S.sel = b.dataset.id; pinta(); });
  $('#ch-pend').addEventListener('click', () => { S.filtro = S.filtro === 'pend' ? 'todos' : 'pend'; pinta(); });
  $('#ch-add').addEventListener('click', () => $('#arq').click());
  $('#b-video').addEventListener('click', () => $('#arq-video').click());
  $('#b-video-x').addEventListener('click', tirarVideo);
  $('#arq-video').addEventListener('change', (e) => { enviarVideo(e.target.files[0]); e.target.value = ''; });
  $('#arq').addEventListener('change', (e) => { const f = e.target.files; subir(f); e.target.value = ''; });
  $('#painel').addEventListener('click', (e) => { if (e.target.id === 'f-ok') salvar(); else if (e.target.id === 'f-del') remover(); });
  $('#painel').addEventListener('change', (e) => {
    if (e.target.id === 'f-cat') $('#f-catnova').hidden = e.target.value !== '__nova';
    if (e.target.id === 'f-prod') { const x = S.prods.find((z) => z.id === e.target.value); if (x) { $('#f-nome').value = x.nome; $('#f-preco').value = String(x.preco).replace('.', ','); if (x.cat && S.cats.find((c) => c.id === x.cat)) $('#f-cat').value = x.cat; } }
  });
  $('#painel').addEventListener('input', (e) => { if (e.target.id === 'f-busca') { $('#f-prod').innerHTML = '<option value="">Criar produto novo no cardápio</option>' + prodOpcoes(e.target.value); } });

  (async function () {
    await carregar(); document.body.classList.toggle('dono', S.dono); fundo(); mostraIconeVideo(); pinta();
    const c = $('#carregando'); if (c) c.remove();
    if (S.dono && S.itens.some((i) => !reg(i))) { S.filtro = 'pend'; pinta(); }
    setInterval(() => { if (!S.dono && !S.demo && LOJA && KEY) { carregar().then(pinta).catch(() => {}); } }, 120000);
  })();
})();
