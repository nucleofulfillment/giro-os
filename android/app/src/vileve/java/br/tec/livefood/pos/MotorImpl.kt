package br.tec.livefood.pos

import android.content.Context
import android.graphics.Bitmap
import com.paytime.payossdk.*
import com.paytime.payossdk.external.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Motor de VERDADE: kit de pagamento PayStore/Vileve (PayOsSdk) na PAX A910S.
 * Segue a documentação do kit (Desenvolvimento > Transação / Impressão / Dispositivo).
 * Campos da venda que a documentação não detalha são lidos por nome (veja [Leitor]),
 * para o app não quebrar se o kit mudar o nome de algum campo.
 */
class MotorImpl : Motor {
    override val nome = "vileve"
    override val deVerdade = true

    private val pag get() = PayOsSdkPayment.instance
    private val dispositivo get() = PayOsSdkDevice.instance
    private val impressora get() = PayOsSdkPrinter.instance

    override fun configurar(ctx: Context) {
        val app = ctx.applicationContext
        pag.configure(app)
        dispositivo.configure(app)
        impressora.configure(app)
        // reinicia sozinha todo dia às 5h (só PAX): a máquina não trava no meio do expediente
        runCatching {
            dispositivo.setRebootTimeEnable(true)
            dispositivo.setRebootTime("05:00:00")
        }
    }

    override fun ativo(): Boolean = runCatching { pag.isInitialized() }.getOrDefault(false)

    override fun ativar(codigo: String, fim: (String?) -> Unit) {
        if (codigo.isBlank()) { fim("digite o código"); return }
        pag.init(codigo, simples(fim))
    }

    override fun atualizar(fim: (String?) -> Unit) = pag.updateTerminalConfigurations(simples(fim))

    /** Callback para operações sem tela (ativar, atualizar, reimprimir). */
    private fun simples(fim: (String?) -> Unit) = object : PayOsSdkConnectorCallback {
        override fun onRequest(flow: PayOsSdkRequestFlow, payload: Any?) {}
        override fun onMessage(type: PayOsSdkNotificationType, message: String) {}
        override fun onApproved(data: Any?) = fim(null)
        override fun onError(code: PayOsSdkReturnCode, messages: List<String>, extra: Int?) = fim(textoErro(code, messages))
    }

    override fun cobrar(forma: Forma, valorCentavos: Long, tela: Tela) {
        val tipo = when (forma) {
            Forma.CREDITO -> PayOsSdkTransactionType.CREDIT
            Forma.DEBITO -> PayOsSdkTransactionType.DEBIT
            Forma.PIX -> PayOsSdkTransactionType.PIX
            Forma.CARTAO -> PayOsSdkTransactionType.NONE   // o cartão escolhe (crédito/débito)
        }
        val params = if (forma == Forma.PIX)
            PayOsSdkTransactionParams(amount = valorCentavos.toInt(), typeTransaction = tipo)
        else
            PayOsSdkTransactionParams(
                amount = valorCentavos.toInt(),
                creditType = PayOsSdkCreditType.NO_INSTALLMENT,
                installment = null,
                typeTransaction = tipo,
            )
        if (forma != Forma.PIX) params.setPrintReceipt(true)   // a via da loja sai sozinha
        pag.makeTransaction(params, callbackTela(tela, forma, valorCentavos))
    }

    private fun callbackTela(tela: Tela, forma: Forma, valor: Long) = object : PayOsSdkConnectorCallback {
        override fun onRequest(flow: PayOsSdkRequestFlow, payload: Any?) {
            when (flow) {
                PayOsSdkRequestFlow.APPLICATION -> {
                    val itens = Leitor.lista(payload).map { Leitor.rotulo(it) }
                    tela.escolher("Escolha a opção do cartão", itens.ifEmpty { listOf("Crédito", "Débito") }) { pag.selectApplication(it) }
                }
                PayOsSdkRequestFlow.LAST_DIGITS_CONFIRMATION ->
                    tela.digitar("Digite os 4 últimos números do cartão", true) { r -> if (r == null) pag.abort() else pag.setLastDigits(r) }
                PayOsSdkRequestFlow.CVV_TYPE -> {
                    val tipos = enumValues<PayOsSdkCvvType>().toList()
                    tela.escolher("O cartão tem o código de segurança (CVV) no verso?", tipos.map { if (it.name == "EXISTS") "Sim, tem" else it.name.lowercase().replace('_', ' ') }) {
                        pag.setCvvType(tipos[it])
                    }
                }
                PayOsSdkRequestFlow.CVV ->
                    tela.digitar("Digite o código de segurança (CVV)", true) { r -> if (r == null) pag.abort() else pag.setCvv(r) }
                PayOsSdkRequestFlow.PRINT_ERROR ->
                    tela.mensagem("Problema na impressora: confira o papel. O pagamento continua valendo.")
                else -> {}
            }
        }

        override fun onMessage(type: PayOsSdkNotificationType, message: String) = tela.mensagem(message)   // exibição obrigatória

        override fun onApproved(data: Any?) {
            val v = Leitor.venda(data, forma, valor) ?: run { tela.erro("Resposta inesperada da maquininha."); return }
            when (v.status) {
                "PENDING" -> tela.mostrarPix(Leitor.qrPix(data), Leitor.data(data, "expiration"))
                "CONFIRMED" -> tela.aprovado(v)
                "CANCELLED" -> tela.erro("O QR Code expirou ou foi cancelado. O Pix não foi pago.")
                "FAILED" -> tela.erro("Não consegui gerar o Pix. Tente de novo.")
                else -> tela.aprovado(v)
            }
        }

        override fun onError(code: PayOsSdkReturnCode, messages: List<String>, extra: Int?) {
            if (code.name.contains("EXPIRED") && code.name.contains("TABLE")) {
                tela.mensagem("Atualizando as tabelas da maquininha…")
                pag.tableLoad(simples { e -> tela.erro(e ?: "Tabelas atualizadas. Toque em Tentar de novo.") })
                return
            }
            tela.erro(textoErro(code, messages))
        }
    }

    override fun abortar() = runCatching { pag.abort() }.let { }

    override fun estornar(chave: String, tela: Tela) {
        val params = PayOsSdkRevertTransactionParams()
        params.setGatewayKey(chave)
        pag.revertTransaction(params, object : PayOsSdkConnectorCallback {
            override fun onRequest(flow: PayOsSdkRequestFlow, payload: Any?) {
                if (flow == PayOsSdkRequestFlow.APPLICATION) pag.selectApplication(0)
            }
            override fun onMessage(type: PayOsSdkNotificationType, message: String) = tela.mensagem(message)
            override fun onApproved(data: Any?) = tela.aprovado(Leitor.venda(data, Forma.CARTAO, 0) ?: Venda(chave, "cartao", 0, "CANCELLED", estornada = true))
            override fun onError(code: PayOsSdkReturnCode, messages: List<String>, extra: Int?) = tela.erro(textoErro(code, messages))
        })
    }

    override fun vendas(fim: (List<Venda>?, String?) -> Unit) {
        pag.listTransactions(object : PayOsSdkConnectorCallback {
            override fun onRequest(flow: PayOsSdkRequestFlow, payload: Any?) {}
            override fun onMessage(type: PayOsSdkNotificationType, message: String) {}
            override fun onApproved(data: Any?) = fim(Leitor.lista(data).mapNotNull { Leitor.venda(it, null, 0) }, null)
            override fun onError(code: PayOsSdkReturnCode, messages: List<String>, extra: Int?) = fim(null, textoErro(code, messages))
        })
    }

    override fun reimprimir(via: Via, fim: (String?) -> Unit) =
        pag.printReceipt(if (via == Via.CLIENTE) PayOsSdkReceiptCopyType.CLIENT_SECOND_COPY else PayOsSdkReceiptCopyType.ESTABLISHMENT_SECOND_COPY, simples(fim))

    /** Imprime a imagem do cupom em pedaços (a impressora tem limite por impressão). */
    override fun imprimir(bitmap: Bitmap): String? {
        val pedaco = 800
        var y = 0
        while (y < bitmap.height) {
            val h = minOf(pedaco, bitmap.height - y)
            val parte = Bitmap.createBitmap(bitmap, 0, y, bitmap.width, h)
            impressora.init().exceptionOrNull()?.let { return "Impressora não respondeu." }
            impressora.setGray(4)
            impressora.printBitmap(parte)
            if (y + h >= bitmap.height) impressora.step(120)
            val st = impressora.start().getOrNull()
            val nomeSt = st?.toString() ?: "ERROR"
            if (nomeSt != "SUCCESS") return statusImpressora(nomeSt)
            y += h
        }
        return null
    }

    private fun statusImpressora(s: String) = when (s) {
        "OUT_OF_PAPER" -> "Acabou o papel. Troque a bobina e imprima de novo."
        "PRINTER_IS_BUSY" -> "A impressora está ocupada. Tente de novo."
        "PRINTER_OVER_HEATS" -> "A impressora esquentou. Espere um pouco e tente de novo."
        "PRINTER_VOLTAGE_IS_TO_LOW" -> "Bateria fraca para imprimir. Coloque a maquininha para carregar."
        else -> "Erro na impressora ($s)."
    }

    override fun modelo() = dispositivo.getModel().getOrDefault("")
    override fun serie() = dispositivo.getSerialNumber().getOrDefault("")

    private fun textoErro(code: PayOsSdkReturnCode, messages: List<String>): String {
        val n = code.name
        return when {
            n == "CTLSS_WITHOUT_APPLICATION" -> "Por aproximação não deu. Insira o cartão no chip ou passe na tarja."
            messages.isNotEmpty() -> messages.joinToString("\n")
            else -> "Não deu certo ($n)."
        }
    }
}

/** Lê os dados da venda devolvidos pelo kit, procurando os campos pelo nome. */
object Leitor {
    private fun valor(o: Any?, vararg nomes: String): Any? {
        if (o == null) return null
        for (n in nomes) {
            var c: Class<*>? = o.javaClass
            while (c != null && c != Any::class.java) {
                runCatching { return c!!.getDeclaredField(n).apply { isAccessible = true }.get(o) }
                c = c.superclass
            }
            val cap = n.replaceFirstChar { it.uppercase() }
            for (m in listOf("get$cap", "is$cap", n)) runCatching { return o.javaClass.getMethod(m).invoke(o) }
        }
        return null
    }

    private fun txt(o: Any?, vararg nomes: String) = valor(o, *nomes)?.toString()?.takeIf { it.isNotBlank() && it != "null" } ?: ""

    fun lista(o: Any?): List<Any> = when (o) {
        is Collection<*> -> o.filterNotNull()
        is Array<*> -> o.filterNotNull()
        null -> emptyList()
        else -> (valor(o, "items", "list", "applications", "options") as? Collection<*>)?.filterNotNull() ?: emptyList()
    }

    fun rotulo(o: Any): String = txt(o, "label", "name", "description", "applicationLabel", "title").ifBlank { o.toString() }

    fun data(o: Any?, vararg nomes: String): Long? = when (val v = valor(o, *nomes)) {
        is Date -> v.time
        is Long -> if (v < 10_000_000_000L) v * 1000 else v
        is Number -> v.toLong()
        is String -> listOf("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", "yyyy-MM-dd'T'HH:mm:ssXXX", "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd HH:mm:ss")
            .firstNotNullOfOrNull { f -> runCatching { SimpleDateFormat(f, Locale.US).parse(v)?.time }.getOrNull() }
        else -> null
    }

    fun qrPix(o: Any?) = txt(o, "qrCode", "qrcode", "pixQrCode", "emv", "copyPaste", "pixCopyPaste", "qrCodeContent").ifBlank { null }

    fun venda(o: Any?, forma: Forma?, valorPedido: Long): Venda? {
        if (o == null) return null
        val chave = txt(o, "gatewayKey")
        val status = txt(o, "transactionStatus", "status").uppercase().substringAfterLast('.')
        if (chave.isBlank() && status.isBlank()) return null
        val tipo = txt(o, "typeTransaction", "transactionType", "type").uppercase()
        val f = when {
            tipo.contains("PIX") -> Forma.PIX
            tipo.contains("DEBIT") -> Forma.DEBITO
            tipo.contains("CREDIT") -> Forma.CREDITO
            else -> forma ?: Forma.CARTAO
        }
        val valor = (valor(o, "amount", "value") as? Number)?.toLong() ?: valorPedido
        val pan = txt(o, "lastDigits", "cardLastDigits", "panLast4", "maskedPan", "pan")
        return Venda(
            chave = chave,
            forma = f.codigo,
            valorCentavos = valor,
            status = status.ifBlank { "CONFIRMED" },
            nsu = txt(o, "nsu", "hostNsu", "nsuHost", "acquirerNsu"),
            autorizacao = txt(o, "authorizationCode", "authCode", "authorization"),
            bandeira = txt(o, "cardBrand", "brand", "flag", "cardFlag").uppercase(),
            final4 = pan.filter { it.isDigit() }.takeLast(4),
            quando = data(o, "createdAt", "date", "transactionDate", "dateTime") ?: System.currentTimeMillis(),
            estornada = valor(o, "cancelledAt") != null,
        )
    }
}
