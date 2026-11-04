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

            CoroutineScope(Dispatchers.IO).launch {
                val s = try { SocialWidgetData.duelSummary(context, friendId) } catch (_: Exception) { null }
                withContext(Dispatchers.Main) {
                    if (s == null) {
                        views.setTextViewText(R.id.duel_status, "Sin conexión")
                    } else {
                        val name = s.friend?.name ?: "Tu amigo"
                        val rank = s.friend?.let { SocialWidgetData.RANK_NAMES.getOrElse(it.rankIndex) { "" } } ?: ""
                        views.setTextViewText(R.id.duel_friend, "⚔ Tú vs $name")
                        views.setTextViewText(R.id.duel_rank, if (s.friend != null) "$rank · ${s.friend.elo} ELO" else "")
                        views.setTextViewText(R.id.duel_days, "${s.dayWins} – ${s.dayLosses}")
                        views.setTextViewText(R.id.duel_duels, "Duelos ${s.duelWins} – ${s.duelLosses}")
                        val a = s.active
                        views.setTextViewText(
                            R.id.duel_status,
                            if (a == null) "Sin duelo activo"
                            else {
                                val len = when (a.duration) { "DAY" -> "de 1 día"; "MONTH" -> "mensual"; else -> "semanal" }
                                "Duelo $len: ${s.activeMine} – ${s.activeTheirs} · quedan ${s.activeRemaining} día(s)"
                            }
                        )
                        val tm = s.todayMine
                        val tt = s.todayTheirs
                        views.setTextViewText(
                            R.id.duel_today,
                            "Hoy: tú ${Math.round(tm?.score ?: 0.0)} pts · ${tm?.focus ?: 0} min — $name ${Math.round(tt?.score ?: 0.0)} pts · ${tt?.focus ?: 0} min"
                        )
                        views.setTextViewText(R.id.duel_updated, "Actualizado ${SimpleDateFormat("HH:mm", Locale.US).format(Date())} · cierra a las 24:00")
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
        ids.forEach { e.remove(friendKey(it)) }
        e.apply()
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH) refreshAll(context)
    }
}
