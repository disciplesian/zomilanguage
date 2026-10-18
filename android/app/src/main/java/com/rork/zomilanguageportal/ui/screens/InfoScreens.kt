package com.rork.zomilanguageportal.ui.screens

import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.compose.animation.animateContentSize
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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rork.zomilanguageportal.BuildConfig
import com.rork.zomilanguageportal.data.InfoContent
import com.rork.zomilanguageportal.ui.components.GlassCard
import com.rork.zomilanguageportal.ui.theme.PortalColors

@Composable
private fun InfoScaffold(title: String, onBack: () -> Unit, content: @Composable () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        Column(
            modifier = Modifier
                .widthIn(max = 720.dp)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp)
                .padding(bottom = 24.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = PortalColors.TextPrimary)
                }
                Text(
                    title,
                    color = PortalColors.TextPrimary,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.semantics { heading() },
                )
            }
            Spacer(Modifier.height(8.dp))
            content()
        }
    }
}

@Composable
private fun SectionCard(section: InfoContent.Section, accent: androidx.compose.ui.graphics.Color = PortalColors.GlassBorder) {
    GlassCard(modifier = Modifier.border(1.dp, accent, RoundedCornerShape(20.dp))) {
        Column {
            Text(
                section.title,
                color = PortalColors.TextPrimary,
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.semantics { heading() },
            )
            section.body?.let {
                Spacer(Modifier.height(8.dp))
                Text(it, color = PortalColors.TextSecondary, fontSize = 15.sp, lineHeight = 22.sp)
            }
            section.paragraphs.forEach {
                Spacer(Modifier.height(8.dp))
                Text(it, color = PortalColors.TextSecondary, fontSize = 15.sp, lineHeight = 22.sp)
            }
            section.bullets.forEach {
                Spacer(Modifier.height(6.dp))
                Row {
                    Text("\u2022  ", color = PortalColors.Cyan, fontSize = 15.sp)
                    Text(it, color = PortalColors.TextSecondary, fontSize = 15.sp, lineHeight = 22.sp)
                }
            }
        }
    }
    Spacer(Modifier.height(12.dp))
}

@Composable
fun AboutScreen(onBack: () -> Unit) {
    val content = InfoContent.load(LocalContext.current)
    val accents = listOf(PortalColors.Cyan, PortalColors.Green, PortalColors.Pink)
    InfoScaffold("About", onBack) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
            Text("Zomi Translator", color = PortalColors.TextPrimary, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text("Version ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})", color = PortalColors.TextFaint, fontSize = 13.sp)
            Spacer(Modifier.height(4.dp))
            Text(content.about.tagline, color = PortalColors.TextSecondary, fontSize = 15.sp)
        }
        Spacer(Modifier.height(16.dp))
        content.about.sections.forEachIndexed { i, section ->
            SectionCard(section, accents[i % accents.size].copy(alpha = 0.4f))
        }
    }
}

@Composable
private fun LegalScreen(legal: InfoContent.Legal, lastUpdated: String, onBack: () -> Unit) {
    InfoScaffold(legal.title, onBack) {
        Text("Last updated $lastUpdated", color = PortalColors.TextFaint, fontSize = 13.sp)
        Spacer(Modifier.height(10.dp))
        GlassCard(modifier = Modifier.border(1.dp, PortalColors.Cyan.copy(alpha = 0.4f), RoundedCornerShape(20.dp))) {
            Column {
                Text("In short", color = PortalColors.TextPrimary, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                legal.summary.forEach {
                    Spacer(Modifier.height(8.dp))
                    Row {
                        Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = PortalColors.Green, modifier = Modifier.size(16.dp).padding(top = 2.dp))
                        Spacer(Modifier.size(8.dp))
                        Text(it, color = PortalColors.TextSecondary, fontSize = 15.sp, lineHeight = 22.sp)
                    }
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        Text(legal.intro, color = PortalColors.TextSecondary, fontSize = 15.sp, lineHeight = 22.sp)
        Spacer(Modifier.height(12.dp))
        legal.sections.forEach { SectionCard(it) }
    }
}

@Composable
fun PrivacyScreen(onBack: () -> Unit) {
    val content = InfoContent.load(LocalContext.current)
    LegalScreen(content.privacy, content.lastUpdated, onBack)
}

@Composable
fun TermsScreen(onBack: () -> Unit) {
    val content = InfoContent.load(LocalContext.current)
    LegalScreen(content.terms, content.lastUpdated, onBack)
}

@Composable
fun HelpScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val content = InfoContent.load(context)
    InfoScaffold(content.help.title.ifEmpty { "Help & Support" }, onBack) {
        Text(content.help.intro, color = PortalColors.TextSecondary, fontSize = 15.sp, lineHeight = 22.sp)
        Spacer(Modifier.height(14.dp))
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 52.dp)
                .background(PortalColors.Cyan, RoundedCornerShape(14.dp))
                .clickable {
                    val body = "\n\n\u2014\nApp: Zomi Translator ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})\nDevice: ${Build.MANUFACTURER} ${Build.MODEL}, Android ${Build.VERSION.RELEASE}"
                    val uri = Uri.parse("mailto:${content.supportEmail}?subject=${Uri.encode("Zomi Translator support")}&body=${Uri.encode(body)}")
                    runCatching { context.startActivity(Intent(Intent.ACTION_SENDTO, uri)) }
                }
                .padding(horizontal = 16.dp),
        ) {
            Icon(Icons.Filled.Email, contentDescription = null, tint = PortalColors.Canvas)
            Spacer(Modifier.size(10.dp))
            Text("Email support", color = PortalColors.Canvas, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(20.dp))
        Text("Frequently asked questions", color = PortalColors.TextPrimary, fontSize = 19.sp, fontWeight = FontWeight.Bold, modifier = Modifier.semantics { heading() })
        Spacer(Modifier.height(10.dp))
        content.help.faqs.forEach { faq ->
            var open by remember { mutableStateOf(false) }
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 10.dp)
                    .background(PortalColors.GlassFill, RoundedCornerShape(16.dp))
                    .border(1.dp, PortalColors.GlassBorder, RoundedCornerShape(16.dp))
                    .clickable { open = !open }
                    .padding(16.dp)
                    .animateContentSize(),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(faq.q, color = PortalColors.TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                    Icon(if (open) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore, contentDescription = if (open) "Collapse" else "Expand", tint = PortalColors.Cyan)
                }
                if (open) {
                    Spacer(Modifier.height(8.dp))
                    Text(faq.a, color = PortalColors.TextSecondary, fontSize = 15.sp, lineHeight = 22.sp)
                }
            }
        }
        Spacer(Modifier.height(10.dp))
        Text("Troubleshooting", color = PortalColors.TextPrimary, fontSize = 19.sp, fontWeight = FontWeight.Bold, modifier = Modifier.semantics { heading() })
        Spacer(Modifier.height(10.dp))
        GlassCard(modifier = Modifier.border(1.dp, PortalColors.Yellow.copy(alpha = 0.4f), RoundedCornerShape(20.dp))) {
            Column {
                content.help.troubleshooting.forEach { tip ->
                    Text(tip.title, color = PortalColors.TextPrimary, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    Text(tip.body, color = PortalColors.TextSecondary, fontSize = 14.sp, lineHeight = 20.sp)
                    Spacer(Modifier.height(10.dp))
                }
            }
        }
    }
}
