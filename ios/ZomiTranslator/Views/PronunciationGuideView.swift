import SwiftUI

/// Pronunciation Guide — clone of the Expo screen (alphabet & sounds grid,
/// tone guidelines, common mistakes, practice tips) with native TTS playback.
struct PronunciationGuideView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(SpeechService.self) private var speech

    @State private var activeExample: String?

    private var colors: ThemeColors { theme.colors }

    private struct Rule: Identifiable {
        var id: String { letter }
        let letter: String
        let sound: String
        let example: String
        let zomiWord: String
    }

    private let rules: [Rule] = [
        Rule(letter: "A", sound: "ah", example: "father", zomiWord: "Ann (food)"),
        Rule(letter: "E", sound: "eh", example: "bed", zomiWord: "Mei (fire)"),
        Rule(letter: "I", sound: "ee", example: "see", zomiWord: "Ni (sun)"),
        Rule(letter: "O", sound: "oh", example: "go", zomiWord: "Hoi (good)"),
        Rule(letter: "U", sound: "oo", example: "moon", zomiWord: "Tui (water)"),
        Rule(letter: "Ng", sound: "ng", example: "sing", zomiWord: "Nga (five)"),
        Rule(letter: "Kh", sound: "k + h", example: "blockhead", zomiWord: "Khat (one)"),
        Rule(letter: "Th", sound: "th", example: "think", zomiWord: "Thum (three)"),
        Rule(letter: "Z", sound: "z", example: "zoo", zomiWord: "Zuang (go)"),
        Rule(letter: "P", sound: "p", example: "pen", zomiWord: "Pa (father)"),
    ]

    private let tones: [(title: String, description: String, example: String)] = [
        ("High Tone", "Voice rises, like asking a question", "An kidah?"),
        ("Mid Tone", "Normal speaking pitch", "Maw ka"),
        ("Low Tone", "Voice drops slightly", "Lungdam"),
        ("Falling Tone", "Start high, end low", "Innkuan"),
    ]

    private let mistakes: [(wrong: String, correct: String)] = [
        ("Pronouncing \"Ng\" as N-G", "Say it as one sound: \"ng\" like in \"sing\""),
        ("Skipping the \"h\" in Kh", "Emphasize both K and H sounds together"),
        ("English \"th\" in \"them\"", "Use \"th\" as in \"think\" (voiceless)"),
        ("Short vowels", "Zomi vowels are typically longer than English"),
    ]

    private func variant(for index: Int) -> GlassVariant {
        switch index % 5 {
        case 0: return .cyan
        case 1: return .pink
        case 2: return .yellow
        case 3: return .purple
        default: return .green
        }
    }

    var body: some View {
        ZStack {
            AppBackground(colors: colors, isDark: theme.isDark, showOrbs: true)

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    VStack(spacing: 8) {
                        HeaderIconTile(
                            systemImage: "mic",
                            gradient: [Color(hex: 0x00F0FF, alpha: 0.4), Color(hex: 0x8C5CFF, alpha: 0.4)],
                            borderColor: colors.glassBorder,
                            size: 72
                        )
                        Text("Pronunciation Guide")
                            .font(.system(size: 24, weight: .bold))
                            .foregroundStyle(colors.text)
                        Text("Master Zomi sounds and tones")
                            .font(.system(size: 14))
                            .foregroundStyle(colors.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 8)

                    GlassCard(variant: .cyan, glow: true, colors: colors, isDark: theme.isDark) {
                        VStack(alignment: .leading, spacing: 10) {
                            HStack(spacing: 10) {
                                Image(systemName: "info.circle")
                                    .foregroundStyle(colors.primary)
                                Text("About Zomi Pronunciation")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundStyle(colors.text)
                            }
                            Text("Zomi uses the Latin alphabet with some unique sounds and tonal variations. This guide will help you pronounce words correctly and understand the phonetic system.")
                                .font(.system(size: 14))
                                .foregroundStyle(colors.textSecondary)
                                .lineSpacing(4)
                        }
                    }

                    sectionTitle("Alphabet & Sounds")
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        ForEach(Array(rules.enumerated()), id: \.element.id) { index, rule in
                            ruleCard(rule, variant: variant(for: index))
                        }
                    }

                    sectionTitle("Tone Guidelines")
                    ForEach(Array(tones.enumerated()), id: \.offset) { index, tone in
                        GlassCard(
                            variant: index % 2 == 0 ? .purple : .pink,
                            colors: colors,
                            isDark: theme.isDark
                        ) {
                            VStack(alignment: .leading, spacing: 8) {
                                HStack(spacing: 8) {
                                    Circle()
                                        .fill(index % 2 == 0 ? colors.tertiary : colors.secondary)
                                        .frame(width: 10, height: 10)
                                    Text(tone.title)
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundStyle(colors.text)
                                }
                                Text(tone.description)
                                    .font(.system(size: 14))
                                    .foregroundStyle(colors.textSecondary)
                                HStack(spacing: 8) {
                                    Text("Example:")
                                        .font(.system(size: 12))
                                        .foregroundStyle(colors.textMuted)
                                    Button {
                                        play(tone.example)
                                    } label: {
                                        HStack(spacing: 6) {
                                            Text(tone.example)
                                                .font(.system(size: 14, weight: .semibold))
                                                .foregroundStyle(colors.accent)
                                            Image(systemName: "play.circle")
                                                .font(.system(size: 14))
                                                .foregroundStyle(colors.accent)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    sectionTitle("Common Mistakes to Avoid")
                    GlassCard(variant: .yellow, colors: colors, isDark: theme.isDark) {
                        VStack(alignment: .leading, spacing: 14) {
                            ForEach(Array(mistakes.enumerated()), id: \.offset) { index, mistake in
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack(alignment: .top, spacing: 10) {
                                        Image(systemName: "xmark.circle.fill")
                                            .foregroundStyle(colors.error)
                                        Text(mistake.wrong)
                                            .font(.system(size: 14))
                                            .foregroundStyle(colors.text)
                                    }
                                    HStack(alignment: .top, spacing: 10) {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundStyle(colors.success)
                                        Text(mistake.correct)
                                            .font(.system(size: 14))
                                            .foregroundStyle(colors.text)
                                    }
                                    if index != mistakes.count - 1 {
                                        Rectangle()
                                            .fill(colors.glassBorder)
                                            .frame(height: 1)
                                    }
                                }
                            }
                        }
                    }

                    GlassCard(variant: .green, glow: true, colors: colors, isDark: theme.isDark) {
                        VStack(alignment: .leading, spacing: 10) {
                            HStack(spacing: 10) {
                                Image(systemName: "book")
                                    .foregroundStyle(colors.success)
                                Text("Practice Tips")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundStyle(colors.text)
                            }
                            Text("""
                            • Listen to native speakers as much as possible
                            • Practice vowel sounds — they're longer than in English
                            • Pay attention to tones — they can change word meanings
                            • Record yourself and compare with native pronunciation
                            • Use the audio feature in the dictionary regularly
                            • Don't be afraid to ask native speakers for feedback
                            • Practice common phrases until they feel natural
                            """)
                            .font(.system(size: 14))
                            .foregroundStyle(colors.textSecondary)
                            .lineSpacing(5)
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 24)
            }
        }
        .navigationTitle("Pronunciation Guide")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func ruleCard(_ rule: Rule, variant: GlassVariant) -> some View {
        GlassCard(variant: variant, padding: 14, colors: colors, isDark: theme.isDark) {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(rule.letter)
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(colors.text)
                    Spacer()
                    Button {
                        play(rule.zomiWord)
                    } label: {
                        Image(systemName: activeExample == rule.zomiWord ? "speaker.wave.2.fill" : "play.circle")
                            .font(.system(size: 18))
                            .foregroundStyle(activeExample == rule.zomiWord ? colors.accent : colors.textSecondary)
                    }
                }
                Text("Sound: \"\(rule.sound)\"")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(colors.textSecondary)
                Text("Like: \(rule.example)")
                    .font(.system(size: 12))
                    .foregroundStyle(colors.textMuted)
                Text(rule.zomiWord)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(colors.text)
            }
        }
    }

    private func play(_ text: String) {
        Haptics.light()
        activeExample = text
        speech.speak(text)
        Task {
            try? await Task.sleep(for: .seconds(1.5))
            if activeExample == text { activeExample = nil }
        }
    }

    private func sectionTitle(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 18, weight: .semibold))
            .foregroundStyle(colors.text)
            .padding(.top, 8)
    }
}
