package br.tec.livefood.pos

import android.content.Context
import android.graphics.Bitmap
import org.json.JSONObject

/** Forma de pagamento pedida pela página do Atendimento. */
enum class Forma(val codigo: String, val titulo: String) {
    CREDITO("credito", "Crédito"),
    DEBITO("debito", "Débito"),
    CARTAO("cartao", "Cartão"),
    PIX("pix", "Pix");

    companion object {
        fun de(c: String?): Forma? = values().firstOrNull { it.codigo == c }
    }
}

/** Via do comprovante do cartão. */
enum class Via { LOJA, CLIENTE }

/** Venda feita na maquininha (o que volta para o Atendimento). */
data class Venda(
    val chave: String,            // identificador da venda no kit (gatewayKey); usado para estornar
    val forma: String,
    val valorCentavos: Long,
    val status: String,           // CONFIRMED, CANCELLED, PENDING, FAILED...
    val nsu: String = "",
    val autorizacao: String = "",
    val bandeira: String = "",
    val final4: String = "",
    val quando: Long = System.currentTimeMillis(),
    val estornada: Boolean = false,
) {
    fun json(): JSONObject = JSONObject()
        .put("gk", chave).put("forma", forma).put("valor", valorCentavos).put("status", status)
        .put("nsu", nsu).put("aut", autorizacao).put("bandeira", bandeira).put("final", final4)
        .put("quando", quando).put("estornada", estornada)
}

/** O que a tela de cobrança mostra enquanto o kit trabalha. Sempre chamado na tela (thread principal). */
interface Tela {
    fun mensagem(texto: String)
    fun mostrarPix(qr: String?, expiraEm: Long?)
    fun escolher(titulo: String, opcoes: List<String>, resposta: (Int) -> Unit)
    fun digitar(titulo: String, numerico: Boolean, resposta: (String?) -> Unit)
    fun aprovado(venda: Venda)
    fun erro(texto: String)
}

/**
 * O "motor" de pagamento. Há dois:
 *  - sim: imita a maquininha (para testar o fluxo em qualquer celular);
 *  - vileve: o kit verdadeiro da PayStore/Vileve na PAX A910S;
 *  - celular: Tap on Phone da Vileve (o celular com NFC vira maquininha; só aproximação, sem Pix e sem impressora).
 */
interface Motor {
    val nome: String
    val deVerdade: Boolean
    /** formas que este motor cobra sozinho (as outras continuam como hoje no Atendimento) */
    val formas: List<String> get() = listOf("credito", "debito", "cartao", "pix")
    /** tem impressora (bobina de 58 mm)? */
    val imprime: Boolean get() = true
    fun configurar(ctx: Context)
    fun ativo(): Boolean
    fun ativar(codigo: String, fim: (String?) -> Unit)        // fim(null) = deu certo; senão, a mensagem de erro
    fun atualizar(fim: (String?) -> Unit)
    fun cobrar(forma: Forma, valorCentavos: Long, tela: Tela)
    fun abortar()
    fun estornar(chave: String, tela: Tela)
    fun vendas(fim: (List<Venda>?, String?) -> Unit)
    fun reimprimir(via: Via, fim: (String?) -> Unit)
    fun imprimir(bitmap: Bitmap): String?                     // null = imprimiu; senão, o erro (síncrono, fora da tela)
    fun modelo(): String
    fun serie(): String
}

object Pagamento {
    val motor: Motor by lazy { MotorImpl() }
    /** No modo de teste, a "impressão" aparece na tela para conferir o cupom de 58 mm. */
    @Volatile var mostrarPrevia: ((Bitmap) -> Unit)? = null
}
