import Foundation

nonisolated enum Scriptures {
    static let all: [Scripture] = [
        Scripture(
            id: "1",
            verseZomi: "Pasian pen itna a hihi; a itna sung ah gimna om kei hi.",
            verseEnglish: "God is love; there is no fear in His love.",
            reference: "1 John 4:18",
            category: "love"
        ),
        Scripture(
            id: "2",
            verseZomi: "Topa ka Honkhiatpa hi; kua mah ka lau ding hiam?",
            verseEnglish: "The Lord is my salvation; whom shall I fear?",
            reference: "Psalm 27:1",
            category: "faith"
        ),
        Scripture(
            id: "3",
            verseZomi: "Pasian in leitung a it mahmah ahih manin a Tapa khatbek pe hi.",
            verseEnglish: "For God so loved the world that He gave His only Son.",
            reference: "John 3:16",
            category: "love"
        ),
        Scripture(
            id: "4",
            verseZomi: "Topa ka honkhiatna le ka hatna hi.",
            verseEnglish: "The Lord is my light and my salvation.",
            reference: "Psalm 27:1",
            category: "strength"
        ),
        Scripture(
            id: "5",
            verseZomi: "Pasian tawh khat in bangmah zo kei ding om lo hi.",
            verseEnglish: "With God, nothing is impossible.",
            reference: "Luke 1:37",
            category: "faith"
        ),
        Scripture(
            id: "6",
            verseZomi: "Nang hong ngai in, ken zong kong ngai ding hi.",
            verseEnglish: "Love one another as I have loved you.",
            reference: "John 15:12",
            category: "love"
        ),
        Scripture(
            id: "7",
            verseZomi: "Topa in nang tawh om hi; lau heak in.",
            verseEnglish: "The Lord is with you; do not be afraid.",
            reference: "Joshua 1:9",
            category: "courage"
        ),
        Scripture(
            id: "8",
            verseZomi: "Kei ka lampi, ka thuman le ka nuntak hi.",
            verseEnglish: "I am the way, the truth, and the life.",
            reference: "John 14:6",
            category: "faith"
        ),
        Scripture(
            id: "9",
            verseZomi: "Nangmah ading ngaihsutna ka nei hi, Topa in ci hi.",
            verseEnglish: "I know the plans I have for you, declares the Lord.",
            reference: "Jeremiah 29:11",
            category: "hope"
        ),
        Scripture(
            id: "10",
            verseZomi: "Topa hoih hi; a itna tawntung ding hi.",
            verseEnglish: "The Lord is good; His love endures forever.",
            reference: "Psalm 100:5",
            category: "praise"
        ),
        Scripture(
            id: "11",
            verseZomi: "Kei sung ah hatna nei in, bangmah zo thei ding hi.",
            verseEnglish: "I can do all things through Him who strengthens me.",
            reference: "Philippians 4:13",
            category: "strength"
        ),
        Scripture(
            id: "12",
            verseZomi: "Pasian pen ka kivualna hi; bangmah ka lau kei ding hi.",
            verseEnglish: "God is my refuge; I will not be afraid.",
            reference: "Psalm 46:1",
            category: "courage"
        ),
    ]

    static func random() -> Scripture {
        all.randomElement() ?? all[0]
    }

    static func ofTheDay() -> Scripture {
        let dayOfYear = Calendar.current.ordinality(of: .day, in: .year, for: Date()) ?? 1
        return all[dayOfYear % all.count]
    }
}
