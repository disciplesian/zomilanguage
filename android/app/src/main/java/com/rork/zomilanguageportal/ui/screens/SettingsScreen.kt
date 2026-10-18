package com.rork.zomilanguageportal.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.DeleteForever
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.PrivacyTip
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.rork.zomilanguageportal.BuildConfig
import com.rork.zomilanguageportal.data.AuthManager
import com.rork.zomilanguageportal.data.HistoryRepository
import com.rork.zomilanguageportal.data.UiLanguage
import com.rork.zomilanguageportal.data.UiStrings
import com.rork.zomilanguageportal.data.tr
import com.rork.zomilanguageportal.ui.components.GlassCard
import com.rork.zomilanguageportal.ui.components.SignInPanel
import com.rork.zomilanguageportal.ui.theme.PortalColors
import kotlinx.coroutines.launch

/** Settings: optional account, help, About/Privacy/Terms (in-app, offline),
 *  data controls, and account deletion. */
@Composable
fun SettingsScreen(
    onOpen: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SettingsViewModel = viewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val user by AuthManager.user.collectAsStateWithLifecycle()
    val isSigningIn by AuthManager.isSigningIn.collectAsStateWithLifecycle()
    val authError by AuthManager.error.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var confirmDelete by remember { mutableStateOf(false) }
    var confirmClear by remember { mutableStateOf(false) }

    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        Column(
            modifier = Modifier
                .widthIn(max = 720.dp)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp)
                .padding(bottom = 24.dp),
        ) {
            Spacer(Modifier.height(12.dp))
            Text(
                tr("Settings"),
                color = PortalColors.TextPrimary,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.semantics { heading() },
            )
            Text(tr("Account, help, and privacy"), color = PortalColors.TextSecondary, fontSize = 14.sp)
            Spacer(Modifier.height(16.dp))

            SectionTitle("Interface language")
            GlassCard {
                Column {
                    Row(modifier = Modifier.fillMaxWidth()) {
                        UiLanguage.entries.forEachIndexed { index, language ->
                            val selected = UiStrings.current == language
                            if (index > 0) Spacer(Modifier.size(8.dp))
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier
                                    .weight(1f)
                                    .heightIn(min = 48.dp)
                                    .background(
                                        if (selected) PortalColors.Cyan.copy(alpha = 0.18f) else Color.White.copy(alpha = 0.04f),
                                        RoundedCornerShape(12.dp),
                                    )
                                    .border(1.dp, if (selected) PortalColors.Cyan.copy(alpha = 0.5f) else PortalColors.GlassBorder, RoundedCornerShape(12.dp))
                                    .clickable { UiStrings.setLanguage(language) }
                                    .semantics { this.selected = selected },
                            ) {
                                Text(
                                    language.displayName,
                                    color = if (selected) PortalColors.Cyan else PortalColors.TextSecondary,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(tr("Menus and buttons only. Translation direction is unchanged."), color = PortalColors.TextMuted, fontSize = 13.sp)
                }
            }

            Spacer(Modifier.height(20.dp))
            SectionTitle("Account")
            if (user == null) {
                SignInPanel(
                    title = "Sign in (optional)",
                    message = "Translation is free without an account. Sign in with Google or Apple for unlimited translation and history that syncs between your devices.",
                    isSigningIn = isSigningIn,
                    error = authError,
                    onGoogle = { scope.launch { AuthManager.signIn(context, "google") } },
                    onApple = { scope.launch { AuthManager.signIn(context, "apple") } },
                    modifier = Modifier.padding(horizontal = 0.dp),
                )
            } else {
                GlassCard {
                    Column {
                        Text(user?.name ?: "Signed in", color = PortalColors.TextPrimary, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                        Text(user?.email.orEmpty(), color = PortalColors.TextMuted, fontSize = 14.sp)
                        Spacer(Modifier.height(6.dp))
                        Text("Unlimited translation and synced history are on.", color = PortalColors.TextSecondary, fontSize = 14.sp)
                        Spacer(Modifier.height(12.dp))
                        if (state.profile?.role == "admin") {
                            SettingsRow(Icons.Filled.AdminPanelSettings, "Admin dashboard", PortalColors.Pink) { onOpen("admin") }
                        }
                        SettingsRow(Icons.AutoMirrored.Filled.Logout, "Sign out", PortalColors.TextSecondary) { AuthManager.signOut() }
                        SettingsRow(Icons.Filled.DeleteForever, "Delete account", Color(0xFFFF8A8A), chevron = false) { confirmDelete = true }
                        if (state.isDeleting) {
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 6.dp)) {
                                CircularProgressIndicator(color = PortalColors.Cyan, strokeWidth = 2.dp, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.size(8.dp))
                                Text("Deleting\u2026", color = PortalColors.TextMuted, fontSize = 14.sp)
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(20.dp))
            SectionTitle("Help & About")
            GlassCard {
                Column {
                    SettingsRow(Icons.AutoMirrored.Filled.HelpOutline, "Help & Support", PortalColors.Green) { onOpen("help") }
                    SettingsRow(Icons.Filled.Info, "About Zomi Translator", PortalColors.Cyan) { onOpen("about") }
                    SettingsRow(Icons.Filled.PrivacyTip, "Privacy Policy", PortalColors.Purple) { onOpen("privacy") }
                    SettingsRow(Icons.Filled.Description, "Terms of Service", PortalColors.Yellow) { onOpen("terms") }
                }
            }

            Spacer(Modifier.height(20.dp))
            SectionTitle("Data")
            GlassCard {
                Column {
                    SettingsRow(Icons.Filled.DeleteSweep, "Clear history", Color(0xFFFF8A8A), chevron = false) { confirmClear = true }
                    Text(
                        "Your history is saved on this device. When you're signed in, it also syncs with your account.",
                        color = PortalColors.TextMuted,
                        fontSize = 13.sp,
                        lineHeight = 18.sp,
                    )
                }
            }

            Spacer(Modifier.height(24.dp))
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Text("Zomi Translator", color = PortalColors.TextSecondary, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                Text("Version ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})", color = PortalColors.TextFaint, fontSize = 12.sp)
                Text("\u00A9 2026 Zomi Language & Literature Resource Center", color = PortalColors.TextFaint, fontSize = 12.sp)
            }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("Delete your account?") },
            text = { Text("This permanently deletes your account and the history saved with it. History on this device stays until you clear it. This can't be undone.") },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    viewModel.deleteAccount()
                }) { Text(tr("Delete account"), color = Color(0xFFFF8A8A)) }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text(tr("Cancel")) } },
            containerColor = PortalColors.Surface,
            titleContentColor = PortalColors.TextPrimary,
            textContentColor = PortalColors.TextSecondary,
        )
    }
    if (confirmClear) {
        AlertDialog(
            onDismissRequest = { confirmClear = false },
            title = { Text(tr("Clear all history?")) },
            text = { Text("This removes every saved translation on this device. It can't be undone.") },
            confirmButton = {
                TextButton(onClick = {
                    HistoryRepository.clear()
                    confirmClear = false
                }) { Text(tr("Clear history"), color = Color(0xFFFF8A8A)) }
            },
            dismissButton = { TextButton(onClick = { confirmClear = false }) { Text(tr("Cancel")) } },
            containerColor = PortalColors.Surface,
            titleContentColor = PortalColors.TextPrimary,
            textContentColor = PortalColors.TextSecondary,
        )
    }
    state.message?.let { message ->
        AlertDialog(
            onDismissRequest = { viewModel.dismissMessage() },
            text = { Text(message) },
            confirmButton = { TextButton(onClick = { viewModel.dismissMessage() }) { Text("OK") } },
            containerColor = PortalColors.Surface,
            textContentColor = PortalColors.TextSecondary,
        )
    }
}

@Composable
private fun SectionTitle(title: String) {
    Text(
        tr(title),
        color = PortalColors.TextPrimary,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(bottom = 10.dp).semantics { heading() },
    )
}

@Composable
private fun SettingsRow(icon: ImageVector, label: String, tint: Color, chevron: Boolean = true, onClick: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 8.dp)
            .heightIn(min = 52.dp)
            .background(Color.White.copy(alpha = 0.04f), RoundedCornerShape(12.dp))
            .border(1.dp, PortalColors.GlassBorder, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
        Spacer(Modifier.size(12.dp))
        Text(tr(label), color = PortalColors.TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
        if (chevron) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = PortalColors.TextFaint)
        }
    }
}
