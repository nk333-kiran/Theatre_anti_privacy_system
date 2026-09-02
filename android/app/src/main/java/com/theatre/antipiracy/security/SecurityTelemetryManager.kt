package com.theatre.antipiracy.security

import android.app.Activity
import android.app.Application
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.WindowManager
import com.theatre.antipiracy.data.local.SecureStorageManager
import com.theatre.antipiracy.data.models.SecurityEventPayload
import com.theatre.antipiracy.data.models.SecurityEventResponse
import com.theatre.antipiracy.data.remote.ApiClient
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

class SecurityTelemetryManager(
    private val application: Application,
    private val secureStorage: SecureStorageManager,
    private val networkTracker: NetworkStateTracker = NetworkStateTracker(application)
) : Application.ActivityLifecycleCallbacks {

    private val tag = "SecurityTelemetry"
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    val retryQueue = TelemetryRetryQueue()

    private var currentActivity: Activity? = null
    private var isAppInForeground: Boolean = false

    private val _warningEvents = MutableSharedFlow<SecurityEventResponse>(extraBufferCapacity = 10)
    val warningEvents: SharedFlow<SecurityEventResponse> = _warningEvents.asSharedFlow()

    // Android 14+ Screen Capture Callback handle
    private var screenCaptureCallback: Activity.ScreenCaptureCallback? = null

    init {
        application.registerActivityLifecycleCallbacks(this)

        // Observe connectivity changes to flush retry queue
        scope.launch {
            networkTracker.isOnline.collect { isOnline ->
                if (isOnline) {
                    Log.i(tag, "Network restored. Triggering telemetry retry queue flush.")
                    retryQueue.flushQueue()
                }
            }
        }
    }

    /**
     * Applies Android window-level security protection (FLAG_SECURE).
     * Prevents standard OS-level screenshots and task switcher previews.
     */
    fun applyWindowProtection(activity: Activity, enable: Boolean = true) {
        activity.runOnUiThread {
            if (enable) {
                activity.window.setFlags(
                    WindowManager.LayoutParams.FLAG_SECURE,
                    WindowManager.LayoutParams.FLAG_SECURE
                )
                Log.d(tag, "WindowManager.LayoutParams.FLAG_SECURE enabled for ${activity.localClassName}")
            } else {
                activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                Log.d(tag, "WindowManager.LayoutParams.FLAG_SECURE cleared for ${activity.localClassName}")
            }
        }
    }

    /**
     * Registers Android 14 (API 34) native screen capture listener if supported.
     */
    fun registerScreenCaptureDetector(activity: Activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            try {
                screenCaptureCallback = Activity.ScreenCaptureCallback {
                    Log.w(tag, "Native Android 14 ScreenCaptureCallback triggered")
                    dispatchSecurityEvent(
                        eventType = "SCREEN_CAPTURE_SIGNAL",
                        severity = "HIGH",
                        metadata = mapOf(
                            "source" to "Android14_ScreenCaptureCallback",
                            "sdkInt" to Build.VERSION.SDK_INT,
                            "detectionType" to "OS_CALLBACK"
                        )
                    )
                }
                activity.registerScreenCaptureCallback(activity.mainExecutor, screenCaptureCallback!!)
                Log.d(tag, "ScreenCaptureCallback successfully registered")
            } catch (e: Exception) {
                Log.w(tag, "ScreenCaptureCallback registration failed: ${e.message}")
            }
        }
    }

    fun unregisterScreenCaptureDetector(activity: Activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE && screenCaptureCallback != null) {
            try {
                activity.unregisterScreenCaptureCallback(screenCaptureCallback!!)
                screenCaptureCallback = null
            } catch (e: Exception) {
                Log.w(tag, "ScreenCaptureCallback unregister error: ${e.message}")
            }
        }
    }

    /**
     * Dispatches normalized security telemetry to backend SOC API.
     * All signals are handled as non-punitive advisories on single occurrences.
     * Enqueues into TelemetryRetryQueue if network is currently unavailable.
     */
    fun dispatchSecurityEvent(
        eventType: String,
        severity: String,
        metadata: Map<String, Any>? = null
    ) {
        scope.launch {
            val activeSession = secureStorage.getActiveSession()
            val authUser = secureStorage.getAuthUser()

            val payload = SecurityEventPayload(
                eventType = eventType,
                severity = severity,
                sessionId = activeSession?.sessionId,
                theatreId = activeSession?.theatre?.id ?: authUser?.theatreId,
                showId = null,
                movieId = activeSession?.movie?.id,
                deviceFingerprint = "${Build.MANUFACTURER}_${Build.MODEL}_Android${Build.VERSION.RELEASE}",
                metadata = metadata ?: mapOf(
                    "deviceModel" to Build.MODEL,
                    "sdkInt" to Build.VERSION.SDK_INT,
                    "foreground" to isAppInForeground
                )
            )

            if (!networkTracker.isOnline.value) {
                Log.d(tag, "Device offline. Enqueuing event '$eventType' for retry.")
                retryQueue.enqueue(payload)
                return@launch
            }

            try {
                val response = ApiClient.getApiService().submitSecurityEvent(payload)
                if (response.isSuccessful && response.body()?.data != null) {
                    val result = response.body()!!.data!!
                    Log.i(tag, "Security event '$eventType' ingested by SOC (riskScore: ${result.riskScore})")

                    // Emit non-punitive warning if required by SOC policy
                    if (result.warningRequired) {
                        _warningEvents.emit(result)
                    }
                } else {
                    Log.w(tag, "Security event submission returned HTTP ${response.code()}. Enqueuing for retry.")
                    retryQueue.enqueue(payload)
                }
            } catch (e: Exception) {
                Log.e(tag, "Failed to dispatch security event to SOC: ${e.message}. Enqueuing for retry.")
                retryQueue.enqueue(payload)
            }
        }
    }

    // --- Activity Lifecycle Listeners ---

    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}

    override fun onActivityStarted(activity: Activity) {
        currentActivity = activity
    }

    override fun onActivityResumed(activity: Activity) {
        currentActivity = activity
        if (!isAppInForeground) {
            isAppInForeground = true
            dispatchSecurityEvent(
                eventType = "FOREGROUND_BACKGROUND_CHANGE",
                severity = "LOW",
                metadata = mapOf("state" to "FOREGROUND", "activity" to activity.localClassName)
            )
        }
    }

    override fun onActivityPaused(activity: Activity) {
        // App moving to background or losing window focus
        if (isAppInForeground) {
            isAppInForeground = false
            dispatchSecurityEvent(
                eventType = "SCREEN_VISIBILITY_CHANGE",
                severity = "LOW",
                metadata = mapOf("state" to "BACKGROUND", "activity" to activity.localClassName)
            )
        }
    }

    override fun onActivityStopped(activity: Activity) {
        if (currentActivity == activity) {
            currentActivity = null
        }
    }

    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}

    override fun onActivityDestroyed(activity: Activity) {
        unregisterScreenCaptureDetector(activity)
    }
}
