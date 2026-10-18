package com.rork.zomilanguageportal

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.lifecycleScope
import com.rork.zomilanguageportal.data.AuthManager
import com.rork.zomilanguageportal.data.DictionaryRepository
import com.rork.zomilanguageportal.data.HistoryRepository
import com.rork.zomilanguageportal.ui.navigation.AppNavigation
import com.rork.zomilanguageportal.ui.theme.AppTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    /** Tab requested by a home-screen shortcut (translate / dictionary). */
    private val requestedRoute = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        AuthManager.initialize(applicationContext)
        HistoryRepository.initialize(applicationContext)
        lifecycleScope.launch { AuthManager.restoreSession() }
        // Build the dictionary search index off the main thread so the first
        // keystroke on Translate or Dictionary is instant.
        lifecycleScope.launch(Dispatchers.Default) { DictionaryRepository.warmUp(applicationContext) }

        handleIntent(intent)

        setContent {
            AppTheme {
                AppNavigation(initialRoute = requestedRoute.value)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        intent?.getStringExtra(EXTRA_ROUTE)?.let { requestedRoute.value = it }
        val data = intent?.data ?: return
        if (data.scheme != "rork-${com.rork.zomilanguageportal.data.AppConfig.PROJECT_ID}") return
        lifecycleScope.launch { AuthManager.handleCallback(data) }
    }

    companion object {
        const val EXTRA_ROUTE = "route"
    }
}
