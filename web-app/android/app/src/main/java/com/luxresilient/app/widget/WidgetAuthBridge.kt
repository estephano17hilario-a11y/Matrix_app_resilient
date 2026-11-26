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
                // Never store the refresh token: the widget redeeming it would rotate it and
                // invalidate the app's session. This also wipes any token saved by older versions.
                .putString("refresh_token", "")
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
     * Re-render the friend duel / shared-streak widgets (they fetch their own data)
     * and make sure the midnight refresh and nudge polling alarms are scheduled.
     */
    @PluginMethod
    fun refreshSocialWidgets(call: PluginCall) {
        try {
            val context = activity ?: context
            SocialAlarms.ensure(context)
            Thread { SocialAlarms.refreshWidgets(context) }.start()
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to refresh social widgets: ${e.message}")
        }
    }

    /**
     * The Routine screen's settings and journal reminder times live in the WebView (localStorage), which the
     * native widget cannot read. The app pushes them here so the widget draws the same routine.
     */
    @PluginMethod
    fun updateRoutineConfig(call: PluginCall) {
        try {
            val context = activity ?: context
            val editor = context.getSharedPreferences(RoutineWidgetData.PREFS_ROUTINE, Context.MODE_PRIVATE).edit()
            call.getObject("config")?.let { editor.putString(RoutineWidgetData.KEY_CONFIG, it.toString()) }
            call.getArray("journalTimes")?.let { editor.putString(RoutineWidgetData.KEY_JOURNAL_TIMES, it.toString()) }
            call.getArray("reminders")?.let { editor.putString(RoutineWidgetData.KEY_REMINDERS, it.toString()) }
            editor.apply()
            Thread { RoutineWidgetProvider.refreshAll(context) }.start()
            call.resolve()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update routine config: ${e.message}", e)
            call.reject("Failed to update routine config: ${e.message}")
        }
    }

    /**
     * Whether the signed-in account is Deluxe (PRO). Routine / Calendar / Journal-calendar widgets draw a locked
     * card for free accounts (see [ProGate]); when the value changes they are redrawn right away.
     */
    @PluginMethod
    fun updateProStatus(call: PluginCall) {
        val isPro = call.getBoolean("isPro")
        if (isPro == null) {
            call.reject("isPro is required")
            return
        }
        try {
            val context = activity ?: context
            if (ProGate.setPro(context, isPro)) {
                // Routine redraw also redraws the Calendar widgets; Journal has its own provider.
                Thread { RoutineWidgetProvider.refreshAll(context) }.start()
                context.sendBroadcast(Intent(context, JournalWidgetProvider::class.java).apply {
                    action = JournalWidgetProvider.ACTION_REFRESH_JOURNAL
                })
                context.sendBroadcast(Intent(context, HabitWidgetProvider::class.java).apply {
                    action = HabitWidgetProvider.ACTION_REFRESH
                })
            }
            call.resolve()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update pro status: ${e.message}", e)
            call.reject("Failed to update pro status: ${e.message}")
        }
    }

    /**
     * Update the productivity score and refresh score widgets
     */
    @PluginMethod
    fun updateScore(call: PluginCall) {
        val score = call.getInt("score")
        if (score == null) {
            call.reject("score is required")
            return
        }

        try {
            val context = activity ?: context
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            // NEVER write typed values into "CapacitorStorage": the Capacitor Preferences plugin reads
            // every entry with getString(), so a Float/Int there crashes the whole app at startup.
            prefs.edit().putInt("productivity_score", score).apply()
            
            Log.d(TAG, "Score updated in widget shared preferences: $score")
            
            // Broadcast refresh to ScoreWidgetProvider
            val intent = Intent(context, ScoreWidgetProvider::class.java).apply {
                action = ScoreWidgetProvider.ACTION_REFRESH_SCORE
            }
            context.sendBroadcast(intent)

            val appWidgetManager = AppWidgetManager.getInstance(context)
            val scoreComponent = ComponentName(context, ScoreWidgetProvider::class.java)
            val scoreWidgetIds = appWidgetManager.getAppWidgetIds(scoreComponent)
            if (scoreWidgetIds.isNotEmpty()) {
                val updateIntent = Intent(context, ScoreWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, scoreWidgetIds)
                }
                context.sendBroadcast(updateIntent)
            }
            
            call.resolve()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update score: ${e.message}", e)
            call.reject("Failed to update score: ${e.message}")
        }
    }

    /**
     * Update live rivals metrics for the rivals widget
     */
    @PluginMethod
    fun updateRivalsData(call: PluginCall) {
        val rivalName = call.getString("rivalName") ?: "Francesco Cirillo"
        val rivalAvatar = call.getString("rivalAvatar") ?: "⌛"
        val rivalLevel = call.getInt("rivalLevel") ?: 1
        val rivalActivity = call.getString("rivalActivity") ?: "🔴 En Enfoque Profundo"

        val rivalTasks = call.getInt("rivalTasks") ?: 0
        val userTasks = call.getInt("userTasks") ?: 0
        val targetTasks = call.getInt("targetTasks") ?: 1

        val rivalFocus = (call.getDouble("rivalFocus") ?: 0.0).toFloat()
        val userFocus = (call.getDouble("userFocus") ?: 0.0).toFloat()
        val targetFocus = (call.getDouble("targetFocus") ?: 1.0).toFloat()

        val rivalHabits = call.getInt("rivalHabits") ?: 0
        val userHabits = call.getInt("userHabits") ?: 0
        val targetHabits = call.getInt("targetHabits") ?: 25

        val isVictory = call.getBoolean("isVictory") ?: false

        try {
            val context = activity ?: context
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            // Only lux_widget_auth: typed values in "CapacitorStorage" crash Capacitor's Preferences plugin.
            val editor = prefs.edit()
                .putString("rival_name", rivalName)
                .putString("rival_avatar", rivalAvatar)
                .putInt("rival_level", rivalLevel)
                .putString("rival_activity", rivalActivity)
                .putInt("rival_tasks", rivalTasks)
                .putInt("user_tasks", userTasks)
                .putInt("target_tasks", targetTasks)
                .putFloat("rival_focus", rivalFocus)
                .putFloat("user_focus", userFocus)
                .putFloat("target_focus", targetFocus)
                .putInt("rival_habits", rivalHabits)
                .putInt("user_habits", userHabits)
                .putInt("target_habits", targetHabits)
                .putBoolean("is_victory", isVictory)
            editor.apply()

            Log.d(TAG, "Rivals data updated: $rivalName (User T:$userTasks F:${userFocus}h H:$userHabits% vs Rival T:$rivalTasks F:${rivalFocus}h H:$rivalHabits%)")

            // Broadcast refresh action
            val intent = Intent(context, RivalsWidgetProvider::class.java).apply {
                action = RivalsWidgetProvider.ACTION_REFRESH_RIVALS
            }
            context.sendBroadcast(intent)

            // Also force AppWidgetManager update (same as Score widget)
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val rivalsComponent = ComponentName(context, RivalsWidgetProvider::class.java)
            val rivalsWidgetIds = appWidgetManager.getAppWidgetIds(rivalsComponent)
            if (rivalsWidgetIds.isNotEmpty()) {
                val updateIntent = Intent(context, RivalsWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, rivalsWidgetIds)
                }
                context.sendBroadcast(updateIntent)
            }

            call.resolve()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update rivals data: ${e.message}", e)
            call.reject("Failed to update rivals data: ${e.message}")
        }
    }

    override fun handleOnResume() {
        super.handleOnResume()
        Log.d(TAG, "Capacitor activity resumed - refreshing widgets")
        refreshWidgets(context)
    }

    override fun handleOnPause() {
        super.handleOnPause()
        Log.d(TAG, "Capacitor activity paused - refreshing widgets")
        refreshWidgets(context)
    }

    /**
     * Send broadcast to refresh all habit, score and rivals widgets
     */
    private fun refreshWidgets(context: Context) {
        try {
            val intent = Intent(context, HabitWidgetProvider::class.java).apply {
                action = HabitWidgetProvider.ACTION_REFRESH
            }
            context.sendBroadcast(intent)

            // Also broadcast to ScoreWidgetProvider
            val scoreIntent = Intent(context, ScoreWidgetProvider::class.java).apply {
                action = ScoreWidgetProvider.ACTION_REFRESH_SCORE
            }
            context.sendBroadcast(scoreIntent)

            // Also broadcast to RivalsWidgetProvider
            val rivalsIntent = Intent(context, RivalsWidgetProvider::class.java).apply {
                action = RivalsWidgetProvider.ACTION_REFRESH_RIVALS
            }
            context.sendBroadcast(rivalsIntent)

            // Also notify AppWidgetManager for Habit list widgets
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val widgetComponent = ComponentName(context, HabitWidgetProvider::class.java)
            val widgetIds = appWidgetManager.getAppWidgetIds(widgetComponent)
            if (widgetIds.isNotEmpty()) {
                appWidgetManager.notifyAppWidgetViewDataChanged(widgetIds, R.id.widget_habit_list)
            }

            // Also notify AppWidgetManager for Score widgets
            val scoreComponent = ComponentName(context, ScoreWidgetProvider::class.java)
            val scoreWidgetIds = appWidgetManager.getAppWidgetIds(scoreComponent)
            if (scoreWidgetIds.isNotEmpty()) {
                val updateIntent = Intent(context, ScoreWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, scoreWidgetIds)
                }
                context.sendBroadcast(updateIntent)
            }

            // Routine widgets read the app's cached data themselves: redraw them off the main thread.
            Thread { RoutineWidgetProvider.refreshAll(context) }.start()

            // Also notify AppWidgetManager for Rivals widgets (CRITICAL: was missing!)
            val rivalsComponent = ComponentName(context, RivalsWidgetProvider::class.java)
            val rivalsWidgetIds = appWidgetManager.getAppWidgetIds(rivalsComponent)
            if (rivalsWidgetIds.isNotEmpty()) {
                val rivalsUpdateIntent = Intent(context, RivalsWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, rivalsWidgetIds)
                }
                context.sendBroadcast(rivalsUpdateIntent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error refreshing widgets: ${e.message}", e)
        }
    }
}
