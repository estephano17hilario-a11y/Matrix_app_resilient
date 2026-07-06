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
}
