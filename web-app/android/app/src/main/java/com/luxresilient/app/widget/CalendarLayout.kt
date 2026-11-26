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
    val height: Float,
    var lane: Int = 0,
    var lanes: Int = 1
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

    /** dp per hour for a span (1, 3 or 7 days). */
    fun dpPerHour(span: Int) = when (span) { 1 -> 56f; 3 -> 52f; else -> 46f }

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

    fun build(days: List<CalendarDayInput>, config: RoutineConfig, nowMinutes: Int?, dpPerHour: Float, minBlockDp: Float = 18f): CalendarLayoutResult {
        val dpPerMin = dpPerHour / 60f
        val minBlockMin = minBlockDp / dpPerMin
        val allDay = days.map { d -> d.items.filter { !isTimed(it) } }
        val events = ArrayList<CalendarEvent>()

        days.forEachIndexed { dayIndex, d ->
            val dayEvents = d.items.filter { isTimed(it) }.map { item ->
                val start = item.minutes!!
                val end = minOf(DAY_MINUTES, start + item.durationMin)
                CalendarEvent(item, dayIndex, start, end, start * dpPerMin, maxOf((end - start) * dpPerMin, minBlockDp))
            }.sortedWith(compareBy<CalendarEvent> { it.start }.thenByDescending { it.end }.thenBy { it.item.title })

            var group = ArrayList<CalendarEvent>()
            var groupEnd = -1f
            val laneEnds = ArrayList<Float>()
            fun flush() {
                for (e in group) e.lanes = maxOf(1, laneEnds.size)
                group = ArrayList(); laneEnds.clear(); groupEnd = -1f
            }
            for (e in dayEvents) {
                val visualEnd = e.start + maxOf((e.end - e.start).toFloat(), minBlockMin)
                if (group.isNotEmpty() && e.start >= groupEnd) flush()
                var lane = laneEnds.indexOfFirst { it <= e.start }
                if (lane == -1) { lane = laneEnds.size; laneEnds.add(visualEnd) } else laneEnds[lane] = visualEnd
                e.lane = lane
                groupEnd = maxOf(groupEnd, visualEnd)
                group.add(e)
            }
            flush()
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
