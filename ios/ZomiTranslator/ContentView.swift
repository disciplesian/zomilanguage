import SwiftUI

/// Root navigation: Translate · Dictionary · History · Settings.
/// Bottom tabs on iPhone; a sidebar on iPad and wide windows.
struct ContentView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppRouter.self) private var router
    @AppStorage("whats_new_seen_v12") private var whatsNewSeen = false
    @State private var showWhatsNew = false
    @AppStorage(UiLanguage.storageKey) private var uiLanguage: String = UiLanguage.english.rawValue

    var body: some View {
        @Bindable var router = router
        TabView(selection: $router.selectedTab) {
            Tab(L("Translate"), systemImage: "character.bubble", value: AppTab.translate) {
                NavigationStack {
                    TranslatorView()
                        .toolbar(.hidden, for: .navigationBar)
                }
            }

            Tab(L("Dictionary"), systemImage: "book.fill", value: AppTab.dictionary) {
                NavigationStack {
                    DictionaryView()
                        .navigationTitle(L("Dictionary"))
                        .navigationBarTitleDisplayMode(.inline)
                }
            }

            Tab(L("History"), systemImage: "clock.arrow.circlepath", value: AppTab.history) {
                NavigationStack {
                    HistoryView()
                }
            }

            Tab(L("Settings"), systemImage: "gearshape", value: AppTab.settings) {
                NavigationStack {
                    SettingsView()
                        .navigationTitle(L("Settings"))
                        .navigationBarTitleDisplayMode(.inline)
                }
            }
        }
        .tabViewStyle(.sidebarAdaptable)
        // Rebuilds every screen when the interface language changes.
        .id(uiLanguage)
        .tint(theme.colors.primary)
        .preferredColorScheme(.dark)
        .onChange(of: router.selectedTab) { _, _ in
            // Switching tabs always closes the keyboard.
            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
        }
        .onAppear {
            applyTabBarAppearance()
            if !whatsNewSeen && UserDefaults.standard.object(forKey: "ai_consent_given") != nil {
                showWhatsNew = true
            }
            whatsNewSeen = true
        }
        .sheet(isPresented: $showWhatsNew) {
            WhatsNewView()
                .presentationDetents([.medium, .large])
        }
    }

    /// Dark navy translucent bar with a hairline top border.
    private func applyTabBarAppearance() {
        let appearance = UITabBarAppearance()
        appearance.configureWithTransparentBackground()
        appearance.backgroundColor = UIColor(red: 0x2A / 255, green: 0x2F / 255, blue: 0x45 / 255, alpha: 0.95)
        appearance.shadowColor = UIColor.white.withAlphaComponent(0.2)
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
}

/// One-time note shown after updating to this version.
struct WhatsNewView: View {
    @Environment(\.dismiss) private var dismiss
    private let colors = ThemeColors.dark

    var body: some View {
        ZStack {
            AppBackground(colors: colors, isDark: true)
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("What's new")
                        .font(.largeTitle.bold())
                        .foregroundStyle(colors.text)
                    row("gift", "Free for everyone", "Translate Zomi and English without signing in.")
                    row("bolt.fill", "Instant words", "Dictionary words appear the moment you type, even offline.")
                    row("hare.fill", "Faster sentences", "Sentences start appearing in about a second.")
                    row("sparkles", "Lighter app", "A simpler app focused on Translate, Dictionary, and History.")
                    Button {
                        dismiss()
                    } label: {
                        Text("Continue")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .foregroundStyle(Color(hex: 0x0B1020))
                            .background(colors.primary)
                            .clipShape(.rect(cornerRadius: 14))
                    }
                    .padding(.top, 6)
                }
                .padding(24)
                .frame(maxWidth: 560)
                .frame(maxWidth: .infinity)
            }
        }
    }

    private func row(_ icon: String, _ title: String, _ body: String) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(colors.primary)
                .frame(width: 32)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.headline).foregroundStyle(colors.text)
                Text(body).font(.subheadline).foregroundStyle(colors.textSecondary)
            }
        }
    }
}

#Preview {
    ContentView()
        .environment(ThemeManager())
        .environment(TranslationStore())
        .environment(AuthManager())
        .environment(AppRouter.shared)
        .environment(NetworkMonitor.shared)
}
