import SwiftUI

/// Searchable target-language picker sheet — mirrors the Expo/Android pickers.
/// Zomi and English are pinned under "Popular"; all other languages follow.
struct LanguagePickerSheet: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss

    let selectedCode: String
    let onSelect: (String) -> Void

    @State private var search = ""
    @FocusState private var searchFocused: Bool

    private var colors: ThemeColors { theme.colors }

    private var query: String { search.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }

    private var filtered: [LanguageOption] {
        guard !query.isEmpty else { return LanguageCatalog.all }
        return LanguageCatalog.all.filter {
            $0.label.lowercased().contains(query)
                || $0.native.lowercased().contains(query)
                || $0.code.contains(query)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                if query.isEmpty {
                    Section("Popular") {
                        ForEach(LanguageCatalog.primary) { option in
                            row(option)
                        }
                    }
                    Section("All languages") {
                        ForEach(LanguageCatalog.others) { option in
                            row(option)
                        }
                    }
                } else {
                    Section {
                        ForEach(filtered) { option in
                            row(option)
                        }
                        if filtered.isEmpty {
                            Text("No languages found.")
                                .foregroundStyle(colors.textMuted)
                        }
                    }
                }
            }
            .searchable(
                text: $search,
                placement: .navigationBarDrawer(displayMode: .always),
                prompt: "Search languages"
            )
            .autocorrectionDisabled()
            .navigationTitle("Translate into")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    @ViewBuilder
    private func row(_ option: LanguageOption) -> some View {
        let isSelected = option.code == selectedCode
        Button {
            onSelect(option.code)
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(option.label)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(isSelected ? colors.accent : colors.text)
                    Text(option.native)
                        .font(.system(size: 12))
                        .foregroundStyle(colors.textMuted)
                }
                Spacer()
                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(colors.accent)
                }
            }
        }
    }
}
