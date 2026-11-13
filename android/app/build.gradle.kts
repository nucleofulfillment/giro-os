import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

fun segredo(nome: String): String? {
    val arq = rootProject.file("local.properties")
    val local = if (arq.exists()) Properties().apply { arq.inputStream().use { load(it) } }.getProperty(nome) else null
    return listOf(local, System.getenv(nome)).firstOrNull { !it.isNullOrBlank() }
}

val versaoNome = "1.0.0"
val versaoCodigo = (System.getenv("GITHUB_RUN_NUMBER")?.toIntOrNull() ?: 1)

android {
    namespace = "br.tec.livefood.pos"
    compileSdk = 35

    defaultConfig {
        applicationId = "br.tec.livefood.pos"
        minSdk = 24
        targetSdk = 34
        versionCode = versaoCodigo
        versionName = versaoNome
        buildConfigField("String", "SITE", "\"https://livefood.tec.br/atendimento.html\"")
    }

    buildFeatures { buildConfig = true }

    // "sim": cobrança de mentira, roda em qualquer celular Android (para testar o fluxo).
    // "vileve": cobrança de verdade com o kit PayStore/Vileve, só na PAX A910S.
    flavorDimensions += "pagamento"
    productFlavors {
        create("sim") {
            dimension = "pagamento"
            applicationIdSuffix = ".sim"
            versionNameSuffix = "-teste"
            resValue("string", "app_name", "LiveFood Teste")
        }
        create("vileve") {
            dimension = "pagamento"
            targetSdk = 29
            resValue("string", "app_name", "LiveFood")
            ndk {
                abiFilters.clear()
                abiFilters.add("armeabi-v7a")
            }
        }
    }

    val ks = segredo("POS_KEYSTORE_FILE")
    signingConfigs {
        // chave só do app de TESTE (não vale para a versão de verdade): permite atualizar sem desinstalar
        create("teste") {
            storeFile = file("teste.keystore")
            storePassword = "livefoodteste"
            keyAlias = "teste"
            keyPassword = "livefoodteste"
        }
        if (ks != null && file(ks).exists()) {
            create("release") {
                storeFile = file(ks)
                storePassword = segredo("POS_KEYSTORE_PASS")
                keyAlias = segredo("POS_KEY_ALIAS")
                keyPassword = segredo("POS_KEY_PASS")
            }
        }
    }

    buildTypes {
        debug {
            signingConfig = signingConfigs.getByName("teste")
        }
        release {
            signingConfigs.findByName("release")?.let { signingConfig = it }
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    packaging { jniLibs.useLegacyPackaging = true }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin { jvmToolchain(17) }

// configurações do kit só para a versão Vileve (o Gradle cria na hora; declaramos antes para poder usar abaixo)
configurations.maybeCreate("vileveDebugImplementation")
configurations.maybeCreate("vileveReleaseImplementation")

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.zxing:core:3.5.3")   // desenha o QR Code do Pix
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")

    // Kit de pagamento PayStore/Vileve (PAX A960, A910S, A910)
    "vileveDebugImplementation"("com.paytime:payossdk-pax-debug:1.3.0")
    "vileveReleaseImplementation"("com.paytime:payossdk-pax:1.3.0")
}
