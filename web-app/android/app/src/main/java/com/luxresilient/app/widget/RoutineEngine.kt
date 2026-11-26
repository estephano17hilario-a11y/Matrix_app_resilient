package com.luxresilient.app.widget

import android.graphics.Color
import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import java.text.Collator
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/**
 * Native twin of src/modules/routine/routineEngine.ts: turns habits, tasks, projects and journal
 * reminders into one chronological list for a day, with the same rules, so the widget always shows
 * exactly what the Routine screen shows. Pure functions over raw JSON (no Android services).
 */
object RoutineKind {
    const val HABIT = "HABIT"
    const val SUBHABIT = "SUBHABIT"
    const val TASK = "TASK"
    const val PROJECT = "PROJECT"
    const val JOURNAL = "JOURNAL"
}

data class RoutineConfig(
    val showHabits: Boolean = true,
    val showTasks: Boolean = true,
    val showProjects: Boolean = false,
    val showJournal: Boolean = true,
    val showCompleted: Boolean = true,
    val showUntimed: Boolean = true,
    val showOverdue: Boolean = true,
    val groupByPart: Boolean = true,
    val divideByHour: Boolean = false,
    val hourBlock: Int = 2,
    val exactTime: Boolean = false,
    val timeLeft: Boolean = true,
    val habitIcons: Boolean = true,
    val use24h: Boolean = false,
    /** Days the app's calendar view shows at once (1, 3 or 7): the calendar widget starts on it. */
    val calendarSpan: Int = 1,
    /** How the calendar paints blocks: OWN (assigned colour), TRAIT or IMPORTANCE. */
    val calendarColor: String = "OWN"
) {
    companion object {
        /** Parses the JSON the app pushes through WidgetAuthBridge.updateRoutineConfig (defaults for anything missing). */
        fun fromJson(json: String?): RoutineConfig {
            val d = RoutineConfig()
            if (json.isNullOrBlank()) return d
            return try {
                val o = JsonParser.parseString(json).asJsonObject
                fun b(key: String, def: Boolean) = o.get(key)?.takeIf { it.isJsonPrimitive }?.let { runCatching { it.asBoolean }.getOrNull() } ?: def
                RoutineConfig(
                    showHabits = b("showHabits", d.showHabits),
                    showTasks = b("showTasks", d.showTasks),
                    showProjects = b("showProjects", d.showProjects),
                    showJournal = b("showJournal", d.showJournal),
                    showCompleted = b("showCompleted", d.showCompleted),
                    showUntimed = b("showUntimed", d.showUntimed),
                    showOverdue = b("showOverdue", d.showOverdue),
                    groupByPart = b("groupByPart", d.groupByPart),
                    divideByHour = b("divideByHour", d.divideByHour),
                    hourBlock = (o.get("hourBlock")?.takeIf { it.isJsonPrimitive }?.let { runCatching { it.asDouble.toInt() }.getOrNull() } ?: d.hourBlock).coerceIn(1, 6),
                    exactTime = b("exactTime", d.exactTime),
                    timeLeft = b("timeLeft", d.timeLeft),
                    habitIcons = b("habitIcons", d.habitIcons),
                    use24h = b("use24h", d.use24h),
                    calendarSpan = (o.get("calendarSpan")?.takeIf { it.isJsonPrimitive }?.let { runCatching { it.asDouble.toInt() }.getOrNull() } ?: d.calendarSpan)
                        .let { if (it == 3 || it == 7) it else 1 },
                    calendarColor = o.get("calendarColor")?.takeIf { it.isJsonPrimitive }?.asString?.takeIf { it == "TRAIT" || it == "IMPORTANCE" } ?: "OWN"
                )
            } catch (_: Exception) {
                d
            }
        }
    }
}

data class RoutineItem(
    val id: String,
    val kind: String,
    val title: String,
    val subtitle: String?,
    /** "HH:mm" or null. */
    val time: String?,
    val minutes: Int?,
    val done: Boolean,
    val color: Int,
    val overdue: Boolean = false,
    val isQuantity: Boolean = false,
    /** 0..1 when the item has measurable progress. */
    val progress: Float? = null,
    val emoji: String? = null,
    val habitId: String? = null,
    val subtaskId: String? = null,
    val taskId: String? = null,
    val projectId: String? = null,
    /** Amount a tap adds to a quantity habit (a fixed slot's amount, else 1). */
    val slotAmount: Int = 1,
    /** Length of its block in the calendar, in minutes. */
    val durationMin: Int = 30,
    /** Moved to another hour for this day only. */
    val overridden: Boolean = false,
    /** The colour the user assigned / the trait colour / how important (1..4, 0 = unrated). */
    val colorOwn: Int? = null,
    val colorTrait: Int? = null,
    val importance: Int = 0,
    /** A reminder pinned on the Journal calendar. */
    val reminderId: String? = null
)

enum class DayPart { MORNING, AFTERNOON, NIGHT }

data class RoutineSection(
    val id: String,
    /** OVERDUE | PART | HOUR | ANYTIME | ALL */
    val kind: String,
    val part: DayPart? = null,
    val startHour: Int = 0,
    val endHour: Int = 0,
    val items: List<RoutineItem>
)

data class DaySummary(
    val total: Int,
    val done: Int,
    val pending: Int,
    val overdue: Int,
    val pct: Int,
    val next: RoutineItem?,
    val nextWhen: String
)

/** One row of the widget list. */
sealed class RoutineRow {
    data class Header(val label: String, val emoji: String, val tint: Int, val done: Int, val total: Int) : RoutineRow()
    data class NowMarker(val clock: String) : RoutineRow()
    data class Card(val item: RoutineItem, val isNext: Boolean) : RoutineRow()
}

object RoutineEngine {

    const val MORNING_END = 12 * 60
    const val AFTERNOON_END = 19 * 60

    private const val DEFAULT_COLOR = "#6366f1"
    private val DATE_ONLY = Regex("^\\d{4}-\\d{2}-\\d{2}$")
    private val ISO_PATTERNS = listOf(
        "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
        "yyyy-MM-dd'T'HH:mm:ssXXX",
        "yyyy-MM-dd'T'HH:mm:ss.SSS",
        "yyyy-MM-dd'T'HH:mm:ss"
    )
    private val KIND_RANK = mapOf(
        RoutineKind.HABIT to 0, RoutineKind.SUBHABIT to 0, RoutineKind.TASK to 1, RoutineKind.PROJECT to 2, RoutineKind.JOURNAL to 3
    )

    // ── Tiny JSON helpers (tolerant: the stored records are written by many versions of the app) ──

    private fun JsonObject.prim(k: String): JsonElement? = get(k)?.takeIf { it.isJsonPrimitive }
    private fun JsonObject.str(k: String): String? = prim(k)?.asString?.takeIf { it.isNotEmpty() }
    private fun JsonObject.bool(k: String): Boolean = prim(k)?.let { runCatching { it.asBoolean }.getOrNull() } ?: false
    private fun JsonObject.dbl(k: String): Double? = prim(k)?.let { runCatching { it.asDouble }.getOrNull() }
    private fun JsonObject.obj(k: String): JsonObject? = get(k)?.takeIf { it.isJsonObject }?.asJsonObject
    private fun JsonObject.arr(k: String): JsonArray? = get(k)?.takeIf { it.isJsonArray }?.asJsonArray
    private fun JsonObject.objs(k: String): List<JsonObject> = arr(k)?.mapNotNull { it.takeIf { e -> e.isJsonObject }?.asJsonObject } ?: emptyList()
    private fun JsonObject.ints(k: String): List<Int> = arr(k)?.mapNotNull { e -> e.takeIf { it.isJsonPrimitive }?.let { runCatching { it.asDouble.toInt() }.getOrNull() } } ?: emptyList()
    private fun JsonObject.strs(k: String): List<String> = arr(k)?.mapNotNull { e -> e.takeIf { it.isJsonPrimitive }?.asString } ?: emptyList()

    /** Colour of a block under a colour mode (twin of colorForMode in routineEngine.ts). */
    fun colorForMode(item: RoutineItem, mode: String): Int {
        if (mode == "IMPORTANCE" && item.importance >= 1) return Color.parseColor(IMPORTANCE_COLORS[minOf(4, item.importance) - 1])
        if (mode == "TRAIT") return item.colorTrait ?: item.colorOwn ?: item.color
        return item.colorOwn ?: item.colorTrait ?: item.color
    }

    val IMPORTANCE_COLORS = listOf("#30d158", "#0a84ff", "#ff9f0a", "#ff453a")
    private val DIFFICULTY_IMPORTANCE = mapOf("C" to 1, "B" to 2, "A" to 3, "S" to 4)
    private fun importanceOf(v: Double?): Int = (v?.let { Math.round(it).toInt() } ?: 1).coerceIn(1, 4)

    /** Does a pinned reminder fall on this day? (twin of reminderOccursOn in reminderItems.ts) */
    private fun reminderOccursOn(r: JsonObject, key: String, cal: Calendar): Boolean {
        val date = r.str("date") ?: return false
        if (key < date) return false
        return when (r.str("repeat")) {
            "DAILY" -> true
            "WEEKLY" -> {
                val a = date.split("-").map { it.toInt() }
                val first = Calendar.getInstance().apply { set(a[0], a[1] - 1, a[2], 12, 0, 0) }
                first.get(Calendar.DAY_OF_WEEK) == cal.get(Calendar.DAY_OF_WEEK)
            }
            "MONTHLY" -> {
                val d = date.split("-")[2].toInt()
                cal.get(Calendar.DAY_OF_MONTH) == minOf(d, cal.getActualMaximum(Calendar.DAY_OF_MONTH))
            }
            "YEARLY" -> {
                val a = date.split("-").map { it.toInt() }
                cal.get(Calendar.MONTH) == a[1] - 1 && cal.get(Calendar.DAY_OF_MONTH) == minOf(a[2], cal.getActualMaximum(Calendar.DAY_OF_MONTH))
            }
            else -> key == date
        }
    }

    /** Calendar block length: the first value given, else a default by kind (twin of DEFAULT_DURATION in routineEngine.ts). */
    private fun duration(kind: String, vararg candidates: Double?): Int {
        val v = candidates.firstOrNull { it != null }
        val def = when (kind) { RoutineKind.SUBHABIT -> 15; RoutineKind.PROJECT -> 45; RoutineKind.JOURNAL -> 20; else -> 30 }
        return (v?.toInt() ?: def).coerceIn(5, 720)
    }

    // ── Dates ───────────────────────────────────────────────────────────────────

    fun dayKey(cal: Calendar): String =
        String.format(Locale.US, "%04d-%02d-%02d", cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH))

    private fun parseDate(value: String): Date? {
        for (p in ISO_PATTERNS) {
            try {
                val f = SimpleDateFormat(p, Locale.US)
                f.isLenient = false
                return f.parse(value) ?: continue
            } catch (_: Exception) { /* try next pattern */ }
        }
        return null
    }

    /** Port of getHistoryDateKey: "2026-11-24" stays, an ISO timestamp becomes its local day. */
    fun historyKey(value: String?): String {
        val v = value?.trim().orEmpty()
        if (v.isEmpty()) return dayKey(Calendar.getInstance())
        if (DATE_ONLY.matches(v)) return v
        val parsed = parseDate(v)
        if (parsed != null) return dayKey(Calendar.getInstance().apply { time = parsed })
        return v.substringBefore('T')
    }

    fun timeToMinutes(time: String?): Int? {
        val m = Regex("^(\\d{1,2}):(\\d{2})$").find(time?.trim().orEmpty()) ?: return null
        val h = m.groupValues[1].toInt()
        val min = m.groupValues[2].toInt()
        if (h > 23 || min > 59) return null
        return h * 60 + min
    }

    private fun normalizeTime(time: String?): String? {
        val m = timeToMinutes(time) ?: return null
        return String.format(Locale.US, "%02d:%02d", m / 60, m % 60)
    }

    /** "8:30" + "AM" (or "08:30" + "" in 24h mode). */
    fun formatClock(time: String, use24h: Boolean): Pair<String, String> {
        val minutes = timeToMinutes(time) ?: return Pair(time, "")
        val h = minutes / 60
        val m = String.format(Locale.US, "%02d", minutes % 60)
        if (use24h) return Pair(String.format(Locale.US, "%02d:%s", h, m), "")
        return Pair("${if (h % 12 == 0) 12 else h % 12}:$m", if (h >= 12) "PM" else "AM")
    }

    fun formatClockInline(time: String, use24h: Boolean): String {
        val (main, suffix) = formatClock(time, use24h)
        return if (suffix.isEmpty()) main else "$main $suffix"
    }

    fun dayPartOf(minutes: Int): DayPart = when {
        minutes < MORNING_END -> DayPart.MORNING
        minutes < AFTERNOON_END -> DayPart.AFTERNOON
        else -> DayPart.NIGHT
    }

    private fun isLastDayOfMonth(cal: Calendar): Boolean = cal.get(Calendar.DAY_OF_MONTH) == cal.getActualMaximum(Calendar.DAY_OF_MONTH)

    // ── Colours ─────────────────────────────────────────────────────────────────

    fun parseColor(value: String?, fallback: String = DEFAULT_COLOR): Int {
        if (!value.isNullOrBlank()) {
            try { return Color.parseColor(value.trim()) } catch (_: Exception) { /* fall through */ }
        }
        return Color.parseColor(fallback)
    }

    fun attributeColors(attributes: JsonArray?): Map<String, String> {
        val out = HashMap<String, String>()
        attributes?.forEach { e ->
            if (!e.isJsonObject) return@forEach
            val o = e.asJsonObject
            val id = o.str("id") ?: return@forEach
            val color = o.str("color") ?: return@forEach
            out[id] = color
        }
        return out
    }

    // ── Rules shared with the app ───────────────────────────────────────────────

    private fun isHabitDueOn(habit: JsonObject, cal: Calendar): Boolean {
        val dow = cal.get(Calendar.DAY_OF_WEEK) - 1
        val dom = cal.get(Calendar.DAY_OF_MONTH)
        val days = habit.ints("frequencyDays")
        return when (habit.str("frequency")) {
            "DAILY" -> true
            "WEEKLY" -> habit.str("weeklyType") == "FLEXIBLE_COUNT" || days.isEmpty() || days.contains(dow)
            "MONTHLY" -> {
                val type = habit.str("monthlyType")
                when {
                    type == "FLEXIBLE_COUNT" -> true
                    type == null || type == "SPECIFIC_DATES" -> days.contains(dom) || (habit.bool("monthlyLastDay") && isLastDayOfMonth(cal))
                    else -> false
                }
            }
            else -> false
        }
    }

    /** The habit's "today" flags only count when it was touched on `key` (they are reset lazily). */
    private fun isFreshOn(habit: JsonObject, key: String): Boolean {
        val last = habit.str("lastUpdatedDate")
        return last == null || historyKey(last) == key
    }

    fun isHabitDoneOn(habit: JsonObject, key: String): Boolean {
        if (habit.strs("history").any { historyKey(it) == key }) return true
        return habit.bool("completedToday") && isFreshOn(habit, key)
    }

    private fun isProjectActive(project: JsonObject, cal: Calendar): Boolean {
        if (project.bool("archived") || project.bool("deleted")) return false
        val days = project.ints("workingDays")
        if (days.isEmpty()) return true
        return days.contains(cal.get(Calendar.DAY_OF_WEEK) - 1)
    }

    // ── Build ───────────────────────────────────────────────────────────────────

    class Source(
        val habits: JsonArray?,
        val quests: JsonArray?,
        val projects: JsonArray?,
        val journal: JsonArray?,
        val attributeColors: Map<String, String>,
        val journalTimes: List<String>,
        /** Reminders pinned on the Journal calendar (pushed by the app). */
        val reminders: List<JsonObject> = emptyList()
    )

    private fun emojiForHabit(habit: JsonObject, config: RoutineConfig): String? =
        if (config.habitIcons) TraitIcons.getEmoji(habit.str("attribute")) else null

    private fun journalWritten(journal: JsonArray?, key: String): Boolean {
        journal ?: return false
        for (e in journal) {
            if (!e.isJsonObject) continue
            val o = e.asJsonObject
            val date = o.str("date") ?: continue
            if (historyKey(date) != key) continue
            if ((o.arr("blocks")?.size() ?: 0) > 0) return true
        }
        return false
    }

    fun build(day: Calendar, src: Source, config: RoutineConfig): List<RoutineItem> {
        val key = dayKey(day)
        val isToday = key == dayKey(Calendar.getInstance())
        val items = ArrayList<RoutineItem>()
        fun attrColor(id: String?): String = if (id == null) "" else src.attributeColors[id] ?: ""

        // Habits ───────────────────────────────────────────────────────────────
        val habitColors = HashMap<String, Triple<Int?, Int?, Int>>()
        if (config.showHabits) {
            for (habit in src.habits?.mapNotNull { it.takeIf { e -> e.isJsonObject }?.asJsonObject } ?: emptyList()) {
                val habitId = habit.str("id") ?: continue
                if (habit.bool("archived") || !isHabitDueOn(habit, day)) continue
                val colorStr = habit.str("customColor") ?: attrColor(habit.str("attribute")).ifEmpty { null } ?: habit.str("color") ?: DEFAULT_COLOR
                val color = parseColor(colorStr)
                habitColors[habitId] = Triple(
                    (habit.str("customColor") ?: habit.str("color"))?.let { parseColor(it) },
                    attrColor(habit.str("attribute")).ifEmpty { null }?.let { parseColor(it) },
                    importanceOf(habit.dbl("impact"))
                )
                val habitDone = isHabitDoneOn(habit, key)
                // Live progress (quantity, ticked sub-habits) only counts if recorded today: until the
                // app's daily reset runs it still describes the previous day (twin of routineEngine.ts).
                val live = isToday && isFreshOn(habit, key)
                val title = habit.str("title") ?: continue
                val emoji = emojiForHabit(habit, config)
                val type = habit.str("type")
                val checklist = habit.objs("checklist")

                if (type == "CHECKLIST" && checklist.isNotEmpty()) {
                    for (sub in checklist) {
                        if (sub.bool("deleted")) continue
                        val subId = sub.str("id") ?: continue
                        val subDays = sub.ints("days")
                        if (subDays.isNotEmpty() && !subDays.contains(day.get(Calendar.DAY_OF_WEEK) - 1)) continue
                        val subDone = if (isToday) (sub.bool("completed") && live) else sub.strs("history").any { historyKey(it) == key }
                        val subBase = normalizeTime(sub.str("reminderTime") ?: habit.str("reminderTime"))
                        val subOv = sub.obj("dayOverrides")?.obj(key)
                        val time = normalizeTime(subOv?.str("time")) ?: subBase
                        items.add(RoutineItem(
                            id = "$habitId-sub-$subId", kind = RoutineKind.SUBHABIT, title = sub.str("text") ?: "",
                            durationMin = duration(RoutineKind.SUBHABIT, subOv?.dbl("duration"), sub.dbl("calendarDuration")),
                            overridden = time != subBase,
                            subtitle = title, time = time, minutes = timeToMinutes(time), done = subDone,
                            color = sub.str("color")?.let { parseColor(it) } ?: color, emoji = emoji,
                            habitId = habitId, subtaskId = subId
                        ))
                    }
                    continue
                }

                val slots = habit.objs("dividedTimes").sortedBy { it.str("time") ?: "" }
                if (type == "QUANTITY" && habit.bool("isDivided") && habit.str("dividedMode") == "FIXED" && slots.isNotEmpty()) {
                    var accumulated = 0.0
                    val current = if (live) habit.dbl("currentValue") ?: 0.0 else 0.0
                    val unit = habit.str("unit") ?: ""
                    val dayOv = habit.obj("dayOverrides")?.obj(key)
                    slots.forEachIndexed { i, slot ->
                        val amount = slot.dbl("amount") ?: 0.0
                        val slotDone = habitDone || (isToday && current >= accumulated + amount)
                        val slotBase = normalizeTime(slot.str("time"))
                        val time = normalizeTime(slot.str("id")?.let { id -> dayOv?.obj("slots")?.str(id) }) ?: slotBase
                        items.add(RoutineItem(
                            id = "$habitId-time-$i", kind = RoutineKind.HABIT, title = title,
                            durationMin = duration(RoutineKind.HABIT, dayOv?.dbl("duration"), habit.dbl("calendarDuration")),
                            overridden = time != slotBase,
                            subtitle = "${trimNumber(amount)} $unit".trim(), time = time, minutes = timeToMinutes(time),
                            done = slotDone, color = color, isQuantity = true, emoji = emoji, habitId = habitId,
                            slotAmount = amount.toInt().coerceAtLeast(1)
                        ))
                        accumulated += amount
                    }
                    continue
                }

                var time = normalizeTime(habit.str("reminderTime"))
                val habitOv = habit.obj("dayOverrides")?.obj(key)
                val isQuantity = type == "QUANTITY"
                if (isToday && isQuantity && habit.bool("isDivided")) {
                    val next = habit.str("nextInstanceTime")?.let { parseDate(it) }
                    if (next != null) {
                        val c = Calendar.getInstance().apply { this.time = next }
                        if (dayKey(c) == key) time = String.format(Locale.US, "%02d:%02d", c.get(Calendar.HOUR_OF_DAY), c.get(Calendar.MINUTE))
                    }
                }
                val baseTime = time
                normalizeTime(habitOv?.str("time"))?.let { time = it }
                val target = habit.dbl("targetValue") ?: 0.0
                val current = if (live) habit.dbl("currentValue") ?: 0.0 else 0.0
                val unit = habit.str("unit") ?: ""
                val shown = if (isToday) current else if (habitDone) target else 0.0
                items.add(RoutineItem(
                    id = habitId, kind = RoutineKind.HABIT, title = title,
                    durationMin = duration(RoutineKind.HABIT, habitOv?.dbl("duration"), habit.dbl("calendarDuration")),
                    overridden = time != baseTime,
                    subtitle = if (isQuantity) "${trimNumber(shown)} / ${trimNumber(target)} $unit".trim() else null,
                    time = time, minutes = timeToMinutes(time), done = habitDone, color = color,
                    isQuantity = isQuantity,
                    progress = if (isQuantity && target > 0) (shown / target).toFloat().coerceIn(0f, 1f) else null,
                    emoji = emoji, habitId = habitId,
                    // Same step the Habits widget uses for a tap on a quantity habit.
                    slotAmount = (habit.dbl("dividedQuantity")?.toInt() ?: 1).coerceAtLeast(1)
                ))
            }
        }

        for (i in items.indices) {
            val c = items[i].habitId?.let { habitColors[it] } ?: continue
            items[i] = items[i].copy(colorOwn = c.first, colorTrait = c.second, importance = c.third)
        }

        // Tasks ────────────────────────────────────────────────────────────────
        if (config.showTasks) {
            for (quest in src.quests?.mapNotNull { it.takeIf { e -> e.isJsonObject }?.asJsonObject } ?: emptyList()) {
                val id = quest.str("id") ?: continue
                if (quest.bool("deleted") || quest.bool("archived")) continue
                val deadline = quest.str("deadline") ?: continue
                val dueKey = historyKey(deadline)
                val sameDay = dueKey == key
                val completed = quest.bool("completed")
                val overdue = isToday && !completed && dueKey < key
                if (!sameDay && !overdue) continue
                if (overdue && !config.showOverdue) continue
                val time = if (sameDay) normalizeTime(quest.str("deadlineTime")) else null
                val colorStr = attrColor(quest.str("attribute")).ifEmpty { null } ?: quest.str("color") ?: DEFAULT_COLOR
                items.add(RoutineItem(
                    id = "task-$id", kind = RoutineKind.TASK, title = quest.str("title") ?: "",
                    subtitle = if (overdue) "Atrasada" else null, time = time, minutes = timeToMinutes(time),
                    done = completed, color = parseColor(colorStr), overdue = overdue, taskId = id,
                    colorOwn = quest.str("color")?.let { parseColor(it) }, colorTrait = attrColor(quest.str("attribute")).ifEmpty { null }?.let { parseColor(it) },
                    importance = DIFFICULTY_IMPORTANCE[quest.str("difficulty")] ?: 1,
                    durationMin = duration(RoutineKind.TASK, quest.dbl("calendarDuration"))
                ))
            }
        }

        // Projects (only those with a reminder time) ─────────────────────────
        if (config.showProjects) {
            for (project in src.projects?.mapNotNull { it.takeIf { e -> e.isJsonObject }?.asJsonObject } ?: emptyList()) {
                val id = project.str("id") ?: continue
                val reminder = normalizeTime(project.str("reminder"))
                if (project.bool("completed") || reminder == null || !isProjectActive(project, day)) continue
                val reminderDays = project.ints("reminderDays")
                if (reminderDays.isNotEmpty() && !reminderDays.contains(day.get(Calendar.DAY_OF_WEEK) - 1)) continue
                val seconds = project.objs("sessions")
                    .filter { s -> s.str("date")?.let { historyKey(it) == key } == true }
                    .sumOf { it.dbl("duration") ?: 0.0 }
                val minutes = Math.round(seconds / 60.0).toInt()
                val target = (project.dbl("dailyFocusGoalMinutes") ?: 0.0).toInt()
                items.add(RoutineItem(
                    id = "project-$id", kind = RoutineKind.PROJECT, title = project.str("title") ?: "",
                    subtitle = if (target > 0) "$minutes/$target min" else if (minutes > 0) "$minutes min" else "Sesión de enfoque",
                    time = reminder, minutes = timeToMinutes(reminder), done = minutes >= maxOf(1, target),
                    color = parseColor(project.str("color"), "#8b5cf6"),
                    colorOwn = project.str("color")?.let { parseColor(it) }, importance = importanceOf(project.dbl("impact")),
                    progress = if (target > 0) (minutes.toFloat() / target).coerceIn(0f, 1f) else null,
                    projectId = id,
                    durationMin = duration(RoutineKind.PROJECT, if (target > 0) minOf(target, 180).toDouble() else null)
                ))
            }
        }

        // Reminders pinned on the Journal calendar ───────────────────────────
        if (config.showJournal) {
            for (r in src.reminders) {
                val id = r.str("id") ?: continue
                if (!reminderOccursOn(r, key, day)) continue
                val time = normalizeTime(r.str("time"))
                val doneDates = r.strs("doneDates")
                items.add(RoutineItem(
                    id = "reminder-$id", kind = RoutineKind.JOURNAL, title = r.str("title") ?: "", subtitle = "Recordatorio",
                    time = time, minutes = timeToMinutes(time), done = doneDates.contains(key),
                    color = parseColor(r.str("color"), "#818cf8"), reminderId = id, durationMin = duration(RoutineKind.JOURNAL, r.dbl("duration"))
                ))
            }
        }

        // Journaling reminders ─────────────────────────────────────────────────
        if (config.showJournal && src.journalTimes.isNotEmpty()) {
            val written = journalWritten(src.journal, key)
            src.journalTimes.forEachIndexed { i, raw ->
                val time = normalizeTime(raw)
                items.add(RoutineItem(
                    id = "journal-$i", kind = RoutineKind.JOURNAL, title = "Escribir en el journal", subtitle = "Recordatorio",
                    time = time, minutes = timeToMinutes(time), done = written, color = parseColor("#818cf8"), durationMin = 20
                ))
            }
        }

        return sort(items.filter { (config.showCompleted || !it.done) && (config.showUntimed || it.minutes != null || it.overdue) })
    }

    private fun trimNumber(v: Double): String = if (v == Math.floor(v)) v.toLong().toString() else String.format(Locale.US, "%.1f", v)

    /** Chronological: overdue first, timed items by clock, then untimed; ties by kind, then title. */
    fun sort(items: List<RoutineItem>): List<RoutineItem> {
        val collator = Collator.getInstance(Locale("es"))
        return items.sortedWith(Comparator { a, b ->
            if (a.overdue != b.overdue) return@Comparator if (a.overdue) -1 else 1
            val am = a.minutes ?: Int.MAX_VALUE
            val bm = b.minutes ?: Int.MAX_VALUE
            if (am != bm) return@Comparator am.compareTo(bm)
            val ka = KIND_RANK[a.kind] ?: 9
            val kb = KIND_RANK[b.kind] ?: 9
            if (ka != kb) return@Comparator ka.compareTo(kb)
            collator.compare(a.title, b.title)
        })
    }

    // ── Sections ────────────────────────────────────────────────────────────────

    fun hourBlockOf(minutes: Int, block: Int): Pair<Int, Int> {
        val size = block.coerceIn(1, 6)
        val start = (minutes / 60 / size) * size
        return Pair(start, minOf(24, start + size))
    }

    fun formatHourRange(startHour: Int, endHour: Int, use24h: Boolean): String {
        fun f(h: Int): String {
            val hh = h % 24
            return if (use24h) String.format(Locale.US, "%02d:00", hh) else "${if (hh % 12 == 0) 12 else hh % 12} ${if (hh >= 12) "PM" else "AM"}"
        }
        return if (endHour - startHour == 1) f(startHour) else "${f(startHour)} – ${f(endHour)}"
    }

    fun sectionize(items: List<RoutineItem>, config: RoutineConfig): List<RoutineSection> {
        val overdue = items.filter { it.overdue }
        val timed = items.filter { !it.overdue && it.minutes != null }
        val anytime = items.filter { !it.overdue && it.minutes == null }
        val out = ArrayList<RoutineSection>()
        if (overdue.isNotEmpty()) out.add(RoutineSection("overdue", "OVERDUE", items = overdue))

        if (config.divideByHour) {
            val byBlock = LinkedHashMap<Int, MutableList<RoutineItem>>()
            val ends = HashMap<Int, Int>()
            for (it in timed) {
                val (start, end) = hourBlockOf(it.minutes!!, config.hourBlock)
                byBlock.getOrPut(start) { ArrayList() }.add(it)
                ends[start] = end
            }
            for ((start, list) in byBlock) out.add(RoutineSection("hour-$start", "HOUR", dayPartOf(start * 60), start, ends[start] ?: start + 1, list))
        } else if (config.groupByPart) {
            for (part in DayPart.values()) {
                val inPart = timed.filter { dayPartOf(it.minutes!!) == part }
                if (inPart.isNotEmpty()) out.add(RoutineSection("part-$part", "PART", part, items = inPart))
            }
        } else if (timed.isNotEmpty()) {
            out.add(RoutineSection("all", "ALL", items = timed))
        }

        if (anytime.isNotEmpty()) out.add(RoutineSection("anytime", "ANYTIME", items = anytime))
        return out
    }

    // ── Summary ("Siguiente", counters, progress) ───────────────────────────────

    fun summarize(items: List<RoutineItem>, isToday: Boolean, nowMinutes: Int, use24h: Boolean): DaySummary {
        val done = items.count { it.done }
        val overdue = items.count { it.overdue && !it.done }
        val pct = if (items.isEmpty()) 0 else Math.round(done * 100f / items.size)
        val pending = items.filter { !it.done }
        val next: RoutineItem? = when {
            pending.isEmpty() -> null
            isToday -> pending.firstOrNull { !it.overdue && it.minutes != null && it.minutes >= nowMinutes - 30 }
                ?: pending.firstOrNull { it.overdue } ?: pending.first()
            else -> pending.first()
        }
        return DaySummary(items.size, done, items.size - done, overdue, pct, next, nextWhen(next, isToday, nowMinutes, use24h))
    }

    private fun nextWhen(next: RoutineItem?, isToday: Boolean, nowMinutes: Int, use24h: Boolean): String {
        if (next == null) return ""
        if (next.overdue) return "Atrasada"
        if (!isToday || next.minutes == null) return next.time?.let { formatClockInline(it, use24h) } ?: "Sin hora"
        val diff = next.minutes - nowMinutes
        if (Math.abs(diff) <= 1) return "Ahora"
        val abs = Math.abs(diff)
        val text = if (abs >= 60) "${abs / 60} h${if (abs % 60 != 0) " ${abs % 60} min" else ""}" else "$abs min"
        return if (diff > 0) "en $text" else "hace $text"
    }

    // ── List rows for the widget ────────────────────────────────────────────────

    /** filter: ALL | MORNING | AFTERNOON | NIGHT. */
    fun filterItems(items: List<RoutineItem>, filter: String): List<RoutineItem> {
        if (filter == "ALL") return items
        val part = runCatching { DayPart.valueOf(filter) }.getOrNull() ?: return items
        return items.filter { it.minutes != null && !it.overdue && dayPartOf(it.minutes) == part }
    }

    fun partMeta(part: DayPart?): Pair<String, Pair<String, Int>> = when (part) {
        DayPart.MORNING -> Pair("Mañana", Pair("☀️", Color.parseColor("#fbbf24")))
        DayPart.AFTERNOON -> Pair("Tarde", Pair("🌇", Color.parseColor("#fb923c")))
        DayPart.NIGHT -> Pair("Noche", Pair("🌙", Color.parseColor("#818cf8")))
        null -> Pair("", Pair("", Color.parseColor("#94a3b8")))
    }

    fun rows(visible: List<RoutineItem>, config: RoutineConfig, filter: String, isToday: Boolean, nowMinutes: Int, nextId: String?): List<RoutineRow> {
        val out = ArrayList<RoutineRow>()
        val nowBeforeId = if (isToday && filter == "ALL") visible.firstOrNull { !it.overdue && it.minutes != null && it.minutes > nowMinutes }?.id else null
        val nowClock = String.format(Locale.US, "%02d:%02d", nowMinutes / 60, nowMinutes % 60)

        for (section in sectionize(visible, config)) {
            val done = section.items.count { it.done }
            when (section.kind) {
                "OVERDUE" -> out.add(RoutineRow.Header("Atrasadas", "⚠️", Color.parseColor("#fb7185"), done, section.items.size))
                "ANYTIME" -> out.add(RoutineRow.Header("Sin hora", "✨", Color.parseColor("#94a3b8"), done, section.items.size))
                "HOUR" -> {
                    val (_, meta) = partMeta(section.part)
                    out.add(RoutineRow.Header(formatHourRange(section.startHour, section.endHour, config.use24h), meta.first, meta.second, done, section.items.size))
                }
                "PART" -> {
                    val (label, meta) = partMeta(section.part)
                    out.add(RoutineRow.Header(label, meta.first, meta.second, done, section.items.size))
                }
            }
            for (item in section.items) {
                if (nowBeforeId == item.id) out.add(RoutineRow.NowMarker(formatClockInline(nowClock, config.use24h)))
                out.add(RoutineRow.Card(item, isNext = isToday && item.id == nextId))
            }
        }
        return out
    }
}
