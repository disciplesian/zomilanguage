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

    /** Additional target languages, sorted by display name. */
    val OTHERS: List<LanguageOption> = listOf(
        LanguageOption("amharic", "Amharic", "አማርኛ", "am"),
        LanguageOption("arabic", "Arabic", "العربية", "ar"),
        LanguageOption("bengali", "Bengali", "বাংলা", "bn"),
        LanguageOption("burmese", "Burmese", "မြန်မာ", "my"),
        LanguageOption("chinese_simplified", "Chinese (Simplified)", "简体中文", "zh-CN"),
        LanguageOption("chinese_traditional", "Chinese (Traditional)", "繁體中文", "zh-TW"),
        LanguageOption("dutch", "Dutch", "Nederlands", "nl"),
        LanguageOption("filipino", "Filipino", "Filipino", "fil"),
        LanguageOption("french", "French", "Français", "fr"),
        LanguageOption("german", "German", "Deutsch", "de"),
        LanguageOption("greek", "Greek", "Ελληνικά", "el"),
        LanguageOption("hausa", "Hausa", "Hausa", "ha"),
        LanguageOption("hebrew", "Hebrew", "עברית", "he"),
        LanguageOption("hindi", "Hindi", "हिन्दी", "hi"),
        LanguageOption("indonesian", "Indonesian", "Bahasa Indonesia", "id"),
        LanguageOption("italian", "Italian", "Italiano", "it"),
        LanguageOption("japanese", "Japanese", "日本語", "ja"),
        LanguageOption("khmer", "Khmer", "ខ្មែរ", "km"),
        LanguageOption("korean", "Korean", "한국어", "ko"),
        LanguageOption("lao", "Lao", "ລາວ", "lo"),
        LanguageOption("malay", "Malay", "Bahasa Melayu", "ms"),
        LanguageOption("nepali", "Nepali", "नेपाली", "ne"),
        LanguageOption("persian", "Persian", "فارسی", "fa"),
        LanguageOption("polish", "Polish", "Polski", "pl"),
        LanguageOption("portuguese", "Portuguese", "Português", "pt"),
        LanguageOption("russian", "Russian", "Русский", "ru"),
        LanguageOption("sinhala", "Sinhala", "සිංහල", "si"),
        LanguageOption("somali", "Somali", "Soomaali", "so"),
        LanguageOption("spanish", "Spanish", "Español", "es"),
        LanguageOption("swahili", "Swahili", "Kiswahili", "sw"),
        LanguageOption("tamil", "Tamil", "தமிழ்", "ta"),
        LanguageOption("thai", "Thai", "ไทย", "th"),
        LanguageOption("turkish", "Turkish", "Türkçe", "tr"),
        LanguageOption("ukrainian", "Ukrainian", "Українська", "uk"),
        LanguageOption("urdu", "Urdu", "اردو", "ur"),
        LanguageOption("vietnamese", "Vietnamese", "Tiếng Việt", "vi"),
        LanguageOption("yoruba", "Yoruba", "Yorùbá", "yo"),
    )

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
