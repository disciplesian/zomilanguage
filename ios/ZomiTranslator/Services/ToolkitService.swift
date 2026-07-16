import Foundation

nonisolated enum ToolkitError: LocalizedError {
    case invalidResponse
    case httpError(Int)
    case emptyCompletion

    var errorDescription: String? {
        switch self {
        case .invalidResponse: return "Invalid response from AI service."
        case .httpError(let code): return "AI service error (HTTP \(code))."
        case .emptyCompletion: return "The AI returned an empty response."
        }
    }
}

/// Client for the Rork toolkit AI endpoints (text generation + speech-to-text),
/// the same endpoints the Expo app uses via @rork-ai/toolkit-sdk.
nonisolated final class ToolkitService: Sendable {
    static let shared = ToolkitService()

    private var toolkitBaseURL: String {
        let url = Config.EXPO_PUBLIC_TOOLKIT_URL
        if !url.isEmpty {
            return url.hasSuffix("/") ? String(url.dropLast()) : url
        }
        return "https://toolkit.rork.com"
    }

    /// Generates text from a plain prompt via the toolkit LLM endpoint.
    func generateText(prompt: String) async throws -> String {
        guard let url = URL(string: "\(toolkitBaseURL)/text/llm/") else {
            throw ToolkitError.invalidResponse
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 60
        let body: [String: Any] = [
            "messages": [["role": "user", "content": prompt]]
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw ToolkitError.invalidResponse }
        guard http.statusCode == 200 else { throw ToolkitError.httpError(http.statusCode) }
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let completion = json["completion"] as? String,
              !completion.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        else { throw ToolkitError.emptyCompletion }
        return completion.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Transcribes a recorded audio file via the toolkit STT endpoint.
    func transcribe(audioFileURL: URL) async throws -> String {
        guard let url = URL(string: "\(toolkitBaseURL)/stt/transcribe/") else {
            throw ToolkitError.invalidResponse
        }
        let audioData = try Data(contentsOf: audioFileURL)
        let boundary = "Boundary-\(UUID().uuidString)"

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 60

        let ext = audioFileURL.pathExtension.isEmpty ? "m4a" : audioFileURL.pathExtension
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"audio\"; filename=\"recording.\(ext)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: audio/\(ext)\r\n\r\n".data(using: .utf8)!)
        body.append(audioData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw ToolkitError.invalidResponse }
        guard http.statusCode == 200 else { throw ToolkitError.httpError(http.statusCode) }
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let text = json["text"] as? String
        else { throw ToolkitError.invalidResponse }
        return text
    }
}
