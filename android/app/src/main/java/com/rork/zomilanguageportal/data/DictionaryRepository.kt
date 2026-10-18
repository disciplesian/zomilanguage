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
import java.text.Normalizer

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
            index = null
        }
        return true
    }

    // MARK: Fast search index

    /** Pre-normalized keys so each keystroke is a cheap scan with no allocation,
     *  plus exact-match maps for instant word translation. */
    private class SearchIndex(
        val entries: List<DictionaryEntry>,
        val english: Array<String>,
        val zomi: Array<String>,
        val exactEnglish: Map<String, IntArray>,
        val exactZomi: Map<String, IntArray>,
    )

    @Volatile
    private var index: SearchIndex? = null

    private val markRegex = Regex("\\p{M}+")
    private val parenRegex = Regex("\\([^)]*\\)")
    private val headwordRegex = Regex("^[A-Za-z][A-Za-z' -]*$")
    private val spaceRegex = Regex("\\s+")

    /** Lowercases and strips tone marks so "Pasiân" matches "pasian". */
    fun fold(s: String): String =
        markRegex.replace(Normalizer.normalize(s.trim().lowercase(), Normalizer.Form.NFD), "")
            .replace('\u2019', '\'').replace('\u2018', '\'')

    /** Individual Zomi renderings of an entry ("khial, dik lo" → ["khial", "dik lo"]). */
    fun zomiParts(zomi: String): List<String> =
        parenRegex.replace(zomi, " ")
            .split(',', ';', '/')
            .map { it.trim().trimEnd('.', '!', '?') }
            .filter { it.isNotEmpty() && it.length <= 40 && it.split(' ').size <= 5 }

    private fun buildIndex(): SearchIndex? {
        index?.let { return it }
        synchronized(this) {
            index?.let { return it }
            val all = entries ?: return null
            val english = Array(all.size) { fold(all[it].english) }
            val zomi = Array(all.size) { fold(all[it].zomi) }
            val exactEnglish = HashMap<String, MutableList<Int>>()
            val zomiRanked = HashMap<String, MutableList<Pair<Int, Int>>>()
            all.forEachIndexed { i, e ->
                exactEnglish.getOrPut(english[i]) { mutableListOf() }.add(i)
                if (!headwordRegex.matches(e.english.trim())) return@forEachIndexed
                zomiParts(e.zomi).forEachIndexed { position, part ->
                    zomiRanked.getOrPut(fold(part)) { mutableListOf() }.add(position to i)
                }
            }
            val built = SearchIndex(
                entries = all,
                english = english,
                zomi = zomi,
                exactEnglish = exactEnglish.mapValues { it.value.toIntArray() },
                exactZomi = run {
                    // Popularity proxy: common words have many derived headwords
                    // ("water", "waterfall", …), so they outrank rare synonyms.
                    val sorted = english.sortedArray()
                    fun lowerBound(key: String): Int {
                        var lo = 0
                        var hi = sorted.size
                        while (lo < hi) {
                            val mid = (lo + hi) ushr 1
                            if (sorted[mid] < key) lo = mid + 1 else hi = mid
                        }
                        return lo
                    }
                    val cache = HashMap<Int, Int>()
                    fun popularity(i: Int): Int = cache.getOrPut(i) {
                        val w = english[i]
                        if (w.length < 3) lowerBound(w + "\u0001") - lowerBound(w)
                        else lowerBound(w + "\uFFFF") - lowerBound(w)
                    }
                    zomiRanked.mapValues { (_, list) ->
                        list.sortedWith(
                            compareBy<Pair<Int, Int>>({ it.first }, { -popularity(it.second) }, { it.second })
                        ).map { it.second }.toIntArray()
                    }
                },
            )
            index = built
            return built
        }
    }

    /** Builds the index in the background so the first keystroke is instant. */
    fun warmUp(context: Context) {
        load(context)
        buildIndex()
    }

    /** Instant on-device translation of a dictionary word or short phrase, or
     *  null for sentences and words not in the verified dictionary. */
    fun instantTranslation(text: String, zomiToEnglish: Boolean): Pair<String, List<String>>? {
        val idx = buildIndex() ?: return null
        val q = spaceRegex.replace(fold(text).trim('"', '\'', '“', '”', '‘', '’', '.', '!', '?', '…', ' '), " ")
        if (q.isEmpty() || q.length > 80 || q.split(' ').size > 5 || q.any { it in ".;:!?" }) return null
        val candidates = ArrayList<String>()
        if (zomiToEnglish) {
            val hits = idx.exactZomi[q] ?: return null
            hits.forEach { candidates.add(idx.entries[it].english) }
        } else {
            val hits = idx.exactEnglish[q] ?: return null
            hits.forEach { i ->
                val parts = parenRegex.replace(idx.entries[i].zomi, " ").split(',', ';')
                    .map { spaceRegex.replace(it.trim(), " ") }
                    .filter { it.isNotEmpty() && it.length <= 40 }
                candidates.addAll(parts.ifEmpty { listOf(idx.entries[i].zomi) })
            }
        }
        val unique = candidates.distinctBy { it.lowercase() }
        val first = unique.firstOrNull() ?: return null
        return first to unique.drop(1).take(2)
    }

    private fun withinOneEdit(a: String, b: String): Boolean {
        if (kotlin.math.abs(a.length - b.length) > 1) return false
        var i = 0
        var j = 0
        var edits = 0
        while (i < a.length && j < b.length) {
            if (a[i] == b[j]) { i++; j++; continue }
            edits++
            if (edits > 1) return false
            when {
                a.length > b.length -> i++
                a.length < b.length -> j++
                else -> { i++; j++ }
            }
        }
        return edits + (a.length - i) + (b.length - j) <= 1
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
        val idx = buildIndex() ?: return emptyList()
        val q = fold(query)
        if (q.isEmpty()) return emptyList()

        data class Scored(val score: Int, val index: Int)

        val scored = ArrayList<Scored>(128)
        val used = HashSet<Int>()
        idx.exactEnglish[q]?.forEach { if (used.add(it)) scored.add(Scored(0, it)) }
        idx.exactZomi[q]?.forEach { if (used.add(it)) scored.add(Scored(1, it)) }
        val short = q.length < 2
        for (i in idx.english.indices) {
            if (i in used) continue
            val en = idx.english[i]
            val zo = idx.zomi[i]
            val score = when {
                en.startsWith(q) -> 2
                zo.startsWith(q) -> 3
                short -> continue
                en.contains(q) -> 4
                zo.contains(q) -> 5
                else -> continue
            }
            scored.add(Scored(score, i))
        }
        if (scored.isEmpty() && q.length >= 4) {
            for (i in idx.english.indices) {
                val en = idx.english[i]
                if (en.isEmpty() || en[0] != q[0]) continue
                if (withinOneEdit(en, q)) scored.add(Scored(6, i))
                if (scored.size >= limit) break
            }
        }
        scored.sortWith(compareBy({ it.score }, { idx.english[it.index].length }, { it.index }))
        return scored.take(limit).map { idx.entries[it.index] }
    }

    /** True when the query matches an entry exactly (gates the AI fallback). */
    fun hasExactMatch(query: String): Boolean {
        val idx = buildIndex() ?: return true
        val q = fold(query)
        if (q.isEmpty()) return true
        return idx.exactEnglish.containsKey(q) || idx.exactZomi.containsKey(q) || idx.zomi.contains(q)
    }

    /**
     * Real-time completions for the search bar, ranked: exact English →
     * exact Zomi → English prefix → Zomi prefix → English contains →
     * Zomi contains. Headwords equal to the typed query are skipped so every
     * suggestion advances the query toward a full word.
     */
    fun suggest(query: String, limit: Int = 8): List<Suggestion> {
        val idx = buildIndex() ?: return emptyList()
        val q = fold(query)
        if (q.isEmpty()) return emptyList()

        data class Scored(val suggestion: Suggestion, val score: Int, val index: Int)

        val best = HashMap<String, Scored>()
        for (i in idx.english.indices) {
            val en = idx.english[i]
            val zo = idx.zomi[i]
            val enScore = when {
                en == q -> 0
                en.startsWith(q) -> 2
                q.length >= 2 && en.contains(q) -> 4
                else -> -1
            }
            val zoScore = when {
                zo == q -> 1
                zo.startsWith(q) -> 3
                q.length >= 2 && zo.contains(q) -> 5
                else -> -1
            }
            if (enScore < 0 && zoScore < 0) continue
            val e = idx.entries[i]
            listOf(
                Suggestion(e.english, e.zomi, "en") to enScore,
                Suggestion(e.zomi, e.english, "zo") to zoScore,
            ).forEach { (candidate, score) ->
                if (score < 0 || fold(candidate.text) == q) return@forEach
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
