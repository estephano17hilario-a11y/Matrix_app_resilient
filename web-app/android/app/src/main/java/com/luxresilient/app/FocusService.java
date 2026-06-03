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
            if (projectName == null) projectName = intent.getStringExtra(EXTRA_PROJECT_NAME);
            if (projectName == null) projectName = "Focus Session";
            
            projectColor = intent.getStringExtra("projectColor");
            if (projectColor == null) projectColor = intent.getStringExtra(EXTRA_PROJECT_COLOR);
            if (projectColor == null || projectColor.equals("#FFFFFF")) projectColor = "#6366f1"; // Modern indigo fallback

            projectIcon = intent.getStringExtra("projectIcon");
            if (projectIcon == null) projectIcon = intent.getStringExtra(EXTRA_PROJECT_ICON);
            if (projectIcon == null) projectIcon = "✨";

            startTimer(durationSec * 1000);
            
            Notification notification = buildNotification();
            try {
                if (Build.VERSION.SDK_INT >= 34) {
                    // For Android 14+ (API 34+), specialUse is required. ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE = 1073741824
                    startForeground(NOTIFICATION_ID, notification, 1073741824);
                } else {
                    startForeground(NOTIFICATION_ID, notification);
                }
            } catch (Exception e) {
                android.util.Log.e("FocusService", "Failed to start foreground service: " + e.getMessage());
                try {
                    startForeground(NOTIFICATION_ID, notification);
                } catch (Exception ex) {
                    android.util.Log.e("FocusService", "Critical failure starting foreground service: " + ex.getMessage());
                }
            }

        } else if (ACTION_STOP.equals(action)) {
            notifyReact("onStop");
            stopTimer();
            stopForeground(true);
            stopSelf();
        } else if (ACTION_PAUSE.equals(action)) {
            notifyReact("onPause");
            pauseTimer();
            updateNotification();
        } else if (ACTION_RESUME.equals(action)) {
            notifyReact("onResume");
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
            }

            @Override
            public void onFinish() {
                if ("POMO".equals(currentMode)) {
                    timeRemainingMs = 0;
                    updateNotification();
                    stopForeground(true);
                    notifyCompletion(); // Trigger the alarm notification!
                }
            }
        }.start();
    }

    private void notifyReact(String eventName) {
        if (FocusPlugin.instance != null) {
            FocusPlugin.instance.triggerEvent(eventName);
        }
    }

    private void pauseTimer() {
        if (countDownTimer != null) {
            countDownTimer.cancel();
        }
        isPaused = true;
    }

    private void resumeTimer() {
        if (isPaused) {
            if ("STOPWATCH".equals(currentMode)) {
                // Adjust startTimeMs so the elapsed time is preserved
                startTimeMs = System.currentTimeMillis() - timeRemainingMs;
            }
            startTicker();
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
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setFullScreenIntent(pendingOpenIntent, true);

        // FORCE SOUND
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
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            try {
                manager.notify(NOTIFICATION_ID, buildNotification());
            } catch (Exception e) { }
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

        // Use custom sparkle icon as small icon
        int iconResId = R.drawable.ic_stat_lux; 

        // Large Icon (App Logo)
        Bitmap largeIcon = null;
        try {
            largeIcon = BitmapFactory.decodeResource(getResources(), R.drawable.lux_logo);
        } catch (Exception e) {
            try {
                largeIcon = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);
            } catch (Exception e2) { }
        }

        // Parse Color
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
        } else {
            builder.setUsesChronometer(false);
        }

        // Add Actions dynamically
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
