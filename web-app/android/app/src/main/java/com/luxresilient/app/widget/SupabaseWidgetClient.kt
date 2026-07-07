package com.luxresilient.app.widget

import android.content.Context
import android.util.Log
import com.google.gson.Gson
import com.google.gson.JsonParser
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
        private const val SUPABASE_URL = "https://aysntbpxjejxumpqvlbz.supabase.co"
        private const val SUPABASE_ANON_KEY = "sb_publishable_VaKr6McgkkGUFE3cPYUFpw_jt0faAw0"
        private const val REST_PATH = "/rest/v1"
    }

    private val gson = Gson()

    private fun getCredentials(): Pair<String?, String?> {
        // ALWAYS check CapacitorStorage first as it is the Single Source of Truth
        try {
            val capPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val sessionJson = capPrefs.getString("sb-aysntbpxjejxumpqvlbz-auth-token", null)
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
     * Fetch all attributes for the user (to get custom colors)
     */
    fun fetchAttributes(): Map<String, AttributeData> {
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
    fun fetchTasks(): List<TaskData> {
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
                        if (task.completed != true) {
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
    @Synchronized
    private fun refreshAccessToken(): String? {
        val prefs = context.getSharedPreferences("lux_widget_auth", Context.MODE_PRIVATE)
        val refreshToken = prefs.getString("refresh_token", null)
        if (refreshToken.isNullOrEmpty()) {
            Log.w(TAG, "No refresh token available to refresh session")
            return null
        }

        Log.d(TAG, "Refreshing access token...")
        var connection: HttpURLConnection? = null
        return try {
            val url = URL("$SUPABASE_URL/auth/v1/token?grant_type=refresh_token")
            connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("apikey", SUPABASE_ANON_KEY)
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            connection.connectTimeout = 10000
            connection.readTimeout = 10000

            val payload = mapOf("refresh_token" to refreshToken)
            val writer = OutputStreamWriter(connection.outputStream)
            writer.write(gson.toJson(payload))
            writer.flush()
            writer.close()

            val responseCode = connection.responseCode
            if (responseCode in 200..299) {
                val reader = BufferedReader(InputStreamReader(connection.inputStream))
                val response = reader.readText()
                reader.close()

                val responseObj = JsonParser.parseString(response).asJsonObject
                val newAccessToken = responseObj.get("access_token")?.asString
                val newRefreshToken = responseObj.get("refresh_token")?.asString
                val userObj = responseObj.getAsJsonObject("user")
                val userId = userObj?.get("id")?.asString

                if (!newAccessToken.isNullOrEmpty() && !userId.isNullOrEmpty()) {
                    prefs.edit()
                        .putString("user_id", userId)
                        .putString("access_token", newAccessToken)
                        .putString("refresh_token", newRefreshToken ?: refreshToken)
                        .putLong("last_sync", System.currentTimeMillis())
                        .apply()
                    Log.d(TAG, "Token refreshed successfully")
                    newAccessToken
                } else {
                    null
                }
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
}
