package com.rork.zomilanguageportal.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Gavel
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.PrivacyTip
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rork.zomilanguageportal.data.AppConfig
import com.rork.zomilanguageportal.ui.components.GlassCard
import com.rork.zomilanguageportal.ui.theme.PortalColors

@Composable
fun AboutScreen(modifier: Modifier = Modifier) {
    val context = LocalContext.current

    fun open(url: String) {
        runCatching {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        }
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp)
            .padding(bottom = 24.dp)
    ) {
        Spacer(Modifier.height(12.dp))
        Text(
            "About",
            color = PortalColors.TextPrimary,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
        )
        Spacer(Modifier.height(16.dp))

        GlassCard {
            Column {
                Text(
                    "Zomi Language Portal",
                    color = PortalColors.TextPrimary,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    "A members-only Zomi translation service and community portal. Your account, " +
                        "history and verification status work across iPhone, Android and the web.",
                    color = PortalColors.TextMuted,
                    fontSize = 14.sp,
                    lineHeight = 21.sp,
                )
                Spacer(Modifier.height(12.dp))
                Text("Version 1.0", color = PortalColors.TextFaint, fontSize = 12.sp)
            }
        }

        Spacer(Modifier.height(12.dp))

        GlassCard {
            Column {
                Text(
                    "Support & legal",
                    color = PortalColors.TextPrimary,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(12.dp))

                LinkRow(Icons.Filled.Email, "Contact support", PortalColors.Cyan) {
                    open("mailto:${AppConfig.SUPPORT_EMAIL}")
                }
                LinkRow(Icons.Filled.Language, "Visit the web portal", PortalColors.Green) {
                    open(AppConfig.WEBSITE_URL)
                }
                LinkRow(Icons.Filled.Shield, "Support & FAQ", PortalColors.Purple) {
                    open("${AppConfig.WEBSITE_URL}/support")
                }
                LinkRow(Icons.Filled.PrivacyTip, "Privacy Policy", PortalColors.Blue) {
                    open("${AppConfig.WEBSITE_URL}/privacy")
                }
                LinkRow(Icons.Filled.Gavel, "Terms of Use", PortalColors.Yellow) {
                    open("${AppConfig.WEBSITE_URL}/terms")
                }
                LinkRow(Icons.Filled.PrivacyTip, "Your privacy choices", PortalColors.Pink) {
                    open("${AppConfig.WEBSITE_URL}/privacy-choices")
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        GlassCard {
            Column {
                Text(
                    "AI translation notice",
                    color = PortalColors.TextPrimary,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    "Translations are produced by artificial intelligence and may contain errors. " +
                        "The text you submit is sent to our AI provider to generate a result. " +
                        "Please have important material reviewed by a fluent speaker.",
                    color = PortalColors.TextMuted,
                    fontSize = 13.sp,
                    lineHeight = 20.sp,
                )
            }
        }
    }
}

@Composable
private fun LinkRow(icon: ImageVector, label: String, tint: Color, onClick: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 8.dp)
            .background(Color.White.copy(alpha = 0.04f), RoundedCornerShape(12.dp))
            .border(1.dp, PortalColors.GlassBorder, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 13.dp),
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(18.dp))
        Spacer(Modifier.size(12.dp))
        Text(
            label,
            color = PortalColors.TextPrimary,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.weight(1f),
        )
        Icon(
            Icons.AutoMirrored.Filled.OpenInNew,
            contentDescription = null,
            tint = PortalColors.TextFaint,
            modifier = Modifier.size(16.dp),
        )
    }
}
