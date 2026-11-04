package com.luxresilient.app.widget

import android.content.Context
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * Data + rules for the social widgets. The duel rules mirror
 * web-app/src/modules/social/engine.ts (dayResult / coinFlip): keep them in sync.
 */
object SocialWidgetData {

    data class Friend(val id: String, val name: String, val rankIndex: Int, val elo: Int)
    data class DayStat(val score: Double, val focus: Int, val hud: Boolean)
    data class Duel(
        val id: String, val challenger: String, val opponent: String, val duration: String,
        val start: String, val end: String, val excluded: Set<String>, val stake: Int, val status: String, val winner: String?
    )
    data class DuelSummary(
        val friend: Friend?,
        val dayWins: Int, val dayLosses: Int, val duelWins: Int, val duelLosses: Int,
        val active: Duel?, val activeMine: Int, val activeTheirs: Int, val activeRemaining: Int,
        val todayMine: DayStat?, val todayTheirs: DayStat?
    )

    private val dayFmt get() = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    fun today(): String = dayFmt.format(Calendar.getInstance().time)

    fun addDays(key: String, n: Int): String {
        val c = Calendar.getInstance()
        c.time = dayFmt.parse(key)!!
        c.add(Calendar.DAY_OF_MONTH, n)
        return dayFmt.format(c.time)
    }

    // ── Rules (mirror of engine.ts) ────────────────────────────────────────────

    /** FNV-1a 32-bit over UTF-16 code units, as in engine.ts. */
    fun fnv1a(text: String): Long {
        var h = 0x811c9dc5L
        for (ch in text) {
            h = h xor ch.code.toLong()
            h = (h * 0x01000193L) and 0xffffffffL
        }
        return h
    }

    /** "A" = challenger, "B" = opponent. */
    fun coinFlip(duelId: String, day: String): String = if (fnv1a("$duelId:$day") and 1L == 1L) "B" else "A"

    fun dayWinner(duelId: String, day: String, a: DayStat?, b: DayStat?): String {
        val sa = Math.round((a?.score ?: 0.0) * 10)
        val sb = Math.round((b?.score ?: 0.0) * 10)
        if (sa != sb) return if (sa > sb) "A" else "B"
        val fa = a?.focus ?: 0
        val fb = b?.focus ?: 0
        if (fa != fb) return if (fa > fb) "A" else "B"
        return coinFlip(duelId, day)
    }

    fun countedDays(d: Duel): List<String> {
        val out = mutableListOf<String>()
        var k = d.start
        while (k <= d.end) {
            if (!d.excluded.contains(k)) out.add(k)
            k = addDays(k, 1)
        }
        return out
    }

    // ── Fetching ───────────────────────────────────────────────────────────────

    private fun arr(json: String?): JsonArray = try {
        if (json.isNullOrEmpty()) JsonArray() else JsonParser.parseString(json).asJsonArray
    } catch (_: Exception) { JsonArray() }

    private fun JsonObject.str(k: String): String? = if (has(k) && !get(k).isJsonNull) get(k).asString else null
    private fun JsonObject.int(k: String): Int = if (has(k) && !get(k).isJsonNull) get(k).asInt else 0

    private fun enc(s: String) = URLEncoder.encode(s, "UTF-8")

    fun friends(context: Context): List<Friend> {
        val client = SupabaseWidgetClient(context)
        val me = client.currentUserId() ?: return emptyList()
        val rows = arr(client.restGet("friendships?select=requester,addressee&status=eq.ACCEPTED"))
        val ids = rows.mapNotNull { r ->
            val o = r.asJsonObject
            if (o.str("requester") == me) o.str("addressee") else o.str("requester")
        }
        if (ids.isEmpty()) return emptyList()
        val profiles = arr(client.restGet("public_profiles?select=user_id,display_name,rank_index,elo&user_id=in.(${ids.joinToString(",")})"))
        return profiles.map {
            val o = it.asJsonObject
            Friend(o.str("user_id") ?: "", (o.str("display_name") ?: "Amigo").substringBefore("@"), o.int("rank_index"), o.int("elo"))
        }.sortedBy { it.name.lowercase() }
    }

    private fun stats(client: SupabaseWidgetClient, ids: List<String>, from: String, to: String): Map<String, Map<String, DayStat>> {
        val rows = arr(client.restGet("daily_public_stats?select=user_id,day,score,focus_minutes,hud_streak_active&user_id=in.(${ids.joinToString(",")})&day=gte.$from&day=lte.$to"))
        val out = mutableMapOf<String, MutableMap<String, DayStat>>()
        for (r in rows) {
            val o = r.asJsonObject
            val uid = o.str("user_id") ?: continue
            val day = o.str("day") ?: continue
            val score = if (o.has("score") && !o.get("score").isJsonNull) o.get("score").asDouble else 0.0
            out.getOrPut(uid) { mutableMapOf() }[day] = DayStat(score, o.int("focus_minutes"), o.has("hud_streak_active") && o.get("hud_streak_active").asBoolean)
        }
        return out
    }

    fun duelSummary(context: Context, friendId: String): DuelSummary? {
        val client = SupabaseWidgetClient(context)
        val me = client.currentUserId() ?: return null
        val friend = friends(context).firstOrNull { it.id == friendId }
        val or = enc("(and(challenger.eq.$me,opponent.eq.$friendId),and(challenger.eq.$friendId,opponent.eq.$me))")
        val duels = arr(client.restGet("duels?select=*&or=$or&status=in.(ACTIVE,FINISHED)&order=created_at.desc")).map {
            val o = it.asJsonObject
            val ex = mutableSetOf<String>()
            if (o.has("excluded_days") && o.get("excluded_days").isJsonArray) o.getAsJsonArray("excluded_days").forEach { d -> ex.add(d.asString) }
            Duel(o.str("id") ?: "", o.str("challenger") ?: "", o.str("opponent") ?: "", o.str("duration") ?: "WEEK",
                o.str("start_day") ?: today(), o.str("end_day") ?: today(), ex, o.int("stake"), o.str("status") ?: "", o.str("winner"))
        }
        val today = today()
        val from = (duels.map { it.start } + addDays(today, -1)).minOrNull() ?: today
        val st = stats(client, listOf(me, friendId), from, today)
        var dw = 0; var dl = 0; var uw = 0; var ul = 0
        var active: Duel? = null; var am = 0; var at = 0; var rem = 0
        for (d in duels) {
            val mineA = d.challenger == me
            val counted = countedDays(d)
            var m = 0; var t = 0
            for (day in counted.filter { it < today }) {
                val w = dayWinner(d.id, day, st[d.challenger]?.get(day), st[d.opponent]?.get(day))
                if ((w == "A") == mineA) m++ else t++
            }
            dw += m; dl += t
            val finished = counted.all { it < today }
            if (finished) { if (m > t) uw++ else ul++ }
            if (!finished && active == null) { active = d; am = m; at = t; rem = counted.count { it >= today } }
        }
        return DuelSummary(friend, dw, dl, uw, ul, active, am, at, rem, st[me]?.get(today), st[friendId]?.get(today))
    }

    /** Days both / only me / only friend activated their HUD streak, plus the streak start. */
    data class StreakData(val friend: Friend?, val startedOn: String?, val mine: Set<String>, val theirs: Set<String>, val current: Int)

    fun streakData(context: Context, friendId: String): StreakData? {
        val client = SupabaseWidgetClient(context)
        val me = client.currentUserId() ?: return null
        val friend = friends(context).firstOrNull { it.id == friendId }
        val or = enc("(and(user_a.eq.$me,user_b.eq.$friendId),and(user_a.eq.$friendId,user_b.eq.$me))")
        val row = arr(client.restGet("friend_streaks?select=started_on,status&or=$or&status=eq.ACTIVE")).firstOrNull()?.asJsonObject
        val started = row?.str("started_on")
        val today = today()
        val from = started ?: addDays(today, -60)
        val st = stats(client, listOf(me, friendId), from, today)
        val mine = st[me]?.filter { it.value.hud }?.keys ?: emptySet()
        val theirs = st[friendId]?.filter { it.value.hud }?.keys ?: emptySet()
        var current = 0
        if (started != null) {
            var k: String = started
            while (k < today) {
                current = if (mine.contains(k) && theirs.contains(k)) current + 1 else 0
                k = addDays(k, 1)
            }
            if (mine.contains(today) && theirs.contains(today)) current++
        }
        return StreakData(friend, started, mine, theirs, current)
    }

    // ── Unread nudges for background notifications ─────────────────────────────

    data class Message(val id: String, val from: String, val kind: String, val body: String, val createdAt: String)

    fun unreadSince(context: Context, sinceIso: String?): List<Message> {
        val client = SupabaseWidgetClient(context)
        val me = client.currentUserId() ?: return emptyList()
        val since = if (sinceIso.isNullOrEmpty()) "" else "&created_at=gt.${enc(sinceIso)}"
        return arr(client.restGet("friend_messages?select=id,from_user,kind,body,created_at&to_user=eq.$me&read_at=is.null$since&order=created_at.asc&limit=20")).map {
            val o = it.asJsonObject
            Message(o.str("id") ?: "", o.str("from_user") ?: "", o.str("kind") ?: "MESSAGE", o.str("body") ?: "", o.str("created_at") ?: "")
        }
    }

    fun names(context: Context, ids: Collection<String>): Map<String, String> {
        if (ids.isEmpty()) return emptyMap()
        val client = SupabaseWidgetClient(context)
        return arr(client.restGet("public_profiles?select=user_id,display_name&user_id=in.(${ids.joinToString(",")})")).associate {
            val o = it.asJsonObject
            (o.str("user_id") ?: "") to (o.str("display_name") ?: "Un amigo").substringBefore("@")
        }
    }

    val RANK_NAMES = listOf("Bronce", "Plata", "Oro", "Platino", "Diamante", "Campeón", "Gran Campeón", "Leyenda")
}
