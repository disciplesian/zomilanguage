import Foundation
import SwiftUI

/// Drives the Translate screen. Dictionary words and short phrases are
/// answered instantly on the device; sentences stream from the Zomi AI
/// service. Free for everyone — guests get a daily allowance of AI words.
@Observable
final class TranslatorViewModel {
    var inputText = "" {
        didSet { scheduleTranslation() }
    }
    var isZomiToEnglish = true {
        didSet { scheduleTranslation() }
    }

    private(set) var outputText = ""
    private(set) var isTranslating = false
    /// True from request start until the response completes.
    private(set) var isStreaming = false
    /// True once any streamed token has arrived for the current request.
    private(set) var hasStreamedText = false
    /// True while an automatic retry reconnects after a network blip.
    private(set) var isConnecting = false
    private(set) var quality = 0
    /// True when the current result came straight from the verified dictionary.
    private(set) var isVerifiedWord = false
    /// Alternative renderings for words with several common senses.
    private(set) var alternatives: [String] = []
    private(set) var errorText: String?
    /// True when the error is the friendly daily-allowance note.
    private(set) var isLimitNotice = false
    /// Remaining free AI words today (guests only, shown after half is used).
    private(set) var freeWordsLeft: Int?

    var translationStore: TranslationStore?

    /// App Store guideline 5.1: explicit consent before sending user text to
    /// a third-party AI service. Persisted across launches.
    var aiConsentGiven: Bool {
        get { UserDefaults.standard.bool(forKey: "ai_consent_given") }
        set { UserDefaults.standard.set(newValue, forKey: "ai_consent_given") }
    }

    /// Records user consent for AI processing and re-runs the current translation.
    func grantAIConsent() {
        aiConsentGiven = true
        errorText = nil
        lastTranslatedText = ""
        scheduleTranslation()
    }

    private var debounceTask: Task<Void, Never>?
    private var streamTask: Task<Void, Never>?
    private var historyTask: Task<Void, Never>?
    private var requestId = 0
    private var lastTranslatedText = ""
    private var lastDirection = "zomi→english"

    var targetLanguage: String { isZomiToEnglish ? "english" : "zomi" }
    var sourceLanguage: String { isZomiToEnglish ? "zomi" : "english" }
    var sourceLabel: String { isZomiToEnglish ? "Zomi" : "English" }
    var targetLabel: String { isZomiToEnglish ? "English" : "Zomi" }

    var wordCount: Int {
        let trimmed = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? 0 : trimmed.split(whereSeparator: { $0.isWhitespace }).count
    }

    /// Swap button: flips the direction; with output present, the previous
    /// translation becomes the new input (full reversal).
    func swapLanguages() {
        let previousInput = inputText
        let previousOutput = outputText
        let canReverse = !previousOutput.isEmpty && errorText == nil

        isZomiToEnglish.toggle()

        if canReverse {
            lastTranslatedText = previousOutput.trimmingCharacters(in: .whitespacesAndNewlines)
            lastDirection = "\(sourceLanguage)→\(targetLanguage)"
            inputText = previousOutput
            outputText = previousInput
        } else {
            lastTranslatedText = ""
            outputText = ""
        }
        quality = 0
        alternatives = []
        isVerifiedWord = false
    }

    func clear() {
        debounceTask?.cancel()
        streamTask?.cancel()
        historyTask?.cancel()
        inputText = ""
        resetOutput()
    }

    /// Promotes one of the alternative renderings to the main translation.
    func promoteAlternative(_ alternative: String) {
        guard !alternative.isEmpty else { return }
        let previous = outputText
        outputText = alternative
        alternatives = alternatives.map { $0 == alternative ? previous : $0 }
    }

    func retry() {
        lastTranslatedText = ""
        translate(text: inputText)
    }

    /// Runs the translation now (keyboard Done / Translate tap), skipping the typing pause.
    func translateNow() {
        debounceTask?.cancel()
        translate(text: inputText)
    }

    private func resetOutput() {
        outputText = ""
        quality = 0
        alternatives = []
        errorText = nil
        isLimitNotice = false
        isVerifiedWord = false
        isTranslating = false
        isStreaming = false
        isConnecting = false
        hasStreamedText = false
        lastTranslatedText = ""
    }

    private func scheduleTranslation() {
        debounceTask?.cancel()
        let text = inputText
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !trimmed.isEmpty else {
            streamTask?.cancel()
            resetOutput()
            return
        }

        // Instant path: verified dictionary words appear on the very keystroke,
        // with no network and no consent needed (nothing leaves the device).
        if showInstantDictionaryAnswer(for: trimmed) { return }

        guard aiConsentGiven else {
            errorText = "Please agree to AI translation processing to continue."
            return
        }

        debounceTask = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(250))
            guard !Task.isCancelled else { return }
            self?.translate(text: text)
        }
    }

    /// Shows a verified dictionary answer immediately. Returns true on a hit.
    @discardableResult
    private func showInstantDictionaryAnswer(for trimmed: String) -> Bool {
        guard let hit = DictionaryData.instantTranslation(trimmed, zomiToEnglish: isZomiToEnglish) else { return false }
        requestId += 1
        streamTask?.cancel()
        lastTranslatedText = trimmed
        lastDirection = "\(sourceLanguage)→\(targetLanguage)"
        outputText = hit.text
        alternatives = hit.alternatives
        quality = 100
        isVerifiedWord = true
        errorText = nil
        isLimitNotice = false
        isTranslating = false
        isStreaming = false
        isConnecting = false
        hasStreamedText = false
        saveToHistoryWhenSettled(SavedTranslation(
            sourceText: trimmed,
            translatedText: hit.text,
            sourceLanguage: sourceLanguage,
            targetLanguage: targetLanguage,
            confidence: 100,
            model: "verified-dictionary"
        ))
        return true
    }

    /// Saves to History only once typing has paused, so each keystroke doesn't add an entry.
    private func saveToHistoryWhenSettled(_ translation: SavedTranslation) {
        historyTask?.cancel()
        historyTask = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(1200))
            guard !Task.isCancelled, let self else { return }
            guard self.inputText.trimmingCharacters(in: .whitespacesAndNewlines) == translation.sourceText else { return }
            self.translationStore?.save(translation)
        }
    }

    func translate(text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        if showInstantDictionaryAnswer(for: trimmed) { return }

        guard aiConsentGiven else {
            errorText = "Please agree to AI translation processing to continue."
            return
        }

        // Skip identical re-translations (prevents flicker on refocus).
        let directionKey = "\(sourceLanguage)→\(targetLanguage)"
        if trimmed == lastTranslatedText && directionKey == lastDirection && errorText == nil { return }

        requestId += 1
        let currentRequest = requestId
        lastTranslatedText = trimmed
        lastDirection = directionKey
        errorText = nil
        isLimitNotice = false
        hasStreamedText = false
        isConnecting = false
        isVerifiedWord = false
        alternatives = []

        let target = targetLanguage
        let source = sourceLanguage

        // Device cache hit: show immediately.
        if let hit = translationStore?.lookup(text: trimmed, target: target) {
            outputText = hit.translatedText
            quality = hit.confidence
            isTranslating = false
            isStreaming = false
            if hit.confidence >= 90 { return }
        } else if outputText.isEmpty {
            isTranslating = true
        }

        isStreaming = true
        streamTask?.cancel()
        streamTask = Task { [weak self] in
            guard let self else { return }
            var streamedText = ""

            for await event in TranslationService.shared.stream(
                text: trimmed,
                sourceLanguage: source,
                targetLanguage: target,
                extraGlossary: [:]
            ) {
                guard currentRequest == self.requestId, !Task.isCancelled else { return }
                switch event {
                case .start:
                    self.isConnecting = false
                case .connecting:
                    self.isConnecting = true
                case .delta(let piece):
                    streamedText += piece
                    self.outputText = streamedText
                    self.isTranslating = false
                    self.isConnecting = false
                    self.hasStreamedText = true
                case .done(let full, let model, let confidence, let alts):
                    let final = full.isEmpty ? streamedText : full
                    guard !final.isEmpty else { break }
                    self.outputText = final
                    self.quality = confidence
                    self.alternatives = alts
                    self.isVerifiedWord = model == "verified-dictionary"
                    self.isTranslating = false
                    self.isStreaming = false
                    self.isConnecting = false
                    let saved = SavedTranslation(
                        sourceText: trimmed,
                        translatedText: final,
                        sourceLanguage: source,
                        targetLanguage: target,
                        confidence: confidence,
                        model: model
                    )
                    self.translationStore?.save(saved)
                    ReviewPrompter.recordSuccess()
                case .usage(let used, let limit, let signedIn):
                    if signedIn || used < 0 || limit <= 0 {
                        if signedIn { self.freeWordsLeft = nil }
                    } else {
                        let left = max(0, limit - used)
                        self.freeWordsLeft = used * 2 > limit ? left : nil
                    }
                case .failure(let message):
                    if message == "cancelled" { return }
                    self.isTranslating = false
                    self.isStreaming = false
                    self.isConnecting = false
                    // Last resort: a cached earlier answer beats an error.
                    if self.outputText.isEmpty,
                       let hit = self.translationStore?.lookup(text: trimmed, target: target) {
                        self.outputText = hit.translatedText
                        self.quality = hit.confidence
                        return
                    }
                    self.isLimitNotice = message == "word_limit_reached"
                    if self.isLimitNotice { self.freeWordsLeft = 0 }
                    self.errorText = Self.friendlyMessage(for: message)
                    self.outputText = ""
                    ReviewPrompter.recordError()
                    return
                }
            }
            if currentRequest == self.requestId {
                self.isStreaming = false
                self.isTranslating = false
            }
        }
    }

    /// Maps service error codes to short, kind, non-technical messages.
    static func friendlyMessage(for code: String) -> String {
        switch code {
        case "word_limit_reached":
            return "You've used today's free words. Sign in for unlimited translation, or come back tomorrow. Dictionary words still work."
        case "rate_limited", "TOO_MANY_REQUESTS":
            return "Lots of translations at once. Please wait a moment and try again."
        case "text_too_long":
            return "That's a long text. Please translate up to 500 characters at a time, or sign in for longer texts."
        case "dictionary_only":
            return "Sentence translation is busy right now. Dictionary words still work. Please try again shortly."
        case "blocked":
            return "Translation isn't available on this device right now. Contact support@zomitranslator.com if this seems wrong."
        case "session_expired":
            return "Your sign-in has expired. Please sign in again from Settings."
        default:
            let lower = code.lowercased()
            if lower.contains("offline") || lower.contains("network") || lower.contains("internet") || lower.contains("connect") {
                return "You're offline. Dictionary words still work. Reconnect for sentences."
            }
            if lower.contains("timed out") {
                return "The connection is slow. Please try again."
            }
            return "Translation didn't come through. Please try again."
        }
    }
}
