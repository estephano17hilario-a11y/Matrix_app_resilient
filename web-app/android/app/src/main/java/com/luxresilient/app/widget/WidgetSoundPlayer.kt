package com.luxresilient.app.widget

import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.util.Log
import kotlin.math.sin

/**
 * Synthesizes and plays premium widget sound effects programmatically
 * using AudioTrack (PCM 16-bit) on a background thread.
 */
object WidgetSoundPlayer {
    private const val TAG = "WidgetSoundPlayer"
    private const val SAMPLE_RATE = 22050

    /**
     * Plays a short, clean tick sound for simple updates
     */
    fun playTickSound() {
        Thread {
            try {
                val durationMs = 80
                val freq = 1100.0
                val numSamples = (durationMs * SAMPLE_RATE) / 1000
                val samples = ShortArray(numSamples)
                
                for (i in 0 until numSamples) {
                    val t = i.toDouble() / SAMPLE_RATE
                    val envelope = (numSamples - i).toDouble() / numSamples
                    samples[i] = (sin(2.0 * Math.PI * freq * t) * Short.MAX_VALUE * 0.12 * envelope).toInt().toShort()
                }

                val audioTrack = AudioTrack(
                    AudioManager.STREAM_MUSIC,
                    SAMPLE_RATE,
                    AudioFormat.CHANNEL_OUT_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,
                    samples.size * 2,
                    AudioTrack.MODE_STATIC
                )
                audioTrack.write(samples, 0, samples.size)
                audioTrack.play()
                Thread.sleep(durationMs.toLong() + 20)
                audioTrack.release()
            } catch (e: Exception) {
                Log.e(TAG, "Error playing tick sound: ${e.message}")
            }
        }.start()
    }

    /**
     * Plays a beautiful arpeggiated E-major chord for habit completion
     */
    fun playCompleteSound() {
        Thread {
            try {
                val freqs = doubleArrayOf(329.63, 415.30, 493.88, 659.25) // E4, G#4, B4, E5
                val durationMs = 800
                val numSamples = (durationMs * SAMPLE_RATE) / 1000
                val samples = ShortArray(numSamples)

                for (i in 0 until numSamples) {
                    val t = i.toDouble() / SAMPLE_RATE
                    val envelope = (numSamples - i).toDouble() / numSamples
                    
                    var sampleVal = 0.0
                    for (fIdx in freqs.indices) {
                        val freq = freqs[fIdx]
                        val delaySamples = (fIdx * 0.04 * SAMPLE_RATE).toInt() // Strum delay
                        if (i >= delaySamples) {
                            val noteT = (i - delaySamples).toDouble() / SAMPLE_RATE
                            val noteEnvelope = ((numSamples - i).toDouble() / (numSamples - delaySamples)).coerceIn(0.0, 1.0)
                            sampleVal += sin(2.0 * Math.PI * freq * noteT) * 0.12 * noteEnvelope
                        }
                    }
                    samples[i] = (sampleVal * Short.MAX_VALUE).toInt().coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
                }

                val audioTrack = AudioTrack(
                    AudioManager.STREAM_MUSIC,
                    SAMPLE_RATE,
                    AudioFormat.CHANNEL_OUT_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,
                    samples.size * 2,
                    AudioTrack.MODE_STATIC
                )
                audioTrack.write(samples, 0, samples.size)
                audioTrack.play()
                Thread.sleep(durationMs.toLong() + 50)
                audioTrack.release()
            } catch (e: Exception) {
                Log.e(TAG, "Error playing complete sound: ${e.message}")
            }
        }.start()
    }
}
