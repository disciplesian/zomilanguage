package com.rork.zomilanguageportal.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rork.zomilanguageportal.ui.theme.PortalColors

/** Diagonal gradient canvas used behind every screen. */
@Composable
fun PortalBackground(content: @Composable () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        PortalColors.Canvas,
                        PortalColors.CanvasMid,
                        PortalColors.CanvasHigh,
                    )
                )
            )
    ) {
        content()
    }
}

/** Translucent card surface matching the iOS and web glass styling. */
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(PortalColors.GlassFill, RoundedCornerShape(20.dp))
            .border(1.dp, PortalColors.GlassBorder, RoundedCornerShape(20.dp))
            .padding(20.dp)
    ) {
        content()
    }
}

/** Role pill plus the blue verification badge. */
@Composable
fun RoleBadge(role: String, verified: Boolean, modifier: Modifier = Modifier) {
    val (bg, fg, label) = when (role) {
        "admin" -> Triple(PortalColors.Pink.copy(alpha = 0.16f), Color(0xFFFF9ECB), "ADMIN")
        "moderator" -> Triple(PortalColors.Purple.copy(alpha = 0.16f), Color(0xFFC0A6FF), "MODERATOR")
        else -> Triple(Color.White.copy(alpha = 0.08f), PortalColors.TextSecondary, "SIGNED IN")
    }

    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
        Text(
            text = label,
            color = fg,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier
                .background(bg, RoundedCornerShape(50))
                .padding(horizontal = 8.dp, vertical = 3.dp)
        )
        if (verified) {
            Spacer(Modifier.size(6.dp))
            Icon(
                Icons.Filled.Verified,
                contentDescription = "Verified contributor",
                tint = Color(0xFF63C0FF),
                modifier = Modifier
                    .size(18.dp)
                    .background(PortalColors.Blue.copy(alpha = 0.16f), RoundedCornerShape(9.dp))
                    .border(1.dp, PortalColors.Blue.copy(alpha = 0.35f), RoundedCornerShape(9.dp))
                    .padding(2.5.dp)
            )
        }
    }
}

/** Full-screen loading state. */
@Composable
fun PortalLoading(modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = PortalColors.Cyan)
    }
}

/** Optional sign-in card (unlimited translation and synced history). */
@Composable
fun SignInPanel(
    title: String,
    message: String,
    isSigningIn: Boolean,
    error: String?,
    onGoogle: () -> Unit,
    onApple: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        GlassCard {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .background(PortalColors.Cyan.copy(alpha = 0.12f), RoundedCornerShape(16.dp))
                        .border(1.dp, PortalColors.Cyan.copy(alpha = 0.3f), RoundedCornerShape(16.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Filled.Person, contentDescription = null, tint = PortalColors.Cyan)
                }

                Spacer(Modifier.height(16.dp))
                Text(
                    title,
                    color = PortalColors.TextPrimary,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    message,
                    color = PortalColors.TextMuted,
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center,
                    lineHeight = 20.sp,
                )

                if (error != null) {
                    Spacer(Modifier.height(16.dp))
                    Text(
                        error,
                        color = Color(0xFFFFB3B3),
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(PortalColors.Red.copy(alpha = 0.12f), RoundedCornerShape(12.dp))
                            .padding(12.dp)
                    )
                }

                Spacer(Modifier.height(24.dp))

                Button(
                    onClick = onGoogle,
                    enabled = !isSigningIn,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White,
                        contentColor = Color(0xFF1F1F1F),
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                ) {
                    Text("Continue with Google", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                }

                Spacer(Modifier.height(12.dp))

                Button(
                    onClick = onApple,
                    enabled = !isSigningIn,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.Black,
                        contentColor = Color.White,
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                ) {
                    Text("Continue with Apple", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                }

                if (isSigningIn) {
                    Spacer(Modifier.height(16.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center,
                    ) {
                        CircularProgressIndicator(
                            color = PortalColors.Cyan,
                            strokeWidth = 2.dp,
                            modifier = Modifier.size(16.dp),
                        )
                        Spacer(Modifier.size(8.dp))
                        Text(
                            "Complete sign-in in your browser…",
                            color = PortalColors.TextMuted,
                            fontSize = 13.sp,
                        )
                    }
                }

                Spacer(Modifier.height(16.dp))
                Text(
                    "By signing in you agree to our Terms of Service and Privacy Policy.",
                    color = PortalColors.TextFaint,
                    fontSize = 11.sp,
                    textAlign = TextAlign.Center,
                    lineHeight = 16.sp,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}

/** Live connectivity state for the offline note. */
@Composable
fun rememberIsOnline(): Boolean {
    val context = androidx.compose.ui.platform.LocalContext.current
    val manager = androidx.compose.runtime.remember(context) {
        context.getSystemService(android.content.Context.CONNECTIVITY_SERVICE) as android.net.ConnectivityManager
    }
    var online by androidx.compose.runtime.remember {
        androidx.compose.runtime.mutableStateOf(
            manager.getNetworkCapabilities(manager.activeNetwork)
                ?.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
        )
    }
    androidx.compose.runtime.DisposableEffect(manager) {
        val callback = object : android.net.ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: android.net.Network) { online = true }
            override fun onLost(network: android.net.Network) {
                online = manager.getNetworkCapabilities(manager.activeNetwork)
                    ?.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
            }
        }
        runCatching { manager.registerDefaultNetworkCallback(callback) }
        onDispose { runCatching { manager.unregisterNetworkCallback(callback) } }
    }
    return online
}
