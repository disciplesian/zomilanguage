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
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import com.rork.zomilanguageportal.data.DictionaryEntry
import com.rork.zomilanguageportal.data.Suggestion
import com.rork.zomilanguageportal.ui.components.GlassCard
import com.rork.zomilanguageportal.ui.theme.PortalColors

/** Chip color per part-of-speech category, tuned for the dark portal theme. */
private fun categoryColor(category: String): Color = when (category) {
    "noun" -> Color(0xFF63C0FF)
    "verb" -> Color(0xFF00F0FF)
    "adjective" -> Color(0xFFB98CFF)
    "adverb" -> Color(0xFFFFB84D)
    "preposition" -> Color(0xFFFF8FA3)
    "pronoun" -> Color(0xFF7EE8A2)
    "conjunction" -> Color(0xFFFFD166)
    "interjection" -> Color(0xFFFF7B72)
    "prefix" -> Color(0xFF9CD1FF)
    "particle" -> Color(0xFFC9B8FF)
    "article" -> Color(0xFFA0D2DB)
    else -> Color(0xFF9BA3AF)
}

/** Dictionary tab — instant search over the 10,620 verified English ⇄ Zomi
 *  entries bundled with the app, with a Zomi AI fallback for words that are
 *  not in the verified dataset. */
@Composable
fun DictionaryScreen(viewModel: DictionaryViewModel = viewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val clipboard = LocalClipboardManager.current
    val haptics = LocalHapticFeedback.current

    fun copy(text: String) {
        clipboard.setText(AnnotatedString(text))
        haptics.performHapticFeedback(HapticFeedbackType.LongPress)
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp),
    ) {
        item {
            Column(modifier = Modifier.padding(top = 16.dp, bottom = 12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(Icons.Filled.MenuBook, contentDescription = null, tint = PortalColors.Cyan)
                    Text(
                        "Zomi Dictionary",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = PortalColors.TextPrimary,
                    )
                    Spacer(Modifier.weight(1f))
                    Text(
                        "Offline ready",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = PortalColors.Yellow,
                        modifier = Modifier
                            .background(PortalColors.Yellow.copy(alpha = 0.12f), RoundedCornerShape(50))
                            .border(1.dp, PortalColors.Yellow.copy(alpha = 0.35f), RoundedCornerShape(50))
                            .padding(horizontal = 8.dp, vertical = 3.dp),
                    )
                }
                Text(
                    "${"%,d".format(state.totalCount)} verified entries · English ⇄ Zomi",
                    fontSize = 13.sp,
                    color = PortalColors.TextSecondary,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }

        item {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(PortalColors.GlassFill, RoundedCornerShape(14.dp))
                    .border(1.dp, PortalColors.GlassBorder, RoundedCornerShape(14.dp))
                    .padding(horizontal = 14.dp, vertical = 12.dp),
            ) {
                Icon(Icons.Filled.Search, contentDescription = null, tint = PortalColors.TextMuted)
                Spacer(Modifier.width(10.dp))
                BasicTextField(
                    value = state.query,
                    onValueChange = viewModel::onQueryChange,
                    singleLine = true,
                    textStyle = TextStyle(fontSize = 16.sp, color = PortalColors.TextPrimary),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Text,
                        imeAction = ImeAction.Search,
                    ),
                    keyboardActions = KeyboardActions.Default,
                    decorationBox = { inner ->
                        Box(Modifier.fillMaxWidth()) {
                            if (state.query.isEmpty()) {
                                Text(
                                    "Search English or Zomi...",
                                    fontSize = 16.sp,
                                    color = PortalColors.TextFaint,
                                )
                            }
                            inner()
                        }
                    },
                    modifier = Modifier.weight(1f),
                )
                if (state.query.isNotEmpty()) {
                    Spacer(Modifier.width(8.dp))
                    Icon(
                        Icons.Filled.Close,
                        contentDescription = "Clear search",
                        tint = PortalColors.TextMuted,
                        modifier = Modifier
                            .size(20.dp)
                            .clickable { viewModel.onQueryChange("") },
                    )
                }
            }
        }

        if (state.query.trim().isNotEmpty() && state.suggestions.isNotEmpty()) {
            item {
                SuggestionPanel(state.suggestions) { viewModel.onQueryChange(it) }
            }
        }

        item {
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.padding(vertical = 12.dp),
            ) {
                DirectionChip("English → Zomi", state.englishToZomi) { viewModel.onDirectionChange(true) }
                DirectionChip("Zomi → English", !state.englishToZomi) { viewModel.onDirectionChange(false) }
            }
        }

        val trimmed = state.query.trim()
        if (trimmed.isNotEmpty() && state.results.isNotEmpty()) {
            item {
                val count = if (state.results.size == 60) "60+" else state.results.size.toString()
                Text(
                    "$count verified ${if (state.results.size == 1) "match" else "matches"} for \"$trimmed\"",
                    fontSize = 12.sp,
                    color = PortalColors.TextFaint,
                    modifier = Modifier.padding(bottom = 8.dp),
                )
            }
        }

        if (trimmed.isEmpty()) {
            item {
                LetterIndex(
                    letters = state.browseLetters,
                    selected = state.selectedLetter,
                    onSelect = viewModel::onLetterSelect,
                )
            }
            item {
                Text(
                    "${"%,d".format(state.browseEntries.size)} ${if (state.browseEntries.size == 1) "entry" else "entries"} under \"${state.selectedLetter}\"",
                    fontSize = 12.sp,
                    color = PortalColors.TextFaint,
                    modifier = Modifier.padding(bottom = 8.dp),
                )
            }
            items(
                state.browseEntries.size,
                key = { i -> "$i|${state.browseEntries[i].english}|${state.browseEntries[i].zomi}" },
            ) { i ->
                EntryRow(state.browseEntries[i]) { copy(it) }
            }
        } else {
            items(state.results.size, key = { i -> "${state.results[i].english}|${state.results[i].pos}|${state.results[i].zomi}" }) { i ->
                EntryRow(state.results[i]) { copy(it) }
            }
        }

        if (state.needsAI || state.isAskingAI || state.aiResult != null || state.aiError != null) {
            item { AICard(state) { copy(it) } }
        }

        item { Spacer(Modifier.height(24.dp)) }
    }
}

/** Real-time search suggestions under the search bar; tapping one completes
 *  the query and re-runs the verified dictionary search. */
@Composable
private fun SuggestionPanel(suggestions: List<Suggestion>, onPick: (String) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 10.dp)
            .background(PortalColors.GlassFill, RoundedCornerShape(14.dp))
            .border(1.dp, PortalColors.GlassBorder, RoundedCornerShape(14.dp)),
    ) {
        suggestions.forEachIndexed { i, s ->
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onPick(s.text) }
                    .padding(horizontal = 12.dp, vertical = 10.dp),
            ) {
                Icon(
                    Icons.Filled.Search,
                    contentDescription = null,
                    tint = PortalColors.TextMuted,
                    modifier = Modifier.size(14.dp),
                )
                Text(
                    s.text,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = PortalColors.TextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false),
                )
                Spacer(Modifier.weight(1f))
                Text(
                    s.hint,
                    fontSize = 12.sp,
                    color = Color(0xFF80F7FF),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false),
                )
            }
            if (i < suggestions.lastIndex) {
                HorizontalDivider(
                    color = PortalColors.GlassBorder,
                    modifier = Modifier.padding(start = 36.dp),
                )
            }
        }
    }
}

@Composable
private fun DirectionChip(label: String, active: Boolean, onClick: () -> Unit) {
    Text(
        label,
        fontSize = 12.sp,
        fontWeight = FontWeight.SemiBold,
        color = if (active) PortalColors.Cyan else PortalColors.TextSecondary,
        modifier = Modifier
            .background(
                if (active) PortalColors.Cyan.copy(alpha = 0.12f) else PortalColors.GlassFill,
                RoundedCornerShape(50),
            )
            .border(
                1.dp,
                if (active) PortalColors.Cyan.copy(alpha = 0.4f) else PortalColors.GlassBorder,
                RoundedCornerShape(50),
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp),
    )
}

@Composable
private fun LetterIndex(letters: List<String>, selected: String, onSelect: (String) -> Unit) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(vertical = 4.dp),
    ) {
        letters.forEach { letter ->
            val active = letter == selected
            Text(
                letter,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = if (active) PortalColors.Cyan else PortalColors.TextSecondary,
                modifier = Modifier
                    .size(36.dp)
                    .background(
                        if (active) PortalColors.Cyan.copy(alpha = 0.12f) else PortalColors.GlassFill,
                        RoundedCornerShape(12.dp),
                    )
                    .border(
                        1.dp,
                        if (active) PortalColors.Cyan.copy(alpha = 0.4f) else PortalColors.GlassBorder,
                        RoundedCornerShape(12.dp),
                    )
                    .clickable { onSelect(letter) }
                    .wrapContentSize(Alignment.Center),
            )
        }
    }
}

@Composable
private fun EntryRow(entry: DictionaryEntry, onCopy: (String) -> Unit) {
    val posColor = categoryColor(entry.category)
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 10.dp)
            .background(PortalColors.GlassFill, RoundedCornerShape(16.dp))
            .border(1.dp, PortalColors.GlassBorder, RoundedCornerShape(16.dp))
            .clickable { onCopy(entry.zomi) }
            .padding(14.dp),
    ) {
        Column(Modifier.weight(1f)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(entry.english, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = PortalColors.TextPrimary)
                Text(
                    entry.pos.ifEmpty { entry.category },
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = posColor,
                    modifier = Modifier
                        .background(posColor.copy(alpha = 0.15f), RoundedCornerShape(50))
                        .border(1.dp, posColor.copy(alpha = 0.35f), RoundedCornerShape(50))
                        .padding(horizontal = 8.dp, vertical = 2.dp),
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier
                        .background(PortalColors.Green.copy(alpha = 0.12f), RoundedCornerShape(50))
                        .border(1.dp, PortalColors.Green.copy(alpha = 0.35f), RoundedCornerShape(50))
                        .padding(horizontal = 8.dp, vertical = 2.dp),
                ) {
                    Text("✓ Verified", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = PortalColors.Green)
                }
            }
            Text(
                entry.zomi,
                fontSize = 15.sp,
                color = Color(0xFF80F7FF),
                modifier = Modifier.padding(top = 4.dp),
            )
        }
        Text("⧉", fontSize = 16.sp, color = PortalColors.TextMuted, modifier = Modifier.padding(start = 8.dp))
    }
}

@Composable
private fun AICard(state: DictionaryUiState, onCopy: (String) -> Unit) {
    GlassCard(modifier = Modifier.padding(top = 4.dp)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(Icons.Filled.AutoAwesome, contentDescription = null, tint = PortalColors.Yellow)
            Text(
                "No verified entry for \"${state.query.trim()}\"",
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = PortalColors.TextSecondary,
            )
        }
        Spacer(Modifier.height(12.dp))
        when {
            state.isAskingAI -> Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    strokeWidth = 2.dp,
                    color = PortalColors.Yellow,
                )
                Text("Asking Zomi AI...", fontSize = 14.sp, color = PortalColors.TextSecondary)
            }

            state.aiResult != null -> Column {
                Text(
                    state.aiResult,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = PortalColors.TextPrimary,
                )
                Spacer(Modifier.height(12.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "✦ Zomi AI",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = PortalColors.Yellow,
                        modifier = Modifier
                            .background(PortalColors.Yellow.copy(alpha = 0.12f), RoundedCornerShape(50))
                            .border(1.dp, PortalColors.Yellow.copy(alpha = 0.35f), RoundedCornerShape(50))
                            .padding(horizontal = 8.dp, vertical = 3.dp),
                    )
                    Spacer(Modifier.weight(1f))
                    Text(
                        "⧉",
                        fontSize = 16.sp,
                        color = PortalColors.TextSecondary,
                        modifier = Modifier
                            .background(PortalColors.GlassFill, RoundedCornerShape(50))
                            .clickable { state.aiResult?.let(onCopy) }
                            .padding(8.dp),
                    )
                }
            }

            state.aiError != null -> Text(
                state.aiError,
                fontSize = 13.sp,
                color = PortalColors.TextSecondary,
            )
        }
    }
}
