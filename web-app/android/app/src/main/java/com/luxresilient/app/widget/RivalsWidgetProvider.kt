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

class RivalsWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "RivalsWidgetProvider"
        const val ACTION_REFRESH_RIVALS = "com.luxresilient.app.REFRESH_RIVALS_WIDGET"
        private const val PREFS_NAME = "lux_widget_auth"
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

        val rivalName = prefs.getString("rival_name", null) ?: capPrefs.getString("rival_name", "Francesco Cirillo")
        val rivalAvatar = prefs.getString("rival_avatar", null) ?: capPrefs.getString("rival_avatar", "⌛")
        val rivalLevel = prefs.getInt("rival_level", 1)
        val rivalActivity = prefs.getString("rival_activity", null) ?: capPrefs.getString("rival_activity", "🔴 En Enfoque Profundo")

        val userTasks = prefs.getInt("user_tasks", 0)
        val targetTasks = prefs.getInt("target_tasks", 1)

        val userFocus = prefs.getFloat("user_focus", 0.0f)
        val targetFocus = prefs.getFloat("target_focus", 1.0f)

        val userHabits = prefs.getInt("user_habits", 0)
        val targetHabits = prefs.getInt("target_habits", 25)

        val isVictory = prefs.getBoolean("is_victory", false)

        val views = RemoteViews(context.packageName, R.layout.widget_rivals)

        // Populate Header Data
        views.setTextViewText(R.id.rival_avatar_text, rivalAvatar)
        views.setTextViewText(R.id.rival_name_text, rivalName)
        views.setTextViewText(R.id.rival_level_badge, "Lvl $rivalLevel")
        views.setTextViewText(R.id.rival_activity_text, rivalActivity)

        // Populate Live Stats Data
        views.setTextViewText(R.id.rivals_tasks_val, "$userTasks / $targetTasks")
        views.setTextViewText(R.id.rivals_focus_val, "${String.format("%.1f", userFocus)}h / ${String.format("%.1f", targetFocus)}h")
        views.setTextViewText(R.id.rivals_habits_val, "$userHabits% / $targetHabits%")

        // Set Victory / In-Progress Status Banner
        if (isVictory) {
            views.setTextViewText(R.id.rivals_status_banner, "🏆 ¡VICTORIA CONSEGUIDA!")
            views.setTextColor(R.id.rivals_status_banner, 0xFF34D399.toInt()) // Emerald
        } else {
            views.setTextViewText(R.id.rivals_status_banner, "⚔️ DUELO EN CURSO")
            views.setTextColor(R.id.rivals_status_banner, 0xFFF59E0B.toInt()) // Amber
        }

        // Handle Resizing / Responsiveness (1x1 vs 2x2+)
        val options = appWidgetManager.getAppWidgetOptions(widgetId)
        val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
        val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT)

        if (minWidth > 0 && minHeight > 0 && minWidth < 100) {
            // Compact 1x1 mode: hide detailed stats row
            views.setViewVisibility(R.id.rivals_stats_row, View.GONE)
            views.setViewVisibility(R.id.rivals_status_banner, View.GONE)
        } else {
            // Full 2x2 / 3x3 mode: show full stats comparison
            views.setViewVisibility(R.id.rivals_stats_row, View.VISIBLE)
            views.setViewVisibility(R.id.rivals_status_banner, View.VISIBLE)
        }

        // Set Launch Intent on Click
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        if (launchIntent != null) {
            val pendingIntent = PendingIntent.getActivity(
                context, widgetId + 9000, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.rivals_widget_root, pendingIntent)
        }

        appWidgetManager.updateAppWidget(widgetId, views)
    }
}
