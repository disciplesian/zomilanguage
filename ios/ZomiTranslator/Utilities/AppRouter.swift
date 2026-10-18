import Network
import SwiftUI
import UIKit

/// Top-level tabs of the app.
enum AppTab: String, Hashable {
    case translate, dictionary, history, settings
}

/// Shared navigation state: lets any screen switch tabs (e.g. the daily
/// allowance note's "Sign in" button opens Settings) and lets home-screen
/// quick actions open Translate or Dictionary directly.
@Observable
final class AppRouter {
    static let shared = AppRouter()

    var selectedTab: AppTab = .translate
    /// Incremented when a quick action asks Translate/Dictionary to focus its text box.
    var focusRequest = 0

    func open(_ tab: AppTab, focus: Bool = false) {
        selectedTab = tab
        if focus { focusRequest += 1 }
    }

    /// Registers the long-press home-screen shortcuts.
    static func registerQuickActions() {
        UIApplication.shared.shortcutItems = [
            UIApplicationShortcutItem(
                type: "translate",
                localizedTitle: "Translate",
                localizedSubtitle: "Zomi \u{21C4} English",
                icon: UIApplicationShortcutIcon(systemImageName: "character.bubble"),
                userInfo: nil
            ),
            UIApplicationShortcutItem(
                type: "dictionary",
                localizedTitle: "Look up a word",
                localizedSubtitle: "Zomi dictionary",
                icon: UIApplicationShortcutIcon(systemImageName: "book"),
                userInfo: nil
            ),
        ]
    }

    func handle(shortcutType: String) {
        switch shortcutType {
        case "translate": open(.translate)
        case "dictionary": open(.dictionary)
        default: break
        }
    }
}

/// App delegate that routes home-screen quick actions to the router.
final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        configurationForConnecting connectingSceneSession: UISceneSession,
        options: UIScene.ConnectionOptions
    ) -> UISceneConfiguration {
        if let item = options.shortcutItem {
            AppRouter.shared.handle(shortcutType: item.type)
        }
        let config = UISceneConfiguration(name: nil, sessionRole: connectingSceneSession.role)
        config.delegateClass = QuickActionSceneDelegate.self
        return config
    }
}

final class QuickActionSceneDelegate: NSObject, UIWindowSceneDelegate {
    func windowScene(
        _ windowScene: UIWindowScene,
        performActionFor shortcutItem: UIApplicationShortcutItem,
        completionHandler: @escaping (Bool) -> Void
    ) {
        AppRouter.shared.handle(shortcutType: shortcutItem.type)
        completionHandler(true)
    }
}

/// Live connectivity status for the offline note.
@Observable
final class NetworkMonitor {
    static let shared = NetworkMonitor()

    private(set) var isOnline = true
    private let monitor = NWPathMonitor()

    private init() {
        monitor.pathUpdateHandler = { path in
            let online = path.status == .satisfied
            Task { @MainActor in
                NetworkMonitor.shared.isOnline = online
            }
        }
        monitor.start(queue: DispatchQueue(label: "zomi.network.monitor"))
    }
}
