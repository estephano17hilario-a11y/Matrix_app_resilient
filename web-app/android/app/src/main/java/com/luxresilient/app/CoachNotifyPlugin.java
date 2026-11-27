package com.luxresilient.app;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

/**
 * JS bridge for chat-style coach notifications.
 *   schedule({ messages: [{ id, at, name, body }] })  — `at` in epoch ms
 *   cancel({ ids: [..] })
 *   show({ id, name, body })                          — post right now
 */
@CapacitorPlugin(name = "CoachNotify")
public class CoachNotifyPlugin extends Plugin {

    @PluginMethod
    public void schedule(PluginCall call) {
        JSArray list = call.getArray("messages");
        int count = 0;
        try {
            if (list != null) {
                long now = System.currentTimeMillis();
                for (int i = 0; i < list.length(); i++) {
                    JSONObject m = list.getJSONObject(i);
                    long at = m.optLong("at");
                    if (at <= now) continue;
                    CoachNotifier.upsert(getContext(), m.optInt("id"), at, m.optString("name", "Lux"), m.optString("body", ""));
                    count++;
                }
            }
        } catch (Exception e) {
            call.reject("schedule failed: " + e.getMessage());
            return;
        }
        JSObject ret = new JSObject();
        ret.put("scheduled", count);
        call.resolve(ret);
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        JSArray ids = call.getArray("ids");
        try {
            if (ids != null) for (int i = 0; i < ids.length(); i++) CoachNotifier.remove(getContext(), ids.getInt(i));
        } catch (Exception e) {
            call.reject("cancel failed: " + e.getMessage());
            return;
        }
        call.resolve();
    }

    @PluginMethod
    public void show(PluginCall call) {
        CoachNotifier.post(getContext(), call.getInt("id", (int) (System.currentTimeMillis() % 100000)),
                call.getString("name", "Lux"), call.getString("body", ""));
        call.resolve();
    }
}
