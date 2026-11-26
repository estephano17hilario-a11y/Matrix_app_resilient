package com.luxresilient.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import com.luxresilient.app.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * Calendar of a shared streak with one friend (reuses the journal calendar layout):
 * 🔥 both activated their HUD streak, ½ only one of you, blank nobody.
 */
class FriendStreakWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_REFRESH = "com.luxresilient.app.REFRESH_STREAK_WIDGET"
        private const val ACTION_PREV = "com.luxresilient.app.STREAK_PREV_MONTH"
        private const val ACTION_NEXT = "com.luxresilient.app.STREAK_NEXT_MONTH"
        fun friendKey(widgetId: Int) = "streak_friend_$widgetId"
        private fun offsetKey(widgetId: Int) = "streak_offset_$widgetId"

        fun refreshAll(context: Context) {
            val mgr = AppWidgetManager.getInstance(context)
            for (id in mgr.getAppWidgetIds(ComponentName(context, FriendStreakWidgetProvider::class.java))) update(context, mgr, id)
        }

        fun update(context: Context, mgr: AppWidgetManager, widgetId: Int) {
            val prefs = context.getSharedPreferences(DuelWidgetProvider.PREFS, Context.MODE_PRIVATE)
            val friendId = prefs.getString(friendKey(widgetId), null)
            val offset = prefs.getInt(offsetKey(widgetId), 0)
            val views = RemoteViews(context.packageName, R.layout.widget_journal_calendar)
            WidgetTheme.apply(context, views, R.id.widget_background_image, mgr, widgetId, FriendStreakWidgetProvider::class.java.name, android.graphics.Color.parseColor("#F97316"), 250, 250, WidgetTheme.Style.EMBER)

            fun broadcast(action: String, code: Int) = PendingIntent.getBroadcast(
                context, widgetId * 100 + code,
                Intent(context, FriendStreakWidgetProvider::class.java).setAction(action).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.btn_prev_month, broadcast(ACTION_PREV, 1))
            views.setOnClickPendingIntent(R.id.btn_next_month, broadcast(ACTION_NEXT, 2))
            val pick = Intent(context, FriendPickerActivity::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                putExtra(FriendPickerActivity.EXTRA_KIND, FriendPickerActivity.KIND_STREAK)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            views.setOnClickPendingIntent(R.id.widget_settings_btn, PendingIntent.getActivity(context, widgetId * 100 + 3, pick, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))

            val cal = Calendar.getInstance().apply { add(Calendar.MONTH, offset); set(Calendar.DAY_OF_MONTH, 1) }
            val monthName = cal.getDisplayName(Calendar.MONTH, Calendar.LONG, Locale("es", "ES"))?.uppercase() ?: ""
            val startOffset = cal.get(Calendar.DAY_OF_WEEK) - 1
            val maxDays = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
            val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)

            val open = Intent(Intent.ACTION_VIEW, Uri.parse("luxapp://friends")).setPackage(context.packageName)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            val openPending = PendingIntent.getActivity(context, widgetId * 100 + 4, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

            fun render(title: String, data: SocialWidgetData.StreakData?) {
                views.setTextViewText(R.id.widget_month_text, title)
                val today = SocialWidgetData.today()
                for (i in 1..42) {
                    val dayNum = i - startOffset
                    val cellId = context.resources.getIdentifier("cell_$i", "id", context.packageName)
                    val textId = context.resources.getIdentifier("day_text_$i", "id", context.packageName)
                    val emojiId = context.resources.getIdentifier("day_emoji_$i", "id", context.packageName)
                    if (dayNum !in 1..maxDays) { views.setViewVisibility(cellId, View.INVISIBLE); continue }
                    val c = cal.clone() as Calendar
                    c.set(Calendar.DAY_OF_MONTH, dayNum)
                    val key = fmt.format(c.time)
                    views.setViewVisibility(cellId, View.VISIBLE)
                    views.setTextViewText(textId, dayNum.toString())
                    val inStreak = data?.startedOn != null && key >= data.startedOn && key <= today
                    val m = data?.mine?.contains(key) == true
                    val f = data?.theirs?.contains(key) == true
                    views.setTextViewText(emojiId, if (!inStreak) "" else if (m && f) "🔥" else if (m || f) "½" else "·")
                    views.setInt(cellId, "setBackgroundResource", if (key == today) R.drawable.widget_day_today else R.drawable.widget_day_cell)
                    views.setOnClickPendingIntent(cellId, openPending)
                }
                mgr.updateAppWidget(widgetId, views)
            }

            if (!SupabaseWidgetClient(context).isAuthenticated()) { render("ABRE LUX", null); return }
            if (friendId == null) { render("⚙ ELIGE UN AMIGO", null); return }

            // Last good data first (never a misleading empty calendar), then refresh from the server.
            val cacheKey = "streak_cache_$widgetId"
            fun encode(d: SocialWidgetData.StreakData) = org.json.JSONObject()
                .put("name", d.friend?.name ?: "").put("rank", d.friend?.rankIndex ?: 0).put("elo", d.friend?.elo ?: 0)
                .put("started", d.startedOn ?: "").put("current", d.current)
                .put("mine", org.json.JSONArray(d.mine.toList())).put("theirs", org.json.JSONArray(d.theirs.toList())).toString()
            fun decode(raw: String): SocialWidgetData.StreakData? = try {
                val o = org.json.JSONObject(raw)
                fun set(k: String) = (0 until o.getJSONArray(k).length()).map { o.getJSONArray(k).getString(it) }.toSet()
                SocialWidgetData.StreakData(
                    SocialWidgetData.Friend(friendId, o.getString("name"), o.getInt("rank"), o.getInt("elo")),
                    o.getString("started").ifEmpty { null }, set("mine"), set("theirs"), o.getInt("current")
                )
            } catch (_: Exception) { null }
            fun header(data: SocialWidgetData.StreakData?, stale: Boolean): String {
                val name = data?.friend?.name?.ifEmpty { null } ?: "AMIGO"
                val tail = if (stale) " · SIN CONEXIÓN" else ""
                return if (data?.startedOn == null) "SIN RACHA CON ${name.uppercase()}$tail" else "🔥 ${data.current} · ${name.uppercase()} · $monthName$tail"
            }

            val cached = prefs.getString(cacheKey, null)?.let { decode(it) }
            render(if (cached != null) header(cached, false) else "$monthName ${cal.get(Calendar.YEAR)}", cached)

            CoroutineScope(Dispatchers.IO).launch {
                val data = try { SocialWidgetData.streakData(context, friendId) } catch (_: Exception) { null }
                withContext(Dispatchers.Main) {
                    if (data != null) {
                        prefs.edit().putString(cacheKey, encode(data)).apply()
                        render(header(data, false), data)
                    } else if (cached != null) {
                        render(header(cached, true), cached)
                    }
                }
            }
        }
    }

    override fun onUpdate(context: Context, mgr: AppWidgetManager, ids: IntArray) {
        SocialAlarms.ensure(context)
        for (id in ids) update(context, mgr, id)
    }

    override fun onEnabled(context: Context) = SocialAlarms.ensure(context)

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        val prefs = context.getSharedPreferences(DuelWidgetProvider.PREFS, Context.MODE_PRIVATE)
        when (intent.action) {
            ACTION_REFRESH -> refreshAll(context)
            ACTION_PREV, ACTION_NEXT -> if (id != AppWidgetManager.INVALID_APPWIDGET_ID) {
                val delta = if (intent.action == ACTION_PREV) -1 else 1
                prefs.edit().putInt(offsetKey(id), (prefs.getInt(offsetKey(id), 0) + delta).coerceAtMost(0)).apply()
                update(context, AppWidgetManager.getInstance(context), id)
            }
        }
    }
}
