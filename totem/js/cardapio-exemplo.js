/* Cardápio de exemplo: usado quando o totem ainda não foi ligado a uma loja do LiveFood
   (ou quando a loja não carrega e não há cópia salva). */
window.CARDAPIO_EXEMPLO = {
  loja: 'LiveFood',

  categorias: [
    { id: 'combos', nome: 'Combos' },
    { id: 'lanches', nome: 'Lanches' },
    { id: 'acompanhamentos', nome: 'Acompanhamentos' },
    { id: 'bebidas', nome: 'Bebidas' },
    { id: 'sobremesas', nome: 'Sobremesas' },
  ],

  // icone = desenho que aparece na tela do rosto do Live; emoji = ícone no cardápio
  itens: [
    { id: 'combo-live', categoria: 'combos', nome: 'Combo Live', preco: 39.9, descricao: 'X-Live Burger + Batata Frita P + Refrigerante Lata', icone: 'hamburguer', emoji: '🍔', destaque: true,
      apelidos: ['combo live', 'combo do live', 'combo'] },
    { id: 'combo-smash', categoria: 'combos', nome: 'Combo Smash Duplo', preco: 44.9, descricao: 'Smash Duplo + Batata Frita P + Refrigerante Lata', icone: 'hamburguer', emoji: '🍔',
      apelidos: ['combo smash', 'combo smash duplo', 'combo duplo'] },

    { id: 'x-live', categoria: 'lanches', nome: 'X-Live Burger', preco: 29.9, descricao: 'Blend 160g, cheddar, alface, tomate e molho da casa', icone: 'hamburguer', emoji: '🍔', destaque: true,
      apelidos: ['x live', 'xlive', 'live burger', 'x live burger'] },
    { id: 'x-bacon', categoria: 'lanches', nome: 'X-Bacon Crocante', preco: 32.9, descricao: 'Blend 160g, muito bacon crocante e cheddar', icone: 'hamburguer', emoji: '🥓',
      apelidos: ['x bacon', 'xbacon', 'bacon', 'x bacon crocante'] },
    { id: 'smash-duplo', categoria: 'lanches', nome: 'Smash Duplo', preco: 34.9, descricao: 'Dois smash de 90g, queijo prato duplo e cebola caramelizada', icone: 'hamburguer', emoji: '🍔', destaque: true,
      apelidos: ['smash', 'smash duplo', 'duplo'] },
    { id: 'frango-crispy', categoria: 'lanches', nome: 'Frango Crispy', preco: 27.9, descricao: 'Sobrecoxa empanada crocante, maionese de ervas e alface', icone: 'hamburguer', emoji: '🍗',
      apelidos: ['frango', 'crispy', 'frango crispy', 'lanche de frango'] },
    { id: 'veggie-live', categoria: 'lanches', nome: 'Veggie Live', preco: 28.9, descricao: 'Burger de grão-de-bico, queijo, rúcula e tomate (vegetariano)', icone: 'hamburguer', emoji: '🥬',
      apelidos: ['veggie', 'veggie live', 'vegetariano', 'grao de bico'] },

    { id: 'batata-p', categoria: 'acompanhamentos', nome: 'Batata Frita P', preco: 12.9, descricao: 'Porção pequena, sequinha e crocante', icone: 'batata', emoji: '🍟',
      apelidos: ['batata p', 'batata pequena', 'batata frita pequena', 'fritas pequena', 'batata frita p', 'batata', 'batata frita', 'fritas', 'batatinha'] },
    { id: 'batata-g', categoria: 'acompanhamentos', nome: 'Batata Frita G', preco: 18.9, descricao: 'Porção grande pra dividir (ou não)', icone: 'batata', emoji: '🍟',
      apelidos: ['batata g', 'batata grande', 'batata frita grande', 'fritas grande', 'batata frita g'] },
    { id: 'onion-rings', categoria: 'acompanhamentos', nome: 'Onion Rings', preco: 16.9, descricao: 'Anéis de cebola empanados', icone: 'batata', emoji: '🧅',
      apelidos: ['onion rings', 'onion', 'aneis de cebola', 'cebola empanada'] },
    { id: 'nuggets', categoria: 'acompanhamentos', nome: 'Nuggets (6 un.)', preco: 15.9, descricao: '6 nuggets de frango com molho barbecue', icone: 'batata', emoji: '🍗',
      apelidos: ['nuggets', 'nugget', 'naguete', 'naguetes'] },

    { id: 'refri-lata', categoria: 'bebidas', nome: 'Refrigerante Lata', preco: 6.9, descricao: 'Coca-Cola, Guaraná ou Sprite (350ml)', icone: 'bebida', emoji: '🥤',
      apelidos: ['refrigerante', 'refri', 'coca', 'coca cola', 'guarana', 'sprite', 'lata', 'refrigerante lata'] },
    { id: 'suco-laranja', categoria: 'bebidas', nome: 'Suco de Laranja', preco: 9.9, descricao: 'Natural, 400ml', icone: 'bebida', emoji: '🍊',
      apelidos: ['suco', 'suco de laranja', 'suco natural'] },
    { id: 'agua', categoria: 'bebidas', nome: 'Água Mineral', preco: 4.5, descricao: 'Sem gás, 500ml', icone: 'bebida', emoji: '💧',
      apelidos: ['agua', 'agua mineral', 'aguinha'] },
    { id: 'milkshake', categoria: 'bebidas', nome: 'Milkshake Chocolate', preco: 16.9, descricao: 'Cremoso, 400ml', icone: 'bebida', emoji: '🥤',
      apelidos: ['milkshake', 'milk shake', 'shake', 'milkshake de chocolate'] },

    { id: 'brownie', categoria: 'sobremesas', nome: 'Brownie com Sorvete', preco: 17.9, descricao: 'Brownie quentinho com bola de baunilha', icone: 'sorvete', emoji: '🍫',
      apelidos: ['brownie', 'brownie com sorvete'] },
    { id: 'casquinha', categoria: 'sobremesas', nome: 'Casquinha', preco: 6.9, descricao: 'Sorvete de baunilha na casquinha', icone: 'sorvete', emoji: '🍦',
      apelidos: ['casquinha', 'sorvete', 'sorvetinho', 'casquinha de sorvete'] },
  ],

  // Pedidos comuns que NÃO estão no cardápio (usados pelo modo offline para responder "não temos")
  naoTemos: ['pizza', 'sushi', 'lasanha', 'acai', 'pastel', 'cerveja', 'chopp', 'hot dog', 'cachorro quente', 'esfiha', 'coxinha',
    'salada', 'cafe', 'tapioca', 'temaki', 'churrasco', 'feijoada', 'vinho', 'whisky', 'caipirinha', 'sanduiche natural', 'pao de queijo'],
};
