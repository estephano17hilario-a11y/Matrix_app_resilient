package com.luxresilient.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.util.Log
import android.widget.RemoteViews
import com.luxresilient.app.R
import kotlinx.coroutines.*

class FocusWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "FocusWidgetProvider"
        const val ACTION_CYCLE_FOCUS_TIMEFRAME = "com.luxresilient.app.CYCLE_FOCUS_TIMEFRAME"
        const val ACTION_CYCLE_FOCUS_DIVISION = "com.luxresilient.app.CYCLE_FOCUS_DIVISION"
        const val ACTION_REFRESH_FOCUS = "com.luxresilient.app.REFRESH_FOCUS"
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        Log.d(TAG, "onUpdate called for ${appWidgetIds.size} focus widgets")
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        when (intent.action) {
            ACTION_REFRESH_FOCUS -> {
                Log.d(TAG, "Refresh focus requested")
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val focusComponent = ComponentName(context, FocusWidgetProvider::class.java)
                val focusIds = appWidgetManager.getAppWidgetIds(focusComponent)
                for (widgetId in focusIds) {
                    updateWidget(context, appWidgetManager, widgetId)
                }
            }
            ACTION_CYCLE_FOCUS_TIMEFRAME -> {
                val widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
                if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                    val prefs = context.getSharedPreferences("lux_widget_config", Context.MODE_PRIVATE)
                    val current = prefs.getString("focus_timeframe_widget_$widgetId", "WEEK") ?: "WEEK"
                    val next = when (current) {
                        "DAY" -> "WEEK"
                        "WEEK" -> "MONTH"
                        "MONTH" -> "8_WEEKS"
                        "8_WEEKS" -> "3_MONTHS"
                        "3_MONTHS" -> "YEAR"
                        else -> "DAY"
                    }
                    prefs.edit().putString("focus_timeframe_widget_$widgetId", next).apply()
                    Log.d(TAG, "Cycled focus widget $widgetId timeframe to $next")
                    
                    val appWidgetManager = AppWidgetManager.getInstance(context)
                    updateWidget(context, appWidgetManager, widgetId)
                }
            }
            ACTION_CYCLE_FOCUS_DIVISION -> {
                val widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
                if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                    val prefs = context.getSharedPreferences("lux_widget_config", Context.MODE_PRIVATE)
                    val current = prefs.getString("focus_division_widget_$widgetId", "rasgo") ?: "rasgo"
                    val next = when (current) {
                        "none" -> "rasgo"
                        "rasgo" -> "proyecto"
                        else -> "none"
                    }
                    prefs.edit().putString("focus_division_widget_$widgetId", next).apply()
                    Log.d(TAG, "Cycled focus widget $widgetId division to $next")
                    
                    val appWidgetManager = AppWidgetManager.getInstance(context)
                    updateWidget(context, appWidgetManager, widgetId)
                }
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
        val bgOpacity = prefs.getInt("widget_background_opacity", 85)
        val views = RemoteViews(context.packageName, R.layout.widget_focus_chart)

        // Apply Overall Widget Background Opacity
        val bgAlphaInt = (bgOpacity * 2.55).toInt().coerceIn(0, 255)
        views.setInt(R.id.focus_background_image, "setImageAlpha", bgAlphaInt)

        // Configure controls displaying timeframe & division modes
        val timeframe = prefs.getString("focus_timeframe_widget_$widgetId", "WEEK") ?: "WEEK"
        val timeframeText = when (timeframe) {
            "DAY" -> "HOY"
            "WEEK" -> "SEM"
            "MONTH" -> "MES"
            "8_WEEKS" -> "8S"
            "3_MONTHS" -> "3M"
            "YEAR" -> "AÑO"
            else -> "SEM"
        }
        views.setTextViewText(R.id.focus_widget_timeframe_text, timeframeText)

        val division = prefs.getString("focus_division_widget_$widgetId", "rasgo") ?: "rasgo"
        val divisionText = when (division) {
            "none" -> "SIN DIV"
            "rasgo" -> "RASGO"
            "proyecto" -> "PROY"
            else -> "RASGO"
        }
        views.setTextViewText(R.id.focus_widget_division_text, divisionText)

        // Setup PendingIntents for controls
        val timeframeIntent = Intent(context, FocusWidgetProvider::class.java).apply {
            action = ACTION_CYCLE_FOCUS_TIMEFRAME
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        }
        val timeframePending = PendingIntent.getBroadcast(
            context, widgetId * 100 + 1, timeframeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
        views.setOnClickPendingIntent(R.id.focus_widget_timeframe_btn, timeframePending)

        val divisionIntent = Intent(context, FocusWidgetProvider::class.java).apply {
            action = ACTION_CYCLE_FOCUS_DIVISION
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        }
        val divisionPending = PendingIntent.getBroadcast(
            context, widgetId * 100 + 2, divisionIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
        views.setOnClickPendingIntent(R.id.focus_widget_division_btn, divisionPending)

        // Draw and update asynchronously
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val projects = client.fetchProjects()
                val dailyFeed = client.fetchDailyFeed()

                // High-resolution bitmap drawing
                val density = context.resources.displayMetrics.density
                val widthPx = (320 * density).toInt()
                val heightPx = (160 * density).toInt()

                val chartBitmap = FocusChartDrawer.drawChart(
                    context, widthPx, heightPx, timeframe, division, projects, dailyFeed
                )

                withContext(Dispatchers.Main) {
                    views.setImageViewBitmap(R.id.focus_chart_image, chartBitmap)
                    appWidgetManager.updateAppWidget(widgetId, views)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error rendering focus chart for widget $widgetId: ${e.message}", e)
            }
        }
    }
}
