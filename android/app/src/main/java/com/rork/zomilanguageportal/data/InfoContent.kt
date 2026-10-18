package com.rork.zomilanguageportal.data

import android.content.Context
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/** About / Privacy / Terms / Help text from the bundled info-pages.json —
 *  the same source the website and the iPhone app use, readable offline. */
@Serializable
data class InfoContent(
    val lastUpdated: String = "",
    val supportEmail: String = AppConfig.SUPPORT_EMAIL,
    val website: String = "",
    val about: About = About(),
    val privacy: Legal = Legal(),
    val terms: Legal = Legal(),
    val help: Help = Help(),
) {
    @Serializable
    data class Section(
        val id: String? = null,
        val title: String = "",
        val body: String? = null,
        val paragraphs: List<String> = emptyList(),
        val bullets: List<String> = emptyList(),
    )

    @Serializable
    data class About(val tagline: String = "", val sections: List<Section> = emptyList())

    @Serializable
    data class Legal(
        val title: String = "",
        val summary: List<String> = emptyList(),
        val intro: String = "",
        val sections: List<Section> = emptyList(),
    )

    @Serializable
    data class Faq(val q: String = "", val a: String = "")

    @Serializable
    data class Tip(val title: String = "", val body: String = "")

    @Serializable
    data class Help(
        val title: String = "",
        val intro: String = "",
        val faqs: List<Faq> = emptyList(),
        val troubleshooting: List<Tip> = emptyList(),
    )

    companion object {
        @Volatile
        private var cached: InfoContent? = null
        private val json = Json { ignoreUnknownKeys = true }

        fun load(context: Context): InfoContent {
            cached?.let { return it }
            val loaded = runCatching {
                context.applicationContext.assets.open("info-pages.json").bufferedReader().use { it.readText() }
                    .let { json.decodeFromString<InfoContent>(it) }
            }.getOrDefault(InfoContent())
            cached = loaded
            return loaded
        }
    }
}
