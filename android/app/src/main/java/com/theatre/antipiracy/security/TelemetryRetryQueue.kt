package com.theatre.antipiracy.security

import android.util.Log
import com.theatre.antipiracy.data.models.SecurityEventPayload
import com.theatre.antipiracy.data.remote.ApiClient
import kotlinx.coroutines.*
import java.util.*
import java.util.concurrent.ConcurrentLinkedQueue

class TelemetryRetryQueue {

    private val tag = "TelemetryRetryQueue"
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val queue = ConcurrentLinkedQueue<QueuedSecurityEvent>()
    private var isFlushing = false

    data class QueuedSecurityEvent(
        val idempotencyKey: String,
        val payload: SecurityEventPayload,
        val timestamp: Long = System.currentTimeMillis(),
        var retryCount: Int = 0
    )

    fun enqueue(payload: SecurityEventPayload) {
        val idempotencyKey = UUID.randomUUID().toString()
        val enrichedMetadata = (payload.metadata?.toMutableMap() ?: mutableMapOf()).apply {
            put("idempotencyKey", idempotencyKey)
            put("queuedAt", System.currentTimeMillis())
        }
        val enrichedPayload = payload.copy(metadata = enrichedMetadata)

        val queuedEvent = QueuedSecurityEvent(
            idempotencyKey = idempotencyKey,
            payload = enrichedPayload
        )

        queue.offer(queuedEvent)
        Log.d(tag, "Enqueued telemetry event '${payload.eventType}' (Key: $idempotencyKey). Queue size: ${queue.size}")
    }

    fun flushQueue() {
        if (isFlushing || queue.isEmpty()) return

        scope.launch {
            isFlushing = true
            Log.i(tag, "Flushing telemetry retry queue (${queue.size} pending items)")

            while (queue.isNotEmpty()) {
                val item = queue.peek() ?: break

                try {
                    val response = ApiClient.getApiService().submitSecurityEvent(item.payload)
                    if (response.isSuccessful) {
                        queue.poll()
                        Log.d(tag, "Successfully delivered queued event '${item.payload.eventType}'")
                    } else if (response.code() in 400..499 && response.code() != 429) {
                        // Drop unrecoverable client errors
                        queue.poll()
                        Log.w(tag, "Dropped unrecoverable event '${item.payload.eventType}' (HTTP ${response.code()})")
                    } else {
                        // Transient server error - backoff and break
                        item.retryCount++
                        Log.w(tag, "Transient failure (HTTP ${response.code()}) - will retry later")
                        break
                    }
                } catch (e: Exception) {
                    item.retryCount++
                    Log.w(tag, "Network exception during queue flush: ${e.message}")
                    break
                }
            }

            isFlushing = false
        }
    }

    fun getPendingCount(): Int = queue.size

    fun clearQueue() {
        queue.clear()
    }
}
