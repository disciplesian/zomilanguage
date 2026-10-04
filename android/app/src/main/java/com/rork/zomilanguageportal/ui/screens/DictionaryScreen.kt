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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Refresh
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
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import com.rork.zomilanguageportal.data.DictionaryEntry
import com.rork.zomilanguageportal.data.DictionaryRepository
import com.rork.zomilanguageportal.data.Suggestion
import com.rork.zomilanguageportal.ui.components.GlassCard
import com.rork.zomilanguageportal.ui.theme.PortalColors

/** Entries shown per letter in browse mode before the user expands the list. */
private const val BROWSE_PREVIEW_COUNT = 4

/** Renders text with every occurrence of the query bolded and accented, so the
 *  matching substring stands out inside the word. Case-insensitive. */
private fun highlighted(text: String, query: String, matchColor: Color): AnnotatedString {
    val q = query.trim().lowercase()
    if (q.isEmpty()) return AnnotatedString(text)
    return buildAnnotatedString {
        var start = 0
        var idx = text.indexOf(q, startIndex = start, ignoreCase = true)
        while (idx != -1) {
            if (idx > start) append(text.substring(start, idx))
            withStyle(SpanStyle(fontWeight = FontWeight.ExtraBold, color = matchColor)) {
                append(text.substring(idx, idx + q.length))
            }
            start = idx + q.length
            idx = text.indexOf(q, startIndex = start, ignoreCase = true)
        }
        if (start < text.length) append(text.substring(start))
    }
}

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

/** Dictionary tab — instant search over the 33,444 English ⇄ Zomi
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
                    Icon(
                        imageVector = Icons.Filled.Refresh,
                        contentDescription = "Check for dictionary updates",
                        tint = if (state.isRefreshing) PortalColors.Cyan else PortalColors.TextMuted,
                        modifier = Modifier
                            .size(20.dp)
                            .clickable(enabled = !state.isRefreshing) { viewModel.refreshDictionary() },
                    )
                    Spacer(Modifier.width(8.dp))
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
            val visibleEntries =
                if (state.browseExpanded) state.browseEntries else state.browseEntries.take(BROWSE_PREVIEW_COUNT)
            items(
                visibleEntries.size,
                key = { i -> "$i|${visibleEntries[i].english}|${visibleEntries[i].zomi}" },
            ) { i ->
                EntryRow(visibleEntries[i], trimmed) { viewModel.openDetail(it) }
            }
            if (state.browseEntries.size > BROWSE_PREVIEW_COUNT) {
                item {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .padding(top = 4.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            if (state.browseExpanded) {
                                "Show fewer entries"
                            } else {
                                "Show all ${"%,d".format(state.browseEntries.size)} entries"
                            },
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = PortalColors.Cyan,
                            modifier = Modifier
                                .background(PortalColors.GlassFill, RoundedCornerShape(20.dp))
                                .border(1.dp, PortalColors.GlassBorder, RoundedCornerShape(20.dp))
                                .clickable { viewModel.onToggleBrowse() }
                                .padding(horizontal = 18.dp, vertical = 10.dp),
                        )
                    }
                }
            }
        } else {
            items(state.results.size, key = { i -> "${state.results[i].english}|${state.results[i].pos}|${state.results[i].zomi}" }) { i ->
                EntryRow(state.results[i], trimmed) { viewModel.openDetail(it) }
            }
        }

        if (state.needsAI || state.isAskingAI || state.aiResult != null || state.aiError != null) {
            item { AICard(state) { copy(it) } }
        }

        item { Spacer(Modifier.height(24.dp)) }
    }

    if (state.detailEntry != null) {
        EntryDetailDialog(
            state = state,
            onCopy = { copy(it) },
            onOpenRelated = { viewModel.openDetail(it) },
            onClose = viewModel::closeDetail,
        )
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
private fun EntryRow(entry: DictionaryEntry, query: String, onOpen: (DictionaryEntry) -> Unit) {
    val posColor = categoryColor(entry.category)
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 10.dp)
            .background(PortalColors.GlassFill, RoundedCornerShape(16.dp))
            .border(1.dp, PortalColors.GlassBorder, RoundedCornerShape(16.dp))
            .clickable { onOpen(entry) }
            .padding(14.dp),
    ) {
        Column(Modifier.weight(1f)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    highlighted(entry.english, query, PortalColors.Cyan),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = PortalColors.TextPrimary,
                )
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
                highlighted(entry.zomi, query, PortalColors.TextPrimary),
                fontSize = 15.sp,
                color = Color(0xFF80F7FF),
                modifier = Modifier.padding(top = 4.dp),
            )
        }
        Text("⧉", fontSize = 16.sp, color = PortalColors.TextMuted, modifier = Modifier.padding(start = 8.dp))
    }
}

/** Section heading inside the entry detail dialog. */
@Composable
private fun SectionLabel(text: String) {
    Text(
        text,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        color = PortalColors.TextFaint,
        letterSpacing = 1.sp,
        modifier = Modifier.padding(top = 18.dp, bottom = 8.dp),
    )
}

/** Expanded entry detail: definition, grammatical category, AI example
 *  sentences and related terms from the verified dataset. */
@Composable
private fun EntryDetailDialog(
    state: DictionaryUiState,
    onCopy: (String) -> Unit,
    onOpenRelated: (DictionaryEntry) -> Unit,
    onClose: () -> Unit,
) {
    val entry = state.detailEntry ?: return
    Dialog(onDismissRequest = onClose) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF161B2C), RoundedCornerShape(20.dp))
                .border(1.dp, PortalColors.GlassBorder, RoundedCornerShape(20.dp))
                .verticalScroll(rememberScrollState())
                .padding(18.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text(
                    entry.english,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = PortalColors.TextPrimary,
                    modifier = Modifier.weight(1f),
                )
                Icon(
                    Icons.Filled.Close,
                    contentDescription = "Close details",
                    tint = PortalColors.TextMuted,
                    modifier = Modifier
                        .size(22.dp)
                        .clickable(onClick = onClose),
                )
            }

            val posColor = categoryColor(entry.category)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(top = 6.dp),
            ) {
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
                Text(
                    "✓ Verified",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = PortalColors.Green,
                    modifier = Modifier
                        .background(PortalColors.Green.copy(alpha = 0.12f), RoundedCornerShape(50))
                        .border(1.dp, PortalColors.Green.copy(alpha = 0.35f), RoundedCornerShape(50))
                        .padding(horizontal = 8.dp, vertical = 2.dp),
                )
            }

            SectionLabel("DEFINITION")
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text(
                    entry.zomi,
                    fontSize = 19.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF80F7FF),
                    modifier = Modifier.weight(1f),
                )
                Text(
                    "⧉",
                    fontSize = 16.sp,
                    color = PortalColors.TextSecondary,
                    modifier = Modifier
                        .background(PortalColors.GlassFill, RoundedCornerShape(50))
                        .clickable { onCopy(entry.zomi) }
                        .padding(8.dp),
                )
            }

            SectionLabel("GRAMMATICAL CATEGORY")
            val description = DictionaryRepository.categoryDescriptions[entry.category]
                ?: "A word that does not fit the standard grammatical categories."
            Text(
                entry.category.replaceFirstChar { it.uppercase() },
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = PortalColors.TextPrimary,
            )
            Text(
                description,
                fontSize = 13.sp,
                color = PortalColors.TextSecondary,
                modifier = Modifier.padding(top = 2.dp),
            )

            SectionLabel("EXAMPLE SENTENCES")
            when {
                state.detailExamplesLoading -> Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp,
                        color = PortalColors.Yellow,
                    )
                    Text("Asking Zomi AI...", fontSize = 13.sp, color = PortalColors.TextSecondary)
                }

                state.detailExamplesError -> Text(
                    "Examples need an internet connection — the dictionary itself works offline.",
                    fontSize = 13.sp,
                    color = PortalColors.TextSecondary,
                )

                else -> state.detailExamples.forEach { example ->
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 10.dp)
                            .background(PortalColors.GlassFill, RoundedCornerShape(12.dp))
                            .border(1.dp, PortalColors.GlassBorder, RoundedCornerShape(12.dp))
                            .clickable { onCopy(example.zomi) }
                            .padding(12.dp),
                    ) {
                        Text(example.english, fontSize = 14.sp, color = PortalColors.TextPrimary)
                        Text(
                            example.zomi,
                            fontSize = 14.sp,
                            color = Color(0xFF80F7FF),
                            modifier = Modifier.padding(top = 3.dp),
                        )
                    }
                }
            }
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

            if (state.detailRelated.isNotEmpty()) {
                SectionLabel("RELATED TERMS")
                state.detailRelated.forEach { related ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 8.dp)
                            .clickable { onOpenRelated(related) },
                    ) {
                        Text(
                            related.english,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = PortalColors.TextPrimary,
                        )
                        Text("→", fontSize = 13.sp, color = PortalColors.TextMuted)
                        Text(
                            related.zomi,
                            fontSize = 14.sp,
                            color = Color(0xFF80F7FF),
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }

            Spacer(Modifier.height(8.dp))
        }
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
