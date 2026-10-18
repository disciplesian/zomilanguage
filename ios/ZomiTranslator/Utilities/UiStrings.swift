import Foundation

/// Interface language for menus and buttons (translation direction is separate).
nonisolated enum UiLanguage: String, CaseIterable, Sendable {
    case english = "en"
    case zomi = "zo"

    static let storageKey = "ui_language"

    var displayName: String {
        switch self {
        case .english: "English"
        case .zomi: "Zomi"
        }
    }

    static var current: UiLanguage {
        UiLanguage(rawValue: UserDefaults.standard.string(forKey: storageKey) ?? "") ?? .english
    }
}

/// English → Zomi interface strings, shared with every app via
/// content/ui-strings.json.
nonisolated enum UiStrings {
    static let zomi: [String: String] = {
        guard let url = Bundle.main.url(forResource: "ui-strings", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let map = try? JSONDecoder().decode([String: String].self, from: data) else { return [:] }
        return map
    }()
}

/// Returns the interface string in the chosen language, falling back to English.
nonisolated func L(_ english: String) -> String {
    guard UiLanguage.current == .zomi, let value = UiStrings.zomi[english], !value.isEmpty else { return english }
    return value
}
