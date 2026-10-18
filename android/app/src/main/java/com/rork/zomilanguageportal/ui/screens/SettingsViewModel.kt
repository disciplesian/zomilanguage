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

data class SettingsUiState(
    val profile: PortalProfile? = null,
    val isDeleting: Boolean = false,
    val message: String? = null,
)

/** Settings: optional account (profile + role for admins) and account deletion. */
class SettingsViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            AuthManager.user.collect { user ->
                if (user == null) {
                    _uiState.update { it.copy(profile = null) }
                } else {
                    loadProfile()
                }
            }
        }
    }

    private suspend fun loadProfile() {
        val token = AuthManager.accessToken() ?: return
        runCatching { PortalApi.profile(token) }.onSuccess { profile ->
            _uiState.update { it.copy(profile = profile) }
        }
    }

    fun deleteAccount() {
        viewModelScope.launch {
            _uiState.update { it.copy(isDeleting = true, message = null) }
            val ok = AuthManager.deleteAccount()
            _uiState.update {
                it.copy(
                    isDeleting = false,
                    profile = if (ok) null else it.profile,
                    message = if (ok) "Your account has been deleted." else "Couldn't delete your account right now. Please try again, or email support@zomitranslator.com.",
                )
            }
        }
    }

    fun dismissMessage() {
        _uiState.update { it.copy(message = null) }
    }
}
