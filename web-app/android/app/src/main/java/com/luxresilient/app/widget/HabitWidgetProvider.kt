package com.luxresilient.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.util.Log
import android.widget.RemoteViews
import com.luxresilient.app.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Main Widget Provider for Lux Habit Widgets.
 * Handles widget lifecycle and user interactions (complete, toggle subtask, etc.)
 */
class HabitWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "HabitWidgetProvider"
        const val ACTION_COMPLETE_HABIT = "com.luxresilient.app.COMPLETE_HABIT"
        const val ACTION_TOGGLE_SUBTASK = "com.luxresilient.app.TOGGLE_SUBTASK"
        const val ACTION_INCREMENT_QUANTITY = "com.luxresilient.app.INCREMENT_QUANTITY"
        const val ACTION_REFRESH = "com.luxresilient.app.REFRESH_WIDGET"
        const val EXTRA_HABIT_ID = "habit_id"
        const val EXTRA_SUBTASK_ID = "subtask_id"
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        Log.d(TAG, "onUpdate called for ${appWidgetIds.size} widgets")
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        when (intent.action) {
            ACTION_REFRESH -> {
                Log.d(TAG, "Refresh requested")
                refreshAllWidgets(context)
            }
            ACTION_COMPLETE_HABIT -> {
                val habitId = intent.getStringExtra(EXTRA_HABIT_ID) ?: return
                Log.d(TAG, "Complete habit: $habitId")
                handleCompleteHabit(context, habitId)
            }
            ACTION_TOGGLE_SUBTASK -> {
                val habitId = intent.getStringExtra(EXTRA_HABIT_ID) ?: return
                val subtaskId = intent.getStringExtra(EXTRA_SUBTASK_ID) ?: return
                Log.d(TAG, "Toggle subtask: $habitId / $subtaskId")
                handleToggleSubtask(context, habitId, subtaskId)
            }
            ACTION_INCREMENT_QUANTITY -> {
                val habitId = intent.getStringExtra(EXTRA_HABIT_ID) ?: return
                Log.d(TAG, "Increment quantity: $habitId")
                handleIncrementQuantity(context, habitId)
            }
        }
    }

    /**
     * Build and update a single widget
     */
    private fun updateWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        widgetId: Int
    ) {
        val client = SupabaseWidgetClient(context)
        
        if (!client.isAuthenticated()) {
            // Show login required view
            val views = RemoteViews(context.packageName, R.layout.widget_login_required)
            
            // Open app on click
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

        // Build the main widget view
        val views = RemoteViews(context.packageName, R.layout.widget_habit_list)

        // Setup RemoteViewsService for ListView
        val serviceIntent = Intent(context, HabitWidgetService::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
        }
        views.setRemoteAdapter(R.id.widget_habit_list, serviceIntent)
        views.setEmptyView(R.id.widget_habit_list, R.id.widget_empty_text)

        // Setup refresh button
        val refreshIntent = Intent(context, HabitWidgetProvider::class.java).apply {
            action = ACTION_REFRESH
        }
        val refreshPending = PendingIntent.getBroadcast(
            context, 0, refreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_refresh_btn, refreshPending)

        // Setup click template for list items (complete habit action)
        val completeTemplate = Intent(context, HabitWidgetProvider::class.java).apply {
            action = ACTION_COMPLETE_HABIT
        }
        val completePending = PendingIntent.getBroadcast(
            context, 1, completeTemplate,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
        views.setPendingIntentTemplate(R.id.widget_habit_list, completePending)

        // Open app when clicking on header
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        if (launchIntent != null) {
            val launchPending = PendingIntent.getActivity(
                context, 2, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_header_left, launchPending)
        }

        appWidgetManager.updateAppWidget(widgetId, views)
    }

    /**
     * Handle habit completion from widget click
     */
    private fun handleCompleteHabit(context: Context, habitId: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val client = SupabaseWidgetClient(context)
                val habits = client.fetchHabits()
                val habit = habits.find { it.id == habitId }

                if (habit != null) {
                    when (habit.type) {
                        "SIMPLE", "BOOLEAN" -> {
                            val success = client.completeHabit(habit)
                            if (success) {
                                Log.d(TAG, "Habit completed successfully: $habitId")
                                refreshAllWidgets(context)
                            }
                        }
                        "QUANTITY" -> {
                            val amount = habit.dividedQuantity ?: 1
                            val success = client.incrementQuantity(habit, amount)
                            if (success) {
                                Log.d(TAG, "Quantity incremented: $habitId +$amount")
                                refreshAllWidgets(context)
                            }
                        }
                        "CHECKLIST" -> {
                            // For checklist, the fill intent will direct to subtask toggles
                            // If user taps the main button, open the app
                            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                            if (launchIntent != null) {
                                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                context.startActivity(launchIntent)
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error handling habit completion: ${e.message}", e)
            }
        }
    }

    /**
     * Handle subtask toggle from widget
     */
    private fun handleToggleSubtask(context: Context, habitId: String, subtaskId: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val client = SupabaseWidgetClient(context)
                val habits = client.fetchHabits()
                val habit = habits.find { it.id == habitId }

                if (habit != null) {
                    val success = client.toggleSubtask(habit, subtaskId)
                    if (success) {
                        Log.d(TAG, "Subtask toggled: $habitId / $subtaskId")
                        refreshAllWidgets(context)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error toggling subtask: ${e.message}", e)
            }
        }
    }

    /**
     * Handle quantity increment from widget
     */
    private fun handleIncrementQuantity(context: Context, habitId: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val client = SupabaseWidgetClient(context)
                val habits = client.fetchHabits()
                val habit = habits.find { it.id == habitId }

                if (habit != null) {
                    val amount = habit.dividedQuantity ?: 1
                    val success = client.incrementQuantity(habit, amount)
                    if (success) {
                        Log.d(TAG, "Quantity incremented: $habitId +$amount")
                        refreshAllWidgets(context)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error incrementing quantity: ${e.message}", e)
            }
        }
    }

    private fun refreshAllWidgets(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val widgetComponent = ComponentName(context, HabitWidgetProvider::class.java)
        val widgetIds = appWidgetManager.getAppWidgetIds(widgetComponent)

        // Trigger a full update to ensure correct layout (list vs login) is bound
        for (widgetId in widgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }

        // Notify data changed for ListView to force data refresh
        appWidgetManager.notifyAppWidgetViewDataChanged(widgetIds, R.id.widget_habit_list)
    }

    override fun onEnabled(context: Context) {
        Log.d(TAG, "Widget enabled")
    }

    override fun onDisabled(context: Context) {
        Log.d(TAG, "Widget disabled")
    }
}
