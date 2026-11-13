package br.tec.livefood.pos

import android.content.Context
import android.graphics.Bitmap
import android.os.Build
import com.paytime.taponphonesdk.TapOnPhoneSdk
import com.paytime.taponphonesdk.external.listeners.*
import com.paytime.taponphonesdk.external.model.activation.ActivateDeviceModel
import com.paytime.taponphonesdk.external.model.device.DeviceStatusModel
import com.paytime.taponphonesdk.external.model.transaction.*

/**
 * Motor do CELULAR: Tap on Phone da Vileve. O celular com NFC vira maquininha.
 * Só cartão por aproximação (crédito à vista/parcelado e débito), até R$ 500 por venda.
 * Não faz Pix e não imprime: no Atendimento, o Pix continua como hoje.
 */
class MotorImpl : Motor {
    override val nome = "celular"
    override val deVerdade = true
    override val formas = listOf("credito", "debito", "cartao")
    override val imprime = false

    private val sdk get() = TapOnPhoneSdk.instance
    @Volatile private var ativa = false
    @Volatile private var configurada = false

    companion object { const val LIMITE = 50_000L }   // R$ 500,00

    override fun configurar(ctx: Context) {
        if (BuildConfig.TAP_LICENCA.isBlank()) return
        sdk.configure(ctx.applicationContext, BuildConfig.TAP_LICENCA)
        configurada = true
        conferirAtivo()
    }

    private fun conferirAtivo() {
        if (!configurada) return
        sdk.isDeviceActive(object : IsDeviceActiveListener {
            override fun onMessage(type: String, message: String) {}
            override fun onApproved(result: Boolean) { ativa = result }
            override fun onError(code: String, messages: List<String>, httpStatusCode: Int?) { ativa = false }
        })
    }

    override fun ativo() = ativa

    override fun ativar(codigo: String, fim: (String?) -> Unit) {
        if (!configurada) { fim("falta a licença do Tap on Phone no app"); return }
        if (codigo.length < 8) { fim("o código tem que ter pelo menos 8 letras/números"); return }
        sdk.activateDevice(ActivateDeviceModel(codigo), object : ActivateDeviceListener {
            override fun onMessage(type: String, message: String) {}
            override fun onApproved(result: Any?) { ativa = true; fim(null) }
            override fun onError(code: String, messages: List<String>, httpStatusCode: Int?) = fim(erro(code, messages))
        })
    }

    override fun atualizar(fim: (String?) -> Unit) {
        if (!configurada) { fim("falta a licença do Tap on Phone no app"); return }
        sdk.checkDeviceStatus(object : DeviceStatusListener {
            override fun onMessage(type: String, message: String) {}
            override fun onApproved(result: DeviceStatusModel) {
                ativa = result.isActivated
                fim(when {
                    !result.isSecure -> "Este celular não passou na verificação de segurança (root ou modo desenvolvedor)."
                    !result.canUseTapPhone -> "Este celular não pode ser usado como maquininha."
                    !result.isActivated -> "Celular ainda não ativado: use Ativar com código."
                    else -> null
                })
            }
            override fun onError(code: String, messages: List<String>, httpStatusCode: Int?) = fim(erro(code, messages))
        })
    }

    override fun cobrar(forma: Forma, valorCentavos: Long, tela: Tela) {
        when {
            !configurada -> { tela.erro("Falta a licença do Tap on Phone neste app."); return }
            forma == Forma.PIX -> { tela.erro("Pix não é feito pelo celular. Use a chave Pix da loja."); return }
            valorCentavos > LIMITE -> { tela.erro("No celular o limite é R$ 500,00 por venda. Divida o pagamento ou use a maquininha."); return }
            !sdk.isNFCSupported() -> { tela.erro("Este celular não tem NFC (pagamento por aproximação)."); return }
            !sdk.isNFCEnabled() -> { sdk.goToNfcSetting(); tela.erro("Ligue o NFC do celular e toque em Tentar de novo."); return }
        }
        if (forma == Forma.CARTAO) {
            tela.escolher("Crédito ou débito?", listOf("Crédito", "Débito")) { i -> pagar(if (i == 0) Forma.CREDITO else Forma.DEBITO, valorCentavos, tela) }
        } else pagar(forma, valorCentavos, tela)
    }

    private fun pagar(forma: Forma, valor: Long, tela: Tela) {
        tela.mensagem("Peça para o cliente encostar o cartão atrás do celular")
        val params = TransactionParamsModel(
            amount = valor,
            typeTransaction = if (forma == Forma.DEBITO) TransactionTypeModel.DEBIT else TransactionTypeModel.CREDIT,
            installment = null,
        )
        sdk.makeTransaction(params, object : MakeTransactionListener {
            override fun onMessage(type: String, message: String) {
                when (type) {
                    "PAYMENT_CANCEL" -> tela.mensagem("Pagamento cancelado.")
                    "PAYMENT_TIME_EXPIRED" -> tela.mensagem("O tempo acabou.")
                    else -> tela.mensagem(message)
                }
            }
            override fun onApproved(result: TransactionResultModel) {
                val d = result.paymentData
                tela.aprovado(Venda(
                    chave = d.gatewayKey.ifBlank { d.transactionId.toString() },
                    forma = forma.codigo, valorCentavos = d.amount, status = "CONFIRMED",
                    nsu = d.rrn, autorizacao = d.authorizationId, bandeira = d.brand.uppercase(), final4 = d.cardLastDigits.takeLast(4),
                ))
            }
            override fun onError(code: String, messages: List<String>, httpStatusCode: Int?) {
                if (code == "LOGON_NOT_PERFORMED") ativa = false
                tela.erro(erro(code, messages))
            }
        })
    }

    override fun abortar() {}   // o próprio kit tem o botão de cancelar na tela de aproximação

    override fun estornar(chave: String, tela: Tela) {
        sdk.nullifyTransaction(chave, object : NullifyTransactionListener {
            override fun onMessage(type: String, message: String) = tela.mensagem(message)
            override fun onApproved(result: TransactionResultModel) =
                tela.aprovado(Venda(chave, "cartao", result.paymentData.amount, "CANCELLED", estornada = true))
            override fun onError(code: String, messages: List<String>, httpStatusCode: Int?) = tela.erro(erro(code, messages))
        })
    }

    override fun vendas(fim: (List<Venda>?, String?) -> Unit) {
        if (!configurada) { fim(null, "Falta a licença do Tap on Phone neste app."); return }
        sdk.listTransactions(object : ListTransactionsListener {
            override fun onMessage(type: String, message: String) {}
            override fun onApproved(result: List<TransactionStoreModel>) = fim(result.map { t ->
                val estornada = t.transactionStatus.name == "REFUNDED"
                Venda(
                    chave = t.gatewayKey.ifBlank { t.transactionId.toString() },
                    forma = if (t.paymentMethod.name == "DEBIT") "debito" else "credito",
                    valorCentavos = t.amount,
                    status = if (estornada) "CANCELLED" else "CONFIRMED",
                    nsu = t.rrn, autorizacao = t.authorizationId, bandeira = t.brand.uppercase(), final4 = t.cardLastDigits.takeLast(4),
                    quando = t.transactionDatetime, estornada = estornada,
                )
            }, null)
            override fun onError(code: String, messages: List<String>, httpStatusCode: Int?) = fim(null, erro(code, messages))
        })
    }

    override fun reimprimir(via: Via, fim: (String?) -> Unit) = fim("O celular não imprime comprovante.")
    override fun imprimir(bitmap: Bitmap): String? = "Este celular não tem impressora."
    override fun modelo(): String = Build.MODEL ?: ""
    override fun serie() = ""

    private fun erro(code: String, messages: List<String>): String = when (code) {
        "LOGON_NOT_PERFORMED" -> "Celular não ativado. Toque em Maquininha → Ativar com código."
        "REJECTED_TRANSACTION" -> "Pagamento recusado. " + messages.joinToString(" ")
        else -> messages.joinToString("\n").ifBlank { "Não deu certo ($code)." }
    }.trim()
}
