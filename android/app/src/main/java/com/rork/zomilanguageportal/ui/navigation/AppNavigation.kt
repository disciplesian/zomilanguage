package com.rork.zomilanguageportal.ui.navigation

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.rork.zomilanguageportal.data.AuthManager
import com.rork.zomilanguageportal.ui.components.PortalBackground
import com.rork.zomilanguageportal.ui.components.PortalLoading
import com.rork.zomilanguageportal.ui.components.SignInPanel
import com.rork.zomilanguageportal.ui.screens.AboutScreen
import com.rork.zomilanguageportal.ui.screens.AccountScreen
import com.rork.zomilanguageportal.ui.screens.AdminScreen
import com.rork.zomilanguageportal.ui.screens.DictionaryScreen
import com.rork.zomilanguageportal.ui.screens.TranslateScreen
import com.rork.zomilanguageportal.ui.theme.PortalColors
import kotlinx.coroutines.launch
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext

private data class Destination(val route: String, val label: String, val icon: ImageVector)

private val DESTINATIONS = listOf(
    Destination("translate", "Translate", Icons.Filled.Translate),
    Destination("dictionary", "Dictionary", Icons.Filled.MenuBook),
    Destination("account", "Account", Icons.Filled.Person),
    Destination("admin", "Admin", Icons.Filled.AdminPanelSettings),
    Destination("about", "About", Icons.Filled.Info),
)

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    val user by AuthManager.user.collectAsStateWithLifecycle()
    val isLoading by AuthManager.isLoading.collectAsStateWithLifecycle()
    val isSigningIn by AuthManager.isSigningIn.collectAsStateWithLifecycle()
    val error by AuthManager.error.collectAsStateWithLifecycle()

    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    PortalBackground {
        when {
            isLoading -> PortalLoading()

            user == null -> Column(modifier = Modifier.fillMaxSize()) {
                Scaffold(containerColor = Color.Transparent) { padding ->
                    SignInPanel(
                        title = "Members only",
                        message = "The Zomi translation service is available to portal members. " +
                            "Sign in with Google or Apple to continue — it is free.",
                        isSigningIn = isSigningIn,
                        error = error,
                        onGoogle = { scope.launch { AuthManager.signIn(context, "google") } },
                        onApple = { scope.launch { AuthManager.signIn(context, "apple") } },
                        modifier = Modifier.padding(padding),
                    )
                }
            }

            else -> Scaffold(
                containerColor = Color.Transparent,
                bottomBar = {
                    NavigationBar(containerColor = PortalColors.Canvas.copy(alpha = 0.95f)) {
                        DESTINATIONS.forEach { destination ->
                            NavigationBarItem(
                                selected = currentRoute == destination.route,
                                onClick = {
                                    navController.navigate(destination.route) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                                icon = {
                                    Icon(destination.icon, contentDescription = destination.label)
                                },
                                label = { Text(destination.label, fontSize = 11.sp) },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = PortalColors.Canvas,
                                    selectedTextColor = PortalColors.Cyan,
                                    indicatorColor = PortalColors.Cyan,
                                    unselectedIconColor = PortalColors.TextFaint,
                                    unselectedTextColor = PortalColors.TextFaint,
                                ),
                            )
                        }
                    }
                },
            ) { padding ->
                NavHost(
                    navController = navController,
                    startDestination = "translate",
                    modifier = Modifier.padding(padding),
                ) {
                    composable("translate") { TranslateScreen() }
                    composable("dictionary") { DictionaryScreen() }
                    composable("account") {
                        AccountScreen(onOpenAdmin = { navController.navigate("admin") })
                    }
                    composable("admin") { AdminScreen() }
                    composable("about") { AboutScreen() }
                }
            }
        }
    }
}
