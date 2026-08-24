import SwiftUI

/// Settings screen — clone of the Expo Settings tab (Appearance selector,
/// Personalisation, Support, Community, Data reset, About links, footer).
struct SettingsView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GlossaryStore.self) private var glossary
    @Environment(TranslationStore.self) private var translations

    @State private var showResetConfirm = false
    @State private var showResetDone = false

    private var colors: ThemeColors { theme.colors }

    var body: some View {
        ZStack {
            AppBackground(colors: colors, isDark: theme.isDark, showOrbs: true)

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    header

                    section("Account") {
                        AccountCard()
                    }

                    section("Appearance") {
                        GlassCard(padding: 10, colors: colors, isDark: theme.isDark) {
                            themeSelector
                        }
                    }

                    section("Personalisation") {
                        GlassCard(padding: 0, colors: colors, isDark: theme.isDark) {
                            NavigationLink {
                                GlossaryView()
                            } label: {
                                settingsRow(
                                    icon: "book",
                                    iconTint: colors.accent,
                                    iconBackground: colors.glassYellow,
                                    title: "My Zomi Glossary"
                                )
                            }
                        }
                    }

                    section("Support") {
                        GlassCard(padding: 0, colors: colors, isDark: theme.isDark) {
                            NavigationLink {
                                ContactView()
                            } label: {
                                settingsRow(
                                    icon: "envelope",
                                    iconTint: colors.success,
                                    iconBackground: colors.glassGreen,
                                    title: "Contact Support"
                                )
                            }
                        }
                    }

                    section("Data") {
                        VStack(alignment: .leading, spacing: 10) {
                            GlassCard(padding: 0, colors: colors, isDark: theme.isDark) {
                                Button {
                                    showResetConfirm = true
                                } label: {
                                    settingsRow(
                                        icon: "trash",
                                        iconTint: Color(hex: 0xFF5A5A),
                                        iconBackground: Color(hex: 0xFF5A5A, alpha: 0.18),
                                        title: "Reset App Data"
                                    )
                                }
                            }
                            Text("Zomi Translator stores your data on this device only. Resetting clears your saved translations and glossary.")
                                .font(.system(size: 12))
                                .foregroundStyle(colors.textMuted)
                                .padding(.horizontal, 4)
                        }
                    }

                    section("About") {
                        GlassCard(padding: 0, colors: colors, isDark: theme.isDark) {
                            VStack(spacing: 0) {
                                NavigationLink {
                                    AboutView()
                                } label: {
                                    settingsRow(
                                        icon: "info.circle",
                                        iconTint: colors.primary,
                                        iconBackground: colors.glassCyan,
                                        title: "About Zomi Translator"
                                    )
                                }
                                divider
                                Link(destination: URL(string: "https://zomi.me/privacy")!) {
                                    settingsRow(
                                        icon: "shield",
                                        iconTint: colors.tertiary,
                                        iconBackground: colors.glassPurple,
                                        title: "Privacy Policy"
                                    )
                                }
                                divider
                                Link(destination: URL(string: "https://zomi.me/terms")!) {
                                    settingsRow(
                                        icon: "doc.plaintext",
                                        iconTint: colors.accent,
                                        iconBackground: colors.glassYellow,
                                        title: "Terms of Service"
                                    )
                                }
                                divider
                                Link(destination: URL(string: "https://zomi.me/contact")!) {
                                    settingsRow(
                                        icon: "envelope",
                                        iconTint: colors.success,
                                        iconBackground: colors.glassGreen,
                                        title: "Contact Support"
                                    )
                                }
                            }
                        }
                    }

                    GlassCard(variant: .cyan, padding: 16, colors: colors, isDark: theme.isDark) {
                        HStack(spacing: 10) {
                            Image(systemName: "heart.fill")
                                .foregroundStyle(colors.secondary)
                            Text("Made with love for the Zomi community")
                                .font(.system(size: 14))
                                .foregroundStyle(colors.textSecondary)
                        }
                        .frame(maxWidth: .infinity)
                    }

                    VStack(spacing: 6) {
                        Text("\u{201C}Trust in the Lord with all your heart and lean not on your own understanding.\u{201D}")
                            .font(.system(size: 14))
                            .italic()
                            .foregroundStyle(colors.textSecondary)
                            .multilineTextAlignment(.center)
                        Text("— Proverbs 3:5 (NIV)")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(colors.textMuted)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.horizontal, 20)

                    VStack(spacing: 4) {
                        Text("Zomi Translator")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(colors.textSecondary)
                        Text("© 2026 Zomi Language & Literature Resource Center")
                            .font(.system(size: 12))
                            .foregroundStyle(colors.textMuted)
                    }
                    .frame(maxWidth: .infinity)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 90)
            }
        }
        .confirmationDialog("Reset App Data", isPresented: $showResetConfirm, titleVisibility: .visible) {
            Button("Reset Everything", role: .destructive) {
                Haptics.warning()
                translations.clear()
                glossary.clear()
                showResetDone = true
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will permanently delete your saved translations and glossary on this device. This cannot be undone.")
        }
        .alert("Done", isPresented: $showResetDone) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("All app data has been cleared.")
        }
    }

    private var header: some View {
        HStack(spacing: 14) {
            HeaderIconTile(
                systemImage: "gearshape",
                gradient: [Color(hex: 0x6C5CE7, alpha: 0.4), Color(hex: 0x00D9FF, alpha: 0.4)],
                borderColor: colors.glassBorder
            )
            VStack(alignment: .leading, spacing: 2) {
                Text("Settings")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundStyle(colors.text)
                Text("Customize your experience")
                    .font(.system(size: 14))
                    .foregroundStyle(colors.textSecondary)
            }
            Spacer()
        }
        .padding(.top, 8)
    }

    private var themeSelector: some View {
        HStack(spacing: 8) {
            ForEach(ThemeMode.allCases) { mode in
                let active = theme.mode == mode
                Button {
                    Haptics.selection()
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                        theme.mode = mode
                    }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: mode.systemImage)
                            .font(.system(size: 16))
                            .foregroundStyle(active ? colors.primary : colors.textSecondary)
                        Text(mode.label)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(active ? colors.text : colors.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(active ? colors.glassCyan : colors.glass)
                    .clipShape(.rect(cornerRadius: 12))
                    .overlay {
                        RoundedRectangle(cornerRadius: 12)
                            .strokeBorder(active ? colors.glassCyanBorder : colors.glassBorder, lineWidth: 1)
                    }
                }
            }
        }
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
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(colors.text)
            content()
        }
    }

    private func settingsRow(icon: String, iconTint: Color, iconBackground: Color, title: String) -> some View {
        HStack(spacing: 14) {
            iconBackground
                .frame(width: 44, height: 44)
                .overlay {
                    Image(systemName: icon)
                        .font(.system(size: 18))
                        .foregroundStyle(iconTint)
                        .allowsHitTesting(false)
                }
                .clipShape(.rect(cornerRadius: 14))

            Text(title)
                .font(.system(size: 16))
                .foregroundStyle(colors.text)
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(colors.textMuted)
        }
        .padding(16)
        .contentShape(.rect)
    }
}
