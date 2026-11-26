package com.luxresilient.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import com.luxresilient.app.R

class ScoreWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "ScoreWidgetProvider"
        const val ACTION_REFRESH_SCORE = "com.luxresilient.app.REFRESH_SCORE_WIDGET"
        private const val PREFS_NAME = "lux_widget_auth"
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        Log.d(TAG, "onUpdate called for ${appWidgetIds.size} score widgets")
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH_SCORE || intent.action == AppWidgetManager.ACTION_APPWIDGET_UPDATE) {
            Log.d(TAG, "Refresh score requested via action: ${intent.action}")
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val scoreComponent = ComponentName(context, ScoreWidgetProvider::class.java)
            val scoreIds = appWidgetManager.getAppWidgetIds(scoreComponent)
            for (widgetId in scoreIds) {
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
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val capPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
        var userId = prefs.getString("user_id", null) 
            ?: capPrefs.getString("user_id", null) 
            ?: capPrefs.getString("user", null)

        if (userId.isNullOrEmpty()) {
            val credentials = SupabaseWidgetClient(context).getCredentials()
            userId = credentials.first
        }

        var score = -1
        try {
            score = prefs.getInt("productivity_score", -1)
        } catch (e: Exception) {
            score = prefs.getString("productivity_score", null)?.toIntOrNull() ?: -1
        }

        if (score < 0 && capPrefs.contains("productivity_score")) {
            try {
                score = capPrefs.getInt("productivity_score", -1)
            } catch (e: Exception) {
                val str = capPrefs.getString("productivity_score", null)
                score = str?.toIntOrNull() ?: -1
            }
        }

        if (score < 0 && !userId.isNullOrEmpty()) {
            score = calculateNativeScore(context)
        }

        val views = RemoteViews(context.packageName, R.layout.widget_score)

        val configPrefs = WidgetTheme.prefs(context)
        val providerClass = ScoreWidgetProvider::class.java.name
        val style = WidgetTheme.styleFor(configPrefs, widgetId, providerClass, WidgetTheme.Style.AURORA)
        val bgOpacity = WidgetTheme.opacityFor(configPrefs, widgetId, providerClass)
        views.setFloat(R.id.score_background_image, "setAlpha", bgOpacity / 100f)

        val options = appWidgetManager.getAppWidgetOptions(widgetId)
        val (widthDp, heightDp) = WidgetTheme.sizeDp(options, 150, 150)
        val density = context.resources.displayMetrics.density
        val (tintFrom, tintTo) = WidgetArt.scoreColors(if (score < 0) 0 else score)
        views.setImageViewBitmap(R.id.score_background_image, WidgetTheme.background(context, widthDp, heightDp, style, tintFrom, if (widthDp < 100) 22f else 26f, WidgetTheme.isSolid(configPrefs, widgetId, providerClass)))

        if (userId.isNullOrEmpty() && score < 0) {
            views.setViewVisibility(R.id.score_login_required, View.VISIBLE)
            views.setViewVisibility(R.id.score_configured_layout, View.GONE)
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (launchIntent != null) {
                val pendingIntent = PendingIntent.getActivity(context, widgetId, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                views.setOnClickPendingIntent(R.id.score_login_required, pendingIntent)
            }
            appWidgetManager.updateAppWidget(widgetId, views)
            return
        }

        views.setViewVisibility(R.id.score_login_required, View.GONE)
        views.setViewVisibility(R.id.score_configured_layout, View.VISIBLE)

        val scoreStr = if (score >= 0) "$score%" else "--"
        val message = when {
            score < 0 -> "Sin datos aún"
            score >= 100 -> "¡Día perfecto!"
            score >= 80 -> "¡Casi perfecto!"
            score >= 60 -> "¡Vas muy bien!"
            score >= 40 -> "Buen ritmo"
            score >= 20 -> "Calentando motores"
            else -> "Arranca tu día"
        }
        val pct = if (score < 0) 0 else score
        views.setTextViewText(R.id.score_widget_value_vert, scoreStr)
        views.setTextViewText(R.id.score_widget_value_horiz, scoreStr)
        views.setTextViewText(R.id.score_widget_title_vert, "FEED DE HOY")
        views.setTextViewText(R.id.score_widget_sub_vert, message)
        views.setTextViewText(R.id.score_widget_sub_horiz, message)
        views.setImageViewBitmap(R.id.score_ring_vert, WidgetArt.ring(density, 120, pct, tintFrom, tintTo, 9f))
        views.setImageViewBitmap(R.id.score_ring_horiz, WidgetArt.ring(density, 58, pct, tintFrom, tintTo, 6f))
        views.setImageViewBitmap(R.id.score_bar_horiz, WidgetArt.bar(density, 140, 8, pct, tintFrom, tintTo))

        val minWidth = widthDp
        val minHeight = heightDp
        if (minWidth < 100 && minHeight < 100) {
            // 1x1: just the ring
            views.setViewVisibility(R.id.score_layout_vertical, View.VISIBLE)
            views.setViewVisibility(R.id.score_layout_horizontal, View.GONE)
            views.setViewVisibility(R.id.score_widget_title_vert, View.GONE)
            views.setViewVisibility(R.id.score_flipper_vert, View.GONE)
            views.setFloat(R.id.score_widget_value_vert, "setTextSize", 17f)
        } else if (minWidth >= 100 && minHeight < 100) {
            // wide strip
            views.setViewVisibility(R.id.score_layout_vertical, View.GONE)
            views.setViewVisibility(R.id.score_layout_horizontal, View.VISIBLE)
        } else {
            views.setViewVisibility(R.id.score_layout_vertical, View.VISIBLE)
            views.setViewVisibility(R.id.score_layout_horizontal, View.GONE)
            views.setViewVisibility(R.id.score_widget_title_vert, View.VISIBLE)
            views.setViewVisibility(R.id.score_flipper_vert, View.VISIBLE)
            views.setFloat(R.id.score_widget_value_vert, "setTextSize", if (minWidth >= 150) 28f else 22f)
        }

        // Set up click on configured layout to launch app
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        if (launchIntent != null) {
            val pendingIntent = PendingIntent.getActivity(
                context, widgetId + 5000, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.score_configured_layout, pendingIntent)
        }

        appWidgetManager.updateAppWidget(widgetId, views)
    }

    private fun calculateNativeScore(context: Context): Int {
        return try {
            val client = SupabaseWidgetClient(context)
            val todayStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())

            // 1. Try to load today's exact feed score from local/Supabase cached dailyFeed entry
            val feeds = client.fetchDailyFeed()
            val todayFeed = feeds.find { it.date == todayStr }
            if (todayFeed != null && todayFeed.score != null) {
                Log.d(TAG, "calculateNativeScore: Found today's feed entry. Score = ${todayFeed.score}")
                return Math.round(todayFeed.score).toInt()
            }

            // 2. Fallback to calculating the exact TS formula locally
            val habits = client.fetchHabits()
            val tasks = client.fetchTasks(includeCompleted = true)
            val projects = client.fetchProjects()

            var tasksCompleted = 0
            var tasksTotal = 0
            for (t in tasks) {
                if (t.archived == true) continue
                val isCompletedToday = t.completed && t.completedAt?.startsWith(todayStr) == true
                val isDueToday = t.deadline == null || t.deadline.startsWith(todayStr)
                
                if (isCompletedToday) {
                    tasksCompleted++
                    tasksTotal++
                } else if (!t.completed && isDueToday) {
                    tasksTotal++
                }
            }

            var habitsCompleted = 0
            var habitsTotal = 0
            for (h in habits) {
                if (h.archived == true) continue
                habitsTotal++
                if (h.completedToday == true) {
                    habitsCompleted++
                }
            }

            // Focus Minutes & Target
            var focusTargetMinutes = 0
            var focusMinutes = 0
            val cal = java.util.Calendar.getInstance()
            val dayOfWeek = cal.get(java.util.Calendar.DAY_OF_WEEK) // 1=Sun, 2=Mon, ..., 7=Sat
            val jsDow = dayOfWeek - 1 // JS: 0=Sun, 1=Mon, ..., 6=Sat

            for (p in projects) {
                if (p.archived == true || p.deleted == true) continue
                val activeDays = p.workingDays ?: emptyList()
                val isActiveToday = activeDays.isEmpty() || activeDays.contains(jsDow)
                if (isActiveToday) {
                    val target = p.goalTarget ?: 0
                    if (target > 0) {
                        focusTargetMinutes += target
                        val sessions = p.sessions ?: emptyList()
                        val todaySessions = sessions.filter { it.date?.startsWith(todayStr) == true }
                        val todayDurationSeconds = todaySessions.sumOf { it.duration }
                        focusMinutes += Math.round(todayDurationSeconds.toDouble() / 60.0).toInt()
                    }
                }
            }

            val hasTasks = tasksTotal > 0
            val hasFocus = focusTargetMinutes > 0

            var taskWeight = 0.0
            var habitWeight = 0.0
            var focusWeight = 0.0

            if (hasTasks && hasFocus) {
                taskWeight = 20.0
                habitWeight = 40.0
                focusWeight = 40.0
            } else if (!hasTasks && hasFocus) {
                taskWeight = 0.0
                habitWeight = 45.0
                focusWeight = 55.0
            } else if (hasTasks && !hasFocus) {
                taskWeight = 30.0
                habitWeight = 70.0
                focusWeight = 0.0
            } else {
                taskWeight = 0.0
                habitWeight = 100.0
                focusWeight = 0.0
            }

            val tasksScore = if (hasTasks) (tasksCompleted.toDouble() / tasksTotal.toDouble()) * taskWeight else 0.0
            val habitsScore = if (habitsTotal > 0) (habitsCompleted.toDouble() / habitsTotal.toDouble()) * habitWeight else habitWeight
            val focusScore = if (hasFocus) {
                var acc = 0.0
                for (p in projects) {
                    if (p.archived == true || p.deleted == true) continue
                    val activeDays = p.workingDays ?: emptyList()
                    val isActiveToday = activeDays.isEmpty() || activeDays.contains(jsDow)
                    if (isActiveToday) {
                        val target = p.goalTarget ?: 0
                        if (target > 0) {
                            val share = target.toDouble() / focusTargetMinutes.toDouble()
                            val sessions = p.sessions ?: emptyList()
                            val todaySessions = sessions.filter { it.date?.startsWith(todayStr) == true }
                            val todayMins = Math.round(todaySessions.sumOf { it.duration }.toDouble() / 60.0).toInt()
                            val comp = Math.min(todayMins.toDouble() / target.toDouble(), 1.0)
                            acc += share * comp * focusWeight
                        }
                    }
                }
                acc
            } else 0.0

            val totalScore = tasksScore + habitsScore + focusScore
            Log.d(TAG, "calculateNativeScore (calculated fallback): $totalScore (tasks: $tasksScore, habits: $habitsScore, focus: $focusScore)")
            Math.round(totalScore).toInt()
        } catch (e: Exception) {
            Log.e(TAG, "Error calculating native score: ${e.message}", e)
            -1
        }
    }
}
