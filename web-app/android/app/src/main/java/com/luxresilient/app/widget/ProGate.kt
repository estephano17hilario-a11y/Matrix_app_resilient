package com.luxresilient.app.widget

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import android.widget.Toast
import com.luxresilient.app.R

/**
 * Which home-screen widgets need a Deluxe (PRO) subscription, and what a locked widget looks like.
 *
 * The app tells us whether the account is Deluxe ([setPro], called from the web side through
 * WidgetAuthBridge.updateProStatus). Locked providers draw [lockedViews] instead of their content and the
 * widget configuration screen refuses to add them for free accounts.
 *
 * To change which widgets are Deluxe-only, edit [PRO_ONLY] (class names of the providers).
 */
object ProGate {
    private const val PREFS = "lux_widget_auth"
    private const val KEY_IS_PRO = "is_pro"

    /** Deluxe-only widgets: Lux · Rutina, Lux · Calendario and Matrix Diario Calendario. */
    private val PRO_ONLY = listOf("RoutineWidgetProvider", "CalendarWidgetProvider", "JournalWidgetProvider")

    fun isProOnly(providerClassName: String): Boolean = PRO_ONLY.any { providerClassName.endsWith(it) }

    /**
     * Unknown (the app has not reported yet, e.g. right after an update) counts as Deluxe, so a subscriber's widgets
     * never flash locked; free accounts are locked as soon as the app starts and reports.
     */
    fun isPro(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_IS_PRO, true)

    /** @return true when the value changed. */
    fun setPro(context: Context, pro: Boolean): Boolean {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val changed = !prefs.contains(KEY_IS_PRO) || prefs.getBoolean(KEY_IS_PRO, true) != pro
        prefs.edit().putBoolean(KEY_IS_PRO, pro).apply()
        return changed
    }

    private fun deluxeIntent(context: Context): Intent =
        Intent(Intent.ACTION_VIEW, Uri.parse("luxapp://deluxe")).setPackage(context.packageName)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)

    /** Opens the app on the "this is Deluxe" explanation. */
    fun openDeluxe(context: Context) {
        try { context.startActivity(deluxeIntent(context)) } catch (_: Exception) { /* no activity to handle it */ }
    }

    /** The card a locked widget shows; tapping it opens the app on the Deluxe explanation. */
    fun lockedViews(context: Context, widgetId: Int, name: String): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_locked)
        views.setTextViewText(R.id.widget_locked_name, name)
        views.setOnClickPendingIntent(
            R.id.widget_locked_root,
            PendingIntent.getActivity(context, 5900 + widgetId, deluxeIntent(context), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        )
        return views
    }

    /** For the configure screen: a free account cannot add a Deluxe widget. @return true when it was blocked. */
    fun blockIfLocked(context: Context, providerClassName: String): Boolean {
        if (!isProOnly(providerClassName) || isPro(context)) return false
        Toast.makeText(context, "Este widget es de Deluxe", Toast.LENGTH_LONG).show()
        openDeluxe(context)
        return true
    }
}
