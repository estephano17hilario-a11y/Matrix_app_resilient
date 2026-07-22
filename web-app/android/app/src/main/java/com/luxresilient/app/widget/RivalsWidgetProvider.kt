package com.luxresilient.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import com.luxresilient.app.R

class RivalsWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "RivalsWidgetProvider"
        const val ACTION_REFRESH_RIVALS = "com.luxresilient.app.REFRESH_RIVALS_WIDGET"
        private const val PREFS_NAME = "lux_widget_auth"

        // Hardcoded rival configs (mirrors rivalsConfig.ts first 10 levels)
        data class RivalConfig(
            val level: Int, val name: String, val avatar: String,
            val targetTasks: Int, val targetFocusMinutes: Int, val targetHabitPct: Int,
            val workStartHour: Int = 9, val workEndHour: Int = 18
        )
        val RIVAL_CONFIGS = listOf(
            RivalConfig(1, "Francesco Cirillo", "⌛", 1, 60, 25),
            RivalConfig(2, "Tiago Forte", "🧠", 1, 90, 30),
            RivalConfig(3, "Cal Newport", "🎯", 2, 120, 35),
            RivalConfig(4, "David Allen", "📋", 2, 150, 40),
            RivalConfig(5, "Ryder Carroll", "📓", 3, 90, 45),
            RivalConfig(6, "James Clear", "🔄", 3, 120, 50),
            RivalConfig(7, "Tim Ferriss", "⚡", 4, 180, 55),
            RivalConfig(8, "Robin Sharma", "🌅", 5, 240, 60),
            RivalConfig(9, "Tony Robbins", "🔥", 6, 180, 65),
            RivalConfig(10, "Elon Musk", "🚀", 8, 360, 70, 6, 23)
        )
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        Log.d(TAG, "onUpdate called for ${appWidgetIds.size} rivals widgets")
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH_RIVALS || intent.action == AppWidgetManager.ACTION_APPWIDGET_UPDATE) {
            Log.d(TAG, "Refresh rivals requested via action: ${intent.action}")
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val component = ComponentName(context, RivalsWidgetProvider::class.java)
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
        updateWidget(context, appWidgetManager, appWidgetId)
    }

    private fun updateWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        widgetId: Int
    ) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val capPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)

        // Read from lux_widget_auth first, fallback to CapacitorStorage
        var rivalName = prefs.getString("rival_name", null) ?: capPrefs.getString("rival_name", null)
        var rivalAvatar = prefs.getString("rival_avatar", null) ?: capPrefs.getString("rival_avatar", null)
        var rivalLevel = try { prefs.getInt("rival_level", 0) } catch (e: Exception) { 0 }
        if (rivalLevel == 0) { rivalLevel = try { capPrefs.getInt("rival_level", 0) } catch (e: Exception) { 0 } }
        var rivalActivity = prefs.getString("rival_activity", null) ?: capPrefs.getString("rival_activity", null)

        var rivalTasks = try { prefs.getInt("rival_tasks", -1) } catch (e: Exception) { -1 }
        if (rivalTasks < 0) { rivalTasks = try { capPrefs.getInt("rival_tasks", -1) } catch (e: Exception) { -1 } }
        var userTasks = try { prefs.getInt("user_tasks", -1) } catch (e: Exception) { -1 }
        if (userTasks < 0) { userTasks = try { capPrefs.getInt("user_tasks", -1) } catch (e: Exception) { -1 } }
        var targetTasks = try { prefs.getInt("target_tasks", 0) } catch (e: Exception) { 0 }

        var rivalFocus = try { prefs.getFloat("rival_focus", -1.0f) } catch (e: Exception) { -1.0f }
        if (rivalFocus < 0) { rivalFocus = try { capPrefs.getFloat("rival_focus", -1.0f) } catch (e: Exception) { -1.0f } }
        var userFocus = try { prefs.getFloat("user_focus", -1.0f) } catch (e: Exception) { -1.0f }
        if (userFocus < 0) { userFocus = try { capPrefs.getFloat("user_focus", -1.0f) } catch (e: Exception) { -1.0f } }
        var targetFocus = try { prefs.getFloat("target_focus", 0.0f) } catch (e: Exception) { 0.0f }

        var rivalHabits = try { prefs.getInt("rival_habits", -1) } catch (e: Exception) { -1 }
        if (rivalHabits < 0) { rivalHabits = try { capPrefs.getInt("rival_habits", -1) } catch (e: Exception) { -1 } }
        var userHabits = try { prefs.getInt("user_habits", -1) } catch (e: Exception) { -1 }
        if (userHabits < 0) { userHabits = try { capPrefs.getInt("user_habits", -1) } catch (e: Exception) { -1 } }
        var targetHabits = try { prefs.getInt("target_habits", 0) } catch (e: Exception) { 0 }

        var isVictory = try { prefs.getBoolean("is_victory", false) } catch (e: Exception) { false }

        // If no data from SharedPrefs, calculate natively from cache (same as ScoreWidget's calculateNativeScore)
        val needsFallback = rivalName == null || userTasks < 0 || userHabits < 0
        if (needsFallback) {
            Log.d(TAG, "SharedPrefs empty/stale — calculating native rivals data from cache")
            val nativeData = calculateNativeRivalsData(context)
            if (nativeData != null) {
                if (rivalName == null) rivalName = nativeData.rivalName
                if (rivalAvatar == null) rivalAvatar = nativeData.rivalAvatar
                if (rivalLevel == 0) rivalLevel = nativeData.rivalLevel
                if (rivalActivity == null) rivalActivity = nativeData.rivalActivity
                if (rivalTasks < 0) rivalTasks = nativeData.rivalTasks
                if (userTasks < 0) userTasks = nativeData.userTasks
                if (targetTasks == 0) targetTasks = nativeData.targetTasks
                if (rivalFocus < 0) rivalFocus = nativeData.rivalFocus
                if (userFocus < 0) userFocus = nativeData.userFocus
                if (targetFocus == 0.0f) targetFocus = nativeData.targetFocus
                if (rivalHabits < 0) rivalHabits = nativeData.rivalHabits
                if (userHabits < 0) userHabits = nativeData.userHabits
                if (targetHabits == 0) targetHabits = nativeData.targetHabits
                isVictory = nativeData.isVictory
            }
        }

        // Ensure no negative sentinel values leak into UI
        if (rivalTasks < 0) rivalTasks = 0
        if (userTasks < 0) userTasks = 0
        if (rivalFocus < 0) rivalFocus = 0.0f
        if (userFocus < 0) userFocus = 0.0f
        if (rivalHabits < 0) rivalHabits = 0
        if (userHabits < 0) userHabits = 0
        if (rivalName == null) rivalName = "Francesco Cirillo"
        if (rivalAvatar == null) rivalAvatar = "⌛"
        if (rivalActivity == null) rivalActivity = "🔴 En Enfoque Profundo"
        if (targetTasks == 0) targetTasks = 1
        if (targetFocus == 0.0f) targetFocus = 1.0f
        if (targetHabits == 0) targetHabits = 25

        Log.d(TAG, "Widget data: User(T:$userTasks F:${userFocus}h H:$userHabits%) vs $rivalName(T:$rivalTasks F:${rivalFocus}h H:$rivalHabits%) victory=$isVictory")

        // Background Opacity for Rivals Widget
        val configPrefs = context.getSharedPreferences("lux_widget_config", Context.MODE_PRIVATE)
        val bgOpacity = when {
            configPrefs.contains("widget_background_opacity_$widgetId") -> configPrefs.getInt("widget_background_opacity_$widgetId", 85)
            configPrefs.contains("widget_background_opacity_com.luxresilient.app.widget.RivalsWidgetProvider") -> configPrefs.getInt("widget_background_opacity_com.luxresilient.app.widget.RivalsWidgetProvider", 85)
            else -> configPrefs.getInt("widget_background_opacity", 85)
        }
        val views = RemoteViews(context.packageName, R.layout.widget_rivals)
        views.setFloat(R.id.rivals_background_image, "setAlpha", bgOpacity / 100f)

        // Calculate precision comparison colors per category (User vs Rival)
        // User < Rival: User=RED (#EF4444), Rival=GREEN (#10B981)
        // User > Rival: User=GREEN (#10B981), Rival=RED (#EF4444)
        // User == Rival (Empate): Both=YELLOW/AMBER (#F59E0B)
        val (userTaskColor, rivalTaskColor) = getStatComparisonColors(userTasks.toDouble(), rivalTasks.toDouble())
        val (userFocusColor, rivalFocusColor) = getStatComparisonColors(userFocus.toDouble(), rivalFocus.toDouble())
        val (userHabitColor, rivalHabitColor) = getStatComparisonColors(userHabits.toDouble(), rivalHabits.toDouble())

        // Calculate overall duel state
        val isUserAhead = userTasks >= rivalTasks && userFocus >= rivalFocus && userHabits >= rivalHabits
        val isRivalAhead = rivalTasks > userTasks && rivalFocus > userFocus

        val statusText = when {
            isVictory -> "🏆 ¡VICTORIA!"
            isUserAhead -> "🏆 GANANDO DUELO"
            isRivalAhead -> "⚡ RIVAL ADELANTE"
            else -> "⚔️ DUELO EN CURSO"
        }

        val statusColor = when {
            isVictory || isUserAhead -> 0xFF34D399.toInt() // Emerald Green
            isRivalAhead -> 0xFFF43F5E.toInt() // Rose / Red
            else -> 0xFFF59E0B.toInt() // Amber Gold
        }

        // 1. Populate Full Grid Layout (2x2+)
        views.setTextViewText(R.id.rival_avatar_text, rivalAvatar)
        views.setTextViewText(R.id.rival_name_text, rivalName)
        views.setTextViewText(R.id.rival_level_badge, "Lvl $rivalLevel")
        views.setTextViewText(R.id.rival_activity_text, rivalActivity)

        // User Side (Left)
        views.setTextViewText(R.id.user_tasks_vert, "$userTasks")
        views.setTextColor(R.id.user_tasks_vert, userTaskColor)

        views.setTextViewText(R.id.user_focus_vert, "${String.format("%.1f", userFocus)}h")
        views.setTextColor(R.id.user_focus_vert, userFocusColor)

        views.setTextViewText(R.id.user_habits_vert, "$userHabits%")
        views.setTextColor(R.id.user_habits_vert, userHabitColor)

        // Rival Side (Right)
        views.setTextViewText(R.id.rival_tasks_vert, "$rivalTasks")
        views.setTextColor(R.id.rival_tasks_vert, rivalTaskColor)

        views.setTextViewText(R.id.rival_focus_vert, "${String.format("%.1f", rivalFocus)}h")
        views.setTextColor(R.id.rival_focus_vert, rivalFocusColor)

        views.setTextViewText(R.id.rival_habits_vert, "$rivalHabits%")
        views.setTextColor(R.id.rival_habits_vert, rivalHabitColor)

        views.setTextViewText(R.id.rivals_status_banner, statusText)
        views.setTextColor(R.id.rivals_status_banner, statusColor)

        // 2. Populate Horizontal Layout (2x1, 3x1, 4x1)
        views.setTextViewText(R.id.rival_avatar_horiz, rivalAvatar)
        views.setTextViewText(R.id.rival_name_horiz, rivalName)

        views.setTextViewText(R.id.user_tasks_horiz, "$userTasks")
        views.setTextColor(R.id.user_tasks_horiz, userTaskColor)
        views.setTextViewText(R.id.rival_tasks_horiz, "$rivalTasks")
        views.setTextColor(R.id.rival_tasks_horiz, rivalTaskColor)

        views.setTextViewText(R.id.user_focus_horiz, "${String.format("%.1f", userFocus)}h")
        views.setTextColor(R.id.user_focus_horiz, userFocusColor)
        views.setTextViewText(R.id.rival_focus_horiz, "${String.format("%.1f", rivalFocus)}h")
        views.setTextColor(R.id.rival_focus_horiz, rivalFocusColor)

        views.setTextViewText(R.id.user_habits_horiz, "$userHabits%")
        views.setTextColor(R.id.user_habits_horiz, userHabitColor)
        views.setTextViewText(R.id.rival_habits_horiz, "$rivalHabits%")
        views.setTextColor(R.id.rival_habits_horiz, rivalHabitColor)

        views.setTextViewText(R.id.rivals_status_horiz, statusText)
        views.setTextColor(R.id.rivals_status_horiz, statusColor)

        // 3. Populate Compact / Tall Layout (1x1, 1x2, 1x3, 1x4)
        views.setTextViewText(R.id.rival_avatar_compact, rivalAvatar)
        views.setTextViewText(R.id.rival_name_compact, rivalName)

        views.setTextViewText(R.id.user_tasks_compact, "$userTasks")
        views.setTextColor(R.id.user_tasks_compact, userTaskColor)
        views.setTextViewText(R.id.rival_tasks_compact, "$rivalTasks")
        views.setTextColor(R.id.rival_tasks_compact, rivalTaskColor)

        views.setTextViewText(R.id.user_focus_compact, "${String.format("%.1f", userFocus)}h")
        views.setTextColor(R.id.user_focus_compact, userFocusColor)
        views.setTextViewText(R.id.rival_focus_compact, "${String.format("%.1f", rivalFocus)}h")
        views.setTextColor(R.id.rival_focus_compact, rivalFocusColor)

        views.setTextViewText(R.id.user_habits_compact, "$userHabits%")
        views.setTextColor(R.id.user_habits_compact, userHabitColor)
        views.setTextViewText(R.id.rival_habits_compact, "$rivalHabits%")
        views.setTextColor(R.id.rival_habits_compact, rivalHabitColor)

        views.setTextViewText(R.id.rivals_status_compact, statusText)
        views.setTextColor(R.id.rivals_status_compact, statusColor)

        // Handle Resizing / Responsiveness (1x1, 2x1, 1x2, 3x1, 4x1, 1x3, 1x4, 2x2+)
        val options = appWidgetManager.getAppWidgetOptions(widgetId)
        val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
        val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT)

        if (minWidth > 0 && minHeight > 0) {
            if (minWidth < 95) {
                // Narrow width mode (1x1, 1x2, 1x3, 1x4)
                views.setViewVisibility(R.id.rivals_layout_compact, View.VISIBLE)
                views.setViewVisibility(R.id.rivals_layout_horizontal, View.GONE)
                views.setViewVisibility(R.id.rivals_layout_full, View.GONE)
            } else if (minWidth >= 95 && minHeight < 95) {
                // Wide landscape mode (2x1, 3x1, 4x1)
                views.setViewVisibility(R.id.rivals_layout_compact, View.GONE)
                views.setViewVisibility(R.id.rivals_layout_horizontal, View.VISIBLE)
                views.setViewVisibility(R.id.rivals_layout_full, View.GONE)
            } else {
                // Standard & Large grid mode (2x2, 3x2, 3x3, 4x2+)
                views.setViewVisibility(R.id.rivals_layout_compact, View.GONE)
                views.setViewVisibility(R.id.rivals_layout_horizontal, View.GONE)
                views.setViewVisibility(R.id.rivals_layout_full, View.VISIBLE)
            }
        } else {
            // Default 2x2+ mode
            views.setViewVisibility(R.id.rivals_layout_compact, View.GONE)
            views.setViewVisibility(R.id.rivals_layout_horizontal, View.GONE)
            views.setViewVisibility(R.id.rivals_layout_full, View.VISIBLE)
        }

        // Set Launch Intent on Click (Opens App directly to Rivals Section)
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
            data = Uri.parse("luxapp://rivals")
            action = Intent.ACTION_VIEW
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        if (launchIntent != null) {
            val pendingIntent = PendingIntent.getActivity(
                context, widgetId + 9000, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.rivals_widget_root, pendingIntent)
        }

        appWidgetManager.updateAppWidget(widgetId, views)
    }

    private fun getStatComparisonColors(userVal: Double, rivalVal: Double): Pair<Int, Int> {
        val red = 0xFFEF4444.toInt()
        val green = 0xFF10B981.toInt()
        val yellow = 0xFFF59E0B.toInt()
        return when {
            userVal < rivalVal -> Pair(red, green)
            userVal > rivalVal -> Pair(green, red)
            else -> Pair(yellow, yellow)
        }
    }

    /**
     * Native fallback: calculate rivals data from local cache when SharedPrefs are empty.
     * Same pattern as ScoreWidgetProvider.calculateNativeScore().
     */
    data class NativeRivalsData(
        val rivalName: String, val rivalAvatar: String, val rivalLevel: Int,
        val rivalActivity: String,
        val rivalTasks: Int, val userTasks: Int, val targetTasks: Int,
        val rivalFocus: Float, val userFocus: Float, val targetFocus: Float,
        val rivalHabits: Int, val userHabits: Int, val targetHabits: Int,
        val isVictory: Boolean
    )

    private fun calculateNativeRivalsData(context: Context): NativeRivalsData? {
        return try {
            val capPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val todayStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())

            // 1. Determine current rival level from localStorage cache
            var unlockedLevel = 1
            try {
                val progressJson = capPrefs.getString("matrix_rivals_progress", null)
                if (!progressJson.isNullOrEmpty()) {
                    val progressObj = com.google.gson.JsonParser.parseString(progressJson).asJsonObject
                    unlockedLevel = progressObj.get("unlockedLevel")?.asInt ?: 1
                }
            } catch (e: Exception) {
                Log.w(TAG, "Could not parse rivals progress: ${e.message}")
            }

            val rivalConfig = RIVAL_CONFIGS.find { it.level == unlockedLevel } ?: RIVAL_CONFIGS[0]
            Log.d(TAG, "Native rivals calc: Level=$unlockedLevel, Rival=${rivalConfig.name}")

            // 2. Calculate rival's simulated progress based on time of day
            val now = java.util.Calendar.getInstance()
            val currentHour = now.get(java.util.Calendar.HOUR_OF_DAY)
            val currentMinute = now.get(java.util.Calendar.MINUTE)
            val currentTimeMinutes = currentHour * 60 + currentMinute
            val workStartMinutes = rivalConfig.workStartHour * 60
            val workEndMinutes = rivalConfig.workEndHour * 60
            val totalWorkMinutes = workEndMinutes - workStartMinutes

            val ratio: Float
            val rivalActivity: String
            if (currentTimeMinutes < workStartMinutes) {
                ratio = 0.0f
                rivalActivity = if (currentHour >= 22 || currentHour < rivalConfig.workStartHour) "😴 Durmiendo" else "☕ Preparándose"
            } else if (currentTimeMinutes >= workEndMinutes) {
                ratio = 1.0f
                rivalActivity = "🌙 Jornada completada"
            } else {
                val elapsed = currentTimeMinutes - workStartMinutes
                ratio = Math.min(1.0f, elapsed.toFloat() / totalWorkMinutes.toFloat())
                rivalActivity = when {
                    ratio < 0.25f -> "💻 Bloque de enfoque matutino"
                    ratio < 0.50f -> "⚡ Completando hábitos y tareas"
                    ratio < 0.75f -> "🔥 Enfoque Hardcore en proyecto"
                    else -> "🚀 Sprint final de productividad"
                }
            }

            val rivalTasks = Math.floor((rivalConfig.targetTasks * ratio).toDouble()).toInt()
            val rivalFocusHours = (rivalConfig.targetFocusMinutes * ratio) / 60.0f
            val rivalHabitPct = Math.floor((rivalConfig.targetHabitPct * ratio).toDouble()).toInt()

            // 3. Calculate user's actual stats from local cache (same as ScoreWidget)
            val client = SupabaseWidgetClient(context)
            val habits = client.fetchHabits()
            val tasks = client.fetchTasks(includeCompleted = true)
            val projects = client.fetchProjects()

            // User tasks completed today
            var userTasksCount = 0
            for (t in tasks) {
                if (t.archived == true) continue
                if (t.completed && t.completedAt?.startsWith(todayStr) == true) {
                    userTasksCount++
                }
            }

            // User habits percentage
            var habitsCompleted = 0
            var habitsTotal = 0
            for (h in habits) {
                if (h.archived == true) continue
                habitsTotal++
                if (h.completedToday == true) habitsCompleted++
            }
            val userHabitPct = if (habitsTotal > 0) Math.round((habitsCompleted.toFloat() / habitsTotal.toFloat()) * 100) else 0

            // User focus hours today
            var focusSecondsToday = 0L
            for (p in projects) {
                if (p.archived == true || p.deleted == true) continue
                val sessions = p.sessions ?: continue
                for (s in sessions) {
                    if (s.date?.startsWith(todayStr) == true) {
                        focusSecondsToday += s.duration
                    }
                }
            }
            val userFocusHours = focusSecondsToday.toFloat() / 3600.0f

            // Duel evaluation
            val isTaskWon = userTasksCount >= rivalConfig.targetTasks
            val isFocusWon = userFocusHours >= (rivalConfig.targetFocusMinutes / 60.0f)
            val isHabitWon = userHabitPct >= rivalConfig.targetHabitPct
            val isVictory = isTaskWon && isFocusWon && isHabitWon

            Log.d(TAG, "Native rivals result: User(T:$userTasksCount F:${String.format("%.1f", userFocusHours)}h H:$userHabitPct%) vs ${rivalConfig.name}(T:$rivalTasks F:${String.format("%.1f", rivalFocusHours)}h H:$rivalHabitPct%)")

            NativeRivalsData(
                rivalName = rivalConfig.name,
                rivalAvatar = rivalConfig.avatar,
                rivalLevel = rivalConfig.level,
                rivalActivity = rivalActivity,
                rivalTasks = rivalTasks,
                userTasks = userTasksCount,
                targetTasks = rivalConfig.targetTasks,
                rivalFocus = rivalFocusHours,
                userFocus = userFocusHours,
                targetFocus = rivalConfig.targetFocusMinutes / 60.0f,
                rivalHabits = rivalHabitPct,
                userHabits = userHabitPct,
                targetHabits = rivalConfig.targetHabitPct,
                isVictory = isVictory
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error calculating native rivals data: ${e.message}", e)
            null
        }
    }
}
