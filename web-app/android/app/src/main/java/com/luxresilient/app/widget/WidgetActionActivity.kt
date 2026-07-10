package com.luxresilient.app.widget

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.CheckBox
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import com.luxresilient.app.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Calendar

/**
 * Translucent Activity acting as a custom interactive floating popup dialog
 * for checking off subtasks or adjusting quantity habits directly from the home screen.
 */
class WidgetActionActivity : Activity() {

    companion object {
        private const val TAG = "WidgetActionActivity"
        const val EXTRA_HABIT_ID = "com.luxresilient.app.widget.EXTRA_HABIT_ID"
    }

    private lateinit var client: SupabaseWidgetClient
    private var soundEnabled: Boolean = true
    
    private lateinit var txtTitle: TextView
    private lateinit var txtAttr: TextView
    private lateinit var txtIcon: TextView
    
    private lateinit var containerQty: LinearLayout
    private lateinit var txtQtyCurrent: TextView
    private lateinit var txtQtyTarget: TextView
    private lateinit var btnQtyMinus: Button
    private lateinit var btnQtyPlus: Button

    private lateinit var containerChecklist: LinearLayout
    private lateinit var layoutSubtasksList: LinearLayout

    private var currentHabit: HabitData? = null
    private var currentBadHabit: BadHabitData? = null
    private var habitId: String = ""
    private var isBadHabit: Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.widget_action_dialog)

        // Read Config for sound effects
        val configPrefs = getSharedPreferences("lux_widget_config", Context.MODE_PRIVATE)
        soundEnabled = configPrefs.getBoolean("sound_effects", true)

        client = SupabaseWidgetClient(this)
        habitId = intent.getStringExtra(EXTRA_HABIT_ID) ?: ""
        isBadHabit = intent.getBooleanExtra("is_bad_habit", false)

        if (habitId.isEmpty()) {
            Log.e(TAG, "No habit ID provided to WidgetActionActivity")
            finish()
            return
        }

        // Initialize UI Views
        txtTitle = findViewById(R.id.dialog_title)
        txtAttr = findViewById(R.id.dialog_attribute)
        txtIcon = findViewById(R.id.dialog_icon)
        
        containerQty = findViewById(R.id.container_quantity)
        txtQtyCurrent = findViewById(R.id.txt_qty_current)
        txtQtyTarget = findViewById(R.id.txt_qty_target)
        btnQtyMinus = findViewById(R.id.btn_qty_minus)
        btnQtyPlus = findViewById(R.id.btn_qty_plus)

        containerChecklist = findViewById(R.id.container_checklist)
        layoutSubtasksList = findViewById(R.id.subtasks_list)

        findViewById<Button>(R.id.dialog_close_btn).setOnClickListener {
            // Refreshes the widget on exit
            refreshWidgets()
            finish()
        }

        // Load data in background thread
        loadHabitData()
    }

    private fun loadHabitData() {
        CoroutineScope(Dispatchers.IO).launch {
            if (isBadHabit) {
                val badHabits = client.fetchBadHabits()
                val badHabit = badHabits.find { it.id == habitId }
                withContext(Dispatchers.Main) {
                    if (badHabit != null) {
                        currentBadHabit = badHabit
                        bindBadHabitViews(badHabit)
                    } else {
                        Log.e(TAG, "Bad Habit $habitId not found")
                        finish()
                    }
                }
            } else {
                val habits = client.fetchHabits()
                val habit = habits.find { it.id == habitId }
                
                withContext(Dispatchers.Main) {
                    if (habit != null) {
                        currentHabit = habit
                        bindHabitViews(habit)
                    } else {
                        Log.e(TAG, "Habit $habitId not found in loaded habits list")
                        finish()
                    }
                }
            }
        }
    }

    private fun bindBadHabitViews(habit: BadHabitData) {
        txtTitle.text = habit.title ?: "Sin título"
        txtAttr.text = "Mal Hábito"
        
        val baseColor = "#ef4444" // Default red for bad habits
        val parsedColor = Color.parseColor(baseColor)
        txtAttr.setTextColor(parsedColor)

        val emoji = "🚫"
        txtIcon.text = emoji

        if (habit.dynamicBalance != null && habit.currentTarget != null) {
            setupBadHabitQuantityUI(habit)
        } else {
            // Simple bad habit
            toggleSimpleBadHabit(habit)
        }
    }
    
    private fun toggleSimpleBadHabit(habit: BadHabitData) {
        CoroutineScope(Dispatchers.IO).launch {
            val success = client.toggleBadHabitRelapse(habit)
            withContext(Dispatchers.Main) {
                if (success && soundEnabled) {
                    val todayStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())
                    val wasRelapsed = habit.relapsedToday == true || habit.history?.contains(todayStr) == true
                    if (!wasRelapsed) {
                        WidgetSoundPlayer.playCompleteSound()
                    } else {
                        WidgetSoundPlayer.playTickSound()
                    }
                }
                refreshWidgets()
                finish()
            }
        }
    }

    private fun bindHabitViews(habit: HabitData) {
        txtTitle.text = habit.title ?: "Sin título"
        txtAttr.text = habit.attribute ?: "General"
        
        // Dynamic Emoji Icon
        val baseColor = getHabitColor(habit)
        val parsedColor = try { Color.parseColor(baseColor) } catch (_: Exception) { Color.parseColor("#6366f1") }
        txtAttr.setTextColor(parsedColor)

        val emoji = if (habit.iconName != null) {
            getIconEmoji(habit.iconName)
        } else {
            TraitIcons.getEmoji(habit.attribute)
        }
        txtIcon.text = emoji

        when (habit.type) {
            "QUANTITY" -> {
                setupQuantityUI(habit)
            }
            "CHECKLIST" -> {
                setupChecklistUI(habit)
            }
            else -> {
                // Simple boolean habits can just toggle and close
                toggleSimpleHabit(habit)
            }
        }
    }

    private fun toggleSimpleHabit(habit: HabitData) {
        CoroutineScope(Dispatchers.IO).launch {
            val success = client.completeHabit(habit)
            withContext(Dispatchers.Main) {
                if (success && soundEnabled) {
                    if (!habit.completedToday) {
                        WidgetSoundPlayer.playCompleteSound()
                    } else {
                        WidgetSoundPlayer.playTickSound()
                    }
                }
                refreshWidgets()
                finish()
            }
        }
    }

    private fun setupQuantityUI(habit: HabitData) {
        containerQty.visibility = View.VISIBLE
        containerChecklist.visibility = View.GONE

        var currentVal = habit.currentValue ?: 0
        val targetVal = habit.targetValue ?: 1

        txtQtyCurrent.text = currentVal.toString()
        txtQtyTarget.text = "Meta: $targetVal"

        btnQtyMinus.setOnClickListener {
            if (currentVal > 0) {
                currentVal--
                txtQtyCurrent.text = currentVal.toString()
                if (soundEnabled) WidgetSoundPlayer.playTickSound()
                updateQuantityInDatabase(-1)
            }
        }

        btnQtyPlus.setOnClickListener {
            currentVal++
            txtQtyCurrent.text = currentVal.toString()
            if (soundEnabled) {
                if (currentVal == targetVal) {
                    WidgetSoundPlayer.playCompleteSound()
                } else {
                    WidgetSoundPlayer.playTickSound()
                }
            }
            updateQuantityInDatabase(1)
        }
    }

    private fun setupBadHabitQuantityUI(habit: BadHabitData) {
        containerQty.visibility = View.VISIBLE
        containerChecklist.visibility = View.GONE

        var currentVal = habit.dynamicBalance ?: 0
        val targetVal = habit.currentTarget ?: 1

        txtQtyCurrent.text = currentVal.toString()
        txtQtyTarget.text = "Meta: $targetVal"

        btnQtyMinus.setOnClickListener {
            currentVal--
            txtQtyCurrent.text = currentVal.toString()
            if (soundEnabled) WidgetSoundPlayer.playTickSound()
            updateBadHabitQuantityInDatabase(-1)
        }

        btnQtyPlus.setOnClickListener {
            currentVal++
            txtQtyCurrent.text = currentVal.toString()
            if (soundEnabled) WidgetSoundPlayer.playTickSound()
            updateBadHabitQuantityInDatabase(1)
        }
    }

    private fun updateBadHabitQuantityInDatabase(amount: Int) {
        val habit = currentBadHabit ?: return
        CoroutineScope(Dispatchers.IO).launch {
            val success = client.incrementBadHabitQuantity(habit, amount)
            if (success) {
                val updatedHabits = client.fetchBadHabits()
                currentBadHabit = updatedHabits.find { it.id == habitId }
            }
        }
    }

    private fun updateQuantityInDatabase(amount: Int) {
        val habit = currentHabit ?: return
        CoroutineScope(Dispatchers.IO).launch {
            val success = client.incrementQuantity(habit, amount)
            if (success) {
                // Refresh cached object
                val updatedHabits = client.fetchHabits()
                currentHabit = updatedHabits.find { it.id == habitId }
            }
        }
    }

    private fun setupChecklistUI(habit: HabitData) {
        containerQty.visibility = View.GONE
        containerChecklist.visibility = View.VISIBLE
        layoutSubtasksList.removeAllViews()

        val checklist = habit.checklist ?: return
        val todayDay = Calendar.getInstance().get(Calendar.DAY_OF_WEEK) - 1
        val visibleItems = checklist.filter { item ->
            item.days == null || item.days.isEmpty() || item.days.contains(todayDay)
        }

        if (visibleItems.isEmpty()) {
            val txtEmpty = TextView(this).apply {
                text = "No hay subtareas programadas para hoy"
                setTextColor(Color.parseColor("#4DFFFFFF"))
                textSize = 13f
                setPadding(0, 10, 0, 10)
            }
            layoutSubtasksList.addView(txtEmpty)
            return
        }

        val inflater = LayoutInflater.from(this)
        for (item in visibleItems) {
            val row = inflater.inflate(R.layout.widget_habit_subtask, layoutSubtasksList, false)
            val txtSub = row.findViewById<TextView>(R.id.subtask_text)
            val containerCheck = row.findViewById<FrameLayout>(R.id.subtask_check_circle)
            val iconCheck = row.findViewById<TextView>(R.id.subtask_check_icon)
            val txtTime = row.findViewById<TextView>(R.id.subtask_time)

            txtSub.text = item.text ?: "Subtarea"
            
            // Initial styling
            var isCompleted = item.completed
            fun updateRowUI() {
                if (isCompleted) {
                    containerCheck.setBackgroundResource(R.drawable.widget_subtask_checked)
                    iconCheck.visibility = View.VISIBLE
                    txtSub.setTextColor(Color.parseColor("#4DFFFFFF"))
                } else {
                    containerCheck.setBackgroundResource(R.drawable.widget_subtask_unchecked)
                    iconCheck.visibility = View.GONE
                    txtSub.setTextColor(Color.parseColor("#CCFFFFFF"))
                }
            }
            updateRowUI()

            if (!item.reminderTime.isNullOrEmpty()) {
                txtTime.visibility = View.VISIBLE
                txtTime.text = item.reminderTime
            } else {
                txtTime.visibility = View.GONE
            }

            // Click listener
            row.setOnClickListener {
                isCompleted = !isCompleted
                updateRowUI()
                
                if (soundEnabled) {
                    WidgetSoundPlayer.playTickSound()
                }

                toggleSubtaskInDatabase(item.id)
            }

            layoutSubtasksList.addView(row)
        }
    }

    private fun toggleSubtaskInDatabase(subtaskId: String) {
        val habit = currentHabit ?: return
        CoroutineScope(Dispatchers.IO).launch {
            val success = client.toggleSubtask(habit, subtaskId)
            if (success) {
                // Refresh cached object and check if habit is fully completed now
                val updatedHabits = client.fetchHabits()
                val updatedHabit = updatedHabits.find { it.id == habitId }
                
                withContext(Dispatchers.Main) {
                    if (updatedHabit != null) {
                        // Play complete chime if the entire habit became completed
                        if (!habit.completedToday && updatedHabit.completedToday && soundEnabled) {
                            WidgetSoundPlayer.playCompleteSound()
                        }
                        currentHabit = updatedHabit
                    }
                }
            }
        }
    }

    private fun refreshWidgets() {
        val intent = Intent(this, HabitWidgetProvider::class.java).apply {
            action = HabitWidgetProvider.ACTION_REFRESH
        }
        sendBroadcast(intent)
    }

    private fun getHabitColor(habit: HabitData): String {
        if (!habit.customColor.isNullOrEmpty()) return habit.customColor
        val key = habit.attribute ?: ""
        return TraitIcons.getColor(key)
    }

    private fun getIconEmoji(iconName: String): String {
        // Shared matching logic
        return when (iconName) {
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
            "Users", "users" -> "👥"
            "MessageCircle", "message-circle", "MessageSquare", "message-square" -> "💬"
            "Phone", "phone" -> "📱"
            "Mail", "mail", "MailOpen", "mail-open" -> "📧"
            "HeartHandshake", "heart-handshake" -> "🤝"
            "Share2", "share-2" -> "📤"
            "ThumbsUp", "thumbs-up" -> "👍"
            "ThumbsDown", "thumbs-down" -> "👎"
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
            "Wallet", "wallet" -> "💰"
            "Coins", "coins" -> "🪙"
            "DollarSign", "dollar-sign" -> "💵"
            "TrendingUp", "trending-up" -> "📈"
            "PiggyBank", "piggy-bank" -> "🐷"
            "Briefcase", "briefcase" -> "💼"
            "CreditCard", "credit-card" -> "💳"
            "Coffee", "coffee" -> "☕"
            "Droplets", "droplets", "Water", "water" -> "💧"
            "Apple", "apple" -> "🍎"
            "Salad", "salad" -> "🥗"
            "Utensils", "utensils" -> "🍴"
            "GlassWater", "glass-water" -> "🥛"
            "Beer", "beer" -> "🍺"
            "Wine", "wine" -> "🍷"
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
            "Code", "code", "Terminal", "terminal" -> "💻"
            "Laptop", "laptop" -> "💻"
            "Smartphone", "smartphone" -> "📱"
            "Trophy", "trophy" -> "🏆"
            "Medal", "medal", "Award", "award" -> "🏅"
            "Crown", "crown" -> "👑"
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
}
