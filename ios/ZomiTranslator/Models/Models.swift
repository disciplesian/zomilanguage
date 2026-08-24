import Foundation

/// A user-defined glossary term sent to the AI for personalized accuracy.
nonisolated struct GlossaryTerm: Identifiable, Codable, Equatable {
    let id: String
    var term: String
    var meaning: String
    let createdAt: Date

    init(term: String, meaning: String) {
        self.init(
            id: "g_" + UUID().uuidString.lowercased(),
            term: term,
            meaning: meaning,
            createdAt: Date()
        )
    }

    init(id: String, term: String, meaning: String, createdAt: Date) {
        self.id = id
        self.term = term
        self.meaning = meaning
        self.createdAt = createdAt
    }
}

/// A saved translation — powers both the offline cache and the History tab.
/// Language fields are catalog codes ("zomi", "english", "burmese", …).
nonisolated struct SavedTranslation: Identifiable, Codable, Equatable {
    let id: String
    let sourceText: String
    let translatedText: String
    let sourceLanguage: String
    let targetLanguage: String
    let confidence: Int
    let model: String?
    let createdAt: Date
    var isFavorite: Bool

    init(
        sourceText: String,
        translatedText: String,
        sourceLanguage: String,
        targetLanguage: String,
        confidence: Int,
        model: String?
    ) {
        self.id = UUID().uuidString
        self.sourceText = sourceText
        self.translatedText = translatedText
        self.sourceLanguage = sourceLanguage
        self.targetLanguage = targetLanguage
        self.confidence = confidence
        self.model = model
        self.createdAt = Date()
        self.isFavorite = false
    }

    /// Normalized cache key (target + lowercased trimmed source).
    var cacheKey: String {
        Self.makeCacheKey(text: sourceText, target: targetLanguage)
    }

    static func makeCacheKey(text: String, target: String) -> String {
        "\(target)::\(text.trimmingCharacters(in: .whitespacesAndNewlines).lowercased())"
    }
}

nonisolated struct Scripture: Identifiable, Equatable {
    let id: String
    let verseZomi: String
    let verseEnglish: String
    let reference: String
    let category: String
}

nonisolated struct Flashcard: Identifiable, Codable, Equatable {
    var id: String { front + back }
    let front: String
    let back: String
}

nonisolated struct TextAnalysis: Equatable {
    let characters: Int
    let charactersNoSpaces: Int
    let words: Int
    let sentences: Int
    let paragraphs: Int
    let avgWordLength: String
    let avgSentenceLength: String
    let topWords: [(word: String, count: Int)]
    let readingTimeMinutes: Int
    let speakingTimeMinutes: Int

    static func == (lhs: TextAnalysis, rhs: TextAnalysis) -> Bool {
        lhs.characters == rhs.characters && lhs.words == rhs.words && lhs.sentences == rhs.sentences
    }

    static func analyze(_ text: String) -> TextAnalysis? {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }

        let words = trimmed.split(whereSeparator: { $0.isWhitespace }).map(String.init)
        let sentences = trimmed
            .components(separatedBy: CharacterSet(charactersIn: ".!?"))
            .filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
        let paragraphs = trimmed
            .components(separatedBy: "\n\n")
            .filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }

        var freq: [String: Int] = [:]
        for word in words {
            let normalized = word.lowercased().filter { $0.isLetter }
            if !normalized.isEmpty { freq[normalized, default: 0] += 1 }
        }
        let top = freq.sorted { $0.value > $1.value }.prefix(10).map { (word: $0.key, count: $0.value) }

        let avgWord = words.isEmpty ? 0 : Double(words.reduce(0) { $0 + $1.count }) / Double(words.count)
        let avgSentence = sentences.isEmpty ? 0 : Double(words.count) / Double(sentences.count)

        return TextAnalysis(
            characters: text.count,
            charactersNoSpaces: text.filter { !$0.isWhitespace }.count,
            words: words.count,
            sentences: sentences.count,
            paragraphs: max(paragraphs.count, 1),
            avgWordLength: String(format: "%.1f", avgWord),
            avgSentenceLength: String(format: "%.1f", avgSentence),
            topWords: Array(top),
            readingTimeMinutes: max(1, Int(ceil(Double(words.count) / 200))),
            speakingTimeMinutes: max(1, Int(ceil(Double(words.count) / 150)))
        )
    }
}
