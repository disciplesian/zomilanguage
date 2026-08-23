package com.rork.zomilanguageportal.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rork.zomilanguageportal.data.AdminOverview
import com.rork.zomilanguageportal.data.AuthManager
import com.rork.zomilanguageportal.data.PortalApi
import com.rork.zomilanguageportal.data.PortalUserRecord
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AdminUiState(
    val overview: AdminOverview? = null,
    val users: List<PortalUserRecord> = emptyList(),
    val isLoading: Boolean = true,
    val isAdmin: Boolean = false,
    val isWorking: Boolean = false,
    val error: String? = null,
)

class AdminViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(AdminUiState())
    val uiState: StateFlow<AdminUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val token = AuthManager.accessToken()
                    ?: throw IllegalStateException("Your session expired. Please sign in again.")

                val profile = PortalApi.profile(token)
                if (profile.role != "admin") {
                    _uiState.update { it.copy(isLoading = false, isAdmin = false) }
                    return@launch
                }

                val overview = PortalApi.adminOverview(token)
                val users = PortalApi.adminUsers(token)
                _uiState.update {
                    it.copy(
                        overview = overview,
                        users = users,
                        isAdmin = true,
                        isLoading = false,
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Could not load the dashboard.",
                    )
                }
            }
        }
    }

    fun setRole(userId: String, role: String) {
        runAdminAction { token -> PortalApi.setRole(token, userId, role) }
    }

    fun decideVerification(userId: String, decision: String) {
        runAdminAction { token -> PortalApi.decideVerification(token, userId, decision) }
    }

    private fun runAdminAction(action: suspend (String) -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isWorking = true, error = null) }
            try {
                val token = AuthManager.accessToken()
                    ?: throw IllegalStateException("Your session expired. Please sign in again.")
                action(token)
                val overview = PortalApi.adminOverview(token)
                val users = PortalApi.adminUsers(token)
                _uiState.update {
                    it.copy(overview = overview, users = users, isWorking = false)
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isWorking = false, error = e.message ?: "That action failed.")
                }
            }
        }
    }
}
