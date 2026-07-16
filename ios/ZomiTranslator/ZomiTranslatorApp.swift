//
//  ZomiTranslatorApp.swift
//  ZomiTranslator
//

import SwiftUI

@main
struct ZomiTranslatorApp: App {
    @State private var themeManager = ThemeManager()
    @State private var translationStore = TranslationStore()
    @State private var glossaryStore = GlossaryStore()
    @State private var speechService = SpeechService()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(themeManager)
                .environment(translationStore)
                .environment(glossaryStore)
                .environment(speechService)
        }
    }
}
