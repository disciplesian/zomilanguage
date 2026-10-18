package com.rork.zomilanguageportal

import android.content.Context
import android.graphics.Bitmap
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.test.core.app.ApplicationProvider
import com.rork.zomilanguageportal.data.HistoryItem
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

/**
 * Renders the real app screens to PNG for the Google Play listing.
 * Not a behaviour test: run via scripts/capture-play-screenshots.sh.
 *
 * Phone: 360x720dp @ xxhdpi = 1080x2160 px (Play max aspect 2:1).
 * History is pre-seeded with real outputs from the live translation server.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w360dp-h720dp-notnight-xxhdpi")
class StoreScreenshots {

    /** Runs before the activity launches: online network + seeded history. */
    @get:Rule(order = 0)
    val setup = object : org.junit.rules.ExternalResource() {
        override fun before() {
            val ctx = ApplicationProvider.getApplicationContext<Context>()
            val cm = ctx.getSystemService(android.net.ConnectivityManager::class.java)
            val caps = org.robolectric.shadows.ShadowNetworkCapabilities.newInstance()
            org.robolectric.Shadows.shadowOf(caps).addCapability(android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET)
            org.robolectric.Shadows.shadowOf(cm).setNetworkCapabilities(cm.activeNetwork, caps)
            seedHistory(ctx)
        }
    }

    @get:Rule(order = 1)
    val compose = createAndroidComposeRule<MainActivity>()

    private val outDir: File =
        File(System.getProperty("storeScreenshotDir") ?: "build/store-screenshots").apply { mkdirs() }

    private fun shot(name: String) {
        compose.waitForIdle()
        compose.runOnUiThread {
            val view = compose.activity.window.decorView
            val bitmap = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
            view.draw(android.graphics.Canvas(bitmap))
            File(outDir, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
        }
    }

    private fun waitForText(text: String, timeoutMs: Long = 30_000) {
        try {
            compose.waitUntil(timeoutMs) {
                compose.onAllNodes(hasText(text, substring = true)).fetchSemanticsNodes().isNotEmpty()
            }
        } catch (e: Throwable) {
            shot("debug-${text.take(12)}")
            throw e
        }
    }

    private fun openTab(label: String) {
        compose.onNode(hasText(label) and androidx.compose.ui.test.hasClickAction(), useUnmergedTree = false)
            .performClick()
        compose.waitForIdle()
    }

    @Test
    fun capture() {
        // 1. English sentence → Zomi (live server)
        compose.onNode(androidx.compose.ui.test.hasContentDescription("Swap languages")).performClick()
        compose.waitForIdle()
        compose.onAllNodes(hasSetTextAction())[0].performTextInput("Thank you for your help.")
        waitForText("lungdam")
        Thread.sleep(500)
        shot("01-translate")

        // 2. Zomi → English
        compose.onNode(androidx.compose.ui.test.hasContentDescription("Swap languages")).performClick()
        compose.onNode(androidx.compose.ui.test.hasContentDescription("Clear text")).performClick()
        compose.onAllNodes(hasSetTextAction())[0].performTextInput("Pasian in hong itna hi.")
        waitForText("God")
        Thread.sleep(500)
        shot("02-zomi-to-english")

        // 3. Dictionary
        openTab("Dictionary")
        waitForText("verified entries")
        compose.onAllNodes(hasSetTextAction())[0].performTextInput("peace")
        waitForText("verified matches")
        Thread.sleep(300)
        compose.waitForIdle()
        shot("03-dictionary")

        // 4. History
        openTab("History")
        waitForText("I love my family")
        shot("04-history")

        // 5. Settings
        openTab("Settings")
        compose.waitForIdle()
        shot("05-settings")
    }

    private fun seedHistory(ctx: Context) {
        val now = System.currentTimeMillis()
        val items = listOf(
            HistoryItem(sourceText = "I love my family.", translatedText = "Ka innkuan ka it hi.", sourceLanguage = "english", targetLanguage = "zomi", createdAt = now - 60_000),
            HistoryItem(sourceText = "Where is the church?", translatedText = "Biakinn koiah om hiam?", sourceLanguage = "english", targetLanguage = "zomi", createdAt = now - 15 * 60_000, isFavorite = true),
            HistoryItem(sourceText = "Good morning, my friend.", translatedText = "Zingsang hoih, ka lawm.", sourceLanguage = "english", targetLanguage = "zomi", createdAt = now - 3 * 3_600_000),
            HistoryItem(sourceText = "Pasian in hong itna hi.", translatedText = "God loves us.", sourceLanguage = "zomi", targetLanguage = "english", createdAt = now - 26 * 3_600_000),
        )
        ctx.getSharedPreferences("zomi_history", Context.MODE_PRIVATE).edit()
            .putString("items_v1", Json.encodeToString(items)).commit()
    }
}
