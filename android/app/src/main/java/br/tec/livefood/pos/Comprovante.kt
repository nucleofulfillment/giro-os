package br.tec.livefood.pos

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Comprovante digital enviado pelo WhatsApp (o cliente recebe no celular dele, sem papel). */
object Comprovante {
    data class Extras(val loja: String, val fone: String, val ref: String)

    /** Só os números, com 55 (Brasil) na frente. null = número inválido. */
    fun numero(digitado: String): String? {
        var d = digitado.filter { it.isDigit() }.trimStart('0')
        if (d.length == 10 || d.length == 11) d = "55$d"
        return if (d.length in 12..13 && d.startsWith("55")) d else null
    }

    fun formatarFone(f: String): String {
        val d = f.filter { it.isDigit() }.removePrefix("55").takeLast(11)
        return when (d.length) {
            11 -> "(${d.take(2)}) ${d.substring(2, 7)}-${d.takeLast(4)}"
            10 -> "(${d.take(2)}) ${d.substring(2, 6)}-${d.takeLast(4)}"
            else -> d
        }
    }

    fun texto(v: Venda, loja: String, ref: String): String {
        val quando = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale("pt", "BR")).format(Date(v.quando))
        val forma = Forma.de(v.forma)?.titulo ?: v.forma
        val cartao = listOf(v.bandeira, if (v.final4.isNotBlank()) "final ${v.final4}" else "").filter { it.isNotBlank() }.joinToString(" ")
        return buildString {
            append("✅ *Comprovante de pagamento*")
            if (loja.isNotBlank()) append("\n*").append(loja).append("*")
            append("\n\n💰 Valor: *").append(Ui.reais(v.valorCentavos)).append("*")
            append("\n💳 ").append(forma).append(if (cartao.isNotBlank()) " · $cartao" else "")
            append("\n🕒 ").append(quando)
            if (ref.isNotBlank()) append("\n📍 ").append(ref)
            if (v.autorizacao.isNotBlank()) append("\nAutorização: ").append(v.autorizacao)
            if (v.nsu.isNotBlank()) append("\nNSU: ").append(v.nsu)
            if (!Pagamento.motor.deVerdade) append("\n\n⚠️ TESTE · nada foi cobrado")
            append("\n\nObrigado pela preferência! 🧡")
            append("\n_Não é documento fiscal._")
        }
    }
}
