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
import android.view.View
import android.widget.RemoteViews
import com.luxresilient.app.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Main Widget Provider for Lux Task (Quests) Widgets.
 */
class TaskWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "TaskWidgetProvider"
        const val ACTION_COMPLETE_TASK = "com.luxresilient.app.COMPLETE_TASK"
        const val ACTION_REFRESH_TASKS = "com.luxresilient.app.REFRESH_TASKS"
        const val ACTION_CYCLE_TIMEFRAME = "com.luxresilient.app.CYCLE_TIMEFRAME"
        const val ACTION_TOGGLE_COMPLETED = "com.luxresilient.app.TOGGLE_COMPLETED"
        const val EXTRA_TASK_ID = "task_id"
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        Log.d(TAG, "onUpdate called for ${appWidgetIds.size} task widgets")
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        when (intent.action) {
            ACTION_REFRESH_TASKS -> {
                Log.d(TAG, "Refresh tasks requested")
                refreshAllWidgets(context, true)
            }
            ACTION_COMPLETE_TASK -> {
                val taskId = intent.getStringExtra(EXTRA_TASK_ID) ?: return
                Log.d(TAG, "Complete task: $taskId")
                handleCompleteTask(context, taskId)
            }
            ACTION_CYCLE_TIMEFRAME -> {
                val widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
                if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                    val prefs = context.getSharedPreferences("lux_widget_config", Context.MODE_PRIVATE)
                    val current = prefs.getString("task_timeframe_widget_$widgetId", "ALL") ?: "ALL"
                    val next = when (current) {
                        "ALL" -> "DAY"
                        "DAY" -> "WEEK"
                        "WEEK" -> "MONTH"
                        "MONTH" -> "8_WEEKS"
                        "8_WEEKS" -> "3_MONTHS"
                        "3_MONTHS" -> "YEAR"
                        else -> "ALL"
                    }
                    prefs.edit().putString("task_timeframe_widget_$widgetId", next).apply()
                    Log.d(TAG, "Cycled widget $widgetId timeframe to $next")
                    
                    val appWidgetManager = AppWidgetManager.getInstance(context)
                    updateWidget(context, appWidgetManager, widgetId)
                    appWidgetManager.notifyAppWidgetViewDataChanged(widgetId, R.id.task_list)
                }
            }
            ACTION_TOGGLE_COMPLETED -> {
                val widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
                if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                    val prefs = context.getSharedPreferences("lux_widget_config", Context.MODE_PRIVATE)
                    val current = prefs.getBoolean("task_hide_completed_widget_$widgetId", true)
                    prefs.edit().putBoolean("task_hide_completed_widget_$widgetId", !current).apply()
                    Log.d(TAG, "Toggled widget $widgetId hideCompleted to ${!current}")
                    
                    val appWidgetManager = AppWidgetManager.getInstance(context)
                    updateWidget(context, appWidgetManager, widgetId)
                    appWidgetManager.notifyAppWidgetViewDataChanged(widgetId, R.id.task_list)
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
        val views = RemoteViews(context.packageName, R.layout.widget_task_list)

        // Apply Overall Widget Background Opacity
        val bgAlphaInt = (bgOpacity * 2.55).toInt().coerceIn(0, 255)
        views.setInt(R.id.task_background_image, "setImageAlpha", bgAlphaInt)

        // Get and display active timeframe
        val timeframe = prefs.getString("task_timeframe_widget_$widgetId", "ALL") ?: "ALL"
        val timeframeText = when (timeframe) {
            "ALL" -> "TODO"
            "DAY" -> "HOY"
            "WEEK" -> "SEM"
            "MONTH" -> "MES"
            "8_WEEKS" -> "8S"
            "3_MONTHS" -> "3M"
            "YEAR" -> "AÑO"
            else -> "TODO"
        }
        views.setTextViewText(R.id.task_widget_timeframe_text, timeframeText)

        // Get and display Completed visibility state
        val hideCompleted = prefs.getBoolean("task_hide_completed_widget_$widgetId", true)
        views.setInt(R.id.task_widget_completed_text, "setAlpha", if (hideCompleted) 120 else 255)

        // Set up the intent that starts the TaskWidgetService
        val intent = Intent(context, TaskWidgetService::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
        }

        views.setRemoteAdapter(R.id.task_list, intent)
        views.setEmptyView(R.id.task_list, R.id.task_empty_text)

        // Set up list item click templates
        val clickIntentTemplate = Intent(context, TaskWidgetProvider::class.java)
        val clickPendingIntentTemplate = PendingIntent.getBroadcast(
            context, 0, clickIntentTemplate,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
        views.setPendingIntentTemplate(R.id.task_list, clickPendingIntentTemplate)

        // Timeframe click pending intent
        val timeframeIntent = Intent(context, TaskWidgetProvider::class.java).apply {
            action = ACTION_CYCLE_TIMEFRAME
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        }
        val timeframePending = PendingIntent.getBroadcast(
            context, widgetId * 10 + 2, timeframeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
        views.setOnClickPendingIntent(R.id.task_widget_timeframe_btn, timeframePending)

        // Completed click pending intent
        val completedIntent = Intent(context, TaskWidgetProvider::class.java).apply {
            action = ACTION_TOGGLE_COMPLETED
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        }
        val completedPending = PendingIntent.getBroadcast(
            context, widgetId * 10 + 3, completedIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
        views.setOnClickPendingIntent(R.id.task_widget_completed_btn, completedPending)

        // Add Quest button
        val addIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
            data = Uri.parse("luxapp://tasks") // Opens tasks in app
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        if (addIntent != null) {
            val addPendingIntent = PendingIntent.getActivity(
                context, 1, addIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.btn_add_quest, addPendingIntent)
        }

        appWidgetManager.updateAppWidget(widgetId, views)
    }

    private fun handleCompleteTask(context: Context, taskId: String) {
        val client = SupabaseWidgetClient(context)
        val prefs = context.getSharedPreferences("lux_widget_config", Context.MODE_PRIVATE)
        val soundEnabled = prefs.getBoolean("sound_effects", true)

        CoroutineScope(Dispatchers.IO).launch {
            val success = client.completeTask(taskId)
            if (success) {
                if (soundEnabled) WidgetSoundPlayer.playCompleteSound()
                refreshAllWidgets(context, false)
            } else {
                Log.e(TAG, "Failed to complete task: $taskId")
            }
        }
    }

    private fun refreshAllWidgets(context: Context, forceFetch: Boolean) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val taskComponent = ComponentName(context, TaskWidgetProvider::class.java)
        val taskIds = appWidgetManager.getAppWidgetIds(taskComponent)

        if (forceFetch) {
            CoroutineScope(Dispatchers.IO).launch {
                val client = SupabaseWidgetClient(context)
                client.fetchTasks(true) // Force fetch including completed so we have all data cached
                appWidgetManager.notifyAppWidgetViewDataChanged(taskIds, R.id.task_list)
            }
        } else {
            appWidgetManager.notifyAppWidgetViewDataChanged(taskIds, R.id.task_list)
        }
    }
}
