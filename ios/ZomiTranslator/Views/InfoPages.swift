import SwiftUI

/// About, Privacy Policy, Terms of Service, and Contact Support pages —
/// condensed native clones of the Expo info screens.

// MARK: - Shared building blocks

private struct InfoPageScaffold<Content: View>: View {
    @Environment(ThemeManager.self) private var theme
    let title: String
    @ViewBuilder let content: (ThemeColors, Bool) -> Content

    var body: some View {
        ZStack {
            AppBackground(colors: theme.colors, isDark: theme.isDark, showOrbs: true)
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    content(theme.colors, theme.isDark)
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct InfoSection: View {
    @Environment(ThemeManager.self) private var theme
    let title: String
    let systemImage: String
    let variant: GlassVariant
    let body_: String

    var body: some View {
        GlassCard(variant: variant, colors: theme.colors, isDark: theme.isDark) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 10) {
                    Image(systemName: systemImage)
                        .font(.system(size: 17))
                        .foregroundStyle(theme.colors.primary)
                    Text(title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(theme.colors.text)
                }
                Text(body_)
                    .font(.system(size: 14))
                    .foregroundStyle(theme.colors.textSecondary)
                    .lineSpacing(4)
            }
        }
    }
}

// MARK: - About

struct AboutView: View {
    var body: some View {
        InfoPageScaffold(title: "About") { colors, _ in
            VStack(spacing: 8) {
                HeaderIconTile(
                    systemImage: "character.bubble",
                    gradient: [Color(hex: 0x00F0FF, alpha: 0.5), Color(hex: 0x8C5CFF, alpha: 0.5)],
                    borderColor: colors.glassBorder,
                    size: 72
                )
                Text("Zomi Translator")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(colors.text)
                Text("Version 2.3.0")
                    .font(.system(size: 13))
                    .foregroundStyle(colors.textMuted)
            }
            .frame(maxWidth: .infinity)

            InfoSection(
                title: "Our Mission",
                systemImage: "target",
                variant: .cyan,
                body_: "Zomi Translator bridges the gap between the Zomi (Tedim) language and English using modern AI. We are dedicated to preserving and promoting the Zomi language for future generations, making accurate translation accessible to everyone."
            )

            InfoSection(
                title: "The Tedim Dialect",
                systemImage: "book",
                variant: .purple,
                body_: "This app exclusively uses the Tedim dialect of Zomi (ISO 639-3: ctd), spoken primarily in Chin State, Myanmar, and by Zomi communities worldwide. Our AI is carefully instructed to avoid mixing vocabulary from other Kuki-Chin dialects."
            )

            InfoSection(
                title: "AI-Powered Translation",
                systemImage: "sparkles",
                variant: .green,
                body_: "Translations are powered by state-of-the-art AI language models with a curated Tedim glossary and grammar rules. Zomi is a low-resource language, so results keep improving — your custom glossary terms directly improve accuracy."
            )

            InfoSection(
                title: "Community",
                systemImage: "heart",
                variant: .pink,
                body_: "Made with love for the Zomi community by the Zomi Language & Literature Resource Center. Your feedback helps us preserve and promote the beautiful Zomi language."
            )
        }
    }
}

// MARK: - Privacy Policy

struct PrivacyView: View {
    var body: some View {
        InfoPageScaffold(title: "Privacy Policy") { colors, _ in
            Text("Last updated: July 2026")
                .font(.system(size: 12))
                .foregroundStyle(colors.textMuted)

            InfoSection(
                title: "Local-First Storage",
                systemImage: "iphone",
                variant: .cyan,
                body_: "Your translation history, glossary, and settings are stored only on this device. We do not require an account, and we do not collect personal information."
            )

            InfoSection(
                title: "Translation Processing",
                systemImage: "arrow.up.arrow.down.circle",
                variant: .purple,
                body_: "Text you translate is sent securely to our AI translation service to generate results. Text is processed transiently and is not used to build a profile about you."
            )

            InfoSection(
                title: "Microphone & Camera",
                systemImage: "mic",
                variant: .green,
                body_: "Voice input records audio only while you hold an active recording, and it is sent solely for transcription. Camera and photo access are used only to extract text from images you choose. Nothing is stored on our servers."
            )

            InfoSection(
                title: "Your Control",
                systemImage: "hand.raised",
                variant: .yellow,
                body_: "You can erase all app data at any time from Settings → Reset App Data. This permanently deletes your history, glossary, and preferences from this device."
            )

            InfoSection(
                title: "Contact",
                systemImage: "envelope",
                variant: .pink,
                body_: "Questions about privacy? Reach us through Settings → Contact Support and we will respond as soon as possible."
            )
        }
    }
}

// MARK: - Terms of Service

struct TermsView: View {
    var body: some View {
        InfoPageScaffold(title: "Terms of Service") { colors, _ in
            Text("Last updated: July 2026")
                .font(.system(size: 12))
                .foregroundStyle(colors.textMuted)

            InfoSection(
                title: "Acceptance of Terms",
                systemImage: "checkmark.seal",
                variant: .cyan,
                body_: "By using Zomi Translator, you agree to these terms. The app is provided for personal, educational, and community use."
            )

            InfoSection(
                title: "Translation Accuracy",
                systemImage: "exclamationmark.triangle",
                variant: .yellow,
                body_: "Translations are generated by AI and provided \"as is\" without warranty of accuracy. Zomi is a low-resource language; always verify important translations with a fluent speaker before relying on them for legal, medical, or official purposes."
            )

            InfoSection(
                title: "Acceptable Use",
                systemImage: "hand.raised",
                variant: .purple,
                body_: "Do not use the app to translate unlawful, harmful, or abusive content, or attempt to disrupt or reverse-engineer the translation service."
            )

            InfoSection(
                title: "Intellectual Property",
                systemImage: "doc.text",
                variant: .green,
                body_: "The app design, glossary curation, and branding belong to the Zomi Language & Literature Resource Center. Your own text and translations remain yours."
            )

            InfoSection(
                title: "Changes",
                systemImage: "arrow.triangle.2.circlepath",
                variant: .pink,
                body_: "We may update these terms as the app evolves. Continued use after changes constitutes acceptance of the updated terms."
            )
        }
    }
}

// MARK: - Contact Support

struct ContactView: View {
    @Environment(ThemeManager.self) private var theme

    @State private var name = ""
    @State private var email = ""
    @State private var message = ""
    @State private var showMailUnavailable = false
    @State private var sent = false

    private var colors: ThemeColors { theme.colors }

    var body: some View {
        InfoPageScaffold(title: "Contact Support") { colors, isDark in
            VStack(spacing: 8) {
                HeaderIconTile(
                    systemImage: "envelope",
                    gradient: [Color(hex: 0x00FF88, alpha: 0.4), Color(hex: 0x00F0FF, alpha: 0.4)],
                    borderColor: colors.glassBorder,
                    size: 64
                )
                Text("We'd love to hear from you")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(colors.text)
                Text("Questions, feedback, or word suggestions — send us a message.")
                    .font(.system(size: 13))
                    .foregroundStyle(colors.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)

            GlassCard(variant: .cyan, colors: colors, isDark: isDark) {
                VStack(alignment: .leading, spacing: 12) {
                    contactField("Your name", text: $name)
                    contactField("Email address", text: $email, keyboard: .emailAddress)
                    contactField("How can we help?", text: $message, multiline: true)

                    Button {
                        sendMessage()
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "paperplane.fill")
                            Text(sent ? "Message Prepared!" : "Send Message")
                        }
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                        .background {
                            LinearGradient(
                                colors: [Color(hex: 0x00F0FF, alpha: 0.85), Color(hex: 0x8C5CFF, alpha: 0.85)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        }
                        .clipShape(.rect(cornerRadius: 12))
                    }
                    .buttonStyle(PressableButtonStyle())
                }
            }

            InfoSection(
                title: "Suggest a Word",
                systemImage: "text.badge.plus",
                variant: .yellow,
                body_: "Know a Tedim word the translator gets wrong? Add it to My Glossary in Settings — it is applied instantly to your translations — and send it to us here so everyone benefits."
            )
        }
        .alert("Mail Unavailable", isPresented: $showMailUnavailable) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Please fill in a message first, or email us directly at support@zomilanguage.app")
        }
    }

    private func contactField(_ placeholder: String, text: Binding<String>, keyboard: UIKeyboardType = .default, multiline: Bool = false) -> some View {
        TextField(placeholder, text: text, axis: multiline ? .vertical : .horizontal)
            .font(.system(size: 15))
            .foregroundStyle(colors.text)
            .keyboardType(keyboard)
            .lineLimit(multiline ? 4...8 : 1...1)
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(colors.surface)
            .clipShape(.rect(cornerRadius: 12))
            .overlay {
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(colors.glassBorder, lineWidth: 1)
            }
    }

    private func sendMessage() {
        let trimmed = message.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            showMailUnavailable = true
            return
        }
        let subject = "Zomi Translator Support"
        let body = "Name: \(name)\nEmail: \(email)\n\n\(trimmed)"
        let encodedSubject = subject.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let encodedBody = body.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        if let url = URL(string: "mailto:support@zomilanguage.app?subject=\(encodedSubject)&body=\(encodedBody)"),
           UIApplication.shared.canOpenURL(url) {
            UIApplication.shared.open(url)
            sent = true
            Haptics.success()
        } else {
            UIPasteboard.general.string = body
            sent = true
            Haptics.success()
        }
    }
}
