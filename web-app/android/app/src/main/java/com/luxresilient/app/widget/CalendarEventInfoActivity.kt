package com.luxresilient.app.widget

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import com.google.gson.JsonObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * What a tap on a block of the calendar widget shows: a small glass card with the item's info (what it is, when,
 * how long, how important, streak / progress / difficulty…) and two actions — complete it, or open it in Lux.
 * It is a translucent activity so it floats over the home screen like a dialog.
 */
class CalendarEventInfoActivity : Activity() {

    companion object {
        const val X_TITLE = "cal_title"
        const val X_SUBTITLE = "cal_subtitle"
        const val X_KIND = "cal_kind"
        const val X_START = "cal_start"
        const val X_END = "cal_end"
        const val X_DURATION = "cal_duration"
        const val X_COLOR = "cal_color"
        const val X_DONE = "cal_done"
        const val X_OVERRIDDEN = "cal_overridden"
        const val X_DAY_KEY = "cal_day_key"
        const val X_IMPORTANCE = "cal_importance"
        const val X_USE24H = "cal_use24h"
        const val X_QUANTITY = "cal_quantity"
        const val X_SLOT_AMOUNT = "cal_slot_amount"
        const val X_HABIT_ID = "cal_habit_id"
        const val X_SUBTASK_ID = "cal_subtask_id"
        const val X_TASK_ID = "cal_task_id"
        const val X_PROJECT_ID = "cal_project_id"
        const val X_REMINDER_ID = "cal_reminder_id"
        private val IMPORTANCE_LABEL = listOf("Leve", "Normal", "Alta", "Crítica")
    }

    private fun dp(v: Float) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, resources.displayMetrics)
    private fun dpi(v: Float) = dp(v).toInt()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            setContentView(build(intent))
        } catch (e: Exception) {
            Log.e("CalendarEventInfo", "could not show info: ${e.message}", e)
            finish()
        }
    }

    private fun text(value: String, size: Float, color: Int, bold: Boolean = false, black: Boolean = false): TextView = TextView(this).apply {
        text = value
        setTextSize(TypedValue.COMPLEX_UNIT_SP, size)
        setTextColor(color)
        typeface = when {
            black -> Typeface.create("sans-serif-black", Typeface.NORMAL)
            bold -> Typeface.create("sans-serif-medium", Typeface.BOLD)
            else -> Typeface.create("sans-serif-medium", Typeface.NORMAL)
        }
        includeFontPadding = false
    }

    private fun pill(label: String, tint: Int): TextView = text(label.uppercase(Locale("es")), 9.5f, tint, black = true).apply {
        letterSpacing = 0.08f
        setPadding(dpi(9f), dpi(5f), dpi(9f), dpi(5f))
        background = GradientDrawable().apply { cornerRadius = dp(20f); setColor(Color.argb(46, Color.red(tint), Color.green(tint), Color.blue(tint))) }
    }

    private fun clock(minutes: Int, use24h: Boolean): String {
        val m = minutes % 1440
        return RoutineEngine.formatClockInline(String.format(Locale.US, "%02d:%02d", m / 60, m % 60), use24h)
    }

    private fun build(i: Intent): View {
        val title = i.getStringExtra(X_TITLE) ?: ""
        val subtitle = i.getStringExtra(X_SUBTITLE)
        val kind = i.getStringExtra(X_KIND) ?: RoutineKind.HABIT
        val start = i.getIntExtra(X_START, 0)
        val end = i.getIntExtra(X_END, start)
        val duration = i.getIntExtra(X_DURATION, 30)
        val color = i.getIntExtra(X_COLOR, Color.parseColor("#6366f1"))
        val done = i.getBooleanExtra(X_DONE, false)
        val overridden = i.getBooleanExtra(X_OVERRIDDEN, false)
        val dayKey = i.getStringExtra(X_DAY_KEY) ?: RoutineEngine.dayKey(Calendar.getInstance())
        val importance = i.getIntExtra(X_IMPORTANCE, 0)
        val use24h = i.getBooleanExtra(X_USE24H, false)
        val isToday = dayKey == RoutineEngine.dayKey(Calendar.getInstance())
        val soft = Color.argb(160, 255, 255, 255)

        val dayLabel = try {
            val d = SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(dayKey)!!
            SimpleDateFormat("EEEE d 'de' MMMM", Locale("es")).format(d).replaceFirstChar { it.uppercase(Locale("es")) }
        } catch (_: Exception) { dayKey }

        val kindLabel = when (kind) {
            RoutineKind.TASK -> "Tarea"
            RoutineKind.SUBHABIT -> "Subtarea"
            RoutineKind.PROJECT -> "Proyecto"
            RoutineKind.JOURNAL -> if (i.getStringExtra(X_REMINDER_ID) != null) "Recordatorio" else "Journal"
            else -> "Hábito"
        }
        val kindEmoji = when (kind) { RoutineKind.TASK -> "✅"; RoutineKind.PROJECT -> "🎯"; RoutineKind.JOURNAL -> "📓"; else -> "🔥" }

        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dpi(20f), dpi(18f), dpi(20f), dpi(16f))
            background = GradientDrawable(GradientDrawable.Orientation.TL_BR, intArrayOf(Color.parseColor("#F2161A2B"), Color.parseColor("#F20B0D18"))).apply {
                cornerRadius = dp(28f)
                setStroke(dpi(1f), Color.argb(70, 255, 255, 255))
            }
            elevation = dp(18f)
        }

        // Header: coloured emblem + title
        val header = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        val emblem = FrameLayout(this).apply {
            background = GradientDrawable().apply { cornerRadius = dp(15f); setColor(Color.argb(60, Color.red(color), Color.green(color), Color.blue(color))); setStroke(dpi(1f), Color.argb(120, Color.red(color), Color.green(color), Color.blue(color))) }
            addView(text(kindEmoji, 20f, Color.WHITE).apply { gravity = Gravity.CENTER }, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT, Gravity.CENTER))
        }
        header.addView(emblem, LinearLayout.LayoutParams(dpi(46f), dpi(46f)))
        val titles = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        titles.addView(text(kindLabel.uppercase(Locale("es")), 9.5f, color, black = true).apply { letterSpacing = 0.14f })
        titles.addView(text(title, 18f, if (done) Color.argb(120, 255, 255, 255) else Color.WHITE, black = true).apply {
            if (done) paintFlags = paintFlags or android.graphics.Paint.STRIKE_THRU_TEXT_FLAG
            maxLines = 3
            setPadding(0, dpi(3f), 0, 0)
        })
        header.addView(titles, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { marginStart = dpi(12f) })
        card.addView(header)

        // Chips
        val chips = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; setPadding(0, dpi(12f), 0, 0) }
        fun addChip(v: View) { chips.addView(v, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { marginEnd = dpi(6f) }) }
        addChip(pill(if (done) "Hecho" else "Pendiente", if (done) Color.parseColor("#34D399") else Color.parseColor("#7DD3FC")))
        if (importance in 1..4) addChip(pill(IMPORTANCE_LABEL[importance - 1], Color.parseColor(RoutineEngine.IMPORTANCE_COLORS[importance - 1])))
        if (overridden) addChip(pill("Movido", Color.parseColor("#FCD34D")))
        card.addView(chips)

        // Rows
        fun row(emoji: String, value: String) {
            val r = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; setPadding(0, dpi(10f), 0, 0) }
            r.addView(text(emoji, 14f, Color.WHITE), LinearLayout.LayoutParams(dpi(24f), ViewGroup.LayoutParams.WRAP_CONTENT))
            r.addView(text(value, 13f, soft, bold = true), LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            card.addView(r)
        }
        val durText = if (duration >= 60) "${duration / 60} h${if (duration % 60 != 0) " ${duration % 60} min" else ""}" else "$duration min"
        row("🕒", "${clock(start, use24h)} – ${clock(end, use24h)}  ·  $durText")
        row("📅", dayLabel)
        if (!subtitle.isNullOrBlank()) row("🏷️", subtitle)
        extraRows(i, kind).forEach { (emoji, v) -> row(emoji, v) }

        // Actions
        val actions = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; setPadding(0, dpi(16f), 0, 0) }
        val canComplete = isToday && (kind == RoutineKind.HABIT || kind == RoutineKind.SUBHABIT || kind == RoutineKind.TASK)
        val primary = text(if (done) "Desmarcar" else if (i.getBooleanExtra(X_QUANTITY, false)) "+ Añadir" else "Completar", 13f, Color.parseColor("#06121F"), black = true).apply {
            gravity = Gravity.CENTER
            background = GradientDrawable().apply { cornerRadius = dp(18f); setColor(color) }
            setTextColor(if ((0.299 * Color.red(color) + 0.587 * Color.green(color) + 0.114 * Color.blue(color)) / 255 > 0.66) Color.parseColor("#10131A") else Color.WHITE)
        }
        val open = text("Abrir en Lux", 13f, Color.WHITE, black = true).apply {
            gravity = Gravity.CENTER
            background = GradientDrawable().apply { cornerRadius = dp(18f); setColor(Color.argb(30, 255, 255, 255)); setStroke(dpi(1f), Color.argb(40, 255, 255, 255)) }
        }
        if (canComplete) {
            actions.addView(primary, LinearLayout.LayoutParams(0, dpi(46f), 1f).apply { marginEnd = dpi(8f) })
            primary.setOnClickListener { complete(i, kind, done); finish() }
        }
        actions.addView(open, LinearLayout.LayoutParams(0, dpi(46f), 1f))
        open.setOnClickListener { openApp(i, kind, dayKey); finish() }
        card.addView(actions)

        val scroll = ScrollView(this).apply { isVerticalScrollBarEnabled = false; addView(card) }
        val root = FrameLayout(this).apply {
            setBackgroundColor(Color.argb(150, 0, 0, 0))
            setOnClickListener { finish() }
            val lp = FrameLayout.LayoutParams(minOf(dpi(340f), resources.displayMetrics.widthPixels - dpi(32f)), ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER)
            addView(scroll, lp)
        }
        card.setOnClickListener { /* swallow taps so the card does not dismiss itself */ }
        return root
    }

    /** Extra facts read from the cached data: streak, quantity progress, difficulty, repeat… */
    private fun extraRows(i: Intent, kind: String): List<Pair<String, String>> {
        val out = ArrayList<Pair<String, String>>()
        try {
            val client = SupabaseWidgetClient(this)
            fun find(collection: String, id: String?): JsonObject? {
                id ?: return null
                val arr = client.readRawCollection(collection, false) ?: return null
                return arr.mapNotNull { it.takeIf { e -> e.isJsonObject }?.asJsonObject }.firstOrNull { it.get("id")?.asString == id }
            }
            when (kind) {
                RoutineKind.HABIT, RoutineKind.SUBHABIT -> find("habits", i.getStringExtra(X_HABIT_ID))?.let { h ->
                    val streak = h.get("streak")?.takeIf { it.isJsonPrimitive }?.asInt ?: 0
                    if (streak > 0) out.add("🔥" to "Racha de $streak ${if (streak == 1) "día" else "días"}")
                    if (h.get("type")?.asString == "QUANTITY") {
                        val cur = h.get("currentValue")?.takeIf { it.isJsonPrimitive }?.asDouble ?: 0.0
                        val target = h.get("targetValue")?.takeIf { it.isJsonPrimitive }?.asDouble ?: 0.0
                        val unit = h.get("unit")?.takeIf { it.isJsonPrimitive }?.asString ?: ""
                        if (target > 0) out.add("📊" to "${cur.toInt()} / ${target.toInt()} $unit".trim())
                    }
                    if (i.getStringExtra(X_SUBTASK_ID) != null) out.add("↳" to "Subtarea de «${h.get("title")?.asString ?: ""}»")
                }
                RoutineKind.TASK -> find("quests", i.getStringExtra(X_TASK_ID))?.let { q ->
                    q.get("difficulty")?.takeIf { it.isJsonPrimitive }?.asString?.let { d -> out.add("⚔️" to "Dificultad $d") }
                    val xp = q.get("xpReward")?.takeIf { it.isJsonPrimitive }?.asInt
                    val gold = q.get("gold")?.takeIf { it.isJsonPrimitive }?.asInt
                    if (xp != null) out.add("✨" to "$xp XP${if (gold != null) "  ·  $gold oro" else ""}")
                    q.get("description")?.takeIf { it.isJsonPrimitive }?.asString?.takeIf { it.isNotBlank() }?.let { d -> out.add("📝" to d.take(140)) }
                }
                RoutineKind.JOURNAL -> {
                    val id = i.getStringExtra(X_REMINDER_ID)
                    if (id != null) {
                        val prefs = getSharedPreferences(RoutineWidgetData.PREFS_ROUTINE, Context.MODE_PRIVATE)
                        RoutineWidgetData.reminders(prefs).firstOrNull { it.get("id")?.asString == id }?.let { r ->
                            val rep = when (r.get("repeat")?.takeIf { it.isJsonPrimitive }?.asString) {
                                "DAILY" -> "Cada día"; "WEEKLY" -> "Cada semana"; "MONTHLY" -> "Cada mes"; "YEARLY" -> "Cada año"; else -> "Una vez"
                            }
                            out.add("🔁" to rep)
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.w("CalendarEventInfo", "extra info failed: ${e.message}")
        }
        return out
    }

    private fun complete(i: Intent, kind: String, done: Boolean) {
        val action = when (kind) {
            RoutineKind.HABIT -> if (i.getBooleanExtra(X_QUANTITY, false)) (if (done) RoutineTap.OPEN else RoutineTap.ADD_QUANTITY) else RoutineTap.TOGGLE_HABIT
            RoutineKind.SUBHABIT -> RoutineTap.TOGGLE_SUBTASK
            RoutineKind.TASK -> if (done) RoutineTap.OPEN else RoutineTap.COMPLETE_TASK
            else -> RoutineTap.OPEN
        }
        val tap = Intent(this, RoutineActionActivity::class.java).apply {
            putExtra(RoutineTap.EXTRA_ACTION, action)
            i.getStringExtra(X_HABIT_ID)?.let { putExtra(RoutineTap.EXTRA_HABIT_ID, it) }
            i.getStringExtra(X_SUBTASK_ID)?.let { putExtra(RoutineTap.EXTRA_SUBTASK_ID, it) }
            i.getStringExtra(X_TASK_ID)?.let { putExtra(RoutineTap.EXTRA_TASK_ID, it) }
            putExtra(RoutineTap.EXTRA_AMOUNT, i.getIntExtra(X_SLOT_AMOUNT, 1))
            putExtra(RoutineTap.EXTRA_WILL_BE_DONE, !done)
        }
        startActivity(tap)
    }

    private fun openApp(i: Intent, kind: String, dayKey: String) {
        val url = when {
            kind == RoutineKind.PROJECT && i.getStringExtra(X_PROJECT_ID) != null -> "luxapp://focus-session?projectId=${Uri.encode(i.getStringExtra(X_PROJECT_ID))}"
            kind == RoutineKind.JOURNAL && i.getStringExtra(X_REMINDER_ID) == null -> "luxapp://journal?date=$dayKey"
            else -> "luxapp://routine?view=calendar"
        }
        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).setPackage(packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP))
    }
}
