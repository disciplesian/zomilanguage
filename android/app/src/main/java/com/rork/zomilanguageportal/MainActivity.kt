package com.rork.zomilanguageportal

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.lifecycleScope
import com.rork.zomilanguageportal.data.AuthManager
import com.rork.zomilanguageportal.ui.navigation.AppNavigation
import com.rork.zomilanguageportal.ui.theme.AppTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        AuthManager.initialize(applicationContext)
        lifecycleScope.launch { AuthManager.restoreSession() }

        handleAuthRedirect(intent)

        setContent {
            AppTheme {
                AppNavigation()
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleAuthRedirect(intent)
    }

    /** Completes sign-in when the browser redirects to the app's callback URL. */
    private fun handleAuthRedirect(intent: Intent?) {
        val data = intent?.data ?: return
        if (data.scheme != "rork-${com.rork.zomilanguageportal.data.AppConfig.PROJECT_ID}") return
        lifecycleScope.launch { AuthManager.handleCallback(data) }
    }
}
