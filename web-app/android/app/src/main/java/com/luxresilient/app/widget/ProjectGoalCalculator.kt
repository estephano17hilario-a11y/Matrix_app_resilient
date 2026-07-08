package com.luxresilient.app.widget

import android.util.Log
import java.text.SimpleDateFormat
import java.util.*

object ProjectGoalCalculator {

    private const val TAG = "ProjectGoalCalculator"

    fun getLocalDateString(dateStr: String?): String {
        if (dateStr.isNullOrEmpty()) return ""
        try {
            if (dateStr.contains("T")) {
                val parsedDate = if (dateStr.contains(".")) {
                    val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS", Locale.US).apply {
                        timeZone = TimeZone.getTimeZone("UTC")
                    }
                    val cleanStr = dateStr.substringBefore("Z").substringBefore("+")
                    sdf.parse(cleanStr)
                } else {
                    val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
                        timeZone = TimeZone.getTimeZone("UTC")
                    }
                    val cleanStr = dateStr.substringBefore("Z").substringBefore("+")
                    sdf.parse(cleanStr)
                }
                
                if (parsedDate != null) {
                    val localSdf = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
                        timeZone = TimeZone.getDefault()
                    }
                    return localSdf.format(parsedDate)
                }
            } else if (dateStr.length >= 10 && dateStr[4] == '-' && dateStr[7] == '-') {
                return dateStr.substring(0, 10)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse date string $dateStr: ${e.message}")
        }
        return dateStr ?: ""
    }

    private fun getSafeWorkingDaysCount(project: ProjectData): Int {
        val count = project.workingDays?.size
        return if (count != null && count > 0) count else 7
    }

    fun getWeeklyGoalMinutes(project: ProjectData): Int {
        val effectiveFrequency = project.uiFrequency ?: project.goalFrequency
        if (effectiveFrequency != "WEEKLY") return project.goalTarget
        val workingDaysCount = getSafeWorkingDaysCount(project)
        val uiTarget = project.uiTarget
        if (uiTarget != null && uiTarget > 0) {
            return (uiTarget * 60).toInt()
        }
        if (project.goalFrequency == "WEEKLY") return project.goalTarget
        return project.goalTarget * workingDaysCount
    }

    fun getMonthlyGoalMinutes(project: ProjectData): Int {
        val effectiveFrequency = project.uiFrequency ?: project.goalFrequency
        if (effectiveFrequency != "MONTHLY") return project.goalTarget
        val uiTarget = project.uiTarget
        if (uiTarget != null && uiTarget > 0) {
            return (uiTarget * 60).toInt()
        }
        if (project.monthlyType == "FLEXIBLE_COUNT" && project.monthlyFlexibleCount != null) {
            return project.goalTarget * project.monthlyFlexibleCount
        }
        val workingDaysCount = getSafeWorkingDaysCount(project)
        if (project.goalFrequency == "MONTHLY") return project.goalTarget
        if (project.monthlyType == "SPECIFIC_DATES") {
            return project.goalTarget * workingDaysCount
        }
        return project.goalTarget * (workingDaysCount * 4)
    }

    fun getDynamicDailyTarget(project: ProjectData): Int {
        val effectiveFrequency = project.uiFrequency ?: project.goalFrequency
        val now = Date()
        val calendar = Calendar.getInstance()
        
        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(now)
        
        val periodStart: Date
        val periodEnd: Date
        val totalGoalMinutes: Int

        if (effectiveFrequency == "WEEKLY") {
            totalGoalMinutes = getWeeklyGoalMinutes(project)
            // Get Monday of current week
            calendar.time = now
            val dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK)
            val diff = if (dayOfWeek == Calendar.SUNDAY) -6 else Calendar.MONDAY - dayOfWeek
            calendar.add(Calendar.DAY_OF_YEAR, diff)
            calendar.set(Calendar.HOUR_OF_DAY, 0)
            calendar.set(Calendar.MINUTE, 0)
            calendar.set(Calendar.SECOND, 0)
            calendar.set(Calendar.MILLISECOND, 0)
            periodStart = calendar.time

            calendar.add(Calendar.DAY_OF_YEAR, 6)
            calendar.set(Calendar.HOUR_OF_DAY, 23)
            calendar.set(Calendar.MINUTE, 59)
            calendar.set(Calendar.SECOND, 59)
            calendar.set(Calendar.MILLISECOND, 999)
            periodEnd = calendar.time
        } else if (effectiveFrequency == "MONTHLY") {
            totalGoalMinutes = getMonthlyGoalMinutes(project)
            calendar.time = now
            calendar.set(Calendar.DAY_OF_MONTH, 1)
            calendar.set(Calendar.HOUR_OF_DAY, 0)
            calendar.set(Calendar.MINUTE, 0)
            calendar.set(Calendar.SECOND, 0)
            calendar.set(Calendar.MILLISECOND, 0)
            periodStart = calendar.time

            calendar.set(Calendar.DAY_OF_MONTH, calendar.getActualMaximum(Calendar.DAY_OF_MONTH))
            calendar.set(Calendar.HOUR_OF_DAY, 23)
            calendar.set(Calendar.MINUTE, 59)
            calendar.set(Calendar.SECOND, 59)
            calendar.set(Calendar.MILLISECOND, 999)
            periodEnd = calendar.time
        } else {
            return project.goalTarget
        }

        if (totalGoalMinutes <= 0) return 0

        // Filter sessions in period
        val periodSessions = (project.sessions ?: emptyList()).filter { s ->
            val sDateStr = getLocalDateString(s.date)
            if (sDateStr.isEmpty()) return@filter false
            try {
                val sDate = SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(sDateStr) ?: return@filter false
                sDate.time >= periodStart.time && sDate.time <= periodEnd.time
            } catch (e: Exception) {
                false
            }
        }

        val pastPeriodSessions = periodSessions.filter { s ->
            getLocalDateString(s.date) != todayStr
        }

        val pastPeriodProgressMinutes = pastPeriodSessions.sumOf { s ->
            (s.duration / 60.0).toInt().coerceAtLeast(0)
        }

        val remainingGoalAtStartOfDay = (totalGoalMinutes - pastPeriodProgressMinutes).coerceAtLeast(0)

        val todayCal = Calendar.getInstance().apply {
            time = now
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }

        var remainingDaysCount = 0

        if (effectiveFrequency == "MONTHLY") {
            if (project.monthlyType == "FLEXIBLE_COUNT") {
                var physicalDaysRemaining = 0
                val tempCal = Calendar.getInstance().apply { time = todayCal.time }
                val endCal = Calendar.getInstance().apply { time = periodEnd }
                while (tempCal.timeInMillis <= endCal.timeInMillis) {
                    physicalDaysRemaining++
                    tempCal.add(Calendar.DAY_OF_YEAR, 1)
                }

                val workedDays = pastPeriodSessions.map { getLocalDateString(it.date) }.distinct().size
                val quota = project.monthlyFlexibleCount ?: 1
                val sessionsRemaining = (quota - workedDays).coerceAtLeast(0)

                remainingDaysCount = if (sessionsRemaining > 0) {
                    minOf(physicalDaysRemaining, sessionsRemaining)
                } else {
                    if (remainingGoalAtStartOfDay > 0) 1 else 0
                }
            } else {
                val tempCal = Calendar.getInstance().apply { time = todayCal.time }
                val endCal = Calendar.getInstance().apply { time = periodEnd }
                while (tempCal.timeInMillis <= endCal.timeInMillis) {
                    var isWorkingDay = false
                    val dayOfMonth = tempCal.get(Calendar.DAY_OF_MONTH)
                    val lastDayOfMonth = tempCal.getActualMaximum(Calendar.DAY_OF_MONTH)

                    if (project.monthlyType == "SPECIFIC_DATES") {
                        val selectedDays = project.workingDays ?: emptyList()
                        if (selectedDays.contains(dayOfMonth)) {
                            isWorkingDay = true
                        }
                        if (project.monthlyLastDay == true && dayOfMonth == lastDayOfMonth) {
                            isWorkingDay = true
                        }
                    } else {
                        isWorkingDay = true
                    }

                    if (isWorkingDay) {
                        remainingDaysCount++
                    }
                    tempCal.add(Calendar.DAY_OF_YEAR, 1)
                }
            }
        } else {
            val workingDays = project.workingDays
            var strictRemainingDays = 0
            var physicalRemainingDays = 0

            val tempCal = Calendar.getInstance().apply { time = todayCal.time }
            val endCal = Calendar.getInstance().apply { time = periodEnd }
            while (tempCal.timeInMillis <= endCal.timeInMillis) {
                physicalRemainingDays++
                val dayOfWeek = tempCal.get(Calendar.DAY_OF_WEEK)
                val tsDayOfWeek = dayOfWeek - 1
                val isWorkingDay = workingDays == null || workingDays.contains(tsDayOfWeek)
                if (isWorkingDay) {
                    strictRemainingDays++
                }
                tempCal.add(Calendar.DAY_OF_YEAR, 1)
            }

            remainingDaysCount = strictRemainingDays

            val totalPlannedDays = workingDays?.size ?: 7
            val idealDailyLoad = totalGoalMinutes.toDouble() / totalPlannedDays.coerceAtLeast(1)
            val strictDailyLoad = if (strictRemainingDays > 0) remainingGoalAtStartOfDay.toDouble() / strictRemainingDays else Double.POSITIVE_INFINITY

            val isOverloaded = strictDailyLoad > (idealDailyLoad * 1.10)
            val hasExtraDays = physicalRemainingDays > strictRemainingDays
            val currentDayOfWeek = todayCal.get(Calendar.DAY_OF_WEEK)
            val isWeekend = currentDayOfWeek == Calendar.SUNDAY || currentDayOfWeek == Calendar.SATURDAY
            val hasDebt = remainingGoalAtStartOfDay > 0

            if ((strictRemainingDays == 0 && hasDebt) || (isOverloaded && hasExtraDays) || (isWeekend && hasDebt && hasExtraDays)) {
                remainingDaysCount = physicalRemainingDays
            }
        }

        if (remainingDaysCount == 0) {
            return if (remainingGoalAtStartOfDay > 0) remainingGoalAtStartOfDay else 0
        }

        val dailyTarget = Math.ceil(remainingGoalAtStartOfDay.toDouble() / remainingDaysCount).toInt()
        return dailyTarget.coerceAtLeast(0)
    }
}
