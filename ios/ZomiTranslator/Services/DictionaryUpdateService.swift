import Foundation

/// Fetches the latest published dictionary dataset from the portal backend at
/// startup and refreshes the local search index, so dictionary updates reach
/// users without an app store release. The newest payload is cached on disk
/// and re-applied offline on subsequent launches.
nonisolated final class DictionaryUpdateService {

    private struct LatestResponse: Decodable {
        let available: Bool
        let version: Int?
        let payload: String?
    }

    private struct Payload: Decodable {
        let entries: [[String]]
    }

    private struct CachedDataset: Codable {
        let version: Int
        let entries: [[String]]
    }

    static let shared = DictionaryUpdateService()

    private var baseURL: String {
        let base = Config.EXPO_PUBLIC_RORK_API_BASE_URL
        if base.isEmpty { return "https://api.rork.app" }
        return base.hasSuffix("/") ? String(base.dropLast()) : base
    }

    private var cacheURL: URL {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("dictionary-remote.json")
    }

    /// Applies the cached remote dataset (if newer than the bundle), then
    /// checks the server and applies + caches a newer version when published.
    func refreshIfNeeded() async {
        applyCachedDataset()
        await fetchAndApplyLatest()
    }

    private func applyCachedDataset() {
        guard let data = try? Data(contentsOf: cacheURL),
              let cached = try? JSONDecoder().decode(CachedDataset.self, from: data)
        else { return }
        DictionaryData.applyRemote(Self.entries(from: cached.entries), version: cached.version)
    }

    private func fetchAndApplyLatest() async {
        guard let url = URL(string: "\(baseURL)/api/dictionary/latest") else { return }
        guard let (data, response) = try? await URLSession.shared.data(from: url),
              (response as? HTTPURLResponse)?.statusCode == 200
        else { return }
        guard let latest = try? JSONDecoder().decode(LatestResponse.self, from: data),
              latest.available,
              let version = latest.version,
              let payloadString = latest.payload,
              let payload = payloadString.data(using: .utf8),
              let parsed = try? JSONDecoder().decode(Payload.self, from: payload)
        else { return }
        let entries = Self.entries(from: parsed.entries)
        guard DictionaryData.applyRemote(entries, version: version) else { return }
        if let encoded = try? JSONEncoder().encode(CachedDataset(version: version, entries: parsed.entries)) {
            try? encoded.write(to: cacheURL, options: Data.WritingOptions.atomic)
        }
    }

    private static func entries(from rows: [[String]]) -> [DictionaryEntry] {
        rows.compactMap { row in
            guard row.count >= 4 else { return nil }
            return DictionaryEntry(english: row[0], pos: row[1], zomi: row[2], category: row[3])
        }
    }
}
