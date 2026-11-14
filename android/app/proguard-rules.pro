# A ponte com a página do Atendimento é chamada por nome a partir do JavaScript
-keepclassmembers class br.tec.livefood.pos.Ponte { @android.webkit.JavascriptInterface <methods>; }
# Leitura dos dados da venda devolvidos pelo kit (feita por nome)
-keep class com.paytime.** { *; }
# Biblioteca da PayStore: conversa com o app de pagamento por dados com nome (não pode ser renomeada)
-keep class br.com.phoebus.** { *; }
-keep interface br.com.phoebus.** { *; }
-dontwarn br.com.phoebus.**
# Gson (usado pela biblioteca da PayStore)
-keep class com.google.gson.** { *; }
-keepattributes Signature, *Annotation*, InnerClasses, EnclosingMethod
-dontwarn com.google.gson.**
