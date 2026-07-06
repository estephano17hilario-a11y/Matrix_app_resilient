package com.luxresilient.app.widget

import android.util.Log
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.luxresilient.app.R

/**
 * Capacitor Plugin Bridge: Shares Supabase session from WebView to native widget.
 * Called from TypeScript when user logs in or session refreshes.
 */
@CapacitorPlugin(name = "WidgetAuthBridge")
class WidgetAuthBridge : Plugin() {

    companion object {
        private const val TAG = "WidgetAuthBridge"
        private const val PREFS_NAME = "lux_widget_auth"
    }

    /**
     * Called from TypeScript to share the Supabase session with the widget.
     * Stores userId and accessToken in SharedPreferences.
     */
    @PluginMethod
    fun shareSession(call: PluginCall) {
        val userId = call.getString("userId")
        val accessToken = call.getString("accessToken")
        val refreshToken = call.getString("refreshToken")

        if (userId == null || accessToken == null) {
            call.reject("userId and accessToken are required")
            return
        }

        try {
            val context = activity ?: context
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putString("user_id", userId)
                .putString("access_token", accessToken)
                .putString("refresh_token", refreshToken ?: "")
                .putLong("last_sync", System.currentTimeMillis())
                .apply()

            Log.d(TAG, "Session shared with widget for user: ${userId.take(8)}...")
            
            // Trigger widget refresh
            refreshWidgets(context)
            
            call.resolve()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to share session: ${e.message}", e)
            call.reject("Failed to share session: ${e.message}")
        }
    }

    /**
     * Clear the widget session (on logout)
     */
    @PluginMethod
    fun clearSession(call: PluginCall) {
        try {
            val context = activity ?: context
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().clear().apply()
            
            Log.d(TAG, "Widget session cleared")
            refreshWidgets(context)
            
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to clear session: ${e.message}")
        }
    }

    /**
     * Force refresh all habit widgets
     */
    @PluginMethod
    fun refreshWidgets(call: PluginCall) {
        try {
            val context = activity ?: context
            refreshWidgets(context)
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to refresh widgets: ${e.message}")
        }
    }

    /**
     * Send broadcast to refresh all habit widgets
     */
    private fun refreshWidgets(context: Context) {
        try {
            val intent = Intent(context, HabitWidgetProvider::class.java).apply {
                action = HabitWidgetProvider.ACTION_REFRESH
            }
            context.sendBroadcast(intent)

            // Also notify AppWidgetManager
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val widgetComponent = ComponentName(context, HabitWidgetProvider::class.java)
            val widgetIds = appWidgetManager.getAppWidgetIds(widgetComponent)
            if (widgetIds.isNotEmpty()) {
                appWidgetManager.notifyAppWidgetViewDataChanged(widgetIds, R.id.widget_habit_list)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error refreshing widgets: ${e.message}")
        }
    }
}
