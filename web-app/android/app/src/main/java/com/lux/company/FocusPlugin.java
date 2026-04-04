package com.lux.company;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.WindowManager;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "FocusSession")
public class FocusPlugin extends Plugin {

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject ret = new JSObject();
        Context context = getContext();

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

        // 3. Check Overlay Permission (System Alert Window) - Required for "Dynamic Island" style overlays
        boolean overlay = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            overlay = Settings.canDrawOverlays(context);
        }

        ret.put("notifications", notifications);
        ret.put("battery", battery);
        ret.put("overlay", overlay);
        
        call.resolve(ret);
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
            call.reject("Failed to request battery permission", e);
        }
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (!Settings.canDrawOverlays(getContext())) {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:" + getContext().getPackageName()));
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                }
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to request overlay permission", e);
        }
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        try {
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
            call.reject("Failed to open notification settings", e);
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
        intent.setAction("START");
        intent.putExtra("duration", duration);
        intent.putExtra("mode", mode);
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
        intent.setAction("STOP");
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void pause(PluginCall call) {
        Intent intent = new Intent(getContext(), FocusService.class);
        intent.setAction("PAUSE");
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void resume(PluginCall call) {
        Intent intent = new Intent(getContext(), FocusService.class);
        intent.setAction("RESUME");
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
}
