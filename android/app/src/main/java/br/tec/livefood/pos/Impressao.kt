package br.tec.livefood.pos

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.os.Handler
import android.os.Looper
import android.view.View
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import java.util.ArrayDeque
import kotlin.concurrent.thread

/**
 * Imprime na bobina de 58 mm: monta o cupom (HTML vindo do Atendimento) numa página escondida
 * atrás da tela, tira uma "foto" dela com 384 pontos de largura e manda para a impressora.
 */
class Impressao(private val tela: MainActivity, private val raiz: FrameLayout) {

    companion object { const val PONTOS = 384 }   // largura útil da bobina de 58 mm

    private data class Trabalho(val html: String, val largura: Int)

    private val fila = ArrayDeque<Trabalho>()
    private var ocupada = false
    private val principal = Handler(Looper.getMainLooper())
    private val densidade = tela.resources.displayMetrics.density

    @SuppressLint("SetJavaScriptEnabled")
    private val pagina: WebView = WebView(tela).apply {
        setLayerType(View.LAYER_TYPE_SOFTWARE, null)
        setBackgroundColor(Color.WHITE)
        settings.javaScriptEnabled = true
        settings.loadWithOverviewMode = false
        settings.useWideViewPort = false
        settings.textZoom = 100
        isVerticalScrollBarEnabled = false
        raiz.addView(this, 0, FrameLayout.LayoutParams(1, 1))
    }

    fun imprimir(html: String, largura: Int) {
        fila.add(Trabalho(html, largura))
        if (!ocupada) proximo()
    }

    private fun proximo() {
        val t = fila.poll() ?: run { ocupada = false; return }
        ocupada = true
        val w = (t.largura * densidade).toInt()
        pagina.layoutParams = FrameLayout.LayoutParams(w, (200 * densidade).toInt())
        pagina.webViewClient = object : WebViewClient() {
            override fun onPageFinished(v: WebView, url: String?) {
                principal.postDelayed({ medir(w) }, 250)
            }
        }
        pagina.loadDataWithBaseURL("https://livefood.tec.br/", t.html, "text/html", "utf-8", null)
    }

    private fun medir(w: Int) {
        pagina.evaluateJavascript("Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)") { r ->
            val alturaCss = r?.toFloatOrNull() ?: 300f
            val h = (alturaCss * densidade).toInt().coerceIn(50, 40000)
            pagina.layoutParams = FrameLayout.LayoutParams(w, h)
            pagina.requestLayout()
            principal.postDelayed({ fotografar(w, h) }, 400)
        }
    }

    private fun fotografar(w: Int, h: Int) {
        val foto = runCatching {
            val b = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
            val c = Canvas(b)
            c.drawColor(Color.WHITE)
            pagina.draw(c)
            preparar(b)
        }.getOrNull()
        if (foto == null) { aviso("Não consegui montar o cupom para imprimir."); proximo(); return }
        thread(name = "impressao") {
            val erro = runCatching { Pagamento.motor.imprimir(foto) }.getOrElse { it.message ?: "Erro na impressora." }
            principal.post {
                if (erro != null) aviso(erro)
                proximo()
            }
        }
    }

    /** Reduz para 384 pontos e deixa só preto e branco (imprime mais nítido no papel térmico). */
    private fun preparar(origem: Bitmap): Bitmap {
        val alt = (origem.height.toFloat() * PONTOS / origem.width).toInt().coerceAtLeast(1)
        val b = Bitmap.createScaledBitmap(origem, PONTOS, alt, true)
        if (b != origem) origem.recycle()
        val px = IntArray(b.width * b.height)
        b.getPixels(px, 0, b.width, 0, 0, b.width, b.height)
        for (i in px.indices) {
            val p = px[i]
            val lum = (Color.red(p) * 299 + Color.green(p) * 587 + Color.blue(p) * 114) / 1000
            px[i] = if (lum < 150) Color.BLACK else Color.WHITE
        }
        val out = Bitmap.createBitmap(b.width, b.height, Bitmap.Config.ARGB_8888)
        out.setPixels(px, 0, b.width, 0, 0, b.width, b.height)
        b.recycle()
        return out
    }

    private fun aviso(t: String) = Toast.makeText(tela, t, Toast.LENGTH_LONG).show()
}
