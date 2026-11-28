package com.luxresilient.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** JS bridge: get() returns the last recorded crash ({ ts, text } or {}), clear() forgets it. */
@CapacitorPlugin(name = "LuxCrash")
public class CrashLogPlugin extends Plugin {
    @PluginMethod
    public void get(PluginCall call) {
        JSObject ret = new JSObject();
        String text = CrashLog.text(getContext());
        if (text != null) { ret.put("ts", CrashLog.ts(getContext())); ret.put("text", text); }
        call.resolve(ret);
    }

    @PluginMethod
    public void clear(PluginCall call) {
        CrashLog.clear(getContext());
        call.resolve();
    }
}
