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
            android.content.Intent intent = new android.content.Intent("com.luxresilient.app.widget.ACTION_REFRESH");
            intent.setPackage(getPackageName());
            sendBroadcast(intent);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
