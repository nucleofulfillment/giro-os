package br.tec.livefood.pos

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Bundle
import android.view.WindowManager
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import org.json.JSONObject

/** Tela principal: o Atendimento do LiveFood, em tela cheia, com a ponte para a maquininha. */
class MainActivity : AppCompatActivity() {

    lateinit var web: WebView
    lateinit var impressao: Impressao
    private var cobrancaId = ""
    private var geoPendente: Pair<String, GeolocationPermissions.Callback>? = null
    private var camPendente: PermissionRequest? = null

    private val cobranca = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { r ->
        val txt = r.data?.getStringExtra(CobrancaActivity.RESULTADO)
        val o = txt?.let { runCatching { JSONObject(it) }.getOrNull() }
            ?: JSONObject().put("ok", false).put("cancelado", true).put("msg", "Cobrança cancelada.")
        responder(cobrancaId, o)
    }

    private val pedeGeo = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { r ->
        val ok = r.values.any { it }
        geoPendente?.let { (origem, cb) -> cb.invoke(origem, ok, false) }
        geoPendente = null
    }

    private val pedeCamera = registerForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
        camPendente?.let { if (ok) it.grant(it.resources) else it.deny() }
        camPendente = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        val raiz = FrameLayout(this)
        impressao = Impressao(this, raiz)          // fica atrás da página: monta o cupom para imprimir
        web = WebView(this).apply { setBackgroundColor(Color.WHITE) }
        raiz.addView(web, FrameLayout.LayoutParams(-1, -1))
        setContentView(raiz)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            setGeolocationEnabled(true)
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
            userAgentString = "$userAgentString LiveFoodPOS/${BuildConfig.VERSION_NAME}"
        }
        web.addJavascriptInterface(Ponte(this), "LiveFoodPOS")

        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(v: WebView, req: WebResourceRequest): Boolean {
                val u = req.url
                val nosso = u.host?.let { it == "livefood.tec.br" || it.endsWith(".livefood.tec.br") } == true
                if (u.scheme == "https" && nosso) return false
                // WhatsApp, telefone, mapas etc. abrem fora do app
                runCatching { startActivity(Intent(Intent.ACTION_VIEW, u)) }
                return true
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(origem: String, cb: GeolocationPermissions.Callback) {
                if (temPermissao(Manifest.permission.ACCESS_FINE_LOCATION)) { cb.invoke(origem, true, false); return }
                geoPendente = origem to cb
                pedeGeo.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
            }

            override fun onPermissionRequest(req: PermissionRequest) {
                runOnUiThread {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE !in req.resources) { req.deny(); return@runOnUiThread }
                    if (temPermissao(Manifest.permission.CAMERA)) req.grant(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE))
                    else { camPendente = req; pedeCamera.launch(Manifest.permission.CAMERA) }
                }
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // o "voltar" primeiro fecha as janelas abertas na página; depois volta a página; por fim pergunta se quer sair
                web.evaluateJavascript("(function(){try{return window.posVoltar?posVoltar():false}catch(e){return false}})()") { r ->
                    if (r == "true") return@evaluateJavascript
                    if (web.canGoBack()) web.goBack()
                    else AlertDialog.Builder(this@MainActivity)
                        .setMessage("Fechar o LiveFood?")
                        .setPositiveButton("Fechar") { _, _ -> finish() }
                        .setNegativeButton("Continuar", null).show()
                }
            }
        })

        // modo de teste: o cupom "impresso" aparece na tela
        Pagamento.mostrarPrevia = { b -> runOnUiThread { mostrarPrevia(b) } }

        if (savedInstanceState == null) web.loadUrl(BuildConfig.SITE) else web.restoreState(savedInstanceState)
    }

    override fun onSaveInstanceState(out: Bundle) {
        super.onSaveInstanceState(out)
        web.saveState(out)
    }

    private fun temPermissao(p: String) = ContextCompat.checkSelfPermission(this, p) == PackageManager.PERMISSION_GRANTED

    fun abrirCobranca(id: String, forma: Forma, valor: Long) {
        cobrancaId = id
        cobranca.launch(
            Intent(this, CobrancaActivity::class.java)
                .putExtra(CobrancaActivity.FORMA, forma.codigo)
                .putExtra(CobrancaActivity.VALOR, valor)
        )
    }

    fun abrirMenu() = startActivity(Intent(this, MaquininhaActivity::class.java))

    /** Entrega o resultado para a página. */
    fun responder(id: String, o: JSONObject) {
        val js = "window.LiveFoodPOSRetorno&&window.LiveFoodPOSRetorno(${JSONObject.quote(id)},${o})"
        runOnUiThread { web.evaluateJavascript(js, null) }
    }

    private fun mostrarPrevia(b: android.graphics.Bitmap) {
        if (isFinishing) return
        val img = android.widget.ImageView(this).apply {
            setImageBitmap(b); adjustViewBounds = true; setBackgroundColor(Color.WHITE)
            val p = Ui.dp(this@MainActivity, 8); setPadding(p, p, p, p)
        }
        AlertDialog.Builder(this)
            .setTitle("Impressão (bobina 58 mm)")
            .setView(android.widget.ScrollView(this).apply { addView(img) })
            .setPositiveButton("Ok", null).show()
    }

    override fun onDestroy() {
        Pagamento.mostrarPrevia = null
        web.destroy()
        super.onDestroy()
    }
}
