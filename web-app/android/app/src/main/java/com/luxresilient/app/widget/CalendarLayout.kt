package com.luxresilient.app.widget

/**
 * Native twin of src/modules/routine/calendarLayout.ts: a Google-Calendar style time grid. Linear time scale,
 * one block per item as tall as it lasts, side-by-side lanes for overlapping blocks, and bands that follow the
 * way the user divided the day (hour blocks, Mañana/Tarde/Noche, or none). Pure functions, sizes in dp.
 */
class CalendarBand(val id: String, val isBlock: Boolean, val part: DayPart, val startHour: Int, val endHour: Int)

class CalendarBandBox(val band: CalendarBand, val top: Float, val height: Float, val done: Int, val total: Int)

class CalendarEvent(
    val item: RoutineItem,
    val day: Int,
    val start: Int,
    val end: Int,
    val top: Float,
    var height: Float,
    /** Place among the blocks that start (almost) together, side by side, and how many share that row. */
    var lane: Int = 0,
    var lanes: Int = 1,
    /** How many earlier blocks still running it sits on top of: drawn shifted right that many steps (Google style). */
    var indent: Int = 0,
    /** Paint order inside its day: later blocks go on top. */
    var order: Int = 0
)

class CalendarDayInput(val key: String, val isToday: Boolean, val items: List<RoutineItem>)

class CalendarLayoutResult(
    val events: List<CalendarEvent>,
    val bands: List<CalendarBandBox>,
    val height: Float,
    val dpPerMin: Float,
    val nowY: Float?,
    val nowDay: Int,
    /** Untimed and overdue items per day: they live in the strip above the grid. */
    val allDay: List<List<RoutineItem>>,
    val empty: Boolean
)

object CalendarLayout {

    const val DAY_MINUTES = 24 * 60

    /** dp per hour for a span (1, 3 or 7 days) at zoom 1. */
    fun dpPerHour(span: Int, zoom: Float = 1f) = (when (span) { 1 -> 56f; 3 -> 52f; else -> 46f }) * zoom

    const val ZOOM_MIN = 0.6f
    const val ZOOM_MAX = 6.0f
    fun clampZoom(z: Float) = z.coerceIn(ZOOM_MIN, ZOOM_MAX)

    fun bandOfHour(hour: Int, config: RoutineConfig): CalendarBand? {
        if (config.divideByHour) {
            val (start, end) = RoutineEngine.hourBlockOf(hour * 60, config.hourBlock)
            return CalendarBand("block-$start", true, RoutineEngine.dayPartOf(start * 60), start, end)
        }
        if (config.groupByPart) {
            val part = RoutineEngine.dayPartOf(hour * 60)
            val (start, end) = when (part) { DayPart.MORNING -> 0 to 12; DayPart.AFTERNOON -> 12 to 19; DayPart.NIGHT -> 19 to 24 }
            return CalendarBand("part-$part", false, part, start, end)
        }
        return null
    }

    private fun isTimed(it: RoutineItem) = !it.overdue && it.minutes != null

    private class Row(val first: Int, val indent: Int, val members: ArrayList<Member>)
    private class Member(val e: CalendarEvent, var visEnd: Float)

    /**
     * Google-Calendar placement (twin of buildCalendarLayout): blocks that start within one title line of each
     * other share a ROW, side by side; a block that starts later is drawn on top of the ones still running,
     * shifted right one step, so every title stays readable. A block that only looks long because of the minimum
     * height is cut where the next one starts.
     */
    fun build(days: List<CalendarDayInput>, config: RoutineConfig, nowMinutes: Int?, dpPerHour: Float, minBlockDp: Float = 18f, titleDp: Float = minBlockDp): CalendarLayoutResult {
        val dpPerMin = dpPerHour / 60f
        val minBlockMin = minBlockDp / dpPerMin
        val titleMin = titleDp / dpPerMin
        val allDay = days.map { d -> d.items.filter { !isTimed(it) } }
        val events = ArrayList<CalendarEvent>()

        days.forEachIndexed { dayIndex, d ->
            val dayEvents = d.items.filter { isTimed(it) }.map { item ->
                val start = item.minutes!!
                val end = minOf(DAY_MINUTES, start + item.durationMin)
                CalendarEvent(item, dayIndex, start, end, start * dpPerMin, 0f)
            }.sortedWith(compareBy<CalendarEvent> { it.start }.thenByDescending { it.end }.thenBy { it.item.title })

            val rows = ArrayList<Row>()
            dayEvents.forEachIndexed { order, e ->
                e.order = order
                val member = Member(e, e.start + maxOf((e.end - e.start).toFloat(), minBlockMin))
                val live = rows.filter { r -> r.members.any { it.visEnd > e.start } }
                val join = live.reversed().firstOrNull { r -> e.start - r.first < titleMin }
                if (join != null) {
                    join.members.add(member)
                    e.indent = join.indent
                    return@forEachIndexed
                }
                val running = live.filter { r -> r.members.any { it.e.end > e.start } }
                val indent = if (running.isNotEmpty()) running.maxOf { it.indent } + 1 else 0
                // Rows at this depth or deeper are not really running any more: their stretched minimum height stops here.
                for (r in live) if (r.indent >= indent) for (m in r.members) m.visEnd = minOf(m.visEnd, maxOf(e.start.toFloat(), m.e.end.toFloat()))
                e.indent = indent
                rows.add(Row(e.start, indent, arrayListOf(member)))
            }
            for (r in rows) {
                r.members.forEachIndexed { i, m ->
                    m.e.lane = i
                    m.e.lanes = r.members.size
                    m.e.height = maxOf(4f, (m.visEnd - m.e.start) * dpPerMin)
                }
            }
            events.addAll(dayEvents)
        }

        val bands = ArrayList<CalendarBandBox>()
        if (config.divideByHour || config.groupByPart) {
            var h = 0
            while (h < 24) {
                val band = bandOfHour(h, config)!!
                val inBand = events.filter { it.start / 60 >= band.startHour && it.start / 60 < band.endHour }
                bands.add(CalendarBandBox(band, band.startHour * dpPerHour, (band.endHour - band.startHour) * dpPerHour, inBand.count { it.item.done }, inBand.size))
                h = band.endHour
            }
        }

        val nowDay = if (nowMinutes == null) -1 else days.indexOfFirst { it.isToday }
        return CalendarLayoutResult(
            events, bands, 24 * dpPerHour, dpPerMin,
            if (nowMinutes != null && nowDay >= 0) nowMinutes * dpPerMin else null,
            nowDay, allDay, events.isEmpty()
        )
    }
}
