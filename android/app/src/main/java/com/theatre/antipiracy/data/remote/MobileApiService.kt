package com.theatre.antipiracy.data.remote

import com.theatre.antipiracy.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface MobileApiService {

    // --- Health Probe ---
    @GET("../health")
    suspend fun checkHealth(): Response<HealthCheckResponse>

    // --- Authentication ---
    @POST("auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<ApiResponse<LoginResponseData>>

    // --- Ticket QR Verification ---
    @POST("mobile/verify")
    suspend fun verifyTicketQr(
        @Body request: VerifyTicketRequest
    ): Response<ApiResponse<ProtectedSessionData>>

    // --- Protected Session Details ---
    @GET("mobile/session/{sessionId}")
    suspend fun getProtectedSession(
        @Path("sessionId") sessionId: String
    ): Response<ApiResponse<ProtectedSessionData>>

    // --- Dynamic Watermark Rotation ---
    @POST("mobile/watermark/rotate")
    suspend fun rotateWatermark(
        @Body request: RotateWatermarkRequest
    ): Response<ApiResponse<WatermarkData>>

    // --- Watermark Attribution (Forensics) ---
    @POST("mobile/watermark/attribute")
    suspend fun attributeWatermark(
        @Body request: WatermarkAttributionRequest
    ): Response<ApiResponse<WatermarkAttributionResult>>

    // --- Evidence Vault Recording ---
    @POST("mobile/watermark/evidence")
    suspend fun logEvidenceVault(
        @Body request: CreateEvidenceRequest
    ): Response<ApiResponse<EvidenceVaultResult>>

    // --- Security Telemetry & SOC Ingestion ---
    @POST("mobile/security/event")
    suspend fun submitSecurityEvent(
        @Body payload: SecurityEventPayload
    ): Response<ApiResponse<SecurityEventResponse>>
}
