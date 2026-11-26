package com.luxresilient.app.widget

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.DashPathEffect
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.text.TextUtils
import java.util.Calendar
import java.util.Locale

/**
 * Draws the calendar widget's grid as one bitmap, Google-Calendar style: day heads, the strip of items
 * without an hour, then a linear 24 h scale with solid blocks as tall as they last, the day bands the user
 * chose, and the "now" marker. Everything is laid out in dp and the canvas is scaled.
 */
object CalendarRenderer {

    private const val DAY_HEAD_H = 34f
    private const val STRIP_H = 24f
    private val ES_DAYS = arrayOf("DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB")

    class Input(
        val days: List<Calendar>,
        val dayInputs: List<CalendarDayInput>,
        val layout: CalendarLayoutResult,
        val config: RoutineConfig,
        val span: Int,
        val nowMinutes: Int?,
        val nextId: String?,
        /** Saved manual scroll in dp, or null to follow the clock. */
        val savedScroll: Float?,
        val widthDp: Float,
        val heightDp: Float
    )

    /** What a render decided: how far it is scrolled and how far it could go. */
    class Plan(val fixedTop: Float, val viewportH: Float, val maxScroll: Float, val scroll: Float)

    private fun gutterOf(span: Int) = if (span == 1) 38f else 31f
    private fun railOf(input: Input) = if (input.layout.bands.isEmpty()) 0f else 11f
    private fun hasStrip(layout: CalendarLayoutResult) = layout.allDay.any { it.isNotEmpty() }

    fun plan(input: Input): Plan {
        val fixedTop = (if (input.span > 1) DAY_HEAD_H else 0f) + (if (hasStrip(input.layout)) STRIP_H + 4f else 0f)
        val viewport = (input.heightDp - fixedTop).coerceAtLeast(40f)
        val maxScroll = (input.layout.height + 6f - viewport).coerceAtLeast(0f)
        val first = input.layout.events.minOfOrNull { it.top }
        val scroll = when {
            input.savedScroll != null -> input.savedScroll.coerceIn(0f, maxScroll)
            // Follow the clock: put "now" a third of the way down, so what is coming is on screen.
            input.layout.nowY != null -> (input.layout.nowY - viewport * 0.3f).coerceIn(0f, maxScroll)
            first != null -> (first - 14f).coerceIn(0f, maxScroll)
            else -> 0f
        }
        return Plan(fixedTop, viewport, maxScroll, scroll)
    }

    /** Where each block that is on screen sits, in dp relative to the grid view (for the tap areas). */
    fun hitRects(input: Input, plan: Plan): List<Pair<CalendarEvent, RectF>> {
        val gutter = gutterOf(input.span)
        val gridLeft = gutter + railOf(input)
        val colW = (input.widthDp - gridLeft) / input.span
        val top = plan.fixedTop
        val bottom = plan.fixedTop + plan.viewportH
        val out = ArrayList<Pair<CalendarEvent, RectF>>()
        for (ev in input.layout.events) {
            val laneW = colW / ev.lanes
            val left = gridLeft + colW * ev.day + laneW * ev.lane + 1f
            val y0 = top + ev.top - plan.scroll
            val y1 = y0 + ev.height
            if (y1 <= top + 2f || y0 >= bottom - 2f) continue
            out.add(ev to RectF(left, maxOf(y0, top), left + laneW - 2f, minOf(y1, bottom)))
        }
        return out.sortedBy { it.second.top }
    }

    fun render(density: Float, input: Input, plan: Plan): Bitmap {
        val scale = minOf(density, 2.4f)
        val w = (input.widthDp * scale).toInt().coerceAtLeast(64)
        val h = (input.heightDp * scale).toInt().coerceAtLeast(48)
        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        canvas.scale(scale, scale)
        val W = input.widthDp
        val H = input.heightDp
        val span = input.span
        val gutter = gutterOf(span)
        val gridLeft = gutter + railOf(input)
        val colW = (W - gridLeft) / span

        var y = 0f
        if (span > 1) { drawDayHeads(canvas, input, gridLeft, colW); y += DAY_HEAD_H }
        if (hasStrip(input.layout)) { drawStrip(canvas, input, gutter, gridLeft, colW, y); y += STRIP_H + 4f }

        val gridRect = RectF(0f, plan.fixedTop, W, H)
        val layer = canvas.saveLayer(gridRect, null)
        canvas.clipRect(gridRect)
        canvas.translate(0f, plan.fixedTop - plan.scroll)

        drawBands(canvas, input, gutter, gridLeft, W)
        drawHours(canvas, input, gutter, gridLeft, W)
        if (span > 1) drawColumnLines(canvas, input, gridLeft, colW)
        if (input.layout.empty) drawEmpty(canvas, gridLeft, W, plan)
        for (ev in input.layout.events) drawBlock(canvas, input, ev, gridLeft, colW)
        drawNow(canvas, input, gutter, W)

        canvas.translate(0f, -(plan.fixedTop - plan.scroll))
        val fadeTop = if (plan.scroll > 1f) 12f else 0f
        val fadeBottom = if (plan.scroll < plan.maxScroll - 1f) 16f else 0f
        if (fadeTop > 0f || fadeBottom > 0f) {
            val mask = Paint()
            mask.xfermode = PorterDuffXfermode(PorterDuff.Mode.DST_IN)
            val total = gridRect.height()
            val colors = intArrayOf(if (fadeTop > 0f) 0 else Color.BLACK, Color.BLACK, Color.BLACK, if (fadeBottom > 0f) 0 else Color.BLACK)
            val stops = floatArrayOf(0f, (fadeTop / total).coerceIn(0f, 0.45f), (1f - fadeBottom / total).coerceIn(0.55f, 1f), 1f)
            mask.shader = LinearGradient(0f, gridRect.top, 0f, gridRect.bottom, colors, stops, Shader.TileMode.CLAMP)
            canvas.drawRect(gridRect, mask)
        }
        canvas.restoreToCount(layer)
        return bmp
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private fun paint(size: Float, color: Int, bold: Boolean = false, black: Boolean = false, spacing: Float = 0f): TextPaint {
        val p = TextPaint(Paint.ANTI_ALIAS_FLAG)
        p.textSize = size
        p.color = color
        p.typeface = when {
            black -> Typeface.create("sans-serif-black", Typeface.NORMAL)
            bold -> Typeface.create("sans-serif-medium", Typeface.BOLD)
            else -> Typeface.create("sans-serif-medium", Typeface.NORMAL)
        }
        if (spacing != 0f) p.letterSpacing = spacing
        return p
    }

    private fun fit(text: String, p: TextPaint, width: Float): String =
        if (width <= 4f) "" else TextUtils.ellipsize(text, p, width, TextUtils.TruncateAt.END).toString()

    private fun hourLabel(h: Int, use24h: Boolean): String {
        val hh = h % 24
        return if (use24h) String.format(Locale.US, "%02d:00", hh) else "${if (hh % 12 == 0) 12 else hh % 12} ${if (hh >= 12) "PM" else "AM"}"
    }

    /** "7:30 – 9 AM": the suffix is written once when both ends share it. */
    private fun rangeText(start: Int, end: Int, use24h: Boolean): String {
        if (use24h) return String.format(Locale.US, "%02d:%02d – %02d:%02d", start / 60, start % 60, (end % 1440) / 60, end % 60)
        fun part(m: Int): Pair<String, String> {
            val hh = (m % 1440) / 60
            val mm = m % 60
            return Pair("${if (hh % 12 == 0) 12 else hh % 12}${if (mm != 0) String.format(Locale.US, ":%02d", mm) else ""}", if (hh >= 12) "PM" else "AM")
        }
        val a = part(start); val b = part(end)
        return if (a.second == b.second) "${a.first} – ${b.first} ${b.second}" else "${a.first} ${a.second} – ${b.first} ${b.second}"
    }

    /** Dark ink on light block colours, white on the rest. */
    private fun inkOn(color: Int): Int {
        val lum = (0.299 * Color.red(color) + 0.587 * Color.green(color) + 0.114 * Color.blue(color)) / 255.0
        return if (lum > 0.68) Color.parseColor("#10131A") else Color.WHITE
    }

    private fun shade(color: Int, amount: Float): Int {
        fun f(v: Int) = (v * (1f + amount)).toInt().coerceIn(0, 255)
        return Color.rgb(f(Color.red(color)), f(Color.green(color)), f(Color.blue(color)))
    }

    // ── Fixed top ───────────────────────────────────────────────────────────

    private fun drawDayHeads(canvas: Canvas, input: Input, gridLeft: Float, colW: Float) {
        val week = paint(8f, Color.argb(120, 255, 255, 255), black = true, spacing = 0.08f)
        val num = paint(11.5f, Color.WHITE, black = true)
        val fill = Paint(Paint.ANTI_ALIAS_FLAG)
        input.days.forEachIndexed { i, d ->
            val cx = gridLeft + colW * i + colW / 2f
            val today = input.dayInputs[i].isToday
            week.color = if (today) Color.parseColor("#7DD3FC") else Color.argb(120, 255, 255, 255)
            week.textAlign = Paint.Align.CENTER
            canvas.drawText(ES_DAYS[d.get(Calendar.DAY_OF_WEEK) - 1], cx, 9f, week)
            if (today) { fill.color = Color.parseColor("#38BDF8"); canvas.drawCircle(cx, 23.5f, 10f, fill) }
            num.color = if (today) Color.parseColor("#06121F") else Color.argb(230, 255, 255, 255)
            num.textAlign = Paint.Align.CENTER
            canvas.drawText(d.get(Calendar.DAY_OF_MONTH).toString(), cx, 27.5f, num)
        }
    }

    private fun drawStrip(canvas: Canvas, input: Input, gutter: Float, gridLeft: Float, colW: Float, top: Float) {
        val bg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(14, 255, 255, 255) }
        canvas.drawRoundRect(RectF(0f, top, input.widthDp, top + STRIP_H), 10f, 10f, bg)
        val mark = paint(10f, Color.argb(90, 255, 255, 255), bold = true)
        mark.textAlign = Paint.Align.CENTER
        canvas.drawText("✦", gutter / 2f, top + 16f, mark)

        val chipP = paint(8.5f, Color.WHITE, bold = true)
        val chipBg = Paint(Paint.ANTI_ALIAS_FLAG)
        fun chip(item: RoutineItem?, label: String, x: Float, maxW: Float): Float {
            val text = fit(label, chipP, maxW - 12f)
            val tw = chipP.measureText(text) + 12f
            val rect = RectF(x, top + 3.5f, x + tw, top + STRIP_H - 3.5f)
            chipBg.color = when {
                item == null -> Color.argb(40, 255, 255, 255)
                item.overdue -> Color.argb(60, 251, 113, 133)
                item.done -> Color.argb(18, 255, 255, 255)
                else -> RoutineEngine.colorForMode(item, input.config.calendarColor).let { c -> Color.argb(70, Color.red(c), Color.green(c), Color.blue(c)) }
            }
            canvas.drawRoundRect(rect, rect.height() / 2f, rect.height() / 2f, chipBg)
            chipP.color = when {
                item?.overdue == true -> Color.parseColor("#FECDD3")
                item?.done == true -> Color.argb(90, 255, 255, 255)
                else -> Color.WHITE
            }
            chipP.isStrikeThruText = item?.done == true
            canvas.drawText(text, x + 6f, top + STRIP_H / 2f + 3f, chipP)
            chipP.isStrikeThruText = false
            return tw
        }

        if (input.span == 1) {
            val list = input.layout.allDay[0]
            var x = gridLeft
            val limit = input.widthDp - 8f
            var shown = 0
            for (item in list) {
                val avail = minOf(120f, limit - x)
                if (avail < 44f) break
                x += chip(item, item.title, x, avail) + 4f
                shown++
            }
            if (shown < list.size) chip(null, "+${list.size - shown}", x, 40f)
        } else {
            input.layout.allDay.forEachIndexed { i, list ->
                if (list.isEmpty()) return@forEachIndexed
                val x = gridLeft + colW * i + 2f
                if (list.size == 1) chip(list[0], list[0].title, x, colW - 4f) else chip(null, "${list.size} sin hora", x, colW - 4f)
            }
        }
    }

    // ── Grid ────────────────────────────────────────────────────────────────

    private fun drawBands(canvas: Canvas, input: Input, gutter: Float, gridLeft: Float, W: Float) {
        val fill = Paint(Paint.ANTI_ALIAS_FLAG)
        val line = Paint().apply { strokeWidth = 0.8f }
        input.layout.bands.forEachIndexed { i, b ->
            val tint = RoutineEngine.partMeta(b.band.part).second.second
            fill.color = WidgetTheme.withAlpha(tint, if (i % 2 == 0) 22 else 9)
            canvas.drawRect(gutter, b.top, W, b.top + b.height, fill)
            line.color = WidgetTheme.withAlpha(tint, 70)
            canvas.drawLine(gutter, b.top, W, b.top, line)

            // The band's rail: a tinted pill with "8 – 10 AM · 2/3" written upwards.
            val pill = RectF(gutter + 1f, b.top + 2f, gridLeft - 1f, b.top + b.height - 2f)
            val pillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = WidgetTheme.withAlpha(tint, 40) }
            canvas.drawRoundRect(pill, 5f, 5f, pillPaint)
            val label = (if (b.band.isBlock) RoutineEngine.formatHourRange(b.band.startHour, b.band.endHour, input.config.use24h) else RoutineEngine.partMeta(b.band.part).first)
                .uppercase(Locale("es")) + if (b.total > 0) " · ${b.done}/${b.total}" else ""
            val tp = paint(6.5f, tint, black = true, spacing = 0.06f)
            tp.textAlign = Paint.Align.CENTER
            canvas.save()
            canvas.rotate(-90f, pill.centerX(), pill.centerY())
            canvas.clipRect(pill.centerX() - pill.height() / 2f, pill.centerY() - pill.width() / 2f, pill.centerX() + pill.height() / 2f, pill.centerY() + pill.width() / 2f)
            canvas.drawText(fit(label, tp, pill.height() - 4f), pill.centerX(), pill.centerY() + 2.3f, tp)
            canvas.restore()
        }
    }

    private fun drawHours(canvas: Canvas, input: Input, gutter: Float, gridLeft: Float, W: Float) {
        val dpPerHour = input.layout.height / 24f
        val hair = Paint().apply { strokeWidth = 0.7f; color = Color.argb(34, 255, 255, 255) }
        val dash = Paint().apply { strokeWidth = 0.7f; color = Color.argb(14, 255, 255, 255); pathEffect = DashPathEffect(floatArrayOf(3f, 3f), 0f) }
        val hourP = paint(8f, Color.argb(120, 255, 255, 255), bold = true)
        hourP.textAlign = Paint.Align.RIGHT
        val nowY = input.layout.nowY
        for (h in 0 until 24) {
            val y = h * dpPerHour
            canvas.drawLine(gutter, y, W, y, hair)
            if (dpPerHour >= 50f) canvas.drawLine(gridLeft, y + dpPerHour / 2f, W, y + dpPerHour / 2f, dash)
            // The clock label takes the place of an hour label it would cover.
            val clash = nowY != null && input.span == 1 && Math.abs(nowY - y) < 9f
            if (h > 0 && !clash) canvas.drawText(hourLabel(h, input.config.use24h), gutter - 4f, y + 3f, hourP)
        }
        val side = Paint().apply { strokeWidth = 0.7f; color = Color.argb(20, 255, 255, 255) }
        canvas.drawLine(gutter, 0f, gutter, input.layout.height, side)
    }

    private fun drawColumnLines(canvas: Canvas, input: Input, gridLeft: Float, colW: Float) {
        val p = Paint().apply { strokeWidth = 0.7f; color = Color.argb(22, 255, 255, 255) }
        for (i in 1 until input.span) {
            val x = gridLeft + colW * i
            canvas.drawLine(x, 0f, x, input.layout.height, p)
        }
    }

    private fun drawEmpty(canvas: Canvas, gridLeft: Float, W: Float, plan: Plan) {
        val title = paint(12f, Color.argb(200, 255, 255, 255), black = true)
        val sub = paint(9.5f, Color.argb(110, 255, 255, 255))
        title.textAlign = Paint.Align.CENTER
        sub.textAlign = Paint.Align.CENTER
        val cx = (gridLeft + W) / 2f
        val cy = plan.scroll + plan.viewportH / 2f
        canvas.drawText("Nada con hora", cx, cy - 4f, title)
        canvas.drawText("Ponle hora a tus hábitos y tareas", cx, cy + 12f, sub)
    }

    private fun drawBlock(canvas: Canvas, input: Input, ev: CalendarEvent, gridLeft: Float, colW: Float) {
        val it = ev.item
        val span = input.span
        val laneW = colW / ev.lanes
        val left = gridLeft + colW * ev.day + laneW * ev.lane + 1f
        val rect = RectF(left, ev.top, left + laneW - 2f, ev.top + ev.height)
        val c = RoutineEngine.colorForMode(it, input.config.calendarColor)
        val done = it.done
        val ink = if (done) Color.argb(200, 255, 255, 255) else inkOn(c)
        val radius = if (span == 1) 7f else 5f

        val fill = Paint(Paint.ANTI_ALIAS_FLAG)
        fill.shader = LinearGradient(rect.left, rect.top, rect.left, rect.bottom, c, shade(c, -0.14f), Shader.TileMode.CLAMP)
        fill.alpha = if (done) 105 else 255
        canvas.drawRoundRect(rect, radius, radius, fill)
        val edge = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 0.8f; color = Color.argb(70, 0, 0, 0) }
        canvas.drawRoundRect(rect, radius, radius, edge)
        if (!done && input.nextId == it.id && input.dayInputs.getOrNull(ev.day)?.isToday == true) {
            edge.strokeWidth = 1.6f
            edge.color = Color.WHITE
            canvas.drawRoundRect(rect, radius, radius, edge)
        }

        val pad = 4f
        val right = if (laneW >= 90f && ev.height >= 26f && it.kind != RoutineKind.PROJECT && it.kind != RoutineKind.JOURNAL) 22f else pad
        val avail = rect.width() - pad - right
        val timeText = rangeText(ev.start, ev.end, input.config.use24h)

        if (ev.height >= 32f && laneW >= 70f) {
            val tp = paint(if (span == 1) 10.5f else 9.5f, ink, bold = true)
            tp.isStrikeThruText = done
            canvas.drawText(fit(it.title, tp, avail), rect.left + pad, rect.top + 12.5f, tp)
            val sp = paint(8.5f, Color.argb(if (done) 140 else 215, Color.red(ink), Color.green(ink), Color.blue(ink)))
            canvas.drawText(fit(timeText, sp, avail), rect.left + pad, rect.top + 23.5f, sp)
        } else if (ev.height >= 26f) {
            val size = if (span == 7) 8f else 9f
            val tp = TextPaint(paint(size, ink, bold = true))
            tp.isStrikeThruText = done
            val lines = if (span == 7) 2 else 2
            val layout = StaticLayout.Builder.obtain(it.title, 0, it.title.length, tp, avail.toInt().coerceAtLeast(8))
                .setMaxLines(lines).setEllipsize(TextUtils.TruncateAt.END).setAlignment(Layout.Alignment.ALIGN_NORMAL).setIncludePad(false).build()
            canvas.save()
            canvas.translate(rect.left + pad, rect.top + ((rect.height() - layout.height) / 2f).coerceAtLeast(2f))
            layout.draw(canvas)
            canvas.restore()
        } else {
            val tp = paint(if (span == 7) 7.5f else 8.5f, ink, bold = true)
            tp.isStrikeThruText = done
            val label = if (laneW >= 90f) "${it.title}, ${rangeText(ev.start, ev.end, input.config.use24h).substringBefore(" –")}" else it.title
            canvas.drawText(fit(label, tp, avail), rect.left + pad, rect.top + rect.height() / 2f + 3f, tp)
        }

        // Check: filled when done, a ring otherwise.
        if (right > pad) {
            val cx = rect.right - 11f
            val cy = rect.top + 11f
            val ring = Paint(Paint.ANTI_ALIAS_FLAG)
            if (done) {
                ring.color = Color.argb(90, 0, 0, 0)
                canvas.drawCircle(cx, cy, 6.5f, ring)
                val tick = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 1.5f; color = Color.WHITE; strokeCap = Paint.Cap.ROUND; strokeJoin = Paint.Join.ROUND }
                canvas.drawPath(Path().apply { moveTo(cx - 3f, cy + 0.2f); lineTo(cx - 0.8f, cy + 2.4f); lineTo(cx + 3.2f, cy - 2.2f) }, tick)
            } else {
                ring.style = Paint.Style.STROKE; ring.strokeWidth = 1.4f; ring.color = Color.argb(170, Color.red(ink), Color.green(ink), Color.blue(ink))
                canvas.drawCircle(cx, cy, 6f, ring)
            }
        }
        if (it.overridden) {
            val dot = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(230, 255, 255, 255) }
            canvas.drawCircle(rect.left + 5f, rect.bottom - 5f, 1.8f, dot)
        }
        val progress = it.progress
        if (progress != null && !done) {
            val bar = Paint().apply { color = Color.argb(70, 0, 0, 0) }
            canvas.drawRect(rect.left + 3f, rect.bottom - 3f, rect.right - 3f, rect.bottom - 1.5f, bar)
            bar.color = Color.argb(220, 255, 255, 255)
            canvas.drawRect(rect.left + 3f, rect.bottom - 3f, rect.left + 3f + (rect.width() - 6f) * progress, rect.bottom - 1.5f, bar)
        }
    }

    private fun drawNow(canvas: Canvas, input: Input, gutter: Float, W: Float) {
        val nowY = input.layout.nowY ?: return
        val rose = Color.parseColor("#FB7185")
        val line = Paint(Paint.ANTI_ALIAS_FLAG).apply { strokeWidth = 1.5f; color = rose }
        canvas.drawLine(gutter, nowY, W - 2f, nowY, line)
        val glow = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = WidgetTheme.withAlpha(rose, 70) }
        canvas.drawCircle(gutter, nowY, 6f, glow)
        val dot = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = rose }
        canvas.drawCircle(gutter, nowY, 3.4f, dot)
        if (input.span == 1 && input.nowMinutes != null) {
            val clock = String.format(Locale.US, "%02d:%02d", input.nowMinutes / 60, input.nowMinutes % 60)
            val lp = paint(7.5f, Color.parseColor("#FDA4AF"), black = true)
            lp.textAlign = Paint.Align.RIGHT
            canvas.drawText(RoutineEngine.formatClockInline(clock, input.config.use24h), gutter - 7f, nowY + 2.8f, lp)
        }
    }
}
