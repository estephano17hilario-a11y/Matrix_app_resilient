package com.luxresilient.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.WindowManager;
import android.app.AlarmManager;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "FocusSession")
public class FocusPlugin extends Plugin {

    public static FocusPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public void triggerEvent(String eventName) {
        notifyListeners(eventName, new JSObject());
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject ret = new JSObject();
        Context context = getContext();

        // Create channels so they appear in system settings before service starts
        createNotificationChannels(context);

        // 1. Check Notification Permission
        boolean notifications = NotificationManagerCompat.from(context).areNotificationsEnabled();
        
        // 2. Check Battery Optimization (Ignore Battery Optimizations)
        boolean battery = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                battery = pm.isIgnoringBatteryOptimizations(context.getPackageName());
            }
        }

        // 3. Check Exact Alarm Permission (Android 12+)
        boolean exactAlarms = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null) {
                exactAlarms = alarmManager.canScheduleExactAlarms();
            }
        }

        ret.put("notifications", notifications);
        ret.put("battery", battery);
        ret.put("exactAlarms", exactAlarms);
        
        call.resolve(ret);
    }

    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
                if (alarmManager != null && !alarmManager.canScheduleExactAlarms()) {
                    try {
                        Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        getContext().startActivity(intent);
                    } catch (Exception e) {
                        // Fallback: open exact alarm settings without package URI (always works)
                        Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        getContext().startActivity(intent);
                    }
                }
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to request exact alarm permission", e);
        }
    }

    @PluginMethod
    public void requestBatteryPermission(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent = new Intent();
                String packageName = getContext().getPackageName();
                PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
                
                if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                    intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + packageName));
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                }
            }
            call.resolve();
        } catch (Exception e) {
            try {
                // Fallback to battery optimization settings list
                Intent fallbackIntent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                fallbackIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallbackIntent);
                call.resolve();
            } catch (Exception fallbackErr) {
                try {
                    // Final fallback: App Details page
                    Intent finalFallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    finalFallback.setData(Uri.parse("package:" + getContext().getPackageName()));
                    finalFallback.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(finalFallback);
                    call.resolve();
                } catch (Exception e3) {
                    call.reject("Failed to request battery permission", e3);
                }
            }
        }
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        try {
            createNotificationChannels(getContext());
            Intent intent = new Intent();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
            } else {
                intent.setAction("android.settings.APP_NOTIFICATION_SETTINGS");
                intent.putExtra("app_package", getContext().getPackageName());
                intent.putExtra("app_uid", getContext().getApplicationInfo().uid);
            }
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            try {
                // Fallback: App Details page
                Intent finalFallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                finalFallback.setData(Uri.parse("package:" + getContext().getPackageName()));
                finalFallback.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(finalFallback);
                call.resolve();
            } catch (Exception e2) {
                call.reject("Failed to open notification settings", e2);
            }
        }
    }

    @PluginMethod
    public void start(PluginCall call) {
        long duration = call.getInt("duration", 25 * 60); // seconds
        String mode = call.getString("mode", "POMO");
        String projectName = call.getString("projectName", "Focus Session");
        String projectColor = call.getString("projectColor", "#FFFFFF");
        String projectIcon = call.getString("projectIcon", ""); // Optional icon string (emoji or name)
        
        // Start Foreground Service
        Intent intent = new Intent(getContext(), FocusService.class);
        intent.setAction(FocusService.ACTION_START);
        intent.putExtra(FocusService.EXTRA_DURATION, duration);
        intent.putExtra(FocusService.EXTRA_MODE, mode);
        intent.putExtra("projectName", projectName);
        intent.putExtra("projectColor", projectColor);
        intent.putExtra("projectIcon", projectIcon);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
        
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), FocusService.class);
        intent.setAction(FocusService.ACTION_STOP);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void pause(PluginCall call) {
        Intent intent = new Intent(getContext(), FocusService.class);
        intent.setAction(FocusService.ACTION_PAUSE);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void resume(PluginCall call) {
        Intent intent = new Intent(getContext(), FocusService.class);
        intent.setAction(FocusService.ACTION_RESUME);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void enablePrivacy(PluginCall call) {
        getBridge().executeOnMainThread(() -> {
            try {
                if (getBridge().getActivity() != null) {
                    getBridge().getActivity().getWindow().setFlags(
                        WindowManager.LayoutParams.FLAG_SECURE,
                        WindowManager.LayoutParams.FLAG_SECURE
                    );
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void disablePrivacy(PluginCall call) {
        getBridge().executeOnMainThread(() -> {
            try {
                if (getBridge().getActivity() != null) {
                    getBridge().getActivity().getWindow().clearFlags(
                        WindowManager.LayoutParams.FLAG_SECURE
                    );
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            call.resolve();
        });
    }

    private void createNotificationChannels(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            android.app.NotificationManager manager = context.getSystemService(android.app.NotificationManager.class);
            if (manager == null) return;

            // Ongoing session channel (No sound, no vibration)
            android.app.NotificationChannel channel = new android.app.NotificationChannel(
                    "FocusSessionChannel_v4",
                    "Focus Session",
                    android.app.NotificationManager.IMPORTANCE_LOW // LOW IMPORTANCE for silent ongoing
            );
            channel.setDescription("Shows active focus session timer");
            channel.setSound(null, null); // No sound
            channel.enableVibration(false); // No vibration
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(channel);

            // Completion Alarm channel (Gentle sound, vibration)
            android.app.NotificationChannel alarmChannel = new android.app.NotificationChannel(
                    "FocusAlarmChannel_v2",
                    "Focus Session Complete",
                    android.app.NotificationManager.IMPORTANCE_HIGH // HIGH IMPORTANCE
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
            alarmChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(alarmChannel);
        }
    }
}
