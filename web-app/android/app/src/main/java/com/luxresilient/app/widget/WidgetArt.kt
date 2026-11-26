package com.luxresilient.app.widget

import android.graphics.Bitmap
import android.graphics.BlurMaskFilter
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.SweepGradient

/** Small reusable drawings for widgets: progress rings, pill bars, soft glows. */
object WidgetArt {

    private fun px(density: Float, dp: Float) = dp * minOf(density, 3f)

    /** Gradient tint for a 0..100 score: warm when low, green-cyan when good, violet at 100. */
    fun scoreColors(score: Int): Pair<Int, Int> = when {
        score >= 100 -> Color.parseColor("#A78BFA") to Color.parseColor("#F472B6")
        score >= 70 -> Color.parseColor("#10B981") to Color.parseColor("#22D3EE")
        score >= 40 -> Color.parseColor("#F59E0B") to Color.parseColor("#FDE047")
        else -> Color.parseColor("#F43F5E") to Color.parseColor("#FB923C")
    }

    /**
     * Progress ring: dark track, round-capped sweep-gradient arc starting at 12 o'clock,
     * and a soft glow of the same colour behind the arc.
     */
    fun ring(density: Float, sizeDp: Int, pct: Int, from: Int, to: Int, strokeDp: Float = 7f): Bitmap {
        val size = px(density, sizeDp.toFloat()).toInt().coerceAtLeast(48)
        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val stroke = px(density, strokeDp)
        val pad = stroke * 1.2f
        val oval = RectF(pad, pad, size - pad, size - pad)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = stroke; strokeCap = Paint.Cap.ROUND }

        paint.color = Color.argb(46, 255, 255, 255)
        canvas.drawArc(oval, 0f, 360f, false, paint)

        val sweep = 360f * pct.coerceIn(0, 100) / 100f
        if (sweep > 0f) {
            canvas.save()
            canvas.rotate(-90f, size / 2f, size / 2f)
            // glow
            val glow = Paint(paint).apply {
                color = WidgetTheme.withAlpha(from, 120)
                maskFilter = BlurMaskFilter(stroke * 0.9f, BlurMaskFilter.Blur.NORMAL)
            }
            canvas.drawArc(oval, 0f, sweep, false, glow)
            // arc
            val shader = SweepGradient(size / 2f, size / 2f, intArrayOf(from, to, from), floatArrayOf(0f, (sweep / 360f).coerceIn(0.05f, 1f), 1f))
            paint.color = Color.WHITE // a shader is modulated by the paint's alpha, so reset the track's
            paint.shader = shader
            canvas.drawArc(oval, 0f, sweep, false, paint)
            canvas.restore()
        }
        return bmp
    }

    /** Pill bar: dark track, gradient fill with a gloss, a visible dot even at tiny values. */
    fun bar(density: Float, widthDp: Int, heightDp: Int, pct: Int, from: Int, to: Int): Bitmap {
        val w = px(density, widthDp.toFloat()).toInt().coerceAtLeast(40)
        val h = px(density, heightDp.toFloat()).toInt().coerceAtLeast(6)
        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val r = h / 2f
        paint.color = Color.argb(140, 0, 0, 0)
        canvas.drawRoundRect(RectF(0f, 0f, w.toFloat(), h.toFloat()), r, r, paint)
        if (pct > 0) {
            val fill = RectF(0f, 0f, maxOf(h.toFloat(), w * pct.coerceIn(0, 100) / 100f), h.toFloat())
            paint.color = Color.WHITE // see ring(): keep the shader fully opaque
            paint.shader = LinearGradient(0f, 0f, fill.right, 0f, from, to, Shader.TileMode.CLAMP)
            canvas.drawRoundRect(fill, r, r, paint)
            paint.shader = LinearGradient(0f, 0f, 0f, h.toFloat(), Color.argb(80, 255, 255, 255), Color.argb(0, 255, 255, 255), Shader.TileMode.CLAMP)
            canvas.drawRoundRect(fill, r, r, paint)
        }
        return bmp
    }

    /**
     * Body of a list row (habit / task card): smoked glass with a gloss sheen and a rim light,
     * so rows read as glass tiles on top of the widget's themed background.
     */
    fun glassCard(canvas: Canvas, width: Int, height: Int, alphaInt: Int, radius: Float) {
        val a = alphaInt.coerceIn(0, 255) / 255f
        val rect = RectF(0f, 0f, width.toFloat(), height.toFloat())
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        paint.shader = LinearGradient(0f, 0f, 0f, height.toFloat(), Color.argb((235 * a).toInt(), 22, 24, 31), Color.argb((235 * a).toInt(), 8, 9, 13), Shader.TileMode.CLAMP)
        canvas.drawRoundRect(rect, radius, radius, paint)
        paint.shader = LinearGradient(0f, 0f, 0f, height * 0.6f, Color.argb((40 * a).toInt(), 255, 255, 255), Color.argb(0, 255, 255, 255), Shader.TileMode.CLAMP)
        canvas.drawRoundRect(rect, radius, radius, paint)
        val rim = RectF(0.75f, 0.75f, width - 0.75f, height - 0.75f)
        paint.shader = LinearGradient(0f, 0f, width.toFloat(), height.toFloat(), intArrayOf(Color.argb((105 * a).toInt(), 255, 255, 255), Color.argb((14 * a).toInt(), 255, 255, 255), Color.argb((40 * a).toInt(), 255, 255, 255)), floatArrayOf(0f, 0.55f, 1f), Shader.TileMode.CLAMP)
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 1.5f
        canvas.drawRoundRect(rim, radius, radius, paint)
    }
}
