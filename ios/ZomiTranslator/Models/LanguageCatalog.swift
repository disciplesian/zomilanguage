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
/// tag used for speech synthesis. Translation is currently offered in two
/// directions only — Zomi ⇄ English — so the catalog contains just those two.
nonisolated enum LanguageCatalog {
    static let zomi = LanguageOption(code: "zomi", label: "Zomi", native: "Zou", tts: "en-US")
    static let english = LanguageOption(code: "english", label: "English", native: "English", tts: "en-US")

    /// The two primary languages pinned at the top of the picker.
    static let primary: [LanguageOption] = [zomi, english]

    /// Additional target languages. TEMPORARILY EMPTY: translation is
    /// limited to Zomi ⇄ English only. Restore the full list here when other
    /// directions are enabled again.
    static let others: [LanguageOption] = []

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
