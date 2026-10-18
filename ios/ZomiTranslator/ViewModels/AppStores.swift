import Foundation
import SwiftUI

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
