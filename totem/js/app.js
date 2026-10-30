/* Fluxo do totem (tudo por voz): standby → boas-vindas → conversa → pedido confirmado → standby. */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const M = window.LIVEFOOD;
  const BRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const itemPorId = (id) => M.itens.find((i) => i.id === id);
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const sorteia = (lista) => lista[Math.floor(Math.random() * lista.length)];
  const totem = $('#totem');

  // ---------------------------------------------------------------------------
  // Configuração (operador)
  // ---------------------------------------------------------------------------
  const PADRAO = {
    chave: '', modelo: 'claude-opus-5-5', esforco: 'low', modo: 'auto',
    elevenChave: '', elevenVoz: '', elevenModelo: 'eleven_multilingual_v2',
    voz: '', tom: 1.6, velocidade: 1.1, treino: '', guardar: false,
    loja: '', enviarPedidos: false,
    filtroRuido: 'desligado', escuta: 'auto', // microfone deste totem (cada aparelho fica num ambiente)
  };
  const VERSAO_VOZ = 3; // muda quando o padrão da voz muda; aí a voz salva antes volta ao novo padrão
  const cfg = (() => {
    let salvo = {};
    try { salvo = JSON.parse(localStorage.getItem('live-config') || '{}'); } catch (e) { /* sem armazenamento */ }
    if (salvo.versaoVoz !== VERSAO_VOZ) { delete salvo.voz; delete salvo.tom; delete salvo.velocidade; }
    return { ...PADRAO, ...salvo, versaoVoz: VERSAO_VOZ };
  })();
  // cada loja tem o seu treinamento (o mesmo totem pode ser trocado de loja)
  const chaveTreino = 'live-treino-' + (M.codigo || 'exemplo');
  const treinoDaLoja = () => { try { const t = localStorage.getItem(chaveTreino); return t != null ? t : cfg.treino; } catch (e) { return cfg.treino; } };
  // aberto pelo link do painel: modelo, treinamento e envio de pedidos vêm do painel da loja
  const P = M.servidor;
  const configCerebro = () => (P ? { ...cfg, modelo: P.modelo, esforco: P.esforco, treino: P.treino, modo: 'auto' } : { ...cfg, treino: treinoDaLoja() });
  const enviaPedidos = () => (P ? !!P.enviar : !!cfg.enviarPedidos);
  // voz de personagem pelo servidor (a chave da ElevenLabs fica no Worker)
  const vozServidor = P && P.voz
    ? (texto, velocidade, signal) => fetch(M.api + '/live/voz', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
      body: JSON.stringify({ loja: M.codigo, k: P.k, texto, velocidade }),
    })
    : null;
  function salvarConfig() {
    try { localStorage.setItem('live-config', JSON.stringify(cfg)); } catch (e) { /* navegador sem armazenamento */ }
    Cerebro.configurar(configCerebro());
    atualizarStatus();
  }

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  const S = {
    modo: 'standby',          // standby | entrando | conversa | final
    carrinho: [],             // { id, qtd, obs }
    etapa: 'conversando',
    sessao: 0,                // muda a cada atendimento; descarta respostas atrasadas
    ocupado: false, falando: false, ouvindo: false,
    timerInativo: null, avisouInativo: false, ultimaAtividade: 0, fezTravessura: false,
    numeroPedido: 40 + Math.floor(Math.random() * 20),
  };

  function setModo(m) {
    totem.classList.remove('modo-standby', 'modo-conversa', 'modo-final');
    totem.classList.add('modo-' + m);
  }

  // ---------------------------------------------------------------------------
  // Carrinho
  // ---------------------------------------------------------------------------
  const total = () => S.carrinho.reduce((s, l) => s + M.precoLinha(l), 0);
  let ultimosNovos = new Set();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // só aceita sabores e adicionais que existem naquele item (com o nome exato), como o servidor da loja exige
  function opcoesValidas(i, a) {
    const sab = [...new Set((a.sabores || []).filter((n) => i.sabores.some((s) => s.nome === n)))].slice(0, i.maxSabores || 0);
    const adds = [...new Set((a.adicionais || []).filter((n) => i.bordas.concat(i.adicionais).some((x) => x.nome === n)))];
    const bordas = adds.filter((n) => i.bordas.some((b) => b.nome === n));
    return { sab, adds: adds.filter((n) => !bordas.includes(n) || n === bordas[0]) }; // no máximo uma borda
  }
  const mesmaLinha = (l, id, obs, o) => l.id === id && (l.obs || '') === obs && (l.sab || []).join('|') === o.sab.join('|') && (l.adds || []).join('|') === o.adds.join('|');

  function aplicarAcoes(acoes) {
    ultimosNovos = new Set();
    for (const a of acoes || []) {
      const qtd = Math.max(0, Math.min(20, parseInt(a.quantidade, 10) || 0));
      if (a.tipo === 'limpar_carrinho') { S.carrinho = []; continue; }
      const i = itemPorId(a.item_id);
      if (!i) continue;
      const obs = (a.observacao || '').trim();
      const o = opcoesValidas(i, a);
      const linha = S.carrinho.find((l) => mesmaLinha(l, a.item_id, obs, o)) || S.carrinho.find((l) => l.id === a.item_id);
      if (a.tipo === 'adicionar' || (a.tipo === 'definir_quantidade' && !linha && qtd)) {
        if (i.maxSabores && !o.sab.length) { console.warn('Item sem sabor ignorado:', a); continue; } // a loja exige o sabor
        const igual = S.carrinho.find((l) => mesmaLinha(l, a.item_id, obs, o));
        // o que acabou de entrar (ou mudou) vai pro topo da lista
        if (igual) { igual.qtd += qtd || 1; S.carrinho.splice(S.carrinho.indexOf(igual), 1); S.carrinho.unshift(igual); }
        else S.carrinho.unshift({ id: a.item_id, qtd: qtd || 1, obs, sab: o.sab, adds: o.adds });
        ultimosNovos.add(a.item_id);
      } else if (a.tipo === 'remover' && linha) {
        if (!qtd || qtd >= linha.qtd) S.carrinho.splice(S.carrinho.indexOf(linha), 1);
        else linha.qtd -= qtd;
      } else if (a.tipo === 'definir_quantidade' && linha) {
        if (!qtd) S.carrinho.splice(S.carrinho.indexOf(linha), 1);
        else linha.qtd = qtd;
      }
    }
    renderResumo();
  }

  // Recolhida, a lista mostra os últimos itens (o mais novo em cima) e um botão "ver todos".
  // Aberta, cresce pra cima e o atendimento continua normalmente.
  const VISIVEIS = 2; // cabem 2 linhas inteiras no quadro; a partir de 3 itens aparece o "+ ver todos"
  let listaAberta = false;
  function renderResumo() {
    const linha = (l) => {
      const i = itemPorId(l.id);
      const det = [l.sab && l.sab.length ? l.sab.join(' / ') : '', ...(l.adds || []).map((x) => '+ ' + x), l.obs || ''].filter(Boolean).join(' · ');
      return `<li class="${ultimosNovos.has(l.id) ? 'novo' : ''}"><b>${l.qtd}×</b><span>${i.emoji} ${esc(i.nome)}</span><span>${BRL(M.precoLinha(l))}</span>${det ? `<small>${esc(det)}</small>` : ''}</li>`;
    };
    const n = S.carrinho.length;
    if (n <= VISIVEIS) listaAberta = false;
    const mostrar = listaAberta ? S.carrinho : S.carrinho.slice(0, VISIVEIS);
    $('#resumo-lista').innerHTML = n
      ? mostrar.map(linha).join('')
      : `<li class="vazio">${tx('vazio')}</li>`;
    const btn = $('#resumo-mais');
    btn.hidden = n <= VISIVEIS;
    btn.textContent = listaAberta ? tx('recolher') : `${tx('verTodos')} (${n})`;
    $('#resumo').classList.toggle('aberto', listaAberta);
    $('#resumo-total').textContent = BRL(total());
    $('#resumo-lista').scrollTop = 0; // o mais novo está sempre em cima
  }
  $('#resumo-mais').addEventListener('click', (e) => {
    e.stopPropagation();
    listaAberta = !listaAberta;
    S.ultimaAtividade = Date.now();
    renderResumo();
  });

  const contexto = () => ({ carrinho: S.carrinho.map((l) => ({ ...l })), total: total(), etapa: S.etapa, nome: S.nome || '', ultimaFala: S.ultimaFala || '', idioma: S.idioma });

  // ---------------------------------------------------------------------------
  // Idiomas do atendimento (português, inglês, espanhol): reconhecimento de voz, voz do Live, falas fixas e textos da tela.
  // A IA responde no idioma do cliente; o pedido vai pra cozinha em português.
  // ---------------------------------------------------------------------------
  const BANDEIRAS = {
    pt: '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#009c3b"/><path d="M15 2.2 27.6 10 15 17.8 2.4 10z" fill="#ffdf00"/><circle cx="15" cy="10" r="4.4" fill="#002776"/></svg>',
    en: '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><g fill="#b22234">' +
      [0, 3.08, 6.15, 9.23, 12.31, 15.38, 18.46].map((y) => `<rect y="${y}" width="30" height="1.54"/>`).join('') +
      '</g><rect width="13" height="10.77" fill="#3c3b6e"/></svg>',
    es: '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#c60b1e"/><rect y="5" width="30" height="10" fill="#ffc400"/></svg>',
  };
  const NOMES_IDIOMA = { pt: 'Português', en: 'English', es: 'Español' };
  const TEXTOS = {
    pt: { ligando: 'Só um segundinho…', ouvindo: 'Pode falar!', pensando: 'Deixa eu ver…', falando: 'Toque pra interromper', parado: 'Toque pra falar',
      seuPedido: 'Seu pedido', vazio: 'É só falar o que você quer que eu anoto aqui 😉', verTodos: '+ ver todos', recolher: '− recolher',
      pedido: 'Pedido', instrucao: 'Pague no caixa e retire no balcão quando chamarem seu número.', recomecar: 'Recomeçar' },
    en: { ligando: 'One second…', ouvindo: 'Go ahead!', pensando: 'Let me see…', falando: 'Tap to interrupt', parado: 'Tap to talk',
      seuPedido: 'Your order', vazio: 'Just tell me what you\'d like and I\'ll write it down 😉', verTodos: '+ see all', recolher: '− show less',
      pedido: 'Order', instrucao: 'Pay at the cashier and pick up at the counter when your number is called.', recomecar: 'Start over' },
    es: { ligando: 'Un segundito…', ouvindo: '¡Habla ahora!', pensando: 'Déjame ver…', falando: 'Toca para interrumpir', parado: 'Toca para hablar',
      seuPedido: 'Tu pedido', vazio: 'Dime lo que quieres y lo anoto aquí 😉', verTodos: '+ ver todo', recolher: '− ver menos',
      pedido: 'Pedido', instrucao: 'Paga en la caja y retira en el mostrador cuando llamen tu número.', recomecar: 'Empezar de nuevo' },
  };
  S.idioma = 'pt';
  const tx = (k) => (TEXTOS[S.idioma] || TEXTOS.pt)[k];

  function montarBandeiras() {
    const html = Object.keys(BANDEIRAS).map((cod) =>
      `<button type="button" class="idioma" data-idioma="${cod}" title="${NOMES_IDIOMA[cod]}">${BANDEIRAS[cod]}<span>${NOMES_IDIOMA[cod]}</span></button>`).join('');
    $('#idiomas-topo').innerHTML = html;
    for (const b of document.querySelectorAll('.idioma')) {
      // pointerdown pra não deixar o toque na tela de espera acordar o Live em português antes
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const cod = b.dataset.idioma;
        if (S.modo === 'standby') { aplicarIdioma(cod); acordar(); return; }
        if (cod !== S.idioma) trocarIdiomaNaConversa(cod);
      });
    }
  }

  // idioma da voz, da escuta, das falas fixas e dos textos da tela
  function aplicarIdioma(cod) {
    S.idioma = TEXTOS[cod] ? cod : 'pt';
    Voz.idioma = S.idioma;
    window.IDIOMA_ATUAL = S.idioma;
    document.documentElement.lang = { pt: 'pt-BR', en: 'en', es: 'es' }[S.idioma];
    for (const b of document.querySelectorAll('.idioma')) b.classList.toggle('ativo', b.dataset.idioma === S.idioma);
    $('#resumo-titulo').textContent = tx('seuPedido');
    $('#final-rotulo').textContent = tx('pedido');
    $('#final-instrucao').textContent = tx('instrucao');
    $('#btn-novo').textContent = tx('recomecar');
    renderResumo();
    if (S.idioma !== 'pt' && !Voz.temVozDoIdioma(S.idioma)) aviso(`Este navegador não tem voz em ${NOMES_IDIOMA[S.idioma]}. Use o Microsoft Edge.`);
  }

  // trocou a bandeira no meio do atendimento: o reconhecimento passa a ouvir o outro idioma e o Live confirma
  async function trocarIdiomaNaConversa(cod) {
    if (S.modo !== 'conversa') return;
    aplicarIdioma(cod);
    S.pedeNome = false;
    S.ultimaAtividade = Date.now();
    fecharEscuta(); // religa ouvindo o idioma novo
    Voz.parar();
    if (S.ocupado) return; // está pensando: a resposta já vem no idioma novo
    if (await dizer(Frase('trocouIdioma'), { expressao: 'animado', gesto: 'acenar' })) depoisDeFalar();
  }
  // trava final: o Live nunca fala de eco, microfone ou "própria voz" (se a IA tentar, ele fica quieto e volta a ouvir)
  const FALA_PROIBIDA = /(pr[oó]pria voz|minha voz|minha pr[oó]pria|\beco\b|microfone (pegou|captou|ouviu|pegando|captando)|me ouvi|ouvindo a mim|outra pessoa falando)/i;
  const falaProibida = (fala) => FALA_PROIBIDA.test(String(fala || ''));
  // Só aceita "ignorar" quando parece eco de verdade: frase de 4+ palavras, quase toda igual (em sequência) à última fala
  // do Live — e o cliente não acabou de ser ignorado (se ele repetiu, é ele falando).
  let ignorouEm = 0;
  function pareceEco(texto) {
    if (ignorouEm && Date.now() - ignorouEm < 12000) return false;
    const ouvido = normalizar(Voz.paraFala(texto)), falado = normalizar(Voz.paraFala(S.ultimaFala || ''));
    if (ouvido.length < 4 || !falado.length) return false;
    return trechoDaFala(ouvido, falado) >= Math.ceil(ouvido.length * 0.6);
  }

  // "Meu nome é João" → "João". Se parecer pedido (item do cardápio, "quero"...), não é nome.
  const PALAVRAS_CARDAPIO = new Set(M.itens.flatMap((i) => (i.nome + ' ' + i.produto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z]+/)).filter((w) => w.length >= 4));
  function extrairNome(texto) {
    let s = String(texto).replace(/[.!?,;:]/g, ' ').replace(/\s+/g, ' ').trim();
    // cumprimentos e "meu nome é…" em português, inglês e espanhol
    s = s.replace(/^(oi|ola|olá|e aí|eai|bom dia|boa tarde|boa noite|tudo bem|beleza|hi|hello|hey|hola|buenas|buenos días|buenas tardes|buenas noches)\s+/i, '');
    s = s.replace(/^(meu nome é|meu nome e|meu nome|me chamo|eu me chamo|pode me chamar de|eu sou o|eu sou a|eu sou|sou o|sou a|sou|aqui é o|aqui é a|aqui é|é o|é a|é|my name is|my name's|i am|i'm|im|it's|its|call me|this is|me llamo|mi nombre es|soy|yo soy)\s+/i, '');
    const palavras = s.split(' ').filter(Boolean);
    if (!palavras.length || palavras.length > 3 || palavras.some((p) => /\d/.test(p))) return '';
    const simples = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    // nunca tira o nome da fala do próprio Live ("…como você se chama?" voltando como "cê se chama")
    if (/\b(chama|chamo|nome|se|voce|ce|name|llamas|llamo|nombre)\b/.test(simples)) return '';
    if (ecoNoComeco(normalizar(simples), normalizar(Voz.paraFala(S.ultimaFala || '')))) return '';
    if (/\b(quero|queria|vou|me ve|me da|tem|quanto|cardapio|menu|nao|sim|pode|obrigad|qual|como|onde|want|would|like|have|get|give|menu|how|what|where|yes|no|please|quiero|quisiera|dame|tienes|cuanto|que|si|por favor|gracias)\b/.test(simples)) return '';
    if (simples.split(' ').some((w) => PALAVRAS_CARDAPIO.has(w))) return '';
    return palavras.slice(0, 2).map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  }

  // ---------------------------------------------------------------------------
  // Conversas guardadas para revisão (só se o operador ligar)
  // ---------------------------------------------------------------------------
  function conversasGuardadas() {
    try { return JSON.parse(localStorage.getItem('live-conversas') || '[]'); } catch (e) { return []; }
  }
  function salvarConversa() {
    if (!cfg.guardar || !S.conversa || !S.conversa.length) { S.conversa = []; return; }
    const lista = conversasGuardadas();
    lista.push({
      inicio: S.conversaInicio, fim: new Date().toISOString(), resultado: S.resultado || 'sem pedido',
      cerebro: Cerebro.usandoClaude() ? 'claude' : 'offline', turnos: S.conversa,
      loja: M.codigo || 'exemplo',
      pedido: S.carrinho.map((l) => ({ item: itemPorId(l.id).nome, qtd: l.qtd, sabores: l.sab, adicionais: l.adds, obs: l.obs })), total: total(),
    });
    try { localStorage.setItem('live-conversas', JSON.stringify(lista.slice(-100))); } catch (e) { /* sem espaço */ }
    S.conversa = [];
  }

  // ---------------------------------------------------------------------------
  // Tela: legendas, sugestão, balão, estado da voz, avisos
  // ---------------------------------------------------------------------------
  let digitando = null;
  // a legenda aparece mais ou menos no ritmo da fala
  function legendaLive(texto, velocidade = 1) {
    clearInterval(digitando);
    const alvo = $('#fala-live');
    alvo.textContent = '';
    if (!texto) return;
    let i = 0;
    digitando = setInterval(() => {
      i += 1;
      alvo.textContent = texto.slice(0, i);
      if (i >= texto.length) clearInterval(digitando);
    }, 52 / velocidade);
  }
  function legendaCliente(texto) { $('#fala-cliente').textContent = texto ? `“${texto}”` : ''; }

  let sugestaoTimer = null;
  function mostrarSugestao(id) {
    const i = itemPorId(id);
    if (!i) return;
    const s = $('#sugestao');
    const fig = s.querySelector('.emoji');
    fig.textContent = i.emoji;
    fig.dataset.id = i.id;
    if (i.foto) { // foto do cardápio da loja; se não carregar, fica o emoji
      const img = new Image();
      img.alt = '';
      img.onload = () => { if (fig.dataset.id === i.id) { fig.textContent = ''; fig.appendChild(img); } };
      img.src = i.foto;
    }
    s.querySelector('.nome').textContent = i.nome;
    s.querySelector('.preco').textContent = BRL(i.preco);
    s.classList.add('visivel');
    clearTimeout(sugestaoTimer);
    sugestaoTimer = setTimeout(() => s.classList.remove('visivel'), 4500);
  }
  const esconderSugestao = () => $('#sugestao').classList.remove('visivel');

  let balaoTimer = null;
  Live.aoBalao = (texto, pos, ms) => {
    const b = $('#balao');
    b.textContent = texto;
    b.style.left = Math.max(240, Math.min(840, pos.x)) + 'px';
    b.style.top = Math.max(200, Math.min(1700, pos.topo)) + 'px';
    b.classList.add('visivel');
    clearTimeout(balaoTimer);
    balaoTimer = setTimeout(() => b.classList.remove('visivel'), ms || 1800);
  };
  const esconderBalao = () => $('#balao').classList.remove('visivel');

  const BARRAS = '<span class="barras"><i></i><i></i><i></i><i></i></span>';
  function estadoVoz(tipo) {
    const el = $('#estado-voz');
    el.innerHTML = (tx(tipo) || tx('parado')) + (tipo === 'ouvindo' ? BARRAS : '');
    el.classList.toggle('ativo', tipo === 'ouvindo');
    $('#btn-mic').classList.toggle('ouvindo', tipo === 'ouvindo');
  }

  let avisoTimer = null;
  function aviso(texto) {
    const a = $('#aviso');
    a.textContent = texto;
    a.classList.add('visivel');
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(() => a.classList.remove('visivel'), 4500);
  }
  Voz.aoErroVoz = (e) => aviso(e && e.status === 401 ? 'Chave da ElevenLabs inválida. Usando a voz do navegador.' : 'A voz da ElevenLabs falhou. Usando a voz do navegador.');

  function atualizarStatus() {
    const claude = Cerebro.usandoClaude();
    $('#status').classList.toggle('offline', !claude);
    $('#status').title = claude ? 'Live online · IA' : 'Live · modo offline';
  }

  // ---------------------------------------------------------------------------
  // Fala do Live
  // ---------------------------------------------------------------------------
  async function dizer(texto, { expressao = 'feliz', gesto = 'nenhum', tela = 'rosto', icone = null } = {}) {
    const minha = S.sessao;
    S.falando = true;
    estadoVoz('falando');
    Live.expressao(expressao);
    if (tela === 'interrogacao') Live.icone('interrogacao', 1400);
    else if (tela === 'coracao') Live.icone('coracao', 1400);
    else if (icone) Live.icone(icone, 1500);
    const g = Live.gesto(gesto);
    legendaLive('');
    S.ultimaFala = texto;
    tamparOuvidos(); // enquanto ele fala, o que o microfone pega é descartado (seria a voz dele)
    await Voz.falar(texto, {
      voz: cfg.voz, tom: cfg.tom, velocidade: cfg.velocidade,
      elevenChave: cfg.elevenChave, elevenVoz: cfg.elevenVoz, elevenModelo: cfg.elevenModelo, elevenProxy: vozServidor,
      aoViseme: (v) => Live.viseme(v),
      // legenda e corpo só começam junto com o som
      aoComecar: () => { if (minha === S.sessao) { legendaLive(texto, cfg.velocidade); Live.falando(true); registrarTempo(); } },
    });
    Live.falando(false);
    Live.viseme(null);
    void g; // o gesto termina sozinho; não segura o microfone esperando a animação
    if (minha !== S.sessao) return false;
    S.falando = false;
    S.ultimaAtividade = Date.now();
    estadoVoz('parado');
    return true;
  }

  // Cronômetro no console (F12): quanto cada etapa levou, do fim da fala do cliente até a voz do Live sair
  function registrarTempo() {
    const c = S.cron;
    if (!c || c.logado) return;
    c.logado = true;
    const agora = Date.now(), ms = (a, b) => Math.max(0, Math.round((b || agora) - (a || agora)));
    const ia = c.ia ? ms(c.ia, c.resposta) : 0;
    console.info(`Live · tempo até responder: ${ms(c.fimFala, agora)} ms = esperar o fim da fala ${ms(c.fimFala, c.entregue)} ms` +
      ` + ${c.ia ? `IA ${ia} ms` : 'sem IA'}` + (c.juntou ? ` (frase completada ${c.juntou}x, pergunta refeita)` : '') +
      ` + voz começar ${ms(c.resposta || c.entregue, agora)} ms`);
  }

  function depoisDeFalar() {
    if (S.modo !== 'conversa') return;
    iniciarInatividade();
    if (cfg.escuta === 'tocar') { tamparOuvidos(); estadoVoz('parado'); return; } // espera o cliente tocar no microfone
    S.bipPendente = true;
    // abre 0,3 s depois: o fim da voz dele ainda está saindo do alto-falante (e voltaria como eco)
    const minha = S.sessao;
    setTimeout(() => { if (minha === S.sessao && S.modo === 'conversa' && !S.falando && !S.ocupado) abrirOuvidos(); }, 300);
  }

  // ---------------------------------------------------------------------------
  // Escuta (o atendimento é todo por voz)
  // O reconhecimento de voz fica SEMPRE ligado durante o atendimento (ligar leva ~1 s no Edge).
  // Enquanto o Live fala ou pensa, os "ouvidos ficam tampados": tudo é descartado.
  // Quando ele termina de falar, os ouvidos abrem na hora.
  // ---------------------------------------------------------------------------
  // Medidor de volume do microfone (para o filtro de ruído): acompanha o barulho de fundo do ambiente
  // (enquanto o Live não fala) e o pico de volume dos últimos segundos.
  const Medidor = (() => {
    let an = null, buf = null, amostras = [], pedido = false;
    async function iniciar() {
      if (pedido) return;
      pedido = true;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') await ctx.resume();
        an = ctx.createAnalyser();
        an.fftSize = 1024;
        ctx.createMediaStreamSource(stream).connect(an);
        buf = new Float32Array(an.fftSize);
        setInterval(medir, 60);
      } catch (e) { console.warn('Medidor de ruído indisponível:', e); }
    }
    function medir() {
      an.getFloatTimeDomainData(buf);
      let s = 0;
      for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      const agora = Date.now();
      amostras.push({ t: agora, v: Math.sqrt(s / buf.length), live: S.falando });
      while (amostras.length && agora - amostras[0].t > 10000) amostras.shift();
    }
    // barulho de fundo: o volume "baixo típico" dos últimos 10 s (fora das falas do Live)
    function piso() {
      const vs = amostras.filter((a) => !a.live).map((a) => a.v).sort((a, b) => a - b);
      return vs.length >= 8 ? vs[Math.floor(vs.length * 0.2)] : 0;
    }
    function pico(ms) {
      const lim = Date.now() - ms;
      return amostras.reduce((m, a) => (a.t >= lim && !a.live && a.v > m ? a.v : m), 0);
    }
    return { iniciar, piso, pico, ativo: () => !!an };
  })();
  // a fala veio de quem está na frente do totem? (bem mais alta que o barulho de fundo)
  let rejeitouRuidoEm = 0;
  function vozDePerto() {
    if (cfg.filtroRuido === 'desligado' || !Medidor.ativo()) return true;
    const fundo = Medidor.piso(), voz = Medidor.pico(8000); // janela larga: a frase chega até ~3 s depois da última palavra
    if (!fundo) return true;
    const fator = cfg.filtroRuido === 'forte' ? 3.5 : 2.2; // ≈ +11 dB / +7 dB acima do fundo
    const ok = voz >= Math.max(fundo * fator, 0.006);
    console.info(`Live · filtro de ruído: fundo ${Math.round(fundo * 1000)}, voz ${Math.round(voz * 1000)} (${voz > 0 ? Math.round(20 * Math.log10(voz / fundo)) : 0} dB) → ${ok ? 'aceita' : 'ignorada'}`);
    return ok;
  }
  // Segurança: se o filtro ignorou uma fala e o cliente falou de novo logo em seguida, aceita (ele está insistindo com o totem)
  function passaNoFiltro() {
    if (vozDePerto()) { rejeitouRuidoEm = 0; return true; }
    if (rejeitouRuidoEm && Date.now() - rejeitouRuidoEm < 10000) { rejeitouRuidoEm = 0; console.info('Live · filtro de ruído: segunda tentativa seguida, aceita'); return true; }
    rejeitouRuidoEm = Date.now();
    return false;
  }

  let micBloqueado = false, avisouMicEm = 0, escuta = null, semCaptarDesde = 0, ouvidosAbertosEm = 0, primeiraFala = 0, quedasVoz = [];

  function garantirEscuta() {
    if ((escuta && escuta.ativo) || !Voz.podeOuvir || micBloqueado || S.modo !== 'conversa') return;
    escuta = Voz.iniciarEscuta({
      aoInicio: () => {
        estadoVoz('ouvindo');
        if (S.bipPendente) { S.bipPendente = false; Voz.bip(); } // só bipa quando é a vez do cliente
      },
      aoParcial: (t) => {
        const limpo = semEco(t);
        if (!limpo) return;
        S.ultimaAtividade = Date.now();
        // o cliente (não o ambiente) continua falando enquanto o Live pensa: só conta palavra NOVA (o chiado não estende nada)
        if (pensandoEm()) {
          const n = limpo.split(/\s+/).length;
          if (n > palavrasEnquantoPensa && (cfg.filtroRuido === 'desligado' || !Medidor.ativo() || Medidor.pico(1500) >= Medidor.piso() * 2.2)) ultimoParcialEm = Date.now();
          palavrasEnquantoPensa = Math.max(palavrasEnquantoPensa, n);
        }
        legendaCliente((pensandoEm() ? turnoAtual.texto + ' ' : '') + limpo + '…');
      },
      aoFinal: (t, outras, tempo) => {
        if (!passaNoFiltro()) { // conversa do ambiente, longe do totem: ignora e continua ouvindo
          console.info('Live · fala ignorada pelo filtro de ruído:', t);
          legendaCliente('');
          if (pensandoEm()) ouvirEnquantoPensa(); else abrirOuvidos();
          return;
        }
        const limpo = semEco(t);
        if (!limpo) { legendaCliente(''); abrirOuvidos(); return; } // era só eco: continua ouvindo
        clienteFalou(limpo, limpo === t ? outras : [], tempo);
      },
      aoErro: (e) => {
        if (e === 'not-allowed' || e === 'service-not-allowed') {
          // O Edge também dá esse erro quando o serviço de voz recusa uma sessão por um instante.
          // Só considera bloqueado se a permissão do microfone estiver mesmo negada; senão a escuta religa sozinha.
          permissaoNegada().then((negada) => {
            if (!negada) { console.warn('Serviço de voz recusou a sessão (' + e + '); religando.'); return; }
            micBloqueado = true;
            fecharEscuta(); estadoVoz('parado');
            aviso('Microfone bloqueado. Clique no cadeado ao lado do endereço e permita o microfone.');
          });
        } else if (e === 'audio-capture') {
          if (Date.now() - avisouMicEm > 20000) { avisouMicEm = Date.now(); aviso('Não estou conseguindo ouvir o microfone. Confira se ele está conectado e escolhido no Windows.'); }
          console.warn('Microfone sem áudio (audio-capture); tentando de novo.');
        } else if (e === 'network') {
          // o serviço de voz do Edge derruba a conexão de vez em quando e a escuta religa sozinha;
          // só avisa se cair 3 vezes em 30 segundos (aí é problema de internet de verdade)
          const agora = Date.now();
          quedasVoz = quedasVoz.filter((t) => agora - t < 30000).concat(agora);
          if (quedasVoz.length >= 3) { quedasVoz = []; aviso('A conexão com o serviço de voz está instável. Confira a internet do totem.'); }
          console.warn('Serviço de voz caiu (network); religando.');
        }
      },
    });
  }
  async function permissaoNegada() {
    try { return (await navigator.permissions.query({ name: 'microphone' })).state === 'denied'; } catch (e) { return false; }
  }

  // Vigia: se os ouvidos estão abertos mas o reconhecimento parou de captar por um tempo, religa do zero
  setInterval(() => {
    if (S.modo !== 'conversa' || !S.ouvindo || S.falando || micBloqueado || !escuta) return;
    if (escuta.captando) { semCaptarDesde = 0; return; }
    if (!semCaptarDesde) { semCaptarDesde = Date.now(); return; }
    if (Date.now() - semCaptarDesde < 5000) return;
    console.warn('Reconhecimento de voz parado há 5 s com os ouvidos abertos; religando.');
    semCaptarDesde = 0;
    fecharEscuta();
    setTimeout(() => { if (S.modo === 'conversa' && !S.falando) abrirOuvidos(); }, 400); // dá tempo do anterior fechar
  }, 1000);

  function abrirOuvidos() {
    garantirEscuta();
    if (!escuta || !escuta.ativo) return;
    S.ouvindo = true;
    Live.ouvindo(true);
    ouvidosAbertosEm = Date.now();
    primeiraFala = 0;
    estadoVoz(escuta.captando ? 'ouvindo' : 'ligando');
    escuta.liberar();
  }

  function tamparOuvidos() {
    garantirEscuta(); // já deixa o reconhecimento ligado (tampado) para abrir na hora certa
    if (escuta) escuta.ensurdecer();
    if (S.ouvindo) { S.ouvindo = false; Live.ouvindo(false); }
  }

  // Enquanto o Live pensa (antes de começar a falar), os ouvidos continuam abertos para o cliente completar a frase
  let turnoAtual = null, ultimoParcialEm = 0, palavrasEnquantoPensa = 0;
  const pensandoEm = () => !!(turnoAtual && !turnoAtual.cancelado && !turnoAtual.falou && S.ocupado && !S.falando);
  // o cliente terminou uma frase (pelo microfone ou pelo campo de teste)
  function clienteFalou(texto, outras = [], tempo = null) {
    // ele continuou falando enquanto o Live pensava ("…e uma coca, e uma batata"):
    // descarta a resposta em andamento e pergunta de novo com a frase inteira.
    // Só uma vez por pergunta e com pelo menos 2 palavras (um ruído solto não refaz a pergunta à IA).
    if (pensandoEm() && !turnoAtual.juntado && texto.trim().split(/\s+/).length >= 2) {
      const junto = turnoAtual.texto + ' ' + texto.trim();
      const cron = turnoAtual.cron;
      turnoAtual.cancelar();
      S.ocupado = false;
      processar(junto, [], { juntado: true, cron });
      return;
    }
    if (pensandoEm()) return; // ruído enquanto pensa: ignora
    S.ouvindo = false;
    Live.ouvindo(false);
    processar(texto, outras, { tempo });
  }

  function ouvirEnquantoPensa() {
    if (cfg.escuta === 'tocar') return; // no "tocar para falar", o microfone só abre quando o cliente toca
    garantirEscuta();
    if (!escuta || !escuta.ativo) return;
    ouvidosAbertosEm = Date.now();
    primeiraFala = 0;
    palavrasEnquantoPensa = 0;
    ultimoParcialEm = 0;
    escuta.liberar();
  }

  function fecharEscuta() {
    if (escuta) escuta.parar();
    escuta = null;
    S.ouvindo = false;
    Live.ouvindo(false);
  }

  // eco do alto-falante só aparece logo que os ouvidos abrem; depois disso, tudo é o cliente
  function semEco(t) {
    if (!primeiraFala) primeiraFala = Date.now();
    const desde = primeiraFala - ouvidosAbertosEm;
    if (desde < 1300) return tirarEco(t, desde);
    // O Edge às vezes entrega o eco atrasado: depois da janela, só tira o que for claramente a fala dele inteira
    // (o resto, como o cliente repetir uma opção que o Live ofereceu, fica com a IA, que pode "ignorar")
    return tirarEco(t, desde, true);
  }

  // Eco = o FINAL da fala do Live voltando pelo microfone ("…ou um suco?" → "ou um suco").
  // Compara a SEQUÊNCIA de palavras com o fim da fala dele (e não palavras soltas): assim, se o Live perguntou
  // "Quer uma coca ou um suco?" e o cliente respondeu "uma coca", a resposta não é confundida com eco.
  const normalizar = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  // palavras "iguais" mesmo com o erro típico do reconhecimento num lugar barulhento ("suco" × "sucos", "bebida" × "bebidas")
  const parecida = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a) || a.slice(0, 4) === b.slice(0, 4)));
  // quantas palavras do começo do que foi ouvido repetem um trecho que vai até o fim da fala do Live
  function trechoFinalDaFala(ouvido, falado) {
    let maior = 0;
    for (let j = 0; j < falado.length; j++) {
      let k = 0;
      while (k < ouvido.length && j + k < falado.length && parecida(ouvido[k], falado[j + k])) k++;
      if (k > maior && j + k >= falado.length - 1) maior = k;
    }
    return maior;
  }
  // tardio: o texto chegou depois da janela de eco (aí só a fala dele quase inteira conta como eco)
  function tirarEco(texto, desdeMs = 0, tardio = false) {
    // compara tudo "por extenso" (22 → vinte e dois) e sem acentos
    const ouvido = normalizar(Voz.paraFala(texto));
    const falado = normalizar(Voz.paraFala(S.ultimaFala || ''));
    if (!ouvido.length || !falado.length) return texto;
    const descartar = () => { console.info('Live · eco descartado:', texto); return ''; };
    const cortar = (k) => { console.info('Live · eco cortado do começo:', ouvido.slice(0, k).join(' ')); return ouvido.slice(k).join(' '); };
    if (!tardio) {
      const k = trechoFinalDaFala(ouvido, falado);
      // tudo o que ouviu é o finalzinho da fala dele: é eco (uma palavra só, só se chegou colada no fim da fala)
      if (k === ouvido.length && (k >= 2 || desdeMs < 500)) return descartar();
      // começa com o final da fala dele e depois vem o cliente: corta o começo
      if (k >= 2) return cortar(k);
    }
    // eco grande (a qualquer momento): começa com um pedaço que cobre quase toda a fala dele
    const g = trechoDaFala(ouvido, falado);
    if (g >= Math.max(4, Math.ceil(falado.length * 0.75))) return g === ouvido.length ? descartar() : cortar(g);
    // eco com os erros do reconhecedor ("você se chama" → "cê se chama", "Cê Se" → "cessi", "tá" → "está")
    const n = ecoNoComeco(ouvido, falado);
    if (n && n === ouvido.length) return (desdeMs < 1500 || n >= 5) ? descartar() : texto;
    if (n) return cortar(n);
    return texto;
  }

  // igualdade tolerante aos erros do reconhecimento: "ce" = "voce", "ta" = "esta", uma letra trocada
  const distancia = (a, b) => {
    if (Math.abs(a.length - b.length) > 1) return 2;
    let i = 0, j = 0, d = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++d > 1) return d;
      if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
    }
    return d + (a.length - i) + (b.length - j);
  };
  const parecidaSolta = (a, b) => parecida(a, b) || (Math.min(a.length, b.length) >= 2 && (a.endsWith(b) || b.endsWith(a))) ||
    (a.length >= 3 && b.length >= 3 && distancia(a, b) <= 1);
  // quantas palavras em comum, na mesma ordem (tolerando erros)
  function emComum(x, y) {
    const t = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
    for (let i = 1; i <= x.length; i++) {
      for (let j = 1; j <= y.length; j++) t[i][j] = parecidaSolta(x[i - 1], y[j - 1]) ? t[i - 1][j - 1] + 1 : Math.max(t[i - 1][j], t[i][j - 1]);
    }
    return t[x.length][y.length];
  }
  // Quantas palavras do começo do que foi ouvido são, na verdade, um trecho final da fala do Live (com erros).
  // O pedaço tem que terminar na última palavra da fala dele e bater em ~65%; entre os candidatos, fica o mais justo
  // (assim "…já pode fechar? Pode fechar o pedido" corta só a fala dele e deixa "pode fechar o pedido").
  function ecoNoComeco(ouvido, falado) {
    let melhor = 0, melhorN = 0;
    const fim = falado[falado.length - 1];
    for (let n = 2; n <= Math.min(ouvido.length, falado.length + 2); n++) {
      if (!parecidaSolta(ouvido[n - 1], fim)) continue; // o eco acaba onde a fala dele acaba
      const pref = ouvido.slice(0, n);
      for (let j = 0; j < falado.length - 1; j++) {
        const tr = falado.slice(j);
        if (Math.abs(tr.length - n) > Math.max(2, Math.round(n * 0.35))) continue;
        const m = emComum(pref, tr);
        if (m >= Math.max(2, Math.ceil(0.65 * Math.max(n, tr.length))) && m > melhor) { melhor = m; melhorN = n; }
      }
    }
    return melhorN;
  }
  // maior trecho da fala dele (em sequência, de qualquer ponto) que aparece no começo do que foi ouvido
  function trechoDaFala(ouvido, falado) {
    let maior = 0;
    for (let j = 0; j < falado.length; j++) {
      let k = 0;
      while (k < ouvido.length && j + k < falado.length && parecida(ouvido[k], falado[j + k])) k++;
      if (k > maior) maior = k;
    }
    return maior;
  }

  // ---------------------------------------------------------------------------
  // Atendimento
  // ---------------------------------------------------------------------------

  async function acordar(saudar = true) {
    if (S.modo !== 'standby') return;
    S.modo = 'entrando';
    S.sessao++;
    const minha = S.sessao;
    S.carrinho = []; S.etapa = 'conversando'; S.avisouInativo = false; S.fezTravessura = false; ultimosNovos = new Set(); listaAberta = false;
    S.conversa = []; S.conversaInicio = new Date().toISOString(); S.resultado = '';
    S.nome = ''; S.pedeNome = saudar; // as boas-vindas perguntam o nome; a primeira resposta é tratada como nome
    micBloqueado = false; // cada atendimento novo tenta o microfone do zero
    Cerebro.reiniciar();
    Cerebro.aquecer(); // carrega o cardápio no cache da IA enquanto ele dá as boas-vindas
    renderResumo();
    esconderBalao();
    legendaCliente(''); legendaLive('');
    setModo('conversa');
    Voz.destravar();
    if (cfg.filtroRuido !== 'desligado') Medidor.iniciar(); // precisa de um toque na tela pra liberar o áudio
    // ele já começa a falar enquanto entra voando (sem esperar a animação terminar)
    const entrada = Live.entrar();
    await espera(saudar ? 300 : 0);
    if (minha !== S.sessao) return;
    S.modo = 'conversa';
    if (!saudar) { await entrada; return; }
    entrada.then(() => { if (minha === S.sessao) Live.gesto('acenar'); });
    const ok = await dizer(Frase('boasVindas'), { expressao: 'animado' });
    await entrada;
    if (ok) depoisDeFalar();
  }

  // op.tempo: quando o cliente parou de falar (vem da escuta); op.juntado: frase completada enquanto o Live pensava
  async function processar(texto, outrasLeituras = [], op = {}) {
    texto = (texto || '').trim();
    if (!texto) return;
    // cronômetro (console): fim da fala do cliente → entrega → IA → voz do Live
    const agoraMs = Date.now();
    const cron = op.cron || { fimFala: (op.tempo && op.tempo.ultimaPalavraEm) || agoraMs, entregue: (op.tempo && op.tempo.entregueEm) || agoraMs };
    S.cron = cron;
    if (S.modo === 'standby') await acordar(false);
    if (S.modo !== 'conversa' || S.ocupado) return;
    const minha = S.sessao;
    S.ocupado = true;
    S.avisouInativo = false;
    S.fezTravessura = false;
    S.ultimaAtividade = Date.now();
    pararInatividade();
    Voz.parar();
    tamparOuvidos();
    legendaCliente(texto);
    legendaLive('');
    esconderSugestao();

    // resposta à pergunta do nome (sem IA). Se o cliente já foi direto pro pedido, segue o atendimento normal.
    if (S.pedeNome) {
      S.pedeNome = false;
      const nome = extrairNome(texto);
      if (nome) {
        S.nome = nome;
        S.ocupado = false;
        S.conversa.push({ cliente: texto, nome });
        if (await dizer(Frase('prazer', { nome }), { expressao: 'animado', gesto: 'acenar' })) depoisDeFalar();
        return;
      }
    }

    estadoVoz('pensando');
    Live.pensando(true);

    // Este turno pode ser substituído se o cliente continuar falando enquanto o Live pensa
    const turno = { texto, cancelado: false, falou: false, juntado: !!op.juntado, cron, ctrl: new AbortController(),
      cancelar() { this.cancelado = true; try { this.ctrl.abort(); } catch (e) { /* já terminou */ } } };
    turnoAtual = turno;
    if (op.juntado) cron.juntou = (cron.juntou || 0) + 1;
    cron.ia = Date.now();
    ouvirEnquantoPensa();

    // Fala antecipada: assim que a frase do Live chega, ele já começa a falar; carrinho, expressão e gesto
    // entram quando o resto da resposta chegar (alguns décimos depois), com ele já falando.
    // Fechamento, cancelamento e fala com {total} esperam a resposta inteira.
    let falaCedo = null;
    const aoFala = (fala, etapa) => {
      if (turno.cancelado || minha !== S.sessao || etapa === 'finalizado' || etapa === 'cancelado' || etapa === 'ignorar' || fala.includes('{total}') || falaProibida(fala)) return;
      turno.falou = true;
      cron.resposta = Date.now();
      Live.pensando(false);
      falaCedo = dizer(fala, { expressao: 'feliz' });
    };

    let r;
    try {
      r = await Cerebro.responder(texto, contexto(), outrasLeituras, aoFala, turno);
      if (!cron.resposta) cron.resposta = Date.now();
    } catch (e) {
      if (turno.cancelado) return; // o cliente completou a frase: outra resposta já está a caminho
      console.error(e);
      if (falaCedo) {
        r = { fala: '', acoes: [], etapa: S.etapa, expressao: 'feliz', gesto: 'nenhum', tela: 'rosto', item_destaque: '' }; // já está falando
      } else {
        aviso(e && e.status === 401 ? 'Chave da API inválida. Usando o modo offline.' : 'A IA não respondeu. Usando o modo offline.');
        r = Cerebro.offline(texto, contexto());
      }
    }
    if (turno.cancelado) return;
    // A IA quis ignorar (achou que era eco), mas não parece eco de verdade — resposta curta ("inteira", "sim"),
    // frase que não repete a fala dele, ou o cliente insistindo: pede pra ela responder normalmente.
    if (!falaCedo && (r.etapa === 'ignorar' || falaProibida(r.fala)) && !pareceEco(texto)) {
      try {
        const r2 = await Cerebro.corrigir(`O cliente está falando com você e disse: "${texto}". Isso não é eco. Responda normalmente ao que ele disse (não use "ignorar").`, contexto());
        if (r2 && !turno.cancelado) r = r2;
      } catch (e) { console.warn('Nova resposta falhou:', e); }
      if (turno.cancelado || minha !== S.sessao) return;
    }
    // era só eco/ruído (ou a IA tentou comentar o eco): não fala nada, não mexe no pedido e volta a ouvir
    if (!falaCedo && (r.etapa === 'ignorar' || falaProibida(r.fala))) {
      ignorouEm = Date.now();
      console.info('Live · ignorado (eco/ruído):', texto, '→', r.etapa, r.fala);
      turno.falou = true;
      Live.pensando(false);
      S.ocupado = false;
      legendaCliente('');
      S.conversa.push({ cliente: texto, ignorado: true });
      depoisDeFalar();
      return;
    }
    if (r.etapa === 'finalizado' && !falaCedo) {
      // Respiro antes de fechar: os ouvidos continuam abertos. Se o cliente ainda estava falando
      // ("é isso… e uma coca"), a frase nova cancela este turno e o pedido NÃO fecha.
      // 0,5 s; só estende (até 3 s) se o cliente estiver dizendo palavras novas
      const ini = Date.now();
      do { await espera(100); }
      while (!turno.cancelado && Date.now() - ini < 3000 && (Date.now() - ini < 500 || (ultimoParcialEm && Date.now() - ultimoParcialEm < 900)));
      if (turno.cancelado) return;
      // Proteção: a IA fechou sem adicionar nada numa frase que não era só "fecha" ("me vê uma coca e fecha").
      // O totem pede pra ela refazer: adicionar o item primeiro e fechar em seguida.
      const adicionou = (r.acoes || []).some((a) => a.tipo === 'adicionar');
      if (!adicionou && Cerebro.usandoClaude() && !Cerebro.soFechar(texto)) {
        try {
          const r2 = await Cerebro.corrigir(`Você fechou o pedido, mas o cliente disse "${texto}". Se nessa frase ele pediu algum item, ` +
            'refaça a resposta: coloque o item em "acoes" (adicionar) e use "finalizado" (se faltar tamanho ou sabor, pergunte e não feche). ' +
            'Se ele não pediu item nenhum, repita o fechamento.', contexto());
          if (r2) r = r2;
        } catch (e) { console.warn('Conferência do fechamento falhou:', e); }
        if (turno.cancelado || minha !== S.sessao) return;
      }
    }
    turno.falou = true; // daqui em diante a resposta vale; os ouvidos fecham enquanto ele fala
    tamparOuvidos();
    Live.pensando(false);
    if (minha !== S.sessao) return;

    aplicarAcoes(r.acoes);
    if (r.nome_cliente && r.nome_cliente !== S.nome) { console.info('Live · nome do cliente:', S.nome, '→', r.nome_cliente); S.nome = r.nome_cliente; S.pedeNome = false; }
    r.fala = r.fala.replace(/\{total\}/g, BRL(total())); // o total falado é sempre o do carrinho
    S.conversa.push({ cliente: texto, live: r.fala, acoes: r.acoes, etapa: r.etapa });
    S.etapa = r.etapa;
    S.ocupado = false;
    const adicionado = (r.acoes || []).find((a) => a.tipo === 'adicionar' && itemPorId(a.item_id));
    if (r.item_destaque && !adicionado) mostrarSugestao(r.item_destaque);
    const icone = r.tela === 'item' && adicionado ? itemPorId(adicionado.item_id).icone : null;

    if (falaCedo) { // ele já está falando: só ajusta expressão, gesto e ícone
      Live.expressao(r.expressao);
      if (r.gesto && r.gesto !== 'nenhum') Live.gesto(r.gesto);
      if (icone) Live.icone(icone, 1500);
      else if (r.tela === 'interrogacao' || r.tela === 'coracao') Live.icone(r.tela, 1400);
      if (await falaCedo) depoisDeFalar();
      return;
    }

    if (r.etapa === 'finalizado' && S.carrinho.length) {
      // enquanto o pedido vai pro painel, o Live fica "pensando" (microfone fechado); quando entra, vai direto pro número
      S.ocupado = true;
      tamparOuvidos();
      const envio = await enviarPedido();
      S.ocupado = false;
      if (minha !== S.sessao) return;
      if (!envio.ok) {
        S.etapa = 'confirmando';
        S.conversa.push({ erroPedido: envio.erro, mensagem: envio.mensagem });
        const fala = Frase(envio.erro === 'fechado' ? 'lojaFechada' : 'erroEnvio');
        aviso('Pedido não enviado: ' + envio.mensagem);
        if (await dizer(fala, { expressao: 'envergonhado', gesto: 'confuso', tela: 'interrogacao' })) depoisDeFalar();
        return;
      }
      // pedido entrou: vai direto pra tela do número, e o Live fala tudo numa frase só (número, total, onde pagar)
      await concluirPedido(envio.num);
      return;
    }
    if (r.etapa === 'cancelado') {
      if (await dizer(r.fala, { expressao: r.expressao, gesto: r.gesto || 'acenar', tela: r.tela })) voltarStandby();
      return;
    }
    if (await dizer(r.fala, { expressao: r.expressao, gesto: r.gesto, tela: r.tela, icone })) depoisDeFalar();
  }

  // Manda o pedido para o painel da loja. Com o envio desligado (modo teste), só gera um número local.
  async function enviarPedido() {
    if (!enviaPedidos() || !M.cli) { S.numeroPedido++; return { ok: true, num: S.numeroPedido, teste: true }; }
    estadoVoz('pensando');
    Live.pensando(true);
    try {
      return await M.enviarPedido(S.carrinho, { nome: S.nome });
    } catch (e) {
      console.error(e);
      return { ok: false, erro: 'rede', mensagem: String((e && e.message) || e) };
    } finally {
      Live.pensando(false);
    }
  }

  async function concluirPedido(num) {
    const minha = S.sessao;
    S.modo = 'final';
    pararInatividade();
    fecharEscuta();
    estadoVoz('parado');
    const numero = String(num).padStart(3, '0');
    S.resultado = 'pedido #' + numero + (S.nome ? ' · ' + S.nome : '');
    $('#final-numero').textContent = '#' + numero;
    $('#final-nome').textContent = S.nome || '';
    const barra = $('#final-barra');
    barra.style.transition = 'none';
    barra.style.width = '0%';
    setModo('final');
    Live.icone('check', 1800);
    Live.gesto('comemorar');
    void barra.offsetWidth;
    barra.style.transition = 'width 12s linear';
    barra.style.width = '100%';
    let p = 0;
    const prog = setInterval(() => { p = Math.min(1, p + 0.008); Live.barra(p); }, 100);

    // uma fala só: confirmação + número + total + onde pagar (o número fica grande na tela)
    // (137) o nome fica só na comanda (tela do número); na fala ele atrapalhava a frase
    await dizer(Frase('fechamento', { numero: Number(numero), nome: '', total: BRL(total()) }), { expressao: 'animado', gesto: 'acenar', tela: 'coracao' });
    clearInterval(prog);
    Live.barra(null);
    await espera(6000); // número e nome continuam na tela pro cliente conferir
    if (minha === S.sessao) voltarStandby();
  }

  function voltarStandby() {
    salvarConversa();
    S.sessao++;
    pararInatividade();
    Voz.parar();
    fecharEscuta();
    S.modo = 'standby';
    S.ocupado = false; S.falando = false; S.ouvindo = false;
    S.carrinho = []; S.etapa = 'conversando'; S.nome = ''; S.pedeNome = false; listaAberta = false;
    aplicarIdioma('pt'); // o próximo cliente começa em português (ou toca na bandeira dele)
    estadoVoz('parado');
    legendaLive(''); legendaCliente('');
    esconderSugestao();
    setModo('standby');
    Live.ouvindo(false);
    Live.sair();
    setTimeout(renderResumo, 600);
  }

  // ---------------------------------------------------------------------------
  // Inatividade: travessura, "ainda tá aí?" e volta ao standby
  // ---------------------------------------------------------------------------
  function pararInatividade() { clearInterval(S.timerInativo); }
  function iniciarInatividade() {
    pararInatividade();
    S.ultimaAtividade = Date.now();
    S.timerInativo = setInterval(async () => {
      if (S.modo !== 'conversa' || S.ocupado || S.falando) return;
      const parado = Date.now() - S.ultimaAtividade;
      if (parado > 14000 && !S.fezTravessura) {
        S.fezTravessura = true;
        Live.travessura();
        return;
      }
      // ele nunca puxa assunto: se ninguém falar nada por 1 minuto, só acena e volta à tela de espera
      if (parado < 60000) return;
      pararInatividade();
      const minha = S.sessao;
      tamparOuvidos();
      legendaCliente('');
      Live.expressao('feliz');
      await Live.gesto('acenar');
      if (minha === S.sessao) voltarStandby();
    }, 1000);
  }

  // ---------------------------------------------------------------------------
  // Interações
  // ---------------------------------------------------------------------------
  totem.addEventListener('pointerdown', (e) => {
    if (S.modo === 'standby' && !e.target.closest('#topo')) acordar();
  });

  $('#btn-mic').addEventListener('click', () => {
    if (!Voz.podeOuvir) { aviso('Este navegador não tem reconhecimento de voz. Use o Chrome ou o Edge.'); return; }
    S.ultimaAtividade = Date.now();
    if (S.falando) { Voz.parar(); return; } // interrompe; depois da fala ele volta a ouvir
    if (S.ouvindo) return;
    micBloqueado = false;
    S.bipPendente = true;
    abrirOuvidos();
  });

  $('#form-texto').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = $('#entrada').value.trim();
    $('#entrada').value = '';
    if (!t) return;
    if (S.modo === 'conversa') clienteFalou(t); else processar(t); // igual ao microfone (inclusive juntar frases)
  });
  addEventListener('keydown', (e) => {
    if ((e.key === 't' || e.key === 'T') && document.activeElement !== $('#entrada') && !$('#config').open) {
      $('#form-texto').classList.toggle('visivel');
      if ($('#form-texto').classList.contains('visivel')) setTimeout(() => $('#entrada').focus(), 0);
    }
  });

  $('#btn-novo').addEventListener('click', () => voltarStandby());

  $('#live').addEventListener('click', async (e) => {
    e.stopPropagation();
    if (S.modo !== 'conversa' || S.falando || S.ocupado) return;
    tamparOuvidos();
    Live.cocegas();
    if (await dizer(Frase('cocegas'), { expressao: 'animado' })) depoisDeFalar();
  });

  // ---------------------------------------------------------------------------
  // Configurações
  // ---------------------------------------------------------------------------
  const dlg = $('#config');
  function infoLoja() {
    const n = M.itens.length;
    if (P) return `Ligado a ${M.loja} pelo link do painel (${n} itens). Modelo, treinamento e envio de pedidos são definidos no painel da loja; os campos abaixo só valem para teste local.`;
    if (M.origem === 'livefood') return `Ligado a ${M.loja}: ${n} itens carregados do LiveFood agora.`;
    if (M.origem === 'copia') return `Ligado a ${M.loja}: sem conexão, usando a última cópia salva do cardápio (${n} itens).`;
    if (M.codigo) return `Não consegui carregar a loja "${M.codigo}" (${M.erro || 'erro'}). Usando o cardápio de exemplo.`;
    return 'Nenhuma loja ligada: usando o cardápio de exemplo. Também dá pra abrir o totem com ?loja=codigo no endereço.';
  }
  function preencherVozes() {
    const sel = $('#cfg-voz');
    sel.innerHTML = '<option value="">Automática (melhor voz pt-BR)</option>' +
      Voz.vozes.map((v) => `<option value="${v.name}">${v.name}</option>`).join('');
    sel.value = cfg.voz;
  }
  Voz.aoMudarVozes = preencherVozes;

  // Sem voz de personagem (ElevenLabs) e fora do Edge, a voz do navegador fica ruim (o Chrome não tem as vozes "Natural"):
  // avisa o operador. As vozes "Natural" do Edge chegam alguns segundos depois de abrir, por isso a espera.
  const temVozPersonagem = () => !!((P && P.voz) || (cfg.elevenChave && cfg.elevenVoz));
  setTimeout(() => {
    if (temVozPersonagem() || Voz.vozes.some((v) => /Natural/i.test(v.name))) return;
    const edge = /Edg\//.test(navigator.userAgent);
    aviso(edge
      ? 'As vozes "Natural" do Edge não carregaram. Confira a internet e recarregue a página.'
      : 'Para a voz do Live ficar boa, abra este link no Microsoft Edge (este navegador não tem a voz "Natural").');
  }, 6000);

  const CAMPOS = [
    ['#cfg-chave', 'chave'], ['#cfg-modelo', 'modelo'], ['#cfg-esforco', 'esforco'], ['#cfg-modo', 'modo'], ['#cfg-treino', 'treino'],
    ['#cfg-el-chave', 'elevenChave'], ['#cfg-el-voz', 'elevenVoz'], ['#cfg-el-modelo', 'elevenModelo'],
    ['#cfg-ruido', 'filtroRuido'], ['#cfg-escuta', 'escuta'],
  ];
  $('#btn-config').addEventListener('click', (e) => {
    e.stopPropagation();
    const selModelo = $('#cfg-modelo'); // modelo salvo que não está na lista (ex.: um mais novo) continua escolhível
    if (cfg.modelo && ![...selModelo.options].some((o) => o.value === cfg.modelo)) selModelo.add(new Option(cfg.modelo, cfg.modelo));
    for (const [sel, k] of CAMPOS) $(sel).value = cfg[k];
    $('#cfg-treino').value = treinoDaLoja();
    $('#cfg-loja').value = M.codigo || '';
    $('#cfg-enviar').checked = !!cfg.enviarPedidos;
    $('#cfg-loja-info').textContent = infoLoja();
    if (Medidor.ativo()) {
      const f = Medidor.piso(), v = Medidor.pico(10000), dB = (x) => (x > 0 ? Math.round(20 * Math.log10(x / Math.max(f, 1e-4))) : 0);
      $('#cfg-ruido-info').textContent = `Agora: barulho de fundo ${Math.round(f * 1000)} · fala mais alta dos últimos 10 s ${Math.round(v * 1000)} (${dB(v)} dB acima do fundo). ` +
        'O filtro médio aceita fala 10 dB acima do fundo; o forte, 15 dB.';
    }
    const naturais = Voz.vozes.filter((v) => /Natural/i.test(v.name)).length;
    $('#cfg-voz-info').textContent = /Edg\//.test(navigator.userAgent)
      ? (naturais ? `Microsoft Edge: ${naturais} vozes "Natural" disponíveis. A do Live é a "Microsoft Antônio Online (Natural)".` : 'Microsoft Edge, mas as vozes "Natural" ainda não carregaram (precisam de internet). Recarregue a página.')
      : 'Este navegador não é o Microsoft Edge e não tem as vozes "Natural". Abra o link no Edge para a voz do Live.';
    // aberto pelo link do painel: IA, treinamento e envio de pedidos vêm do painel, então os campos locais ficam travados
    for (const s of ['#cfg-enviar', '#cfg-chave', '#cfg-modelo', '#cfg-esforco', '#cfg-modo', '#cfg-treino']) $(s).disabled = !!P;
    $('label[for="cfg-loja"]').textContent = P ? `Loja: ${M.loja} (código no LiveFood)` : 'Código da loja no LiveFood';
    $('#cfg-loja').readOnly = !!P; // com o link do painel, a loja é a do link
    if (P) $('#cfg-enviar').checked = !!P.enviar;
    $('#cfg-guardar').checked = !!cfg.guardar;
    $('#cfg-tom').value = cfg.tom;
    $('#cfg-vel').value = cfg.velocidade;
    $('#cfg-tom-v').textContent = cfg.tom;
    $('#cfg-vel-v').textContent = cfg.velocidade;
    preencherVozes();
    dlg.showModal();
  });
  $('#cfg-tom').addEventListener('input', (e) => { $('#cfg-tom-v').textContent = e.target.value; });
  $('#cfg-vel').addEventListener('input', (e) => { $('#cfg-vel-v').textContent = e.target.value; });
  $('#cfg-testar').addEventListener('click', () => {
    const d = M.itens.find((i) => i.destaque) || M.itens[0];
    Voz.falar(`E aí! Eu sou o Live, seu atendente aqui. O ${d.nome} sai por ${BRL(d.preco)}!`, {
      voz: $('#cfg-voz').value, tom: parseFloat($('#cfg-tom').value), velocidade: parseFloat($('#cfg-vel').value),
      elevenChave: $('#cfg-el-chave').value.trim(), elevenVoz: $('#cfg-el-voz').value.trim(), elevenModelo: $('#cfg-el-modelo').value.trim(),
    });
  });
  $('#cfg-baixar').addEventListener('click', () => {
    const lista = conversasGuardadas();
    if (!lista.length) { alert('Nenhuma conversa guardada ainda.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(lista, null, 2)], { type: 'application/json' }));
    a.download = `conversas-live-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  $('#cfg-apagar').addEventListener('click', () => {
    if (!confirm('Apagar todas as conversas guardadas neste totem?')) return;
    try { localStorage.removeItem('live-conversas'); } catch (e) { /* sem armazenamento */ }
  });

  dlg.addEventListener('close', () => {
    if (dlg.returnValue !== 'salvar') return;
    for (const [sel, k] of CAMPOS) cfg[k] = $(sel).value.trim();
    try { if (!P) localStorage.setItem(chaveTreino, cfg.treino); } catch (e) { /* sem armazenamento */ }
    if (!P) cfg.enviarPedidos = $('#cfg-enviar').checked;
    const novaLoja = $('#cfg-loja').value.trim().replace(/[^A-Za-z0-9_-]/g, '');
    const trocouLoja = novaLoja !== (M.codigo || '');
    cfg.loja = novaLoja;
    if (trocouLoja) cfg.enviarPedidos = false; // loja nova começa sempre em modo teste
    cfg.modelo = cfg.modelo || PADRAO.modelo;
    cfg.elevenModelo = cfg.elevenModelo || PADRAO.elevenModelo;
    cfg.guardar = $('#cfg-guardar').checked;
    cfg.voz = $('#cfg-voz').value;
    cfg.tom = parseFloat($('#cfg-tom').value);
    cfg.velocidade = parseFloat($('#cfg-vel').value);
    if (cfg.filtroRuido !== 'desligado') Medidor.iniciar(); // o clique em Salvar libera o áudio
    salvarConfig();
    if (trocouLoja) {
      if (new URLSearchParams(location.search).has('loja')) location.search = novaLoja ? '?loja=' + novaLoja : '';
      else location.reload(); // carrega o cardápio da outra loja
      return;
    }
    aviso(Cerebro.usandoClaude() ? 'Configurações salvas. O Live está usando o Claude.' : 'Configurações salvas. O Live está no modo offline.');
  });

  // ---------------------------------------------------------------------------
  // Início
  // ---------------------------------------------------------------------------
  if (!Voz.podeOuvir) $('#btn-mic').classList.add('indisponivel');
  if (M.codigo && M.origem === 'exemplo') aviso(`Não consegui carregar o cardápio da loja "${M.codigo}". Usando o cardápio de exemplo.`);
  else if (M.origem === 'copia') aviso('Sem conexão com o LiveFood: usando a última cópia do cardápio.');
  else if (M.servidorErro) aviso(M.servidorErro);
  else if (P && !P.ativo) aviso('O Live está desligado no painel desta loja (Configurações → Assistente Live). Usando o modo offline.');
  else if (P && !P.ia) aviso('Falta cadastrar a chave da IA no servidor. Usando o modo offline.');
  Cerebro.configurar(configCerebro());
  atualizarStatus();
  montarBandeiras();
  aplicarIdioma('pt');
  estadoVoz('parado');
  Live.montar($('#live'), $('#live-sombra'), $('#live-rosto'));
  Live.standby();

  // Ganchos para testes e para o painel do operador
  window.Totem = { estado: S, processar, clienteFalou, acordar, voltarStandby, tirarEco, semEco, extrairNome, vozDePerto, Medidor, aplicarIdioma, trocarIdiomaNaConversa };
})();
