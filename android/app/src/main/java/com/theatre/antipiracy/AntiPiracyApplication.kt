package com.theatre.antipiracy

import android.app.Application
import com.theatre.antipiracy.data.local.SecureStorageManager
import com.theatre.antipiracy.data.remote.ApiClient
import com.theatre.antipiracy.security.SecurityTelemetryManager

class AntiPiracyApplication : Application() {

    lateinit var secureStorage: SecureStorageManager
        private set

    lateinit var telemetryManager: SecurityTelemetryManager
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this

        secureStorage = SecureStorageManager(this)
        ApiClient.initialize(secureStorage)
        telemetryManager = SecurityTelemetryManager(this, secureStorage)
    }

    companion object {
        lateinit var instance: AntiPiracyApplication
            private set
    }
}
