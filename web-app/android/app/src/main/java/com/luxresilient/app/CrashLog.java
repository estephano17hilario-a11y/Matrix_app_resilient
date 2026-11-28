package com.luxresilient.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import java.io.PrintWriter;
import java.io.StringWriter;

/**
 * Keeps the last crash / renderer death on the phone, so the next launch can show it ("Lux se cerró…
 * toca para copiar") and it can be sent without adb. Written with commit(): the process may die right after.
 */
public final class CrashLog {
    private static final String PREFS = "lux_crash_log";
    private CrashLog() {}

    static void record(Context ctx, String where, Throwable t) {
        try {
            StringBuilder sb = new StringBuilder(where);
            if (t != null) {
                StringWriter sw = new StringWriter();
                t.printStackTrace(new PrintWriter(sw));
                sb.append('\n').append(sw);
            }
            String text = sb.length() > 4000 ? sb.substring(0, 4000) : sb.toString();
            Log.e("LuxCrash", text);
            SharedPreferences.Editor e = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
            e.putLong("ts", System.currentTimeMillis()).putString("text", text).commit();
        } catch (Throwable ignored) { /* never let the recorder itself crash */ }
    }

    static String text(Context ctx) { return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("text", null); }
    static long ts(Context ctx) { return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getLong("ts", 0L); }
    static void clear(Context ctx) { ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().commit(); }
}
