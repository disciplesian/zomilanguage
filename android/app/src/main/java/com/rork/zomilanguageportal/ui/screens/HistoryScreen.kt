package com.rork.zomilanguageportal.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.rork.zomilanguageportal.data.tr
import com.rork.zomilanguageportal.data.HistoryItem
import com.rork.zomilanguageportal.data.HistoryRepository
import com.rork.zomilanguageportal.ui.theme.PortalColors
import java.text.DateFormat
import java.util.Date

private enum class HistoryFilter(val label: String) {
    All("All"), Favorites("Favorites"), ToEnglish("Zomi \u2192 English"), ToZomi("English \u2192 Zomi")
}

/** History: search, filters, swipe to delete, and Clear all. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(onStartTranslating: () -> Unit, modifier: Modifier = Modifier) {
    val items by HistoryRepository.items.collectAsStateWithLifecycle()
    var query by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf(HistoryFilter.All) }
    var confirmClear by remember { mutableStateOf(false) }
    val focusManager = LocalFocusManager.current

    val filtered = remember(items, query, filter) {
        items.filter {
            when (filter) {
                HistoryFilter.All -> true
                HistoryFilter.Favorites -> it.isFavorite
                HistoryFilter.ToEnglish -> it.targetLanguage == "english"
                HistoryFilter.ToZomi -> it.targetLanguage == "zomi"
            }
        }.filter {
            val q = query.trim()
            q.isEmpty() || it.sourceText.contains(q, ignoreCase = true) || it.translatedText.contains(q, ignoreCase = true)
        }
    }

    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        LazyColumn(
            modifier = Modifier.widthIn(max = 820.dp).fillMaxSize().padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 12.dp)) {
                    Text(
                        tr("History"),
                        color = PortalColors.TextPrimary,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(1f).semantics { heading() },
                    )
                    if (items.isNotEmpty()) {
                        TextButton(onClick = { confirmClear = true }) {
                            Text(tr("Clear all"), color = Color(0xFFFF8A8A), fontWeight = FontWeight.SemiBold)
                        }
                    }
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
                    Spacer(Modifier.size(10.dp))
                    Box(Modifier.weight(1f)) {
                        if (query.isEmpty()) Text(tr("Search history"), color = PortalColors.TextFaint, fontSize = 16.sp)
                        BasicTextField(
                            value = query,
                            onValueChange = { query = it },
                            singleLine = true,
                            textStyle = TextStyle(color = PortalColors.TextPrimary, fontSize = 16.sp),
                            cursorBrush = SolidColor(PortalColors.Cyan),
                            keyboardOptions = KeyboardOptions(
                                capitalization = KeyboardCapitalization.None,
                                autoCorrectEnabled = false,
                                imeAction = ImeAction.Search,
                            ),
                            keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus() }),
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                    if (query.isNotEmpty()) {
                        IconButton(onClick = { query = "" }) {
                            Icon(Icons.Filled.Close, contentDescription = "Clear search", tint = PortalColors.TextMuted)
                        }
                    }
                }
            }
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(HistoryFilter.entries.toList()) { option ->
                        val active = option == filter
                        Text(
                            tr(option.label),
                            color = if (active) PortalColors.Cyan else PortalColors.TextSecondary,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier
                                .background(if (active) PortalColors.Cyan.copy(alpha = 0.15f) else PortalColors.GlassFill, RoundedCornerShape(50))
                                .border(1.dp, if (active) PortalColors.Cyan.copy(alpha = 0.45f) else PortalColors.GlassBorder, RoundedCornerShape(50))
                                .clickable { filter = option }
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                        )
                    }
                }
            }

            if (filtered.isEmpty()) {
                item {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.fillMaxWidth().padding(vertical = 56.dp),
                    ) {
                        Icon(Icons.Filled.History, contentDescription = null, tint = PortalColors.TextFaint, modifier = Modifier.size(48.dp))
                        Spacer(Modifier.height(12.dp))
                        Text(
                            if (items.isEmpty()) tr("No history yet") else tr("No matches"),
                            color = PortalColors.TextPrimary,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                        )
                        Spacer(Modifier.height(6.dp))
                        Text(
                            if (items.isEmpty()) tr("Your translations will appear here.") else tr("Try a different word or filter."),
                            color = PortalColors.TextSecondary,
                            fontSize = 15.sp,
                        )
                        if (items.isEmpty()) {
                            Spacer(Modifier.height(14.dp))
                            PillButton("Start translating", filled = true, onClick = onStartTranslating)
                        }
                    }
                }
            } else {
                items(filtered, key = { it.id }) { item ->
                    val dismissState = rememberSwipeToDismissBoxState(
                        confirmValueChange = { value ->
                            if (value == SwipeToDismissBoxValue.EndToStart) {
                                HistoryRepository.remove(item.id)
                                true
                            } else {
                                false
                            }
                        },
                    )
                    SwipeToDismissBox(
                        state = dismissState,
                        enableDismissFromStartToEnd = false,
                        backgroundContent = {
                            Box(
                                contentAlignment = Alignment.CenterEnd,
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(PortalColors.Red.copy(alpha = 0.35f), RoundedCornerShape(20.dp))
                                    .padding(end = 24.dp),
                            ) {
                                Icon(Icons.Filled.Delete, contentDescription = tr("Delete"), tint = Color.White)
                            }
                        },
                    ) {
                        HistoryCard(item)
                    }
                }
                item { Spacer(Modifier.height(16.dp)) }
            }
        }
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
                }) { Text(tr("Clear all"), color = Color(0xFFFF8A8A)) }
            },
            dismissButton = { TextButton(onClick = { confirmClear = false }) { Text(tr("Cancel")) } },
            containerColor = PortalColors.Surface,
            titleContentColor = PortalColors.TextPrimary,
            textContentColor = PortalColors.TextSecondary,
        )
    }
}

@Composable
private fun HistoryCard(item: HistoryItem) {
    val clipboard = LocalClipboardManager.current
    val context = LocalContext.current
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(PortalColors.Surface, RoundedCornerShape(20.dp))
            .border(1.dp, PortalColors.Purple.copy(alpha = 0.35f), RoundedCornerShape(20.dp))
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            val from = if (item.sourceLanguage == "zomi") "Zomi" else "English"
            val to = if (item.targetLanguage == "zomi") "Zomi" else "English"
            Text("$from \u2192 $to", color = PortalColors.TextSecondary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
            Text(
                DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(item.createdAt)),
                color = PortalColors.TextFaint,
                fontSize = 12.sp,
            )
        }
        Spacer(Modifier.height(8.dp))
        Text(item.sourceText, color = PortalColors.TextSecondary, fontSize = 15.sp, maxLines = 3)
        Spacer(Modifier.height(4.dp))
        Text(item.translatedText, color = PortalColors.TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, maxLines = 4)
        Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
            IconButton(onClick = { HistoryRepository.toggleFavorite(item.id) }, modifier = Modifier.heightIn(min = 44.dp)) {
                Icon(
                    if (item.isFavorite) Icons.Filled.Star else Icons.Filled.StarBorder,
                    contentDescription = if (item.isFavorite) "Remove from favorites" else "Add to favorites",
                    tint = if (item.isFavorite) PortalColors.Yellow else PortalColors.TextMuted,
                )
            }
            IconButton(onClick = {
                clipboard.setText(AnnotatedString(item.translatedText))
                Toast.makeText(context, tr("Copied"), Toast.LENGTH_SHORT).show()
            }) {
                Icon(Icons.Filled.ContentCopy, contentDescription = tr("Copy"), tint = PortalColors.Cyan)
            }
        }
    }
}
