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

  async function configDoPainel() {
    if (!chaveTotem) return null;
    try {
      const r = await fetch(`${API}/live/config?loja=${encodeURIComponent(codigo)}&k=${chaveTotem}`);
      const d = await r.json();
      if (!d.ok) return { erro: d.mensagem || 'Link do totem inválido.' };
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
  async function tokenTotem(renovar) {
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
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(API + '/food/cardapio/' + encodeURIComponent(codigo), { signal: ctrl.signal });
      clearTimeout(t);
      const d = await r.json();
      if (!d.ok) throw new Error(d.mensagem || d.erro || 'HTTP ' + r.status);
      gravar(kc, d); // cópia para continuar funcionando se a internet cair
      M = converter(d); M.origem = 'livefood';
    } catch (e) {
      console.warn('Cardápio do LiveFood não carregou:', e);
      const copia = ler(kc);
      if (copia) { M = converter(copia); M.origem = 'copia'; } else { M = exemplo(); M.origem = 'exemplo'; M.erro = String(e.message || e); }
    }
    if (!M.itens.length) { M = exemplo(); M.origem = 'exemplo'; M.erro = 'A loja não tem itens ativos no cardápio.'; }
  }

  // topo: logo do restaurante (e o LiveFood assina no rodapé); sem loja ou sem logo, o topo fica com a do LiveFood
  function mostrarLogo() {
    const img = document.getElementById('logo-loja');
    const doLiveFood = () => { img.classList.remove('da-loja'); img.alt = 'livefood'; img.src = 'img/logo-livefood.png'; img.classList.add('pronta'); };
    if (!M.logo) { doLiveFood(); return; }
    img.onload = () => {
      if (logoClara(img)) img.classList.add('clara'); // logo branca (feita pra fundo escuro): no totem branco ela aparece escura
      img.classList.add('da-loja', 'pronta');
      document.getElementById('rodape').classList.add('visivel');
    };
    img.onerror = () => { img.onerror = null; doLiveFood(); };
    img.alt = M.loja;
    img.crossOrigin = 'anonymous'; // permite medir as cores da logo
    img.src = M.logo;
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

  Promise.all([carregar(), configDoPainel()]).then(([, painel]) => {
    mostrarLogo();
    M.codigo = codigo;
    M.api = API;
    M.servidor = painel && !painel.erro ? painel : null; // { k, ativo, modelo, esforco, enviar, treino, ia, voz }
    M.servidorErro = painel && painel.erro ? painel.erro : '';
    M.precoUnit = precoUnit;
    M.precoLinha = (l) => precoUnit(M.itens.find((i) => i.id === l.id), l.sab || [], l.adds || []) * l.qtd;
    M.enviarPedido = enviarPedido;
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
