import Foundation
import SwiftUI

/// Persists user glossary terms in the local SQLite database (offline-first).
/// Mirrors expo GlossaryContext; migrates the legacy UserDefaults store once.
@Observable
final class GlossaryStore {
    private static let legacyKey = "zomi_user_glossary_v1"
    private static let maxTerms = 200

    private(set) var terms: [GlossaryTerm] = []

    init() {
        let database = DatabaseService.shared
        if database.glossaryTermCount() == 0,
           let data = UserDefaults.standard.data(forKey: Self.legacyKey),
           let decoded = try? JSONDecoder().decode([GlossaryTerm].self, from: data),
           !decoded.isEmpty {
            // One-time migration from the pre-SQLite UserDefaults store.
            terms = Array(decoded.prefix(Self.maxTerms))
            database.replaceGlossaryTerms(terms)
            UserDefaults.standard.removeObject(forKey: Self.legacyKey)
        } else {
            terms = database.loadGlossaryTerms()
        }
    }

    func add(term: String, meaning: String) {
        let t = term.trimmingCharacters(in: .whitespacesAndNewlines)
        let m = meaning.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty, !m.isEmpty else { return }
        terms.removeAll { $0.term.lowercased() == t.lowercased() }
        terms.insert(GlossaryTerm(term: t, meaning: m), at: 0)
        if terms.count > Self.maxTerms { terms = Array(terms.prefix(Self.maxTerms)) }
        persist()
    }

    func update(id: String, term: String, meaning: String) {
        guard let index = terms.firstIndex(where: { $0.id == id }) else { return }
        terms[index].term = term.trimmingCharacters(in: .whitespacesAndNewlines)
        terms[index].meaning = meaning.trimmingCharacters(in: .whitespacesAndNewlines)
        persist()
    }

    func remove(id: String) {
        terms.removeAll { $0.id == id }
        persist()
    }

    func clear() {
        terms = []
        persist()
    }

    /// Plain dictionary sent to the streaming backend as extra glossary context.
    func asRecord() -> [String: String] {
        var out: [String: String] = [:]
        for t in terms { out[t.term] = t.meaning }
        return out
    }

    private func persist() {
        DatabaseService.shared.replaceGlossaryTerms(terms)
    }
}

/// Local translation cache + history. Mirrors expo TranslationCacheContext,
/// and also powers the History tab (local-first).
@Observable
final class TranslationStore {
    private static let key = "zomi_translation_cache_v1"
    private static let maxEntries = 200

    private(set) var entries: [SavedTranslation] = []

    init() {
        load()
    }

    func lookup(text: String, target: String) -> SavedTranslation? {
        let k = SavedTranslation.makeCacheKey(text: text, target: target)
        return entries.first { $0.cacheKey == k }
    }

    func save(_ translation: SavedTranslation) {
        let k = translation.cacheKey
        entries.removeAll { $0.cacheKey == k }
        entries.insert(translation, at: 0)
        if entries.count > Self.maxEntries { entries = Array(entries.prefix(Self.maxEntries)) }
        persist()
    }

    func toggleFavorite(id: String) {
        guard let index = entries.firstIndex(where: { $0.id == id }) else { return }
        entries[index].isFavorite.toggle()
        persist()
    }

    func remove(id: String) {
        entries.removeAll { $0.id == id }
        persist()
    }

    func clear() {
        entries = []
        persist()
    }

    private func load() {
        guard let data = UserDefaults.standard.data(forKey: Self.key),
              let decoded = try? JSONDecoder().decode([SavedTranslation].self, from: data) else { return }
        entries = Array(decoded.prefix(Self.maxEntries))
    }

    private func persist() {
        if let data = try? JSONEncoder().encode(entries) {
            UserDefaults.standard.set(data, forKey: Self.key)
        }
    }
}
