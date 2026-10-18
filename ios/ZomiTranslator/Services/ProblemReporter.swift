import Foundation
import MetricKit

/// Privacy-safe crash and hang reports using Apple's MetricKit.
///
/// iOS delivers crash/hang diagnostics on the next launch. Only a short
/// signature (exception type, signal, scrubbed termination reason, hang
/// duration) and the app version are sent — never user ids, device ids,
/// or translated text.
nonisolated final class ProblemReporter: NSObject, MXMetricManagerSubscriber, @unchecked Sendable {
    static let shared = ProblemReporter()

    private struct Report: Encodable {
        let platform: String = "ios"
        let appVersion: String
        let kind: String
        let signature: String
        let screen: String = ""
    }

    private struct Batch: Encodable {
        let reports: [Report]
    }

    private var isStarted = false

    private var baseURL: String {
        let url = Config.EXPO_PUBLIC_RORK_FUNCTIONS_URL.isEmpty
            ? Config.EXPO_PUBLIC_RORK_API_BASE_URL
            : Config.EXPO_PUBLIC_RORK_FUNCTIONS_URL
        guard !url.isEmpty else { return "https://zomilanguage-backend.rork.app" }
        return url.hasSuffix("/") ? String(url.dropLast()) : url
    }

    private var appVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
    }

    /// Registers for MetricKit diagnostics. Call once at launch.
    func start() {
        guard !isStarted else { return }
        isStarted = true
        MXMetricManager.shared.add(self)
    }

    func didReceive(_ payloads: [MXDiagnosticPayload]) {
        var reports: [Report] = []
        for payload in payloads {
            for crash in payload.crashDiagnostics ?? [] {
                var parts: [String] = ["Crash"]
                if let type = crash.exceptionType { parts.append("exception \(type)") }
                if let signal = crash.signal { parts.append("signal \(signal)") }
                if let reason = crash.terminationReason { parts.append(Self.scrub(reason)) }
                if let objc = crash.exceptionReason { parts.append(objc.exceptionName) }
                reports.append(Report(
                    appVersion: appVersion,
                    kind: "crash",
                    signature: Self.scrub(parts.joined(separator: " · "))
                ))
            }
            for hang in payload.hangDiagnostics ?? [] {
                let seconds = hang.hangDuration.converted(to: .seconds).value
                let bucket = seconds >= 5 ? "5s+" : seconds >= 2 ? "2-5s" : "under 2s"
                reports.append(Report(appVersion: appVersion, kind: "slow", signature: "Main thread hang \(bucket)"))
            }
        }
        guard !reports.isEmpty else { return }
        send(Array(reports.prefix(20)))
    }

    private func send(_ reports: [Report]) {
        guard let url = URL(string: "\(baseURL)/api/telemetry/problems"),
              let body = try? JSONEncoder().encode(Batch(reports: reports)) else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        request.timeoutInterval = 15
        URLSession.shared.dataTask(with: request).resume()
    }

    private static func scrub(_ raw: String) -> String {
        var text = raw
        let patterns: [(String, String)] = [
            ("([\"'`“”‘’])[^\"'`“”‘’]{0,400}\\1", "…"),
            ("[\\w.+-]+@[\\w-]+\\.[\\w.]+", "<email>"),
            ("0x[0-9a-fA-F]+", "#"),
            ("\\d+", "#"),
            ("\\s+", " "),
        ]
        for (pattern, replacement) in patterns {
            text = text.replacingOccurrences(of: pattern, with: replacement, options: .regularExpression)
        }
        return String(text.trimmingCharacters(in: .whitespaces).prefix(200))
    }
}
