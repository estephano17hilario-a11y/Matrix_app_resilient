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

        if (userId.isNullOrEmpty() && score < 0) {
            views.setViewVisibility(R.id.score_login_required, View.VISIBLE)
            views.setViewVisibility(R.id.score_configured_layout, View.GONE)
            
            // Set up login click launch
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (launchIntent != null) {
                val pendingIntent = PendingIntent.getActivity(
                    context, widgetId, launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.score_login_required, pendingIntent)
            }
            appWidgetManager.updateAppWidget(widgetId, views)
            return
        }

        views.setViewVisibility(R.id.score_login_required, View.GONE)
        views.setViewVisibility(R.id.score_configured_layout, View.VISIBLE)

        // Set score percentage string (matching feed score %)
        val scoreStr = if (score >= 0) "$score%" else "--"
        views.setTextViewText(R.id.score_widget_value_vert, scoreStr)
        views.setTextViewText(R.id.score_widget_value_horiz, scoreStr)

        // Determine resizing options / responsiveness
        val options = appWidgetManager.getAppWidgetOptions(widgetId)
        val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
        val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT)

        Log.d(TAG, "Responsive dimensions for widget $widgetId: minWidth=$minWidth, minHeight=$minHeight")

        if (minWidth > 0 && minHeight > 0) {
            if (minWidth < 100 && minHeight < 100) {
                // Pure circular 1x1 mode
                views.setViewVisibility(R.id.score_layout_vertical, View.VISIBLE)
                views.setViewVisibility(R.id.score_layout_horizontal, View.GONE)
                views.setViewVisibility(R.id.score_widget_title_vert, View.GONE)
                views.setViewVisibility(R.id.score_widget_sub_vert, View.GONE)
            } else if (minWidth >= 100 && minHeight < 100) {
                // 2x1 landscape mode
                views.setViewVisibility(R.id.score_layout_vertical, View.GONE)
                views.setViewVisibility(R.id.score_layout_horizontal, View.VISIBLE)
            } else {
                // 2x2, 3x3, 1x2 vertical modes
                views.setViewVisibility(R.id.score_layout_vertical, View.VISIBLE)
                views.setViewVisibility(R.id.score_layout_horizontal, View.GONE)
                views.setViewVisibility(R.id.score_widget_title_vert, View.VISIBLE)
                views.setViewVisibility(R.id.score_widget_sub_vert, View.VISIBLE)
            }
        } else {
            // Default 2x2 vertical mode
            views.setViewVisibility(R.id.score_layout_vertical, View.VISIBLE)
            views.setViewVisibility(R.id.score_layout_horizontal, View.GONE)
            views.setViewVisibility(R.id.score_widget_title_vert, View.VISIBLE)
            views.setViewVisibility(R.id.score_widget_sub_vert, View.VISIBLE)
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
            val habits = client.fetchHabits()
            val tasks = client.fetchTasks(includeCompleted = true)

            var total = 0
            var completed = 0

            for (h in habits) {
                total++
                if (h.completedToday == true) {
                    completed++
                }
            }

            val todayStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date())
            for (t in tasks) {
                if (t.archived == true) continue
                val taskDate = t.deadline
                if (taskDate == null || taskDate.startsWith(todayStr)) {
                    total++
                    if (t.completed) {
                        completed++
                    }
                }
            }

            if (total > 0) {
                val pct = (completed.toDouble() / total.toDouble()) * 100.0
                Math.round(pct).toInt()
            } else {
                100
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error calculating native score: ${e.message}")
            -1
        }
    }
}
