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
import kotlinx.coroutines.*
import java.text.SimpleDateFormat
import java.util.*

class JournalWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "JournalWidgetProvider"
        const val ACTION_PREV_MONTH = "com.luxresilient.app.PREV_MONTH"
        const val ACTION_NEXT_MONTH = "com.luxresilient.app.NEXT_MONTH"
        const val ACTION_REFRESH_JOURNAL = "com.luxresilient.app.REFRESH_JOURNAL"
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        Log.d(TAG, "onUpdate called for ${appWidgetIds.size} journal widgets")
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        Log.d(TAG, "onReceive intent: ${intent.action} for widgetId $widgetId")

        when (intent.action) {
            ACTION_REFRESH_JOURNAL -> {
                Log.d(TAG, "Refresh journal requested")
                refreshAllWidgets(context)
            }
            ACTION_PREV_MONTH -> {
                if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                    val prefs = context.getSharedPreferences("lux_widget_config", Context.MODE_PRIVATE)
                    val offset = prefs.getInt("journal_widget_offset_$widgetId", 0)
                    prefs.edit().putInt("journal_widget_offset_$widgetId", offset - 1).apply()
                    updateWidget(context, AppWidgetManager.getInstance(context), widgetId)
                }
            }
            ACTION_NEXT_MONTH -> {
                if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                    val prefs = context.getSharedPreferences("lux_widget_config", Context.MODE_PRIVATE)
                    val offset = prefs.getInt("journal_widget_offset_$widgetId", 0)
                    prefs.edit().putInt("journal_widget_offset_$widgetId", offset + 1).apply()
                    updateWidget(context, AppWidgetManager.getInstance(context), widgetId)
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
        val views = RemoteViews(context.packageName, R.layout.widget_journal_calendar)

        // Apply Overall Widget Background Opacity
        val bgAlphaInt = (bgOpacity * 2.55).toInt().coerceIn(0, 255)
        views.setInt(R.id.widget_background_image, "setImageAlpha", bgAlphaInt)

        // Get calendar instance for current month offset
        val offset = prefs.getInt("journal_widget_offset_$widgetId", 0)
        val calendar = Calendar.getInstance()
        calendar.add(Calendar.MONTH, offset)

        // Month text (e.g. "OCTUBRE 2026")
        val monthName = calendar.getDisplayName(Calendar.MONTH, Calendar.LONG, Locale("es", "ES"))?.uppercase() ?: ""
        val year = calendar.get(Calendar.YEAR)
        views.setTextViewText(R.id.widget_month_text, "$monthName $year")

        // Calculate days logic
        val firstDayCalendar = calendar.clone() as Calendar
        firstDayCalendar.set(Calendar.DAY_OF_MONTH, 1)
        
        // getDayOfWeek: 1 = Sunday, 2 = Monday, ...
        // We map column 0 = Sunday, 1 = Monday, ... 6 = Saturday
        val startOffset = firstDayCalendar.get(Calendar.DAY_OF_WEEK) - 1
        val maxDays = calendar.getActualMaximum(Calendar.DAY_OF_MONTH)

        // Setup Month switch Intents
        val prevIntent = Intent(context, JournalWidgetProvider::class.java).apply {
            action = ACTION_PREV_MONTH
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        }
        val prevPending = PendingIntent.getBroadcast(
            context, widgetId * 100 + 1, prevIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_prev_month, prevPending)

        val nextIntent = Intent(context, JournalWidgetProvider::class.java).apply {
            action = ACTION_NEXT_MONTH
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        }
        val nextPending = PendingIntent.getBroadcast(
            context, widgetId * 100 + 2, nextIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_next_month, nextPending)

        // Setup Settings button
        val configIntent = Intent(context, WidgetConfigActivity::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val configPending = PendingIntent.getActivity(
            context, widgetId * 100 + 3, configIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_settings_btn, configPending)

        // Load journal items asynchronously/synchronously from cache
        CoroutineScope(Dispatchers.IO).launch {
            val journalEntries = client.fetchJournal()
            val journalMap = journalEntries.associateBy { it.date }

            withContext(Dispatchers.Main) {
                val todayCal = Calendar.getInstance()
                val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(todayCal.time)

                // Fill 42 days grid cells
                for (i in 1..42) {
                    val dayNum = i - startOffset
                    
                    val cellId = context.resources.getIdentifier("cell_$i", "id", context.packageName)
                    val textId = context.resources.getIdentifier("day_text_$i", "id", context.packageName)
                    val emojiId = context.resources.getIdentifier("day_emoji_$i", "id", context.packageName)

                    if (dayNum in 1..maxDays) {
                        val cellCal = calendar.clone() as Calendar
                        cellCal.set(Calendar.DAY_OF_MONTH, dayNum)
                        val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cellCal.time)

                        views.setTextViewText(textId, dayNum.toString())

                        // Highlight cells (e.g. today vs other days)
                        val isToday = dateStr == todayStr
                        if (isToday) {
                            views.setInt(cellId, "setBackgroundResource", R.drawable.widget_subtask_checked) // distinct highlight style
                        } else {
                            views.setInt(cellId, "setBackgroundResource", R.drawable.widget_refresh_bg)
                        }

                        // Get mood emoji
                        val mood = journalMap[dateStr]?.mood
                        val emoji = when (mood) {
                            "rad" -> "🚀"
                            "good" -> "😊"
                            "meh" -> "😐"
                            "bad" -> "🌧️"
                            "awful" -> "⛈️"
                            else -> ""
                        }
                        views.setTextViewText(emojiId, emoji)
                        views.setViewVisibility(cellId, View.VISIBLE)

                        // Deep Link click to open specific day in app
                        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                            data = Uri.parse("luxapp://journal?date=$dateStr")
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                        }
                        if (launchIntent != null) {
                            val clickPending = PendingIntent.getActivity(
                                context, widgetId * 1000 + i, launchIntent,
                                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                            )
                            views.setOnClickPendingIntent(cellId, clickPending)
                        }
                    } else {
                        // Empty/unoccupied grid position
                        views.setViewVisibility(cellId, View.INVISIBLE)
                    }
                }
                appWidgetManager.updateAppWidget(widgetId, views)
            }
        }
    }

    private fun refreshAllWidgets(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val journalComponent = ComponentName(context, JournalWidgetProvider::class.java)
        val journalIds = appWidgetManager.getAppWidgetIds(journalComponent)
        for (widgetId in journalIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }
}
