package br.tec.livefood.pos

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import java.text.NumberFormat
import java.util.Locale

/** Peças de tela com botões grandes (pensado para o dedo do garçom). */
object Ui {
    const val LARANJA = 0xFFFF5A00.toInt()
    const val VERDE = 0xFF16A34A.toInt()
    const val VERMELHO = 0xFFDC2626.toInt()
    const val WHATS = 0xFF1FA855.toInt()
    const val CINZA = 0xFFF1F1F1.toInt()
    const val TEXTO = 0xFF1F1A17.toInt()
    const val SUAVE = 0xFF6B625C.toInt()

    fun dp(c: Context, v: Int) = (v * c.resources.displayMetrics.density).toInt()

    fun reais(centavos: Long): String = NumberFormat.getCurrencyInstance(Locale("pt", "BR")).format(centavos / 100.0)

    fun texto(c: Context, t: String, sp: Float = 18f, negrito: Boolean = false, cor: Int = TEXTO, centro: Boolean = true) =
        TextView(c).apply {
            text = t; textSize = sp; setTextColor(cor)
            if (negrito) setTypeface(typeface, Typeface.BOLD)
            if (centro) gravity = Gravity.CENTER_HORIZONTAL
        }

    fun botao(c: Context, t: String, fundo: Int = LARANJA, letra: Int = Color.WHITE, clique: () -> Unit) =
        Button(c).apply {
            text = t; textSize = 20f; isAllCaps = false; setTextColor(letra)
            setTypeface(typeface, Typeface.BOLD)
            background = GradientDrawable().apply { setColor(fundo); cornerRadius = dp(c, 14).toFloat() }
            minHeight = dp(c, 64)
            setOnClickListener { clique() }
        }

    fun coluna(c: Context) = LinearLayout(c).apply {
        orientation = LinearLayout.VERTICAL
        val p = dp(c, 16); setPadding(p, p, p, p)
    }

    fun linha(c: Context, v: View, topo: Int = 12): LinearLayout.LayoutParams =
        LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(c, topo) }
}
