package com.luxresilient.app.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import com.luxresilient.app.R

class WidgetSelectorActivity : Activity() {

    private var widgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private var selectorType = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.widget_selector_dialog)

        widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        selectorType = intent.getStringExtra("selector_type") ?: ""

        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID || selectorType.isEmpty()) {
            finish()
            return
        }

        val txtTitle = findViewById<TextView>(R.id.selector_dialog_title)
        val container = findViewById<LinearLayout>(R.id.selector_options_container)

        findViewById<FrameLayout>(R.id.selector_dialog_root).setOnClickListener {
            finish()
        }

        findViewById<Button>(R.id.selector_cancel_btn).setOnClickListener {
            finish()
        }

        when (selectorType) {
            "focus_timeframe" -> {
                txtTitle.text = "Seleccionar Rango de Tiempo"
                val options = listOf(
                    Pair("DAY", "Hoy"),
                    Pair("WEEK", "Semana"),
                    Pair("MONTH", "Mes"),
                    Pair("8_WEEKS", "8 Semanas"),
                    Pair("3_MONTHS", "3 Meses"),
                    Pair("YEAR", "Año")
                )
                populateOptions(container, options, "focus_timeframe_widget_$widgetId")
            }
            "focus_division" -> {
                txtTitle.text = "Seleccionar División de Enfoque"
                val options = listOf(
                    Pair("none", "Sin División"),
                    Pair("rasgo", "Dividido por Rasgo"),
                    Pair("proyecto", "Dividido por Proyecto")
                )
                populateOptions(container, options, "focus_division_widget_$widgetId")
            }
            else -> finish()
        }
    }

    private fun populateOptions(container: LinearLayout, options: List<Pair<String, String>>, prefKey: String) {
        val prefs = getSharedPreferences("lux_widget_config", Context.MODE_PRIVATE)
        val currentValue = prefs.getString(prefKey, "")
        val density = resources.displayMetrics.density

        for (opt in options) {
            val tv = TextView(this).apply {
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
                text = opt.second
                setTextColor(if (opt.first == currentValue) Color.parseColor("#6366f1") else Color.WHITE)
                textSize = 14f
                setPadding((16 * density).toInt(), (14 * density).toInt(), (16 * density).toInt(), (14 * density).toInt())
                gravity = Gravity.CENTER_VERTICAL
                
                // Click listener to select
                setOnClickListener {
                    prefs.edit().putString(prefKey, opt.first).apply()
                    
                    // Refresh focus widgets
                    val refreshIntent = Intent(this@WidgetSelectorActivity, FocusWidgetProvider::class.java).apply {
                        action = FocusWidgetProvider.ACTION_REFRESH_FOCUS
                    }
                    sendBroadcast(refreshIntent)
                    
                    finish()
                }
            }
            
            // Subtle divider line
            val divider = View(this).apply {
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    (1 * density).toInt()
                )
                setBackgroundColor(Color.parseColor("#1AFFFFFF"))
            }

            container.addView(tv)
            container.addView(divider)
        }
    }
}
