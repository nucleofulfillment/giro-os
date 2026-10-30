/* GIRO OS — programa de impressão do restaurante (v1)
   Busca a fila de etiquetas no Worker e imprime direto nas impressoras de rede (porta 9100).
   Usos:
     node giro-impressao.js              -> fica rodando e imprimindo
     node giro-impressao.js --configurar -> pede e-mail/senha do dono UMA vez e grava a chave (a senha não é guardada)
     node giro-impressao.js --teste cozinha   (ou bar / caixa) -> imprime uma etiqueta de teste naquela impressora
*/
'use strict';
const fs = require('fs'), net = require('net'), os = require('os'), path = require('path'), readline = require('readline');
const CFG_FILE = path.join(__dirname, 'config.json'), LOG_FILE = path.join(__dirname, 'impressao.log');
const API_PADRAO = 'https://giro-os-api.nucleofull.workers.dev';
const COLS = 48;   /* 80 mm, fonte A */

function log(m) { const l = new Date().toLocaleString('pt-BR') + '  ' + m; console.log(l); try { fs.appendFileSync(LOG_FILE, l + '\n'); } catch (e) {} }
function lerCfg() { try { return JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')); } catch (e) { return null; } }
function perguntar(q) { return new Promise(r => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); rl.question(q, a => { rl.close(); r(a.trim()); }); }); }
async function http(url, opt) { const r = await fetch(url, opt); let d = {}; try { d = await r.json(); } catch (e) {} d._h = r.status; return d; }

/* ── texto → bytes (CP860 português; "semAcento" tira os acentos) ── */
const CP860 = { 'Ç':0x80,'ü':0x81,'é':0x82,'â':0x83,'ã':0x84,'à':0x85,'Á':0x86,'ç':0x87,'ê':0x88,'Ê':0x89,'è':0x8A,'Í':0x8B,'Ô':0x8C,'ì':0x8D,'Ã':0x8E,'Â':0x8F,'É':0x90,'À':0x91,'È':0x92,'ô':0x93,'õ':0x94,'ò':0x95,'Ú':0x96,'ù':0x97,'Ì':0x98,'Õ':0x99,'Ü':0x9A,'Ù':0x9D,'Ó':0x9F,'á':0xA0,'í':0xA1,'ó':0xA2,'ú':0xA3,'ñ':0xA4,'Ñ':0xA5,'ª':0xA6,'º':0xA7,'·':0x2E };
function semAc(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function bytesTxt(s, cfg) {
  s = String(s).replace(/·/g, '-').replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  if (cfg.semAcento) s = semAc(s);
  const out = [];
  for (const ch of s) { const c = ch.codePointAt(0); if (c < 128) out.push(c); else if (CP860[ch] !== undefined) out.push(CP860[ch]); else { const b = semAc(ch).codePointAt(0); out.push(b < 128 ? b : 63); } }
  return out;
}

/* ── montagem ESC/POS ── */
function Buf(cfg) { this.b = []; this.cfg = cfg; }
Buf.prototype.raw = function (...a) { this.b.push(...a); return this; };
Buf.prototype.txt = function (s) { this.b.push(...bytesTxt(s, this.cfg)); return this; };
Buf.prototype.ln = function (s) { return this.txt(s || '').raw(10); };
Buf.prototype.align = function (n) { return this.raw(0x1B, 0x61, n); };      /* 0 esq, 1 centro, 2 dir */
Buf.prototype.bold = function (on) { return this.raw(0x1B, 0x45, on ? 1 : 0); };
Buf.prototype.size = function (w, h) { return this.raw(0x1D, 0x21, ((w - 1) << 4) | (h - 1)); };
Buf.prototype.inv = function (on) { return this.raw(0x1D, 0x42, on ? 1 : 0); };
function quebra(s, n) { const out = []; let l = ''; String(s).split(' ').forEach(p => { while (p.length > n) { if (l) { out.push(l); l = ''; } out.push(p.slice(0, n)); p = p.slice(n); } if (!l) l = p; else if ((l + ' ' + p).length <= n) l += ' ' + p; else { out.push(l); l = p; } }); if (l) out.push(l); return out.length ? out : ['']; }
function dataHora(ms) { const d = new Date(ms || Date.now()); const o = { timeZone: 'America/Sao_Paulo' }; return d.toLocaleDateString('pt-BR', o) + ' ' + d.toLocaleTimeString('pt-BR', Object.assign({ hour: '2-digit', minute: '2-digit' }, o)); }

function etiqueta(p, cfg) {
  const b = new Buf(cfg), tr = '-'.repeat(COLS), setor = p.setor === 'bar' ? 'BAR' : (p.setor === 'caixa' ? 'CAIXA' : 'COZINHA');
  b.raw(0x1B, 0x40, 0x1B, 0x74, cfg.codepage == null ? 3 : cfg.codepage);   /* inicia + tabela de caracteres */
  b.align(1).bold(true).size(1, 2); quebra(p.empresa || '', COLS).forEach(l => b.ln(l)); b.size(1, 1);
  b.ln(setor.split('').join(' ') + (p.reimp ? '  -  2a VIA' : '')).bold(false).align(0).ln(tr);
  const local = p.mesa ? ((p.modo === 'balcao' ? 'BALCAO ' : 'MESA ') + p.mesa) : (p.modo === 'balcao' ? 'BALCAO' : 'CLIENTE ' + (p.joia || ''));
  b.align(1).inv(true).bold(true).size(2, 3).ln(' ' + local + ' ').size(1, 1).inv(false).bold(false).align(0);
  const esq = 'Pedido #' + p.lab, dir = dataHora(p.criado); b.bold(true).txt(esq).bold(false).ln(' '.repeat(Math.max(1, COLS - esq.length - dir.length)) + dir);
  if (p.nome && p.joia) { b.raw(10).bold(true).size(1, 2); quebra(p.nome + ' [' + p.joia + ']', COLS).forEach(l => b.ln(l)); b.size(1, 1).bold(false); }
  if (p.atend) b.ln('Atendente: ' + p.atend);
  b.ln(tr);
  (p.l || []).forEach(l => {
    const pre = l.qty + 'x ', nm = quebra(String(l.nome).toUpperCase(), COLS - pre.length);
    b.bold(true).size(1, 2).ln(pre + nm[0]); nm.slice(1).forEach(x => b.ln(' '.repeat(pre.length) + x)); b.size(1, 1).bold(false);
    const sub = []; if (l.tam) sub.push(l.tam); const n = (l.sab || []).length; (l.sab || []).forEach(x => sub.push((n > 1 ? '1/' + n + ' ' : '') + x)); if (l.borda) sub.push('Borda: ' + l.borda); (l.adds || []).forEach(a => sub.push('+ ' + a));
    sub.forEach(s => quebra(s, COLS - 4).forEach(x => b.ln('    ' + x)));
    if (l.obs) quebra('! ' + l.obs, COLS - 4).forEach(x => b.bold(true).ln('    ' + x).bold(false));
    b.raw(10);
  });
  if (p.obs) { b.ln(tr).bold(true); quebra('OBS: ' + p.obs, COLS).forEach(x => b.ln(x)); b.bold(false); }
  b.ln(tr).align(1);
  const cod = String(p.lab).replace(/[^0-9A-Za-z-]/g, '');
  b.raw(0x1D, 0x68, 70, 0x1D, 0x77, 2, 0x1D, 0x48, 0, 0x1D, 0x6B, 73, cod.length + 2, 0x7B, 0x42, ...bytesTxt(cod, cfg)).raw(10);
  b.bold(true).size(1, 2).ln(String(p.lab)).size(1, 1).bold(false);
  b.raw(10, 10, 10, 0x1D, 0x56, 66, 3);   /* avança e corta */
  return Buffer.from(b.b);
}

function enviar(ip, buf) {
  return new Promise((ok, erro) => {
    const s = new net.Socket(); let fim = false; const f = e => { if (fim) return; fim = true; s.destroy(); e ? erro(e) : ok(); };
    s.setTimeout(6000, () => f(new Error('tempo esgotado (impressora não respondeu)')));
    s.on('error', f); s.connect(9100, ip, () => { s.write(buf, () => setTimeout(() => f(null), 400)); });
  });
}

async function configurar() {
  console.log('\n=== Configuração do programa de impressão ===\n');
  const api = (await perguntar('Endereço do sistema [Enter = ' + API_PADRAO + ']: ')) || API_PADRAO;
  const email = await perguntar('E-mail do dono/gerente do restaurante: '), senha = await perguntar('Senha (não fica gravada): ');
  const lg = await http(api + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha }) });
  if (!lg.ok) { console.log('Não entrou: ' + (lg.mensagem || 'erro ' + lg._h)); return; }
  const ch = await http(api + '/painel/atend-imp-chave', { headers: { Authorization: 'Bearer ' + lg.token } });
  if (!ch.ok) { console.log('Não consegui a chave: ' + (ch.mensagem || 'erro ' + ch._h)); return; }
  const old = lerCfg() || {};
  const impressoras = await escolherImpressoras(old.impressoras || {});
  const cfg = { api, cli: ch.cli, chave: ch.chave, intervaloSeg: 3, codepage: 3, semAcento: true, impressoras };
  fs.writeFileSync(CFG_FILE, JSON.stringify(cfg, null, 2)); console.log('\nPronto! Gravei o config.json. IPs das impressoras:', JSON.stringify(cfg.impressoras));
}

/* instalador baixado no painel: a chave da loja já vem nele, então não pede login */
async function instalar(cli, chave) {
  if (!cli || !chave) { console.log('Instalador incompleto. Baixe de novo no painel.'); process.exit(1); }
  const old = lerCfg() || {};
  const impressoras = await escolherImpressoras(old.impressoras || {});
  fs.writeFileSync(CFG_FILE, JSON.stringify({ api: API_PADRAO, cli, chave, intervaloSeg: 3, codepage: 3, semAcento: true, impressoras }, null, 2));
  console.log('\nImpressoras gravadas: ' + JSON.stringify(impressoras));
}

/* procura impressoras de rede (porta 9100) nas redes deste computador */
function portaAberta(ip) {
  return new Promise(ok => { const s = new net.Socket(); const f = v => { s.destroy(); ok(v); }; s.setTimeout(700, () => f(false)); s.on('error', () => f(false)); s.connect(9100, ip, () => f(true)); });
}
async function procurar() {
  const bases = new Set();
  Object.values(os.networkInterfaces()).forEach(l => (l || []).forEach(n => { if (n.family === 'IPv4' && !n.internal && !n.address.startsWith('169.254.')) bases.add(n.address.split('.').slice(0, 3).join('.')); }));
  const achadas = [];
  for (const b of bases) {
    const r = await Promise.all(Array.from({ length: 254 }, (_, i) => b + '.' + (i + 1)).map(ip => portaAberta(ip).then(v => v ? ip : null)));
    achadas.push(...r.filter(Boolean));
  }
  return achadas;
}
async function escolherImpressoras(old) {
  console.log('\nProcurando impressoras na rede...');
  const achadas = await procurar();
  if (achadas.length) { console.log('Impressoras encontradas:'); achadas.forEach((ip, i) => console.log('  ' + (i + 1) + ') ' + ip)); }
  else console.log('Nenhuma encontrada. A impressora precisa estar ligada e na rede (cabo ou Wi-Fi); impressora só por USB não funciona com este programa.');
  const pede = async (nome, padrao) => {
    for (;;) {
      const r = await perguntar('Impressora da ' + nome + (achadas.length ? ' (número da lista ou IP)' : ' (IP)') + (padrao ? ' [Enter = ' + padrao + ']' : '') + ': ');
      if (!r && padrao) return padrao;
      if (r.toLowerCase() === 'sair') { console.log('Instalação cancelada. Ligue a impressora na rede e rode de novo.'); process.exit(1); }
      if (/^\d+$/.test(r) && achadas[+r - 1]) return achadas[+r - 1];
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(r)) return r;
      console.log('Não entendi. Digite o número da lista ou o IP (ex.: 192.168.0.50), ou "sair" para cancelar.');
    }
  };
  const cozinha = await pede('COZINHA', old.cozinha || achadas[0] || '');
  /* sem impressora própria, bar e caixa saem na da cozinha (setor sem impressora perderia o pedido) */
  const bar = await pede('BAR', old.bar || cozinha), caixa = await pede('CAIXA', old.caixa || cozinha);
  return { cozinha, bar, caixa };
}

async function teste(setor) {
  const cfg = lerCfg() || { impressoras: {} }, ip = cfg.impressoras[setor];
  if (!ip) { console.log('Sem impressora para "' + setor + '". Rode a configuração ou use: cozinha, bar ou caixa'); return; }
  const p = { setor, lab: 'TESTE', empresa: 'Teste de impressao', mesa: '8', modo: 'mesa', nome: 'Cliente Teste', joia: '10', atend: 'Teste', criado: Date.now(), obs: 'Etiqueta de teste', l: [{ nome: 'Agua de coco', qty: 1, adds: [], sab: [] }, { nome: 'Chicken crispy burguer', qty: 2, tam: 'Grande', obs: 'sem cebola', adds: ['Bacon'], sab: [] }] };
  try { await enviar(ip, etiqueta(p, cfg)); console.log('Enviado para ' + setor + ' (' + ip + '). Deve ter saído uma etiqueta de teste.'); } catch (e) { console.log('FALHOU em ' + ip + ': ' + e.message); }
}

async function rodar() {
  const cfg = lerCfg(); if (!cfg || !cfg.chave) { console.log('Falta configurar. Rode:  node giro-impressao.js --configurar'); process.exit(1); }
  log('Programa de impressão ligado. Impressoras: ' + JSON.stringify(cfg.impressoras));
  const feitos = new Set(); let semNet = false;
  for (;;) {
    try {
      const r = await http(cfg.api + '/imp/fila?cli=' + encodeURIComponent(cfg.cli) + '&key=' + encodeURIComponent(cfg.chave));
      if (!r.ok) { log('Fila recusou: ' + (r.mensagem || r._h)); }
      else {
        if (semNet) { log('Conexão voltou.'); semNet = false; }
        const baixa = [];
        for (const j of r.jobs || []) {
          if (feitos.has(j.id)) { baixa.push(j.id); continue; }
          const ip = cfg.impressoras[j.setor];
          if (!ip) { log('Sem impressora para o setor ' + j.setor + ' (pedido ' + j.lab + ') — dando baixa.'); baixa.push(j.id); continue; }
          try { await enviar(ip, etiqueta(Object.assign({}, j.p, { setor: j.setor, lab: j.lab }), cfg)); feitos.add(j.id); baixa.push(j.id); log('Impresso ' + j.setor.toUpperCase() + ' pedido ' + j.lab + ' em ' + ip); }
          catch (e) { log('ERRO ao imprimir ' + j.setor + ' pedido ' + j.lab + ' em ' + ip + ': ' + e.message + ' (tento de novo)'); }
        }
        if (baixa.length) await http(cfg.api + '/imp/ok', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cli: cfg.cli, key: cfg.chave, ids: baixa }) });
        if (feitos.size > 500) feitos.clear();
      }
    } catch (e) { if (!semNet) { log('Sem conexão com o sistema: ' + e.message); semNet = true; } }
    await new Promise(r => setTimeout(r, (cfg.intervaloSeg || 3) * 1000));
  }
}

module.exports = { etiqueta };
if (require.main === module) {
  const a = process.argv.slice(2);
  if (a[0] === '--configurar') configurar(); else if (a[0] === '--instalar') instalar(a[1], a[2]).then(() => process.exit(0)); else if (a[0] === '--teste') teste(a[1] || 'cozinha'); else rodar();
}
