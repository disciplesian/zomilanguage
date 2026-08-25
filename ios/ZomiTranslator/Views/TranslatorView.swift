import PhotosUI
import SwiftUI

/// Main Translate screen — clone of the Expo translator (language selector,
/// quick menu, input card with voice/paste/camera/photo/clear, streaming
/// output card with favorite/share/copy/speak, quality bar).
struct TranslatorView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(TranslationStore.self) private var translationStore
    @Environment(GlossaryStore.self) private var glossaryStore
    @Environment(SpeechService.self) private var speech

    @State private var viewModel = TranslatorViewModel()
    @State private var recorder = AudioRecorderService()

    @State private var copied = false
    @State private var isFavorite = false
    @State private var showSpeedOptions = false
    @State private var showShareSheet = false
    @State private var pdfExport: PDFShareItem?
    @State private var isExportingPDF = false
    @State private var photoPickerItem: PhotosPickerItem?
    @State private var showCamera = false
    @State private var isExtractingText = false
    @State private var alertMessage: String?
    @State private var showAIConsent = false
    @State private var showAudioConsent = false
    @State private var showLanguagePicker = false

    private var colors: ThemeColors { theme.colors }

    private var aiConsentGiven: Bool {
        UserDefaults.standard.bool(forKey: "ai_consent_given")
    }

    private var audioConsentGiven: Bool {
        UserDefaults.standard.bool(forKey: "audio_consent_given")
    }

    var body: some View {
        ZStack {
            AppBackground(colors: colors, isDark: theme.isDark)

            ScrollView {
                VStack(spacing: 12) {
                    header
                    languageSelector
                    quickMenu
                    inputCard
                    outputCard
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 90)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .photosPicker(isPresented: .constant(false), selection: .constant(nil))
        .onAppear {
            viewModel.translationStore = translationStore
            viewModel.glossaryStore = glossaryStore
            if !aiConsentGiven {
                showAIConsent = true
            }
        }
        .sheet(isPresented: $showCamera) {
            CameraPicker { image in
                Task { await extractText(from: image) }
            }
            .ignoresSafeArea()
        }
        .sheet(isPresented: $showShareSheet) {
            ShareSheet(items: [shareMessage])
        }
        .sheet(item: $pdfExport) { item in
            ShareSheet(items: [item.url])
        }
        .sheet(isPresented: $showLanguagePicker) {
            LanguagePickerSheet(
                selectedCode: viewModel.targetLanguageCode,
                onSelect: { code in
                    Haptics.selection()
                    viewModel.selectTargetLanguage(code)
                    showLanguagePicker = false
                }
            )
            .presentationDetents([.medium, .large])
        }
        .alert("Zomi Translator", isPresented: Binding(
            get: { alertMessage != nil },
            set: { if !$0 { alertMessage = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(alertMessage ?? "")
        }
        .onChange(of: photoPickerItem) { _, newItem in
            guard let newItem else { return }
            Task {
                if let data = try? await newItem.loadTransferable(type: Data.self),
                   let image = UIImage(data: data) {
                    await extractText(from: image)
                }
                photoPickerItem = nil
            }
        }
        .alert("AI Translation Consent", isPresented: $showAIConsent) {
            Button("Agree & Continue") {
                viewModel.grantAIConsent()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Translations are powered by Google Gemini AI. When you translate, your text and any glossary terms are sent securely to Google for processing. By continuing, you consent to this processing.")
        }
        .alert("Voice Transcription Consent", isPresented: $showAudioConsent) {
            Button("Agree & Continue") {
                UserDefaults.standard.set(true, forKey: "audio_consent_given")
                Task { await handleVoiceInput() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Voice input sends your recording to the Rork AI toolkit for transcription. By continuing, you consent to this audio processing.")
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack(spacing: 14) {
            AsyncImage(url: URL(string: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/fw1kjqxngjk7aalao0jn6")) { phase in
                if let image = phase.image {
                    image.resizable().scaledToFit()
                } else {
                    Image(systemName: "character.bubble")
                        .font(.title2)
                        .foregroundStyle(colors.primary)
                }
            }
            .frame(width: 54, height: 54)
            .background(Color.black.opacity(0.2))
            .clipShape(.rect(cornerRadius: 16))
            .overlay {
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(colors.glassBorder, lineWidth: 1)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("ZOMI TRANSLATOR")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Color(hex: 0x00D9FF))
                Text("AI-Powered Translation")
                    .font(.system(size: 13))
                    .foregroundStyle(colors.textSecondary)
            }
            Spacer()
        }
        .padding(.top, 8)
    }

    // MARK: - Language selector

    private var languageSelector: some View {
        GlassCard(variant: .cyan, glow: true, padding: 10, colors: colors, isDark: theme.isDark) {
            HStack {
                languageButton(title: viewModel.sourceLabel, isActive: true) {
                    Haptics.selection()
                    viewModel.toggleSource()
                }

                Button {
                    Haptics.medium()
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                        viewModel.swapLanguages()
                    }
                } label: {
                    LinearGradient(
                        colors: [Color(hex: 0x00F0FF, alpha: 0.8), Color(hex: 0x8C5CFF, alpha: 0.8)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    .frame(width: 48, height: 48)
                    .overlay {
                        Image(systemName: "arrow.left.arrow.right")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(.white)
                            .allowsHitTesting(false)
                    }
                    .clipShape(Circle())
                }
                .buttonStyle(PressableButtonStyle())
                .accessibilityLabel("Swap languages")

                targetLanguageButton
            }
        }
    }

    /// Target-language chip — opens the searchable language picker.
    private var targetLanguageButton: some View {
        Button {
            Haptics.selection()
            showLanguagePicker = true
        } label: {
            HStack(spacing: 6) {
                Text(viewModel.targetLabel)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(colors.text)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Image(systemName: "chevron.down")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color(hex: 0x00F0FF))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color(hex: 0x00F0FF, alpha: theme.isDark ? 0.25 : 0.15))
            .clipShape(.rect(cornerRadius: 12))
        }
        .buttonStyle(PressableButtonStyle())
        .accessibilityLabel("Choose target language")
    }

    private func languageButton(title: String, isActive: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(isActive ? colors.text : colors.textSecondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(isActive ? Color(hex: 0x00F0FF, alpha: theme.isDark ? 0.25 : 0.15) : .clear)
                .clipShape(.rect(cornerRadius: 12))
        }
    }

    // MARK: - Quick menu

    private struct QuickItem: Identifiable {
        let id: String
        let label: String
        let systemImage: String
        let color: Color
        let destination: QuickDestination
    }

    private enum QuickDestination {
        case tools, history, glossary, pronounce, tips
    }

    private var quickItems: [QuickItem] {
        [
            QuickItem(id: "tools", label: "Tools", systemImage: "wrench.and.screwdriver", color: Color(hex: 0x8C5CFF), destination: .tools),
            QuickItem(id: "history", label: "History", systemImage: "clock.arrow.circlepath", color: Color(hex: 0x22D3A3), destination: .history),
            QuickItem(id: "glossary", label: "Glossary", systemImage: "book", color: Color(hex: 0xFFB547), destination: .glossary),
            QuickItem(id: "pronounce", label: "Pronounce", systemImage: "mic", color: Color(hex: 0xFF6B9D), destination: .pronounce),
            QuickItem(id: "tips", label: "Tips", systemImage: "lightbulb", color: Color(hex: 0xFFD166), destination: .tips),
        ]
    }

    private var quickMenu: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(quickItems) { item in
                    NavigationLink(value: item.id) {
                        VStack(spacing: 6) {
                            LinearGradient(
                                colors: [item.color.opacity(0.2), item.color.opacity(0.08)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                            .frame(width: 52, height: 52)
                            .overlay {
                                Image(systemName: item.systemImage)
                                    .font(.system(size: 20))
                                    .foregroundStyle(item.color)
                                    .allowsHitTesting(false)
                            }
                            .clipShape(.rect(cornerRadius: 16))
                            .overlay {
                                RoundedRectangle(cornerRadius: 16)
                                    .strokeBorder(item.color.opacity(0.33), lineWidth: 1)
                            }

                            Text(item.label)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(colors.textSecondary)
                        }
                        .frame(width: 68)
                    }
                    .buttonStyle(PressableButtonStyle())
                    .simultaneousGesture(TapGesture().onEnded { Haptics.light() })
                }
            }
            .padding(.vertical, 4)
        }
        .contentMargins(.horizontal, 2)
        .navigationDestination(for: String.self) { id in
            switch id {
            case "tools": ToolsView()
            case "history": HistoryView()
            case "glossary": GlossaryView()
            case "pronounce": PronunciationGuideView()
            case "tips": TranslationTipsView()
            default: EmptyView()
            }
        }
    }

    // MARK: - Input card

    private var inputCard: some View {
        GlassCard(variant: .purple, colors: colors, isDark: theme.isDark) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text(viewModel.sourceLabel)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(colors.text)
                    Spacer()
                    HStack(spacing: 4) {
                        micButton
                        actionIcon("doc.on.clipboard") { pasteFromClipboard() }
                        actionIcon("camera") { showCamera = true }
                        photoPickerButton
                        actionIcon("trash") {
                            Haptics.light()
                            viewModel.clear()
                            speech.stop()
                        }
                    }
                }

                if recorder.isRecording {
                    recordingIndicator
                }

                if isExtractingText {
                    HStack(spacing: 8) {
                        ProgressView()
                            .tint(colors.accent)
                        Text("Extracting text from image...")
                            .font(.system(size: 13))
                            .foregroundStyle(colors.textSecondary)
                    }
                }

                TextField(
                    "Type \(viewModel.sourceLabel) text...",
                    text: Binding(get: { viewModel.inputText }, set: { viewModel.inputText = $0 }),
                    axis: .vertical
                )
                .font(.system(size: 17))
                .foregroundStyle(colors.text)
                .lineLimit(4...10)
                .disabled(recorder.isRecording || recorder.isTranscribing)

                HStack {
                    Text("\(viewModel.inputText.count)/5000")
                    Spacer()
                    Text("\(viewModel.wordCount) words")
                }
                .font(.system(size: 12))
                .foregroundStyle(colors.textMuted)
            }
        }
    }

    private var micButton: some View {
        Button {
            Task {
                if recorder.isRecording || audioConsentGiven {
                    await handleVoiceInput()
                } else {
                    showAudioConsent = true
                }
            }
        } label: {
            Group {
                if recorder.isTranscribing {
                    ProgressView()
                        .tint(colors.accent)
                } else if recorder.isRecording {
                    Image(systemName: "stop.fill")
                        .foregroundStyle(colors.error)
                } else {
                    Image(systemName: "mic")
                        .foregroundStyle(colors.textSecondary)
                }
            }
            .font(.system(size: 16))
            .frame(width: 34, height: 34)
            .background(recorder.isRecording ? colors.error.opacity(0.2) : .clear)
            .clipShape(.rect(cornerRadius: 8))
        }
        .buttonStyle(PressableButtonStyle())
        .disabled(recorder.isTranscribing)
        .accessibilityLabel(recorder.isRecording ? "Stop recording" : "Voice input")
    }

    private var photoPickerButton: some View {
        PhotosPicker(selection: $photoPickerItem, matching: .images) {
            Image(systemName: "photo")
                .font(.system(size: 16))
                .foregroundStyle(colors.textSecondary)
                .frame(width: 34, height: 34)
        }
        .accessibilityLabel("Extract text from photo")
    }

    private var recordingIndicator: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(colors.error)
                .frame(width: 10, height: 10)
            Text("Recording... \(formatDuration(recorder.recordingDuration))")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(colors.error)
            Spacer()
            Button("Cancel") {
                recorder.cancelRecording()
            }
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(colors.error)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(colors.error.opacity(0.2))
            .clipShape(.rect(cornerRadius: 6))
        }
        .padding(10)
        .background(colors.error.opacity(0.1))
        .clipShape(.rect(cornerRadius: 10))
    }

    // MARK: - Output card

    private var outputCard: some View {
        GlassCard(variant: .green, glow: true, colors: colors, isDark: theme.isDark) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    HStack(spacing: 8) {
                        Text(viewModel.targetLabel)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(colors.text)

                        if !viewModel.outputText.isEmpty && !viewModel.isTranslating && !viewModel.isStreaming {
                            HStack(spacing: 3) {
                                Image(systemName: "checkmark.seal.fill")
                                    .font(.system(size: 10))
                                    .foregroundStyle(Color(red: 0.39, green: 0.75, blue: 1.0))
                                Text("Official")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundStyle(Color(red: 0.39, green: 0.75, blue: 1.0))
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color(red: 0.114, green: 0.608, blue: 0.941).opacity(0.15))
                            .clipShape(.rect(cornerRadius: 20))
                            .overlay {
                                RoundedRectangle(cornerRadius: 20)
                                    .stroke(Color(red: 0.114, green: 0.608, blue: 0.941).opacity(0.35), lineWidth: 1)
                            }
                        }
                    }
                    Spacer()
                    HStack(spacing: 4) {
                        actionIcon(isFavorite ? "star.fill" : "star", tint: isFavorite ? colors.accent : nil) {
                            Haptics.light()
                            isFavorite.toggle()
                        }
                        actionIcon("square.and.arrow.up") { shareTranslation() }
                        exportPDFButton
                        actionIcon("doc.on.doc", tint: copied ? colors.success : nil) { copyOutput() }
                        speakButton
                    }
                }

                if viewModel.isStreaming && !viewModel.outputText.isEmpty {
                    streamingStatus
                }

                if showSpeedOptions {
                    speedOptions
                }

                outputContent

                if !viewModel.alternatives.isEmpty && !viewModel.isTranslating && !viewModel.isStreaming {
                    alternativesSection
                }

                if viewModel.quality > 0 && !viewModel.isTranslating && !viewModel.isStreaming {
                    qualitySection
                }
            }
        }
    }

    @ViewBuilder
    private var outputContent: some View {
        if viewModel.isTranslating && viewModel.outputText.isEmpty {
            VStack(spacing: 12) {
                TypingDotsIndicator(color: colors.accent, dotSize: 9)
                Text(viewModel.isConnecting ? "Connecting..." : "Translating with Zomi AI...")
                    .font(.system(size: 14))
                    .foregroundStyle(colors.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
            .animation(.easeInOut(duration: 0.2), value: viewModel.isConnecting)
        } else if let error = viewModel.errorText {
            VStack(spacing: 10) {
                Image(systemName: "exclamationmark.circle")
                    .font(.system(size: 20))
                    .foregroundStyle(colors.error)
                Text(error)
                    .font(.system(size: 14))
                    .foregroundStyle(colors.error)
                    .multilineTextAlignment(.center)
                Button("Retry") {
                    viewModel.retry()
                }
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(colors.text)
                .padding(.horizontal, 20)
                .padding(.vertical, 8)
                .background(colors.surface)
                .clipShape(.rect(cornerRadius: 8))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
        } else {
            outputTextBody
                .font(.system(size: 17))
                .foregroundStyle(viewModel.outputText.isEmpty ? colors.textMuted : colors.text)
                .frame(maxWidth: .infinity, minHeight: 60, alignment: .topLeading)
                .textSelection(.enabled)
                .animation(.default, value: viewModel.outputText)
        }
    }

    /// The translation text, with a blinking caret appended while the AI is
    /// actively streaming tokens.
    @ViewBuilder
    private var outputTextBody: some View {
        if viewModel.isStreaming && viewModel.hasStreamedText {
            TimelineView(.periodic(from: .now, by: 0.5)) { timeline in
                let blink = Int(timeline.date.timeIntervalSinceReferenceDate * 2) % 2 == 0
                (Text(viewModel.outputText)
                    + Text(" \u{258C}").foregroundStyle(blink ? colors.accent : Color.clear))
            }
        } else {
            Text(viewModel.outputText.isEmpty ? "Translation will appear here..." : viewModel.outputText)
        }
    }

    /// Compact status row shown while a refresh translation streams in
    /// (i.e. previous text is still on screen).
    private var streamingStatus: some View {
        HStack(spacing: 8) {
            TypingDotsIndicator(color: colors.accent, dotSize: 5)
            Text("Zomi AI is translating")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(colors.textSecondary)
        }
        .transition(.opacity)
        .animation(.easeInOut(duration: 0.2), value: viewModel.isStreaming)
    }

    /// Alternative phrasings for inputs with multiple common senses — tapping
    /// one promotes it to the main translation.
    private var alternativesSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Also common")
                .font(.system(size: 11, weight: .bold))
                .textCase(.uppercase)
                .tracking(0.5)
                .foregroundStyle(colors.textSecondary)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: 8)], alignment: .leading, spacing: 8) {
                ForEach(viewModel.alternatives, id: \.self) { alternative in
                    Button {
                        Haptics.light()
                        viewModel.promoteAlternative(alternative)
                    } label: {
                        Text(alternative)
                            .font(.system(size: 14))
                            .foregroundStyle(colors.text)
                            .multilineTextAlignment(.leading)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(colors.surface)
                            .clipShape(.rect(cornerRadius: 20))
                            .overlay {
                                RoundedRectangle(cornerRadius: 20)
                                    .stroke(colors.glassBorder, lineWidth: 1)
                            }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 2)
    }

    private var speakButton: some View {
        Button {
            if speech.isSpeaking {
                speech.stop()
            } else if !viewModel.outputText.isEmpty {
                speech.speak(viewModel.outputText, language: LanguageCatalog.ttsCode(viewModel.targetLanguageCode))
            }
        } label: {
            Image(systemName: speech.isSpeaking ? "speaker.wave.2.fill" : "speaker.wave.2")
                .font(.system(size: 16))
                .foregroundStyle(speech.isSpeaking ? colors.accent : colors.textSecondary)
                .frame(width: 34, height: 34)
        }
        .buttonStyle(PressableButtonStyle())
        .simultaneousGesture(
            LongPressGesture(minimumDuration: 0.4).onEnded { _ in
                Haptics.light()
                withAnimation { showSpeedOptions.toggle() }
            }
        )
        .accessibilityLabel("Speak translation")
    }

    private var speedOptions: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("TTS Speed")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(colors.textMuted)
            HStack(spacing: 8) {
                ForEach(SpeechService.availableSpeeds, id: \.self) { speed in
                    Button {
                        speech.currentSpeed = speed
                        withAnimation { showSpeedOptions = false }
                    } label: {
                        Text(speed == 1.0 ? "1x" : String(format: "%gx", speed))
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(speech.currentSpeed == speed ? colors.text : colors.textSecondary)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(speech.currentSpeed == speed ? colors.glassCyan : colors.surface)
                            .clipShape(.rect(cornerRadius: 8))
                    }
                }
            }
        }
        .padding(10)
        .background(colors.surface)
        .clipShape(.rect(cornerRadius: 10))
    }

    /// Exports the current session's translations as a formatted PDF.
    @ViewBuilder
    private var exportPDFButton: some View {
        if isExportingPDF {
            ProgressView()
                .tint(colors.accent)
                .frame(width: 34, height: 34)
        } else {
            actionIcon("arrow.down.doc") {
                exportSessionPDF()
            }
            .accessibilityLabel("Export session as PDF")
        }
    }

    private var qualitySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Translation Quality")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(colors.textSecondary)
                Spacer()
                Text("\(viewModel.quality)%")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(
                        viewModel.quality > 80 ? colors.success :
                            viewModel.quality > 70 ? colors.warning : colors.error
                    )
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(colors.surface)
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: viewModel.quality > 80
                                    ? [colors.success, colors.successLight]
                                    : [colors.warning, colors.accent],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * CGFloat(viewModel.quality) / 100)
                        .animation(.spring(response: 0.6, dampingFraction: 0.8), value: viewModel.quality)
                }
            }
            .frame(height: 6)

            if viewModel.quality < 80 && viewModel.wordCount <= 3 {
                NavigationLink(value: "tips") {
                    HStack(spacing: 6) {
                        Image(systemName: "exclamationmark.circle")
                            .font(.system(size: 12))
                        Text("Tip: Add more context for better results")
                            .font(.system(size: 12))
                    }
                    .foregroundStyle(colors.warning)
                }
            }
        }
        .padding(.top, 4)
    }

    // MARK: - Actions

    private func actionIcon(_ systemImage: String, tint: Color? = nil, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 16))
                .foregroundStyle(tint ?? colors.textSecondary)
                .frame(width: 34, height: 34)
        }
        .buttonStyle(PressableButtonStyle())
    }

    private var shareMessage: String {
        let sourceLabel = viewModel.sourceLabel
        let targetLabel = viewModel.targetLabel
        return "\(sourceLabel): \(viewModel.inputText)\n\n\(targetLabel): \(viewModel.outputText)\n\nTranslated with Zomi Translator"
    }

    private func shareTranslation() {
        guard !viewModel.outputText.isEmpty, viewModel.errorText == nil else {
            alertMessage = "No translation available to share"
            return
        }
        showShareSheet = true
    }

    private func copyOutput() {
        guard !viewModel.outputText.isEmpty, viewModel.errorText == nil else { return }
        UIPasteboard.general.string = viewModel.outputText
        Haptics.success()
        copied = true
        Task {
            try? await Task.sleep(for: .seconds(2))
            copied = false
        }
    }

    private func exportSessionPDF() {
        guard !viewModel.sessionTranslations.isEmpty else {
            alertMessage = "Nothing to export yet — translate a few phrases first, then export the whole session as a PDF."
            return
        }
        Haptics.light()
        isExportingPDF = true
        Task {
            defer { isExportingPDF = false }
            do {
                let url = try PDFExportService.makeSessionPDF(viewModel.sessionTranslations)
                Haptics.success()
                pdfExport = PDFShareItem(url: url)
            } catch {
                alertMessage = "Could not create the PDF. Please try again."
            }
        }
    }

    private func pasteFromClipboard() {
        if let text = UIPasteboard.general.string, !text.isEmpty {
            viewModel.inputText = text
            Haptics.success()
        }
    }

    private func handleVoiceInput() async {
        if recorder.isRecording {
            if let transcription = await recorder.stopRecordingAndTranscribe() {
                viewModel.inputText = transcription
                Haptics.success()
            } else if let error = recorder.errorMessage {
                alertMessage = error
            }
        } else {
            Haptics.medium()
            await recorder.startRecording()
            if let error = recorder.errorMessage {
                alertMessage = error
            }
        }
    }

    private func extractText(from image: UIImage) async {
        isExtractingText = true
        defer { isExtractingText = false }
        do {
            let text = try await OCRService.extractText(from: image)
            if text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                alertMessage = "Could not detect any text in the image."
            } else {
                viewModel.inputText = text
                Haptics.success()
            }
        } catch {
            alertMessage = "Failed to extract text from image. Please try again."
        }
    }

    private func formatDuration(_ seconds: Int) -> String {
        String(format: "%d:%02d", seconds / 60, seconds % 60)
    }

    /// Identifiable wrapper so a sheet can present the exported PDF file URL.
    private struct PDFShareItem: Identifiable {
        let id = UUID()
        let url: URL
    }
}

/// UIKit camera wrapper for OCR capture.
struct CameraPicker: UIViewControllerRepresentable {
    let onImage: (UIImage) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = UIImagePickerController.isSourceTypeAvailable(.camera) ? .camera : .photoLibrary
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPicker
        init(_ parent: CameraPicker) { self.parent = parent }

        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            if let image = info[.originalImage] as? UIImage {
                parent.onImage(image)
            }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
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
