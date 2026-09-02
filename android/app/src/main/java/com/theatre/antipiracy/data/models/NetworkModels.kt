package com.theatre.antipiracy.data.models

import com.google.gson.annotations.SerializedName

// --- Generic API Response ---
data class ApiResponse<T>(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: T?,
    @SerializedName("error") val error: String?,
    @SerializedName("errorCode") val errorCode: String?,
    @SerializedName("message") val message: String?
)

// --- Auth ---
data class LoginRequest(
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String
)

data class AuthUser(
    @SerializedName("id") val id: String,
    @SerializedName("email") val email: String,
    @SerializedName("name") val name: String,
    @SerializedName("role") val role: String,
    @SerializedName("theatreId") val theatreId: String?,
    @SerializedName("theatreName") val theatreName: String?,
    @SerializedName("theatreCode") val theatreCode: String?
)

data class LoginResponseData(
    @SerializedName("token") val token: String,
    @SerializedName("user") val user: AuthUser
)

// --- Ticket QR Verification ---
data class VerifyTicketRequest(
    @SerializedName("qrPayload") val qrPayload: String,
    @SerializedName("deviceFingerprint") val deviceFingerprint: String?,
    @SerializedName("clientIp") val clientIp: String?,
    @SerializedName("userAgent") val userAgent: String?
)

data class MovieSummary(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("durationMinutes") val durationMinutes: Int?,
    @SerializedName("rating") val rating: String?
)

data class TheatreSummary(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("code") val code: String,
    @SerializedName("location") val location: String?
)

data class ScreenSummary(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("screenNumber") val screenNumber: Int?
)

data class ProtectedSessionData(
    @SerializedName("sessionId") val sessionId: String,
    @SerializedName("ticketId") val ticketId: String,
    @SerializedName("ticketNumber") val ticketNumber: String,
    @SerializedName("seatNumber") val seatNumber: String,
    @SerializedName("protectionStatus") val protectionStatus: String,
    @SerializedName("movie") val movie: MovieSummary,
    @SerializedName("theatre") val theatre: TheatreSummary,
    @SerializedName("screen") val screen: ScreenSummary,
    @SerializedName("expiresAt") val expiresAt: String,
    @SerializedName("watermark") val watermark: WatermarkData?,
    @SerializedName("activatedAt") val activatedAt: String?
)

// --- Watermarking ---
data class WatermarkData(
    @SerializedName("watermarkId") val watermarkId: String,
    @SerializedName("displayWatermark") val displayWatermark: String,
    @SerializedName("theatreCode") val theatreCode: String,
    @SerializedName("seatNumber") val seatNumber: String,
    @SerializedName("timeSlot") val timeSlot: Long,
    @SerializedName("timestamp") val timestamp: String
)

data class RotateWatermarkRequest(
    @SerializedName("sessionId") val sessionId: String
)

data class WatermarkAttributionRequest(
    @SerializedName("watermarkId") val watermarkId: String
)

data class WatermarkAttributionResult(
    @SerializedName("watermarkId") val watermarkId: String,
    @SerializedName("sessionId") val sessionId: String,
    @SerializedName("theatreCode") val theatreCode: String,
    @SerializedName("seatNumber") val seatNumber: String,
    @SerializedName("theatreName") val theatreName: String,
    @SerializedName("movieTitle") val movieTitle: String,
    @SerializedName("screenName") val screenName: String,
    @SerializedName("confidence") val confidence: Double
)

data class CreateEvidenceRequest(
    @SerializedName("watermarkId") val watermarkId: String,
    @SerializedName("sessionId") val sessionId: String,
    @SerializedName("reason") val reason: String
)

data class EvidenceVaultResult(
    @SerializedName("evidenceId") val evidenceId: String,
    @SerializedName("evidenceNumber") val evidenceNumber: String,
    @SerializedName("evidenceHash") val evidenceHash: String,
    @SerializedName("status") val status: String,
    @SerializedName("verifiedAt") val verifiedAt: String
)

// --- Security Telemetry & SOC ---
data class SecurityEventPayload(
    @SerializedName("eventType") val eventType: String,
    @SerializedName("severity") val severity: String,
    @SerializedName("sessionId") val sessionId: String?,
    @SerializedName("theatreId") val theatreId: String?,
    @SerializedName("showId") val showId: String?,
    @SerializedName("movieId") val movieId: String?,
    @SerializedName("deviceFingerprint") val deviceFingerprint: String?,
    @SerializedName("metadata") val metadata: Map<String, Any>?
)

data class SecurityEventResponse(
    @SerializedName("status") val status: String,
    @SerializedName("riskScore") val riskScore: Int,
    @SerializedName("warningRequired") val warningRequired: Boolean,
    @SerializedName("warningMessage") val warningMessage: String?,
    @SerializedName("correlatedIncidentId") val correlatedIncidentId: String?
)

// --- Diagnostics ---
data class HealthCheckResponse(
    @SerializedName("status") val status: String,
    @SerializedName("timestamp") val timestamp: String,
    @SerializedName("version") val version: String?
)
