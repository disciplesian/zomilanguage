package com.rork.zomilanguageportal.data

import android.content.Context
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File

/** One row of the bundled English → Zomi dictionary (10,620 human-verified entries). */
data class DictionaryEntry(
    val english: String,
    /** Raw part of speech exactly as recorded in the dataset (e.g. "pas. part."). */
    val pos: String,
    val zomi: String,
    val category: String,
)

@Serializable
private data class DictionaryPayload(
    val version: Int = 0,
    val count: Int = 0,
    val entries: List<List<String>> = emptyList(),
)

@Serializable
private data class LatestDictionaryResponse(
    val available: Boolean = false,
    val version: Int = 0,
    val payload: String = "",
)

@Serializable
private data class CachedDataset(
    val version: Int = 0,
    val entries: List<List<String>> = emptyList(),
)

/** One A–Z browse group: a letter and its alphabetically sorted entries. */
data class BrowseSection(
    val letter: String,
    val entries: List<DictionaryEntry>,
)

/** Loads and searches the bundled dictionary asset (dictionary.json), and
 *  applies newer datasets published on the server over the air. */
object DictionaryRepository {

    @Volatile
    private var entries: List<DictionaryEntry>? = null

    @Volatile
    private var browseSections: List<BrowseSection>? = null

    /** Version of the dataset in use (the bundled asset is version 1). */
    @Volatile
    private var activeVersion: Int = 1

    private val json = Json { ignoreUnknownKeys = true }

    fun activeVersion(): Int = activeVersion

    /** Replaces the search index with a newer remote dataset; returns true
     *  when the dataset was applied. */
    fun applyRemote(newEntries: List<DictionaryEntry>, version: Int): Boolean {
        if (version <= activeVersion || newEntries.isEmpty()) return false
        synchronized(this) {
            if (version <= activeVersion || newEntries.isEmpty()) return false
            activeVersion = version
            entries = newEntries
            browseSections = null
        }
        return true
    }

    private fun toEntries(rows: List<List<String>>): List<DictionaryEntry> =
        rows.filter { it.size >= 4 }.map { DictionaryEntry(it[0], it[1], it[2], it[3]) }

    private fun cacheFile(context: Context): File =
        File(context.applicationContext.filesDir, "dictionary-remote.json")

    /** Over-the-air dataset update: applies the on-disk cache from a previous
     *  check first (works offline), then asks /api/dictionary/latest for a
     *  newer published version and persists it for the next launch. */
    suspend fun refreshFromServer(context: Context) {
        val appContext = context.applicationContext
        withContext(Dispatchers.IO) {
            load(appContext)

            // 1. Cached dataset from a previous check.
            runCatching {
                val cached = json.decodeFromString<CachedDataset>(cacheFile(appContext).readText())
                applyRemote(toEntries(cached.entries), cached.version)
            }

            // 2. Fresh server check.
            runCatching {
                val response = PortalHttp.client
                    .get("${AppConfig.API_BASE_URL}/api/dictionary/latest")
                val latest = PortalHttp.json
                    .decodeFromString<LatestDictionaryResponse>(response.bodyAsText())
                if (latest.available && latest.version > activeVersion) {
                    val parsed = json.decodeFromString<DictionaryPayload>(latest.payload)
                    if (applyRemote(toEntries(parsed.entries), latest.version)) {
                        cacheFile(appContext).writeText(
                            json.encodeToString(CachedDataset(latest.version, parsed.entries))
                        )
                    }
                }
            }
        }
    }

    fun load(context: Context): List<DictionaryEntry> {
        entries?.let { return it }
        synchronized(this) {
            entries?.let { return it }
            val loaded = runCatching {
                val text = context.applicationContext.assets
                    .open("dictionary.json")
                    .bufferedReader()
                    .use { it.readText() }
                toEntries(json.decodeFromString<DictionaryPayload>(text).entries)
            }.getOrDefault(emptyList())
            entries = loaded
            return loaded
        }
    }

    /**
     * Rank matches: exact English → English prefix → English contains →
     * exact Zomi → Zomi prefix → Zomi contains.
     */
    fun search(query: String, limit: Int = 60): List<DictionaryEntry> {
        val all = entries ?: return emptyList()
        val q = query.trim().lowercase()
        if (q.isEmpty()) return emptyList()

        data class Scored(val entry: DictionaryEntry, val score: Int, val index: Int)

        val scored = ArrayList<Scored>(128)
        for ((i, e) in all.withIndex()) {
            val en = e.english.lowercase()
            val zo = e.zomi.lowercase()
            val score = when {
                en == q -> 0
                en.startsWith(q) -> 1
                en.contains(q) -> 2
                zo == q -> 3
                zo.startsWith(q) -> 4
                zo.contains(q) -> 5
                else -> continue
            }
            scored.add(Scored(e, score, i))
        }
        scored.sortWith(compareBy({ it.score }, { it.index }))
        return scored.take(limit).map { it.entry }
    }

    /** True when the query matches an entry exactly (gates the AI fallback). */
    fun hasExactMatch(query: String): Boolean {
        val all = entries ?: return true
        val q = query.trim().lowercase()
        if (q.isEmpty()) return true
        return all.any { it.english.lowercase() == q || it.zomi.lowercase() == q }
    }

    // MARK: Offline browsing (A–Z index)

    /** All entries grouped by first letter (A–Z, then "#"), sorted alphabetically. */
    private fun sections(): List<BrowseSection> {
        browseSections?.let { return it }
        synchronized(this) {
            browseSections?.let { return it }
            val all = entries ?: return emptyList()
            val buckets = LinkedHashMap<String, MutableList<DictionaryEntry>>()
            for (e in all) {
                val first = e.english.trim().lowercase().firstOrNull()
                val letter = if (first != null && first in 'a'..'z') first.uppercaseChar().toString() else "#"
                buckets.getOrPut(letter) { mutableListOf() }.add(e)
            }
            val computed = buckets.map { (letter, list) ->
                BrowseSection(letter, list.sortedBy { it.english.lowercase() })
            }.sortedBy { if (it.letter == "#") "~" else it.letter }
            browseSections = computed
            return computed
        }
    }

    /** Available browse letters, in index order. */
    fun browseLetters(): List<String> = sections().map { it.letter }

    /** Alphabetically sorted entries whose English headword starts with the letter. */
    fun entriesForLetter(letter: String): List<DictionaryEntry> =
        sections().firstOrNull { it.letter == letter }?.entries ?: emptyList()
}
