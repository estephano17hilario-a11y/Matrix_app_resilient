package com.luxresilient.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.luxresilient.app.widget.WidgetAuthBridge;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugins MUST be registered before super.onCreate(), which builds the Capacitor
        // bridge. Registering afterwards leaves them "not implemented on android".
        purgeNonStringCapacitorPrefs();
        registerPlugin(FocusPlugin.class);
        registerPlugin(WidgetAuthBridge.class);
        registerPlugin(CoachNotifyPlugin.class);
        super.onCreate(savedInstanceState);
        installRenderCrashGuard();
    }

    private long lastRenderRecovery = 0L;

    /**
     * When the WebView's renderer process dies (out of memory / GPU reset on a weak phone) and nobody
     * handles it, Android kills the WHOLE app: the user sees Lux "crash and close". Capacitor's client
     * returns false in that case, so we handle it: rebuild the activity (a fresh WebView) instead.
     * A second death within 10 s is let through so we never loop.
     */
    private void installRenderCrashGuard() {
        try {
            if (getBridge() == null) return;
            getBridge().addWebViewListener(new com.getcapacitor.WebViewListener() {
                @Override
                public boolean onRenderProcessGone(android.webkit.WebView view, android.webkit.RenderProcessGoneDetail detail) {
                    long now = System.currentTimeMillis();
                    boolean loop = now - lastRenderRecovery < 10_000L;
                    lastRenderRecovery = now;
                    android.util.Log.e("LuxRender", "WebView renderer gone (crash=" + detail.didCrash() + ") — " + (loop ? "giving up" : "recreating"));
                    if (loop) return false;
                    runOnUiThread(() -> {
                        try { recreate(); } catch (Exception e) { android.util.Log.e("LuxRender", "recreate failed", e); }
                    });
                    return true;
                }
            });
        } catch (Exception e) {
            android.util.Log.e("LuxRender", "could not install render guard", e);
        }
    }

    /**
     * Capacitor's Preferences plugin reads every entry of "CapacitorStorage" with getString().
     * Any Float/Int/Boolean left there (older widget code wrote some) throws a ClassCastException
     * that kills the app on every launch, so drop them before the bridge starts.
     */
    private void purgeNonStringCapacitorPrefs() {
        try {
            android.content.SharedPreferences prefs = getSharedPreferences("CapacitorStorage", MODE_PRIVATE);
            android.content.SharedPreferences.Editor editor = prefs.edit();
            boolean dirty = false;
            for (java.util.Map.Entry<String, ?> entry : prefs.getAll().entrySet()) {
                if (!(entry.getValue() instanceof String)) {
                    editor.remove(entry.getKey());
                    dirty = true;
                }
            }
            if (dirty) editor.commit();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /** True while the app is on screen. FocusService uses it to avoid double-alarming a visible app. */
    public static volatile boolean isInForeground = false;

    @Override
    public void onResume() {
        super.onResume();
        isInForeground = true;
        sendWidgetRefreshBroadcast();
    }

    @Override
    public void onPause() {
        isInForeground = false;
        super.onPause();
        sendWidgetRefreshBroadcast();
    }

    private void sendWidgetRefreshBroadcast() {
        try {
            // Refresh Habit widget
            android.content.Intent habitIntent = new android.content.Intent("com.luxresilient.app.REFRESH_WIDGET");
            habitIntent.setComponent(new android.content.ComponentName(this, com.luxresilient.app.widget.HabitWidgetProvider.class));
            sendBroadcast(habitIntent);

            // Refresh Score widget
            android.content.Intent scoreIntent = new android.content.Intent("com.luxresilient.app.REFRESH_SCORE_WIDGET");
            scoreIntent.setComponent(new android.content.ComponentName(this, com.luxresilient.app.widget.ScoreWidgetProvider.class));
            sendBroadcast(scoreIntent);

            // Refresh Rivals widget
            android.content.Intent rivalsIntent = new android.content.Intent("com.luxresilient.app.REFRESH_RIVALS_WIDGET");
            rivalsIntent.setComponent(new android.content.ComponentName(this, com.luxresilient.app.widget.RivalsWidgetProvider.class));
            sendBroadcast(rivalsIntent);

            // Refresh Project widget
            android.content.Intent projectIntent = new android.content.Intent("com.luxresilient.app.REFRESH_PROJECT");
            projectIntent.setComponent(new android.content.ComponentName(this, com.luxresilient.app.widget.ProjectWidgetProvider.class));
            sendBroadcast(projectIntent);

            // Refresh Routine widget
            android.content.Intent routineIntent = new android.content.Intent("com.luxresilient.app.REFRESH_ROUTINE");
            routineIntent.setComponent(new android.content.ComponentName(this, com.luxresilient.app.widget.RoutineWidgetProvider.class));
            sendBroadcast(routineIntent);

            // Refresh Calendar widget
            android.content.Intent calendarIntent = new android.content.Intent("com.luxresilient.app.REFRESH_CALENDAR");
            calendarIntent.setComponent(new android.content.ComponentName(this, com.luxresilient.app.widget.CalendarWidgetProvider.class));
            sendBroadcast(calendarIntent);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
