package com.theatre.antipiracy.security

import android.util.Log
import com.theatre.antipiracy.data.local.SecureStorageManager
import com.theatre.antipiracy.data.models.RotateWatermarkRequest
import com.theatre.antipiracy.data.models.WatermarkData
import com.theatre.antipiracy.data.remote.ApiClient
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class WatermarkRotationManager(
    private val secureStorage: SecureStorageManager
) {
    private val tag = "WatermarkRotation"
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private var rotationJob: Job? = null

    private val _currentWatermark = MutableStateFlow<WatermarkData?>(null)
    val currentWatermark: StateFlow<WatermarkData?> = _currentWatermark.asStateFlow()

    private val _isRotating = MutableStateFlow(false)
    val isRotating: StateFlow<Boolean> = _isRotating.asStateFlow()

    fun startRotation(initialWatermark: WatermarkData?, sessionId: String) {
        stopRotation()
        _currentWatermark.value = initialWatermark
        _isRotating.value = true

        rotationJob = scope.launch {
            Log.i(tag, "Started dynamic watermark rotation for session $sessionId")
            while (isActive) {
                delay(25_000L) // Rotate every 25 seconds

                try {
                    val response = ApiClient.getApiService().rotateWatermark(
                        RotateWatermarkRequest(sessionId = sessionId)
                    )

                    if (response.isSuccessful && response.body()?.data != null) {
                        val newWatermark = response.body()!!.data!!
                        _currentWatermark.value = newWatermark
                        Log.d(tag, "Rotated watermark to slot #${newWatermark.timeSlot} (${newWatermark.watermarkId})")
                    } else {
                        Log.w(tag, "Watermark rotation returned HTTP ${response.code()}")
                    }
                } catch (e: Exception) {
                    Log.e(tag, "Watermark rotation request failed: ${e.message}")
                }
            }
        }
    }

    fun stopRotation() {
        rotationJob?.cancel()
        rotationJob = null
        _isRotating.value = false
        Log.d(tag, "Stopped watermark rotation")
    }

    fun setInitialWatermark(watermark: WatermarkData?) {
        _currentWatermark.value = watermark
    }
}
