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
    static func fallbackPrompt(text: String, toZomi: Bool) -> String {
        let glossaryLines = glossary
            .map { "- \"\($0.key)\" = \($0.value)" }
            .sorted()
            .joined(separator: "\n")
        let exampleLines = examples
            .map { toZomi ? "- \"\($0.source)\" = \"\($0.target)\"" : "- \"\($0.target)\" = \"\($0.source)\"" }
            .joined(separator: "\n")

        if !toZomi {
            return """
            You are a professional Zomi (ISO 639-3: ctd) to English translator.
            Use EXCLUSIVELY standard Zomi (ISO 639-3: ctd). No related variety (Paite, Mizo, Hakha, Falam, Lai, Mara).
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

        return """
        You are a professional English to Zomi (ISO 639-3: ctd) translator.
        Use EXCLUSIVELY standard Zomi (ISO 639-3: ctd). NEVER use Paite, Mizo, Hakha Chin, Falam, or any other related variety.
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
}
