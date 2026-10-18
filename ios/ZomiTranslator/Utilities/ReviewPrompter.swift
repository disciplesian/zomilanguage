import StoreKit
import UIKit

/// Asks for an App Store rating with the system prompt after a few successful
/// translations — at most a few times a year, and never right after an error.
@MainActor
enum ReviewPrompter {
    private static let successKey = "review_success_count"
    private static let lastAskKey = "review_last_ask"
    private static let lastErrorKey = "review_last_error"
    private static let successesNeeded = 8
    private static let minDaysBetweenAsks: Double = 100

    static func recordSuccess() {
        let defaults = UserDefaults.standard
        let count = defaults.integer(forKey: successKey) + 1
        defaults.set(count, forKey: successKey)
        guard count >= successesNeeded else { return }

        let now = Date().timeIntervalSince1970
        let lastAsk = defaults.double(forKey: lastAskKey)
        let lastError = defaults.double(forKey: lastErrorKey)
        guard now - lastAsk > minDaysBetweenAsks * 86_400, now - lastError > 120 else { return }

        guard let scene = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first(where: { $0.activationState == .foregroundActive }) else { return }
        defaults.set(now, forKey: lastAskKey)
        defaults.set(0, forKey: successKey)
        Task {
            try? await Task.sleep(for: .seconds(1.5))
            AppStore.requestReview(in: scene)
        }
    }

    static func recordError() {
        UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: lastErrorKey)
    }
}
