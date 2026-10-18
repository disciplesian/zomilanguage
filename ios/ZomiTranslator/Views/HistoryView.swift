import SwiftUI

/// Translation History: search, filters, swipe to delete, and Clear all.
/// Stored on this device (and synced when signed in).
struct HistoryView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(TranslationStore.self) private var store
    @Environment(AppRouter.self) private var router
    @Environment(\.horizontalSizeClass) private var sizeClass

    @State private var searchQuery = ""
    @State private var filter: HistoryFilter = .all
    @State private var showClearAll = false
    @State private var copiedId: String?

    private var colors: ThemeColors { theme.colors }

    enum HistoryFilter: String, CaseIterable, Identifiable {
        case all = "All"
        case favorites = "Favorites"
        case toEnglish = "Zomi \u{2192} English"
        case toZomi = "English \u{2192} Zomi"

        var id: String { rawValue }
    }

    private var filteredHistory: [SavedTranslation] {
        var items = store.entries
        switch filter {
        case .all: break
        case .favorites: items = items.filter { $0.isFavorite }
        case .toEnglish: items = items.filter { $0.targetLanguage == "english" }
        case .toZomi: items = items.filter { $0.targetLanguage == "zomi" }
        }
        let query = searchQuery.trimmingCharacters(in: .whitespaces)
        if !query.isEmpty {
            items = items.filter {
                $0.sourceText.localizedStandardContains(query) || $0.translatedText.localizedStandardContains(query)
            }
        }
        return items
    }

    var body: some View {
        ZStack {
            AppBackground(colors: colors, isDark: true)

            List {
                Group {
                    filterChips
                    if filteredHistory.isEmpty {
                        emptyState
                    } else {
                        ForEach(filteredHistory) { item in
                            historyCard(item)
                                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                    Button(role: .destructive) {
                                        withAnimation { store.remove(id: item.id) }
                                        Haptics.success()
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }
                                }
                                .swipeActions(edge: .leading) {
                                    Button {
                                        Haptics.selection()
                                        store.toggleFavorite(id: item.id)
                                    } label: {
                                        Label(item.isFavorite ? "Unfavorite" : "Favorite", systemImage: item.isFavorite ? "star.slash" : "star")
                                    }
                                    .tint(colors.accent.opacity(0.8))
                                }
                        }
                    }
                }
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(top: 6, leading: sizeClass == .regular ? 32 : 16, bottom: 6, trailing: sizeClass == .regular ? 32 : 16))
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .scrollDismissesKeyboard(.immediately)
            .searchable(text: $searchQuery, prompt: "Search history")
            .autocorrectionDisabled()
            .textInputAutocapitalization(.never)
        }
        .navigationTitle("History")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            if !store.entries.isEmpty {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Clear all", role: .destructive) { showClearAll = true }
                }
            }
        }
        .confirmationDialog("Clear all history?", isPresented: $showClearAll, titleVisibility: .visible) {
            Button("Clear all", role: .destructive) {
                Haptics.warning()
                withAnimation { store.clear() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This removes every saved translation on this device. It can't be undone.")
        }
    }

    private var filterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(HistoryFilter.allCases) { option in
                    let active = filter == option
                    Button {
                        Haptics.selection()
                        filter = option
                    } label: {
                        Text(option.rawValue)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(active ? colors.primary : colors.textSecondary)
                            .padding(.horizontal, 14)
                            .frame(minHeight: 36)
                            .background(active ? colors.glassCyan : colors.surface, in: Capsule())
                            .overlay { Capsule().strokeBorder(active ? colors.glassCyanBorder : colors.glassBorder, lineWidth: 1) }
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(active ? .isSelected : [])
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: store.entries.isEmpty ? "clock.arrow.circlepath" : "magnifyingglass")
                .scaledFont(size: 48)
                .foregroundStyle(colors.textMuted)
                .accessibilityHidden(true)
            Text(store.entries.isEmpty ? "No translations yet" : "Nothing found")
                .font(.title3.bold())
                .foregroundStyle(colors.text)
            Text(store.entries.isEmpty
                 ? "Your translations are saved here automatically."
                 : "Try a different word or filter.")
                .font(.body)
                .foregroundStyle(colors.textSecondary)
                .multilineTextAlignment(.center)
            if store.entries.isEmpty {
                Button {
                    router.open(.translate, focus: true)
                } label: {
                    Text("Start translating")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color(hex: 0x0B1020))
                        .padding(.horizontal, 20)
                        .frame(minHeight: 44)
                        .background(colors.primary, in: Capsule())
                }
                .buttonStyle(PressableButtonStyle())
                .padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
    }

    private func historyCard(_ item: SavedTranslation) -> some View {
        GlassCard(variant: .purple, padding: 16, colors: colors, isDark: true) {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("\(LanguageCatalog.label(item.sourceLanguage)) \u{2192} \(LanguageCatalog.label(item.targetLanguage))")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(colors.textSecondary)
                    if item.isFavorite {
                        Image(systemName: "star.fill")
                            .font(.caption)
                            .foregroundStyle(colors.accent)
                            .accessibilityLabel("Favorite")
                    }
                    Spacer()
                    Text(item.createdAt.formatted(date: .abbreviated, time: .shortened))
                        .font(.caption)
                        .foregroundStyle(colors.textMuted)
                }
                Text(item.sourceText)
                    .font(.body)
                    .foregroundStyle(colors.textSecondary)
                    .lineLimit(3)
                Text(item.translatedText)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(colors.text)
                    .lineLimit(4)
                    .textSelection(.enabled)
                HStack {
                    Spacer()
                    Button {
                        UIPasteboard.general.string = item.translatedText
                        Haptics.success()
                        copiedId = item.id
                        Task {
                            try? await Task.sleep(for: .seconds(1.5))
                            if copiedId == item.id { copiedId = nil }
                        }
                    } label: {
                        Label(copiedId == item.id ? "Copied" : "Copy", systemImage: copiedId == item.id ? "checkmark" : "doc.on.doc")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(copiedId == item.id ? colors.success : colors.primary)
                            .frame(minHeight: 36)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityHint("Swipe left to delete, right to favorite")
    }
}
