package com.rork.zomilanguageportal.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rork.zomilanguageportal.data.AuthManager
import com.rork.zomilanguageportal.data.PortalApi
import com.rork.zomilanguageportal.data.PortalProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AccountUiState(
    val profile: PortalProfile? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
    val reason: String = "",
    val isSubmitting: Boolean = false,
    val formError: String? = null,
)

class AccountViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(AccountUiState())
    val uiState: StateFlow<AccountUiState> = _uiState.asStateFlow()

    init {
        loadProfile()
    }

    fun loadProfile() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val token = AuthManager.accessToken()
                    ?: throw IllegalStateException("Your session expired. Please sign in again.")
                val profile = PortalApi.profile(token)
                _uiState.update { it.copy(profile = profile, isLoading = false) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Could not load your profile.",
                    )
                }
            }
        }
    }

    fun onReasonChange(value: String) {
        _uiState.update { it.copy(reason = value.take(MAX_REASON), formError = null) }
    }

    fun submitVerification() {
        val reason = _uiState.value.reason.trim()
        if (reason.length < 10) {
            _uiState.update {
                it.copy(formError = "Please tell us a little more about why you should be verified.")
            }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, formError = null) }
            try {
                val token = AuthManager.accessToken()
                    ?: throw IllegalStateException("Your session expired. Please sign in again.")
                PortalApi.requestVerification(token, reason)
                _uiState.update { it.copy(isSubmitting = false, reason = "") }
                loadProfile()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isSubmitting = false,
                        formError = e.message ?: "Could not send your request.",
                    )
                }
            }
        }
    }

    companion object {
        const val MAX_REASON = 500
    }
}
