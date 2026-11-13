package br.tec.livefood.pos

import android.app.AlertDialog
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.media.AudioManager
import android.media.ToneGenerator
import android.nfc.NfcAdapter
import android.os.Bundle
import android.os.CountDownTimer
import android.text.InputType
import android.view.View
import android.view.WindowManager
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import org.json.JSONObject

/** Tela da cobrança: mostra o valor, as mensagens da maquininha, o QR do Pix e o resultado. */
class CobrancaActivity : AppCompatActivity(), Tela {

    companion object {
        const val FORMA = "forma"
        const val VALOR = "valor"
        const val RESULTADO = "resultado"
    }

    private lateinit var forma: Forma
    private var valor = 0L
    private var trabalhando = false
    private var venda: Venda? = null
    private var relogio: CountDownTimer? = null
    private var leitorNfc = false
    private var aoTocar: (() -> Unit)? = null

    private lateinit var icone: TextView
    private lateinit var msg: TextView
    private lateinit var qr: ImageView
    private lateinit var tempo: TextView
    private lateinit var botoes: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        forma = Forma.de(intent.getStringExtra(FORMA)) ?: Forma.CARTAO
        valor = intent.getLongExtra(VALOR, 0L)

        val col = Ui.coluna(this)
        col.addView(Ui.texto(this, if (forma == Forma.PIX) "Cobrança no Pix" else "Cobrança no ${forma.titulo.lowercase()}", 20f, true, Ui.SUAVE))
        col.addView(Ui.texto(this, Ui.reais(valor), 44f, true, Ui.LARANJA), Ui.linha(this, col, 4))
        if (!Pagamento.motor.deVerdade) col.addView(Ui.texto(this, "MODO DE TESTE · nada é cobrado de verdade", 13f, true, Ui.VERMELHO), Ui.linha(this, col, 2))
        icone = Ui.texto(this, "💳", 64f)
        col.addView(icone, Ui.linha(this, col, 16))
        msg = Ui.texto(this, "Preparando…", 22f, true)
        col.addView(msg, Ui.linha(this, col, 8))
        qr = ImageView(this).apply { visibility = View.GONE; adjustViewBounds = true }
        col.addView(qr, LinearLayout.LayoutParams(Ui.dp(this, 260), Ui.dp(this, 260)).apply {
            topMargin = Ui.dp(this@CobrancaActivity, 10); gravity = android.view.Gravity.CENTER_HORIZONTAL
        })
        tempo = Ui.texto(this, "", 16f, false, Ui.SUAVE).apply { visibility = View.GONE }
        col.addView(tempo, Ui.linha(this, col, 4))
        botoes = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        col.addView(botoes, Ui.linha(this, col, 20))
        setContentView(ScrollView(this).apply { setBackgroundColor(Color.WHITE); addView(col) })

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() = sair()
        })

        if (!Pagamento.motor.ativo()) pedirAtivacao() else iniciar()
    }

    private fun iniciar() {
        venda = null; trabalhando = true
        icone.text = if (forma == Forma.PIX) "▦" else "💳"
        qr.visibility = View.GONE; tempo.visibility = View.GONE
        msg.setTextColor(Ui.TEXTO)
        mensagem(if (forma == Forma.PIX) "Gerando o QR Code…" else "Aproxime, insira ou passe o cartão")
        mostrarBotoes(listOf(Triple("Cancelar", Ui.CINZA, ::sair)))
        Pagamento.motor.cobrar(forma, valor, this)
    }

    private fun pedirAtivacao() {
        val campo = EditText(this).apply { hint = "Código de ativação"; inputType = InputType.TYPE_CLASS_TEXT }
        AlertDialog.Builder(this)
            .setTitle("Ativar a maquininha")
            .setMessage("Digite o Código de Ativação do estabelecimento (fica no portal da Vileve, nos detalhes do estabelecimento).")
            .setView(campo).setCancelable(false)
            .setPositiveButton("Ativar") { _, _ ->
                mensagem("Ativando a maquininha…")
                Pagamento.motor.ativar(campo.text.toString().trim()) { e ->
                    runOnUiThread { if (e == null) iniciar() else erro("Não ativou: $e") }
                }
            }
            .setNegativeButton("Voltar") { _, _ -> devolver(JSONObject().put("ok", false).put("cancelado", true).put("msg", "Maquininha não ativada.")) }
            .show()
    }

    private fun mostrarBotoes(lista: List<Triple<String, Int, () -> Unit>>) {
        botoes.removeAllViews()
        lista.forEach { (t, cor, acao) ->
            botoes.addView(Ui.botao(this, t, cor, if (cor == Ui.CINZA) Ui.TEXTO else Color.WHITE) { acao() }, Ui.linha(this, botoes, 10))
        }
    }

    // ── modo de teste: lê um cartão de verdade pelo NFC (só para sentir o fluxo; nada é cobrado) ──
    override fun esperarCartao(aoLer: () -> Unit) = runOnUiThread {
        val nfc = NfcAdapter.getDefaultAdapter(this)
        var lido = false
        val seguir = {
            if (!lido) {
                lido = true; pararNfc()
                tempo.visibility = View.GONE
                runCatching { (getSystemService(VIBRATOR_SERVICE) as? android.os.Vibrator)?.vibrate(150) }
                runCatching { ToneGenerator(AudioManager.STREAM_NOTIFICATION, 90).startTone(ToneGenerator.TONE_PROP_BEEP, 180) }
                mensagem("Cartão lido ✓")
                mostrarBotoes(listOf(Triple("Cancelar", Ui.CINZA, ::sair)))
                aoLer()
            }
        }
        val botoesTeste = mutableListOf<Triple<String, Int, () -> Unit>>()
        if (nfc != null && nfc.isEnabled) {
            icone.text = "📶"
            mensagem("Encoste o cartão atrás do celular")
            aoTocar = seguir
            ligarNfc()
        } else {
            mensagem(if (nfc == null) "Este celular não lê cartão (sem NFC). Use o botão abaixo." else "Ligue o NFC do celular para encostar o cartão, ou use o botão abaixo.")
        }
        botoesTeste.add(Triple("Simular sem cartão (teste)", Ui.LARANJA) { seguir() })
        botoesTeste.add(Triple("Cancelar", Ui.CINZA, ::sair))
        mostrarBotoes(botoesTeste)
    }

    /** O leitor só pode ser ligado com a tela à frente (por isso também é ligado no onResume). */
    private fun ligarNfc() {
        val cb = aoTocar ?: return
        if (leitorNfc || !lifecycle.currentState.isAtLeast(androidx.lifecycle.Lifecycle.State.RESUMED)) return
        val nfc = NfcAdapter.getDefaultAdapter(this) ?: return
        val r = runCatching {
            val extras = android.os.Bundle().apply { putInt(NfcAdapter.EXTRA_READER_PRESENCE_CHECK_DELAY, 250) }
            nfc.enableReaderMode(this, { _ -> runOnUiThread { cb() } },
                NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_NFC_B or NfcAdapter.FLAG_READER_NFC_F or
                    NfcAdapter.FLAG_READER_NFC_V or NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK, extras)
        }
        leitorNfc = r.isSuccess
        // mostra na tela se o leitor ligou (ajuda a descobrir problema no teste)
        tempo.visibility = View.VISIBLE
        tempo.text = if (r.isSuccess) "📶 Leitor de cartão ligado · encoste no meio das costas do celular e segure 2 segundos"
                     else "Leitor de cartão não ligou (${r.exceptionOrNull()?.javaClass?.simpleName}). Use o botão abaixo."
    }

    private fun pararNfc() {
        aoTocar = null
        if (!leitorNfc) return
        leitorNfc = false
        runCatching { NfcAdapter.getDefaultAdapter(this)?.disableReaderMode(this) }
    }

    override fun onResume() {
        super.onResume()
        ligarNfc()
    }

    override fun onPause() {
        if (leitorNfc) { leitorNfc = false; runCatching { NfcAdapter.getDefaultAdapter(this)?.disableReaderMode(this) } }   // volta a ligar no onResume
        super.onPause()
    }

    private fun sair() {
        pararNfc()
        if (venda != null) { concluir(); return }
        if (trabalhando) Pagamento.motor.abortar()   // sempre abortar ao sair (exigência do kit)
        trabalhando = false
        devolver(JSONObject().put("ok", false).put("cancelado", true).put("msg", "Cobrança cancelada."))
    }

    private fun concluir() {
        val v = venda ?: return
        devolver(JSONObject().put("ok", true).put("venda", v.json()))
    }

    private fun devolver(o: JSONObject) {
        relogio?.cancel()
        setResult(RESULT_OK, Intent().putExtra(RESULTADO, o.toString()))
        finish()
    }

    // ── Tela (chamado pelo motor) ──
    override fun mensagem(texto: String) = runOnUiThread { if (texto.isNotBlank()) msg.text = texto }

    override fun mostrarPix(qr: String?, expiraEm: Long?) = runOnUiThread {
        icone.text = "▦"
        msg.text = "Peça para o cliente ler o QR Code"
        if (!qr.isNullOrBlank()) {
            this.qr.setImageBitmap(desenharQr(qr, Ui.dp(this, 260)))
            this.qr.visibility = View.VISIBLE
        }
        relogio?.cancel()
        if (expiraEm != null && expiraEm > System.currentTimeMillis()) {
            tempo.visibility = View.VISIBLE
            relogio = object : CountDownTimer(expiraEm - System.currentTimeMillis(), 1000) {
                override fun onTick(ms: Long) { val s = ms / 1000; tempo.text = "Vale por mais %d:%02d".format(s / 60, s % 60) }
                override fun onFinish() { tempo.text = "Conferindo o pagamento…" }
            }.start()
        }
    }

    override fun escolher(titulo: String, opcoes: List<String>, resposta: (Int) -> Unit) = runOnUiThread {
        AlertDialog.Builder(this).setTitle(titulo).setCancelable(false)
            .setItems(opcoes.toTypedArray()) { _, i -> resposta(i) }.show()
    }

    override fun digitar(titulo: String, numerico: Boolean, resposta: (String?) -> Unit) = runOnUiThread {
        val campo = EditText(this).apply {
            inputType = if (numerico) InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD else InputType.TYPE_CLASS_TEXT
            textSize = 24f
        }
        AlertDialog.Builder(this).setTitle(titulo).setView(campo).setCancelable(false)
            .setPositiveButton("Confirmar") { _, _ -> resposta(campo.text.toString()) }
            .setNegativeButton("Cancelar") { _, _ -> resposta(null) }.show()
    }

    override fun aprovado(venda: Venda) = runOnUiThread {
        this.venda = venda; trabalhando = false
        relogio?.cancel()
        qr.visibility = View.GONE; tempo.visibility = View.GONE
        icone.text = "✅"
        msg.setTextColor(Ui.VERDE)
        msg.text = "Pagamento aprovado!"
        val lista = mutableListOf<Triple<String, Int, () -> Unit>>(Triple("Concluir", Ui.VERDE, ::concluir))
        if (venda.forma != Forma.PIX.codigo && Pagamento.motor.imprime) lista.add(Triple("Imprimir via do cliente", Ui.CINZA) {
            mensagem("Imprimindo a via do cliente…")
            Pagamento.motor.reimprimir(Via.CLIENTE) { e -> mensagem(if (e == null) "Pagamento aprovado!" else e) }
        })
        mostrarBotoes(lista)
    }

    override fun erro(texto: String) = runOnUiThread {
        pararNfc()
        trabalhando = false
        relogio?.cancel()
        qr.visibility = View.GONE; tempo.visibility = View.GONE
        icone.text = "⚠️"
        msg.setTextColor(Ui.VERMELHO)
        msg.text = texto
        mostrarBotoes(listOf(
            Triple("Tentar de novo", Ui.LARANJA, ::iniciar),
            Triple("Voltar", Ui.CINZA, ::sair),
        ))
    }

    private fun desenharQr(conteudo: String, tam: Int): Bitmap {
        val m = QRCodeWriter().encode(conteudo, BarcodeFormat.QR_CODE, tam, tam)
        val b = Bitmap.createBitmap(tam, tam, Bitmap.Config.RGB_565)
        for (x in 0 until tam) for (y in 0 until tam) b.setPixel(x, y, if (m[x, y]) Color.BLACK else Color.WHITE)
        return b
    }

    override fun onDestroy() {
        relogio?.cancel()
        super.onDestroy()
    }
}
