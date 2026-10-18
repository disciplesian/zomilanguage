package com.rork.zomilanguageportal.ui.navigation

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.NavigationRailItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.rork.zomilanguageportal.data.tr
import com.rork.zomilanguageportal.ui.components.PortalBackground
import com.rork.zomilanguageportal.ui.screens.AboutScreen
import com.rork.zomilanguageportal.ui.screens.AdminScreen
import com.rork.zomilanguageportal.ui.screens.DictionaryScreen
import com.rork.zomilanguageportal.ui.screens.HelpScreen
import com.rork.zomilanguageportal.ui.screens.HistoryScreen
import com.rork.zomilanguageportal.ui.screens.PrivacyScreen
import com.rork.zomilanguageportal.ui.screens.SettingsScreen
import com.rork.zomilanguageportal.ui.screens.TermsScreen
import com.rork.zomilanguageportal.ui.screens.TranslateScreen
import com.rork.zomilanguageportal.ui.theme.PortalColors

private data class Destination(val route: String, val label: String, val icon: ImageVector)

private val DESTINATIONS = listOf(
    Destination("translate", "Translate", Icons.Filled.Translate),
    Destination("dictionary", "Dictionary", Icons.AutoMirrored.Filled.MenuBook),
    Destination("history", "History", Icons.Filled.History),
    Destination("settings", "Settings", Icons.Filled.Settings),
)

private fun NavHostController.openTab(route: String) {
    navigate(route) {
        popUpTo(graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

/** Translate · Dictionary · History · Settings. Bottom bar on phones, a side
 *  rail on tablets, foldables, and Chromebooks. Free to use without sign-in. */
@Composable
fun AppNavigation(initialRoute: String? = null) {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val focusManager = LocalFocusManager.current

    LaunchedEffect(initialRoute) {
        if (initialRoute != null && initialRoute in DESTINATIONS.map { it.route }) navController.openTab(initialRoute)
    }
    LaunchedEffect(currentRoute) { focusManager.clearFocus() }

    val tabRoute = when (currentRoute) {
        "about", "privacy", "terms", "help", "admin" -> "settings"
        else -> currentRoute
    }

    PortalBackground {
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val wide = maxWidth >= 600.dp
            val host: @Composable (Modifier) -> Unit = { m ->
                NavHost(navController = navController, startDestination = "translate", modifier = m) {
                    composable("translate") { TranslateScreen(onOpenSettings = { navController.openTab("settings") }) }
                    composable("dictionary") { DictionaryScreen() }
                    composable("history") { HistoryScreen(onStartTranslating = { navController.openTab("translate") }) }
                    composable("settings") { SettingsScreen(onOpen = { navController.navigate(it) }) }
                    composable("admin") { AdminScreen() }
                    composable("about") { AboutScreen(onBack = { navController.popBackStack() }) }
                    composable("privacy") { PrivacyScreen(onBack = { navController.popBackStack() }) }
                    composable("terms") { TermsScreen(onBack = { navController.popBackStack() }) }
                    composable("help") { HelpScreen(onBack = { navController.popBackStack() }) }
                }
            }

            if (wide) {
                Scaffold(containerColor = Color.Transparent) { padding ->
                    Row(modifier = Modifier.fillMaxSize().padding(padding)) {
                        NavigationRail(containerColor = PortalColors.Canvas.copy(alpha = 0.95f)) {
                            DESTINATIONS.forEach { destination ->
                                NavigationRailItem(
                                    selected = tabRoute == destination.route,
                                    onClick = { navController.openTab(destination.route) },
                                    icon = { Icon(destination.icon, contentDescription = null) },
                                    label = { Text(tr(destination.label)) },
                                    colors = NavigationRailItemDefaults.colors(
                                        selectedIconColor = PortalColors.Canvas,
                                        selectedTextColor = PortalColors.Cyan,
                                        indicatorColor = PortalColors.Cyan,
                                        unselectedIconColor = PortalColors.TextMuted,
                                        unselectedTextColor = PortalColors.TextMuted,
                                    ),
                                )
                            }
                        }
                        host(Modifier.weight(1f))
                    }
                }
            } else {
                Scaffold(
                    containerColor = Color.Transparent,
                    bottomBar = {
                        NavigationBar(containerColor = PortalColors.Canvas.copy(alpha = 0.95f)) {
                            DESTINATIONS.forEach { destination ->
                                NavigationBarItem(
                                    selected = tabRoute == destination.route,
                                    onClick = { navController.openTab(destination.route) },
                                    icon = { Icon(destination.icon, contentDescription = null) },
                                    label = { Text(tr(destination.label)) },
                                    colors = NavigationBarItemDefaults.colors(
                                        selectedIconColor = PortalColors.Canvas,
                                        selectedTextColor = PortalColors.Cyan,
                                        indicatorColor = PortalColors.Cyan,
                                        unselectedIconColor = PortalColors.TextMuted,
                                        unselectedTextColor = PortalColors.TextMuted,
                                    ),
                                )
                            }
                        }
                    },
                ) { padding ->
                    host(Modifier.padding(padding))
                }
            }
        }
    }
}
