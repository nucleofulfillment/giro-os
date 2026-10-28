/* LiveFood · planos, assinatura e contato.
   Fonte única dos planos: o cadastro do Admin (admin.html → Planos), lido pela rota pública GET /planos do Worker,
   que já devolve só os planos ATIVOS, na ordem definida no admin. Nada de preço escrito aqui.
   Cadastro: o mesmo fluxo do botão "Assinar" do painel (POST /assinar/interesse com senha → conta de teste + login).
   Assinatura paga por Pix (POST /assinar + GET /assinar/status) fica pronta, mas desligada em PIX_ONLINE (ver nota abaixo). */
(function () {
  'use strict';

  const API = 'https://giro-os-api.nucleofull.workers.dev';
  // O /assinar ainda cobra e manda e-mail com o nome "DeltaDis". Ligue quando o Worker estiver com os textos da LiveFood.
  const PIX_ONLINE = false;
  const NO_DOMINIO = /(^|\.)livefood\.tec\.br$/.test(location.hostname);
  const BASE = NO_DOMINIO ? '' : 'https://livefood.tec.br/';
  // ?demo=planos mostra planos de DEMONSTRAÇÃO, identificados, só fora do domínio oficial (desenvolvimento)
  const DEMO = !NO_DOMINIO && new URLSearchParams(location.search).get('demo') === 'planos';
  const PLANOS_DEMO = [
    { id: 'demo1', nome: 'Plano A (demo)', descricao: 'Exemplo de descrição vinda do admin.', fixo_centavos: 9900, pacote_centavos: 0, franquia: 0, variavel_total: 0 },
    { id: 'demo2', nome: 'Plano B (demo)', descricao: 'Exemplo com valor variável cadastrado.', fixo_centavos: 19900, pacote_centavos: 7.5, franquia: 300, variavel_total: 0 },
  ];

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function reais(centavos, casas) {
    const v = (Number(centavos) || 0) / 100;
    const inteiro = Number.isInteger(v);
    return v.toLocaleString('pt-BR', { minimumFractionDigits: casas != null ? casas : (inteiro ? 0 : 2), maximumFractionDigits: casas != null ? casas : 3 });
  }

  async function chamar(caminho, opcoes = {}, ms = 12000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const r = await fetch(API + caminho, { ...opcoes, signal: ctrl.signal, headers: { 'Content-Type': 'application/json', ...(opcoes.headers || {}) } });
      const d = await r.json().catch(() => ({}));
      return { http: r.status, ...d };
    } finally { clearTimeout(t); }
  }

  // ---------------------------------------------------------------------------
  // Modal (assinar / contato)
  // ---------------------------------------------------------------------------
  const modal = $('#modal');
  const conteudo = $('.modal-conteudo', modal);
  let liveModal = null, focoAnterior = null, pollTimer = null;

  function abrirModal(html, expressao = 'animado') {
    focoAnterior = document.activeElement;
    conteudo.innerHTML = html;
    modal.hidden = false;
    document.body.classList.add('travado');
    requestAnimationFrame(() => modal.classList.add('aberta'));
    if (window.LiveMascote) {
      if (liveModal) liveModal.destruir();
      liveModal = LiveMascote.criar($('#modal-live'), { sombra: false, expressao });
      setTimeout(() => liveModal && liveModal.gesto('boas_vindas'), 350);
    }
    setTimeout(() => { const f = $('input, button:not(.fechar)', conteudo); if (f) f.focus(); }, 450);
  }
  function fecharModal() {
    clearInterval(pollTimer);
    modal.classList.remove('aberta');
    document.body.classList.remove('travado');
    setTimeout(() => { modal.hidden = true; conteudo.innerHTML = ''; if (liveModal) { liveModal.destruir(); liveModal = null; } }, 400);
    if (focoAnterior) focoAnterior.focus();
  }
  modal.addEventListener('click', (e) => { if (e.target.closest('[data-fechar]')) fecharModal(); });
  addEventListener('keydown', (e) => {
    if (modal.hidden) return;
    if (e.key === 'Escape') fecharModal();
    if (e.key === 'Tab') { // mantém o foco dentro do modal
      const f = [...modal.querySelectorAll('button, input, a[href]')].filter((x) => !x.disabled && x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  function campo(id, rotulo, extra = '') { return `<div class="campo"><label for="${id}">${rotulo}</label><input id="${id}" ${extra}></div>`; }
  const vale = (id) => ($('#' + id, conteudo) || {}).value || '';
  function mensagem(t, ok) { const m = $('.form-msg', conteudo); if (m) { m.textContent = t || ''; m.classList.toggle('ok', !!ok); } if (!ok && t && liveModal) liveModal.gesto('confuso'); }
  function mascaraFone(el) {
    el.addEventListener('input', () => {
      const d = el.value.replace(/\D/g, '').slice(0, 11);
      el.value = d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
    });
  }
  function validarBasico(d) {
    if (d.empresa.length < 2) return 'Informe o nome do restaurante.';
    if (d.responsavel.length < 2) return 'Informe o seu nome.';
    if (d.whats.replace(/\D/g, '').length < 10) return 'Informe o WhatsApp com DDD.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) return 'Confira o e-mail.';
    return '';
  }
  function ocupado(btn, sim, texto) { btn.disabled = sim; if (texto) btn.innerHTML = texto; }

  // ----- cadastro (conta de teste: mesmo fluxo do painel) -----
  function telaCadastro(plano) {
    const pix = PIX_ONLINE && plano && (plano.fixo_centavos || 0) >= 500;
    return `
      <h2 id="modal-titulo">Vamos começar!</h2>
      <p class="sub">Crie sua conta e já monte o cardápio, tirando foto dele.</p>
      ${plano ? `<div class="resumo-plano"><span>${esc(plano.nome)}</span><span>${plano.fixo_centavos ? 'R$ ' + reais(plano.fixo_centavos) + '/mês' : ''}</span></div>` : ''}
      ${pix ? `<div class="abas" role="tablist"><button type="button" role="tab" aria-selected="true" data-aba="teste">Testar grátis</button><button type="button" role="tab" aria-selected="false" data-aba="pix">Assinar com Pix</button></div>` : ''}
      <form id="form-cadastro" novalidate>
        ${campo('f-emp', 'Nome do restaurante', 'autocomplete="organization" required')}
        ${campo('f-resp', 'Seu nome', 'autocomplete="name" required')}
        <div class="duas">${campo('f-fone', 'WhatsApp (com DDD)', 'inputmode="tel" autocomplete="tel" placeholder="(47) 99999-9999" required')}${campo('f-mail', 'E-mail', 'type="email" autocomplete="email" required')}</div>
        <div data-so="teste">${campo('f-sen', 'Crie uma senha (mín. 8 caracteres)', 'type="password" autocomplete="new-password" minlength="8"')}</div>
        <div data-so="pix" hidden>${campo('f-cnpj', 'CNPJ', 'inputmode="numeric" autocomplete="off" placeholder="00.000.000/0000-00"')}</div>
        <p class="form-msg" role="alert"></p>
        <button class="btn btn-pri" type="submit" id="f-bt">Criar conta e montar cardápio</button>
        <p class="nota">Usamos seus dados só para criar a conta e falar com você sobre ela.</p>
      </form>`;
  }

  function abrirAssinar(plano) {
    abrirModal(telaCadastro(plano));
    let aba = 'teste';
    mascaraFone($('#f-fone', conteudo));
    conteudo.querySelectorAll('[data-aba]').forEach((b) => b.addEventListener('click', () => {
      aba = b.dataset.aba;
      conteudo.querySelectorAll('[data-aba]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      conteudo.querySelectorAll('[data-so]').forEach((x) => { x.hidden = x.dataset.so !== aba; });
      $('#f-bt', conteudo).textContent = aba === 'pix' ? 'Gerar Pix da 1ª mensalidade' : 'Criar conta e montar cardápio';
      mensagem('');
    }));
    $('#form-cadastro', conteudo).addEventListener('submit', (e) => {
      e.preventDefault();
      if (aba === 'pix') enviarPix(plano); else enviarTeste(plano);
    });
  }

  async function enviarTeste(plano) {
    const d = { empresa: vale('f-emp').trim(), responsavel: vale('f-resp').trim(), whats: vale('f-fone').trim(), email: vale('f-mail').trim(), plano: plano ? plano.nome : 'Site', senha: vale('f-sen') };
    const erro = validarBasico(d) || (d.senha.length < 8 ? 'A senha precisa ter pelo menos 8 caracteres.' : '');
    if (erro) return mensagem(erro);
    if (DEMO || (plano && plano.demo)) return mensagem('Modo demonstração: nada foi enviado. Os planos reais vêm do admin.');
    const bt = $('#f-bt', conteudo);
    ocupado(bt, true, 'Criando sua conta…'); mensagem('');
    if (liveModal) liveModal.pensando(true);
    try {
      const r = await chamar('/assinar/interesse', { method: 'POST', body: JSON.stringify(d) });
      if (liveModal) liveModal.pensando(false);
      if (!r.ok) { ocupado(bt, false, 'Criar conta e montar cardápio'); return mensagem(r.mensagem || 'Não consegui criar a conta. Tente de novo.'); }
      if (r.token && NO_DOMINIO) {
        // mesmo login que o painel usa (mesma origem): entra direto na configuração do cardápio
        try { localStorage.setItem('dd_jwt', r.token); localStorage.setItem('dd_user', JSON.stringify(r.usuario || {})); } catch (e2) {}
        sucesso('Conta criada!', 'Abrindo a configuração do seu cardápio…');
        setTimeout(() => { location.href = 'configurar.html'; }, 1400);
        return;
      }
      sucesso('Conta criada!', `Entre no painel com <b>${esc(d.email)}</b> e a senha que você criou para montar o cardápio.`, `<a class="btn btn-pri" href="${BASE}painel.html">Entrar no painel</a>`);
    } catch (e3) {
      if (liveModal) liveModal.pensando(false);
      ocupado(bt, false, 'Criar conta e montar cardápio');
      mensagem('Sem conexão com o servidor. Tente de novo.');
    }
  }

  async function enviarPix(plano) {
    const d = { empresa: vale('f-emp').trim(), responsavel: vale('f-resp').trim(), whats: vale('f-fone').trim(), email: vale('f-mail').trim(), cnpj: vale('f-cnpj').replace(/\D/g, ''), plano_id: plano.id };
    const erro = validarBasico(d) || (d.cnpj.length !== 14 ? 'O CNPJ tem 14 números.' : '');
    if (erro) return mensagem(erro);
    if (DEMO || plano.demo) return mensagem('Modo demonstração: nenhuma cobrança foi gerada.');
    const bt = $('#f-bt', conteudo);
    ocupado(bt, true, 'Gerando o Pix…'); mensagem('');
    try {
      const r = await chamar('/assinar', { method: 'POST', body: JSON.stringify(d) }, 20000);
      if (!r.ok) { ocupado(bt, false, 'Gerar Pix da 1ª mensalidade'); return mensagem(r.mensagem || 'Não foi possível gerar o Pix.'); }
      conteudo.innerHTML = `
        <h2 id="modal-titulo">Pague com Pix</h2>
        <p class="sub">${esc(r.plano)} · R$ ${reais(r.valor_centavos, 2)} · vence ${esc((r.venc || '').split('-').reverse().join('/'))}</p>
        ${r.pix && r.pix.imagem ? `<img class="pix-qr" src="data:image/png;base64,${esc(r.pix.imagem)}" alt="QR code do Pix">` : ''}
        ${r.pix && r.pix.payload ? `<div class="copia"><input readonly value="${esc(r.pix.payload)}" aria-label="Código Pix copia e cola"><button class="btn btn-pri" type="button" id="copiar">Copiar</button></div>` : ''}
        ${r.link ? `<p class="nota"><a href="${esc(r.link)}" target="_blank" rel="noopener">Abrir a fatura</a></p>` : ''}
        <p class="estado-pix" role="status"><span class="giro"></span> Aguardando o pagamento…</p>`;
      const c = $('#copiar', conteudo);
      if (c) c.addEventListener('click', async () => { const i = $('.copia input', conteudo); try { await navigator.clipboard.writeText(i.value); } catch (e) { i.select(); document.execCommand('copy'); } c.textContent = 'Copiado ✓'; });
      clearInterval(pollTimer);
      pollTimer = setInterval(async () => {
        try {
          const s = await chamar('/assinar/status?id=' + encodeURIComponent(r.id), { method: 'GET' });
          if (s.estado === 'ativo') { clearInterval(pollTimer); sucesso('Pagamento confirmado!', `Sua conta está ativa. As instruções de acesso foram enviadas para <b>${esc(s.email || d.email)}</b>.`, `<a class="btn btn-pri" href="${BASE}painel.html">Entrar no painel</a>`); }
          if (s.estado === 'vencido') { clearInterval(pollTimer); $('.estado-pix', conteudo).textContent = 'Este Pix venceu. Feche e gere um novo.'; }
        } catch (e) {}
      }, 5000);
    } catch (e) {
      ocupado(bt, false, 'Gerar Pix da 1ª mensalidade');
      mensagem('Sem conexão com o servidor. Tente de novo.');
    }
  }

  // ----- contato com especialista (registra o contato no Worker, que avisa a equipe por e-mail) -----
  function abrirContato() {
    abrirModal(`
      <h2 id="modal-titulo">Fale com um especialista</h2>
      <p class="sub">Deixe seus dados e a equipe LiveFood fala com você.</p>
      <form id="form-contato" novalidate>
        ${campo('f-emp', 'Nome do restaurante', 'autocomplete="organization" required')}
        ${campo('f-resp', 'Seu nome', 'autocomplete="name" required')}
        <div class="duas">${campo('f-fone', 'WhatsApp (com DDD)', 'inputmode="tel" autocomplete="tel" placeholder="(47) 99999-9999" required')}${campo('f-mail', 'E-mail', 'type="email" autocomplete="email" required')}</div>
        <p class="form-msg" role="alert"></p>
        <button class="btn btn-pri" type="submit" id="f-bt">Quero conversar</button>
        <p class="nota">Usamos seus dados só para entrar em contato sobre a LiveFood.</p>
      </form>`, 'feliz');
    mascaraFone($('#f-fone', conteudo));
    $('#form-contato', conteudo).addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = { empresa: vale('f-emp').trim(), responsavel: vale('f-resp').trim(), whats: vale('f-fone').trim(), email: vale('f-mail').trim(), plano: 'Contato pelo site' };
      const erro = validarBasico(d);
      if (erro) return mensagem(erro);
      if (DEMO) return mensagem('Modo demonstração: nada foi enviado.');
      const bt = $('#f-bt', conteudo);
      ocupado(bt, true, 'Enviando…');
      try {
        const r = await chamar('/assinar/interesse', { method: 'POST', body: JSON.stringify(d) });
        if (!r.ok) { ocupado(bt, false, 'Quero conversar'); return mensagem(r.mensagem || 'Não consegui enviar. Tente de novo.'); }
        sucesso('Recebemos seu contato!', 'A equipe LiveFood vai falar com você pelo WhatsApp ou e-mail informado.');
      } catch (e2) { ocupado(bt, false, 'Quero conversar'); mensagem('Sem conexão com o servidor. Tente de novo.'); }
    });
  }

  function sucesso(titulo, texto, acao = '') {
    conteudo.innerHTML = `<div class="sucesso"><div class="ok">✓</div><h2 id="modal-titulo">${titulo}</h2><p class="sub">${texto}</p>${acao}</div>`;
    if (liveModal) liveModal.gesto('comemorar');
    if (window.LFConfete) window.LFConfete(innerWidth / 2, innerHeight / 2);
    const b = $('a, button:not(.fechar)', conteudo); if (b) b.focus();
  }

  // ---------------------------------------------------------------------------
  // Lista de planos
  // ---------------------------------------------------------------------------
  const grade = $('#planos-grade');
  let planos = [];

  function esqueleto() {
    grade.setAttribute('aria-busy', 'true');
    grade.innerHTML = '<div class="plano plano-esqueleto"></div><div class="plano plano-esqueleto"></div><div class="plano plano-esqueleto"></div>';
  }

  function cartao(p, i) {
    let variavel = '';
    if (p.pacote_centavos > 0) {
      variavel = `<p class="variavel">+ <b>R$ ${reais(p.pacote_centavos, (p.pacote_centavos % 1) ? 3 : 2)}</b> por pacote${!p.variavel_total && p.franquia > 0 ? ` acima de ${Number(p.franquia).toLocaleString('pt-BR')} inclusos` : ''}</p>`;
    } else if (p.franquia > 0) {
      variavel = `<p class="variavel">${Number(p.franquia).toLocaleString('pt-BR')} pacotes inclusos</p>`;
    }
    const preco = p.fixo_centavos > 0
      ? `<p class="preco"><span class="moeda">R$</span><span class="valor">${reais(p.fixo_centavos)}</span><span class="periodo">/mês</span></p>`
      : '<p class="preco"><span class="valor" style="font-size:34px">Fale com a gente</span></p>';
    return `
      <article class="plano" data-revela data-tilt style="--atraso:${i * 0.08}s" data-plano="${esc(p.id)}">
        ${p.demo ? '<span class="selo-demo">DEMONSTRAÇÃO</span>' : ''}
        <h3>${esc(p.nome)}</h3>
        <p class="descricao">${esc(p.descricao)}</p>
        ${preco}
        ${variavel}
        <div class="espaco"></div>
        <button class="btn btn-pri mag" type="button" data-assinar="${esc(p.id)}">${p.fixo_centavos > 0 ? 'Começar agora' : 'Quero este plano'} <span class="seta">→</span></button>
      </article>`;
  }

  function aviso(titulo, texto, botoes) {
    grade.innerHTML = `<div class="planos-aviso" data-revela><h3>${titulo}</h3><p>${texto}</p><div class="botoes-linha centro">${botoes}</div></div>`;
  }

  function desenhar() {
    grade.setAttribute('aria-busy', 'false');
    if (!planos.length) {
      aviso('Novos planos chegando', 'Estamos atualizando os planos. Crie sua conta de teste agora ou fale com a equipe para conhecer as condições.',
        '<button class="btn btn-pri mag" type="button" data-assinar="">Criar conta de teste <span class="seta">→</span></button><button class="btn btn-vidro mag" type="button" data-abrir-contato>Falar com um especialista</button>');
    } else {
      grade.innerHTML = (planos.some((p) => p.demo) ? '<p class="faixa-demo">Dados de DEMONSTRAÇÃO (só em desenvolvimento). Os planos reais vêm do Admin.</p>' : '') + planos.map(cartao).join('');
    }
    document.dispatchEvent(new CustomEvent('lf:conteudo', { detail: grade }));
  }

  async function carregar() {
    esqueleto();
    if (DEMO) { planos = PLANOS_DEMO.map((p) => ({ ...p, demo: true })); setTimeout(desenhar, 500); return; }
    try {
      const r = await chamar('/planos', { method: 'GET' }, 10000);
      if (!r.ok) throw new Error('resposta');
      planos = (r.planos || []).filter((p) => p && p.ativo !== 0);
      desenhar();
    } catch (e) {
      grade.setAttribute('aria-busy', 'false');
      aviso('Não consegui carregar os planos', 'Verifique sua conexão e tente de novo. Se preferir, fale direto com a equipe.',
        '<button class="btn btn-pri mag" type="button" id="planos-tentar">Tentar de novo</button><button class="btn btn-vidro mag" type="button" data-abrir-contato>Falar com um especialista</button>');
      $('#planos-tentar').addEventListener('click', carregar);
      document.dispatchEvent(new CustomEvent('lf:conteudo', { detail: grade }));
    }
  }

  grade.addEventListener('click', (e) => {
    const b = e.target.closest('[data-assinar]');
    if (!b) return;
    abrirAssinar(planos.find((p) => p.id === b.dataset.assinar) || null);
  });
  document.addEventListener('click', (e) => { if (e.target.closest('[data-abrir-contato]')) { e.preventDefault(); abrirContato(); } });
  // links para o painel: no domínio oficial ficam relativos; em desenvolvimento apontam para o site publicado
  document.querySelectorAll('[data-painel]').forEach((a) => { a.href = BASE + 'hub.html'; });

  // recarrega quando o visitante volta à aba: preço mudou no admin, o site mostra sem publicar nada
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !DEMO && Date.now() - (carregar.ultima || 0) > 60000) { carregar.ultima = Date.now(); carregar(); } });
  carregar.ultima = Date.now();
  carregar();

  window.LFPlanos = { abrirAssinar, abrirContato, fecharModal, recarregar: carregar };
})();
