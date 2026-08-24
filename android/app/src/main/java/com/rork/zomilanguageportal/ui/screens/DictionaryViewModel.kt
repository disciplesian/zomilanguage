package com.rork.zomilanguageportal.ui.screens

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.rork.zomilanguageportal.data.AuthManager
import com.rork.zomilanguageportal.data.DictionaryEntry
import com.rork.zomilanguageportal.data.DictionaryRepository
import com.rork.zomilanguageportal.data.PortalApi
import com.rork.zomilanguageportal.data.SessionExpiredException
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
    /** No query typed — show the A–Z index instead of search results. */
    val isBrowsing: Boolean = true,
)

/** State for the Dictionary tab: instant local search over the verified
 *  dataset, with a debounced Zomi AI fallback for words not in the dictionary. */
class DictionaryViewModel(application: Application) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(DictionaryUiState())
    val uiState: StateFlow<DictionaryUiState> = _uiState.asStateFlow()

    private var aiJob: Job? = null

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
        _uiState.update { it.copy(selectedLetter = letter) }
        viewModelScope.launch {
            val browse = withContext(Dispatchers.Default) {
                DictionaryRepository.entriesForLetter(letter)
            }
            if (_uiState.value.selectedLetter == letter) {
                _uiState.update { it.copy(browseEntries = browse) }
            }
        }
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
            if (_uiState.value.query != value) return@launch
            val trimmed = value.trim()
            val needsAI = withContext(Dispatchers.Default) {
                trimmed.length >= 2 && results.isEmpty() && !DictionaryRepository.hasExactMatch(trimmed)
            }
            _uiState.update { it.copy(results = results, needsAI = needsAI) }
            if (needsAI) scheduleAI(trimmed)
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
