import PhotosUI
import SwiftUI

/// Tools & Utilities screen — clone of the Expo Tools tab (Daily Scripture,
/// primary tools, analysis tools with expandable sections, quick word count,
/// pro tips).
struct ToolsView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(SpeechService.self) private var speech

    @State private var activeSection: ToolSection?
    @State private var dailyScripture: Scripture = Scriptures.random()
    @State private var showZomiScripture = true

    // Text statistics
    @State private var statsInput = ""
    @State private var analysis: TextAnalysis?

    // Comparison
    @State private var comparisonText1 = ""
    @State private var comparisonText2 = ""
    @State private var comparisonResult: String?
    @State private var isComparing = false

    // Flashcards
    @State private var flashcardInput = ""
    @State private var flashcards: [Flashcard] = []
    @State private var isGeneratingFlashcards = false

    // Document / image translation
    @State private var documentText = ""
    @State private var documentName: String?
    @State private var documentTranslation: String?
    @State private var isTranslatingDocument = false
    @State private var docToZomi = true
    @State private var docPickerItem: PhotosPickerItem?
    @State private var isExtractingDoc = false

    @State private var alertMessage: String?
    @State private var showToolsAIConsent = false

    private var colors: ThemeColors { theme.colors }

    private var toolsAIConsentGiven: Bool {
        UserDefaults.standard.bool(forKey: "rork_ai_tools_consent_given")
    }

    enum ToolAIAction: String, Identifiable {
        case compare, flashcards, document
        var id: String { rawValue }
    }

    @State private var pendingToolAIAction: ToolAIAction?

    enum ToolSection {
        case document, stats, compare, flashcards, quickCount
    }

    var body: some View {
        ZStack {
            AppBackground(colors: colors, isDark: theme.isDark)

            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    header
                    scriptureCard

                    sectionTitle("Primary Tools")
                    toolCard(
                        title: "Document Translation",
                        description: "Translate documents, images & files",
                        systemImage: "doc.text",
                        tint: colors.tertiary
                    ) { toggleSection(.document) }
                    if activeSection == .document { documentSection }

                    NavigationLink {
                        TranslationTipsView()
                    } label: {
                        toolCardLabel(
                            title: "Translation Tips & Guide",
                            description: "Learn how to get the best translations",
                            systemImage: "lightbulb",
                            tint: colors.accent
                        )
                    }
                    .buttonStyle(PressableButtonStyle())

                    NavigationLink {
                        PronunciationGuideView()
                    } label: {
                        toolCardLabel(
                            title: "Pronunciation Guide",
                            description: "Learn Zomi pronunciation with audio",
                            systemImage: "mic",
                            tint: colors.primary
                        )
                    }
                    .buttonStyle(PressableButtonStyle())

                    sectionTitle("Analysis & Study")
                    toolCard(
                        title: "Text Statistics",
                        description: "Analyze word count, frequency & more",
                        systemImage: "chart.bar",
                        tint: colors.success
                    ) { toggleSection(.stats) }
                    if activeSection == .stats { statsSection }

                    toolCard(
                        title: "Translation Comparison",
                        description: "Compare two translations side-by-side",
                        systemImage: "arrow.left.arrow.right",
                        tint: colors.accent
                    ) { toggleSection(.compare) }
                    if activeSection == .compare { compareSection }

                    toolCard(
                        title: "Flashcard Generator",
                        description: "Create study flashcards from words",
                        systemImage: "rectangle.on.rectangle",
                        tint: colors.secondary
                    ) { toggleSection(.flashcards) }
                    if activeSection == .flashcards { flashcardsSection }

                    sectionTitle("Quick Access")
                    toolCard(
                        title: "Quick Word Count",
                        description: "Instant character & word count",
                        systemImage: "textformat",
                        tint: colors.textSecondary
                    ) { toggleSection(.quickCount) }
                    if activeSection == .quickCount { quickCountSection }

                    proTipsCard
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 90)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .navigationTitle("Tools")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Zomi Translator", isPresented: Binding(
            get: { alertMessage != nil },
            set: { if !$0 { alertMessage = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(alertMessage ?? "")
        }
        .alert("AI Tools Consent", isPresented: $showToolsAIConsent) {
            Button("Agree & Continue") {
                UserDefaults.standard.set(true, forKey: "rork_ai_tools_consent_given")
                executePendingToolAIAction()
            }
            Button("Cancel", role: .cancel) { pendingToolAIAction = nil }
        } message: {
            Text("Document translation, comparison, and flashcard generation are powered by the Rork AI toolkit. Text you enter in these tools is sent securely to Rork for processing. By continuing, you consent to this processing.")
        }
        .onChange(of: docPickerItem) { _, newItem in
            guard let newItem else { return }
            Task {
                isExtractingDoc = true
                defer { isExtractingDoc = false }
                if let data = try? await newItem.loadTransferable(type: Data.self),
                   let image = UIImage(data: data) {
                    do {
                        let text = try await OCRService.extractText(from: image)
                        if text.isEmpty {
                            alertMessage = "No text found in the image."
                        } else {
                            documentText = text
                            documentName = "Image"
                            documentTranslation = nil
                            Haptics.success()
                        }
                    } catch {
                        alertMessage = "Failed to extract text from image."
                    }
                }
                docPickerItem = nil
            }
        }
    }

    private func toggleSection(_ section: ToolSection) {
        Haptics.light()
        withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
            activeSection = activeSection == section ? nil : section
        }
    }

    // MARK: - Header + scripture

    private var header: some View {
        HStack(spacing: 14) {
            HeaderIconTile(
                systemImage: "wrench.and.screwdriver",
                gradient: [Color(hex: 0x8C5CFF, alpha: 0.5), Color(hex: 0x00F0FF, alpha: 0.5)],
                borderColor: colors.glassBorder
            )
            VStack(alignment: .leading, spacing: 2) {
                Text("Tools & Utilities")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundStyle(colors.text)
                Text("Powerful translation tools")
                    .font(.system(size: 14))
                    .foregroundStyle(colors.textSecondary)
            }
            Spacer()
        }
        .padding(.top, 8)
    }

    private var scriptureCard: some View {
        GlassCard(variant: .yellow, colors: colors, isDark: theme.isDark) {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("Daily Scripture")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(colors.textSecondary)
                    Spacer()
                    Button {
                        Haptics.selection()
                        speech.stop()
                        withAnimation { dailyScripture = Scriptures.random() }
                    } label: {
                        Text("Refresh")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(colors.accent)
                    }
                }

                Button {
                    Haptics.light()
                    withAnimation { showZomiScripture.toggle() }
                } label: {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("\u{201C}\(showZomiScripture ? dailyScripture.verseZomi : dailyScripture.verseEnglish)\u{201D}")
                            .font(.system(size: 15))
                            .italic()
                            .foregroundStyle(colors.text)
                            .multilineTextAlignment(.leading)
                        Text("— \(dailyScripture.reference)")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(colors.primary)
                        Text("Tap to see in \(showZomiScripture ? "English" : "Zomi")")
                            .font(.system(size: 11))
                            .foregroundStyle(colors.textMuted)
                    }
                }
            }
        }
    }

    // MARK: - Tool cards

    private func toolCardLabel(title: String, description: String, systemImage: String, tint: Color) -> some View {
        HStack(spacing: 14) {
            Color.white.opacity(0.1)
                .frame(width: 44, height: 44)
                .overlay {
                    Image(systemName: systemImage)
                        .font(.system(size: 20))
                        .foregroundStyle(colors.text)
                        .allowsHitTesting(false)
                }
                .clipShape(.rect(cornerRadius: 12))

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(colors.text)
                Text(description)
                    .font(.system(size: 12))
                    .foregroundStyle(colors.textSecondary)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(colors.textMuted)
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            LinearGradient(
                colors: [tint.opacity(0.25), Color.white.opacity(0.05)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
        .clipShape(.rect(cornerRadius: 14))
    }

    private func toolCard(title: String, description: String, systemImage: String, tint: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            toolCardLabel(title: title, description: description, systemImage: systemImage, tint: tint)
        }
        .buttonStyle(PressableButtonStyle())
    }

    private func sectionTitle(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 18, weight: .semibold))
            .foregroundStyle(colors.text)
            .padding(.top, 8)
    }

    // MARK: - Document translation

    private var documentSection: some View {
        GlassCard(variant: .purple, colors: colors, isDark: theme.isDark) {
            VStack(alignment: .leading, spacing: 14) {
                Text("Document Translation")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(colors.text)
                Text("Upload an image or paste text to extract and translate")
                    .font(.system(size: 13))
                    .foregroundStyle(colors.textSecondary)

                if documentText.isEmpty {
                    PhotosPicker(selection: $docPickerItem, matching: .images) {
                        HStack(spacing: 10) {
                            if isExtractingDoc {
                                ProgressView().tint(.white)
                                Text("Processing...")
                            } else {
                                Image(systemName: "square.and.arrow.up")
                                Text("Upload Image")
                            }
                        }
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background {
                            LinearGradient(colors: [colors.primary, colors.secondary], startPoint: .leading, endPoint: .trailing)
                        }
                        .clipShape(.rect(cornerRadius: 12))
                    }

                    TextField("Or paste document text here...", text: $documentText, axis: .vertical)
                        .font(.system(size: 14))
                        .foregroundStyle(colors.text)
                        .lineLimit(3...8)
                        .padding(12)
                        .background(colors.surface)
                        .clipShape(.rect(cornerRadius: 12))
                        .overlay {
                            RoundedRectangle(cornerRadius: 12)
                                .strokeBorder(colors.glassBorder, lineWidth: 1)
                        }

                    Text("Supported: Photos of documents, pasted text")
                        .font(.system(size: 11))
                        .foregroundStyle(colors.textMuted)
                        .frame(maxWidth: .infinity)
                } else {
                    HStack {
                        Image(systemName: "doc.text")
                            .foregroundStyle(colors.primary)
                        Text(documentName ?? "Pasted text")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(colors.text)
                            .lineLimit(1)
                        Spacer()
                        Button("Clear") {
                            documentText = ""
                            documentName = nil
                            documentTranslation = nil
                        }
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(colors.textSecondary)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.white.opacity(0.1))
                        .clipShape(.rect(cornerRadius: 8))
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Extracted Text:")
                            .font(.system(size: 12))
                            .foregroundStyle(colors.textMuted)
                        ScrollView {
                            Text(documentText)
                                .font(.system(size: 13))
                                .foregroundStyle(colors.text)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .frame(maxHeight: 90)
                    }
                    .padding(12)
                    .background(colors.surface)
                    .clipShape(.rect(cornerRadius: 10))

                    HStack(spacing: 10) {
                        directionChip("English → Zomi", isActive: docToZomi) { docToZomi = true }
                        directionChip("Zomi → English", isActive: !docToZomi) { docToZomi = false }
                    }

                    Button {
                        withToolsAIConsent(action: .document) { Task { await translateDocument() } }
                    } label: {
                        HStack(spacing: 8) {
                            if isTranslatingDocument {
                                ProgressView().tint(.white)
                            } else {
                                Image(systemName: "globe")
                                Text("Translate Document")
                            }
                        }
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(theme.isDark ? Color(hex: 0x0F1626) : .white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background {
                            LinearGradient(colors: [colors.success, colors.successLight], startPoint: .leading, endPoint: .trailing)
                        }
                        .clipShape(.rect(cornerRadius: 10))
                    }
                    .disabled(isTranslatingDocument)

                    if let translation = documentTranslation {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("Translation:")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(colors.success)
                                Spacer()
                                Button {
                                    UIPasteboard.general.string = translation
                                    Haptics.success()
                                    alertMessage = "Translation copied to clipboard."
                                } label: {
                                    Image(systemName: "doc.on.doc")
                                        .font(.system(size: 14))
                                        .foregroundStyle(colors.primary)
                                }
                            }
                            ScrollView {
                                Text(translation)
                                    .font(.system(size: 14))
                                    .foregroundStyle(colors.text)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                            .frame(maxHeight: 120)
                        }
                        .padding(12)
                        .background(colors.surface)
                        .clipShape(.rect(cornerRadius: 10))
                    }
                }
            }
        }
    }

    private func directionChip(_ label: String, isActive: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(isActive ? colors.tertiary : colors.textSecondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(isActive ? colors.tertiary.opacity(0.15) : colors.surface)
                .clipShape(.rect(cornerRadius: 10))
                .overlay {
                    RoundedRectangle(cornerRadius: 10)
                        .strokeBorder(isActive ? colors.tertiary : .clear, lineWidth: 2)
                }
        }
    }

    private func translateDocument() async {
        guard !documentText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            alertMessage = "Please upload a document with text first."
            return
        }
        isTranslatingDocument = true
        defer { isTranslatingDocument = false }
        do {
            let source = docToZomi ? "English" : "Zomi (ISO 639-3: ctd)"
            let target = docToZomi ? "Zomi (ISO 639-3: ctd)" : "English"
            let prompt = """
            You are an expert Zomi (ISO 639-3: ctd) linguist and translator.

            Task: Translate the following text from \(source) to \(target).

            **ABSOLUTE DIALECT RULE:**
            - Use EXCLUSIVELY standard Zomi (ISO 639-3: ctd) vocabulary and grammar.
            - NEVER use words from Paite, Mizo (Lushai), Hakha Chin, Falam Chin, or any other Kuki-Chin variety.
            - Translate meaning, not words. Never omit or add content.
            - Preserve the original formatting, paragraphs, and structure as much as possible.
            - Return ONLY the translation, nothing else.

            Text to translate:
            \(documentText)
            """
            documentTranslation = try await ToolkitService.shared.generateText(prompt: prompt)
            Haptics.success()
        } catch {
            alertMessage = "Failed to translate document. Please try again."
        }
    }

    // MARK: - Text statistics

    private var statsSection: some View {
        GlassCard(variant: .green, colors: colors, isDark: theme.isDark) {
            VStack(alignment: .leading, spacing: 12) {
                Text("Text Statistics Analyzer")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(colors.text)

                expandedInput("Paste or type text to analyze...", text: $statsInput)

                gradientButton("Analyze", systemImage: "bolt.fill", gradient: [colors.success, colors.successLight]) {
                    guard let result = TextAnalysis.analyze(statsInput) else {
                        alertMessage = "Please enter some text to analyze."
                        return
                    }
                    Haptics.success()
                    withAnimation { analysis = result }
                }

                if let analysis {
                    let stats: [(String, String, String, Color)] = [
                        ("number", "\(analysis.characters)", "Characters", colors.accent),
                        ("textformat", "\(analysis.words)", "Words", colors.primary),
                        ("doc.text", "\(analysis.sentences)", "Sentences", colors.success),
                        ("clock", "\(analysis.readingTimeMinutes)m", "Read Time", colors.warning),
                    ]
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                        ForEach(stats, id: \.2) { stat in
                            VStack(spacing: 6) {
                                Image(systemName: stat.0)
                                    .font(.system(size: 16))
                                    .foregroundStyle(stat.3)
                                Text(stat.1)
                                    .font(.system(size: 22, weight: .bold))
                                    .foregroundStyle(colors.text)
                                Text(stat.2)
                                    .font(.system(size: 11))
                                    .foregroundStyle(colors.textMuted)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(14)
                            .background(colors.surface)
                            .clipShape(.rect(cornerRadius: 12))
                        }
                    }

                    if !analysis.topWords.isEmpty {
                        Text("Top Words")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(colors.text)
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 90))], spacing: 8) {
                            ForEach(analysis.topWords, id: \.word) { item in
                                HStack(spacing: 6) {
                                    Text(item.word)
                                        .font(.system(size: 13))
                                        .foregroundStyle(colors.text)
                                    Text("\(item.count)x")
                                        .font(.system(size: 11))
                                        .foregroundStyle(colors.textMuted)
                                }
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(colors.surface)
                                .clipShape(.rect(cornerRadius: 8))
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Comparison

    private var compareSection: some View {
        GlassCard(variant: .yellow, colors: colors, isDark: theme.isDark) {
            VStack(alignment: .leading, spacing: 10) {
                Text("Translation Comparison")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(colors.text)

                Text("Translation 1")
                    .font(.system(size: 13))
                    .foregroundStyle(colors.textSecondary)
                expandedInput("Enter first translation...", text: $comparisonText1, minLines: 2)

                Text("Translation 2")
                    .font(.system(size: 13))
                    .foregroundStyle(colors.textSecondary)
                expandedInput("Enter second translation...", text: $comparisonText2, minLines: 2)

                gradientButton(
                    isComparing ? "Comparing..." : "Compare",
                    systemImage: "arrow.left.arrow.right",
                    gradient: [colors.warning, colors.accent],
                    isLoading: isComparing
                ) {
                    withToolsAIConsent(action: .compare) { Task { await compareTexts() } }
                }

                if let comparisonResult {
                    Text(comparisonResult)
                        .font(.system(size: 14))
                        .foregroundStyle(colors.text)
                        .lineSpacing(4)
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(colors.surface)
                        .clipShape(.rect(cornerRadius: 12))
                }
            }
        }
    }

    private func compareTexts() async {
        guard !comparisonText1.trimmingCharacters(in: .whitespaces).isEmpty,
              !comparisonText2.trimmingCharacters(in: .whitespaces).isEmpty else {
            alertMessage = "Please enter both texts to compare."
            return
        }
        isComparing = true
        defer { isComparing = false }
        do {
            let prompt = """
            Compare these two translations (in Zomi and/or English) and provide a brief analysis of differences in meaning, tone, and accuracy.

            Context: The target language is Zomi (ISO 639-3: ctd).

            Text 1: "\(comparisonText1)"

            Text 2: "\(comparisonText2)"

            Provide a concise comparison highlighting:
            1. Semantic differences
            2. Tone/register differences (Formal/Informal Zomi)
            3. Which might be more accurate according to standard Zomi usage
            Keep it brief and practical.
            """
            comparisonResult = try await ToolkitService.shared.generateText(prompt: prompt)
            Haptics.success()
        } catch {
            comparisonResult = "Error comparing texts. Please try again."
        }
    }

    // MARK: - Flashcards

    private var flashcardsSection: some View {
        GlassCard(variant: .pink, colors: colors, isDark: theme.isDark) {
            VStack(alignment: .leading, spacing: 12) {
                Text("Flashcard Generator")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(colors.text)

                expandedInput("Enter words or phrases (one per line or comma-separated)...", text: $flashcardInput)

                gradientButton(
                    isGeneratingFlashcards ? "Generating..." : "Generate Flashcards",
                    systemImage: "sparkles",
                    gradient: [colors.secondary, colors.secondary.opacity(0.7)],
                    isLoading: isGeneratingFlashcards
                ) {
                    withToolsAIConsent(action: .flashcards) { Task { await generateFlashcards() } }
                }

                if !flashcards.isEmpty {
                    HStack {
                        Text("Generated Flashcards")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(colors.text)
                        Spacer()
                        Button {
                            let text = flashcards.enumerated()
                                .map { "\($0.offset + 1). \($0.element.front) = \($0.element.back)" }
                                .joined(separator: "\n")
                            UIPasteboard.general.string = text
                            Haptics.success()
                            alertMessage = "Flashcards copied to clipboard."
                        } label: {
                            Image(systemName: "doc.on.doc")
                                .font(.system(size: 14))
                                .foregroundStyle(colors.textSecondary)
                        }
                    }

                    ForEach(flashcards) { card in
                        VStack(alignment: .leading, spacing: 0) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("FRONT")
                                    .font(.system(size: 10, weight: .semibold))
                                    .foregroundStyle(colors.textMuted)
                                Text(card.front)
                                    .font(.system(size: 15))
                                    .foregroundStyle(colors.text)
                            }
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)

                            Rectangle()
                                .fill(colors.glassBorder)
                                .frame(height: 1)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("BACK")
                                    .font(.system(size: 10, weight: .semibold))
                                    .foregroundStyle(colors.textMuted)
                                Text(card.back)
                                    .font(.system(size: 15))
                                    .foregroundStyle(colors.text)
                            }
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.white.opacity(0.05))
                        }
                        .background(colors.surface)
                        .clipShape(.rect(cornerRadius: 12))
                    }
                }
            }
        }
    }

    private func generateFlashcards() async {
        guard !flashcardInput.trimmingCharacters(in: .whitespaces).isEmpty else {
            alertMessage = "Please enter words or phrases to generate flashcards."
            return
        }
        isGeneratingFlashcards = true
        defer { isGeneratingFlashcards = false }
        do {
            let prompt = """
            Generate flashcards for learning Zomi (ISO 639-3: ctd) - English vocabulary.

            **CRITICAL:** Use ONLY standard Zomi (ISO 639-3: ctd) vocabulary. Do not use Paite/Mizo terms.

            For each word/phrase provided, create a flashcard with the Zomi word on front and English translation on back (or vice versa if English is provided).

            Input: "\(flashcardInput)"

            Return the flashcards in this exact JSON format (return ONLY the JSON array, no other text):
            [{"front": "zomi word", "back": "english translation"}, ...]

            Generate 5-10 useful flashcards based on the input.
            """
            let result = try await ToolkitService.shared.generateText(prompt: prompt)
            if let start = result.firstIndex(of: "["),
               let end = result.lastIndex(of: "]"),
               start < end {
                let jsonString = String(result[start...end])
                if let data = jsonString.data(using: .utf8),
                   let cards = try? JSONDecoder().decode([Flashcard].self, from: data) {
                    withAnimation { flashcards = cards }
                    Haptics.success()
                    return
                }
            }
            flashcards = [Flashcard(front: flashcardInput, back: "Translation pending...")]
        } catch {
            alertMessage = "Failed to generate flashcards."
        }
    }

    // MARK: - Quick word count

    private var quickCountSection: some View {
        GlassCard(colors: colors, isDark: theme.isDark) {
            VStack(alignment: .leading, spacing: 12) {
                Text("Quick Word Count")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(colors.text)

                expandedInput("Type or paste text...", text: $statsInput)

                HStack {
                    quickCountItem(value: statsInput.count, label: "Characters")
                    Spacer()
                    quickCountItem(
                        value: statsInput.trimmingCharacters(in: .whitespaces).isEmpty
                            ? 0
                            : statsInput.split(whereSeparator: { $0.isWhitespace }).count,
                        label: "Words"
                    )
                    Spacer()
                    quickCountItem(
                        value: statsInput
                            .components(separatedBy: CharacterSet(charactersIn: ".!?"))
                            .filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
                            .count,
                        label: "Sentences"
                    )
                }
                .padding(.horizontal, 12)
            }
        }
    }

    private func quickCountItem(value: Int, label: String) -> some View {
        VStack(spacing: 2) {
            Text("\(value)")
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(colors.primary)
                .contentTransition(.numericText())
                .animation(.default, value: value)
            Text(label)
                .font(.system(size: 12))
                .foregroundStyle(colors.textMuted)
        }
    }

    // MARK: - Pro tips

    private var proTipsCard: some View {
        GlassCard(colors: colors, isDark: theme.isDark) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 8) {
                    Image(systemName: "sparkles")
                        .foregroundStyle(colors.accent)
                    Text("Pro Tips")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(colors.text)
                }
                VStack(alignment: .leading, spacing: 6) {
                    Text("• Compare translations to find the most accurate version")
                    Text("• Generate flashcards to improve vocabulary retention")
                    Text("• Text statistics help analyze writing complexity")
                }
                .font(.system(size: 13))
                .foregroundStyle(colors.textSecondary)
            }
        }
        .padding(.top, 8)
    }

    // MARK: - Shared inputs

    private func expandedInput(_ placeholder: String, text: Binding<String>, minLines: Int = 3) -> some View {
        TextField(placeholder, text: text, axis: .vertical)
            .font(.system(size: 15))
            .foregroundStyle(colors.text)
            .lineLimit(minLines...8)
            .padding(14)
            .background(colors.surface)
            .clipShape(.rect(cornerRadius: 12))
            .overlay {
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(colors.glassBorder, lineWidth: 1)
            }
    }

    private func withToolsAIConsent(action: ToolAIAction, perform: @escaping () -> Void) {
        if toolsAIConsentGiven {
            perform()
        } else {
            pendingToolAIAction = action
            showToolsAIConsent = true
        }
    }

    private func executePendingToolAIAction() {
        guard let action = pendingToolAIAction else { return }
        pendingToolAIAction = nil
        switch action {
        case .compare: Task { await compareTexts() }
        case .flashcards: Task { await generateFlashcards() }
        case .document: Task { await translateDocument() }
        }
    }

    private func gradientButton(
        _ title: String,
        systemImage: String,
        gradient: [Color],
        isLoading: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if isLoading {
                    ProgressView().tint(theme.isDark ? Color(hex: 0x0F1626) : .white)
                } else {
                    Image(systemName: systemImage)
                }
                Text(title)
            }
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(theme.isDark ? Color(hex: 0x0F1626) : .white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background {
                LinearGradient(colors: gradient, startPoint: .leading, endPoint: .trailing)
            }
            .clipShape(.rect(cornerRadius: 10))
        }
        .disabled(isLoading)
    }
}
