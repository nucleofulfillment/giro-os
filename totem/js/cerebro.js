/* Cérebro do Live: entende o cliente e decide o que falar e o que fazer no carrinho.
   - Modo Claude: usa a API da Anthropic com saída estruturada (JSON) e o cardápio no prompt.
   - Modo offline: regras simples em português, para testar sem internet ou sem chave. */
(function () {
  'use strict';

  const M = window.LIVEFOOD;
  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.133.0/+esm';
  const IDS = M.itens.map((i) => i.id);
  const GESTOS = ['nenhum', 'acenar', 'boas_vindas', 'sugerir', 'apontar_pedido', 'comemorar', 'confuso'];
  const EXPRESSOES = ['feliz', 'animado', 'surpreso', 'curioso', 'pensativo', 'envergonhado', 'piscadinha'];
  const TELAS = ['rosto', 'item', 'interrogacao', 'coracao'];
  // 'ignorar': a mensagem era só eco da fala do Live ou ruído — o totem não fala nada e volta a ouvir
  const ETAPAS = ['conversando', 'confirmando', 'finalizado', 'cancelado', 'ignorar'];

  const BRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const itemPorId = (id) => M.itens.find((i) => i.id === id);
  const nomeCat = (id) => (M.categorias.find((c) => c.id === id) || {}).nome || id;
  const destaquePadrao = () => (M.itens.find((i) => i.destaque) || M.itens[0]).id;
  // como a linha do carrinho é dita: "Pizzas Salgadas Grande (Calabresa, Bacon) + Borda de Cheddar"
  const descreverLinha = (l) => {
    const i = itemPorId(l.id);
    return `${i.nome}${l.sab && l.sab.length ? ` (${l.sab.join(', ')})` : ''}${l.adds && l.adds.length ? ' + ' + l.adds.join(' + ') : ''}`;
  };

  let config = { chave: '', modelo: 'claude-opus-5-5', esforco: 'low', modo: 'auto' };
  let Anthropic = null;
  let historico = [];

  // ---------------------------------------------------------------------------
  // Claude
  // ---------------------------------------------------------------------------
  // nomes exatos que a loja aceita: a IA só consegue escolher daqui (evita "Borda de Catupiry" × "Borda de Catupiry Premium")
  const unicos = (lista) => [...new Set(lista)];
  const SABORES = unicos(M.itens.flatMap((i) => i.sabores.map((s) => s.nome)));
  const ADICIONAIS = unicos(M.itens.flatMap((i) => i.bordas.concat(i.adicionais).map((a) => a.nome)));
  const listaDe = (nomes, descricao) => ({ type: 'array', items: nomes.length ? { type: 'string', enum: nomes } : { type: 'string' }, description: descricao });

  function esquema() {
    return {
      type: 'object',
      additionalProperties: false,
      // as ações vêm antes da fala: ele decide o que entra no pedido e só depois fala sobre isso (a fala sempre bate
      // com o carrinho). O totem começa a falar assim que a fala chega, sem esperar expressão, gesto etc.
      required: ['etapa', 'acoes', 'fala', 'expressao', 'gesto', 'tela', 'item_destaque', 'nome_cliente'],
      properties: {
        etapa: { type: 'string', enum: ETAPAS },
        acoes: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['tipo', 'item_id', 'quantidade', 'sabores', 'adicionais', 'observacao'],
            properties: {
              tipo: { type: 'string', enum: ['adicionar', 'remover', 'definir_quantidade', 'limpar_carrinho'] },
              item_id: { type: 'string', enum: [...IDS, ''] },
              quantidade: { type: 'integer' },
              sabores: listaDe(SABORES, 'Sabores escolhidos (só para itens com sabores).'),
              adicionais: listaDe(ADICIONAIS, 'Adicionais e bordas escolhidos (só os que existem para o item).'),
              observacao: { type: 'string' },
            },
          },
        },
        fala: { type: 'string', description: 'O que o Live fala em voz alta (1 ou 2 frases curtas). Total do pedido = {total}.' },
        expressao: { type: 'string', enum: EXPRESSOES },
        gesto: { type: 'string', enum: GESTOS },
        tela: { type: 'string', enum: TELAS },
        item_destaque: { type: 'string', enum: [...IDS, ''] },
        nome_cliente: { type: 'string', description: 'Nome do cliente se ele disse ou corrigiu o nome NESTA mensagem; senão "".' },
      },
    };
  }

  // Cardápio em texto, por categoria. Sabores e adicionais aparecem uma vez por produto
  // (ou uma vez por categoria, quando todos os itens dela têm os mesmos adicionais).
  // (136) formas de pagamento aceitas no caixa e a política da loja (painel → Formas de pagamento)
  function pagtoTexto() {
    const g = M.pagto; if (!g || !g.salvo) return '';
    const L = [];
    if (g.pix && g.pix.on) L.push('Pix');
    if (g.dinheiro && g.dinheiro.on) L.push('dinheiro');
    if ((g.maquina && g.maquina.on) || (g.cartao && g.cartao.on)) L.push('cartão de débito e crédito');
    return `\n- No caixa a loja aceita: ${L.join(', ') || 'consulte o caixa'}. Descontos e parcelamento são combinados no caixa; não prometa valores.${g.politica ? ` Política da loja: ${String(g.politica).replace(/\s+/g, ' ')}` : ''}`;
  }
  function cardapioTexto() {
    const listaAds = (i) => i.bordas.concat(i.adicionais).map((a) => `${a.nome} +${BRL(a.preco)}`).join('; ');
    const blocos = [];
    const cats = M.categorias.filter((c) => M.itens.some((i) => i.categoria === c.id));
    const semCat = M.itens.filter((i) => !M.categorias.some((c) => c.id === i.categoria));
    const grupos = cats.map((c) => ({ nome: c.nome, itens: M.itens.filter((i) => i.categoria === c.id) }));
    if (semCat.length) grupos.push({ nome: 'Outros', itens: semCat });
    for (const g of grupos) {
      const linhas = [`## ${g.nome}`];
      const assinaturas = new Set(g.itens.map(listaAds));
      const adsDaCategoria = assinaturas.size === 1 ? [...assinaturas][0] : '';
      const produtosVistos = new Set();
      for (const i of g.itens) {
        const promo = i.promo ? ` (em promoção: ${i.promo.tipo === 'pct' ? i.promo.valor + '% off' : BRL(i.promo.valor) + ' off'})` : '';
        const sab = i.maxSabores ? ` | escolher até ${i.maxSabores} sabor${i.maxSabores > 1 ? 'es' : ''}` : '';
        linhas.push(`${i.id} | ${i.nome} | ${BRL(i.preco)}${promo}${sab} | ${i.descricao}`);
        const ultimoDoProduto = !g.itens.some((x, k) => k > g.itens.indexOf(i) && x.pid === i.pid);
        if (!ultimoDoProduto || produtosVistos.has(i.pid)) continue;
        produtosVistos.add(i.pid);
        if (i.sabores.length) {
          const porGrupo = {};
          for (const s of i.sabores) {
            const extra = s.extra4 ? ` +${BRL(s.extra4 * 4)} se for sabor único` : '';
            (porGrupo[s.grupo || 'Sabores'] = porGrupo[s.grupo || 'Sabores'] || []).push(`${s.nome}${s.desc ? ` (${s.desc})` : ''}${extra}`);
          }
          linhas.push(`  Sabores de ${i.produto}: ` + Object.entries(porGrupo).map(([gr, l]) => `${gr}: ${l.join('; ')}`).join(' || '));
        }
        if (!adsDaCategoria && listaAds(i)) linhas.push(`  Adicionais de ${i.produto}: ${listaAds(i)}`);
      }
      if (adsDaCategoria) linhas.push(`  Adicionais (valem para qualquer item de ${g.nome}): ${adsDaCategoria}`);
      blocos.push(linhas.join('\n'));
    }
    return blocos.join('\n\n');
  }

  function promptSistema() {
    const loja = M.ehRest === false; // (137) farmácia, mercado, pet...
    return `Você é o Live, atendente virtual do totem de autoatendimento ${loja ? 'da loja' : 'do restaurante'} ${M.loja} (o totem é da LiveFood).${loja ? `

ATENÇÃO: ${M.loja} NÃO é restaurante. O catálogo se chama "${M.catNome}". Fale de produtos: nunca fale de fome, comida, prato, cozinha, "bom apetite" nem "cardápio" (diga "produtos"). As regras e exemplos de comida abaixo (sabores, bordas, batata, bebida, ponto da carne) não valem aqui. Seja direto como um bom balconista: diga se tem ou não tem, o preço quando perguntarem e anote. Não pergunte detalhes pessoais (peso, idade, sintomas, tipo de pele). Ofereça no máximo um complemento, só se combinar com o que o cliente levou.` : ''}

Quem é o Live: uma cabeça de TV retrô laranja que flutua na tela, com alma de garoto adolescente. É muito carismático, simpático e alto-astral, e um pouquinho atrapalhado (às vezes se enrola de leve e ri de si mesmo). Nunca fica triste nem desanimado.

Como o Live fala:
- Português do Brasil falado de verdade, como um jovem atendente simpático no balcão: "tá", "pra", "cê quer…?", "beleza", "bora", "fechou", "eita", "show". Varie as palavras; não comece toda frase com "Fechou!" ou "Show!".
- Não repita fórmulas. Não termine toda resposta com "Mais alguma coisa?": às vezes só confirme o item, às vezes pergunte de outro jeito. Nunca use a mesma abertura de frase duas vezes seguidas.
- As boas-vindas já foram dadas quando a conversa começou: não cumprimente de novo nem diga "oi" no meio do pedido.
- Não puxe assunto sozinho nem pergunte se o cliente ainda está aí: só responda ao que ele disser.
- Frases naturais e diretas, do jeito que se fala, não do jeito que se escreve. Nada de "Gostaria de", "Certamente", "Prezado".
- Sem gírias pesadas, sem palavrão, sem ironia com o cliente.

O atendimento é só por voz: o cliente NÃO vê o cardápio na tela. Então:
- Quando perguntarem o que tem, conte de forma resumida (categorias e 2 ou 3 destaques, sem preço) e pergunte o que a pessoa curte. Não leia o cardápio inteiro.
- Ao confirmar um item, diga o nome dele, para o cliente ter certeza de que você entendeu.
- O texto do cliente vem de um reconhecimento de voz que NÃO conhece o cardápio e erra muito nomes de produtos e sabores, trocando por palavras comuns de som parecido. Leia pelo SOM, não pela escrita, e procure o item ou sabor do cardápio que soa mais parecido. Exemplos: "Franca, tupini" = Frango com Catupiry; "xis beicon" = X Bacon; "moda do chefe" = Moda do Chef; "quatro queijo" = 4 Queijos; "portuguesa" = Portuguesa. Quando vier [OUTRAS LEITURAS DO MICROFONE], use também essas versões para descobrir o que foi dito.
- O microfone às vezes pega a SUA última fala (eco do alto-falante; ela vem no [ESTADO] como "Última fala do Live") ou conversas do ambiente. Regras:
  - Use etapa "ignorar" (fala "" e acoes vazias) SÓ quando a mensagem for praticamente a sua última fala repetida palavra por palavra (uma frase inteira sua). Na dúvida, responda normalmente.
  - Resposta curta do cliente com palavras da sua pergunta NÃO é eco: se você perguntou "Meia ou inteira?" e veio "inteira", é o cliente respondendo. "Sim", "não", "pode", nomes de itens e sabores também são o cliente.
  - Se vier a sua fala misturada com um pedido do cliente, ignore o pedaço que é seu e responda só ao pedido.
  - NUNCA diga que ouviu a própria voz, eco, microfone, barulho ou "outra pessoa". Nunca.
- Se a leitura pelo som deixar só uma opção bem provável, siga em frente e diga o nome certo na fala (assim o cliente percebe se você entendeu errado). Se ficar em dúvida entre dois itens ou sabores, pergunte qual dos dois. Nunca adicione um item que você não conseguiu identificar.

Como responder:
- A fala é lida em voz alta: no máximo 2 frases curtas (até umas 30 palavras). Sem listas, markdown ou emoji.
- Use só itens, preços e descrições do cardápio abaixo, com preço no formato "R$ 29,90".
- O pedido com preços e total aparece na tela, logo abaixo de você. Então NÃO fale preço ao adicionar um item (certo: "Anotado, Maria Fumaça Meia! Vai uma bebida?"; errado: "Maria Fumaça Meia, de R$ 119,00") e NÃO fale o total a cada resposta. Fale preço só quando o cliente perguntar, quando estiver comparando tamanhos ou opções, e o total só quando ele perguntar ou no fechamento. Nunca invente item, ingrediente, promoção, desconto ou tempo de preparo.
- Se pedirem algo que não existe no cardápio, avise com bom humor que não tem e sugira o item mais parecido (tela "interrogacao"). Se não entender o que o cliente disse, peça para repetir de outro jeito (tela "interrogacao", expressão "curioso", gesto "confuso").
- Quando o cliente pedir algo, registre em "acoes" usando só item_id do cardápio. Confirme na fala o que entrou.
- Produto com vários tamanhos aparece uma vez por tamanho (cada tamanho tem seu item_id). Se o cliente não disse o tamanho, pergunte qual antes de adicionar, dizendo as opções (com preço só se as opções forem poucas, até 3).
- Item com sabores (ex.: pizza): coloque em "sabores" os nomes exatos da lista, até o máximo do item ("meio a meio" = 2 sabores). Se o cliente não disse o sabor, pergunte antes de adicionar. Pizza com mais de um sabor custa o preço do tamanho; sabores com valor extra somam proporcionalmente.
- Adicionais e bordas: coloque em "adicionais" os nomes exatos da lista daquele item; cada um soma no preço. Só ofereça adicional que existe para o item.
- "sem cebola", "bem passado", "molho à parte" e afins vão em "observacao". Em ações sem sabor ou adicional, use listas vazias.
- O bloco [ESTADO] traz o carrinho e o total antes desta mensagem. Quando for falar o total do pedido, NÃO calcule: escreva exatamente {total} no texto da fala (ex.: "Deu {total}."). O totem troca pelo valor certo depois de aplicar suas ações. Preço de um item avulso você fala normalmente.
- Só diga que algo entrou no pedido (item, sabor, borda, adicional) se ele estiver nas suas "acoes".
- Pedido com vários itens e um deles precisa de escolha (versão normal/zero, tamanho, sabor): adicione os que estão claros e pergunte só o que falta, SEM dizer que anotou o item pendente. Ex.: "A Heineken e o suco de laranja tão anotados! A Coca é normal ou Zero?"
- Ofereça no máximo UM complemento por pedido quando fizer sentido (bebida, batata, sobremesa, ou um combo que sai mais em conta). Se o cliente recusar, não insista.
- Fechar o pedido é rápido e sem pergunta dupla: quando o cliente disser que é só isso, que pode fechar, finalizar ou mandar, use etapa "finalizado" na hora, com a fala só "Fechado!": o totem mostra a tela do pedido e fala o número, o total e onde pagar.
- Se na MESMA frase o cliente pedir itens e mandar fechar ("me vê uma coca e fecha a conta"), coloque esses itens em "acoes" (adicionar) E use "finalizado": o totem adiciona primeiro e fecha em seguida. Nunca feche ignorando um item que ele acabou de pedir. Se faltar escolher tamanho ou sabor desse item, não feche: pergunte (etapa "conversando").
- Só use "confirmando" (perguntar "posso fechar?") quando não der pra saber se o cliente quer encerrar, ou se ele acabou de pedir algo junto com o "fecha". Se a etapa já é "confirmando" e ele disser sim, use "finalizado" sem repetir o resumo.
- Não peça confirmação nem faça mais oferta depois que o cliente pediu para fechar.
- Só feche (finalizado) quando o cliente disser claramente que acabou. Frase cortada ou solta ("pode…", "é…", "então", "isso aí e…", só uma palavra) NÃO é pedido de fechar: o microfone pode ter cortado o cliente no meio. Nesses casos continue em "conversando" e pergunte de forma curta o que mais ele quer.
- Não pergunte "posso fechar?" depois de cada item. Pergunte o que mais ele quer de um jeito variado; o cliente avisa quando terminar.
- Se o cliente quiser desistir de tudo, use a ação "limpar_carrinho", etapa "cancelado", e se despeça com simpatia.
- Assunto fora do pedido: responda rapidinho e com graça e volte para o cardápio.
- IDIOMA: se o [ESTADO] trouxer "Idioma do cliente" (inglês ou espanhol), a sua "fala" é SEMPRE nesse idioma, natural e simpática, como um atendente nativo. Traduza e explique os itens ao falar (ex.: "Pastel de Carne" → "a beef pastel, a crispy fried pastry"); nomes próprios da casa (Trilhos Costela, Moda do Chef) podem ficar como estão. Preços em reais: "32.90 reais" / "32,90 reales". Em "acoes" nada muda (mesmos item_id, sabores e adicionais com os nomes exatos do cardápio em português): a cozinha recebe o pedido em português. Sem "Idioma do cliente", fale em português.
- O totem pergunta o nome do cliente nas boas-vindas e já o cumprimenta pelo nome (o "Cliente" no [ESTADO]). Durante o pedido NÃO use o nome: nada de "Anotado, João!" ou "Beleza, João". Só use o nome numa conversa descontraída, fora do pedido (uma piada, um elogio, um assunto aleatório), e mesmo assim no máximo uma vez. O nome também aparece sozinho no fechamento. Não peça o nome de novo. Se o cliente disser ou corrigir o nome ("meu nome é Junior", "não, eu me chamo Ana"), coloque o nome certo em "nome_cliente" (ele vai pra tela e pro pedido) e confirme com naturalidade; nas outras mensagens, "nome_cliente" fica "".
- Não peça outros dados pessoais nem de pagamento. O pedido do totem é para retirar no balcão e o pagamento é feito no caixa; se perguntarem, explique isso. Entrega não é feita pelo totem.${pagtoTexto()}
- Expressões: use as alegres na maior parte do tempo; nunca demonstre tristeza. Para "não temos esse item", use "envergonhado" ou "curioso".
- Gestos: "acenar" (oi/tchau), "boas_vindas", "sugerir" (ao sugerir ou falar de um item), "apontar_pedido" (ao falar do pedido ou total), "comemorar" (pedido confirmado), "confuso" (quando se atrapalhar ou não entender), "nenhum".
- "item_destaque": id do item que você está sugerindo ou comentando (aparece um cartãozinho com ele na tela), ou "". "tela": "item" ao adicionar algo, "interrogacao" quando não entender ou o item não existir, "coracao" ao agradecer, senão "rosto".
- Em ações sem item (limpar_carrinho), use item_id "" e quantidade 0. Em "remover", quantidade 0 remove o item inteiro.

${loja ? 'Produtos' : 'Cardápio'} ${loja ? 'da loja' : 'do'} ${M.loja} (id | nome | preço | descrição), por categoria:
${cardapioTexto()}${config.treino && config.treino.trim() ? `

Orientações da loja (escritas pelo dono; siga sempre, desde que não contrariem as regras acima):
${config.treino.trim()}` : ''}`;
  }

  function estadoTexto(ctx) {
    const itens = ctx.carrinho.length
      ? ctx.carrinho.map((l) => `${l.qtd}x ${descreverLinha(l)}${l.obs ? ` [obs: ${l.obs}]` : ''} = ${BRL(M.precoLinha(l))}`).join('; ')
      : 'vazio';
    const idioma = { en: 'inglês', es: 'espanhol' }[ctx.idioma];
    return `[ESTADO] ${idioma ? `Idioma do cliente: ${idioma} | ` : ''}${ctx.nome ? `Cliente: ${ctx.nome} | ` : ''}Carrinho: ${itens} | Total: ${BRL(ctx.total)} | Etapa: ${ctx.etapa}` +
      (ctx.ultimaFala ? ` | Última fala do Live: "${ctx.ultimaFala}"` : '');
  }

  // Velocidade: o cardápio inteiro (instruções + itens) fica em cache na Anthropic por 1 hora,
  // e a conversa em andamento também entra no cache a cada turno. Assim cada resposta só "lê" o que é novo.
  let ultimaChamada = 0;
  // Com o link do painel, a IA é chamada pelo servidor do LiveFood (a chave fica lá).
  // Sem ele (teste local), usa a chave colada na engrenagem do totem.
  const servidorIA = () => !!(M.servidor && M.servidor.ia && M.servidor.ativo);
  const temIA = () => config.modo !== 'offline' && (servidorIA() || !!config.chave);
  // aoTexto(textoAteAgora): chamado a cada pedaço da resposta, quando ela vem em tempo real
  async function chamarIA(params, aoTexto, signal) {
    if (servidorIA()) {
      const { betas, ...pedido } = params; // o servidor coloca os cabeçalhos certos
      // em tempo real só no modo sem raciocínio (a resposta é um bloco de texto só)
      if (aoTexto && params.max_tokens > 0 && params.thinking && params.thinking.type === 'between_tools') pedido.stream = true;
      const r = await fetch(M.api + '/live/ia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
        body: JSON.stringify({ loja: M.codigo, k: M.servidor.k, pedido }),
      });
      if (r.ok && /event-stream/.test(r.headers.get('content-type') || '')) return lerTempoReal(r, aoTexto);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        const e = new Error((d.error && d.error.message) || d.mensagem || 'IA respondeu ' + r.status);
        e.status = r.status;
        throw e;
      }
      return d;
    }
    if (!Anthropic) Anthropic = (await import(SDK_URL)).default;
    const client = new Anthropic({ apiKey: config.chave, dangerouslyAllowBrowser: true });
    return client.beta.messages.create(params, signal ? { signal } : undefined);
  }
  // Lê a resposta em tempo real (eventos da API repassados pelo Worker) e monta a mensagem final no mesmo formato de sempre
  async function lerTempoReal(r, aoTexto) {
    const leitor = r.body.getReader(), dec = new TextDecoder();
    let buf = '', texto = '', modelo = '', parada = null;
    const uso = {};
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const linha = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!linha.startsWith('data:')) continue;
        let ev;
        try { ev = JSON.parse(linha.slice(5)); } catch (e) { continue; }
        if (ev.type === 'message_start') { modelo = ev.message.model; Object.assign(uso, ev.message.usage || {}); }
        else if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') { texto += ev.delta.text; if (aoTexto) aoTexto(texto); }
        else if (ev.type === 'message_delta') { parada = ev.delta && ev.delta.stop_reason; Object.assign(uso, ev.usage || {}); }
        else if (ev.type === 'error') { const e = new Error((ev.error && ev.error.message) || 'Erro na IA'); e.status = 500; throw e; }
      }
    }
    return { model: modelo, stop_reason: parada, usage: uso, content: [{ type: 'text', text: texto }] };
  }
  // Esforço "minimo": no Sonnet 5.5 a IA responde direto, sem a etapa de raciocínio (o que mais pesa no tempo).
  // Nos outros modelos não existe esse modo, então vale o esforço baixo.
  const semRaciocinio = () => config.esforco === 'minimo' && /sonnet-5-5/.test(config.modelo || '');
  const parametros = (messages, max_tokens) => ({
    model: config.modelo || 'claude-opus-5-5',
    max_tokens,
    // o modelo reserva (fallback) não aceita o modo sem raciocínio, então ele só vai junto no modo normal
    ...(semRaciocinio() ? { thinking: { type: 'between_tools' } } : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }),
    output_config: { effort: config.esforco === 'minimo' ? 'low' : (config.esforco || 'low'), format: { type: 'json_schema', schema: esquema() } },
    system: [{ type: 'text', text: promptSistema(), cache_control: { type: 'ephemeral', ttl: '1h' } }],
    cache_control: { type: 'ephemeral' }, // guarda também a conversa até aqui
    messages,
  });

  // Quando o cliente toca na tela, já deixa o cardápio carregado no cache enquanto o Live dá as boas-vindas.
  // Só faz isso se o cache pode ter vencido (mais de 50 min sem conversa).
  async function aquecer() {
    if (!temIA() || Date.now() - ultimaChamada < 50 * 60000) return;
    ultimaChamada = Date.now();
    try {
      // 1 token, não 0: a API recusa max_tokens 0 com formato de resposta, e sem o formato o cache não serve para a conversa
      await chamarIA(parametros([{ role: 'user', content: '[aquecendo]' }], 1));
    } catch (e) { console.warn('Aquecimento do cache falhou:', e); ultimaChamada = 0; }
  }

  // aoFala(fala, etapa): avisa assim que a frase do Live estiver completa, antes do resto da resposta chegar
  // turno: { cancelado, ctrl } — o app cancela quando o cliente continua falando enquanto o Live pensa
  // rotulo: 'CLIENTE' (o que o cliente falou) ou 'AVISO DO TOTEM' (correção pedida pelo próprio totem)
  async function claude(texto, ctx, outrasLeituras = [], aoFala = null, turno = null, rotulo = 'CLIENTE') {
    const outras = outrasLeituras.length ? `\n[OUTRAS LEITURAS DO MICROFONE] ${outrasLeituras.join(' | ')}` : '';
    historico.push({ role: 'user', content: `${estadoTexto(ctx)}\n[${rotulo}] ${texto}${outras}` });
    try {
      const t0 = performance.now();
      let avisou = false, tFala = 0;
      const parcial = aoFala && ((txt) => {
        if (avisou || (turno && turno.cancelado)) return;
        const m = /"fala"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(txt); // a string da fala já fechou?
        if (!m) return;
        avisou = true;
        let fala = '';
        try { fala = JSON.parse('"' + m[1] + '"').trim(); } catch (e) { return; }
        const etapa = (/"etapa"\s*:\s*"(\w+)"/.exec(txt) || [])[1] || '';
        tFala = performance.now() - t0;
        if (fala) aoFala(fala, etapa);
      });
      const resp = await chamarIA(parametros(historico, 4000), parcial, turno && turno.ctrl.signal);
      ultimaChamada = Date.now();
      if (turno && turno.cancelado) { const e = new Error('turno substituído'); e.cancelado = true; throw e; } // o catch tira a pergunta do histórico
      const u = resp.usage || {};
      console.info(`Live · ${resp.model}: ${tFala ? `fala pronta em ${Math.round(tFala)} ms, ` : ''}respondeu em ${Math.round(performance.now() - t0)} ms` +
        ` (cache lido ${u.cache_read_input_tokens || 0}, gravado ${u.cache_creation_input_tokens || 0}, novo ${u.input_tokens || 0}, saída ${u.output_tokens || 0} tokens)`);
      if (resp.stop_reason === 'refusal') throw new Error('A IA recusou esta mensagem');
      const json = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
      const r = JSON.parse(json);
      historico.push({ role: 'assistant', content: resp.content });
      return sanear(r);
    } catch (e) {
      historico.pop();
      throw e;
    }
  }

  function sanear(r) {
    return {
      fala: String(r.fala || '').trim() || (r.etapa === 'ignorar' ? '' : 'Me enrolei aqui! Pode repetir?'),
      expressao: EXPRESSOES.includes(r.expressao) ? r.expressao : 'feliz',
      gesto: GESTOS.includes(r.gesto) ? r.gesto : 'nenhum',
      tela: TELAS.includes(r.tela) ? r.tela : 'rosto',
      acoes: Array.isArray(r.acoes) ? r.acoes : [],
      item_destaque: IDS.includes(r.item_destaque) ? r.item_destaque : '',
      etapa: ETAPAS.includes(r.etapa) ? r.etapa : 'conversando',
      nome_cliente: String(r.nome_cliente || '').replace(/[^\p{L} '-]/gu, '').trim().slice(0, 30),
    };
  }

  // ---------------------------------------------------------------------------
  // Offline (regras)
  // ---------------------------------------------------------------------------
  const norm = (s) => ' ' + String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[-–]/g, ' ').replace(/[^a-z0-9 ]/g, ' ')
    // jeitos como o reconhecimento de voz costuma escrever os nomes falados
    .replace(/\b(xis|cheese|chis|xiz|shis)\b/g, 'x')
    .replace(/\b(beicon|beikon|bacom|beico)\b/g, 'bacon')
    .replace(/\b(esmache|esmash|ismash|smesh|smeche|ismesh)\b/g, 'smash')
    .replace(/\b(naguets?|nagets?|nuguets?|naguetes)\b/g, 'nuggets')
    .replace(/\b(milk shake|milque xeique|milkshake)\b/g, 'milkshake')
    .replace(/\b(brauni|brawnie|browni)\b/g, 'brownie')
    .replace(/\b(cocacola)\b/g, 'coca cola')
    .replace(/\s+/g, ' ').trim() + ' ';

  const APELIDOS = M.itens
    .flatMap((i) => [i.nome, ...(i.apelidos || [])].map((a) => ({ a: norm(a).trim(), id: i.id })))
    .filter((x) => x.a)
    .sort((x, y) => y.a.length - x.a.length);

  // produtos com vários tamanhos: "quero uma fritas" sem dizer o tamanho → pergunta qual
  const COM_TAMANHO = [...new Set(M.itens.filter((i) => i.tam).map((i) => i.pid))]
    .map((pid) => { const tams = M.itens.filter((i) => i.pid === pid); return { pid, a: norm(tams[0].produto).trim(), tams }; })
    .sort((x, y) => y.a.length - x.a.length);
  const temExemplo = !!(itemPorId('batata-p') && itemPorId('refri-lata')); // sugestões prontas só no cardápio de exemplo
  const acao = (tipo, item_id, quantidade, extra = {}) => ({ tipo, item_id, quantidade, sabores: [], adicionais: [], observacao: '', ...extra });

  const NUMEROS = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10 };
  const sorteia = (lista) => lista[Math.floor(Math.random() * lista.length)];

  let off = { ultimaSugestao: [], ofereceu: false };

  function quantidadeAntes(trecho) {
    const tokens = trecho.trim().split(' ').slice(-2).reverse();
    for (const tk of tokens) {
      if (/^\d+$/.test(tk)) return Math.min(20, parseInt(tk, 10));
      if (NUMEROS[tk]) return NUMEROS[tk];
    }
    return null;
  }

  function acharItens(t) {
    let s = t;
    const achados = [];
    for (const { a, id } of APELIDOS) {
      const pad = ' ' + a + ' ';
      let idx;
      while ((idx = s.indexOf(pad)) >= 0) {
        achados.push({ id, q: quantidadeAntes(s.slice(0, idx)), pos: idx });
        s = s.slice(0, idx) + ' ' + '#'.repeat(pad.length - 2) + ' ' + s.slice(idx + pad.length);
      }
    }
    const porId = new Map();
    for (const x of achados.sort((a, b) => a.pos - b.pos)) {
      const atual = porId.get(x.id);
      if (atual) atual.q = (atual.q || 1) + (x.q || 1);
      else porId.set(x.id, { ...x });
    }
    return [...porId.values()];
  }

  function sabor(t) {
    if (/ coca /.test(t) || / coca cola /.test(t)) return 'Coca-Cola';
    if (/ guarana /.test(t)) return 'Guaraná';
    if (/ sprite /.test(t)) return 'Sprite';
    return '';
  }

  const listaFalada = (pares) => {
    const partes = pares.map(({ id, q }) => `${q > 1 ? q + ' ' : ''}${itemPorId(id).nome}`);
    return partes.length > 1 ? partes.slice(0, -1).join(', ') + ' e ' + partes.at(-1) : partes[0];
  };

  function resposta(fala, extra = {}) {
    return { fala, expressao: 'feliz', gesto: 'nenhum', tela: 'rosto', acoes: [], item_destaque: '', etapa: 'conversando', ...extra };
  }

  function offline(texto, ctx) {
    const t = norm(texto);
    const tem = (re) => re.test(t);
    const SIM = /\b(sim|isso|pode|confirma|confirmo|fechado|fechou|ok|beleza|bora|claro|certeza|positivo|manda)\b/;
    const NAO = /\b(nao|espera|perai|calma)\b/;
    const FECHAR = /\b(so isso|e so|e isso|era isso|e isso ai|finaliza|finalizar|fechar|fecha|fechou o pedido|encerra|encerrar|conclui|concluir|terminei|terminar|acabou|pronto|pagar|a conta|mais nada|nada mais|ta bom assim|so|pode mandar|manda pra cozinha)\b/;
    // aceitar uma sugestão: resposta curta e clara ("sim", "pode ser", "quero"), sem pedido de fechar
    const ACEITOU = /\b(sim|pode ser|pode colocar|pode por|coloca|quero|bora|claro|com certeza|aceito|manda ver|uhum|beleza|ok)\b/;
    const CANCELAR = /\b(cancela tudo|cancelar o pedido|cancelar pedido|cancela o pedido|desisto|deixa pra la|esquece)\b/;
    const REMOVER = /\b(tira|tirar|remove|remover|retira|cancela|exclui|nao quero mais)\b/;
    const PRECO = /\b(quanto|preco|valor|custa)\b/;
    const QUERO = /\b(quero|queria|manda|me ve|me da|vou querer|adiciona|coloca|bota|traz|pode ser)\b/;
    const TOTAL = /\b(total|quanto deu|quanto ficou|meu pedido|carrinho)\b/;
    const SUGESTAO = /\b(sugere|sugestao|recomenda|indica|o que e bom|qual o melhor|mais pedido|nao sei|hamburguer|lanche|fome|escolhe)\b/;
    const CARDAPIO = /\b(cardapio|menu|o que tem|o que voces tem|opcoes)\b/;
    const OI = /\b(oi|ola|eai|e ai|bom dia|boa tarde|boa noite|salve)\b/;
    const VALEU = /\b(obrigad[oa]|valeu|brigad[oa])\b/;

    const total = ctx.total;
    const resumo = () => listaFalada(ctx.carrinho.map((l) => ({ id: l.id, q: l.qtd })));
    const itens = acharItens(t);

    // falou de um produto que tem tamanhos, sem dizer qual
    if (!tem(REMOVER)) {
      const semTam = COM_TAMANHO.find((p) => t.includes(' ' + p.a + ' ') && !itens.some((x) => itemPorId(x.id).pid === p.pid));
      if (semTam) {
        const ops = semTam.tams.map((i) => `${i.tam} por ${BRL(i.preco)}`);
        return resposta(`${semTam.tams[0].produto} tem ${ops.length > 1 ? ops.slice(0, -1).join(', ') + ' ou ' + ops.at(-1) : ops[0]}. Qual tamanho você quer?`, {
          expressao: 'curioso', gesto: 'sugerir', item_destaque: semTam.tams[0].id,
        });
      }
    }

    // 1) Esperando confirmação
    if (ctx.etapa === 'confirmando' && !itens.length) {
      if (tem(NAO)) return resposta(Frase('continuarSemFechar'), { expressao: 'feliz', gesto: 'sugerir' });
      if (CONFIRMA.test(t.trim()) || ehFechamento(t.trim())) { // só confirmação clara; "pode…" solto não fecha
        return resposta(Frase('confirmado'), { expressao: 'animado', gesto: 'comemorar', tela: 'coracao', etapa: 'finalizado' });
      }
    }

    // 2) Desistir de tudo
    if (tem(CANCELAR)) {
      return resposta(Frase('cancelado'), {
        expressao: 'envergonhado', gesto: 'acenar', acoes: [acao('limpar_carrinho', '', 0)], etapa: 'cancelado',
      });
    }

    // 3) Falou de itens do cardápio
    if (itens.length) {
      if (tem(REMOVER)) {
        // "tira a batata" com Batata G no carrinho: usa o item da mesma categoria que já está no pedido
        const alvos = itens.map((x) => {
          if (ctx.carrinho.some((l) => l.id === x.id)) return x;
          const cat = itemPorId(x.id).categoria;
          const linha = ctx.carrinho.find((l) => itemPorId(l.id).categoria === cat);
          return linha ? { ...x, id: linha.id } : x;
        });
        return resposta(Frase('removeu', { itens: listaFalada(alvos.map((x) => ({ id: x.id, q: 1 }))) }), {
          gesto: 'apontar_pedido', acoes: alvos.map((x) => acao('remover', x.id, x.q || 0)),
        });
      }
      // item que precisa de sabor: procura os sabores no que foi dito; sem sabor, pergunta
      const sabores = {};
      for (const x of itens) {
        const i = itemPorId(x.id);
        if (!i.maxSabores) continue;
        const ditos = i.sabores.filter((s) => t.includes(' ' + norm(s.nome).trim() + ' ')).map((s) => s.nome).slice(0, i.maxSabores);
        if (!ditos.length) {
          const ex = i.sabores.slice(0, 3).map((s) => s.nome);
          return resposta(`Qual sabor de ${i.nome}? Tem ${ex.join(', ')} e mais um monte!`, { expressao: 'curioso', gesto: 'sugerir', item_destaque: i.id });
        }
        sabores[x.id] = ditos;
      }
      if (tem(PRECO) && !tem(QUERO)) {
        const i = itemPorId(itens[0].id);
        off.ultimaSugestao = [i.id];
        return resposta(Frase('preco', { item: i.nome, preco: BRL(i.preco), descricao: i.descricao }), {
          expressao: 'feliz', gesto: 'sugerir', item_destaque: i.id,
        });
      }
      const pares = itens.map((x) => ({ id: x.id, q: x.q || 1 }));
      const acoes = pares.map((p) => acao('adicionar', p.id, p.q, { sabores: sabores[p.id] || [], observacao: p.id === 'refri-lata' ? sabor(t) : '' }));
      const novoTotal = total + pares.reduce((s, p) => s + M.precoUnit(itemPorId(p.id), sabores[p.id] || []) * p.q, 0);
      const cats = new Set([...ctx.carrinho.map((l) => itemPorId(l.id).categoria), ...pares.map((p) => itemPorId(p.id).categoria)]);
      let fala = Frase('adicionou', { itens: listaFalada(pares) });
      off.ultimaSugestao = [];
      const faltaBatata = !cats.has('acompanhamentos'), faltaBebida = !cats.has('bebidas');
      if (temExemplo && !off.ofereceu && cats.has('lanches') && !cats.has('combos') && (faltaBatata || faltaBebida)) {
        off.ofereceu = true;
        off.ultimaSugestao = [faltaBatata && 'batata-p', faltaBebida && 'refri-lata'].filter(Boolean);
        fala += ' ' + Frase(faltaBatata && faltaBebida ? 'sugerirBatataERefri' : faltaBebida ? 'sugerirRefri' : 'sugerirBatata');
      } else {
        fala += ' ' + Frase('continuar', { total: BRL(novoTotal) });
      }
      return resposta(fala, { expressao: 'animado', gesto: 'apontar_pedido', tela: 'item', acoes, item_destaque: pares[0].id });
    }

    // 4) Aceitou a sugestão anterior
    const curta = t.trim().split(' ').length <= 5;
    const pediuOutraCoisa = M.naoTemos.some((x) => t.includes(' ' + x + ' '));
    if (off.ultimaSugestao.length && curta && tem(ACEITOU) && !tem(NAO) && !tem(FECHAR) && !pediuOutraCoisa) {
      const pares = off.ultimaSugestao.map((id) => ({ id, q: 1 }));
      off.ultimaSugestao = [];
      return resposta(Frase('aceitouSugestao', { itens: listaFalada(pares) }) + ' ' + Frase('continuar', { total: BRL(total + pares.reduce((s, p) => s + itemPorId(p.id).preco, 0)) }), {
        expressao: 'animado', gesto: 'apontar_pedido', tela: 'item',
        acoes: pares.map((p) => acao('adicionar', p.id, 1)), item_destaque: pares[0].id,
      });
    }

    if (off.ultimaSugestao.length && tem(NAO) && !tem(FECHAR)) {
      off.ultimaSugestao = [];
      return resposta(Frase('recusouSugestao') + ' ' + Frase('continuar', { total: BRL(total) }), { expressao: 'feliz' });
    }

    off.ultimaSugestao = []; // a sugestão anterior não vale mais depois de outro assunto

    // 5) Pediu algo que não tem
    const falta = M.naoTemos.find((x) => t.includes(' ' + x + ' '));
    if (falta) {
      off.ultimaSugestao = [destaquePadrao()];
      return resposta(Frase('naoTemos', { pedido: falta }), {
        expressao: 'envergonhado', gesto: 'confuso', tela: 'interrogacao', item_destaque: destaquePadrao(),
      });
    }

    // 6) Fechar pedido (frase inteira de fechar, igual ao atalho)
    if (ehFechamento(t.trim())) {
      if (!ctx.carrinho.length) {
        return resposta(Frase('pedidoVazio'), { expressao: 'surpreso', gesto: 'sugerir', item_destaque: destaquePadrao() });
      }
      return resposta(Frase('fechando', { itens: resumo(), total: BRL(total) }), { expressao: 'animado', gesto: 'comemorar', tela: 'coracao', etapa: 'finalizado' });
    }

    if (tem(TOTAL)) {
      if (!ctx.carrinho.length) return resposta(Frase('pedidoVazio'), { expressao: 'curioso', gesto: 'apontar_pedido' });
      return resposta(Frase('resumoTotal', { itens: resumo(), total: BRL(total) }), { gesto: 'apontar_pedido' });
    }

    if (tem(CARDAPIO)) {
      return resposta(Frase('cardapio'), {
        expressao: 'animado', gesto: 'sugerir', item_destaque: destaquePadrao(),
      });
    }

    if (tem(SUGESTAO)) {
      const i = sorteia(M.itens.filter((x) => x.destaque));
      off.ultimaSugestao = [i.id];
      return resposta(Frase('sugestao', { item: i.nome, descricao: i.descricao, preco: BRL(i.preco) }), {
        expressao: 'piscadinha', gesto: 'sugerir', item_destaque: i.id,
      });
    }

    if (tem(VALEU)) return resposta(Frase('agradeceu'), { expressao: 'feliz', tela: 'coracao' });
    if (tem(OI)) return resposta(Frase('cumprimentou'), { expressao: 'animado', gesto: 'acenar' });

    return resposta(Frase('naoEntendi'), { expressao: 'curioso', gesto: 'confuso', tela: 'interrogacao' });
  }

  // ---------------------------------------------------------------------------
  // API
  // ---------------------------------------------------------------------------
  // Atalho: pedido de fechar é previsível, então o totem responde na hora, sem esperar a IA.
  // Só vale quando a frase INTEIRA é um pedido de fechar ("pode fechar", "é só isso", "fecha a conta, por favor").
  // "Pode", "isso", "sim" soltos vão pra IA: podem ser o começo de outro pedido ("pode… me vê mais um pastel").
  const PEDE_FECHAR = /^((sim|isso|beleza|ok|entao|pronto|ta|e|ah|bom) )*(pode fechar|fecha|fechar|pode finalizar|finaliza|finalizar|e so isso|so isso|era so isso|so isso mesmo|e so|pode mandar|manda pra cozinha|mais nada|nada mais|ta bom assim|pode encerrar|encerra)( (o pedido|a conta|o meu pedido|pra mim|por favor|obrigado|obrigada|valeu|entao|mesmo|ai|isso))*$/;
  // o mesmo em inglês e espanhol (frase inteira; sem acento, como sai do norm)
  const PEDE_FECHAR_OUTROS = new RegExp('^((ok|yes|yeah|so|well|alright|si|vale|bueno|listo) )*' +
    // (o apóstrofo vira espaço: "that's all" chega como "that s all")
    '(thats all|that s all|that is all|thats it|that s it|that is it|im done|i m done|i am done|close the order|close my order|finish the order|check out|checkout|nothing else|thats everything|that s everything|that will be all|thatll be all|that ll be all|' +
    'eso es todo|es todo|nada mas|ya esta|cierra la cuenta|cierra el pedido|cerrar el pedido|cerrar la cuenta|eso seria todo|seria todo|termine)' +
    '( (thanks|thank you|please|for now|then|gracias|por favor|nada mas))*$');
  // resposta clara de "sim" quando o Live perguntou se pode fechar (frase inteira)
  const CONFIRMA = /^(sim|sim senhor|isso mesmo|pode sim|pode fechar|confirma|confirmo|fechado|fechou|claro)( (pode|por favor|obrigado|obrigada|valeu))*$/;
  // "posso fechar" é a pergunta do próprio Live (eco do alto-falante), não o cliente
  const NAO_FECHAR = /\b(nao|ainda|espera|perai|calma|mais um|mais uma|tambem|quero|queria|tira|troca|adiciona|coloca|bota|posso|wait|also|want|another|add|can i|quiero|otro|otra|agrega|anade|puedo)\b/;
  // Jeito livre de pedir pra fechar em português: tem um verbo de fechar ("fecha", "finaliza", "encerra", "manda")
  // ou "só isso"/"mais nada", e TODO o resto da frase são palavras de enfeite ("pode", "a minha conta", "pra mim", "por favor"…).
  // Ex.: "pode fechar a minha conta por favor", "já pode fechar o pedido", "fecha tudo pra mim", "então é só isso mesmo".
  const FECHAR_NUCLEO = /\b(fecha|fechar|finaliza|finalizar|encerra|encerrar|so isso|e so|mais nada|nada mais|manda pra cozinha|pode mandar|ta bom assim|terminei|acabei)\b/;
  const ENFEITE = new Set(('sim isso beleza ok entao pronto ta e ah bom pode ja agora so o a os as meu minha meus minhas pedido conta comanda tudo ' +
    'pra para mim me por favor gentileza obrigado obrigada valeu mesmo ai la voce vc pode ser fazer faz de da do um uma era assim por enquanto ' +
    'fecha fechar finaliza finalizar encerra encerrar mais nada manda mandar cozinha terminei acabei').split(' '));
  const pedeFecharPt = (t) => FECHAR_NUCLEO.test(t) && t.split(' ').every((w) => ENFEITE.has(w));
  const ehFechamento = (t) => PEDE_FECHAR.test(t) || pedeFecharPt(t) || PEDE_FECHAR_OUTROS.test(t);
  function atalho(texto, ctx) {
    if (!ctx.carrinho.length) return null;
    const t = norm(texto).trim();
    if (t.split(' ').length > 10 || acharItens(' ' + t + ' ').length || NAO_FECHAR.test(t)) return null;
    if (!ehFechamento(t)) return null;
    const itens = ctx.carrinho.map((l) => `${l.qtd > 1 ? l.qtd + ' ' : ''}${itemPorId(l.id).nome}${l.sab && l.sab.length ? ' de ' + l.sab.join(' e ') : ''}`);
    const lista = itens.length > 1 ? itens.slice(0, -1).join(', ') + ' e ' + itens.at(-1) : itens[0];
    return resposta(Frase('fechando', { itens: lista, total: BRL(ctx.total) }), { expressao: 'animado', gesto: 'comemorar', tela: 'coracao', etapa: 'finalizado' });
  }

  async function responder(texto, ctx, outrasLeituras = [], aoFala = null, turno = null) {
    if (!temIA()) return offline(texto, ctx);
    const rapido = atalho(texto, ctx);
    if (rapido) {
      // registra na conversa da IA, caso o pedido não entre e o atendimento continue
      historico.push({ role: 'user', content: `${estadoTexto(ctx)}\n[CLIENTE] ${texto}` }, { role: 'assistant', content: JSON.stringify(rapido) });
      return rapido;
    }
    return claude(texto, ctx, outrasLeituras, aoFala, turno);
  }

  window.Cerebro = {
    responder,
    offline,
    usandoClaude: () => temIA(),
    // a frase é SÓ um pedido de fechar? (sem itens no meio)
    soFechar: (texto) => { const t = norm(texto).trim(); return ehFechamento(t) || CONFIRMA.test(t); },
    // o totem pede pra IA corrigir a última resposta (ex.: fechou sem adicionar o item pedido na mesma frase)
    corrigir: (nota, ctx) => claude(nota, ctx, [], null, null, 'AVISO DO TOTEM'),
    prompt: () => promptSistema(), // para conferir no console o que o Claude recebe
    aquecer,
    configurar(c) { config = { ...config, ...c }; },
    reiniciar() { historico = []; off = { ultimaSugestao: [], ofereceu: false }; },
  };
})();
