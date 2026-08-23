package com.rork.zomilanguageportal.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rork.zomilanguageportal.data.AuthManager
import com.rork.zomilanguageportal.data.PortalApi
import com.rork.zomilanguageportal.data.SessionExpiredException
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
    val isTranslating: Boolean = false,
    val confidence: Int = 0,
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
        _uiState.update {
            it.copy(
                zomiToEnglish = !it.zomiToEnglish,
                input = it.output,
                output = it.input,
                confidence = 0,
                error = null,
            )
        }
    }

    fun clear() {
        translateJob?.cancel()
        _uiState.value = TranslateUiState(zomiToEnglish = _uiState.value.zomiToEnglish)
    }

    fun useSuggestion(phrase: String) {
        _uiState.update { it.copy(input = phrase, zomiToEnglish = true, error = null) }
    }

    fun translate() {
        val state = _uiState.value
        val text = state.input.trim()
        if (text.isEmpty() || state.isTranslating) return

        translateJob?.cancel()
        translateJob = viewModelScope.launch {
            _uiState.update { it.copy(isTranslating = true, error = null, output = "", confidence = 0) }
            try {
                val token = AuthManager.accessToken()
                if (token == null) {
                    _uiState.update {
                        it.copy(
                            isTranslating = false,
                            error = "Your session expired. Please sign in again.",
                        )
                    }
                    return@launch
                }

                val result = PortalApi.streamTranslation(
                    token = token,
                    text = text,
                    targetLanguage = if (state.zomiToEnglish) "english" else "zomi",
                ) { piece ->
                    _uiState.update { it.copy(output = it.output + piece) }
                }

                _uiState.update {
                    it.copy(
                        output = result.text,
                        confidence = result.confidence,
                        isTranslating = false,
                    )
                }
            } catch (e: SessionExpiredException) {
                _uiState.update { it.copy(isTranslating = false, error = e.message) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isTranslating = false,
                        error = e.message ?: "Translation failed. Please try again.",
                    )
                }
            }
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
