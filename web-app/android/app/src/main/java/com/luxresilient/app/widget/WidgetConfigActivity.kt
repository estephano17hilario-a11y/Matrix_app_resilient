package com.luxresilient.app.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.ViewGroup
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.SeekBar
import android.widget.Switch
import android.widget.TextView
import com.luxresilient.app.R
import kotlinx.coroutines.*

/**
 * Native Activity for customizing the widgets' designs and mechanics.
 */
class WidgetConfigActivity : Activity() {

    private lateinit var seekOpacity: SeekBar
    private lateinit var txtOpacityVal: TextView
    
    private lateinit var seekWidgetBgOpacity: SeekBar
    private lateinit var txtWidgetBgOpacityVal: TextView
    
    private lateinit var switchSound: Switch
    private lateinit var switchIcons: Switch
    private lateinit var switchAllowChrono: Switch
    private lateinit var switchAllowBadHabits: Switch
    private lateinit var switchTimeFormat12h: Switch
    
    private lateinit var radioGroupSize: RadioGroup
    private lateinit var radioGroupColumns: RadioGroup
    private lateinit var radioGroupChronoColumns: RadioGroup
    private lateinit var radioGroupSpacing: RadioGroup
    private lateinit var radioGroupGradient: RadioGroup
    private lateinit var radioGroupBorder: RadioGroup
    private lateinit var radioGroupChecklist: RadioGroup
    private lateinit var radioGroupTaskTimeframe: RadioGroup
    private lateinit var radioGroupBgMode: RadioGroup
    private lateinit var routineSection: LinearLayout
    private lateinit var switchRoutineShowDone: Switch
    
    private lateinit var projectSelectContainer: LinearLayout
    private lateinit var radioGroupProjectSelect: RadioGroup
    private var fetchedProjects: List<ProjectData> = emptyList()
    
    private lateinit var habitsSectionContainer1: LinearLayout
    private lateinit var habitsSectionContainer2: LinearLayout
    private lateinit var tasksSectionContainer: LinearLayout
    private lateinit var cardOpacityContainer: LinearLayout
    
    private var widgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private var selectedStyle: WidgetTheme.Style = WidgetTheme.Style.OBSIDIAN
    private val styleSwatches = mutableMapOf<WidgetTheme.Style, View>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)

        // Routine / Calendar / Journal-calendar widgets are Deluxe: a free account cannot add them
        // (finishing with RESULT_CANCELED makes the launcher discard the widget it was about to place).
        val requestedId = intent?.extras?.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID) ?: AppWidgetManager.INVALID_APPWIDGET_ID
        val requestedClass = try { AppWidgetManager.getInstance(this).getAppWidgetInfo(requestedId)?.provider?.className ?: "" } catch (e: Exception) { "" }
        if (ProGate.blockIfLocked(this, requestedClass)) {
            finish()
            return
        }

        setContentView(R.layout.widget_config_activity)

        // Parse Widget ID if called as configure activity
        intent?.extras?.let {
            widgetId = it.getInt(
                AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID
            )
        }

        // Initialize UI Elements
        seekOpacity = findViewById(R.id.config_opacity_seekbar)
        txtOpacityVal = findViewById(R.id.config_opacity_value)
        
        seekWidgetBgOpacity = findViewById(R.id.config_widget_bg_opacity_seekbar)
        txtWidgetBgOpacityVal = findViewById(R.id.config_widget_bg_opacity_value)
        
        switchSound = findViewById(R.id.config_sound_switch)
        switchIcons = findViewById(R.id.config_icons_switch)
        switchAllowChrono = findViewById(R.id.config_allow_chrono_switch)
        switchAllowBadHabits = findViewById(R.id.config_allow_bad_habits_switch)
        switchTimeFormat12h = findViewById(R.id.config_time_format_switch)
        
        radioGroupSize = findViewById(R.id.config_size_group)
        radioGroupColumns = findViewById(R.id.config_columns_group)
        radioGroupChronoColumns = findViewById(R.id.config_chrono_columns_group)
        radioGroupSpacing = findViewById(R.id.config_spacing_group)
        radioGroupGradient = findViewById(R.id.config_gradient_group)
        radioGroupBorder = findViewById(R.id.config_border_group)
        radioGroupChecklist = findViewById(R.id.config_checklist_group)
        radioGroupTaskTimeframe = findViewById(R.id.config_task_timeframe_group)
        radioGroupBgMode = findViewById(R.id.config_bg_mode_group)
        routineSection = findViewById(R.id.config_routine_section)
        switchRoutineShowDone = findViewById(R.id.config_routine_show_done_switch)
        
        projectSelectContainer = findViewById(R.id.config_project_select_container)
        radioGroupProjectSelect = findViewById(R.id.config_project_select_group)
        
        habitsSectionContainer1 = findViewById(R.id.config_habits_section_container_1)
        habitsSectionContainer2 = findViewById(R.id.config_habits_section_container_2)
        tasksSectionContainer = findViewById(R.id.config_tasks_section_container)
        cardOpacityContainer = findViewById(R.id.config_card_opacity_container)

        val btnCancel = findViewById<Button>(R.id.config_cancel_btn)
        val btnSave = findViewById<Button>(R.id.config_save_btn)

        // Setup custom look for radio buttons inside horizontal containers
        setupHorizontalRadioButtonsUI(radioGroupSize)
        setupHorizontalRadioButtonsUI(radioGroupColumns)
        setupHorizontalRadioButtonsUI(radioGroupChronoColumns)
        setupHorizontalRadioButtonsUI(radioGroupSpacing)
        setupHorizontalRadioButtonsUI(radioGroupBgMode)
        radioGroupBgMode.setOnCheckedChangeListener { grp, checkedId ->
            for (i in 0 until grp.childCount) {
                val child = grp.getChildAt(i)
                if (child is RadioButton) {
                    val on = child.id == checkedId
                    child.setBackgroundResource(if (on) R.drawable.widget_refresh_bg else android.R.color.transparent)
                    child.setTextColor(if (on) Color.WHITE else Color.parseColor("#E0E0E0"))
                }
            }
            // A solid background is always opaque, so the opacity slider has nothing to do.
            val solid = checkedId == R.id.config_bg_solid
            seekWidgetBgOpacity.isEnabled = !solid
            seekWidgetBgOpacity.alpha = if (solid) 0.35f else 1f
        }

        // Load saved preferences
        loadPreferences()
        buildStylePicker()

        // Toggle sections visibility based on widget class (different UI for each widget)
        try {
            val providerInfo = AppWidgetManager.getInstance(this).getAppWidgetInfo(widgetId)
            val className = providerInfo?.provider?.className ?: ""
            val isRivalsWidget = className.contains("RivalsWidgetProvider")
            val isScoreWidget = className.contains("ScoreWidgetProvider")
            val isProjectWidget = className.contains("ProjectWidgetProvider")
            val isFocusWidget = className.contains("FocusWidgetProvider")
            val isTaskWidget = className.contains("TaskWidgetProvider")
            val isHabitWidget = className.contains("HabitWidgetProvider")
            val isJournalWidget = className.contains("JournalWidgetProvider")
            val isCalendarWidget = className.contains("CalendarWidgetProvider")
val isRoutineWidget = className.contains("RoutineWidgetProvider")
            val isDuelWidget = className.contains("DuelWidgetProvider")
            val isStreakWidget = className.contains("FriendStreakWidgetProvider")
            
            val txtConfigTitle = findViewById<TextView>(R.id.config_title)
            if (isProjectWidget) {
                txtConfigTitle.text = "Ajustes de Proyecto"
            } else if (isFocusWidget) {
                txtConfigTitle.text = "Ajustes de Enfoque"
            } else if (isTaskWidget) {
                txtConfigTitle.text = "Ajustes de Tareas"
            } else if (isHabitWidget) {
                txtConfigTitle.text = "Ajustes de Hábitos"
            } else if (isJournalWidget) {
                txtConfigTitle.text = "Ajustes de Diario"
            } else if (isRoutineWidget) {
                txtConfigTitle.text = "Ajustes de Rutina"
            } else if (isDuelWidget) {
                txtConfigTitle.text = "Ajustes de Duelo"
            } else if (isStreakWidget) {
                txtConfigTitle.text = "Ajustes de Racha"
            } else if (isCalendarWidget) {
                txtConfigTitle.text = "Ajustes de Calendario"
            } else if (isScoreWidget) {
                txtConfigTitle.text = "Ajustes de Score"
            } else if (isRivalsWidget) {
                txtConfigTitle.text = "Ajustes de Duelos"
            } else {
                txtConfigTitle.text = "Ajustes de Widget"
            }

            if (isProjectWidget) {
                projectSelectContainer.visibility = View.VISIBLE
                loadProjectsForSelection()
                habitsSectionContainer1.visibility = View.GONE
                habitsSectionContainer2.visibility = View.GONE
                tasksSectionContainer.visibility = View.GONE
                cardOpacityContainer.visibility = View.GONE
            } else if (isFocusWidget) {
                projectSelectContainer.visibility = View.GONE
                habitsSectionContainer1.visibility = View.GONE
                habitsSectionContainer2.visibility = View.GONE
                tasksSectionContainer.visibility = View.GONE
                cardOpacityContainer.visibility = View.GONE
            } else if (isTaskWidget) {
                projectSelectContainer.visibility = View.GONE
                habitsSectionContainer1.visibility = View.GONE
                habitsSectionContainer2.visibility = View.GONE
                tasksSectionContainer.visibility = View.VISIBLE
                cardOpacityContainer.visibility = View.VISIBLE
            } else if (isRoutineWidget) {
                projectSelectContainer.visibility = View.GONE
                habitsSectionContainer1.visibility = View.GONE
                habitsSectionContainer2.visibility = View.GONE
                tasksSectionContainer.visibility = View.GONE
                cardOpacityContainer.visibility = View.GONE
                routineSection.visibility = View.VISIBLE
                val appDefault = RoutineConfig.fromJson(getSharedPreferences(RoutineWidgetData.PREFS_ROUTINE, Context.MODE_PRIVATE).getString(RoutineWidgetData.KEY_CONFIG, null)).showCompleted
                switchRoutineShowDone.isChecked = getSharedPreferences("lux_widget_config", Context.MODE_PRIVATE).getBoolean("routine_show_done_widget_$widgetId", appDefault)
            } else if (isJournalWidget || isScoreWidget || isRivalsWidget || isDuelWidget || isStreakWidget || isCalendarWidget) {
                projectSelectContainer.visibility = View.GONE
                habitsSectionContainer1.visibility = View.GONE
                habitsSectionContainer2.visibility = View.GONE
                tasksSectionContainer.visibility = View.GONE
                cardOpacityContainer.visibility = View.VISIBLE
            } else {
                // Default is Habit widget
                projectSelectContainer.visibility = View.GONE
                habitsSectionContainer1.visibility = View.VISIBLE
                habitsSectionContainer2.visibility = View.VISIBLE
                tasksSectionContainer.visibility = View.GONE
                cardOpacityContainer.visibility = View.VISIBLE
            }
        } catch (e: Exception) {
            projectSelectContainer.visibility = View.GONE
            habitsSectionContainer1.visibility = View.VISIBLE
            habitsSectionContainer2.visibility = View.VISIBLE
            tasksSectionContainer.visibility = View.GONE
            cardOpacityContainer.visibility = View.VISIBLE
        }

        // Seekbar opacity value change listener
        seekOpacity.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                txtOpacityVal.text = "$progress%"
            }
            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        })

        // Widget background opacity seekbar listener
        seekWidgetBgOpacity.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                txtWidgetBgOpacityVal.text = "$progress%"
            }
            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        })

        // Button Actions
        btnCancel.setOnClickListener {
            setResult(RESULT_CANCELED)
            finish()
        }

        btnSave.setOnClickListener {
            savePreferences()
            
            // Broadcast refresh for habits
            val refreshIntent = Intent(this, HabitWidgetProvider::class.java).apply {
                action = HabitWidgetProvider.ACTION_REFRESH
            }
            sendBroadcast(refreshIntent)

            // Broadcast refresh for tasks
            val refreshTasksIntent = Intent(this, TaskWidgetProvider::class.java).apply {
                action = TaskWidgetProvider.ACTION_REFRESH_TASKS
            }
            sendBroadcast(refreshTasksIntent)

            // Broadcast refresh for projects
            val refreshProjectIntent = Intent(this, ProjectWidgetProvider::class.java).apply {
                action = ProjectWidgetProvider.ACTION_REFRESH_PROJECT
            }
            sendBroadcast(refreshProjectIntent)

            // Broadcast refresh for journal
            val refreshJournalIntent = Intent(this, JournalWidgetProvider::class.java).apply {
                action = JournalWidgetProvider.ACTION_REFRESH_JOURNAL
            }
            sendBroadcast(refreshJournalIntent)

            // Broadcast refresh for score
            val refreshScoreIntent = Intent(this, ScoreWidgetProvider::class.java).apply {
                action = ScoreWidgetProvider.ACTION_REFRESH_SCORE
            }
            sendBroadcast(refreshScoreIntent)

            // Broadcast refresh for rivals
            val refreshRivalsIntent = Intent(this, RivalsWidgetProvider::class.java).apply {
                action = RivalsWidgetProvider.ACTION_REFRESH_RIVALS
            }
            sendBroadcast(refreshRivalsIntent)

            // Broadcast refresh for focus
            val refreshFocusIntent = Intent(this, FocusWidgetProvider::class.java).apply {
                action = FocusWidgetProvider.ACTION_REFRESH_FOCUS
            }
            sendBroadcast(refreshFocusIntent)

            // Every other provider (routine, duels, streak...) just gets a regular update request.
            sendBroadcast(Intent(this, RoutineWidgetProvider::class.java).setAction(RoutineWidgetProvider.ACTION_REFRESH))
            for (cls in listOf(DuelWidgetProvider::class.java, FriendStreakWidgetProvider::class.java)) {
                val ids = AppWidgetManager.getInstance(this).getAppWidgetIds(android.content.ComponentName(this, cls))
                if (ids.isNotEmpty()) {
                    sendBroadcast(Intent(this, cls).apply {
                        action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                        putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
                    })
                }
            }

            // Broadcast refresh for the calendar
            sendBroadcast(Intent(this, CalendarWidgetProvider::class.java).apply { action = CalendarWidgetProvider.ACTION_REFRESH })

            // Success result if called as a widget configuration activity
            val resultValue = Intent().apply {
                if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                }
            }
            setResult(RESULT_OK, resultValue)
            finish()
        }
    }

    /** Swatches for every [WidgetTheme.Style]; the chosen one gets a white ring. */
    private fun buildStylePicker() {
        val prefs = getSharedPreferences("lux_widget_config", Context.MODE_PRIVATE)
        val className = try { AppWidgetManager.getInstance(this).getAppWidgetInfo(widgetId)?.provider?.className ?: "" } catch (e: Exception) { "" }
        selectedStyle = WidgetTheme.styleFor(prefs, widgetId, className)

        val density = resources.displayMetrics.density
        val row = findViewById<LinearLayout>(R.id.config_theme_row)
        row.removeAllViews()
        for (style in WidgetTheme.Style.values()) {
            val palette = WidgetTheme.palette(style)
            val chip = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER_HORIZONTAL
                layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { marginEnd = (10 * density).toInt() }
            }
            val swatch = View(this).apply {
                layoutParams = LinearLayout.LayoutParams((68 * density).toInt(), (46 * density).toInt())
            }
            val label = TextView(this).apply {
                text = style.label
                textSize = 10.5f
                gravity = Gravity.CENTER
                setPadding(0, (4 * density).toInt(), 0, 0)
            }
            chip.addView(swatch)
            chip.addView(label)
            styleSwatches[style] = swatch
            swatch.tag = palette
            label.tag = style
            chip.setOnClickListener {
                selectedStyle = style
                refreshStylePicker(row)
            }
            row.addView(chip)
        }
        refreshStylePicker(row)
    }

    private fun refreshStylePicker(row: LinearLayout) {
        val density = resources.displayMetrics.density
        for (i in 0 until row.childCount) {
            val chip = row.getChildAt(i) as LinearLayout
            val swatch = chip.getChildAt(0)
            val label = chip.getChildAt(1) as TextView
            val style = label.tag as WidgetTheme.Style
            val p = swatch.tag as WidgetTheme.Palette
            val selected = style == selectedStyle
            swatch.background = GradientDrawable(GradientDrawable.Orientation.TL_BR, intArrayOf(p.swatchA, p.swatchB)).apply {
                cornerRadius = 14 * density
                setStroke(((if (selected) 2.5f else 1f) * density).toInt(), if (selected) Color.WHITE else Color.parseColor("#33FFFFFF"))
            }
            label.setTextColor(if (selected) Color.WHITE else Color.parseColor("#99FFFFFF"))
        }
    }

    private fun setupHorizontalRadioButtonsUI(group: RadioGroup) {
        group.setOnCheckedChangeListener { grp, checkedId ->
            for (i in 0 until grp.childCount) {
                val child = grp.getChildAt(i)
                if (child is RadioButton) {
                    if (child.id == checkedId) {
                        child.setBackgroundResource(R.drawable.widget_refresh_bg)
                        child.setTextColor(Color.WHITE)
                    } else {
                        child.setBackgroundColor(Color.TRANSPARENT)
                        child.setTextColor(Color.parseColor("#E0E0E0"))
                    }
                }
            }
        }
    }

    private fun loadPreferences() {
        val prefs = getSharedPreferences("lux_widget_config", Context.MODE_PRIVATE)
        
        val providerInfo = try { AppWidgetManager.getInstance(this).getAppWidgetInfo(widgetId) } catch (e: Exception) { null }
        val className = providerInfo?.provider?.className ?: ""

        val opacity = when {
            widgetId != AppWidgetManager.INVALID_APPWIDGET_ID && prefs.contains("card_opacity_$widgetId") -> prefs.getInt("card_opacity_$widgetId", 90)
            className.isNotEmpty() && prefs.contains("card_opacity_$className") -> prefs.getInt("card_opacity_$className", 90)
            else -> prefs.getInt("card_opacity", 90)
        }
        seekOpacity.progress = opacity
        txtOpacityVal.text = "$opacity%"
        
        val solidNow = WidgetTheme.isSolid(prefs, widgetId, className)
        radioGroupBgMode.check(if (solidNow) R.id.config_bg_solid else R.id.config_bg_fade)

        val widgetBgOpacity = when {
            widgetId != AppWidgetManager.INVALID_APPWIDGET_ID && prefs.contains("widget_background_opacity_$widgetId") -> prefs.getInt("widget_background_opacity_$widgetId", 85)
            className.isNotEmpty() && prefs.contains("widget_background_opacity_$className") -> prefs.getInt("widget_background_opacity_$className", 85)
            else -> prefs.getInt("widget_background_opacity", 85)
        }
        seekWidgetBgOpacity.progress = widgetBgOpacity
        txtWidgetBgOpacityVal.text = "$widgetBgOpacity%"
        
        switchSound.isChecked = prefs.getBoolean("sound_effects", true)
        switchIcons.isChecked = prefs.getBoolean("show_icons", true)
        switchAllowChrono.isChecked = prefs.getBoolean("allow_chronological_switch", true)
        switchAllowBadHabits.isChecked = prefs.getBoolean("allow_bad_habits_switch", true)
        switchTimeFormat12h.isChecked = prefs.getBoolean("time_format_12h", false)
        
        val sizeId = when (prefs.getString("card_size", "medium")) {
            "super_thin" -> R.id.config_size_super_thin
            "thin" -> R.id.config_size_thin
            "large" -> R.id.config_size_large
            else -> R.id.config_size_medium
        }
        radioGroupSize.check(sizeId)
        findViewById<RadioButton>(sizeId)?.performClick()

        val colsId = when (prefs.getInt("card_columns", 1)) {
            2 -> R.id.config_cols_2
            else -> R.id.config_cols_1
        }
        radioGroupColumns.check(colsId)
        findViewById<RadioButton>(colsId)?.performClick()

        val chronoColsId = when (prefs.getInt("chrono_columns", 1)) {
            2 -> R.id.config_chrono_cols_2
            else -> R.id.config_chrono_cols_1
        }
        radioGroupChronoColumns.check(chronoColsId)
        findViewById<RadioButton>(chronoColsId)?.performClick()

        val spacingId = when (prefs.getString("card_spacing", "medio")) {
            "poco" -> R.id.config_spacing_poco
            "grande" -> R.id.config_spacing_grande
            else -> R.id.config_spacing_medio
        }
        radioGroupSpacing.check(spacingId)
        findViewById<RadioButton>(spacingId)?.performClick()

        val gradientId = when (prefs.getString("gradient_style", "radial")) {
            "none" -> R.id.config_grad_none
            "vertical" -> R.id.config_grad_vertical
            "center_radial" -> R.id.config_grad_center_radial
            else -> R.id.config_grad_radial
        }
        radioGroupGradient.check(gradientId)

        val borderId = when (prefs.getString("border_style", "both")) {
            "none" -> R.id.config_border_none
            "card" -> R.id.config_border_card
            "circle" -> R.id.config_border_circle
            else -> R.id.config_border_both
        }
        radioGroupBorder.check(borderId)

        val checklistId = when (prefs.getString("checklist_mode", "direct")) {
            "dialog" -> R.id.config_checklist_dialog
            else -> R.id.config_checklist_direct
        }
        radioGroupChecklist.check(checklistId)

        val taskTimeframeId = when (prefs.getString("default_task_timeframe", "ALL")) {
            "DAY" -> R.id.config_timeframe_day
            "WEEK" -> R.id.config_timeframe_week
            "MONTH" -> R.id.config_timeframe_month
            "8_WEEKS" -> R.id.config_timeframe_8weeks
            "3_MONTHS" -> R.id.config_timeframe_3months
            "YEAR" -> R.id.config_timeframe_year
            else -> R.id.config_timeframe_all
        }
        radioGroupTaskTimeframe.check(taskTimeframeId)
    }

    private fun loadProjectsForSelection() {
        val client = SupabaseWidgetClient(this)
        val prefs = getSharedPreferences("lux_widget_config", Context.MODE_PRIVATE)
        val savedProjectId = prefs.getString("project_id_widget_$widgetId", null)

        CoroutineScope(Dispatchers.IO).launch {
            val list = client.fetchProjects()
            fetchedProjects = list
            withContext(Dispatchers.Main) {
                radioGroupProjectSelect.removeAllViews()
                
                if (list.isEmpty()) {
                    val noProjectsText = TextView(this@WidgetConfigActivity).apply {
                        text = "No se encontraron proyectos activos."
                        setTextColor(Color.parseColor("#80FFFFFF"))
                        textSize = 12f
                        setPadding(16, 16, 16, 16)
                    }
                    radioGroupProjectSelect.addView(noProjectsText)
                    return@withContext
                }

                for (project in list) {
                    val rb = RadioButton(this@WidgetConfigActivity).apply {
                        id = View.generateViewId()
                        text = project.title
                        setTextColor(Color.WHITE)
                        textSize = 12f
                        setPadding(16, 16, 16, 16)
                        tag = project.id
                    }
                    radioGroupProjectSelect.addView(rb)
                    if (project.id == savedProjectId) {
                        radioGroupProjectSelect.check(rb.id)
                    }
                }
            }
        }
    }

    private fun savePreferences() {
        val prefs = getSharedPreferences("lux_widget_config", Context.MODE_PRIVATE)
        
        val sizeVal = when (radioGroupSize.checkedRadioButtonId) {
            R.id.config_size_super_thin -> "super_thin"
            R.id.config_size_thin -> "thin"
            R.id.config_size_large -> "large"
            else -> "medium"
        }
        
        val colsVal = when (radioGroupColumns.checkedRadioButtonId) {
            R.id.config_cols_2 -> 2
            else -> 1
        }

        val chronoColsVal = when (radioGroupChronoColumns.checkedRadioButtonId) {
            R.id.config_chrono_cols_2 -> 2
            else -> 1
        }

        val spacingVal = when (radioGroupSpacing.checkedRadioButtonId) {
            R.id.config_spacing_poco -> "poco"
            R.id.config_spacing_grande -> "grande"
            else -> "medio"
        }

        val gradientVal = when (radioGroupGradient.checkedRadioButtonId) {
            R.id.config_grad_none -> "none"
            R.id.config_grad_vertical -> "vertical"
            R.id.config_grad_center_radial -> "center_radial"
            else -> "radial"
        }

        val borderVal = when (radioGroupBorder.checkedRadioButtonId) {
            R.id.config_border_none -> "none"
            R.id.config_border_card -> "card"
            R.id.config_border_circle -> "circle"
            else -> "both"
        }

        val checklistVal = when (radioGroupChecklist.checkedRadioButtonId) {
            R.id.config_checklist_dialog -> "dialog"
            else -> "direct"
        }

        val defaultTaskTimeframeVal = when (radioGroupTaskTimeframe.checkedRadioButtonId) {
            R.id.config_timeframe_day -> "DAY"
            R.id.config_timeframe_week -> "WEEK"
            R.id.config_timeframe_month -> "MONTH"
            R.id.config_timeframe_8weeks -> "8_WEEKS"
            R.id.config_timeframe_3months -> "3_MONTHS"
            R.id.config_timeframe_year -> "YEAR"
            else -> "ALL"
        }

        val editor = prefs.edit()
            .putBoolean("sound_effects", switchSound.isChecked)
            .putBoolean("show_icons", switchIcons.isChecked)
            .putBoolean("allow_chronological_switch", switchAllowChrono.isChecked)
            .putBoolean("allow_bad_habits_switch", switchAllowBadHabits.isChecked)
            .putBoolean("time_format_12h", switchTimeFormat12h.isChecked)
            .putString("card_size", sizeVal)
            .putInt("card_columns", colsVal)
            .putInt("chrono_columns", chronoColsVal)
            .putString("card_spacing", spacingVal)
            .putString("gradient_style", gradientVal)
            .putString("border_style", borderVal)
            .putString("checklist_mode", checklistVal)
            .putString("default_task_timeframe", defaultTaskTimeframeVal)

        val providerInfo = try { AppWidgetManager.getInstance(this).getAppWidgetInfo(widgetId) } catch (e: Exception) { null }
        val className = providerInfo?.provider?.className ?: ""

        if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
            editor.putInt("card_opacity_$widgetId", seekOpacity.progress)
            editor.putInt("widget_background_opacity_$widgetId", seekWidgetBgOpacity.progress)
            editor.putString("task_timeframe_widget_$widgetId", defaultTaskTimeframeVal)
            
            val checkedRbId = radioGroupProjectSelect.checkedRadioButtonId
            if (checkedRbId != -1) {
                val rb = radioGroupProjectSelect.findViewById<RadioButton>(checkedRbId)
                val selectedProjId = rb?.tag as? String
                if (!selectedProjId.isNullOrEmpty()) {
                    editor.putString("project_id_widget_$widgetId", selectedProjId)
                }
            }
        }

        WidgetTheme.saveStyle(editor, widgetId, className, selectedStyle)
        WidgetTheme.saveMode(editor, widgetId, className, radioGroupBgMode.checkedRadioButtonId == R.id.config_bg_solid)
        if (className.contains("RoutineWidgetProvider") && widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
            editor.putBoolean("routine_show_done_widget_$widgetId", switchRoutineShowDone.isChecked)
        }

        if (className.isNotEmpty()) {
            editor.putInt("card_opacity_$className", seekOpacity.progress)
            editor.putInt("widget_background_opacity_$className", seekWidgetBgOpacity.progress)
        } else {
            editor.putInt("card_opacity", seekOpacity.progress)
            editor.putInt("widget_background_opacity", seekWidgetBgOpacity.progress)
        }

        editor.apply()
    }
}
