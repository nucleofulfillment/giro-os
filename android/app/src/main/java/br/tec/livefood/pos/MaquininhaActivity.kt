package br.tec.livefood.pos

import android.app.AlertDialog
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.os.Bundle
import android.text.InputType
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.concurrent.thread

/** Menu "Maquininha": vendas do dia, cancelar venda no cartão, reimprimir, ativar e testar a impressora. */
class MaquininhaActivity : AppCompatActivity() {

    private val motor get() = Pagamento.motor
    private lateinit var info: TextView
    private lateinit var lista: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val col = Ui.coluna(this)
        col.addView(Ui.texto(this, "Maquininha", 26f, true))
        info = Ui.texto(this, "", 15f, false, Ui.SUAVE)
        col.addView(info, Ui.linha(this, col, 6))

        col.addView(Ui.botao(this, "Vendas de hoje") { carregarVendas() }, Ui.linha(this, col, 18))
        lista = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        col.addView(lista, Ui.linha(this, col, 4))
        col.addView(Ui.botao(this, "Reimprimir último comprovante", Ui.CINZA, Ui.TEXTO) { reimprimir() }, Ui.linha(this, col, 12))
        col.addView(Ui.botao(this, "Testar impressora", Ui.CINZA, Ui.TEXTO) { testarImpressora() }, Ui.linha(this, col, 12))
        col.addView(Ui.botao(this, "Atualizar dados da maquininha", Ui.CINZA, Ui.TEXTO) { atualizar() }, Ui.linha(this, col, 12))
        col.addView(Ui.botao(this, "Ativar com código", Ui.CINZA, Ui.TEXTO) { ativar() }, Ui.linha(this, col, 12))
        col.addView(Ui.botao(this, "Voltar ao Atendimento", Ui.LARANJA) { finish() }, Ui.linha(this, col, 24))
        setContentView(ScrollView(this).apply { setBackgroundColor(Color.WHITE); addView(col) })
        mostrarInfo()
    }

    private fun mostrarInfo() {
        val m = motor
        info.text = buildString {
            append(if (m.deVerdade) "Pagamento: Vileve / PayStore" else "MODO DE TESTE (nada é cobrado)")
            append("\nSituação: ").append(if (m.ativo()) "ativada ✓" else "não ativada")
            runCatching { m.modelo() }.getOrNull()?.takeIf { it.isNotBlank() }?.let { append("\nModelo: ").append(it) }
            runCatching { m.serie() }.getOrNull()?.takeIf { it.isNotBlank() }?.let { append("\nNº de série: ").append(it) }
            append("\nApp: ").append(BuildConfig.VERSION_NAME).append(" (").append(BuildConfig.VERSION_CODE).append(")")
        }
    }

    private fun aviso(t: String) = runOnUiThread { Toast.makeText(this, t, Toast.LENGTH_LONG).show() }

    private fun carregarVendas() {
        lista.removeAllViews()
        lista.addView(Ui.texto(this, "Carregando…", 16f))
        motor.vendas { vs, erro ->
            runOnUiThread {
                lista.removeAllViews()
                if (vs == null) { lista.addView(Ui.texto(this, erro ?: "Não consegui ler as vendas.", 16f, cor = Ui.VERMELHO)); return@runOnUiThread }
                val hoje = SimpleDateFormat("yyyyMMdd", Locale.US).format(Date())
                val doDia = vs.filter { SimpleDateFormat("yyyyMMdd", Locale.US).format(Date(it.quando)) == hoje }.sortedByDescending { it.quando }
                if (doDia.isEmpty()) { lista.addView(Ui.texto(this, "Nenhuma venda hoje nesta maquininha.", 16f)); return@runOnUiThread }
                val total = doDia.filter { it.status == "CONFIRMED" && !it.estornada }.sumOf { it.valorCentavos }
                lista.addView(Ui.texto(this, "Total aprovado hoje: ${Ui.reais(total)}", 18f, true), Ui.linha(this, lista, 6))
                val hora = SimpleDateFormat("HH:mm", Locale("pt", "BR"))
                doDia.forEach { v -> lista.addView(cartaoVenda(v, hora.format(Date(v.quando))), Ui.linha(this, lista, 8)) }
            }
        }
    }

    private fun cartaoVenda(v: Venda, hora: String): LinearLayout {
        val c = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val p = Ui.dp(this@MaquininhaActivity, 12); setPadding(p, p, p, p)
            background = android.graphics.drawable.GradientDrawable().apply { setColor(Ui.CINZA); cornerRadius = Ui.dp(this@MaquininhaActivity, 12).toFloat() }
        }
        val forma = Forma.de(v.forma)?.titulo ?: v.forma
        val sit = when {
            v.estornada || v.status == "CANCELLED" -> "cancelada"
            v.status == "CONFIRMED" -> "aprovada"
            v.status == "PENDING" -> "aguardando"
            else -> "não concluída"
        }
        c.addView(Ui.texto(this, "$hora · $forma · ${Ui.reais(v.valorCentavos)}", 18f, true, centro = false))
        c.addView(Ui.texto(this, listOf(sit, v.bandeira, if (v.final4.isNotBlank()) "final ${v.final4}" else "", if (v.nsu.isNotBlank()) "NSU ${v.nsu}" else "")
            .filter { it.isNotBlank() }.joinToString(" · "), 14f, false, Ui.SUAVE, centro = false))
        val podeCancelar = v.status == "CONFIRMED" && !v.estornada && v.forma != Forma.PIX.codigo
        if (podeCancelar) c.addView(Ui.botao(this, "Cancelar esta venda", Ui.VERMELHO) { confirmarEstorno(v) }, Ui.linha(this, c, 8))
        if (v.forma == Forma.PIX.codigo && v.status == "CONFIRMED") c.addView(Ui.texto(this, "Devolução de Pix: pelo painel da Vileve.", 13f, false, Ui.SUAVE, centro = false))
        return c
    }

    private fun confirmarEstorno(v: Venda) {
        AlertDialog.Builder(this)
            .setTitle("Cancelar venda de ${Ui.reais(v.valorCentavos)}?")
            .setMessage("O valor volta para o cartão do cliente. Só dá para cancelar vendas de hoje.")
            .setPositiveButton("Cancelar a venda") { _, _ -> estornar(v) }
            .setNegativeButton("Não", null).show()
    }

    private fun estornar(v: Venda) {
        val janela = AlertDialog.Builder(this).setTitle("Cancelando…").setMessage("Siga as instruções na tela.").setCancelable(false).show()
        motor.estornar(v.chave, object : Tela {
            override fun mensagem(texto: String) = runOnUiThread { janela.setMessage(texto) }
            override fun mostrarPix(qr: String?, expiraEm: Long?) {}
            override fun escolher(titulo: String, opcoes: List<String>, resposta: (Int) -> Unit) = runOnUiThread {
                AlertDialog.Builder(this@MaquininhaActivity).setTitle(titulo).setCancelable(false).setItems(opcoes.toTypedArray()) { _, i -> resposta(i) }.show()
            }
            override fun digitar(titulo: String, numerico: Boolean, resposta: (String?) -> Unit) = runOnUiThread {
                val e = EditText(this@MaquininhaActivity).apply { inputType = if (numerico) InputType.TYPE_CLASS_NUMBER else InputType.TYPE_CLASS_TEXT }
                AlertDialog.Builder(this@MaquininhaActivity).setTitle(titulo).setView(e).setCancelable(false)
                    .setPositiveButton("Confirmar") { _, _ -> resposta(e.text.toString()) }.setNegativeButton("Cancelar") { _, _ -> resposta(null) }.show()
            }
            override fun aprovado(venda: Venda) = runOnUiThread { janela.dismiss(); aviso("Venda cancelada ✓"); carregarVendas() }
            override fun erro(texto: String) = runOnUiThread { janela.dismiss(); aviso("Não cancelou: $texto") }
        })
    }

    private fun reimprimir() {
        AlertDialog.Builder(this).setTitle("Reimprimir qual via?")
            .setItems(arrayOf("Via do cliente", "Via da loja")) { _, i ->
                motor.reimprimir(if (i == 0) Via.CLIENTE else Via.LOJA) { e -> aviso(e ?: "Comprovante enviado para a impressora.") }
            }.show()
    }

    private fun testarImpressora() {
        val w = Impressao.PONTOS
        val b = Bitmap.createBitmap(w, 260, Bitmap.Config.ARGB_8888)
        val c = Canvas(b); c.drawColor(Color.WHITE)
        val p = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.BLACK; textSize = 30f; isFakeBoldText = true }
        c.drawText("LiveFood", 10f, 40f, p)
        p.textSize = 24f; p.isFakeBoldText = false
        c.drawText("Teste de impressão 58 mm", 10f, 80f, p)
        c.drawText(SimpleDateFormat("dd/MM/yyyy HH:mm", Locale("pt", "BR")).format(Date()), 10f, 115f, p)
        c.drawRect(0f, 140f, w.toFloat(), 146f, p)
        c.drawText("Se você lê isto, está ok ✓", 10f, 190f, p)
        thread { val e = runCatching { motor.imprimir(b) }.getOrElse { it.message }; aviso(e ?: "Teste enviado para a impressora.") }
    }

    private fun atualizar() {
        aviso("Atualizando…")
        motor.atualizar { e -> aviso(e ?: "Dados da maquininha atualizados ✓"); runOnUiThread { mostrarInfo() } }
    }

    private fun ativar() {
        val campo = EditText(this).apply { hint = "Código de ativação" }
        AlertDialog.Builder(this).setTitle("Ativar a maquininha")
            .setMessage("O código fica no portal da Vileve, nos detalhes do estabelecimento.")
            .setView(campo)
            .setPositiveButton("Ativar") { _, _ ->
                aviso("Ativando…")
                motor.ativar(campo.text.toString().trim()) { e -> aviso(e?.let { "Não ativou: $it" } ?: "Maquininha ativada ✓"); runOnUiThread { mostrarInfo() } }
            }
            .setNegativeButton("Voltar", null).show()
    }
}
