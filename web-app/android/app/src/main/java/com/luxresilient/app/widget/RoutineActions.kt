package com.luxresilient.app.widget

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.Toast
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Edits made straight from the Routine widget. Every change works on the raw JSON of the record, so
 * fields this widget does not know about survive. The local cache is updated first (instant feedback);
 * if the server rejects the save, the previous value is restored.
 */
object RoutineActions {
    private const val TAG = "RoutineActions"
    private val lock = Any()

    private fun today(): String = RoutineEngine.dayKey(Calendar.getInstance())

    private fun JsonObject.getBool(k: String): Boolean = get(k)?.takeIf { it.isJsonPrimitive }?.let { runCatching { it.asBoolean }.getOrNull() } ?: false
    private fun JsonObject.getInt(k: String): Int = get(k)?.takeIf { it.isJsonPrimitive }?.let { runCatching { it.asDouble.toInt() }.getOrNull() } ?: 0
    private fun JsonObject.getStrList(k: String): MutableList<String> {
        val out = ArrayList<String>()
        get(k)?.takeIf { it.isJsonArray }?.asJsonArray?.forEach { e -> if (e.isJsonPrimitive) out.add(e.asString) }
        return out
    }

    private fun JsonObject.setStrList(k: String, list: List<String>) {
        val arr = JsonArray()
        list.forEach { arr.add(it) }
        add(k, arr)
    }

    private fun findIndex(items: JsonArray, id: String): Int {
        for (i in 0 until items.size()) {
            val e = items[i]
            if (e.isJsonObject && e.asJsonObject.get("id")?.takeIf { it.isJsonPrimitive }?.asString == id) return i
        }
        return -1
    }

    /** Runs [mutate] on a copy of the item; saves it locally, then to the server (reverting on failure). */
    private fun edit(context: Context, collection: String, itemId: String, mutate: (JsonObject) -> Boolean) {
        val app = context.applicationContext
        Thread {
            val client = SupabaseWidgetClient(app)
            var original: JsonObject? = null
            var updated: JsonObject? = null
            var items: JsonArray? = null
            var index = -1
            synchronized(lock) {
                items = client.readRawCollection(collection, allowNetwork = true)
                val list = items ?: return@synchronized
                index = findIndex(list, itemId)
                if (index < 0) return@synchronized
                original = list[index].asJsonObject
                val copy = original!!.deepCopy()
                if (!mutate(copy)) return@synchronized
                updated = copy
                list.set(index, copy)
                client.writeRawCollection(collection, list)
            }
            val newItem = updated
            if (newItem == null) {
                Log.w(TAG, "Nothing to change for $collection/$itemId")
                RoutineWidgetProvider.refreshAll(app)
                return@Thread
            }
            RoutineWidgetProvider.refreshAll(app) // instant feedback from the cache

            val before = original
            val saved = try { client.patchRawRecord(collection, itemId, newItem) } catch (e: Exception) { Log.e(TAG, "save failed: ${e.message}"); false }
            if (!saved) {
                synchronized(lock) {
                    val list = client.readRawCollection(collection, allowNetwork = false)
                    val i = if (list != null) findIndex(list, itemId) else -1
                    if (list != null && i >= 0 && before != null) {
                        list.set(i, before)
                        client.writeRawCollection(collection, list)
                    }
                }
                RoutineWidgetProvider.refreshAll(app)
                Handler(Looper.getMainLooper()).post {
                    Toast.makeText(app, "No se pudo guardar. Revisa tu conexión.", Toast.LENGTH_SHORT).show()
                }
            }
        }.start()
    }

    // ── Habits ──────────────────────────────────────────────────────────────────

    /** Simple habit: mark done / undo (same bookkeeping as the Habits widget, plus the freshness stamp). */
    fun toggleHabit(context: Context, habitId: String) = edit(context, "habits", habitId) { h ->
        val key = today()
        val history = h.getStrList("history")
        val done = RoutineEngine.isHabitDoneOn(h, key)
        if (!done) {
            if (history.none { RoutineEngine.historyKey(it) == key }) history.add(key)
            h.addProperty("completedToday", true)
            h.addProperty("streak", h.getInt("streak") + 1)
            h.addProperty("totalCompletions", h.getInt("totalCompletions") + 1)
        } else {
            history.removeAll { RoutineEngine.historyKey(it) == key }
            h.addProperty("completedToday", false)
            h.addProperty("streak", maxOf(0, h.getInt("streak") - 1))
            h.addProperty("totalCompletions", maxOf(0, h.getInt("totalCompletions") - 1))
        }
        h.setStrList("history", history)
        h.addProperty("lastUpdatedDate", key)
        true
    }

    /** Quantity habit: add [amount]; reaching the target completes it. Never goes backwards from here. */
    fun addQuantity(context: Context, habitId: String, amount: Int) = edit(context, "habits", habitId) { h ->
        val key = today()
        if (RoutineEngine.isHabitDoneOn(h, key)) return@edit false
        val target = h.getInt("targetValue")
        val fresh = h.get("lastUpdatedDate")?.takeIf { it.isJsonPrimitive }?.asString.let { it == null || RoutineEngine.historyKey(it) == key }
        val current = if (fresh) h.getInt("currentValue") else 0
        val next = current + maxOf(1, amount)
        h.addProperty("currentValue", next)
        h.addProperty("lastUpdatedDate", key)
        if (target > 0 && next >= target) {
            val history = h.getStrList("history")
            if (history.none { RoutineEngine.historyKey(it) == key }) history.add(key)
            h.setStrList("history", history)
            h.addProperty("completedToday", true)
            h.addProperty("streak", h.getInt("streak") + 1)
            h.addProperty("totalCompletions", h.getInt("totalCompletions") + 1)
        }
        true
    }

    /** Checklist habit: toggle one sub-habit; the habit counts as done when every sub-habit of today is. */
    fun toggleSubtask(context: Context, habitId: String, subtaskId: String) = edit(context, "habits", habitId) { h ->
        val key = today()
        val checklist = h.get("checklist")?.takeIf { it.isJsonArray }?.asJsonArray ?: return@edit false
        var found = false
        for (e in checklist) {
            if (!e.isJsonObject) continue
            val sub = e.asJsonObject
            if (sub.get("id")?.takeIf { it.isJsonPrimitive }?.asString != subtaskId) continue
            found = true
            val nowDone = !sub.getBool("completed")
            sub.addProperty("completed", nowDone)
            val history = sub.getStrList("history")
            if (nowDone) { if (history.none { RoutineEngine.historyKey(it) == key }) history.add(key) }
            else history.removeAll { RoutineEngine.historyKey(it) == key }
            sub.setStrList("history", history)
        }
        if (!found) return@edit false

        val dow = Calendar.getInstance().get(Calendar.DAY_OF_WEEK) - 1
        val visible = checklist.mapNotNull { it.takeIf { e -> e.isJsonObject }?.asJsonObject }.filter { sub ->
            !sub.getBool("deleted") && sub.get("days")?.takeIf { it.isJsonArray }?.asJsonArray.let { d ->
                d == null || d.size() == 0 || d.any { x -> x.isJsonPrimitive && runCatching { x.asInt }.getOrNull() == dow }
            }
        }
        val all = visible.isNotEmpty() && visible.all { it.getBool("completed") }
        h.addProperty("completedToday", all)
        h.addProperty("lastUpdatedDate", key)
        true
    }

    // ── Tasks ───────────────────────────────────────────────────────────────────

    fun completeTask(context: Context, taskId: String) = edit(context, "quests", taskId) { q ->
        if (q.getBool("completed")) return@edit false
        val iso = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }.format(Date())
        q.addProperty("completed", true)
        q.addProperty("completedAt", iso)
        true
    }
}
