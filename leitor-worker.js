/* LiveFood · leitura de QR e código de barras em SEGUNDO PLANO.
   A página manda um quadro da câmera; a conta pesada roda aqui, fora da tela, para a imagem da câmera não travar em aparelho lento. */
importScripts('zxing.js?v=2');
var Z = self.ZXing, rapido = null, forte = null;
function leitor(formatos, esforco) {
  var h = new Map(); h.set(Z.DecodeHintType.POSSIBLE_FORMATS, formatos); if (esforco) h.set(Z.DecodeHintType.TRY_HARDER, true);
  var r = new Z.MultiFormatReader(); r.setHints(h); return r;
}
try {
  rapido = leitor([Z.BarcodeFormat.QR_CODE], false);
  forte = leitor([Z.BarcodeFormat.QR_CODE, Z.BarcodeFormat.CODE_128, Z.BarcodeFormat.CODE_39, Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.ITF], true);
  postMessage({ pronto: 1 });
} catch (e) { postMessage({ falha: String((e && e.message) || e) }); }
onmessage = function (ev) {
  var d = ev.data || {}, t0 = Date.now(), txt = '';
  try {
    var px = new Uint8ClampedArray(d.buf), n = d.w * d.h, lum = new Uint8ClampedArray(n), i, j;
    for (i = 0, j = 0; i < n; i++, j += 4) lum[i] = (px[j] * 77 + px[j + 1] * 150 + px[j + 2] * 29) >> 8;
    var fonte = new Z.RGBLuminanceSource(lum, d.w, d.h);
    var bin = d.n % 2 ? new Z.HybridBinarizer(fonte) : new Z.GlobalHistogramBinarizer(fonte);
    txt = (d.forte ? forte : rapido).decodeWithState(new Z.BinaryBitmap(bin)).getText() || '';
  } catch (e) {}
  postMessage({ txt: txt, ms: Date.now() - t0 });
};
