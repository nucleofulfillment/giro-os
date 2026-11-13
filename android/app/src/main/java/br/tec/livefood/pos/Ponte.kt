package br.tec.livefood.pos

import android.webkit.JavascriptInterface
import org.json.JSONObject

/**
 * Ponte entre a página do Atendimento e a maquininha.
 * Na página: window.LiveFoodPOS.info(), .cobrar(json), .imprimir(html, largura), .menu()
 * As respostas da cobrança voltam em window.LiveFoodPOSRetorno(id, json).
 */
class Ponte(private val tela: MainActivity) {

    @JavascriptInterface
    fun info(): String {
        val m = Pagamento.motor
        return JSONObject()
            .put("app", BuildConfig.VERSION_NAME)
            .put("motor", m.nome)
            .put("real", m.deVerdade)
            .put("ativa", m.ativo())
            .put("modelo", runCatching { m.modelo() }.getOrDefault(""))
            .put("serie", runCatching { m.serie() }.getOrDefault(""))
            .put("bobina", if (m.imprime) 58 else 0)
            .put("formas", org.json.JSONArray(m.formas))
            .toString()
    }

    /** json: {id, forma: credito|debito|cartao|pix, valor: centavos, loja?, fone? (do cliente), ref? (mesa/cliente)} */
    @JavascriptInterface
    fun cobrar(json: String) {
        val o = runCatching { JSONObject(json) }.getOrNull()
        val id = o?.optString("id").orEmpty()
        val forma = Forma.de(o?.optString("forma"))
        val valor = o?.optLong("valor") ?: 0L
        if (o == null || forma == null || valor <= 0 || forma.codigo !in Pagamento.motor.formas) {
            tela.responder(id, JSONObject().put("ok", false).put("msg", "Cobrança inválida."))
            return
        }
        val extras = Comprovante.Extras(o.optString("loja"), o.optString("fone"), o.optString("ref"))
        tela.runOnUiThread { tela.abrirCobranca(id, forma, valor, extras) }
    }

    /** html do cupom pronto para bobina de 58 mm; largura = largura da página em px (padrão 240) */
    @JavascriptInterface
    fun imprimir(html: String, largura: Int) {
        tela.runOnUiThread { tela.impressao.imprimir(html, if (largura in 160..600) largura else 240) }
    }

    @JavascriptInterface
    fun menu() {
        tela.runOnUiThread { tela.abrirMenu() }
    }
}
