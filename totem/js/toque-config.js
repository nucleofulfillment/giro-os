/* Totem de toque — painel de configurações do dono, ao lado da tela real.
   Só é carregado quando existe login do painel neste navegador (js/toque.js), e só aparece se o servidor confirmar
   que quem está logado é o dono DESTA loja (/painel/live-config responde só ao dono). O cliente do totem nunca vê.
   O formulário tem o mesmo visual do painel (campos, caixas de marcar, botão laranja). Cada mudança redesenha o totem
   na hora (window.ToqueCfg); só grava no botão Salvar. Com o painel aberto, nada é enviado para a loja. */
(function () {
  'use strict';
  const M = window.LIVEFOOD, T = window.ToqueCfg;
  if (!M || !T || document.getElementById('tq-painel')) return;
  let jwt = ''; try { jwt = localStorage.getItem('dd_jwt') || ''; } catch (e) { /* ok */ }
  if (!jwt) return;
  const API = M.api, HDR = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt };
  const el = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PADRAO = { ativo: 0, formato: 'v', frase: '', modo: 'ambos', cat: 'esq', capa: 1, topo: 1, rotulo: '', ofs: [], troca: 5, princ: 1, cobrar: 'totem', pg: ['caixa'], ajuda: 1, video: '', cols: 0, pgPos: 'baixo', tktVia: 'maquininha', pedeNome: 0, chBipe: 0, chSom: 1, chVoz: 0, chMin: 10 };
  const LADO = 400;
  let D = null, C = {}, PRODS = [], salvo = '';

  fetch(API + '/painel/live-config', { headers: HDR }).then((r) => r.json()).then((d) => {
    if (!d || !d.ok || d.cli !== M.cli) return; // não é o dono desta loja: o totem segue normal
    D = d; monta();
  }).catch(() => { /* sem resposta: o totem segue normal */ });

  // mesmas cores e medidas do painel (painel.html: .inp, .btn, rótulos e notas)
  const CSS = `
  #tq-painel { position: fixed; left: 0; top: 0; bottom: 0; width: ${LADO}px; z-index: 70; background: #fff; border-right: 1px solid #ECECEF; display: flex; flex-direction: column; font: 500 13.5px/1.4 'Manrope', -apple-system, sans-serif; color: #1C1C1E; box-shadow: 0 10px 26px -10px rgba(22, 22, 26, .14); }
  #tq-painel * { box-sizing: border-box; }
  #tq-painel .tq-cab { flex: none; padding: 16px 20px; border-bottom: 1px solid #ECECEF; }
  #tq-painel .tq-cab b { display: block; font-size: 16px; font-weight: 800; }
  #tq-painel .tq-cab span { font-size: 12px; color: #8E8E93; }
  #tq-form { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 20px 20px; }
  #tq-painel .tq-pe { flex: none; padding: 10px 20px 16px; border-top: 1px solid #ECECEF; }
  #tq-m { font-size: 12.5px; min-height: 18px; margin-bottom: 8px; color: #8E8E93; }
  #tq-painel .tq-acoes { display: flex; gap: 8px; }
  #tq-painel .tq-tit { font-size: 13px; font-weight: 800; margin: 22px 0 0; padding-top: 16px; border-top: 1px solid #ECECEF; }
  #tq-painel .tq-rot { display: block; font-size: 12px; font-weight: 700; color: #5E5E66; margin: 14px 0 6px; }
  #tq-painel .tq-nota { font-size: 12px; color: #8E8E93; margin-top: 4px; line-height: 1.45; }
  #tq-painel .inp { width: 100%; padding: 11px 13px; border-radius: 10px; border: 1.5px solid #DFDFE4; background: #FAFAFA; font: 500 13.5px 'Manrope', -apple-system, sans-serif; color: #1C1C1E; }
  #tq-painel .tq-ck { display: flex; gap: 8px; align-items: center; font-size: 13.5px; font-weight: 700; margin-top: 10px; cursor: pointer; }
  #tq-painel .tq-ck.forte { font-size: 14px; font-weight: 800; margin-top: 0; }
  #tq-painel .tq-ck input { width: 18px; height: 18px; flex: none; accent-color: #FF5A00; }
  #tq-painel .btn { border: none; border-radius: 10px; font: 700 13.5px 'Manrope', -apple-system, sans-serif; cursor: pointer; padding: 11px 16px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #F3F3F5; color: #1C1C1E; border: 1px solid #DFDFE4; }
  #tq-painel .btn.pri { background: #FF5A00; color: #fff; border-color: #FF5A00; flex: 1; }
  #tq-painel .btn:disabled { opacity: .6; }
  #tq-painel .btn:focus-visible, #tq-painel .inp:focus-visible { outline: 2px solid #1C1C1E; outline-offset: 2px; }
  #tq-ofs { max-height: 190px; overflow-y: auto; border: 1px solid #DFDFE4; border-radius: 10px; padding: 6px 10px; }
  #tq-ofs label { display: flex; gap: 8px; align-items: center; font-size: 13px; padding: 5px 0; cursor: pointer; }
  #tq-ofs input { width: 16px; height: 16px; flex: none; accent-color: #FF5A00; }
  #tq-ofs small { color: #8E8E93; font-size: 11.5px; }
  #tq-volta { display: none; position: fixed; left: 10px; top: 10px; z-index: 71; }
  body.tq-aberto { background: #D9D9DE; }
  /* tela estreita (o painel aberto no celular): as configurações ocupam a tela e um botão alterna com o totem */
  @media (max-width: 899px) { #tq-painel { width: 100%; border-right: 0; } body.tq-ver-totem #tq-painel { display: none; } body.tq-ver-totem #tq-volta { display: inline-flex; } #tq-alterna { display: inline-flex !important; } }
  `;

  function monta() {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const a = document.createElement('aside'); a.id = 'tq-painel';
    a.innerHTML = `<div class="tq-cab"><b>Totem de toque</b><span>Configurações. Só você vê este painel, por estar logado como dono.</span></div>
      <div id="tq-form"></div>
      <div class="tq-pe"><div id="tq-m" role="status"></div><div class="tq-acoes"><button type="button" class="btn" id="tq-ocultar">Ocultar</button><button type="button" class="btn" id="tq-alterna" style="display:none">Ver o totem</button><button type="button" class="btn pri" id="tq-salvar">Salvar</button></div></div>`;
    document.body.appendChild(a);
    const v = document.createElement('button'); v.type = 'button'; v.id = 'tq-volta'; v.className = 'btn'; v.textContent = 'Configurações'; a.after(v);
    v.style.cssText = 'border:1px solid #DFDFE4;border-radius:10px;background:#fff;font:700 13.5px Manrope,sans-serif;padding:10px 14px;cursor:pointer';
    const c = (D.cfg && D.cfg.toque) || {};
    for (const k in PADRAO) C[k] = (c[k] === undefined || c[k] === null) ? PADRAO[k] : c[k];
    C.ofs = (C.ofs || []).slice(); C.pg = (C.pg || ['caixa']).slice();
    salvo = JSON.stringify(C);
    PRODS = T.produtos().sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'));
    document.body.classList.add('tq-aberto');
    largura();
    T.editar(true); T.aplica(C);
    form();
    a.addEventListener('click', toque);
    a.addEventListener('change', mudouCampo);
    a.addEventListener('input', texto);
    v.addEventListener('click', () => document.body.classList.remove('tq-ver-totem'));
    addEventListener('resize', largura);
  }
  // o totem encolhe para caber ao lado do painel (só em tela larga)
  function largura() { window.TOQUE_LADO = innerWidth >= 900 ? LADO : 0; if (window.ajustarEscalaToque) window.ajustarEscalaToque(); }

  const rot = (tx) => `<label class="tq-rot">${tx}</label>`, nota = (tx) => `<div class="tq-nota">${tx}</div>`, tit = (tx) => `<div class="tq-tit">${tx}</div>`;
  const sel = (k, ops) => `<select class="inp" data-sel="${k}">` + ops.map((o) => `<option value="${o[0]}"${String(o[0]) === String(C[k]) ? ' selected' : ''}>${esc(o[1])}</option>`).join('') + '</select>';
  const chk = (k, tx, forte) => `<label class="tq-ck${forte ? ' forte' : ''}"><input type="checkbox" data-ck="${k}"${C[k] ? ' checked' : ''}> ${tx}</label>`;
  const chkPg = (v, tx) => `<label class="tq-ck"><input type="checkbox" data-pg="${v}"${C.pg.indexOf(v) >= 0 ? ' checked' : ''}> ${tx}</label>`;

  function form() {
    const f = el('tq-form'), rol = f.scrollTop, li0 = el('tq-ofs'), rolL = li0 ? li0.scrollTop : 0;
    const link = 'https://livefood.tec.br/totem/toque.html?loja=' + encodeURIComponent(D.cli) + '&k=' + encodeURIComponent(D.chave);
    f.innerHTML = (D.cfg && D.cfg.toque ? '' : '<div style="background:#FEF3C7;color:#92400E;border-radius:10px;padding:10px 12px;font-size:12.5px;margin-bottom:12px">O servidor ainda não conhece o Totem de toque. Publique o Worker 296 (ou mais novo) para conseguir salvar.</div>')
      + chk('ativo', 'Totem de toque ligado nesta loja', true)
      + nota('Desligado = modo teste: a tela abre com o cardápio, mas os pedidos não vão para a cozinha.')
      + tit('Tela')
      + rot('Formato da tela') + sel('formato', [['v', 'Em pé (vertical)'], ['h', 'Deitada (horizontal)']])
      + rot('Frase da tela de entrada')
      + `<input class="inp" data-tx="frase" maxlength="40" list="tq-frases" placeholder="em branco = Bateu a fome?" value="${esc(C.frase || '')}"><datalist id="tq-frases"><option value="Bateu a fome?"><option value="Bateu a sede?"><option value="O que vai beber hoje?"><option value="Faça seu pedido aqui"></datalist>`
      + nota('Escolha uma sugestão ou escreva a sua (até 40 letras).')
      + rot('Tipo de pedido') + sel('modo', [['ambos', 'O cliente escolhe: consumir aqui ou levar'], ['aqui', 'Só consumir aqui'], ['levar', 'Só para levar']])
      + rot('Categorias') + sel('cat', [['esq', 'Na esquerda'], ['topo', 'No topo (4 por linha)'], ['dir', 'Na direita'], ['nao', 'Não mostrar (só os produtos)']])
      + rot('Produtos por linha') + sel('cols', [['0', 'Automático (pela posição das categorias)'], ['2', '2 por linha (cartões maiores)'], ['3', '3 por linha (mais produtos na tela)']])
      + nota('Na tela deitada, 2 e 3 viram 4 e 5 por linha.')
      + chk('ajuda', 'Mostrar o Live com o botão “Precisa de ajuda?”')
      + rot('Vídeo de fundo da entrada')
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
        + `<label class="btn" style="cursor:pointer">${C.video ? 'Trocar vídeo' : 'Escolher vídeo'}<input type="file" id="tq-vid-arq" accept="video/mp4,video/webm,video/quicktime" hidden></label>`
        + (C.video ? '<button type="button" class="btn" id="tq-vid-tira">Remover vídeo</button><span style="font-size:12.5px;font-weight:700;color:#16A34A">Vídeo no fundo da entrada.</span>' : '')
      + '</div>'
      + nota('MP4, WebM ou MOV, até 90 MB. Roda sem som e em repetição atrás da tela de entrada; a frase fica branca por cima. Um vídeo curto (10 a 20 segundos), no mesmo formato da tela, fica melhor. Só vale depois de Salvar.')
      + tit('Ofertas')
      + chk('capa', 'Banner de ofertas na tela de entrada')
      + chk('topo', 'Banner de ofertas no topo do cardápio')
      + rot('Título do banner') + `<input class="inp" data-tx="rotulo" maxlength="30" placeholder="em branco = Oferta de hoje" value="${esc(C.rotulo || '')}">`
      + rot('Produtos do banner')
      + '<div id="tq-ofs">' + (PRODS.length ? PRODS.map((p) => `<label><input type="checkbox" data-of="${esc(p.id)}"${C.ofs.indexOf(p.id) >= 0 ? ' checked' : ''}> ${esc(p.nome)}${p.promo ? ' <small>(em promoção)</small>' : ''}</label>`).join('') : '<div class="tq-nota" style="padding:6px 0">A loja ainda não tem produtos no cardápio.</div>') + '</div>'
      + nota('Marque até 12. Com mais de um, o banner vira carrossel. Sem nenhum marcado, entram os produtos em promoção.')
      + rot('Trocar de oferta a cada (segundos)') + `<input class="inp" data-tx="troca" type="number" min="2" max="60" value="${C.troca || 5}" style="width:110px">`
      + chk('princ', 'Categoria “Ofertas” em primeiro (produtos em promoção)')
      + tit('Cobrança')
      + '<div style="margin-top:12px">' + sel('cobrar', [['totem', 'Cobrar no totem: o cliente escolhe a forma de pagamento'], ['direto', 'Enviar direto: sem pagamento na tela, vai para a cozinha e o bar']]) + '</div>'
      + (C.cobrar === 'totem'
        ? chkPg('caixa', 'Pagar no caixa') + chkPg('pix', 'Pix, com QR Code na tela do totem') + chkPg('credito', 'Cartão de crédito, na maquininha do totem') + chkPg('debito', 'Cartão de débito, na maquininha do totem')
          + nota('O Pix usa a conta de pagamento do cardápio da loja e é confirmado sozinho. Com a Payer ligada para a loja (Admin), o cartão é cobrado na maquininha do totem e o pedido só entra depois de aprovado. Sem ela, no crédito e no débito o pedido entra na cozinha com a forma anotada e a equipe confere o pagamento.')
        : '')
      + nota('No tablet de mesa o pedido sempre entra na conta da mesa, sem cobrança na tela.')
      + tit('Impressão no totem')
      + rot('Onde imprime o ticket do cliente') + sel('tktVia', [['maquininha', 'Na impressora da maquininha ou do totem (Payer)'], ['loja', 'Na impressora da loja (programa de impressão, setor Caixa)']])
      + nota('No setor Caixa o ticket sai na mesma impressora da cozinha, a não ser que no instalador do programa de impressão você aponte o Caixa para outra impressora: no teste use a mesma e, em produção, separe rodando o instalador de novo. Com a impressora da loja, o ticket sai também nos pedidos pagos no Pix e no caixa. O programa de impressão precisa estar na versão nova: baixe e rode o instalador de novo.')
      + nota('Todo pedido pago no cartão sai com o TICKET DO CLIENTE no totem, com a senha. Se o pedido tem item de preparo, a comanda também sai na cozinha ou no bar, com a mesma senha: quando o pedido fica pronto, o operador confere a comanda com o ticket do cliente. Se o pedido é só de produto pronto, não sai comanda: o cliente entrega o ticket no balcão e retira.')
      + nota('Dividir“Dividir a impressão do bar” e marque “preparo” nas categorias de bebida feita na hora (caipirinha, chope, drink). Sem isso, tudo é tratado como preparo e a cozinha e o bar imprimem todo pedido, como antes.')
      + chk('pedeNome', 'Pedir o nome do cliente ao finalizar o pedido')
      + nota('O cliente digita o nome num teclado na tela antes de enviar. O nome vai no pedido e na observação (sai na comanda) e aparece junto da senha. No tablet de mesa o nome não é pedido.')
      + rot('Onde ficam o pagamento e o botão de confirmar') + sel('pgPos', [['baixo', 'Embaixo da lista de itens do pedido'], ['topo', 'Acima da lista de itens do pedido']])
      + nota('Vale para a tela “Seu pedido”. Para ver na prévia, adicione um produto e toque em Ver pedido.')
      + tit('Tela de chamada')
      + nota('Uma TV no salão, deitada, com a fila de preparo de um lado e os pedidos prontos do outro. Entram os pedidos de retirada (balcão e totem). Quando o pedido fica pronto, a tela inteira chama o número e o nome.')
      + chk('chBipe', 'No Preparo, bipar ou digitar o número marca o pedido como pronto')
      + nota('O operador bipa a comanda (ou digita o número) no campo de busca do Preparo e aperta Enter. Desligado, o pedido fica pronto só pelo botão do Preparo.')
      + chk('chSom', 'Tocar o aviso sonoro na chamada')
      + chk('chVoz', 'Chamar em voz alta (“Pedido 128, Ana”)')
      + rot('Tempo que o pedido pronto fica na tela (minutos)') + `<input class="inp" data-tx="chMin" type="number" min="2" max="60" value="${C.chMin || 10}" style="width:110px">`
      + rot('Link da tela de chamada desta loja')
      + `<div style="display:flex;gap:8px"><input class="inp" id="tq-link2" readonly value="${esc(link.replace('toque.html', 'chamada.html'))}" style="flex:1;font-size:12px"><button type="button" class="btn" data-copia="tq-link2">Copiar</button></div>`
      + nota('Abra no navegador da TV, em tela cheia, e toque uma vez na tela para liberar o som. Só mostra os pedidos; não muda nada.')
      + tit('Link')
      + rot('Link do totem de toque desta loja')
      + `<div style="display:flex;gap:8px"><input class="inp" id="tq-link" readonly value="${esc(link)}" style="flex:1;font-size:12px"><button type="button" class="btn" data-copia="tq-link">Copiar</button></div>`
      + nota('Abra no navegador do totem, em tela cheia. Para tablet de mesa, acrescente <b>&amp;mesa=12</b> no fim do link (troque 12 pelo número da mesa). Não compartilhe o link.')
      + nota('No aparelho do totem não fique logado no painel: com o login do dono, estas configurações aparecem. Se aparecerem lá, toque em Ocultar.');
    f.scrollTop = rol; const li = el('tq-ofs'); if (li) li.scrollTop = rolL;
  }
  function diz(tx, cor) { const m = el('tq-m'); m.textContent = tx || ''; m.style.color = cor || '#8E8E93'; }
  function mudou() { T.aplica(C); diz(JSON.stringify(C) === salvo ? '' : 'Mudanças ainda não salvas.'); }

  // envia o vídeo de fundo para o mesmo armazenamento dos vídeos das ofertas (/painel/video-upload) e mostra o andamento
  function enviaVideo(arq) {
    if (!arq) return;
    const tipo = arq.type || 'video/mp4';
    if (!/^video\/(mp4|webm|quicktime)$/.test(tipo)) { diz('Envie um vídeo MP4, WebM ou MOV.', '#DC2626'); return; }
    if (arq.size > 90000000) { diz('Vídeo grande demais (máximo 90 MB). Use um vídeo mais curto.', '#DC2626'); return; }
    const x = new XMLHttpRequest();
    x.open('POST', API + '/painel/video-upload');
    x.setRequestHeader('Authorization', 'Bearer ' + jwt); x.setRequestHeader('Content-Type', tipo);
    x.upload.onprogress = (e) => { if (e.lengthComputable) diz('Enviando o vídeo… ' + Math.round(e.loaded / e.total * 100) + '%'); };
    x.onerror = () => diz('Não consegui enviar o vídeo. Confira a internet e tente de novo.', '#DC2626');
    x.onload = () => {
      let j = {}; try { j = JSON.parse(x.responseText); } catch (e) { /* resposta inesperada */ }
      if (!j.ok || !j.vid) { diz(j.mensagem || 'Não consegui enviar o vídeo (' + x.status + ').', '#DC2626'); return; }
      C.video = j.vid; form(); mudou(); diz('Vídeo enviado. Toque em Salvar para valer no totem.', '#16A34A');
    };
    diz('Enviando o vídeo…'); x.send(arq);
  }

  function mudouCampo(ev) {
    const t = ev.target, d = t.dataset || {};
    if (t.id === 'tq-vid-arq') { enviaVideo(t.files && t.files[0]); t.value = ''; return; }
    if (d.sel) { C[d.sel] = d.sel === 'cols' ? (parseInt(t.value, 10) || 0) : t.value; if (d.sel === 'cobrar') form(); }
    else if (d.ck) C[d.ck] = t.checked ? 1 : 0;
    else if (d.pg) { const i = C.pg.indexOf(d.pg); if (t.checked && i < 0) C.pg.push(d.pg); if (!t.checked && i >= 0) C.pg.splice(i, 1); }
    else if (d.of) {
      const i = C.ofs.indexOf(d.of);
      if (t.checked && i < 0) { if (C.ofs.length >= 12) { t.checked = false; diz('O banner aceita até 12 produtos.', '#DC2626'); return; } C.ofs.push(d.of); }
      if (!t.checked && i >= 0) C.ofs.splice(i, 1);
    } else return;
    mudou();
  }
  function texto(ev) {
    const k = ev.target.dataset && ev.target.dataset.tx; if (!k) return;
    C[k] = k === 'troca' ? Math.max(2, Math.min(60, parseInt(ev.target.value, 10) || 5))
      : k === 'chMin' ? Math.max(2, Math.min(60, parseInt(ev.target.value, 10) || 10))
      : String(ev.target.value).slice(0, k === 'frase' ? 40 : 30);
    mudou();
  }
  function toque(ev) {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.id === 'tq-salvar') return salvar();
    if (b.id === 'tq-vid-tira') { C.video = ''; form(); mudou(); return; }
    if (b.dataset.copia) { const i = el(b.dataset.copia); i.select(); (navigator.clipboard ? navigator.clipboard.writeText(i.value) : Promise.reject()).catch(() => document.execCommand('copy')).then(() => diz('Link copiado.', '#16A34A')); return; }
    if (b.id === 'tq-alterna') { document.body.classList.add('tq-ver-totem'); return; }
    if (b.id === 'tq-ocultar') {
      if (JSON.stringify(C) !== salvo && !b.dataset.certeza) { b.dataset.certeza = '1'; b.textContent = 'Ocultar sem salvar'; diz('Há mudanças não salvas. Toque de novo para ocultar sem salvar.', '#DC2626'); return; }
      try { localStorage.setItem('toque-sem-config', '1'); } catch (e) { /* ok */ }
      const u = new URL(location.href); u.searchParams.delete('config'); location.replace(u.toString()); // volta a ser o totem normal; para reabrir: Configurações > Totem de toque no painel
    }
  }
  function salvar() {
    const c = JSON.parse(JSON.stringify(C)); c.frase = String(c.frase || '').trim(); c.rotulo = String(c.rotulo || '').trim();
    if (c.cobrar === 'totem' && !c.pg.length) { diz('Marque pelo menos uma forma de pagamento, ou escolha “Enviar direto”.', '#DC2626'); return; }
    if (!c.pg.length) c.pg = ['caixa'];
    const bt = el('tq-salvar'); bt.disabled = true; diz('Salvando…');
    fetch(API + '/painel/live-config', { method: 'POST', headers: HDR, body: JSON.stringify({ soToque: 1, toque: c }) }).then((r) => r.json()).then((d) => {
      if (!d || !d.ok) throw new Error((d && d.mensagem) || 'Não salvou.');
      const g = d.cfg && d.cfg.toque;
      if (!g) throw new Error('O servidor ainda não grava o Totem de toque. Publique o Worker 296 e salve de novo.');
      if (c.pg.some((x) => (x === 'credito' || x === 'debito') && g.pg.indexOf(x) < 0)) throw new Error('Salvei, mas o servidor ainda não aceita cartão no totem. Publique o Worker 296 e salve de novo.');
      if (c.chBipe && !g.chBipe) throw new Error('Salvei, mas o servidor ainda não guarda as opções da tela de chamada. Publique o Worker 301 e salve de novo.');
      if (c.tktVia === 'loja' && g.tktVia !== 'loja') throw new Error('Salvei, mas o servidor ainda não guarda onde imprimir o ticket. Publique o Worker 309 e salve de novo.');
      if (c.pedeNome && !g.pedeNome) throw new Error('Salvei, mas o servidor ainda não guarda a opção de pedir o nome. Publique o Worker 300 e salve de novo.');
      if (c.pgPos === 'topo' && g.pgPos !== 'topo') throw new Error('Salvei, mas o servidor ainda não guarda a posição do pagamento. Publique o Worker 299 e salve de novo.');
      if (c.cols && !g.cols) throw new Error('Salvei, mas o servidor ainda não guarda os produtos por linha. Publique o Worker 298 e salve de novo.');
      if (c.video && !g.video) throw new Error('Salvei, mas o servidor ainda não guarda o vídeo de fundo. Publique o Worker 297 e salve de novo.');
      D.cfg = d.cfg; salvo = JSON.stringify(C);
      diz(g.ativo ? 'Salvo. Totem de toque ligado.' : 'Salvo. Totem desligado (modo teste).', '#16A34A');
    }).catch((e) => diz(String((e && e.message) || e), '#DC2626')).then(() => { bt.disabled = false; });
  }
})();
