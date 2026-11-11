# LiveFood Intelligence — protótipo funcional

Central inteligente de compras, estoque, produção e gestão (padaria + restaurante + sushi, multi-CNPJ).
**Protótipo de interface**: dados fictícios, nenhuma integração externa (WhatsApp, SEFAZ, balança e fornecedores são simulados).

Abrir: `intelligence.html` (atalho no `hub.html`). Sem build: HTML + JS puro, como o resto do LiveFood.

## Arquivos

| Arquivo | Papel |
|---|---|
| `intelligence.html` | Casca: topo (busca, seletor de CNPJ, hub), menu lateral, carrega os scripts |
| `intelligence/intel.css` | Estilos. Mesmos tokens do `painel.html` (Manrope, `#FF5A00`, cartões brancos) |
| `intelligence/dados.js` | `LFI.criarBase()` — base fictícia coerente (datas relativas a hoje) |
| `intelligence/nucleo.js` | Armazenamento (localStorage), consultas e **regras de negócio** compartilhadas |
| `intelligence/ui.js` | Ícones, selos, modal, toast, tabela, gráficos SVG, rotas, menu, multi-CNPJ, busca |
| `intelligence/telas/*.js` | Uma tela por arquivo, registrada com `LFI.registrar(id, {titulo, render})` |

## Regras de ouro

1. **Toda alteração passa pelo núcleo** (`LFI.movimentar`, `LFI.lancarNota`, `LFI.criarCotacao`, `LFI.criarOrdem`, `LFI.notaDaOrdem`…) ou altera `LFI.db` e chama `LFI.salvar()`. Assim estoque, custos, receitas e indicadores refletem a ação em todas as telas.
2. **Multi-CNPJ**: respeitar o seletor do topo. Use `LFI.depIds()`, `LFI.depVisivel(dep)`, `LFI.empresaVisivel(emp)`, `LFI.empresaAtual()` (null = consolidado).
3. **Tributos não são inventados**: valores vêm das notas (destacados) ou das regras cadastradas em `db.regrasTrib` (com status validada/pendente/em_revisão). Pendentes não entram na estimativa.
4. Nada de telas vazias, nada de identidade visual própria: reutilizar as classes de `intel.css`.

## Rotas

`#/tela` ou `#/tela/argumento` → `LFI.ir('estoque','p39')`. Em HTML: `data-act="_ir" data-id="estoque/p39"` (com `UI.navHandlers`).

| Tela | Argumento |
|---|---|
| `visao` | — |
| `notas` | id da nota → conferência / detalhe |
| `estoque` | id do produto → ficha do produto |
| `compras` | id da cotação → detalhe / comparador |
| `ordens` | id da OC |
| `fornecedores` | id do fornecedor |
| `receitas` | id da receita |
| `producao` | id da OP |
| `buffet` | id do buffet |
| `custos` | — |
| `tributos` | — (lê `LFI.estado.tributos.cat` para pré-selecionar categoria) |
| `relatorios` | id do relatório (ex.: `perdas`) |

## Padrão de tela

```js
(function(){
var LFI=window.LFI, UI=LFI.ui, F=LFI.fmt, esc=UI.esc;
function st(){ return LFI.estado.minha = LFI.estado.minha || {aba:'a'}; }
function render(el, arg){
  el.innerHTML = UI.cabecalho({titulo:'…', sub:'…', acoes:'<button class="btn pri" data-act="novo">…</button>'}) + '…';
  UI.tabela(el.querySelector('#t'), {colunas:[…], linhas:[…], linhaAct:'abrir'});
  UI.liga(el, UI.navHandlers({ novo:function(){…}, abrir:function(id){ LFI.ir('minha', id); } }));
}
LFI.registrar('minha', {titulo:'…', render:render});
})();
```

`LFI.recarregar()` redesenha a tela atual mantendo a rolagem (use após uma ação). Ver `telas/visao.js` como referência completa.

## Fluxos simulados

- **Nota fiscal**: upload XML/PDF → leitura simulada → conferência (correspondência de produtos com nota de confiança, fator de conversão, impostos destacados) → `LFI.lancarNota` (estoque, custo médio, último custo, receitas recalculadas, contas a pagar, OC vinculada).
- **Compras**: foto da lista / texto / seleção → `LFI.lerLista` → cotação → envio simulado por WhatsApp → propostas (PDF, Excel, mensagem) → conferência → comparador ponderado (preço, prazo, disponibilidade, qualidade, condição) → OCs por fornecedor agrupadas numa compra consolidada.
- **Ordens**: aprovação → envio → entrega parcial/total → `LFI.notaDaOrdem` gera a NF para conferência.
- **Produção**: OP calcula ingredientes pela ficha técnica, aponta faltas (gera cotação), baixa insumos e dá entrada no produto acabado.
- **Buffet**: abertura com pesagem (balança simulada) → acompanhamento → encerramento com peso, temperatura, horário, responsável, condição e destino; sobra só entra no estoque se atender às regras de conservação (`db.regrasSobra`).

## Pendências para a fase de integrações

Funcionalidades já desenhadas no protótipo (com envio/leitura simulados) que precisam funcionar de verdade:

1. **Resumo diário por WhatsApp (Visão Geral → Compartilhar)**: contatos (nome e telefone), horário e envio automático diário ficam em `db.compartilhar`. Falta o agendador (todo dia no horário escolhido, padrão 7h, com o resumo do dia anterior) e o envio real pelo WhatsApp. Combinado com o cliente para fazer depois da revisão de todas as telas.
2. **Notificar fornecedor (Fiscal → item em Revisão)**: envio real por WhatsApp e e-mail, com as fotos anexadas.
3. **Leitura de fotos**: etiqueta do item (código de barras e validade) e nota fiscal fotografada (várias páginas). Hoje a leitura é simulada.
4. **Armazenamento das fotos no servidor** (hoje ficam no navegador).

## Tarefa registrada: estoque do LivePro alimenta o LiveFood
Quando o cliente usa o LivePro, as **quantidades de estoque** do LivePro passam a alimentar o LiveFood
(o LiveFood não tem estoque próprio). Ideias para a implementação:
- cada produto vendido no LiveFood (cardápio) ligado ao produto do LivePro;
- a venda no LiveFood dá baixa no estoque do LivePro (pela receita, quando houver);
- o LiveFood mostra "esgotado" quando o estoque do LivePro zera.

## Fluxo de caixa no LivePro (flag por conta)
- Admin master → conta → "Fluxo de caixa no LivePro": o fluxo passa a ser usado no LivePro e some do Financeiro do painel.
- Na primeira vez, o botão "Trazer lançamentos do LiveFood" copia os lançamentos do painel (bloco `extrato`).
- Sem Pix/Asaas aqui: só lançamento manual e marcar como pago/recebido.
