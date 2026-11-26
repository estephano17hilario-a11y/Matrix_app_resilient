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

        val options = appWidgetManager.getAppWidgetOptions(widgetId)
        val (widthDp, heightDp) = WidgetTheme.sizeDp(options, 300, 80)
        val is2x1 = widthDp < 200

        val views = RemoteViews(context.packageName, R.layout.widget_project_progress)
        views.setFloat(R.id.project_background_image, "setAlpha", opacity / 100f)

        if (projectId.isNullOrEmpty()) {
            views.setImageViewBitmap(R.id.project_background_image, WidgetTheme.background(context, widthDp, heightDp, style))
            views.setViewVisibility(R.id.project_unconfigured_layout, View.VISIBLE)
            views.setViewVisibility(R.id.project_configured_layout, View.GONE)
            val configIntent = Intent(context, WidgetConfigActivity::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val configPending = PendingIntent.getActivity(context, widgetId, configIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE)
            views.setOnClickPendingIntent(R.id.btn_select_project, configPending)
            appWidgetManager.updateAppWidget(widgetId, views)
            return
        }

        views.setViewVisibility(R.id.project_unconfigured_layout, View.GONE)
        views.setViewVisibility(R.id.project_configured_layout, View.VISIBLE)

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val project = client.fetchProjects().find { it.id == projectId }
                if (project == null) {
                    withContext(Dispatchers.Main) {
                        views.setImageViewBitmap(R.id.project_background_image, WidgetTheme.background(context, widthDp, heightDp, style))
                        views.setViewVisibility(R.id.project_unconfigured_layout, View.VISIBLE)
                        views.setViewVisibility(R.id.project_configured_layout, View.GONE)
                        appWidgetManager.updateAppWidget(widgetId, views)
                    }
                    return@launch
                }

                val range = prefs.getString("project_range_widget_$widgetId", "day") ?: "day"
                val (doneSecs, targetMins) = measure(project, range)
                val targetSecs = targetMins * 60
                val pct = if (targetSecs > 0) minOf(100, (doneSecs * 100L / targetSecs).toInt()) else 0

                val density = context.resources.displayMetrics.density
                val baseColorHex = project.color ?: TraitIcons.getColor(project.attribute)
                val accent = try { Color.parseColor(baseColorHex) } catch (e: Exception) { Color.parseColor("#F59E0B") }

                withContext(Dispatchers.Main) {
                    val pad = when (prefs.getString("card_spacing_widget_$widgetId", "medio")) { "poco" -> 8; "grande" -> 18; else -> 14 }
                    views.setViewPadding(R.id.project_configured_layout, (pad * density).toInt(), (pad * 0.85f * density).toInt(), ((pad + 2) * density).toInt(), (pad * 0.85f * density).toInt())

                    views.setImageViewBitmap(R.id.project_background_image, WidgetTheme.background(context, widthDp, heightDp, style, accent))

                    // Compact 2x1: no play button, smaller type.
                    views.setViewVisibility(R.id.project_play_btn, if (is2x1) View.GONE else View.VISIBLE)
                    views.setViewVisibility(R.id.project_range_pill, if (is2x1) View.GONE else View.VISIBLE)
                    views.setFloat(R.id.project_title, "setTextSize", if (is2x1) 13f else 16f)
                    views.setFloat(R.id.project_time_fraction, "setTextSize", if (is2x1) 17f else 24f)

                    views.setTextViewText(R.id.project_title, project.title)
                    views.setTextColor(R.id.project_title, accent)

                    val pill = when (range) { "week" -> "Semana"; "month" -> "Mes"; else -> "Hoy" }
                    views.setTextViewText(R.id.project_range_pill, if (pct >= 100) "✓ $pill" else pill)
                    views.setTextColor(R.id.project_range_pill, accent)

                    views.setTextViewText(R.id.project_time_fraction, timeText(doneSecs, targetSecs))

                    // Bar: width follows the strip so the rounded caps stay round.
                    val barWidthDp = (widthDp - (if (is2x1) 30 else 30 + 56 + 14)).coerceAtLeast(80)
                    views.setImageViewBitmap(R.id.project_progress_bar_fill, progressBar(density, barWidthDp, 12, accent, pct))

                    if (!is2x1) views.setImageViewBitmap(R.id.project_play_image, playButton(density, 56, accent))

                    // Play + strip open the focus session; the pill cycles the range.
                    val launchIntent = Intent(Intent.ACTION_VIEW).apply {
                        data = Uri.parse("luxapp://focus-session?projectId=${project.id}")
                        setPackage(context.packageName)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    val open = PendingIntent.getActivity(context, widgetId * 10 + 2, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE)
                    views.setOnClickPendingIntent(R.id.project_play_btn, open)
                    views.setOnClickPendingIntent(R.id.project_configured_layout, open)

                    val cycle = Intent(context, ProjectWidgetProvider::class.java).apply {
                        action = ACTION_CYCLE_RANGE
                        putExtra(EXTRA_WIDGET_ID, widgetId)
                    }
                    val cyclePending = PendingIntent.getBroadcast(context, widgetId * 10 + 3, cycle, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                    views.setOnClickPendingIntent(R.id.project_range_pill, cyclePending)

                    appWidgetManager.updateAppWidget(widgetId, views)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error rendering project widget $widgetId: ${e.message}", e)
            }
        }
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
