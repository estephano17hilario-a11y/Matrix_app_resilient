package com.luxresilient.app.widget

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.luxresilient.app.R
import java.util.Calendar

/**
 * Two background jobs for the social features, without extra libraries:
 *  · right after midnight, re-render the duel and shared-streak widgets
 *  · every ~15 minutes, look for unread nudges/messages and notify them
 */
object SocialAlarms {
    const val ACTION_MIDNIGHT = "com.luxresilient.app.SOCIAL_MIDNIGHT"
    const val ACTION_POLL = "com.luxresilient.app.SOCIAL_POLL"
    private const val CHANNEL = "lux_social"
    private const val PREFS = "lux_social_widgets"
    private const val LAST_SEEN = "last_message_at"

    private fun pending(context: Context, action: String, code: Int) = PendingIntent.getBroadcast(
        context, code, Intent(context, SocialAlarmReceiver::class.java).setAction(action),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    fun ensure(context: Context) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val midnight = Calendar.getInstance().apply {
            add(Calendar.DAY_OF_MONTH, 1)
            set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 30); set(Calendar.MILLISECOND, 0)
        }.timeInMillis
        // Inexact is enough (and needs no special permission); Android delivers it within minutes.
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, midnight, pending(context, ACTION_MIDNIGHT, 7101))
        am.setInexactRepeating(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + AlarmManager.INTERVAL_FIFTEEN_MINUTES, AlarmManager.INTERVAL_FIFTEEN_MINUTES, pending(context, ACTION_POLL, 7102))
    }

    fun refreshWidgets(context: Context) {
        DuelWidgetProvider.refreshAll(context)
        FriendStreakWidgetProvider.refreshAll(context)
    }

    fun pollMessages(context: Context) {
        if (!SupabaseWidgetClient(context).isAuthenticated()) return
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val since = prefs.getString(LAST_SEEN, null)
        val messages = SocialWidgetData.unreadSince(context, since)
        if (messages.isEmpty()) return
        prefs.edit().putString(LAST_SEEN, messages.last().createdAt).apply()
        // First run: remember where we are without flooding old messages.
        if (since == null) return
        val names = SocialWidgetData.names(context, messages.map { it.from }.toSet())
        createChannel(context)
        val open = Intent(Intent.ACTION_VIEW, Uri.parse("luxapp://friends")).setPackage(context.packageName)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val tap = PendingIntent.getActivity(context, 7103, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        for (m in messages) {
            val from = names[m.from] ?: "Un amigo"
            val n = NotificationCompat.Builder(context, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_lux)
                .setContentTitle(if (m.kind == "NUDGE") "🔥 $from" else "💬 $from")
                .setContentText(m.body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(m.body))
                .setAutoCancel(true)
                .setContentIntent(tap)
                .setPriority(if (m.kind == "NUDGE") NotificationCompat.PRIORITY_HIGH else NotificationCompat.PRIORITY_DEFAULT)
                .build()
            try { NotificationManagerCompat.from(context).notify(m.id.hashCode(), n) } catch (_: SecurityException) { /* permission denied */ }
        }
    }

    private fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(CHANNEL, "Amigos", NotificationManager.IMPORTANCE_HIGH).apply { description = "Avisos de racha y mensajes de tus amigos" }
            (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(ch)
        }
    }
}

class SocialAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pending = goAsync()
        Thread {
            try {
                when (intent.action) {
                    SocialAlarms.ACTION_MIDNIGHT -> SocialAlarms.refreshWidgets(context)
                    SocialAlarms.ACTION_POLL -> SocialAlarms.pollMessages(context)
                    Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED -> Unit
                }
                SocialAlarms.ensure(context)
            } finally {
                pending.finish()
            }
        }.start()
    }
}
