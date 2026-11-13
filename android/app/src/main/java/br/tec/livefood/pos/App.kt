package br.tec.livefood.pos

import android.app.Application
import android.webkit.WebView

class App : Application() {
    override fun onCreate() {
        super.onCreate()
        // Permite "fotografar" a página inteira do cupom para imprimir na bobina
        WebView.enableSlowWholeDocumentDraw()
        Pagamento.motor.configurar(this)
    }
}
