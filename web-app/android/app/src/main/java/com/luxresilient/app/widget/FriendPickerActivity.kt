package com.luxresilient.app.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.LinearLayout
import android.widget.ListView
import android.widget.TextView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Configuration screen of the social widgets: pick which friend to follow. */
class FriendPickerActivity : Activity() {

    companion object {
        const val EXTRA_KIND = "social_widget_kind"
        const val KIND_DUEL = "duel"
        const val KIND_STREAK = "streak"
    }

    private var widgetId = AppWidgetManager.INVALID_APPWIDGET_ID

    private fun dp(v: Int) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics).toInt()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        widgetId = intent?.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID) ?: AppWidgetManager.INVALID_APPWIDGET_ID
        setResult(RESULT_CANCELED, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId))
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) { finish(); return }

        // When opened as the system "configure" step there is no kind extra: infer it from the provider.
        val provider = AppWidgetManager.getInstance(this).getAppWidgetInfo(widgetId)?.provider?.className ?: ""
        val kind = intent.getStringExtra(EXTRA_KIND) ?: if (provider.contains("FriendStreak")) KIND_STREAK else KIND_DUEL

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#0B0B10"))
            setPadding(dp(20), dp(28), dp(20), dp(20))
        }
        val title = TextView(this).apply {
            text = if (kind == KIND_STREAK) "¿Con quién es la racha?" else "¿Contra qué amigo?"
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
            typeface = Typeface.DEFAULT_BOLD
        }
        val status = TextView(this).apply {
            text = "Cargando amigos…"
            setTextColor(Color.parseColor("#A8A8B8"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            setPadding(0, dp(10), 0, dp(10))
        }
        val list = ListView(this).apply { dividerHeight = dp(1) }
        // Same style / background / opacity screen as the other widgets.
        val styleBtn = TextView(this).apply {
            text = "Estilo y fondo del widget  ›"
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setPadding(dp(16), dp(12), dp(16), dp(12))
            background = android.graphics.drawable.GradientDrawable().apply {
                cornerRadius = dp(14).toFloat()
                setColor(Color.parseColor("#1AFFFFFF"))
                setStroke(dp(1), Color.parseColor("#33FFFFFF"))
            }
            setOnClickListener {
                startActivity(Intent(this@FriendPickerActivity, WidgetConfigActivity::class.java).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId))
            }
        }
        root.addView(title)
        root.addView(styleBtn, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(14) })
        root.addView(status)
        root.addView(list, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        setContentView(root)

        CoroutineScope(Dispatchers.IO).launch {
            val authed = SupabaseWidgetClient(this@FriendPickerActivity).isAuthenticated()
            val friends = if (authed) try { SocialWidgetData.friends(this@FriendPickerActivity) } catch (_: Exception) { emptyList() } else emptyList()
            withContext(Dispatchers.Main) {
                status.text = when {
                    !authed -> "Abre Lux e inicia sesión primero."
                    friends.isEmpty() -> "Aún no tienes amigos. Agrégalos desde Lux → Amigos."
                    else -> "Toca un amigo"
                }
                val labels = friends.map { "${it.name}   ·   ${SocialWidgetData.RANK_NAMES.getOrElse(it.rankIndex) { "" }} · ${it.elo} ELO" }
                list.adapter = object : ArrayAdapter<String>(this@FriendPickerActivity, android.R.layout.simple_list_item_1, labels) {
                    override fun getView(position: Int, convertView: android.view.View?, parent: ViewGroup): android.view.View {
                        val v = super.getView(position, convertView, parent) as TextView
                        v.setTextColor(Color.WHITE)
                        v.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
                        v.minHeight = dp(52)
                        v.gravity = Gravity.CENTER_VERTICAL
                        return v
                    }
                }
                list.setOnItemClickListener { _, _, pos, _ -> choose(kind, friends[pos].id) }
            }
        }
    }

    private fun choose(kind: String, friendId: String) {
        val prefs = getSharedPreferences(DuelWidgetProvider.PREFS, Context.MODE_PRIVATE)
        val key = if (kind == KIND_STREAK) FriendStreakWidgetProvider.friendKey(widgetId) else DuelWidgetProvider.friendKey(widgetId)
        prefs.edit().putString(key, friendId).apply()
        val mgr = AppWidgetManager.getInstance(this)
        if (kind == KIND_STREAK) FriendStreakWidgetProvider.update(this, mgr, widgetId) else DuelWidgetProvider.update(this, mgr, widgetId)
        SocialAlarms.ensure(this)
        setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId))
        finish()
    }
}
