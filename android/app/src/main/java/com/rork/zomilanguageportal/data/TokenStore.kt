package com.rork.zomilanguageportal.data

import android.content.Context
import android.content.SharedPreferences
import java.util.UUID

/** Private app-storage for the portal session tokens. */
class TokenStore(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("zomi_portal_session", Context.MODE_PRIVATE)

    /**
     * Stable per-device identifier for the anonymous translation free tier.
     * Guests may translate up to 1,500 words before an account is required;
     * the ID persists so the allowance is tracked across app restarts.
     */
    fun anonymousId(): String {
        prefs.getString(KEY_ANONYMOUS, null)?.let { return it }
        val generated = UUID.randomUUID().toString()
        prefs.edit().putString(KEY_ANONYMOUS, generated).apply()
        return generated
    }

    var accessToken: String?
        get() = prefs.getString(KEY_ACCESS, null)
        set(value) = prefs.edit().apply {
            if (value == null) remove(KEY_ACCESS) else putString(KEY_ACCESS, value)
        }.apply()

    var refreshToken: String?
        get() = prefs.getString(KEY_REFRESH, null)
        set(value) = prefs.edit().apply {
            if (value == null) remove(KEY_REFRESH) else putString(KEY_REFRESH, value)
        }.apply()

    fun clear() {
        prefs.edit().remove(KEY_ACCESS).remove(KEY_REFRESH).apply()
    }

    private companion object {
        const val KEY_ACCESS = "access_token"
        const val KEY_REFRESH = "refresh_token"
        const val KEY_ANONYMOUS = "anonymous_id"
    }
}
