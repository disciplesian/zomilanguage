package com.rork.zomilanguageportal.data

import android.content.Context
import com.rork.zomilanguageportal.BuildConfig
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer

/**
 * Privacy-safe crash reports. When the app crashes, a scrubbed one-line
 * signature (exception type, message without quoted text or numbers, and the
 * first app frame) is saved; it is sent on the next launch. No user ids,
 * device ids, or translated text are ever included.
 */
object ProblemReporter {
    private const val PREFS = "zomi_problems"
    private const val KEY_PENDING = "pending_v1"
    private const val MAX_PENDING = 10

    @Serializable
    private data class Report(
        val platform: String = "android",
        val appVersion: String,
        val kind: String,
        val signature: String,
        val screen: String = "",
    )

    @Serializable
    private data class Batch(val reports: List<Report>)

    /** Installs the crash handler. Call once from MainActivity.onCreate. */
    fun install(context: Context) {
        val appContext = context.applicationContext
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        if (previous is CrashHandler) return
        Thread.setDefaultUncaughtExceptionHandler(CrashHandler(appContext, previous))
    }

    private class CrashHandler(
        private val context: Context,
        private val previous: Thread.UncaughtExceptionHandler?,
    ) : Thread.UncaughtExceptionHandler {
        override fun uncaughtException(thread: Thread, throwable: Throwable) {
            runCatching { savePending(context, Report(appVersion = BuildConfig.VERSION_NAME, kind = "crash", signature = signatureOf(throwable))) }
            previous?.uncaughtException(thread, throwable)
        }
    }

    /** Sends crash reports saved by a previous session, then clears them. */
    suspend fun sendPending(context: Context) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val raw = prefs.getString(KEY_PENDING, null) ?: return
        val reports = runCatching {
            PortalHttp.json.decodeFromString(ListSerializer(Report.serializer()), raw)
        }.getOrDefault(emptyList())
        if (reports.isEmpty()) {
            prefs.edit().remove(KEY_PENDING).apply()
            return
        }
        runCatching {
            PortalHttp.client.post("${AppConfig.API_BASE_URL}/api/telemetry/problems") {
                contentType(ContentType.Application.Json)
                setBody(PortalHttp.json.encodeToString(Batch.serializer(), Batch(reports)))
            }
            prefs.edit().remove(KEY_PENDING).apply()
        }
    }

    private fun savePending(context: Context, report: Report) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val existing = prefs.getString(KEY_PENDING, null)?.let {
            runCatching { PortalHttp.json.decodeFromString(ListSerializer(Report.serializer()), it) }.getOrNull()
        } ?: emptyList()
        val next = (existing + report).takeLast(MAX_PENDING)
        // commit() (not apply) because the process is about to die.
        prefs.edit().putString(KEY_PENDING, PortalHttp.json.encodeToString(ListSerializer(Report.serializer()), next)).commit()
    }

    private fun signatureOf(throwable: Throwable): String {
        val root = generateSequence(throwable) { it.cause }.last()
        val frame = root.stackTrace.firstOrNull { it.className.startsWith("com.rork.") }
            ?: root.stackTrace.firstOrNull()
        val where = frame?.let { " at ${it.className.substringAfterLast('.')}.${it.methodName}" } ?: ""
        return scrub("${root.javaClass.simpleName}: ${root.message.orEmpty()}$where")
    }

    private fun scrub(raw: String): String = raw
        .replace(Regex("([\"'`“”‘’]).{0,400}?\\1"), "…")
        .replace(Regex("[\\w.+-]+@[\\w-]+\\.[\\w.]+"), "<email>")
        .replace(Regex("\\d+"), "#")
        .replace(Regex("\\s+"), " ")
        .trim()
        .take(200)
}
