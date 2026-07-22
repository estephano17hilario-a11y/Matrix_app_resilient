package com.luxresilient.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.*
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import com.luxresilient.app.R
import kotlinx.coroutines.*
import java.text.SimpleDateFormat
import java.util.*

class ProjectWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "ProjectWidgetProvider"
        const val ACTION_REFRESH_PROJECT = "com.luxresilient.app.REFRESH_PROJECT"
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        Log.d(TAG, "onUpdate called for ${appWidgetIds.size} project widgets")
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        if (intent.action == ACTION_REFRESH_PROJECT) {
            Log.d(TAG, "Refresh project widgets requested")
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val component = ComponentName(context, ProjectWidgetProvider::class.java)
            val ids = appWidgetManager.getAppWidgetIds(component)
            for (widgetId in ids) {
                updateWidget(context, appWidgetManager, widgetId)
            }
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle
    ) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        Log.d(TAG, "onAppWidgetOptionsChanged called for widget $appWidgetId")
        updateWidget(context, appWidgetManager, appWidgetId)
    }

    private fun updateWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        widgetId: Int
    ) {
        val client = SupabaseWidgetClient(context)
        
        if (!client.isAuthenticated()) {
            val views = RemoteViews(context.packageName, R.layout.widget_login_required)
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (launchIntent != null) {
                val pendingIntent = PendingIntent.getActivity(
                    context, 0, launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_login_required, pendingIntent)
            }
            appWidgetManager.updateAppWidget(widgetId, views)
            return
        }

        val prefs = context.getSharedPreferences("lux_widget_config", Context.MODE_PRIVATE)
        val projectId = prefs.getString("project_id_widget_$widgetId", null)
        val bgOpacity = when {
            prefs.contains("widget_background_opacity_$widgetId") -> prefs.getInt("widget_background_opacity_$widgetId", 85)
            prefs.contains("widget_background_opacity_com.luxresilient.app.widget.ProjectWidgetProvider") -> prefs.getInt("widget_background_opacity_com.luxresilient.app.widget.ProjectWidgetProvider", 85)
            else -> prefs.getInt("widget_background_opacity", 85)
        }

        val views = RemoteViews(context.packageName, R.layout.widget_project_progress)

        // Apply Overall Widget Background Opacity
        views.setFloat(R.id.project_background_image, "setAlpha", bgOpacity / 100f)

        if (projectId.isNullOrEmpty()) {
            // Show unconfigured state
            views.setViewVisibility(R.id.project_unconfigured_layout, View.VISIBLE)
            views.setViewVisibility(R.id.project_configured_layout, View.GONE)

            // Setup click intent to open WidgetConfigActivity
            val configIntent = Intent(context, WidgetConfigActivity::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val configPending = PendingIntent.getActivity(
                context, widgetId, configIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            )
            views.setOnClickPendingIntent(R.id.btn_select_project, configPending)
            appWidgetManager.updateAppWidget(widgetId, views)
            return
        }

        // Configure configured state
        views.setViewVisibility(R.id.project_unconfigured_layout, View.GONE)
        views.setViewVisibility(R.id.project_configured_layout, View.VISIBLE)

        // Draw and update asynchronously
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val projects = client.fetchProjects()
                val project = projects.find { it.id == projectId }

                if (project == null) {
                    // Project not found or deleted, reset
                    withContext(Dispatchers.Main) {
                        views.setViewVisibility(R.id.project_unconfigured_layout, View.VISIBLE)
                        views.setViewVisibility(R.id.project_configured_layout, View.GONE)
                        appWidgetManager.updateAppWidget(widgetId, views)
                    }
                    return@launch
                }

                // Compute details
                val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
                val todayMins = project.sessions?.filter { ProjectGoalCalculator.getLocalDateString(it.date) == todayStr }?.sumOf { it.duration / 60.0 } ?: 0.0
                
                val targetMins = ProjectGoalCalculator.getDynamicDailyTarget(project)

                val pct = if (targetMins > 0) minOf(100, ((todayMins / targetMins) * 100).toInt()) else 0

                val density = context.resources.displayMetrics.density
                val baseColorHex = project.color ?: TraitIcons.getColor(project.attribute)
                val parsedColor = try { Color.parseColor(baseColorHex) } catch (e: Exception) { Color.parseColor("#EF4444") }

                // Get dynamic widget options for sizing
                val options = appWidgetManager.getAppWidgetOptions(widgetId)
                val minWidthDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
                val minHeightDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT)
                val widgetWidth = ((if (minWidthDp > 0) minWidthDp else 300) * density).toInt().coerceAtLeast(280)
                val widgetHeight = ((if (minHeightDp > 0) minHeightDp else 70) * density).toInt().coerceAtLeast(60)

                withContext(Dispatchers.Main) {
                    // Apply dynamic card spacing (padding)
                    val cardSpacing = prefs.getString("card_spacing_widget_$widgetId", "medio") ?: "medio"
                    val paddingDp = when (cardSpacing) {
                        "poco" -> 4
                        "grande" -> 16
                        else -> 10
                    }
                    val paddingPx = (paddingDp * density).toInt()
                    views.setViewPadding(R.id.project_configured_layout, paddingPx, paddingPx, paddingPx, paddingPx)

                    // Apply layout optimizations if in 2x1 mode (minWidthDp < 200)
                    val is2x1 = minWidthDp in 1..199
                    if (is2x1) {
                        views.setViewVisibility(R.id.project_play_btn, View.GONE)
                        views.setViewVisibility(R.id.project_chevron, View.GONE)
                        views.setFloat(R.id.project_title, "setTextSize", 11.5f)
                        views.setFloat(R.id.project_time_fraction, "setTextSize", 9.5f)
                        views.setFloat(R.id.project_percentage_text, "setTextSize", 9.5f)
                    } else {
                        views.setViewVisibility(R.id.project_play_btn, View.VISIBLE)
                        views.setViewVisibility(R.id.project_chevron, View.VISIBLE)
                        views.setFloat(R.id.project_title, "setTextSize", 14.0f)
                        views.setFloat(R.id.project_time_fraction, "setTextSize", 11.0f)
                        views.setFloat(R.id.project_percentage_text, "setTextSize", 10.0f)
                    }

                    // Background glow
                    val glowBitmap = createGlowBackground(density, widgetWidth, widgetHeight, parsedColor)
                    views.setImageViewBitmap(R.id.project_glow_background, glowBitmap)

                    // Project title
                    views.setTextViewText(R.id.project_title, project.title)
                    views.setTextColor(R.id.project_title, parsedColor)

                    // Format Time Fraction using Html to style actual and target times differently
                    val actualHours = (todayMins / 60).toInt()
                    val actualMins = (todayMins % 60).toInt()
                    val targetHours = (targetMins / 60).toInt()
                    val targetMinsVal = (targetMins % 60).toInt()
                    
                    val fractionHtml = "<font color='#FFFFFF'><b>%dh %02dm</b></font> <font color='#80FFFFFF'>/ %dh %02dm</font>".format(
                        actualHours, actualMins, targetHours, targetMinsVal
                    )
                    views.setTextViewText(R.id.project_time_fraction, android.text.Html.fromHtml(fractionHtml, android.text.Html.FROM_HTML_MODE_LEGACY))

                    // Progress bar fill (take full width in 2x1, or ~60% of widget width normally)
                    val playBtnOffset = if (is2x1) 0f else (44 + 10) * density
                    val rightOffset = if (is2x1) 12 * density else (16 + 8 + 20) * density
                    val barWidth = (widgetWidth - playBtnOffset - rightOffset).toInt().coerceAtLeast(100)
                    val barHeight = (6 * density).toInt()
                    val barBitmap = createProgressBarBitmap(density, barWidth, barHeight, parsedColor, pct)
                    views.setImageViewBitmap(R.id.project_progress_bar_fill, barBitmap)

                    // Percentage Text
                    views.setTextViewText(R.id.project_percentage_text, "$pct%")

                    // Custom drawn Play Button bitmap (colored circle/rounded rect with white play symbol)
                    if (!is2x1) {
                        val playBtnSize = (44 * density).toInt()
                        val playBitmap = createPlayButtonBitmap(density, playBtnSize, playBtnSize, parsedColor)
                        views.setImageViewBitmap(R.id.project_play_image, playBitmap)
                    }

                    // Click intent to open Focus Session in the app (on play button and entire card)
                    val launchIntent = Intent(Intent.ACTION_VIEW).apply {
                        data = Uri.parse("luxapp://focus-session?projectId=${project.id}")
                        setPackage(context.packageName)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    val pendingIntent = PendingIntent.getActivity(
                        context, widgetId * 10 + 2, launchIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.project_play_btn, pendingIntent)
                    views.setOnClickPendingIntent(R.id.project_configured_layout, pendingIntent)

                    appWidgetManager.updateAppWidget(widgetId, views)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error rendering project widget $widgetId: ${e.message}", e)
            }
        }
    }

    private fun createPlayButtonBitmap(density: Float, width: Int, height: Int, color: Int): Bitmap {
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        
        // Draw rounded rectangle background (colored)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = color
            this.style = Paint.Style.FILL
        }
        val rect = RectF(0f, 0f, width.toFloat(), height.toFloat())
        canvas.drawRoundRect(rect, 10 * density, 10 * density, paint)
        
        // Draw white play triangle inside
        paint.color = Color.WHITE
        val path = Path().apply {
            val centerX = width / 2f
            val centerY = height / 2f
            val size = 6 * density
            
            moveTo(centerX - size * 0.7f, centerY - size)
            lineTo(centerX - size * 0.7f, centerY + size)
            lineTo(centerX + size * 1.2f, centerY)
            close()
        }
        canvas.drawPath(path, paint)
        
        return bitmap
    }

    private fun createProgressBarBitmap(density: Float, width: Int, height: Int, color: Int, percentage: Int): Bitmap {
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val rect = RectF(0f, 0f, width.toFloat(), height.toFloat())
        
        // 1. Draw semi-transparent background track
        val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = Color.parseColor("#26FFFFFF") // 15% opacity white
            this.style = Paint.Style.FILL
        }
        canvas.drawRoundRect(rect, 3 * density, 3 * density, trackPaint)
        
        // 2. Draw progress fill rounded rect
        if (percentage > 0) {
            val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                this.color = color
                this.style = Paint.Style.FILL
            }
            val fillWidth = width * (percentage / 100f)
            val fillRect = RectF(0f, 0f, fillWidth, height.toFloat())
            canvas.drawRoundRect(fillRect, 3 * density, 3 * density, fillPaint)
        }
        return bitmap
    }

    private fun createGlowBackground(density: Float, width: Int, height: Int, color: Int): Bitmap {
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        
        // Background card rounded rect
        val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = Color.parseColor("#050505")
            this.alpha = 230
        }
        val rect = RectF(0f, 0f, width.toFloat(), height.toFloat())
        canvas.drawRoundRect(rect, 16 * density, 16 * density, bgPaint)

        // Radial glow from center-left near the project icon
        val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            val colors = intArrayOf(
                Color.argb(70, Color.red(color), Color.green(color), Color.blue(color)),
                Color.argb(20, Color.red(color), Color.green(color), Color.blue(color)),
                Color.TRANSPARENT
            )
            val stops = floatArrayOf(0f, 0.4f, 1f)
            this.shader = RadialGradient(
                width * 0.12f, height * 0.5f,
                height * 1.2f,
                colors, stops,
                Shader.TileMode.CLAMP
            )
        }
        canvas.drawRoundRect(rect, 16 * density, 16 * density, glowPaint)

        // Border card
        val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.style = Paint.Style.STROKE
            this.strokeWidth = 1.5f * density
            this.color = Color.argb(60, Color.red(color), Color.green(color), Color.blue(color))
        }
        canvas.drawRoundRect(rect, 16 * density, 16 * density, borderPaint)

        return bitmap
    }

    private fun getIconEmoji(iconName: String): String? {
        return when (iconName) {
            "Dumbbell", "dumbbell" -> "💪"
            "Heart", "heart" -> "❤️"
            "HeartPulse", "heart-pulse" -> "💓"
            "Activity", "activity" -> "📈"
            "Bike", "bike" -> "🚴"
            "Footprints", "footprints" -> "👣"
            "Scale", "scale" -> "⚖️"
            "Running", "run", "Run", "running" -> "🏃"
            "Walk", "walk", "🚶" -> "🚶"
            "Swim", "swim" -> "🏊"
            "Meditation", "yoga", "Yoga", "meditation" -> "🧘"
            
            "Brain", "brain" -> "🧠"
            "BookOpen", "book-open" -> "📖"
            "Book", "book", "BookMarked", "book-marked" -> "📚"
            "GraduationCap", "graduation-cap" -> "🎓"
            "Lightbulb", "lightbulb" -> "💡"
            "Puzzle", "puzzle" -> "🧩"
            "Languages", "languages" -> "🌐"
            "Notebook", "notebook" -> "📓"
            "FileText", "file-text" -> "📄"
            "Calculator", "calculator" -> "🧮"
            "Search", "search" -> "🔍"
            
            "Target", "target" -> "🎯"
            "CheckCircle", "check-circle", "Check", "check" -> "✅"
            "Clock", "clock", "Clock3" -> "⏰"
            "Timer", "timer" -> "⏱️"
            "Calendar", "calendar", "CalendarRange" -> "📅"
            "ListTodo", "list-todo", "List", "list" -> "📝"
            "Hourglass", "hourglass" -> "⏳"
            "Pin", "pin" -> "📌"
            "Grid", "grid" -> "🏁"
            
            "Users", "users" -> "👥"
            "MessageCircle", "message-circle", "MessageSquare", "message-square" -> "💬"
            "Phone", "phone" -> "📱"
            "Mail", "mail" -> "📧"
            "HeartHandshake", "heart-handshake" -> "🤝"
            "Share2", "share-2" -> "📤"
            "ThumbsUp", "thumbs-up" -> "👍"
            
            "Palette", "palette" -> "🎨"
            "Music", "music" -> "🎵"
            "Camera", "camera" -> "📸"
            "Video", "video" -> "📹"
            "Pen", "pencil", "Pencil", "brush", "Brush" -> "✏️"
            "Gamepad", "gamepad" -> "🎮"
            "Tv", "tv", "Monitor", "monitor" -> "📺"
            
            "Wallet", "wallet" -> "💰"
            "Coins", "coins" -> "🪙"
            "DollarSign", "dollar-sign" -> "💵"
            "TrendingUp", "trending-up" -> "📈"
            
            else -> null
        }
    }

    private fun normalizeDate(dateStr: String?): String {
        if (dateStr.isNullOrEmpty()) return ""
        if (dateStr.length >= 10 && dateStr[4] == '-' && dateStr[7] == '-') {
            return dateStr.substring(0, 10)
        }
        return dateStr
    }
}
