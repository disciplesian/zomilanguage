import Foundation

/// One row of the bundled English → Zomi dictionary (10,620 human-verified entries).
nonisolated struct DictionaryEntry: Identifiable, Hashable {
    let english: String
    /// Raw part of speech exactly as recorded in the dataset (e.g. "pas. part.").
    let pos: String
    let zomi: String
    let category: String

    var id: String { "\(english)|\(pos)|\(zomi)" }
}

/// Loader and search index for the bundled dictionary JSON.
nonisolated enum DictionaryData {
    struct Payload: Decodable {
        let version: Int
        let count: Int
        let entries: [[String]]
    }

    /// Cached decoded entries (loaded once per process).
    nonisolated(unsafe) private static var cached: [DictionaryEntry]?
    private static let lock = NSLock()

    /// Version of the dataset currently in use (the bundled asset is version 1).
    nonisolated(unsafe) private static var activeVersionValue: Int = 1

    static func activeVersion() -> Int {
        lock.lock()
        defer { lock.unlock() }
        return activeVersionValue
    }

    /// Replaces the search index with a newer dataset published on the server
    /// (/api/dictionary/latest). Returns true when the dataset was applied.
    @discardableResult
    static func applyRemote(_ entries: [DictionaryEntry], version: Int) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        guard !entries.isEmpty, version > activeVersionValue else { return false }
        activeVersionValue = version
        cached = entries
        browseCache = nil
        return true
    }

    static func load() -> [DictionaryEntry] {
        lock.lock()
        defer { lock.unlock() }
        if let cached { return cached }
        guard let url = Bundle.main.url(forResource: "dictionary", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let payload = try? JSONDecoder().decode(Payload.self, from: data)
        else {
            return []
        }
        let entries: [DictionaryEntry] = payload.entries.compactMap { (row: [String]) -> DictionaryEntry? in
            guard row.count >= 4 else { return nil }
            return DictionaryEntry(english: row[0], pos: row[1], zomi: row[2], category: row[3])
        }
        cached = entries
        return entries
    }

    /// Rank matches: exact English → English prefix → English contains → exact Zomi → Zomi prefix → Zomi contains.
    static func search(_ query: String, limit: Int = 60) -> [DictionaryEntry] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return [] }
        var scored: [(entry: DictionaryEntry, score: Int, index: Int)] = []
        let all = load()
        for (i, e) in all.enumerated() {
            let en = e.english.lowercased()
            let zo = e.zomi.lowercased()
            let score: Int
            if en == q { score = 0 }
            else if en.hasPrefix(q) { score = 1 }
            else if en.contains(q) { score = 2 }
            else if zo == q { score = 3 }
            else if zo.hasPrefix(q) { score = 4 }
            else if zo.contains(q) { score = 5 }
            else { continue }
            scored.append((e, score, i))
        }
        scored.sort { $0.score != $1.score ? $0.score < $1.score : $0.index < $1.index }
        return Array(scored.prefix(limit).map(\.entry))
    }

    /// True when the query matches an entry exactly (gates the AI fallback).
    static func hasExactMatch(_ query: String) -> Bool {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return true }
        return load().contains {
            $0.english.lowercased() == q || $0.zomi.lowercased() == q
        }
    }

    /// One real-time completion for the search bar.
    nonisolated struct Suggestion: Identifiable, Hashable {
        /// Full headword that completes the query.
        let text: String
        /// The other language's translation, shown beside the headword.
        let hint: String
        /// Language of the matched headword: "en" or "zo".
        let lang: String

        var id: String { "\(lang)|\(text)" }
    }

    /// Real-time completions for the search bar, ranked: exact English →
    /// exact Zomi → English prefix → Zomi prefix → English contains →
    /// Zomi contains. Headwords equal to the typed query are skipped so every
    /// suggestion advances the query toward a full word.
    static func suggest(_ query: String, limit: Int = 8) -> [Suggestion] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return [] }
        struct Scored {
            let suggestion: Suggestion
            let score: Int
            let index: Int
        }
        var best: [String: Scored] = [:]
        for (i, e) in load().enumerated() {
            let en = e.english.lowercased()
            let zo = e.zomi.lowercased()
            let enScore = en == q ? 0 : en.hasPrefix(q) ? 2 : en.contains(q) ? 4 : -1
            let zoScore = zo == q ? 1 : zo.hasPrefix(q) ? 3 : zo.contains(q) ? 5 : -1
            let candidates: [(Suggestion, Int)] = [
                (Suggestion(text: e.english, hint: e.zomi, lang: "en"), enScore),
                (Suggestion(text: e.zomi, hint: e.english, lang: "zo"), zoScore),
            ]
            for (candidate, score) in candidates where score >= 0 && candidate.text.lowercased() != q {
                let key = candidate.text.lowercased()
                if let prev = best[key], prev.score <= score { continue }
                best[key] = Scored(suggestion: candidate, score: score, index: i)
            }
        }
        return best.values
            .sorted { $0.score != $1.score ? $0.score < $1.score : $0.index < $1.index }
            .prefix(limit)
            .map(\.suggestion)
    }

    // MARK: Offline browsing (A–Z index)

    struct BrowseSection {
        let letter: String
        let entries: [DictionaryEntry]
    }

    nonisolated(unsafe) private static var browseCache: [BrowseSection]?

    /// All entries grouped by first letter (A–Z, then "#" for digits/symbols),
    /// each group sorted alphabetically. Computed once and cached.
    static func browseSections() -> [BrowseSection] {
        lock.lock()
        defer { lock.unlock() }
        if let browseCache { return browseCache }
        var buckets: [String: [DictionaryEntry]] = [:]
        for entry in load() {
            let first = entry.english.trimmingCharacters(in: .whitespaces).lowercased().first
            let letter: String
            if let first, first.isLetter, first.isASCII {
                letter = String(first).uppercased()
            } else {
                letter = "#"
            }
            buckets[letter, default: []].append(entry)
        }
        let sections = buckets.map { letter, entries -> BrowseSection in
            BrowseSection(
                letter: letter,
                entries: entries.sorted {
                    $0.english.lowercased() < $1.english.lowercased()
                }
            )
        }
        .sorted { a, b in
            if a.letter == "#" { return false }
            if b.letter == "#" { return true }
            return a.letter < b.letter
        }
        browseCache = sections
        return sections
    }

    /// Available browse letters, in index order.
    static func browseLetters() -> [String] {
        browseSections().map(\.letter)
    }

    /// Alphabetically sorted entries whose English headword starts with the letter.
    static func entries(forLetter letter: String) -> [DictionaryEntry] {
        browseSections().first { $0.letter == letter }?.entries ?? []
    }
}
