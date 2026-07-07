package com.luxresilient.app.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.RadialGradient
import android.graphics.LinearGradient
import android.graphics.Shader
import android.graphics.Typeface
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.luxresilient.app.R
import java.util.Calendar

/**
 * RemoteViewsService for the habit list widget.
 * Provides a factory that creates RemoteViews for each habit item.
 */
class HabitWidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return HabitWidgetFactory(applicationContext, intent)
    }
}

/**
 * RemoteViewsFactory that builds each habit item view.
 * Replicates the HabitItem.tsx UI as closely as possible.
 */
class HabitWidgetFactory(
    private val context: Context,
    private val intent: Intent
) : RemoteViewsService.RemoteViewsFactory {

    companion object {
        private const val TAG = "HabitWidgetFactory"
    }

    // Data class for representing flattened chronological items
    data class ChronologicalWidgetEntry(
        val uniqueId: String,
        val habitId: String,
        val type: String,           // "HABIT" or "SUBTASK"
        val text: String,
        val subText: String?,
        val time: String,
        val isCompleted: Boolean,
        val color: Int,
        val iconName: String?,
        val attribute: String?,
        val percentage: Int,
        val rawHabit: HabitData,
        val subtaskId: String? = null
    )

    private var habits: List<HabitData> = emptyList()
    private var attributes: Map<String, AttributeData> = emptyMap()
    private var displayItems: List<ChronologicalWidgetEntry> = emptyList()
    
    private val widgetId = intent.getIntExtra(
        AppWidgetManager.EXTRA_APPWIDGET_ID,
        AppWidgetManager.INVALID_APPWIDGET_ID
    )

    override fun onCreate() {
        Log.d(TAG, "Factory created for widget $widgetId")
    }

    private fun parseTimeToMinutes(timeStr: String?): Int {
        if (timeStr == null || !timeStr.contains(":")) return 24 * 60
        return try {
            val parts = timeStr.split(":")
            val hours = parts[0].toIntOrNull() ?: 0
            val minutes = parts[1].toIntOrNull() ?: 0
            hours * 60 + minutes
        } catch (_: Exception) {
            24 * 60
        }
    }

    private fun isLastDayOfMonth(): Boolean {
        val cal = Calendar.getInstance()
        return cal.get(Calendar.DAY_OF_MONTH) == cal.getActualMaximum(Calendar.DAY_OF_MONTH)
    }

    override fun onDataSetChanged() {
        Log.d(TAG, "Data set changed - refreshing habits")
        try {
            val client = SupabaseWidgetClient(context)
            habits = client.fetchHabits()
            attributes = client.fetchAttributes()
            Log.d(TAG, "Loaded ${habits.size} habits, ${attributes.size} attributes")

            val configPrefs = context.getSharedPreferences("lux_widget_config", Context.MODE_PRIVATE)
            val chronologicalSort = configPrefs.getBoolean("chronological_sort", false)

            val items = ArrayList<ChronologicalWidgetEntry>()
            val todayDay = Calendar.getInstance().get(Calendar.DAY_OF_WEEK) - 1

            if (chronologicalSort) {
                // Replicate TS HabitVisualView.tsx chronologicalItems logic
                for (habit in habits) {
                    val isDue = habit.frequency == "DAILY" || 
                        (habit.frequency == "WEEKLY" && (
                            habit.weeklyType == "FLEXIBLE_COUNT" || 
                            habit.frequencyDays == null || 
                            habit.frequencyDays.isEmpty() || 
                            habit.frequencyDays.contains(todayDay)
                        )) ||
                        (habit.frequency == "MONTHLY" && (
                            habit.monthlyType == "FLEXIBLE_COUNT" || 
                            habit.frequencyDays?.contains(Calendar.getInstance().get(Calendar.DAY_OF_MONTH)) == true || 
                            (habit.monthlyLastDay == true && isLastDayOfMonth())
                        ))

                    if (!isDue) continue // Skip items not active today

                    val baseColor = getHabitColor(habit)
                    val parsedColor = try { Color.parseColor(baseColor) } catch (_: Exception) { Color.parseColor("#6366f1") }
                    
                    if (habit.type == "CHECKLIST" && habit.checklist != null && habit.checklist.isNotEmpty()) {
                        // Split checklist into individual subtask entries
                        for (sub in habit.checklist) {
                            val isSubtaskActiveToday = sub.days == null || sub.days.isEmpty() || sub.days.contains(todayDay)
                            if (isSubtaskActiveToday) {
                                val subColor = try { Color.parseColor(sub.color ?: baseColor) } catch (_: Exception) { parsedColor }
                                items.add(ChronologicalWidgetEntry(
                                    uniqueId = "${habit.id}-sub-${sub.id}",
                                    habitId = habit.id ?: "",
                                    type = "SUBTASK",
                                    text = sub.text ?: "Subtarea",
                                    subText = "Subtarea",
                                    time = sub.reminderTime ?: habit.reminderTime ?: "23:59",
                                    isCompleted = sub.completed == true,
                                    color = subColor,
                                    iconName = habit.iconName,
                                    attribute = habit.attribute,
                                    percentage = 0,
                                    rawHabit = habit,
                                    subtaskId = sub.id
                                ))
                            }
                        }
                    } else if (habit.type == "QUANTITY" && habit.isDivided == true && habit.dividedTimes != null && habit.dividedTimes.isNotEmpty()) {
                        // Split divided quantity into individual times
                        val sortedTimes = habit.dividedTimes.sortedBy { it.time ?: "23:59" }
                        var accumulated = 0
                        for ((index, t) in sortedTimes.withIndex()) {
                            val targetAmount = accumulated + (t.amount ?: 1)
                            val isCompleted = (habit.currentValue ?: 0) >= targetAmount || habit.completedToday
                            val labelText = "${t.amount ?: 1} ${habit.unit ?: ""}".trim()
                            items.add(ChronologicalWidgetEntry(
                                uniqueId = "${habit.id}-time-$index",
                                habitId = habit.id ?: "",
                                type = "HABIT",
                                text = habit.title ?: "Sin título",
                                subText = labelText,
                                time = t.time ?: "23:59",
                                isCompleted = isCompleted,
                                color = parsedColor,
                                iconName = habit.iconName,
                                attribute = habit.attribute,
                                percentage = 0,
                                rawHabit = habit
                            ))
                            accumulated += t.amount ?: 1
                        }
                    } else {
                        // Standard habit
                        var displayTime = habit.reminderTime ?: "23:59"
                        var displaySubText: String? = null
                        
                        if (habit.type == "QUANTITY" && habit.isDivided == true) {
                            val amount = habit.dividedQuantity ?: 1
                            displaySubText = "$amount ${habit.unit ?: ""}".trim()
                            
                            if (!habit.nextInstanceTime.isNullOrEmpty()) {
                                try {
                                    val date = java.time.format.DateTimeFormatter.ISO_DATE_TIME.parse(habit.nextInstanceTime)
                                    val ldt = java.time.LocalDateTime.from(date)
                                    val hours = ldt.hour.toString().padStart(2, '0')
                                    val minutes = ldt.minute.toString().padStart(2, '0')
                                    displayTime = "$hours:$minutes"
                                } catch (_: Exception) {}
                            }
                        }

                        items.add(ChronologicalWidgetEntry(
                            uniqueId = habit.id ?: "",
                            habitId = habit.id ?: "",
                            type = "HABIT",
                            text = habit.title ?: "Sin título",
                            subText = displaySubText,
                            time = displayTime,
                            isCompleted = habit.completedToday,
                            color = parsedColor,
                            iconName = habit.iconName,
                            attribute = habit.attribute,
                            percentage = getPercentage(habit),
                            rawHabit = habit
                        ))
                    }
                }

                // Sort chronologically
                items.sortBy { parseTimeToMinutes(it.time) }
                displayItems = items
            } else {
                // Default view (list habits in order)
                for (habit in habits) {
                    val baseColor = getHabitColor(habit)
                    val parsedColor = try { Color.parseColor(baseColor) } catch (_: Exception) { Color.parseColor("#6366f1") }
                    items.add(ChronologicalWidgetEntry(
                        uniqueId = habit.id ?: "",
                        habitId = habit.id ?: "",
                        type = "HABIT",
                        text = habit.title ?: "Sin título",
                        subText = getProgressText(habit),
                        time = habit.reminderTime ?: "23:59",
                        isCompleted = habit.completedToday,
                        color = parsedColor,
                        iconName = habit.iconName,
                        attribute = habit.attribute,
                        percentage = getPercentage(habit),
                        rawHabit = habit
                    ))
                }
                displayItems = items
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error loading data: ${e.message}", e)
        }
    }

    override fun onDestroy() {
        habits = emptyList()
        attributes = emptyMap()
        displayItems = emptyList()
    }

    override fun getCount(): Int = displayItems.size

    override fun getViewAt(position: Int): RemoteViews {
        try {
            if (position >= displayItems.size) {
                return RemoteViews(context.packageName, R.layout.widget_habit_item)
            }

            val item = displayItems[position]
            val habit = item.rawHabit

            // Read customization preferences
            val configPrefs = context.getSharedPreferences("lux_widget_config", Context.MODE_PRIVATE)
            val opacity = configPrefs.getInt("card_opacity", 90)
            val cardSize = configPrefs.getString("card_size", "medium") ?: "medium"
            val checklistMode = configPrefs.getString("checklist_mode", "direct")
            val cardColumns = configPrefs.getInt("card_columns", 1)
            val cardSpacing = configPrefs.getString("card_spacing", "medio") ?: "medio"
            val gradientStyle = configPrefs.getString("gradient_style", "radial") ?: "radial"
            val borderStyle = configPrefs.getString("border_style", "both") ?: "both"
            val chronologicalSort = configPrefs.getBoolean("chronological_sort", false)

            // Choose layout file dynamically based on sizing and column configuration
            val layoutId = if (cardColumns == 2) {
                R.layout.widget_habit_item_grid
            } else if (cardSize == "thin" || cardSize == "super_thin") {
                R.layout.widget_habit_item_thin
            } else {
                R.layout.widget_habit_item
            }
            val views = RemoteViews(context.packageName, layoutId)

            val parsedColor = item.color

            // 1. Set Card Spacing (Bottom Margin Simulation via Root Wrapper padding)
            val density = context.resources.displayMetrics.density
            val spacingPx = when (cardSpacing) {
                "poco" -> (1.5f * density).toInt()  // Almost touching!
                "grande" -> (12 * density).toInt()
                else -> (6 * density).toInt()      // Medio / default
            }
            views.setViewPadding(R.id.habit_item_root_wrapper, 0, 0, 0, spacingPx)

            // 2. Set Card Opacity via Background ImageView
            val alphaInt = (opacity * 2.55).toInt().coerceIn(0, 255)
            views.setInt(R.id.habit_card_background, "setImageAlpha", alphaInt)

            // 3. Dynamic Glow / Gradient Background
            val hasGlow = (gradientStyle != "none") || (borderStyle == "card" || borderStyle == "both")
            if (hasGlow) {
                views.setViewVisibility(R.id.habit_glow_background, View.VISIBLE)
                // Adjust width for list vs grid layout
                val widthPx = if (cardColumns == 2) (155 * density).toInt() else (320 * density).toInt()
                val heightPx = when (cardSize) {
                    "super_thin" -> (36 * density).toInt()
                    "thin" -> (46 * density).toInt()
                    "large" -> (84 * density).toInt()
                    else -> (64 * density).toInt()
                }
                val glowBitmap = createGlowBackground(widthPx, heightPx, parsedColor, opacity, gradientStyle, borderStyle)
                views.setImageViewBitmap(R.id.habit_glow_background, glowBitmap)
            } else {
                views.setViewVisibility(R.id.habit_glow_background, View.GONE)
            }

            // 4. Custom Size Padding inside Card
            val verticalPadding = when (cardSize) {
                "super_thin" -> (3 * density).toInt()
                "thin" -> (5 * density).toInt()
                "large" -> (16 * density).toInt()
                else -> (10 * density).toInt()
            }
            // Slightly narrower padding for two columns
            val sidePadding = if (cardColumns == 2) (6 * density).toInt() else (10 * density).toInt()
            views.setViewPadding(
                R.id.habit_item_root, 
                sidePadding, 
                verticalPadding, 
                sidePadding, 
                verticalPadding
            )

            // 5. Custom flat color overlay (fallback when gradient style is none)
            if (gradientStyle == "none") {
                views.setViewVisibility(R.id.habit_color_overlay, View.VISIBLE)
                val alphaFloat = (opacity / 100f) * 0.09f
                views.setFloat(R.id.habit_color_overlay, "setAlpha", alphaFloat)
                views.setInt(R.id.habit_color_overlay, "setBackgroundColor", parsedColor)
            } else {
                views.setViewVisibility(R.id.habit_color_overlay, View.GONE)
            }

            // --- TITLE ---
            views.setTextViewText(R.id.habit_title, item.text)
            
            // Adjust title text size for super_thin or columns
            if (cardSize == "super_thin" || cardColumns == 2) {
                views.setFloat(R.id.habit_title, "setTextSize", 11.5f)
            } else if (cardSize == "thin") {
                views.setFloat(R.id.habit_title, "setTextSize", 13f)
            } else {
                views.setFloat(R.id.habit_title, "setTextSize", 15f)
            }

            // Apply completed state (dimmed text)
            if (item.isCompleted) {
                views.setTextColor(R.id.habit_title, Color.parseColor("#99FFFFFF"))
            } else {
                views.setTextColor(R.id.habit_title, Color.WHITE)
            }

            // --- TRAIT ICON ---
            val traitEmoji = if (item.iconName != null) {
                getIconEmoji(item.iconName)
            } else if (item.attribute != null) {
                TraitIcons.getEmoji(item.attribute)
            } else {
                "⭐"
            }
            views.setTextViewText(R.id.habit_icon, traitEmoji)

            // Toggle icon visibility based on settings switch
            val showIcons = configPrefs.getBoolean("show_icons", true)
            if (showIcons) {
                views.setViewVisibility(R.id.habit_icon_container, View.VISIBLE)
                views.setViewVisibility(R.id.habit_icon, View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.habit_icon_container, View.GONE)
                views.setViewVisibility(R.id.habit_icon, View.GONE)
            }

            // --- STREAK BADGE ---
            // Hide streak badge for super thin, 2-columns or in chronological subtasks
            if (habit.streak > 0 && cardSize != "super_thin" && cardColumns != 2 && item.type != "SUBTASK") {
                views.setViewVisibility(R.id.habit_streak_container, View.VISIBLE)
                views.setTextViewText(R.id.habit_streak_count, habit.streak.toString())
                if (item.isCompleted) {
                    views.setTextColor(R.id.habit_streak_count, Color.parseColor("#fb923c"))
                } else {
                    views.setTextColor(R.id.habit_streak_count, Color.parseColor("#9ca3af"))
                }
            } else {
                views.setViewVisibility(R.id.habit_streak_container, View.GONE)
            }

            // --- PROGRESS TEXT ---
            // In chronological view, display scheduled reminder time
            val displayProgress = if (chronologicalSort) {
                if (!item.subText.isNullOrEmpty() && item.subText != "Subtarea") {
                    "${item.subText} • ${item.time}"
                } else {
                    item.time
                }
            } else {
                item.subText ?: "0/1"
            }
            views.setTextViewText(R.id.habit_progress, displayProgress)
            views.setTextColor(R.id.habit_progress, parsedColor)

            // --- COMPLETE BUTTON (PROGRESS CIRCLE image) ---
            val percentage = if (item.type == "SUBTASK") {
                if (item.isCompleted) 100 else 0
            } else {
                item.percentage
            }
            val borderCircleEnabled = (borderStyle == "circle" || borderStyle == "both")
            val circleBitmap = createCircleButton(context, parsedColor, item.isCompleted, percentage, borderCircleEnabled)
            views.setImageViewBitmap(R.id.habit_complete_image, circleBitmap)
            views.setViewVisibility(R.id.habit_check_icon, View.GONE) // Hidden because checkmark is inside bitmap

            // --- SUBTASKS (for CHECKLIST type) ---
            // In chronological sort, subtasks are individual cards, so hide checklist container!
            val showSubtasks = !chronologicalSort && habit.type == "CHECKLIST" && 
                               checklistMode == "direct" && habit.checklist != null && 
                               habit.checklist!!.isNotEmpty() && cardSize != "super_thin" && 
                               cardColumns != 2

            if (showSubtasks) {
                views.setViewVisibility(R.id.habit_subtasks_container, View.VISIBLE)
                views.removeAllViews(R.id.habit_subtasks_container)

                val todayDay = Calendar.getInstance().get(Calendar.DAY_OF_WEEK) - 1
                val visibleItems = habit.checklist!!.filter { subItem ->
                    subItem.days == null || subItem.days.isEmpty() || subItem.days.contains(todayDay)
                }

                for (subtask in visibleItems) {
                    val subtaskView = RemoteViews(context.packageName, R.layout.widget_habit_subtask)
                    subtaskView.setTextViewText(R.id.subtask_text, subtask.text ?: "Subtarea")

                    if (subtask.completed) {
                        subtaskView.setInt(R.id.subtask_check_circle, "setBackgroundResource", R.drawable.widget_subtask_checked)
                        subtaskView.setViewVisibility(R.id.subtask_check_icon, View.VISIBLE)
                        subtaskView.setTextColor(R.id.subtask_text, Color.parseColor("#4DFFFFFF"))
                    } else {
                        subtaskView.setInt(R.id.subtask_check_circle, "setBackgroundResource", R.drawable.widget_subtask_unchecked)
                        subtaskView.setViewVisibility(R.id.subtask_check_icon, View.GONE)
                        subtaskView.setTextColor(R.id.subtask_text, Color.parseColor("#CCFFFFFF"))
                    }

                    // Subtask time
                    if (!subtask.reminderTime.isNullOrEmpty()) {
                        subtaskView.setViewVisibility(R.id.subtask_time, View.VISIBLE)
                        subtaskView.setTextViewText(R.id.subtask_time, subtask.reminderTime)
                    } else {
                        subtaskView.setViewVisibility(R.id.subtask_time, View.GONE)
                    }

                    // Setup click intent for toggling subtask
                    val toggleIntent = Intent().apply {
                        action = HabitWidgetProvider.ACTION_TOGGLE_SUBTASK
                        putExtra(HabitWidgetProvider.EXTRA_HABIT_ID, habit.id)
                        putExtra(HabitWidgetProvider.EXTRA_SUBTASK_ID, subtask.id)
                    }
                    subtaskView.setOnClickFillInIntent(R.id.subtask_text, toggleIntent)

                    views.addView(R.id.habit_subtasks_container, subtaskView)
                }
            } else {
                views.setViewVisibility(R.id.habit_subtasks_container, View.GONE)
            }

            // --- CLICK HANDLING & INTENTS ---
            val fillIntent = Intent().apply {
                if (item.type == "SUBTASK") {
                    // Click subtask complete button toggles subtask directly
                    action = HabitWidgetProvider.ACTION_TOGGLE_SUBTASK
                    putExtra(HabitWidgetProvider.EXTRA_HABIT_ID, item.habitId)
                    putExtra(HabitWidgetProvider.EXTRA_SUBTASK_ID, item.subtaskId)
                } else {
                    val useDialog = (habit.type == "CHECKLIST" && checklistMode == "dialog") || (habit.type == "QUANTITY")
                    if (useDialog) {
                        action = HabitWidgetProvider.ACTION_OPEN_DIALOG
                    } else {
                        action = HabitWidgetProvider.ACTION_COMPLETE_HABIT
                    }
                    putExtra(HabitWidgetProvider.EXTRA_HABIT_ID, item.habitId)
                }
            }
            views.setOnClickFillInIntent(R.id.habit_complete_btn, fillIntent)

            // Open app shortcut or open dialog when clicking card body
            val cardFillIntent = Intent().apply {
                val useDialog = (habit.type == "CHECKLIST" && checklistMode == "dialog") || (habit.type == "QUANTITY")
                if (useDialog && item.type != "SUBTASK") {
                    action = HabitWidgetProvider.ACTION_OPEN_DIALOG
                } else {
                    action = HabitWidgetProvider.ACTION_OPEN_APP_SHORTCUT
                }
                putExtra(HabitWidgetProvider.EXTRA_HABIT_ID, item.habitId)
            }
            views.setOnClickFillInIntent(R.id.habit_text_container, cardFillIntent)

            return views
        } catch (e: Exception) {
            Log.e(TAG, "Error rendering view at position $position: ${e.message}", e)
            
            // Return a safe fallback view instead of crashing
            val fallback = RemoteViews(context.packageName, R.layout.widget_habit_item)
            fallback.setTextViewText(R.id.habit_title, "Error al cargar")
            return fallback
        }
    }

    override fun getLoadingView(): RemoteViews {
        return RemoteViews(context.packageName, R.layout.widget_habit_item)
    }

    override fun getViewTypeCount(): Int = 1

    override fun getItemId(position: Int): Long {
        return if (position < habits.size) habits[position].id.hashCode().toLong() else position.toLong()
    }

    override fun hasStableIds(): Boolean = true

    // ========== HELPER FUNCTIONS ==========

    /**
     * Get the display color for a habit (custom color > attribute color > trait default)
     */
    private fun getHabitColor(habit: HabitData): String {
        // 1. Custom color on the habit itself
        if (!habit.customColor.isNullOrEmpty()) return habit.customColor

        // 2. From user's custom attributes
        val attr = attributes[habit.attribute]
        if (attr?.color != null && attr.color.isNotEmpty()) return attr.color

        // 3. Default trait color
        return TraitIcons.getColor(habit.attribute)
    }

    /**
     * Get the progress text matching the TS progressText useMemo
     */
    private fun getProgressText(habit: HabitData): String {
        // Weekly flexible count
        if (habit.frequency == "WEEKLY" && habit.weeklyType == "FLEXIBLE_COUNT" && habit.weeklyFlexibleCount != null) {
            val cal = Calendar.getInstance()
            val dow = cal.get(Calendar.DAY_OF_WEEK)
            cal.add(Calendar.DAY_OF_YEAR, -(if (dow == Calendar.SUNDAY) 6 else dow - Calendar.MONDAY))
            cal.set(Calendar.HOUR_OF_DAY, 0)
            cal.set(Calendar.MINUTE, 0)
            cal.set(Calendar.SECOND, 0)
            val startOfWeek = cal.time
            
            val completions = habit.history?.count { dateStr ->
                try {
                    val parts = dateStr.split("-")
                    if (parts.size >= 3) {
                        val dateCal = Calendar.getInstance()
                        dateCal.set(parts[0].toInt(), parts[1].toInt() - 1, parts[2].toInt())
                        dateCal.time >= startOfWeek
                    } else false
                } catch (_: Exception) { false }
            } ?: 0
            return "$completions/${habit.weeklyFlexibleCount} esta semana"
        }

        // Monthly flexible count
        if (habit.frequency == "MONTHLY" && habit.monthlyType == "FLEXIBLE_COUNT" && habit.monthlyFlexibleCount != null) {
            val cal = Calendar.getInstance()
            val currentMonth = String.format("%04d-%02d", cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1)
            val completions = habit.history?.count { it.startsWith(currentMonth) } ?: 0
            return "$completions/${habit.monthlyFlexibleCount} este mes"
        }

        // Quantity type
        if (habit.type == "QUANTITY") {
            val current = habit.currentValue ?: 0
            val target = habit.targetValue ?: 1
            val unit = habit.unit ?: ""
            return "$current/$target $unit".trim()
        }

        // Checklist type
        if (habit.type == "CHECKLIST" && habit.checklist != null) {
            val todayDay = Calendar.getInstance().get(Calendar.DAY_OF_WEEK) - 1
            val visibleItems = habit.checklist.filter { item ->
                item.days == null || item.days.isEmpty() || item.days.contains(todayDay)
            }
            val total = visibleItems.size
            val completed = visibleItems.count { it.completed }
            return "$completed/$total"
        }

        return if (habit.completedToday) "1/1" else "0/1"
    }

    /**
     * Calculate percentage for partial progress display
     */
    private fun getPercentage(habit: HabitData): Int {
        if (habit.type == "QUANTITY") {
            val target = habit.targetValue ?: 1
            val current = habit.currentValue ?: 0
            val divisor = if (target == 0) 1 else target
            return minOf(100, maxOf(0, (current * 100) / divisor))
        }
        if (habit.type == "CHECKLIST" && habit.checklist != null) {
            val todayDay = Calendar.getInstance().get(Calendar.DAY_OF_WEEK) - 1
            val visibleItems = habit.checklist.filter { item ->
                item.days == null || item.days.isEmpty() || item.days.contains(todayDay)
            }
            val total = visibleItems.size
            if (total == 0) return if (habit.completedToday) 100 else 0
            val completed = visibleItems.count { it.completed }
            return minOf(100, maxOf(0, (completed * 100) / total))
        }
        return if (habit.completedToday) 100 else 0
    }

    /**
     * Map iconName to emoji (best effort for common Lucide icons)
     */
    private fun getIconEmoji(iconName: String): String {
        return when (iconName) {
            // Fitness & Health
            "Dumbbell", "dumbbell" -> "💪"
            "Heart", "heart" -> "❤️"
            "HeartPulse", "heart-pulse" -> "💓"
            "Activity", "activity" -> "📈"
            "Bike", "bike" -> "🚴"
            "Footprints", "footprints" -> "👣"
            "Scale", "scale" -> "⚖️"
            "Running", "run", "Run", "running" -> "🏃"
            "Walk", "walk", "🚶" -> "🚶"
            "Swim", "swim" -> "🏊"
            "Meditation", "yoga", "Yoga", "meditation" -> "🧘"
            
            // Mind & Learning
            "Brain", "brain" -> "🧠"
            "BookOpen", "book-open" -> "📖"
            "Book", "book", "BookMarked", "book-marked" -> "📚"
            "GraduationCap", "graduation-cap" -> "🎓"
            "Lightbulb", "lightbulb" -> "💡"
            "Puzzle", "puzzle" -> "🧩"
            "Languages", "languages" -> "🌐"
            "Notebook", "notebook" -> "📓"
            "FileText", "file-text" -> "📄"
            "Calculator", "calculator" -> "🧮"
            "Search", "search" -> "🔍"
            
            // Productivity & Organization
            "Target", "target" -> "🎯"
            "CheckCircle", "check-circle", "Check", "check" -> "✅"
            "Clock", "clock", "Clock3" -> "⏰"
            "Timer", "timer" -> "⏱️"
            "Calendar", "calendar", "CalendarRange" -> "📅"
            "ListTodo", "list-todo", "List", "list" -> "📝"
            "Hourglass", "hourglass" -> "⏳"
            "Pin", "pin" -> "📌"
            "Grid", "grid" -> "🏁"
            "Minimize2", "minimize-2" -> "🔍"
            "Settings", "settings" -> "⚙️"
            
            // Social & Communication
            "Users", "users" -> "👥"
            "MessageCircle", "message-circle", "MessageSquare", "message-square" -> "💬"
            "Phone", "phone" -> "📱"
            "Mail", "mail", "MailOpen", "mail-open" -> "📧"
            "HeartHandshake", "heart-handshake" -> "🤝"
            "Share2", "share-2" -> "📤"
            "ThumbsUp", "thumbs-up" -> "👍"
            "ThumbsDown", "thumbs-down" -> "👎"
            
            // Creative & Leisure
            "Palette", "palette" -> "🎨"
            "Music", "music" -> "🎵"
            "Camera", "camera" -> "📸"
            "Video", "video" -> "📹"
            "Pen", "pencil", "Pencil", "brush", "Brush" -> "✏️"
            "Gamepad", "gamepad" -> "🎮"
            "Tv", "tv", "Monitor", "monitor" -> "📺"
            "Headphones", "headphones" -> "🎧"
            "Mic", "mic" -> "🎤"
            "Brush", "brush" -> "🖌️"
            "Scissors", "scissors" -> "✂️"
            
            // Spiritual & Nature
            "Ghost", "ghost" -> "👻"
            "Sparkles", "sparkles", "Sparkle", "sparkle" -> "✨"
            "Sun", "sun" -> "☀️"
            "Moon", "moon" -> "🌙"
            "Leaf", "leaf" -> "🍃"
            "Compass", "compass" -> "🧭"
            "Globe", "globe" -> "🌍"
            "Cloud", "cloud" -> "☁️"
            "CloudLightning", "cloud-lightning" -> "⚡"
            "CloudRain", "cloud-rain" -> "🌧️"
            "Snowflake", "snowflake", "CloudSnow", "cloud-snow" -> "❄️"
            "Wind", "wind" -> "💨"
            "Flower", "flower", "Flower2", "flower2" -> "🌸"
            "Rainbow" -> "🌈"
            "Mountain" -> "⛰️"
            "TreePine" -> "🌲"
            
            // Finance & Business
            "Wallet", "wallet" -> "💰"
            "Coins", "coins" -> "🪙"
            "DollarSign", "dollar-sign" -> "💵"
            "TrendingUp", "trending-up" -> "📈"
            "PiggyBank", "piggy-bank" -> "🐷"
            "Briefcase", "briefcase" -> "💼"
            "CreditCard", "credit-card" -> "💳"
            
            // Food & Drink
            "Coffee", "coffee" -> "☕"
            "Droplets", "droplets", "Water", "water" -> "💧"
            "Apple", "apple" -> "🍎"
            "Salad", "salad" -> "🥗"
            "Utensils", "utensils" -> "🍴"
            "GlassWater", "glass-water" -> "🥛"
            "Beer", "beer" -> "🍺"
            "Wine", "wine" -> "🍷"
            
            // Home & Everyday
            "Home", "home" -> "🏠"
            "Bed", "bed", "BedDouble", "bed-double" -> "🛏️"
            "Bath", "bath" -> "🛁"
            "Dog", "dog" -> "🐕"
            "Cat", "cat" -> "🐱"
            "Pill", "pill" -> "💊"
            "Smile", "smile" -> "😊"
            "Eye", "eye" -> "👁️"
            "Hand", "hand" -> "✋"
            "Key", "key", "KeyRound", "key-round" -> "🔑"
            "Lock", "lock", "LockOpen", "lock-open" -> "🔒"
            "Bell", "bell" -> "🔔"
            "Flag", "flag" -> "🚩"
            "Trash", "trash", "Trash2", "trash-2" -> "🗑️"
            "Gift", "gift" -> "🎁"
            "Cigarette", "cigarette", "Smoking", "smoking" -> "🚬"
            
            // Technology
            "Code", "code", "Terminal", "terminal" -> "💻"
            "Laptop", "laptop" -> "💻"
            "Smartphone", "smartphone" -> "📱"
            
            // Achievement & Awards
            "Trophy", "trophy" -> "🏆"
            "Medal", "medal", "Award", "award" -> "🏅"
            "Crown", "crown" -> "👑"
            
            // Tools & Action
            "Flame", "flame" -> "🔥"
            "Zap", "zap" -> "⚡"
            "Shield", "shield", "ShieldCheck", "shield-check" -> "🛡️"
            "Anchor", "anchor" -> "⚓"
            "Feather", "feather" -> "🪶"
            "Rocket", "rocket" -> "🚀"
            "Wrench", "wrench", "Hammer", "hammer", "Tool", "tool" -> "🔧"
            "Hexagon", "hexagon" -> "⬡"
            
            else -> "⭐"
        }
    }

    private fun createGlowBackground(
        width: Int, 
        height: Int, 
        color: Int, 
        opacity: Int, 
        gradientStyle: String, 
        borderStyle: String
    ): Bitmap {
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        
        // Background: dark gray (#050505) with user's opacity
        val alphaInt = (opacity * 2.55).toInt().coerceIn(0, 255)
        val bgPaint = Paint().apply {
            this.color = Color.parseColor("#050505")
            this.alpha = alphaInt
            this.isAntiAlias = true
        }
        val rect = RectF(0f, 0f, width.toFloat(), height.toFloat())
        canvas.drawRoundRect(rect, 24f, 24f, bgPaint)
        
        // Apply Gradient Style
        if (gradientStyle == "radial") {
            // Radial glow in the center-left (near the icon)
            val glowPaint = Paint().apply {
                this.isAntiAlias = true
                val colors = intArrayOf(
                    Color.argb((alphaInt * 0.25).toInt(), Color.red(color), Color.green(color), Color.blue(color)),
                    Color.argb((alphaInt * 0.08).toInt(), Color.red(color), Color.green(color), Color.blue(color)),
                    Color.TRANSPARENT
                )
                val stops = floatArrayOf(0f, 0.4f, 1f)
                this.shader = RadialGradient(
                    width * 0.15f, height * 0.5f,
                    height * 0.9f,
                    colors, stops,
                    Shader.TileMode.CLAMP
                )
            }
            canvas.drawRoundRect(rect, 24f, 24f, glowPaint)
        } else if (gradientStyle == "vertical") {
            // Full vertical gradient from bottom to top
            val glowPaint = Paint().apply {
                this.isAntiAlias = true
                val colors = intArrayOf(
                    Color.argb((alphaInt * 0.25).toInt(), Color.red(color), Color.green(color), Color.blue(color)),
                    Color.TRANSPARENT
                )
                this.shader = LinearGradient(
                    0f, height.toFloat(),
                    0f, 0f,
                    colors, null,
                    Shader.TileMode.CLAMP
                )
            }
            canvas.drawRoundRect(rect, 24f, 24f, glowPaint)
        }

        // Draw card border if enabled
        val drawBorder = (borderStyle == "card" || borderStyle == "both")
        if (drawBorder) {
            val borderPaint = Paint().apply {
                this.isAntiAlias = true
                this.style = Paint.Style.STROKE
                this.strokeWidth = 2.5f
                this.color = Color.argb((alphaInt * 0.35).toInt(), Color.red(color), Color.green(color), Color.blue(color))
            }
            canvas.drawRoundRect(rect, 24f, 24f, borderPaint)
        }

        return bitmap
    }

    private fun createCircleButton(
        context: Context,
        color: Int,
        completed: Boolean,
        percentage: Int,
        borderCircleEnabled: Boolean
    ): Bitmap {
        val density = context.resources.displayMetrics.density
        val sizePx = (44 * density).toInt()
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        
        val paint = Paint().apply {
            this.isAntiAlias = true
        }

        val center = sizePx / 2f
        val radius = sizePx / 2f - (2 * density) // padding

        if (completed) {
            // Completed: Solid filled circle of habit's theme color
            paint.style = Paint.Style.FILL
            paint.color = color
            canvas.drawCircle(center, center, radius, paint)

            // Draw border if enabled
            if (borderCircleEnabled) {
                paint.style = Paint.Style.STROKE
                paint.strokeWidth = 2 * density
                val hsl = FloatArray(3)
                androidx.core.graphics.ColorUtils.colorToHSL(color, hsl)
                hsl[2] = (hsl[2] + 0.20f).coerceIn(0f, 1f) // Lighten by 20%
                paint.color = androidx.core.graphics.ColorUtils.HSLToColor(hsl)
                canvas.drawCircle(center, center, radius, paint)
            }

            // Draw a black checkmark inside
            paint.style = Paint.Style.STROKE
            paint.strokeWidth = 3 * density
            paint.color = Color.BLACK
            paint.strokeCap = Paint.Cap.ROUND
            
            // Checkmark coordinates
            val startX = center - (6 * density)
            val startY = center
            val midX = center - (2 * density)
            val midY = center + (4 * density)
            val endX = center + (6 * density)
            val endY = center - (4 * density)

            canvas.drawLine(startX, startY, midX, midY, paint)
            canvas.drawLine(midX, midY, endX, endY, paint)
        } else {
            // Incomplete
            // Subtle gray background inside the circle
            paint.style = Paint.Style.FILL
            paint.color = Color.parseColor("#12FFFFFF")
            canvas.drawCircle(center, center, radius, paint)

            // Draw outer border stroke
            paint.style = Paint.Style.STROKE
            paint.strokeWidth = 2 * density
            paint.color = if (borderCircleEnabled) color else Color.parseColor("#4DFFFFFF")
            canvas.drawCircle(center, center, radius, paint)

            // Draw progress arc around border if partial progress
            if (percentage > 0 && percentage < 100) {
                paint.color = color
                val rectF = RectF(center - radius, center - radius, center + radius, center + radius)
                canvas.drawArc(rectF, -90f, (percentage * 3.6f), false, paint)

                // Draw percentage text inside
                val textPaint = Paint().apply {
                    this.color = color
                    this.textSize = 10 * density
                    this.textAlign = Paint.Align.CENTER
                    this.isAntiAlias = true
                    this.typeface = Typeface.DEFAULT_BOLD
                }
                val textY = center - ((textPaint.descent() + textPaint.ascent()) / 2)
                canvas.drawText("$percentage%", center, textY, textPaint)
            }
        }

        return bitmap
    }
}
