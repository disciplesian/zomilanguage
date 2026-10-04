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
    /// Emitted when a transient network failure triggers an automatic retry —
    /// the UI shows a "Connecting..." indicator while this is in flight.
    case connecting
    case done(text: String, model: String, confidence: Int, alternatives: [String])
    case failure(message: String)
}

/// One AI-generated example sentence pair for a dictionary entry.
nonisolated struct EntryExample: Codable, Sendable {
    let english: String
    let zomi: String
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

    /// Stable per-device identifier for the anonymous free tier. Guests may
    /// translate up to 1,500 words before an account is required.
    var anonymousId: String {
        if let existing = KeychainHelper.get("anonymous_id") {
            return existing
        }
        let created = UUID().uuidString
        KeychainHelper.set("anonymous_id", value: created)
        return created
    }

    /// Normalizes the "alternatives" payload from the done event: at most 2
    /// unique, non-empty strings that differ from the primary translation.
    private static func normalizeAlternatives(_ raw: Any?, primary: String) -> [String] {
        guard let list = raw as? [Any] else { return [] }
        var out: [String] = []
        for item in list {
            guard let value = (item as? String)?.trimmingCharacters(in: .whitespacesAndNewlines),
                  !value.isEmpty, value != primary, !out.contains(value) else { continue }
            out.append(value)
            if out.count == 2 { break }
        }
        return out
    }

    /// Streams a translation. Emits events as they arrive; the stream finishes
    /// after a `.done` or `.failure` event. Transient connection failures are
    /// retried automatically (up to 2 times) with a `.connecting` event before
    /// each retry so the UI can show a "Connecting..." indicator.
    func stream(
        text: String,
        sourceLanguage: String,
        targetLanguage: String,
        extraGlossary: [String: String]
    ) -> AsyncStream<TranslationEvent> {
        AsyncStream { continuation in
            let task = Task {
                // Free tier: members translate without limits; guests draw
                // down a 1,500-word allowance tracked by anonymous ID.
                let accessToken = KeychainHelper.get("access_token")
                let guestId = anonymousId
                guard let url = URL(string: "\(baseURL)/api/translate/stream") else {
                    continuation.yield(.failure(message: "invalid_url"))
                    continuation.finish()
                    return
                }
                var request = URLRequest(url: url)
                request.httpMethod = "POST"
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
                request.setValue(guestId, forHTTPHeaderField: "X-Anonymous-Id")
                if let accessToken {
                    request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
                }
                request.timeoutInterval = 60

                let body: [String: Any] = [
                    "text": text,
                    "sourceLanguage": sourceLanguage,
                    "targetLanguage": targetLanguage,
                    "extraGlossary": extraGlossary,
                    "anonymousId": guestId,
                ]
                request.httpBody = try? JSONSerialization.data(withJSONObject: body)

                let maxRetries = 2
                var attempt = 0

                streamLoop: while true {
                    do {
                        let (bytes, response) = try await URLSession.shared.bytes(for: request)
                        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                            let code = (response as? HTTPURLResponse)?.statusCode ?? -1
                            if code == 401 {
                                // Read the JSON error body to tell an exhausted free
                                // tier apart from an expired member session.
                                var raw = ""
                                for try await line in bytes.lines {
                                    raw += line
                                    if raw.count > 512 { break }
                                }
                                let errorCode = ((try? JSONSerialization.jsonObject(with: Data(raw.utf8))) as? [String: Any])?["error"] as? String
                                continuation.yield(.failure(message: errorCode ?? "sign_in_required"))
                                break streamLoop
                            }
                            // Transient 5xx: retry with backoff before failing.
                            if attempt < maxRetries, code >= 500 {
                                attempt += 1
                                continuation.yield(.connecting)
                                try? await Task.sleep(for: .milliseconds(400 << (attempt - 1)))
                                continue streamLoop
                            }
                            continuation.yield(.failure(message: "HTTP \(code)"))
                            break streamLoop
                        }

                        var accumulated = ""
                        var model = ""
                        var confidence = 0
                        var alternatives: [String] = []
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
                                    alternatives = Self.normalizeAlternatives(json["alternatives"], primary: full)
                                    sawDone = true
                                    continuation.yield(.done(text: full, model: m, confidence: confidence > 0 ? confidence : 95, alternatives: alternatives))
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
                                // Server closed with nothing streamed — usually a
                                // transient blip, so retry before giving up.
                                if attempt < maxRetries {
                                    attempt += 1
                                    continuation.yield(.connecting)
                                    try? await Task.sleep(for: .milliseconds(400 << (attempt - 1)))
                                    continue streamLoop
                                }
                                continuation.yield(.failure(message: "no_data"))
                            } else {
                                continuation.yield(.done(text: accumulated, model: model, confidence: confidence > 0 ? confidence : 90, alternatives: alternatives))
                            }
                        }
                        break streamLoop
                    } catch is CancellationError {
                        continuation.yield(.failure(message: "cancelled"))
                        break streamLoop
                    } catch {
                        // Network-level failure — retry before surfacing an error.
                        if attempt < maxRetries {
                            attempt += 1
                            continuation.yield(.connecting)
                            try? await Task.sleep(for: .milliseconds(800 << (attempt - 1)))
                            continue streamLoop
                        }
                        continuation.yield(.failure(message: error.localizedDescription))
                        break streamLoop
                    }
                }
                continuation.finish()
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    /// Non-streaming fallback via the Rork toolkit LLM, mirroring the Expo
    /// client-side generateText fallback.
    func fallbackTranslate(text: String, sourceLanguage: String, targetLanguage: String) async throws -> String {
        let prompt = ZomiPrompt.fallbackPrompt(text: text, sourceLanguage: sourceLanguage, targetLanguage: targetLanguage)
        return try await ToolkitService.shared.generateText(prompt: prompt)
    }

    /// Fetches two AI-generated example sentences for a verified dictionary
    /// entry (POST /api/dictionary/examples). Returns [] when unavailable.
    func fetchEntryExamples(english: String, zomi: String, pos: String) async -> [EntryExample] {
        guard let url = URL(string: "\(baseURL)/api/dictionary/examples") else { return [] }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(anonymousId, forHTTPHeaderField: "X-Anonymous-Id")
        if let accessToken = KeychainHelper.get("access_token") {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }
        request.timeoutInterval = 45
        let body: [String: Any] = ["english": english, "zomi": zomi, "pos": pos, "anonymousId": anonymousId]
        guard let data = try? JSONSerialization.data(withJSONObject: body) else { return [] }
        request.httpBody = data
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { return [] }
            struct ExamplesResponse: Codable {
                let examples: [EntryExample]
            }
            return (try? JSONDecoder().decode(ExamplesResponse.self, from: data))?.examples ?? []
        } catch {
            return []
        }
    }
}
