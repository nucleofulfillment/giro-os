/* Voz do Live: fala + escuta + movimento da boca.
   - Fala com ElevenLabs (voz de personagem, com tempo de cada letra para a boca) quando houver chave;
     senão usa a melhor voz pt-BR do navegador (no Edge: vozes "Natural").
   - Escuta contínua em pt-BR: espera o cliente terminar a frase (pausa de silêncio) antes de responder. */
(function () {
  'use strict';

  const synth = window.speechSynthesis || null;
  const Reconhecedor = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let vozes = [], todasVozes = [];
  let rec = null;
  let falaAtual = null; // { cancelar() }

  // Idiomas do atendimento: o que o reconhecimento ouve e qual voz masculina o Live usa em cada um
  let idioma = 'pt';
  const IDIOMAS = {
    pt: { rec: 'pt-BR' },
    en: { rec: 'en-US', lang: /^en[-_]?(US|GB|AU|CA)/i,
      femininas: /Aria|Jenny|Ava|Emma|Michelle|Ana\b|Zira|Sonia|Libby|Natasha|Clara|Jane|Nancy|Sara|Amber|Ashley|Cora|Elizabeth|Monica|Hazel|Susan|Female/i,
      preferidas: [/(Andrew|Brian|Guy|Christopher|Eric|Roger|Steffan|Ryan|Davis|Tony|Jason)\b.*Natural/i, /Natural/i, /David|Mark|George/i, /Google US/i, /Google/i] },
    es: { rec: 'es-ES', lang: /^es[-_]/i,
      femininas: /Elvira|Dalia|Elena|Helena|Laura|Paloma|Sabina|Ximena|Abril|Irene|Larissa|Lia|Marina|Nuria|Renata|Triana|Vera|Estrella|Beatriz|Candela|Carlota|Female/i,
      preferidas: [/(Alvaro|Álvaro|Jorge|Gerardo|Tomas|Tomás|Elias|Elías|Dario|Darío|Arnau|Liberto|Saul|Saúl|Teo|Cecilio)\b.*Natural/i, /Natural/i, /Pablo|Raul|Raúl/i, /Google/i] },
  };

  function carregarVozes() {
    if (!synth) return;
    todasVozes = synth.getVoices();
    vozes = todasVozes.filter((v) => /^pt[-_]?BR/i.test(v.lang) || /portugu.*bra/i.test(v.name));
    if (window.Voz && window.Voz.aoMudarVozes) window.Voz.aoMudarVozes(vozes);
  }

  // voz masculina do idioma (inglês/espanhol), dando preferência às "Natural" do Edge
  function vozDoIdioma(cfg) {
    const doIdioma = todasVozes.filter((v) => cfg.lang.test(v.lang));
    const masculinas = doIdioma.filter((v) => !cfg.femininas.test(v.name));
    for (const re of cfg.preferidas) {
      const v = masculinas.find((x) => re.test(x.name));
      if (v) return v;
    }
    return masculinas[0] || doIdioma[0] || null;
  }

  function escolherVoz(nome) {
    if (idioma !== 'pt') return vozDoIdioma(IDIOMAS[idioma]) || escolherVozPt(nome);
    return escolherVozPt(nome);
  }

  function escolherVozPt(nome) {
    if (nome) {
      const v = vozes.find((v) => v.name === nome);
      if (v) return v;
    }
    // Voz de menino: voz masculina com o tom bem mais agudo (o tom vem da configuração).
    // Primeiro as "Natural" do Edge (Antonio), depois as instaladas no Windows (Daniel).
    const femininas = /Maria|Francisca|Thalita|Leticia|Brenda|Elza|Giovanna|Leila|Manuela|Yara|Luciana|Camila|Vitoria|Heloisa/i;
    const masculinas = vozes.filter((v) => !femininas.test(v.name));
    // (o Edge escreve "Antônio", com acento)
    const preferidas = [/Ant[oô]nio.*Natural/i, /(Donato|F[aá]bio|Humberto|J[uú]lio|Nicolau|Val[eé]rio).*Natural/i, /Natural/i, /Daniel/i, /Google/i];
    for (const re of preferidas) {
      const v = masculinas.find((v) => re.test(v.name));
      if (v) return v;
    }
    return masculinas[0] || vozes[0] || null;
  }

  // ---------------------------------------------------------------------------
  // Texto → fala em bom português (números por extenso, preços, palavras estrangeiras)
  // ---------------------------------------------------------------------------
  const UN = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze',
    'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const DZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const CT = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  function extenso(n) {
    if (n < 20) return UN[n];
    if (n < 100) return DZ[Math.floor(n / 10)] + (n % 10 ? ' e ' + UN[n % 10] : '');
    if (n === 100) return 'cem';
    if (n < 1000) return CT[Math.floor(n / 100)] + (n % 100 ? ' e ' + extenso(n % 100) : '');
    if (n < 1000000) {
      const mil = Math.floor(n / 1000), r = n % 1000;
      return (mil === 1 ? 'mil' : extenso(mil) + ' mil') + (r ? (r < 100 || r % 100 === 0 ? ' e ' : ' ') + extenso(r) : '');
    }
    return String(n);
  }

  function preco(reais, centavos) {
    const r = parseInt(reais, 10), c = parseInt(centavos || '0', 10);
    if (!c) return extenso(r); // "deu cento e dezenove", sem o "reais", como se fala no balcão
    if (!r) return `${extenso(c)} centavos`;
    return `${extenso(r)} e ${extenso(c)}`; // "vinte e nove e noventa", como se fala no balcão
  }

  // Grafia "do jeito que se fala" para nomes que o sintetizador costuma errar
  const PRONUNCIA = [
    [/\bLiveFood\b/gi, 'Láive Fúd'],
    [/\bLive\b/g, 'Láive'],
    [/\bX-\s?/g, 'Xis '],
    [/\bbacon\b/gi, 'bêicon'],
    [/\bsmash\b/gi, 'ismésh'],
    [/\bcrispy\b/gi, 'críspi'],
    [/\bveggie\b/gi, 'végui'],
    [/\bonion rings\b/gi, 'ônion rínguis'],
    [/\bnuggets?\b/gi, 'nâguets'],
    [/\bmilk\s?shake\b/gi, 'milque xêique'],
    [/\bbrownie\b/gi, 'bráuni'],
    [/\bsprite\b/gi, 'spráite'],
    [/\bblend\b/gi, 'blênd'],
    [/\bshow\b/gi, 'xou'],
    [/\bok\b/gi, 'oquei'],
    [/\bdelivery\b/gi, 'delíveri'],
    [/(\d+)\s?ml\b/gi, '$1 mililitros'],
    [/(\d+)\s?g\b/gi, '$1 gramas'],
    [/\bun\./gi, 'unidades'],
  ];

  // inglês/espanhol: a voz do idioma já lê números; só ajusta preço em reais, número do pedido e medidas
  function paraFalaOutroIdioma(t) {
    const en = idioma === 'en';
    return String(t)
      .replace(/R\$\s?(\d{1,6})(?:,(\d{2}))?/g, (m, r, c) => {
        const rr = parseInt(r, 10), cc = parseInt(c || '0', 10);
        if (en) return `${rr} ${rr === 1 ? 'real' : 'reais'}${cc ? ` and ${cc} cents` : ''}`;
        return `${rr} ${rr === 1 ? 'real' : 'reales'}${cc ? ` con ${cc}` : ''}`;
      })
      .replace(/#\s?(\d+)/g, en ? 'number $1' : 'número $1')
      .replace(/(\d+)\s?ml\b/gi, en ? '$1 milliliters' : '$1 mililitros')
      .replace(/(\d+)\s?g\b/gi, en ? '$1 grams' : '$1 gramos')
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function paraFala(t) {
    if (idioma !== 'pt') return paraFalaOutroIdioma(t);
    let s = String(t);
    for (const [re, sub] of PRONUNCIA) s = s.replace(re, sub);
    return s
      .replace(/R\$\s?(\d{1,6})(?:,(\d{2}))?/g, (m, r, c) => preco(r, c))
      .replace(/#\s?(\d+)/g, 'número $1')
      .replace(/\b(\d{1,6})\b/g, (m, n) => extenso(parseInt(n, 10)))
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function visemaDe(ch) {
    const c = (ch || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    if (c === 'a') return 'A';
    if (c === 'e') return 'E';
    if (c === 'i' || c === 'y') return 'I';
    if (c === 'o') return 'O';
    if (c === 'u') return 'U';
    if ('bmp'.includes(c) && c) return 'M';
    if (/[a-z]/.test(c)) return 'I';
    return 'M';
  }

  // ---------------------------------------------------------------------------
  // Fala: ElevenLabs (voz de personagem)
  // ---------------------------------------------------------------------------
  async function falarEleven(texto, op, aoViseme, estado) {
    // pelo servidor do LiveFood (chave guardada lá) ou direto, com a chave da engrenagem (teste local)
    const resp = op.elevenProxy
      ? await op.elevenProxy(texto, op.velocidade || 1, estado.abortar.signal)
      : await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(op.elevenVoz)}/with-timestamps?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'xi-api-key': op.elevenChave, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: texto,
          model_id: op.elevenModelo || 'eleven_multilingual_v2',
          voice_settings: { stability: 0.38, similarity_boost: 0.8, style: 0.55, use_speaker_boost: true, speed: Math.max(0.8, Math.min(1.15, op.velocidade || 1)) },
        }),
        signal: estado.abortar.signal,
      });
    if (!resp.ok) {
      const err = new Error('ElevenLabs respondeu ' + resp.status);
      err.status = resp.status;
      throw err;
    }
    const dados = await resp.json();
    if (estado.cancelado) return;
    const al = dados.alignment || dados.normalized_alignment || { characters: [], character_start_times_seconds: [], character_end_times_seconds: [] };
    const audio = new Audio('data:audio/mpeg;base64,' + dados.audio_base64);
    estado.audio = audio;

    await new Promise((resolve, reject) => {
      let raf = 0, i = 0;
      const tick = () => {
        const tm = audio.currentTime;
        while (i < al.characters.length - 1 && al.character_end_times_seconds[i] < tm) i++;
        const dentro = al.character_start_times_seconds[i] <= tm && tm <= al.character_end_times_seconds[i];
        aoViseme(dentro ? visemaDe(al.characters[i]) : 'M');
        raf = requestAnimationFrame(tick);
      };
      audio.onplay = () => { estado.comecou(); raf = requestAnimationFrame(tick); };
      audio.onended = () => { cancelAnimationFrame(raf); resolve(); };
      audio.onerror = () => { cancelAnimationFrame(raf); reject(new Error('Falha ao tocar o áudio')); };
      estado.pararAudio = () => { cancelAnimationFrame(raf); audio.pause(); resolve(); };
      audio.play().catch((e) => { cancelAnimationFrame(raf); reject(e); });
    });
  }

  // ---------------------------------------------------------------------------
  // Fala: voz do navegador
  // ---------------------------------------------------------------------------
  function animadorBoca(texto, velocidade, aoViseme) {
    let i = 0, pausa = 0;
    const passo = 68 / velocidade;
    const id = setInterval(() => {
      if (pausa > 0) { pausa -= passo; aoViseme('M'); return; }
      if (i >= texto.length) { aoViseme('M'); return; }
      const ch = texto[i++];
      if (/[,.!?;:]/.test(ch)) pausa = 200;
      aoViseme(visemaDe(ch));
    }, passo);
    return { ir(pos) { i = Math.max(i, pos); }, parar() { clearInterval(id); } };
  }

  function falarNavegador(texto, op, aoViseme, estado) {
    const v = escolherVoz(op.voz);
    // Vozes online (as "Natural" do Edge) demoram para começar cada trecho: fala tudo de uma vez.
    // Só as vozes do Google precisam ser picadas (cortam falas longas).
    const picar = v && /Google/i.test(v.name);
    const frases = picar ? texto.split(/(?<=[.!?])\s+/).filter(Boolean) : [texto];
    return new Promise((resolve) => {
      if (!synth || !v) {
        estado.comecou();
        const boca = animadorBoca(texto, op.velocidade || 1, aoViseme);
        const id = setTimeout(() => { boca.parar(); resolve(); }, texto.length * 68 / (op.velocidade || 1) + 300);
        estado.pararAudio = () => { clearTimeout(id); boca.parar(); resolve(); };
        return;
      }
      let idx = 0, boca = null;
      const fim = () => { boca && boca.parar(); resolve(); };
      estado.pararAudio = () => { synth.cancel(); fim(); };
      const proxima = () => {
        if (estado.cancelado) return fim();
        if (idx >= frases.length) return fim();
        const frase = frases[idx++];
        boca && boca.parar();
        boca = null;
        const u = new SpeechSynthesisUtterance(frase);
        // a boca e a legenda só começam quando o som começa de verdade
        u.onstart = () => {
          if (estado.cancelado) return;
          boca = animadorBoca(frase, op.velocidade || 1, aoViseme);
          estado.comecou();
        };
        u.voice = v;
        u.lang = v.lang || IDIOMAS[idioma].rec;
        // tom agudo (voz de menino) só nas vozes "Natural" do Edge; nas outras (Google do Chrome, Daniel...)
        // o tom alto distorce a voz, então fica quase natural
        u.pitch = /Natural/i.test(v.name) ? (op.tom || 1.5) : Math.min(op.tom || 1.5, 1.15);
        u.rate = op.velocidade || 1.05;
        const seguranca = setTimeout(() => { synth.cancel(); proxima(); }, frase.length * 110 / u.rate + 3000);
        // O evento de "fim" da voz do Edge chega atrasado. Quando ele começa a última palavra,
        // dá pra calcular quando a fala acaba e liberar o microfone na hora certa.
        const ultimoInicio = frase.trimEnd().lastIndexOf(' ') + 1;
        u.onboundary = (e) => {
          const pos = e.charIndex || 0;
          boca && boca.ir(pos);
          if (idx >= frases.length && pos >= ultimoInicio && !estado.quaseFim) {
            estado.quaseFim = true;
            const resto = frase.length - ultimoInicio;
            setTimeout(() => { if (!estado.cancelado) fim(); }, resto * 75 / u.rate + 250);
          }
        };
        u.onend = () => { clearTimeout(seguranca); proxima(); };
        u.onerror = () => { clearTimeout(seguranca); proxima(); };
        synth.speak(u);
      };
      // cancelar sem nada tocando atrasa a próxima fala no Edge
      if (synth.speaking || synth.pending) synth.cancel();
      proxima();
    });
  }

  // ---------------------------------------------------------------------------
  // API de fala
  // ---------------------------------------------------------------------------
  async function falar(texto, op = {}) {
    parar();
    const aoViseme = op.aoViseme || (() => {});
    const limpo = paraFala(texto);
    let jaComecou = false;
    const estado = {
      cancelado: false, abortar: new AbortController(), pararAudio: null,
      comecou() { if (!jaComecou) { jaComecou = true; op.aoComecar && op.aoComecar(); } },
    };
    const minha = {
      cancelar() {
        estado.cancelado = true;
        estado.abortar.abort();
        if (estado.pararAudio) estado.pararAudio();
      },
    };
    falaAtual = minha;
    // se a voz demorar demais para sair, mostra a legenda mesmo assim
    const seguranca = setTimeout(() => { if (!estado.cancelado) estado.comecou(); }, 1500);
    try {
      if (op.elevenProxy || (op.elevenChave && op.elevenVoz)) {
        try {
          await falarEleven(limpo, op, aoViseme, estado);
        } catch (e) {
          if (estado.cancelado) return false;
          if (Voz.aoErroVoz) Voz.aoErroVoz(e);
          await falarNavegador(limpo, op, aoViseme, estado);
        }
      } else {
        await falarNavegador(limpo, op, aoViseme, estado);
      }
    } finally {
      clearTimeout(seguranca);
      if (!estado.cancelado) estado.comecou(); // se a voz falhou em silêncio, ao menos mostra a legenda
      aoViseme(null);
      if (falaAtual === minha) falaAtual = null;
    }
    return !estado.cancelado;
  }

  function parar() {
    if (falaAtual) {
      const f = falaAtual;
      falaAtual = null;
      f.cancelar();
    }
  }

  function destravar() {
    // A primeira fala precisa nascer de um toque do usuário (política de autoplay do navegador)
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const a = new Audio();
      a.play().catch(() => {});
    } catch (e) { /* sem áudio disponível */ }
  }

  // ---------------------------------------------------------------------------
  // Escuta contínua: termina quando o cliente faz uma pausa
  // ---------------------------------------------------------------------------
  // aoInicio é chamado só quando o microfone está de fato captando (aí sim o cliente pode falar).
  // surdo: liga o microfone já enquanto o Live fala, mas descarta tudo até liberar() — assim,
  // quando ele termina de falar, o microfone já está aquecido e nada do cliente se perde.
  function ouvir({ aoInicio, aoParcial, aoFinal, aoFim, aoErro, silencioMs = 2000, esperaMs = 15000, surdo = false } = {}) {
    if (!Reconhecedor) { aoErro && aoErro('sem-suporte'); aoFim && aoFim(); return null; }
    pararOuvir();
    const r = new Reconhecedor();
    rec = r;
    r.lang = 'pt-BR';
    r.interimResults = true;
    r.continuous = true;
    r.maxAlternatives = 1;
    let final = '', parcial = '';
    let liberado = !surdo, audioLigado = false, avisou = false;
    let ignorarAte = 0;          // resultados com índice menor são a voz do próprio Live
    let prefixoEco = '';         // trecho do Live que ainda estava "em andamento" na hora de liberar
    let ultimos = null;
    const encerrar = () => { try { r.stop(); } catch (e) { /* já parado */ } };
    let timer = liberado ? setTimeout(encerrar, esperaMs) : null; // ninguém falou nada
    // depois de uma frase completa espera a pausa; com frase pela metade espera um pouco mais
    const reagendar = () => { clearTimeout(timer); timer = setTimeout(encerrar, parcial ? silencioMs + 1000 : silencioMs); };
    const avisarInicio = () => { if (liberado && audioLigado && !avisou) { avisou = true; aoInicio && aoInicio(); } };

    r.onaudiostart = () => { audioLigado = true; avisarInicio(); };
    r.onresult = (e) => {
      ultimos = e.results;
      if (!liberado) return;
      final = ''; parcial = '';
      for (let i = ignorarAte; i < e.results.length; i++) {
        const res = e.results[i];
        let txt = res[0].transcript;
        if (i === ignorarAte && prefixoEco) {
          const a = txt.trim().toLowerCase(), p = prefixoEco.trim().toLowerCase();
          txt = a.startsWith(p) ? txt.trim().slice(p.length) : txt;
        }
        if (res.isFinal) final += txt + ' ';
        else parcial += txt;
      }
      if (!(final + parcial).trim()) return;
      aoParcial && aoParcial((final + parcial).trim());
      reagendar();
    };
    const controle = {
      liberar() {
        if (liberado) return;
        liberado = true;
        if (ultimos && ultimos.length) {
          const ult = ultimos[ultimos.length - 1];
          if (ult.isFinal) ignorarAte = ultimos.length;
          else { ignorarAte = ultimos.length - 1; prefixoEco = ult[0].transcript; }
        }
        timer = setTimeout(encerrar, esperaMs);
        avisarInicio();
      },
      get ativo() { return rec === r; },
    };
    r.onerror = (e) => { aoErro && aoErro(e.error); };
    r.onend = () => {
      clearTimeout(timer);
      if (rec === r) rec = null;
      const texto = liberado ? (final + parcial).trim() : '';
      if (texto && !r.abortado) aoFinal && aoFinal(texto);
      aoFim && aoFim({ liberado });
    };
    try { r.start(); } catch (e) { clearTimeout(timer); if (rec === r) rec = null; aoErro && aoErro('ocupado'); aoFim && aoFim({ liberado }); return null; }
    return controle;
  }

  // ---------------------------------------------------------------------------
  // Escuta sempre ligada: um reconhecimento contínuo que fica aberto o atendimento inteiro
  // (religa sozinho se o navegador derrubar). liberar() abre os "ouvidos", ensurdecer() tampa.
  // Tudo o que foi captado antes de liberar() é descartado — inclusive a fala do Live.
  // ---------------------------------------------------------------------------
  let escutaAtual = null;
  // silencioMs: quanto esperar depois que o navegador fecha a frase (ele já espera uma pausa antes de fechar).
  // Se a frase ainda está aberta (parcial), espera um pouco mais, porque a pessoa pode só estar pensando.
  function iniciarEscuta({ aoInicio, aoParcial, aoFinal, aoErro, silencioMs = 1000 } = {}) {
    if (!Reconhecedor) { aoErro && aoErro('sem-suporte'); return null; }
    pararOuvir();
    let r = null, liberado = false, captando = false, parado = false;
    let ultimos = null, ignorarAte = 0, prefixoEco = '', final = '', parcial = '', timer = null, alternativas = [];
    let quedas = 0, ultimaQueda = 0;
    // controle da frase em andamento (pra não deixar o barulho segurar a entrega)
    let ultimoTexto = '', ultimasPalavras = 0, mudouEm = 0, comecouEm = 0, ultimoFinal = '', finalEm = 0;

    // descarta tudo o que já foi captado até agora
    const marcarIgnorar = () => {
      clearTimeout(timer);
      timer = null;
      ultimoTexto = ''; ultimasPalavras = 0; mudouEm = 0; comecouEm = 0; ultimoFinal = ''; finalEm = 0;
      final = ''; parcial = ''; prefixoEco = ''; alternativas = [];
      ignorarAte = 0;
      if (ultimos && ultimos.length) {
        const ult = ultimos[ultimos.length - 1];
        if (ult.isFinal) ignorarAte = ultimos.length;
        else { ignorarAte = ultimos.length - 1; prefixoEco = ult[0].transcript; }
      }
    };

    const entregar = () => {
      clearTimeout(timer);
      timer = null;
      const texto = (final + parcial).trim();
      if (!texto || !liberado) return;
      const outras = alternativas.filter((a) => a && a.toLowerCase() !== texto.toLowerCase());
      const tempo = { ultimaPalavraEm: mudouEm, entregueEm: Date.now() }; // pro cronômetro do app
      liberado = false;
      marcarIgnorar();
      aoFinal && aoFinal(texto, outras, tempo);
    };

    const ligar = () => {
      if (parado) return;
      const rr = new Reconhecedor();
      r = rr; rec = rr;
      rr.lang = IDIOMAS[idioma].rec; // ouve no idioma escolhido pelo cliente
      rr.interimResults = true;
      rr.continuous = true;
      rr.maxAlternatives = 3; // outras leituras do que foi dito vão junto pra IA desempatar ("Franca tupini" × "frango catupiry")
      ultimos = null; ignorarAte = 0; prefixoEco = '';
      rr.onaudiostart = () => { captando = true; quedas = 0; if (liberado) aoInicio && aoInicio(); };
      rr.onresult = (e) => {
        ultimos = e.results;
        if (!liberado) return;
        final = ''; parcial = '';
        const alts = [[], []];
        for (let i = ignorarAte; i < e.results.length; i++) {
          const res = e.results[i];
          let txt = res[0].transcript;
          if (i === ignorarAte && prefixoEco) {
            const a = txt.trim().toLowerCase(), p = prefixoEco.trim().toLowerCase();
            if (a.startsWith(p)) txt = txt.trim().slice(p.length);
          }
          if (res.isFinal) final += txt + ' ';
          else parcial += txt;
          for (let k = 1; k <= 2; k++) alts[k - 1].push(res.length > k ? res[k].transcript : txt);
        }
        alternativas = alts.map((l) => l.join(' ').replace(/\s+/g, ' ').trim());
        const atual = (final + parcial).trim();
        if (!atual) return;
        aoParcial && aoParcial(atual);
        const agora = Date.now();
        if (!comecouEm) comecouEm = agora;
        // Com barulho, o reconhecedor fica reenviando o mesmo texto (ou trocando uma palavrinha do fim):
        // isso NÃO conta como o cliente continuar falando, então não segura a entrega.
        const palavras = atual.split(/\s+/).length;
        if (atual === ultimoTexto) return;
        const cresceu = palavras > ultimasPalavras;
        ultimoTexto = atual;
        if (cresceu || !timer) { ultimasPalavras = palavras; mudouEm = agora; }
        else if (agora - mudouEm < 2500) { /* só ajustou palavra: mantém o cronômetro que já está correndo */ return; }
        if (final.trim() && final.trim() !== ultimoFinal) { ultimoFinal = final.trim(); finalEm = agora; }
        clearTimeout(timer);
        // Espera adaptativa: frase que termina em "e", "com", "mais", número, vírgula... ainda não acabou
        // (a pessoa está listando itens), então espera mais antes de entregar.
        const ultima = atual.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).pop();
        const continua = /,$/.test(atual) || /^(e|com|mais|tambem|um|uma|uns|umas|dois|duas|tres|quatro|cinco|de|do|da|dos|das|sem|pra|para|o|a|os|as|meio|outro|outra|quero|queria|ve|bota|coloca|tipo|ai|hum|hmm|ahn|eh)$/.test(ultima);
        let espera = parcial ? silencioMs + 600 : silencioMs;
        if (continua) espera += 1100;
        else if (palavras >= 8) espera += 300; // pedido longo (lista de itens): um respiro a mais pra pausa de pensar
        // Tetos (só pro barulho): enquanto o cliente acrescenta palavras novas, NUNCA corta. O teto conta a partir
        // da última palavra nova: se o texto parou de crescer e só fica "trocando" (chiado do ambiente), entrega em 2,5 s.
        // Fala muito longa: entrega com 25 s.
        espera = Math.min(espera, Math.max(150, mudouEm + 2500 - agora));
        espera = Math.min(espera, Math.max(150, comecouEm + 25000 - agora));
        timer = setTimeout(entregar, espera);
      };
      rr.onerror = (e) => {
        // Esses erros nem sempre são definitivos (o Edge recusa uma sessão por um instante, o microfone some e volta):
        // a escuta segue tentando religar sozinha; quem decide parar de vez é o app (permissão negada de verdade).
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') {
          aoErro && aoErro(e.error);
        } else if (e.error === 'network') {
          aoErro && aoErro('network');
        }
      };
      rr.onend = () => {
        captando = false;
        if (rec === rr) rec = null;
        if (parado || rr.abortado) return;
        if (liberado && (final + parcial).trim()) entregar();
        // o navegador derrubou a sessão: religa (espaçando se cair toda hora)
        const agora = Date.now();
        quedas = agora - ultimaQueda < 2000 ? quedas + 1 : 0;
        ultimaQueda = agora;
        setTimeout(ligar, Math.min(2000, 100 + quedas * 400));
      };
      try { rr.start(); } catch (e) { setTimeout(ligar, 500); }
    };

    ligar();
    const controle = {
      liberar() {
        if (parado) return;
        marcarIgnorar();
        liberado = true;
        if (captando) aoInicio && aoInicio();
      },
      ensurdecer() { liberado = false; marcarIgnorar(); },
      parar() {
        parado = true;
        liberado = false;
        clearTimeout(timer);
        if (r) { r.abortado = true; try { r.abort(); } catch (e) { /* já parado */ } }
        if (escutaAtual === controle) escutaAtual = null;
      },
      get captando() { return captando; },
      get ativo() { return !parado; },
    };
    escutaAtual = controle;
    return controle;
  }

  // "bip" curtinho avisando que pode falar
  let audioCtx = null;
  function bip() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audioCtx.currentTime;
      [[880, 0], [1320, 0.09]].forEach(([f, d]) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + d);
        g.gain.exponentialRampToValueAtTime(0.12, t0 + d + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.12);
        o.connect(g).connect(audioCtx.destination);
        o.start(t0 + d);
        o.stop(t0 + d + 0.14);
      });
    } catch (e) { /* sem áudio */ }
  }

  function pararOuvir() {
    if (escutaAtual) escutaAtual.parar();
    if (rec) {
      const r = rec;
      rec = null;
      r.abortado = true;
      try { r.abort(); } catch (e) { /* já parado */ }
    }
  }

  const Voz = {
    falar, parar, ouvir, iniciarEscuta, pararOuvir, destravar, paraFala, bip,
    get vozes() { return vozes; },
    get idioma() { return idioma; },
    set idioma(cod) { idioma = IDIOMAS[cod] ? cod : 'pt'; },
    temVozDoIdioma: (cod) => cod === 'pt' || !!(IDIOMAS[cod] && todasVozes.some((v) => IDIOMAS[cod].lang.test(v.lang))),
    podeOuvir: !!Reconhecedor,
    aoMudarVozes: null,
    aoErroVoz: null,
  };
  window.Voz = Voz;
  if (synth) {
    carregarVozes();
    synth.onvoiceschanged = carregarVozes;
  }
})();
