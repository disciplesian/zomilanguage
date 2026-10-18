package com.rork.zomilanguageportal.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rork.zomilanguageportal.data.AuthManager
import com.rork.zomilanguageportal.data.DictionaryRepository
import com.rork.zomilanguageportal.data.HistoryItem
import com.rork.zomilanguageportal.data.HistoryRepository
import com.rork.zomilanguageportal.data.PortalApi
import com.rork.zomilanguageportal.data.ServiceNoticeException
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

data class TranslateUiState(
    val input: String = "",
    val output: String = "",
    val zomiToEnglish: Boolean = true,
    val isTranslating: Boolean = false,
    /** True while an automatic retry reconnects after a network blip. */
    val isConnecting: Boolean = false,
    /** True when the result came straight from the verified dictionary. */
    val isVerifiedWord: Boolean = false,
    /** Alternative renderings for words with several common senses. */
    val alternatives: List<String> = emptyList(),
    val error: String? = null,
    /** True when [error] is the friendly daily-allowance note. */
    val isLimitNotice: Boolean = false,
    /** Remaining free AI words today, shown once more than half is used. */
    val freeWordsLeft: Int? = null,
) {
    val targetLanguage: String get() = if (zomiToEnglish) "english" else "zomi"
    val sourceLanguage: String get() = if (zomiToEnglish) "zomi" else "english"
    val sourceLabel: String get() = if (zomiToEnglish) "Zomi" else "English"
    val targetLabel: String get() = if (zomiToEnglish) "English" else "Zomi"
}

/**
 * Translate screen state. Dictionary words appear instantly on the device;
 * sentences stream from the Zomi AI service after a short typing pause.
 */
class TranslateViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(TranslateUiState())
    val uiState: StateFlow<TranslateUiState> = _uiState.asStateFlow()

    private var translateJob: Job? = null
    private var debounceJob: Job? = null
    private var historyJob: Job? = null
    private var lastKey = ""

    fun onInputChange(value: String) {
        val limited = value.take(if (AuthManager.user.value == null) GUEST_MAX_CHARS else MAX_CHARS)
        _uiState.update { it.copy(input = limited) }
        schedule()
    }

    fun swapDirection() {
        _uiState.update { state ->
            val canReverse = state.output.isNotEmpty() && state.error == null
            state.copy(
                zomiToEnglish = !state.zomiToEnglish,
                input = if (canReverse) state.output else state.input,
                output = if (canReverse) state.input else "",
                alternatives = emptyList(),
                isVerifiedWord = false,
                error = null,
                isLimitNotice = false,
            )
        }
        lastKey = keyFor(_uiState.value)
        if (_uiState.value.output.isEmpty()) schedule()
    }

    fun clear() {
        translateJob?.cancel()
        debounceJob?.cancel()
        historyJob?.cancel()
        lastKey = ""
        _uiState.update {
            TranslateUiState(zomiToEnglish = it.zomiToEnglish, freeWordsLeft = it.freeWordsLeft)
        }
    }

    /** Keyboard Done: translate now, skipping the typing pause. */
    fun translateNow() {
        debounceJob?.cancel()
        translate(force = false)
    }

    fun retry() {
        lastKey = ""
        translate(force = true)
    }

    private fun keyFor(state: TranslateUiState) = "${state.sourceLanguage}>${state.targetLanguage}|${state.input.trim()}"

    private fun schedule() {
        debounceJob?.cancel()
        val state = _uiState.value
        val text = state.input.trim()
        if (text.isEmpty()) {
            translateJob?.cancel()
            lastKey = ""
            _uiState.update { it.copy(output = "", alternatives = emptyList(), error = null, isLimitNotice = false, isTranslating = false, isVerifiedWord = false) }
            return
        }
        if (showInstant(text)) return
        debounceJob = viewModelScope.launch {
            delay(250)
            translate(force = false)
        }
    }

    /** Verified dictionary answer with no network. Returns true on a hit. */
    private fun showInstant(text: String): Boolean {
        val state = _uiState.value
        val hit = DictionaryRepository.instantTranslation(text, state.zomiToEnglish) ?: return false
        translateJob?.cancel()
        lastKey = keyFor(state)
        _uiState.update {
            it.copy(
                output = hit.first,
                alternatives = hit.second,
                isVerifiedWord = true,
                isTranslating = false,
                isConnecting = false,
                error = null,
                isLimitNotice = false,
            )
        }
        saveWhenSettled(text, hit.first, state)
        return true
    }

    private fun saveWhenSettled(source: String, translated: String, state: TranslateUiState) {
        historyJob?.cancel()
        historyJob = viewModelScope.launch {
            delay(1200)
            if (_uiState.value.input.trim() != source) return@launch
            HistoryRepository.save(
                HistoryItem(
                    sourceText = source,
                    translatedText = translated,
                    sourceLanguage = state.sourceLanguage,
                    targetLanguage = state.targetLanguage,
                )
            )
        }
    }

    private fun translate(force: Boolean) {
        val state = _uiState.value
        val text = state.input.trim()
        if (text.isEmpty()) return
        if (showInstant(text)) return
        val key = keyFor(state)
        if (!force && key == lastKey && state.error == null) return
        lastKey = key

        translateJob?.cancel()
        translateJob = viewModelScope.launch {
            val cached = HistoryRepository.lookup(text, state.targetLanguage)
            _uiState.update {
                it.copy(
                    isTranslating = cached == null,
                    isConnecting = false,
                    error = null,
                    isLimitNotice = false,
                    output = cached?.translatedText ?: "",
                    alternatives = emptyList(),
                    isVerifiedWord = false,
                )
            }
            try {
                val streamed = StringBuilder()
                val result = withContext(Dispatchers.IO) {
                    PortalApi.streamTranslation(
                        token = AuthManager.accessToken(),
                        anonymousId = AuthManager.anonymousId(),
                        text = text,
                        sourceLanguage = state.sourceLanguage,
                        targetLanguage = state.targetLanguage,
                        onConnecting = { _uiState.update { it.copy(isConnecting = true) } },
                        onDelta = { piece ->
                            streamed.append(piece)
                            val shown = streamed.toString()
                            _uiState.update { it.copy(output = shown, isTranslating = false, isConnecting = false) }
                        },
                        onUsage = { usage ->
                            if (usage.signedIn) {
                                _uiState.update { it.copy(freeWordsLeft = null) }
                            } else if (usage.wordsUsed >= 0 && usage.wordLimit > 0) {
                                val left = (usage.wordLimit - usage.wordsUsed).coerceAtLeast(0)
                                _uiState.update { it.copy(freeWordsLeft = if (usage.wordsUsed * 2 > usage.wordLimit) left else null) }
                            }
                        },
                    )
                }
                _uiState.update {
                    it.copy(
                        output = result.text,
                        alternatives = result.alternatives,
                        isVerifiedWord = result.model == "verified-dictionary",
                        isTranslating = false,
                        isConnecting = false,
                    )
                }
                HistoryRepository.save(
                    HistoryItem(
                        sourceText = text,
                        translatedText = result.text,
                        sourceLanguage = state.sourceLanguage,
                        targetLanguage = state.targetLanguage,
                    )
                )
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (e: Exception) {
                val (message, isLimit) = when (e) {
                    is WordLimitException -> (e.message ?: "") to true
                    is ServiceNoticeException, is SessionExpiredException -> (e.message ?: "") to false
                    is IOException -> "You're offline. Dictionary words still work. Reconnect for sentences." to false
                    else -> "Translation didn't come through. Please try again." to false
                }
                _uiState.update {
                    it.copy(
                        isTranslating = false,
                        isConnecting = false,
                        output = if (cached != null) cached.translatedText else "",
                        error = if (cached != null) null else message,
                        isLimitNotice = isLimit,
                        freeWordsLeft = if (isLimit) 0 else it.freeWordsLeft,
                    )
                }
            }
        }
    }

    /** Promotes an alternative rendering to the main translation. */
    fun promoteAlternative(alternative: String) {
        val current = _uiState.value
        if (alternative.isEmpty() || !current.alternatives.contains(alternative)) return
        _uiState.update { state ->
            state.copy(
                output = alternative,
                alternatives = state.alternatives.map { if (it == alternative) state.output else it },
            )
        }
    }

    companion object {
        const val MAX_CHARS = 5000
        const val GUEST_MAX_CHARS = 500
    }
}
