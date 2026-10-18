import SwiftUI

/// Settings: account, learning guides, help, legal pages (all in-app and
/// readable offline), and data controls.
struct SettingsView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(TranslationStore.self) private var translations
    @Environment(\.horizontalSizeClass) private var sizeClass

    @State private var showResetConfirm = false
    @State private var showResetDone = false

    private var colors: ThemeColors { theme.colors }

    var body: some View {
        ZStack {
            AppBackground(colors: colors, isDark: true, showOrbs: true)

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    header

                    section("Account") {
                        AccountCard()
                    }

                    section("Learn") {
                        GlassCard(padding: 0, colors: colors, isDark: true) {
                            VStack(spacing: 0) {
                                NavigationLink { TranslationTipsView() } label: {
                                    settingsRow(icon: "lightbulb", tint: colors.accent, background: colors.glassYellow, title: "Translation Tips")
                                }
                                divider
                                NavigationLink { PronunciationGuideView() } label: {
                                    settingsRow(icon: "textformat.abc", tint: colors.secondary, background: colors.glassPink, title: "Pronunciation Guide")
                                }
                            }
                        }
                    }

                    section("Help & About") {
                        GlassCard(padding: 0, colors: colors, isDark: true) {
                            VStack(spacing: 0) {
                                NavigationLink { HelpView() } label: {
                                    settingsRow(icon: "questionmark.circle", tint: colors.success, background: colors.glassGreen, title: "Help & Support")
                                }
                                divider
                                NavigationLink { AboutView() } label: {
                                    settingsRow(icon: "info.circle", tint: colors.primary, background: colors.glassCyan, title: "About Zomi Translator")
                                }
                                divider
                                NavigationLink { PrivacyView() } label: {
                                    settingsRow(icon: "hand.raised", tint: colors.tertiary, background: colors.glassPurple, title: "Privacy Policy")
                                }
                                divider
                                NavigationLink { TermsView() } label: {
                                    settingsRow(icon: "doc.plaintext", tint: colors.accent, background: colors.glassYellow, title: "Terms of Service")
                                }
                            }
                        }
                    }

                    section("Data") {
                        VStack(alignment: .leading, spacing: 10) {
                            GlassCard(padding: 0, colors: colors, isDark: true) {
                                Button {
                                    showResetConfirm = true
                                } label: {
                                    settingsRow(icon: "trash", tint: Color(hex: 0xFF6B6B), background: Color(hex: 0xFF5A5A, alpha: 0.18), title: "Clear history on this device", chevron: false)
                                }
                                .buttonStyle(.plain)
                            }
                            Text("Your translation history is saved on this device. When you're signed in, it also syncs with your account.")
                                .font(.footnote)
                                .foregroundStyle(colors.textMuted)
                                .padding(.horizontal, 4)
                        }
                    }

                    VStack(spacing: 4) {
                        Text("Zomi Translator")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(colors.textSecondary)
                        Text(AppInfo.version)
                            .font(.footnote)
                            .foregroundStyle(colors.textMuted)
                        Text("\u{00A9} 2026 Zomi Language & Literature Resource Center")
                            .font(.footnote)
                            .foregroundStyle(colors.textMuted)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
                .frame(maxWidth: sizeClass == .regular ? 720 : .infinity)
                .frame(maxWidth: .infinity)
            }
        }
        .confirmationDialog("Clear history?", isPresented: $showResetConfirm, titleVisibility: .visible) {
            Button("Clear history", role: .destructive) {
                Haptics.warning()
                translations.clear()
                showResetDone = true
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This removes every saved translation on this device. It can't be undone.")
        }
        .alert("Done", isPresented: $showResetDone) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Your history on this device has been cleared.")
        }
    }

    private var header: some View {
        HStack(spacing: 14) {
            HeaderIconTile(
                systemImage: "gearshape",
                gradient: [Color(hex: 0x6C5CE7, alpha: 0.4), Color(hex: 0x00D9FF, alpha: 0.4)],
                borderColor: colors.glassBorder
            )
            .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text("Settings")
                    .font(.title.bold())
                    .foregroundStyle(colors.text)
                Text("Account, help, and privacy")
                    .font(.subheadline)
                    .foregroundStyle(colors.textSecondary)
            }
            Spacer()
        }
        .padding(.top, 8)
    }

    private var divider: some View {
        Rectangle()
            .fill(colors.glassBorder)
            .frame(height: 1)
            .padding(.leading, 74)
    }

    private func section(_ title: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.title3.bold())
                .foregroundStyle(colors.text)
                .accessibilityAddTraits(.isHeader)
            content()
        }
    }

    private func settingsRow(icon: String, tint: Color, background: Color, title: String, chevron: Bool = true) -> some View {
        HStack(spacing: 14) {
            background
                .frame(width: 44, height: 44)
                .overlay {
                    Image(systemName: icon)
                        .font(.body)
                        .foregroundStyle(tint)
                        .allowsHitTesting(false)
                }
                .clipShape(.rect(cornerRadius: 14))
                .accessibilityHidden(true)

            Text(title)
                .font(.body)
                .foregroundStyle(colors.text)
                .multilineTextAlignment(.leading)
            Spacer()
            if chevron {
                Image(systemName: "chevron.right")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(colors.textMuted)
                    .accessibilityHidden(true)
            }
        }
        .padding(16)
        .contentShape(.rect)
    }
}
