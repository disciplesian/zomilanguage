package com.rork.zomilanguageportal.data

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.util.UUID

/** One saved translation shown in History. */
@Serializable
data class HistoryItem(
    val id: String = UUID.randomUUID().toString(),
    val sourceText: String,
    val translatedText: String,
    val sourceLanguage: String,
    val targetLanguage: String,
    val createdAt: Long = System.currentTimeMillis(),
    val isFavorite: Boolean = false,
)

/** Translation history stored on this device (newest first, max 200). */
object HistoryRepository {
    private const val PREFS = "zomi_history"
    private const val KEY = "items_v1"
    private const val MAX_ITEMS = 200

    private val json = Json { ignoreUnknownKeys = true }
    private var appContext: Context? = null

    private val _items = MutableStateFlow<List<HistoryItem>>(emptyList())
    val items: StateFlow<List<HistoryItem>> = _items.asStateFlow()

    fun initialize(context: Context) {
        if (appContext != null) return
        appContext = context.applicationContext
        val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)
        _items.value = raw?.let { runCatching { json.decodeFromString<List<HistoryItem>>(it) }.getOrNull() }.orEmpty()
    }

    fun save(item: HistoryItem) {
        val key = cacheKey(item.sourceText, item.targetLanguage)
        val existing = _items.value.firstOrNull { cacheKey(it.sourceText, it.targetLanguage) == key }
        val updated = listOf(item.copy(isFavorite = existing?.isFavorite ?: false)) +
            _items.value.filterNot { cacheKey(it.sourceText, it.targetLanguage) == key }
        _items.value = updated.take(MAX_ITEMS)
        persist()
    }

    fun lookup(text: String, target: String): HistoryItem? {
        val key = cacheKey(text, target)
        return _items.value.firstOrNull { cacheKey(it.sourceText, it.targetLanguage) == key }
    }

    fun remove(id: String) {
        _items.value = _items.value.filterNot { it.id == id }
        persist()
    }

    fun toggleFavorite(id: String) {
        _items.value = _items.value.map { if (it.id == id) it.copy(isFavorite = !it.isFavorite) else it }
        persist()
    }

    fun clear() {
        _items.value = emptyList()
        persist()
    }

    private fun cacheKey(text: String, target: String) = "$target::${text.trim().lowercase()}"

    private fun persist() {
        val context = appContext ?: return
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY, json.encodeToString(_items.value))
            .apply()
    }
}
