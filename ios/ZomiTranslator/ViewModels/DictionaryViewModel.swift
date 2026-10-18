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

    /// Whether the browse list shows every entry for the selected letter.
    /// Collapsed by default so the page shows a clean 4-entry preview.
    var browseExpanded = false

    private(set) var results: [DictionaryEntry] = []
    /** Real-time completions for the search bar (offline, from the verified dataset). */
    private(set) var suggestions: [DictionaryData.Suggestion] = []
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

    var isRefreshing = false

    var trimmedQuery: String {
        query.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Query with no verified match (and long enough) — the AI answers these.
    var needsAI: Bool {
        trimmedQuery.count >= 2 && results.isEmpty && !DictionaryData.hasExactMatch(trimmedQuery)
    }

    private var aiTask: Task<Void, Never>?
    private var searchTask: Task<Void, Never>?
    private var searchGeneration = 0

    init() {
        Task { [weak self] in
            let (count, letters) = await Task.detached(priority: .userInitiated) {
                (DictionaryData.index().entries.count, DictionaryData.browseLetters())
            }.value
            self?.totalCount = count
            self?.entriesLoaded = true
            self?.browseLetters = letters
            self?.refreshBrowse()
            self?.refreshResults()

            // Over-the-air dataset update: cached copy first (offline-safe),
            // then a fresh check of /api/dictionary/latest.
            await self?.refreshDictionary()
        }
    }

    /// Immediate OTA dictionary update check. Used at startup and on pull-to-refresh.
    @MainActor
    func refreshDictionary() async {
        isRefreshing = true
        await DictionaryUpdateService.shared.refreshIfNeeded()
        let all = DictionaryData.load()
        totalCount = all.count
        browseLetters = DictionaryData.browseLetters()
        refreshBrowse()
        refreshResults()
        isRefreshing = false
    }

    private func queryChanged() {
        aiTask?.cancel()
        aiResult = nil
        aiError = nil
        isAskingAI = false
        refreshResults()
    }

    /// Searches off the main thread so typing never stutters; only the
    /// newest keystroke's results are applied.
    private func refreshResults() {
        let q = trimmedQuery
        searchGeneration += 1
        let generation = searchGeneration
        guard !q.isEmpty else {
            results = []
            suggestions = []
            return
        }
        searchTask?.cancel()
        searchTask = Task { [weak self] in
            let (found, suggested) = await Task.detached(priority: .userInitiated) {
                (DictionaryData.search(q, limit: 60), DictionaryData.suggest(q))
            }.value
            guard let self, generation == self.searchGeneration else { return }
            self.results = found
            self.suggestions = suggested
            self.scheduleAIFallback()
        }
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
            try? await Task.sleep(for: .milliseconds(350))
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
            case .connecting:
                break
            case .delta:
                break
            case .usage:
                break
            case .done(let full, _, _, _):
                let trimmed = full.trimmingCharacters(in: .whitespacesAndNewlines)
                if !trimmed.isEmpty {
                    aiResult = trimmed
                    return
                }
            case .failure(let message):
                if message == "cancelled" { return }
                aiError = TranslatorViewModel.friendlyMessage(for: message)
                return
            }
        }
    }

    func selectLetter(_ letter: String) {
        selectedLetter = letter
        browseExpanded = false
        refreshBrowse()
    }

    func cancelAI() {
        aiTask?.cancel()
        aiTask = nil
        isAskingAI = false
    }
}
