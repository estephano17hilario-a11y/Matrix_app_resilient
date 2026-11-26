package com.luxresilient.app.widget

import android.content.Context
import android.util.Log
import com.google.gson.Gson
import com.google.gson.JsonArray
import com.google.gson.JsonParser
import com.google.gson.JsonObject
import com.google.gson.reflect.TypeToken
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.*

/**
 * Native HTTP client for Supabase REST API.
 * Directly queries user_collections for habits data.
 * No external HTTP library needed.
 */
class SupabaseWidgetClient(private val context: Context) {

    companion object {
        private const val TAG = "SupabaseWidgetClient"
        private const val ALLOW_WIDGET_TOKEN_REFRESH = true
        private val REFRESH_LOCK = Any()
        private const val SUPABASE_URL = "https://api.89.117.73.97.sslip.io"
        private const val SUPABASE_ANON_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4Nzg0OTc2MCwiZXhwIjo0OTQzNTIzMzYwLCJyb2xlIjoiYW5vbiJ9._DvifLx6sViDd5UePak7xswzmT6dQp9FoQZqPnyxeRU"
        private const val REST_PATH = "/rest/v1"
    }

    private val gson = Gson()

    private fun <T> readFromLocalCache(collectionName: String, typeOfT: java.lang.reflect.Type): List<T>? {
        try {
            val capPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val capKeys = capPrefs.all
            val matchingKey = capKeys.keys.find { it.startsWith("MATRIX_CACHED_COLLECTION:") && it.endsWith(":$collectionName") }
            if (matchingKey != null) {
                val cachedJson = capPrefs.getString(matchingKey, null) ?: return null
                val envelope = JsonParser.parseString(cachedJson).asJsonObject
                val dataElement = envelope.get("data") ?: return null
                if (dataElement.isJsonArray) {
                    return gson.fromJson(dataElement, typeOfT)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading local cache for $collectionName: ${e.message}")
        }
        return null
    }

    private fun <T> writeToLocalCache(collectionName: String, data: List<T>) {
        try {
            val capPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val capKeys = capPrefs.all
            val matchingKey = capKeys.keys.find { it.startsWith("MATRIX_CACHED_COLLECTION:") && it.endsWith(":$collectionName") }
            if (matchingKey != null) {
                val cachedJson = capPrefs.getString(matchingKey, null)
                val newEnvelope = if (!cachedJson.isNullOrEmpty()) {
                    val env = JsonParser.parseString(cachedJson).asJsonObject
                    env.add("data", gson.toJsonTree(data))
                    env
                } else {
                    val env = JsonObject()
                    env.addProperty("lastSynced", java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).format(java.util.Date()))
                    env.add("data", gson.toJsonTree(data))
                    env
                }
                capPrefs.edit().putString(matchingKey, gson.toJson(newEnvelope)).apply()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error writing local cache for $collectionName: ${e.message}")
        }
    }

    fun getCredentials(): Pair<String?, String?> {
        // ALWAYS check CapacitorStorage first as it is the Single Source of Truth
        try {
            val capPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val sessionJson = capPrefs.getString("sb-lux-auth-token", null)
            if (!sessionJson.isNullOrEmpty()) {
                val root = JsonParser.parseString(sessionJson).asJsonObject
                val access = root.get("access_token")?.asString
                val refresh = root.get("refresh_token")?.asString
                val userObj = root.getAsJsonObject("user")
                val uid = userObj?.get("id")?.asString

                if (!access.isNullOrEmpty() && !uid.isNullOrEmpty()) {
                    // Sync it back to lux_widget_auth for fallback
                    val prefs = context.getSharedPreferences("lux_widget_auth", Context.MODE_PRIVATE)
                    prefs.edit()
                        .putString("user_id", uid)
                        .putString("access_token", access)
                        .putString("refresh_token", refresh ?: "")
                        .putLong("last_sync", System.currentTimeMillis())
                        .apply()
                    
                    Log.d(TAG, "getCredentials: Using fresh session from CapacitorStorage for user $uid")
                    return Pair(uid, access)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "getCredentials: Error reading from CapacitorStorage: ${e.message}", e)
        }

        // Fallback to lux_widget_auth only if CapacitorStorage is empty/invalid
        val prefs = context.getSharedPreferences("lux_widget_auth", Context.MODE_PRIVATE)
        val userId = prefs.getString("user_id", null)
        val accessToken = prefs.getString("access_token", null)
        Log.d(TAG, "getCredentials: Falling back to cached lux_widget_auth. userId=$userId, hasToken=${!accessToken.isNullOrEmpty()}")
        return Pair(userId, accessToken)
    }

    /**
     * Fetch all habits for the authenticated user
     */
    fun fetchHabits(): List<HabitData> {
        val cached = readFromLocalCache<HabitData>("habits", object : TypeToken<List<HabitData>>() {}.type)
        if (cached != null && cached.isNotEmpty()) {
            Log.d(TAG, "fetchHabits: Loaded ${cached.size} habits from local CapacitorStorage cache")
            return filterTodayHabits(cached).sortedBy { it.order ?: Int.MAX_VALUE }
        }

        var (userId, accessToken) = getCredentials()
        if (userId == null || accessToken == null) {
            Log.w(TAG, "No credentials available")
            return emptyList()
        }

        return try {
            val encodedUserId = URLEncoder.encode(userId, "UTF-8")
            val url = "$SUPABASE_URL$REST_PATH/user_collections?user_id=eq.$encodedUserId&collection_name=eq.habits&deleted=eq.false&select=id,data"
            
            var response = makeGetRequest(url, accessToken)
            if (response == null) {
                Log.w(TAG, "GET habits failed. Attempting token refresh...")
                val newAccessToken = refreshAccessToken()
                if (newAccessToken != null) {
                    response = makeGetRequest(url, newAccessToken)
                }
            }

            if (response == null) {
                Log.w(TAG, "No response from Supabase after token refresh")
                return emptyList()
            }

            val jsonArray = JsonParser.parseString(response).asJsonArray
            val habits = mutableListOf<HabitData>()
            val seen = mutableSetOf<String>()

            for (element in jsonArray) {
                val obj = element.asJsonObject
                val data = obj.getAsJsonObject("data")
                if (data != null) {
                    try {
                        val habit = gson.fromJson(data, HabitData::class.java)
                        if (habit.id.isNotEmpty() && !seen.contains(habit.id) && habit.archived != true) {
                            seen.add(habit.id)
                            habits.add(habit)
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to parse habit: ${e.message}")
                    }
                }
            }

            // Filter to today's habits and sort by order
            filterTodayHabits(habits).sortedBy { it.order ?: Int.MAX_VALUE }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching habits: ${e.message}", e)
            emptyList()
        }
    }

    /**
     * Fetch all journal entries for the authenticated user
     */
    fun fetchJournal(): List<JournalEntryData> {
        val cached = readFromLocalCache<JournalEntryData>("journal", object : TypeToken<List<JournalEntryData>>() {}.type)
        if (cached != null) {
            Log.d(TAG, "fetchJournal: Loaded ${cached.size} entries from local CapacitorStorage cache")
            return cached
        }

        var (userId, accessToken) = getCredentials()
        if (userId == null || accessToken == null) {
            Log.w(TAG, "No credentials available")
            return emptyList()
        }

        return try {
            val encodedUserId = URLEncoder.encode(userId, "UTF-8")
            val url = "$SUPABASE_URL$REST_PATH/user_collections?user_id=eq.$encodedUserId&collection_name=eq.journal&deleted=eq.false&select=id,data"
            
            var response = makeGetRequest(url, accessToken)
            if (response == null) {
                Log.w(TAG, "GET journal failed. Attempting token refresh...")
                val newAccessToken = refreshAccessToken()
                if (newAccessToken != null) {
                    response = makeGetRequest(url, newAccessToken)
                }
            }

            if (response == null) {
                Log.w(TAG, "No response from Supabase after token refresh")
                return emptyList()
            }

            val jsonArray = JsonParser.parseString(response).asJsonArray
            val items = mutableListOf<JournalEntryData>()
            for (element in jsonArray) {
                val obj = element.asJsonObject
                val data = obj.getAsJsonObject("data")
                if (data != null) {
                    try {
                        val item = gson.fromJson(data, JournalEntryData::class.java)
                        items.add(item)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error parsing journal item: ${e.message}")
                    }
                }
            }
            writeToLocalCache("journal", items)
            items
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching journal: ${e.message}", e)
            emptyList()
        }
    }

    /**
     * Fetch all attributes for the user (to get custom colors)
     */
    fun fetchAttributes(): Map<String, AttributeData> {
        val cached = readFromLocalCache<AttributeData>("attributes", object : TypeToken<List<AttributeData>>() {}.type)
        if (cached != null) {
            Log.d(TAG, "fetchAttributes: Loaded ${cached.size} attributes from local CapacitorStorage cache")
            val attributesMap = mutableMapOf<String, AttributeData>()
            for (attr in cached) {
                attributesMap[attr.id] = attr
            }
            return attributesMap
        }

        var (userId, accessToken) = getCredentials()
        if (userId == null || accessToken == null) return emptyMap()

        return try {
            val encodedUserId = URLEncoder.encode(userId, "UTF-8")
            val url = "$SUPABASE_URL$REST_PATH/user_collections?user_id=eq.$encodedUserId&collection_name=eq.attributes&deleted=eq.false&select=data"
            
            var response = makeGetRequest(url, accessToken)
            if (response == null) {
                Log.w(TAG, "GET attributes failed. Attempting token refresh...")
                val newAccessToken = refreshAccessToken()
                if (newAccessToken != null) {
                    response = makeGetRequest(url, newAccessToken)
                }
            }

            if (response == null) return emptyMap()

            val jsonArray = JsonParser.parseString(response).asJsonArray
            val attrs = mutableMapOf<String, AttributeData>()

            for (element in jsonArray) {
                val obj = element.asJsonObject
                val data = obj.getAsJsonObject("data")
                if (data != null) {
                    try {
                        val attr = gson.fromJson(data, AttributeData::class.java)
                        attrs[attr.id] = attr
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to parse attribute: ${e.message}")
                    }
                }
            }
            attrs
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching attributes: ${e.message}", e)
            emptyMap()
        }
    }

    /**
     * Complete a habit (toggle completedToday)
     */
    fun completeHabit(habit: HabitData): Boolean {
        val (userId, accessToken) = getCredentials()
        if (userId == null || accessToken == null) return false

        return try {
            val today = getDateKey(Date())
            val newHistory = (habit.history ?: emptyList()).toMutableList()
            val wasCompleted = habit.completedToday
            
            if (!wasCompleted) {
                if (!newHistory.contains(today)) {
                    newHistory.add(today)
                }
            }

            val updatedHabit = habit.copy(
                completedToday = !wasCompleted,
                history = newHistory,
                streak = if (!wasCompleted) habit.streak + 1 else maxOf(0, habit.streak - 1),
                totalCompletions = if (!wasCompleted) habit.totalCompletions + 1 else maxOf(0, habit.totalCompletions - 1)
            )

            updateHabitInSupabase(userId, updatedHabit, accessToken)
        } catch (e: Exception) {
            Log.e(TAG, "Error completing habit: ${e.message}", e)
            false
        }
    }

    /**
     * Toggle a subtask's completed state
     */
    fun toggleSubtask(habit: HabitData, subtaskId: String): Boolean {
        val (userId, accessToken) = getCredentials()
        if (userId == null || accessToken == null) return false

        return try {
            val newChecklist = habit.checklist?.map { item ->
                if (item.id == subtaskId) item.copy(completed = !item.completed) else item
            } ?: return false

            // Check if all visible subtasks are now completed
            val todayDay = Calendar.getInstance().get(Calendar.DAY_OF_WEEK) - 1 // 0=Sun
            val visibleItems = newChecklist.filter { item ->
                item.days == null || item.days.isEmpty() || item.days.contains(todayDay)
            }
            val allCompleted = visibleItems.isNotEmpty() && visibleItems.all { it.completed }

            val updatedHabit = habit.copy(
                checklist = newChecklist,
                completedToday = allCompleted
            )

            updateHabitInSupabase(userId, updatedHabit, accessToken)
        } catch (e: Exception) {
            Log.e(TAG, "Error toggling subtask: ${e.message}", e)
            false
        }
    }

    /**
     * Increment a quantity habit's value
     */
    fun incrementQuantity(habit: HabitData, amount: Int = 1): Boolean {
        val (userId, accessToken) = getCredentials()
        if (userId == null || accessToken == null) return false

        return try {
            val currentVal = habit.currentValue ?: 0
            val targetVal = habit.targetValue ?: 1
            val newVal = currentVal + amount
            val isNowComplete = newVal >= targetVal

            val today = getDateKey(Date())
            val newHistory = (habit.history ?: emptyList()).toMutableList()
            if (isNowComplete && !habit.completedToday && !newHistory.contains(today)) {
                newHistory.add(today)
            }

            val updatedHabit = habit.copy(
                currentValue = newVal,
                completedToday = isNowComplete,
                history = if (isNowComplete) newHistory else habit.history,
                streak = if (isNowComplete && !habit.completedToday) habit.streak + 1 else habit.streak
            )

            updateHabitInSupabase(userId, updatedHabit, accessToken)
        } catch (e: Exception) {
            Log.e(TAG, "Error incrementing quantity: ${e.message}", e)
            false
        }
    }

    /**
     * Update a habit record in Supabase
     */
    private fun updateHabitInSupabase(userId: String, habit: HabitData, accessToken: String): Boolean {
        val recordId = "${userId}_habits_${habit.id}"
        val encodedId = URLEncoder.encode(recordId, "UTF-8")
        val url = "$SUPABASE_URL$REST_PATH/user_collections?id=eq.$encodedId"
        
        val payload = mapOf(
            "data" to habit,
            "deleted" to false
        )
        val jsonBody = gson.toJson(payload)

        var success = makePatchRequest(url, jsonBody, accessToken)
        if (!success) {
            Log.w(TAG, "PATCH habit failed. Attempting token refresh...")
            val newAccessToken = refreshAccessToken()
            if (newAccessToken != null) {
                success = makePatchRequest(url, jsonBody, newAccessToken)
            }
        }
        return success
    }

    /**
     * Fetch tasks (quests)
     */
    fun fetchTasks(includeCompleted: Boolean = false): List<TaskData> {
        val cached = readFromLocalCache<TaskData>("quests", object : TypeToken<List<TaskData>>() {}.type)
        if (cached != null) {
            Log.d(TAG, "fetchTasks: Loaded ${cached.size} tasks from local CapacitorStorage cache (includeCompleted=$includeCompleted)")
            return if (includeCompleted) cached else cached.filter { it.completed != true }
        }

        var (userId, accessToken) = getCredentials()
        if (userId == null || accessToken == null) return emptyList()

        return try {
            val encodedUserId = URLEncoder.encode(userId, "UTF-8")
            val url = "$SUPABASE_URL$REST_PATH/user_collections?user_id=eq.$encodedUserId&collection_name=eq.quests&deleted=eq.false&select=data"
            
            var response = makeGetRequest(url, accessToken)
            if (response == null) {
                val newAccessToken = refreshAccessToken()
                if (newAccessToken != null) {
                    response = makeGetRequest(url, newAccessToken)
                }
            }

            if (response == null) return emptyList()

            val jsonArray = JsonParser.parseString(response).asJsonArray
            val tasks = mutableListOf<TaskData>()

            for (element in jsonArray) {
                val obj = element.asJsonObject
                val data = obj.getAsJsonObject("data")
                if (data != null) {
                    try {
                        val task = gson.fromJson(data, TaskData::class.java)
                        if (includeCompleted || task.completed != true) {
                            tasks.add(task)
                        }
                    } catch (e: Exception) {}
                }
            }
            tasks
        } catch (e: Exception) {
            emptyList()
        }
    }


    fun completeTask(taskId: String): Boolean {
        val (userId, accessToken) = getCredentials()
        if (userId == null || accessToken == null) return false

        return try {
            val tasks = fetchTasks()
            val task = tasks.find { it.id == taskId } ?: return false

            val updatedTask = task.copy(completed = true)
            val recordId = "${userId}_quests_${taskId}"
            val encodedId = URLEncoder.encode(recordId, "UTF-8")
            val url = "$SUPABASE_URL$REST_PATH/user_collections?id=eq.$encodedId"
            
            val payload = mapOf(
                "data" to updatedTask,
                "deleted" to false
            )
            val jsonBody = gson.toJson(payload)

            var success = makePatchRequest(url, jsonBody, accessToken)
            if (!success) {
                val newAccessToken = refreshAccessToken()
                if (newAccessToken != null) {
                    success = makePatchRequest(url, jsonBody, newAccessToken)
                }
            }
            success
        } catch (e: Exception) {
            false
        }
    }

    fun fetchBadHabits(): List<BadHabitData> {
        val cached = readFromLocalCache<BadHabitData>("badHabits", object : TypeToken<List<BadHabitData>>() {}.type)
        if (cached != null) {
            Log.d(TAG, "fetchBadHabits: Loaded ${cached.size} badHabits from local CapacitorStorage cache")
            return cached
        }

        var (userId, accessToken) = getCredentials()
        if (userId == null || accessToken == null) return emptyList()

        return try {
            val encodedUserId = URLEncoder.encode(userId, "UTF-8")
            val url = "$SUPABASE_URL$REST_PATH/user_collections?user_id=eq.$encodedUserId&collection_name=eq.badHabits&deleted=eq.false&select=data"

            var response = makeGetRequest(url, accessToken)
            
            if (response == null) {
                val newAccessToken = refreshAccessToken()
                if (newAccessToken != null) {
                    response = makeGetRequest(url, newAccessToken)
                }
            }

            if (response == null) return emptyList()

            val jsonArray = JsonParser.parseString(response).asJsonArray
            val habits = mutableListOf<BadHabitData>()

            for (element in jsonArray) {
                val obj = element.asJsonObject
                val data = obj.getAsJsonObject("data")
                if (data != null) {
                    try {
                        val habit = gson.fromJson(data, BadHabitData::class.java)
                        habits.add(habit)
                    } catch (e: Exception) {}
                }
            }
            habits
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun incrementBadHabitQuantity(habit: BadHabitData, amount: Int): Boolean {
        val (userId, accessToken) = getCredentials()
        if (userId == null || accessToken == null) return false

        return try {
            val currentVal = habit.dynamicBalance ?: 0
            val newVal = currentVal + amount
            val updatedHabit = habit.copy(
                dynamicBalance = newVal
            )
            
            val recordId = "${userId}_badHabits_${habit.id}"
            val encodedId = URLEncoder.encode(recordId, "UTF-8")
            val url = "$SUPABASE_URL$REST_PATH/user_collections?id=eq.$encodedId"
            
            val payload = mapOf("data" to updatedHabit, "deleted" to false)
            val jsonBody = gson.toJson(payload)

            var success = makePatchRequest(url, jsonBody, accessToken)
            if (!success) {
                val newAccessToken = refreshAccessToken()
                if (newAccessToken != null) {
                    success = makePatchRequest(url, jsonBody, newAccessToken)
                }
            }
            success
        } catch (e: Exception) {
            false
        }
    }

    fun toggleBadHabitRelapse(habit: BadHabitData): Boolean {
        val (userId, accessToken) = getCredentials()
        if (userId == null || accessToken == null) return false

        return try {
            val today = getDateKey(Date())
            val newHistory = (habit.history ?: emptyList()).toMutableList()
            val isRelapsed = habit.relapsedToday == true || newHistory.contains(today)
            
            if (isRelapsed) {
                // Un-relapse
                newHistory.remove(today)
            } else {
                // Relapse
                if (!newHistory.contains(today)) {
                    newHistory.add(today)
                }
            }

            val updatedHabit = habit.copy(
                relapsedToday = !isRelapsed,
                history = newHistory,
                streak = if (isRelapsed) 1 else 0
            )

            // Update local cache first
            val cached = fetchBadHabits().toMutableList()
            val idx = cached.indexOfFirst { it.id == habit.id }
            if (idx != -1) {
                cached[idx] = updatedHabit
                writeToLocalCache("badHabits", cached)
            }

            val recordId = "${userId}_badHabits_${habit.id}"
            val encodedId = URLEncoder.encode(recordId, "UTF-8")
            val url = "$SUPABASE_URL$REST_PATH/user_collections?id=eq.$encodedId"
            
            val payload = mapOf(
                "data" to updatedHabit,
                "deleted" to false
            )
            val jsonBody = gson.toJson(payload)

            var success = makePatchRequest(url, jsonBody, accessToken)
            if (!success) {
                val newAccessToken = refreshAccessToken()
                if (newAccessToken != null) {
                    success = makePatchRequest(url, jsonBody, newAccessToken)
                }
            }
            success
        } catch (e: Exception) {
            Log.e(TAG, "Error toggling bad habit relapse: ${e.message}", e)
            false
        }
    }

    /**
     * Filter habits to only show those due today
     */
    private fun filterTodayHabits(habits: List<HabitData>): List<HabitData> {
        val cal = Calendar.getInstance()
        val todayDow = cal.get(Calendar.DAY_OF_WEEK) // 1=Sun, 2=Mon, etc
        // Convert to JS convention: 0=Sun, 1=Mon, etc
        val jsDow = todayDow - 1

        return habits.filter { habit ->
            when (habit.frequency) {
                "DAILY" -> true
                "WEEKLY" -> {
                    when (habit.weeklyType) {
                        "FLEXIBLE_COUNT" -> true // Always show, user decides when
                        else -> {
                            // SPECIFIC_DAYS
                            habit.frequencyDays?.contains(jsDow) ?: true
                        }
                    }
                }
                "MONTHLY" -> {
                    when (habit.monthlyType) {
                        "FLEXIBLE_COUNT" -> true
                        else -> true // Show monthly habits
                    }
                }
                else -> true
            }
        }
    }

    /**
     * HTTP GET request
     */
    private fun makeGetRequest(urlStr: String, accessToken: String): String? {
        var connection: HttpURLConnection? = null
        return try {
            val url = URL(urlStr)
            connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.setRequestProperty("Authorization", "Bearer $accessToken")
            connection.setRequestProperty("apikey", SUPABASE_ANON_KEY)
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Accept", "application/json")
            connection.connectTimeout = 10000
            connection.readTimeout = 10000

            if (connection.responseCode == 200) {
                val reader = BufferedReader(InputStreamReader(connection.inputStream))
                val response = reader.readText()
                reader.close()
                response
            } else {
                Log.e(TAG, "GET failed with code ${connection.responseCode}")
                // Try to read error
                try {
                    val errReader = BufferedReader(InputStreamReader(connection.errorStream))
                    Log.e(TAG, "Error body: ${errReader.readText()}")
                    errReader.close()
                } catch (_: Exception) {}
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "GET request failed: ${e.message}", e)
            null
        } finally {
            connection?.disconnect()
        }
    }

    /**
     * HTTP PATCH request
     */
    private fun makePatchRequest(urlStr: String, jsonBody: String, accessToken: String): Boolean {
        var connection: HttpURLConnection? = null
        return try {
            val url = URL(urlStr)
            connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "PATCH"
            connection.setRequestProperty("Authorization", "Bearer $accessToken")
            connection.setRequestProperty("apikey", SUPABASE_ANON_KEY)
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Prefer", "return=minimal")
            connection.doOutput = true
            connection.connectTimeout = 10000
            connection.readTimeout = 10000

            val writer = OutputStreamWriter(connection.outputStream)
            writer.write(jsonBody)
            writer.flush()
            writer.close()

            val responseCode = connection.responseCode
            if (responseCode in 200..299) {
                Log.d(TAG, "PATCH successful")
                true
            } else {
                Log.e(TAG, "PATCH failed with code $responseCode")
                try {
                    val errReader = BufferedReader(InputStreamReader(connection.errorStream))
                    Log.e(TAG, "Error body: ${errReader.readText()}")
                    errReader.close()
                } catch (_: Exception) {}
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "PATCH request failed: ${e.message}", e)
            false
        } finally {
            connection?.disconnect()
        }
    }

    /**
     * Get date key in the format used by the app (YYYY-MM-DD)
     */
    private fun getDateKey(date: Date): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        return sdf.format(date)
    }

    /**
     * Attempts to refresh the access token using the stored refresh token.
     * Returns the new access token if successful, or null otherwise.
     */
    /** Expiry of a JWT access token in epoch millis, or null if it cannot be read. */
    private fun jwtExpiresAtMs(token: String): Long? = try {
        val part = token.split(".")[1]
        val json = String(android.util.Base64.decode(part, android.util.Base64.URL_SAFE or android.util.Base64.NO_PADDING or android.util.Base64.NO_WRAP))
        JsonParser.parseString(json).asJsonObject.get("exp")?.asLong?.times(1000)
    } catch (_: Exception) { null }

    /** The access token to use: renewed first when it has expired or is about to (the app is often closed for hours). */
    private fun validAccessToken(): String? {
        val (_, token) = getCredentials()
        if (token.isNullOrEmpty()) return null
        val exp = jwtExpiresAtMs(token)
        if (exp != null && exp - System.currentTimeMillis() < 60_000) return refreshAccessToken() ?: token
        return token
    }

    /** Writes a renewed session into the store the app reads, so both always hold the same (rotated) refresh token. */
    private fun shareSessionWithApp(access: String, refresh: String, expiresIn: Long?) {
        try {
            val cap = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val json = cap.getString("sb-lux-auth-token", null) ?: return
            val root = JsonParser.parseString(json).asJsonObject
            root.addProperty("access_token", access)
            root.addProperty("refresh_token", refresh)
            if (expiresIn != null) {
                root.addProperty("expires_in", expiresIn)
                root.addProperty("expires_at", System.currentTimeMillis() / 1000 + expiresIn)
            }
            cap.edit().putString("sb-lux-auth-token", gson.toJson(root)).commit()
        } catch (e: Exception) {
            Log.e(TAG, "shareSessionWithApp: ${e.message}")
        }
    }

    /**
     * Renews the access token with the refresh token. Supabase rotates refresh tokens, so the new pair
     * is written back into the app's own session store: the app and every widget keep using one chain.
     * Returns the new access token, or null if it could not be renewed.
     */
    private fun refreshAccessToken(): String? = synchronized(REFRESH_LOCK) {
        if (!ALLOW_WIDGET_TOKEN_REFRESH) return@synchronized null
        // Another widget (or the app) may have renewed it while we waited for the lock.
        val (_, current) = getCredentials()
        val currentExp = current?.let { jwtExpiresAtMs(it) }
        if (current != null && currentExp != null && currentExp - System.currentTimeMillis() > 60_000) return@synchronized current

        val prefs = context.getSharedPreferences("lux_widget_auth", Context.MODE_PRIVATE)
        var refreshToken: String? = null
        try {
            val sessionJson = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE).getString("sb-lux-auth-token", null)
            if (!sessionJson.isNullOrEmpty()) refreshToken = JsonParser.parseString(sessionJson).asJsonObject.get("refresh_token")?.asString
        } catch (_: Exception) {}
        if (refreshToken.isNullOrEmpty()) refreshToken = prefs.getString("refresh_token", null)
        if (refreshToken.isNullOrEmpty()) {
            Log.w(TAG, "No refresh token available to refresh session")
            return@synchronized null
        }

        Log.d(TAG, "Refreshing access token...")
        var connection: HttpURLConnection? = null
        try {
            val url = URL("$SUPABASE_URL/auth/v1/token?grant_type=refresh_token")
            connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("apikey", SUPABASE_ANON_KEY)
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            connection.connectTimeout = 10000
            connection.readTimeout = 10000

            val writer = OutputStreamWriter(connection.outputStream)
            writer.write(gson.toJson(mapOf("refresh_token" to refreshToken)))
            writer.flush()
            writer.close()

            val responseCode = connection.responseCode
            if (responseCode in 200..299) {
                val reader = BufferedReader(InputStreamReader(connection.inputStream))
                val response = reader.readText()
                reader.close()

                val responseObj = JsonParser.parseString(response).asJsonObject
                val newAccessToken = responseObj.get("access_token")?.asString
                val newRefreshToken = responseObj.get("refresh_token")?.asString ?: refreshToken
                val expiresIn = responseObj.get("expires_in")?.takeIf { it.isJsonPrimitive }?.asLong
                val userId = responseObj.getAsJsonObject("user")?.get("id")?.asString

                if (!newAccessToken.isNullOrEmpty() && !userId.isNullOrEmpty()) {
                    shareSessionWithApp(newAccessToken, newRefreshToken, expiresIn)
                    prefs.edit()
                        .putString("user_id", userId)
                        .putString("access_token", newAccessToken)
                        .putString("refresh_token", newRefreshToken)
                        .putLong("last_sync", System.currentTimeMillis())
                        .apply()
                    Log.d(TAG, "Token refreshed successfully")
                    newAccessToken
                } else null
            } else {
                Log.e(TAG, "Token refresh failed with code $responseCode")
                try {
                    val errReader = BufferedReader(InputStreamReader(connection.errorStream))
                    Log.e(TAG, "Token refresh error body: ${errReader.readText()}")
                    errReader.close()
                } catch (_: Exception) {}
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error refreshing token: ${e.message}", e)
            null
        } finally {
            connection?.disconnect()
        }
    }

    /**
     * Check if user is authenticated
     */
    fun isAuthenticated(): Boolean {
        val (userId, accessToken) = getCredentials()
        return userId != null && accessToken != null
    }

    /** Authenticated GET on the REST API (e.g. "duels?select=*"). Null on failure. */
    fun restGet(pathAndQuery: String): String? {
        val token = validAccessToken()
        if (token.isNullOrEmpty()) return null
        return makeGetRequest("$SUPABASE_URL$REST_PATH/$pathAndQuery", token)
    }

    /** Authenticated PATCH on the REST API. */
    fun restPatch(pathAndQuery: String, jsonBody: String): Boolean {
        val token = validAccessToken()
        if (token.isNullOrEmpty()) return false
        val url = "$SUPABASE_URL$REST_PATH/$pathAndQuery"
        if (makePatchRequest(url, jsonBody, token)) return true
        // A rejected token (clock skew, revoked early): renew once and try again.
        val fresh = refreshAccessToken()
        return fresh != null && fresh != token && makePatchRequest(url, jsonBody, fresh)
    }

    fun currentUserId(): String? = getCredentials().first

    // ── Raw (lossless) collection access ────────────────────────────────────────
    // The typed models above only keep the fields the older widgets know about, so writing them
    // back would drop everything else on the record. The Routine widget edits the raw JSON instead.

    /** Items of a collection as raw JSON: local cache first, then (only if allowed) the server. */
    fun readRawCollection(collectionName: String, allowNetwork: Boolean): JsonArray? {
        try {
            val capPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val key = capPrefs.all.keys.find { it.startsWith("MATRIX_CACHED_COLLECTION:") && it.endsWith(":$collectionName") }
            if (key != null) {
                val json = capPrefs.getString(key, null)
                if (!json.isNullOrEmpty()) {
                    val data = JsonParser.parseString(json).asJsonObject.get("data")
                    if (data != null && data.isJsonArray) return data.asJsonArray
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "readRawCollection($collectionName) cache: ${e.message}")
        }
        if (!allowNetwork) return null

        val (userId, _) = getCredentials()
        if (userId.isNullOrEmpty()) return null
        return try {
            val response = restGet("user_collections?user_id=eq.${URLEncoder.encode(userId, "UTF-8")}&collection_name=eq.$collectionName&deleted=eq.false&select=data") ?: return null
            val out = JsonArray()
            for (element in JsonParser.parseString(response).asJsonArray) {
                val data = element.asJsonObject.get("data")
                if (data != null && data.isJsonObject) out.add(data)
            }
            out
        } catch (e: Exception) {
            Log.e(TAG, "readRawCollection($collectionName) network: ${e.message}")
            null
        }
    }

    /** Replaces the cached items of a collection (no-op when the app has not cached it yet). */
    fun writeRawCollection(collectionName: String, items: JsonArray) {
        try {
            val capPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val key = capPrefs.all.keys.find { it.startsWith("MATRIX_CACHED_COLLECTION:") && it.endsWith(":$collectionName") } ?: return
            val cachedJson = capPrefs.getString(key, null)
            val envelope = if (!cachedJson.isNullOrEmpty()) JsonParser.parseString(cachedJson).asJsonObject else JsonObject()
            envelope.add("data", items)
            capPrefs.edit().putString(key, gson.toJson(envelope)).apply()
        } catch (e: Exception) {
            Log.e(TAG, "writeRawCollection($collectionName): ${e.message}")
        }
    }

    /** Saves one full item (all of its fields) to the server. Blocking: call off the main thread. */
    fun patchRawRecord(collectionName: String, itemId: String, data: JsonObject): Boolean {
        val (userId, _) = getCredentials()
        if (userId.isNullOrEmpty()) return false
        // Same filter the app uses: rows saved by older versions live under the bare item id.
        val either = URLEncoder.encode("(id.eq.${userId}_${collectionName}_$itemId,id.eq.$itemId)", "UTF-8")
        val payload = JsonObject().apply {
            add("data", data)
            addProperty("deleted", false)
        }
        return restPatch("user_collections?user_id=eq.${URLEncoder.encode(userId, "UTF-8")}&collection_name=eq.$collectionName&or=$either", gson.toJson(payload))
    }

    /**
     * Fetch projects for the user
     */
    fun fetchProjects(): List<ProjectData> {
        val cached = readFromLocalCache<ProjectData>("projects", object : TypeToken<List<ProjectData>>() {}.type)
        if (cached != null) {
            Log.d(TAG, "fetchProjects: Loaded ${cached.size} projects from local CapacitorStorage cache")
            return cached
        }

        var (userId, accessToken) = getCredentials()
        if (userId == null || accessToken == null) return emptyList()

        return try {
            val encodedUserId = URLEncoder.encode(userId, "UTF-8")
            val url = "$SUPABASE_URL$REST_PATH/user_collections?user_id=eq.$encodedUserId&collection_name=eq.projects&deleted=eq.false&select=data"
            
            var response = makeGetRequest(url, accessToken)
            if (response == null) {
                val newAccessToken = refreshAccessToken()
                if (newAccessToken != null) {
                    response = makeGetRequest(url, newAccessToken)
                }
            }

            if (response == null) return emptyList()

            val jsonArray = JsonParser.parseString(response).asJsonArray
            val projects = mutableListOf<ProjectData>()

            for (element in jsonArray) {
                val obj = element.asJsonObject
                val data = obj.getAsJsonObject("data")
                if (data != null) {
                    try {
                        val project = gson.fromJson(data, ProjectData::class.java)
                        projects.add(project)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error parsing project: ${e.message}")
                    }
                }
            }
            projects
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching projects: ${e.message}", e)
            emptyList()
        }
    }

    /**
     * Fetch daily feed entries for the user
     */
    fun fetchDailyFeed(): List<DailyFeedEntryData> {
        val cached = readFromLocalCache<DailyFeedEntryData>("dailyFeed", object : TypeToken<List<DailyFeedEntryData>>() {}.type)
        if (cached != null) {
            Log.d(TAG, "fetchDailyFeed: Loaded ${cached.size} dailyFeed entries from local CapacitorStorage cache")
            return cached
        }

        var (userId, accessToken) = getCredentials()
        if (userId == null || accessToken == null) return emptyList()

        return try {
            val encodedUserId = URLEncoder.encode(userId, "UTF-8")
            val url = "$SUPABASE_URL$REST_PATH/user_collections?user_id=eq.$encodedUserId&collection_name=eq.dailyFeed&deleted=eq.false&select=data"
            
            var response = makeGetRequest(url, accessToken)
            if (response == null) {
                val newAccessToken = refreshAccessToken()
                if (newAccessToken != null) {
                    response = makeGetRequest(url, newAccessToken)
                }
            }

            if (response == null) return emptyList()

            val jsonArray = JsonParser.parseString(response).asJsonArray
            val feeds = mutableListOf<DailyFeedEntryData>()

            for (element in jsonArray) {
                val obj = element.asJsonObject
                val data = obj.getAsJsonObject("data")
                if (data != null) {
                    try {
                        val feed = gson.fromJson(data, DailyFeedEntryData::class.java)
                        feeds.add(feed)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error parsing dailyFeed: ${e.message}")
                    }
                }
            }
            feeds
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching dailyFeed: ${e.message}", e)
            emptyList()
        }
    }
}

