package com.luxresilient.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.util.Locale;

/**
 * Foreground service that mirrors the focus timer in the notification shade.
 *
 * Design notes (why it is built this way):
 *  - Time is tracked with absolute timestamps (end time / start time), never with a ticking counter,
 *    so pausing, resuming and Doze can't make the clock drift.
 *  - The end of a Pomodoro is armed twice: an exact AlarmManager alarm (fires even in Doze) and an
 *    in-process Handler (fires instantly while the process is awake). Whichever comes first wins;
 *    the other is ignored because the session is no longer "running".
 *  - Actions that come from JS carry EXTRA_FROM_JS and are NOT echoed back to JS. Only the
 *    notification buttons echo, otherwise a JS stop could kill a freshly started session.
 *  - Starting, stopping or finishing always removes the old completion notification so a stale
 *    "session finished" card can never linger.
 */
public class FocusService extends Service {

    public static final String ACTION_START = "ACTION_START";
    public static final String ACTION_STOP = "ACTION_STOP";
    public static final String ACTION_PAUSE = "ACTION_PAUSE";
    public static final String ACTION_RESUME = "ACTION_RESUME";
    public static final String ACTION_FINISH = "ACTION_FINISH";

    public static final String EXTRA_DURATION = "EXTRA_DURATION"; // seconds (remaining for POMO, elapsed for STOPWATCH)
    public static final String EXTRA_MODE = "EXTRA_MODE"; // "POMO" or "STOPWATCH"
    public static final String EXTRA_PROJECT_NAME = "EXTRA_PROJECT_NAME";
    public static final String EXTRA_PROJECT_COLOR = "EXTRA_PROJECT_COLOR"; // Hex String e.g. "#FF0000"
    public static final String EXTRA_PROJECT_ICON = "EXTRA_PROJECT_ICON"; // String/Emoji
    public static final String EXTRA_LABEL = "EXTRA_LABEL"; // Optional subtitle, e.g. "Enfoque 2/4"
    public static final String EXTRA_FROM_JS = "EXTRA_FROM_JS";
    public static final String EXTRA_TIME_LEFT = "EXTRA_TIME_LEFT"; // seconds, JS's authoritative clock (-1 = unknown)
    public static final String EXTRA_TOKEN = "EXTRA_TOKEN";

    private static final String CHANNEL_ID = "FocusSessionChannel_v4";
    private static final String ALARM_CHANNEL_ID = "FocusAlarmChannel_v2";
    private static final int NOTIFICATION_ID = 101;
    private static final int ALARM_NOTIFICATION_ID = 102;
    private static final int FINISH_REQUEST_CODE = 4;
    /** If the app is on screen, give the JS timer a moment to finish first (it plays its own alarm). */
    private static final long FOREGROUND_ALARM_DELAY_MS = 2500;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable finishRunnable = new Runnable() {
        @Override
        public void run() {
            finishPomodoro(sessionToken);
        }
    };
    private Runnable pendingAlarmRunnable = null;

    private boolean running = false;
    private boolean isPaused = false;
    private long sessionToken = 0;

    private String currentMode = "POMO"; // "POMO" or "STOPWATCH"
    private String projectName = "Focus Session";
    private String projectColor = "#6366f1";
    private String projectIcon = "";
    private String label = "";

    // POMO: wall-clock instant the session ends while running; frozen remaining time while paused.
    private long endTimeMs = 0;
    private long pausedRemainingMs = 0;
    // STOPWATCH: wall-clock instant the session started while running; frozen elapsed while paused.
    private long startTimeMs = 0;
    private long pausedElapsedMs = 0;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            // The OS restarted us after killing the process: the JS clock is gone, so there is
            // nothing to mirror. Don't linger as an invisible zombie service.
            stopSelf();
            return START_NOT_STICKY;
        }

        createNotificationChannel();

        String action = intent.getAction();
        boolean fromJs = intent.getBooleanExtra(EXTRA_FROM_JS, false);
        long timeLeftSec = intent.getLongExtra(EXTRA_TIME_LEFT, -1);
        if (action == null) action = "";

        switch (action) {
            case ACTION_START:
                handleStart(intent);
                break;

            case ACTION_PAUSE:
                if (running && !isPaused) {
                    freezeClock(timeLeftSec);
                    if (!fromJs) notifyReact("onPause");
                    updateNotification();
                }
                break;

            case ACTION_RESUME:
                if (running && isPaused) {
                    unfreezeClock(timeLeftSec);
                    if (!fromJs) notifyReact("onResume");
                    updateNotification();
                }
                break;

            case ACTION_STOP:
                if (!fromJs) notifyReact("onStop");
                shutdown(true);
                break;

            case ACTION_FINISH:
                finishPomodoro(intent.getLongExtra(EXTRA_TOKEN, -1));
                break;

            default:
                break;
        }

        // A command that reached us with no live session (e.g. a late Pause after Stop) must not
        // leave an idle service lingering. The short completion window is the one exception.
        if (!running && pendingAlarmRunnable == null && !ACTION_START.equals(action)) {
            stopSelf();
        }

        return START_NOT_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        cancelFinishTimers();
        super.onDestroy();
    }

    // ── Session lifecycle ────────────────────────────────────────────────────────────────────

    private void handleStart(Intent intent) {
        // A fresh session replaces whatever was running and wipes any old "finished" card.
        cancelFinishTimers();
        cancelCompletionNotification();
        sessionToken = System.nanoTime();

        long durationSec = intent.getLongExtra(EXTRA_DURATION, 25 * 60);
        if (durationSec < 0) durationSec = 0;

        currentMode = intent.getStringExtra(EXTRA_MODE);
        if (currentMode == null) currentMode = "POMO";

        projectName = firstNonNull(intent.getStringExtra("projectName"), intent.getStringExtra(EXTRA_PROJECT_NAME), "Focus Session");
        projectColor = firstNonNull(intent.getStringExtra("projectColor"), intent.getStringExtra(EXTRA_PROJECT_COLOR), "#6366f1");
        if (projectColor.equals("#FFFFFF")) projectColor = "#6366f1";
        projectIcon = firstNonNull(intent.getStringExtra("projectIcon"), intent.getStringExtra(EXTRA_PROJECT_ICON), "✨");
        label = firstNonNull(intent.getStringExtra(EXTRA_LABEL), "");

        long now = System.currentTimeMillis();
        isPaused = false;
        running = true;
        if (isStopwatch()) {
            startTimeMs = now - durationSec * 1000;
        } else {
            endTimeMs = now + durationSec * 1000;
        }

        Notification notification = buildNotification();
        try {
            startForeground(NOTIFICATION_ID, notification);
        } catch (Exception e) {
            android.util.Log.e("FocusService", "Failed to start foreground service: " + e.getMessage());
        }

        armFinishTimers();
    }

    /** Pause: capture exactly how much time is left / elapsed, preferring JS's own clock. */
    private void freezeClock(long timeLeftSec) {
        long now = System.currentTimeMillis();
        if (isStopwatch()) {
            pausedElapsedMs = timeLeftSec >= 0 ? timeLeftSec * 1000 : Math.max(0, now - startTimeMs);
        } else {
            pausedRemainingMs = timeLeftSec >= 0 ? timeLeftSec * 1000 : Math.max(0, endTimeMs - now);
        }
        isPaused = true;
        cancelFinishTimers();
    }

    private void unfreezeClock(long timeLeftSec) {
        long now = System.currentTimeMillis();
        if (isStopwatch()) {
            long elapsed = timeLeftSec >= 0 ? timeLeftSec * 1000 : pausedElapsedMs;
            startTimeMs = now - elapsed;
        } else {
            long remaining = timeLeftSec >= 0 ? timeLeftSec * 1000 : pausedRemainingMs;
            endTimeMs = now + remaining;
        }
        isPaused = false;
        armFinishTimers();
    }

    private void finishPomodoro(long token) {
        if (!running || isPaused || isStopwatch()) return;
        if (token != sessionToken) return; // Stale alarm from a previous session.

        running = false;
        cancelFinishTimers();
        stopForeground(true);
        cancelOngoingNotification();
        notifyReact("onFinish");

        if (MainActivity.isInForeground) {
            // The app is open: its own timer completes the session and plays the alarm. Only post
            // the system notification if JS didn't take over (a STOP cancels this runnable).
            pendingAlarmRunnable = new Runnable() {
                @Override
                public void run() {
                    pendingAlarmRunnable = null;
                    notifyCompletion();
                    stopSelf();
                }
            };
            handler.postDelayed(pendingAlarmRunnable, FOREGROUND_ALARM_DELAY_MS);
        } else {
            notifyCompletion();
            stopSelf();
        }
    }

    private void shutdown(boolean removeCompletionCard) {
        running = false;
        isPaused = false;
        cancelFinishTimers();
        if (removeCompletionCard) cancelCompletionNotification();
        stopForeground(true);
        cancelOngoingNotification();
        stopSelf();
    }

    // ── Timers ───────────────────────────────────────────────────────────────────────────────

    private void armFinishTimers() {
        if (isStopwatch() || !running || isPaused) return;
        cancelFinishTimers();

        long delay = Math.max(0, endTimeMs - System.currentTimeMillis());

        // 1. In-process, instant while the process is awake.
        handler.postDelayed(finishRunnable, delay);

        // 2. Exact alarm, survives Doze / deep sleep.
        try {
            AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (am != null) {
                long triggerAt = SystemClock.elapsedRealtime() + delay;
                PendingIntent pi = finishPendingIntent();
                boolean canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms();
                try {
                    if (canExact) {
                        am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
                    } else {
                        am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
                    }
                } catch (SecurityException se) {
                    am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
                }
            }
        } catch (Exception e) {
            android.util.Log.e("FocusService", "Failed to arm finish alarm: " + e.getMessage());
        }
    }

    private void cancelFinishTimers() {
        handler.removeCallbacks(finishRunnable);
        if (pendingAlarmRunnable != null) {
            handler.removeCallbacks(pendingAlarmRunnable);
            pendingAlarmRunnable = null;
        }
        try {
            AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (am != null) am.cancel(finishPendingIntent());
        } catch (Exception ignored) { }
    }

    private PendingIntent finishPendingIntent() {
        Intent intent = new Intent(this, FocusService.class);
        intent.setAction(ACTION_FINISH);
        intent.putExtra(EXTRA_TOKEN, sessionToken);
        return PendingIntent.getService(
                this, FINISH_REQUEST_CODE, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────────────────

    private boolean isStopwatch() {
        return "STOPWATCH".equals(currentMode);
    }

    private static String firstNonNull(String... values) {
        for (String v : values) {
            if (v != null) return v;
        }
        return "";
    }

    private void notifyReact(String eventName) {
        if (FocusPlugin.instance != null) {
            FocusPlugin.instance.triggerEvent(eventName);
        }
    }

    private void cancelCompletionNotification() {
        try {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.cancel(ALARM_NOTIFICATION_ID);
        } catch (Exception ignored) { }
    }

    private void cancelOngoingNotification() {
        try {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.cancel(NOTIFICATION_ID);
        } catch (Exception ignored) { }
    }

    private void notifyCompletion() {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;

        int iconResId = R.drawable.ic_stat_lux;

        Bitmap largeIcon = null;
        try {
            largeIcon = BitmapFactory.decodeResource(getResources(), R.drawable.lux_logo);
        } catch (Exception e) {
            try {
                largeIcon = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);
            } catch (Exception e2) { }
        }

        int colorInt = android.graphics.Color.WHITE;
        try {
            colorInt = android.graphics.Color.parseColor(projectColor);
        } catch (Exception e) { }

        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingOpenIntent = PendingIntent.getActivity(
                this, 0, openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String title = "Focus Complete!";
        if (projectIcon != null && !projectIcon.isEmpty()) {
            title = projectIcon + " " + title;
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, ALARM_CHANNEL_ID)
                .setContentTitle(title)
                .setContentText("You finished your session for " + projectName + ". Tap to claim victory!")
                .setSmallIcon(iconResId)
                .setLargeIcon(largeIcon)
                .setColor(colorInt)
                .setColorized(true)
                .setContentIntent(pendingOpenIntent)
                .setAutoCancel(true)
                .setShowWhen(true)
                .setWhen(endTimeMs > 0 ? endTimeMs : System.currentTimeMillis())
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setFullScreenIntent(pendingOpenIntent, true);

        try {
            android.net.Uri alarmSound = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION);
            if (alarmSound != null) {
                builder.setSound(alarmSound);
            }
        } catch (Exception e) { }

        try {
            manager.notify(ALARM_NOTIFICATION_ID, builder.build());
        } catch (Exception e) { }
    }

    private void updateNotification() {
        if (!running) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            try {
                manager.notify(NOTIFICATION_ID, buildNotification());
            } catch (Exception e) { }
        }
    }

    private Notification buildNotification() {
        String title = projectIcon + " " + projectName;

        long frozenMs = isStopwatch() ? pausedElapsedMs : pausedRemainingMs;
        long seconds = Math.max(0, frozenMs) / 1000;
        String timeString = String.format(Locale.getDefault(), "%02d:%02d", seconds / 60, seconds % 60);

        String text = isStopwatch() ? "Stopwatch Active" : "Deep Focus Mode";
        if (!label.isEmpty()) text = label;
        if (isPaused) {
            text = "Paused - " + timeString + (label.isEmpty() ? "" : " · " + label);
        }

        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingOpenIntent = PendingIntent.getActivity(
                this, 0, openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Notification buttons (no EXTRA_FROM_JS → they ARE echoed to JS).
        Intent stopIntent = new Intent(this, FocusService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent pendingStopIntent = PendingIntent.getService(
                this, 1, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent pauseIntent = new Intent(this, FocusService.class);
        pauseIntent.setAction(ACTION_PAUSE);
        PendingIntent pendingPauseIntent = PendingIntent.getService(
                this, 2, pauseIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent resumeIntent = new Intent(this, FocusService.class);
        resumeIntent.setAction(ACTION_RESUME);
        PendingIntent pendingResumeIntent = PendingIntent.getService(
                this, 3, resumeIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        int iconResId = R.drawable.ic_stat_lux;

        Bitmap largeIcon = null;
        try {
            largeIcon = BitmapFactory.decodeResource(getResources(), R.drawable.lux_logo);
        } catch (Exception e) {
            try {
                largeIcon = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);
            } catch (Exception e2) { }
        }

        int colorInt = android.graphics.Color.parseColor("#6366f1");
        try {
            colorInt = android.graphics.Color.parseColor(projectColor);
        } catch (Exception e) { }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(text)
                .setSmallIcon(iconResId)
                .setLargeIcon(largeIcon)
                .setColor(colorInt)
                .setColorized(true)
                .setContentIntent(pendingOpenIntent)
                .setOnlyAlertOnce(true)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setShowWhen(true);

        // Native chronometer driven by absolute timestamps: exact, and costs no CPU.
        if (!isPaused) {
            builder.setUsesChronometer(true);
            if (isStopwatch()) {
                builder.setWhen(startTimeMs);
            } else {
                builder.setWhen(endTimeMs);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    builder.setChronometerCountDown(true);
                }
            }
        } else {
            builder.setUsesChronometer(false);
            builder.setShowWhen(false);
        }

        if (isPaused) {
            builder.addAction(R.drawable.ic_play, "Resume", pendingResumeIntent);
        } else {
            builder.addAction(R.drawable.ic_pause, "Pause", pendingPauseIntent);
        }

        builder.addAction(R.drawable.ic_stop, "Stop", pendingStopIntent);

        return builder.build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;

            // Ongoing session channel (No sound, no vibration)
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Focus Session",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows active focus session timer");
            channel.setSound(null, null);
            channel.enableVibration(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(channel);

            // Completion Alarm channel (Gentle sound, vibration)
            NotificationChannel alarmChannel = new NotificationChannel(
                    ALARM_CHANNEL_ID,
                    "Focus Session Complete",
                    NotificationManager.IMPORTANCE_HIGH
            );
            alarmChannel.setDescription("Rings when a focus session finishes");

            android.net.Uri soundUri = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION);
            android.media.AudioAttributes audioAttributes = new android.media.AudioAttributes.Builder()
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                    .build();
            if (soundUri != null) {
                alarmChannel.setSound(soundUri, audioAttributes);
            }
            alarmChannel.enableVibration(true);
            long[] vibrationPattern = {0, 1000, 500, 1000, 500, 1000};
            alarmChannel.setVibrationPattern(vibrationPattern);
            alarmChannel.setBypassDnd(true);
            alarmChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(alarmChannel);
        }
    }
}
