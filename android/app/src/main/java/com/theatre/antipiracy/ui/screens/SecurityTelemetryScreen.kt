package com.theatre.antipiracy.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.theatre.antipiracy.security.SecurityTelemetryManager
import com.theatre.antipiracy.ui.theme.*

@Composable
fun SecurityTelemetryScreen(
    telemetryManager: SecurityTelemetryManager
) {
    val signalTypes = listOf(
        Triple("SCREEN_CAPTURE_SIGNAL", "HIGH", "Android 14 Screen Capture Event"),
        Triple("SCREEN_VISIBILITY_CHANGE", "LOW", "App moved to background / split screen"),
        Triple("FOREGROUND_BACKGROUND_CHANGE", "LOW", "App resumed into foreground"),
        Triple("CAMERA_ACTIVITY", "MEDIUM", "Camera hardware session opened"),
        Triple("SUSPICIOUS_ACTIVITY", "HIGH", "Multiple rapid screen focus losses")
    )

    var lastDispatchedEvent by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate950)
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Native Security Telemetry & SOC",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Text(
            text = "Dispatch normalized telemetry signals to the Unified SOC API",
            style = MaterialTheme.typography.bodySmall,
            color = Slate400
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Non-punitive monitoring notice
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = Slate900,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text(
                    text = "🛡️ Architectural Boundary & Non-Punitive Notice",
                    fontWeight = FontWeight.Bold,
                    color = Cyan500,
                    fontSize = 13.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Android security telemetry provides non-punitive educational warnings for single weak signals. Sessions are never abruptly terminated without human SOC review.",
                    color = Slate400,
                    fontSize = 12.sp,
                    lineHeight = 18.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Available Android Telemetry Signals",
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold,
            color = Color.White,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(10.dp))

        signalTypes.forEach { (type, severity, description) ->
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Slate900),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = type,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                fontSize = 13.sp
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = when (severity) {
                                    "HIGH" -> Red500.copy(alpha = 0.2f)
                                    "MEDIUM" -> Amber500.copy(alpha = 0.2f)
                                    else -> Cyan500.copy(alpha = 0.2f)
                                }
                            ) {
                                Text(
                                    text = severity,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = when (severity) {
                                        "HIGH" -> Red500
                                        "MEDIUM" -> Amber500
                                        else -> Cyan500
                                    },
                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                )
                            }
                        }
                        Text(
                            text = description,
                            color = Slate400,
                            fontSize = 11.sp
                        )
                    }

                    Button(
                        onClick = {
                            telemetryManager.dispatchSecurityEvent(type, severity)
                            lastDispatchedEvent = type
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Slate800),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Emit Signal", color = Cyan500, fontSize = 12.sp)
                    }
                }
            }
        }

        if (lastDispatchedEvent != null) {
            Spacer(modifier = Modifier.height(16.dp))
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = Emerald500.copy(alpha = 0.15f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "Dispatched signal '$lastDispatchedEvent' to SOC API.",
                    color = Emerald400,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(12.dp)
                )
            }
        }
    }
}
