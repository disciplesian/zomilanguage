//
//  ZomiTranslatorApp.swift
//  ZomiTranslator
//

import SwiftUI

@main
struct ZomiTranslatorApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var themeManager = ThemeManager()
    @State private var translationStore = TranslationStore()
    @State private var authManager = AuthManager()

    init() {
        // Build the dictionary search index in the background so the first
        // keystroke on Translate or Dictionary is instant.
        DictionaryData.warmUp()
        AppRouter.registerQuickActions()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(themeManager)
                .environment(translationStore)
                .environment(authManager)
                .environment(AppRouter.shared)
                .environment(NetworkMonitor.shared)
        }
    }
}
