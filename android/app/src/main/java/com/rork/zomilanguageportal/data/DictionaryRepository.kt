package com.rork.zomilanguageportal.data

import android.content.Context
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

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

/** One A–Z browse group: a letter and its alphabetically sorted entries. */
data class BrowseSection(
    val letter: String,
    val entries: List<DictionaryEntry>,
)

/** Loads and searches the bundled dictionary asset (dictionary.json). */
object DictionaryRepository {

    @Volatile
    private var entries: List<DictionaryEntry>? = null

    @Volatile
    private var browseSections: List<BrowseSection>? = null

    private val json = Json { ignoreUnknownKeys = true }

    fun load(context: Context): List<DictionaryEntry> {
        entries?.let { return it }
        synchronized(this) {
            entries?.let { return it }
            val loaded = runCatching {
                val text = context.applicationContext.assets
                    .open("dictionary.json")
                    .bufferedReader()
                    .use { it.readText() }
                json.decodeFromString<DictionaryPayload>(text).entries
                    .filter { it.size >= 4 }
                    .map { DictionaryEntry(it[0], it[1], it[2], it[3]) }
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
