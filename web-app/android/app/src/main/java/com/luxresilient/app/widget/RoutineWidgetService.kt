package com.luxresilient.app.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.luxresilient.app.R

class RoutineWidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        val widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        return RoutineWidgetFactory(applicationContext, widgetId)
    }
}

/** Actions a tap on a card can ask for; RoutineActionActivity carries them out. */
object RoutineTap {
    const val EXTRA_ACTION = "routine_action"
    const val EXTRA_HABIT_ID = "routine_habit_id"
    const val EXTRA_SUBTASK_ID = "routine_subtask_id"
    const val EXTRA_TASK_ID = "routine_task_id"
    const val EXTRA_PROJECT_ID = "routine_project_id"
    const val EXTRA_AMOUNT = "routine_amount"
    const val EXTRA_WILL_BE_DONE = "routine_will_be_done"

    const val OPEN = "OPEN"
    const val OPEN_PROJECT = "OPEN_PROJECT"
    const val OPEN_JOURNAL = "OPEN_JOURNAL"
    const val TOGGLE_HABIT = "TOGGLE_HABIT"
    const val TOGGLE_SUBTASK = "TOGGLE_SUBTASK"
    const val ADD_QUANTITY = "ADD_QUANTITY"
    const val COMPLETE_TASK = "COMPLETE_TASK"
}

class RoutineWidgetFactory(private val context: Context, private val widgetId: Int) : RemoteViewsService.RemoteViewsFactory {

    private var snapshot: RoutineWidgetData.Snapshot? = null
    private var zoom = 1f
    private var colorMode = "OWN"

    override fun onCreate() {}

    override fun onDataSetChanged() {
        try {
            snapshot = RoutineWidgetData.load(context, widgetId, allowNetwork = true)
            val wp = context.getSharedPreferences(RoutineWidgetData.PREFS_WIDGET, Context.MODE_PRIVATE)
            zoom = RoutineWidgetLook.zoom(wp, widgetId)
            colorMode = RoutineWidgetLook.colorMode(context, wp, widgetId)
        } catch (e: Exception) {
            Log.e("RoutineWidgetFactory", "load failed: ${e.message}", e)
        }
    }

    override fun onDestroy() {
        snapshot = null
    }

    override fun getCount(): Int = snapshot?.rows?.size ?: 0

    override fun getViewAt(position: Int): RemoteViews {
        val snap = snapshot
        val row = snap?.rows?.getOrNull(position)
        if (snap == null || row == null) return RemoteViews(context.packageName, R.layout.widget_routine_now).apply { setViewVisibility(R.id.routine_now_clock, View.INVISIBLE) }
        return when (row) {
            is RoutineRow.Header -> headerView(row)
            is RoutineRow.NowMarker -> nowView(row)
            is RoutineRow.Card -> cardView(row, snap.config)
        }
    }

    private fun headerView(row: RoutineRow.Header): RemoteViews {
        val v = RemoteViews(context.packageName, R.layout.widget_routine_section)
        v.setTextViewText(R.id.routine_section_emoji, row.emoji)
        v.setTextViewText(R.id.routine_section_label, row.label.uppercase())
        v.setTextColor(R.id.routine_section_label, row.tint)
        v.setInt(R.id.routine_section_line, "setColorFilter", row.tint)
        v.setTextViewText(R.id.routine_section_count, "${row.done}/${row.total}")
        return v
    }

    private fun nowView(row: RoutineRow.NowMarker): RemoteViews {
        val v = RemoteViews(context.packageName, R.layout.widget_routine_now)
        // The column is narrow: show the clock without AM/PM.
        v.setTextViewText(R.id.routine_now_clock, row.clock.substringBefore(" "))
        val rose = Color.parseColor("#FB7185")
        v.setInt(R.id.routine_now_line, "setColorFilter", rose)
        v.setInt(R.id.routine_now_dot, "setColorFilter", rose)
        v.setInt(R.id.routine_now_halo, "setColorFilter", rose)
        return v
    }

    private fun dp(v: Float): Int = (v * context.resources.displayMetrics.density).toInt()

    /** Zoom: bigger text and padding; longer blocks get taller cards, like the calendar in the app. */
    private fun applyZoom(v: RemoteViews, item: RoutineItem) {
        val sp = android.util.TypedValue.COMPLEX_UNIT_SP
        v.setTextViewTextSize(R.id.routine_title, sp, 13f * zoom)
        v.setTextViewTextSize(R.id.routine_chip_time, sp, 9.5f * zoom)
        v.setTextViewTextSize(R.id.routine_subtitle, sp, 8.5f * zoom)
        v.setTextViewTextSize(R.id.routine_time_main, sp, 11f * zoom)
        v.setTextViewTextSize(R.id.routine_time_suffix, sp, 7.5f * zoom)
        val pad = dp(8f * zoom)
        v.setViewPadding(R.id.routine_card_inner, dp(10f), pad, dp(8f), pad)
        val minutes = item.durationMin.coerceIn(15, 240)
        v.setInt(R.id.routine_title, "setMinHeight", dp(minutes * 0.26f * zoom))
    }

    private fun withAlpha(color: Int, alpha: Float): Int = Color.argb((255 * alpha).toInt().coerceIn(0, 255), Color.red(color), Color.green(color), Color.blue(color))

    private fun cardView(row: RoutineRow.Card, config: RoutineConfig): RemoteViews {
        val item = row.item
        val v = RemoteViews(context.packageName, R.layout.widget_routine_item)
        val c = RoutineEngine.colorForMode(item, colorMode)
        applyZoom(v, item)
        val done = item.done
        val dim = 0.4f

        // ── Time column ──
        if (config.timeLeft) {
            v.setViewVisibility(R.id.routine_time_col, View.VISIBLE)
            if (item.time != null) {
                val (main, suffix) = RoutineEngine.formatClock(item.time, config.use24h)
                v.setTextViewText(R.id.routine_time_main, main)
                v.setTextColor(R.id.routine_time_main, if (done) Color.parseColor("#40FFFFFF") else Color.parseColor("#CCFFFFFF"))
                v.setTextViewText(R.id.routine_time_suffix, suffix)
                v.setViewVisibility(R.id.routine_time_suffix, if (suffix.isEmpty()) View.GONE else View.VISIBLE)
                v.setTextColor(R.id.routine_time_suffix, if (done) Color.parseColor("#26FFFFFF") else Color.parseColor("#59FFFFFF"))
            } else {
                v.setTextViewText(R.id.routine_time_main, "—")
                v.setTextColor(R.id.routine_time_main, Color.parseColor("#33FFFFFF"))
                v.setViewVisibility(R.id.routine_time_suffix, View.GONE)
            }
        } else {
            v.setViewVisibility(R.id.routine_time_col, View.GONE)
        }

        // ── Rail dot ──
        v.setInt(R.id.routine_dot_ring, "setColorFilter", c)
        v.setInt(R.id.routine_dot_fill, "setColorFilter", c)
        v.setViewVisibility(R.id.routine_dot_fill, if (done) View.VISIBLE else View.GONE)
        val pulse = row.isNext && !done
        v.setViewVisibility(R.id.routine_dot_halo, if (pulse) View.VISIBLE else View.GONE)
        if (pulse) v.setInt(R.id.routine_dot_halo, "setColorFilter", c)

        // ── Card surface ──
        if (done) {
            v.setImageViewResource(R.id.routine_card_bg, R.drawable.widget_routine_card_bg_done)
            v.setViewVisibility(R.id.routine_card_glow, View.GONE)
            v.setViewVisibility(R.id.routine_card_border, View.GONE)
            v.setInt(R.id.routine_accent, "setColorFilter", c)
            v.setInt(R.id.routine_accent, "setImageAlpha", 90)
        } else {
            v.setImageViewResource(R.id.routine_card_bg, R.drawable.widget_routine_card_bg)
            v.setViewVisibility(R.id.routine_card_glow, View.VISIBLE)
            v.setInt(R.id.routine_card_glow, "setColorFilter", c)
            v.setViewVisibility(R.id.routine_card_border, View.VISIBLE)
            v.setInt(R.id.routine_card_border, "setColorFilter", withAlpha(c, 0.9f))
            v.setInt(R.id.routine_accent, "setColorFilter", c)
            v.setInt(R.id.routine_accent, "setImageAlpha", 255)
        }

        // ── Icon ──
        v.setInt(R.id.routine_icon_bg, "setColorFilter", c)
        v.setInt(R.id.routine_icon_bg, "setImageAlpha", if (done) 70 else 255)
        if (item.emoji != null) {
            v.setViewVisibility(R.id.routine_icon, View.GONE)
            v.setViewVisibility(R.id.routine_emoji, View.VISIBLE)
            v.setTextViewText(R.id.routine_emoji, item.emoji)
            v.setFloat(R.id.routine_emoji, "setAlpha", if (done) 0.5f else 1f)
        } else {
            v.setViewVisibility(R.id.routine_emoji, View.GONE)
            v.setViewVisibility(R.id.routine_icon, View.VISIBLE)
            v.setImageViewResource(R.id.routine_icon, when (item.kind) {
                RoutineKind.TASK -> R.drawable.ic_routine_task
                RoutineKind.PROJECT -> R.drawable.ic_routine_target
                RoutineKind.JOURNAL -> R.drawable.ic_routine_book
                else -> R.drawable.ic_routine_flame
            })
            v.setInt(R.id.routine_icon, "setColorFilter", c)
            v.setInt(R.id.routine_icon, "setImageAlpha", if (done) 130 else 255)
        }

        // ── Text ──
        v.setTextViewText(R.id.routine_title, item.title)
        v.setTextColor(R.id.routine_title, if (done) withAlpha(Color.WHITE, 0.32f) else Color.WHITE)
        v.setInt(R.id.routine_title, "setPaintFlags", if (done) (Paint.STRIKE_THRU_TEXT_FLAG or Paint.ANTI_ALIAS_FLAG) else Paint.ANTI_ALIAS_FLAG)

        val showChip = config.exactTime && item.time != null
        val subtitle = item.subtitle ?: if (!config.exactTime && !config.timeLeft && item.time != null) RoutineEngine.formatClockInline(item.time, config.use24h) else null
        if (showChip) {
            v.setViewVisibility(R.id.routine_chip_time, View.VISIBLE)
            v.setTextViewText(R.id.routine_chip_time, "🕒 " + RoutineEngine.formatClockInline(item.time!!, config.use24h))
            v.setTextColor(R.id.routine_chip_time, if (done) withAlpha(Color.WHITE, 0.3f) else c)
        } else {
            v.setViewVisibility(R.id.routine_chip_time, View.GONE)
        }
        if (subtitle != null) {
            v.setViewVisibility(R.id.routine_subtitle, View.VISIBLE)
            v.setTextViewText(R.id.routine_subtitle, subtitle.uppercase())
            v.setTextColor(R.id.routine_subtitle, if (item.overdue && !done) Color.parseColor("#FDA4AF") else withAlpha(Color.WHITE, 0.35f))
        } else {
            v.setViewVisibility(R.id.routine_subtitle, View.GONE)
        }
        v.setViewVisibility(R.id.routine_meta, if (showChip || subtitle != null) View.VISIBLE else View.GONE)

        // ── Check / action button ──
        val isAction = item.kind == RoutineKind.PROJECT || item.kind == RoutineKind.JOURNAL
        if (done) {
            v.setViewVisibility(R.id.routine_check_fill, View.VISIBLE)
            v.setInt(R.id.routine_check_fill, "setColorFilter", c)
            v.setViewVisibility(R.id.routine_check_ring, View.GONE)
            v.setViewVisibility(R.id.routine_check_icon, View.VISIBLE)
            v.setImageViewResource(R.id.routine_check_icon, R.drawable.ic_routine_check)
            v.setInt(R.id.routine_check_icon, "setColorFilter", Color.WHITE)
        } else {
            v.setViewVisibility(R.id.routine_check_fill, View.GONE)
            v.setViewVisibility(R.id.routine_check_ring, View.VISIBLE)
            v.setInt(R.id.routine_check_ring, "setColorFilter", withAlpha(c, 0.62f))
            if (isAction) {
                v.setViewVisibility(R.id.routine_check_icon, View.VISIBLE)
                v.setImageViewResource(R.id.routine_check_icon, if (item.kind == RoutineKind.PROJECT) R.drawable.ic_routine_play else R.drawable.ic_routine_pen)
                v.setInt(R.id.routine_check_icon, "setColorFilter", c)
            } else {
                v.setViewVisibility(R.id.routine_check_icon, View.GONE)
            }
        }

        // ── Progress ──
        val progress = item.progress
        if (progress != null && !done) {
            v.setViewVisibility(R.id.routine_progress, View.VISIBLE)
            v.setImageViewBitmap(R.id.routine_progress, progressBitmap(progress, c))
        } else {
            v.setViewVisibility(R.id.routine_progress, View.GONE)
        }

        // ── Taps ──
        v.setOnClickFillInIntent(R.id.routine_check, tapIntent(item, true))
        v.setOnClickFillInIntent(R.id.routine_card, tapIntent(item, false))
        return v
    }

    /** What a tap does: the check button acts on the item, the rest of the card opens the app. */
    private fun tapIntent(item: RoutineItem, onCheck: Boolean): Intent {
        val i = Intent()
        val action = if (!onCheck) when (item.kind) {
            RoutineKind.PROJECT -> RoutineTap.OPEN_PROJECT
            RoutineKind.JOURNAL -> RoutineTap.OPEN_JOURNAL
            else -> RoutineTap.OPEN
        } else when (item.kind) {
            RoutineKind.HABIT -> if (item.isQuantity) (if (item.done) RoutineTap.OPEN else RoutineTap.ADD_QUANTITY) else RoutineTap.TOGGLE_HABIT
            RoutineKind.SUBHABIT -> RoutineTap.TOGGLE_SUBTASK
            RoutineKind.TASK -> if (item.done) RoutineTap.OPEN else RoutineTap.COMPLETE_TASK
            RoutineKind.PROJECT -> RoutineTap.OPEN_PROJECT
            RoutineKind.JOURNAL -> RoutineTap.OPEN_JOURNAL
            else -> RoutineTap.OPEN
        }
        i.putExtra(RoutineTap.EXTRA_ACTION, action)
        item.habitId?.let { i.putExtra(RoutineTap.EXTRA_HABIT_ID, it) }
        item.subtaskId?.let { i.putExtra(RoutineTap.EXTRA_SUBTASK_ID, it) }
        item.taskId?.let { i.putExtra(RoutineTap.EXTRA_TASK_ID, it) }
        item.projectId?.let { i.putExtra(RoutineTap.EXTRA_PROJECT_ID, it) }
        i.putExtra(RoutineTap.EXTRA_AMOUNT, item.slotAmount)
        i.putExtra(RoutineTap.EXTRA_WILL_BE_DONE, !item.done)
        return i
    }

    /** Tiny bar (kept small: bitmaps count against the widget's size budget). */
    private fun progressBitmap(progress: Float, color: Int): Bitmap {
        val w = 120
        val h = 4
        val bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        paint.color = Color.argb(20, 255, 255, 255)
        canvas.drawRoundRect(RectF(0f, 0f, w.toFloat(), h.toFloat()), h / 2f, h / 2f, paint)
        paint.color = color
        canvas.drawRoundRect(RectF(0f, 0f, (w * progress.coerceIn(0.04f, 1f)), h.toFloat()), h / 2f, h / 2f, paint)
        return bitmap
    }

    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount(): Int = 3
    override fun getItemId(position: Int): Long = position.toLong()
    override fun hasStableIds(): Boolean = false
}
