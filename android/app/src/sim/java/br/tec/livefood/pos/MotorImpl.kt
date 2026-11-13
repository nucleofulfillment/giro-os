package br.tec.livefood.pos

import android.content.Context
import android.graphics.Bitmap
import android.os.Handler
import android.os.Looper
import java.util.UUID

/**
 * Motor de TESTE: imita a maquininha para testar o fluxo em qualquer celular Android.
 * Nada é cobrado. Regras parecidas com as do ambiente de testes da Vileve:
 *  - Pix com valor terminado em 1 ou 3 (centavos) expira/cancela; os demais são pagos.
 *  - Cartão com valor terminado em 5 centavos é recusado; os demais são aprovados.
 */
class MotorImpl : Motor {
    override val nome = "teste"
    override val deVerdade = false

    private val h = Handler(Looper.getMainLooper())
    private val vendas = mutableListOf<Venda>()
    private var ativa = true
    private var atual: Runnable? = null
    private var tela: Tela? = null

    override fun configurar(ctx: Context) {}
    override fun ativo() = ativa
    override fun ativar(codigo: String, fim: (String?) -> Unit) {
        h.postDelayed({ if (codigo.isBlank()) fim("digite o código") else { ativa = true; fim(null) } }, 800)
    }
    override fun atualizar(fim: (String?) -> Unit) { h.postDelayed({ fim(null) }, 600) }

    private fun depois(ms: Long, r: () -> Unit) {
        val x = Runnable { r() }; atual = x; h.postDelayed(x, ms)
    }

    override fun cobrar(forma: Forma, valorCentavos: Long, tela: Tela) {
        this.tela = tela
        val chave = UUID.randomUUID().toString()
        if (forma == Forma.PIX) {
            depois(1200) {
                tela.mostrarPix("00020126580014br.gov.bcb.pix0136teste-livefood-${chave.take(8)}5204000053039865406${"%.2f".format(valorCentavos / 100.0)}5802BR5913LIVEFOOD TESTE6009SAO PAULO62070503***6304ABCD", System.currentTimeMillis() + 60_000)
                val fim = valorCentavos % 10
                depois(6000) {
                    if (fim == 1L || fim == 3L) tela.erro("O QR Code expirou e o Pix não foi pago.")
                    else { val v = Venda(chave, forma.codigo, valorCentavos, "CONFIRMED", nsu = (100000..999999).random().toString()); vendas.add(v); tela.aprovado(v) }
                }
            }
            return
        }
        depois(1500) {
            if (forma == Forma.CARTAO) {
                tela.escolher("Crédito ou débito?", listOf("Crédito", "Débito")) { i -> seguirCartao(if (i == 0) Forma.CREDITO else Forma.DEBITO, valorCentavos, chave, tela) }
            } else seguirCartao(forma, valorCentavos, chave, tela)
        }
    }

    private fun seguirCartao(forma: Forma, valor: Long, chave: String, tela: Tela) {
        tela.mensagem("Processando…")
        depois(2500) {
            if (valor % 10 == 5L) { tela.erro("Transação negada pelo banco (teste)."); return@depois }
            val v = Venda(chave, forma.codigo, valor, "CONFIRMED",
                nsu = (100000..999999).random().toString(), autorizacao = (100000..999999).random().toString(),
                bandeira = listOf("VISA", "MASTERCARD", "ELO").random(), final4 = (1000..9999).random().toString())
            vendas.add(v)
            tela.mensagem("Imprimindo a via da loja…")
            depois(800) { tela.aprovado(v) }
        }
    }

    override fun abortar() { atual?.let { h.removeCallbacks(it) }; atual = null }

    override fun estornar(chave: String, tela: Tela) {
        val i = vendas.indexOfFirst { it.chave == chave }
        if (i < 0) { tela.erro("Venda não encontrada."); return }
        tela.mensagem("Aproxime ou insira o mesmo cartão")
        h.postDelayed({ vendas[i] = vendas[i].copy(estornada = true, status = "CANCELLED"); tela.aprovado(vendas[i]) }, 2000)
    }

    override fun vendas(fim: (List<Venda>?, String?) -> Unit) { h.post { fim(vendas.toList(), null) } }

    override fun reimprimir(via: Via, fim: (String?) -> Unit) {
        h.postDelayed({ fim(if (vendas.isEmpty()) "Nenhuma venda para reimprimir." else null) }, 500)
    }

    override fun imprimir(bitmap: Bitmap): String? {
        val mostrar = Pagamento.mostrarPrevia ?: return "Impressora indisponível."
        mostrar(bitmap)
        return null
    }

    override fun modelo() = android.os.Build.MODEL ?: ""
    override fun serie() = "TESTE"
}
