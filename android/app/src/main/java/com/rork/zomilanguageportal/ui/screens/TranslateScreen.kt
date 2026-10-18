package com.rork.zomilanguageportal.ui.screens

import android.content.Intent
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.ContentPaste
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.rork.zomilanguageportal.data.AuthManager
import com.rork.zomilanguageportal.ui.components.GlassCard
import com.rork.zomilanguageportal.ui.components.rememberIsOnline
import com.rork.zomilanguageportal.ui.theme.PortalColors

/** Translate screen: instant dictionary words, streaming sentences, and a
 *  keyboard that closes on scroll, outside taps, and Done. Wide screens show
 *  input and result side by side. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun TranslateScreen(
    onOpenSettings: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: TranslateViewModel = viewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val user by AuthManager.user.collectAsStateWithLifecycle()
    val focusManager = LocalFocusManager.current
    val clipboard = LocalClipboardManager.current
    val haptics = LocalHapticFeedback.current
    val context = LocalContext.current
    val isOnline = rememberIsOnline()

    var swapTurns by remember { mutableFloatStateOf(0f) }
    val rotation by animateFloatAsState(swapTurns, label = "swap")

    val dismissOnScroll = remember(focusManager) {
        object : NestedScrollConnection {
            override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                if (available.y != 0f) focusManager.clearFocus()
                return Offset.Zero
            }
        }
    }

    fun copy() {
        clipboard.setText(AnnotatedString(state.output))
        haptics.performHapticFeedback(HapticFeedbackType.LongPress)
        Toast.makeText(context, "Copied", Toast.LENGTH_SHORT).show()
    }

    fun share() {
        val text = "${state.sourceLabel}: ${state.input.trim()}\n\n${state.targetLabel}: ${state.output}\n\nTranslated with Zomi Translator"
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
        }
        context.startActivity(Intent.createChooser(intent, "Share translation"))
    }

    BoxWithConstraints(
        modifier = modifier
            .fillMaxSize()
            .pointerInput(Unit) { detectTapGestures(onTap = { focusManager.clearFocus() }) },
    ) {
        val wide = maxWidth >= 600.dp
        Column(
            modifier = Modifier
                .fillMaxSize()
                .nestedScroll(dismissOnScroll)
                .verticalScroll(rememberScrollState())
                .imePadding()
                .padding(horizontal = if (wide) 32.dp else 16.dp)
                .padding(bottom = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Column(modifier = Modifier.widthIn(max = 1100.dp).fillMaxWidth()) {
                Spacer(Modifier.height(12.dp))
                Text(
                    "ZOMI TRANSLATOR",
                    color = PortalColors.Cyan,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 0.6.sp,
                    modifier = Modifier.semantics { heading() },
                )
                Text("Zomi \u21C4 English", color = PortalColors.TextSecondary, fontSize = 14.sp)
                Spacer(Modifier.height(14.dp))

                if (!isOnline) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(PortalColors.Yellow.copy(alpha = 0.12f), RoundedCornerShape(12.dp))
                            .border(1.dp, PortalColors.Yellow.copy(alpha = 0.35f), RoundedCornerShape(12.dp))
                            .padding(12.dp),
                    ) {
                        Icon(Icons.Filled.WifiOff, contentDescription = null, tint = PortalColors.Yellow, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.size(10.dp))
                        Text("Offline: dictionary words still work.", color = PortalColors.Yellow, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                    }
                    Spacer(Modifier.height(12.dp))
                }

                // Language selector
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(PortalColors.Cyan.copy(alpha = 0.08f), RoundedCornerShape(18.dp))
                        .border(1.dp, PortalColors.Cyan.copy(alpha = 0.35f), RoundedCornerShape(18.dp))
                        .padding(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    LanguagePill(state.sourceLabel, highlighted = false, modifier = Modifier.weight(1f))
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(48.dp)
                            .background(Brush.linearGradient(listOf(PortalColors.Cyan, PortalColors.Purple)), CircleShape)
                            .clickable {
                                haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                focusManager.clearFocus()
                                swapTurns += 180f
                                viewModel.swapDirection()
                            }
                            .semantics { contentDescription = "Swap languages" },
                    ) {
                        Icon(Icons.Filled.SwapHoriz, contentDescription = null, tint = Color.White, modifier = Modifier.rotate(rotation))
                    }
                    LanguagePill(state.targetLabel, highlighted = true, modifier = Modifier.weight(1f))
                }

                Spacer(Modifier.height(12.dp))

                val inputCard: @Composable (Modifier) -> Unit = { m ->
                    GlassCard(modifier = m) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(state.sourceLabel, color = PortalColors.TextPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                                IconButton(onClick = {
                                    clipboard.getText()?.text?.takeIf { it.isNotEmpty() }?.let { viewModel.onInputChange(it) }
                                }) {
                                    Icon(Icons.Filled.ContentPaste, contentDescription = "Paste", tint = PortalColors.TextSecondary)
                                }
                                if (state.input.isNotEmpty()) {
                                    IconButton(onClick = { viewModel.clear() }) {
                                        Icon(Icons.Filled.Cancel, contentDescription = "Clear text", tint = PortalColors.TextSecondary)
                                    }
                                }
                            }
                            Box {
                                if (state.input.isEmpty()) {
                                    Text("Type ${state.sourceLabel} text\u2026", color = PortalColors.TextFaint, fontSize = 19.sp)
                                }
                                BasicTextField(
                                    value = state.input,
                                    onValueChange = viewModel::onInputChange,
                                    textStyle = TextStyle(color = PortalColors.TextPrimary, fontSize = 19.sp, lineHeight = 27.sp),
                                    cursorBrush = SolidColor(PortalColors.Cyan),
                                    keyboardOptions = KeyboardOptions(
                                        capitalization = KeyboardCapitalization.None,
                                        autoCorrectEnabled = false,
                                        keyboardType = KeyboardType.Text,
                                        imeAction = ImeAction.Done,
                                    ),
                                    keyboardActions = KeyboardActions(onDone = {
                                        focusManager.clearFocus()
                                        viewModel.translateNow()
                                    }),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .heightIn(min = if (wide) 180.dp else 96.dp)
                                        .semantics { contentDescription = "Text to translate from ${state.sourceLabel}" },
                                )
                            }
                            Spacer(Modifier.height(8.dp))
                            val limit = if (user == null) TranslateViewModel.GUEST_MAX_CHARS else TranslateViewModel.MAX_CHARS
                            Text("${state.input.length}/$limit", color = PortalColors.TextFaint, fontSize = 12.sp)
                        }
                    }
                }

                val outputCard: @Composable (Modifier) -> Unit = { m ->
                    GlassCard(modifier = m) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(state.targetLabel, color = PortalColors.TextPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                                if (state.isVerifiedWord && state.output.isNotEmpty()) {
                                    Spacer(Modifier.size(8.dp))
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier
                                            .background(PortalColors.Blue.copy(alpha = 0.18f), RoundedCornerShape(50))
                                            .padding(horizontal = 8.dp, vertical = 3.dp),
                                    ) {
                                        Icon(Icons.Filled.Verified, contentDescription = null, tint = Color(0xFF7CC8FF), modifier = Modifier.size(12.dp))
                                        Spacer(Modifier.size(4.dp))
                                        Text("Dictionary", color = Color(0xFF7CC8FF), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                                Spacer(Modifier.weight(1f))
                                val hasResult = state.output.isNotEmpty() && state.error == null && !state.isTranslating
                                if (hasResult) {
                                    IconButton(onClick = { share() }) {
                                        Icon(Icons.Filled.Share, contentDescription = "Share translation", tint = PortalColors.TextSecondary)
                                    }
                                    IconButton(onClick = { copy() }) {
                                        Icon(Icons.Filled.ContentCopy, contentDescription = "Copy translation", tint = PortalColors.TextSecondary)
                                    }
                                }
                            }
                            Spacer(Modifier.height(6.dp))
                            Box(modifier = Modifier.heightIn(min = if (wide) 180.dp else 80.dp).fillMaxWidth()) {
                                when {
                                    state.error != null -> Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                                        Text(
                                            state.error ?: "",
                                            color = PortalColors.TextSecondary,
                                            fontSize = 15.sp,
                                            lineHeight = 21.sp,
                                        )
                                        Spacer(Modifier.height(10.dp))
                                        if (state.isLimitNotice) {
                                            PillButton("Sign in", filled = true, onClick = onOpenSettings)
                                        } else {
                                            PillButton("Try again", filled = false, onClick = { viewModel.retry() })
                                        }
                                    }
                                    state.output.isNotEmpty() -> Text(state.output, color = PortalColors.TextPrimary, fontSize = 19.sp, lineHeight = 27.sp)
                                    state.isTranslating -> Row(verticalAlignment = Alignment.CenterVertically) {
                                        CircularProgressIndicator(color = PortalColors.Cyan, strokeWidth = 2.dp, modifier = Modifier.size(18.dp))
                                        Spacer(Modifier.size(10.dp))
                                        Text(if (state.isConnecting) "Connecting\u2026" else "Translating\u2026", color = PortalColors.TextMuted, fontSize = 15.sp)
                                    }
                                    else -> Text("Translation appears here", color = PortalColors.TextFaint, fontSize = 19.sp)
                                }
                            }
                            AnimatedVisibility(state.alternatives.isNotEmpty() && state.error == null && !state.isTranslating) {
                                Column {
                                    Spacer(Modifier.height(10.dp))
                                    Text("ALSO", color = PortalColors.TextFaint, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    Spacer(Modifier.height(6.dp))
                                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        state.alternatives.forEach { alternative ->
                                            Text(
                                                alternative,
                                                color = PortalColors.TextPrimary,
                                                fontSize = 14.sp,
                                                modifier = Modifier
                                                    .background(PortalColors.Cyan.copy(alpha = 0.08f), RoundedCornerShape(50))
                                                    .border(1.dp, PortalColors.Cyan.copy(alpha = 0.25f), RoundedCornerShape(50))
                                                    .clickable { viewModel.promoteAlternative(alternative) }
                                                    .padding(horizontal = 14.dp, vertical = 10.dp),
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                if (wide) {
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        inputCard(Modifier.weight(1f))
                        outputCard(Modifier.weight(1f))
                    }
                } else {
                    inputCard(Modifier)
                    Spacer(Modifier.height(12.dp))
                    outputCard(Modifier)
                }

                state.freeWordsLeft?.takeIf { it > 0 && user == null }?.let { left ->
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "Free today: $left words left",
                        color = PortalColors.TextMuted,
                        fontSize = 13.sp,
                        modifier = Modifier.align(Alignment.CenterHorizontally),
                    )
                }
            }
        }
    }
}

@Composable
private fun LanguagePill(label: String, highlighted: Boolean, modifier: Modifier = Modifier) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .heightIn(min = 48.dp)
            .background(PortalColors.Cyan.copy(alpha = if (highlighted) 0.22f else 0.10f), RoundedCornerShape(12.dp)),
    ) {
        Text(
            label,
            color = if (highlighted) PortalColors.Cyan else PortalColors.TextPrimary,
            fontSize = 17.sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
internal fun PillButton(label: String, filled: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    TextButton(
        onClick = onClick,
        modifier = modifier
            .heightIn(min = 44.dp)
            .background(if (filled) PortalColors.Cyan else Color.White.copy(alpha = 0.1f), RoundedCornerShape(50)),
    ) {
        Text(
            label,
            color = if (filled) PortalColors.Canvas else PortalColors.TextPrimary,
            fontWeight = FontWeight.SemiBold,
            fontSize = 15.sp,
            modifier = Modifier.padding(horizontal = 10.dp),
        )
    }
}
