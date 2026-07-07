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

            // Read customization preferences
            val configPrefs = context.getSharedPreferences("lux_widget_config", Context.MODE_PRIVATE)
            val opacity = configPrefs.getInt("card_opacity", 90)
            val cardSize = configPrefs.getString("card_size", "medium") ?: "medium"
            val checklistMode = configPrefs.getString("checklist_mode", "direct")
            val cardColumns = configPrefs.getInt("card_columns", 1)
            val cardSpacing = configPrefs.getString("card_spacing", "medio") ?: "medio"
            val gradientStyle = configPrefs.getString("gradient_style", "radial") ?: "radial"
            val borderStyle = configPrefs.getString("border_style", "both") ?: "both"

            // Choose layout file dynamically based on sizing and column configuration
            val layoutId = if (cardColumns == 2) {
                R.layout.widget_habit_item_grid
            } else if (cardSize == "thin" || cardSize == "super_thin") {
                R.layout.widget_habit_item_thin
            } else {
                R.layout.widget_habit_item
            }
            val views = RemoteViews(context.packageName, layoutId)

            // Get color from custom color, attribute, or trait default
            val baseColor = getHabitColor(habit)
            val parsedColor = try { Color.parseColor(baseColor) } catch (_: Exception) { Color.parseColor("#6366f1") }

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
            views.setTextViewText(R.id.habit_title, habit.title ?: "Sin título")
            
            // Adjust title text size for super_thin or columns
            if (cardSize == "super_thin" || cardColumns == 2) {
                views.setFloat(R.id.habit_title, "setTextSize", 11.5f)
            } else if (cardSize == "thin") {
                views.setFloat(R.id.habit_title, "setTextSize", 13f)
            } else {
                views.setFloat(R.id.habit_title, "setTextSize", 15f)
            }

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

            // Adjust icon layout for super thin
            if (cardSize == "super_thin") {
                views.setViewVisibility(R.id.habit_icon_container, View.GONE)
            } else {
                views.setViewVisibility(R.id.habit_icon_container, View.VISIBLE)
            }

            // --- STREAK BADGE ---
            // Hide streak badge for super thin or 2-columns to save space cleanly
            if (habit.streak > 0 && cardSize != "super_thin" && cardColumns != 2) {
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

            // --- COMPLETE BUTTON (PROGRESS CIRCLE image) ---
            val percentage = getPercentage(habit)
            val borderCircleEnabled = (borderStyle == "circle" || borderStyle == "both")
            val circleBitmap = createCircleButton(context, parsedColor, habit.completedToday, percentage, borderCircleEnabled)
            views.setImageViewBitmap(R.id.habit_complete_image, circleBitmap)
            views.setViewVisibility(R.id.habit_check_icon, View.GONE) // Hidden because checkmark is inside bitmap

            // --- SUBTASKS (for CHECKLIST type) ---
            val showSubtasks = habit.type == "CHECKLIST" && checklistMode == "direct" && 
                               habit.checklist != null && habit.checklist.isNotEmpty() && 
                               cardSize != "super_thin" && cardColumns != 2

            if (showSubtasks) {
                views.setViewVisibility(R.id.habit_subtasks_container, View.VISIBLE)
                views.removeAllViews(R.id.habit_subtasks_container)

                val todayDay = Calendar.getInstance().get(Calendar.DAY_OF_WEEK) - 1
                val visibleItems = habit.checklist!!.filter { item ->
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

            // --- CLICK HANDLING & INTENTS ---
            // If checklist is in dialog mode OR habit is quantity type, clicking completes opens dialog!
            val useDialog = (habit.type == "CHECKLIST" && checklistMode == "dialog") || (habit.type == "QUANTITY")

            val fillIntent = Intent().apply {
                if (useDialog) {
                    action = HabitWidgetProvider.ACTION_OPEN_DIALOG
                } else {
                    action = HabitWidgetProvider.ACTION_COMPLETE_HABIT
                }
                putExtra(HabitWidgetProvider.EXTRA_HABIT_ID, habit.id)
            }
            views.setOnClickFillInIntent(R.id.habit_complete_btn, fillIntent)

            // Open app shortcut or open dialog when clicking card body
            val cardFillIntent = Intent().apply {
                if (useDialog) {
                    action = HabitWidgetProvider.ACTION_OPEN_DIALOG
                } else {
                    action = HabitWidgetProvider.ACTION_OPEN_APP_SHORTCUT
                }
                putExtra(HabitWidgetProvider.EXTRA_HABIT_ID, habit.id)
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
