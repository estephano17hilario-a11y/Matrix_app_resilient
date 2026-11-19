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
import java.util.Date
import java.util.Locale

/** Head-to-head against one chosen friend: cumulative W–L, the running duel and today's numbers. */
class DuelWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_REFRESH = "com.luxresilient.app.REFRESH_DUEL_WIDGET"
        const val PREFS = "lux_social_widgets"
        fun friendKey(widgetId: Int) = "duel_friend_$widgetId"

        fun refreshAll(context: Context) {
            val mgr = AppWidgetManager.getInstance(context)
            val ids = mgr.getAppWidgetIds(ComponentName(context, DuelWidgetProvider::class.java))
            for (id in ids) update(context, mgr, id)
        }

        fun update(context: Context, mgr: AppWidgetManager, widgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_duel)
            val friendId = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(friendKey(widgetId), null)

            // Tap anywhere: open Lux on the Friends screen. Tap the gear: choose another friend.
            val open = Intent(Intent.ACTION_VIEW, Uri.parse("luxapp://friends")).setPackage(context.packageName)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            views.setOnClickPendingIntent(R.id.duel_root, PendingIntent.getActivity(context, widgetId * 10 + 1, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
            val pick = Intent(context, FriendPickerActivity::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                putExtra(FriendPickerActivity.EXTRA_KIND, FriendPickerActivity.KIND_DUEL)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            views.setOnClickPendingIntent(R.id.duel_settings, PendingIntent.getActivity(context, widgetId * 10 + 2, pick, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))

            if (!SupabaseWidgetClient(context).isAuthenticated()) {
                views.setTextViewText(R.id.duel_friend, "Abre Lux para iniciar sesión")
                views.setViewVisibility(R.id.duel_body, View.GONE)
                mgr.updateAppWidget(widgetId, views)
                return
            }
            if (friendId == null) {
                views.setTextViewText(R.id.duel_friend, "Toca ⚙ para elegir a tu amigo")
                views.setViewVisibility(R.id.duel_body, View.GONE)
                mgr.updateAppWidget(widgetId, views)
                return
            }
            views.setViewVisibility(R.id.duel_body, View.VISIBLE)
            mgr.updateAppWidget(widgetId, views)

            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            fun show(lines: Map<String, String>, footer: String) {
                views.setTextViewText(R.id.duel_friend, lines["friend"] ?: "")
                views.setTextViewText(R.id.duel_rank, lines["rank"] ?: "")
                views.setTextViewText(R.id.duel_days, lines["days"] ?: "")
                views.setTextViewText(R.id.duel_duels, lines["duels"] ?: "")
                views.setTextViewText(R.id.duel_status, lines["status"] ?: "")
                views.setTextViewText(R.id.duel_today, lines["today"] ?: "")
                views.setTextViewText(R.id.duel_updated, footer)
            }

            // Paint the last good data immediately so the widget never flashes empty.
            val cacheKey = "duel_cache_$widgetId"
            val cached: Map<String, String>? = prefs.getString(cacheKey, null)?.let { raw ->
                try { val o = org.json.JSONObject(raw); o.keys().asSequence().associateWith { k -> o.getString(k) } } catch (_: Exception) { null }
            }
            if (cached != null) { show(cached, "Actualizando…"); mgr.updateAppWidget(widgetId, views) }

            CoroutineScope(Dispatchers.IO).launch {
                val s = try { SocialWidgetData.duelSummary(context, friendId) } catch (_: Exception) { null }
                withContext(Dispatchers.Main) {
                    if (s == null) {
                        // Offline or the session expired while the app was closed: keep the last data.
                        if (cached != null) show(cached, "Sin conexión · abre Lux para actualizar ${cached["at"] ?: ""}".trim())
                        else views.setTextViewText(R.id.duel_status, "Sin conexión · abre Lux para actualizar")
                    } else {
                        val name = s.friend?.name ?: "Tu amigo"
                        val rank = s.friend?.let { SocialWidgetData.RANK_NAMES.getOrElse(it.rankIndex) { "" } } ?: ""
                        val a = s.active
                        val status = if (a == null) "Sin duelo activo"
                        else {
                            val len = when (a.duration) { "DAY" -> "de 1 día"; "MONTH" -> "mensual"; else -> "semanal" }
                            "Duelo $len: ${s.activeMine} – ${s.activeTheirs} · quedan ${s.activeRemaining} día(s)"
                        }
                        val tm = s.todayMine
                        val tt = s.todayTheirs
                        val at = SimpleDateFormat("HH:mm", Locale.US).format(Date())
                        val lines = mapOf(
                            "friend" to "⚔ Tú vs $name",
                            "rank" to (if (s.friend != null) "$rank · ${s.friend.elo} ELO" else ""),
                            "days" to "${s.dayWins} – ${s.dayLosses}",
                            "duels" to "Duelos ${s.duelWins} – ${s.duelLosses}",
                            "status" to status,
                            "today" to "Hoy: tú ${Math.round(tm?.score ?: 0.0)} pts · ${tm?.focus ?: 0} min — $name ${Math.round(tt?.score ?: 0.0)} pts · ${tt?.focus ?: 0} min",
                            "at" to at,
                        )
                        show(lines, "Actualizado $at · cierra a las 24:00")
                        prefs.edit().putString(cacheKey, org.json.JSONObject(lines).toString()).apply()
                    }
                    mgr.updateAppWidget(widgetId, views)
                }
            }
        }
    }

    override fun onUpdate(context: Context, mgr: AppWidgetManager, ids: IntArray) {
        SocialAlarms.ensure(context)
        for (id in ids) update(context, mgr, id)
    }

    override fun onEnabled(context: Context) = SocialAlarms.ensure(context)

    override fun onDeleted(context: Context, ids: IntArray) {
        val e = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
        ids.forEach { e.remove(friendKey(it)); e.remove("duel_cache_$it") }
        e.apply()
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH) refreshAll(context)
    }
}
