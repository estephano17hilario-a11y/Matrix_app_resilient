package com.luxresilient.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.Person;
import androidx.core.graphics.drawable.IconCompat;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Messages from the user's coach (the assistant they named during onboarding), shown like a chat
 * app: MessagingStyle with the sender's name and a default "no photo" profile picture.
 * Alarms are kept in SharedPreferences so they survive a reboot (re-armed by CoachNotifyReceiver).
 */
public final class CoachNotifier {
    static final String CHANNEL_ID = "lux_coach";
    static final String ACTION_FIRE = "com.luxresilient.app.COACH_MESSAGE";
    static final String EXTRA_ID = "id";
    static final String EXTRA_NAME = "name";
    static final String EXTRA_BODY = "body";
    private static final String PREFS = "lux_coach_messages";
    private static final String KEY_QUEUE = "queue";

    private CoachNotifier() {}

    static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || nm.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "Mensajes de tu coach", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Motivación y tareas urgentes de tu asistente");
        ch.enableVibration(true);
        nm.createNotificationChannel(ch);
    }

    /** Default chat-app profile picture: grey circle with a white silhouette. */
    static Bitmap avatar(int size) {
        Bitmap bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        Path clip = new Path();
        clip.addCircle(size / 2f, size / 2f, size / 2f, Path.Direction.CW);
        c.clipPath(clip);
        p.setColor(0xFFCFD8DC);
        c.drawRect(0, 0, size, size, p);
        p.setColor(0xFFFFFFFF);
        float s = size / 100f;
        c.drawCircle(50 * s, 39 * s, 18 * s, p);
        c.drawOval(new RectF(16 * s, 62 * s, 84 * s, 128 * s), p);
        return bmp;
    }

    static void post(Context ctx, int id, String name, String body) {
        ensureChannel(ctx);
        String sender = (name == null || name.trim().isEmpty()) ? "Lux" : name.trim();
        Bitmap pic = avatar(160);
        Person coach = new Person.Builder().setName(sender).setIcon(IconCompat.createWithBitmap(pic)).setKey("coach").build();
        Person me = new Person.Builder().setName("Tú").setKey("me").build();
        NotificationCompat.MessagingStyle style = new NotificationCompat.MessagingStyle(me)
                .addMessage(body, System.currentTimeMillis(), coach);

        Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        PendingIntent content = open == null ? null : PendingIntent.getActivity(ctx, id, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_lux)
                .setColor(0xFF25D366)
                .setLargeIcon(pic)
                .setContentTitle(sender)
                .setContentText(body)
                .setStyle(style)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true);
        if (content != null) b.setContentIntent(content);
        try {
            NotificationManagerCompat.from(ctx).notify(id, b.build());
        } catch (SecurityException ignored) {
            // POST_NOTIFICATIONS not granted.
        }
    }

    private static PendingIntent alarmIntent(Context ctx, int id, String name, String body) {
        Intent i = new Intent(ctx, CoachNotifyReceiver.class).setAction(ACTION_FIRE)
                .putExtra(EXTRA_ID, id).putExtra(EXTRA_NAME, name).putExtra(EXTRA_BODY, body);
        return PendingIntent.getBroadcast(ctx, id, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void arm(Context ctx, int id, long at, String name, String body) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = alarmIntent(ctx, id, name, body);
        boolean exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms();
        if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
    }

    static void disarm(Context ctx, int id) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(alarmIntent(ctx, id, "", ""));
        NotificationManagerCompat.from(ctx).cancel(id);
    }

    // ── Persistence (for re-arming after reboot) ──

    static synchronized JSONArray queue(Context ctx) {
        try {
            return new JSONArray(ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_QUEUE, "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    static synchronized void saveQueue(Context ctx, JSONArray q) {
        SharedPreferences.Editor e = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
        e.putString(KEY_QUEUE, q.toString()).apply();
    }

    static synchronized void upsert(Context ctx, int id, long at, String name, String body) {
        JSONArray q = queue(ctx);
        JSONArray out = new JSONArray();
        long now = System.currentTimeMillis();
        for (int i = 0; i < q.length(); i++) {
            JSONObject o = q.optJSONObject(i);
            if (o == null || o.optInt("id") == id || o.optLong("at") < now) continue;
            out.put(o);
        }
        try {
            out.put(new JSONObject().put("id", id).put("at", at).put("name", name).put("body", body));
        } catch (Exception ignored) {}
        saveQueue(ctx, out);
        arm(ctx, id, at, name, body);
    }

    static synchronized void remove(Context ctx, int id) {
        JSONArray q = queue(ctx);
        JSONArray out = new JSONArray();
        for (int i = 0; i < q.length(); i++) {
            JSONObject o = q.optJSONObject(i);
            if (o != null && o.optInt("id") != id) out.put(o);
        }
        saveQueue(ctx, out);
        disarm(ctx, id);
    }

    static synchronized void rearmAll(Context ctx) {
        JSONArray q = queue(ctx);
        JSONArray out = new JSONArray();
        long now = System.currentTimeMillis();
        for (int i = 0; i < q.length(); i++) {
            JSONObject o = q.optJSONObject(i);
            if (o == null || o.optLong("at") < now) continue;
            out.put(o);
            arm(ctx, o.optInt("id"), o.optLong("at"), o.optString("name"), o.optString("body"));
        }
        saveQueue(ctx, out);
    }
}
