package com.luxresilient.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.*
import android.net.Uri
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
        val bgOpacity = prefs.getInt("widget_background_opacity", 85)

        val views = RemoteViews(context.packageName, R.layout.widget_project_progress)

        // Apply Overall Widget Background Opacity
        val bgAlphaInt = (bgOpacity * 2.55).toInt().coerceIn(0, 255)
        views.setInt(R.id.project_background_image, "setImageAlpha", bgAlphaInt)

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
                val todayMins = project.sessions?.filter { it.date == todayStr }?.sumOf { it.duration / 60.0 } ?: 0.0
                
                val targetMins = if (project.uiTarget != null) {
                    if (project.uiUnit == "MINUTES") project.uiTarget.toInt() else (project.uiTarget * 60).toInt()
                } else {
                    project.goalTarget
                }

                val pct = if (targetMins > 0) minOf(100, ((todayMins / targetMins) * 100).toInt()) else 0

                val density = context.resources.displayMetrics.density
                val baseColorHex = project.color ?: TraitIcons.getColor(project.attribute)
                val parsedColor = try { Color.parseColor(baseColorHex) } catch (e: Exception) { Color.parseColor("#6366f1") }

                withContext(Dispatchers.Main) {
                    // Background glow
                    val glowBitmap = createGlowBackground(density, (300 * density).toInt(), (54 * density).toInt(), parsedColor)
                    views.setImageViewBitmap(R.id.project_glow_background, glowBitmap)

                    // Project title
                    views.setTextViewText(R.id.project_title, project.title)
                    views.setTextColor(R.id.project_title, parsedColor)

                    // Project Icon/Emoji
                    val emoji = getIconEmoji(project.iconName ?: "") ?: TraitIcons.getEmoji(project.attribute)
                    views.setTextViewText(R.id.project_icon_emoji, emoji)

                    // Streak Count
                    if (project.streak > 0) {
                        views.setViewVisibility(R.id.project_streak_badge, View.VISIBLE)
                        views.setTextViewText(R.id.project_streak_badge, "🔥 ${project.streak}")
                    } else {
                        views.setViewVisibility(R.id.project_streak_badge, View.GONE)
                    }

                    // Progress Text (e.g. 0h 15m / 1h 00m)
                    val actualStr = String.format("%dh %02dm", (todayMins / 60).toInt(), (todayMins % 60).toInt())
                    val targetStr = String.format("%dh %02dm", (targetMins / 60).toInt(), (targetMins % 60).toInt())
                    views.setTextViewText(R.id.project_time_fraction, "$actualStr / $targetStr")

                    // Progress bar fill
                    val fillWidth = (160 * density).toInt()
                    val fillHeight = (6 * density).toInt()
                    val barBitmap = createProgressBarBitmap(density, fillWidth, fillHeight, parsedColor, pct)
                    views.setImageViewBitmap(R.id.project_progress_bar_fill, barBitmap)

                    // Click intent on Play Button
                    val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                        data = Uri.parse("luxapp://focus-session?projectId=${project.id}")
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    if (launchIntent != null) {
                        val playPending = PendingIntent.getActivity(
                            context, widgetId * 10 + 1, launchIntent,
                            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                        )
                        views.setOnClickPendingIntent(R.id.project_play_btn, playPending)
                    }

                    // Click intent on Card Body to configure
                    val configIntent = Intent(context, WidgetConfigActivity::class.java).apply {
                        putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    val configPending = PendingIntent.getActivity(
                        context, widgetId, configIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.project_icon_container, configPending)

                    appWidgetManager.updateAppWidget(widgetId, views)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error rendering project widget $widgetId: ${e.message}", e)
            }
        }
    }

    private fun createProgressBarBitmap(density: Float, width: Int, height: Int, color: Int, percentage: Int): Bitmap {
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = color
            this.style = Paint.Style.FILL
        }
        val fillWidth = width * (percentage / 100f)
        val rect = RectF(0f, 0f, fillWidth, height.toFloat())
        canvas.drawRoundRect(rect, 3 * density, 3 * density, paint)
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
}
