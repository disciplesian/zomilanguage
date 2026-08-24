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

    /// Selected A–Z browse letter (offline browsing mode).
    var selectedLetter = "A"

    private(set) var results: [DictionaryEntry] = []
    private(set) var entriesLoaded = false
    private(set) var totalCount = 0

    // MARK: Offline browsing state
    private(set) var browseLetters: [String] = []
    private(set) var browseEntries: [DictionaryEntry] = []

    /// True when no query is typed — the dictionary shows the A–Z index instead.
    var isBrowsing: Bool {
        trimmedQuery.isEmpty
    }

    // MARK: AI fallback state
    private(set) var isAskingAI = false
    private(set) var aiResult: String?
    private(set) var aiError: String?

    /// App Store guideline 5.1: explicit consent before an unmatched query is
    /// sent to the AI translation service. Separate from the Translate tab's
    /// consent so the dictionary disclosure is specific to this feature.
    var aiConsentGiven: Bool {
        get { UserDefaults.standard.bool(forKey: "dictionary_ai_consent_given") }
        set { UserDefaults.standard.set(newValue, forKey: "dictionary_ai_consent_given") }
    }

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
            self?.browseLetters = DictionaryData.browseLetters()
            self?.refreshBrowse()
            self?.refreshResults()

            // Over-the-air dataset update: cached copy first (offline-safe),
            // then a fresh check of /api/dictionary/latest.
            await DictionaryUpdateService.shared.refreshIfNeeded()
            self?.totalCount = DictionaryData.load().count
            self?.browseLetters = DictionaryData.browseLetters()
            self?.refreshBrowse()
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

    private func refreshBrowse() {
        browseEntries = DictionaryData.entries(forLetter: selectedLetter)
    }

    private func scheduleAIFallback() {
        aiTask?.cancel()
        aiResult = nil
        aiError = nil
        isAskingAI = false

        let text = trimmedQuery
        let direction = englishToZomi
        guard text.count >= 2, needsAI else { return }

        // Guideline 5.1: never transmit the query without explicit consent —
        // the view presents the consent alert first.
        guard aiConsentGiven else { return }

        aiTask = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(700))
            guard !Task.isCancelled else { return }
            await self?.askAI(text: text, englishToZomi: direction)
        }
    }

    /// Records consent for AI lookups and answers the current query.
    func grantAIConsent() {
        aiConsentGiven = true
        scheduleAIFallback()
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
                    let lower = message.lowercased()
                    if lower.contains("offline")
                        || lower.contains("network")
                        || lower.contains("internet")
                        || lower.contains("connect")
                        || lower.contains("timed out") {
                        aiError = "You appear to be offline. The verified dictionary still works — reconnect for AI answers."
                    } else {
                        aiError = "AI lookup is unavailable right now. Check your connection and try again."
                    }
                }
                return
            }
        }
    }

    func selectLetter(_ letter: String) {
        selectedLetter = letter
        refreshBrowse()
    }

    func cancelAI() {
        aiTask?.cancel()
        aiTask = nil
        isAskingAI = false
    }
}
