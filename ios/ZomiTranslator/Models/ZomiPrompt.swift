import Foundation

/// Shared Zomi translation prompt + glossary.
/// Mirrors expo/constants/zomiPrompt.ts so both clients cannot drift apart.
nonisolated enum ZomiPrompt {
    static let glossary: [String: String] = [
        "Lungdam": "Thank you (lit. happy heart)",
        "Pasian": "God",
        "Kham": "suffering",
        "Nung": "heart/mind",
        "Innkuan": "family",
        "Nasep": "work",
        "Hoih": "good/beautiful",
        "Hat": "strong",
        "Kidah": "well-being (\"An kidah?\" = How are you?)",
        "Dam": "well/healthy",
        "Pai": "go",
        "Hong": "come",
        "Ne": "eat",
        "Thei": "know/understand",
        "Gen": "say/tell",
        "Mu": "see",
        "Za": "hear",
        "It": "love",
        "Lau": "fear",
        "Om": "exist/stay/live",
        "Nei": "have/possess",
        "Pia": "give",
        "La": "take/song/book",
        "Sem/Sep": "do/work",
        "Zil": "learn/study",
        "Hilh": "teach",
        "Mai kum": "next year",
        "Kum bangzah": "how old",
    ]

    static let examples: [(source: String, target: String)] = [
        ("How are you?", "An kidah?"),
        ("I am fine", "Ka dam e"),
        ("Thank you very much", "Lungdam mahmah"),
        ("What are you planning to do next year?", "Mai kum ciang bang sep sawm na?"),
        ("How old are you?", "Na kum bangzah hiam?"),
        ("I am not well", "Ka dam kei"),
        ("God loves you", "Pasian in nang hong it hi"),
        ("My family is well", "Ka innkuan dam uh"),
    ]

    /// Plain-text fallback prompt for the Rork toolkit fallback path.
    /// `sourceLanguage`/`targetLanguage` are catalog codes ("zomi", "english",
    /// "burmese", …).
    static func fallbackPrompt(text: String, sourceLanguage: String, targetLanguage: String) -> String {
        let glossaryLines = glossary
            .map { "- \"\($0.key)\" = \($0.value)" }
            .sorted()
            .joined(separator: "\n")
        let exampleLines = examples
            .map { "- \"\($0.source)\" = \"\($0.target)\"" }
            .joined(separator: "\n")

        if targetLanguage == "zomi" {
            return """
            You are a professional English to Zomi translator.
            "Zomi" means exactly TEDIM CHIN (ISO 639-3: ctd) — no other variety.
            Use EXCLUSIVELY standard Zomi (Tedim Chin, ISO 639-3: ctd). NEVER use Paite, Mizo/Lushai, Hakha/Lai Chin, Falam, Mara, Zou, or any other related variety — they are different languages.
            Translate meaning, not words. Never omit, add, or explain.

            ZOMI GLOSSARY:
            \(glossaryLines)

            GRAMMAR: SOV word order (Subject-Object-Verb); negation with "kei"/"lo" after the verb; future "ding", past "zo", progressive "lai"; questions end with "hiam"/"maw".
            STYLE: Detect the register of the input — dictionary word, everyday sentence, song lyrics, news, scripture/theology, prayer/religious, or poetry — and match it in Zomi. Use terminology consistent with the Zomi Bible and hymnal for religious text. Preserve line breaks for songs and poetry.

            EXAMPLES:
            \(exampleLines)

            Translate: "\(text)"

            Output ONLY the Zomi translation:
            """
        }

        if targetLanguage == "english" {
            return """
            You are a professional Zomi (Tedim Chin, ISO 639-3: ctd) to English translator.
            The source language is exactly Tedim Chin (ISO 639-3: ctd) — trust this and do not re-detect it. No related variety (Paite, Mizo/Lushai, Hakha/Lai, Falam, Mara, Zou).
            Translate meaning, not words. Never omit, add, or explain.
            STYLE: Match the register of the input — dictionary word, everyday sentence, song lyrics, news, scripture/theology, prayer/religious, or poetry — and mirror it in English. Use terminology consistent with the Zomi Bible for religious text. Preserve line breaks for songs and poetry.

            ZOMI GLOSSARY:
            \(glossaryLines)

            EXAMPLES:
            \(exampleLines)

            Translate: "\(text)"

            Output ONLY the English translation:
            """
        }

        // Custom target language: name both languages explicitly.
        let sourceName = sourceLanguage == "zomi" ? "Zomi (Tedim Chin, ISO 639-3: ctd)" : LanguageCatalog.label(sourceLanguage)
        let targetName = LanguageCatalog.label(targetLanguage)
        return """
        You are a professional \(sourceName) to \(targetName) translator.
        Translate meaning, not words. Never omit, add, or explain.
        STYLE: Match the register of the input — dictionary word, everyday sentence, song lyrics, news, scripture/theology, prayer/religious, or poetry — and mirror it in \(targetName). Preserve line breaks for songs and poetry.

        Translate: "\(text)"

        Output ONLY the \(targetName) translation:
        """
    }
}
