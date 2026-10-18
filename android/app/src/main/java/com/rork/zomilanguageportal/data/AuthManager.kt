package com.rork.zomilanguageportal.data

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Base64
import io.ktor.client.call.body
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.security.MessageDigest
import java.security.SecureRandom

@Serializable
data class AuthUser(
    val id: String,
    val email: String,
    val name: String? = null,
    val picture: String? = null,
)

@Serializable
private data class InitiateRequest(
    @SerialName("app_key") val appKey: String,
    val provider: String,
    @SerialName("code_challenge") val codeChallenge: String,
    val target: String,
    val env: String,
    @SerialName("app_path") val appPath: String,
)

@Serializable
private data class InitiateResponse(@SerialName("auth_url") val authUrl: String)

@Serializable
private data class TokenRequest(
    @SerialName("app_key") val appKey: String,
    val code: String,
    @SerialName("code_verifier") val codeVerifier: String,
)

@Serializable
private data class TokenResponse(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String = "",
)

@Serializable
private data class RefreshRequest(
    @SerialName("app_key") val appKey: String,
    @SerialName("refresh_token") val refreshToken: String,
)

/**
 * Google / Apple sign-in via Rork Auth using PKCE and an external browser
 * redirect back into the app. Mirrors the iOS and web clients so all three
 * share the same portal account system.
 */
object AuthManager {

    private lateinit var tokenStore: TokenStore
    private val json = Json { ignoreUnknownKeys = true }
    private var codeVerifier: String? = null

    private val _user = MutableStateFlow<AuthUser?>(null)
    val user: StateFlow<AuthUser?> = _user.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _isSigningIn = MutableStateFlow(false)
    val isSigningIn: StateFlow<Boolean> = _isSigningIn.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    fun initialize(context: Context) {
        if (::tokenStore.isInitialized) return
        tokenStore = TokenStore(context.applicationContext)
    }

    /** Restores an existing session on app start. */
    suspend fun restoreSession() {
        try {
            val token = tokenStore.accessToken
            if (token == null) {
                if (tokenStore.refreshToken != null) refreshSession()
                return
            }
            val decoded = userFromToken(token)
            if (decoded != null) _user.value = decoded else refreshSession()
        } finally {
            _isLoading.value = false
        }
    }

    fun clearError() {
        _error.value = null
    }

    /** Launches the provider's sign-in page in the browser. */
    suspend fun signIn(context: Context, provider: String) {
        _isSigningIn.value = true
        _error.value = null
        try {
            val verifier = randomString(64)
            codeVerifier = verifier
            val response: InitiateResponse = PortalHttp.client.post("${AppConfig.AUTH_URL}/oauth/initiate") {
                contentType(ContentType.Application.Json)
                setBody(
                    InitiateRequest(
                        appKey = AppConfig.APP_KEY,
                        provider = provider,
                        codeChallenge = codeChallenge(verifier),
                        target = "rn",
                        env = "native",
                        appPath = "android",
                    )
                )
            }.body()

            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(response.authUrl)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            codeVerifier = null
            _error.value = e.message ?: "Sign in failed. Please try again."
            _isSigningIn.value = false
        }
    }

    /** Handles the `rork-<projectId>://auth/callback?code=…` redirect. */
    suspend fun handleCallback(uri: Uri) {
        val code = uri.getQueryParameter("code")
        if (code == null) {
            _isSigningIn.value = false
            return
        }
        val verifier = codeVerifier
        if (verifier == null) {
            _isSigningIn.value = false
            return
        }
        codeVerifier = null
        try {
            val response: TokenResponse = PortalHttp.client.post("${AppConfig.AUTH_URL}/oauth/token") {
                contentType(ContentType.Application.Json)
                setBody(TokenRequest(AppConfig.APP_KEY, code, verifier))
            }.body()
            tokenStore.accessToken = response.accessToken
            if (response.refreshToken.isNotEmpty()) tokenStore.refreshToken = response.refreshToken
            _user.value = userFromToken(response.accessToken)
        } catch (e: Exception) {
            _error.value = e.message ?: "Sign in failed. Please try again."
        } finally {
            _isSigningIn.value = false
        }
    }

    fun signOut() {
        tokenStore.clear()
        _user.value = null
    }

    /** Valid access token for API calls, refreshing it when expired. */
    suspend fun accessToken(): String? {
        val token = tokenStore.accessToken
        if (token != null && userFromToken(token) != null) return token
        refreshSession()
        return tokenStore.accessToken
    }

    /** Stable per-device ID for the guest daily free allowance. */
    fun anonymousId(): String = tokenStore.anonymousId()

    /**
     * Permanently deletes the signed-in account on the server, then signs out.
     * Returns true on success (Google Play in-app account deletion requirement).
     */
    suspend fun deleteAccount(): Boolean {
        val token = accessToken() ?: return false
        return try {
            PortalApi.deleteAccount(token)
            signOut()
            true
        } catch (e: Exception) {
            false
        }
    }

    fun hasStoredSession(): Boolean =
        tokenStore.accessToken != null || tokenStore.refreshToken != null

    private suspend fun refreshSession() {
        val stored = tokenStore.refreshToken
        if (stored == null) {
            _user.value = null
            return
        }
        try {
            val response: TokenResponse = PortalHttp.client.post("${AppConfig.AUTH_URL}/oauth/refresh") {
                contentType(ContentType.Application.Json)
                setBody(RefreshRequest(AppConfig.APP_KEY, stored))
            }.body()
            tokenStore.accessToken = response.accessToken
            _user.value = userFromToken(response.accessToken)
        } catch (_: Exception) {
            tokenStore.clear()
            _user.value = null
        }
    }

    /** Decodes the JWT payload for user info, returning null when expired. */
    private fun userFromToken(token: String): AuthUser? = try {
        val parts = token.split(".")
        if (parts.size != 3) null else {
            val payload = String(Base64.decode(parts[1], Base64.URL_SAFE or Base64.NO_WRAP))
            val obj = json.parseToJsonElement(payload).jsonObject
            val sub = obj["sub"]?.jsonPrimitive?.content
            val exp = obj["exp"]?.jsonPrimitive?.content?.toLongOrNull()
            when {
                sub == null -> null
                exp != null && exp * 1000L < System.currentTimeMillis() -> null
                else -> AuthUser(
                    id = sub,
                    email = obj["email"]?.jsonPrimitive?.content ?: "",
                    name = obj["name"]?.jsonPrimitive?.content,
                    picture = obj["picture"]?.jsonPrimitive?.content,
                )
            }
        }
    } catch (_: Exception) {
        null
    }

    private fun randomString(length: Int): String {
        val chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
        val random = SecureRandom()
        return (1..length).map { chars[random.nextInt(chars.length)] }.joinToString("")
    }

    private fun codeChallenge(verifier: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(verifier.toByteArray())
        return Base64.encodeToString(digest, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
    }
}
