import Foundation
import SQLite3

/// Tells SQLite to copy bound Swift strings into its own storage.
private let sqliteTransient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

/// Local SQLite cache for glossary terms and scripture entries.
///
/// All data lives on-device in Application Support — the app remains fully
/// functional without an internet connection. Access is serialized through a
/// dedicated dispatch queue and the connection is opened in full-mutex mode.
nonisolated final class DatabaseService {
    static let shared = DatabaseService()

    private var db: OpaquePointer?
    private let queue = DispatchQueue(label: "app.zomi.translator.database")

    /// In-memory scripture cache, loaded once from SQLite at init.
    private(set) var scriptures: [Scripture] = []

    private init() {
        openDatabase()
        createTables()
        scriptures = loadScripturesLocked()
        if scriptures.isEmpty {
            replaceScripturesLocked(Scriptures.seed)
            scriptures = loadScripturesLocked()
        }
    }

    deinit {
        sqlite3_close(db)
    }

    // MARK: - Glossary

    func loadGlossaryTerms() -> [GlossaryTerm] {
        queue.sync { loadGlossaryTermsLocked() }
    }

    func glossaryTermCount() -> Int {
        queue.sync { scalarIntLocked("SELECT COUNT(*) FROM glossary_terms;") }
    }

    /// Atomically replaces every glossary row. Term lists are small (≤200),
    /// so one transaction keeps the table identical to the in-memory list.
    func replaceGlossaryTerms(_ terms: [GlossaryTerm]) {
        queue.sync {
            guard db != nil else { return }
            _ = sqlite3_exec(db, "BEGIN IMMEDIATE TRANSACTION;", nil, nil, nil)

            var stmt: OpaquePointer?
            if sqlite3_prepare_v2(db, "DELETE FROM glossary_terms;", -1, &stmt, nil) == SQLITE_OK {
                _ = sqlite3_step(stmt)
            }
            sqlite3_finalize(stmt)

            if sqlite3_prepare_v2(
                db,
                "INSERT INTO glossary_terms (id, term, meaning, created_at) VALUES (?, ?, ?, ?);",
                -1, &stmt, nil
            ) == SQLITE_OK {
                for term in terms {
                    sqlite3_reset(stmt)
                    bind(stmt, 1, term.id)
                    bind(stmt, 2, term.term)
                    bind(stmt, 3, term.meaning)
                    sqlite3_bind_double(stmt, 4, term.createdAt.timeIntervalSince1970)
                    _ = sqlite3_step(stmt)
                }
            }
            sqlite3_finalize(stmt)

            _ = sqlite3_exec(db, "COMMIT;", nil, nil, nil)
        }
    }

    private func loadGlossaryTermsLocked() -> [GlossaryTerm] {
        var results: [GlossaryTerm] = []
        guard db != nil else { return results }
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(
            db,
            "SELECT id, term, meaning, created_at FROM glossary_terms ORDER BY created_at DESC;",
            -1, &stmt, nil
        ) == SQLITE_OK else { return results }
        defer { sqlite3_finalize(stmt) }

        while sqlite3_step(stmt) == SQLITE_ROW {
            results.append(GlossaryTerm(
                id: columnString(stmt, 0),
                term: columnString(stmt, 1),
                meaning: columnString(stmt, 2),
                createdAt: Date(timeIntervalSince1970: sqlite3_column_double(stmt, 3))
            ))
        }
        return results
    }

    // MARK: - Scriptures

    func replaceScriptures(_ scriptures: [Scripture]) {
        queue.sync { replaceScripturesLocked(scriptures) }
    }

    private func replaceScripturesLocked(_ scriptures: [Scripture]) {
        guard db != nil else { return }
        _ = sqlite3_exec(db, "BEGIN IMMEDIATE TRANSACTION;", nil, nil, nil)

        var stmt: OpaquePointer?
        if sqlite3_prepare_v2(
            db,
            "INSERT OR REPLACE INTO scriptures (id, verse_zomi, verse_english, reference, category) VALUES (?, ?, ?, ?, ?);",
            -1, &stmt, nil
        ) == SQLITE_OK {
            for scripture in scriptures {
                sqlite3_reset(stmt)
                bind(stmt, 1, scripture.id)
                bind(stmt, 2, scripture.verseZomi)
                bind(stmt, 3, scripture.verseEnglish)
                bind(stmt, 4, scripture.reference)
                bind(stmt, 5, scripture.category)
                _ = sqlite3_step(stmt)
            }
        }
        sqlite3_finalize(stmt)

        _ = sqlite3_exec(db, "COMMIT;", nil, nil, nil)
    }

    private func loadScripturesLocked() -> [Scripture] {
        var results: [Scripture] = []
        guard db != nil else { return results }
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(
            db,
            "SELECT id, verse_zomi, verse_english, reference, category FROM scriptures ORDER BY CAST(id AS INTEGER);",
            -1, &stmt, nil
        ) == SQLITE_OK else { return results }
        defer { sqlite3_finalize(stmt) }

        while sqlite3_step(stmt) == SQLITE_ROW {
            results.append(Scripture(
                id: columnString(stmt, 0),
                verseZomi: columnString(stmt, 1),
                verseEnglish: columnString(stmt, 2),
                reference: columnString(stmt, 3),
                category: columnString(stmt, 4)
            ))
        }
        return results
    }

    // MARK: - Database setup

    private func openDatabase() {
        let fileManager = FileManager.default
        guard let directory = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
            return
        }
        try? fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
        let url = directory.appendingPathComponent("zomi_translator.sqlite")

        var handle: OpaquePointer?
        let flags = SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX
        guard sqlite3_open_v2(url.path, &handle, flags, nil) == SQLITE_OK else {
            sqlite3_close(handle)
            return
        }
        db = handle
    }

    private func createTables() {
        guard db != nil else { return }
        _ = sqlite3_exec(
            db,
            """
            CREATE TABLE IF NOT EXISTS glossary_terms (
                id TEXT PRIMARY KEY,
                term TEXT NOT NULL,
                meaning TEXT NOT NULL,
                created_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS scriptures (
                id TEXT PRIMARY KEY,
                verse_zomi TEXT NOT NULL,
                verse_english TEXT NOT NULL,
                reference TEXT NOT NULL,
                category TEXT NOT NULL
            );
            """,
            nil, nil, nil
        )
    }

    // MARK: - Statement helpers

    private func bind(_ stmt: OpaquePointer?, _ index: Int32, _ value: String) {
        sqlite3_bind_text(stmt, index, value, -1, sqliteTransient)
    }

    private func columnString(_ stmt: OpaquePointer?, _ index: Int32) -> String {
        guard let cString = sqlite3_column_text(stmt, index) else { return "" }
        return String(cString: cString)
    }

    private func scalarIntLocked(_ sql: String) -> Int {
        guard db != nil else { return 0 }
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK,
              sqlite3_step(stmt) == SQLITE_ROW else {
            sqlite3_finalize(stmt)
            return 0
        }
        defer { sqlite3_finalize(stmt) }
        return Int(sqlite3_column_int64(stmt, 0))
    }
}
