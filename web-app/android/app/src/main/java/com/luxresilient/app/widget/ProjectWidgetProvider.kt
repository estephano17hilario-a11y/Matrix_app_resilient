package com.luxresilient.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import com.luxresilient.app.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Calendar
import java.util.Locale

/**
 * "Foco · Proyecto": one project's focus time, as a single glass strip.
 *
 *   ( ▶ )  Proyecto ................ [ Hoy ]
 *          01:11 / 1:31:01
 *          ███░░░░░░░░░░░░░░░░░░░░░░░
 *
 * The strip follows the chosen theme/opacity, the project's colour drives the title, the play
 * glyph, the pill and the bar, and the pill is tappable: Hoy → Semana → Mes.
 */
class ProjectWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "ProjectWidgetProvider"
        const val ACTION_REFRESH_PROJECT = "com.luxresilient.app.REFRESH_PROJECT"
        const val ACTION_CYCLE_RANGE = "com.luxresilient.app.PROJECT_CYCLE_RANGE"
        private const val EXTRA_WIDGET_ID = "project_widget_id"
        private val PROVIDER_CLASS = ProjectWidgetProvider::class.java.name

        private val RANGES = listOf("day", "week", "month")
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (widgetId in appWidgetIds) updateWidget(context, appWidgetManager, widgetId)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val manager = AppWidgetManager.getInstance(context)
        when (intent.action) {
            ACTION_REFRESH_PROJECT -> {
                val ids = manager.getAppWidgetIds(ComponentName(context, ProjectWidgetProvider::class.java))
                for (id in ids) updateWidget(context, manager, id)
            }
            ACTION_CYCLE_RANGE -> {
                val id = intent.getIntExtra(EXTRA_WIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
                if (id == AppWidgetManager.INVALID_APPWIDGET_ID) return
                val prefs = WidgetTheme.prefs(context)
                val current = prefs.getString("project_range_widget_$id", "day")
                val next = RANGES[(RANGES.indexOf(current).coerceAtLeast(0) + 1) % RANGES.size]
                prefs.edit().putString("project_range_widget_$id", next).apply()
                updateWidget(context, manager, id)
            }
        }
    }

    override fun onAppWidgetOptionsChanged(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, newOptions: Bundle) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        updateWidget(context, appWidgetManager, appWidgetId)
    }

    private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, widgetId: Int) {
        val client = SupabaseWidgetClient(context)

        if (!client.isAuthenticated()) {
            val views = RemoteViews(context.packageName, R.layout.widget_login_required)
            context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { launch ->
                val pending = PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                views.setOnClickPendingIntent(R.id.widget_login_required, pending)
            }
            appWidgetManager.updateAppWidget(widgetId, views)
            return
        }

        val prefs = WidgetTheme.prefs(context)
        val projectId = prefs.getString("project_id_widget_$widgetId", null)
        val style = WidgetTheme.styleFor(prefs, widgetId, PROVIDER_CLASS, WidgetTheme.Style.GRAPHITE)
        val opacity = WidgetTheme.opacityFor(prefs, widgetId, PROVIDER_CLASS)
        val solid = WidgetTheme.isSolid(prefs, widgetId, PROVIDER_CLASS)

        val options = appWidgetManager.getAppWidgetOptions(widgetId)
        val (widthDp, heightDp) = WidgetTheme.sizeDp(options, 300, 80)

        // Size classes: MINI is a single column (ring only), COMPACT is 2-3 columns, FULL has the play button.
        val mini = widthDp < 110
        val compact = !mini && widthDp < 220
        val short = heightDp < 66
        val radius = minOf(26f, heightDp / 2f - 1f).coerceAtLeast(14f)

        val views = RemoteViews(context.packageName, R.layout.widget_project_progress)
        views.setFloat(R.id.project_background_image, "setAlpha", opacity / 100f)

        fun bg(accent: Int? = null) = WidgetTheme.background(context, widthDp, heightDp, style, accent, radius, solid)

        fun showUnconfigured() {
            views.setImageViewBitmap(R.id.project_background_image, bg())
            views.setViewVisibility(R.id.project_unconfigured_layout, View.VISIBLE)
            views.setViewVisibility(R.id.project_configured_layout, View.GONE)
            views.setViewVisibility(R.id.project_mini_layout, View.GONE)
            views.setTextViewText(R.id.btn_select_project, if (mini) "Elegir" else "Elegir proyecto")
            views.setFloat(R.id.btn_select_project, "setTextSize", if (mini) 11f else 13f)
            val hp = if (mini) 10 else 18
            val vp = if (mini) 6 else 9
            val d = context.resources.displayMetrics.density
            views.setViewPadding(R.id.btn_select_project, (hp * d).toInt(), (vp * d).toInt(), (hp * d).toInt(), (vp * d).toInt())
            val configIntent = Intent(context, WidgetConfigActivity::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val configPending = PendingIntent.getActivity(context, widgetId, configIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE)
            views.setOnClickPendingIntent(R.id.btn_select_project, configPending)
        }

        if (projectId.isNullOrEmpty()) {
            showUnconfigured()
            appWidgetManager.updateAppWidget(widgetId, views)
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val project = client.fetchProjects().find { it.id == projectId }
                if (project == null) {
                    withContext(Dispatchers.Main) {
                        showUnconfigured()
                        appWidgetManager.updateAppWidget(widgetId, views)
                    }
                    return@launch
                }

                val range = prefs.getString("project_range_widget_$widgetId", "day") ?: "day"
                val (doneSecs, targetMins) = measure(project, range)
                val targetSecs = targetMins * 60
                val pct = if (targetSecs > 0) minOf(100, (doneSecs * 100L / targetSecs).toInt()) else 0

                val density = context.resources.displayMetrics.density
                val fontScale = context.resources.configuration.fontScale.coerceAtLeast(0.85f)
                val baseColorHex = project.color ?: TraitIcons.getColor(project.attribute)
                val accent = try { Color.parseColor(baseColorHex) } catch (e: Exception) { Color.parseColor("#F59E0B") }

                withContext(Dispatchers.Main) {
                    views.setImageViewBitmap(R.id.project_background_image, bg(accent))
                    views.setViewVisibility(R.id.project_unconfigured_layout, View.GONE)

                    // Tapping the card (and the ring) opens the focus session; the pill cycles the range.
                    val launchIntent = Intent(Intent.ACTION_VIEW).apply {
                        data = Uri.parse("luxapp://focus-session?projectId=${project.id}")
                        setPackage(context.packageName)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    val open = PendingIntent.getActivity(context, widgetId * 10 + 2, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE)

                    if (mini) {
                        // One column: a progress ring that scales with the cell, name and time only when there is height for them.
                        views.setViewVisibility(R.id.project_configured_layout, View.GONE)
                        views.setViewVisibility(R.id.project_mini_layout, View.VISIBLE)
                        val ringSide = (minOf(widthDp - 12, heightDp - 12)).coerceAtLeast(32)
                        views.setImageViewBitmap(R.id.project_mini_ring, ringBitmap(density, ringSide, accent, pct))
                        val showTitle = heightDp >= 110
                        val showTime = heightDp >= 150
                        views.setViewVisibility(R.id.project_mini_title, if (showTitle) View.VISIBLE else View.GONE)
                        views.setViewVisibility(R.id.project_mini_time, if (showTime) View.VISIBLE else View.GONE)
                        views.setTextViewText(R.id.project_mini_title, project.title)
                        views.setTextColor(R.id.project_mini_title, accent)
                        views.setTextViewText(R.id.project_mini_time, timeText(doneSecs, 0))
                        val pad = (if (showTitle) 8 else 6) * density
                        views.setViewPadding(R.id.project_mini_layout, pad.toInt(), pad.toInt(), pad.toInt(), pad.toInt())
                        views.setOnClickPendingIntent(R.id.project_mini_layout, open)
                    } else {
                        views.setViewVisibility(R.id.project_mini_layout, View.GONE)
                        views.setViewVisibility(R.id.project_configured_layout, View.VISIBLE)

                        val basePad = when (prefs.getString("card_spacing_widget_$widgetId", "medio")) { "poco" -> 8; "grande" -> 18; else -> 14 }
                        val pad = when {
                            short -> minOf(basePad, 8)
                            compact -> minOf(basePad, 11)
                            else -> basePad
                        }
                        val vPad = if (short) 5 else (pad * 0.85f).toInt()
                        views.setViewPadding(R.id.project_configured_layout, (pad * density).toInt(), (vPad * density).toInt(), ((pad + if (compact) 0 else 2) * density).toInt(), (vPad * density).toInt())

                        // Play button only with room for it (and not on a very short strip).
                        val showPlay = !compact && !short
                        views.setViewVisibility(R.id.project_play_btn, if (showPlay) View.VISIBLE else View.GONE)
                        if (showPlay) views.setImageViewBitmap(R.id.project_play_image, playButton(density, 56, accent))

                        val showPill = widthDp >= 150
                        views.setViewVisibility(R.id.project_range_pill, if (showPill) View.VISIBLE else View.GONE)
                        // The title row is the first thing dropped when the strip is only one row tall.
                        val showTitle = !short || widthDp >= 220
                        views.setViewVisibility(R.id.project_title_row, if (showTitle) View.VISIBLE else View.GONE)

                        val roomy = heightDp >= 110 && !compact
                        views.setFloat(R.id.project_title, "setTextSize", if (roomy) 18f else if (compact) 13f else 16f)
                        views.setTextViewText(R.id.project_title, project.title)
                        views.setTextColor(R.id.project_title, accent)

                        val pill = when (range) { "week" -> "Semana"; "month" -> "Mes"; else -> "Hoy" }
                        views.setTextViewText(R.id.project_range_pill, if (pct >= 100) "✓ $pill" else pill)
                        views.setTextColor(R.id.project_range_pill, accent)

                        // Fit the "01:11 / 1:31:01" text to the width; if that gets too small show only the elapsed time.
                        val contentW = widthDp - 2 * pad - (if (showPlay) 56 + 14 else 0)
                        val maxSize = if (roomy) 30f else if (compact) 20f else 24f
                        var text = timeText(doneSecs, targetSecs)
                        var size = (contentW / (text.length * 0.62f) / fontScale).coerceAtMost(maxSize)
                        if (size < 13f) {
                            text = timeText(doneSecs, 0)
                            size = (contentW / (text.length * 0.62f) / fontScale).coerceAtMost(maxSize)
                        }
                        views.setTextViewText(R.id.project_time_fraction, text)
                        views.setFloat(R.id.project_time_fraction, "setTextSize", size.coerceAtLeast(10f))

                        // Bar: width follows the strip so the rounded caps stay round.
                        val barH = 12
                        val barWidthDp = contentW.toInt().coerceAtLeast(60)
                        views.setImageViewBitmap(R.id.project_progress_bar_fill, progressBar(density, barWidthDp, barH, accent, pct))

                        if (showPlay) views.setOnClickPendingIntent(R.id.project_play_btn, open)
                        views.setOnClickPendingIntent(R.id.project_configured_layout, open)

                        val cycle = Intent(context, ProjectWidgetProvider::class.java).apply {
                            action = ACTION_CYCLE_RANGE
                            putExtra(EXTRA_WIDGET_ID, widgetId)
                        }
                        val cyclePending = PendingIntent.getBroadcast(context, widgetId * 10 + 3, cycle, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                        views.setOnClickPendingIntent(R.id.project_range_pill, cyclePending)
                    }

                    appWidgetManager.updateAppWidget(widgetId, views)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error rendering project widget $widgetId: ${e.message}", e)
            }
        }
    }

    /** Ring with the percentage in the middle, for the one-column widget. */
    private fun ringBitmap(density: Float, sideDp: Int, accent: Int, pct: Int): Bitmap {
        val scale = minOf(density, 3f)
        val size = (sideDp * scale).toInt().coerceAtLeast(64)
        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val stroke = size * 0.13f
        val rect = RectF(stroke / 2, stroke / 2, size - stroke / 2, size - stroke / 2)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = stroke; strokeCap = Paint.Cap.ROUND }
        paint.color = Color.argb(110, 0, 0, 0)
        canvas.drawArc(rect, 0f, 360f, false, paint)
        paint.color = Color.argb(34, 255, 255, 255)
        canvas.drawArc(rect, 0f, 360f, false, paint)
        if (pct > 0) {
            paint.color = accent
            canvas.drawArc(rect, -90f, 360f * (pct / 100f).coerceIn(0.03f, 1f), false, paint)
        }
        val label = if (pct >= 100) "✓" else "$pct%"
        val text = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            textAlign = Paint.Align.CENTER
            typeface = android.graphics.Typeface.create("sans-serif-black", android.graphics.Typeface.NORMAL)
            textSize = size * (if (label.length >= 4) 0.24f else if (label.length == 3) 0.28f else 0.34f)
        }
        canvas.drawText(label, size / 2f, size / 2f - (text.descent() + text.ascent()) / 2f, text)
        return bmp
    }

    /** Seconds of focus done in the range, and the goal for that range in minutes. */
    private fun measure(project: ProjectData, range: String): Pair<Int, Int> {
        val sessions = project.sessions ?: emptyList()
        val fmt = java.text.SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val today = fmt.format(java.util.Date())
        val freq = project.uiFrequency ?: project.goalFrequency
        val daily = ProjectGoalCalculator.getDynamicDailyTarget(project)
        val workDays = project.workingDays?.size?.takeIf { it > 0 } ?: 7
        return when (range) {
            "week" -> {
                val cal = Calendar.getInstance().apply {
                    firstDayOfWeek = Calendar.MONDAY
                    set(Calendar.DAY_OF_WEEK, Calendar.MONDAY)
                }
                val start = fmt.format(cal.time)
                val secs = sessions.filter { val d = ProjectGoalCalculator.getLocalDateString(it.date); d >= start && d <= today }.sumOf { it.duration }
                secs to (if (freq == "WEEKLY") ProjectGoalCalculator.getWeeklyGoalMinutes(project) else daily * workDays)
            }
            "month" -> {
                val start = today.substring(0, 8) + "01"
                val secs = sessions.filter { val d = ProjectGoalCalculator.getLocalDateString(it.date); d >= start && d <= today }.sumOf { it.duration }
                secs to (if (freq == "MONTHLY") ProjectGoalCalculator.getMonthlyGoalMinutes(project) else daily * workDays * 4)
            }
            else -> {
                val secs = sessions.filter { ProjectGoalCalculator.getLocalDateString(it.date) == today }.sumOf { it.duration }
                secs to daily
            }
        }
    }

    /** "01:11 / 1:31:01": done as mm:ss (h:mm:ss past an hour), goal always as h:mm:ss. */
    private fun timeText(doneSecs: Int, targetSecs: Int): String {
        fun hms(total: Int, forceHours: Boolean): String {
            val h = total / 3600
            val m = (total % 3600) / 60
            val s = total % 60
            return if (h > 0 || forceHours) String.format(Locale.US, "%d:%02d:%02d", h, m, s) else String.format(Locale.US, "%02d:%02d", m, s)
        }
        val done = hms(doneSecs, false)
        return if (targetSecs > 0) "$done / ${hms(targetSecs, targetSecs >= 3600)}" else done
    }

    /** A recessed disc with the project-coloured play glyph. */
    private fun playButton(density: Float, sizeDp: Int, accent: Int): Bitmap {
        val scale = minOf(density, 3f)
        val size = (sizeDp * scale).toInt()
        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val c = size / 2f

        paint.color = Color.argb(150, 0, 0, 0)
        canvas.drawCircle(c, c, c, paint)
        // soft inner rim, lit from the top
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 1.2f * scale
        paint.shader = LinearGradient(0f, 0f, 0f, size.toFloat(), Color.argb(70, 255, 255, 255), Color.argb(0, 255, 255, 255), Shader.TileMode.CLAMP)
        canvas.drawCircle(c, c, c - paint.strokeWidth / 2, paint)
        paint.shader = null

        // rounded play triangle
        val half = size * 0.17f
        val path = Path().apply {
            moveTo(c - half * 0.8f, c - half * 1.25f)
            lineTo(c - half * 0.8f, c + half * 1.25f)
            lineTo(c + half * 1.35f, c)
            close()
        }
        paint.style = Paint.Style.FILL_AND_STROKE
        paint.strokeJoin = Paint.Join.ROUND
        paint.strokeWidth = size * 0.07f
        paint.color = accent
        canvas.drawPath(path, paint)
        return bmp
    }

    /** Thick pill bar: dark track, accent fill with a gloss, a visible dot even at 1%. */
    private fun progressBar(density: Float, widthDp: Int, heightDp: Int, accent: Int, pct: Int): Bitmap {
        val scale = minOf(density, 3f)
        val w = (widthDp * scale).toInt().coerceAtLeast(40)
        val h = (heightDp * scale).toInt().coerceAtLeast(8)
        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val r = h / 2f

        paint.color = Color.argb(150, 0, 0, 0)
        canvas.drawRoundRect(RectF(0f, 0f, w.toFloat(), h.toFloat()), r, r, paint)

        if (pct > 0) {
            val fillW = maxOf(h.toFloat(), w * (pct / 100f))
            val fill = RectF(0f, 0f, fillW, h.toFloat())
            paint.color = accent
            canvas.drawRoundRect(fill, r, r, paint)
            paint.shader = LinearGradient(0f, 0f, 0f, h.toFloat(), Color.argb(90, 255, 255, 255), Color.argb(0, 255, 255, 255), Shader.TileMode.CLAMP)
            canvas.drawRoundRect(fill, r, r, paint)
        }
        return bmp
    }
}
