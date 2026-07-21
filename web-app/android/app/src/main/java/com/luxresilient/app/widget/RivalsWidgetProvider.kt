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
        val rivalLevel = try { prefs.getInt("rival_level", 1) } catch (e: Exception) { 1 }
        val rivalActivity = prefs.getString("rival_activity", null) ?: capPrefs.getString("rival_activity", "🔴 En Enfoque Profundo")

        val rivalTasks = try { prefs.getInt("rival_tasks", 0) } catch (e: Exception) { 0 }
        val userTasks = try { prefs.getInt("user_tasks", 0) } catch (e: Exception) { 0 }
        val targetTasks = try { prefs.getInt("target_tasks", 1) } catch (e: Exception) { 1 }

        val rivalFocus = try { prefs.getFloat("rival_focus", 0.0f) } catch (e: Exception) { 0.0f }
        val userFocus = try { prefs.getFloat("user_focus", 0.0f) } catch (e: Exception) { 0.0f }
        val targetFocus = try { prefs.getFloat("target_focus", 1.0f) } catch (e: Exception) { 1.0f }

        val rivalHabits = try { prefs.getInt("rival_habits", 0) } catch (e: Exception) { 0 }
        val userHabits = try { prefs.getInt("user_habits", 0) } catch (e: Exception) { 0 }
        val targetHabits = try { prefs.getInt("target_habits", 25) } catch (e: Exception) { 25 }

        val isVictory = try { prefs.getBoolean("is_victory", false) } catch (e: Exception) { false }

        val views = RemoteViews(context.packageName, R.layout.widget_rivals)

        // Calculate who is leading live duel
        val isUserAhead = userTasks >= rivalTasks && userFocus >= rivalFocus && userHabits >= rivalHabits
        val isRivalAhead = rivalTasks > userTasks && rivalFocus > userFocus

        val statusText = when {
            isVictory -> "🏆 ¡VICTORIA CONSEGUIDA!"
            isUserAhead -> "🏆 ¡GANANDO DUELO!"
            isRivalAhead -> "⚡ RIVAL TOMANDO VENTAJA"
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

        views.setTextViewText(R.id.rivals_tasks_val, "$userTasks v $rivalTasks")
        views.setTextViewText(R.id.rivals_focus_val, "${String.format("%.1f", userFocus)}h v ${String.format("%.1f", rivalFocus)}h")
        views.setTextViewText(R.id.rivals_habits_val, "$userHabits% v $rivalHabits%")

        views.setTextViewText(R.id.rivals_status_banner, statusText)
        views.setTextColor(R.id.rivals_status_banner, statusColor)

        // 2. Populate Horizontal Layout (2x1)
        views.setTextViewText(R.id.rival_avatar_horiz, rivalAvatar)
        views.setTextViewText(R.id.rival_name_horiz, rivalName)
        views.setTextViewText(R.id.rival_activity_horiz, rivalActivity)
        views.setTextViewText(R.id.rivals_stats_horiz, "T: $userTasks v $rivalTasks | F: ${String.format("%.1f", userFocus)}h v ${String.format("%.1f", rivalFocus)}h")
        views.setTextViewText(R.id.rivals_status_horiz, statusText)
        views.setTextColor(R.id.rivals_status_horiz, statusColor)

        // 3. Populate Compact Layout (1x1)
        views.setTextViewText(R.id.rival_avatar_1x1, rivalAvatar)
        views.setTextViewText(R.id.rival_name_1x1, rivalName)
        views.setTextViewText(R.id.rivals_stats_1x1, "T: $userTasks v $rivalTasks")
        views.setTextViewText(R.id.rivals_status_1x1, statusText)
        views.setTextColor(R.id.rivals_status_1x1, statusColor)

        // Handle Resizing / Responsiveness
        val options = appWidgetManager.getAppWidgetOptions(widgetId)
        val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
        val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT)

        if (minWidth > 0 && minHeight > 0) {
            if (minWidth < 110 && minHeight < 110) {
                // Compact 1x1 mode
                views.setViewVisibility(R.id.rivals_layout_1x1, View.VISIBLE)
                views.setViewVisibility(R.id.rivals_layout_horizontal, View.GONE)
                views.setViewVisibility(R.id.rivals_layout_full, View.GONE)
            } else if (minWidth >= 110 && minHeight < 110) {
                // 2x1 landscape mode
                views.setViewVisibility(R.id.rivals_layout_1x1, View.GONE)
                views.setViewVisibility(R.id.rivals_layout_horizontal, View.VISIBLE)
                views.setViewVisibility(R.id.rivals_layout_full, View.GONE)
            } else {
                // 2x2+ grid mode
                views.setViewVisibility(R.id.rivals_layout_1x1, View.GONE)
                views.setViewVisibility(R.id.rivals_layout_horizontal, View.GONE)
                views.setViewVisibility(R.id.rivals_layout_full, View.VISIBLE)
            }
        } else {
            // Default 2x2+ mode
            views.setViewVisibility(R.id.rivals_layout_1x1, View.GONE)
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
}
