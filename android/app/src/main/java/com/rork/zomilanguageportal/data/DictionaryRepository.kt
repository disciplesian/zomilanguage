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

/** One row of the bundled English → Zomi dictionary (33,444 entries; the original
 *  10,620 are human-verified, expanded from the community dictionary archive). */
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

/** One real-time completion for the search bar. */
data class Suggestion(
    /** Full headword that completes the query. */
    val text: String,
    /** The other language's translation, shown beside the headword. */
    val hint: String,
    /** Language of the matched headword: "en" or "zo". */
    val lang: String,
)

/** Loads and searches the bundled dictionary asset (dictionary.json), and
 *  applies newer datasets published on the server over the air. */
object DictionaryRepository {

    @Volatile
    private var entries: List<DictionaryEntry>? = null

    @Volatile
    private var browseSections: List<BrowseSection>? = null

    /** Version of the dataset in use (the bundled asset is version 2). */
    @Volatile
    private var activeVersion: Int = 2

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

    /**
     * Real-time completions for the search bar, ranked: exact English →
     * exact Zomi → English prefix → Zomi prefix → English contains →
     * Zomi contains. Headwords equal to the typed query are skipped so every
     * suggestion advances the query toward a full word.
     */
    fun suggest(query: String, limit: Int = 8): List<Suggestion> {
        val all = entries ?: return emptyList()
        val q = query.trim().lowercase()
        if (q.isEmpty()) return emptyList()

        data class Scored(val suggestion: Suggestion, val score: Int, val index: Int)

        val best = HashMap<String, Scored>()
        for ((i, e) in all.withIndex()) {
            val en = e.english.lowercase()
            val zo = e.zomi.lowercase()
            val enScore = when {
                en == q -> 0
                en.startsWith(q) -> 2
                en.contains(q) -> 4
                else -> -1
            }
            val zoScore = when {
                zo == q -> 1
                zo.startsWith(q) -> 3
                zo.contains(q) -> 5
                else -> -1
            }
            listOf(
                Suggestion(e.english, e.zomi, "en") to enScore,
                Suggestion(e.zomi, e.english, "zo") to zoScore,
            ).forEach { (candidate, score) ->
                if (score < 0 || candidate.text.lowercase() == q) return@forEach
                val key = candidate.text.lowercase()
                val prev = best[key]
                if (prev == null || prev.score > score) {
                    best[key] = Scored(candidate, score, i)
                }
            }
        }
        return best.values
            .sortedWith(compareBy({ it.score }, { it.index }))
            .take(limit)
            .map { it.suggestion }
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

    /** Short plain-language description of each grammatical category. */
    val categoryDescriptions: Map<String, String> = mapOf(
        "noun" to "Names a person, place, thing, or idea.",
        "verb" to "Describes an action or a state of being.",
        "adjective" to "Describes or modifies a noun.",
        "adverb" to "Modifies a verb, adjective, or another adverb.",
        "preposition" to "Shows the relationship between a noun and another word.",
        "pronoun" to "Stands in place of a noun.",
        "conjunction" to "Joins words, phrases, or clauses together.",
        "interjection" to "Expresses a sudden emotion or reaction.",
        "prefix" to "Attaches to the start of a word to change its meaning.",
        "particle" to "A small function word that carries grammatical meaning.",
        "article" to "Introduces a noun (a, an, the).",
        "other" to "A word that does not fit the standard grammatical categories.",
    )

    /** Shared leading characters (max 8) of two lowercased strings, or 0 when
     *  fewer than two characters match — a relation needs a real prefix. */
    private fun sharedPrefixLength(a: String, b: String): Int {
        var n = 0
        val max = minOf(a.length, b.length, 8)
        while (n < max && a[n].equals(b[n], ignoreCase = true)) n++
        return if (n >= 2) n else 0
    }

    /**
     * Entries related to the given one, ranked by shared English prefix,
     * shared Zomi prefix, and same grammatical category. Computed locally
     * over the verified dataset, so it works fully offline.
     */
    fun relatedEntries(entry: DictionaryEntry, limit: Int = 6): List<DictionaryEntry> {
        val all = entries ?: return emptyList()
        val en = entry.english.lowercase()
        val zo = entry.zomi.lowercase()
        val seen = HashSet<String>(listOf(en))
        data class Scored(val entry: DictionaryEntry, val score: Int)
        val scored = ArrayList<Scored>()
        for (e in all) {
            val eEn = e.english.lowercase()
            if (seen.contains(eEn)) continue
            val score =
                sharedPrefixLength(en, eEn) * 3 +
                    sharedPrefixLength(zo, e.zomi.lowercase()) * 2 +
                    if (e.category == entry.category) 1 else 0
            if (score <= 1) continue
            seen.add(eEn)
            scored.add(Scored(e, score))
        }
        return scored
            .sortedWith(compareByDescending<Scored> { it.score }.thenBy { it.entry.english })
            .take(limit)
            .map { it.entry }
    }
}
