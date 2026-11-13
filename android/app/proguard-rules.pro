# A ponte com a página do Atendimento é chamada por nome a partir do JavaScript
-keepclassmembers class br.tec.livefood.pos.Ponte { @android.webkit.JavascriptInterface <methods>; }
# Leitura dos dados da venda devolvidos pelo kit (feita por nome)
-keep class com.paytime.** { *; }
