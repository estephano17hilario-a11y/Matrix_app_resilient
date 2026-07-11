package com.luxresilient.app.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
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
    
    private lateinit var projectSelectContainer: LinearLayout
    private lateinit var radioGroupProjectSelect: RadioGroup
    private var fetchedProjects: List<ProjectData> = emptyList()
    
    private lateinit var habitsSectionContainer1: LinearLayout
    private lateinit var habitsSectionContainer2: LinearLayout
    private lateinit var tasksSectionContainer: LinearLayout
    private lateinit var cardOpacityContainer: LinearLayout
    
    private var widgetId = AppWidgetManager.INVALID_APPWIDGET_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)
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

        // Load saved preferences
        loadPreferences()

        // Toggle sections visibility based on widget class (different UI for each widget)
        try {
            val providerInfo = AppWidgetManager.getInstance(this).getAppWidgetInfo(widgetId)
            val className = providerInfo?.provider?.className ?: ""
            val isProjectWidget = className.contains("ProjectWidgetProvider")
            val isFocusWidget = className.contains("FocusWidgetProvider")
            val isTaskWidget = className.contains("TaskWidgetProvider")
            val isHabitWidget = className.contains("HabitWidgetProvider")
            val isJournalWidget = className.contains("JournalWidgetProvider")
            
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
            } else if (isJournalWidget) {
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

            // Success result if called as a widget configuration activity
            if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                val resultValue = Intent().apply {
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                }
                setResult(RESULT_OK, resultValue)
            } else {
                setResult(RESULT_OK)
            }
            finish()
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
        
        val opacity = prefs.getInt("card_opacity", 90)
        seekOpacity.progress = opacity
        txtOpacityVal.text = "$opacity%"
        
        val widgetBgOpacity = prefs.getInt("widget_background_opacity", 85)
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
            .putInt("card_opacity", seekOpacity.progress)
            .putInt("widget_background_opacity", seekWidgetBgOpacity.progress)
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

        if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
            editor.putString("task_timeframe_widget_$widgetId", defaultTaskTimeframeVal)
            
            // Save project selection if project selector is visible
            val checkedRbId = radioGroupProjectSelect.checkedRadioButtonId
            if (checkedRbId != -1) {
                val rb = radioGroupProjectSelect.findViewById<RadioButton>(checkedRbId)
                val selectedProjId = rb?.tag as? String
                if (!selectedProjId.isNullOrEmpty()) {
                    editor.putString("project_id_widget_$widgetId", selectedProjId)
                }
            }
        }
        editor.apply()
    }
}
