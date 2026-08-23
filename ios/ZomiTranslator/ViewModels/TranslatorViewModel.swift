import Foundation
import SwiftUI

/// Drives the Translate screen: debounced auto-translation with streaming
/// token reveal, offline cache, and toolkit fallback — mirroring the Expo
/// translator logic (including the no-flicker rules).
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
    /// True from request start until the response completes — drives the
    /// typing indicator on the Translate screen.
    private(set) var isStreaming = false
    /// True once any streamed token has arrived for the current request.
    private(set) var hasStreamedText = false
    private(set) var quality = 0
    private(set) var errorText: String?

    var translationStore: TranslationStore?
    var glossaryStore: GlossaryStore?

    private var debounceTask: Task<Void, Never>?
    private var streamTask: Task<Void, Never>?
    private var requestId = 0
    private var lastTranslatedText = ""
    private var lastDirection = true

    var targetLanguage: Language { isZomiToEnglish ? .english : .zomi }
    var sourceLanguage: Language { isZomiToEnglish ? .zomi : .english }

    var wordCount: Int {
        let trimmed = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? 0 : trimmed.split(whereSeparator: { $0.isWhitespace }).count
    }

    func swapLanguages() {
        let previousOutput = outputText
        let previousInput = inputText
        isZomiToEnglish.toggle()

        if !previousOutput.isEmpty, errorText == nil {
            lastTranslatedText = previousOutput.trimmingCharacters(in: .whitespacesAndNewlines)
            lastDirection = isZomiToEnglish
            inputText = previousOutput
            outputText = previousInput
        } else {
            lastTranslatedText = ""
            outputText = ""
        }
    }

    func clear() {
        debounceTask?.cancel()
        streamTask?.cancel()
        inputText = ""
        outputText = ""
        quality = 0
        errorText = nil
        isTranslating = false
        isStreaming = false
        hasStreamedText = false
        lastTranslatedText = ""
    }

    func retry() {
        lastTranslatedText = ""
        translate(text: inputText, direction: isZomiToEnglish)
    }

    private func scheduleTranslation() {
        debounceTask?.cancel()
        let text = inputText
        let direction = isZomiToEnglish

        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            outputText = ""
            quality = 0
            errorText = nil
            isTranslating = false
            isStreaming = false
            hasStreamedText = false
            lastTranslatedText = ""
            return
        }

        debounceTask = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(600))
            guard !Task.isCancelled else { return }
            self?.translate(text: text, direction: direction)
        }
    }

    func translate(text: String, direction: Bool) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        // Portal policy: translation is a members-only service.
        guard AuthManager.hasStoredSession() else {
            outputText = ""
            quality = 0
            isTranslating = false
            isStreaming = false
            hasStreamedText = false
            errorText = "Sign in required — please sign in from the Settings tab."
            return
        }

        // Skip identical re-translations (prevents flicker on refocus).
        if trimmed == lastTranslatedText && direction == lastDirection { return }

        requestId += 1
        let currentRequest = requestId
        lastTranslatedText = trimmed
        lastDirection = direction
        errorText = nil
        hasStreamedText = false

        let target: Language = direction ? .english : .zomi
        let source: Language = direction ? .zomi : .english

        // Offline / instant cache hit.
        if let hit = translationStore?.lookup(text: trimmed, target: target) {
            outputText = hit.translatedText
            quality = hit.confidence
            isTranslating = false
            if hit.confidence >= 90 {
                isStreaming = false
                return
            }
        } else if outputText.isEmpty {
            // Only show the loading state when there is nothing on screen yet.
            isTranslating = true
        }

        let extraGlossary = glossaryStore?.asRecord() ?? [:]

        isStreaming = true
        streamTask?.cancel()
        streamTask = Task { [weak self] in
            guard let self else { return }
            var streamedText = ""
            var finished = false

            for await event in TranslationService.shared.stream(
                text: trimmed,
                targetLanguage: target,
                extraGlossary: extraGlossary
            ) {
                guard currentRequest == self.requestId, !Task.isCancelled else { return }
                switch event {
                case .start:
                    break
                case .delta(let piece):
                    streamedText += piece
                    self.outputText = streamedText
                    self.isTranslating = false
                    self.hasStreamedText = true
                case .done(let full, let model, let confidence):
                    let final = full.isEmpty ? streamedText : full
                    guard !final.isEmpty else { break }
                    self.outputText = final
                    self.quality = confidence
                    self.isTranslating = false
                    self.isStreaming = false
                    finished = true
                    self.translationStore?.save(SavedTranslation(
                        sourceText: trimmed,
                        translatedText: final,
                        sourceLanguage: source,
                        targetLanguage: target,
                        confidence: confidence,
                        model: model
                    ))
                case .failure(let message):
                    if message == "cancelled" { return }
                    if message == "word_limit_reached" {
                        self.errorText = "You've used your 1,500 free words — sign in from the Settings tab to keep translating."
                        self.isTranslating = false
                        self.isStreaming = false
                        finished = true
                        break
                    }
                    if message == "sign_in_required" {
                        self.errorText = "Sign in required — please sign in from the Settings tab."
                        self.isTranslating = false
                        self.isStreaming = false
                        finished = true
                        break
                    }
                    print("[Translator] stream failed, falling back: \(message)")
                }
            }

            guard currentRequest == self.requestId, !Task.isCancelled else { return }
            if finished { return }

            // Fallback: Rork toolkit text generation.
            do {
                let fallback = try await TranslationService.shared.fallbackTranslate(
                    text: trimmed,
                    toZomi: !direction
                )
                guard currentRequest == self.requestId else { return }
                self.outputText = fallback
                self.quality = 92
                self.isTranslating = false
                self.isStreaming = false
                self.translationStore?.save(SavedTranslation(
                    sourceText: trimmed,
                    translatedText: fallback,
                    sourceLanguage: source,
                    targetLanguage: target,
                    confidence: 92,
                    model: "rork-toolkit"
                ))
            } catch {
                guard currentRequest == self.requestId else { return }
                self.isTranslating = false
                self.isStreaming = false

                // Last resort: any cached entry.
                if let hit = self.translationStore?.lookup(text: trimmed, target: target) {
                    self.outputText = hit.translatedText
                    self.quality = max(50, hit.confidence - 20)
                    return
                }

                let message = error.localizedDescription.lowercased()
                if message.contains("quota") || message.contains("429") {
                    self.errorText = "Translation quota exceeded. Please wait a moment and try again."
                } else if message.contains("network") || message.contains("offline") || message.contains("internet") {
                    self.errorText = "Network error. Please check your internet connection."
                } else if message.contains("timed out") {
                    self.errorText = "Request timed out. Please try again."
                } else {
                    self.errorText = "Translation failed. Please try again."
                }
            }
        }
    }
}
