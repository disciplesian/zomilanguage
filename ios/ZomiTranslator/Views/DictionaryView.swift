import SwiftUI
import UIKit

/// Dictionary tab — instant search over the 33,444 English ⇄ Zomi
/// entries bundled with the app, with a Zomi AI fallback for words that are
/// not in the verified dataset.
struct DictionaryView: View {
    @Environment(ThemeManager.self) private var theme
    @State private var model = DictionaryViewModel()
    @State private var showAIConsent = false
    @State private var detailEntry: DictionaryEntry?

    private var colors: ThemeColors { theme.colors }

    /// Entries shown per letter in browse mode before the user expands the list.
    private let browsePreviewCount = 4

    var body: some View {
        ZStack {
            AppBackground(colors: colors, isDark: theme.isDark)

            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    header
                    searchField
                    if !model.trimmedQuery.isEmpty && !model.suggestions.isEmpty {
                        suggestionPanel
                    }
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
                        ForEach(model.browseExpanded ? model.browseEntries : Array(model.browseEntries.prefix(browsePreviewCount))) { entry in
                            entryRow(entry)
                        }
                        if model.browseEntries.count > browsePreviewCount {
                            browseToggle
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
                .padding(.bottom, 90)
            }
            .scrollDismissesKeyboard(.interactively)
        .refreshable {
            await model.refreshDictionary()
        }
        }
        .navigationTitle("Dictionary")
        .navigationBarTitleDisplayMode(.inline)
        .onDisappear { model.cancelAI() }
        .sheet(item: $detailEntry) { entry in
            EntryDetailSheet(entry: entry)
        }
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

    // MARK: Real-time suggestions

    private var suggestionPanel: some View {
        VStack(spacing: 0) {
            ForEach(model.suggestions) { suggestion in
                Button {
                    model.query = suggestion.text
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 13))
                            .foregroundStyle(colors.textMuted)
                        Text(suggestion.text)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(colors.text)
                            .lineLimit(1)
                        Spacer(minLength: 8)
                        Text(suggestion.hint)
                            .font(.system(size: 12))
                            .foregroundStyle(colors.primaryLight)
                            .lineLimit(1)
                        Image(systemName: "arrow.right")
                            .font(.system(size: 11))
                            .foregroundStyle(colors.textMuted)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Search for \(suggestion.text)")

                if suggestion.id != model.suggestions.last?.id {
                    Divider()
                        .overlay(colors.glassBorder)
                        .padding(.leading, 34)
                }
            }
        }
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

    /// Expands/collapses the browse list for the selected letter. The page
    /// opens with a clean 4-entry preview instead of hundreds of rows.
    private var browseToggle: some View {
        Button {
            Haptics.selection()
            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                model.browseExpanded.toggle()
            }
        } label: {
            Text(
                model.browseExpanded
                    ? "Show fewer entries"
                    : "Show all \(model.browseEntries.count.formatted()) entries"
            )
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(colors.primaryLight)
            .padding(.horizontal, 18)
            .padding(.vertical, 10)
            .background(colors.surface)
            .clipShape(Capsule())
            .overlay {
                Capsule().strokeBorder(colors.glassBorder, lineWidth: 1)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 2)
    }

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
            detailEntry = entry
        } label: {
            HStack(alignment: .center, spacing: 10) {
                VStack(alignment: .leading, spacing: 5) {
                    HStack(spacing: 8) {
                        highlightedText(
                            entry.english,
                            size: 16,
                            baseWeight: .bold,
                            baseColor: colors.text,
                            matchColor: colors.primary
                        )
                        posChip(entry)
                        verifiedBadge
                    }
                    highlightedText(
                        entry.zomi,
                        size: 15,
                        baseWeight: .regular,
                        baseColor: colors.primaryLight,
                        matchColor: colors.text
                    )
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
        .accessibilityLabel("\(entry.english), \(entry.pos), \(entry.zomi). Verified. Tap to view details.")
    }

    /// Renders text with every case-insensitive occurrence of the current
    /// search query bolded and accented, so the matching substring stands out
    /// inside the word.
    private func highlightedText(
        _ text: String,
        size: CGFloat,
        baseWeight: Font.Weight,
        baseColor: Color,
        matchColor: Color
    ) -> Text {
        func baseSegment(_ s: Substring) -> Text {
            Text(s).font(.system(size: size, weight: baseWeight)).foregroundStyle(baseColor)
        }
        func matchSegment(_ s: Substring) -> Text {
            Text(s).font(.system(size: size, weight: .heavy)).foregroundStyle(matchColor)
        }

        let query = model.trimmedQuery
        guard !query.isEmpty,
              let first = text.range(of: query, options: .caseInsensitive)
        else {
            return Text(text).font(.system(size: size, weight: baseWeight)).foregroundStyle(baseColor)
        }

        var combined: Text?
        var start = text.startIndex
        var range: Range<String.Index>? = first
        while let r = range {
            if r.lowerBound > start {
                let segment = baseSegment(text[start..<r.lowerBound])
                combined = combined.map { $0 + segment } ?? segment
            }
            let match = matchSegment(text[r])
            combined = combined.map { $0 + match } ?? match
            start = r.upperBound
            range = start < text.endIndex
                ? text.range(of: query, options: .caseInsensitive, range: start..<text.endIndex)
                : nil
        }
        if start < text.endIndex {
            let segment = baseSegment(text[start...])
            combined = combined.map { $0 + segment } ?? segment
        }
        return combined ?? Text(text).font(.system(size: size, weight: baseWeight)).foregroundStyle(baseColor)
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

// MARK: - Entry detail sheet

/** Category chip color for the detail sheet (dark/light variants). */
private func detailCategoryColor(_ category: String, isDark: Bool) -> Color {
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
    return isDark ? Color(hex: dark) : Color(hex: light)
}

/// Expanded entry detail: definition, grammatical category, AI example
/// sentences and related terms from the verified dataset. Example sentences
/// are gated behind the same explicit Google Gemini consent as the AI lookup
/// (App Store guideline 5.1).
private struct EntryDetailSheet: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss

    @State private var current: DictionaryEntry
    @State private var examples: [EntryExample] = []
    @State private var isLoadingExamples = false
    @State private var failedExamples = false
    @State private var showConsent = false
    @State private var consentGiven = UserDefaults.standard.bool(forKey: "dictionary_ai_consent_given")

    private var colors: ThemeColors { theme.colors }

    init(entry: DictionaryEntry) {
        _current = State(initialValue: entry)
    }

    private var related: [DictionaryEntry] {
        DictionaryData.relatedEntries(current)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    chipsRow
                        .padding(.bottom, 4)

                    sectionLabel("Definition")
                    HStack(alignment: .firstTextBaseline, spacing: 12) {
                        Text(current.zomi)
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundStyle(colors.primaryLight)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Button {
                            copy(current.zomi)
                        } label: {
                            Image(systemName: "doc.on.doc")
                                .font(.system(size: 14))
                                .foregroundStyle(colors.textSecondary)
                                .padding(8)
                                .background(Circle().fill(colors.glass))
                        }
                        .accessibilityLabel("Copy definition")
                    }

                    sectionLabel("Grammatical category")
                    Text(current.category.capitalized)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(colors.text)
                    Text(DictionaryData.categoryDescriptions[current.category]
                        ?? "A word that does not fit the standard grammatical categories.")
                        .font(.system(size: 13))
                        .foregroundStyle(colors.textSecondary)
                        .padding(.top, 2)

                    sectionLabel("Example sentences")
                    examplesSection

                    if !related.isEmpty {
                        sectionLabel("Related terms")
                        VStack(alignment: .leading, spacing: 0) {
                            ForEach(related) { relatedEntry in
                                Button {
                                    current = relatedEntry
                                } label: {
                                    HStack(spacing: 10) {
                                        Text(relatedEntry.english)
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(colors.text)
                                        Image(systemName: "arrow.right")
                                            .font(.system(size: 11))
                                            .foregroundStyle(colors.textMuted)
                                        Text(relatedEntry.zomi)
                                            .font(.system(size: 14))
                                            .foregroundStyle(colors.primaryLight)
                                            .lineLimit(1)
                                            .frame(maxWidth: .infinity, alignment: .leading)
                                    }
                                    .padding(.vertical, 8)
                                    .contentShape(Rectangle())
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("Open details for \(relatedEntry.english)")
                            }
                        }
                    }
                }
                .padding(20)
            }
            .background(AppBackground(colors: colors, isDark: theme.isDark))
            .navigationTitle(current.english)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .task(id: current) {
                examples = []
                failedExamples = false
                if consentGiven {
                    await loadExamples()
                }
            }
            .alert("Zomi AI Example Consent", isPresented: $showConsent) {
                Button("Don't Allow", role: .cancel) {}
                Button("Allow") {
                    UserDefaults.standard.set(true, forKey: "dictionary_ai_consent_given")
                    consentGiven = true
                    Task { await loadExamples() }
                }
            } message: {
                Text("Example sentences are generated by Google Gemini AI. When you use this, the dictionary entry is sent securely to Google for processing. By continuing, you consent to this processing.")
            }
        }
    }

    // MARK: Sections

    private var chipsRow: some View {
        HStack(spacing: 8) {
            let color = detailCategoryColor(current.category, isDark: theme.isDark)
            Text(current.pos.isEmpty ? current.category : current.pos)
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
            Spacer()
        }
    }

    @ViewBuilder
    private var examplesSection: some View {
        if !consentGiven {
            VStack(alignment: .leading, spacing: 10) {
                Text("Zomi AI can write example sentences for this entry — the entry would be sent securely to Google Gemini AI.")
                    .font(.system(size: 14))
                    .foregroundStyle(colors.textSecondary)
                Button {
                    showConsent = true
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 13))
                        Text("Generate examples")
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
            }
        } else if isLoadingExamples {
            HStack(spacing: 10) {
                ProgressView()
                Text("Asking Zomi AI...")
                    .font(.system(size: 14))
                    .foregroundStyle(colors.textSecondary)
            }
        } else if failedExamples {
            Text("Examples need an internet connection — the dictionary itself works offline.")
                .font(.system(size: 14))
                .foregroundStyle(colors.textSecondary)
        } else {
            VStack(alignment: .leading, spacing: 10) {
                ForEach(Array(examples.enumerated()), id: \.offset) { _, example in
                    Button {
                        copy(example.zomi)
                    } label: {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(example.english)
                                .font(.system(size: 14))
                                .foregroundStyle(colors.text)
                                .multilineTextAlignment(.leading)
                            Text(example.zomi)
                                .font(.system(size: 14))
                                .foregroundStyle(colors.primaryLight)
                                .multilineTextAlignment(.leading)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(colors.glass)
                                .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(colors.glassBorder))
                        )
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Example: \(example.english). \(example.zomi). Tap to copy.")
                }
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
            }
        }
    }

    // MARK: Helpers

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 11, weight: .bold))
            .textCase(.uppercase)
            .tracking(1)
            .foregroundStyle(colors.textMuted)
            .padding(.top, 18)
            .padding(.bottom, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func loadExamples() async {
        isLoadingExamples = true
        failedExamples = false
        let result = await TranslationService.shared.fetchEntryExamples(
            english: current.english,
            zomi: current.zomi,
            pos: current.pos
        )
        isLoadingExamples = false
        if result.isEmpty {
            failedExamples = true
        } else {
            examples = result
        }
    }

    private func copy(_ text: String) {
        UIPasteboard.general.string = text
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }
}
