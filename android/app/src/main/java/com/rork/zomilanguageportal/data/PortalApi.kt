package com.rork.zomilanguageportal.data

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.android.Android
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
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
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
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

data class TranslationResult(val text: String, val model: String?, val confidence: Int)

/** Raised when the backend rejects the session; the UI prompts a fresh sign-in. */
class SessionExpiredException : Exception("Your session expired. Please sign in again.")

/** Raised when the anonymous free tier (1,500 words) is exhausted. */
class WordLimitException :
    Exception("You've used your 1,500 free words. Sign in to keep translating — it is free.")

/** Client for the members-only Zomi Language Portal backend. */
object PortalApi {

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
     * the result as it arrives. Signed-in members translate without limits;
     * anonymous visitors draw down their 1,500-word free allowance via
     * [anonymousId] and hit [WordLimitException] once it runs out.
     */
    suspend fun streamTranslation(
        token: String?,
        anonymousId: String,
        text: String,
        sourceLanguage: String,
        targetLanguage: String,
        onDelta: (String) -> Unit,
    ): TranslationResult {
        val streamed = StringBuilder()
        var finalResult: TranslationResult? = null

        PortalHttp.client.preparePost("${AppConfig.API_BASE_URL}/api/translate/stream") {
            token?.let { header(HttpHeaders.Authorization, "Bearer $it") }
            header("X-Anonymous-Id", anonymousId)
            header(HttpHeaders.Accept, "text/event-stream")
            contentType(ContentType.Application.Json)
            setBody(TranslateBody(text, sourceLanguage, targetLanguage, anonymousId))
        }.execute { response ->
            if (response.status.value == 401) {
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
                throw SessionExpiredException()
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
                        "delta" -> {
                            val piece = payload["text"]?.jsonPrimitive?.content.orEmpty()
                            if (piece.isNotEmpty()) {
                                streamed.append(piece)
                                onDelta(piece)
                            }
                        }
                        "done" -> {
                            val full = payload["text"]?.jsonPrimitive?.content.orEmpty()
                            finalResult = TranslationResult(
                                text = full.ifEmpty { streamed.toString() },
                                model = payload["model"]?.jsonPrimitive?.content,
                                confidence = payload["confidence"]?.jsonPrimitive?.content
                                    ?.toIntOrNull() ?: 0,
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
        if (result.text.isEmpty()) error("No translation was returned. Please try again.")
        return result
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
