package com.luxresilient.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.luxresilient.app.widget.WidgetAuthBridge;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(FocusPlugin.class);
        registerPlugin(WidgetAuthBridge.class);
    }

    @Override
    public void onResume() {
        super.onResume();
        sendWidgetRefreshBroadcast();
    }

    @Override
    public void onPause() {
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
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
