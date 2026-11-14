package br.tec.livefood.pos

import android.content.Context
import android.graphics.Bitmap
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Base64
import br.com.phoebus.android.payments.api.AbortRequest
import br.com.phoebus.android.payments.api.ApplicationInfo
import br.com.phoebus.android.payments.api.Credentials
import br.com.phoebus.android.payments.api.ErrorData
import br.com.phoebus.android.payments.api.PaymentClient
import br.com.phoebus.android.payments.api.PaymentRequestV2
import br.com.phoebus.android.payments.api.PaymentType
import br.com.phoebus.android.payments.api.PaymentV2
import br.com.phoebus.android.payments.api.ReprintReceiptRequestV2
import br.com.phoebus.android.payments.api.ReversePayment
import br.com.phoebus.android.payments.api.ReversePaymentRequestV2
import br.com.phoebus.android.payments.api.client.Client
import org.json.JSONArray
import java.io.ByteArrayOutputStream
import java.math.BigDecimal
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Motor da VILEVE: maquininha Positivo L300 (também A910/A910S) com o app de pagamento da PayStore.
 * O LiveFood "chama" o pagamento da própria maquininha (biblioteca payments-api da PayStore):
 * a tela de cartão, senha e Pix é a do app de pagamento; o resultado volta para o LiveFood.
 * Venda aprovada fica PENDENTE até o LiveFood confirmar (confirmPayment) — confirmamos logo em seguida.
 */
class MotorImpl : Motor {
    override val nome = "vileve"
    override val deVerdade = true

    private lateinit var ctx: Context
    private val cliente = PaymentClient()
    @Volatile private var ligado = false
    private val principal = Handler(Looper.getMainLooper())

    override fun configurar(ctx: Context) {
        this.ctx = ctx.applicationContext
        ligar(null)
    }

    /** Liga com o app de pagamento da PayStore (pode demorar um instante na primeira vez). */
    private fun ligar(pronto: ((Boolean) -> Unit)?) {
        if (ligado && cliente.isBound) { pronto?.invoke(true); return }
        val ok = runCatching {
            cliente.bind(ctx, object : Client.OnConnectionCallback {
                override fun onConnected() { ligado = true; principal.post { pronto?.invoke(true) } }
                override fun onDisconnected(forcado: Boolean) { ligado = false }
            })
        }.getOrDefault(false)
        if (!ok) principal.post { pronto?.invoke(false) }
    }

    private fun app(): ApplicationInfo = ApplicationInfo().apply {
        credentials = Credentials().apply {
            applicationId = BuildConfig.PAYSTORE_APP_ID
            secretToken = BuildConfig.PAYSTORE_SECRET
        }
        softwareVersion = BuildConfig.VERSION_NAME
    }

    /** A ativação da maquininha é feita no próprio app da PayStore (pela Vileve), não aqui. */
    override fun ativo() = true
    override fun ativar(codigo: String, fim: (String?) -> Unit) =
        fim("a ativação da maquininha é feita no app de pagamento da PayStore (fale com a Vileve)")

    override fun atualizar(fim: (String?) -> Unit) = ligar { ok -> fim(if (ok) null else SEM_APP) }

    override fun cobrar(forma: Forma, valorCentavos: Long, tela: Tela) {
        if (BuildConfig.PAYSTORE_APP_ID.isBlank()) { tela.erro("Falta cadastrar o app LiveFood no portal da PayStore (Aplicativos)."); return }
        tela.mensagem("Siga as instruções na tela da maquininha")
        ligar { ok ->
            if (!ok) { tela.erro(SEM_APP); return@ligar }
            val ref = "LF-" + UUID.randomUUID().toString().replace("-", "").take(16)
            val pedido = PaymentRequestV2().apply {
                value = BigDecimal(valorCentavos).movePointLeft(2)
                paymentTypes = when (forma) {
                    Forma.CREDITO -> listOf(PaymentType.CREDIT)
                    Forma.DEBITO -> listOf(PaymentType.DEBIT)
                    Forma.PIX -> listOf(PaymentType.PIX)
                    Forma.CARTAO -> listOf(PaymentType.CREDIT, PaymentType.DEBIT)
                }
                installments = 1
                appTransactionId = ref
                appInfo = app()
                isShowReceiptView = false
                printMerchantReceipt = true      // via da loja sai na hora
                printCustomerReceipt = false     // via do cliente: botão "Imprimir via do cliente" ou WhatsApp
            }
            runCatching {
                cliente.startPaymentV2(pedido, object : PaymentClient.PaymentCallback<PaymentV2> {
                    override fun onSuccess(p: PaymentV2) {
                        tela.mensagem("Confirmando o pagamento…")
                        confirmar(p, forma, valorCentavos, ref, tela)
                    }
                    override fun onError(e: ErrorData) = tela.erro(texto(e))
                })
            }.onFailure { tela.erro(it.message ?: SEM_APP) }
        }
    }

    /** O app de pagamento só conclui a venda depois que o LiveFood confirma. */
    private fun confirmar(p: PaymentV2, forma: Forma, valor: Long, ref: String, tela: Tela) {
        val id = p.paymentId
        if (id.isNullOrBlank()) { tela.erro("A maquininha não devolveu o número da venda."); return }
        runCatching {
            cliente.confirmPayment(id, object : PaymentClient.PaymentCallback<Any?> {
                override fun onSuccess(r: Any?) {
                    val tipo = p.paymentType?.name.orEmpty()
                    val v = Venda(
                        chave = id,
                        forma = when { tipo.contains("PIX") -> "pix"; tipo.contains("DEBIT") -> "debito"; tipo.contains("CREDIT") -> "credito"; else -> forma.codigo },
                        valorCentavos = p.value?.movePointRight(2)?.toLong() ?: valor,
                        status = "CONFIRMED",
                        nsu = p.acquirerNsu ?: p.nsuTerminal ?: "",
                        autorizacao = p.acquirerAuthorizationNumber ?: "",
                        bandeira = p.card?.brand?.uppercase() ?: "",
                        final4 = p.card?.panLast4Digits ?: "",
                        ref = ref,
                    )
                    guardar(v)
                    tela.aprovado(v)
                }
                override fun onError(e: ErrorData) = tela.erro("O pagamento não foi confirmado: " + texto(e))
            })
        }.onFailure { tela.erro(it.message ?: "Não consegui confirmar o pagamento.") }
    }

    override fun abortar() {
        runCatching { cliente.abortTransaction(AbortRequest(), object : PaymentClient.PaymentCallback<Void?> {
            override fun onSuccess(r: Void?) {}
            override fun onError(e: ErrorData) {}
        }) }
    }

    override fun estornar(chave: String, tela: Tela) {
        val v = lista().firstOrNull { it.chave == chave } ?: run { tela.erro("Venda não encontrada nesta maquininha."); return }
        tela.mensagem("Siga as instruções na tela da maquininha")
        ligar { ok ->
            if (!ok) { tela.erro(SEM_APP); return@ligar }
            val pedido = ReversePaymentRequestV2().apply {
                paymentId = chave
                value = BigDecimal(v.valorCentavos).movePointLeft(2)
                appTransactionId = "LF-E-" + UUID.randomUUID().toString().replace("-", "").take(14)
                credentials = app().credentials
                isShowReceiptView = false
                printMerchantReceipt = true
                printCustomerReceipt = false
                autoConfirm = true
            }
            runCatching {
                cliente.reversePaymentV2(pedido, object : PaymentClient.PaymentCallback<ReversePayment> {
                    override fun onSuccess(r: ReversePayment) {
                        val nova = v.copy(estornada = true, status = "CANCELLED")
                        guardar(nova)
                        tela.aprovado(nova)
                    }
                    override fun onError(e: ErrorData) = tela.erro(texto(e))
                })
            }.onFailure { tela.erro(it.message ?: SEM_APP) }
        }
    }

    override fun vendas(fim: (List<Venda>?, String?) -> Unit) { principal.post { fim(lista(), null) } }

    override fun reimprimir(via: Via, fim: (String?) -> Unit) {
        val ultima = lista().filter { it.status == "CONFIRMED" && it.forma != "pix" }.maxByOrNull { it.quando }
            ?: run { fim("Nenhuma venda no cartão para reimprimir."); return }
        ligar { ok ->
            if (!ok) { fim(SEM_APP); return@ligar }
            val pedido = ReprintReceiptRequestV2().apply {
                applicationInfo = app()
                softwareVersion = BuildConfig.VERSION_NAME
                paymentId = ultima.chave
                printCustomerReceipt = via == Via.CLIENTE
                printMerchantReceipt = via == Via.LOJA
            }
            runCatching {
                cliente.reprintV2(pedido, object : PaymentClient.PaymentCallback<Void?> {
                    override fun onSuccess(r: Void?) = fim(null)
                    override fun onError(e: ErrorData) = fim(texto(e))
                })
            }.onFailure { fim(it.message ?: SEM_APP) }
        }
    }

    /** Imprime o cupom (imagem de 384 pontos) pela impressora da maquininha, via app da PayStore. */
    override fun imprimir(bitmap: Bitmap): String? {
        val png = ByteArrayOutputStream().also { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }.toByteArray()
        val b64 = Base64.encodeToString(png, Base64.NO_WRAP)
        val fim = CountDownLatch(1)
        var erro: String? = null
        principal.post {
            ligar { ok ->
                if (!ok) { erro = SEM_APP; fim.countDown(); return@ligar }
                runCatching {
                    cliente.printFromBase64(ctx, b64, false, object : PaymentClient.PaymentCallback<Any?> {
                        override fun onSuccess(r: Any?) { fim.countDown() }
                        override fun onError(e: ErrorData) { erro = texto(e); fim.countDown() }
                    })
                }.onFailure { erro = it.message ?: "Erro na impressora."; fim.countDown() }
            }
        }
        if (!fim.await(60, TimeUnit.SECONDS)) return "A impressora não respondeu."
        return erro
    }

    override fun modelo(): String = listOf(Build.MANUFACTURER, Build.MODEL).filter { !it.isNullOrBlank() }.joinToString(" ")
    override fun serie() = ""

    // ── vendas guardadas no aparelho (para "Vendas de hoje", estorno e reimpressão) ──
    private fun prefs() = ctx.getSharedPreferences("vendas_paystore", Context.MODE_PRIVATE)

    @Synchronized private fun lista(): List<Venda> = runCatching {
        val a = JSONArray(prefs().getString("lista", "[]"))
        (0 until a.length()).map { i ->
            val o = a.getJSONObject(i)
            Venda(o.optString("gk"), o.optString("forma"), o.optLong("valor"), o.optString("status"),
                o.optString("nsu"), o.optString("aut"), o.optString("bandeira"), o.optString("final"),
                o.optLong("quando"), o.optBoolean("estornada"), o.optString("ref"))
        }
    }.getOrDefault(emptyList())

    @Synchronized private fun guardar(v: Venda) {
        val limite = System.currentTimeMillis() - 3L * 24 * 3600 * 1000   // guarda 3 dias
        val l = lista().filter { it.chave != v.chave && it.quando > limite } + v
        prefs().edit().putString("lista", JSONArray(l.map { it.json() }).toString()).apply()
    }

    private fun texto(e: ErrorData?): String =
        listOfNotNull(e?.responseMessage, e?.acquirerAdditionalMessage).filter { it.isNotBlank() }.joinToString("\n")
            .ifBlank { "Não deu certo (" + (e?.paymentsResponseCode ?: "?") + ")." }

    companion object {
        const val SEM_APP = "Não encontrei o app de pagamento da PayStore nesta maquininha."
    }
}
