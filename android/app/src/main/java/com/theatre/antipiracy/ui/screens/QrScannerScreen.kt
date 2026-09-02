package com.theatre.antipiracy.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.theatre.antipiracy.camera.QrScannerManager
import com.theatre.antipiracy.data.local.SecureStorageManager
import com.theatre.antipiracy.data.models.ProtectedSessionData
import com.theatre.antipiracy.data.models.VerifyTicketRequest
import com.theatre.antipiracy.data.remote.ApiClient
import com.theatre.antipiracy.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun QrScannerScreen(
    secureStorage: SecureStorageManager,
    onSessionActivated: (ProtectedSessionData) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()

    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
        onResult = { isGranted ->
            hasCameraPermission = isGranted
        }
    )

    var manualCodeInput by remember { mutableStateOf("ACT-DEMO-01") }
    var isVerifying by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var successMessage by remember { mutableStateOf<String?>(null) }

    fun processQrCode(qrPayload: String) {
        if (isVerifying) return

        scope.launch {
            isVerifying = true
            errorMessage = null
            successMessage = null

            try {
                val request = VerifyTicketRequest(
                    qrPayload = qrPayload.trim(),
                    deviceFingerprint = "Native-Android-Device",
                    clientIp = null,
                    userAgent = "TheatreAntiPiracy-Native/1.0"
                )

                val response = ApiClient.getApiService().verifyTicketQr(request)

                if (response.isSuccessful && response.body()?.data != null) {
                    val session = response.body()!!.data!!
                    secureStorage.saveActiveSession(session)
                    successMessage = "Ticket Verified: Seat ${session.seatNumber}"
                    onSessionActivated(session)
                } else {
                    val errorObj = ApiClient.parseErrorBody(response)
                    errorMessage = when (errorObj?.errorCode) {
                        "ALREADY_ACTIVATED" -> "❌ Duplicate Admission: Ticket already activated"
                        "EXPIRED_TICKET" -> "❌ Ticket Expired: Screening session ended"
                        "CANCELLED_TICKET" -> "❌ Invalid Ticket: Ticket has been cancelled"
                        "INVALID_QR" -> "❌ Security Violation: Tampered or forged QR signature"
                        "UNAUTHORIZED_THEATRE" -> "❌ Venue Mismatch: Ticket not valid at this theatre"
                        else -> errorObj?.message ?: errorObj?.error ?: "Verification failed"
                    }
                }
            } catch (e: Exception) {
                errorMessage = "Network error: ${e.localizedMessage}"
            } finally {
                isVerifying = false
            }
        }
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
            text = "Native QR Admission Scanner",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Text(
            text = "Hardware-accelerated CameraX + Google ML Kit",
            style = MaterialTheme.typography.bodySmall,
            color = Slate400
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Camera Viewfinder Box
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Slate900),
            modifier = Modifier
                .fillMaxWidth()
                .height(280.dp)
        ) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                if (hasCameraPermission) {
                    AndroidView(
                        factory = { ctx ->
                            val previewView = PreviewView(ctx)
                            val scannerManager = QrScannerManager(ctx, lifecycleOwner) { qrCode ->
                                processQrCode(qrCode)
                            }
                            scannerManager.startCamera(previewView.surfaceProvider)
                            previewView
                        },
                        modifier = Modifier.fillMaxSize()
                    )

                    // Target Reticle
                    Box(
                        modifier = Modifier
                            .size(180.dp)
                            .border(2.dp, Cyan500, RoundedCornerShape(12.dp))
                    )
                } else {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CameraAlt,
                            contentDescription = "Camera",
                            tint = Slate400,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Camera Permission Required",
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(
                            onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) },
                            colors = ButtonDefaults.buttonColors(containerColor = Cyan500)
                        ) {
                            Text("Grant Permission", color = Slate950)
                        }
                    }
                }

                if (isVerifying) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.6f)),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = Cyan500)
                    }
                }
            }
        }

        if (errorMessage != null) {
            Spacer(modifier = Modifier.height(12.dp))
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = Red500.copy(alpha = 0.15f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = errorMessage!!,
                    color = Red500,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(12.dp),
                    fontWeight = FontWeight.Medium
                )
            }
        }

        if (successMessage != null) {
            Spacer(modifier = Modifier.height(12.dp))
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = Emerald500.copy(alpha = 0.15f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = successMessage!!,
                    color = Emerald400,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(12.dp),
                    fontWeight = FontWeight.Medium
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Manual Fallback / Preset Scanner Card
        Card(
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Slate900),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Manual Code or Direct Token Entry",
                    style = MaterialTheme.typography.titleSmall,
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = manualCodeInput,
                    onValueChange = { manualCodeInput = it },
                    label = { Text("Activation Code / Signed Token") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Cyan500,
                        unfocusedBorderColor = Slate700,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Slate200
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                Button(
                    onClick = { processQrCode(manualCodeInput) },
                    enabled = !isVerifying && manualCodeInput.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = Cyan500),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Verify Ticket", color = Slate950, fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "Quick Test Presets:",
                    style = MaterialTheme.typography.bodySmall,
                    color = Slate400
                )

                Spacer(modifier = Modifier.height(6.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    AssistChip(
                        onClick = {
                            manualCodeInput = "ACT-DEMO-01"
                            processQrCode("ACT-DEMO-01")
                        },
                        label = { Text("Demo Ticket", fontSize = 11.sp) }
                    )
                    AssistChip(
                        onClick = {
                            manualCodeInput = "TCK-IMAX-01"
                            processQrCode("TCK-IMAX-01")
                        },
                        label = { Text("IMAX Ticket", fontSize = 11.sp) }
                    )
                    AssistChip(
                        onClick = {
                            manualCodeInput = "TCK-CNCL-99"
                            processQrCode("TCK-CNCL-99")
                        },
                        label = { Text("Cancelled", fontSize = 11.sp) }
                    )
                }
            }
        }
    }
}
