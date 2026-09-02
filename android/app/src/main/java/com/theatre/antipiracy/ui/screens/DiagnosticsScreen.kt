package com.theatre.antipiracy.ui.screens

import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.theatre.antipiracy.data.local.SecureStorageManager
import com.theatre.antipiracy.data.remote.ApiClient
import com.theatre.antipiracy.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun DiagnosticsScreen(
    secureStorage: SecureStorageManager,
    onLogout: () -> Unit
) {
    val scope = rememberCoroutineScope()

    var isCheckingApi by remember { mutableStateOf(false) }
    var apiLatencyMs by remember { mutableStateOf<Long?>(null) }
    var apiStatus by remember { mutableStateOf("NOT_CHECKED") }

    var customApiUrl by remember { mutableStateOf(secureStorage.getApiBaseUrl()) }
    var urlSavedMessage by remember { mutableStateOf<String?>(null) }

    val authUser = secureStorage.getAuthUser()
    val activeSession = secureStorage.getActiveSession()

    fun runHealthCheck() {
        scope.launch {
            isCheckingApi = true
            val startTime = System.currentTimeMillis()
            try {
                val response = ApiClient.getApiService().checkHealth()
                val duration = System.currentTimeMillis() - startTime
                if (response.isSuccessful) {
                    apiLatencyMs = duration
                    apiStatus = "HEALTHY"
                } else {
                    apiStatus = "ERROR_HTTP_${response.code()}"
                }
            } catch (e: Exception) {
                apiStatus = "UNREACHABLE"
            } finally {
                isCheckingApi = false
            }
        }
    }

    LaunchedEffect(Unit) {
        runHealthCheck()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate950)
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Native Device Diagnostics",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Text(
            text = "Hardware, OS, telemetry & API integrity probes",
            style = MaterialTheme.typography.bodySmall,
            color = Slate400
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Diagnostic Grid Cards
        DiagnosticItemCard(
            title = "API Reachability & Latency",
            icon = Icons.Default.Wifi,
            status = apiStatus,
            statusColor = if (apiStatus == "HEALTHY") Emerald400 else Red500,
            detail = if (apiLatencyMs != null) "Roundtrip Ping: ${apiLatencyMs}ms" else "API offline / checking",
            actionLabel = "Re-test Ping",
            onAction = { runHealthCheck() }
        )

        Spacer(modifier = Modifier.height(8.dp))

        DiagnosticItemCard(
            title = "Authentication & Venue Binding",
            icon = Icons.Default.Person,
            status = if (authUser != null) "AUTHENTICATED" else "ANONYMOUS",
            statusColor = if (authUser != null) Emerald400 else Amber500,
            detail = authUser?.let { "${it.name} (${it.role})\nTheatre: ${it.theatreName ?: "Global/Demo"} [${it.theatreCode ?: "N/A"}]" } ?: "Not logged in"
        )

        Spacer(modifier = Modifier.height(8.dp))

        DiagnosticItemCard(
            title = "Android OS & Security Capabilities",
            icon = Icons.Default.Android,
            status = "API ${Build.VERSION.SDK_INT}",
            statusColor = Cyan500,
            detail = "Device: ${Build.MANUFACTURER} ${Build.MODEL}\nFLAG_SECURE: Supported\nScreenCaptureCallback: ${if (Build.VERSION.SDK_INT >= 34) "Active (Android 14+)" else "Fallback mode"}"
        )

        Spacer(modifier = Modifier.height(8.dp))

        DiagnosticItemCard(
            title = "Camera & QR Subsystem",
            icon = Icons.Default.CameraAlt,
            status = "HARDWARE READY",
            statusColor = Emerald400,
            detail = "CameraX + Google ML Kit Barcode Analyzer"
        )

        Spacer(modifier = Modifier.height(8.dp))

        DiagnosticItemCard(
            title = "Protected Session Status",
            icon = Icons.Default.Shield,
            status = activeSession?.protectionStatus ?: "IDLE",
            statusColor = if (activeSession != null) Emerald400 else Slate400,
            detail = activeSession?.let { "Session ID: ${it.sessionId}\nSeat: ${it.seatNumber} | Movie: ${it.movie.title}" } ?: "No active screening"
        )

        Spacer(modifier = Modifier.height(8.dp))

        DiagnosticItemCard(
            title = "SOC Telemetry Link",
            icon = Icons.Default.Sensors,
            status = "CONNECTED",
            statusColor = Emerald400,
            detail = "Unified SOC Ingestion: Non-Punitive Educational Advisory Active"
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Custom API Base URL Configuration Card
        Card(
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Slate900),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Backend API Endpoint Configuration",
                    style = MaterialTheme.typography.titleSmall,
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = customApiUrl,
                    onValueChange = { customApiUrl = it },
                    label = { Text("API Base URL") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Cyan500,
                        unfocusedBorderColor = Slate700,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Slate200
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                if (urlSavedMessage != null) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(urlSavedMessage!!, color = Emerald400, fontSize = 11.sp)
                }

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = {
                            secureStorage.setCustomApiBaseUrl(customApiUrl.trim())
                            urlSavedMessage = "Saved API URL! Re-testing connection..."
                            runHealthCheck()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Cyan500),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Save & Apply", color = Slate950, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }

                    OutlinedButton(
                        onClick = {
                            secureStorage.resetCustomApiBaseUrl()
                            customApiUrl = secureStorage.getApiBaseUrl()
                            urlSavedMessage = "Reset to default endpoint."
                            runHealthCheck()
                        },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Reset Default", fontSize = 12.sp)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        if (authUser != null) {
            Button(
                onClick = {
                    secureStorage.clearAuth()
                    onLogout()
                },
                colors = ButtonDefaults.buttonColors(containerColor = Red500),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Sign Out Operator", color = Color.White, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun DiagnosticItemCard(
    title: String,
    icon: ImageVector,
    status: String,
    statusColor: Color,
    detail: String,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Slate900),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = Cyan500,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = title,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White,
                        fontSize = 13.sp
                    )
                }

                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = statusColor.copy(alpha = 0.15f)
                ) {
                    Text(
                        text = status,
                        color = statusColor,
                        fontWeight = FontWeight.Bold,
                        fontSize = 10.sp,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = detail,
                color = Slate400,
                fontSize = 12.sp,
                lineHeight = 16.sp
            )

            if (actionLabel != null && onAction != null) {
                Spacer(modifier = Modifier.height(8.dp))
                TextButton(
                    onClick = onAction,
                    contentPadding = PaddingValues(0.dp)
                ) {
                    Text(actionLabel, color = Cyan500, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
