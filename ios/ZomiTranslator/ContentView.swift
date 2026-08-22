import SwiftUI

/// Root tab bar — clone of the Expo (tabs) layout:
/// Translate · Tools · History · Settings.
struct ContentView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.colorScheme) private var systemColorScheme

    var body: some View {
        TabView {
            NavigationStack {
                TranslatorView()
                    .toolbar(.hidden, for: .navigationBar)
            }
            .tabItem {
                Label("Translate", systemImage: "character.bubble")
            }

            NavigationStack {
                ToolsView()
            }
            .tabItem {
                Label("Tools", systemImage: "wrench.and.screwdriver")
            }

            NavigationStack {
                HistoryView()
            }
            .tabItem {
                Label("History", systemImage: "clock.arrow.circlepath")
            }

            NavigationStack {
                SettingsView()
                    .navigationTitle("Settings")
                    .navigationBarTitleDisplayMode(.inline)
            }
            .tabItem {
                Label("Settings", systemImage: "gearshape")
            }
        }
        .tint(theme.colors.primary)
        .preferredColorScheme(theme.preferredColorScheme)
        .onAppear {
            theme.systemIsDark = systemColorScheme == .dark
            applyTabBarAppearance()
        }
        .onChange(of: systemColorScheme) { _, newValue in
            theme.systemIsDark = newValue == .dark
            applyTabBarAppearance()
        }
        .onChange(of: theme.mode) { _, _ in
            applyTabBarAppearance()
        }
    }

    /// Match the Expo tab bar look (dark navy translucent bar with hairline top border).
    private func applyTabBarAppearance() {
        let appearance = UITabBarAppearance()
        appearance.configureWithTransparentBackground()
        if theme.isDark {
            appearance.backgroundColor = UIColor(red: 0x2A / 255, green: 0x2F / 255, blue: 0x45 / 255, alpha: 0.95)
            appearance.shadowColor = UIColor.white.withAlphaComponent(0.2)
        } else {
            appearance.backgroundColor = UIColor(red: 0xF4 / 255, green: 0xF6 / 255, blue: 0xFB / 255, alpha: 0.95)
            appearance.shadowColor = UIColor.black.withAlphaComponent(0.1)
        }
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
}

#Preview {
    ContentView()
        .environment(ThemeManager())
        .environment(TranslationStore())
        .environment(GlossaryStore())
        .environment(SpeechService())
        .environment(AuthManager())
}
