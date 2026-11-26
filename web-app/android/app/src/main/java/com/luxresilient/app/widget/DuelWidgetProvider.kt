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

        /** Today's score share: your side (cyan) pushes against theirs (rose), with a notch at the meeting point. */
        private fun tugOfWar(context: Context, mine: Float): android.graphics.Bitmap {
            val d = minOf(context.resources.displayMetrics.density, 3f)
            val w = (220 * d).toInt(); val h = (10 * d).toInt()
            val bmp = android.graphics.Bitmap.createBitmap(w, h, android.graphics.Bitmap.Config.ARGB_8888)
            val c = android.graphics.Canvas(bmp)
            val p = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG)
            val r = h / 2f
            val clip = android.graphics.Path().apply { addRoundRect(android.graphics.RectF(0f, 0f, w.toFloat(), h.toFloat()), r, r, android.graphics.Path.Direction.CW) }
            c.clipPath(clip)
            val split = (w * mine.coerceIn(0.04f, 0.96f))
            p.shader = android.graphics.LinearGradient(0f, 0f, split, 0f, android.graphics.Color.parseColor("#0891B2"), android.graphics.Color.parseColor("#22D3EE"), android.graphics.Shader.TileMode.CLAMP)
            c.drawRect(0f, 0f, split, h.toFloat(), p)
            p.shader = android.graphics.LinearGradient(split, 0f, w.toFloat(), 0f, android.graphics.Color.parseColor("#FB7185"), android.graphics.Color.parseColor("#BE123C"), android.graphics.Shader.TileMode.CLAMP)
            c.drawRect(split, 0f, w.toFloat(), h.toFloat(), p)
            p.shader = android.graphics.LinearGradient(0f, 0f, 0f, h.toFloat(), android.graphics.Color.argb(80, 255, 255, 255), android.graphics.Color.argb(0, 255, 255, 255), android.graphics.Shader.TileMode.CLAMP)
            c.drawRect(0f, 0f, w.toFloat(), h.toFloat(), p)
            p.shader = null; p.color = android.graphics.Color.WHITE
            c.drawRect(split - d, 0f, split + d, h.toFloat(), p)
            return bmp
        }

        fun refreshAll(context: Context) {
            val mgr = AppWidgetManager.getInstance(context)
            val ids = mgr.getAppWidgetIds(ComponentName(context, DuelWidgetProvider::class.java))
            for (id in ids) update(context, mgr, id)
        }

        fun update(context: Context, mgr: AppWidgetManager, widgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_duel)
            WidgetTheme.apply(context, views, R.id.duel_background_image, mgr, widgetId, DuelWidgetProvider::class.java.name, android.graphics.Color.parseColor("#F43F5E"), 170, 170, WidgetTheme.Style.EMBER)
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
                val ratio = lines["ratio"]?.toFloatOrNull() ?: 0.5f
                views.setImageViewBitmap(R.id.duel_bar, tugOfWar(context, ratio))
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
                            "ratio" to run {
                                val mine = (tm?.score ?: 0.0); val theirs = (tt?.score ?: 0.0)
                                if (mine + theirs <= 0.0) "0.5" else (mine / (mine + theirs)).toString()
                            },
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
