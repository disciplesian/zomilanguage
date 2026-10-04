package com.rork.zomilanguageportal.data

/**
 * Language catalog for the translator's target-language picker.
 *
 * [LanguageOption.code] is the stable identifier sent to the backend; [LanguageOption.tts]
 * is the BCP-47 tag used for speech synthesis. Zomi and English are always pinned at the
 * top of the picker; everything else follows alphabetically.
 */
data class LanguageOption(
    val code: String,
    val label: String,
    val native: String,
    val tts: String,
)

object LanguageCatalog {

    val ZOMI = LanguageOption("zomi", "Zomi", "Zou", "zomi")
    val ENGLISH = LanguageOption("english", "English", "English", "en")

    /** The two primary languages pinned at the top of the picker. */
    val PRIMARY: List<LanguageOption> = listOf(ZOMI, ENGLISH)

    /**
     * Additional target languages. TEMPORARILY EMPTY: translation is limited
     * to Zomi ⇄ English only. Restore the full list here when other
     * directions are enabled again.
     */
    val OTHERS: List<LanguageOption> = emptyList()

    /** Every supported target language, primary languages first. */
    val ALL: List<LanguageOption> = PRIMARY + OTHERS

    private val byCode = ALL.associateBy { it.code }

    /** Looks up a language option by its code. */
    fun get(code: String): LanguageOption? = byCode[code]

    /** Display name for a language code; falls back to a prettified code. */
    fun label(code: String): String =
        byCode[code]?.label ?: code.split('_').joinToString(" ") { part ->
            part.replaceFirstChar { it.uppercase() }
        }

    /** True when the code is one of the two primary languages. */
    fun isPrimary(code: String): Boolean = code == "zomi" || code == "english"
}
