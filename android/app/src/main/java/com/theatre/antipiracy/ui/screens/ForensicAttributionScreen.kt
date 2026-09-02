package com.theatre.antipiracy.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.theatre.antipiracy.data.models.CreateEvidenceRequest
import com.theatre.antipiracy.data.models.EvidenceVaultResult
import com.theatre.antipiracy.data.models.WatermarkAttributionRequest
import com.theatre.antipiracy.data.models.WatermarkAttributionResult
import com.theatre.antipiracy.data.remote.ApiClient
import com.theatre.antipiracy.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun ForensicAttributionScreen(
    currentWatermarkId: String?
) {
    var watermarkInput by remember { mutableStateOf(currentWatermarkId ?: "WM-ODE-SES-DEMO-SLOT-100") }
    var isAttributing by remember { mutableStateOf(false) }
    var attributionResult by remember { mutableStateOf<WatermarkAttributionResult?>(null) }
    var evidenceResult by remember { mutableStateOf<EvidenceVaultResult?>(null) }
    var isLoggingEvidence by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate950)
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Forensic Watermark Attribution",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Text(
            text = "Link unauthorized recordings back to exact seat & session",
            style = MaterialTheme.typography.bodySmall,
            color = Slate400
        )

        Spacer(modifier = Modifier.height(16.dp))

        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Slate900),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Watermark Identifier / Hash",
                    style = MaterialTheme.typography.titleSmall,
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = watermarkInput,
                    onValueChange = { watermarkInput = it },
                    label = { Text("Watermark String (e.g. WM-...)") },
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
                    onClick = {
                        scope.launch {
                            isAttributing = true
                            errorMessage = null
                            attributionResult = null
                            evidenceResult = null

                            try {
                                val response = ApiClient.getApiService().attributeWatermark(
                                    WatermarkAttributionRequest(watermarkId = watermarkInput.trim())
                                )

                                if (response.isSuccessful && response.body()?.data != null) {
                                    attributionResult = response.body()!!.data!!
                                } else {
                                    val err = ApiClient.parseErrorBody(response)
                                    errorMessage = err?.message ?: err?.error ?: "Attribution failed"
                                }
                            } catch (e: Exception) {
                                errorMessage = "Network error: ${e.localizedMessage}"
                            } finally {
                                isAttributing = false
                            }
                        }
                    },
                    enabled = !isAttributing && watermarkInput.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = Cyan500),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (isAttributing) {
                        CircularProgressIndicator(color = Slate950, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    } else {
                        Text("Perform Attribution Lookup", color = Slate950, fontWeight = FontWeight.Bold)
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
                    modifier = Modifier.padding(12.dp)
                )
            }
        }

        attributionResult?.let { result ->
            Spacer(modifier = Modifier.height(16.dp))

            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Slate900),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Attribution Results",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Emerald400
                        )
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Emerald500.copy(alpha = 0.15f)
                        ) {
                            Text(
                                text = "MATCH CONFIDENCE 100%",
                                color = Emerald400,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text("THEATRE VENUE", style = MaterialTheme.typography.labelSmall, color = Slate400)
                    Text("${result.theatreName} (${result.theatreCode})", color = Color.White, fontWeight = FontWeight.SemiBold)

                    Spacer(modifier = Modifier.height(8.dp))

                    Text("FEATURE MOVIE & AUDITORIUM", style = MaterialTheme.typography.labelSmall, color = Slate400)
                    Text("${result.movieTitle} - ${result.screenName}", color = Color.White)

                    Spacer(modifier = Modifier.height(8.dp))

                    Text("SEAT ALLOCATION", style = MaterialTheme.typography.labelSmall, color = Slate400)
                    Text(result.seatNumber, color = Cyan500, fontWeight = FontWeight.Bold, fontSize = 18.sp)

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = {
                            scope.launch {
                                isLoggingEvidence = true
                                try {
                                    val evResp = ApiClient.getApiService().logEvidenceVault(
                                        CreateEvidenceRequest(
                                            watermarkId = result.watermarkId,
                                            sessionId = result.sessionId,
                                            reason = "Native Android Checkpoint Trace Recorded"
                                        )
                                    )
                                    if (evResp.isSuccessful && evResp.body()?.data != null) {
                                        evidenceResult = evResp.body()!!.data!!
                                    }
                                } catch (e: Exception) {
                                    errorMessage = "Evidence log failed: ${e.localizedMessage}"
                                } finally {
                                    isLoggingEvidence = false
                                }
                            }
                        },
                        enabled = !isLoggingEvidence && evidenceResult == null,
                        colors = ButtonDefaults.buttonColors(containerColor = Indigo500),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = if (evidenceResult != null) "Evidence Sealed in Vault" else "Log to Evidence Vault",
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        evidenceResult?.let { ev ->
            Spacer(modifier = Modifier.height(12.dp))

            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Slate900,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Evidence Vault Record Sealed", color = Emerald400, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("Record Number: ${ev.evidenceNumber}", color = Slate200, fontFamily = FontFamily.Monospace, fontSize = 12.sp)
                    Text("SHA-256 Hash: ${ev.evidenceHash.take(24)}...", color = Slate400, fontFamily = FontFamily.Monospace, fontSize = 11.sp)
                }
            }
        }
    }
}
