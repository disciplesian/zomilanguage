package com.rork.zomilanguageportal.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.rork.zomilanguageportal.data.AuthManager
import com.rork.zomilanguageportal.ui.components.GlassCard
import com.rork.zomilanguageportal.ui.theme.PortalColors

@Composable
fun TranslateScreen(
    modifier: Modifier = Modifier,
    viewModel: TranslateViewModel = viewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val user by AuthManager.user.collectAsStateWithLifecycle()
    val clipboard = LocalClipboardManager.current

    val sourceLabel = if (state.zomiToEnglish) "Zomi" else "English"
    val targetLabel = if (state.zomiToEnglish) "English" else "Zomi"

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp)
            .padding(bottom = 24.dp)
    ) {
        Spacer(Modifier.height(12.dp))

        Text(
            "Translator",
            color = PortalColors.TextPrimary,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
        )
        Text(
            user?.name ?: user?.email ?: "",
            color = PortalColors.TextFaint,
            fontSize = 13.sp,
            modifier = Modifier.padding(top = 2.dp),
        )

        Spacer(Modifier.height(16.dp))

        // Direction switch
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(PortalColors.GlassFill, RoundedCornerShape(14.dp))
                .border(1.dp, PortalColors.GlassBorder, RoundedCornerShape(14.dp))
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                "$sourceLabel  →  $targetLabel",
                color = PortalColors.TextPrimary,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
            )
            TextButton(onClick = { viewModel.swapDirection() }) {
                Icon(Icons.Filled.SwapHoriz, contentDescription = "Swap languages", tint = PortalColors.Cyan)
                Spacer(Modifier.size(6.dp))
                Text("Swap", color = PortalColors.Cyan, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            }
        }

        Spacer(Modifier.height(12.dp))

        // Input
        GlassCard {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        sourceLabel.uppercase(),
                        color = PortalColors.TextFaint,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        "${state.input.length}/${TranslateViewModel.MAX_CHARS}",
                        color = PortalColors.TextFaint,
                        fontSize = 11.sp,
                    )
                }

                Spacer(Modifier.height(10.dp))

                Box {
                    if (state.input.isEmpty()) {
                        Text(
                            "Type or paste $sourceLabel text…",
                            color = PortalColors.TextFaint,
                            fontSize = 17.sp,
                        )
                    }
                    BasicTextField(
                        value = state.input,
                        onValueChange = viewModel::onInputChange,
                        textStyle = LocalTextStyle.current.copy(
                            color = PortalColors.TextPrimary,
                            fontSize = 17.sp,
                            lineHeight = 25.sp,
                        ),
                        cursorBrush = SolidColor(PortalColors.Cyan),
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 100.dp),
                    )
                }

                Spacer(Modifier.height(14.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Button(
                        onClick = { viewModel.translate() },
                        enabled = !state.isTranslating && state.input.isNotBlank(),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = PortalColors.Cyan,
                            contentColor = PortalColors.Canvas,
                            disabledContainerColor = PortalColors.Cyan.copy(alpha = 0.3f),
                            disabledContentColor = PortalColors.Canvas.copy(alpha = 0.5f),
                        ),
                    ) {
                        if (state.isTranslating) {
                            CircularProgressIndicator(
                                color = PortalColors.Canvas,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(16.dp),
                            )
                        } else {
                            Icon(
                                Icons.Filled.AutoAwesome,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                            )
                        }
                        Spacer(Modifier.size(8.dp))
                        Text("Translate", fontWeight = FontWeight.SemiBold)
                    }

                    if (state.input.isNotEmpty() || state.output.isNotEmpty()) {
                        Spacer(Modifier.size(8.dp))
                        TextButton(onClick = { viewModel.clear() }) {
                            Icon(
                                Icons.Filled.Delete,
                                contentDescription = null,
                                tint = PortalColors.TextMuted,
                                modifier = Modifier.size(18.dp),
                            )
                            Spacer(Modifier.size(6.dp))
                            Text("Clear", color = PortalColors.TextMuted, fontSize = 14.sp)
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        // Output
        GlassCard {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text(
                            targetLabel.uppercase(),
                            color = PortalColors.Cyan,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                        )
                        if (state.output.isNotEmpty() && !state.isTranslating) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .background(PortalColors.Blue.copy(alpha = 0.16f), RoundedCornerShape(50))
                                    .border(1.dp, PortalColors.Blue.copy(alpha = 0.35f), RoundedCornerShape(50))
                                    .padding(horizontal = 8.dp, vertical = 3.dp),
                            ) {
                                Icon(
                                    Icons.Filled.Verified,
                                    contentDescription = null,
                                    tint = Color(0xFF63C0FF),
                                    modifier = Modifier.size(11.dp)
                                )
                                Spacer(Modifier.size(3.dp))
                                Text(
                                    "Official",
                                    color = Color(0xFF63C0FF),
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }
                    }
                    if (state.confidence > 0) {
                        Text(
                            "${state.confidence}% confidence",
                            color = Color(0xFF7DFFC0),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier
                                .background(
                                    PortalColors.Green.copy(alpha = 0.12f),
                                    RoundedCornerShape(50)
                                )
                                .padding(horizontal = 8.dp, vertical = 3.dp),
                        )
                    }
                }

                Spacer(Modifier.height(10.dp))

                Box(modifier = Modifier.heightIn(min = 100.dp)) {
                    when {
                        state.output.isNotEmpty() -> Text(
                            state.output,
                            color = PortalColors.TextPrimary,
                            fontSize = 17.sp,
                            lineHeight = 25.sp,
                        )
                        state.isTranslating -> Row(verticalAlignment = Alignment.CenterVertically) {
                            CircularProgressIndicator(
                                color = PortalColors.Cyan,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(16.dp),
                            )
                            Spacer(Modifier.size(8.dp))
                            Text("Translating…", color = PortalColors.TextFaint, fontSize = 15.sp)
                        }
                        else -> Text(
                            "Your translation will appear here.",
                            color = PortalColors.TextFaint,
                            fontSize = 17.sp,
                        )
                    }
                }

                if (state.output.isNotEmpty() && !state.isTranslating) {
                    Spacer(Modifier.height(12.dp))
                    TextButton(
                        onClick = { clipboard.setText(AnnotatedString(state.output)) },
                    ) {
                        Icon(
                            Icons.Filled.ContentCopy,
                            contentDescription = null,
                            tint = PortalColors.TextSecondary,
                            modifier = Modifier.size(16.dp),
                        )
                        Spacer(Modifier.size(6.dp))
                        Text("Copy", color = PortalColors.TextSecondary, fontSize = 14.sp)
                    }
                }
            }
        }

        state.error?.let { message ->
            Spacer(Modifier.height(12.dp))
            Text(
                message,
                color = Color(0xFFFFB3B3),
                fontSize = 14.sp,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(PortalColors.Red.copy(alpha = 0.12f), RoundedCornerShape(12.dp))
                    .border(1.dp, PortalColors.Red.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                    .padding(14.dp),
            )
        }

        Spacer(Modifier.height(20.dp))

        Text(
            "TRY A PHRASE",
            color = PortalColors.TextFaint,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
        )
        Spacer(Modifier.height(10.dp))
        Row(modifier = Modifier.horizontalScroll(rememberScrollState())) {
            TranslateViewModel.SUGGESTIONS.forEach { phrase ->
                Text(
                    phrase,
                    color = PortalColors.TextSecondary,
                    fontSize = 14.sp,
                    modifier = Modifier
                        .padding(end = 8.dp)
                        .background(Color.White.copy(alpha = 0.05f), RoundedCornerShape(50))
                        .border(1.dp, PortalColors.GlassBorder, RoundedCornerShape(50))
                        .clickable { viewModel.useSuggestion(phrase) }
                        .padding(horizontal = 16.dp, vertical = 9.dp),
                )
            }
        }
    }
}
