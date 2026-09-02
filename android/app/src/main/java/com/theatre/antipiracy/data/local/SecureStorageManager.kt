package com.theatre.antipiracy.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.google.gson.Gson
import com.theatre.antipiracy.data.models.AuthUser
import com.theatre.antipiracy.data.models.ProtectedSessionData

class SecureStorageManager(context: Context) {

    private val gson = Gson()

    private val sharedPreferences: SharedPreferences = try {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        EncryptedSharedPreferences.create(
            context,
            "antipiracy_secure_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    } catch (e: Exception) {
        // Fallback for testing environments / emulator issues
        context.getSharedPreferences("antipiracy_fallback_prefs", Context.MODE_PRIVATE)
    }

    companion object {
        private const val KEY_AUTH_TOKEN = "jwt_auth_token"
        private const val KEY_AUTH_USER = "auth_user_json"
        private const val KEY_ACTIVE_SESSION = "active_protected_session"
        private const val KEY_CUSTOM_API_BASE_URL = "custom_api_base_url"
        private const val DEFAULT_API_BASE_URL = "http://10.0.2.2:4000/api" // Android emulator loopback
    }

    fun saveAuth(token: String, user: AuthUser) {
        sharedPreferences.edit()
            .putString(KEY_AUTH_TOKEN, token)
            .putString(KEY_AUTH_USER, gson.toJson(user))
            .apply()
    }

    fun getAuthToken(): String? {
        return sharedPreferences.getString(KEY_AUTH_TOKEN, null)
    }

    fun getAuthUser(): AuthUser? {
        val userJson = sharedPreferences.getString(KEY_AUTH_USER, null) ?: return null
        return try {
            gson.fromJson(userJson, AuthUser::class.java)
        } catch (e: Exception) {
            null
        }
    }

    fun clearAuth() {
        sharedPreferences.edit()
            .remove(KEY_AUTH_TOKEN)
            .remove(KEY_AUTH_USER)
            .remove(KEY_ACTIVE_SESSION)
            .apply()
    }

    fun saveActiveSession(session: ProtectedSessionData) {
        sharedPreferences.edit()
            .putString(KEY_ACTIVE_SESSION, gson.toJson(session))
            .apply()
    }

    fun getActiveSession(): ProtectedSessionData? {
        val sessionJson = sharedPreferences.getString(KEY_ACTIVE_SESSION, null) ?: return null
        return try {
            val session = gson.fromJson(sessionJson, ProtectedSessionData::class.java) ?: return null
            val expiryMillis = try {
                java.time.Instant.parse(session.expiresAt).toEpochMilli()
            } catch (e: Exception) {
                Long.MAX_VALUE
            }

            if (System.currentTimeMillis() >= expiryMillis) {
                clearActiveSession()
                null
            } else {
                session
            }
        } catch (e: Exception) {
            null
        }
    }

    fun clearActiveSession() {
        sharedPreferences.edit()
            .remove(KEY_ACTIVE_SESSION)
            .apply()
    }

    fun getApiBaseUrl(): String {
        return sharedPreferences.getString(KEY_CUSTOM_API_BASE_URL, DEFAULT_API_BASE_URL) ?: DEFAULT_API_BASE_URL
    }

    fun setCustomApiBaseUrl(url: String) {
        val cleanUrl = if (url.endsWith("/")) url.substring(0, url.length - 1) else url
        sharedPreferences.edit()
            .putString(KEY_CUSTOM_API_BASE_URL, cleanUrl)
            .apply()
    }

    fun resetCustomApiBaseUrl() {
        sharedPreferences.edit()
            .remove(KEY_CUSTOM_API_BASE_URL)
            .apply()
    }
}
