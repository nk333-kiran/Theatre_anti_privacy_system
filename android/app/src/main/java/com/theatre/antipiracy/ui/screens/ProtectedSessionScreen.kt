package com.theatre.antipiracy.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.theatre.antipiracy.data.local.SecureStorageManager
import com.theatre.antipiracy.data.models.ProtectedSessionData
import com.theatre.antipiracy.security.WatermarkRotationManager
import com.theatre.antipiracy.ui.components.DynamicWatermarkOverlay
import com.theatre.antipiracy.ui.theme.*
import kotlinx.coroutines.delay

@Composable
fun ProtectedSessionScreen(
    session: ProtectedSessionData?,
    secureStorage: SecureStorageManager,
    watermarkManager: WatermarkRotationManager,
    onSessionEnded: () -> Unit
) {
    if (session == null) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Slate950),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "No Active Screening Session.\nPlease scan a valid ticket QR.",
                color = Slate400,
                style = MaterialTheme.typography.bodyLarge,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
        }
        return
    }

    val currentWatermark by watermarkManager.currentWatermark.collectAsState()
    val isRotating by watermarkManager.isRotating.collectAsState()

    // Dynamic countdown timer derived from server expiresAt ISO timestamp
    val expiryMillis = remember(session.expiresAt) {
        try {
            java.time.Instant.parse(session.expiresAt).toEpochMilli()
        } catch (e: Exception) {
            System.currentTimeMillis() + (120 * 60 * 1000)
        }
    }

    var remainingSeconds by remember {
        mutableStateOf(maxOf(0L, (expiryMillis - System.currentTimeMillis()) / 1000))
    }

    LaunchedEffect(session.sessionId, expiryMillis) {
        watermarkManager.startRotation(session.watermark, session.sessionId)

        while (true) {
            val diffSec = maxOf(0L, (expiryMillis - System.currentTimeMillis()) / 1000)
            remainingSeconds = diffSec

            if (diffSec <= 0) {
                // Session expired: stop watermark rotation and purge storage
                watermarkManager.stopRotation()
                secureStorage.clearActiveSession()
                onSessionEnded()
                break
            }
            delay(1000L)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate950)
    ) {
        // Floating Dynamic Watermark Canvas Layer
        DynamicWatermarkOverlay(watermark = currentWatermark)

        // Session Information Content
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Status Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Shield,
                        contentDescription = "Shield",
                        tint = Emerald400,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "PROTECTED SCREENING",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Emerald500.copy(alpha = 0.15f)
                ) {
                    Text(
                        text = session.protectionStatus,
                        color = Emerald400,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Movie Feature Card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Slate900.copy(alpha = 0.9f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Movie,
                            contentDescription = "Movie",
                            tint = Cyan500,
                            modifier = Modifier.size(28.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = session.movie.title,
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = "Duration: ${session.movie.durationMinutes ?: 120} min | Rating: ${session.movie.rating ?: "PG-13"}",
                                style = MaterialTheme.typography.bodySmall,
                                color = Slate400
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    HorizontalDivider(color = Slate800)
                    Spacer(modifier = Modifier.height(16.dp))

                    // Grid details
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("THEATRE", style = MaterialTheme.typography.labelSmall, color = Slate400)
                            Text(session.theatre.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = Color.White)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("AUDITORIUM", style = MaterialTheme.typography.labelSmall, color = Slate400)
                            Text(session.screen.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = Color.White)
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("SEAT ALLOCATION", style = MaterialTheme.typography.labelSmall, color = Slate400)
                            Text(
                                text = session.seatNumber,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = Cyan500
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("TICKET NUMBER", style = MaterialTheme.typography.labelSmall, color = Slate400)
                            Text(session.ticketNumber, style = MaterialTheme.typography.bodyMedium, fontFamily = FontFamily.Monospace, color = Slate200)
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("REMAINING TIME", style = MaterialTheme.typography.labelSmall, color = Slate400)
                            Text(
                                text = "${remainingSeconds / 60}m ${remainingSeconds % 60}s",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = if (remainingSeconds > 300) Emerald400 else Amber500
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("SESSION IDENTIFIER", style = MaterialTheme.typography.labelSmall, color = Slate400)
                            Text(session.sessionId, style = MaterialTheme.typography.bodySmall, fontFamily = FontFamily.Monospace, color = Slate400)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Dynamic Watermark Diagnostics Card
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Slate900.copy(alpha = 0.9f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Dynamic Watermark Telemetry",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = if (isRotating) Cyan500.copy(alpha = 0.15f) else Slate800
                        ) {
                            Text(
                                text = if (isRotating) "ROTATING (25s)" else "STATIC",
                                color = if (isRotating) Cyan500 else Slate400,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    currentWatermark?.let { wm ->
                        Text("Active Watermark ID:", style = MaterialTheme.typography.labelSmall, color = Slate400)
                        Text(wm.watermarkId, fontFamily = FontFamily.Monospace, fontSize = 12.sp, color = Slate200)

                        Spacer(modifier = Modifier.height(6.dp))

                        Text("Current Slot:", style = MaterialTheme.typography.labelSmall, color = Slate400)
                        Text("Epoch Slot #${wm.timeSlot} (${wm.theatreCode} / ${wm.seatNumber})", style = MaterialTheme.typography.bodySmall, color = Cyan500)
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            OutlinedButton(
                onClick = {
                    watermarkManager.stopRotation()
                    secureStorage.clearActiveSession()
                    onSessionEnded()
                },
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Red500),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("End Screening Session")
            }
        }
    }
}
