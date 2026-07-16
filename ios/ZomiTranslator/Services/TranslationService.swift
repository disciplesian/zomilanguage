import Foundation

nonisolated struct StreamResult {
    let ok: Bool
    let text: String
    let model: String?
    let error: String?
    let confidence: Int
}

nonisolated enum TranslationEvent {
    case start(model: String)
    case delta(text: String)
    case done(text: String, model: String, confidence: Int)
    case failure(message: String)
}

/// Streams translations token-by-token from the shared Rork backend SSE endpoint
/// (POST /api/translate/stream), with a Rork toolkit fallback. Mirrors the Expo
/// useStreamingTranslation hook + client fallback.
nonisolated final class TranslationService: Sendable {
    static let shared = TranslationService()

    private var baseURL: String {
        let url = Config.EXPO_PUBLIC_RORK_API_BASE_URL
        if !url.isEmpty {
            return url.hasSuffix("/") ? String(url.dropLast()) : url
        }
        return "https://api.rork.app"
    }

    /// Streams a translation. Emits events as they arrive; the stream finishes
    /// after a `.done` or `.failure` event.
    func stream(
        text: String,
        targetLanguage: Language,
        extraGlossary: [String: String]
    ) -> AsyncStream<TranslationEvent> {
        AsyncStream { continuation in
            let task = Task {
                do {
                    guard let url = URL(string: "\(baseURL)/api/translate/stream") else {
                        continuation.yield(.failure(message: "invalid_url"))
                        continuation.finish()
                        return
                    }
                    var request = URLRequest(url: url)
                    request.httpMethod = "POST"
                    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
                    request.timeoutInterval = 60

                    let body: [String: Any] = [
                        "text": text,
                        "targetLanguage": targetLanguage.rawValue,
                        "extraGlossary": extraGlossary,
                    ]
                    request.httpBody = try JSONSerialization.data(withJSONObject: body)

                    let (bytes, response) = try await URLSession.shared.bytes(for: request)
                    guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                        let code = (response as? HTTPURLResponse)?.statusCode ?? -1
                        continuation.yield(.failure(message: "HTTP \(code)"))
                        continuation.finish()
                        return
                    }

                    var accumulated = ""
                    var model = ""
                    var confidence = 0
                    var currentEvent = "message"
                    var sawDone = false

                    for try await line in bytes.lines {
                        if Task.isCancelled { break }
                        if line.hasPrefix("event:") {
                            currentEvent = line.dropFirst(6).trimmingCharacters(in: .whitespaces)
                        } else if line.hasPrefix("data:") {
                            let payload = line.dropFirst(5).trimmingCharacters(in: .whitespaces)
                            guard let data = payload.data(using: .utf8),
                                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
                            else { continue }

                            switch currentEvent {
                            case "start":
                                if let m = json["model"] as? String {
                                    model = m
                                    continuation.yield(.start(model: m))
                                }
                            case "delta":
                                if let piece = json["text"] as? String {
                                    accumulated += piece
                                    continuation.yield(.delta(text: piece))
                                }
                            case "confidence":
                                if let c = json["confidence"] as? Int { confidence = c }
                            case "done":
                                let full = (json["text"] as? String) ?? accumulated
                                let m = (json["model"] as? String) ?? model
                                if let c = json["confidence"] as? Int, c > 0 { confidence = c }
                                sawDone = true
                                continuation.yield(.done(text: full, model: m, confidence: confidence > 0 ? confidence : 95))
                            case "error":
                                let message = (json["message"] as? String) ?? (json["code"] as? String) ?? "stream_error"
                                sawDone = true
                                continuation.yield(.failure(message: message))
                            default:
                                break
                            }
                        }
                        if sawDone { break }
                    }

                    if !sawDone {
                        if accumulated.isEmpty {
                            continuation.yield(.failure(message: "no_data"))
                        } else {
                            continuation.yield(.done(text: accumulated, model: model, confidence: confidence > 0 ? confidence : 90))
                        }
                    }
                } catch is CancellationError {
                    continuation.yield(.failure(message: "cancelled"))
                } catch {
                    continuation.yield(.failure(message: error.localizedDescription))
                }
                continuation.finish()
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    /// Non-streaming fallback via the Rork toolkit LLM, mirroring the Expo
    /// client-side generateText fallback.
    func fallbackTranslate(text: String, toZomi: Bool) async throws -> String {
        let prompt = ZomiPrompt.fallbackPrompt(text: text, toZomi: toZomi)
        return try await ToolkitService.shared.generateText(prompt: prompt)
    }
}
