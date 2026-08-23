package com.rork.zomilanguageportal.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.rork.zomilanguageportal.data.AuthManager
import com.rork.zomilanguageportal.ui.components.GlassCard
import com.rork.zomilanguageportal.ui.components.RoleBadge
import com.rork.zomilanguageportal.ui.theme.PortalColors

@Composable
fun AccountScreen(
    onOpenAdmin: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: AccountViewModel = viewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val user by AuthManager.user.collectAsStateWithLifecycle()
    val profile = state.profile

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp)
            .padding(bottom = 24.dp)
    ) {
        Spacer(Modifier.height(12.dp))
        Text(
            "My account",
            color = PortalColors.TextPrimary,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
        )
        Text(
            "Your Zomi Language Portal membership",
            color = PortalColors.TextFaint,
            fontSize = 13.sp,
            modifier = Modifier.padding(top = 2.dp),
        )
        Spacer(Modifier.height(16.dp))

        if (state.isLoading) {
            GlassCard {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 90.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = PortalColors.Cyan)
                }
            }
        }

        state.error?.let { message ->
            Text(
                message,
                color = Color(0xFFFFB3B3),
                fontSize = 14.sp,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(PortalColors.Red.copy(alpha = 0.12f), RoundedCornerShape(14.dp))
                    .border(1.dp, PortalColors.Red.copy(alpha = 0.3f), RoundedCornerShape(14.dp))
                    .padding(14.dp),
            )
        }

        if (profile != null) {
            GlassCard {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .background(
                                    Brush.linearGradient(
                                        listOf(PortalColors.Cyan, PortalColors.Purple)
                                    ),
                                    CircleShape,
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                (profile.name ?: profile.email).take(1).uppercase(),
                                color = PortalColors.Canvas,
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                        Spacer(Modifier.size(14.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                profile.name ?: "Portal member",
                                color = PortalColors.TextPrimary,
                                fontSize = 17.sp,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                profile.email,
                                color = PortalColors.TextFaint,
                                fontSize = 13.sp,
                            )
                            Spacer(Modifier.height(6.dp))
                            RoleBadge(role = profile.role, verified = profile.verified)
                        }
                    }

                    Spacer(Modifier.height(18.dp))

                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        StatBox(
                            icon = Icons.Filled.Translate,
                            label = "TRANSLATIONS",
                            value = profile.translationCount.toString(),
                            tint = PortalColors.Cyan,
                            modifier = Modifier.weight(1f),
                        )
                        StatBox(
                            icon = Icons.Filled.CalendarMonth,
                            label = "MEMBER SINCE",
                            value = profile.joinedAt.take(7).ifEmpty { "—" },
                            tint = PortalColors.Purple,
                            modifier = Modifier.weight(1f),
                        )
                    }

                    if (profile.role == "admin") {
                        Spacer(Modifier.height(16.dp))
                        Button(
                            onClick = onOpenAdmin,
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = PortalColors.Pink,
                                contentColor = Color.White,
                            ),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Icon(
                                Icons.Filled.AdminPanelSettings,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                            )
                            Spacer(Modifier.size(8.dp))
                            Text("Admin dashboard", fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            // Verification
            GlassCard {
                Column {
                    Text(
                        "Verification",
                        color = PortalColors.TextPrimary,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.height(12.dp))

                    when {
                        profile.verified -> StatusBanner(
                            title = "You are a verified member",
                            body = "Your blue badge appears next to your name across the portal.",
                            tint = PortalColors.Blue,
                        )

                        profile.verificationStatus == "pending" -> StatusBanner(
                            title = "Request under review",
                            body = "An administrator will review your request shortly.",
                            tint = PortalColors.Yellow,
                        )

                        else -> {
                            if (profile.verificationStatus == "rejected") {
                                StatusBanner(
                                    title = "Your previous request was not approved",
                                    body = "You are welcome to apply again with more detail.",
                                    tint = PortalColors.Red,
                                )
                                Spacer(Modifier.height(12.dp))
                            }

                            Text(
                                "Verification recognises trusted contributors — pastors, teachers, " +
                                    "translators and community leaders. Tell us who you are and how " +
                                    "you use Zomi.",
                                color = PortalColors.TextMuted,
                                fontSize = 14.sp,
                                lineHeight = 20.sp,
                            )

                            Spacer(Modifier.height(12.dp))

                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color.White.copy(alpha = 0.04f), RoundedCornerShape(12.dp))
                                    .border(1.dp, PortalColors.GlassBorder, RoundedCornerShape(12.dp))
                                    .padding(14.dp)
                            ) {
                                if (state.reason.isEmpty()) {
                                    Text(
                                        "For example: I am a pastor in Tedim and I translate " +
                                            "scripture for our congregation each week…",
                                        color = PortalColors.TextFaint,
                                        fontSize = 14.sp,
                                        lineHeight = 20.sp,
                                    )
                                }
                                BasicTextField(
                                    value = state.reason,
                                    onValueChange = viewModel::onReasonChange,
                                    textStyle = LocalTextStyle.current.copy(
                                        color = PortalColors.TextPrimary,
                                        fontSize = 14.sp,
                                        lineHeight = 20.sp,
                                    ),
                                    cursorBrush = SolidColor(PortalColors.Cyan),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .heightIn(min = 72.dp),
                                )
                            }

                            Spacer(Modifier.height(10.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    "${state.reason.length}/${AccountViewModel.MAX_REASON}",
                                    color = PortalColors.TextFaint,
                                    fontSize = 11.sp,
                                )
                                Button(
                                    onClick = { viewModel.submitVerification() },
                                    enabled = !state.isSubmitting,
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = PortalColors.Blue,
                                        contentColor = Color.White,
                                    ),
                                ) {
                                    if (state.isSubmitting) {
                                        CircularProgressIndicator(
                                            color = Color.White,
                                            strokeWidth = 2.dp,
                                            modifier = Modifier.size(16.dp),
                                        )
                                    } else {
                                        Icon(
                                            Icons.Filled.Verified,
                                            contentDescription = null,
                                            modifier = Modifier.size(18.dp),
                                        )
                                    }
                                    Spacer(Modifier.size(8.dp))
                                    Text("Request verification", fontWeight = FontWeight.SemiBold)
                                }
                            }

                            state.formError?.let {
                                Spacer(Modifier.height(8.dp))
                                Text(it, color = Color(0xFFFFB3B3), fontSize = 13.sp)
                            }
                        }
                    }
                }
            }
        }

        if (user != null) {
            Spacer(Modifier.height(12.dp))
            OutlinedButton(
                onClick = { AuthManager.signOut() },
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(
                    Icons.Filled.Logout,
                    contentDescription = null,
                    tint = PortalColors.TextSecondary,
                    modifier = Modifier.size(18.dp),
                )
                Spacer(Modifier.size(8.dp))
                Text("Sign out", color = PortalColors.TextSecondary)
            }
        }
    }
}

@Composable
private fun StatBox(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    tint: Color,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .background(Color.White.copy(alpha = 0.04f), RoundedCornerShape(14.dp))
            .border(1.dp, PortalColors.GlassBorder, RoundedCornerShape(14.dp))
            .padding(14.dp)
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(18.dp))
        Spacer(Modifier.height(8.dp))
        Text(value, color = PortalColors.TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Text(label, color = PortalColors.TextFaint, fontSize = 10.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun StatusBanner(title: String, body: String, tint: Color) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(tint.copy(alpha = 0.12f), RoundedCornerShape(14.dp))
            .border(1.dp, tint.copy(alpha = 0.3f), RoundedCornerShape(14.dp))
            .padding(14.dp)
    ) {
        Text(title, color = tint, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(4.dp))
        Text(body, color = PortalColors.TextMuted, fontSize = 13.sp, lineHeight = 19.sp)
    }
}
