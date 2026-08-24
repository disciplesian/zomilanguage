import SwiftUI

/// Translation History screen — clone of the Expo History tab with search,
/// favorites filter, and swipe-free card actions (local-first storage).
struct HistoryView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(TranslationStore.self) private var store

    @State private var searchQuery = ""
    @State private var showFilters = false
    @State private var filter: HistoryFilter = .all
    @State private var pendingDelete: SavedTranslation?

    private var colors: ThemeColors { theme.colors }

    enum HistoryFilter: String, CaseIterable, Identifiable {
        case all = "All"
        case favorites = "Favorites"
        case toEnglish = "Zomi → English"
        case toZomi = "English → Zomi"

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
        let query = searchQuery.trimmingCharacters(in: .whitespaces).lowercased()
        if !query.isEmpty {
            items = items.filter {
                $0.sourceText.lowercased().contains(query) || $0.translatedText.lowercased().contains(query)
            }
        }
        return items
    }

    var body: some View {
        ZStack {
            AppBackground(colors: colors, isDark: theme.isDark)

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    header
                    searchBar
                    if showFilters { filterChips }

                    if filteredHistory.isEmpty {
                        emptyState
                    } else {
                        ForEach(filteredHistory) { item in
                            historyCard(item)
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .navigationTitle("History")
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog(
            "Delete Translation",
            isPresented: Binding(
                get: { pendingDelete != nil },
                set: { if !$0 { pendingDelete = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                if let item = pendingDelete {
                    withAnimation { store.remove(id: item.id) }
                    Haptics.success()
                }
                pendingDelete = nil
            }
            Button("Cancel", role: .cancel) { pendingDelete = nil }
        } message: {
            Text("Are you sure you want to delete this translation?")
        }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Translation History")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(colors.text)
                Text("\(filteredHistory.count) \(filteredHistory.count == 1 ? "translation" : "translations")")
                    .font(.system(size: 14))
                    .foregroundStyle(colors.textSecondary)
            }
            Spacer()
            Button {
                Haptics.selection()
                withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                    showFilters.toggle()
                }
            } label: {
                Image(systemName: "line.3.horizontal.decrease")
                    .font(.system(size: 18))
                    .foregroundStyle(showFilters ? colors.accent : colors.textSecondary)
                    .frame(width: 44, height: 44)
                    .background(colors.glass)
                    .clipShape(.rect(cornerRadius: 12))
                    .overlay {
                        RoundedRectangle(cornerRadius: 12)
                            .strokeBorder(colors.glassBorder, lineWidth: 1)
                    }
            }
        }
        .padding(.top, 8)
    }

    private var searchBar: some View {
        GlassCard(variant: .cyan, padding: 12, colors: colors, isDark: theme.isDark) {
            HStack(spacing: 12) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 18))
                    .foregroundStyle(colors.textSecondary)
                TextField("Search translations...", text: $searchQuery)
                    .font(.system(size: 16))
                    .foregroundStyle(colors.text)
                if !searchQuery.isEmpty {
                    Button {
                        searchQuery = ""
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 16))
                            .foregroundStyle(colors.textSecondary)
                    }
                }
            }
        }
    }

    private var filterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(HistoryFilter.allCases) { option in
                    Button {
                        Haptics.selection()
                        filter = option
                    } label: {
                        Text(option.rawValue)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(filter == option ? colors.accent : colors.textSecondary)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(filter == option ? Color(hex: 0x00F0FF, alpha: 0.15) : colors.surface)
                            .clipShape(Capsule())
                            .overlay {
                                Capsule().strokeBorder(
                                    filter == option ? colors.accent : colors.glassBorder,
                                    lineWidth: 1
                                )
                            }
                    }
                }
            }
        }
        .contentMargins(.horizontal, 2)
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "clock.arrow.circlepath")
                .font(.system(size: 56))
                .foregroundStyle(colors.textSecondary)
            Text("No Translations Yet")
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(colors.text)
            Text(
                searchQuery.isEmpty && filter == .all
                    ? "Your translation history will appear here"
                    : "No translations match your search"
            )
            .font(.system(size: 16))
            .foregroundStyle(colors.textSecondary)
            .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 80)
    }

    private func historyCard(_ item: SavedTranslation) -> some View {
        GlassCard(variant: .purple, padding: 16, colors: colors, isDark: theme.isDark) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    HStack(spacing: 8) {
                        Image(systemName: "textformat")
                            .font(.system(size: 14))
                            .foregroundStyle(colors.accent)
                        Text("\(LanguageCatalog.label(item.sourceLanguage)) → \(LanguageCatalog.label(item.targetLanguage))")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(colors.textSecondary)
                    }
                    Spacer()
                    HStack(spacing: 8) {
                        Button {
                            Haptics.selection()
                            store.toggleFavorite(id: item.id)
                        } label: {
                            Image(systemName: item.isFavorite ? "star.fill" : "star")
                                .font(.system(size: 16))
                                .foregroundStyle(item.isFavorite ? colors.accent : colors.textSecondary)
                        }
                        Button {
                            pendingDelete = item
                        } label: {
                            Image(systemName: "trash")
                                .font(.system(size: 16))
                                .foregroundStyle(colors.error)
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("SOURCE")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(colors.textMuted)
                    Text(item.sourceText)
                        .font(.system(size: 15))
                        .foregroundStyle(colors.text)
                        .lineLimit(2)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("TRANSLATION")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(colors.textMuted)
                    Text(item.translatedText)
                        .font(.system(size: 15))
                        .foregroundStyle(colors.text)
                        .lineLimit(2)
                }

                Rectangle()
                    .fill(colors.glassBorder)
                    .frame(height: 1)

                HStack {
                    Text(item.createdAt.formatted(date: .abbreviated, time: .shortened))
                        .font(.system(size: 12))
                        .foregroundStyle(colors.textMuted)
                    Spacer()
                    Button {
                        UIPasteboard.general.string = item.translatedText
                        Haptics.success()
                    } label: {
                        HStack(spacing: 4) {
                            Text("Copy")
                                .font(.system(size: 13, weight: .semibold))
                            Image(systemName: "doc.on.doc")
                                .font(.system(size: 12))
                        }
                        .foregroundStyle(colors.accent)
                    }
                }
            }
        }
    }
}
