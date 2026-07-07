package com.luxresilient.app.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.widget.Button
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.SeekBar
import android.widget.Switch
import android.widget.TextView
import com.luxresilient.app.R

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
    private lateinit var switchChronological: Switch
    
    private lateinit var radioGroupSize: RadioGroup
    private lateinit var radioGroupColumns: RadioGroup
    private lateinit var radioGroupSpacing: RadioGroup
    private lateinit var radioGroupGradient: RadioGroup
    private lateinit var radioGroupBorder: RadioGroup
    private lateinit var radioGroupChecklist: RadioGroup
    
    private var widgetId = AppWidgetManager.INVALID_APPWIDGET_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
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
        switchChronological = findViewById(R.id.config_chronological_switch)
        
        radioGroupSize = findViewById(R.id.config_size_group)
        radioGroupColumns = findViewById(R.id.config_columns_group)
        radioGroupSpacing = findViewById(R.id.config_spacing_group)
        radioGroupGradient = findViewById(R.id.config_gradient_group)
        radioGroupBorder = findViewById(R.id.config_border_group)
        radioGroupChecklist = findViewById(R.id.config_checklist_group)

        val btnCancel = findViewById<Button>(R.id.config_cancel_btn)
        val btnSave = findViewById<Button>(R.id.config_save_btn)

        // Setup custom look for radio buttons inside horizontal containers
        setupHorizontalRadioButtonsUI(radioGroupSize)
        setupHorizontalRadioButtonsUI(radioGroupColumns)
        setupHorizontalRadioButtonsUI(radioGroupSpacing)

        // Load saved preferences
        loadPreferences()

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
            
            // Broadcast refresh
            val refreshIntent = Intent(this, HabitWidgetProvider::class.java).apply {
                action = HabitWidgetProvider.ACTION_REFRESH
            }
            sendBroadcast(refreshIntent)

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
        switchChronological.isChecked = prefs.getBoolean("chronological_sort", false)
        
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

        val spacingVal = when (radioGroupSpacing.checkedRadioButtonId) {
            R.id.config_spacing_poco -> "poco"
            R.id.config_spacing_grande -> "grande"
            else -> "medio"
        }

        val gradientVal = when (radioGroupGradient.checkedRadioButtonId) {
            R.id.config_grad_none -> "none"
            R.id.config_grad_vertical -> "vertical"
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

        prefs.edit()
            .putInt("card_opacity", seekOpacity.progress)
            .putInt("widget_background_opacity", seekWidgetBgOpacity.progress)
            .putBoolean("sound_effects", switchSound.isChecked)
            .putBoolean("show_icons", switchIcons.isChecked)
            .putBoolean("chronological_sort", switchChronological.isChecked)
            .putString("card_size", sizeVal)
            .putInt("card_columns", colsVal)
            .putString("card_spacing", spacingVal)
            .putString("gradient_style", gradientVal)
            .putString("border_style", borderVal)
            .putString("checklist_mode", checklistVal)
            .apply()
    }
}
