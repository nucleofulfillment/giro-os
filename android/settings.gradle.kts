// LiveFood POS — app do garçom para a maquininha (Vileve / PayStore, PAX A910S)
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

// Acesso ao kit de pagamento (fornecido pela Vileve). Nunca escreva as senhas aqui:
// elas vêm do local.properties (fora do git) ou dos segredos do GitHub.
fun segredo(nome: String): String? {
    val arq = file("local.properties")
    if (arq.exists()) {
        val p = java.util.Properties()
        arq.inputStream().use { p.load(it) }
        p.getProperty(nome)?.takeIf { it.isNotBlank() }?.let { return it }
    }
    return System.getenv(nome)?.takeIf { it.isNotBlank() }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }
        val url = segredo("PAYOS_MAVEN_URL")
        if (url != null) {
            maven {
                this.url = uri(url)
                credentials {
                    username = segredo("PAYOS_MAVEN_USER")
                    password = segredo("PAYOS_MAVEN_PASS")
                }
                authentication { create<BasicAuthentication>("basic") }
            }
        }
    }
}

rootProject.name = "LiveFoodPOS"
include(":app")
