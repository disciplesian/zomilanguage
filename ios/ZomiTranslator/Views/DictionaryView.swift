import SwiftUI
import UIKit

/// Dictionary tab — instant search over the 10,620 verified English ⇄ Zomi
/// entries bundled with the app, with a Zomi AI fallback for words that are
/// not in the verified dataset.
struct DictionaryView: View {
    @Environment(ThemeManager.self) private var theme
    @State private var model = DictionaryViewModel()
    @State private var showAIConsent = false

    private var colors: ThemeColors { theme.colors }

    var body: some View {
        ZStack {
            AppBackground(colors: colors, isDark: theme.isDark)

            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    header
                    searchField
                    directionToggle

                    if !model.trimmedQuery.isEmpty && !model.results.isEmpty {
                        Text("\(model.results.count == 60 ? "60+" : "\(model.results.count)") verified \(model.results.count == 1 ? "match" : "matches") for “\(model.trimmedQuery)”")
                            .font(.system(size: 12))
                            .foregroundStyle(colors.textMuted)
                            .padding(.bottom, 2)
                    }

                    if model.isBrowsing {
                        letterIndex
                        Text("\(model.browseEntries.count.formatted()) \(model.browseEntries.count == 1 ? "entry" : "entries") under “\(model.selectedLetter)”")
                            .font(.system(size: 12))
                            .foregroundStyle(colors.textMuted)
                            .padding(.bottom, 2)
                        ForEach(model.browseEntries) { entry in
                            entryRow(entry)
                        }
                    } else {
                        ForEach(model.results) { entry in
                            entryRow(entry)
                        }
                    }

                    if model.needsAI || model.isAskingAI || model.aiResult != nil || model.aiError != nil {
                        aiCard
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .navigationTitle("Dictionary")
        .navigationBarTitleDisplayMode(.inline)
        .onDisappear { model.cancelAI() }
        .alert("Zomi AI Lookup Consent", isPresented: $showAIConsent) {
            Button("Don't Allow", role: .cancel) {}
            Button("Allow") {
                model.grantAIConsent()
            }
        } message: {
            Text("Words not found in the verified dictionary are answered by Google Gemini AI. When you use this, your search word is sent securely to Google for processing. By continuing, you consent to this processing.")
        }
    }

    // MARK: Header

    private var header: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "book.fill")
                .font(.system(size: 26))
                .foregroundStyle(colors.primary)
            VStack(alignment: .leading, spacing: 4) {
                Text("Zomi Dictionary")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(colors.text)
                Text("\(model.totalCount.formatted()) verified entries · English ⇄ Zomi")
                    .font(.system(size: 13))
                    .foregroundStyle(colors.textSecondary)
            }
            Spacer()
            HStack(spacing: 4) {
                Image(systemName: "wifi.slash")
                    .font(.system(size: 10))
                Text("Offline ready")
                    .font(.system(size: 10, weight: .bold))
                    .textCase(.uppercase)
            }
            .foregroundStyle(colors.warning)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                Capsule()
                    .fill(colors.warning.opacity(theme.isDark ? 0.15 : 0.10))
                    .overlay(Capsule().strokeBorder(colors.warning.opacity(0.35)))
            )
        }
        .padding(.top, 8)
    }

    // MARK: Search

    private var searchField: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(colors.textMuted)
            TextField("Search English or Zomi...", text: $model.query)
                .font(.system(size: 16))
                .foregroundStyle(colors.text)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .submitLabel(.search)
            if !model.query.isEmpty {
                Button {
                    model.query = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(colors.textMuted)
                }
                .accessibilityLabel("Clear search")
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(colors.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(colors.glassBorder)
                )
        )
    }

    private var directionToggle: some View {
        HStack(spacing: 10) {
            directionChip(title: "English → Zomi", active: model.englishToZomi) {
                model.englishToZomi = true
                if model.needsAI { model.query = model.query }
            }
            directionChip(title: "Zomi → English", active: !model.englishToZomi) {
                model.englishToZomi = false
                if model.needsAI { model.query = model.query }
            }
        }
    }

    private func directionChip(title: String, active: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(active ? colors.primary : colors.textSecondary)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(
                    Capsule()
                        .fill(active ? colors.glassCyan : colors.surface)
                        .overlay(
                            Capsule()
                                .strokeBorder(active ? colors.glassCyanBorder : colors.glassBorder)
                        )
                )
        }
        .buttonStyle(.plain)
    }

    // MARK: Offline A–Z browse index

    private var letterIndex: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(model.browseLetters, id: \.self) { letter in
                    Button {
                        model.selectLetter(letter)
                    } label: {
                        Text(letter)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(
                                model.selectedLetter == letter ? colors.primary : colors.textSecondary
                            )
                            .frame(width: 36, height: 36)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(
                                        model.selectedLetter == letter
                                            ? colors.glassCyan
                                            : colors.surface
                                    )
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .strokeBorder(
                                                model.selectedLetter == letter
                                                    ? colors.glassCyanBorder
                                                    : colors.glassBorder
                                            )
                                    )
                            )
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Browse entries under \(letter)")
                }
            }
            .padding(.vertical, 4)
        }
    }

    // MARK: Entry rows

    private func entryRow(_ entry: DictionaryEntry) -> some View {
        Button {
            copy(entry.zomi)
        } label: {
            HStack(alignment: .center, spacing: 10) {
                VStack(alignment: .leading, spacing: 5) {
                    HStack(spacing: 8) {
                        Text(entry.english)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(colors.text)
                        posChip(entry)
                        verifiedBadge
                    }
                    Text(entry.zomi)
                        .font(.system(size: 15))
                        .foregroundStyle(colors.primaryLight)
                        .multilineTextAlignment(.leading)
                }
                Spacer(minLength: 8)
                Image(systemName: "doc.on.doc")
                    .font(.system(size: 14))
                    .foregroundStyle(colors.textMuted)
            }
            .padding(14)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(colors.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .strokeBorder(colors.glassBorder)
                    )
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(entry.english), \(entry.pos), \(entry.zomi). Verified. Tap to copy.")
    }

    private func posChip(_ entry: DictionaryEntry) -> some View {
        let color = categoryColor(entry.category)
        return Text(posLabel(entry))
            .font(.system(size: 10, weight: .bold))
            .textCase(.uppercase)
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(
                Capsule()
                    .fill(color.opacity(theme.isDark ? 0.15 : 0.10))
                    .overlay(Capsule().strokeBorder(color.opacity(0.35)))
            )
    }

    private var verifiedBadge: some View {
        HStack(spacing: 4) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 10))
            Text("Verified")
                .font(.system(size: 10, weight: .bold))
                .textCase(.uppercase)
        }
        .foregroundStyle(colors.success)
        .padding(.horizontal, 8)
        .padding(.vertical, 2)
        .background(
            Capsule()
                .fill(colors.glassGreen)
                .overlay(Capsule().strokeBorder(colors.glassGreenBorder))
        )
    }

    // MARK: AI fallback

    private var aiCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .foregroundStyle(colors.accent)
                Text("No verified entry for “\(model.trimmedQuery)”")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(colors.textSecondary)
            }

            if model.isAskingAI {
                HStack(spacing: 10) {
                    ProgressView()
                    Text("Asking Zomi AI...")
                        .font(.system(size: 14))
                        .foregroundStyle(colors.textSecondary)
                }
            } else if !model.aiConsentGiven {
                Text("This word isn't in the verified dictionary yet. Zomi AI can answer it — your search word would be sent securely to Google Gemini AI.")
                    .font(.system(size: 14))
                    .foregroundStyle(colors.textSecondary)
                Button {
                    showAIConsent = true
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 13))
                        Text("Ask Zomi AI")
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .foregroundStyle(colors.accent)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 9)
                    .background(
                        Capsule()
                            .fill(colors.glassYellow)
                            .overlay(Capsule().strokeBorder(colors.glassYellowBorder))
                    )
                }
                .buttonStyle(.plain)
            } else if let result = model.aiResult {
                Text(result)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(colors.text)
                HStack {
                    HStack(spacing: 4) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 10))
                        Text("Zomi AI")
                            .font(.system(size: 10, weight: .bold))
                            .textCase(.uppercase)
                    }
                    .foregroundStyle(colors.accent)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(
                        Capsule()
                            .fill(colors.glassYellow)
                            .overlay(Capsule().strokeBorder(colors.glassYellowBorder))
                    )
                    Spacer()
                    Button {
                        copy(result)
                    } label: {
                        Image(systemName: "doc.on.doc")
                            .font(.system(size: 14))
                            .foregroundStyle(colors.textSecondary)
                            .padding(8)
                            .background(Circle().fill(colors.glass))
                    }
                    .accessibilityLabel("Copy AI result")
                }
            } else if let error = model.aiError {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.circle")
                        .foregroundStyle(colors.error)
                    Text(error)
                        .font(.system(size: 13))
                        .foregroundStyle(colors.textSecondary)
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(colors.glassYellow.opacity(0.35))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .strokeBorder(colors.glassYellowBorder)
                )
        )
    }

    // MARK: Helpers

    private func copy(_ text: String) {
        UIPasteboard.general.string = text
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    private func posLabel(_ entry: DictionaryEntry) -> String {
        entry.pos.isEmpty ? entry.category : entry.pos
    }

    private func categoryColor(_ category: String) -> Color {
        let dark: UInt
        let light: UInt
        switch category {
        case "noun": dark = 0x63C0FF; light = 0x1E7FD6
        case "verb": dark = 0x00F0FF; light = 0x0088A8
        case "adjective": dark = 0xB98CFF; light = 0x7C4DFF
        case "adverb": dark = 0xFFB84D; light = 0xC77800
        case "preposition": dark = 0xFF8FA3; light = 0xD6336C
        case "pronoun": dark = 0x7EE8A2; light = 0x1F8A4C
        case "conjunction": dark = 0xFFD166; light = 0xB8860B
        case "interjection": dark = 0xFF7B72; light = 0xC9372C
        case "prefix": dark = 0x9CD1FF; light = 0x3E7CB1
        case "particle": dark = 0xC9B8FF; light = 0x6A5ACD
        case "article": dark = 0xA0D2DB; light = 0x4E8A96
        default: dark = 0x9BA3AF; light = 0x5A6270
        }
        return theme.isDark ? Color(hex: dark) : Color(hex: light)
    }
}
