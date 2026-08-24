import SwiftUI

/// My Zomi Glossary — clone of the Expo glossary screen (add / edit / delete
/// custom terms that are sent to the AI for personalized accuracy).
struct GlossaryView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GlossaryStore.self) private var glossary

    @State private var term = ""
    @State private var meaning = ""
    @State private var editingId: String?
    @State private var editTerm = ""
    @State private var editMeaning = ""
    @State private var showClearConfirm = false
    @State private var alertMessage: String?

    private var colors: ThemeColors { theme.colors }

    var body: some View {
        ZStack {
            AppBackground(colors: colors, isDark: theme.isDark)

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    header
                    addCard
                    listHeader

                    if glossary.terms.isEmpty {
                        GlassCard(padding: 24, colors: colors, isDark: theme.isDark) {
                            Text("Your glossary is empty. Add Zomi terms above and they will be used to improve translation accuracy.")
                                .font(.system(size: 14))
                                .foregroundStyle(colors.textSecondary)
                                .multilineTextAlignment(.center)
                                .frame(maxWidth: .infinity)
                        }
                    } else {
                        ForEach(glossary.terms) { item in
                            termCard(item)
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 90)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .navigationTitle("My Glossary")
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("Clear glossary?", isPresented: $showClearConfirm, titleVisibility: .visible) {
            Button("Clear", role: .destructive) {
                withAnimation { glossary.clear() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will remove all your custom Zomi terms.")
        }
        .alert("Zomi Glossary", isPresented: Binding(
            get: { alertMessage != nil },
            set: { if !$0 { alertMessage = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(alertMessage ?? "")
        }
    }

    private var header: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "book")
                .font(.system(size: 26))
                .foregroundStyle(colors.accent)
            VStack(alignment: .leading, spacing: 4) {
                Text("My Zomi Glossary")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(colors.text)
                Text("Custom Zomi terms you add here are sent to the AI for personalised accuracy on every translation.")
                    .font(.system(size: 13))
                    .foregroundStyle(colors.textSecondary)
            }
        }
        .padding(.top, 8)
    }

    private var addCard: some View {
        GlassCard(variant: .cyan, padding: 16, colors: colors, isDark: theme.isDark) {
            VStack(alignment: .leading, spacing: 10) {
                Text("ADD A TERM")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(colors.textMuted)

                glossaryInput("Zomi word (e.g. Lungdam)", text: $term)
                glossaryInput("Meaning in English", text: $meaning, multiline: true)

                Button {
                    guard !term.trimmingCharacters(in: .whitespaces).isEmpty,
                          !meaning.trimmingCharacters(in: .whitespaces).isEmpty else {
                        alertMessage = "Please enter both a Zomi term and its meaning."
                        return
                    }
                    withAnimation { glossary.add(term: term, meaning: meaning) }
                    term = ""
                    meaning = ""
                    Haptics.success()
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "plus")
                        Text("Add term")
                    }
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background {
                        LinearGradient(
                            colors: [Color(hex: 0x00F0FF, alpha: 0.85), Color(hex: 0x8C5CFF, alpha: 0.85)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    }
                    .clipShape(.rect(cornerRadius: 12))
                }
                .buttonStyle(PressableButtonStyle())
            }
        }
    }

    private var listHeader: some View {
        HStack {
            Text("\(glossary.terms.count) \(glossary.terms.count == 1 ? "term" : "terms")")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(colors.textSecondary)
            Spacer()
            if !glossary.terms.isEmpty {
                Button("Clear all") {
                    showClearConfirm = true
                }
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(colors.error)
            }
        }
    }

    private func termCard(_ item: GlossaryTerm) -> some View {
        GlassCard(variant: .purple, padding: 14, colors: colors, isDark: theme.isDark) {
            if editingId == item.id {
                VStack(alignment: .leading, spacing: 10) {
                    glossaryInput("Zomi word", text: $editTerm)
                    glossaryInput("Meaning", text: $editMeaning, multiline: true)
                    HStack {
                        Spacer()
                        Button {
                            guard !editTerm.trimmingCharacters(in: .whitespaces).isEmpty,
                                  !editMeaning.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                            glossary.update(id: item.id, term: editTerm, meaning: editMeaning)
                            editingId = nil
                            Haptics.selection()
                        } label: {
                            Image(systemName: "checkmark")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(colors.success)
                                .frame(width: 36, height: 36)
                        }
                        Button {
                            editingId = nil
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 16))
                                .foregroundStyle(colors.textMuted)
                                .frame(width: 36, height: 36)
                        }
                    }
                }
            } else {
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.term)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(colors.text)
                        Text(item.meaning)
                            .font(.system(size: 13))
                            .foregroundStyle(colors.textSecondary)
                    }
                    Spacer()
                    Button {
                        editingId = item.id
                        editTerm = item.term
                        editMeaning = item.meaning
                    } label: {
                        Image(systemName: "pencil")
                            .font(.system(size: 15))
                            .foregroundStyle(colors.textSecondary)
                            .frame(width: 36, height: 36)
                    }
                    Button {
                        withAnimation { glossary.remove(id: item.id) }
                        Haptics.light()
                    } label: {
                        Image(systemName: "trash")
                            .font(.system(size: 15))
                            .foregroundStyle(colors.error)
                            .frame(width: 36, height: 36)
                    }
                }
            }
        }
    }

    private func glossaryInput(_ placeholder: String, text: Binding<String>, multiline: Bool = false) -> some View {
        TextField(placeholder, text: text, axis: multiline ? .vertical : .horizontal)
            .font(.system(size: 15))
            .foregroundStyle(colors.text)
            .lineLimit(multiline ? 2...5 : 1...1)
            .autocorrectionDisabled()
            .textInputAutocapitalization(.never)
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(colors.surface)
            .clipShape(.rect(cornerRadius: 12))
            .overlay {
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(colors.glassBorder, lineWidth: 1)
            }
    }
}
