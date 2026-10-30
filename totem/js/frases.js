/* Falas fixas do Live. Edite à vontade: cada lista tem variações, e ele sorteia uma diferente da última.
   Marcadores que são trocados na hora:
   {itens}  → itens do pedido ("X-Bacon Crocante e Refrigerante Lata")
   {item}   → um item só          {preco} → preço do item       {descricao} → descrição do item
   {total}  → total do pedido     {numero} → número do pedido   {pedido} → algo que não tem no cardápio
   {loja}   → nome do restaurante {aoLoja} → "ao Trilhos" / "à Pizzaria X"   {destaque} / {destaquePreco} → um item em destaque   {categorias} → categorias do cardápio
   (o cardápio vem da loja ligada ao totem; não escreva nome de produto fixo aqui)
   Uma frase vazia ('') numa lista quer dizer "às vezes não fala nada nesse ponto". */
window.FRASES = {
  // primeira fala quando alguém toca na tela
  boasVindas: [
    'Seja bem-vindo {aoLoja}! Eu sou o Live. Qual é o seu nome?',
    'Bem-vindo {aoLoja}! Sou o Live. Como você se chama?',
    'Seja bem-vindo {aoLoja}! Eu sou o Live. Me fala seu nome?',
  ],
  // resposta ao nome do cliente
  prazer: ['Prazer, {nome}! O que você vai querer hoje?', 'Que bom te ver, {nome}! Pode fazer seu pedido.', 'Beleza, {nome}! Tá com fome de quê?'],

  // quando um item entra no pedido (começo da frase)
  adicionou: [
    'Anotado: {itens}!',
    'Show, {itens} no pedido.',
    'Boa! Coloquei {itens}.',
    'Pronto, {itens} tá no pedido.',
    'Ótima escolha: {itens}!',
    '{itens}, já tá anotado.',
    'Hmm, {itens}! Bom demais.',
  ],

  // complemento depois de adicionar (às vezes não pergunta nada)
  continuar: [
    'Vai querer mais alguma coisa?',
    'Algo mais?',
    'O que mais?',
    'Quer completar com mais alguma coisa?',
    '',
    '',
  ],

  // sugestão de complemento logo depois de um lanche
  sugerirBatataERefri: ['Bora completar com uma batata e um refri?', 'Que tal uma batatinha e um refri pra acompanhar?'],
  sugerirRefri: ['E pra beber, vai um refri geladinho?', 'Vai querer alguma bebida?'],
  sugerirBatata: ['Vai uma batatinha pra acompanhar?', 'Que tal uma batata pra acompanhar?'],

  aceitouSugestao: ['Boa! {itens} no pedido.', 'Show, coloquei {itens}.', 'Feito! {itens} anotado.'],
  recusouSugestao: ['Beleza, sem problema!', 'Tranquilo!', 'De boa!'],

  removeu: ['Prontinho, tirei {itens} do pedido.', 'Feito, {itens} saiu do pedido.', 'Tirei {itens}, tá certo?'],

  preco: ['O {item} sai por {preco}. {descricao}. Quer que eu coloque?', '{item} tá {preco}: {descricao}. Vai querer?'],

  naoTemos: [
    'Eita, {pedido} a gente não tem não… Mas o {destaque} é sucesso aqui, quer experimentar?',
    'Putz, {pedido} não tem no cardápio. Posso te sugerir o {destaque}?',
  ],

  naoEntendi: [
    'Hmm, acho que meu sinal falhou aqui… Pode falar de novo?',
    'Me enrolei! Pode repetir de outro jeito?',
    'Eita, essa eu não peguei. Fala de novo pra mim?',
  ],

  sugestao: ['Se eu fosse você, ia no {item}: {descricao}, por {preco}. Bora?', 'O {item} é dos mais pedidos: {descricao}, por {preco}. Quer?'],

  cardapio: ['Tem {categorias}! Um dos queridinhos é o {destaque}, por {destaquePreco}.', 'A gente tem {categorias}. Do que você tá com vontade?'],

  pedidoVazio: ['Seu pedido ainda tá vazio! O {destaque} é o queridinho daqui, bora?', 'Ainda não tem nada no pedido. Quer uma sugestão?'],
  resumoTotal: ['Até agora tem {itens}, dando {total}.', 'Seu pedido: {itens}. Total de {total}.'],

  // ao pedir para fechar
  confirmar: ['Ficou {itens}, total de {total}. Posso confirmar?', 'Então é {itens}, dando {total}. Confirmo pra você?'],
  continuarSemFechar: ['Sem problema! O que mais você vai querer?', 'Beleza, pode continuar pedindo.'],
  confirmado: ['Pedido confirmado! Já tô mandando pra cozinha.', 'Perfeito, pedido confirmado e indo pra cozinha!'],
  cancelado: ['Tranquilo, cancelei tudo! Quando bater a fome, é só me chamar.'],

  // depois do pedido fechado (as duas saem juntas numa fala só)
  numeroPedido: ['Seu pedido é o número {numero}! É só pagar no caixa e retirar no balcão.', 'Anota aí: pedido número {numero}. Paga no caixa e retira no balcão.'],
  despedida: ['Bom apetite!', 'Valeu demais, bom apetite!', 'Obrigado pela preferência!'],
  // fechamento: uma fala só, dita com a tela do número aberta ({nome} já vem com a vírgula, ou vazio)
  fechamento: [
    'Pedido confirmado{nome}! Seu número é o {numero}, deu {total}. Paga no caixa e retira no balcão. Bom apetite!',
    'Prontinho{nome}! Pedido número {numero}, total de {total}. É só pagar no caixa e retirar no balcão. Bom apetite!',
  ],
  // modo offline: cliente pediu pra fechar
  fechando: ['Fechado! {itens}, deu {total}. Já tá indo pra cozinha!', 'Prontinho: {itens}, total de {total}. Mandando pra cozinha!'],

  agradeceu: ['Imagina! Tô aqui pra isso.', 'Por nada!'],
  cumprimentou: ['Tudo certo por aqui! Me fala o que você tá com vontade de comer.', 'Tudo ótimo! O que vai ser hoje?'],
  cocegas: ['Hihi! Isso faz cócegas!', 'Ei! Minha tela é sensível, tá?', 'Tô aqui, tô aqui!'],

  // balões quando ele espia na tela de espera (não fala, só aparece escrito)
  espiando: ['Psiu! Tô aqui!', 'Tá com fome? 👀', 'Toca na tela que eu te atendo!', 'Hoje tem {destaque}!', 'Achou que eu não tava vendo? 😄'],

  // pedido não entrou no painel
  lojaFechada: ['Eita, a loja tá fechada agora, então não consigo mandar o pedido pra cozinha. Fala com alguém no balcão, beleza?'],
  erroEnvio: ['Ih, me enrolei pra mandar o pedido pra cozinha. Pode tentar confirmar de novo? Se não der, fala com alguém no balcão.'],
  // cliente trocou o idioma no meio do atendimento
  trocouIdioma: ['Beleza, vamos em português! O que você vai querer?'],
};

/* As mesmas falas em inglês e espanhol (atendimento de estrangeiros). Chave que não estiver aqui usa a de português. */
window.FRASES_IDIOMA = {
  en: {
    boasVindas: ['Welcome {aoLoja}! I\'m Live. What\'s your name?', 'Hi, welcome {aoLoja}! I\'m Live. May I have your name?'],
    prazer: ['Nice to meet you, {nome}! What would you like today?', 'Great, {nome}! Go ahead and order whenever you\'re ready.'],
    fechamento: [
      'Order confirmed{nome}! Your number is {numero}, total {total}. Please pay at the cashier and pick it up at the counter. Enjoy your meal!',
      'All set{nome}! Order number {numero}, total {total}. Just pay at the cashier and pick it up at the counter. Enjoy!',
    ],
    cocegas: ['Hehe, that tickles!', 'Hey! My screen is sensitive!'],
    lojaFechada: ['Oh no, the restaurant is closed right now, so I can\'t send your order to the kitchen. Please talk to someone at the counter.'],
    erroEnvio: ['Oops, I couldn\'t send your order to the kitchen. Could you confirm it again? If it doesn\'t work, please ask at the counter.'],
    trocouIdioma: ['Sure, let\'s continue in English! What would you like?'],
  },
  es: {
    boasVindas: ['¡Bienvenido {aoLoja}! Soy Live. ¿Cómo te llamas?', '¡Hola, bienvenido {aoLoja}! Soy Live. ¿Me dices tu nombre?'],
    prazer: ['¡Mucho gusto, {nome}! ¿Qué te gustaría pedir hoy?', '¡Genial, {nome}! Puedes hacer tu pedido cuando quieras.'],
    fechamento: [
      '¡Pedido confirmado{nome}! Tu número es el {numero}, total {total}. Paga en la caja y retíralo en el mostrador. ¡Buen provecho!',
      '¡Listo{nome}! Pedido número {numero}, total {total}. Solo paga en la caja y retíralo en el mostrador. ¡Que lo disfrutes!',
    ],
    cocegas: ['¡Jeje, eso da cosquillas!', '¡Oye! ¡Mi pantalla es sensible!'],
    lojaFechada: ['Uy, el restaurante está cerrado ahora y no puedo enviar tu pedido a la cocina. Habla con alguien en el mostrador, por favor.'],
    erroEnvio: ['Uy, no pude enviar tu pedido a la cocina. ¿Puedes confirmarlo de nuevo? Si no funciona, pregunta en el mostrador.'],
    trocouIdioma: ['¡Claro, sigamos en español! ¿Qué te gustaría?'],
  },
};
/* (137) LOJA QUE NÃO É RESTAURANTE (farmácia, mercado, pet...): troca as falas de comida. Chave que não estiver aqui usa a normal. */
window.FRASES_LOJA = {
  prazer: ['Prazer, {nome}! O que você está procurando hoje?', 'Que bom te ver, {nome}! Do que você precisa?', 'Beleza, {nome}! Me fala o que você procura.'],
  adicionou: ['Anotado: {itens}!', 'Pronto, {itens} no pedido.', 'Coloquei {itens}.', '{itens}, já tá anotado.'],
  naoTemos: ['Esse eu não tenho aqui… Posso ver outra coisa pra você?', 'Esse não tem no momento. Quer que eu procure algo parecido?'],
  sugestao: ['Um dos mais procurados é o {item}, por {preco}. Quer?', 'O {item} sai bastante, por {preco}. Vai querer?'],
  cardapio: ['Tem {categorias}. O que você procura?', 'A gente tem {categorias}. Me fala do que você precisa.'],
  pedidoVazio: ['Seu pedido ainda tá vazio! Me fala o que você procura.', 'Ainda não tem nada no pedido. Do que você precisa?'],
  confirmado: ['Pedido confirmado! Já tô mandando pra equipe separar.', 'Perfeito, pedido confirmado!'],
  cancelado: ['Tranquilo, cancelei tudo! Quando precisar, é só me chamar.'],
  despedida: ['Obrigado pela preferência!', 'Valeu, até a próxima!'],
  fechamento: [
    'Pedido confirmado{nome}! Seu número é o {numero}, deu {total}. Paga no caixa e retira no balcão. Obrigado!',
    'Prontinho{nome}! Pedido número {numero}, total de {total}. É só pagar no caixa e retirar no balcão. Até a próxima!',
  ],
  fechando: ['Fechado! {itens}, deu {total}. Já tá indo pra equipe separar!', 'Prontinho: {itens}, total de {total}.'],
  cumprimentou: ['Tudo certo por aqui! Me fala o que você procura.', 'Tudo ótimo! Do que você precisa hoje?'],
  espiando: ['Psiu! Tô aqui!', 'Precisa de alguma coisa? 👀', 'Toca na tela que eu te atendo!', 'Hoje tem {destaque}!', 'Achou que eu não tava vendo? 😄'],
  lojaFechada: ['Eita, a loja tá fechada agora, então não consigo mandar o pedido. Fala com alguém no balcão, beleza?'],
  erroEnvio: ['Ih, me enrolei pra mandar o pedido. Pode tentar confirmar de novo? Se não der, fala com alguém no balcão.'],
  sugerirBatataERefri: [''], sugerirRefri: [''], sugerirBatata: [''],
};
window.IDIOMA_ATUAL = 'pt';

/* Sorteia uma frase da lista, sem repetir a última usada, e troca os marcadores. */
window.Frase = (function () {
  const ultimas = {};
  // marcadores que vêm da loja ligada ao totem
  const BRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  function padrao(k) {
    const M = window.LIVEFOOD;
    const d = M.itens.find((i) => i.destaque) || M.itens[0];
    if (k === 'loja') return M.loja;
    // "ao Restaurante Cinquenta", "ao Trilhos", "à Pizzaria Bella" (nome que começa com palavra feminina leva "à")
    if (k === 'aoLoja') {
      if (window.IDIOMA_ATUAL === 'en') return 'to ' + M.loja.trim();
      if (window.IDIOMA_ATUAL === 'es') return 'a ' + M.loja.trim();
      const fem = /^(a |pizzaria|lanchonete|hamburgueria|churrascaria|padaria|confeitaria|doceria|sorveteria|pastelaria|cantina|casa|cervejaria|choperia|cafeteria|creperia|esfiharia|tapiocaria|taberna|tasca|adega|cozinha|livefood|cia|companhia|vila|praça|estação|toca|barraca|peixaria|petiscaria|temakeria|sushiteria)\b/i;
      return (fem.test(M.loja.trim()) ? 'à ' : 'ao ') + M.loja.trim().replace(/^(o|a) /i, '');
    }
    if (k === 'destaque') return d.nome;
    if (k === 'destaquePreco') return BRL(d.preco);
    if (k === 'categorias') {
      const n = M.categorias.filter((c) => M.itens.some((i) => i.categoria === c.id)).slice(0, 5).map((c) => c.nome.toLowerCase());
      return n.length > 1 ? n.slice(0, -1).join(', ') + ' e ' + n.at(-1) : n[0] || 'muita coisa boa';
    }
    return null;
  }
  return function (chave, vars = {}) {
    const doIdioma = (window.FRASES_IDIOMA[window.IDIOMA_ATUAL] || {})[chave]; // inglês/espanhol, se tiver
    const daLoja = window.LIVEFOOD && window.LIVEFOOD.ehRest === false && window.IDIOMA_ATUAL === 'pt' ? window.FRASES_LOJA[chave] : null; // (137)
    const lista = (daLoja || doIdioma || window.FRASES[chave] || ['']).slice();
    let opcoes = lista.length > 1 ? lista.filter((f) => f !== ultimas[chave]) : lista;
    const escolhida = opcoes[Math.floor(Math.random() * opcoes.length)];
    ultimas[chave] = escolhida;
    return escolhida.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : padrao(k) != null ? padrao(k) : m)).trim();
  };
})();
