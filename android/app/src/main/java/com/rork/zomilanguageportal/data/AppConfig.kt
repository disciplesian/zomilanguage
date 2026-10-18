package com.rork.zomilanguageportal.data

/**
 * Public runtime configuration for the Zomi Language Portal Android app.
 * These are the same client-side public identifiers used by the iOS and web clients.
 */
object AppConfig {
    const val AUTH_URL = "https://api.rork.com"
    const val APP_KEY = "rpk_sh3poliek53gzkv6oqmgz29xoc77qpbi"
    const val PROJECT_ID = "c71czcicbp014dj0l1fu3"
    const val API_BASE_URL = "https://zomilanguage-backend.rork.app"
    const val SUPPORT_EMAIL = "support@zomitranslator.com"
    const val WEBSITE_URL = "https://zomilanguage.rork.app"

    val callbackUrl: String get() = "rork-$PROJECT_ID://auth/callback"
}
