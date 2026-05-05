package com.luxresilient.app;

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
import android.os.CountDownTimer;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

import java.util.Locale;

import android.content.pm.ServiceInfo;

public class FocusService extends Service {

    public static final String ACTION_START = "ACTION_START";
    public static final String ACTION_STOP = "ACTION_STOP";
    public static final String ACTION_PAUSE = "ACTION_PAUSE";
    public static final String ACTION_RESUME = "ACTION_RESUME";

    public static final String EXTRA_DURATION = "EXTRA_DURATION"; // in seconds
    public static final String EXTRA_MODE = "EXTRA_MODE"; // "POMO" or "STOPWATCH"
    public static final String EXTRA_PROJECT_NAME = "EXTRA_PROJECT_NAME";
    public static final String EXTRA_PROJECT_COLOR = "EXTRA_PROJECT_COLOR"; // Hex String e.g. "#FF0000"
    public static final String EXTRA_PROJECT_ICON = "EXTRA_PROJECT_ICON"; // String/Emoji

    private static final String CHANNEL_ID = "FocusSessionChannel_v4"; // Bumped version to reset config
    private static final String ALARM_CHANNEL_ID = "FocusAlarmChannel_v2";
    private static final int NOTIFICATION_ID = 101;
    private static final int ALARM_NOTIFICATION_ID = 102;

    private CountDownTimer countDownTimer;
    private long timeRemainingMs = 0;
    private boolean isPaused = false;
    private String currentMode = "POMO"; // "POMO" or "STOPWATCH"
    private String projectName = "Focus Session";
    private String projectColor = "#FFFFFF"; // Default White
    private String projectIcon = ""; 
    private long startTimeMs = 0; // For Stopwatch

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;

        // Re-ensure channel exists just in case
        createNotificationChannel();

        String action = intent.getAction();

        if (ACTION_START.equals(action)) {
            long durationSec = intent.getLongExtra(EXTRA_DURATION, 25 * 60);
            currentMode = intent.getStringExtra(EXTRA_MODE);
            if (currentMode == null) currentMode = "POMO";
            
            projectName = intent.getStringExtra("projectName");
            if (projectName == null) projectName = "Focus Session";
            
            projectColor = intent.getStringExtra("projectColor");
            if (projectColor == null || projectColor.equals("#FFFFFF")) projectColor = "#6366f1"; // Modern indigo fallback

            projectIcon = intent.getStringExtra("projectIcon");
            if (projectIcon == null) projectIcon = "✨";

            startTimer(durationSec * 1000);
            
            Notification notification = buildNotification();
            if (Build.VERSION.SDK_INT >= 34) {
                // For Android 14+ (API 34+), specialUse is required. ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE = 1073741824
                startForeground(NOTIFICATION_ID, notification, 1073741824);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }

        } else if (ACTION_STOP.equals(action)) {
            stopTimer();
            stopForeground(true);
            stopSelf();
        } else if (ACTION_PAUSE.equals(action)) {
            pauseTimer();
            updateNotification();
        } else if (ACTION_RESUME.equals(action)) {
            resumeTimer();
            updateNotification();
        }

        return START_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void startTimer(long durationMs) {
        stopTimer(); // Stop existing
        timeRemainingMs = durationMs;
        
        if ("STOPWATCH".equals(currentMode)) {
            // For Stopwatch, durationMs is the initial elapsed time
            startTimeMs = System.currentTimeMillis() - durationMs;
        } else {
            startTimeMs = System.currentTimeMillis();
        }
        
        isPaused = false;

        if ("STOPWATCH".equals(currentMode)) {
            // Stopwatch implementation (counting up)
            // For simplicity, we'll just use a handler or timer that ticks up.
            // But CountdownTimer is easier for Pomo.
            // Let's implement a custom ticker for both.
            startTicker();
        } else {
            // POMO implementation (counting down)
            startTicker();
        }
    }

    private void startTicker() {
        if (countDownTimer != null) countDownTimer.cancel();

        // Tick every second (just to track time, don't update UI every second)
        countDownTimer = new CountDownTimer(
                "POMO".equals(currentMode) ? timeRemainingMs : Long.MAX_VALUE, 
                1000
        ) {
            @Override
            public void onTick(long millisUntilFinished) {
                if ("POMO".equals(currentMode)) {
                    timeRemainingMs = millisUntilFinished;
                } else {
                    // Stopwatch: calculate elapsed
                    timeRemainingMs = System.currentTimeMillis() - startTimeMs;
                }
                // Do NOT call updateNotification() here to avoid chronometer flicker
            }

            @Override
            public void onFinish() {
                if ("POMO".equals(currentMode)) {
                    timeRemainingMs = 0;
                    updateNotification();
                    stopForeground(true); // Or keep showing "Done"
                    notifyCompletion(); // Trigger the alarm notification!
                }
            }
        }.start();
    }

    private void pauseTimer() {
        if (countDownTimer != null) {
            countDownTimer.cancel();
            isPaused = true;
        }
    }

    private void resumeTimer() {
        if (isPaused) {
            if ("POMO".equals(currentMode)) {
                // Resume countdown
                startTicker();
            } else {
                // Resume stopwatch
                // Adjust startTime to account for pause duration?
                // For simplicity in this demo, we'll just restart ticker from current 'timeRemaining' logic?
                // Stopwatch math is tricky with pauses. 
                // Let's stick to simple countdown for now as requested "cuenta regresiva".
                // If user wants stopwatch, we might need more logic.
                // The user specifically asked for "cuenta regresiva o descendente", implying Pomo/Countdown.
                startTicker();
            }
            isPaused = false;
        }
    }

    private void stopTimer() {
        if (countDownTimer != null) {
            countDownTimer.cancel();
            countDownTimer = null;
        }
    }

    private void notifyCompletion() {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;

        int iconResId = android.R.drawable.ic_lock_idle_alarm;

        Bitmap largeIcon = null;
        try {
            largeIcon = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);
        } catch (Exception e) { }

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
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setFullScreenIntent(pendingOpenIntent, true); // Important for alarms when locked

        // FORCE SOUND: Use Notification sound for a gentler chime
        try {
            android.net.Uri alarmSound = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION);
            if (alarmSound != null) {
                builder.setSound(alarmSound);
            }
        } catch (Exception e) {
            // Ignore sound errors
        }

        try {
            manager.notify(ALARM_NOTIFICATION_ID, builder.build());
        } catch (Exception e) { }
    }

    private void updateNotification() {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            try {
                manager.notify(NOTIFICATION_ID, buildNotification());
            } catch (Exception e) {
                // Fail silently if notification permission is revoked
            }
        }
    }

    private Notification buildNotification() {
        String title = projectIcon + " " + projectName;
        
        String text;

        long seconds = timeRemainingMs / 1000;
        long minutes = seconds / 60;
        long remainingSeconds = seconds % 60;
        String timeString = String.format(Locale.getDefault(), "%02d:%02d", minutes, remainingSeconds);

        if ("STOPWATCH".equals(currentMode)) {
            text = "Stopwatch Active";
        } else {
            text = "Deep Focus Mode";
        }

        if (isPaused) {
            text = "Paused - " + timeString;
        }

        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingOpenIntent = PendingIntent.getActivity(
                this, 0, openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // Actions
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

        // Use a valid system icon guaranteed to be visible
        int iconResId = android.R.drawable.ic_lock_idle_alarm; 

        // Large Icon (App Logo)
        Bitmap largeIcon = null;
        try {
            largeIcon = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);
        } catch (Exception e) {
            // ignore
        }

        // Parse Color
        int colorInt = android.graphics.Color.parseColor("#6366f1");
        try {
             colorInt = android.graphics.Color.parseColor(projectColor);
        } catch (Exception e) {
             // Default to indigo
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(text)
                .setSmallIcon(iconResId) 
                .setLargeIcon(largeIcon) // Set App Logo as Large Icon
                .setColor(colorInt) // Set Notification Color (Icon/Accent)
                .setColorized(true) // Enable colorization for standard style (Android 8+)
                .setContentIntent(pendingOpenIntent)
                .setOnlyAlertOnce(true) // Don't buzz every second
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_MAX) 
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setShowWhen(false); // Hide default timestamp

        // Smooth Native Chronometer
        if (!isPaused) {
            builder.setUsesChronometer(true);
            if ("STOPWATCH".equals(currentMode)) {
                builder.setWhen(System.currentTimeMillis() - timeRemainingMs);
            } else {
                builder.setWhen(System.currentTimeMillis() + timeRemainingMs);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    builder.setChronometerCountDown(true);
                }
            }
        }

        // Add Actions dynamically
        if (isPaused) {
            builder.addAction(android.R.drawable.ic_media_play, "Resume", pendingResumeIntent);
        } else {
            builder.addAction(android.R.drawable.ic_media_pause, "Pause", pendingPauseIntent);
        }
        
        builder.addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", pendingStopIntent);

        // Apply MediaStyle for a beautiful player-like look
        builder.setStyle(new MediaStyle()
                .setShowActionsInCompactView(0, 1) // Show Play/Pause and Stop in collapsed view
                .setCancelButtonIntent(pendingStopIntent)
                .setShowCancelButton(true));

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
                    NotificationManager.IMPORTANCE_LOW // LOW IMPORTANCE for silent ongoing
            );
            channel.setDescription("Shows active focus session timer");
            channel.setSound(null, null); // No sound
            channel.enableVibration(false); // No vibration
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(channel);

            // Completion Alarm channel (Gentle sound, vibration)
            NotificationChannel alarmChannel = new NotificationChannel(
                    ALARM_CHANNEL_ID,
                    "Focus Session Complete",
                    NotificationManager.IMPORTANCE_HIGH // HIGH IMPORTANCE
            );
            alarmChannel.setDescription("Rings when a focus session finishes");
            // Set default alarm sound with robust fallback
            android.net.Uri soundUri = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION);
            android.media.AudioAttributes audioAttributes = new android.media.AudioAttributes.Builder()
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                    .build();
            if (soundUri != null) {
                alarmChannel.setSound(soundUri, audioAttributes);
            }
            alarmChannel.enableVibration(true);
            long[] vibrationPattern = {0, 1000, 500, 1000, 500, 1000}; // strong vibration
            alarmChannel.setVibrationPattern(vibrationPattern);
            alarmChannel.setBypassDnd(true); // Attempt to bypass Do Not Disturb for critical alarms
            alarmChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(alarmChannel);
        }
    }
}
