/* GIRO OS — programa de impressão do restaurante (v1)
   Busca a fila de etiquetas no Worker e imprime direto nas impressoras: de rede (porta 9100) ou ligadas neste
   computador pelo cabo USB. No config.json, a impressora de cada setor é:
     um IP (192.168.0.50)                 -> impressora de rede
     USB:VID_0416&PID_5011#83700000000    -> impressora USB comum (o Windows mostra como "Suporte de impressão USB");
                                             os bytes vão direto para ela, sem instalar driver nem criar impressora no Windows
     uma porta (COM4)                     -> impressora que aparece como porta serial
   Usos:
     node giro-impressao.js              -> fica rodando e imprimindo
     node giro-impressao.js --configurar -> pede e-mail/senha do dono UMA vez e grava a chave (a senha não é guardada)
     node giro-impressao.js --teste cozinha   (ou bar / caixa) -> imprime uma etiqueta de teste naquela impressora
     node giro-impressao.js --balanca [COM5]  -> só a balança do buffet: acha a porta e mostra o peso na tela
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
  b.ln(setor.split('').join(' ') + (p.reimp ? '  -  2a VIA' : ''));
  /* (250) ficha do bar dividida: BEBIDA PRONTA / BEBIDA DE PREPARO logo abaixo do setor */
  if (p.grupo === 'pronta' || p.grupo === 'preparo') b.size(1, 2).ln(p.grupo === 'preparo' ? 'BEBIDA DE PREPARO' : 'BEBIDA PRONTA').size(1, 1);
  b.bold(false).align(0).ln(tr);
  const local = p.mesa ? ((p.modo === 'balcao' ? 'BALCAO ' : 'MESA ') + p.mesa) : (p.modo === 'balcao' ? 'BALCAO' : 'CLIENTE ' + (p.joia || ''));
  /* (335) mesa com grupo (Mesa bistro, Mesa baixa...): número grande em bloco preto e o grupo ao lado; se não couber, o grupo vai embaixo */
  const gMesa = (p.mesa && p.modo !== 'balcao' && p.mg) ? String(p.mg).toUpperCase().slice(0, 30) : '', nMesa = String(p.mesa || '');
  /* (336) morador por apartamento (link /ap): AP grande em bloco preto com a palavra ao lado e o nome de quem pediu logo abaixo */
  const nAp = String(p.ap || '').toUpperCase();
  if (nAp && nAp.length <= 6) {
    const tAp = p.apTorre ? 'TORRE ' + String(p.apTorre).toUpperCase() : 'APARTAMENTO';   /* (337) com torre: "TORRE B" ao lado do AP */
    b.align(1);
    if ((nAp.length + 2) * 4 + 2 + tAp.length <= COLS) b.inv(true).bold(true).size(4, 4).txt(' ' + nAp + ' ').inv(false).size(1, 2).txt('  ' + tAp).size(1, 1).bold(false).raw(10);
    else b.inv(true).bold(true).size(4, 4).ln(' ' + nAp + ' ').inv(false).size(1, 2).ln(tAp).size(1, 1).bold(false);
    if (p.apNome) { b.bold(true).size(2, 2); quebra(String(p.apNome).toUpperCase(), Math.floor(COLS / 2)).forEach(l => b.ln(l)); b.size(1, 1).bold(false); }
    b.align(0);
  } else if (gMesa && nMesa.length <= 4) {
    const larg = (nMesa.length + 2) * 4 + 2 + gMesa.length;
    b.align(1);
    if (larg <= COLS) b.inv(true).bold(true).size(4, 4).txt(' ' + nMesa + ' ').inv(false).size(1, 2).txt('  ' + gMesa).size(1, 1).bold(false).raw(10);
    else b.inv(true).bold(true).size(4, 4).ln(' ' + nMesa + ' ').inv(false).size(1, 2).ln(gMesa).size(1, 1).bold(false);
    b.align(0);
  } else b.align(1).inv(true).bold(true).size(2, 3).ln(' ' + local + ' ').size(1, 1).inv(false).bold(false).align(0);
  if (p.copos > 0) b.align(1).bold(true).size(2, 2).ln('COPOS: ' + p.copos).size(1, 1).bold(false).align(0);   /* (250) copos que o garçom pediu */
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
  /* QR com o mesmo número: a câmera da maquininha lê melhor que as barras */
  {
    const q = bytesTxt(cod, cfg), nq = q.length + 3;
    b.raw(0x1D, 0x28, 0x6B, 4, 0, 0x31, 0x41, 0x32, 0);          /* QR modelo 2 */
    b.raw(0x1D, 0x28, 0x6B, 3, 0, 0x31, 0x43, 9);                /* tamanho do ponto */
    b.raw(0x1D, 0x28, 0x6B, 3, 0, 0x31, 0x45, 0x31);             /* correção de erro M */
    b.raw(0x1D, 0x28, 0x6B, nq & 255, nq >> 8, 0x31, 0x50, 0x30, ...q);
    b.raw(0x1D, 0x28, 0x6B, 3, 0, 0x31, 0x51, 0x30).raw(10);
  }
  b.raw(0x1D, 0x68, 70, 0x1D, 0x77, 2, 0x1D, 0x48, 0, 0x1D, 0x6B, 73, cod.length + 2, 0x7B, 0x42, ...bytesTxt(cod, cfg)).raw(10);
  b.bold(true).size(1, 2).ln(String(p.lab)).size(1, 1).bold(false);
  b.raw(10, 10, 10, 0x1D, 0x56, 66, 3);   /* avança e corta */
  return Buffer.from(b.b);
}

/* (309) TICKET DO CLIENTE (setor caixa, vindo do totem): senha grande, itens com preço (pronto x preparo separados quando o pedido é misto), total, pagamento e o que o cliente deve fazer.
   Leva o mesmo código de barras da comanda da cozinha, para o operador conferir um papel com o outro. Programa instalado antes do 309 não conhece este formato e imprime a ficha CAIXA comum. */
function ticketCliente(p, cfg) {
  const b = new Buf(cfg), tr = '-'.repeat(COLS), par = (a, d) => a + ' '.repeat(Math.max(1, COLS - a.length - d.length)) + d;
  b.raw(0x1B, 0x40, 0x1B, 0x74, cfg.codepage == null ? 3 : cfg.codepage);
  b.align(1).bold(true).size(1, 2); quebra(p.empresa || '', COLS).forEach(l => b.ln(l)); b.size(1, 1);
  b.ln('T I C K E T   D O   C L I E N T E').bold(false).align(0).ln(tr);
  b.align(1).inv(true).bold(true).size(2, 3).ln(' SENHA ' + p.lab + ' ').size(1, 1).inv(false).bold(false).align(0);
  b.ln(par(p.modo === 'levar' ? 'Para levar' : (p.modo === 'aqui' ? 'Consumir aqui' : ''), dataHora(p.criado)));
  if (p.cliente) b.bold(true).ln('Cliente: ' + p.cliente).bold(false);
  b.ln(tr);
  const item = l => {
    const pre = l.qty + 'x ', preco = l.preco || '', nm = quebra(String(l.nome), COLS - pre.length - preco.length - 1);
    b.bold(true).ln(par(pre + nm[0], preco)).bold(false); nm.slice(1).forEach(x => b.ln(' '.repeat(pre.length) + x));
    if (l.desc) quebra(l.desc, COLS - 3).forEach(x => b.ln('   ' + x));
  };
  const itens = p.l || [];
  if (p.misto) {
    const pro = itens.filter(l => l.grupo === 'pronto'), prep = itens.filter(l => l.grupo !== 'pronto');
    if (pro.length) { b.align(1).bold(true).ln('== PRONTO PARA RETIRAR ==').bold(false).align(0); pro.forEach(item); }
    if (prep.length) { b.align(1).bold(true).ln('== EM PREPARO ==').bold(false).align(0); prep.forEach(item); }
  } else itens.forEach(item);
  b.ln(tr).bold(true).size(1, 2).ln(par('TOTAL', p.total || '')).size(1, 1).bold(false);
  if (p.pagto) b.ln(p.pagto);
  if (p.nsu || p.aut) b.ln('NSU ' + (p.nsu || '-') + '  AUT ' + (p.aut || '-'));
  b.ln(tr).align(1).bold(true);
  if (p.soPronto) b.size(1, 2).ln('PEDIDO PRONTO').size(1, 1).ln('Entregue este ticket no balcao').ln('para retirar');
  else { b.size(1, 2).ln('AGUARDE A SUA SENHA').size(1, 1).ln('Retire no balcao quando for chamada'); if (p.misto) b.ln('Itens prontos: retire ja'); b.ln('Guarde este ticket'); }
  b.bold(false);
  if (p.sim) b.raw(10).ln('*** SIMULACAO - nada foi cobrado ***');
  const cod = String(p.lab).replace(/[^0-9A-Za-z-]/g, '');
  b.raw(10, 0x1D, 0x68, 70, 0x1D, 0x77, 2, 0x1D, 0x48, 0, 0x1D, 0x6B, 73, cod.length + 2, 0x7B, 0x42, ...bytesTxt(cod, cfg)).raw(10);
  b.bold(true).size(1, 2).ln(String(p.lab)).size(1, 1).bold(false);
  b.raw(10, 10, 10, 0x1D, 0x56, 66, 3);   /* avança e corta */
  return Buffer.from(b.b);
}

/* (310) COMANDA DO BUFFET POR QUILO (setor caixa, vinda da tela da balança): número grande, o peso e o valor do prato, as bebidas,
   o total e o código de barras — o mesmo número que o Atendimento bipa para lançar mais bebidas e para fechar a conta. */
function comandaBuffet(p, cfg) {
  const b = new Buf(cfg), tr = '-'.repeat(COLS), par = (a, d) => a + ' '.repeat(Math.max(1, COLS - a.length - d.length)) + d;
  b.raw(0x1B, 0x40, 0x1B, 0x74, cfg.codepage == null ? 3 : cfg.codepage);
  b.align(1).bold(true).size(1, 2); quebra(p.empresa || '', COLS).forEach(l => b.ln(l)); b.size(1, 1);
  b.ln('C O M A N D A   D O   B U F F E T').bold(false).align(0).ln(tr);
  b.align(1).inv(true).bold(true).size(2, 3).ln(' COMANDA ' + p.lab + ' ').size(1, 1).inv(false).bold(false).align(0);
  b.ln(par('', dataHora(p.criado))).ln(tr);
  (p.l || []).forEach(l => {
    const pre = l.qty + 'x ', preco = l.preco || '', nm = quebra(String(l.nome), COLS - pre.length - preco.length - 1);
    b.bold(true).ln(par(pre + nm[0], preco)).bold(false); nm.slice(1).forEach(x => b.ln(' '.repeat(pre.length) + x));
    if (l.desc) quebra(l.desc, COLS - 3).forEach(x => b.ln('   ' + x));
  });
  b.ln(tr).bold(true).size(1, 2).ln(par('TOTAL', p.total || '')).size(1, 1).bold(false);
  b.ln(tr).align(1).bold(true).size(1, 2).ln('PAGUE NO CAIXA AO SAIR').size(1, 1).bold(false);
  b.ln('Quer mais uma bebida? Apresente esta comanda.').ln('Guarde este papel.');
  /* (311) QR da conta: o cliente aponta a câmera do celular, vê a comanda e paga por Pix (quando a loja recebe Pix pelo sistema) */
  if (p.qr) {
    const d = Buffer.from(String(p.qr), 'latin1'), n = d.length + 3;
    b.raw(10).bold(true).ln(p.pix ? 'PAGUE PELO CELULAR COM PIX' : 'VEJA A SUA CONTA NO CELULAR').bold(false).ln('Aponte a camera para o codigo abaixo');
    b.raw(0x1D, 0x28, 0x6B, 4, 0, 0x31, 0x41, 0x32, 0);          /* QR modelo 2 */
    b.raw(0x1D, 0x28, 0x6B, 3, 0, 0x31, 0x43, 6);                /* tamanho do ponto */
    b.raw(0x1D, 0x28, 0x6B, 3, 0, 0x31, 0x45, 0x31);             /* correção de erro M */
    b.raw(0x1D, 0x28, 0x6B, n & 255, n >> 8, 0x31, 0x50, 0x30, ...d);   /* guarda o texto */
    b.raw(0x1D, 0x28, 0x6B, 3, 0, 0x31, 0x51, 0x30).raw(10);     /* imprime */
  }
  /* código de barras com zeros à esquerda (000123): o leitor do caixa precisa de pelo menos 6 números para reconhecer a comanda */
  const cod = /^\d+$/.test(String(p.lab)) ? String(p.lab).padStart(6, '0') : String(p.lab).replace(/[^0-9A-Za-z-]/g, '');
  b.raw(10, 0x1D, 0x68, 70, 0x1D, 0x77, 2, 0x1D, 0x48, 0, 0x1D, 0x6B, 73, cod.length + 2, 0x7B, 0x42, ...bytesTxt(cod, cfg)).raw(10);
  b.bold(true).size(1, 2).ln(String(p.lab)).size(1, 1).bold(false);
  b.raw(10, 10, 10, 0x1D, 0x56, 66, 3);   /* avança e corta */
  return Buffer.from(b.b);
}

/* impressora no cabo USB: o Windows mostra como porta COM e os bytes vão direto para ela, sem passar pela rede */
const ehCom = d => /^COM\d+$/i.test(String(d || ''));
function enviarCom(porta, buf) {
  return new Promise((ok, erro) => {
    let fim = false; const f = e => { if (fim) return; fim = true; clearTimeout(t); e ? erro(e) : ok(); };
    const t = setTimeout(() => f(new Error('tempo esgotado (impressora no cabo não aceitou)')), 8000);
    fs.open('\\\\.\\' + String(porta).toUpperCase(), 'w', (e, fd) => {
      if (e) return f(new Error(e.code === 'ENOENT' ? 'porta ' + porta + ' não existe (impressora desligada ou cabo solto)' : e.message));
      fs.write(fd, buf, 0, buf.length, null, e2 => fs.close(fd, () => f(e2 || null)));
    });
  });
}
/* impressora USB comum: o Windows a expõe como um "arquivo de aparelho" e aceita os bytes direto. O Node não consegue abrir
   esse tipo de caminho, então a escrita é feita por um ajudante em PowerShell (usb-envia.ps1, criado ao lado do programa). */
const GUID_USB = '{28d78fad-5a12-11d1-ae5b-0000f803a8c2}';
const ehUsb = d => /^USB:/i.test(String(d || ''));
const AJUDANTE = path.join(__dirname, 'usb-envia.ps1');
const AJUDANTE_TXT = [
  'param([string]$Caminho, [string]$Arquivo)',
  "$ErrorActionPreference = 'Stop'",
  "Add-Type -TypeDefinition @'",
  'using System; using System.Runtime.InteropServices; using Microsoft.Win32.SafeHandles;',
  'public static class LfUsb {',
  '  [DllImport("kernel32.dll", SetLastError=true, CharSet=CharSet.Unicode)]',
  '  public static extern SafeFileHandle CreateFile(string n, uint acc, uint share, IntPtr sec, uint disp, uint flags, IntPtr tpl);',
  '  [DllImport("kernel32.dll", SetLastError=true)]',
  '  public static extern bool WriteFile(SafeFileHandle h, byte[] b, uint n, out uint w, IntPtr o);',
  '  public static string Envia(string caminho, byte[] d) {',
  '    SafeFileHandle h = CreateFile(caminho, 0x40000000, 3, IntPtr.Zero, 3, 0, IntPtr.Zero);',
  '    if (h.IsInvalid) return "ERRO abrir " + Marshal.GetLastWin32Error();',
  '    uint w; bool ok = WriteFile(h, d, (uint)d.Length, out w, IntPtr.Zero); int e = Marshal.GetLastWin32Error(); h.Close();',
  '    return (ok && w == d.Length) ? "OK" : ("ERRO escrever " + e);',
  '  }',
  '}',
  "'@",
  '[LfUsb]::Envia($Caminho, [IO.File]::ReadAllBytes($Arquivo))',
  ''].join('\r\n');
let nUsb = 0;
function enviarUsb(dest, buf) {
  return new Promise((ok, erro) => {
    const caminho = '\\\\?\\USB#' + String(dest).slice(4) + '#' + GUID_USB, tmp = path.join(os.tmpdir(), 'lf-imp-' + process.pid + '-' + (++nUsb) + '.bin');
    try { if (!fs.existsSync(AJUDANTE) || fs.readFileSync(AJUDANTE, 'utf8') !== AJUDANTE_TXT) fs.writeFileSync(AJUDANTE, AJUDANTE_TXT); fs.writeFileSync(tmp, buf); } catch (e) { return erro(e); }
    require('child_process').execFile('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', AJUDANTE, '-Caminho', caminho, '-Arquivo', tmp], { timeout: 20000, windowsHide: true }, (e, out) => {
      try { fs.unlinkSync(tmp); } catch (x) {}
      const r = String(out || '').trim();
      if (r === 'OK') return ok();
      erro(new Error(/abrir 2$/.test(r) ? 'impressora USB não encontrada (desligada ou cabo solto)' : (r || (e && e.message) || 'falha ao escrever na impressora USB')));
    });
  });
}
/* impressoras USB comuns ligadas agora neste computador */
function impressorasUsb() {
  if (process.platform !== 'win32') return [];
  try {
    const ps = "Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.Service -eq 'usbprint' } | ForEach-Object { $d=''; try { $d=(Get-PnpDeviceProperty -InstanceId $_.InstanceId -KeyName DEVPKEY_Device_BusReportedDeviceDesc -ErrorAction Stop).Data } catch {}; $_.InstanceId + '|' + $d }";
    const out = require('child_process').execFileSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8', timeout: 20000, windowsHide: true });
    return out.split(/\r?\n/).map(l => { const m = /^USB\\([^|]+)\|(.*)$/i.exec(l.trim()); return m ? { porta: 'USB:' + m[1].replace(/\\/g, '#'), nome: (m[2] || '').trim() || 'impressora USB' } : null; }).filter(Boolean);
  } catch (e) { return []; }
}
/* portas COM deste computador, com o nome que o aparelho informa (ex.: DR800) */
function portasCom() {
  if (process.platform !== 'win32') return [];
  try {
    const ps = "Get-PnpDevice -Class Ports -PresentOnly -ErrorAction SilentlyContinue | ForEach-Object { $d=''; try { $d=(Get-PnpDeviceProperty -InstanceId $_.InstanceId -KeyName DEVPKEY_Device_BusReportedDeviceDesc -ErrorAction Stop).Data } catch {}; $_.FriendlyName + '|' + $d }";
    const out = require('child_process').execFileSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8', timeout: 20000, windowsHide: true });
    return out.split(/\r?\n/).map(l => { const m = /\((COM\d+)\)\|(.*)$/.exec(l.trim()); return m ? { porta: m[1], nome: (m[2] || '').trim() || l.split('(')[0].trim() } : null; }).filter(Boolean);
  } catch (e) { return []; }
}

function enviar(ip, buf) {
  if (ehUsb(ip)) return enviarUsb(ip, buf);
  if (ehCom(ip)) return enviarCom(ip, buf);
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
  fs.writeFileSync(CFG_FILE, JSON.stringify(cfg, null, 2)); console.log('\nPronto! Gravei o config.json. Impressoras:', JSON.stringify(cfg.impressoras));
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
  console.log('\nProcurando impressoras na rede e no cabo USB...');
  const coms = impressorasUsb().concat(portasCom()), nomes = {}; coms.forEach(c => { nomes[c.porta] = c.nome; });
  const achadas = (await procurar()).concat(coms.map(c => c.porta));
  if (achadas.length) { console.log('Impressoras encontradas:'); achadas.forEach((ip, i) => console.log('  ' + (i + 1) + ') ' + ip + (nomes[ip] ? (ehCom(ip) ? '  (porta serial: ' : '  (no cabo USB: ') + nomes[ip] + ')' : '  (na rede)'))); }
  else console.log('Nenhuma encontrada. A impressora precisa estar ligada: na rede (cabo ou Wi-Fi) ou neste computador pelo cabo USB.');
  const pede = async (nome, padrao) => {
    for (;;) {
      const r = await perguntar('Impressora da ' + nome + (achadas.length ? ' (número da lista, IP ou porta COM)' : ' (IP ou porta COM)') + (padrao ? ' [Enter = ' + padrao + ']' : '') + ': ');
      if (!r && padrao) return padrao;
      if (r.toLowerCase() === 'sair') { console.log('Instalação cancelada. Ligue a impressora (na rede ou no cabo USB) e rode de novo.'); process.exit(1); }
      if (/^\d+$/.test(r) && achadas[+r - 1]) return achadas[+r - 1];
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(r)) return r;
      if (ehCom(r)) return r.toUpperCase();
      if (ehUsb(r)) return r;
      console.log('Não entendi. Digite o número da lista, o IP (ex.: 192.168.0.50) ou a porta (ex.: COM4), ou "sair" para cancelar.');
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
  const p = { setor, lab: 'TESTE', empresa: 'Teste de impressao', mesa: '8', mg: 'Mesa bistro', modo: 'mesa', nome: 'Cliente Teste', joia: '10', atend: 'Teste', criado: Date.now(), obs: 'Etiqueta de teste', l: [{ nome: 'Agua de coco', qty: 1, adds: [], sab: [] }, { nome: 'Chicken crispy burguer', qty: 2, tam: 'Grande', obs: 'sem cebola', adds: ['Bacon'], sab: [] }] };
  try { await enviar(ip, etiqueta(p, cfg)); console.log('Enviado para ' + setor + ' (' + ip + '). Deve ter saído uma etiqueta de teste.'); } catch (e) { console.log('FALHOU em ' + ip + ': ' + e.message); }
}

/* ══ BALANÇA (buffet por quilo) ══
   A balança (Urano POP-S, protocolo USE-P2) fica numa porta serial deste computador (cabo USB vira COMn). Ela só responde
   quando o computador pede: manda-se 1 byte ENQ (0x05) e ela devolve o peso em texto, "   0,162 kg ...". 9600, 8 bits, sem paridade.
   Um ajudante em PowerShell (balanca-le.ps1) fica perguntando o peso ~4 vezes por segundo e este programa guarda a última leitura.
   A tela do Buffet e o painel (abertos neste computador) leem o peso em http://127.0.0.1:17865/balanca/peso. Só leitura: nada é
   gravado na balança. */
const BAL_HTTP = 17865, BAL_AJUDANTE = path.join(__dirname, 'balanca-le.ps1');
const BAL_AJUDANTE_TXT = [
  'param([string]$Porta, [int]$Baud = 9600, [int]$Pai = 0, [switch]$Uma)',
  "$ErrorActionPreference = 'Stop'",
  'function Get-Peso($p) {',
  '  $p.DiscardInBuffer(); $p.Write([byte[]](5), 0, 1); Start-Sleep -Milliseconds 220',
  '  $n = $p.BytesToRead; if ($n -le 0) { return $null }',
  '  $b = New-Object byte[] $n; [void]$p.Read($b, 0, $n)',
  "  return -join ($b | ForEach-Object { if ($_ -ge 32 -and $_ -lt 127) { [char]$_ } else { ' ' } })",
  '}',
  'function Test-Pai { if ($Pai -gt 0 -and -not (Get-Process -Id $Pai -ErrorAction SilentlyContinue)) { exit 0 } }',
  '$n = 0',
  'while ($true) {',
  '  $p = $null',
  '  try {',
  "    $p = New-Object System.IO.Ports.SerialPort $Porta, $Baud, 'None', 8, 'One'",
  '    $p.DtrEnable = $true; $p.RtsEnable = $true; $p.ReadTimeout = 500; $p.WriteTimeout = 500; $p.Open()',
  '    while ($true) {',
  '      $t = Get-Peso $p',
  "      if ($t -and $t -match '(-?)\\s*(\\d+[,.]\\d{3})\\s*kg') { [Console]::Out.WriteLine('P ' + $Matches[1] + $Matches[2].Replace(',', '.')) } else { [Console]::Out.WriteLine('S') }",
  '      [Console]::Out.Flush()',
  '      if ($Uma) { $p.Close(); exit 0 }',
  '      $n++; if (($n % 8) -eq 0) { Test-Pai }',
  '    }',
  '  } catch {',
  "    [Console]::Out.WriteLine('E ' + ($_.Exception.Message -replace '\\s+', ' ')); [Console]::Out.Flush()",
  '    try { if ($p) { $p.Close() } } catch {}',
  '    if ($Uma) { exit 1 }',
  '    Start-Sleep -Seconds 2; Test-Pai',
  '  }',
  '}',
  ''].join('\r\n');
const bal = { proc: null, porta: '', kg: null, quando: 0, hist: [], erro: '', quer: false };
function balAjudante() { if (!fs.existsSync(BAL_AJUDANTE) || fs.readFileSync(BAL_AJUDANTE, 'utf8') !== BAL_AJUDANTE_TXT) fs.writeFileSync(BAL_AJUDANTE, BAL_AJUDANTE_TXT); }
function balParar() { bal.quer = false; if (bal.proc) { try { bal.proc.kill(); } catch (e) {} bal.proc = null; } bal.kg = null; bal.hist = []; bal.quando = 0; }
function balIniciar(porta) {
  balParar(); bal.porta = ehCom(porta) ? String(porta).toUpperCase() : ''; bal.erro = '';
  if (!bal.porta || process.platform !== 'win32') return;
  try { balAjudante(); } catch (e) { bal.erro = e.message; return; }
  bal.quer = true;
  const sobe = () => {
    if (!bal.quer) return;
    const pr = require('child_process').spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', BAL_AJUDANTE, '-Porta', bal.porta, '-Pai', String(process.pid)], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    bal.proc = pr;
    readline.createInterface({ input: pr.stdout }).on('line', l => {
      if (l[0] === 'P') { const v = parseFloat(l.slice(2)); if (isFinite(v)) { bal.kg = v; bal.quando = Date.now(); bal.hist.push(v); if (bal.hist.length > 4) bal.hist.shift(); bal.erro = ''; } }
      else if (l[0] === 'E') { const m = l.slice(2); if (m !== bal.erro) log('Balança em ' + bal.porta + ': ' + m); bal.erro = m; }
    });
    pr.on('error', e => { bal.erro = e.message; });
    pr.on('exit', () => { if (bal.proc === pr) { bal.proc = null; if (bal.quer) setTimeout(sobe, 3000); } });
  };
  sobe(); log('Balança: lendo o peso em ' + bal.porta);
}
function balEstado() {
  if (!bal.porta) return { ok: false, erro: 'sem-porta', mensagem: 'A porta da balança ainda não foi escolhida.' };
  if (!bal.quando || Date.now() - bal.quando > 2500) return { ok: false, erro: 'sem-resposta', porta: bal.porta, mensagem: /denied|negado|does not exist|n.o existe/i.test(bal.erro) ? 'A porta ' + bal.porta + ' não abriu (cabo solto ou outro programa usando).' : 'A balança não responde em ' + bal.porta + '. Confira se está ligada e o cabo encaixado.' };
  const h = bal.hist, est = h.length >= 3 && h.slice(-3).every(v => v === h[h.length - 1]);
  return { ok: true, kg: bal.kg, estavel: est, porta: bal.porta };
}
/* pergunta o peso uma vez em cada porta serial (menos as que são impressora) e devolve a primeira que responde como balança */
function balProcurar() {
  const cfg = lerCfg() || {}, usadas = Object.values(cfg.impressoras || {}).map(x => String(x).toUpperCase());
  try { balAjudante(); } catch (e) { return Promise.resolve({ ok: false, mensagem: e.message }); }
  const portas = portasCom().filter(c => usadas.indexOf(c.porta.toUpperCase()) < 0);
  const era = bal.porta; balParar();
  const uma = c => new Promise(r => require('child_process').execFile('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', BAL_AJUDANTE, '-Porta', c.porta, '-Uma'], { timeout: 8000, windowsHide: true }, (e, out) => r(/^P /m.test(String(out || '')))));
  return (async () => {
    for (const c of portas) if (await uma(c)) return { ok: true, porta: c.porta, nome: c.nome, portas };
    if (era) balIniciar(era);
    return { ok: false, portas, mensagem: portas.length ? 'Nenhuma porta respondeu como balança. Confira se ela está ligada.' : 'Nenhuma porta serial encontrada. Ligue o cabo da balança no computador.' };
  })();
}
function balGravar(porta) { const c = lerCfg() || {}; c.balanca = Object.assign({}, c.balanca, { porta: porta || '' }); fs.writeFileSync(CFG_FILE, JSON.stringify(c, null, 2)); balIniciar(porta); }
/* servidor só deste computador (127.0.0.1): a tela do Buffet e o painel leem o peso por aqui */
function balServidor() {
  const origemOk = o => !o || o === 'https://livefood.tec.br' || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
  const srv = require('http').createServer((req, res) => {
    const o = req.headers.origin || '', u = new URL(req.url, 'http://127.0.0.1');
    const cab = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Private-Network': 'true', Vary: 'Origin' };
    if (o && origemOk(o)) cab['Access-Control-Allow-Origin'] = o;
    const fim = (d, st) => { res.writeHead(st || 200, cab); res.end(JSON.stringify(d)); };
    if (!origemOk(o)) return fim({ ok: false, mensagem: 'origem não permitida' }, 403);
    if (req.method === 'OPTIONS') { res.writeHead(204, cab); return res.end(); }
    if (u.pathname === '/balanca/peso') return fim(balEstado());
    if (u.pathname === '/balanca/portas') return fim({ ok: true, porta: bal.porta, portas: portasCom() });
    if (u.pathname === '/balanca/procurar' && req.method === 'POST') return balProcurar().then(r => { if (r.ok) { try { balGravar(r.porta); } catch (e) { return fim({ ok: false, mensagem: e.message }); } } fim(r); });
    if (u.pathname === '/balanca/porta' && req.method === 'POST') {
      let c = ''; req.on('data', x => { c += x; if (c.length > 2000) req.destroy(); });
      return req.on('end', () => { let p = ''; try { p = String(JSON.parse(c || '{}').porta || ''); } catch (e) {} if (p && !ehCom(p)) return fim({ ok: false, mensagem: 'Porta inválida. Exemplo: COM5' }, 400); try { balGravar(p.toUpperCase()); fim({ ok: true, porta: bal.porta }); } catch (e) { fim({ ok: false, mensagem: e.message }, 500); } });
    }
    fim({ ok: false, mensagem: 'não encontrado' }, 404);
  });
  srv.on('error', e => log('Balança: não abri o endereço local ' + BAL_HTTP + ' (' + e.message + ')'));
  srv.listen(BAL_HTTP, '127.0.0.1');
  const c = lerCfg(); if (c && c.balanca && c.balanca.porta) balIniciar(c.balanca.porta);
}
/* node giro-impressao.js --balanca [COM5] -> só a balança: escolhe/procura a porta e mostra o peso na tela (teste) */
async function balTeste(porta) {
  balServidor();
  if (porta) balGravar(String(porta).toUpperCase());
  else if (!bal.porta) { console.log('Procurando a balança nas portas seriais...'); const r = await balProcurar(); if (!r.ok) { console.log(r.mensagem); process.exit(1); } balGravar(r.porta); console.log('Balança encontrada em ' + r.porta); }
  let ant = '';
  setInterval(() => { const e = balEstado(), t = e.ok ? e.kg.toFixed(3).replace('.', ',') + ' kg' + (e.estavel ? '' : '  (variando)') : e.mensagem; if (t !== ant) { console.log(t); ant = t; } }, 300);
}

async function rodar() {
  const cfg = lerCfg(); if (!cfg || !cfg.chave) { console.log('Falta configurar. Rode:  node giro-impressao.js --configurar'); process.exit(1); }
  log('Programa de impressão ligado. Impressoras: ' + JSON.stringify(cfg.impressoras));
  balServidor();
  const feitos = new Set(); let semNet = false;
  for (;;) {
    try {
      const r = await http(cfg.api + '/imp/fila?cli=' + encodeURIComponent(cfg.cli) + '&key=' + encodeURIComponent(cfg.chave) + '&v=309');   /* (250) versão: o servidor manda grupo e copos em campos próprios */
      if (!r.ok) { log('Fila recusou: ' + (r.mensagem || r._h)); }
      else {
        if (semNet) { log('Conexão voltou.'); semNet = false; }
        const baixa = [];
        for (const j of r.jobs || []) {
          if (feitos.has(j.id)) { baixa.push(j.id); continue; }
          const ip = cfg.impressoras[j.setor];
          if (!ip) { log('Sem impressora para o setor ' + j.setor + ' (pedido ' + j.lab + ') — dando baixa.'); baixa.push(j.id); continue; }
          try { await enviar(ip, (j.p && j.p.tipo === 'buffet') ? comandaBuffet(Object.assign({}, j.p, { lab: j.lab }), cfg) : (j.p && j.p.tipo === 'ticket') ? ticketCliente(Object.assign({}, j.p, { lab: j.lab }), cfg) : etiqueta(Object.assign({}, j.p, { setor: j.setor, lab: j.lab }), cfg)); feitos.add(j.id); baixa.push(j.id); log('Impresso ' + j.setor.toUpperCase() + ' pedido ' + j.lab + ' em ' + ip); }
          catch (e) { log('ERRO ao imprimir ' + j.setor + ' pedido ' + j.lab + ' em ' + ip + ': ' + e.message + ' (tento de novo)'); }
        }
        if (baixa.length) await http(cfg.api + '/imp/ok', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cli: cfg.cli, key: cfg.chave, ids: baixa }) });
        if (feitos.size > 500) feitos.clear();
      }
    } catch (e) { if (!semNet) { log('Sem conexão com o sistema: ' + e.message); semNet = true; } }
    await new Promise(r => setTimeout(r, (cfg.intervaloSeg || 3) * 1000));
  }
}

module.exports = { etiqueta, ticketCliente, comandaBuffet, enviar, portasCom, impressorasUsb };
if (require.main === module) {
  const a = process.argv.slice(2);
  if (a[0] === '--configurar') configurar(); else if (a[0] === '--instalar') instalar(a[1], a[2]).then(() => process.exit(0)); else if (a[0] === '--teste') teste(a[1] || 'cozinha'); else if (a[0] === '--balanca') balTeste(a[1]); else rodar();
}
