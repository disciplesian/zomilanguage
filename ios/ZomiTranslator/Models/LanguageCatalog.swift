import Foundation

/// One selectable target language in the translator's language picker.
nonisolated struct LanguageOption: Identifiable, Equatable {
    let code: String
    let label: String
    let native: String
    let tts: String

    var id: String { code }
}

/// Language catalog for the translator's target-language picker.
///
/// `code` is the stable identifier sent to the backend; `tts` is the BCP-47
/// tag used for speech synthesis. Zomi and English are always pinned at the
/// top of the picker; everything else follows alphabetically.
nonisolated enum LanguageCatalog {
    static let zomi = LanguageOption(code: "zomi", label: "Zomi", native: "Zou", tts: "en-US")
    static let english = LanguageOption(code: "english", label: "English", native: "English", tts: "en-US")

    /// The two primary languages pinned at the top of the picker.
    static let primary: [LanguageOption] = [zomi, english]

    /// Additional target languages, sorted by display name.
    static let others: [LanguageOption] = [
        LanguageOption(code: "amharic", label: "Amharic", native: "አማርኛ", tts: "am"),
        LanguageOption(code: "arabic", label: "Arabic", native: "العربية", tts: "ar"),
        LanguageOption(code: "bengali", label: "Bengali", native: "বাংলা", tts: "bn"),
        LanguageOption(code: "burmese", label: "Burmese", native: "မြန်မာ", tts: "my"),
        LanguageOption(code: "chinese_simplified", label: "Chinese (Simplified)", native: "简体中文", tts: "zh-CN"),
        LanguageOption(code: "chinese_traditional", label: "Chinese (Traditional)", native: "繁體中文", tts: "zh-TW"),
        LanguageOption(code: "dutch", label: "Dutch", native: "Nederlands", tts: "nl"),
        LanguageOption(code: "filipino", label: "Filipino", native: "Filipino", tts: "fil"),
        LanguageOption(code: "french", label: "French", native: "Français", tts: "fr"),
        LanguageOption(code: "german", label: "German", native: "Deutsch", tts: "de"),
        LanguageOption(code: "greek", label: "Greek", native: "Ελληνικά", tts: "el"),
        LanguageOption(code: "hausa", label: "Hausa", native: "Hausa", tts: "ha"),
        LanguageOption(code: "hebrew", label: "Hebrew", native: "עברית", tts: "he"),
        LanguageOption(code: "hindi", label: "Hindi", native: "हिन्दी", tts: "hi"),
        LanguageOption(code: "indonesian", label: "Indonesian", native: "Bahasa Indonesia", tts: "id"),
        LanguageOption(code: "italian", label: "Italian", native: "Italiano", tts: "it"),
        LanguageOption(code: "japanese", label: "Japanese", native: "日本語", tts: "ja"),
        LanguageOption(code: "khmer", label: "Khmer", native: "ខ្មែរ", tts: "km"),
        LanguageOption(code: "korean", label: "Korean", native: "한국어", tts: "ko"),
        LanguageOption(code: "lao", label: "Lao", native: "ລາວ", tts: "lo"),
        LanguageOption(code: "malay", label: "Malay", native: "Bahasa Melayu", tts: "ms"),
        LanguageOption(code: "nepali", label: "Nepali", native: "नेपाली", tts: "ne"),
        LanguageOption(code: "persian", label: "Persian", native: "فارسی", tts: "fa"),
        LanguageOption(code: "polish", label: "Polish", native: "Polski", tts: "pl"),
        LanguageOption(code: "portuguese", label: "Portuguese", native: "Português", tts: "pt"),
        LanguageOption(code: "russian", label: "Russian", native: "Русский", tts: "ru"),
        LanguageOption(code: "sinhala", label: "Sinhala", native: "සිංහල", tts: "si"),
        LanguageOption(code: "somali", label: "Somali", native: "Soomaali", tts: "so"),
        LanguageOption(code: "spanish", label: "Spanish", native: "Español", tts: "es"),
        LanguageOption(code: "swahili", label: "Swahili", native: "Kiswahili", tts: "sw"),
        LanguageOption(code: "tamil", label: "Tamil", native: "தமிழ்", tts: "ta"),
        LanguageOption(code: "thai", label: "Thai", native: "ไทย", tts: "th"),
        LanguageOption(code: "turkish", label: "Turkish", native: "Türkçe", tts: "tr"),
        LanguageOption(code: "ukrainian", label: "Ukrainian", native: "Українська", tts: "uk"),
        LanguageOption(code: "urdu", label: "Urdu", native: "اردو", tts: "ur"),
        LanguageOption(code: "vietnamese", label: "Vietnamese", native: "Tiếng Việt", tts: "vi"),
        LanguageOption(code: "yoruba", label: "Yoruba", native: "Yorùbá", tts: "yo"),
    ]

    /// Every supported target language, primary languages first.
    static let all: [LanguageOption] = primary + others

    /// Display name for a language code; falls back to a prettified code.
    static func label(_ code: String) -> String {
        if let option = all.first(where: { $0.code == code }) { return option.label }
        return code.split(separator: "_")
            .map { $0.prefix(1).uppercased() + $0.dropFirst() }
            .joined(separator: " ")
    }

    /// BCP-47 tag for speech synthesis; falls back to US English.
    static func ttsCode(_ code: String) -> String {
        all.first(where: { $0.code == code })?.tts ?? "en-US"
    }

    /// True when the code is one of the two primary languages.
    static func isPrimary(_ code: String) -> Bool {
        code == "zomi" || code == "english"
    }
}
