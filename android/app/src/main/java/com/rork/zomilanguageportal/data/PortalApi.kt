package com.rork.zomilanguageportal.data

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.android.Android
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.plugins.expectSuccess
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.preparePost
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsChannel
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.utils.io.readUTF8Line
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/** Shared Ktor client for auth and portal API calls. */
object PortalHttp {
    val json: Json = Json { ignoreUnknownKeys = true; isLenient = true }

    val client: HttpClient = HttpClient(Android) {
        expectSuccess = true
        install(ContentNegotiation) { json(json) }
    }
}

@Serializable
data class PortalProfile(
    val userId: String = "",
    val email: String = "",
    val name: String? = null,
    val role: String = "user",
    val verified: Boolean = false,
    val verificationStatus: String = "none",
    val translationCount: Int = 0,
    val joinedAt: String = "",
)

@Serializable
data class PortalUserRecord(
    val userId: String = "",
    val email: String = "",
    val name: String? = null,
    val role: String = "user",
    val verified: Boolean = false,
    val verificationStatus: String = "none",
    val verificationReason: String = "",
    val translationCount: Int = 0,
    val joinedAt: String = "",
)

@Serializable
data class TopUser(
    val userId: String = "",
    val email: String = "",
    val name: String? = null,
    val total: Int = 0,
)

@Serializable
data class TranslationLog(
    val userId: String = "",
    val email: String = "",
    val name: String? = null,
    val sourceText: String = "",
    val translatedText: String = "",
    val targetLanguage: String = "",
    val model: String? = null,
    val confidence: Int = 0,
    val wordCount: Int = 0,
    val createdAt: String = "",
)

@Serializable
data class AdminOverview(
    val totalUsers: Int = 0,
    val totalTranslations: Int = 0,
    val translationsToday: Int = 0,
    val verifiedUsers: Int = 0,
    val pendingVerifications: Int = 0,
    val topUsers: List<TopUser> = emptyList(),
    val recentTranslations: List<TranslationLog> = emptyList(),
)

@Serializable
private data class UsersResponse(val users: List<PortalUserRecord> = emptyList())

@Serializable
private data class ReasonBody(val reason: String)

@Serializable
private data class RoleBody(val userId: String, val role: String)

@Serializable
private data class VerificationBody(val userId: String, val decision: String)

@Serializable
private data class TranslateBody(
    val text: String,
    val sourceLanguage: String? = null,
    val targetLanguage: String,
    val anonymousId: String? = null,
)

data class TranslationResult(
    val text: String,
    val model: String?,
    val confidence: Int,
    val alternatives: List<String> = emptyList(),
)

/** Raised when the backend rejects the session; the UI prompts a fresh sign-in. */
class SessionExpiredException : Exception("Your session expired. Please sign in again.")

/** Raised when a guest's daily free AI allowance is used up. */
class WordLimitException :
    Exception("You've used today's free words. Sign in for unlimited translation, or come back tomorrow. Dictionary words still work.")

/** Friendly, non-technical service limits (speed limit, length, busy, blocked). */
class ServiceNoticeException(message: String) : Exception(message)

/** Guest daily allowance reported after each translation. */
data class UsageInfo(val wordsUsed: Int, val wordLimit: Int, val signedIn: Boolean)

/** Maps a server error code to a short, kind message. */
fun friendlyServiceMessage(code: String?): String? = when (code) {
    "rate_limited", "TOO_MANY_REQUESTS" -> "Lots of translations at once. Please wait a moment and try again."
    "text_too_long" -> "That's a long text. Please translate up to 500 characters at a time, or sign in for longer texts."
    "dictionary_only" -> "Sentence translation is busy right now. Dictionary words still work. Please try again shortly."
    "blocked" -> "Translation isn't available on this device right now. Contact support@zomitranslator.com if this seems wrong."
    else -> null
}

/** Client for the Zomi Translator backend. */
object PortalApi {

    /** Permanently deletes the signed-in account and its synced data. */
    suspend fun deleteAccount(token: String) {
        PortalHttp.client.delete("${AppConfig.API_BASE_URL}/api/portal/me") {
            header(HttpHeaders.Authorization, "Bearer $token")
        }
    }

    suspend fun profile(token: String): PortalProfile =
        PortalHttp.client.get("${AppConfig.API_BASE_URL}/api/portal/me") {
            header(HttpHeaders.Authorization, "Bearer $token")
        }.body()

    suspend fun requestVerification(token: String, reason: String) {
        PortalHttp.client.post("${AppConfig.API_BASE_URL}/api/portal/verification/request") {
            header(HttpHeaders.Authorization, "Bearer $token")
            contentType(ContentType.Application.Json)
            setBody(ReasonBody(reason))
        }
    }

    suspend fun adminOverview(token: String): AdminOverview =
        PortalHttp.client.get("${AppConfig.API_BASE_URL}/api/admin/overview") {
            header(HttpHeaders.Authorization, "Bearer $token")
        }.body()

    suspend fun adminUsers(token: String): List<PortalUserRecord> {
        val response: UsersResponse =
            PortalHttp.client.get("${AppConfig.API_BASE_URL}/api/admin/users") {
                header(HttpHeaders.Authorization, "Bearer $token")
            }.body()
        return response.users
    }

    suspend fun setRole(token: String, userId: String, role: String) {
        PortalHttp.client.post("${AppConfig.API_BASE_URL}/api/admin/role") {
            header(HttpHeaders.Authorization, "Bearer $token")
            contentType(ContentType.Application.Json)
            setBody(RoleBody(userId, role))
        }
    }

    suspend fun decideVerification(token: String, userId: String, decision: String) {
        PortalHttp.client.post("${AppConfig.API_BASE_URL}/api/admin/verification") {
            header(HttpHeaders.Authorization, "Bearer $token")
            contentType(ContentType.Application.Json)
            setBody(VerificationBody(userId, decision))
        }
    }

    /**
     * Streams a translation, calling [onDelta] for each token so the UI reveals
     * the result as it arrives. Signed-in users translate without limits;
     * guests draw down a daily allowance via [anonymousId] and hit
     * [WordLimitException] once it runs out.
     *
     * A transient connection failure is retried once, quickly; [onConnecting]
     * fires before the retry so the UI can show a "Connecting..." indicator.
     */
    suspend fun streamTranslation(
        token: String?,
        anonymousId: String,
        text: String,
        sourceLanguage: String,
        targetLanguage: String,
        onDelta: (String) -> Unit,
        onConnecting: () -> Unit = {},
        onUsage: (UsageInfo) -> Unit = {},
    ): TranslationResult {
        val maxRetries = 1
        var attempt = 0
        while (true) {
            val streamed = StringBuilder()
            var finalResult: TranslationResult? = null
            try {
                PortalHttp.client.preparePost("${AppConfig.API_BASE_URL}/api/translate/stream") {
                    token?.let { header(HttpHeaders.Authorization, "Bearer $it") }
                    header("X-Anonymous-Id", anonymousId)
                    header(HttpHeaders.Accept, "text/event-stream")
                    contentType(ContentType.Application.Json)
                    setBody(TranslateBody(text, sourceLanguage, targetLanguage, anonymousId))
                    expectSuccess = false
                }.execute { response ->
                    if (response.status.value >= 400) {
                        // Read the JSON error body to tell an exhausted free tier apart
                        // from an expired member session.
                        val errBody = StringBuilder()
                        val errChannel = response.bodyAsChannel()
                        while (true) {
                            errBody.append(errChannel.readUTF8Line() ?: break)
                            if (errBody.length > 512) break
                        }
                        val errorCode = runCatching {
                            PortalHttp.json.parseToJsonElement(errBody.toString()).jsonObject["error"]
                                ?.jsonPrimitive?.content
                        }.getOrNull()
                        if (errorCode == "word_limit_reached") throw WordLimitException()
                        friendlyServiceMessage(errorCode)?.let { throw ServiceNoticeException(it) }
                        if (response.status.value == 401) throw SessionExpiredException()
                        error("HTTP ${response.status.value}")
                    }

                    val channel = response.bodyAsChannel()
                    var eventName = "message"
                    val data = StringBuilder()

                    fun dispatch() {
                        if (data.isEmpty()) return
                        val payload = runCatching {
                            PortalHttp.json.parseToJsonElement(data.toString()).jsonObject
                        }.getOrNull()
                        if (payload != null) {
                            when (eventName) {
                                "usage" -> {
                                    val used = payload["wordsUsed"]?.jsonPrimitive?.content?.toIntOrNull() ?: 0
                                    val limit = payload["wordLimit"]?.jsonPrimitive?.content?.toIntOrNull() ?: 0
                                    val authed = payload["authed"]?.jsonPrimitive?.content == "true"
                                    onUsage(UsageInfo(used, limit, authed))
                                }
                                "error" -> {
                                    val code = payload["code"]?.jsonPrimitive?.content
                                    throw ServiceNoticeException(
                                        friendlyServiceMessage(code) ?: "Translation didn't come through. Please try again."
                                    )
                                }
                                "delta" -> {
                                    val piece = payload["text"]?.jsonPrimitive?.content.orEmpty()
                                    if (piece.isNotEmpty()) {
                                        streamed.append(piece)
                                        onDelta(piece)
                                    }
                                }
                                "done" -> {
                                    val full = payload["text"]?.jsonPrimitive?.content.orEmpty()
                                    val alternatives = payload["alternatives"]?.jsonArray
                                        ?.mapNotNull { item ->
                                            (item as? JsonPrimitive)?.contentOrNull?.trim()
                                        }
                                        ?.filter { it.isNotEmpty() && it != full }
                                        ?.distinct()
                                        ?.take(2)
                                        .orEmpty()
                                    finalResult = TranslationResult(
                                        text = full.ifEmpty { streamed.toString() },
                                        model = payload["model"]?.jsonPrimitive?.content,
                                        confidence = payload["confidence"]?.jsonPrimitive?.content
                                            ?.toIntOrNull() ?: 0,
                                        alternatives = alternatives,
                                    )
                                }
                            }
                        }
                        data.clear()
                        eventName = "message"
                    }

                    while (true) {
                        val line = channel.readUTF8Line() ?: break
                        when {
                            line.startsWith("event:") -> eventName = line.removePrefix("event:").trim()
                            line.startsWith("data:") -> data.append(line.removePrefix("data:").trim())
                            line.isBlank() -> dispatch()
                        }
                    }
                    dispatch()
                }

                val result = finalResult
                    ?: TranslationResult(streamed.toString(), null, if (streamed.isEmpty()) 0 else 90)
                if (result.text.isEmpty()) {
                    // Server closed without any data — usually a transient blip.
                    if (attempt < maxRetries) {
                        attempt++
                        onConnecting()
                        delay(300L)
                        continue
                    }
                    error("Translation didn't come through. Please try again.")
                }
                return result
            } catch (e: CancellationException) {
                throw e
            } catch (e: WordLimitException) {
                throw e
            } catch (e: SessionExpiredException) {
                throw e
            } catch (e: ServiceNoticeException) {
                throw e
            } catch (e: ClientRequestException) {
                // 4xx responses are never transient — fail immediately.
                throw e
            } catch (e: Exception) {
                // Network-level failure — retry only while nothing has streamed.
                if (attempt < maxRetries && streamed.isEmpty()) {
                    attempt++
                    onConnecting()
                    delay(500L)
                    continue
                }
                throw e
            }
        }
    }

    /**
     * Fetches two AI-generated example sentences for a verified dictionary
     * entry. Guests are served while their anonymous free-tier allowance
     * lasts; viewing examples does not draw it down.
     */
    suspend fun fetchEntryExamples(
        token: String?,
        anonymousId: String,
        english: String,
        zomi: String,
        pos: String,
    ): List<EntryExample> {
        val response = PortalHttp.client.post("${AppConfig.API_BASE_URL}/api/dictionary/examples") {
            token?.let { header(HttpHeaders.Authorization, "Bearer $it") }
            header("X-Anonymous-Id", anonymousId)
            contentType(ContentType.Application.Json)
            setBody(EntryExamplesBody(english, zomi, pos, anonymousId))
        }
        return PortalHttp.json.decodeFromString<ExamplesResponse>(response.bodyAsText()).examples
    }
}

/** One AI-generated example sentence pair for a dictionary entry. */
@Serializable
data class EntryExample(
    val english: String = "",
    val zomi: String = "",
)

@Serializable
private data class EntryExamplesBody(
    val english: String,
    val zomi: String,
    val pos: String,
    val anonymousId: String,
)

@Serializable
private data class ExamplesResponse(
    val examples: List<EntryExample> = emptyList(),
)
