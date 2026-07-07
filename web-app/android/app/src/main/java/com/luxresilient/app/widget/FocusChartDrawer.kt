package com.luxresilient.app.widget

import android.content.Context
import android.graphics.*
import android.util.Log
import java.text.SimpleDateFormat
import java.util.*

object FocusChartDrawer {

    private const val TAG = "FocusChartDrawer"

    fun drawChart(
        context: Context,
        width: Int,
        height: Int,
        timeframe: String,
        divisionMode: String,
        projects: List<ProjectData>,
        dailyFeed: List<DailyFeedEntryData>
    ): Bitmap {
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val density = context.resources.displayMetrics.density

        // Setup paints
        val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#80FFFFFF")
            textSize = 10 * density
            typeface = Typeface.create("sans-serif", Typeface.NORMAL)
        }

        val titlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            textSize = 11 * density
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
        }

        val progressPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            strokeCap = Paint.Cap.ROUND
        }

        // 1. Calculate Period Range and Data
        val calendar = Calendar.getInstance()
        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(calendar.time)

        // Generate X-axis entries based on timeframe
        val entries = mutableListOf<ChartEntry>()
        var dateLabelRange = ""
        var totalTargetMinutes = 0.0

        // Sum goal targets of all active projects (goalTarget is in minutes)
        val activeProjects = projects.filter { it.goalTarget > 0 }
        val sumDailyTarget = activeProjects.sumOf { it.goalTarget }.toDouble()

        when (timeframe) {
            "DAY" -> {
                dateLabelRange = SimpleDateFormat("d 'de' MMMM", Locale( "es", "ES")).format(calendar.time)
                totalTargetMinutes = sumDailyTarget
                // 6 segments of 4 hours
                for (i in 0 until 6) {
                    val label = String.format("%02d:00", i * 4)
                    entries.add(ChartEntry(label, mutableListOf()))
                }
                // Group sessions today into 4-hour buckets
                for (proj in projects) {
                    val sessions = proj.sessions ?: continue
                    for (session in sessions) {
                        if (session.date == todayStr && !session.date.isNullOrEmpty()) {
                            // Extract hour
                            // For simplicity, we split sessions equally, or if we don't have session hour, we distribute them!
                            // Since sessions array has no hour timestamp in types/index.ts (only date: "YYYY-MM-DD"),
                            // we place today's sessions in the middle bucket (12:00) or distribute them.
                            // Let's place it in 12:00 bucket (index 3).
                            val mins = session.duration / 60f
                            if (mins > 0) {
                                entries[3].segments.add(Segment(proj.title, proj.attribute ?: "DISCIPLINA", mins, proj.color))
                            }
                        }
                    }
                }
            }
            "WEEK" -> {
                // Get Monday of current week
                val cal = Calendar.getInstance()
                val dayOfWeek = cal.get(Calendar.DAY_OF_WEEK)
                val diff = if (dayOfWeek == Calendar.SUNDAY) -6 else Calendar.MONDAY - dayOfWeek
                cal.add(Calendar.DAY_OF_YEAR, diff)
                val mondayStr = SimpleDateFormat("d MMM", Locale("es")).format(cal.time)
                
                val datesOfWeek = mutableListOf<String>()
                val weekLabels = listOf("L", "M", "M", "J", "V", "S", "D")
                for (i in 0 until 7) {
                    datesOfWeek.add(SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cal.time))
                    entries.add(ChartEntry(weekLabels[i], mutableListOf()))
                    cal.add(Calendar.DAY_OF_YEAR, 1)
                }
                cal.add(Calendar.DAY_OF_YEAR, -1)
                val sundayStr = SimpleDateFormat("d MMM", Locale("es")).format(cal.time)
                dateLabelRange = "$mondayStr - $sundayStr".uppercase()
                totalTargetMinutes = sumDailyTarget * 7

                // Populate week days
                for (proj in projects) {
                    val sessions = proj.sessions ?: continue
                    for (session in sessions) {
                        val idx = datesOfWeek.indexOf(session.date)
                        if (idx != -1) {
                            val mins = session.duration / 60f
                            if (mins > 0) {
                                entries[idx].segments.add(Segment(proj.title, proj.attribute ?: "DISCIPLINA", mins, proj.color))
                            }
                        }
                    }
                }
            }
            "MONTH" -> {
                val cal = Calendar.getInstance()
                val currentMonth = cal.get(Calendar.MONTH)
                val currentYear = cal.get(Calendar.YEAR)
                dateLabelRange = SimpleDateFormat("MMMM yyyy", Locale("es")).format(cal.time).uppercase()
                
                val daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
                val datesOfMonth = mutableListOf<String>()
                
                // Group by 5-day buckets
                val bucketsCount = (daysInMonth + 4) / 5
                for (i in 0 until bucketsCount) {
                    val startDay = i * 5 + 1
                    val endDay = minOf(daysInMonth, (i + 1) * 5)
                    entries.add(ChartEntry("$startDay-$endDay", mutableListOf()))
                }
                totalTargetMinutes = sumDailyTarget * daysInMonth

                for (day in 1..daysInMonth) {
                    cal.set(currentYear, currentMonth, day)
                    datesOfMonth.add(SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cal.time))
                }

                for (proj in projects) {
                    val sessions = proj.sessions ?: continue
                    for (session in sessions) {
                        val idx = datesOfMonth.indexOf(session.date)
                        if (idx != -1) {
                            val bucketIdx = idx / 5
                            val mins = session.duration / 60f
                            if (mins > 0 && bucketIdx < entries.size) {
                                entries[bucketIdx].segments.add(Segment(proj.title, proj.attribute ?: "DISCIPLINA", mins, proj.color))
                            }
                        }
                    }
                }
            }
            "8_WEEKS" -> {
                val cal = Calendar.getInstance()
                // Move back 7 weeks
                cal.add(Calendar.WEEK_OF_YEAR, -7)
                // Set to Monday of that week
                val dow = cal.get(Calendar.DAY_OF_WEEK)
                val diff = if (dow == Calendar.SUNDAY) -6 else Calendar.MONDAY - dow
                cal.add(Calendar.DAY_OF_YEAR, diff)
                
                val weekStartDates = mutableListOf<Long>()
                val weekEndDates = mutableListOf<Long>()
                
                val startLabel = SimpleDateFormat("d MMM", Locale("es")).format(cal.time)

                for (i in 0 until 8) {
                    val startMs = cal.timeInMillis
                    weekStartDates.add(startMs)
                    cal.add(Calendar.DAY_OF_YEAR, 6)
                    val endMs = cal.timeInMillis
                    weekEndDates.add(endMs)
                    entries.add(ChartEntry("S${i+1}", mutableListOf()))
                    cal.add(Calendar.DAY_OF_YEAR, 1) // Next Monday
                }
                cal.add(Calendar.DAY_OF_YEAR, -1)
                val endLabel = SimpleDateFormat("d MMM yyyy", Locale("es")).format(cal.time)
                dateLabelRange = "$startLabel - $endLabel".uppercase()
                totalTargetMinutes = sumDailyTarget * 7 * 8

                // Populate 8 weeks
                val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                for (proj in projects) {
                    val sessions = proj.sessions ?: continue
                    for (session in sessions) {
                        try {
                            val sessionDate = sdf.parse(session.date) ?: continue
                            val timeMs = sessionDate.time
                            for (w in 0 until 8) {
                                if (timeMs >= weekStartDates[w] && timeMs <= weekEndDates[w]) {
                                    val mins = session.duration / 60f
                                    if (mins > 0) {
                                        entries[w].segments.add(Segment(proj.title, proj.attribute ?: "DISCIPLINA", mins, proj.color))
                                    }
                                    break
                                }
                            }
                        } catch (_: Exception) {}
                    }
                }
            }
            "3_MONTHS" -> {
                val cal = Calendar.getInstance()
                cal.add(Calendar.MONTH, -2)
                
                val startLabel = SimpleDateFormat("MMMM", Locale("es")).format(cal.time)
                val monthsList = mutableListOf<Int>()
                val yearsList = mutableListOf<Int>()

                for (i in 0 until 3) {
                    monthsList.add(cal.get(Calendar.MONTH))
                    yearsList.add(cal.get(Calendar.YEAR))
                    val label = SimpleDateFormat("MMM", Locale("es")).format(cal.time).uppercase()
                    entries.add(ChartEntry(label, mutableListOf()))
                    cal.add(Calendar.MONTH, 1)
                }
                cal.add(Calendar.MONTH, -1)
                val endLabel = SimpleDateFormat("MMMM yyyy", Locale("es")).format(cal.time)
                dateLabelRange = "$startLabel - $endLabel".uppercase()
                totalTargetMinutes = sumDailyTarget * 90

                val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                for (proj in projects) {
                    val sessions = proj.sessions ?: continue
                    for (session in sessions) {
                        try {
                            val sessionDate = sdf.parse(session.date) ?: continue
                            val sCal = Calendar.getInstance().apply { time = sessionDate }
                            val sMonth = sCal.get(Calendar.MONTH)
                            val sYear = sCal.get(Calendar.YEAR)
                            for (m in 0 until 3) {
                                if (sMonth == monthsList[m] && sYear == yearsList[m]) {
                                    val mins = session.duration / 60f
                                    if (mins > 0) {
                                        entries[m].segments.add(Segment(proj.title, proj.attribute ?: "DISCIPLINA", mins, proj.color))
                                    }
                                    break
                                }
                            }
                        } catch (_: Exception) {}
                    }
                }
            }
            "YEAR" -> {
                val cal = Calendar.getInstance()
                val currentYear = cal.get(Calendar.YEAR)
                dateLabelRange = "AÑO $currentYear"
                totalTargetMinutes = sumDailyTarget * 365

                val monthLabels = listOf("E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D")
                for (i in 0 until 12) {
                    entries.add(ChartEntry(monthLabels[i], mutableListOf()))
                }

                val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                for (proj in projects) {
                    val sessions = proj.sessions ?: continue
                    for (session in sessions) {
                        try {
                            val sessionDate = sdf.parse(session.date) ?: continue
                            val sCal = Calendar.getInstance().apply { time = sessionDate }
                            if (sCal.get(Calendar.YEAR) == currentYear) {
                                val sMonth = sCal.get(Calendar.MONTH)
                                val mins = session.duration / 60f
                                if (mins > 0 && sMonth < entries.size) {
                                    entries[sMonth].segments.add(Segment(proj.title, proj.attribute ?: "DISCIPLINA", mins, proj.color))
                                }
                            }
                        } catch (_: Exception) {}
                    }
                }
            }
        }

        // Calculate total focus time in the period
        var totalFocusedMins = 0f
        for (entry in entries) {
            totalFocusedMins += entry.segments.sumOf { it.minutes.toDouble() }.toFloat()
        }

        // 2. DRAW GOAL PROGRESS BAR (TOP)
        val topPadding = 12 * density
        val leftMargin = 16 * density
        val rightMargin = 16 * density
        val barWidth = width - leftMargin - rightMargin

        // Draw header text
        canvas.drawText("META DE ENFOQUE", leftMargin, topPadding + 10 * density, titlePaint)
        canvas.drawText(dateLabelRange, leftMargin, topPadding + 22 * density, textPaint)

        // Goal percentage
        val targetHrs = totalTargetMinutes / 60.0
        val focusedHrs = totalFocusedMins / 60.0
        val percentage = if (targetHrs > 0) minOf(100, ((focusedHrs / targetHrs) * 100).toInt()) else 0

        val goalText = String.format("%.1fh / %.0fh (%d%%)", focusedHrs, targetHrs, percentage)
        val textWidth = textPaint.measureText(goalText)
        canvas.drawText(goalText, width - rightMargin - textWidth, topPadding + 15 * density, titlePaint)

        // Draw Progress Track
        val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#1C1C24")
            style = Paint.Style.FILL
        }
        val progressTrackRect = RectF(leftMargin, topPadding + 28 * density, leftMargin + barWidth, topPadding + 34 * density)
        canvas.drawRoundRect(progressTrackRect, 3 * density, 3 * density, trackPaint)

        // Draw Progress Fill (Linear Gradient)
        if (percentage > 0) {
            val fillWidth = barWidth * (percentage / 100f)
            val fillRect = RectF(leftMargin, topPadding + 28 * density, leftMargin + fillWidth, topPadding + 34 * density)
            val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                shader = LinearGradient(
                    leftMargin, 0f, leftMargin + fillWidth, 0f,
                    Color.parseColor("#06b6d4"), Color.parseColor("#6366f1"),
                    Shader.TileMode.CLAMP
                )
                style = Paint.Style.FILL
            }
            canvas.drawRoundRect(fillRect, 3 * density, 3 * density, fillPaint)
        }

        // 3. DRAW CHART AREA
        val chartTop = topPadding + 46 * density
        val chartBottom = height - 24 * density
        val chartLeft = leftMargin + 20 * density // room for Y-axis labels
        val chartRight = width - rightMargin
        val chartHeight = chartBottom - chartTop
        val chartWidth = chartRight - chartLeft

        // Find max value for Y-axis scaling
        var maxEntryMins = entries.maxOfOrNull { entry ->
            entry.segments.sumOf { it.minutes.toDouble() }
        }?.toFloat() ?: 120f
        if (maxEntryMins < 60f) maxEntryMins = 60f // default min max of 1 hour

        // Y-axis grid lines (draw 3 lines: 0, 50%, 100%)
        val gridPaint = Paint().apply {
            color = Color.parseColor("#0DFFFFFF")
            strokeWidth = 1 * density
            style = Paint.Style.STROKE
        }

        val stepHrs = (maxEntryMins / 60f / 2f)
        for (i in 0..2) {
            val y = chartBottom - (chartHeight * (i / 2f))
            canvas.drawLine(chartLeft, y, chartRight, y, gridPaint)
            
            // Draw Y-axis label
            val labelText = String.format(Locale.US, "%.1fh", stepHrs * i)
            val labelWidth = textPaint.measureText(labelText)
            canvas.drawText(labelText, chartLeft - labelWidth - 4 * density, y + 3 * density, textPaint)
        }

        // Draw X-axis line
        canvas.drawLine(chartLeft, chartBottom, chartRight, chartBottom, gridPaint)

        // 4. DRAW BARS
        if (entries.isNotEmpty()) {
            val colWidth = chartWidth / entries.size
            val barMargin = 4 * density
            val singleBarWidth = colWidth - (barMargin * 2)

            for (eIdx in entries.indices) {
                val entry = entries[eIdx]
                val colLeft = chartLeft + (eIdx * colWidth) + barMargin
                
                // Group segments based on division mode
                val segments = when (divisionMode) {
                    "rasgo" -> groupSegmentsByTrait(entry.segments)
                    "proyecto" -> groupSegmentsByProject(entry.segments)
                    else -> listOf(Segment("Total", "VITALIDAD", entry.segments.sumOf { it.minutes.toDouble() }.toFloat(), "#6366f1"))
                }

                var currentY = chartBottom
                for (sIdx in segments.indices) {
                    val seg = segments[sIdx]
                    val segHeight = (seg.minutes / maxEntryMins) * chartHeight
                    if (segHeight <= 0) continue

                    val segTop = currentY - segHeight
                    val segRect = RectF(colLeft, segTop, colLeft + singleBarWidth, currentY)
                    
                    val segColor = try { Color.parseColor(seg.color ?: "#6366f1") } catch (e: Exception) { Color.parseColor("#6366f1") }
                    val barPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = segColor
                        style = Paint.Style.FILL
                    }

                    // Rounded top only for the highest segment in the bar
                    if (sIdx == segments.size - 1) {
                        canvas.drawRoundRect(segRect, 3 * density, 3 * density, barPaint)
                        // Fill bottom square corners to only round top
                        if (segHeight > 3 * density) {
                            val squareRect = RectF(colLeft, segTop + (3 * density), colLeft + singleBarWidth, currentY)
                            canvas.drawRect(squareRect, barPaint)
                        }
                    } else {
                        canvas.drawRect(segRect, barPaint)
                    }

                    currentY = segTop
                }

                // Draw X-axis label
                val labelWidth = textPaint.measureText(entry.label)
                val labelX = colLeft + (singleBarWidth / 2f) - (labelWidth / 2f)
                canvas.drawText(entry.label, labelX, chartBottom + 14 * density, textPaint)
            }
        }

        return bitmap
    }

    private fun groupSegmentsByTrait(raw: List<Segment>): List<Segment> {
        val grouped = mutableMapOf<String, Float>()
        for (s in raw) {
            grouped[s.trait] = (grouped[s.trait] ?: 0f) + s.minutes
        }
        return grouped.map { (trait, mins) ->
            Segment(trait, trait, mins, TraitIcons.getColor(trait))
        }.sortedBy { it.trait }
    }

    private fun groupSegmentsByProject(raw: List<Segment>): List<Segment> {
        val grouped = mutableMapOf<String, Pair<Float, String?>>()
        for (s in raw) {
            val curr = grouped[s.name] ?: Pair(0f, s.color)
            grouped[s.name] = Pair(curr.first + s.minutes, s.color)
        }
        return grouped.map { (name, pair) ->
            Segment(name, "VITALIDAD", pair.first, pair.second ?: "#6366f1")
        }.sortedBy { it.name }
    }

    private data class ChartEntry(
        val label: String,
        val segments: MutableList<Segment>
    )

    private data class Segment(
        val name: String,
        val trait: String,
        val minutes: Float,
        val color: String?
    )
}
