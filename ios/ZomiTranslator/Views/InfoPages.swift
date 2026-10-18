import SwiftUI
import UIKit

/// About, Privacy Policy, Terms of Service, and Help & Support — rendered from
/// the bundled info-pages.json (the same text as the website and every app),
/// so they work offline.

// MARK: - Content model

nonisolated struct InfoContent: Decodable, Sendable {
    struct Section: Decodable, Sendable, Identifiable {
        let id: String?
        let title: String
        let body: String?
        let paragraphs: [String]?
        let bullets: [String]?
        var stableId: String { id ?? title }
    }
    struct About: Decodable, Sendable {
        let tagline: String
        let sections: [Section]
    }
    struct Legal: Decodable, Sendable {
        let title: String
        let summary: [String]
        let intro: String
        let sections: [Section]
    }
    struct FAQ: Decodable, Sendable, Hashable {
        let q: String
        let a: String
    }
    struct Tip: Decodable, Sendable, Hashable {
        let title: String
        let body: String
    }
    struct Help: Decodable, Sendable {
        let title: String
        let intro: String
        let faqs: [FAQ]
        let troubleshooting: [Tip]
    }

    let lastUpdated: String
    let supportEmail: String
    let website: String
    let about: About
    let privacy: Legal
    let terms: Legal
    let help: Help

    static let shared: InfoContent? = {
        guard let url = Bundle.main.url(forResource: "info-pages", withExtension: "json"),
              let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(InfoContent.self, from: data)
    }()
}

extension InfoContent.Section: Hashable {
    static func == (lhs: Self, rhs: Self) -> Bool { lhs.stableId == rhs.stableId }
    func hash(into hasher: inout Hasher) { hasher.combine(stableId) }
}

enum AppInfo {
    static var version: String {
        let v = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        let b = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "Version \(v) (\(b))"
    }
}

// MARK: - Shared building blocks

private struct InfoPageScaffold<Content: View>: View {
    @Environment(ThemeManager.self) private var theme
    let title: String
    @ViewBuilder let content: (ThemeColors) -> Content

    var body: some View {
        ZStack {
            AppBackground(colors: theme.colors, isDark: true, showOrbs: true)
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    content(theme.colors)
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 32)
                .frame(maxWidth: 720)
                .frame(maxWidth: .infinity)
            }
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct InfoCard: View {
    @Environment(ThemeManager.self) private var theme
    let section: InfoContent.Section
    var variant: GlassVariant = .standard

    var body: some View {
        GlassCard(variant: variant, colors: theme.colors, isDark: true) {
            VStack(alignment: .leading, spacing: 10) {
                Text(section.title)
                    .font(.headline)
                    .foregroundStyle(theme.colors.text)
                    .accessibilityAddTraits(.isHeader)
                if let body = section.body {
                    Text(body)
                        .font(.body)
                        .foregroundStyle(theme.colors.textSecondary)
                        .lineSpacing(3)
                }
                ForEach(section.paragraphs ?? [], id: \.self) { paragraph in
                    Text(paragraph)
                        .font(.body)
                        .foregroundStyle(theme.colors.textSecondary)
                        .lineSpacing(3)
                }
                ForEach(section.bullets ?? [], id: \.self) { bullet in
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text("\u{2022}").foregroundStyle(theme.colors.primary)
                        Text(bullet)
                            .font(.body)
                            .foregroundStyle(theme.colors.textSecondary)
                    }
                }
            }
        }
    }
}

private struct MissingContent: View {
    var body: some View {
        Text("This page is unavailable. Please reinstall the app or visit zomitranslator.com.")
            .font(.body)
            .foregroundStyle(.white.opacity(0.8))
    }
}

// MARK: - About

struct AboutView: View {
    private let variants: [GlassVariant] = [.cyan, .green, .pink]

    var body: some View {
        InfoPageScaffold(title: "About") { colors in
            VStack(spacing: 8) {
                HeaderIconTile(
                    systemImage: "character.bubble",
                    gradient: [Color(hex: 0x00F0FF, alpha: 0.5), Color(hex: 0x8C5CFF, alpha: 0.5)],
                    borderColor: colors.glassBorder,
                    size: 72
                )
                .accessibilityHidden(true)
                Text("Zomi Translator")
                    .font(.title2.bold())
                    .foregroundStyle(colors.text)
                Text(AppInfo.version)
                    .font(.footnote)
                    .foregroundStyle(colors.textMuted)
                if let tagline = InfoContent.shared?.about.tagline {
                    Text(tagline)
                        .font(.subheadline)
                        .foregroundStyle(colors.textSecondary)
                        .multilineTextAlignment(.center)
                }
            }
            .frame(maxWidth: .infinity)

            if let about = InfoContent.shared?.about {
                ForEach(Array(about.sections.enumerated()), id: \.element.stableId) { index, section in
                    InfoCard(section: section, variant: variants[index % variants.count])
                }
            } else {
                MissingContent()
            }
        }
    }
}

// MARK: - Legal pages

private struct LegalPage: View {
    let legal: InfoContent.Legal?
    let fallbackTitle: String

    var body: some View {
        InfoPageScaffold(title: legal?.title ?? fallbackTitle) { colors in
            if let legal, let content = InfoContent.shared {
                Text("Last updated \(content.lastUpdated)")
                    .font(.footnote)
                    .foregroundStyle(colors.textMuted)

                GlassCard(variant: .cyan, colors: colors, isDark: true) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("In short")
                            .font(.headline)
                            .foregroundStyle(colors.text)
                            .accessibilityAddTraits(.isHeader)
                        ForEach(legal.summary, id: \.self) { item in
                            HStack(alignment: .firstTextBaseline, spacing: 8) {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.footnote)
                                    .foregroundStyle(colors.success)
                                    .accessibilityHidden(true)
                                Text(item)
                                    .font(.body)
                                    .foregroundStyle(colors.textSecondary)
                            }
                        }
                    }
                }

                Text(legal.intro)
                    .font(.body)
                    .foregroundStyle(colors.textSecondary)

                ForEach(legal.sections, id: \.stableId) { section in
                    InfoCard(section: section)
                }
            } else {
                MissingContent()
            }
        }
    }
}

struct PrivacyView: View {
    var body: some View { LegalPage(legal: InfoContent.shared?.privacy, fallbackTitle: "Privacy Policy") }
}

struct TermsView: View {
    var body: some View { LegalPage(legal: InfoContent.shared?.terms, fallbackTitle: "Terms of Service") }
}

// MARK: - Help & Support

struct HelpView: View {
    @State private var expanded: Set<String> = []

    var body: some View {
        InfoPageScaffold(title: "Help & Support") { colors in
            if let help = InfoContent.shared?.help, let content = InfoContent.shared {
                Text(help.intro)
                    .font(.body)
                    .foregroundStyle(colors.textSecondary)

                Button {
                    emailSupport(to: content.supportEmail)
                } label: {
                    Label("Email support", systemImage: "envelope.fill")
                        .font(.headline)
                        .foregroundStyle(Color(hex: 0x0B1020))
                        .frame(maxWidth: .infinity, minHeight: 50)
                        .background(colors.primary, in: .rect(cornerRadius: 14))
                }
                .buttonStyle(PressableButtonStyle())
                .accessibilityHint("Opens a message to \(content.supportEmail)")

                Text("Frequently asked questions")
                    .font(.title3.bold())
                    .foregroundStyle(colors.text)
                    .padding(.top, 8)
                    .accessibilityAddTraits(.isHeader)

                ForEach(help.faqs, id: \.self) { faq in
                    GlassCard(padding: 0, colors: colors, isDark: true) {
                        DisclosureGroup(
                            isExpanded: Binding(
                                get: { expanded.contains(faq.q) },
                                set: { open in
                                    if open { expanded.insert(faq.q) } else { expanded.remove(faq.q) }
                                }
                            )
                        ) {
                            Text(faq.a)
                                .font(.body)
                                .foregroundStyle(colors.textSecondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.top, 6)
                        } label: {
                            Text(faq.q)
                                .font(.headline)
                                .foregroundStyle(colors.text)
                                .multilineTextAlignment(.leading)
                        }
                        .tint(colors.primary)
                        .padding(16)
                    }
                }

                Text("Troubleshooting")
                    .font(.title3.bold())
                    .foregroundStyle(colors.text)
                    .padding(.top, 8)
                    .accessibilityAddTraits(.isHeader)

                GlassCard(variant: .yellow, colors: colors, isDark: true) {
                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(help.troubleshooting, id: \.self) { tip in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(tip.title).font(.subheadline.bold()).foregroundStyle(colors.text)
                                Text(tip.body).font(.subheadline).foregroundStyle(colors.textSecondary)
                            }
                        }
                    }
                }
            } else {
                MissingContent()
            }
        }
    }

    private func emailSupport(to email: String) {
        let device = UIDevice.current
        let body = "\n\n\u{2014}\nApp: Zomi Translator \(AppInfo.version)\nDevice: \(device.model), \(device.systemName) \(device.systemVersion)"
        var components = URLComponents()
        components.scheme = "mailto"
        components.path = email
        components.queryItems = [
            URLQueryItem(name: "subject", value: "Zomi Translator support"),
            URLQueryItem(name: "body", value: body),
        ]
        if let url = components.url {
            UIApplication.shared.open(url) { opened in
                if !opened {
                    UIPasteboard.general.string = email
                }
            }
            Haptics.light()
        }
    }
}

/// Kept for older navigation links: Contact now opens Help & Support.
typealias ContactView = HelpView
