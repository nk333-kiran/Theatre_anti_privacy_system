package com.theatre.antipiracy.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.sp
import com.theatre.antipiracy.data.models.WatermarkData

@Composable
fun DynamicWatermarkOverlay(
    watermark: WatermarkData?,
    modifier: Modifier = Modifier
) {
    if (watermark == null) return

    val textMeasurer = rememberTextMeasurer()

    // Smooth subtle floating animation
    val infiniteTransition = rememberInfiniteTransition(label = "watermarkFloat")
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.12f,
        targetValue = 0.22f,
        animationSpec = infiniteRepeatable(
            animation = tween(4000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "watermarkAlpha"
    )

    val displayText = watermark.displayWatermark

    Canvas(modifier = modifier.fillMaxSize()) {
        val width = size.width
        val height = size.height

        val textLayoutResult = textMeasurer.measure(
            text = displayText,
            style = TextStyle(
                color = Color.White.copy(alpha = alpha),
                fontSize = 13.sp,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold
            )
        )

        // Diagonal watermark grid pattern
        val stepX = 260f
        val stepY = 220f

        var y = 0f
        while (y < height + 100) {
            var x = -100f
            while (x < width + 100) {
                rotate(degrees = -25f, pivot = Offset(x, y)) {
                    drawText(
                        textLayoutResult = textLayoutResult,
                        topLeft = Offset(x, y)
                    )
                }
                x += stepX
            }
            y += stepY
        }
    }
}
