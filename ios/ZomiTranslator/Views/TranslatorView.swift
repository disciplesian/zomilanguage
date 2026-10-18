import SwiftUI

/// Main Translate screen: Zomi ⇄ English with instant dictionary words,
/// streaming sentences, and a keyboard that never gets in the way.
/// Phones stack input over output; iPad and wide windows show them side by side.
struct TranslatorView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(TranslationStore.self) private var translationStore
    @Environment(AppRouter.self) private var router
    @Environment(NetworkMonitor.self) private var network
    @Environment(AuthManager.self) private var auth
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var viewModel = TranslatorViewModel()
    @FocusState private var inputFocused: Bool

    @State private var toast: String?
    @State private var swapTurns = 0.0
    @State private var shareItems: ShareItems?
    @State private var showAIConsent = false

    private var colors: ThemeColors { theme.colors }
    private var isWide: Bool { sizeClass == .regular }
    private var guestCharLimit: Int? { auth.isSignedIn ? nil : 500 }

    var body: some View {
        ZStack {
            AppBackground(colors: colors, isDark: true)
                .onTapGesture { inputFocused = false }

            ScrollView {
                VStack(spacing: 14) {
                    header
                    if !network.isOnline { offlineNote }
                    languageSelector
                    if isWide {
                        HStack(alignment: .top, spacing: 16) {
                            inputCard
                            outputCard
                        }
                    } else {
                        inputCard
                        outputCard
                    }
                    if let left = viewModel.freeWordsLeft, left > 0, !auth.isSignedIn {
                        freeWordsNote(left)
                    }
                }
                .padding(.horizontal, isWide ? 32 : 16)
                .padding(.bottom, 32)
                .frame(maxWidth: isWide ? 1100 : .infinity)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.immediately)

            if let toast {
                VStack {
                    Spacer()
                    Text(toast)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color(hex: 0x0B1020))
                        .padding(.horizontal, 18)
                        .padding(.vertical, 10)
                        .background(colors.success, in: Capsule())
                        .padding(.bottom, 24)
                        .accessibilityAddTraits(.isStaticText)
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .allowsHitTesting(false)
            }
        }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button(L("Done")) {
                    inputFocused = false
                    viewModel.translateNow()
                }
                .fontWeight(.semibold)
            }
        }
        .onAppear {
            viewModel.translationStore = translationStore
            if !viewModel.aiConsentGiven { showAIConsent = true }
        }
        .onDisappear { inputFocused = false }
        .onChange(of: router.focusRequest) { _, _ in
            if router.selectedTab == .translate { inputFocused = true }
        }
        .sheet(item: $shareItems) { item in
            ShareSheet(items: item.items)
        }
        .alert("AI translation notice", isPresented: $showAIConsent) {
            Button("Agree & Continue") { viewModel.grantAIConsent() }
            Button("Not now", role: .cancel) {}
        } message: {
            Text("Dictionary words are translated on your device. Sentences are sent securely to the Zomi AI translation service, which uses Google Gemini and the Rork AI gateway as a backup. Your text is not used to identify you. By continuing, you agree to this processing.")
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack(spacing: 12) {
            Image(systemName: "character.bubble.fill")
                .font(.title2)
                .foregroundStyle(
                    LinearGradient(colors: [Color(hex: 0x00F0FF), Color(hex: 0x8C5CFF)], startPoint: .topLeading, endPoint: .bottomTrailing)
                )
                .frame(width: 48, height: 48)
                .background(Color.white.opacity(0.08), in: .rect(cornerRadius: 14))
                .overlay { RoundedRectangle(cornerRadius: 14).strokeBorder(colors.glassBorder, lineWidth: 1) }
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 1) {
                Text("ZOMI TRANSLATOR")
                    .font(.headline.weight(.heavy))
                    .tracking(0.6)
                    .foregroundStyle(Color(hex: 0x00D9FF))
                Text("Zomi \u{21C4} English")
                    .font(.subheadline)
                    .foregroundStyle(colors.textSecondary)
            }
            .accessibilityElement(children: .combine)
            Spacer()
        }
        .padding(.top, 8)
    }

    private var offlineNote: some View {
        HStack(spacing: 10) {
            Image(systemName: "wifi.slash")
                .accessibilityHidden(true)
            Text(L("Offline: dictionary words still work."))
                .font(.subheadline.weight(.medium))
            Spacer(minLength: 0)
        }
        .foregroundStyle(colors.warning)
        .padding(12)
        .background(colors.warning.opacity(0.12), in: .rect(cornerRadius: 12))
        .overlay { RoundedRectangle(cornerRadius: 12).strokeBorder(colors.warning.opacity(0.35), lineWidth: 1) }
    }

    private func freeWordsNote(_ left: Int) -> some View {
        Text("Free today: \(left) words left")
            .font(.footnote.weight(.medium))
            .foregroundStyle(colors.textMuted)
            .frame(maxWidth: .infinity, alignment: .center)
    }

    // MARK: - Language selector

    private var languageSelector: some View {
        GlassCard(variant: .cyan, glow: true, padding: 8, colors: colors, isDark: true) {
            HStack(spacing: 8) {
                languagePill(viewModel.sourceLabel, highlighted: false)

                Button {
                    Haptics.medium()
                    inputFocused = false
                    if reduceMotion {
                        viewModel.swapLanguages()
                    } else {
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                            swapTurns += 180
                            viewModel.swapLanguages()
                        }
                    }
                } label: {
                    Image(systemName: "arrow.left.arrow.right")
                        .font(.body.weight(.bold))
                        .foregroundStyle(.white)
                        .rotationEffect(.degrees(swapTurns))
                        .frame(width: 48, height: 48)
                        .background(
                            LinearGradient(colors: [Color(hex: 0x00F0FF, alpha: 0.85), Color(hex: 0x8C5CFF, alpha: 0.85)], startPoint: .topLeading, endPoint: .bottomTrailing),
                            in: Circle()
                        )
                }
                .buttonStyle(PressableButtonStyle())
                .accessibilityLabel(L("Swap languages"))
                .accessibilityHint("Now translating \(viewModel.sourceLabel) to \(viewModel.targetLabel)")

                languagePill(viewModel.targetLabel, highlighted: true)
            }
        }
    }

    private func languagePill(_ title: String, highlighted: Bool) -> some View {
        Text(title)
            .font(.headline)
            .foregroundStyle(highlighted ? Color(hex: 0x00F0FF) : colors.text)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .frame(maxWidth: .infinity, minHeight: 48)
            .background(Color(hex: 0x00F0FF, alpha: highlighted ? 0.22 : 0.10), in: .rect(cornerRadius: 12))
            .contentTransition(.opacity)
    }

    // MARK: - Input card

    private var inputCard: some View {
        GlassCard(variant: .purple, colors: colors, isDark: true) {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text(viewModel.sourceLabel)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(colors.text)
                    Spacer()
                    iconButton("doc.on.clipboard", label: "Paste") { pasteFromClipboard() }
                    if !viewModel.inputText.isEmpty {
                        iconButton("xmark.circle.fill", label: "Clear text") {
                            Haptics.light()
                            viewModel.clear()
                        }
                        .transition(.scale.combined(with: .opacity))
                    }
                }

                TextField(
                    L("Type or paste text"),
                    text: Binding(
                        get: { viewModel.inputText },
                        set: { newValue in
                            if let limit = guestCharLimit, newValue.count > limit {
                                viewModel.inputText = String(newValue.prefix(limit))
                            } else {
                                viewModel.inputText = newValue
                            }
                        }
                    ),
                    axis: .vertical
                )
                .font(.title3)
                .foregroundStyle(colors.text)
                .lineLimit(isWide ? 8...16 : 3...10)
                .focused($inputFocused)
                .autocorrectionDisabled(true)
                .textInputAutocapitalization(.never)
                .keyboardType(.default)
                .submitLabel(.done)
                .accessibilityLabel("Text to translate from \(viewModel.sourceLabel)")

                HStack {
                    if let limit = guestCharLimit {
                        Text("\(viewModel.inputText.count)/\(limit)")
                    } else {
                        Text("\(viewModel.inputText.count)")
                    }
                    Spacer()
                    Text("\(viewModel.wordCount) \(viewModel.wordCount == 1 ? "word" : "words")")
                }
                .font(.caption)
                .foregroundStyle(colors.textMuted)
                .monospacedDigit()
            }
        }
        .animation(reduceMotion ? nil : .snappy(duration: 0.2), value: viewModel.inputText.isEmpty)
    }

    // MARK: - Output card

    private var outputCard: some View {
        GlassCard(variant: .green, glow: true, colors: colors, isDark: true) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 8) {
                    Text(viewModel.targetLabel)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(colors.text)
                    if viewModel.isVerifiedWord && !viewModel.outputText.isEmpty {
                        badge("Dictionary", systemImage: "checkmark.seal.fill")
                    }
                    Spacer()
                    if hasResult {
                        Menu {
                            Button("Share as image", systemImage: "photo") { shareAsImage() }
                            Button("Share as text", systemImage: "text.alignleft") { shareAsText() }
                        } label: {
                            Image(systemName: "square.and.arrow.up")
                                .font(.body)
                                .foregroundStyle(colors.textSecondary)
                                .frame(width: 44, height: 44)
                        }
                        .accessibilityLabel(L("Share"))
                        iconButton("doc.on.doc", label: "Copy") { copyOutput() }
                    }
                }

                outputContent

                if !viewModel.alternatives.isEmpty && !viewModel.isStreaming && viewModel.errorText == nil {
                    alternativesSection
                }
            }
        }
    }

    private var hasResult: Bool {
        !viewModel.outputText.isEmpty && viewModel.errorText == nil && !viewModel.isStreaming
    }

    @ViewBuilder
    private var outputContent: some View {
        if viewModel.isTranslating && viewModel.outputText.isEmpty {
            HStack(spacing: 10) {
                TypingDotsIndicator(color: colors.accent, dotSize: 8)
                Text(viewModel.isConnecting ? "Connecting\u{2026}" : "Translating\u{2026}")
                    .font(.subheadline)
                    .foregroundStyle(colors.textSecondary)
            }
            .frame(maxWidth: .infinity, minHeight: 70)
        } else if let error = viewModel.errorText {
            VStack(spacing: 12) {
                Image(systemName: viewModel.isLimitNotice ? "sparkles" : "exclamationmark.circle")
                    .font(.title3)
                    .foregroundStyle(viewModel.isLimitNotice ? colors.primary : colors.warning)
                    .accessibilityHidden(true)
                Text(error)
                    .font(.subheadline)
                    .foregroundStyle(colors.textSecondary)
                    .multilineTextAlignment(.center)
                HStack(spacing: 10) {
                    if viewModel.isLimitNotice {
                        pillButton("Sign in", filled: true) { router.open(.settings) }
                    } else if !viewModel.aiConsentGiven {
                        pillButton("Review notice", filled: true) { showAIConsent = true }
                    } else {
                        pillButton("Try again", filled: false) { viewModel.retry() }
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
        } else {
            Group {
                if viewModel.outputText.isEmpty {
                    Text(L("Translation appears here"))
                        .foregroundStyle(colors.textMuted)
                } else {
                    Text(viewModel.outputText)
                        .foregroundStyle(colors.text)
                        .textSelection(.enabled)
                }
            }
            .font(.title3)
            .frame(maxWidth: .infinity, minHeight: 70, alignment: .topLeading)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: viewModel.outputText)
            .accessibilityLabel(viewModel.outputText.isEmpty ? "No translation yet" : "Translation: \(viewModel.outputText)")
        }
    }

    private var alternativesSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Also")
                .font(.caption.weight(.bold))
                .textCase(.uppercase)
                .tracking(0.5)
                .foregroundStyle(colors.textMuted)
            FlowRow(spacing: 8) {
                ForEach(viewModel.alternatives, id: \.self) { alternative in
                    Button {
                        Haptics.light()
                        viewModel.promoteAlternative(alternative)
                    } label: {
                        Text(alternative)
                            .font(.subheadline)
                            .foregroundStyle(colors.text)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .frame(minHeight: 36)
                            .background(colors.surface, in: Capsule())
                            .overlay { Capsule().strokeBorder(colors.glassBorder, lineWidth: 1) }
                    }
                    .buttonStyle(.plain)
                    .accessibilityHint("Use this translation")
                }
            }
        }
    }

    // MARK: - Small components

    private func badge(_ title: String, systemImage: String) -> some View {
        Label(title, systemImage: systemImage)
            .font(.caption2.weight(.bold))
            .foregroundStyle(Color(red: 0.45, green: 0.8, blue: 1.0))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(Color(red: 0.11, green: 0.6, blue: 0.94).opacity(0.18), in: Capsule())
    }

    private func iconButton(_ systemImage: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.body)
                .foregroundStyle(colors.textSecondary)
                .frame(width: 44, height: 44)
        }
        .buttonStyle(PressableButtonStyle())
        .accessibilityLabel(L(label))
    }

    private func pillButton(_ title: String, filled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(L(title))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(filled ? Color(hex: 0x0B1020) : colors.text)
                .padding(.horizontal, 20)
                .frame(minHeight: 44)
                .background(filled ? AnyShapeStyle(colors.primary) : AnyShapeStyle(colors.surface), in: Capsule())
        }
        .buttonStyle(PressableButtonStyle())
    }

    // MARK: - Actions

    private func showToast(_ message: String) {
        withAnimation(reduceMotion ? nil : .spring(response: 0.3, dampingFraction: 0.8)) { toast = L(message) }
        Task {
            try? await Task.sleep(for: .seconds(1.6))
            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.25)) { toast = nil }
        }
    }

    private func copyOutput() {
        guard hasResult else { return }
        UIPasteboard.general.string = viewModel.outputText
        Haptics.success()
        showToast("Copied")
    }

    private func pasteFromClipboard() {
        guard let text = UIPasteboard.general.string, !text.isEmpty else { return }
        viewModel.inputText = guestCharLimit.map { String(text.prefix($0)) } ?? text
        Haptics.success()
    }

    private func shareAsText() {
        guard hasResult else { return }
        let message = "\(viewModel.sourceLabel): \(viewModel.inputText)\n\n\(viewModel.targetLabel): \(viewModel.outputText)\n\nTranslated with Zomi Translator"
        shareItems = ShareItems(items: [message])
    }

    private func shareAsImage() {
        guard hasResult else { return }
        let card = TranslationShareCard(
            sourceLabel: viewModel.sourceLabel,
            targetLabel: viewModel.targetLabel,
            sourceText: viewModel.inputText.trimmingCharacters(in: .whitespacesAndNewlines),
            translatedText: viewModel.outputText
        )
        let renderer = ImageRenderer(content: card)
        renderer.scale = 3
        if let image = renderer.uiImage {
            shareItems = ShareItems(items: [image])
        } else {
            shareAsText()
        }
    }
}

/// Identifiable wrapper so a sheet can present share items.
struct ShareItems: Identifiable {
    let id = UUID()
    let items: [Any]
}

/// Branded image card for sharing a translation.
struct TranslationShareCard: View {
    let sourceLabel: String
    let targetLabel: String
    let sourceText: String
    let translatedText: String

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(spacing: 8) {
                Image(systemName: "character.bubble.fill")
                    .foregroundStyle(Color(hex: 0x00F0FF))
                Text("ZOMI TRANSLATOR")
                    .scaledFont(size: 15, weight: .heavy)
                    .tracking(1)
                    .foregroundStyle(Color(hex: 0x00D9FF))
            }
            VStack(alignment: .leading, spacing: 6) {
                Text(sourceLabel.uppercased())
                    .scaledFont(size: 12, weight: .bold)
                    .foregroundStyle(.white.opacity(0.6))
                Text(sourceText)
                    .scaledFont(size: 20)
                    .foregroundStyle(.white.opacity(0.85))
            }
            Rectangle().fill(.white.opacity(0.15)).frame(height: 1)
            VStack(alignment: .leading, spacing: 6) {
                Text(targetLabel.uppercased())
                    .scaledFont(size: 12, weight: .bold)
                    .foregroundStyle(Color(hex: 0x00FF88))
                Text(translatedText)
                    .scaledFont(size: 26, weight: .semibold)
                    .foregroundStyle(.white)
            }
            Text("zomitranslator.com")
                .scaledFont(size: 12, weight: .medium)
                .foregroundStyle(.white.opacity(0.5))
        }
        .padding(28)
        .frame(width: 400, alignment: .leading)
        .background(
            LinearGradient(colors: [Color(hex: 0x2A2F45), Color(hex: 0x363D5A), Color(hex: 0x1E2236)], startPoint: .topLeading, endPoint: .bottomTrailing)
        )
    }
}

/// Wrapping row for chips (alternatives).
struct FlowRow: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0, widest: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(ProposedViewSize(width: maxWidth, height: nil))
            if x > 0 && x + size.width > maxWidth {
                y += rowHeight + spacing
                x = 0
                rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
            widest = max(widest, x - spacing)
        }
        return CGSize(width: min(widest, maxWidth), height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(ProposedViewSize(width: bounds.width, height: nil))
            if x > bounds.minX && x + size.width > bounds.maxX {
                y += rowHeight + spacing
                x = bounds.minX
                rowHeight = 0
            }
            view.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(width: min(size.width, bounds.width), height: size.height))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}

/// UIKit share sheet wrapper.
struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
