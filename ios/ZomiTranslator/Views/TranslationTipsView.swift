import SwiftUI

/// Translation Tips & Guide — clone of the Expo screen (key insight, tip
/// sections, good-vs-bad examples, quality factors, mistakes, best practices).
struct TranslationTipsView: View {
    @Environment(ThemeManager.self) private var theme

    private var colors: ThemeColors { theme.colors }

    private struct TipSection: Identifiable {
        let id: String
        let systemImage: String
        let iconTint: KeyPath<ThemeColors, Color>
        let title: String
        let variant: GlassVariant
        let content: [String]
    }

    private let sections: [TipSection] = [
        TipSection(
            id: "understanding",
            systemImage: "brain.head.profile",
            iconTint: \.primary,
            title: "Understanding Low-Resource Languages",
            variant: .cyan,
            content: [
                "Zomi is classified as a \"low-resource language\" in AI and machine learning. This means there is limited digital text data available for training translation models compared to languages like English, Spanish, or Chinese.",
                "Because of this, AI translators may sometimes produce less accurate results, especially for complex sentences, idioms, or specialized vocabulary.",
                "However, you can significantly improve translation quality by following the tips in this guide. The key is understanding how to communicate effectively with the AI translator.",
            ]
        ),
        TipSection(
            id: "context",
            systemImage: "square.3.layers.3d",
            iconTint: \.accent,
            title: "Why Context Matters",
            variant: .yellow,
            content: [
                "Context is the single most important factor in getting accurate translations. The more context you provide, the better the AI can understand your intent.",
                "A single word can have multiple meanings. For example, \"bank\" could mean a financial institution or the side of a river. Without context, the AI must guess.",
                "Longer sentences with clear subject-verb-object structure translate better than fragments or incomplete thoughts.",
                "When translating phrases or idioms, provide the full sentence or situation where it would be used.",
            ]
        ),
        TipSection(
            id: "en-to-zomi",
            systemImage: "arrow.right",
            iconTint: \.secondary,
            title: "English → Zomi Translation Tips",
            variant: .pink,
            content: [
                "✓ Use simple, clear English sentences with standard grammar",
                "✓ Avoid slang, abbreviations, and informal expressions",
                "✓ Write complete sentences instead of fragments",
                "✓ Use present tense when possible for clearer translations",
                "✓ Break complex sentences into shorter, simpler ones",
                "✓ Specify the subject clearly (who is doing the action)",
                "✓ For religious texts, include the biblical reference for better accuracy",
                "✗ Avoid contractions (use \"do not\" instead of \"don't\")",
                "✗ Avoid passive voice when active voice is possible",
                "✗ Avoid idioms that may not have direct Zomi equivalents",
            ]
        ),
        TipSection(
            id: "zomi-to-en",
            systemImage: "globe",
            iconTint: \.success,
            title: "Zomi → English Translation Tips",
            variant: .green,
            content: [
                "✓ Type Zomi text using standard Zomi orthography",
                "✓ Include tone markers if available for better accuracy",
                "✓ Provide complete sentences rather than single words",
                "✓ For traditional phrases or proverbs, include any context about when they are used",
                "✓ Double-check spelling of Zomi words before translating",
                "✓ If a word has multiple spellings, use the most common one",
                "✓ For compound words, consider whether to write them as one word or separate words",
            ]
        ),
        TipSection(
            id: "prompting",
            systemImage: "text.bubble",
            iconTint: \.tertiary,
            title: "How to Prompt Like a Pro",
            variant: .purple,
            content: [
                "Think of the translator as a helpful assistant who needs clear instructions.",
                "Be specific about what you want: \"Translate this greeting\" vs just typing the word",
                "If you need a formal translation, mention it: \"formal Zomi for official letter\"",
                "For technical terms, provide context: \"translate 'server' in computing context\"",
                "When uncertain, try multiple phrasings of the same sentence",
                "Use the comparison tool to evaluate different translation options",
            ]
        ),
    ]

    private let examples: [(bad: String, good: String, explanation: String)] = [
        ("bank", "I need to go to the bank to withdraw money.", "Single words are ambiguous. Full sentences provide context for accurate translation."),
        ("He's gonna be there soon", "He will arrive there soon.", "Avoid contractions and slang. Use standard English grammar."),
        ("Break a leg!", "I wish you success in your performance!", "Idioms often don't translate directly. Express the actual meaning instead."),
        ("The book was read by Mary", "Mary read the book.", "Active voice is clearer and translates more accurately than passive voice."),
        ("FYI the mtg is @ 3", "For your information, the meeting is at 3 o'clock.", "Abbreviations and symbols may not be recognized. Write words in full."),
    ]

    private let qualityFactors: [(factor: String, impact: String)] = [
        ("Sentence Length", "Medium sentences (10-20 words) translate best"),
        ("Context Clarity", "Clear context = 60% better accuracy"),
        ("Grammar Quality", "Proper grammar = 40% fewer errors"),
        ("Technical Terms", "May need manual verification"),
        ("Proper Nouns", "Names may not translate — this is normal"),
        ("Numbers & Dates", "Usually accurate, verify formatting"),
    ]

    private let commonMistakes: [String] = [
        "Translating word-by-word instead of complete sentences",
        "Using English idioms or slang that have no Zomi equivalent",
        "Forgetting to specify context for ambiguous words",
        "Relying on a single translation without verification",
        "Not checking tone or formality level needed",
        "Copying text with formatting issues or special characters",
    ]

    private let bestPractices: [(systemImage: String, tint: KeyPath<ThemeColors, Color>, title: String, description: String)] = [
        ("checkmark.circle", \.success, "Review and Verify", "Always review translations, especially for important documents. Cross-check with native speakers when possible."),
        ("target", \.primary, "Start Simple", "Begin with simple sentences. Once you get accurate results, gradually add complexity."),
        ("doc.text", \.secondary, "Keep Records", "Save successful translations for reference. Build your own phrase book over time."),
        ("heart", \.error, "Contribute Back", "If you find errors, report them. Community feedback helps improve the translator."),
    ]

    var body: some View {
        ZStack {
            AppBackground(colors: colors, isDark: theme.isDark)

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    header
                    intro
                    keyInsight

                    ForEach(sections) { section in
                        sectionCard(section)
                    }

                    sectionHeader("Examples: Good vs. Bad Input", systemImage: "book", tint: colors.accent)
                    ForEach(Array(examples.enumerated()), id: \.offset) { _, example in
                        exampleCard(example)
                    }

                    sectionHeader("Translation Quality Factors", systemImage: "target", tint: colors.primary)
                    GlassCard(variant: .cyan, colors: colors, isDark: theme.isDark) {
                        VStack(alignment: .leading, spacing: 12) {
                            ForEach(Array(qualityFactors.enumerated()), id: \.offset) { _, item in
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(item.factor)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(colors.text)
                                    Text(item.impact)
                                        .font(.system(size: 13))
                                        .foregroundStyle(colors.textSecondary)
                                }
                            }
                        }
                    }

                    sectionHeader("Common Mistakes to Avoid", systemImage: "exclamationmark.triangle", tint: colors.warning)
                    GlassCard(variant: .yellow, colors: colors, isDark: theme.isDark) {
                        VStack(alignment: .leading, spacing: 8) {
                            ForEach(commonMistakes, id: \.self) { mistake in
                                HStack(alignment: .top, spacing: 8) {
                                    Text("•")
                                    Text(mistake)
                                }
                                .font(.system(size: 14))
                                .foregroundStyle(colors.textSecondary)
                            }
                        }
                    }

                    sectionHeader("Best Practices", systemImage: "sparkles", tint: colors.success)
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        ForEach(Array(bestPractices.enumerated()), id: \.offset) { _, practice in
                            GlassCard(padding: 14, colors: colors, isDark: theme.isDark) {
                                VStack(alignment: .leading, spacing: 8) {
                                    Image(systemName: practice.systemImage)
                                        .font(.system(size: 18))
                                        .foregroundStyle(colors[keyPath: practice.tint])
                                    Text(practice.title)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(colors.text)
                                    Text(practice.description)
                                        .font(.system(size: 12))
                                        .foregroundStyle(colors.textSecondary)
                                        .lineSpacing(2)
                                }
                                .frame(maxWidth: .infinity, minHeight: 120, alignment: .topLeading)
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 24)
            }
        }
        .navigationTitle("Translation Guide")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var header: some View {
        HStack(spacing: 14) {
            HeaderIconTile(
                systemImage: "lightbulb",
                gradient: [Color(hex: 0xFFF200, alpha: 0.5), Color(hex: 0x00F0FF, alpha: 0.5)],
                borderColor: colors.glassBorder
            )
            VStack(alignment: .leading, spacing: 2) {
                Text("Translation Tips & Guide")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(colors.text)
                Text("Get the best results from Zomi Translator")
                    .font(.system(size: 13))
                    .foregroundStyle(colors.textSecondary)
            }
            Spacer()
        }
        .padding(.top, 8)
    }

    private var intro: some View {
        GlassCard(colors: colors, isDark: theme.isDark) {
            Text("Welcome to the Zomi Translator guide! This page will help you understand how to get the most accurate translations possible. Whether you are translating from English to Zomi or Zomi to English, these tips will significantly improve your results.")
                .font(.system(size: 14))
                .foregroundStyle(colors.textSecondary)
                .lineSpacing(4)
        }
    }

    private var keyInsight: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "bolt.fill")
                    .foregroundStyle(colors.accent)
                Text("Key Insight")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(colors.text)
            }
            (Text("Context is everything. ")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(colors.accent)
             + Text("The single most effective way to improve translation accuracy is to provide more context. A complete sentence will always translate better than a single word or phrase.")
                .font(.system(size: 14))
                .foregroundStyle(colors.textSecondary))
                .lineSpacing(4)
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            LinearGradient(
                colors: [Color(hex: 0x00F0FF, alpha: 0.2), Color(hex: 0x8C5CFF, alpha: 0.2)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
        .clipShape(.rect(cornerRadius: 20))
        .overlay {
            RoundedRectangle(cornerRadius: 20)
                .strokeBorder(colors.glassBorder, lineWidth: 1)
        }
    }

    private func sectionCard(_ section: TipSection) -> some View {
        GlassCard(variant: section.variant, colors: colors, isDark: theme.isDark) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 10) {
                    Image(systemName: section.systemImage)
                        .font(.system(size: 18))
                        .foregroundStyle(colors[keyPath: section.iconTint])
                        .frame(width: 36, height: 36)
                        .background(Color.white.opacity(0.1))
                        .clipShape(.rect(cornerRadius: 10))
                    Text(section.title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(colors.text)
                }
                ForEach(section.content, id: \.self) { paragraph in
                    Text(paragraph)
                        .font(.system(size: 14))
                        .foregroundStyle(colors.textSecondary)
                        .lineSpacing(4)
                }
            }
        }
    }

    private func exampleCard(_ example: (bad: String, good: String, explanation: String)) -> some View {
        GlassCard(colors: colors, isDark: theme.isDark) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("✗ Avoid")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(colors.error)
                        Text("\u{201C}\(example.bad)\u{201D}")
                            .font(.system(size: 13))
                            .foregroundStyle(colors.textSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    VStack(alignment: .leading, spacing: 4) {
                        Text("✓ Better")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(colors.success)
                        Text("\u{201C}\(example.good)\u{201D}")
                            .font(.system(size: 13))
                            .foregroundStyle(colors.text)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                Text(example.explanation)
                    .font(.system(size: 12))
                    .foregroundStyle(colors.textMuted)
            }
        }
    }

    private func sectionHeader(_ title: String, systemImage: String, tint: Color) -> some View {
        HStack(spacing: 10) {
            Image(systemName: systemImage)
                .font(.system(size: 18))
                .foregroundStyle(tint)
            Text(title)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(colors.text)
        }
        .padding(.top, 8)
    }
}
