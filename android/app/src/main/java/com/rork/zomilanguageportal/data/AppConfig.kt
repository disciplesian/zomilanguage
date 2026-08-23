package com.rork.zomilanguageportal.data

/**
 * Public runtime configuration for the Zomi Language Portal Android app.
 * These are the same client-side public identifiers used by the iOS and web clients.
 */
object AppConfig {
    const val AUTH_URL = "https://api.rork.com"
    const val APP_KEY = "rpk_sh3poliek53gzkv6oqmgz29xoc77qpbi"
    const val PROJECT_ID = "c71czcicbp014dj0l1fu3"
    const val API_BASE_URL = "https://dev-c71czcicbp014dj0l1fu3.rorktest.dev"
    const val SUPPORT_EMAIL = "support@zomi.net"
    const val WEBSITE_URL = "https://c71czcicbp014dj0l1fu3-web.rork.live"

    val callbackUrl: String get() = "rork-$PROJECT_ID://auth/callback"
}
