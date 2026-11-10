/* Ligação do totem com o LiveFood (Giro OS).
   O LiveFood é multi-cliente: cada totem é ligado a UMA loja pelo código dela no sistema
   (?loja=codigo no endereço, ou o campo "Código da loja" nas configurações).
   O Live carrega o cardápio dessa loja (o mesmo que o cardápio online usa) e manda os pedidos pro painel dela.
   Sem código, usa o cardápio de exemplo (js/cardapio-exemplo.js).
   Os outros scripts só carregam depois que o cardápio está pronto. */
(function () {
  'use strict';

  const API = 'https://giro-os-api.nucleofull.workers.dev';
  const SCRIPTS = ['js/frases.js', 'js/live.js', 'js/voz.js', 'js/cerebro.js', 'js/app.js'];
  const r2 = (v) => Math.round(v * 100) / 100;
  const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const ler = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };

  // código da loja: o do endereço vale mais que o salvo nas configurações
  const Q = new URLSearchParams(location.search);
  const doEndereco = Q.get('loja') || Q.get('c') || '';
  const codigo = String(doEndereco || (ler('live-config') || {}).loja || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
  // chave do totem (vem no link copiado do painel). Com ela, a IA e a voz passam pelo servidor do LiveFood
  // e as configurações (modelo, treinamento, envio de pedidos) vêm do painel da loja.
  const chaveTotem = codigo && doEndereco ? String(Q.get('k') || '').replace(/[^a-f0-9]/g, '').slice(0, 64) : '';

  // ---------------------------------------------------------------------------
  // Abrir na hora: o cardápio e as configurações do painel ficam guardados neste aparelho.
  // Com cópia guardada, o totem abre com ela (sem esperar os 2 a 3 s do servidor) e confere a versão
  // do servidor por trás. Se algo mudou no painel, guarda a nova e recarrega a página assim que o
  // totem estiver livre (tela de espera, sem a janela do operador aberta). Confere de novo a cada 10 min.
  // Preço não tem risco: o pedido é sempre recalculado pelo servidor.
  // ---------------------------------------------------------------------------
  const kConfig = 'live-painel-' + codigo;
  const urlConfig = () => `${API}/live/config?loja=${encodeURIComponent(codigo)}&k=${chaveTotem}`;
  const urlCardapio = () => API + '/food/cardapio/' + encodeURIComponent(codigo);
  const conferir = []; // { k, url, atual }
  async function buscarJson(url, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
      const d = await r.json();
      return { r, d };
    } finally { clearTimeout(t); }
  }
  function vigiar(k, url, d) { conferir.push({ k, url, atual: JSON.stringify(d) }); }
  let recarregando = false;
  async function conferirServidor() {
    for (const c of conferir) {
      try {
        const { d } = await buscarJson(c.url, 15000);
        if (d && d.ok === false) { // o servidor recusou (link desativado, loja desligada): esquece a cópia
          try { localStorage.removeItem(c.k); } catch (e) { /* ok */ }
          recarregarQuandoLivre();
          continue;
        }
        if (!d || !d.ok) continue;
        const s = JSON.stringify(d);
        if (s === c.atual) continue;
        gravar(c.k, d);
        c.atual = s;
        console.info('Live · mudou no painel (' + c.k + '): recarrega quando o totem estiver livre');
        recarregarQuandoLivre();
      } catch (e) { console.warn('Conferência com o servidor falhou:', e); }
    }
  }
  function recarregarQuandoLivre() {
    if (recarregando) return;
    recarregando = true;
    const ver = () => {
      const T = window.Totem, dlg = document.getElementById('config');
      const livre = (!T || T.estado.modo === 'standby') && !(dlg && dlg.open);
      if (livre) location.reload(); else setTimeout(ver, 5000);
    };
    ver();
  }

  async function configDoPainel() {
    if (!chaveTotem) return null;
    const copia = ler(kConfig);
    if (copia && copia.ok) {
      /* (262) ao abrir, tenta a configuração ATUAL do painel por até 2,5 s (ex.: voz nova da ElevenLabs vale já na primeira fala).
         Sem resposta a tempo, segue com a cópia guardada e confere depois, como antes */
      try {
        const { d } = await buscarJson(urlConfig(), 2500);
        if (d && d.ok) { gravar(kConfig, d); vigiar(kConfig, urlConfig(), d); return { ...d, k: chaveTotem }; }
      } catch (e) { /* rede lenta: usa a cópia */ }
      vigiar(kConfig, urlConfig(), copia); return { ...copia, k: chaveTotem };
    }
    try {
      const { d } = await buscarJson(urlConfig(), 8000);
      if (!d.ok) return { erro: d.mensagem || 'Link do totem inválido.' };
      gravar(kConfig, d);
      vigiar(kConfig, urlConfig(), d);
      return { ...d, k: chaveTotem };
    } catch (e) { return { erro: 'Não consegui falar com o servidor do LiveFood.' }; }
  }

  // ---------------------------------------------------------------------------
  // Preço (mesma conta do servidor do LiveFood: tamanho → sabores → promoção → extras → borda e adicionais)
  // ---------------------------------------------------------------------------
  function comPromo(v, pm) {
    if (!pm || !pm.valor || !(v > 0)) return v;
    return Math.max(0, r2(pm.tipo === 'pct' ? v * (1 - pm.valor / 100) : v - pm.valor));
  }
  function precoUnit(it, sab = [], adds = []) {
    if (!it) return 0;
    let base = it.base, ex = 0;
    const n = sab.length;
    if (n && it.sabores.length) {
      const ps = sab.map((nome) => {
        const sb = it.sabores.find((s) => s.nome === nome);
        if (!sb) return null;
        ex += (sb.extra4 || 0) * Math.max(1, Math.round(4 / n));
        const pr = sb.precos && sb.precos[it.tamId || '_'];
        return pr > 0 ? pr : null;
      });
      if (ps.some(Boolean)) { const b0 = base; base = ps.reduce((a, x) => a + (x || b0), 0) / n; }
    }
    let v = comPromo(base, it.promo) + ex;
    for (const a of adds) {
      const x = it.bordas.concat(it.adicionais).find((z) => z.nome === a);
      if (x) v += x.preco;
    }
    return r2(v);
  }

  // ícone no rosto do Live e emoji do cartãozinho, pelo nome da categoria
  function visual(nomeCat, nomeItem, loja) {
    const t = semAcento(nomeCat + ' ' + nomeItem);
    // (137) farmácia, mercado, pet...: ícones da categoria, sem desenho de comida no rosto do Live
    if (loja) {
      if (/fralda|bebe|mamae|infantil|kids/.test(t)) return { icone: null, emoji: '🍼' };
      if (/vitamin|suplement|colageno|omega|whey/.test(t)) return { icone: null, emoji: '🌿' };
      if (/remedio|medicament|saude|farma|analges|gripe|comprimid/.test(t)) return { icone: null, emoji: '💊' };
      if (/beleza|dermo|cosmet|labio|maquiag|perfum|protetor|hidratante/.test(t)) return { icone: null, emoji: '💄' };
      if (/higiene|cuidado|banho|bucal|dental|sabonete|shampoo|desodorante|absorvente/.test(t)) return { icone: null, emoji: '🧴' };
      if (/limpeza|lavanderia|detergente/.test(t)) return { icone: null, emoji: '🧽' };
      if (/pet|racao|cachorro|gato/.test(t)) return { icone: null, emoji: '🐾' };
      if (/bebida|suco|refri|agua|cerveja/.test(t)) return { icone: 'bebida', emoji: '🥤' };
      if (/mercearia|alimento|hortifruti|fruta|padaria|pao/.test(t)) return { icone: null, emoji: '🛒' };
      return { icone: null, emoji: '🛍️' };
    }
    if (/pizza/.test(t)) return { icone: null, emoji: '🍕' };
    if (/bebida|drink|suco|refri|cerveja|chopp|caipi|agua|refrigerante/.test(t)) return { icone: 'bebida', emoji: '🥤' };
    if (/sobremesa|doce|sorvete|acai|milk/.test(t)) return { icone: 'sorvete', emoji: '🍨' };
    if (/porc|batata|fritas|entrad|petisc|acompanh|pastel/.test(t)) return { icone: 'batata', emoji: '🍟' };
    if (/salada/.test(t)) return { icone: null, emoji: '🥗' };
    if (/la carte|prato|refeic|executivo|marmit/.test(t)) return { icone: null, emoji: '🍽️' };
    return { icone: 'hamburguer', emoji: '🍔' };
  }

  // ---------------------------------------------------------------------------
  // Cardápio do LiveFood → formato do totem (um item por tamanho; sabores e adicionais ficam no item)
  // ---------------------------------------------------------------------------
  const NAO_TEMOS = ['pizza', 'sushi', 'lasanha', 'acai', 'pastel', 'cerveja', 'chopp', 'hot dog', 'cachorro quente', 'esfiha', 'coxinha',
    'salada', 'cafe', 'tapioca', 'temaki', 'churrasco', 'feijoada', 'vinho', 'whisky', 'caipirinha', 'sanduiche natural', 'pao de queijo'];

  function converter(d) {
    const cli = d.cli;
    // (137) restaurante ou outra loja (farmácia, mercado...): vem do botão do catálogo escolhido em Ofertas
    const cat = (d.cfg && d.cfg.menu && d.cfg.menu.catalogo) || {}, catNome = cat.nome || 'Cardápio', nCat = semAcento(catNome.toLowerCase());
    const ehRest = nCat === 'cardapio' || nCat === 'menu' || !cat.icone || cat.icone === 'cardapio';
    const categorias = (d.cats || []).map((c) => ({ id: c.id, nome: c.nome }));
    const nomeCat = (id) => (categorias.find((c) => c.id === id) || {}).nome || '';
    const itens = [];
    for (const p of Object.values(d.produtos || {})) {
      const ads = Array.isArray(p.adicionais) ? p.adicionais.map((a) => ({ nome: a.nome, preco: Number(a.preco) || 0 })) : [];
      const comum = {
        pid: p.id, produto: p.nome, categoria: p.cat || '', descricao: p.desc || '', promo: p.promo || null,
        sabores: (p.sabores || []).map((s) => ({ nome: s.nome, desc: s.desc || '', grupo: s.grupo || '', extra4: Number(s.extra4) || 0, precos: s.precos || {} })),
        bordas: ads.filter((a) => /borda/i.test(a.nome)),
        adicionais: ads.filter((a) => !/borda/i.test(a.nome)),
        foto: p.foto ? `${API}/food/foto/${encodeURIComponent(cli)}/${encodeURIComponent(p.id)}` : '',
        ...visual(nomeCat(p.cat), p.nome, !ehRest),
      };
      const tams = Array.isArray(p.tamanhos) ? p.tamanhos : [];
      if (tams.length) {
        for (const t of tams) {
          itens.push({ ...comum, id: p.id + '~' + t.id, nome: `${p.nome} ${t.nome}`, tam: t.nome, tamId: t.id, base: Number(t.preco) || 0,
            maxSabores: comum.sabores.length ? Math.max(1, Number(t.max) || 1) : 0, apelidos: [`${t.nome} ${p.nome}`, `${p.nome} ${t.nome}`] });
        }
      } else {
        if (!(Number(p.preco) > 0) && !comum.sabores.length) continue; // produto sem preço nem opções: não dá pra pedir
        itens.push({ ...comum, id: p.id, nome: p.nome, tam: '', tamId: '', base: Number(p.preco) || 0, maxSabores: comum.sabores.length ? 1 : 0, apelidos: [] });
      }
    }
    for (const i of itens) i.preco = precoUnit(i);

    // destaques: o que está em promoção; se não tiver, o primeiro item de cada uma das 3 primeiras categorias
    let destaques = itens.filter((i) => i.promo);
    if (!destaques.length) destaques = categorias.slice(0, 3).map((c) => itens.find((i) => i.categoria === c.id)).filter(Boolean);
    destaques.forEach((i) => { i.destaque = true; });

    // "não temos": só o que não aparece em nenhum nome do cardápio
    const tudo = ' ' + semAcento(itens.map((i) => i.nome + ' ' + i.sabores.map((s) => s.nome).join(' ')).concat(categorias.map((c) => c.nome)).join(' ')) + ' ';
    // (compara o começo da palavra: "pastel" × "pasteizinhos", "caipirinha" × "caipiras")
    const naoTemos = NAO_TEMOS.filter((x) => !tudo.includes(x) && !(x.length >= 6 && !x.includes(' ') && tudo.includes(' ' + x.slice(0, 5))));

    // (131) logo do painel (a colorida, feita para fundo claro como o do totem); sem ela, o Worker devolve a logo do app
    const logo = d.cfg && d.cfg.logo ? `${API}/food/foto/${encodeURIComponent(cli)}/_logop?v=${d.cfg.v || 0}` : '';
    return { loja: d.empresa || 'LiveFood', cli, logo, categorias, itens, naoTemos: ehRest ? naoTemos : [], horarios: (d.cfg && d.cfg.horarios) || null, pagto: (d.cfg && d.cfg.pagto) || null, ehRest, catNome }; // (136) formas de pagamento da loja
  }

  function exemplo() {
    const e = window.CARDAPIO_EXEMPLO;
    return {
      ...e, cli: '',
      itens: e.itens.map((i) => ({ ...i, pid: i.id, produto: i.nome, tam: '', tamId: '', base: i.preco, sabores: [], bordas: [], adicionais: [], maxSabores: 0, foto: '', promo: null })),
    };
  }

  // ---------------------------------------------------------------------------
  // Pedido → painel da loja
  // O totem entra como um cliente "Totem" da loja (igual à mesa por QR code) e manda o pedido
  // como retirada no balcão, pago no caixa. O painel importa esse pedido como os do app.
  // ---------------------------------------------------------------------------
  let tokenEmCurso = null; // o pedido do token já saiu no começo do atendimento: o fechamento aproveita o mesmo
  function tokenTotem(renovar) {
    if (renovar || !tokenEmCurso) tokenEmCurso = buscarToken(renovar).catch((e) => { tokenEmCurso = null; throw e; });
    return tokenEmCurso;
  }
  async function buscarToken(renovar) {
    const k = 'live-token-' + M.cli, salvo = ler(k);
    if (!renovar && salvo && salvo.exp > Date.now()) return salvo.tk;
    const r = await fetch(API + '/food/conta/mesa-entrar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cli: M.cli, mesa: 'Totem' }),
    });
    const j = await r.json().catch(() => ({}));
    if (!j.ok || !j.token) throw new Error(j.mensagem || 'Não consegui entrar na loja (' + r.status + ')');
    gravar(k, { tk: j.token, exp: Date.now() + 11 * 3600000 }); // o token vale 12 h
    return j.token;
  }

  async function enviarPedido(carrinho, { nome = '' } = {}) {
    if (!M.cli) return { ok: false, erro: 'sem_loja', mensagem: 'Totem sem loja do LiveFood configurada.' };
    const itens = carrinho.map((l) => {
      const i = M.itens.find((x) => x.id === l.id);
      const adds = l.adds || [];
      const borda = adds.find((a) => i.bordas.some((b) => b.nome === a)) || '';
      return { p: i.pid, qty: l.qtd, tam: i.tam, sab: l.sab || [], borda, adds: adds.filter((a) => a !== borda), obs: l.obs || '' };
    });
    // o nome vai no campo "nome" (o servidor usa nos pedidos do totem) e também na observação, que aparece em qualquer versão
    const corpo = JSON.stringify({ modo: 'retirada', pagto: 'dinheiro', troco: 0, itens, nome,
      obs: (nome ? `Cliente: ${nome}. ` : '') + 'Pedido feito no totem (Live). Pagar no caixa.' });
    let resp = null;
    for (const renovar of [false, true]) {
      const tk = await tokenTotem(renovar);
      const r = await fetch(API + '/food/pedido', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk }, body: corpo });
      resp = await r.json().catch(() => ({ ok: false, mensagem: 'Resposta inválida do servidor (' + r.status + ')' }));
      if (r.status !== 401) break; // sessão vencida: entra de novo uma vez
    }
    if (resp && resp.ok && resp.pedido) return { ok: true, num: resp.pedido.num, id: resp.pedido.id, total: resp.pedido.total };
    return { ok: false, erro: (resp && resp.erro) || 'falhou', mensagem: (resp && resp.mensagem) || 'Não consegui enviar o pedido.' };
  }

  // ---------------------------------------------------------------------------
  // Carregamento
  // ---------------------------------------------------------------------------
  let M = null;

  async function carregar() {
    if (!codigo) { M = exemplo(); M.origem = 'exemplo'; return; }
    const kc = 'live-cardapio-' + codigo;
    // com cópia guardada: abre com ela na hora e confere o servidor por trás
    const guardado = ler(kc);
    if (guardado && guardado.ok) {
      try {
        const m = converter(guardado);
        if (m.itens.length) { M = m; M.origem = 'livefood'; M.daCopia = true; vigiar(kc, urlCardapio(), guardado); return; }
      } catch (e) { console.warn('Cópia do cardápio inválida:', e); }
    }
    try {
      const { r, d } = await buscarJson(urlCardapio(), 8000);
      if (!d.ok) throw new Error(d.mensagem || d.erro || 'HTTP ' + r.status);
      gravar(kc, d); // cópia para abrir na hora da próxima vez e continuar funcionando se a internet cair
      vigiar(kc, urlCardapio(), d);
      M = converter(d); M.origem = 'livefood';
    } catch (e) {
      console.warn('Cardápio do LiveFood não carregou:', e);
      const copia = ler(kc);
      if (copia) { M = converter(copia); M.origem = 'copia'; } else { M = exemplo(); M.origem = 'exemplo'; M.erro = String(e.message || e); }
    }
    if (!M.itens.length) { M = exemplo(); M.origem = 'exemplo'; M.erro = 'A loja não tem itens ativos no cardápio.'; }
  }

  // topo: logo do restaurante (e o LiveFood assina no rodapé); sem loja ou sem logo, o topo fica com a do LiveFood.
  // A logo fica guardada neste aparelho (live-logo-<loja>): da segunda abertura em diante ela aparece na hora,
  // sem esperar o cardápio (uns 3 s) nem o download da imagem. Se a loja trocar a logo no painel, a nova substitui a guardada.
  const kLogo = 'live-logo-' + codigo;
  let logoNaTela = '';
  function pintarLogo(src, clara, alt) {
    const img = document.getElementById('logo-loja');
    img.onload = img.onerror = null;
    img.alt = alt || '';
    img.classList.toggle('clara', !!clara); // logo branca (feita pra fundo escuro): no totem branco ela aparece escura
    img.classList.add('da-loja', 'pronta');
    img.src = src;
    document.getElementById('rodape').classList.add('visivel');
  }
  function logoGuardada() {
    if (!codigo) return;
    const g = ler(kLogo);
    if (!g || !g.data || !/^data:image\//.test(g.data)) return;
    pintarLogo(g.data, g.clara, g.alt);
    logoNaTela = g.url;
  }
  function guardarLogo(img, url, clara, alt) {
    try {
      // reduz para o tamanho em que ela aparece (2x, para ficar nítida) e guarda como texto
      const h = Math.min(330, img.naturalHeight), w = Math.max(1, Math.round(h * img.naturalWidth / img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      let data = c.toDataURL('image/webp', 0.92);
      if (!/^data:image\/webp/.test(data)) data = c.toDataURL('image/png'); // Safari não faz webp
      gravar(kLogo, { url, data, clara, alt });
      return data;
    } catch (e) { return ''; /* sem armazenamento: só não fica guardada */ }
  }
  function mostrarLogo() {
    const img = document.getElementById('logo-loja');
    const doLiveFood = () => {
      img.onload = img.onerror = null;
      img.classList.remove('da-loja', 'clara'); img.alt = 'livefood'; img.src = 'img/logo-livefood.png'; img.classList.add('pronta');
      document.getElementById('rodape').classList.remove('visivel');
      logoNaTela = '';
    };
    if (!M.logo) {
      if (M.origem === 'livefood') { try { localStorage.removeItem(kLogo); } catch (e) { /* ok */ } doLiveFood(); } // a loja tirou a logo
      else if (!logoNaTela) doLiveFood(); // sem internet e sem cópia: fica com a guardada, se houver
      return;
    }
    if (logoNaTela === M.logo) return; // a guardada já é a atual
    baixarLogo(M.logo, M.loja, () => { if (!logoNaTela) doLiveFood(); });
  }
  // baixa num objeto à parte: a guardada continua na tela até a nova chegar
  function baixarLogo(url, alt, aoFalhar) {
    const nova = new Image();
    nova.crossOrigin = 'anonymous'; // permite medir as cores da logo e guardar
    nova.onload = () => {
      if (logoNaTela === url) return;
      if (M && M.origem && M.logo !== url) return; // o cardápio já chegou com outra logo (ou sem logo)
      const clara = logoClara(nova);
      const data = guardarLogo(nova, url, clara, alt);
      pintarLogo(data || url, clara, alt);
      logoNaTela = url;
    };
    nova.onerror = () => { aoFalhar && aoFalhar(); };
    nova.src = url;
  }
  logoGuardada();
  // ainda sem logo guardada (primeira vez depois desta versão), mas com cópia do cardápio: já começa a baixar a logo
  if (codigo && !logoNaTela) {
    const copia = ler('live-cardapio-' + codigo);
    if (copia && copia.ok && copia.cfg && copia.cfg.logo && copia.cli) {
      baixarLogo(`${API}/food/foto/${encodeURIComponent(copia.cli)}/_logop?v=${copia.cfg.v || 0}`, copia.empresa || '');
    }
  }
  // a logo é quase toda branca? (média de brilho dos pixels visíveis)
  function logoClara(img) {
    try {
      const c = document.createElement('canvas');
      c.width = 64; c.height = Math.max(1, Math.round(64 * img.naturalHeight / img.naturalWidth));
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0, c.width, c.height);
      const px = g.getImageData(0, 0, c.width, c.height).data;
      let soma = 0, n = 0;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] < 40) continue; // transparente
        soma += (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255; n++;
      }
      return n > 0 && soma / n > 0.82;
    } catch (e) { return false; }
  }

  // a logo aparece assim que o cardápio chega (sem esperar as configurações do painel)
  const cardapioPronto = carregar().then(() => { try { mostrarLogo(); } catch (e) { console.warn('Logo:', e); } });
  Promise.all([cardapioPronto, configDoPainel()]).then(([, painel]) => {
    M.codigo = codigo;
    M.api = API;
    M.servidor = painel && !painel.erro ? painel : null; // { k, ativo, modelo, esforco, enviar, treino, ia, voz }
    M.servidorErro = painel && painel.erro ? painel.erro : '';
    M.precoUnit = precoUnit;
    M.precoLinha = (l) => precoUnit(M.itens.find((i) => i.id === l.id), l.sab || [], l.adds || []) * l.qtd;
    M.enviarPedido = enviarPedido;
    // confere o servidor por trás (logo depois de abrir, sem disputar a rede com os scripts) e a cada 10 min
    setTimeout(conferirServidor, 1500);
    setInterval(conferirServidor, 10 * 60000);
    // pega o token do totem quando o cliente começa (vale 11 h); no fechamento sobra só o envio do pedido
    M.prepararEnvio = () => { if (M.cli) tokenTotem(false).catch((e) => console.warn('Token do totem:', e)); };
    window.LIVEFOOD = M;
    const versao = Date.now(); // sempre a versão mais nova dos arquivos (nada de arquivo antigo guardado pelo navegador)
    for (const src of SCRIPTS) {
      const s = document.createElement('script');
      s.src = src + '?v=' + versao;
      s.async = false; // executam na ordem
      document.body.appendChild(s);
    }
  });
})();
