package com.rork.zomilanguageportal.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val PortalColorScheme = darkColorScheme(
    primary = PortalColors.Cyan,
    onPrimary = PortalColors.Canvas,
    secondary = PortalColors.Purple,
    onSecondary = PortalColors.TextPrimary,
    tertiary = PortalColors.Pink,
    onTertiary = PortalColors.TextPrimary,
    background = PortalColors.Canvas,
    onBackground = PortalColors.TextPrimary,
    surface = PortalColors.Surface,
    onSurface = PortalColors.TextPrimary,
    surfaceVariant = PortalColors.CanvasMid,
    onSurfaceVariant = PortalColors.TextSecondary,
    error = PortalColors.Red,
    onError = PortalColors.TextPrimary,
    outline = PortalColors.GlassBorder,
)

/** The portal always uses its own dark identity — no dynamic color. */
@Composable
fun AppTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = PortalColorScheme,
        content = content,
    )
}
