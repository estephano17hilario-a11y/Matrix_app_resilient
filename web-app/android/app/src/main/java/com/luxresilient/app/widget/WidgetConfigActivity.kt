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
    private lateinit var switchGlow: Switch
    private lateinit var switchSound: Switch
    private lateinit var radioGroupSize: RadioGroup
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
        switchGlow = findViewById(R.id.config_glow_switch)
        switchSound = findViewById(R.id.config_sound_switch)
        radioGroupSize = findViewById(R.id.config_size_group)
        radioGroupChecklist = findViewById(R.id.config_checklist_group)

        val btnCancel = findViewById<Button>(R.id.config_cancel_btn)
        val btnSave = findViewById<Button>(R.id.config_save_btn)

        // Setup custom look for radio buttons inside the horizontal container
        setupRadioButtonsUI()

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

    private fun setupRadioButtonsUI() {
        // Simple helper to draw background selection on horizontal size buttons
        radioGroupSize.setOnCheckedChangeListener { group, checkedId ->
            for (i in 0 until group.childCount) {
                val child = group.getChildAt(i)
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
        
        switchGlow.isChecked = prefs.getBoolean("card_glow", true)
        switchSound.isChecked = prefs.getBoolean("sound_effects", true)
        
        val sizeId = when (prefs.getString("card_size", "medium")) {
            "thin" -> R.id.config_size_thin
            "large" -> R.id.config_size_large
            else -> R.id.config_size_medium
        }
        radioGroupSize.check(sizeId)
        // Trigger initial checked style
        findViewById<RadioButton>(sizeId)?.performClick()

        val checklistId = when (prefs.getString("checklist_mode", "direct")) {
            "dialog" -> R.id.config_checklist_dialog
            else -> R.id.config_checklist_direct
        }
        radioGroupChecklist.check(checklistId)
    }

    private fun savePreferences() {
        val prefs = getSharedPreferences("lux_widget_config", Context.MODE_PRIVATE)
        val sizeVal = when (radioGroupSize.checkedRadioButtonId) {
            R.id.config_size_thin -> "thin"
            R.id.config_size_large -> "large"
            else -> "medium"
        }
        val checklistVal = when (radioGroupChecklist.checkedRadioButtonId) {
            R.id.config_checklist_dialog -> "dialog"
            else -> "direct"
        }

        prefs.edit()
            .putInt("card_opacity", seekOpacity.progress)
            .putBoolean("card_glow", switchGlow.isChecked)
            .putBoolean("sound_effects", switchSound.isChecked)
            .putString("card_size", sizeVal)
            .putString("checklist_mode", checklistVal)
            .apply()
    }
}
