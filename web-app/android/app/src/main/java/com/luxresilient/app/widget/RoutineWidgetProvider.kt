package com.luxresilient.app.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.SweepGradient
import android.net.Uri
import android.os.Bundle
import android.os.Looper
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import com.google.gson.JsonParser
import com.luxresilient.app.R
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/** Everything a Routine widget needs to draw itself, computed from the app's cached data. */
object RoutineWidgetData {
    const val PREFS_ROUTINE = "lux_routine_widget"
    const val KEY_CONFIG = "config_json"
    const val KEY_JOURNAL_TIMES = "journal_times_json"
    const val KEY_REMINDERS = "reminders_json"

    /** Reminders pinned on the Journal calendar, as pushed by the app. */
    fun reminders(prefs: android.content.SharedPreferences): List<com.google.gson.JsonObject> = try {
        JsonParser.parseString(prefs.getString(KEY_REMINDERS, "[]") ?: "[]").asJsonArray.mapNotNull { it.takeIf { e -> e.isJsonObject }?.asJsonObject }
    } catch (_: Exception) {
        emptyList()
    }
    const val PREFS_WIDGET = "lux_widget_config"

    class Snapshot(
        val config: RoutineConfig,
        val filter: String,
        val showDone: Boolean,
        val all: List<RoutineItem>,
        val summary: DaySummary,
        val rows: List<RoutineRow>,
        val hasSource: Boolean,
        val now: Calendar
    )

    fun filterOf(context: Context, widgetId: Int): String =
        context.getSharedPreferences(PREFS_WIDGET, Context.MODE_PRIVATE).getString("routine_filter_widget_$widgetId", "ALL") ?: "ALL"

    fun load(context: Context, widgetId: Int, allowNetwork: Boolean): Snapshot {
        val client = SupabaseWidgetClient(context)
        val routinePrefs = context.getSharedPreferences(PREFS_ROUTINE, Context.MODE_PRIVATE)
        val config = RoutineConfig.fromJson(routinePrefs.getString(KEY_CONFIG, null))
        val journalTimes = try {
            JsonParser.parseString(routinePrefs.getString(KEY_JOURNAL_TIMES, "[]") ?: "[]").asJsonArray.mapNotNull { runCatching { it.asString }.getOrNull() }
        } catch (_: Exception) {
            emptyList()
        }

        val habits = client.readRawCollection("habits", allowNetwork)
        val quests = client.readRawCollection("quests", allowNetwork)
        val projects = if (config.showProjects) client.readRawCollection("projects", allowNetwork) else null
        val journal = if (config.showJournal && journalTimes.isNotEmpty()) client.readRawCollection("journal", allowNetwork) else null
        val attributes = client.readRawCollection("attributes", allowNetwork)

        val widgetPrefs = context.getSharedPreferences(PREFS_WIDGET, Context.MODE_PRIVATE)
        val filter = widgetPrefs.getString("routine_filter_widget_$widgetId", "ALL") ?: "ALL"
        val showDone = widgetPrefs.getBoolean("routine_show_done_widget_$widgetId", config.showCompleted)

        val now = Calendar.getInstance()
        val nowMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE)
        val source = RoutineEngine.Source(habits, quests, projects, journal, RoutineEngine.attributeColors(attributes), journalTimes, reminders(routinePrefs))
        // Always build with completed items: the progress ring must reflect the whole day, the list hides them per widget.
        val all = RoutineEngine.build(now, source, config.copy(showCompleted = true))
        val summary = RoutineEngine.summarize(all, true, nowMinutes, config.use24h)
        val listed = RoutineEngine.filterItems(if (showDone) all else all.filter { !it.done }, filter)
        val rows = RoutineEngine.rows(listed, config, filter, true, nowMinutes, summary.next?.id)
        return Snapshot(config, filter, showDone, all, summary, rows, habits != null || quests != null, now)
    }
}

/**
 * Lux · Rutina — the Routine screen on the home screen: progress ring, what is next, and the day's
 * timeline with one-tap completion for habits, sub-habits and tasks.
 */
class RoutineWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "RoutineWidgetProvider"
        const val ACTION_REFRESH = "com.luxresilient.app.REFRESH_ROUTINE"
        const val ACTION_CYCLE_FILTER = "com.luxresilient.app.ROUTINE_CYCLE_FILTER"
        const val ACTION_TOGGLE_DONE = "com.luxresilient.app.ROUTINE_TOGGLE_DONE"
        private val FILTERS = listOf("ALL", "MORNING", "AFTERNOON", "NIGHT")

        fun widgetIds(context: Context): IntArray =
            AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, RoutineWidgetProvider::class.java))

        /** Redraws every Routine widget (header and list) from the current data. Safe on any thread. */
        fun refreshAll(context: Context) {
            val app = context.applicationContext
            // The calendar widget draws the same routine: it follows every data change.
            try { CalendarWidgetProvider.refreshAll(app) } catch (e: Exception) { Log.e(TAG, "calendar refresh failed: ${e.message}") }
            val manager = AppWidgetManager.getInstance(app)
            val ids = widgetIds(app)
            if (ids.isEmpty()) return
            for (id in ids) updateWidget(app, manager, id)
            manager.notifyAppWidgetViewDataChanged(ids, R.id.routine_list)
            RoutineAlarms.ensure(app)
        }

        private fun filterLabel(filter: String) = when (filter) {
            "MORNING" -> "MAÑANA"
            "AFTERNOON" -> "TARDE"
            "NIGHT" -> "NOCHE"
            else -> "TODO"
        }

        private fun openApp(context: Context, widgetId: Int): PendingIntent {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("luxapp://routine")).setPackage(context.packageName)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            return PendingIntent.getActivity(context, 5100 + widgetId, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }

        private fun broadcast(context: Context, action: String, widgetId: Int, code: Int): PendingIntent {
            val intent = Intent(context, RoutineWidgetProvider::class.java).apply {
                this.action = action
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            }
            return PendingIntent.getBroadcast(context, widgetId * 10 + code, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }

        /** Progress ring: dark track and a sky → indigo → emerald arc, like the app's hero. */
        private fun ringBitmap(context: Context, pct: Int, sizeDp: Int): Bitmap {
            val px = (sizeDp * context.resources.displayMetrics.density).toInt().coerceAtLeast(24)
            val bitmap = Bitmap.createBitmap(px, px, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            val stroke = px * 0.105f
            val rect = RectF(stroke / 2f, stroke / 2f, px - stroke / 2f, px - stroke / 2f)
            val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = stroke; strokeCap = Paint.Cap.ROUND }
            paint.color = Color.argb(26, 255, 255, 255)
            canvas.drawArc(rect, 0f, 360f, false, paint)
            if (pct > 0) {
                val f = (pct / 100f).coerceIn(0.02f, 1f)
                val c1 = Color.parseColor("#38bdf8")
                val c2 = Color.parseColor("#818cf8")
                val c3 = Color.parseColor("#34d399")
                paint.color = Color.WHITE // the track left its 10% alpha on the paint, which would also dim the gradient
                paint.shader = SweepGradient(px / 2f, px / 2f, intArrayOf(c1, c2, c3, c3), floatArrayOf(0f, 0.55f * f, f, 1f))
                canvas.save()
                canvas.rotate(-90f, px / 2f, px / 2f)
                canvas.drawArc(rect, 0f, 360f * f, false, paint)
                canvas.restore()
            }
            return bitmap
        }

        private fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val client = SupabaseWidgetClient(context)
            if (!client.isAuthenticated()) {
                val login = RemoteViews(context.packageName, R.layout.widget_login_required)
                context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
                    login.setOnClickPendingIntent(R.id.widget_login_required, PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
                }
                manager.updateAppWidget(widgetId, login)
                return
            }
            if (!ProGate.isPro(context)) {
                manager.updateAppWidget(widgetId, ProGate.lockedViews(context, widgetId, "Lux · Rutina"))
                return
            }

            val onMain = Looper.myLooper() == Looper.getMainLooper()
            val snap = RoutineWidgetData.load(context, widgetId, allowNetwork = !onMain)
            if (!snap.hasSource && onMain) {
                // Nothing cached yet (first run): fetch off the main thread, then redraw.
                Thread { try { updateWidget(context, manager, widgetId); manager.notifyAppWidgetViewDataChanged(widgetId, R.id.routine_list) } catch (e: Exception) { Log.e(TAG, "first load failed: ${e.message}") } }.start()
            }

            val views = RemoteViews(context.packageName, R.layout.widget_routine)
            val prefs = context.getSharedPreferences(RoutineWidgetData.PREFS_WIDGET, Context.MODE_PRIVATE)
            val bgOpacity = when {
                prefs.contains("widget_background_opacity_$widgetId") -> prefs.getInt("widget_background_opacity_$widgetId", 85)
                prefs.contains("widget_background_opacity_com.luxresilient.app.widget.RoutineWidgetProvider") -> prefs.getInt("widget_background_opacity_com.luxresilient.app.widget.RoutineWidgetProvider", 85)
                else -> prefs.getInt("widget_background_opacity", 85)
            }
            WidgetTheme.apply(context, views, R.id.routine_background, manager, widgetId, RoutineWidgetProvider::class.java.name, default = WidgetTheme.Style.MIDNIGHT)

            // ── Size-aware header ──
            val options: Bundle = manager.getAppWidgetOptions(widgetId)
            val minW = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
            val minH = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
            val compact = minH in 1..139
            val narrow = minW in 1..199
            views.setViewVisibility(R.id.routine_stats, if (compact) View.GONE else View.VISIBLE)
            views.setViewVisibility(R.id.routine_done_btn, if (narrow) View.GONE else View.VISIBLE)

            // ── Hero ──
            val s = snap.summary
            views.setImageViewBitmap(R.id.routine_ring, ringBitmap(context, s.pct, 46))
            views.setTextViewText(R.id.routine_ring_pct, "${s.pct}%")

            val dateText = SimpleDateFormat("EEE d MMM", Locale("es")).format(snap.now.time).replace(".", "").uppercase(Locale("es"))
            val next = s.next
            val whenColor = when {
                next == null -> Color.parseColor("#6EE7B7")
                next.overdue -> Color.parseColor("#FDA4AF")
                s.nextWhen == "Ahora" -> Color.parseColor("#6EE7B7")
                else -> Color.parseColor("#7DD3FC")
            }
            val label = SpannableStringBuilder()
            when {
                next != null -> {
                    label.append("SIGUIENTE")
                    label.setSpan(ForegroundColorSpan(Color.parseColor("#B3BAE6FD")), 0, label.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                    val start = label.length
                    label.append("  ·  ").append(s.nextWhen.uppercase(Locale("es")))
                    label.setSpan(ForegroundColorSpan(whenColor), start, label.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                }
                s.total > 0 -> { label.append("$dateText  ·  TODO LISTO"); label.setSpan(ForegroundColorSpan(whenColor), 0, label.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE) }
                else -> { label.append("$dateText  ·  DÍA LIBRE"); label.setSpan(ForegroundColorSpan(Color.parseColor("#B3BAE6FD")), 0, label.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE) }
            }
            views.setTextViewText(R.id.routine_label, label)
            views.setTextViewText(R.id.routine_next_title, when {
                next != null -> next.title
                s.total > 0 -> "Cumpliste tu rutina 🎉"
                else -> "Nada programado"
            })

            val stats = SpannableStringBuilder()
            fun stat(value: Int, text: String, color: String) {
                if (stats.isNotEmpty()) stats.append("   ")
                val a = stats.length
                stats.append(value.toString())
                stats.setSpan(ForegroundColorSpan(Color.parseColor(color)), a, stats.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                stats.append(" ").append(text)
            }
            stat(s.done, "hechas", "#34d399")
            stat(s.pending, "pend.", "#38bdf8")
            if (s.overdue > 0) stat(s.overdue, "atras.", "#fb7185")
            views.setTextViewText(R.id.routine_stats, stats)

            views.setTextViewText(R.id.routine_filter_text, filterLabel(snap.filter))
            views.setImageViewResource(R.id.routine_done_icon, if (snap.showDone) R.drawable.ic_routine_eye else R.drawable.ic_routine_eye_off)
            views.setInt(R.id.routine_done_icon, "setImageAlpha", if (snap.showDone) 255 else 130)

            // ── List ──
            val serviceIntent = Intent(context, RoutineWidgetService::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
            }
            views.setRemoteAdapter(R.id.routine_list, serviceIntent)
            views.setEmptyView(R.id.routine_list, R.id.routine_empty)
            views.setTextViewText(R.id.routine_empty, when {
                !snap.hasSource -> "Abre Lux para sincronizar tu rutina"
                snap.all.isEmpty() -> "Nada programado para hoy\nPonle hora a tus hábitos y tareas"
                snap.filter != "ALL" -> "Nada en ${filterLabel(snap.filter).lowercase(Locale("es"))}"
                else -> "Todo completado por hoy 🎉"
            })

            views.setPendingIntentTemplate(
                R.id.routine_list,
                PendingIntent.getActivity(
                    context, 5200 + widgetId, Intent(context, RoutineActionActivity::class.java),
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
                )
            )
            views.setOnClickPendingIntent(R.id.routine_hero, openApp(context, widgetId))
            views.setOnClickPendingIntent(R.id.routine_filter_btn, broadcast(context, ACTION_CYCLE_FILTER, widgetId, 1))
            views.setOnClickPendingIntent(R.id.routine_done_btn, broadcast(context, ACTION_TOGGLE_DONE, widgetId, 2))

            manager.updateAppWidget(widgetId, views)
            Log.d(TAG, "updated widget $widgetId filter=${snap.filter} rows=${snap.rows.size} pct=${s.pct}")
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) updateWidget(context, appWidgetManager, id)
        RoutineAlarms.ensure(context)
    }

    override fun onEnabled(context: Context) {
        RoutineAlarms.ensure(context)
    }

    override fun onDisabled(context: Context) {
        if (CalendarWidgetProvider.widgetIds(context).isEmpty()) RoutineAlarms.cancel(context)
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        val editor = context.getSharedPreferences(RoutineWidgetData.PREFS_WIDGET, Context.MODE_PRIVATE).edit()
        for (id in appWidgetIds) {
            editor.remove("routine_filter_widget_$id").remove("routine_show_done_widget_$id").remove("widget_background_opacity_$id")
        }
        editor.apply()
    }

    override fun onAppWidgetOptionsChanged(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, newOptions: Bundle) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        updateWidget(context, appWidgetManager, appWidgetId)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        when (intent.action) {
            ACTION_REFRESH, Intent.ACTION_DATE_CHANGED, Intent.ACTION_TIME_CHANGED, Intent.ACTION_TIMEZONE_CHANGED, RoutineAlarms.ACTION_TICK -> {
                val pending = goAsync()
                Thread { try { refreshAll(context) } finally { pending.finish() } }.start()
            }
            ACTION_CYCLE_FILTER -> {
                val id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
                if (id == AppWidgetManager.INVALID_APPWIDGET_ID) return
                val prefs = context.getSharedPreferences(RoutineWidgetData.PREFS_WIDGET, Context.MODE_PRIVATE)
                val current = prefs.getString("routine_filter_widget_$id", "ALL") ?: "ALL"
                val next = FILTERS[(FILTERS.indexOf(current).coerceAtLeast(0) + 1) % FILTERS.size]
                prefs.edit().putString("routine_filter_widget_$id", next).apply()
                reloadOne(context, id)
            }
            ACTION_TOGGLE_DONE -> {
                val id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
                if (id == AppWidgetManager.INVALID_APPWIDGET_ID) return
                val prefs = context.getSharedPreferences(RoutineWidgetData.PREFS_WIDGET, Context.MODE_PRIVATE)
                val appDefault = RoutineConfig.fromJson(context.getSharedPreferences(RoutineWidgetData.PREFS_ROUTINE, Context.MODE_PRIVATE).getString(RoutineWidgetData.KEY_CONFIG, null)).showCompleted
                val current = prefs.getBoolean("routine_show_done_widget_$id", appDefault)
                prefs.edit().putBoolean("routine_show_done_widget_$id", !current).apply()
                reloadOne(context, id)
            }
        }
    }

    private fun reloadOne(context: Context, id: Int) {
        val pending = goAsync()
        Thread {
            try {
                val app = context.applicationContext
                val manager = AppWidgetManager.getInstance(app)
                updateWidget(app, manager, id)
                // The launcher can keep the old header after a click-triggered full update; a partial update
                // of just the controls that changed is applied reliably on top of the existing view.
                val prefs = app.getSharedPreferences(RoutineWidgetData.PREFS_WIDGET, Context.MODE_PRIVATE)
                val appDefault = RoutineConfig.fromJson(app.getSharedPreferences(RoutineWidgetData.PREFS_ROUTINE, Context.MODE_PRIVATE).getString(RoutineWidgetData.KEY_CONFIG, null)).showCompleted
                val filter = prefs.getString("routine_filter_widget_$id", "ALL") ?: "ALL"
                val showDone = prefs.getBoolean("routine_show_done_widget_$id", appDefault)
                val partial = RemoteViews(app.packageName, R.layout.widget_routine)
                partial.setTextViewText(R.id.routine_filter_text, filterLabel(filter))
                partial.setImageViewResource(R.id.routine_done_icon, if (showDone) R.drawable.ic_routine_eye else R.drawable.ic_routine_eye_off)
                partial.setInt(R.id.routine_done_icon, "setImageAlpha", if (showDone) 255 else 130)
                manager.partiallyUpdateAppWidget(id, partial)
                manager.notifyAppWidgetViewDataChanged(id, R.id.routine_list)
            } finally {
                pending.finish()
            }
        }.start()
    }
}

/**
 * Keeps the "now" marker, "up next" countdown and the day rollover fresh without a service:
 * a short inexact alarm while a Routine widget exists, and one right after midnight.
 */
object RoutineAlarms {
    const val ACTION_TICK = "com.luxresilient.app.ROUTINE_TICK"
    private const val CODE = 7201
    private const val TICK_MS = 5 * 60 * 1000L

    private fun pending(context: Context) = PendingIntent.getBroadcast(
        context, CODE, Intent(context, RoutineAlarmReceiver::class.java).setAction(ACTION_TICK),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    fun ensure(context: Context) {
        if (RoutineWidgetProvider.widgetIds(context).isEmpty() && CalendarWidgetProvider.widgetIds(context).isEmpty()) return
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val now = System.currentTimeMillis()
        val midnight = Calendar.getInstance().apply {
            add(Calendar.DAY_OF_MONTH, 1)
            set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 20); set(Calendar.MILLISECOND, 0)
        }.timeInMillis
        // Inexact (no special permission); Android delivers it within a few minutes.
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, minOf(now + TICK_MS, midnight), pending(context))
    }

    fun cancel(context: Context) {
        (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(pending(context))
    }
}

class RoutineAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pending = goAsync()
        Thread {
            try {
                if (intent.action == RoutineAlarms.ACTION_TICK) RoutineWidgetProvider.refreshAll(context)
                RoutineAlarms.ensure(context)
            } catch (e: Exception) {
                Log.e("RoutineAlarmReceiver", "tick failed: ${e.message}")
            } finally {
                pending.finish()
            }
        }.start()
    }
}
