package com.rork.zomilanguageportal.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.rork.zomilanguageportal.data.PortalUserRecord
import com.rork.zomilanguageportal.ui.components.GlassCard
import com.rork.zomilanguageportal.ui.components.RoleBadge
import com.rork.zomilanguageportal.ui.theme.PortalColors

private val ROLES = listOf("user", "moderator", "admin")

@Composable
fun AdminScreen(
    modifier: Modifier = Modifier,
    viewModel: AdminViewModel = viewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    if (state.isLoading) {
        Box(
            modifier = modifier
                .fillMaxWidth()
                .heightIn(min = 300.dp),
            contentAlignment = Alignment.Center,
        ) {
            CircularProgressIndicator(color = PortalColors.Cyan)
        }
        return
    }

    if (!state.isAdmin) {
        Column(
            modifier = modifier
                .fillMaxWidth()
                .padding(16.dp),
        ) {
            GlassCard {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .background(PortalColors.Red.copy(alpha = 0.12f), RoundedCornerShape(16.dp)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Filled.Lock, contentDescription = null, tint = Color(0xFFFF8A8A))
                    }
                    Spacer(Modifier.height(14.dp))
                    Text(
                        "Administrators only",
                        color = PortalColors.TextPrimary,
                        fontSize = 19.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "Your account does not have administrator access to the portal dashboard.",
                        color = PortalColors.TextMuted,
                        fontSize = 14.sp,
                        textAlign = TextAlign.Center,
                        lineHeight = 20.sp,
                    )
                }
            }
        }
        return
    }

    val overview = state.overview
    val pending = state.users.filter { it.verificationStatus == "pending" }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp)
            .padding(bottom = 24.dp)
    ) {
        Spacer(Modifier.height(12.dp))
        Text(
            "Admin dashboard",
            color = PortalColors.TextPrimary,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
        )
        Text(
            "Members, verification and translation activity",
            color = PortalColors.TextFaint,
            fontSize = 13.sp,
            modifier = Modifier.padding(top = 2.dp),
        )
        Spacer(Modifier.height(16.dp))

        state.error?.let { message ->
            Text(
                message,
                color = Color(0xFFFFB3B3),
                fontSize = 14.sp,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(PortalColors.Red.copy(alpha = 0.12f), RoundedCornerShape(14.dp))
                    .padding(14.dp),
            )
            Spacer(Modifier.height(12.dp))
        }

        if (overview != null) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatTile(Icons.Filled.Group, "MEMBERS", overview.totalUsers, PortalColors.Cyan, Modifier.weight(1f))
                StatTile(Icons.Filled.Translate, "TOTAL", overview.totalTranslations, PortalColors.Purple, Modifier.weight(1f))
            }
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatTile(Icons.Filled.TrendingUp, "TODAY", overview.translationsToday, PortalColors.Green, Modifier.weight(1f))
                StatTile(Icons.Filled.Verified, "VERIFIED", overview.verifiedUsers, PortalColors.Blue, Modifier.weight(1f))
            }
            Spacer(Modifier.height(12.dp))
        }

        // Verification queue
        GlassCard {
            Column {
                Text(
                    "Verification queue",
                    color = PortalColors.TextPrimary,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(10.dp))

                if (pending.isEmpty()) {
                    Text(
                        "No verification requests are waiting.",
                        color = PortalColors.TextFaint,
                        fontSize = 14.sp,
                    )
                } else {
                    pending.forEach { record ->
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 10.dp)
                                .background(Color.White.copy(alpha = 0.04f), RoundedCornerShape(14.dp))
                                .border(1.dp, PortalColors.GlassBorder, RoundedCornerShape(14.dp))
                                .padding(14.dp)
                        ) {
                            Text(
                                record.name ?: record.email,
                                color = PortalColors.TextPrimary,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Text(record.email, color = PortalColors.TextFaint, fontSize = 12.sp)

                            if (record.verificationReason.isNotEmpty()) {
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    record.verificationReason,
                                    color = PortalColors.TextSecondary,
                                    fontSize = 13.sp,
                                    lineHeight = 19.sp,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(Color.Black.copy(alpha = 0.2f), RoundedCornerShape(10.dp))
                                        .padding(10.dp),
                                )
                            }

                            Spacer(Modifier.height(10.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(
                                    onClick = { viewModel.decideVerification(record.userId, "approve") },
                                    enabled = !state.isWorking,
                                    shape = RoundedCornerShape(10.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = PortalColors.Green,
                                        contentColor = PortalColors.Canvas,
                                    ),
                                ) {
                                    Icon(Icons.Filled.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.size(6.dp))
                                    Text("Approve", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                }
                                OutlinedButton(
                                    onClick = { viewModel.decideVerification(record.userId, "reject") },
                                    enabled = !state.isWorking,
                                    shape = RoundedCornerShape(10.dp),
                                ) {
                                    Icon(
                                        Icons.Filled.Close,
                                        contentDescription = null,
                                        tint = PortalColors.TextSecondary,
                                        modifier = Modifier.size(16.dp),
                                    )
                                    Spacer(Modifier.size(6.dp))
                                    Text("Reject", color = PortalColors.TextSecondary, fontSize = 13.sp)
                                }
                            }
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        // Members
        GlassCard {
            Column {
                Text(
                    "Members",
                    color = PortalColors.TextPrimary,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(10.dp))
                state.users.forEach { record ->
                    MemberRow(
                        record = record,
                        isWorking = state.isWorking,
                        onRole = { role -> viewModel.setRole(record.userId, role) },
                        onToggleVerified = {
                            viewModel.decideVerification(
                                record.userId,
                                if (record.verified) "reject" else "approve",
                            )
                        },
                    )
                }
            }
        }

        // Top translators
        if (overview != null && overview.topUsers.isNotEmpty()) {
            Spacer(Modifier.height(12.dp))
            GlassCard {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Filled.EmojiEvents,
                            contentDescription = null,
                            tint = PortalColors.Yellow,
                            modifier = Modifier.size(20.dp),
                        )
                        Spacer(Modifier.size(8.dp))
                        Text(
                            "Top translators",
                            color = PortalColors.TextPrimary,
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                    Spacer(Modifier.height(10.dp))
                    overview.topUsers.forEachIndexed { index, entry ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 8.dp)
                                .background(Color.White.copy(alpha = 0.04f), RoundedCornerShape(12.dp))
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                        ) {
                            Text(
                                "#${index + 1}",
                                color = PortalColors.TextFaint,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                            )
                            Spacer(Modifier.size(10.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    entry.name ?: entry.email,
                                    color = PortalColors.TextPrimary,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                                Text(
                                    entry.email,
                                    color = PortalColors.TextFaint,
                                    fontSize = 11.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                            Text(
                                entry.total.toString(),
                                color = PortalColors.Cyan,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }
            }
        }

        // Recent translations
        if (overview != null && overview.recentTranslations.isNotEmpty()) {
            Spacer(Modifier.height(12.dp))
            GlassCard {
                Column {
                    Text(
                        "Recent translations",
                        color = PortalColors.TextPrimary,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.height(10.dp))
                    overview.recentTranslations.forEach { log ->
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 10.dp)
                                .background(Color.White.copy(alpha = 0.04f), RoundedCornerShape(12.dp))
                                .padding(12.dp)
                        ) {
                            Text(
                                log.name ?: log.email,
                                color = PortalColors.TextSecondary,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(Modifier.height(6.dp))
                            Text(
                                log.sourceText,
                                color = PortalColors.TextPrimary,
                                fontSize = 13.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Text(
                                log.translatedText,
                                color = PortalColors.Cyan.copy(alpha = 0.85f),
                                fontSize = 13.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Spacer(Modifier.height(6.dp))
                            Text(
                                "→ ${log.targetLanguage} · ${log.wordCount} words · ${log.confidence}%",
                                color = PortalColors.TextFaint,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MemberRow(
    record: PortalUserRecord,
    isWorking: Boolean,
    onRole: (String) -> Unit,
    onToggleVerified: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 10.dp)
            .background(Color.White.copy(alpha = 0.04f), RoundedCornerShape(14.dp))
            .border(1.dp, PortalColors.GlassBorder, RoundedCornerShape(14.dp))
            .padding(14.dp)
    ) {
        Text(
            record.name ?: record.email,
            color = PortalColors.TextPrimary,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            "${record.email} · ${record.translationCount} translations",
            color = PortalColors.TextFaint,
            fontSize = 11.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(Modifier.height(8.dp))
        RoleBadge(role = record.role, verified = record.verified)

        Spacer(Modifier.height(10.dp))
        Row(
            modifier = Modifier
                .background(Color.Black.copy(alpha = 0.2f), RoundedCornerShape(10.dp))
                .padding(3.dp)
        ) {
            ROLES.forEach { role ->
                val selected = record.role == role
                Text(
                    if (role == "user") "member" else role,
                    color = if (selected) PortalColors.TextPrimary else PortalColors.TextFaint,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .background(
                            if (selected) Color.White.copy(alpha = 0.15f) else Color.Transparent,
                            RoundedCornerShape(8.dp),
                        )
                        .clickable(enabled = !isWorking && !selected) { onRole(role) }
                        .padding(horizontal = 10.dp, vertical = 6.dp),
                )
            }
        }

        Spacer(Modifier.height(8.dp))
        OutlinedButton(
            onClick = onToggleVerified,
            enabled = !isWorking,
            shape = RoundedCornerShape(10.dp),
        ) {
            Icon(
                Icons.Filled.Verified,
                contentDescription = null,
                tint = if (record.verified) Color(0xFFFF8A8A) else Color(0xFF63C0FF),
                modifier = Modifier.size(15.dp),
            )
            Spacer(Modifier.size(6.dp))
            Text(
                if (record.verified) "Revoke badge" else "Grant badge",
                color = PortalColors.TextSecondary,
                fontSize = 12.sp,
            )
        }
    }
}

@Composable
private fun StatTile(
    icon: ImageVector,
    label: String,
    value: Int,
    tint: Color,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .background(PortalColors.GlassFill, RoundedCornerShape(16.dp))
            .border(1.dp, PortalColors.GlassBorder, RoundedCornerShape(16.dp))
            .padding(16.dp)
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
        Spacer(Modifier.height(10.dp))
        Text(
            value.toString(),
            color = PortalColors.TextPrimary,
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
        )
        Text(label, color = PortalColors.TextFaint, fontSize = 10.sp, fontWeight = FontWeight.Bold)
    }
}
