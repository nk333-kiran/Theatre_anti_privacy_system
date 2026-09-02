package com.theatre.antipiracy

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.theatre.antipiracy.data.local.SecureStorageManager
import com.theatre.antipiracy.data.models.AuthUser
import com.theatre.antipiracy.data.models.ProtectedSessionData
import com.theatre.antipiracy.data.models.SecurityEventResponse
import com.theatre.antipiracy.security.SecurityTelemetryManager
import com.theatre.antipiracy.security.WatermarkRotationManager
import com.theatre.antipiracy.ui.components.AntiPiracyWarningDialog
import com.theatre.antipiracy.ui.screens.*
import com.theatre.antipiracy.ui.theme.*

enum class AppTab(val title: String, val icon: ImageVector) {
    SCANNER("Scan", Icons.Default.QrCodeScanner),
    SESSION("Session", Icons.Default.Shield),
    ATTRIBUTION("Attrib", Icons.Default.Fingerprint),
    SECURITY("SOC", Icons.Default.Sensors),
    DIAGNOSTICS("Diag", Icons.Default.Speed)
}

class MainActivity : ComponentActivity() {

    private lateinit var secureStorage: SecureStorageManager
    private lateinit var telemetryManager: SecurityTelemetryManager
    private lateinit var watermarkManager: WatermarkRotationManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val app = application as AntiPiracyApplication
        secureStorage = app.secureStorage
        telemetryManager = app.telemetryManager
        watermarkManager = WatermarkRotationManager(secureStorage)

        // Apply Android Window Protection (FLAG_SECURE)
        telemetryManager.applyWindowProtection(this, enable = true)

        // Register Android 14+ Screen Capture detector
        telemetryManager.registerScreenCaptureDetector(this)

        setContent {
            TheatreAntiPiracyTheme {
                MainAppContainer(
                    secureStorage = secureStorage,
                    telemetryManager = telemetryManager,
                    watermarkManager = watermarkManager
                )
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        telemetryManager.unregisterScreenCaptureDetector(this)
        watermarkManager.stopRotation()
    }
}

@Composable
fun MainAppContainer(
    secureStorage: SecureStorageManager,
    telemetryManager: SecurityTelemetryManager,
    watermarkManager: WatermarkRotationManager
) {
    var authUser by remember { mutableStateOf(secureStorage.getAuthUser()) }
    var activeSession by remember { mutableStateOf(secureStorage.getActiveSession()) }
    var selectedTab by remember { mutableStateOf(if (activeSession != null) AppTab.SESSION else AppTab.SCANNER) }

    // Observe non-punitive security warnings from SOC
    var activeWarning by remember { mutableStateOf<SecurityEventResponse?>(null) }

    LaunchedEffect(Unit) {
        telemetryManager.warningEvents.collect { warning ->
            activeWarning = warning
        }
    }

    if (authUser == null) {
        AuthScreen(
            secureStorage = secureStorage,
            onLoginSuccess = { user ->
                authUser = user
                selectedTab = AppTab.SCANNER
            }
        )
    } else {
        Scaffold(
            bottomBar = {
                NavigationBar(
                    containerColor = Slate900,
                    tonalElevation = 8.dp
                ) {
                    AppTab.values().forEach { tab ->
                        val isSelected = selectedTab == tab
                        NavigationBarItem(
                            selected = isSelected,
                            onClick = { selectedTab = tab },
                            icon = {
                                Icon(
                                    imageVector = tab.icon,
                                    contentDescription = tab.title,
                                    tint = if (isSelected) Cyan500 else Slate400
                                )
                            },
                            label = {
                                Text(
                                    text = tab.title,
                                    fontSize = 10.sp,
                                    color = if (isSelected) Cyan500 else Slate400
                                )
                            },
                            colors = NavigationBarItemDefaults.colors(
                                indicatorColor = Cyan500.copy(alpha = 0.15f)
                            )
                        )
                    }
                }
            }
        ) { paddingValues ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(Slate950)
            ) {
                when (selectedTab) {
                    AppTab.SCANNER -> QrScannerScreen(
                        secureStorage = secureStorage,
                        onSessionActivated = { session ->
                            activeSession = session
                            selectedTab = AppTab.SESSION
                        }
                    )
                    AppTab.SESSION -> ProtectedSessionScreen(
                        session = activeSession,
                        secureStorage = secureStorage,
                        watermarkManager = watermarkManager,
                        onSessionEnded = {
                            activeSession = null
                            selectedTab = AppTab.SCANNER
                        }
                    )
                    AppTab.ATTRIBUTION -> ForensicAttributionScreen(
                        currentWatermarkId = activeSession?.watermark?.watermarkId
                    )
                    AppTab.SECURITY -> SecurityTelemetryScreen(
                        telemetryManager = telemetryManager
                    )
                    AppTab.DIAGNOSTICS -> DiagnosticsScreen(
                        secureStorage = secureStorage,
                        onLogout = {
                            authUser = null
                            activeSession = null
                        }
                    )
                }

                // Non-punitive educational warning dialog
                AntiPiracyWarningDialog(
                    warning = activeWarning,
                    onDismiss = { activeWarning = null }
                )
            }
        }
    }
}
