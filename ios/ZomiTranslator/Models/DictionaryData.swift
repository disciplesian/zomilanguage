import Foundation

/// One row of the bundled English → Zomi dictionary (33,444 entries; the original
/// 10,620 are human-verified, expanded from the community dictionary archive).
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
    /// Recursive: `browseSections()` holds the lock while calling `load()`,
    /// which locks again — a plain NSLock would deadlock the main thread there.
    private static let lock = NSRecursiveLock()

    /// Version of the dataset currently in use (the bundled asset is version 2).
    nonisolated(unsafe) private static var activeVersionValue: Int = 2

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
        indexCache = nil
        return true
    }

    // MARK: Fast search index (built once, off the main thread at launch)

    /// Pre-normalized keys so every keystroke is a cheap scan with no string
    /// allocation, plus exact-match maps for instant word translation.
    struct SearchIndex {
        let entries: [DictionaryEntry]
        /// Folded (lowercased, tone-mark-insensitive) English headwords.
        let english: [String]
        /// Folded full Zomi renderings.
        let zomi: [String]
        /// Folded English headword → entry indices (dataset order).
        let exactEnglish: [String: [Int]]
        /// Folded single Zomi rendering (each comma-separated part) → entry indices,
        /// ranked so entries listing the word first come first.
        let exactZomi: [String: [Int]]
    }

    nonisolated(unsafe) private static var indexCache: SearchIndex?

    /// Lowercases and strips tone marks/diacritics so "Pasiân" matches "pasian".
    static func fold(_ s: String) -> String {
        s.folding(options: [.caseInsensitive, .diacriticInsensitive, .widthInsensitive], locale: nil)
            .replacingOccurrences(of: "\u{2019}", with: "'")
            .replacingOccurrences(of: "\u{2018}", with: "'")
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Individual Zomi renderings of an entry ("khial, dik lo" → ["khial", "dik lo"]).
    static func zomiParts(_ zomi: String) -> [String] {
        zomi.replacingOccurrences(of: #"\([^)]*\)"#, with: " ", options: .regularExpression)
            .split(whereSeparator: { $0 == "," || $0 == ";" || $0 == "/" })
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines).trimmingCharacters(in: CharacterSet(charactersIn: ".!?")) }
            .filter { !$0.isEmpty && $0.count <= 40 && $0.split(separator: " ").count <= 5 }
    }

    /// Returns the search index, building it on first use.
    static func index() -> SearchIndex {
        lock.lock()
        defer { lock.unlock() }
        if let indexCache { return indexCache }
        let all = load()
        var english: [String] = []
        var zomi: [String] = []
        english.reserveCapacity(all.count)
        zomi.reserveCapacity(all.count)
        var exactEnglish: [String: [Int]] = [:]
        var zomiRanked: [String: [(position: Int, index: Int)]] = [:]
        for (i, e) in all.enumerated() {
            let en = fold(e.english)
            english.append(en)
            zomi.append(fold(e.zomi))
            exactEnglish[en, default: []].append(i)
            // Only real English headwords can answer a Zomi → English lookup.
            guard e.english.range(of: #"^[A-Za-z][A-Za-z' -]*$"#, options: .regularExpression) != nil else { continue }
            for (position, part) in zomiParts(e.zomi).enumerated() {
                zomiRanked[fold(part), default: []].append((position, i))
            }
        }
        // Popularity proxy: common words have many derived headwords
        // ("water", "waterfall", …), so they outrank rare synonyms.
        let sortedEnglish = english.sorted()
        func lowerBound(_ key: String) -> Int {
            var lo = 0, hi = sortedEnglish.count
            while lo < hi {
                let mid = (lo + hi) / 2
                if sortedEnglish[mid] < key { lo = mid + 1 } else { hi = mid }
            }
            return lo
        }
        var popularityCache: [Int: Int] = [:]
        func popularity(_ i: Int) -> Int {
            if let cached = popularityCache[i] { return cached }
            let w = english[i]
            let value = w.count < 3
                ? lowerBound(w + "\u{1}") - lowerBound(w)
                : lowerBound(w + "\u{10FFFF}") - lowerBound(w)
            popularityCache[i] = value
            return value
        }
        var exactZomi: [String: [Int]] = [:]
        exactZomi.reserveCapacity(zomiRanked.count)
        for (key, list) in zomiRanked {
            exactZomi[key] = list
                .sorted {
                    if $0.position != $1.position { return $0.position < $1.position }
                    let pa = popularity($0.index), pb = popularity($1.index)
                    if pa != pb { return pa > pb }
                    return $0.index < $1.index
                }
                .map(\.index)
        }
        let built = SearchIndex(entries: all, english: english, zomi: zomi, exactEnglish: exactEnglish, exactZomi: exactZomi)
        indexCache = built
        return built
    }

    /// Builds the index in the background so the first keystroke never waits.
    static func warmUp() {
        Task.detached(priority: .userInitiated) {
            _ = DictionaryData.index()
        }
    }

    /// Instant on-device translation of a dictionary word or short phrase.
    /// Returns nil for sentences or words not in the verified dictionary.
    static func instantTranslation(_ text: String, zomiToEnglish: Bool) -> (text: String, alternatives: [String])? {
        var q = fold(text)
        q = q.trimmingCharacters(in: CharacterSet(charactersIn: "\"'“”‘’.!?… "))
        q = q.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
        guard !q.isEmpty, q.count <= 80, q.split(separator: " ").count <= 5,
              q.rangeOfCharacter(from: CharacterSet(charactersIn: ".;:!?")) == nil else { return nil }
        let idx = index()
        var candidates: [String] = []
        if zomiToEnglish {
            guard let hits = idx.exactZomi[q], !hits.isEmpty else { return nil }
            candidates = hits.map { idx.entries[$0].english }
        } else {
            guard let hits = idx.exactEnglish[q], !hits.isEmpty else { return nil }
            for i in hits {
                let parts = idx.entries[i].zomi
                    .replacingOccurrences(of: #"\([^)]*\)"#, with: " ", options: .regularExpression)
                    .split(whereSeparator: { $0 == "," || $0 == ";" })
                    .map { $0.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression) }
                    .filter { !$0.isEmpty && $0.count <= 40 }
                candidates.append(contentsOf: parts.isEmpty ? [idx.entries[i].zomi] : parts)
            }
        }
        var seen = Set<String>()
        let unique = candidates.filter { seen.insert($0.lowercased()).inserted }
        guard let first = unique.first else { return nil }
        return (first, Array(unique.dropFirst().prefix(2)))
    }

    /// Edit distance ≤ 1 (one typo: insert, delete, or substitute).
    private static func withinOneEdit(_ a: [Character], _ b: [Character]) -> Bool {
        if abs(a.count - b.count) > 1 { return false }
        var i = 0, j = 0, edits = 0
        while i < a.count && j < b.count {
            if a[i] == b[j] { i += 1; j += 1; continue }
            edits += 1
            if edits > 1 { return false }
            if a.count > b.count { i += 1 } else if a.count < b.count { j += 1 } else { i += 1; j += 1 }
        }
        return edits + (a.count - i) + (b.count - j) <= 1
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

    /// Rank matches: exact English → exact Zomi word → English prefix → Zomi
    /// prefix → English contains → Zomi contains, then one-typo matches when
    /// nothing else is found. Tone marks and case are ignored.
    static func search(_ query: String, limit: Int = 60) -> [DictionaryEntry] {
        let q = fold(query)
        guard !q.isEmpty else { return [] }
        let idx = index()
        var scored: [(score: Int, index: Int)] = []
        var used = Set<Int>()
        for i in idx.exactEnglish[q] ?? [] where used.insert(i).inserted { scored.append((0, i)) }
        for i in idx.exactZomi[q] ?? [] where used.insert(i).inserted { scored.append((1, i)) }
        let short = q.count < 2
        for i in 0..<idx.english.count where !used.contains(i) {
            let en = idx.english[i]
            let zo = idx.zomi[i]
            let score: Int
            if en.hasPrefix(q) { score = 2 }
            else if zo.hasPrefix(q) { score = 3 }
            else if short { continue }
            else if en.contains(q) { score = 4 }
            else if zo.contains(q) { score = 5 }
            else { continue }
            scored.append((score, i))
        }
        if scored.isEmpty && q.count >= 4 {
            let qc = Array(q)
            for i in 0..<idx.english.count {
                let en = idx.english[i]
                guard en.first == q.first, abs(en.count - q.count) <= 1 else { continue }
                if withinOneEdit(Array(en), qc) { scored.append((6, i)) }
                if scored.count >= limit { break }
            }
        }
        scored.sort { $0.score != $1.score ? $0.score < $1.score : (idx.english[$0.index].count, $0.index) < (idx.english[$1.index].count, $1.index) }
        return scored.prefix(limit).map { idx.entries[$0.index] }
    }

    /// True when the query matches an entry exactly (gates the AI fallback).
    static func hasExactMatch(_ query: String) -> Bool {
        let q = fold(query)
        guard !q.isEmpty else { return true }
        let idx = index()
        return idx.exactEnglish[q] != nil || idx.exactZomi[q] != nil || idx.zomi.contains(q)
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
        let q = fold(query)
        guard !q.isEmpty else { return [] }
        struct Scored {
            let suggestion: Suggestion
            let score: Int
            let index: Int
        }
        var best: [String: Scored] = [:]
        let idx = index()
        for i in 0..<idx.english.count {
            let en = idx.english[i]
            let zo = idx.zomi[i]
            let enScore = en == q ? 0 : en.hasPrefix(q) ? 2 : (q.count >= 2 && en.contains(q)) ? 4 : -1
            let zoScore = zo == q ? 1 : zo.hasPrefix(q) ? 3 : (q.count >= 2 && zo.contains(q)) ? 5 : -1
            if enScore < 0 && zoScore < 0 { continue }
            let e = idx.entries[i]
            let candidates: [(Suggestion, Int)] = [
                (Suggestion(text: e.english, hint: e.zomi, lang: "en"), enScore),
                (Suggestion(text: e.zomi, hint: e.english, lang: "zo"), zoScore),
            ]
            for (candidate, score) in candidates where score >= 0 && fold(candidate.text) != q {
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

    // MARK: Entry detail data

    /// Short plain-language description of each grammatical category.
    static let categoryDescriptions: [String: String] = [
        "noun": "Names a person, place, thing, or idea.",
        "verb": "Describes an action or a state of being.",
        "adjective": "Describes or modifies a noun.",
        "adverb": "Modifies a verb, adjective, or another adverb.",
        "preposition": "Shows the relationship between a noun and another word.",
        "pronoun": "Stands in place of a noun.",
        "conjunction": "Joins words, phrases, or clauses together.",
        "interjection": "Expresses a sudden emotion or reaction.",
        "prefix": "Attaches to the start of a word to change its meaning.",
        "particle": "A small function word that carries grammatical meaning.",
        "article": "Introduces a noun (a, an, the).",
        "other": "A word that does not fit the standard grammatical categories.",
    ]

    /// Shared leading characters (max 8) of two lowercased strings, or 0 when
    /// fewer than two characters match — a relation needs a real prefix.
    private static func sharedPrefixLength(_ a: String, _ b: String) -> Int {
        let charsA = Array(a.lowercased())
        let charsB = Array(b.lowercased())
        var n = 0
        let max = min(charsA.count, charsB.count, 8)
        while n < max && charsA[n] == charsB[n] { n += 1 }
        return n >= 2 ? n : 0
    }

    /// Entries related to the given one, ranked by shared English prefix,
    /// shared Zomi prefix, and same grammatical category. Computed locally
    /// over the verified dataset, so it works fully offline.
    static func relatedEntries(_ entry: DictionaryEntry, limit: Int = 6) -> [DictionaryEntry] {
        let en = entry.english.lowercased()
        let zo = entry.zomi.lowercased()
        var seen: Set<String> = [en]
        var scored: [(entry: DictionaryEntry, score: Int)] = []
        for e in load() {
            let eEn = e.english.lowercased()
            guard !seen.contains(eEn) else { continue }
            let score =
                sharedPrefixLength(en, eEn) * 3
                + sharedPrefixLength(zo, e.zomi.lowercased()) * 2
                + (e.category == entry.category ? 1 : 0)
            guard score > 1 else { continue }
            seen.insert(eEn)
            scored.append((e, score))
        }
        return scored
            .sorted { $0.score != $1.score ? $0.score > $1.score : $0.entry.english < $1.entry.english }
            .prefix(limit)
            .map(\.entry)
    }
}
