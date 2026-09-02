package com.theatre.antipiracy.data.config

enum class EnvironmentType(val displayName: String, val defaultBaseUrl: String, val requiresHttps: Boolean) {
    DEVELOPMENT("Development (LAN / Emulator)", "http://10.0.2.2:4000/api", false),
    STAGING("Staging / Pre-Prod", "https://staging-api.theatre-antipiracy.com/api", true),
    PRODUCTION("Production (Secure Cloud)", "https://api.theatre-antipiracy.com/api", true)
}

object EnvironmentConfig {

    const val APP_VERSION_NAME = "1.0.0"
    const val APP_VERSION_CODE = 100

    /**
     * Validates whether an API endpoint URL adheres to production security policies.
     */
    fun validateEndpointSecurity(url: String, environment: EnvironmentType): Boolean {
        if (environment.requiresHttps && !url.startsWith("https://", ignoreCase = true)) {
            return false
        }
        return url.isNotBlank()
    }

    /**
     * Normalizes base URL to ensure clean formatting.
     */
    fun sanitizeBaseUrl(url: String): String {
        var clean = url.trim()
        if (clean.endsWith("/")) {
            clean = clean.substring(0, clean.length - 1)
        }
        return clean
    }
}
