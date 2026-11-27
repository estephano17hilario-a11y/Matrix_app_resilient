package com.luxresilient.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.TypedValue
import android.os.Looper
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import com.google.gson.JsonParser
import com.luxresilient.app.R
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/** Everything one calendar widget needs to draw itself. */
class CalendarState(
    val config: RoutineConfig,
    val span: Int,
    val offset: Int,
    val days: List<Calendar>,
    val dayInputs: List<CalendarDayInput>,
    val layout: CalendarLayoutResult,
    val nextId: String?,
    val title: String,
    val subtitle: String,
    val todayInRange: Boolean,
    val hasSource: Boolean,
    val now: Calendar,
    /** 1 = the default scale; the "+ / −" buttons move it between [CalendarLayout.ZOOM_MIN] and [CalendarLayout.ZOOM_MAX]. */
    val zoom: Float,
    /** OWN | TRAIT | IMPORTANCE. */
    val colorMode: String,
    val toolsOpen: Boolean
)

object CalendarWidgetData {
    private val ES = Locale("es")

    private const val KEY_ZOOM_DEFAULT = "calendar_zoom_default"
    private const val KEY_COLOR_DEFAULT = "calendar_color_default"

    /** Zoom of one widget; a widget that was never zoomed starts at the last zoom the user chose (their default). */
    fun zoomOf(context: Context, widgetId: Int): Float {
        val prefs = context.getSharedPreferences(RoutineWidgetData.PREFS_WIDGET, Context.MODE_PRIVATE)
        return CalendarLayout.clampZoom(prefs.getFloat("calendar_zoom_widget_$widgetId", prefs.getFloat(KEY_ZOOM_DEFAULT, 1f)))
    }

    /**
     * How the blocks are coloured: what this widget was set to, else the last choice made on any calendar widget,
     * else the app's own setting. The choice sticks (it is the default for every new widget too).
     */
    fun colorModeOf(context: Context, widgetId: Int, config: RoutineConfig): String {
        val prefs = context.getSharedPreferences(RoutineWidgetData.PREFS_WIDGET, Context.MODE_PRIVATE)
        val v = prefs.getString("calendar_color_widget_$widgetId", null) ?: prefs.getString(KEY_COLOR_DEFAULT, null) ?: config.calendarColor
        return if (v == "TRAIT" || v == "IMPORTANCE") v else "OWN"
    }

    fun saveColorMode(editor: android.content.SharedPreferences.Editor, widgetId: Int, mode: String) {
        if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) editor.putString("calendar_color_widget_$widgetId", mode)
        editor.putString(KEY_COLOR_DEFAULT, mode)
    }

    fun saveZoom(editor: android.content.SharedPreferences.Editor, widgetId: Int, zoom: Float) {
        editor.putFloat("calendar_zoom_widget_$widgetId", zoom).putFloat(KEY_ZOOM_DEFAULT, zoom)
    }

    fun toolsOpenOf(context: Context, widgetId: Int): Boolean =
        context.getSharedPreferences(RoutineWidgetData.PREFS_WIDGET, Context.MODE_PRIVATE).getBoolean("calendar_tools_widget_$widgetId", false)

    /** A block is never shorter than this many dp, and blocks starting closer than [CalendarLayout]'s title line go side by side. */
    fun minBlockDp(span: Int) = if (span == 7) 15f else 18f

    fun spanOf(context: Context, widgetId: Int, config: RoutineConfig): Int {
        val prefs = context.getSharedPreferences(RoutineWidgetData.PREFS_WIDGET, Context.MODE_PRIVATE)
        val s = prefs.getInt("calendar_span_widget_$widgetId", config.calendarSpan)
        return if (s == 3 || s == 7) s else 1
    }

    fun offsetOf(context: Context, widgetId: Int): Int =
        context.getSharedPreferences(RoutineWidgetData.PREFS_WIDGET, Context.MODE_PRIVATE).getInt("calendar_offset_widget_$widgetId", 0)

    fun savedScroll(context: Context, widgetId: Int): Float? {
        val prefs = context.getSharedPreferences(RoutineWidgetData.PREFS_WIDGET, Context.MODE_PRIVATE)
        val key = "calendar_scroll_widget_$widgetId"
        return if (prefs.contains(key)) prefs.getFloat(key, 0f) else null
    }

    private fun capitalize(s: String) = s.replaceFirstChar { it.uppercase(ES) }

    fun load(context: Context, widgetId: Int, allowNetwork: Boolean): CalendarState {
        val client = SupabaseWidgetClient(context)
        val routinePrefs = context.getSharedPreferences(RoutineWidgetData.PREFS_ROUTINE, Context.MODE_PRIVATE)
        val config = RoutineConfig.fromJson(routinePrefs.getString(RoutineWidgetData.KEY_CONFIG, null))
        val journalTimes = try {
            JsonParser.parseString(routinePrefs.getString(RoutineWidgetData.KEY_JOURNAL_TIMES, "[]") ?: "[]").asJsonArray.mapNotNull { runCatching { it.asString }.getOrNull() }
        } catch (_: Exception) {
            emptyList()
        }
        val habits = client.readRawCollection("habits", allowNetwork)
        val quests = client.readRawCollection("quests", allowNetwork)
        val projects = if (config.showProjects) client.readRawCollection("projects", allowNetwork) else null
        val journal = if (config.showJournal && journalTimes.isNotEmpty()) client.readRawCollection("journal", allowNetwork) else null
        val attributes = client.readRawCollection("attributes", allowNetwork)
        val source = RoutineEngine.Source(habits, quests, projects, journal, RoutineEngine.attributeColors(attributes), journalTimes, RoutineWidgetData.reminders(routinePrefs))

        val span = spanOf(context, widgetId, config)
        val offset = offsetOf(context, widgetId)
        val now = Calendar.getInstance()
        val nowMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE)
        val todayKey = RoutineEngine.dayKey(now)

        // The days on screen: 1 = that day, 3 = it and the next two, 7 = the (Monday-first) week it belongs to.
        val anchor = (now.clone() as Calendar).apply { add(Calendar.DAY_OF_MONTH, offset) }
        val first = (anchor.clone() as Calendar)
        if (span == 7) first.add(Calendar.DAY_OF_MONTH, -((first.get(Calendar.DAY_OF_WEEK) + 5) % 7))
        val days = (0 until span).map { i -> (first.clone() as Calendar).apply { add(Calendar.DAY_OF_MONTH, i) } }

        // Items per day. "Everything" (completed included) feeds the counters; the grid hides completed ones
        // when the app is set to hide them.
        val inputs = days.map { d ->
            val key = RoutineEngine.dayKey(d)
            CalendarDayInput(key, key == todayKey, RoutineEngine.build(d, source, config))
        }
        val everything = days.map { d -> RoutineEngine.build(d, source, config.copy(showCompleted = true)) }
        val zoom = zoomOf(context, widgetId)
        val colorMode = colorModeOf(context, widgetId, config)
        val minBlock = minBlockDp(span)
        val layout = CalendarLayout.build(inputs, config, if (inputs.any { it.isToday }) nowMinutes else null, CalendarLayout.dpPerHour(span, zoom), minBlock, minBlock)

        val todayIdx = inputs.indexOfFirst { it.isToday }
        val summary = if (todayIdx >= 0) RoutineEngine.summarize(everything[todayIdx], true, nowMinutes, config.use24h) else null

        // Header texts
        val title: String
        val subtitle: String
        if (span == 1) {
            val d = days[0]
            title = capitalize(SimpleDateFormat("EEEE d", ES).format(d.time))
            subtitle = if (summary != null) {
                val next = summary.next
                when {
                    next != null -> "Siguiente: ${next.title} · ${summary.nextWhen}"
                    summary.total > 0 -> "Todo listo por hoy 🎉"
                    else -> "Día libre"
                }
            } else {
                val all = everything[0]
                val pending = all.count { !it.done }
                if (all.isEmpty()) capitalize(SimpleDateFormat("MMMM yyyy", ES).format(d.time)) else "$pending pendientes · ${all.size - pending} hechas"
            }
        } else {
            val a = days.first()
            val b = days.last()
            val sameMonth = a.get(Calendar.MONTH) == b.get(Calendar.MONTH)
            title = if (sameMonth) "${a.get(Calendar.DAY_OF_MONTH)} – ${b.get(Calendar.DAY_OF_MONTH)} ${SimpleDateFormat("MMM", ES).format(b.time).replace(".", "")}"
            else "${a.get(Calendar.DAY_OF_MONTH)} ${SimpleDateFormat("MMM", ES).format(a.time).replace(".", "")} – ${b.get(Calendar.DAY_OF_MONTH)} ${SimpleDateFormat("MMM", ES).format(b.time).replace(".", "")}"
            subtitle = if (summary != null && summary.total > 0) "Hoy: ${summary.done}/${summary.total} hechas" else capitalize(SimpleDateFormat("MMMM yyyy", ES).format(b.time))
        }
        return CalendarState(config, span, offset, days, inputs, layout, summary?.next?.id, title, subtitle, todayIdx >= 0, habits != null || quests != null, now, zoom, colorMode, toolsOpenOf(context, widgetId))
    }
}

/**
 * Lux · Calendario — the routine as a Google-Calendar style time grid on the home screen. It follows the
 * way the day is divided in the app (hour blocks, Mañana/Tarde/Noche, or none), shows what is next, marks
 * the current time, and can show a day, three days or a week. Header buttons move through days, change the
 * span and scroll; tapping the grid opens the Routine calendar in the app.
 */
class CalendarWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "CalendarWidgetProvider"
        const val ACTION_REFRESH = "com.luxresilient.app.REFRESH_CALENDAR"
        const val ACTION_PREV = "com.luxresilient.app.CALENDAR_PREV"
        const val ACTION_NEXT = "com.luxresilient.app.CALENDAR_NEXT"
        const val ACTION_TODAY = "com.luxresilient.app.CALENDAR_TODAY"
        const val ACTION_SPAN = "com.luxresilient.app.CALENDAR_SPAN"
        const val ACTION_SCROLL_UP = "com.luxresilient.app.CALENDAR_SCROLL_UP"
        const val ACTION_SCROLL_DOWN = "com.luxresilient.app.CALENDAR_SCROLL_DOWN"
        const val ACTION_ZOOM_IN = "com.luxresilient.app.CALENDAR_ZOOM_IN"
        const val ACTION_ZOOM_OUT = "com.luxresilient.app.CALENDAR_ZOOM_OUT"
        const val ACTION_ZOOM_RESET = "com.luxresilient.app.CALENDAR_ZOOM_RESET"
        const val ACTION_TOOLS = "com.luxresilient.app.CALENDAR_TOOLS"
        const val ACTION_COLOR = "com.luxresilient.app.CALENDAR_COLOR"
        const val EXTRA_COLOR_MODE = "calendar_color_mode"

        private const val ZOOM_STEP = 1.25f

        // Widget chrome around the grid (dp): paddings 10 + 10 / 8 + 8, header 38, gap 4 (+ tools row 26 + gap 4 when open).
        private const val CHROME_W = 20
        private const val CHROME_H = 58
        private const val TOOLS_H = 30

        fun widgetIds(context: Context): IntArray =
            AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, CalendarWidgetProvider::class.java))

        /** Redraws every calendar widget from the current data. Safe on any thread. */
        fun refreshAll(context: Context) {
            val app = context.applicationContext
            val ids = widgetIds(app)
            if (ids.isEmpty()) return
            val manager = AppWidgetManager.getInstance(app)
            for (id in ids) updateWidget(app, manager, id)
            RoutineAlarms.ensure(app)
        }

        private fun openApp(context: Context, widgetId: Int): PendingIntent {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("luxapp://routine?view=calendar")).setPackage(context.packageName)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            return PendingIntent.getActivity(context, 5300 + widgetId, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }

        private fun broadcast(context: Context, action: String, widgetId: Int, code: Int, mode: String? = null): PendingIntent {
            val intent = Intent(context, CalendarWidgetProvider::class.java).apply {
                this.action = action
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                if (mode != null) putExtra(EXTRA_COLOR_MODE, mode)
            }
            return PendingIntent.getBroadcast(context, widgetId * 20 + code + 500000, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }

        private val HIT_IDS = intArrayOf(
            R.id.calendar_hit_0, R.id.calendar_hit_1, R.id.calendar_hit_2, R.id.calendar_hit_3, R.id.calendar_hit_4, R.id.calendar_hit_5, R.id.calendar_hit_6, R.id.calendar_hit_7,
            R.id.calendar_hit_8, R.id.calendar_hit_9, R.id.calendar_hit_10, R.id.calendar_hit_11, R.id.calendar_hit_12, R.id.calendar_hit_13, R.id.calendar_hit_14, R.id.calendar_hit_15
        )

        /** The info card of one block (CalendarEventInfoActivity). */
        private fun infoIntent(context: Context, widgetId: Int, slot: Int, ev: CalendarEvent, dayKey: String, use24h: Boolean): PendingIntent {
            val item = ev.item
            val i = Intent(context, CalendarEventInfoActivity::class.java).apply {
                putExtra(CalendarEventInfoActivity.X_TITLE, item.title)
                putExtra(CalendarEventInfoActivity.X_SUBTITLE, item.subtitle)
                putExtra(CalendarEventInfoActivity.X_KIND, item.kind)
                putExtra(CalendarEventInfoActivity.X_START, ev.start)
                putExtra(CalendarEventInfoActivity.X_END, ev.end)
                putExtra(CalendarEventInfoActivity.X_DURATION, item.durationMin)
                putExtra(CalendarEventInfoActivity.X_DONE, item.done)
                putExtra(CalendarEventInfoActivity.X_OVERRIDDEN, item.overridden)
                putExtra(CalendarEventInfoActivity.X_DAY_KEY, dayKey)
                putExtra(CalendarEventInfoActivity.X_IMPORTANCE, item.importance)
                putExtra(CalendarEventInfoActivity.X_USE24H, use24h)
                putExtra(CalendarEventInfoActivity.X_QUANTITY, item.isQuantity)
                putExtra(CalendarEventInfoActivity.X_SLOT_AMOUNT, item.slotAmount)
                item.habitId?.let { putExtra(CalendarEventInfoActivity.X_HABIT_ID, it) }
                item.subtaskId?.let { putExtra(CalendarEventInfoActivity.X_SUBTASK_ID, it) }
                item.taskId?.let { putExtra(CalendarEventInfoActivity.X_TASK_ID, it) }
                item.projectId?.let { putExtra(CalendarEventInfoActivity.X_PROJECT_ID, it) }
                item.reminderId?.let { putExtra(CalendarEventInfoActivity.X_REMINDER_ID, it) }
            }
            return PendingIntent.getActivity(context, 9000 + widgetId * 20 + slot, i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }

        private fun spanLabel(span: Int) = when (span) { 3 -> "3 DÍAS"; 7 -> "SEMANA"; else -> "DÍA" }

        private class Rendered(val state: CalendarState, val input: CalendarRenderer.Input, val plan: CalendarRenderer.Plan)

        private fun prepare(context: Context, manager: AppWidgetManager, widgetId: Int, allowNetwork: Boolean): Rendered {
            val state = CalendarWidgetData.load(context, widgetId, allowNetwork)
            val size = WidgetTheme.sizeDp(manager.getAppWidgetOptions(widgetId), 250, 250)
            val input = CalendarRenderer.Input(
                state.days, state.dayInputs, state.layout, state.config, state.span,
                if (state.todayInRange) state.now.get(Calendar.HOUR_OF_DAY) * 60 + state.now.get(Calendar.MINUTE) else null,
                state.nextId, CalendarWidgetData.savedScroll(context, widgetId),
                (size.first - CHROME_W).toFloat().coerceAtLeast(120f),
                (size.second - CHROME_H - (if (state.toolsOpen) TOOLS_H else 0)).toFloat().coerceAtLeast(80f),
                state.colorMode
            )
            return Rendered(state, input, CalendarRenderer.plan(input))
        }

        /** The parts of the widget that change with the data (also sent alone as a partial update). */
        private fun populate(context: Context, views: RemoteViews, r: Rendered, widgetId: Int) {
            val s = r.state
            views.setImageViewBitmap(R.id.calendar_grid, CalendarRenderer.render(context.resources.displayMetrics.density, r.input, r.plan))
            views.setTextViewText(R.id.calendar_title, s.title)
            views.setTextViewText(R.id.calendar_subtitle, s.subtitle)
            views.setTextViewText(R.id.calendar_span_text, spanLabel(s.span))
            views.setViewVisibility(R.id.calendar_today_btn, if (s.todayInRange) View.GONE else View.VISIBLE)
            views.setViewVisibility(R.id.calendar_up_btn, if (r.plan.scroll > 1f) View.VISIBLE else View.GONE)
            views.setViewVisibility(R.id.calendar_down_btn, if (r.plan.scroll < r.plan.maxScroll - 1f) View.VISIBLE else View.GONE)

            // Tools row: zoom and the colour of the blocks. The chosen colour chip is lit.
            views.setViewVisibility(R.id.calendar_tools_row, if (s.toolsOpen) View.VISIBLE else View.GONE)
            views.setTextViewText(R.id.calendar_zoom_text, "${Math.round(s.zoom * 100)}%")
            views.setFloat(R.id.calendar_zoom_out_btn, "setAlpha", if (s.zoom > CalendarLayout.ZOOM_MIN + 0.01f) 1f else 0.35f)
            views.setFloat(R.id.calendar_zoom_in_btn, "setAlpha", if (s.zoom < CalendarLayout.ZOOM_MAX - 0.01f) 1f else 0.35f)
            val chips = listOf(
                Triple("OWN", R.id.calendar_color_own, R.id.calendar_color_own_text),
                Triple("TRAIT", R.id.calendar_color_trait, R.id.calendar_color_trait_text),
                Triple("IMPORTANCE", R.id.calendar_color_importance, R.id.calendar_color_importance_text)
            )
            for ((mode, box, text) in chips) {
                val on = s.colorMode == mode
                views.setInt(box, "setBackgroundResource", if (on) R.drawable.widget_calendar_chip_on else R.drawable.widget_calendar_chip_off)
                views.setTextColor(text, if (on) Color.WHITE else Color.argb(150, 255, 255, 255))
            }
            views.setInt(R.id.calendar_tools_btn, "setBackgroundResource", if (s.toolsOpen) R.drawable.widget_calendar_chip_on else R.drawable.widget_routine_btn_bg)

            // Tap a block → its info card. Placing views from code needs Android 12; older launchers keep "tap = open the app".
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val rects = CalendarRenderer.hitRects(r.input, r.plan)
                val dip = TypedValue.COMPLEX_UNIT_DIP
                HIT_IDS.forEachIndexed { slot, id ->
                    val hit = rects.getOrNull(slot)
                    if (hit == null) {
                        views.setViewVisibility(id, View.GONE)
                    } else {
                        val (ev, rect) = hit
                        views.setViewVisibility(id, View.VISIBLE)
                        views.setViewLayoutWidth(id, rect.width(), dip)
                        views.setViewLayoutHeight(id, rect.height(), dip)
                        views.setViewLayoutMargin(id, RemoteViews.MARGIN_START, rect.left, dip)
                        views.setViewLayoutMargin(id, RemoteViews.MARGIN_TOP, rect.top, dip)
                        views.setOnClickPendingIntent(id, infoIntent(context, widgetId, slot, ev, s.dayInputs[ev.day].key, s.config.use24h))
                    }
                }
            }
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
                manager.updateAppWidget(widgetId, ProGate.lockedViews(context, widgetId, "Lux · Calendario"))
                return
            }

            val onMain = Looper.myLooper() == Looper.getMainLooper()
            val r = prepare(context, manager, widgetId, allowNetwork = !onMain)
            if (!r.state.hasSource && onMain) {
                // Nothing cached yet (first run): fetch off the main thread, then redraw.
                Thread { try { updateWidget(context, manager, widgetId) } catch (e: Exception) { Log.e(TAG, "first load failed: ${e.message}") } }.start()
            }

            val views = RemoteViews(context.packageName, R.layout.widget_calendar)
            WidgetTheme.apply(context, views, R.id.calendar_background, manager, widgetId, CalendarWidgetProvider::class.java.name, default = WidgetTheme.Style.MIDNIGHT)
            populate(context, views, r, widgetId)

            val open = openApp(context, widgetId)
            views.setOnClickPendingIntent(R.id.calendar_grid, open)
            views.setOnClickPendingIntent(R.id.calendar_title_box, open)
            views.setOnClickPendingIntent(R.id.calendar_prev_btn, broadcast(context, ACTION_PREV, widgetId, 1))
            views.setOnClickPendingIntent(R.id.calendar_next_btn, broadcast(context, ACTION_NEXT, widgetId, 2))
            views.setOnClickPendingIntent(R.id.calendar_today_btn, broadcast(context, ACTION_TODAY, widgetId, 3))
            views.setOnClickPendingIntent(R.id.calendar_span_btn, broadcast(context, ACTION_SPAN, widgetId, 4))
            views.setOnClickPendingIntent(R.id.calendar_up_btn, broadcast(context, ACTION_SCROLL_UP, widgetId, 5))
            views.setOnClickPendingIntent(R.id.calendar_down_btn, broadcast(context, ACTION_SCROLL_DOWN, widgetId, 6))
            views.setOnClickPendingIntent(R.id.calendar_zoom_in_btn, broadcast(context, ACTION_ZOOM_IN, widgetId, 7))
            views.setOnClickPendingIntent(R.id.calendar_zoom_out_btn, broadcast(context, ACTION_ZOOM_OUT, widgetId, 8))
            views.setOnClickPendingIntent(R.id.calendar_zoom_text, broadcast(context, ACTION_ZOOM_RESET, widgetId, 9))
            views.setOnClickPendingIntent(R.id.calendar_tools_btn, broadcast(context, ACTION_TOOLS, widgetId, 10))
            views.setOnClickPendingIntent(R.id.calendar_color_own, broadcast(context, ACTION_COLOR, widgetId, 11, "OWN"))
            views.setOnClickPendingIntent(R.id.calendar_color_trait, broadcast(context, ACTION_COLOR, widgetId, 12, "TRAIT"))
            views.setOnClickPendingIntent(R.id.calendar_color_importance, broadcast(context, ACTION_COLOR, widgetId, 13, "IMPORTANCE"))

            manager.updateAppWidget(widgetId, views)
            Log.d(TAG, "updated widget $widgetId span=${r.state.span} offset=${r.state.offset} events=${r.state.layout.events.size} scroll=${r.plan.scroll}")
        }

        /** Full redraw plus a partial one: some launchers keep the old view after a click-triggered full update. */
        private fun redraw(context: Context, widgetId: Int) {
            val app = context.applicationContext
            val manager = AppWidgetManager.getInstance(app)
            updateWidget(app, manager, widgetId)
            if (!ProGate.isPro(app)) return // locked card: nothing to patch
            try {
                val r = prepare(app, manager, widgetId, allowNetwork = false)
                val partial = RemoteViews(app.packageName, R.layout.widget_calendar)
                populate(app, partial, r, widgetId)
                manager.partiallyUpdateAppWidget(widgetId, partial)
            } catch (e: Exception) {
                Log.e(TAG, "partial update failed: ${e.message}")
            }
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
        if (RoutineWidgetProvider.widgetIds(context).isEmpty()) RoutineAlarms.cancel(context)
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        val editor = context.getSharedPreferences(RoutineWidgetData.PREFS_WIDGET, Context.MODE_PRIVATE).edit()
        for (id in appWidgetIds) {
            editor.remove("calendar_span_widget_$id").remove("calendar_offset_widget_$id").remove("calendar_scroll_widget_$id").remove("widget_background_opacity_$id")
                .remove("calendar_zoom_widget_$id").remove("calendar_color_widget_$id").remove("calendar_tools_widget_$id")
        }
        editor.apply()
    }

    override fun onAppWidgetOptionsChanged(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, newOptions: Bundle) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        updateWidget(context, appWidgetManager, appWidgetId)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val action = intent.action ?: return
        when (action) {
            ACTION_REFRESH, Intent.ACTION_DATE_CHANGED, Intent.ACTION_TIME_CHANGED, Intent.ACTION_TIMEZONE_CHANGED -> {
                val pending = goAsync()
                Thread { try { refreshAll(context) } finally { pending.finish() } }.start()
            }
            ACTION_PREV, ACTION_NEXT, ACTION_TODAY, ACTION_SPAN, ACTION_SCROLL_UP, ACTION_SCROLL_DOWN,
            ACTION_ZOOM_IN, ACTION_ZOOM_OUT, ACTION_ZOOM_RESET, ACTION_TOOLS, ACTION_COLOR -> {
                val id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
                if (id == AppWidgetManager.INVALID_APPWIDGET_ID) return
                val pending = goAsync()
                Thread {
                    try {
                        handle(context.applicationContext, id, action, intent.getStringExtra(EXTRA_COLOR_MODE))
                        redraw(context, id)
                    } catch (e: Exception) {
                        Log.e(TAG, "action $action failed: ${e.message}", e)
                    } finally {
                        pending.finish()
                    }
                }.start()
            }
        }
    }

    private fun handle(context: Context, id: Int, action: String, colorMode: String? = null) {
        val prefs = context.getSharedPreferences(RoutineWidgetData.PREFS_WIDGET, Context.MODE_PRIVATE)
        val config = RoutineConfig.fromJson(context.getSharedPreferences(RoutineWidgetData.PREFS_ROUTINE, Context.MODE_PRIVATE).getString(RoutineWidgetData.KEY_CONFIG, null))
        val span = CalendarWidgetData.spanOf(context, id, config)
        val offset = CalendarWidgetData.offsetOf(context, id)
        val editor = prefs.edit()
        when (action) {
            ACTION_PREV -> editor.putInt("calendar_offset_widget_$id", offset - span).remove("calendar_scroll_widget_$id")
            ACTION_NEXT -> editor.putInt("calendar_offset_widget_$id", offset + span).remove("calendar_scroll_widget_$id")
            ACTION_TODAY -> editor.putInt("calendar_offset_widget_$id", 0).remove("calendar_scroll_widget_$id")
            ACTION_SPAN -> {
                val next = when (span) { 1 -> 3; 3 -> 7; else -> 1 }
                editor.putInt("calendar_span_widget_$id", next).remove("calendar_scroll_widget_$id")
            }
            ACTION_SCROLL_UP, ACTION_SCROLL_DOWN -> {
                // Page through the grid: one step is 70% of what is visible.
                val manager = AppWidgetManager.getInstance(context)
                val r = prepare(context, manager, id, allowNetwork = false)
                val step = r.plan.viewportH * 0.7f
                val target = if (action == ACTION_SCROLL_DOWN) r.plan.scroll + step else r.plan.scroll - step
                editor.putFloat("calendar_scroll_widget_$id", target.coerceIn(0f, r.plan.maxScroll))
            }
            ACTION_ZOOM_IN, ACTION_ZOOM_OUT, ACTION_ZOOM_RESET -> {
                val manager = AppWidgetManager.getInstance(context)
                val r = prepare(context, manager, id, allowNetwork = false)
                val oldZoom = r.state.zoom
                val newZoom = when (action) {
                    ACTION_ZOOM_IN -> CalendarLayout.clampZoom(oldZoom * ZOOM_STEP)
                    ACTION_ZOOM_OUT -> CalendarLayout.clampZoom(oldZoom / ZOOM_STEP)
                    else -> 1f
                }
                if (Math.abs(newZoom - oldZoom) > 0.001f) {
                    // Keep what is in the middle of the screen in the middle: zoom around the visible centre (or "now" when it is on screen).
                    val plan = r.plan
                    val oldPerMin = r.state.layout.dpPerMin
                    val centreMin = (plan.scroll + plan.viewportH / 2f) / oldPerMin
                    val newPerMin = CalendarLayout.dpPerHour(r.state.span, newZoom) / 60f
                    val newHeight = 24f * CalendarLayout.dpPerHour(r.state.span, newZoom)
                    val newMax = (newHeight + 6f - plan.viewportH).coerceAtLeast(0f)
                    CalendarWidgetData.saveZoom(editor, id, newZoom)
                    editor.putFloat("calendar_scroll_widget_$id", (centreMin * newPerMin - plan.viewportH / 2f).coerceIn(0f, newMax))
                }
            }
            ACTION_TOOLS -> editor.putBoolean("calendar_tools_widget_$id", !CalendarWidgetData.toolsOpenOf(context, id))
            ACTION_COLOR -> {
                val mode = if (colorMode == "TRAIT" || colorMode == "IMPORTANCE") colorMode else "OWN"
                CalendarWidgetData.saveColorMode(editor, id, mode)
            }
        }
        editor.apply()
    }
}
