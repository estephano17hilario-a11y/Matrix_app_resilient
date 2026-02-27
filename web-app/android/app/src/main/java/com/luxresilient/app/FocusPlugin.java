package com.luxresilient.app;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "FocusSession")
public class FocusPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        long duration = call.getInt("duration", 25 * 60); // seconds
        String mode = call.getString("mode", "POMO");

        Intent intent = new Intent(getContext(), FocusService.class);
        intent.setAction(FocusService.ACTION_START);
        intent.putExtra(FocusService.EXTRA_DURATION, duration);
        intent.putExtra(FocusService.EXTRA_MODE, mode);

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
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
}
