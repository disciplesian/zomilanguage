package com.rork.zomilanguageportal.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rork.zomilanguageportal.data.AuthManager
import com.rork.zomilanguageportal.data.LanguageCatalog
import com.rork.zomilanguageportal.data.PortalApi
import com.rork.zomilanguageportal.data.SessionExpiredException
import com.rork.zomilanguageportal.data.WordLimitException
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class TranslateUiState(
    val input: String = "",
    val output: String = "",
    val zomiToEnglish: Boolean = true,
    val targetLanguage: String = "english",
    val isTranslating: Boolean = false,
    /** True while an automatic retry reconnects after a network blip. */
    val isConnecting: Boolean = false,
    val confidence: Int = 0,
    /** Alternative phrasings for inputs with multiple common senses. */
    val alternatives: List<String> = emptyList(),
    val error: String? = null,
)

class TranslateViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(TranslateUiState())
    val uiState: StateFlow<TranslateUiState> = _uiState.asStateFlow()

    private var translateJob: Job? = null

    fun onInputChange(value: String) {
        _uiState.update { it.copy(input = value.take(MAX_CHARS)) }
    }

    fun swapDirection() {
        _uiState.update { state ->
            if (LanguageCatalog.isPrimary(state.targetLanguage)) {
                // Full reversal: the previous output becomes the new input.
                state.copy(
                    zomiToEnglish = !state.zomiToEnglish,
                    input = state.output,
                    output = state.input,
                    confidence = 0,
                    error = null,
                )
            } else {
                // Custom target: only the source alternates — the previous
                // output was in the target language, so it can't become input.
                state.copy(
                    zomiToEnglish = !state.zomiToEnglish,
                    output = "",
                    confidence = 0,
                    error = null,
                )
            }
        }
    }

    /** Picks a new target language, keeping source and target distinct. */
    fun selectTargetLanguage(code: String) {
        _uiState.update { state ->
            val sourceFlipped = !LanguageCatalog.isPrimary(code) &&
                ((state.zomiToEnglish && code == "english") || (!state.zomiToEnglish && code == "zomi"))
            state.copy(
                targetLanguage = code,
                zomiToEnglish = if (sourceFlipped) !state.zomiToEnglish else state.zomiToEnglish,
                output = "",
                confidence = 0,
                error = null,
            )
        }
    }

    fun clear() {
        translateJob?.cancel()
        _uiState.value = TranslateUiState(
            zomiToEnglish = _uiState.value.zomiToEnglish,
            targetLanguage = _uiState.value.targetLanguage,
        )
    }

    fun useSuggestion(phrase: String) {
        _uiState.update {
            it.copy(input = phrase, zomiToEnglish = true, targetLanguage = "english", error = null)
        }
    }

    fun translate() {
        val state = _uiState.value
        val text = state.input.trim()
        if (text.isEmpty() || state.isTranslating) return

        translateJob?.cancel()
        translateJob = viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isTranslating = true,
                    isConnecting = false,
                    error = null,
                    output = "",
                    confidence = 0,
                    alternatives = emptyList(),
                )
            }
            try {
                // Signed-in members translate without limits; guests draw down
                // their 1,500-word free allowance tracked by a stable device ID.
                val token = AuthManager.accessToken()

                val result = PortalApi.streamTranslation(
                    token = token,
                    anonymousId = AuthManager.anonymousId(),
                    text = text,
                    sourceLanguage = if (state.zomiToEnglish) "zomi" else "english",
                    targetLanguage = state.targetLanguage,
                    onConnecting = {
                        // A transient network blip is being retried.
                        _uiState.update { it.copy(isConnecting = true) }
                    },
                    onDelta = { piece ->
                        _uiState.update { it.copy(output = it.output + piece, isConnecting = false) }
                    },
                )

                _uiState.update {
                    it.copy(
                        output = result.text,
                        confidence = result.confidence,
                        alternatives = result.alternatives,
                        isTranslating = false,
                        isConnecting = false,
                    )
                }
            } catch (e: WordLimitException) {
                _uiState.update { it.copy(isTranslating = false, isConnecting = false, error = e.message) }
            } catch (e: SessionExpiredException) {
                _uiState.update { it.copy(isTranslating = false, isConnecting = false, error = e.message) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isTranslating = false,
                        isConnecting = false,
                        error = e.message ?: "Translation failed. Please try again.",
                    )
                }
            }
        }
    }

    /** Promotes an alternative phrasing to the main translation. */
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
        val SUGGESTIONS = listOf(
            "Na dam maw?",
            "Ka lungdam hi",
            "Nang min bang ahi?",
            "Pasian in hong thupha hen",
        )
    }
}
