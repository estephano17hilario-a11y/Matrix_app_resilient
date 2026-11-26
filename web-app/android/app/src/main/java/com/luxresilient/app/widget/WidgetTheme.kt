package com.luxresilient.app.widget

import android.content.Context
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader

/**
 * Shared look of every Lux widget: a dark "spatial glass" card (Vision Pro / Cupertino
 * inspired) drawn once as a bitmap — soft gradient body, ambient colour glows, a gloss
 * sheen, and a specular rim light that is brightest on the top-left edge.
 *
 * The user picks a [Style] and an opacity per widget in [WidgetConfigActivity]; every
 * provider just asks for [background] and puts it behind its content. All styles are
 * dark so the white text on top always stays legible.
 */
object WidgetTheme {

    const val PREFS = "lux_widget_config"
    private const val KEY_STYLE = "widget_style"

    enum class Style(val key: String, val label: String) {
        OBSIDIAN("obsidian", "Negro"),
        GRAPHITE("graphite", "Plomo"),
        GLASS("glass", "Cristal"),
        MIDNIGHT("midnight", "Medianoche"),
        AURORA("aurora", "Aurora"),
        EMBER("ember", "Brasa");

        companion object {
            fun from(key: String?): Style? = values().firstOrNull { it.key == key }
        }
    }

    /** Colours behind one style. Glows are (x, y, radius as fraction of the long side, colour). */
    class Palette(
        val top: Int,
        val bottom: Int,
        val glows: List<Glow>,
        val rimStrong: Int,
        val rimSoft: Int,
        val sheen: Int,
        /** Swatch colours for the picker. */
        val swatchA: Int,
        val swatchB: Int
    )

    class Glow(val x: Float, val y: Float, val radius: Float, val color: Int)

    private fun c(hex: String): Int = Color.parseColor(hex)

    fun palette(style: Style): Palette = when (style) {
        Style.OBSIDIAN -> Palette(
            top = c("#FF121214"), bottom = c("#FF050506"),
            glows = emptyList(),
            rimStrong = c("#38FFFFFF"), rimSoft = c("#0FFFFFFF"), sheen = c("#10FFFFFF"),
            swatchA = c("#121214"), swatchB = c("#050506")
        )
        Style.GRAPHITE -> Palette(
            top = c("#FF2C2E31"), bottom = c("#FF1C1E20"),
            glows = emptyList(),
            rimStrong = c("#30FFFFFF"), rimSoft = c("#0DFFFFFF"), sheen = c("#12FFFFFF"),
            swatchA = c("#2C2E31"), swatchB = c("#1C1E20")
        )
        Style.GLASS -> Palette(
            top = c("#B31A1D26"), bottom = c("#99101319"),
            glows = listOf(Glow(0.08f, 0f, 0.9f, c("#33FFFFFF"))),
            rimStrong = c("#80FFFFFF"), rimSoft = c("#1AFFFFFF"), sheen = c("#26FFFFFF"),
            swatchA = c("#5A6070"), swatchB = c("#2A2E38")
        )
        Style.MIDNIGHT -> Palette(
            top = c("#FF111B36"), bottom = c("#FF060A17"),
            glows = listOf(Glow(0.95f, 0.05f, 0.9f, c("#443B82F6")), Glow(0.05f, 1f, 0.7f, c("#1F6366F1"))),
            rimStrong = c("#4D93C5FD"), rimSoft = c("#0F93C5FD"), sheen = c("#12BFDBFE"),
            swatchA = c("#1E2D5C"), swatchB = c("#060A17")
        )
        Style.AURORA -> Palette(
            top = c("#FF140E2B"), bottom = c("#FF06050F"),
            glows = listOf(
                Glow(0.05f, 0.0f, 0.85f, c("#668B5CF6")),
                Glow(0.98f, 1.0f, 0.85f, c("#4D22D3EE")),
                Glow(0.7f, 0.1f, 0.5f, c("#26F472B6"))
            ),
            rimStrong = c("#52C4B5FD"), rimSoft = c("#0FC4B5FD"), sheen = c("#12FFFFFF"),
            swatchA = c("#6D3FD6"), swatchB = c("#0B8FA8")
        )
        Style.EMBER -> Palette(
            top = c("#FF2B1210"), bottom = c("#FF0D0605"),
            glows = listOf(
                Glow(0.0f, 1.0f, 0.9f, c("#55F97316")),
                Glow(1.0f, 0.0f, 0.7f, c("#33EF4444"))
            ),
            rimStrong = c("#52FDBA74"), rimSoft = c("#0FFDBA74"), sheen = c("#10FFFFFF"),
            swatchA = c("#B8430F"), swatchB = c("#2B1210")
        )
    }

    // ── Preferences ──────────────────────────────────────────────────────────

    fun prefs(context: Context): SharedPreferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** Each widget keeps its own personality until the user picks another style. */
    fun defaultFor(provider: String): Style = when {
        provider.contains("ProjectWidgetProvider") || provider.contains("TaskWidgetProvider") -> Style.GRAPHITE
        provider.contains("FocusWidgetProvider") || provider.contains("RoutineWidgetProvider") -> Style.MIDNIGHT
        provider.contains("ScoreWidgetProvider") || provider.contains("JournalWidgetProvider") -> Style.AURORA
        provider.contains("RivalsWidgetProvider") || provider.contains("DuelWidgetProvider") || provider.contains("FriendStreakWidgetProvider") -> Style.EMBER
        else -> Style.OBSIDIAN
    }

    /** Style for one widget: per-widget choice, then per-provider, then global, then [default]. */
    fun styleFor(prefs: SharedPreferences, widgetId: Int, provider: String, default: Style = defaultFor(provider)): Style {
        val key = prefs.getString("${KEY_STYLE}_$widgetId", null)
            ?: prefs.getString("${KEY_STYLE}_$provider", null)
            ?: prefs.getString(KEY_STYLE, null)
        return Style.from(key) ?: default
    }

    fun saveStyle(prefs: SharedPreferences.Editor, widgetId: Int, provider: String, style: Style) {
        if (widgetId != android.appwidget.AppWidgetManager.INVALID_APPWIDGET_ID) prefs.putString("${KEY_STYLE}_$widgetId", style.key)
        if (provider.isNotEmpty()) prefs.putString("${KEY_STYLE}_$provider", style.key)
    }

    /** Overall background opacity (0..100) for one widget, same lookup order the providers already use. */
    fun opacityFor(prefs: SharedPreferences, widgetId: Int, provider: String, default: Int = 85): Int = when {
        prefs.contains("widget_background_opacity_$widgetId") -> prefs.getInt("widget_background_opacity_$widgetId", default)
        provider.isNotEmpty() && prefs.contains("widget_background_opacity_$provider") -> prefs.getInt("widget_background_opacity_$provider", default)
        else -> prefs.getInt("widget_background_opacity", default)
    }

    // ── Rendering ────────────────────────────────────────────────────────────

    fun withAlpha(color: Int, alpha: Int): Int = Color.argb(alpha.coerceIn(0, 255), Color.red(color), Color.green(color), Color.blue(color))

    /** Mixes [color] into [base] by [amount] (0..1). */
    fun mix(base: Int, color: Int, amount: Float): Int {
        val a = amount.coerceIn(0f, 1f)
        return Color.argb(
            255,
            (Color.red(base) * (1 - a) + Color.red(color) * a).toInt(),
            (Color.green(base) * (1 - a) + Color.green(color) * a).toInt(),
            (Color.blue(base) * (1 - a) + Color.blue(color) * a).toInt()
        )
    }

    /**
     * The card background. [accent] (optional) adds a faint glow of the widget's own colour
     * (a project's colour, a score's tier…) on the left, so each widget keeps its personality.
     * Bitmaps are rendered at most at 2.4x so big list widgets stay far below the RemoteViews limit.
     */
    fun background(
        context: Context,
        widthDp: Int,
        heightDp: Int,
        style: Style,
        accent: Int? = null,
        radiusDp: Float = 26f
    ): Bitmap {
        val scale = minOf(context.resources.displayMetrics.density, 2.4f)
        val w = (widthDp.coerceIn(60, 700) * scale).toInt().coerceAtLeast(64)
        val h = (heightDp.coerceIn(40, 900) * scale).toInt().coerceAtLeast(48)
        val r = radiusDp * scale
        val p = palette(style)

        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val rect = RectF(0f, 0f, w.toFloat(), h.toFloat())
        val clip = Path().apply { addRoundRect(rect, r, r, Path.Direction.CW) }
        canvas.save()
        canvas.clipPath(clip)

        val paint = Paint(Paint.ANTI_ALIAS_FLAG)

        // body
        paint.shader = LinearGradient(0f, 0f, w * 0.35f, h.toFloat(), p.top, p.bottom, Shader.TileMode.CLAMP)
        canvas.drawRect(rect, paint)

        // ambient glows
        val long = maxOf(w, h).toFloat()
        for (g in p.glows) {
            paint.shader = RadialGradient(g.x * w, g.y * h, g.radius * long, intArrayOf(g.color, withAlpha(g.color, 0)), null, Shader.TileMode.CLAMP)
            canvas.drawRect(rect, paint)
        }
        if (accent != null) {
            paint.shader = RadialGradient(
                w * 0.10f, h * 0.5f, maxOf(h * 1.5f, w * 0.45f),
                intArrayOf(withAlpha(accent, 30), withAlpha(accent, 0)), null, Shader.TileMode.CLAMP
            )
            canvas.drawRect(rect, paint)
        }

        // gloss: a soft sheen over the upper part, like light on curved glass
        paint.shader = LinearGradient(0f, 0f, 0f, h * 0.55f, p.sheen, withAlpha(p.sheen, 0), Shader.TileMode.CLAMP)
        canvas.drawRect(0f, 0f, w.toFloat(), h * 0.55f, paint)
        canvas.restore()

        // specular rim: strongest on the top-left, fading to the bottom-right
        val stroke = 1.2f * scale
        val rim = RectF(stroke / 2, stroke / 2, w - stroke / 2, h - stroke / 2)
        paint.shader = LinearGradient(
            0f, 0f, w.toFloat(), h.toFloat(),
            intArrayOf(p.rimStrong, p.rimSoft, withAlpha(p.rimStrong, Color.alpha(p.rimStrong) / 2)),
            floatArrayOf(0f, 0.55f, 1f), Shader.TileMode.CLAMP
        )
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = stroke
        canvas.drawRoundRect(rim, r - stroke / 2, r - stroke / 2, paint)

        // inner top highlight (a hairline just under the rim)
        paint.shader = LinearGradient(
            r, 0f, w - r, 0f,
            intArrayOf(withAlpha(Color.WHITE, 0), withAlpha(Color.WHITE, 46), withAlpha(Color.WHITE, 0)),
            floatArrayOf(0f, 0.35f, 1f), Shader.TileMode.CLAMP
        )
        paint.strokeWidth = 1f * scale
        canvas.drawLine(r, stroke + 0.5f * scale, w - r, stroke + 0.5f * scale, paint)

        return bmp
    }

    /** Widget size in dp from the launcher's options bundle, with a sensible fallback. */
    fun sizeDp(options: android.os.Bundle?, fallbackW: Int, fallbackH: Int): Pair<Int, Int> {
        val w = options?.getInt(android.appwidget.AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0) ?: 0
        // Portrait: the widget is as wide as MIN_WIDTH and as tall as MAX_HEIGHT (the launcher's
        // MIN_HEIGHT is the landscape height, which made charts and backgrounds come out stretched).
        val maxH = options?.getInt(android.appwidget.AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0) ?: 0
        val h = if (maxH > 0) maxH else options?.getInt(android.appwidget.AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0) ?: 0
        return (if (w > 0) w else fallbackW) to (if (h > 0) h else fallbackH)
    }

    /**
     * One call for a provider: renders the themed card for this widget's size, puts it in
     * [bgViewId] and applies the chosen opacity. Returns the (width, height) in dp it used.
     */
    fun apply(
        context: Context,
        views: android.widget.RemoteViews,
        bgViewId: Int,
        manager: android.appwidget.AppWidgetManager,
        widgetId: Int,
        providerClass: String,
        accent: Int? = null,
        fallbackW: Int = 250,
        fallbackH: Int = 150,
        default: Style = Style.OBSIDIAN,
        radiusDp: Float = 26f
    ): Pair<Int, Int> {
        val prefs = prefs(context)
        val style = styleFor(prefs, widgetId, providerClass, default)
        val opacity = opacityFor(prefs, widgetId, providerClass)
        val size = sizeDp(manager.getAppWidgetOptions(widgetId), fallbackW, fallbackH)
        views.setImageViewBitmap(bgViewId, background(context, size.first, size.second, style, accent, radiusDp))
        views.setFloat(bgViewId, "setAlpha", opacity / 100f)
        return size
    }
}
