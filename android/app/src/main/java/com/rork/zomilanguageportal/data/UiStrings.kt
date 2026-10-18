package com.rork.zomilanguageportal.data

import android.content.Context
import androidx.compose.runtime.mutableStateOf
import kotlinx.serialization.json.Json

/** Interface language for menus and buttons (translation direction is separate). */
enum class UiLanguage(val code: String, val displayName: String) {
    ENGLISH("en", "English"),
    ZOMI("zo", "Zomi"),
}

/**
 * English → Zomi interface strings from the bundled ui-strings.json (shared
 * with every app). The language is Compose snapshot state, so every
 * composable that calls [tr] recomposes when it changes.
 */
object UiStrings {
    private const val PREFS = "ui_prefs"
    private const val KEY = "ui_language"

    private val language = mutableStateOf(UiLanguage.ENGLISH)
    private var zomi: Map<String, String> = emptyMap()
    private var appContext: Context? = null

    val current: UiLanguage get() = language.value

    fun initialize(context: Context) {
        appContext = context.applicationContext
        val saved = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)
        language.value = UiLanguage.entries.firstOrNull { it.code == saved } ?: UiLanguage.ENGLISH
        zomi = runCatching {
            val raw = context.assets.open("ui-strings.json").bufferedReader().use { it.readText() }
            Json.decodeFromString<Map<String, String>>(raw)
        }.getOrDefault(emptyMap())
    }

    fun setLanguage(value: UiLanguage) {
        language.value = value
        appContext?.getSharedPreferences(PREFS, Context.MODE_PRIVATE)?.edit()?.putString(KEY, value.code)?.apply()
    }

    fun translate(english: String): String {
        if (language.value != UiLanguage.ZOMI) return english
        return zomi[english]?.takeIf { it.isNotBlank() } ?: english
    }
}

/** Interface string in the chosen language, falling back to English. */
fun tr(english: String): String = UiStrings.translate(english)
