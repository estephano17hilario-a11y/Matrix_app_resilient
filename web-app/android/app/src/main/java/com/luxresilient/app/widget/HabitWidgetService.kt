package com.luxresilient.app.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
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

    private var habits: List<HabitData> = emptyList()
    private var attributes: Map<String, AttributeData> = emptyMap()
    private val widgetId = intent.getIntExtra(
        AppWidgetManager.EXTRA_APPWIDGET_ID,
        AppWidgetManager.INVALID_APPWIDGET_ID
    )

    override fun onCreate() {
        Log.d(TAG, "Factory created for widget $widgetId")
    }

    override fun onDataSetChanged() {
        Log.d(TAG, "Data set changed - refreshing habits")
        try {
            val client = SupabaseWidgetClient(context)
            habits = client.fetchHabits()
            attributes = client.fetchAttributes()
            Log.d(TAG, "Loaded ${habits.size} habits, ${attributes.size} attributes")
        } catch (e: Exception) {
            Log.e(TAG, "Error loading data: ${e.message}", e)
        }
    }

    override fun onDestroy() {
        habits = emptyList()
        attributes = emptyMap()
    }

    override fun getCount(): Int = habits.size

    override fun getViewAt(position: Int): RemoteViews {
        try {
            if (position >= habits.size) {
                return RemoteViews(context.packageName, R.layout.widget_habit_item)
            }

            val habit = habits[position]
            val views = RemoteViews(context.packageName, R.layout.widget_habit_item)

            // Get color from custom color, attribute, or trait default
            val baseColor = getHabitColor(habit)
            val parsedColor = try { Color.parseColor(baseColor) } catch (_: Exception) { Color.parseColor("#6366f1") }

            // Set overlay background color dynamically
            views.setInt(R.id.habit_color_overlay, "setBackgroundColor", parsedColor)

            // --- TITLE ---
            views.setTextViewText(R.id.habit_title, habit.title ?: "Sin título")
            
            // Apply completed state (dimmed text)
            if (habit.completedToday) {
                views.setTextColor(R.id.habit_title, Color.parseColor("#99FFFFFF"))
            } else {
                views.setTextColor(R.id.habit_title, Color.WHITE)
            }

            // --- TRAIT ICON ---
            val traitEmoji = if (habit.iconName != null) {
                getIconEmoji(habit.iconName)
            } else {
                TraitIcons.getEmoji(habit.attribute)
            }
            views.setTextViewText(R.id.habit_icon, traitEmoji)

            // --- STREAK BADGE ---
            if (habit.streak > 0) {
                views.setViewVisibility(R.id.habit_streak_container, View.VISIBLE)
                views.setTextViewText(R.id.habit_streak_count, habit.streak.toString())
                if (habit.completedToday) {
                    views.setTextColor(R.id.habit_streak_count, Color.parseColor("#fb923c"))
                } else {
                    views.setTextColor(R.id.habit_streak_count, Color.parseColor("#9ca3af"))
                }
            } else {
                views.setViewVisibility(R.id.habit_streak_container, View.GONE)
            }

            // --- PROGRESS TEXT ---
            val progressText = getProgressText(habit)
            views.setTextViewText(R.id.habit_progress, progressText)
            views.setTextColor(R.id.habit_progress, parsedColor)

            // --- COMPLETE BUTTON ---
            if (habit.completedToday) {
                views.setInt(R.id.habit_complete_btn, "setBackgroundResource", R.drawable.widget_progress_complete)
                views.setViewVisibility(R.id.habit_check_icon, View.VISIBLE)
                views.setTextViewText(R.id.habit_check_icon, "✓")
            } else {
                views.setInt(R.id.habit_complete_btn, "setBackgroundResource", R.drawable.widget_progress_circle)
                
                // For partial progress (QUANTITY/CHECKLIST), show percentage text
                val percentage = getPercentage(habit)
                if (percentage > 0 && percentage < 100) {
                    views.setViewVisibility(R.id.habit_check_icon, View.VISIBLE)
                    views.setTextViewText(R.id.habit_check_icon, "${percentage}%")
                    views.setTextColor(R.id.habit_check_icon, parsedColor)
                } else {
                    views.setViewVisibility(R.id.habit_check_icon, View.GONE)
                }
            }

            // --- SUBTASKS (for CHECKLIST type) ---
            if (habit.type == "CHECKLIST" && habit.checklist != null && habit.checklist.isNotEmpty()) {
                views.setViewVisibility(R.id.habit_subtasks_container, View.VISIBLE)
                views.removeAllViews(R.id.habit_subtasks_container)

                val todayDay = Calendar.getInstance().get(Calendar.DAY_OF_WEEK) - 1
                val visibleItems = habit.checklist.filter { item ->
                    item.days == null || item.days.isEmpty() || item.days.contains(todayDay)
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

            // --- FILL INTENT (for complete button via list click) ---
            val fillIntent = Intent().apply {
                when (habit.type) {
                    "CHECKLIST" -> {
                        action = HabitWidgetProvider.ACTION_COMPLETE_HABIT
                    }
                    "QUANTITY" -> {
                        action = HabitWidgetProvider.ACTION_INCREMENT_QUANTITY
                    }
                    else -> {
                        action = HabitWidgetProvider.ACTION_COMPLETE_HABIT
                    }
                }
                putExtra(HabitWidgetProvider.EXTRA_HABIT_ID, habit.id)
            }
            views.setOnClickFillInIntent(R.id.habit_complete_btn, fillIntent)

            // Open app when clicking on the habit text area
            val openAppFill = Intent().apply {
                action = HabitWidgetProvider.ACTION_COMPLETE_HABIT
                putExtra(HabitWidgetProvider.EXTRA_HABIT_ID, habit.id)
            }
            views.setOnClickFillInIntent(R.id.habit_text_container, openAppFill)

            return views
        } catch (e: Exception) {
            Log.e(TAG, "Error rendering view at position $position: ${e.message}", e)
            
            // Return a safe fallback view instead of crashing
            val fallback = RemoteViews(context.packageName, R.layout.widget_habit_item)
            fallback.setTextViewText(R.id.habit_title, "Error al cargar item")
            fallback.setTextViewText(R.id.habit_progress, "Reintentar")
            fallback.setTextColor(R.id.habit_progress, Color.RED)
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
            "Dumbbell" -> "💪"
            "Heart" -> "❤️"
            "HeartPulse" -> "💓"
            "Activity" -> "📈"
            "Bike" -> "🚴"
            "Footprints" -> "👣"
            
            // Mind & Learning
            "Brain" -> "🧠"
            "BookOpen" -> "📖"
            "Book" -> "📚"
            "GraduationCap" -> "🎓"
            "Lightbulb" -> "💡"
            "Puzzle" -> "🧩"
            
            // Productivity
            "Target" -> "🎯"
            "CheckCircle" -> "✅"
            "Clock" -> "⏰"
            "Timer" -> "⏱️"
            "Calendar" -> "📅"
            "ListTodo" -> "📝"
            
            // Social
            "Users" -> "👥"
            "MessageCircle" -> "💬"
            "Phone" -> "📱"
            "Mail" -> "📧"
            
            // Creative
            "Palette" -> "🎨"
            "Music" -> "🎵"
            "Camera" -> "📸"
            "Pen" -> "✏️"
            "Pencil" -> "✏️"
            
            // Spiritual
            "Ghost" -> "👻"
            "Sparkles" -> "✨"
            "Sun" -> "☀️"
            "Moon" -> "🌙"
            "Leaf" -> "🍃"
            
            // Finance
            "Wallet" -> "💰"
            "Coins" -> "🪙"
            "DollarSign" -> "💵"
            "TrendingUp" -> "📈"
            
            // Misc
            "Coffee" -> "☕"
            "Droplets" -> "💧"
            "Flame" -> "🔥"
            "Star" -> "⭐"
            "Zap" -> "⚡"
            "Shield" -> "🛡️"
            "Crown" -> "👑"
            "Anchor" -> "⚓"
            "Feather" -> "🪶"
            "Rocket" -> "🚀"
            "Apple" -> "🍎"
            "Salad" -> "🥗"
            "Pill" -> "💊"
            "Bed" -> "🛏️"
            "Bath" -> "🛁"
            "Smile" -> "😊"
            "Eye" -> "👁️"
            "Hand" -> "✋"
            "Home" -> "🏠"
            "Dog" -> "🐕"
            "Cat" -> "🐱"
            "Code" -> "💻"
            "Terminal" -> "💻"
            "Gamepad" -> "🎮"
            "Trophy" -> "🏆"
            "Medal" -> "🏅"
            "Headphones" -> "🎧"
            "Mic" -> "🎤"
            "Brush" -> "🖌️"
            "Scissors" -> "✂️"
            "Wrench" -> "🔧"
            "Key" -> "🔑"
            "Lock" -> "🔒"
            "Bell" -> "🔔"
            "Flag" -> "🚩"
            "Map" -> "🗺️"
            "Compass" -> "🧭"
            "Mountain" -> "⛰️"
            "TreePine" -> "🌲"
            "Flower" -> "🌸"
            "Rainbow" -> "🌈"
            "CloudRain" -> "🌧️"
            "Snowflake" -> "❄️"
            "Wind" -> "💨"
            "Hexagon" -> "⬡"
            
            else -> "⭐"
        }
    }
}
