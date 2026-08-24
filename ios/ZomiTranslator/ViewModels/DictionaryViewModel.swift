import SwiftUI
import Foundation

/// State for the Dictionary tab: instant local search over the verified
/// dataset, with a debounced Zomi AI fallback for words not in the dictionary.
@Observable
final class DictionaryViewModel {
    var query = "" {
        didSet { queryChanged() }
    }

    /// AI fallback direction: true = English → Zomi, false = Zomi → English.
    var englishToZomi = true

    private(set) var results: [DictionaryEntry] = []
    private(set) var entriesLoaded = false
    private(set) var totalCount = 0

    // MARK: AI fallback state
    private(set) var isAskingAI = false
    private(set) var aiResult: String?
    private(set) var aiError: String?

    var trimmedQuery: String {
        query.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Query with no verified match (and long enough) — the AI answers these.
    var needsAI: Bool {
        trimmedQuery.count >= 2 && results.isEmpty && !DictionaryData.hasExactMatch(trimmedQuery)
    }

    private var aiTask: Task<Void, Never>?

    init() {
        Task { [weak self] in
            let all = DictionaryData.load()
            self?.totalCount = all.count
            self?.entriesLoaded = true
            self?.refreshResults()
        }
    }

    private func queryChanged() {
        refreshResults()
        scheduleAIFallback()
    }

    private func refreshResults() {
        results = DictionaryData.search(trimmedQuery, limit: 60)
    }

    private func scheduleAIFallback() {
        aiTask?.cancel()
        aiResult = nil
        aiError = nil
        isAskingAI = false

        let text = trimmedQuery
        let direction = englishToZomi
        guard text.count >= 2, needsAI else { return }

        aiTask = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(700))
            guard !Task.isCancelled else { return }
            await self?.askAI(text: text, englishToZomi: direction)
        }
    }

    @MainActor
    private func askAI(text: String, englishToZomi: Bool) async {
        isAskingAI = true
        defer { isAskingAI = false }

        let source = englishToZomi ? "english" : "zomi"
        let target = englishToZomi ? "zomi" : "english"

        for await event in TranslationService.shared.stream(
            text: text,
            sourceLanguage: source,
            targetLanguage: target,
            extraGlossary: [:]
        ) {
            guard !Task.isCancelled else { return }
            switch event {
            case .start:
                break
            case .delta:
                break
            case .done(let full, _, _):
                let trimmed = full.trimmingCharacters(in: .whitespacesAndNewlines)
                if !trimmed.isEmpty {
                    aiResult = trimmed
                    return
                }
            case .failure(let message):
                switch message {
                case "cancelled":
                    return
                case "word_limit_reached":
                    aiError = "You've used your 1,500 free words — sign in from the Settings tab to keep going."
                case "sign_in_required":
                    aiError = "Sign in required — please sign in from the Settings tab."
                default:
                    aiError = "AI lookup is unavailable right now. Check your connection and try again."
                }
                return
            }
        }
    }

    func cancelAI() {
        aiTask?.cancel()
        aiTask = nil
        isAskingAI = false
    }
}
