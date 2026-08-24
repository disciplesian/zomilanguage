package com.rork.zomilanguageportal.ui.screens

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.rork.zomilanguageportal.data.AuthManager
import com.rork.zomilanguageportal.data.DictionaryEntry
import com.rork.zomilanguageportal.data.DictionaryRepository
import com.rork.zomilanguageportal.data.EntryExample
import com.rork.zomilanguageportal.data.PortalApi
import com.rork.zomilanguageportal.data.SessionExpiredException
import com.rork.zomilanguageportal.data.Suggestion
import com.rork.zomilanguageportal.data.WordLimitException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.IOException

data class DictionaryUiState(
    val query: String = "",
    /** AI fallback direction: true = English → Zomi, false = Zomi → English. */
    val englishToZomi: Boolean = true,
    val results: List<DictionaryEntry> = emptyList(),
    /** Real-time completions for the search bar (offline, from the verified dataset). */
    val suggestions: List<Suggestion> = emptyList(),
    val totalCount: Int = 0,
    /** Query has no verified match — the AI answers these. */
    val needsAI: Boolean = false,
    val isAskingAI: Boolean = false,
    val aiResult: String? = null,
    val aiError: String? = null,
    // Offline A–Z browsing
    val selectedLetter: String = "A",
    val browseLetters: List<String> = emptyList(),
    val browseEntries: List<DictionaryEntry> = emptyList(),
    /** Whether the browse list shows every entry for the selected letter.
     *  Collapsed by default so the page shows a clean 4-entry preview. */
    val browseExpanded: Boolean = false,
    /** No query typed — show the A–Z index instead of search results. */
    val isBrowsing: Boolean = true,
    // Expanded entry detail view
    val detailEntry: DictionaryEntry? = null,
    val detailRelated: List<DictionaryEntry> = emptyList(),
    val detailExamples: List<EntryExample> = emptyList(),
    val detailExamplesLoading: Boolean = false,
    val detailExamplesError: Boolean = false,
    val isRefreshing: Boolean = false,
)

/** State for the Dictionary tab: instant local search over the verified
 *  dataset, with a debounced Zomi AI fallback for words not in the dictionary. */
class DictionaryViewModel(application: Application) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(DictionaryUiState())
    val uiState: StateFlow<DictionaryUiState> = _uiState.asStateFlow()

    private var aiJob: Job? = null

    /** Example sentences cached per English headword for this session. */
    private val examplesCache = HashMap<String, List<EntryExample>>()

    init {
        viewModelScope.launch {
            val entries = withContext(Dispatchers.IO) {
                DictionaryRepository.load(application)
            }
            val letters = withContext(Dispatchers.Default) {
                DictionaryRepository.browseLetters()
            }
            val browse = withContext(Dispatchers.Default) {
                DictionaryRepository.entriesForLetter("A")
            }
            _uiState.update {
                it.copy(
                    totalCount = entries.size,
                    browseLetters = letters,
                    browseEntries = browse,
                    isBrowsing = true,
                )
            }

            // Over-the-air dataset update: cached copy first (offline-safe),
            // then a fresh check of /api/dictionary/latest.
            DictionaryRepository.refreshFromServer(application)
            if (_uiState.value.totalCount != DictionaryRepository.load(application).size) {
                val updatedLetters = withContext(Dispatchers.Default) {
                    DictionaryRepository.browseLetters()
                }
                val updatedBrowse = withContext(Dispatchers.Default) {
                    DictionaryRepository.entriesForLetter(_uiState.value.selectedLetter)
                }
                _uiState.update {
                    it.copy(
                        totalCount = DictionaryRepository.load(application).size,
                        browseLetters = updatedLetters,
                        browseEntries = updatedBrowse,
                    )
                }
            }
        }
    }

    /** Selects a browse letter (offline A–Z index). */
    fun onLetterSelect(letter: String) {
        _uiState.update { it.copy(selectedLetter = letter, browseExpanded = false) }
        viewModelScope.launch {
            val browse = withContext(Dispatchers.Default) {
                DictionaryRepository.entriesForLetter(letter)
            }
            if (_uiState.value.selectedLetter == letter) {
                _uiState.update { it.copy(browseEntries = browse) }
            }
        }
    }

    /** Expands/collapses the browse list for the selected letter. */
    fun onToggleBrowse() {
        _uiState.update { it.copy(browseExpanded = !it.browseExpanded) }
    }

    fun onQueryChange(value: String) {
        aiJob?.cancel()
        _uiState.update {
            it.copy(
                query = value,
                aiResult = null,
                aiError = null,
                isAskingAI = false,
                isBrowsing = value.trim().isEmpty(),
            )
        }
        viewModelScope.launch {
            val results = withContext(Dispatchers.Default) {
                DictionaryRepository.search(value)
            }
            val suggestions = withContext(Dispatchers.Default) {
                DictionaryRepository.suggest(value)
            }
            if (_uiState.value.query != value) return@launch
            val trimmed = value.trim()
            val needsAI = withContext(Dispatchers.Default) {
                trimmed.length >= 2 && results.isEmpty() && !DictionaryRepository.hasExactMatch(trimmed)
            }
            _uiState.update { it.copy(results = results, suggestions = suggestions, needsAI = needsAI) }
            if (needsAI) scheduleAI(trimmed)
        }
    }

    /** Opens the expanded detail view for an entry: related terms computed
     *  locally, example sentences fetched from the AI endpoint (cached). */
    fun openDetail(entry: DictionaryEntry) {
        _uiState.update {
            it.copy(
                detailEntry = entry,
                detailRelated = emptyList(),
                detailExamples = emptyList(),
                detailExamplesError = false,
                detailExamplesLoading = true,
            )
        }
        viewModelScope.launch {
            val related = withContext(Dispatchers.Default) {
                DictionaryRepository.relatedEntries(entry)
            }
            if (_uiState.value.detailEntry == entry) {
                _uiState.update { it.copy(detailRelated = related) }
            }

            val key = entry.english.lowercase()
            val cached = examplesCache[key]
            if (cached != null) {
                if (_uiState.value.detailEntry == entry) {
                    _uiState.update { it.copy(detailExamples = cached, detailExamplesLoading = false) }
                }
                return@launch
            }
            try {
                val examples = PortalApi.fetchEntryExamples(
                    token = AuthManager.accessToken(),
                    anonymousId = AuthManager.anonymousId(),
                    english = entry.english,
                    zomi = entry.zomi,
                    pos = entry.pos,
                )
                if (examples.isNotEmpty()) examplesCache[key] = examples
                if (_uiState.value.detailEntry == entry) {
                    _uiState.update {
                        it.copy(
                            detailExamples = examples,
                            detailExamplesLoading = false,
                            detailExamplesError = examples.isEmpty(),
                        )
                    }
                }
            } catch (e: Exception) {
                if (_uiState.value.detailEntry == entry) {
                    _uiState.update { it.copy(detailExamplesLoading = false, detailExamplesError = true) }
                }
            }
        }
    }

    /** Closes the expanded entry detail view. */
    fun closeDetail() {
        _uiState.update { it.copy(detailEntry = null) }
    }

    /** Immediate OTA dictionary update check. Used at startup and on refresh. */
    fun refreshDictionary() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true) }
            try {
                DictionaryRepository.refreshFromServer(getApplication())
                val entries = withContext(Dispatchers.IO) { DictionaryRepository.load(getApplication()) }
                val letters = withContext(Dispatchers.Default) { DictionaryRepository.browseLetters() }
                val browse = withContext(Dispatchers.Default) {
                    DictionaryRepository.entriesForLetter(_uiState.value.selectedLetter)
                }
                _uiState.update {
                    it.copy(
                        totalCount = entries.size,
                        browseLetters = letters,
                        browseEntries = browse,
                    )
                }
            } catch (_: Exception) {
                // Offline or backend unreachable — the bundled/cached dictionary still works.
            } finally {
                _uiState.update { it.copy(isRefreshing = false) }
            }
        }
    }

    fun onDirectionChange(englishToZomi: Boolean) {
        _uiState.update { it.copy(englishToZomi = englishToZomi) }
        // Re-run the AI fallback under the new direction when needed.
        val q = _uiState.value.query
        if (q.isNotBlank() && _uiState.value.needsAI) onQueryChange(q)
    }

    private fun scheduleAI(text: String) {
        val englishToZomi = _uiState.value.englishToZomi
        aiJob = viewModelScope.launch {
            delay(700)
            if (_uiState.value.query.trim() != text) return@launch
            _uiState.update { it.copy(isAskingAI = true, aiResult = null, aiError = null) }
            try {
                val source = if (englishToZomi) "english" else "zomi"
                val target = if (englishToZomi) "zomi" else "english"
                val result = PortalApi.streamTranslation(
                    token = AuthManager.accessToken(),
                    anonymousId = AuthManager.anonymousId(),
                    text = text,
                    sourceLanguage = source,
                    targetLanguage = target,
                ) { }
                if (_uiState.value.query.trim() == text) {
                    val answer = result.text.trim().takeIf { it.isNotEmpty() }
                    _uiState.update {
                        it.copy(
                            isAskingAI = false,
                            aiResult = answer,
                            aiError = if (answer == null) {
                                "AI lookup returned no result. Please try again."
                            } else {
                                null
                            },
                        )
                    }
                }
            } catch (e: WordLimitException) {
                if (_uiState.value.query.trim() == text) {
                    _uiState.update { it.copy(isAskingAI = false, aiError = e.message) }
                }
            } catch (e: SessionExpiredException) {
                if (_uiState.value.query.trim() == text) {
                    _uiState.update { it.copy(isAskingAI = false, aiError = e.message) }
                }
            } catch (e: IOException) {
                if (_uiState.value.query.trim() == text) {
                    _uiState.update {
                        it.copy(
                            isAskingAI = false,
                            aiError = "You appear to be offline. The verified dictionary still works — reconnect for AI answers.",
                        )
                    }
                }
            } catch (e: Exception) {
                if (_uiState.value.query.trim() == text) {
                    _uiState.update {
                        it.copy(
                            isAskingAI = false,
                            aiError = "AI lookup is unavailable right now. Check your connection and try again.",
                        )
                    }
                }
            } finally {
                _uiState.update { it.copy(isAskingAI = false) }
            }
        }
    }

    override fun onCleared() {
        aiJob?.cancel()
        super.onCleared()
    }
}
